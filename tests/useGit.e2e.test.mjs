/**
 * useGit() End-to-End Tests - Complete Workflows
 * Tests complete workflows with real git operations and no mocking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

// Import useGit directly - no mocking for E2E tests
const { useGit } = await import('../src/composables/git.mjs');

describe('useGit() E2E Tests - Complete Workflows', () => {
  let tempDir;
  let git;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitvan-e2e-'));

    // Initialize git repository with proper config
    execSync('git init', { cwd: tempDir });
    execSync('git config user.name "E2E Test User"', { cwd: tempDir });
    execSync('git config user.email "e2e@example.com"', { cwd: tempDir });
    execSync('git config init.defaultBranch main', { cwd: tempDir });

    // Set process cwd for useGit context
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    git = useGit();

    // Restore original cwd but keep the git instance
    process.chdir(originalCwd);
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Complete Development Workflow', () => {
    it('should complete a full development cycle', async () => {
      // 1. Initial repository setup
      await writeFile(join(tempDir, 'README.md'), '# Project\n\nInitial setup');
      await writeFile(join(tempDir, '.gitignore'), 'node_modules/\n.env\n');

      // Stage and commit initial files
      const gitWithCwd = createGitWithCwd(tempDir);
      await gitWithCwd.add(['README.md', '.gitignore']);
      await gitWithCwd.commit('Initial project setup');

      // Verify initial state
      const initialBranch = await gitWithCwd.branch();
      expect(initialBranch).toBe('main');

      const status1 = await gitWithCwd.statusPorcelain();
      expect(status1).toBe('');

      // 2. Feature development
      await writeFile(join(tempDir, 'src/index.js'), 'console.log("Hello World");\n');
      await mkdir(join(tempDir, 'src'), { recursive: true });
      await writeFile(join(tempDir, 'src/index.js'), 'console.log("Hello World");\n');

      await writeFile(join(tempDir, 'package.json'), JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        main: 'src/index.js'
      }, null, 2));

      // Stage new files
      await gitWithCwd.add(['src/index.js', 'package.json']);

      // Check staging status
      const status2 = await gitWithCwd.statusPorcelain();
      expect(status2).toContain('A  src/index.js');
      expect(status2).toContain('A  package.json');

      // Commit feature
      await gitWithCwd.commit('Add initial JavaScript module');

      // 3. Add documentation
      await writeFile(join(tempDir, 'docs/api.md'), '# API Documentation\n\n## Functions\n\n### hello()\n\nPrints hello world');
      await mkdir(join(tempDir, 'docs'), { recursive: true });
      await writeFile(join(tempDir, 'docs/api.md'), '# API Documentation\n\n## Functions\n\n### hello()\n\nPrints hello world');

      await gitWithCwd.add('docs/api.md');
      await gitWithCwd.commit('Add API documentation');

      // 4. Create release tag
      await gitWithCwd.tag('v1.0.0', 'First stable release');

      // 5. Verify commit history
      const log = await gitWithCwd.log('%h %s');
      const logLines = log.split('\n');
      expect(logLines).toHaveLength(3);
      expect(logLines[0]).toContain('Add API documentation');
      expect(logLines[1]).toContain('Add initial JavaScript module');
      expect(logLines[2]).toContain('Initial project setup');

      // 6. Verify tag was created
      const tagOutput = execSync('git tag', { cwd: tempDir, encoding: 'utf8' });
      expect(tagOutput.trim()).toBe('v1.0.0');

      // 7. Check repository info
      const head = await gitWithCwd.head();
      expect(head).toMatch(/^[a-f0-9]{40}$/);

      const repoRoot = await gitWithCwd.repoRoot();
      expect(repoRoot).toBe(tempDir);
    });

    it('should handle branching and merging workflow', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Initial setup
      await writeFile(join(tempDir, 'main.js'), 'console.log("main");\n');
      await gitWithCwd.add('main.js');
      await gitWithCwd.commit('Initial commit');

      const mainHead = await gitWithCwd.head();

      // Create feature branch (using execSync for branch creation)
      execSync('git checkout -b feature/new-function', { cwd: tempDir });

      // Verify branch switch
      const featureBranch = await gitWithCwd.branch();
      expect(featureBranch).toBe('feature/new-function');

      // Develop feature
      await writeFile(join(tempDir, 'feature.js'), 'function newFeature() { return "feature"; }\n');
      await gitWithCwd.add('feature.js');
      await gitWithCwd.commit('Add new feature function');

      const featureHead = await gitWithCwd.head();
      expect(featureHead).not.toBe(mainHead);

      // Switch back to main
      execSync('git checkout main', { cwd: tempDir });

      const backToMain = await gitWithCwd.branch();
      expect(backToMain).toBe('main');

      // Verify ancestor relationship
      const isAncestor = await gitWithCwd.isAncestor(mainHead, featureHead);
      expect(isAncestor).toBe(true);

      const mergeBase = await gitWithCwd.mergeBase('main', 'feature/new-function');
      expect(mergeBase).toBe(mainHead);

      // Make changes on main
      await writeFile(join(tempDir, 'main.js'), 'console.log("main updated");\n');
      await gitWithCwd.add('main.js');
      await gitWithCwd.commit('Update main');

      // Merge feature branch
      execSync('git merge feature/new-function --no-edit', { cwd: tempDir });

      // Verify merge
      const finalStatus = await gitWithCwd.statusPorcelain();
      expect(finalStatus).toBe('');

      const finalLog = await gitWithCwd.log('%s', '--max-count=4');
      expect(finalLog).toContain('Merge branch');
      expect(finalLog).toContain('Add new feature function');
      expect(finalLog).toContain('Update main');
    });
  });

  describe('Receipt System Workflow', () => {
    it('should implement complete receipt tracking', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Setup initial project
      await writeFile(join(tempDir, 'project.txt'), 'Project file\n');
      await gitWithCwd.add('project.txt');
      await gitWithCwd.commit('Initial project');

      const initialCommit = await gitWithCwd.head();

      // Add receipt for initial work
      await gitWithCwd.noteAdd('receipts/work', 'Completed initial setup\nTime: 2 hours\nTask: Project initialization');

      // Verify receipt was added
      const receipt1 = await gitWithCwd.noteShow('receipts/work');
      expect(receipt1).toContain('Completed initial setup');
      expect(receipt1).toContain('Time: 2 hours');

      // Make more changes
      await writeFile(join(tempDir, 'feature.txt'), 'Feature implementation\n');
      await gitWithCwd.add('feature.txt');
      await gitWithCwd.commit('Add feature');

      const featureCommit = await gitWithCwd.head();

      // Add receipt for feature work
      await gitWithCwd.noteAdd('receipts/work', 'Implemented new feature\nTime: 3 hours\nTask: Feature development', featureCommit);

      // Add review receipt
      await gitWithCwd.noteAdd('receipts/review', 'Code review completed\nReviewer: Senior Dev\nStatus: Approved', featureCommit);

      // Verify multiple receipts
      const workReceipt = await gitWithCwd.noteShow('receipts/work', featureCommit);
      const reviewReceipt = await gitWithCwd.noteShow('receipts/review', featureCommit);

      expect(workReceipt).toContain('Implemented new feature');
      expect(reviewReceipt).toContain('Code review completed');

      // Append additional information
      await gitWithCwd.noteAppend('receipts/work', 'Additional testing completed\nTime: 1 hour', featureCommit);

      const updatedReceipt = await gitWithCwd.noteShow('receipts/work', featureCommit);
      expect(updatedReceipt).toContain('Implemented new feature');
      expect(updatedReceipt).toContain('Additional testing completed');

      // Verify receipts are commit-specific
      const initialReceipt = await gitWithCwd.noteShow('receipts/work', initialCommit);
      expect(initialReceipt).toContain('Completed initial setup');
      expect(initialReceipt).not.toContain('Implemented new feature');
    });
  });

  describe('Lock System Workflow', () => {
    it('should implement atomic reference locking', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Setup repository
      await writeFile(join(tempDir, 'shared-resource.txt'), 'Shared resource\n');
      await gitWithCwd.add('shared-resource.txt');
      await gitWithCwd.commit('Add shared resource');

      const commitSha = await gitWithCwd.head();
      const lockRef = 'refs/locks/resource-lock';

      // Acquire lock
      const lockAcquired = await gitWithCwd.updateRefCreate(lockRef, commitSha);
      expect(lockAcquired).toBe(true);

      // Verify lock exists
      const lockCheck = execSync(`git show-ref --verify ${lockRef}`, {
        cwd: tempDir,
        encoding: 'utf8'
      });
      expect(lockCheck).toContain(commitSha);
      expect(lockCheck).toContain(lockRef);

      // Try to acquire same lock again
      const lockBlocked = await gitWithCwd.updateRefCreate(lockRef, commitSha);
      expect(lockBlocked).toBe(false);

      // Simulate concurrent lock attempts
      const concurrentAttempts = await Promise.all([
        gitWithCwd.updateRefCreate('refs/locks/concurrent-1', commitSha),
        gitWithCwd.updateRefCreate('refs/locks/concurrent-1', commitSha),
        gitWithCwd.updateRefCreate('refs/locks/concurrent-1', commitSha)
      ]);

      // Only one should succeed
      const successCount = concurrentAttempts.filter(result => result === true).length;
      expect(successCount).toBe(1);

      // Different locks should work independently
      const lock2Acquired = await gitWithCwd.updateRefCreate('refs/locks/resource-lock-2', commitSha);
      expect(lock2Acquired).toBe(true);

      // Verify both locks exist
      const allRefs = execSync('git for-each-ref refs/locks/', {
        cwd: tempDir,
        encoding: 'utf8'
      });
      expect(allRefs).toContain('refs/locks/resource-lock');
      expect(allRefs).toContain('refs/locks/resource-lock-2');
      expect(allRefs).toContain('refs/locks/concurrent-1');
    });
  });

  describe('Plumbing Operations Workflow', () => {
    it('should implement low-level git operations', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create test files
      await writeFile(join(tempDir, 'file1.txt'), 'Content of file 1\n');
      await writeFile(join(tempDir, 'file2.txt'), 'Content of file 2\n');

      // Hash objects
      const hash1 = await gitWithCwd.hashObject('file1.txt', { write: true });
      const hash2 = await gitWithCwd.hashObject('file2.txt', { write: true });

      expect(hash1).toMatch(/^[a-f0-9]{40}$/);
      expect(hash2).toMatch(/^[a-f0-9]{40}$/);
      expect(hash1).not.toBe(hash2);

      // Verify objects were written
      const content1 = await gitWithCwd.catFilePretty(hash1);
      const content2 = await gitWithCwd.catFilePretty(hash2);

      expect(content1).toBe('Content of file 1\n');
      expect(content2).toBe('Content of file 2\n');

      // Stage files and write tree
      await gitWithCwd.add(['file1.txt', 'file2.txt']);
      const treeHash = await gitWithCwd.writeTree();

      expect(treeHash).toMatch(/^[a-f0-9]{40}$/);

      // Examine tree content
      const treeContent = await gitWithCwd.catFilePretty(treeHash);
      expect(treeContent).toContain('file1.txt');
      expect(treeContent).toContain('file2.txt');
      expect(treeContent).toContain(hash1.substring(0, 12)); // Partial hash in tree
      expect(treeContent).toContain(hash2.substring(0, 12));

      // Test without writing
      await writeFile(join(tempDir, 'temp-file.txt'), 'Temporary content\n');
      const tempHash = await gitWithCwd.hashObject('temp-file.txt', { write: false });

      expect(tempHash).toMatch(/^[a-f0-9]{40}$/);

      // Verify object was not written
      try {
        await gitWithCwd.catFilePretty(tempHash);
        throw new Error('Object should not exist');
      } catch (error) {
        expect(error.message).not.toBe('Object should not exist');
      }
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle and recover from various error conditions', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Test handling non-existent files
      await expect(gitWithCwd.add('non-existent.txt')).rejects.toThrow();

      // Repository should still be functional
      const branch = await gitWithCwd.branch();
      expect(branch).toBe('main');

      // Test empty commit
      await expect(gitWithCwd.commit('Empty commit')).rejects.toThrow();

      // Add valid content and commit
      await writeFile(join(tempDir, 'recovery-test.txt'), 'Recovery content\n');
      await gitWithCwd.add('recovery-test.txt');
      await gitWithCwd.commit('Recovery commit');

      // Test invalid git operations
      await expect(gitWithCwd.run(['invalid-command'])).rejects.toThrow();

      // Repository should still work
      const status = await gitWithCwd.statusPorcelain();
      expect(status).toBe('');

      // Test missing notes
      await expect(gitWithCwd.noteShow('non-existent-ref')).rejects.toThrow();

      // Add valid note
      await gitWithCwd.noteAdd('test-notes', 'Test note content');
      const noteContent = await gitWithCwd.noteShow('test-notes');
      expect(noteContent).toBe('Test note content');

      // Test ancestor check with invalid refs
      const isAncestor = await gitWithCwd.isAncestor('invalid-ref');
      expect(isAncestor).toBe(false);
    });
  });

  describe('Performance and Scale Workflow', () => {
    it('should handle repository with many commits and files', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create initial commit
      await writeFile(join(tempDir, 'base.txt'), 'Base content\n');
      await gitWithCwd.add('base.txt');
      await gitWithCwd.commit('Base commit');

      const startTime = Date.now();

      // Create many commits
      for (let i = 1; i <= 20; i++) {
        await writeFile(join(tempDir, `file${i}.txt`), `Content ${i}\n`);
        await gitWithCwd.add(`file${i}.txt`);
        await gitWithCwd.commit(`Add file ${i}`);
      }

      const commitTime = Date.now() - startTime;
      expect(commitTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Test log performance
      const logStart = Date.now();
      const log = await gitWithCwd.log('%h %s', '--max-count=10');
      const logTime = Date.now() - logStart;

      expect(logTime).toBeLessThan(1000); // Should complete within 1 second

      const logLines = log.split('\n');
      expect(logLines).toHaveLength(10);

      // Test revision list performance
      const revListStart = Date.now();
      const revList = await gitWithCwd.revList(['--max-count=15', 'HEAD']);
      const revListTime = Date.now() - revListStart;

      expect(revListTime).toBeLessThan(1000);
      const revisions = revList.split('\n');
      expect(revisions).toHaveLength(15);

      // Test status performance with many files
      const statusStart = Date.now();
      const status = await gitWithCwd.statusPorcelain();
      const statusTime = Date.now() - statusStart;

      expect(statusTime).toBeLessThan(1000);
      expect(status).toBe(''); // Should be clean
    });

    it('should handle concurrent operations efficiently', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Setup repository
      await writeFile(join(tempDir, 'concurrent-test.txt'), 'Test content\n');
      await gitWithCwd.add('concurrent-test.txt');
      await gitWithCwd.commit('Concurrent test setup');

      const startTime = Date.now();

      // Run many read operations concurrently
      const readPromises = Array(20).fill(null).map(async (_, i) => {
        const operations = await Promise.all([
          gitWithCwd.branch(),
          gitWithCwd.head(),
          gitWithCwd.statusPorcelain(),
          gitWithCwd.repoRoot(),
          gitWithCwd.log('%h', '--max-count=1')
        ]);
        return operations;
      });

      const results = await Promise.all(readPromises);
      const concurrentTime = Date.now() - startTime;

      expect(concurrentTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all results are consistent
      results.forEach(result => {
        expect(result[0]).toBe('main'); // branch
        expect(result[1]).toMatch(/^[a-f0-9]{40}$/); // head
        expect(result[2]).toBe(''); // status
        expect(result[3]).toBe(tempDir); // repo root
        expect(result[4]).toMatch(/^[a-f0-9]{7}$/); // log
      });
    });
  });

  describe('Real-world Integration Scenarios', () => {
    it('should work with complex git repository states', async () => {
      const gitWithCwd = createGitWithCwd(tempDir);

      // Create complex repository structure
      await mkdir(join(tempDir, 'src/components'), { recursive: true });
      await mkdir(join(tempDir, 'tests/unit'), { recursive: true });
      await mkdir(join(tempDir, 'docs'), { recursive: true });

      // Add various file types
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
      await writeFile(join(tempDir, 'src/index.js'), 'export default {};\n');
      await writeFile(join(tempDir, 'src/components/Button.js'), 'export const Button = () => {};\n');
      await writeFile(join(tempDir, 'tests/unit/button.test.js'), 'test("button", () => {});\n');
      await writeFile(join(tempDir, 'docs/README.md'), '# Documentation\n');
      await writeFile(join(tempDir, '.gitignore'), 'node_modules/\n.env\n');

      // Stage and commit everything
      await gitWithCwd.add([
        'package.json',
        'src/index.js',
        'src/components/Button.js',
        'tests/unit/button.test.js',
        'docs/README.md',
        '.gitignore'
      ]);
      await gitWithCwd.commit('Initial complex structure');

      // Add receipts for different types of work
      await gitWithCwd.noteAdd('receipts/development', 'Created project structure\nFiles: 6\nTime: 1 hour');
      await gitWithCwd.noteAdd('receipts/testing', 'Added unit tests\nCoverage: Basic\nTime: 30 minutes');

      // Create multiple branches with different changes
      execSync('git checkout -b feature/ui-improvements', { cwd: tempDir });

      await writeFile(join(tempDir, 'src/components/Input.js'), 'export const Input = () => {};\n');
      await gitWithCwd.add('src/components/Input.js');
      await gitWithCwd.commit('Add Input component');

      execSync('git checkout -b feature/testing-enhancements', { cwd: tempDir });

      await writeFile(join(tempDir, 'tests/unit/input.test.js'), 'test("input", () => {});\n');
      await gitWithCwd.add('tests/unit/input.test.js');
      await gitWithCwd.commit('Add Input tests');

      // Switch back to main and verify state
      execSync('git checkout main', { cwd: tempDir });

      const mainBranch = await gitWithCwd.branch();
      expect(mainBranch).toBe('main');

      // Check that we can access notes from main branch
      const devReceipt = await gitWithCwd.noteShow('receipts/development');
      expect(devReceipt).toContain('Created project structure');

      // Verify branch relationships
      const branches = execSync('git branch', { cwd: tempDir, encoding: 'utf8' });
      expect(branches).toContain('feature/ui-improvements');
      expect(branches).toContain('feature/testing-enhancements');

      // Test merge operations
      execSync('git merge feature/ui-improvements --no-edit', { cwd: tempDir });
      execSync('git merge feature/testing-enhancements --no-edit', { cwd: tempDir });

      // Verify final state
      const finalStatus = await gitWithCwd.statusPorcelain();
      expect(finalStatus).toBe('');

      const finalLog = await gitWithCwd.log('%s', '--max-count=5');
      expect(finalLog).toContain('Merge branch');
      expect(finalLog).toContain('Add Input tests');
      expect(finalLog).toContain('Add Input component');

      // Add final receipt
      await gitWithCwd.noteAdd('receipts/completion', 'Project setup completed\nBranches merged\nStatus: Ready for deployment');

      const completionReceipt = await gitWithCwd.noteShow('receipts/completion');
      expect(completionReceipt).toContain('Ready for deployment');
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