/**
 * Git Integration Tests - Real Repository E2E Testing with Proper GitVan Environment
 *
 * Tests the useGit() composable against real git repositories with:
 * - Proper GitVan test environment
 * - Deterministic environment (TZ=UTC, LANG=C)
 * - Real git command execution
 * - Complete workflow validation
 * - Error handling and edge cases
 * - Performance testing
 * - Safe in-memory file system operations
 */

import { describe, it, expect } from "vitest";
import { withTestEnvironment } from "../src/composables/test-environment.mjs";

describe("Git E2E Integration Tests - Real Repository with Proper GitVan Environment", () => {
  describe("Repository Lifecycle Management", () => {
    it("should handle complete repository lifecycle", async () => {
      await withTestEnvironment({
        testName: "git-lifecycle-test",
        initialFiles: {
          "README.md": "# GitVan Test Repository\n",
          ".gitignore": "node_modules/\n.env\n*.log\n",
        },
      }, async (env) => {
        // Verify initial state
        const initialBranch = await env.withGit(async (git) => {
          return await git.run(["branch", "--show-current"]);
        });
        expect(initialBranch).toBe("main");

        const initialLog = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        expect(initialLog).toContain("Initial commit");

        // Create feature branch
        await env.withGit(async (git) => {
          await git.branchCreate("feature/lifecycle");
          await git.checkout("feature/lifecycle");
        });

        // Add files and commits
        env.files.write("src/index.js", "console.log('Hello, GitVan!');\n");
        env.files.write("src/utils.js", "export const utils = {};\n");
        await env.files.syncAllToGit();

        await env.withGit(async (git) => {
          await git.add(".");
          await git.commit("Add core functionality");
        });

        // Create more commits
        env.files.write("src/index.js", "console.log('Hello, GitVan!');\nconsole.log('Updated!');\n");
        await env.files.syncToGit("src/index.js");

        await env.withGit(async (git) => {
          await git.add("src/index.js");
          await git.commit("Update functionality");
        });

        // Create tag
        await env.withGit(async (git) => {
          await git.tag("v1.0.0", "First release");
        });

        // Switch back to main and merge
        await env.withGit(async (git) => {
          await git.checkout("main");
          await git.merge("feature/lifecycle");
        });

        // Verify final state
        const finalLog = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        expect(finalLog).toContain("Add core functionality");
        expect(finalLog).toContain("Update functionality");
        expect(finalLog).toContain("Initial commit");

        const tags = await env.withGit(async (git) => {
          return await git.run(["tag", "-l"]);
        });
        expect(tags).toContain("v1.0.0");

        // Verify files are present
        const files = env.files.listDir("src");
        expect(files).toContain("index.js");
        expect(files).toContain("utils.js");

        // Verify repository is clean
        const isClean = await env.withGit(async (git) => {
          return await git.isClean();
        });
        expect(isClean).toBe(true);
      });
    });

    it("should handle branch operations correctly", async () => {
      await withTestEnvironment({
        testName: "git-branch-operations",
        initialFiles: {
          "README.md": "# Branch Operations Test\n",
        },
      }, async (env) => {
        // Create multiple branches
        await env.withGit(async (git) => {
          await git.branchCreate("develop");
          await git.branchCreate("feature/auth");
          await git.branchCreate("feature/database");
          await git.branchCreate("hotfix/urgent");
        });

        // List all branches
        const branches = await env.withGit(async (git) => {
          return await git.branchList();
        });
        expect(branches).toContain("main");
        expect(branches).toContain("develop");
        expect(branches).toContain("feature/auth");
        expect(branches).toContain("feature/database");
        expect(branches).toContain("hotfix/urgent");

        // Switch between branches
        await env.withGit(async (git) => {
          await git.checkout("develop");
        });

        let currentBranch = await env.withGit(async (git) => {
          return await git.run(["branch", "--show-current"]);
        });
        expect(currentBranch).toBe("develop");

        // Add commits to different branches
        await env.withGit(async (git) => {
          await git.checkout("feature/auth");
        });

        env.files.write("src/auth.js", "export const auth = {};\n");
        await env.files.syncToGit("src/auth.js");
        await env.withGit(async (git) => {
          await git.add("src/auth.js");
          await git.commit("Add authentication");
        });

        await env.withGit(async (git) => {
          await git.checkout("feature/database");
        });

        env.files.write("src/database.js", "export const db = {};\n");
        await env.files.syncToGit("src/database.js");
        await env.withGit(async (git) => {
          await git.add("src/database.js");
          await git.commit("Add database");
        });

        // Verify branch-specific commits
        await env.withGit(async (git) => {
          await git.checkout("feature/auth");
        });

        const authLog = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        expect(authLog).toContain("Add authentication");

        await env.withGit(async (git) => {
          await git.checkout("feature/database");
        });

        const dbLog = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        expect(dbLog).toContain("Add database");

        // Delete feature branches
        await env.withGit(async (git) => {
          await git.checkout("main");
          await git.branchDelete("feature/auth", { force: true });
          await git.branchDelete("feature/database", { force: true });
        });

        const remainingBranches = await env.withGit(async (git) => {
          return await git.branchList();
        });
        expect(remainingBranches).not.toContain("feature/auth");
        expect(remainingBranches).not.toContain("feature/database");
        expect(remainingBranches).toContain("main");
        expect(remainingBranches).toContain("develop");
        expect(remainingBranches).toContain("hotfix/urgent");
      });
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should handle large number of files efficiently", async () => {
      await withTestEnvironment({
        testName: "git-performance-test",
        initialFiles: {
          "README.md": "# Performance Test\n",
        },
      }, async (env) => {
        const start = performance.now();

        // Create many files
        for (let i = 0; i < 100; i++) {
          env.files.write(`src/file${i}.js`, `export const file${i} = {};\n`);
        }

        // Sync all files to Git directory
        await env.files.syncAllToGit();

        // Add all files to Git
        await env.withGit(async (git) => {
          await git.add(".");
          await git.commit("Add many files");
        });

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

        // Verify all files are tracked
        const status = await env.withGit(async (git) => {
          return await git.statusPorcelain();
        });
        expect(status).toBe(""); // Clean working directory

        // Verify commit count
        const commitCount = await env.withGit(async (git) => {
          return await git.getCommitCount();
        });
        expect(commitCount).toBe(2); // Initial + many files

        // Verify files exist
        const files = env.files.listDir("src");
        expect(files.length).toBe(100);
        for (let i = 0; i < 100; i++) {
          expect(files).toContain(`file${i}.js`);
        }
      });
    });

    it("should handle empty repository operations", async () => {
      await withTestEnvironment({
        testName: "git-empty-repo-test",
        initialFiles: {},
      }, async (env) => {
        // Verify empty repository state
        const log = await env.withGit(async (git) => {
          try {
            return await git.log("%s");
          } catch {
            return ""; // Empty repository has no commits
          }
        });
        expect(log).toBe(""); // No commits

        const commitCount = await env.withGit(async (git) => {
          return await git.getCommitCount();
        });
        expect(commitCount).toBe(0);

        // Verify branch exists but no commits
        const branch = await env.withGit(async (git) => {
          return await git.run(["branch", "--show-current"]);
        });
        expect(branch).toBe("main");

        // Add first commit
        env.files.write("README.md", "# Empty to First\n");
        await env.files.syncToGit("README.md");
        await env.withGit(async (git) => {
          await git.add("README.md");
          await git.commit("First commit");
        });

        // Verify first commit
        const firstLog = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        expect(firstLog).toContain("First commit");

        const firstCommitCount = await env.withGit(async (git) => {
          return await git.getCommitCount();
        });
        expect(firstCommitCount).toBe(1);
      });
    });
  });
});
