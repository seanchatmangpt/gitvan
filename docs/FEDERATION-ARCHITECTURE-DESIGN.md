# Federation Architecture Design for GitVan Multi-Graph Integration

**Status**: Design Document | **Version**: 1.0 | **Date**: January 10, 2026 | **Phase**: Phase 1 Foundation

---

## Executive Summary

This document provides the detailed technical architecture for Phase 1 of GitVan's federation and multi-graph integration plan. Phase 1 focuses on establishing multi-graph UNION query patterns and named graph management as the foundation for future distributed federation.

**Phase 1 Scope**:
- Multi-graph UNION/GRAPH query patterns
- Named graph registry and management
- Git-native graph versioning (refs and notes)
- Basic query federation framework (single-repository, multi-graph)

**Key Deliverables**:
1. QueryFederator class design
2. Federation service interface specifications
3. Named graph management system
4. Git-native versioning for graphs
5. Comprehensive test cases
6. Performance benchmarks
7. Migration guide from single-graph

---

## Part 1: Architecture Overview

### 1.1 Multi-Graph Query Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│         Application Layer (Composables & Services)              │
│  - useGraphFederation composable                                │
│  - Federation service interface                                 │
│  - SPARQL query builders                                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│     Query Federation Layer (Phase 1)                            │
│  - QueryFederator (UNION pattern coordination)                  │
│  - Graph name resolver                                          │
│  - Query optimizer (filter push-down)                           │
│  - Result deduplicator                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│     Multi-Graph Layer (Enhanced)                                │
│  - Named graph registry                                         │
│  - Graph metadata store                                         │
│  - Version tracker (Git refs)                                   │
│  - Query execution engine (GRAPH support)                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│     Local SPARQL Engine (unrdf)                                 │
│  - Store management                                             │
│  - Query execution (SELECT, ASK, CONSTRUCT)                    │
│  - Named graph support                                          │
│  - Result streaming                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│          Git-Native I/O Layer                                   │
│  - Graph snapshots in Git                                       │
│  - Audit trail in Git notes                                     │
│  - Worktree isolation                                           │
│  - Branch/ref management                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Phase 1 Scope Definition

**What Phase 1 Delivers**:
- Multi-graph queries within a single repository
- Named graph UNION patterns
- Graph versioning using Git refs
- Foundation for future multi-repository federation

**What Phase 1 Does NOT Include**:
- Cross-repository SPARQL federation (SERVICE keyword)
- Remote endpoint management
- Distributed consistency models
- Multi-tenant isolation
- Temporal query patterns

---

## Part 2: Core Component Design

### 2.1 QueryFederator Class

The `QueryFederator` coordinates multi-graph queries using UNION patterns. It transforms user intent into SPARQL UNION queries.

```javascript
/**
 * Coordinates multi-graph queries using UNION patterns.
 * Primary use case: Query across GitVan's 5 default graphs.
 *
 * Example:
 *   const federator = new QueryFederator(graphRegistry);
 *   const results = await federator.selectUnion(
 *     ['jobs', 'performance'],
 *     { jobId: ?jobId, duration: ?duration },
 *     { filters: [{ graph: 'jobs', filter: 'status = "completed"' }] }
 *   );
 */
export class QueryFederator {
  constructor(graphRegistry, options = {}) {
    this.graphRegistry = graphRegistry;
    this.optimizer = new QueryOptimizer();
    this.resultMerger = new ResultMerger();
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
    this.enableCache = options.enableCache !== false;
  }

  /**
   * Execute UNION query across multiple graphs
   * @param {string[]} graphNames - List of graph names to query
   * @param {object} selectVars - Variables to select (e.g. { jobId: '?jobId', status: '?status' })
   * @param {object} patterns - SPARQL patterns for each graph
   * @param {object} options - Query options (filters, limits, etc.)
   * @returns {Promise<Array>} Merged results from all graphs
   */
  async selectUnion(graphNames, selectVars, patterns, options = {}) {
    const cacheKey = this.buildCacheKey('selectUnion', graphNames, selectVars, patterns);

    if (this.enableCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.results;
      }
      this.cache.delete(cacheKey);
    }

    // Build SPARQL UNION query
    const sparql = this.buildUnionQuery(graphNames, selectVars, patterns, options);

    // Execute query
    const results = await this.executeUnionQuery(sparql, options);

    // Cache results
    if (this.enableCache) {
      this.cache.set(cacheKey, {
        results,
        timestamp: Date.now(),
        sparql
      });
    }

    return results;
  }

  /**
   * Build SPARQL UNION query from patterns
   * @private
   */
  buildUnionQuery(graphNames, selectVars, patterns, options = {}) {
    const selectClause = this.buildSelectClause(selectVars, options);
    const unionClauses = graphNames.map((graphName, index) => {
      const pattern = patterns[graphName] || patterns[index];
      const graphIri = this.graphRegistry.getGraphIRI(graphName);
      return this.buildGraphPattern(graphIri, pattern, options.filters?.[graphName]);
    });

    const orderBy = options.orderBy ? `ORDER BY ${options.orderBy}` : '';
    const limit = options.limit ? `LIMIT ${options.limit}` : '';

    return `
      ${selectClause}
      WHERE {
        ${unionClauses.join('\n        UNION\n')}
      }
      ${orderBy}
      ${limit}
    `;
  }

  /**
   * Build SELECT clause
   * @private
   */
  buildSelectClause(selectVars, options = {}) {
    const distinct = options.distinct ? 'DISTINCT' : '';
    const variables = Object.values(selectVars).join(' ');
    return `SELECT ${distinct} ${variables}`;
  }

  /**
   * Build GRAPH pattern with WHERE clause
   * @private
   */
  buildGraphPattern(graphIri, pattern, filters = []) {
    const whereClause = this.buildWhereClause(pattern);
    const filterClause = filters && filters.length > 0
      ? `FILTER(${filters.join(' && ')})`
      : '';

    return `{
      GRAPH <${graphIri}> {
        ${whereClause}
        ${filterClause}
      }
    }`;
  }

  /**
   * Build WHERE clause from RDF patterns
   * @private
   */
  buildWhereClause(pattern) {
    if (typeof pattern === 'string') {
      return pattern;
    }

    const triples = Object.entries(pattern).map(([varName, triple]) => {
      if (typeof triple === 'string') return triple;
      // Handle structured patterns
      const { subject, predicate, object } = triple;
      return `${subject} ${predicate} ${object} ;`;
    });

    return triples.join('\n        ');
  }

  /**
   * Execute UNION query against store
   * @private
   */
  async executeUnionQuery(sparql, options = {}) {
    const store = this.graphRegistry.getCombinedStore();

    try {
      const results = await store.select(sparql);
      return this.resultMerger.deduplicate(results, options);
    } catch (error) {
      throw new QueryExecutionError(
        `Failed to execute union query: ${error.message}`,
        { sparql, originalError: error }
      );
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Build cache key
   * @private
   */
  buildCacheKey(operation, ...args) {
    const key = JSON.stringify([operation, ...args]);
    return require('crypto').createHash('sha256').update(key).digest('hex');
  }
}
```

### 2.2 GraphNameResolver

Parses and validates graph IRIs according to GitVan's naming scheme.

```javascript
/**
 * Resolves and parses graph names according to GitVan naming conventions.
 *
 * Naming schemes:
 *  - Local: https://gitvan.dev/graph/local/{repoId}/{graphType}
 *  - Org: https://gitvan.dev/graph/org/{orgId}/{graphType}
 *  - Tenant: https://gitvan.dev/graph/tenant/{tenantId}/{graphType}
 *  - Version: https://gitvan.dev/graph/version/{repoId}/{graphType}#{version}
 */
export class GraphNameResolver {
  constructor(baseIRI = 'https://gitvan.dev/graph/') {
    this.baseIRI = baseIRI;
    this.patterns = {
      local: /^https:\/\/gitvan\.dev\/graph\/local\/([^\/]+)\/([^#]+)(?:#(.+))?$/,
      org: /^https:\/\/gitvan\.dev\/graph\/org\/([^\/]+)\/([^#]+)(?:#(.+))?$/,
      tenant: /^https:\/\/gitvan\.dev\/graph\/tenant\/([^\/]+)\/([^#]+)(?:#(.+))?$/,
      version: /^https:\/\/gitvan\.dev\/graph\/version\/([^\/]+)\/([^#]+)(?:#(.+))?$/,
    };
  }

  /**
   * Parse graph IRI into components
   * @param {string} iri - Graph IRI to parse
   * @returns {object} Parsed components: { type, scope, graphType, version/tag }
   */
  parseGraphIRI(iri) {
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const match = iri.match(pattern);
      if (match) {
        const [, scope, graphType, versionTag] = match;
        return {
          iri,
          type,        // 'local', 'org', 'tenant', or 'version'
          scope,        // repoId, orgId, or tenantId
          graphType,    // 'jobs', 'packs', 'ai', 'project', etc.
          versionTag,   // Optional version/tag
          isVersioned: !!versionTag
        };
      }
    }

    throw new InvalidGraphNameError(
      `IRI does not match any known naming pattern: ${iri}`
    );
  }

  /**
   * Build graph IRI from components
   * @param {object} components - { type, scope, graphType, versionTag? }
   * @returns {string} Full IRI
   */
  buildGraphIRI(components) {
    const { type, scope, graphType, versionTag } = components;

    if (!['local', 'org', 'tenant', 'version'].includes(type)) {
      throw new Error(`Unknown graph type: ${type}`);
    }

    let iri = `${this.baseIRI}${type}/${scope}/${graphType}`;

    if (versionTag) {
      iri += `#${versionTag}`;
    }

    return iri;
  }

  /**
   * Find all graphs matching a pattern (with wildcards)
   * @param {string} pattern - Pattern with * wildcards (e.g. 'local/*/jobs')
   * @param {Set<string>} availableGraphs - Set of all available graph IRIs
   * @returns {string[]} Matching graph IRIs
   */
  findMatchingGraphs(pattern, availableGraphs) {
    const regex = this.patternToRegex(pattern);
    return Array.from(availableGraphs).filter(iri => regex.test(iri));
  }

  /**
   * Convert wildcard pattern to regex
   * @private
   */
  patternToRegex(pattern) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }

  /**
   * Get version lineage for a graph (all versions)
   * @param {string} iri - Base graph IRI
   * @param {Map<string, object>} graphVersions - Map of graph IRI to version metadata
   * @returns {object[]} Version history from newest to oldest
   */
  getVersionLineage(iri, graphVersions) {
    const parsed = this.parseGraphIRI(iri);
    const lineage = [];

    for (const [versionIRI, metadata] of graphVersions) {
      const versionParsed = this.parseGraphIRI(versionIRI);

      if (versionParsed.type === parsed.type &&
          versionParsed.scope === parsed.scope &&
          versionParsed.graphType === parsed.graphType) {
        lineage.push({
          iri: versionIRI,
          version: versionParsed.versionTag,
          ...metadata
        });
      }
    }

    // Sort by timestamp descending (newest first)
    return lineage.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }
}
```

### 2.3 NamedGraphRegistry

Central registry for managing all named graphs in a repository.

```javascript
/**
 * Manages the lifecycle of all named graphs in a repository.
 * Tracks graph metadata, versions, and dependencies.
 */
export class NamedGraphRegistry {
  constructor(gitVanHome = '.gitvan') {
    this.gitVanHome = gitVanHome;
    this.graphs = new Map(); // graphId -> GraphMetadata
    this.stores = new Map(); // graphId -> Store instance
    this.nameResolver = new GraphNameResolver();
    this.versionManager = new GraphVersionManager();
  }

  /**
   * Register a named graph
   * @param {string} graphId - Unique graph identifier (e.g., 'jobs', 'packs')
   * @param {object} config - Graph configuration
   * @returns {Promise<GraphMetadata>} Registered graph metadata
   */
  async registerGraph(graphId, config = {}) {
    const {
      graphType = graphId,
      scope = 'local',
      repoId = 'default',
      baseIRI = null,
      description = '',
      tags = []
    } = config;

    const iri = baseIRI || this.nameResolver.buildGraphIRI({
      type: scope,
      scope: repoId,
      graphType
    });

    const metadata = {
      graphId,
      iri,
      graphType,
      scope,
      repoId,
      baseIRI,
      description,
      tags,
      registeredAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      snapshotDir: `${this.gitVanHome}/graphs/${graphId}/snapshots`,
      versionRef: `refs/gitvan/graphs/${graphId}/current`,
      stableRef: `refs/gitvan/graphs/${graphId}/stable`
    };

    this.graphs.set(graphId, metadata);
    return metadata;
  }

  /**
   * Get graph metadata
   */
  getGraphMetadata(graphId) {
    if (!this.graphs.has(graphId)) {
      throw new Error(`Graph not registered: ${graphId}`);
    }
    return this.graphs.get(graphId);
  }

  /**
   * List all registered graphs
   */
  listGraphs() {
    return Array.from(this.graphs.values());
  }

  /**
   * Get or create Store for a graph
   */
  async getOrCreateStore(graphId) {
    if (this.stores.has(graphId)) {
      return this.stores.get(graphId);
    }

    const metadata = this.getGraphMetadata(graphId);
    // Load from Git snapshot or create new
    const store = await this.loadGraphStore(metadata);
    this.stores.set(graphId, store);
    return store;
  }

  /**
   * Load graph store from Git snapshots
   * @private
   */
  async loadGraphStore(metadata) {
    // Implementation loads from Git notes or snapshot files
    // Returns unrdf Store instance
  }

  /**
   * Save graph store to Git
   */
  async saveGraphStore(graphId, store, commitMessage = '') {
    const metadata = this.getGraphMetadata(graphId);
    return await this.versionManager.saveVersion(
      metadata,
      store,
      commitMessage
    );
  }

  /**
   * Get all graphs as a combined store
   * Used for multi-graph UNION queries
   */
  getCombinedStore() {
    // Returns a Store that can query across all named graphs
    // Implementation depends on unrdf's named graph support
  }

  /**
   * List graph versions
   */
  async listVersions(graphId) {
    return await this.versionManager.getVersionHistory(graphId);
  }

  /**
   * Restore graph to previous version
   */
  async restoreVersion(graphId, versionTag) {
    return await this.versionManager.restoreVersion(graphId, versionTag);
  }
}
```

### 2.4 GraphVersionManager

Manages Git-native versioning of graphs using refs and notes.

```javascript
/**
 * Manages graph versioning using Git refs and notes.
 * Provides snapshot, restore, and lineage tracking capabilities.
 *
 * Git structure:
 *   refs/gitvan/graphs/{graphId}/current    -> Latest snapshot
 *   refs/gitvan/graphs/{graphId}/stable     -> Last stable version
 *   refs/gitvan/graphs/history/{graphId}/@{timestamp}
 *
 *   refs/notes/gitvan/graphs/{graphId}      -> Version metadata
 */
export class GraphVersionManager {
  constructor(git) {
    this.git = git;
  }

  /**
   * Save a version of a graph
   * @param {object} metadata - Graph metadata
   * @param {Store} store - Graph store to save
   * @param {string} commitMessage - Commit message
   * @returns {Promise<VersionRecord>} Version record
   */
  async saveVersion(metadata, store, commitMessage = '') {
    const timestamp = new Date().toISOString();
    const versionTag = `v${Date.now()}`;

    // Serialize graph to Turtle
    const turtleContent = await this.serializeStore(store);

    // Create blob for Turtle content
    const blob = await this.git.createBlob(turtleContent);

    // Update refs
    const currentRef = metadata.versionRef;
    const timestampRef = `refs/gitvan/graphs/history/${metadata.graphId}/@${timestamp}`;

    await this.git.updateRef(currentRef, blob);
    await this.git.updateRef(timestampRef, blob);

    // Create version note
    const versionNote = {
      version: versionTag,
      timestamp,
      graph: metadata.graphId,
      graphIRI: metadata.iri,
      message: commitMessage || `Graph snapshot: ${metadata.graphId}`,
      hash: blob,
      tripleCount: await this.getTripleCount(store)
    };

    const noteRef = `refs/notes/gitvan/graphs/${metadata.graphId}`;
    await this.git.addNote(blob, noteRef, JSON.stringify(versionNote, null, 2));

    return {
      version: versionTag,
      timestamp,
      ref: currentRef,
      blob,
      note: versionNote
    };
  }

  /**
   * Get version history for a graph
   * @param {string} graphId - Graph identifier
   * @returns {Promise<VersionRecord[]>} Version records
   */
  async getVersionHistory(graphId) {
    const noteRef = `refs/notes/gitvan/graphs/${graphId}`;
    const notes = await this.git.getNotes(noteRef);

    return notes
      .map(note => JSON.parse(note.content))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Restore graph to a specific version
   * @param {string} graphId - Graph identifier
   * @param {string} versionTag - Version tag or timestamp
   * @returns {Promise<Store>} Restored graph store
   */
  async restoreVersion(graphId, versionTag) {
    // Find version by tag or timestamp
    const history = await this.getVersionHistory(graphId);
    const versionRecord = history.find(
      v => v.version === versionTag || v.timestamp === versionTag
    );

    if (!versionRecord) {
      throw new Error(`Version not found: ${versionTag}`);
    }

    // Load from blob
    const content = await this.git.readBlob(versionRecord.blob);
    const store = await this.deserializeStore(content);

    return store;
  }

  /**
   * Get lineage of a version
   * @param {string} graphId - Graph identifier
   * @param {string} versionTag - Version tag
   * @returns {Promise<VersionRecord[]>} Lineage from specified version to initial
   */
  async getVersionLineage(graphId, versionTag) {
    const history = await this.getVersionHistory(graphId);
    const startIndex = history.findIndex(v => v.version === versionTag);

    if (startIndex === -1) {
      throw new Error(`Version not found: ${versionTag}`);
    }

    return history.slice(startIndex);
  }

  /**
   * Mark a version as stable
   * @param {string} graphId - Graph identifier
   * @param {string} versionTag - Version to mark as stable
   */
  async markStable(graphId, versionTag) {
    const history = await this.getVersionHistory(graphId);
    const versionRecord = history.find(v => v.version === versionTag);

    if (!versionRecord) {
      throw new Error(`Version not found: ${versionTag}`);
    }

    const stableRef = `refs/gitvan/graphs/${graphId}/stable`;
    await this.git.updateRef(stableRef, versionRecord.blob);
  }

  /**
   * Serialize store to Turtle format
   * @private
   */
  async serializeStore(store) {
    // Implementation uses unrdf serialization
  }

  /**
   * Deserialize Turtle to store
   * @private
   */
  async deserializeStore(turtleContent) {
    // Implementation uses unrdf parsing
  }

  /**
   * Get triple count of a store
   * @private
   */
  async getTripleCount(store) {
    // Count triples in store
  }
}
```

### 2.5 Federation Service Interface

High-level service exposing federation operations.

```javascript
/**
 * High-level service interface for federation operations.
 * Provides composable interface for applications.
 */
export class GraphFederationService {
  constructor(graphRegistry, git, options = {}) {
    this.graphRegistry = graphRegistry;
    this.git = git;
    this.federator = new QueryFederator(graphRegistry, options);
    this.versionManager = new GraphVersionManager(git);
    this.nameResolver = new GraphNameResolver();
  }

  /**
   * Query multiple graphs with UNION pattern
   * @param {string[]} graphIds - Graph identifiers to query
   * @param {string} sparqlPattern - SPARQL WHERE clause pattern
   * @param {object} options - Query options
   * @returns {Promise<Array>} Query results
   */
  async queryUnion(graphIds, sparqlPattern, options = {}) {
    const selectVars = this.extractSelectVariables(sparqlPattern);
    const patterns = this.buildPatterns(graphIds, sparqlPattern);

    return await this.federator.selectUnion(
      graphIds,
      selectVars,
      patterns,
      options
    );
  }

  /**
   * Query a single graph directly
   * @param {string} graphId - Graph identifier
   * @param {string} sparql - Full SPARQL query
   * @param {object} options - Query options
   * @returns {Promise<Array>} Query results
   */
  async querySingle(graphId, sparql, options = {}) {
    const store = await this.graphRegistry.getOrCreateStore(graphId);
    return await store.select(sparql);
  }

  /**
   * List available graphs
   * @returns {object[]} Graph metadata for all registered graphs
   */
  listGraphs() {
    return this.graphRegistry.listGraphs();
  }

  /**
   * Get graph metadata
   * @param {string} graphId - Graph identifier
   * @returns {object} Graph metadata
   */
  getGraphMetadata(graphId) {
    return this.graphRegistry.getGraphMetadata(graphId);
  }

  /**
   * Get graph versions
   * @param {string} graphId - Graph identifier
   * @returns {Promise<object[]>} Version history
   */
  async getGraphVersions(graphId) {
    return await this.versionManager.getVersionHistory(graphId);
  }

  /**
   * Restore graph to version
   * @param {string} graphId - Graph identifier
   * @param {string} versionTag - Version tag to restore
   * @returns {Promise<object>} Restoration result
   */
  async restoreGraphVersion(graphId, versionTag) {
    const store = await this.versionManager.restoreVersion(graphId, versionTag);
    await this.graphRegistry.saveGraphStore(
      graphId,
      store,
      `Restored to ${versionTag}`
    );
    return { graphId, versionTag, status: 'restored' };
  }

  /**
   * Extract SELECT variables from pattern
   * @private
   */
  extractSelectVariables(pattern) {
    const vars = {};
    const matches = pattern.match(/\?(\w+)/g) || [];
    matches.forEach((v, i) => {
      vars[v.substring(1)] = v;
    });
    return vars;
  }

  /**
   * Build patterns for each graph
   * @private
   */
  buildPatterns(graphIds, pattern) {
    const patterns = {};
    graphIds.forEach(graphId => {
      patterns[graphId] = pattern;
    });
    return patterns;
  }
}
```

---

## Part 3: Query Patterns and Examples

### 3.1 Multi-Graph UNION Query Pattern

**Query all jobs across multiple graph versions**:
```sparql
PREFIX gv: <https://gitvan.dev/jobs/>

SELECT ?jobId ?status ?duration WHERE {
  {
    GRAPH <https://gitvan.dev/graph/local/repo/jobs> {
      ?job gv:jobId ?jobId ;
           gv:status ?status ;
           gv:duration ?duration .
    }
  }
  UNION
  {
    GRAPH <https://gitvan.dev/graph/local/repo/packs> {
      ?pack gv:jobId ?jobId ;
            gv:status ?status ;
            gv:duration ?duration .
    }
  }
}
ORDER BY DESC(?duration)
```

### 3.2 Cross-Graph JOIN Pattern

**Correlate jobs with performance metrics**:
```sparql
PREFIX jobs: <https://gitvan.dev/jobs/>
PREFIX perf: <https://gitvan.dev/performance/>

SELECT ?jobId ?status ?avgDuration WHERE {
  GRAPH <https://gitvan.dev/graph/local/repo/jobs> {
    ?job jobs:jobId ?jobId ;
         jobs:status ?status ;
         jobs:executedAt ?timestamp .
  }
  GRAPH <https://gitvan.dev/graph/local/repo/performance> {
    ?metric perf:timestamp ?timestamp ;
            perf:duration ?duration .
  }
}
```

### 3.3 Graph Metadata Query

**Find all available graphs and their versions**:
```sparql
PREFIX gv: <https://gitvan.dev/graph/>

SELECT ?graphId ?graphType ?lastModified WHERE {
  GRAPH gv:registry {
    ?graph gv:graphId ?graphId ;
           gv:graphType ?graphType ;
           gv:lastModified ?lastModified .
  }
}
ORDER BY DESC(?lastModified)
```

---

## Part 4: Implementation Specifications

### 4.1 QueryOptimizer Details

The query optimizer applies several transformations:

1. **Filter Push-Down**: Move FILTER clauses inside GRAPH patterns
2. **Graph Selection**: Exclude graphs that definitely won't match
3. **Variable Pruning**: Remove unnecessary variables from SELECT
4. **Join Ordering**: Determine optimal order for graph joins

```javascript
class QueryOptimizer {
  optimizeQuery(sparql, graphRegistry) {
    // Phase 1: Parse query structure
    const parsed = this.parseQuery(sparql);

    // Phase 2: Analyze graph selectivity
    const graphStats = this.analyzeGraphStatistics(parsed.graphs, graphRegistry);

    // Phase 3: Push down filters
    const optimized = this.pushDownFilters(parsed, graphStats);

    // Phase 4: Estimate cost
    const cost = this.estimateQueryCost(optimized, graphStats);

    return {
      optimizedQuery: this.serializeQuery(optimized),
      costEstimate: cost,
      executionPlan: this.createExecutionPlan(optimized)
    };
  }
}
```

### 4.2 Performance Characteristics

**Expected performance metrics**:

| Operation | Single Graph | Multi-Graph (2-5) | Notes |
|-----------|-------------|------------------|-------|
| SELECT (simple) | 5-10ms | 15-30ms | Per graph + merge overhead |
| SELECT (with JOIN) | 50-100ms | 100-300ms | Linear increase with graph count |
| CONSTRUCT | 20-50ms | 50-150ms | Depends on result size |
| UNION query | N/A | 30-100ms | Parallel execution of sub-queries |
| Cached query | <1ms | <1ms | With TTL validation |

### 4.3 Error Handling Strategy

```javascript
class QueryExecutionError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'QueryExecutionError';
    this.context = context;
    this.graphs = context.graphs || [];
    this.failedGraphs = context.failedGraphs || [];
    this.partialResults = context.partialResults || [];
  }
}

class GraphNotFoundError extends Error {
  constructor(graphId) {
    super(`Graph not registered: ${graphId}`);
    this.name = 'GraphNotFoundError';
    this.graphId = graphId;
  }
}

class InvalidGraphNameError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidGraphNameError';
  }
}
```

---

## Part 5: Migration Path

### 5.1 From Single-Graph to Multi-Graph

**Before (v3.0 pattern)**:
```javascript
const graph = await useGraph();
const results = await graph.select(`
  PREFIX gv: <https://gitvan.dev/jobs/>
  SELECT ?jobId WHERE { ?job gv:jobId ?jobId . }
`);
```

**After (v4.0 pattern)**:
```javascript
const federation = await useGraphFederation();

// Simple query still works
const results = await federation.querySingle('jobs', `
  PREFIX gv: <https://gitvan.dev/jobs/>
  SELECT ?jobId WHERE { ?job gv:jobId ?jobId . }
`);

// Or use new UNION pattern
const multiResults = await federation.queryUnion(
  ['jobs', 'performance'],
  `?job gv:jobId ?jobId ; gv:duration ?duration . `,
  { orderBy: 'DESC(?duration)' }
);
```

### 5.2 Migration Checklist

- [ ] Audit existing `useGraph()` calls
- [ ] Identify which graphs each query targets
- [ ] Update imports to use `useGraphFederation()`
- [ ] Test single-graph queries still work
- [ ] Refactor multi-graph logic to use UNION patterns
- [ ] Add graph versioning tests
- [ ] Update documentation with examples
- [ ] Performance test migrated queries

---

## Part 6: Testing Strategy

### 6.1 Unit Test Categories

1. **Graph Registration** (5 tests)
   - Register graph
   - Get graph metadata
   - List graphs
   - Invalid graph names
   - Duplicate registration

2. **Query Building** (8 tests)
   - Simple SELECT
   - SELECT with filters
   - UNION queries
   - Nested patterns
   - Variable extraction
   - Filter push-down

3. **Named Graphs** (6 tests)
   - GRAPH clause generation
   - Graph IRI parsing
   - Wildcard patterns
   - Graph scope resolution
   - Version selection

4. **Versioning** (7 tests)
   - Save version
   - List versions
   - Restore version
   - Version lineage
   - Mark stable
   - Delete version
   - Conflict detection

### 6.2 Integration Test Categories

1. **Multi-Graph Workflows** (5 tests)
   - Query across all 5 default graphs
   - Cross-graph JOINs
   - UNION with sorting/limiting
   - Graph snapshots
   - Restore workflow

2. **Performance** (3 tests)
   - Query 1000+ triples
   - Parallel execution
   - Cache effectiveness

3. **Error Scenarios** (4 tests)
   - Missing graph
   - Invalid query
   - Corrupted snapshot
   - Version conflicts

---

## Part 7: Success Criteria

### Phase 1 Success Metrics

1. **Functional**
   - All 5 default graphs registered and queryable
   - UNION queries return correct results
   - Graph versions saved and restorable
   - 95%+ query accuracy

2. **Performance**
   - Single-graph queries: <15ms
   - 5-graph UNION: <100ms
   - Cached queries: <1ms
   - Cache hit rate: >80%

3. **Reliability**
   - 100% pass rate on test suite
   - >85% code coverage
   - Zero data loss on version operations
   - Graceful error handling

4. **Compatibility**
   - Backward compatible with v3.0 code
   - Supports all existing SPARQL patterns
   - No breaking changes to composables

---

## Part 8: Effort Estimation

### Development Tasks

| Task | Effort | Notes |
|------|--------|-------|
| QueryFederator class | 16h | Core UNION coordination |
| NamedGraphRegistry | 12h | Graph lifecycle management |
| GraphVersionManager | 16h | Git-native versioning |
| QueryOptimizer | 20h | Filter push-down, cost estimation |
| Integration with useGraph | 12h | Composable wrapper |
| Comprehensive tests | 24h | 50+ test cases |
| Documentation | 12h | API docs, examples, guide |
| Performance tuning | 8h | Optimization & benchmarking |
| **Total** | **120h** | **3-4 weeks** |

### Testing Distribution

- Unit tests: 40 tests (40 hours)
- Integration tests: 15 tests (24 hours)
- Performance tests: 5 tests (8 hours)
- Edge cases: 10 tests (8 hours)

---

## Part 9: Dependencies and Prerequisites

1. **unrdf Library**
   - Named graph support in SPARQL queries
   - GRAPH clause execution
   - Query optimization hooks

2. **Git Integration**
   - Ref management (create/update/list/delete refs)
   - Blob storage (write/read graph snapshots)
   - Notes system (version metadata storage)

3. **Composables**
   - `useGit()` for Git operations
   - `useGitVan()` context wrapper
   - `withGitVan()` for context preservation

---

## Appendix: Configuration Example

```javascript
// Phase 1 Federation Configuration
const federationConfig = {
  // Default graphs to register
  defaultGraphs: {
    project: {
      graphType: 'project',
      baseIRI: 'https://gitvan.dev/project/',
      description: 'Project metadata and Git events'
    },
    jobs: {
      graphType: 'jobs',
      baseIRI: 'https://gitvan.dev/jobs/',
      description: 'Job execution history and status'
    },
    packs: {
      graphType: 'packs',
      baseIRI: 'https://gitvan.dev/packs/',
      description: 'Pack metadata and dependencies'
    },
    ai: {
      graphType: 'ai',
      baseIRI: 'https://gitvan.dev/ai/',
      description: 'AI template learning and evolution'
    },
    marketplace: {
      graphType: 'marketplace',
      baseIRI: 'https://gitvan.dev/marketplace/',
      description: 'Marketplace items and ratings'
    }
  },

  // Query federation options
  queryOptions: {
    enableCache: true,
    cacheTTL: 300000, // 5 minutes
    defaultLimit: 1000,
    timeout: 30000
  },

  // Versioning options
  versioningOptions: {
    autoSnapshot: true,
    snapshotInterval: 3600000, // 1 hour
    retentionDays: 30,
    maxVersions: 100
  }
};
```

---

**Document Status**: Ready for Implementation | **Next Steps**: Phase 1 Development Sprint
