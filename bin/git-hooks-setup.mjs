#!/usr/bin/env node
/**
 * GitVan Git Hooks Setup - Dark Matter 80/20
 *
 * Sets up Git hooks for surgical precision AI swarm processing
 */

import { execSync } from "child_process";
import { writeFileSync, chmodSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Git Hooks Setup - Dark Matter 80/20
 *
 * Creates Git hooks that provide surgical precision for AI swarms:
 * - Only process what changed (not entire repo)
 * - Immediate event detection
 * - Change-only context
 * - Zero-overhead scanning
 */
class GitHooksSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.hooksDir = join(this.projectRoot, ".git", "hooks");
    this.handlerPath = join(__dirname, "git-hook-handler.mjs");
  }

  /**
   * Setup Git hooks for surgical precision
   */
  async setup() {
    console.log("🔧 GitVan: Setting up Git hooks for surgical precision\n");

    // Ensure hooks directory exists
    this.ensureHooksDirectory();

    // Create Git hooks
    await this.createPreCommitHook();
    await this.createPostCommitHook();
    await this.createPrePushHook();
    await this.createPostMergeHook();
    await this.createPostCheckoutHook();

    console.log("✅ GitVan Git hooks setup complete!");
    console.log("\n🎯 Dark Matter 80/20 Benefits:");
    console.log("   - Only processes what changed (not entire repo)");
    console.log("   - Immediate event detection via Git hooks");
    console.log("   - Change-only context for AI systems");
    console.log("   - Zero-overhead repository scanning");
    console.log("\n🤖 AI Swarms now have surgical precision!");
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
   * Create pre-commit hook - Surgical precision
   */
  async createPreCommitHook() {
    const hookContent = `#!/bin/sh
# GitVan Pre-Commit Hook - Surgical Precision
# Only processes staged changes, not entire repository

node "${this.handlerPath}" pre-commit
`;

    this.writeHook("pre-commit", hookContent);
    console.log("   ✅ Pre-commit hook created (staged changes only)");
  }

  /**
   * Create post-commit hook - Surgical precision
   */
  async createPostCommitHook() {
    const hookContent = `#!/bin/sh
# GitVan Post-Commit Hook - Surgical Precision
# Only processes last commit, not entire history

node "${this.handlerPath}" post-commit
`;

    this.writeHook("post-commit", hookContent);
    console.log("   ✅ Post-commit hook created (last commit only)");
  }

  /**
   * Create pre-push hook - Surgical precision
   */
  async createPrePushHook() {
    const hookContent = `#!/bin/sh
# GitVan Pre-Push Hook - Surgical Precision
# Only processes push changes, not entire repository

node "${this.handlerPath}" pre-push
`;

    this.writeHook("pre-push", hookContent);
    console.log("   ✅ Pre-push hook created (push changes only)");
  }

  /**
   * Create post-merge hook - Surgical precision
   */
  async createPostMergeHook() {
    const hookContent = `#!/bin/sh
# GitVan Post-Merge Hook - Surgical Precision
# Only processes merged changes, not entire repository

node "${this.handlerPath}" post-merge
`;

    this.writeHook("post-merge", hookContent);
    console.log("   ✅ Post-merge hook created (merged changes only)");
  }

  /**
   * Create post-checkout hook - Surgical precision
   */
  async createPostCheckoutHook() {
    const hookContent = `#!/bin/sh
# GitVan Post-Checkout Hook - Surgical Precision
# Only processes checkout changes, not entire repository

node "${this.handlerPath}" post-checkout
`;

    this.writeHook("post-checkout", hookContent);
    console.log("   ✅ Post-checkout hook created (checkout changes only)");
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
