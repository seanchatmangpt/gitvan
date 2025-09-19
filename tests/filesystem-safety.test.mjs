/**
 * @fileoverview GitVan v2 — FileSystem Safety Tests
 *
 * Test to verify that the filesystem composable prevents deletion of critical files
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "../src/core/context.mjs";
import { useFileSystem } from "../src/composables/filesystem.mjs";

describe("FileSystem Safety Checks", () => {
  let testDir;
  let fs;

  beforeEach(async () => {
    // Create test directory
    testDir = `/tmp/gitvan-safety-test-${Date.now()}`;

    await withGitVan({ cwd: testDir }, async () => {
      fs = useFileSystem();

      // Create test directory
      await fs.mkdir(testDir);

      // Create some critical files to test against
      await fs.writeFile("package.json", '{"name": "test"}');
      await fs.writeFile("README.md", "# Test");
      await fs.mkdir(".git");
    });
  });

  afterEach(async () => {
    if (testDir) {
      try {
        // Use skipSafetyCheck for cleanup since this is a test directory
        await fs.cleanup(testDir, { skipSafetyCheck: true });
      } catch (error) {
        console.warn(`Failed to cleanup test directory: ${error.message}`);
      }
    }
  });

  it("should prevent deletion of package.json", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Should throw error when trying to delete package.json
      await expect(fs.unlink("package.json")).rejects.toThrow(
        "CRITICAL: Attempted to delete critical file/directory: package.json"
      );

      // Should throw error when trying to rm package.json
      await expect(fs.rm("package.json")).rejects.toThrow(
        "CRITICAL: Attempted to delete critical file/directory: package.json"
      );

      // File should still exist
      expect(await fs.exists("package.json")).toBe(true);
    });
  });

  it("should prevent deletion of .git directory", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Should throw error when trying to delete .git directory
      await expect(fs.rmdir(".git")).rejects.toThrow(
        "CRITICAL: Attempted to delete critical file/directory: .git"
      );

      // Should throw error when trying to rm .git directory
      await expect(fs.rm(".git")).rejects.toThrow(
        "CRITICAL: Attempted to delete critical file/directory: .git"
      );

      // Directory should still exist
      expect(await fs.exists(".git")).toBe(true);
    });
  });

  it("should prevent deletion of README.md", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Should throw error when trying to delete README.md
      await expect(fs.unlink("README.md")).rejects.toThrow(
        "CRITICAL: Attempted to delete critical file/directory: README.md"
      );

      // File should still exist
      expect(await fs.exists("README.md")).toBe(true);
    });
  });

  it("should allow deletion of non-critical files", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Create a non-critical file
      await fs.writeFile("test-file.txt", "test content");
      expect(await fs.exists("test-file.txt")).toBe(true);

      // Should be able to delete non-critical files
      await fs.unlink("test-file.txt");
      expect(await fs.exists("test-file.txt")).toBe(false);
    });
  });

  it("should allow deletion with skipSafetyCheck option", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Should be able to delete critical files when safety check is skipped
      await fs.unlink("package.json", { skipSafetyCheck: true });
      expect(await fs.exists("package.json")).toBe(false);

      // Should be able to delete .git directory when safety check is skipped
      await fs.rm(".git", { skipSafetyCheck: true });
      expect(await fs.exists(".git")).toBe(false);
    });
  });

  it("should prevent deletion of critical files in subdirectories", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Create subdirectory with critical file
      await fs.mkdir("subdir");
      await fs.writeFile("subdir/package.json", '{"name": "subdir-test"}');

      // Should throw error when trying to delete subdirectory containing critical file
      await expect(fs.rm("subdir")).rejects.toThrow(
        "CRITICAL: Attempted to delete critical file/directory: subdir"
      );

      // Directory should still exist
      expect(await fs.exists("subdir")).toBe(true);
    });
  });

  it("should allow deletion of test directories", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Create a test subdirectory
      await fs.mkdir("test-subdir");
      await fs.writeFile("test-subdir/normal-file.txt", "content");

      // Should be able to delete test directories (they don't contain critical files)
      await fs.rm("test-subdir");
      expect(await fs.exists("test-subdir")).toBe(false);
    });
  });
});
