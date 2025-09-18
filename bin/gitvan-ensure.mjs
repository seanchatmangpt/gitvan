#!/usr/bin/env node
/**
 * GitVan Ensure Command - Strict Minimal
 *
 * Usage: gitvan ensure
 *
 * Installs Git hooks for GitVan:
 * - post-commit -> gitvan hook post-commit
 * - post-merge -> gitvan hook post-merge
 */

import { writeFileSync, chmodSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * GitVan Ensure Command
 */
class GitVanEnsureCommand {
  constructor() {
    this.projectRoot = process.cwd();
    this.hooksDir = join(this.projectRoot, ".git", "hooks");
    this.gitvanHookPath = join(__dirname, "gitvan-hook.mjs");
  }

  /**
   * Ensure Git hooks are installed
   */
  async run() {
    console.log("🔧 GitVan: Ensuring Git hooks are installed\n");

    // Ensure hooks directory exists
    this.ensureHooksDirectory();

    // Install supported hooks
    await this.installPostCommitHook();
    await this.installPostMergeHook();

    console.log("✅ GitVan Git hooks ensured!");
    console.log("\n🎯 Installed hooks:");
    console.log("   - post-commit: gitvan hook post-commit");
    console.log("   - post-merge: gitvan hook post-merge");
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
   * Install post-commit hook
   */
  async installPostCommitHook() {
    const hookContent = `#!/bin/sh
# GitVan Post-Commit Hook - Strict Minimal
node "${this.gitvanHookPath}" post-commit
`;

    this.writeHook("post-commit", hookContent);
    console.log("   ✅ Post-commit hook installed");
  }

  /**
   * Install post-merge hook
   */
  async installPostMergeHook() {
    const hookContent = `#!/bin/sh
# GitVan Post-Merge Hook - Strict Minimal
node "${this.gitvanHookPath}" post-merge
`;

    this.writeHook("post-merge", hookContent);
    console.log("   ✅ Post-merge hook installed");
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
}

/**
 * Main execution
 */
async function main() {
  const command = new GitVanEnsureCommand();
  await command.run();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { GitVanEnsureCommand };
