/**
 * GitVan Centralized Error Handler
 *
 * Global error handling with:
 * - Error categorization (user error, system error, internal error)
 * - Error recovery strategies (retry, fallback, manual intervention)
 * - Structured error reporting
 * - Graceful shutdown coordination
 * - Error logging integration
 */

import { createLogger, logError } from "../utils/logger.mjs";
import {
  GitVanError,
  ValidationError,
  ConfigurationError,
  ProviderError,
  formatErrorResponse,
  getErrorStatusCode,
} from "./errors.mjs";

const logger = createLogger("error-handler");

// Error handler registry
const errorHandlers = new Map();

// Global error state
let isShuttingDown = false;
const activeOperations = new Set();

/**
 * Error categories
 */
export const ErrorCategory = {
  USER: "user", // User-caused errors (validation, not found, etc.)
  SYSTEM: "system", // System errors (timeout, rate limit, etc.)
  INTERNAL: "internal", // Internal errors (bugs, assertions, etc.)
  EXTERNAL: "external", // External service errors (AI provider, Git, etc.)
};

/**
 * Recovery strategies
 */
export const RecoveryStrategy = {
  RETRY: "retry", // Retry the operation
  FALLBACK: "fallback", // Use fallback value/behavior
  FAIL: "fail", // Fail immediately
  IGNORE: "ignore", // Ignore the error
  MANUAL: "manual", // Require manual intervention
};

/**
 * Categorize error
 * @param {Error} error - Error to categorize
 * @returns {string} Error category
 */
export function categorizeError(error) {
  if (error instanceof ValidationError) return ErrorCategory.USER;
  if (error instanceof ConfigurationError) return ErrorCategory.USER;
  if (error instanceof ProviderError) return ErrorCategory.EXTERNAL;

  if (error instanceof GitVanError) {
    switch (error.code) {
      case "NOT_FOUND":
      case "UNAUTHORIZED":
      case "FORBIDDEN":
        return ErrorCategory.USER;
      case "TIMEOUT":
      case "RATE_LIMITED":
        return ErrorCategory.SYSTEM;
      case "PROVIDER_ERROR":
      case "GIT_ERROR":
        return ErrorCategory.EXTERNAL;
      default:
        return ErrorCategory.INTERNAL;
    }
  }

  return ErrorCategory.INTERNAL;
}

/**
 * Determine recovery strategy for error
 * @param {Error} error - Error
 * @returns {string} Recovery strategy
 */
export function getRecoveryStrategy(error) {
  // Retryable errors
  if (error instanceof GitVanError && error.isRetryable) {
    return RecoveryStrategy.RETRY;
  }

  // Category-based strategies
  const category = categorizeError(error);

  switch (category) {
    case ErrorCategory.USER:
      return RecoveryStrategy.FAIL; // User errors should fail fast
    case ErrorCategory.SYSTEM:
      return RecoveryStrategy.RETRY; // System errors can be retried
    case ErrorCategory.EXTERNAL:
      return RecoveryStrategy.RETRY; // External errors can be retried
    case ErrorCategory.INTERNAL:
      return RecoveryStrategy.MANUAL; // Internal errors need investigation
    default:
      return RecoveryStrategy.FAIL;
  }
}

/**
 * Register error handler for specific error code
 * @param {string} errorCode - Error code or "*" for all errors
 * @param {Function} handler - Handler function
 * @returns {Function} Disposer function
 */
export function registerErrorHandler(errorCode, handler) {
  errorHandlers.set(errorCode, handler);
  return () => {
    errorHandlers.delete(errorCode);
  };
}

/**
 * Handle error using registered handlers
 * @param {Error} error - Error to handle
 * @returns {Promise<boolean>} True if error was handled
 */
export async function handleError(error) {
  const code = error instanceof GitVanError ? error.code : "UNKNOWN_ERROR";

  // Try specific handler
  const handler = errorHandlers.get(code);
  if (handler) {
    try {
      const result = await handler(error);
      return result !== false;
    } catch (handlerError) {
      logger.error("Error handler failed", {
        code,
        handlerError: handlerError.message,
      });
    }
  }

  // Try generic handler
  const genericHandler = errorHandlers.get("*");
  if (genericHandler) {
    try {
      const result = await genericHandler(error);
      return result !== false;
    } catch (handlerError) {
      logger.error("Generic error handler failed", {
        handlerError: handlerError.message,
      });
    }
  }

  return false;
}

/**
 * Global error handler for uncaught exceptions
 * @param {Error} error - Uncaught error
 */
export async function handleUncaughtError(error) {
  logger.error("Uncaught error", {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
  });

  logError(error, "uncaught");

  // Try to handle the error
  const handled = await handleError(error);

  if (!handled) {
    // Category and recovery
    const category = categorizeError(error);
    const strategy = getRecoveryStrategy(error);

    logger.error("Unhandled error", {
      category,
      strategy,
      shouldShutdown: category === ErrorCategory.INTERNAL,
    });

    // Internal errors should trigger shutdown
    if (category === ErrorCategory.INTERNAL) {
      await gracefulShutdown(1);
    }
  }
}

/**
 * Global error handler for unhandled promise rejections
 * @param {Error} error - Unhandled rejection
 */
export async function handleUnhandledRejection(error) {
  logger.error("Unhandled promise rejection", {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });

  logError(error, "unhandled-rejection");

  // Try to handle the error
  await handleError(error);
}

/**
 * Wrap async operation with error boundary
 * @template T
 * @param {() => Promise<T>} fn - Async function to execute
 * @param {object} options - Error boundary options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.retryDelay=1000] - Retry delay in ms
 * @param {number} [options.backoffFactor=2] - Backoff multiplier
 * @param {*} [options.fallback] - Fallback value on failure
 * @param {Function} [options.onError] - Error callback
 * @returns {Promise<T>}
 */
export async function withErrorBoundary(fn, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffFactor = 2,
    fallback,
    onError,
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Register operation
      const operationId = Symbol("operation");
      activeOperations.add(operationId);

      try {
        const result = await fn();
        return result;
      } finally {
        activeOperations.delete(operationId);
      }
    } catch (error) {
      lastError = error;

      // Log error
      logError(error, "error-boundary", { attempt, maxRetries });

      // Call error callback
      if (onError) {
        try {
          onError(error, attempt);
        } catch (callbackError) {
          logger.error("Error callback failed", {
            error: callbackError.message,
          });
        }
      }

      // Check if retryable
      const strategy = getRecoveryStrategy(error);

      if (strategy !== RecoveryStrategy.RETRY || attempt >= maxRetries) {
        break;
      }

      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(backoffFactor, attempt);
      logger.info("Retrying operation", {
        attempt: attempt + 1,
        maxRetries,
        delay,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }

  // All retries exhausted
  if (fallback !== undefined) {
    logger.warn("Using fallback value after retries exhausted", {
      attempts: attempt,
    });
    return fallback;
  }

  throw lastError;
}

/**
 * Track active operation
 * @param {string} operationName - Operation name
 * @returns {Function} Completion callback
 */
export function trackOperation(operationName) {
  const operationId = Symbol(operationName);
  activeOperations.add(operationId);

  logger.debug("Operation started", { operationName });

  return () => {
    activeOperations.delete(operationId);
    logger.debug("Operation completed", { operationName });
  };
}

/**
 * Wait for all active operations to complete
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<void>}
 */
export async function waitForActiveOperations(timeoutMs = 30000) {
  const startTime = Date.now();

  while (activeOperations.size > 0) {
    if (Date.now() - startTime > timeoutMs) {
      logger.warn("Timeout waiting for active operations", {
        remaining: activeOperations.size,
      });
      break;
    }

    logger.info("Waiting for active operations", {
      count: activeOperations.size,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (activeOperations.size === 0) {
    logger.info("All active operations completed");
  }
}

/**
 * Graceful shutdown
 * @param {number} exitCode - Exit code
 */
export async function gracefulShutdown(exitCode = 0) {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress");
    return;
  }

  isShuttingDown = true;

  logger.info("Starting graceful shutdown", { exitCode });

  try {
    // Wait for active operations
    await waitForActiveOperations(30000);

    // Run shutdown handlers
    for (const [code, handler] of errorHandlers.entries()) {
      if (code === "shutdown") {
        try {
          await handler({ code: "SHUTDOWN", exitCode });
        } catch (error) {
          logger.error("Shutdown handler failed", {
            error: error.message,
          });
        }
      }
    }

    logger.info("Graceful shutdown complete");
  } catch (error) {
    logger.error("Error during shutdown", { error: error.message });
  }

  // Exit process
  await exitWithError(new Error("Operation failed"), exitCode);
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
  // Uncaught exception handler
  process.on("uncaughtException", (error) => {
    handleUncaughtError(error).catch(() => {
      // Last resort
      logger.error("Fatal error in error handler:", error);
      await exitWithError(new Error("Operation failed"), 1);
    });
  });

  // Unhandled rejection handler
  process.on("unhandledRejection", (error) => {
    handleUnhandledRejection(error).catch(() => {
      logger.error("Fatal error in rejection handler:", error);
      await exitWithError(new Error("Operation failed"), 1);
    });
  });

  // Graceful shutdown signals
  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM");
    gracefulShutdown(0);
  });

  process.on("SIGINT", () => {
    logger.info("Received SIGINT");
    gracefulShutdown(0);
  });

  logger.info("Global error handlers installed");
}

/**
 * Create user-friendly error message
 * @param {Error} error - Error
 * @returns {string} User-friendly message
 */
export function getUserFriendlyMessage(error) {
  if (error instanceof ValidationError) {
    const details = error.errors
      .map((e) => `  - ${e.path}: ${e.message}`)
      .join("\n");
    return `Validation failed:\n${details}`;
  }

  if (error instanceof ConfigurationError) {
    return `Configuration error: ${error.message}`;
  }

  if (error instanceof ProviderError) {
    return `AI Provider error: ${error.message}. Please check your provider configuration.`;
  }

  if (error instanceof GitVanError) {
    return error.message;
  }

  return `An unexpected error occurred: ${error.message}`;
}

/**
 * Exit with error message
 * @param {Error} error - Error
 * @param {number} [exitCode=1] - Exit code
 */
export async function exitWithError(error, exitCode = 1) {
  const category = categorizeError(error);
  const message = getUserFriendlyMessage(error);

  logger.error("Exiting with error", {
    category,
    exitCode,
    message,
  });

  // Log to stderr
  logger.error(`\nError: ${message}\n`);

  // Log error details
  logError(error, "exit");

  // Graceful shutdown
  await gracefulShutdown(exitCode);
}
