/**
 * Git Atomic Operations Tests - Write Operations & Notes
 * Tests all write operations with deterministic environment and atomic behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

// Mock execFile before importing useGit
const mockExecFile = vi.fn();
vi.mock('node:child_process', () => ({
  execFile: mockExecFile
}));

// Mock the context module BEFORE importing anything else
vi.mock('../src/core/context.mjs', () => {
  const mockContext = {
    cwd: '/test/repo',
    env: {
      ...process.env,
      TZ: 'UTC',
      LANG: 'C',
      NODE_ENV: 'test',
      PATH: '/usr/local/bin:/usr/bin:/bin'
    }
  };

  return {
    useGitVan: vi.fn(() => mockContext),
    tryUseGitVan: vi.fn(() => mockContext),
    withGitVan: vi.fn((context, fn) => fn()),
    bindContext: vi.fn(() => mockContext) // This was missing!
  };
});

let useGit;
let withGitVan;

describe('Git Atomic Operations - Write Operations & Notes', () => {
  let git;
  let mockContext;
  let tempDir;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(join(os.tmpdir(), 'gitvan-atomic-test-'));

    // Setup deterministic environment context
    mockContext = {
      cwd: tempDir,
      env: {
        TZ: 'UTC',
        LANG: 'C',
        GIT_AUTHOR_NAME: 'Test Author',
        GIT_AUTHOR_EMAIL: 'test@gitvan.dev',
        GIT_COMMITTER_NAME: 'Test Author',
        GIT_COMMITTER_EMAIL: 'test@gitvan.dev',
        GIT_AUTHOR_DATE: '2023-01-01T00:00:00Z',
        GIT_COMMITTER_DATE: '2023-01-01T00:00:00Z'
      }
    };

    // Mock context module with proper path
    vi.doMock('../src/core/context.mjs', () => ({
      useGitVan: vi.fn(() => mockContext),
      tryUseGitVan: vi.fn(() => mockContext),
      withGitVan: vi.fn((ctx, fn) => fn()),
      bindContext: vi.fn(() => {
        const cwd = (mockContext && mockContext.cwd) || process.cwd();
        const env = {
          ...process.env,
          TZ: "UTC",
          LANG: "C",
          ...(mockContext && mockContext.env ? mockContext.env : {}),
        };
        return { ctx: mockContext, cwd, env };
      })
    }));

    // Default successful execFile response
    mockExecFile.mockResolvedValue({
      stdout: 'success\n',
      stderr: ''
    });

    // Import modules after mocks are setup
    const gitModule = await import('../src/composables/git.mjs');
    const contextModule = await import('../src/core/context.mjs');
    useGit = gitModule.useGit;
    withGitVan = contextModule.withGitVan;
    git = useGit();
  });

  afterEach(async () => {
    vi.resetAllMocks();

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Environment Validation', () => {
    it('should use deterministic environment settings', () => {
      expect(git.env).toEqual(expect.objectContaining({
        TZ: 'UTC',
        LANG: 'C',
        GIT_AUTHOR_NAME: 'Test Author',
        GIT_AUTHOR_EMAIL: 'test@gitvan.dev',
        GIT_COMMITTER_NAME: 'Test Author',
        GIT_COMMITTER_EMAIL: 'test@gitvan.dev',
        GIT_AUTHOR_DATE: '2023-01-01T00:00:00Z',
        GIT_COMMITTER_DATE: '2023-01-01T00:00:00Z'
      }));
    });

    it('should use correct working directory from context', () => {
      expect(git.cwd).toBe(tempDir);
    });

    it('should preserve deterministic settings across operations', async () => {
      const expectedEnv = git.env;

      await git.add('test.txt');
      await git.commit('Test commit');

      // Environment should remain consistent
      const git2 = useGit();
      expect(git2.env).toEqual(expectedEnv);
    });
  });

  describe('Write Operations - add()', () => {
    beforeEach(() => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
    });

    it('should add single file atomically', async () => {
      await git.add('file.txt');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['add', '--', 'file.txt'],
        expect.objectContaining({
          cwd: tempDir,
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C'
          }),
          maxBuffer: 12 * 1024 * 1024
        })
      );
    });

    it('should add multiple files atomically', async () => {
      const files = ['src/main.js', 'src/utils.js', 'README.md'];

      await git.add(files);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['add', '--', ...files],
        expect.any(Object)
      );
    });

    it('should handle empty file lists gracefully', async () => {
      await git.add([]);
      await git.add('');
      await git.add(null);
      await git.add(undefined);

      expect(mockExecFile).not.toHaveBeenCalled();
    });

    it('should filter out invalid paths', async () => {
      await git.add(['file1.txt', '', null, 'file2.txt', undefined]);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['add', '--', 'file1.txt', 'file2.txt'],
        expect.any(Object)
      );
    });

    it('should handle add operation failures', async () => {
      const gitError = new Error('fatal: pathspec does not match any files');
      gitError.code = 128;
      mockExecFile.mockRejectedValue(gitError);

      await expect(git.add('nonexistent.txt')).rejects.toThrow(
        'fatal: pathspec does not match any files'
      );
    });

    it('should preserve file path safety with double-dash', async () => {
      await git.add(['--dangerous-flag', 'normal-file.txt']);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['add', '--', '--dangerous-flag', 'normal-file.txt'],
        expect.any(Object)
      );
    });
  });

  describe('Write Operations - commit()', () => {
    beforeEach(() => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
    });

    it('should create simple commit with deterministic metadata', async () => {
      await git.commit('Test commit message');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', 'Test commit message'],
        expect.objectContaining({
          env: expect.objectContaining({
            GIT_AUTHOR_DATE: '2023-01-01T00:00:00Z',
            GIT_COMMITTER_DATE: '2023-01-01T00:00:00Z'
          })
        })
      );
    });

    it('should create signed commit when requested', async () => {
      await git.commit('Signed commit', { sign: true });

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', 'Signed commit', '-S'],
        expect.any(Object)
      );
    });

    it('should handle multiline commit messages', async () => {
      const multilineMessage = 'Fix: Critical bug\n\n- Fixed memory leak\n- Updated documentation\n- Added tests';

      await git.commit(multilineMessage);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', multilineMessage],
        expect.any(Object)
      );
    });

    it('should handle commit with empty options object', async () => {
      await git.commit('Default commit', {});

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', 'Default commit'],
        expect.any(Object)
      );
    });

    it('should handle commit failures gracefully', async () => {
      const commitError = new Error('nothing to commit, working tree clean');
      commitError.code = 1;
      mockExecFile.mockRejectedValue(commitError);

      await expect(git.commit('Empty commit')).rejects.toThrow(
        'nothing to commit, working tree clean'
      );
    });

    it('should handle special characters in commit messages', async () => {
      const specialMessage = 'Feat: Add émojis 🎉 and "quotes" with 特殊字符';

      await git.commit(specialMessage);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', specialMessage],
        expect.any(Object)
      );
    });
  });

  describe('Write Operations - tag()', () => {
    beforeEach(() => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
    });

    it('should create lightweight tag', async () => {
      await git.tag('v1.0.0');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['tag', 'v1.0.0'],
        expect.objectContaining({
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C'
          })
        })
      );
    });

    it('should create annotated tag with message', async () => {
      await git.tag('v1.1.0', 'Release version 1.1.0');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['tag', '-m', 'Release version 1.1.0', 'v1.1.0'],
        expect.any(Object)
      );
    });

    it('should create signed annotated tag', async () => {
      await git.tag('v1.2.0', 'Signed release', { sign: true });

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['tag', '-s', '-m', 'Signed release', 'v1.2.0'],
        expect.any(Object)
      );
    });

    it('should create signed lightweight tag', async () => {
      await git.tag('v1.3.0', null, { sign: true });

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['tag', '-s', 'v1.3.0'],
        expect.any(Object)
      );
    });

    it('should handle empty message correctly', async () => {
      await git.tag('v1.4.0', '');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['tag', 'v1.4.0'],
        expect.any(Object)
      );
    });

    it('should handle tag creation failures', async () => {
      const tagError = new Error('fatal: tag \'v1.0.0\' already exists');
      tagError.code = 128;
      mockExecFile.mockRejectedValue(tagError);

      await expect(git.tag('v1.0.0')).rejects.toThrow(
        'fatal: tag \'v1.0.0\' already exists'
      );
    });
  });

  describe('Notes Operations - noteAdd()', () => {
    beforeEach(() => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
    });

    it('should add note to HEAD by default', async () => {
      await git.noteAdd('receipts', 'Operation completed successfully');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['notes', '--ref=receipts', 'add', '-m', 'Operation completed successfully', 'HEAD'],
        expect.objectContaining({
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C'
          })
        })
      );
    });

    it('should add note to specific commit', async () => {
      const commitSha = 'abc123def456789012345678901234567890abcd';

      await git.noteAdd('receipts', 'Note for specific commit', commitSha);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['notes', '--ref=receipts', 'add', '-m', 'Note for specific commit', commitSha],
        expect.any(Object)
      );
    });

    it('should handle multiline note messages', async () => {
      const multilineNote = 'Receipt Details:\n- Operation: File creation\n- Timestamp: 2023-01-01T00:00:00Z\n- Status: Success';

      await git.noteAdd('receipts', multilineNote);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['notes', '--ref=receipts', 'add', '-m', multilineNote, 'HEAD'],
        expect.any(Object)
      );
    });

    it('should handle different note refs', async () => {
      await git.noteAdd('locks', 'Lock acquired at 2023-01-01T00:00:00Z');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['notes', '--ref=locks', 'add', '-m', 'Lock acquired at 2023-01-01T00:00:00Z', 'HEAD'],
        expect.any(Object)
      );
    });

    it('should handle note add failures', async () => {
      const noteError = new Error('error: Cannot add notes. Found existing notes for object');
      noteError.code = 1;
      mockExecFile.mockRejectedValue(noteError);

      await expect(git.noteAdd('receipts', 'Duplicate note')).rejects.toThrow(
        'error: Cannot add notes. Found existing notes for object'
      );
    });
  });

  describe('Notes Operations - noteAppend()', () => {
    beforeEach(() => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
    });

    it('should append note to HEAD by default', async () => {
      await git.noteAppend('receipts', 'Additional operation details');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['notes', '--ref=receipts', 'append', '-m', 'Additional operation details', 'HEAD'],
        expect.objectContaining({
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C'
          })
        })
      );
    });

    it('should append note to specific commit', async () => {
      const commitSha = 'def456abc789012345678901234567890abcdef';

      await git.noteAppend('receipts', 'Appended information', commitSha);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['notes', '--ref=receipts', 'append', '-m', 'Appended information', commitSha],
        expect.any(Object)
      );
    });

    it('should handle multiline append messages', async () => {
      const appendMessage = '\nUpdate:\n- Modified by: Test Engineer\n- Reason: Additional validation';

      await git.noteAppend('receipts', appendMessage);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['notes', '--ref=receipts', 'append', '-m', appendMessage, 'HEAD'],
        expect.any(Object)
      );
    });

    it('should handle append to non-existent note', async () => {
      const appendError = new Error('error: No note found for object');
      appendError.code = 1;
      mockExecFile.mockRejectedValue(appendError);

      await expect(git.noteAppend('receipts', 'Append to missing')).rejects.toThrow(
        'error: No note found for object'
      );
    });
  });

  describe('Notes Operations - noteShow()', () => {
    it('should show note for HEAD by default', async () => {
      const noteContent = 'Receipt:\nOperation: successful\nTimestamp: 2023-01-01T00:00:00Z';
      mockExecFile.mockResolvedValue({ stdout: `${noteContent}\n` });

      const result = await git.noteShow('receipts');

      expect(result).toBe(noteContent);
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['notes', '--ref=receipts', 'show', 'HEAD'],
        expect.objectContaining({
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C'
          })
        })
      );
    });

    it('should show note for specific commit', async () => {
      const commitSha = 'ghi789def012345678901234567890abcdef123';
      const noteContent = 'Lock status: acquired';
      mockExecFile.mockResolvedValue({ stdout: `${noteContent}\n` });

      const result = await git.noteShow('locks', commitSha);

      expect(result).toBe(noteContent);
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['notes', '--ref=locks', 'show', commitSha],
        expect.any(Object)
      );
    });

    it('should handle multiline note content', async () => {
      const multilineNote = 'Receipt Details:\n- File: test.txt\n- Operation: create\n- Status: success';
      mockExecFile.mockResolvedValue({ stdout: `${multilineNote}\n` });

      const result = await git.noteShow('receipts');
      expect(result).toBe(multilineNote);
    });

    it('should handle non-existent notes', async () => {
      const noteError = new Error('error: No note found for object');
      noteError.code = 1;
      mockExecFile.mockRejectedValue(noteError);

      await expect(git.noteShow('receipts', 'nonexistent')).rejects.toThrow(
        'error: No note found for object'
      );
    });

    it('should trim whitespace from note content', async () => {
      const noteWithWhitespace = '  Receipt content  \n  ';
      mockExecFile.mockResolvedValue({ stdout: noteWithWhitespace });

      const result = await git.noteShow('receipts');
      expect(result).toBe('Receipt content');
    });
  });

  describe('Atomic Operations - updateRefCreate()', () => {
    it('should create new ref when it does not exist', async () => {
      const refName = 'refs/locks/test-lock';
      const commitSha = 'abc123def456789012345678901234567890abcd';

      // show-ref fails (ref doesn't exist), update-ref succeeds
      mockExecFile
        .mockRejectedValueOnce(new Error('ref does not exist'))
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await git.updateRefCreate(refName, commitSha);

      expect(result).toBe(true);
      expect(mockExecFile).toHaveBeenCalledTimes(2);
      expect(mockExecFile).toHaveBeenNthCalledWith(1,
        'git',
        ['show-ref', '--verify', '--quiet', refName],
        expect.objectContaining({
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C'
          })
        })
      );
      expect(mockExecFile).toHaveBeenNthCalledWith(2,
        'git',
        ['update-ref', refName, commitSha],
        expect.any(Object)
      );
    });

    it('should return false when ref already exists', async () => {
      const refName = 'refs/locks/existing-lock';
      const commitSha = 'def456abc789012345678901234567890abcdef';

      // show-ref succeeds (ref exists)
      mockExecFile.mockResolvedValueOnce({
        stdout: `${commitSha} ${refName}\n`
      });

      const result = await git.updateRefCreate(refName, commitSha);

      expect(result).toBe(false);
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['show-ref', '--verify', '--quiet', refName],
        expect.any(Object)
      );
    });

    it('should handle update-ref failure after successful check', async () => {
      const refName = 'refs/locks/failed-lock';
      const commitSha = 'ghi789abc012345678901234567890abcdef456';

      // show-ref fails (ref doesn't exist), but update-ref also fails
      mockExecFile
        .mockRejectedValueOnce(new Error('ref does not exist'))
        .mockRejectedValueOnce(new Error('fatal: Cannot lock ref'));

      await expect(git.updateRefCreate(refName, commitSha))
        .rejects.toThrow('fatal: Cannot lock ref');

      expect(mockExecFile).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid commit SHA in update-ref', async () => {
      const refName = 'refs/locks/invalid-sha-lock';
      const invalidSha = 'invalid-sha';

      mockExecFile
        .mockRejectedValueOnce(new Error('ref does not exist'))
        .mockRejectedValueOnce(new Error('fatal: invalid object name'));

      await expect(git.updateRefCreate(refName, invalidSha))
        .rejects.toThrow('fatal: invalid object name');
    });

    it('should use deterministic environment for ref operations', async () => {
      const refName = 'refs/locks/env-test-lock';
      const commitSha = 'abc123def456789012345678901234567890abcd';

      mockExecFile
        .mockRejectedValueOnce(new Error('ref does not exist'))
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      await git.updateRefCreate(refName, commitSha);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['show-ref', '--verify', '--quiet', refName],
        expect.objectContaining({
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C'
          })
        })
      );
    });
  });

  describe('Atomic Operation Sequences', () => {
    it('should handle add-commit-tag sequence', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

      // Simulate atomic sequence
      await git.add(['src/file1.js', 'src/file2.js']);
      await git.commit('Add new features');
      await git.tag('v1.0.0', 'Release version 1.0.0');

      expect(mockExecFile).toHaveBeenCalledTimes(3);
      expect(mockExecFile).toHaveBeenNthCalledWith(1,
        'git',
        ['add', '--', 'src/file1.js', 'src/file2.js'],
        expect.any(Object)
      );
      expect(mockExecFile).toHaveBeenNthCalledWith(2,
        'git',
        ['commit', '-m', 'Add new features'],
        expect.any(Object)
      );
      expect(mockExecFile).toHaveBeenNthCalledWith(3,
        'git',
        ['tag', '-m', 'Release version 1.0.0', 'v1.0.0'],
        expect.any(Object)
      );
    });

    it('should handle note add-append-show sequence', async () => {
      const noteContent = 'Initial receipt\nAppended details';
      mockExecFile
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // noteAdd
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // noteAppend
        .mockResolvedValueOnce({ stdout: `${noteContent}\n` }); // noteShow

      await git.noteAdd('receipts', 'Initial receipt');
      await git.noteAppend('receipts', 'Appended details');
      const result = await git.noteShow('receipts');

      expect(result).toBe(noteContent);
      expect(mockExecFile).toHaveBeenCalledTimes(3);
    });

    it('should handle ref creation and validation sequence', async () => {
      const refName = 'refs/locks/sequence-test';
      const commitSha = 'abc123def456789012345678901234567890abcd';

      // First creation: success
      mockExecFile
        .mockRejectedValueOnce(new Error('ref does not exist'))
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        // Second attempt: already exists
        .mockResolvedValueOnce({ stdout: `${commitSha} ${refName}\n` });

      const firstResult = await git.updateRefCreate(refName, commitSha);
      const secondResult = await git.updateRefCreate(refName, commitSha);

      expect(firstResult).toBe(true);
      expect(secondResult).toBe(false);
      expect(mockExecFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should maintain state consistency after partial failures', async () => {
      // Simulate add success, commit failure scenario
      mockExecFile
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // add succeeds
        .mockRejectedValueOnce(new Error('nothing to commit')); // commit fails

      await git.add('test.txt');
      await expect(git.commit('Empty commit')).rejects.toThrow('nothing to commit');

      // Environment should remain consistent
      expect(git.env.TZ).toBe('UTC');
      expect(git.env.LANG).toBe('C');
    });

    it('should handle concurrent note operations gracefully', async () => {
      const commitSha = 'abc123def456789012345678901234567890abcd';

      // Simulate concurrent note add failure
      const concurrentError = new Error('error: Cannot add notes. Found existing notes for object');
      mockExecFile.mockRejectedValue(concurrentError);

      await expect(git.noteAdd('receipts', 'Concurrent note', commitSha))
        .rejects.toThrow('error: Cannot add notes. Found existing notes for object');
    });

    it('should handle ref creation race conditions', async () => {
      const refName = 'refs/locks/race-condition';
      const commitSha = 'def456abc789012345678901234567890abcdef';

      // Simulate race condition: ref created between check and update
      mockExecFile
        .mockRejectedValueOnce(new Error('ref does not exist'))
        .mockRejectedValueOnce(new Error('fatal: cannot lock ref: ref exists'));

      await expect(git.updateRefCreate(refName, commitSha))
        .rejects.toThrow('fatal: cannot lock ref: ref exists');
    });
  });
});