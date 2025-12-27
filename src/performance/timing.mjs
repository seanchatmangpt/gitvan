/**
 * @fileoverview GitVan v4 - Timing Utilities
 *
 * Provides debouncing, throttling, and rate limiting for hook operations.
 * Optimizes performance by controlling execution frequency.
 *
 * Key Features:
 * - Debouncing with leading/trailing edge options
 * - Throttling with configurable windows
 * - Rate limiting with token bucket
 * - Request coalescing
 * - Adaptive timing based on load
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/**
 * Creates a debounced version of a function
 *
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {Object} options - Debounce options
 * @returns {Function} Debounced function
 *
 * @example
 * ```javascript
 * const debouncedSearch = useDebounce(async (query) => {
 *   return await searchGraph(query);
 * }, 300, { leading: false, trailing: true });
 *
 * // Multiple calls within 300ms will only execute once
 * debouncedSearch('user');
 * debouncedSearch('user query');
 * debouncedSearch('user query test');
 * ```
 */
export function useDebounce(fn, wait = 0, options = {}) {
  const config = {
    leading: options.leading || false,
    trailing: options.trailing !== false,
    maxWait: options.maxWait || Infinity,
  };

  let timeoutId = null;
  let maxTimeoutId = null;
  let lastArgs = null;
  let lastThis = null;
  let lastCallTime = 0;
  let result = undefined;
  let pendingPromise = null;
  let pendingResolve = null;

  // Statistics
  const stats = {
    calls: 0,
    executions: 0,
    cancelled: 0,
  };

  function invokeFunc(time) {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = null;
    lastThis = null;
    stats.executions++;

    try {
      result = fn.apply(thisArg, args);
      if (pendingResolve) {
        Promise.resolve(result).then(pendingResolve);
        pendingResolve = null;
        pendingPromise = null;
      }
    } catch (error) {
      if (pendingResolve) {
        pendingResolve = null;
        pendingPromise = null;
      }
      throw error;
    }

    return result;
  }

  function leadingEdge(time) {
    // Reset maxWait timer
    if (config.maxWait < Infinity) {
      maxTimeoutId = setTimeout(timerExpired, config.maxWait);
    }

    // Invoke on leading edge
    if (config.leading) {
      return invokeFunc(time);
    }

    return result;
  }

  function trailingEdge(time) {
    timeoutId = null;

    // Only invoke if we have trailing calls
    if (config.trailing && lastArgs) {
      return invokeFunc(time);
    }

    lastArgs = null;
    lastThis = null;
    return result;
  }

  function timerExpired() {
    const time = Date.now();

    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }

    // Restart the timer
    timeoutId = setTimeout(timerExpired, remainingWait(time));
  }

  function shouldInvoke(time) {
    const timeSinceLastCall = time - lastCallTime;
    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0
    );
  }

  function remainingWait(time) {
    const timeSinceLastCall = time - lastCallTime;
    const remaining = wait - timeSinceLastCall;
    return config.maxWait < Infinity
      ? Math.min(remaining, config.maxWait - timeSinceLastCall)
      : remaining;
  }

  function debounced(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;
    stats.calls++;

    // Create promise for async support
    if (!pendingPromise) {
      pendingPromise = new Promise((resolve) => {
        pendingResolve = resolve;
      });
    }

    if (isInvoking) {
      if (timeoutId === null) {
        leadingEdge(time);
      }
    }

    // Reset the timer
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(timerExpired, wait);

    return pendingPromise;
  }

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
    pendingResolve = null;
    pendingPromise = null;
    stats.cancelled++;
  };

  debounced.flush = () => {
    if (timeoutId !== null) {
      return trailingEdge(Date.now());
    }
    return result;
  };

  debounced.pending = () => {
    return timeoutId !== null;
  };

  debounced.getStats = () => ({
    ...stats,
    efficiency: stats.calls > 0
      ? ((1 - stats.executions / stats.calls) * 100).toFixed(2) + "%"
      : "0%",
  });

  return debounced;
}

/**
 * Creates a throttled version of a function
 *
 * @param {Function} fn - Function to throttle
 * @param {number} wait - Minimum time between executions
 * @param {Object} options - Throttle options
 * @returns {Function} Throttled function
 *
 * @example
 * ```javascript
 * const throttledUpdate = useThrottle(async (data) => {
 *   return await updateGraph(data);
 * }, 100, { leading: true, trailing: true });
 * ```
 */
export function useThrottle(fn, wait = 0, options = {}) {
  const config = {
    leading: options.leading !== false,
    trailing: options.trailing !== false,
  };

  let lastArgs = null;
  let lastThis = null;
  let result = undefined;
  let timeoutId = null;
  let lastInvokeTime = 0;

  // Statistics
  const stats = {
    calls: 0,
    executions: 0,
    throttled: 0,
  };

  function invokeFunc() {
    lastInvokeTime = Date.now();
    result = fn.apply(lastThis, lastArgs);
    lastArgs = null;
    lastThis = null;
    stats.executions++;
    return result;
  }

  function trailingEdge() {
    timeoutId = null;
    if (config.trailing && lastArgs) {
      return invokeFunc();
    }
    lastArgs = null;
    lastThis = null;
    return result;
  }

  function throttled(...args) {
    const time = Date.now();
    const elapsed = time - lastInvokeTime;
    stats.calls++;

    lastArgs = args;
    lastThis = this;

    // First call or enough time has passed
    if (lastInvokeTime === 0 || elapsed >= wait) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (config.leading) {
        return invokeFunc();
      }
    }

    // Set trailing timeout if needed
    if (config.trailing && timeoutId === null) {
      timeoutId = setTimeout(trailingEdge, wait - elapsed);
    }

    stats.throttled++;
    return result;
  }

  throttled.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastInvokeTime = 0;
    lastArgs = null;
    lastThis = null;
  };

  throttled.flush = () => {
    if (timeoutId !== null) {
      return trailingEdge();
    }
    return result;
  };

  throttled.getStats = () => ({
    ...stats,
    throttleRate: stats.calls > 0
      ? ((stats.throttled / stats.calls) * 100).toFixed(2) + "%"
      : "0%",
  });

  return throttled;
}

/**
 * Creates a rate limiter using token bucket algorithm
 *
 * @param {Object} options - Rate limiter options
 * @returns {Object} Rate limiter interface
 *
 * @example
 * ```javascript
 * const limiter = useRateLimiter({
 *   tokensPerInterval: 10,
 *   interval: 1000,
 *   maxBurst: 15
 * });
 *
 * if (limiter.tryAcquire()) {
 *   await performOperation();
 * } else {
 *   await limiter.waitForToken();
 *   await performOperation();
 * }
 * ```
 */
export function useRateLimiter(options = {}) {
  const config = {
    tokensPerInterval: options.tokensPerInterval || 10,
    interval: options.interval || 1000,
    maxBurst: options.maxBurst || options.tokensPerInterval || 10,
  };

  let tokens = config.maxBurst;
  let lastRefill = Date.now();
  const waitingQueue = [];

  // Statistics
  const stats = {
    acquired: 0,
    rejected: 0,
    waited: 0,
    totalWaitTime: 0,
  };

  function refill() {
    const now = Date.now();
    const elapsed = now - lastRefill;
    const tokensToAdd =
      (elapsed / config.interval) * config.tokensPerInterval;

    tokens = Math.min(config.maxBurst, tokens + tokensToAdd);
    lastRefill = now;
  }

  function processQueue() {
    while (waitingQueue.length > 0 && tokens >= 1) {
      const { resolve, startWait } = waitingQueue.shift();
      tokens--;
      stats.acquired++;
      stats.waited++;
      stats.totalWaitTime += Date.now() - startWait;
      resolve();
    }
  }

  return {
    /**
     * Try to acquire a token immediately
     */
    tryAcquire(count = 1) {
      refill();

      if (tokens >= count) {
        tokens -= count;
        stats.acquired += count;
        return true;
      }

      stats.rejected++;
      return false;
    },

    /**
     * Wait until a token is available
     */
    async waitForToken() {
      refill();

      if (tokens >= 1) {
        tokens--;
        stats.acquired++;
        return;
      }

      return new Promise((resolve) => {
        waitingQueue.push({ resolve, startWait: Date.now() });

        // Set up periodic check
        const checkInterval = setInterval(() => {
          refill();
          processQueue();
          if (waitingQueue.length === 0) {
            clearInterval(checkInterval);
          }
        }, config.interval / config.tokensPerInterval);
      });
    },

    /**
     * Get current token count
     */
    getTokens() {
      refill();
      return tokens;
    },

    /**
     * Get time until next token
     */
    getTimeUntilToken() {
      if (tokens >= 1) return 0;
      const tokensNeeded = 1 - tokens;
      return (tokensNeeded / config.tokensPerInterval) * config.interval;
    },

    /**
     * Get statistics
     */
    getStats() {
      return {
        ...stats,
        currentTokens: tokens,
        queueLength: waitingQueue.length,
        avgWaitTime: stats.waited > 0
          ? (stats.totalWaitTime / stats.waited).toFixed(2)
          : 0,
      };
    },

    /**
     * Reset the limiter
     */
    reset() {
      tokens = config.maxBurst;
      lastRefill = Date.now();
      waitingQueue.length = 0;
    },
  };
}

/**
 * Creates a request coalescer for batching multiple similar requests
 *
 * @param {Function} batchFn - Function that processes batched requests
 * @param {Object} options - Coalescer options
 * @returns {Object} Coalescer interface
 *
 * @example
 * ```javascript
 * const coalescer = useCoalescer(async (keys) => {
 *   // Batch fetch all keys at once
 *   return await batchFetch(keys);
 * }, { maxBatchSize: 50, maxWait: 10 });
 *
 * // These calls will be batched into a single request
 * const [result1, result2] = await Promise.all([
 *   coalescer.request('key1'),
 *   coalescer.request('key2')
 * ]);
 * ```
 */
export function useCoalescer(batchFn, options = {}) {
  const config = {
    maxBatchSize: options.maxBatchSize || 100,
    maxWait: options.maxWait || 10,
    keyFn: options.keyFn || ((x) => x),
    hashFn: options.hashFn || JSON.stringify,
  };

  let pendingRequests = new Map();
  let timeoutId = null;
  let batchPromise = null;

  // Statistics
  const stats = {
    requests: 0,
    batches: 0,
    batchedRequests: 0,
    avgBatchSize: 0,
  };

  async function processBatch() {
    if (pendingRequests.size === 0) return;

    const batch = new Map(pendingRequests);
    pendingRequests = new Map();
    timeoutId = null;
    batchPromise = null;

    stats.batches++;
    stats.batchedRequests += batch.size;
    stats.avgBatchSize = stats.batchedRequests / stats.batches;

    try {
      // Extract original keys (not hash keys) from the batch
      const originalKeys = Array.from(batch.values()).map((item) => item.key);
      const results = await batchFn(originalKeys);

      // Resolve individual promises using original keys
      for (const [hashKey, { key, resolve }] of batch) {
        const result = Array.isArray(results)
          ? results.find((r) => config.keyFn(r) === key)
          : results[key];
        resolve(result);
      }
    } catch (error) {
      // Reject all pending promises
      for (const { reject } of batch.values()) {
        reject(error);
      }
    }
  }

  return {
    /**
     * Request a single item (will be batched)
     */
    request(key) {
      const hashKey = config.hashFn(key);
      stats.requests++;

      // Return existing promise if already pending
      if (pendingRequests.has(hashKey)) {
        return pendingRequests.get(hashKey).promise;
      }

      // Create new promise
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });

      pendingRequests.set(hashKey, { key, promise, resolve, reject });

      // Process immediately if batch is full
      if (pendingRequests.size >= config.maxBatchSize) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        processBatch();
      } else if (!timeoutId) {
        // Start batch timer
        timeoutId = setTimeout(processBatch, config.maxWait);
      }

      return promise;
    },

    /**
     * Force process pending batch
     */
    flush() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return processBatch();
    },

    /**
     * Get pending request count
     */
    getPendingCount() {
      return pendingRequests.size;
    },

    /**
     * Get statistics
     */
    getStats() {
      return {
        ...stats,
        pendingRequests: pendingRequests.size,
        batchEfficiency: stats.requests > 0
          ? ((1 - stats.batches / stats.requests) * 100).toFixed(2) + "%"
          : "0%",
      };
    },

    /**
     * Clear pending requests (will reject them)
     */
    clear() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const error = new Error("Coalescer cleared");
      for (const { reject } of pendingRequests.values()) {
        reject(error);
      }
      pendingRequests.clear();
    },
  };
}

/**
 * Creates an adaptive timing controller that adjusts based on load
 *
 * @param {Object} options - Controller options
 * @returns {Object} Adaptive timing controller
 *
 * @example
 * ```javascript
 * const adaptive = useAdaptiveTiming({
 *   minInterval: 10,
 *   maxInterval: 1000,
 *   targetLatency: 50
 * });
 *
 * // Interval adjusts based on measured latency
 * const interval = adaptive.getInterval();
 * await sleep(interval);
 * adaptive.recordLatency(measuredLatency);
 * ```
 */
export function useAdaptiveTiming(options = {}) {
  const config = {
    minInterval: options.minInterval || 10,
    maxInterval: options.maxInterval || 1000,
    targetLatency: options.targetLatency || 50,
    adjustmentFactor: options.adjustmentFactor || 0.1,
    historySize: options.historySize || 20,
  };

  let currentInterval = config.minInterval;
  const latencyHistory = [];

  // Statistics
  const stats = {
    samples: 0,
    adjustments: 0,
    avgLatency: 0,
  };

  function calculateAverageLatency() {
    if (latencyHistory.length === 0) return 0;
    return (
      latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length
    );
  }

  return {
    /**
     * Record a latency measurement
     */
    recordLatency(latency) {
      latencyHistory.push(latency);
      stats.samples++;

      // Trim history
      if (latencyHistory.length > config.historySize) {
        latencyHistory.shift();
      }

      // Calculate average
      stats.avgLatency = calculateAverageLatency();

      // Adjust interval
      if (stats.avgLatency > config.targetLatency) {
        // Increase interval to reduce load
        currentInterval = Math.min(
          config.maxInterval,
          currentInterval * (1 + config.adjustmentFactor)
        );
        stats.adjustments++;
      } else if (stats.avgLatency < config.targetLatency * 0.5) {
        // Decrease interval to increase throughput
        currentInterval = Math.max(
          config.minInterval,
          currentInterval * (1 - config.adjustmentFactor)
        );
        stats.adjustments++;
      }
    },

    /**
     * Get current recommended interval
     */
    getInterval() {
      return Math.round(currentInterval);
    },

    /**
     * Get current average latency
     */
    getAverageLatency() {
      return stats.avgLatency;
    },

    /**
     * Get load factor (ratio of actual to target latency)
     */
    getLoadFactor() {
      return config.targetLatency > 0
        ? stats.avgLatency / config.targetLatency
        : 0;
    },

    /**
     * Reset to initial state
     */
    reset() {
      currentInterval = config.minInterval;
      latencyHistory.length = 0;
      stats.samples = 0;
      stats.adjustments = 0;
      stats.avgLatency = 0;
    },

    /**
     * Get statistics
     */
    getStats() {
      return {
        ...stats,
        currentInterval,
        loadFactor: this.getLoadFactor().toFixed(2),
        historySize: latencyHistory.length,
      };
    },
  };
}

export default {
  useDebounce,
  useThrottle,
  useRateLimiter,
  useCoalescer,
  useAdaptiveTiming,
};
