// src/supervision/heartbeat.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('supervision:heartbeat');

export class HeartbeatMonitor {
  constructor(options = {}) {
    this.interval = options.interval || 30000; // 30s default
    this.missedThreshold = options.missedThreshold || 3;
    this.workers = new Map(); // workerId -> { lastSeen, missedCount }
    this.checkInterval = null;
    this.onWorkerDeathCallback = null;
  }

  register(workerId) {
    this.workers.set(workerId, {
      lastSeen: Date.now(),
      missedCount: 0
    });
    logger.debug(`Registered worker for heartbeat: ${workerId}`);
  }

  unregister(workerId) {
    this.workers.delete(workerId);
    logger.debug(`Unregistered worker: ${workerId}`);
  }

  recordHeartbeat(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastSeen = Date.now();
      worker.missedCount = 0;
    }
  }

  getDeadWorkers() {
    const now = Date.now();
    const deadWorkers = [];

    for (const [workerId, worker] of this.workers) {
      const timeSinceLastSeen = now - worker.lastSeen;

      if (timeSinceLastSeen > this.interval) {
        worker.missedCount++;

        if (worker.missedCount >= this.missedThreshold) {
          deadWorkers.push(workerId);
          logger.warn(`Worker ${workerId} is dead (missed ${worker.missedCount} heartbeats)`);
        }
      }
    }

    return deadWorkers;
  }

  start() {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      const deadWorkers = this.getDeadWorkers();

      if (deadWorkers.length > 0 && this.onWorkerDeathCallback) {
        this.onWorkerDeathCallback(deadWorkers);
      }
    }, this.interval);

    logger.info('Heartbeat monitor started');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Heartbeat monitor stopped');
    }
  }

  onWorkerDeath(callback) {
    this.onWorkerDeathCallback = callback;
  }
}
