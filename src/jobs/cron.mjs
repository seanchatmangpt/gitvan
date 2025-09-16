// src/jobs/cron.mjs
// GitVan v2 — Cron Scheduler
// Lightweight cron scheduler for job execution

import { getCronJobs } from "./scan.mjs";
import { JobRunner } from "./runner.mjs";
import { loadOptions } from "../config/loader.mjs";

/**
 * Simple cron parser and scheduler
 */
export class CronScheduler {
  constructor(options = {}) {
    this.options = options;
    this.config = null;
    this.runner = null;
    this.schedule = new Map(); // Map of cron expressions to job definitions
    this.timers = new Map(); // Map of cron expressions to timer IDs
    this.isRunning = false;
    this.tickInterval = options.tickInterval || 60000; // Check every minute
    this.tickTimer = null;
  }

  async init() {
    this.config = await loadOptions();
    this.runner = new JobRunner({
      receiptsRef: this.config.receipts.ref,
      hooks: this.config.hooks,
    });
  }

  /**
   * Parse cron expression into next execution time
   * Supports basic 5-field cron: minute hour day month weekday
   */
  parseCron(cronExpr) {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(
        `Invalid cron expression: ${cronExpr} (expected 5 fields)`,
      );
    }

    const [minute, hour, day, month, weekday] = parts;

    return {
      minute: this.parseField(minute, 0, 59),
      hour: this.parseField(hour, 0, 23),
      day: this.parseField(day, 1, 31),
      month: this.parseField(month, 1, 12),
      weekday: this.parseField(weekday, 0, 6), // 0 = Sunday
    };
  }

  /**
   * Parse a single cron field (minute, hour, etc.)
   */
  parseField(field, min, max) {
    if (field === "*") {
      return null; // Any value
    }

    if (field.includes(",")) {
      // Comma-separated values
      return field.split(",").map((v) => parseInt(v.trim(), 10));
    }

    if (field.includes("-")) {
      // Range
      const [start, end] = field.split("-").map((v) => parseInt(v.trim(), 10));
      return { start, end };
    }

    if (field.includes("/")) {
      // Step values
      const [base, step] = field.split("/").map((v) => v.trim());
      const baseValue = base === "*" ? min : parseInt(base, 10);
      const stepValue = parseInt(step, 10);
      return { base: baseValue, step: stepValue };
    }

    // Single value
    const value = parseInt(field, 10);
    if (isNaN(value) || value < min || value > max) {
      throw new Error(`Invalid cron field: ${field} (must be ${min}-${max})`);
    }
    return value;
  }

  /**
   * Check if a cron expression matches the current time
   */
  matchesCron(cronSpec, now = new Date()) {
    const minute = now.getMinutes();
    const hour = now.getHours();
    const day = now.getDate();
    const month = now.getMonth() + 1; // JavaScript months are 0-based
    const weekday = now.getDay();

    return (
      this.matchesField(cronSpec.minute, minute) &&
      this.matchesField(cronSpec.hour, hour) &&
      this.matchesField(cronSpec.day, day) &&
      this.matchesField(cronSpec.month, month) &&
      this.matchesField(cronSpec.weekday, weekday)
    );
  }

  /**
   * Check if a field value matches the cron specification
   */
  matchesField(spec, value) {
    if (spec === null) return true; // "*" matches any value
    if (typeof spec === "number") return spec === value;
    if (Array.isArray(spec)) return spec.includes(value);
    if (typeof spec === "object") {
      if (spec.start !== undefined && spec.end !== undefined) {
        return value >= spec.start && value <= spec.end;
      }
      if (spec.base !== undefined && spec.step !== undefined) {
        return (value - spec.base) % spec.step === 0 && value >= spec.base;
      }
    }
    return false;
  }

  /**
   * Calculate next execution time for a cron expression
   */
  getNextExecution(cronSpec, from = new Date()) {
    const next = new Date(from);
    next.setSeconds(0, 0); // Reset seconds and milliseconds

    // Try every minute for the next 24 hours
    for (let i = 0; i < 24 * 60; i++) {
      if (this.matchesCron(cronSpec, next)) {
        return next;
      }
      next.setMinutes(next.getMinutes() + 1);
    }

    // If no match found in 24 hours, return null
    return null;
  }

  /**
   * Load cron jobs and build schedule
   */
  async loadSchedule() {
    await this.init();
    const cronJobs = await getCronJobs({ cwd: this.config.rootDir });

    this.schedule.clear();

    for (const job of cronJobs) {
      try {
        const cronSpec = this.parseCron(job.cron);
        this.schedule.set(job.cron, { job, spec: cronSpec });
      } catch (error) {
        console.warn(
          `Invalid cron expression for job ${job.id}: ${job.cron}`,
          error.message,
        );
      }
    }

    console.log(`Loaded ${this.schedule.size} cron jobs`);
  }

  /**
   * Check for jobs that should run now
   */
  async checkAndRunJobs() {
    const now = new Date();
    const jobsToRun = [];

    for (const [cronExpr, { job, spec }] of this.schedule) {
      if (this.matchesCron(spec, now)) {
        jobsToRun.push(job);
      }
    }

    if (jobsToRun.length === 0) {
      return;
    }

    console.log(
      `Running ${jobsToRun.length} scheduled jobs at ${now.toISOString()}`,
    );

    // Run jobs in parallel
    const promises = jobsToRun.map(async (job) => {
      try {
        const result = await this.runner.runJob(job, {
          trigger: {
            kind: "cron",
            fingerprint: `cron-${now.getTime()}`,
            data: { cronExpr: job.cron, scheduledAt: now.toISOString() },
          },
        });
        console.log(`✅ Cron job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        console.error(`❌ Cron job ${job.id} failed:`, error.message);
        throw error;
      }
    });

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error("Some cron jobs failed:", error.message);
    }
  }

  /**
   * Start the cron scheduler
   */
  async start() {
    if (this.isRunning) {
      console.warn("Cron scheduler is already running");
      return;
    }

    await this.loadSchedule();

    this.isRunning = true;
    console.log("Starting cron scheduler...");

    // Run initial check
    await this.checkAndRunJobs();

    // Set up periodic checks
    this.tickTimer = setInterval(async () => {
      try {
        await this.checkAndRunJobs();
      } catch (error) {
        console.error("Cron scheduler error:", error.message);
      }
    }, this.tickInterval);

    console.log(
      `Cron scheduler started (checking every ${this.tickInterval / 1000}s)`,
    );
  }

  /**
   * Stop the cron scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.warn("Cron scheduler is not running");
      return;
    }

    this.isRunning = false;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    console.log("Cron scheduler stopped");
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduleSize: this.schedule.size,
      tickInterval: this.tickInterval,
      nextCheck: this.isRunning
        ? new Date(Date.now() + this.tickInterval)
        : null,
    };
  }

  /**
   * List scheduled jobs with next execution times
   */
  listSchedule() {
    const schedule = [];

    for (const [cronExpr, { job, spec }] of this.schedule) {
      const nextExecution = this.getNextExecution(spec);
      schedule.push({
        id: job.id,
        cron: cronExpr,
        nextExecution: nextExecution?.toISOString() || "No upcoming execution",
        description: job.meta?.desc || "No description",
      });
    }

    return schedule.sort((a, b) => {
      if (a.nextExecution === "No upcoming execution") return 1;
      if (b.nextExecution === "No upcoming execution") return -1;
      return new Date(a.nextExecution) - new Date(b.nextExecution);
    });
  }

  /**
   * Dry run: show what would run at a specific time
   */
  dryRun(at = new Date()) {
    const jobsToRun = [];

    for (const [cronExpr, { job, spec }] of this.schedule) {
      if (this.matchesCron(spec, at)) {
        jobsToRun.push({
          id: job.id,
          cron: cronExpr,
          description: job.meta?.desc || "No description",
        });
      }
    }

    return {
      at: at.toISOString(),
      jobsToRun,
      totalJobs: jobsToRun.length,
    };
  }
}

/**
 * Create and start a cron scheduler
 */
export async function startCronScheduler(options = {}) {
  const scheduler = new CronScheduler(options);
  await scheduler.start();
  return scheduler;
}

/**
 * CLI command for cron operations
 */
export class CronCLI {
  constructor() {
    this.scheduler = null;
  }

  async init() {
    this.scheduler = new CronScheduler();
    await this.scheduler.init();
  }

  /**
   * List cron schedule
   */
  async list() {
    await this.init();
    await this.scheduler.loadSchedule();

    const schedule = this.scheduler.listSchedule();

    if (schedule.length === 0) {
      console.log("No cron jobs scheduled");
      return;
    }

    console.log("Cron Schedule:");
    console.log(
      "ID".padEnd(20) +
        "CRON".padEnd(20) +
        "NEXT EXECUTION".padEnd(25) +
        "DESCRIPTION",
    );
    console.log("-".repeat(80));

    for (const item of schedule) {
      const id = item.id.padEnd(20);
      const cron = item.cron.padEnd(20);
      const next = item.nextExecution.padEnd(25);
      const desc = item.description;
      console.log(`${id}${cron}${next}${desc}`);
    }
  }

  /**
   * Dry run cron jobs
   */
  async dryRun(at) {
    await this.init();
    await this.scheduler.loadSchedule();

    const targetTime = at ? new Date(at) : new Date();
    const result = this.scheduler.dryRun(targetTime);

    console.log(`Cron dry run at ${result.at}:`);

    if (result.jobsToRun.length === 0) {
      console.log("No jobs would run at this time");
      return;
    }

    console.log(`Would run ${result.totalJobs} jobs:`);
    result.jobsToRun.forEach((job) => {
      console.log(`  - ${job.id} (${job.cron}) - ${job.description}`);
    });
  }

  /**
   * Start cron scheduler
   */
  async start() {
    await this.init();
    await this.scheduler.start();

    // Keep the process alive
    process.on("SIGINT", () => {
      console.log("\nShutting down cron scheduler...");
      this.scheduler.stop();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\nShutting down cron scheduler...");
      this.scheduler.stop();
      process.exit(0);
    });
  }
}
