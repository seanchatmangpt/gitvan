/**
 * GitVan Health Check System
 *
 * Provides health and readiness endpoints for:
 * - Kubernetes/Docker health probes
 * - Monitoring systems
 * - Load balancers
 *
 * Endpoints:
 * - /health/live - Liveness probe (is process alive?)
 * - /health/ready - Readiness probe (ready to accept requests?)
 * - /health - Overall health status
 */

import { createServer } from "http";
import { createLogger } from "../utils/logger.mjs";
import { safeAsync } from "../core/errors.mjs";

const logger = createLogger("health-check");

/**
 * Health check status
 */
export const HealthStatus = {
  HEALTHY: "healthy",
  UNHEALTHY: "unhealthy",
  DEGRADED: "degraded",
};

/**
 * Health Check Manager
 */
export class HealthCheckManager {
  constructor(options = {}) {
    this.port = options.port || 9090;
    this.host = options.host || "0.0.0.0";
    this.server = null;
    this.checks = new Map();
    this.startTime = Date.now();
    this.isReady = false;
  }

  /**
   * Register a health check
   * @param {string} name - Check name
   * @param {Function} checkFn - Async function that returns health status
   */
  register(name, checkFn) {
    this.checks.set(name, checkFn);
    logger.info("Health check registered", { name });
  }

  /**
   * Unregister a health check
   * @param {string} name - Check name
   */
  unregister(name) {
    this.checks.delete(name);
    logger.info("Health check unregistered", { name });
  }

  /**
   * Mark system as ready
   */
  setReady(ready = true) {
    this.isReady = ready;
    logger.info("Readiness state changed", { ready });
  }

  /**
   * Run all health checks
   * @returns {Promise<object>} Health status
   */
  async runChecks() {
    const results = {};
    let overallStatus = HealthStatus.HEALTHY;

    for (const [name, checkFn] of this.checks.entries()) {
      const [result, error] = await safeAsync(checkFn);

      if (error) {
        results[name] = {
          status: HealthStatus.UNHEALTHY,
          error: error.message,
        };
        overallStatus = HealthStatus.UNHEALTHY;
      } else {
        results[name] = result || { status: HealthStatus.HEALTHY };

        // Degraded takes precedence over healthy but not unhealthy
        if (result?.status === HealthStatus.DEGRADED && overallStatus === HealthStatus.HEALTHY) {
          overallStatus = HealthStatus.DEGRADED;
        } else if (result?.status === HealthStatus.UNHEALTHY) {
          overallStatus = HealthStatus.UNHEALTHY;
        }
      }
    }

    return {
      status: overallStatus,
      checks: results,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Liveness probe - is the process alive?
   * @returns {object} Liveness status
   */
  async liveness() {
    return {
      status: HealthStatus.HEALTHY,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe - is the system ready to accept requests?
   * @returns {object} Readiness status
   */
  async readiness() {
    if (!this.isReady) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: "System not ready",
        uptime: Date.now() - this.startTime,
        timestamp: new Date().toISOString(),
      };
    }

    return await this.runChecks();
  }

  /**
   * Handle HTTP request
   * @param {object} req - HTTP request
   * @param {object} res - HTTP response
   */
  async handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);

    logger.debug("Health check request", {
      path: url.pathname,
      method: req.method,
    });

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle OPTIONS
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Only allow GET
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    try {
      let result;
      let statusCode;

      switch (url.pathname) {
        case "/health/live":
        case "/healthz":
          result = await this.liveness();
          statusCode = 200;
          break;

        case "/health/ready":
        case "/readyz":
          result = await this.readiness();
          statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;
          break;

        case "/health":
        case "/":
          result = await this.runChecks();
          statusCode = result.status === HealthStatus.HEALTHY ? 200
            : result.status === HealthStatus.DEGRADED ? 200
            : 503;
          break;

        default:
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not found" }));
          return;
      }

      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result, null, 2));
    } catch (error) {
      logger.error("Health check error", {
        error: error.message,
        path: url.pathname,
      });

      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: HealthStatus.UNHEALTHY,
          error: error.message,
        })
      );
    }
  }

  /**
   * Start health check server
   */
  async start() {
    if (this.server) {
      logger.warn("Health check server already running");
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res).catch((error) => {
          logger.error("Request handler error", {
            error: error.message,
          });
        });
      });

      this.server.on("error", (error) => {
        logger.error("Health check server error", {
          error: error.message,
        });
        reject(error);
      });

      this.server.listen(this.port, this.host, () => {
        logger.info("Health check server started", {
          host: this.host,
          port: this.port,
        });
        resolve();
      });
    });
  }

  /**
   * Stop health check server
   */
  async stop() {
    if (!this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info("Health check server stopped");
        this.server = null;
        resolve();
      });
    });
  }
}

/**
 * Create default health checks
 */
export function createDefaultHealthChecks(daemon) {
  const checks = new HealthCheckManager();

  // Git availability check
  checks.register("git", async () => {
    try {
      if (daemon.git) {
        await daemon.git.currentHead();
        return { status: HealthStatus.HEALTHY, message: "Git operational" };
      }
      return { status: HealthStatus.DEGRADED, message: "Git not initialized" };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: "Git not available",
        error: error.message,
      };
    }
  });

  // Cron scheduler check
  checks.register("cron", async () => {
    if (!daemon.cronScheduler) {
      return { status: HealthStatus.DEGRADED, message: "Cron not initialized" };
    }

    const status = daemon.cronScheduler.getStatus();

    return {
      status: status.isRunning ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
      message: status.isRunning ? "Cron scheduler running" : "Cron scheduler stopped",
      jobs: status.scheduleSize,
    };
  });

  // Event monitoring check
  checks.register("events", async () => {
    if (!daemon.eventTimer) {
      return { status: HealthStatus.DEGRADED, message: "Event monitoring not started" };
    }

    return {
      status: HealthStatus.HEALTHY,
      message: "Event monitoring active",
      lastCommit: daemon.lastCommit,
    };
  });

  // Error rate check
  checks.register("errors", async () => {
    const errorCount = daemon.errorCount || 0;

    if (errorCount > 10) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: "High error rate",
        errorCount,
      };
    }

    if (errorCount > 5) {
      return {
        status: HealthStatus.DEGRADED,
        message: "Elevated error rate",
        errorCount,
      };
    }

    return {
      status: HealthStatus.HEALTHY,
      message: "Normal error rate",
      errorCount,
    };
  });

  return checks;
}
