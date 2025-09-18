# GitVan v2 Jobs API

GitVan's job system provides a robust framework for defining, validating, and executing automated tasks. Jobs can be triggered by cron schedules, Git events, or run on-demand.

## Table of Contents

- [Job Definition](#job-definition)
- [Job Types](#job-types)
- [Job Lifecycle](#job-lifecycle)
- [Execution Context](#execution-context)
- [File-based Jobs](#file-based-jobs)
- [Validation](#validation)

## Job Definition

### defineJob(definition, options?)

Define and validate a job with comprehensive type checking.

```javascript
import { defineJob } from 'gitvan/jobs'

const buildJob = defineJob({
  id: 'build-project',
  kind: 'atomic',
  cron: '0 2 * * *',  // Daily at 2 AM
  meta: {
    description: 'Build and test project',
    timeout: 600,
    retries: 3
  },
  on: {
    pushTo: 'main',
    pathChanged: ['src/**', 'package.json']
  },
  run: async (ctx) => {
    const { git, logger, exec } = ctx

    logger.log('Starting build...')

    // Build logic here
    const result = exec.cli('npm', ['run', 'build'])
    if (!result.ok) {
      throw new Error(`Build failed: ${result.stderr}`)
    }

    logger.log('Build completed successfully')
    return { status: 'success', artifacts: ['dist/'] }
  }
})
```

### Job Definition Schema

```typescript
interface JobDefinition {
  id?: string           // Unique identifier (auto-inferred from file path)
  kind?: 'atomic' | 'batch' | 'daemon'  // Job type (default: 'atomic')
  cron?: string         // Cron expression for scheduled jobs
  meta?: object         // Arbitrary metadata
  on?: EventPredicate   // Event-based triggers
  run: Function         // Job execution function
}
```

## Job Types

### Atomic Jobs (Default)

Single-execution jobs that run to completion.

```javascript
const deployJob = defineJob({
  kind: 'atomic',
  run: async (ctx) => {
    // Deploy application
    return { deployed: true }
  }
})
```

### Batch Jobs

Jobs that process multiple items or stages.

```javascript
const batchProcessJob = defineJob({
  kind: 'batch',
  run: async (ctx) => {
    const items = await getWorkItems()
    const results = []

    for (const item of items) {
      const result = await processItem(item)
      results.push(result)
    }

    return { processed: results.length, results }
  }
})
```

### Daemon Jobs

Long-running background jobs.

```javascript
const watcherJob = defineJob({
  kind: 'daemon',
  run: async (ctx) => {
    const { logger } = ctx

    while (true) {
      await checkHealthStatus()
      logger.log('Health check completed')
      await sleep(30000) // Wait 30 seconds
    }
  }
})
```

## Job Lifecycle

### Execution Phases

1. **Validation** - Job definition and context validation
2. **Pre-execution** - Setup and preparation
3. **Execution** - Main job logic
4. **Post-execution** - Cleanup and result handling
5. **Receipt** - Store execution receipt in Git notes

### Return Values

Jobs should return a serializable object describing the execution result:

```javascript
const exampleJob = defineJob({
  run: async (ctx) => {
    // Successful execution
    return {
      status: 'success',
      message: 'Operation completed',
      artifacts: ['build/output.zip'],
      metrics: { duration: 120, files: 42 }
    }
  }
})
```

### Error Handling

```javascript
const robustJob = defineJob({
  run: async (ctx) => {
    try {
      await riskyOperation()
      return { status: 'success' }
    } catch (error) {
      ctx.logger.error('Operation failed:', error.message)

      // Return error result instead of throwing
      return {
        status: 'error',
        error: error.message,
        recovery: 'Manual intervention required'
      }
    }
  }
})
```

## Execution Context

Every job receives a rich execution context with utilities and information.

### Context Properties

```typescript
interface JobContext {
  // Job identification
  id: string              // Job ID

  // Environment
  root: string            // Working directory
  nowISO: string          // Current timestamp (deterministic)
  env: object             // Environment variables

  // Git integration
  git: GitComposable      // Git operations

  // Utilities
  logger: Logger          // Structured logging
  exec: ExecComposable    // Command execution
  template: TemplateComposable // Template rendering

  // Trigger information
  trigger?: {
    type: 'cron' | 'event' | 'manual'
    data?: object         // Trigger-specific data
  }

  // Payload data
  payload: object         // Additional execution data
}
```

### Using Context

```javascript
const contextJob = defineJob({
  run: async (ctx) => {
    const { git, logger, exec, template, nowISO, root } = ctx

    // Git operations
    const branch = await git.branch()
    const isClean = await git.isClean()

    // Logging
    logger.log(`Running on branch: ${branch}`)
    logger.log(`Repository clean: ${isClean}`)

    // Command execution
    const testResult = exec.cli('npm', ['test'])
    if (!testResult.ok) {
      logger.error('Tests failed')
      return { status: 'failed', reason: 'tests' }
    }

    // Template rendering
    const report = template.renderString(
      'Build completed at {{ nowISO }} on {{ branch }}',
      { nowISO, branch }
    )

    logger.log(report)
    return { status: 'success', report }
  }
})
```

## File-based Jobs

Jobs are typically defined in separate files with naming conventions that determine their execution mode.

### Directory Structure

```
jobs/
├── build.mjs              # On-demand job
├── deploy.cron.mjs        # Cron-scheduled job
├── test-on-push.evt.mjs   # Event-triggered job
├── api/
│   ├── sync.mjs           # Namespaced job (id: "api:sync")
│   └── cleanup.cron.mjs   # Namespaced cron job
└── monitoring/
    └── health.daemon.mjs  # Long-running daemon
```

### File Naming Conventions

- `.mjs` - On-demand job
- `.cron.mjs` - Cron-scheduled job
- `.evt.mjs` - Event-triggered job
- `.daemon.mjs` - Long-running daemon job

### Example Job Files

#### jobs/build.mjs

```javascript
import { defineJob } from 'gitvan/jobs'

export default defineJob({
  meta: {
    description: 'Build project artifacts'
  },
  run: async (ctx) => {
    const { exec, logger } = ctx

    logger.log('Installing dependencies...')
    const install = exec.cli('npm', ['ci'])
    if (!install.ok) throw new Error('Install failed')

    logger.log('Building project...')
    const build = exec.cli('npm', ['run', 'build'])
    if (!build.ok) throw new Error('Build failed')

    return { status: 'success', artifacts: ['dist/'] }
  }
})
```

#### jobs/deploy.cron.mjs

```javascript
import { defineJob } from 'gitvan/jobs'

export default defineJob({
  cron: '0 3 * * 1',  // Weekly on Monday at 3 AM
  meta: {
    description: 'Weekly deployment to staging'
  },
  run: async (ctx) => {
    const { git, exec, logger } = ctx

    // Ensure we're on main branch
    const branch = await git.branch()
    if (branch !== 'main') {
      logger.log('Skipping deploy - not on main branch')
      return { status: 'skipped', reason: 'wrong branch' }
    }

    // Deploy to staging
    const deploy = exec.cli('./scripts/deploy.sh', ['staging'])
    if (!deploy.ok) {
      throw new Error(`Deploy failed: ${deploy.stderr}`)
    }

    return { status: 'deployed', environment: 'staging' }
  }
})
```

#### jobs/test-on-push.evt.mjs

```javascript
import { defineJob } from 'gitvan/jobs'

export default defineJob({
  on: {
    pushTo: 'main',
    pathChanged: ['src/**', 'tests/**']
  },
  meta: {
    description: 'Run tests when code changes are pushed to main'
  },
  run: async (ctx) => {
    const { exec, logger, git } = ctx

    // Get changed files
    const status = await git.statusPorcelain()
    logger.log(`Changed files: ${status}`)

    // Run tests
    const test = exec.cli('npm', ['test'])
    if (!test.ok) {
      // Tag commit as failed
      await git.noteAdd('test-results', 'FAILED', 'HEAD')
      throw new Error('Tests failed')
    }

    // Tag commit as passed
    await git.noteAdd('test-results', 'PASSED', 'HEAD')

    return { status: 'passed', tests: 'all' }
  }
})
```

### Job ID Inference

Job IDs are automatically inferred from file paths:

```
jobs/build.mjs                 → id: "build"
jobs/api/sync.mjs              → id: "api:sync"
jobs/monitoring/health.mjs     → id: "monitoring:health"
jobs/deploy.cron.mjs           → id: "deploy"
jobs/notifications/slack.evt.mjs → id: "notifications:slack"
```

## Event Predicates

Jobs can be triggered by Git events using flexible predicate syntax.

### Simple Predicates

```javascript
{
  pushTo: 'main',              // Push to main branch
  tagCreate: 'v*',             // Tag creation matching pattern
  mergeTo: 'release/*',        // Merge to release branches
  pathChanged: ['src/**'],     // Files changed in src directory
  message: '^feat:',           // Commit message starts with 'feat:'
  authorEmail: '@company.com', // Author email contains domain
  signed: true                 // Commit is GPG signed
}
```

### Complex Predicates

#### ANY Logic (OR)

```javascript
{
  any: [
    { pushTo: 'main' },
    { pushTo: 'develop' },
    { tagCreate: 'v*' }
  ]
}
```

#### ALL Logic (AND)

```javascript
{
  all: [
    { pushTo: 'main' },
    { pathChanged: ['src/**'] },
    { signed: true }
  ]
}
```

#### Nested Logic

```javascript
{
  all: [
    { pushTo: 'main' },
    {
      any: [
        { pathChanged: ['src/**'] },
        { pathChanged: ['docs/**'] }
      ]
    }
  ]
}
```

### Available Predicates

| Predicate | Type | Description | Example |
|-----------|------|-------------|---------|
| `pushTo` | string | Branch push pattern | `"main"`, `"release/*"` |
| `mergeTo` | string | Merge target pattern | `"main"`, `"hotfix/*"` |
| `tagCreate` | string | Tag creation pattern | `"v*"`, `"release-*"` |
| `semverTag` | boolean | Semantic version tag | `true` |
| `pathChanged` | string[] | File path patterns | `["src/**", "*.json"]` |
| `pathAdded` | string[] | Added file patterns | `["migrations/*"]` |
| `pathModified` | string[] | Modified file patterns | `["package.json"]` |
| `message` | string | Commit message regex | `"^feat:"`, `"\\[skip ci\\]"` |
| `authorEmail` | string | Author email pattern | `"@company.com"` |
| `signed` | boolean | GPG signed commits | `true` |

## Validation

### Job Definition Validation

```javascript
import { defineJob, createJobDefinition } from 'gitvan/jobs'

try {
  const job = defineJob({
    id: 'test-job',
    kind: 'invalid-kind',  // Invalid!
    run: 'not-a-function'  // Invalid!
  })
} catch (error) {
  console.log(error.message)
  // "Job definition validation failed:
  //  kind must be one of atomic, batch, daemon, got invalid-kind
  //  run must be function, got string"
}
```

### Context Validation

```javascript
import { validateJobContext, createJobContext } from 'gitvan/jobs'

const ctx = createJobContext(jobDef, {
  root: '/path/to/repo',
  git: { head: 'abc123', branch: 'main' },
  logger: console
})

// Throws if context is invalid
const validCtx = validateJobContext(ctx)
```

### Runtime Validation

Jobs are validated at multiple points:

1. **Definition time** - Schema and type validation
2. **Registration time** - ID uniqueness and file path validation
3. **Execution time** - Context and predicate validation

## Advanced Features

### Job Metadata

Store arbitrary metadata for jobs:

```javascript
const job = defineJob({
  meta: {
    description: 'Deploy to production',
    timeout: 1800,        // 30 minutes
    retries: 3,
    priority: 'high',
    owner: 'platform-team',
    dependencies: ['build', 'test'],
    notifications: {
      slack: '#deployments',
      email: 'ops@company.com'
    }
  },
  run: async (ctx) => {
    // Job logic
  }
})
```

### Conditional Execution

```javascript
const conditionalJob = defineJob({
  run: async (ctx) => {
    const { git, logger } = ctx

    // Check conditions
    const isMainBranch = await git.branch() === 'main'
    const isClean = await git.isClean()

    if (!isMainBranch || !isClean) {
      logger.log('Skipping execution - conditions not met')
      return { status: 'skipped', reason: 'conditions' }
    }

    // Proceed with execution
    return { status: 'executed' }
  }
})
```

### Job Chaining

```javascript
const chainedJob = defineJob({
  run: async (ctx) => {
    const { exec, logger } = ctx

    // Run prerequisite jobs
    const prereqs = ['build', 'test', 'lint']

    for (const prereq of prereqs) {
      logger.log(`Running prerequisite: ${prereq}`)
      const result = await exec.js(`./jobs/${prereq}.mjs`)

      if (!result.ok) {
        throw new Error(`Prerequisite ${prereq} failed`)
      }
    }

    // Main job logic
    logger.log('All prerequisites passed, executing main logic')
    return { status: 'success', prerequisites: prereqs }
  }
})
```

## Best Practices

### 1. Use Descriptive IDs and Metadata

```javascript
// Good
const job = defineJob({
  id: 'deploy-to-staging',
  meta: {
    description: 'Deploy application to staging environment',
    owner: 'platform-team',
    timeout: 600
  },
  run: async (ctx) => { /* ... */ }
})
```

### 2. Handle Errors Gracefully

```javascript
// Good
const job = defineJob({
  run: async (ctx) => {
    try {
      await riskyOperation()
      return { status: 'success' }
    } catch (error) {
      ctx.logger.error('Operation failed:', error)
      return {
        status: 'error',
        error: error.message,
        recovery: 'Check logs and retry manually'
      }
    }
  }
})
```

### 3. Use Specific Event Predicates

```javascript
// Good - Specific and efficient
{
  all: [
    { pushTo: 'main' },
    { pathChanged: ['src/**', 'package.json'] },
    { message: '^(feat|fix|docs):' }
  ]
}

// Avoid - Too broad
{
  pushTo: '*'
}
```

### 4. Structure Jobs by Domain

```
jobs/
├── ci/
│   ├── build.mjs
│   ├── test.mjs
│   └── lint.mjs
├── deployment/
│   ├── staging.cron.mjs
│   └── production.evt.mjs
└── maintenance/
    ├── cleanup.cron.mjs
    └── backup.cron.mjs
```

### 5. Use Cron for Scheduled Tasks

```javascript
// Good - Explicit scheduling
const backupJob = defineJob({
  cron: '0 2 * * 0',  // Sunday at 2 AM
  run: async (ctx) => {
    // Backup logic
  }
})
```

### 6. Return Meaningful Results

```javascript
// Good - Detailed results
return {
  status: 'success',
  duration: Date.now() - startTime,
  artifacts: ['dist/app.zip', 'dist/docs.tar.gz'],
  metrics: {
    files: 142,
    size: '12.5MB',
    tests: { passed: 98, failed: 0 }
  }
}
```