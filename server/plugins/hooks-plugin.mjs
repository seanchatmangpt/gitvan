/**
 * Hooks Plugin
 * Routes:
 *   GET /api/hooks/list - List all hooks
 *   POST /api/hooks/create - Create a new hook
 *   PUT /api/hooks/{id} - Update a hook
 *   POST /api/hooks/{id}/evaluate - Evaluate a hook
 *   DELETE /api/hooks/{id} - Delete a hook
 * WebSocket Events:
 *   hook:evaluated - Fired when hook is evaluated
 *   hook:fired - Fired when hook executes
 */

import { WebSocketManager } from '../utils/websocket-manager.mjs';
import { successResponse, errorResponse, listResponse, wsEvent } from '../utils/response-helpers.mjs';

const hooks = new Map();
let hookIdCounter = 0;

export default defineNitroPlugin((nitroApp) => {
  nitroApp.router.get('/api/hooks/list', async (req, res) => {
    try {
      const hooksList = Array.from(hooks.values());
      return listResponse(hooksList, hooksList.length);
    } catch (error) {
      return errorResponse(error.message, 'LIST_ERROR', 500);
    }
  });

  nitroApp.router.post('/api/hooks/create', async (req, res) => {
    try {
      const body = await readBody(req);
      if (!body.name || !body.event) {
        return errorResponse('Missing required fields: name, event', 'INVALID_INPUT', 400);
      }

      const hook = {
        id: `hook-${++hookIdCounter}`,
        name: body.name,
        event: body.event,
        predicate: body.predicate || null,
        handler: body.handler || null,
        createdAt: new Date().toISOString()
      };

      hooks.set(hook.id, hook);
      await WebSocketManager.broadcast('hook:created', hook);
      return successResponse(hook, 201);
    } catch (error) {
      return errorResponse(error.message, 'CREATE_ERROR', 500);
    }
  });

  nitroApp.router.put('/api/hooks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const body = await readBody(req);

      if (!hooks.has(id)) {
        return errorResponse('Hook not found', 'NOT_FOUND', 404);
      }

      const hook = hooks.get(id);
      Object.assign(hook, body, { updatedAt: new Date().toISOString() });
      hooks.set(id, hook);

      await WebSocketManager.broadcast('hook:updated', hook);
      return successResponse(hook, 200);
    } catch (error) {
      return errorResponse(error.message, 'UPDATE_ERROR', 500);
    }
  });

  nitroApp.router.post('/api/hooks/:id/evaluate', async (req, res) => {
    try {
      const { id } = req.params;
      const body = await readBody(req);

      if (!hooks.has(id)) {
        return errorResponse('Hook not found', 'NOT_FOUND', 404);
      }

      const hook = hooks.get(id);
      const result = {
        hookId: id,
        evaluated: true,
        timestamp: new Date().toISOString(),
        context: body.context || {}
      };

      await WebSocketManager.broadcast('hook:evaluated', result);
      return successResponse(result, 200);
    } catch (error) {
      return errorResponse(error.message, 'EVALUATE_ERROR', 500);
    }
  });

  nitroApp.router.delete('/api/hooks/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!hooks.has(id)) {
        return errorResponse('Hook not found', 'NOT_FOUND', 404);
      }

      const hook = hooks.get(id);
      hooks.delete(id);

      await WebSocketManager.broadcast('hook:deleted', { id });
      return successResponse({ id, deleted: true }, 200);
    } catch (error) {
      return errorResponse(error.message, 'DELETE_ERROR', 500);
    }
  });
});
