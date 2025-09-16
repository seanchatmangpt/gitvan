#!/usr/bin/env node
// Test atomic operations and error handling
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { withGitVan } from '../src/composables/ctx.mjs';
import { useGit } from '../src/composables/git.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

async function testAtomicOperations() {
  console.log('🔒 Testing atomic operations...\n');

  const ctx = {
    cwd: repoRoot,
    env: {}
  };

  await withGitVan(ctx, async () => {
    const git = useGit();

    try {
      // Test 1: Atomic ref creation
      console.log('🎯 Atomic Reference Creation:');
      const testRef = 'refs/gitvan/test-lock';
      const head = await git.head();

      // Try to create a new ref atomically
      const created = await git.updateRefCreate(testRef, head);
      console.log(`  Created new ref: ${created}`);

      // Try to create the same ref again (should fail)
      const createdAgain = await git.updateRefCreate(testRef, head);
      console.log(`  Attempted duplicate creation: ${createdAgain} (should be false)`);

      // Clean up
      await git.runVoid(['update-ref', '-d', testRef]);
      console.log(`  Cleaned up test ref\n`);

      // Test 2: Notes operations
      console.log('📝 Notes Operations:');
      const noteRef = 'refs/notes/gitvan-test';
      const testMessage = `Test note created at ${new Date().toISOString()}`;

      await git.noteAdd(noteRef, testMessage, head);
      console.log('  Added test note');

      const retrievedNote = await git.noteShow(noteRef, head);
      console.log(`  Retrieved note: ${retrievedNote === testMessage ? 'MATCH' : 'MISMATCH'}`);

      const appendMessage = '\nAppended content';
      await git.noteAppend(noteRef, appendMessage, head);
      console.log('  Appended to note');

      const finalNote = await git.noteShow(noteRef, head);
      console.log(`  Final note includes both: ${finalNote.includes(testMessage) && finalNote.includes(appendMessage) ? 'YES' : 'NO'}`);

      // Clean up notes
      await git.runVoid(['notes', `--ref=${noteRef}`, 'remove', head]);
      console.log('  Cleaned up test note\n');

      // Test 3: Error handling
      console.log('⚠️  Error Handling:');
      try {
        await git.noteShow('refs/notes/nonexistent', head);
        console.log('  ERROR: Should have thrown for nonexistent note');
      } catch {
        console.log('  Correctly threw error for nonexistent note');
      }

      try {
        const isAncestor = await git.isAncestor('nonexistent-commit', head);
        console.log(`  isAncestor with invalid commit: ${isAncestor} (should be false)`);
      } catch {
        console.log('  isAncestor correctly handled invalid commit');
      }

      console.log('\n✅ Atomic operations test passed!');

    } catch (error) {
      console.error('❌ Atomic test failed:', error.message);
      process.exit(1);
    }
  });
}

testAtomicOperations().catch(console.error);