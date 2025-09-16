/**
 * Git Integration Tests - Real Repository E2E Testing
 *
 * Tests the useGit() composable against real git repositories with:
 * - Deterministic environment (TZ=UTC, LANG=C)
 * - Real git command execution
 * - Complete workflow validation
 * - Error handling and edge cases
 * - Performance testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

// Import useGit directly - no mocking for E2E tests
const { useGit } = await import('../src/composables/git.mjs');

describe('Git E2E Integration Tests - Real Repository', () => {
  let tempDir;
  let git;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitvan-git-e2e-'));

    // Configure git with deterministic environment
    const gitEnv = {
      TZ: 'UTC',
      LANG: 'C',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
      GIT_AUTHOR_NAME: 'GitVan Test',
      GIT_AUTHOR_EMAIL: 'test@gitvan.dev',
      GIT_COMMITTER_NAME: 'GitVan Test',
      GIT_COMMITTER_EMAIL: 'test@gitvan.dev',
      GIT_AUTHOR_DATE: '2024-01-01T00:00:00Z',
      GIT_COMMITTER_DATE: '2024-01-01T00:00:00Z'
    };

    // Initialize git repository with deterministic settings
    execSync('git init', { cwd: tempDir, env: { ...process.env, ...gitEnv } });
    execSync('git config user.name "GitVan Test"', { cwd: tempDir });
    execSync('git config user.email "test@gitvan.dev"', { cwd: tempDir });
    execSync('git config init.defaultBranch main', { cwd: tempDir });
    execSync('git config advice.defaultBranchName false', { cwd: tempDir });

    // Ensure we're on main branch
    try {
      execSync('git checkout -b main', { cwd: tempDir });
    } catch {
      // Branch might already exist
    }

    // Set process cwd for useGit context
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    git = useGit();

    // Restore original cwd but keep the git instance bound to tempDir
    process.chdir(originalCwd);
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Git Operations', () => {
    it('should initialize repository and verify basic info', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create initial file to have a commit
      await writeFile(join(tempDir, 'initial.txt'), 'Initial content\n');
      await gitWithCwd.add('initial.txt');
      await gitWithCwd.commit('Initial commit');

      // Test repository info
      const branch = await gitWithCwd.branch();
      expect(branch).toBe('main');

      const head = await gitWithCwd.head();
      expect(head).toMatch(/^[a-f0-9]{40}$/);

      const repoRoot = await gitWithCwd.repoRoot();
      expect(repoRoot).toBe(tempDir);

      const gitDir = await gitWithCwd.worktreeGitDir();
      expect(gitDir).toBe(join(tempDir, '.git'));
    });

    it('should handle file operations correctly', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create test files
      await writeFile(join(tempDir, 'file1.txt'), 'Content 1\n');
      await writeFile(join(tempDir, 'file2.txt'), 'Content 2\n');

      // Test status before adding
      const status1 = await gitWithCwd.statusPorcelain();
      expect(status1).toContain('?? file1.txt');
      expect(status1).toContain('?? file2.txt');

      // Add files
      await gitWithCwd.add(['file1.txt', 'file2.txt']);

      // Test status after adding
      const status2 = await gitWithCwd.statusPorcelain();
      expect(status2).toContain('A  file1.txt');
      expect(status2).toContain('A  file2.txt');

      // Commit files
      await gitWithCwd.commit('Add test files');

      // Test status after commit
      const status3 = await gitWithCwd.statusPorcelain();
      expect(status3).toBe('');

      // Test log
      const log = await gitWithCwd.log('%h %s');
      expect(log).toContain('Add test files');
    });

    it('should handle empty operations gracefully', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Test adding empty array
      await gitWithCwd.add([]);
      // Should not throw

      // Test adding null/undefined values
      await gitWithCwd.add(['', null, undefined].filter(Boolean));
      // Should not throw
    });
  });

  describe('Branching and Merging', () => {
    it('should handle branch operations', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create initial commit
      await writeFile(join(tempDir, 'main.txt'), 'Main content\n');
      await gitWithCwd.add('main.txt');
      await gitWithCwd.commit('Initial commit on main');

      const mainHead = await gitWithCwd.head();

      // Create feature branch
      execSync('git checkout -b feature/test', { cwd: tempDir });

      // Verify branch switch
      const featureBranch = await gitWithCwd.branch();
      expect(featureBranch).toBe('feature/test');

      // Make changes on feature branch
      await writeFile(join(tempDir, 'feature.txt'), 'Feature content\n');
      await gitWithCwd.add('feature.txt');
      await gitWithCwd.commit('Add feature');

      const featureHead = await gitWithCwd.head();
      expect(featureHead).not.toBe(mainHead);

      // Test ancestor relationship
      const isAncestor = await gitWithCwd.isAncestor(mainHead, featureHead);
      expect(isAncestor).toBe(true);

      const mergeBase = await gitWithCwd.mergeBase('main', 'feature/test');
      expect(mergeBase).toBe(mainHead);

      // Switch back to main
      execSync('git checkout main', { cwd: tempDir });

      const backToMain = await gitWithCwd.branch();
      expect(backToMain).toBe('main');
    });

    it('should handle merge scenarios', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Setup initial state
      await writeFile(join(tempDir, 'shared.txt'), 'Shared content\n');
      await gitWithCwd.add('shared.txt');
      await gitWithCwd.commit('Initial shared file');

      // Create and work on feature branch
      execSync('git checkout -b feature/merge-test', { cwd: tempDir });
      await writeFile(join(tempDir, 'feature-only.txt'), 'Feature only content\n');
      await gitWithCwd.add('feature-only.txt');
      await gitWithCwd.commit('Add feature-only file');

      // Go back to main and make different changes
      execSync('git checkout main', { cwd: tempDir });
      await writeFile(join(tempDir, 'main-only.txt'), 'Main only content\n');
      await gitWithCwd.add('main-only.txt');
      await gitWithCwd.commit('Add main-only file');

      // Merge feature branch
      execSync('git merge feature/merge-test --no-edit', { cwd: tempDir });

      // Verify merge result
      const status = await gitWithCwd.statusPorcelain();
      expect(status).toBe('');

      const log = await gitWithCwd.log('%s', '--max-count=3');
      expect(log).toContain('Merge branch');
      expect(log).toContain('Add main-only file');
      expect(log).toContain('Add feature-only file');
    });
  });

  describe('Notes and Receipts System', () => {
    it('should handle git notes operations', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create initial commit
      await writeFile(join(tempDir, 'work.txt'), 'Work content\n');
      await gitWithCwd.add('work.txt');
      await gitWithCwd.commit('Initial work');

      const commitSha = await gitWithCwd.head();

      // Add note to current commit
      await gitWithCwd.noteAdd('receipts/work', 'Work completed\nTime: 2 hours\nStatus: Done');

      // Verify note was added
      const note1 = await gitWithCwd.noteShow('receipts/work');
      expect(note1).toBe('Work completed\nTime: 2 hours\nStatus: Done');

      // Add note with specific commit
      await gitWithCwd.noteAdd('receipts/review', 'Review completed\nReviewer: Senior Dev', commitSha);

      const note2 = await gitWithCwd.noteShow('receipts/review', commitSha);
      expect(note2).toBe('Review completed\nReviewer: Senior Dev');

      // Test note append
      await gitWithCwd.noteAppend('receipts/work', 'Additional info\nUpdate: Bug fixed');

      const updatedNote = await gitWithCwd.noteShow('receipts/work');
      expect(updatedNote).toContain('Work completed');
      expect(updatedNote).toContain('Additional info');
      expect(updatedNote).toContain('Update: Bug fixed');

      // Create another commit and add different notes
      await writeFile(join(tempDir, 'more-work.txt'), 'More work\n');
      await gitWithCwd.add('more-work.txt');
      await gitWithCwd.commit('More work done');

      const newCommitSha = await gitWithCwd.head();

      await gitWithCwd.noteAdd('receipts/work', 'Second work session\nTime: 1 hour', newCommitSha);

      // Verify notes are commit-specific
      const oldNote = await gitWithCwd.noteShow('receipts/work', commitSha);
      const newNote = await gitWithCwd.noteShow('receipts/work', newCommitSha);

      expect(oldNote).toContain('Work completed');
      expect(oldNote).not.toContain('Second work session');
      expect(newNote).toBe('Second work session\nTime: 1 hour');
    });
  });

  describe('Atomic Locking System', () => {
    it('should implement atomic reference operations', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create initial commit to have a valid SHA
      await writeFile(join(tempDir, 'lock-test.txt'), 'Lock test content\n');
      await gitWithCwd.add('lock-test.txt');
      await gitWithCwd.commit('Lock test commit');

      const commitSha = await gitWithCwd.head();
      const lockRef = 'refs/locks/test-lock';

      // Test successful lock creation
      const lockCreated = await gitWithCwd.updateRefCreate(lockRef, commitSha);
      expect(lockCreated).toBe(true);

      // Test that same lock cannot be created again
      const lockBlocked = await gitWithCwd.updateRefCreate(lockRef, commitSha);
      expect(lockBlocked).toBe(false);

      // Verify lock exists with correct SHA
      const lockOutput = execSync(`git show-ref --verify ${lockRef}`, {
        cwd: tempDir,
        encoding: 'utf8'
      });
      expect(lockOutput.trim()).toBe(`${commitSha} ${lockRef}`);

      // Test different lock can be created
      const differentLock = await gitWithCwd.updateRefCreate('refs/locks/different-lock', commitSha);
      expect(differentLock).toBe(true);

      // Verify both locks exist
      const allLocks = execSync('git for-each-ref refs/locks/', {
        cwd: tempDir,
        encoding: 'utf8'
      });
      expect(allLocks).toContain('refs/locks/test-lock');
      expect(allLocks).toContain('refs/locks/different-lock');
    });

    it('should handle concurrent lock attempts properly', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Setup
      await writeFile(join(tempDir, 'concurrent.txt'), 'Concurrent test\n');
      await gitWithCwd.add('concurrent.txt');
      await gitWithCwd.commit('Concurrent test setup');

      const commitSha = await gitWithCwd.head();

      // Test sequential attempts (should be deterministic)
      const attempt1 = await gitWithCwd.updateRefCreate('refs/locks/sequential-1', commitSha);
      const attempt2 = await gitWithCwd.updateRefCreate('refs/locks/sequential-1', commitSha);
      const attempt3 = await gitWithCwd.updateRefCreate('refs/locks/sequential-1', commitSha);

      expect(attempt1).toBe(true);
      expect(attempt2).toBe(false);
      expect(attempt3).toBe(false);

      // Test different locks work independently
      const independent1 = await gitWithCwd.updateRefCreate('refs/locks/independent-1', commitSha);
      const independent2 = await gitWithCwd.updateRefCreate('refs/locks/independent-2', commitSha);
      const independent3 = await gitWithCwd.updateRefCreate('refs/locks/independent-3', commitSha);

      expect(independent1).toBe(true);
      expect(independent2).toBe(true);
      expect(independent3).toBe(true);
    });
  });

  describe('Git Plumbing Operations', () => {
    it('should handle low-level git operations', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create test files
      await writeFile(join(tempDir, 'content1.txt'), 'First file content\n');
      await writeFile(join(tempDir, 'content2.txt'), 'Second file content\n');

      // Test hash-object without writing
      const hash1 = await gitWithCwd.hashObject('content1.txt', { write: false });
      expect(hash1).toMatch(/^[a-f0-9]{40}$/);

      // Test hash-object with writing
      const hash2 = await gitWithCwd.hashObject('content2.txt', { write: true });
      expect(hash2).toMatch(/^[a-f0-9]{40}$/);

      // Verify written object can be retrieved
      const content2 = await gitWithCwd.catFilePretty(hash2);
      expect(content2).toBe('Second file content\n');

      // Test that non-written object cannot be retrieved
      try {
        await gitWithCwd.catFilePretty(hash1);
        expect.fail('Should have thrown for non-written object');
      } catch (error) {
        expect(error.message).toContain('does not exist');
      }

      // Test write-tree operation
      await gitWithCwd.add(['content1.txt', 'content2.txt']);
      const treeHash = await gitWithCwd.writeTree();
      expect(treeHash).toMatch(/^[a-f0-9]{40}$/);

      // Verify tree content
      const treeContent = await gitWithCwd.catFilePretty(treeHash);
      expect(treeContent).toContain('content1.txt');
      expect(treeContent).toContain('content2.txt');
    });

    it('should handle absolute and relative paths', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create file with absolute path
      const absolutePath = join(tempDir, 'absolute-test.txt');
      await writeFile(absolutePath, 'Absolute path content\n');

      // Test with absolute path
      const hashAbs = await gitWithCwd.hashObject(absolutePath, { write: true });
      expect(hashAbs).toMatch(/^[a-f0-9]{40}$/);

      // Test with relative path
      const hashRel = await gitWithCwd.hashObject('absolute-test.txt', { write: false });
      expect(hashRel).toBe(hashAbs); // Should be same hash

      const content = await gitWithCwd.catFilePretty(hashAbs);
      expect(content).toBe('Absolute path content\n');
    });
  });

  describe('Deterministic Environment', () => {
    it('should respect TZ=UTC and LANG=C environment', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Verify environment is set correctly
      expect(process.env.TZ).toBe('UTC');
      expect(process.env.LANG).toBe('C');

      // Create commit with known timestamp
      process.env.GITVAN_NOW = '2024-01-01T12:00:00.000Z';

      await writeFile(join(tempDir, 'timestamp-test.txt'), 'Timestamp test\n');
      await gitWithCwd.add('timestamp-test.txt');
      await gitWithCwd.commit('Timestamp test commit');

      // Verify ISO timestamp format
      const iso = gitWithCwd.nowISO();
      expect(iso).toBe('2024-01-01T12:00:00.000Z');

      // Clean up environment
      delete process.env.GITVAN_NOW;
    });

    it('should produce consistent output format', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create commit
      await writeFile(join(tempDir, 'format-test.txt'), 'Format test\n');
      await gitWithCwd.add('format-test.txt');
      await gitWithCwd.commit('Format test commit');

      // Test various log formats
      const shortLog = await gitWithCwd.log('%h');
      expect(shortLog).toMatch(/^[a-f0-9]{7}$/);

      const fullLog = await gitWithCwd.log('%H');
      expect(fullLog).toMatch(/^[a-f0-9]{40}$/);

      const messageLog = await gitWithCwd.log('%s');
      expect(messageLog).toBe('Format test commit');

      const customLog = await gitWithCwd.log('%h%x09%s');
      expect(customLog).toMatch(/^[a-f0-9]{7}\tFormat test commit$/);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing references gracefully', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Test isAncestor with invalid refs
      const badAncestor = await gitWithCwd.isAncestor('invalid-ref');
      expect(badAncestor).toBe(false);

      const badAncestor2 = await gitWithCwd.isAncestor('HEAD', 'invalid-ref');
      expect(badAncestor2).toBe(false);

      // Test with empty repository (no commits yet)
      await expect(gitWithCwd.branch()).rejects.toThrow();
      await expect(gitWithCwd.head()).rejects.toThrow();

      // Repository should still be functional after errors
      await writeFile(join(tempDir, 'recovery.txt'), 'Recovery test\n');
      await gitWithCwd.add('recovery.txt');
      await gitWithCwd.commit('Recovery commit');

      // Now these should work
      const branch = await gitWithCwd.branch();
      expect(branch).toBe('main');

      const head = await gitWithCwd.head();
      expect(head).toMatch(/^[a-f0-9]{40}$/);
    });

    it('should handle invalid git operations', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Setup valid state first
      await writeFile(join(tempDir, 'error-test.txt'), 'Error test\n');
      await gitWithCwd.add('error-test.txt');
      await gitWithCwd.commit('Error test setup');

      // Test invalid commands
      await expect(gitWithCwd.run(['invalid-command'])).rejects.toThrow();
      await expect(gitWithCwd.run(['log', '--invalid-option'])).rejects.toThrow();

      // Test missing files
      await expect(gitWithCwd.add('missing-file.txt')).rejects.toThrow();

      // Test invalid note operations
      await expect(gitWithCwd.noteShow('non-existent-notes')).rejects.toThrow();

      // Repository should remain functional
      const status = await gitWithCwd.statusPorcelain();
      expect(status).toBe('');
    });

    it('should handle boundary conditions', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Test with empty commit message (should fail)
      await writeFile(join(tempDir, 'boundary-test.txt'), 'Boundary test\n');
      await gitWithCwd.add('boundary-test.txt');
      await expect(gitWithCwd.commit('')).rejects.toThrow();

      // Test with very long commit message
      const longMessage = 'A'.repeat(1000);
      await gitWithCwd.commit(longMessage);

      const log = await gitWithCwd.log('%s', '--max-count=1');
      expect(log).toBe(longMessage);

      // Test with special characters in commit message
      await writeFile(join(tempDir, 'special-chars.txt'), 'Special chars test\n');
      await gitWithCwd.add('special-chars.txt');
      await gitWithCwd.commit('Commit with "quotes" and \'apostrophes\' and 💻 emoji');

      const specialLog = await gitWithCwd.log('%s', '--max-count=1');
      expect(specialLog).toBe('Commit with "quotes" and \'apostrophes\' and 💻 emoji');
    });
  });

  describe('Performance and Scale', () => {
    it('should handle repositories with multiple commits efficiently', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create many commits quickly
      const startTime = Date.now();

      for (let i = 1; i <= 50; i++) {
        await writeFile(join(tempDir, `file${i}.txt`), `Content ${i}\n`);
        await gitWithCwd.add(`file${i}.txt`);
        await gitWithCwd.commit(`Commit ${i}`);
      }

      const commitTime = Date.now() - startTime;
      expect(commitTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Test log performance
      const logStart = Date.now();
      const log = await gitWithCwd.log('%h %s', '--max-count=20');
      const logTime = Date.now() - logStart;

      expect(logTime).toBeLessThan(2000); // Should be fast
      const logLines = log.split('\n');
      expect(logLines).toHaveLength(20);

      // Test revision list
      const revList = await gitWithCwd.revList(['--max-count=10', 'HEAD']);
      const revisions = revList.split('\n').filter(Boolean);
      expect(revisions).toHaveLength(10);
      revisions.forEach(rev => {
        expect(rev).toMatch(/^[a-f0-9]{40}$/);
      });
    });

    it('should handle concurrent read operations', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Setup repository
      await writeFile(join(tempDir, 'concurrent-reads.txt'), 'Concurrent test\n');
      await gitWithCwd.add('concurrent-reads.txt');
      await gitWithCwd.commit('Concurrent reads test');

      // Run multiple read operations concurrently
      const operations = Array(10).fill(null).map(async () => {
        const results = await Promise.all([
          gitWithCwd.branch(),
          gitWithCwd.head(),
          gitWithCwd.repoRoot(),
          gitWithCwd.statusPorcelain(),
          gitWithCwd.log('%h', '--max-count=1')
        ]);
        return results;
      });

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete quickly

      // Verify all results are consistent
      results.forEach(result => {
        expect(result[0]).toBe('main'); // branch
        expect(result[1]).toMatch(/^[a-f0-9]{40}$/); // head
        expect(result[2]).toBe(tempDir); // repo root
        expect(result[3]).toBe(''); // status
        expect(result[4]).toMatch(/^[a-f0-9]{7}$/); // log
      });
    });
  });

  describe('Integration with Real Git Commands', () => {
    it('should be compatible with external git commands', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create initial state with useGit
      await writeFile(join(tempDir, 'integration.txt'), 'Integration test\n');
      await gitWithCwd.add('integration.txt');
      await gitWithCwd.commit('Integration test commit');

      // Use external git command to create branch
      execSync('git checkout -b external-branch', { cwd: tempDir });

      // Verify useGit can see the external change
      const branch = await gitWithCwd.branch();
      expect(branch).toBe('external-branch');

      // Make changes with external git
      execSync('echo "External change" > external.txt', { cwd: tempDir, shell: true });
      execSync('git add external.txt', { cwd: tempDir });
      execSync('git commit -m "External commit"', { cwd: tempDir });

      // Verify useGit can see external changes
      const status = await gitWithCwd.statusPorcelain();
      expect(status).toBe('');

      const log = await gitWithCwd.log('%s', '--max-count=1');
      expect(log).toBe('External commit');

      // Make changes with useGit and verify external git can see them
      await writeFile(join(tempDir, 'useGit-change.txt'), 'useGit change\n');
      await gitWithCwd.add('useGit-change.txt');
      await gitWithCwd.commit('useGit commit');

      const externalLog = execSync('git log --oneline -1', {
        cwd: tempDir,
        encoding: 'utf8'
      });
      expect(externalLog).toContain('useGit commit');
    });
  });

  // Helper function to create git instance with specific cwd
  function createGitWithCwd(cwd) {
    const originalCwd = process.cwd();
    process.chdir(cwd);
    const gitInstance = useGit();
    process.chdir(originalCwd);
    return gitInstance;
  }
});