/**
 * GitVan Job Loader - Unified Hooks System
 *
 * Automatically loads and registers jobs from the jobs/ directory
 * with the unified hooks system
 */

import { readdir } from "node:fs/promises";
import { join, extname } from "path";
import { jobRegistry } from "./job-registry.mjs";
import { createLogger } from "../utils/logger.mjs";
const logger = createLogger("core:job-loader");

/**
 * Job Loader - Unified Hooks System
 */
export class JobLoader {
  constructor() {
    this.projectRoot = process.cwd();
    this.jobsDir = join(this.projectRoot, "jobs");
  }

  /**
   * Load all jobs and register them with the unified hooks system
   */
  async loadAllJobs() {
    logger.info("🔍 GitVan: Loading jobs for unified hooks system");

    try {
      // Find all job files using readdir
      const files = await readdir(this.jobsDir);
      const jobFiles = files
        .filter((file) => extname(file) === ".mjs")
        .map((file) => join(this.jobsDir, file));

      logger.info(`   📁 Found ${jobFiles.length} job files`);

      if (jobFiles.length === 0) {
        logger.info("   ✅ No job files found");
        return;
      }

      // Load and register each job
      for (const jobFile of jobFiles) {
        await this.loadJob(jobFile);
      }

      logger.info(`   ✅ Loaded ${jobRegistry.getAllJobs().length} jobs`);

      // Show hook-to-job mapping
      this.showHookMapping();
    } catch (error) {
      logger.error("❌ Error loading jobs:", error.message);
      throw error;
    }
  }

  /**
   * Load a single job file
   */
  async loadJob(jobFile) {
    try {
      const jobModule = await import(`file://${jobFile}`);
      const job = jobModule.default;

      if (job && typeof job.run === "function") {
        jobRegistry.register(job);
      } else {
        logger.warn(`   ⚠️  ${jobFile} is not a valid job`);
      }
    } catch (error) {
      logger.warn(`   ⚠️  Could not load job ${jobFile}:`, error.message);
    }
  }

  /**
   * Show hook-to-job mapping
   */
  showHookMapping() {
    const hooks = ["post-commit", "post-merge"];

    logger.info("\n   🎯 Hook-to-Job Mapping:");
    for (const hook of hooks) {
      const jobs = jobRegistry.getJobsForHook(hook);
      if (jobs.length > 0) {
        logger.info(`   - ${hook}: ${jobs.map((j) => j.meta.name).join(", ")}`);
      } else {
        logger.info(`   - ${hook}: (no jobs registered)`);
      }
    }
  }

  /**
   * Get jobs for a specific hook
   */
  getJobsForHook(hookName) {
    return jobRegistry.getJobsForHook(hookName);
  }

  /**
   * Get all jobs
   */
  getAllJobs() {
    return jobRegistry.getAllJobs();
  }
}

/**
 * Create job loader instance
 */
export function createJobLoader() {
  return new JobLoader();
}

export default createJobLoader;
