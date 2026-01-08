# Lock & Receipt System Architecture

GitVan v4.0.0 - Git-Native Storage

## Table of Contents

- [Lock System](#lock-system)
- [Receipt System](#receipt-system)
- [Git-Native Storage](#git-native-storage)
- [Operational Procedures](#operational-procedures)

---

## Lock System

### How Distributed Locking Works

GitVan uses Git refs for distributed locking - a lock is simply a Git ref that exists or doesn't exist.

**Lock Ref Format:**
```
refs/gitvan/locks/job-<job-name>-<worktree-id>-<hash>
```

**Example:**
```
refs/gitvan/locks/job-backup-job-a1b2c3d4-5e6f7890
```

**Components:**
- `job-backup-job`: Lock name
- `a1b2c3d4`: Worktree ID (hash of worktree path)
- `5e6f7890`: Lock name hash (for uniqueness)

### Lock Acquisition and Release

**Acquisition Process:**
```
1. Generate lock ref name
2. Check if ref exists in Git
3. If exists:
   - Read lock data
   - Check if expired (TTL)
   - If expired: proceed to create
   - If active: fail (lock held)
4. If not exists:
   - Create ref with lock data
   - Return success
```

**Implementation:**
```javascript
async acquire(lockName, options = {}) {
  const { timeout = 30000, metadata = {} } = options;

  // Generate lock ref
  const lockRef = this.getLockRef(lockName, gitInfo);

  // Create lock data
  const lockData = {
    id: this.generateLockId(),
    name: lockName,
    worktree: gitInfo.worktree,
    branch: gitInfo.branch,
    commit: gitInfo.head,
    timestamp: new Date().toISOString(),
    timeout,
    metadata
  };

  // Try to create ref
  const acquired = await git.createRef(lockRef, lockData);

  return {
    id: lockData.id,
    name: lockName,
    ref: lockRef,
    acquired
  };
}
```

**Release Process:**
```
1. Get lock ref name
2. Delete Git ref
3. Lock released
```

**Implementation:**
```javascript
async release(lockName) {
  const lockRef = this.getLockRef(lockName, gitInfo);

  // Delete the ref
  const released = await git.deleteRef(lockRef);

  return {
    name: lockName,
    ref: lockRef,
    released
  };
}
```

### TTL (Time-to-Live) Behavior

**Expiration Mechanism:**
```javascript
// Lock data includes timeout
{
  "timestamp": "2026-01-08T10:30:00Z",
  "timeout": 300000  // 5 minutes
}

// Calculate expiry
const lockTime = new Date(lockData.timestamp);
const expiryTime = new Date(lockTime.getTime() + lockData.timeout);
const now = new Date();

if (now > expiryTime) {
  // Lock expired - can be acquired
  return true;
} else {
  // Lock still active
  return false;
}
```

**Automatic Cleanup:**
```javascript
const lock = useLock();

// Cleanup expired and orphaned locks
const cleanup = await lock.cleanup({
  expired: true,    // Remove expired locks
  orphaned: true,   // Remove locks for deleted worktrees
  dryRun: false     // Actually delete
});

console.log(`Cleaned ${cleanup.cleaned} locks`);
```

### Lock Expiration and Cleanup

**Manual Cleanup:**
```javascript
// List all locks
const locks = await lock.list();

// Filter expired
const now = new Date();
const expired = locks.filter(l => {
  const lockTime = new Date(l.timestamp);
  const expiryTime = new Date(lockTime.getTime() + l.timeout);
  return now > expiryTime;
});

// Remove expired locks
for (const expiredLock of expired) {
  await lock.release(expiredLock.name);
}
```

**Automatic Cleanup Job:**
```javascript
// jobs/lock-cleanup.mjs
export const meta = {
  name: 'Lock Cleanup',
  desc: 'Clean expired and orphaned locks'
};
export const cron = '*/15 * * * *';  // Every 15 minutes

export default async function run() {
  const lock = useLock();

  const cleanup = await lock.cleanup({
    expired: true,
    orphaned: true,
    dryRun: false
  });

  return {
    total: cleanup.total,
    cleaned: cleanup.cleaned,
    remaining: cleanup.remaining
  };
}
```

### Deadlock Prevention

**Single Lock Acquisition:**
```javascript
// Always acquire one lock at a time
await lock.acquire('lock-a');
// Don't try to acquire another lock while holding lock-a
```

**Timeout-Based Prevention:**
```javascript
// Locks automatically expire
const acquired = await lock.acquire('job-backup', {
  timeout: 300000  // 5 minutes - prevents indefinite hold
});
```

**Lock Ordering:**
```javascript
// If must acquire multiple locks, use consistent ordering
const locks = ['lock-a', 'lock-b', 'lock-c'].sort();

for (const lockName of locks) {
  await lock.acquire(lockName);
}
```

### Force Flag Usage

**When to Use Force:**
- Lock expired but not cleaned up
- Emergency override needed
- Previous execution crashed

**How to Use:**
```javascript
const job = useJob();

// Normal execution (respects lock)
await job.runWithBree('backup-job', { payload });

// Force execution (bypasses lock check)
await job.runWithBree('backup-job', {
  payload,
  force: true  // Use with caution!
});
```

**Security Considerations:**
```javascript
// Require authorization for force
function runWithForce(jobId, options) {
  if (!ctx.user.isAdmin) {
    throw new Error('Force requires admin role');
  }

  logger.warn('Force execution', { jobId, user: ctx.user.id });

  return job.runWithBree(jobId, { ...options, force: true });
}
```

---

## Receipt System

### What Receipts Contain

**Receipt Structure:**
```javascript
{
  // Identification
  "id": "receipt-a1b2c3d4e5f67890",
  "jobId": "backup-job",
  "eventId": null,

  // Status
  "status": "success",  // 'success' | 'error'
  "timestamp": "2026-01-08T10:30:00Z",

  // Git context
  "commit": "abc123def456...",
  "branch": "main",
  "worktree": "/path/to/worktree",

  // Execution details
  "duration": 1234,  // milliseconds
  "result": {
    // Job return value
    "filesBackedUp": 42,
    "size": "1.2GB"
  },
  "error": null,  // Error message if failed

  // Verification
  "fingerprint": "a1b2c3d4e5f67890",

  // Audit
  "artifacts": [],  // File paths created
  "metadata": {}    // Additional data
}
```

### Receipt Storage and Retrieval

**Storage Location:**
```
Git Notes: refs/notes/gitvan/results
```

**Write Receipt:**
```javascript
const receipt = useReceipt();

await receipt.create({
  jobId: 'backup-job',
  status: 'success',
  result: { filesBackedUp: 42 },
  duration: 1234,
  artifacts: ['/backups/backup-2026-01-08.tar.gz']
});
```

**Read Receipts:**
```javascript
// List all receipts
const receipts = await receipt.list({ limit: 100 });

// Filter by job
const jobReceipts = await receipt.list({ jobId: 'backup-job' });

// Filter by status
const failures = await receipt.list({ status: 'error' });

// Filter by date range
const recent = await receipt.list({
  since: '2026-01-01T00:00:00Z',
  until: '2026-01-31T23:59:59Z'
});
```

**Get Specific Receipt:**
```javascript
const receipt = await receipt.get('receipt-a1b2c3d4');
console.log(receipt.status, receipt.result);
```

### Fingerprint Generation and Verification

**Generation:**
```javascript
function generateFingerprint(receipt) {
  // Extract core data
  const data = {
    id: receipt.id,
    jobId: receipt.jobId,
    status: receipt.status,
    timestamp: receipt.timestamp,
    commit: receipt.commit,
    branch: receipt.branch,
    worktree: receipt.worktree
  };

  // Hash with SHA-256
  const hash = createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');

  // Return first 16 characters
  return hash.slice(0, 16);
}
```

**Verification:**
```javascript
const verification = await receipt.verify('receipt-a1b2c3d4');

if (verification.valid) {
  console.log('Receipt is valid');
} else {
  console.error('Receipt verification failed!');
  console.error('Fingerprint valid:', verification.fingerprintValid);
  console.error('Note valid:', verification.noteValid);

  // Possible tampering detected
  handleSecurityIncident(verification);
}
```

**Verify All Receipts:**
```javascript
const results = await receipt.verifyAll({ limit: 1000 });

const invalid = results.filter(r => !r.valid);
if (invalid.length > 0) {
  console.error(`Found ${invalid.length} invalid receipts!`);

  invalid.forEach(r => {
    console.error(`- ${r.id}: ${r.error || 'Verification failed'}`);
  });
}
```

### Audit Trail Properties

**Immutability:**
- Stored in Git notes (append-only)
- Cannot be modified without breaking fingerprint
- Tampering is detectable

**Completeness:**
- All job executions create receipts
- Success and failure both recorded
- Includes full context

**Verifiability:**
- Cryptographic fingerprints
- Verification API provided
- Can audit at any time

**Queryability:**
- Filter by job, status, date
- Analytics and reporting
- Full history available

### Receipt Lifecycle

```
1. Job Execution Starts
   ↓
2. Execution Completes (success or error)
   ↓
3. Receipt Created
   - Generate ID
   - Collect execution data
   - Generate fingerprint
   ↓
4. Receipt Written to Git Notes
   - Atomic write
   - Immutable storage
   ↓
5. Receipt Queryable
   - list(), get(), verify()
   - Analytics
   ↓
6. Receipt Cleanup (optional)
   - After retention period
   - Archive to external storage
   - Remove from Git notes
```

### Query and Filtering

**Basic Queries:**
```javascript
// All receipts
const all = await receipt.list();

// By job
const backupReceipts = await receipt.list({ jobId: 'backup-job' });

// By status
const successes = await receipt.list({ status: 'success' });
const failures = await receipt.list({ status: 'error' });

// By date
const recent = await receipt.list({
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // Last 7 days
});

// Combined filters
const recentFailures = await receipt.list({
  status: 'error',
  since: new Date(Date.now() - 24 * 60 * 60 * 1000),  // Last 24 hours
  limit: 50
});
```

**Analytics:**
```javascript
// Get statistics
const stats = await receipt.getStats({
  jobId: 'backup-job',
  since: '2026-01-01T00:00:00Z'
});

console.log('Total runs:', stats.total);
console.log('Success rate:', stats.successRate + '%');
console.log('Average duration:', stats.averageDuration + 'ms');
console.log('By status:', stats.byStatus);
console.log('Timeline:', stats.timeline);
```

**Search:**
```javascript
// Search by text
const results = await receipt.search('backup', {
  fields: ['jobId', 'status']
});
```

**Export:**
```javascript
// Export to JSON
const json = await receipt.export({ format: 'json' });
fs.writeFileSync('receipts.json', json);

// Export to CSV
const csv = await receipt.export({ format: 'csv' });
fs.writeFileSync('receipts.csv', csv);
```

---

## Git-Native Storage

### How Receipts Stored in Git Notes

**Git Notes Basics:**
- Notes are extra metadata attached to Git objects
- Stored in separate namespace
- Don't affect commit history

**GitVan Implementation:**
```
Git Notes Ref: refs/notes/gitvan/results

Each note contains a receipt as JSON:
{
  "id": "receipt-...",
  "jobId": "backup-job",
  // ... full receipt data
}
```

**Writing Receipts:**
```javascript
import git from 'isomorphic-git';

async function writeReceipt(receipt) {
  // Serialize receipt
  const content = JSON.stringify(receipt, null, 2);

  // Write to Git notes
  await git.addNote({
    fs,
    dir: cwd,
    ref: 'refs/notes/gitvan/results',
    oid: receipt.commit,  // Attach to commit
    note: content,
    author: {
      name: 'GitVan',
      email: 'gitvan@system'
    }
  });
}
```

**Reading Receipts:**
```javascript
async function readReceipts() {
  // List all notes
  const notes = await git.listNotes({
    fs,
    dir: cwd,
    ref: 'refs/notes/gitvan/results'
  });

  // Parse receipts
  const receipts = [];
  for (const note of notes) {
    const content = await git.readNote({
      fs,
      dir: cwd,
      ref: 'refs/notes/gitvan/results',
      oid: note.oid
    });

    const receipt = JSON.parse(content);
    receipts.push(receipt);
  }

  return receipts;
}
```

### How Locks Stored in Git Refs

**Git Refs Basics:**
- Refs are pointers to Git objects
- Lightweight and fast
- Atomic creation/deletion

**GitVan Implementation:**
```
Lock Ref: refs/gitvan/locks/job-<name>-<worktree>-<hash>

Ref points to: Special blob containing lock data
```

**Creating Lock:**
```javascript
async function createLock(lockName, lockData) {
  const lockRef = `refs/gitvan/locks/${lockName}`;

  // Serialize lock data
  const content = JSON.stringify(lockData);

  // Create blob
  const oid = await git.writeBlob({
    fs,
    dir: cwd,
    blob: content
  });

  // Create ref pointing to blob
  await git.writeRef({
    fs,
    dir: cwd,
    ref: lockRef,
    value: oid,
    force: false  // Fail if exists
  });
}
```

**Deleting Lock:**
```javascript
async function deleteLock(lockName) {
  const lockRef = `refs/gitvan/locks/${lockName}`;

  await git.deleteRef({
    fs,
    dir: cwd,
    ref: lockRef
  });
}
```

### Atomic Operations

**Git Guarantees:**
- Ref creation is atomic
- Ref deletion is atomic
- No race conditions

**Lock Acquisition (Atomic):**
```
1. Try to create ref
2. If succeeds: Lock acquired
3. If fails: Lock already exists
```

**Receipt Write (Atomic):**
```
1. Create note object
2. Write to Git notes ref
3. Either succeeds completely or fails completely
```

### Consistency Guarantees

**Locks:**
- No two processes can hold same lock
- Lock is held or not held (no partial state)
- Lock expires automatically (TTL)

**Receipts:**
- All executions create receipts
- Receipts are immutable once written
- Fingerprints detect tampering
- No lost receipts (append-only)

---

## Operational Procedures

### Manually Releasing a Lock

**CLI:**
```bash
gitvan lock release job-backup-job
```

**Code:**
```javascript
import { withGitVan, useLock } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const lock = useLock();
  await lock.release('job-backup-job');
  console.log('Lock released');
});
```

**Direct Git:**
```bash
# Find lock ref
git for-each-ref refs/gitvan/locks/

# Delete lock ref
git update-ref -d refs/gitvan/locks/job-backup-job-a1b2c3d4-5e6f7890
```

### Querying Receipt History

**Last 10 Runs:**
```javascript
const receipt = useReceipt();
const history = await receipt.list({ jobId: 'backup-job', limit: 10 });

history.forEach(r => {
  console.log(`${r.timestamp}: ${r.status} (${r.duration}ms)`);
});
```

**Failures Only:**
```javascript
const failures = await receipt.list({
  jobId: 'backup-job',
  status: 'error',
  limit: 50
});

failures.forEach(r => {
  console.log(`${r.timestamp}: ${r.error}`);
});
```

**Date Range:**
```javascript
const jan2026 = await receipt.list({
  since: '2026-01-01T00:00:00Z',
  until: '2026-01-31T23:59:59Z'
});
```

### Verifying Job Execution

**Verify Last Run:**
```javascript
const history = await receipt.list({ jobId: 'backup-job', limit: 1 });

if (history.length > 0) {
  const lastRun = history[0];

  console.log('Last run:', lastRun.timestamp);
  console.log('Status:', lastRun.status);
  console.log('Duration:', lastRun.duration + 'ms');

  if (lastRun.status === 'success') {
    console.log('Result:', lastRun.result);
  } else {
    console.error('Error:', lastRun.error);
  }

  // Verify integrity
  const verification = await receipt.verify(lastRun.id);
  console.log('Verified:', verification.valid);
}
```

### Auditing and Compliance

**Generate Audit Report:**
```javascript
async function generateAuditReport(jobId, dateRange) {
  const receipt = useReceipt();

  const receipts = await receipt.list({
    jobId,
    since: dateRange.start,
    until: dateRange.end,
    limit: 10000
  });

  const report = {
    jobId,
    period: dateRange,
    totalExecutions: receipts.length,
    successful: receipts.filter(r => r.status === 'success').length,
    failed: receipts.filter(r => r.status === 'error').length,
    successRate: 0,
    executions: receipts.map(r => ({
      timestamp: r.timestamp,
      status: r.status,
      duration: r.duration,
      verified: false
    }))
  };

  report.successRate = (report.successful / report.totalExecutions) * 100;

  // Verify all receipts
  for (let i = 0; i < report.executions.length; i++) {
    const verification = await receipt.verify(receipts[i].id);
    report.executions[i].verified = verification.valid;
  }

  return report;
}

// Usage
const report = await generateAuditReport('backup-job', {
  start: '2026-01-01T00:00:00Z',
  end: '2026-01-31T23:59:59Z'
});

console.log(JSON.stringify(report, null, 2));
```

---

## See Also

- [API Reference](api/job-scheduler.md)
- [Architecture Guide](ARCHITECTURE-BREE-INTEGRATION.md)
- [Security Guide](SECURITY-JOBS.md)
- [Troubleshooting](TROUBLESHOOTING-JOBS.md)
