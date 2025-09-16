import { scanJobs, getJobById } from "../src/jobs/scan.mjs";
import { JobRunner } from "../src/jobs/runner.mjs";
import { JobDaemon } from "../src/jobs/daemon.mjs";
import { loadOptions } from "../src/config/loader.mjs";
import { createJobHooks } from "../src/jobs/hooks.mjs";

let daemon = null;
let config = null;

/**
 * Load configuration
 */
export async function loadConfig(options = {}) {
  if (!config) {
    config = await loadOptions(options);
  }
  return config;
}

/**
 * List all discovered jobs
 */
export async function list() {
  const cfg = await loadConfig();
  const jobs = await scanJobs({ cwd: cfg.rootDir });

  console.log("Discovered jobs:");
  console.log("=".repeat(50));

  if (jobs.length === 0) {
    console.log("No jobs found");
    return;
  }

  jobs.forEach((job) => {
    console.log(
      `${job.id.padEnd(20)} (${job.mode}) - ${job.meta?.desc || "No description"}`,
    );
    if (job.cron) {
      console.log(`  └─ Cron: ${job.cron}`);
    }
    if (job.on) {
      console.log(`  └─ Events: ${JSON.stringify(job.on)}`);
    }
  });

  console.log(`\nTotal: ${jobs.length} jobs`);
}

/**
 * Run a specific job
 */
export async function run(id, options = {}) {
  const cfg = await loadConfig();
  const job = await getJobById(id, { cwd: cfg.rootDir });

  if (!job) {
    throw new Error(`Job not found: ${id}`);
  }

  console.log(`Running job: ${id}`);

  const runner = new JobRunner({
    receiptsRef: cfg.receipts.ref,
    hooks: createJobHooks({ hooks: cfg.hooks }),
  });

  const result = await runner.runJob(job, {
    payload: options.payload || {},
    force: options.force || false,
  });

  console.log("Job execution result:");
  console.log(`  Status: ${result.ok ? "SUCCESS" : "FAILED"}`);
  console.log(`  Duration: ${result.duration}ms`);
  console.log(`  Fingerprint: ${result.fingerprint}`);
  console.log(`  Artifacts: ${result.artifacts.length}`);

  if (result.artifacts.length > 0) {
    console.log("  Generated files:");
    result.artifacts.forEach((artifact) => {
      console.log(`    - ${artifact}`);
    });
  }

  return result;
}

/**
 * Start the daemon
 */
export async function startDaemon() {
  if (daemon) {
    console.log("Daemon is already running");
    return;
  }

  const cfg = await loadConfig();

  daemon = new JobDaemon({
    cronTickInterval: 30000, // Check every 30 seconds for demo
    eventCheckInterval: 10000, // Check events every 10 seconds
  });

  await daemon.start();
  console.log("✅ GitVan daemon started");
}

/**
 * Stop the daemon
 */
export async function stopDaemon() {
  if (!daemon) {
    console.log("Daemon is not running");
    return;
  }

  await daemon.stop();
  daemon = null;
  console.log("✅ GitVan daemon stopped");
}

/**
 * Get daemon status
 */
export async function status() {
  if (!daemon) {
    console.log("Daemon is not running");
    return;
  }

  const status = daemon.getStatus();
  const stats = await daemon.getStats();

  console.log("GitVan Daemon Status:");
  console.log("=".repeat(30));
  console.log(`Running: ${status.isRunning}`);
  console.log(`Root: ${status.config?.rootDir}`);
  console.log(`Receipts: ${status.config?.receiptsRef}`);
  console.log(`Last commit: ${status.lastCommit || "N/A"}`);
  console.log(`Cron jobs: ${stats.cronJobs}`);
  console.log(`Event jobs: ${stats.eventJobs}`);
  console.log(`Total jobs: ${stats.totalJobs}`);
}

/**
 * Show job statistics
 */
export async function stats() {
  const cfg = await loadConfig();
  const jobs = await scanJobs({ cwd: cfg.rootDir });

  const stats = {
    total: jobs.length,
    byMode: {},
    byKind: {},
    withCron: 0,
    withEvents: 0,
  };

  jobs.forEach((job) => {
    stats.byMode[job.mode] = (stats.byMode[job.mode] || 0) + 1;
    stats.byKind[job.kind] = (stats.byKind[job.kind] || 0) + 1;
    if (job.cron) stats.withCron++;
    if (job.on) stats.withEvents++;
  });

  console.log("Job Statistics:");
  console.log("=".repeat(20));
  console.log(`Total jobs: ${stats.total}`);
  console.log(`By mode:`, stats.byMode);
  console.log(`By kind:`, stats.byKind);
  console.log(`With cron: ${stats.withCron}`);
  console.log(`With events: ${stats.withEvents}`);
}

/**
 * Show recent receipts
 */
export async function receipts() {
  const cfg = await loadConfig();
  const git = (await import("../src/composables/git.mjs")).useGit();

  try {
    const receipts = await git.noteShow(cfg.receipts.ref, "HEAD");
    console.log("Recent receipts:");
    console.log("=".repeat(20));
    console.log(receipts);
  } catch (error) {
    console.log("No receipts found");
  }
}

// Development mode: start daemon + print hints
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🚀 Starting GitVan Playground...");

  const cfg = await loadConfig({ watch: true });
  await startDaemon();

  console.log("\n📋 Available commands:");
  console.log("  npm run list         # List all jobs");
  console.log("  npm run run:changelog # Run changelog job");
  console.log("  npm run run:simple   # Run simple status job");
  console.log("  npm run run:cleanup  # Run cleanup job");
  console.log("  npm run status       # Show daemon status");
  console.log("  npm run daemon       # Start daemon only");

  console.log("\n🔧 Try these commands in another terminal:");
  console.log("  cd playground && npm run list");
  console.log("  cd playground && npm run run:changelog");
  console.log("  cat dist/CHANGELOG.md");
  console.log("  git notes --ref=refs/notes/gitvan/results show HEAD");

  // Keep process open; vite-node will live-reload on file changes
  const cleanup = async () => {
    console.log("\n🛑 Shutting down...");
    await stopDaemon();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}
