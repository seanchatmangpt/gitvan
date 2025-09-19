/**
 * @fileoverview GitVan v2 — FileSystem Composable Test with MemFS
 *
 * Safe test to verify the filesystem composable works correctly using in-memory file system
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import { withGitVan } from "../src/core/context.mjs";
import { useFileSystem } from "../src/composables/filesystem.mjs";
import { useGit } from "../src/composables/git.mjs";

describe("FileSystem Composable with MemFS", () => {
  let testDir;
  let fs;
  let git;

  beforeEach(async () => {
    // Create in-memory test directory
    testDir = "/test-filesystem-safe";
    vol.mkdirSync(testDir, { recursive: true });

    await withGitVan({ cwd: testDir }, async () => {
      fs = useFileSystem();
      git = useGit();

      // Initialize git repository
      await git.runVoid(["init"]);
      await git.runVoid(["config", "user.name", "Test User"]);
      await git.runVoid(["config", "user.email", "test@example.com"]);
    });
  });

  afterEach(() => {
    // Clean up in-memory file system
    vol.reset();
  });

  it("should create and remove directories", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Create subdirectory using MemFS
      const subDir = `${testDir}/test-subdir`;
      vol.mkdirSync(subDir, { recursive: true });
      expect(vol.existsSync(subDir)).toBe(true);

      // Verify using filesystem composable
      expect(await fs.exists("test-subdir")).toBe(true);
      expect(await fs.isDirectory("test-subdir")).toBe(true);

      // Remove subdirectory using MemFS
      vol.rmSync(subDir, { recursive: true });
      expect(vol.existsSync(subDir)).toBe(false);
      expect(await fs.exists("test-subdir")).toBe(false);
    });
  });

  it("should create and remove files", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Create file using MemFS
      const filePath = `${testDir}/test-file.txt`;
      vol.writeFileSync(filePath, "Hello, World!");
      expect(vol.existsSync(filePath)).toBe(true);

      // Verify using filesystem composable
      expect(await fs.exists("test-file.txt")).toBe(true);
      expect(await fs.isFile("test-file.txt")).toBe(true);

      // Read file
      const content = await fs.readFile("test-file.txt");
      expect(content).toBe("Hello, World!");

      // Remove file using MemFS
      vol.rmSync(filePath);
      expect(vol.existsSync(filePath)).toBe(false);
      expect(await fs.exists("test-file.txt")).toBe(false);
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

      // Create temporary directory using MemFS
      const tempDir = `${testDir}/gitvan-test-${Date.now()}`;
      vol.mkdirSync(tempDir, { recursive: true });
      expect(vol.existsSync(tempDir)).toBe(true);

      // Verify using filesystem composable
      const relativePath = fs.basename(tempDir);
      expect(await fs.exists(relativePath)).toBe(true);
      expect(await fs.isDirectory(relativePath)).toBe(true);

      // Cleanup using MemFS
      vol.rmSync(tempDir, { recursive: true });
      expect(vol.existsSync(tempDir)).toBe(false);
      expect(await fs.exists(relativePath)).toBe(false);
    });
  });

  it("should list directory contents", async () => {
    await withGitVan({ cwd: testDir }, async () => {
      const fs = useFileSystem();

      // Create some files using MemFS
      vol.writeFileSync(`${testDir}/file1.txt`, "content1");
      vol.writeFileSync(`${testDir}/file2.txt`, "content2");
      vol.mkdirSync(`${testDir}/subdir`, { recursive: true });

      // List directory contents using filesystem composable
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

      // Create file using MemFS
      vol.writeFileSync(`${testDir}/README.md`, "# Test Repository");

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
