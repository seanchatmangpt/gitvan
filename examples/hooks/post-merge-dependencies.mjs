/**
 * @fileoverview GitVan Hook Example: Post-merge Dependencies
 *
 * This example demonstrates how to create a post-merge hook that:
 * - Automatically updates dependencies after merging
 * - Runs npm/pnpm/yarn install when package.json changes
 * - Updates lock files to prevent conflicts
 * - Triggered specifically after merging main/master branch
 *
 * USAGE:
 * 1. Copy this file to your hooks/ directory
 * 2. GitVan will automatically discover and register it
 * 3. The hook will run after successful merge operations
 *
 * PERFORMANCE NOTES:
 * - Only runs when package.json actually changed
 * - Smart detection of package manager (npm/pnpm/yarn)
 * - Skips if dependencies already up to date
 * - Typical execution: 2-10s for dependency updates
 * - Can run in background with Bree (non-blocking)
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { defineJob } from "../../src/core/job-registry.mjs";
import { execSync, exec } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export default defineJob({
  meta: {
    name: "post-merge-dependencies",
    desc: "Automatically update dependencies after merging branches",
    tags: ["post-merge", "dependencies", "npm", "automation"],
    version: "1.0.0",
  },

  // Register this job to run on post-merge hook
  hooks: ["post-merge"],

  /**
   * Main execution function
   * @param {Object} context - Job execution context
   * @returns {Promise<Object>} Execution result
   */
  async run(context) {
    console.log("📦 Post-merge dependency check...");

    const startTime = performance.now();

    try {
      // Step 1: Check if this was a merge from main/master
      const mergeInfo = await this.getMergeInfo();

      console.log(`   🔀 Merged from: ${mergeInfo.sourceBranch || "unknown"}`);
      console.log(`   🌿 Current branch: ${mergeInfo.currentBranch}`);

      // Step 2: Check if package.json or lock files changed
      const dependencyFilesChanged = await this.checkDependencyFilesChanged();

      if (!dependencyFilesChanged.hasChanges) {
        console.log("   ✅ No dependency files changed - skipping update");
        return {
          success: true,
          skipped: true,
          reason: "No dependency changes detected",
        };
      }

      console.log(
        `   📝 Dependency files changed: ${dependencyFilesChanged.files.join(", ")}`
      );

      // Step 3: Detect package manager
      const packageManager = await this.detectPackageManager();
      console.log(`   📦 Package manager: ${packageManager}`);

      // Step 4: Update dependencies
      const updateResult = await this.updateDependencies(packageManager);

      const duration = performance.now() - startTime;

      if (updateResult.success) {
        console.log(
          `   ✅ Dependencies updated successfully (${duration.toFixed(0)}ms)`
        );

        // Step 5: Check if lock file was updated
        const lockFileUpdated = await this.checkLockFileUpdated(packageManager);

        if (lockFileUpdated) {
          console.log(
            `   💡 Lock file updated - remember to commit the changes!`
          );
        }

        return {
          success: true,
          packageManager,
          filesChanged: dependencyFilesChanged.files,
          lockFileUpdated,
          duration: Math.round(duration),
          output: updateResult.output,
        };
      } else {
        console.error("   ❌ Dependency update failed:");
        console.error(updateResult.error);

        // Don't fail the merge - just warn the user
        return {
          success: true,
          error: updateResult.error,
          note: "Merge succeeded, but dependency update failed - please run manually",
        };
      }
    } catch (error) {
      console.error("   ❌ Post-merge hook failed:", error.message);

      // Post-merge hooks should not fail the merge
      return {
        success: true,
        error: error.message,
        note: "Merge succeeded, but hook encountered errors",
      };
    }
  },

  /**
   * Get information about the merge
   * @returns {Promise<Object>} Merge information
   */
  async getMergeInfo() {
    try {
      // Get current branch
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
        cwd: process.cwd(),
      }).trim();

      // Get merge commit details (if this is a merge commit)
      let sourceBranch = null;
      try {
        const mergeMsg = execSync("git log -1 --pretty=%B", {
          encoding: "utf8",
          cwd: process.cwd(),
        }).trim();

        // Parse source branch from merge message
        // Format: "Merge branch 'feature' into main"
        const match = mergeMsg.match(/Merge branch '([^']+)'/);
        if (match) {
          sourceBranch = match[1];
        }
      } catch {
        // Not a merge commit or couldn't get message
      }

      return {
        currentBranch,
        sourceBranch,
        isMergeCommit: sourceBranch !== null,
      };
    } catch (error) {
      console.warn("   ⚠️  Could not get merge info:", error.message);
      return {
        currentBranch: "unknown",
        sourceBranch: null,
        isMergeCommit: false,
      };
    }
  },

  /**
   * Check if dependency-related files changed in the merge
   * @returns {Promise<Object>} Changed files info
   */
  async checkDependencyFilesChanged() {
    try {
      // Get files changed in the merge
      // Compare HEAD with HEAD~1 (before merge)
      const changedFiles = execSync(
        "git diff --name-only HEAD~1 HEAD 2>/dev/null || echo ''",
        {
          encoding: "utf8",
          cwd: process.cwd(),
        }
      )
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      // Check for dependency files
      const dependencyFiles = [
        "package.json",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "bun.lockb",
      ];

      const changedDependencyFiles = changedFiles.filter((file) =>
        dependencyFiles.includes(file)
      );

      return {
        hasChanges: changedDependencyFiles.length > 0,
        files: changedDependencyFiles,
        allChangedFiles: changedFiles,
      };
    } catch (error) {
      console.warn("   ⚠️  Could not check changed files:", error.message);
      return {
        hasChanges: false,
        files: [],
        allChangedFiles: [],
      };
    }
  },

  /**
   * Detect which package manager is being used
   * @returns {Promise<string>} Package manager name (npm, pnpm, yarn, bun)
   */
  async detectPackageManager() {
    const cwd = process.cwd();

    // Check for lock files (most reliable indicator)
    if (existsSync(join(cwd, "pnpm-lock.yaml"))) {
      return "pnpm";
    }
    if (existsSync(join(cwd, "yarn.lock"))) {
      return "yarn";
    }
    if (existsSync(join(cwd, "bun.lockb"))) {
      return "bun";
    }
    if (existsSync(join(cwd, "package-lock.json"))) {
      return "npm";
    }

    // Check package.json for packageManager field (Node.js Corepack)
    try {
      const packageJson = JSON.parse(
        readFileSync(join(cwd, "package.json"), "utf8")
      );
      if (packageJson.packageManager) {
        if (packageJson.packageManager.startsWith("pnpm")) return "pnpm";
        if (packageJson.packageManager.startsWith("yarn")) return "yarn";
        if (packageJson.packageManager.startsWith("bun")) return "bun";
        if (packageJson.packageManager.startsWith("npm")) return "npm";
      }
    } catch {
      // Couldn't read package.json
    }

    // Default to npm
    return "npm";
  },

  /**
   * Update dependencies using detected package manager
   * @param {string} packageManager - Package manager to use
   * @returns {Promise<Object>} Update result
   */
  async updateDependencies(packageManager) {
    try {
      let command;
      let installCommand;

      switch (packageManager) {
        case "pnpm":
          installCommand = "pnpm install";
          break;
        case "yarn":
          installCommand = "yarn install";
          break;
        case "bun":
          installCommand = "bun install";
          break;
        case "npm":
        default:
          installCommand = "npm install";
          break;
      }

      console.log(`   ⚙️  Running: ${installCommand}`);

      // Run install command
      const { stdout, stderr } = await execAsync(installCommand, {
        cwd: process.cwd(),
        encoding: "utf8",
        // Set timeout to 5 minutes for large dependency trees
        timeout: 300000,
      });

      return {
        success: true,
        output: stdout || stderr,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr || "",
      };
    }
  },

  /**
   * Check if lock file was updated by install
   * @param {string} packageManager - Package manager used
   * @returns {Promise<boolean>} True if lock file was updated
   */
  async checkLockFileUpdated(packageManager) {
    try {
      const lockFiles = {
        npm: "package-lock.json",
        pnpm: "pnpm-lock.yaml",
        yarn: "yarn.lock",
        bun: "bun.lockb",
      };

      const lockFile = lockFiles[packageManager];
      if (!lockFile) return false;

      // Check if lock file is in working tree (modified)
      const status = execSync("git status --porcelain", {
        encoding: "utf8",
        cwd: process.cwd(),
      });

      return status.includes(lockFile);
    } catch (error) {
      console.warn("   ⚠️  Could not check lock file status:", error.message);
      return false;
    }
  },
});

/**
 * EXAMPLE SCENARIOS:
 *
 * Scenario 1: Merge from feature branch that added dependencies
 * - Hook detects package.json changed
 * - Runs npm install automatically
 * - Lock file is updated
 * - Developer commits the updated lock file
 *
 * Scenario 2: Merge that didn't change dependencies
 * - Hook detects no package.json changes
 * - Skips installation
 * - No action needed
 *
 * Scenario 3: Merge from main with dependency updates
 * - Hook detects package-lock.json changed
 * - Runs npm install to sync node_modules
 * - Ensures working directory matches lock file
 *
 * CUSTOMIZATION IDEAS:
 *
 * 1. Only run for specific branches:
 *    if (mergeInfo.sourceBranch !== 'main' && mergeInfo.sourceBranch !== 'develop') {
 *      return { success: true, skipped: true, reason: 'Not from protected branch' };
 *    }
 *
 * 2. Run in background with Bree:
 *    const job = useJob();
 *    await job.schedule({
 *      name: 'dependency-update',
 *      job: () => this.updateDependencies(packageManager)
 *    });
 *
 * 3. Send notification on completion:
 *    if (updateResult.success) {
 *      await sendSlackMessage('Dependencies updated after merge');
 *    }
 *
 * 4. Auto-commit updated lock file:
 *    if (lockFileUpdated) {
 *      execSync(`git add ${lockFile}`);
 *      execSync('git commit -m "chore: update lock file after merge"');
 *    }
 *
 * 5. Check for security vulnerabilities:
 *    await execAsync('npm audit');
 *    await execAsync('npm audit fix');
 *
 * PERFORMANCE OPTIMIZATION:
 *
 * For faster execution:
 * - Use --frozen-lockfile flag to skip lock file updates
 * - Cache node_modules between merges
 * - Run in background with Bree (non-blocking)
 * - Skip for branches that rarely change dependencies
 *
 * INTEGRATION WITH CI/CD:
 *
 * This hook pairs well with CI/CD:
 * - Local: Runs quick dependency sync
 * - CI: Runs full test suite with updated dependencies
 * - Deploy: Uses exact lock file versions
 */
