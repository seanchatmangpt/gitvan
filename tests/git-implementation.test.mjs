#!/usr/bin/env node
// Test the new useGit() implementation
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { withGitVan } from '../src/composables/ctx.mjs';
import { useGit } from '../src/composables/git.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

async function testGitImplementation() {
  console.log('🧪 Testing useGit() implementation...\n');

  const ctx = {
    cwd: repoRoot,
    env: {}
  };

  await withGitVan(ctx, async () => {
    const git = useGit();

    try {
      // Test 1: Repository info
      console.log('📍 Repository Info:');
      const branch = await git.branch();
      console.log(`  Branch: ${branch}`);

      const head = await git.head();
      console.log(`  Head: ${head.substring(0, 8)}...`);

      const repoRoot = await git.repoRoot();
      console.log(`  Repo root: ${repoRoot}`);

      const gitDir = await git.worktreeGitDir();
      console.log(`  Git dir: ${gitDir}`);

      const timestamp = git.nowISO();
      console.log(`  Timestamp: ${timestamp}\n`);

      // Test 2: Status and log
      console.log('📋 Status & History:');
      const status = await git.statusPorcelain();
      console.log(`  Status: ${status ? 'Changes detected' : 'Clean'}`);

      const log = await git.log('%h %s', ['--max-count=3']);
      console.log(`  Recent commits:\n${log.split('\n').map(line => `    ${line}`).join('\n')}\n`);

      // Test 3: Notes operations (non-destructive)
      console.log('📝 Notes Operations:');
      try {
        await git.noteShow('refs/notes/test', head);
        console.log('  Found existing test note');
      } catch {
        console.log('  No existing test note (expected)');
      }

      // Test 4: Plumbing commands
      console.log('🔧 Plumbing Commands:');
      const treeHash = await git.writeTree();
      console.log(`  Current tree: ${treeHash.substring(0, 8)}...`);

      // Test 5: Generic runner
      console.log('⚙️  Generic Runner:');
      const version = await git.run(['--version']);
      console.log(`  Git version: ${version}\n`);

      console.log('✅ All tests passed! Implementation is working correctly.');

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    }
  });
}

testGitImplementation().catch(console.error);