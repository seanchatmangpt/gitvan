/**
 * GitVan Job Loader - Unified Hooks System
 *
 * Automatically loads and registers jobs from the jobs/ directory
 * with the unified hooks system
 */

import { readdir } from "node:fs/promises";
import { join, extname } from "path";
import { jobRegistry } from "./job-registry.mjs";

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
    console.log("🔍 GitVan: Loading jobs for unified hooks system");

    try {
      // Find all job files using readdir
      const files = await readdir(this.jobsDir);
      const jobFiles = files
        .filter(file => extname(file) === '.mjs')
        .map(file => join(this.jobsDir, file));
      
      console.log(`   📁 Found ${jobFiles.length} job files`);
      
      if (jobFiles.length === 0) {
        console.log("   ✅ No job files found");
        return;
      }

      // Load and register each job
      for (const jobFile of jobFiles) {
        await this.loadJob(jobFile);
      }

      console.log(`   ✅ Loaded ${jobRegistry.getAllJobs().length} jobs`);

      // Show hook-to-job mapping
      this.showHookMapping();
    } catch (error) {
      console.error("❌ Error loading jobs:", error.message);
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
        console.warn(`   ⚠️  ${jobFile} is not a valid job`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Could not load job ${jobFile}:`, error.message);
    }
  }

  /**
   * Show hook-to-job mapping
   */
  showHookMapping() {
    const hooks = ["post-commit", "post-merge"];

    console.log("\n   🎯 Hook-to-Job Mapping:");
    for (const hook of hooks) {
      const jobs = jobRegistry.getJobsForHook(hook);
      if (jobs.length > 0) {
        console.log(`   - ${hook}: ${jobs.map((j) => j.meta.name).join(", ")}`);
      } else {
        console.log(`   - ${hook}: (no jobs registered)`);
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
