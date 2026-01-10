/**
 * Jobs Plugin
 * Routes:
 *   GET /api/jobs/list - List all jobs
 *   POST /api/jobs/run - Run a job
 *   GET /api/jobs/{id}/status - Get job status
 *   GET /api/jobs/{id}/logs - Get job logs
 *   POST /api/jobs/{id}/cancel - Cancel a job
 * WebSocket Events:
 *   job:started - Job started
 *   job:progress - Job progress update
 *   job:completed - Job completed
 */

import { WebSocketManager } from '../utils/websocket-manager.mjs';
import { successResponse, errorResponse, listResponse } from '../utils/response-helpers.mjs';

const jobs = new Map();
const jobLogs = new Map();
let jobIdCounter = 0;

export default defineNitroPlugin((nitroApp) => {
  nitroApp.router.get('/api/jobs/list', async (req, res) => {
    try {
      const jobsList = Array.from(jobs.values());
      return listResponse(jobsList, jobsList.length);
    } catch (error) {
      return errorResponse(error.message, 'LIST_ERROR', 500);
    }
  });

  nitroApp.router.post('/api/jobs/run', async (req, res) => {
    try {
      const body = await readBody(req);
      if (!body.name) {
        return errorResponse('Missing required field: name', 'INVALID_INPUT', 400);
      }

      const jobId = `job-${++jobIdCounter}`;
      const job = {
        id: jobId,
        name: body.name,
        status: 'running',
        progress: 0,
        config: body.config || {},
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString()
      };

      jobs.set(jobId, job);
      jobLogs.set(jobId, []);

      await WebSocketManager.broadcast('job:started', job);

      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(async () => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(progressInterval);
          job.status = 'completed';
          job.completedAt = new Date().toISOString();
          jobs.set(jobId, job);
          await WebSocketManager.broadcast('job:completed', job);
        } else {
          job.progress = Math.min(progress, 99);
          await WebSocketManager.broadcast('job:progress', {
            jobId,
            progress: job.progress
          });
        }
      }, 1000);

      return successResponse(job, 201);
    } catch (error) {
      return errorResponse(error.message, 'RUN_ERROR', 500);
    }
  });

  nitroApp.router.get('/api/jobs/:id/status', async (req, res) => {
    try {
      const { id } = req.params;

      if (!jobs.has(id)) {
        return errorResponse('Job not found', 'NOT_FOUND', 404);
      }

      const job = jobs.get(id);
      return successResponse(job, 200);
    } catch (error) {
      return errorResponse(error.message, 'STATUS_ERROR', 500);
    }
  });

  nitroApp.router.get('/api/jobs/:id/logs', async (req, res) => {
    try {
      const { id } = req.params;

      if (!jobLogs.has(id)) {
        return errorResponse('Job not found', 'NOT_FOUND', 404);
      }

      const logs = jobLogs.get(id);
      return successResponse(
        { jobId: id, logs, lines: logs.length },
        200
      );
    } catch (error) {
      return errorResponse(error.message, 'LOGS_ERROR', 500);
    }
  });

  nitroApp.router.post('/api/jobs/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;

      if (!jobs.has(id)) {
        return errorResponse('Job not found', 'NOT_FOUND', 404);
      }

      const job = jobs.get(id);
      job.status = 'cancelled';
      job.cancelledAt = new Date().toISOString();
      jobs.set(id, job);

      await WebSocketManager.broadcast('job:cancelled', job);
      return successResponse(job, 200);
    } catch (error) {
      return errorResponse(error.message, 'CANCEL_ERROR', 500);
    }
  });
});
