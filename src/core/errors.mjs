/**
 * GitVan Error Classes
 *
 * Production-grade error handling with:
 * - Structured error information
 * - Error categorization
 * - Retry logic support
 * - Context propagation
 * - Stack trace preservation
 */

/**
 * Base GitVan error class
 */
export class GitVanError extends Error {
  /**
   * @param {string} message - Error message
   * @param {object} options - Error options
   * @param {string} [options.code] - Error code
   * @param {string} [options.phase] - Hook phase where error occurred
   * @param {Error} [options.cause] - Original error cause
   * @param {object} [options.context] - Additional context
   * @param {boolean} [options.isRetryable] - Whether operation can be retried
   */
  constructor(message, options = {}) {
    super(message);
    this.name = "GitVanError";
    this.code = options.code ?? "GITVAN_ERROR";
    this.phase = options.phase;
    this.cause = options.cause;
    this.context = options.context;
    this.timestamp = Date.now();
    this.isRetryable = options.isRetryable ?? false;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GitVanError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      phase: this.phase,
      context: this.context,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      stack: this.stack,
      ...(this.cause && { cause: this.cause.message }),
    };
  }
}

/**
 * Validation error - for input validation failures
 */
export class ValidationError extends GitVanError {
  /**
   * @param {string} message - Error message
   * @param {Array<{path: string, message: string, code: string}>} errors - Validation errors
   * @param {object} [context] - Additional context
   */
  constructor(message, errors, context) {
    super(message, {
      code: "VALIDATION_ERROR",
      context,
      isRetryable: false,
    });
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Not found error - for missing resources
 */
export class NotFoundError extends GitVanError {
  /**
   * @param {string} resource - Resource type
   * @param {string} [resourceId] - Resource identifier
   */
  constructor(resource, resourceId) {
    super(`${resource}${resourceId ? ` '${resourceId}'` : ""} not found`, {
      code: "NOT_FOUND",
      context: { resource, resourceId },
      isRetryable: false,
    });
    this.name = "NotFoundError";
    this.resource = resource;
    this.resourceId = resourceId;
  }
}

/**
 * Unauthorized error - for authentication failures
 */
export class UnauthorizedError extends GitVanError {
  constructor(message = "Authentication required") {
    super(message, {
      code: "UNAUTHORIZED",
      isRetryable: false,
    });
    this.name = "UnauthorizedError";
  }
}

/**
 * Forbidden error - for authorization failures
 */
export class ForbiddenError extends GitVanError {
  constructor(message = "Access denied") {
    super(message, {
      code: "FORBIDDEN",
      isRetryable: false,
    });
    this.name = "ForbiddenError";
  }
}

/**
 * Timeout error - for operations that exceed time limits
 */
export class TimeoutError extends GitVanError {
  /**
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} [operation] - Operation that timed out
   */
  constructor(timeoutMs, operation) {
    super(
      `Operation${operation ? ` '${operation}'` : ""} timed out after ${timeoutMs}ms`,
      {
        code: "TIMEOUT",
        context: { timeoutMs, operation },
        isRetryable: true,
      }
    );
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Rate limit error - for API rate limit exceeded
 */
export class RateLimitError extends GitVanError {
  /**
   * @param {number} retryAfter - Seconds to wait before retry
   */
  constructor(retryAfter) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds`, {
      code: "RATE_LIMITED",
      context: { retryAfter },
      isRetryable: true,
    });
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Configuration error - for invalid configuration
 */
export class ConfigurationError extends GitVanError {
  /**
   * @param {string} message - Error message
   * @param {string} [configKey] - Configuration key that failed
   */
  constructor(message, configKey) {
    super(message, {
      code: "CONFIGURATION_ERROR",
      context: { configKey },
      isRetryable: false,
    });
    this.name = "ConfigurationError";
    this.configKey = configKey;
  }
}

/**
 * Provider error - for AI provider failures
 */
export class ProviderError extends GitVanError {
  /**
   * @param {string} provider - Provider name
   * @param {string} message - Error message
   * @param {Error} [cause] - Original error
   */
  constructor(provider, message, cause) {
    super(`AI Provider '${provider}' error: ${message}`, {
      code: "PROVIDER_ERROR",
      context: { provider },
      cause,
      isRetryable: true,
    });
    this.name = "ProviderError";
    this.provider = provider;
  }
}

/**
 * Git error - for Git operation failures
 */
export class GitError extends GitVanError {
  /**
   * @param {string} operation - Git operation
   * @param {string} message - Error message
   * @param {Error} [cause] - Original error
   */
  constructor(operation, message, cause) {
    super(`Git operation '${operation}' failed: ${message}`, {
      code: "GIT_ERROR",
      context: { operation },
      cause,
      isRetryable: false,
    });
    this.name = "GitError";
    this.operation = operation;
  }
}

/**
 * Workflow error - for workflow execution failures
 */
export class WorkflowError extends GitVanError {
  /**
   * @param {string} workflow - Workflow name
   * @param {string} step - Step that failed
   * @param {string} message - Error message
   * @param {Error} [cause] - Original error
   */
  constructor(workflow, step, message, cause) {
    super(`Workflow '${workflow}' step '${step}' failed: ${message}`, {
      code: "WORKFLOW_ERROR",
      context: { workflow, step },
      cause,
      isRetryable: true,
    });
    this.name = "WorkflowError";
    this.workflow = workflow;
    this.step = step;
  }
}

/**
 * Assertion utilities
 */

/**
 * Assert a condition, throwing if false
 * @param {unknown} condition - Condition to check
 * @param {string} [message] - Error message
 * @throws {GitVanError}
 */
export function assert(condition, message) {
  if (!condition) {
    throw new GitVanError(message ?? "Assertion failed", {
      code: "ASSERTION_FAILED",
    });
  }
}

/**
 * Assert value is defined (not null or undefined)
 * @param {unknown} value - Value to check
 * @param {string} [message] - Error message
 * @throws {GitVanError}
 */
export function assertDefined(value, message) {
  if (value === null || value === undefined) {
    throw new GitVanError(message ?? "Value must be defined", {
      code: "UNDEFINED_VALUE",
    });
  }
}

/**
 * Assert value matches type
 * @param {unknown} value - Value to check
 * @param {Function} typeGuard - Type guard function
 * @param {string} [message] - Error message
 * @throws {GitVanError}
 */
export function assertType(value, typeGuard, message) {
  if (!typeGuard(value)) {
    throw new GitVanError(message ?? "Type assertion failed", {
      code: "TYPE_MISMATCH",
    });
  }
}

/**
 * Safe execution utilities
 */

/**
 * Execute function and return result with error handling
 * @template T
 * @param {() => T} fn - Function to execute
 * @returns {{ok: true, value: T} | {ok: false, error: Error}}
 */
export function safe(fn) {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Execute async function and return result with error handling
 * @template T
 * @param {() => Promise<T>} fn - Async function to execute
 * @returns {Promise<{ok: true, value: T} | {ok: false, error: Error}>}
 */
export async function safeAsync(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Catch errors in an async operation
 * @template T
 * @param {() => T | Promise<T>} fn - Function to execute
 * @returns {Promise<[T | undefined, Error | undefined]>}
 */
export async function tryCatch(fn) {
  try {
    const result = await fn();
    return [result, undefined];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return [undefined, err];
  }
}

/**
 * Catch errors with default value
 * @template T
 * @param {() => T | Promise<T>} fn - Function to execute
 * @param {T} defaultValue - Default value on error
 * @returns {Promise<T>}
 */
export async function catchWithDefault(fn, defaultValue) {
  try {
    return await fn();
  } catch {
    return defaultValue;
  }
}

/**
 * Unwrap result or throw
 * @template T
 * @param {{ok: true, value: T} | {ok: false, error: Error}} result - Result to unwrap
 * @returns {T}
 * @throws {Error}
 */
export function unwrap(result) {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap result or return default
 * @template T
 * @param {{ok: true, value: T} | {ok: false, error: Error}} result - Result to unwrap
 * @param {T} defaultValue - Default value on error
 * @returns {T}
 */
export function unwrapOr(result, defaultValue) {
  if (result.ok) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Format error for API response
 * @param {Error} error - Error to format
 * @param {object} [options] - Format options
 * @param {boolean} [options.includeStack] - Include stack trace
 * @param {boolean} [options.includeContext] - Include context
 * @returns {object} Formatted error response
 */
export function formatErrorResponse(error, options = {}) {
  const { includeStack = false, includeContext = false } = options;

  if (error instanceof ValidationError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        errors: error.errors,
      },
    };
  }

  if (error instanceof GitVanError) {
    const response = {
      error: {
        code: error.code,
        message: error.message,
      },
    };

    if (includeContext && error.context) {
      response.error.context = error.context;
    }

    if (includeStack && error.stack) {
      response.error.stack = error.stack;
    }

    return response;
  }

  return {
    error: {
      code: "INTERNAL_ERROR",
      message: error.message,
      ...(includeStack && { stack: error.stack }),
    },
  };
}

/**
 * Get HTTP status code for error
 * @param {Error} error - Error
 * @returns {number} HTTP status code
 */
export function getErrorStatusCode(error) {
  if (error instanceof ValidationError) return 400;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof TimeoutError) return 408;
  if (error instanceof RateLimitError) return 429;

  if (error instanceof GitVanError) {
    switch (error.code) {
      case "VALIDATION_ERROR":
        return 400;
      case "UNAUTHORIZED":
        return 401;
      case "FORBIDDEN":
        return 403;
      case "NOT_FOUND":
        return 404;
      case "TIMEOUT":
        return 408;
      case "RATE_LIMITED":
        return 429;
      case "CONFLICT":
        return 409;
      default:
        return 500;
    }
  }

  return 500;
}
