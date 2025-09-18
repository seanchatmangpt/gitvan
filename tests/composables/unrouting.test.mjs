/**
 * GitVan Unrouting Unit Tests
 *
 * Based on documentation analysis, these tests cover:
 * - File-based routing patterns
 * - Parameter extraction from file paths
 * - Job queue generation
 * - Pattern matching with unrouting library
 * - Payload binding with parameter substitution
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useUnrouting } from "../../src/composables/unrouting.mjs";
import { withGitVan } from "../../src/core/context.mjs";

describe("GitVan Unrouting", () => {
  let unrouting;

  beforeEach(async () => {
    await withGitVan({ cwd: process.cwd() }, async () => {
      unrouting = useUnrouting();
    });
  });

  describe("parsePath", () => {
    it("should parse file paths into segments", () => {
      const result = unrouting.parsePath("src/components/Button/Button.tsx");
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });

    it("should handle paths with parameters", () => {
      const result = unrouting.parsePath("src/pages/[slug]/index.tsx");
      expect(result).toBeDefined();
    });

    it("should handle root paths", () => {
      const result = unrouting.parsePath("/src/components/Button.tsx");
      expect(result).toBeDefined();
    });
  });

  describe("matchPattern", () => {
    it("should match composable patterns", () => {
      const pattern = "src/composables/[name].mjs";
      const filePath = "src/composables/git.mjs";

      const match = unrouting.matchPattern(pattern, filePath);

      expect(match).toBeDefined();
      expect(match.params).toEqual({
        name: "git.mjs",
      });
      expect(match.filePath).toBe(filePath);
      expect(match.pattern).toBe(pattern);
    });

    it("should match CLI patterns", () => {
      const pattern = "src/cli/[command].mjs";
      const filePath = "src/cli/daemon.mjs";

      const match = unrouting.matchPattern(pattern, filePath);

      expect(match).toBeDefined();
      expect(match.params).toEqual({
        command: "daemon.mjs",
      });
    });

    it("should match API patterns", () => {
      const pattern = "src/api/[endpoint].ts";
      const filePath = "src/api/users.ts";

      const match = unrouting.matchPattern(pattern, filePath);

      expect(match).toBeDefined();
      expect(match.params).toEqual({
        endpoint: "users.ts",
      });
    });

    it("should match job patterns", () => {
      const pattern = "jobs/[job].mjs";
      const filePath = "jobs/hello.mjs";

      const match = unrouting.matchPattern(pattern, filePath);

      expect(match).toBeDefined();
      expect(match.params).toEqual({
        job: "hello.mjs",
      });
    });

    it("should match config patterns", () => {
      const pattern = "config/[file].json";
      const filePath = "config/database.json";

      const match = unrouting.matchPattern(pattern, filePath);

      expect(match).toBeDefined();
      expect(match.params).toEqual({
        file: "database.json",
      });
    });

    it("should return null for non-matching patterns", () => {
      const pattern = "src/components/[name]/[file].tsx";
      const filePath = "src/pages/dashboard/Dashboard.tsx";

      const match = unrouting.matchPattern(pattern, filePath);

      expect(match).toBeNull();
    });

    it("should handle paths without leading slash", () => {
      const pattern = "src/components/[name]/[file].tsx";
      const filePath = "src/components/Button/Button.tsx"; // No leading slash

      const match = unrouting.matchPattern(pattern, filePath);

      expect(match).toBeDefined();
      expect(match.params).toEqual({
        name: "Button",
        file: "Button.tsx",
      });
    });

    it("should handle paths with leading slash", () => {
      const pattern = "src/components/[name]/[file].tsx";
      const filePath = "/src/components/Button/Button.tsx"; // With leading slash

      const match = unrouting.matchPattern(pattern, filePath);

      expect(match).toBeDefined();
      expect(match.params).toEqual({
        name: "Button",
        file: "Button.tsx",
      });
    });
  });

  describe("bindPayload", () => {
    it("should bind parameters to job payload", () => {
      const template = {
        name: ":name",
        file: ":file",
        path: ":__file",
      };
      const params = {
        name: "Button",
        file: "Button.tsx",
      };
      const filePath = "src/components/Button/Button.tsx";

      const payload = unrouting.bindPayload(template, params, filePath);

      expect(payload).toEqual({
        name: "Button",
        file: "Button.tsx",
        path: "src/components/Button/Button.tsx",
      });
    });

    it("should handle missing parameters", () => {
      const template = {
        name: ":name",
        file: ":file",
        missing: ":missing",
      };
      const params = {
        name: "Button",
      };
      const filePath = "src/components/Button/Button.tsx";

      const payload = unrouting.bindPayload(template, params, filePath);

      expect(payload).toEqual({
        name: "Button",
        file: ":file", // Unchanged when param missing
        missing: ":missing", // Unchanged when param missing
      });
    });

    it("should handle non-string values", () => {
      const template = {
        name: ":name",
        count: 42,
        enabled: true,
        config: { key: "value" },
      };
      const params = {
        name: "Button",
      };
      const filePath = "src/components/Button/Button.tsx";

      const payload = unrouting.bindPayload(template, params, filePath);

      expect(payload).toEqual({
        name: "Button",
        count: 42,
        enabled: true,
        config: { key: "value" },
      });
    });

    it("should handle __file placeholder", () => {
      const template = {
        path: ":__file",
        name: ":name",
      };
      const params = {
        name: "Button",
      };
      const filePath = "src/components/Button/Button.tsx";

      const payload = unrouting.bindPayload(template, params, filePath);

      expect(payload).toEqual({
        path: "src/components/Button/Button.tsx",
        name: "Button",
      });
    });
  });

  describe("routeFiles", () => {
    const testRoutes = [
      {
        id: "composable-change",
        pattern: "src/composables/[name].mjs",
        job: {
          name: "composable:update",
          with: { name: ":name", path: ":__file" },
        },
      },
      {
        id: "cli-change",
        pattern: "src/cli/[command].mjs",
        job: {
          name: "cli:update",
          with: { command: ":command", path: ":__file" },
        },
      },
      {
        id: "job-change",
        pattern: "jobs/[job].mjs",
        job: {
          name: "job:update",
          with: { job: ":job", path: ":__file" },
        },
      },
      {
        id: "api-change",
        pattern: "src/api/[endpoint].ts",
        job: {
          name: "api:update",
          with: { endpoint: ":endpoint", path: ":__file" },
        },
      },
    ];

    it("should route composable files to composable jobs", () => {
      const changedFiles = ["src/composables/git.mjs"];

      const jobQueue = unrouting.routeFiles(changedFiles, testRoutes);

      expect(jobQueue).toHaveLength(1);
      expect(jobQueue[0]).toEqual({
        name: "composable:update",
        payload: {
          name: "git.mjs",
          path: "src/composables/git.mjs",
        },
        filePath: "src/composables/git.mjs",
        routeId: "composable-change",
      });
    });

    it("should route CLI files to CLI jobs", () => {
      const changedFiles = ["src/cli/daemon.mjs"];

      const jobQueue = unrouting.routeFiles(changedFiles, testRoutes);

      expect(jobQueue).toHaveLength(1);
      expect(jobQueue[0]).toEqual({
        name: "cli:update",
        payload: {
          command: "daemon.mjs",
          path: "src/cli/daemon.mjs",
        },
        filePath: "src/cli/daemon.mjs",
        routeId: "cli-change",
      });
    });

    it("should route API files to API jobs", () => {
      const changedFiles = ["src/api/users.ts"];

      const jobQueue = unrouting.routeFiles(changedFiles, testRoutes);

      expect(jobQueue).toHaveLength(1);
      expect(jobQueue[0]).toEqual({
        name: "api:update",
        payload: {
          endpoint: "users.ts",
          path: "src/api/users.ts",
        },
        filePath: "src/api/users.ts",
        routeId: "api-change",
      });
    });

    it("should route job files to job jobs", () => {
      const changedFiles = ["jobs/hello.mjs"];

      const jobQueue = unrouting.routeFiles(changedFiles, testRoutes);

      expect(jobQueue).toHaveLength(1);
      expect(jobQueue[0]).toEqual({
        name: "job:update",
        payload: {
          job: "hello.mjs",
          path: "jobs/hello.mjs",
        },
        filePath: "jobs/hello.mjs",
        routeId: "job-change",
      });
    });

    it("should handle multiple files with multiple matches", () => {
      const changedFiles = [
        "src/composables/git.mjs",
        "src/cli/daemon.mjs",
        "src/api/users.ts",
        "jobs/hello.mjs",
      ];

      const jobQueue = unrouting.routeFiles(changedFiles, testRoutes);

      expect(jobQueue).toHaveLength(4);

      // Check that all expected jobs are generated
      const jobNames = jobQueue.map((job) => job.name);
      expect(jobNames).toContain("composable:update");
      expect(jobNames).toContain("cli:update");
      expect(jobNames).toContain("api:update");
      expect(jobNames).toContain("job:update");
    });

    it("should handle files that don't match any patterns", () => {
      const changedFiles = [
        "src/composables/git.mjs",
        "README.md", // Doesn't match any pattern
        "package.json", // Doesn't match any pattern
      ];

      const jobQueue = unrouting.routeFiles(changedFiles, testRoutes);

      expect(jobQueue).toHaveLength(1); // Only the composable file matches
      expect(jobQueue[0].name).toBe("composable:update");
    });

    it("should handle empty file list", () => {
      const changedFiles = [];

      const jobQueue = unrouting.routeFiles(changedFiles, testRoutes);

      expect(jobQueue).toHaveLength(0);
    });

    it("should handle empty routes list", () => {
      const changedFiles = ["src/composables/git.mjs"];

      const jobQueue = unrouting.routeFiles(changedFiles, []);

      expect(jobQueue).toHaveLength(0);
    });
  });

  describe("Integration Tests", () => {
    it("should work with real-world file patterns", () => {
      const routes = [
        {
          id: "composable-change",
          pattern: "src/composables/[name].mjs",
          job: {
            name: "composable:update",
            with: { name: ":name", path: ":__file" },
          },
        },
        {
          id: "cli-change",
          pattern: "src/cli/[command].mjs",
          job: {
            name: "cli:update",
            with: { command: ":command", path: ":__file" },
          },
        },
        {
          id: "job-change",
          pattern: "jobs/[job].mjs",
          job: {
            name: "job:update",
            with: { job: ":job", path: ":__file" },
          },
        },
        {
          id: "api-change",
          pattern: "src/api/[endpoint].ts",
          job: {
            name: "api:update",
            with: { endpoint: ":endpoint", path: ":__file" },
          },
        },
        {
          id: "config-change",
          pattern: "config/[file].json",
          job: {
            name: "config:reload",
            with: { file: ":file", path: ":__file" },
          },
        },
      ];

      const testFiles = [
        "src/composables/git.mjs",
        "src/cli/daemon.mjs",
        "src/api/users.ts",
        "jobs/hello.mjs",
        "config/database.json",
      ];

      const jobQueue = unrouting.routeFiles(testFiles, routes);

      expect(jobQueue).toHaveLength(5);

      // Verify each job has the correct structure
      for (const job of jobQueue) {
        expect(job).toHaveProperty("name");
        expect(job).toHaveProperty("payload");
        expect(job).toHaveProperty("filePath");
        expect(job).toHaveProperty("routeId");
        expect(typeof job.name).toBe("string");
        expect(typeof job.payload).toBe("object");
        expect(typeof job.filePath).toBe("string");
        expect(typeof job.routeId).toBe("string");
      }
    });
  });
});
