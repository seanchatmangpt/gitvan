# SPARQL Queries Reference: Phase 1 RDF Implementation

**Version:** 1.0.0
**Last Updated:** January 9, 2026
**Phase:** Phase 1 - Git-Native I/O RDF Refactoring

---

## Table of Contents

1. [Lock Queries](#lock-queries)
2. [Snapshot Queries](#snapshot-queries)
3. [Queue Queries](#queue-queries)
4. [Performance Notes](#performance-notes)
5. [Extending with Custom Queries](#extending-with-custom-queries)

---

## Lock Queries

All lock queries operate on the `lock:` ontology (`https://gitvan.dev/lock#`).

### Query 1: Deadlock Detection (ASK)

**Purpose:** Detect circular lock dependencies (A blocks B, B blocks A)

**Type:** ASK (boolean result)

```sparql
PREFIX lock: <https://gitvan.dev/lock#>

ASK WHERE {
  ?lock1 lock:blockedBy ?lock2 .
  ?lock2 lock:blockedBy+ ?lock1 .
}
```

**Returns:** `true` if circular dependency exists, `false` otherwise

**JavaScript Usage:**
```javascript
const hasDeadlock = await lockManager.detectDeadlocks()
if (hasDeadlock) {
  console.error('⚠ Deadlock detected!')
}
```

**Performance:** O(n²) where n = number of locks. Use indexing on `lock:blockedBy`.

**Explanation:**
- `?lock1 lock:blockedBy ?lock2` - lock1 is blocked by lock2
- `?lock2 lock:blockedBy+ ?lock1` - lock2 is transitively blocked by lock1 (cycle!)
- `+` operator means "one or more" (transitive closure)

---

### Query 2: Get Deadlocked Locks (SELECT)

**Purpose:** Return all locks involved in deadlock cycles

**Type:** SELECT (returns specific locks)

```sparql
PREFIX lock: <https://gitvan.dev/lock#>

SELECT DISTINCT ?lock ?owner ?resource WHERE {
  ?lock lock:blockedBy ?blocker .
  ?blocker lock:blockedBy+ ?lock .
  ?lock lock:owner ?owner ;
        lock:resourceId ?resource .
}
```

**Returns:** Array of `{ lock, owner, resource }`

**JavaScript Usage:**
```javascript
const deadlocks = await lockManager.getDeadlockedLocks()
deadlocks.forEach(lock => {
  console.log(`Lock ${lock.lock} on ${lock.resource} by ${lock.owner}`)
})
```

**Performance:** O(n²). Cache results for 1-5 seconds.

---

### Query 3: Blocking Chain (SELECT)

**Purpose:** Get full chain of locks blocking a specific lock

**Type:** SELECT (ordered chain)

```sparql
PREFIX lock: <https://gitvan.dev/lock#>

SELECT ?blocker ?owner ?depth WHERE {
  <LOCK_URI> lock:blockedBy* ?blocker .
  ?blocker lock:owner ?owner .
  BIND(COUNT(*) AS ?depth)
}
ORDER BY ?depth
```

**Returns:** Ordered array from immediate blocker to root

**JavaScript Usage:**
```javascript
const chain = await lockManager.getBlockingChain('my-lock')
console.log(`Blocked by ${chain.length} locks`)
```

**Performance:** O(n) where n = chain length. Fast with proper indexes.

---

### Query 4: Locks Blocking Resource (SELECT)

**Purpose:** Find all locks preventing access to a specific resource

**Type:** SELECT (with duration calculation)

```sparql
PREFIX lock: <https://gitvan.dev/lock#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?lock ?owner ?duration WHERE {
  ?lock lock:resourceId "RESOURCE_ID" ;
        lock:owner ?owner ;
        lock:acquiredAt ?acquiredAt ;
        lock:state lock:Active .
  BIND((NOW() - ?acquiredAt) AS ?duration)
}
ORDER BY DESC(?duration)
```

**Returns:** Locks with `{ lock, owner, duration }` sorted by longest-held first

**JavaScript Usage:**
```javascript
const blockers = await lockManager.getBlockingLocks('workflow-state')
blockers.forEach(lock => {
  console.log(`${lock.owner} holding for ${lock.duration}ms`)
})
```

**Performance:** O(n) where n = locks on resource. Very fast with resource index.

---

### Query 5: Abnormally Long Locks (SELECT)

**Purpose:** Find locks held longer than acceptable duration

**Type:** SELECT (filtered by duration)

```sparql
PREFIX lock: <https://gitvan.dev/lock#>

SELECT ?lock ?owner ?resource ?duration WHERE {
  ?lock a lock:Lock ;
        lock:owner ?owner ;
        lock:resourceId ?resource ;
        lock:acquiredAt ?acquiredAt ;
        lock:expiresAt ?expiresAt ;
        lock:state lock:Active .
  BIND((?expiresAt - ?acquiredAt) AS ?duration)
  FILTER(?duration > MAX_DURATION_MS)
}
ORDER BY DESC(?duration)
```

**Returns:** Locks exceeding threshold, sorted by duration

**JavaScript Usage:**
```javascript
const longLocks = await lockManager.getAbnormallyLongLocks(300000)  // > 5min
if (longLocks.length > 0) {
  console.warn(`Found ${longLocks.length} long-running locks`)
}
```

**Performance:** O(n) full scan. Consider adding time-based index.

---

### Query 6: Lock Owner Statistics (SELECT)

**Purpose:** Get statistics for a specific lock owner

**Type:** SELECT (aggregated)

```sparql
PREFIX lock: <https://gitvan.dev/lock#>

SELECT ?owner
       (COUNT(?lock) AS ?lockCount)
       (AVG(?duration) AS ?avgDuration)
       (MAX(?duration) AS ?maxDuration)
WHERE {
  ?lock lock:owner ?owner ;
        lock:acquiredAt ?acquiredAt .
  BIND((NOW() - ?acquiredAt) AS ?duration)
  FILTER(?owner = "OWNER_ID")
}
GROUP BY ?owner
```

**Returns:** `{ owner, lockCount, avgDuration, maxDuration }`

**JavaScript Usage:**
```javascript
const stats = await lockManager.getOwnerStats('process-12345')
console.log(`Owner holds ${stats.lockCount} locks, avg ${stats.avgDuration}ms`)
```

**Performance:** O(n) where n = locks by owner. Fast with owner index.

---

### Query 7: Active Locks Count (SELECT)

**Purpose:** Count currently active locks

**Type:** SELECT (aggregation)

```sparql
PREFIX lock: <https://gitvan.dev/lock#>

SELECT (COUNT(?lock) AS ?count) WHERE {
  ?lock a lock:Lock ;
        lock:state lock:Active .
}
```

**Returns:** `{ count: number }`

**JavaScript Usage:**
```javascript
const count = await lockManager.getActiveLocksCount()
console.log(`${count} active locks`)
```

**Performance:** O(n). Consider caching for 1-5 seconds.

**Optimization:** Use ASK for existence check instead of COUNT when possible.

---

## Snapshot Queries

All snapshot queries operate on the `snap:` ontology (`https://gitvan.dev/snapshot#`).

### Query 8: Snapshot Lineage (DESCRIBE)

**Purpose:** Get full provenance chain for a snapshot

**Type:** DESCRIBE (returns full graph)

```sparql
PREFIX snap: <https://gitvan.dev/snapshot#>
PREFIX prov: <http://www.w3.org/ns/prov#>

DESCRIBE ?snapshot WHERE {
  ?snapshot snap:key "SNAPSHOT_KEY" ;
           snap:previousSnapshot* ?earlier ;
           prov:wasGeneratedBy ?activity .
}
```

**Returns:** Full RDF graph including all related triples

**JavaScript Usage:**
```javascript
const lineage = await snapshotStore.getLineage('workflow-state')
console.log(`Snapshot chain: ${lineage.length} versions`)
```

**Performance:** O(n) where n = chain length. Use `LIMIT` to bound depth.

---

### Query 9: Snapshot Timeline (SELECT)

**Purpose:** Get ordered timeline of snapshots for a key

**Type:** SELECT (ordered by timestamp)

```sparql
PREFIX snap: <https://gitvan.dev/snapshot#>
PREFIX prov: <http://www.w3.org/ns/prov#>

SELECT ?timestamp ?contentHash ?activity ?description WHERE {
  ?snapshot snap:key ?key ;
           snap:timestamp ?timestamp ;
           snap:contentHash ?contentHash ;
           prov:wasGeneratedBy ?activity ;
           snap:description ?description .
  FILTER(?key = "SNAPSHOT_KEY")
}
ORDER BY DESC(?timestamp)
LIMIT 50
```

**Returns:** Ordered array of snapshots with metadata

**JavaScript Usage:**
```javascript
const timeline = await snapshotStore.queryTimeline('workflow-state', 50)
timeline.forEach(snap => {
  console.log(`${snap.timestamp}: ${snap.description}`)
})
```

**Performance:** O(n log n) for sort. Index on `snap:key` and `snap:timestamp`.

---

### Query 10: Snapshots by Tag (SELECT)

**Purpose:** Find all snapshots with specific tags

**Type:** SELECT (filtered by tag)

```sparql
PREFIX snap: <https://gitvan.dev/snapshot#>

SELECT ?snapshot ?key ?timestamp WHERE {
  ?snapshot snap:key ?key ;
           snap:timestamp ?timestamp ;
           snap:tags ?tags .
  FILTER(CONTAINS(?tags, "TAG"))
}
ORDER BY DESC(?timestamp)
```

**Returns:** Snapshots matching tag

**JavaScript Usage:**
```javascript
const snapshots = await snapshotStore.findByTag('production')
console.log(`Found ${snapshots.length} production snapshots`)
```

**Performance:** O(n) full scan. Consider separate triple for each tag for indexing.

---

### Query 11: Snapshot Provenance (SELECT)

**Purpose:** Get provenance information for snapshots

**Type:** SELECT (with PROV-O)

```sparql
PREFIX snap: <https://gitvan.dev/snapshot#>
PREFIX prov: <http://www.w3.org/ns/prov#>

SELECT ?snapshot ?activity ?agent ?timestamp WHERE {
  ?snapshot snap:key "SNAPSHOT_KEY" ;
           snap:timestamp ?timestamp ;
           prov:wasGeneratedBy ?activity ;
           prov:wasAttributedTo ?agent .
}
ORDER BY DESC(?timestamp)
```

**Returns:** Provenance trail with activities and agents

**JavaScript Usage:**
```javascript
const provenance = await snapshotStore.getProvenance('workflow-state')
provenance.forEach(p => {
  console.log(`Created by ${p.agent} via ${p.activity}`)
})
```

**Performance:** O(n). Fast with proper PROV-O indexing.

---

## Queue Queries

All queue queries operate on the `queue:` ontology (`https://gitvan.dev/queue#`).

### Query 12: Topological Sort (SELECT)

**Purpose:** Get jobs with no pending dependencies (ready to execute)

**Type:** SELECT (filtered)

```sparql
PREFIX queue: <https://gitvan.dev/queue#>

SELECT ?job ?priority WHERE {
  ?job a queue:Job ;
       queue:status queue:Pending ;
       queue:priority ?priority .
  FILTER(NOT EXISTS {
    ?job queue:dependsOn ?dep .
    ?dep queue:status ?status .
    FILTER(?status != queue:Completed)
  })
}
ORDER BY DESC(?priority)
```

**Returns:** Executable jobs ordered by priority

**JavaScript Usage:**
```javascript
const ready = await queueManager.getReadyJobs()
console.log(`${ready.length} jobs ready to execute`)
```

**Performance:** O(n²) worst case. Cache for 1-2 seconds during batch processing.

---

### Query 13: Circular Dependencies (ASK)

**Purpose:** Detect circular job dependencies

**Type:** ASK (boolean)

```sparql
PREFIX queue: <https://gitvan.dev/queue#>

ASK WHERE {
  ?job1 queue:dependsOn ?job2 .
  ?job2 queue:dependsOn+ ?job1 .
}
```

**Returns:** `true` if circular dependency exists

**JavaScript Usage:**
```javascript
if (await queueManager.detectCircularDependencies()) {
  throw new Error('Circular dependency detected in job queue')
}
```

**Performance:** O(n²). Run before batch job submission.

---

### Query 14: Critical Path (SELECT)

**Purpose:** Find longest dependency chain (critical path)

**Type:** SELECT (with depth calculation)

```sparql
PREFIX queue: <https://gitvan.dev/queue#>

SELECT ?job (COUNT(?dep) AS ?depth) WHERE {
  ?job a queue:Job ;
       queue:dependsOn* ?dep .
  ?dep a queue:Job .
}
GROUP BY ?job
ORDER BY DESC(?depth)
LIMIT 1
```

**Returns:** Critical path jobs with depth

**JavaScript Usage:**
```javascript
const criticalPath = await queueManager.getCriticalPath()
console.log(`Critical path depth: ${criticalPath[0].depth}`)
```

**Performance:** O(n²). Expensive query - cache heavily.

---

### Query 15: Job Dependencies Graph (CONSTRUCT)

**Purpose:** Build dependency graph for visualization

**Type:** CONSTRUCT (creates new graph)

```sparql
PREFIX queue: <https://gitvan.dev/queue#>

CONSTRUCT {
  ?job queue:dependsOn ?dep .
  ?job queue:jobName ?name .
  ?dep queue:jobName ?depName .
} WHERE {
  ?job a queue:Job ;
       queue:dependsOn ?dep ;
       queue:jobName ?name .
  ?dep queue:jobName ?depName .
}
```

**Returns:** RDF graph of job dependencies

**JavaScript Usage:**
```javascript
const graph = await queueManager.getDependencyGraph()
// Visualize graph with D3.js or similar
```

**Performance:** O(n). Fast and cacheable.

---

### Query 16: Job Status Summary (SELECT)

**Purpose:** Get count of jobs by status

**Type:** SELECT (aggregated)

```sparql
PREFIX queue: <https://gitvan.dev/queue#>

SELECT ?status (COUNT(?job) AS ?count) WHERE {
  ?job a queue:Job ;
       queue:status ?status .
}
GROUP BY ?status
```

**Returns:** `{ status, count }` for each status

**JavaScript Usage:**
```javascript
const summary = await queueManager.getStatusSummary()
summary.forEach(s => {
  console.log(`${s.status}: ${s.count} jobs`)
})
```

**Performance:** O(n). Cache for 5-10 seconds.

---

## Performance Notes

### General Optimization Tips

1. **Use ASK instead of COUNT when checking existence**
   ```sparql
   # Bad: COUNT is slow
   SELECT (COUNT(?lock) AS ?count) WHERE { ?lock a lock:Lock }
   FILTER(?count > 0)

   # Good: ASK is fast
   ASK WHERE { ?lock a lock:Lock }
   ```

2. **Add LIMIT to unbounded queries**
   ```sparql
   SELECT ?lock WHERE {
     ?lock a lock:Lock
   }
   LIMIT 100  # Prevent memory exhaustion
   ```

3. **Use FILTER efficiently**
   ```sparql
   # Bad: Filter after expensive join
   SELECT ?lock WHERE {
     ?lock lock:blockedBy* ?blocker .
     FILTER(?lock = <specific-lock>)
   }

   # Good: Filter early
   SELECT ?lock WHERE {
     BIND(<specific-lock> AS ?lock)
     ?lock lock:blockedBy* ?blocker .
   }
   ```

4. **Cache query results**
   ```javascript
   // Cache expensive queries
   const cache = new Map()
   const cacheKey = `deadlock-check-${Date.now()}`
   if (cache.has(cacheKey)) return cache.get(cacheKey)

   const result = await ks.ask(deadlockQuery)
   cache.set(cacheKey, result)
   setTimeout(() => cache.delete(cacheKey), 5000)  // 5s TTL
   ```

5. **Index frequently queried properties**
   ```javascript
   // Create indexes on commonly filtered properties
   await ks.createIndex('lock:owner')
   await ks.createIndex('lock:resourceId')
   await ks.createIndex('snap:key')
   await ks.createIndex('queue:status')
   ```

### Query Complexity Ranking

| Query Type | Complexity | Cache Duration | Notes |
|------------|-----------|----------------|-------|
| ASK (existence) | O(1)-O(n) | 1-5s | Fast, use liberally |
| SELECT (filtered) | O(n) | 5-10s | Fast with indexes |
| SELECT (aggregate) | O(n) | 10-30s | Cache heavily |
| SELECT (join) | O(n²) | 30-60s | Expensive, minimize |
| DESCRIBE | O(n) | 60s+ | Returns full graph |
| CONSTRUCT | O(n²) | 60s+ | Expensive, cache |

### Caching Strategy

```javascript
// L1 Cache: In-memory (50 queries, 1-5s TTL)
const l1Cache = new LRUCache({ max: 50, ttl: 5000 })

// L2 Cache: Extended (200 results, 30-60s TTL)
const l2Cache = new LRUCache({ max: 200, ttl: 60000 })

// L3 Cache: Disk (100MB, 5min TTL)
const l3Cache = new DiskCache({ maxSize: 100 * 1024 * 1024, ttl: 300000 })

async function cachedQuery(query, level = 'L1') {
  const caches = { L1: l1Cache, L2: l2Cache, L3: l3Cache }
  const cache = caches[level]

  const cached = await cache.get(query)
  if (cached) return cached

  const result = await ks.query(query)
  await cache.set(query, result)
  return result
}
```

---

## Extending with Custom Queries

### Adding a Custom Lock Query

```javascript
// 1. Define SPARQL query
const customLockQuery = `
  PREFIX lock: <https://gitvan.dev/lock#>

  SELECT ?lock ?priority WHERE {
    ?lock a lock:Lock ;
          lock:priority ?priority ;
          lock:state lock:Active .
    FILTER(?priority > 100)
  }
  ORDER BY DESC(?priority)
`

// 2. Add method to RDFLockManager
class RDFLockManager {
  async getHighPriorityLocks() {
    const results = await this.ks.query(customLockQuery)
    return results.map(r => ({
      lock: r.lock.value,
      priority: parseInt(r.priority.value)
    }))
  }
}

// 3. Use it
const highPriorityLocks = await lockManager.getHighPriorityLocks()
```

### Adding a Custom Snapshot Query

```javascript
// Find snapshots created in last 24 hours
const recentSnapshotsQuery = `
  PREFIX snap: <https://gitvan.dev/snapshot#>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

  SELECT ?snapshot ?key ?timestamp WHERE {
    ?snapshot snap:key ?key ;
             snap:timestamp ?timestamp .
    FILTER(?timestamp > "YESTERDAY"^^xsd:dateTime)
  }
`

class RDFSnapshotStore {
  async getRecentSnapshots(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 3600000).toISOString()
    const query = recentSnapshotsQuery.replace('YESTERDAY', cutoff)
    return await this.ks.query(query)
  }
}
```

### Testing Custom Queries

```javascript
import { describe, it, expect } from 'vitest'

describe('Custom SPARQL Queries', () => {
  it('should find high priority locks', async () => {
    const locks = await lockManager.getHighPriorityLocks()
    expect(locks).toBeInstanceOf(Array)
    locks.forEach(lock => {
      expect(lock.priority).toBeGreaterThan(100)
    })
  })

  it('should find recent snapshots', async () => {
    const snapshots = await snapshotStore.getRecentSnapshots(24)
    expect(snapshots.length).toBeGreaterThanOrEqual(0)
  })
})
```

---

## Query Templates

### Template: Find Resources by Property

```sparql
PREFIX ns: <NAMESPACE>

SELECT ?resource ?value WHERE {
  ?resource ns:PROPERTY ?value .
  FILTER(CONDITION)
}
ORDER BY ?value
LIMIT 100
```

### Template: Aggregation Query

```sparql
PREFIX ns: <NAMESPACE>

SELECT ?group (COUNT(?item) AS ?count) (AVG(?value) AS ?avg) WHERE {
  ?item ns:property ?value ;
        ns:group ?group .
}
GROUP BY ?group
ORDER BY DESC(?count)
```

### Template: Transitive Closure

```sparql
PREFIX ns: <NAMESPACE>

SELECT ?start ?end WHERE {
  <START_URI> ns:relation+ ?end .
}
```

---

## References

- **SPARQL 1.1 Spec**: https://www.w3.org/TR/sparql11-query/
- **UnRDF Documentation**: vendor/unrdf/README.md
- **Phase 1 Plan**: [PHASE-1-GIT-NATIVE-RDF-IMPLEMENTATION.md](PHASE-1-GIT-NATIVE-RDF-IMPLEMENTATION.md)
- **Implementation Guide**: [PHASE-1-IMPLEMENTATION-GUIDE.md](PHASE-1-IMPLEMENTATION-GUIDE.md)

---

**Last Updated:** January 9, 2026
**Queries Documented:** 16 core queries + templates
**Status:** Ready for Week 2-4 implementation
