// tests/jobs-bree-integration.test.mjs
// GitVan v3.0.0 — Bree Integration Tests
// Comprehensive tests for Bree-based job scheduling

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { withGitVan } from "../src/core/context.mjs";
import { useJob } from "../src/composables/job.mjs";
import {
  BreeScheduler,
  getBreeScheduler,
  resetBreeScheduler,
} from "../src/jobs/bree-scheduler.mjs";
import {
  JobBridge,
  getJobBridge,
  resetJobBridge,
} from "../src/jobs/job-bridge.mjs";
import { execSync } from "child_process";

describe("Bree Integration Tests", () => {
  let tempDir;
  let jobsDir;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = join(process.cwd(), "test-bree-temp");
    jobsDir = join(tempDir, "jobs");
    await fs.mkdir(jobsDir, { recursive: true });

    // Initialize git repo
    execSync("git init", { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });

    // Create initial commit
    await fs.writeFile(join(tempDir, "README.md"), "# Test");
    execSync("git add .", { cwd: tempDir });
    execSync('git commit -m "Initial commit"', { cwd: tempDir });

    // Reset singletons
    resetBreeScheduler();
    resetJobBridge();
  });

  afterEach(async () => {
    // Clean up
    try {
      const scheduler = getBreeScheduler({ cwd: tempDir });
      await scheduler.shutdown();
    } catch {}

    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}

    resetBreeScheduler();
    resetJobBridge();
  });

  describe("BreeScheduler", () => {
    it("should initialize Bree instance", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      expect(scheduler.bree).toBeDefined();
      expect(scheduler.isRunning).toBe(false);
    });

    it("should start and stop scheduler", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      await scheduler.start();
      expect(scheduler.isRunning).toBe(true);

      await scheduler.stop();
      expect(scheduler.isRunning).toBe(false);
    });

    it("should add job to scheduler", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Create test job file
      const testJobFile = join(jobsDir, "test-job.mjs");
      await fs.writeFile(
        testJobFile,
        `
export default async function run({ payload, ctx }) {
  return { success: true, payload };
}
      `.trim()
      );

      const jobConfig = {
        name: "test-job",
        path: testJobFile,
        cron: "0 * * * *",
      };

      await scheduler.addJob(jobConfig);

      expect(scheduler.hasJob("test-job")).toBe(true);
      expect(scheduler.jobs.size).toBe(1);
    });

    it("should remove job from scheduler", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Create test job file
      const testJobFile = join(jobsDir, "test-job.mjs");
      await fs.writeFile(
        testJobFile,
        `
export default async function run({ payload, ctx }) {
  return { success: true };
}
      `.trim()
      );

      await scheduler.addJob({
        name: "test-job",
        path: testJobFile,
      });

      expect(scheduler.hasJob("test-job")).toBe(true);

      await scheduler.removeJob("test-job");

      expect(scheduler.hasJob("test-job")).toBe(false);
      expect(scheduler.jobs.size).toBe(0);
    });

    it("should list all jobs", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Create test job files
      const job1File = join(jobsDir, "job1.mjs");
      const job2File = join(jobsDir, "job2.mjs");

      await fs.writeFile(
        job1File,
        `export default async function run() { return {}; }`
      );
      await fs.writeFile(
        job2File,
        `export default async function run() { return {}; }`
      );

      await scheduler.addJob({ name: "job1", path: job1File });
      await scheduler.addJob({ name: "job2", path: job2File });

      const jobs = scheduler.listJobs();
      expect(jobs).toHaveLength(2);
      expect(jobs.map((j) => j.name)).toContain("job1");
      expect(jobs.map((j) => j.name)).toContain("job2");
    });

    it("should get scheduler status", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      const status = scheduler.getStatus();

      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("jobCount");
      expect(status).toHaveProperty("jobs");
      expect(status.isRunning).toBe(false);
      expect(status.jobCount).toBe(0);
    });

    it("should shutdown gracefully", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();
      await scheduler.start();

      expect(scheduler.isRunning).toBe(true);

      await scheduler.shutdown();

      expect(scheduler.isRunning).toBe(false);
      expect(scheduler.bree).toBe(null);
      expect(scheduler.jobs.size).toBe(0);
    });
  });

  describe("JobBridge", () => {
    it("should convert GitVan job to Bree config", async () => {
      const bridge = new JobBridge({ cwd: tempDir });

      // Create test job file
      const testJobFile = join(jobsDir, "test-job.mjs");
      await fs.writeFile(
        testJobFile,
        `
export const meta = { name: "Test Job", desc: "Test description" };
export default async function run({ payload, ctx }) {
  return { success: true };
}
      `.trim()
      );

      const jobDef = {
        id: "test-job",
        name: "Test Job",
        file: testJobFile,
        meta: { name: "Test Job", desc: "Test description" },
        cron: "0 * * * *",
      };

      const breeConfig = bridge.toBreeJobConfig(jobDef);

      expect(breeConfig.name).toBe("test-job");
      expect(breeConfig.cron).toBe("0 * * * *");
      expect(breeConfig.path).toBeDefined();
      expect(breeConfig.worker).toBeDefined();
      expect(breeConfig.worker.workerData.jobId).toBe("test-job");
    });

    it("should schedule job with Bree", async () => {
      const bridge = new JobBridge({ cwd: tempDir });

      // Create test job file
      const testJobFile = join(jobsDir, "test-job.mjs");
      await fs.writeFile(
        testJobFile,
        `
export default async function run({ payload, ctx }) {
  return { success: true };
}
      `.trim()
      );

      const jobDef = {
        id: "test-job",
        file: testJobFile,
        meta: { name: "Test Job" },
      };

      await bridge.scheduleJob(jobDef, { cron: "0 * * * *" });

      expect(bridge.scheduler.hasJob("test-job")).toBe(true);
    });

    it("should unschedule job", async () => {
      const bridge = new JobBridge({ cwd: tempDir });

      // Create test job file
      const testJobFile = join(jobsDir, "test-job.mjs");
      await fs.writeFile(
        testJobFile,
        `
export default async function run({ payload, ctx }) {
  return { success: true };
}
      `.trim()
      );

      const jobDef = {
        id: "test-job",
        file: testJobFile,
      };

      await bridge.scheduleJob(jobDef);
      expect(bridge.scheduler.hasJob("test-job")).toBe(true);

      await bridge.unscheduleJob("test-job");
      expect(bridge.scheduler.hasJob("test-job")).toBe(false);
    });

    it("should generate execution fingerprint", async () => {
      const bridge = new JobBridge({ cwd: tempDir });

      const fingerprint = await bridge.generateFingerprint(
        "test-job",
        "abc123",
        { key: "value" }
      );

      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe("string");
      expect(fingerprint.length).toBe(16);

      // Same inputs should produce same fingerprint
      const fingerprint2 = await bridge.generateFingerprint(
        "test-job",
        "abc123",
        { key: "value" }
      );

      expect(fingerprint).toBe(fingerprint2);
    });
  });

  describe("useJob with Bree", () => {
    it("should schedule job via useJob", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        // Create test job file
        const testJobFile = join(jobsDir, "test-job.mjs");
        await fs.writeFile(
          testJobFile,
          `
export const meta = { name: "Test Job", desc: "Test description", tags: [] };
export const cron = "0 * * * *";
export default async function run({ payload, ctx }) {
  return { success: true };
}
        `.trim()
        );

        const result = await job.schedule("test-job");

        expect(result.jobId).toBe("test-job");
        expect(result.scheduled).toBe(true);
      });
    });

    it("should unschedule job via useJob", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        // Create test job file
        const testJobFile = join(jobsDir, "test-job.mjs");
        await fs.writeFile(
          testJobFile,
          `
export const meta = { name: "Test Job", desc: "Test", tags: [] };
export default async function run({ payload, ctx }) {
  return { success: true };
}
        `.trim()
        );

        await job.schedule("test-job");
        const result = await job.unschedule("test-job");

        expect(result.jobId).toBe("test-job");
        expect(result.unscheduled).toBe(true);
      });
    });

    it("should start and stop scheduler via useJob", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        const startResult = await job.startScheduler();
        expect(startResult.started).toBe(true);

        const status = job.getSchedulerStatus();
        expect(status.isRunning).toBe(true);

        const stopResult = await job.stopScheduler();
        expect(stopResult.stopped).toBe(true);
      });
    });

    it("should get scheduler status via useJob", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        const status = job.getSchedulerStatus();

        expect(status).toHaveProperty("isRunning");
        expect(status).toHaveProperty("jobCount");
        expect(status).toHaveProperty("jobs");
      });
    });

    it("should list scheduled jobs via useJob", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        // Create test job files
        const job1File = join(jobsDir, "job1.mjs");
        await fs.writeFile(
          job1File,
          `
export const meta = { name: "Job 1", desc: "Test", tags: [] };
export default async function run() { return {}; }
        `.trim()
        );

        await job.schedule("job1");

        const scheduledJobs = job.listScheduledJobs();

        expect(Array.isArray(scheduledJobs)).toBe(true);
      });
    });

    it("should auto-schedule cron jobs via useJob", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        // Create cron job files
        const cron1File = join(jobsDir, "cron1.mjs");
        const cron2File = join(jobsDir, "cron2.mjs");

        await fs.writeFile(
          cron1File,
          `
export const meta = { name: "Cron Job 1", desc: "Test", tags: [] };
export const cron = "0 * * * *";
export default async function run() { return {}; }
        `.trim()
        );

        await fs.writeFile(
          cron2File,
          `
export const meta = { name: "Cron Job 2", desc: "Test", tags: [] };
export const cron = "0 0 * * *";
export default async function run() { return {}; }
        `.trim()
        );

        const results = await job.autoScheduleCronJobs();

        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);

        const scheduled = results.filter((r) => r.scheduled);
        expect(scheduled.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid job definition", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      await expect(
        scheduler.addJob({
          // Missing name
          path: "/nonexistent/path.mjs",
        })
      ).rejects.toThrow();
    });

    it("should handle double start", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();
      await scheduler.start();

      // Should not throw, but warn
      await scheduler.start();

      expect(scheduler.isRunning).toBe(true);
    });

    it("should handle stop when not running", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Should not throw, but warn
      await scheduler.stop();

      expect(scheduler.isRunning).toBe(false);
    });

    it("should handle removing non-existent job", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Should not throw, but warn
      await scheduler.removeJob("nonexistent-job");

      expect(scheduler.jobs.size).toBe(0);
    });
  });

  describe("Integration with existing job system", () => {
    it("should maintain backward compatibility with run()", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        // Create test job file
        const testJobFile = join(jobsDir, "test-job.mjs");
        await fs.writeFile(
          testJobFile,
          `
export const meta = { name: "Test Job", desc: "Test", tags: [] };
export default async function run({ payload, ctx }) {
  return { success: true, payload };
}
        `.trim()
        );

        // run() should still work without Bree
        const result = await job.run("test-job", {
          payload: { test: "data" },
        });

        expect(result).toBeDefined();
      });
    });

    it("should maintain list() functionality", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        // Create test job files
        const job1File = join(jobsDir, "job1.mjs");
        await fs.writeFile(
          job1File,
          `
export const meta = { name: "Job 1", desc: "Test", tags: [] };
export default async function run() { return {}; }
        `.trim()
        );

        const jobs = await job.list();

        expect(Array.isArray(jobs)).toBe(true);
      });
    });

    it("should maintain status() functionality", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        // Create test job file
        const testJobFile = join(jobsDir, "test-job.mjs");
        await fs.writeFile(
          testJobFile,
          `
export const meta = { name: "Test Job", desc: "Test", tags: [] };
export default async function run() { return {}; }
        `.trim()
        );

        const status = await job.status("test-job");

        expect(status).toHaveProperty("id");
        expect(status).toHaveProperty("isRunning");
        expect(status).toHaveProperty("lastRun");
        expect(status).toHaveProperty("lastStatus");
      });
    });
  });
});
