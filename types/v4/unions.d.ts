/**
 * @fileoverview GitVan v4 - Discriminated Union Type Definitions
 *
 * This module provides comprehensive discriminated union types for GitVan's
 * type-safe runtime handling. Implements tagged unions with proper type
 * narrowing for all domain entities following @unrdf/hooks conventions.
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
  Priority,
  ExecType,
  StepStatus,
  JobStatus,
  HookPhase,
  UnixTimestamp,
  DurationMs,
  ISODateString,
  DeepReadonly,
} from './base.d.ts';

// ============================================================================
// Execution Spec Discriminated Unions
// ============================================================================

/**
 * CLI execution specification
 */
export interface CliExecSpec {
  readonly _type: 'cli';
  readonly cmd: string;
  readonly args?: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly timeoutMs?: DurationMs;
  readonly cwd?: string;
}

/**
 * JavaScript execution specification
 */
export interface JsExecSpec {
  readonly _type: 'js';
  readonly module: string;
  readonly export?: string;
  readonly input?: Json;
  readonly timeoutMs?: DurationMs;
}

/**
 * LLM execution specification
 */
export interface LlmExecSpec {
  readonly _type: 'llm';
  readonly model: string;
  readonly prompt?: string;
  readonly input?: Json;
  readonly options?: Readonly<Record<string, Json>>;
  readonly timeoutMs?: DurationMs;
}

/**
 * Job execution specification
 */
export interface JobExecSpec {
  readonly _type: 'job';
  readonly name: string;
  readonly payload?: Json;
}

/**
 * Template execution specification
 */
export interface TmplExecSpec {
  readonly _type: 'tmpl';
  readonly template: string;
  readonly data?: Json;
  readonly out?: string;
  readonly autoescape?: boolean;
  readonly paths?: readonly string[];
}

/**
 * SPARQL execution specification
 */
export interface SparqlExecSpec {
  readonly _type: 'sparql';
  readonly query: string;
  readonly endpoint?: string;
  readonly outputMapping?: Readonly<Record<string, string>>;
  readonly timeoutMs?: DurationMs;
}

/**
 * HTTP execution specification
 */
export interface HttpExecSpec {
  readonly _type: 'http';
  readonly url: string;
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string | Json;
  readonly timeoutMs?: DurationMs;
}

/**
 * All execution specifications - discriminated union
 */
export type ExecSpec =
  | CliExecSpec
  | JsExecSpec
  | LlmExecSpec
  | JobExecSpec
  | TmplExecSpec
  | SparqlExecSpec
  | HttpExecSpec;

// ============================================================================
// Predicate Discriminated Unions
// ============================================================================

/**
 * ASK predicate - returns boolean
 */
export interface AskPredicate {
  readonly _type: 'ask';
  readonly query: string;
  readonly description?: string;
}

/**
 * SELECT threshold predicate - compares count against threshold
 */
export interface SelectThresholdPredicate {
  readonly _type: 'selectThreshold';
  readonly query: string;
  readonly threshold: number;
  readonly operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  readonly description?: string;
}

/**
 * Result delta predicate - compares current vs previous results
 */
export interface ResultDeltaPredicate {
  readonly _type: 'resultDelta';
  readonly query: string;
  readonly compareBy?: 'count' | 'hash' | 'deep';
  readonly description?: string;
}

/**
 * SHACL conformance predicate - validates against shapes
 */
export interface ShaclAllConformPredicate {
  readonly _type: 'shaclAllConform';
  readonly shapesText?: string;
  readonly shapesPath?: string;
  readonly targetClass?: string;
  readonly description?: string;
}

/**
 * Custom predicate - user-defined evaluation
 */
export interface CustomPredicate {
  readonly _type: 'custom';
  readonly handler: string;
  readonly input?: Json;
  readonly description?: string;
}

/**
 * All predicate types - discriminated union
 */
export type Predicate =
  | AskPredicate
  | SelectThresholdPredicate
  | ResultDeltaPredicate
  | ShaclAllConformPredicate
  | CustomPredicate;

// ============================================================================
// Step Discriminated Unions
// ============================================================================

/**
 * Base step properties
 */
export interface BaseStep {
  readonly id: StepId;
  readonly description?: string;
  readonly dependsOn?: readonly StepId[];
  readonly condition?: string;
  readonly retry?: {
    readonly maxAttempts: number;
    readonly delay: DurationMs;
    readonly backoffFactor?: number;
  };
  readonly timeout?: DurationMs;
}

/**
 * Template step
 */
export interface TemplateStep extends BaseStep {
  readonly _type: 'template';
  readonly template: string;
  readonly filePath: string;
  readonly data?: Json;
  readonly overwrite?: boolean;
}

/**
 * Shell step
 */
export interface ShellStep extends BaseStep {
  readonly _type: 'shell';
  readonly command: string;
  readonly args?: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly cwd?: string;
  readonly shell?: string;
}

/**
 * HTTP step
 */
export interface HttpStep extends BaseStep {
  readonly _type: 'http';
  readonly url: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string | Json;
  readonly validateStatus?: readonly number[];
}

/**
 * SPARQL step
 */
export interface SparqlStep extends BaseStep {
  readonly _type: 'sparql';
  readonly query: string;
  readonly endpoint?: string;
  readonly update?: boolean;
  readonly outputMapping?: Readonly<Record<string, string>>;
}

/**
 * Custom step
 */
export interface CustomStep extends BaseStep {
  readonly _type: 'custom';
  readonly handler: string;
  readonly input?: Json;
}

/**
 * Parallel step - runs child steps in parallel
 */
export interface ParallelStep extends BaseStep {
  readonly _type: 'parallel';
  readonly steps: readonly Step[];
  readonly maxConcurrency?: number;
  readonly failFast?: boolean;
}

/**
 * Conditional step - branching based on condition
 */
export interface ConditionalStep extends BaseStep {
  readonly _type: 'conditional';
  readonly condition: string;
  readonly then: Step;
  readonly else?: Step;
}

/**
 * Loop step - iterates over items
 */
export interface LoopStep extends BaseStep {
  readonly _type: 'loop';
  readonly items: string | readonly unknown[];
  readonly step: Step;
  readonly itemVar?: string;
  readonly indexVar?: string;
  readonly maxIterations?: number;
}

/**
 * All step types - discriminated union
 */
export type Step =
  | TemplateStep
  | ShellStep
  | HttpStep
  | SparqlStep
  | CustomStep
  | ParallelStep
  | ConditionalStep
  | LoopStep;

// ============================================================================
// Result Discriminated Unions
// ============================================================================

/**
 * Success result
 */
export interface SuccessResult<T = unknown> {
  readonly _tag: 'success';
  readonly value: T;
  readonly duration: DurationMs;
  readonly meta?: Readonly<Record<string, Json>>;
}

/**
 * Failure result
 */
export interface FailureResult<E = Error> {
  readonly _tag: 'failure';
  readonly error: E;
  readonly code?: string;
  readonly duration: DurationMs;
  readonly meta?: Readonly<Record<string, Json>>;
}

/**
 * Pending result
 */
export interface PendingResult {
  readonly _tag: 'pending';
  readonly startedAt: UnixTimestamp;
}

/**
 * Cancelled result
 */
export interface CancelledResult {
  readonly _tag: 'cancelled';
  readonly reason?: string;
  readonly cancelledAt: UnixTimestamp;
}

/**
 * Timeout result
 */
export interface TimeoutResult {
  readonly _tag: 'timeout';
  readonly timeout: DurationMs;
  readonly elapsed: DurationMs;
}

/**
 * Skipped result
 */
export interface SkippedResult {
  readonly _tag: 'skipped';
  readonly reason: string;
}

/**
 * All result types - discriminated union
 */
export type Result<T = unknown, E = Error> =
  | SuccessResult<T>
  | FailureResult<E>
  | PendingResult
  | CancelledResult
  | TimeoutResult
  | SkippedResult;

// ============================================================================
// Event Discriminated Unions
// ============================================================================

/**
 * Hook registered event
 */
export interface HookRegisteredEvent {
  readonly _type: 'hook:registered';
  readonly hookId: HookId;
  readonly name: string;
  readonly timestamp: UnixTimestamp;
}

/**
 * Hook unregistered event
 */
export interface HookUnregisteredEvent {
  readonly _type: 'hook:unregistered';
  readonly hookId: HookId;
  readonly timestamp: UnixTimestamp;
}

/**
 * Hook before execute event
 */
export interface HookBeforeExecuteEvent {
  readonly _type: 'hook:beforeExecute';
  readonly hookId: HookId;
  readonly executionId: ExecutionId;
  readonly input: unknown;
  readonly timestamp: UnixTimestamp;
}

/**
 * Hook after execute event
 */
export interface HookAfterExecuteEvent {
  readonly _type: 'hook:afterExecute';
  readonly hookId: HookId;
  readonly executionId: ExecutionId;
  readonly output: unknown;
  readonly duration: DurationMs;
  readonly timestamp: UnixTimestamp;
}

/**
 * Hook error event
 */
export interface HookErrorEvent {
  readonly _type: 'hook:error';
  readonly hookId: HookId;
  readonly executionId: ExecutionId;
  readonly error: Error;
  readonly timestamp: UnixTimestamp;
}

/**
 * Hook timeout event
 */
export interface HookTimeoutEvent {
  readonly _type: 'hook:timeout';
  readonly hookId: HookId;
  readonly executionId: ExecutionId;
  readonly timeout: DurationMs;
  readonly timestamp: UnixTimestamp;
}

/**
 * Workflow started event
 */
export interface WorkflowStartedEvent {
  readonly _type: 'workflow:started';
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly timestamp: UnixTimestamp;
}

/**
 * Workflow completed event
 */
export interface WorkflowCompletedEvent {
  readonly _type: 'workflow:completed';
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly duration: DurationMs;
  readonly stepsCompleted: number;
  readonly timestamp: UnixTimestamp;
}

/**
 * Workflow failed event
 */
export interface WorkflowFailedEvent {
  readonly _type: 'workflow:failed';
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly error: Error;
  readonly failedStep: StepId;
  readonly timestamp: UnixTimestamp;
}

/**
 * Step started event
 */
export interface StepStartedEvent {
  readonly _type: 'step:started';
  readonly stepId: StepId;
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly timestamp: UnixTimestamp;
}

/**
 * Step completed event
 */
export interface StepCompletedEvent {
  readonly _type: 'step:completed';
  readonly stepId: StepId;
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly duration: DurationMs;
  readonly output: unknown;
  readonly timestamp: UnixTimestamp;
}

/**
 * Step failed event
 */
export interface StepFailedEvent {
  readonly _type: 'step:failed';
  readonly stepId: StepId;
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly error: Error;
  readonly timestamp: UnixTimestamp;
}

/**
 * All hook events - discriminated union
 */
export type HookEvent =
  | HookRegisteredEvent
  | HookUnregisteredEvent
  | HookBeforeExecuteEvent
  | HookAfterExecuteEvent
  | HookErrorEvent
  | HookTimeoutEvent;

/**
 * All workflow events - discriminated union
 */
export type WorkflowEvent =
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | WorkflowFailedEvent;

/**
 * All step events - discriminated union
 */
export type StepEvent =
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent;

/**
 * All system events - discriminated union
 */
export type SystemEvent = HookEvent | WorkflowEvent | StepEvent;

// ============================================================================
// Git Event Discriminated Unions
// ============================================================================

/**
 * Git commit event
 */
export interface GitCommitEvent {
  readonly _type: 'git:commit';
  readonly sha: CommitSha;
  readonly message: string;
  readonly author: string;
  readonly branch: string;
  readonly timestamp: UnixTimestamp;
}

/**
 * Git push event
 */
export interface GitPushEvent {
  readonly _type: 'git:push';
  readonly ref: RefName;
  readonly remote: string;
  readonly commits: readonly CommitSha[];
  readonly forced: boolean;
  readonly timestamp: UnixTimestamp;
}

/**
 * Git pull event
 */
export interface GitPullEvent {
  readonly _type: 'git:pull';
  readonly ref: RefName;
  readonly remote: string;
  readonly beforeSha: CommitSha;
  readonly afterSha: CommitSha;
  readonly timestamp: UnixTimestamp;
}

/**
 * Git branch create event
 */
export interface GitBranchCreateEvent {
  readonly _type: 'git:branch:create';
  readonly branch: string;
  readonly fromRef: string;
  readonly timestamp: UnixTimestamp;
}

/**
 * Git branch delete event
 */
export interface GitBranchDeleteEvent {
  readonly _type: 'git:branch:delete';
  readonly branch: string;
  readonly lastSha: CommitSha;
  readonly timestamp: UnixTimestamp;
}

/**
 * Git tag create event
 */
export interface GitTagCreateEvent {
  readonly _type: 'git:tag:create';
  readonly tag: string;
  readonly sha: CommitSha;
  readonly message?: string;
  readonly timestamp: UnixTimestamp;
}

/**
 * Git tag delete event
 */
export interface GitTagDeleteEvent {
  readonly _type: 'git:tag:delete';
  readonly tag: string;
  readonly timestamp: UnixTimestamp;
}

/**
 * Git merge event
 */
export interface GitMergeEvent {
  readonly _type: 'git:merge';
  readonly source: string;
  readonly target: string;
  readonly sha: CommitSha;
  readonly timestamp: UnixTimestamp;
}

/**
 * Git checkout event
 */
export interface GitCheckoutEvent {
  readonly _type: 'git:checkout';
  readonly from: string;
  readonly to: string;
  readonly timestamp: UnixTimestamp;
}

/**
 * All git events - discriminated union
 */
export type GitEvent =
  | GitCommitEvent
  | GitPushEvent
  | GitPullEvent
  | GitBranchCreateEvent
  | GitBranchDeleteEvent
  | GitTagCreateEvent
  | GitTagDeleteEvent
  | GitMergeEvent
  | GitCheckoutEvent;

// ============================================================================
// RDF Query Result Discriminated Unions
// ============================================================================

/**
 * ASK query result
 */
export interface AskQueryResult {
  readonly _type: 'ask';
  readonly boolean: boolean;
}

/**
 * SELECT query result
 */
export interface SelectQueryResult {
  readonly _type: 'select';
  readonly variables: readonly string[];
  readonly results: readonly Readonly<Record<string, TermValue | null>>[];
}

/**
 * CONSTRUCT query result
 */
export interface ConstructQueryResult {
  readonly _type: 'construct';
  readonly quads: readonly Quad[];
  readonly store: unknown;
}

/**
 * DESCRIBE query result
 */
export interface DescribeQueryResult {
  readonly _type: 'describe';
  readonly quads: readonly Quad[];
  readonly store: unknown;
}

/**
 * UPDATE query result
 */
export interface UpdateQueryResult {
  readonly _type: 'update';
  readonly ok: true;
}

/**
 * All RDF query results - discriminated union
 */
export type RdfQueryResult =
  | AskQueryResult
  | SelectQueryResult
  | ConstructQueryResult
  | DescribeQueryResult
  | UpdateQueryResult;

/**
 * RDF term value
 */
export interface TermValue {
  readonly termType: 'NamedNode' | 'BlankNode' | 'Literal' | 'DefaultGraph';
  readonly value: string;
  readonly language?: string;
  readonly datatype?: string;
}

/**
 * RDF quad
 */
export interface Quad {
  readonly subject: TermValue;
  readonly predicate: TermValue;
  readonly object: TermValue;
  readonly graph: TermValue;
}

// ============================================================================
// Async State Discriminated Unions
// ============================================================================

/**
 * Idle async state
 */
export interface IdleAsyncState {
  readonly _status: 'idle';
}

/**
 * Loading async state
 */
export interface LoadingAsyncState {
  readonly _status: 'loading';
  readonly startedAt: UnixTimestamp;
}

/**
 * Success async state
 */
export interface SuccessAsyncState<T> {
  readonly _status: 'success';
  readonly data: T;
  readonly loadedAt: UnixTimestamp;
}

/**
 * Error async state
 */
export interface ErrorAsyncState<E = Error> {
  readonly _status: 'error';
  readonly error: E;
  readonly failedAt: UnixTimestamp;
}

/**
 * Refreshing async state (has stale data, loading new)
 */
export interface RefreshingAsyncState<T> {
  readonly _status: 'refreshing';
  readonly staleData: T;
  readonly startedAt: UnixTimestamp;
}

/**
 * All async states - discriminated union
 */
export type AsyncState<T, E = Error> =
  | IdleAsyncState
  | LoadingAsyncState
  | SuccessAsyncState<T>
  | ErrorAsyncState<E>
  | RefreshingAsyncState<T>;

// ============================================================================
// Config Discriminated Unions
// ============================================================================

/**
 * Development config
 */
export interface DevelopmentConfig {
  readonly _env: 'development';
  readonly debug: true;
  readonly sourceMaps: true;
  readonly hotReload: boolean;
  readonly verbose: boolean;
}

/**
 * Testing config
 */
export interface TestingConfig {
  readonly _env: 'testing';
  readonly debug: boolean;
  readonly mockExternal: boolean;
  readonly coverage: boolean;
  readonly isolate: boolean;
}

/**
 * Production config
 */
export interface ProductionConfig {
  readonly _env: 'production';
  readonly debug: false;
  readonly minify: true;
  readonly caching: boolean;
  readonly monitoring: boolean;
}

/**
 * All environment configs - discriminated union
 */
export type EnvConfig = DevelopmentConfig | TestingConfig | ProductionConfig;

// ============================================================================
// Message Discriminated Unions (for IPC/events)
// ============================================================================

/**
 * Request message
 */
export interface RequestMessage<T = unknown> {
  readonly _kind: 'request';
  readonly id: string;
  readonly method: string;
  readonly params: T;
  readonly timestamp: UnixTimestamp;
}

/**
 * Response message (success)
 */
export interface ResponseMessage<T = unknown> {
  readonly _kind: 'response';
  readonly id: string;
  readonly result: T;
  readonly timestamp: UnixTimestamp;
}

/**
 * Error message
 */
export interface ErrorMessage {
  readonly _kind: 'error';
  readonly id: string;
  readonly error: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
  readonly timestamp: UnixTimestamp;
}

/**
 * Notification message (no response expected)
 */
export interface NotificationMessage<T = unknown> {
  readonly _kind: 'notification';
  readonly method: string;
  readonly params: T;
  readonly timestamp: UnixTimestamp;
}

/**
 * All messages - discriminated union
 */
export type Message<T = unknown> =
  | RequestMessage<T>
  | ResponseMessage<T>
  | ErrorMessage
  | NotificationMessage<T>;

// ============================================================================
// Union Helper Types
// ============================================================================

/**
 * Extract discriminator type from union
 */
export type DiscriminatorOf<T, K extends keyof T> = T extends { [P in K]: infer V } ? V : never;

/**
 * Extract union member by discriminator value
 */
export type ExtractByType<T, V> = T extends { _type: V } ? T : never;

/**
 * Extract union member by tag value
 */
export type ExtractByTag<T, V> = T extends { _tag: V } ? T : never;

/**
 * Extract union member by status value
 */
export type ExtractByStatus<T, V> = T extends { _status: V } ? T : never;

/**
 * Extract union member by kind value
 */
export type ExtractByKind<T, V> = T extends { _kind: V } ? T : never;

/**
 * Get all discriminator values from union
 */
export type DiscriminatorValues<T, K extends string> = T extends Record<K, infer V>
  ? V
  : never;
