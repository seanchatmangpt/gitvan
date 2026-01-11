/**
 * POST /api/jobs/:id/cancel
 * Cancel a running job execution
 */
import { createLogger } from "../../../../src/utils/logger.mjs";

const logger = createLogger("api:jobs:cancel");

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

    // Check if job is still running
    if (execution.status !== "running") {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: {
          error: `Cannot cancel job with status: ${execution.status}`,
          code: "INVALID_STATUS",
        },
      });
    }

    // Mark as cancelled
    execution.status = "cancelled";
    execution.cancelledAt = new Date().toISOString();

    logger.info(`Cancelled job execution: ${id}`);

    return {
      status: "success",
      data: {
        executionId: execution.executionId,
        jobName: execution.jobName,
        status: "cancelled",
        cancelledAt: execution.cancelledAt,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    logger.error(`Failed to cancel job: ${error.message}`);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: {
        error: error.message,
        code: "CANCEL_JOB_ERROR",
      },
    });
  }
});
