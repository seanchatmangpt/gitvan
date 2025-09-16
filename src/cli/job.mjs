// src/cli/job.mjs
// GitVan v2 — Job CLI Commands
// Noun-verb CLI: gitvan job list|run|plan|schedule

import {
  scanJobs,
  getJobById,
  validateJobs,
  listJobs,
  getJobStats,
} from "../jobs/scan.mjs";
import { JobRunner } from "../jobs/runner.mjs";
import { loadOptions } from "../config/loader.mjs";

/**
 * Job CLI command handler
 */
export class JobCLI {
  constructor(options = {}) {
    this.options = options;
    this.config = null;
    this.runner = null;
  }

  async init() {
    this.config = await loadOptions();
    this.runner = new JobRunner({
      receiptsRef: this.config.receipts.ref,
      hooks: this.config.hooks,
    });
  }

  /**
   * List all jobs
   */
  async list(args = {}) {
    await this.init();

    const jobs = await scanJobs({ cwd: this.config.rootDir });
    const { format = "table", showMeta = false } = args;

    if (format === "json") {
      return JSON.stringify(jobs, null, 2);
    }

    const stats = getJobStats(jobs);
    const validation = validateJobs(jobs);

    if (validation.errors.length > 0) {
      console.error("Job validation errors:");
      validation.errors.forEach((error) => console.error(`  - ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.warn("Job validation warnings:");
      validation.warnings.forEach((warning) => console.warn(`  - ${warning}`));
    }

    console.log(`\nFound ${jobs.length} jobs:\n`);
    console.log(listJobs(jobs, { format, showMeta }));

    console.log(`\nStatistics:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  On-demand: ${stats.byMode["on-demand"]}`);
    console.log(`  Cron: ${stats.byMode.cron}`);
    console.log(`  Event: ${stats.byMode.event}`);
    console.log(`  Atomic: ${stats.byKind.atomic}`);
    console.log(`  Batch: ${stats.byKind.batch}`);
    console.log(`  Daemon: ${stats.byKind.daemon}`);
  }

  /**
   * Run a specific job
   */
  async run(args = {}) {
    await this.init();

    const { id, payload = {}, force = false, head = null } = args;

    if (!id) {
      throw new Error("Job ID is required");
    }

    const jobDef = await getJobById(id, { cwd: this.config.rootDir });
    if (!jobDef) {
      throw new Error(`Job not found: ${id}`);
    }

    // Check if job is already running
    const isRunning = await this.runner.isJobRunning(id);
    if (isRunning && !force) {
      const lockInfo = await this.runner.getJobLockInfo(id);
      throw new Error(
        `Job ${id} is already running (fingerprint: ${lockInfo.fingerprint})`,
      );
    }

    console.log(`Running job: ${id}`);
    if (force) {
      console.log("Force mode: bypassing lock");
    }

    try {
      const result = await this.runner.runJob(jobDef, {
        payload: typeof payload === "string" ? JSON.parse(payload) : payload,
        force,
        head,
      });

      console.log(`Job completed successfully:`);
      console.log(`  Duration: ${result.duration}ms`);
      console.log(`  Fingerprint: ${result.fingerprint}`);
      console.log(`  Artifacts: ${result.artifacts.length}`);

      if (result.artifacts.length > 0) {
        result.artifacts.forEach((artifact) => {
          console.log(`    - ${artifact}`);
        });
      }

      return result;
    } catch (error) {
      console.error(`Job failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Plan which jobs would run
   */
  async plan(args = {}) {
    await this.init();

    const { changed = false } = args;

    const jobs = await scanJobs({ cwd: this.config.rootDir });
    const cronJobs = jobs.filter((job) => job.cron);
    const eventJobs = jobs.filter((job) => job.on);
    const onDemandJobs = jobs.filter((job) => job.mode === "on-demand");

    console.log("Job execution plan:\n");

    if (changed) {
      console.log("Changed files analysis not yet implemented");
    }

    console.log("Cron jobs (would run based on schedule):");
    cronJobs.forEach((job) => {
      console.log(
        `  ${job.id} - ${job.cron} - ${job.meta?.desc || "No description"}`,
      );
    });

    console.log("\nEvent jobs (would run on matching events):");
    eventJobs.forEach((job) => {
      console.log(
        `  ${job.id} - ${JSON.stringify(job.on)} - ${job.meta?.desc || "No description"}`,
      );
    });

    console.log("\nOn-demand jobs (available for manual execution):");
    onDemandJobs.forEach((job) => {
      console.log(`  ${job.id} - ${job.meta?.desc || "No description"}`);
    });

    console.log(`\nTotal: ${jobs.length} jobs`);
  }

  /**
   * Show job details
   */
  async show(args = {}) {
    await this.init();

    const { id } = args;

    if (!id) {
      throw new Error("Job ID is required");
    }

    const jobDef = await getJobById(id, { cwd: this.config.rootDir });
    if (!jobDef) {
      throw new Error(`Job not found: ${id}`);
    }

    console.log(`Job: ${jobDef.id}`);
    console.log(`  Mode: ${jobDef.mode}`);
    console.log(`  Kind: ${jobDef.kind}`);
    console.log(`  File: ${jobDef.filePath}`);

    if (jobDef.cron) {
      console.log(`  Cron: ${jobDef.cron}`);
    }

    if (jobDef.on) {
      console.log(`  Events: ${JSON.stringify(jobDef.on, null, 2)}`);
    }

    if (jobDef.meta?.desc) {
      console.log(`  Description: ${jobDef.meta.desc}`);
    }

    if (jobDef.meta?.tags) {
      console.log(`  Tags: ${jobDef.meta.tags.join(", ")}`);
    }

    // Check lock status
    const lockInfo = await this.runner.getJobLockInfo(id);
    if (lockInfo.locked) {
      console.log(`  Status: Running (${lockInfo.fingerprint})`);
    } else {
      console.log(`  Status: Available`);
    }
  }

  /**
   * Clear job lock
   */
  async unlock(args = {}) {
    await this.init();

    const { id } = args;

    if (!id) {
      throw new Error("Job ID is required");
    }

    const lockInfo = await this.runner.getJobLockInfo(id);
    if (!lockInfo.locked) {
      console.log(`Job ${id} is not locked`);
      return;
    }

    await this.runner.clearJobLock(id);
    console.log(`Cleared lock for job: ${id}`);
  }

  /**
   * List all locks
   */
  async locks(args = {}) {
    await this.init();

    const locks = await this.runner.listJobLocks();

    if (locks.length === 0) {
      console.log("No active job locks");
      return;
    }

    console.log("Active job locks:");
    for (const lock of locks) {
      const lockInfo = await this.runner.getJobLockInfo(lock.id);
      console.log(`  ${lock.id}: ${lockInfo.fingerprint}`);
    }
  }
}

/**
 * Main job CLI entry point
 */
export async function jobCLI(command, args = {}) {
  const cli = new JobCLI();

  switch (command) {
    case "list":
      return await cli.list(args);
    case "run":
      return await cli.run(args);
    case "plan":
      return await cli.plan(args);
    case "show":
      return await cli.show(args);
    case "unlock":
      return await cli.unlock(args);
    case "locks":
      return await cli.locks(args);
    default:
      throw new Error(`Unknown job command: ${command}`);
  }
}
