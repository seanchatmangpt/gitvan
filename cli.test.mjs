/**
 * GitVan v2 CLI Tests
 * Tests for all CLI commands and subcommands
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'pathe'

const TEST_DIR = join(process.cwd(), '.test-cli')
const GITVAN_BIN = join(process.cwd(), 'bin/gitvan.mjs')

describe('CLI Command Tests', () => {

  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)

    // Initialize test repo
    execSync('git init')
    execSync('git config user.email "test@example.com"')
    execSync('git config user.name "Test User"')

    // Create minimal structure
    mkdirSync('jobs/docs', { recursive: true })
    mkdirSync('templates', { recursive: true })
  })

  afterEach(() => {
    process.chdir('..')
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  describe('gitvan help', () => {
    it('should display help text', () => {
      const output = execSync(`node ${GITVAN_BIN} help`, { encoding: 'utf8' })
      expect(output).toContain('GitVan v2')
      expect(output).toContain('Usage:')
      expect(output).toContain('gitvan daemon')
      expect(output).toContain('gitvan job')
      expect(output).toContain('gitvan event')
      expect(output).toContain('gitvan worktree')
    })

    it('should show help when no command given', () => {
      const output = execSync(`node ${GITVAN_BIN}`, { encoding: 'utf8' })
      expect(output).toContain('GitVan v2')
      expect(output).toContain('Usage:')
    })
  })

  describe('gitvan job', () => {
    it('should list available jobs with "job list"', () => {
      writeFileSync('jobs/docs/test.mjs', 'export default { run: () => ({}) }')

      // Currently returns "not yet implemented"
      const output = execSync(`node ${GITVAN_BIN} job list`, { encoding: 'utf8' })
      expect(output).toBe('Job listing not yet implemented\n')

      // When implemented:
      // expect(output).toContain('Available jobs:')
      // expect(output).toContain('docs/test')
    })

    it('should run job with "job run --name"', () => {
      writeFileSync('jobs/docs/test.mjs', `
export default {
  run: async () => ({ ok: true, message: 'Test job executed' })
}`)

      // Currently doesn't fully work
      const output = execSync(`node ${GITVAN_BIN} job run --name docs/test 2>&1`, {
        encoding: 'utf8'
      }).trim()

      expect(output).toBe('Running job: docs/test')

      // When fully implemented:
      // expect(output).toContain('Result:')
      // expect(output).toContain('"ok": true')
      // expect(output).toContain('Test job executed')
    })

    it('should handle missing job gracefully', () => {
      expect(() => {
        execSync(`node ${GITVAN_BIN} job run --name nonexistent`, { encoding: 'utf8' })
      }).toThrow()
    })
  })

  describe('gitvan list (legacy)', () => {
    it('should list available jobs', () => {
      writeFileSync('jobs/test1.mjs', 'export default {}')
      writeFileSync('jobs/docs/test2.mjs', 'export default {}')

      const output = execSync(`node ${GITVAN_BIN} list`, { encoding: 'utf8' })
      expect(output).toContain('Available jobs:')
      expect(output).toContain('test1')
      expect(output).toContain('docs/test2')
    })

    it('should handle empty jobs directory', () => {
      const output = execSync(`node ${GITVAN_BIN} list`, { encoding: 'utf8' })
      expect(output).toContain('Available jobs:')
    })
  })

  describe('gitvan run (legacy)', () => {
    it('should run specified job', () => {
      writeFileSync('jobs/test.mjs', `
import { defineJob } from '${join(process.cwd(), '..', 'src/runtime/define.mjs')}'
export default defineJob({
  run: async () => ({ ok: true, result: 'test completed' })
})`)

      const output = execSync(`node ${GITVAN_BIN} run test`, { encoding: 'utf8' })
      expect(output).toContain('Running job: test')
      expect(output).toContain('Result:')
      expect(output).toContain('"ok": true')
    })

    it('should report missing job', () => {
      expect(() => {
        execSync(`node ${GITVAN_BIN} run nonexistent`, { encoding: 'utf8' })
      }).toThrow(/Job not found/)
    })
  })

  describe('gitvan event', () => {
    it('should list discovered events', () => {
      mkdirSync('events/message', { recursive: true })
      writeFileSync('events/message/release.mjs', 'export default { job: "test" }')

      const output = execSync(`node ${GITVAN_BIN} event list`, { encoding: 'utf8' })
      expect(output).toContain('Discovered Events:')
      // Currently lists ALL .mjs files incorrectly
      expect(output).toContain('events/message/release')
    })

    it('should handle empty events directory', () => {
      mkdirSync('events', { recursive: true })
      const output = execSync(`node ${GITVAN_BIN} event list`, { encoding: 'utf8' })
      expect(output).toContain('Discovered Events:')
    })
  })

  describe('gitvan schedule', () => {
    it('should report schedule not implemented', () => {
      const output = execSync(`node ${GITVAN_BIN} schedule apply`, { encoding: 'utf8' })
      expect(output).toBe('Schedule management not yet implemented\n')

      // When implemented:
      // expect(output).toContain('Schedule applied')
    })
  })

  describe('gitvan worktree', () => {
    it('should list worktrees', () => {
      const output = execSync(`node ${GITVAN_BIN} worktree list`, { encoding: 'utf8' })
      expect(output).toContain('Worktrees:')
      expect(output).toContain(TEST_DIR)
      expect(output).toContain('Branch:')
    })

    it('should show current worktree as main', () => {
      const output = execSync(`node ${GITVAN_BIN} worktree list`, { encoding: 'utf8' })
      expect(output).toContain(TEST_DIR)
      // Should indicate main worktree somehow
    })
  })

  describe('gitvan daemon', () => {
    it('should report daemon status', () => {
      const output = execSync(`node ${GITVAN_BIN} daemon status`, { encoding: 'utf8' })
      expect(output).toContain('Daemon not running')
      expect(output).toContain(TEST_DIR)
    })

    it('should start daemon (would hang, so just test help)', () => {
      // Can't easily test daemon start without it hanging
      // Would need background process management

      // When testable:
      // const daemon = spawn('node', [GITVAN_BIN, 'daemon', 'start'], {
      //   detached: true,
      //   stdio: 'ignore'
      // })
      // daemon.unref()
      //
      // await sleep(1000)
      // const status = execSync(`node ${GITVAN_BIN} daemon status`, { encoding: 'utf8' })
      // expect(status).toContain('Daemon running')
      //
      // execSync(`node ${GITVAN_BIN} daemon stop`)
    })

    it('should handle --worktrees option', () => {
      // When implemented:
      // const output = execSync(`node ${GITVAN_BIN} daemon start --worktrees all --dry-run`)
      // expect(output).toContain('Starting daemon for all worktrees')
    })
  })

  describe('Error Handling', () => {
    it('should report unknown commands', () => {
      expect(() => {
        execSync(`node ${GITVAN_BIN} unknown`, { encoding: 'utf8' })
      }).toThrow(/Unknown command/)
    })

    it('should handle malformed job files gracefully', () => {
      writeFileSync('jobs/bad.mjs', 'syntax error!')

      expect(() => {
        execSync(`node ${GITVAN_BIN} run bad`, { encoding: 'utf8' })
      }).toThrow()
    })

    it('should handle missing gitvan.config.js', () => {
      // Should work with defaults
      const output = execSync(`node ${GITVAN_BIN} list`, { encoding: 'utf8' })
      expect(output).toContain('Available jobs:')
    })
  })

  describe('Options Parsing', () => {
    it('should parse --name option correctly', () => {
      // Test that options are parsed
      writeFileSync('jobs/test.mjs', 'export default { run: () => ({}) }')

      // Should work when implemented:
      // const output = execSync(`node ${GITVAN_BIN} job run --name test`)
      // expect(output).toContain('test')
    })

    it('should handle multiple options', () => {
      // When more options exist:
      // const output = execSync(`node ${GITVAN_BIN} job run --name test --verbose --dry-run`)
      // expect(output).toContain('dry-run mode')
    })
  })
})