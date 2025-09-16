/**
 * useGit() Mock Strategies Tests
 * Tests different mocking approaches and strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useGit() Mock Strategies', () => {
  let mockExecFile;
  let useGitVan;
  let tryUseGitVan;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Strategy 1: Full Mock (Unit Testing)', () => {
    beforeEach(async () => {
      // Mock execFile completely
      mockExecFile = vi.fn();
      vi.doMock('node:child_process', () => ({
        execFile: mockExecFile
      }));

      // Mock context
      useGitVan = vi.fn(() => ({
        cwd: '/mock/repo',
        env: { MOCK_VAR: 'true' }
      }));
      tryUseGitVan = vi.fn(() => null);

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan,
        tryUseGitVan
      }));
    });

    it('should mock all git operations', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      mockExecFile.mockResolvedValue({ stdout: 'mocked-branch\n' });

      const git = useGit();
      const result = await git.branch();

      expect(result).toBe('mocked-branch');
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        {
          cwd: '/mock/repo',
          env: expect.objectContaining({
            TZ: 'UTC',
            LANG: 'C',
            MOCK_VAR: 'true'
          }),
          maxBuffer: 12 * 1024 * 1024
        }
      );
    });

    it('should mock different command responses', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      mockExecFile
        .mockResolvedValueOnce({ stdout: 'main\n' })
        .mockResolvedValueOnce({ stdout: 'abc123def456\n' })
        .mockResolvedValueOnce({ stdout: 'M  file.txt\n' });

      const git = useGit();

      const branch = await git.branch();
      const head = await git.head();
      const status = await git.statusPorcelain();

      expect(branch).toBe('main');
      expect(head).toBe('abc123def456');
      expect(status).toBe('M  file.txt');
    });

    it('should mock error conditions', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      const gitError = new Error('Git command failed');
      gitError.code = 1;
      mockExecFile.mockRejectedValue(gitError);

      const git = useGit();

      await expect(git.branch()).rejects.toThrow('Git command failed');
    });
  });

  describe('Strategy 2: Selective Mock (Integration Testing)', () => {
    let realExecFile;

    beforeEach(async () => {
      // Import real execFile for selective mocking
      const childProcess = await import('node:child_process');
      realExecFile = childProcess.execFile;

      // Create selective mock
      mockExecFile = vi.fn((command, args, options) => {
        // Mock only specific git commands
        if (command === 'git' && args[0] === 'remote') {
          return Promise.resolve({ stdout: 'https://github.com/mock/repo.git\n' });
        }
        if (command === 'git' && args[0] === 'config') {
          return Promise.resolve({ stdout: 'mock-value\n' });
        }
        // Use real execFile for other commands
        return realExecFile(command, args, options);
      });

      vi.doMock('node:child_process', () => ({
        execFile: mockExecFile
      }));

      // Mock only context
      useGitVan = vi.fn(() => ({
        cwd: process.cwd(),
        env: { TEST_MODE: 'selective' }
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan,
        tryUseGitVan: vi.fn(() => null)
      }));
    });

    it('should selectively mock specific commands', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // This should be mocked
      const result = await git.run(['remote', 'get-url', 'origin']);
      expect(result).toBe('https://github.com/mock/repo.git');

      // Other commands would use real git (if in git repo)
      // We can't test real git commands here without a real repo
    });
  });

  describe('Strategy 3: Conditional Mock (Environment-based)', () => {
    beforeEach(async () => {
      // Mock based on environment
      const isTestEnvironment = process.env.NODE_ENV === 'test';

      mockExecFile = vi.fn((command, args, options) => {
        if (isTestEnvironment && command === 'git') {
          // Return mock responses in test environment
          if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref') {
            return Promise.resolve({ stdout: 'test-branch\n' });
          }
          if (args[0] === 'status') {
            return Promise.resolve({ stdout: '' });
          }
        }
        // Fallback to real execution
        throw new Error('Real execution not available in test');
      });

      vi.doMock('node:child_process', () => ({
        execFile: mockExecFile
      }));

      useGitVan = vi.fn(() => ({
        cwd: '/test/conditional',
        env: { NODE_ENV: 'test' }
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan,
        tryUseGitVan: vi.fn(() => null)
      }));
    });

    it('should use environment-based mocking', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();
      const branch = await git.branch();

      expect(branch).toBe('test-branch');
    });
  });

  describe('Strategy 4: Spy Mock (Monitoring Real Calls)', () => {
    beforeEach(async () => {
      // Create spy that monitors but doesn't change behavior
      mockExecFile = vi.fn();

      // Mock to return predictable values for testing
      mockExecFile.mockImplementation((command, args, options) => {
        const argsStr = args.join(' ');

        if (argsStr.includes('rev-parse --abbrev-ref HEAD')) {
          return Promise.resolve({ stdout: 'spy-branch\n' });
        }
        if (argsStr.includes('rev-parse HEAD')) {
          return Promise.resolve({ stdout: 'abc123def456789012345678901234567890abcd\n' });
        }
        if (argsStr.includes('status --porcelain')) {
          return Promise.resolve({ stdout: '' });
        }

        return Promise.resolve({ stdout: 'spy-output\n' });
      });

      vi.doMock('node:child_process', () => ({
        execFile: mockExecFile
      }));

      useGitVan = vi.fn(() => ({
        cwd: '/spy/repo',
        env: {}
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan,
        tryUseGitVan: vi.fn(() => null)
      }));
    });

    it('should monitor git command calls', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      await git.branch();
      await git.head();
      await git.statusPorcelain();

      // Verify all expected calls were made
      expect(mockExecFile).toHaveBeenCalledTimes(3);
      expect(mockExecFile).toHaveBeenNthCalledWith(1,
        'git',
        ['rev-parse', '--abbrev-ref', 'HEAD'],
        expect.any(Object)
      );
      expect(mockExecFile).toHaveBeenNthCalledWith(2,
        'git',
        ['rev-parse', 'HEAD'],
        expect.any(Object)
      );
      expect(mockExecFile).toHaveBeenNthCalledWith(3,
        'git',
        ['status', '--porcelain'],
        expect.any(Object)
      );
    });

    it('should capture command arguments for analysis', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      await git.log('%h %s', ['--max-count=5', '--author=test']);

      const lastCall = mockExecFile.mock.calls[mockExecFile.mock.calls.length - 1];
      expect(lastCall[0]).toBe('git');
      expect(lastCall[1]).toEqual(['log', '--pretty=%h %s', '--max-count=5', '--author=test']);
    });
  });

  describe('Strategy 5: Behavior Mock (State Simulation)', () => {
    let gitState;

    beforeEach(async () => {
      // Simulate git repository state
      gitState = {
        branch: 'main',
        head: 'abc123def456789012345678901234567890abcd',
        status: new Map(),
        commits: [
          { sha: 'abc123def456789012345678901234567890abcd', message: 'Latest commit' },
          { sha: 'def456abc789012345678901234567890abcdef12', message: 'Previous commit' }
        ],
        refs: new Map(),
        notes: new Map()
      };

      mockExecFile = vi.fn((command, args, options) => {
        if (command !== 'git') {
          return Promise.reject(new Error('Not a git command'));
        }

        const [subcommand, ...subargs] = args;

        switch (subcommand) {
          case 'rev-parse':
            if (subargs.includes('--abbrev-ref') && subargs.includes('HEAD')) {
              return Promise.resolve({ stdout: `${gitState.branch}\n` });
            }
            if (subargs.includes('HEAD')) {
              return Promise.resolve({ stdout: `${gitState.head}\n` });
            }
            break;

          case 'status':
            if (subargs.includes('--porcelain')) {
              const statusOutput = Array.from(gitState.status.entries())
                .map(([file, status]) => `${status}  ${file}`)
                .join('\n');
              return Promise.resolve({ stdout: `${statusOutput}\n` });
            }
            break;

          case 'log':
            const format = subargs.find(arg => arg.startsWith('--pretty='))?.replace('--pretty=', '') || '%h %s';
            const maxCount = parseInt(subargs.find(arg => arg.startsWith('--max-count='))?.replace('--max-count=', '') || '10');

            const logOutput = gitState.commits
              .slice(0, maxCount)
              .map(commit => {
                if (format === '%h %s') {
                  return `${commit.sha.substring(0, 7)} ${commit.message}`;
                }
                return commit.sha;
              })
              .join('\n');
            return Promise.resolve({ stdout: `${logOutput}\n` });

          case 'add':
            const filesToAdd = subargs.filter(arg => arg !== '--');
            filesToAdd.forEach(file => {
              gitState.status.set(file, 'A ');
            });
            return Promise.resolve({ stdout: '' });

          case 'commit':
            if (subargs.includes('-m')) {
              const messageIndex = subargs.indexOf('-m') + 1;
              const message = subargs[messageIndex];
              const newSha = Math.random().toString(36).substring(2).padEnd(40, '0');
              gitState.commits.unshift({ sha: newSha, message });
              gitState.head = newSha;
              gitState.status.clear();
              return Promise.resolve({ stdout: '' });
            }
            break;

          case 'update-ref':
            const [ref, sha] = subargs;
            if (gitState.refs.has(ref)) {
              return Promise.reject(new Error('Ref already exists'));
            }
            gitState.refs.set(ref, sha);
            return Promise.resolve({ stdout: '' });

          case 'show-ref':
            if (subargs.includes('--verify')) {
              const ref = subargs[subargs.length - 1];
              if (gitState.refs.has(ref)) {
                const sha = gitState.refs.get(ref);
                return Promise.resolve({ stdout: `${sha} ${ref}\n` });
              }
              return Promise.reject(new Error('Ref does not exist'));
            }
            break;

          case 'notes':
            const noteRef = subargs.find(arg => arg.startsWith('--ref='))?.replace('--ref=', '');
            const noteAction = subargs.find(arg => !arg.startsWith('--') && arg !== 'notes');

            if (noteAction === 'add' && subargs.includes('-m')) {
              const messageIndex = subargs.indexOf('-m') + 1;
              const message = subargs[messageIndex];
              const targetSha = subargs[subargs.length - 1];
              gitState.notes.set(`${noteRef}:${targetSha}`, message);
              return Promise.resolve({ stdout: '' });
            }

            if (noteAction === 'show') {
              const targetSha = subargs[subargs.length - 1];
              const noteContent = gitState.notes.get(`${noteRef}:${targetSha}`);
              if (noteContent) {
                return Promise.resolve({ stdout: `${noteContent}\n` });
              }
              return Promise.reject(new Error('No note found'));
            }
            break;
        }

        return Promise.reject(new Error(`Unhandled git command: ${args.join(' ')}`));
      });

      vi.doMock('node:child_process', () => ({
        execFile: mockExecFile
      }));

      useGitVan = vi.fn(() => ({
        cwd: '/behavior/repo',
        env: {}
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan,
        tryUseGitVan: vi.fn(() => null)
      }));
    });

    it('should simulate complete git workflow', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // Check initial state
      const initialBranch = await git.branch();
      expect(initialBranch).toBe('main');

      const initialStatus = await git.statusPorcelain();
      expect(initialStatus).toBe('');

      // Add files
      await git.add(['file1.txt', 'file2.txt']);

      // Check status after add
      const statusAfterAdd = await git.statusPorcelain();
      expect(statusAfterAdd).toContain('A   file1.txt');
      expect(statusAfterAdd).toContain('A   file2.txt');

      // Commit changes
      await git.commit('Add test files');

      // Check status after commit
      const statusAfterCommit = await git.statusPorcelain();
      expect(statusAfterCommit).toBe('');

      // Check log
      const log = await git.log();
      expect(log).toContain('Add test files');

      // Test atomic ref creation
      const head = await git.head();
      const refCreated = await git.updateRefCreate('refs/test/lock', head);
      expect(refCreated).toBe(true);

      const refCreatedAgain = await git.updateRefCreate('refs/test/lock', head);
      expect(refCreatedAgain).toBe(false);

      // Test notes
      await git.noteAdd('test-notes', 'Test note content');
      const noteContent = await git.noteShow('test-notes');
      expect(noteContent).toBe('Test note content');
    });
  });

  describe('Strategy 6: Error Injection Mock', () => {
    beforeEach(async () => {
      let callCount = 0;

      mockExecFile = vi.fn((command, args, options) => {
        callCount++;

        // Inject different types of errors
        if (callCount === 1) {
          const error = new Error('Permission denied');
          error.code = 'EACCES';
          return Promise.reject(error);
        }

        if (callCount === 2) {
          const error = new Error('Timeout');
          error.code = 'TIMEOUT';
          return Promise.reject(error);
        }

        if (callCount === 3) {
          const error = new Error('Git command failed');
          error.code = 1;
          error.stderr = 'fatal: not a git repository';
          return Promise.reject(error);
        }

        // Success after errors
        return Promise.resolve({ stdout: 'success\n' });
      });

      vi.doMock('node:child_process', () => ({
        execFile: mockExecFile
      }));

      useGitVan = vi.fn(() => ({
        cwd: '/error/repo',
        env: {}
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan,
        tryUseGitVan: vi.fn(() => null)
      }));
    });

    it('should handle various error types', async () => {
      const { useGit } = await import('../src/composables/git.mjs');

      const git = useGit();

      // Test permission error
      await expect(git.branch()).rejects.toThrow('Permission denied');

      // Test timeout error
      await expect(git.head()).rejects.toThrow('Timeout');

      // Test git command error
      await expect(git.statusPorcelain()).rejects.toThrow('Git command failed');

      // Test success after errors
      const result = await git.repoRoot();
      expect(result).toBe('success');
    });
  });

  describe('Mock Verification and Cleanup', () => {
    it('should properly reset mocks between tests', () => {
      expect(vi.isMockFunction(mockExecFile)).toBe(true);
      expect(mockExecFile.mock.calls).toHaveLength(0);
    });

    it('should verify mock call arguments', async () => {
      mockExecFile = vi.fn().mockResolvedValue({ stdout: 'test\n' });

      vi.doMock('node:child_process', () => ({
        execFile: mockExecFile
      }));

      vi.doMock('../src/core/context.mjs', () => ({
        useGitVan: vi.fn(() => ({ cwd: '/test', env: {} })),
        tryUseGitVan: vi.fn(() => null)
      }));

      const { useGit } = await import('../src/composables/git.mjs');
      const git = useGit();

      await git.log('%h %s', '--max-count=3');

      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['log', '--pretty=%h %s', '--max-count=3'],
        expect.objectContaining({
          cwd: '/test',
          env: expect.objectContaining({ TZ: 'UTC', LANG: 'C' }),
          maxBuffer: 12 * 1024 * 1024
        })
      );
    });
  });
});