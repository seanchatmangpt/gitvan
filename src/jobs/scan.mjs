// src/jobs/scan.mjs
// GitVan v2 — Job Discovery and Scanning
// Discovers job files and creates job definitions

import { promises as fs } from "node:fs";
import { join, relative, resolve } from "pathe";
import { glob } from "tinyglobby";
import { createJobDefinition } from "./define.mjs";

/**
 * Default job file patterns
 */
const DEFAULT_PATTERNS = ["jobs/**/*.mjs", "jobs/**/*.js", "jobs/**/*.ts"];

/**
 * Job discovery options
 */
const DEFAULT_OPTIONS = {
  patterns: DEFAULT_PATTERNS,
  jobsDir: "jobs",
  cwd: process.cwd(),
  ignore: ["**/node_modules/**", "**/.git/**"],
};

/**
 * Scan for job files and create definitions
 * @param {Object} options - Scanning options
 * @returns {Promise<Object[]>} Array of job definitions
 */
export async function scanJobs(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const jobs = [];

  try {
    // Find all job files
    const files = await glob(opts.patterns, {
      cwd: opts.cwd,
      ignore: opts.ignore,
      absolute: true,
    });

    // Process each file
    for (const filePath of files) {
      try {
        const jobDef = await loadJobFromFile(filePath, opts);
        if (jobDef) {
          jobs.push(jobDef);
        }
      } catch (error) {
        console.warn(`Failed to load job from ${filePath}:`, error.message);
      }
    }

    // Sort by ID for consistent ordering
    jobs.sort((a, b) => a.id.localeCompare(b.id));

    return jobs;
  } catch (error) {
    throw new Error(`Job scanning failed: ${error.message}`);
  }
}

/**
 * Load a single job from a file
 * @param {string} filePath - Full path to job file
 * @param {Object} options - Loading options
 * @returns {Promise<Object|null>} Job definition or null if invalid
 */
async function loadJobFromFile(filePath, options) {
  try {
    // Dynamic import the job file
    const module = await import(filePath);

    if (!module.default) {
      throw new Error("Job file must export a default definition");
    }

    const definition = module.default;

    if (typeof definition !== "object" || definition === null) {
      throw new Error("Job definition must be an object");
    }

    if (typeof definition.run !== "function") {
      throw new Error("Job definition must have a run function");
    }

    // Create job definition with inferred properties
    const jobDef = createJobDefinition(definition, filePath, options.jobsDir);

    return jobDef;
  } catch (error) {
    throw new Error(`Failed to load job from ${filePath}: ${error.message}`);
  }
}

/**
 * Get job by ID
 * @param {string} id - Job ID
 * @param {Object} options - Scanning options
 * @returns {Promise<Object|null>} Job definition or null if not found
 */
export async function getJobById(id, options = {}) {
  const jobs = await scanJobs(options);
  return jobs.find((job) => job.id === id) || null;
}

/**
 * Get jobs by mode
 * @param {string} mode - Job mode (on-demand, cron, event)
 * @param {Object} options - Scanning options
 * @returns {Promise<Object[]>} Array of job definitions
 */
export async function getJobsByMode(mode, options = {}) {
  const jobs = await scanJobs(options);
  return jobs.filter((job) => job.mode === mode);
}

/**
 * Get jobs with cron schedules
 * @param {Object} options - Scanning options
 * @returns {Promise<Object[]>} Array of cron job definitions
 */
export async function getCronJobs(options = {}) {
  const jobs = await scanJobs(options);
  return jobs.filter((job) => job.cron);
}

/**
 * Get event-driven jobs
 * @param {Object} options - Scanning options
 * @returns {Promise<Object[]>} Array of event job definitions
 */
export async function getEventJobs(options = {}) {
  const jobs = await scanJobs(options);
  return jobs.filter((job) => job.on);
}

/**
 * Validate job definitions
 * @param {Object[]} jobs - Array of job definitions
 * @returns {Object} Validation result
 */
export function validateJobs(jobs) {
  const errors = [];
  const warnings = [];
  const ids = new Set();

  for (const job of jobs) {
    // Check for duplicate IDs
    if (ids.has(job.id)) {
      errors.push(`Duplicate job ID: ${job.id}`);
    }
    ids.add(job.id);

    // Check for required fields
    if (!job.id) {
      errors.push(`Job missing ID: ${job.filePath}`);
    }

    if (!job.run || typeof job.run !== "function") {
      errors.push(`Job missing run function: ${job.id}`);
    }

    // Check mode consistency
    if (job.mode === "cron" && !job.cron) {
      warnings.push(`Cron job missing cron expression: ${job.id}`);
    }

    if (job.mode === "event" && !job.on) {
      warnings.push(`Event job missing event predicates: ${job.id}`);
    }

    // Check for conflicting modes
    if (job.cron && job.on) {
      warnings.push(`Job has both cron and event triggers: ${job.id}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    count: jobs.length,
  };
}

/**
 * Get job statistics
 * @param {Object[]} jobs - Array of job definitions
 * @returns {Object} Job statistics
 */
export function getJobStats(jobs) {
  const stats = {
    total: jobs.length,
    byMode: {
      "on-demand": 0,
      cron: 0,
      event: 0,
    },
    byKind: {
      atomic: 0,
      batch: 0,
      daemon: 0,
    },
    withCron: 0,
    withEvents: 0,
    withMeta: 0,
  };

  for (const job of jobs) {
    stats.byMode[job.mode]++;
    stats.byKind[job.kind]++;

    if (job.cron) stats.withCron++;
    if (job.on) stats.withEvents++;
    if (job.meta && Object.keys(job.meta).length > 0) stats.withMeta++;
  }

  return stats;
}

/**
 * List jobs in a formatted way
 * @param {Object[]} jobs - Array of job definitions
 * @param {Object} options - Formatting options
 * @returns {string} Formatted job list
 */
export function listJobs(jobs, options = {}) {
  const { format = "table", showMeta = false } = options;

  if (format === "json") {
    return JSON.stringify(jobs, null, 2);
  }

  if (format === "table") {
    const lines = [];
    lines.push(
      "ID".padEnd(20) +
        "MODE".padEnd(12) +
        "KIND".padEnd(8) +
        "CRON".padEnd(15) +
        "DESCRIPTION",
    );
    lines.push("-".repeat(80));

    for (const job of jobs) {
      const id = job.id.padEnd(20);
      const mode = job.mode.padEnd(12);
      const kind = job.kind.padEnd(8);
      const cron = (job.cron || "").padEnd(15);
      const desc = job.meta?.desc || "";

      lines.push(`${id}${mode}${kind}${cron}${desc}`);
    }

    return lines.join("\n");
  }

  if (format === "simple") {
    return jobs.map((job) => `${job.id} (${job.mode})`).join("\n");
  }

  throw new Error(`Unknown format: ${format}`);
}
