# GitVan Streaming Migration Plan

**Date:** January 10, 2026
**Version:** 1.0
**Scope:** v4.5 - v5.1 (Phased Integration)
**Status:** Planning Phase

---

## Executive Summary

This document outlines how GitVan transitions from in-memory RDF processing to streaming architecture over 5 phases, maintaining backward compatibility while enabling large-scale operations.

### Key Principles

1. **Zero Breaking Changes**: Existing APIs remain unchanged
2. **Gradual Rollout**: Feature flags enable controlled adoption
3. **Opt-in Streaming**: Streaming methods are `*Stream` variants
4. **Fallback Support**: Always fall back to in-memory if streaming unavailable
5. **Metrics-Driven**: Monitor adoption and issues before full transition

---

## Phase-by-Phase Migration

### Phase 1: Foundation (v4.5) - Current

**Timeline**: 2 weeks
**Status**: Implementation planned

**What's New**:
- TurtleStreamParser for large RDF imports
- GitLogStreaming composable for git history
- POC tests with large datasets

**What Stays**:
- All existing composables unchanged
- No new streaming methods in useGraph()
- No new streaming methods in useGit()

**User Impact**: NONE (foundational only)

**Migration Tasks**:
```
✓ Implement TurtleStreamParser
✓ Implement GitLogStreaming
✓ Create POC tests
✓ No API changes needed
```

**Code Pattern (Phase 1)**:
```javascript
// Old way - still works
const parser = await rdfStore.parse(file);

// New way - available but optional
import { TurtleStreamParser } from 'gitvan/streaming';
const streamParser = new TurtleStreamParser();
for await (const quads of streamParser.parseFile(file)) {
  await store.addQuads(quads);
}
```

---

### Phase 2: Query Streaming (v4.6)

**Timeline**: 2 weeks
**Dependencies**: Phase 1 complete

**What's New**:
- StreamingQueryExecutor for SPARQL queries
- Streaming methods: `selectStream()`, `constructStream()`
- CursorPagination for REST APIs
- Pagination support in executor

**What Changes**:
- New optional methods in useGraph()
- Feature flag: `enableStreaming` in options

**User Impact**: LOW (new optional methods)

**Migration Tasks**:
```
✓ Implement StreamingQueryExecutor
✓ Add selectStream() to useGraph()
✓ Add constructStream() to useGraph()
✓ Implement CursorPagination
✓ Add feature flag (disabled by default)
```

**Code Pattern (Phase 2)**:
```javascript
// Old way - still works
const results = await graph.select(sparql);
res.json(results);  // All at once

// New way - available with feature flag
const graph = useGraph(store, { enableStreaming: true });
res.setHeader('Transfer-Encoding', 'chunked');
for await (const batch of graph.selectStream(sparql)) {
  res.write(JSON.stringify(batch) + '\n');
}
```

**Feature Flag Usage**:
```javascript
// In configuration or per-call
const enableStreaming = process.env.GITVAN_STREAMING === 'true';
const graph = useGraph(store, { enableStreaming });
```

---

### Phase 3: Chunked Store (v5.0)

**Timeline**: 3 weeks
**Dependencies**: Phase 1, 2 complete

**What's New**:
- ChunkedGraphStore for large graphs
- BatchProcessor for efficient writes
- ResourceManager for monitoring
- StreamingFormats for output

**What Changes**:
- Optional ChunkedGraphStore instead of unrdf Store
- Config option: `useChunkedStore`
- Migration helper: `migrateToChunked()`

**User Impact**: MEDIUM (storage backend selection)

**Migration Tasks**:
```
✓ Implement ChunkedGraphStore
✓ Implement BatchProcessor
✓ Implement ResourceManager
✓ Implement StreamingFormats
✓ Add config option for store type
✓ Create migration helpers
✓ Update documentation
```

**Code Pattern (Phase 3)**:
```javascript
// Old way - still works for small graphs
const store = createUnrdfStore();
const graph = useGraph(store);

// New way - for large graphs (v5.0+)
const store = new ChunkedGraphStore({ chunkSize: 50000 });
const graph = useGraph(store);

// Or automatic based on config
const store = createStoreByConfig();  // Chooses based on settings
const graph = useGraph(store);
```

**Configuration Example**:
```javascript
// gitvan.config.js
export default {
  rdf: {
    storeType: 'auto',  // 'auto', 'memory', 'chunked'
    chunked: {
      chunkSize: 50000,
      maxChunksInMemory: 5,
      persistDir: '.gitvan/chunks'
    }
  }
};
```

**Migration Helper**:
```javascript
// Migrate existing graph to chunked store
import { migrateToChunked } from 'gitvan/streaming/migration';

const oldStore = createUnrdfStore();
const oldGraph = useGraph(oldStore);

// Migrate to chunked
const newStore = await migrateToChunked(oldGraph, {
  chunkSize: 50000,
  targetDir: '.gitvan/chunks'
});

const newGraph = useGraph(newStore);
```

---

### Phase 4: Resource Management (v5.0)

**Timeline**: 1 week
**Dependencies**: Phase 1, 2, 3 complete

**What's New**:
- ResourceManager integration in all streaming
- Backpressure handling (automatic)
- Memory monitoring and GC coordination
- Metrics collection

**What Changes**:
- Streaming operations now respect resource limits
- Optional resource config

**User Impact**: LOW (transparent)

**Migration Tasks**:
```
✓ Integrate ResourceManager into components
✓ Add backpressure to all streaming
✓ Implement metrics collection
✓ Add resource configuration
✓ Test with realistic workloads
```

**Code Pattern (Phase 4)**:
```javascript
// Configuration sets resource limits
const config = {
  resources: {
    memoryLimit: 1 * 1024 * 1024 * 1024,  // 1GB
    cpuThreshold: 0.8,
    diskIOLimit: 100 * 1024 * 1024  // 100MB/s
  }
};

// Automatic backpressure handling
const executor = new StreamingQueryExecutor(store);
for await (const batch of executor.executeSelectStream(sparql)) {
  // Automatically pauses if memory/CPU/I/O limits reached
  await processBatch(batch);
}

// Check metrics
const metrics = executor.resourceManager.getMetrics();
console.log(`Peak memory: ${metrics.peakMemoryMB}MB`);
```

---

### Phase 5: Full Integration & Defaults (v5.1)

**Timeline**: 2 weeks
**Dependencies**: All prior phases complete

**What's New**:
- Streaming becomes the recommended default
- Configuration optimized for production
- Deprecation warnings for old patterns
- Complete documentation

**What Changes**:
- Default behavior may use streaming (with fallback)
- Old methods marked as deprecated
- Migration guide provided

**User Impact**: MEDIUM (deprecation warnings, recommended changes)

**Migration Tasks**:
```
✓ Change defaults to use streaming where appropriate
✓ Add deprecation warnings to old methods
✓ Create migration guide for users
✓ Update all examples in documentation
✓ Optimize configuration defaults
✓ Comprehensive performance testing
```

**Code Pattern (Phase 5)**:
```javascript
// Old pattern (still works, deprecation warning)
const results = await graph.select(sparql);
// WARNING: graph.select() is deprecated in v5.1
// Use selectStream() for better performance

// New pattern (recommended)
const results = [];
for await (const batch of graph.selectStream(sparql)) {
  results.push(...batch);
}

// Or just use selectStream directly for streaming output
for await (const batch of graph.selectStream(sparql)) {
  res.write(JSON.stringify(batch) + '\n');
}
```

---

## Migration Path by Use Case

### Use Case 1: Small Graphs (<10K Quads)

**Recommendation**: No migration needed

```javascript
// Continue using current approach
const store = createUnrdfStore();
const graph = useGraph(store);
const results = await graph.select(sparql);
```

**Transition Timeline**: None required

---

### Use Case 2: Medium Graphs (10K - 1M Quads)

**Timeline**:
- v4.5-4.6: Continue current approach
- v5.0+: Optional migration to streaming queries

**Benefits**: Better pagination support, resource efficiency

```javascript
// Before (v4.4 and earlier)
const results = await graph.select(sparql);
sendAllResults(results);  // Large response

// After (v5.0+)
for await (const batch of graph.selectStream(sparql, { pageSize: 100 })) {
  sendBatchResults(batch);  // Paginated response
}
```

---

### Use Case 3: Large Graphs (1M+ Quads)

**Timeline**:
- v4.5: Import using TurtleStreamParser
- v5.0: Migrate to ChunkedGraphStore
- v5.1: Enable streaming by default

**Benefits**: No OOM errors, lower memory usage, better performance

```javascript
// v4.5 - Import large dataset
import { TurtleStreamParser } from 'gitvan/streaming';

const parser = new TurtleStreamParser({ batchSize: 5000 });
const store = createUnrdfStore();

for await (const quads of parser.parseFile('huge.ttl')) {
  await store.addQuads(quads);
}

// v5.0 - Use chunked store
const chunked = new ChunkedGraphStore();
for await (const quads of parser.parseFile('huge.ttl')) {
  await chunked.addQuads(quads);
}

// v5.1+ - Default behavior
const store = createStore();  // Automatically chunked for large graphs
```

---

### Use Case 4: Large Git Histories (50K+ Commits)

**Timeline**:
- v4.5: Start using GitLogStreaming
- v5.0+: Enable by default

**Benefits**: No memory exhaustion, better performance

```javascript
// Before (crashes on large repos)
const allCommits = await git.log('HEAD');  // OOM!

// v4.5+ (works with large repos)
const streaming = useGitLogStreaming({ pageSize: 1000 });
for await (const commits of streaming.streamLog('HEAD')) {
  await processBatch(commits);
}

// v5.0+ (available in composable)
for await (const commits of git.logStream('HEAD')) {
  await processBatch(commits);
}
```

---

## Breaking Changes Schedule

### v4.5-4.6: ZERO breaking changes
- All new components are opt-in
- No existing API modified

### v5.0: ONE potential breaking change
- ChunkedGraphStore has different API (intentional design)
- No change to useGraph() or useGit()
- Migration helpers provided

### v5.1: Deprecation warnings only
- No breaking changes
- Warning messages guide users to new patterns
- Old API still works

### v6.0: Potential cleanup (future)
- Remove deprecated methods after 2+ major versions
- TBD based on adoption

---

## Configuration Migration

### Default Configuration

```javascript
// v4.4 and earlier
export default {
  rdf: {
    // Uses in-memory store only
  }
};

// v4.5+ (no change required)
export default {
  rdf: {
    // Same as before, no change
  }
};

// v5.0+ (opt-in)
export default {
  rdf: {
    storeType: 'auto',  // Auto-selects based on graph size
    streaming: {
      enabled: false,  // Opt-in for now
      parsers: {
        batchSize: 5000,
        chunkSize: 65536
      }
    }
  }
};

// v5.1+ (streaming recommended)
export default {
  rdf: {
    storeType: 'auto',  // 'auto', 'memory', 'chunked'
    streaming: {
      enabled: true,  // Enabled by default
      // ... configuration
    }
  }
};
```

---

## Environment Variable Migration

### New Environment Variables (v4.5+)

```bash
# Enable streaming parsers (Phase 1)
GITVAN_STREAMING_PARSERS=true

# Enable streaming queries (Phase 2)
GITVAN_STREAMING_QUERIES=true

# Store type selection (Phase 3)
GITVAN_STORE_TYPE=auto|memory|chunked

# Resource limits (Phase 4)
GITVAN_MEMORY_LIMIT=500MB
GITVAN_DISK_IO_LIMIT=100MB/s

# Enable all streaming features (Phase 5)
GITVAN_STREAMING=true
```

### Migration Script

```javascript
// Helper to migrate environment variables
function migrateEnvironment() {
  const vars = process.env;

  // Old variable (if used)
  if (vars.GITVAN_RDF_STORE) {
    console.warn(`
      GITVAN_RDF_STORE is deprecated.
      Use GITVAN_STORE_TYPE instead:
        GITVAN_RDF_STORE=unrdf → GITVAN_STORE_TYPE=memory
    `);
  }

  return {
    streaming: vars.GITVAN_STREAMING === 'true',
    storeType: vars.GITVAN_STORE_TYPE || 'auto',
    memoryLimit: vars.GITVAN_MEMORY_LIMIT || '500MB'
  };
}
```

---

## Verification Checklist

### Before Phase 1 Merge
- [ ] All existing tests pass
- [ ] New POC tests pass
- [ ] No performance regression
- [ ] Memory usage acceptable
- [ ] Documentation complete

### Before Phase 2 Release (v4.6)
- [ ] Phase 1 stable in production
- [ ] User feedback collected
- [ ] StreamingQueryExecutor tested
- [ ] Feature flag working
- [ ] Pagination tests pass

### Before Phase 3 Release (v5.0)
- [ ] Phase 2 stable in production
- [ ] ChunkedGraphStore tested at scale
- [ ] Migration helpers working
- [ ] Configuration documented
- [ ] Performance benchmarked

### Before Phase 4 Release (v5.0+)
- [ ] ResourceManager integrated
- [ ] Backpressure working
- [ ] Metrics collection accurate
- [ ] Load tests passed

### Before Phase 5 Release (v5.1)
- [ ] All phases stable
- [ ] Deprecation warnings added
- [ ] Migration guide complete
- [ ] Examples updated
- [ ] User education materials ready

---

## Rollback Strategy

### If Issues Discovered

**During Phase 1-2 (experimental)**:
- Disable streaming via config: `GITVAN_STREAMING=false`
- Revert to v4.4 if critical issues

**During Phase 3 (v5.0)**:
- Config: `storeType: 'memory'` to use old store
- Migration helper to rollback: `migrateFromChunked()`

**During Phase 5 (v5.1+)**:
- Config: `streaming: false` to disable
- Continue using non-streaming methods

### Rollback Commands

```bash
# Disable streaming entirely
export GITVAN_STREAMING=false

# Use memory store even if configured for chunked
export GITVAN_STORE_TYPE=memory

# Rollback to previous version
npm install gitvan@4.4.0
```

---

## Testing Migration Strategy

### Phase 1 Testing
```bash
# Test with both old and new approaches
npm test -- --env streaming  # New
npm test -- --env memory     # Old
```

### Phase 2 Testing
```bash
# Test streaming queries
npm test -- --env streaming-queries

# Test backward compatibility
npm test -- --env compat-legacy
```

### Phase 3 Testing
```bash
# Test chunked store
npm test -- --env chunked-store

# Test migration helpers
npm test -- --env migration
```

### Phase 4-5 Testing
```bash
# Full integration testing
npm test -- --env streaming-full

# Large dataset testing
npm test -- --env large-scale
```

---

## Documentation Migration

### Phase 1 (v4.5)
- [ ] Add streaming parser guide
- [ ] Document GitLogStreaming usage
- [ ] Performance tips

### Phase 2 (v4.6)
- [ ] Add query streaming guide
- [ ] Pagination patterns
- [ ] REST API examples

### Phase 3 (v5.0)
- [ ] ChunkedGraphStore guide
- [ ] Configuration reference
- [ ] Migration how-to

### Phase 4 (v5.0+)
- [ ] Resource management guide
- [ ] Backpressure explanation
- [ ] Monitoring setup

### Phase 5 (v5.1)
- [ ] Update all examples
- [ ] Deprecation guide
- [ ] Best practices

---

## Adoption Metrics

### Track (per phase)
- Number of projects using new features
- Memory usage improvements
- Query performance improvements
- Error rates
- Support requests

### Success Criteria
- Phase 1: 10+ projects using parsers
- Phase 2: 20% of projects using streaming queries
- Phase 3: 50% using chunked store for large graphs
- Phase 4: 100% of streaming operations using resource management
- Phase 5: 80% migration rate to streaming

---

## Communication Plan

### For Each Phase Release

**Announcement**:
```markdown
# GitVan v4.5 - Streaming Parsers (New Feature)

## What's New
- TurtleStreamParser for large RDF imports
- GitLogStreaming for large git histories

## Recommendation
Try the new parsers if you work with large datasets!

## Backward Compatibility
100% - All existing code continues to work unchanged.

## Learn More
[Documentation](docs/STREAMING-ARCHITECTURE-DESIGN.md)
```

**Migration Guide**:
```markdown
# Migrating to GitVan Streaming (v4.5+)

## Before (v4.4)
[Old approach code]

## After (v4.5)
[New approach code]

## Benefits
- Lower memory usage
- Better performance
- Support for larger datasets
```

**Deprecation Notice** (v5.1):
```markdown
# Deprecation: graph.select() in v5.1

The `graph.select()` method is deprecated.
Use `graph.selectStream()` for better performance.

Timeline:
- v5.1 (now): Deprecation warning
- v6.0 (future): May be removed
```

---

## Success Indicators

### Phase 1 Success
- [ ] Zero production issues
- [ ] POC tests pass consistently
- [ ] Memory usage <150MB for 100MB files
- [ ] Parse rate >100K quads/sec

### Phase 2 Success
- [ ] Streaming queries adopted by 20%+ of users
- [ ] No performance regressions
- [ ] Feature flag working reliably

### Phase 3 Success
- [ ] ChunkedGraphStore handles 10M+ quads
- [ ] Migration helpers work for all graphs
- [ ] Disk usage acceptable

### Phase 4 Success
- [ ] No OOM errors in production
- [ ] Resource metrics accurate
- [ ] Backpressure effective

### Phase 5 Success
- [ ] 80%+ of relevant code using streaming
- [ ] Documentation complete
- [ ] User adoption >50%

---

## Timeline Summary

```
v4.5 (Feb 2026)    v4.6 (Mar 2026)    v5.0 (Apr 2026)    v5.1 (May 2026)
├─ Phase 1         ├─ Phase 2         ├─ Phase 3         └─ Phase 5
└─ Parsers         └─ Queries         ├─ Phase 4
                                       └─ Resources
```

**Total Duration**: ~4 months for full streaming architecture

---

## Conclusion

This migration plan ensures GitVan smoothly transitions to streaming architecture while:
- Maintaining zero breaking changes for phases 1-4
- Providing clear upgrade paths for each use case
- Collecting real-world feedback before major changes
- Supporting both old and new approaches indefinitely
- Documenting and testing every step

The phased approach minimizes risk while maximizing the benefits of streaming for large-scale data processing.

---

**Document Status**: Ready for Review
**Last Updated**: January 10, 2026
**Next Review**: After Phase 1 implementation
**Related Documents**:
- STREAMING-ARCHITECTURE-DESIGN.md
- STREAMING-PHASE1-SPECS.md
- STREAMING_AND_LARGE_SCALE_PROCESSING_PLAN.md
