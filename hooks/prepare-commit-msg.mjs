/**
 * @fileoverview GitVan Prepare-commit-msg Hook
 *
 * Called before commit message editor is opened, can modify the commit message
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { getHuskyHookBridge } from "../src/integrations/husky-hook-bridge.mjs";
import { createLogger } from "../src/utils/logger.mjs";
import { readFileSync, writeFileSync } from "fs";

const logger = createLogger("hooks:prepare-commit-msg");

/**
 * Prepare-commit-msg hook handler
 *
 * This hook runs before the commit message editor is opened.
 * It can be used to prepopulate or modify the commit message template.
 *
 * Git passes three arguments:
 * 1. Commit message file path
 * 2. Commit source (message, template, merge, squash, or commit)
 * 3. Commit SHA (for amend or commit -c)
 *
 * @async
 * @returns {Promise<void>}
 */
async function prepareCommitMsgHook() {
  try {
    // Git passes arguments: <file> <source> [<sha>]
    const commitMsgFile = process.argv[2];
    const commitSource = process.argv[3] || "message";
    const commitSha = process.argv[4] || null;

    if (!commitMsgFile) {
      logger.warn("⚠️ No commit message file provided");
      process.exit(0); // Don't fail if no file
    }

    // Read existing commit message (template or empty)
    const originalMessage = readFileSync(commitMsgFile, "utf-8");

    const bridge = getHuskyHookBridge({
      autoEvaluate: true,
      enableAudit: true,
    });

    const result = await bridge.processHook("prepare-commit-msg", {
      commitMsgFile,
      commitSource,
      commitSha,
      originalMessage,
      // GitEventCapture will automatically populate:
      // - branchName
      // - Current working directory context
    });

    logger.info(
      `Prepare-commit-msg evaluation: ${result.hooksTriggered} hooks triggered`
    );

    // Hooks can modify the commit message by including a 'modifiedMessage' in results
    // This is optional - most hooks won't modify the message
    if (result.modifiedMessage) {
      writeFileSync(commitMsgFile, result.modifiedMessage, "utf-8");
      logger.info("✏️ Commit message modified by hooks");
    }

    // Prepare-commit-msg hooks should not fail the commit
    if (!result.success) {
      logger.warn(`⚠️ Prepare-commit-msg hook issues: ${result.error}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Prepare-commit-msg hook error:`, error.message);
    // Don't fail commit preparation on errors
    process.exit(0);
  }
}

// Run the hook
prepareCommitMsgHook().catch((error) => {
  console.error("Uncaught error in prepare-commit-msg hook:", error);
  // Exit cleanly - don't block commits
  process.exit(0);
});
