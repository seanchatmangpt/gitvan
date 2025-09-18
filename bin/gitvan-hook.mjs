#!/usr/bin/env node
/**
 * GitVan Hook Command - Job-Only Architecture
 *
 * Usage: gitvan hook <githook-name>
 *
 * Loads and executes jobs directly for specific Git hook types:
 * - Jobs define hooks: ["post-commit", "post-merge"]
 * - Hook loader executes jobs directly
 * - No hooks directory needed
 */

import { createGitVanHookLoader } from "../src/core/hook-loader.mjs";

/**
 * GitVan Hook Command
 */
class GitVanHookCommand {
  constructor() {
    this.loader = createGitVanHookLoader();
  }

  /**
   * Run GitVan hook
   */
  async run(gitHookName, context = {}) {
    console.log(`🔍 GitVan Hook: ${gitHookName}`);

    // Set default context
    const hookContext = {
      cwd: process.cwd(),
      timestamp: Date.now(),
      ...context,
    };

    try {
      await this.loader.run(gitHookName, hookContext);
      console.log(`✅ GitVan Hook ${gitHookName} completed`);
    } catch (error) {
      console.error(`❌ GitVan Hook ${gitHookName} failed:`, error.message);
      process.exit(1);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const command = new GitVanHookCommand();
  const gitHookName = process.argv[2];

  if (!gitHookName) {
    console.error("Usage: gitvan hook <githook-name>");
    console.error("Supported hooks: post-commit, post-merge");
    process.exit(1);
  }

  // Validate hook name
  const supportedHooks = ["post-commit", "post-merge"];
  if (!supportedHooks.includes(gitHookName)) {
    console.error(`❌ Unsupported hook: ${gitHookName}`);
    console.error(`Supported hooks: ${supportedHooks.join(", ")}`);
    process.exit(1);
  }

  await command.run(gitHookName);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { GitVanHookCommand };
