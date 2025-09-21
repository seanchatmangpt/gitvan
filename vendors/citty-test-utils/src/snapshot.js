import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname, basename, extname } from 'node:path'
import { createHash } from 'node:crypto'

/**
 * Snapshot testing utilities for CLI output validation
 * Provides deterministic testing by comparing current output with stored snapshots
 */

// Default snapshot directory
const DEFAULT_SNAPSHOT_DIR = '__snapshots__'

/**
 * Configuration for snapshot testing
 */
export class SnapshotConfig {
  constructor(options = {}) {
    this.snapshotDir = options.snapshotDir || DEFAULT_SNAPSHOT_DIR
    this.updateSnapshots = options.updateSnapshots || false
    this.ciMode = options.ciMode || process.env.CI === 'true'
    this.ignoreWhitespace = options.ignoreWhitespace !== false // default true
    this.ignoreTimestamps = options.ignoreTimestamps !== false // default true
    this.maxDiffSize = options.maxDiffSize || 1000
    this.customMatchers = options.customMatchers || []
  }
}

/**
 * Snapshot manager for handling snapshot operations
 */
export class SnapshotManager {
  constructor(config = new SnapshotConfig()) {
    this.config = config
    this.snapshots = new Map()
    this.createdSnapshots = new Set()
  }

  /**
   * Generate a snapshot key from test context
   */
  generateKey(testName, snapshotName, options = {}) {
    const { args, env, cwd } = options
    const context = {
      testName,
      snapshotName,
      args: args ? args.join(' ') : '',
      env: env ? Object.keys(env).sort().map(k => `${k}=${env[k]}`).join(',') : '',
      cwd: cwd || ''
    }
    
    const contextStr = JSON.stringify(context, Object.keys(context).sort())
    return createHash('sha256').update(contextStr).digest('hex').substring(0, 16)
  }

  /**
   * Get snapshot file path
   */
  getSnapshotPath(testFile, snapshotName) {
    const testDir = dirname(testFile)
    const testBaseName = basename(testFile, extname(testFile))
    const snapshotDir = join(testDir, this.config.snapshotDir)
    
    // Ensure snapshot directory exists
    if (!existsSync(snapshotDir)) {
      mkdirSync(snapshotDir, { recursive: true })
    }
    
    return join(snapshotDir, `${testBaseName}.${snapshotName}.snap`)
  }

  /**
   * Load existing snapshot
   */
  loadSnapshot(snapshotPath) {
    if (!existsSync(snapshotPath)) {
      return null
    }
    
    try {
      const content = readFileSync(snapshotPath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      console.warn(`⚠️ Failed to load snapshot ${snapshotPath}: ${error.message}`)
      return null
    }
  }

  /**
   * Save snapshot to file
   */
  saveSnapshot(snapshotPath, snapshotData) {
    try {
      const content = JSON.stringify(snapshotData, null, 2)
      writeFileSync(snapshotPath, content, 'utf8')
      this.createdSnapshots.add(snapshotPath)
      return true
    } catch (error) {
      console.error(`❌ Failed to save snapshot ${snapshotPath}: ${error.message}`)
      return false
    }
  }

  /**
   * Normalize data for comparison (remove timestamps, normalize whitespace, etc.)
   */
  normalizeData(data, options = {}) {
    if (typeof data === 'string') {
      let normalized = data
      
      if (this.config.ignoreWhitespace) {
        // Normalize whitespace but preserve structure
        normalized = normalized
          .replace(/\r\n/g, '\n') // Normalize line endings
          .replace(/[ \t]+/g, ' ') // Collapse multiple spaces/tabs
          .replace(/\n\s+/g, '\n') // Remove leading whitespace from lines
          .replace(/\s+\n/g, '\n') // Remove trailing whitespace from lines
          .trim()
      }
      
      if (this.config.ignoreTimestamps) {
        // Remove common timestamp patterns
        normalized = normalized
          .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '[TIMESTAMP]')
          .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]')
          .replace(/at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'at [TIMESTAMP]')
      }
      
      return normalized
    }
    
    if (typeof data === 'object' && data !== null) {
      const normalized = { ...data }
      
      if (this.config.ignoreTimestamps) {
        // Remove timestamp fields
        const timestampFields = ['timestamp', 'createdAt', 'updatedAt', 'date', 'time']
        timestampFields.forEach(field => {
          if (normalized[field]) {
            normalized[field] = '[TIMESTAMP]'
          }
        })
      }
      
      return normalized
    }
    
    return data
  }

  /**
   * Compare two data structures
   */
  compareData(current, expected, path = '') {
    const currentNormalized = this.normalizeData(current)
    const expectedNormalized = this.normalizeData(expected)
    
    if (currentNormalized === expectedNormalized) {
      return { match: true }
    }
    
    if (typeof currentNormalized !== typeof expectedNormalized) {
      return {
        match: false,
        error: `Type mismatch at ${path}: expected ${typeof expectedNormalized}, got ${typeof currentNormalized}`,
        diff: this.generateDiff(currentNormalized, expectedNormalized)
      }
    }
    
    if (typeof currentNormalized === 'string') {
      return this.compareStrings(currentNormalized, expectedNormalized, path)
    }
    
    if (typeof currentNormalized === 'object') {
      return this.compareObjects(currentNormalized, expectedNormalized, path)
    }
    
    return {
      match: false,
      error: `Value mismatch at ${path}: expected ${expectedNormalized}, got ${currentNormalized}`,
      diff: this.generateDiff(currentNormalized, expectedNormalized)
    }
  }

  /**
   * Compare strings with detailed diff
   */
  compareStrings(current, expected, path) {
    if (current === expected) {
      return { match: true }
    }
    
    const diff = this.generateStringDiff(current, expected)
    return {
      match: false,
      error: `String mismatch at ${path}`,
      diff,
      current: current.length > this.config.maxDiffSize ? 
        current.substring(0, this.config.maxDiffSize) + '...' : current,
      expected: expected.length > this.config.maxDiffSize ? 
        expected.substring(0, this.config.maxDiffSize) + '...' : expected
    }
  }

  /**
   * Compare objects recursively
   */
  compareObjects(current, expected, path) {
    const currentKeys = Object.keys(current || {})
    const expectedKeys = Object.keys(expected || {})
    const allKeys = new Set([...currentKeys, ...expectedKeys])
    
    const differences = []
    
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key
      const currentValue = current[key]
      const expectedValue = expected[key]
      
      if (!(key in current)) {
        differences.push({
          path: currentPath,
          type: 'missing',
          expected: expectedValue
        })
      } else if (!(key in expected)) {
        differences.push({
          path: currentPath,
          type: 'extra',
          current: currentValue
        })
      } else {
        const comparison = this.compareData(currentValue, expectedValue, currentPath)
        if (!comparison.match) {
          differences.push({
            path: currentPath,
            type: 'mismatch',
            ...comparison
          })
        }
      }
    }
    
    if (differences.length === 0) {
      return { match: true }
    }
    
    return {
      match: false,
      error: `Object mismatch at ${path}`,
      differences,
      diff: this.generateDiff(current, expected)
    }
  }

  /**
   * Generate string diff
   */
  generateStringDiff(current, expected) {
    const currentLines = current.split('\n')
    const expectedLines = expected.split('\n')
    const maxLines = Math.max(currentLines.length, expectedLines.length)
    
    const diff = []
    for (let i = 0; i < maxLines; i++) {
      const currentLine = currentLines[i] || ''
      const expectedLine = expectedLines[i] || ''
      
      if (currentLine !== expectedLine) {
        diff.push({
          line: i + 1,
          current: currentLine,
          expected: expectedLine
        })
      }
    }
    
    return diff.slice(0, 10) // Limit diff size
  }

  /**
   * Generate general diff
   */
  generateDiff(current, expected) {
    return {
      current: typeof current === 'string' && current.length > this.config.maxDiffSize ? 
        current.substring(0, this.config.maxDiffSize) + '...' : current,
      expected: typeof expected === 'string' && expected.length > this.config.maxDiffSize ? 
        expected.substring(0, this.config.maxDiffSize) + '...' : expected
    }
  }

  /**
   * Match snapshot - main comparison function
   */
  matchSnapshot(currentData, testFile, snapshotName, options = {}) {
    const snapshotPath = this.getSnapshotPath(testFile, snapshotName)
    const existingSnapshot = this.loadSnapshot(snapshotPath)
    
    // If updating snapshots or no existing snapshot, save current data
    if (this.config.updateSnapshots || !existingSnapshot) {
      const snapshotData = {
        data: currentData,
        metadata: {
          created: new Date().toISOString(),
          testFile,
          snapshotName,
          options,
          version: '1.0.0'
        }
      }
      
      this.saveSnapshot(snapshotPath, snapshotData)
      
      if (!existingSnapshot) {
        return {
          match: true,
          created: true,
          message: `✅ Created new snapshot: ${snapshotName}`
        }
      } else {
        return {
          match: true,
          updated: true,
          message: `✅ Updated snapshot: ${snapshotName}`
        }
      }
    }
    
    // Compare with existing snapshot
    const comparison = this.compareData(currentData, existingSnapshot.data)
    
    if (comparison.match) {
      return {
        match: true,
        message: `✅ Snapshot matches: ${snapshotName}`
      }
    }
    
    // Generate detailed error message
    const errorMessage = this.generateErrorMessage(comparison, snapshotName, snapshotPath)
    
    return {
      match: false,
      error: errorMessage,
      snapshotPath,
      comparison
    }
  }

  /**
   * Generate detailed error message for snapshot mismatch
   */
  generateErrorMessage(comparison, snapshotName, snapshotPath) {
    let message = `❌ Snapshot mismatch: ${snapshotName}\n`
    message += `📁 Snapshot file: ${snapshotPath}\n`
    
    if (comparison.error) {
      message += `🔍 Error: ${comparison.error}\n`
    }
    
    if (comparison.diff) {
      message += `📊 Diff:\n`
      if (comparison.diff.current !== undefined) {
        message += `Current: ${JSON.stringify(comparison.diff.current)}\n`
      }
      if (comparison.diff.expected !== undefined) {
        message += `Expected: ${JSON.stringify(comparison.diff.expected)}\n`
      }
    }
    
    if (comparison.differences) {
      message += `🔍 Differences:\n`
      comparison.differences.forEach(diff => {
        message += `  ${diff.path}: ${diff.type}\n`
      })
    }
    
    message += `\n💡 To update snapshots, run with --update-snapshots flag`
    
    return message
  }

  /**
   * Clean up created snapshots (for testing)
   */
  cleanup() {
    this.createdSnapshots.forEach(snapshotPath => {
      try {
        if (existsSync(snapshotPath)) {
          const { unlinkSync } = require('node:fs')
          unlinkSync(snapshotPath)
        }
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup snapshot ${snapshotPath}: ${error.message}`)
      }
    })
    this.createdSnapshots.clear()
  }

  /**
   * Get snapshot statistics
   */
  getStats() {
    return {
      totalSnapshots: this.snapshots.size,
      createdSnapshots: this.createdSnapshots.size,
      config: this.config
    }
  }
}

// Global snapshot manager instance
let globalSnapshotManager = null

/**
 * Get or create global snapshot manager
 */
export function getSnapshotManager(config) {
  if (!globalSnapshotManager || config) {
    globalSnapshotManager = new SnapshotManager(config)
  }
  return globalSnapshotManager
}

/**
 * Reset global snapshot manager
 */
export function resetSnapshotManager() {
  globalSnapshotManager = null
}

/**
 * Convenience function for snapshot matching
 */
export function matchSnapshot(currentData, testFile, snapshotName, options = {}) {
  const manager = getSnapshotManager()
  return manager.matchSnapshot(currentData, testFile, snapshotName, options)
}

/**
 * Snapshot testing utilities
 */
export const snapshotUtils = {
  /**
   * Create a snapshot from CLI result
   */
  createSnapshotFromResult(result, type = 'stdout') {
    switch (type) {
      case 'stdout':
        return result.stdout
      case 'stderr':
        return result.stderr
      case 'json':
        return result.json || result.stdout
      case 'full':
        return {
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          args: result.args,
          cwd: result.cwd,
          json: result.json
        }
      case 'output':
        return {
          stdout: result.stdout,
          stderr: result.stderr
        }
      default:
        return result[type] || result.stdout
    }
  },

  /**
   * Create snapshot from custom data
   */
  createSnapshot(data, metadata = {}) {
    return {
      data,
      metadata: {
        created: new Date().toISOString(),
        ...metadata
      }
    }
  },

  /**
   * Validate snapshot data
   */
  validateSnapshot(snapshotData) {
    if (!snapshotData || typeof snapshotData !== 'object') {
      return { valid: false, error: 'Snapshot data must be an object' }
    }
    
    if (!snapshotData.data) {
      return { valid: false, error: 'Snapshot data must have a data property' }
    }
    
    return { valid: true }
  }
}

export default {
  SnapshotConfig,
  SnapshotManager,
  getSnapshotManager,
  resetSnapshotManager,
  matchSnapshot,
  snapshotUtils
}
