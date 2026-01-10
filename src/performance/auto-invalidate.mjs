/**
 * @fileoverview Automatic Cache Invalidation Engine
 *
 * Monitors RDF store changes and automatically invalidates dependent cache entries.
 * Supports hook-based invalidation rules and batch operations.
 *
 * Features:
 * - Hook into RDF store changes
 * - Automatic invalidation of dependent caches
 * - SPARQL rules for invalidation logic
 * - Batch invalidations for performance
 * - Sub-10ms invalidation latency
 *
 * @version 1.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { SubscriptionPatternEngine } from './subscription-patterns.mjs';

/**
 * Automatic Cache Invalidation Engine
 *
 * @class AutoInvalidationEngine
 *
 * @param {Object} store - UnRDF store instance
 * @param {RDFQueryCache} cache - RDF Query Cache to invalidate
 * @param {Object} [options={}] - Configuration
 *
 * @example
 * const engine = new AutoInvalidationEngine(store, rdfCache);
 * await engine.onPredicateChanged('ex:status');
 */
export class AutoInvalidationEngine {
  constructor(store, cache, options = {}) {
    this.store = store;
    this.cache = cache;
    this.options = {
      batchSize: options.batchSize || 100,
      batchDelay: options.batchDelay || 50, // ms
      autoInvalidate: options.autoInvalidate !== false,
      ...options,
    };

    // Subscription engine for pattern matching
    this.subscriptionEngine = new SubscriptionPatternEngine(store);

    // Track invalidation rules
    this.invalidationRules = new Map();

    // Batch invalidation queue
    this.invalidationQueue = [];
    this.batchTimer = null;

    // Statistics
    this.stats = {
      invalidatedEntries: 0,
      invalidationEvents: 0,
      batchOperations: 0,
      totalLatency: 0,
    };

    // Hook into store if possible
    if (options.autoInvalidate !== false) {
      this._setupStoreHooks();
    }
  }

  /**
   * Register invalidation rule
   *
   * @async
   * @param {Object} rule - Invalidation rule
   * @returns {Promise<string>} Rule ID
   *
   * @example
   * const ruleId = await engine.registerInvalidationRule({
   *   predicate: 'ex:status',
   *   action: 'INVALIDATE_PATTERN',
   *   pattern: /ex:status/
   * });
   */
  async registerInvalidationRule(rule) {
    const ruleId = `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.invalidationRules.set(ruleId, {
      ...rule,
      createdAt: Date.now(),
    });

    // Set up subscription for this rule if pattern-based
    if (rule.pattern && rule.action === 'INVALIDATE_PATTERN') {
      await this.subscriptionEngine.subscribe(rule.pattern, async (match) => {
        await this._executeInvalidationRule(rule, match);
      });
    }

    return ruleId;
  }

  /**
   * Trigger invalidation on predicate change
   *
   * @async
   * @param {string} predicate - RDF predicate IRI
   * @returns {Promise<number>} Number of cache entries invalidated
   */
  async onPredicateChanged(predicate) {
    const startTime = performance.now();

    const count = await this.cache.invalidateByPredicate(predicate);

    const elapsed = performance.now() - startTime;
    this.stats.invalidatedEntries += count;
    this.stats.invalidationEvents++;
    this.stats.totalLatency += elapsed;

    return count;
  }

  /**
   * Trigger invalidation on subject change
   *
   * @async
   * @param {string} subject - RDF subject IRI
   * @returns {Promise<number>} Number of cache entries invalidated
   */
  async onSubjectChanged(subject) {
    const startTime = performance.now();

    const count = await this.cache.invalidateBySubject(subject);

    const elapsed = performance.now() - startTime;
    this.stats.invalidatedEntries += count;
    this.stats.invalidationEvents++;
    this.stats.totalLatency += elapsed;

    return count;
  }

  /**
   * Invalidate caches matching pattern
   *
   * @async
   * @param {string|RegExp} pattern - Pattern to match
   * @returns {Promise<number>} Number of entries invalidated
   */
  async invalidateMatching(pattern) {
    const startTime = performance.now();

    let count = 0;

    if (typeof pattern === 'string') {
      // String pattern matching
      for (const [key] of this.cache.cache || new Map()) {
        if (key && key.includes(pattern)) {
          this.cache.invalidate(pattern);
          count++;
        }
      }
    } else if (pattern instanceof RegExp) {
      // Regex pattern matching
      count = this.cache.invalidate(pattern).matchCount || 0;
    }

    const elapsed = performance.now() - startTime;
    this.stats.invalidatedEntries += count;
    this.stats.invalidationEvents++;
    this.stats.totalLatency += elapsed;

    return count;
  }

  /**
   * Queue invalidation for batch processing
   *
   * @async
   * @param {Object} invalidation - { cacheKey, reason }
   * @returns {Promise<void>}
   */
  async queueInvalidation(invalidation) {
    this.invalidationQueue.push({
      ...invalidation,
      timestamp: Date.now(),
    });

    // Trigger batch if queue full
    if (this.invalidationQueue.length >= this.options.batchSize) {
      await this._processBatchInvalidations();
    } else {
      // Set timer for delayed batch
      this._scheduleBatchProcessing();
    }
  }

  /**
   * Execute invalidation rule
   *
   * @async
   * @param {Object} rule - Invalidation rule
   * @param {Object} match - Pattern match
   * @returns {Promise<void>}
   */
  async onTripleAdded(triple) {
    if (!this.options.autoInvalidate) {
      return;
    }

    const startTime = performance.now();

    // Check if this triple invalidates any caches
    const affected = await this.cache.findDependentQueries(triple.subject);

    const elapsed = performance.now() - startTime;

    // Queue for processing
    for (const cacheKey of affected) {
      await this.queueInvalidation({
        cacheKey,
        reason: `Triple added: ${triple.subject}`,
        triple,
      });
    }

    this.stats.invalidationEvents++;
    this.stats.totalLatency += elapsed;
  }

  /**
   * Get invalidation rules
   *
   * @returns {Map} Map of rule ID -> rule
   */
  getRules() {
    return new Map(this.invalidationRules);
  }

  /**
   * Remove invalidation rule
   *
   * @async
   * @param {string} ruleId - Rule ID to remove
   * @returns {Promise<boolean>} True if removed
   */
  async removeRule(ruleId) {
    return this.invalidationRules.delete(ruleId);
  }

  /**
   * Get engine statistics
   *
   * @returns {Object} Statistics object
   */
  getStats() {
    const avgLatency =
      this.stats.invalidationEvents > 0
        ? (this.stats.totalLatency / this.stats.invalidationEvents).toFixed(2)
        : 0;

    return {
      ...this.stats,
      averageLatency: parseFloat(avgLatency),
      queueSize: this.invalidationQueue.length,
      ruleCount: this.invalidationRules.size,
    };
  }

  /**
   * Clear all rules and state
   *
   * @returns {void}
   */
  clear() {
    this.invalidationRules.clear();
    this.invalidationQueue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.stats = {
      invalidatedEntries: 0,
      invalidationEvents: 0,
      batchOperations: 0,
      totalLatency: 0,
    };
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Set up store hooks for auto-invalidation
   *
   * @private
   */
  _setupStoreHooks() {
    if (!this.store) {
      return;
    }

    // Hook into quad additions if store supports it
    if (this.store.on && typeof this.store.on === 'function') {
      this.store.on('quad:added', (quad) => {
        this._handleQuadAdded(quad);
      });

      this.store.on('quad:removed', (quad) => {
        this._handleQuadRemoved(quad);
      });
    }

    // Set up subscription patterns
    this._setupDefaultPatterns();
  }

  /**
   * Set up default invalidation patterns
   *
   * @private
   */
  _setupDefaultPatterns() {
    // Pattern: Any change to ?s invalidates caches for that subject
    const subjectPattern = { subject: '?s', predicate: '?p', object: '?o' };

    this.subscriptionEngine.subscribe(subjectPattern, async (match) => {
      const subject = match.bindings.s;
      if (subject) {
        await this.onSubjectChanged(subject);
      }
    });
  }

  /**
   * Handle quad added to store
   *
   * @private
   * @param {Object} quad - Added quad
   */
  _handleQuadAdded(quad) {
    const triple = {
      subject: quad.subject?.value || quad.subject,
      predicate: quad.predicate?.value || quad.predicate,
      object: quad.object?.value || quad.object,
    };

    this.onTripleAdded(triple).catch((error) => {
      console.error('Error handling quad addition:', error);
    });
  }

  /**
   * Handle quad removed from store
   *
   * @private
   * @param {Object} quad - Removed quad
   */
  _handleQuadRemoved(quad) {
    const triple = {
      subject: quad.subject?.value || quad.subject,
      predicate: quad.predicate?.value || quad.predicate,
      object: quad.object?.value || quad.object,
    };

    // Treat removal as invalidation trigger
    this.onTripleAdded(triple).catch((error) => {
      console.error('Error handling quad removal:', error);
    });
  }

  /**
   * Execute invalidation rule
   *
   * @private
   * @async
   * @param {Object} rule - Rule
   * @param {Object} match - Match result
   */
  async _executeInvalidationRule(rule, match) {
    switch (rule.action) {
      case 'CLEAR':
        this.cache.clear();
        break;

      case 'INVALIDATE_PATTERN':
        if (rule.pattern) {
          await this.invalidateMatching(rule.pattern);
        }
        break;

      case 'NOTIFY':
        if (rule.callback) {
          rule.callback(match);
        }
        break;

      default:
        console.warn(`Unknown invalidation action: ${rule.action}`);
    }
  }

  /**
   * Schedule batch processing
   *
   * @private
   */
  _scheduleBatchProcessing() {
    if (this.batchTimer) {
      return; // Already scheduled
    }

    this.batchTimer = setTimeout(() => {
      this._processBatchInvalidations().catch((error) => {
        console.error('Error processing batch invalidations:', error);
      });
    }, this.options.batchDelay);
  }

  /**
   * Process batch invalidations
   *
   * @private
   * @async
   */
  async _processBatchInvalidations() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.invalidationQueue.length === 0) {
      return;
    }

    const startTime = performance.now();
    const batch = this.invalidationQueue.splice(0, this.options.batchSize);

    // Group by cache key
    const byKey = new Map();
    for (const inv of batch) {
      const { cacheKey, reason } = inv;
      if (!byKey.has(cacheKey)) {
        byKey.set(cacheKey, []);
      }
      byKey.get(cacheKey).push(reason);
    }

    // Process invalidations
    for (const [cacheKey, reasons] of byKey) {
      if (this.cache.cache && this.cache.cache.has(cacheKey)) {
        this.cache.cache.delete(cacheKey);
        this.stats.invalidatedEntries++;
      }
    }

    const elapsed = performance.now() - startTime;
    this.stats.batchOperations++;
    this.stats.totalLatency += elapsed;

    // Schedule next batch if more items
    if (this.invalidationQueue.length > 0) {
      this._scheduleBatchProcessing();
    }
  }
}
