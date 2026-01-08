/**
 * GitVan - Job Management Composable
 * Provides job validation and metadata management
 */

import { existsSync } from "node:fs";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("composables:job-management");

/**
 * Create job management composable
 * @param {Object} deps - Dependencies (discovery)
 * @returns {Object} Job management methods
 */
export function createJobManagement(deps) {
  const { discovery } = deps;

  return {
    /**
     * Validate a job definition
     * @param {string} jobId - Job ID
     * @returns {Promise<Object>} Validation result
     */
    async validate(jobId) {
      try {
        const jobDef = await discovery.get(jobId);

        const validation = {
          id: jobId,
          valid: true,
          errors: [],
          warnings: [],
        };

        // Check job definition
        if (!jobDef.definition) {
          validation.valid = false;
          validation.errors.push("Job definition not found");
        }

        // Check for run function in definition or directly in jobDef
        const runFunction =
          jobDef.definition?.run ||
          jobDef.run ||
          jobDef.definition?.default?.run;
        if (!runFunction || typeof runFunction !== "function") {
          validation.valid = false;
          validation.errors.push("Job must have a run function");
        }

        // Check metadata
        const metadata =
          jobDef.definition?.meta || jobDef.definition?.default?.meta;
        if (!metadata) {
          validation.warnings.push("Job missing metadata");
        }

        if (!metadata?.desc && !metadata?.description) {
          validation.warnings.push("Job missing description");
        }

        // Check file exists
        if (!existsSync(jobDef.file)) {
          validation.valid = false;
          validation.errors.push("Job file not found");
        }

        return validation;
      } catch (error) {
        return {
          id: jobId,
          valid: false,
          errors: [error.message],
          warnings: [],
        };
      }
    },

    /**
     * Validate all jobs
     * @returns {Promise<Array>} Validation results for all jobs
     */
    async validateAll() {
      try {
        const jobs = await discovery.list();
        const results = [];

        for (const job of jobs) {
          const validation = await this.validate(job.id);
          results.push(validation);
        }

        return results;
      } catch (error) {
        throw new Error(`Failed to validate all jobs: ${error.message}`);
      }
    },
  };
}
