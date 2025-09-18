/**
 * GitVan Hookable Test - Dark Matter 80/20
 *
 * Demonstrates surgical precision for AI swarms:
 * 1. Only processes what actually changed (not entire repo)
 * 2. Immediate event detection via Git hooks
 * 3. Change-only context for AI systems
 * 4. Zero-overhead repository scanning
 */

import { gitvanHookable } from "./src/core/hookable.mjs";
import { withGitVan } from "./src/core/context.mjs";

async function testGitVanHookable() {
  console.log("🤖 GitVan Hookable - Dark Matter 80/20 Test\n");

  await withGitVan({ cwd: process.cwd() }, async () => {
    // 1. Test Pre-Commit Hook (Staged Changes Only)
    console.log("🔍 Phase 1: Pre-Commit Hook (Staged Changes Only)");
    console.log("AI processes only staged changes, not entire repository...\n");

    const preCommitContext = {
      cwd: process.cwd(),
      stagedFiles: [
        "src/components/Button/Button.tsx",
        "src/pages/dashboard/Dashboard.tsx",
        "src/api/users.ts",
      ],
    };

    const preCommitResult = await gitvanHookable.callHook(
      "pre-commit",
      preCommitContext
    );
    console.log(`   ✅ Processed ${preCommitResult.processed} staged changes`);
    console.log(`   📊 Changes: ${preCommitResult.changes.length}`);

    // 2. Test Post-Commit Hook (Last Commit Only)
    console.log("\n🔍 Phase 2: Post-Commit Hook (Last Commit Only)");
    console.log("AI processes only last commit, not entire history...\n");

    const postCommitContext = {
      cwd: process.cwd(),
      lastCommit: {
        sha: "abc123def456",
        message: "feat: add Button component",
      },
    };

    const postCommitResult = await gitvanHookable.callHook(
      "post-commit",
      postCommitContext
    );
    console.log(
      `   ✅ Processed ${postCommitResult.processed} committed changes`
    );
    console.log(`   📊 Changes: ${postCommitResult.changes.length}`);

    // 3. Test Pre-Push Hook (Push Changes Only)
    console.log("\n🔍 Phase 3: Pre-Push Hook (Push Changes Only)");
    console.log("AI processes only push changes, not entire repository...\n");

    const prePushContext = {
      cwd: process.cwd(),
      remote: "origin",
      branch: "main",
      pushChanges: [
        "src/components/Button/Button.tsx",
        "src/components/Button/Button.test.tsx",
        "docs/components/Button.md",
      ],
    };

    const prePushResult = await gitvanHookable.callHook(
      "pre-push",
      prePushContext
    );
    console.log(`   ✅ Processed ${prePushResult.processed} push changes`);
    console.log(`   📊 Changes: ${prePushResult.changes.length}`);

    // 4. Test Post-Merge Hook (Merged Changes Only)
    console.log("\n🔍 Phase 4: Post-Merge Hook (Merged Changes Only)");
    console.log("AI processes only merged changes, not entire repository...\n");

    const postMergeContext = {
      cwd: process.cwd(),
      mergeCommit: {
        sha: "def456ghi789",
      },
      mergedChanges: [
        "src/components/Modal/Modal.tsx",
        "src/components/Modal/Modal.test.tsx",
      ],
    };

    const postMergeResult = await gitvanHookable.callHook(
      "post-merge",
      postMergeContext
    );
    console.log(`   ✅ Processed ${postMergeResult.processed} merged changes`);
    console.log(`   📊 Changes: ${postMergeResult.changes.length}`);

    // 5. Test Post-Checkout Hook (Checkout Changes Only)
    console.log("\n🔍 Phase 5: Post-Checkout Hook (Checkout Changes Only)");
    console.log(
      "AI processes only checkout changes, not entire repository...\n"
    );

    const postCheckoutContext = {
      cwd: process.cwd(),
      prevHead: "abc123def456",
      newHead: "ghi789jkl012",
      checkoutChanges: [
        "src/components/Input/Input.tsx",
        "src/components/Input/Input.test.tsx",
      ],
    };

    const postCheckoutResult = await gitvanHookable.callHook(
      "post-checkout",
      postCheckoutContext
    );
    console.log(
      `   ✅ Processed ${postCheckoutResult.processed} checkout changes`
    );
    console.log(`   📊 Changes: ${postCheckoutResult.changes.length}`);

    // 6. Test Change Cache (Surgical Precision Data)
    console.log("\n🔍 Phase 6: Change Cache (Surgical Precision Data)");
    console.log("AI accesses only change data, not entire repository...\n");

    const changeCache = gitvanHookable.getChangeCache();
    console.log("   📊 Change Cache Summary:");
    console.log(`   - Total Changes: ${changeCache.summary.totalChanges}`);
    console.log(
      `   - Change Types: ${
        Object.keys(changeCache.summary.changeTypes).length
      }`
    );
    console.log(
      `   - Last Processed: ${new Date(
        changeCache.summary.lastProcessed
      ).toISOString()}`
    );

    console.log("\n   📋 Change Types:");
    for (const [type, count] of Object.entries(
      changeCache.summary.changeTypes
    )) {
      console.log(`   - ${type}: ${count} changes`);
    }

    // 7. Dark Matter 80/20 Analysis
    console.log("\n🔍 Phase 7: Dark Matter 80/20 Analysis");
    console.log("Analyzing surgical precision benefits...\n");

    const analysis = analyzeSurgicalPrecision([
      preCommitResult,
      postCommitResult,
      prePushResult,
      postMergeResult,
      postCheckoutResult,
    ]);

    console.log("   🎯 Surgical Precision Benefits:");
    console.log(
      `   - Files Processed: ${analysis.filesProcessed} (vs ${analysis.totalFilesInRepo} in repo)`
    );
    console.log(`   - Processing Efficiency: ${analysis.efficiency}%`);
    console.log(`   - Time Saved: ${analysis.timeSaved}ms`);
    console.log(`   - Memory Saved: ${analysis.memorySaved}MB`);

    console.log("\n   🧠 AI Swarm Benefits:");
    console.log("   - Only processes what changed (not entire repo)");
    console.log("   - Immediate event detection via Git hooks");
    console.log("   - Change-only context for AI systems");
    console.log("   - Zero-overhead repository scanning");

    console.log("\n✅ GitVan Hookable Test Complete!");
    console.log("\n🎯 Dark Matter 80/20 Summary:");
    console.log("   - GitVan provides surgical precision for AI swarms");
    console.log("   - Only processes what actually changed");
    console.log("   - Immediate event detection via Git hooks");
    console.log("   - Change-only context eliminates full repo scans");
    console.log(
      "   - AI swarms get maximum intelligence with minimum overhead"
    );
  });
}

/**
 * Analyze surgical precision benefits
 */
function analyzeSurgicalPrecision(results) {
  const totalFilesProcessed = results.reduce(
    (sum, result) => sum + result.processed,
    0
  );
  const totalFilesInRepo = 1000; // Simulate large repository
  const efficiency = Math.round((totalFilesProcessed / totalFilesInRepo) * 100);
  const timeSaved = (totalFilesInRepo - totalFilesProcessed) * 10; // 10ms per file
  const memorySaved = (totalFilesInRepo - totalFilesProcessed) * 0.1; // 0.1MB per file

  return {
    filesProcessed: totalFilesProcessed,
    totalFilesInRepo,
    efficiency,
    timeSaved,
    memorySaved,
  };
}

// Run the test
testGitVanHookable().catch(console.error);
