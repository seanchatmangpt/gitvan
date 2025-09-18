/**
 * GitVan Job Definition - Unified Hooks System
 *
 * Jobs now use hooks instead of events for a unified execution system:
 * - Replace `on: { push: "refs/heads/main" }` with `hooks: ["post-commit", "post-merge"]`
 * - Single execution mechanism via GitVan hooks
 * - Cleaner, more deterministic system
 */

/**
 * Define a GitVan job with hooks
 */
export function defineJob(config) {
  const { meta, hooks = [], run } = config;

  // Validate required fields
  if (!meta || !meta.name) {
    throw new Error("Job must have meta.name defined");
  }

  return {
    meta: {
      name: meta.name,
      desc: meta.desc || "",
      tags: meta.tags || [],
      version: meta.version || "1.0.0",
    },
    hooks, // Array of Git hook names: ["post-commit", "post-merge"]
    run: async (context) => {
      const startTime = Date.now();

      try {
        console.log(`🚀 Starting job: ${meta.name}`);

        // Execute the job's run function
        const result = await run(context);

        const duration = Date.now() - startTime;
        console.log(`✅ Job ${meta.name} completed in ${duration}ms`);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(
          `❌ Job ${meta.name} failed after ${duration}ms:`,
          error.message
        );
        throw error;
      }
    },
  };
}

/**
 * Job Registry - Unified Hooks System
 */
export class JobRegistry {
  constructor() {
    this.jobs = new Map();
    this.hookJobs = new Map(); // Map hook names to job names
  }

  /**
   * Register a job
   */
  register(job) {
    this.jobs.set(job.meta.name, job);

    // Handle jobs with hooks array
    if (job.hooks && Array.isArray(job.hooks)) {
      for (const hookName of job.hooks) {
        if (!this.hookJobs.has(hookName)) {
          this.hookJobs.set(hookName, []);
        }
        this.hookJobs.get(hookName).push(job.meta.name);
      }
      console.log(
        `📝 Registered job: ${job.meta.name} (hooks: ${job.hooks.join(", ")})`
      );
    } else {
      // Jobs without hooks are registered but not mapped to any hooks
      console.log(`📝 Registered job: ${job.meta.name} (no hooks defined)`);
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
}

/**
 * Create job registry instance
 */
export const jobRegistry = new JobRegistry();

export default defineJob;
