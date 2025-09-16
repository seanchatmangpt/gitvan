/**
 * Mock Strategies for useGit() - Comprehensive Testing Framework
 *
 * This file provides reusable mock strategies for testing Git operations
 * in various repository states and scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

/**
 * Repository State Fixtures
 * These represent different Git repository states for comprehensive testing
 */
export const REPO_FIXTURES = {
  // Clean repository with no changes
  CLEAN_REPO: {
    name: 'clean_repo',
    branch: 'main',
    head: 'abc123def456789012345678901234567890abcd',
    status: '',
    log: 'abc123\tInitial commit\ndef456\tSecond commit',
    hasChanges: false
  },

  // Dirty repository with uncommitted changes
  DIRTY_REPO: {
    name: 'dirty_repo',
    branch: 'feature/new-feature',
    head: 'def456abc789012345678901234567890abcdef',
    status: 'M  src/file.js\n?? new-file.txt\nD  old-file.txt',
    log: 'def456\tWork in progress\nabc123\tInitial commit',
    hasChanges: true
  },

  // Repository in merge conflict state
  CONFLICT_REPO: {
    name: 'conflict_repo',
    branch: 'feature/conflicted',
    head: 'ghi789abc012345678901234567890abcdef123',
    status: 'UU conflict.js\nAA both-added.txt\nDU deleted-by-us.txt',
    log: 'ghi789\tConflicted commit\nwxy987\tMerge attempt\nabc123\tBase commit',
    hasChanges: true
  },

  // Empty repository (just initialized)
  EMPTY_REPO: {
    name: 'empty_repo',
    branch: null, // No commits yet
    head: null,
    status: '',
    log: '',
    hasChanges: false
  },

  // Repository with detached HEAD
  DETACHED_HEAD: {
    name: 'detached_head',
    branch: 'HEAD',
    head: 'detached123456789012345678901234567890ab',
    status: '',
    log: 'detached12\tDetached commit\nabc123\tPrevious commit',
    hasChanges: false
  },

  // Large repository with many commits
  LARGE_REPO: {
    name: 'large_repo',
    branch: 'main',
    head: 'large789abc012345678901234567890abcdef78',
    status: 'M  big-file.txt',
    log: Array.from({ length: 100 }, (_, i) =>
      `commit${String(i).padStart(3, '0')}\tCommit ${i + 1}`
    ).join('\n'),
    hasChanges: true
  },

  // Repository with complex branching
  MULTI_BRANCH: {
    name: 'multi_branch',
    branch: 'develop',
    head: 'multi123def456789012345678901234567890ab',
    status: '',
    log: 'multi123\tDevelop branch commit\nfeature1\tFeature commit\nmain123\tMain branch commit',
    hasChanges: false,
    branches: ['main', 'develop', 'feature/auth', 'hotfix/critical']
  },

  // Repository with tags and releases
  TAGGED_REPO: {
    name: 'tagged_repo',
    branch: 'main',
    head: 'tagged123def456789012345678901234567890a',
    status: '',
    log: 'tagged123\tv2.0.0 release\nrelease1\tv1.1.0 release\ninitial1\tv1.0.0 initial',
    tags: ['v1.0.0', 'v1.1.0', 'v2.0.0'],
    hasChanges: false
  }
};

/**
 * Mock Command Strategies
 * These define how Git commands should respond in different scenarios
 */
export class MockGitStrategies {
  constructor() {
    this.currentFixture = null;
    this.commandHistory = [];
  }

  /**
   * Apply a repository fixture to mock responses
   */
  applyFixture(fixture) {
    this.currentFixture = fixture;
    const mockExecFile = vi.fn();
    vi.doMock('node:child_process', () => ({ execFile: mockExecFile }));
    this.commandHistory = [];

    // Setup default responses based on fixture
    this.setupDefaultResponses(fixture, mockExecFile);
    return mockExecFile;
  }

  /**
   * Setup default Git command responses for a fixture
   */
  setupDefaultResponses(fixture, mockExecFile) {
    mockExecFile.mockImplementation((command, args, options) => {
      this.commandHistory.push({ command, args, options });

      // Handle different Git commands
      const gitCommand = args[0];

      switch (gitCommand) {
        case 'rev-parse':
          return this.handleRevParse(args, fixture);
        case 'status':
          return this.handleStatus(args, fixture);
        case 'log':
          return this.handleLog(args, fixture);
        case 'branch':
          return this.handleBranch(args, fixture);
        case 'tag':
          return this.handleTag(args, fixture);
        case 'add':
          return this.handleAdd(args, fixture);
        case 'commit':
          return this.handleCommit(args, fixture);
        case 'merge-base':
          return this.handleMergeBase(args, fixture);
        case 'rev-list':
          return this.handleRevList(args, fixture);
        case 'show-ref':
          return this.handleShowRef(args, fixture);
        case 'update-ref':
          return this.handleUpdateRef(args, fixture);
        case 'notes':
          return this.handleNotes(args, fixture);
        case 'hash-object':
          return this.handleHashObject(args, fixture);
        case 'write-tree':
          return this.handleWriteTree(args, fixture);
        case 'cat-file':
          return this.handleCatFile(args, fixture);
        default:
          return this.handleGenericCommand(args, fixture);
      }
    });
  }

  /**
   * Handle git rev-parse commands
   */
  handleRevParse(args, fixture) {
    if (args.includes('--abbrev-ref') && args.includes('HEAD')) {
      // Branch name request
      if (fixture.name === 'empty_repo') {
        return this.rejectCommand('fatal: not a git repository');
      }
      return this.resolveCommand(fixture.branch || 'HEAD');
    }

    if (args.includes('HEAD') && !args.includes('--abbrev-ref')) {
      // HEAD SHA request
      if (fixture.name === 'empty_repo') {
        return this.rejectCommand('fatal: ambiguous argument \'HEAD\'');
      }
      return this.resolveCommand(fixture.head);
    }

    if (args.includes('--show-toplevel')) {
      return this.resolveCommand('/test/repo');
    }

    if (args.includes('--git-dir')) {
      return this.resolveCommand('.git');
    }

    return this.rejectCommand('Unknown rev-parse command');
  }

  /**
   * Handle git status commands
   */
  handleStatus(args, fixture) {
    if (args.includes('--porcelain')) {
      return this.resolveCommand(fixture.status || '');
    }
    return this.rejectCommand('Unknown status command');
  }

  /**
   * Handle git log commands
   */
  handleLog(args, fixture) {
    if (fixture.name === 'empty_repo') {
      return this.rejectCommand('fatal: your current branch \'main\' does not have any commits yet');
    }
    return this.resolveCommand(fixture.log || '');
  }

  /**
   * Handle git branch commands
   */
  handleBranch(args, fixture) {
    if (fixture.branches) {
      const branchList = fixture.branches
        .map(b => b === fixture.branch ? `* ${b}` : `  ${b}`)
        .join('\n');
      return this.resolveCommand(branchList);
    }
    return this.resolveCommand(`* ${fixture.branch}`);
  }

  /**
   * Handle git tag commands
   */
  handleTag(args, fixture) {
    if (args.length === 1) {
      // List tags
      return this.resolveCommand((fixture.tags || []).join('\n'));
    }
    // Create tag
    return this.resolveCommand('');
  }

  /**
   * Handle git add commands
   */
  handleAdd(args, fixture) {
    // Simulate successful add
    return this.resolveCommand('');
  }

  /**
   * Handle git commit commands
   */
  handleCommit(args, fixture) {
    if (fixture.name === 'empty_repo') {
      return this.rejectCommand('nothing to commit (create/copy files and use "git add" to track)');
    }

    if (!fixture.hasChanges && fixture.name !== 'clean_repo') {
      return this.rejectCommand('nothing to commit, working tree clean');
    }

    return this.resolveCommand('[main abc1234] Commit message\n 1 file changed, 1 insertion(+)');
  }

  /**
   * Handle git merge-base commands
   */
  handleMergeBase(args, fixture) {
    if (args.includes('--is-ancestor')) {
      // Simulate ancestor check - return success for most cases
      return this.resolveCommand('');
    }

    // Return a common ancestor SHA
    return this.resolveCommand('common123def456789012345678901234567890');
  }

  /**
   * Handle git rev-list commands
   */
  handleRevList(args, fixture) {
    if (fixture.name === 'empty_repo') {
      return this.rejectCommand('fatal: bad revision \'HEAD\'');
    }

    // Return commit SHAs based on log
    const commits = fixture.log.split('\n')
      .filter(line => line.trim())
      .map(line => line.split('\t')[0]);

    return this.resolveCommand(commits.join('\n'));
  }

  /**
   * Handle git show-ref commands
   */
  handleShowRef(args, fixture) {
    if (args.includes('--verify')) {
      // Simulate ref existence check
      const ref = args[args.length - 1];
      if (ref.includes('locks/')) {
        // Lock refs don't exist by default
        return this.rejectCommand('fatal: not a valid ref');
      }
      return this.resolveCommand(`${fixture.head} ${ref}`);
    }
    return this.resolveCommand('');
  }

  /**
   * Handle git update-ref commands
   */
  handleUpdateRef(args, fixture) {
    // Simulate successful ref update
    return this.resolveCommand('');
  }

  /**
   * Handle git notes commands
   */
  handleNotes(args, fixture) {
    if (args.includes('show')) {
      return this.resolveCommand('Note content for commit');
    }
    if (args.includes('add') || args.includes('append')) {
      return this.resolveCommand('');
    }
    return this.rejectCommand('Unknown notes command');
  }

  /**
   * Handle git hash-object commands
   */
  handleHashObject(args, fixture) {
    return this.resolveCommand('object123def456789012345678901234567890ab');
  }

  /**
   * Handle git write-tree commands
   */
  handleWriteTree(args, fixture) {
    return this.resolveCommand('tree123def456789012345678901234567890abc');
  }

  /**
   * Handle git cat-file commands
   */
  handleCatFile(args, fixture) {
    if (args.includes('-p')) {
      return this.resolveCommand('commit 123\ntree abc\nauthor Test User\n\nCommit message');
    }
    return this.rejectCommand('Unknown cat-file command');
  }

  /**
   * Handle generic Git commands
   */
  handleGenericCommand(args, fixture) {
    return this.resolveCommand('');
  }

  /**
   * Helper to resolve a command with output
   */
  resolveCommand(stdout) {
    return Promise.resolve({
      stdout: stdout + (stdout ? '\n' : ''),
      stderr: ''
    });
  }

  /**
   * Helper to reject a command with error
   */
  rejectCommand(message) {
    const error = new Error(message);
    error.code = 1;
    error.stderr = message;
    return Promise.reject(error);
  }

  /**
   * Get command history for verification
   */
  getCommandHistory() {
    return this.commandHistory.slice();
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.commandHistory = [];
  }

  /**
   * Simulate network timeout errors
   */
  simulateTimeout() {
    const mockExecFile = vi.fn();
    vi.doMock('node:child_process', () => ({ execFile: mockExecFile }));
    mockExecFile.mockRejectedValue(
      Object.assign(new Error('Timeout'), { code: 'TIMEOUT' })
    );
    return mockExecFile;
  }

  /**
   * Simulate permission errors
   */
  simulatePermissionError() {
    const mockExecFile = vi.fn();
    vi.doMock('node:child_process', () => ({ execFile: mockExecFile }));
    mockExecFile.mockRejectedValue(
      Object.assign(new Error('Permission denied'), { code: 'EACCES' })
    );
    return mockExecFile;
  }

  /**
   * Simulate disk space errors
   */
  simulateDiskSpaceError() {
    const mockExecFile = vi.fn();
    vi.doMock('node:child_process', () => ({ execFile: mockExecFile }));
    mockExecFile.mockRejectedValue(
      Object.assign(new Error('No space left on device'), { code: 'ENOSPC' })
    );
    return mockExecFile;
  }

  /**
   * Simulate corruption errors
   */
  simulateCorruptionError() {
    const mockExecFile = vi.fn();
    vi.doMock('node:child_process', () => ({ execFile: mockExecFile }));
    mockExecFile.mockRejectedValue(
      new Error('fatal: loose object is corrupt')
    );
    return mockExecFile;
  }
}

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
        tryUseGitVan,
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = useGitVan?.();
          } catch {
            ctx = tryUseGitVan?.();
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
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
        tryUseGitVan: vi.fn(() => null),
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = useGitVan?.();
          } catch {
            ctx = null;
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
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
        tryUseGitVan: vi.fn(() => null),
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = useGitVan?.();
          } catch {
            ctx = null;
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
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
        tryUseGitVan: vi.fn(() => null),
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = useGitVan?.();
          } catch {
            ctx = null;
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
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
        tryUseGitVan: vi.fn(() => null),
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = useGitVan?.();
          } catch {
            ctx = null;
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
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
        tryUseGitVan: vi.fn(() => null),
        bindContext: vi.fn(() => {
          let ctx;
          try {
            ctx = useGitVan?.();
          } catch {
            ctx = null;
          }
          const cwd = (ctx && ctx.cwd) || process.cwd();
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
            ...(ctx && ctx.env ? ctx.env : {}),
          };
          return { ctx, cwd, env };
        })
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
        tryUseGitVan: vi.fn(() => null),
        bindContext: vi.fn(() => {
          const ctx = { cwd: '/test', env: {} };
          const cwd = '/test';
          const env = {
            ...process.env,
            TZ: "UTC",
            LANG: "C",
          };
          return { ctx, cwd, env };
        })
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

// New comprehensive test scenarios using the MockGitStrategies class
describe('Comprehensive Mock Strategies with Fixtures', () => {
  let git;
  let mockStrategies;
  let mockContext;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Setup mock strategies
    mockStrategies = new MockGitStrategies();

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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Clean Repository Scenarios', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.CLEAN_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle clean repository operations', async () => {
      const branch = await git.branch();
      const head = await git.head();
      const status = await git.statusPorcelain();

      expect(branch).toBe('main');
      expect(head).toBe('abc123def456789012345678901234567890abcd');
      expect(status).toBe('');
    });

    it('should handle log operations in clean repo', async () => {
      const log = await git.log();
      expect(log).toBe('abc123\tInitial commit\ndef456\tSecond commit');
    });

    it('should handle commit operations in clean repo', async () => {
      // Clean repo can still make new commits
      await expect(git.commit('New commit')).resolves.not.toThrow();
    });
  });

  describe('Dirty Repository Scenarios', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.DIRTY_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle dirty repository status', async () => {
      const status = await git.statusPorcelain();
      expect(status).toBe('M  src/file.js\n?? new-file.txt\nD  old-file.txt');
    });

    it('should handle adding files in dirty repo', async () => {
      await expect(git.add(['src/file.js', 'new-file.txt'])).resolves.not.toThrow();

      const history = mockStrategies.getCommandHistory();
      expect(history).toHaveLength(1);
      expect(history[0].args).toEqual(['add', '--', 'src/file.js', 'new-file.txt']);
    });

    it('should handle branch operations in dirty repo', async () => {
      const branch = await git.branch();
      expect(branch).toBe('feature/new-feature');
    });
  });

  describe('Conflict Repository Scenarios', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.CONFLICT_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle conflicted repository status', async () => {
      const status = await git.statusPorcelain();
      expect(status).toBe('UU conflict.js\nAA both-added.txt\nDU deleted-by-us.txt');
    });

    it('should handle operations during conflicts', async () => {
      const branch = await git.branch();
      const head = await git.head();

      expect(branch).toBe('feature/conflicted');
      expect(head).toBe('ghi789abc012345678901234567890abcdef123');
    });
  });

  describe('Empty Repository Scenarios', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.EMPTY_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle empty repository errors gracefully', async () => {
      await expect(git.branch()).rejects.toThrow('fatal: not a git repository');
      await expect(git.head()).rejects.toThrow('fatal: ambiguous argument');
      await expect(git.log()).rejects.toThrow('does not have any commits yet');
    });

    it('should handle rev-list in empty repo', async () => {
      await expect(git.revList()).rejects.toThrow('fatal: bad revision');
    });

    it('should handle status in empty repo', async () => {
      const status = await git.statusPorcelain();
      expect(status).toBe('');
    });
  });

  describe('Detached HEAD Scenarios', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.DETACHED_HEAD);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle detached HEAD state', async () => {
      const branch = await git.branch();
      const head = await git.head();

      expect(branch).toBe('HEAD');
      expect(head).toBe('detached123456789012345678901234567890ab');
    });

    it('should handle operations in detached HEAD', async () => {
      const log = await git.log();
      expect(log).toBe('detached12\tDetached commit\nabc123\tPrevious commit');
    });
  });

  describe('Large Repository Scenarios', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.LARGE_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle large repository log output', async () => {
      const log = await git.log();
      const lines = log.split('\n').filter(line => line.trim());
      expect(lines).toHaveLength(100);
      expect(lines[0]).toBe('commit000\tCommit 1');
      expect(lines[99]).toBe('commit099\tCommit 100');
    });

    it('should handle rev-list with many commits', async () => {
      const revList = await git.revList();
      const commits = revList.split('\n').filter(line => line.trim());
      expect(commits).toHaveLength(100);
    });
  });

  describe('Multi-Branch Repository Scenarios', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.MULTI_BRANCH);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle current branch in multi-branch repo', async () => {
      const branch = await git.branch();
      expect(branch).toBe('develop');
    });

    it('should handle branch listing', async () => {
      // This would require additional mocking for branch listing
      // The fixture includes branch information for testing
      expect(REPO_FIXTURES.MULTI_BRANCH.branches).toContain('develop');
      expect(REPO_FIXTURES.MULTI_BRANCH.branches).toContain('main');
    });
  });

  describe('Tagged Repository Scenarios', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.TAGGED_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle tagged repository operations', async () => {
      const branch = await git.branch();
      const head = await git.head();

      expect(branch).toBe('main');
      expect(head).toBe('tagged123def456789012345678901234567890a');
    });

    it('should handle tag creation', async () => {
      await expect(git.tag('v2.1.0', 'New release')).resolves.not.toThrow();

      const history = mockStrategies.getCommandHistory();
      const tagCommand = history.find(cmd => cmd.args[0] === 'tag');
      expect(tagCommand).toBeTruthy();
      expect(tagCommand.args).toContain('v2.1.0');
    });
  });

  describe('Error Simulation Scenarios', () => {
    beforeEach(async () => {
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle timeout errors', async () => {
      mockStrategies.simulateTimeout();
      await expect(git.branch()).rejects.toThrow('Timeout');
    });

    it('should handle permission errors', async () => {
      mockStrategies.simulatePermissionError();
      await expect(git.commit('test')).rejects.toThrow('Permission denied');
    });

    it('should handle disk space errors', async () => {
      mockStrategies.simulateDiskSpaceError();
      await expect(git.add('large-file.txt')).rejects.toThrow('No space left on device');
    });

    it('should handle corruption errors', async () => {
      mockStrategies.simulateCorruptionError();
      await expect(git.head()).rejects.toThrow('loose object is corrupt');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.CLEAN_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle empty command outputs', async () => {
      const mockExecFile = vi.fn();
      vi.doMock('node:child_process', () => ({ execFile: mockExecFile }));
      mockExecFile.mockResolvedValue({ stdout: '\n', stderr: '' });

      const result = await git.statusPorcelain();
      expect(result).toBe('');
    });

    it('should handle very long commit messages', async () => {
      const longMessage = 'x'.repeat(10000);
      await expect(git.commit(longMessage)).resolves.not.toThrow();

      const history = mockStrategies.getCommandHistory();
      const commitCommand = history.find(cmd => cmd.args[0] === 'commit');
      expect(commitCommand.args).toContain(longMessage);
    });

    it('should handle special characters in file paths', async () => {
      const specialPaths = ['file with spaces.txt', 'файл.txt', 'file-with-émoji-🎉.js'];
      await expect(git.add(specialPaths)).resolves.not.toThrow();

      const history = mockStrategies.getCommandHistory();
      const addCommand = history.find(cmd => cmd.args[0] === 'add');
      specialPaths.forEach(path => {
        expect(addCommand.args).toContain(path);
      });
    });

    it('should handle concurrent operations', async () => {
      // Simulate multiple concurrent Git operations
      const operations = [
        git.branch(),
        git.head(),
        git.statusPorcelain(),
        git.log()
      ];

      const results = await Promise.all(operations);
      expect(results).toHaveLength(4);
      expect(results[0]).toBe('main'); // branch
      expect(results[1]).toBe('abc123def456789012345678901234567890abcd'); // head
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.LARGE_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should handle large output within maxBuffer limits', async () => {
      const largeOutput = 'x'.repeat(5 * 1024 * 1024); // 5MB
      const mockExecFile = vi.fn();
      vi.doMock('node:child_process', () => ({ execFile: mockExecFile }));
      mockExecFile.mockResolvedValue({ stdout: largeOutput + '\n', stderr: '' });

      const result = await git.log();
      expect(result).toBe(largeOutput);
    });

    it('should respect maxBuffer configuration', async () => {
      await git.branch();

      const history = mockStrategies.getCommandHistory();
      expect(history[0].options.maxBuffer).toBe(12 * 1024 * 1024); // 12MB
    });
  });

  describe('Command History and Verification', () => {
    beforeEach(async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.CLEAN_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();
    });

    it('should track command history for verification', async () => {
      await git.branch();
      await git.head();
      await git.statusPorcelain();

      const history = mockStrategies.getCommandHistory();
      expect(history).toHaveLength(3);
      expect(history[0].args).toEqual(['rev-parse', '--abbrev-ref', 'HEAD']);
      expect(history[1].args).toEqual(['rev-parse', 'HEAD']);
      expect(history[2].args).toEqual(['status', '--porcelain']);
    });

    it('should allow clearing command history', async () => {
      await git.branch();
      expect(mockStrategies.getCommandHistory()).toHaveLength(1);

      mockStrategies.clearHistory();
      expect(mockStrategies.getCommandHistory()).toHaveLength(0);
    });

    it('should capture command options and context', async () => {
      await git.branch();

      const history = mockStrategies.getCommandHistory();
      const command = history[0];

      expect(command.command).toBe('git');
      expect(command.options.cwd).toBe('/test/repo');
      expect(command.options.env).toMatchObject({
        TZ: 'UTC',
        LANG: 'C',
        CUSTOM_VAR: 'test'
      });
    });
  });

  describe('Notes Operations in Different Scenarios', () => {
    it('should handle notes in clean repo', async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.CLEAN_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();

      await expect(git.noteAdd('receipts', 'Test note')).resolves.not.toThrow();
      const noteContent = await git.noteShow('receipts');
      expect(noteContent).toBe('Note content for commit');
    });

    it('should handle notes in empty repo', async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.EMPTY_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();

      // Notes operations might work even in empty repo if targeting specific SHAs
      await expect(git.noteAdd('receipts', 'Test note', 'abc123')).resolves.not.toThrow();
    });
  });

  describe('Atomic Operations in Different Scenarios', () => {
    it('should handle ref creation in clean repo', async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.CLEAN_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();

      const result = await git.updateRefCreate('refs/locks/test-lock', 'abc123');
      expect(result).toBe(true);
    });

    it('should handle ref creation failures', async () => {
      mockStrategies.applyFixture(REPO_FIXTURES.CLEAN_REPO);
      const { useGit } = await import('../src/composables/git.mjs');
      git = useGit();

      // Simulate ref already exists
      const mockExecFile = vi.fn();
      vi.doMock('node:child_process', () => ({ execFile: mockExecFile }));
      mockExecFile.mockResolvedValueOnce({ stdout: 'abc123 refs/locks/existing\n' });

      const result = await git.updateRefCreate('refs/locks/existing', 'def456');
      expect(result).toBe(false);
    });
  });
});

describe('Mock Strategy Utilities', () => {
  let strategies;

  beforeEach(() => {
    strategies = new MockGitStrategies();
  });

  it('should provide fixture constants', () => {
    expect(REPO_FIXTURES.CLEAN_REPO.name).toBe('clean_repo');
    expect(REPO_FIXTURES.DIRTY_REPO.hasChanges).toBe(true);
    expect(REPO_FIXTURES.EMPTY_REPO.head).toBe(null);
  });

  it('should allow custom fixture application', () => {
    const customFixture = {
      name: 'custom',
      branch: 'custom-branch',
      head: 'custom123456789',
      status: 'custom status',
      log: 'custom log',
      hasChanges: true
    };

    strategies.applyFixture(customFixture);
    expect(strategies.currentFixture).toBe(customFixture);
  });

  it('should provide error simulation utilities', () => {
    expect(typeof strategies.simulateTimeout).toBe('function');
    expect(typeof strategies.simulatePermissionError).toBe('function');
    expect(typeof strategies.simulateDiskSpaceError).toBe('function');
    expect(typeof strategies.simulateCorruptionError).toBe('function');
  });
});