# GitVan v2 Composables API

GitVan v2 provides a comprehensive set of composables that enable Git-native development automation. Each composable is designed to work independently or in combination with others, providing a powerful and flexible API for building automation workflows.

> **📚 New Modular Architecture**: GitVan v2 composables have been refactored into a modular factory pattern. See the [Composables Documentation Index](../composables/index.md) for the new structure, [API Reference](../composables/git-api.md) for detailed function documentation, and [Migration Guide](../composables/migration-guide.md) for upgrading from the monolithic version.

## Table of Contents

- [GitVan v2 Composables API](#gitvan-v2-composables-api)
  - [Table of Contents](#table-of-contents)
  - [Core Composables](#core-composables)
    - [useGit](#usegit)
    - [useWorktree](#useworktree)
    - [useTemplate](#usetemplate)
  - [Job \& Event Composables](#job--event-composables)
    - [useJob](#usejob)
    - [useEvent](#useevent)
    - [useSchedule](#useschedule)
  - [Infrastructure Composables](#infrastructure-composables)
    - [useReceipt](#usereceipt)
    - [useLock](#uselock)
    - [useRegistry](#useregistry)
  - [Composable Combinations](#composable-combinations)
    - [Job + Event + Schedule](#job--event--schedule)
    - [Job + Lock + Receipt](#job--lock--receipt)
    - [Template + Job + Event](#template--job--event)
    - [Git + Worktree + Job](#git--worktree--job)
  - [Best Practices](#best-practices)
    - [1. Context Management](#1-context-management)
    - [2. Error Handling](#2-error-handling)
    - [3. Resource Cleanup](#3-resource-cleanup)
    - [4. Validation](#4-validation)
    - [5. Unrouting](#5-unrouting)
  - [Examples](#examples)
    - [Complete Automation Workflow](#complete-automation-workflow)
    - [Dynamic Job Generation](#dynamic-job-generation)

## Core Composables

### useGit

The `useGit` composable provides low-level Git operations and repository management.

```javascript
import { useGit } from './src/composables/git/index.mjs';

const git = useGit();

// Basic Git operations
const headSha = await git.headSha();
const branch = await git.currentRef();
const isClean = await git.isClean();

// Repository information
const info = await git.info();
const refs = await git.listRefs();

// Worktree operations
const worktrees = await git.listWorktrees();
const worktreeRoot = await git.repoRoot();
```

**Key Methods:**
- `head()` - Get current HEAD commit
- `getCurrentBranch()` - Get current branch name
- `isClean()` - Check if working directory is clean
- `info()` - Get consolidated repository information
- `listRefs(pattern)` - List Git references
- `listWorktrees()` - List all worktrees
- `repoRoot()` - Get repository root directory

### useWorktree

The `useWorktree` composable provides high-level Git worktree management.

```javascript
import { useWorktree } from './src/composables/worktree.mjs';

const worktree = useWorktree();

// Worktree operations
const worktrees = await worktree.list();
const newWorktree = await worktree.add('feature-branch', 'feature/my-feature');
await worktree.remove('feature-branch');
```

**Key Methods:**
- `list()` - List all worktrees
- `add(name, branch)` - Add a new worktree
- `remove(name)` - Remove a worktree
- `prune()` - Prune stale worktrees
- `getPath(name)` - Get worktree path
- `getBranch(name)` - Get worktree branch

### useTemplate

The `useTemplate` composable provides Nunjucks template rendering with frontmatter support.

```javascript
import { useTemplate } from './src/composables/template.mjs';

const template = useTemplate({ paths: ['templates'] });

// Template rendering
const result = await template.render('my-template.njk', { name: 'World' });
const stringResult = await template.renderString('Hello {{ name }}!', { name: 'World' });

// Frontmatter operations
const { data, body } = await template.parseFrontmatter('file.md');
const plan = await template.plan('template.njk', data);
const applied = await template.apply(plan);
```

**Key Methods:**
- `render(template, data)` - Render template file
- `renderString(template, data)` - Render template string
- `parseFrontmatter(file)` - Parse frontmatter from file
- `plan(template, data)` - Create execution plan
- `apply(plan)` - Apply execution plan

## Job & Event Composables

### useJob

The `useJob` composable provides job lifecycle management, execution, and discovery.

```javascript
import { useJob } from './src/composables/job.mjs';

const job = useJob();

// Job management
const jobs = await job.list();
const jobDef = await job.get('my-job');
const validation = await job.validate('my-job');

// Job execution
const result = await job.run('my-job', { payload: 'data' });
const lockedResult = await job.runWithLock('my-job', { payload: 'data' });

// Job statistics
const stats = await job.getStats();
const fingerprint = await job.getFingerprint('my-job');

// Unrouting functionality
const unroutedName = job.unroute('cron/daily-backup'); // 'daily-backup'
const directory = job.getDirectory('cron/daily-backup'); // 'cron'
const isInDir = job.isInDirectory('cron/daily-backup', 'cron'); // true
```

**Key Methods:**
- `list(options)` - List all jobs
- `get(jobId)` - Get specific job
- `run(jobId, payload, options)` - Execute job
- `runWithLock(jobId, payload, options)` - Execute job with locking
- `validate(jobId)` - Validate job definition
- `getStats()` - Get job statistics
- `getFingerprint(jobId)` - Get job fingerprint
- `unroute(jobId)` - Extract original job name
- `getDirectory(jobId)` - Get job directory
- `isInDirectory(jobId, directory)` - Check if job is in directory

### useEvent

The `useEvent` composable provides event system management, registration, and triggering.

```javascript
import { useEvent } from './src/composables/event.mjs';

const event = useEvent();

// Event management
const events = await event.list();
const eventDef = await event.get('my-event');
await event.register('custom-event', {
  name: 'Custom Event',
  description: 'A custom event',
  type: 'custom',
  job: 'my-job'
});

// Event triggering
const result = await event.trigger('my-event', { context: 'data' });
const simulation = await event.simulate('my-event', { context: 'data' });

// Event statistics
const stats = await event.getStats();

// Unrouting functionality
const unroutedName = event.unroute('cron/0_3_*_*_*'); // '0_3_*_*_*'
const cronExpr = event.unrouteCron('cron/0_3_*_*_*'); // '0 3 * * *'
const branchName = event.unrouteBranch('merge-to/main'); // 'main'
const category = event.getCategory('cron/daily'); // 'cron'
```

**Key Methods:**
- `list(options)` - List all events
- `get(eventId)` - Get specific event
- `register(eventId, definition)` - Register new event
- `unregister(eventId)` - Unregister event
- `trigger(eventId, context)` - Trigger event
- `simulate(eventId, context)` - Simulate event
- `getStats()` - Get event statistics
- `unroute(eventId)` - Extract original event name
- `unrouteCron(eventId)` - Extract cron expression
- `unrouteBranch(eventId)` - Extract branch name
- `getCategory(eventId)` - Get event category

### useSchedule

The `useSchedule` composable provides cron and scheduling management.

```javascript
import { useSchedule } from './src/composables/schedule.mjs';

const schedule = useSchedule();

// Schedule management
const schedules = await schedule.list();
const scheduleDef = await schedule.get('my-schedule');
await schedule.add('daily-backup', '0 3 * * *', 'backup-job');
await schedule.update('daily-backup', { enabled: false });
await schedule.remove('daily-backup');

// Schedule execution
const result = await schedule.run('daily-backup');
const nextRun = await schedule.nextRun('daily-backup');

// Scheduler control
await schedule.startScheduler();
await schedule.stopScheduler();
```

**Key Methods:**
- `list(options)` - List all schedules
- `get(scheduleId)` - Get specific schedule
- `add(scheduleId, cron, jobId, options)` - Add new schedule
- `update(scheduleId, updates)` - Update schedule
- `remove(scheduleId)` - Remove schedule
- `run(scheduleId, context)` - Run scheduled job
- `nextRun(scheduleId)` - Get next run time
- `startScheduler()` - Start cron scheduler
- `stopScheduler()` - Stop cron scheduler

## Infrastructure Composables

### useReceipt

The `useReceipt` composable provides receipt and audit management.

```javascript
import { useReceipt } from './src/composables/receipt.mjs';

const receipt = useReceipt();

// Receipt management
const receipts = await receipt.list();
const receiptDef = await receipt.get('receipt-id');
const newReceipt = await receipt.create({
  jobId: 'my-job',
  status: 'success',
  artifacts: ['output.txt'],
  meta: { duration: 1000 }
});

// Receipt verification
const verification = await receipt.verify('receipt-id');
const exists = await receipt.exists('receipt-id');

// Receipt statistics
const stats = await receipt.getStats();
```

**Key Methods:**
- `list(options)` - List all receipts
- `get(receiptId)` - Get specific receipt
- `create(receiptData)` - Create new receipt
- `verify(receiptId)` - Verify receipt integrity
- `exists(receiptId)` - Check if receipt exists
- `getStats(options)` - Get receipt statistics
- `generateFingerprint(receipt)` - Generate receipt fingerprint

### useLock

The `useLock` composable provides distributed locking for job coordination.

```javascript
import { useLock } from './src/composables/lock.mjs';

const lock = useLock();

// Lock management
const locks = await lock.list();
const lockResult = await lock.acquire('my-lock', { timeout: 30000 });
if (lockResult.acquired) {
  // Critical section
  await lock.release('my-lock');
}

// Lock status
const isLocked = await lock.isLocked('my-lock');
const lockInfo = await lock.getInfo('my-lock');
```

**Key Methods:**
- `list()` - List all locks
- `acquire(lockName, options)` - Acquire lock
- `release(lockName)` - Release lock
- `isLocked(lockName)` - Check if lock is held
- `getInfo(lockName)` - Get lock information
- `getLockRef(lockName, gitInfo)` - Get lock reference

### useRegistry

The `useRegistry` composable provides job and event registry management.

```javascript
import { useRegistry } from './src/composables/registry.mjs';

const registry = useRegistry();

// Registry management
const stats = await registry.getStats();
const searchResults = await registry.search('backup');
const filteredJobs = await registry.filter({ type: 'job', tag: 'cron' });

// Registry validation
const validation = await registry.validate();
const isValid = await registry.isValid('job-id');
```

**Key Methods:**
- `getStats()` - Get registry statistics
- `search(query)` - Search registry
- `filter(criteria)` - Filter registry entries
- `validate()` - Validate registry
- `isValid(id)` - Check if entry is valid
- `refresh()` - Refresh registry cache

## Composable Combinations

### Job + Event + Schedule

A common pattern is to combine job execution with event triggering and scheduling:

```javascript
import { useJob, useEvent, useSchedule } from './src/composables/index.mjs';

const job = useJob();
const event = useEvent();
const schedule = useSchedule();

// Create a scheduled job that triggers on events
await schedule.add('daily-backup', '0 3 * * *', 'backup-job');
await event.register('backup-complete', {
  name: 'Backup Complete',
  type: 'custom',
  job: 'notify-job'
});

// The job can trigger events when it completes
const result = await job.run('backup-job', { target: 'production' });
if (result.success) {
  await event.trigger('backup-complete', { result });
}
```

### Job + Lock + Receipt

For critical operations that need locking and audit trails:

```javascript
import { useJob, useLock, useReceipt } from './src/composables/index.mjs';

const job = useJob();
const lock = useLock();
const receipt = useReceipt();

// Execute job with locking and receipt tracking
const lockResult = await lock.acquire('critical-operation');
if (lockResult.acquired) {
  try {
    const result = await job.run('critical-job', { data: 'important' });
    
    // Create receipt for audit trail
    await receipt.create({
      jobId: 'critical-job',
      status: result.success ? 'success' : 'error',
      artifacts: result.artifacts,
      meta: { locked: true }
    });
    
    return result;
  } finally {
    await lock.release('critical-operation');
  }
}
```

### Template + Job + Event

For dynamic job generation and event-driven workflows:

```javascript
import { useTemplate, useJob, useEvent } from './src/composables/index.mjs';

const template = useTemplate({ paths: ['templates'] });
const job = useJob();
const event = useEvent();

// Generate job from template
const jobData = await template.parseFrontmatter('job-template.md');
const plan = await template.plan('job-template.njk', jobData);
const applied = await template.apply(plan);

// Register event for the generated job
await event.register('job-generated', {
  name: 'Job Generated',
  type: 'custom',
  job: applied.jobId
});

// Trigger event
await event.trigger('job-generated', { template: jobData });
```

### Git + Worktree + Job

For multi-environment job execution:

```javascript
import { useGit, useWorktree, useJob } from './src/composables/index.mjs';

const git = useGit();
const worktree = useWorktree();
const job = useJob();

// Create worktree for feature branch
const featureWorktree = await worktree.add('feature-branch', 'feature/new-feature');

// Execute job in the feature worktree
const result = await job.run('test-job', { 
  environment: 'feature',
  worktree: featureWorktree.path 
});

// Clean up worktree
await worktree.remove('feature-branch');
```

## Best Practices

### 1. Context Management

Always use composables within the `withGitVan` context:

```javascript
import { withGitVan } from './src/core/context.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const job = useJob();
  const result = await job.run('my-job');
});
```

### 2. Error Handling

Implement comprehensive error handling:

```javascript
try {
  const result = await job.run('my-job', payload);
  await receipt.create({
    jobId: 'my-job',
    status: 'success',
    artifacts: result.artifacts
  });
} catch (error) {
  await receipt.create({
    jobId: 'my-job',
    status: 'error',
    error: { message: error.message, stack: error.stack }
  });
  throw error;
}
```

### 3. Resource Cleanup

Always clean up resources:

```javascript
const lockResult = await lock.acquire('my-lock');
if (lockResult.acquired) {
  try {
    // Do work
  } finally {
    await lock.release('my-lock');
  }
}
```

### 4. Validation

Validate inputs and outputs:

```javascript
const validation = await job.validate('my-job');
if (!validation.valid) {
  throw new Error(`Job validation failed: ${validation.errors.join(', ')}`);
}
```

### 5. Unrouting

Use unrouting for better job/event management:

```javascript
// Instead of hardcoding paths
const jobs = await job.getByDirectory('cron');
const events = await event.getByType('cron');

// Use unrouting for flexible access
const unroutedJobs = await job.listUnrouted();
const cronJobs = unroutedJobs.filter(j => j.category === 'cron');
```

## Examples

### Complete Automation Workflow

```javascript
import { withGitVan } from './src/core/context.mjs';
import { 
  useJob, 
  useEvent, 
  useSchedule, 
  useLock, 
  useReceipt 
} from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const job = useJob();
  const event = useEvent();
  const schedule = useSchedule();
  const lock = useLock();
  const receipt = useReceipt();

  // Setup scheduled job
  await schedule.add('daily-deploy', '0 2 * * *', 'deploy-job');
  
  // Register deployment events
  await event.register('deploy-started', {
    name: 'Deploy Started',
    type: 'custom',
    job: 'notify-deploy-started'
  });
  
  await event.register('deploy-completed', {
    name: 'Deploy Completed',
    type: 'custom',
    job: 'notify-deploy-completed'
  });

  // Execute deployment with locking and receipts
  const lockResult = await lock.acquire('deployment-lock');
  if (lockResult.acquired) {
    try {
      await event.trigger('deploy-started');
      
      const result = await job.run('deploy-job', {
        environment: 'production',
        version: 'v1.2.3'
      });
      
      await event.trigger('deploy-completed', { result });
      
      await receipt.create({
        jobId: 'deploy-job',
        status: 'success',
        artifacts: result.artifacts,
        meta: { environment: 'production', version: 'v1.2.3' }
      });
      
    } finally {
      await lock.release('deployment-lock');
    }
  }
});
```

### Dynamic Job Generation

```javascript
import { withGitVan } from './src/core/context.mjs';
import { useTemplate, useJob, useEvent } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const template = useTemplate({ paths: ['templates'] });
  const job = useJob();
  const event = useEvent();

  // Generate job from template
  const jobTemplate = await template.parseFrontmatter('dynamic-job.md');
  const plan = await template.plan('dynamic-job.njk', jobTemplate);
  const applied = await template.apply(plan);

  // Register event for the generated job
  await event.register('dynamic-job-ready', {
    name: 'Dynamic Job Ready',
    type: 'custom',
    job: applied.jobId
  });

  // Execute the generated job
  const result = await job.run(applied.jobId, jobTemplate.data);
  
  // Trigger completion event
  await event.trigger('dynamic-job-ready', { result });
});
```

This documentation provides a comprehensive guide to using GitVan v2 composables effectively. Each composable is designed to work independently or in combination with others, providing a powerful and flexible API for building Git-native automation workflows.