/**
 * @fileoverview GitVan v4 - Error Handling Hooks
 *
 * This module provides hooks for comprehensive error handling,
 * recovery, and propagation in hook-based applications.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import {
  useState,
  useEffect,
  useRef,
  useMountEffect,
  type HookCleanup,
  type AsyncHookResult,
} from '../core/index.js';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error severity levels
 */
export type ErrorSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | 'network'
  | 'filesystem'
  | 'git'
  | 'validation'
  | 'timeout'
  | 'permission'
  | 'resource'
  | 'unknown';

/**
 * Enhanced error with metadata
 */
export class HookOperationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly category: ErrorCategory,
    public readonly severity: ErrorSeverity,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'HookOperationError';
    Object.setPrototypeOf(this, HookOperationError.prototype);
  }

  /**
   * Create from a standard error
   */
  static from(
    error: Error,
    options: {
      code?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
    } = {},
  ): HookOperationError {
    return new HookOperationError(
      error.message,
      options.code ?? 'UNKNOWN_ERROR',
      options.category ?? 'unknown',
      options.severity ?? 'error',
      options.context,
      error,
    );
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

/**
 * Error handler function type
 */
export type ErrorHandler = (error: HookOperationError) => void | Promise<void>;

/**
 * Error recovery function type
 */
export type ErrorRecovery<T> = (error: HookOperationError) => T | Promise<T>;

/**
 * Error boundary configuration
 */
export interface ErrorBoundaryConfig {
  /** Error handler */
  onError?: ErrorHandler;
  /** Whether to rethrow errors */
  rethrow?: boolean;
  /** Fallback value on error */
  fallback?: unknown;
  /** Error categories to catch */
  categories?: readonly ErrorCategory[];
  /** Severity threshold (catch errors at or above) */
  severityThreshold?: ErrorSeverity;
  /** Whether to log errors */
  log?: boolean;
}

// ============================================================================
// Global Error Handling
// ============================================================================

/**
 * Global error handlers
 */
const globalErrorHandlers = new Set<ErrorHandler>();

/**
 * Register a global error handler
 *
 * @param handler - Error handler function
 * @returns Unregister function
 *
 * @example
 * ```typescript
 * const unregister = registerErrorHandler((error) => {
 *   sendToErrorTracking(error);
 * });
 * ```
 */
export function registerErrorHandler(handler: ErrorHandler): () => void {
  globalErrorHandlers.add(handler);
  return () => globalErrorHandlers.delete(handler);
}

/**
 * Emit an error to all global handlers
 */
async function emitError(error: HookOperationError): Promise<void> {
  for (const handler of globalErrorHandlers) {
    try {
      await handler(error);
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError);
    }
  }
}

// ============================================================================
// Error Hooks
// ============================================================================

/**
 * Hook to track and handle errors
 *
 * @returns Error state and handlers
 *
 * @example
 * ```typescript
 * const { error, setError, clearError, handleError } = useError();
 *
 * try {
 *   await riskyOperation();
 * } catch (e) {
 *   handleError(e, { category: 'network' });
 * }
 * ```
 */
export function useError(): {
  error: () => HookOperationError | null;
  setError: (error: HookOperationError | null) => void;
  clearError: () => void;
  handleError: (
    error: unknown,
    options?: {
      code?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
    },
  ) => HookOperationError;
  hasError: () => boolean;
} {
  const [error, setError] = useState<HookOperationError | null>(null);

  const clearError = () => setError(null);

  const handleError = (
    rawError: unknown,
    options: {
      code?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
    } = {},
  ): HookOperationError => {
    const err = rawError instanceof Error
      ? HookOperationError.from(rawError, options)
      : new HookOperationError(
          String(rawError),
          options.code ?? 'UNKNOWN_ERROR',
          options.category ?? 'unknown',
          options.severity ?? 'error',
          options.context,
        );

    setError(err);
    emitError(err);

    return err;
  };

  const hasError = () => error() !== null;

  return {
    error,
    setError,
    clearError,
    handleError,
    hasError,
  };
}

/**
 * Hook for error boundary with recovery
 *
 * @param config - Error boundary configuration
 * @returns Error boundary handlers
 *
 * @example
 * ```typescript
 * const { execute, error, reset } = useErrorBoundary({
 *   onError: (e) => console.error(e),
 *   fallback: defaultValue,
 * });
 *
 * const result = await execute(async () => {
 *   return await riskyOperation();
 * });
 * ```
 */
export function useErrorBoundary<T>(config: ErrorBoundaryConfig = {}): {
  execute: (fn: () => T | Promise<T>) => Promise<T | undefined>;
  executeWithFallback: (fn: () => T | Promise<T>, fallback: T) => Promise<T>;
  error: () => HookOperationError | null;
  reset: () => void;
  isError: () => boolean;
} {
  const {
    onError,
    rethrow = false,
    fallback,
    categories,
    severityThreshold = 'debug',
    log = true,
  } = config;

  const [error, setError] = useState<HookOperationError | null>(null);

  const severityOrder: ErrorSeverity[] = ['debug', 'info', 'warning', 'error', 'critical'];

  const shouldCatch = (err: HookOperationError): boolean => {
    // Check category
    if (categories && !categories.includes(err.category)) {
      return false;
    }

    // Check severity
    const errIndex = severityOrder.indexOf(err.severity);
    const thresholdIndex = severityOrder.indexOf(severityThreshold);
    if (errIndex < thresholdIndex) {
      return false;
    }

    return true;
  };

  const execute = async (fn: () => T | Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (rawError) {
      const err = rawError instanceof HookOperationError
        ? rawError
        : HookOperationError.from(
            rawError instanceof Error ? rawError : new Error(String(rawError)),
          );

      if (!shouldCatch(err)) {
        throw err;
      }

      if (log) {
        console.error(`[ErrorBoundary] ${err.code}:`, err.message);
      }

      setError(err);

      if (onError) {
        await onError(err);
      }

      await emitError(err);

      if (rethrow) {
        throw err;
      }

      return fallback as T | undefined;
    }
  };

  const executeWithFallback = async (
    fn: () => T | Promise<T>,
    fb: T,
  ): Promise<T> => {
    const result = await execute(fn);
    return result ?? fb;
  };

  const reset = () => setError(null);

  const isError = () => error() !== null;

  return {
    execute,
    executeWithFallback,
    error,
    reset,
    isError,
  };
}

/**
 * Hook for try-catch wrapper with typed errors
 *
 * @param operation - Operation to wrap
 * @returns Result or error
 *
 * @example
 * ```typescript
 * const { result, error, isLoading, run } = useTryCatch(() => fetchData());
 *
 * useEffect(() => {
 *   run();
 * });
 * ```
 */
export function useTryCatch<T>(
  operation: () => Promise<T>,
): {
  result: () => T | null;
  error: () => HookOperationError | null;
  isLoading: () => boolean;
  run: () => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<{
    result: T | null;
    error: HookOperationError | null;
    isLoading: boolean;
  }>({
    result: null,
    error: null,
    isLoading: false,
  });

  const run = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await operation();
      setState({ result, error: null, isLoading: false });
    } catch (rawError) {
      const error = rawError instanceof HookOperationError
        ? rawError
        : HookOperationError.from(
            rawError instanceof Error ? rawError : new Error(String(rawError)),
          );

      setState((prev) => ({ ...prev, error, isLoading: false }));
      await emitError(error);
    }
  };

  const reset = () => {
    setState({ result: null, error: null, isLoading: false });
  };

  const s = state();

  return {
    result: () => s.result,
    error: () => s.error,
    isLoading: () => s.isLoading,
    run,
    reset,
  };
}

/**
 * Hook for graceful degradation
 *
 * @param primary - Primary data source
 * @param fallback - Fallback data source
 * @returns Degraded result
 *
 * @example
 * ```typescript
 * const data = useGracefulDegradation(
 *   () => fetchFromAPI(),
 *   () => loadFromCache()
 * );
 * ```
 */
export function useGracefulDegradation<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
): () => AsyncHookResult<T> {
  const [state, setState] = useState<AsyncHookResult<T>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useMountEffect(() => {
    const startTime = Date.now();

    primary()
      .then((data) => {
        setState({
          data,
          error: null,
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      })
      .catch(async (primaryError) => {
        console.warn('Primary source failed, trying fallback:', primaryError);

        try {
          const data = await fallback();
          setState({
            data,
            error: null,
            loading: false,
            executed: true,
            duration: Date.now() - startTime,
            attempts: 2,
            cached: true, // Assume fallback is cached
          });
        } catch (fallbackError) {
          const error = HookOperationError.from(
            fallbackError instanceof Error
              ? fallbackError
              : new Error(String(fallbackError)),
            { category: 'resource' },
          );

          setState({
            data: null,
            error,
            loading: false,
            executed: true,
            duration: Date.now() - startTime,
            attempts: 2,
            cached: false,
          });

          emitError(error);
        }
      });
  });

  return state;
}

/**
 * Hook for circuit breaker pattern
 *
 * @param operation - Operation to protect
 * @param options - Circuit breaker options
 * @returns Protected operation
 *
 * @example
 * ```typescript
 * const { execute, state } = useCircuitBreaker(
 *   () => fetchData(),
 *   { threshold: 5, timeout: 30000 }
 * );
 * ```
 */
export function useCircuitBreaker<T>(
  operation: () => Promise<T>,
  options: {
    /** Failure threshold before opening circuit */
    threshold?: number;
    /** Time to wait before trying again (half-open) */
    timeout?: number;
    /** Time to consider the circuit healthy */
    healthyTimeout?: number;
  } = {},
): {
  execute: () => Promise<T>;
  state: () => 'closed' | 'open' | 'half-open';
  failures: () => number;
  reset: () => void;
} {
  const { threshold = 5, timeout = 30000, healthyTimeout = 60000 } = options;

  const [state, setState] = useState<{
    status: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure: number | null;
    lastSuccess: number | null;
  }>({
    status: 'closed',
    failures: 0,
    lastFailure: null,
    lastSuccess: null,
  });

  const execute = async (): Promise<T> => {
    const current = state();

    // Check if circuit should transition
    if (current.status === 'open' && current.lastFailure) {
      if (Date.now() - current.lastFailure >= timeout) {
        setState((prev) => ({ ...prev, status: 'half-open' }));
      } else {
        throw new HookOperationError(
          'Circuit breaker is open',
          'CIRCUIT_OPEN',
          'resource',
          'warning',
        );
      }
    }

    try {
      const result = await operation();

      setState({
        status: 'closed',
        failures: 0,
        lastFailure: null,
        lastSuccess: Date.now(),
      });

      return result;
    } catch (error) {
      const failures = current.failures + 1;

      if (failures >= threshold) {
        setState({
          status: 'open',
          failures,
          lastFailure: Date.now(),
          lastSuccess: current.lastSuccess,
        });
      } else {
        setState((prev) => ({
          ...prev,
          failures,
          lastFailure: Date.now(),
        }));
      }

      throw error;
    }
  };

  const reset = () => {
    setState({
      status: 'closed',
      failures: 0,
      lastFailure: null,
      lastSuccess: null,
    });
  };

  const s = state();

  return {
    execute,
    state: () => s.status,
    failures: () => s.failures,
    reset,
  };
}

/**
 * Hook for error reporting
 *
 * @param reporter - Error reporting function
 * @returns Report function
 *
 * @example
 * ```typescript
 * const report = useErrorReporter(async (error) => {
 *   await sendToSentry(error);
 * });
 *
 * // Later
 * report(new Error('Something went wrong'), { userId: 123 });
 * ```
 */
export function useErrorReporter(
  reporter: (error: HookOperationError, metadata?: Record<string, unknown>) => Promise<void> | void,
): (error: unknown, metadata?: Record<string, unknown>) => void {
  return (rawError: unknown, metadata?: Record<string, unknown>) => {
    const error = rawError instanceof HookOperationError
      ? rawError
      : HookOperationError.from(
          rawError instanceof Error ? rawError : new Error(String(rawError)),
        );

    reporter(error, metadata);
  };
}

/**
 * Hook for error aggregation
 *
 * @returns Error aggregation functions
 *
 * @example
 * ```typescript
 * const { errors, add, clear, hasErrors, summary } = useErrorAggregator();
 *
 * // Collect multiple errors
 * add(error1);
 * add(error2);
 *
 * // Check and process
 * if (hasErrors()) {
 *   console.log(summary());
 * }
 * ```
 */
export function useErrorAggregator(): {
  errors: () => readonly HookOperationError[];
  add: (error: unknown, options?: { code?: string; category?: ErrorCategory }) => void;
  clear: () => void;
  hasErrors: () => boolean;
  count: () => number;
  summary: () => string;
  byCategory: () => Record<ErrorCategory, HookOperationError[]>;
} {
  const [errors, setErrors] = useState<HookOperationError[]>([]);

  const add = (
    rawError: unknown,
    options: { code?: string; category?: ErrorCategory } = {},
  ) => {
    const error = rawError instanceof HookOperationError
      ? rawError
      : HookOperationError.from(
          rawError instanceof Error ? rawError : new Error(String(rawError)),
          options,
        );

    setErrors((prev) => [...prev, error]);
  };

  const clear = () => setErrors([]);

  const hasErrors = () => errors().length > 0;

  const count = () => errors().length;

  const summary = () => {
    const errs = errors();
    if (errs.length === 0) return 'No errors';

    const byCategory = errs.reduce((acc, err) => {
      acc[err.category] = (acc[err.category] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(byCategory)
      .map(([cat, cnt]) => `${cat}: ${cnt}`)
      .join(', ');
  };

  const byCategory = () => {
    return errors().reduce((acc, err) => {
      if (!acc[err.category]) {
        acc[err.category] = [];
      }
      acc[err.category].push(err);
      return acc;
    }, {} as Record<ErrorCategory, HookOperationError[]>);
  };

  return {
    errors,
    add,
    clear,
    hasErrors,
    count,
    summary,
    byCategory,
  };
}
