/**
 * Jobs Plugin - Initializes WebSocket integration for job events
 *
 * Routes are now handled by Nitro file-based routing in /server/routes/api/jobs/
 *
 * This plugin sets up WebSocket event broadcasting for:
 * - job:started - When a job execution begins
 * - job:progress - When job progress updates
 * - job:completed - When a job completes successfully
 * - job:failed - When a job fails
 * - job:cancelled - When a job is cancelled
 *
 * Integration:
 * - Routes: GET /api/jobs (list), POST /api/jobs (run), GET /api/jobs/:id (status)
 * - Execution: Integrated with JobRegistry from src/core/job-registry.mjs
 * - Scheduling: Compatible with Bree scheduler for background jobs
 */

import { WebSocketManager } from "../utils/websocket-manager.mjs";
import { createLogger } from "../../src/utils/logger.mjs";

const logger = createLogger("plugins:jobs");

export default (nitroApp) => {
  logger.info("Jobs plugin initialized");
  logger.info("Routes available:");
  logger.info("  GET  /api/jobs                  - List all registered jobs");
  logger.info("  POST /api/jobs                  - Run a job");
  logger.info("  GET  /api/jobs/:id              - Get job execution status");
  logger.info("  GET  /api/jobs/:id/logs         - Get job execution logs");
  logger.info("  POST /api/jobs/:id/cancel       - Cancel a running job");

  // Initialize WebSocket manager for job events
  try {
    WebSocketManager.subscribe("job:*", (event, data) => {
      logger.info(`Job event: ${event}`, {
        jobName: data?.jobName,
        executionId: data?.executionId,
      });
    });
  } catch (error) {
    logger.warn("WebSocket integration not available:", error.message);
  }
};
