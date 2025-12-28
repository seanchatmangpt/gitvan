/**
 * @fileoverview GitVan v4 - @unrdf/hooks Core Type Definitions
 *
 * This module provides the foundational types for the hooks-based state
 * management system. All types are designed for TypeScript strict mode
 * compatibility with full type inference support.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// ============================================================================
// Core Hook Types
// ============================================================================

/**
 * Represents a hook cleanup function returned by effect hooks
 * Called when the hook is disposed or dependencies change
 */
export type HookCleanup = () => void | Promise<void>;

/**
 * Represents a hook dependency that can be watched for changes
 * Can be any serializable value or a getter function
 */
export type HookDependency = unknown;

/**
 * Array of hook dependencies for effect tracking
 */
export type HookDependencies = readonly HookDependency[];

/**
 * Hook state initializer - can be a value or a factory function
 */
export type HookStateInitializer<T> = T | (() => T);

/**
 * Hook state setter - can be a value or an updater function
 */
export type HookStateSetter<T> = T | ((prev: T) => T);

/**
 * Result tuple from useState hook
 */
export type HookStateResult<T> = readonly [
  value: T,
  setValue: (setter: HookStateSetter<T>) => void,
];

// ============================================================================
// Hook Context Types
// ============================================================================

/**
 * Base context for all hooks providing access to core functionality
 */
export interface HookContext {
  /** Current working directory */
  readonly cwd: string;
  /** Environment variables */
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Unique session identifier */
  readonly sessionId: string;
  /** Context creation timestamp */
  readonly timestamp: Date;
  /** Optional logger instance */
  readonly logger?: HookLogger;
}

/**
 * Git-specific context extending base hook context
 */
export interface GitHookContext extends HookContext {
  /** Repository root directory */
  readonly repoRoot: string;
  /** Current branch name */
  readonly branch: string;
  /** Current HEAD commit SHA */
  readonly headSha: string;
  /** Whether repository has uncommitted changes */
  readonly isDirty: boolean;
  /** Remote URL if available */
  readonly remote?: string;
}

/**
 * Mutable hook context for internal use
 */
export interface MutableHookContext extends HookContext {
  cwd: string;
  env: Record<string, string | undefined>;
}

// ============================================================================
// Hook Result Types
// ============================================================================

/**
 * Represents the result of an async hook operation
 */
export interface HookResult<T> {
  /** The result data if successful */
  readonly data: T | null;
  /** Error if the operation failed */
  readonly error: Error | null;
  /** Whether the operation is currently loading */
  readonly loading: boolean;
  /** Whether the operation has been executed at least once */
  readonly executed: boolean;
}

/**
 * Represents a successful hook result
 */
export interface HookSuccess<T> extends HookResult<T> {
  readonly data: T;
  readonly error: null;
  readonly loading: false;
  readonly executed: true;
}

/**
 * Represents a failed hook result
 */
export interface HookError extends HookResult<null> {
  readonly data: null;
  readonly error: Error;
  readonly loading: false;
  readonly executed: true;
}

/**
 * Represents a loading hook result
 */
export interface HookLoading extends HookResult<null> {
  readonly data: null;
  readonly error: null;
  readonly loading: true;
  readonly executed: false;
}

// ============================================================================
// Hook Subscription Types
// ============================================================================

/**
 * Callback for hook state changes
 */
export type HookSubscriber<T> = (value: T) => void;

/**
 * Function to unsubscribe from hook updates
 */
export type HookUnsubscribe = () => void;

/**
 * Subscription options for hook watchers
 */
export interface HookSubscriptionOptions {
  /** Whether to immediately emit current value */
  readonly immediate?: boolean;
  /** Debounce delay in milliseconds */
  readonly debounce?: number;
  /** Only emit when value actually changes */
  readonly distinct?: boolean;
}

// ============================================================================
// Hook Lifecycle Types
// ============================================================================

/**
 * Hook lifecycle phases
 */
export type HookPhase =
  | 'created'
  | 'initializing'
  | 'ready'
  | 'updating'
  | 'disposing'
  | 'disposed';

/**
 * Hook lifecycle event
 */
export interface HookLifecycleEvent {
  /** Phase that was entered */
  readonly phase: HookPhase;
  /** Timestamp of the transition */
  readonly timestamp: Date;
  /** Previous phase if applicable */
  readonly previousPhase?: HookPhase;
  /** Error if transition failed */
  readonly error?: Error;
}

/**
 * Lifecycle hook callback
 */
export type HookLifecycleCallback = (event: HookLifecycleEvent) => void | Promise<void>;

// ============================================================================
// Hook Logger Types
// ============================================================================

/**
 * Log levels for hook logging
 */
export type HookLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface for hooks
 */
export interface HookLogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: Error): void;
}

// ============================================================================
// Hook Error Types
// ============================================================================

/**
 * Base class for all hook-related errors
 */
export class HookError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'HookError';
    Object.setPrototypeOf(this, HookError.prototype);
  }
}

/**
 * Error thrown when hook context is missing
 */
export class HookContextError extends HookError {
  constructor(message: string, cause?: Error) {
    super(message, 'HOOK_CONTEXT_ERROR', cause);
    this.name = 'HookContextError';
    Object.setPrototypeOf(this, HookContextError.prototype);
  }
}

/**
 * Error thrown when hook is used outside valid lifecycle
 */
export class HookLifecycleError extends HookError {
  constructor(message: string, cause?: Error) {
    super(message, 'HOOK_LIFECYCLE_ERROR', cause);
    this.name = 'HookLifecycleError';
    Object.setPrototypeOf(this, HookLifecycleError.prototype);
  }
}

/**
 * Error thrown when hook operation times out
 */
export class HookTimeoutError extends HookError {
  constructor(
    message: string,
    public readonly timeoutMs: number,
    cause?: Error,
  ) {
    super(message, 'HOOK_TIMEOUT_ERROR', cause);
    this.name = 'HookTimeoutError';
    Object.setPrototypeOf(this, HookTimeoutError.prototype);
  }
}

// ============================================================================
// Hook Configuration Types
// ============================================================================

/**
 * Configuration options for hook instances
 */
export interface HookConfig {
  /** Enable debug logging */
  readonly debug?: boolean;
  /** Default timeout for async operations in milliseconds */
  readonly timeout?: number;
  /** Custom logger instance */
  readonly logger?: HookLogger;
  /** Enable automatic cleanup on disposal */
  readonly autoCleanup?: boolean;
  /** Enable performance tracking */
  readonly trackPerformance?: boolean;
}

/**
 * Default hook configuration values
 */
export const DEFAULT_HOOK_CONFIG: Required<HookConfig> = {
  debug: false,
  timeout: 30000,
  logger: console as unknown as HookLogger,
  autoCleanup: true,
  trackPerformance: false,
} as const;

// ============================================================================
// Hook Metadata Types
// ============================================================================

/**
 * Metadata attached to hook instances for debugging and tracking
 */
export interface HookMetadata {
  /** Unique hook instance identifier */
  readonly id: string;
  /** Hook type/name */
  readonly type: string;
  /** Creation timestamp */
  readonly createdAt: Date;
  /** Last update timestamp */
  readonly updatedAt: Date;
  /** Number of times hook has been updated */
  readonly updateCount: number;
  /** Custom metadata */
  readonly custom?: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Async Hook Types
// ============================================================================

/**
 * Options for async hook operations
 */
export interface AsyncHookOptions {
  /** Abort signal for cancellation */
  readonly signal?: AbortSignal;
  /** Timeout in milliseconds */
  readonly timeout?: number;
  /** Retry configuration */
  readonly retry?: HookRetryConfig;
}

/**
 * Retry configuration for async hooks
 */
export interface HookRetryConfig {
  /** Maximum number of retries */
  readonly maxRetries: number;
  /** Initial delay between retries in milliseconds */
  readonly delay: number;
  /** Exponential backoff factor */
  readonly backoff?: number;
  /** Optional predicate to determine if error is retryable */
  readonly shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Result of an async hook execution with timing information
 */
export interface AsyncHookResult<T> extends HookResult<T> {
  /** Execution duration in milliseconds */
  readonly duration: number;
  /** Number of retry attempts made */
  readonly attempts: number;
  /** Whether result was from cache */
  readonly cached: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for HookSuccess
 */
export function isHookSuccess<T>(result: HookResult<T>): result is HookSuccess<T> {
  return result.data !== null && result.error === null && !result.loading;
}

/**
 * Type guard for HookError
 */
export function isHookError(result: HookResult<unknown>): result is HookError {
  return result.error !== null && !result.loading;
}

/**
 * Type guard for HookLoading
 */
export function isHookLoading(result: HookResult<unknown>): result is HookLoading {
  return result.loading;
}

/**
 * Type guard for function type
 */
export function isFunction<T>(value: T | (() => T)): value is () => T {
  return typeof value === 'function';
}
