import { createLogger } from "../utils/logger.mjs";
import { z } from "zod";
const logger = createLogger("core:job-registry");

/**
 * GitVan Job Definition - Unified Hooks System
 *
 * Jobs now use hooks instead of events for a unified execution system:
 * - Replace `on: { push: "refs/heads/main" }` with `hooks: ["post-commit", "post-merge"]`
 * - Single execution mechanism via GitVan hooks
 * - Cleaner, more deterministic system
 *
 * @deprecated v4.0.0
 *
 * DEPRECATION NOTICE: JobRegistry will be replaced in v5.0.0
 * with @unrdf/hooks integration and RDF-backed git-native storage.
 *
 * Current status: Uses defineJob function with in-memory hooks registry.
 * Planned replacement: SPARQL queries over git-native RDF storage.
 *
 * For migration details, see: docs/HOOKS_MIGRATION_STRATEGY.md
 *
 * Migration timeline:
 * - v4.1: Job system refactored to use @unrdf/hooks foundations
 * - v4.2: SPARQL queries replace Map-based lookups
 * - v5.0: Full replacement with git-native RDF storage
 */

// Job definition schema - supports both flat and meta-based job definitions
const JobDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  environment: z.object({
    node: z.string().optional(),
    npm: z.string().optional(),
    git: z.string().optional(),
  }).optional(),
  hooks: z.union([
    z.array(z.string()), // Git hook names: ["post-commit", "post-merge"]
    z.array(z.object({
      event: z.string(),
      handler: z.function(),
    })),
  ]).optional(),
  run: z.function(),
  validate: z.function().optional(),
  cleanup: z.function().optional(),
});

/**
 * Define a GitVan job with validation and registration
 *
 * Supports both legacy and modern job definitions:
 * - Legacy: { meta: { name, ... }, hooks: [...], run: fn }
 * - Modern: { name, description, hooks: [...], run: fn }
 */
export function defineJob(config) {
  // NOTE: jobRegistry is defined below, this function is called after
  // the global jobRegistry singleton is created
  try {
    // Normalize job config to modern format
    const normalized = normalizeJobConfig(config);

    // Validate the job definition
    const validatedDefinition = JobDefinitionSchema.parse(normalized);

    // Create job object
    const jobObject = createJobObject(validatedDefinition);

    // Register with the global jobRegistry singleton
    if (typeof jobRegistry?.register === 'function') {
      jobRegistry.register(jobObject);
    }

    logger.info(`✅ Job '${validatedDefinition.name}' defined and registered`);

    return jobObject;
  } catch (error) {
    logger.error(`❌ Failed to define job: ${error.message}`);
    throw new Error(`Invalid job definition: ${error.message}`);
  }
}

/**
 * Normalize job config from both legacy and modern formats
 * @private
 */
function normalizeJobConfig(config) {
  // If config has meta object (legacy format)
  if (config.meta && config.meta.name) {
    return {
      name: config.meta.name,
      description: config.meta.desc,
      version: config.meta.version,
      tags: config.meta.tags,
      hooks: config.hooks || [],
      run: config.run,
      validate: config.validate,
      cleanup: config.cleanup,
    };
  }

  // Modern format - return as-is
  return config;
}

/**
 * Create a job object with execution wrapper
 * @private
 */
function createJobObject(definition) {
  return {
    meta: {
      name: definition.name,
      desc: definition.description || "",
      tags: definition.tags || [],
      version: definition.version || "1.0.0",
      author: definition.author || "",
      dependencies: definition.dependencies || [],
    },
    hooks: definition.hooks || [],
    run: async (context) => {
      const startTime = Date.now();

      try {
        logger.info(`🚀 Starting job: ${definition.name}`);

        // Execute the job's run function
        const result = await definition.run(context);

        const duration = Date.now() - startTime;
        logger.info(`✅ Job ${definition.name} completed in ${duration}ms`);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
          `❌ Job ${definition.name} failed after ${duration}ms:`,
          error.message
        );
        throw error;
      }
    },
    validate: definition.validate,
    cleanup: definition.cleanup,
  };
}

/**
 * Job Registry - Unified Hooks System
 *
 * Central registry for managing job definitions and their hook associations.
 * Maintains bidirectional mapping between jobs and hooks for efficient lookup.
 */
export class JobRegistry {
  constructor() {
    this.jobs = new Map(); // job name → job object
    this.hookJobs = new Map(); // hook name → [job names]
  }

  /**
   * Register a job
   *
   * Supports both:
   * - Job objects created by defineJob() (with meta.name)
   * - Custom job objects (with meta.name)
   */
  register(job) {
    if (!job || !job.meta || !job.meta.name) {
      throw new Error("Job must have meta.name defined");
    }

    this.jobs.set(job.meta.name, job);

    // Map hooks to job for efficient lookup
    if (job.hooks && Array.isArray(job.hooks)) {
      // Filter out non-string hook names (ignore {event, handler} objects)
      const hookNames = job.hooks.filter(h => typeof h === 'string');

      for (const hookName of hookNames) {
        if (!this.hookJobs.has(hookName)) {
          this.hookJobs.set(hookName, []);
        }
        this.hookJobs.get(hookName).push(job.meta.name);
      }

      if (hookNames.length > 0) {
        logger.info(
          `📝 Registered job: ${job.meta.name} (hooks: ${hookNames.join(", ")})`
        );
      } else {
        logger.info(`📝 Registered job: ${job.meta.name} (no hooks defined)`);
      }
    } else {
      // Jobs without hooks are registered but not mapped to any hooks
      logger.info(`📝 Registered job: ${job.meta.name} (no hooks defined)`);
    }
  }

  /**
   * Get jobs for a specific hook
   */
  getJobsForHook(hookName) {
    const jobNames = this.hookJobs.get(hookName) || [];
    return jobNames.map((name) => this.jobs.get(name)).filter(Boolean);
  }

  /**
   * Get all jobs
   */
  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job by name
   */
  getJob(name) {
    return this.jobs.get(name);
  }

  /**
   * Check if job exists
   */
  hasJob(name) {
    return this.jobs.has(name);
  }

  /**
   * Remove job from registry
   */
  removeJob(name) {
    const job = this.jobs.get(name);
    if (!job) return false;

    // Remove from hook mappings
    if (job.hooks && Array.isArray(job.hooks)) {
      for (const hookName of job.hooks) {
        if (typeof hookName === 'string') {
          const jobs = this.hookJobs.get(hookName) || [];
          const idx = jobs.indexOf(name);
          if (idx >= 0) {
            jobs.splice(idx, 1);
          }
        }
      }
    }

    // Remove job
    this.jobs.delete(name);
    logger.info(`📝 Removed job: ${name}`);
    return true;
  }

  /**
   * Clear all jobs from registry
   */
  clearJobs() {
    this.jobs.clear();
    this.hookJobs.clear();
    logger.info("📝 Cleared all jobs from registry");
  }

  /**
   * Get registry statistics
   */
  getJobStats() {
    return {
      totalJobs: this.jobs.size,
      jobNames: Array.from(this.jobs.keys()),
    };
  }
}

/**
 * Global job registry singleton
 */
export const jobRegistry = new JobRegistry();

/**
 * Get a job by name from registry singleton
 */
export function getJob(name) {
  return jobRegistry?.getJob(name) || null;
}

/**
 * List all registered jobs from registry singleton
 */
export function listJobs() {
  return jobRegistry?.getAllJobs() || [];
}

/**
 * Check if a job exists in registry singleton
 */
export function hasJob(name) {
  return jobRegistry?.hasJob(name) || false;
}

/**
 * Remove a job from registry singleton
 */
export function removeJob(name) {
  return jobRegistry?.removeJob(name) || false;
}

/**
 * Clear all jobs from registry singleton
 */
export function clearJobs() {
  jobRegistry?.clearJobs();
}

/**
 * Get job registry statistics
 */
export function getJobStats() {
  return jobRegistry?.getJobStats() || {
    totalJobs: 0,
    jobNames: [],
  };
}

export default defineJob;
