/**
 * Workflow Plugin
 * Routes:
 *   GET /api/workflows/list - List all workflows
 *   POST /api/workflows/run - Run a workflow
 *   GET /api/workflows/{id}/status - Get workflow status
 *   PUT /api/workflows/{id} - Update a workflow
 *   POST /api/workflows/{id}/cancel - Cancel a workflow
 * WebSocket Events:
 *   workflow:started - Workflow started
 *   workflow:step-completed - Workflow step completed
 *   workflow:completed - Workflow completed
 */

import { WebSocketManager } from '../utils/websocket-manager.mjs';
import { successResponse, errorResponse, listResponse } from '../utils/response-helpers.mjs';

const workflows = new Map();
let workflowIdCounter = 0;

export default defineNitroPlugin((nitroApp) => {
  nitroApp.router.get('/api/workflows/list', async (req, res) => {
    try {
      const workflowsList = Array.from(workflows.values());
      return listResponse(workflowsList, workflowsList.length);
    } catch (error) {
      return errorResponse(error.message, 'LIST_ERROR', 500);
    }
  });

  nitroApp.router.post('/api/workflows/run', async (req, res) => {
    try {
      const body = await readBody(req);
      if (!body.name || !Array.isArray(body.steps)) {
        return errorResponse('Missing required fields: name, steps', 'INVALID_INPUT', 400);
      }

      const workflowId = `wf-${++workflowIdCounter}`;
      const workflow = {
        id: workflowId,
        name: body.name,
        status: 'running',
        steps: body.steps,
        currentStep: 0,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString()
      };

      workflows.set(workflowId, workflow);

      await WebSocketManager.broadcast('workflow:started', workflow);

      // Simulate step execution
      const stepInterval = setInterval(async () => {
        if (workflow.currentStep < workflow.steps.length) {
          workflow.currentStep++;
          await WebSocketManager.broadcast('workflow:step-completed', {
            workflowId,
            step: workflow.currentStep
          });
        } else {
          clearInterval(stepInterval);
          workflow.status = 'completed';
          workflow.completedAt = new Date().toISOString();
          workflows.set(workflowId, workflow);
          await WebSocketManager.broadcast('workflow:completed', workflow);
        }
      }, 1000);

      return successResponse(workflow, 201);
    } catch (error) {
      return errorResponse(error.message, 'RUN_ERROR', 500);
    }
  });

  nitroApp.router.get('/api/workflows/:id/status', async (req, res) => {
    try {
      const { id } = req.params;

      if (!workflows.has(id)) {
        return errorResponse('Workflow not found', 'NOT_FOUND', 404);
      }

      const workflow = workflows.get(id);
      return successResponse(workflow, 200);
    } catch (error) {
      return errorResponse(error.message, 'STATUS_ERROR', 500);
    }
  });

  nitroApp.router.put('/api/workflows/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const body = await readBody(req);

      if (!workflows.has(id)) {
        return errorResponse('Workflow not found', 'NOT_FOUND', 404);
      }

      const workflow = workflows.get(id);
      Object.assign(workflow, body, { updatedAt: new Date().toISOString() });
      workflows.set(id, workflow);

      await WebSocketManager.broadcast('workflow:updated', workflow);
      return successResponse(workflow, 200);
    } catch (error) {
      return errorResponse(error.message, 'UPDATE_ERROR', 500);
    }
  });

  nitroApp.router.post('/api/workflows/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;

      if (!workflows.has(id)) {
        return errorResponse('Workflow not found', 'NOT_FOUND', 404);
      }

      const workflow = workflows.get(id);
      workflow.status = 'cancelled';
      workflow.cancelledAt = new Date().toISOString();
      workflows.set(id, workflow);

      await WebSocketManager.broadcast('workflow:cancelled', workflow);
      return successResponse(workflow, 200);
    } catch (error) {
      return errorResponse(error.message, 'CANCEL_ERROR', 500);
    }
  });
});
