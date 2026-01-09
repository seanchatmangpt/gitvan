# Phase 1 Implementation Guide: RDF-Backed Git-Native I/O

**Version:** 1.0.0
**Last Updated:** January 9, 2026
**Phase:** Phase 1 - Git-Native I/O RDF Refactoring

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [API Reference](#api-reference)
4. [SPARQL Query Patterns](#sparql-query-patterns)
5. [Common Patterns & Best Practices](#common-patterns--best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Performance Tuning](#performance-tuning)

---

## Introduction

Phase 1 transforms GitVan's Git-Native I/O subsystem from JSON-based storage to **RDF-backed semantic state management**. This enables powerful querying capabilities, semantic deadlock detection, and complete provenance tracking.

### What You Get

- **RDFLockManager** - Semantic lock management with deadlock detection
- **RDFSnapshotStore** - Snapshot storage with PROV-O provenance
- **RDFQueueManager** - Job queue with dependency resolution
- **SPARQL Queries** - Query lock state, snapshot lineage, job dependencies
- **Transaction Hooks** - Reactive updates on state changes

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    GitVan Application                    │
├─────────────────────────────────────────────────────────┤
│  RDFLockManager  │  RDFSnapshotStore  │  RDFQueueManager│
├─────────────────────────────────────────────────────────┤
│              KnowledgeSubstrateCore (UnRDF)             │
├─────────────────────────────────────────────────────────┤
│      Lock Ontology  │  Snapshot Ontology  │  Queue      │
├─────────────────────────────────────────────────────────┤
│                     Git Storage Layer                    │
│          (Git refs, Git notes, Git worktrees)           │
└─────────────────────────────────────────────────────────┘
```

**Key Principle**: RDF is the "read" side for querying; Git remains the "write" side for durability.

---

## Getting Started

### Prerequisites

```bash
# Node.js 18+ required
node --version  # v18.0.0+

# GitVan installed
npm install -g gitvan

# UnRDF submodule initialized
git submodule update --init --recursive
npm run build:unrdf
```

### Basic Setup

```javascript
import { initializeGitVanOntologies } from 'gitvan/core/KnowledgeSubstrateExtensions'
import { createKnowledgeSubstrateCore } from 'unrdf'

// 1. Create Knowledge Substrate
const ks = createKnowledgeSubstrateCore({
  storage: 'memory',  // or 'disk' for persistence
  caching: true
})

// 2. Load GitVan ontologies
const result = await initializeGitVanOntologies(ks, {
  validateWithShacl: true,
  registerHooks: true
})

console.log(`Loaded ${Object.keys(result.ontologies).length} ontologies`)
// => Loaded 3 ontologies

// 3. Initialize RDF managers
import { RDFLockManager } from 'gitvan/git-native/RDFLockManager'
import { RDFSnapshotStore } from 'gitvan/git-native/RDFSnapshotStore'
import { RDFQueueManager } from 'gitvan/git-native/RDFQueueManager'

const lockManager = new RDFLockManager(ks, { cwd: process.cwd() })
const snapshotStore = new RDFSnapshotStore(ks, { cwd: process.cwd() })
const queueManager = new RDFQueueManager(ks, { cwd: process.cwd() })

await lockManager.initialize()
await snapshotStore.initialize()
await queueManager.initialize()
```

### Quick Example: Acquire Lock with Deadlock Detection

```javascript
// Acquire lock
const lock = await lockManager.acquireLock('my-resource', {
  timeout: 30000,      // 30 seconds
  priority: 100,
  fingerprint: process.pid
})

console.log(`Acquired lock: ${lock.lockId}`)

// Check for deadlocks
const hasDeadlock = await lockManager.detectDeadlocks()
if (hasDeadlock) {
  console.error('⚠ Deadlock detected!')
}

// Release lock
await lockManager.releaseLock('my-resource')
```

---

## API Reference

### RDFLockManager

Manages distributed locks with semantic deadlock detection.

#### `async initialize(knowledgeSubstrate, options)`

Initialize the lock manager.

**Parameters:**
- `knowledgeSubstrate` - KnowledgeSubstrateCore instance
- `options.cwd` - Working directory (default: `process.cwd()`)
- `options.refPrefix` - Git ref prefix (default: `refs/locks/`)

**Returns:** `Promise<void>`

**Example:**
```javascript
await lockManager.initialize(ks, {
  cwd: '/path/to/repo',
  refPrefix: 'refs/locks/'
})
```

#### `async acquireLock(lockName, options)`

Acquire a distributed lock with automatic deadlock detection.

**Parameters:**
- `lockName` - Name of the resource to lock
- `options.timeout` - Lock timeout in ms (default: 30000)
- `options.priority` - Lock priority (higher = more important)
- `options.exclusive` - Exclusive lock (default: true)
- `options.fingerprint` - Process fingerprint for validation

**Returns:** `Promise<Lock>` - Lock object with `lockId`, `resourceId`, `owner`

**Throws:** `LockAcquisitionError` if lock cannot be acquired

**Example:**
```javascript
const lock = await lockManager.acquireLock('workflow-state', {
  timeout: 60000,
  priority: 100,
  exclusive: true,
  fingerprint: `${process.pid}@${os.hostname()}`
})
```

#### `async releaseLock(lockName)`

Release a previously acquired lock.

**Parameters:**
- `lockName` - Name of the lock to release

**Returns:** `Promise<void>`

**Example:**
```javascript
await lockManager.releaseLock('workflow-state')
```

#### `async detectDeadlocks()`

Detect circular lock dependencies using SPARQL ASK query.

**Returns:** `Promise<boolean>` - True if deadlock exists

**SPARQL Query Used:**
```sparql
ASK WHERE {
  ?lock1 lock:blockedBy ?lock2 .
  ?lock2 lock:blockedBy+ ?lock1 .
}
```

**Example:**
```javascript
if (await lockManager.detectDeadlocks()) {
  console.error('Deadlock detected!')
  const deadlockedLocks = await lockManager.getDeadlockedLocks()
  console.log('Locks involved:', deadlockedLocks)
}
```

#### `async getBlockingLocks(resourceId)`

Get all locks blocking a specific resource.

**Parameters:**
- `resourceId` - Resource identifier

**Returns:** `Promise<Array<Lock>>` - Array of blocking locks with duration

**Example:**
```javascript
const blockers = await lockManager.getBlockingLocks('workflow-state')
blockers.forEach(lock => {
  console.log(`${lock.owner} holding for ${lock.duration}ms`)
})
```

#### `async getAbnormallyLongLocks(maxDurationMs)`

Find locks held longer than expected.

**Parameters:**
- `maxDurationMs` - Maximum acceptable duration (default: 300000 = 5min)

**Returns:** `Promise<Array<Lock>>` - Locks exceeding duration

**Example:**
```javascript
const longLocks = await lockManager.getAbnormallyLongLocks(60000)
if (longLocks.length > 0) {
  console.warn(`Found ${longLocks.length} long-running locks`)
}
```

---

### RDFSnapshotStore

Stores state snapshots with full provenance tracking.

#### `async store(key, value, metadata)`

Store a snapshot with PROV-O metadata.

**Parameters:**
- `key` - Snapshot key (e.g., 'workflow-state')
- `value` - Snapshot content (object or string)
- `metadata` - Metadata object with:
  - `description` - Human-readable description
  - `tags` - Array of searchable tags
  - `activity` - Activity that generated this snapshot
  - `agent` - Agent (user/process) that created it

**Returns:** `Promise<Snapshot>` - Snapshot object with `key`, `contentHash`, `timestamp`

**Example:**
```javascript
const snapshot = await snapshotStore.store('workflow-state', {
  step: 'build',
  status: 'completed',
  artifacts: ['dist/bundle.js']
}, {
  description: 'Workflow state after build step',
  tags: ['workflow', 'build', 'production'],
  activity: 'workflow-execution-abc123',
  agent: 'system'
})
```

#### `async retrieve(key, options)`

Retrieve latest snapshot or specific version.

**Parameters:**
- `key` - Snapshot key
- `options.version` - Specific version (default: latest)
- `options.includeLineage` - Include full history (default: false)

**Returns:** `Promise<Snapshot>` - Snapshot with content and metadata

**Example:**
```javascript
const snapshot = await snapshotStore.retrieve('workflow-state', {
  includeLineage: true
})

console.log(`Retrieved snapshot from ${snapshot.timestamp}`)
console.log(`Content hash: ${snapshot.contentHash}`)
```

#### `async getLineage(key, depth)`

Get snapshot history with provenance chain.

**Parameters:**
- `key` - Snapshot key
- `depth` - How many versions to retrieve (default: 10)

**Returns:** `Promise<Array<Snapshot>>` - Ordered array from newest to oldest

**Example:**
```javascript
const history = await snapshotStore.getLineage('workflow-state', 5)
history.forEach((snap, i) => {
  console.log(`${i}. ${snap.timestamp} - ${snap.description}`)
})
```

---

### RDFQueueManager

Manages job queue with dependency resolution.

#### `async addJob(jobId, jobSpec)`

Add a job to the queue with dependencies.

**Parameters:**
- `jobId` - Unique job identifier
- `jobSpec` - Job specification with:
  - `name` - Job name
  - `priority` - Priority level (Critical, High, Normal, Low)
  - `dependsOn` - Array of job IDs this depends on
  - `timeout` - Job timeout in ms
  - `payload` - Job payload data

**Returns:** `Promise<Job>` - Job object

**Throws:** `CircularDependencyError` if circular dependency detected

**Example:**
```javascript
await queueManager.addJob('test-job', {
  name: 'Run tests',
  priority: 'High',
  dependsOn: ['build-job'],
  timeout: 300000,
  payload: { testSuite: 'unit' }
})
```

#### `async getExecutionOrder()`

Get topologically sorted job execution order.

**Returns:** `Promise<Array<string>>` - Job IDs in execution order

**Example:**
```javascript
const order = await queueManager.getExecutionOrder()
console.log('Execution order:', order)
// => ['build-job', 'test-job', 'deploy-job']
```

#### `async detectCircularDependencies()`

Check for circular job dependencies.

**Returns:** `Promise<boolean>` - True if circular dependencies exist

**Example:**
```javascript
if (await queueManager.detectCircularDependencies()) {
  throw new Error('Cannot execute: circular dependencies detected')
}
```

#### `async getCriticalPath()`

Analyze critical path through job DAG.

**Returns:** `Promise<Array<Job>>` - Jobs on critical path with depth

**Example:**
```javascript
const criticalPath = await queueManager.getCriticalPath()
console.log(`Critical path length: ${criticalPath.length}`)
```

---

## SPARQL Query Patterns

### Pattern 1: Deadlock Detection

**Use Case:** Detect circular lock dependencies

```sparql
ASK WHERE {
  ?lock1 lock:blockedBy ?lock2 .
  ?lock2 lock:blockedBy+ ?lock1 .
}
```

**JavaScript:**
```javascript
const hasDeadlock = await lockManager.detectDeadlocks()
```

### Pattern 2: Lock Duration Analysis

**Use Case:** Find abnormally long locks

```sparql
SELECT ?lock ?owner ?duration WHERE {
  ?lock a lock:Lock ;
        lock:owner ?owner ;
        lock:acquiredAt ?acquiredAt ;
        lock:state lock:Active .
  BIND((NOW() - ?acquiredAt) AS ?duration)
  FILTER(?duration > 300000)  # > 5 minutes
}
ORDER BY DESC(?duration)
```

### Pattern 3: Snapshot Lineage

**Use Case:** Trace snapshot history

```sparql
DESCRIBE ?snapshot WHERE {
  ?snapshot snap:key "workflow-state" ;
           snap:previousSnapshot* ?earlier ;
           prov:wasGeneratedBy ?activity .
}
```

### Pattern 4: Job Topological Sort

**Use Case:** Get executable jobs (no pending dependencies)

```sparql
SELECT ?job WHERE {
  ?job a queue:Job ;
       queue:status queue:Pending .
  FILTER(NOT EXISTS {
    ?job queue:dependsOn ?dep .
    ?dep queue:status ?status .
    FILTER(?status != queue:Completed)
  })
}
ORDER BY DESC(?priority)
```

---

## Common Patterns & Best Practices

### Pattern: Lock Acquisition with Retry

```javascript
async function acquireLockWithRetry(lockName, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await lockManager.acquireLock(lockName, {
        timeout: 30000
      })
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

### Pattern: Snapshot with Lineage Tracking

```javascript
async function createSnapshotWithLineage(key, value, metadata) {
  // Get previous snapshot
  const previous = await snapshotStore.retrieve(key).catch(() => null)

  // Store new snapshot
  const snapshot = await snapshotStore.store(key, value, {
    ...metadata,
    previousSnapshot: previous?.id
  })

  return snapshot
}
```

### Pattern: Job Batch with Dependencies

```javascript
async function submitJobBatch(jobs) {
  // Detect circular dependencies before submitting
  if (await queueManager.detectCircularDependencies()) {
    throw new Error('Circular dependency detected')
  }

  // Add all jobs
  for (const job of jobs) {
    await queueManager.addJob(job.id, job.spec)
  }

  // Return execution order
  return await queueManager.getExecutionOrder()
}
```

---

## Troubleshooting

### Issue: "Context not available" error

**Cause:** RDF operations used outside `withGitVan()` context

**Solution:**
```javascript
import { withGitVan } from 'gitvan'

await withGitVan(context, async () => {
  const lock = await lockManager.acquireLock('my-resource')
  // ... rest of code
})
```

### Issue: SPARQL query timeout

**Cause:** Large RDF graph or complex query

**Solutions:**
1. Enable query caching
2. Add indexes to frequently queried properties
3. Reduce query depth with LIMIT clause
4. Use more specific FILTER conditions

```javascript
// Enable caching
const ks = createKnowledgeSubstrateCore({
  caching: true,
  cacheSize: 1000
})
```

### Issue: Deadlock not detected

**Cause:** Lock relationships not properly recorded in RDF

**Solution:** Ensure `blockedBy` property is set when lock acquisition fails:

```javascript
// This happens automatically in RDFLockManager
if (lockHeld) {
  await ks.addTriple(newLock, 'lock:blockedBy', existingLock)
}
```

### Issue: Snapshot lineage broken

**Cause:** `previousSnapshot` not linked correctly

**Solution:**
```javascript
const previous = await snapshotStore.retrieve(key).catch(() => null)
await snapshotStore.store(key, value, {
  previousSnapshot: previous?.id  // Link to previous
})
```

---

## Performance Tuning

### 1. Enable Caching

```javascript
const ks = createKnowledgeSubstrateCore({
  caching: true,
  cacheSize: 1000,        // Number of query results to cache
  cacheTTL: 300000        // Cache TTL: 5 minutes
})
```

**Impact:** 10x faster for repeated queries

### 2. Use Batch Operations

```javascript
// Bad: Multiple individual operations
for (const job of jobs) {
  await queueManager.addJob(job.id, job.spec)
}

// Good: Batch operation
await queueManager.addJobBatch(jobs)
```

**Impact:** 5x faster for bulk operations

### 3. Limit Query Results

```javascript
// Add LIMIT to SPARQL queries
const query = `
  SELECT ?lock WHERE {
    ?lock a lock:Lock .
  }
  LIMIT 100
`
```

**Impact:** Faster queries, lower memory

### 4. Use ASK Queries for Boolean Checks

```javascript
// Bad: Count all results
const locks = await lockManager.listLocks()
const hasLocks = locks.length > 0

// Good: Use ASK query
const hasLocks = await ks.ask(`
  ASK WHERE { ?lock a lock:Lock }
`)
```

**Impact:** 100x faster for existence checks

### 5. Cleanup Expired Locks Regularly

```javascript
// Run cleanup job every 5 minutes
setInterval(async () => {
  await lockManager.cleanupExpiredLocks()
}, 300000)
```

**Impact:** Prevents RDF graph bloat

---

## Next Steps

- **Week 2**: RDFLockManager implementation
- **Week 3**: RDFSnapshotStore and RDFQueueManager
- **Week 4**: Integration testing and production rollout

See [PHASE-1-GIT-NATIVE-RDF-IMPLEMENTATION.md](PHASE-1-GIT-NATIVE-RDF-IMPLEMENTATION.md) for complete implementation plan.

---

**Questions?** See [SPARQL-QUERIES-REFERENCE.md](SPARQL-QUERIES-REFERENCE.md) for detailed query documentation.
