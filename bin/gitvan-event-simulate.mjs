#!/usr/bin/env node
/**
 * GitVan Event Simulate Command - Strict Minimal
 *
 * Usage: gitvan event simulate --files "<path1,path2,path3>"
 *
 * Exercises 10-router.* logic without a real commit:
 * - Simulates changed files
 * - Runs unrouting matching
 * - Shows job queue without execution
 */

import { createGitVanHookLoader } from "../src/core/hook-loader.mjs";

/**
 * GitVan Event Simulate Command
 */
class GitVanEventSimulateCommand {
  constructor() {
    this.loader = createGitVanHookLoader();
  }

  /**
   * Simulate event with specified files
   */
  async run(files) {
    console.log("🔍 GitVan Event Simulate: Testing router logic\n");

    if (!files || files.length === 0) {
      console.error("❌ No files specified");
      console.error(
        'Usage: gitvan event simulate --files "<path1,path2,path3>"'
      );
      process.exit(1);
    }

    // Parse files
    const changedFiles = files
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f);
    console.log(`📁 Simulating changes for ${changedFiles.length} files:`);
    changedFiles.forEach((file) => console.log(`   - ${file}`));

    // Create simulation context
    const context = {
      cwd: process.cwd(),
      timestamp: Date.now(),
      simulated: true,
      changedFiles,
    };

    // Test post-commit router
    console.log("\n🔧 Testing post-commit router:");
    await this.testRouter("post-commit", context);

    // Test post-merge router
    console.log("\n🔧 Testing post-merge router:");
    await this.testRouter("post-merge", context);

    console.log("\n✅ Event simulation complete!");
  }

  /**
   * Test router logic
   */
  async testRouter(hookType, context) {
    try {
      // Find router hook
      const hookFiles = await this.loader.findHookFiles(hookType);
      const routerHook = hookFiles.find((f) => f.includes("10-router"));

      if (!routerHook) {
        console.log(`   ⚠️  No router hook found for ${hookType}`);
        return;
      }

      console.log(`   🔧 Running ${routerHook.split("/").pop()}`);

      // Execute router hook
      await this.loader.executeHook(routerHook, context);
    } catch (error) {
      console.error(`   ❌ Error testing ${hookType} router:`, error.message);
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const filesIndex = args.indexOf("--files");

  if (filesIndex === -1 || filesIndex === args.length - 1) {
    return null;
  }

  return args[filesIndex + 1];
}

/**
 * Main execution
 */
async function main() {
  const command = new GitVanEventSimulateCommand();
  const files = parseArgs();

  if (!files) {
    console.error('Usage: gitvan event simulate --files "<path1,path2,path3>"');
    console.error(
      'Example: gitvan event simulate --files "src/components/Button.tsx,src/pages/Dashboard.tsx"'
    );
    process.exit(1);
  }

  await command.run(files);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { GitVanEventSimulateCommand };
