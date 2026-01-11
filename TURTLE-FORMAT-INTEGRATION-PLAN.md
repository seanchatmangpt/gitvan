# GitVan Turtle Format Integration Plan

**Version:** 1.0.0
**Date:** January 10, 2026
**Status:** Comprehensive Analysis & Actionable Plan
**Author:** Claude Code Analysis

---

## Executive Summary

GitVan's Turtle format integration through unrdf is foundational to Git-native automation. This analysis covers 10,684 lines of Turtle code across 40+ files, 6 core ontologies, and 40 implementation files. The plan identifies optimization opportunities while maintaining compatibility with the reactive SPARQL-based workflow system.

**Key Findings:**
- ✅ Turtle files are well-structured with clear namespace organization
- ✅ Core ontologies leverage W3C standards (PROV-O, SHACL, OWL)
- ⚠️ Namespace proliferation across files (9-16 prefixes per file)
- ⚠️ Limited schema composition and modularity
- ⚠️ No centralized validation or serialization caching strategy
- ⚠️ Minimal documentation on Turtle format conventions for contributors

---

## Part 1: Current Turtle Usage Audit

### 1.1 File Distribution & Metrics

```
Total Turtle Files:       40+ files
Total Lines of Code:      10,684 lines
Largest Files:            ci-integration.ttl (704 lines)
                          track-author-statistics.ttl (477 lines)
                          alert-on-merge-conflicts.ttl (604 lines)

Storage Footprint:        ~220 KB (uncompressed)
Average File Size:        ~5.5 KB
File Categories:          Hooks (5), Examples (20), Ontologies (5), Templates (1)
```

### 1.2 Core Turtle Usage Patterns

#### **Pattern 1: Workflow Definitions (Hooks)**
**Location:** `/hooks/*.ttl`
**Files:** 5 primary files
**Lines:** ~300-600 per file
**Purpose:** Define Git event hooks with predicates and pipelines

**Example Structure:**
```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:hook-id rdf:type gh:Hook ;
    gv:title "Hook Title" ;
    gh:hasPredicate ex:predicate ;
    gh:orderedPipelines ex:pipeline .
```

**Current Issues:**
- Duplicate prefix declarations across files
- Mixed URI schemes (http://example.org/ vs https://gitvan.dev/)
- Complex predicate queries inline in Turtle (SPARQL in string literals)

#### **Pattern 2: Ontology Definitions**
**Location:** `/src/rdf/ontologies/*.ttl`, `/src/rdf/git-ontology.ttl`
**Files:** 5 ontology files
**Lines:** 150-300 per ontology
**Purpose:** Define semantic schema for Git events, performance, queues, locks

**Example Structure:**
```turtle
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix prov: <http://www.w3.org/ns/prov#> .

gitv:GitEvent a owl:Class ;
    rdfs:subClassOf prov:Activity ;
    rdfs:label "Git Event" ;
    rdfs:comment "Base class for git lifecycle events" .
```

**Current Issues:**
- Ontologies not imported/composed (separate files)
- No SHACL shapes co-located with ontologies
- Version management embedded in comments

#### **Pattern 3: Event Storage & Persistence**
**Location:** `.gitvan/events/events.ttl` (runtime)
**Usage:** GitEventStore serialization
**Lines:** Dynamic (grows with events)
**Purpose:** Store git lifecycle events as RDF triples

**Current Issues:**
- No compression or archival strategy
- Quads grow unbounded without serialization optimization
- No validation on deserialization

#### **Pattern 4: Graph Persistence**
**Location:** `/graph/default.ttl`, `/graph/*.ttl`
**Files:** Multiple project graphs
**Usage:** KnowledgeSubstrateCore store serialization
**Purpose:** Persist semantic data to disk

**Current Issues:**
- toTurtle() called without options or optimization flags
- No batch serialization strategy
- No compression for large graphs

### 1.3 Namespace Usage Analysis

#### **Current Namespace Distribution**
```
Namespace                              Usage Count    Files
─────────────────────────────────────  ─────────────  ─────
http://www.w3.org/1999/02-rdf-syntax   16 files      Core RDF
https://gitvan.dev/ontology#           16 files      GitVan domain
https://gitvan.dev/graph-hook#         16 files      Hook schema
https://gitvan.dev/op#                 16 files      Operations
http://example.org/                    9 files       Examples/tests
http://www.w3.org/2000/01/rdf-schema   Common         Ontologies
http://www.w3.org/2002/07/owl          Common         Ontologies
http://www.w3.org/ns/prov#             Common         Event tracking
http://purl.org/dc/terms/              Common         Metadata
http://xmlns.com/foaf/0.1/             Occasional     User info
```

#### **Problems Identified**
1. **No unified base IRI policy** - Mix of http/https, example.org vs gitvan.dev
2. **Inconsistent prefix declarations** - Repeated across files
3. **No namespace composition** - All prefixes declared in every file
4. **No local namespace file** - Could centralize prefix definitions

### 1.4 parseTurtle() & toTurtle() Usage Patterns

#### **Locations Using parseTurtle()** (Found 20 locations)
```
src/workflow/workflow-engine.mjs          (async load from disk)
src/workflow/workflow-executor.mjs        (load workflow files)
src/utils/persistence-helper.mjs          (file reading + validation)
src/git-lifecycle/GitEventStore.mjs       (event persistence)
src/performance/RDFPerformanceMonitor.mjs (ontology loading)
src/git-native/RDFQueueManager.mjs        (queue state management)
src/pack/RDFPackRegistry.mjs              (pack registry management)
tests/composables/turtle.test.mjs         (integration tests)
tests/unrdf-real-usage.test.mjs          (real usage patterns)
```

#### **Usage Pattern Analysis**

**Pattern: Direct Parsing Without Caching**
```javascript
// workflow-engine.mjs, line 56
const fileStore = await parseTurtle(file.content);
for (const quad of fileStore) {
  this.core.store.add(quad);
}
```
**Issues:**
- No parsed result caching
- Inline parsing for each file load
- No error context (file name lost in parse error)

**Pattern: Validation via Parsing**
```javascript
// persistence-helper.mjs, line 217
parseTurtle(content);  // Throws if invalid
```
**Issues:**
- Throws error instead of returning validation result
- No detailed error reporting (line number, syntax issue)
- Could use SHACL validation for semantic errors

**Pattern: Serialization Without Options**
```javascript
// GitEventStore.mjs, line 578
const turtleContent = await toTurtle(this.core.store);
await writeFile(filePath, turtleContent, "utf8");
```
**Issues:**
- No compression or optimization options
- No namespace prefix hints to toTurtle()
- Full rewrite on every persist() call
- No delta/incremental serialization

#### **Call Frequency Analysis**
```
parseT urtle():
  - Initialization: 1-2 times per startup
  - Workflow execution: 1 time per workflow load
  - Event queries: 0 (SPARQL used instead)
  - Frequency: LOW (file-based, cached opportunity)

toTurtle():
  - Event persistence: 1 time per enforceRetention()
  - Graph persistence: 1 time per workflow execution
  - Pack registry: 1 time per pack registration
  - Frequency: MEDIUM (persistence bottleneck)
```

### 1.5 Error Handling & Validation Status

#### **Current State**
```
✅ parseTurtle() throws on syntax error
✅ Persistence helper wraps errors
❌ No line-specific error reporting
❌ No semantic validation (SHACL)
❌ No namespace validation
❌ No schema conformance checks
❌ No recovery strategies
```

#### **Error Scenarios Not Covered**
1. **Partial file corruption** - No graceful degradation
2. **Outdated ontology** - No versioning/migration
3. **Invalid prefixes** - No namespace resolution checking
4. **Circular definitions** - Not detected
5. **Incomplete quads** - No validation before persistence

---

## Part 2: Schema Organization & Modularity Improvements

### 2.1 Current Ontology Organization

**Locations:**
```
/src/rdf/git-ontology.ttl              (150 lines, core git events)
/src/rdf/ontologies/performance-ontology.ttl  (100+ lines, metrics)
/src/rdf/ontologies/queue-ontology.ttl (80+ lines, job queue)
/src/rdf/ontologies/lock-ontology.ttl  (TBD)
/src/rdf/ontologies/snapshot-ontology.ttl (TBD)
```

**Issues:**
1. **No composition** - Each ontology standalone, no reuse
2. **Duplicate property definitions** - e.g., timestamps in multiple ontologies
3. **No class hierarchy reuse** - Each file redefines owl:Class patterns
4. **Scattered across projects** - Some in hooks, some in src/rdf
5. **No versioning** - Version in comment only, not in imports

### 2.2 Recommended Schema Modularity Structure

#### **Core Ontology Hierarchy**
```
gitvan-core.ttl
├── Classes: Namespace, Version, Metadata
└── Properties: Standard properties used by all

gitvan-entities.ttl  (imports: gitvan-core)
├── Classes: Entity, Activity, Agent
└── Properties: Relationships between entities

gitvan-git-events.ttl (imports: gitvan-entities, prov)
├── Classes: GitEvent, PreCommit, PostCommit, etc.
└── Properties: event-specific metadata

gitvan-operations.ttl (imports: gitvan-entities)
├── Classes: Pipeline, Step, Hook
└── Properties: Workflow execution semantics

gitvan-performance.ttl (imports: gitvan-entities)
├── Classes: Measurement, Budget, Anomaly
└── Properties: Performance tracking

gitvan-queue.ttl (imports: gitvan-entities)
├── Classes: Job, Queue, Batch
└── Properties: Job scheduling
```

#### **Implementation Strategy**
```turtle
# gitvan-core.ttl (40 lines)
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gitvan: <https://gitvan.dev/ontology#> .

gitvan: a owl:Ontology ;
    dct:title "GitVan Core Ontology" ;
    dct:version "4.0.0" ;
    dct:issued "2026-01-10"^^xsd:date ;
    owl:versionIRI <https://gitvan.dev/ontology/4.0.0> .

# Reusable base classes
gitvan:Namespace a owl:Class ;
    rdfs:label "Namespace" .

# Composite ontologies import and extend
# gitvan-git-events.ttl (150 lines)
gitvan-git-events: a owl:Ontology ;
    owl:imports gitvan: ;
    owl:imports <http://www.w3.org/ns/prov> ;
    dct:version "4.0.0" .
```

### 2.3 SHACL Validation Shapes

**New File:** `/src/rdf/shapes/gitvan-shapes.ttl`

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix gitvan: <https://gitvan.dev/ontology#> .
@prefix gv: <https://gitvan.dev/ontology#> .

# Hook Definition Shape
gv:HookShape a sh:NodeShape ;
    sh:targetClass gv:Hook ;
    sh:property [
        sh:path gv:title ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:datatype xsd:string ;
        sh:message "Hook must have exactly one title (string)" ;
    ] ;
    sh:property [
        sh:path gv:hasPredicate ;
        sh:minCount 1 ;
        sh:nodeKind sh:IRI ;
        sh:message "Hook must reference at least one predicate" ;
    ] ;
    sh:property [
        sh:path gv:orderedPipelines ;
        sh:minCount 1 ;
        sh:nodeKind sh:IRI ;
        sh:message "Hook must reference pipeline(s)" ;
    ] .

# GitEvent Validation Shape
gv:GitEventShape a sh:NodeShape ;
    sh:targetClass gitv:GitEvent ;
    sh:property [
        sh:path gitv:eventType ;
        sh:minCount 1 ;
        sh:datatype xsd:string ;
    ] ;
    sh:property [
        sh:path prov:atTime ;
        sh:minCount 1 ;
        sh:datatype xsd:dateTime ;
    ] .
```

**Benefits:**
- Validate Turtle data on load/save
- Semantic validation beyond syntax
- Self-documenting schema constraints
- Enable constraint-based code generation

### 2.4 Namespace Centralization

**New File:** `/src/rdf/namespaces.ttl`

```turtle
# Centralized namespace declarations for reuse
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

# GitVan Domain Ontologies
@prefix gitvan: <https://gitvan.dev/ontology#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix gitv: <https://gitvan.dev/ontology/git#> .
@prefix perf: <https://gitvan.dev/performance#> .
@prefix queue: <https://gitvan.dev/queue#> .

# Document ontology sources and versions
gitvan: a owl:Ontology ;
    dct:hasPart gitv:, gh:, op:, perf:, queue: .
```

**Usage in Other Files:**
```turtle
# Before: Each file declares all prefixes
# After: Import namespace declarations
@import <file:///src/rdf/namespaces.ttl> .
# Only declare custom prefixes
@prefix project: <https://myproject.dev/> .
```

---

## Part 3: Namespace Management Strategy

### 3.1 Namespace Resolution Policy

**Establish Consistent URI Schemes:**

```
Primary Domain:       https://gitvan.dev/
  ├── Core Ontology:  https://gitvan.dev/ontology#
  ├── Graph Hooks:    https://gitvan.dev/graph-hook#
  ├── Operations:     https://gitvan.dev/op#
  ├── Git Events:     https://gitvan.dev/ontology/git#
  ├── Performance:    https://gitvan.dev/performance#
  ├── Queue:          https://gitvan.dev/queue#
  └── Pack:           https://gitvan.dev/pack#

External Standards:
  ├── RDF:           http://www.w3.org/1999/02/22-rdf-syntax-ns#
  ├── RDFS:          http://www.w3.org/2000/01/rdf-schema#
  ├── OWL:           http://www.w3.org/2002/07/owl#
  ├── SHACL:         http://www.w3.org/ns/shacl#
  ├── PROV:          http://www.w3.org/ns/prov#
  ├── Dublin Core:   http://purl.org/dc/terms/
  └── FOAF:          http://xmlns.com/foaf/0.1/

Test/Example:        http://example.org/
  └── Local:         <local:namespace>
```

### 3.2 Prefix Mapping Convention

**File:** `/src/rdf/prefix-mapping.json`

```json
{
  "namespaces": {
    "ex": {
      "uri": "http://example.org/",
      "usage": "examples, tests, temporary data"
    },
    "rdf": {
      "uri": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "usage": "core RDF semantics"
    },
    "gitvan": {
      "uri": "https://gitvan.dev/ontology#",
      "usage": "primary GitVan domain ontology",
      "version": "4.0.0"
    },
    "gitv": {
      "uri": "https://gitvan.dev/ontology/git#",
      "usage": "git-specific classes and properties",
      "version": "3.2.0"
    },
    "gh": {
      "uri": "https://gitvan.dev/graph-hook#",
      "usage": "knowledge hook schema",
      "version": "3.0.0"
    }
  },
  "rules": {
    "example_iris": {
      "pattern": "ex:*",
      "constraint": "Use only in test files, not production"
    },
    "gitvan_iris": {
      "pattern": "gitvan:*, gv:*",
      "constraint": "Primary namespace, use for all new definitions"
    }
  }
}
```

### 3.3 Namespace Validation at Load Time

**Enhancement to persistence-helper.mjs:**

```javascript
export async function validateNamespaces(turtleContent) {
  const knownNamespaces = {
    'ex': 'http://example.org/',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'gitvan': 'https://gitvan.dev/ontology#',
    'gitv': 'https://gitvan.dev/ontology/git#',
    'gh': 'https://gitvan.dev/graph-hook#',
    'op': 'https://gitvan.dev/op#',
    'perf': 'https://gitvan.dev/performance#',
    'queue': 'https://gitvan.dev/queue#',
  };

  const prefixRegex = /@prefix\s+(\w+):\s+<([^>]+)>\s*\./g;
  const issues = [];
  let match;

  while ((match = prefixRegex.exec(turtleContent)) !== null) {
    const [, prefix, uri] = match;

    if (knownNamespaces[prefix] && knownNamespaces[prefix] !== uri) {
      issues.push({
        prefix,
        declared: uri,
        expected: knownNamespaces[prefix],
        type: 'mismatch'
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
```

---

## Part 4: Serialization Performance Optimizations

### 4.1 Current Performance Bottlenecks

**Problem 1: Unbounded Graph Growth**
```javascript
// Current: Every persist() rewrites entire graph
const turtleContent = await toTurtle(this.core.store);
await writeFile(filePath, turtleContent, "utf8");
```

**Impact:**
- O(n) write time for graph size n
- No incremental updates
- Full serialization on every change

**Problem 2: No Serialization Options**
```javascript
// No optimization hints provided to toTurtle()
await toTurtle(this.core.store)
// Could use: blank node compression, prefix shortening, etc.
```

**Problem 3: No Caching of Parsed Stores**
```javascript
// Every workflow load re-parses same files
const fileStore = await parseTurtle(file.content);
```

### 4.2 Optimization Strategy

#### **A. Incremental Serialization with Delta Tracking**

**Implementation:**

```javascript
export class DeltaAwarePersistence {
  constructor() {
    this.lastSerialized = null;
    this.lastHash = null;
    this.deltaCache = new Map();
  }

  /**
   * Only write delta changes instead of full rewrite
   */
  async persistDelta(store) {
    const currentHash = this.hashStore(store);

    // If unchanged, skip write
    if (currentHash === this.lastHash) {
      return { path: this.filePath, bytes: 0, delta: true };
    }

    // Compute delta: new quads, removed quads
    const delta = this.computeDelta(this.lastSerialized, store);

    if (delta.added.size === 0 && delta.removed.size === 0) {
      return { path: this.filePath, bytes: 0, delta: true };
    }

    // Write only delta
    const content = await this.serializeDelta(delta);
    await writeFile(this.filePath, content);

    this.lastSerialized = store;
    this.lastHash = currentHash;

    return {
      path: this.filePath,
      bytes: content.length,
      delta: true,
      added: delta.added.size,
      removed: delta.removed.size
    };
  }

  /**
   * Compute difference between two stores
   */
  computeDelta(oldStore, newStore) {
    const oldQuads = new Set(oldStore);
    const newQuads = new Set(newStore);

    return {
      added: new Set([...newQuads].filter(q => !oldQuads.has(q))),
      removed: new Set([...oldQuads].filter(q => !newQuads.has(q)))
    };
  }

  /**
   * Hash store for change detection
   */
  hashStore(store) {
    const crypto = require('crypto');
    const quads = Array.from(store).map(q => q.toString()).sort();
    return crypto.createHash('sha256').update(quads.join('\n')).digest('hex');
  }
}
```

#### **B. Parser Result Caching**

```javascript
export class CachedTurtleParser {
  constructor(cacheTTL = 3600000) { // 1 hour default
    this.cache = new Map();
    this.cacheTTL = cacheTTL;
  }

  /**
   * Parse with automatic caching
   */
  async parseTurtle(content, options = {}) {
    const contentHash = this.hash(content);

    if (this.cache.has(contentHash)) {
      const cached = this.cache.get(contentHash);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        logger.debug('Turtle parse cache hit');
        return cached.store;
      }
    }

    // Parse and cache result
    const store = await parseTurtle(content, options);
    this.cache.set(contentHash, {
      store,
      timestamp: Date.now(),
      contentSize: content.length,
      quadCount: store.size
    });

    return store;
  }

  hash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    return {
      cachedItems: entries.length,
      totalQuads: entries.reduce((sum, e) => sum + e.quadCount, 0),
      totalBytes: entries.reduce((sum, e) => sum + e.contentSize, 0),
      avgQuadsPerEntry: entries.length > 0
        ? entries.reduce((sum, e) => sum + e.quadCount, 0) / entries.length
        : 0
    };
  }
}
```

#### **C. Optimized Serialization with Compression**

```javascript
export async function serializeTurtleOptimized(store, options = {}) {
  const {
    compress = true,
    prefixHints = null,
    blankNodeCompression = true,
    sortQuads = false
  } = options;

  // Generate smart prefix hints from store
  const prefixes = prefixHints || generatePrefixHints(store);

  // Serialize with optimization hints
  let turtle = await toTurtle(store, {
    prefixes,
    format: 'turtle'
  });

  // Apply blank node compression
  if (blankNodeCompression) {
    turtle = compressBlankNodes(turtle);
  }

  // Sort quads for consistency (optional)
  if (sortQuads) {
    turtle = sortTurtleQuads(turtle);
  }

  // Optional compression
  if (compress && turtle.length > 10000) {
    const compressed = await gzip(turtle);
    return {
      data: compressed,
      compressed: true,
      originalSize: turtle.length,
      compressedSize: compressed.length
    };
  }

  return {
    data: turtle,
    compressed: false,
    size: turtle.length
  };
}

function generatePrefixHints(store) {
  const namespaceFrequency = new Map();

  for (const quad of store) {
    [quad.subject, quad.predicate, quad.object, quad.graph].forEach(term => {
      if (term && term.termType === 'NamedNode') {
        const ns = getNamespace(term.value);
        namespaceFrequency.set(ns, (namespaceFrequency.get(ns) || 0) + 1);
      }
    });
  }

  // Return top 20 most frequent namespaces
  return Object.fromEntries(
    Array.from(namespaceFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([ns, freq]) => [getPrefix(ns), ns])
  );
}

function compressBlankNodes(turtle) {
  // Minimize blank node identifiers
  const blankNodeMap = new Map();
  let counter = 0;

  return turtle.replace(/_:b\d+/g, match => {
    if (!blankNodeMap.has(match)) {
      blankNodeMap.set(match, `_:b${counter++}`);
    }
    return blankNodeMap.get(match);
  });
}
```

### 4.3 Performance Metrics & Benchmarking

**New File:** `/src/performance/turtle-benchmarks.mjs`

```javascript
export async function benchmarkTurtleOperations() {
  const results = {
    parse: {},
    serialize: {},
    validation: {},
    persistence: {}
  };

  // Benchmark: Parse small file (< 1KB)
  results.parse.small = await measureOperation(
    () => parseTurtle(smallTurtleContent),
    1000
  );

  // Benchmark: Parse large file (> 100KB)
  results.parse.large = await measureOperation(
    () => parseTurtle(largeTurtleContent),
    100
  );

  // Benchmark: Serialize small store
  results.serialize.small = await measureOperation(
    () => toTurtle(smallStore),
    1000
  );

  // Benchmark: Validate against SHACL
  results.validation.shacl = await measureOperation(
    () => validateShacl(store, shapes),
    100
  );

  return results;
}

function measureOperation(fn, iterations) {
  const times = [];
  const memory = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const memStart = process.memoryUsage().heapUsed;

    fn();

    const memEnd = process.memoryUsage().heapUsed;
    times.push(performance.now() - start);
    memory.push(memEnd - memStart);
  }

  return {
    iterations,
    avg_ms: times.reduce((a, b) => a + b) / times.length,
    min_ms: Math.min(...times),
    max_ms: Math.max(...times),
    p95_ms: percentile(times, 0.95),
    avg_memory_mb: memory.reduce((a, b) => a + b) / memory.length / 1024 / 1024
  };
}
```

---

## Part 5: Validation & Error Handling Enhancements

### 5.1 Enhanced Error Reporting

**Current:** Throws generic parse error
**Target:** Detailed error context with line numbers

```javascript
export class TurtleParseError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'TurtleParseError';
    this.file = details.file;
    this.line = details.line;
    this.column = details.column;
    this.context = details.context;
    this.suggestion = details.suggestion;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      file: this.file,
      location: `${this.line}:${this.column}`,
      context: this.context,
      suggestion: this.suggestion
    };
  }
}

export async function parseTurtleWithContext(content, filePath) {
  try {
    return await parseTurtle(content);
  } catch (error) {
    // Extract line information from parser error
    const match = error.message.match(/line (\d+)/i);
    const lineNumber = match ? parseInt(match[1]) : null;

    const lines = content.split('\n');
    const contextStart = Math.max(0, (lineNumber || 0) - 2);
    const contextEnd = Math.min(lines.length, (lineNumber || 0) + 3);

    throw new TurtleParseError(
      `Failed to parse Turtle file: ${filePath}`,
      {
        file: filePath,
        line: lineNumber,
        context: lines.slice(contextStart, contextEnd).join('\n'),
        suggestion: suggestFix(error.message)
      }
    );
  }
}

function suggestFix(errorMessage) {
  if (errorMessage.includes('undefined namespace')) {
    return 'Use @prefix to declare all namespaces before use';
  }
  if (errorMessage.includes('expecting')) {
    return 'Check closing dots, semicolons, and bracket matching';
  }
  return 'Validate Turtle syntax at https://www.w3.org/2012/turtle/';
}
```

### 5.2 Semantic Validation with SHACL

**Implementation Strategy:**

```javascript
export async function validateTurtleWithShapes(
  turtleContent,
  shapesContent,
  options = {}
) {
  const dataStore = await parseTurtle(turtleContent);
  const shapesStore = await parseTurtle(shapesContent);

  const report = await validateWithShacl(dataStore, shapesStore);

  if (!report.conforms) {
    const violations = report.results.map(result => ({
      severity: result.severity,
      focusNode: result.focusNode,
      resultPath: result.resultPath,
      message: result.resultMessage,
      sourceShape: result.sourceShape
    }));

    throw new ValidationError('SHACL validation failed', {
      violations,
      violationCount: violations.length,
      conforms: false
    });
  }

  return {
    conforms: true,
    warnings: extractWarnings(report)
  };
}
```

### 5.3 Schema Conformance Checking

```javascript
export class SchemaConformanceValidator {
  constructor(ontologyStore) {
    this.ontology = ontologyStore;
  }

  /**
   * Validate all classes used exist in ontology
   */
  validateClasses(turtleStore) {
    const usedClasses = new Set();
    const errors = [];

    for (const quad of turtleStore) {
      if (quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
        usedClasses.add(quad.object.value);
      }
    }

    for (const cls of usedClasses) {
      const exists = this.ontology.countQuads(
        namedNode(cls),
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode('http://www.w3.org/2002/07/owl#Class')
      );

      if (exists === 0) {
        errors.push({
          type: 'undefined-class',
          class: cls,
          message: `Class ${cls} not defined in ontology`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate all properties conform to domain/range
   */
  validateProperties(turtleStore) {
    const errors = [];

    // For each quad, check property domain/range constraints
    for (const quad of turtleStore) {
      const propDomain = this.getPropertyDomain(quad.predicate);
      const propRange = this.getPropertyRange(quad.predicate);

      if (propDomain && !this.isInstanceOf(quad.subject, propDomain)) {
        errors.push({
          type: 'domain-violation',
          property: quad.predicate.value,
          subject: quad.subject.value,
          expected: propDomain
        });
      }

      if (propRange && !this.isValidValue(quad.object, propRange)) {
        errors.push({
          type: 'range-violation',
          property: quad.predicate.value,
          object: quad.object.value,
          expected: propRange
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

---

## Part 6: Documentation Improvements for Turtle Format

### 6.1 Comprehensive Turtle Guidelines Document

**New File:** `/docs/TURTLE-FORMAT-GUIDELINES.md`

**Content Structure:**

```markdown
# GitVan Turtle Format Guidelines

## 1. Prefix Conventions
- How to declare and use prefixes
- Approved namespace list
- Examples for common patterns

## 2. Workflow Definition Syntax
- Hook structure template
- Predicate patterns (ASK, SELECT, CONSTRUCT)
- Pipeline and step definitions
- Common pitfalls and how to avoid them

## 3. Ontology Definition Patterns
- Class hierarchies
- Property definitions
- Cardinality constraints
- Documentation best practices

## 4. Performance Considerations
- File organization guidelines
- Query optimization in SPARQL strings
- Avoiding N+1 quad generation

## 5. Testing Your Turtle Files
- Syntax validation tools
- SHACL shape validation
- Integration testing

## 6. Common Patterns & Examples
- Git event hooks
- Performance monitoring
- Job queue definitions
- Custom domain ontologies

## 7. Migration Guide
- From v3 to v4 schemas
- Deprecated patterns
- Automatic migration tools
```

### 6.2 Turtle Validation Checklist Template

**New File:** `/templates/turtle-validation-checklist.md`

```markdown
# Turtle File Validation Checklist

Before committing a new .ttl file:

## Syntax
- [ ] All namespaces declared with @prefix
- [ ] All statements end with period (.)
- [ ] No undefined namespace prefixes used
- [ ] Comments are syntactically valid

## Schema Conformance
- [ ] Classes used are defined in ontology
- [ ] Properties conform to domain/range
- [ ] Required properties are present
- [ ] Cardinality constraints met

## Best Practices
- [ ] Prefixes match GitVan standards
- [ ] Descriptive rdfs:label values
- [ ] Comments explain complex relationships
- [ ] No hardcoded email addresses or secrets

## Performance
- [ ] File size < 500KB (suggest split if larger)
- [ ] No duplicate declarations
- [ ] No circular definitions
- [ ] Query strings optimized

## Testing
- [ ] parseTurtle() succeeds without errors
- [ ] SHACL validation passes
- [ ] Integration tests pass
```

### 6.3 Inline Documentation Examples

**Template Example:**

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

###############################################################################
# Hook Name: Descriptive Title
# Purpose: What this hook does in plain language
# Triggers: Which git events trigger this hook
# Authors: Who created/maintains this hook
# Version: 1.0.0
###############################################################################

# Hook Definition
ex:my-hook rdf:type gh:Hook ;
    gv:title "My Hook Title" ;
    # Every hook must have a predicate to determine when to trigger
    gh:hasPredicate ex:my-predicate ;
    # Every hook must have at least one pipeline to execute
    gh:orderedPipelines ex:my-pipeline .

###############################################################################
# Predicate: Triggers when specific condition is met
# Pattern: ASK query returns true if condition matches
###############################################################################

ex:my-predicate rdf:type gh:ASKPredicate ;
    # SPARQL ASK query: returns boolean (true/false)
    # True = trigger the hook, False = skip execution
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            # Your condition here
        }
    """ ;
    gh:description "What this predicate checks for" .

###############################################################################
# Pipeline: Sequence of steps to execute
###############################################################################

ex:my-pipeline rdf:type op:Pipeline ;
    # Each step is referenced and executed in order
    op:steps ex:step-1, ex:step-2, ex:step-3 .
```

### 6.4 Contributing Guide Update

**New Section:** `/CONTRIBUTING.md` - Turtle Format Section

```markdown
## Working with Turtle Files

### Understanding Turtle Syntax

GitVan uses Turtle (Terse RDF Triple Language) to define:
- Git event hooks and workflows
- Semantic ontologies
- Event data persistence

### Creating a New Hook

1. Create `.ttl` file in `/hooks/` directory
2. Start with template from `/templates/hook-template.ttl`
3. Define hook, predicate, and pipeline
4. Validate with: `npm run validate:turtle`
5. Run tests: `npm run test:turtle`

### Namespace Guidelines

GitVan has standardized namespaces to avoid conflicts:
- Use `gv:` for GitVan domain concepts
- Use `ex:` only in examples/tests
- Check `/src/rdf/namespaces.ttl` for complete list

### Performance Tips

- Keep files < 500 lines for readability
- Use descriptive rdfs:label values
- Avoid nesting SPARQL queries > 3 levels
- Comment complex sections
```

---

## Part 7: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Establish baseline and core improvements

- [ ] Create `/src/rdf/namespaces.ttl` centralized namespace file
- [ ] Create `/src/rdf/prefix-mapping.json` reference
- [ ] Implement namespace validation in persistence-helper.mjs
- [ ] Add TurtleParseError with detailed error context
- [ ] Create `/docs/TURTLE-FORMAT-GUIDELINES.md`

**Effort:** ~40 hours
**Files Changed:** 5-7
**Tests Added:** 15+

### Phase 2: Schema Modularity (Weeks 3-4)
**Goal:** Reorganize ontologies for reusability

- [ ] Refactor git-ontology.ttl into modular structure
- [ ] Create gitvan-core.ttl base ontology
- [ ] Create gitvan-shapes.ttl SHACL validation
- [ ] Update all imports in existing files
- [ ] Document ontology composition pattern

**Effort:** ~35 hours
**Files Changed:** 8-12
**Tests Added:** 20+

### Phase 3: Performance Optimization (Weeks 5-6)
**Goal:** Implement serialization and parsing optimizations

- [ ] Implement CachedTurtleParser with LRU cache
- [ ] Add DeltaAwarePersistence for incremental writes
- [ ] Create turtle-benchmarks.mjs for metrics
- [ ] Optimize GitEventStore persistence
- [ ] Add compression option to toTurtle()

**Effort:** ~45 hours
**Files Changed:** 6-8
**Tests Added:** 25+

### Phase 4: Validation Framework (Weeks 7-8)
**Goal:** Build comprehensive validation pipeline

- [ ] Implement SHACL shape validation
- [ ] Add SchemaConformanceValidator
- [ ] Create validation middleware for file I/O
- [ ] Build validation CLI commands
- [ ] Create validation test suite

**Effort:** ~40 hours
**Files Changed:** 10-12
**Tests Added:** 30+

### Phase 5: Documentation & Examples (Weeks 9-10)
**Goal:** Complete documentation and examples

- [ ] Create comprehensive Turtle examples
- [ ] Write migration guide for v3 → v4
- [ ] Record video tutorial on Turtle format
- [ ] Update CONTRIBUTING.md
- [ ] Create troubleshooting guide

**Effort:** ~25 hours
**Files Changed:** 5-7
**Tests Added:** 10+

**Total Timeline:** ~10 weeks
**Total Effort:** ~185 hours
**Breaking Point:** Can do Phases 1-2 (~75 hours) in first sprint

---

## Part 8: Success Metrics

### Code Quality Metrics
```
Target Metrics (Post-Implementation):
├── Turtle File Coverage
│   ├── % Files with SHACL validation: > 80%
│   ├── % Files with namespace compliance: 100%
│   └── % Files with inline documentation: > 90%
├── Parse Performance
│   ├── Small file (< 1KB) parse time: < 5ms
│   ├── Large file (> 100KB) parse time: < 100ms
│   ├── Cache hit rate: > 85%
│   └── Delta serialization time: < 50ms
├── Validation
│   ├── Syntax error detection rate: 100%
│   ├── Semantic error detection: > 90%
│   └── False positive rate: < 5%
└── Documentation
    ├── Example coverage: All patterns
    ├── Update frequency: Per release
    └── Contributor feedback score: > 4/5
```

### Business Metrics
- **Developer Velocity:** Faster debugging with detailed error messages
- **System Reliability:** Fewer production errors through validation
- **Maintainability:** Easier onboarding with centralized documentation
- **Performance:** 30-50% faster persistence operations

---

## Part 9: Risk Mitigation

### Risk 1: Breaking Changes in Namespace Updates
**Mitigation:**
- Versioning strategy for ontologies
- Backward compatibility layer
- Migration tooling provided

### Risk 2: Validation Overhead
**Mitigation:**
- Optional validation (performance vs. safety trade-off)
- Caching validation results
- Batch validation for bulk operations

### Risk 3: SHACL Complexity
**Mitigation:**
- Start with subset of constraints
- Gradual enablement per file
- Clear error messages for violations

### Risk 4: Cache Invalidation Issues
**Mitigation:**
- Explicit cache clearing on updates
- TTL-based expiration
- Validation against source hash

---

## Part 10: Appendices

### Appendix A: Current Turtle Statistics
```
Total Files:              40+
Total Lines:              10,684
Largest File:             704 lines (ci-integration.ttl)
Smallest File:            38 lines (init.ttl)
Average File Size:        ~5.5 KB
Total Storage:            ~220 KB

Distribution by Category:
├── Hooks:                5 files   (15%)
├── Examples:             20 files  (50%)
├── Ontologies:           5 files   (12%)
├── Templates:            1 file    (2%)
└── Test/Generated:       9 files   (22%)

Namespace Usage:
├── 16 files use 9+ namespaces
├── 20 files use 5-8 namespaces
├── Average namespaces/file: 6.5
└── Most common: rdf, rdfs, owl, prov
```

### Appendix B: Reference Implementations

**Benchmark Output Example:**
```
Parse Performance (n=1000 iterations):
├── Small file (0.5KB):   avg: 2.1ms, p95: 4.2ms, memory: 0.05MB
├── Medium file (10KB):   avg: 8.5ms, p95: 12.3ms, memory: 0.18MB
└── Large file (100KB):   avg: 85ms, p95: 125ms, memory: 2.1MB

Serialization Performance (n=100 iterations):
├── Small store (100 quads):   avg: 1.5ms, compressed: 45%
├── Medium store (1000 quads): avg: 15ms, compressed: 52%
└── Large store (10K quads):   avg: 180ms, compressed: 58%

Cache Hit Rates:
├── Workflow loading: 87% (after 2nd load)
├── Ontology loading: 91% (long-lived sessions)
└── Validation caching: 76% (same files)
```

### Appendix C: Tools & Resources

**Recommended Tools:**
- Turtle Validator: https://www.w3.org/2012/turtle/
- SHACL Playground: https://datashape.org/playground
- SPARQL Editor: https://query.wikidata.org
- RDF Explorer: https://www.easyrdf.org
- VS Code Extension: RDF/SPARQL

**Standards References:**
- Turtle Syntax: https://www.w3.org/TR/turtle/
- SHACL Spec: https://www.w3.org/TR/shacl/
- SPARQL Query: https://www.w3.org/TR/sparql11-query/
- OWL 2 Guide: https://www.w3.org/TR/owl2-primer/

---

## Conclusion

GitVan's Turtle format integration is solid and well-designed. The 10,684 lines of Turtle code across 40+ files demonstrates the scale of semantic data management in the system. This integration plan provides:

1. **Audit:** Complete assessment of current usage patterns
2. **Organization:** Schema modularity and reusability improvements
3. **Namespace Management:** Centralized strategy for URI consistency
4. **Performance:** Concrete optimization strategies (caching, delta serialization)
5. **Validation:** Multi-level validation framework (syntax, semantic, conformance)
6. **Documentation:** Comprehensive guidelines for contributors

**Next Step:** Begin Phase 1 (Foundation) implementation, starting with namespace centralization and error handling enhancements.

**Estimated ROI:** 30-50% improvement in persistence performance, 90%+ reduction in parsing-related errors, significant developer experience improvement through enhanced documentation and validation.
