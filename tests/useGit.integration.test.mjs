/**
 * useGit() Integration Tests - Proper GitVan Test Environment
 * Tests with actual git repositories and commands using proper GitVan composables
 */

import { describe, it, expect } from "vitest";
import { withTestEnvironment } from "../src/composables/test-environment.mjs";

describe("useGit() Integration Tests with Proper GitVan Environment", () => {
  describe("Repository Info Operations - Real Git", () => {
    it("should get current branch", async () => {
      await withTestEnvironment({
        testName: "git-branch-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        const branch = await env.withGit(async (git) => {
          return await git.run(["branch", "--show-current"]);
        });
        expect(branch).toBe("main");
      });
    });

    it("should get HEAD commit SHA", async () => {
      await withTestEnvironment({
        testName: "git-head-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        const head = await env.withGit(async (git) => {
          return await git.head();
        });
        expect(head).toBeTruthy();
        expect(head).toMatch(/^[a-f0-9]{40}$/);
      });
    });

    it("should get repository root", async () => {
      await withTestEnvironment({
        testName: "git-root-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        const root = await env.withGit(async (git) => {
          return await git.repoRoot();
        });
        expect(root).toBe(env.gitDir);
      });
    });

    it("should get git directory", async () => {
      await withTestEnvironment({
        testName: "git-dir-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        const gitDir = await env.withGit(async (git) => {
          return await git.worktreeGitDir();
        });
        expect(gitDir).toBe(".git");
      });
    });

    it("should handle detached HEAD state", async () => {
      await withTestEnvironment({
        testName: "git-detached-head-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        const head = await env.withGit(async (git) => {
          return await git.head();
        });

        // Checkout the commit directly to create detached HEAD
        await env.withGit(async (git) => {
          await git.runVoid(["checkout", head]);
        });

        const branch = await env.withGit(async (git) => {
          return await git.getCurrentBranch();
        });
        expect(branch).toBe("HEAD");
      });
    });
  });

  describe("Read Operations - Real Git", () => {
    it("should get commit log with default format", async () => {
      await withTestEnvironment({
        testName: "git-log-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        // Add more commits
        env.files.write("file1.txt", "Content 1\n");
        await env.files.syncToGit("file1.txt");
        await env.withGit(async (git) => {
          await git.add("file1.txt");
          await git.commit("Add file1");
        });

        env.files.write("file2.txt", "Content 2\n");
        await env.files.syncToGit("file2.txt");
        await env.withGit(async (git) => {
          await git.add("file2.txt");
          await git.commit("Add file2");
        });

        const log = await env.withGit(async (git) => {
          return await git.log();
        });
        const lines = log.split("\n");

        expect(lines.length).toBeGreaterThan(0);
        expect(log).toContain("Add file2");
        expect(log).toContain("Add file1");
        expect(log).toContain("Initial commit");
      });
    });

    it("should get commit log with custom format", async () => {
      await withTestEnvironment({
        testName: "git-log-custom-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        // Add more commits
        env.files.write("file1.txt", "Content 1\n");
        await env.files.syncToGit("file1.txt");
        await env.withGit(async (git) => {
          await git.add("file1.txt");
          await git.commit("Add file1");
        });

        env.files.write("file2.txt", "Content 2\n");
        await env.files.syncToGit("file2.txt");
        await env.withGit(async (git) => {
          await git.add("file2.txt");
          await git.commit("Add file2");
        });

        const log = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        const lines = log.split("\n").filter(Boolean);

        expect(lines).toHaveLength(3);
        expect(lines).toContain("Add file2");
        expect(lines).toContain("Add file1");
        expect(lines).toContain("Initial commit");
      });
    });

    it("should get commit count", async () => {
      await withTestEnvironment({
        testName: "git-commit-count-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        // Add more commits
        env.files.write("file1.txt", "Content 1\n");
        await env.files.syncToGit("file1.txt");
        await env.withGit(async (git) => {
          await git.add("file1.txt");
          await git.commit("Add file1");
        });

        env.files.write("file2.txt", "Content 2\n");
        await env.files.syncToGit("file2.txt");
        await env.withGit(async (git) => {
          await git.add("file2.txt");
          await git.commit("Add file2");
        });

        const count = await env.withGit(async (git) => {
          return await git.getCommitCount();
        });
        expect(count).toBe(3); // Initial + file1 + file2
      });
    });

    it("should get rev list", async () => {
      await withTestEnvironment({
        testName: "git-rev-list-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        // Add more commits
        env.files.write("file1.txt", "Content 1\n");
        await env.files.syncToGit("file1.txt");
        await env.withGit(async (git) => {
          await git.add("file1.txt");
          await git.commit("Add file1");
        });

        env.files.write("file2.txt", "Content 2\n");
        await env.files.syncToGit("file2.txt");
        await env.withGit(async (git) => {
          await git.add("file2.txt");
          await git.commit("Add file2");
        });

        const revList = await env.withGit(async (git) => {
          return await git.revList();
        });
        const commits = revList.split("\n").filter(Boolean);

        expect(commits).toHaveLength(3);
        commits.forEach((commit) => {
          expect(commit).toMatch(/^[a-f0-9]{40}$/);
        });
      });
    });
  });

  describe("Status Operations - Real Git", () => {
    it("should get clean status", async () => {
      await withTestEnvironment({
        testName: "git-clean-status-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        const isClean = await env.withGit(async (git) => {
          return await git.isClean();
        });
        expect(isClean).toBe(true);

        const hasChanges = await env.withGit(async (git) => {
          return await git.hasUncommittedChanges();
        });
        expect(hasChanges).toBe(false);

        const status = await env.withGit(async (git) => {
          return await git.statusPorcelain();
        });
        expect(status).toBe("");
      });
    });

    it("should detect uncommitted changes", async () => {
      await withTestEnvironment({
        testName: "git-uncommitted-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        // Create a new file but don't commit it
        env.files.write("new-file.txt", "New content\n");
        await env.files.syncToGit("new-file.txt");

        const isClean = await env.withGit(async (git) => {
          return await git.isClean();
        });
        expect(isClean).toBe(false);

        const hasChanges = await env.withGit(async (git) => {
          return await git.hasUncommittedChanges();
        });
        expect(hasChanges).toBe(true);

        const status = await env.withGit(async (git) => {
          return await git.statusPorcelain();
        });
        expect(status).toContain("new-file.txt");
      });
    });

    it("should get repository info", async () => {
      await withTestEnvironment({
        testName: "git-info-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        const info = await env.withGit(async (git) => {
          return await git.info();
        });
        expect(info).toMatchObject({
          head: expect.any(String),
          branch: "main",
          worktree: env.gitDir,
          isClean: true,
          hasUncommittedChanges: false,
        });
      });
    });
  });

  describe("Write Operations - Real Git", () => {
    it("should add files to staging", async () => {
      await withTestEnvironment({
        testName: "git-add-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        env.files.write("new-file.txt", "New content\n");
        await env.files.syncToGit("new-file.txt");

        await env.withGit(async (git) => {
          await git.add("new-file.txt");
        });

        const status = await env.withGit(async (git) => {
          return await git.statusPorcelain();
        });
        expect(status).toContain("A  new-file.txt");
      });
    });

    it("should commit changes", async () => {
      await withTestEnvironment({
        testName: "git-commit-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        env.files.write("new-file.txt", "New content\n");
        await env.files.syncToGit("new-file.txt");

        await env.withGit(async (git) => {
          await git.add("new-file.txt");
          await git.commit("Add new file");
        });

        const log = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        expect(log).toContain("Add new file");

        const isClean = await env.withGit(async (git) => {
          return await git.isClean();
        });
        expect(isClean).toBe(true);
      });
    });

    it("should create and switch branches", async () => {
      await withTestEnvironment({
        testName: "git-branch-operations-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        // Create a new branch
        await env.withGit(async (git) => {
          await git.branchCreate("feature-branch");
        });

        // Switch to the new branch
        await env.withGit(async (git) => {
          await git.checkout("feature-branch");
        });

        const currentBranch = await env.withGit(async (git) => {
          return await git.run(["branch", "--show-current"]);
        });
        expect(currentBranch).toBe("feature-branch");

        // Switch back to main
        await env.withGit(async (git) => {
          await git.checkout("main");
        });

        const mainBranch = await env.withGit(async (git) => {
          return await git.run(["branch", "--show-current"]);
        });
        expect(mainBranch).toBe("main");
      });
    });

    it("should merge branches", async () => {
      await withTestEnvironment({
        testName: "git-merge-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        // Create and switch to feature branch
        await env.withGit(async (git) => {
          await git.branchCreate("feature-branch");
          await git.checkout("feature-branch");
        });

        // Add a file in feature branch
        env.files.write("feature.txt", "Feature content\n");
        await env.files.syncToGit("feature.txt");
        await env.withGit(async (git) => {
          await git.add("feature.txt");
          await git.commit("Add feature file");
        });

        // Switch back to main
        await env.withGit(async (git) => {
          await git.checkout("main");
        });

        // Merge feature branch
        await env.withGit(async (git) => {
          await git.merge("feature-branch");
        });

        // Verify merge
        const log = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        expect(log).toContain("Add feature file");

        const files = env.files.listDir();
        expect(files).toContain("feature.txt");
      });
    });
  });

  describe("Advanced Operations - Real Git", () => {
    it("should handle tags", async () => {
      await withTestEnvironment({
        testName: "git-tags-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          await git.tag("v1.0.0", "Initial release");
        });

        const tags = await env.withGit(async (git) => {
          return await git.run(["tag", "-l"]);
        });
        expect(tags).toContain("v1.0.0");
      });
    });

    it("should handle notes", async () => {
      await withTestEnvironment({
        testName: "git-notes-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        const head = await env.withGit(async (git) => {
          return await git.head();
        });

        await env.withGit(async (git) => {
          await git.noteAdd(head, "This is a test note");
        });

        const note = await env.withGit(async (git) => {
          return await git.noteShow(head);
        });
        expect(note).toContain("This is a test note");
      });
    });

    it("should handle worktrees", async () => {
      await withTestEnvironment({
        testName: "git-worktrees-test",
        initialFiles: {
          "README.md": "# Test Repository\n",
        },
      }, async (env) => {
        const worktrees = await env.withGit(async (git) => {
          return await git.listWorktrees();
        });

        expect(worktrees).toHaveLength(1);
        expect(worktrees[0]).toMatchObject({
          path: env.gitDir,
          head: expect.any(String),
          branch: "main",
          isMain: true,
        });
      });
    });
  });
});