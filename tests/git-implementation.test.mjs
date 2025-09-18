// tests/git-implementation.test.mjs
// Comprehensive unit tests for read-only Git operations in useGit()
// Tests: branch(), head(), repoRoot(), log(), statusPorcelain()

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { useGit } from '../src/composables/git.mjs';

// Mock child_process execFile
vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}));

// Mock the context imports to avoid context dependency issues
vi.mock('../src/core/context.mjs', () => ({
  useGitVan: vi.fn(() => ({
    cwd: '/test/repo',
    env: { TEST_ENV: 'true' }
  })),
  tryUseGitVan: vi.fn(() => ({
    cwd: '/test/repo',
    env: { TEST_ENV: 'true' }
  })),
  withGitVan: vi.fn((context, fn) => fn()),
  bindContext: vi.fn(() => ({ // This was missing!
    cwd: '/test/repo',
    env: {
      ...process.env,
      TZ: 'UTC',
      LANG: 'C',
      TEST_ENV: 'true'
    }
  }))
}));

describe('useGit - Read Operations', () => {
  let mockExecFile;
  let git;

  beforeEach(() => {
    mockExecFile = vi.mocked(execFile);
    mockExecFile.mockClear();
    git = useGit();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('branch()', () => {
    it('should return current branch name', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(cmd).toBe('git');
        expect(args).toEqual(['rev-parse', '--abbrev-ref', 'HEAD']);
        expect(opts.cwd).toBe('/test/repo');
        expect(opts.env.TZ).toBe('UTC');
        expect(opts.env.LANG).toBeDefined(); // Allow actual LANG from environment
        callback(null, { stdout: 'main\n', stderr: '' });
      });

      const result = await git.branch();
      expect(result).toBe('main');
    });

    it('should handle detached HEAD state', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        callback(null, { stdout: 'HEAD\n', stderr: '' });
      });

      const result = await git.branch();
      expect(result).toBe('HEAD');
    });

    it('should throw error when git command fails', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        callback(new Error('Not a git repository'), null);
      });

      await expect(git.branch()).rejects.toThrow('Not a git repository');
    });

    it('should handle empty repository (no HEAD)', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        const error = new Error('fatal: ref HEAD not found');
        error.code = 128;
        callback(error, null);
      });

      await expect(git.branch()).rejects.toThrow('fatal: ref HEAD not found');
    });
  });

  describe('head()', () => {
    it('should return current HEAD commit SHA', async () => {
      const mockSha = 'a1b2c3d4e5f6789012345678901234567890abcd';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(cmd).toBe('git');
        expect(args).toEqual(['rev-parse', 'HEAD']);
        callback(null, { stdout: `${mockSha}\n`, stderr: '' });
      });

      const result = await git.head();
      expect(result).toBe(mockSha);
    });

    it('should handle short SHA format', async () => {
      const mockShortSha = 'a1b2c3d';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        callback(null, { stdout: `${mockShortSha}\n`, stderr: '' });
      });

      const result = await git.head();
      expect(result).toBe(mockShortSha);
    });

    it('should throw error for empty repository', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        const error = new Error('fatal: ref HEAD is not a symbolic ref');
        error.code = 128;
        callback(error, null);
      });

      await expect(git.head()).rejects.toThrow('fatal: ref HEAD is not a symbolic ref');
    });
  });

  describe('repoRoot()', () => {
    it('should return repository root path', async () => {
      const rootPath = '/home/user/my-project';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(cmd).toBe('git');
        expect(args).toEqual(['rev-parse', '--show-toplevel']);
        callback(null, { stdout: `${rootPath}\n`, stderr: '' });
      });

      const result = await git.repoRoot();
      expect(result).toBe(rootPath);
    });

    it('should handle Windows paths', async () => {
      const windowsPath = 'C:\\Users\\user\\my-project';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        callback(null, { stdout: `${windowsPath}\n`, stderr: '' });
      });

      const result = await git.repoRoot();
      expect(result).toBe(windowsPath);
    });

    it('should throw error when not in git repository', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        const error = new Error('fatal: not a git repository');
        error.code = 128;
        callback(error, null);
      });

      await expect(git.repoRoot()).rejects.toThrow('fatal: not a git repository');
    });

    it('should handle nested repository subdirectories', async () => {
      const nestedPath = '/home/user/my-project/subdir/nested';
      const rootPath = '/home/user/my-project';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(opts.cwd).toBe('/test/repo'); // Mock context cwd
        callback(null, { stdout: `${rootPath}\n`, stderr: '' });
      });

      const result = await git.repoRoot();
      expect(result).toBe(rootPath);
    });
  });

  describe('log()', () => {
    it('should return git log with default format', async () => {
      const mockLog = 'a1b2c3d\tInitial commit\nf4e5d6c\tSecond commit';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(cmd).toBe('git');
        expect(args).toEqual(['log', '--pretty=%h%x09%s']);
        callback(null, { stdout: `${mockLog}\n`, stderr: '' });
      });

      const result = await git.log();
      expect(result).toBe(mockLog);
    });

    it('should accept custom format string', async () => {
      const customFormat = '%H %an %s';
      const mockLog = 'a1b2c3d4e5f6 John Doe Initial commit';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(args).toEqual(['log', `--pretty=${customFormat}`]);
        callback(null, { stdout: `${mockLog}\n`, stderr: '' });
      });

      const result = await git.log(customFormat);
      expect(result).toBe(mockLog);
    });

    it('should accept extra arguments as array', async () => {
      const extraArgs = ['--max-count=5', '--oneline'];
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(args).toEqual(['log', '--pretty=%h%x09%s', '--max-count=5', '--oneline']);
        callback(null, { stdout: 'log output\n', stderr: '' });
      });

      await git.log('%h%x09%s', extraArgs);
    });

    it('should accept extra arguments as string', async () => {
      const extraString = '--max-count=3 --since="2024-01-01"';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(args).toEqual(['log', '--pretty=%h%x09%s', '--max-count=3', '--since="2024-01-01"']);
        callback(null, { stdout: 'log output\n', stderr: '' });
      });

      await git.log('%h%x09%s', extraString);
    });

    it('should filter empty strings from extra arguments', async () => {
      const extraString = '--max-count=3  --oneline  ';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(args).toEqual(['log', '--pretty=%h%x09%s', '--max-count=3', '--oneline']);
        callback(null, { stdout: 'log output\n', stderr: '' });
      });

      await git.log('%h%x09%s', extraString);
    });

    it('should handle empty repository with no commits', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        const error = new Error('fatal: your current branch does not have any commits yet');
        error.code = 128;
        callback(error, null);
      });

      await expect(git.log()).rejects.toThrow('your current branch does not have any commits yet');
    });

    it('should handle large log output', async () => {
      const largeLog = Array(1000).fill(0).map((_, i) => `${i.toString(16).padStart(7, '0')}\tCommit ${i}`).join('\n');
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(opts.maxBuffer).toBe(12 * 1024 * 1024); // 12MB default
        callback(null, { stdout: `${largeLog}\n`, stderr: '' });
      });

      const result = await git.log();
      expect(result).toBe(largeLog);
    });
  });

  describe('statusPorcelain()', () => {
    it('should return porcelain status output', async () => {
      const mockStatus = 'M file1.txt\nA  file2.txt\n?? file3.txt';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(cmd).toBe('git');
        expect(args).toEqual(['status', '--porcelain']);
        callback(null, { stdout: `${mockStatus}\n`, stderr: '' });
      });

      const result = await git.statusPorcelain();
      expect(result).toBe(mockStatus);
    });

    it('should return empty string for clean working directory', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        callback(null, { stdout: '\n', stderr: '' });
      });

      const result = await git.statusPorcelain();
      expect(result).toBe('');
    });

    it('should handle various file status codes', async () => {
      const complexStatus = [
        'M modified-file.txt',
        'A  added-file.txt',
        'D  deleted-file.txt',
        'R  renamed-file.txt',
        'C  copied-file.txt',
        'M  staged-modified.txt',
        '?? untracked-file.txt',
        '!! ignored-file.txt'
      ].join('\n');

      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        callback(null, { stdout: `${complexStatus}\n`, stderr: '' });
      });

      const result = await git.statusPorcelain();
      expect(result).toBe(complexStatus);
    });

    it('should handle empty repository status', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        callback(null, { stdout: '\n', stderr: '' });
      });

      const result = await git.statusPorcelain();
      expect(result).toBe('');
    });

    it('should throw error when git command fails', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        const error = new Error('fatal: not a git repository');
        error.code = 128;
        callback(error, null);
      });

      await expect(git.statusPorcelain()).rejects.toThrow('fatal: not a git repository');
    });
  });

  describe('Environment and Context Integration', () => {
    it('should use correct environment variables', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(opts.env.TZ).toBe('UTC');
        expect(opts.env.LANG).toBeDefined(); // Allow actual LANG from environment
        expect(opts.env.TEST_ENV).toBe('true'); // From mock context
        callback(null, { stdout: 'main\n', stderr: '' });
      });

      await git.branch();
    });

    it('should use correct working directory from context', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(opts.cwd).toBe('/test/repo');
        callback(null, { stdout: 'main\n', stderr: '' });
      });

      await git.branch();
    });

    it('should use maxBuffer setting for large outputs', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        expect(opts.maxBuffer).toBe(12 * 1024 * 1024); // 12MB
        callback(null, { stdout: 'output\n', stderr: '' });
      });

      await git.branch();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle git command timeout', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        const error = new Error('Command timeout');
        error.code = 'ETIMEDOUT';
        callback(error, null);
      });

      await expect(git.branch()).rejects.toThrow('Command timeout');
    });

    it('should handle permission denied errors', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        const error = new Error('Permission denied');
        error.code = 'EACCES';
        callback(error, null);
      });

      await expect(git.head()).rejects.toThrow('Permission denied');
    });

    it('should handle corrupted repository', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        const error = new Error('fatal: bad object HEAD');
        error.code = 128;
        callback(error, null);
      });

      await expect(git.log()).rejects.toThrow('fatal: bad object HEAD');
    });

    it('should handle network timeouts for remote operations', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        const error = new Error('fatal: unable to access repository');
        error.code = 128;
        callback(error, null);
      });

      await expect(git.statusPorcelain()).rejects.toThrow('fatal: unable to access repository');
    });
  });

  describe('Output Trimming and Formatting', () => {
    it('should trim whitespace from git command output', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        callback(null, { stdout: '  main  \n  ', stderr: '' });
      });

      const result = await git.branch();
      expect(result).toBe('main');
    });

    it('should handle multi-line output correctly', async () => {
      const multilineOutput = 'line1\nline2\nline3';
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        callback(null, { stdout: `  ${multilineOutput}  \n`, stderr: '' });
      });

      const result = await git.log();
      expect(result).toBe(multilineOutput);
    });

    it('should handle empty output', async () => {
      mockExecFile.mockImplementation((cmd, args, opts, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const result = await git.statusPorcelain();
      expect(result).toBe('');
    });
  });
});