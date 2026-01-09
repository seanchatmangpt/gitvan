/**
 * @fileoverview GitVan v3.0.0 — Hooks Schema Validation
 *
 * Zod schemas for runtime validation of hooks system data structures.
 * Validates hook definitions, event data, configurations, and results
 * to ensure type safety and data integrity throughout the hooks lifecycle.
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { z } from "zod";

// ============================================================================
// Git Hook Schemas
// ============================================================================

/**
 * Git hook type schema
 *
 * @description Validates that a hook type is one of the supported Git hooks
 */
export const GitHookSchema = z.enum([
  "pre-commit",
  "prepare-commit-msg",
  "commit-msg",
  "post-commit",
  "pre-push",
  "post-push",
  "post-checkout",
  "post-merge",
  "post-rewrite",
  "pre-receive",
  "update",
  "post-receive",
  "post-update",
]);

/**
 * Git event data schema
 *
 * @description Validates event data captured during Git hook execution.
 * All fields are optional except hookType and timestamp to accommodate
 * different hook types with varying data availability.
 */
export const GitEventDataSchema = z.object({
  // Required fields
  hookType: GitHookSchema,
  timestamp: z.string().datetime(),

  // Optional execution data
  exitCode: z.number().int().optional(),
  duration: z.number().positive().optional(),

  // Commit data
  commitHash: z.string().regex(/^[0-9a-f]{40}$/i).optional(),
  commitMessage: z.string().optional(),
  stagedFiles: z.array(z.string()).optional(),
  filesChanged: z.number().int().nonnegative().optional(),
  linesAdded: z.number().int().nonnegative().optional(),
  linesDeleted: z.number().int().nonnegative().optional(),

  // Branch data
  branchName: z.string().optional(),
  previousBranch: z.string().optional(),

  // Remote/push data
  remoteName: z.string().optional(),
  pushedRefs: z.array(z.string()).optional(),
  updatedRefs: z.array(z.string()).optional(),

  // Rewrite data
  rewriteType: z.enum(["rebase", "amend", "filter-branch", "unknown"]).optional(),

  // Error data
  error: z
    .object({
      message: z.string(),
      stack: z.string().optional(),
      code: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),

  // Environment and diagnostics
  environmentVars: z.record(z.string(), z.string()).optional(),
  diagnosticData: z.record(z.string(), z.unknown()).optional(),
  retentionPolicy: z.enum(["detail", "aggregate"]).optional(),
});

/**
 * Event metadata schema
 *
 * @description Validates event metadata including identifiers, timestamps,
 * and categorization data.
 */
export const EventMetadataSchema = z.object({
  eventId: z.string(),
  eventUri: z.string().url(),
  eventType: GitHookSchema,
  timestamp: z.string().datetime(),
  generatedAt: z.date().optional(),
  source: z.string().optional(),
  severity: z.enum(["info", "warning", "error"]).optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// Hook Definition Schemas
// ============================================================================

/**
 * Hook predicate schema
 *
 * @description Validates that a predicate is a function.
 * Runtime validation of function signature is not possible in Zod.
 */
export const HookPredicateSchema = z.function();

/**
 * Hook handler schema
 *
 * @description Validates that a handler is a function.
 */
export const HookHandlerSchema = z.function();

/**
 * Hook metadata schema
 *
 * @description Validates hook metadata including version, author, and settings.
 */
export const HookMetaSchema = z.object({
  version: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  enabled: z.boolean().optional(),
});

/**
 * Hook definition schema
 *
 * @description Validates complete hook definitions. At minimum, a hook
 * must have an id and name. Predicate and handler are validated as functions.
 */
export const HookDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  predicate: HookPredicateSchema.optional(),
  handler: HookHandlerSchema.optional(),
  gitHookType: GitHookSchema.optional(),
  breeConfig: z.lazy(() => BreeJobConfigSchema).optional(),
  meta: HookMetaSchema.optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// ============================================================================
// Bree Job Configuration Schemas
// ============================================================================

/**
 * Bree schedule type schema
 */
export const BreeScheduleTypeSchema = z.enum([
  "immediate",
  "cron",
  "interval",
  "date",
]);

/**
 * Bree job configuration schema
 *
 * @description Validates Bree job configuration with conditional validation:
 * - If schedule is 'cron', cron field is required
 * - If schedule is 'interval', interval field is required
 * - If schedule is 'date', date field is required
 */
export const BreeJobConfigSchema = z
  .object({
    jobName: z.string().min(1),
    path: z.string().optional(),
    schedule: BreeScheduleTypeSchema,
    cron: z.string().optional(),
    interval: z.union([z.string(), z.number().positive()]).optional(),
    date: z.union([z.date(), z.string().datetime()]).optional(),
    timeout: z.number().positive().optional(),
    maxRetries: z.number().int().min(0).max(10).optional(),
    closeWorkerAfterMs: z.number().positive().optional(),
    worker: z
      .object({
        workerData: z.record(z.string(), z.unknown()).optional(),
      })
      .optional(),
    enabled: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Validate cron schedule
      if (data.schedule === "cron") {
        return typeof data.cron === "string" && data.cron.length > 0;
      }
      return true;
    },
    {
      message: "cron field is required when schedule is 'cron'",
      path: ["cron"],
    }
  )
  .refine(
    (data) => {
      // Validate interval schedule
      if (data.schedule === "interval") {
        return data.interval !== undefined;
      }
      return true;
    },
    {
      message: "interval field is required when schedule is 'interval'",
      path: ["interval"],
    }
  )
  .refine(
    (data) => {
      // Validate date schedule
      if (data.schedule === "date") {
        return data.date !== undefined;
      }
      return true;
    },
    {
      message: "date field is required when schedule is 'date'",
      path: ["date"],
    }
  );

// ============================================================================
// Execution Context Schemas
// ============================================================================

/**
 * Git utilities schema (for execution context)
 */
export const GitUtilitiesSchema = z
  .object({
    getCurrentBranch: z.function(),
    getStagedFiles: z.function(),
    getLatestCommit: z.function(),
  })
  .passthrough(); // Allow additional properties

/**
 * Logger schema (for execution context)
 */
export const LoggerSchema = z
  .object({
    info: z.function(),
    debug: z.function(),
    warn: z.function(),
    error: z.function(),
  })
  .passthrough(); // Allow additional properties

/**
 * Execution context schema
 *
 * @description Validates the context provided to hook handlers
 */
export const ExecutionContextSchema = z.object({
  hookId: z.string(),
  hookName: z.string().optional(),
  eventData: GitEventDataSchema,
  eventMetadata: EventMetadataSchema.optional(),
  executionId: z.string(),
  startTime: z.number(),
  cwd: z.string(),
  git: GitUtilitiesSchema.optional(),
  logger: LoggerSchema.optional(),
  graph: z.unknown().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

// ============================================================================
// Result Schemas
// ============================================================================

/**
 * Hook execution result schema
 *
 * @description Validates the result returned by hook handlers
 */
export const HookExecutionResultSchema = z.object({
  success: z.boolean(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  errorStack: z.string().optional(),
  duration: z.number().positive().optional(),
  exitCode: z.number().int().optional(),
  artifacts: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  completedAt: z.string().datetime().optional(),
});

/**
 * Bridge operation result schema
 *
 * @description Validates results from bridge operations
 */
export const BridgeOperationResultSchema = z.object({
  success: z.boolean(),
  operation: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
  duration: z.number().positive().optional(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Audit log entry schema
 *
 * @description Validates audit trail entries
 */
export const AuditLogEntrySchema = z.object({
  eventId: z.string(),
  hookId: z.string(),
  executionId: z.string(),
  timestamp: z.string().datetime(),
  result: z.enum(["success", "failure", "error", "skipped"]),
  duration: z.number().positive().optional(),
  error: z.string().optional(),
  commitHash: z.string().regex(/^[0-9a-f]{40}$/i).optional(),
  user: z.string().optional(),
  host: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  retentionPolicy: z.enum(["detail", "aggregate"]).optional(),
  expiresAt: z.string().datetime().optional(),
});

// ============================================================================
// Configuration Schemas
// ============================================================================

/**
 * Husky Hook Bridge configuration schema
 */
export const HuskyHookBridgeConfigSchema = z.object({
  cwd: z.string().optional(),
  logger: z.unknown().optional(),
  autoEvaluate: z.boolean().optional(),
  enableAudit: z.boolean().optional(),
  timeout: z.number().positive().optional(),
  eventCapture: z
    .object({
      enableObservability: z.boolean().optional(),
      captureEnvironment: z.boolean().optional(),
      captureDiagnostics: z.boolean().optional(),
    })
    .optional(),
  orchestrator: z
    .object({
      graphDir: z.string().optional(),
      timeoutMs: z.number().positive().optional(),
    })
    .optional(),
});

/**
 * Unrdf Hooks Bridge configuration schema
 */
export const UnrdfHooksBridgeConfigSchema = z.object({
  cwd: z.string().optional(),
  logger: z.unknown().optional(),
  jobsDir: z.string().optional(),
  timeout: z.number().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  enableAudit: z.boolean().optional(),
  breeConfig: z
    .object({
      hasSeconds: z.boolean().optional(),
      interval: z.number().positive().optional(),
      closeWorkerAfterMs: z.number().positive().optional(),
      removeCompleted: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Global hooks configuration schema
 */
export const GlobalHooksConfigSchema = z.object({
  enabled: z.boolean().optional(),
  huskyBridge: HuskyHookBridgeConfigSchema.optional(),
  unrdfBridge: UnrdfHooksBridgeConfigSchema.optional(),
  auditRetentionDays: z.number().int().positive().optional(),
  maxConcurrency: z.number().int().positive().optional(),
  enableMetrics: z.boolean().optional(),
  enableTracing: z.boolean().optional(),
  auditNotesRef: z.string().optional(),
});

// ============================================================================
// Statistics Schemas
// ============================================================================

/**
 * Hook execution statistics schema
 */
export const HookExecutionStatsSchema = z.object({
  totalExecutions: z.number().int().nonnegative(),
  successfulExecutions: z.number().int().nonnegative(),
  failedExecutions: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(100),
  avgDuration: z.number().positive().optional(),
  minDuration: z.number().positive().optional(),
  maxDuration: z.number().positive().optional(),
  recentExecutions: z
    .array(
      z.object({
        executionId: z.string(),
        timestamp: z.string().datetime(),
        duration: z.number().positive(),
        success: z.boolean(),
      })
    )
    .optional(),
});

/**
 * Bridge statistics schema
 */
export const BridgeStatsSchema = z.object({
  initialized: z.boolean(),
  totalEventsProcessed: z.number().int().nonnegative(),
  totalHooksTriggered: z.number().int().nonnegative(),
  totalJobsExecuted: z.number().int().nonnegative().optional(),
  registeredHooks: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(100),
  recentOperations: z.array(BridgeOperationResultSchema).optional(),
});

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate hook definition
 *
 * @param {unknown} data - Data to validate
 * @returns {object} Validation result with parsed data or error
 *
 * @example
 * ```javascript
 * const result = validateHookDefinition({
 *   id: 'my-hook',
 *   name: 'My Hook',
 *   breeConfig: { jobName: 'my-job', schedule: 'immediate' }
 * });
 *
 * if (result.success) {
 *   console.log('Valid hook:', result.data);
 * } else {
 *   console.error('Invalid hook:', result.error);
 * }
 * ```
 */
export function validateHookDefinition(data) {
  const result = HookDefinitionSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error.format(),
    issues: result.error.issues,
  };
}

/**
 * Validate Git event data
 *
 * @param {unknown} data - Data to validate
 * @returns {object} Validation result
 */
export function validateGitEventData(data) {
  const result = GitEventDataSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error.format(),
    issues: result.error.issues,
  };
}

/**
 * Validate Bree job configuration
 *
 * @param {unknown} data - Data to validate
 * @returns {object} Validation result
 */
export function validateBreeJobConfig(data) {
  const result = BreeJobConfigSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error.format(),
    issues: result.error.issues,
  };
}

/**
 * Validate Husky Hook Bridge configuration
 *
 * @param {unknown} data - Data to validate
 * @returns {object} Validation result
 */
export function validateHuskyBridgeConfig(data) {
  const result = HuskyHookBridgeConfigSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error.format(),
    issues: result.error.issues,
  };
}

/**
 * Validate Unrdf Hooks Bridge configuration
 *
 * @param {unknown} data - Data to validate
 * @returns {object} Validation result
 */
export function validateUnrdfBridgeConfig(data) {
  const result = UnrdfHooksBridgeConfigSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error.format(),
    issues: result.error.issues,
  };
}

/**
 * Validate global hooks configuration
 *
 * @param {unknown} data - Data to validate
 * @returns {object} Validation result
 */
export function validateGlobalHooksConfig(data) {
  const result = GlobalHooksConfigSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error.format(),
    issues: result.error.issues,
  };
}

/**
 * Validate hook execution result
 *
 * @param {unknown} data - Data to validate
 * @returns {object} Validation result
 */
export function validateHookExecutionResult(data) {
  const result = HookExecutionResultSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error.format(),
    issues: result.error.issues,
  };
}

/**
 * Strict validation that throws on error
 *
 * @param {object} schema - Zod schema to validate against
 * @param {unknown} data - Data to validate
 * @param {string} errorPrefix - Error message prefix
 * @throws {Error} If validation fails
 * @returns {unknown} Parsed data
 *
 * @example
 * ```javascript
 * const hookDef = strictValidate(
 *   HookDefinitionSchema,
 *   hookData,
 *   'Invalid hook definition'
 * );
 * ```
 */
export function strictValidate(schema, data, errorPrefix = "Validation failed") {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`${errorPrefix}: ${errorMessages}`);
  }

  return result.data;
}
