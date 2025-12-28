# GitVan v4 TypeScript Reference

Complete TypeScript type definitions and usage guide.

---

## Table of Contents

1. [Core Types](#core-types)
2. [Hook Types](#hook-types)
3. [Composable Types](#composable-types)
4. [Workflow Types](#workflow-types)
5. [Configuration Types](#configuration-types)
6. [Type Usage Examples](#type-usage-examples)

---

## Core Types

### Basic Types

```typescript
// types/index.d.ts

/**
 * JSON-compatible value type
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

/**
 * Execution type for steps
 */
export type Exec = "cli" | "js" | "llm" | "job" | "tmpl";

/**
 * Execution specification union type
 */
export type ExecSpec =
  | {
      exec: "cli";
      cmd: string;
      args?: string[];
      env?: Record<string, string>;
      timeoutMs?: number;
    }
  | {
      exec: "js";
      module: string;
      export?: string;
      input?: Json;
      timeoutMs?: number;
    }
  | {
      exec: "llm";
      model: string;
      prompt?: string;
      input?: Json;
      options?: Record<string, Json>;
      timeoutMs?: number;
    }
  | { exec: "job"; name: string }
  | {
      exec: "tmpl";
      template: string;
      data?: Json;
      out?: string;
      autoescape?: boolean;
      paths?: string[];
    };
```

### Job Types

```typescript
/**
 * Result of a job execution
 */
export interface JobResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  artifact?: string;
  meta?: Record<string, any>;
}

/**
 * Context for job execution
 */
export interface JobContext {
  root: string;
  env: Record<string, string>;
  head?: string;
  branch?: string;
  now?: () => string;
}

/**
 * Job definition
 */
export interface JobDef {
  kind: "atomic" | "composite";
  meta?: {
    desc?: string;
    schedule?: string;
    tags?: string[];
    [key: string]: any;
  };
  run?: (params: { payload?: any; ctx?: JobContext }) => Promise<JobResult>;
  action?: ExecSpec;
}

/**
 * Type-safe job definition helper
 */
export function defineJob<T extends JobDef>(def: T): T;
```

---

## Hook Types

### Hook Definitions

```typescript
// types/hooks.d.ts

import type { Job, JobCtx, JobResult } from './job.d.ts';
import type { ReceiptV1 } from './receipt.d.ts';

/**
 * GitVan hook event types
 */
export interface GitVanHooks {
  /** Called before tracer initialization */
  'tracer:init': () => void | Promise<void>;

  /** Called after tracer is ready */
  'tracer:ready': () => void | Promise<void>;

  /** Called before tracer shutdown */
  'tracer:shutdown': () => void | Promise<void>;

  /** Called when job is discovered */
  'job:discovered': (job: Job) => void | Promise<void>;

  /** Called before job validation */
  'job:validate': (job: Job) => void | Promise<void>;

  /** Called before job execution */
  'job:before': (job: Job, ctx: JobCtx) => void | Promise<void>;

  /** Called during job execution for progress updates */
  'job:progress': (job: Job, progress: {
    stage: string;
    percentage: number;
    message?: string;
  }) => void | Promise<void>;

  /** Called after successful job execution */
  'job:success': (job: Job, result: JobResult) => void | Promise<void>;

  /** Called after failed job execution */
  'job:error': (job: Job, error: Error) => void | Promise<void>;

  /** Called after job execution (success or failure) */
  'job:after': (job: Job, result: JobResult) => void | Promise<void>;

  /** Called before receipt generation */
  'receipt:before': (job: Job, result: JobResult) => void | Promise<void>;

  /** Called after receipt generation */
  'receipt:after': (receipt: ReceiptV1) => void | Promise<void>;

  /** Called when receipt is written to file */
  'receipt:written': (receipt: ReceiptV1, filePath: string) => void | Promise<void>;

  /** Called before git operations */
  'git:before': (operation: string, args: any[]) => void | Promise<void>;

  /** Called after git operations */
  'git:after': (operation: string, result: any) => void | Promise<void>;

  /** Called on git errors */
  'git:error': (operation: string, error: Error) => void | Promise<void>;

  /** Called before template rendering */
  'template:render': (templatePath: string, data: any) => void | Promise<void>;

  /** Called after template rendering */
  'template:rendered': (templatePath: string, output: string) => void | Promise<void>;

  /** Called on file system changes */
  'fs:change': (event: 'create' | 'modify' | 'delete', filePath: string) => void | Promise<void>;

  /** Called on CLI command execution */
  'cli:command': (command: string, args: string[]) => void | Promise<void>;

  /** Called for debug logging */
  'debug': (message: string, data?: any) => void | Promise<void>;
}
```

### Knowledge Hook Types

```typescript
/**
 * Predicate type enumeration
 */
export type PredicateType =
  | 'ask'
  | 'resultDelta'
  | 'selectThreshold'
  | 'shaclAllConform'
  | 'construct'
  | 'describe'
  | 'federated'
  | 'temporal';

/**
 * Predicate definition
 */
export interface PredicateDefinition {
  type: PredicateType;
  definition: {
    query?: string;
    shapes?: string;
    threshold?: number;
    operator?: '>' | '>=' | '<' | '<=' | '==' | '!=';
    timeWindow?: number;
    endpoints?: Array<{ url: string; timeout?: number }>;
  };
}

/**
 * Parsed hook structure
 */
export interface ParsedHook {
  id: string;
  title?: string;
  predicateDefinition: PredicateDefinition;
  workflows: WorkflowDefinition[];
  metadata: HookMetadata;
}

/**
 * Hook metadata
 */
export interface HookMetadata {
  title?: string;
  description?: string;
  category?: string;
  domain?: string;
  predicateType?: string;
  protected?: boolean;
  requiredApprovers?: number;
  allowedRoles?: string[];
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
  success: boolean;
  duration: number;
  hooksEvaluated: number;
  hooksTriggered: number;
  workflowsExecuted: number;
  workflowsSuccessful: number;
  triggeredHooks: TriggeredHook[];
  executions: ExecutionResult[];
  metadata: EvaluationMetadata;
}

/**
 * Triggered hook info
 */
export interface TriggeredHook {
  id: string;
  title?: string;
  predicateType: PredicateType;
}

/**
 * Single execution result
 */
export interface ExecutionResult {
  hookId: string;
  success: boolean;
  stepResults?: StepResult[];
  outputs?: Record<string, any>;
  executionId: string;
  error?: string;
}
```

---

## Composable Types

### Git Composable

```typescript
/**
 * Git operations interface
 */
export interface GitComposable {
  /** Repository root directory */
  root: string;

  /** Current working directory */
  cwd: string;

  /** Environment variables */
  env: Record<string, string>;

  /** Get current HEAD commit SHA */
  head(): Promise<string>;

  /** Get current branch name */
  branch(): Promise<string>;

  /** Get repository root path */
  repoRoot(): Promise<string>;

  /** Get current timestamp in ISO format */
  nowISO(): string;

  /** Run arbitrary git command */
  run(args: string | string[]): Promise<string>;

  /** Run git command without output */
  runVoid(args: string | string[]): Promise<void>;

  /** Stage files */
  add(paths: string | string[]): Promise<void>;

  /** Create commit */
  commit(message: string, opts?: { sign?: boolean }): Promise<void>;

  /** Create tag */
  tag(name: string, msg?: string, opts?: { sign?: boolean }): Promise<void>;

  /** Add note to git object */
  noteAdd(ref: string, message: string, sha?: string): Promise<void>;

  /** Append note to git object */
  noteAppend(ref: string, message: string, sha?: string): Promise<void>;

  /** Show note content */
  noteShow(ref: string, sha?: string): Promise<string>;

  /** Get git log */
  log(format?: string, extra?: string | string[]): Promise<string>;

  /** Get status in porcelain format */
  statusPorcelain(): Promise<string>;

  /** Check if working tree is clean */
  isClean(): Promise<boolean>;

  /** Check if commit is ancestor */
  isAncestor(a: string, b?: string): Promise<boolean>;

  /** Get merge base */
  mergeBase(a: string, b: string): Promise<string>;

  /** List refs */
  listRefs(pattern?: string): Promise<string[]>;

  /** Create branch */
  branchCreate(name: string, startPoint?: string, opts?: {
    force?: boolean;
    track?: boolean;
  }): Promise<void>;

  /** Delete branch */
  branchDelete(name: string, opts?: { force?: boolean }): Promise<void>;

  /** List branches */
  branchList(opts?: {
    all?: boolean;
    remote?: boolean;
    merged?: boolean;
  }): Promise<string[]>;

  /** Checkout ref */
  checkout(ref: string, opts?: {
    force?: boolean;
    create?: boolean;
    detach?: boolean;
  }): Promise<void>;

  /** Merge branch */
  merge(ref: string, opts?: {
    noff?: boolean;
    ff?: boolean;
    squash?: boolean;
    message?: string;
  }): Promise<void>;

  /** Fetch from remote */
  fetch(remote?: string, refspec?: string, opts?: {
    prune?: boolean;
    tags?: boolean;
    all?: boolean;
    depth?: number;
  }): Promise<void>;

  /** Push to remote */
  push(remote?: string, ref?: string, opts?: {
    force?: boolean;
    setUpstream?: boolean;
    tags?: boolean;
  }): Promise<void>;

  /** Pull from remote */
  pull(remote?: string, branch?: string, opts?: {
    rebase?: boolean;
    ff?: boolean;
  }): Promise<void>;

  /** Get diff */
  diff(opts?: {
    cached?: boolean;
    staged?: boolean;
    nameOnly?: boolean;
    from?: string;
    to?: string;
    files?: string[];
  }): Promise<string>;

  /** List worktrees */
  listWorktrees(): Promise<WorktreeInfo[]>;

  /** Get git info summary */
  info(): Promise<GitInfo>;
}

/**
 * Worktree information
 */
export interface WorktreeInfo {
  path: string;
  head: string;
  branch?: string;
  detached?: boolean;
  isMain: boolean;
}

/**
 * Git repository info
 */
export interface GitInfo {
  head: string;
  branch: string;
  worktree: string;
  isClean: boolean;
  hasUncommittedChanges: boolean;
}
```

### Template Composable

```typescript
/**
 * Template rendering interface
 */
export interface TemplateComposable {
  /** Render template string */
  render(template: string, data?: Record<string, any>): string;

  /** Render template to file */
  renderToFile(
    template: string,
    out: string,
    data?: Record<string, any>
  ): { path: string; bytes: number };

  /** Nunjucks environment */
  env: any;
}

/**
 * Template options
 */
export interface TemplateOptions {
  autoescape?: boolean;
  paths?: string[];
  filters?: Record<string, (...args: any[]) => any>;
}
```

### Context Functions

```typescript
/**
 * Get current GitVan context
 */
export function useGitVan(): JobContext;

/**
 * Try to get context (returns null if not in context)
 */
export function tryUseGitVan(): JobContext | null;

/**
 * Run function within GitVan context
 */
export function withGitVan<T>(ctx: JobContext, fn: () => T): T;

/**
 * Get git composable
 */
export function useGit(opts?: {
  backend?: 'native' | 'memfs' | 'auto';
  hybrid?: boolean;
}): GitComposable;

/**
 * Get template composable
 */
export function useTemplate(opts?: TemplateOptions): TemplateComposable;
```

---

## Workflow Types

```typescript
/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  steps: StepDefinition[];
}

/**
 * Step definition
 */
export interface StepDefinition {
  id: string;
  type: StepType;
  label?: string;
  command?: string;
  query?: string;
  template?: string;
  filePath?: string;
  url?: string;
  method?: string;
  headers?: string;
  body?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  dependsOn?: string | string[];
  condition?: string;
  outputVar?: string;
  failOn?: 'error' | 'warning' | 'none';
  continueOnError?: boolean;
  onFailure?: string;
}

/**
 * Step type
 */
export type StepType =
  | 'cli'
  | 'template'
  | 'sparql'
  | 'http'
  | 'file'
  | 'wait'
  | 'workflow';

/**
 * Step execution result
 */
export interface StepResult {
  stepId: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  outputs?: Record<string, any>;
}
```

---

## Configuration Types

```typescript
// types/config.d.ts

/**
 * GitVan configuration
 */
export interface GitVanConfig {
  /** Project name */
  name?: string;

  /** Hooks directory */
  hooksDir?: string;

  /** Workflows directory */
  workflowsDir?: string;

  /** Default timeout in milliseconds */
  timeout?: number;

  /** Enable verbose logging */
  verbose?: boolean;

  /** Parallel execution limit */
  parallelLimit?: number;

  /** Environment variables */
  env?: Record<string, string>;

  /** Hook categories */
  categories?: Record<string, CategoryConfig>;

  /** Security settings */
  security?: SecurityConfig;

  /** Performance settings */
  performance?: PerformanceConfig;
}

/**
 * Category configuration
 */
export interface CategoryConfig {
  enabled?: boolean;
  timeout?: number;
  priority?: number;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  allowedCommands?: string[];
  blockedPatterns?: string[];
  sandbox?: boolean;
  maxOutputSize?: number;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  lazyLoad?: boolean;
  cacheQueries?: boolean;
  cacheTTL?: number;
  maxGraphSize?: number;
}
```

---

## Type Usage Examples

### Using Git Composable

```typescript
import { useGit, withGitVan } from 'gitvan/composables';

async function example() {
  await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
    const git = useGit();

    // All methods are properly typed
    const branch: string = await git.branch();
    const isClean: boolean = await git.isClean();

    await git.add(['file.ts']);
    await git.commit('feat: add feature');

    const info = await git.info();
    console.log(`Branch: ${info.branch}, Clean: ${info.isClean}`);
  });
}
```

### Using Hook Orchestrator

```typescript
import { HookOrchestrator, EvaluationResult } from 'gitvan/hooks';

async function evaluateHooks(): Promise<EvaluationResult> {
  const orchestrator = new HookOrchestrator({
    graphDir: './hooks',
    timeoutMs: 300000
  });

  const result = await orchestrator.evaluate({
    dryRun: false,
    verbose: true
  });

  // result is fully typed
  console.log(`Evaluated: ${result.hooksEvaluated}`);
  console.log(`Triggered: ${result.hooksTriggered}`);

  for (const hook of result.triggeredHooks) {
    console.log(`- ${hook.id}: ${hook.predicateType}`);
  }

  return result;
}
```

### Defining Custom Jobs

```typescript
import { defineJob, JobDef, JobResult, JobContext } from 'gitvan';

const myJob = defineJob({
  kind: 'atomic',
  meta: {
    desc: 'My custom job',
    tags: ['custom', 'example']
  },
  async run({ payload, ctx }): Promise<JobResult> {
    // Type-safe access to context
    const { root, env, branch } = ctx as JobContext;

    return {
      ok: true,
      stdout: `Executed in ${root} on branch ${branch}`
    };
  }
});
```

### Type-Safe Configuration

```typescript
import type { GitVanConfig } from 'gitvan/types';

const config: GitVanConfig = {
  name: 'my-project',
  hooksDir: './hooks',
  timeout: 60000,
  parallelLimit: 4,
  security: {
    allowedCommands: ['npm', 'node', 'git'],
    sandbox: true
  },
  performance: {
    lazyLoad: true,
    cacheQueries: true,
    cacheTTL: 300000
  }
};
```

---

## JSDoc Integration

For JavaScript projects without TypeScript:

```javascript
/**
 * @typedef {import('gitvan').GitComposable} GitComposable
 * @typedef {import('gitvan').EvaluationResult} EvaluationResult
 */

/**
 * Evaluate hooks and return result
 * @returns {Promise<EvaluationResult>}
 */
async function evaluate() {
  // ...
}
```

---

## Next Steps

- [API Reference](HOOK-REFERENCE.md)
- [Best Practices](BEST-PRACTICES.md)
- [Testing Guide](../testing/TESTING-GUIDE.md)
