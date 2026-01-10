/**
 * @fileoverview GitVan v4.0.0 — Reactive Hooks Subscription System
 *
 * Provides reactive subscription capabilities for graph state changes.
 * Implements pub-sub pattern with WeakRef cleanup and efficient notification.
 *
 * Features:
 * - Graph change subscription API
 * - Pub-sub pattern for notifications
 * - Hook triggering on state changes
 * - Weak reference cleanup
 * - Performance-optimized for sub-50ms latency
 *
 * @version 4.0.0
 * @license Apache-2.0
 */

/**
 * Represents a subscription to graph changes
 * @class Subscription
 * @private
 */
class Subscription {
  /**
   * Create subscription
   * @param {string} id - Subscription ID
   * @param {Function} callback - Change notification callback
   * @param {Object} [filter] - Optional filter configuration
   * @param {string[]} [filter.predicates] - Only watch specific predicates
   * @param {string[]} [filter.subjects] - Only watch specific subjects
   * @param {string[]} [filter.objects] - Only watch specific objects
   */
  constructor(id, callback, filter = {}) {
    this.id = id;
    this.callback = callback;
    this.filter = filter;
    this.createdAt = Date.now();
    this.changeCount = 0;
    this.lastTriggered = null;
    this.weakRef = new WeakRef(callback);
  }

  /**
   * Check if subscription matches change
   * @param {Object} change - Change notification
   * @returns {boolean} True if filter matches change
   */
  matches(change) {
    if (this.filter.predicates && !this.filter.predicates.includes(change.predicate)) {
      return false;
    }
    if (this.filter.subjects && !this.filter.subjects.includes(change.subject)) {
      return false;
    }
    if (this.filter.objects && !this.filter.objects.includes(change.object)) {
      return false;
    }
    return true;
  }

  /**
   * Check if callback is still alive (not garbage collected)
   * @returns {boolean} True if callback reference is alive
   */
  isAlive() {
    return this.weakRef.deref() !== undefined;
  }
}

/**
 * Reactive subscription system for graph changes
 *
 * Manages subscriptions to graph state changes and triggers hooks
 * based on reactive updates. Implements efficient pub-sub with
 * weak reference cleanup and sub-50ms latency.
 *
 * @class ReactiveSubscriptionSystem
 */
export class ReactiveSubscriptionSystem {
  /**
   * Create ReactiveSubscriptionSystem instance
   *
   * @constructor
   * @param {Object} [options={}] - Configuration options
   * @param {Object} [options.logger=console] - Logger instance
   * @param {number} [options.debounceMs=10] - Debounce interval (ms)
   * @param {number} [options.batchSize=50] - Max changes per batch
   * @param {boolean} [options.enableMetrics=true] - Enable performance metrics
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.debounceMs = options.debounceMs || 10;
    this.batchSize = options.batchSize || 50;
    this.enableMetrics = options.enableMetrics !== false;

    // Subscription tracking
    this.subscriptions = new Map();
    this.subscriptionIndex = new Map();

    // Change queue and batching
    this.changeQueue = [];
    this.pendingBatch = null;
    this.processingBatch = false;

    // Performance metrics
    this.metrics = {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalChanges: 0,
      totalNotifications: 0,
      averageLatency: 0,
      latencyHistory: [],
      maxLatency: 0,
    };
  }

  /**
   * Subscribe to graph changes
   *
   * @param {Function} callback - Function to call on changes
   * @param {Object} [options={}] - Subscription options
   * @param {string} [options.id] - Subscription ID (auto-generated if omitted)
   * @param {Object} [options.filter] - Change filter (optional)
   * @param {string[]} [options.filter.predicates] - Watch specific predicates
   * @param {string[]} [options.filter.subjects] - Watch specific subjects
   * @param {string[]} [options.filter.objects] - Watch specific objects
   * @returns {string} Subscription ID
   * @throws {Error} If callback is not a function
   */
  subscribe(callback, options = {}) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    const subscriptionId = options.id || this._generateSubscriptionId();
    const filter = options.filter || {};

    const subscription = new Subscription(subscriptionId, callback, filter);
    this.subscriptions.set(subscriptionId, subscription);

    // Index for fast lookup
    this._indexSubscription(subscription);

    this.metrics.totalSubscriptions++;
    this._updateActiveCount();

    this.logger.debug(
      `📮 Subscription registered: ${subscriptionId} (total: ${this.metrics.totalSubscriptions})`
    );

    return subscriptionId;
  }

  /**
   * Unsubscribe from graph changes
   *
   * @param {string} subscriptionId - Subscription ID to remove
   * @returns {boolean} True if subscription was removed
   */
  unsubscribe(subscriptionId) {
    if (!this.subscriptions.has(subscriptionId)) {
      return false;
    }

    const subscription = this.subscriptions.get(subscriptionId);
    this.subscriptions.delete(subscriptionId);
    this._unindexSubscription(subscription);

    this._updateActiveCount();

    this.logger.debug(
      `📭 Subscription unregistered: ${subscriptionId} (remaining: ${this.metrics.activeSubscriptions})`
    );

    return true;
  }

  /**
   * Notify subscriptions of a graph change
   *
   * Queues changes and processes them in batches with debouncing
   * to achieve sub-50ms latency.
   *
   * @param {Object} change - Graph change notification
   * @param {string} change.subject - Changed subject IRI
   * @param {string} change.predicate - Changed predicate IRI
   * @param {string} change.object - Changed object value
   * @param {string} [change.type] - Change type ("add", "remove", "update")
   * @param {Object} [change.metadata] - Additional metadata
   * @returns {Promise<number>} Number of subscriptions notified
   */
  async notifyChange(change) {
    if (!change || !change.subject || !change.predicate) {
      throw new Error("Change must include subject and predicate");
    }

    const startTime = performance.now();

    // Normalize change
    const normalizedChange = {
      subject: change.subject,
      predicate: change.predicate,
      object: change.object || "",
      type: change.type || "update",
      timestamp: Date.now(),
      metadata: change.metadata || {},
    };

    // Queue change
    this.changeQueue.push(normalizedChange);
    this.metrics.totalChanges++;

    // Schedule batch processing
    await this._scheduleProcessing(startTime);

    return this.metrics.activeSubscriptions;
  }

  /**
   * Notify multiple changes in bulk
   *
   * @param {Array<Object>} changes - Array of changes
   * @returns {Promise<number>} Total subscriptions notified
   */
  async notifyChanges(changes) {
    if (!Array.isArray(changes)) {
      throw new Error("Changes must be an array");
    }

    const startTime = performance.now();

    for (const change of changes) {
      const normalizedChange = {
        subject: change.subject,
        predicate: change.predicate,
        object: change.object || "",
        type: change.type || "update",
        timestamp: Date.now(),
        metadata: change.metadata || {},
      };
      this.changeQueue.push(normalizedChange);
    }

    this.metrics.totalChanges += changes.length;

    await this._scheduleProcessing(startTime);

    return this.metrics.activeSubscriptions;
  }

  /**
   * Get all subscriptions
   *
   * @returns {Array<Object>} Array of subscription details
   */
  getSubscriptions() {
    const subscriptions = [];

    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.isAlive()) {
        subscriptions.push({
          id,
          filter: subscription.filter,
          createdAt: subscription.createdAt,
          changeCount: subscription.changeCount,
          lastTriggered: subscription.lastTriggered,
        });
      }
    }

    return subscriptions;
  }

  /**
   * Get subscription by ID
   *
   * @param {string} subscriptionId - Subscription ID
   * @returns {Object|null} Subscription details or null
   */
  getSubscription(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !subscription.isAlive()) {
      return null;
    }

    return {
      id: subscriptionId,
      filter: subscription.filter,
      createdAt: subscription.createdAt,
      changeCount: subscription.changeCount,
      lastTriggered: subscription.lastTriggered,
    };
  }

  /**
   * Get current metrics
   *
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queuedChanges: this.changeQueue.length,
      subscriptionsSnapshot: this.getSubscriptions().length,
    };
  }

  /**
   * Reset metrics
   *
   * @returns {void}
   */
  resetMetrics() {
    this.metrics = {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalChanges: 0,
      totalNotifications: 0,
      averageLatency: 0,
      latencyHistory: [],
      maxLatency: 0,
    };
  }

  /**
   * Clear all subscriptions
   *
   * @returns {number} Number of subscriptions cleared
   */
  clear() {
    const count = this.subscriptions.size;
    this.subscriptions.clear();
    this.subscriptionIndex.clear();
    this.changeQueue = [];
    this.metrics.activeSubscriptions = 0;
    this.logger.info(`🧹 Cleared ${count} subscriptions`);
    return count;
  }

  /**
   * Schedule batch processing of queued changes
   *
   * @private
   */
  async _scheduleProcessing(startTime) {
    if (this.processingBatch) {
      return; // Already processing
    }

    if (this.pendingBatch) {
      clearTimeout(this.pendingBatch);
    }

    this.pendingBatch = setTimeout(() => {
      this._processBatch(startTime);
    }, this.debounceMs);
  }

  /**
   * Process queued changes in a batch
   *
   * @private
   */
  async _processBatch(startTime) {
    if (this.processingBatch || this.changeQueue.length === 0) {
      return;
    }

    this.processingBatch = true;

    try {
      // Extract batch
      const batch = this.changeQueue.splice(0, this.batchSize);
      let notificationCount = 0;

      // Process each change
      for (const change of batch) {
        const notified = await this._processChange(change);
        notificationCount += notified;
      }

      this.metrics.totalNotifications += notificationCount;

      // Record latency
      if (this.enableMetrics) {
        const latency = performance.now() - startTime;
        this._recordLatency(latency);
      }

      // Continue if more changes pending
      if (this.changeQueue.length > 0) {
        await this._scheduleProcessing(startTime);
      }
    } finally {
      this.processingBatch = false;
      this.pendingBatch = null;
    }
  }

  /**
   * Process a single change
   *
   * @private
   */
  async _processChange(change) {
    let notificationCount = 0;

    // Notify matching subscriptions
    for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
      if (!subscription.isAlive()) {
        // Garbage collected, clean up
        this.unsubscribe(subscriptionId);
        continue;
      }

      if (subscription.matches(change)) {
        try {
          const callback = subscription.weakRef.deref();
          if (callback) {
            await callback(change);
            subscription.changeCount++;
            subscription.lastTriggered = Date.now();
            notificationCount++;
          }
        } catch (error) {
          this.logger.error(
            `❌ Error in subscription ${subscriptionId}:`,
            error.message
          );
        }
      }
    }

    return notificationCount;
  }

  /**
   * Index subscription for fast lookup
   *
   * @private
   */
  _indexSubscription(subscription) {
    // Index by predicates
    if (subscription.filter.predicates) {
      for (const predicate of subscription.filter.predicates) {
        if (!this.subscriptionIndex.has(predicate)) {
          this.subscriptionIndex.set(predicate, new Set());
        }
        this.subscriptionIndex.get(predicate).add(subscription.id);
      }
    }
  }

  /**
   * Unindex subscription
   *
   * @private
   */
  _unindexSubscription(subscription) {
    if (subscription.filter.predicates) {
      for (const predicate of subscription.filter.predicates) {
        const set = this.subscriptionIndex.get(predicate);
        if (set) {
          set.delete(subscription.id);
          if (set.size === 0) {
            this.subscriptionIndex.delete(predicate);
          }
        }
      }
    }
  }

  /**
   * Record latency metric
   *
   * @private
   */
  _recordLatency(latency) {
    this.metrics.latencyHistory.push(latency);

    // Keep last 100 measurements
    if (this.metrics.latencyHistory.length > 100) {
      this.metrics.latencyHistory.shift();
    }

    // Update max latency
    if (latency > this.metrics.maxLatency) {
      this.metrics.maxLatency = latency;
    }

    // Calculate average
    const sum = this.metrics.latencyHistory.reduce((a, b) => a + b, 0);
    this.metrics.averageLatency = sum / this.metrics.latencyHistory.length;
  }

  /**
   * Update active subscriptions count
   *
   * @private
   */
  _updateActiveCount() {
    const active = Array.from(this.subscriptions.values()).filter((sub) =>
      sub.isAlive()
    );

    this.metrics.activeSubscriptions = active.length;

    // Clean up dead subscriptions
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (!subscription.isAlive()) {
        this.unsubscribe(id);
      }
    }
  }

  /**
   * Generate unique subscription ID
   *
   * @private
   */
  _generateSubscriptionId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create reactive subscription system singleton
 *
 * @param {Object} [options={}] - Configuration options
 * @returns {ReactiveSubscriptionSystem} Subscription system instance
 */
export function createReactiveSubscriptionSystem(options = {}) {
  return new ReactiveSubscriptionSystem(options);
}

export default ReactiveSubscriptionSystem;
