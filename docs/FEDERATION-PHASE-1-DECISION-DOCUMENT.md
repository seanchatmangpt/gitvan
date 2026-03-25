# Federation Phase 1: Critical Decision Points and Trade-off Analysis

**Status**: Decision Framework | **Version**: 1.0 | **Date**: January 10, 2026

---

## Executive Summary

This document captures critical architectural decisions for Phase 1 federation, including rationale, alternatives considered, and trade-offs.

---

## Decision Framework

Each decision follows this structure:
1. **Problem Statement**: What we're deciding
2. **Alternatives**: Options considered
3. **Trade-offs**: Pros/cons of each approach
4. **Recommendation**: Preferred approach for Phase 1
5. **Rationale**: Why this choice
6. **Reversibility**: Can we change this later?
7. **Dependencies**: How this affects other decisions

---

## Decision 1: Query Result Caching Strategy

### Problem Statement
Federation queries span multiple graphs. Should results be cached? If so, how long?

### Alternatives

**A1: No Caching**
- Always execute against store
- Guarantees freshness
- **Impact**: 2-3x slower queries
- **Use case**: Development, testing

**A2: Short TTL (30 seconds)**
- Cache expires quickly
- Good for rapid iterations
- **Impact**: High CPU from frequent recomputes
- **Use case**: Real-time dashboards

**A3: Medium TTL (5 minutes)** ⭐ **RECOMMENDED**
- Balance between freshness and performance
- Cache typically hit 70-90% of time
- Good for most workloads
- **Impact**: 10-50x faster repeated queries

**A4: Long TTL (1+ hour)**
- Excellent performance
- Stale data risk
- **Use case**: Static reports, off-line analytics

**A5: Adaptive TTL**
- Dynamically adjust based on update frequency
- Complex logic
- **Impact**: Added complexity, harder to debug
- **Use case**: Phase 2 optimization

### Trade-off Matrix

| Aspect | A1 (None) | A2 (30s) | A3 (5m) | A4 (1h) | A5 (Adaptive) |
|--------|-----------|----------|---------|---------|---------------|
| Query Speed | ★☆☆ | ★★☆ | ★★★ | ★★★ | ★★★ |
| Data Freshness | ★★★ | ★★★ | ★★☆ | ★☆☆ | ★★★ |
| Implementation | ★★★ | ★★☆ | ★★☆ | ★★☆ | ★☆☆ |
| Debugging | ★★★ | ★★☆ | ★★☆ | ★★☆ | ★☆☆ |
| Operational | ★★★ | ★★☆ | ★★☆ | ★★☆ | ★☆☆ |

### Recommendation: **5-Minute Default TTL (A3)**

**Rationale**:
- Standard cache behavior in distributed systems
- Configurable per-query via `cacheTTL` option
- Sufficient for 95% of use cases
- Simple to implement and debug
- Phase 2 can add invalidation hooks
- Phase 3 can add adaptive strategies

**Configuration**:
```javascript
const federation = useGraphFederation({
  cacheTTL: 300000  // 5 minutes in milliseconds
});

// Override per-query
await federation.queryUnion(['jobs'], pattern, {
  cacheTTL: 60000   // 1 minute for this query
});

// Disable cache
await federation.queryUnion(['jobs'], pattern, {
  cacheTTL: 0       // No caching
});
```

**Reversibility**: ✅ **High** - Can be changed in config without code changes

**Dependencies**:
- Affects query performance benchmarks
- Impacts memory usage for cache
- Constrains data freshness guarantees

---

## Decision 2: Consistency Model for Queries

### Problem Statement
When querying multiple graphs, which consistency level is acceptable?

### Alternatives

**A1: Eventual Consistency** ⭐ **RECOMMENDED (Phase 1)**
- Results may be stale by cache TTL
- No inter-graph ordering guarantees
- Best performance
- **Latency**: 5-30ms
- **Data lag**: 0-5 minutes

**A2: Read-After-Write Consistency**
- Writes immediately visible to writer
- Other readers may see stale versions
- Better for collaborative workflows
- **Latency**: 20-100ms
- **Data lag**: 0-1 minute

**A3: Strong Consistency**
- All readers see latest committed data
- Requires synchronous replication
- Poor performance, high latency
- **Latency**: 100-1000ms
- **Data lag**: <1 second

**A4: Causal Consistency**
- Operations with causal relationships ordered
- Independent operations can be concurrent
- Good balance but complex
- **Latency**: 50-200ms
- **Data lag**: 0-10 seconds

### Trade-off Matrix

| Aspect | A1 (Eventual) | A2 (RAW) | A3 (Strong) | A4 (Causal) |
|--------|---------------|----------|-------------|-------------|
| Performance | ★★★ | ★★☆ | ★☆☆ | ★★☆ |
| Consistency | ★★☆ | ★★☆ | ★★★ | ★★★ |
| Simplicity | ★★★ | ★★☆ | ★☆☆ | ★☆☆ |
| Implementation | ★★★ | ★★☆ | ★★☆ | ★☆☆ |
| Sufficient for Phase 1 | ✅ | ⚠️ | ❌ | ⚠️ |

### Recommendation: **Eventual Consistency (A1)**

**Rationale**:
- Simplest to implement for Phase 1
- Sufficient for analytics and most queries
- Best performance
- Phase 2 can add Read-After-Write
- Phase 3 can add strong consistency for critical ops
- Document staleness clearly in API

**Documentation**:
```javascript
/**
 * Query may return results up to cacheTTL old.
 *
 * Examples:
 *   - With 5m cache TTL, results are 0-5 minutes stale
 *   - Suitable for: Analytics, reports, dashboards
 *   - Not suitable for: Real-time financial data, security decisions
 */
async queryUnion(graphIds, pattern, options = {})
```

**Reversibility**: ✅ **Medium** - Can add stronger models later, but internal APIs may change

**Dependencies**:
- Cache TTL defines maximum staleness
- Affects use case suitability
- Impacts compliance requirements

---

## Decision 3: Graph Versioning Frequency

### Problem Statement
How often should graphs be automatically snapshotted to Git?

### Alternatives

**A1: Manual Only**
- Version on explicit user request
- Minimal storage
- Maximum control
- **Frequency**: On-demand
- **Storage**: ~10-50MB per graph total
- **Use case**: Development

**A2: Per-Update**
- Version every graph modification
- Fine-grained history
- High storage overhead
- **Frequency**: 1000+ per day in busy repos
- **Storage**: 1-5GB per graph per month
- **Use case**: Compliance-heavy

**A3: Hourly** ⭐ **RECOMMENDED (Phase 1)**
- Balance between granularity and storage
- Good for debugging, analytics
- Reasonable retention (30 days = ~720 versions)
- **Frequency**: 24 per day
- **Storage**: ~100-200MB per graph per month
- **Use case**: Production monitoring

**A4: Daily**
- Lower granularity
- Very low storage
- Hard to find specific changes
- **Frequency**: 1 per day
- **Storage**: ~3-10MB per graph per month
- **Use case**: Backup, long-term archive

**A5: Adaptive**
- More frequent during active periods
- Sparse during quiet periods
- Complex heuristics
- **Frequency**: Variable
- **Storage**: Variable
- **Use case**: Specialized needs

### Trade-off Matrix

| Aspect | A1 (Manual) | A2 (Per-update) | A3 (Hourly) | A4 (Daily) | A5 (Adaptive) |
|--------|------------|-----------------|-------------|-----------|---------------|
| Granularity | ★☆☆ | ★★★ | ★★☆ | ★☆☆ | ★★☆ |
| Storage | ★★★ | ★☆☆ | ★★☆ | ★★★ | ★★☆ |
| Debuggability | ★☆☆ | ★★★ | ★★☆ | ★☆☆ | ★★☆ |
| Implementation | ★★★ | ★★☆ | ★★☆ | ★★☆ | ★☆☆ |
| Operational | ★★★ | ★☆☆ | ★★☆ | ★★☆ | ★☆☆ |

### Recommendation: **Hourly Versioning (A3)**

**Rationale**:
- Good granularity for debugging issues
- Manageable storage (30-day retention = 720 versions/graph)
- Automated without operational burden
- Can increase to per-update for critical graphs
- Can decrease to daily for archive graphs
- Git cleanup jobs can prune old versions

**Configuration**:
```javascript
const federationConfig = {
  versioning: {
    strategy: 'interval',      // 'manual', 'interval', 'per-update'
    interval: 3600000,         // 1 hour in milliseconds
    retention: 30,             // days to keep
    maxVersions: 100,          // per graph
    autoCleanup: true          // Clean old versions
  }
};
```

**Per-Graph Override**:
```javascript
// Critical graph: version per-update
await registry.registerGraph('important-jobs', {
  versioningStrategy: 'per-update'
});

// Archive graph: daily versions
await registry.registerGraph('historical-data', {
  versioningStrategy: 'daily'
});
```

**Reversibility**: ✅ **High** - Can be adjusted in config

**Dependencies**:
- Git ref management must handle many refs
- Storage requirements must be planned
- Cleanup jobs needed for maintenance

---

## Decision 4: Error Handling Strategy for Partial Failures

### Problem Statement
If one graph fails in a UNION query, should we return partial results or fail entirely?

### Alternatives

**A1: Fail-Fast** ⭐ **RECOMMENDED (Phase 1)**
- If any graph fails, whole query fails
- Clear error messages
- Simple implementation
- **Behavior**: throw QueryExecutionError
- **Use case**: Phase 1

**A2: Partial Results**
- Return results from successful graphs
- Indicate failed graphs in response
- More resilient
- **Behavior**: return { results: [...], failures: [...] }
- **Use case**: Phase 2

**A3: Graceful Degradation**
- Use cached/stale data from failed graphs
- Seamless to caller
- Complex, risky
- **Behavior**: return cached + fresh results
- **Use case**: Phase 3

**A4: Circuit Breaker**
- Fail fast on repeated failures
- Automatically recover when graph healthy
- Medium complexity
- **Behavior**: fail fast, circuit opens/closes
- **Use case**: Phase 2+

### Trade-off Matrix

| Aspect | A1 (Fail-Fast) | A2 (Partial) | A3 (Degrade) | A4 (Circuit) |
|--------|---------------|--------------|--------------|--------------|
| Complexity | ★★★ | ★★☆ | ★☆☆ | ★★☆ |
| Debugging | ★★★ | ★★☆ | ★☆☆ | ★★☆ |
| Resilience | ★☆☆ | ★★☆ | ★★★ | ★★☆ |
| For Phase 1 | ✅ | ⚠️ | ❌ | ⚠️ |
| User Impact | Clear | Confused | Hidden | Graceful |

### Recommendation: **Fail-Fast (A1) for Phase 1**

**Rationale**:
- Simplest to implement and test
- Clear error messages help debugging
- Prevents silent data loss
- Phase 2 can add partial results
- Allows users to decide recovery strategy

**Implementation**:
```javascript
class QueryExecutionError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.graphs = context.graphs || [];
    this.failedGraphs = context.failedGraphs || [];
    this.originalError = context.originalError;
  }
}

// Example usage
try {
  await federation.queryUnion(['jobs', 'perf'], pattern);
} catch (error) {
  if (error instanceof QueryExecutionError) {
    console.error(`Query failed on graphs: ${error.failedGraphs.join(', ')}`);
    console.error(`Reason: ${error.originalError.message}`);
  }
}
```

**Future Enhancement (Phase 2)**:
```javascript
// Opt-in partial results
await federation.queryUnion(['jobs', 'perf'], pattern, {
  partialResults: true  // Return successful graphs, error on failed
});
```

**Reversibility**: ✅ **High** - Can add partial results without breaking fail-fast behavior

**Dependencies**:
- Error handling throughout federation layer
- Clear error classification
- Monitoring for failure patterns

---

## Decision 5: Supported SPARQL Feature Set

### Problem Statement
Which SPARQL features should Phase 1 support? Which defer to Phase 2+?

### Phase 1: Full Support

**Required for 80% of use cases**:
- [x] SELECT queries
- [x] GRAPH clauses (named graphs)
- [x] UNION patterns
- [x] FILTER clauses (basic predicates)
- [x] BIND expressions (simple variable creation)
- [x] ORDER BY (with ASC/DESC)
- [x] LIMIT/OFFSET
- [x] DISTINCT
- [x] Basic aggregation (COUNT, SUM, AVG, MIN, MAX)
- [x] GROUP BY
- [x] HAVING

### Phase 2: Planned Support

**Complex queries, distributed operations**:
- [ ] OPTIONAL clauses (left outer join)
- [ ] MINUS / EXCEPT operations
- [ ] Nested SELECT subqueries
- [ ] Complex FILTER expressions
- [ ] String operations (CONCAT, SUBSTR, etc.)

### Phase 3+: Future Support

**Advanced/specialized features**:
- [ ] SERVICE keyword (federated SPARQL)
- [ ] CONSTRUCT/DESCRIBE elaborate operations
- [ ] Path queries (property paths)
- [ ] Full-text search integration
- [ ] Custom SPARQL extensions

### Rationale

**Phase 1 Focus**:
- Covers 80% of use cases
- Simpler optimization and execution
- Easier testing and debugging
- Aligns with unrdf capabilities
- Clear feature boundary

**Deferred to Phase 2**:
- OPTIONAL requires left outer join (complex)
- Complex FILTER needs optimizer work
- Nested SELECT impacts performance
- Can be added later without breaking existing queries

**Deferred to Phase 3+**:
- SERVICE for distributed federation
- Complex transformations (CONSTRUCT)
- Specialized operations (path queries)
- Advanced integration (full-text)

### Documentation

Clear feature matrix in API docs:

```javascript
/**
 * Supported in Phase 1:
 *   - SELECT queries
 *   - GRAPH clauses
 *   - UNION patterns
 *   - FILTER (basic)
 *   - BIND
 *   - ORDER BY, LIMIT, DISTINCT
 *   - Aggregation: COUNT, SUM, AVG, MIN, MAX
 *   - GROUP BY, HAVING
 *
 * Not yet supported (Phase 2+):
 *   - OPTIONAL clauses
 *   - MINUS/EXCEPT
 *   - Nested SELECT
 *   - Complex FILTER expressions
 *   - SERVICE keyword
 *   - CONSTRUCT/DESCRIBE
 */
async queryUnion(graphIds, pattern, options)
```

**Reversibility**: ✅ **Medium** - Can add features incrementally

**Dependencies**:
- Query optimizer scope
- Test case coverage
- Documentation examples

---

## Summary: Recommended Decisions for Phase 1

| Decision | Recommendation | Impact | Confidence |
|----------|----------------|--------|-----------|
| **Caching** | 5-minute TTL | Performance ⬆, Freshness → | ⭐⭐⭐⭐⭐ |
| **Consistency** | Eventual | Simplicity ⬆, Reliability → | ⭐⭐⭐⭐ |
| **Versioning** | Hourly | Debuggability ⬆, Storage → | ⭐⭐⭐⭐⭐ |
| **Error Handling** | Fail-fast | Clarity ⬆, Resilience → | ⭐⭐⭐⭐ |
| **SPARQL Features** | Core set | Simplicity ⬆, Scope → | ⭐⭐⭐⭐⭐ |

---

## Future Decision Framework (Phase 2+)

### Phase 2 Decisions (Months 3-4)

1. **Partial Results**: Enable Phase 2 or defer to Phase 3?
2. **Consistency Levels**: Add Read-After-Write? Strong?
3. **Advanced SPARQL**: Support OPTIONAL, nested SELECT?
4. **Distribution**: Prepare for SERVICE keyword?

### Phase 3 Decisions (Months 5-6)

1. **Federation**: Cross-repository queries?
2. **Temporal Patterns**: Point-in-time queries?
3. **Multi-tenant**: Enterprise isolation?
4. **Optimization**: Advanced query planning?

---

## Approval and Sign-Off

### Decision Review Process

1. **Architecture Review**: ✅ (This document)
2. **Stakeholder Review**: ⏳ (Pending)
3. **Technical Review**: ⏳ (Pending)
4. **Leadership Approval**: ⏳ (Pending)

### Sign-Off

- [ ] Architecture Lead: _______________
- [ ] Product Lead: _______________
- [ ] Engineering Lead: _______________
- [ ] DevOps Lead: _______________

**Decision Effective Date**: Upon approval

---

## Post-Implementation Review

Schedule review 30 days after Phase 1 deployment:

1. **Validate Decisions**: Did we make the right choices?
2. **Measure Impact**: Performance, adoption, issues?
3. **Identify Pain Points**: What needs improvement?
4. **Plan Phase 2**: Adjust based on learning?

---

**Document Status**: Ready for Stakeholder Review | **Next Steps**: Executive approval, resource allocation
