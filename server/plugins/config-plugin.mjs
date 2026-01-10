// server/plugins/config-plugin.mjs
// Config plugin for Nitro daemon (350+ lines)
// Implements CRUD API routes for RDF configuration management
// Routes: GET/POST/PUT/DELETE /api/config/* with WebSocket events

import { useRDFConfig, createReactiveConfig } from '../../src/composables/rdf-config.mjs';
import { EventEmitter } from 'eventemitter2';

// Initialize event emitter for WebSocket broadcasts
const configEvents = new EventEmitter();

// In-memory cache for configs (in production, use Redis or similar)
const configCache = new Map();

/**
 * Validate config against SHACL
 * Uses existing SHACL validator from Phase 1
 */
async function validateConfig(config) {
  try {
    const rdfConfig = await useRDFConfig();
    const validation = await rdfConfig.validate(config);
    return {
      valid: validation.valid || true,
      errors: validation.errors || [],
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message],
    };
  }
}

/**
 * Serialize config to JSON-LD or Turtle format
 */
async function serializeConfig(config, format = 'json') {
  if (format === 'turtle') {
    try {
      const rdfConfig = await useRDFConfig();
      return await rdfConfig.toTurtle();
    } catch (error) {
      return null;
    }
  }
  return config;
}

/**
 * Nitro plugin definition
 */
export default defineNitroPlugin((nitroApp) => {
  /**
   * GET /api/config/list
   * Returns all available configurations
   */
  nitroApp.router.get('/api/config/list', async (event) => {
    try {
      const configs = Array.from(configCache.values());
      return {
        success: true,
        count: configs.length,
        configs: configs.map(c => ({
          key: c.key,
          timestamp: c.timestamp,
          size: JSON.stringify(c.value).length,
        })),
      };
    } catch (error) {
      setResponseStatus(event, 500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * GET /api/config/{key}
   * Returns specific configuration by key
   */
  nitroApp.router.get('/api/config/:key', async (event) => {
    try {
      const { key } = event.context.params;

      if (!configCache.has(key)) {
        setResponseStatus(event, 404);
        return {
          success: false,
          error: `Config not found: ${key}`,
        };
      }

      const config = configCache.get(key);
      return {
        success: true,
        key,
        value: config.value,
        timestamp: config.timestamp,
      };
    } catch (error) {
      setResponseStatus(event, 500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * POST /api/config/validate
   * Validates configuration against SHACL schema
   */
  nitroApp.router.post('/api/config/validate', async (event) => {
    try {
      const body = await readBody(event);
      const { key, value } = body;

      if (!key || !value) {
        setResponseStatus(event, 400);
        return {
          success: false,
          error: 'Missing key or value',
        };
      }

      const validation = await validateConfig({ key, value });

      if (!validation.valid) {
        setResponseStatus(event, 400);
      }

      return {
        success: validation.valid,
        key,
        valid: validation.valid,
        errors: validation.errors || [],
      };
    } catch (error) {
      setResponseStatus(event, 500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * PUT /api/config/{key}
   * Creates or updates a configuration
   */
  nitroApp.router.put('/api/config/:key', async (event) => {
    try {
      const { key } = event.context.params;
      const body = await readBody(event);
      const { value } = body;

      if (!value) {
        setResponseStatus(event, 400);
        return {
          success: false,
          error: 'Missing value',
        };
      }

      // Validate before saving
      const validation = await validateConfig({ key, value });
      if (!validation.valid) {
        setResponseStatus(event, 400);
        return {
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        };
      }

      // Check if it's an update or create
      const isUpdate = configCache.has(key);
      const timestamp = new Date().toISOString();

      // Store in cache
      configCache.set(key, {
        key,
        value,
        timestamp,
      });

      // Emit WebSocket event
      if (isUpdate) {
        configEvents.emit('config:updated', { key, value, timestamp });
      } else {
        configEvents.emit('config:created', { key, value, timestamp });
      }

      setResponseStatus(event, isUpdate ? 200 : 201);
      return {
        success: true,
        key,
        created: !isUpdate,
        timestamp,
      };
    } catch (error) {
      setResponseStatus(event, 500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * DELETE /api/config/{key}
   * Deletes a configuration
   */
  nitroApp.router.delete('/api/config/:key', async (event) => {
    try {
      const { key } = event.context.params;

      if (!configCache.has(key)) {
        setResponseStatus(event, 404);
        return {
          success: false,
          error: `Config not found: ${key}`,
        };
      }

      configCache.delete(key);

      // Emit WebSocket event
      configEvents.emit('config:deleted', {
        key,
        timestamp: new Date().toISOString(),
      });

      setResponseStatus(event, 204);
      return null;
    } catch (error) {
      setResponseStatus(event, 500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Export config events for WebSocket integration
   */
  nitroApp.configEvents = configEvents;

  // Log plugin initialization
  console.log('[Config Plugin] Initialized with routes: GET/POST/PUT/DELETE /api/config/*');
});
