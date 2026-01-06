import { createLogger } from "../utils/logger.mjs";
const logger = createLogger("performance:subscriptions");

/**
 * @fileoverview GitVan v4 - Selective Subscription System
 *
 * Implements efficient subscription patterns for hook-based state management.
 * Reduces unnecessary re-computations through selective updates and
 * subscription optimization.
 *
 * Key Features:
 * - Selective state subscriptions
 * - Path-based subscriptions
 * - Batch notification handling
 * - Subscription deduplication
 * - Lazy initialization patterns
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

/**
 * Creates a selective subscription store
 *
 * @param {Object} initialState - Initial state object
 * @param {Object} options - Store options
 * @returns {Object} Store interface
 *
 * @example
 * ```javascript
 * const store = createSelectiveStore({
 *   users: [],
 *   settings: { theme: 'dark' }
 * });
 *
 * // Subscribe to specific path
 * store.subscribe(['settings', 'theme'], (theme) => {
 *   logger.info('Theme changed:', theme);
 * });
 *
 * // Update triggers only relevant subscribers
 * store.set(['settings', 'theme'], 'light');
 * ```
 */
export function createSelectiveStore(initialState = {}, options = {}) {
  let state = { ...initialState };
  const subscribers = new Map();
  const pathSubscribers = new Map();
  let updateBatch = [];
  let batchTimeout = null;

  const config = {
    batchDelay: options.batchDelay || 16, // ~1 frame
    enableBatching: options.enableBatching !== false,
    deepCompare: options.deepCompare || false,
  };

  // Statistics
  const stats = {
    updates: 0,
    notifications: 0,
    batchedNotifications: 0,
    subscriberCount: 0,
    pathSubscriberCount: 0,
  };

  /**
   * Get value at path
   */
  function getAtPath(obj, path) {
    if (!path || path.length === 0) return obj;

    let current = obj;
    for (const key of path) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  }

  /**
   * Set value at path (immutably)
   */
  function setAtPath(obj, path, value) {
    if (!path || path.length === 0) return value;

    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    let current = result;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      current[key] = Array.isArray(current[key])
        ? [...current[key]]
        : { ...current[key] };
      current = current[key];
    }

    current[path[path.length - 1]] = value;
    return result;
  }

  /**
   * Check if two values are equal
   */
  function isEqual(a, b) {
    if (config.deepCompare) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return Object.is(a, b);
  }

  /**
   * Notify subscribers about a change
   */
  function notifySubscribers(path, oldValue, newValue) {
    // Notify path subscribers
    const pathKey = path.join(".");
    if (pathSubscribers.has(pathKey)) {
      for (const callback of pathSubscribers.get(pathKey)) {
        callback(newValue, oldValue, path);
        stats.notifications++;
      }
    }

    // Notify parent path subscribers
    for (let i = path.length - 1; i >= 0; i--) {
      const parentPath = path.slice(0, i).join(".");
      if (pathSubscribers.has(parentPath)) {
        const parentValue = getAtPath(state, path.slice(0, i));
        for (const callback of pathSubscribers.get(parentPath)) {
          callback(parentValue, null, path.slice(0, i));
          stats.notifications++;
        }
      }
    }

    // Notify global subscribers
    if (subscribers.size > 0) {
      for (const callback of subscribers.values()) {
        callback(state, path);
        stats.notifications++;
      }
    }
  }

  /**
   * Process batched updates
   */
  function processBatch() {
    if (updateBatch.length === 0) return;

    const updates = [...updateBatch];
    updateBatch = [];
    batchTimeout = null;

    // Group notifications by affected paths
    const affectedPaths = new Set();
    for (const { path } of updates) {
      affectedPaths.add(path.join("."));
    }

    // Notify once per affected path
    for (const pathStr of affectedPaths) {
      const path = pathStr.split(".");
      const value = getAtPath(state, path);
      notifySubscribers(path, undefined, value);
    }

    stats.batchedNotifications += affectedPaths.size;
  }

  return {
    /**
     * Get current state
     */
    getState() {
      return state;
    },

    /**
     * Get value at path
     */
    get(path = []) {
      return getAtPath(state, path);
    },

    /**
     * Set value at path
     */
    set(path, value) {
      const oldValue = getAtPath(state, path);
      if (isEqual(oldValue, value)) return;

      state = setAtPath(state, path, value);
      stats.updates++;

      if (config.enableBatching) {
        updateBatch.push({ path, oldValue, newValue: value });
        if (!batchTimeout) {
          batchTimeout = setTimeout(processBatch, config.batchDelay);
        }
      } else {
        notifySubscribers(path, oldValue, value);
      }
    },

    /**
     * Subscribe to all state changes
     */
    subscribeAll(callback) {
      const id = Symbol("subscriber");
      subscribers.set(id, callback);
      stats.subscriberCount++;

      return () => {
        subscribers.delete(id);
        stats.subscriberCount--;
      };
    },

    /**
     * Subscribe to specific path
     */
    subscribe(path, callback) {
      const pathKey = Array.isArray(path) ? path.join(".") : path;

      if (!pathSubscribers.has(pathKey)) {
        pathSubscribers.set(pathKey, new Set());
      }

      pathSubscribers.get(pathKey).add(callback);
      stats.pathSubscriberCount++;

      return () => {
        const callbacks = pathSubscribers.get(pathKey);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            pathSubscribers.delete(pathKey);
          }
          stats.pathSubscriberCount--;
        }
      };
    },

    /**
     * Subscribe to multiple paths
     */
    subscribeMultiple(paths, callback) {
      const unsubscribers = paths.map((path) =>
        this.subscribe(path, callback)
      );

      return () => {
        for (const unsub of unsubscribers) {
          unsub();
        }
      };
    },

    /**
     * Batch multiple updates
     */
    batch(updateFn) {
      const previousBatching = config.enableBatching;
      config.enableBatching = true;

      try {
        updateFn(this);
        processBatch();
      } finally {
        config.enableBatching = previousBatching;
      }
    },

    /**
     * Get statistics
     */
    getStats() {
      return {
        ...stats,
        pathSubscriptions: pathSubscribers.size,
        globalSubscriptions: subscribers.size,
        pendingBatches: updateBatch.length,
      };
    },

    /**
     * Flush pending updates immediately
     */
    flush() {
      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }
      processBatch();
    },
  };
}

/**
 * Creates a subscription hook for use in composables
 *
 * @param {Object} store - Selective store instance
 * @returns {Function} useSelector hook
 *
 * @example
 * ```javascript
 * const { useSelector, useAction } = createSubscriptionHooks(store);
 *
 * // In your composable
 * const theme = useSelector(['settings', 'theme']);
 * const updateTheme = useAction((newTheme) => {
 *   store.set(['settings', 'theme'], newTheme);
 * });
 * ```
 */
export function createSubscriptionHooks(store) {
  const selectorCache = new Map();
  const actionCache = new Map();

  return {
    /**
     * Select and subscribe to a value
     */
    useSelector(path, options = {}) {
      const pathKey = Array.isArray(path) ? path.join(".") : path;

      // Check cache for existing selector
      if (selectorCache.has(pathKey) && !options.skipCache) {
        return selectorCache.get(pathKey);
      }

      // Create new selector
      let currentValue = store.get(path);
      const listeners = new Set();

      const selector = {
        get value() {
          return currentValue;
        },

        subscribe(callback) {
          listeners.add(callback);
          return () => listeners.delete(callback);
        },

        refresh() {
          currentValue = store.get(path);
          for (const listener of listeners) {
            listener(currentValue);
          }
        },
      };

      // Subscribe to store changes
      store.subscribe(path, (newValue) => {
        currentValue = newValue;
        for (const listener of listeners) {
          listener(newValue);
        }
      });

      selectorCache.set(pathKey, selector);
      return selector;
    },

    /**
     * Create a memoized action
     */
    useAction(actionFn, deps = []) {
      const actionKey = actionFn.toString() + deps.join(",");

      if (actionCache.has(actionKey)) {
        return actionCache.get(actionKey);
      }

      const action = (...args) => {
        return actionFn(...args);
      };

      actionCache.set(actionKey, action);
      return action;
    },

    /**
     * Create a derived selector
     */
    useDerivedSelector(selectors, combineFn) {
      let cachedResult = null;
      let lastInputs = null;

      return {
        get value() {
          const inputs = selectors.map((sel) =>
            typeof sel === "function" ? sel(store.getState()) : store.get(sel)
          );

          const inputsChanged =
            lastInputs === null ||
            inputs.some((input, i) => !Object.is(input, lastInputs[i]));

          if (inputsChanged) {
            cachedResult = combineFn(...inputs);
            lastInputs = inputs;
          }

          return cachedResult;
        },
      };
    },

    /**
     * Clear selector cache
     */
    clearCache() {
      selectorCache.clear();
      actionCache.clear();
    },
  };
}

/**
 * Creates a lazy initialization wrapper
 *
 * @param {Function} initFn - Initialization function
 * @param {Object} options - Options
 * @returns {Object} Lazy initializer
 *
 * @example
 * ```javascript
 * const heavyResource = useLazy(async () => {
 *   return await loadHeavyResource();
 * });
 *
 * // Resource is only loaded when accessed
 * const resource = await heavyResource.get();
 * ```
 */
export function useLazy(initFn, options = {}) {
  let value = undefined;
  let initialized = false;
  let initializing = false;
  let initPromise = null;
  let initTime = 0;
  let error = null;

  return {
    /**
     * Get the value, initializing if necessary
     */
    async get() {
      if (initialized) return value;
      if (error) throw error;

      if (initializing) {
        return initPromise;
      }

      initializing = true;
      const startTime = performance.now();

      try {
        initPromise = Promise.resolve(initFn());
        value = await initPromise;
        initialized = true;
        initTime = performance.now() - startTime;
        return value;
      } catch (e) {
        error = e;
        throw e;
      } finally {
        initializing = false;
        initPromise = null;
      }
    },

    /**
     * Check if initialized
     */
    get isInitialized() {
      return initialized;
    },

    /**
     * Check if currently initializing
     */
    get isInitializing() {
      return initializing;
    },

    /**
     * Get initialization time
     */
    get initializationTime() {
      return initTime;
    },

    /**
     * Reset to uninitialized state
     */
    reset() {
      value = undefined;
      initialized = false;
      initializing = false;
      initPromise = null;
      error = null;
      initTime = 0;
    },

    /**
     * Peek at value without triggering initialization
     */
    peek() {
      return value;
    },

    /**
     * Get initialization error if any
     */
    getError() {
      return error;
    },
  };
}

/**
 * Creates a dependency tracker for computed values
 *
 * @returns {Object} Dependency tracker interface
 */
export function useDependencyTracker() {
  const dependencies = new Map();
  const dependents = new Map();
  const computationOrder = [];
  const stats = {
    trackedDependencies: 0,
    computations: 0,
    cascadingUpdates: 0,
  };

  /**
   * Topological sort for correct computation order
   */
  function topoSort() {
    const visited = new Set();
    const result = [];

    function visit(key) {
      if (visited.has(key)) return;
      visited.add(key);

      const deps = dependencies.get(key) || [];
      for (const dep of deps) {
        visit(dep);
      }
      result.push(key);
    }

    for (const key of dependencies.keys()) {
      visit(key);
    }

    computationOrder.length = 0;
    computationOrder.push(...result);
  }

  return {
    /**
     * Track a dependency
     */
    track(key, deps) {
      dependencies.set(key, deps);
      stats.trackedDependencies++;

      // Update reverse mapping
      for (const dep of deps) {
        if (!dependents.has(dep)) {
          dependents.set(dep, new Set());
        }
        dependents.get(dep).add(key);
      }

      topoSort();
    },

    /**
     * Get dependents of a key (what needs to update when this changes)
     */
    getDependents(key) {
      return dependents.get(key) || new Set();
    },

    /**
     * Get dependencies of a key (what this depends on)
     */
    getDependencies(key) {
      return dependencies.get(key) || [];
    },

    /**
     * Get cascade of updates for a key change
     */
    getCascade(key) {
      const cascade = new Set();
      const queue = [key];

      while (queue.length > 0) {
        const current = queue.shift();
        const deps = dependents.get(current) || new Set();

        for (const dep of deps) {
          if (!cascade.has(dep)) {
            cascade.add(dep);
            queue.push(dep);
          }
        }
      }

      stats.cascadingUpdates++;
      return Array.from(cascade);
    },

    /**
     * Get computation order
     */
    getComputationOrder() {
      return [...computationOrder];
    },

    /**
     * Remove tracking for a key
     */
    untrack(key) {
      const deps = dependencies.get(key) || [];
      for (const dep of deps) {
        const depDependents = dependents.get(dep);
        if (depDependents) {
          depDependents.delete(key);
        }
      }
      dependencies.delete(key);
      topoSort();
    },

    /**
     * Get statistics
     */
    getStats() {
      return {
        ...stats,
        totalDependencies: dependencies.size,
        totalDependents: dependents.size,
        computationOrderLength: computationOrder.length,
      };
    },

    /**
     * Clear all tracking
     */
    clear() {
      dependencies.clear();
      dependents.clear();
      computationOrder.length = 0;
    },
  };
}

export default {
  createSelectiveStore,
  createSubscriptionHooks,
  useLazy,
  useDependencyTracker,
};
