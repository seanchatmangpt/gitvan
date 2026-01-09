/**
 * @fileoverview GitVan Post-merge Hook
 *
 * Called after successful merge operation
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { getHuskyHookBridge } from "../src/integrations/husky-hook-bridge.mjs";
import { createLogger } from "../src/utils/logger.mjs";

const logger = createLogger("hooks:post-merge");

/**
 * Post-merge hook handler
 *
 * This hook runs after a successful merge operation.
 * It can trigger background jobs for things like:
 * - Updating dependencies
 * - Running tests on merged code
 * - Building artifacts
 * - Updating documentation
 *
 * @async
 * @returns {Promise<void>}
 */
async function postMergeHook() {
  try {
    const bridge = getHuskyHookBridge({
      autoEvaluate: true,
      enableAudit: true,
    });

    const result = await bridge.processHook("post-merge", {
      // GitEventCapture will automatically populate:
      // - branchName (current branch after merge)
      // - filesChanged (count from git diff)
    });

    logger.info(`Post-merge evaluation: ${result.hooksTriggered} hooks triggered`);

    // Post-merge hooks should not fail
    if (!result.success) {
      logger.warn(`⚠️ Post-merge hook issues: ${result.error}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Post-merge hook error:`, error.message);
    // Exit cleanly - merge already succeeded
    process.exit(0);
  }
}

// Run the hook
postMergeHook().catch((error) => {
  console.error("Uncaught error in post-merge hook:", error);
  process.exit(0);
});
