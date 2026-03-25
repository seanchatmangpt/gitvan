// src/supervision/base-supervisor.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('supervision:base');

export class BaseSupervisor {
  constructor(options = {}) {
    // Validate options before applying defaults
    if (options.maxRestarts !== undefined && options.maxRestarts <= 0) {
      throw new Error('maxRestarts must be greater than 0');
    }
    if (options.shutdownTimeout !== undefined && options.shutdownTimeout <= 0) {
      throw new Error('shutdownTimeout must be greater than 0');
    }

    this.id = options.id || 'supervisor';
    this.children = new Map();
    this.maxRestarts = options.maxRestarts || 3;
    this.restartCount = new Map();
    this.logger = options.logger || logger;
    this.shutdownTimeout = options.shutdownTimeout || 5000;
    this.isRunning = false;
  }

  addChild(child) {
    if (!child.id) {
      throw new Error('Child must have an id');
    }
    this.children.set(child.id, child);
    this.logger.debug(`Added child: ${child.id} to ${this.id}`);
  }

  removeChild(childId) {
    this.children.delete(childId);
    this.restartCount.delete(childId);
    this.logger.debug(`Removed child: ${childId} from ${this.id}`);
  }

  getChild(childId) {
    return this.children.get(childId);
  }

  async start() {
    this.isRunning = true;
    this.logger.info(`Starting supervisor: ${this.id}`);
    // Subclasses implement specific startup logic
  }

  async stop() {
    this.logger.info(`Stopping supervisor: ${this.id}`);

    // Stop all children with timeout
    const stopPromises = Array.from(this.children.values()).map(child =>
      this.stopChild(child).catch(err =>
        this.logger.warn(`Error stopping child ${child.id}: ${err.message}`)
      )
    );

    // Enforce timeout to prevent hanging indefinitely
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Shutdown timeout exceeded')), this.shutdownTimeout)
    );

    try {
      await Promise.race([Promise.allSettled(stopPromises), timeoutPromise]);
    } catch (error) {
      if (error.message === 'Shutdown timeout exceeded') {
        this.logger.warn(`Shutdown timeout exceeded: ${this.shutdownTimeout}ms`);
      } else {
        throw error;
      }
    }

    // Set flag AFTER children stopped (fixes race condition)
    this.isRunning = false;
  }

  async stopChild(child) {
    if (typeof child.stop === 'function') {
      await child.stop();
    }
  }

  shouldRestartChild(childId) {
    const count = this.restartCount.get(childId) || 0;
    return count < this.maxRestarts;
  }

  incrementRestartCount(childId) {
    const count = (this.restartCount.get(childId) || 0) + 1;
    this.restartCount.set(childId, count);
    return count;
  }

  getRestartCount(childId) {
    return this.restartCount.get(childId) || 0;
  }

  getHealth() {
    return {
      id: this.id,
      isRunning: this.isRunning,
      children: Array.from(this.children.keys()),
      restartCounts: Object.fromEntries(this.restartCount)
    };
  }
}
