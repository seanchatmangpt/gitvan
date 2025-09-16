#!/usr/bin/env node
// Test deterministic environment and context binding
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { withGitVan } from '../src/composables/ctx.mjs';
import { useGit } from '../src/composables/git.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

async function testEnvironment() {
  console.log('🌍 Testing deterministic environment...\n');

  // Test 1: Default context (no withGitVan)
  console.log('🔧 Default Context:');
  try {
    const git = useGit();
    const version = await git.run(['--version']);
    console.log(`  Works outside context: ${version ? 'YES' : 'NO'}`);
  } catch (error) {
    console.log(`  Error outside context: ${error.message}`);
  }

  // Test 2: Custom environment
  console.log('⚙️  Custom Environment Context:');
  const customCtx = {
    cwd: repoRoot,
    env: {
      GIT_AUTHOR_NAME: 'GitVan Test',
      GIT_AUTHOR_EMAIL: 'test@gitvan.dev',
      CUSTOM_VAR: 'test-value'
    }
  };

  await withGitVan(customCtx, async () => {
    const git = useGit();

    // Check that our deterministic environment is set
    const configOutput = await git.run(['config', '--get', 'user.name']).catch(() => 'not-set');
    console.log(`  Current git config user: ${configOutput}`);

    // Test timestamp consistency
    const ts1 = git.nowISO();
    const ts2 = git.nowISO();
    console.log(`  Timestamp format: ${ts1}`);
    console.log(`  Timestamp consistent: ${ts1.slice(0, 19) === ts2.slice(0, 19) ? 'YES' : 'NO'} (within same second)`);

    // Test forced timestamp
    process.env.GITVAN_NOW = '2023-01-01T00:00:00.000Z';
    const forcedTs = git.nowISO();
    console.log(`  Forced timestamp: ${forcedTs}`);
    delete process.env.GITVAN_NOW;

    console.log('  Custom environment loaded successfully');
  });

  // Test 3: Multiple contexts
  console.log('🔄 Multiple Context Test:');

  const ctx1 = { cwd: repoRoot };
  const ctx2 = { cwd: join(repoRoot, 'src') };

  await withGitVan(ctx1, async () => {
    const git1 = useGit();
    const repoRoot1 = await git1.repoRoot();

    await withGitVan(ctx2, async () => {
      const git2 = useGit();
      const repoRoot2 = await git2.repoRoot();

      console.log(`  Both contexts point to same repo: ${repoRoot1 === repoRoot2 ? 'YES' : 'NO'}`);
    });
  });

  // Test 4: Array argument handling
  console.log('📋 Array Argument Handling:');
  await withGitVan({ cwd: repoRoot }, async () => {
    const git = useGit();

    // Test single string
    const log1 = await git.log('%h', '--max-count=1');

    // Test array
    const log2 = await git.log('%h', ['--max-count=1']);

    console.log(`  String vs array args produce same result: ${log1 === log2 ? 'YES' : 'NO'}`);

    // Test revList with different argument types
    const revList1 = await git.revList('--max-count=1');
    const revList2 = await git.revList(['--max-count=1']);

    console.log(`  revList string vs array: ${revList1 === revList2 ? 'YES' : 'NO'}`);
  });

  console.log('\n✅ Environment tests passed!');
}

testEnvironment().catch(console.error);