/**
 * @fileoverview GitVan Post-commit Hook
 *
 * Called after commit is successfully created
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { getHuskyHookBridge } from "../src/integrations/husky-hook-bridge.mjs";
import { createLogger } from "../src/utils/logger.mjs";

const logger = createLogger("hooks:post-commit");

/**
 * Post-commit hook handler
 *
 * This hook runs after a commit is successfully created.
 * It can trigger background jobs for things like:
 * - Sending notifications
 * - Running CI/CD pipelines
 * - Updating metrics
 * - Publishing artifacts
 *
 * @async
 * @returns {Promise<void>}
 */
async function postCommitHook() {
  try {
    const bridge = getHuskyHookBridge({
      autoEvaluate: true,
      enableAudit: true,
    });

    const result = await bridge.processHook("post-commit", {
      // GitEventCapture will automatically populate:
      // - commitHash (from git rev-parse HEAD)
      // - commitMessage (from git log -1 --pretty=%B)
      // - branchName (from git rev-parse --abbrev-ref HEAD)
      // - filesChanged (count from git diff --name-only HEAD~1 HEAD)
    });

    logger.info(`Post-commit evaluation: ${result.hooksTriggered} hooks triggered`);

    // Post-commit hooks should not fail the commit
    // (commit already succeeded), but log any issues
    if (!result.success) {
      logger.warn(`⚠️ Post-commit hook issues: ${result.error}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Post-commit hook error:`, error.message);
    // Don't fail post-commit hooks - commit already succeeded
    process.exit(0);
  }
}

// Run the hook
postCommitHook().catch((error) => {
  console.error("Uncaught error in post-commit hook:", error);
  // Still exit cleanly for post-commit
  process.exit(0);
});
