#!/usr/bin/env node
/**
 * GitVan Git Hooks Setup - Knowledge Hook Signal Layer
 *
 * Sets up Git hooks as signals for Knowledge Hook evaluation
 */

import { execSync } from "child_process";
import { writeFileSync, chmodSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Git Hooks Setup - Knowledge Hook Signal Layer
 *
 * Creates Git hooks that provide signals for Knowledge Hook evaluation:
 * - Git hooks provide signals (when to evaluate)
 * - Knowledge Hooks provide intelligence (what to evaluate with SPARQL)
 * - Only process what changed (not entire repo)
 * - Change-only context for Knowledge Hook system
 */
class GitHooksSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.hooksDir = join(this.projectRoot, ".git", "hooks");
    this.handlerPath = join(__dirname, "git-hook-handler.mjs");
  }

  /**
   * Setup Git hooks as signals for Knowledge Hook evaluation
   */
  async setup() {
    console.log("🔧 GitVan: Setting up Git hooks as Knowledge Hook signals\n");

    // Ensure hooks directory exists
    this.ensureHooksDirectory();

    // Create Git signal hooks
    await this.createPreCommitSignal();
    await this.createPostCommitSignal();
    await this.createPrePushSignal();
    await this.createPostMergeSignal();
    await this.createPostCheckoutSignal();

    console.log("✅ GitVan Git signal hooks setup complete!");
    console.log("\n🎯 Two-Layer Architecture Benefits:");
    console.log("   - Git hooks provide signals (when to evaluate)");
    console.log("   - Knowledge Hooks provide intelligence (SPARQL evaluation)");
    console.log("   - Only processes what changed (not entire repo)");
    console.log("   - Change-only context for Knowledge Hook system");
    console.log("\n🧠 Knowledge Hook system now has intelligent signal triggers!");
  }

  /**
   * Ensure hooks directory exists
   */
  ensureHooksDirectory() {
    try {
      mkdirSync(this.hooksDir, { recursive: true });
      console.log(`   📁 Hooks directory: ${this.hooksDir}`);
    } catch (error) {
      console.error("❌ Could not create hooks directory:", error.message);
      process.exit(1);
    }
  }

  /**
   * Create pre-commit signal hook - Triggers Knowledge Hook evaluation
   */
  async createPreCommitSignal() {
    const hookContent = `#!/bin/sh
# GitVan Pre-Commit Signal Hook - Knowledge Hook Trigger
# Signals Knowledge Hook system to evaluate code quality

ROOT="$(git rev-parse --show-toplevel)"
exec "$(command -v node)" "$ROOT/node_modules/gitvan/bin/git-hook-handler.mjs" pre-commit "$@"
`;

    this.writeHook("pre-commit", hookContent);
    console.log("   ✅ Pre-commit signal hook created (Knowledge Hook trigger)");
  }

  /**
   * Create post-commit signal hook - Triggers Knowledge Hook evaluation
   */
  async createPostCommitSignal() {
    const hookContent = `#!/bin/sh
# GitVan Post-Commit Signal Hook - Knowledge Hook Trigger
# Signals Knowledge Hook system to evaluate committed changes

ROOT="$(git rev-parse --show-toplevel)"
exec "$(command -v node)" "$ROOT/node_modules/gitvan/bin/git-hook-handler.mjs" post-commit "$@"
`;

    this.writeHook("post-commit", hookContent);
    console.log("   ✅ Post-commit signal hook created (Knowledge Hook trigger)");
  }

  /**
   * Create pre-push signal hook - Triggers Knowledge Hook evaluation
   */
  async createPrePushSignal() {
    const hookContent = `#!/bin/sh
# GitVan Pre-Push Signal Hook - Knowledge Hook Trigger
# Signals Knowledge Hook system to evaluate security and quality

ROOT="$(git rev-parse --show-toplevel)"
exec "$(command -v node)" "$ROOT/node_modules/gitvan/bin/git-hook-handler.mjs" pre-push "$@"
`;

    this.writeHook("pre-push", hookContent);
    console.log("   ✅ Pre-push signal hook created (Knowledge Hook trigger)");
  }

  /**
   * Create post-merge signal hook - Triggers Knowledge Hook evaluation
   */
  async createPostMergeSignal() {
    const hookContent = `#!/bin/sh
# GitVan Post-Merge Signal Hook - Knowledge Hook Trigger
# Signals Knowledge Hook system to evaluate integration changes

ROOT="$(git rev-parse --show-toplevel)"
exec "$(command -v node)" "$ROOT/node_modules/gitvan/bin/git-hook-handler.mjs" post-merge "$@"
`;

    this.writeHook("post-merge", hookContent);
    console.log("   ✅ Post-merge signal hook created (Knowledge Hook trigger)");
  }

  /**
   * Create post-checkout signal hook - Triggers Knowledge Hook evaluation
   */
  async createPostCheckoutSignal() {
    const hookContent = `#!/bin/sh
# GitVan Post-Checkout Signal Hook - Knowledge Hook Trigger
# Signals Knowledge Hook system to evaluate environment changes

ROOT="$(git rev-parse --show-toplevel)"
exec "$(command -v node)" "$ROOT/node_modules/gitvan/bin/git-hook-handler.mjs" post-checkout "$@"
`;

    this.writeHook("post-checkout", hookContent);
    console.log("   ✅ Post-checkout signal hook created (Knowledge Hook trigger)");
  }

  /**
   * Write hook file with proper permissions
   */
  writeHook(hookName, content) {
    const hookPath = join(this.hooksDir, hookName);

    try {
      writeFileSync(hookPath, content);
      chmodSync(hookPath, "755");
    } catch (error) {
      console.error(`❌ Could not create ${hookName} hook:`, error.message);
      process.exit(1);
    }
  }

  /**
   * Remove Git hooks
   */
  async remove() {
    console.log("🗑️  GitVan: Removing Git hooks\n");

    const hooks = [
      "pre-commit",
      "post-commit",
      "pre-push",
      "post-merge",
      "post-checkout",
    ];

    for (const hook of hooks) {
      try {
        const hookPath = join(this.hooksDir, hook);
        execSync(`rm -f "${hookPath}"`);
        console.log(`   ✅ Removed ${hook} hook`);
      } catch (error) {
        console.warn(`   ⚠️  Could not remove ${hook} hook:`, error.message);
      }
    }

    console.log("\n✅ GitVan Git hooks removed!");
  }

  /**
   * List current Git hooks
   */
  async list() {
    console.log("📋 GitVan: Current Git hooks\n");

    const hooks = [
      "pre-commit",
      "post-commit",
      "pre-push",
      "post-merge",
      "post-checkout",
    ];

    for (const hook of hooks) {
      try {
        const hookPath = join(this.hooksDir, hook);
        const { existsSync } = await import("fs");

        if (existsSync(hookPath)) {
          console.log(`   ✅ ${hook} - Active`);
        } else {
          console.log(`   ❌ ${hook} - Not installed`);
        }
      } catch (error) {
        console.warn(`   ⚠️  Could not check ${hook} hook:`, error.message);
      }
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const setup = new GitHooksSetup();
  const command = process.argv[2] || "setup";

  switch (command) {
    case "setup":
      await setup.setup();
      break;
    case "remove":
      await setup.remove();
      break;
    case "list":
      await setup.list();
      break;
    default:
      console.log("Usage: node git-hooks-setup.mjs [setup|remove|list]");
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { GitHooksSetup };
