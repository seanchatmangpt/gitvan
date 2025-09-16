/**
 * GitVan v2 Git Tests
 * Tests git composable functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync, exec } from 'child_process';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe.skip('Git Composable', () => {
  let tempDir;
  let gitRepo;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitvan-git-test-'));

    // Initialize git repository
    execSync('git init', { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });

    // Create initial commit
    await writeFile(join(tempDir, 'README.md'), '# Test Repository');
    execSync('git add README.md', { cwd: tempDir });
    execSync('git commit -m "Initial commit"', { cwd: tempDir });

    // Mock git composable
    gitRepo = {
      cwd: tempDir,
      async status() {
        const { stdout } = await execAsync('git status --porcelain', { cwd: this.cwd });
        return stdout.trim().split('\n').filter(Boolean).map(line => ({
          status: line.substring(0, 2),
          file: line.substring(3)
        }));
      },

      async branch() {
        const { stdout } = await execAsync('git branch --show-current', { cwd: this.cwd });
        return stdout.trim();
      },

      async commit() {
        const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.cwd });
        return stdout.trim();
      },

      async remote() {
        try {
          const { stdout } = await execAsync('git remote get-url origin', { cwd: this.cwd });
          return stdout.trim();
        } catch {
          return null;
        }
      },

      async isDirty() {
        const status = await this.status();
        return status.length > 0;
      },

      async log(options = {}) {
        const { limit = 10, format = 'oneline' } = options;
        const cmd = `git log --${format} -n ${limit}`;
        const { stdout } = await execAsync(cmd, { cwd: this.cwd });
        return stdout.trim().split('\n').filter(Boolean);
      },

      async diff(options = {}) {
        const { staged = false, file = null } = options;
        let cmd = 'git diff';
        if (staged) cmd += ' --staged';
        if (file) cmd += ` -- ${file}`;

        const { stdout } = await execAsync(cmd, { cwd: this.cwd });
        return stdout;
      },

      async add(files) {
        const fileList = Array.isArray(files) ? files.join(' ') : files;
        await execAsync(`git add ${fileList}`, { cwd: this.cwd });
        return true;
      },

      async commit(message, options = {}) {
        const { amend = false, signoff = false } = options;
        let cmd = `git commit -m "${message}"`;
        if (amend) cmd += ' --amend';
        if (signoff) cmd += ' --signoff';

        await execAsync(cmd, { cwd: this.cwd });
        return true;
      },

      async createBranch(name, checkout = true) {
        let cmd = `git branch ${name}`;
        if (checkout) cmd = `git checkout -b ${name}`;

        await execAsync(cmd, { cwd: this.cwd });
        return true;
      },

      async checkout(ref) {
        await execAsync(`git checkout ${ref}`, { cwd: this.cwd });
        return true;
      },

      async tag(name, message = null) {
        let cmd = `git tag ${name}`;
        if (message) cmd += ` -m "${message}"`;

        await execAsync(cmd, { cwd: this.cwd });
        return true;
      },

      async reset(mode = 'soft', ref = 'HEAD~1') {
        await execAsync(`git reset --${mode} ${ref}`, { cwd: this.cwd });
        return true;
      },

      async isRepository() {
        try {
          await execAsync('git rev-parse --git-dir', { cwd: this.cwd });
          return true;
        } catch {
          return false;
        }
      },

      async root() {
        try {
          const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd: this.cwd });
          return stdout.trim();
        } catch {
          return null;
        }
      }
    };
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Repository Detection', () => {
    it('should detect git repository correctly', async () => {
      const isRepo = await gitRepo.isRepository();
      expect(isRepo).toBe(true);
    });

    it('should return repository root', async () => {
      const root = await gitRepo.root();
      expect(root).toBe(tempDir);
    });

    it('should handle non-git directories', async () => {
      const nonGitDir = await mkdtemp(join(tmpdir(), 'non-git-'));
      const nonGitRepo = { ...gitRepo, cwd: nonGitDir };

      try {
        const isRepo = await nonGitRepo.isRepository();
        expect(isRepo).toBe(false);

        const root = await nonGitRepo.root();
        expect(root).toBeNull();
      } finally {
        await rm(nonGitDir, { recursive: true, force: true });
      }
    });
  });

  describe('Branch Operations', () => {
    it('should get current branch', async () => {
      const branch = await gitRepo.branch();
      expect(branch).toBe('main');
    });

    it('should create new branch', async () => {
      await gitRepo.createBranch('feature/test', false);

      // Verify branch exists
      const { stdout } = await execAsync('git branch', { cwd: tempDir });
      expect(stdout).toContain('feature/test');
    });

    it('should create and checkout new branch', async () => {
      await gitRepo.createBranch('feature/checkout-test', true);

      const currentBranch = await gitRepo.branch();
      expect(currentBranch).toBe('feature/checkout-test');
    });

    it('should checkout existing branch', async () => {
      await gitRepo.createBranch('feature/existing', true);
      await gitRepo.checkout('main');

      let currentBranch = await gitRepo.branch();
      expect(currentBranch).toBe('main');

      await gitRepo.checkout('feature/existing');
      currentBranch = await gitRepo.branch();
      expect(currentBranch).toBe('feature/existing');
    });
  });

  describe('Status and Diff Operations', () => {
    it('should get repository status', async () => {
      // Repository should be clean initially
      const status = await gitRepo.status();
      expect(status).toEqual([]);

      const isDirty = await gitRepo.isDirty();
      expect(isDirty).toBe(false);
    });

    it('should detect modified files', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'test content');

      const status = await gitRepo.status();
      expect(status).toHaveLength(1);
      expect(status[0].file).toBe('test.txt');
      expect(status[0].status).toBe('??');

      const isDirty = await gitRepo.isDirty();
      expect(isDirty).toBe(true);
    });

    it('should detect staged files', async () => {
      await writeFile(join(tempDir, 'staged.txt'), 'staged content');
      await gitRepo.add('staged.txt');

      const status = await gitRepo.status();
      expect(status).toHaveLength(1);
      expect(status[0].file).toBe('staged.txt');
      expect(status[0].status).toBe('A ');
    });

    it('should get diff for unstaged changes', async () => {
      await writeFile(join(tempDir, 'README.md'), '# Modified Repository');

      const diff = await gitRepo.diff();
      expect(diff).toContain('# Modified Repository');
      expect(diff).toContain('# Test Repository');
    });

    it('should get diff for staged changes', async () => {
      await writeFile(join(tempDir, 'README.md'), '# Staged Repository');
      await gitRepo.add('README.md');

      const stagedDiff = await gitRepo.diff({ staged: true });
      expect(stagedDiff).toContain('# Staged Repository');

      const unstagedDiff = await gitRepo.diff({ staged: false });
      expect(unstagedDiff).toBe('');
    });

    it('should get diff for specific file', async () => {
      await writeFile(join(tempDir, 'file1.txt'), 'content 1');
      await writeFile(join(tempDir, 'file2.txt'), 'content 2');

      const file1Diff = await gitRepo.diff({ file: 'file1.txt' });
      expect(file1Diff).toContain('content 1');
      expect(file1Diff).not.toContain('content 2');
    });
  });

  describe('Commit Operations', () => {
    it('should get current commit hash', async () => {
      const commit = await gitRepo.commit();
      expect(commit).toMatch(/^[a-f0-9]{40}$/);
    });

    it('should create new commit', async () => {
      await writeFile(join(tempDir, 'new-file.txt'), 'new content');
      await gitRepo.add('new-file.txt');

      const beforeCommit = await gitRepo.commit();
      await gitRepo.commit('Add new file');
      const afterCommit = await gitRepo.commit();

      expect(afterCommit).not.toBe(beforeCommit);
    });

    it('should amend last commit', async () => {
      await writeFile(join(tempDir, 'amend-test.txt'), 'amend content');
      await gitRepo.add('amend-test.txt');
      await gitRepo.commit('Initial commit for amend');

      const beforeAmend = await gitRepo.commit();

      await writeFile(join(tempDir, 'amend-test.txt'), 'amended content');
      await gitRepo.add('amend-test.txt');
      await gitRepo.commit('Amended commit message', { amend: true });

      const afterAmend = await gitRepo.commit();
      expect(afterAmend).not.toBe(beforeAmend);
    });

    it('should create commit with signoff', async () => {
      await writeFile(join(tempDir, 'signoff-test.txt'), 'signoff content');
      await gitRepo.add('signoff-test.txt');
      await gitRepo.commit('Add signoff test', { signoff: true });

      // Verify signoff in commit message
      const { stdout } = await execAsync('git log -1 --pretty=format:"%B"', { cwd: tempDir });
      expect(stdout).toContain('Signed-off-by: Test User <test@example.com>');
    });
  });

  describe('Log Operations', () => {
    it('should get commit log', async () => {
      const log = await gitRepo.log();
      expect(log).toHaveLength(1);
      expect(log[0]).toContain('Initial commit');
    });

    it('should limit log entries', async () => {
      // Create additional commits
      for (let i = 1; i <= 5; i++) {
        await writeFile(join(tempDir, `file${i}.txt`), `content ${i}`);
        await gitRepo.add(`file${i}.txt`);
        await gitRepo.commit(`Commit ${i}`);
      }

      const limitedLog = await gitRepo.log({ limit: 3 });
      expect(limitedLog).toHaveLength(3);
    });

    it('should get log with different formats', async () => {
      const onelineLog = await gitRepo.log({ format: 'oneline' });
      const fullLog = await gitRepo.log({ format: 'full' });

      expect(onelineLog[0]).toMatch(/^[a-f0-9]{7,40} Initial commit$/);
      expect(fullLog[0]).toContain('Author: Test User <test@example.com>');
    });
  });

  describe('Tag Operations', () => {
    it('should create lightweight tag', async () => {
      await gitRepo.tag('v1.0.0');

      const { stdout } = await execAsync('git tag', { cwd: tempDir });
      expect(stdout.trim()).toBe('v1.0.0');
    });

    it('should create annotated tag', async () => {
      await gitRepo.tag('v1.1.0', 'Release version 1.1.0');

      const { stdout } = await execAsync('git tag -n', { cwd: tempDir });
      expect(stdout).toContain('v1.1.0');
      expect(stdout).toContain('Release version 1.1.0');
    });
  });

  describe('Reset Operations', () => {
    it('should perform soft reset', async () => {
      // Create a commit to reset
      await writeFile(join(tempDir, 'reset-test.txt'), 'reset content');
      await gitRepo.add('reset-test.txt');
      await gitRepo.commit('Commit to reset');

      const beforeReset = await gitRepo.commit();
      await gitRepo.reset('soft');
      const afterReset = await gitRepo.commit();

      expect(afterReset).not.toBe(beforeReset);

      // File should still be staged
      const status = await gitRepo.status();
      expect(status.some(s => s.file === 'reset-test.txt' && s.status.startsWith('A'))).toBe(true);
    });

    it('should perform hard reset', async () => {
      await writeFile(join(tempDir, 'hard-reset.txt'), 'hard reset content');
      await gitRepo.add('hard-reset.txt');
      await gitRepo.commit('Commit for hard reset');

      await gitRepo.reset('hard');

      // File should be completely removed
      const status = await gitRepo.status();
      expect(status.some(s => s.file === 'hard-reset.txt')).toBe(false);
    });
  });

  describe('Remote Operations', () => {
    it('should handle repository without remote', async () => {
      const remote = await gitRepo.remote();
      expect(remote).toBeNull();
    });

    it('should get remote URL when available', async () => {
      // Add a remote
      await execAsync('git remote add origin https://github.com/test/repo.git', { cwd: tempDir });

      const remote = await gitRepo.remote();
      expect(remote).toBe('https://github.com/test/repo.git');
    });
  });

  describe('Error Handling', () => {
    it('should handle git command failures gracefully', async () => {
      // Try to checkout non-existent branch
      await expect(gitRepo.checkout('non-existent-branch')).rejects.toThrow();
    });

    it('should handle invalid git operations', async () => {
      // Try to commit without staging files
      await expect(gitRepo.commit('Empty commit')).rejects.toThrow();
    });

    it('should handle operations in non-git directory', async () => {
      const nonGitDir = await mkdtemp(join(tmpdir(), 'non-git-'));
      const nonGitRepo = { ...gitRepo, cwd: nonGitDir };

      try {
        await expect(nonGitRepo.branch()).rejects.toThrow();
        await expect(nonGitRepo.status()).rejects.toThrow();
      } finally {
        await rm(nonGitDir, { recursive: true, force: true });
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent git operations', async () => {
      // Create multiple files concurrently
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          writeFile(join(tempDir, `concurrent${i}.txt`), `content ${i}`)
        );
      }
      await Promise.all(promises);

      // Add files concurrently (sequentially to avoid conflicts)
      for (let i = 0; i < 5; i++) {
        await gitRepo.add(`concurrent${i}.txt`);
      }

      // Verify all files are staged
      const status = await gitRepo.status();
      expect(status).toHaveLength(5);
      expect(status.every(s => s.status.startsWith('A'))).toBe(true);
    });

    it('should handle concurrent status checks', async () => {
      const statusPromises = Array(10).fill(null).map(() => gitRepo.status());
      const results = await Promise.all(statusPromises);

      // All results should be identical
      results.forEach(result => {
        expect(result).toEqual(results[0]);
      });
    });
  });

  describe('Performance', () => {
    it('should execute git operations efficiently', async () => {
      const startTime = Date.now();

      // Perform multiple git operations
      await gitRepo.branch();
      await gitRepo.commit();
      await gitRepo.status();
      await gitRepo.isDirty();
      await gitRepo.log({ limit: 5 });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large repositories efficiently', async () => {
      // Create many commits
      for (let i = 0; i < 100; i++) {
        await writeFile(join(tempDir, `file${i}.txt`), `content ${i}`);
        await gitRepo.add(`file${i}.txt`);
        await gitRepo.commit(`Commit ${i}`);
      }

      const startTime = Date.now();
      const log = await gitRepo.log({ limit: 50 });
      const duration = Date.now() - startTime;

      expect(log).toHaveLength(50);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});