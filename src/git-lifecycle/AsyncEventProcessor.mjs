/**
 * @fileoverview Async Event Processor for Git Lifecycle Knowledge Hooks
 * Handles async processing of git events with retry logic and error handling
 * @module git-lifecycle/AsyncEventProcessor
 */

import { EventEmitter } from 'node:events';
import { EventQueue } from './EventQueue.mjs';
import { createLogger } from "../utils/logger.mjs";
const logger = createLogger("git-lifecycle:AsyncEventProcessor");

/**
 * @typedef {Object} ProcessorConfig
 * @property {import('./EventQueue.mjs').QueueConfig} [queueConfig] - Queue configuration
 * @property {number} [processingTimeoutMs] - Processing timeout
 * @property {boolean} [enableMetrics] - Enable metrics collection
 * @property {Function} [onError] - Error handler callback
 * @property {Function} [onComplete] - Completion handler callback
 */

/**
 * @typedef {Object} ProcessorMetrics
 * @property {number} totalProcessed - Total events processed
 * @property {number} totalFailed - Total events failed
 * @property {number} averageProcessingTime - Average processing time in ms
 * @property {number} p95ProcessingTime - 95th percentile processing time
 * @property {number} p99ProcessingTime - 99th percentile processing time
 * @property {Map<string, number>} eventTypeCount - Count by event type
 * @property {Map<string, number>} errorTypeCount - Count by error type
 */

/**
 * @typedef {Function} EventProcessor
 * @param {import('./EventQueue.mjs').QueuedEvent} event - Event to process
 * @param {Object} context - Processing context
 * @returns {Promise<Object>} Processing result
 */

/**
 * Async Event Processor with retry logic and error handling
 * @class
 * @extends EventEmitter
 */
export class AsyncEventProcessor extends EventEmitter {
  /**
   * @param {ProcessorConfig} config - Processor configuration
   */
  constructor(config = {}) {
    super();

    /** @type {ProcessorConfig} */
    this.config = {
      queueConfig: config.queueConfig ?? {},
      processingTimeoutMs: config.processingTimeoutMs ?? 30000,
      enableMetrics: config.enableMetrics ?? true,
      onError: config.onError ?? null,
      onComplete: config.onComplete ?? null
    };

    /** @type {EventQueue} */
    this.queue = new EventQueue(this.config.queueConfig);

    /** @type {Map<string, EventProcessor>} */
    this.processors = new Map();

    /** @type {number[]} */
    this.processingTimes = [];

    /** @type {ProcessorMetrics} */
    this.metrics = {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      p95ProcessingTime: 0,
      p99ProcessingTime: 0,
      eventTypeCount: new Map(),
      errorTypeCount: new Map()
    };

    // Wire up queue events
    this._setupQueueHandlers();
  }

  /**
   * Setup queue event handlers
   * @private
   */
  _setupQueueHandlers() {
    this.queue.on('event:processing', async (event) => {
      await this._processEvent(event);
    });

    this.queue.on('batch:ready', async (batch) => {
      await this._processBatch(batch);
    });

    this.queue.on('event:completed', ({ event, result }) => {
      this.emit('event:completed', { event, result });

      if (this.config.onComplete) {
        this.config.onComplete(event, result);
      }
    });

    this.queue.on('event:failed', ({ event, error }) => {
      this.emit('event:failed', { event, error });

      if (this.config.onError) {
        this.config.onError(error, event);
      }
    });

    this.queue.on('event:retry', ({ event, retryDelay }) => {
      this.emit('event:retry', { event, retryDelay });
    });
  }

  /**
   * Register an event processor
   * @param {string} eventType - Event type to handle
   * @param {EventProcessor} processor - Processor function
   */
  registerProcessor(eventType, processor) {
    this.processors.set(eventType, processor);
  }

  /**
   * Register multiple processors
   * @param {Map<string, EventProcessor>} processors - Map of event types to processors
   */
  registerProcessors(processors) {
    for (const [eventType, processor] of processors.entries()) {
      this.registerProcessor(eventType, processor);
    }
  }

  /**
   * Process a single event
   * @private
   * @param {import('./EventQueue.mjs').QueuedEvent} event - Event to process
   */
  async _processEvent(event) {
    const startTime = Date.now();

    try {
      const processor = this.processors.get(event.type);

      if (!processor) {
        throw new Error(`No processor registered for event type: ${event.type}`);
      }

      // Create processing context
      const context = {
        eventId: event.id,
        timestamp: event.timestamp,
        retryCount: event.retryCount,
        timeout: this.config.processingTimeoutMs
      };

      // Process with timeout
      const result = await this._withTimeout(
        processor(event, context),
        this.config.processingTimeoutMs
      );

      // Record processing time
      const processingTime = Date.now() - startTime;
      if (this.config.enableMetrics) {
        this._recordMetrics(event.type, processingTime, null);
      }

      // Mark as complete
      this.queue.complete(event.id, result);

    } catch (error) {
      const processingTime = Date.now() - startTime;

      if (this.config.enableMetrics) {
        this._recordMetrics(event.type, processingTime, error);
      }

      // Handle failure with retry
      const willRetry = this.queue.fail(event.id, error);

      if (!willRetry) {
        logger.error(`Event ${event.id} failed after ${event.retryCount} retries:`, error);
      }
    }
  }

  /**
   * Process a batch of events
   * @private
   * @param {Object} batch - Batch of events
   * @param {string} batch.key - Batch key
   * @param {import('./EventQueue.mjs').QueuedEvent[]} batch.events - Events in batch
   * @param {number} batch.size - Batch size
   */
  async _processBatch(batch) {
    const startTime = Date.now();

    try {
      // Group events by type
      const eventsByType = new Map();

      for (const event of batch.events) {
        if (!eventsByType.has(event.type)) {
          eventsByType.set(event.type, []);
        }
        eventsByType.get(event.type)?.push(event);
      }

      // Process each type in parallel
      const results = await Promise.allSettled(
        Array.from(eventsByType.entries()).map(async ([type, events]) => {
          const processor = this.processors.get(type);

          if (!processor) {
            throw new Error(`No processor registered for event type: ${type}`);
          }

          // Create batch context
          const context = {
            batchKey: batch.key,
            batchSize: events.length,
            timestamp: Date.now(),
            timeout: this.config.processingTimeoutMs
          };

          // Process all events of this type
          return await Promise.all(
            events.map(event => processor(event, context))
          );
        })
      );

      // Handle results
      let successCount = 0;
      let failCount = 0;

      results.forEach((result, index) => {
        const events = Array.from(eventsByType.values())[index];

        if (result.status === 'fulfilled') {
          events?.forEach((event, i) => {
            this.queue.complete(event.id, result.value[i]);
            successCount++;
          });
        } else {
          events?.forEach(event => {
            this.queue.fail(event.id, result.reason);
            failCount++;
          });
        }
      });

      const processingTime = Date.now() - startTime;

      this.emit('batch:completed', {
        key: batch.key,
        size: batch.size,
        successCount,
        failCount,
        processingTime
      });

    } catch (error) {
      // Fail all events in batch
      for (const event of batch.events) {
        this.queue.fail(event.id, error);
      }

      this.emit('batch:failed', {
        key: batch.key,
        size: batch.size,
        error
      });
    }
  }

  /**
   * Execute a promise with timeout
   * @private
   * @param {Promise<any>} promise - Promise to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<any>} Promise result
   */
  async _withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), timeoutMs);
      })
    ]);
  }

  /**
   * Record processing metrics
   * @private
   * @param {string} eventType - Event type
   * @param {number} processingTime - Processing time in ms
   * @param {Error|null} error - Error if any
   */
  _recordMetrics(eventType, processingTime, error) {
    // Update processing times
    this.processingTimes.push(processingTime);

    // Keep only last 1000 times
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift();
    }

    // Update event type count
    const currentCount = this.metrics.eventTypeCount.get(eventType) ?? 0;
    this.metrics.eventTypeCount.set(eventType, currentCount + 1);

    if (error) {
      this.metrics.totalFailed++;

      // Update error type count
      const errorType = error.constructor.name;
      const errorCount = this.metrics.errorTypeCount.get(errorType) ?? 0;
      this.metrics.errorTypeCount.set(errorType, errorCount + 1);
    } else {
      this.metrics.totalProcessed++;
    }

    // Calculate percentiles
    this._calculatePercentiles();
  }

  /**
   * Calculate processing time percentiles
   * @private
   */
  _calculatePercentiles() {
    if (this.processingTimes.length === 0) {
      return;
    }

    const sorted = [...this.processingTimes].sort((a, b) => a - b);
    const total = sorted.reduce((sum, time) => sum + time, 0);

    this.metrics.averageProcessingTime = total / sorted.length;

    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    this.metrics.p95ProcessingTime = sorted[p95Index] ?? 0;
    this.metrics.p99ProcessingTime = sorted[p99Index] ?? 0;
  }

  /**
   * Enqueue an event for processing
   * @param {string} type - Event type
   * @param {Object} data - Event data
   * @param {Object} options - Enqueue options
   * @returns {string} Event ID
   */
  enqueue(type, data, options = {}) {
    return this.queue.enqueue(type, data, options);
  }

  /**
   * Start processing
   */
  start() {
    this.queue.start();
    this.emit('processor:started');
  }

  /**
   * Stop processing
   */
  stop() {
    this.queue.stop();
    this.emit('processor:stopped');
  }

  /**
   * Get current processor status
   * @returns {Object} Processor status
   */
  getStatus() {
    return {
      queue: this.queue.getStatus(),
      metrics: {
        ...this.metrics,
        eventTypeCount: Object.fromEntries(this.metrics.eventTypeCount),
        errorTypeCount: Object.fromEntries(this.metrics.errorTypeCount)
      },
      processors: Array.from(this.processors.keys())
    };
  }

  /**
   * Get processing metrics
   * @returns {ProcessorMetrics} Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      eventTypeCount: new Map(this.metrics.eventTypeCount),
      errorTypeCount: new Map(this.metrics.errorTypeCount)
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      p95ProcessingTime: 0,
      p99ProcessingTime: 0,
      eventTypeCount: new Map(),
      errorTypeCount: new Map()
    };
    this.processingTimes = [];
    this.queue.resetMetrics();
  }

  /**
   * Clear completed events
   */
  clear() {
    this.queue.clear();
  }
}

/**
 * Create a new async event processor
 * @param {ProcessorConfig} config - Processor configuration
 * @returns {AsyncEventProcessor} Processor instance
 */
export function createAsyncEventProcessor(config) {
  return new AsyncEventProcessor(config);
}
