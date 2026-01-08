/**
 * GitVan - Job Utilities Composable
 * Provides helper utilities and unrouting functionality
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  unrouteJobId,
  getJobDirectory,
  isJobInDirectory,
  unrouteAll,
  createUnrouteMapping,
} from "../utils/unrouting.mjs";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("composables:job-utilities");

/**
 * Create job utilities composable
 * @param {Object} deps - Dependencies (git, discovery)
 * @returns {Object} Job utility methods
 */
export function createJobUtilities(deps) {
  const { git, discovery } = deps;

  return {
    /**
     * Create job execution context
     * @param {string} jobId - Job ID
     * @param {Object} options - Context options
     * @returns {Promise<Object>} Job execution context
     */
    async createContext(jobId, options = {}) {
      const { payload = {}, additionalContext = {} } = options;

      try {
        const gitInfo = await git.info();
        const jobDef = await discovery.get(jobId);

        return {
          job: {
            id: jobId,
            name: jobDef.name,
            description: jobDef.description,
            tags: jobDef.tags,
          },
          git: gitInfo,
          payload,
          timestamp: new Date().toISOString(),
          ...additionalContext,
        };
      } catch (error) {
        throw new Error(
          `Failed to create job context for ${jobId}: ${error.message}`
        );
      }
    },

    /**
     * Get job fingerprint (hash of job file)
     * @param {string} jobId - Job ID
     * @returns {Promise<string>} Job fingerprint
     */
    async getFingerprint(jobId) {
      try {
        const jobDef = await discovery.get(jobId);
        const content = readFileSync(jobDef.file, "utf8");

        return createHash("sha256").update(content).digest("hex").slice(0, 16);
      } catch (error) {
        throw new Error(
          `Failed to get job fingerprint for ${jobId}: ${error.message}`
        );
      }
    },

    /**
     * Unroute a job ID (convert to filename-safe format)
     * @param {string} jobId - Job ID
     * @returns {string} Unrouted job ID
     */
    unroute(jobId) {
      return unrouteJobId(jobId);
    },

    /**
     * Get directory from job ID
     * @param {string} jobId - Job ID
     * @returns {string} Directory path
     */
    getDirectory(jobId) {
      return getJobDirectory(jobId);
    },

    /**
     * Check if job is in directory
     * @param {string} jobId - Job ID
     * @param {string} directory - Directory path
     * @returns {boolean} True if job is in directory
     */
    isInDirectory(jobId, directory) {
      return isJobInDirectory(jobId, directory);
    },

    /**
     * Create unroute mapping for job IDs
     * @param {Array<string>} jobIds - Job IDs
     * @returns {Object} Unroute mapping
     */
    createUnrouteMapping(jobIds) {
      return createUnrouteMapping(jobIds, "job");
    },

    /**
     * Unroute all job IDs
     * @param {Array<string>} jobIds - Job IDs
     * @returns {Object} Unrouted job IDs
     */
    unrouteAll(jobIds) {
      return unrouteAll(jobIds, "job");
    },
  };
}
