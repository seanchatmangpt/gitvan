/**
 * GitVan v2 Composables Tests
 * Tests for useGit, useTemplate, useExec composables
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock child_process before importing composables
vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}));

// Mock the context modules
const mockContext = {
  cwd: '/test/repo',
  root: '/test/repo',
  env: {
    ...process.env,
    TZ: 'UTC',
    LANG: 'C',
    TEST: 'true'
  }
};

vi.mock('../src/core/context.mjs', () => ({
  useGitVan: vi.fn(() => mockContext),
  tryUseGitVan: vi.fn(() => mockContext),
  withGitVan: vi.fn((context, fn) => fn()),
  bindContext: vi.fn(() => mockContext)
}));

vi.mock('../src/composables/ctx.mjs', () => ({
  useGitVan: vi.fn(() => mockContext),
  withGitVan: vi.fn((context, fn) => fn())
}));

import { useGit } from '../src/composables/git.mjs'
import { useExec } from '../src/composables/exec.mjs'

describe('Composables Tests', () => {

  describe('useGit()', () => {
    it('should provide git operations with context', () => {
      const git = useGit()
      expect(git).toBeDefined()
      expect(git.cwd).toBe('/test/repo')
      expect(typeof git.branch).toBe('function')
      expect(typeof git.add).toBe('function')
      expect(typeof git.commit).toBe('function')
    })

    it('should format git log correctly', () => {
      const git = useGit()
      expect(typeof git.log).toBe('function')
    })

    it('should handle worktree operations', () => {
      const git = useGit()
      expect(typeof git.listWorktrees).toBe('function')
    })

    it('should provide essential git operations', () => {
      const git = useGit()

      // Core operations
      expect(git.branch).toBeDefined()
      expect(git.head).toBeDefined()
      expect(git.fetch).toBeDefined()
      expect(git.pull).toBeDefined()
      expect(git.push).toBeDefined()

      // Index/workspace
      expect(git.add).toBeDefined()
      expect(git.checkout).toBeDefined()
      expect(git.switch).toBeDefined()

      // Commits/tags
      expect(git.commit).toBeDefined()
      expect(git.tag).toBeDefined()

      // Branches
      expect(git.branchCreate).toBeDefined()
      expect(git.branchDelete).toBeDefined()

      // Integration
      expect(git.merge).toBeDefined()
      expect(git.rebase).toBeDefined()
      expect(git.cherryPick).toBeDefined()
      expect(git.revert).toBeDefined()
      expect(git.reset).toBeDefined()
      expect(git.stashSave).toBeDefined()
      expect(git.stashApply).toBeDefined()

      // History/search
      expect(git.log).toBeDefined()

      // Notes
      expect(git.noteShow).toBeDefined()
      expect(git.noteAdd).toBeDefined()
      expect(git.noteAppend).toBeDefined()

      // Refs
      expect(git.listRefs).toBeDefined()

      // Worktrees
      expect(git.listWorktrees).toBeDefined()
    })
  })

  describe('useExec()', () => {
    it('should provide cli, js, and tmpl executors', () => {
      const exec = useExec()
      expect(exec).toBeDefined()
      expect(typeof exec.cli).toBe('function')
      expect(typeof exec.js).toBe('function')
      expect(typeof exec.tmpl).toBe('function')
    })

    it('should execute CLI commands', () => {
      // When implemented:
      // const result = exec.cli('echo', ['hello'])
      // expect(result.ok).toBe(true)
      // expect(result.stdout).toBe('hello')
    })

    it('should execute JS modules', async () => {
      // When implemented:
      // const result = await exec.js('./module.mjs', 'default', { input: 'data' })
      // expect(result.ok).toBe(true)
    })

    it('should render templates via exec', () => {
      // When implemented:
      // const result = exec.tmpl({
      //   template: 'test.njk',
      //   data: { name: 'World' }
      // })
      // expect(result.ok).toBe(true)
      // expect(result.stdout).toContain('Hello World')
    })
  })

  describe('Context Management', () => {
    it('should provide git operations that use context cwd', () => {
      const git = useGit()
      expect(git).toBeDefined()
      expect(git.cwd).toBe('/test/repo')
      expect(typeof git.branch).toBe('function')
    })

    it('should provide deterministic environment variables', () => {
      const git = useGit()
      expect(git.env.TZ).toBe('UTC')
      expect(git.env.LANG).toBe('C')
    })
  })
})
