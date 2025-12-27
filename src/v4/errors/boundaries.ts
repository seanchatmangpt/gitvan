/**
 * GitVan v4 Error Boundaries
 *
 * Hook-based error handling and recovery system.
 *
 * @packageDocumentation
 * @module @gitvan/v4/errors/boundaries
 */

import type {
  ErrorBoundaryState,
  ErrorBoundaryOptions,
  ErrorRecoveryStrategy,
  Disposer,
  HookPhase,
} from '../types/index.js';
import { signal, computed, effect } from '../core/signals.js';
import { getCurrentContext, onCleanup } from '../core/context.js';

// =============================================================================
// Error Types
// =============================================================================

/**
 * Base GitVan error class
 */
export class GitVanError extends Error {
  readonly code: string;
  readonly phase?: HookPhase;
  readonly cause?: Error;
  readonly context?: Record<string, unknown>;
  readonly timestamp: number;
  readonly isRetryable: boolean;

  constructor(
    message: string,
    options?: {
      code?: string;
      phase?: HookPhase;
      cause?: Error;
      context?: Record<string, unknown>;
      isRetryable?: boolean;
    }
  ) {
    super(message);
    this.name = 'GitVanError';
    this.code = options?.code ?? 'GITVAN_ERROR';
    this.phase = options?.phase;
    this.cause = options?.cause;
    this.context = options?.context;
    this.timestamp = Date.now();
    this.isRetryable = options?.isRetryable ?? false;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GitVanError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      phase: this.phase,
      context: this.context,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }
}

/**
 * Validation error
 */
export class ValidationError extends GitVanError {
  readonly errors: Array<{ path: string; message: string; code: string }>;

  constructor(
    message: string,
    errors: Array<{ path: string; message: string; code: string }>,
    context?: Record<string, unknown>
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      context,
      isRetryable: false,
    });
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Not found error
 */
export class NotFoundError extends GitVanError {
  readonly resource: string;
  readonly resourceId?: string;

  constructor(resource: string, resourceId?: string) {
    super(`${resource}${resourceId ? ` '${resourceId}'` : ''} not found`, {
      code: 'NOT_FOUND',
      context: { resource, resourceId },
      isRetryable: false,
    });
    this.name = 'NotFoundError';
    this.resource = resource;
    this.resourceId = resourceId;
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends GitVanError {
  constructor(message = 'Authentication required') {
    super(message, {
      code: 'UNAUTHORIZED',
      isRetryable: false,
    });
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends GitVanError {
  constructor(message = 'Access denied') {
    super(message, {
      code: 'FORBIDDEN',
      isRetryable: false,
    });
    this.name = 'ForbiddenError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends GitVanError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, operation?: string) {
    super(`Operation${operation ? ` '${operation}'` : ''} timed out after ${timeoutMs}ms`, {
      code: 'TIMEOUT',
      context: { timeoutMs, operation },
      isRetryable: true,
    });
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends GitVanError {
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds`, {
      code: 'RATE_LIMITED',
      context: { retryAfter },
      isRetryable: true,
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// =============================================================================
// Error Boundary Implementation
// =============================================================================

/**
 * Error boundary for hooks
 */
export interface ErrorBoundary {
  /** Current error state */
  state: ErrorBoundaryState;
  /** Wrap a function with error boundary */
  wrap<T>(fn: () => T | Promise<T>): Promise<T>;
  /** Reset error state */
  reset(): void;
  /** Manually trigger error */
  setError(error: Error): void;
  /** Retry last failed operation */
  retry(): Promise<void>;
}

/**
 * Create an error boundary
 *
 * @example
 * ```ts
 * const boundary = createErrorBoundary({
 *   maxRetries: 3,
 *   onError: (error) => console.error(error),
 *   fallback: defaultValue,
 * });
 *
 * const result = await boundary.wrap(async () => {
 *   return await riskyOperation();
 * });
 * ```
 */
export function createErrorBoundary(
  options?: ErrorBoundaryOptions
): ErrorBoundary {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffFactor = 2,
    strategy = 'retry',
    shouldCatch = () => true,
    fallback,
    onError,
    onReset,
  } = options ?? {};

  const hasErrorSignal = signal(false);
  const errorSignal = signal<Error | undefined>(undefined);
  const errorInfoSignal = signal<ErrorBoundaryState['errorInfo'] | undefined>(undefined);
  const retryCountSignal = signal(0);
  const isRetryingSignal = signal(false);

  let lastOperation: (() => unknown) | null = null;

  const state: ErrorBoundaryState = {
    get hasError() {
      return hasErrorSignal();
    },
    get error() {
      return errorSignal();
    },
    get errorInfo() {
      return errorInfoSignal();
    },
    get retryCount() {
      return retryCountSignal();
    },
    get isRetrying() {
      return isRetryingSignal();
    },
  };

  const reset = (): void => {
    hasErrorSignal.set(false);
    errorSignal.set(undefined);
    errorInfoSignal.set(undefined);
    retryCountSignal.set(0);
    isRetryingSignal.set(false);
    onReset?.();
  };

  const setError = (error: Error): void => {
    hasErrorSignal.set(true);
    errorSignal.set(error);
    errorInfoSignal.set({
      stack: error.stack,
    });
    onError?.(error, errorInfoSignal.peek());
  };

  const executeWithRetry = async <T>(
    fn: () => T | Promise<T>,
    currentRetry: number
  ): Promise<T> => {
    try {
      isRetryingSignal.set(currentRetry > 0);
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (!shouldCatch(err)) {
        throw err;
      }

      retryCountSignal.set(currentRetry);

      // Check if error is retryable
      const isRetryable =
        err instanceof GitVanError ? err.isRetryable : true;

      if (strategy === 'retry' && isRetryable && currentRetry < maxRetries) {
        const delay = retryDelay * Math.pow(backoffFactor, currentRetry);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeWithRetry(fn, currentRetry + 1);
      }

      setError(err);

      if (strategy === 'fallback' && fallback !== undefined) {
        return fallback as T;
      }

      if (strategy === 'ignore') {
        return undefined as T;
      }

      throw err;
    } finally {
      isRetryingSignal.set(false);
    }
  };

  const wrap = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    lastOperation = fn as () => unknown;
    reset();
    return executeWithRetry(fn, 0);
  };

  const retry = async (): Promise<void> => {
    if (lastOperation) {
      reset();
      await executeWithRetry(lastOperation, 0);
    }
  };

  return {
    state,
    wrap,
    reset,
    setError,
    retry,
  };
}

// =============================================================================
// Error Boundary Hook
// =============================================================================

/**
 * Use error boundary in current context
 *
 * @example
 * ```ts
 * const { wrap, state, reset } = useErrorBoundary({
 *   onError: (err) => logError(err),
 * });
 *
 * const data = await wrap(() => fetchData());
 *
 * if (state.hasError) {
 *   return <ErrorDisplay error={state.error} onRetry={reset} />;
 * }
 * ```
 */
export function useErrorBoundary(
  options?: ErrorBoundaryOptions
): ErrorBoundary {
  const boundary = createErrorBoundary(options);

  onCleanup(() => {
    boundary.reset();
  });

  return boundary;
}

/**
 * Catch errors in an async operation
 *
 * @example
 * ```ts
 * const [result, error] = await tryCatch(() => riskyOperation());
 * if (error) {
 *   console.error('Operation failed:', error);
 * }
 * ```
 */
export async function tryCatch<T>(
  fn: () => T | Promise<T>
): Promise<[T | undefined, Error | undefined]> {
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
 */
export async function catchWithDefault<T>(
  fn: () => T | Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await fn();
  } catch {
    return defaultValue;
  }
}

// =============================================================================
// Error Handler Registry
// =============================================================================

type ErrorHandler = (error: Error) => void | boolean | Promise<void | boolean>;

const globalErrorHandlers = new Map<string, ErrorHandler>();

/**
 * Register a global error handler
 */
export function registerErrorHandler(
  errorCode: string,
  handler: ErrorHandler
): Disposer {
  globalErrorHandlers.set(errorCode, handler);
  return () => {
    globalErrorHandlers.delete(errorCode);
  };
}

/**
 * Handle an error using registered handlers
 */
export async function handleError(error: Error): Promise<boolean> {
  const code = error instanceof GitVanError ? error.code : 'UNKNOWN_ERROR';

  const handler = globalErrorHandlers.get(code);
  if (handler) {
    const result = await handler(error);
    return result !== false;
  }

  // Try generic handler
  const genericHandler = globalErrorHandlers.get('*');
  if (genericHandler) {
    const result = await genericHandler(error);
    return result !== false;
  }

  return false;
}

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Format error for API response
 */
export function formatErrorResponse(
  error: Error,
  options?: { includeStack?: boolean; includeContext?: boolean }
): Record<string, unknown> {
  const { includeStack = false, includeContext = false } = options ?? {};

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
    const response: Record<string, unknown> = {
      error: {
        code: error.code,
        message: error.message,
      },
    };

    if (includeContext && error.context) {
      (response.error as Record<string, unknown>).context = error.context;
    }

    if (includeStack && error.stack) {
      (response.error as Record<string, unknown>).stack = error.stack;
    }

    return response;
  }

  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message,
      ...(includeStack && { stack: error.stack }),
    },
  };
}

/**
 * Get HTTP status code for error
 */
export function getErrorStatusCode(error: Error): number {
  if (error instanceof ValidationError) return 400;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof TimeoutError) return 408;
  if (error instanceof RateLimitError) return 429;

  if (error instanceof GitVanError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 400;
      case 'UNAUTHORIZED':
        return 401;
      case 'FORBIDDEN':
        return 403;
      case 'NOT_FOUND':
        return 404;
      case 'TIMEOUT':
        return 408;
      case 'RATE_LIMITED':
        return 429;
      case 'CONFLICT':
        return 409;
      default:
        return 500;
    }
  }

  return 500;
}

// =============================================================================
// Assertion Utilities
// =============================================================================

/**
 * Assert a condition, throwing if false
 */
export function assert(
  condition: unknown,
  message?: string
): asserts condition {
  if (!condition) {
    throw new GitVanError(message ?? 'Assertion failed', {
      code: 'ASSERTION_FAILED',
    });
  }
}

/**
 * Assert value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new GitVanError(message ?? 'Value must be defined', {
      code: 'UNDEFINED_VALUE',
    });
  }
}

/**
 * Assert value matches type
 */
export function assertType<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  message?: string
): asserts value is T {
  if (!typeGuard(value)) {
    throw new GitVanError(message ?? 'Type assertion failed', {
      code: 'TYPE_MISMATCH',
    });
  }
}

// =============================================================================
// Safe Execution
// =============================================================================

/**
 * Execute function and return Result type
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Execute function safely, returning Result
 */
export function safe<T>(fn: () => T): Result<T> {
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
 * Execute async function safely, returning Result
 */
export async function safeAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
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
 * Unwrap Result or throw
 */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap Result or return default
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (result.ok) {
    return result.value;
  }
  return defaultValue;
}
