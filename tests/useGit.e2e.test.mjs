/**
 * useGit() End-to-End Tests - Complete Workflows
 * Tests complete workflows with proper GitVan test environment
 */

import { describe, it, expect } from "vitest";
import { withTestEnvironment } from "../src/composables/test-environment.mjs";

describe("useGit() E2E Tests - Complete Workflows", () => {
  describe("Complete Development Workflow", () => {
    it("should complete a full development cycle", async () => {
      await withTestEnvironment({
        testName: "e2e-development-cycle",
        initialFiles: {
          "README.md": "# Project\n\nInitial setup",
          ".gitignore": "node_modules/\n.env\n",
        },
      }, async (env) => {
        // Verify initial commit was created by test environment
        const initialLog = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        expect(initialLog).toContain("Initial commit");

        // Create feature branch
        await env.withGit(async (git) => {
          await git.branchCreate("feature/new-feature");
          await git.checkout("feature/new-feature");
        });

        // Verify branch switch
        const currentBranch = await env.withGit(async (git) => {
          return await git.run(["branch", "--show-current"]);
        });
        expect(currentBranch).toBe("feature/new-feature");

        // Add new files and make changes
        env.files.write("src/index.js", "console.log('Hello, World!');\n");
        env.files.write("src/utils.js", "export const utils = {};\n");
        env.files.write("tests/index.test.js", "describe('Index', () => {});\n");

        // Sync files to Git directory
        await env.files.syncAllToGit();

        // Stage and commit changes
        await env.withGit(async (git) => {
          await git.add(["src/", "tests/"]);
          await git.commit("Add core functionality and tests");
        });

        // Create additional commits
        env.files.write("src/index.js", "console.log('Hello, World!');\nconsole.log('Updated!');\n");
        await env.files.syncToGit("src/index.js");

        await env.withGit(async (git) => {
          await git.add("src/index.js");
          await git.commit("Update main functionality");
        });

        // Create a tag for release
        await env.withGit(async (git) => {
          await git.tag("v1.0.0", "First release");
        });

        // Verify tag
        const tags = await env.withGit(async (git) => {
          return await git.run(["tag", "-l"]);
        });
        expect(tags).toContain("v1.0.0");

        // Switch back to main and merge
        await env.withGit(async (git) => {
          await git.checkout("main");
          await git.merge("feature/new-feature");
        });

        // Verify merge
        const finalLog = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        expect(finalLog).toContain("Add core functionality and tests");
        expect(finalLog).toContain("Update main functionality");
        expect(finalLog).toContain("Initial commit");

        // Verify all files are present
        const files = env.files.listDir();
        expect(files).toContain("README.md");
        expect(files).toContain(".gitignore");
        expect(files).toContain("src");

        const srcFiles = env.files.listDir("src");
        expect(srcFiles).toContain("index.js");
        expect(srcFiles).toContain("utils.js");

        // Verify repository is clean
        const isClean = await env.withGit(async (git) => {
          return await git.isClean();
        });
        expect(isClean).toBe(true);

        // Verify commit count
        const commitCount = await env.withGit(async (git) => {
          return await git.getCommitCount();
        });
        expect(commitCount).toBe(3); // Initial + 2 feature commits
      });
    });

    it("should handle complex branching strategy", async () => {
      await withTestEnvironment({
        testName: "e2e-branching-strategy",
        initialFiles: {
          "README.md": "# Project\n",
        },
      }, async (env) => {
        // Create main development branch
        await env.withGit(async (git) => {
          await git.branchCreate("develop");
          await git.checkout("develop");
        });

        // Create feature branches from develop
        await env.withGit(async (git) => {
          await git.branchCreate("feature/auth");
          await git.checkout("feature/auth");
        });

        // Add auth feature
        env.files.write("src/auth.js", "export const auth = {};\n");
        await env.files.syncToGit("src/auth.js");
        await env.withGit(async (git) => {
          await git.add("src/auth.js");
          await git.commit("Add authentication module");
        });

        // Create another feature branch
        await env.withGit(async (git) => {
          await git.checkout("develop");
          await git.branchCreate("feature/database");
          await git.checkout("feature/database");
        });

        // Add database feature
        env.files.write("src/database.js", "export const db = {};\n");
        await env.files.syncToGit("src/database.js");
        await env.withGit(async (git) => {
          await git.add("src/database.js");
          await git.commit("Add database module");
        });

        // Merge auth feature to develop
        await env.withGit(async (git) => {
          await git.checkout("develop");
          await git.merge("feature/auth");
        });

        // Merge database feature to develop
        await env.withGit(async (git) => {
          await git.merge("feature/database");
        });

        // Create release branch
        await env.withGit(async (git) => {
          await git.branchCreate("release/v1.0.0");
          await git.checkout("release/v1.0.0");
        });

        // Add release-specific changes
        env.files.write("CHANGELOG.md", "# Changelog\n\n## v1.0.0\n- Added auth\n- Added database\n");
        await env.files.syncToGit("CHANGELOG.md");
        await env.withGit(async (git) => {
          await git.add("CHANGELOG.md");
          await git.commit("Prepare release v1.0.0");
        });

        // Tag release
        await env.withGit(async (git) => {
          await git.tag("v1.0.0", "Release v1.0.0");
        });

        // Merge release to main
        await env.withGit(async (git) => {
          await git.checkout("main");
          await git.merge("release/v1.0.0");
        });

        // Verify all features are present
        const files = env.files.listDir("src");
        expect(files).toContain("auth.js");
        expect(files).toContain("database.js");

        // Verify release tag
        const tags = await env.withGit(async (git) => {
          return await git.run(["tag", "-l"]);
        });
        expect(tags).toContain("v1.0.0");

        // Verify commit history
        const log = await env.withGit(async (git) => {
          return await git.log("%s");
        });
        expect(log).toContain("Add authentication module");
        expect(log).toContain("Add database module");
        expect(log).toContain("Prepare release v1.0.0");
      });
    });
  });
});
