#!/usr/bin/env node

/**
 * GitVan v2 Production Release Automation
 *
 * This script automates the production release process for GitVan v2.0.0
 * It handles version bumping, testing, publishing, and post-release validation.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const VERSION = "2.0.0";
const PACKAGE_NAME = "gitvan";

class ReleaseAutomation {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJsonPath = join(this.projectRoot, "package.json");
    this.packageJson = JSON.parse(readFileSync(this.packageJsonPath, "utf8"));
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, options = {}) {
    try {
      this.log(`Running: ${command}`);
      const result = execSync(command, {
        encoding: "utf8",
        cwd: this.projectRoot,
        ...options,
      });
      return result.trim();
    } catch (error) {
      this.log(`Command failed: ${command}`, "error");
      this.log(error.message, "error");
      throw error;
    }
  }

  async validatePreRelease() {
    this.log("🔍 Validating pre-release requirements...");

    // Check if we're on main branch
    const currentBranch = await this.runCommand("git branch --show-current");
    if (currentBranch !== "main") {
      throw new Error(`Must be on main branch, currently on: ${currentBranch}`);
    }

    // Check if working directory is clean
    const gitStatus = await this.runCommand("git status --porcelain");
    if (gitStatus) {
      throw new Error("Working directory must be clean before release");
    }

    // Run tests
    this.log("🧪 Running tests...");
    await this.runCommand("npm test");

    // Run linting
    this.log("🔍 Running linting...");
    await this.runCommand("npm run lint");

    // Check TypeScript definitions
    this.log("📝 Checking TypeScript definitions...");
    await this.runCommand("npm run types");

    this.log("✅ Pre-release validation complete", "success");
  }

  async bumpVersion() {
    this.log(`📦 Bumping version to ${VERSION}...`);

    // Update package.json
    this.packageJson.version = VERSION;
    writeFileSync(
      this.packageJsonPath,
      JSON.stringify(this.packageJson, null, 2) + "\n"
    );

    // Commit version bump
    await this.runCommand("git add package.json");
    await this.runCommand(`git commit -m "chore: bump version to ${VERSION}"`);

    // Create tag
    await this.runCommand(`git tag v${VERSION}`);

    this.log(`✅ Version bumped to ${VERSION}`, "success");
  }

  async publishToNpm() {
    this.log("📦 Publishing to npm...");

    // Dry run first
    this.log("🔍 Running npm publish dry-run...");
    await this.runCommand("npm publish --dry-run");

    // Publish to npm
    this.log("🚀 Publishing to npm...");
    await this.runCommand("npm publish --access public");

    // Verify publication
    this.log("✅ Verifying publication...");
    const publishedVersion = await this.runCommand(
      `npm view ${PACKAGE_NAME}@${VERSION} version`
    );

    if (publishedVersion !== VERSION) {
      throw new Error(
        `Version mismatch: expected ${VERSION}, got ${publishedVersion}`
      );
    }

    this.log(
      `✅ Successfully published ${PACKAGE_NAME}@${VERSION} to npm`,
      "success"
    );
  }

  async createGitHubRelease() {
    this.log("🐙 Creating GitHub release...");

    // Push tags
    await this.runCommand("git push origin main --tags");

    // Create GitHub release (requires gh CLI)
    try {
      await this.runCommand(`gh release create v${VERSION} \
        --title "GitVan v${VERSION} - Production Release" \
        --notes "GitVan v${VERSION} introduces a job-only architecture with Git-native execution, eliminating hooks directory complexity while providing simpler execution and better developer experience." \
        --draft=false`);

      this.log("✅ GitHub release created", "success");
    } catch (error) {
      this.log("⚠️ GitHub release creation failed (requires gh CLI)", "error");
      this.log(
        "Please create the release manually at: https://github.com/seanchatmangpt/gitvan/releases/new"
      );
    }
  }

  async postReleaseValidation() {
    this.log("🧪 Running post-release validation...");

    // Test global installation
    this.log("📦 Testing global installation...");
    try {
      await this.runCommand(`npm install -g ${PACKAGE_NAME}@${VERSION}`);
      const version = await this.runCommand("gitvan --version");
      this.log(`✅ Global installation test passed: ${version}`, "success");
    } catch (error) {
      this.log("❌ Global installation test failed", "error");
    }

    // Test local installation
    this.log("📦 Testing local installation...");
    try {
      const testDir = join(this.projectRoot, "test-installation");
      await this.runCommand(`mkdir -p ${testDir}`);
      await this.runCommand(`cd ${testDir} && npm init -y`);
      await this.runCommand(
        `cd ${testDir} && npm install ${PACKAGE_NAME}@${VERSION}`
      );
      const version = await this.runCommand(
        `cd ${testDir} && npx gitvan --version`
      );
      this.log(`✅ Local installation test passed: ${version}`, "success");

      // Cleanup
      await this.runCommand(`rm -rf ${testDir}`);
    } catch (error) {
      this.log("❌ Local installation test failed", "error");
    }

    this.log("✅ Post-release validation complete", "success");
  }

  async run() {
    try {
      this.log(`🚀 Starting GitVan v${VERSION} production release...`);

      // Pre-release validation
      await this.validatePreRelease();

      // Version bump
      await this.bumpVersion();

      // Publish to npm
      await this.publishToNpm();

      // Create GitHub release
      await this.createGitHubRelease();

      // Post-release validation
      await this.postReleaseValidation();

      this.log(`🎉 GitVan v${VERSION} production release complete!`, "success");
      this.log("");
      this.log("📊 Release Summary:");
      this.log(`  - Version: ${VERSION}`);
      this.log(`  - Package: ${PACKAGE_NAME}`);
      this.log(`  - npm: https://www.npmjs.com/package/${PACKAGE_NAME}`);
      this.log(
        `  - GitHub: https://github.com/seanchatmangpt/gitvan/releases/tag/v${VERSION}`
      );
      this.log("");
      this.log("🎯 Next Steps:");
      this.log("  - Monitor npm downloads");
      this.log("  - Track GitHub issues");
      this.log("  - Collect user feedback");
      this.log("  - Plan v2.1.0 features");
    } catch (error) {
      this.log(`❌ Release failed: ${error.message}`, "error");
      process.exit(1);
    }
  }
}

// Run the release automation
const release = new ReleaseAutomation();
release.run().catch(console.error);
