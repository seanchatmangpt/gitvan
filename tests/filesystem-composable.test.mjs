/**
 * @fileoverview GitVan v2 — FileSystem Composable Test
 *
 * Simple test to verify the filesystem composable works correctly
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "../src/core/context.mjs";
import { useFileSystem } from "../src/composables/filesystem.mjs";
import { useGit } from "../src/composables/git.mjs";

describe("FileSystem Composable", () => {
  let testDir;
  let fs;
  let git;

  beforeEach(async () => {
    // Create test directory
    testDir = `/tmp/gitvan-filesystem-test-${Date.now()}`;

    await withGitVan({ cwd: testDir }, async () => {
      fs = useFileSystem();
      git = useGit();

      // Create test directory
      await fs.mkdir(testDir);

      // Initialize git repository
      await git.runVoid(["init"]);
      await git.runVoid(["config", "user.name", "Test User"]);
      await git.runVoid(["config", "user.email", "test@example.com"]);
    });
  });

  afterEach(async () => {
    if (testDir) {
      try {
        await fs.cleanup(testDir);
      } catch (error) {
        console.warn(`Failed to cleanup test directory: ${error.message}`);
      }
    }
  });

  it("should create and remove directories", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Create subdirectory
      const subDir = await fs.mkdir("test-subdir");
      expect(await fs.exists(subDir)).toBe(true);
      expect(await fs.isDirectory(subDir)).toBe(true);

      // Remove subdirectory (use rm with recursive for directories)
      await fs.rm(subDir, { recursive: true });
      expect(await fs.exists(subDir)).toBe(false);
    });
  });

  it("should create and remove files", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Create file
      const filePath = await fs.writeFile("test-file.txt", "Hello, World!");
      expect(await fs.exists(filePath)).toBe(true);
      expect(await fs.isFile(filePath)).toBe(true);

      // Read file
      const content = await fs.readFile(filePath);
      expect(content).toBe("Hello, World!");

      // Remove file
      await fs.unlink(filePath);
      expect(await fs.exists(filePath)).toBe(false);
    });
  });

  it("should handle path operations", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Test path resolution
      const resolved = fs.resolve("test-file.txt");
      expect(resolved).toBe(`${testDir}/test-file.txt`);

      // Test path joining
      const joined = fs.join("dir1", "dir2", "file.txt");
      expect(joined).toBe("dir1/dir2/file.txt");

      // Test basename
      expect(fs.basename("/path/to/file.txt")).toBe("file.txt");

      // Test dirname
      expect(fs.dirname("/path/to/file.txt")).toBe("/path/to");

      // Test extname
      expect(fs.extname("file.txt")).toBe(".txt");
    });
  });

  it("should create temporary directories", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Create temporary directory
      const tempDir = await fs.mkdtemp({ prefix: "gitvan-test-" });
      expect(await fs.exists(tempDir)).toBe(true);
      expect(await fs.isDirectory(tempDir)).toBe(true);

      // Cleanup
      await fs.rm(tempDir);
      expect(await fs.exists(tempDir)).toBe(false);
    });
  });

  it("should list directory contents", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Create some files
      await fs.writeFile("file1.txt", "content1");
      await fs.writeFile("file2.txt", "content2");
      await fs.mkdir("subdir");

      // List directory contents
      const contents = await fs.readdir(testDir);
      expect(contents).toContain("file1.txt");
      expect(contents).toContain("file2.txt");
      expect(contents).toContain("subdir");
    });
  });

  it("should provide context information", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Check context properties
      expect(fs.cwd).toBe(testDir);
      expect(fs.env.TZ).toBe("UTC");
      expect(fs.env.LANG).toBe("C");

      // Check info
      const info = await fs.info();
      expect(info.cwd).toBe(testDir);
      expect(info.env.TZ).toBe("UTC");
      expect(info.env.LANG).toBe("C");
    });
  });

  it("should integrate with git composable", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();
      const git = useGit();

      // Create file using filesystem composable
      await fs.writeFile("README.md", "# Test Repository");

      // Add and commit using git composable
      await git.add("README.md");
      await git.commit("Initial commit");

      // Verify commit using a simpler log format
      const log = await git.log("%s"); // Just the commit message
      expect(log).toContain("Initial commit");

      // Also verify the commit exists
      const head = await git.head();
      expect(head).toBeTruthy();
    });
  });
});
