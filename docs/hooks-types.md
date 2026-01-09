# Hooks System Type Documentation

This document provides comprehensive documentation for the GitVan hooks system type definitions and schema validation.

## Table of Contents

1. [Overview](#overview)
2. [Type Definitions](#type-definitions)
3. [Schema Validation](#schema-validation)
4. [Usage Examples](#usage-examples)
5. [Validation Best Practices](#validation-best-practices)

## Overview

The GitVan hooks integration system provides comprehensive TypeScript type definitions and runtime schema validation using Zod. This ensures type safety throughout the hooks lifecycle, from event capture to hook execution.

### Key Features

- **TypeScript Type Definitions** (`/src/types/hooks.ts`)
  - Complete type coverage for all hooks system components
  - Detailed JSDoc documentation with examples
  - IDE autocompletion and type checking support

- **Zod Schema Validation** (`/src/schemas/hooks.schema.mjs`)
  - Runtime validation for all data structures
  - Comprehensive error messages
  - Helper functions for common validation tasks

- **Bridge Validation**
  - Configuration validation on bridge initialization
  - Event data validation before processing
  - Hook definition validation before registration

## Type Definitions

### Git Hook Types

#### `GitHook`

Enumeration of supported Git hook types:

```typescript
type GitHook =
  | "pre-commit"
  | "prepare-commit-msg"
  | "commit-msg"
  | "post-commit"
  | "pre-push"
  | "post-push"
  | "post-checkout"
  | "post-merge"
  | "post-rewrite"
  | "pre-receive"
  | "update"
  | "post-receive"
  | "post-update";
```

#### `GitEventData`

Event data captured during Git hook execution:

```typescript
interface GitEventData {
  hookType: GitHook;
  timestamp: string; // ISO 8601
  exitCode?: number;
  duration?: number;

  // Commit data
  commitHash?: string;
  commitMessage?: string;
  stagedFiles?: string[];
  filesChanged?: number;
  linesAdded?: number;
  linesDeleted?: number;

  // Branch data
  branchName?: string;
  previousBranch?: string;

  // Remote/push data
  remoteName?: string;
  pushedRefs?: string[];
  updatedRefs?: string[];

  // Rewrite data
  rewriteType?: "rebase" | "amend" | "filter-branch" | "unknown";

  // Error data
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
  };

  // Environment and diagnostics
  environmentVars?: Record<string, string>;
  diagnosticData?: Record<string, unknown>;
  retentionPolicy?: "detail" | "aggregate";
}
```

**Required Fields:**
- `hookType`: The Git hook that triggered the event
- `timestamp`: When the event occurred (ISO 8601 format)

**Optional Fields:**
All other fields are optional and populated based on the hook type and available data.

#### `EventMetadata`

Metadata extracted from Git operations:

```typescript
interface EventMetadata {
  eventId: string;
  eventUri: string;
  eventType: GitHook;
  timestamp: string;
  generatedAt?: Date;
  source?: string;
  severity?: "info" | "warning" | "error";
  tags?: string[];
}
```

### Hook Definition Types

#### `HookDefinition`

Complete hook definition structure:

```typescript
interface HookDefinition {
  id: string;
  name: string;
  description?: string;
  predicate?: HookPredicate;
  handler?: HookHandler;
  gitHookType?: GitHook;
  breeConfig?: BreeJobConfig;
  meta?: {
    version?: string;
    author?: string;
    tags?: string[];
    priority?: number; // 0-10
    enabled?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}
```

**Required Fields:**
- `id`: Unique hook identifier
- `name`: Human-readable hook name

**Optional Fields:**
- `description`: Hook description
- `predicate`: Function to determine if hook should trigger
- `handler`: Function to execute when hook triggers
- `gitHookType`: Specific Git hook this applies to
- `breeConfig`: Job scheduler configuration
- `meta`: Hook metadata including version, author, tags, etc.

#### `BreeJobConfig`

Configuration for Bree job scheduling:

```typescript
interface BreeJobConfig {
  jobName: string;
  path?: string;
  schedule: "immediate" | "cron" | "interval" | "date";
  cron?: string;
  interval?: string | number;
  date?: Date | string;
  timeout?: number;
  maxRetries?: number;
  closeWorkerAfterMs?: number;
  worker?: {
    workerData?: Record<string, unknown>;
  };
  enabled?: boolean;
}
```

**Required Fields:**
- `jobName`: Name of the job (must match filename in jobs directory)
- `schedule`: When to run the job

**Conditional Requirements:**
- If `schedule === "cron"`, then `cron` is required
- If `schedule === "interval"`, then `interval` is required
- If `schedule === "date"`, then `date` is required

### Execution Context Types

#### `ExecutionContext`

Context provided to hook handlers:

```typescript
interface ExecutionContext {
  hookId: string;
  hookName?: string;
  eventData: GitEventData;
  eventMetadata?: EventMetadata;
  executionId: string;
  startTime: number;
  cwd: string;
  git?: {
    getCurrentBranch: () => Promise<string>;
    getStagedFiles: () => Promise<string[]>;
    getLatestCommit: () => Promise<{ hash: string; message: string }>;
    [key: string]: unknown;
  };
  logger?: {
    info: (message: string, ...args: unknown[]) => void;
    debug: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
    [key: string]: unknown;
  };
  graph?: unknown;
  data?: Record<string, unknown>;
  env?: Record<string, string>;
}
```

### Result Types

#### `HookExecutionResult`

Result returned by hook handlers:

```typescript
interface HookExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  errorStack?: string;
  duration?: number;
  exitCode?: number;
  artifacts?: string[];
  metadata?: Record<string, unknown>;
  completedAt?: string;
}
```

**Required Fields:**
- `success`: Whether execution succeeded

#### `BridgeOperationResult`

Result from bridge operations:

```typescript
interface BridgeOperationResult {
  success: boolean;
  operation?: string;
  data?: Record<string, unknown>;
  error?: string;
  duration?: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}
```

#### `AuditLogEntry`

Entry in the audit trail:

```typescript
interface AuditLogEntry {
  eventId: string;
  hookId: string;
  executionId: string;
  timestamp: string;
  result: "success" | "failure" | "error" | "skipped";
  duration?: number;
  error?: string;
  commitHash?: string;
  user?: string;
  host?: string;
  data?: Record<string, unknown>;
  retentionPolicy?: "detail" | "aggregate";
  expiresAt?: string;
}
```

### Configuration Types

#### `HuskyHookBridgeConfig`

Configuration for Husky Hook Bridge:

```typescript
interface HuskyHookBridgeConfig {
  cwd?: string;
  logger?: unknown;
  autoEvaluate?: boolean;
  enableAudit?: boolean;
  timeout?: number;
  eventCapture?: {
    enableObservability?: boolean;
    captureEnvironment?: boolean;
    captureDiagnostics?: boolean;
  };
  orchestrator?: {
    graphDir?: string;
    timeoutMs?: number;
  };
}
```

#### `UnrdfHooksBridgeConfig`

Configuration for Unrdf Hooks Bridge:

```typescript
interface UnrdfHooksBridgeConfig {
  cwd?: string;
  logger?: unknown;
  jobsDir?: string;
  timeout?: number;
  maxRetries?: number;
  enableAudit?: boolean;
  breeConfig?: {
    hasSeconds?: boolean;
    interval?: number;
    closeWorkerAfterMs?: number;
    removeCompleted?: boolean;
  };
}
```

#### `GlobalHooksConfig`

Top-level hooks system configuration:

```typescript
interface GlobalHooksConfig {
  enabled?: boolean;
  huskyBridge?: HuskyHookBridgeConfig;
  unrdfBridge?: UnrdfHooksBridgeConfig;
  auditRetentionDays?: number;
  maxConcurrency?: number;
  enableMetrics?: boolean;
  enableTracing?: boolean;
  auditNotesRef?: string;
}
```

## Schema Validation

All TypeScript types have corresponding Zod schemas for runtime validation.

### Available Schemas

- `GitHookSchema` - Git hook type validation
- `GitEventDataSchema` - Event data validation
- `EventMetadataSchema` - Event metadata validation
- `HookDefinitionSchema` - Hook definition validation
- `BreeJobConfigSchema` - Bree job config validation
- `ExecutionContextSchema` - Execution context validation
- `HookExecutionResultSchema` - Execution result validation
- `BridgeOperationResultSchema` - Bridge operation result validation
- `AuditLogEntrySchema` - Audit log entry validation
- `HuskyHookBridgeConfigSchema` - Husky bridge config validation
- `UnrdfHooksBridgeConfigSchema` - Unrdf bridge config validation
- `GlobalHooksConfigSchema` - Global hooks config validation

### Validation Helper Functions

#### `validateHookDefinition(data)`

Validates a hook definition:

```javascript
const result = validateHookDefinition({
  id: 'my-hook',
  name: 'My Hook',
  breeConfig: { jobName: 'my-job', schedule: 'immediate' }
});

if (result.success) {
  console.log('Valid hook:', result.data);
} else {
  console.error('Invalid hook:', result.error);
  console.error('Issues:', result.issues);
}
```

#### `validateGitEventData(data)`

Validates Git event data:

```javascript
const result = validateGitEventData({
  hookType: 'pre-commit',
  timestamp: new Date().toISOString(),
  stagedFiles: ['src/index.ts']
});

if (!result.success) {
  console.error('Validation failed:', result.issues);
}
```

#### `validateBreeJobConfig(data)`

Validates Bree job configuration:

```javascript
const result = validateBreeJobConfig({
  jobName: 'my-job',
  schedule: 'cron',
  cron: '0 * * * *'
});
```

#### `strictValidate(schema, data, errorPrefix)`

Strict validation that throws on error:

```javascript
import { strictValidate, HookDefinitionSchema } from './schemas/hooks.schema.mjs';

try {
  const validatedHook = strictValidate(
    HookDefinitionSchema,
    hookData,
    'Invalid hook definition'
  );
  // Use validatedHook...
} catch (error) {
  console.error(error.message);
  // Error message includes validation details
}
```

## Usage Examples

### Example 1: Registering a Hook with Validation

```javascript
import { UnrdfHooksBridge } from './integrations/unrdf-hooks-bridge.mjs';

const bridge = new UnrdfHooksBridge({
  cwd: '/path/to/repo',
  jobsDir: 'jobs',
  timeout: 30000
});

// Hook definition is automatically validated
await bridge.registerHook({
  id: 'pre-commit-linter',
  name: 'Run ESLint on pre-commit',
  description: 'Validates code style before commit',
  breeConfig: {
    jobName: 'lint-job',
    schedule: 'immediate'
  }
});
```

### Example 2: Processing a Git Hook Event

```javascript
import { HuskyHookBridge } from './integrations/husky-hook-bridge.mjs';

const bridge = new HuskyHookBridge({
  cwd: '/path/to/repo',
  autoEvaluate: true,
  enableAudit: true
});

// Hook name and event data are automatically validated
const result = await bridge.processHook('pre-commit', {
  stagedFiles: ['src/index.ts', 'src/utils.ts'],
  branchName: 'feature/new-feature'
});

console.log(`Processed ${result.hooksTriggered} hooks`);
```

### Example 3: Custom Hook Handler with Type Safety

```javascript
/**
 * @param {import('./types/hooks.ts').ExecutionContext} context
 * @returns {Promise<import('./types/hooks.ts').HookExecutionResult>}
 */
async function myHookHandler(context) {
  const { hookId, eventData, git, logger } = context;

  logger.info(`Executing hook: ${hookId}`);

  const branch = await git.getCurrentBranch();
  const stagedFiles = await git.getStagedFiles();

  logger.info(`Current branch: ${branch}`);
  logger.info(`Staged files: ${stagedFiles.join(', ')}`);

  return {
    success: true,
    output: {
      branch,
      stagedFiles,
      timestamp: new Date().toISOString()
    },
    duration: Date.now() - context.startTime
  };
}
```

### Example 4: Validating Configuration Before Use

```javascript
import { validateGlobalHooksConfig } from './schemas/hooks.schema.mjs';

const config = {
  enabled: true,
  huskyBridge: {
    autoEvaluate: true,
    enableAudit: true
  },
  unrdfBridge: {
    timeout: 30000,
    maxRetries: 3
  },
  auditRetentionDays: 90
};

const result = validateGlobalHooksConfig(config);

if (!result.success) {
  console.error('Invalid configuration:');
  result.issues.forEach(issue => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

// Use validated configuration
const validatedConfig = result.data;
```

## Validation Best Practices

### 1. Always Validate External Data

Validate all data coming from external sources (user input, configuration files, API calls):

```javascript
import { strictValidate, GitEventDataSchema } from './schemas/hooks.schema.mjs';

function processExternalEvent(externalData) {
  // Validate before processing
  const eventData = strictValidate(
    GitEventDataSchema,
    externalData,
    'Invalid event data received'
  );

  // Now safe to use
  console.log(`Processing ${eventData.hookType} event`);
}
```

### 2. Use Type Guards for Runtime Checks

```javascript
/**
 * @param {unknown} value
 * @returns {value is import('./types/hooks.ts').GitEventData}
 */
function isGitEventData(value) {
  const result = GitEventDataSchema.safeParse(value);
  return result.success;
}

if (isGitEventData(data)) {
  // TypeScript knows data is GitEventData
  console.log(data.hookType);
}
```

### 3. Provide Meaningful Error Messages

```javascript
try {
  const hook = strictValidate(
    HookDefinitionSchema,
    hookData,
    `Failed to register hook '${hookData?.id || 'unknown'}'`
  );
} catch (error) {
  logger.error(error.message);
  // Shows: "Failed to register hook 'my-hook': id: Required; name: Required"
}
```

### 4. Validate at System Boundaries

- Bridge constructors validate configuration
- `registerHook()` validates hook definitions
- `processHook()` validates hook names and event data
- Configuration loaders validate on startup

### 5. Use Partial Validation for Optional Data

```javascript
// For event data that may be incomplete
const result = GitEventDataSchema.partial().safeParse(partialData);

if (result.success) {
  // Merge with defaults
  const completeData = {
    ...defaults,
    ...result.data
  };
}
```

## Type Coverage

Current type coverage:

- **Git Hook Types**: 100% (13/13 hook types)
- **Event Data**: 100% (all fields typed)
- **Hook Definitions**: 100% (all properties typed)
- **Bree Configuration**: 100% (all options typed)
- **Execution Context**: 100% (all fields typed)
- **Result Types**: 100% (all result types typed)
- **Configuration Types**: 100% (all config options typed)

All types include:
- JSDoc documentation
- Usage examples
- Required vs optional field documentation
- Type constraints and validation rules

## Related Files

- Type Definitions: `/src/types/hooks.ts`
- Schema Validation: `/src/schemas/hooks.schema.mjs`
- Husky Bridge: `/src/integrations/husky-hook-bridge.mjs`
- Unrdf Bridge: `/src/integrations/unrdf-hooks-bridge.mjs`
- Tests: `/tests/integrations/husky-hook-bridge.test.mjs`
- Tests: `/tests/integrations/unrdf-hooks-bridge.test.mjs`
