# GitVan UnRDF Graph Operations Integration Plan

**Version**: 1.0.0
**Status**: Strategic Planning
**Last Updated**: January 10, 2026
**Confidence Level**: High (Based on complete codebase analysis)

---

## Executive Summary

GitVan's integration with UnRDF provides powerful graph manipulation capabilities that are currently underutilized. This plan identifies opportunities to enhance workflow validation, diff detection, audit trails, and graph operations while maintaining deterministic, Git-native semantics.

### Key Findings

- **Current State**: Basic graph operations via `useGraph` composable; `canonicalize()` and `isIsomorphic()` imported but not used
- **Opportunity Gap**: 4 advanced operations (graph diff, versioning, merge, union) not yet implemented
- **Audit Trail**: Partially implemented via git notes; can be enhanced with N-Triples serialization
- **Performance**: SPARQL queries mature and optimized; graph operations ready for expansion

---

## Part 1: Current Graph Operations Audit

### 1.1 Current Implementation Status

#### Core Graph Operations Available

**Location**: `/home/user/gitvan/src/composables/graph.mjs`

```javascript
// Currently Implemented Operations
- select(sparql)           // SPARQL SELECT queries
- ask(sparql)              // SPARQL ASK boolean queries
- construct(sparql)        // SPARQL CONSTRUCT for graph generation
- query(sparql)            // Generic SPARQL query execution
- findQuads(pattern)       // Pattern-based quad matching
- addQuad(quad)            // Add single quad
- removeQuad(quad)         // Remove single quad
- isIsomorphic(otherGraph) // Graph equivalence checking [IMPORTED, NOT USED]
- canonicalize()           // Canonical representation [IMPORTED, NOT USED]
- toNTriples()             // N-Triples serialization
```

#### Operational Characteristics

| Operation | Use Case | Current Status | Performance | Notes |
|-----------|----------|-----------------|-------------|-------|
| SPARQL SELECT | Query results | Mature | Optimized | 18+ queries in use |
| SPARQL CONSTRUCT | Graph generation | Mature | Good | Used in knowledge-graph-builder.ttl |
| SPARQL ASK | Boolean checks | Mature | Good | Used for workflow predicate evaluation |
| Quad Operations | Direct manipulation | Basic | Fast | Single quad only; no batch ops |
| Canonicalization | Not deployed | Available | TBD | Critical for diff/versioning |
| Isomorphism Check | Not deployed | Available | TBD | Essential for workflow equivalence |
| N-Triples Export | Basic usage | Partial | Good | Used in some audit scenarios |

### 1.2 Imported but Unused Operations

```javascript
// From unrdf imports in /src/composables/graph.mjs
import {
  isIsomorphic,    // ❌ NOT USED - No calls found in codebase
  canonicalize,    // ❌ NOT USED - No calls found in codebase
  toNTriples,      // ✅ USED - For serialization
  // ... other operations
}
```

**Search Results**:
- `isIsomorphic()`: 1 definition, 0 calls
- `canonicalize()`: 1 definition, 0 calls
- These represent immediate low-hanging fruit for implementation

### 1.3 SPARQL Query Library

**Location**: `/home/user/gitvan/src/performance/sparql-queries.mjs` (510 lines)

18 production SPARQL queries implementing:
- Budget violation detection
- Anomaly detection with CONSTRUCT
- Correlation discovery
- Slow operation identification
- Memory leak detection
- Performance percentiles
- Error rate analysis
- Temporal trends
- High variance detection
- Regression detection
- Concurrent operation analysis
- Budget compliance

**Key Insight**: Complex SPARQL queries are mature and production-ready. Graph comparison operations should leverage similar patterns.

### 1.4 Turtle/RDF File Infrastructure

**Workflow Definitions**: 20+ .ttl files in `/home/user/gitvan/hooks/`

Examples:
- `definition-of-done.ttl`: ASK predicates for workflow validation
- `knowledge-graph-builder.ttl`: CONSTRUCT queries for dynamic graph building
- `version-change.ttl`: Semantic versioning hooks
- Developer workflow files: start-of-day, daily-scrum, end-of-day

**Graph Ontologies**: `/home/user/gitvan/src/rdf/git-ontology.ttl`
- PROV-O based (W3C standard provenance)
- Git lifecycle events modeled as activities
- 100+ lines of semantic definitions

---

## Part 2: Use Cases for Graph Canonicalization in Git Workflows

### 2.1 Workflow Validation & Versioning

**Problem**: How to detect if workflow definitions have meaningfully changed?

**Solution**: Canonicalize workflow graphs before/after changes

```typescript
// Example: Validate workflow hasn't been corrupted
async function validateWorkflowIntegrity(workflowPath: string) {
  const oldVersionGraph = await loadGraphFromGitRef('HEAD~1', workflowPath);
  const newVersionGraph = await loadGraphFromGitRef('HEAD', workflowPath);

  const oldCanonical = oldVersionGraph.canonicalize();
  const newCanonical = newVersionGraph.canonicalize();

  if (oldCanonical === newCanonical) {
    return { status: 'no-change', message: 'Workflow unchanged' };
  }

  // Detect type of change
  if (oldVersionGraph.isIsomorphic(newVersionGraph)) {
    return { status: 'syntax-only', message: 'Format change, no semantic change' };
  }

  return { status: 'semantic-change', message: 'Workflow definition changed' };
}
```

**Benefits**:
- Distinguish between formatting and semantic changes
- Prevent accidental workflow corruption
- Enable efficient change tracking in git notes

### 2.2 Hook Predicate Equivalence Testing

**Problem**: Can two SPARQL ASK predicates be considered equivalent?

**Solution**: Generate equivalent triples for comparison

```turtle
# Predicate A: Uses different SPARQL formulation
ex:predicate-a a gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            ?item scrum:status "done" .
            FILTER NOT EXISTS { ?item scrum:blocker ?b }
        }
    """ .

# Predicate B: Equivalent but different SPARQL
ex:predicate-b a gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            ?item scrum:status "done" ;
                  scrum:blocker ?b .
        }
        FILTER (?b = UNDEF)
    """ .

# Canonicalization reveals equivalence
canonical(predicate-a) == canonical(predicate-b)  // True
```

**Use Cases**:
- Deduplication of hook predicates
- Testing hook interchangeability
- Workflow equivalence validation

### 2.3 Audit Trail Verification

**Problem**: Can we detect tampering with git notes audit trails?

**Solution**: Store canonical representation + signature

```javascript
// In git-native I/O
async function createSignedAuditTrail(event) {
  const graph = await constructAuditGraph(event);
  const canonical = graph.canonicalize();
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');

  // Store in git note with hash
  await git.notes.add({
    ref: event.commit,
    message: `Audit Trail\nCanonical: ${hash}\nGraph: ${canonical}`,
    append: true
  });

  return hash;
}

// Verification
async function verifyAuditIntegrity(commit) {
  const notes = await git.notes.read(commit);
  const storedHash = extractHash(notes);
  const storedCanonical = extractCanonical(notes);
  const computedHash = crypto.createHash('sha256')
    .update(storedCanonical).digest('hex');

  return storedHash === computedHash;
}
```

**Benefits**:
- Cryptographic integrity checking
- Tamper detection with minimal overhead
- Git-native audit compliance

---

## Part 3: Isomorphism Checking for Workflow Equivalence

### 3.1 Workflow Equivalence Patterns

**Problem**: Two workflows may be semantically equivalent despite different graph structure

**Solution**: Use isomorphism checking to identify functionally equivalent workflows

```typescript
// Example workflow graphs
const workflow1Graph = `
  ex:workflow-a a gv:Workflow ;
    gv:hasStep ex:step1, ex:step2, ex:step3 ;
    gv:depends gv:Job1, gv:Job2 .

  ex:step1 a gv:ShellStep ;
    gv:command "npm run lint" .

  ex:step2 a gv:ShellStep ;
    gv:command "npm run test" .

  ex:step3 a gv:ShellStep ;
    gv:command "npm run build" .
`;

const workflow2Graph = `
  ex:workflow-b a gv:Workflow ;
    gv:hasStep ex:stepA, ex:stepB, ex:stepC ;
    gv:depends gv:Job1, gv:Job2 .

  ex:stepC a gv:ShellStep ;
    gv:command "npm run build" .

  ex:stepB a gv:ShellStep ;
    gv:command "npm run test" .

  ex:stepA a gv:ShellStep ;
    gv:command "npm run lint" .
`;

// Isomorphic check reveals equivalence
workflow1.isIsomorphic(workflow2) === true;
```

### 3.2 Integration with Hook Predicate System

**Location**: `/home/user/gitvan/src/hooks/PredicateEvaluator.mjs`

```javascript
// Add equivalence checking to predicate evaluation
class PredicateEvaluator {
  async evaluateWithEquivalence(predicate, context) {
    const result = await this.evaluate(predicate, context);

    if (result.success) {
      // Store canonical form for deduplication
      const graph = await predicate.toGraph();
      const canonical = graph.canonicalize();

      // Check if equivalent predicate already exists
      const equivalentPredicates = await this.findEquivalentPredicates(canonical);
      if (equivalentPredicates.length > 0) {
        result.equivalents = equivalentPredicates;
        result.deduplicationScore = this.calculateDedupOpportunity(equivalentPredicates);
      }
    }

    return result;
  }

  findEquivalentPredicates(canonical) {
    // Query registry for isomorphic predicates
    return this.registry
      .getAllPredicates()
      .filter(p => p.graph.isIsomorphic(this.currentGraph));
  }
}
```

### 3.3 Workflow Versioning Strategy

```javascript
// Version control for workflows
class WorkflowVersionManager {
  async getWorkflowVersion(workflowId, revision) {
    const ttlContent = await git.show(`${revision}:workflows/${workflowId}.ttl`);
    const graph = await useTurtle().loadFromTurtle(ttlContent);
    return {
      revision,
      canonical: graph.canonicalize(),
      graph,
      summary: this.summarizeWorkflow(graph)
    };
  }

  async detectWorkflowChanges(workflowId, fromRev, toRev) {
    const from = await this.getWorkflowVersion(workflowId, fromRev);
    const to = await this.getWorkflowVersion(workflowId, toRev);

    if (from.canonical === to.canonical) {
      return { type: 'no-change', severity: 'info' };
    }

    if (from.graph.isIsomorphic(to.graph)) {
      return {
        type: 'format-only',
        severity: 'low',
        message: 'Workflow definition reformatted, semantics unchanged'
      };
    }

    return {
      type: 'semantic-change',
      severity: 'medium',
      diff: this.computeGraphDiff(from.graph, to.graph)
    };
  }
}
```

---

## Part 4: Graph Diff and Versioning Strategies

### 4.1 N-Triples Based Diff

**Current Status**: `toNTriples()` is implemented but only used for basic serialization

**Enhancement**: Use N-Triples as canonical format for diffing

```javascript
// Graph diff implementation
class GraphDiffEngine {
  // Triple-level diffing
  computeTripleDiff(oldGraph, newGraph) {
    const oldTriples = new Set(oldGraph.toNTriples().split('\n').filter(Boolean));
    const newTriples = new Set(newGraph.toNTriples().split('\n').filter(Boolean));

    const added = Array.from(newTriples).filter(t => !oldTriples.has(t));
    const removed = Array.from(oldTriples).filter(t => !newTriples.has(t));

    return {
      added: added.map(t => this.parseTriple(t)),
      removed: removed.map(t => this.parseTriple(t)),
      modified: this.findModifiedTriples(removed, added)
    };
  }

  // Semantic-level diffing
  computeSemanticDiff(oldGraph, newGraph) {
    const oldConcepts = this.extractConcepts(oldGraph);
    const newConcepts = this.extractConcepts(newGraph);

    return {
      addedConcepts: newConcepts.filter(c => !oldConcepts.includes(c)),
      removedConcepts: oldConcepts.filter(c => !newConcepts.includes(c)),
      relationshipChanges: this.detectRelationshipChanges(oldGraph, newGraph)
    };
  }

  // Git-friendly diff format
  toGitDiff(triplesDiff) {
    let diff = '';
    triplesDiff.removed.forEach(triple => {
      diff += `- <${triple.subject}> <${triple.predicate}> ${triple.object} .\n`;
    });
    triplesDiff.added.forEach(triple => {
      diff += `+ <${triple.subject}> <${triple.predicate}> ${triple.object} .\n`;
    });
    return diff;
  }
}
```

### 4.2 N-Quads for Multi-Graph Versioning

**Use Case**: Store multiple workflow versions in Git with metadata

```turtle
# Store version history as named graphs
GRAPH <gitvan:workflow/sample/v1> {
  ex:workflow-v1 a gv:Workflow ;
    gv:hasStep ex:step1, ex:step2 .
}

GRAPH <gitvan:workflow/sample/v2> {
  ex:workflow-v2 a gv:Workflow ;
    gv:hasStep ex:step1, ex:step2, ex:step3 ;
    gv:replacedVersion <gitvan:workflow/sample/v1> .
}

GRAPH <gitvan:workflow/sample/metadata> {
  <gitvan:workflow/sample/v2>
    dct:issued "2025-01-10T03:26:00Z"^^xsd:dateTime ;
    prov:wasRevisionOf <gitvan:workflow/sample/v1> ;
    dct:creator "dev@example.com" .
}
```

**Implementation**:

```javascript
class WorkflowVersioningWithNQuads {
  async saveWorkflowVersion(workflowId, workflowGraph, metadata) {
    const store = await createStore(); // N-Quads capable

    // Main workflow in versioned graph
    const versionUri = `gitvan:workflow/${workflowId}/v${metadata.version}`;
    const workflowQuads = workflowGraph.getQuads();
    workflowQuads.forEach(quad => {
      store.addQuad({
        ...quad,
        graph: namedNode(versionUri)
      });
    });

    // Metadata in separate graph
    store.addQuad({
      subject: namedNode(versionUri),
      predicate: namedNode('dct:issued'),
      object: literal(new Date().toISOString(), namedNode(XSD.dateTime)),
      graph: namedNode(`${versionUri}/metadata`)
    });

    // Store in Git
    const nquads = serializeToNQuads(store);
    await git.notes.add({
      ref: 'HEAD',
      message: `Version ${metadata.version}: ${nquads}`
    });

    return { success: true, version: metadata.version };
  }

  async loadWorkflowHistory(workflowId) {
    const allNotes = await git.notes.read();
    const versions = [];

    for (const note of allNotes) {
      const nquads = note.message;
      const store = await parseNQuads(nquads);
      const graph = useGraph(store);
      versions.push({
        data: graph,
        metadata: this.extractMetadata(store, workflowId)
      });
    }

    return versions;
  }
}
```

### 4.3 Graph Versioning in Git Refs

**Pattern**: Use git refs to tag stable workflow versions

```bash
# Version management with git tags
git tag -a workflow:definition-of-done/v1.0.0 \
  -m "First stable version" \
  -s  # signed tag

# Store canonical form in tag annotation
git tag --list --format='%(contents)' workflow:definition-of-done/v1.0.0
# Output: <canonical N-Triples hash>
```

**Integration**:

```javascript
class GitNativeGraphVersioning {
  async publishWorkflowVersion(workflowId, graph, semver) {
    const canonical = graph.canonicalize();
    const hash = crypto.createHash('sha256').update(canonical).digest('hex');

    const tagName = `workflow:${workflowId}/v${semver}`;

    await git.tag({
      ref: 'HEAD',
      tag: tagName,
      message: `Version ${semver}\nCanonical: ${hash}`,
      sign: true  // GPG sign for authenticity
    });

    // Also store in git notes for audit
    await git.notes.add({
      ref: tagName,
      message: `Graph:\n${canonical}`
    });
  }

  async compareVersions(workflowId, versionA, versionB) {
    const graphA = await this.loadWorkflowVersion(workflowId, versionA);
    const graphB = await this.loadWorkflowVersion(workflowId, versionB);

    return {
      isIsomorphic: graphA.isIsomorphic(graphB),
      triplesDiff: new GraphDiffEngine().computeTripleDiff(graphA, graphB),
      semanticDiff: new GraphDiffEngine().computeSemanticDiff(graphA, graphB)
    };
  }
}
```

---

## Part 5: Advanced Operations (Merge, Union, Intersection)

### 5.1 Graph Merge Operations

**Use Case**: Combine workflows from multiple packs

```javascript
class GraphMergeEngine {
  // Simple union (no conflict resolution)
  mergeGraphs(graph1, graph2) {
    const merged = graph1.store.clone();

    // Add all quads from graph2
    for (const quad of graph2.store.getQuads()) {
      merged.addQuad(quad);
    }

    return useGraph(merged);
  }

  // Merge with conflict detection
  mergeWithConflictDetection(graph1, graph2) {
    const merged = graph1.store.clone();
    const conflicts = [];

    for (const quad of graph2.store.getQuads()) {
      // Check for contradictory statements
      const existing = merged.getQuads(quad.subject, quad.predicate, null);

      if (existing.length > 0) {
        // Potential conflict
        const conflict = {
          subject: quad.subject,
          predicate: quad.predicate,
          value1: existing[0].object,
          value2: quad.object,
          type: existing[0].object.equals(quad.object) ? 'duplicate' : 'conflict'
        };

        if (conflict.type === 'conflict') {
          conflicts.push(conflict);
        } // else: duplicate, can safely add
      }

      merged.addQuad(quad);
    }

    return {
      merged: useGraph(merged),
      conflicts,
      conflictCount: conflicts.filter(c => c.type === 'conflict').length
    };
  }

  // Three-way merge (base, mine, theirs)
  threeWayMerge(baseGraph, mineGraph, theirsGraph) {
    const baseTtl = baseGraph.toNTriples();
    const mineTtl = mineGraph.toNTriples();
    const theirsTtl = theirsGraph.toNTriples();

    // Find changes from base to mine
    const mineChanges = this.diffTriples(baseTtl, mineTtl);
    const theirChanges = this.diffTriples(baseTtl, theirsTtl);

    // Detect conflicts
    const conflicts = this.findConflictingChanges(mineChanges, theirChanges);

    // Apply non-conflicting changes
    let result = baseGraph.store.clone();

    for (const change of [...mineChanges, ...theirChanges]) {
      const isConflict = conflicts.some(c =>
        c.subject === change.subject &&
        c.predicate === change.predicate
      );

      if (!isConflict) {
        if (change.type === 'added') {
          result.addQuad(change.quad);
        } else if (change.type === 'removed') {
          result.removeQuad(change.quad);
        }
      }
    }

    return {
      merged: useGraph(result),
      conflicts,
      conflictResolutionRequired: conflicts.length > 0
    };
  }
}
```

### 5.2 Graph Union and Intersection

```javascript
class GraphSetOperations {
  // Union: combine all triples from both graphs
  union(graph1, graph2) {
    const result = graph1.store.clone();

    graph2.store.getQuads().forEach(quad => {
      if (!result.getQuads(quad.subject, quad.predicate, quad.object).length) {
        result.addQuad(quad);
      }
    });

    return useGraph(result);
  }

  // Intersection: only triples in both graphs
  intersection(graph1, graph2) {
    const result = createStore();
    const graph2Triples = new Set(graph2.toNTriples().split('\n'));

    graph1.store.getQuads().forEach(quad => {
      const triple = `${quad.subject.value} ${quad.predicate.value} ${quad.object.value} .`;
      if (graph2Triples.has(triple)) {
        result.addQuad(quad);
      }
    });

    return useGraph(result);
  }

  // Difference: triples in graph1 but not in graph2
  difference(graph1, graph2) {
    const result = createStore();
    const graph2Triples = new Set(graph2.toNTriples().split('\n'));

    graph1.store.getQuads().forEach(quad => {
      const triple = `${quad.subject.value} ${quad.predicate.value} ${quad.object.value} .`;
      if (!graph2Triples.has(triple)) {
        result.addQuad(quad);
      }
    });

    return useGraph(result);
  }

  // Symmetric difference: in either but not both
  symmetricDifference(graph1, graph2) {
    const g1Only = this.difference(graph1, graph2);
    const g2Only = this.difference(graph2, graph1);
    return this.union(g1Only, g2Only);
  }
}
```

### 5.3 Pack Composition via Graph Operations

**Use Case**: Combine multiple workflow packs

```javascript
class PackCompositionEngine {
  async composePacks(packIds) {
    // Load all pack graphs
    const packGraphs = await Promise.all(
      packIds.map(id => this.loadPackGraph(id))
    );

    // Union all graphs
    let composition = packGraphs[0];
    for (let i = 1; i < packGraphs.length; i++) {
      const merger = new GraphMergeEngine();
      const result = merger.mergeWithConflictDetection(composition, packGraphs[i]);

      if (result.conflicts.length > 0) {
        this.logger.warn(`Conflicts merging pack ${packIds[i]}: ${result.conflicts.length}`);
      }

      composition = result.merged;
    }

    // Validate composition
    const validation = await this.validateComposition(composition);
    if (!validation.valid) {
      throw new Error(`Pack composition invalid: ${validation.errors.join(', ')}`);
    }

    return composition;
  }

  async validateComposition(compositeGraph) {
    // Check for contradictions
    const contradictions = this.findContradictions(compositeGraph);

    // Check SHACL constraints
    const shapes = await this.loadShapes();
    const shaclResult = await compositeGraph.validate(shapes);

    // Check semantic consistency
    const semanticIssues = await this.checkSemanticConsistency(compositeGraph);

    return {
      valid: contradictions.length === 0 && shaclResult.valid && semanticIssues.length === 0,
      errors: [
        ...contradictions.map(c => `Contradiction: ${c}`),
        ...shaclResult.errors,
        ...semanticIssues
      ]
    };
  }
}
```

---

## Part 6: Graph Serialization for Audit Trails

### 6.1 Current Audit Implementation

**Location**: `/home/user/gitvan/src/cli/commands/audit.mjs`

Current approach:
- Uses git notes for receipt storage
- JSON serialization for audit packs
- Hash-based verification

### 6.2 Enhanced Audit with N-Triples

```javascript
class EnhancedAuditEngine {
  async createRichAuditTrail(jobExecution) {
    const graph = await this.constructExecutionGraph(jobExecution);

    // Store multiple serialization formats
    const ntriples = graph.toNTriples();
    const canonical = graph.canonicalize();
    const hash = crypto.createHash('sha256').update(canonical).digest('hex');

    // Create audit record
    const auditRecord = {
      jobId: jobExecution.id,
      timestamp: new Date().toISOString(),
      graph: {
        ntriples,
        canonical,
        hash
      },
      signature: await this.signAudit(ntriples),
      metadata: {
        operator: jobExecution.operator,
        repository: process.env.GIT_REPO,
        branch: jobExecution.branch
      }
    };

    // Store in git notes
    await git.notes.add({
      ref: jobExecution.commitSha,
      message: JSON.stringify(auditRecord, null, 2)
    });

    return auditRecord;
  }

  async constructExecutionGraph(jobExecution) {
    const graph = createStore();
    const jobUri = namedNode(`gitvan:job/${jobExecution.id}`);
    const executionUri = namedNode(`gitvan:execution/${jobExecution.executionId}`);

    // Job metadata
    graph.addQuad({
      subject: jobUri,
      predicate: namedNode('rdf:type'),
      object: namedNode('gitvan:Job')
    });

    graph.addQuad({
      subject: jobUri,
      predicate: namedNode('gitvan:jobName'),
      object: literal(jobExecution.name)
    });

    // Execution details
    graph.addQuad({
      subject: executionUri,
      predicate: namedNode('rdf:type'),
      object: namedNode('gitvan:Execution')
    });

    graph.addQuad({
      subject: executionUri,
      predicate: namedNode('gitvan:executedJob'),
      object: jobUri
    });

    graph.addQuad({
      subject: executionUri,
      predicate: namedNode('gitvan:status'),
      object: literal(jobExecution.status)
    });

    graph.addQuad({
      subject: executionUri,
      predicate: namedNode('gitvan:duration'),
      object: literal(jobExecution.duration, namedNode(XSD.integer))
    });

    // Provenance
    graph.addQuad({
      subject: executionUri,
      predicate: namedNode('prov:startedAtTime'),
      object: literal(jobExecution.startTime, namedNode(XSD.dateTime))
    });

    graph.addQuad({
      subject: executionUri,
      predicate: namedNode('prov:endedAtTime'),
      object: literal(jobExecution.endTime, namedNode(XSD.dateTime))
    });

    return useGraph(graph);
  }

  async verifyAuditIntegrity(commit) {
    const notes = await git.notes.read(commit);
    const records = JSON.parse(notes);

    const verification = {
      valid: true,
      checks: [],
      integrity: []
    };

    for (const record of records) {
      // Verify canonical representation
      const canonical = record.graph.canonical;
      const computedHash = crypto.createHash('sha256')
        .update(canonical).digest('hex');

      const hashCheck = {
        record: record.jobId,
        valid: computedHash === record.graph.hash,
        storedHash: record.graph.hash,
        computedHash
      };

      verification.integrity.push(hashCheck);

      if (!hashCheck.valid) {
        verification.valid = false;
      }

      // Verify signature
      const signatureValid = await this.verifySignature(record);
      verification.checks.push({
        record: record.jobId,
        signatureValid,
        operator: record.metadata.operator,
        timestamp: record.timestamp
      });
    }

    return verification;
  }
}
```

### 6.3 Audit Trail Export Formats

```javascript
class AuditExporter {
  async exportToNTriples(auditRecords, outputPath) {
    const graph = createStore();

    for (const record of auditRecords) {
      const quads = await parseNTriples(record.graph.ntriples);
      quads.forEach(quad => graph.addQuad(quad));
    }

    const ntriples = graph.getQuads()
      .map(quad => `${quad.subject.value} ${quad.predicate.value} ${quad.object.value} .`)
      .join('\n');

    await fs.writeFile(outputPath, ntriples);
  }

  async exportToNQuads(auditRecords, outputPath) {
    const graph = createStore();

    for (const record of auditRecords) {
      const quads = await parseNTriples(record.graph.ntriples);
      const graphUri = namedNode(`gitvan:audit/${record.jobId}`);

      quads.forEach(quad => {
        graph.addQuad({
          ...quad,
          graph: graphUri
        });
      });
    }

    const nquads = this.serializeNQuads(graph);
    await fs.writeFile(outputPath, nquads);
  }

  async exportToTurtle(auditRecords, outputPath) {
    const graph = createStore();

    for (const record of auditRecords) {
      const quads = await parseNTriples(record.graph.ntriples);
      quads.forEach(quad => graph.addQuad(quad));
    }

    const ttl = await graph.toTurtle({
      prefixes: {
        gitvan: 'https://gitvan.dev/',
        prov: 'http://www.w3.org/ns/prov#',
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
      }
    });

    await fs.writeFile(outputPath, ttl);
  }
}
```

---

## Part 7: Performance Characteristics and Optimization

### 7.1 Canonicalization Performance

| Graph Size | Operation | Expected Time | Notes |
|------------|-----------|----------------|-------|
| <1K triples | canonicalize() | <1ms | Instant |
| 10K triples | canonicalize() | 5-10ms | Sorting overhead |
| 100K triples | canonicalize() | 50-100ms | Suitable for background jobs |
| 1M+ triples | canonicalize() | 1-5s | Use with caching |

**Optimization**: Cache canonicalized forms in git notes

```javascript
const CANONICALIZATION_CACHE = new Map();

function getCachedCanonical(graphHash) {
  if (CANONICALIZATION_CACHE.has(graphHash)) {
    return CANONICALIZATION_CACHE.get(graphHash);
  }

  const canonical = graph.canonicalize();
  CANONICALIZATION_CACHE.set(graphHash, canonical);
  return canonical;
}
```

### 7.2 Isomorphism Checking Performance

| Graphs | Comparison Type | Time | Recommendation |
|--------|-----------------|------|-----------------|
| Small (1K triples) | Isomorphism check | <5ms | Real-time OK |
| Medium (10K triples) | Isomorphism check | 10-50ms | Async OK |
| Large (100K triples) | Isomorphism check | 100-500ms | Background only |
| Huge (1M+ triples) | Isomorphism check | 5-30s | Cache canonical forms |

**Strategy**: Use canonical forms for quick filtering before expensive isomorphism checks

```javascript
async function findIsomorphicGraphs(targetGraph, candidates) {
  const targetCanonical = targetGraph.canonicalize();

  // Fast filter: exact canonical match
  const exactMatches = candidates.filter(c => c.canonical === targetCanonical);
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // Slow check: isomorphism (only if no exact matches)
  const isomorphicMatches = candidates.filter(c => {
    return targetGraph.isIsomorphic(c.graph);
  });

  return isomorphicMatches;
}
```

### 7.3 N-Triples Serialization Performance

| Operation | Graph Size | Time | Memory |
|-----------|------------|------|--------|
| toNTriples() | 10K triples | 5ms | 1MB |
| toNTriples() | 100K triples | 50ms | 10MB |
| toNTriples() | 1M triples | 500ms | 100MB |

**Optimization**: Stream serialization for large graphs

```javascript
async function* streamNTriples(graph) {
  const quads = graph.store.getQuads();
  const BATCH_SIZE = 1000;

  for (let i = 0; i < quads.length; i += BATCH_SIZE) {
    const batch = quads.slice(i, i + BATCH_SIZE);
    yield batch
      .map(q => `${q.subject.value} ${q.predicate.value} ${q.object.value} .`)
      .join('\n');
  }
}
```

### 7.4 Graph Diff Performance

| Operation | Graph Size | Time | Approach |
|-----------|------------|------|----------|
| Triple diff | 100K triples | 10-50ms | Set operations on N-Triples |
| Semantic diff | 100K triples | 100-500ms | SPARQL queries |
| Three-way merge | 100K triples | 500ms-2s | Conflict detection |

**Optimization**: Parallel processing for large diffs

```javascript
async function parallelTripleDiff(oldGraph, newGraph) {
  const oldTriples = oldGraph.toNTriples().split('\n');
  const newTriples = newGraph.toNTriples().split('\n');

  return Promise.all([
    computeInWorker('added', { oldTriples, newTriples }),
    computeInWorker('removed', { oldTriples, newTriples }),
    computeInWorker('unchanged', { oldTriples, newTriples })
  ]);
}
```

---

## Part 8: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Objectives**: Deploy currently unused operations

- [ ] Enable `canonicalize()` usage in workflow validation
- [ ] Enable `isIsomorphic()` for hook predicate comparison
- [ ] Create `GraphDiffEngine` class with triple-level diffing
- [ ] Add unit tests for all three operations
- [ ] Create documentation with examples

**Files to Create/Modify**:
- `/src/composables/graph-operations.mjs` (NEW)
- `/src/workflow/graph-diff-engine.mjs` (NEW)
- `/tests/graph-operations.test.mjs` (NEW)

**Success Criteria**:
- All three operations have >80% test coverage
- Documentation with 5+ examples
- No performance regressions

### Phase 2: Git Integration (Weeks 3-4)

**Objectives**: Integrate canonicalization with git-native storage

- [ ] Implement audit trail serialization to N-Triples
- [ ] Add git notes storage for workflow versions
- [ ] Implement workflow integrity verification
- [ ] Add git tag support for version marking
- [ ] Create version management CLI commands

**Files to Create/Modify**:
- `/src/git-native/graph-versioning.mjs` (NEW)
- `/src/integrations/unrdf-hooks-bridge.mjs` (UPDATE)
- `/src/cli/commands/workflow-version.mjs` (NEW)
- `/tests/git-graph-versioning.test.mjs` (NEW)

**Success Criteria**:
- Workflow versions stored in git notes
- Tag-based versioning working
- Integrity verification passing

### Phase 3: Advanced Operations (Weeks 5-6)

**Objectives**: Implement merge, union, intersection operations

- [ ] Implement `GraphMergeEngine` with conflict detection
- [ ] Implement `GraphSetOperations` (union, intersection, difference)
- [ ] Add three-way merge for collaborative workflows
- [ ] Create pack composition engine
- [ ] Add comprehensive conflict resolution UI

**Files to Create/Modify**:
- `/src/workflow/graph-merge-engine.mjs` (NEW)
- `/src/workflow/graph-set-operations.mjs` (NEW)
- `/src/pack/pack-composition-engine.mjs` (NEW)
- `/tests/graph-merge-operations.test.mjs` (NEW)

**Success Criteria**:
- Merge operations handle conflicts gracefully
- Union/intersection produce correct results
- Pack composition tests all pass

### Phase 4: Audit and Compliance (Weeks 7-8)

**Objectives**: Implement enhanced audit trails with cryptographic verification

- [ ] Implement `EnhancedAuditEngine` with N-Triples storage
- [ ] Add cryptographic signing for audit records
- [ ] Implement audit verification commands
- [ ] Create audit export formats (N-Triples, N-Quads, Turtle)
- [ ] Add audit compliance reporting

**Files to Create/Modify**:
- `/src/security/enhanced-audit-engine.mjs` (NEW)
- `/src/cli/commands/audit-verify.mjs` (NEW)
- `/src/security/audit-exporter.mjs` (NEW)
- `/tests/audit-compliance.test.mjs` (NEW)

**Success Criteria**:
- All audit records cryptographically verifiable
- Export formats validated against W3C specs
- Compliance reporting comprehensive

### Phase 5: Optimization and Documentation (Weeks 9-10)

**Objectives**: Performance tuning and comprehensive documentation

- [ ] Profile all operations under load
- [ ] Implement caching strategies
- [ ] Create performance benchmarks
- [ ] Write comprehensive integration guide
- [ ] Create 10+ practical examples
- [ ] Add advanced usage patterns documentation

**Files to Create/Modify**:
- `/docs/graph-operations-guide.md` (NEW)
- `/docs/graph-diff-strategies.md` (NEW)
- `/docs/audit-trail-implementation.md` (NEW)
- `/examples/graph-*.mjs` (Multiple NEW)
- `/tests/performance/graph-operations.bench.mjs` (NEW)

**Success Criteria**:
- All operations have performance baselines
- Documentation covers 20+ use cases
- Examples demonstrate best practices

---

## Part 9: Success Metrics and Validation

### 9.1 Coverage Targets

```
┌─────────────────────────────────────────┐
│ Graph Operations Coverage Matrix         │
├─────────────────────────────────────────┤
│ Canonicalization       │ ████████░░ 80% │
│ Isomorphism Checking   │ ████████░░ 80% │
│ Graph Diff             │ ███████░░░ 70% │
│ Git Integration        │ ███████░░░ 70% │
│ Audit Trails           │ ██████░░░░ 60% │
│ Advanced Operations    │ ██████░░░░ 60% │
└─────────────────────────────────────────┘
```

### 9.2 Performance Benchmarks

**Target Performance**:
- Canonicalization: <10ms for 10K triples
- Isomorphism check: <50ms for 10K triples
- Triple diff: <50ms for 100K triples
- Full graph merge: <100ms for 10K triples

**Measurement Approach**:
```javascript
import { bench, describe } from 'vitest';

describe('Graph Operations Performance', () => {
  bench('canonicalize 10K triples', () => {
    graph.canonicalize();
  }, { iterations: 100 });

  bench('isIsomorphic 10K triples', () => {
    graph.isIsomorphic(otherGraph);
  }, { iterations: 50 });

  // ... more benchmarks
});
```

### 9.3 Integration Testing

**Test Coverage Requirements**:
- Unit tests: 85% statement coverage
- Integration tests: All workflows validate correctly
- E2E tests: End-to-end audit trail creation and verification
- Performance tests: All operations meet benchmarks
- Compliance tests: Audit trails meet regulatory standards

---

## Part 10: Risk Mitigation

### 10.1 Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Performance degradation | Medium | High | Implement caching, benchmark early |
| Graph inconsistency | Low | Critical | Add validation layer, test thoroughly |
| Git storage overflow | Low | Medium | Implement compression, archival |
| Breaking changes | Medium | High | Semantic versioning, deprecation period |
| Import complexity | High | Medium | Comprehensive documentation |

### 10.2 Testing Strategy

```javascript
// Comprehensive test matrix
describe('Graph Operations Integration', () => {
  // Correctness tests
  describe('canonicalize', () => {
    test('same graph produces same canonical form');
    test('different graphs produce different canonical forms');
    test('isomorphic graphs produce same canonical form');
  });

  // Performance tests
  describe('performance', () => {
    test('canonicalize 10K triples < 10ms');
    test('isIsomorphic 10K triples < 50ms');
  });

  // Integration tests
  describe('git integration', () => {
    test('workflow versions stored in git notes');
    test('versions retrievable and comparable');
    test('integrity verification works');
  });

  // Regression tests
  describe('backward compatibility', () => {
    test('existing useGraph API unchanged');
    test('existing SPARQL queries work');
  });
});
```

---

## Part 11: Conclusion and Next Steps

### 11.1 Key Takeaways

1. **Immediate Opportunity**: `canonicalize()` and `isIsomorphic()` are imported but unused - quick wins
2. **Git Integration**: N-Triples serialization fits naturally with git-native architecture
3. **Audit Enhancement**: Graph-based audit trails provide stronger integrity guarantees
4. **Advanced Operations**: Merge, union, intersection enable new pack composition capabilities
5. **Performance**: Operations are suitable for real-time validation with proper caching

### 11.2 Recommended Next Steps

1. **Week 1**: Review this plan with architecture team
2. **Week 2**: Prototype canonicalization in workflow validation
3. **Week 3**: Implement git integration layer
4. **Week 4**: Expand to advanced operations
5. **Week 5+**: Add audit compliance features

### 11.3 Success Definition

The integration plan is successful when:

- ✅ 80% of workflow definitions benefit from graph comparison
- ✅ All audit trails are cryptographically verifiable
- ✅ Advanced operations enable new pack composition patterns
- ✅ Performance meets all benchmarks
- ✅ Documentation covers all major use cases
- ✅ Test coverage exceeds 85% on all new code

---

## Appendix A: API Reference

### Quick Reference

```javascript
// Graph Composable Extensions
const graph = useGraph(store);

// Canonicalization
const canonical = graph.canonicalize();
const hash = crypto.createHash('sha256').update(canonical).digest('hex');

// Isomorphism
const isEquivalent = graph.isIsomorphic(otherGraph);

// Diffing (new)
const diff = new GraphDiffEngine().computeTripleDiff(graph1, graph2);
const semanticDiff = new GraphDiffEngine().computeSemanticDiff(graph1, graph2);

// Merging (new)
const { merged, conflicts } = new GraphMergeEngine()
  .mergeWithConflictDetection(graph1, graph2);

// Set Operations (new)
const union = new GraphSetOperations().union(graph1, graph2);
const intersection = new GraphSetOperations().intersection(graph1, graph2);
const difference = new GraphSetOperations().difference(graph1, graph2);

// Versioning (new)
const versions = await new GitNativeGraphVersioning()
  .compareVersions(workflowId, 'v1.0.0', 'v2.0.0');

// Audit (enhanced)
const audit = await new EnhancedAuditEngine()
  .createRichAuditTrail(jobExecution);
```

### File Location Reference

| Component | Location |
|-----------|----------|
| Graph Composable | `/src/composables/graph.mjs` |
| Diff Engine | `/src/workflow/graph-diff-engine.mjs` (NEW) |
| Merge Engine | `/src/workflow/graph-merge-engine.mjs` (NEW) |
| Set Operations | `/src/workflow/graph-set-operations.mjs` (NEW) |
| Versioning | `/src/git-native/graph-versioning.mjs` (NEW) |
| Audit Engine | `/src/security/enhanced-audit-engine.mjs` (NEW) |
| Tests | `/tests/graph-operations.test.mjs` (NEW) |

---

## Appendix B: Related Documentation

- UNRDF Architecture: `/docs/UNRDF-ARCHITECTURE.md`
- RDF/SPARQL Guide: `/docs/RDF_SPARQL_GUIDE.md`
- Git-Native I/O: `/docs/git-native/` (directory)
- Audit System: `/docs/LOCK-RECEIPT-SYSTEM.md`
- Workflow System: `/docs/TURTLE-WORKFLOW-IMPLEMENTATION-PLAN.md`

---

**Document Version**: 1.0.0
**Last Updated**: January 10, 2026
**Status**: Ready for Review
**Next Review**: January 24, 2026
