import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  SnapshotConfig, 
  SnapshotManager, 
  getSnapshotManager, 
  resetSnapshotManager,
  matchSnapshot,
  snapshotUtils
} from '../../src/snapshot.js'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

describe('Snapshot Testing Core', () => {
  let tempDir
  let snapshotManager

  beforeEach(() => {
    // Create temporary directory for testing
    const { mkdtempSync } = require('node:fs')
    const { tmpdir } = require('node:os')
    tempDir = mkdtempSync(join(tmpdir(), 'citty-snapshot-test-'))
    
    // Create test file for snapshot testing
    const testFile = join(tempDir, 'test-file.test.mjs')
    writeFileSync(testFile, '// Test file for snapshots', 'utf8')
    
    // Create snapshot manager with temp directory
    const config = new SnapshotConfig({
      snapshotDir: '__snapshots__',
      updateSnapshots: false,
      ciMode: false,
      ignoreWhitespace: true,
      ignoreTimestamps: true
    })
    
    snapshotManager = new SnapshotManager(config)
  })

  afterEach(() => {
    // Clean up temporary directory
    const { rmSync } = require('node:fs')
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Reset global snapshot manager
    resetSnapshotManager()
  })

  describe('SnapshotConfig', () => {
    it('should create config with default values', () => {
      const config = new SnapshotConfig()
      expect(config.snapshotDir).toBe('__snapshots__')
      expect(config.updateSnapshots).toBe(false)
      expect(config.ciMode).toBe(false)
      expect(config.ignoreWhitespace).toBe(true)
      expect(config.ignoreTimestamps).toBe(true)
    })

    it('should create config with custom values', () => {
      const config = new SnapshotConfig({
        snapshotDir: 'custom-snapshots',
        updateSnapshots: true,
        ciMode: true,
        ignoreWhitespace: false,
        ignoreTimestamps: false
      })
      expect(config.snapshotDir).toBe('custom-snapshots')
      expect(config.updateSnapshots).toBe(true)
      expect(config.ciMode).toBe(true)
      expect(config.ignoreWhitespace).toBe(false)
      expect(config.ignoreTimestamps).toBe(false)
    })
  })

  describe('SnapshotManager', () => {
    it('should generate consistent keys', () => {
      const key1 = snapshotManager.generateKey('test1', 'snapshot1', { args: ['--help'] })
      const key2 = snapshotManager.generateKey('test1', 'snapshot1', { args: ['--help'] })
      expect(key1).toBe(key2)
    })

    it('should generate different keys for different contexts', () => {
      const key1 = snapshotManager.generateKey('test1', 'snapshot1', { args: ['--help'] })
      const key2 = snapshotManager.generateKey('test1', 'snapshot1', { args: ['--version'] })
      expect(key1).not.toBe(key2)
    })

    it('should get snapshot path', () => {
      const testFile = join(tempDir, 'test-file.test.mjs')
      const snapshotPath = snapshotManager.getSnapshotPath(testFile, 'test-snapshot')
      expect(snapshotPath).toContain('__snapshots__')
      expect(snapshotPath).toContain('test-file.test.test-snapshot.snap')
    })

    it('should normalize string data', () => {
      const data = '  hello  world  \n  with  spaces  '
      const normalized = snapshotManager.normalizeData(data)
      expect(normalized).toBe('hello world\nwith spaces')
    })

    it('should normalize timestamps in strings', () => {
      const data = 'Error at 2024-01-01T12:00:00.000Z: Something went wrong'
      const normalized = snapshotManager.normalizeData(data)
      expect(normalized).toContain('[TIMESTAMP]')
      expect(normalized).not.toContain('2024-01-01T12:00:00.000Z')
    })

    it('should normalize object data', () => {
      const data = {
        message: 'hello',
        timestamp: '2024-01-01T12:00:00.000Z',
        count: 42
      }
      const normalized = snapshotManager.normalizeData(data)
      expect(normalized.timestamp).toBe('[TIMESTAMP]')
      expect(normalized.message).toBe('hello')
      expect(normalized.count).toBe(42)
    })

    it('should compare identical strings', () => {
      const result = snapshotManager.compareData('hello', 'hello')
      expect(result.match).toBe(true)
    })

    it('should compare different strings', () => {
      const result = snapshotManager.compareData('hello', 'world')
      expect(result.match).toBe(false)
      expect(result.error).toContain('String mismatch')
    })

    it('should compare identical objects', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 2 }
      const result = snapshotManager.compareData(obj1, obj2)
      expect(result.match).toBe(true)
    })

    it('should compare different objects', () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { a: 1, b: 3 }
      const result = snapshotManager.compareData(obj1, obj2)
      expect(result.match).toBe(false)
      expect(result.differences).toBeDefined()
    })

    it('should create new snapshot when none exists', () => {
      const testFile = join(tempDir, 'test-file.test.mjs')
      const result = snapshotManager.matchSnapshot('test data', testFile, 'new-snapshot')
      
      expect(result.match).toBe(true)
      expect(result.created).toBe(true)
      expect(result.message).toContain('Created new snapshot')
    })

    it('should match existing snapshot', () => {
      const testFile = join(tempDir, 'test-file.test.mjs')
      
      // Create initial snapshot
      snapshotManager.matchSnapshot('test data', testFile, 'existing-snapshot')
      
      // Match against existing snapshot
      const result = snapshotManager.matchSnapshot('test data', testFile, 'existing-snapshot')
      
      expect(result.match).toBe(true)
      expect(result.created).toBeUndefined()
    })

    it('should detect snapshot mismatch', () => {
      const testFile = join(tempDir, 'test-file.test.mjs')
      
      // Create initial snapshot
      snapshotManager.matchSnapshot('original data', testFile, 'mismatch-test')
      
      // Try to match different data
      const result = snapshotManager.matchSnapshot('different data', testFile, 'mismatch-test')
      
      expect(result.match).toBe(false)
      expect(result.error).toContain('Snapshot mismatch')
    })

    it('should update snapshot when configured', () => {
      const config = new SnapshotConfig({ updateSnapshots: true })
      const manager = new SnapshotManager(config)
      const testFile = join(tempDir, 'test-file.test.mjs')
      
      // Create initial snapshot
      manager.matchSnapshot('original data', testFile, 'update-test')
      
      // Update snapshot
      const result = manager.matchSnapshot('updated data', testFile, 'update-test')
      
      expect(result.match).toBe(true)
      expect(result.updated).toBe(true)
    })
  })

  describe('snapshotUtils', () => {
    it('should create snapshot from result stdout', () => {
      const result = {
        stdout: 'hello world',
        stderr: 'error message',
        exitCode: 0,
        args: ['--help'],
        cwd: '/test',
        json: { message: 'hello' }
      }
      
      const snapshot = snapshotUtils.createSnapshotFromResult(result, 'stdout')
      expect(snapshot).toBe('hello world')
    })

    it('should create snapshot from result stderr', () => {
      const result = {
        stdout: 'hello world',
        stderr: 'error message',
        exitCode: 1,
        args: ['invalid'],
        cwd: '/test',
        json: null
      }
      
      const snapshot = snapshotUtils.createSnapshotFromResult(result, 'stderr')
      expect(snapshot).toBe('error message')
    })

    it('should create snapshot from result json', () => {
      const result = {
        stdout: '{"message": "hello"}',
        stderr: '',
        exitCode: 0,
        args: ['--json'],
        cwd: '/test',
        json: { message: 'hello' }
      }
      
      const snapshot = snapshotUtils.createSnapshotFromResult(result, 'json')
      expect(snapshot).toEqual({ message: 'hello' })
    })

    it('should create snapshot from result full', () => {
      const result = {
        stdout: 'hello world',
        stderr: '',
        exitCode: 0,
        args: ['--help'],
        cwd: '/test',
        json: null
      }
      
      const snapshot = snapshotUtils.createSnapshotFromResult(result, 'full')
      expect(snapshot).toEqual({
        exitCode: 0,
        stdout: 'hello world',
        stderr: '',
        args: ['--help'],
        cwd: '/test',
        json: null
      })
    })

    it('should create custom snapshot', () => {
      const data = { custom: 'data' }
      const metadata = { test: 'test' }
      
      const snapshot = snapshotUtils.createSnapshot(data, metadata)
      
      expect(snapshot.data).toEqual(data)
      expect(snapshot.metadata.test).toBe('test')
      expect(snapshot.metadata.created).toBeDefined()
    })

    it('should validate snapshot data', () => {
      const validSnapshot = { data: 'test' }
      const invalidSnapshot = 'not an object'
      
      const validResult = snapshotUtils.validateSnapshot(validSnapshot)
      const invalidResult = snapshotUtils.validateSnapshot(invalidSnapshot)
      
      expect(validResult.valid).toBe(true)
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.error).toContain('must be an object')
    })
  })

  describe('Global Snapshot Manager', () => {
    it('should get global snapshot manager', () => {
      const manager1 = getSnapshotManager()
      const manager2 = getSnapshotManager()
      expect(manager1).toBe(manager2)
    })

    it('should create new manager with config', () => {
      const config = new SnapshotConfig({ snapshotDir: 'custom' })
      const manager = getSnapshotManager(config)
      expect(manager.config.snapshotDir).toBe('custom')
    })

    it('should reset global manager', () => {
      const manager1 = getSnapshotManager()
      resetSnapshotManager()
      const manager2 = getSnapshotManager()
      expect(manager1).not.toBe(manager2)
    })
  })

  describe('matchSnapshot convenience function', () => {
    it('should work with convenience function', () => {
      const testFile = join(tempDir, 'test-file.test.mjs')
      const result = matchSnapshot('test data', testFile, 'convenience-test')
      
      expect(result.match).toBe(true)
      expect(result.created).toBe(true)
    })
  })
})
