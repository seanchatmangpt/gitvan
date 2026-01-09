# GitVan Hooks API Reference

**Complete API documentation for the Husky + @unrdf/hooks + Bree integration system**

Version: 1.0.0
Last Updated: January 9, 2026
GitVan Version: 3.0.0+

---

## Table of Contents

1. [Overview](#overview)
2. [HuskyHookBridge API](#huskyhookbridge-api)
3. [UnrdfHooksBridge API](#unrdfhooksbridge-api)
4. [BreeScheduler API](#breescheduler-api)
5. [Hook Definition Format](#hook-definition-format)
6. [Job File Format](#job-file-format)
7. [CLI Commands](#cli-commands)
8. [Configuration Options](#configuration-options)
9. [Event Types](#event-types)
10. [Error Handling](#error-handling)

---

## Overview

This API reference documents all public interfaces for the GitVan hooks integration system. All classes follow ES Modules syntax and use async/await patterns.

### Import Paths

```javascript
// Bridge classes
import { HuskyHookBridge, getHuskyHookBridge } from 'gitvan/integrations/husky-hook-bridge'
import { UnrdfHooksBridge, getUnrdfHooksBridge } from 'gitvan/integrations/unrdf-hooks-bridge'

// Scheduler
import { BreeScheduler, getBreeScheduler } from 'gitvan/jobs/bree-scheduler'

// Supporting classes
import { GitEventCapture } from 'gitvan/git-lifecycle/GitEventCapture'
import { HookOrchestrator } from 'gitvan/hooks/HookOrchestrator'
```

---

## HuskyHookBridge API

**Location**: `/src/integrations/husky-hook-bridge.mjs`

### Class: `HuskyHookBridge`

Bridges Husky git hooks to @unrdf/hooks system.

#### Constructor

```typescript
new HuskyHookBridge(options?: HuskyHookBridgeOptions): HuskyHookBridge
```

**Options**:
```typescript
interface HuskyHookBridgeOptions {
  cwd?: string                    // Working directory (default: process.cwd())
  logger?: Logger                 // Logger instance (default: console)
  autoEvaluate?: boolean          // Auto-evaluate hooks after capture (default: true)
  enableAudit?: boolean           // Enable audit logging (default: true)
  eventCapture?: object           // GitEventCapture options
  orchestrator?: object           // HookOrchestrator options
}
```

**Example**:
```javascript
import { HuskyHookBridge } from 'gitvan/integrations/husky-hook-bridge'

const bridge = new HuskyHookBridge({
  cwd: '/path/to/repo',
  autoEvaluate: true,
  enableAudit: true
})
```

#### Methods

##### `initialize()`

Initialize the bridge (idempotent).

```typescript
async initialize(): Promise<void>
```

**Throws**: `Error` if initialization fails

**Example**:
```javascript
await bridge.initialize()
```

---

##### `processHook()`

Process a Husky git hook event.

```typescript
async processHook(
  hookName: string,
  eventData?: object
): Promise<HookProcessResult>
```

**Parameters**:
- `hookName`: Git hook name (e.g., 'pre-commit', 'post-merge')
- `eventData`: Additional event data (optional)

**Returns**:
```typescript
interface HookProcessResult {
  success: boolean
  hookName: string
  eventUri: string
  eventId: string
  duration: number
  eventCaptured: boolean
  hooksEvaluated: number
  hooksTriggered: number
  triggeredHooks: TriggeredHook[]
}

interface TriggeredHook {
  hookId: string
  name: string
  triggered: boolean
  timestamp: number
}
```

**Example**:
```javascript
const result = await bridge.processHook('pre-commit', {
  files: ['src/index.js', 'src/utils.js'],
  author: 'john@example.com'
})

console.log(`Triggered ${result.hooksTriggered} hooks`)
```

**Throws**: `Error` if hook processing fails

---

##### `getStats()`

Get bridge statistics.

```typescript
async getStats(): Promise<BridgeStats>
```

**Returns**:
```typescript
interface BridgeStats {
  initialized: boolean
  totalEventsProcessed: number
  totalHooksTriggered: number
  eventStats: object
  orchestratorStats: object
}
```

**Example**:
```javascript
const stats = await bridge.getStats()
console.log(`Processed ${stats.totalEventsProcessed} events`)
```

---

##### `listHooks()`

List all available hooks.

```typescript
async listHooks(): Promise<Hook[]>
```

**Returns**:
```typescript
interface Hook {
  id: string
  name: string
  description?: string
  type: string
  predicates: object[]
}
```

**Example**:
```javascript
const hooks = await bridge.listHooks()
hooks.forEach(hook => {
  console.log(`${hook.id}: ${hook.name}`)
})
```

---

##### `validateHook()`

Validate a hook definition.

```typescript
async validateHook(hookId: string): Promise<ValidationResult>
```

**Returns**:
```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
```

**Example**:
```javascript
const result = await bridge.validateHook('pre-commit-quality')
if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

---

##### `reset()`

Reset bridge state (mainly for testing).

```typescript
async reset(): Promise<void>
```

**Example**:
```javascript
await bridge.reset()
```

---

##### `shutdown()`

Gracefully shutdown the bridge.

```typescript
async shutdown(): Promise<void>
```

**Example**:
```javascript
await bridge.shutdown()
```

---

### Function: `getHuskyHookBridge()`

Get or create HuskyHookBridge singleton.

```typescript
function getHuskyHookBridge(options?: HuskyHookBridgeOptions): HuskyHookBridge
```

**Example**:
```javascript
import { getHuskyHookBridge } from 'gitvan/integrations/husky-hook-bridge'

const bridge = getHuskyHookBridge({ cwd: '/path/to/repo' })
```

---

### Function: `resetHuskyHookBridge()`

Reset singleton instances (for testing).

```typescript
async function resetHuskyHookBridge(cwd?: string): Promise<void>
```

**Parameters**:
- `cwd`: Specific cwd to reset, or all if omitted

**Example**:
```javascript
import { resetHuskyHookBridge } from 'gitvan/integrations/husky-hook-bridge'

await resetHuskyHookBridge()  // Reset all instances
await resetHuskyHookBridge('/path/to/repo')  // Reset specific instance
```

---

## UnrdfHooksBridge API

**Location**: `/src/integrations/unrdf-hooks-bridge.mjs`

### Class: `UnrdfHooksBridge`

Bridges @unrdf/hooks to Bree background job scheduler.

#### Constructor

```typescript
new UnrdfHooksBridge(options?: UnrdfHooksBridgeOptions): UnrdfHooksBridge
```

**Options**:
```typescript
interface UnrdfHooksBridgeOptions {
  cwd?: string                    // Working directory (default: process.cwd())
  logger?: Logger                 // Logger instance (default: console)
  jobsDir?: string                // Jobs directory (default: 'jobs')
  timeout?: number                // Default job timeout in ms (default: 30000)
  maxRetries?: number             // Max job retries (default: 3)
  enableAudit?: boolean           // Enable audit logging (default: true)
}
```

**Example**:
```javascript
import { UnrdfHooksBridge } from 'gitvan/integrations/unrdf-hooks-bridge'

const bridge = new UnrdfHooksBridge({
  jobsDir: 'jobs',
  timeout: 60000,
  maxRetries: 3
})
```

#### Methods

##### `initialize()`

Initialize the bridge.

```typescript
async initialize(): Promise<void>
```

**Example**:
```javascript
await bridge.initialize()
```

---

##### `registerHook()`

Register a hook for Bree job execution.

```typescript
async registerHook(hookDef: HookDefinition): Promise<RegistrationResult>
```

**Parameters**:
```typescript
interface HookDefinition {
  id: string
  name: string
  breeConfig?: {
    jobName?: string              // Job name in jobs directory
    schedule?: 'immediate' | 'cron' | 'interval'
    cron?: string                 // Cron expression (if schedule='cron')
    interval?: number             // Interval in ms (if schedule='interval')
    timeout?: number              // Job timeout in ms
  }
}
```

**Returns**:
```typescript
interface RegistrationResult {
  success: boolean
  hookId: string
  jobName: string
  jobConfig: object
}
```

**Example**:
```javascript
const result = await bridge.registerHook({
  id: 'pre-commit-quality',
  name: 'Pre-commit code quality check',
  breeConfig: {
    jobName: 'quality-check',
    schedule: 'immediate',
    timeout: 60000
  }
})
```

---

##### `unregisterHook()`

Unregister a hook.

```typescript
async unregisterHook(hookId: string): Promise<UnregistrationResult>
```

**Returns**:
```typescript
interface UnregistrationResult {
  success: boolean
  hookId?: string
  message?: string
}
```

**Example**:
```javascript
await bridge.unregisterHook('pre-commit-quality')
```

---

##### `executeHook()`

Execute a hook by triggering its associated Bree job.

```typescript
async executeHook(
  hookId: string,
  data?: object,
  options?: ExecutionOptions
): Promise<ExecutionResult>
```

**Parameters**:
```typescript
interface ExecutionOptions {
  immediate?: boolean             // Run immediately or use schedule (default: true)
}
```

**Returns**:
```typescript
interface ExecutionResult {
  success: boolean
  hookId: string
  jobName: string
  executionId: string
  immediate: boolean
  duration: number
  executedAt: Date
  error?: string
}
```

**Example**:
```javascript
const result = await bridge.executeHook('pre-commit-quality', {
  files: ['src/index.js']
}, {
  immediate: true
})
```

---

##### `start()`

Start the Bree scheduler.

```typescript
async start(): Promise<void>
```

**Example**:
```javascript
await bridge.start()
```

---

##### `stop()`

Stop the Bree scheduler.

```typescript
async stop(): Promise<void>
```

**Example**:
```javascript
await bridge.stop()
```

---

##### `getStats()`

Get execution statistics.

```typescript
getStats(): BridgeStats
```

**Returns**:
```typescript
interface BridgeStats {
  initialized: boolean
  registeredHooks: number
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  successRate: number
  schedulerStatus: object
  recentExecutions: ExecutionResult[]
}
```

**Example**:
```javascript
const stats = bridge.getStats()
console.log(`Success rate: ${stats.successRate.toFixed(1)}%`)
```

---

##### `listHooks()`

List all registered hooks.

```typescript
listHooks(): RegisteredHook[]
```

**Returns**:
```typescript
interface RegisteredHook {
  hookId: string
  hookName: string
  jobName: string
  registeredAt: Date
}
```

**Example**:
```javascript
const hooks = bridge.listHooks()
hooks.forEach(hook => {
  console.log(`${hook.hookId} → ${hook.jobName}`)
})
```

---

##### `getHistory()`

Get execution history.

```typescript
getHistory(options?: HistoryOptions): ExecutionResult[]
```

**Parameters**:
```typescript
interface HistoryOptions {
  hookId?: string                 // Filter by hook ID
  limit?: number                  // Limit results (default: 50)
}
```

**Example**:
```javascript
const history = bridge.getHistory({ hookId: 'pre-commit-quality', limit: 10 })
```

---

##### `shutdown()`

Gracefully shutdown the bridge.

```typescript
async shutdown(): Promise<void>
```

**Example**:
```javascript
await bridge.shutdown()
```

---

### Function: `getUnrdfHooksBridge()`

Get or create UnrdfHooksBridge singleton.

```typescript
function getUnrdfHooksBridge(options?: UnrdfHooksBridgeOptions): UnrdfHooksBridge
```

**Example**:
```javascript
import { getUnrdfHooksBridge } from 'gitvan/integrations/unrdf-hooks-bridge'

const bridge = getUnrdfHooksBridge({ jobsDir: 'jobs' })
```

---

## BreeScheduler API

**Location**: `/src/jobs/bree-scheduler.mjs`

### Class: `BreeScheduler`

Background job scheduling and execution.

#### Constructor

```typescript
new BreeScheduler(options?: BreeSchedulerOptions): BreeScheduler
```

**Options**:
```typescript
interface BreeSchedulerOptions {
  cwd?: string                    // Working directory
  jobsDir?: string                // Jobs directory (default: 'jobs')
  timeout?: number                // Default timeout (default: 0 = no timeout)
  interval?: number               // Default interval (default: 1000ms)
  closeWorkerAfterMs?: number     // Close worker after ms (default: 5000)
  removeCompleted?: boolean       // Remove completed jobs (default: true)
  breeConfig?: object             // Additional Bree config
}
```

**Example**:
```javascript
import { BreeScheduler } from 'gitvan/jobs/bree-scheduler'

const scheduler = new BreeScheduler({
  jobsDir: 'jobs',
  timeout: 30000,
  closeWorkerAfterMs: 5000
})
```

#### Methods

##### `init()`

Initialize Bree instance.

```typescript
async init(): Promise<void>
```

**Example**:
```javascript
await scheduler.init()
```

---

##### `start()`

Start the Bree scheduler.

```typescript
async start(): Promise<void>
```

**Example**:
```javascript
await scheduler.start()
```

---

##### `stop()`

Stop the Bree scheduler.

```typescript
async stop(): Promise<void>
```

**Example**:
```javascript
await scheduler.stop()
```

---

##### `addJob()`

Add a job to the scheduler.

```typescript
async addJob(jobConfig: JobConfig): Promise<JobConfig>
```

**Parameters**:
```typescript
interface JobConfig {
  name: string                    // Job name (required)
  path?: string                   // Path to job file (optional, auto-resolved)
  cron?: string                   // Cron expression
  interval?: number               // Interval in ms
  timeout?: number                // Timeout in ms
  date?: Date                     // Run at specific date
  worker?: object                 // Worker options
}
```

**Example**:
```javascript
const job = await scheduler.addJob({
  name: 'quality-check',
  cron: '0 0 * * *',  // Daily at midnight
  timeout: 60000
})
```

---

##### `removeJob()`

Remove a job from the scheduler.

```typescript
async removeJob(name: string): Promise<void>
```

**Example**:
```javascript
await scheduler.removeJob('quality-check')
```

---

##### `runJob()`

Run a job immediately.

```typescript
async runJob(name: string): Promise<void>
```

**Example**:
```javascript
await scheduler.runJob('quality-check')
```

---

##### `startJob()`

Start a specific job (for scheduled jobs).

```typescript
async startJob(name: string): Promise<void>
```

**Example**:
```javascript
await scheduler.startJob('daily-cleanup')
```

---

##### `stopJob()`

Stop a specific job.

```typescript
async stopJob(name: string): Promise<void>
```

**Example**:
```javascript
await scheduler.stopJob('daily-cleanup')
```

---

##### `listJobs()`

List all jobs.

```typescript
listJobs(): JobConfig[]
```

**Example**:
```javascript
const jobs = scheduler.listJobs()
jobs.forEach(job => {
  console.log(`${job.name}: ${job.cron || job.interval}`)
})
```

---

##### `getJob()`

Get job configuration.

```typescript
getJob(name: string): JobConfig | null
```

**Example**:
```javascript
const job = scheduler.getJob('quality-check')
if (job) {
  console.log(`Timeout: ${job.timeout}ms`)
}
```

---

##### `hasJob()`

Check if a job exists.

```typescript
hasJob(name: string): boolean
```

**Example**:
```javascript
if (scheduler.hasJob('quality-check')) {
  console.log('Job exists')
}
```

---

##### `getStatus()`

Get scheduler status.

```typescript
getStatus(): SchedulerStatus
```

**Returns**:
```typescript
interface SchedulerStatus {
  isRunning: boolean
  jobCount: number
  jobs: {
    name: string
    cron?: string
    interval?: number
  }[]
}
```

**Example**:
```javascript
const status = scheduler.getStatus()
console.log(`Running: ${status.isRunning}, Jobs: ${status.jobCount}`)
```

---

##### `shutdown()`

Gracefully shutdown the scheduler.

```typescript
async shutdown(): Promise<void>
```

**Example**:
```javascript
await scheduler.shutdown()
```

---

### Function: `getBreeScheduler()`

Get or create BreeScheduler singleton.

```typescript
function getBreeScheduler(options?: BreeSchedulerOptions): BreeScheduler
```

**Example**:
```javascript
import { getBreeScheduler } from 'gitvan/jobs/bree-scheduler'

const scheduler = getBreeScheduler({ jobsDir: 'jobs' })
```

---

## Hook Definition Format

### Turtle (.ttl) Format

Hook definitions are written in Turtle (RDF) format.

#### Basic Structure

```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

:HookId a hook:Hook ;
  rdfs:label "Hook Name" ;
  rdfs:comment "Hook description" ;

  # Trigger
  hook:on [
    a git:EventType ;
    hook:pathChanged "pattern"
  ] ;

  # Conditions
  hook:when [
    hook:condition value
  ] ;

  # Job configuration
  hook:job [
    hook:name "job-name" ;
    hook:schedule "schedule-type" ;
    hook:timeout 30000
  ] .
```

#### Event Types

```turtle
# Git hook events
git:PreCommitEvent
git:PostCommitEvent
git:PrepareCommitMsgEvent
git:CommitMsgEvent
git:PrePushEvent
git:PostPushEvent
git:PostCheckoutEvent
git:PostMergeEvent
git:PostRewriteEvent
git:PostUpdateEvent
```

#### Path Patterns

```turtle
# Match specific files
hook:pathChanged "src/index.js"

# Match with wildcards
hook:pathChanged "src/**/*.js"

# Match multiple patterns
hook:pathChanged "**/*.{js,ts,mjs}"
```

#### Conditions

```turtle
# Boolean conditions
hook:hasStagedFiles true
hook:notMergeCommit true

# Regex patterns
hook:authorEmail "^(?!.*bot@).*"
hook:messageNotMatch "\\[skip\\]"

# Complex conditions (all must be true)
hook:all [
  hook:pathChanged "src/**" ;
  hook:notMergeCommit true ;
  hook:authorEmail "^(?!.*bot@).*"
]

# Alternative conditions (any can be true)
hook:any [
  hook:branchName "main" ;
  hook:branchName "master"
]
```

#### Job Configuration

```turtle
hook:job [
  # Job name (required)
  hook:name "job-name" ;

  # Schedule type
  hook:schedule "immediate" ;  # Run immediately
  hook:schedule "cron" ;       # Cron-based
  hook:schedule "interval" ;   # Interval-based
  hook:schedule "background" ; # Queue for later

  # Cron expression (if schedule="cron")
  hook:cron "0 0 * * *" ;  # Daily at midnight

  # Interval (if schedule="interval")
  hook:interval 60000 ;  # Every 60 seconds

  # Timeout
  hook:timeout 30000  # 30 seconds
] .
```

#### SPARQL Conditions

```turtle
hook:when [
  hook:sparql """
    PREFIX git: <http://example.com/git#>
    ASK {
      ?commit a git:Commit ;
              git:hasChange ?change .
      ?change git:path ?path .
      FILTER(CONTAINS(?path, "src/"))
    }
  """
] .
```

---

## Job File Format

### JavaScript (.mjs) Format

Job files are ES Modules that export a default async function.

#### Basic Structure

```javascript
/**
 * Job: Job Name
 * Description: What this job does
 * Trigger: When this job runs
 * Timeout: Expected duration
 */
export default async function myJob(context = {}) {
  // Job logic here

  return {
    success: boolean,
    data?: any
  }
}
```

#### Full Example

```javascript
import { execSync } from 'node:child_process'
import { logger } from '../src/utils/logger.mjs'

/**
 * Job: Code Quality Check
 * Description: Run linting and tests on staged files
 * Trigger: Pre-commit hook
 * Timeout: 60 seconds
 */
export default async function qualityCheck(context = {}) {
  const startTime = Date.now()
  logger.info('Starting code quality check...')

  try {
    // Get staged files from context
    const stagedFiles = context.files || []

    if (stagedFiles.length === 0) {
      logger.info('No staged files, skipping checks')
      return {
        success: true,
        skipped: true,
        reason: 'No staged files'
      }
    }

    logger.info(`Checking ${stagedFiles.length} files...`)

    // Run ESLint on staged files
    const jsFiles = stagedFiles.filter(f => /\.(js|mjs|ts)$/.test(f))
    if (jsFiles.length > 0) {
      logger.info(`Linting ${jsFiles.length} JavaScript files...`)
      execSync(`npx eslint ${jsFiles.join(' ')}`, { stdio: 'inherit' })
      logger.info('✅ Linting passed')
    }

    // Run tests
    logger.info('Running tests...')
    execSync('npm test', { stdio: 'inherit' })
    logger.info('✅ Tests passed')

    const duration = Date.now() - startTime
    logger.info(`Quality check completed in ${duration}ms`)

    return {
      success: true,
      duration,
      filesChecked: stagedFiles.length,
      jsFilesLinted: jsFiles.length
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Quality check failed:', error.message)

    return {
      success: false,
      error: error.message,
      duration
    }
  }
}
```

#### Context Object

Jobs receive a context object with useful data:

```typescript
interface JobContext {
  // Event data
  event?: {
    type: string
    uri: string
    timestamp: string
  }

  // Git data
  files?: string[]
  branch?: string
  author?: string
  message?: string

  // Repository info
  cwd?: string
  repoPath?: string

  // Custom data
  [key: string]: any
}
```

#### Return Value

Jobs should return an object with:

```typescript
interface JobResult {
  success: boolean              // Required: job succeeded or failed
  duration?: number             // Optional: execution time in ms
  skipped?: boolean             // Optional: job was skipped
  reason?: string               // Optional: skip reason
  error?: string                // Optional: error message
  data?: any                    // Optional: any additional data
}
```

---

## CLI Commands

### `gitvan hooks setup`

Set up the complete hooks system.

```bash
gitvan hooks setup [options]
```

**Options**:
- `--force`: Force reinstall
- `--skip-examples`: Skip creating example hooks

**Example**:
```bash
gitvan hooks setup --force
```

---

### `gitvan hooks list`

List all registered hooks.

```bash
gitvan hooks list [options]
```

**Options**:
- `--verbose`: Show detailed information
- `--format <format>`: Output format (table, json, turtle)

**Example**:
```bash
gitvan hooks list --verbose
gitvan hooks list --format=json
```

---

### `gitvan hooks register`

Register a hook definition.

```bash
gitvan hooks register <hookFile>
```

**Example**:
```bash
gitvan hooks register hooks/pre-commit-quality.ttl
```

---

### `gitvan hooks unregister`

Unregister a hook.

```bash
gitvan hooks unregister <hookId>
```

**Example**:
```bash
gitvan hooks unregister pre-commit-quality
```

---

### `gitvan hooks run`

Run a specific hook manually.

```bash
gitvan hooks run <hookId> [options]
```

**Options**:
- `--data <json>`: Pass custom data to job
- `--dry-run`: Simulate without executing

**Example**:
```bash
gitvan hooks run pre-commit-quality
gitvan hooks run post-merge-deps --data='{"files":["package.json"]}'
```

---

### `gitvan hooks evaluate`

Evaluate all hooks against current graph state.

```bash
gitvan hooks evaluate [options]
```

**Options**:
- `--dry-run`: Don't execute triggered hooks
- `--verbose`: Show detailed evaluation

**Example**:
```bash
gitvan hooks evaluate --dry-run --verbose
```

---

### `gitvan hooks status`

Show hooks system status.

```bash
gitvan hooks status
```

**Example**:
```bash
gitvan hooks status
# Output:
# ✓ Husky Hook Bridge: Initialized
# ✓ UnRDF Hooks Bridge: Initialized
# ✓ Bree Scheduler: Running
# ✓ Registered Hooks: 5
# ✓ Active Jobs: 2
```

---

### `gitvan hooks stats`

Show execution statistics.

```bash
gitvan hooks stats [options]
```

**Options**:
- `--sort <field>`: Sort by field (name, executions, duration)
- `--limit <n>`: Limit results

**Example**:
```bash
gitvan hooks stats --sort=duration --limit=10
```

---

### `gitvan hooks history`

View execution history.

```bash
gitvan hooks history [options]
```

**Options**:
- `--hook <hookId>`: Filter by hook ID
- `--limit <n>`: Limit results (default: 50)
- `--format <format>`: Output format (table, json)

**Example**:
```bash
gitvan hooks history --hook=pre-commit-quality --limit=20
```

---

### `gitvan hooks validate`

Validate hook definition.

```bash
gitvan hooks validate <hookFile>
```

**Example**:
```bash
gitvan hooks validate hooks/pre-commit-quality.ttl
```

---

## Configuration Options

### gitvan.config.js

```javascript
export default defineGitVanConfig({
  // Hook system configuration
  hooks: {
    // Directory for hook definitions
    dir: "hooks",

    // Auto-evaluate hooks after Git events
    autoEvaluate: true,

    // Enable audit logging
    enableAudit: true,

    // Hook evaluation timeout (ms)
    timeout: 300000,

    // Bree scheduler configuration
    bree: {
      // Jobs directory
      jobsDir: "jobs",

      // Default job timeout (ms)
      timeout: 30000,

      // Max job retries
      maxRetries: 3,

      // Close worker after ms
      closeWorkerAfterMs: 5000,

      // Remove completed jobs
      removeCompleted: true
    },

    // Event capture configuration
    eventCapture: {
      // Capture environment variables
      captureEnvironment: true,

      // Capture diagnostic data
      captureDiagnostics: true,

      // Enable OpenTelemetry tracing
      enableObservability: false
    },

    // Hook orchestrator configuration
    orchestrator: {
      // Hook definitions directory
      graphDir: "./hooks",

      // Evaluation timeout (ms)
      timeoutMs: 300000
    }
  },

  // Jobs directory
  jobs: {
    dir: "jobs"
  },

  // Audit trail configuration
  receipts: {
    ref: "refs/notes/gitvan/audit"
  },

  // RDF graph configuration
  graph: {
    dir: "graph",
    autoLoad: true,
    uriRoots: {
      "graph://": "graph/",
      "hooks://": "hooks/"
    }
  }
})
```

---

## Event Types

### Git Hook Events

| Event Type | Git Hook | Description |
|------------|----------|-------------|
| `git:PreCommitEvent` | pre-commit | Before commit is created |
| `git:PostCommitEvent` | post-commit | After commit is created |
| `git:PrepareCommitMsgEvent` | prepare-commit-msg | Prepare commit message |
| `git:CommitMsgEvent` | commit-msg | Validate commit message |
| `git:PrePushEvent` | pre-push | Before push to remote |
| `git:PostPushEvent` | post-push | After push to remote |
| `git:PostCheckoutEvent` | post-checkout | After checkout/switch |
| `git:PostMergeEvent` | post-merge | After merge completes |
| `git:PostRewriteEvent` | post-rewrite | After rebase/amend |
| `git:PostUpdateEvent` | post-update | After refs are updated |

### Event Data Structure

```javascript
{
  type: "pre-commit",
  uri: "event://pre-commit/1234567890",
  timestamp: "2026-01-09T12:00:00Z",

  // Git information
  files: ["src/index.js", "src/utils.js"],
  branch: "main",
  author: {
    name: "John Doe",
    email: "john@example.com"
  },
  message: "feat: add new feature",

  // Repository information
  cwd: "/path/to/repo",
  repoPath: "/path/to/repo/.git"
}
```

---

## Error Handling

### Error Types

```typescript
// Hook processing errors
class HookProcessingError extends Error {
  hookName: string
  phase: 'capture' | 'evaluation' | 'execution'
  originalError: Error
}

// Hook evaluation errors
class HookEvaluationError extends Error {
  hookId: string
  predicate: string
  originalError: Error
}

// Job execution errors
class JobExecutionError extends Error {
  jobName: string
  executionId: string
  timeout: boolean
  originalError: Error
}

// Hook registration errors
class HookRegistrationError extends Error {
  hookId: string
  validationErrors: string[]
}
```

### Error Handling Patterns

```javascript
// Try-catch with detailed error info
try {
  await bridge.processHook('pre-commit', eventData)
} catch (error) {
  if (error instanceof HookProcessingError) {
    console.error(`Hook processing failed at ${error.phase}:`, error.message)
    console.error(`Original error:`, error.originalError)
  } else {
    console.error('Unexpected error:', error)
  }
}

// Check result success flag
const result = await bridge.processHook('pre-commit', eventData)
if (!result.success) {
  console.error('Hook failed:', result.error)
}

// Graceful degradation
const result = await bridge.processHook('pre-commit', eventData)
if (result.hooksEvaluated === 0) {
  console.warn('No hooks were evaluated (check hook definitions)')
}
```

---

## TypeScript Definitions

Full TypeScript definitions are available in `types/hooks.d.ts`:

```typescript
// Install types
npm install --save-dev @types/gitvan

// Use in TypeScript
import type {
  HuskyHookBridge,
  UnrdfHooksBridge,
  BreeScheduler,
  HookDefinition,
  JobConfig,
  HookProcessResult
} from 'gitvan/types/hooks'
```

---

## See Also

- [Integration Guide](./HOOKS_INTEGRATION_GUIDE.md) - Step-by-step setup
- [Architecture](./HOOKS_ARCHITECTURE.md) - System design
- [Examples](./HOOKS_EXAMPLES.md) - Real-world examples
- [Migration Guide](./migration/from-husky.md) - Migrating from Husky

---

**Last Updated**: January 9, 2026
**GitVan Version**: 3.0.0+
**License**: Apache-2.0
