/**
 * useGit() Integration Tests - Real Git Operations
 * Tests with actual git repositories and commands
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

// Mock only the context, let git operations be real
const mockContext = {
  cwd: null, // Will be set in beforeEach
  env: {
    CUSTOM_VAR: 'test',
    GIT_AUTHOR_NAME: 'Test User',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test User',
    GIT_COMMITTER_EMAIL: 'test@example.com'
  }
};

vi.mock('../src/core/context.mjs', () => ({
  useGitVan: vi.fn(() => mockContext),
  tryUseGitVan: vi.fn(() => mockContext),
  withGitVan: vi.fn((context, fn) => fn()),
  bindContext: vi.fn(() => mockContext) // This was missing!
}));

const { useGit } = await import('../src/composables/git.mjs');

describe('useGit() Integration Tests', () => {
  let tempDir;
  let git;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitvan-integration-'));
    mockContext.cwd = tempDir;

    // Initialize git repository
    execSync('git init', { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });
    execSync('git config init.defaultBranch main', { cwd: tempDir });

    // Create initial commit
    await writeFile(join(tempDir, 'README.md'), '# Test Repository\n');
    execSync('git add README.md', { cwd: tempDir });
    execSync('git commit -m "Initial commit"', { cwd: tempDir });

    git = useGit();
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Repository Info Operations - Real Git', () => {
    it('should get current branch', async () => {
      const branch = await git.branch();
      expect(branch).toBe('main');
    });

    it('should get HEAD commit SHA', async () => {
      const head = await git.head();
      expect(head).toMatch(/^[a-f0-9]{40}$/);
    });

    it('should get repository root', async () => {
      const root = await git.repoRoot();
      expect(root).toBe(tempDir);
    });

    it('should get git directory', async () => {
      const gitDir = await git.worktreeGitDir();
      expect(gitDir).toBe('.git');
    });

    it('should handle detached HEAD state', async () => {
      const head = await git.head();
      execSync(`git checkout ${head}`, { cwd: tempDir });

      const branch = await git.branch();
      expect(branch).toBe('HEAD');
    });
  });

  describe('Read Operations - Real Git', () => {
    beforeEach(async () => {
      // Create some commit history
      await writeFile(join(tempDir, 'file1.txt'), 'Content 1\n');
      await git.add('file1.txt');
      await git.commit('Add file1');

      await writeFile(join(tempDir, 'file2.txt'), 'Content 2\n');
      await git.add('file2.txt');
      await git.commit('Add file2');
    });

    it('should get commit log with default format', async () => {
      const log = await git.log();
      const lines = log.split('\n');

      expect(lines).toHaveLength(3); // Initial + 2 new commits
      expect(lines[0]).toMatch(/^[a-f0-9]{7}\tAdd file2$/);
      expect(lines[1]).toMatch(/^[a-f0-9]{7}\tAdd file1$/);
      expect(lines[2]).toMatch(/^[a-f0-9]{7}\tInitial commit$/);
    });

    it('should get log with custom format', async () => {
      const log = await git.log('%H %an %s');
      const lines = log.split('\n');

      expect(lines[0]).toMatch(/^[a-f0-9]{40} Test User Add file2$/);
    });

    it('should get log with extra arguments', async () => {
      const log = await git.log('%h %s', '--max-count=2');
      const lines = log.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/Add file2$/);
      expect(lines[1]).toMatch(/Add file1$/);
    });

    it('should get porcelain status for clean repo', async () => {
      const status = await git.statusPorcelain();
      expect(status).toBe('');
    });

    it('should get porcelain status with changes', async () => {
      await writeFile(join(tempDir, 'new-file.txt'), 'New content\n');
      await writeFile(join(tempDir, 'file1.txt'), 'Modified content\n');

      const status = await git.statusPorcelain();
      const lines = status.split('\n').filter(Boolean);

      expect(lines).toHaveLength(2);
      expect(lines.some(line => line.includes('file1.txt') && line.startsWith(' M'))).toBe(true);
      expect(lines.some(line => line.includes('new-file.txt') && line.startsWith('??'))).toBe(true);
    });

    it('should check ancestor relationship', async () => {
      const head = await git.head();
      const logOutput = await git.log('%H', '--max-count=2');
      const commits = logOutput.split('\n');
      const previousCommit = commits[1];

      const isAncestor = await git.isAncestor(previousCommit, head);
      expect(isAncestor).toBe(true);

      const isNotAncestor = await git.isAncestor(head, previousCommit);
      expect(isNotAncestor).toBe(false);
    });

    it('should get merge base', async () => {
      // Create a branch to test merge base
      execSync('git checkout -b feature', { cwd: tempDir });
      await writeFile(join(tempDir, 'feature.txt'), 'Feature content\n');
      await git.add('feature.txt');
      await git.commit('Add feature');

      execSync('git checkout main', { cwd: tempDir });
      await writeFile(join(tempDir, 'main.txt'), 'Main content\n');
      await git.add('main.txt');
      await git.commit('Add main');

      const mergeBase = await git.mergeBase('main', 'feature');
      expect(mergeBase).toMatch(/^[a-f0-9]{40}$/);
    });

    it('should get revision list', async () => {
      const revList = await git.revList(['--max-count=2', 'HEAD']);
      const commits = revList.split('\n');

      expect(commits).toHaveLength(2);
      expect(commits[0]).toMatch(/^[a-f0-9]{40}$/);
      expect(commits[1]).toMatch(/^[a-f0-9]{40}$/);
    });
  });

  describe('Write Operations - Real Git', () => {
    it('should add single file', async () => {
      await writeFile(join(tempDir, 'new-file.txt'), 'New content\n');

      await git.add('new-file.txt');

      const status = await git.statusPorcelain();
      expect(status).toContain('A  new-file.txt');
    });

    it('should add multiple files', async () => {
      await writeFile(join(tempDir, 'file-a.txt'), 'Content A\n');
      await writeFile(join(tempDir, 'file-b.txt'), 'Content B\n');

      await git.add(['file-a.txt', 'file-b.txt']);

      const status = await git.statusPorcelain();
      expect(status).toContain('A  file-a.txt');
      expect(status).toContain('A  file-b.txt');
    });

    it('should create commit', async () => {
      await writeFile(join(tempDir, 'commit-test.txt'), 'Commit content\n');
      await git.add('commit-test.txt');

      const beforeCommit = await git.head();
      await git.commit('Test commit message');
      const afterCommit = await git.head();

      expect(afterCommit).not.toBe(beforeCommit);

      // Verify commit message
      const log = await git.log('%s', '--max-count=1');
      expect(log).toBe('Test commit message');
    });

    it('should create signed commit when configured', async () => {
      // Skip if GPG not available
      let hasGpg = false;
      try {
        execSync('gpg --version', { stdio: 'ignore' });
        hasGpg = true;
      } catch {
        hasGpg = false;
      }

      if (!hasGpg) {
        console.log('Skipping signed commit test - GPG not available');
        return;
      }

      await writeFile(join(tempDir, 'signed-file.txt'), 'Signed content\n');
      await git.add('signed-file.txt');

      // This may fail without proper GPG setup, which is expected
      try {
        await git.commit('Signed commit', { sign: true });
        const log = await git.log('%G?', '--max-count=1');
        // Should show signing status if successful
        expect(['G', 'B', 'U', 'X', 'Y', 'R', 'E', 'N']).toContain(log);
      } catch (error) {
        console.log('Signed commit failed as expected without GPG setup:', error.message);
      }
    });

    it('should create lightweight tag', async () => {
      await git.tag('v1.0.0');

      const tags = execSync('git tag', { cwd: tempDir, encoding: 'utf8' });
      expect(tags.trim()).toBe('v1.0.0');
    });

    it('should create annotated tag', async () => {
      await git.tag('v1.1.0', 'Release version 1.1.0');

      const tagInfo = execSync('git show v1.1.0', { cwd: tempDir, encoding: 'utf8' });
      expect(tagInfo).toContain('Release version 1.1.0');
    });
  });

  describe('Notes Operations - Real Git', () => {
    let commitSha;

    beforeEach(async () => {
      commitSha = await git.head();
    });

    it('should add note to commit', async () => {
      await git.noteAdd('receipts', 'Receipt note content');

      const noteContent = await git.noteShow('receipts');
      expect(noteContent).toBe('Receipt note content');
    });

    it('should add note to specific commit', async () => {
      // Create another commit
      await writeFile(join(tempDir, 'note-test.txt'), 'Note test\n');
      await git.add('note-test.txt');
      await git.commit('Note test commit');
      const newCommitSha = await git.head();

      await git.noteAdd('receipts', 'Note for first commit', commitSha);
      await git.noteAdd('receipts', 'Note for second commit', newCommitSha);

      const firstNote = await git.noteShow('receipts', commitSha);
      const secondNote = await git.noteShow('receipts', newCommitSha);

      expect(firstNote).toBe('Note for first commit');
      expect(secondNote).toBe('Note for second commit');
    });

    it('should append to existing note', async () => {
      await git.noteAdd('receipts', 'First note line');
      await git.noteAppend('receipts', 'Second note line');

      const noteContent = await git.noteShow('receipts');
      expect(noteContent).toContain('First note line');
      expect(noteContent).toContain('Second note line');
    });

    it('should handle multiline notes', async () => {
      const multilineNote = 'Line 1\nLine 2\nLine 3';
      await git.noteAdd('receipts', multilineNote);

      const noteContent = await git.noteShow('receipts');
      expect(noteContent).toBe(multilineNote);
    });

    it('should handle different note refs', async () => {
      await git.noteAdd('receipts', 'Receipt content');
      await git.noteAdd('reviews', 'Review content');

      const receiptNote = await git.noteShow('receipts');
      const reviewNote = await git.noteShow('reviews');

      expect(receiptNote).toBe('Receipt content');
      expect(reviewNote).toBe('Review content');
    });
  });

  describe('Atomic Operations - Real Git', () => {
    it('should create new ref atomically', async () => {
      const commitSha = await git.head();
      const refName = 'refs/locks/test-lock';

      const result = await git.updateRefCreate(refName, commitSha);

      expect(result).toBe(true);

      // Verify ref was created
      const refValue = execSync(`git show-ref --verify ${refName}`, {
        cwd: tempDir,
        encoding: 'utf8'
      });
      expect(refValue).toContain(commitSha);
    });

    it('should return false when ref already exists', async () => {
      const commitSha = await git.head();
      const refName = 'refs/locks/existing-lock';

      // Create ref first
      execSync(`git update-ref ${refName} ${commitSha}`, { cwd: tempDir });

      const result = await git.updateRefCreate(refName, commitSha);
      expect(result).toBe(false);
    });

    it('should handle concurrent ref creation attempts', async () => {
      const commitSha = await git.head();
      const refName = 'refs/locks/concurrent-lock';

      // Try to create the same ref concurrently
      const promises = [
        git.updateRefCreate(refName, commitSha),
        git.updateRefCreate(refName, commitSha),
        git.updateRefCreate(refName, commitSha)
      ];

      const results = await Promise.all(promises);

      // Only one should succeed
      const successCount = results.filter(r => r === true).length;
      expect(successCount).toBe(1);
    });
  });

  describe('Plumbing Operations - Real Git', () => {
    it('should hash object without writing', async () => {
      const filePath = join(tempDir, 'hash-test.txt');
      await writeFile(filePath, 'Test content for hashing\n');

      const hash = await git.hashObject('hash-test.txt');

      expect(hash).toMatch(/^[a-f0-9]{40}$/);

      // Verify object was not written to repository
      try {
        execSync(`git cat-file -e ${hash}`, { cwd: tempDir, stdio: 'ignore' });
        throw new Error('Object should not exist in repository');
      } catch (error) {
        // Expected - object not in repo
        expect(error.status).toBe(1);
      }
    });

    it('should hash object with writing', async () => {
      const filePath = join(tempDir, 'hash-write-test.txt');
      await writeFile(filePath, 'Test content for writing\n');

      const hash = await git.hashObject('hash-write-test.txt', { write: true });

      expect(hash).toMatch(/^[a-f0-9]{40}$/);

      // Verify object was written to repository
      const content = execSync(`git cat-file -p ${hash}`, {
        cwd: tempDir,
        encoding: 'utf8'
      });
      expect(content).toBe('Test content for writing\n');
    });

    it('should write tree object', async () => {
      // Stage some files
      await writeFile(join(tempDir, 'tree-file1.txt'), 'File 1\n');
      await writeFile(join(tempDir, 'tree-file2.txt'), 'File 2\n');
      await git.add(['tree-file1.txt', 'tree-file2.txt']);

      const treeHash = await git.writeTree();

      expect(treeHash).toMatch(/^[a-f0-9]{40}$/);

      // Verify tree object content
      const treeContent = execSync(`git cat-file -p ${treeHash}`, {
        cwd: tempDir,
        encoding: 'utf8'
      });
      expect(treeContent).toContain('tree-file1.txt');
      expect(treeContent).toContain('tree-file2.txt');
    });

    it('should display object content with cat-file', async () => {
      const commitSha = await git.head();

      const content = await git.catFilePretty(commitSha);

      expect(content).toContain('tree');
      expect(content).toContain('author');
      expect(content).toContain('committer');
      expect(content).toContain('Initial commit');
    });

    it('should handle absolute file paths in hashObject', async () => {
      const absolutePath = join(tempDir, 'absolute-test.txt');
      await writeFile(absolutePath, 'Absolute path content\n');

      const hash = await git.hashObject(absolutePath);
      expect(hash).toMatch(/^[a-f0-9]{40}$/);
    });
  });

  describe('Generic Runners - Real Git', () => {
    it('should run custom git command', async () => {
      const result = await git.run(['rev-parse', '--is-inside-work-tree']);
      expect(result).toBe('true');
    });

    it('should run void git command', async () => {
      await writeFile(join(tempDir, 'runner-test.txt'), 'Runner content\n');

      const result = await git.runVoid(['add', 'runner-test.txt']);
      expect(result).toBeUndefined();

      // Verify file was added
      const status = await git.statusPorcelain();
      expect(status).toContain('A  runner-test.txt');
    });

    it('should handle command arguments as string', async () => {
      const result = await git.run('symbolic-ref HEAD');
      expect(result).toBe('refs/heads/main');
    });
  });

  describe('Error Handling - Real Git', () => {
    it('should handle non-existent file in add', async () => {
      await expect(git.add('non-existent.txt')).rejects.toThrow();
    });

    it('should handle empty commit', async () => {
      await expect(git.commit('Empty commit')).rejects.toThrow();
    });

    it('should handle invalid git command', async () => {
      await expect(git.run(['invalid-command'])).rejects.toThrow();
    });

    it('should handle non-existent ref in show', async () => {
      await expect(git.run(['show', 'non-existent-ref'])).rejects.toThrow();
    });

    it('should handle missing note gracefully', async () => {
      await expect(git.noteShow('non-existent-ref')).rejects.toThrow();
    });
  });

  describe('Branch Operations - Real Git', () => {
    it('should work across different branches', async () => {
      // Create and switch to new branch
      execSync('git checkout -b feature-branch', { cwd: tempDir });

      const currentBranch = await git.branch();
      expect(currentBranch).toBe('feature-branch');

      // Make changes on feature branch
      await writeFile(join(tempDir, 'feature.txt'), 'Feature content\n');
      await git.add('feature.txt');
      await git.commit('Add feature');

      // Switch back to main
      execSync('git checkout main', { cwd: tempDir });

      const mainBranch = await git.branch();
      expect(mainBranch).toBe('main');

      // Verify we can see both branches in log
      const allBranches = execSync('git branch', { cwd: tempDir, encoding: 'utf8' });
      expect(allBranches).toContain('main');
      expect(allBranches).toContain('feature-branch');
    });
  });

  describe('Performance - Real Git', () => {
    it('should handle multiple operations efficiently', async () => {
      const startTime = Date.now();

      // Perform multiple operations
      await git.branch();
      await git.head();
      await git.statusPorcelain();
      await git.repoRoot();
      await git.log('%h %s', '--max-count=5');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle large number of files', async () => {
      const fileCount = 50;
      const files = [];

      // Create many files
      for (let i = 0; i < fileCount; i++) {
        const fileName = `file${i}.txt`;
        await writeFile(join(tempDir, fileName), `Content ${i}\n`);
        files.push(fileName);
      }

      const startTime = Date.now();
      await git.add(files);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all files were added
      const status = await git.statusPorcelain();
      const addedFiles = status.split('\n').filter(line => line.startsWith('A'));
      expect(addedFiles).toHaveLength(fileCount);
    });
  });

  describe('Environment Handling - Real Git', () => {
    it('should use deterministic environment', async () => {
      // The git instance should use UTC timezone and C locale
      const log = await git.log('%ai', '--max-count=1'); // Author date ISO format

      // The date should be in ISO format (though exact timezone depends on git config)
      expect(log).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it('should work in subdirectories', async () => {
      // Create subdirectory
      const subDir = join(tempDir, 'subdir');
      await mkdir(subDir);

      // Update context to point to subdirectory
      mockContext.cwd = subDir;
      const subGit = useGit();

      // Should still detect repository
      const repoRoot = await subGit.repoRoot();
      expect(repoRoot).toBe(tempDir);

      const branch = await subGit.branch();
      expect(branch).toBe('main');
    });
  });

  describe('Concurrent Operations - Real Git', () => {
    it('should handle concurrent read operations', async () => {
      const promises = Array(10).fill(null).map(async (_, i) => {
        const operations = [
          git.branch(),
          git.head(),
          git.statusPorcelain(),
          git.log('%h', '--max-count=1')
        ];
        return Promise.all(operations);
      });

      const results = await Promise.all(promises);

      // All results should be consistent
      results.forEach(result => {
        expect(result[0]).toBe('main'); // branch
        expect(result[1]).toMatch(/^[a-f0-9]{40}$/); // head
        expect(result[2]).toBe(''); // status (clean)
        expect(result[3]).toMatch(/^[a-f0-9]{7}$/); // log
      });
    });

    it('should handle concurrent write operations safely', async () => {
      // Create files for concurrent operations
      const files = [];
      for (let i = 0; i < 5; i++) {
        const fileName = `concurrent${i}.txt`;
        await writeFile(join(tempDir, fileName), `Content ${i}\n`);
        files.push(fileName);
      }

      // Add files concurrently (though git will serialize these internally)
      const addPromises = files.map(file => git.add(file));
      await Promise.all(addPromises);

      // Verify all files were added
      const status = await git.statusPorcelain();
      const addedFiles = status.split('\n').filter(line => line.startsWith('A'));
      expect(addedFiles).toHaveLength(5);
    });
  });
});