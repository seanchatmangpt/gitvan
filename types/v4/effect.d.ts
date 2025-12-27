/**
 * @fileoverview GitVan v4 - Effect Hook Type Definitions
 *
 * This module provides comprehensive effect and side-effect management types
 * for GitVan's reactive hook system. Implements patterns from @unrdf/hooks
 * for effects, watchers, and cleanup with proper TypeScript inference.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import type {
  HookId,
  ExecutionId,
  Json,
  Result,
  DurationMs,
  UnixTimestamp,
  AnyFunction,
  AsyncFunction,
} from './base.d.ts';
import type {
  Reactive,
  ReactiveEffect,
  EffectOptions,
  WatchOptions,
  HookOptions,
} from './hooks.d.ts';

// ============================================================================
// Effect Types
// ============================================================================

/**
 * Effect cleanup function
 */
export type EffectCleanup = () => void | Promise<void>;

/**
 * Effect function that may return cleanup
 */
export type EffectCallback = () => void | EffectCleanup | Promise<void | EffectCleanup>;

/**
 * Effect dependencies array
 */
export type EffectDeps = readonly unknown[] | undefined;

/**
 * Effect with async support
 */
export type AsyncEffectCallback = () => Promise<void | EffectCleanup>;

// ============================================================================
// useEffect Hook Types
// ============================================================================

/**
 * useEffect hook return type - stop function
 */
export type UseEffectReturn = () => void;

/**
 * useEffect hook options
 */
export interface UseEffectOptions extends EffectOptions {
  /**
   * Run effect in error boundary
   */
  readonly errorBoundary?: boolean;

  /**
   * Ignore first run (skip mount)
   */
  readonly ignoreFirst?: boolean;

  /**
   * Maximum execution count
   */
  readonly maxRuns?: number;

  /**
   * Effect label for debugging
   */
  readonly label?: string;
}

/**
 * useEffect hook signature
 */
export interface UseEffectHook {
  (effect: EffectCallback): UseEffectReturn;
  (effect: EffectCallback, deps: EffectDeps): UseEffectReturn;
  (effect: EffectCallback, options: UseEffectOptions): UseEffectReturn;
  (effect: EffectCallback, deps: EffectDeps, options: UseEffectOptions): UseEffectReturn;
}

// ============================================================================
// useAsyncEffect Hook Types
// ============================================================================

/**
 * Async effect state
 */
export interface AsyncEffectState {
  /**
   * Is effect currently executing
   */
  readonly isExecuting: boolean;

  /**
   * Last execution error
   */
  readonly error: Error | null;

  /**
   * Execution count
   */
  readonly executionCount: number;

  /**
   * Last execution timestamp
   */
  readonly lastExecutedAt: UnixTimestamp | null;
}

/**
 * useAsyncEffect hook return type
 */
export interface UseAsyncEffectReturn {
  /**
   * Stop the effect
   */
  stop: () => void;

  /**
   * Current state
   */
  state: AsyncEffectState;

  /**
   * Force re-run the effect
   */
  rerun: () => Promise<void>;
}

/**
 * useAsyncEffect hook options
 */
export interface UseAsyncEffectOptions extends UseEffectOptions {
  /**
   * Cancel previous execution when deps change
   */
  readonly cancelPrevious?: boolean;

  /**
   * Retry on error
   */
  readonly retryOnError?: boolean;

  /**
   * Retry count
   */
  readonly retryCount?: number;

  /**
   * Retry delay in ms
   */
  readonly retryDelay?: number;

  /**
   * On error callback
   */
  readonly onError?: (error: Error) => void;
}

/**
 * useAsyncEffect hook signature
 */
export interface UseAsyncEffectHook {
  (effect: AsyncEffectCallback): UseAsyncEffectReturn;
  (effect: AsyncEffectCallback, deps: EffectDeps): UseAsyncEffectReturn;
  (effect: AsyncEffectCallback, options: UseAsyncEffectOptions): UseAsyncEffectReturn;
  (
    effect: AsyncEffectCallback,
    deps: EffectDeps,
    options: UseAsyncEffectOptions
  ): UseAsyncEffectReturn;
}

// ============================================================================
// useLayoutEffect Hook Types
// ============================================================================

/**
 * useLayoutEffect hook signature (runs synchronously after mutations)
 */
export interface UseLayoutEffectHook {
  (effect: EffectCallback): UseEffectReturn;
  (effect: EffectCallback, deps: EffectDeps): UseEffectReturn;
}

// ============================================================================
// useInsertionEffect Hook Types
// ============================================================================

/**
 * useInsertionEffect hook signature (runs before any DOM mutations)
 */
export interface UseInsertionEffectHook {
  (effect: EffectCallback): UseEffectReturn;
  (effect: EffectCallback, deps: EffectDeps): UseEffectReturn;
}

// ============================================================================
// Watch Types
// ============================================================================

/**
 * Watch source - reactive or getter function
 *
 * @template T - Watched value type
 */
export type WatchSource<T> = Reactive<T> | (() => T);

/**
 * Watch callback function
 *
 * @template T - Watched value type
 */
export type WatchCallback<T> = (
  newValue: T,
  oldValue: T | undefined,
  onCleanup: (cleanup: EffectCleanup) => void
) => void | Promise<void>;

/**
 * Watch callback for multiple sources
 *
 * @template T - Tuple of watched value types
 */
export type WatchCallbackMulti<T extends readonly unknown[]> = (
  newValues: T,
  oldValues: { [K in keyof T]: T[K] | undefined },
  onCleanup: (cleanup: EffectCleanup) => void
) => void | Promise<void>;

/**
 * Watch stop handle
 */
export interface WatchStopHandle {
  (): void;
  /**
   * Pause watching
   */
  pause: () => void;
  /**
   * Resume watching
   */
  resume: () => void;
}

// ============================================================================
// useWatch Hook Types
// ============================================================================

/**
 * useWatch hook options
 */
export interface UseWatchOptions<T = unknown> extends WatchOptions<T> {
  /**
   * Compare function for old/new values
   */
  readonly equals?: (oldValue: T, newValue: T) => boolean;

  /**
   * Maximum watch count
   */
  readonly maxTriggers?: number;

  /**
   * Transform value before comparison
   */
  readonly transform?: (value: T) => unknown;
}

/**
 * useWatch hook signature - single source
 */
export interface UseWatchHook {
  <T>(source: WatchSource<T>, callback: WatchCallback<T>): WatchStopHandle;
  <T>(
    source: WatchSource<T>,
    callback: WatchCallback<T>,
    options: UseWatchOptions<T>
  ): WatchStopHandle;
}

/**
 * useWatchMulti hook signature - multiple sources
 */
export interface UseWatchMultiHook {
  <T extends readonly unknown[]>(
    sources: readonly [...{ [K in keyof T]: WatchSource<T[K]> }],
    callback: WatchCallbackMulti<T>
  ): WatchStopHandle;
  <T extends readonly unknown[]>(
    sources: readonly [...{ [K in keyof T]: WatchSource<T[K]> }],
    callback: WatchCallbackMulti<T>,
    options: UseWatchOptions
  ): WatchStopHandle;
}

// ============================================================================
// useWatchEffect Hook Types
// ============================================================================

/**
 * Watch effect callback - tracks dependencies automatically
 */
export type WatchEffectCallback = (onCleanup: (cleanup: EffectCleanup) => void) => void;

/**
 * useWatchEffect hook options
 */
export interface UseWatchEffectOptions extends EffectOptions {
  /**
   * Track reactive accesses
   */
  readonly track?: boolean;

  /**
   * Trigger on reactive changes
   */
  readonly trigger?: boolean;
}

/**
 * useWatchEffect hook signature
 */
export interface UseWatchEffectHook {
  (effect: WatchEffectCallback): WatchStopHandle;
  (effect: WatchEffectCallback, options: UseWatchEffectOptions): WatchStopHandle;
}

// ============================================================================
// Debounce/Throttle Effect Types
// ============================================================================

/**
 * Debounced effect options
 */
export interface DebouncedEffectOptions extends UseEffectOptions {
  /**
   * Debounce wait time in ms
   */
  readonly wait: number;

  /**
   * Maximum wait time before forcing execution
   */
  readonly maxWait?: number;

  /**
   * Invoke on leading edge
   */
  readonly leading?: boolean;

  /**
   * Invoke on trailing edge (default: true)
   */
  readonly trailing?: boolean;
}

/**
 * Throttled effect options
 */
export interface ThrottledEffectOptions extends UseEffectOptions {
  /**
   * Throttle interval in ms
   */
  readonly interval: number;

  /**
   * Invoke on leading edge
   */
  readonly leading?: boolean;

  /**
   * Invoke on trailing edge
   */
  readonly trailing?: boolean;
}

/**
 * Debounced effect return type
 */
export interface DebouncedEffectReturn {
  /**
   * Stop the effect
   */
  stop: () => void;

  /**
   * Cancel pending execution
   */
  cancel: () => void;

  /**
   * Flush pending execution immediately
   */
  flush: () => void;

  /**
   * Is pending execution
   */
  readonly isPending: boolean;
}

/**
 * useDebouncedEffect hook signature
 */
export interface UseDebouncedEffectHook {
  (effect: EffectCallback, options: DebouncedEffectOptions): DebouncedEffectReturn;
  (
    effect: EffectCallback,
    deps: EffectDeps,
    options: DebouncedEffectOptions
  ): DebouncedEffectReturn;
}

/**
 * useThrottledEffect hook signature
 */
export interface UseThrottledEffectHook {
  (effect: EffectCallback, options: ThrottledEffectOptions): DebouncedEffectReturn;
  (
    effect: EffectCallback,
    deps: EffectDeps,
    options: ThrottledEffectOptions
  ): DebouncedEffectReturn;
}

// ============================================================================
// Effect Scope Types
// ============================================================================

/**
 * Effect scope - groups effects for batch cleanup
 */
export interface EffectScope {
  /**
   * Scope identifier
   */
  readonly id: string;

  /**
   * Is scope active
   */
  readonly active: boolean;

  /**
   * Effects in this scope
   */
  readonly effects: readonly ReactiveEffect[];

  /**
   * Run effect within scope
   */
  run<T>(fn: () => T): T | undefined;

  /**
   * Stop all effects in scope
   */
  stop(): void;

  /**
   * Pause all effects
   */
  pause(): void;

  /**
   * Resume all effects
   */
  resume(): void;

  /**
   * Add cleanup to scope
   */
  onDispose(fn: EffectCleanup): void;
}

/**
 * useEffectScope hook signature
 */
export interface UseEffectScopeHook {
  (): EffectScope;
  (detached: boolean): EffectScope;
}

/**
 * Get current effect scope
 */
export function getCurrentScope(): EffectScope | undefined;

/**
 * Register cleanup in current scope
 */
export function onScopeDispose(fn: EffectCleanup): void;

// ============================================================================
// Event Effect Types
// ============================================================================

/**
 * Event target with addEventListener
 */
export interface EventTarget {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

/**
 * useEventListener hook options
 */
export interface UseEventListenerOptions extends HookOptions {
  /**
   * Event listener options
   */
  readonly listenerOptions?: boolean | AddEventListenerOptions;

  /**
   * Whether to add listener immediately
   */
  readonly immediate?: boolean;
}

/**
 * useEventListener hook signature
 */
export interface UseEventListenerHook {
  <K extends keyof WindowEventMap>(
    target: Window,
    event: K,
    listener: (this: Window, ev: WindowEventMap[K]) => void,
    options?: UseEventListenerOptions
  ): () => void;
  <K extends keyof DocumentEventMap>(
    target: Document,
    event: K,
    listener: (this: Document, ev: DocumentEventMap[K]) => void,
    options?: UseEventListenerOptions
  ): () => void;
  <T extends EventTarget>(
    target: T,
    event: string,
    listener: EventListenerOrEventListenerObject,
    options?: UseEventListenerOptions
  ): () => void;
}

// ============================================================================
// Interval/Timeout Effect Types
// ============================================================================

/**
 * useInterval hook return type
 */
export interface UseIntervalReturn {
  /**
   * Stop the interval
   */
  stop: () => void;

  /**
   * Is interval active
   */
  readonly isActive: boolean;

  /**
   * Reset the interval
   */
  reset: () => void;

  /**
   * Pause the interval
   */
  pause: () => void;

  /**
   * Resume the interval
   */
  resume: () => void;
}

/**
 * useInterval hook options
 */
export interface UseIntervalOptions extends HookOptions {
  /**
   * Start immediately on mount
   */
  readonly immediate?: boolean;

  /**
   * Execute callback immediately on start
   */
  readonly immediateCallback?: boolean;
}

/**
 * useInterval hook signature
 */
export interface UseIntervalHook {
  (callback: () => void, interval: number): UseIntervalReturn;
  (callback: () => void, interval: number, options: UseIntervalOptions): UseIntervalReturn;
}

/**
 * useTimeout hook return type
 */
export interface UseTimeoutReturn {
  /**
   * Cancel the timeout
   */
  cancel: () => void;

  /**
   * Is timeout pending
   */
  readonly isPending: boolean;

  /**
   * Is timeout completed
   */
  readonly isReady: boolean;

  /**
   * Restart the timeout
   */
  restart: () => void;
}

/**
 * useTimeout hook options
 */
export interface UseTimeoutOptions extends HookOptions {
  /**
   * Start immediately on mount
   */
  readonly immediate?: boolean;
}

/**
 * useTimeout hook signature
 */
export interface UseTimeoutHook {
  (callback: () => void, delay: number): UseTimeoutReturn;
  (callback: () => void, delay: number, options: UseTimeoutOptions): UseTimeoutReturn;
}

// ============================================================================
// Lifecycle Effect Types
// ============================================================================

/**
 * useOnMount hook signature - runs only on mount
 */
export interface UseOnMountHook {
  (callback: () => void | EffectCleanup | Promise<void>): void;
}

/**
 * useOnUnmount hook signature - runs only on unmount
 */
export interface UseOnUnmountHook {
  (callback: () => void | Promise<void>): void;
}

/**
 * useOnUpdate hook signature - runs on every update (not mount)
 */
export interface UseOnUpdateHook {
  (callback: () => void | EffectCleanup): void;
  (callback: () => void | EffectCleanup, deps: EffectDeps): void;
}

/**
 * usePrevious hook signature - returns previous value
 */
export interface UsePreviousHook {
  <T>(value: T): T | undefined;
  <T>(value: T, comparator: (prev: T, curr: T) => boolean): T | undefined;
}

// ============================================================================
// Git-Specific Effect Types
// ============================================================================

/**
 * Git event types for effects
 */
export type GitEventType =
  | 'commit'
  | 'push'
  | 'pull'
  | 'merge'
  | 'branch-create'
  | 'branch-delete'
  | 'tag-create'
  | 'tag-delete'
  | 'checkout'
  | 'rebase'
  | 'stash'
  | 'worktree-add'
  | 'worktree-remove';

/**
 * Git event payload
 */
export interface GitEventPayload {
  /**
   * Event type
   */
  readonly type: GitEventType;

  /**
   * Affected ref (branch, tag, etc.)
   */
  readonly ref?: string;

  /**
   * Commit SHA
   */
  readonly commit?: string;

  /**
   * Previous commit (for transitions)
   */
  readonly previousCommit?: string;

  /**
   * Event timestamp
   */
  readonly timestamp: UnixTimestamp;

  /**
   * Additional metadata
   */
  readonly meta?: Readonly<Record<string, Json>>;
}

/**
 * useGitEffect hook options
 */
export interface UseGitEffectOptions extends UseEffectOptions {
  /**
   * Git events to watch for
   */
  readonly events: readonly GitEventType[];

  /**
   * Ref patterns to watch (glob patterns)
   */
  readonly refs?: readonly string[];

  /**
   * Path patterns to watch (glob patterns)
   */
  readonly paths?: readonly string[];
}

/**
 * useGitEffect hook signature - runs on git events
 */
export interface UseGitEffectHook {
  (callback: (event: GitEventPayload) => void | EffectCleanup): UseEffectReturn;
  (
    callback: (event: GitEventPayload) => void | EffectCleanup,
    options: UseGitEffectOptions
  ): UseEffectReturn;
}

/**
 * useOnCommit hook signature - runs after every commit
 */
export interface UseOnCommitHook {
  (callback: (commit: string, message: string) => void | Promise<void>): UseEffectReturn;
}

/**
 * useOnBranchChange hook signature - runs when branch changes
 */
export interface UseOnBranchChangeHook {
  (
    callback: (newBranch: string, oldBranch: string | undefined) => void | Promise<void>
  ): UseEffectReturn;
}

/**
 * useFileChange hook options
 */
export interface UseFileChangeOptions extends UseEffectOptions {
  /**
   * File patterns to watch (glob)
   */
  readonly patterns: readonly string[];

  /**
   * Debounce changes
   */
  readonly debounce?: number;

  /**
   * Ignore patterns
   */
  readonly ignore?: readonly string[];
}

/**
 * File change event
 */
export interface FileChangeEvent {
  /**
   * Changed file path
   */
  readonly path: string;

  /**
   * Change type
   */
  readonly type: 'add' | 'change' | 'unlink';

  /**
   * Event timestamp
   */
  readonly timestamp: UnixTimestamp;
}

/**
 * useFileChange hook signature - runs on file changes
 */
export interface UseFileChangeHook {
  (
    callback: (events: readonly FileChangeEvent[]) => void | EffectCleanup,
    options: UseFileChangeOptions
  ): UseEffectReturn;
}
