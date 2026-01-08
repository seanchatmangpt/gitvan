# GitVan v4.0.0 - Bree Integration Architecture

## Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Component Architecture](#component-architecture)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Design Decisions](#design-decisions)
- [Trade-offs and Alternatives](#trade-offs-and-alternatives)
- [Integration Points](#integration-points)
- [Performance Considerations](#performance-considerations)
- [Security Architecture](#security-architecture)

---

## Overview

GitVan v4.0.0 integrates [Bree](https://github.com/breejs/bree) as the job scheduling engine, replacing the previous custom job runner while maintaining backward compatibility. This integration provides robust, production-ready job scheduling with cron support, worker thread isolation, and graceful shutdown capabilities.

### Key Objectives

1. **Backward Compatibility:** Existing job definitions continue to work
2. **Production-Ready:** Robust scheduling with proven battle-tested library
3. **Worker Isolation:** Jobs run in separate worker threads for safety
4. **Context Preservation:** GitVan unctx context maintained across async boundaries
5. **Git-Native Storage:** Locks and receipts stored in Git, not external databases
6. **Graceful Degradation:** Failures isolated, system remains operational

### Technology Stack

- **Bree:** Job scheduler with cron and interval support
- **Worker Threads:** Node.js worker_threads for isolation
- **unctx:** Async context preservation (critical for GitVan)
- **isomorphic-git:** Git operations for storage
- **Pathe:** Cross-platform path handling

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitVan Application                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    useJob() Composable                    │  │
│  │  - Job Discovery  - Execution  - Status  - Scheduling    │  │
│  └──────────────────┬───────────────────────────┬────────────┘  │
│                     │                           │                │
│  ┌──────────────────▼──────────┐  ┌────────────▼─────────────┐ │
│  │       JobBridge             │  │   Legacy JobRunner       │ │
│  │  - Adapter Pattern          │  │   - Direct Execution     │ │
│  │  - Context Handling         │  │   - Backward Compat      │ │
│  │  - Worker File Generation   │  └──────────────────────────┘ │
│  └──────────────┬───────────────┘                               │
│                 │                                                │
│  ┌──────────────▼───────────────┐                               │
│  │       BreeScheduler          │                               │
│  │  - Bree Instance Management  │                               │
│  │  - Job Lifecycle             │                               │
│  │  - Event Handling            │                               │
│  └──────────────┬───────────────┘                               │
│                 │                                                │
└─────────────────┼────────────────────────────────────────────────┘
                  │
        ┌─────────▼──────────┐
        │   Bree Library     │
        │  - Cron Parsing    │
        │  - Worker Spawning │
        │  - Scheduling      │
        └─────────┬──────────┘
                  │
    ┌─────────────▼──────────────┐
    │   Worker Threads           │
    │  ┌──────────────────────┐  │
    │  │  Generated Worker    │  │
    │  │  - Imports Job       │  │
    │  │  - Executes run()    │  │
    │  │  - Posts Results     │  │
    │  └──────────────────────┘  │
    └────────────────────────────┘
                  │
    ┌─────────────▼──────────────┐
    │   Job File (.mjs)          │
    │  - meta: { name, desc }    │
    │  - run: async function     │
    │  - cron: schedule (opt)    │
    └────────────────────────────┘

  Storage Layer (Git-Native)
    ┌────────────────────────────┐
    │  Git Refs & Notes          │
    │  - refs/gitvan/locks/*     │
    │  - refs/notes/gitvan/audit │
    └────────────────────────────┘
```

---

## Component Architecture

### 1. useJob() Composable

**Responsibility:** Primary API for job management

**Location:** `/src/composables/job.mjs`

**Key Features:**
- 31 methods covering full job lifecycle
- Discovery, execution, status, scheduling
- Context-aware (unctx integration)
- Backward compatible with v3.x

**Dependencies:**
- `useGit()` - Git operations
- `useReceipt()` - Audit trail
- `useLock()` - Distributed locking
- `JobRunner` - Legacy execution
- `JobBridge` - Bree adapter
- `BreeScheduler` - Scheduling

**Architecture Pattern:** Facade Pattern
- Provides unified interface
- Delegates to specialized components
- Hides complexity from users

### 2. JobBridge Class

**Responsibility:** Adapter between GitVan jobs and Bree

**Location:** `/src/jobs/job-bridge.mjs`

**Key Features:**
- Converts GitVan job definitions to Bree format
- Generates worker files dynamically
- Manages execution context
- Handles locking and receipts

**Adapter Pattern:**
```
GitVan Job Definition
        │
        ▼
   JobBridge.toBreeJobConfig()
        │
        ▼
  Bree Job Configuration
        │
        ▼
  BreeScheduler.addJob()
```

**Worker File Generation:**

The bridge dynamically creates worker files:

```javascript
// Generated worker structure
import { parentPort, workerData } from 'worker_threads';

async function runJob() {
  // Import job definition
  const jobModule = await import(fileUrl);
  const jobDef = jobModule.default || jobModule;
  const runFn = jobDef.run || jobDef;

  // Execute with context
  const result = await runFn({
    payload: workerData.payload,
    ctx: workerData.context,
    context: workerData.context
  });

  // Post result to parent
  parentPort.postMessage({
    type: 'success',
    result,
    jobId: workerData.jobId
  });
}

runJob().catch(error => {
  // Error handling
});
```

**Context Preservation:**

```
Main Thread Context
        │
        ▼
  JobBridge.executeJobWithLock()
        │
        ▼
  Build execContext from:
  - Git info (branch, head, worktree)
  - Environment (TZ=UTC, LANG=C)
  - Payload data
        │
        ▼
  Pass via workerData
        │
        ▼
  Worker Thread receives context
        │
        ▼
  Job run() receives { payload, ctx, context }
```

### 3. BreeScheduler Class

**Responsibility:** Manages Bree instance lifecycle

**Location:** `/src/jobs/bree-scheduler.mjs`

**Key Features:**
- Singleton pattern (one per cwd)
- Bree instance initialization
- Job add/remove/run operations
- Event handling
- Graceful shutdown

**Singleton Pattern:**
```javascript
const schedulerInstances = new Map();

export function getBreeScheduler(options = {}) {
  const cwd = options.cwd || process.cwd();

  if (!schedulerInstances.has(cwd)) {
    schedulerInstances.set(cwd, new BreeScheduler(options));
  }

  return schedulerInstances.get(cwd);
}
```

**Event Handling:**
```javascript
bree.on('worker created', (name) => {
  logger.info(`Worker created: ${name}`);
});

bree.on('worker deleted', (name) => {
  logger.info(`Worker deleted: ${name}`);
});

bree.on('worker error', (error, workerMetadata) => {
  logger.error(`Worker error in ${workerMetadata.name}:`, error);
});
```

### 4. Lock System (useLock)

**Responsibility:** Distributed locking for job coordination

**Location:** `/src/composables/lock.mjs`

**Key Features:**
- Git-native storage (refs/gitvan/locks/*)
- TTL-based expiration
- Worktree-aware
- Cleanup of expired/orphaned locks

**Lock Storage Format:**
```
Git Ref: refs/gitvan/locks/job-backup-job-<worktree-id>-<hash>

Lock Data (JSON):
{
  "id": "a1b2c3d4e5f67890",
  "name": "job-backup-job",
  "worktree": "/path/to/worktree",
  "branch": "main",
  "commit": "abc123...",
  "timestamp": "2026-01-08T10:30:00Z",
  "timeout": 300000,
  "metadata": {}
}
```

**Lock Acquisition Flow:**
```
1. Generate lock ref: refs/gitvan/locks/job-<name>-<worktree>-<hash>
2. Check if ref exists
3. If exists: Lock held → fail (or retry)
4. If not exists: Create ref with lock data → success
5. TTL: Lock expires after timeout duration
```

### 5. Receipt System (useReceipt)

**Responsibility:** Audit trail for job executions

**Location:** `/src/composables/receipt.mjs`

**Key Features:**
- Git notes storage (refs/notes/gitvan/audit)
- Fingerprint verification
- Query and filtering
- Analytics and reporting

**Receipt Storage Format:**
```
Git Notes Ref: refs/notes/gitvan/results

Receipt Data (JSON):
{
  "id": "receipt-12345",
  "jobId": "backup-job",
  "status": "success",
  "timestamp": "2026-01-08T10:30:00Z",
  "commit": "abc123...",
  "branch": "main",
  "worktree": "/path/to/worktree",
  "duration": 1234,
  "result": { /* job return value */ },
  "fingerprint": "a1b2c3d4e5f67890",
  "artifacts": [],
  "metadata": {}
}
```

**Fingerprint Generation:**
```javascript
function generateFingerprint(receipt) {
  const data = {
    id: receipt.id,
    jobId: receipt.jobId,
    status: receipt.status,
    timestamp: receipt.timestamp,
    commit: receipt.commit,
    branch: receipt.branch,
    worktree: receipt.worktree
  };

  return SHA256(JSON.stringify(data)).slice(0, 16);
}
```

### 6. Legacy JobRunner

**Responsibility:** Direct job execution (non-scheduled)

**Location:** `/src/jobs/runner.mjs`

**Key Features:**
- Backward compatibility
- No worker threads
- Direct function invocation
- Context preservation

**When Used:**
- `job.run()` - direct execution
- `job.runWithLock()` - locked execution
- Non-scheduled runs

---

## Data Flow Diagrams

### Job Submission Flow

```
User Code
  │
  ├─► useJob().schedule('backup-job', { cron: '0 2 * * *' })
  │
  ▼
useJob Composable
  │
  ├─► Get job definition
  ├─► Validate job
  │
  ▼
JobBridge.scheduleJob()
  │
  ├─► Convert to Bree config
  ├─► Generate worker file
  ├─► Write to .gitvan/workers/
  │
  ▼
BreeScheduler.addJob()
  │
  ├─► Add to Bree instance
  ├─► Bree parses cron
  ├─► Schedule job
  │
  ▼
Job Scheduled ✓
```

### Job Execution Flow

```
Bree Scheduler
  │
  ├─► Time to run job
  ├─► Create worker thread
  │
  ▼
Worker Thread
  │
  ├─► Load workerData
  ├─► Import job file
  ├─► Get run() function
  │
  ▼
JobBridge.executeJobWithLock()
  │
  ├─► Acquire lock (refs/gitvan/locks/job-<name>)
  │   ├─► Lock acquired → proceed
  │   └─► Lock held → error (already running)
  │
  ├─► Build execution context
  │   ├─► Git info (branch, head, worktree)
  │   ├─► Environment (TZ=UTC, LANG=C)
  │   └─► Payload data
  │
  ├─► Store context in jobContexts Map
  │
  ├─► Run job in worker thread
  │   ├─► await run({ payload, ctx, context })
  │   └─► Return result
  │
  ├─► Write receipt (refs/notes/gitvan/results)
  │   ├─► Generate fingerprint
  │   ├─► Create receipt data
  │   └─► Write to Git notes
  │
  ├─► Release lock
  │   └─► Delete lock ref
  │
  └─► Return result
```

### Receipt Write Flow

```
Job Execution Complete
  │
  ▼
useReceipt().create()
  │
  ├─► Build receipt data
  │   ├─► jobId, status, timestamp
  │   ├─► commit, branch, worktree
  │   ├─► result or error
  │   └─► duration, artifacts
  │
  ├─► Generate fingerprint
  │   └─► SHA256(receipt data) → 16 chars
  │
  ▼
writeReceipt() (runtime)
  │
  ├─► Format as Git note
  │
  ▼
Git Notes (refs/notes/gitvan/results)
  │
  └─► Immutable audit trail ✓
```

### Lock Management Flow

```
Job Needs Lock
  │
  ▼
useLock().acquire('job-backup')
  │
  ├─► Generate lock ref
  │   └─► refs/gitvan/locks/job-backup-<worktree>-<hash>
  │
  ├─► Check if ref exists
  │   ├─► Exists → Lock held
  │   │   ├─► Check TTL
  │   │   │   ├─► Expired → Proceed
  │   │   │   └─► Active → Fail
  │   │   └─► Return { acquired: false }
  │   │
  │   └─► Not exists → Available
  │       ├─► Create ref with lock data
  │       └─► Return { acquired: true, id: '...' }
  │
  ▼
Job Executes
  │
  ▼
useLock().release('job-backup')
  │
  ├─► Get lock ref
  ├─► Delete Git ref
  └─► Lock released ✓
```

---

## Design Decisions

### 1. Why Bree?

**Decision:** Use Bree as the job scheduler

**Rationale:**
- Battle-tested, production-ready library
- Robust cron parsing and scheduling
- Worker thread support built-in
- Graceful shutdown capabilities
- Active maintenance and community

**Alternatives Considered:**
- `node-cron`: Less robust, no worker threads
- `agenda`: Requires MongoDB
- `bull`: Requires Redis
- Custom scheduler: Too much maintenance burden

### 2. Adapter Pattern (JobBridge)

**Decision:** Use adapter pattern to bridge GitVan jobs and Bree

**Rationale:**
- Maintains backward compatibility
- Isolates Bree-specific code
- Easy to replace scheduler in future
- Clear separation of concerns

**Implementation:**
- JobBridge converts between formats
- useJob() API remains unchanged
- Internal changes transparent to users

### 3. Worker File Generation

**Decision:** Dynamically generate worker files instead of using job files directly

**Rationale:**
- Job files may not be Bree-compatible
- Allows context injection
- Enables cross-platform path handling (Windows)
- Provides error handling wrapper

**Trade-offs:**
- Additional disk I/O for worker files
- Cleanup needed (.gitvan/workers/)
- Slightly more complex

**Benefits:**
- Consistent execution environment
- Better error messages
- Platform compatibility

### 4. Git-Native Storage

**Decision:** Store locks and receipts in Git refs/notes

**Rationale:**
- No external database required
- Atomic operations via Git
- Version controlled audit trail
- Distributed system support
- Cryptographic verification

**Implementation:**
- Locks: `refs/gitvan/locks/*`
- Receipts: `refs/notes/gitvan/audit`
- Use isomorphic-git for operations

**Trade-offs:**
- Git repo size grows (mitigated by cleanup)
- Slower than in-memory (acceptable for job scheduling)

**Benefits:**
- Simple deployment (no DB setup)
- Audit trail immutability
- Distributed locking possible

### 5. unctx Context Preservation

**Decision:** Preserve GitVan context across async boundaries

**Rationale:**
- Critical for composables to work
- Enables access to Git, config, etc.
- Consistent with GitVan architecture

**Implementation:**
```javascript
await withGitVan(context, async () => {
  const job = useJob();  // context available
  await job.run('test'); // context preserved
});
```

**Challenge:**
- Worker threads are separate contexts
- Solution: Pass context via workerData

### 6. Lazy Composable Initialization

**Decision:** JobBridge initializes composables (lock, receipt) lazily

**Rationale:**
- Composables must be called in unctx context
- JobBridge created before context established
- Lazy initialization ensures context available

**Implementation:**
```javascript
class JobBridge {
  get lock() {
    if (!this._lock) {
      this._lock = useLock();  // Called when context available
    }
    return this._lock;
  }
}
```

### 7. Singleton Pattern for Schedulers

**Decision:** One scheduler instance per working directory

**Rationale:**
- Prevent duplicate schedules
- Share resources efficiently
- Enable cleanup on shutdown

**Implementation:**
```javascript
const schedulerInstances = new Map();  // Key: cwd

export function getBreeScheduler(options) {
  const cwd = options.cwd || process.cwd();

  if (!schedulerInstances.has(cwd)) {
    schedulerInstances.set(cwd, new BreeScheduler(options));
  }

  return schedulerInstances.get(cwd);
}
```

### 8. Graceful Shutdown

**Decision:** Implement comprehensive shutdown procedure

**Rationale:**
- Prevent job interruptions
- Clean up resources
- Safe process termination

**Shutdown Sequence:**
```
1. Stop accepting new jobs (scheduler.stop())
2. Wait for running jobs to complete
3. Stop all scheduled jobs
4. Clean up worker files
5. Clear internal state
6. Close Bree instance
```

**Implementation:**
```javascript
async shutdown() {
  if (this.isRunning) {
    await this.stop();
  }

  for (const jobName of this.jobs.keys()) {
    await this.stopJob(jobName);
  }

  // Cleanup worker files
  for (const workerFile of this.createdWorkerFiles) {
    if (existsSync(workerFile)) {
      rmSync(workerFile);
    }
  }

  this.bree = null;
  this.jobs.clear();
}
```

---

## Trade-offs and Alternatives

### Bree vs. Custom Scheduler

| Aspect | Bree | Custom Scheduler |
|--------|------|------------------|
| Reliability | ✅ Battle-tested | ❌ Unproven |
| Maintenance | ✅ Community | ❌ Our burden |
| Features | ✅ Full-featured | ⚠️ Limited |
| Control | ⚠️ Less control | ✅ Full control |
| Size | ⚠️ Dependency | ✅ No dependency |

**Decision:** Bree's benefits outweigh the loss of control

### Worker Threads vs. Child Processes

| Aspect | Worker Threads | Child Processes |
|--------|----------------|-----------------|
| Startup Time | ✅ Fast | ❌ Slow |
| Memory | ✅ Shared | ❌ Isolated |
| Communication | ✅ Easy | ⚠️ IPC required |
| Isolation | ⚠️ Less | ✅ Full |
| Platform Support | ✅ All | ✅ All |

**Decision:** Worker threads for speed and efficiency

### Git Storage vs. Database

| Aspect | Git Storage | Database |
|--------|-------------|----------|
| Setup | ✅ None | ❌ Required |
| Deployment | ✅ Simple | ❌ Complex |
| Speed | ⚠️ Slower | ✅ Fast |
| Audit Trail | ✅ Immutable | ⚠️ Mutable |
| Distributed | ✅ Native | ❌ Complex |

**Decision:** Git storage for simplicity and GitVan alignment

### Dynamic Worker Files vs. Direct Execution

| Aspect | Dynamic Workers | Direct Execution |
|--------|-----------------|------------------|
| Compatibility | ✅ High | ⚠️ Variable |
| Setup | ⚠️ Generation | ✅ None |
| Context | ✅ Injected | ❌ Lost |
| Cleanup | ❌ Required | ✅ None |
| Cross-Platform | ✅ Handled | ❌ Issues |

**Decision:** Dynamic workers for compatibility and context

---

## Integration Points

### 1. useJob() → JobBridge

```javascript
// useJob()
async schedule(jobId, options) {
  const jobDef = await this.get(jobId);
  await jobBridge.scheduleJob(jobDef, options);
}
```

### 2. JobBridge → BreeScheduler

```javascript
// JobBridge
async scheduleJob(jobDef, options) {
  const breeConfig = this.toBreeJobConfig(jobDef, options);
  await this.scheduler.addJob(breeConfig);
}
```

### 3. BreeScheduler → Bree Library

```javascript
// BreeScheduler
async addJob(jobConfig) {
  this.bree.add(jobConfig);
  this.jobs.set(jobConfig.name, jobConfig);
}
```

### 4. JobBridge → useLock()

```javascript
// JobBridge
async executeJobWithLock(jobDef, options) {
  const lockAcquired = await this.lock.acquire(lockName);
  if (!lockAcquired) {
    throw new Error('Job already running');
  }

  try {
    // Execute job
  } finally {
    await this.lock.release(lockName);
  }
}
```

### 5. JobBridge → useReceipt()

```javascript
// JobBridge
async executeJobWithLock(jobDef, options) {
  // ... execution ...

  await this.receipt.write({
    jobId,
    fingerprint,
    status: 'success',
    result,
    duration
  });
}
```

### 6. Worker Thread → Job File

```javascript
// Generated worker
const jobModule = await import(jobFileUrl);
const jobDef = jobModule.default || jobModule;
const runFn = jobDef.run || jobDef;

const result = await runFn({
  payload: workerData.payload,
  ctx: workerData.context,
  context: workerData.context
});
```

---

## Performance Considerations

### 1. Worker Thread Overhead

**Impact:** Each job execution spawns a worker thread

**Mitigation:**
- Bree reuses worker threads when possible
- `closeWorkerAfterMs` configurable (default: 5000ms)
- Worker thread startup ~10-50ms (acceptable)

### 2. Worker File I/O

**Impact:** Worker files written to disk on schedule

**Mitigation:**
- Worker files cached in memory by Node.js
- Written to `.gitvan/workers/` (gitignored)
- Cleanup on shutdown
- Consider in-memory option for high-frequency jobs

### 3. Lock Contention

**Impact:** Multiple processes competing for same job lock

**Mitigation:**
- TTL-based expiration (default: 5 min)
- Lock ref check is fast (Git ref lookup)
- Retry with exponential backoff
- Force flag for emergency override

### 4. Receipt Storage Growth

**Impact:** Git notes accumulate over time

**Mitigation:**
- Cleanup old receipts (configurable retention)
- Git garbage collection
- Receipt limit per job
- Consider external archival for long-term storage

### 5. Job Discovery Overhead

**Impact:** Filesystem scan on each `list()` call

**Mitigation:**
- Cache job list in memory
- Watch filesystem for changes
- Incremental discovery
- Consider job registry

---

## Security Architecture

### 1. Job Isolation

**Worker Threads:**
- Separate V8 contexts
- Memory isolation
- Limited shared state
- Controlled communication

**Limitations:**
- Not full process isolation
- Shared heap possible with SharedArrayBuffer
- File system access not restricted

### 2. Lock Security

**Protection:**
- Git refs are atomic
- No race conditions in ref creation
- TTL prevents indefinite locks
- Worktree-specific locks

**Risks:**
- Force flag bypasses locks (by design)
- Expired locks not auto-removed (cleanup required)
- No encryption of lock data

### 3. Receipt Integrity

**Protection:**
- Fingerprint verification
- Immutable Git notes
- Cryptographic hashing (SHA-256)

**Verification:**
```javascript
const expected = generateFingerprint(receipt);
const valid = receipt.fingerprint === expected;
```

### 4. Environment Variable Isolation

**Protection:**
- Worker receives filtered env vars
- TZ and LANG always overridden
- Sensitive vars can be excluded

**Configuration:**
```javascript
const execContext = {
  env: {
    TZ: 'UTC',
    LANG: 'C',
    // Selective inclusion
    NODE_ENV: process.env.NODE_ENV
  }
};
```

### 5. Path Traversal Prevention

**Protection:**
- Job IDs validated
- Worker files in controlled directory
- Path normalization (pathe)

**Validation:**
```javascript
const workerFileName = `${jobId.replace(/[:/]/g, '-')}-worker.mjs`;
const workerPath = join(this.workerDir, workerFileName);
```

---

## See Also

- [API Reference](api/job-scheduler.md)
- [Troubleshooting Guide](TROUBLESHOOTING-JOBS.md)
- [Performance Tuning Guide](PERFORMANCE-TUNING-JOBS.md)
- [Security Hardening Guide](SECURITY-JOBS.md)
