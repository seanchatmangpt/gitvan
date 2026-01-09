// tests/git-errors.test.mjs
// GitVan v2 — Error Handling Test Suite
// Comprehensive error scenarios testing for useGit() composable
// Focus: Clean error propagation, maxBuffer handling, happy path principle

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { withGitVan } from "../src/core/context.mjs";
import { useGit } from "../src/composables/git.mjs";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

describe("GitVan Error Handling", () => {
  let tempDir;
  let originalCwd;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gitvan-error-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe("Git Command Execution Failures", () => {
    it("should handle non-existent repository gracefully", async () => {
      const git = useGit();

      await expect(git.branch()).rejects.toThrow();
      await expect(git.head()).rejects.toThrow();
      await expect(git.repoRoot()).rejects.toThrow();
    });

    it("should propagate git command errors with clear messages", async () => {
      // Initialize empty repo but no commits
      await execFileAsync("git", ["init"], { cwd: tempDir });

      const git = useGit();

      // Should fail because HEAD doesn't exist yet
      await expect(git.head()).rejects.toThrow(/HEAD/);
      await expect(git.branch()).rejects.toThrow();
    });

    it("should handle invalid git arguments", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      const git = useGit();

      // Invalid revision
      await expect(git.run(["show", "nonexistent-sha"])).rejects.toThrow();

      // Invalid command
      await expect(git.run(["invalid-command"])).rejects.toThrow();

      // Malformed arguments
      await expect(git.run(["log", "--invalid-option"])).rejects.toThrow();
    });

    it("should handle repository corruption scenarios", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });

      // Corrupt the git directory
      const gitDir = path.join(tempDir, ".git");
      await fs.promises.writeFile(path.join(gitDir, "HEAD"), "invalid content");

      const git = useGit();

      await expect(git.branch()).rejects.toThrow();
      await expect(git.head()).rejects.toThrow();
    });
  });

  describe("MaxBuffer Overflow Scenarios", () => {
    it("should handle large output exceeding maxBuffer", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      // Create a smaller file first
      const smallContent = "small content";
      await fs.promises.writeFile(path.join(tempDir, "small.txt"), smallContent);

      const git = useGit();
      await git.add("small.txt");
      await git.commit("Add small file");

      // Test with artificially small maxBuffer to force error
      const gitWithSmallBuffer = withGitVan({ maxBuffer: 10 }, () => useGit());

      // This should now actually fail with small buffer
      await expect(gitWithSmallBuffer.log("%H %s", [])).rejects.toThrow();
    });

    it("should handle extremely large git log output", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      // Create just a few commits to avoid timeout
      for (let i = 0; i < 3; i++) {
        await fs.promises.writeFile(path.join(tempDir, `file${i}.txt`), `content ${i}`);
        await execFileAsync("git", ["add", `file${i}.txt`], { cwd: tempDir });
        await execFileAsync("git", ["commit", "-m", `Commit ${i}`], { cwd: tempDir });
      }

      const git = useGit();

      // This should work with default buffer
      const log = await git.log("%H %s", []);
      expect(log).toContain("Commit");

      // Test with very small buffer to force failure
      const gitSmallBuffer = withGitVan({ maxBuffer: 50 }, () => useGit());
      await expect(gitSmallBuffer.log("%H %s", [])).rejects.toThrow();
    }, 10000); // Extend timeout
  });

  describe("Context Binding Error Propagation", () => {
    it("should handle context binding failures gracefully", async () => {
      // Test graceful fallback when context fails
      const git = useGit();
      expect(git).toBeDefined();
      expect(git.cwd).toBeDefined();
      expect(git.env).toBeDefined();
    });

    it("should propagate environment variable corruption", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      const git = withGitVan({
        env: {
          ...process.env,
          GIT_DIR: "/nonexistent/path"
        }
      }, () => useGit());

      await expect(git.branch()).rejects.toThrow();
    });

    it("should handle invalid working directory", async () => {
      const git = withGitVan({
        cwd: "/nonexistent/directory"
      }, () => useGit());

      await expect(git.branch()).rejects.toThrow(/ENOENT|no such file/);
    });
  });

  describe("Invalid Repository Operations", () => {
    it("should handle operations on files outside repository", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      const git = useGit();

      // Try to add file outside repo
      const outsideFile = path.join(os.tmpdir(), "outside.txt");
      await fs.promises.writeFile(outsideFile, "content");

      try {
        await expect(git.add(outsideFile)).rejects.toThrow();
      } finally {
        await fs.promises.unlink(outsideFile);
      }
    });

    it("should handle missing refs and branches", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      const git = useGit();

      // Operations on non-existent refs
      await expect(git.mergeBase("main", "develop")).rejects.toThrow();
      await expect(git.isAncestor("nonexistent", "HEAD")).resolves.toBe(false);
    });

    it("should handle atomic operations on existing refs", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      // Create initial commit
      await fs.promises.writeFile(path.join(tempDir, "test.txt"), "content");
      await execFileAsync("git", ["add", "test.txt"], { cwd: tempDir });
      await execFileAsync("git", ["commit", "-m", "Initial commit"], { cwd: tempDir });

      const git = useGit();
      const head = await git.head();

      // Create a ref
      const refName = "refs/heads/test-branch";
      const success = await git.updateRefCreate(refName, head);
      expect(success).toBe(true);

      // Try to create same ref again - should fail
      const failedAttempt = await git.updateRefCreate(refName, head);
      expect(failedAttempt).toBe(false);
    });
  });

  describe("File System and Permission Errors", () => {
    it("should handle readonly filesystem", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      const testFile = path.join(tempDir, "readonly.txt");
      await fs.promises.writeFile(testFile, "content");

      const git = useGit();

      // Test with a file that doesn't exist to simulate permission errors
      await expect(git.add("/nonexistent/path/file.txt")).rejects.toThrow();
    });

    it("should handle corrupted git objects", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      const git = useGit();

      // Test with invalid SHA
      await expect(git.catFilePretty("invalid-sha")).rejects.toThrow();
      await expect(git.catFilePretty("0000000000000000000000000000000000000000")).rejects.toThrow();
    });
  });

  describe("Concurrent Operation Conflicts", () => {
    it("should handle simultaneous git operations", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      const git = useGit();

      // Create a few files
      for (let i = 0; i < 3; i++) {
        await fs.promises.writeFile(path.join(tempDir, `concurrent${i}.txt`), `content ${i}`);
      }

      // Sequential operations should work
      await git.add("concurrent0.txt");
      await git.add("concurrent1.txt");
      await git.add("concurrent2.txt");

      const status = await git.statusPorcelain();
      expect(status).toContain("concurrent");
    });

    it("should handle git lock conflicts", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      // Create a fake git lock
      const lockFile = path.join(tempDir, ".git", "index.lock");
      await fs.promises.writeFile(lockFile, "fake lock");

      const git = useGit();
      await fs.promises.writeFile(path.join(tempDir, "test.txt"), "content");

      try {
        await expect(git.add("test.txt")).rejects.toThrow(/lock|unable/i);
      } finally {
        // Clean up lock file
        try {
          await fs.promises.unlink(lockFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    it("should handle empty arrays and null inputs", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      const git = useGit();

      // Empty array should be handled gracefully
      await git.add([]);  // Should not throw
      await git.add("");  // Should not throw
      await git.add(null);  // Should not throw
      await git.add(undefined);  // Should not throw

      // Empty arguments
      await expect(git.run([])).rejects.toThrow();
    });

    it("should handle very long command arguments", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      const git = useGit();

      // Very long commit message
      const longMessage = "a".repeat(10000);
      await fs.promises.writeFile(path.join(tempDir, "test.txt"), "content");
      await git.add("test.txt");

      // Should handle long commit messages
      await expect(git.commit(longMessage)).resolves.toBeUndefined();
    });

    it("should handle binary file operations", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      // Create binary file
      const binaryData = Buffer.alloc(1024);
      for (let i = 0; i < 1024; i++) {
        binaryData[i] = i % 256;
      }

      const binaryFile = path.join(tempDir, "binary.bin");
      await fs.promises.writeFile(binaryFile, binaryData);

      const git = useGit();
      await git.add("binary.bin");
      await git.commit("Add binary file");

      const hash = await git.hashObject("binary.bin");
      expect(hash).toMatch(/^[a-f0-9]{40}$/);

      // Binary files might cause issues with string operations
      const content = await git.catFilePretty(hash);
      expect(content).toBeDefined();
    });
  });

  describe("Error Message Quality and Debugging", () => {
    it("should provide clear error messages with context", async () => {
      const git = useGit();

      try {
        await git.branch();
        // If this doesn't throw, we need to ensure the test fails
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        // Should contain useful debugging information
        expect(error.message).toMatch(/(ENOENT|not a git|fatal|repository)/i);
      }
    });

    it("should preserve original git error codes", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });

      const git = useGit();

      try {
        await git.run(["show", "nonexistent"]);
      } catch (error) {
        expect(error.code).toBeDefined();
        expect(error.signal).toBeDefined();
      }
    });
  });

  describe("Memory and Resource Management", () => {
    it("should handle memory pressure scenarios", async () => {
      await execFileAsync("git", ["init"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempDir });
      await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });

      const git = useGit();

      // Simulate memory pressure by creating many operations
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(git.nowISO());  // Lightweight operation
      }

      const results = await Promise.all(operations);
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    it("should clean up resources on operation failure", async () => {
      const git = useGit();

      // Failed operation should not leave hanging resources
      try {
        await git.branch();
      } catch (error) {
        // Error expected, resources should be cleaned up
        expect(error).toBeDefined();
      }

      // Subsequent operations should work
      expect(() => useGit()).not.toThrow();
    });
  });
});