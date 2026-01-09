/**
 * GitVan Audit Command - Citty Implementation
 *
 * Proper Citty-based implementation of audit and verification commands
 */

import { defineCommand } from "citty";
import { useGit } from "../../composables/git/index.mjs";
import { useNotes } from "../../composables/notes.mjs";
import { writeFileSafe } from "../../utils/fs.mjs";
import { loadOptions } from "../../config/loader.mjs";
import { createLogger } from "../../utils/logger.mjs";
import { exitWithError } from "../../core/error-handler.mjs";
import { Receipt, ReceiptQuery } from "../../schemas/receipt.zod.mjs";
import consola from "consola";
import YAML from "js-yaml";

const logger = createLogger("audit-cli");

/**
 * Build audit pack subcommand
 */
const buildSubcommand = defineCommand({
  meta: {
    name: "build",
    description: "Build audit pack from all receipts",
  },
  args: {
    output: {
      type: "string",
      description: "Output file path",
      default: "audit-pack.json",
    },
    "include-metadata": {
      type: "boolean",
      description: "Include metadata in audit pack",
      default: true,
    },
    compress: {
      type: "boolean",
      description: "Compress the audit pack",
      default: false,
    },
    since: {
      type: "string",
      description: "Include receipts since this date (ISO format)",
      default: "",
    },
    until: {
      type: "string",
      description: "Include receipts until this date (ISO format)",
      default: "",
    },
    verbose: {
      type: "boolean",
      description: "Show verbose output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();
      const notes = useNotes();

      logger.info("🔍 Building audit pack...");
      logger.info(`📁 Output: ${args.output}`);
      logger.info(`📊 Include Metadata: ${args["include-metadata"]}`);
      logger.info(`🗜️  Compress: ${args.compress}`);

      if (args.since) {
        logger.info(`📅 Since: ${args.since}`);
      }
      if (args.until) {
        logger.info(`📅 Until: ${args.until}`);
      }
      logger.info();

      // Get all receipts
      const receipts = await notes.getAllReceipts();

      if (receipts.length === 0) {
        logger.info("⚠️  No receipts found");
        return;
      }

      // Filter receipts by date range if specified
      let filteredReceipts = receipts;
      if (args.since || args.until) {
        const sinceDate = args.since ? new Date(args.since) : null;
        const untilDate = args.until ? new Date(args.until) : null;

        filteredReceipts = receipts.filter((receipt) => {
          const receiptDate = new Date(receipt.timestamp);
          if (sinceDate && receiptDate < sinceDate) return false;
          if (untilDate && receiptDate > untilDate) return false;
          return true;
        });
      }

      logger.info(`📊 Found ${filteredReceipts.length} receipts`);

      // Build audit pack
      const auditPack = {
        metadata: args["include-metadata"]
          ? {
              generatedAt: new Date().toISOString(),
              totalReceipts: filteredReceipts.length,
              dateRange: {
                since: args.since || null,
                until: args.until || null,
              },
              config: {
                rootDir: config.rootDir,
                version: config.version,
              },
            }
          : undefined,
        receipts: filteredReceipts,
      };

      // Write audit pack
      const outputPath = args.output;
      const content = args.compress
        ? JSON.stringify(auditPack, null, 0) // Minified
        : JSON.stringify(auditPack, null, 2); // Pretty printed

      await writeFileSafe(outputPath, content);

      logger.info(`✅ Audit pack built successfully`);
      logger.info(`📁 Output: ${outputPath}`);
      logger.info(`📊 Receipts: ${filteredReceipts.length}`);
      logger.info(`📏 Size: ${content.length} bytes`);

      if (args.verbose) {
        logger.info();
        logger.info("📋 Receipt Summary:");
        filteredReceipts.forEach((receipt, index) => {
          logger.info(
            `   ${index + 1}. ${receipt.jobName} (${receipt.timestamp})`
          );
        });
      }
    } catch (error) {
      logger.error("Failed to build audit pack:", error);
      logger.error("❌ Failed to build audit pack:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Verify receipt subcommand
 */
const verifySubcommand = defineCommand({
  meta: {
    name: "verify",
    description: "Verify receipt integrity and authenticity",
  },
  args: {
    receipt: {
      type: "string",
      description: "Receipt ID or path to receipt file",
      required: true,
    },
    "check-signature": {
      type: "boolean",
      description: "Verify digital signature",
      default: true,
    },
    "check-hash": {
      type: "boolean",
      description: "Verify content hash",
      default: true,
    },
    verbose: {
      type: "boolean",
      description: "Show verbose output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();
      const notes = useNotes();

      logger.info("🔍 Verifying receipt...");
      logger.info(`📄 Receipt: ${args.receipt}`);
      logger.info(`🔐 Check Signature: ${args["check-signature"]}`);
      logger.info(`🔗 Check Hash: ${args["check-hash"]}`);
      logger.info();

      // Get receipt
      let receipt;
      try {
        receipt = await notes.getReceipt(args.receipt);
      } catch (error) {
        logger.error("❌ Receipt not found:", args.receipt);
        await exitWithError(new Error("Operation failed"), 1);
      }

      logger.info(`📊 Receipt Details:`);
      logger.info(`   Job: ${receipt.jobName}`);
      logger.info(`   Timestamp: ${receipt.timestamp}`);
      logger.info(`   Status: ${receipt.status}`);
      logger.info(`   Duration: ${receipt.duration}ms`);
      logger.info();

      // Verify signature
      if (args["check-signature"]) {
        try {
          const isValid = await notes.verifyReceiptSignature(receipt);
          if (isValid) {
            logger.info("✅ Signature verification: PASSED");
          } else {
            logger.info("❌ Signature verification: FAILED");
          }
        } catch (error) {
          logger.info("⚠️  Signature verification: ERROR");
          if (args.verbose) {
            logger.info(`   Error: ${error.message}`);
          }
        }
      }

      // Verify hash
      if (args["check-hash"]) {
        try {
          const isValid = await notes.verifyReceiptHash(receipt);
          if (isValid) {
            logger.info("✅ Hash verification: PASSED");
          } else {
            logger.info("❌ Hash verification: FAILED");
          }
        } catch (error) {
          logger.info("⚠️  Hash verification: ERROR");
          if (args.verbose) {
            logger.info(`   Error: ${error.message}`);
          }
        }
      }

      // Overall verification result
      logger.info();
      logger.info("📊 Verification Summary:");
      logger.info(`   Receipt ID: ${receipt.id}`);
      logger.info(`   Job Name: ${receipt.jobName}`);
      logger.info(`   Status: ${receipt.status}`);
      logger.info(`   Verified: ${receipt.verified ? "Yes" : "No"}`);
    } catch (error) {
      logger.error("Failed to verify receipt:", error);
      logger.error("❌ Failed to verify receipt:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * List receipts subcommand
 */
const listSubcommand = defineCommand({
  meta: {
    name: "list",
    description: "List all receipts",
  },
  args: {
    "job-name": {
      type: "string",
      description: "Filter by job name",
      default: "",
    },
    since: {
      type: "string",
      description: "Show receipts since this date (ISO format)",
      default: "",
    },
    until: {
      type: "string",
      description: "Show receipts until this date (ISO format)",
      default: "",
    },
    status: {
      type: "string",
      description: "Filter by status (success, error, warning)",
      default: "",
    },
    limit: {
      type: "number",
      description: "Limit number of results",
      default: 50,
    },
    verbose: {
      type: "boolean",
      description: "Show verbose output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();
      const notes = useNotes();

      logger.info("📋 GitVan Receipts");
      logger.info("=".repeat(40));

      // Get all receipts
      const receipts = await notes.getAllReceipts();

      if (receipts.length === 0) {
        logger.info("No receipts found");
        return;
      }

      // Apply filters
      let filteredReceipts = receipts;

      if (args["job-name"]) {
        filteredReceipts = filteredReceipts.filter((r) =>
          r.jobName.includes(args["job-name"])
        );
      }

      if (args.status) {
        filteredReceipts = filteredReceipts.filter(
          (r) => r.status === args.status
        );
      }

      if (args.since || args.until) {
        const sinceDate = args.since ? new Date(args.since) : null;
        const untilDate = args.until ? new Date(args.until) : null;

        filteredReceipts = filteredReceipts.filter((receipt) => {
          const receiptDate = new Date(receipt.timestamp);
          if (sinceDate && receiptDate < sinceDate) return false;
          if (untilDate && receiptDate > untilDate) return false;
          return true;
        });
      }

      // Apply limit
      filteredReceipts = filteredReceipts.slice(0, args.limit);

      if (filteredReceipts.length === 0) {
        logger.info("No receipts match the specified criteria");
        return;
      }

      // Display receipts
      filteredReceipts.forEach((receipt, index) => {
        const statusIcon =
          receipt.status === "success"
            ? "✅"
            : receipt.status === "error"
            ? "❌"
            : "⚠️";

        logger.info(`${index + 1}. ${statusIcon} ${receipt.jobName}`);
        logger.info(`   📅 ${receipt.timestamp}`);
        logger.info(`   ⏱️  ${receipt.duration}ms`);
        logger.info(`   🆔 ${receipt.id}`);

        if (args.verbose) {
          logger.info(`   📁 File: ${receipt.file}`);
          logger.info(`   🔐 Verified: ${receipt.verified ? "Yes" : "No"}`);
        }
        logger.info();
      });

      logger.info(`📊 Total: ${filteredReceipts.length} receipts`);
    } catch (error) {
      logger.error("Failed to list receipts:", error);
      logger.error("❌ Failed to list receipts:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Show receipt subcommand
 */
const showSubcommand = defineCommand({
  meta: {
    name: "show",
    description: "Show detailed receipt information",
  },
  args: {
    receipt: {
      type: "string",
      description: "Receipt ID or path to receipt file",
      required: true,
    },
    "show-output": {
      type: "boolean",
      description: "Show job output",
      default: false,
    },
    "show-logs": {
      type: "boolean",
      description: "Show job logs",
      default: false,
    },
    format: {
      type: "string",
      description: "Output format (json, yaml, table)",
      default: "table",
    },
  },
  async run({ args }) {
    try {
      const config = await loadOptions();
      const notes = useNotes();

      logger.info("📄 Receipt Details");
      logger.info("=".repeat(30));

      // Get receipt
      let receipt;
      try {
        receipt = await notes.getReceipt(args.receipt);
      } catch (error) {
        logger.error("❌ Receipt not found:", args.receipt);
        await exitWithError(new Error("Operation failed"), 1);
      }

      if (args.format === "json") {
        logger.info(JSON.stringify(receipt, null, 2));
        return;
      }

      if (args.format === "yaml") {
        // YAML output format
        const yamlOutput = YAML.dump(receipt, { lineWidth: -1 });
        logger.info(yamlOutput);
        return;
      }

      // Table format (default)
      logger.info(`🆔 ID: ${receipt.id}`);
      logger.info(`📝 Job: ${receipt.jobName}`);
      logger.info(`📅 Timestamp: ${receipt.timestamp}`);
      logger.info(`📊 Status: ${receipt.status}`);
      logger.info(`⏱️  Duration: ${receipt.duration}ms`);
      logger.info(`🔐 Verified: ${receipt.verified ? "Yes" : "No"}`);
      logger.info(`📁 File: ${receipt.file}`);

      if (args["show-output"] && receipt.output) {
        logger.info();
        logger.info("📤 Job Output:");
        logger.info(receipt.output);
      }

      if (args["show-logs"] && receipt.logs) {
        logger.info();
        logger.info("📋 Job Logs:");
        logger.info(receipt.logs);
      }
    } catch (error) {
      logger.error("Failed to show receipt:", error);
      logger.error("❌ Failed to show receipt:", error.message);
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Main audit command with all subcommands
 */
export const auditCommand = defineCommand({
  meta: {
    name: "audit",
    description:
      "Manage GitVan audit and verification (build, verify, list, show)",
  },
  subCommands: {
    build: buildSubcommand,
    verify: verifySubcommand,
    list: listSubcommand,
    show: showSubcommand,
  },
});

export default auditCommand;
