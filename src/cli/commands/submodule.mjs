/**
 * @fileoverview GitVan Submodule Command - Citty Implementation
 *
 * CLI commands for managing git submodules, specifically for vendor/unrdf.
 * Provides status checking, initialization, updates, and validation.
 *
 * Commands:
 * - gitvan submodule status   - Show submodule status
 * - gitvan submodule check    - Check for updates and issues
 * - gitvan submodule update   - Update submodule to latest
 * - gitvan submodule verify   - Verify exports and compatibility
 * - gitvan submodule init     - Initialize submodule
 * - gitvan submodule sync     - Sync to expected commit
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { defineCommand } from "citty";
import { createLogger } from "../../utils/logger.mjs";
import { consola } from "consola";
import {
  getAllSubmodulesStatus,
  getUnrdfStatus,
  initializeUnrdf,
  updateUnrdf,
  syncUnrdf,
  checkSubmoduleUpdates,
  SUBMODULE_CONFIG,
} from "../../utils/submodule-manager.mjs";
import {
  validateUnrdfExports,
  generateValidationReport,
  listUnrdfMethods,
  checkVersionCompatibility,
} from "../../utils/unrdf-validator.mjs";

const logger = createLogger("submodule-cli");

/**
 * Format status indicator
 */
function getStatusIndicator(status) {
  switch (status) {
    case "ok":
      return "🟢";
    case "not-initialized":
      return "⚪";
    case "out-of-sync":
      return "🟡";
    case "modified":
      return "🟠";
    default:
      return "❓";
  }
}

/**
 * Status subcommand - Show submodule status
 */
const statusSubcommand = defineCommand({
  meta: {
    name: "status",
    description: "Show status of git submodules",
  },
  args: {
    verbose: {
      type: "boolean",
      description: "Show verbose status information",
      default: false,
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const cwd = process.cwd();
      const statuses = getAllSubmodulesStatus(cwd);

      if (args.json) {
        consola.log(JSON.stringify(statuses, null, 2));
        return;
      }

      logger.info("📦 Git Submodule Status");
      logger.info("=".repeat(50));

      for (const [name, status] of Object.entries(statuses)) {
        const indicator = getStatusIndicator(status.status);
        logger.info(`\n${indicator} ${name.toUpperCase()}`);
        logger.info(`   Path: ${status.path}`);
        logger.info(`   Status: ${status.status}`);

        if (status.initialized) {
          logger.info(`   Version: ${status.version || "unknown"}`);
          logger.info(`   Current Commit: ${status.currentCommit}`);
          logger.info(`   Expected Commit: ${status.expectedCommit}`);

          if (args.verbose) {
            logger.info(`   Out of Sync: ${status.outOfSync ? "Yes" : "No"}`);
            logger.info(`   Has Changes: ${status.hasChanges ? "Yes" : "No"}`);
          }
        }

        if (status.warnings && status.warnings.length > 0) {
          logger.warn(`   Warnings:`);
          for (const warning of status.warnings) {
            logger.warn(`     - ${warning}`);
          }
        }
      }

      logger.info("\n" + "=".repeat(50));
    } catch (error) {
      logger.error("Failed to get submodule status:", error.message);
      process.exit(1);
    }
  },
});

/**
 * Check subcommand - Check for updates and issues
 */
const checkSubcommand = defineCommand({
  meta: {
    name: "check",
    description: "Check for submodule updates and issues",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const cwd = process.cwd();
      const status = getUnrdfStatus(cwd);

      if (!status.initialized) {
        logger.warn("⚠️  UnRDF submodule not initialized");
        logger.info("Run: gitvan submodule init");
        process.exit(1);
      }

      // Check for updates
      const updates = checkSubmoduleUpdates(
        SUBMODULE_CONFIG.unrdf.path,
        cwd
      );

      const result = {
        status,
        updates,
        issues: [],
      };

      // Collect issues
      if (status.outOfSync) {
        result.issues.push({
          type: "out-of-sync",
          message: "Submodule is out of sync with expected commit",
          fix: "Run: gitvan submodule sync",
        });
      }

      if (status.hasChanges) {
        result.issues.push({
          type: "uncommitted-changes",
          message: "Submodule has uncommitted changes",
          fix: "Commit or stash changes in vendor/unrdf",
        });
      }

      if (updates.available) {
        result.issues.push({
          type: "updates-available",
          message: `Updates available (${updates.behindCount} commits behind)`,
          fix: "Run: gitvan submodule update",
        });
      }

      if (args.json) {
        consola.log(JSON.stringify(result, null, 2));
        return;
      }

      logger.info("🔍 Submodule Check Results");
      logger.info("=".repeat(50));

      // Status
      const indicator = getStatusIndicator(status.status);
      logger.info(`\n${indicator} Status: ${status.status}`);
      logger.info(`   Version: ${status.version}`);
      logger.info(`   Current: ${status.currentCommit}`);
      logger.info(`   Expected: ${status.expectedCommit}`);

      // Updates
      if (updates.available) {
        logger.warn(
          `\n⚡ Updates Available: ${updates.behindCount} commits behind`
        );
        logger.info(`   Current: ${updates.currentCommit}`);
        logger.info(`   Remote: ${updates.remoteCommit}`);
      } else {
        logger.info("\n✅ No updates available");
      }

      // Issues
      if (result.issues.length > 0) {
        logger.warn(`\n⚠️  Found ${result.issues.length} issue(s):`);
        for (const issue of result.issues) {
          logger.warn(`   - ${issue.message}`);
          logger.info(`     Fix: ${issue.fix}`);
        }
      } else {
        logger.info("\n✅ No issues found");
      }

      logger.info("\n" + "=".repeat(50));
    } catch (error) {
      logger.error("Failed to check submodule:", error.message);
      process.exit(1);
    }
  },
});

/**
 * Init subcommand - Initialize submodule
 */
const initSubcommand = defineCommand({
  meta: {
    name: "init",
    description: "Initialize git submodule",
  },
  async run() {
    try {
      const cwd = process.cwd();
      const status = getUnrdfStatus(cwd);

      if (status.initialized) {
        logger.info("✅ UnRDF submodule already initialized");
        logger.info(`   Version: ${status.version}`);
        logger.info(`   Commit: ${status.currentCommit}`);
        return;
      }

      logger.info("🚀 Initializing UnRDF submodule...");

      const result = initializeUnrdf(cwd);

      if (result.success) {
        logger.info("✅ " + result.message);

        // Show new status
        const newStatus = getUnrdfStatus(cwd);
        logger.info(`   Version: ${newStatus.version}`);
        logger.info(`   Commit: ${newStatus.currentCommit}`);
      } else {
        logger.error("❌ Failed to initialize:", result.error);
        process.exit(1);
      }
    } catch (error) {
      logger.error("Failed to initialize submodule:", error.message);
      process.exit(1);
    }
  },
});

/**
 * Update subcommand - Update submodule to latest
 */
const updateSubcommand = defineCommand({
  meta: {
    name: "update",
    description: "Update submodule to latest remote version",
  },
  args: {
    force: {
      type: "boolean",
      description: "Force update even if there are uncommitted changes",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const cwd = process.cwd();
      const status = getUnrdfStatus(cwd);

      if (!status.initialized) {
        logger.warn("⚠️  Submodule not initialized");
        logger.info("Initializing first...");
        const initResult = initializeUnrdf(cwd);
        if (!initResult.success) {
          logger.error("❌ Failed to initialize:", initResult.error);
          process.exit(1);
        }
        return;
      }

      if (status.hasChanges && !args.force) {
        logger.error(
          "❌ Submodule has uncommitted changes. Use --force to update anyway."
        );
        process.exit(1);
      }

      logger.info("🔄 Updating UnRDF submodule...");

      const result = updateUnrdf(cwd);

      if (result.success) {
        logger.info("✅ " + result.message);

        // Show new status
        const newStatus = getUnrdfStatus(cwd);
        logger.info(`   Version: ${newStatus.version}`);
        logger.info(`   Commit: ${newStatus.currentCommit}`);
      } else {
        logger.error("❌ Failed to update:", result.error);
        process.exit(1);
      }
    } catch (error) {
      logger.error("Failed to update submodule:", error.message);
      process.exit(1);
    }
  },
});

/**
 * Sync subcommand - Sync to expected commit
 */
const syncSubcommand = defineCommand({
  meta: {
    name: "sync",
    description: "Sync submodule to expected commit (from parent repo)",
  },
  async run() {
    try {
      const cwd = process.cwd();
      const status = getUnrdfStatus(cwd);

      if (!status.initialized) {
        logger.warn("⚠️  Submodule not initialized");
        logger.info("Initializing first...");
        const initResult = initializeUnrdf(cwd);
        if (!initResult.success) {
          logger.error("❌ Failed to initialize:", initResult.error);
          process.exit(1);
        }
        return;
      }

      if (!status.outOfSync) {
        logger.info("✅ Submodule already in sync");
        logger.info(`   Current: ${status.currentCommit}`);
        logger.info(`   Expected: ${status.expectedCommit}`);
        return;
      }

      logger.info("🔄 Syncing UnRDF submodule...");
      logger.info(`   From: ${status.currentCommit}`);
      logger.info(`   To: ${status.expectedCommit}`);

      const result = syncUnrdf(cwd);

      if (result.success) {
        logger.info("✅ " + result.message);

        // Show new status
        const newStatus = getUnrdfStatus(cwd);
        logger.info(`   Version: ${newStatus.version}`);
        logger.info(`   Commit: ${newStatus.currentCommit}`);
      } else {
        logger.error("❌ Failed to sync:", result.error);
        process.exit(1);
      }
    } catch (error) {
      logger.error("Failed to sync submodule:", error.message);
      process.exit(1);
    }
  },
});

/**
 * Verify subcommand - Verify exports and compatibility
 */
const verifySubcommand = defineCommand({
  meta: {
    name: "verify",
    description: "Verify UnRDF exports and version compatibility",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
    verbose: {
      type: "boolean",
      description: "Show detailed validation results",
      default: false,
    },
    "list-methods": {
      type: "boolean",
      description: "List all available methods",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const cwd = process.cwd();

      if (args["list-methods"]) {
        const methods = listUnrdfMethods(cwd);

        if (args.json) {
          consola.log(JSON.stringify(methods, null, 2));
          return;
        }

        if (!methods.available) {
          logger.error("❌ UnRDF not available");
          process.exit(1);
        }

        logger.info("📋 Available UnRDF Methods");
        logger.info("=".repeat(50));
        logger.info(`Version: ${methods.version}`);
        logger.info(`Total: ${methods.total} methods\n`);

        for (const [category, methodList] of Object.entries(methods.methods)) {
          logger.info(`\n${category.toUpperCase()} (${methodList.length}):`);
          for (const method of methodList) {
            logger.info(`  - ${method}`);
          }
        }

        logger.info("\n" + "=".repeat(50));
        return;
      }

      logger.info("🔍 Verifying UnRDF...");

      const report = await generateValidationReport(cwd);

      if (args.json) {
        consola.log(JSON.stringify(report, null, 2));
        return;
      }

      logger.info("=".repeat(50));

      // Summary
      const summary = report.summary;
      const statusIcon = summary.status === "OK" ? "✅" : "⚠️";
      logger.info(`\n${statusIcon} Status: ${summary.status}`);
      logger.info(`   Available: ${summary.available ? "Yes" : "No"}`);
      logger.info(`   Valid: ${summary.valid ? "Yes" : "No"}`);
      logger.info(`   Version: ${summary.version || "unknown"}`);
      logger.info(`   Version Compatible: ${summary.versionCompatible ? "Yes" : "No"}`);
      logger.info(`   Total Exports: ${summary.totalExports}`);
      logger.info(`   Missing: ${summary.missingCount}`);

      // Validation details
      const validation = report.validation;
      if (args.verbose && validation.categories) {
        logger.info("\n📊 Validation Details:");
        for (const category of validation.categories) {
          const icon =
            category.invalid === 0
              ? "✅"
              : category.missing.length > 0
                ? "❌"
                : "⚠️";
          logger.info(
            `   ${icon} ${category.category}: ${category.valid}/${category.total} valid`
          );

          if (category.invalid > 0 && args.verbose) {
            for (const issue of category.issues) {
              logger.warn(`      - ${issue.name}: ${issue.issue}`);
            }
          }
        }
      }

      // Missing functionality
      const missing = report.missing;
      if (missing.hasMissing) {
        logger.warn(`\n⚠️  Missing Functionality (${missing.count} exports):`);
        for (const detail of missing.details) {
          logger.warn(`   ${detail.category}: ${detail.count} missing`);
          if (args.verbose) {
            for (const exp of detail.exports) {
              logger.warn(`      - ${exp}`);
            }
          }
        }
      }

      // Messages
      if (validation.message) {
        logger.info(`\n💬 ${validation.message}`);
      }

      if (validation.recommendation) {
        logger.info(`   📌 ${validation.recommendation}`);
      }

      if (validation.note) {
        logger.info(`   ℹ️  ${validation.note}`);
      }

      logger.info("\n" + "=".repeat(50));

      // Exit with error if validation failed
      if (!summary.valid || !summary.versionCompatible) {
        process.exit(1);
      }
    } catch (error) {
      logger.error("Failed to verify submodule:", error.message);
      process.exit(1);
    }
  },
});

/**
 * Main submodule command with all subcommands
 */
export const submoduleCommand = defineCommand({
  meta: {
    name: "submodule",
    description:
      "Manage git submodules (status, check, init, update, sync, verify)",
  },
  subCommands: {
    status: statusSubcommand,
    check: checkSubcommand,
    init: initSubcommand,
    update: updateSubcommand,
    sync: syncSubcommand,
    verify: verifySubcommand,
  },
});

export default submoduleCommand;
