/**
 * GitVan v4 API
 *
 * Hooks-based reactive API for GitVan operations.
 * Compatible with @unrdf/hooks reactive patterns.
 *
 * @packageDocumentation
 * @module @gitvan/v4
 */

// =============================================================================
// Core Exports
// =============================================================================

// Signals (reactive primitives)
export {
  signal,
  computed,
  readonly,
  effect,
  watch,
  batch,
  untrack,
  isTracking,
  subscribe,
  deferred,
  throttled,
} from './core/signals.js';

export type {
  Signal,
  WritableSignal,
  ComputedSignal,
} from './core/signals.js';

// Context & Dependency Injection
export {
  token,
  createContext,
  getCurrentContext,
  runInContext,
  runInContextAsync,
  provide,
  inject,
  tryInject,
  hasProvider,
  defineProvider,
  registerProviders,
  createScopedContext,
  createCleanupRegistry,
  onCleanup,
  cleanupContext,
  contextSignal,
  getContextDebugInfo,
  printContextHierarchy,
  Tokens,
} from './core/context.js';

export type {
  ProviderDefinition,
} from './core/context.js';

// Core Hooks
export {
  // State
  useState,
  useReducer,
  // Effects
  useEffect,
  useMountEffect,
  useWatch,
  // Memo
  useMemo,
  useCallback,
  // Refs
  useRef,
  usePersistentRef,
  // Async
  useAsync,
  useDebouncedAsync,
  // Resources
  useResource,
  // Events
  useEvents,
  // Lifecycle
  onMount,
  onUnmount,
  onUpdate,
  // Utilities
  useId,
  useToggle,
  useCounter,
  usePrevious,
  useInterval,
  useTimeout,
} from './core/hooks.js';

export type {
  AsyncState,
  Resource,
  EventRegistry,
} from './core/hooks.js';

// =============================================================================
// Middleware Exports
// =============================================================================

export {
  createPipeline,
  defineMiddleware,
  middleware,
  loggingMiddleware,
  errorMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  timeoutMiddleware,
  cacheMiddleware,
  composeMiddleware,
  useMiddleware,
} from './middleware/pipeline.js';

// =============================================================================
// Error Handling Exports
// =============================================================================

export {
  // Error classes
  GitVanError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  TimeoutError,
  RateLimitError,
  // Error boundary
  createErrorBoundary,
  useErrorBoundary,
  tryCatch,
  catchWithDefault,
  // Error handling
  registerErrorHandler,
  handleError,
  formatErrorResponse,
  getErrorStatusCode,
  // Assertions
  assert,
  assertDefined,
  assertType,
  // Safe execution
  safe,
  safeAsync,
  unwrap,
  unwrapOr,
} from './errors/boundaries.js';

export type {
  ErrorBoundary,
  Result,
} from './errors/boundaries.js';

// =============================================================================
// Request/Response Exports
// =============================================================================

export {
  // Request
  generateRequestId,
  createRequest,
  RequestBuilder,
  // Response
  createResponse,
  ResponseBuilder,
  // Common responses
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  // Hooks
  useRequest,
  useResponse,
  // Handler
  createHandler,
  // Utilities
  parseQuery,
  buildQuery,
} from './api/request.js';

export type {
  RequestState,
  HandlerContext,
} from './api/request.js';

// =============================================================================
// Router Exports
// =============================================================================

export {
  createRouter,
  createRouterHandler,
  createResourceRouter,
  routerGroup,
} from './builders/router.js';

export type {
  ResourceController,
} from './builders/router.js';

// =============================================================================
// GitVan-Specific Hooks
// =============================================================================

export {
  // Tokens
  GitVanTokens,
  // Git hooks
  useGit,
  // Job hooks
  useJob,
  // Template hooks
  useTemplate,
  // Config hooks
  useConfig,
  // Hook registry
  useHooks,
  // Workflow hooks
  useWorkflow,
} from './hooks/gitvan.js';

export type {
  JobState,
  WorkflowStep,
  WorkflowContext,
  WorkflowState,
} from './hooks/gitvan.js';

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Core types
  HookPhase,
  HookPriority,
  HookState,
  Disposer,
  HookSubscription,
  HookContext,
  HookDependency,
  // API types
  HttpMethod,
  ApiRequest,
  ApiResponse,
  ValidationError as ApiValidationError,
  // Middleware types
  MiddlewareFn,
  Middleware,
  MiddlewarePipeline,
  // Error types
  ErrorBoundaryState,
  ErrorBoundaryOptions,
  ErrorRecoveryStrategy,
  // Builder types
  RouteHandler,
  RouteDefinition,
  EndpointBuilder,
  ApiRouter,
  // Git types
  GitHook,
  GitHookContext,
  GitHookResult,
  JobHook,
  ConfigHook,
  // Utility types
  DeepPartial,
  Awaited,
  RequiredProps,
  HookFactory,
  CleanupRegistry,
  // Re-exported types
  Job,
  JobCtx,
  JobResult,
  GitVanConfig,
} from './types/index.js';

// =============================================================================
// Version
// =============================================================================

/**
 * GitVan v4 API version
 */
export const VERSION = '4.0.0';

/**
 * Check if running in v4 compatibility mode
 */
export function isV4(): boolean {
  return true;
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize GitVan v4 with configuration
 *
 * @example
 * ```ts
 * import { initGitVan } from '@gitvan/v4';
 *
 * const gitvan = await initGitVan({
 *   root: process.cwd(),
 *   config: {
 *     logging: { level: 'debug' },
 *   },
 * });
 *
 * // Use hooks in context
 * runInContext(gitvan.context, () => {
 *   const git = useGit();
 *   console.log('Branch:', git.branch);
 * });
 * ```
 */
export async function initGitVan(options?: {
  root?: string;
  config?: Record<string, unknown>;
}): Promise<{
  context: import('./types/index.js').HookContext;
  cleanup: () => Promise<void>;
}> {
  const context = createContext(undefined, {
    root: options?.root ?? process.cwd(),
    version: VERSION,
    initialized: Date.now(),
  });

  // Provide default config
  if (options?.config) {
    provide(context, Tokens.Config, options.config);
  }

  // Provide default logger
  provide(context, Tokens.Logger, console);

  // Provide default cache
  provide(context, Tokens.Cache, new Map());

  const cleanup = async () => {
    await cleanupContext(context);
  };

  return { context, cleanup };
}
