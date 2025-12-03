/**
 * @fileoverview Event Queue for Git Lifecycle Knowledge Hooks
 * Manages async event processing with batching, prioritization, and retry logic
 * @module git-lifecycle/EventQueue
 */

import { EventEmitter } from 'node:events';

/**
 * @typedef {Object} QueuedEvent
 * @property {string} id - Unique event identifier
 * @property {string} type - Event type (commit, push, merge, etc.)
 * @property {Object} data - Event payload
 * @property {number} timestamp - Event creation timestamp
 * @property {number} priority - Event priority (0-10, higher = more important)
 * @property {number} retryCount - Number of retry attempts
 * @property {number} maxRetries - Maximum retry attempts
 * @property {string} status - Event status (pending, processing, completed, failed)
 * @property {Error|null} error - Last error if any
 */

/**
 * @typedef {Object} BatchConfig
 * @property {number} maxSize - Maximum batch size
 * @property {number} maxWaitMs - Maximum wait time in milliseconds
 * @property {string[]} eventTypes - Event types to batch together
 */

/**
 * @typedef {Object} QueueConfig
 * @property {number} maxConcurrency - Maximum concurrent processors
 * @property {number} defaultPriority - Default event priority
 * @property {number} maxRetries - Default max retry attempts
 * @property {number} retryDelayMs - Base retry delay in milliseconds
 * @property {boolean} enableBatching - Enable batch processing
 * @property {BatchConfig[]} batchConfigs - Batch configurations
 */

/**
 * Event Queue with batching, prioritization, and retry logic
 * @class
 * @extends EventEmitter
 */
export class EventQueue extends EventEmitter {
  /**
   * @param {QueueConfig} config - Queue configuration
   */
  constructor(config = {}) {
    super();

    /** @type {QueueConfig} */
    this.config = {
      maxConcurrency: config.maxConcurrency ?? 5,
      defaultPriority: config.defaultPriority ?? 5,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
      enableBatching: config.enableBatching ?? true,
      batchConfigs: config.batchConfigs ?? [
        {
          maxSize: 100,
          maxWaitMs: 5000,
          eventTypes: ['commit', 'file-change']
        },
        {
          maxSize: 50,
          maxWaitMs: 3000,
          eventTypes: ['push', 'pull']
        },
        {
          maxSize: 10,
          maxWaitMs: 1000,
          eventTypes: ['merge', 'rebase', 'cherry-pick']
        }
      ]
    };

    /** @type {Map<string, QueuedEvent>} */
    this.events = new Map();

    /** @type {Map<string, QueuedEvent[]>} */
    this.batches = new Map();

    /** @type {Map<string, NodeJS.Timeout>} */
    this.batchTimers = new Map();

    /** @type {Set<string>} */
    this.processing = new Set();

    /** @type {boolean} */
    this.isRunning = false;

    /** @type {number} */
    this.eventCounter = 0;

    /** @type {Map<string, number>} */
    this.metrics = new Map([
      ['enqueued', 0],
      ['processed', 0],
      ['failed', 0],
      ['retried', 0],
      ['batched', 0]
    ]);
  }

  /**
   * Enqueue an event for processing
   * @param {string} type - Event type
   * @param {Object} data - Event data
   * @param {Object} options - Enqueue options
   * @param {number} [options.priority] - Event priority
   * @param {number} [options.maxRetries] - Max retry attempts
   * @returns {string} Event ID
   */
  enqueue(type, data, options = {}) {
    const eventId = `${type}-${Date.now()}-${++this.eventCounter}`;

    /** @type {QueuedEvent} */
    const event = {
      id: eventId,
      type,
      data,
      timestamp: Date.now(),
      priority: options.priority ?? this.config.defaultPriority,
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.config.maxRetries,
      status: 'pending',
      error: null
    };

    this.events.set(eventId, event);
    this.metrics.set('enqueued', (this.metrics.get('enqueued') ?? 0) + 1);

    this.emit('event:enqueued', event);

    // Add to batch if batching is enabled
    if (this.config.enableBatching) {
      this._addToBatch(event);
    }

    // Start processing if not already running
    if (!this.isRunning) {
      this.start();
    }

    return eventId;
  }

  /**
   * Add event to appropriate batch
   * @private
   * @param {QueuedEvent} event - Event to batch
   */
  _addToBatch(event) {
    const batchConfig = this.config.batchConfigs.find(
      config => config.eventTypes.includes(event.type)
    );

    if (!batchConfig) {
      return; // No batching for this event type
    }

    const batchKey = batchConfig.eventTypes.join(',');

    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, []);
    }

    const batch = this.batches.get(batchKey);
    batch?.push(event);

    // Clear existing timer
    const existingTimer = this.batchTimers.get(batchKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Process batch if size limit reached
    if (batch && batch.length >= batchConfig.maxSize) {
      this._processBatch(batchKey);
      return;
    }

    // Set timer to process batch after max wait time
    const timer = setTimeout(() => {
      this._processBatch(batchKey);
    }, batchConfig.maxWaitMs);

    this.batchTimers.set(batchKey, timer);
  }

  /**
   * Process a batch of events
   * @private
   * @param {string} batchKey - Batch identifier
   */
  _processBatch(batchKey) {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear timer
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    // Emit batch event
    this.emit('batch:ready', {
      key: batchKey,
      events: [...batch],
      size: batch.length
    });

    // Update metrics
    this.metrics.set('batched', (this.metrics.get('batched') ?? 0) + batch.length);

    // Clear batch
    this.batches.set(batchKey, []);
  }

  /**
   * Get next event to process based on priority
   * @private
   * @returns {QueuedEvent|null} Next event or null
   */
  _getNextEvent() {
    let nextEvent = null;
    let highestPriority = -1;

    for (const event of this.events.values()) {
      if (event.status === 'pending' && !this.processing.has(event.id)) {
        if (event.priority > highestPriority) {
          highestPriority = event.priority;
          nextEvent = event;
        }
      }
    }

    return nextEvent;
  }

  /**
   * Start processing events
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this._processNext();
  }

  /**
   * Stop processing events
   */
  stop() {
    this.isRunning = false;

    // Clear all batch timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
  }

  /**
   * Process next event in queue
   * @private
   */
  _processNext() {
    if (!this.isRunning) {
      return;
    }

    // Check if we can process more events
    if (this.processing.size >= this.config.maxConcurrency) {
      // Wait and try again
      setTimeout(() => this._processNext(), 100);
      return;
    }

    const event = this._getNextEvent();
    if (!event) {
      // No events to process, wait and try again
      setTimeout(() => this._processNext(), 100);
      return;
    }

    // Mark as processing
    event.status = 'processing';
    this.processing.add(event.id);

    // Emit processing event
    this.emit('event:processing', event);

    // Process immediately
    this._processNext();
  }

  /**
   * Mark event as completed
   * @param {string} eventId - Event ID
   * @param {Object} result - Processing result
   */
  complete(eventId, result) {
    const event = this.events.get(eventId);
    if (!event) {
      return;
    }

    event.status = 'completed';
    this.processing.delete(eventId);
    this.events.delete(eventId);

    this.metrics.set('processed', (this.metrics.get('processed') ?? 0) + 1);

    this.emit('event:completed', { event, result });
  }

  /**
   * Mark event as failed and handle retry
   * @param {string} eventId - Event ID
   * @param {Error} error - Error that occurred
   * @returns {boolean} True if retry scheduled, false if max retries reached
   */
  fail(eventId, error) {
    const event = this.events.get(eventId);
    if (!event) {
      return false;
    }

    event.error = error;
    event.retryCount++;
    this.processing.delete(eventId);

    // Check if we should retry
    if (event.retryCount < event.maxRetries) {
      event.status = 'pending';

      const retryDelay = this.config.retryDelayMs * Math.pow(2, event.retryCount - 1);

      setTimeout(() => {
        this.emit('event:retry', { event, retryDelay });
      }, retryDelay);

      this.metrics.set('retried', (this.metrics.get('retried') ?? 0) + 1);

      return true;
    }

    // Max retries reached
    event.status = 'failed';
    this.events.delete(eventId);

    this.metrics.set('failed', (this.metrics.get('failed') ?? 0) + 1);

    this.emit('event:failed', { event, error });

    return false;
  }

  /**
   * Get current queue status
   * @returns {Object} Queue status
   */
  getStatus() {
    const pending = Array.from(this.events.values()).filter(e => e.status === 'pending').length;
    const processing = this.processing.size;
    const total = this.events.size;

    return {
      isRunning: this.isRunning,
      pending,
      processing,
      total,
      metrics: Object.fromEntries(this.metrics),
      batches: Object.fromEntries(
        Array.from(this.batches.entries()).map(([key, events]) => [key, events.length])
      )
    };
  }

  /**
   * Get events by status
   * @param {string} status - Event status
   * @returns {QueuedEvent[]} Events with given status
   */
  getEventsByStatus(status) {
    return Array.from(this.events.values()).filter(e => e.status === status);
  }

  /**
   * Get events by type
   * @param {string} type - Event type
   * @returns {QueuedEvent[]} Events of given type
   */
  getEventsByType(type) {
    return Array.from(this.events.values()).filter(e => e.type === type);
  }

  /**
   * Clear all completed and failed events
   */
  clear() {
    for (const [id, event] of this.events.entries()) {
      if (event.status === 'completed' || event.status === 'failed') {
        this.events.delete(id);
      }
    }
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    for (const key of this.metrics.keys()) {
      this.metrics.set(key, 0);
    }
  }
}

/**
 * Create a new event queue instance
 * @param {QueueConfig} config - Queue configuration
 * @returns {EventQueue} Event queue instance
 */
export function createEventQueue(config) {
  return new EventQueue(config);
}
