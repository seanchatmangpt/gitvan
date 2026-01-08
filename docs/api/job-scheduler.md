# Job Scheduler API Reference

GitVan v4.0.0 - Bree Integration

## Table of Contents

- [useJob() Composable](#usejob-composable)
  - [Job Discovery](#job-discovery)
  - [Job Execution](#job-execution)
  - [Job Status](#job-status)
  - [Job History](#job-history)
  - [Job Management](#job-management)
  - [Job Utilities](#job-utilities)
  - [Job Context Helpers](#job-context-helpers)
  - [Job Fingerprinting](#job-fingerprinting)
  - [Job Unrouting](#job-unrouting)
  - [Bree Scheduler Management](#bree-scheduler-management)
- [BreeScheduler Class](#breescheduler-class)
- [JobBridge Class](#jobbridge-class)
- [Worker Thread Protocol](#worker-thread-protocol)

---

## useJob() Composable

The `useJob()` composable is the primary API for job management in GitVan. It provides comprehensive job lifecycle management, execution, and scheduling capabilities.

### Import

```javascript
import { useJob } from 'gitvan';
import { withGitVan } from 'gitvan';

// Must be used within withGitVan() context
await withGitVan(context, async () => {
  const job = useJob();
  // Use job methods here
});
```

### Context Properties

#### cwd

```javascript
job.cwd: string
```

Current working directory for job operations.

**Returns:** Absolute path to the working directory

**Example:**
```javascript
const job = useJob();
console.log(job.cwd); // /home/user/my-project
```

#### env

```javascript
job.env: Record<string, string>
```

Environment variables for job execution. Always includes `TZ=UTC` and `LANG=C` for determinism.

**Returns:** Environment variables object

**Example:**
```javascript
const job = useJob();
console.log(job.env.TZ); // UTC
console.log(job.env.LANG); // C
```

---

## Job Discovery

### list()

```javascript
async list(options?: ListOptions): Promise<JobInfo[]>
```

List all discovered jobs in the jobs directory.

**Parameters:**
- `options.includeMetadata` (boolean, default: `true`) - Include full metadata in results
- `options.filter` (object) - Filter criteria
  - `filter.tags` (string[]) - Filter by tags
  - `filter.name` (string) - Filter by name (substring match)

**Returns:** Array of job information objects

**Job Info Structure:**
```typescript
interface JobInfo {
  id: string;              // Job identifier
  name: string;            // Display name
  description: string;     // Job description
  tags: string[];          // Tags for categorization
  cron?: string;          // Cron schedule (if defined)
  file: string;            // Absolute path to job file
  metadata?: object;       // Full metadata (if includeMetadata=true)
}
```

**Example:**
```javascript
const job = useJob();

// List all jobs
const allJobs = await job.list();

// List with filters
const taggedJobs = await job.list({
  filter: { tags: ['backup', 'maintenance'] }
});

// List without metadata
const lightweightList = await job.list({ includeMetadata: false });
```

**Error Conditions:**
- Throws if jobs directory is not accessible
- Warns (but continues) if individual job files fail to load

---

### get()

```javascript
async get(jobId: string): Promise<JobDefinition>
```

Get a specific job definition by ID or name.

**Parameters:**
- `jobId` (string, required) - Job identifier or name

**Returns:** Job definition object including full job configuration

**Job Definition Structure:**
```typescript
interface JobDefinition {
  id: string;
  name: string;
  description: string;
  tags: string[];
  cron?: string;
  file: string;
  definition: {
    meta: object;
    run: Function;
    cron?: string;
    interval?: number;
  };
}
```

**Example:**
```javascript
const job = useJob();
const jobDef = await job.get('backup-job');

console.log(jobDef.name);        // Backup Job
console.log(jobDef.description); // Backup database and files
console.log(jobDef.file);        // /path/to/jobs/backup-job.mjs
```

**Error Conditions:**
- Throws `Error` if job not found
- Throws `Error` if job file cannot be loaded

---

### exists()

```javascript
async exists(jobId: string): Promise<boolean>
```

Check if a job exists.

**Parameters:**
- `jobId` (string, required) - Job identifier or name

**Returns:** `true` if job exists, `false` otherwise

**Example:**
```javascript
const job = useJob();

if (await job.exists('backup-job')) {
  console.log('Job exists');
} else {
  console.log('Job not found');
}
```

**Error Conditions:**
- Never throws; returns `false` on any error

---

## Job Execution

### run()

```javascript
async run(jobId: string, options?: RunOptions): Promise<RunResult>
```

Execute a job immediately without locking or scheduling.

**Parameters:**
- `jobId` (string, required) - Job identifier
- `options.payload` (object, default: `{}`) - Data passed to job
- `options.context` (object, default: `{}`) - Additional context

**Returns:** Job execution result

**Run Result Structure:**
```typescript
interface RunResult {
  ok: boolean;         // Execution success
  result: any;         // Job return value
  duration: number;    // Execution time (ms)
  startedAt: string;   // ISO timestamp
  finishedAt: string;  // ISO timestamp
}
```

**Example:**
```javascript
const job = useJob();

const result = await job.run('backup-job', {
  payload: {
    target: '/backups',
    compress: true
  },
  context: {
    user: 'admin'
  }
});

console.log(result.ok);       // true
console.log(result.duration); // 1234 (ms)
```

**Error Conditions:**
- Throws `Error` if job not found
- Throws `Error` if job definition missing
- Throws `Error` if job execution fails

---

### runWithLock()

```javascript
async runWithLock(jobId: string, options?: RunWithLockOptions): Promise<RunResult>
```

Execute a job with distributed locking to prevent concurrent execution.

**Parameters:**
- `jobId` (string, required) - Job identifier
- `options.payload` (object, default: `{}`) - Data passed to job
- `options.lockOptions` (object) - Lock configuration
  - `lockOptions.timeout` (number, default: `30000`) - Lock timeout (ms)
  - `lockOptions.retryInterval` (number, default: `1000`) - Retry interval (ms)
  - `lockOptions.maxRetries` (number, default: `30`) - Maximum retries

**Returns:** Job execution result (same as `run()`)

**Example:**
```javascript
const job = useJob();

try {
  const result = await job.runWithLock('backup-job', {
    payload: { target: '/backups' },
    lockOptions: {
      timeout: 60000,  // 1 minute timeout
      maxRetries: 60
    }
  });

  console.log('Job completed:', result);
} catch (error) {
  if (error.message.includes('already running')) {
    console.log('Job is already executing');
  }
}
```

**Error Conditions:**
- Throws `Error` with message "Job X is already running" if lock cannot be acquired
- Throws `Error` if job execution fails
- Always releases lock, even on error

---

### runWithBree()

```javascript
async runWithBree(jobId: string, options?: RunOptions): Promise<RunResult>
```

Execute a job using the Bree scheduler with locking and receipts.

**Parameters:**
- `jobId` (string, required) - Job identifier
- `options.payload` (object, default: `{}`) - Data passed to job
- `options.context` (object, default: `{}`) - Additional context

**Returns:** Job execution result with receipt

**Example:**
```javascript
const job = useJob();

const result = await job.runWithBree('backup-job', {
  payload: { target: '/backups' }
});

// Receipt is automatically written to Git notes
console.log(result.ok);
console.log(result.result);
```

**Error Conditions:**
- Throws `Error` if job not found
- Throws `Error` if job definition missing
- Throws `Error` if scheduler execution fails
- Writes error receipt on failure

---

## Job Status

### status()

```javascript
async status(jobId: string): Promise<JobStatus>
```

Get the current status of a job including execution history.

**Parameters:**
- `jobId` (string, required) - Job identifier

**Returns:** Job status object

**Job Status Structure:**
```typescript
interface JobStatus {
  id: string;
  isRunning: boolean;      // Currently executing
  lastRun: string | null;  // ISO timestamp of last run
  lastStatus: string | null; // 'success' | 'error'
  totalRuns: number;       // Total execution count
  successRate: number;     // Percentage (0-100)
}
```

**Example:**
```javascript
const job = useJob();
const status = await job.status('backup-job');

console.log(status.isRunning);    // false
console.log(status.lastRun);      // 2026-01-08T10:30:00Z
console.log(status.lastStatus);   // success
console.log(status.totalRuns);    // 42
console.log(status.successRate);  // 95
```

**Error Conditions:**
- Throws `Error` if status cannot be determined

---

### isRunning()

```javascript
async isRunning(jobId: string): Promise<boolean>
```

Check if a job is currently executing.

**Parameters:**
- `jobId` (string, required) - Job identifier

**Returns:** `true` if job is running, `false` otherwise

**Example:**
```javascript
const job = useJob();

if (await job.isRunning('backup-job')) {
  console.log('Job is currently running');
} else {
  console.log('Job is idle');
}
```

**Error Conditions:**
- Returns `false` on any error

---

## Job History

### history()

```javascript
async history(jobId: string, options?: HistoryOptions): Promise<Receipt[]>
```

Get execution history for a job from receipts.

**Parameters:**
- `jobId` (string, required) - Job identifier
- `options.limit` (number, default: `50`) - Maximum receipts to return
- `options.status` (string) - Filter by status ('success' | 'error')

**Returns:** Array of receipts, newest first

**Receipt Structure:**
```typescript
interface Receipt {
  id: string;
  jobId: string;
  status: 'success' | 'error';
  timestamp: string;      // ISO timestamp
  commit: string;         // Git commit SHA
  branch: string;         // Git branch
  worktree: string;       // Worktree path
  duration?: number;      // Execution time (ms)
  result?: any;           // Job return value
  error?: string;         // Error message (if failed)
  fingerprint: string;    // Verification fingerprint
}
```

**Example:**
```javascript
const job = useJob();

// Get last 10 runs
const history = await job.history('backup-job', { limit: 10 });

// Get only failures
const failures = await job.history('backup-job', {
  limit: 100,
  status: 'error'
});

history.forEach(receipt => {
  console.log(`${receipt.timestamp}: ${receipt.status}`);
});
```

**Error Conditions:**
- Throws `Error` if history cannot be retrieved

---

## Job Management

### validate()

```javascript
async validate(jobId: string): Promise<ValidationResult>
```

Validate a job definition for correctness.

**Parameters:**
- `jobId` (string, required) - Job identifier

**Returns:** Validation result object

**Validation Result Structure:**
```typescript
interface ValidationResult {
  id: string;
  valid: boolean;
  errors: string[];      // Critical errors
  warnings: string[];    // Non-critical warnings
}
```

**Example:**
```javascript
const job = useJob();
const validation = await job.validate('backup-job');

if (validation.valid) {
  console.log('Job is valid');
} else {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

**Validation Checks:**
- Job definition exists
- `run()` function is present and callable
- File exists at specified path
- Metadata is present (warning if missing)
- Description exists (warning if missing)

**Error Conditions:**
- Returns validation result with errors; never throws

---

### validateAll()

```javascript
async validateAll(): Promise<ValidationResult[]>
```

Validate all discovered jobs.

**Returns:** Array of validation results for all jobs

**Example:**
```javascript
const job = useJob();
const results = await job.validateAll();

const invalid = results.filter(r => !r.valid);
console.log(`${invalid.length} invalid jobs found`);

invalid.forEach(result => {
  console.log(`${result.id}: ${result.errors.join(', ')}`);
});
```

**Error Conditions:**
- Throws `Error` if validation cannot be performed

---

## Job Utilities

### search()

```javascript
async search(query: string, options?: SearchOptions): Promise<JobInfo[]>
```

Search for jobs by query string.

**Parameters:**
- `query` (string, required) - Search query
- `options.fields` (string[], default: `['name', 'description', 'tags']`) - Fields to search

**Returns:** Array of matching jobs

**Example:**
```javascript
const job = useJob();

// Search in all fields
const results = await job.search('backup');

// Search only in tags
const tagResults = await job.search('maintenance', {
  fields: ['tags']
});
```

**Error Conditions:**
- Throws `Error` if search fails

---

### getByTag()

```javascript
async getByTag(tag: string): Promise<JobInfo[]>
```

Get all jobs with a specific tag.

**Parameters:**
- `tag` (string, required) - Tag name

**Returns:** Array of jobs with the tag

**Example:**
```javascript
const job = useJob();
const maintenanceJobs = await job.getByTag('maintenance');

maintenanceJobs.forEach(j => {
  console.log(`${j.name}: ${j.description}`);
});
```

**Error Conditions:**
- Throws `Error` if retrieval fails

---

### getCronJobs()

```javascript
async getCronJobs(): Promise<JobInfo[]>
```

Get all jobs that have cron schedules defined.

**Returns:** Array of jobs with cron schedules

**Example:**
```javascript
const job = useJob();
const cronJobs = await job.getCronJobs();

cronJobs.forEach(j => {
  console.log(`${j.name}: ${j.cron}`);
});
```

**Error Conditions:**
- Throws `Error` if retrieval fails

---

## Job Context Helpers

### createContext()

```javascript
async createContext(jobId: string, options?: ContextOptions): Promise<JobContext>
```

Create a full execution context for a job.

**Parameters:**
- `jobId` (string, required) - Job identifier
- `options.payload` (object, default: `{}`) - Job payload
- `options.additionalContext` (object, default: `{}`) - Additional context data

**Returns:** Job execution context

**Job Context Structure:**
```typescript
interface JobContext {
  job: {
    id: string;
    name: string;
    description: string;
    tags: string[];
  };
  git: {
    branch: string;
    head: string;
    worktree: string;
  };
  payload: object;
  timestamp: string;
  [key: string]: any;  // Additional context
}
```

**Example:**
```javascript
const job = useJob();
const context = await job.createContext('backup-job', {
  payload: { target: '/backups' },
  additionalContext: { user: 'admin' }
});

console.log(context.git.branch);
console.log(context.job.name);
```

**Error Conditions:**
- Throws `Error` if context cannot be created

---

## Job Fingerprinting

### getFingerprint()

```javascript
async getFingerprint(jobId: string): Promise<string>
```

Generate a fingerprint (hash) of the job file contents.

**Parameters:**
- `jobId` (string, required) - Job identifier

**Returns:** 16-character hexadecimal fingerprint

**Example:**
```javascript
const job = useJob();
const fingerprint = await job.getFingerprint('backup-job');

console.log(fingerprint); // a1b2c3d4e5f67890
```

**Use Cases:**
- Detect job modifications
- Verify job integrity
- Track job versions

**Error Conditions:**
- Throws `Error` if fingerprint cannot be generated

---

## Job Unrouting

### unroute()

```javascript
unroute(jobId: string): string
```

Convert a job ID to its unrouted name (removes directory prefixes).

**Parameters:**
- `jobId` (string, required) - Job identifier

**Returns:** Unrouted job name

**Example:**
```javascript
const job = useJob();
const unrouted = job.unroute('chat/backup-job');

console.log(unrouted); // backup-job
```

---

### getDirectory()

```javascript
getDirectory(jobId: string): string
```

Get the directory portion of a job ID.

**Parameters:**
- `jobId` (string, required) - Job identifier

**Returns:** Directory path or '.' for root

**Example:**
```javascript
const job = useJob();
const dir = job.getDirectory('chat/backup-job');

console.log(dir); // chat
```

---

### isInDirectory()

```javascript
isInDirectory(jobId: string, directory: string): boolean
```

Check if a job is in a specific directory.

**Parameters:**
- `jobId` (string, required) - Job identifier
- `directory` (string, required) - Directory path

**Returns:** `true` if job is in directory, `false` otherwise

**Example:**
```javascript
const job = useJob();
const inChat = job.isInDirectory('chat/backup-job', 'chat');

console.log(inChat); // true
```

---

### listUnrouted()

```javascript
async listUnrouted(options?: ListOptions): Promise<UnroutedJobInfo[]>
```

List all jobs with unrouting information.

**Parameters:**
- Same as `list()`

**Returns:** Array of jobs with unrouting data

**Unrouted Job Info Structure:**
```typescript
interface UnroutedJobInfo extends JobInfo {
  unroutedName: string;  // Name without directory
  directory: string;      // Directory path
}
```

**Example:**
```javascript
const job = useJob();
const jobs = await job.listUnrouted();

jobs.forEach(j => {
  console.log(`${j.id} -> ${j.unroutedName} in ${j.directory}`);
});
```

---

### getByUnroutedName()

```javascript
async getByUnroutedName(unroutedName: string, options?: ListOptions): Promise<UnroutedJobInfo>
```

Get a job by its unrouted name.

**Parameters:**
- `unroutedName` (string, required) - Unrouted job name
- `options` - Same as `list()`

**Returns:** Job with unrouting information

**Example:**
```javascript
const job = useJob();
const jobInfo = await job.getByUnroutedName('backup-job');

console.log(jobInfo.id);        // chat/backup-job
console.log(jobInfo.directory); // chat
```

**Error Conditions:**
- Throws `Error` if job not found

---

### getByDirectory()

```javascript
async getByDirectory(directory: string, options?: ListOptions): Promise<UnroutedJobInfo[]>
```

Get all jobs in a specific directory.

**Parameters:**
- `directory` (string, required) - Directory path
- `options` - Same as `list()`

**Returns:** Array of jobs in the directory

**Example:**
```javascript
const job = useJob();
const chatJobs = await job.getByDirectory('chat');

chatJobs.forEach(j => {
  console.log(j.name);
});
```

---

### createUnrouteMapping()

```javascript
createUnrouteMapping(jobIds: string[]): Record<string, string>
```

Create a mapping from job IDs to unrouted names.

**Parameters:**
- `jobIds` (string[], required) - Array of job IDs

**Returns:** Mapping object

**Example:**
```javascript
const job = useJob();
const mapping = job.createUnrouteMapping([
  'chat/backup-job',
  'docs/changelog'
]);

console.log(mapping);
// { 'chat/backup-job': 'backup-job', 'docs/changelog': 'changelog' }
```

---

### unrouteAll()

```javascript
unrouteAll(jobIds: string[]): string[]
```

Convert multiple job IDs to unrouted names.

**Parameters:**
- `jobIds` (string[], required) - Array of job IDs

**Returns:** Array of unrouted names

**Example:**
```javascript
const job = useJob();
const unrouted = job.unrouteAll(['chat/backup-job', 'docs/changelog']);

console.log(unrouted); // ['backup-job', 'changelog']
```

---

## Bree Scheduler Management

### schedule()

```javascript
async schedule(jobId: string, options?: ScheduleOptions): Promise<ScheduleResult>
```

Schedule a job with the Bree scheduler.

**Parameters:**
- `jobId` (string, required) - Job identifier
- `options.cron` (string) - Cron schedule (overrides job definition)
- `options.interval` (number) - Interval in milliseconds
- `options.timeout` (number) - Job timeout in milliseconds
- `options.date` (Date) - One-time execution date

**Returns:** Schedule result

**Schedule Result Structure:**
```typescript
interface ScheduleResult {
  jobId: string;
  scheduled: boolean;
}
```

**Example:**
```javascript
const job = useJob();

// Schedule with cron
await job.schedule('backup-job', {
  cron: '0 2 * * *'  // Daily at 2 AM
});

// Schedule with interval
await job.schedule('health-check', {
  interval: 60000  // Every minute
});

// One-time execution
await job.schedule('migration', {
  date: new Date('2026-01-15T00:00:00Z')
});
```

**Error Conditions:**
- Throws `Error` if job not found
- Throws `Error` if scheduling fails

---

### unschedule()

```javascript
async unschedule(jobId: string): Promise<UnscheduleResult>
```

Remove a job from the scheduler.

**Parameters:**
- `jobId` (string, required) - Job identifier

**Returns:** Unschedule result

**Unschedule Result Structure:**
```typescript
interface UnscheduleResult {
  jobId: string;
  unscheduled: boolean;
}
```

**Example:**
```javascript
const job = useJob();
await job.unschedule('backup-job');
```

**Error Conditions:**
- Throws `Error` if unscheduling fails

---

### startScheduler()

```javascript
async startScheduler(): Promise<StartResult>
```

Start the Bree scheduler to begin executing scheduled jobs.

**Returns:** Start result

**Start Result Structure:**
```typescript
interface StartResult {
  started: boolean;
}
```

**Example:**
```javascript
const job = useJob();
await job.startScheduler();

console.log('Scheduler is running');
```

**Error Conditions:**
- Throws `Error` if scheduler cannot be started

---

### stopScheduler()

```javascript
async stopScheduler(): Promise<StopResult>
```

Stop the Bree scheduler (jobs will not execute while stopped).

**Returns:** Stop result

**Stop Result Structure:**
```typescript
interface StopResult {
  stopped: boolean;
}
```

**Example:**
```javascript
const job = useJob();
await job.stopScheduler();

console.log('Scheduler stopped');
```

**Error Conditions:**
- Throws `Error` if scheduler cannot be stopped

---

### getSchedulerStatus()

```javascript
getSchedulerStatus(): SchedulerStatus
```

Get the current status of the Bree scheduler.

**Returns:** Scheduler status (synchronous)

**Scheduler Status Structure:**
```typescript
interface SchedulerStatus {
  isRunning: boolean;
  jobCount: number;
  jobs: Array<{
    name: string;
    cron?: string;
    interval?: number;
  }>;
}
```

**Example:**
```javascript
const job = useJob();
const status = job.getSchedulerStatus();

console.log(`Scheduler running: ${status.isRunning}`);
console.log(`Jobs scheduled: ${status.jobCount}`);
status.jobs.forEach(j => {
  console.log(`- ${j.name}: ${j.cron || j.interval}`);
});
```

**Error Conditions:**
- Throws `Error` if status cannot be retrieved

---

### listScheduledJobs()

```javascript
listScheduledJobs(): ScheduledJob[]
```

List all jobs currently scheduled in Bree.

**Returns:** Array of scheduled jobs (synchronous)

**Scheduled Job Structure:**
```typescript
interface ScheduledJob {
  name: string;
  cron?: string;
  interval?: number;
}
```

**Example:**
```javascript
const job = useJob();
const scheduled = job.listScheduledJobs();

scheduled.forEach(j => {
  console.log(`${j.name}: ${j.cron || `${j.interval}ms`}`);
});
```

**Error Conditions:**
- Throws `Error` if list cannot be retrieved

---

### autoScheduleCronJobs()

```javascript
async autoScheduleCronJobs(): Promise<AutoScheduleResult[]>
```

Automatically schedule all jobs that have cron definitions.

**Returns:** Array of schedule results

**Auto Schedule Result Structure:**
```typescript
interface AutoScheduleResult {
  jobId: string;
  scheduled: boolean;
  error?: string;
}
```

**Example:**
```javascript
const job = useJob();
const results = await job.autoScheduleCronJobs();

const successful = results.filter(r => r.scheduled);
const failed = results.filter(r => !r.scheduled);

console.log(`Scheduled: ${successful.length}`);
console.log(`Failed: ${failed.length}`);

failed.forEach(r => {
  console.log(`${r.jobId}: ${r.error}`);
});
```

**Error Conditions:**
- Throws `Error` if auto-scheduling fails
- Individual job failures are captured in results

---

### shutdownScheduler()

```javascript
async shutdownScheduler(): Promise<ShutdownResult>
```

Gracefully shutdown the Bree scheduler and cleanup resources.

**Returns:** Shutdown result

**Shutdown Result Structure:**
```typescript
interface ShutdownResult {
  shutdown: boolean;
}
```

**Example:**
```javascript
const job = useJob();

// Shutdown before process exit
process.on('SIGTERM', async () => {
  await job.shutdownScheduler();
  process.exit(0);
});
```

**Shutdown Process:**
1. Stop the scheduler
2. Stop all running jobs
3. Cleanup worker files
4. Clear job contexts
5. Reset internal state

**Error Conditions:**
- Throws `Error` if shutdown fails

---

## BreeScheduler Class

Internal class that manages the Bree instance. Typically accessed through `useJob()`, but can be used directly for advanced scenarios.

### Constructor

```javascript
new BreeScheduler(options?: BreeSchedulerOptions)
```

**Options:**
```typescript
interface BreeSchedulerOptions {
  cwd?: string;                  // Working directory
  jobsDir?: string;              // Jobs directory (default: cwd/jobs)
  timeout?: number;              // Default job timeout (default: 0 = no timeout)
  interval?: number;             // Default interval (default: 1000ms)
  closeWorkerAfterMs?: number;   // Worker cleanup delay (default: 5000ms)
  removeCompleted?: boolean;     // Remove completed jobs (default: true)
  breeConfig?: object;           // Additional Bree configuration
}
```

### Methods

#### init()

```javascript
async init(): Promise<void>
```

Initialize the Bree instance.

**Example:**
```javascript
import { BreeScheduler } from 'gitvan';

const scheduler = new BreeScheduler({ cwd: '/path/to/project' });
await scheduler.init();
```

#### start()

```javascript
async start(): Promise<void>
```

Start the scheduler.

#### stop()

```javascript
async stop(): Promise<void>
```

Stop the scheduler.

#### addJob()

```javascript
async addJob(jobConfig: BreeJobConfig): Promise<BreeJobConfig>
```

Add a job to the scheduler.

**Job Config:**
```typescript
interface BreeJobConfig {
  name: string;
  path: string;
  cron?: string;
  interval?: number;
  timeout?: number;
  date?: Date;
  worker?: {
    workerData?: any;
  };
}
```

#### removeJob()

```javascript
async removeJob(name: string): Promise<void>
```

Remove a job from the scheduler.

#### runJob()

```javascript
async runJob(name: string): Promise<void>
```

Run a job immediately.

#### startJob()

```javascript
async startJob(name: string): Promise<void>
```

Start a specific job's schedule.

#### stopJob()

```javascript
async stopJob(name: string): Promise<void>
```

Stop a specific job's schedule.

#### listJobs()

```javascript
listJobs(): BreeJobConfig[]
```

List all jobs in the scheduler.

#### getJob()

```javascript
getJob(name: string): BreeJobConfig | null
```

Get a specific job configuration.

#### hasJob()

```javascript
hasJob(name: string): boolean
```

Check if a job exists in the scheduler.

#### getStatus()

```javascript
getStatus(): SchedulerStatus
```

Get scheduler status.

#### shutdown()

```javascript
async shutdown(): Promise<void>
```

Gracefully shutdown the scheduler.

#### onWorkerMessage()

```javascript
onWorkerMessage(jobName: string, handler: (message: any) => void | Promise<void>): void
```

Register a handler for worker messages.

---

## JobBridge Class

Adapter class that converts GitVan job definitions to Bree-compatible format and manages execution context.

### Constructor

```javascript
new JobBridge(options?: JobBridgeOptions)
```

**Options:**
```typescript
interface JobBridgeOptions {
  cwd?: string;          // Working directory
  workerDir?: string;    // Worker files directory (default: .gitvan/workers)
}
```

### Methods

#### toBreeJobConfig()

```javascript
toBreeJobConfig(jobDef: JobDefinition, options?: ScheduleOptions): BreeJobConfig
```

Convert a GitVan job definition to Bree job configuration.

**Parameters:**
- `jobDef` (JobDefinition) - GitVan job definition
- `options` (ScheduleOptions) - Schedule options

**Returns:** Bree job configuration

#### createWorkerFile()

```javascript
createWorkerFile(jobDef: JobDefinition): string
```

Generate a worker file for a job.

**Returns:** Absolute path to worker file

**Worker File Template:**
- Auto-generated ES module
- Imports job definition using file:// URL
- Handles Windows path compatibility
- Executes job with context and payload
- Posts messages to parent thread
- Error handling and reporting

#### scheduleJob()

```javascript
async scheduleJob(jobDef: JobDefinition, options?: ScheduleOptions): Promise<BreeJobConfig>
```

Schedule a job with Bree.

#### unscheduleJob()

```javascript
async unscheduleJob(jobId: string): Promise<void>
```

Unschedule a job.

#### executeJobWithLock()

```javascript
async executeJobWithLock(jobDef: JobDefinition, options?: ExecuteOptions): Promise<RunResult>
```

Execute a job with locking and receipts.

**Process:**
1. Acquire distributed lock
2. Build execution context
3. Create/update Bree job
4. Execute job via Bree
5. Write receipt to Git notes
6. Release lock (always)

**Options:**
```typescript
interface ExecuteOptions {
  payload?: object;
  context?: object;
  force?: boolean;  // Force execution even if locked
}
```

#### generateFingerprint()

```javascript
generateFingerprint(jobId: string, head: string, payload: object): string
```

Generate execution fingerprint for receipts.

**Fingerprint Formula:**
```
SHA256(jobId + @ + head + @ + SHA256(payload)) -> 16 chars
```

#### start()

```javascript
async start(): Promise<void>
```

Start the underlying scheduler.

#### stop()

```javascript
async stop(): Promise<void>
```

Stop the underlying scheduler.

#### getStatus()

```javascript
getStatus(): SchedulerStatus
```

Get scheduler status.

#### shutdown()

```javascript
async shutdown(): Promise<void>
```

Shutdown bridge and cleanup resources.

**Cleanup Actions:**
- Shutdown scheduler
- Delete generated worker files
- Clear job contexts
- Reset internal state

### Properties

#### scheduler

```javascript
scheduler: BreeScheduler
```

Access to underlying BreeScheduler instance.

#### workerDir

```javascript
workerDir: string
```

Directory where worker files are generated.

#### createdWorkerFiles

```javascript
createdWorkerFiles: Set<string>
```

Set of worker file paths created by the bridge (for cleanup).

---

## Worker Thread Protocol

Worker threads communicate with the main thread via message passing. GitVan uses a structured message protocol.

### Message Types

#### Success Message

```typescript
interface SuccessMessage {
  type: 'success';
  jobId: string;
  result: any;
  timestamp: string;  // ISO timestamp
}
```

**Sent When:** Job completes successfully

**Example:**
```javascript
parentPort.postMessage({
  type: 'success',
  jobId: 'backup-job',
  result: { filesBackedUp: 42, size: '1.2GB' },
  timestamp: '2026-01-08T10:30:00Z'
});
```

#### Error Message

```typescript
interface ErrorMessage {
  type: 'error';
  jobId: string;
  error: {
    message: string;
    stack: string;
  };
  timestamp: string;
}
```

**Sent When:** Job execution fails

**Example:**
```javascript
parentPort.postMessage({
  type: 'error',
  jobId: 'backup-job',
  error: {
    message: 'Failed to access backup directory',
    stack: 'Error: Failed to access...\n  at ...'
  },
  timestamp: '2026-01-08T10:30:00Z'
});
```

### Worker Data

Data passed from main thread to worker thread via `workerData`.

```typescript
interface WorkerData {
  jobId: string;
  jobFile: string;
  meta: object;
  context: {
    cwd: string;
    env: Record<string, string>;
    git: GitInfo;
    payload: object;
  };
  payload: object;
}
```

### Worker Lifecycle

1. **Worker Creation**
   - Main thread generates worker file
   - Bree creates worker thread
   - Worker imports job definition

2. **Execution**
   - Worker receives workerData
   - Job `run()` function is called
   - Result or error is generated

3. **Communication**
   - Worker posts message to parent
   - Parent handles message
   - Receipt is written

4. **Cleanup**
   - Worker thread terminates
   - Worker file may be deleted (if cleanup enabled)
   - Context is cleared

### Error Handling in Workers

Workers have automatic error handling:

```javascript
try {
  const result = await runFn({ payload, ctx: context, context });

  if (parentPort) {
    parentPort.postMessage({
      type: 'success',
      jobId: workerData.jobId,
      result,
      timestamp: new Date().toISOString()
    });
  }
} catch (error) {
  if (parentPort) {
    parentPort.postMessage({
      type: 'error',
      jobId: workerData.jobId,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
  }

  throw error;  // Re-throw for Bree to handle
}
```

---

## Complete Usage Example

```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan({ cwd: '/path/to/project' }, async () => {
  const job = useJob();

  // Discover jobs
  const jobs = await job.list();
  console.log(`Found ${jobs.length} jobs`);

  // Validate all jobs
  const validations = await job.validateAll();
  const invalid = validations.filter(v => !v.valid);
  if (invalid.length > 0) {
    console.log('Invalid jobs:', invalid);
  }

  // Auto-schedule cron jobs
  await job.autoScheduleCronJobs();

  // Start scheduler
  await job.startScheduler();
  console.log('Scheduler started');

  // Check status
  const status = job.getSchedulerStatus();
  console.log(`Running: ${status.isRunning}, Jobs: ${status.jobCount}`);

  // Run a job manually
  const result = await job.runWithLock('backup-job', {
    payload: { target: '/backups' }
  });
  console.log('Job result:', result);

  // Check history
  const history = await job.history('backup-job', { limit: 10 });
  console.log(`Last ${history.length} runs`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await job.shutdownScheduler();
    process.exit(0);
  });
});
```

---

## See Also

- [Architecture & Design Document](../ARCHITECTURE-BREE-INTEGRATION.md)
- [Troubleshooting Guide](../TROUBLESHOOTING-JOBS.md)
- [Integration Examples](../INTEGRATION-EXAMPLES-JOBS.md)
- [Quick Start Guide](../QUICKSTART-JOBS.md)
