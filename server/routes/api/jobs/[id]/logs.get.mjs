/**
 * GET /api/jobs/:id/logs
 * Get logs for a specific job execution
 */
import { createLogger } from "../../../../src/utils/logger.mjs";

const logger = createLogger("api:jobs:logs");

// Reference to job executions from POST handler
let jobExecutions = new Map();

// Initialize jobExecutions from shared module
(async () => {
  try {
    const module = await import("../index.post.mjs");
    jobExecutions = module.jobExecutions;
  } catch (err) {
    logger.warn("Could not import jobExecutions from POST handler");
  }
})();

export default defineEventHandler((event) => {
  try {
    const { id } = event.context.params;
    const { limit = 1000, offset = 0 } = getQuery(event);

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

    // Paginate logs
    const logs = execution.logs.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    logger.info(`Retrieved ${logs.length} logs for execution: ${id}`);

    return {
      status: "success",
      data: {
        executionId: execution.executionId,
        jobName: execution.jobName,
        logs,
        total: execution.logs.length,
        offset: parseInt(offset),
        limit: parseInt(limit),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    logger.error(`Failed to get job logs: ${error.message}`);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: {
        error: error.message,
        code: "GET_LOGS_ERROR",
      },
    });
  }
});
