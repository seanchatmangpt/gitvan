/**
 * @fileoverview GitVan v4 - Type Guard Definitions
 *
 * This module provides comprehensive type guards for runtime type safety
 * in GitVan's hook system. Implements proper TypeScript type narrowing
 * for all discriminated unions and branded types.
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
  UnixTimestamp,
  ISODateString,
  DurationMs,
  Json,
  Result as BaseResult,
  Option,
  Ok,
  Err,
  Some,
  None,
  Priority,
  ExecType,
  StepStatus,
  JobStatus,
  HookPhase,
} from './base.d.ts';

import type {
  ExecSpec,
  CliExecSpec,
  JsExecSpec,
  LlmExecSpec,
  JobExecSpec,
  TmplExecSpec,
  SparqlExecSpec,
  HttpExecSpec,
  Predicate,
  AskPredicate,
  SelectThresholdPredicate,
  ResultDeltaPredicate,
  ShaclAllConformPredicate,
  CustomPredicate,
  Step,
  TemplateStep,
  ShellStep,
  HttpStep,
  SparqlStep,
  CustomStep,
  ParallelStep,
  ConditionalStep,
  LoopStep,
  Result,
  SuccessResult,
  FailureResult,
  PendingResult,
  CancelledResult,
  TimeoutResult,
  SkippedResult,
  HookEvent,
  HookRegisteredEvent,
  HookUnregisteredEvent,
  HookBeforeExecuteEvent,
  HookAfterExecuteEvent,
  HookErrorEvent,
  HookTimeoutEvent,
  WorkflowEvent,
  WorkflowStartedEvent,
  WorkflowCompletedEvent,
  WorkflowFailedEvent,
  StepEvent,
  StepStartedEvent,
  StepCompletedEvent,
  StepFailedEvent,
  GitEvent,
  GitCommitEvent,
  GitPushEvent,
  GitPullEvent,
  GitBranchCreateEvent,
  GitBranchDeleteEvent,
  GitTagCreateEvent,
  GitTagDeleteEvent,
  GitMergeEvent,
  GitCheckoutEvent,
  RdfQueryResult,
  AskQueryResult,
  SelectQueryResult,
  ConstructQueryResult,
  DescribeQueryResult,
  UpdateQueryResult,
  AsyncState,
  IdleAsyncState,
  LoadingAsyncState,
  SuccessAsyncState,
  ErrorAsyncState,
  RefreshingAsyncState,
  Message,
  RequestMessage,
  ResponseMessage,
  ErrorMessage,
  NotificationMessage,
} from './unions.d.ts';

// ============================================================================
// Branded Type Guards
// ============================================================================

/**
 * Check if value is a valid HookId
 */
export function isHookId(value: unknown): value is HookId;

/**
 * Check if value is a valid WorkflowId
 */
export function isWorkflowId(value: unknown): value is WorkflowId;

/**
 * Check if value is a valid StepId
 */
export function isStepId(value: unknown): value is StepId;

/**
 * Check if value is a valid ExecutionId
 */
export function isExecutionId(value: unknown): value is ExecutionId;

/**
 * Check if value is a valid SessionId
 */
export function isSessionId(value: unknown): value is SessionId;

/**
 * Check if value is a valid CommitSha (40 hex characters)
 */
export function isCommitSha(value: unknown): value is CommitSha;

/**
 * Check if value is a valid RefName
 */
export function isRefName(value: unknown): value is RefName;

/**
 * Check if value is a valid UnixTimestamp
 */
export function isUnixTimestamp(value: unknown): value is UnixTimestamp;

/**
 * Check if value is a valid ISODateString
 */
export function isISODateString(value: unknown): value is ISODateString;

/**
 * Check if value is a valid DurationMs
 */
export function isDurationMs(value: unknown): value is DurationMs;

// ============================================================================
// Primitive Type Guards
// ============================================================================

/**
 * Check if value is valid JSON
 */
export function isJson(value: unknown): value is Json;

/**
 * Check if value is a valid Priority
 */
export function isPriority(value: unknown): value is Priority;

/**
 * Check if value is a valid ExecType
 */
export function isExecType(value: unknown): value is ExecType;

/**
 * Check if value is a valid StepStatus
 */
export function isStepStatus(value: unknown): value is StepStatus;

/**
 * Check if value is a valid JobStatus
 */
export function isJobStatus(value: unknown): value is JobStatus;

/**
 * Check if value is a valid HookPhase
 */
export function isHookPhase(value: unknown): value is HookPhase;

// ============================================================================
// Result Type Guards
// ============================================================================

/**
 * Check if result is Ok
 */
export function isOk<T, E>(result: BaseResult<T, E>): result is Ok<T>;

/**
 * Check if result is Err
 */
export function isErr<T, E>(result: BaseResult<T, E>): result is Err<E>;

/**
 * Check if option is Some
 */
export function isSome<T>(option: Option<T>): option is Some<T>;

/**
 * Check if option is None
 */
export function isNone<T>(option: Option<T>): option is None;

// ============================================================================
// Execution Spec Type Guards
// ============================================================================

/**
 * Check if value is an ExecSpec
 */
export function isExecSpec(value: unknown): value is ExecSpec;

/**
 * Check if ExecSpec is CLI type
 */
export function isCliExecSpec(spec: ExecSpec): spec is CliExecSpec;

/**
 * Check if ExecSpec is JS type
 */
export function isJsExecSpec(spec: ExecSpec): spec is JsExecSpec;

/**
 * Check if ExecSpec is LLM type
 */
export function isLlmExecSpec(spec: ExecSpec): spec is LlmExecSpec;

/**
 * Check if ExecSpec is Job type
 */
export function isJobExecSpec(spec: ExecSpec): spec is JobExecSpec;

/**
 * Check if ExecSpec is Template type
 */
export function isTmplExecSpec(spec: ExecSpec): spec is TmplExecSpec;

/**
 * Check if ExecSpec is SPARQL type
 */
export function isSparqlExecSpec(spec: ExecSpec): spec is SparqlExecSpec;

/**
 * Check if ExecSpec is HTTP type
 */
export function isHttpExecSpec(spec: ExecSpec): spec is HttpExecSpec;

// ============================================================================
// Predicate Type Guards
// ============================================================================

/**
 * Check if value is a Predicate
 */
export function isPredicate(value: unknown): value is Predicate;

/**
 * Check if Predicate is ASK type
 */
export function isAskPredicate(predicate: Predicate): predicate is AskPredicate;

/**
 * Check if Predicate is SelectThreshold type
 */
export function isSelectThresholdPredicate(
  predicate: Predicate
): predicate is SelectThresholdPredicate;

/**
 * Check if Predicate is ResultDelta type
 */
export function isResultDeltaPredicate(
  predicate: Predicate
): predicate is ResultDeltaPredicate;

/**
 * Check if Predicate is ShaclAllConform type
 */
export function isShaclAllConformPredicate(
  predicate: Predicate
): predicate is ShaclAllConformPredicate;

/**
 * Check if Predicate is Custom type
 */
export function isCustomPredicate(predicate: Predicate): predicate is CustomPredicate;

// ============================================================================
// Step Type Guards
// ============================================================================

/**
 * Check if value is a Step
 */
export function isStep(value: unknown): value is Step;

/**
 * Check if Step is Template type
 */
export function isTemplateStep(step: Step): step is TemplateStep;

/**
 * Check if Step is Shell type
 */
export function isShellStep(step: Step): step is ShellStep;

/**
 * Check if Step is HTTP type
 */
export function isHttpStep(step: Step): step is HttpStep;

/**
 * Check if Step is SPARQL type
 */
export function isSparqlStep(step: Step): step is SparqlStep;

/**
 * Check if Step is Custom type
 */
export function isCustomStep(step: Step): step is CustomStep;

/**
 * Check if Step is Parallel type
 */
export function isParallelStep(step: Step): step is ParallelStep;

/**
 * Check if Step is Conditional type
 */
export function isConditionalStep(step: Step): step is ConditionalStep;

/**
 * Check if Step is Loop type
 */
export function isLoopStep(step: Step): step is LoopStep;

// ============================================================================
// Result Discriminated Union Guards
// ============================================================================

/**
 * Check if value is a Result
 */
export function isResult(value: unknown): value is Result;

/**
 * Check if Result is Success
 */
export function isSuccessResult<T>(result: Result<T>): result is SuccessResult<T>;

/**
 * Check if Result is Failure
 */
export function isFailureResult<E>(result: Result<unknown, E>): result is FailureResult<E>;

/**
 * Check if Result is Pending
 */
export function isPendingResult(result: Result): result is PendingResult;

/**
 * Check if Result is Cancelled
 */
export function isCancelledResult(result: Result): result is CancelledResult;

/**
 * Check if Result is Timeout
 */
export function isTimeoutResult(result: Result): result is TimeoutResult;

/**
 * Check if Result is Skipped
 */
export function isSkippedResult(result: Result): result is SkippedResult;

/**
 * Check if Result represents a terminal state (not pending)
 */
export function isTerminalResult(result: Result): result is Exclude<Result, PendingResult>;

/**
 * Check if Result represents a non-error state
 */
export function isNonErrorResult(
  result: Result
): result is SuccessResult | SkippedResult | CancelledResult;

// ============================================================================
// Event Type Guards
// ============================================================================

/**
 * Check if value is a HookEvent
 */
export function isHookEvent(value: unknown): value is HookEvent;

/**
 * Check if HookEvent is Registered
 */
export function isHookRegisteredEvent(event: HookEvent): event is HookRegisteredEvent;

/**
 * Check if HookEvent is Unregistered
 */
export function isHookUnregisteredEvent(event: HookEvent): event is HookUnregisteredEvent;

/**
 * Check if HookEvent is BeforeExecute
 */
export function isHookBeforeExecuteEvent(
  event: HookEvent
): event is HookBeforeExecuteEvent;

/**
 * Check if HookEvent is AfterExecute
 */
export function isHookAfterExecuteEvent(event: HookEvent): event is HookAfterExecuteEvent;

/**
 * Check if HookEvent is Error
 */
export function isHookErrorEvent(event: HookEvent): event is HookErrorEvent;

/**
 * Check if HookEvent is Timeout
 */
export function isHookTimeoutEvent(event: HookEvent): event is HookTimeoutEvent;

/**
 * Check if value is a WorkflowEvent
 */
export function isWorkflowEvent(value: unknown): value is WorkflowEvent;

/**
 * Check if WorkflowEvent is Started
 */
export function isWorkflowStartedEvent(
  event: WorkflowEvent
): event is WorkflowStartedEvent;

/**
 * Check if WorkflowEvent is Completed
 */
export function isWorkflowCompletedEvent(
  event: WorkflowEvent
): event is WorkflowCompletedEvent;

/**
 * Check if WorkflowEvent is Failed
 */
export function isWorkflowFailedEvent(event: WorkflowEvent): event is WorkflowFailedEvent;

/**
 * Check if value is a StepEvent
 */
export function isStepEvent(value: unknown): value is StepEvent;

/**
 * Check if StepEvent is Started
 */
export function isStepStartedEvent(event: StepEvent): event is StepStartedEvent;

/**
 * Check if StepEvent is Completed
 */
export function isStepCompletedEvent(event: StepEvent): event is StepCompletedEvent;

/**
 * Check if StepEvent is Failed
 */
export function isStepFailedEvent(event: StepEvent): event is StepFailedEvent;

// ============================================================================
// Git Event Type Guards
// ============================================================================

/**
 * Check if value is a GitEvent
 */
export function isGitEvent(value: unknown): value is GitEvent;

/**
 * Check if GitEvent is Commit
 */
export function isGitCommitEvent(event: GitEvent): event is GitCommitEvent;

/**
 * Check if GitEvent is Push
 */
export function isGitPushEvent(event: GitEvent): event is GitPushEvent;

/**
 * Check if GitEvent is Pull
 */
export function isGitPullEvent(event: GitEvent): event is GitPullEvent;

/**
 * Check if GitEvent is BranchCreate
 */
export function isGitBranchCreateEvent(event: GitEvent): event is GitBranchCreateEvent;

/**
 * Check if GitEvent is BranchDelete
 */
export function isGitBranchDeleteEvent(event: GitEvent): event is GitBranchDeleteEvent;

/**
 * Check if GitEvent is TagCreate
 */
export function isGitTagCreateEvent(event: GitEvent): event is GitTagCreateEvent;

/**
 * Check if GitEvent is TagDelete
 */
export function isGitTagDeleteEvent(event: GitEvent): event is GitTagDeleteEvent;

/**
 * Check if GitEvent is Merge
 */
export function isGitMergeEvent(event: GitEvent): event is GitMergeEvent;

/**
 * Check if GitEvent is Checkout
 */
export function isGitCheckoutEvent(event: GitEvent): event is GitCheckoutEvent;

// ============================================================================
// RDF Query Result Type Guards
// ============================================================================

/**
 * Check if value is an RdfQueryResult
 */
export function isRdfQueryResult(value: unknown): value is RdfQueryResult;

/**
 * Check if RdfQueryResult is ASK
 */
export function isAskQueryResult(result: RdfQueryResult): result is AskQueryResult;

/**
 * Check if RdfQueryResult is SELECT
 */
export function isSelectQueryResult(result: RdfQueryResult): result is SelectQueryResult;

/**
 * Check if RdfQueryResult is CONSTRUCT
 */
export function isConstructQueryResult(
  result: RdfQueryResult
): result is ConstructQueryResult;

/**
 * Check if RdfQueryResult is DESCRIBE
 */
export function isDescribeQueryResult(
  result: RdfQueryResult
): result is DescribeQueryResult;

/**
 * Check if RdfQueryResult is UPDATE
 */
export function isUpdateQueryResult(result: RdfQueryResult): result is UpdateQueryResult;

// ============================================================================
// Async State Type Guards
// ============================================================================

/**
 * Check if value is an AsyncState
 */
export function isAsyncState<T, E>(value: unknown): value is AsyncState<T, E>;

/**
 * Check if AsyncState is Idle
 */
export function isIdleAsyncState<T, E>(state: AsyncState<T, E>): state is IdleAsyncState;

/**
 * Check if AsyncState is Loading
 */
export function isLoadingAsyncState<T, E>(
  state: AsyncState<T, E>
): state is LoadingAsyncState;

/**
 * Check if AsyncState is Success
 */
export function isSuccessAsyncState<T, E>(
  state: AsyncState<T, E>
): state is SuccessAsyncState<T>;

/**
 * Check if AsyncState is Error
 */
export function isErrorAsyncState<T, E>(
  state: AsyncState<T, E>
): state is ErrorAsyncState<E>;

/**
 * Check if AsyncState is Refreshing
 */
export function isRefreshingAsyncState<T, E>(
  state: AsyncState<T, E>
): state is RefreshingAsyncState<T>;

/**
 * Check if AsyncState has data (success or refreshing)
 */
export function hasData<T, E>(
  state: AsyncState<T, E>
): state is SuccessAsyncState<T> | RefreshingAsyncState<T>;

/**
 * Check if AsyncState is loading (loading or refreshing)
 */
export function isLoading<T, E>(
  state: AsyncState<T, E>
): state is LoadingAsyncState | RefreshingAsyncState<T>;

// ============================================================================
// Message Type Guards
// ============================================================================

/**
 * Check if value is a Message
 */
export function isMessage(value: unknown): value is Message;

/**
 * Check if Message is Request
 */
export function isRequestMessage<T>(message: Message<T>): message is RequestMessage<T>;

/**
 * Check if Message is Response
 */
export function isResponseMessage<T>(message: Message<T>): message is ResponseMessage<T>;

/**
 * Check if Message is Error
 */
export function isErrorMessage(message: Message): message is ErrorMessage;

/**
 * Check if Message is Notification
 */
export function isNotificationMessage<T>(
  message: Message<T>
): message is NotificationMessage<T>;

// ============================================================================
// Utility Type Guards
// ============================================================================

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T;

/**
 * Check if value is null
 */
export function isNull(value: unknown): value is null;

/**
 * Check if value is undefined
 */
export function isUndefined(value: unknown): value is undefined;

/**
 * Check if value is nullish (null or undefined)
 */
export function isNullish(value: unknown): value is null | undefined;

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string;

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]];

/**
 * Check if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown>;

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown;

/**
 * Check if value is a promise
 */
export function isPromise<T>(value: unknown): value is Promise<T>;

/**
 * Check if value is an Error
 */
export function isError(value: unknown): value is Error;

// ============================================================================
// Assertion Functions
// ============================================================================

/**
 * Assert value is defined or throw
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T;

/**
 * Assert value is a HookId or throw
 */
export function assertHookId(value: unknown, message?: string): asserts value is HookId;

/**
 * Assert value is a CommitSha or throw
 */
export function assertCommitSha(value: unknown, message?: string): asserts value is CommitSha;

/**
 * Assert value is a valid result or throw
 */
export function assertSuccess<T>(
  result: Result<T>,
  message?: string
): asserts result is SuccessResult<T>;

/**
 * Assert condition is true or throw
 */
export function assert(condition: boolean, message?: string): asserts condition;

/**
 * Exhaustiveness check - ensures all union cases are handled
 */
export function assertNever(value: never, message?: string): never;

// ============================================================================
// Type Guard Combinators
// ============================================================================

/**
 * Create a type guard that checks for a specific discriminator value
 */
export function hasType<T, K extends keyof T, V extends T[K]>(
  key: K,
  value: V
): (obj: T) => obj is Extract<T, Record<K, V>>;

/**
 * Create a type guard that checks multiple conditions
 */
export function and<T, U extends T>(
  guard1: (value: T) => value is U,
  guard2: (value: U) => boolean
): (value: T) => value is U;

/**
 * Create a type guard that checks either condition
 */
export function or<T, U, V>(
  guard1: (value: unknown) => value is U,
  guard2: (value: unknown) => value is V
): (value: unknown) => value is U | V;

/**
 * Create a type guard that negates another guard
 */
export function not<T>(
  guard: (value: unknown) => value is T
): (value: unknown) => value is Exclude<unknown, T>;

/**
 * Create a type guard for arrays of a specific type
 */
export function isArrayOf<T>(
  guard: (value: unknown) => value is T
): (value: unknown) => value is T[];

/**
 * Create a type guard for optional values
 */
export function isOptional<T>(
  guard: (value: unknown) => value is T
): (value: unknown) => value is T | undefined;

/**
 * Create a type guard for nullable values
 */
export function isNullable<T>(
  guard: (value: unknown) => value is T
): (value: unknown) => value is T | null;

/**
 * Create a type guard for record types
 */
export function isRecordOf<K extends string | number | symbol, V>(
  keyGuard: (key: unknown) => key is K,
  valueGuard: (value: unknown) => value is V
): (value: unknown) => value is Record<K, V>;
