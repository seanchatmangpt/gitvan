/**
 * @fileoverview GitVan v4 - Batch Update System
 *
 * Implements efficient batch processing for hook updates.
 * Reduces overhead by grouping multiple operations together.
 *
 * Key Features:
 * - Automatic batching of updates
 * - Priority-based scheduling
 * - Transactional updates
 * - Rollback support
 * - Concurrent batch processing
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/**
 * Creates a batch processor for efficient update handling
 *
 * @param {Object} options - Batch processor options
 * @returns {Object} Batch processor interface
 *
 * @example
 * ```javascript
 * const batcher = useBatchProcessor({
 *   maxBatchSize: 100,
 *   maxWaitMs: 50,
 *   processFn: async (items) => {
 *     return await bulkUpdate(items);
 *   }
 * });
 *
 * // Items are automatically batched
 * batcher.add({ type: 'update', data: item1 });
 * batcher.add({ type: 'update', data: item2 });
 * ```
 */
export function useBatchProcessor(options = {}) {
  const config = {
    maxBatchSize: options.maxBatchSize || 100,
    maxWaitMs: options.maxWaitMs || 50,
    processFn: options.processFn || (async (items) => items),
    onError: options.onError || console.error,
    concurrency: options.concurrency || 1,
  };

  let batch = [];
  let timeoutId = null;
  let processing = false;
  let processingCount = 0;
  const pendingPromises = new Map();

  // Statistics
  const stats = {
    itemsProcessed: 0,
    batchesProcessed: 0,
    totalProcessingTime: 0,
    avgBatchSize: 0,
    errors: 0,
    maxConcurrency: 0,
  };

  async function processBatch() {
    if (batch.length === 0 || processing) return;

    if (processingCount >= config.concurrency) {
      return;
    }

    // Take current batch
    const currentBatch = batch.slice(0, config.maxBatchSize);
    batch = batch.slice(config.maxBatchSize);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    processingCount++;
    stats.maxConcurrency = Math.max(stats.maxConcurrency, processingCount);

    const startTime = performance.now();

    try {
      const results = await config.processFn(currentBatch);

      // Resolve individual promises
      for (let i = 0; i < currentBatch.length; i++) {
        const item = currentBatch[i];
        if (pendingPromises.has(item)) {
          const { resolve } = pendingPromises.get(item);
          resolve(Array.isArray(results) ? results[i] : results);
          pendingPromises.delete(item);
        }
      }

      stats.itemsProcessed += currentBatch.length;
      stats.batchesProcessed++;
      stats.avgBatchSize = stats.itemsProcessed / stats.batchesProcessed;
    } catch (error) {
      stats.errors++;
      config.onError(error, currentBatch);

      // Reject pending promises
      for (const item of currentBatch) {
        if (pendingPromises.has(item)) {
          const { reject } = pendingPromises.get(item);
          reject(error);
          pendingPromises.delete(item);
        }
      }
    } finally {
      stats.totalProcessingTime += performance.now() - startTime;
      processingCount--;

      // Process remaining items
      if (batch.length > 0) {
        processBatch();
      }
    }
  }

  function scheduleProcess() {
    if (timeoutId) return;

    timeoutId = setTimeout(() => {
      timeoutId = null;
      processBatch();
    }, config.maxWaitMs);
  }

  return {
    /**
     * Add an item to the batch
     */
    add(item) {
      return new Promise((resolve, reject) => {
        batch.push(item);
        pendingPromises.set(item, { resolve, reject });

        // Process immediately if batch is full
        if (batch.length >= config.maxBatchSize) {
          processBatch();
        } else {
          scheduleProcess();
        }
      });
    },

    /**
     * Add multiple items at once
     */
    addAll(items) {
      return Promise.all(items.map((item) => this.add(item)));
    },

    /**
     * Force process pending items
     */
    async flush() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      while (batch.length > 0 || processingCount > 0) {
        if (batch.length > 0 && processingCount < config.concurrency) {
          processBatch();
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    },

    /**
     * Get pending item count
     */
    getPendingCount() {
      return batch.length;
    },

    /**
     * Get processing status
     */
    isProcessing() {
      return processingCount > 0;
    },

    /**
     * Get statistics
     */
    getStats() {
      return {
        ...stats,
        pendingItems: batch.length,
        activeProcessors: processingCount,
        avgProcessingTime: stats.batchesProcessed > 0
          ? (stats.totalProcessingTime / stats.batchesProcessed).toFixed(2)
          : 0,
      };
    },

    /**
     * Clear pending items
     */
    clear() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const error = new Error("Batch processor cleared");
      for (const { reject } of pendingPromises.values()) {
        reject(error);
      }

      batch = [];
      pendingPromises.clear();
    },
  };
}

/**
 * Creates a transactional batch updater with rollback support
 *
 * @param {Object} options - Transaction options
 * @returns {Object} Transactional updater interface
 *
 * @example
 * ```javascript
 * const tx = useTransactionalBatch();
 *
 * tx.begin();
 * tx.update('key1', { value: 1 });
 * tx.update('key2', { value: 2 });
 *
 * try {
 *   await tx.commit();
 * } catch (error) {
 *   await tx.rollback();
 * }
 * ```
 */
export function useTransactionalBatch(options = {}) {
  const config = {
    onCommit: options.onCommit || (async () => {}),
    onRollback: options.onRollback || (async () => {}),
    validateFn: options.validateFn || (() => true),
  };

  let operations = [];
  let snapshots = new Map();
  let isActive = false;
  let isCommitted = false;

  // Statistics
  const stats = {
    transactions: 0,
    commits: 0,
    rollbacks: 0,
    totalOperations: 0,
  };

  return {
    /**
     * Begin a new transaction
     */
    begin() {
      if (isActive) {
        throw new Error("Transaction already active");
      }

      operations = [];
      snapshots = new Map();
      isActive = true;
      isCommitted = false;
      stats.transactions++;
    },

    /**
     * Add an update operation
     */
    update(key, value, previousValue = undefined) {
      if (!isActive) {
        throw new Error("No active transaction");
      }

      // Store snapshot for rollback
      if (!snapshots.has(key)) {
        snapshots.set(key, previousValue);
      }

      operations.push({
        type: "update",
        key,
        value,
        timestamp: Date.now(),
      });

      stats.totalOperations++;
    },

    /**
     * Add a delete operation
     */
    delete(key, previousValue = undefined) {
      if (!isActive) {
        throw new Error("No active transaction");
      }

      if (!snapshots.has(key)) {
        snapshots.set(key, previousValue);
      }

      operations.push({
        type: "delete",
        key,
        timestamp: Date.now(),
      });

      stats.totalOperations++;
    },

    /**
     * Commit the transaction
     */
    async commit() {
      if (!isActive) {
        throw new Error("No active transaction");
      }

      if (isCommitted) {
        throw new Error("Transaction already committed");
      }

      // Validate all operations
      for (const op of operations) {
        if (!config.validateFn(op)) {
          throw new Error(`Validation failed for operation: ${op.key}`);
        }
      }

      try {
        await config.onCommit(operations);
        isCommitted = true;
        stats.commits++;
        return operations;
      } catch (error) {
        // Auto-rollback on commit failure
        await this.rollback();
        throw error;
      } finally {
        isActive = false;
      }
    },

    /**
     * Rollback the transaction
     */
    async rollback() {
      if (!isActive && !isCommitted) {
        return;
      }

      try {
        await config.onRollback(snapshots, operations);
        stats.rollbacks++;
      } finally {
        operations = [];
        snapshots.clear();
        isActive = false;
        isCommitted = false;
      }
    },

    /**
     * Get pending operations
     */
    getOperations() {
      return [...operations];
    },

    /**
     * Get snapshots for rollback
     */
    getSnapshots() {
      return new Map(snapshots);
    },

    /**
     * Check if transaction is active
     */
    isTransactionActive() {
      return isActive;
    },

    /**
     * Get statistics
     */
    getStats() {
      return {
        ...stats,
        pendingOperations: operations.length,
        snapshotCount: snapshots.size,
        isActive,
        isCommitted,
      };
    },
  };
}

/**
 * Creates a priority batch queue for ordering updates
 *
 * @param {Object} options - Priority queue options
 * @returns {Object} Priority batch queue interface
 *
 * @example
 * ```javascript
 * const queue = usePriorityBatchQueue({
 *   priorities: ['critical', 'high', 'normal', 'low'],
 *   processFn: async (items) => await processUpdates(items)
 * });
 *
 * queue.enqueue({ data: 'urgent' }, 'critical');
 * queue.enqueue({ data: 'normal' }, 'normal');
 * ```
 */
export function usePriorityBatchQueue(options = {}) {
  const config = {
    priorities: options.priorities || ["high", "normal", "low"],
    processFn: options.processFn || (async (items) => items),
    batchSize: options.batchSize || 50,
    processInterval: options.processInterval || 100,
  };

  // Create queues for each priority
  const queues = new Map();
  for (const priority of config.priorities) {
    queues.set(priority, []);
  }

  let intervalId = null;
  let processing = false;

  // Statistics
  const stats = {
    enqueuedItems: 0,
    processedItems: 0,
    batchesProcessed: 0,
    itemsByPriority: Object.fromEntries(
      config.priorities.map((p) => [p, 0])
    ),
  };

  async function processNextBatch() {
    if (processing) return;
    processing = true;

    try {
      // Find highest priority queue with items
      for (const priority of config.priorities) {
        const queue = queues.get(priority);

        if (queue.length > 0) {
          const batch = queue.splice(0, config.batchSize);
          stats.batchesProcessed++;
          stats.processedItems += batch.length;

          await config.processFn(
            batch.map((item) => item.data),
            priority
          );

          // Resolve promises
          for (const item of batch) {
            if (item.resolve) {
              item.resolve();
            }
          }

          break;
        }
      }
    } catch (error) {
      console.error("Priority queue processing error:", error);
    } finally {
      processing = false;
    }
  }

  return {
    /**
     * Enqueue an item with priority
     */
    enqueue(data, priority = "normal") {
      if (!queues.has(priority)) {
        priority = "normal";
      }

      return new Promise((resolve, reject) => {
        queues.get(priority).push({ data, resolve, reject });
        stats.enqueuedItems++;
        stats.itemsByPriority[priority]++;

        // Start processing if not already running
        if (!intervalId) {
          intervalId = setInterval(processNextBatch, config.processInterval);
        }
      });
    },

    /**
     * Get queue lengths by priority
     */
    getQueueLengths() {
      const lengths = {};
      for (const [priority, queue] of queues) {
        lengths[priority] = queue.length;
      }
      return lengths;
    },

    /**
     * Get total pending items
     */
    getTotalPending() {
      let total = 0;
      for (const queue of queues.values()) {
        total += queue.length;
      }
      return total;
    },

    /**
     * Force process all queues
     */
    async flush() {
      while (this.getTotalPending() > 0) {
        await processNextBatch();
      }
    },

    /**
     * Stop processing
     */
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },

    /**
     * Resume processing
     */
    resume() {
      if (!intervalId && this.getTotalPending() > 0) {
        intervalId = setInterval(processNextBatch, config.processInterval);
      }
    },

    /**
     * Clear all queues
     */
    clear() {
      for (const queue of queues.values()) {
        for (const item of queue) {
          if (item.reject) {
            item.reject(new Error("Queue cleared"));
          }
        }
        queue.length = 0;
      }
    },

    /**
     * Get statistics
     */
    getStats() {
      return {
        ...stats,
        queueLengths: this.getQueueLengths(),
        totalPending: this.getTotalPending(),
        isProcessing: processing,
        isRunning: intervalId !== null,
      };
    },
  };
}

/**
 * Creates an update scheduler for coordinating batch updates
 *
 * @param {Object} options - Scheduler options
 * @returns {Object} Update scheduler interface
 */
export function useUpdateScheduler(options = {}) {
  const config = {
    frameTime: options.frameTime || 16, // ~60fps
    maxTaskTime: options.maxTaskTime || 5,
    idleTimeout: options.idleTimeout || 50,
  };

  const taskQueue = [];
  let isScheduled = false;
  let frameStartTime = 0;

  // Statistics
  const stats = {
    framesProcessed: 0,
    tasksProcessed: 0,
    droppedFrames: 0,
    avgTasksPerFrame: 0,
  };

  function shouldYield() {
    return performance.now() - frameStartTime >= config.maxTaskTime;
  }

  function processFrame() {
    frameStartTime = performance.now();
    let tasksThisFrame = 0;

    while (taskQueue.length > 0 && !shouldYield()) {
      const task = taskQueue.shift();
      try {
        task.fn();
        if (task.resolve) task.resolve();
        stats.tasksProcessed++;
        tasksThisFrame++;
      } catch (error) {
        if (task.reject) task.reject(error);
      }
    }

    stats.framesProcessed++;
    stats.avgTasksPerFrame =
      stats.tasksProcessed / stats.framesProcessed;

    const frameTime = performance.now() - frameStartTime;
    if (frameTime > config.frameTime) {
      stats.droppedFrames++;
    }

    if (taskQueue.length > 0) {
      requestNextFrame();
    } else {
      isScheduled = false;
    }
  }

  function requestNextFrame() {
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(processFrame);
    } else {
      setTimeout(processFrame, config.frameTime);
    }
  }

  return {
    /**
     * Schedule a task
     */
    schedule(fn, priority = 0) {
      return new Promise((resolve, reject) => {
        const task = { fn, resolve, reject, priority };

        // Insert by priority
        let inserted = false;
        for (let i = 0; i < taskQueue.length; i++) {
          if (taskQueue[i].priority < priority) {
            taskQueue.splice(i, 0, task);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          taskQueue.push(task);
        }

        if (!isScheduled) {
          isScheduled = true;
          requestNextFrame();
        }
      });
    },

    /**
     * Schedule during idle time
     */
    scheduleIdle(fn) {
      return new Promise((resolve, reject) => {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(
            (deadline) => {
              try {
                fn(deadline);
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            { timeout: config.idleTimeout }
          );
        } else {
          // Fallback for Node.js
          setTimeout(() => {
            try {
              fn({ timeRemaining: () => config.idleTimeout });
              resolve();
            } catch (error) {
              reject(error);
            }
          }, 0);
        }
      });
    },

    /**
     * Get pending task count
     */
    getPendingCount() {
      return taskQueue.length;
    },

    /**
     * Clear pending tasks
     */
    clear() {
      for (const task of taskQueue) {
        if (task.reject) {
          task.reject(new Error("Scheduler cleared"));
        }
      }
      taskQueue.length = 0;
    },

    /**
     * Get statistics
     */
    getStats() {
      return {
        ...stats,
        pendingTasks: taskQueue.length,
        isScheduled,
      };
    },
  };
}

export default {
  useBatchProcessor,
  useTransactionalBatch,
  usePriorityBatchQueue,
  useUpdateScheduler,
};
