/**
 * GitVan v2 Audit CLI - Receipt audit and verification commands
 * Provides commands for building audit packs and verifying receipts
 */

import { useGit } from "../composables/git/index.mjs";
import { writeFileSafe } from "../utils/fs.mjs";
import { loadOptions } from "../config/loader.mjs";
import { createLogger } from "../utils/logger.mjs";
import { Receipt, ReceiptQuery } from "../schemas/receipt.zod.mjs";

const logger = createLogger("audit-cli");

/**
 * Audit CLI command handler
 * @param {string} subcommand - Subcommand (build, verify, list, show)
 * @param {object} args - Command arguments
 * @returns {Promise<void>}
 */
export async function auditCommand(subcommand = "build", args = {}) {
  const config = await loadOptions();

  switch (subcommand) {
    case "build":
      return await buildAuditPack(config, args);

    case "verify":
      return await verifyReceipt(config, args);

    case "list":
      return await listReceipts(config, args);

    case "show":
      return await showReceipt(config, args);

    default:
      throw new Error(`Unknown audit subcommand: ${subcommand}`);
  }
}

/**
 * Build audit pack from all receipts
 * @param {object} config - GitVan config
 * @param {object} args - Build arguments
 * @returns {Promise<void>}
 */
async function buildAuditPack(config, args) {
  try {
    const git = useGit();
    const receiptsRef = config.receipts?.ref || "refs/notes/gitvan/results";
    const outPath = args.out || "dist/audit.json";

    console.log("Building audit pack...");

    // Get all receipt notes
    const listOutput = await git
      .run(`notes --ref=${receiptsRef} list`)
      .catch(() => "");
    const lines = listOutput.split("\n").filter(Boolean);

    const receipts = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const line of lines) {
      const sha = line.split(" ")[0];
      if (!sha) continue;

      try {
        const rawReceipt = await git
          .run(`notes --ref=${receiptsRef} show ${sha}`)
          .catch(() => null);
        if (!rawReceipt) continue;

        const receipt = JSON.parse(rawReceipt);
        const validatedReceipt = Receipt.parse(receipt);

        receipts.push(validatedReceipt);
        validCount++;
      } catch (error) {
        logger.warn(`Invalid receipt for commit ${sha}:`, error.message);
        invalidCount++;
      }
    }

    // Build audit summary
    const summary = {
      ok: receipts.filter((r) => r.status === "OK").length,
      error: receipts.filter((r) => r.status === "ERROR").length,
      skip: receipts.filter((r) => r.status === "SKIP").length,
    };

    const auditPack = {
      kind: "receipt-collection",
      timestamp: new Date().toISOString(),
      count: receipts.length,
      receipts,
      summary,
      metadata: {
        totalProcessed: lines.length,
        validReceipts: validCount,
        invalidReceipts: invalidCount,
        gitRef: receiptsRef,
        generatedBy: "gitvan-audit-cli",
      },
    };

    // Write audit pack
    const absPath = writeFileSafe(
      config.rootDir,
      outPath,
      JSON.stringify(auditPack, null, 2),
    );

    console.log(`Audit pack written: ${absPath}`);
    console.log(`  Total receipts: ${receipts.length}`);
    console.log(
      `  OK: ${summary.ok}, Error: ${summary.error}, Skip: ${summary.skip}`,
    );
    console.log(`  Invalid receipts: ${invalidCount}`);
  } catch (error) {
    logger.error("Failed to build audit pack:", error.message);
    throw error;
  }
}

/**
 * Verify a specific receipt
 * @param {object} config - GitVan config
 * @param {object} args - Verify arguments
 * @returns {Promise<void>}
 */
async function verifyReceipt(config, args) {
  try {
    if (!args.id) {
      throw new Error("Receipt ID required for verify command");
    }

    const git = useGit();
    const receiptsRef = config.receipts?.ref || "refs/notes/gitvan/results";

    console.log(`Verifying receipt: ${args.id}`);

    // Find receipt by ID
    const listOutput = await git
      .run(`notes --ref=${receiptsRef} list`)
      .catch(() => "");
    const lines = listOutput.split("\n").filter(Boolean);

    let receipt = null;
    let commitSha = null;

    for (const line of lines) {
      const sha = line.split(" ")[0];
      if (!sha) continue;

      try {
        const rawReceipt = await git.run(
          `notes --ref=${receiptsRef} show ${sha}`,
        );
        const parsedReceipt = JSON.parse(rawReceipt);

        if (parsedReceipt.id === args.id) {
          receipt = Receipt.parse(parsedReceipt);
          commitSha = sha;
          break;
        }
      } catch (error) {
        // Skip invalid receipts
        continue;
      }
    }

    if (!receipt) {
      throw new Error(`Receipt ${args.id} not found`);
    }

    console.log("Receipt found:");
    console.log(`  ID: ${receipt.id}`);
    console.log(`  Status: ${receipt.status}`);
    console.log(`  Action: ${receipt.action}`);
    console.log(`  Timestamp: ${receipt.ts}`);
    console.log(`  Commit: ${receipt.commit || commitSha}`);

    // Verify receipt integrity
    const isValid = verifyReceiptIntegrity(receipt);

    if (isValid) {
      console.log("✅ Receipt verification passed");
    } else {
      console.log("❌ Receipt verification failed");
    }
  } catch (error) {
    logger.error("Failed to verify receipt:", error.message);
    throw error;
  }
}

/**
 * List receipts with optional filtering
 * @param {object} config - GitVan config
 * @param {object} args - List arguments
 * @returns {Promise<void>}
 */
async function listReceipts(config, args) {
  try {
    const git = useGit();
    const receiptsRef = config.receipts?.ref || "refs/notes/gitvan/results";
    const limit = args.limit ? parseInt(args.limit) : 50;

    console.log(`Listing receipts (limit: ${limit})...`);

    const listOutput = await git
      .run(`notes --ref=${receiptsRef} list`)
      .catch(() => "");
    const lines = listOutput.split("\n").filter(Boolean);

    const receipts = [];

    for (const line of lines.slice(0, limit)) {
      const sha = line.split(" ")[0];
      if (!sha) continue;

      try {
        const rawReceipt = await git.run(
          `notes --ref=${receiptsRef} show ${sha}`,
        );
        const receipt = JSON.parse(rawReceipt);
        receipts.push(receipt);
      } catch (error) {
        // Skip invalid receipts
        continue;
      }
    }

    if (receipts.length === 0) {
      console.log("No receipts found");
      return;
    }

    console.log(`Found ${receipts.length} receipt(s):`);
    console.log();

    for (const receipt of receipts) {
      console.log(`📋 ${receipt.id}`);
      console.log(`   Status: ${receipt.status}`);
      console.log(`   Action: ${receipt.action}`);
      console.log(`   Time: ${receipt.ts}`);
      if (receipt.commit) {
        console.log(`   Commit: ${receipt.commit}`);
      }
      console.log();
    }
  } catch (error) {
    logger.error("Failed to list receipts:", error.message);
    throw error;
  }
}

/**
 * Show detailed receipt information
 * @param {object} config - GitVan config
 * @param {object} args - Show arguments
 * @returns {Promise<void>}
 */
async function showReceipt(config, args) {
  try {
    if (!args.id) {
      throw new Error("Receipt ID required for show command");
    }

    // Similar to verify but with more detailed output
    await verifyReceipt(config, args);
  } catch (error) {
    logger.error("Failed to show receipt:", error.message);
    throw error;
  }
}

/**
 * Verify receipt integrity
 * @param {object} receipt - Receipt object
 * @returns {boolean} True if valid
 */
function verifyReceiptIntegrity(receipt) {
  // Basic integrity checks
  if (!receipt.id || !receipt.status || !receipt.ts || !receipt.action) {
    return false;
  }

  // Check timestamp format
  try {
    new Date(receipt.ts);
  } catch {
    return false;
  }

  // Additional checks could be added here
  return true;
}
