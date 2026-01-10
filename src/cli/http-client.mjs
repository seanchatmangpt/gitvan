/**
 * HTTP Client for CLI Commands - Phase C Migration
 *
 * Provides abstraction layer for CLI commands to communicate with daemon.
 * Handles:
 * - Connection management (auto-start daemon)
 * - Streaming responses (logs, real-time output)
 * - Error handling and retries
 * - Response transformation for backward compatibility
 *
 * Usage:
 * const client = useHTTPClient();
 * const result = await client.get('/api/jobs/list');
 * const stream = await client.stream('/api/jobs/123/logs');
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import got from 'got';
import pRetry from 'p-retry';
import { createLogger } from '../utils/logger.mjs';
import { withGitVan } from '../composables/context.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger('http-client');

/**
 * HTTP Client for daemon communication
 * Singleton instance per process
 */
class HTTPClient {
  constructor() {
    this.baseUrl = process.env.GITVAN_API_URL || 'http://localhost:3000';
    this.daemonPid = null;
    this.retries = 3;
    this.timeout = 30000;
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize HTTP client with retry logic
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Try to connect to existing daemon
      await this.healthCheck();
      this.initialized = true;
      logger.debug('Connected to existing daemon');
      return;
    } catch (error) {
      logger.debug('No daemon running, attempting to start...');

      // Try to start daemon
      try {
        await this.startDaemon();
        await this.healthCheck();
        this.initialized = true;
        logger.info('Started new daemon');
      } catch (daemonError) {
        logger.error('Failed to start daemon:', daemonError.message);
        throw new Error(`Cannot connect to daemon: ${daemonError.message}`);
      }
    }
  }

  /**
   * Health check - verify daemon is running
   */
  async healthCheck() {
    try {
      const response = await this.rawGet('/api/health', { timeout: 5000 });
      if (!response || response.status !== 'healthy') {
        throw new Error('Daemon unhealthy');
      }
      return response;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Start daemon (auto-spawn if not running)
   */
  async startDaemon() {
    const { spawn } = await import('child_process');
    const daemonPath = join(__dirname, '../runtime/daemon.mjs');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Daemon startup timeout'));
      }, 15000);

      const daemon = spawn('node', [daemonPath], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, GITVAN_API_MODE: 'true' },
      });

      this.daemonPid = daemon.pid;

      // Detach from parent process
      daemon.unref();

      // Wait for daemon to be ready
      const checkReady = async () => {
        for (let i = 0; i < 50; i++) {
          try {
            await this.healthCheck();
            clearTimeout(timeout);
            return resolve();
          } catch {
            await new Promise(r => setTimeout(r, 100));
          }
        }
        clearTimeout(timeout);
        reject(new Error('Daemon failed to start'));
      };

      checkReady();
    });
  }

  /**
   * Raw GET request with automatic retries
   */
  async rawGet(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    return pRetry(
      async () => {
        try {
          const response = await got(url, {
            method: 'GET',
            timeout: this.timeout,
            retry: { limit: 0 }, // Handle retries manually
            ...options,
          }).json();
          return response;
        } catch (error) {
          // Throw specific errors
          if (error.code === 'ECONNREFUSED') {
            throw new Error('Daemon connection refused');
          }
          throw error;
        }
      },
      {
        retries: this.retries,
        minTimeout: 100,
        maxTimeout: 1000,
      }
    );
  }

  /**
   * Raw POST request
   */
  async rawPost(endpoint, body = {}, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    return pRetry(
      async () => {
        try {
          const response = await got(url, {
            method: 'POST',
            json: body,
            timeout: this.timeout,
            retry: { limit: 0 },
            ...options,
          }).json();
          return response;
        } catch (error) {
          if (error.code === 'ECONNREFUSED') {
            throw new Error('Daemon connection refused');
          }
          throw error;
        }
      },
      {
        retries: this.retries,
        minTimeout: 100,
        maxTimeout: 1000,
      }
    );
  }

  /**
   * GET request with auto-initialization
   */
  async get(endpoint, options = {}) {
    await this.initialize();
    return this.rawGet(endpoint, options);
  }

  /**
   * POST request with auto-initialization
   */
  async post(endpoint, body = {}, options = {}) {
    await this.initialize();
    return this.rawPost(endpoint, body, options);
  }

  /**
   * PUT request
   */
  async put(endpoint, body = {}, options = {}) {
    await this.initialize();
    const url = `${this.baseUrl}${endpoint}`;

    return pRetry(
      async () => {
        try {
          const response = await got(url, {
            method: 'PUT',
            json: body,
            timeout: this.timeout,
            retry: { limit: 0 },
            ...options,
          }).json();
          return response;
        } catch (error) {
          if (error.code === 'ECONNREFUSED') {
            throw new Error('Daemon connection refused');
          }
          throw error;
        }
      },
      { retries: this.retries, minTimeout: 100, maxTimeout: 1000 }
    );
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    await this.initialize();
    const url = `${this.baseUrl}${endpoint}`;

    return pRetry(
      async () => {
        try {
          const response = await got(url, {
            method: 'DELETE',
            timeout: this.timeout,
            retry: { limit: 0 },
            ...options,
          }).json();
          return response;
        } catch (error) {
          if (error.code === 'ECONNREFUSED') {
            throw new Error('Daemon connection refused');
          }
          throw error;
        }
      },
      { retries: this.retries, minTimeout: 100, maxTimeout: 1000 }
    );
  }

  /**
   * Stream response (for logs, large outputs)
   */
  async stream(endpoint, onData, options = {}) {
    await this.initialize();
    const url = `${this.baseUrl}${endpoint}`;

    return new Promise((resolve, reject) => {
      const stream = got(url, {
        method: 'GET',
        timeout: this.timeout,
        ...options,
      });

      stream.on('data', chunk => {
        try {
          const data = JSON.parse(chunk.toString());
          onData(data);
        } catch {
          onData({ raw: chunk.toString() });
        }
      });

      stream.on('error', reject);
      stream.on('end', () => resolve());
    });
  }

  /**
   * Stop daemon cleanly
   */
  async stopDaemon(force = false) {
    try {
      if (force && this.daemonPid) {
        const { execSync } = await import('child_process');
        execSync(`kill -9 ${this.daemonPid}`, { stdio: 'ignore' });
        this.initialized = false;
        return;
      }

      await this.post('/api/daemon/stop');
      this.initialized = false;
    } catch (error) {
      logger.debug('Error stopping daemon:', error.message);
    }
  }

  /**
   * Get daemon status
   */
  async daemonStatus() {
    try {
      await this.initialize();
      return await this.get('/api/daemon/status');
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }

  /**
   * Reset connection (force reconnect)
   */
  async reset() {
    this.initialized = false;
    await this.initialize();
  }
}

// Singleton instance
let globalClient = null;

/**
 * Composable hook for HTTP client
 */
export function useHTTPClient() {
  if (!globalClient) {
    globalClient = new HTTPClient();
  }
  return globalClient;
}

/**
 * Get or create HTTP client
 */
export function getHTTPClient() {
  return useHTTPClient();
}

/**
 * High-level API helpers for common operations
 */
export const httpAPI = {
  // Jobs API
  async listJobs(filters = {}) {
    const client = useHTTPClient();
    const query = new URLSearchParams(filters);
    return client.get(`/api/jobs/list?${query}`);
  },

  async getJobStatus(jobId) {
    const client = useHTTPClient();
    return client.get(`/api/jobs/${jobId}/status`);
  },

  async runJob(jobName, args = {}) {
    const client = useHTTPClient();
    return client.post(`/api/jobs/run`, { name: jobName, args });
  },

  async cancelJob(jobId) {
    const client = useHTTPClient();
    return client.post(`/api/jobs/${jobId}/cancel`);
  },

  async getJobLogs(jobId, onData) {
    const client = useHTTPClient();
    return client.stream(`/api/jobs/${jobId}/logs`, onData);
  },

  // Workflows API
  async listWorkflows(filters = {}) {
    const client = useHTTPClient();
    const query = new URLSearchParams(filters);
    return client.get(`/api/workflows/list?${query}`);
  },

  async runWorkflow(workflowName, args = {}) {
    const client = useHTTPClient();
    return client.post(`/api/workflows/run`, { name: workflowName, args });
  },

  async getWorkflowStatus(workflowId) {
    const client = useHTTPClient();
    return client.get(`/api/workflows/${workflowId}/status`);
  },

  async cancelWorkflow(workflowId) {
    const client = useHTTPClient();
    return client.post(`/api/workflows/${workflowId}/cancel`);
  },

  // Hooks API
  async listHooks(filters = {}) {
    const client = useHTTPClient();
    const query = new URLSearchParams(filters);
    return client.get(`/api/hooks/list?${query}`);
  },

  async evaluateHook(hookId) {
    const client = useHTTPClient();
    return client.post(`/api/hooks/${hookId}/evaluate`);
  },

  // Config API
  async getConfig(key) {
    const client = useHTTPClient();
    return client.get(`/api/config/${key || ''}`);
  },

  async setConfig(key, value) {
    const client = useHTTPClient();
    return client.put(`/api/config/${key}`, { value });
  },

  async validateConfig(config) {
    const client = useHTTPClient();
    return client.post(`/api/config/validate`, config);
  },

  // RDF API
  async querySPARQL(query) {
    const client = useHTTPClient();
    return client.post(`/api/rdf/query`, { query });
  },

  async validateSHACL(data) {
    const client = useHTTPClient();
    return client.post(`/api/rdf/validate`, data);
  },

  async exportRDF(format = 'turtle') {
    const client = useHTTPClient();
    return client.get(`/api/rdf/export?format=${format}`);
  },

  // Daemon API
  async daemonHealth() {
    const client = useHTTPClient();
    return client.get('/api/health');
  },

  async daemonStatus() {
    const client = useHTTPClient();
    return client.get('/api/daemon/status');
  },

  async daemonRestart() {
    const client = useHTTPClient();
    return client.post('/api/daemon/restart');
  },
};

export default useHTTPClient;
