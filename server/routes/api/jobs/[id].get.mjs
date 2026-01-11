/**
 * GET /api/jobs/:id
 * Get status and logs for a specific job execution
 */
import { createLogger } from "../../../src/utils/logger.mjs";

const logger = createLogger("api:jobs:status");

// Reference to job executions from POST handler
// In production, this would be stored in Redis or a database
let jobExecutions = new Map();

// Initialize jobExecutions from shared module
(async () => {
  try {
    const module = await import("./index.post.mjs");
    jobExecutions = module.jobExecutions;
  } catch (err) {
    logger.warn("Could not import jobExecutions from POST handler");
  }
})();

export default defineEventHandler((event) => {
  try {
    const { id } = event.context.params;

    // Look up execution
    const execution = jobExecutions.get(id);
    if (!execution) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found",
        data: {
          error: `Execution not found: ${id}`,
          code: "EXECUTION_NOT_FOUND",
        },
      });
    }

    logger.info(`Retrieved status for execution: ${id}`);

    return {
      status: "success",
      data: {
        executionId: execution.executionId,
        jobName: execution.jobName,
        status: execution.status,
        progress: execution.progress,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        result: execution.result,
        error: execution.error,
        logsCount: execution.logs.length,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    logger.error(`Failed to get job status: ${error.message}`);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: {
        error: error.message,
        code: "GET_STATUS_ERROR",
      },
    });
  }
});
