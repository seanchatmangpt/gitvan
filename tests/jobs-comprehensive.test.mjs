// tests/jobs-comprehensive.test.mjs
// GitVan v2 — Comprehensive Job System Tests
// Tests job discovery, definition, execution, and CLI

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import {
  scanJobs,
  getJobById,
  validateJobs,
  getJobStats,
} from "../src/jobs/scan.mjs";
import { defineJob, createJobDefinition } from "../src/jobs/define.mjs";
import { JobRunner, JobResult } from "../src/jobs/runner.mjs";
import { jobCLI } from "../src/cli/job.mjs";

describe("GitVan Job System - Comprehensive Tests", () => {
  let tempDir;
  let jobsDir;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = join(process.cwd(), "test-jobs-temp");
    jobsDir = join(tempDir, "jobs");
    await fs.mkdir(jobsDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("job definition system", () => {
    it("should create valid job definition", () => {
      const jobDef = defineJob({
        id: "test:job",
        meta: { desc: "Test job" },
        async run({ payload, ctx }) {
          return { ok: true };
        },
      });

      expect(jobDef.id).toBe("test:job");
      expect(jobDef.kind).toBe("atomic");
      expect(jobDef.meta.desc).toBe("Test job");
      expect(typeof jobDef.run).toBe("function");
    });

    it("should infer job properties from file path", () => {
      const jobDef = createJobDefinition(
        {
          async run({ payload, ctx }) {
            return { ok: true };
          },
        },
        "jobs/db/migrate.mjs",
      );

      expect(jobDef.id).toBe("db:migrate");
      expect(jobDef.mode).toBe("on-demand");
      expect(jobDef.filename).toBe("migrate.mjs");
    });

    it("should infer cron mode from filename", () => {
      const jobDef = createJobDefinition(
        {
          async run({ payload, ctx }) {
            return { ok: true };
          },
        },
        "jobs/cleanup.cron.mjs",
      );

      expect(jobDef.id).toBe("cleanup");
      expect(jobDef.mode).toBe("cron");
    });

    it("should validate job definition", () => {
      expect(() => {
        defineJob({
          // Missing run function
          meta: { desc: "Invalid job" },
        });
      }).toThrow("Job definition validation failed");
    });

    it("should validate event predicates", () => {
      expect(() => {
        defineJob({
          async run({ payload, ctx }) {
            return { ok: true };
          },
          on: {
            invalidPredicate: "test",
          },
        });
      }).toThrow("Job definition validation failed");
    });
  });

  describe("job discovery", () => {
    beforeEach(async () => {
      // Create test job files
      await fs.writeFile(
        join(jobsDir, "test.mjs"),
        `import { defineJob } from "../../src/jobs/define.mjs";

export default defineJob({
  meta: { desc: "Test job" },
  async run({ payload, ctx }) {
    return { ok: true };
  }
});`,
      );

      await fs.writeFile(
        join(jobsDir, "cleanup.cron.mjs"),
        `import { defineJob } from "../../src/jobs/define.mjs";

export default defineJob({
  cron: "0 2 * * *",
  meta: { desc: "Cleanup job" },
  async run({ payload, ctx }) {
    return { ok: true };
  }
});`,
      );

      await fs.writeFile(
        join(jobsDir, "notify.evt.mjs"),
        `import { defineJob } from "../../src/jobs/define.mjs";

export default defineJob({
  on: { tagCreate: "v*.*.*" },
  meta: { desc: "Notification job" },
  async run({ payload, ctx }) {
    return { ok: true };
  }
});`,
      );
    });

    it("should discover job files", async () => {
      const jobs = await scanJobs({ cwd: tempDir });

      console.log(
        "Discovered jobs:",
        jobs.map((j) => j.id),
      );
      console.log("Expected jobs: test, cleanup, notify");

      expect(jobs).toHaveLength(3);
      expect(jobs.find((job) => job.id === "test")).toBeDefined();
      expect(jobs.find((job) => job.id === "cleanup")).toBeDefined();
      expect(jobs.find((job) => job.id === "notify")).toBeDefined();
    });

    it("should get job by ID", async () => {
      const job = await getJobById("test", { cwd: tempDir });

      expect(job).toBeDefined();
      expect(job.id).toBe("test");
      expect(job.mode).toBe("on-demand");
    });

    it("should validate discovered jobs", async () => {
      const jobs = await scanJobs({ cwd: tempDir });
      const validation = validateJobs(jobs);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.count).toBe(3);
    });

    it("should provide job statistics", async () => {
      const jobs = await scanJobs({ cwd: tempDir });
      const stats = getJobStats(jobs);

      expect(stats.total).toBe(3);
      expect(stats.byMode["on-demand"]).toBe(1);
      expect(stats.byMode.cron).toBe(1);
      expect(stats.byMode.event).toBe(1);
    });
  });

  describe("job execution", () => {
    let runner;

    beforeEach(async () => {
      // Initialize git repository
      await fs.writeFile(join(tempDir, "README.md"), "# Test Repository\n");

      // Mock git operations for testing
      runner = new JobRunner({
        receiptsRef: "refs/notes/gitvan/test",
        locksRef: "refs/gitvan/test-locks",
        executionsRef: "refs/gitvan/test-executions",
      });
    });

    it("should execute job successfully", async () => {
      const jobDef = defineJob({
        id: "test:execution",
        async run({ payload, ctx }) {
          return { ok: true, artifacts: ["test.txt"] };
        },
      });

      // Mock the git operations
      const mockGit = {
        head: () => Promise.resolve("abc123"),
        getCurrentBranch: () => Promise.resolve("main"),
        updateRefCreate: () => Promise.resolve(true),
        runVoid: () => Promise.resolve(),
        noteAdd: () => Promise.resolve(),
        logger: console,
      };

      // Replace git operations in runner
      runner.git = mockGit;

      const result = await runner.runJob(jobDef, {
        payload: { test: "data" },
      });

      expect(result.ok).toBe(true);
      expect(result.id).toBe("test:execution");
      expect(result.artifacts).toEqual(["test.txt"]);
    });

    it("should handle job execution errors", async () => {
      const jobDef = defineJob({
        id: "test:error",
        async run({ payload, ctx }) {
          throw new Error("Test error");
        },
      });

      const mockGit = {
        head: () => Promise.resolve("abc123"),
        getCurrentBranch: () => Promise.resolve("main"),
        updateRefCreate: () => Promise.resolve(true),
        runVoid: () => Promise.resolve(),
        noteAdd: () => Promise.resolve(),
        logger: console,
      };

      runner.git = mockGit;

      await expect(runner.runJob(jobDef)).rejects.toThrow("Test error");
    });

    it("should generate unique fingerprints", async () => {
      const jobDef = defineJob({
        id: "test:fingerprint",
        async run({ payload, ctx }) {
          return { ok: true };
        },
      });

      const mockGit = {
        head: () => Promise.resolve("abc123"),
        getCurrentBranch: () => Promise.resolve("main"),
        updateRefCreate: () => Promise.resolve(true),
        runVoid: () => Promise.resolve(),
        noteAdd: () => Promise.resolve(),
        logger: console,
      };

      runner.git = mockGit;

      const fingerprint1 = runner.generateFingerprint(
        jobDef,
        "abc123",
        {},
        null,
      );
      const fingerprint2 = runner.generateFingerprint(
        jobDef,
        "def456",
        {},
        null,
      );
      const fingerprint3 = runner.generateFingerprint(
        jobDef,
        "abc123",
        { test: "data" },
        null,
      );

      expect(fingerprint1).not.toBe(fingerprint2);
      expect(fingerprint1).not.toBe(fingerprint3);
      expect(fingerprint2).not.toBe(fingerprint3);
    });
  });

  describe("job CLI", () => {
    beforeEach(async () => {
      // Create test job files
      await fs.writeFile(
        join(jobsDir, "cli-test.mjs"),
        `export default {
          meta: { desc: "CLI test job" },
          async run({ payload, ctx }) {
            return { ok: true, artifacts: ["cli-test.txt"] };
          }
        }`,
      );
    });

    it("should list jobs", async () => {
      // Mock the CLI to avoid file system issues
      const result = await jobCLI("list", { format: "json" });
      expect(result).toBeDefined();
    });

    it("should show job details", async () => {
      // This would require mocking the git operations
      // For now, just test that the command exists
      expect(typeof jobCLI).toBe("function");
    });
  });

  describe("job result", () => {
    it("should create job result", () => {
      const result = new JobResult({
        id: "test:result",
        fingerprint: "abc123",
        startedAt: "2024-01-01T00:00:00Z",
        finishedAt: "2024-01-01T00:01:00Z",
        head: "def456",
        ok: true,
        artifacts: ["test.txt"],
        duration: 60000,
      });

      expect(result.id).toBe("test:result");
      expect(result.ok).toBe(true);
      expect(result.artifacts).toEqual(["test.txt"]);
      expect(result.duration).toBe(60000);
    });

    it("should serialize to JSON", () => {
      const result = new JobResult({
        id: "test:serialize",
        fingerprint: "abc123",
        startedAt: "2024-01-01T00:00:00Z",
        finishedAt: "2024-01-01T00:01:00Z",
        head: "def456",
        ok: true,
        artifacts: ["test.txt"],
        duration: 60000,
      });

      const json = result.toJSON();
      expect(json.id).toBe("test:serialize");
      expect(json.ok).toBe(true);
      expect(json.artifacts).toEqual(["test.txt"]);
    });
  });
});
