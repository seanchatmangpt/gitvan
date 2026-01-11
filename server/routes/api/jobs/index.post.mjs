/**
 * POST /api/jobs
 * Run a job by name with optional config
 *
 * Request body:
 * {
 *   name: string (required) - Job name to run
 *   config?: object - Optional job config/parameters
 *   jobId?: string - Optional explicit job ID for tracking
 * }
 */
import { jobRegistry } from "../../../src/core/job-registry.mjs";
import { BreeScheduler } from "../../../src/jobs/bree-scheduler.mjs";
import { createLogger } from "../../../src/utils/logger.mjs";

const logger = createLogger("api:jobs:run");

// Global job execution tracking
const jobExecutions = new Map();
let executionIdCounter = 0;

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Validate required fields
    if (!body.name) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: {
          error: "Missing required field: name",
          code: "MISSING_FIELD",
        },
      });
    }

    // Look up job in registry
    const jobDef = jobRegistry.getJob(body.name);
    if (!jobDef) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found",
        data: {
          error: `Job not found: ${body.name}`,
          code: "JOB_NOT_FOUND",
        },
      });
    }

    // Validate job has run function
    if (typeof jobDef.run !== "function") {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: {
          error: `Job ${body.name} does not have a run function`,
          code: "INVALID_JOB",
        },
      });
    }

    // Create execution record
    const executionId = `exec-${++executionIdCounter}`;
    const execution = {
      executionId,
      jobName: body.name,
      status: "running",
      progress: 0,
      config: body.config || {},
      startedAt: new Date().toISOString(),
      logs: [],
    };

    jobExecutions.set(executionId, execution);

    // Run job asynchronously
    (async () => {
      try {
        logger.info(`Starting job execution: ${body.name} (${executionId})`);

        // Create a logger that captures output
        const jobLogger = createLogger(`job:${body.name}`);
        const captureLog = (level, msg) => {
          execution.logs.push({
            timestamp: new Date().toISOString(),
            level,
            message: msg,
          });
        };

        // Execute the job
        const result = await jobDef.run({
          jobId: executionId,
          jobName: body.name,
          config: body.config,
          logger: jobLogger,
          onProgress: (progress) => {
            execution.progress = Math.min(progress, 99);
          },
          onLog: captureLog,
        });

        // Mark as completed
        execution.status = "completed";
        execution.progress = 100;
        execution.result = result;
        execution.completedAt = new Date().toISOString();

        logger.info(
          `Job execution completed: ${body.name} (${executionId})`
        );
      } catch (error) {
        // Mark as failed
        execution.status = "failed";
        execution.error = error.message;
        execution.completedAt = new Date().toISOString();

        logger.error(
          `Job execution failed: ${body.name} (${executionId}): ${error.message}`
        );
      }
    })().catch((err) => {
      logger.error(`Uncaught error in job execution ${executionId}:`, err);
    });

    logger.info(`Queued job execution: ${body.name} (${executionId})`);

    return {
      status: "success",
      data: {
        executionId,
        jobName: body.name,
        status: "queued",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    logger.error(`Failed to run job: ${error.message}`);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: {
        error: error.message,
        code: "RUN_JOB_ERROR",
      },
    });
  }
});

// Export for testing
export { jobExecutions, executionIdCounter };
