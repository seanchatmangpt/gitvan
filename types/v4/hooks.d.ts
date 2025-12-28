/**
 * @fileoverview GitVan v4 - Hook Type Definitions with @unrdf/hooks Integration
 *
 * This module provides comprehensive hook types for GitVan's reactive system.
 * It implements patterns from @unrdf/hooks including reactive state, effects,
 * and composable hook utilities with full TypeScript strict mode compatibility.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import type {
  HookId,
  WorkflowId,
  StepId,
  ExecutionId,
  SessionId,
  HookPhase,
  Priority,
  Json,
  Result,
  Option,
  DurationMs,
  UnixTimestamp,
  ISODateString,
  DeepReadonly,
  DeepPartial,
  Prettify,
  AnyFunction,
  AsyncFunction,
} from './base.d.ts';

// ============================================================================
// Hook Lifecycle Types
// ============================================================================

/**
 * Hook lifecycle callback types
 */
export interface HookLifecycle<TContext = unknown> {
  /**
   * Called when hook is initialized
   */
  readonly onInit?: (ctx: TContext) => void | Promise<void>;

  /**
   * Called when hook is mounted (dependencies resolved)
   */
  readonly onMount?: (ctx: TContext) => void | Promise<void>;

  /**
   * Called when hook is updated (state/deps changed)
   */
  readonly onUpdate?: (ctx: TContext, prevCtx: TContext) => void | Promise<void>;

  /**
   * Called before hook is destroyed
   */
  readonly onBeforeDestroy?: (ctx: TContext) => void | Promise<void>;

  /**
   * Called when hook is destroyed
   */
  readonly onDestroy?: () => void | Promise<void>;

  /**
   * Called when an error occurs
   */
  readonly onError?: (error: Error, ctx: TContext) => void | Promise<void>;
}

/**
 * Hook registration options
 */
export interface HookRegistration<TContext = unknown> {
  /**
   * Unique hook identifier
   */
  readonly id: HookId;

  /**
   * Human-readable hook name
   */
  readonly name: string;

  /**
   * Hook description
   */
  readonly description?: string;

  /**
   * Hook priority for execution order
   */
  readonly priority?: Priority;

  /**
   * Hook dependencies (other hook IDs)
   */
  readonly dependencies?: readonly HookId[];

  /**
   * Lifecycle callbacks
   */
  readonly lifecycle?: HookLifecycle<TContext>;

  /**
   * Hook metadata
   */
  readonly meta?: Readonly<Record<string, Json>>;
}

// ============================================================================
// Reactive Types (inspired by @unrdf/hooks)
// ============================================================================

/**
 * Reactive value wrapper - provides reactivity tracking
 *
 * @template T - The wrapped value type
 */
export interface Reactive<T> {
  /**
   * Current value (read-only access)
   */
  readonly value: T;

  /**
   * Previous value (for comparison)
   */
  readonly prevValue: T | undefined;

  /**
   * Whether value has changed since last read
   */
  readonly isDirty: boolean;

  /**
   * Timestamp of last update
   */
  readonly updatedAt: UnixTimestamp;

  /**
   * Version number (increments on each change)
   */
  readonly version: number;
}

/**
 * Writable reactive value
 *
 * @template T - The wrapped value type
 */
export interface WritableReactive<T> extends Reactive<T> {
  /**
   * Set new value
   */
  set(value: T): void;

  /**
   * Update value using function
   */
  update(fn: (current: T) => T): void;
}

/**
 * Computed reactive value (derived from other reactives)
 *
 * @template T - The computed value type
 */
export interface ComputedReactive<T> extends Reactive<T> {
  /**
   * Dependencies that this computed value tracks
   */
  readonly dependencies: readonly Reactive<unknown>[];

  /**
   * Force recomputation
   */
  invalidate(): void;
}

/**
 * Reactive effect - runs when dependencies change
 */
export interface ReactiveEffect {
  /**
   * Effect identifier
   */
  readonly id: string;

  /**
   * Whether effect is active
   */
  readonly isActive: boolean;

  /**
   * Dependencies being tracked
   */
  readonly dependencies: readonly Reactive<unknown>[];

  /**
   * Pause effect execution
   */
  pause(): void;

  /**
   * Resume effect execution
   */
  resume(): void;

  /**
   * Stop and cleanup effect
   */
  stop(): void;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * State hook return type - tuple of [value, setter]
 *
 * @template T - State value type
 */
export type UseStateReturn<T> = readonly [
  T,
  (value: T | ((prev: T) => T)) => void
];

/**
 * Reactive state hook return type
 *
 * @template T - State value type
 */
export type UseReactiveReturn<T> = WritableReactive<T>;

/**
 * Computed hook return type
 *
 * @template T - Computed value type
 */
export type UseComputedReturn<T> = ComputedReactive<T>;

/**
 * Effect hook return type - cleanup function
 */
export type UseEffectReturn = () => void;

/**
 * Ref hook return type
 *
 * @template T - Ref value type
 */
export interface UseRefReturn<T> {
  current: T;
}

/**
 * Callback hook return type - memoized callback
 *
 * @template T - Callback function type
 */
export type UseCallbackReturn<T extends AnyFunction> = T;

/**
 * Memo hook return type - memoized value
 *
 * @template T - Memoized value type
 */
export type UseMemoReturn<T> = T;

// ============================================================================
// Hook Option Types
// ============================================================================

/**
 * Common hook options
 */
export interface HookOptions {
  /**
   * Hook execution context
   */
  readonly context?: unknown;

  /**
   * Enable debug mode
   */
  readonly debug?: boolean;

  /**
   * Timeout in milliseconds
   */
  readonly timeout?: DurationMs;

  /**
   * Hook metadata
   */
  readonly meta?: Readonly<Record<string, Json>>;
}

/**
 * Effect hook options
 */
export interface EffectOptions extends HookOptions {
  /**
   * Run effect immediately on mount
   */
  readonly immediate?: boolean;

  /**
   * Flush timing: 'pre' (before DOM), 'post' (after DOM), 'sync' (synchronous)
   */
  readonly flush?: 'pre' | 'post' | 'sync';

  /**
   * Debounce effect execution (milliseconds)
   */
  readonly debounce?: number;

  /**
   * Throttle effect execution (milliseconds)
   */
  readonly throttle?: number;
}

/**
 * Watch hook options
 */
export interface WatchOptions<T = unknown> extends EffectOptions {
  /**
   * Deep watch for nested changes
   */
  readonly deep?: boolean;

  /**
   * Callback when watch starts
   */
  readonly onTrack?: (event: WatchTrackEvent<T>) => void;

  /**
   * Callback when dependency triggers
   */
  readonly onTrigger?: (event: WatchTriggerEvent<T>) => void;
}

/**
 * Watch track event
 */
export interface WatchTrackEvent<T> {
  readonly target: Reactive<T>;
  readonly type: 'get';
}

/**
 * Watch trigger event
 */
export interface WatchTriggerEvent<T> {
  readonly target: Reactive<T>;
  readonly type: 'set';
  readonly oldValue: T;
  readonly newValue: T;
}

// ============================================================================
// Hook Context Types
// ============================================================================

/**
 * GitVan hook context
 */
export interface GitVanHookContext {
  /**
   * Working directory
   */
  readonly cwd: string;

  /**
   * Environment variables
   */
  readonly env: Readonly<Record<string, string>>;

  /**
   * Current session ID
   */
  readonly sessionId: SessionId;

  /**
   * Current execution ID (if in execution)
   */
  readonly executionId?: ExecutionId;

  /**
   * Git information
   */
  readonly git: {
    readonly branch: string;
    readonly commit: string;
    readonly remote?: string;
    readonly isDirty: boolean;
    readonly root: string;
  };

  /**
   * User information
   */
  readonly user: {
    readonly name?: string;
    readonly email?: string;
  };

  /**
   * Timestamp
   */
  readonly timestamp: UnixTimestamp;
}

/**
 * Hook execution context
 */
export interface HookExecutionContext<TInput = unknown, TOutput = unknown> {
  /**
   * Hook ID being executed
   */
  readonly hookId: HookId;

  /**
   * Execution ID
   */
  readonly executionId: ExecutionId;

  /**
   * Input data
   */
  readonly input: TInput;

  /**
   * Output accumulator
   */
  output: TOutput;

  /**
   * Execution state
   */
  readonly state: Readonly<Record<string, unknown>>;

  /**
   * Metadata
   */
  readonly meta: Readonly<Record<string, Json>>;

  /**
   * Start time
   */
  readonly startTime: UnixTimestamp;

  /**
   * Parent context (for nested hooks)
   */
  readonly parent?: HookExecutionContext;
}

// ============================================================================
// Hook Composition Types
// ============================================================================

/**
 * Composable hook definition
 *
 * @template TArgs - Hook argument types
 * @template TReturn - Hook return type
 */
export interface ComposableHook<TArgs extends readonly unknown[] = [], TReturn = void> {
  /**
   * Hook function
   */
  (...args: TArgs): TReturn;

  /**
   * Hook identifier
   */
  readonly hookId: HookId;

  /**
   * Hook display name
   */
  readonly displayName: string;

  /**
   * Hook dependencies
   */
  readonly dependencies: readonly HookId[];
}

/**
 * Create composable hook
 */
export type CreateComposableHook = <TArgs extends readonly unknown[], TReturn>(
  hookFn: (...args: TArgs) => TReturn,
  options?: {
    name?: string;
    dependencies?: readonly HookId[];
  }
) => ComposableHook<TArgs, TReturn>;

/**
 * Hook injection key
 */
export type InjectionKey<T> = symbol & { readonly __type: T };

/**
 * Create injection key
 */
export function createInjectionKey<T>(description?: string): InjectionKey<T>;

/**
 * Provide/inject pattern types
 */
export interface ProvideInject {
  provide<T>(key: InjectionKey<T>, value: T): void;
  inject<T>(key: InjectionKey<T>): T | undefined;
  inject<T>(key: InjectionKey<T>, defaultValue: T): T;
}

// ============================================================================
// Hook Registry Types
// ============================================================================

/**
 * Hook registry entry
 */
export interface HookRegistryEntry<TContext = unknown> {
  /**
   * Hook registration info
   */
  readonly registration: HookRegistration<TContext>;

  /**
   * Hook instance
   */
  readonly instance: ComposableHook;

  /**
   * Registration timestamp
   */
  readonly registeredAt: UnixTimestamp;

  /**
   * Is hook enabled
   */
  enabled: boolean;

  /**
   * Execution count
   */
  executionCount: number;

  /**
   * Last execution time
   */
  lastExecutedAt?: UnixTimestamp;

  /**
   * Last execution duration
   */
  lastDuration?: DurationMs;
}

/**
 * Hook registry interface
 */
export interface HookRegistry {
  /**
   * Register a hook
   */
  register<TContext>(
    registration: HookRegistration<TContext>,
    hook: ComposableHook
  ): void;

  /**
   * Unregister a hook
   */
  unregister(id: HookId): boolean;

  /**
   * Get hook by ID
   */
  get(id: HookId): HookRegistryEntry | undefined;

  /**
   * Get all registered hooks
   */
  getAll(): readonly HookRegistryEntry[];

  /**
   * Check if hook exists
   */
  has(id: HookId): boolean;

  /**
   * Enable/disable hook
   */
  setEnabled(id: HookId, enabled: boolean): void;

  /**
   * Clear all hooks
   */
  clear(): void;
}

// ============================================================================
// Hook Event Types
// ============================================================================

/**
 * Hook event names as const union
 */
export type HookEventName =
  | 'hook:registered'
  | 'hook:unregistered'
  | 'hook:enabled'
  | 'hook:disabled'
  | 'hook:beforeExecute'
  | 'hook:afterExecute'
  | 'hook:error'
  | 'hook:timeout';

/**
 * Hook event payload map
 */
export interface HookEventPayloads {
  'hook:registered': { hookId: HookId; name: string };
  'hook:unregistered': { hookId: HookId };
  'hook:enabled': { hookId: HookId };
  'hook:disabled': { hookId: HookId };
  'hook:beforeExecute': { hookId: HookId; executionId: ExecutionId; input: unknown };
  'hook:afterExecute': { hookId: HookId; executionId: ExecutionId; output: unknown; duration: DurationMs };
  'hook:error': { hookId: HookId; executionId: ExecutionId; error: Error };
  'hook:timeout': { hookId: HookId; executionId: ExecutionId; timeout: DurationMs };
}

/**
 * Hook event type
 */
export type HookEvent<T extends HookEventName = HookEventName> = {
  readonly type: T;
  readonly payload: HookEventPayloads[T];
  readonly timestamp: UnixTimestamp;
};

/**
 * Hook event handler type
 */
export type HookEventHandler<T extends HookEventName = HookEventName> = (
  event: HookEvent<T>
) => void | Promise<void>;

/**
 * Hook event emitter interface
 */
export interface HookEventEmitter {
  on<T extends HookEventName>(event: T, handler: HookEventHandler<T>): () => void;
  off<T extends HookEventName>(event: T, handler: HookEventHandler<T>): void;
  emit<T extends HookEventName>(event: T, payload: HookEventPayloads[T]): void;
  once<T extends HookEventName>(event: T, handler: HookEventHandler<T>): () => void;
}

// ============================================================================
// Hook Scope Types
// ============================================================================

/**
 * Hook scope - manages hook lifecycle within a scope
 */
export interface HookScope {
  /**
   * Scope ID
   */
  readonly id: string;

  /**
   * Parent scope
   */
  readonly parent: HookScope | null;

  /**
   * Is scope active
   */
  readonly isActive: boolean;

  /**
   * Run function within scope
   */
  run<T>(fn: () => T): T;

  /**
   * Stop scope and cleanup all hooks
   */
  stop(): void;

  /**
   * Pause scope execution
   */
  pause(): void;

  /**
   * Resume scope execution
   */
  resume(): void;
}

/**
 * Create hook scope
 */
export type CreateHookScope = (detached?: boolean) => HookScope;

/**
 * Get current active scope
 */
export type GetCurrentScope = () => HookScope | undefined;

// ============================================================================
// Hook Debugging Types
// ============================================================================

/**
 * Hook debug info
 */
export interface HookDebugInfo {
  readonly hookId: HookId;
  readonly name: string;
  readonly phase: HookPhase;
  readonly dependencies: readonly HookId[];
  readonly state: Readonly<Record<string, unknown>>;
  readonly executionCount: number;
  readonly totalDuration: DurationMs;
  readonly averageDuration: DurationMs;
  readonly lastError?: Error;
  readonly memoryUsage?: number;
}

/**
 * Hook debugger interface
 */
export interface HookDebugger {
  /**
   * Enable debugging for hook
   */
  enable(hookId: HookId): void;

  /**
   * Disable debugging for hook
   */
  disable(hookId: HookId): void;

  /**
   * Get debug info for hook
   */
  getInfo(hookId: HookId): HookDebugInfo | undefined;

  /**
   * Get all debug info
   */
  getAllInfo(): readonly HookDebugInfo[];

  /**
   * Start profiling
   */
  startProfiling(): void;

  /**
   * Stop profiling and get results
   */
  stopProfiling(): ProfilingResults;

  /**
   * Clear debug data
   */
  clear(): void;
}

/**
 * Profiling results
 */
export interface ProfilingResults {
  readonly duration: DurationMs;
  readonly hookExecutions: readonly {
    readonly hookId: HookId;
    readonly count: number;
    readonly totalDuration: DurationMs;
    readonly minDuration: DurationMs;
    readonly maxDuration: DurationMs;
    readonly avgDuration: DurationMs;
  }[];
  readonly memoryDelta: number;
  readonly timestamp: UnixTimestamp;
}
