// src/supervision/step-supervisor.mjs
import { BaseSupervisor } from './base-supervisor.mjs';
import { getBackoffDelay, shouldRestart, RestartStrategies } from './restart-strategies.mjs';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('supervision:step');

export class StepSupervisor extends BaseSupervisor {
  constructor(options = {}) {
    super({
      ...options,
      maxRestarts: options.maxRestarts || 3
    });
    this.strategy = options.strategy || RestartStrategies.ONE_FOR_ONE;
    this.backoffSchedule = options.backoffSchedule || [1000, 5000, 10000];
    this.metrics = new Map(); // stepId -> { executions, failures, duration }
  }

  async executeStep(step, context) {
    const stepId = step.id;
    const startTime = performance.now();

    try {
      this.logger.info(`Executing step: ${stepId} (${step.type})`);

      const result = await this._executeWithRetry(step, context);

      // Record success metrics
      this._recordSuccess(stepId, performance.now() - startTime);

      return result;
    } catch (error) {
      // Record failure metrics
      this._recordFailure(stepId, performance.now() - startTime, error);

      this.logger.error(`Step ${stepId} failed after all retries: ${error.message}`);
      throw error;
    }
  }

  async _executeWithRetry(step, context) {
    const stepId = step.id;
    let lastError;

    for (let attempt = 0; attempt <= this.maxRestarts; attempt++) {
      try {
        if (attempt > 0) {
          const delay = getBackoffDelay(attempt - 1, this.backoffSchedule);
          this.logger.info(`Restarting step ${stepId} (attempt ${attempt + 1}) after ${delay}ms`);
          await this._sleep(delay);
        }

        return await step.handler(step, context);
      } catch (error) {
        lastError = error;

        if (!shouldRestart(error)) {
          this.logger.warn(`Step ${stepId} hit non-restartable error: ${error.message}`);
          throw error;
        }

        this.logger.warn(`Step ${stepId} failed (attempt ${attempt + 1}): ${error.message}`);
      }
    }

    throw lastError;
  }

  _recordSuccess(stepId, duration) {
    const metrics = this.metrics.get(stepId) || { executions: 0, failures: 0, duration: [] };
    metrics.executions++;
    metrics.duration.push(duration);
    this.metrics.set(stepId, metrics);
  }

  _recordFailure(stepId, duration, error) {
    const metrics = this.metrics.get(stepId) || { executions: 0, failures: 0, duration: [] };
    metrics.executions++;
    metrics.failures++;
    metrics.duration.push(duration);
    this.metrics.set(stepId, metrics);
  }

  getMetrics(stepId) {
    const metrics = this.metrics.get(stepId);
    if (!metrics) return null;

    const durations = metrics.duration;
    return {
      executions: metrics.executions,
      failures: metrics.failures,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      successRate: (metrics.executions - metrics.failures) / metrics.executions
    };
  }

  async _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
