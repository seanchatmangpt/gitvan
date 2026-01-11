# Federation and Multi-Graph: Technical Reference

**Document**: Implementation Reference | **Status**: For Development | **Date**: January 10, 2026

## Architecture Diagrams

### System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  GitVan Federation Network                      │
│  (Multiple instances with SPARQL endpoints)                     │
└────────────────────────────────────────────────────────────────┘
                              ▲
                    ┌─────────┴─────────┐
                    │                   │
              ┌─────▼──────┐    ┌──────▼─────┐
              │  Endpoint   │    │  Endpoint   │
              │  Instance 1 │    │  Instance N │
              └─────┬──────┘    └──────┬─────┘
                    │                   │
        ┌───────────┴──────────┬────────┴──────────┐
        │                      │                   │
    ┌───▼────────┐    ┌───────▼───┐    ┌─────────▼──┐
    │ Federation │    │ Multi-Grph│    │  Temporal  │
    │ Dispatcher │    │   Engine  │    │  Engine    │
    └───┬────────┘    └───┬──────┘    └──────┬─────┘
        │                 │                  │
        └────────┬────────┴──────────┬───────┘
                 │                   │
          ┌──────▼────────┐  ┌──────▼──────┐
          │ SPARQL Query  │  │  Result     │
          │ Optimizer     │  │  Merger     │
          └───────────────┘  └─────────────┘
                 ▲                   ▲
                 └───────────────────┘
```

### Component Interaction

```
┌─────────────────────────────────────────┐
│         GitVan Application Layer        │
│  (useGraph, useJob, useTemplate, etc.)  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Federation Query Layer (NEW)         │
├──────────────────────────────────────────┤
│ • FederationEndpointRegistry             │
│ • FederatedQueryPlanner                  │
│ • ServiceExecutor                        │
│ • ResultMerger & Deduplicator            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Multi-Graph Query Layer (ENHANCED)   │
├──────────────────────────────────────────┤
│ • Named Graph Manager                    │
│ • Graph Version Resolver                 │
│ • Temporal Query Processor                │
│ • Cross-Graph Join Executor              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Enterprise Features (NEW)               │
├──────────────────────────────────────────┤
│ • ConsistencyModelManager                │
│ • ConflictResolver                       │
│ • TenantQueryEnforcer                    │
│ • AuditLogManager                        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  SPARQL Engine (unrdf)                   │
├──────────────────────────────────────────┤
│ • Store Management                       │
│ • Query Execution                        │
│ • Result Processing                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Git-Native I/O Layer (EXISTING)      │
├──────────────────────────────────────────┤
│ • RDF Graph Snapshots (Git objects)      │
│ • Audit Trail (Git notes)                │
│ • State Refs (Git refs)                  │
│ • Worktree Isolation                     │
└──────────────────────────────────────────┘
```

### Data Flow Diagram

```
Federation Query Request
         │
         ▼
┌─────────────────────────────────┐
│  Query Parser & Validator       │
│  - Syntax validation            │
│  - Named graph resolution       │
│  - Tenant ACL check             │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Query Optimizer                │
│  - Cost estimation              │
│  - Endpoint selection           │
│  - Filter push-down             │
│  - Parallel execution plan      │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Execution Engine               │
│  - Service dispatcher           │
│  - Parallel executor            │
│  - Timeout management           │
│  - Partial result handling      │
└──────────┬──────────────────────┘
           │
      ┌────┴────┬────────┬─────────┐
      ▼         ▼        ▼         ▼
   ┌──────────────────────────────────┐
   │  Local Store / Service Endpoints │
   │  (Multiple SPARQL implementations)
   └────────────┬─────────────────────┘
                │
                ▼
         ┌─────────────┐
         │ Results     │
         └──────┬──────┘
                │
      ┌─────────┴──────────┐
      ▼                    ▼
┌──────────────┐  ┌──────────────────┐
│Result Merger │  │ Cache Handler    │
│ - Deduplicate│  │ - Store with TTL │
│ - Format     │  │ - Invalidate     │
│ - Sort       │  │ - Expire         │
└──────┬───────┘  └──────┬───────────┘
       │                 │
       └────────┬────────┘
                ▼
          ┌───────────────┐
          │ Formatted     │
          │ Results       │
          └───────────────┘
```

---

## Core Classes and Interfaces

### FederationEndpointRegistry

```typescript
interface EndpointMetadata {
  id: string;
  url: string;
  type: 'local' | 'remote' | 'federated';
  graphs: string[];  // Named graphs available
  auth?: {
    method: 'none' | 'api-key' | 'oauth2';
    token?: string;
  };
  priority: number;   // 0-100, higher = query first
  timeout: number;    // Query timeout in ms
  cacheTTL: number;   // Result cache time-to-live
  healthCheckInterval: number;  // ms between checks
  lastHealthCheck?: Date;
  isHealthy: boolean;
}

class FederationEndpointRegistry {
  // Register a SPARQL endpoint
  registerEndpoint(id: string, config: Partial<EndpointMetadata>): void

  // Get endpoint by ID
  getEndpoint(id: string): EndpointMetadata | null

  // Find endpoints by pattern
  findEndpoints(pattern: string): EndpointMetadata[]

  // List all active endpoints
  listEndpoints(): EndpointMetadata[]

  // Auto-discover endpoints
  async discoverEndpoints(servicePattern: string): Promise<string[]>

  // Health check specific endpoint
  async healthCheck(id: string): Promise<boolean>

  // Health check all endpoints
  async healthCheckAll(): Promise<Map<string, boolean>>

  // Remove endpoint
  removeEndpoint(id: string): void
}
```

### Named Graph Manager

```typescript
interface GraphNameComponents {
  type: 'local' | 'remote' | 'org' | 'tenant' | 'version';
  repoId?: string;
  orgId?: string;
  tenantId?: string;
  graphType: string;
  timestamp?: string;
  version?: string;
}

class NamedGraphManager {
  // Parse graph IRI into components
  parseGraphName(iri: string): GraphNameComponents

  // Build graph IRI from components
  buildGraphName(components: GraphNameComponents): string

  // Get all graphs matching pattern
  async findGraphsByPattern(pattern: string): Promise<string[]>

  // Get graph version/lineage
  async getGraphLineage(graphIri: string): Promise<string[]>

  // Resolve graph to latest version
  async resolveGraphVersion(graphIri: string): Promise<string>

  // Create graph snapshot
  async createSnapshot(graphIri: string, data: any): Promise<string>

  // Get graph at timestamp
  async getGraphAtTime(graphIri: string, timestamp: Date): Promise<any>
}
```

### Federated Query Executor

```typescript
interface QueryExecutionPlan {
  original: string;  // Original SPARQL
  optimized: string; // Optimized SPARQL
  endpointPlan: Array<{
    endpoint: EndpointMetadata;
    subquery: string;
    estimatedCost: number;
    parallel: boolean;
  }>;
  estimatedDuration: number;  // ms
  estimatedResultSize: number;
}

class FederatedQueryExecutor {
  // Execute query across federation
  async execute(sparql: string, options?: {
    consistency?: 'eventual' | 'raw' | 'bounded' | 'causal' | 'strong';
    cacheTTL?: number;
    timeout?: number;
    maxResults?: number;
  }): Promise<Array<any>>

  // Execute with result streaming
  async executeStream(sparql: string): AsyncIterable<any>

  // Plan query execution
  planQuery(sparql: string): QueryExecutionPlan

  // Get query statistics
  getQueryStats(queryId: string): {
    totalTime: number;
    endpoints: Map<string, EndpointStats>;
    cacheHit: boolean;
    resultCount: number;
  }
}
```

### Conflict Resolver

```typescript
type ConflictResolutionStrategy =
  | 'last-write-wins'
  | 'merge'
  | 'custom';

interface ConflictResolutionContext {
  versions: Map<string, any>;  // endpoint -> data
  timestamps: Map<string, Date>;
  sources: Map<string, string>;
  history: Array<any>;
}

class ConflictResolver {
  // Detect conflicts in multi-version results
  async detectConflicts(results: Map<string, any>): Promise<Conflict[]>

  // Resolve conflicts
  async resolve(context: ConflictResolutionContext): Promise<any>

  // Apply resolution strategy
  private applyStrategy(context: ConflictResolutionContext): any

  // Merge RDF graphs
  mergeGraphs(graphs: any[]): any
}
```

### Tenant Query Enforcer

```typescript
interface TenantAccessPolicy {
  tenantId: string;
  allowedGraphs: string[];  // Glob patterns
  visibilityLevels: 'private' | 'internal' | 'public';
  resultMask?: (result: any) => any;
  auditLog: boolean;
}

class TenantQueryEnforcer {
  // Execute query with tenant isolation
  async executeQueryForTenant(
    sparql: string,
    tenantId: string,
    policy: TenantAccessPolicy
  ): Promise<any[]>

  // Inject tenant filters into query
  injectTenantFilters(sparql: string, tenantId: string): string

  // Verify tenant access
  async verifyAccess(
    tenantId: string,
    graphName: string,
    operation: 'read' | 'write'
  ): Promise<boolean>

  // Audit query execution
  async auditQuery(
    tenantId: string,
    sparql: string,
    results: any[]
  ): Promise<void>
}
```

### Temporal Query Processor

```typescript
interface TemporalQueryOptions {
  asOf?: Date;           // Point-in-time query
  validFrom?: Date;      // Validity start
  validTo?: Date;        // Validity end
  includeHistory?: boolean;
  snapshotResolution?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

class TemporalQueryProcessor {
  // Query graph at specific point in time
  async queryAsOf(
    sparql: string,
    timestamp: Date,
    options?: TemporalQueryOptions
  ): Promise<any[]>

  // Query time-series data
  async queryTimeSeries(
    sparql: string,
    startTime: Date,
    endTime: Date,
    resolution: string
  ): Promise<TimeSeriesData>

  // Get graph lineage
  async getLineage(
    graphId: string,
    maxDepth?: number
  ): Promise<Array<{
    snapshot: string;
    timestamp: Date;
    operation?: string;
    agent?: string;
  }>>

  // Detect changes between snapshots
  async detectChanges(
    graphId: string,
    from: Date,
    to: Date
  ): Promise<Change[]>
}
```

---

## Key Algorithms

### Query Optimization Algorithm

```javascript
function optimizeQuery(sparql) {
  // 1. Parse query structure
  const ast = parseQuery(sparql);
  const servicePatterns = extractServices(ast);
  const filters = extractFilters(ast);

  // 2. Estimate endpoint costs
  const endpointCosts = new Map();
  for (const service of servicePatterns) {
    const endpoint = resolveServiceUrl(service);
    const estimated = estimateCost(endpoint, service.pattern);
    endpointCosts.set(endpoint, estimated);
  }

  // 3. Plan execution order (minimum spanning tree)
  const executionOrder = planExecutionOrder(
    servicePatterns,
    endpointCosts
  );

  // 4. Push filters to endpoints
  const optimizedServices = [];
  for (const service of executionOrder) {
    const applicableFilters = findApplicableFilters(service, filters);
    optimizedServices.push({
      ...service,
      filters: applicableFilters
    });
  }

  // 5. Identify independent services (parallel execution)
  const parallelGroups = identifyIndependentServices(optimizedServices);

  // 6. Build optimized query
  return {
    optimized: buildOptimizedQuery(optimizedServices),
    plan: {
      endpoints: executionOrder,
      parallelGroups,
      estimatedCost: sumCosts(endpointCosts)
    }
  };
}
```

### Result Merging Algorithm

```javascript
function mergeResults(results, deduplicationStrategy = 'uri-based') {
  const merged = new Map();  // URI -> merged result

  // 1. Group by subject URI
  for (const result of results) {
    const uri = result['?subject'] || generateKey(result);

    if (!merged.has(uri)) {
      merged.set(uri, {
        uri,
        sources: [],
        properties: new Map()
      });
    }

    const entry = merged.get(uri);

    // 2. Merge properties
    for (const [key, value] of Object.entries(result)) {
      if (key === '?subject') continue;

      if (!entry.properties.has(key)) {
        entry.properties.set(key, []);
      }

      entry.properties.get(key).push({
        value,
        source: result.__source__
      });
    }

    entry.sources.push(result.__source__);
  }

  // 3. Resolve conflicts
  const final = [];
  for (const [uri, entry] of merged) {
    const resolved = {};
    resolved['?subject'] = uri;

    for (const [key, values] of entry.properties) {
      resolved[key] = resolveConflict(values, deduplicationStrategy);
    }

    final.push(resolved);
  }

  return final;
}

function resolveConflict(values, strategy) {
  if (values.length === 1) {
    return values[0].value;
  }

  switch (strategy) {
    case 'uri-based':
      // Deduplicate by literal value
      const unique = [...new Set(values.map(v => v.value))];
      return unique.length === 1 ? unique[0] : values[0].value;

    case 'source-priority':
      // Choose value from highest priority source
      return values.sort((a, b) =>
        getSourcePriority(b.source) - getSourcePriority(a.source)
      )[0].value;

    case 'merge':
      // Merge multiple values
      return values.map(v => v.value);

    default:
      return values[0].value;
  }
}
```

### Named Graph Resolution Algorithm

```javascript
function resolveGraphName(iri) {
  // Parse: https://gitvan.dev/graph/{type}/{id}/{name}#{version}
  const pattern = /^https:\/\/gitvan\.dev\/graph\/([^/]+)\/([^/]+)\/([^#]+)(?:#(.+))?$/;
  const match = iri.match(pattern);

  if (!match) {
    throw new Error(`Invalid graph IRI: ${iri}`);
  }

  const [, type, id, name, version] = match;

  const components = {
    type,  // 'local', 'remote', 'org', 'tenant', 'version'
    graphType: name
  };

  if (type === 'local' || type === 'remote') {
    components.repoId = id;
  } else if (type === 'org') {
    components.orgId = id;
  } else if (type === 'tenant') {
    components.tenantId = id;
  } else if (type === 'version') {
    components.repoId = id;
    components.version = version;
  }

  if (version && type !== 'version') {
    components.timestamp = version;
  }

  return components;
}
```

---

## Configuration Examples

### Endpoint Configuration (YAML)

```yaml
# gitvan.federation.yml
federation:
  endpoints:
    local:
      url: http://localhost:3000/sparql
      type: local
      graphs:
        - "https://gitvan.dev/graph/local/*/jobs"
        - "https://gitvan.dev/graph/local/*/packs"
      priority: 100
      timeout: 5000
      cacheTTL: 300000  # 5 minutes

    org-1:
      url: https://org-1.example.com/sparql
      type: remote
      auth:
        method: api-key
        token: ${ORG_1_API_KEY}
      graphs:
        - "https://gitvan.dev/graph/remote/org-1/*/jobs"
        - "https://gitvan.dev/graph/org/org-1/workflows"
      priority: 80
      timeout: 10000
      cacheTTL: 600000  # 10 minutes

    public-registry:
      url: https://public.gitvan.dev/sparql
      type: federated
      graphs:
        - "https://gitvan.dev/graph/org/*/workflows"
        - "https://gitvan.dev/graph/org/*/analytics"
      priority: 50
      timeout: 15000
      cacheTTL: 900000  # 15 minutes

  consistency:
    default: eventual
    options:
      eventual:
        cacheTTL: 300000
      bounded-staleness:
        maxStaleness: 100000
      strong:
        requireMajority: true

  security:
    defaultTenantId: null
    requireAuth: false
    auditAll: true

  performance:
    maxParallelServices: 10
    streamResults: true
    enableQueryOptimization: true
    enableResultCaching: true
```

### Tenant Policy Configuration

```javascript
const tenantPolicies = {
  'tenant-acme': {
    tenantId: 'tenant-acme',
    allowedGraphs: [
      'https://gitvan.dev/graph/tenant/tenant-acme/**',
      'https://gitvan.dev/graph/org/acme-org/shared/**'
    ],
    visibilityLevels: ['private', 'internal', 'public'],
    resultMask: (result) => {
      // Remove sensitive fields
      delete result['?internalId'];
      delete result['?cost'];
      return result;
    },
    auditLog: true
  },

  'tenant-beta': {
    tenantId: 'tenant-beta',
    allowedGraphs: [
      'https://gitvan.dev/graph/tenant/tenant-beta/**'
    ],
    visibilityLevels: ['public'],  // No internal/private
    resultMask: null,
    auditLog: true
  }
};
```

---

## Query Examples by Use Case

### Use Case 1: Monorepo Package Dependencies

```sparql
PREFIX pack: <https://gitvan.dev/pack#>

# Find all packages and their dependencies within monorepo
SELECT ?package ?dependency ?version WHERE {
  GRAPH ?graph {
    ?p a pack:Package ;
       pack:name ?package ;
       pack:dependsOn ?dep .
    ?dep pack:name ?dependency ;
        pack:version ?version .
    FILTER(CONTAINS(STR(?graph), "local/monorepo"))
  }
}
ORDER BY ?package ?dependency
```

### Use Case 2: Cross-Organization Performance Comparison

```sparql
PREFIX perf: <https://gitvan.dev/performance#>

# Compare avg job duration across organizations
SELECT ?org ?operation
       (AVG(?duration) AS ?avgDuration)
       (MAX(?duration) AS ?maxDuration)
WHERE {
  {
    SERVICE <https://org-1.example.com/sparql> {
      GRAPH ?g {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:duration ?duration .
      }
      BIND("org-1" AS ?org)
    }
  }
  UNION
  {
    SERVICE <https://org-2.example.com/sparql> {
      GRAPH ?g {
        ?m a perf:Measurement ;
           perf:operation ?operation ;
           perf:duration ?duration .
      }
      BIND("org-2" AS ?org)
    }
  }
}
GROUP BY ?org ?operation
ORDER BY ?org ?operation
```

### Use Case 3: Temporal Trend Analysis

```sparql
PREFIX snap: <https://gitvan.dev/snapshot#>
PREFIX job: <https://gitvan.dev/jobs#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

# Job success rate trend over 30 days
SELECT (SUBSTR(STR(?date), 1, 10) AS ?day)
       (COUNT(?job) AS ?totalJobs)
       (SUM(IF(?success = true, 1, 0)) AS ?successCount)
WHERE {
  ?snap snap:timestamp ?date ;
         snap:graphData ?data .
  ?data rdf:type job:Job ;
        job:success ?success .

  FILTER(?date >= (NOW() - P30D))
}
GROUP BY ?day
ORDER BY ?day
```

### Use Case 4: Tenant-Isolated Query

```javascript
// Application code
const tenantId = 'tenant-acme';
const query = `
  SELECT ?jobId ?status WHERE {
    ?job gv:jobId ?jobId ;
         gv:status ?status .
  }
`;

const results = await tenantEnforcer.executeQueryForTenant(
  query,
  tenantId,
  policies[tenantId]
);
// Enforcer automatically:
// - Injects: GRAPH <https://gitvan.dev/graph/tenant/tenant-acme/jobs>
// - Verifies access to each result
// - Logs query in audit trail
```

---

## Performance Tuning Guidelines

### Query Optimization Tips

1. **Push filters to endpoints**: Better to filter at source
   ```sparql
   # ❌ Bad: Filter after SERVICE
   SERVICE <endpoint> { ... }
   FILTER(?duration > 1000)

   # ✅ Good: Filter at SERVICE
   SERVICE <endpoint> {
     ...
     FILTER(?duration > 1000)
   }
   ```

2. **Use specific graph names**: Avoid wildcards when possible
   ```sparql
   # ❌ Bad: Scans all graphs
   GRAPH ?g { ... }

   # ✅ Good: Specific graphs
   GRAPH <https://gitvan.dev/graph/local/repo-id/jobs> { ... }
   ```

3. **Limit before merging**: Get fewer results to merge
   ```sparql
   # ✅ Apply LIMIT in SERVICE
   SERVICE <endpoint> {
     SELECT ... WHERE { ... }
     LIMIT 1000
   }
   ```

4. **Use ASK for existence checks**: Faster than SELECT
   ```sparql
   # ❌ Slow: Retrieves all matching results
   SELECT ?job WHERE { ?job gv:jobId "123" . }

   # ✅ Fast: Just checks existence
   ASK { ?job gv:jobId "123" . }
   ```

### Caching Strategy

- **Time-based expiration**: Set appropriate TTL based on data freshness requirements
- **Event-based invalidation**: Clear cache when related data is modified
- **Partial caching**: Cache subquery results, combine cached + fresh

### Parallel Execution

- **Identify independent patterns**: SERVICE clauses with no dependencies
- **Limit concurrency**: Too many parallel queries can overwhelm endpoints
- **Sequential fallback**: Retry sequentially if parallel fails

---

## Monitoring and Observability

### Metrics to Track

```javascript
class FederationMetrics {
  recordQuery(query, stats) {
    // query: SPARQL query executed
    // stats: {
    //   duration: ms,
    //   endpoints: number,
    //   resultCount: number,
    //   cacheHit: boolean,
    //   endpointStats: Map<endpointId, stats>
    // }
  }

  recordEndpointHealth(endpointId, status) {
    // Track: status (up/down), latency, error rate
  }

  recordConflictResolution(context, strategy, result) {
    // Track: conflict frequency, resolution approach success
  }

  getMetrics(timeRange) {
    return {
      avgQueryTime: number,
      p99QueryTime: number,
      cacheHitRate: number,
      endpointAvailability: Map<string, number>,
      conflictResolutionSuccess: number
    };
  }
}
```

### Logging Strategy

```javascript
logger.info('Federation query started', {
  queryId: uuid(),
  endpoints: endpointIds,
  estimatedCost: cost,
  tags: ['federation', 'performance']
});

logger.debug('Service execution', {
  service: endpointId,
  subquery: query,
  timeout: ms
});

logger.warn('Service timeout', {
  service: endpointId,
  timeout: ms,
  resultsSoFar: count
});

logger.error('Federation query failed', {
  queryId: uuid(),
  endpoint: failedEndpointId,
  error: errorMessage,
  partialResults: count
});
```

---

## References

- SPARQL 1.1 Federation: https://www.w3.org/TR/sparql11-federated-query/
- RDF/JSON-LD: https://www.w3.org/TR/json-ld/
- PROV-O Ontology: https://www.w3.org/TR/prov-o/
- unrdf Documentation: [vendor/unrdf/README.md](../vendor/unrdf/README.md)

---

*Document prepared for implementation reference*
*Last updated: January 10, 2026*
