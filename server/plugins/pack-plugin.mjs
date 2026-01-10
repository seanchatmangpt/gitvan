/**
 * Pack Plugin
 * Routes:
 *   GET /api/packs/search - Search packs
 *   POST /api/packs/{id}/install - Install a pack
 *   GET /api/packs/marketplace - List marketplace packs
 *   GET /api/packs/installed - List installed packs
 * WebSocket Events:
 *   pack:installed - Pack installed
 *   pack:discovered - Pack discovered
 */

import { WebSocketManager } from '../utils/websocket-manager.mjs';
import { successResponse, errorResponse, listResponse } from '../utils/response-helpers.mjs';

const installedPacks = new Map();
const marketplace = [
  { id: 'pack-template-react', name: 'React Templates', version: '1.0.0', author: 'GitVan' },
  { id: 'pack-job-docker', name: 'Docker Jobs', version: '2.1.0', author: 'Community' },
  { id: 'pack-hook-lint', name: 'Lint Hooks', version: '1.5.0', author: 'GitVan' }
];

export default defineNitroPlugin((nitroApp) => {
  nitroApp.router.get('/api/packs/search', async (req, res) => {
    try {
      const query = (req.query?.q || '').toLowerCase();
      const results = marketplace.filter(pack =>
        pack.name.toLowerCase().includes(query) ||
        pack.id.toLowerCase().includes(query)
      );
      return listResponse(results, results.length);
    } catch (error) {
      return errorResponse(error.message, 'SEARCH_ERROR', 500);
    }
  });

  nitroApp.router.get('/api/packs/marketplace', async (req, res) => {
    try {
      return successResponse({
        packs: marketplace,
        total: marketplace.length,
        featured: marketplace.slice(0, 2)
      }, 200);
    } catch (error) {
      return errorResponse(error.message, 'MARKETPLACE_ERROR', 500);
    }
  });

  nitroApp.router.get('/api/packs/installed', async (req, res) => {
    try {
      const installed = Array.from(installedPacks.values());
      return listResponse(installed, installed.length);
    } catch (error) {
      return errorResponse(error.message, 'INSTALLED_ERROR', 500);
    }
  });

  nitroApp.router.post('/api/packs/:id/install', async (req, res) => {
    try {
      const { id } = req.params;
      const body = await readBody(req);

      const packDef = marketplace.find(p => p.id === id);
      if (!packDef) {
        return errorResponse('Pack not found in marketplace', 'NOT_FOUND', 404);
      }

      if (installedPacks.has(id)) {
        return errorResponse('Pack already installed', 'ALREADY_INSTALLED', 409);
      }

      const installed = {
        ...packDef,
        installedAt: new Date().toISOString(),
        enabled: true
      };

      installedPacks.set(id, installed);
      await WebSocketManager.broadcast('pack:installed', installed);

      return successResponse(installed, 201);
    } catch (error) {
      return errorResponse(error.message, 'INSTALL_ERROR', 500);
    }
  });
});
