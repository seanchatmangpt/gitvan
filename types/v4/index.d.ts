/**
 * @fileoverview GitVan v4 - Type Definitions Index
 *
 * This module serves as the main entry point for all GitVan v4 type definitions.
 * It re-exports types from all submodules with proper organization for
 * @unrdf/hooks integration and strict TypeScript compatibility.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 *
 * @example
 * // Import all types
 * import type * as GitVan from 'gitvan/types/v4';
 *
 * @example
 * // Import specific types
 * import type { HookId, UseStateReturn, isHookId } from 'gitvan/types/v4';
 *
 * @example
 * // Import from submodules
 * import type { UseEffectHook } from 'gitvan/types/v4/effect';
 */

// ============================================================================
// Base Types - Branded types, utilities, and primitives
// ============================================================================

export type {
  // Branded Types
  Branded,
  HookId,
  WorkflowId,
  StepId,
  ExecutionId,
  SessionId,
  LockId,
  ReceiptId,
  CommitSha,
  RefName,
  UnixTimestamp,
  ISODateString,
  DurationMs,

  // Deep Utility Types
  DeepReadonly,
  DeepPartial,
  DeepRequired,
  Freeze,

  // JSON Types
  Json,
  MutableJson,

  // Enum Types
  Priority,
  ExecType,
  LogLevel,
  StepStatus,
  JobStatus,
  HookPhase,

  // Utility Types
  KeysOfType,
  PickByType,
  OmitByType,
  RequireKeys,
  OptionalKeys,
  Merge,
  Prettify,
  NonNullableKeys,
  NullableKeys,
  ArrayElement,
  Awaited,
  Maybe,
  Nullable,
  NonEmptyArray,
  AnyFunction,
  AsyncFunction,
  EnsureObject,

  // Result Types
  Ok,
  Err,
  Result,
  AsyncResult,

  // Option Types
  Some,
  None,
  Option,

  // Environment Types
  DeterministicEnv,
  GitEnv,

  // Version Types
  SemVer,

  // Type Assertion Helpers
  Assert,
  IsEqual,
  Extends,
  IsNever,
  IsAny,
  Expect,
  ExpectTrue,
  ExpectFalse,
} from './base.d.ts';

export {
  // Const Arrays
  PRIORITIES,
  EXEC_TYPES,
  LOG_LEVELS,
  STEP_STATUSES,
  JOB_STATUSES,
  HOOK_PHASES,

  // Constants
  RDF_NAMESPACES,
  GITVAN_VERSION,
  SCHEMA_VERSION,

  // Result Helpers
  ok,
  err,
  isOk,
  isErr,

  // Option Helpers
  some,
  none,
  isSome,
  isNone,
} from './base.d.ts';

// ============================================================================
// Hook Types - Core reactive hook patterns
// ============================================================================

export type {
  // Lifecycle Types
  HookLifecycle,
  HookRegistration,

  // Reactive Types
  Reactive,
  WritableReactive,
  ComputedReactive,
  ReactiveEffect,

  // Return Types
  UseStateReturn,
  UseReactiveReturn,
  UseComputedReturn,
  UseEffectReturn,
  UseRefReturn,
  UseCallbackReturn,
  UseMemoReturn,

  // Option Types
  HookOptions,
  EffectOptions,
  WatchOptions,
  WatchTrackEvent,
  WatchTriggerEvent,

  // Context Types
  GitVanHookContext,
  HookExecutionContext,

  // Composition Types
  ComposableHook,
  CreateComposableHook,
  InjectionKey,
  ProvideInject,

  // Registry Types
  HookRegistryEntry,
  HookRegistry,

  // Event Types
  HookEventName,
  HookEventPayloads,
  HookEvent,
  HookEventHandler,
  HookEventEmitter,

  // Scope Types
  HookScope,
  CreateHookScope,
  GetCurrentScope,

  // Debug Types
  HookDebugInfo,
  HookDebugger,
  ProfilingResults,
} from './hooks.d.ts';

export { createInjectionKey } from './hooks.d.ts';

// ============================================================================
// State Hook Types
// ============================================================================

export type {
  // State Primitives
  StateInitializer,
  StateSetter,
  StateDispatch,
  StateSelector,
  StateComparator,

  // useState
  UseStateReturn as StateReturn,
  UseStateOptions,
  UseStateHook,

  // useReactive
  UseReactiveReturn as ReactiveReturn,
  UseReactiveOptions,
  UseReactiveHook,

  // useRef
  Ref,
  ReadonlyRef,
  UseRefReturn as RefReturn,
  UseRefHook,

  // useComputed
  ComputedGetter,
  ComputedSetter,
  ComputedGetterSetter,
  UseComputedReturn as ComputedReturn,
  UseComputedOptions,
  UseComputedHook,

  // useReadonly
  UseReadonlyReturn,
  UseReadonlyHook,

  // State Snapshots
  StateSnapshot,
  StateHistoryEntry,
  StateDiff,
  StateDiffChange,

  // State Persistence
  StatePersistenceAdapter,
  GitNotesStateOptions,
  FileStateOptions,

  // State Machine
  StateMachineConfig,
  StateDefinition,
  StateAction,
  StateTransition,
  StateMachine,
  UseStateMachineHook,

  // Derived State
  DerivedState,
  UseDerivedOptions,
  UseDerivedHook,

  // State Context
  StateContext,
  StateProviderProps,
  UseStateContextHook,
  UseSetStateContextHook,

  // Async State
  AsyncState,
  UseAsyncReturn,
  UseAsyncOptions,
  UseAsyncHook,
} from './state.d.ts';

export { createStateContext } from './state.d.ts';

// ============================================================================
// Effect Hook Types
// ============================================================================

export type {
  // Effect Primitives
  EffectCleanup,
  EffectCallback,
  EffectDeps,
  AsyncEffectCallback,

  // useEffect
  UseEffectReturn as EffectReturn,
  UseEffectOptions,
  UseEffectHook,

  // useAsyncEffect
  AsyncEffectState,
  UseAsyncEffectReturn,
  UseAsyncEffectOptions,
  UseAsyncEffectHook,

  // useLayoutEffect
  UseLayoutEffectHook,

  // useInsertionEffect
  UseInsertionEffectHook,

  // Watch Types
  WatchSource,
  WatchCallback,
  WatchCallbackMulti,
  WatchStopHandle,

  // useWatch
  UseWatchOptions,
  UseWatchHook,
  UseWatchMultiHook,

  // useWatchEffect
  WatchEffectCallback,
  UseWatchEffectOptions,
  UseWatchEffectHook,

  // Debounce/Throttle Effects
  DebouncedEffectOptions,
  ThrottledEffectOptions,
  DebouncedEffectReturn,
  UseDebouncedEffectHook,
  UseThrottledEffectHook,

  // Effect Scope
  EffectScope,
  UseEffectScopeHook,

  // Event Effects
  EventTarget,
  UseEventListenerOptions,
  UseEventListenerHook,

  // Interval/Timeout
  UseIntervalReturn,
  UseIntervalOptions,
  UseIntervalHook,
  UseTimeoutReturn,
  UseTimeoutOptions,
  UseTimeoutHook,

  // Lifecycle Effects
  UseOnMountHook,
  UseOnUnmountHook,
  UseOnUpdateHook,
  UsePreviousHook,

  // Git Effects
  GitEventType,
  GitEventPayload,
  UseGitEffectOptions,
  UseGitEffectHook,
  UseOnCommitHook,
  UseOnBranchChangeHook,
  UseFileChangeOptions,
  FileChangeEvent,
  UseFileChangeHook,
} from './effect.d.ts';

export { getCurrentScope, onScopeDispose } from './effect.d.ts';

// ============================================================================
// Reducer Hook Types
// ============================================================================

export type {
  // Action Types
  Action,
  ActionWithPayload,
  ActionWithError,
  ActionWithMeta,
  FullAction,
  AsyncActionStatus,
  AsyncActionTypes,

  // Action Creators
  ActionCreator,
  ActionCreatorWithPayload,
  ActionCreatorWithOptionalPayload,
  ActionCreatorWithPrepare,
  CreateAction,

  // Reducer Types
  Reducer,
  ReducerWithInitialState,
  CaseReducer,
  CaseReducers,
  SliceReducers,
  Draft,

  // useReducer
  UseReducerReturn,
  UseReducerReturnWithInit,
  UseReducerOptions,
  UseReducerHook,

  // Middleware
  MiddlewareAPI,
  Middleware,
  ThunkAction,
  AsyncThunkAction,
  LoggerMiddlewareOptions,

  // Slice Types
  SliceConfig,
  Slice,
  SliceActions,

  // Reducer Builder
  ReducerBuilder,

  // Combined Reducers
  ReducersMapObject,
  StateFromReducersMap,

  // Async Thunk
  AsyncThunkConfig,
  AsyncThunkAPI,
  RejectWithValue,
  FulfillWithValue,
  AsyncThunk,

  // Time Travel
  TimeTravelState,
  TimeTravelControls,
  UseReducerWithTimeTravelReturn,
  UseReducerWithTimeTravelHook,
} from './reducer.d.ts';

export {
  createLoggerMiddleware,
  createThunkMiddleware,
  createSlice,
  createReducerBuilder,
  combineReducers,
  createAsyncThunk,
} from './reducer.d.ts';

// ============================================================================
// Custom Hook Types
// ============================================================================

export type {
  // Memoization
  DepsAreEqual,
  UseMemoOptions,
  UseMemoReturn as MemoReturn,
  UseMemoHook,
  UseCallbackReturn as CallbackReturn,
  UseCallbackHook,
  UseStableCallbackHook,

  // Context
  UseGitVanReturn,
  UseGitVanHook,
  TryUseGitVanHook,
  WithGitVanHook,

  // Git
  GitRepoInfo,
  UseGitReturn,
  CommitOptions,
  CheckoutOptions,
  MergeOptions,
  UseGitOptions,
  UseGitHook,

  // Template
  TemplateRenderOptions,
  TemplateRenderResult,
  UseTemplateReturn,
  UseTemplateOptions,
  UseTemplateHook,

  // Job
  JobDefinition,
  JobContext,
  JobResult,
  UseJobReturn,
  UseJobOptions,
  UseJobHook,

  // Lock
  LockOptions,
  LockHandle,
  UseLockReturn,
  UseLockHook,

  // Receipt
  Receipt as ReceiptData,
  UseReceiptReturn,
  ReceiptFilter,
  UseReceiptHook,

  // Event
  UseEventReturn,
  UseEventHook,

  // ID
  UseIdReturn,
  UseIdHook,
  UseHookIdHook,
  UseExecutionIdHook,

  // Toggle/Boolean
  UseToggleReturn,
  UseToggleHook,
  UseBooleanReturn,
  UseBooleanHook,

  // Counter
  UseCounterReturn,
  UseCounterOptions,
  UseCounterHook,

  // Queue
  QueueItem,
  UseQueueReturn,
  UseQueueHook,

  // Storage
  UseLocalStorageOptions,
  UseLocalStorageReturn,
  UseLocalStorageHook,

  // Debounce/Throttle
  UseDebounceReturn,
  UseDebounceHook,
  UseDebouncedCallbackReturn,
  UseDebouncedCallbackHook,
  UseThrottleReturn,
  UseThrottleHook,
  UseThrottledCallbackReturn,
  UseThrottledCallbackHook,

  // Provide/Inject
  UseProvideHook,
  UseInjectHook,

  // Error Boundary
  ErrorBoundaryState,
  UseErrorBoundaryReturn,
  UseErrorBoundaryHook,

  // Compose
  Composable,
  UseComposeHook,
  UsePipeHook,
} from './custom.d.ts';

// ============================================================================
// Discriminated Union Types
// ============================================================================

export type {
  // Exec Specs
  CliExecSpec,
  JsExecSpec,
  LlmExecSpec,
  JobExecSpec,
  TmplExecSpec,
  SparqlExecSpec,
  HttpExecSpec,
  ExecSpec,

  // Predicates
  AskPredicate,
  SelectThresholdPredicate,
  ResultDeltaPredicate,
  ShaclAllConformPredicate,
  CustomPredicate,
  Predicate,

  // Steps
  BaseStep,
  TemplateStep,
  ShellStep,
  HttpStep,
  SparqlStep,
  CustomStep,
  ParallelStep,
  ConditionalStep,
  LoopStep,
  Step,

  // Results
  SuccessResult,
  FailureResult,
  PendingResult,
  CancelledResult,
  TimeoutResult,
  SkippedResult,
  Result as ResultUnion,

  // Hook Events
  HookRegisteredEvent,
  HookUnregisteredEvent,
  HookBeforeExecuteEvent,
  HookAfterExecuteEvent,
  HookErrorEvent,
  HookTimeoutEvent,
  HookEvent as HookEventUnion,

  // Workflow Events
  WorkflowStartedEvent,
  WorkflowCompletedEvent,
  WorkflowFailedEvent,
  WorkflowEvent,

  // Step Events
  StepStartedEvent,
  StepCompletedEvent,
  StepFailedEvent,
  StepEvent,

  // System Events
  SystemEvent,

  // Git Events
  GitCommitEvent,
  GitPushEvent,
  GitPullEvent,
  GitBranchCreateEvent,
  GitBranchDeleteEvent,
  GitTagCreateEvent,
  GitTagDeleteEvent,
  GitMergeEvent,
  GitCheckoutEvent,
  GitEvent,

  // RDF Query Results
  AskQueryResult,
  SelectQueryResult,
  ConstructQueryResult,
  DescribeQueryResult,
  UpdateQueryResult,
  RdfQueryResult,
  TermValue,
  Quad,

  // Async States
  IdleAsyncState,
  LoadingAsyncState,
  SuccessAsyncState,
  ErrorAsyncState,
  RefreshingAsyncState,
  AsyncState as AsyncStateUnion,

  // Config
  DevelopmentConfig,
  TestingConfig,
  ProductionConfig,
  EnvConfig,

  // Messages
  RequestMessage,
  ResponseMessage,
  ErrorMessage,
  NotificationMessage,
  Message,

  // Union Helpers
  DiscriminatorOf,
  ExtractByType,
  ExtractByTag,
  ExtractByStatus,
  ExtractByKind,
  DiscriminatorValues,
} from './unions.d.ts';

// ============================================================================
// Type Guards
// ============================================================================

export {
  // Branded Type Guards
  isHookId,
  isWorkflowId,
  isStepId,
  isExecutionId,
  isSessionId,
  isCommitSha,
  isRefName,
  isUnixTimestamp,
  isISODateString,
  isDurationMs,

  // Primitive Type Guards
  isJson,
  isPriority,
  isExecType,
  isStepStatus,
  isJobStatus,
  isHookPhase,

  // Exec Spec Guards
  isExecSpec,
  isCliExecSpec,
  isJsExecSpec,
  isLlmExecSpec,
  isJobExecSpec,
  isTmplExecSpec,
  isSparqlExecSpec,
  isHttpExecSpec,

  // Predicate Guards
  isPredicate,
  isAskPredicate,
  isSelectThresholdPredicate,
  isResultDeltaPredicate,
  isShaclAllConformPredicate,
  isCustomPredicate,

  // Step Guards
  isStep,
  isTemplateStep,
  isShellStep,
  isHttpStep,
  isSparqlStep,
  isCustomStep,
  isParallelStep,
  isConditionalStep,
  isLoopStep,

  // Result Guards
  isResult,
  isSuccessResult,
  isFailureResult,
  isPendingResult,
  isCancelledResult,
  isTimeoutResult,
  isSkippedResult,
  isTerminalResult,
  isNonErrorResult,

  // Event Guards
  isHookEvent,
  isHookRegisteredEvent,
  isHookUnregisteredEvent,
  isHookBeforeExecuteEvent,
  isHookAfterExecuteEvent,
  isHookErrorEvent,
  isHookTimeoutEvent,
  isWorkflowEvent,
  isWorkflowStartedEvent,
  isWorkflowCompletedEvent,
  isWorkflowFailedEvent,
  isStepEvent,
  isStepStartedEvent,
  isStepCompletedEvent,
  isStepFailedEvent,

  // Git Event Guards
  isGitEvent,
  isGitCommitEvent,
  isGitPushEvent,
  isGitPullEvent,
  isGitBranchCreateEvent,
  isGitBranchDeleteEvent,
  isGitTagCreateEvent,
  isGitTagDeleteEvent,
  isGitMergeEvent,
  isGitCheckoutEvent,

  // RDF Query Result Guards
  isRdfQueryResult,
  isAskQueryResult,
  isSelectQueryResult,
  isConstructQueryResult,
  isDescribeQueryResult,
  isUpdateQueryResult,

  // Async State Guards
  isAsyncState,
  isIdleAsyncState,
  isLoadingAsyncState,
  isSuccessAsyncState,
  isErrorAsyncState,
  isRefreshingAsyncState,
  hasData,
  isLoading,

  // Message Guards
  isMessage,
  isRequestMessage,
  isResponseMessage,
  isErrorMessage,
  isNotificationMessage,

  // Utility Guards
  isDefined,
  isNull,
  isUndefined,
  isNullish,
  isNonEmptyString,
  isNonEmptyArray,
  isPlainObject,
  isFunction,
  isPromise,
  isError,

  // Assertion Functions
  assertDefined,
  assertHookId,
  assertCommitSha,
  assertSuccess,
  assert,
  assertNever,

  // Guard Combinators
  hasType,
  and,
  or,
  not,
  isArrayOf,
  isOptional,
  isNullable,
  isRecordOf,
} from './guards.d.ts';

// ============================================================================
// Interfaces
// ============================================================================

export type {
  // Core Context
  GitVanContext,
  GitState,
  UserInfo,

  // Hook Definitions
  HookDefinition,
  HookMeta,
  WorkflowDefinition,
  RetryConfig,
  ConcurrencyConfig,

  // Execution
  ExecutionContext,
  StepExecutionResult,
  WorkflowExecutionResult,
  HookExecutionResult,
  PredicateResult,

  // Receipt
  Receipt,
  ReceiptMeta,
  ReceiptContext,
  ReceiptExecution,
  ReceiptChanges,
  FileChange,
  FileModification,
  ReceiptPerformance,
  ReceiptAudit,

  // Configuration
  GitVanConfig,
  HooksConfig,
  WorkflowsConfig,
  GitConfig,
  TemplatesConfig,
  LoggingConfig,
  PerformanceConfig,
  SecurityConfig,
  PluginsConfig,

  // Utilities
  Logger,
  JsonSchema,
  EventEmitter,
  Disposable,
  AsyncDisposable,
} from './interfaces.d.ts';
