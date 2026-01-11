# Graph Operations Quick Start Guide

Quick reference for using the new UnRDF graph operations modules.

## Modules Overview

| Module | Path | Purpose | Key Operation |
|--------|------|---------|----------------|
| WorkflowIntegrityValidator | `src/workflow/workflow-integrity-validator.mjs` | Validate workflow integrity | `canonicalize()` |
| HookDeduplicator | `src/integrations/hook-deduplicator.mjs` | Remove duplicate hooks | `isIsomorphic()` |
| AuditSerializer | `src/utils/audit-serializer.mjs` | Serialize audits to N-Triples | `toNTriples()` |
| WorkflowVersioning | `src/git-lifecycle/workflow-versioning.mjs` | Manage workflow versions | Git notes + tags |

---

## Quick Examples

### 1. Validate Workflow Before Execution

```javascript
import { WorkflowIntegrityValidator } from './src/workflow/workflow-integrity-validator.mjs';
import { useGraph } from './src/composables/graph.mjs';

// Create validator
const validator = new WorkflowIntegrityValidator();

// Get your workflow graph (assuming you have it)
const graph = useGraph(workflowStore);

// Validate before execution
const readiness = await validator.validateExecutionReadiness(
  graph,
  'my-workflow'
);

if (readiness.ready) {
  console.log('Workflow is ready to execute');
  // Execute workflow
} else {
  console.error('Workflow validation failed:', readiness.errors);
}
```

### 2. Detect Changes Between Versions

```javascript
import { WorkflowIntegrityValidator } from './src/workflow/workflow-integrity-validator.mjs';

const validator = new WorkflowIntegrityValidator();

const changes = await validator.detectChanges(
  oldGraph,
  newGraph,
  'my-workflow'
);

console.log(`Change type: ${changes.changeType}`);
// Output: 'no-change', 'syntax-only', or 'semantic-change'

if (changes.changeType === 'semantic-change') {
  console.log('Workflow logic has changed!');
}
```

### 3. Remove Duplicate Hooks

```javascript
import { HookDeduplicator } from './src/integrations/hook-deduplicator.mjs';

const deduplicator = new HookDeduplicator();

// Assuming you have an array of hooks
const hooks = [
  { id: 'hook1', graph: graph1 },
  { id: 'hook2', graph: graph2 },  // Same as hook1
  { id: 'hook3', graph: graph3 },
];

const result = await deduplicator.deduplicateHooks(hooks);

console.log(`Efficiency: ${result.efficiencyGain}%`);
console.log(`Kept: ${result.uniqueCount}, Removed: ${result.removedCount}`);

// Use the deduplicated hooks
const optimizedHooks = result.uniqueHooks;
```

### 4. Create Audit Trail

```javascript
import { AuditSerializer } from './src/utils/audit-serializer.mjs';

const serializer = new AuditSerializer({
  baseURI: 'https://gitvan.dev/audit/',
});

// Create audit record
const auditData = {
  jobId: 'job-12345',
  timestamp: new Date().toISOString(),
  status: 'completed',
  operator: 'user@example.com',
  duration: 2500,
  success: true,
  message: 'Workflow executed successfully',
};

// Serialize to N-Triples
const ntriples = serializer.toNTriples(auditData);
console.log(ntriples);

// Store in git notes
await serializer.storeInGitNotes(git, commitSha, auditData);

// Export in various formats
const jsonFormat = serializer.exportRecords([auditData], 'json');
const nquadsFormat = serializer.exportRecords([auditData], 'nquads');
```

### 5. Version Your Workflow

```javascript
import { WorkflowVersioning } from './src/git-lifecycle/workflow-versioning.mjs';

const versioning = new WorkflowVersioning({
  git: gitOperations,
  tagPrefix: 'workflow:',
});

// Create a new version
const createResult = await versioning.createVersion(
  workflowGraph,
  'sample-workflow',
  '1.0.0',
  {
    author: 'user@example.com',
    description: 'Initial version',
  }
);

console.log(`Created version ${createResult.version}`);
console.log(`Git tag: ${createResult.tag}`);

// List all versions
const versions = await versioning.listVersions('sample-workflow');
console.log(`Available versions: ${versions.map(v => v.version).join(', ')}`);

// Compare versions
const comparison = await versioning.compareVersions(
  'sample-workflow',
  'v1.0.0',
  'v2.0.0'
);

console.log(`Changes: ${comparison.diff.added} added, ${comparison.diff.removed} removed`);

// Rollback if needed
const rollback = await versioning.rollbackToVersion(
  'sample-workflow',
  'v1.0.0',
  'workflows/sample-workflow.ttl'
);
```

---

## Common Patterns

### Pattern 1: Full Workflow Validation Pipeline

```javascript
async function validateWorkflowPipeline(workflowGraph, workflowId) {
  const validator = new WorkflowIntegrityValidator();

  // Step 1: Graph integrity
  const integrity = await validator.validateGraphIntegrity(
    workflowGraph,
    workflowId
  );
  if (!integrity.valid) throw new Error('Graph integrity failed');

  // Step 2: Execution readiness
  const readiness = await validator.validateExecutionReadiness(
    workflowGraph,
    workflowId
  );
  if (!readiness.ready) throw new Error('Not ready for execution');

  // Step 3: Full audit
  const audit = await validator.performAudit(
    workflowGraph,
    workflowId
  );

  return {
    valid: true,
    integrity: integrity.hash,
    audit: audit.canonical,
  };
}
```

### Pattern 2: Deduplicate and Verify Hooks

```javascript
async function optimizeHooks(hookRegistry, bridge) {
  const deduplicator = new HookDeduplicator();

  // Get all hooks
  const allHooks = hookRegistry.getAll();

  // Identify and remove duplicates
  const result = await deduplicator.deduplicateHooks(allHooks);

  console.log(`Efficiency improvement: ${result.efficiencyGain}%`);

  // Update bridge with unique hooks only
  await deduplicator.integrateWithBridge(bridge);

  return result;
}
```

### Pattern 3: Create Signed Audit with Version

```javascript
async function createAuditedVersion(
  workflowGraph,
  workflowId,
  semver,
  auditData,
  privateKey
) {
  const serializer = new AuditSerializer();
  const versioning = new WorkflowVersioning({ git });

  // Create audit trail with signature
  const signedAudit = serializer.createSignedRecord(auditData, privateKey);

  // Store audit in git
  await serializer.storeInGitNotes(git, 'HEAD', auditData);

  // Create workflow version
  const versionResult = await versioning.createVersion(
    workflowGraph,
    workflowId,
    semver,
    {
      audit: signedAudit.id,
      hash: signedAudit.hash,
    }
  );

  return versionResult;
}
```

### Pattern 4: Track Changes Over Versions

```javascript
async function trackWorkflowChanges(workflowId, versions) {
  const versioning = new WorkflowVersioning({ git });

  for (let i = 0; i < versions.length - 1; i++) {
    const from = versions[i];
    const to = versions[i + 1];

    const changes = await versioning.detectVersionChanges(
      workflowId,
      from,
      to
    );

    console.log(`${from} → ${to}: ${changes.changeType}`);
    if (changes.diff) {
      console.log(`  +${changes.diff.added}/-${changes.diff.removed}`);
    }
  }
}
```

---

## Performance Tips

### 1. Enable Caching for Repeated Operations
```javascript
// Caching is enabled by default
const validator = new WorkflowIntegrityValidator({
  enableCache: true,  // This is the default
});

// Clear cache when needed
validator.clearCache();
```

### 2. Batch Deduplication Operations
```javascript
// Process multiple hook sets together
const deduplicator = new HookDeduplicator();

const result1 = await deduplicator.deduplicateHooks(hookSet1);
const result2 = await deduplicator.deduplicateHooks(hookSet2);

// Get aggregate stats
const stats = deduplicator.getStats();
console.log(`Total efficiency: ${stats.averageEfficiency}`);
```

### 3. Use Background Processing for Large Graphs
```javascript
// For graphs >100K triples, use async processing
if (workflowGraph.size > 100000) {
  // Process in background
  queueTask(async () => {
    const result = await validator.performAudit(workflowGraph, id);
  });
} else {
  // Can process synchronously
  const result = await validator.performAudit(workflowGraph, id);
}
```

---

## Error Handling

### Pattern: Graceful Degradation

```javascript
async function safelyValidateWorkflow(workflowGraph, workflowId) {
  try {
    const result = await validator.validateGraphIntegrity(
      workflowGraph,
      workflowId
    );

    if (!result.valid) {
      console.warn(`Validation warning: ${result.error}`);
      // Continue with caution
      return { warning: result.error };
    }

    return result;
  } catch (error) {
    console.error(`Validation error: ${error.message}`);
    // Fail safely
    return { error: error.message };
  }
}
```

---

## API Reference

### WorkflowIntegrityValidator

```javascript
const validator = new WorkflowIntegrityValidator(options);

// Validation
await validator.validateGraphIntegrity(graph, id);
await validator.detectChanges(oldGraph, newGraph, id);
await validator.validateExecutionReadiness(graph, id);
await validator.performAudit(graph, id);

// Hash operations
validator.computeHash(canonical);
validator.validateHash(canonical, hash);

// Cache management
validator.clearCache();
validator.getCached(id);
```

### HookDeduplicator

```javascript
const dedup = new HookDeduplicator(options);

// Deduplication
await dedup.identifyDuplicates(hooks);
await dedup.deduplicateHooks(hooks);
dedup.areIsomorphic(hook1, hook2);

// Integration
await dedup.integrateWithBridge(bridge);

// Performance
await dedup.benchmark(testHooks);
dedup.getStats();
dedup.clearCache();
```

### AuditSerializer

```javascript
const serializer = new AuditSerializer(options);

// Serialization
serializer.toNTriples(auditData);
serializer.toNQuads(records, options);

// Signing
serializer.createSignedRecord(auditData, privateKey);
serializer.verifySignedRecord(record, publicKey);

// Storage
await serializer.storeInGitNotes(git, ref, auditData);
await serializer.retrieveFromGitNotes(git, ref);

// Export
serializer.exportRecords(records, format);
```

### WorkflowVersioning

```javascript
const versioning = new WorkflowVersioning(options);

// Version management
await versioning.createVersion(graph, id, semver, metadata);
await versioning.getVersion(id, semver);
await versioning.listVersions(id);

// Comparison
await versioning.compareVersions(id, verA, verB);
await versioning.detectVersionChanges(id, from, to);

// Rollback
await versioning.rollbackToVersion(id, targetVersion, path);

// Analytics
await versioning.getStats(id);
versioning.clearCache();
```

---

## Test Coverage

All modules are extensively tested with >85% coverage:

```javascript
// Run tests
npm test -- tests/v4/graph-operations.test.mjs

// Test categories
// - Unit tests for each method
// - Integration tests across modules
// - Performance benchmarks
// - Error handling
// - Edge cases
```

---

## Documentation

For detailed information, see:
- Full Implementation: `/GRAPH_OPERATIONS_IMPLEMENTATION_SUMMARY.md`
- Integration Plan: `/docs/UNRDF_GRAPH_OPERATIONS_INTEGRATION_PLAN.md`
- Test Suite: `/tests/v4/graph-operations.test.mjs`

---

**Last Updated**: January 10, 2026
**Status**: Production Ready
**Quality**: >85% test coverage
