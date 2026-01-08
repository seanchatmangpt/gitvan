# GitVan API Changelog - v4.0.0

**Date:** January 8, 2026
**Version:** 4.0.0
**Previous Version:** 3.1.0
**Breaking Changes:** NONE
**Deprecations:** NONE

---

## Overview

GitVan v4.0.0 introduces **8 new API methods** to the `useJob()` composable, adding enterprise-grade job scheduling capabilities via Bree integration. All existing APIs remain fully compatible with zero breaking changes.

**Summary:**
- **New APIs:** 8 methods in `useJob()` composable
- **Modified APIs:** 0
- **Deprecated APIs:** 0
- **Removed APIs:** 0
- **Backward Compatibility:** 100%

---

## New APIs in v4.0.0

### 1. `job.schedule(jobId, options)` - NEW

Schedule a job for recurring execution using cron expressions or intervals.

**Signature:**
```javascript
async schedule(jobId: string, options: ScheduleOptions): Promise<void>
```

**Parameters:**
- `jobId` (string, required): Job identifier (filename without .mjs extension)
- `options` (object, required):
  - `cron` (string, optional): Cron expression (e.g., "0 * * * *")
  - `interval` (number, optional): Milliseconds between executions
  - `timeout` (number, optional): Job timeout in milliseconds (default: 300000)
  - One of `cron` or `interval` must be provided

**Returns:** Promise<void>

**Throws:**
- `Error` if job file not found
- `Error` if neither cron nor interval specified
- `Error` if both cron and interval specified

**Example (v4.0.0 - NEW):**
```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Schedule with cron (every hour)
  await job.schedule('cleanup', { cron: '0 * * * *' });

  // Schedule with interval (every 60 seconds)
  await job.schedule('health-check', { interval: 60000 });

  // Schedule with custom timeout
  await job.schedule('long-task', {
    cron: '0 0 * * *',  // Daily at midnight
    timeout: 600000     // 10 minute timeout
  });
});
```

**v3.x Alternative (still works):**
```javascript
// Manual scheduling via cron in job definition file
// jobs/cleanup.mjs
export const cron = '0 * * * *';
export default async function run({ payload, ctx }) {
  // Job logic
}
```

---

### 2. `job.unschedule(jobId)` - NEW

Remove a job from the scheduler.

**Signature:**
```javascript
async unschedule(jobId: string): Promise<void>
```

**Parameters:**
- `jobId` (string, required): Job identifier to remove from scheduler

**Returns:** Promise<void>

**Example (v4.0.0 - NEW):**
```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Remove job from scheduler
  await job.unschedule('cleanup');

  console.log('Job removed from scheduler');
});
```

**v3.x Alternative:**
```javascript
// No equivalent - manual process management required
```

---

### 3. `job.startScheduler()` - NEW

Start the Bree job scheduler.

**Signature:**
```javascript
async startScheduler(): Promise<void>
```

**Parameters:** None

**Returns:** Promise<void>

**Example (v4.0.0 - NEW):**
```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Start scheduler
  await job.startScheduler();

  console.log('Scheduler started - jobs will run on schedule');
});
```

**v3.x Alternative:**
```javascript
// No equivalent - no background scheduler in v3.x
```

---

### 4. `job.stopScheduler()` - NEW

Stop the Bree job scheduler gracefully.

**Signature:**
```javascript
async stopScheduler(): Promise<void>
```

**Parameters:** None

**Returns:** Promise<void>

**Example (v4.0.0 - NEW):**
```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Stop scheduler gracefully
  await job.stopScheduler();

  console.log('Scheduler stopped - all jobs cancelled');
});
```

**v3.x Alternative:**
```javascript
// No equivalent
```

---

### 5. `job.getSchedulerStatus()` - NEW

Get current status of the Bree scheduler.

**Signature:**
```javascript
async getSchedulerStatus(): Promise<SchedulerStatus>
```

**Parameters:** None

**Returns:** Promise<SchedulerStatus>
```typescript
interface SchedulerStatus {
  running: boolean;
  jobCount: number;
  jobs: Array<{
    name: string;
    cron?: string;
    interval?: number;
    timeout: number;
  }>;
}
```

**Example (v4.0.0 - NEW):**
```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  const status = await job.getSchedulerStatus();

  console.log('Scheduler running:', status.running);
  console.log('Jobs scheduled:', status.jobCount);

  status.jobs.forEach(j => {
    console.log(`- ${j.name}: ${j.cron || `${j.interval}ms`}`);
  });
});
```

**Output Example:**
```
Scheduler running: true
Jobs scheduled: 3
- cleanup: 0 * * * *
- health-check: 60000ms
- daily-report: 0 0 * * *
```

**v3.x Alternative:**
```javascript
// No equivalent
```

---

### 6. `job.listScheduledJobs()` - NEW

List all jobs currently scheduled in Bree.

**Signature:**
```javascript
async listScheduledJobs(): Promise<string[]>
```

**Parameters:** None

**Returns:** Promise<string[]> - Array of job names

**Example (v4.0.0 - NEW):**
```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  const scheduled = await job.listScheduledJobs();

  console.log('Scheduled jobs:', scheduled);
  // Output: ['cleanup', 'health-check', 'daily-report']
});
```

**v3.x Alternative:**
```javascript
// List all jobs (not just scheduled ones)
const job = useJob();
const allJobs = await job.list();
console.log('All jobs:', allJobs.map(j => j.id));
```

---

### 7. `job.runWithBree(jobId, payload)` - NEW

Execute a job via Bree worker thread (instead of direct execution).

**Signature:**
```javascript
async runWithBree(jobId: string, payload?: object): Promise<void>
```

**Parameters:**
- `jobId` (string, required): Job identifier
- `payload` (object, optional): Data to pass to job

**Returns:** Promise<void>

**Example (v4.0.0 - NEW):**
```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Execute via Bree worker thread
  await job.runWithBree('cleanup', {
    mode: 'aggressive',
    days: 30
  });

  console.log('Job executed in worker thread');
});
```

**v3.x Alternative (still works in v4.0.0):**
```javascript
// Direct execution (main process)
const job = useJob();
await job.run('cleanup', {
  payload: { mode: 'aggressive', days: 30 }
});
```

**Key Differences:**
| Feature | `run()` (v3.x) | `runWithBree()` (v4.0.0) |
|---------|----------------|--------------------------|
| Execution | Main process | Worker thread |
| Isolation | None | Complete |
| Crash handling | Affects main | Isolated |
| Memory | Shared | Separate (~10-20MB) |
| Parallelism | Sequential | True parallel |

---

### 8. `job.autoScheduleCronJobs()` - NEW

Automatically schedule all jobs that have `cron` definitions in their files.

**Signature:**
```javascript
async autoScheduleCronJobs(): Promise<number>
```

**Parameters:** None

**Returns:** Promise<number> - Count of jobs scheduled

**Example (v4.0.0 - NEW):**
```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Scan jobs directory and auto-schedule all with cron definitions
  const count = await job.autoScheduleCronJobs();

  console.log(`Auto-scheduled ${count} jobs`);
});
```

**Job File Example:**
```javascript
// jobs/cleanup.mjs
export const meta = {
  name: "Cleanup",
  desc: "Clean old files"
};

export const cron = "0 2 * * *";  // 2am daily

export default async function run({ payload, ctx }) {
  // Job logic
}
```

**v3.x Alternative:**
```javascript
// Manual scheduling required for each job
const job = useJob();
await job.schedule('cleanup', { cron: '0 2 * * *' });
await job.schedule('backup', { cron: '0 3 * * *' });
await job.schedule('report', { cron: '0 9 * * 1' });
```

---

## Existing APIs (Unchanged)

All v3.x APIs continue to work without modification:

### `job.run(jobId, options)` - UNCHANGED

Execute a job immediately in the main process.

**v3.x Signature (still valid):**
```javascript
async run(jobId: string, options?: { payload?: object }): Promise<any>
```

**Example:**
```javascript
// Works identically in v3.x and v4.0.0
const job = useJob();
const result = await job.run('cleanup', {
  payload: { days: 30 }
});
```

**No changes required when upgrading.**

---

### `job.list()` - UNCHANGED

List all available jobs in the jobs directory.

**v3.x Signature (still valid):**
```javascript
async list(): Promise<JobInfo[]>
```

**Example:**
```javascript
// Works identically in v3.x and v4.0.0
const job = useJob();
const jobs = await job.list();

jobs.forEach(j => {
  console.log(`${j.id}: ${j.meta.name}`);
});
```

**No changes required when upgrading.**

---

### `job.scan()` - UNCHANGED

Scan jobs directory for job definitions.

**v3.x Signature (still valid):**
```javascript
async scan(): Promise<string[]>
```

**Example:**
```javascript
// Works identically in v3.x and v4.0.0
const job = useJob();
const jobPaths = await job.scan();
console.log('Found jobs:', jobPaths);
```

**No changes required when upgrading.**

---

## CLI Commands

### New Commands in v4.0.0

**6 new subcommands added to `gitvan job` command:**

1. **`gitvan job schedule <job-id>`**
   ```bash
   # Schedule with cron
   gitvan job schedule cleanup --cron "0 * * * *"

   # Schedule with interval (milliseconds)
   gitvan job schedule health-check --interval 60000
   ```

2. **`gitvan job unschedule <job-id>`**
   ```bash
   gitvan job unschedule cleanup
   ```

3. **`gitvan job start-scheduler`**
   ```bash
   gitvan job start-scheduler
   ```

4. **`gitvan job stop-scheduler`**
   ```bash
   gitvan job stop-scheduler
   ```

5. **`gitvan job scheduler-status`**
   ```bash
   gitvan job scheduler-status
   # Output:
   # Scheduler Status: running
   # Jobs scheduled: 3
   # - cleanup (0 * * * *)
   # - health-check (60000ms interval)
   ```

6. **`gitvan job auto-schedule`**
   ```bash
   gitvan job auto-schedule
   # Output: Auto-scheduled 5 jobs
   ```

### Existing Commands (Unchanged)

All v3.x commands still work:

```bash
# List all jobs
gitvan job list

# Run a job immediately
gitvan job run cleanup

# Show job history
gitvan job history cleanup
```

---

## Migration Guide: v3.x → v4.0.0

### Option 1: No Changes Required (Backward Compatible)

Continue using v3.x APIs with zero code changes:

```javascript
// v3.x code - works identically in v4.0.0
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  const jobs = await job.list();
  const result = await job.run('cleanup', { payload: { days: 30 } });
});
```

**No migration needed!**

---

### Option 2: Adopt New Bree Scheduler (Opt-In)

Gradually adopt new scheduling features:

**Step 1: Update job definitions with cron**
```javascript
// jobs/cleanup.mjs
export const cron = "0 * * * *";  // Add this line

export default async function run({ payload, ctx }) {
  // Existing job logic - no changes
}
```

**Step 2: Auto-schedule jobs**
```bash
gitvan job auto-schedule
```

**Step 3: Start scheduler**
```bash
gitvan job start-scheduler
```

**Step 4: Verify**
```bash
gitvan job scheduler-status
```

---

### Option 3: Programmatic Scheduling

Use new APIs for dynamic scheduling:

```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Schedule jobs programmatically
  await job.schedule('cleanup', { cron: '0 * * * *' });
  await job.schedule('backup', { cron: '0 3 * * *' });
  await job.schedule('health', { interval: 60000 });

  // Start scheduler
  await job.startScheduler();

  // Check status
  const status = await job.getSchedulerStatus();
  console.log(`${status.jobCount} jobs running`);
});
```

---

## API Comparison: v3.x vs v4.0.0

| Feature | v3.x | v4.0.0 | Notes |
|---------|------|--------|-------|
| **Direct job execution** | ✅ `job.run()` | ✅ `job.run()` | Unchanged |
| **List jobs** | ✅ `job.list()` | ✅ `job.list()` | Unchanged |
| **Scan jobs directory** | ✅ `job.scan()` | ✅ `job.scan()` | Unchanged |
| **Schedule with cron** | ❌ | ✅ `job.schedule()` | NEW |
| **Schedule with interval** | ❌ | ✅ `job.schedule()` | NEW |
| **Unschedule job** | ❌ | ✅ `job.unschedule()` | NEW |
| **Start scheduler** | ❌ | ✅ `job.startScheduler()` | NEW |
| **Stop scheduler** | ❌ | ✅ `job.stopScheduler()` | NEW |
| **Scheduler status** | ❌ | ✅ `job.getSchedulerStatus()` | NEW |
| **List scheduled** | ❌ | ✅ `job.listScheduledJobs()` | NEW |
| **Worker execution** | ❌ | ✅ `job.runWithBree()` | NEW |
| **Auto-schedule** | ❌ | ✅ `job.autoScheduleCronJobs()` | NEW |
| **Worker threads** | ❌ | ✅ Via Bree | NEW |
| **Cron scheduling** | ❌ | ✅ Standard syntax | NEW |
| **Job isolation** | ❌ | ✅ Worker sandboxing | NEW |

---

## Breaking Changes

**NONE.** All v3.x APIs work identically in v4.0.0.

---

## Deprecations

**NONE.** No APIs are deprecated in this release.

---

## Configuration Changes

### New Configuration Options in `gitvan.config.js`

```javascript
export default {
  jobs: {
    dir: "jobs",  // Unchanged

    // NEW: Bree-specific configuration (optional)
    bree: {
      timeout: 300000,              // Default job timeout (5 min)
      interval: 1000,               // Scheduler check interval (1 sec)
      closeWorkerAfterMs: 5000,     // Worker cleanup delay (5 sec)
      removeCompleted: true,        // Remove completed jobs from queue
      worker: {
        workerData: {},             // Custom worker data
      }
    }
  }
}
```

**All Bree options are optional.** Defaults are production-ready.

---

## Type Definitions (if using TypeScript)

```typescript
// New types in v4.0.0
interface ScheduleOptions {
  cron?: string;        // Cron expression
  interval?: number;    // Milliseconds
  timeout?: number;     // Job timeout
}

interface SchedulerStatus {
  running: boolean;     // Is scheduler active
  jobCount: number;     // Number of scheduled jobs
  jobs: JobSchedule[];  // Details of each job
}

interface JobSchedule {
  name: string;         // Job ID
  cron?: string;        // Cron expression (if used)
  interval?: number;    // Interval in ms (if used)
  timeout: number;      // Job timeout
}

// useJob() interface extended
interface UseJob {
  // v3.x methods (unchanged)
  run(jobId: string, options?: { payload?: object }): Promise<any>;
  list(): Promise<JobInfo[]>;
  scan(): Promise<string[]>;

  // v4.0.0 new methods
  schedule(jobId: string, options: ScheduleOptions): Promise<void>;
  unschedule(jobId: string): Promise<void>;
  startScheduler(): Promise<void>;
  stopScheduler(): Promise<void>;
  getSchedulerStatus(): Promise<SchedulerStatus>;
  listScheduledJobs(): Promise<string[]>;
  runWithBree(jobId: string, payload?: object): Promise<void>;
  autoScheduleCronJobs(): Promise<number>;
}
```

---

## Performance Considerations

### Worker Thread Overhead

Each active worker consumes:
- **Memory:** ~10-20MB per worker
- **Startup:** ~50-100ms per worker
- **Cleanup:** Automatic after 5 seconds of inactivity

**Recommendation:** Monitor worker count in high-frequency scenarios.

### Scheduling Overhead

Bree scheduler adds:
- **Memory:** ~1-2MB baseline
- **CPU:** Minimal (event-driven)
- **Latency:** <100ms from scheduled time

**Recommendation:** Suitable for production workloads.

---

## Security Considerations

### Worker Thread Isolation

Workers run in isolated contexts:
- Separate memory space
- No shared state
- Crashes don't affect main process
- Clean environment per execution

**Impact:** Enhanced security and stability.

### Import Path Security

Job imports use file:// URLs with validation:
- No path injection vulnerabilities
- Strict path resolution
- Platform-independent

**Impact:** Safe dynamic job loading.

---

## Examples

### Example 1: Basic Scheduling

```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Schedule a daily backup at 3am
  await job.schedule('backup', {
    cron: '0 3 * * *',
    timeout: 600000  // 10 minute timeout
  });

  // Start the scheduler
  await job.startScheduler();

  console.log('Backup scheduled for 3am daily');
});
```

### Example 2: Health Check with Interval

```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Health check every 60 seconds
  await job.schedule('health-check', {
    interval: 60000  // 60 seconds
  });

  await job.startScheduler();

  console.log('Health check running every 60 seconds');
});
```

### Example 3: Auto-Schedule All Jobs

```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Auto-schedule all jobs with cron definitions
  const count = await job.autoScheduleCronJobs();

  // Start scheduler
  await job.startScheduler();

  // Check status
  const status = await job.getSchedulerStatus();

  console.log(`Scheduled ${count} jobs`);
  console.log(`Scheduler running: ${status.running}`);

  status.jobs.forEach(j => {
    console.log(`- ${j.name}: ${j.cron || `${j.interval}ms`}`);
  });
});
```

### Example 4: Dynamic Job Management

```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Start with some jobs
  await job.schedule('cleanup', { cron: '0 * * * *' });
  await job.schedule('report', { cron: '0 9 * * 1' });
  await job.startScheduler();

  // Later: add more jobs dynamically
  await job.schedule('new-task', { interval: 300000 });

  // Even later: remove a job
  await job.unschedule('cleanup');

  // Check what's still scheduled
  const scheduled = await job.listScheduledJobs();
  console.log('Currently scheduled:', scheduled);
  // Output: ['report', 'new-task']
});
```

---

## Troubleshooting

### Issue: "Job not found" when scheduling

**Cause:** Job file doesn't exist or wrong path

**Solution:**
```javascript
// Verify job exists first
const job = useJob();
const jobs = await job.list();
console.log('Available jobs:', jobs.map(j => j.id));

// Then schedule
await job.schedule('existing-job-id', { cron: '0 * * * *' });
```

### Issue: Scheduler not running jobs

**Cause:** Scheduler not started

**Solution:**
```javascript
const job = useJob();
await job.schedule('my-job', { cron: '0 * * * *' });
await job.startScheduler();  // Don't forget this!
```

### Issue: Worker memory growing

**Cause:** Workers not cleaning up (rare)

**Solution:** Configure shorter cleanup delay:
```javascript
// gitvan.config.js
export default {
  jobs: {
    bree: {
      closeWorkerAfterMs: 2000  // 2 seconds instead of 5
    }
  }
}
```

---

## FAQ

**Q: Do I need to rewrite my jobs for v4.0.0?**
A: No. All existing jobs work without changes.

**Q: Can I mix direct execution and scheduled execution?**
A: Yes. Use `job.run()` for immediate execution and `job.schedule()` for recurring tasks.

**Q: What happens if I upgrade and don't use the new scheduler?**
A: Nothing changes. Your code works identically to v3.x.

**Q: Can I schedule the same job with both cron and interval?**
A: No. Choose one scheduling method per job.

**Q: How do I migrate from manual cron to Bree?**
A: Add `export const cron = "..."` to your job files, then run `gitvan job auto-schedule`.

---

## Resources

- **Full Release Notes:** `/home/user/gitvan/RELEASE_NOTES_v4.0.0.md`
- **Migration Guide:** `/home/user/gitvan/MIGRATION_GUIDE_v4.0.0.md`
- **FAQ:** `/home/user/gitvan/FAQ_v4.0.0.md`
- **Bree Documentation:** https://github.com/breejs/bree
- **Cron Syntax Reference:** https://crontab.guru/

---

**API Changelog Version:** 1.0
**Created:** January 8, 2026
**Status:** ✅ Complete

---

**END OF API CHANGELOG**
