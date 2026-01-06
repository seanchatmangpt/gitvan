/**
 * Comprehensive Git Operations Tests
 * Tests for useGit composable - targeting 85%+ coverage
 * 30+ test cases covering all git operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createTestContext,
  withTestEnvironment,
  initTestRepo,
  createCommit,
  createBranch,
  mergeBranch,
  createConflict,
  getCurrentBranch,
  getCommitCount,
  getStatus,
  isClean,
  createTag,
  createFileStructure,
} from "../helpers/index.mjs";
import { useGit } from "../../src/composables/git/index.mjs";
import { withGitVan } from "../../src/core/context.mjs";
import { join } from "pathe";
import { writeFileSync } from "node:fs";

describe("Git Operations - useGit Composable", () => {
  let testContext;

  beforeEach(async () => {
    testContext = await withTestEnvironment(async (ctx) => {
      await initTestRepo(ctx.testDir);
      return ctx;
    });
  });

  afterEach(() => {
    if (testContext?.cleanup) {
      testContext.cleanup();
    }
  });

  describe("Repository Info", () => {
    it("should get repository root", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const root = await git.topLevel();

        expect(root).toBeDefined();
        expect(root).toContain("gitvan-test");
      });
    });

    it("should get current branch", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const branch = await git.currentBranch();

        expect(branch).toBe("main");
      });
    });

    it("should get current HEAD", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const head = await git.currentHead();

        expect(head).toBeDefined();
        expect(head.length).toBe(40); // SHA-1 hash
      });
    });

    it("should check if repository is clean", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const clean = await git.isClean();

        expect(typeof clean).toBe("boolean");
        expect(clean).toBe(true);
      });
    });
  });

  describe("Branch Operations", () => {
    it("should list all branches", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        createBranch(testContext.testDir, "feature", false);
        createBranch(testContext.testDir, "develop", false);

        const branches = await git.branchList();

        expect(Array.isArray(branches)).toBe(true);
        expect(branches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("should create a new branch", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.branchCreate("new-feature");

        const branches = await git.branchList();
        expect(branches.some((b) => b.includes("new-feature"))).toBe(true);
      });
    });

    it("should create branch from specific start point", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const head = await git.currentHead();
        await git.branchCreate("from-commit", head);

        const branches = await git.branchList();
        expect(branches.some((b) => b.includes("from-commit"))).toBe(true);
      });
    });

    it("should force create branch", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.branchCreate("force-test");
        await git.branchCreate("force-test", "HEAD", { force: true });

        const branches = await git.branchList();
        expect(branches.some((b) => b.includes("force-test"))).toBe(true);
      });
    });

    it("should delete a branch", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.branchCreate("to-delete");
        await git.branchDelete("to-delete");

        const branches = await git.branchList();
        expect(branches.some((b) => b.includes("to-delete"))).toBe(false);
      });
    });

    it("should force delete a branch", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.branchCreate("force-delete");
        await git.branchDelete("force-delete", { force: true });

        const branches = await git.branchList();
        expect(branches.some((b) => b.includes("force-delete"))).toBe(false);
      });
    });

    it("should checkout to a branch", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.branchCreate("checkout-test");
        await git.checkout("checkout-test");

        const currentBranch = await git.currentBranch();
        expect(currentBranch).toBe("checkout-test");
      });
    });

    it("should checkout and create branch in one step", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.checkout("create-checkout", { create: true });

        const currentBranch = await git.currentBranch();
        expect(currentBranch).toBe("create-checkout");
      });
    });

    it("should switch to a branch", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.branchCreate("switch-test");
        await git.switch("switch-test");

        const currentBranch = await git.currentBranch();
        expect(currentBranch).toBe("switch-test");
      });
    });
  });

  describe("Merge Operations", () => {
    it("should perform basic merge", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        // Create feature branch
        await git.branchCreate("feature");
        await git.checkout("feature");

        // Add commit to feature
        createCommit(testContext.testDir, "Feature change", {
          "feature.txt": "content",
        });

        // Go back to main and merge
        await git.checkout("main");
        await git.merge("feature");

        const commitCount = getCommitCount(testContext.testDir);
        expect(commitCount).toBeGreaterThan(1);
      });
    });

    it("should perform no-fast-forward merge", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.branchCreate("noff-feature");
        await git.checkout("noff-feature");
        createCommit(testContext.testDir, "Feature", { "noff.txt": "content" });

        await git.checkout("main");
        await git.merge("noff-feature", { noff: true });

        const commitCount = getCommitCount(testContext.testDir);
        expect(commitCount).toBeGreaterThan(1);
      });
    });

    it("should perform squash merge", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.branchCreate("squash-feature");
        await git.checkout("squash-feature");
        createCommit(testContext.testDir, "Feature 1", { "sq1.txt": "1" });
        createCommit(testContext.testDir, "Feature 2", { "sq2.txt": "2" });

        await git.checkout("main");
        await git.merge("squash-feature", { squash: true });

        // Should have changes but no commit yet
        const clean = isClean(testContext.testDir);
        expect(clean).toBe(false);
      });
    });

    it("should perform merge with custom message", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.branchCreate("msg-feature");
        await git.checkout("msg-feature");
        createCommit(testContext.testDir, "Feature", { "msg.txt": "content" });

        await git.checkout("main");
        await git.merge("msg-feature", { message: "Custom merge message" });

        const commitCount = getCommitCount(testContext.testDir);
        expect(commitCount).toBeGreaterThan(1);
      });
    });
  });

  describe("Rebase Operations", () => {
    it("should rebase onto another branch", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        // Create base branch
        await git.branchCreate("base");
        await git.checkout("base");
        createCommit(testContext.testDir, "Base change", { "base.txt": "1" });

        // Create feature branch from main
        await git.checkout("main");
        await git.branchCreate("rebase-feature");
        await git.checkout("rebase-feature");
        createCommit(testContext.testDir, "Feature", { "feature.txt": "1" });

        // Rebase feature onto base
        await git.rebase("base");

        const currentBranch = await git.currentBranch();
        expect(currentBranch).toBe("rebase-feature");
      });
    });
  });

  describe("Cherry-pick & Revert", () => {
    it("should cherry-pick a commit", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        // Create feature branch with commit
        await git.branchCreate("cherry-source");
        await git.checkout("cherry-source");
        const commitSha = createCommit(testContext.testDir, "Cherry me", {
          "cherry.txt": "content",
        });

        // Go back to main and cherry-pick
        await git.checkout("main");
        await git.cherryPick(commitSha);

        const commitCount = getCommitCount(testContext.testDir);
        expect(commitCount).toBeGreaterThan(1);
      });
    });

    it("should revert a commit", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const commitSha = createCommit(testContext.testDir, "To revert", {
          "revert.txt": "content",
        });

        await git.revert(commitSha);

        const commitCount = getCommitCount(testContext.testDir);
        expect(commitCount).toBeGreaterThan(2);
      });
    });
  });

  describe("Worktree Operations", () => {
    it("should list worktrees", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const worktrees = await git.listWorktrees();

        expect(Array.isArray(worktrees)).toBe(true);
        expect(worktrees.length).toBeGreaterThanOrEqual(1);
        expect(worktrees[0]).toHaveProperty("path");
        expect(worktrees[0]).toHaveProperty("isMain");
      });
    });

    it("should add a worktree", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const wtPath = join(testContext.testDir, "../worktree-test");

        await git.branchCreate("wt-branch");
        await git.worktreeAdd(wtPath, "wt-branch");

        const worktrees = await git.listWorktrees();
        expect(worktrees.some((wt) => wt.path === wtPath)).toBe(true);

        // Cleanup
        await git.worktreeRemove(wtPath);
      });
    });

    it("should remove a worktree", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const wtPath = join(testContext.testDir, "../worktree-remove");

        await git.branchCreate("wt-remove");
        await git.worktreeAdd(wtPath, "wt-remove");
        await git.worktreeRemove(wtPath);

        const worktrees = await git.listWorktrees();
        expect(worktrees.some((wt) => wt.path === wtPath)).toBe(false);
      });
    });

    it("should prune worktrees", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.worktreePrune();

        // Should not throw
        expect(true).toBe(true);
      });
    });
  });

  describe("Tag Operations", () => {
    it("should list tags", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        createTag(testContext.testDir, "v1.0.0");
        createTag(testContext.testDir, "v2.0.0");

        const tags = await git.tagList();

        expect(Array.isArray(tags)).toBe(true);
        expect(tags.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("should create a tag", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.tagCreate("v3.0.0");

        const tags = await git.tagList();
        expect(tags).toContain("v3.0.0");
      });
    });

    it("should create annotated tag", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.tagCreate("v4.0.0", "HEAD", {
          annotate: true,
          message: "Version 4.0.0",
        });

        const tags = await git.tagList();
        expect(tags).toContain("v4.0.0");
      });
    });

    it("should delete a tag", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await git.tagCreate("to-delete");
        await git.tagDelete("to-delete");

        const tags = await git.tagList();
        expect(tags).not.toContain("to-delete");
      });
    });
  });

  describe("Commit Operations", () => {
    it("should get commit log", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        createCommit(testContext.testDir, "Test commit 1", { "t1.txt": "1" });
        createCommit(testContext.testDir, "Test commit 2", { "t2.txt": "2" });

        const log = await git.log({ maxCount: 5 });

        expect(Array.isArray(log)).toBe(true);
        expect(log.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("should show specific commit", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const commitSha = createCommit(testContext.testDir, "Show me", {
          "show.txt": "content",
        });

        const commit = await git.show(commitSha);

        expect(commit).toBeDefined();
        expect(commit).toContain("Show me");
      });
    });
  });

  describe("Notes Operations", () => {
    it("should add notes to a commit", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const commitSha = await git.currentHead();

        await git.notesAdd(commitSha, "Test note");

        const note = await git.notesShow(commitSha);
        expect(note).toContain("Test note");
      });
    });

    it("should remove notes from a commit", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const commitSha = await git.currentHead();

        await git.notesAdd(commitSha, "Remove me");
        await git.notesRemove(commitSha);

        const note = await git.notesShow(commitSha);
        expect(note).toBe("");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty repository", async () => {
      const emptyContext = await withTestEnvironment(async (ctx) => {
        // Initialize repo without initial commit
        const { execSync } = await import("node:child_process");
        execSync("git init", { cwd: ctx.testDir, stdio: "ignore" });
        execSync('git config user.name "Test"', {
          cwd: ctx.testDir,
          stdio: "ignore",
        });
        execSync('git config user.email "test@test.com"', {
          cwd: ctx.testDir,
          stdio: "ignore",
        });

        return ctx;
      });

      try {
        await withGitVan(emptyContext, async () => {
          const git = useGit();

          // Should handle gracefully
          await expect(git.currentHead()).rejects.toThrow();
        });
      } finally {
        emptyContext.cleanup();
      }
    });

    it("should handle detached HEAD state", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        const commitSha = await git.currentHead();
        await git.checkout(commitSha, { detach: true });

        const branch = await git.currentBranch();
        expect(branch).toBe("HEAD");
      });
    });

    it("should handle non-existent branch checkout", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        await expect(
          git.checkout("non-existent-branch")
        ).rejects.toThrow();
      });
    });

    it("should handle merge conflicts gracefully", async () => {
      // Create conflicting scenario
      const result = createConflict(testContext.testDir);

      expect(result.success).toBe(false);
      expect(result.conflicts).toBe(true);
    });
  });

  describe("Diff Operations", () => {
    it("should show diff between commits", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        createCommit(testContext.testDir, "Change 1", { "diff.txt": "v1" });
        const commit1 = await git.currentHead();

        createCommit(testContext.testDir, "Change 2", { "diff.txt": "v2" });
        const commit2 = await git.currentHead();

        const diff = await git.diff([commit1, commit2]);

        expect(diff).toBeDefined();
        expect(typeof diff).toBe("string");
      });
    });

    it("should show unstaged changes", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        // Make a change without committing
        writeFileSync(join(testContext.testDir, "unstaged.txt"), "content");

        const diff = await git.diff();

        expect(typeof diff).toBe("string");
      });
    });
  });

  describe("Stash Operations", () => {
    it("should stash changes", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        writeFileSync(join(testContext.testDir, "stash.txt"), "stashed");

        await git.stash();

        const clean = isClean(testContext.testDir);
        expect(clean).toBe(true);
      });
    });

    it("should list stashes", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        writeFileSync(join(testContext.testDir, "stash1.txt"), "1");
        await git.stash();

        const stashes = await git.stashList();

        expect(Array.isArray(stashes)).toBe(true);
      });
    });

    it("should pop stash", async () => {
      await withGitVan(testContext, async () => {
        const git = useGit();

        writeFileSync(join(testContext.testDir, "pop.txt"), "content");
        await git.stash();

        await git.stashPop();

        const clean = isClean(testContext.testDir);
        expect(clean).toBe(false);
      });
    });
  });
});
