// tests/jobs-advanced.test.mjs
// GitVan v2 — Advanced Job System Tests
// Tests cron scheduler, events, daemon, and hooks

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { CronScheduler, CronCLI } from "../src/jobs/cron.mjs";
import {
  EventEvaluator,
  EventJobRunner,
  EventCLI,
} from "../src/jobs/events.mjs";
import { JobDaemon, DaemonCLI } from "../src/jobs/daemon.mjs";
import {
  JobHooks,
  createJobHooks,
  HookCLI,
  JOB_HOOKS,
} from "../src/jobs/hooks.mjs";

describe("GitVan Advanced Job System Tests", () => {
  let tempDir;
  let jobsDir;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-advanced-jobs-temp");
    jobsDir = join(tempDir, "jobs");
    await fs.mkdir(jobsDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("cron scheduler", () => {
    let scheduler;

    beforeEach(() => {
      scheduler = new CronScheduler();
    });

    it("should parse cron expressions", () => {
      const spec = scheduler.parseCron("0 2 * * *");
      expect(spec.minute).toBe(0);
      expect(spec.hour).toBe(2);
      expect(spec.day).toBe(null); // "*"
      expect(spec.month).toBe(null); // "*"
      expect(spec.weekday).toBe(null); // "*"
    });

    it("should parse complex cron expressions", () => {
      const spec = scheduler.parseCron("*/15 9-17 * * 1-5");
      expect(spec.minute).toEqual({ base: 0, step: 15 });
      expect(spec.hour).toEqual({ start: 9, end: 17 });
      expect(spec.weekday).toEqual({ start: 1, end: 5 });
    });

    it("should validate cron expressions", () => {
      expect(() => scheduler.parseCron("invalid")).toThrow(
        "Invalid cron expression",
      );
      expect(() => scheduler.parseCron("0 2")).toThrow("expected 5 fields");
    });

    it("should match cron expressions", () => {
      const spec = scheduler.parseCron("0 2 * * *");
      // Create a date that is actually 2:00 AM in local time
      const testDate = new Date(2024, 0, 1, 2, 0, 0); // January 1, 2024, 2:00 AM local time

      // Debug the matching
      console.log("Test date:", testDate);
      console.log("Hour:", testDate.getHours());
      console.log("Minute:", testDate.getMinutes());
      console.log("Spec:", spec);

      // The test date is 2:00 AM local time, which should match "0 2 * * *"
      expect(scheduler.matchesCron(spec, testDate)).toBe(true);
    });

    it("should calculate next execution time", () => {
      const spec = scheduler.parseCron("0 2 * * *");
      const from = new Date("2024-01-01T01:00:00Z");
      const next = scheduler.getNextExecution(spec, from);

      expect(next).toBeDefined();
      expect(next.getHours()).toBe(2);
      expect(next.getMinutes()).toBe(0);
    });

    it("should create cron scheduler", () => {
      expect(scheduler).toBeDefined();
      expect(scheduler.isRunning).toBe(false);
      expect(scheduler.schedule.size).toBe(0);
    });
  });

  describe("event evaluator", () => {
    let evaluator;

    beforeEach(() => {
      evaluator = new EventEvaluator();
    });

    it("should create event evaluator", () => {
      expect(evaluator).toBeDefined();
    });

    it("should match patterns", () => {
      expect(evaluator.matchesPattern("test.txt", "*.txt")).toBe(true);
      expect(evaluator.matchesPattern("test.txt", "test.*")).toBe(true);
      expect(evaluator.matchesPattern("test.txt", "*.md")).toBe(false);
      expect(evaluator.matchesPattern("test.txt", "test.txt")).toBe(true);
    });

    it("should evaluate logical predicates", async () => {
      const predicates = {
        any: [{ tagCreate: "v*.*.*" }, { message: "release" }],
      };

      const results = await evaluator.evaluatePredicates(predicates, {});
      expect(results).toBeDefined();
      expect(results.any).toBeDefined();
    });

    it("should check predicate truth", () => {
      expect(evaluator.isPredicateTrue(true)).toBe(true);
      expect(evaluator.isPredicateTrue(false)).toBe(false);
      expect(evaluator.isPredicateTrue({ any: true })).toBe(true);
      expect(evaluator.isPredicateTrue({ all: false })).toBe(false);
    });
  });

  describe("event job runner", () => {
    let runner;

    beforeEach(() => {
      runner = new EventJobRunner();
    });

    it("should create event job runner", () => {
      expect(runner).toBeDefined();
      expect(runner.eventJobs.size).toBe(0);
    });

    it("should dry run event jobs", async () => {
      const result = await runner.dryRun({ commit: "HEAD" });
      expect(result).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.jobsToRun).toBeDefined();
      expect(result.totalJobs).toBeDefined();
    });
  });

  describe("job daemon", () => {
    let daemon;

    beforeEach(() => {
      daemon = new JobDaemon();
    });

    it("should create job daemon", () => {
      expect(daemon).toBeDefined();
      expect(daemon.isRunning).toBe(false);
      expect(daemon.cronScheduler).toBeDefined();
      expect(daemon.eventRunner).toBeDefined();
    });

    it("should get daemon status", () => {
      const status = daemon.getStatus();
      expect(status).toBeDefined();
      expect(status.isRunning).toBe(false);
      expect(status.cronStatus).toBe(null);
    });

    it("should get daemon statistics", async () => {
      const stats = await daemon.getStats();
      expect(stats).toBeDefined();
      expect(stats.cronJobs).toBe(0);
      expect(stats.eventJobs).toBe(0);
      expect(stats.totalJobs).toBe(0);
    });
  });

  describe("job hooks", () => {
    let hooks;

    beforeEach(() => {
      hooks = new JobHooks();
    });

    it("should create job hooks", () => {
      expect(hooks).toBeDefined();
      expect(hooks.hooks).toBeDefined();
      expect(hooks.hookCounts.size).toBe(0);
    });

    it("should add and remove hooks", () => {
      const testHook = vi.fn();

      hooks.hook("test:hook", testHook);
      expect(hooks.hookCounts.get("test:hook")).toBe(1);

      hooks.unhook("test:hook", testHook);
      expect(hooks.hookCounts.get("test:hook")).toBe(0);
    });

    it("should call hooks", async () => {
      const testHook = vi.fn().mockResolvedValue(undefined);
      hooks.hook("test:hook", testHook);

      await hooks.callHook("test:hook", { test: "data" });

      expect(testHook).toHaveBeenCalledWith({ test: "data" });
    });

    it("should get hook statistics", () => {
      const testHook = vi.fn();
      hooks.hook("test:hook", testHook);

      const stats = hooks.getStats();
      expect(stats.totalHooks).toBe(1);
      expect(stats.hookCounts["test:hook"]).toBe(1);
    });

    it("should list hooks", () => {
      const testHook = vi.fn();
      hooks.hook("test:hook", testHook);

      const hookList = hooks.listHooks();
      expect(hookList).toContain("test:hook");
    });

    it("should create hooks with defaults", () => {
      const hooksWithDefaults = createJobHooks();
      expect(hooksWithDefaults).toBeDefined();
      expect(hooksWithDefaults.hookCounts.size).toBeGreaterThan(0);
    });

    it("should create hooks with custom options", () => {
      const customHook = vi.fn();
      const hooksWithCustom = createJobHooks({
        hooks: { "custom:hook": customHook },
      });

      expect(hooksWithCustom.hookCounts.get("custom:hook")).toBe(1);
    });
  });

  describe("hook CLI", () => {
    let hookCLI;

    beforeEach(() => {
      hookCLI = new HookCLI();
    });

    it("should create hook CLI", () => {
      expect(hookCLI).toBeDefined();
      expect(hookCLI.hooks).toBeDefined();
    });

    it("should list available hooks", () => {
      // This would normally console.log, but we can test the structure
      expect(JOB_HOOKS).toBeDefined();
      expect(Object.keys(JOB_HOOKS).length).toBeGreaterThan(0);
      expect(JOB_HOOKS["job:before"]).toBeDefined();
    });

    it("should show hook statistics", () => {
      const stats = hookCLI.hooks.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalHooks).toBeGreaterThan(0);
    });

    it("should test hooks", async () => {
      const testData = { id: "test", payload: {} };

      // This would normally console.log, but we can test the execution
      await expect(hookCLI.test("job:before", testData)).resolves.not.toThrow();
    });
  });

  describe("cron CLI", () => {
    let cronCLI;

    beforeEach(() => {
      cronCLI = new CronCLI();
    });

    it("should create cron CLI", () => {
      expect(cronCLI).toBeDefined();
      expect(cronCLI.scheduler).toBe(null);
    });

    it("should list cron schedule", async () => {
      // This would normally console.log, but we can test the execution
      await expect(cronCLI.list()).resolves.not.toThrow();
    });

    it("should dry run cron jobs", async () => {
      const targetTime = new Date("2024-01-01T02:00:00Z");

      // This would normally console.log, but we can test the execution
      await expect(cronCLI.dryRun(targetTime)).resolves.not.toThrow();
    });
  });

  describe("event CLI", () => {
    let eventCLI;

    beforeEach(() => {
      eventCLI = new EventCLI();
    });

    it("should create event CLI", () => {
      expect(eventCLI).toBeDefined();
      expect(eventCLI.runner).toBe(null);
    });

    it("should list event jobs", async () => {
      // This would normally console.log, but we can test the execution
      await expect(eventCLI.list()).resolves.not.toThrow();
    });

    it("should dry run event jobs", async () => {
      const context = { commit: "HEAD", previousCommit: "HEAD~1" };

      // This would normally console.log, but we can test the execution
      await expect(eventCLI.dryRun(context)).resolves.not.toThrow();
    });
  });

  describe("daemon CLI", () => {
    let daemonCLI;

    beforeEach(() => {
      daemonCLI = new DaemonCLI();
    });

    it("should create daemon CLI", () => {
      expect(daemonCLI).toBeDefined();
      expect(daemonCLI.daemon).toBe(null);
    });

    it("should show daemon status", async () => {
      // This would normally console.log, but we can test the execution
      await expect(daemonCLI.status()).resolves.not.toThrow();
    });

    it("should show daemon statistics", async () => {
      // This would normally console.log, but we can test the execution
      await expect(daemonCLI.stats()).resolves.not.toThrow();
    });
  });

  describe("integration tests", () => {
    it("should integrate hooks with job runner", async () => {
      const hooks = createJobHooks({ defaultHooks: false });
      const testHook = vi.fn();
      hooks.hook("job:before", testHook);

      // Mock job definition
      const jobDef = {
        id: "test:integration",
        run: vi.fn().mockResolvedValue({ ok: true }),
        version: "1.0.0",
      };

      // This would require a full job runner setup, but we can test the hook integration
      expect(hooks.hookCounts.get("job:before")).toBe(1);
    });

    it("should handle cron and event jobs together", async () => {
      const daemon = new JobDaemon();

      // Test that daemon can handle both types
      expect(daemon.cronScheduler).toBeDefined();
      expect(daemon.eventRunner).toBeDefined();

      const status = daemon.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });
});
