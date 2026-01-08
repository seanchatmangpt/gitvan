# Migration Guide: GitVan v3.x to v4.0.0 Jobs

## Table of Contents

- [Breaking Changes](#breaking-changes)
- [New Features in v4.0.0](#new-features-in-v400)
- [How to Update Existing Jobs](#how-to-update-existing-jobs)
- [Configuration Changes](#configuration-changes)
- [Code Examples for Migration](#code-examples-for-migration)
- [Testing Migration](#testing-migration)
- [Rollback Procedures](#rollback-procedures)

---

## Breaking Changes

### 1. Bree Scheduler Integration

**Change:** v4.0.0 uses Bree for scheduling instead of custom scheduler

**Impact:** Low - API remains backward compatible

**Action Required:** None for basic usage

### 2. Worker Thread Execution

**Change:** Scheduled jobs now run in worker threads via Bree

**Impact:** Medium - Jobs must be worker-thread compatible

**Action Required:**
- Ensure jobs don't rely on shared state
- Avoid global variables
- Use context for configuration

### 3. Lock System Enhancement

**Change:** Lock TTL and worktree-aware locking

**Impact:** Low - Existing lock code works

**Action Required:** None, but recommended to add TTL:

```javascript
// v3.x
await lock.acquire('job-name');

// v4.0.0 (recommended)
await lock.acquire('job-name', {
  timeout: 300000  // 5 min TTL
});
```

---

## New Features in v4.0.0

### 1. Bree Scheduler

- Production-ready job scheduling
- Robust cron parsing
- Graceful shutdown
- Worker thread isolation

**New Methods:**
```javascript
await job.schedule(jobId, options)
await job.unschedule(jobId)
await job.startScheduler()
await job.stopScheduler()
await job.autoScheduleCronJobs()
await job.shutdownScheduler()
```

### 2. Enhanced Lock System

- TTL-based expiration
- Worktree-aware locks
- Automatic cleanup
- Lock analytics

**New Methods:**
```javascript
await lock.cleanup(options)
await lock.getStats()
await lock.search(query)
```

### 3. Receipt Verification

- Fingerprint verification
- Integrity checking
- Audit compliance

**New Methods:**
```javascript
await receipt.verify(receiptId)
await receipt.verifyAll(options)
```

### 4. Job Unrouting

- Directory-based job organization
- Unrouted name resolution
- Directory filtering

**New Methods:**
```javascript
job.unroute(jobId)
job.getDirectory(jobId)
await job.listUnrouted()
await job.getByDirectory(directory)
```

---

## How to Update Existing Jobs

### No Changes Required

Most v3.x jobs work as-is in v4.0.0:

**v3.x Job (still works):**
```javascript
export const meta = {
  name: 'My Job',
  desc: 'Description'
};

export default async function run({ payload, ctx }) {
  // Job logic
  return { success: true };
}
```

### Recommended Updates

**Add Cron Schedule (if periodic):**
```javascript
// v3.x
export const meta = { name: 'Backup Job' };

// v4.0.0 (recommended)
export const meta = { name: 'Backup Job' };
export const cron = '0 2 * * *';  // Schedule in job definition
```

**Add Timeout:**
```javascript
export const meta = {
  name: 'Long Job',
  timeout: 600000  // 10 minutes
};
```

**Add Tags:**
```javascript
export const meta = {
  name: 'Backup Job',
  tags: ['backup', 'maintenance', 'database']
};
```

**Use defineJob() Helper:**
```javascript
import { defineJob } from 'gitvan';

export default defineJob({
  meta: {
    name: 'My Job',
    desc: 'Description',
    tags: ['category']
  },
  cron: '0 * * * *',
  async run({ payload, ctx }) {
    return { success: true };
  }
});
```

---

## Configuration Changes

### gitvan.config.js

**v3.x:**
```javascript
export default {
  jobs: {
    dir: 'jobs'
  }
};
```

**v4.0.0 (enhanced):**
```javascript
export default {
  jobs: {
    dir: 'jobs',

    // New: Bree configuration
    timeout: 300000,              // Default job timeout
    maxConcurrent: 10,            // Max concurrent jobs
    closeWorkerAfterMs: 5000,     // Worker cleanup delay
    removeCompleted: true,        // Remove completed jobs

    // New: Worker options
    workerOptions: {
      resourceLimits: {
        maxOldGenerationSizeMb: 512,
        maxYoungGenerationSizeMb: 64
      }
    }
  },

  // Lock configuration (enhanced)
  locks: {
    defaultTTL: 300000,  // 5 minutes
    cleanupInterval: 900000  // 15 minutes
  },

  // Receipt configuration (enhanced)
  receipts: {
    ref: 'refs/notes/gitvan/audit',
    retention: {
      days: 90,
      maxCount: 10000
    }
  }
};
```

---

## Code Examples for Migration

### Example 1: Basic Job Migration

**v3.x:**
```javascript
export default async function run({ payload, ctx }) {
  const result = await doWork(payload);
  return result;
}
```

**v4.0.0 (same, but add metadata):**
```javascript
export const meta = {
  name: 'Work Job',
  desc: 'Does work',
  tags: ['work']
};

export const cron = '0 * * * *';  // If periodic

export default async function run({ payload, ctx }) {
  const result = await doWork(payload);
  return result;
}
```

### Example 2: Scheduled Job Migration

**v3.x (manual scheduling):**
```javascript
// Scheduled externally (crontab or systemd timer)
export default async function run() {
  await backupDatabase();
}
```

**v4.0.0 (built-in scheduling):**
```javascript
export const cron = '0 2 * * *';  // Define schedule in job

export default async function run() {
  await backupDatabase();
}
```

**v4.0.0 (scheduler setup):**
```javascript
// app.mjs
const job = useJob();
await job.autoScheduleCronJobs();
await job.startScheduler();
```

### Example 3: Lock Usage Migration

**v3.x:**
```javascript
const lock = useLock();
await lock.acquire('my-job');
try {
  await doWork();
} finally {
  await lock.release('my-job');
}
```

**v4.0.0 (same, but add TTL):**
```javascript
const lock = useLock();
await lock.acquire('my-job', {
  timeout: 300000,  // 5 min TTL
  metadata: { user: 'admin' }
});
try {
  await doWork();
} finally {
  await lock.release('my-job');
}
```

**v4.0.0 (or use runWithLock):**
```javascript
const job = useJob();
await job.runWithLock('my-job', {
  payload,
  lockOptions: { timeout: 300000 }
});
```

---

## Testing Migration

### 1. Test Job Discovery

```javascript
const job = useJob();
const jobs = await job.list();

console.log(`Found ${jobs.length} jobs`);
jobs.forEach(j => {
  console.log(`- ${j.id}: ${j.name}`);
});
```

### 2. Test Job Validation

```javascript
const validations = await job.validateAll();
const invalid = validations.filter(v => !v.valid);

if (invalid.length > 0) {
  console.error('Invalid jobs:');
  invalid.forEach(v => {
    console.error(`- ${v.id}:`);
    v.errors.forEach(e => console.error(`  - ${e}`));
  });
} else {
  console.log('All jobs valid!');
}
```

### 3. Test Job Execution

```javascript
// Test direct execution
const result = await job.run('test-job', {
  payload: { test: true }
});

console.log('Result:', result);

// Test scheduled execution
await job.schedule('test-job', {
  interval: 60000  // 1 minute
});

await job.startScheduler();

// Wait for execution
await new Promise(resolve => setTimeout(resolve, 65000));

// Check receipt
const history = await receipt.list({ jobId: 'test-job', limit: 1 });
if (history.length > 0) {
  console.log('Job executed:', history[0].status);
}

await job.stopScheduler();
```

### 4. Test Lock System

```javascript
// Test lock acquisition
const acquired = await lock.acquire('test-lock', {
  timeout: 60000
});

console.log('Lock acquired:', acquired.acquired);

// Test lock status
const isLocked = await lock.isLocked('test-lock');
console.log('Is locked:', isLocked);

// Test lock release
await lock.release('test-lock');
console.log('Lock released');

// Verify
const stillLocked = await lock.isLocked('test-lock');
console.log('Still locked:', stillLocked);  // Should be false
```

### 5. Test Receipt System

```javascript
// Create test receipt
await receipt.create({
  jobId: 'test-job',
  status: 'success',
  result: { test: true },
  duration: 1000
});

// Retrieve receipts
const receipts = await receipt.list({ jobId: 'test-job' });
console.log('Receipts:', receipts.length);

// Verify receipt
const verification = await receipt.verify(receipts[0].id);
console.log('Valid:', verification.valid);
```

---

## Rollback Procedures

### If Migration Issues Occur

**1. Stop v4.0.0 Scheduler:**
```javascript
const job = useJob();
await job.shutdownScheduler();
```

**2. Restore v3.x Code:**
```bash
git checkout v3.x
npm install
```

**3. Restart v3.x System:**
```bash
npm start
```

**4. Data Remains Compatible:**
- Locks in Git refs work in both versions
- Receipts in Git notes work in both versions
- Job files are compatible

### Gradual Migration Strategy

**Option 1: Parallel Run**
- Run v3.x and v4.0.0 in parallel
- Migrate jobs one at a time
- Compare results

**Option 2: Canary Deployment**
- Migrate non-critical jobs first
- Monitor for issues
- Gradually migrate critical jobs

**Option 3: Feature Flag**
```javascript
const USE_V4_SCHEDULER = process.env.USE_V4 === 'true';

if (USE_V4_SCHEDULER) {
  // v4.0.0 code
  await job.schedule('my-job');
  await job.startScheduler();
} else {
  // v3.x code
  // ... existing scheduling
}
```

---

## Migration Checklist

- [ ] Backup Git repository
- [ ] Update GitVan to v4.0.0
- [ ] Run `npm install`
- [ ] Update gitvan.config.js with new options
- [ ] Add `cron` exports to periodic jobs
- [ ] Add `meta` exports to all jobs
- [ ] Test job discovery (`job.list()`)
- [ ] Test job validation (`job.validateAll()`)
- [ ] Test job execution (`job.run()`)
- [ ] Test scheduling (`job.schedule()`)
- [ ] Test scheduler lifecycle (start/stop)
- [ ] Test lock system (`lock.acquire/release`)
- [ ] Test receipt system (`receipt.create/list`)
- [ ] Monitor logs for errors
- [ ] Verify cron jobs running on schedule
- [ ] Test graceful shutdown
- [ ] Document any custom changes
- [ ] Train team on new features

---

## See Also

- [API Reference](api/job-scheduler.md)
- [Quick Start Guide](QUICKSTART-JOBS.md)
- [Integration Examples](INTEGRATION-EXAMPLES-JOBS.md)
- [Troubleshooting Guide](TROUBLESHOOTING-JOBS.md)
