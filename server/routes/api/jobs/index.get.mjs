/**
 * GET /api/jobs
 * List all registered jobs in the JobRegistry
 */
import { useNitroApp } from "#app";
import { jobRegistry } from "../../../src/core/job-registry.mjs";
import { createLogger } from "../../../src/utils/logger.mjs";

const logger = createLogger("api:jobs:list");

export default defineEventHandler(async (event) => {
  try {
    // Get all jobs from JobRegistry
    const allJobs = jobRegistry.getAllJobs();

    // Transform to API response format
    const jobs = allJobs.map((job) => ({
      name: job.name || job.meta?.name || "unknown",
      description: job.description || job.meta?.description || "",
      version: job.version || job.meta?.version,
      author: job.author || job.meta?.author,
      tags: job.tags || job.meta?.tags || [],
      dependencies: job.dependencies || job.meta?.dependencies || [],
      hooks: job.hooks || job.meta?.hooks || [],
      hasRun: !!job.run,
      hasValidate: !!job.validate,
      hasCleanup: !!job.cleanup,
    }));

    logger.info(`Listed ${jobs.length} jobs`);

    return {
      status: "success",
      data: jobs,
      count: jobs.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to list jobs: ${error.message}`);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: {
        error: error.message,
        code: "LIST_JOBS_ERROR",
      },
    });
  }
});
