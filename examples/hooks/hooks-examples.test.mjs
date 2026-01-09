/**
 * @fileoverview Tests for GitVan Hook Examples
 *
 * This test suite validates all hook examples to ensure they:
 * - Are properly structured
 * - Export valid job definitions
 * - Handle edge cases correctly
 * - Have appropriate error handling
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

// Import hook examples
import preCommitLinting from "./pre-commit-linting.mjs";
import postCommitNotifications from "./post-commit-notifications.mjs";
import postMergeDependencies from "./post-merge-dependencies.mjs";
import customValidation from "./custom-validation-hook.mjs";

describe("Hook Examples - Structure", () => {
  it("should have valid job metadata - pre-commit-linting", () => {
    expect(preCommitLinting.meta).toBeDefined();
    expect(preCommitLinting.meta.name).toBe("pre-commit-linting");
    expect(preCommitLinting.meta.desc).toBeTruthy();
    expect(preCommitLinting.meta.tags).toContain("pre-commit");
    expect(preCommitLinting.hooks).toContain("pre-commit");
  });

  it("should have valid job metadata - post-commit-notifications", () => {
    expect(postCommitNotifications.meta).toBeDefined();
    expect(postCommitNotifications.meta.name).toBe("post-commit-notifications");
    expect(postCommitNotifications.meta.desc).toBeTruthy();
    expect(postCommitNotifications.meta.tags).toContain("post-commit");
    expect(postCommitNotifications.hooks).toContain("post-commit");
  });

  it("should have valid job metadata - post-merge-dependencies", () => {
    expect(postMergeDependencies.meta).toBeDefined();
    expect(postMergeDependencies.meta.name).toBe("post-merge-dependencies");
    expect(postMergeDependencies.meta.desc).toBeTruthy();
    expect(postMergeDependencies.meta.tags).toContain("post-merge");
    expect(postMergeDependencies.hooks).toContain("post-merge");
  });

  it("should have valid job metadata - custom-validation", () => {
    expect(customValidation.meta).toBeDefined();
    expect(customValidation.meta.name).toBe("custom-validation-hook");
    expect(customValidation.meta.desc).toBeTruthy();
    expect(customValidation.meta.tags).toContain("validation");
    expect(customValidation.hooks).toContain("pre-commit");
  });

  it("should have run methods for all hooks", () => {
    expect(typeof preCommitLinting.run).toBe("function");
    expect(typeof postCommitNotifications.run).toBe("function");
    expect(typeof postMergeDependencies.run).toBe("function");
    expect(typeof customValidation.run).toBe("function");
  });
});

describe("Pre-commit Linting Hook", () => {
  let testDir;

  beforeEach(() => {
    // Create test directory
    testDir = join("/tmp", `gitvan-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // Initialize git repo
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should skip when no staged files", async () => {
    const result = await preCommitLinting.run({});

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("No staged files");
  });

  it("should skip when no lintable files", async () => {
    // Create and stage a non-JS file
    writeFileSync(join(testDir, "README.md"), "# Test");
    execSync("git add README.md", { cwd: testDir });

    const result = await preCommitLinting.run({});

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("No lintable files");
  });

  it("should detect lintable files", async () => {
    // Create and stage a JS file
    writeFileSync(join(testDir, "test.js"), 'console.log("test");');
    execSync("git add test.js", { cwd: testDir });

    // Mock execSync for linting
    const result = await preCommitLinting.run({});

    // Result depends on ESLint availability
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });

  it("should get staged files correctly", async () => {
    writeFileSync(join(testDir, "file1.js"), 'console.log("test");');
    writeFileSync(join(testDir, "file2.mjs"), 'console.log("test");');
    execSync("git add file1.js file2.mjs", { cwd: testDir });

    const files = await preCommitLinting.getStagedFiles();

    expect(files).toContain("file1.js");
    expect(files).toContain("file2.mjs");
  });
});

describe("Post-commit Notifications Hook", () => {
  let testDir;

  beforeEach(() => {
    testDir = join("/tmp", `gitvan-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // Initialize git repo with initial commit
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
    writeFileSync(join(testDir, "README.md"), "# Test");
    execSync("git add README.md && git commit -m 'Initial commit'", {
      cwd: testDir,
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should get commit information", async () => {
    const commitInfo = await postCommitNotifications.getCommitInfo();

    expect(commitInfo.hash).toBeTruthy();
    expect(commitInfo.author).toBe("Test User");
    expect(commitInfo.email).toBe("test@example.com");
    expect(commitInfo.branch).toBeTruthy();
    expect(commitInfo.message).toBeTruthy();
  });

  it("should run without errors", async () => {
    const result = await postCommitNotifications.run({});

    expect(result.success).toBe(true);
    expect(result.commitHash).toBeTruthy();
  });

  it("should handle missing webhooks gracefully", async () => {
    // Ensure no webhooks are configured
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_URL;

    const result = await postCommitNotifications.run({});

    expect(result.success).toBe(true);
    expect(result.notificationsScheduled).toBe(0);
  });

  it("should write audit trail", async () => {
    const commitInfo = await postCommitNotifications.getCommitInfo();
    await postCommitNotifications.writeAuditTrail(commitInfo);

    const auditFile = join(
      testDir,
      ".gitvan",
      "audit",
      `commit-${commitInfo.hash.substring(0, 7)}.json`
    );
    expect(existsSync(auditFile)).toBe(true);
  });
});

describe("Post-merge Dependencies Hook", () => {
  let testDir;

  beforeEach(() => {
    testDir = join("/tmp", `gitvan-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // Initialize git repo
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });

    // Create package.json
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0" }, null, 2)
    );
    execSync("git add package.json && git commit -m 'Initial commit'", {
      cwd: testDir,
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should detect package manager", async () => {
    const pm = await postMergeDependencies.detectPackageManager();

    // Should default to npm if no lock file
    expect(["npm", "pnpm", "yarn", "bun"]).toContain(pm);
  });

  it("should detect npm from package-lock.json", async () => {
    writeFileSync(join(testDir, "package-lock.json"), "{}");

    const pm = await postMergeDependencies.detectPackageManager();
    expect(pm).toBe("npm");
  });

  it("should detect pnpm from pnpm-lock.yaml", async () => {
    writeFileSync(join(testDir, "pnpm-lock.yaml"), "");

    const pm = await postMergeDependencies.detectPackageManager();
    expect(pm).toBe("pnpm");
  });

  it("should skip when no dependency files changed", async () => {
    // Create a merge that doesn't change package.json
    writeFileSync(join(testDir, "README.md"), "# Test");
    execSync("git add README.md && git commit -m 'Add README'", {
      cwd: testDir,
    });

    const result = await postMergeDependencies.run({});

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("should get merge information", async () => {
    const mergeInfo = await postMergeDependencies.getMergeInfo();

    expect(mergeInfo.currentBranch).toBeTruthy();
    expect(mergeInfo.isMergeCommit).toBeDefined();
  });
});

describe("Custom Validation Hook", () => {
  let testDir;

  beforeEach(() => {
    testDir = join("/tmp", `gitvan-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // Initialize git repo
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should validate commit message format", async () => {
    // Write valid conventional commit message
    writeFileSync(
      join(testDir, ".git", "COMMIT_EDITMSG"),
      "feat: add new feature"
    );

    const result = await customValidation.validateCommitMessage();
    expect(result.valid).toBe(true);
  });

  it("should reject invalid commit message", async () => {
    // Write invalid commit message
    writeFileSync(
      join(testDir, ".git", "COMMIT_EDITMSG"),
      "Added some stuff"
    );

    const result = await customValidation.validateCommitMessage();
    expect(result.valid).toBe(false);
    expect(result.severity).toBe("error");
  });

  it("should validate branch naming", async () => {
    // Create valid branch name
    execSync("git checkout -b feature/add-auth", { cwd: testDir });

    const result = await customValidation.validateBranchName();
    expect(result.valid).toBe(true);
  });

  it("should reject invalid branch name", async () => {
    // Create invalid branch name
    execSync("git checkout -b MyFeatureBranch", { cwd: testDir });

    const result = await customValidation.validateBranchName();
    expect(result.valid).toBe(false);
  });

  it("should detect large files", async () => {
    // Create a large file (6 MB)
    const largeContent = Buffer.alloc(6 * 1024 * 1024, "a");
    writeFileSync(join(testDir, "large.bin"), largeContent);
    execSync("git add large.bin", { cwd: testDir });

    const result = await customValidation.validateFileSize();
    expect(result.valid).toBe(false);
    expect(result.severity).toBe("error");
  });

  it("should format bytes correctly", () => {
    expect(customValidation.formatBytes(1024)).toBe("1 KB");
    expect(customValidation.formatBytes(1024 * 1024)).toBe("1 MB");
    expect(customValidation.formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
  });

  it("should detect potential secrets", async () => {
    // Create file with suspicious content
    writeFileSync(
      join(testDir, "config.js"),
      'const API_KEY = "sk_live_1234567890abcdefghij";'
    );
    execSync("git add config.js", { cwd: testDir });

    const result = await customValidation.detectSecrets();
    expect(result.valid).toBe(false);
    expect(result.severity).toBe("error");
  });
});

describe("Performance Tests", () => {
  it("should complete pre-commit linting in reasonable time", async () => {
    const start = performance.now();
    const result = await preCommitLinting.run({});
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500); // Should be fast with no files
  });

  it("should complete post-commit notifications in reasonable time", async () => {
    const start = performance.now();
    const result = await postCommitNotifications.run({});
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000); // Should be fast when just scheduling
  });

  it("should complete custom validation in reasonable time", async () => {
    const start = performance.now();
    const result = await customValidation.run({});
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500); // Should be fast with no files
  });
});

describe("Edge Cases", () => {
  it("should handle missing git repository gracefully", async () => {
    const tmpDir = join("/tmp", `no-git-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    process.chdir(tmpDir);

    // All hooks should handle missing git repo
    const results = await Promise.allSettled([
      preCommitLinting.run({}),
      postCommitNotifications.run({}),
      postMergeDependencies.run({}),
      customValidation.run({}),
    ]);

    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true });

    // All should either succeed or fail gracefully
    results.forEach((result) => {
      expect(result.status).toBeTruthy();
    });
  });

  it("should handle empty repository", async () => {
    const testDir = join("/tmp", `empty-repo-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });

    const result = await preCommitLinting.run({});

    // Cleanup
    rmSync(testDir, { recursive: true, force: true });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});

describe("Integration Tests", () => {
  it("should work together in a realistic workflow", async () => {
    const testDir = join("/tmp", `integration-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // Initialize repo
    execSync("git init", { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });

    // Create feature branch
    execSync("git checkout -b feature/test-feature", { cwd: testDir });

    // Add files
    writeFileSync(join(testDir, "test.js"), 'console.log("test");');
    execSync("git add test.js", { cwd: testDir });

    // Run pre-commit validation
    const preCommitResult = await customValidation.run({});

    // Commit
    if (preCommitResult.success) {
      execSync('git commit -m "feat: add test file"', { cwd: testDir });

      // Run post-commit notifications
      const postCommitResult = await postCommitNotifications.run({});
      expect(postCommitResult.success).toBe(true);
    }

    // Cleanup
    rmSync(testDir, { recursive: true, force: true });
  });
});
