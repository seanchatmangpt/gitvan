#!/usr/bin/env node
// Comprehensive test of all useGit() functionality
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { withGitVan } from '../src/composables/ctx.mjs';
import { useGit } from '../src/composables/git.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

async function runComprehensiveTest() {
  console.log('🚀 Comprehensive useGit() Test Suite\n');

  const ctx = {
    cwd: repoRoot,
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

    console.log('🔍 Repository Information:');
    await testAsync('branch() returns string', async () => {
      const branch = await git.branch();
      return typeof branch === 'string' && branch.length > 0;
    });

    await testAsync('head() returns SHA', async () => {
      const head = await git.head();
      return typeof head === 'string' && /^[a-f0-9]{40}$/.test(head);
    });

    await testAsync('repoRoot() returns path', async () => {
      const root = await git.repoRoot();
      return root.includes('gitvan');
    });

    await testAsync('worktreeGitDir() returns .git', async () => {
      const gitDir = await git.worktreeGitDir();
      return gitDir.includes('.git');
    });

    test('nowISO() returns ISO string', /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(git.nowISO()));

    console.log('\\n📖 Read-only Operations:');
    await testAsync('log() with default format', async () => {
      const log = await git.log();
      return log.includes('\t');
    });

    await testAsync('statusPorcelain() returns status', async () => {
      const status = await git.statusPorcelain();
      return typeof status === 'string';
    });

    await testAsync('isAncestor() with HEAD', async () => {
      const head = await git.head();
      return await git.isAncestor(head, head);
    });

    await testAsync('mergeBase() returns SHA', async () => {
      const head = await git.head();
      const base = await git.mergeBase(head, head);
      return base === head;
    });

    await testAsync('revList() with default args', async () => {
      const revs = await git.revList();
      return revs.length > 0;
    });

    await testAsync('revList() with custom args', async () => {
      const revs = await git.revList(['--max-count=1', 'HEAD']);
      return revs.split('\\n').length === 1;
    });

    console.log('\\n🔧 Plumbing Commands:');
    await testAsync('writeTree() returns tree SHA', async () => {
      const tree = await git.writeTree();
      return /^[a-f0-9]{40}$/.test(tree);
    });

    await testAsync('catFilePretty() shows content', async () => {
      const tree = await git.writeTree();
      const content = await git.catFilePretty(tree);
      return content.length > 0;
    });

    console.log('\\n⚙️ Generic Runners:');
    await testAsync('run() executes git command', async () => {
      const version = await git.run(['--version']);
      return version.includes('git version');
    });

    await testAsync('runVoid() executes without output', async () => {
      await git.runVoid(['status', '--porcelain']);
      return true;
    });

    console.log('\\n🔒 Atomic Operations:');
    await testAsync('updateRefCreate() creates new ref', async () => {
      const testRef = 'refs/gitvan/test-atomic';
      const head = await git.head();

      // Clean up any existing ref
      try {
        await git.runVoid(['update-ref', '-d', testRef]);
      } catch {}

      const created = await git.updateRefCreate(testRef, head);

      // Clean up
      try {
        await git.runVoid(['update-ref', '-d', testRef]);
      } catch {}

      return created === true;
    });

    await testAsync('updateRefCreate() fails for existing ref', async () => {
      const testRef = 'refs/gitvan/test-existing';
      const head = await git.head();

      // Create ref first
      await git.runVoid(['update-ref', testRef, head]);

      const created = await git.updateRefCreate(testRef, head);

      // Clean up
      await git.runVoid(['update-ref', '-d', testRef]);

      return created === false;
    });

    console.log('\\n📝 Notes Operations:');
    await testAsync('noteAdd() and noteShow() work', async () => {
      const noteRef = 'refs/notes/test-comprehensive';
      const message = 'Test message';
      const head = await git.head();

      await git.noteAdd(noteRef, message, head);
      const retrieved = await git.noteShow(noteRef, head);

      // Clean up
      await git.runVoid(['notes', `--ref=${noteRef}`, 'remove', head]);

      return retrieved === message;
    });

    await testAsync('noteAppend() works', async () => {
      const noteRef = 'refs/notes/test-append';
      const message1 = 'First message';
      const message2 = 'Second message';
      const head = await git.head();

      await git.noteAdd(noteRef, message1, head);
      await git.noteAppend(noteRef, message2, head);
      const final = await git.noteShow(noteRef, head);

      // Clean up
      await git.runVoid(['notes', `--ref=${noteRef}`, 'remove', head]);

      return final.includes(message1) && final.includes(message2);
    });

    console.log('\\n📊 Test Results:');
    console.log(`Passed: ${testsPassed}/${testsTotal}`);

    if (testsPassed === testsTotal) {
      console.log('\\n🎉 All tests passed! Implementation is fully functional.');
      return true;
    } else {
      console.log(`\\n⚠️  ${testsTotal - testsPassed} tests failed.`);
      return false;
    }
  });
}

runComprehensiveTest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });