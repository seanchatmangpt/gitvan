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

      console.log("🔍 Building audit pack...");
      console.log(`📁 Output: ${args.output}`);
      console.log(`📊 Include Metadata: ${args["include-metadata"]}`);
      console.log(`🗜️  Compress: ${args.compress}`);

      if (args.since) {
        console.log(`📅 Since: ${args.since}`);
      }
      if (args.until) {
        console.log(`📅 Until: ${args.until}`);
      }
      console.log();

      // Get all receipts
      const receipts = await notes.getAllReceipts();

      if (receipts.length === 0) {
        console.log("⚠️  No receipts found");
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

      console.log(`📊 Found ${filteredReceipts.length} receipts`);

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

      console.log(`✅ Audit pack built successfully`);
      console.log(`📁 Output: ${outputPath}`);
      console.log(`📊 Receipts: ${filteredReceipts.length}`);
      console.log(`📏 Size: ${content.length} bytes`);

      if (args.verbose) {
        console.log();
        console.log("📋 Receipt Summary:");
        filteredReceipts.forEach((receipt, index) => {
          console.log(
            `   ${index + 1}. ${receipt.jobName} (${receipt.timestamp})`
          );
        });
      }
    } catch (error) {
      logger.error("Failed to build audit pack:", error);
      console.error("❌ Failed to build audit pack:", error.message);
      process.exit(1);
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

      console.log("🔍 Verifying receipt...");
      console.log(`📄 Receipt: ${args.receipt}`);
      console.log(`🔐 Check Signature: ${args["check-signature"]}`);
      console.log(`🔗 Check Hash: ${args["check-hash"]}`);
      console.log();

      // Get receipt
      let receipt;
      try {
        receipt = await notes.getReceipt(args.receipt);
      } catch (error) {
        console.error("❌ Receipt not found:", args.receipt);
        process.exit(1);
      }

      console.log(`📊 Receipt Details:`);
      console.log(`   Job: ${receipt.jobName}`);
      console.log(`   Timestamp: ${receipt.timestamp}`);
      console.log(`   Status: ${receipt.status}`);
      console.log(`   Duration: ${receipt.duration}ms`);
      console.log();

      // Verify signature
      if (args["check-signature"]) {
        try {
          const isValid = await notes.verifyReceiptSignature(receipt);
          if (isValid) {
            console.log("✅ Signature verification: PASSED");
          } else {
            console.log("❌ Signature verification: FAILED");
          }
        } catch (error) {
          console.log("⚠️  Signature verification: ERROR");
          if (args.verbose) {
            console.log(`   Error: ${error.message}`);
          }
        }
      }

      // Verify hash
      if (args["check-hash"]) {
        try {
          const isValid = await notes.verifyReceiptHash(receipt);
          if (isValid) {
            console.log("✅ Hash verification: PASSED");
          } else {
            console.log("❌ Hash verification: FAILED");
          }
        } catch (error) {
          console.log("⚠️  Hash verification: ERROR");
          if (args.verbose) {
            console.log(`   Error: ${error.message}`);
          }
        }
      }

      // Overall verification result
      console.log();
      console.log("📊 Verification Summary:");
      console.log(`   Receipt ID: ${receipt.id}`);
      console.log(`   Job Name: ${receipt.jobName}`);
      console.log(`   Status: ${receipt.status}`);
      console.log(`   Verified: ${receipt.verified ? "Yes" : "No"}`);
    } catch (error) {
      logger.error("Failed to verify receipt:", error);
      console.error("❌ Failed to verify receipt:", error.message);
      process.exit(1);
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

      console.log("📋 GitVan Receipts");
      console.log("=".repeat(40));

      // Get all receipts
      const receipts = await notes.getAllReceipts();

      if (receipts.length === 0) {
        console.log("No receipts found");
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
        console.log("No receipts match the specified criteria");
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

        console.log(`${index + 1}. ${statusIcon} ${receipt.jobName}`);
        console.log(`   📅 ${receipt.timestamp}`);
        console.log(`   ⏱️  ${receipt.duration}ms`);
        console.log(`   🆔 ${receipt.id}`);

        if (args.verbose) {
          console.log(`   📁 File: ${receipt.file}`);
          console.log(`   🔐 Verified: ${receipt.verified ? "Yes" : "No"}`);
        }
        console.log();
      });

      console.log(`📊 Total: ${filteredReceipts.length} receipts`);
    } catch (error) {
      logger.error("Failed to list receipts:", error);
      console.error("❌ Failed to list receipts:", error.message);
      process.exit(1);
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

      console.log("📄 Receipt Details");
      console.log("=".repeat(30));

      // Get receipt
      let receipt;
      try {
        receipt = await notes.getReceipt(args.receipt);
      } catch (error) {
        console.error("❌ Receipt not found:", args.receipt);
        process.exit(1);
      }

      if (args.format === "json") {
        console.log(JSON.stringify(receipt, null, 2));
        return;
      }

      if (args.format === "yaml") {
        // YAML output format
        const yamlOutput = YAML.dump(receipt, { lineWidth: -1 });
        console.log(yamlOutput);
        return;
      }

      // Table format (default)
      console.log(`🆔 ID: ${receipt.id}`);
      console.log(`📝 Job: ${receipt.jobName}`);
      console.log(`📅 Timestamp: ${receipt.timestamp}`);
      console.log(`📊 Status: ${receipt.status}`);
      console.log(`⏱️  Duration: ${receipt.duration}ms`);
      console.log(`🔐 Verified: ${receipt.verified ? "Yes" : "No"}`);
      console.log(`📁 File: ${receipt.file}`);

      if (args["show-output"] && receipt.output) {
        console.log();
        console.log("📤 Job Output:");
        console.log(receipt.output);
      }

      if (args["show-logs"] && receipt.logs) {
        console.log();
        console.log("📋 Job Logs:");
        console.log(receipt.logs);
      }
    } catch (error) {
      logger.error("Failed to show receipt:", error);
      console.error("❌ Failed to show receipt:", error.message);
      process.exit(1);
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
