// tests/useGit-comprehensive.test.mjs
// GitVan v2 — Comprehensive useGit() Tests with MemFS
// Tests all functionality with proper context integration using in-memory file system

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import { useGit } from "../src/composables/git.mjs";
import { withGitVan } from "../src/composables/ctx.mjs";

describe("useGit Comprehensive Tests with MemFS", () => {
  let testDir;
  let git;

  beforeEach(() => {
    // Create in-memory test directory
    testDir = "/test-git-comprehensive";
    vol.fromJSON({}, testDir);
  });

  afterEach(() => {
    // Clean up in-memory file system
    vol.reset();
  });

  describe("basic functionality", () => {
    it("should create useGit instance without context", () => {
      git = useGit();

      expect(git).toBeDefined();
      expect(git.cwd).toBe(process.cwd());
      expect(git.env.TZ).toBe("UTC");
      expect(git.env.LANG).toBe("C");
      expect(typeof git.nowISO).toBe("function");
    });

    it("should work with context", async () => {
      const mockContext = {
        cwd: testDir,
        env: {
          CUSTOM_VAR: "test-value",
          TZ: "America/New_York", // Should be overridden
        },
        now: () => "2024-01-01T12:00:00.000Z",
      };

      await withGitVan(mockContext, async () => {
        git = useGit();

        expect(git.cwd).toBe(testDir);
        expect(git.env.TZ).toBe("UTC"); // Should override context
        expect(git.env.LANG).toBe("C");
        expect(git.env.CUSTOM_VAR).toBe("test-value");
        expect(git.nowISO()).toBe("2024-01-01T12:00:00.000Z");
      });
    });
  });

  describe("repository operations", () => {
    beforeEach(async () => {
      // Initialize git repository in memory
      vol.writeFileSync(`${testDir}/README.md`, "# Test Repository\n");

      const mockContext = { cwd: testDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);
        await git.add("README.md");
        await git.commit("Initial commit");
      });
    });

    it("should get repository information", async () => {
      await withGitVan({ cwd: testDir }, async () => {
        git = useGit();

        const branch = await git.branch();
        const head = await git.head();
        const repoRoot = await git.repoRoot();
        const gitDir = await git.worktreeGitDir();

        expect(branch).toBe("master"); // Default branch
        expect(head).toMatch(/^[a-f0-9]{40}$/); // SHA hash
        expect(repoRoot).toBe(testDir);
        expect(gitDir).toContain(".git");
      });
    });

    it("should handle status operations", async () => {
      await withGitVan({ cwd: testDir }, async () => {
        git = useGit();

        // Check clean status
        const isClean = await git.isClean();
        expect(isClean).toBe(true);

        const hasChanges = await git.hasUncommittedChanges();
        expect(hasChanges).toBe(false);

        // Add a new file
        vol.writeFileSync(`${testDir}/new-file.txt`, "content");

        const status = await git.statusPorcelain();
        expect(status).toContain("new-file.txt");

        const isCleanAfter = await git.isClean();
        expect(isCleanAfter).toBe(false);
      });
    });

    it("should handle log operations", async () => {
      await withGitVan({ cwd: testDir }, async () => {
        git = useGit();

        // Add another commit
        vol.writeFileSync(`${testDir}/file2.txt`, "content");
        await git.add("file2.txt");
        await git.commit("Second commit");

        const log = await git.log();
        expect(log).toContain("Second commit");
        expect(log).toContain("Initial commit");

        const commitCount = await git.getCommitCount();
        expect(commitCount).toBe(2);
      });
    });

    it("should handle branch operations", async () => {
      await withGitVan({ cwd: testDir }, async () => {
        git = useGit();

        const currentBranch = await git.getCurrentBranch();
        expect(currentBranch).toBe("master");

        // Create and switch to new branch
        await git.runVoid(["checkout", "-b", "feature-branch"]);

        const newBranch = await git.getCurrentBranch();
        expect(newBranch).toBe("feature-branch");
      });
    });
  });

  describe("write operations", () => {
    beforeEach(async () => {
      const mockContext = { cwd: testDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);
      });
    });

    it("should handle add and commit operations", async () => {
      await withGitVan({ cwd: testDir }, async () => {
        git = useGit();

        // Create and add files
        vol.writeFileSync(`${testDir}/file1.txt`, "content1");
        vol.writeFileSync(`${testDir}/file2.txt`, "content2");

        await git.add(["file1.txt", "file2.txt"]);

        const status = await git.statusPorcelain();
        expect(status).toContain("file1.txt");
        expect(status).toContain("file2.txt");

        await git.commit("Add files");

        const isClean = await git.isClean();
        expect(isClean).toBe(true);
      });
    });

    it("should handle tag operations", async () => {
      await withGitVan({ cwd: testDir }, async () => {
        git = useGit();

        // Create initial commit
        vol.writeFileSync(`${testDir}/README.md`, "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");

        // Create tag
        await git.tag("v1.0.0", "Version 1.0.0");

        // Verify tag exists
        const tags = await git.run(["tag", "-l"]);
        expect(tags).toContain("v1.0.0");
      });
    });
  });

  describe("notes operations", () => {
    beforeEach(async () => {
      const mockContext = { cwd: testDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);

        // Create initial commit
        vol.writeFileSync(`${testDir}/README.md`, "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");
      });
    });

    it("should handle notes operations", async () => {
      await withGitVan({ cwd: testDir }, async () => {
        git = useGit();

        const notesRef = "refs/notes/gitvan/test";

        // Add note
        await git.noteAdd(notesRef, "Test note");

        // Show note
        const note = await git.noteShow(notesRef);
        expect(note).toBe("Test note");

        // Append to note
        await git.noteAppend(notesRef, "\nAdditional info");

        const updatedNote = await git.noteShow(notesRef);
        expect(updatedNote).toContain("Test note");
        expect(updatedNote).toContain("Additional info");
      });
    });
  });

  describe("atomic operations", () => {
    beforeEach(async () => {
      const mockContext = { cwd: testDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);

        // Create initial commit
        vol.writeFileSync(`${testDir}/README.md`, "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");
      });
    });

    it("should handle atomic ref creation", async () => {
      await withGitVan({ cwd: testDir }, async () => {
        git = useGit();

        const head = await git.head();
        const lockRef = "refs/gitvan/locks/test-lock";

        // First creation should succeed
        const result1 = await git.updateRefCreate(lockRef, head);
        expect(result1).toBe(true);

        // Second creation should fail (ref exists)
        const result2 = await git.updateRefCreate(lockRef, head);
        expect(result2).toBe(false);

        // Clean up
        await git.runVoid(["update-ref", "-d", lockRef]);
      });
    });
  });

  describe("plumbing operations", () => {
    beforeEach(async () => {
      const mockContext = { cwd: testDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);

        // Create initial commit
        vol.writeFileSync(`${testDir}/README.md`, "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");
      });
    });

    it("should handle plumbing operations", async () => {
      await withGitVan({ cwd: testDir }, async () => {
        git = useGit();

        // Test hash-object
        const hash = await git.hashObject("README.md");
        expect(hash).toMatch(/^[a-f0-9]{40}$/);

        // Test write-tree
        const treeHash = await git.writeTree();
        expect(treeHash).toMatch(/^[a-f0-9]{40}$/);

        // Test cat-file
        const head = await git.head();
        const content = await git.catFilePretty(head);
        expect(content).toContain("Initial commit");
      });
    });
  });

  describe("error handling", () => {
    it("should handle empty repository gracefully", async () => {
      const mockContext = { cwd: testDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize empty repo
        await git.runVoid(["init"]);

        // These should handle empty repo gracefully
        const revList = await git.revList();
        expect(revList).toBe("");

        const commitCount = await git.getCommitCount();
        expect(commitCount).toBe(0);
      });
    });

    it("should handle invalid operations gracefully", async () => {
      const mockContext = { cwd: testDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);

        // Create initial commit
        vol.writeFileSync(`${testDir}/README.md`, "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");

        // Test invalid object
        await expect(git.catFilePretty("invalid-sha")).rejects.toThrow();
      });
    });
  });

  describe("utility methods", () => {
    beforeEach(async () => {
      const mockContext = { cwd: testDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);

        // Create initial commit
        vol.writeFileSync(`${testDir}/README.md`, "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");
      });
    });

    it("should provide utility methods", async () => {
      await withGitVan({ cwd: testDir }, async () => {
        git = useGit();

        // Test isClean
        expect(await git.isClean()).toBe(true);

        // Test hasUncommittedChanges
        expect(await git.hasUncommittedChanges()).toBe(false);

        // Test getCurrentBranch
        expect(await git.getCurrentBranch()).toBe("master");

        // Test getCommitCount
        expect(await git.getCommitCount()).toBe(1);

        // Add uncommitted changes
        vol.writeFileSync(`${testDir}/new-file.txt`, "content");

        expect(await git.isClean()).toBe(false);
        expect(await git.hasUncommittedChanges()).toBe(true);
      });
    });
  });
});

  describe("basic functionality", () => {
    it("should create useGit instance without context", () => {
      git = useGit();

      expect(git).toBeDefined();
      expect(git.cwd).toBe(process.cwd());
      expect(git.env.TZ).toBe("UTC");
      expect(git.env.LANG).toBe("C");
      expect(typeof git.nowISO).toBe("function");
    });

    it("should work with context", async () => {
      const mockContext = {
        cwd: tempDir,
        env: {
          CUSTOM_VAR: "test-value",
          TZ: "America/New_York", // Should be overridden
        },
        now: () => "2024-01-01T12:00:00.000Z",
      };

      await withGitVan(mockContext, async () => {
        git = useGit();

        expect(git.cwd).toBe(tempDir);
        expect(git.env.TZ).toBe("UTC"); // Should override context
        expect(git.env.LANG).toBe("C");
        expect(git.env.CUSTOM_VAR).toBe("test-value");
        expect(git.nowISO()).toBe("2024-01-01T12:00:00.000Z");
      });
    });
  });

  describe("repository operations", () => {
    beforeEach(async () => {
      // Initialize git repository
      await fs.writeFile(join(tempDir, "README.md"), "# Test Repository\n");

      const mockContext = { cwd: tempDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);
        await git.add("README.md");
        await git.commit("Initial commit");
      });
    });

    it("should get repository information", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        git = useGit();

        const branch = await git.branch();
        const head = await git.head();
        const repoRoot = await git.repoRoot();
        const gitDir = await git.worktreeGitDir();

        expect(branch).toBe("master"); // Default branch
        expect(head).toMatch(/^[a-f0-9]{40}$/); // SHA hash
        expect(repoRoot).toBe(tempDir);
        expect(gitDir).toContain(".git");
      });
    });

    it("should handle status operations", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        git = useGit();

        // Check clean status
        const isClean = await git.isClean();
        expect(isClean).toBe(true);

        const hasChanges = await git.hasUncommittedChanges();
        expect(hasChanges).toBe(false);

        // Add a new file
        await fs.writeFile(join(tempDir, "new-file.txt"), "content");

        const status = await git.statusPorcelain();
        expect(status).toContain("new-file.txt");

        const isCleanAfter = await git.isClean();
        expect(isCleanAfter).toBe(false);
      });
    });

    it("should handle log operations", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        git = useGit();

        // Add another commit
        await fs.writeFile(join(tempDir, "file2.txt"), "content");
        await git.add("file2.txt");
        await git.commit("Second commit");

        const log = await git.log();
        expect(log).toContain("Second commit");
        expect(log).toContain("Initial commit");

        const commitCount = await git.getCommitCount();
        expect(commitCount).toBe(2);
      });
    });

    it("should handle branch operations", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        git = useGit();

        const currentBranch = await git.getCurrentBranch();
        expect(currentBranch).toBe("master");

        // Create and switch to new branch
        await git.runVoid(["checkout", "-b", "feature-branch"]);

        const newBranch = await git.getCurrentBranch();
        expect(newBranch).toBe("feature-branch");
      });
    });
  });

  describe("write operations", () => {
    beforeEach(async () => {
      const mockContext = { cwd: tempDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);
      });
    });

    it("should handle add and commit operations", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        git = useGit();

        // Create and add files
        await fs.writeFile(join(tempDir, "file1.txt"), "content1");
        await fs.writeFile(join(tempDir, "file2.txt"), "content2");

        await git.add(["file1.txt", "file2.txt"]);

        const status = await git.statusPorcelain();
        expect(status).toContain("file1.txt");
        expect(status).toContain("file2.txt");

        await git.commit("Add files");

        const isClean = await git.isClean();
        expect(isClean).toBe(true);
      });
    });

    it("should handle tag operations", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        git = useGit();

        // Create initial commit
        await fs.writeFile(join(tempDir, "README.md"), "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");

        // Create tag
        await git.tag("v1.0.0", "Version 1.0.0");

        // Verify tag exists
        const tags = await git.run(["tag", "-l"]);
        expect(tags).toContain("v1.0.0");
      });
    });
  });

  describe("notes operations", () => {
    beforeEach(async () => {
      const mockContext = { cwd: tempDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);

        // Create initial commit
        await fs.writeFile(join(tempDir, "README.md"), "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");
      });
    });

    it("should handle notes operations", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        git = useGit();

        const notesRef = "refs/notes/gitvan/test";

        // Add note
        await git.noteAdd(notesRef, "Test note");

        // Show note
        const note = await git.noteShow(notesRef);
        expect(note).toBe("Test note");

        // Append to note
        await git.noteAppend(notesRef, "\nAdditional info");

        const updatedNote = await git.noteShow(notesRef);
        expect(updatedNote).toContain("Test note");
        expect(updatedNote).toContain("Additional info");
      });
    });
  });

  describe("atomic operations", () => {
    beforeEach(async () => {
      const mockContext = { cwd: tempDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);

        // Create initial commit
        await fs.writeFile(join(tempDir, "README.md"), "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");
      });
    });

    it("should handle atomic ref creation", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        git = useGit();

        const head = await git.head();
        const lockRef = "refs/gitvan/locks/test-lock";

        // First creation should succeed
        const result1 = await git.updateRefCreate(lockRef, head);
        expect(result1).toBe(true);

        // Second creation should fail (ref exists)
        const result2 = await git.updateRefCreate(lockRef, head);
        expect(result2).toBe(false);

        // Clean up
        await git.runVoid(["update-ref", "-d", lockRef]);
      });
    });
  });

  describe("plumbing operations", () => {
    beforeEach(async () => {
      const mockContext = { cwd: tempDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);

        // Create initial commit
        await fs.writeFile(join(tempDir, "README.md"), "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");
      });
    });

    it("should handle plumbing operations", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        git = useGit();

        // Test hash-object
        const hash = await git.hashObject("README.md");
        expect(hash).toMatch(/^[a-f0-9]{40}$/);

        // Test write-tree
        const treeHash = await git.writeTree();
        expect(treeHash).toMatch(/^[a-f0-9]{40}$/);

        // Test cat-file
        const head = await git.head();
        const content = await git.catFilePretty(head);
        expect(content).toContain("Initial commit");
      });
    });
  });

  describe("error handling", () => {
    it("should handle empty repository gracefully", async () => {
      const mockContext = { cwd: tempDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize empty repo
        await git.runVoid(["init"]);

        // These should handle empty repo gracefully
        const revList = await git.revList();
        expect(revList).toBe("");

        const commitCount = await git.getCommitCount();
        expect(commitCount).toBe(0);
      });
    });

    it("should handle invalid operations gracefully", async () => {
      const mockContext = { cwd: tempDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);

        // Create initial commit
        await fs.writeFile(join(tempDir, "README.md"), "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");

        // Test invalid object
        await expect(git.catFilePretty("invalid-sha")).rejects.toThrow();
      });
    });
  });

  describe("utility methods", () => {
    beforeEach(async () => {
      const mockContext = { cwd: tempDir };
      await withGitVan(mockContext, async () => {
        git = useGit();

        // Initialize git repo
        await git.runVoid(["init"]);
        await git.runVoid(["config", "user.name", "Test User"]);
        await git.runVoid(["config", "user.email", "test@example.com"]);

        // Create initial commit
        await fs.writeFile(join(tempDir, "README.md"), "# Test");
        await git.add("README.md");
        await git.commit("Initial commit");
      });
    });

    it("should provide utility methods", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        git = useGit();

        // Test isClean
        expect(await git.isClean()).toBe(true);

        // Test hasUncommittedChanges
        expect(await git.hasUncommittedChanges()).toBe(false);

        // Test getCurrentBranch
        expect(await git.getCurrentBranch()).toBe("master");

        // Test getCommitCount
        expect(await git.getCommitCount()).toBe(1);

        // Add uncommitted changes
        await fs.writeFile(join(tempDir, "new-file.txt"), "content");

        expect(await git.isClean()).toBe(false);
        expect(await git.hasUncommittedChanges()).toBe(true);
      });
    });
  });
});
