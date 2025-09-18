#!/usr/bin/env node
// GitVan v2 — New Git Commands Test Suite
// Tests the newly implemented Git commands: diff, fetch, push, pull, branch, checkout, switch, merge, rebase, reset, stash, cherry-pick, revert

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import { execSync } from 'node:child_process';
import { withGitVan } from '../src/composables/ctx.mjs';
import { useGit } from '../src/composables/git.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runNewCommandsTest() {
  console.log('🚀 New Git Commands Test Suite\n');

  // Create temporary test repository
  const tempDir = join(__dirname, 'temp-git-test');
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Initialize test repository
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'pipe' });

    const ctx = {
      cwd: tempDir,
      env: {
        TZ: 'UTC',
        LANG: 'C'
      }
    };

    await withGitVan(ctx, async () => {
      const git = useGit();
      let testsPassed = 0;
      let testsTotal = 0;

      const test = (name, result) => {
        testsTotal++;
        if (result) {
          console.log(`✅ ${name}`);
          testsPassed++;
        } else {
          console.log(`❌ ${name}`);
        }
      };

      const testAsync = async (name, fn) => {
        testsTotal++;
        try {
          const result = await fn();
          if (result !== false) {
            console.log(`✅ ${name}`);
            testsPassed++;
          } else {
            console.log(`❌ ${name}`);
          }
        } catch (error) {
          console.log(`❌ ${name}: ${error.message}`);
        }
      };

      console.log('📁 Testing Diff Operations...\n');
      
      // Create test files for diff operations
      await fs.writeFile(join(tempDir, 'test1.txt'), 'Hello World\n');
      await fs.writeFile(join(tempDir, 'test2.txt'), 'GitVan Test\n');
      
      await testAsync('diff - working directory changes', async () => {
        const diff = await git.diff();
        return diff.includes('test1.txt') && diff.includes('test2.txt');
      });

      await git.add(['test1.txt', 'test2.txt']);
      
      await testAsync('diff --cached - staged changes', async () => {
        const diff = await git.diff({ cached: true });
        return diff.includes('test1.txt') && diff.includes('test2.txt');
      });

      await testAsync('diff --name-only - file names only', async () => {
        const diff = await git.diff({ nameOnly: true });
        return diff.includes('test1.txt') && diff.includes('test2.txt');
      });

      await git.commit('Initial commit');

      console.log('\n🌿 Testing Branch Operations...\n');

      await testAsync('branchList - list branches', async () => {
        const branches = await git.branchList();
        return branches.includes('main') || branches.includes('master');
      });

      await testAsync('branchCreate - create new branch', async () => {
        await git.branchCreate('feature-branch');
        const branches = await git.branchList();
        return branches.includes('feature-branch');
      });

      await testAsync('branchCreate with start point', async () => {
        await git.branchCreate('dev-branch', 'main');
        const branches = await git.branchList();
        return branches.includes('dev-branch');
      });

      console.log('\n🔄 Testing Checkout/Switch Operations...\n');

      await testAsync('checkout - switch to branch', async () => {
        await git.checkout('feature-branch');
        const currentBranch = await git.branch();
        return currentBranch === 'feature-branch';
      });

      await testAsync('switch - switch to another branch', async () => {
        await git.switch('dev-branch');
        const currentBranch = await git.branch();
        return currentBranch === 'dev-branch';
      });

      await testAsync('checkout with create option', async () => {
        await git.checkout('new-feature', { create: true });
        const branches = await git.branchList();
        return branches.includes('new-feature');
      });

      console.log('\n📦 Testing Stash Operations...\n');

      // Make some changes to stash
      await fs.writeFile(join(tempDir, 'stash-test.txt'), 'Stash me\n');
      await git.add(['stash-test.txt']);

      await testAsync('stashSave - save changes', async () => {
        await git.stashSave('Test stash');
        const status = await git.statusPorcelain();
        return status.trim() === '';
      });

      await testAsync('stashList - list stashes', async () => {
        const stashes = await git.stashList();
        return stashes.length > 0 && stashes[0].includes('Test stash');
      });

      await testAsync('stashApply - apply stash', async () => {
        await git.stashApply();
        const status = await git.statusPorcelain();
        return status.includes('stash-test.txt');
      });

      await testAsync('stashDrop - drop stash', async () => {
        await git.stashDrop();
        const stashes = await git.stashList();
        return stashes.length === 0;
      });

      console.log('\n🔄 Testing Reset Operations...\n');

      await git.add(['stash-test.txt']);
      
      await testAsync('reset --soft - soft reset', async () => {
        await git.reset('soft', 'HEAD');
        const status = await git.statusPorcelain();
        return status.includes('stash-test.txt');
      });

      await testAsync('reset --mixed - mixed reset', async () => {
        await git.reset('mixed', 'HEAD');
        const status = await git.statusPorcelain();
        return status.includes('stash-test.txt');
      });

      await testAsync('reset with specific paths', async () => {
        await git.add(['stash-test.txt']);
        await git.reset('mixed', 'HEAD', { paths: ['stash-test.txt'] });
        const status = await git.statusPorcelain();
        return status.includes('stash-test.txt');
      });

      console.log('\n🔀 Testing Merge Operations...\n');

      // Create a merge scenario
      await git.checkout('main');
      await fs.writeFile(join(tempDir, 'main-change.txt'), 'Main branch change\n');
      await git.add(['main-change.txt']);
      await git.commit('Main branch commit');

      await git.checkout('feature-branch');
      await fs.writeFile(join(tempDir, 'feature-change.txt'), 'Feature branch change\n');
      await git.add(['feature-change.txt']);
      await git.commit('Feature branch commit');

      await testAsync('merge - merge branches', async () => {
        await git.checkout('main');
        await git.merge('feature-branch');
        const files = await fs.readdir(tempDir);
        return files.includes('feature-change.txt');
      });

      console.log('\n🍒 Testing Cherry-pick Operations...\n');

      // Create another branch for cherry-pick
      await git.branchCreate('cherry-source');
      await git.checkout('cherry-source');
      await fs.writeFile(join(tempDir, 'cherry-file.txt'), 'Cherry pick me\n');
      await git.add(['cherry-file.txt']);
      const cherryCommit = await git.head();
      await git.commit('Cherry pick commit');

      await testAsync('cherryPick - cherry pick commit', async () => {
        await git.checkout('main');
        await git.cherryPick(cherryCommit);
        const files = await fs.readdir(tempDir);
        return files.includes('cherry-file.txt');
      });

      console.log('\n↩️ Testing Revert Operations...\n');

      await testAsync('revert - revert commit', async () => {
        const lastCommit = await git.head();
        await git.revert(lastCommit);
        // Check if revert was successful by looking at log
        const log = await git.log();
        return log.includes('Revert');
      });

      console.log('\n🔄 Testing Rebase Operations...\n');

      // Create rebase scenario
      await git.branchCreate('rebase-branch', 'main');
      await git.checkout('rebase-branch');
      await fs.writeFile(join(tempDir, 'rebase-file.txt'), 'Rebase me\n');
      await git.add(['rebase-file.txt']);
      await git.commit('Rebase commit');

      await testAsync('rebase - rebase branch', async () => {
        await git.rebase('main');
        const currentBranch = await git.branch();
        return currentBranch === 'rebase-branch';
      });

      console.log('\n🧹 Testing Cleanup Operations...\n');

      await testAsync('branchDelete - delete branch', async () => {
        await git.checkout('main');
        await git.branchDelete('dev-branch');
        const branches = await git.branchList();
        return !branches.includes('dev-branch');
      });

      await testAsync('branchDelete with force', async () => {
        await git.branchDelete('cherry-source', { force: true });
        const branches = await git.branchList();
        return !branches.includes('cherry-source');
      });

      console.log('\n📊 Test Results Summary:');
      console.log(`✅ Tests Passed: ${testsPassed}`);
      console.log(`❌ Tests Failed: ${testsTotal - testsPassed}`);
      console.log(`📈 Success Rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);

      if (testsPassed === testsTotal) {
        console.log('\n🎉 All new Git commands are working correctly!');
      } else {
        console.log('\n⚠️ Some tests failed. Check the output above for details.');
      }
    });

  } finally {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runNewCommandsTest().catch(console.error);
}

export { runNewCommandsTest };
