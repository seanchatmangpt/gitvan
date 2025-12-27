/**
 * @fileoverview GitVan v4 - State Hook Type Definitions
 *
 * This module provides comprehensive state management types for GitVan's
 * reactive hook system. Implements patterns from @unrdf/hooks for reactive
 * state with proper TypeScript inference and strict mode compatibility.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import type {
  HookId,
  SessionId,
  ExecutionId,
  Json,
  Result,
  Option,
  DeepReadonly,
  DeepPartial,
  Prettify,
  UnixTimestamp,
  DurationMs,
} from './base.d.ts';
import type {
  Reactive,
  WritableReactive,
  ComputedReactive,
  HookOptions,
} from './hooks.d.ts';

// ============================================================================
// State Types
// ============================================================================

/**
 * State initializer - value or factory function
 *
 * @template T - State type
 */
export type StateInitializer<T> = T | (() => T);

/**
 * State setter function
 *
 * @template T - State type
 */
export type StateSetter<T> = (value: T | ((prev: T) => T)) => void;

/**
 * State dispatch function
 *
 * @template T - State type
 * @template A - Action type
 */
export type StateDispatch<T, A> = (action: A) => void;

/**
 * State selector function
 *
 * @template T - State type
 * @template R - Selected value type
 */
export type StateSelector<T, R> = (state: T) => R;

/**
 * State comparator function
 *
 * @template T - State type
 */
export type StateComparator<T> = (prev: T, next: T) => boolean;

// ============================================================================
// useState Hook Types
// ============================================================================

/**
 * useState hook return type
 *
 * @template T - State type
 */
export type UseStateReturn<T> = readonly [T, StateSetter<T>];

/**
 * useState hook options
 */
export interface UseStateOptions<T> extends HookOptions {
  /**
   * Custom equality function for comparing state
   */
  readonly equals?: StateComparator<T>;

  /**
   * Enable state history tracking
   */
  readonly trackHistory?: boolean;

  /**
   * Maximum history entries to keep
   */
  readonly maxHistory?: number;

  /**
   * Persist state to storage
   */
  readonly persist?: {
    readonly key: string;
    readonly storage?: 'memory' | 'git-notes' | 'file';
    readonly serialize?: (value: T) => string;
    readonly deserialize?: (value: string) => T;
  };
}

/**
 * useState hook signature
 */
export interface UseStateHook {
  <T>(initialValue: StateInitializer<T>): UseStateReturn<T>;
  <T>(initialValue: StateInitializer<T>, options: UseStateOptions<T>): UseStateReturn<T>;
}

// ============================================================================
// useReactive Hook Types
// ============================================================================

/**
 * useReactive hook return type
 *
 * @template T - Reactive object type
 */
export type UseReactiveReturn<T extends object> = T & {
  readonly $raw: T;
  readonly $snapshot: DeepReadonly<T>;
};

/**
 * useReactive hook options
 */
export interface UseReactiveOptions<T extends object> extends HookOptions {
  /**
   * Enable deep reactivity
   */
  readonly deep?: boolean;

  /**
   * Custom equality function
   */
  readonly equals?: StateComparator<T>;

  /**
   * Properties to exclude from reactivity
   */
  readonly exclude?: readonly (keyof T)[];

  /**
   * Read-only properties
   */
  readonly readonly?: readonly (keyof T)[];
}

/**
 * useReactive hook signature
 */
export interface UseReactiveHook {
  <T extends object>(target: T): UseReactiveReturn<T>;
  <T extends object>(target: T, options: UseReactiveOptions<T>): UseReactiveReturn<T>;
}

// ============================================================================
// useRef Hook Types
// ============================================================================

/**
 * Ref container type
 *
 * @template T - Ref value type
 */
export interface Ref<T> {
  current: T;
}

/**
 * Readonly ref container type
 *
 * @template T - Ref value type
 */
export interface ReadonlyRef<T> {
  readonly current: T;
}

/**
 * useRef hook return type
 *
 * @template T - Ref value type
 */
export type UseRefReturn<T> = Ref<T>;

/**
 * useRef hook signature
 */
export interface UseRefHook {
  <T>(initialValue: T): Ref<T>;
  <T = undefined>(): Ref<T | undefined>;
}

// ============================================================================
// useComputed Hook Types
// ============================================================================

/**
 * Computed getter function
 *
 * @template T - Computed value type
 */
export type ComputedGetter<T> = () => T;

/**
 * Computed setter function
 *
 * @template T - Computed value type
 */
export type ComputedSetter<T> = (value: T) => void;

/**
 * Computed getter/setter pair
 *
 * @template T - Computed value type
 */
export interface ComputedGetterSetter<T> {
  readonly get: ComputedGetter<T>;
  readonly set: ComputedSetter<T>;
}

/**
 * useComputed hook return type
 *
 * @template T - Computed value type
 */
export type UseComputedReturn<T> = ComputedReactive<T>;

/**
 * useComputed hook options
 */
export interface UseComputedOptions extends HookOptions {
  /**
   * Enable lazy evaluation
   */
  readonly lazy?: boolean;

  /**
   * Custom equality function
   */
  readonly equals?: StateComparator<unknown>;

  /**
   * Debug label
   */
  readonly debugLabel?: string;
}

/**
 * useComputed hook signature
 */
export interface UseComputedHook {
  <T>(getter: ComputedGetter<T>): UseComputedReturn<T>;
  <T>(getter: ComputedGetter<T>, options: UseComputedOptions): UseComputedReturn<T>;
  <T>(getterSetter: ComputedGetterSetter<T>): WritableReactive<T>;
  <T>(getterSetter: ComputedGetterSetter<T>, options: UseComputedOptions): WritableReactive<T>;
}

// ============================================================================
// useReadonly Hook Types
// ============================================================================

/**
 * useReadonly hook return type - makes reactive readonly
 *
 * @template T - Value type
 */
export type UseReadonlyReturn<T> = DeepReadonly<T>;

/**
 * useReadonly hook signature
 */
export interface UseReadonlyHook {
  <T extends object>(reactive: T): UseReadonlyReturn<T>;
}

// ============================================================================
// State Snapshot Types
// ============================================================================

/**
 * State snapshot - immutable point-in-time copy
 *
 * @template T - State type
 */
export interface StateSnapshot<T> {
  /**
   * Snapshot ID
   */
  readonly id: string;

  /**
   * Snapshot value
   */
  readonly value: DeepReadonly<T>;

  /**
   * Creation timestamp
   */
  readonly createdAt: UnixTimestamp;

  /**
   * Metadata
   */
  readonly meta?: Readonly<Record<string, Json>>;
}

/**
 * State history entry
 *
 * @template T - State type
 */
export interface StateHistoryEntry<T> extends StateSnapshot<T> {
  /**
   * Previous value
   */
  readonly prevValue: DeepReadonly<T> | undefined;

  /**
   * Diff from previous
   */
  readonly diff?: StateDiff<T>;
}

/**
 * State diff representation
 *
 * @template T - State type
 */
export interface StateDiff<T> {
  /**
   * Changed paths
   */
  readonly changes: readonly StateDiffChange[];

  /**
   * Has any changes
   */
  readonly hasChanges: boolean;
}

/**
 * Individual state diff change
 */
export interface StateDiffChange {
  /**
   * Path to changed property
   */
  readonly path: readonly (string | number)[];

  /**
   * Previous value
   */
  readonly prevValue: unknown;

  /**
   * New value
   */
  readonly nextValue: unknown;

  /**
   * Change type
   */
  readonly type: 'add' | 'update' | 'delete';
}

// ============================================================================
// State Persistence Types
// ============================================================================

/**
 * State persistence adapter
 *
 * @template T - State type
 */
export interface StatePersistenceAdapter<T> {
  /**
   * Load persisted state
   */
  load(): Promise<T | undefined>;

  /**
   * Save state
   */
  save(value: T): Promise<void>;

  /**
   * Clear persisted state
   */
  clear(): Promise<void>;

  /**
   * Check if state exists
   */
  exists(): Promise<boolean>;
}

/**
 * Git notes state persistence options
 */
export interface GitNotesStateOptions {
  /**
   * Notes ref
   */
  readonly ref?: string;

  /**
   * Commit SHA to attach notes to
   */
  readonly commit?: string;

  /**
   * Namespace for the state
   */
  readonly namespace?: string;
}

/**
 * File state persistence options
 */
export interface FileStateOptions {
  /**
   * File path
   */
  readonly path: string;

  /**
   * File format
   */
  readonly format?: 'json' | 'yaml';

  /**
   * Pretty print output
   */
  readonly pretty?: boolean;
}

// ============================================================================
// State Machine Types
// ============================================================================

/**
 * State machine configuration
 *
 * @template TState - State type (string union)
 * @template TEvent - Event type (string union)
 * @template TContext - Context type
 */
export interface StateMachineConfig<
  TState extends string,
  TEvent extends string,
  TContext = unknown
> {
  /**
   * Initial state
   */
  readonly initial: TState;

  /**
   * Initial context
   */
  readonly context?: TContext;

  /**
   * State definitions
   */
  readonly states: {
    readonly [K in TState]: StateDefinition<TState, TEvent, TContext>;
  };
}

/**
 * State definition within state machine
 *
 * @template TState - State type
 * @template TEvent - Event type
 * @template TContext - Context type
 */
export interface StateDefinition<
  TState extends string,
  TEvent extends string,
  TContext = unknown
> {
  /**
   * Entry action
   */
  readonly entry?: StateAction<TContext>;

  /**
   * Exit action
   */
  readonly exit?: StateAction<TContext>;

  /**
   * State transitions
   */
  readonly on?: {
    readonly [K in TEvent]?: StateTransition<TState, TContext>;
  };

  /**
   * Is this a final state?
   */
  readonly final?: boolean;
}

/**
 * State action (side effect)
 *
 * @template TContext - Context type
 */
export type StateAction<TContext> =
  | ((context: TContext) => void | Promise<void>)
  | readonly StateAction<TContext>[];

/**
 * State transition definition
 *
 * @template TState - Target state type
 * @template TContext - Context type
 */
export interface StateTransition<TState extends string, TContext = unknown> {
  /**
   * Target state
   */
  readonly target: TState;

  /**
   * Guard condition
   */
  readonly guard?: (context: TContext) => boolean;

  /**
   * Actions to execute on transition
   */
  readonly actions?: StateAction<TContext>;

  /**
   * Context updates
   */
  readonly assign?: Partial<TContext> | ((context: TContext) => Partial<TContext>);
}

/**
 * State machine instance
 *
 * @template TState - State type
 * @template TEvent - Event type
 * @template TContext - Context type
 */
export interface StateMachine<
  TState extends string,
  TEvent extends string,
  TContext = unknown
> {
  /**
   * Current state
   */
  readonly state: TState;

  /**
   * Current context
   */
  readonly context: Readonly<TContext>;

  /**
   * Can transition to given state
   */
  can(event: TEvent): boolean;

  /**
   * Send event to machine
   */
  send(event: TEvent): void;

  /**
   * Send event with payload
   */
  sendWith<P>(event: TEvent, payload: P): void;

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: TState, context: Readonly<TContext>) => void): () => void;

  /**
   * Get state history
   */
  getHistory(): readonly TState[];

  /**
   * Reset to initial state
   */
  reset(): void;
}

/**
 * useStateMachine hook signature
 */
export interface UseStateMachineHook {
  <TState extends string, TEvent extends string, TContext = unknown>(
    config: StateMachineConfig<TState, TEvent, TContext>
  ): StateMachine<TState, TEvent, TContext>;
}

// ============================================================================
// Derived State Types
// ============================================================================

/**
 * Derived state from multiple sources
 *
 * @template TSources - Source types tuple
 * @template TResult - Derived result type
 */
export type DerivedState<
  TSources extends readonly unknown[],
  TResult
> = ComputedReactive<TResult> & {
  /**
   * Source reactives
   */
  readonly sources: { readonly [K in keyof TSources]: Reactive<TSources[K]> };
};

/**
 * useDerived hook options
 */
export interface UseDerivedOptions extends UseComputedOptions {
  /**
   * Sources to derive from
   */
  readonly sources: readonly Reactive<unknown>[];
}

/**
 * useDerived hook signature
 */
export interface UseDerivedHook {
  <T1, R>(sources: readonly [Reactive<T1>], fn: (v1: T1) => R): DerivedState<[T1], R>;
  <T1, T2, R>(
    sources: readonly [Reactive<T1>, Reactive<T2>],
    fn: (v1: T1, v2: T2) => R
  ): DerivedState<[T1, T2], R>;
  <T1, T2, T3, R>(
    sources: readonly [Reactive<T1>, Reactive<T2>, Reactive<T3>],
    fn: (v1: T1, v2: T2, v3: T3) => R
  ): DerivedState<[T1, T2, T3], R>;
}

// ============================================================================
// State Context Types (for sharing state across hooks)
// ============================================================================

/**
 * State context definition
 *
 * @template T - State type
 */
export interface StateContext<T> {
  /**
   * Context identifier
   */
  readonly id: symbol;

  /**
   * Display name
   */
  readonly displayName: string;

  /**
   * Default value factory
   */
  readonly defaultValue: () => T;
}

/**
 * Create state context
 */
export function createStateContext<T>(
  displayName: string,
  defaultValue: () => T
): StateContext<T>;

/**
 * State context provider props
 *
 * @template T - State type
 */
export interface StateProviderProps<T> {
  /**
   * Context to provide
   */
  readonly context: StateContext<T>;

  /**
   * Initial value (overrides default)
   */
  readonly value?: T;

  /**
   * Children that can consume context
   */
  readonly children?: unknown;
}

/**
 * useStateContext hook signature
 */
export interface UseStateContextHook {
  <T>(context: StateContext<T>): T;
}

/**
 * useSetStateContext hook signature - for updating context value
 */
export interface UseSetStateContextHook {
  <T>(context: StateContext<T>): StateSetter<T>;
}

// ============================================================================
// Async State Types
// ============================================================================

/**
 * Async state representation
 *
 * @template T - Data type
 * @template E - Error type
 */
export type AsyncState<T, E = Error> =
  | { readonly status: 'idle' }
  | { readonly status: 'pending' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: E };

/**
 * useAsync hook return type
 *
 * @template T - Data type
 * @template E - Error type
 */
export interface UseAsyncReturn<T, E = Error> {
  /**
   * Current state
   */
  readonly state: AsyncState<T, E>;

  /**
   * Is loading
   */
  readonly isLoading: boolean;

  /**
   * Is success
   */
  readonly isSuccess: boolean;

  /**
   * Is error
   */
  readonly isError: boolean;

  /**
   * Data (undefined if not success)
   */
  readonly data: T | undefined;

  /**
   * Error (undefined if not error)
   */
  readonly error: E | undefined;

  /**
   * Execute async function
   */
  execute: () => Promise<T>;

  /**
   * Reset to idle state
   */
  reset: () => void;
}

/**
 * useAsync hook options
 */
export interface UseAsyncOptions<T> extends HookOptions {
  /**
   * Execute immediately on mount
   */
  readonly immediate?: boolean;

  /**
   * Reset on error
   */
  readonly resetOnError?: boolean;

  /**
   * Retry configuration
   */
  readonly retry?: {
    readonly count: number;
    readonly delay: number;
    readonly backoff?: 'fixed' | 'exponential';
  };

  /**
   * On success callback
   */
  readonly onSuccess?: (data: T) => void;

  /**
   * On error callback
   */
  readonly onError?: (error: Error) => void;
}

/**
 * useAsync hook signature
 */
export interface UseAsyncHook {
  <T>(asyncFn: () => Promise<T>): UseAsyncReturn<T>;
  <T>(asyncFn: () => Promise<T>, options: UseAsyncOptions<T>): UseAsyncReturn<T>;
}
