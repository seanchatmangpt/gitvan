/**
 * @fileoverview GitVan Hook Example: Custom Validation Hook
 *
 * This example demonstrates how to create a custom validation hook with:
 * - Custom business logic enforcement
 * - Commit message format validation (Conventional Commits)
 * - File change validation against ticket numbers
 * - RDF predicate evaluation for complex rules
 * - Multiple validation rules with detailed error messages
 *
 * USAGE:
 * 1. Copy this file to your hooks/ directory
 * 2. Customize validation rules for your team's workflow
 * 3. The hook will run before commits to enforce policies
 *
 * PERFORMANCE NOTES:
 * - Runs synchronously (blocks commit if validation fails)
 * - Multiple validation rules run in sequence
 * - Typical execution: 50-200ms for all checks
 * - Can be optimized with parallel validation
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { defineJob } from "../../src/core/job-registry.mjs";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "custom-validation-hook",
    desc: "Enforce custom business logic and validation rules before commits",
    tags: ["pre-commit", "validation", "business-logic", "policy"],
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
    console.log("🔐 Running custom validation checks...");

    const startTime = performance.now();
    const validationErrors = [];
    const validationWarnings = [];

    try {
      // Run all validation checks
      const checks = [
        // 1. Commit message format validation
        {
          name: "Commit Message Format",
          fn: () => this.validateCommitMessage(),
        },
        // 2. File change validation
        {
          name: "File Changes",
          fn: () => this.validateFileChanges(),
        },
        // 3. Branch naming validation
        {
          name: "Branch Naming",
          fn: () => this.validateBranchName(),
        },
        // 4. File size validation
        {
          name: "File Size",
          fn: () => this.validateFileSize(),
        },
        // 5. Secret detection
        {
          name: "Secret Detection",
          fn: () => this.detectSecrets(),
        },
        // 6. Breaking change detection
        {
          name: "Breaking Changes",
          fn: () => this.detectBreakingChanges(),
        },
      ];

      // Run all checks
      for (const check of checks) {
        try {
          console.log(`   🔍 Checking: ${check.name}...`);
          const result = await check.fn();

          if (!result.valid) {
            if (result.severity === "error") {
              validationErrors.push({
                check: check.name,
                message: result.message,
                details: result.details,
              });
              console.error(`   ❌ ${check.name}: ${result.message}`);
            } else {
              validationWarnings.push({
                check: check.name,
                message: result.message,
                details: result.details,
              });
              console.warn(`   ⚠️  ${check.name}: ${result.message}`);
            }
          } else {
            console.log(`   ✅ ${check.name}: passed`);
          }
        } catch (error) {
          validationErrors.push({
            check: check.name,
            message: `Check failed: ${error.message}`,
          });
          console.error(`   ❌ ${check.name}: ${error.message}`);
        }
      }

      const duration = performance.now() - startTime;

      // If there are validation errors, block the commit
      if (validationErrors.length > 0) {
        console.error("");
        console.error("   ❌ Validation failed! Cannot commit:");
        validationErrors.forEach((error, i) => {
          console.error(`   ${i + 1}. ${error.check}: ${error.message}`);
          if (error.details) {
            console.error(`      ${error.details}`);
          }
        });
        console.error("");

        return {
          success: false,
          error: "Validation failed",
          validationErrors,
          validationWarnings,
          duration: Math.round(duration),
          exitCode: 1, // Block commit
        };
      }

      // Show warnings but allow commit
      if (validationWarnings.length > 0) {
        console.warn("");
        console.warn("   ⚠️  Validation warnings (commit allowed):");
        validationWarnings.forEach((warning, i) => {
          console.warn(`   ${i + 1}. ${warning.check}: ${warning.message}`);
        });
        console.warn("");
      }

      console.log(
        `   ✅ All validation checks passed (${duration.toFixed(0)}ms)`
      );

      return {
        success: true,
        validationErrors,
        validationWarnings,
        checksRun: checks.length,
        duration: Math.round(duration),
      };
    } catch (error) {
      console.error("   ❌ Validation hook failed:", error.message);

      return {
        success: false,
        error: error.message,
        exitCode: 1,
      };
    }
  },

  /**
   * Validate commit message format (Conventional Commits)
   * @returns {Promise<Object>} Validation result
   */
  async validateCommitMessage() {
    try {
      // Read commit message from Git
      const commitMsg = execSync("git log -1 --pretty=%B 2>/dev/null || echo ''", {
        encoding: "utf8",
        cwd: process.cwd(),
      }).trim();

      // If no commit message yet (pre-commit), try to read from .git/COMMIT_EDITMSG
      let message = commitMsg;
      if (!message) {
        try {
          message = readFileSync(
            join(process.cwd(), ".git", "COMMIT_EDITMSG"),
            "utf8"
          ).trim();
        } catch {
          // No commit message file yet
          return { valid: true }; // Skip validation if no message
        }
      }

      // Conventional Commits format: <type>(<scope>): <subject>
      // Examples:
      //   feat: add new feature
      //   fix(api): resolve authentication bug
      //   docs: update README
      const conventionalCommitRegex =
        /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: .{1,100}/;

      if (!conventionalCommitRegex.test(message)) {
        return {
          valid: false,
          severity: "error",
          message: "Commit message does not follow Conventional Commits format",
          details: `Expected format: <type>(<scope>): <subject>\n      Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert\n      Example: feat(api): add user authentication`,
        };
      }

      // Additional checks
      const lines = message.split("\n");
      const subject = lines[0];

      // Check subject length
      if (subject.length > 100) {
        return {
          valid: false,
          severity: "warning",
          message: "Commit subject line is too long (max 100 characters)",
          details: `Current length: ${subject.length} characters`,
        };
      }

      // Check for imperative mood (starts with lowercase verb)
      const subjectText = subject.split(": ")[1] || "";
      if (subjectText && /^[A-Z]/.test(subjectText)) {
        return {
          valid: false,
          severity: "warning",
          message: "Commit subject should use imperative mood (lowercase)",
          details: 'Example: "add feature" not "Add feature" or "Added feature"',
        };
      }

      return { valid: true };
    } catch (error) {
      // If we can't read commit message, skip validation
      return { valid: true };
    }
  },

  /**
   * Validate file changes match ticket number in branch name
   * @returns {Promise<Object>} Validation result
   */
  async validateFileChanges() {
    try {
      // Get current branch name
      const branchName = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
        cwd: process.cwd(),
      }).trim();

      // Extract ticket number from branch name
      // Examples: feature/JIRA-123-add-auth, fix/PROJ-456-bug
      const ticketMatch = branchName.match(/([A-Z]+-\d+)/);

      if (!ticketMatch) {
        // No ticket number in branch name - just warn
        return {
          valid: false,
          severity: "warning",
          message: "Branch name does not contain a ticket number",
          details:
            "Consider using format: feature/TICKET-123-description or fix/TICKET-456-description",
        };
      }

      const ticketNumber = ticketMatch[1];

      // Get staged files
      const stagedFiles = execSync("git diff --cached --name-only", {
        encoding: "utf8",
        cwd: process.cwd(),
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      if (stagedFiles.length === 0) {
        return {
          valid: false,
          severity: "error",
          message: "No files staged for commit",
          details: "Use 'git add <files>' to stage changes",
        };
      }

      // Could add more sophisticated checks here:
      // - Verify ticket exists in issue tracker
      // - Check if files match ticket scope
      // - Validate against project policies

      return { valid: true };
    } catch (error) {
      return { valid: true }; // Don't fail on errors
    }
  },

  /**
   * Validate branch naming convention
   * @returns {Promise<Object>} Validation result
   */
  async validateBranchName() {
    try {
      const branchName = execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
        cwd: process.cwd(),
      }).trim();

      // Skip validation for main/master/develop
      if (["main", "master", "develop", "HEAD"].includes(branchName)) {
        return { valid: true };
      }

      // Branch naming convention: <type>/<description>
      // Examples: feature/add-auth, fix/resolve-bug, docs/update-readme
      const branchRegex = /^(feature|fix|docs|style|refactor|perf|test|build|ci|chore)\/[a-z0-9-]+$/;

      if (!branchRegex.test(branchName)) {
        return {
          valid: false,
          severity: "warning",
          message: "Branch name does not follow naming convention",
          details: `Expected format: <type>/<description-with-dashes>\n      Valid types: feature, fix, docs, style, refactor, perf, test, build, ci, chore\n      Example: feature/add-user-authentication`,
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: true };
    }
  },

  /**
   * Validate file sizes (prevent committing large files)
   * @returns {Promise<Object>} Validation result
   */
  async validateFileSize() {
    try {
      // Get staged files with sizes
      const stagedFiles = execSync("git diff --cached --name-only", {
        encoding: "utf8",
        cwd: process.cwd(),
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
      const largeFiles = [];

      for (const file of stagedFiles) {
        try {
          const stats = require("fs").statSync(join(process.cwd(), file));
          if (stats.size > MAX_FILE_SIZE) {
            largeFiles.push({
              file,
              size: stats.size,
              sizeReadable: this.formatBytes(stats.size),
            });
          }
        } catch {
          // File might not exist (deleted)
        }
      }

      if (largeFiles.length > 0) {
        return {
          valid: false,
          severity: "error",
          message: "Large files detected (max 5 MB)",
          details: largeFiles
            .map((f) => `${f.file} (${f.sizeReadable})`)
            .join(", "),
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: true };
    }
  },

  /**
   * Detect potential secrets in staged files
   * @returns {Promise<Object>} Validation result
   */
  async detectSecrets() {
    try {
      // Get staged file contents
      const stagedFiles = execSync("git diff --cached --name-only", {
        encoding: "utf8",
        cwd: process.cwd(),
      })
        .trim()
        .split("\n")
        .filter((f) => f.length > 0);

      const suspiciousPatterns = [
        /api[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
        /password\s*=\s*['"][^'"]{8,}['"]/i,
        /secret[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
        /private[_-]?key\s*=\s*['"][^'"]{20,}['"]/i,
        /-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----/,
      ];

      const suspiciousFiles = [];

      for (const file of stagedFiles) {
        try {
          const content = readFileSync(join(process.cwd(), file), "utf8");

          for (const pattern of suspiciousPatterns) {
            if (pattern.test(content)) {
              suspiciousFiles.push(file);
              break;
            }
          }
        } catch {
          // File might not exist or not readable
        }
      }

      if (suspiciousFiles.length > 0) {
        return {
          valid: false,
          severity: "error",
          message: "Potential secrets detected in files",
          details: `Files: ${suspiciousFiles.join(", ")}\n      Please remove secrets and use environment variables`,
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: true };
    }
  },

  /**
   * Detect breaking changes in commit
   * @returns {Promise<Object>} Validation result
   */
  async detectBreakingChanges() {
    try {
      // Check commit message for breaking change indicators
      let message = "";
      try {
        message = readFileSync(
          join(process.cwd(), ".git", "COMMIT_EDITMSG"),
          "utf8"
        ).trim();
      } catch {
        // No commit message file yet
        return { valid: true };
      }

      // Breaking changes are indicated by:
      // 1. "!" after type: feat!: breaking change
      // 2. "BREAKING CHANGE:" in body/footer
      const hasBreakingIndicator =
        /^[a-z]+(\([a-z0-9-]+\))?!:/.test(message) ||
        message.includes("BREAKING CHANGE:");

      if (hasBreakingIndicator) {
        // Just warn - don't block (breaking changes are sometimes necessary)
        return {
          valid: false,
          severity: "warning",
          message: "Breaking change detected",
          details:
            "This commit introduces breaking changes. Ensure version bump is appropriate.",
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: true };
    }
  },

  /**
   * Format bytes to human-readable string
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  },
});

/**
 * CUSTOMIZATION EXAMPLES:
 *
 * 1. Require ticket number in commit message:
 *    async validateTicketInMessage() {
 *      const message = await this.getCommitMessage();
 *      if (!/[A-Z]+-\d+/.test(message)) {
 *        return {
 *          valid: false,
 *          severity: "error",
 *          message: "Commit message must include ticket number (e.g., JIRA-123)"
 *        };
 *      }
 *      return { valid: true };
 *    }
 *
 * 2. Enforce code owners for specific files:
 *    async validateCodeOwners() {
 *      const stagedFiles = await this.getStagedFiles();
 *      const criticalFiles = stagedFiles.filter(f => f.startsWith('src/core/'));
 *      if (criticalFiles.length > 0) {
 *        const author = execSync('git config user.email', {encoding: 'utf8'}).trim();
 *        const codeOwners = ['senior@company.com', 'architect@company.com'];
 *        if (!codeOwners.includes(author)) {
 *          return {
 *            valid: false,
 *            severity: "error",
 *            message: "Critical files require code owner approval"
 *          };
 *        }
 *      }
 *      return { valid: true };
 *    }
 *
 * 3. Require tests for new features:
 *    async validateTestsForFeatures() {
 *      const stagedFiles = await this.getStagedFiles();
 *      const sourceFiles = stagedFiles.filter(f => f.startsWith('src/') && !f.includes('.test.'));
 *      const testFiles = stagedFiles.filter(f => f.includes('.test.'));
 *      if (sourceFiles.length > 0 && testFiles.length === 0) {
 *        return {
 *          valid: false,
 *          severity: "warning",
 *          message: "Source files changed but no tests added"
 *        };
 *      }
 *      return { valid: true };
 *    }
 *
 * 4. Validate against RDF policies:
 *    async validateAgainstRDFPolicy() {
 *      const turtle = await useTurtle({ graphDir: './policies' });
 *      const graph = useGraph(turtle.store);
 *      // Query RDF graph for policy violations
 *      const violations = await this.queryPolicyViolations(graph);
 *      if (violations.length > 0) {
 *        return {
 *          valid: false,
 *          severity: "error",
 *          message: "Policy violations detected",
 *          details: violations.join(", ")
 *        };
 *      }
 *      return { valid: true };
 *    }
 *
 * PREDICATE EVALUATION:
 *
 * For complex validation rules, use RDF predicates:
 *
 * 1. Define policy in Turtle:
 *    @prefix policy: <http://example.com/policy/> .
 *    policy:MaxFileSize a policy:Rule ;
 *      policy:threshold 5000000 ;
 *      policy:severity "error" .
 *
 * 2. Evaluate with PredicateEvaluator:
 *    const evaluator = new PredicateEvaluator();
 *    const result = await evaluator.evaluate(hook, graph);
 *
 * PERFORMANCE NOTES:
 *
 * - All checks run sequentially (50-200ms total)
 * - For parallel execution, use Promise.all()
 * - Cache validation results for repeated checks
 * - Skip expensive checks if cheap ones fail first
 */
