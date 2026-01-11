# Phase 1 Implementation Specifications: Multi-Graph UNION Foundation

**Status**: Detailed Implementation Plan | **Version**: 1.0 | **Date**: January 10, 2026

---

## Overview

This document provides detailed specifications for Phase 1 of the federation architecture, focusing on implementing multi-graph UNION query patterns and establishing the foundation for future federation.

---

## Specification 1: QueryFederator Class

### 1.1 Purpose
Orchestrate UNION queries across multiple named graphs in a single repository. Transform user intent into optimized SPARQL UNION patterns.

### 1.2 Key Methods

#### `selectUnion(graphNames, selectVars, patterns, options)`
```typescript
async selectUnion(
  graphNames: string[],
  selectVars: Record<string, string>,
  patterns: Record<string, string>,
  options?: {
    filters?: Record<string, string[]>,
    orderBy?: string,
    limit?: number,
    distinct?: boolean,
    cacheTTL?: number,
    timeout?: number
  }
): Promise<Array<Record<string, unknown>>>
```

**Behavior**:
1. Validate graph names exist in registry
2. Check cache (if enabled)
3. Build SPARQL UNION query
4. Execute query against combined store
5. Merge and deduplicate results
6. Cache results with TTL
7. Return merged results

**Error Handling**:
- Throw `InvalidGraphNameError` if graph not registered
- Throw `QueryExecutionError` with context if execution fails
- Return partial results if some graphs fail (future: Phase 3)

#### `buildUnionQuery(graphNames, selectVars, patterns, options)`
```typescript
buildUnionQuery(
  graphNames: string[],
  selectVars: Record<string, string>,
  patterns: Record<string, string>,
  options?: QueryOptions
): string
```

**Output Format**:
```sparql
SELECT [DISTINCT] ?var1 ?var2 ...
WHERE {
  {
    GRAPH <iri-1> {
      [pattern-1]
      [FILTER clauses]
    }
  }
  UNION
  {
    GRAPH <iri-2> {
      [pattern-2]
      [FILTER clauses]
    }
  }
}
[ORDER BY ...]
[LIMIT ...]
```

#### `clearCache()`
Remove all cached query results.

### 1.3 Implementation Notes
- Cache key must be deterministic (use SHA-256 hash of query)
- TTL check must occur before returning cached result
- Distinct flag adds "DISTINCT" to SELECT clause
- Multiple filters per graph must be AND'd together

### 1.4 Testing Requirements
- 15 unit tests covering query building, caching, and basic execution
- Error cases: empty graphs, invalid patterns, missing graphs
- Performance: should complete in <5ms for query building

---

## Specification 2: NamedGraphRegistry

### 2.1 Purpose
Manage lifecycle of all named graphs: registration, metadata, store access, versioning.

### 2.2 Key Methods

#### `registerGraph(graphId, config)`
```typescript
async registerGraph(
  graphId: string,
  config: {
    graphType?: string,
    scope?: 'local' | 'org' | 'tenant',
    repoId?: string,
    baseIRI?: string,
    description?: string,
    tags?: string[]
  }
): Promise<GraphMetadata>
```

**GraphMetadata Structure**:
```javascript
{
  graphId: string,
  iri: string,              // Full graph IRI
  graphType: string,
  scope: string,
  repoId: string,
  baseIRI: string,
  description: string,
  tags: string[],
  registeredAt: ISO8601,
  lastModified: ISO8601,
  snapshotDir: string,      // .gitvan/graphs/{graphId}/snapshots
  versionRef: string,       // refs/gitvan/graphs/{graphId}/current
  stableRef: string         // refs/gitvan/graphs/{graphId}/stable
}
```

#### `getGraphMetadata(graphId)`
Return metadata for registered graph or throw `GraphNotFoundError`.

#### `listGraphs()`
Return array of all registered GraphMetadata objects.

#### `getOrCreateStore(graphId)`
```typescript
async getOrCreateStore(graphId: string): Promise<Store>
```

Returns cached Store instance or loads from Git snapshots.

#### `saveGraphStore(graphId, store, commitMessage)`
```typescript
async saveGraphStore(
  graphId: string,
  store: Store,
  commitMessage: string
): Promise<{ success: true, ref: string }>
```

Serialize store to Turtle and save via VersionManager.

#### `getCombinedStore()`
Returns a Store instance that can query across all registered graphs using named graph syntax.

**Note**: Implementation depends on unrdf's named graph support.

### 2.3 Default Graphs
Registry should automatically register these 5 graphs on initialization:
1. `project` - Git events, commits, branches
2. `jobs` - Job execution history and status
3. `packs` - Pack metadata and dependencies
4. `ai` - AI template learning and evolution
5. `marketplace` - Marketplace items and ratings

### 2.4 Storage Structure
```
.gitvan/graphs/
├── jobs/
│   ├── snapshots/
│   │   ├── job-1.ttl
│   │   ├── job-2.ttl
│   │   └── ...
│   └── metadata.json
├── packs/
│   └── ...
└── ...
```

---

## Specification 3: GraphNameResolver

### 3.1 Purpose
Parse and validate graph IRIs, handle naming schemes, support wildcards.

### 3.2 Naming Schemes

#### Local Graphs
```
https://gitvan.dev/graph/local/{repoId}/{graphType}
Example: https://gitvan.dev/graph/local/repo-abc123/jobs
```

#### Organization Graphs
```
https://gitvan.dev/graph/org/{orgId}/{graphType}
Example: https://gitvan.dev/graph/org/acme-corp/workflows
```

#### Tenant Graphs
```
https://gitvan.dev/graph/tenant/{tenantId}/{graphType}
Example: https://gitvan.dev/graph/tenant/customer-xyz/revops
```

#### Versioned Graphs
```
https://gitvan.dev/graph/version/{repoId}/{graphType}#{versionTag}
Example: https://gitvan.dev/graph/version/repo-abc123/jobs#v1.2.3
```

### 3.3 Key Methods

#### `parseGraphIRI(iri)`
```typescript
parseGraphIRI(iri: string): {
  iri: string,
  type: 'local' | 'org' | 'tenant' | 'version',
  scope: string,            // repoId, orgId, tenantId
  graphType: string,        // 'jobs', 'packs', etc.
  versionTag?: string,      // Optional version
  isVersioned: boolean
}
```

**Validation**: Must match one of the 4 patterns exactly. Throw `InvalidGraphNameError` otherwise.

#### `buildGraphIRI(components)`
```typescript
buildGraphIRI(components: {
  type: string,
  scope: string,
  graphType: string,
  versionTag?: string
}): string
```

#### `findMatchingGraphs(pattern, availableGraphs)`
Support wildcard patterns with `*` for one level of nesting:
- `local/*/jobs` matches `local/repo1/jobs`, `local/repo2/jobs`, etc.
- `local/repo-*/packs` matches `local/repo-abc/packs`, `local/repo-xyz/packs`, etc.

#### `getVersionLineage(iri, graphVersions)`
Return all versions of a graph, newest first, with metadata.

### 3.4 Testing Requirements
- 8 unit tests for parsing all 4 schemes
- 4 tests for building IRIs
- 3 tests for wildcard matching
- 2 tests for error handling

---

## Specification 4: GraphVersionManager

### 4.1 Purpose
Git-native versioning: save snapshots, restore versions, track lineage.

### 4.2 Git Storage Structure

#### Refs
```
refs/gitvan/graphs/{graphId}/current     → Latest snapshot
refs/gitvan/graphs/{graphId}/stable      → Stable version
refs/gitvan/graphs/history/{graphId}/@{ISO8601}
```

#### Notes
```
refs/notes/gitvan/graphs/{graphId}
  - Version tag
  - Timestamp
  - Graph IRI
  - Commit message
  - Blob hash
  - Triple count
```

### 4.3 Key Methods

#### `saveVersion(metadata, store, commitMessage)`
```typescript
async saveVersion(
  metadata: GraphMetadata,
  store: Store,
  commitMessage: string
): Promise<VersionRecord>
```

**Process**:
1. Serialize store to Turtle format
2. Create Git blob for Turtle content
3. Update refs/gitvan/graphs/{graphId}/current
4. Create timestamp ref
5. Add version note
6. Return VersionRecord

**VersionRecord Structure**:
```javascript
{
  version: string,          // v{timestamp}
  timestamp: ISO8601,
  ref: string,             // Git ref
  blob: string,            // Git blob hash
  note: {
    version: string,
    timestamp: ISO8601,
    graph: string,
    graphIRI: string,
    message: string,
    hash: string,
    tripleCount: number
  }
}
```

#### `getVersionHistory(graphId)`
Return array of VersionRecords from newest to oldest.

#### `restoreVersion(graphId, versionTag)`
Load and return Store instance from specified version.

#### `getVersionLineage(graphId, versionTag)`
Return all versions from specified version backward to initial.

#### `markStable(graphId, versionTag)`
Update refs/gitvan/graphs/{graphId}/stable to point to version.

### 4.4 Serialization Format
- **Input**: unrdf Store instance
- **Format**: Turtle (.ttl)
- **Compression**: Optional gzip for large graphs
- **Storage**: Git blob system (immutable)

### 4.5 Testing Requirements
- 8 unit tests for version operations
- 3 integration tests with Git
- Error handling: missing version, corrupted blob
- Performance: should handle 100K+ triple graphs

---

## Specification 5: GraphFederationService

### 5.1 Purpose
High-level service interface exposing federation operations to applications.

### 5.2 Key Methods

#### `queryUnion(graphIds, sparqlPattern, options)`
```typescript
async queryUnion(
  graphIds: string[],
  sparqlPattern: string,
  options?: {
    orderBy?: string,
    limit?: number,
    distinct?: boolean,
    filters?: Record<string, string[]>
  }
): Promise<Array<Record<string, unknown>>>
```

High-level wrapper around QueryFederator. Pattern is SPARQL WHERE clause, service handles SELECT clause building.

#### `querySingle(graphId, sparql, options)`
Execute SPARQL query against single graph.

#### `listGraphs()`
Return all registered graphs with metadata.

#### `getGraphMetadata(graphId)`
Get metadata for single graph.

#### `getGraphVersions(graphId)`
Return version history for graph.

#### `restoreGraphVersion(graphId, versionTag)`
Restore graph to previous version.

### 5.3 Testing Requirements
- 6 unit tests for service methods
- 4 integration tests with registry and version manager
- Error handling: invalid graphs, failed restores

---

## Specification 6: Query Patterns

### 6.1 Simple UNION Pattern
```sparql
PREFIX gv: <https://gitvan.dev/jobs/>
SELECT ?jobId ?status WHERE {
  {
    GRAPH <https://gitvan.dev/graph/local/repo/jobs> {
      ?job gv:jobId ?jobId ;
           gv:status ?status .
    }
  }
  UNION
  {
    GRAPH <https://gitvan.dev/graph/local/repo/packs> {
      ?pack gv:jobId ?jobId ;
            gv:status ?status .
    }
  }
}
```

### 6.2 UNION with Filters
```sparql
SELECT ?jobId WHERE {
  {
    GRAPH <https://gitvan.dev/graph/local/repo/jobs> {
      ?job gv:jobId ?jobId .
      FILTER(?jobId = "job-123")
    }
  }
  UNION
  {
    GRAPH <https://gitvan.dev/graph/local/repo/performance> {
      ?metric gv:duration ?duration .
      FILTER(?duration > 1000)
    }
  }
}
```

### 6.3 UNION with Aggregation
```sparql
SELECT ?graphName (COUNT(?job) as ?count) WHERE {
  {
    GRAPH <https://gitvan.dev/graph/local/repo/jobs> {
      ?job a gv:Job .
      BIND("jobs" AS ?graphName)
    }
  }
  UNION
  {
    GRAPH <https://gitvan.dev/graph/local/repo/packs> {
      ?pack a gv:Pack .
      BIND("packs" AS ?graphName)
    }
  }
}
GROUP BY ?graphName
```

---

## Specification 7: Composable Interface

### 7.1 useGraphFederation() Composable

```javascript
/**
 * Creates a federation interface for multi-graph queries.
 * @param {object} options - Federation options
 * @returns {object} Federation API
 */
export function useGraphFederation(options = {}) {
  return {
    /**
     * Query multiple graphs with UNION pattern
     */
    async queryUnion(graphIds, pattern, queryOptions = {}) { ... },

    /**
     * Query single graph directly
     */
    async querySingle(graphId, sparql, queryOptions = {}) { ... },

    /**
     * List available graphs
     */
    listGraphs() { ... },

    /**
     * Get graph metadata
     */
    getGraphMetadata(graphId) { ... },

    /**
     * Get graph versions
     */
    async getGraphVersions(graphId) { ... },

    /**
     * Restore graph version
     */
    async restoreGraphVersion(graphId, versionTag) { ... }
  };
}
```

### 7.2 Integration with Existing Patterns
- Should be compatible with `withGitVan()` context wrapper
- Must preserve context across async operations
- No external database dependencies

---

## Specification 8: Error Classes

### GraphError (Base)
```javascript
class GraphError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'GraphError';
    this.context = context;
  }
}
```

### GraphNotFoundError
Thrown when graph ID not registered.

### InvalidGraphNameError
Thrown when graph IRI doesn't match known patterns.

### QueryExecutionError
```javascript
class QueryExecutionError extends GraphError {
  constructor(message, context = {}) {
    super(message, context);
    this.name = 'QueryExecutionError';
    this.graphs = context.graphs || [];
    this.failedGraphs = context.failedGraphs || [];
    this.partialResults = context.partialResults || [];
  }
}
```

Thrown when SPARQL query execution fails.

### VersionError
Thrown on version operation failures (not found, corrupted, etc.).

---

## Specification 9: Performance Requirements

### Query Execution
- Simple UNION (2 graphs, <100 triples): <20ms
- Complex UNION (5 graphs, 1000+ triples): <100ms
- Cached query: <1ms
- Query optimization: <5ms overhead

### Memory Usage
- Registry with 100 graphs: <10MB
- Cache with 1000 entries: <100MB
- Large store (1M triples): depends on unrdf implementation

### Concurrency
- Support simultaneous queries from multiple callers
- Thread-safe caching (if needed)
- No blocking operations

---

## Specification 10: Backward Compatibility

### Existing useGraph() Still Works
```javascript
// v3.0 code continues to work
const graph = await useGraph();
const results = await graph.select(sparql);
```

### Migration Path
```javascript
// New federation API
const federation = useGraphFederation();

// Single graph (replacement for useGraph)
const results = await federation.querySingle('jobs', sparql);

// Multi-graph (new capability)
const multiResults = await federation.queryUnion(['jobs', 'packs'], pattern);
```

---

## Implementation Checklist

### Core Classes
- [ ] QueryFederator class with UNION query building
- [ ] NamedGraphRegistry with graph lifecycle
- [ ] GraphNameResolver with IRI parsing
- [ ] GraphVersionManager with Git integration
- [ ] GraphFederationService with high-level API
- [ ] Error classes and exceptions

### Composables
- [ ] useGraphFederation() composable
- [ ] Integration with withGitVan()
- [ ] Context preservation across async

### Tests (50+ test cases)
- [ ] QueryFederator: 15 tests
- [ ] NamedGraphRegistry: 10 tests
- [ ] GraphNameResolver: 8 tests
- [ ] GraphVersionManager: 8 tests
- [ ] GraphFederationService: 6 tests
- [ ] Integration: 5 tests

### Documentation
- [ ] API documentation
- [ ] Migration guide
- [ ] Example workflows
- [ ] Performance benchmarks

---

## Success Criteria

1. **Functional**: All 50+ tests pass with 100% success rate
2. **Performance**: Meet all timing requirements from Section 9
3. **Compatibility**: v3.0 code works unchanged
4. **Coverage**: >85% code coverage on federation modules
5. **Reliability**: Zero data loss in version operations

---

## Timeline Estimate

- **Planning & Design**: 16 hours (completed)
- **Implementation**: 80 hours (4 weeks, 20 hours/week)
- **Testing**: 24 hours
- **Documentation**: 12 hours
- **Review & Polish**: 8 hours
- **Total**: ~140 hours or 4 weeks elapsed time

---

## Dependencies

1. **unrdf** - SPARQL query execution, named graph support
2. **Git integration** - Ref and blob management
3. **Existing composables** - withGitVan, useGit
4. **Logger** - For diagnostics and debugging

---

## Future Extensions (Phase 2+)

1. Temporal query patterns
2. Distributed federation with SERVICE keyword
3. Result streaming for large datasets
4. Advanced query optimization
5. Consistency models
6. Multi-tenant isolation

---

**Document Status**: Ready for Development | **Next Steps**: Begin implementation sprint
