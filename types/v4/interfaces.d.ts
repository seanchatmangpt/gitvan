/**
 * @fileoverview GitVan v4 - Interface Definitions
 *
 * This module provides updated interfaces for GitVan's v4 architecture,
 * aligned with @unrdf/hooks patterns. These interfaces extend and refine
 * the v2 interfaces with improved type safety and stricter contracts.
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
  StepStatus,
  JobStatus,
  HookPhase,
  UnixTimestamp,
  DurationMs,
  ISODateString,
  DeepReadonly,
  DeepPartial,
  Result,
  Option,
} from './base.d.ts';

import type {
  Predicate,
  Step,
  ExecSpec,
  Result as ResultUnion,
  HookEvent,
  WorkflowEvent,
  StepEvent,
  GitEvent,
  AsyncState,
} from './unions.d.ts';

// ============================================================================
// Core Context Interfaces
// ============================================================================

/**
 * GitVan execution context - v4 with strict typing
 */
export interface GitVanContext {
  /**
   * Repository root directory (absolute path)
   */
  readonly root: string;

  /**
   * Current working directory (absolute path)
   */
  readonly cwd: string;

  /**
   * Environment variables (deterministic: TZ=UTC, LANG=C)
   */
  readonly env: DeepReadonly<{
    TZ: 'UTC';
    LANG: 'C';
    [key: string]: string | undefined;
  }>;

  /**
   * Current session ID
   */
  readonly sessionId: SessionId;

  /**
   * Git repository state
   */
  readonly git: GitState;

  /**
   * User information
   */
  readonly user: UserInfo;

  /**
   * Context creation timestamp
   */
  readonly createdAt: UnixTimestamp;

  /**
   * Parent context (for nested executions)
   */
  readonly parent?: GitVanContext;
}

/**
 * Git repository state
 */
export interface GitState {
  /**
   * Current branch name
   */
  readonly branch: string;

  /**
   * Current HEAD commit SHA
   */
  readonly head: CommitSha;

  /**
   * Remote URL (if configured)
   */
  readonly remote?: string;

  /**
   * Whether working directory has uncommitted changes
   */
  readonly isDirty: boolean;

  /**
   * Commits ahead of remote
   */
  readonly ahead: number;

  /**
   * Commits behind remote
   */
  readonly behind: number;

  /**
   * Repository root directory
   */
  readonly root: string;
}

/**
 * User information
 */
export interface UserInfo {
  /**
   * Git user name
   */
  readonly name?: string;

  /**
   * Git user email
   */
  readonly email?: string;
}

// ============================================================================
// Hook Definition Interfaces
// ============================================================================

/**
 * Hook definition - v4 with reactive patterns
 */
export interface HookDefinition<TInput = unknown, TOutput = unknown> {
  /**
   * Hook metadata
   */
  readonly meta: HookMeta;

  /**
   * Predicate that triggers the hook
   */
  readonly predicate: Predicate;

  /**
   * Workflows to execute when triggered
   */
  readonly workflows: readonly WorkflowDefinition[];

  /**
   * Hook input schema (for validation)
   */
  readonly inputSchema?: JsonSchema;

  /**
   * Hook output schema (for validation)
   */
  readonly outputSchema?: JsonSchema;
}

/**
 * Hook metadata - v4 with enhanced properties
 */
export interface HookMeta {
  /**
   * Unique hook identifier
   */
  readonly id: HookId;

  /**
   * Human-readable title
   */
  readonly title: string;

  /**
   * Detailed description
   */
  readonly description?: string;

  /**
   * Hook version (semver)
   */
  readonly version?: string;

  /**
   * Author information
   */
  readonly author?: string;

  /**
   * Tags for categorization
   */
  readonly tags?: readonly string[];

  /**
   * Hook priority (affects execution order)
   */
  readonly priority?: Priority;

  /**
   * Whether hook is enabled
   */
  readonly enabled?: boolean;

  /**
   * Creation timestamp
   */
  readonly createdAt?: UnixTimestamp;

  /**
   * Last update timestamp
   */
  readonly updatedAt?: UnixTimestamp;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  /**
   * Workflow identifier
   */
  readonly id: WorkflowId;

  /**
   * Workflow title
   */
  readonly title?: string;

  /**
   * Workflow description
   */
  readonly description?: string;

  /**
   * Steps to execute
   */
  readonly steps: readonly Step[];

  /**
   * Workflow timeout
   */
  readonly timeout?: DurationMs;

  /**
   * Retry configuration
   */
  readonly retry?: RetryConfig;

  /**
   * Concurrency settings
   */
  readonly concurrency?: ConcurrencyConfig;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /**
   * Maximum retry attempts
   */
  readonly maxAttempts: number;

  /**
   * Delay between retries
   */
  readonly delay: DurationMs;

  /**
   * Backoff factor (multiplier for delay)
   */
  readonly backoffFactor?: number;

  /**
   * Maximum delay cap
   */
  readonly maxDelay?: DurationMs;

  /**
   * Retryable error codes
   */
  readonly retryOn?: readonly string[];
}

/**
 * Concurrency configuration
 */
export interface ConcurrencyConfig {
  /**
   * Maximum concurrent executions
   */
  readonly max: number;

  /**
   * Concurrency group (hooks in same group share limit)
   */
  readonly group?: string;

  /**
   * Queue behavior when limit reached
   */
  readonly onLimit: 'queue' | 'drop' | 'error';
}

// ============================================================================
// Execution Interfaces
// ============================================================================

/**
 * Execution context for running hooks
 */
export interface ExecutionContext<TInput = unknown, TOutput = unknown> {
  /**
   * Execution identifier
   */
  readonly executionId: ExecutionId;

  /**
   * Hook being executed
   */
  readonly hookId: HookId;

  /**
   * Workflow being executed
   */
  readonly workflowId: WorkflowId;

  /**
   * Input data
   */
  readonly input: DeepReadonly<TInput>;

  /**
   * Accumulated output
   */
  output: TOutput;

  /**
   * Execution state (shared between steps)
   */
  readonly state: Map<string, unknown>;

  /**
   * Execution metadata
   */
  readonly meta: DeepReadonly<Record<string, Json>>;

  /**
   * Start timestamp
   */
  readonly startedAt: UnixTimestamp;

  /**
   * GitVan context
   */
  readonly context: GitVanContext;

  /**
   * Logger for this execution
   */
  readonly logger: Logger;

  /**
   * Abort signal for cancellation
   */
  readonly signal: AbortSignal;
}

/**
 * Step execution result
 */
export interface StepExecutionResult<T = unknown> {
  /**
   * Step identifier
   */
  readonly stepId: StepId;

  /**
   * Execution status
   */
  readonly status: StepStatus;

  /**
   * Step output data
   */
  readonly data?: T;

  /**
   * Error if failed
   */
  readonly error?: Error;

  /**
   * Start timestamp
   */
  readonly startedAt: UnixTimestamp;

  /**
   * End timestamp
   */
  readonly completedAt: UnixTimestamp;

  /**
   * Execution duration
   */
  readonly duration: DurationMs;

  /**
   * Step metadata
   */
  readonly meta?: DeepReadonly<Record<string, Json>>;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult<T = unknown> {
  /**
   * Workflow identifier
   */
  readonly workflowId: WorkflowId;

  /**
   * Execution identifier
   */
  readonly executionId: ExecutionId;

  /**
   * Overall status
   */
  readonly status: 'success' | 'failure' | 'cancelled' | 'timeout';

  /**
   * Final output
   */
  readonly output?: T;

  /**
   * Error if failed
   */
  readonly error?: Error;

  /**
   * Individual step results
   */
  readonly stepResults: readonly StepExecutionResult[];

  /**
   * Start timestamp
   */
  readonly startedAt: UnixTimestamp;

  /**
   * End timestamp
   */
  readonly completedAt: UnixTimestamp;

  /**
   * Total duration
   */
  readonly duration: DurationMs;

  /**
   * Execution metadata
   */
  readonly meta?: DeepReadonly<Record<string, Json>>;
}

/**
 * Hook execution result
 */
export interface HookExecutionResult<T = unknown> {
  /**
   * Hook identifier
   */
  readonly hookId: HookId;

  /**
   * Execution identifier
   */
  readonly executionId: ExecutionId;

  /**
   * Overall status
   */
  readonly status: 'success' | 'failure' | 'cancelled' | 'timeout' | 'skipped';

  /**
   * Final output
   */
  readonly output?: T;

  /**
   * Error if failed
   */
  readonly error?: Error;

  /**
   * Predicate evaluation result
   */
  readonly predicateResult: PredicateResult;

  /**
   * Workflow execution results
   */
  readonly workflowResults: readonly WorkflowExecutionResult[];

  /**
   * Start timestamp
   */
  readonly startedAt: UnixTimestamp;

  /**
   * End timestamp
   */
  readonly completedAt: UnixTimestamp;

  /**
   * Total duration
   */
  readonly duration: DurationMs;

  /**
   * Execution metadata
   */
  readonly meta?: DeepReadonly<Record<string, Json>>;
}

/**
 * Predicate evaluation result
 */
export interface PredicateResult {
  /**
   * Whether predicate evaluated to true
   */
  readonly triggered: boolean;

  /**
   * Predicate type
   */
  readonly predicateType: string;

  /**
   * Evaluation context (variable bindings)
   */
  readonly context: DeepReadonly<Record<string, unknown>>;

  /**
   * Evaluation duration
   */
  readonly duration: DurationMs;

  /**
   * Error if evaluation failed
   */
  readonly error?: Error;
}

// ============================================================================
// Receipt Interfaces
// ============================================================================

/**
 * Receipt - v4 with enhanced audit trail
 */
export interface Receipt {
  /**
   * Receipt schema version
   */
  readonly version: '4.0';

  /**
   * Receipt identifier
   */
  readonly id: string;

  /**
   * Receipt metadata
   */
  readonly meta: ReceiptMeta;

  /**
   * Execution context snapshot
   */
  readonly context: ReceiptContext;

  /**
   * Execution information
   */
  readonly execution: ReceiptExecution;

  /**
   * File system changes
   */
  readonly changes: ReceiptChanges;

  /**
   * Performance metrics
   */
  readonly performance: ReceiptPerformance;

  /**
   * Audit information
   */
  readonly audit: ReceiptAudit;
}

/**
 * Receipt metadata
 */
export interface ReceiptMeta {
  /**
   * Creation timestamp
   */
  readonly timestamp: UnixTimestamp;

  /**
   * ISO timestamp string
   */
  readonly isoTimestamp: ISODateString;

  /**
   * GitVan version
   */
  readonly gitvanVersion: string;

  /**
   * Schema identifier
   */
  readonly schema: 'gitvan-receipt-v4';
}

/**
 * Receipt context snapshot
 */
export interface ReceiptContext {
  /**
   * Working directory
   */
  readonly cwd: string;

  /**
   * Git state at execution
   */
  readonly git: {
    readonly branch: string;
    readonly commit: CommitSha;
    readonly remote?: string;
    readonly isDirty: boolean;
    readonly root: string;
  };

  /**
   * User info
   */
  readonly user: {
    readonly name?: string;
    readonly email?: string;
  };

  /**
   * Environment snapshot
   */
  readonly env: {
    readonly nodeVersion: string;
    readonly platform: string;
    readonly arch: string;
  };

  /**
   * Session info
   */
  readonly session: {
    readonly id: SessionId;
    readonly startedAt: UnixTimestamp;
  };
}

/**
 * Receipt execution information
 */
export interface ReceiptExecution {
  /**
   * Hook execution result
   */
  readonly result: HookExecutionResult;

  /**
   * Start timestamp
   */
  readonly startedAt: UnixTimestamp;

  /**
   * End timestamp
   */
  readonly completedAt: UnixTimestamp;

  /**
   * Duration
   */
  readonly duration: DurationMs;
}

/**
 * Receipt file changes
 */
export interface ReceiptChanges {
  /**
   * Files created
   */
  readonly created: readonly FileChange[];

  /**
   * Files modified
   */
  readonly modified: readonly FileModification[];

  /**
   * Files deleted
   */
  readonly deleted: readonly FileChange[];
}

/**
 * File change record
 */
export interface FileChange {
  /**
   * File path (relative to root)
   */
  readonly path: string;

  /**
   * File size in bytes
   */
  readonly size: number;

  /**
   * Content checksum
   */
  readonly checksum?: string;

  /**
   * Change timestamp
   */
  readonly timestamp: UnixTimestamp;
}

/**
 * File modification record
 */
export interface FileModification {
  /**
   * File path (relative to root)
   */
  readonly path: string;

  /**
   * Size before modification
   */
  readonly sizeBefore: number;

  /**
   * Size after modification
   */
  readonly sizeAfter: number;

  /**
   * Checksum before modification
   */
  readonly checksumBefore?: string;

  /**
   * Checksum after modification
   */
  readonly checksumAfter?: string;

  /**
   * Change timestamp
   */
  readonly timestamp: UnixTimestamp;
}

/**
 * Receipt performance metrics
 */
export interface ReceiptPerformance {
  /**
   * Memory usage
   */
  readonly memory: {
    readonly peak: number;
    readonly average: number;
  };

  /**
   * CPU usage
   */
  readonly cpu: {
    readonly peak: number;
    readonly average: number;
  };

  /**
   * Disk I/O
   */
  readonly disk: {
    readonly bytesRead: number;
    readonly bytesWritten: number;
  };
}

/**
 * Receipt audit information
 */
export interface ReceiptAudit {
  /**
   * Receipt content hash
   */
  readonly hash: string;

  /**
   * Hash algorithm used
   */
  readonly hashAlgorithm: 'sha256' | 'sha512' | 'blake3';

  /**
   * Digital signature (optional)
   */
  readonly signature?: string;

  /**
   * Signature algorithm (if signed)
   */
  readonly signatureAlgorithm?: string;

  /**
   * Verification status
   */
  readonly verified: boolean;

  /**
   * Verification timestamp
   */
  readonly verifiedAt?: UnixTimestamp;
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * GitVan configuration - v4
 */
export interface GitVanConfig {
  /**
   * Configuration version
   */
  readonly version: '4.0';

  /**
   * Hook configuration
   */
  readonly hooks: HooksConfig;

  /**
   * Workflow configuration
   */
  readonly workflows: WorkflowsConfig;

  /**
   * Git configuration
   */
  readonly git: GitConfig;

  /**
   * Template configuration
   */
  readonly templates: TemplatesConfig;

  /**
   * Logging configuration
   */
  readonly logging: LoggingConfig;

  /**
   * Performance configuration
   */
  readonly performance: PerformanceConfig;

  /**
   * Security configuration
   */
  readonly security: SecurityConfig;

  /**
   * Plugin configuration
   */
  readonly plugins: PluginsConfig;

  /**
   * Environment-specific overrides
   */
  readonly environments?: {
    readonly development?: DeepPartial<GitVanConfig>;
    readonly testing?: DeepPartial<GitVanConfig>;
    readonly production?: DeepPartial<GitVanConfig>;
  };
}

/**
 * Hooks configuration
 */
export interface HooksConfig {
  /**
   * Hook discovery patterns (glob)
   */
  readonly patterns: readonly string[];

  /**
   * Excluded patterns
   */
  readonly exclude: readonly string[];

  /**
   * Default timeout
   */
  readonly timeout: DurationMs;

  /**
   * Default retry config
   */
  readonly retry: RetryConfig;

  /**
   * Concurrency limit
   */
  readonly concurrency: number;
}

/**
 * Workflows configuration
 */
export interface WorkflowsConfig {
  /**
   * Default step timeout
   */
  readonly stepTimeout: DurationMs;

  /**
   * Maximum parallel steps
   */
  readonly maxParallelSteps: number;

  /**
   * Enable step caching
   */
  readonly caching: boolean;

  /**
   * Cache TTL
   */
  readonly cacheTtl: DurationMs;
}

/**
 * Git configuration
 */
export interface GitConfig {
  /**
   * Track git operations
   */
  readonly trackOperations: boolean;

  /**
   * Include git hooks integration
   */
  readonly includeHooks: boolean;

  /**
   * Command timeout
   */
  readonly timeout: DurationMs;

  /**
   * Ignore patterns for git status
   */
  readonly ignore: readonly string[];
}

/**
 * Templates configuration
 */
export interface TemplatesConfig {
  /**
   * Template directory
   */
  readonly directory: string;

  /**
   * Template file extension
   */
  readonly extension: string;

  /**
   * Template engine options
   */
  readonly options: {
    readonly autoescape: boolean;
    readonly throwOnUndefined: boolean;
    readonly trimBlocks: boolean;
    readonly lstripBlocks: boolean;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /**
   * Log level
   */
  readonly level: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Log format
   */
  readonly format: 'text' | 'json' | 'pretty';

  /**
   * Log output
   */
  readonly output: 'console' | 'file' | 'both';

  /**
   * Log file path (when output includes file)
   */
  readonly file?: string;

  /**
   * Include timestamps
   */
  readonly timestamps: boolean;

  /**
   * Include colors (console only)
   */
  readonly colors: boolean;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  /**
   * Enable performance tracking
   */
  readonly enabled: boolean;

  /**
   * Memory sampling interval
   */
  readonly memorySampleInterval: DurationMs;

  /**
   * CPU sampling interval
   */
  readonly cpuSampleInterval: DurationMs;

  /**
   * Track disk I/O
   */
  readonly trackDiskIO: boolean;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /**
   * Enable receipt signing
   */
  readonly signing: boolean;

  /**
   * Private key path
   */
  readonly privateKeyPath?: string;

  /**
   * Public key path
   */
  readonly publicKeyPath?: string;

  /**
   * Hash algorithm
   */
  readonly hashAlgorithm: 'sha256' | 'sha512' | 'blake3';
}

/**
 * Plugins configuration
 */
export interface PluginsConfig {
  /**
   * Plugin directory
   */
  readonly directory: string;

  /**
   * Auto-load plugins
   */
  readonly autoload: boolean;

  /**
   * Enabled plugins
   */
  readonly enabled: readonly string[];

  /**
   * Plugin-specific config
   */
  readonly config: Record<string, Json>;
}

// ============================================================================
// Utility Interfaces
// ============================================================================

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * JSON Schema (simplified)
 */
export interface JsonSchema {
  readonly type?: string;
  readonly properties?: Record<string, JsonSchema>;
  readonly required?: readonly string[];
  readonly items?: JsonSchema;
  readonly additionalProperties?: boolean | JsonSchema;
  readonly $ref?: string;
  readonly [key: string]: unknown;
}

/**
 * Event emitter interface
 */
export interface EventEmitter<TEvents extends Record<string, unknown>> {
  on<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): () => void;
  off<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): void;
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;
  once<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): () => void;
}

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  dispose(): void | Promise<void>;
}

/**
 * Async disposable interface
 */
export interface AsyncDisposable {
  [Symbol.asyncDispose](): Promise<void>;
}
