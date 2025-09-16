/**
 * useGit() Unit Tests - Complete Coverage
 * Tests all git operations with full mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promisify } from 'node:util';

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
      NODE_ENV: 'test'
    }
  };

  return {
    useGitVan: vi.fn(() => mockContext),
    tryUseGitVan: vi.fn(() => mockContext),
    withGitVan: vi.fn((context, fn) => fn()),
    bindContext: vi.fn(() => mockContext) // This was missing!
  };
});

// Import useGit - this will be dynamically imported in each test
let useGit;

describe('useGit() Unit Tests', () => {
  let git;
  let mockContext;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Setup context mock
    mockContext = {
      cwd: '/test/repo',
      env: { CUSTOM_VAR: 'test' }
    };

    // Mock context module
    vi.doMock('../src/core/context.mjs', () => ({
      useGitVan: vi.fn(() => mockContext),
      tryUseGitVan: vi.fn(() => mockContext),
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
      stdout: 'mocked-output\n',
      stderr: ''
    });

    // Import useGit after mocks are setup
    const gitModule = await import('../src/composables/git.mjs');
    useGit = gitModule.useGit;
    git = useGit();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Context Binding', () => {
    it('should bind context with correct cwd and env', () => {
      expect(git.cwd).toBe('/test/repo');
      expect(git.env).toEqual({
        TZ: 'UTC',
        LANG: 'C',
        ...process.env,
        CUSTOM_VAR: 'test'
      });
    });

    it('should fallback to process.cwd() when no context', async () => {
      vi.resetModules();

      // Mock context to throw error and return null
      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: vi.fn(() => { throw new Error('No context'); }),
        tryUseGitVan: vi.fn(() => null),
        bindContext: vi.fn(() => {
          const cwd = process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
          };
          return { ctx: null, cwd, env };
        })
      }));

      const gitModule = await import('../src/composables/git.mjs');
      const gitNoContext = gitModule.useGit();
      expect(gitNoContext.cwd).toBe(process.cwd());
    });

    it('should handle context without cwd or env', async () => {
      vi.resetModules();

      // Mock empty context
      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: vi.fn(() => ({})),
        tryUseGitVan: vi.fn(() => null),
        bindContext: vi.fn(() => {
          const cwd = process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
          };
          return { ctx: {}, cwd, env };
        })
      }));

      const gitModule = await import('../src/composables/git.mjs');
      const gitEmptyContext = gitModule.useGit();
      expect(gitEmptyContext.cwd).toBe(process.cwd());
      expect(gitEmptyContext.env).toEqual({
        TZ: 'UTC',
        LANG: 'C',
        ...process.env
      });
    });
  });

  describe('Repository Info Operations', () => {
    describe('branch()', () => {
      it('should get current branch', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'main\n' });

        const result = await git.branch();

        expect(result).toBe('main');
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['rev-parse', '--abbrev-ref', 'HEAD'],
          {
            cwd: '/test/repo',
            env: expect.objectContaining({ TZ: 'UTC', LANG: 'C' }),
            maxBuffer: 12 * 1024 * 1024
          }
        );
      });

      it('should handle detached HEAD', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'HEAD\n' });

        const result = await git.branch();
        expect(result).toBe('HEAD');
      });
    });

    describe('head()', () => {
      it('should get HEAD commit SHA', async () => {
        const mockSha = 'abc123def456789012345678901234567890abcd';
        mockExecFile.mockResolvedValue({ stdout: `${mockSha}\n` });

        const result = await git.head();

        expect(result).toBe(mockSha);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['rev-parse', 'HEAD'],
          expect.any(Object)
        );
      });
    });

    describe('repoRoot()', () => {
      it('should get repository root path', async () => {
        mockExecFile.mockResolvedValue({ stdout: '/path/to/repo\n' });

        const result = await git.repoRoot();

        expect(result).toBe('/path/to/repo');
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['rev-parse', '--show-toplevel'],
          expect.any(Object)
        );
      });
    });

    describe('worktreeGitDir()', () => {
      it('should get git directory path', async () => {
        mockExecFile.mockResolvedValue({ stdout: '.git\n' });

        const result = await git.worktreeGitDir();

        expect(result).toBe('.git');
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['rev-parse', '--git-dir'],
          expect.any(Object)
        );
      });

      it('should handle worktree git directory', async () => {
        mockExecFile.mockResolvedValue({ stdout: '/path/to/main/.git/worktrees/feature\n' });

        const result = await git.worktreeGitDir();
        expect(result).toBe('/path/to/main/.git/worktrees/feature');
      });
    });

    describe('nowISO()', () => {
      it('should return current ISO timestamp', () => {
        const result = git.nowISO();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it('should return forced timestamp when GITVAN_NOW is set', () => {
        const forcedTime = '2023-01-01T00:00:00.000Z';
        const originalEnv = process.env.GITVAN_NOW;
        process.env.GITVAN_NOW = forcedTime;

        const result = git.nowISO();
        expect(result).toBe(forcedTime);

        // Restore original environment
        if (originalEnv !== undefined) {
          process.env.GITVAN_NOW = originalEnv;
        } else {
          delete process.env.GITVAN_NOW;
        }
      });
    });
  });

  describe('Read Operations', () => {
    describe('log()', () => {
      it('should get commit log with default format', async () => {
        const mockLog = 'abc123\tInitial commit\ndef456\tSecond commit';
        mockExecFile.mockResolvedValue({ stdout: `${mockLog}\n` });

        const result = await git.log();

        expect(result).toBe(mockLog);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['log', '--pretty=%h%x09%s'],
          expect.any(Object)
        );
      });

      it('should accept custom format', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'custom-format-output\n' });

        const result = await git.log('%H %an %s');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['log', '--pretty=%H %an %s'],
          expect.any(Object)
        );
      });

      it('should handle extra arguments as string', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'filtered-log\n' });

        await git.log('%h %s', '--max-count=5 --author=John');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['log', '--pretty=%h %s', '--max-count=5', '--author=John'],
          expect.any(Object)
        );
      });

      it('should handle extra arguments as array', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'filtered-log\n' });

        await git.log('%h %s', ['--max-count=5', '--author=John']);

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['log', '--pretty=%h %s', '--max-count=5', '--author=John'],
          expect.any(Object)
        );
      });

      it('should filter out empty extra arguments', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'log\n' });

        await git.log('%h %s', '--max-count=5  --author=John ');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['log', '--pretty=%h %s', '--max-count=5', '--author=John'],
          expect.any(Object)
        );
      });
    });

    describe('statusPorcelain()', () => {
      it('should get porcelain status', async () => {
        const mockStatus = 'M  file1.txt\n?? file2.txt';
        mockExecFile.mockResolvedValue({ stdout: `${mockStatus}\n` });

        const result = await git.statusPorcelain();

        expect(result).toBe(mockStatus);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['status', '--porcelain'],
          expect.any(Object)
        );
      });

      it('should handle clean working directory', async () => {
        mockExecFile.mockResolvedValue({ stdout: '\n' });

        const result = await git.statusPorcelain();
        expect(result).toBe('');
      });
    });

    describe('isAncestor()', () => {
      it('should return true when a is ancestor of b', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        const result = await git.isAncestor('abc123', 'def456');

        expect(result).toBe(true);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['merge-base', '--is-ancestor', 'abc123', 'def456'],
          expect.any(Object)
        );
      });

      it('should return false when a is not ancestor of b', async () => {
        mockExecFile.mockRejectedValue(new Error('Not an ancestor'));

        const result = await git.isAncestor('abc123', 'def456');
        expect(result).toBe(false);
      });

      it('should use HEAD as default second argument', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.isAncestor('abc123');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['merge-base', '--is-ancestor', 'abc123', 'HEAD'],
          expect.any(Object)
        );
      });
    });

    describe('mergeBase()', () => {
      it('should get merge base between two commits', async () => {
        const mergeBaseSha = 'xyz789abc012def345678901234567890abcdef';
        mockExecFile.mockResolvedValue({ stdout: `${mergeBaseSha}\n` });

        const result = await git.mergeBase('abc123', 'def456');

        expect(result).toBe(mergeBaseSha);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['merge-base', 'abc123', 'def456'],
          expect.any(Object)
        );
      });
    });

    describe('revList()', () => {
      it('should get revision list with default arguments', async () => {
        const mockRevs = 'abc123\ndef456\nghi789';
        mockExecFile.mockResolvedValue({ stdout: `${mockRevs}\n` });

        const result = await git.revList();

        expect(result).toBe(mockRevs);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['rev-list', '--max-count=50', 'HEAD'],
          expect.any(Object)
        );
      });

      it('should accept custom arguments as array', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'custom-revs\n' });

        await git.revList(['--max-count=10', 'main..feature']);

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['rev-list', '--max-count=10', 'main..feature'],
          expect.any(Object)
        );
      });

      it('should convert string arguments to array', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'string-revs\n' });

        await git.revList('--oneline --max-count=5');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['rev-list', '--oneline --max-count=5'],
          expect.any(Object)
        );
      });
    });
  });

  describe('Write Operations', () => {
    describe('add()', () => {
      it('should add single file', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.add('file.txt');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['add', '--', 'file.txt'],
          expect.any(Object)
        );
      });

      it('should add multiple files', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.add(['file1.txt', 'file2.txt', 'file3.txt']);

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['add', '--', 'file1.txt', 'file2.txt', 'file3.txt'],
          expect.any(Object)
        );
      });

      it('should filter out empty paths', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.add(['file1.txt', '', null, 'file2.txt', undefined]);

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['add', '--', 'file1.txt', 'file2.txt'],
          expect.any(Object)
        );
      });

      it('should do nothing when no valid paths provided', async () => {
        await git.add([]);
        await git.add(['', null, undefined]);
        await git.add('');
        await git.add(null);

        expect(mockExecFile).not.toHaveBeenCalled();
      });
    });

    describe('commit()', () => {
      it('should create simple commit', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.commit('Test commit message');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['commit', '-m', 'Test commit message'],
          expect.any(Object)
        );
      });

      it('should create signed commit', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.commit('Signed commit', { sign: true });

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['commit', '-m', 'Signed commit', '-S'],
          expect.any(Object)
        );
      });

      it('should handle commit with default options', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.commit('Default options commit', {});

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['commit', '-m', 'Default options commit'],
          expect.any(Object)
        );
      });

      it('should handle multiline commit messages', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        const multilineMessage = 'First line\n\nSecond paragraph\n- Bullet point';
        await git.commit(multilineMessage);

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['commit', '-m', multilineMessage],
          expect.any(Object)
        );
      });
    });

    describe('tag()', () => {
      it('should create lightweight tag', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.tag('v1.0.0');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['tag', 'v1.0.0'],
          expect.any(Object)
        );
      });

      it('should create annotated tag', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.tag('v1.1.0', 'Release version 1.1.0');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['tag', '-m', 'Release version 1.1.0', 'v1.1.0'],
          expect.any(Object)
        );
      });

      it('should create signed tag', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.tag('v1.2.0', 'Signed release', { sign: true });

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['tag', '-s', '-m', 'Signed release', 'v1.2.0'],
          expect.any(Object)
        );
      });

      it('should create signed lightweight tag', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.tag('v1.3.0', null, { sign: true });

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['tag', '-s', 'v1.3.0'],
          expect.any(Object)
        );
      });

      it('should handle empty message', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.tag('v1.4.0', '');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['tag', 'v1.4.0'],
          expect.any(Object)
        );
      });
    });
  });

  describe('Notes Operations (Receipts)', () => {
    describe('noteAdd()', () => {
      it('should add note to HEAD by default', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.noteAdd('receipts', 'Note message');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['notes', '--ref=receipts', 'add', '-m', 'Note message', 'HEAD'],
          expect.any(Object)
        );
      });

      it('should add note to specific commit', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.noteAdd('receipts', 'Note for commit', 'abc123');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['notes', '--ref=receipts', 'add', '-m', 'Note for commit', 'abc123'],
          expect.any(Object)
        );
      });

      it('should handle multiline note messages', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        const multilineNote = 'Line 1\nLine 2\nLine 3';
        await git.noteAdd('receipts', multilineNote);

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['notes', '--ref=receipts', 'add', '-m', multilineNote, 'HEAD'],
          expect.any(Object)
        );
      });
    });

    describe('noteAppend()', () => {
      it('should append note to HEAD by default', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.noteAppend('receipts', 'Additional note');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['notes', '--ref=receipts', 'append', '-m', 'Additional note', 'HEAD'],
          expect.any(Object)
        );
      });

      it('should append note to specific commit', async () => {
        mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });

        await git.noteAppend('receipts', 'Appended note', 'def456');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['notes', '--ref=receipts', 'append', '-m', 'Appended note', 'def456'],
          expect.any(Object)
        );
      });
    });

    describe('noteShow()', () => {
      it('should show note for HEAD by default', async () => {
        const noteContent = 'Note content for commit';
        mockExecFile.mockResolvedValue({ stdout: `${noteContent}\n` });

        const result = await git.noteShow('receipts');

        expect(result).toBe(noteContent);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['notes', '--ref=receipts', 'show', 'HEAD'],
          expect.any(Object)
        );
      });

      it('should show note for specific commit', async () => {
        const noteContent = 'Specific commit note';
        mockExecFile.mockResolvedValue({ stdout: `${noteContent}\n` });

        const result = await git.noteShow('receipts', 'ghi789');

        expect(result).toBe(noteContent);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['notes', '--ref=receipts', 'show', 'ghi789'],
          expect.any(Object)
        );
      });

      it('should handle multiline note content', async () => {
        const multilineNote = 'Line 1\nLine 2\nLine 3';
        mockExecFile.mockResolvedValue({ stdout: `${multilineNote}\n` });

        const result = await git.noteShow('receipts');
        expect(result).toBe(multilineNote);
      });
    });
  });

  describe('Atomic Operations (Locks)', () => {
    describe('updateRefCreate()', () => {
      it('should create new ref when it does not exist', async () => {
        // First call (show-ref) fails - ref doesn't exist
        // Second call (update-ref) succeeds - ref created
        mockExecFile
          .mockRejectedValueOnce(new Error('Ref does not exist'))
          .mockResolvedValueOnce({ stdout: '', stderr: '' });

        const result = await git.updateRefCreate('refs/locks/test-lock', 'abc123');

        expect(result).toBe(true);
        expect(mockExecFile).toHaveBeenCalledTimes(2);
        expect(mockExecFile).toHaveBeenNthCalledWith(1,
          'git',
          ['show-ref', '--verify', '--quiet', 'refs/locks/test-lock'],
          expect.any(Object)
        );
        expect(mockExecFile).toHaveBeenNthCalledWith(2,
          'git',
          ['update-ref', 'refs/locks/test-lock', 'abc123'],
          expect.any(Object)
        );
      });

      it('should return false when ref already exists', async () => {
        // show-ref succeeds - ref exists
        mockExecFile.mockResolvedValueOnce({ stdout: 'abc123 refs/locks/test-lock\n' });

        const result = await git.updateRefCreate('refs/locks/existing-lock', 'def456');

        expect(result).toBe(false);
        expect(mockExecFile).toHaveBeenCalledTimes(1);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['show-ref', '--verify', '--quiet', 'refs/locks/existing-lock'],
          expect.any(Object)
        );
      });

      it('should handle update-ref failure after successful check', async () => {
        // show-ref fails (ref doesn't exist), but update-ref also fails
        mockExecFile
          .mockRejectedValueOnce(new Error('Ref does not exist'))
          .mockRejectedValueOnce(new Error('Update failed'));

        await expect(git.updateRefCreate('refs/locks/failed-lock', 'ghi789'))
          .rejects.toThrow('Update failed');

        expect(mockExecFile).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Plumbing Operations', () => {
    describe('hashObject()', () => {
      it('should hash object without writing', async () => {
        const mockHash = 'abc123def456789012345678901234567890abcd';
        mockExecFile.mockResolvedValue({ stdout: `${mockHash}\n` });

        const result = await git.hashObject('file.txt');

        expect(result).toBe(mockHash);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['hash-object', '--', '/test/repo/file.txt'],
          expect.any(Object)
        );
      });

      it('should hash object with writing', async () => {
        const mockHash = 'def456abc789012345678901234567890abcdef';
        mockExecFile.mockResolvedValue({ stdout: `${mockHash}\n` });

        const result = await git.hashObject('file.txt', { write: true });

        expect(result).toBe(mockHash);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['hash-object', '-w', '--', '/test/repo/file.txt'],
          expect.any(Object)
        );
      });

      it('should handle absolute path', async () => {
        const mockHash = 'ghi789def012345678901234567890abcdef123';
        mockExecFile.mockResolvedValue({ stdout: `${mockHash}\n` });

        const result = await git.hashObject('/absolute/path/file.txt');

        expect(result).toBe(mockHash);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['hash-object', '--', '/absolute/path/file.txt'],
          expect.any(Object)
        );
      });
    });

    describe('writeTree()', () => {
      it('should write tree object', async () => {
        const mockTreeHash = 'tree123def456789012345678901234567890abc';
        mockExecFile.mockResolvedValue({ stdout: `${mockTreeHash}\n` });

        const result = await git.writeTree();

        expect(result).toBe(mockTreeHash);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['write-tree'],
          expect.any(Object)
        );
      });
    });

    describe('catFilePretty()', () => {
      it('should display object content', async () => {
        const mockContent = 'commit 123\ntree abc\nauthor John Doe\n\nCommit message';
        mockExecFile.mockResolvedValue({ stdout: `${mockContent}\n` });

        const result = await git.catFilePretty('abc123');

        expect(result).toBe(mockContent);
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['cat-file', '-p', 'abc123'],
          expect.any(Object)
        );
      });

      it('should handle blob objects', async () => {
        const blobContent = 'This is file content\nWith multiple lines';
        mockExecFile.mockResolvedValue({ stdout: `${blobContent}\n` });

        const result = await git.catFilePretty('blob456');
        expect(result).toBe(blobContent);
      });

      it('should handle tree objects', async () => {
        const treeContent = '100644 blob abc123\tfile.txt\n040000 tree def456\tsubdir';
        mockExecFile.mockResolvedValue({ stdout: `${treeContent}\n` });

        const result = await git.catFilePretty('tree789');
        expect(result).toBe(treeContent);
      });
    });
  });

  describe('Generic Runners', () => {
    describe('run()', () => {
      it('should run git command and return output', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'command output\n' });

        const result = await git.run(['custom', 'command', '--option']);

        expect(result).toBe('command output');
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['custom', 'command', '--option'],
          expect.any(Object)
        );
      });

      it('should convert string argument to array', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'string output\n' });

        const result = await git.run('status --short');

        expect(result).toBe('string output');
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['status --short'],
          expect.any(Object)
        );
      });
    });

    describe('runVoid()', () => {
      it('should run git command without returning output', async () => {
        mockExecFile.mockResolvedValue({ stdout: 'output\n' });

        const result = await git.runVoid(['add', 'file.txt']);

        expect(result).toBeUndefined();
        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['add', 'file.txt'],
          expect.any(Object)
        );
      });

      it('should convert string argument to array', async () => {
        mockExecFile.mockResolvedValue({ stdout: '' });

        await git.runVoid('commit -m "test"');

        expect(mockExecFile).toHaveBeenCalledWith(
          'git',
          ['commit -m "test"'],
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate git command errors', async () => {
      const gitError = new Error('Git command failed');
      gitError.code = 1;
      gitError.stderr = 'error: pathspec \'nonexistent.txt\' did not match any files';
      mockExecFile.mockRejectedValue(gitError);

      await expect(git.add('nonexistent.txt')).rejects.toThrow('Git command failed');
      expect(mockExecFile).toHaveBeenCalled();
    });

    it('should handle exec timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'TIMEOUT';
      mockExecFile.mockRejectedValue(timeoutError);

      await expect(git.log()).rejects.toThrow('Timeout');
    });

    it('should handle permission errors', async () => {
      const permError = new Error('Permission denied');
      permError.code = 'EACCES';
      mockExecFile.mockRejectedValue(permError);

      await expect(git.commit('test')).rejects.toThrow('Permission denied');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty git output', async () => {
      mockExecFile.mockResolvedValue({ stdout: '\n' });

      const result = await git.statusPorcelain();
      expect(result).toBe('');
    });

    it('should handle git output with only whitespace', async () => {
      mockExecFile.mockResolvedValue({ stdout: '   \n  \n  ' });

      const result = await git.branch();
      expect(result).toBe('');
    });

    it('should handle very long git output', async () => {
      const longOutput = 'a'.repeat(1000000); // 1MB of output
      mockExecFile.mockResolvedValue({ stdout: `${longOutput}\n` });

      const result = await git.log();
      expect(result).toBe(longOutput);
    });

    it('should handle special characters in commit messages', async () => {
      const specialMessage = 'Commit with 特殊字符 and émojis 🎉 and "quotes"';
      mockExecFile.mockResolvedValue({ stdout: '' });

      await git.commit(specialMessage);

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', specialMessage],
        expect.any(Object)
      );
    });

    it('should handle null and undefined gracefully', async () => {
      // These should not call execFile
      await git.add(null);
      await git.add(undefined);
      await git.add([null, undefined, '']);

      expect(mockExecFile).not.toHaveBeenCalled();
    });
  });

  describe('Argument Processing', () => {
    it('should handle toArr utility with various inputs', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'output\n' });

      // Test string conversion
      await git.run('single-command');
      expect(mockExecFile).toHaveBeenLastCalledWith(
        'git',
        ['single-command'],
        expect.any(Object)
      );

      // Test array passthrough
      await git.run(['array', 'command']);
      expect(mockExecFile).toHaveBeenLastCalledWith(
        'git',
        ['array', 'command'],
        expect.any(Object)
      );
    });

    it('should handle empty and whitespace-only arguments', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'output\n' });

      await git.log('%h %s', '   --max-count=5   --author=John   ');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['log', '--pretty=%h %s', '--max-count=5', '--author=John'],
        expect.any(Object)
      );
    });
  });

  describe('maxBuffer Option', () => {
    it('should use default maxBuffer', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'output\n' });

      await git.branch();

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        expect.objectContaining({
          maxBuffer: 12 * 1024 * 1024 // 12MB
        })
      );
    });
  });
});