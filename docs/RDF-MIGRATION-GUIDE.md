# RDF Migration Guide

**Version:** 3.0.0-alpha
**Phase:** Phase 1, Week 4, Task 4.2
**Status:** Implementation Complete

---

## Overview

The RDF Migration Adapter provides a safe, gradual migration path from JSON-based storage to RDF-backed semantic state management in GitVan's Git-Native I/O subsystem. This bridge enables backward compatibility while transitioning to the more powerful RDF implementation.

### Why Migrate to RDF?

- **Semantic Deadlock Detection** - Query circular lock dependencies with SPARQL
- **Advanced Lock Analytics** - Duration analysis, resource contention patterns
- **Snapshot Provenance** - Full audit trail of state evolution with PROV-O
- **Queue Reasoning** - Automatic dependency resolution via RDF graphs

### Migration Strategy

The adapter supports three migration modes, enabling a phased rollout:

```
JSON-only → dual-write → rdf-primary → rdf-only
```

---

## Migration Modes

### 1. `dual-write` (Default)

**Purpose:** Safe deployment with rollback capability

**Behavior:**
- Writes to both JSON and RDF systems
- Reads from RDF, falls back to JSON if needed
- Logs discrepancies between systems
- Returns success only if both writes succeed (for locks)

**Use Case:**
- Initial deployment of RDF system
- Testing RDF implementation in production
- Building confidence in RDF correctness

**Risk Level:** ✅ Low (full rollback capability)

```javascript
const adapter = new RDFLockManagerAdapter(jsonManager, rdfManager, {
  mode: 'dual-write',
  logger: console
});
```

---

### 2. `rdf-primary`

**Purpose:** Transition to RDF with JSON fallback

**Behavior:**
- Writes to both systems (for safety)
- Always reads from RDF first
- Falls back to JSON only if RDF read fails
- Tracks fallback rate for monitoring

**Use Case:**
- After RDF correctness is validated
- Transitioning read traffic to RDF
- Preparing for JSON system retirement

**Risk Level:** ⚠️ Medium (RDF must be reliable)

```javascript
adapter.setMigrationMode('rdf-primary');
```

---

### 3. `rdf-only`

**Purpose:** Full migration complete

**Behavior:**
- Only interacts with RDF system
- No JSON reads or writes
- Maximum performance (no dual operations)
- JSON system can be decommissioned

**Use Case:**
- After extensive testing in `rdf-primary` mode
- RDF system proven reliable in production
- Ready to remove JSON dependencies

**Risk Level:** 🔴 High (no fallback)

```javascript
adapter.setMigrationMode('rdf-only');
```

---

## Architecture

### Components

#### 1. **RDFLockManagerAdapter**

Bridges `LockManager` (JSON) and RDF-based lock implementation.

**Key Methods:**
- `acquireLock(lockName, options)` - Dual-write or RDF-only acquisition
- `releaseLock(lockName)` - Release from both systems
- `getLockInfo(lockName)` - Read with fallback strategy
- `listLocks()` - Merge results from both systems

**Statistics Tracked:**
- RDF read/write counts
- JSON read/write counts
- Error rates (RDF vs JSON)
- Fallback frequency
- Data discrepancies

---

#### 2. **RDFSnapshotStoreAdapter**

Bridges `SnapshotStore` (JSON) and RDF-based snapshot implementation.

**Key Methods:**
- `storeSnapshot(key, data, metadata)` - Store in both systems
- `getSnapshot(key, contentHash)` - Read with fallback
- `listSnapshots()` - Merge snapshot lists
- `cleanupCache(maxAgeMs)` - Clean both caches

**Statistics Tracked:**
- Cache hit/miss rates
- Storage sizes
- Content hash mismatches
- Provenance chain integrity

---

#### 3. **RDFQueueManagerAdapter**

Bridges `QueueManager` (JSON) and RDF-based queue implementation.

**Key Methods:**
- `addJob(priority, job, metadata)` - Execute in RDF queue
- `getStatus()` - Merge queue status
- `pauseAll() / resumeAll()` - Control both queues
- `reconcile()` - Recover interrupted jobs

**Statistics Tracked:**
- Job execution counts
- Priority distribution
- Queue depth over time
- Job dependency resolution

---

## Usage Examples

### Basic Setup

```javascript
import { createMigrationAdapters } from './src/git-native/RDFMigrationAdapter.mjs';
import { LockManager } from './src/git-native/LockManager.mjs';
import { SnapshotStore } from './src/git-native/SnapshotStore.mjs';
import { QueueManager } from './src/git-native/QueueManager.mjs';

// Import RDF-based implementations (when available)
import { RDFLockManager } from './src/git-native/RDFLockManager.mjs';
import { RDFSnapshotStore } from './src/git-native/RDFSnapshotStore.mjs';
import { RDFQueueManager } from './src/git-native/RDFQueueManager.mjs';

// Create adapters
const adapters = createMigrationAdapters({
  jsonLockManager: new LockManager({ cwd: '/repo' }),
  rdfLockManager: new RDFLockManager({ cwd: '/repo' }),
  jsonSnapshotStore: new SnapshotStore({ cwd: '/repo' }),
  rdfSnapshotStore: new RDFSnapshotStore({ cwd: '/repo' }),
  jsonQueueManager: new QueueManager({ cwd: '/repo' }),
  rdfQueueManager: new RDFQueueManager({ cwd: '/repo' }),
  mode: 'dual-write',
  logger: console
});

// Initialize all adapters
await adapters.lockManager.initialize();
await adapters.snapshotStore.initialize();
await adapters.queueManager.initialize();

// Use adapters transparently
await adapters.lockManager.acquireLock('my-resource');
await adapters.snapshotStore.storeSnapshot('state', { data: 'value' });
await adapters.queueManager.addJob('high', async () => {
  // Job implementation
});
```

---

### Lock Management Example

```javascript
const lockAdapter = adapters.lockManager;

// Acquire a lock (writes to both systems in dual-write mode)
const acquired = await lockAdapter.acquireLock('critical-resource', {
  timeout: 60000,
  fingerprint: 'worker-1',
  exclusive: true
});

if (acquired) {
  try {
    // Perform critical operation
    await performCriticalOperation();
  } finally {
    // Release lock (from both systems)
    await lockAdapter.releaseLock('critical-resource');
  }
}

// Get lock info (reads from RDF, falls back to JSON)
const lockInfo = await lockAdapter.getLockInfo('critical-resource');
console.log('Lock held by:', lockInfo?.owner);

// List all locks (merged from both systems)
const locks = await lockAdapter.listLocks();
console.log('Active locks:', locks.length);
```

---

### Snapshot Management Example

```javascript
const snapshotAdapter = adapters.snapshotStore;

// Store state snapshot
const contentHash = await snapshotAdapter.storeSnapshot(
  'workflow-state',
  { step: 3, data: { foo: 'bar' } },
  { workflow: 'deploy', version: '1.0' }
);

// Retrieve snapshot (from RDF preferentially)
const state = await snapshotAdapter.getSnapshot('workflow-state', contentHash);

// List all snapshots
const snapshots = await snapshotAdapter.listSnapshots();
console.log('Total snapshots:', snapshots.length);

// Get cache statistics
const stats = snapshotAdapter.getStatistics();
console.log('Hit rate:', stats.hitRate);
```

---

### Queue Management Example

```javascript
const queueAdapter = adapters.queueManager;

// Add high-priority job
await queueAdapter.addJob('high', async () => {
  console.log('Executing high-priority job');
  return { success: true };
}, { name: 'deployment', tags: { env: 'prod' } });

// Get queue status
const status = queueAdapter.getStatus();
console.log('High priority queue:', status.high);

// Pause processing during maintenance
queueAdapter.pauseAll();
// ... perform maintenance ...
queueAdapter.resumeAll();
```

---

## Monitoring & Health Checks

### Statistics Collection

All adapters track detailed statistics accessible via `getStats()`:

```javascript
const stats = adapter.getStats();

console.log('Migration Statistics:');
console.log('  Mode:', stats.mode);
console.log('  RDF Reads:', stats.rdfReads);
console.log('  JSON Reads:', stats.jsonReads);
console.log('  RDF Read Ratio:', stats.rdfReadRatio);
console.log('  Error Rate:', stats.errorRate);
console.log('  Fallback Rate:', stats.fallbackRate);
console.log('  Discrepancies:', stats.discrepancies);
```

---

### Health Check System

Use the `getMigrationHealth()` function to assess migration status:

```javascript
import { getMigrationHealth } from './src/git-native/RDFMigrationAdapter.mjs';

const health = getMigrationHealth(adapters);

console.log('Migration Health:', health.status); // 'healthy' or 'degraded'
console.log('Timestamp:', health.timestamp);

for (const [name, adapterHealth] of Object.entries(health.adapters)) {
  console.log(`\n${name}:`);
  console.log('  Mode:', adapterHealth.mode);
  console.log('  Issues:', adapterHealth.issues);
  console.log('  Stats:', adapterHealth.stats);
}
```

**Health Status:**
- `healthy` - All metrics within acceptable ranges
- `degraded` - One or more issues detected

**Monitored Metrics:**
- Error rate > 5% → Issue flagged
- Discrepancies > 0 → Issue flagged
- Fallback rate > 20% → Warning (expected in rdf-primary mode initially)

---

### Dashboard Queries

Export statistics to monitoring dashboards:

```javascript
// Prometheus-style metrics
setInterval(() => {
  const stats = adapter.getStats();

  metrics.gauge('gitvan_rdf_reads_total', stats.rdfReads);
  metrics.gauge('gitvan_json_reads_total', stats.jsonReads);
  metrics.gauge('gitvan_rdf_read_ratio', stats.rdfReadRatio);
  metrics.gauge('gitvan_error_rate', stats.errorRate);
  metrics.gauge('gitvan_fallback_rate', stats.fallbackRate);
  metrics.gauge('gitvan_discrepancies_total', stats.discrepancies);
}, 10000); // Every 10 seconds
```

---

## Migration Timeline

### Week 1: Deploy `dual-write` Mode

**Goal:** Validate RDF implementation correctness

**Actions:**
1. Deploy adapters in `dual-write` mode
2. Monitor for discrepancies
3. Compare RDF vs JSON data consistency
4. Fix any RDF implementation bugs

**Success Criteria:**
- Zero discrepancies for 48 hours
- Error rate < 1%
- All tests passing

---

### Week 2: Switch to `rdf-primary` Mode

**Goal:** Transition read traffic to RDF

**Actions:**
1. Switch adapters to `rdf-primary` mode
2. Monitor fallback rate (should decrease)
3. Ensure RDF is primary data source
4. Validate performance improvement

**Success Criteria:**
- Fallback rate < 5% after 24 hours
- RDF read ratio > 95%
- No increase in errors

---

### Week 3: Monitor & Optimize

**Goal:** Build confidence in RDF system

**Actions:**
1. Continue monitoring in `rdf-primary` mode
2. Optimize RDF queries if needed
3. Run load tests
4. Document lessons learned

**Success Criteria:**
- 7 days stable operation
- Performance meets/exceeds JSON baseline
- Team confidence in RDF system

---

### Week 4: Switch to `rdf-only` Mode

**Goal:** Complete migration

**Actions:**
1. Switch adapters to `rdf-only` mode
2. Monitor for 48 hours
3. If successful, remove JSON system
4. Archive JSON data for audit

**Success Criteria:**
- No errors in `rdf-only` mode
- Performance optimal
- JSON dependencies removed

---

## Rollback Procedures

### From `rdf-primary` to `dual-write`

```javascript
// No data loss - both systems still active
adapter.setMigrationMode('dual-write');
```

**Impact:** None (JSON still being written to)

---

### From `rdf-only` to `rdf-primary`

**Requires:** JSON system still available

```javascript
// Re-enable JSON system
adapter.setMigrationMode('rdf-primary');
```

**Impact:** Medium (JSON may be stale)

**Recovery Steps:**
1. Set mode to `dual-write`
2. Trigger full sync from RDF to JSON
3. Validate JSON data consistency
4. Resume normal operation

---

### Complete Rollback to JSON

**Emergency procedure if RDF system fails**

```javascript
// Stop using adapters
// Revert to direct JSON managers

const jsonLockManager = new LockManager({ cwd: '/repo' });
await jsonLockManager.initialize();
// Use jsonLockManager directly
```

**Impact:** High (lose RDF benefits)

**Data Loss:** RDF-only data not in JSON

---

## Feature Flags

Configure migration mode via environment variable:

```bash
# Development
export GITVAN_MIGRATION_MODE=dual-write

# Staging
export GITVAN_MIGRATION_MODE=rdf-primary

# Production (after validation)
export GITVAN_MIGRATION_MODE=rdf-only
```

Load in application:

```javascript
const mode = process.env.GITVAN_MIGRATION_MODE || 'dual-write';

const adapters = createMigrationAdapters({
  // ... managers ...
  mode,
  logger: console
});
```

---

## Troubleshooting

### High Error Rate

**Symptom:** `errorRate > 0.05` in health check

**Diagnosis:**
```javascript
const stats = adapter.getStats();
console.log('RDF Errors:', stats.rdfErrors);
console.log('JSON Errors:', stats.jsonErrors);
```

**Solutions:**
- Check RDF system health
- Review error logs for patterns
- Consider rolling back to previous mode
- Verify network connectivity
- Check disk space

---

### Data Discrepancies

**Symptom:** `discrepancies > 0` in health check

**Diagnosis:**
```javascript
// Enable debug logging
adapter.logger.level = 'debug';

// Watch for discrepancy logs
// [Migration] Data discrepancy detected in acquireLock
```

**Solutions:**
- Investigate discrepancy logs
- Compare RDF and JSON data directly
- Check for clock skew (timestamps)
- Verify serialization is deterministic
- File bug report with details

---

### High Fallback Rate

**Symptom:** `fallbackRate > 0.2` in `rdf-primary` mode

**Diagnosis:**
```javascript
const stats = adapter.getStats();
console.log('Fallbacks:', stats.fallbacks);
console.log('RDF Reads:', stats.rdfReads);
```

**Possible Causes:**
- RDF system experiencing intermittent failures
- RDF data incomplete (migration in progress)
- Network issues between app and RDF store

**Solutions:**
- Investigate RDF system logs
- Check RDF query performance
- Ensure RDF system is fully synced
- Consider staying in `dual-write` longer

---

### Performance Degradation

**Symptom:** Operations slower in `dual-write` mode

**Expected:** Yes, dual writes are slower

**Mitigation:**
- Minimize time in `dual-write` mode (1-2 weeks)
- Optimize RDF write performance
- Consider async JSON writes (fire-and-forget)
- Monitor and set performance budgets

**Optimization:**
```javascript
// In dual-write mode, JSON writes can be async
// (Implemented in future version)
```

---

## Best Practices

### 1. Always Use Adapters in Transition

Never mix adapter and direct manager usage:

```javascript
// ✅ Good
await adapter.acquireLock('resource');

// ❌ Bad (inconsistent state)
await jsonManager.acquireLock('resource');
await rdfManager.acquireLock('resource');
```

---

### 2. Monitor Continuously

Set up alerts for:
- Error rate > 5%
- Discrepancies > 0
- Fallback rate > 20% (in rdf-primary)

```javascript
setInterval(() => {
  const health = getMigrationHealth(adapters);
  if (health.status === 'degraded') {
    alertOps('Migration health degraded', health);
  }
}, 60000); // Every minute
```

---

### 3. Test Each Mode Thoroughly

Before advancing:
- Run full test suite
- Load test for 24 hours
- Validate data consistency
- Review logs for warnings

---

### 4. Have Rollback Plan Ready

Document and test rollback procedures:
- Keep JSON system running during migration
- Maintain backups of both systems
- Practice rollback in staging
- Have on-call team ready

---

### 5. Log Everything

Enable comprehensive logging:

```javascript
const adapters = createMigrationAdapters({
  // ...
  logger: {
    info: (msg, data) => console.log('[INFO]', msg, data),
    warn: (msg, data) => console.warn('[WARN]', msg, data),
    error: (msg, data) => console.error('[ERROR]', msg, data),
    debug: (msg, data) => console.debug('[DEBUG]', msg, data)
  }
});
```

---

## FAQ

### Q: How long should we stay in `dual-write` mode?

**A:** Minimum 1 week, maximum 2 weeks. Long enough to validate RDF correctness, short enough to avoid dual-write overhead.

---

### Q: Can we skip `rdf-primary` and go straight to `rdf-only`?

**A:** Not recommended. `rdf-primary` mode builds confidence and allows gradual traffic shifting.

---

### Q: What happens if RDF and JSON data diverge?

**A:** Adapters log discrepancies and prefer RDF data. Investigate immediately to identify root cause.

---

### Q: Is there a performance penalty for adapters?

**A:** Yes, in `dual-write` and `rdf-primary` modes due to dual operations. In `rdf-only` mode, overhead is minimal (one indirection).

---

### Q: Can we run different modes for different components?

**A:** Yes! Lock manager can be in `rdf-primary` while snapshot store is in `dual-write`.

```javascript
adapters.lockManager.setMigrationMode('rdf-primary');
adapters.snapshotStore.setMigrationMode('dual-write');
```

---

### Q: How do we handle schema changes during migration?

**A:** Version your RDF ontologies and support multi-version reads. Detailed in [RDF Schema Evolution Guide](./RDF-SCHEMA-EVOLUTION.md).

---

## Related Documentation

- [Phase 1 Implementation Plan](./PHASE-1-GIT-NATIVE-RDF-IMPLEMENTATION.md)
- [RDF Lock Ontology](../src/rdf/ontologies/lock-ontology.ttl)
- [RDF Snapshot Ontology](../src/rdf/ontologies/snapshot-ontology.ttl)
- [RDF Queue Ontology](../src/rdf/ontologies/queue-ontology.ttl)
- [SPARQL Query Examples](./SPARQL-QUERY-EXAMPLES.md)

---

## Support

For questions or issues:
- GitHub Issues: [gitvan/issues](https://github.com/your-org/gitvan/issues)
- Slack: `#gitvan-rdf-migration`
- Email: gitvan-team@example.com

---

**Last Updated:** January 9, 2026
**Version:** 3.0.0-alpha
**Status:** ✅ Migration Adapter Implementation Complete
