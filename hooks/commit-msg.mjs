/**
 * @fileoverview GitVan Commit-msg Hook
 *
 * Called after commit message is entered, can validate and reject invalid messages
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { getHuskyHookBridge } from "../src/integrations/husky-hook-bridge.mjs";
import { createLogger } from "../src/utils/logger.mjs";
import { readFileSync } from "fs";

const logger = createLogger("hooks:commit-msg");

/**
 * Commit-msg hook handler
 *
 * This hook runs after the user enters a commit message.
 * It can validate the message format and reject commits with invalid messages.
 *
 * Git passes the commit message file path as the first argument.
 *
 * @async
 * @returns {Promise<void>}
 */
async function commitMsgHook() {
  try {
    // Git passes the commit message file as first argument
    const commitMsgFile = process.argv[2];

    if (!commitMsgFile) {
      logger.warn("⚠️ No commit message file provided");
      process.exit(0); // Don't fail if no file
    }

    // Read commit message
    const commitMessage = readFileSync(commitMsgFile, "utf-8").trim();

    const bridge = getHuskyHookBridge({
      autoEvaluate: true,
      enableAudit: true,
    });

    const result = await bridge.processHook("commit-msg", {
      commitMessage,
      commitMsgFile,
      // GitEventCapture will automatically populate:
      // - branchName
      // - Current working directory context
    });

    logger.info(`Commit-msg evaluation: ${result.hooksTriggered} hooks triggered`);

    // If any hook failed (returned non-zero exit), exit with error
    if (!result.success) {
      logger.error(`❌ Commit-msg hook failed: ${result.error}`);
      process.exit(1);
    }

    // Check if any triggered hooks indicated failure
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Commit-msg hook error:`, error.message);
    process.exit(1);
  }
}

// Run the hook
commitMsgHook().catch((error) => {
  console.error("Uncaught error in commit-msg hook:", error);
  process.exit(1);
});
