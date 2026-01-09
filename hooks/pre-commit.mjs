/**
 * @fileoverview GitVan Pre-commit Hook
 *
 * Called before commit is created, can prevent commit if validation fails
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { getHuskyHookBridge } from "../src/integrations/husky-hook-bridge.mjs";
import { createLogger } from "../src/utils/logger.mjs";

const logger = createLogger("hooks:pre-commit");

/**
 * Pre-commit hook handler
 *
 * This hook runs before a commit is created. It can validate staged changes
 * and prevent the commit if validation fails.
 *
 * @async
 * @returns {Promise<void>}
 */
async function preCommitHook() {
  try {
    const bridge = getHuskyHookBridge({
      autoEvaluate: true,
      enableAudit: true,
    });

    const result = await bridge.processHook("pre-commit", {
      // GitEventCapture will automatically populate:
      // - stagedFiles
      // - branchName
      // - Current working directory context
    });

    logger.info(`Pre-commit evaluation: ${result.hooksTriggered} hooks triggered`);

    // If any hook failed (returned non-zero exit), exit with error
    if (!result.success) {
      logger.error(`❌ Pre-commit hook failed: ${result.error}`);
      process.exit(1);
    }

    // Check if any triggered hooks indicated failure
    // (This would be set in the hook execution results)
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Pre-commit hook error:`, error.message);
    process.exit(1);
  }
}

// Run the hook
preCommitHook().catch((error) => {
  console.error("Uncaught error in pre-commit hook:", error);
  process.exit(1);
});
