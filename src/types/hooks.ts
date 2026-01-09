/**
 * @fileoverview GitVan v3.0.0 — Hooks Type Definitions
 *
 * Comprehensive TypeScript type definitions for the hooks integration system.
 * Provides type safety for Git hooks, RDF-based hooks, Bree job scheduling,
 * and the bridge components that connect them.
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

// ============================================================================
// Git Hook Types
// ============================================================================

/**
 * Standard Git hook types supported by the system
 *
 * @description Git provides various lifecycle hooks that can be used to trigger
 * custom actions at different stages of Git operations. These hooks are divided
 * into client-side and server-side hooks.
 *
 * @example
 * ```typescript
 * const hookType: GitHook = 'pre-commit';
 * ```
 */
export type GitHook =
  // Client-side hooks - Run on local operations
  | "pre-commit" // Before commit is created
  | "prepare-commit-msg" // Before commit message editor is fired up
  | "commit-msg" // After commit message is entered
  | "post-commit" // After commit is created
  | "pre-push" // Before refs are pushed to remote
  | "post-push" // After refs are pushed to remote (custom)
  | "post-checkout" // After checkout operation
  | "post-merge" // After merge operation
  | "post-rewrite" // After commits are rewritten
  // Server-side hooks - Run on remote operations
  | "pre-receive" // Before refs are updated on remote
  | "update" // Before individual ref is updated
  | "post-receive" // After refs are updated on remote
  | "post-update"; // After all refs are updated

/**
 * Git event data captured during hook execution
 *
 * @description Each Git hook type has different data available. This type
 * provides a comprehensive structure that accommodates all hook types.
 *
 * @example
 * ```typescript
 * const eventData: GitEventData = {
 *   hookType: 'pre-commit',
 *   timestamp: new Date().toISOString(),
 *   exitCode: 0,
 *   branchName: 'main',
 *   stagedFiles: ['src/index.ts']
 * };
 * ```
 */
export interface GitEventData {
  /** Git hook type that triggered this event */
  hookType: GitHook;

  /** ISO 8601 timestamp when event occurred */
  timestamp: string;

  /** Process exit code (0 = success, non-zero = failure) */
  exitCode?: number;

  /** Event duration in milliseconds */
  duration?: number;

  // Commit-related data
  /** Git commit hash (SHA-1) */
  commitHash?: string;

  /** Full commit message */
  commitMessage?: string;

  /** List of files staged for commit */
  stagedFiles?: string[];

  /** Number of files changed in commit */
  filesChanged?: number;

  /** Number of lines added */
  linesAdded?: number;

  /** Number of lines deleted */
  linesDeleted?: number;

  // Branch-related data
  /** Current branch name */
  branchName?: string;

  /** Previous branch name (for checkout) */
  previousBranch?: string;

  // Remote/push-related data
  /** Remote repository name (e.g., 'origin') */
  remoteName?: string;

  /** List of refs being pushed */
  pushedRefs?: string[];

  /** List of refs being updated */
  updatedRefs?: string[];

  // Rewrite-related data
  /** Type of rewrite operation (rebase, amend, filter-branch) */
  rewriteType?: "rebase" | "amend" | "filter-branch" | "unknown";

  // Error data
  /** Error object if hook failed */
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
  };

  // Environment and diagnostic data
  /** Captured environment variables */
  environmentVars?: Record<string, string>;

  /** Additional diagnostic data */
  diagnosticData?: Record<string, unknown>;

  /** Retention policy for event data */
  retentionPolicy?: "detail" | "aggregate";
}

/**
 * Event metadata extracted from Git operations
 *
 * @description Metadata provides contextual information about the Git event
 * beyond the raw event data. Used for filtering, querying, and analysis.
 */
export interface EventMetadata {
  /** Unique event identifier */
  eventId: string;

  /** Event URI in RDF store */
  eventUri: string;

  /** Git hook type */
  eventType: GitHook;

  /** Event timestamp */
  timestamp: string;

  /** Event generation timestamp */
  generatedAt?: Date;

  /** Event source (e.g., 'husky', 'git-native') */
  source?: string;

  /** Event severity level */
  severity?: "info" | "warning" | "error";

  /** Event tags for categorization */
  tags?: string[];
}

// ============================================================================
// Hook Definition Types
// ============================================================================

/**
 * Hook predicate function type
 *
 * @description Predicates determine whether a hook should be triggered based
 * on the current state of the knowledge graph. They receive the RDF store
 * and optional previous state for comparison.
 *
 * @param graph - Current RDF knowledge graph
 * @param previousGraph - Previous graph state (for change detection)
 * @param context - Additional context data
 * @returns Promise resolving to boolean (true = trigger hook)
 *
 * @example
 * ```typescript
 * const predicate: HookPredicate = async (graph, previousGraph) => {
 *   const hasNewCommit = graph.countQuads(null, 'rdf:type', 'git:Commit') >
 *     previousGraph.countQuads(null, 'rdf:type', 'git:Commit');
 *   return hasNewCommit;
 * };
 * ```
 */
export type HookPredicate = (
  graph: unknown, // RDF Store type
  previousGraph?: unknown,
  context?: Record<string, unknown>
) => Promise<boolean> | boolean;

/**
 * Hook handler function type
 *
 * @description Handlers execute when a hook is triggered. They receive
 * execution context and can perform any necessary actions.
 *
 * @param context - Execution context with event data and utilities
 * @returns Promise resolving to execution result
 *
 * @example
 * ```typescript
 * const handler: HookHandler = async (context) => {
 *   console.log(`Hook triggered: ${context.hookId}`);
 *   return { success: true, output: 'Hook executed' };
 * };
 * ```
 */
export type HookHandler = (
  context: ExecutionContext
) => Promise<HookExecutionResult> | HookExecutionResult;

/**
 * Hook definition structure
 *
 * @description Defines a complete hook including its identity, predicate,
 * handler, and configuration for job scheduling.
 *
 * @example
 * ```typescript
 * const hookDef: HookDefinition = {
 *   id: 'pre-commit-linter',
 *   name: 'Run linter on pre-commit',
 *   description: 'Validates code style before commit',
 *   predicate: async (graph) => true,
 *   handler: async (ctx) => ({ success: true }),
 *   breeConfig: {
 *     jobName: 'lint-job',
 *     schedule: 'immediate'
 *   }
 * };
 * ```
 */
export interface HookDefinition {
  /** Unique hook identifier */
  id: string;

  /** Human-readable hook name */
  name: string;

  /** Hook description */
  description?: string;

  /** Predicate function to determine if hook should trigger */
  predicate?: HookPredicate;

  /** Handler function to execute when hook triggers */
  handler?: HookHandler;

  /** Git hook type this definition applies to */
  gitHookType?: GitHook;

  /** Bree job scheduler configuration */
  breeConfig?: BreeJobConfig;

  /** Hook metadata */
  meta?: {
    /** Hook version */
    version?: string;

    /** Hook author */
    author?: string;

    /** Hook tags for categorization */
    tags?: string[];

    /** Hook priority (0-10, higher = more important) */
    priority?: number;

    /** Hook enabled state */
    enabled?: boolean;
  };

  /** Hook creation timestamp */
  createdAt?: string;

  /** Hook last update timestamp */
  updatedAt?: string;
}

// ============================================================================
// Bree Job Configuration Types
// ============================================================================

/**
 * Schedule type for Bree jobs
 *
 * @description Determines when and how a job should be executed
 */
export type BreeScheduleType = "immediate" | "cron" | "interval" | "date";

/**
 * Bree job configuration
 *
 * @description Configuration for scheduling jobs with Bree. Supports various
 * scheduling strategies including immediate execution, cron schedules,
 * interval-based execution, and one-time execution at a specific date.
 *
 * @see https://github.com/breejs/bree
 *
 * @example
 * ```typescript
 * // Immediate execution
 * const config: BreeJobConfig = {
 *   jobName: 'my-job',
 *   schedule: 'immediate'
 * };
 *
 * // Cron schedule (every 5 minutes)
 * const cronConfig: BreeJobConfig = {
 *   jobName: 'periodic-job',
 *   schedule: 'cron',
 *   cron: '* /5 * * * *'
 * };
 *
 * // Interval (every 30 seconds)
 * const intervalConfig: BreeJobConfig = {
 *   jobName: 'polling-job',
 *   schedule: 'interval',
 *   interval: '30s'
 * };
 * ```
 */
export interface BreeJobConfig {
  /** Job name (must match filename in jobs directory) */
  jobName: string;

  /** Path to job file (optional, defaults to jobs/{jobName}.mjs) */
  path?: string;

  /** Schedule type */
  schedule: BreeScheduleType;

  /** Cron expression (required if schedule = 'cron') */
  cron?: string;

  /**
   * Interval (required if schedule = 'interval')
   * @example '30s', '5m', '1h'
   */
  interval?: string | number;

  /**
   * Specific date/time to run (required if schedule = 'date')
   * @example new Date('2024-12-31T23:59:59Z')
   */
  date?: Date | string;

  /** Job timeout in milliseconds */
  timeout?: number;

  /** Maximum number of retries on failure */
  maxRetries?: number;

  /** Whether to close worker after job completes */
  closeWorkerAfterMs?: number;

  /** Worker thread options */
  worker?: {
    /** Worker data passed to job */
    workerData?: Record<string, unknown>;
  };

  /** Whether job is enabled */
  enabled?: boolean;
}

// ============================================================================
// Execution Context Types
// ============================================================================

/**
 * Execution context provided to hook handlers
 *
 * @description Contains all necessary data and utilities for hook execution
 * including event data, repository information, and helper functions.
 *
 * @example
 * ```typescript
 * const handler: HookHandler = async (context) => {
 *   const { hookId, eventData, git, logger } = context;
 *   logger.info(`Executing hook: ${hookId}`);
 *
 *   const branch = await git.getCurrentBranch();
 *   logger.info(`Current branch: ${branch}`);
 *
 *   return { success: true };
 * };
 * ```
 */
export interface ExecutionContext {
  /** Hook identifier */
  hookId: string;

  /** Hook name */
  hookName?: string;

  /** Git event data */
  eventData: GitEventData;

  /** Event metadata */
  eventMetadata?: EventMetadata;

  /** Execution ID (unique for this execution) */
  executionId: string;

  /** Execution start time */
  startTime: number;

  /** Working directory (repository root) */
  cwd: string;

  /** Git utilities */
  git?: {
    getCurrentBranch: () => Promise<string>;
    getStagedFiles: () => Promise<string[]>;
    getLatestCommit: () => Promise<{ hash: string; message: string }>;
    [key: string]: unknown;
  };

  /** Logger instance */
  logger?: {
    info: (message: string, ...args: unknown[]) => void;
    debug: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
    [key: string]: unknown;
  };

  /** RDF store/graph */
  graph?: unknown;

  /** Additional context data */
  data?: Record<string, unknown>;

  /** Environment variables */
  env?: Record<string, string>;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Hook execution result
 *
 * @description Result returned by hook handlers indicating success/failure,
 * output data, and execution metadata.
 *
 * @example
 * ```typescript
 * const result: HookExecutionResult = {
 *   success: true,
 *   output: { linesChecked: 150, issuesFound: 0 },
 *   duration: 1250,
 *   metadata: { hookVersion: '1.0.0' }
 * };
 * ```
 */
export interface HookExecutionResult {
  /** Whether execution succeeded */
  success: boolean;

  /** Output data from execution */
  output?: unknown;

  /** Error message if failed */
  error?: string;

  /** Error stack trace if failed */
  errorStack?: string;

  /** Execution duration in milliseconds */
  duration?: number;

  /** Exit code (for process-based handlers) */
  exitCode?: number;

  /** Artifacts produced (file paths, URLs, etc.) */
  artifacts?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** Timestamp when execution completed */
  completedAt?: string;
}

/**
 * Bridge operation result
 *
 * @description Result from bridge operations like hook registration,
 * execution, or event processing.
 *
 * @example
 * ```typescript
 * const result: BridgeOperationResult = {
 *   success: true,
 *   operation: 'registerHook',
 *   data: { hookId: 'pre-commit-linter', jobName: 'lint-job' },
 *   duration: 45
 * };
 * ```
 */
export interface BridgeOperationResult {
  /** Whether operation succeeded */
  success: boolean;

  /** Operation type */
  operation?: string;

  /** Operation result data */
  data?: Record<string, unknown>;

  /** Error message if failed */
  error?: string;

  /** Operation duration in milliseconds */
  duration?: number;

  /** Timestamp when operation completed */
  timestamp?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Audit log entry
 *
 * @description Entry in the audit trail stored in Git notes.
 * Provides complete provenance and traceability of hook executions.
 *
 * @example
 * ```typescript
 * const auditEntry: AuditLogEntry = {
 *   eventId: 'evt_123',
 *   hookId: 'pre-commit-linter',
 *   executionId: 'exec_456',
 *   timestamp: '2024-01-09T10:30:00Z',
 *   result: 'success',
 *   duration: 1250
 * };
 * ```
 */
export interface AuditLogEntry {
  /** Event identifier */
  eventId: string;

  /** Hook identifier */
  hookId: string;

  /** Execution identifier */
  executionId: string;

  /** Audit entry timestamp */
  timestamp: string;

  /** Execution result (success/failure/error) */
  result: "success" | "failure" | "error" | "skipped";

  /** Execution duration in milliseconds */
  duration?: number;

  /** Error message if failed */
  error?: string;

  /** Git commit hash when audit entry was created */
  commitHash?: string;

  /** User who triggered the hook */
  user?: string;

  /** Host where hook executed */
  host?: string;

  /** Additional audit data */
  data?: Record<string, unknown>;

  /** Retention policy */
  retentionPolicy?: "detail" | "aggregate";

  /** Expiration date for audit entry */
  expiresAt?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Husky Hook Bridge configuration
 *
 * @description Configuration for the bridge between Husky (Git hooks manager)
 * and the @unrdf/hooks system.
 *
 * @example
 * ```typescript
 * const config: HuskyHookBridgeConfig = {
 *   cwd: '/path/to/repo',
 *   autoEvaluate: true,
 *   enableAudit: true,
 *   timeout: 60000
 * };
 * ```
 */
export interface HuskyHookBridgeConfig {
  /** Working directory (repository root) */
  cwd?: string;

  /** Logger instance */
  logger?: unknown;

  /** Auto-evaluate hooks after event capture */
  autoEvaluate?: boolean;

  /** Enable audit trail logging */
  enableAudit?: boolean;

  /** Evaluation timeout in milliseconds */
  timeout?: number;

  /** GitEventCapture configuration */
  eventCapture?: {
    /** Enable OpenTelemetry tracing */
    enableObservability?: boolean;

    /** Capture environment variables */
    captureEnvironment?: boolean;

    /** Capture diagnostic data */
    captureDiagnostics?: boolean;
  };

  /** HookOrchestrator configuration */
  orchestrator?: {
    /** Directory containing hook definitions */
    graphDir?: string;

    /** Evaluation timeout */
    timeoutMs?: number;
  };
}

/**
 * Unrdf Hooks Bridge configuration
 *
 * @description Configuration for the bridge between @unrdf/hooks (RDF-based
 * hooks) and Bree (job scheduler).
 *
 * @example
 * ```typescript
 * const config: UnrdfHooksBridgeConfig = {
 *   cwd: '/path/to/repo',
 *   jobsDir: 'jobs',
 *   timeout: 30000,
 *   maxRetries: 3,
 *   enableAudit: true
 * };
 * ```
 */
export interface UnrdfHooksBridgeConfig {
  /** Working directory (repository root) */
  cwd?: string;

  /** Logger instance */
  logger?: unknown;

  /** Jobs directory for Bree */
  jobsDir?: string;

  /** Default job timeout in milliseconds */
  timeout?: number;

  /** Maximum retries for failed jobs */
  maxRetries?: number;

  /** Enable audit logging */
  enableAudit?: boolean;

  /** Bree scheduler configuration */
  breeConfig?: {
    /** Enable seconds in cron expressions */
    hasSeconds?: boolean;

    /** Default interval between job runs */
    interval?: number;

    /** Close worker after N milliseconds */
    closeWorkerAfterMs?: number;

    /** Remove completed jobs */
    removeCompleted?: boolean;
  };
}

/**
 * Global hooks system configuration
 *
 * @description Top-level configuration for the entire hooks integration system.
 * Combines configuration for both bridges and global settings.
 *
 * @example
 * ```typescript
 * const config: GlobalHooksConfig = {
 *   enabled: true,
 *   huskyBridge: { autoEvaluate: true },
 *   unrdfBridge: { timeout: 30000 },
 *   auditRetentionDays: 90
 * };
 * ```
 */
export interface GlobalHooksConfig {
  /** Enable hooks system globally */
  enabled?: boolean;

  /** Husky Hook Bridge configuration */
  huskyBridge?: HuskyHookBridgeConfig;

  /** Unrdf Hooks Bridge configuration */
  unrdfBridge?: UnrdfHooksBridgeConfig;

  /** Audit trail retention in days */
  auditRetentionDays?: number;

  /** Maximum concurrent hook executions */
  maxConcurrency?: number;

  /** Enable performance metrics collection */
  enableMetrics?: boolean;

  /** Enable distributed tracing */
  enableTracing?: boolean;

  /** Git notes ref for audit trail */
  auditNotesRef?: string;
}

// ============================================================================
// Statistics and Monitoring Types
// ============================================================================

/**
 * Hook execution statistics
 *
 * @description Statistics about hook executions over time
 */
export interface HookExecutionStats {
  /** Total executions */
  totalExecutions: number;

  /** Successful executions */
  successfulExecutions: number;

  /** Failed executions */
  failedExecutions: number;

  /** Success rate percentage (0-100) */
  successRate: number;

  /** Average execution duration in milliseconds */
  avgDuration?: number;

  /** Minimum execution duration */
  minDuration?: number;

  /** Maximum execution duration */
  maxDuration?: number;

  /** Recent execution history */
  recentExecutions?: Array<{
    executionId: string;
    timestamp: string;
    duration: number;
    success: boolean;
  }>;
}

/**
 * Bridge statistics
 *
 * @description Statistics about bridge operations
 */
export interface BridgeStats {
  /** Bridge initialization status */
  initialized: boolean;

  /** Total events processed */
  totalEventsProcessed: number;

  /** Total hooks triggered */
  totalHooksTriggered: number;

  /** Total jobs executed */
  totalJobsExecuted?: number;

  /** Registered hooks count */
  registeredHooks: number;

  /** Success rate percentage */
  successRate: number;

  /** Recent operations */
  recentOperations?: BridgeOperationResult[];
}
