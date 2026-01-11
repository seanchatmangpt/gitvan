/**
 * @fileoverview Subscription Pattern Engine - Reactive RDF Pattern Matching
 *
 * Implements pattern-based subscriptions for reactive cache invalidation.
 * Watches for RDF pattern matches and triggers callbacks.
 *
 * Features:
 * - Pattern-based subscriptions (SPARQL-like syntax)
 * - Wildcard support (?s, ?p, ?o)
 * - Sub-10ms notification latency
 * - Multiple callback support
 *
 * @version 1.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/**
 * Subscription Pattern Engine for reactive RDF matching
 *
 * @class SubscriptionPatternEngine
 *
 * @param {Object} store - UnRDF store instance
 * @param {Object} [options={}] - Configuration
 * @param {number} [options.maxLatency=10] - Max latency in ms
 *
 * @example
 * const engine = new SubscriptionPatternEngine(store);
 * await engine.subscribe(
 *   { subject: '?s', predicate: 'rdf:type', object: 'ex:Workflow' },
 *   (match) => console.log('Matched:', match)
 * );
 */
export class SubscriptionPatternEngine {
  constructor(store, options = {}) {
    this.store = store;
    this.maxLatency = options.maxLatency || 10;

    // Map pattern hash -> { callbacks: [], pattern }
    this.subscriptions = new Map();

    // Store all added quads for pattern matching
    this.quadBuffer = [];
    this.maxBufferSize = 10000;

    // Active listeners
    this.listeners = new Map();
  }

  /**
   * Subscribe to RDF pattern matches
   *
   * @async
   * @param {Object} pattern - Pattern { subject, predicate, object }
   * @param {Function} callback - Callback(match) on pattern match
   * @returns {Promise<string>} Subscription ID
   *
   * @example
   * const subId = await engine.subscribe(
   *   { subject: '?s', predicate: '?p', object: '?o' },
   *   (match) => console.log('Triple added:', match)
   * );
   */
  async subscribe(pattern, callback) {
    const patternHash = this._hashPattern(pattern);

    if (!this.subscriptions.has(patternHash)) {
      this.subscriptions.set(patternHash, {
        callbacks: [],
        pattern,
      });
    }

    const subscription = this.subscriptions.get(patternHash);
    subscription.callbacks.push(callback);

    // Set up store listener for this pattern
    await this._setupStoreListener(pattern, patternHash);

    return patternHash;
  }

  /**
   * Subscribe to pattern matches with named callback
   *
   * @async
   * @param {Object} pattern - RDF pattern
   * @param {Function} callback - Callback function
   * @returns {Promise<void>}
   */
  async onPatternMatch(pattern, callback) {
    await this.subscribe(pattern, callback);
  }

  /**
   * Unsubscribe from pattern
   *
   * @async
   * @param {string} subscriptionId - ID from subscribe()
   * @param {Function} [callback] - Specific callback to remove
   * @returns {Promise<void>}
   */
  async unsubscribe(subscriptionId, callback) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) {
      return;
    }

    if (callback) {
      const idx = subscription.callbacks.indexOf(callback);
      if (idx > -1) {
        subscription.callbacks.splice(idx, 1);
      }
    } else {
      subscription.callbacks = [];
    }

    // Clean up if no callbacks remain
    if (subscription.callbacks.length === 0) {
      this.subscriptions.delete(subscriptionId);
      this.listeners.delete(subscriptionId);
    }
  }

  /**
   * Test if quad matches pattern
   *
   * @param {Object} quad - RDF quad
   * @param {Object} pattern - { subject, predicate, object }
   * @returns {boolean} True if matches
   */
  matches(quad, pattern) {
    // Extract values from quad
    const quadSubject = quad.subject?.value || quad.subject;
    const quadPredicate = quad.predicate?.value || quad.predicate;
    const quadObject = quad.object?.value || quad.object;

    // Check subject
    if (pattern.subject && pattern.subject !== '?s') {
      if (quadSubject !== pattern.subject) {
        return false;
      }
    }

    // Check predicate
    if (pattern.predicate && pattern.predicate !== '?p') {
      if (quadPredicate !== pattern.predicate) {
        return false;
      }
    }

    // Check object
    if (pattern.object && pattern.object !== '?o') {
      if (quadObject !== pattern.object) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract variables from quad based on pattern
   *
   * @param {Object} quad - RDF quad
   * @param {Object} pattern - Pattern with variables
   * @returns {Object} Extracted bindings
   */
  extractBindings(quad, pattern) {
    const bindings = {};

    if (pattern.subject === '?s') {
      bindings.s = quad.subject?.value || quad.subject;
    }

    if (pattern.predicate === '?p') {
      bindings.p = quad.predicate?.value || quad.predicate;
    }

    if (pattern.object === '?o') {
      bindings.o = quad.object?.value || quad.object;
    }

    return bindings;
  }

  /**
   * Get all subscriptions
   *
   * @returns {Map} Map of pattern hash -> subscription
   */
  getSubscriptions() {
    return new Map(this.subscriptions);
  }

  /**
   * Check if pattern has subscribers
   *
   * @param {Object} pattern - RDF pattern
   * @returns {boolean} True if subscribed
   */
  hasSubscribers(pattern) {
    const hash = this._hashPattern(pattern);
    const sub = this.subscriptions.get(hash);
    return sub && sub.callbacks.length > 0;
  }

  /**
   * Get subscriber count for pattern
   *
   * @param {Object} pattern - RDF pattern
   * @returns {number} Number of callbacks
   */
  getSubscriberCount(pattern) {
    const hash = this._hashPattern(pattern);
    const sub = this.subscriptions.get(hash);
    return sub ? sub.callbacks.length : 0;
  }

  /**
   * Clear all subscriptions
   *
   * @returns {void}
   */
  clear() {
    this.subscriptions.clear();
    this.listeners.clear();
    this.quadBuffer = [];
  }

  /**
   * Get subscription performance stats
   *
   * @returns {Object} Statistics object
   */
  getStats() {
    const totalCallbacks = Array.from(this.subscriptions.values()).reduce(
      (sum, sub) => sum + sub.callbacks.length,
      0,
    );

    return {
      patternCount: this.subscriptions.size,
      callbackCount: totalCallbacks,
      bufferSize: this.quadBuffer.length,
      maxBufferSize: this.maxBufferSize,
      listenerCount: this.listeners.size,
    };
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Hash pattern for map key
   *
   * @private
   * @param {Object} pattern - RDF pattern
   * @returns {string} Hash key
   */
  _hashPattern(pattern) {
    const key = `${pattern.subject || '*'}|${pattern.predicate || '*'}|${pattern.object || '*'}`;
    return key.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0).toString(36);
  }

  /**
   * Set up store listener for pattern
   *
   * @private
   * @async
   * @param {Object} pattern - RDF pattern
   * @param {string} patternHash - Pattern hash
   */
  async _setupStoreListener(pattern, patternHash) {
    if (this.listeners.has(patternHash)) {
      return; // Already listening
    }

    // Create listener for this pattern
    const listener = (quad) => {
      this._handleQuadAdded(quad, pattern, patternHash);
    };

    this.listeners.set(patternHash, listener);

    // Hook into store's quad addition (implementation depends on store)
    if (this.store.on) {
      this.store.on('quad:added', listener);
    }
  }

  /**
   * Handle quad added to store
   *
   * @private
   * @param {Object} quad - Added quad
   * @param {Object} pattern - Pattern
   * @param {string} patternHash - Pattern hash
   */
  _handleQuadAdded(quad, pattern, patternHash) {
    const startTime = performance.now();

    // Check if matches pattern
    if (!this.matches(quad, pattern)) {
      return;
    }

    // Extract variable bindings
    const bindings = this.extractBindings(quad, pattern);

    // Get subscription callbacks
    const subscription = this.subscriptions.get(patternHash);
    if (!subscription) {
      return;
    }

    // Execute callbacks
    for (const callback of subscription.callbacks) {
      try {
        callback({
          quad,
          bindings,
          pattern,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Subscription callback error:', error);
      }
    }

    const elapsed = performance.now() - startTime;

    // Warn if latency exceeded
    if (elapsed > this.maxLatency) {
      console.warn(
        `Pattern subscription latency exceeded: ${elapsed.toFixed(2)}ms > ${this.maxLatency}ms`,
      );
    }

    // Add to buffer
    this.quadBuffer.push({ quad, bindings, elapsed });
    if (this.quadBuffer.length > this.maxBufferSize) {
      this.quadBuffer.shift();
    }
  }

  /**
   * Query for existing triples matching pattern
   *
   * @private
   * @async
   * @param {Object} pattern - RDF pattern
   * @returns {Promise<Array>} Matching quads
   */
  async _queryExistingTriples(pattern) {
    try {
      // Build SPARQL query from pattern
      const sparql = this._patternToSPARQL(pattern);

      const results = await this.store.query(sparql);
      return results || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Convert pattern to SPARQL query
   *
   * @private
   * @param {Object} pattern - RDF pattern
   * @returns {string} SPARQL query
   */
  _patternToSPARQL(pattern) {
    return `
      SELECT ${pattern.subject} ${pattern.predicate} ${pattern.object}
      WHERE {
        ${pattern.subject || '?s'} ${pattern.predicate || '?p'} ${pattern.object || '?o'} .
      }
    `;
  }
}
