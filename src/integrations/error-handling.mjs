/**
 * @fileoverview Error Handling Utilities for Hooks System
 *
 * Provides comprehensive error handling, retry logic, circuit breaker,
 * and recovery mechanisms for the @unrdf/hooks integration.
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

/**
 * Error types for categorizing failures
 */
export const ErrorTypes = {
  GIT_COMMAND_FAILED: "GIT_COMMAND_FAILED",
  EVENT_CAPTURE_FAILED: "EVENT_CAPTURE_FAILED",
  HOOK_EVALUATION_FAILED: "HOOK_EVALUATION_FAILED",
  JOB_EXECUTION_FAILED: "JOB_EXECUTION_FAILED",
  JOB_TIMEOUT: "JOB_TIMEOUT",
  JOB_REGISTRATION_FAILED: "JOB_REGISTRATION_FAILED",
  SPARQL_QUERY_FAILED: "SPARQL_QUERY_FAILED",
  RDF_DATA_MISSING: "RDF_DATA_MISSING",
  RDF_TYPE_MISMATCH: "RDF_TYPE_MISMATCH",
  PREDICATE_EVALUATION_FAILED: "PREDICATE_EVALUATION_FAILED",
  CIRCUIT_BREAKER_OPEN: "CIRCUIT_BREAKER_OPEN",
  MAX_RETRIES_EXCEEDED: "MAX_RETRIES_EXCEEDED",
  INITIALIZATION_FAILED: "INITIALIZATION_FAILED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Categorized error class with recovery metadata
 */
export class HookSystemError extends Error {
  constructor(type, message, context = {}) {
    super(message);
    this.name = "HookSystemError";
    this.type = type;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.recoverable = this._isRecoverable(type);
    this.retryable = this._isRetryable(type);
  }

  _isRecoverable(type) {
    const recoverableTypes = [
      ErrorTypes.GIT_COMMAND_FAILED,
      ErrorTypes.EVENT_CAPTURE_FAILED,
      ErrorTypes.JOB_EXECUTION_FAILED,
      ErrorTypes.JOB_TIMEOUT,
      ErrorTypes.JOB_REGISTRATION_FAILED,
    ];
    return recoverableTypes.includes(type);
  }

  _isRetryable(type) {
    const nonRetryableTypes = [
      ErrorTypes.SPARQL_QUERY_FAILED,
      ErrorTypes.RDF_TYPE_MISMATCH,
      ErrorTypes.CIRCUIT_BREAKER_OPEN,
      ErrorTypes.MAX_RETRIES_EXCEEDED,
    ];
    return !nonRetryableTypes.includes(type);
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      retryable: this.retryable,
      stack: this.stack,
    };
  }
}

/**
 * Retry with exponential backoff
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.initialDelay=100] - Initial delay in ms
 * @param {number} [options.maxDelay=10000] - Maximum delay in ms
 * @param {number} [options.backoffMultiplier=2] - Backoff multiplier
 * @param {Function} [options.shouldRetry] - Function to determine if should retry
 * @param {Function} [options.onRetry] - Callback on each retry
 * @returns {Promise<any>} Result of successful execution
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
    onRetry = () => {},
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn(attempt);
      return { result, retryCount: attempt };
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === maxRetries || !shouldRetry(error, attempt)) {
        throw new HookSystemError(
          ErrorTypes.MAX_RETRIES_EXCEEDED,
          `Max retries (${maxRetries}) exceeded: ${error.message}`,
          { originalError: error, attempts: attempt + 1 }
        );
      }

      // Call retry callback
      onRetry(error, attempt, delay);

      // Wait with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Execute with timeout
 *
 * @param {Function} fn - Async function to execute
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} [errorMessage] - Custom timeout error message
 * @returns {Promise<any>} Result or timeout error
 */
export async function executeWithTimeout(fn, timeout, errorMessage) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new HookSystemError(
              ErrorTypes.JOB_TIMEOUT,
              errorMessage || `Operation timed out after ${timeout}ms`,
              { timeout }
            )
          ),
        timeout
      )
    ),
  ]);
}

/**
 * Circuit Breaker implementation
 *
 * Prevents cascading failures by opening circuit after threshold failures
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000; // 1 minute
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.onStateChange = options.onStateChange || (() => {});

    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  async execute(fn, context = {}) {
    // Check if circuit is open
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttemptTime) {
        throw new HookSystemError(
          ErrorTypes.CIRCUIT_BREAKER_OPEN,
          `Circuit breaker is open. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`,
          { state: this.state, failures: this.failures }
        );
      }
      // Move to half-open state
      this._setState("HALF_OPEN");
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  _onSuccess() {
    this.failures = 0;
    this.successes++;

    if (this.state === "HALF_OPEN") {
      this._setState("CLOSED");
    }
  }

  _onFailure(error) {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this._setState("OPEN");
      this.nextAttemptTime = Date.now() + this.resetTimeout;
    }
  }

  _setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.onStateChange(newState, oldState);
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  reset() {
    this.state = "CLOSED";
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
}

/**
 * Error metrics tracker
 */
export class ErrorMetrics {
  constructor() {
    this.metrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByHook: {},
      recoveries: 0,
      failedRecoveries: 0,
      totalRecoveryTimeMs: 0,
      errors: [],
    };
  }

  recordError(error, hookId, context = {}) {
    const errorType = error.type || ErrorTypes.UNKNOWN_ERROR;

    this.metrics.totalErrors++;
    this.metrics.errorsByType[errorType] =
      (this.metrics.errorsByType[errorType] || 0) + 1;

    if (hookId) {
      this.metrics.errorsByHook[hookId] =
        (this.metrics.errorsByHook[hookId] || 0) + 1;
    }

    this.metrics.errors.push({
      type: errorType,
      message: error.message,
      hookId,
      context,
      timestamp: new Date().toISOString(),
    });

    // Keep last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  recordRecovery(recoveryTimeMs, hookId) {
    this.metrics.recoveries++;
    this.metrics.totalRecoveryTimeMs += recoveryTimeMs;
  }

  recordFailedRecovery(hookId) {
    this.metrics.failedRecoveries++;
  }

  getMetrics() {
    const meanTimeToRecovery =
      this.metrics.recoveries > 0
        ? this.metrics.totalRecoveryTimeMs / this.metrics.recoveries
        : 0;

    return {
      ...this.metrics,
      meanTimeToRecovery,
      errorRate:
        this.metrics.totalErrors /
        (this.metrics.totalErrors + this.metrics.recoveries || 1),
      recoveryRate:
        this.metrics.recoveries /
        (this.metrics.recoveries + this.metrics.failedRecoveries || 1),
    };
  }

  reset() {
    this.metrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByHook: {},
      recoveries: 0,
      failedRecoveries: 0,
      totalRecoveryTimeMs: 0,
      errors: [],
    };
  }
}

/**
 * Audit trail logger
 */
export class AuditLogger {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 1000;
    this.entries = [];
  }

  log(entry) {
    this.entries.push({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });

    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  getLog(filter = {}) {
    let filtered = this.entries;

    if (filter.hookId) {
      filtered = filtered.filter((e) => e.hookId === filter.hookId);
    }

    if (filter.success !== undefined) {
      filtered = filtered.filter((e) => e.success === filter.success);
    }

    if (filter.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  clear() {
    this.entries = [];
  }
}

/**
 * Categorize error from raw error object
 *
 * @param {Error} error - Raw error
 * @returns {string} Error type
 */
export function categorizeError(error) {
  const message = error.message.toLowerCase();

  if (message.includes("git")) {
    return ErrorTypes.GIT_COMMAND_FAILED;
  }
  if (message.includes("sparql") || message.includes("query")) {
    return ErrorTypes.SPARQL_QUERY_FAILED;
  }
  if (message.includes("rdf")) {
    return ErrorTypes.RDF_DATA_MISSING;
  }
  if (message.includes("type mismatch")) {
    return ErrorTypes.RDF_TYPE_MISMATCH;
  }
  if (message.includes("timeout") || message.includes("timed out")) {
    return ErrorTypes.JOB_TIMEOUT;
  }
  if (message.includes("predicate")) {
    return ErrorTypes.PREDICATE_EVALUATION_FAILED;
  }
  if (message.includes("circuit breaker")) {
    return ErrorTypes.CIRCUIT_BREAKER_OPEN;
  }

  return ErrorTypes.UNKNOWN_ERROR;
}

/**
 * Sleep utility
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap function with error handling
 *
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, options = {}) {
  const {
    retry = true,
    timeout = null,
    circuitBreaker = null,
    onError = () => {},
    fallback = null,
  } = options;

  return async function (...args) {
    try {
      let result;

      if (circuitBreaker) {
        result = await circuitBreaker.execute(() => {
          if (timeout) {
            return executeWithTimeout(() => fn(...args), timeout);
          }
          return fn(...args);
        });
      } else if (timeout) {
        result = await executeWithTimeout(() => fn(...args), timeout);
      } else {
        result = await fn(...args);
      }

      if (retry && result && result.retryCount !== undefined) {
        return result;
      }

      return { result, retryCount: 0 };
    } catch (error) {
      onError(error);

      if (fallback) {
        return { result: fallback(error), fallback: true };
      }

      throw error;
    }
  };
}

export default {
  ErrorTypes,
  HookSystemError,
  retryWithBackoff,
  executeWithTimeout,
  CircuitBreaker,
  ErrorMetrics,
  AuditLogger,
  categorizeError,
  withErrorHandling,
};
