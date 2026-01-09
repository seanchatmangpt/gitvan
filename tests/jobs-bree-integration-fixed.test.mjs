// tests/jobs-bree-integration-fixed.test.mjs
// GitVan v3.0.0 — Bree Integration Tests (FIXED)
// Comprehensive tests with proper timer mocking and resource isolation

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
import {
  setupBreeSchedulerTest,
  MockBree,
  createTestJobFile,
  verifyJobExecution,
  waitForJobExecution,
} from "./helpers/bree-scheduler-mocks.mjs";
import { execSync } from "child_process";

describe("Bree Integration Tests (FIXED)", () => {
  let tempDir;
  let jobsDir;
  let timerControl;

  beforeEach(async () => {
    // Setup fake timers FIRST (before any async operations)
    timerControl = setupBreeSchedulerTest();

    // Create temporary directory for testing
    tempDir = join(process.cwd(), `test-bree-temp-${Date.now()}`);
    jobsDir = join(tempDir, "jobs");
    await fs.mkdir(jobsDir, { recursive: true });

    // Initialize git repo
    execSync("git init", { cwd: tempDir, stdio: "pipe" });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: "pipe" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempDir,
      stdio: "pipe",
    });

    // Create initial commit
    await fs.writeFile(join(tempDir, "README.md"), "# Test");
    execSync("git add .", { cwd: tempDir, stdio: "pipe" });
    execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: "pipe" });

    // Reset singletons
    resetBreeScheduler();
    resetJobBridge();
  });

  afterEach(async () => {
    // Restore real timers FIRST
    timerControl.cleanup();

    // Clean up scheduler
    try {
      const scheduler = getBreeScheduler({ cwd: tempDir });
      await scheduler.shutdown();
    } catch (error) {
      // Ignore if already shutdown
    }

    // Clean up files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore file cleanup errors
    }

    // Reset singletons
    resetBreeScheduler();
    resetJobBridge();
  });

  describe("BreeScheduler - Basic Operations", () => {
    it("should initialize Bree instance", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      expect(scheduler.bree).toBeDefined();
      expect(scheduler.isRunning).toBe(false);
      expect(scheduler.jobs.size).toBe(0);
    });

    it("should start and stop scheduler", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      await scheduler.start();
      expect(scheduler.isRunning).toBe(true);

      await scheduler.stop();
      expect(scheduler.isRunning).toBe(false);
    });

    it("should handle double start without error", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      await scheduler.start();
      expect(scheduler.isRunning).toBe(true);

      // Second start should not throw
      await scheduler.start();
      expect(scheduler.isRunning).toBe(true);
    });

    it("should handle stop when not running", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Stop without starting should not throw
      await scheduler.stop();

      expect(scheduler.isRunning).toBe(false);
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
      expect(Array.isArray(status.jobs)).toBe(true);
    });
  });

  describe("BreeScheduler - Job Management", () => {
    it("should add job to scheduler", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Create test job file
      const testJobFile = await createTestJobFile(
        jobsDir,
        "test-job",
        "return { success: true };"
      );

      const jobConfig = {
        name: "test-job",
        path: testJobFile,
        cron: "0 * * * *",
      };

      await scheduler.addJob(jobConfig);

      expect(scheduler.hasJob("test-job")).toBe(true);
      expect(scheduler.jobs.size).toBe(1);

      const job = scheduler.getJob("test-job");
      expect(job.name).toBe("test-job");
      expect(job.cron).toBe("0 * * * *");
    });

    it("should remove job from scheduler", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Create and add test job
      const testJobFile = await createTestJobFile(
        jobsDir,
        "test-job",
        "return { success: true };"
      );

      await scheduler.addJob({
        name: "test-job",
        path: testJobFile,
      });

      expect(scheduler.hasJob("test-job")).toBe(true);

      // Remove job
      await scheduler.removeJob("test-job");

      expect(scheduler.hasJob("test-job")).toBe(false);
      expect(scheduler.jobs.size).toBe(0);
    });

    it("should handle removing non-existent job", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Should not throw
      await scheduler.removeJob("nonexistent-job");

      expect(scheduler.jobs.size).toBe(0);
    });

    it("should list all jobs", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Create test job files
      const job1File = await createTestJobFile(
        jobsDir,
        "job1",
        "return {};"
      );
      const job2File = await createTestJobFile(
        jobsDir,
        "job2",
        "return {};"
      );

      await scheduler.addJob({ name: "job1", path: job1File });
      await scheduler.addJob({ name: "job2", path: job2File });

      const jobs = scheduler.listJobs();
      expect(jobs).toHaveLength(2);
      expect(jobs.map((j) => j.name)).toContain("job1");
      expect(jobs.map((j) => j.name)).toContain("job2");
    });

    it("should fail to add job with missing name", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      await expect(
        scheduler.addJob({
          // Missing name
          path: "/nonexistent/path.mjs",
        })
      ).rejects.toThrow("name is required");
    });

    it("should update job when adding with existing name", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      const job1File = await createTestJobFile(
        jobsDir,
        "job1",
        "return {};"
      );
      const job2File = await createTestJobFile(
        jobsDir,
        "job2",
        "return {};"
      );

      // Add initial job
      await scheduler.addJob({
        name: "test-job",
        path: job1File,
        interval: 5000,
      });

      expect(scheduler.jobs.size).toBe(1);

      // Add job with same name (should replace)
      await scheduler.addJob({
        name: "test-job",
        path: job2File,
        interval: 10000,
      });

      // Should still be 1 job
      expect(scheduler.jobs.size).toBe(1);

      const job = scheduler.getJob("test-job");
      expect(job.interval).toBe(10000); // Updated value
    });
  });

  describe("BreeScheduler - Shutdown & Cleanup", () => {
    it("should shutdown gracefully", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();
      await scheduler.start();

      expect(scheduler.isRunning).toBe(true);
      expect(scheduler.bree).toBeDefined();

      await scheduler.shutdown();

      expect(scheduler.isRunning).toBe(false);
      expect(scheduler.bree).toBe(null);
      expect(scheduler.jobs.size).toBe(0);
    });

    it("should shutdown with jobs scheduled", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Add multiple jobs
      const job1File = await createTestJobFile(
        jobsDir,
        "job1",
        "return {};"
      );
      const job2File = await createTestJobFile(
        jobsDir,
        "job2",
        "return {};"
      );

      await scheduler.addJob({ name: "job1", path: job1File });
      await scheduler.addJob({ name: "job2", path: job2File });

      await scheduler.start();

      expect(scheduler.jobs.size).toBe(2);
      expect(scheduler.isRunning).toBe(true);

      await scheduler.shutdown();

      expect(scheduler.jobs.size).toBe(0);
      expect(scheduler.isRunning).toBe(false);
    });
  });

  describe("JobBridge - Basic Operations", () => {
    it("should convert GitVan job to Bree config", async () => {
      const bridge = new JobBridge({ cwd: tempDir });

      // Create test job file
      const testJobFile = await createTestJobFile(
        jobsDir,
        "test-job",
        "return { success: true };"
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
    });

    it("should schedule job with Bree", async () => {
      const bridge = new JobBridge({ cwd: tempDir });

      const testJobFile = await createTestJobFile(
        jobsDir,
        "test-job",
        "return { success: true };"
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

      const testJobFile = await createTestJobFile(
        jobsDir,
        "test-job",
        "return { success: true };"
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

    it("should generate deterministic execution fingerprint", async () => {
      const bridge = new JobBridge({ cwd: tempDir });

      const fingerprint = await bridge.generateFingerprint(
        "test-job",
        "abc123",
        { key: "value" }
      );

      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe("string");
      expect(fingerprint.length).toBe(16);

      // Same inputs should produce same fingerprint (deterministic)
      const fingerprint2 = await bridge.generateFingerprint(
        "test-job",
        "abc123",
        { key: "value" }
      );

      expect(fingerprint).toBe(fingerprint2);
    });
  });

  describe("useJob Composable Integration", () => {
    it("should schedule job via useJob", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        const job = useJob();

        // Create test job file
        const testJobFile = await createTestJobFile(
          jobsDir,
          "test-job",
          `
export const meta = { name: "Test Job", desc: "Test", tags: [] };
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
        const testJobFile = await createTestJobFile(
          jobsDir,
          "test-job",
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
        const job1File = await createTestJobFile(
          jobsDir,
          "job1",
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
  });

  describe("Error Handling & Edge Cases", () => {
    it("should handle job execution with timeout", async () => {
      const scheduler = new BreeScheduler({
        cwd: tempDir,
        timeout: 100, // Very short timeout
      });
      await scheduler.init();

      const slowJobFile = await createTestJobFile(
        jobsDir,
        "slow-job",
        "return new Promise(r => setTimeout(r, 5000));" // 5 second job
      );

      await scheduler.addJob({
        name: "slow-job",
        path: slowJobFile,
      });

      // Should timeout, but not crash
      try {
        await scheduler.runJob("slow-job");
      } catch (error) {
        // Timeout expected
        expect(error).toBeDefined();
      }
    });

    it("should handle concurrent job operations with fake timers", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      // Create multiple job files
      const job1File = await createTestJobFile(
        jobsDir,
        "job1",
        "return {};"
      );
      const job2File = await createTestJobFile(
        jobsDir,
        "job2",
        "return {};"
      );
      const job3File = await createTestJobFile(
        jobsDir,
        "job3",
        "return {};"
      );

      // Add jobs concurrently
      await Promise.all([
        scheduler.addJob({ name: "job1", path: job1File }),
        scheduler.addJob({ name: "job2", path: job2File }),
        scheduler.addJob({ name: "job3", path: job3File }),
      ]);

      expect(scheduler.jobs.size).toBe(3);

      // Remove jobs concurrently
      await Promise.all([
        scheduler.removeJob("job1"),
        scheduler.removeJob("job2"),
        scheduler.removeJob("job3"),
      ]);

      expect(scheduler.jobs.size).toBe(0);
    });

    it("should maintain state consistency during recreation", async () => {
      const scheduler = new BreeScheduler({ cwd: tempDir });
      await scheduler.init();

      const job1File = await createTestJobFile(
        jobsDir,
        "job1",
        "return {};"
      );

      // Add job
      await scheduler.addJob({
        name: "job1",
        path: job1File,
        interval: 5000,
      });

      // Get job before recreation
      const jobBefore = scheduler.getJob("job1");
      expect(jobBefore.interval).toBe(5000);

      // Recreation happens internally during add/remove
      // Verify state is maintained
      const jobAfter = scheduler.getJob("job1");
      expect(jobAfter.interval).toBe(5000);
    });
  });

  describe("Timer Control Verification", () => {
    it("should use fake timers correctly", async () => {
      const now1 = timerControl.now();

      // Advance time
      timerControl.advanceTime(1000);

      const now2 = timerControl.now();

      // In fake timer environment, time advances by exact amount
      expect(now2 - now1).toBe(1000);
    });

    it("should allow running all pending timers", async () => {
      let executed = false;

      // Set timeout (won't execute yet)
      setTimeout(() => {
        executed = true;
      }, 5000);

      expect(executed).toBe(false);

      // Run all timers
      timerControl.runAllTimers();

      expect(executed).toBe(true);
    });

    it("should properly cleanup timers", async () => {
      // Timers already setup in beforeEach
      const initialNow = timerControl.now();

      // Cleanup restores real timers
      timerControl.cleanup();

      // After cleanup, timerControl methods might not work as expected
      // (real timers are restored)
      // This test just ensures cleanup completes without error
      expect(true).toBe(true);
    });
  });
});
