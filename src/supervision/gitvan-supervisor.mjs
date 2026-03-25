// src/supervision/gitvan-supervisor.mjs
import { BaseSupervisor } from './base-supervisor.mjs';
import { RestartStrategies, shouldRestart } from './restart-strategies.mjs';
import { CrashLogger } from './crash-logger.mjs';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('supervision:gitvan');

export class GitVanSupervisor extends BaseSupervisor {
  constructor(options = {}) {
    super({
      ...options,
      id: options.id || 'gitvan-root',
      maxRestarts: options.maxRestarts || 5
    });

    this.strategy = options.strategy || RestartStrategies.ONE_FOR_ONE;
    this.crashLogger = new CrashLogger({
      cwd: options.cwd || process.cwd(),
      dryRun: options.dryRun || false
    });

    // System health metrics
    this.startTime = null;
    this.totalRestarts = 0;
    this.totalCrashes = 0;
  }

  async start() {
    await super.start();
    this.startTime = Date.now();

    // Start all children
    for (const child of this.children.values()) {
      if (typeof child.start === 'function') {
        await child.start();
      }
    }

    logger.info(`GitVan supervisor started with ${this.children.size} children`);
  }

  async stop() {
    logger.info('Stopping GitVan supervisor');
    await super.stop();
  }

  async handleChildCrash(childId, error, crashContext = {}) {
    this.totalCrashes++;

    logger.error(`Child supervisor crashed: ${childId}`, {
      error: error.message,
      stack: error.stack
    });

    // Log crash to Git notes
    await this.crashLogger.logCrash({
      processId: childId,
      processType: 'supervisor',
      error,
      timestamp: new Date(),
      context: {
        ...crashContext,
        supervisorId: this.id,
        totalCrashes: this.totalCrashes
      }
    });

    // Determine restart strategy
    if (!shouldRestart(error)) {
      logger.error(`Non-restartable error in ${childId}, not restarting`);
      this.removeChild(childId);
      return { action: 'stopped', reason: 'permanent_error' };
    }

    // Check if we've already hit the max restart limit
    const currentCount = this.getRestartCount(childId);
    if (currentCount >= this.maxRestarts) {
      logger.error(`Max restarts exceeded for ${childId}, stopping`);
      this.removeChild(childId);
      return { action: 'stopped', reason: 'max_restarts' };
    }

    // Execute restart strategy
    const restartCount = this.incrementRestartCount(childId);
    this.totalRestarts++;

    logger.info(`Restarting child supervisor: ${childId} (restart #${restartCount})`);

    try {
      const child = this.getChild(childId);

      if (this.strategy === RestartStrategies.ONE_FOR_ONE) {
        await this._restartChild(child);
      } else if (this.strategy === RestartStrategies.REST_FOR_ONE) {
        await this._restartChildAndDependents(child);
      } else if (this.strategy === RestartStrategies.ONE_FOR_ALL) {
        await this._restartAllChildren();
      }

      return { action: 'restarted', childId, restartCount };
    } catch (restartError) {
      logger.error(`Failed to restart ${childId}: ${restartError.message}`);
      this.removeChild(childId);
      return { action: 'failed', childId, error: restartError.message };
    }
  }

  async _restartChild(child) {
    if (typeof child.restart === 'function') {
      await child.restart();
    } else if (typeof child.start === 'function') {
      await child.start();
    }
  }

  async _restartChildAndDependents(child) {
    const dependents = this._getDependents(child);
    const childrenToRestart = [child, ...dependents];

    for (const c of childrenToRestart) {
      await this._restartChild(c);
    }
  }

  async _restartAllChildren() {
    for (const child of this.children.values()) {
      await this._restartChild(child);
    }
  }

  _getDependents(child) {
    const dependents = [];

    // For GitVan, check for workflow dependencies
    if (child.id && child.id.includes('workflow')) {
      for (const [id, c] of this.children) {
        if (id.includes('step') && c.workflowId === child.id) {
          dependents.push(c);
        }
      }
    }

    return dependents;
  }

  getSystemHealth() {
    const uptime = this.startTime ? Date.now() - this.startTime : 0;

    return {
      ...this.getHealth(),
      uptime,
      totalRestarts: this.totalRestarts,
      totalCrashes: this.totalCrashes,
      strategy: this.strategy,
      childrenHealth: Array.from(this.children.values()).map(child => child.getHealth?.() || {})
    };
  }
}
