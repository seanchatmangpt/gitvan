/**
 * @fileoverview GitVan v4 - Reducer Hook Type Definitions
 *
 * This module provides comprehensive reducer and action management types
 * for GitVan's reactive hook system. Implements patterns from @unrdf/hooks
 * for state reducers, actions, and middleware with proper TypeScript inference.
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
  DeepReadonly,
  Prettify,
} from './base.d.ts';
import type { HookOptions, Reactive } from './hooks.d.ts';

// ============================================================================
// Action Types
// ============================================================================

/**
 * Base action type with discriminated type property
 */
export interface Action<TType extends string = string> {
  readonly type: TType;
}

/**
 * Action with payload
 *
 * @template TType - Action type string
 * @template TPayload - Payload type
 */
export interface ActionWithPayload<TType extends string, TPayload>
  extends Action<TType> {
  readonly payload: TPayload;
}

/**
 * Action with error
 *
 * @template TType - Action type string
 */
export interface ActionWithError<TType extends string> extends Action<TType> {
  readonly error: true;
  readonly payload: Error;
}

/**
 * Action with meta
 *
 * @template TType - Action type string
 * @template TMeta - Meta type
 */
export interface ActionWithMeta<TType extends string, TMeta> extends Action<TType> {
  readonly meta: TMeta;
}

/**
 * Full action with payload and meta
 *
 * @template TType - Action type string
 * @template TPayload - Payload type
 * @template TMeta - Meta type
 */
export interface FullAction<TType extends string, TPayload, TMeta>
  extends ActionWithPayload<TType, TPayload>,
    ActionWithMeta<TType, TMeta> {}

/**
 * Async action status
 */
export type AsyncActionStatus = 'pending' | 'fulfilled' | 'rejected';

/**
 * Async action lifecycle types
 *
 * @template TType - Base action type
 */
export interface AsyncActionTypes<TType extends string> {
  readonly pending: `${TType}/pending`;
  readonly fulfilled: `${TType}/fulfilled`;
  readonly rejected: `${TType}/rejected`;
}

// ============================================================================
// Action Creator Types
// ============================================================================

/**
 * Action creator with no payload
 *
 * @template TType - Action type
 */
export interface ActionCreator<TType extends string> {
  (): Action<TType>;
  readonly type: TType;
  readonly match: (action: Action) => action is Action<TType>;
}

/**
 * Action creator with payload
 *
 * @template TType - Action type
 * @template TPayload - Payload type
 */
export interface ActionCreatorWithPayload<TType extends string, TPayload> {
  (payload: TPayload): ActionWithPayload<TType, TPayload>;
  readonly type: TType;
  readonly match: (action: Action) => action is ActionWithPayload<TType, TPayload>;
}

/**
 * Action creator with optional payload
 *
 * @template TType - Action type
 * @template TPayload - Payload type
 */
export interface ActionCreatorWithOptionalPayload<TType extends string, TPayload> {
  (payload?: TPayload): ActionWithPayload<TType, TPayload | undefined>;
  readonly type: TType;
  readonly match: (
    action: Action
  ) => action is ActionWithPayload<TType, TPayload | undefined>;
}

/**
 * Action creator with prepared payload
 *
 * @template TType - Action type
 * @template TArgs - Prepare function arguments
 * @template TPayload - Payload type
 * @template TMeta - Meta type
 */
export interface ActionCreatorWithPrepare<
  TType extends string,
  TArgs extends readonly unknown[],
  TPayload,
  TMeta = undefined
> {
  (...args: TArgs): TMeta extends undefined
    ? ActionWithPayload<TType, TPayload>
    : FullAction<TType, TPayload, TMeta>;
  readonly type: TType;
  readonly match: (action: Action) => boolean;
}

/**
 * Create action creator function type
 */
export type CreateAction = {
  <TType extends string>(type: TType): ActionCreator<TType>;
  <TType extends string, TPayload>(type: TType): ActionCreatorWithPayload<TType, TPayload>;
  <TType extends string, TArgs extends readonly unknown[], TPayload, TMeta = undefined>(
    type: TType,
    prepareAction: (...args: TArgs) => { payload: TPayload; meta?: TMeta }
  ): ActionCreatorWithPrepare<TType, TArgs, TPayload, TMeta>;
};

// ============================================================================
// Reducer Types
// ============================================================================

/**
 * Reducer function type
 *
 * @template TState - State type
 * @template TAction - Action type
 */
export type Reducer<TState, TAction extends Action = Action> = (
  state: TState,
  action: TAction
) => TState;

/**
 * Reducer with initial state
 *
 * @template TState - State type
 * @template TAction - Action type
 */
export interface ReducerWithInitialState<TState, TAction extends Action = Action> {
  (state: TState | undefined, action: TAction): TState;
  readonly initialState: TState;
}

/**
 * Case reducer - handles a specific action type
 *
 * @template TState - State type
 * @template TAction - Action type
 */
export type CaseReducer<TState, TAction extends Action = Action> = (
  state: TState,
  action: TAction
) => TState | void;

/**
 * Case reducers map
 *
 * @template TState - State type
 */
export type CaseReducers<TState> = {
  [K: string]: CaseReducer<TState, Action<K>>;
};

/**
 * Slice reducers (immer-style draft mutations)
 *
 * @template TState - State type
 */
export type SliceReducers<TState> = {
  [K: string]: CaseReducer<Draft<TState>, ActionWithPayload<K, any>>;
};

/**
 * Draft type for immer-style mutations
 */
export type Draft<T> = T extends readonly (infer U)[]
  ? DraftArray<U>
  : T extends object
    ? DraftObject<T>
    : T;

type DraftArray<T> = Array<Draft<T>>;
type DraftObject<T> = { -readonly [K in keyof T]: Draft<T[K]> };

// ============================================================================
// useReducer Hook Types
// ============================================================================

/**
 * useReducer hook return type
 *
 * @template TState - State type
 * @template TAction - Action type
 */
export type UseReducerReturn<TState, TAction extends Action = Action> = readonly [
  TState,
  (action: TAction) => void
];

/**
 * useReducer hook with lazy initialization
 *
 * @template TState - State type
 * @template TAction - Action type
 * @template TInit - Init argument type
 */
export type UseReducerReturnWithInit<
  TState,
  TAction extends Action = Action,
  TInit = unknown
> = UseReducerReturn<TState, TAction>;

/**
 * useReducer hook options
 */
export interface UseReducerOptions<TState> extends HookOptions {
  /**
   * Enable state history tracking
   */
  readonly trackHistory?: boolean;

  /**
   * Maximum history entries
   */
  readonly maxHistory?: number;

  /**
   * Enable time-travel debugging
   */
  readonly timeTravel?: boolean;

  /**
   * Middleware to apply
   */
  readonly middleware?: readonly Middleware<TState>[];

  /**
   * On state change callback
   */
  readonly onChange?: (state: TState, prevState: TState) => void;

  /**
   * On error callback
   */
  readonly onError?: (error: Error, action: Action) => void;
}

/**
 * useReducer hook signature
 */
export interface UseReducerHook {
  <TState, TAction extends Action>(
    reducer: Reducer<TState, TAction>,
    initialState: TState
  ): UseReducerReturn<TState, TAction>;

  <TState, TAction extends Action>(
    reducer: Reducer<TState, TAction>,
    initialState: TState,
    options: UseReducerOptions<TState>
  ): UseReducerReturn<TState, TAction>;

  <TState, TAction extends Action, TInit>(
    reducer: Reducer<TState, TAction>,
    initArg: TInit,
    init: (arg: TInit) => TState
  ): UseReducerReturnWithInit<TState, TAction, TInit>;

  <TState, TAction extends Action, TInit>(
    reducer: Reducer<TState, TAction>,
    initArg: TInit,
    init: (arg: TInit) => TState,
    options: UseReducerOptions<TState>
  ): UseReducerReturnWithInit<TState, TAction, TInit>;
}

// ============================================================================
// Middleware Types
// ============================================================================

/**
 * Middleware API provided to middleware
 *
 * @template TState - State type
 */
export interface MiddlewareAPI<TState> {
  getState: () => TState;
  dispatch: (action: Action) => void;
}

/**
 * Middleware function type
 *
 * @template TState - State type
 */
export type Middleware<TState> = (api: MiddlewareAPI<TState>) => (
  next: (action: Action) => void
) => (action: Action) => void;

/**
 * Thunk middleware types
 */
export type ThunkAction<TState, TReturn = void> = (
  dispatch: (action: Action | ThunkAction<TState, any>) => any,
  getState: () => TState
) => TReturn;

/**
 * Async thunk action
 */
export type AsyncThunkAction<TState, TPayload, TReturn = void> = (
  dispatch: (action: Action | AsyncThunkAction<TState, any, any>) => Promise<any>,
  getState: () => TState,
  extra?: unknown
) => Promise<TReturn>;

/**
 * Logger middleware options
 */
export interface LoggerMiddlewareOptions {
  readonly collapsed?: boolean;
  readonly duration?: boolean;
  readonly timestamp?: boolean;
  readonly diff?: boolean;
  readonly predicate?: (getState: () => unknown, action: Action) => boolean;
}

/**
 * Create logger middleware
 */
export function createLoggerMiddleware<TState>(
  options?: LoggerMiddlewareOptions
): Middleware<TState>;

/**
 * Create thunk middleware
 */
export function createThunkMiddleware<TState, TExtra = undefined>(
  extraArgument?: TExtra
): Middleware<TState>;

// ============================================================================
// Slice Types (Redux Toolkit-inspired)
// ============================================================================

/**
 * Slice configuration
 *
 * @template TState - State type
 * @template TReducers - Reducers map type
 * @template TName - Slice name
 */
export interface SliceConfig<
  TState,
  TReducers extends SliceReducers<TState>,
  TName extends string = string
> {
  /**
   * Slice name (used as action type prefix)
   */
  readonly name: TName;

  /**
   * Initial state
   */
  readonly initialState: TState | (() => TState);

  /**
   * Case reducers
   */
  readonly reducers: TReducers;

  /**
   * Extra reducers for handling external actions
   */
  readonly extraReducers?: (builder: ReducerBuilder<TState>) => void;
}

/**
 * Slice instance
 *
 * @template TState - State type
 * @template TReducers - Reducers map type
 * @template TName - Slice name
 */
export interface Slice<
  TState,
  TReducers extends SliceReducers<TState>,
  TName extends string = string
> {
  /**
   * Slice name
   */
  readonly name: TName;

  /**
   * Combined reducer function
   */
  readonly reducer: Reducer<TState>;

  /**
   * Generated action creators
   */
  readonly actions: SliceActions<TReducers, TName>;

  /**
   * Case reducers
   */
  readonly caseReducers: TReducers;

  /**
   * Initial state
   */
  readonly getInitialState: () => TState;
}

/**
 * Slice actions type - maps reducer keys to action creators
 */
export type SliceActions<TReducers, TName extends string> = {
  [K in keyof TReducers]: TReducers[K] extends CaseReducer<
    any,
    ActionWithPayload<any, infer P>
  >
    ? ActionCreatorWithPayload<`${TName}/${K & string}`, P>
    : ActionCreator<`${TName}/${K & string}`>;
};

/**
 * Create slice function
 */
export function createSlice<
  TState,
  TReducers extends SliceReducers<TState>,
  TName extends string
>(config: SliceConfig<TState, TReducers, TName>): Slice<TState, TReducers, TName>;

// ============================================================================
// Reducer Builder Types
// ============================================================================

/**
 * Reducer builder for fluent reducer composition
 *
 * @template TState - State type
 */
export interface ReducerBuilder<TState> {
  /**
   * Add case reducer for action type
   */
  addCase<TType extends string, TPayload = undefined>(
    actionCreator: ActionCreator<TType> | ActionCreatorWithPayload<TType, TPayload>,
    reducer: CaseReducer<TState, ActionWithPayload<TType, TPayload>>
  ): ReducerBuilder<TState>;

  /**
   * Add case reducer for action type string
   */
  addCase<TAction extends Action>(
    type: TAction['type'],
    reducer: CaseReducer<TState, TAction>
  ): ReducerBuilder<TState>;

  /**
   * Add matcher reducer (handles multiple action types)
   */
  addMatcher<TAction extends Action>(
    matcher: (action: Action) => action is TAction,
    reducer: CaseReducer<TState, TAction>
  ): ReducerBuilder<TState>;

  /**
   * Add default case reducer
   */
  addDefaultCase(reducer: CaseReducer<TState, Action>): ReducerBuilder<TState>;
}

/**
 * Create reducer builder function
 */
export function createReducerBuilder<TState>(
  initialState: TState
): ReducerBuilder<TState>;

// ============================================================================
// Combined Reducer Types
// ============================================================================

/**
 * Reducers map for combining
 */
export type ReducersMapObject<TState> = {
  [K in keyof TState]: Reducer<TState[K]>;
};

/**
 * State from reducers map
 */
export type StateFromReducersMap<M extends ReducersMapObject<any>> = {
  [K in keyof M]: M[K] extends Reducer<infer S> ? S : never;
};

/**
 * Combine reducers function
 */
export function combineReducers<M extends ReducersMapObject<any>>(
  reducers: M
): Reducer<StateFromReducersMap<M>>;

// ============================================================================
// Async Action Types
// ============================================================================

/**
 * Async thunk configuration
 *
 * @template TPayload - Result payload type
 * @template TArg - Argument type
 * @template TState - State type
 */
export interface AsyncThunkConfig<TPayload, TArg, TState> {
  /**
   * Thunk payload creator
   */
  readonly payloadCreator: (
    arg: TArg,
    thunkAPI: AsyncThunkAPI<TState>
  ) => Promise<TPayload>;

  /**
   * Condition to check before executing
   */
  readonly condition?: (arg: TArg, api: { getState: () => TState }) => boolean;

  /**
   * Dispatch lifecycle actions
   */
  readonly dispatchConditionRejection?: boolean;
}

/**
 * Async thunk API
 *
 * @template TState - State type
 */
export interface AsyncThunkAPI<TState> {
  dispatch: (action: Action) => void;
  getState: () => TState;
  extra?: unknown;
  requestId: string;
  signal: AbortSignal;
  rejectWithValue: <V>(value: V) => RejectWithValue<V>;
  fulfillWithValue: <V>(value: V) => FulfillWithValue<V>;
}

/**
 * Reject with value wrapper
 */
export interface RejectWithValue<V> {
  readonly _tag: 'RejectWithValue';
  readonly value: V;
}

/**
 * Fulfill with value wrapper
 */
export interface FulfillWithValue<V> {
  readonly _tag: 'FulfillWithValue';
  readonly value: V;
}

/**
 * Async thunk action types
 *
 * @template TPayload - Payload type
 * @template TArg - Argument type
 * @template TTypePrefix - Type prefix
 */
export interface AsyncThunk<TPayload, TArg, TTypePrefix extends string> {
  (arg: TArg): AsyncThunkAction<any, TPayload>;

  readonly pending: ActionCreatorWithPayload<
    `${TTypePrefix}/pending`,
    { arg: TArg; requestId: string }
  >;

  readonly fulfilled: ActionCreatorWithPayload<
    `${TTypePrefix}/fulfilled`,
    { arg: TArg; requestId: string; payload: TPayload }
  >;

  readonly rejected: ActionCreatorWithPayload<
    `${TTypePrefix}/rejected`,
    { arg: TArg; requestId: string; error: Error }
  >;

  readonly typePrefix: TTypePrefix;
}

/**
 * Create async thunk
 */
export function createAsyncThunk<TPayload, TArg, TState, TTypePrefix extends string>(
  typePrefix: TTypePrefix,
  payloadCreator: (arg: TArg, thunkAPI: AsyncThunkAPI<TState>) => Promise<TPayload>,
  options?: Partial<AsyncThunkConfig<TPayload, TArg, TState>>
): AsyncThunk<TPayload, TArg, TTypePrefix>;

// ============================================================================
// Reducer Time-Travel Types
// ============================================================================

/**
 * Time-travel state
 *
 * @template TState - State type
 * @template TAction - Action type
 */
export interface TimeTravelState<TState, TAction extends Action = Action> {
  /**
   * Current state
   */
  readonly current: TState;

  /**
   * Past states
   */
  readonly past: readonly TState[];

  /**
   * Future states (after undo)
   */
  readonly future: readonly TState[];

  /**
   * Action history
   */
  readonly history: readonly TAction[];

  /**
   * Current history index
   */
  readonly index: number;

  /**
   * Can undo
   */
  readonly canUndo: boolean;

  /**
   * Can redo
   */
  readonly canRedo: boolean;
}

/**
 * Time-travel controls
 *
 * @template TState - State type
 * @template TAction - Action type
 */
export interface TimeTravelControls<TState, TAction extends Action = Action> {
  /**
   * Undo last action
   */
  undo: () => void;

  /**
   * Redo next action
   */
  redo: () => void;

  /**
   * Jump to specific index
   */
  jumpTo: (index: number) => void;

  /**
   * Clear history
   */
  clearHistory: () => void;

  /**
   * Get state at index
   */
  getStateAt: (index: number) => TState | undefined;

  /**
   * Get action at index
   */
  getActionAt: (index: number) => TAction | undefined;
}

/**
 * useReducerWithTimeTravel return type
 */
export type UseReducerWithTimeTravelReturn<TState, TAction extends Action = Action> =
  readonly [
    TState,
    (action: TAction) => void,
    TimeTravelState<TState, TAction>,
    TimeTravelControls<TState, TAction>
  ];

/**
 * useReducerWithTimeTravel hook signature
 */
export interface UseReducerWithTimeTravelHook {
  <TState, TAction extends Action>(
    reducer: Reducer<TState, TAction>,
    initialState: TState
  ): UseReducerWithTimeTravelReturn<TState, TAction>;

  <TState, TAction extends Action>(
    reducer: Reducer<TState, TAction>,
    initialState: TState,
    options: UseReducerOptions<TState> & { readonly maxHistory?: number }
  ): UseReducerWithTimeTravelReturn<TState, TAction>;
}
