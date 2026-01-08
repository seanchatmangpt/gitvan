/**
 * GitVan - Job Discovery Composable
 * Provides job discovery and querying functionality
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import { discoverJobs, loadJobDefinition } from "../runtime/jobs.mjs";
import { createLogger } from "../utils/logger.mjs";
import {
  unrouteJobId,
  getJobDirectory,
  isJobInDirectory,
} from "../utils/unrouting.mjs";

const logger = createLogger("composables:job-discovery");

/**
 * Create job discovery composable
 * @param {Object} base - Base context (cwd, env)
 * @returns {Object} Job discovery methods
 */
export function createJobDiscovery(base) {
  return {
    /**
     * List all available jobs
     * @param {Object} options - List options
     * @returns {Promise<Array>} List of jobs
     */
    async list(options = {}) {
      const { includeMetadata = true, filter = {} } = options;

      try {
        const jobsDir = join(base.cwd, "jobs");
        if (!existsSync(jobsDir)) {
          return [];
        }

        const jobInfos = discoverJobs(jobsDir);
        const jobs = [];

        for (const jobInfo of jobInfos) {
          try {
            const jobDef = await loadJobDefinition(jobInfo.file);
            if (jobDef) {
              const job = {
                id: jobInfo.id,
                name: jobDef.meta?.name || jobInfo.id,
                description: jobDef.meta?.desc || "No description",
                tags: jobDef.meta?.tags || [],
                cron: jobDef.cron,
                file: jobInfo.file,
                ...(includeMetadata ? { metadata: jobDef.meta } : {}),
              };

              // Apply filters
              if (filter.tags && filter.tags.length > 0) {
                if (!filter.tags.some((tag) => job.tags.includes(tag))) {
                  continue;
                }
              }

              if (filter.name && !job.name.includes(filter.name)) {
                continue;
              }

              jobs.push(job);
            }
          } catch (error) {
            logger.warn(`Failed to load job ${jobInfo.id}:`, error.message);
          }
        }

        return jobs;
      } catch (error) {
        throw new Error(`Failed to list jobs: ${error.message}`);
      }
    },

    /**
     * Get a specific job by ID
     * @param {string} jobId - Job ID
     * @returns {Promise<Object>} Job definition
     */
    async get(jobId) {
      try {
        const jobs = await this.list();
        const job = jobs.find((j) => j.id === jobId || j.name === jobId);

        if (!job) {
          throw new Error(`Job not found: ${jobId}`);
        }

        // Load full job definition
        const jobDef = await loadJobDefinition(job.file);
        return {
          ...job,
          definition: jobDef,
        };
      } catch (error) {
        throw new Error(`Failed to get job ${jobId}: ${error.message}`);
      }
    },

    /**
     * Check if a job exists
     * @param {string} jobId - Job ID
     * @returns {Promise<boolean>} True if job exists
     */
    async exists(jobId) {
      try {
        await this.get(jobId);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Search jobs by query
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Matching jobs
     */
    async search(query, options = {}) {
      const { fields = ["name", "description", "tags"] } = options;

      try {
        const jobs = await this.list();
        const results = [];

        for (const job of jobs) {
          let matches = false;

          for (const field of fields) {
            if (field === "tags") {
              if (
                job.tags.some((tag) =>
                  tag.toLowerCase().includes(query.toLowerCase())
                )
              ) {
                matches = true;
                break;
              }
            } else if (
              job[field] &&
              job[field].toLowerCase().includes(query.toLowerCase())
            ) {
              matches = true;
              break;
            }
          }

          if (matches) {
            results.push(job);
          }
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to search jobs: ${error.message}`);
      }
    },

    /**
     * Get jobs by tag
     * @param {string} tag - Tag to filter by
     * @returns {Promise<Array>} Jobs with tag
     */
    async getByTag(tag) {
      try {
        const jobs = await this.list();
        return jobs.filter((job) => job.tags.includes(tag));
      } catch (error) {
        throw new Error(`Failed to get jobs by tag ${tag}: ${error.message}`);
      }
    },

    /**
     * Get all cron jobs
     * @returns {Promise<Array>} Jobs with cron schedules
     */
    async getCronJobs() {
      try {
        const jobs = await this.list();
        return jobs.filter((job) => job.cron);
      } catch (error) {
        throw new Error(`Failed to get cron jobs: ${error.message}`);
      }
    },

    /**
     * List jobs with unrouted names
     * @param {Object} options - List options
     * @returns {Promise<Array>} Jobs with unrouted metadata
     */
    async listUnrouted(options = {}) {
      try {
        const jobs = await this.list(options);
        return jobs.map((job) => ({
          ...job,
          unroutedName: unrouteJobId(job.id),
          directory: getJobDirectory(job.id),
        }));
      } catch (error) {
        throw new Error(`Failed to list unrouted jobs: ${error.message}`);
      }
    },

    /**
     * Get job by unrouted name
     * @param {string} unroutedName - Unrouted name
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Job with unrouted metadata
     */
    async getByUnroutedName(unroutedName, options = {}) {
      try {
        const jobs = await this.list(options);
        const job = jobs.find((j) => unrouteJobId(j.id) === unroutedName);

        if (!job) {
          throw new Error(`Job not found with unrouted name: ${unroutedName}`);
        }

        return {
          ...job,
          unroutedName: unrouteJobId(job.id),
          directory: getJobDirectory(job.id),
        };
      } catch (error) {
        throw new Error(
          `Failed to get job by unrouted name ${unroutedName}: ${error.message}`
        );
      }
    },

    /**
     * Get jobs in a directory
     * @param {string} directory - Directory path
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Jobs in directory
     */
    async getByDirectory(directory, options = {}) {
      try {
        const jobs = await this.list(options);
        return jobs
          .filter((job) => isJobInDirectory(job.id, directory))
          .map((job) => ({
            ...job,
            unroutedName: unrouteJobId(job.id),
            directory: getJobDirectory(job.id),
          }));
      } catch (error) {
        throw new Error(
          `Failed to get jobs by directory ${directory}: ${error.message}`
        );
      }
    },
  };
}
