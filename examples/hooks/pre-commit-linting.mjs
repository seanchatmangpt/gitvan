/**
 * @fileoverview GitVan Hook Example: Pre-commit Linting
 *
 * This example demonstrates how to create a pre-commit hook that:
 * - Lints all staged JavaScript/TypeScript files
 * - Fails the commit if linting errors are found
 * - Shows how to access staged files using Git composables
 * - Demonstrates proper error handling and exit codes
 *
 * USAGE:
 * 1. Copy this file to your hooks/ directory
 * 2. GitVan will automatically discover and register it
 * 3. The hook will run before every commit
 *
 * PERFORMANCE NOTES:
 * - Only lints staged files (not entire codebase)
 * - Runs synchronously to block commit if needed
 * - Typical execution: 100-500ms for small changesets
 * - Large changesets (50+ files): 1-2s
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { defineJob } from "../../src/core/job-registry.mjs";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "pre-commit-linting",
    desc: "Lint staged files before commit to ensure code quality",
    tags: ["pre-commit", "linting", "code-quality", "validation"],
    version: "1.0.0",
  },

  // Register this job to run on pre-commit hook
  hooks: ["pre-commit"],

  /**
   * Main execution function
   * @param {Object} context - Job execution context
   * @returns {Promise<Object>} Execution result
   */
  async run(context) {
    console.log("🔍 Running pre-commit linting...");

    const startTime = performance.now();

    try {
      // Step 1: Get staged files
      const stagedFiles = await this.getStagedFiles();

      if (stagedFiles.length === 0) {
        console.log("   ⚠️  No staged files to lint");
        return {
          success: true,
          skipped: true,
          reason: "No staged files",
        };
      }

      console.log(`   📁 Found ${stagedFiles.length} staged file(s)`);

      // Step 2: Filter for lintable files (JS, TS, MJS, etc.)
      const lintableFiles = stagedFiles.filter((file) => {
        return (
          file.endsWith(".js") ||
          file.endsWith(".mjs") ||
          file.endsWith(".cjs") ||
          file.endsWith(".ts") ||
          file.endsWith(".tsx") ||
          file.endsWith(".jsx")
        );
      });

      if (lintableFiles.length === 0) {
        console.log("   ✅ No JavaScript/TypeScript files to lint");
        return {
          success: true,
          skipped: true,
          reason: "No lintable files",
          filesChecked: stagedFiles.length,
        };
      }

      console.log(`   🔎 Linting ${lintableFiles.length} file(s)...`);

      // Step 3: Check if ESLint is available
      const hasEslint = await this.checkLinterAvailable();

      if (!hasEslint) {
        console.warn(
          "   ⚠️  ESLint not found - skipping linting (install with: npm install -D eslint)"
        );
        return {
          success: true,
          skipped: true,
          reason: "ESLint not installed",
          filesChecked: lintableFiles.length,
        };
      }

      // Step 4: Run ESLint on staged files
      const lintResult = await this.runLinter(lintableFiles);

      const duration = performance.now() - startTime;

      if (lintResult.success) {
        console.log(`   ✅ All files passed linting (${duration.toFixed(0)}ms)`);
        return {
          success: true,
          filesChecked: lintableFiles.length,
          duration: Math.round(duration),
          lintOutput: lintResult.output,
        };
      } else {
        // Linting failed - block the commit
        console.error("   ❌ Linting failed! Fix errors before committing:");
        console.error(lintResult.output);
        console.error("");
        console.error("   💡 Tip: Run 'npm run lint -- --fix' to auto-fix issues");

        // Return failure to block commit
        return {
          success: false,
          error: "Linting errors found",
          filesChecked: lintableFiles.length,
          duration: Math.round(duration),
          lintOutput: lintResult.output,
          exitCode: 1, // Non-zero exit code blocks commit
        };
      }
    } catch (error) {
      console.error("   ❌ Linting hook failed:", error.message);

      // Decide whether to block commit on errors
      // For this example, we'll block to ensure quality
      return {
        success: false,
        error: error.message,
        exitCode: 1,
      };
    }
  },

  /**
   * Get list of staged files using git diff
   * @returns {Promise<string[]>} List of staged file paths
   */
  async getStagedFiles() {
    try {
      const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
        encoding: "utf8",
        cwd: process.cwd(),
      });

      return output
        .trim()
        .split("\n")
        .filter((file) => file.length > 0);
    } catch (error) {
      console.warn("   ⚠️  Could not get staged files:", error.message);
      return [];
    }
  },

  /**
   * Check if ESLint is installed and available
   * @returns {Promise<boolean>} True if ESLint is available
   */
  async checkLinterAvailable() {
    // Check for eslint in node_modules
    const eslintPath = join(process.cwd(), "node_modules", ".bin", "eslint");
    if (existsSync(eslintPath)) {
      return true;
    }

    // Check for global eslint
    try {
      execSync("which eslint", { encoding: "utf8", stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Run ESLint on specified files
   * @param {string[]} files - Files to lint
   * @returns {Promise<Object>} Lint result with success status and output
   */
  async runLinter(files) {
    try {
      // Construct ESLint command
      // Use --max-warnings 0 to fail on warnings too
      const filesArg = files.join(" ");
      const command = `npx eslint --max-warnings 0 ${filesArg}`;

      const output = execSync(command, {
        encoding: "utf8",
        cwd: process.cwd(),
        stdio: "pipe", // Capture output
      });

      return {
        success: true,
        output: output.trim(),
      };
    } catch (error) {
      // ESLint exits with non-zero if there are linting errors
      return {
        success: false,
        output: error.stdout || error.message,
      };
    }
  },
});

/**
 * EXAMPLE REGISTRATION:
 *
 * This hook is automatically registered by GitVan's job discovery system.
 * No additional configuration is needed - just place this file in your
 * hooks/ directory and it will run on every pre-commit.
 *
 * CUSTOMIZATION IDEAS:
 *
 * 1. Check specific file patterns only:
 *    const lintableFiles = stagedFiles.filter(f => f.startsWith('src/'));
 *
 * 2. Use different linters (Prettier, TypeScript, etc.):
 *    await this.runPrettier(files);
 *    await this.runTypeScript(files);
 *
 * 3. Auto-fix before commit:
 *    execSync(`npx eslint --fix ${filesArg}`);
 *    execSync('git add -u'); // Re-stage fixed files
 *
 * 4. Integrate with other tools:
 *    - Run Prettier formatting
 *    - Check TypeScript compilation
 *    - Run unit tests on changed files
 *    - Validate commit message format
 *
 * PERFORMANCE OPTIMIZATION:
 *
 * For large codebases, consider:
 * - Caching lint results (ESLint has built-in cache)
 * - Running linter in parallel with other hooks
 * - Using ESLint's --cache flag for faster repeated runs
 */
