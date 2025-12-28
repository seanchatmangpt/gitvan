/**
 * @fileoverview GitVan v4 - Custom Hook Type Definitions
 *
 * This module provides comprehensive custom hook types for GitVan's
 * reactive hook system. Includes composable patterns, memoization,
 * callbacks, and GitVan-specific hooks following @unrdf/hooks conventions.
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
  CommitSha,
  RefName,
  Json,
  Result,
  Option,
  DurationMs,
  UnixTimestamp,
  ISODateString,
  DeepReadonly,
  AnyFunction,
  AsyncFunction,
} from './base.d.ts';
import type {
  HookOptions,
  GitVanHookContext,
  ComposableHook,
  InjectionKey,
  ProvideInject,
  Reactive,
  WritableReactive,
} from './hooks.d.ts';
import type { UseStateReturn, Ref } from './state.d.ts';
import type { UseEffectReturn, EffectCleanup } from './effect.d.ts';

// ============================================================================
// Memoization Hook Types
// ============================================================================

/**
 * Dependency comparison function
 */
export type DepsAreEqual = (
  prevDeps: readonly unknown[],
  nextDeps: readonly unknown[]
) => boolean;

/**
 * useMemo hook options
 */
export interface UseMemoOptions extends HookOptions {
  /**
   * Custom dependency comparison
   */
  readonly areEqual?: DepsAreEqual;

  /**
   * Debug label
   */
  readonly debugLabel?: string;

  /**
   * Maximum cache size (for multi-memoization)
   */
  readonly maxCacheSize?: number;
}

/**
 * useMemo hook return type
 *
 * @template T - Memoized value type
 */
export type UseMemoReturn<T> = T;

/**
 * useMemo hook signature
 */
export interface UseMemoHook {
  <T>(factory: () => T, deps: readonly unknown[]): T;
  <T>(factory: () => T, deps: readonly unknown[], options: UseMemoOptions): T;
}

/**
 * useCallback hook return type
 *
 * @template T - Callback function type
 */
export type UseCallbackReturn<T extends AnyFunction> = T;

/**
 * useCallback hook signature
 */
export interface UseCallbackHook {
  <T extends AnyFunction>(callback: T, deps: readonly unknown[]): T;
}

/**
 * useStableCallback hook signature - callback that never changes identity
 */
export interface UseStableCallbackHook {
  <T extends AnyFunction>(callback: T): T;
}

// ============================================================================
// Context Hook Types
// ============================================================================

/**
 * useGitVan hook return type
 */
export type UseGitVanReturn = GitVanHookContext;

/**
 * useGitVan hook signature
 */
export interface UseGitVanHook {
  (): GitVanHookContext;
}

/**
 * tryUseGitVan hook signature - returns undefined if not in context
 */
export interface TryUseGitVanHook {
  (): GitVanHookContext | undefined;
}

/**
 * withGitVan context provider signature
 */
export interface WithGitVanHook {
  <T>(context: Partial<GitVanHookContext>, fn: () => T): T;
}

// ============================================================================
// Git Hook Types
// ============================================================================

/**
 * Git repository info
 */
export interface GitRepoInfo {
  readonly root: string;
  readonly branch: string;
  readonly commit: CommitSha;
  readonly remote?: string;
  readonly isDirty: boolean;
  readonly ahead: number;
  readonly behind: number;
}

/**
 * useGit hook return type
 */
export interface UseGitReturn {
  /**
   * Repository root directory
   */
  readonly root: string;

  /**
   * Get current HEAD commit
   */
  head(): CommitSha;

  /**
   * Get current branch name
   */
  branch(): string;

  /**
   * Run git command
   */
  run(args: string | readonly string[]): Promise<string>;

  /**
   * Add note to commit
   */
  note(ref: RefName, msg: string, sha?: CommitSha): Promise<string>;

  /**
   * Append note to commit
   */
  appendNote(ref: RefName, msg: string, sha?: CommitSha): Promise<string>;

  /**
   * Set git reference
   */
  setRef(ref: RefName, sha: CommitSha): Promise<string>;

  /**
   * Delete git reference
   */
  delRef(ref: RefName): Promise<string>;

  /**
   * List references with prefix
   */
  listRefs(prefix: string): Promise<readonly string[]>;

  /**
   * Initialize repository
   */
  init(bare?: boolean): Promise<void>;

  /**
   * Clone repository
   */
  clone(url: string, dest?: string): Promise<void>;

  /**
   * Add files to staging
   */
  add(files: string | readonly string[]): Promise<void>;

  /**
   * Commit changes
   */
  commit(message: string, options?: CommitOptions): Promise<CommitSha>;

  /**
   * Push changes
   */
  push(remote?: string, branch?: string): Promise<void>;

  /**
   * Pull changes
   */
  pull(remote?: string, branch?: string): Promise<void>;

  /**
   * Fetch changes
   */
  fetch(remote?: string): Promise<void>;

  /**
   * Create branch
   */
  branchCreate(name: string, startPoint?: string): Promise<void>;

  /**
   * Delete branch
   */
  branchDelete(name: string, force?: boolean): Promise<void>;

  /**
   * List branches
   */
  branchList(): Promise<readonly string[]>;

  /**
   * Checkout branch/commit
   */
  checkout(target: string, options?: CheckoutOptions): Promise<void>;

  /**
   * Merge branch
   */
  merge(branch: string, options?: MergeOptions): Promise<void>;

  /**
   * Get current timestamp in ISO format
   */
  nowISO(): ISODateString;

  /**
   * Verify commit exists
   */
  verifyCommit(sha: string): Promise<boolean>;

  /**
   * Get worktree identifier
   */
  worktreeId(): string;
}

/**
 * Commit options
 */
export interface CommitOptions {
  readonly amend?: boolean;
  readonly noVerify?: boolean;
  readonly author?: string;
  readonly date?: string;
  readonly signoff?: boolean;
}

/**
 * Checkout options
 */
export interface CheckoutOptions {
  readonly create?: boolean;
  readonly force?: boolean;
  readonly track?: string;
}

/**
 * Merge options
 */
export interface MergeOptions {
  readonly noFf?: boolean;
  readonly squash?: boolean;
  readonly message?: string;
}

/**
 * useGit hook options
 */
export interface UseGitOptions extends HookOptions {
  /**
   * Backend type: "native", "memfs", or "auto"
   */
  readonly backend?: 'native' | 'memfs' | 'auto';

  /**
   * Enable hybrid backend support
   */
  readonly hybrid?: boolean;
}

/**
 * useGit hook signature
 */
export interface UseGitHook {
  (): UseGitReturn;
  (options: UseGitOptions): UseGitReturn;
}

// ============================================================================
// Template Hook Types
// ============================================================================

/**
 * Template render options
 */
export interface TemplateRenderOptions {
  readonly autoescape?: boolean;
  readonly throwOnUndefined?: boolean;
  readonly trimBlocks?: boolean;
  readonly lstripBlocks?: boolean;
}

/**
 * Template render result
 */
export interface TemplateRenderResult {
  readonly path: string;
  readonly bytes: number;
}

/**
 * useTemplate hook return type
 */
export interface UseTemplateReturn {
  /**
   * Render template string
   */
  render(template: string, data?: Record<string, unknown>): string;

  /**
   * Render template to file
   */
  renderToFile(
    template: string,
    out: string,
    data?: Record<string, unknown>
  ): TemplateRenderResult;

  /**
   * Template engine environment
   */
  readonly env: unknown;
}

/**
 * useTemplate hook options
 */
export interface UseTemplateOptions extends HookOptions, TemplateRenderOptions {
  /**
   * Template search paths
   */
  readonly paths?: readonly string[];
}

/**
 * useTemplate hook signature
 */
export interface UseTemplateHook {
  (): UseTemplateReturn;
  (options: UseTemplateOptions): UseTemplateReturn;
}

// ============================================================================
// Job Hook Types
// ============================================================================

/**
 * Job definition
 */
export interface JobDefinition<TPayload = unknown, TResult = unknown> {
  readonly name: string;
  readonly description?: string;
  readonly handler: (payload: TPayload, ctx: JobContext) => Promise<TResult>;
  readonly schema?: {
    readonly input?: unknown;
    readonly output?: unknown;
  };
}

/**
 * Job context
 */
export interface JobContext {
  readonly root: string;
  readonly env: Readonly<Record<string, string>>;
  readonly head?: CommitSha;
  readonly branch?: string;
  readonly now: () => ISODateString;
  readonly sessionId: SessionId;
  readonly executionId: ExecutionId;
}

/**
 * Job result
 */
export interface JobResult<T = unknown> {
  readonly ok: boolean;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly artifact?: string;
  readonly data?: T;
  readonly error?: Error;
  readonly duration: DurationMs;
  readonly meta?: Readonly<Record<string, Json>>;
}

/**
 * useJob hook return type
 */
export interface UseJobReturn<TPayload = unknown, TResult = unknown> {
  /**
   * Run job with payload
   */
  run(payload?: TPayload): Promise<JobResult<TResult>>;

  /**
   * Current job status
   */
  readonly status: 'idle' | 'running' | 'completed' | 'failed';

  /**
   * Last result
   */
  readonly lastResult: JobResult<TResult> | undefined;

  /**
   * Is job running
   */
  readonly isRunning: boolean;

  /**
   * Cancel running job
   */
  cancel(): void;
}

/**
 * useJob hook options
 */
export interface UseJobOptions extends HookOptions {
  /**
   * Job timeout in ms
   */
  readonly timeout?: DurationMs;

  /**
   * Retry on failure
   */
  readonly retry?: {
    readonly count: number;
    readonly delay: number;
  };
}

/**
 * useJob hook signature
 */
export interface UseJobHook {
  <TPayload = unknown, TResult = unknown>(
    definition: JobDefinition<TPayload, TResult>
  ): UseJobReturn<TPayload, TResult>;
  <TPayload = unknown, TResult = unknown>(
    definition: JobDefinition<TPayload, TResult>,
    options: UseJobOptions
  ): UseJobReturn<TPayload, TResult>;
}

// ============================================================================
// Lock Hook Types
// ============================================================================

/**
 * Lock options
 */
export interface LockOptions {
  readonly timeout?: DurationMs;
  readonly exclusive?: boolean;
  readonly retryDelay?: number;
}

/**
 * Lock handle
 */
export interface LockHandle {
  readonly name: string;
  readonly acquiredAt: UnixTimestamp;
  readonly exclusive: boolean;
  release(): Promise<void>;
}

/**
 * useLock hook return type
 */
export interface UseLockReturn {
  /**
   * Acquire lock
   */
  acquire(name: string, options?: LockOptions): Promise<LockHandle>;

  /**
   * Release lock
   */
  release(name: string): Promise<void>;

  /**
   * Check if locked
   */
  isLocked(name: string): boolean;

  /**
   * Run with lock
   */
  withLock<T>(name: string, fn: () => Promise<T>, options?: LockOptions): Promise<T>;

  /**
   * Currently held locks
   */
  readonly locks: readonly LockHandle[];
}

/**
 * useLock hook signature
 */
export interface UseLockHook {
  (): UseLockReturn;
  (options: HookOptions): UseLockReturn;
}

// ============================================================================
// Receipt Hook Types
// ============================================================================

/**
 * Receipt data
 */
export interface Receipt {
  readonly id: string;
  readonly hookId: HookId;
  readonly executionId: ExecutionId;
  readonly timestamp: UnixTimestamp;
  readonly commit: CommitSha;
  readonly branch: string;
  readonly result: JobResult;
  readonly metadata?: Readonly<Record<string, Json>>;
}

/**
 * useReceipt hook return type
 */
export interface UseReceiptReturn {
  /**
   * Write receipt
   */
  write(hookId: HookId, result: JobResult, meta?: Record<string, Json>): Promise<Receipt>;

  /**
   * Read receipt by ID
   */
  read(id: string): Promise<Receipt | undefined>;

  /**
   * Query receipts
   */
  query(filter: ReceiptFilter): Promise<readonly Receipt[]>;

  /**
   * List recent receipts
   */
  recent(limit?: number): Promise<readonly Receipt[]>;
}

/**
 * Receipt filter
 */
export interface ReceiptFilter {
  readonly hookId?: HookId;
  readonly commit?: CommitSha;
  readonly branch?: string;
  readonly since?: UnixTimestamp;
  readonly until?: UnixTimestamp;
  readonly limit?: number;
}

/**
 * useReceipt hook signature
 */
export interface UseReceiptHook {
  (): UseReceiptReturn;
  (options: HookOptions): UseReceiptReturn;
}

// ============================================================================
// Event Hook Types
// ============================================================================

/**
 * Event emitter return type
 */
export interface UseEventReturn<TEvents extends Record<string, unknown>> {
  /**
   * Subscribe to event
   */
  on<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): () => void;

  /**
   * Subscribe to event once
   */
  once<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): () => void;

  /**
   * Emit event
   */
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;

  /**
   * Remove all handlers for event
   */
  off<K extends keyof TEvents>(event: K): void;

  /**
   * Remove all handlers
   */
  clear(): void;
}

/**
 * useEvent hook signature
 */
export interface UseEventHook {
  <TEvents extends Record<string, unknown>>(): UseEventReturn<TEvents>;
}

// ============================================================================
// ID Hook Types
// ============================================================================

/**
 * useId hook return type - unique stable ID
 */
export type UseIdReturn = string;

/**
 * useId hook signature
 */
export interface UseIdHook {
  (): string;
  (prefix: string): string;
}

/**
 * useHookId hook signature - unique hook identifier
 */
export interface UseHookIdHook {
  (): HookId;
  (prefix: string): HookId;
}

/**
 * useExecutionId hook signature
 */
export interface UseExecutionIdHook {
  (): ExecutionId;
}

// ============================================================================
// Toggle/Boolean Hook Types
// ============================================================================

/**
 * useToggle hook return type
 */
export type UseToggleReturn = readonly [boolean, () => void, (value: boolean) => void];

/**
 * useToggle hook signature
 */
export interface UseToggleHook {
  (initialValue?: boolean): UseToggleReturn;
}

/**
 * useBoolean hook return type
 */
export interface UseBooleanReturn {
  readonly value: boolean;
  setTrue: () => void;
  setFalse: () => void;
  toggle: () => void;
  setValue: (value: boolean) => void;
}

/**
 * useBoolean hook signature
 */
export interface UseBooleanHook {
  (initialValue?: boolean): UseBooleanReturn;
}

// ============================================================================
// Counter Hook Types
// ============================================================================

/**
 * useCounter hook return type
 */
export interface UseCounterReturn {
  readonly count: number;
  increment: () => void;
  decrement: () => void;
  set: (value: number) => void;
  reset: () => void;
}

/**
 * useCounter hook options
 */
export interface UseCounterOptions {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

/**
 * useCounter hook signature
 */
export interface UseCounterHook {
  (initialValue?: number): UseCounterReturn;
  (initialValue: number, options: UseCounterOptions): UseCounterReturn;
}

// ============================================================================
// Queue Hook Types
// ============================================================================

/**
 * Queue item
 */
export interface QueueItem<T> {
  readonly id: string;
  readonly data: T;
  readonly addedAt: UnixTimestamp;
  readonly priority: number;
}

/**
 * useQueue hook return type
 */
export interface UseQueueReturn<T> {
  readonly items: readonly QueueItem<T>[];
  readonly size: number;
  readonly isEmpty: boolean;
  enqueue: (item: T, priority?: number) => QueueItem<T>;
  dequeue: () => QueueItem<T> | undefined;
  peek: () => QueueItem<T> | undefined;
  clear: () => void;
  remove: (id: string) => boolean;
}

/**
 * useQueue hook signature
 */
export interface UseQueueHook {
  <T>(): UseQueueReturn<T>;
  <T>(initialItems: readonly T[]): UseQueueReturn<T>;
}

// ============================================================================
// Local Storage Hook Types
// ============================================================================

/**
 * useLocalStorage hook options
 */
export interface UseLocalStorageOptions<T> {
  readonly serializer?: (value: T) => string;
  readonly deserializer?: (value: string) => T;
  readonly onError?: (error: Error) => void;
}

/**
 * useLocalStorage hook return type
 */
export type UseLocalStorageReturn<T> = readonly [
  T,
  (value: T | ((prev: T) => T)) => void,
  () => void
];

/**
 * useLocalStorage hook signature (for Git Notes-based storage)
 */
export interface UseLocalStorageHook {
  <T>(key: string, initialValue: T): UseLocalStorageReturn<T>;
  <T>(
    key: string,
    initialValue: T,
    options: UseLocalStorageOptions<T>
  ): UseLocalStorageReturn<T>;
}

// ============================================================================
// Debounce/Throttle Hook Types
// ============================================================================

/**
 * useDebounce hook return type
 */
export type UseDebounceReturn<T> = T;

/**
 * useDebounce hook signature
 */
export interface UseDebounceHook {
  <T>(value: T, delay: number): T;
}

/**
 * useDebouncedCallback hook return type
 */
export interface UseDebouncedCallbackReturn<T extends AnyFunction> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
  isPending: () => boolean;
}

/**
 * useDebouncedCallback hook signature
 */
export interface UseDebouncedCallbackHook {
  <T extends AnyFunction>(callback: T, delay: number): UseDebouncedCallbackReturn<T>;
  <T extends AnyFunction>(
    callback: T,
    delay: number,
    options: { maxWait?: number; leading?: boolean; trailing?: boolean }
  ): UseDebouncedCallbackReturn<T>;
}

/**
 * useThrottle hook return type
 */
export type UseThrottleReturn<T> = T;

/**
 * useThrottle hook signature
 */
export interface UseThrottleHook {
  <T>(value: T, interval: number): T;
}

/**
 * useThrottledCallback hook return type
 */
export type UseThrottledCallbackReturn<T extends AnyFunction> = (...args: Parameters<T>) => void;

/**
 * useThrottledCallback hook signature
 */
export interface UseThrottledCallbackHook {
  <T extends AnyFunction>(callback: T, interval: number): UseThrottledCallbackReturn<T>;
}

// ============================================================================
// Provide/Inject Hook Types
// ============================================================================

/**
 * useProvide hook signature
 */
export interface UseProvideHook {
  <T>(key: InjectionKey<T>, value: T): void;
  <T>(key: string, value: T): void;
}

/**
 * useInject hook signature
 */
export interface UseInjectHook {
  <T>(key: InjectionKey<T>): T | undefined;
  <T>(key: InjectionKey<T>, defaultValue: T): T;
  <T>(key: string): T | undefined;
  <T>(key: string, defaultValue: T): T;
}

// ============================================================================
// Error Boundary Hook Types
// ============================================================================

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
  readonly errorInfo: { componentStack: string } | null;
}

/**
 * useErrorBoundary hook return type
 */
export interface UseErrorBoundaryReturn {
  readonly state: ErrorBoundaryState;
  resetError: () => void;
  captureError: (error: Error, errorInfo?: { componentStack: string }) => void;
}

/**
 * useErrorBoundary hook signature
 */
export interface UseErrorBoundaryHook {
  (): UseErrorBoundaryReturn;
  (options: { onError?: (error: Error) => void; fallback?: unknown }): UseErrorBoundaryReturn;
}

// ============================================================================
// Compose Hook Types
// ============================================================================

/**
 * Composable function type
 */
export type Composable<TInput, TOutput> = (input: TInput) => TOutput;

/**
 * useCompose hook signature - compose multiple hooks
 */
export interface UseComposeHook {
  <A, B>(fn1: Composable<A, B>): Composable<A, B>;
  <A, B, C>(fn1: Composable<A, B>, fn2: Composable<B, C>): Composable<A, C>;
  <A, B, C, D>(
    fn1: Composable<A, B>,
    fn2: Composable<B, C>,
    fn3: Composable<C, D>
  ): Composable<A, D>;
  <A, B, C, D, E>(
    fn1: Composable<A, B>,
    fn2: Composable<B, C>,
    fn3: Composable<C, D>,
    fn4: Composable<D, E>
  ): Composable<A, E>;
}

/**
 * usePipe hook signature - pipe value through multiple hooks
 */
export interface UsePipeHook {
  <A, B>(value: A, fn1: Composable<A, B>): B;
  <A, B, C>(value: A, fn1: Composable<A, B>, fn2: Composable<B, C>): C;
  <A, B, C, D>(
    value: A,
    fn1: Composable<A, B>,
    fn2: Composable<B, C>,
    fn3: Composable<C, D>
  ): D;
}
