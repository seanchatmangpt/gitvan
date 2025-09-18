/**
 * GitVan Hook Loader - Job-Only Architecture
 *
 * Rule set:
 * - Scope: post-commit and post-merge only (v1)
 * - ABI: jobs define hooks and execute directly
 * - Loader: one launcher executes jobs registered for specific hooks
 * - Order: jobs execute in registration order
 * - Isolation: all logic lives in jobs themselves
 */

import { createJobLoader } from "./job-loader.mjs";
import { withGitVan } from "./context.mjs";

/**
 * GitVan Hook Loader - Job-Only Architecture
 *
 * Loads and executes jobs directly for specific Git hook types:
 * 1. Load all jobs from jobs/ directory
 * 2. Find jobs registered for the specific hook
 * 3. Execute each job's run(context) function
 * 4. Happy path only - no error handling
 */
export class GitVanHookLoader {
  constructor() {
    this.projectRoot = process.cwd();
    this.jobLoader = createJobLoader();
  }

  /**
   * Load and execute jobs for a specific Git hook type
   */
  async run(gitHookName, context = {}) {
    console.log(`🔍 GitVan: Running ${gitHookName} jobs`);

    // Load all jobs first
    await this.jobLoader.loadAllJobs();

    // Get jobs registered for this hook
    const hookJobs = this.jobLoader.getJobsForHook(gitHookName);

    if (hookJobs.length === 0) {
      console.log(`   ✅ No jobs found for ${gitHookName}`);
      return;
    }

    console.log(`   📁 Found ${hookJobs.length} jobs`);

    // Execute jobs in registration order
    for (const job of hookJobs) {
      await this.executeJob(job, context);
    }

    console.log(`   ✅ All ${gitHookName} jobs completed`);
  }

  /**
   * Execute a single job
   */
  async executeJob(job, context) {
    const jobName = job.meta.name;
    console.log(`   🔧 Running job: ${jobName}`);

    try {
      // Wrap job execution in GitVan context
      await withGitVan(context, async () => {
        await job.run(context);
      });
    } catch (error) {
      console.error(`   ❌ Error in job ${jobName}:`, error.message);
      throw error;
    }
  }
}

/**
 * Create GitVan Hook Loader instance
 */
export function createGitVanHookLoader() {
  return new GitVanHookLoader();
}

export default createGitVanHookLoader;
