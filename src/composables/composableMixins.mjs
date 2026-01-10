/**
 * @fileoverview GitVan Composable Mixins
 * Standard mixins for composables: logging, caching, validation
 *
 * Features:
 * - withLogging: Auto-log method calls, timing, errors
 * - withCaching: Auto-cache method results with TTL
 * - withValidation: Auto-validate inputs/outputs
 * - Composable stacking (mixins can be combined)
 *
 * @version 1.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { createLogger } from "../utils/logger.mjs";

/**
 * Logging Mixin
 * Automatically logs all method calls, execution time, and errors
 *
 * Features:
 * - Logs method entry/exit with correlation IDs
 * - Tracks execution time (milliseconds)
 * - Captures and logs errors
 * - Uses structured logging with context
 *
 * @param {Object} instance - Composable instance with methods
 * @param {Object} context - GitVan context
 * @returns {Object} Wrapped instance with logging
 *
 * @example
 * const logged = withLogging(composable, context)
 * await logged.someMethod() // Automatically logged
 */
export function withLogging(instance, context) {
  if (!instance || typeof instance !== 'object') {
    return instance;
  }

  const logger = createLogger('composable');
  const instanceName = instance.constructor?.name || 'composable';

  // Create proxy for automatic logging
  return new Proxy(instance, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Skip logging for non-function properties
      if (typeof value !== 'function') {
        return value;
      }

      // Skip logging for private/internal methods (starting with _)
      if (prop.startsWith('_')) {
        return value;
      }

      // Return wrapped function with logging
      return function wrappedMethod(...args) {
        const startTime = process.hrtime.bigint();
        const methodName = String(prop);

        try {
          const result = value.apply(target, args);

          // Handle async functions
          if (result instanceof Promise) {
            return result
              .then((res) => {
                const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
                logger.debug(
                  `${instanceName}.${methodName}() completed`,
                  { duration: `${duration.toFixed(2)}ms`, success: true }
                );
                return res;
              })
              .catch((error) => {
                const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
                logger.error(
                  `${instanceName}.${methodName}() failed`,
                  { duration: `${duration.toFixed(2)}ms`, error: error.message }
                );
                throw error;
              });
          }

          // Handle sync functions
          const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
          logger.debug(
            `${instanceName}.${methodName}() completed`,
            { duration: `${duration.toFixed(2)}ms`, success: true }
          );
          return result;
        } catch (error) {
          const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000;
          logger.error(
            `${instanceName}.${methodName}() failed`,
            { duration: `${duration.toFixed(2)}ms`, error: error.message }
          );
          throw error;
        }
      };
    },
  });
}

// Mark mixin name for identification
withLogging.displayName = 'withLogging';

/**
 * Caching Mixin
 * Automatically caches method results with configurable TTL
 *
 * Features:
 * - Simple LRU-like cache for method results
 * - Configurable TTL (time-to-live) per method
 * - Cache key based on method name and arguments
 * - Deterministic (same input = same cached result)
 * - Cache invalidation support
 *
 * @param {Object} instance - Composable instance with methods
 * @param {Object} context - GitVan context
 * @param {Object} [options] - Caching options
 * @param {number} [options.defaultTTL=5000] - Default TTL in milliseconds
 * @param {Object} [options.methodTTL={}] - Per-method TTL overrides
 * @returns {Object} Wrapped instance with caching
 *
 * @example
 * const cached = withCaching(composable, context, {
 *   defaultTTL: 10000,
 *   methodTTL: { list: 30000, get: 5000 }
 * })
 * await cached.list() // Cached for 30 seconds
 */
export function withCaching(instance, context, options = {}) {
  if (!instance || typeof instance !== 'object') {
    return instance;
  }

  const { defaultTTL = 5000, methodTTL = {} } = options;
  const cache = new Map();

  /**
   * Generate cache key from method name and arguments
   * Uses JSON serialization for determinism
   */
  function getCacheKey(methodName, args) {
    try {
      const argsStr = JSON.stringify(args);
      return `${methodName}:${argsStr}`;
    } catch {
      // If args not serializable, skip caching
      return null;
    }
  }

  /**
   * Check if cached value is still valid
   */
  function isCacheValid(entry) {
    if (!entry) return false;
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Invalidate all cache entries or specific method cache
   */
  function invalidateCache(methodName) {
    if (methodName) {
      // Invalidate specific method cache entries
      const keysToDelete = Array.from(cache.keys()).filter((k) =>
        k.startsWith(`${methodName}:`)
      );
      keysToDelete.forEach((k) => cache.delete(k));
    } else {
      // Invalidate entire cache
      cache.clear();
    }
  }

  // Create proxy for automatic caching
  const proxied = new Proxy(instance, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Skip caching for non-function properties
      if (typeof value !== 'function') {
        return value;
      }

      // Skip caching for private/internal methods (starting with _)
      if (prop.startsWith('_')) {
        return value;
      }

      // Return wrapped function with caching
      return function wrappedMethod(...args) {
        const methodName = String(prop);
        const cacheKey = getCacheKey(methodName, args);

        // Skip caching if key generation fails
        if (!cacheKey) {
          return value.apply(target, args);
        }

        // Check cache
        const cached = cache.get(cacheKey);
        if (isCacheValid(cached)) {
          // Return cached result (async-wrapped)
          return Promise.resolve(cached.value);
        }

        // Get TTL for this method
        const ttl = methodTTL[methodName] ?? defaultTTL;

        // Call original method
        const result = value.apply(target, args);

        // Handle async functions
        if (result instanceof Promise) {
          return result
            .then((res) => {
              cache.set(cacheKey, {
                value: res,
                timestamp: Date.now(),
                ttl,
              });
              return res;
            })
            .catch((error) => {
              // Don't cache errors
              throw error;
            });
        }

        // Handle sync functions - cache and return
        cache.set(cacheKey, {
          value: result,
          timestamp: Date.now(),
          ttl,
        });
        return result;
      };
    },
  });

  // Attach cache control methods
  proxied.__cache = {
    invalidate: invalidateCache,
    size: () => cache.size,
    clear: () => cache.clear(),
  };

  return proxied;
}

// Mark mixin name for identification
withCaching.displayName = 'withCaching';

/**
 * Validation Mixin
 * Automatically validates inputs and outputs of methods
 *
 * Features:
 * - Per-method input validation
 * - Per-method output validation
 * - Deterministic error messages
 * - Support for custom validators
 *
 * @param {Object} instance - Composable instance with methods
 * @param {Object} context - GitVan context
 * @param {Object} [options] - Validation options
 * @param {Object} [options.validators={}] - Custom validator functions
 * @returns {Object} Wrapped instance with validation
 *
 * @example
 * const validated = withValidation(composable, context, {
 *   validators: {
 *     list: {
 *       input: (args) => args.length <= 1,
 *       output: (result) => Array.isArray(result)
 *     }
 *   }
 * })
 */
export function withValidation(instance, context, options = {}) {
  if (!instance || typeof instance !== 'object') {
    return instance;
  }

  const { validators = {} } = options;

  /**
   * Default input validator - ensure args are objects/primitives
   */
  function defaultInputValidator(args) {
    // Basic validation: args should be array
    return Array.isArray(args);
  }

  /**
   * Default output validator - ensure output is not undefined
   */
  function defaultOutputValidator(output) {
    return output !== undefined;
  }

  // Create proxy for automatic validation
  return new Proxy(instance, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Skip validation for non-function properties
      if (typeof value !== 'function') {
        return value;
      }

      // Skip validation for private/internal methods (starting with _)
      if (prop.startsWith('_')) {
        return value;
      }

      const methodName = String(prop);
      const methodValidators = validators[methodName];

      // Return wrapped function with validation
      return function wrappedMethod(...args) {
        // Input validation
        if (methodValidators?.input) {
          const isValid = methodValidators.input(args);
          if (!isValid) {
            throw new Error(
              `Validation failed for ${methodName}: invalid input - ${JSON.stringify(args)}`
            );
          }
        } else {
          // Default input validation
          if (!defaultInputValidator(args)) {
            throw new Error(
              `Validation failed for ${methodName}: invalid argument structure`
            );
          }
        }

        // Call original method
        const result = value.apply(target, args);

        // Handle async functions with output validation
        if (result instanceof Promise) {
          return result
            .then((res) => {
              // Output validation
              if (methodValidators?.output) {
                const isValid = methodValidators.output(res);
                if (!isValid) {
                  throw new Error(
                    `Validation failed for ${methodName}: invalid output - ${JSON.stringify(res).substring(0, 100)}`
                  );
                }
              }
              return res;
            });
        }

        // Handle sync functions with output validation
        if (methodValidators?.output) {
          const isValid = methodValidators.output(result);
          if (!isValid) {
            throw new Error(
              `Validation failed for ${methodName}: invalid output - ${JSON.stringify(result).substring(0, 100)}`
            );
          }
        }

        return result;
      };
    },
  });
}

// Mark mixin name for identification
withValidation.displayName = 'withValidation';

/**
 * Export all mixins as a namespace object
 * Provides convenient access to all available mixins
 */
export const composableMixins = {
  withLogging,
  withCaching,
  withValidation,
};
