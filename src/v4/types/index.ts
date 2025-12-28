/**
 * GitVan v4 API Types
 *
 * Comprehensive type definitions for hooks-based reactive API patterns.
 * Compatible with @unrdf/hooks reactive system.
 *
 * @packageDocumentation
 * @module @gitvan/v4/types
 */

import type { Job, JobCtx, JobResult } from '../../../types/job.d.ts';
import type { GitVanConfig } from '../../../types/config.d.ts';

// =============================================================================
// Core Hook Types
// =============================================================================

/**
 * Hook lifecycle phases
 */
export type HookPhase =
  | 'init'
  | 'mount'
  | 'update'
  | 'cleanup'
  | 'error'
  | 'suspend'
  | 'resume';

/**
 * Hook execution priority
 */
export type HookPriority = 'critical' | 'high' | 'normal' | 'low' | 'idle';

/**
 * Hook state representing reactive value with metadata
 */
export interface HookState<T> {
  /** Current value */
  value: T;
  /** Previous value */
  previousValue?: T;
  /** State version for change detection */
  version: number;
  /** Timestamp of last update */
  updatedAt: number;
  /** Whether state is stale/needs recomputation */
  isStale: boolean;
  /** Whether state is currently being computed */
  isPending: boolean;
  /** Error if computation failed */
  error?: Error;
}

/**
 * Disposer function returned by hooks for cleanup
 */
export type Disposer = () => void | Promise<void>;

/**
 * Hook subscription for reactive updates
 */
export interface HookSubscription<T = unknown> {
  /** Unique subscription ID */
  id: string;
  /** Callback invoked on value change */
  callback: (value: T, previousValue?: T) => void;
  /** Unsubscribe from updates */
  unsubscribe: Disposer;
  /** Whether subscription is active */
  isActive: boolean;
}

/**
 * Hook context for dependency injection
 */
export interface HookContext {
  /** Context identifier */
  id: string;
  /** Parent context (for nested scopes) */
  parent?: HookContext;
  /** Registered providers */
  providers: Map<symbol, unknown>;
  /** Active subscriptions */
  subscriptions: Set<HookSubscription>;
  /** Cleanup functions */
  cleanups: Set<Disposer>;
  /** Context metadata */
  meta: Record<string, unknown>;
}

/**
 * Hook dependency descriptor
 */
export interface HookDependency<T = unknown> {
  /** Dependency token */
  token: symbol;
  /** Whether dependency is optional */
  optional?: boolean;
  /** Default value if not provided */
  defaultValue?: T;
  /** Factory function to create default */
  factory?: () => T | Promise<T>;
}

// =============================================================================
// Reactive Signal Types
// =============================================================================

/**
 * Reactive signal (read-only)
 */
export interface Signal<T> {
  /** Get current value */
  (): T;
  /** Subscribe to changes */
  subscribe(callback: (value: T) => void): Disposer;
  /** Get value without tracking */
  peek(): T;
  /** Check if value is defined */
  isDefined(): boolean;
}

/**
 * Writable signal
 */
export interface WritableSignal<T> extends Signal<T> {
  /** Set new value */
  set(value: T): void;
  /** Update value using transform function */
  update(fn: (current: T) => T): void;
  /** Reset to initial value */
  reset(): void;
}

/**
 * Computed signal (derived from other signals)
 */
export interface ComputedSignal<T> extends Signal<T> {
  /** Force recomputation */
  recompute(): void;
  /** Check if computation is current */
  isCurrent(): boolean;
  /** Dependencies of this computed */
  readonly dependencies: ReadonlyArray<Signal<unknown>>;
}

/**
 * Effect descriptor
 */
export interface Effect {
  /** Effect identifier */
  id: string;
  /** Run the effect */
  run(): void | Promise<void>;
  /** Stop the effect */
  stop(): void;
  /** Whether effect is active */
  isActive: boolean;
  /** Trigger immediate execution */
  trigger(): void;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * HTTP methods supported
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

/**
 * API request with reactive extensions
 */
export interface ApiRequest<T = unknown> {
  /** Request ID for tracing */
  id: string;
  /** HTTP method */
  method: HttpMethod;
  /** Request path */
  path: string;
  /** URL parameters */
  params: Record<string, string>;
  /** Query string parameters */
  query: Record<string, string | string[]>;
  /** Request headers */
  headers: Record<string, string>;
  /** Request body */
  body?: T;
  /** Request context (DI container) */
  context: HookContext;
  /** Request timestamp */
  timestamp: number;
  /** Abort signal */
  signal?: AbortSignal;
  /** Request metadata */
  meta: Record<string, unknown>;
}

/**
 * API response with reactive extensions
 */
export interface ApiResponse<T = unknown> {
  /** Response status code */
  status: number;
  /** Status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  body?: T;
  /** Response metadata */
  meta: {
    /** Request ID this response is for */
    requestId: string;
    /** Response timestamp */
    timestamp: number;
    /** Response duration in ms */
    duration: number;
    /** Cache status */
    cached?: boolean;
    /** Validation errors */
    errors?: ValidationError[];
  };
}

/**
 * Validation error detail
 */
export interface ValidationError {
  /** Field path that failed validation */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Expected value/type */
  expected?: string;
  /** Received value/type */
  received?: string;
}

// =============================================================================
// Middleware Types
// =============================================================================

/**
 * Middleware function signature
 */
export type MiddlewareFn<TReq = ApiRequest, TRes = ApiResponse> = (
  request: TReq,
  next: () => Promise<TRes>
) => Promise<TRes>;

/**
 * Middleware descriptor
 */
export interface Middleware<TReq = ApiRequest, TRes = ApiResponse> {
  /** Middleware name */
  name: string;
  /** Middleware priority */
  priority: HookPriority;
  /** Execution order (lower = earlier) */
  order: number;
  /** The middleware function */
  handler: MiddlewareFn<TReq, TRes>;
  /** Whether middleware is enabled */
  enabled: boolean;
  /** Paths to apply middleware to (glob patterns) */
  paths?: string[];
  /** Paths to exclude */
  excludePaths?: string[];
  /** Methods to apply to */
  methods?: HttpMethod[];
}

/**
 * Middleware pipeline
 */
export interface MiddlewarePipeline<TReq = ApiRequest, TRes = ApiResponse> {
  /** Add middleware to pipeline */
  use(middleware: Middleware<TReq, TRes>): MiddlewarePipeline<TReq, TRes>;
  /** Remove middleware by name */
  remove(name: string): boolean;
  /** Execute pipeline */
  execute(request: TReq, handler: () => Promise<TRes>): Promise<TRes>;
  /** Get all middleware */
  getAll(): ReadonlyArray<Middleware<TReq, TRes>>;
  /** Clear all middleware */
  clear(): void;
}

// =============================================================================
// Error Handling Types
// =============================================================================

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error */
  error?: Error;
  /** Error info (stack, component tree, etc.) */
  errorInfo?: {
    stack?: string;
    componentStack?: string;
    hookName?: string;
    phase?: HookPhase;
  };
  /** Number of retries attempted */
  retryCount: number;
  /** Whether currently retrying */
  isRetrying: boolean;
}

/**
 * Error recovery strategy
 */
export type ErrorRecoveryStrategy =
  | 'retry'
  | 'fallback'
  | 'reset'
  | 'propagate'
  | 'ignore';

/**
 * Error boundary options
 */
export interface ErrorBoundaryOptions {
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Exponential backoff factor */
  backoffFactor?: number;
  /** Default recovery strategy */
  strategy?: ErrorRecoveryStrategy;
  /** Error filter (return true to handle) */
  shouldCatch?: (error: Error) => boolean;
  /** Fallback value on error */
  fallback?: unknown;
  /** Error callback */
  onError?: (error: Error, info: ErrorBoundaryState['errorInfo']) => void;
  /** Reset callback */
  onReset?: () => void;
}

// =============================================================================
// API Builder Types
// =============================================================================

/**
 * Route handler function
 */
export type RouteHandler<TReq = ApiRequest, TRes = unknown> = (
  request: TReq
) => Promise<TRes> | TRes;

/**
 * Route definition
 */
export interface RouteDefinition<TReq = ApiRequest, TRes = unknown> {
  /** HTTP method */
  method: HttpMethod;
  /** Route path pattern */
  path: string;
  /** Route handler */
  handler: RouteHandler<TReq, TRes>;
  /** Route middleware */
  middleware?: Middleware[];
  /** Route metadata */
  meta?: Record<string, unknown>;
  /** Request schema for validation */
  requestSchema?: unknown;
  /** Response schema for validation */
  responseSchema?: unknown;
}

/**
 * API endpoint builder
 */
export interface EndpointBuilder<TReq = ApiRequest, TRes = unknown> {
  /** Set request schema */
  input<T>(schema: T): EndpointBuilder<TReq & { body: T }, TRes>;
  /** Set response schema */
  output<T>(schema: T): EndpointBuilder<TReq, T>;
  /** Add middleware */
  use(middleware: Middleware): EndpointBuilder<TReq, TRes>;
  /** Set handler */
  handler(fn: RouteHandler<TReq, TRes>): RouteDefinition<TReq, TRes>;
  /** Add metadata */
  meta(data: Record<string, unknown>): EndpointBuilder<TReq, TRes>;
}

/**
 * API router
 */
export interface ApiRouter {
  /** Register GET route */
  get<TRes = unknown>(path: string): EndpointBuilder<ApiRequest, TRes>;
  /** Register POST route */
  post<TRes = unknown>(path: string): EndpointBuilder<ApiRequest, TRes>;
  /** Register PUT route */
  put<TRes = unknown>(path: string): EndpointBuilder<ApiRequest, TRes>;
  /** Register PATCH route */
  patch<TRes = unknown>(path: string): EndpointBuilder<ApiRequest, TRes>;
  /** Register DELETE route */
  delete<TRes = unknown>(path: string): EndpointBuilder<ApiRequest, TRes>;
  /** Mount sub-router */
  mount(prefix: string, router: ApiRouter): ApiRouter;
  /** Get all routes */
  getRoutes(): ReadonlyArray<RouteDefinition>;
  /** Apply global middleware */
  use(middleware: Middleware): ApiRouter;
}

// =============================================================================
// GitVan-Specific Hook Types
// =============================================================================

/**
 * Git operation hook
 */
export interface GitHook {
  /** Hook type */
  type: 'pre-commit' | 'commit-msg' | 'post-commit' | 'pre-push' | 'post-merge';
  /** Hook handler */
  handler: (ctx: GitHookContext) => Promise<GitHookResult>;
  /** Hook priority */
  priority: HookPriority;
  /** Whether hook is enabled */
  enabled: boolean;
}

/**
 * Git hook execution context
 */
export interface GitHookContext {
  /** Git operation being performed */
  operation: string;
  /** Current branch */
  branch: string;
  /** Commit message (if applicable) */
  message?: string;
  /** Files affected */
  files?: string[];
  /** Previous commit hash */
  previousHead?: string;
  /** New commit hash */
  newHead?: string;
  /** Hook-specific data */
  data?: Record<string, unknown>;
}

/**
 * Git hook result
 */
export interface GitHookResult {
  /** Whether hook passed */
  success: boolean;
  /** Hook messages */
  messages: string[];
  /** Hook warnings */
  warnings?: string[];
  /** Modified data (e.g., reformatted commit message) */
  modified?: Record<string, unknown>;
  /** Whether to abort operation */
  abort?: boolean;
}

/**
 * Job hook for workflow automation
 */
export interface JobHook {
  /** Job being hooked */
  jobId: string;
  /** Hook phase */
  phase: 'before' | 'during' | 'after' | 'error';
  /** Hook handler */
  handler: (job: Job, ctx: JobCtx) => Promise<void> | void;
  /** Hook priority */
  priority: HookPriority;
}

/**
 * Configuration hook
 */
export interface ConfigHook {
  /** Config path being watched */
  path: string;
  /** Hook handler */
  handler: (newConfig: Partial<GitVanConfig>, oldConfig: Partial<GitVanConfig>) => void;
  /** Whether to run on initial load */
  runOnLoad: boolean;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Make all properties deeply partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the resolved type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Make specific properties required
 */
export type RequiredProps<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Hook factory function type
 */
export type HookFactory<T, Args extends unknown[] = []> = (...args: Args) => T;

/**
 * Cleanup registry for managing disposers
 */
export interface CleanupRegistry {
  /** Register a cleanup function */
  register(cleanup: Disposer): void;
  /** Run all cleanups */
  runAll(): Promise<void>;
  /** Clear all registered cleanups */
  clear(): void;
  /** Number of registered cleanups */
  readonly size: number;
}

// Re-export job types for convenience
export type { Job, JobCtx, JobResult } from '../../../types/job.d.ts';
export type { GitVanConfig } from '../../../types/config.d.ts';
