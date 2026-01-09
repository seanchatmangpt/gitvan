# @unrdf/hooks + Husky + Bree Integration Architecture

## Overview

This document outlines the integration of three systems:
- **Husky**: Git hooks manager
- **@unrdf/hooks**: RDF-based hook system with validation, transformation, and audit logging
- **Bree**: Background job scheduler

## Architecture Diagram

```
Git Operation
    ↓
Husky Git Hook (pre-commit, post-commit, etc.)
    ↓
HuskyHookBridge
    ├─ Captures event via GitEventCapture
    └─ Stores event as RDF triples
    ↓
RDF Store (Git Notes)
    ↓
@unrdf/hooks Evaluation
    ├─ Evaluates predicates
    ├─ Applies transformations
    └─ Triggers matching hooks
    ↓
UnrdfHooksBridge
    ├─ Creates Bree job
    └─ Enqueues for execution
    ↓
BreeScheduler
    ├─ Processes job
    ├─ Logs to audit trail
    └─ Returns result
    ↓
Hook Output / Side Effects
```

## Component Details

### 1. HuskyHookBridge (`src/integrations/husky-hook-bridge.mjs`)

**Purpose**: Connect Husky git hooks to @unrdf/hooks system

**Key Responsibilities**:
- Initialize GitEventCapture for RDF event storage
- Receive git hook events from Husky
- Capture events as RDF triples
- Trigger hook evaluation
- Return exit codes for git operations

**Key Methods**:
```javascript
- async initialize(options)          // Set up bridge
- async captureGitEvent(hookName, data)  // Capture event
- async evaluateHooks(eventUri)      // Evaluate against stored events
- async executeHooks(eventUri)       // Execute matching hooks
```

### 2. UnrdfHooksBridge (`src/integrations/unrdf-hooks-bridge.mjs`)

**Purpose**: Connect @unrdf/hooks to Bree background job scheduler

**Key Responsibilities**:
- Convert hook definitions to Bree jobs
- Manage job scheduling
- Handle hook result/execution
- Audit logging for compliance

**Key Methods**:
```javascript
- async registerHook(hookDef)        // Register hook as job
- async executeHookJob(jobName, data)   // Execute via Bree
- async logHookExecution(result)     // Audit trail
```

### 3. Unified Composable (`src/composables/unified-hooks.mjs`)

**Purpose**: Provide a clean API for using all three systems together

**Key Methods**:
```javascript
- useUnifiedHooks()                  // Main composable
  ├─ on(gitEvent, predicate, handler)  // Register hook
  ├─ emit(gitEvent, data)            // Trigger evaluation
  ├─ getStatus()                     // Check status
  └─ cleanup()                       // Graceful shutdown
```

## Hook Definition Format

Hooks are defined in Turtle (.ttl) format with optional Bree scheduling:

```turtle
@prefix : <http://example.com/hook/> .
@prefix git: <http://example.com/git/> .
@prefix bree: <http://example.com/bree/> .

:myHook a :Hook ;
  :name "pre-commit-validation" ;
  :description "Validate files before commit" ;
  :triggerEvent git:pre-commit ;
  :predicate [
    a :SparqlPredicate ;
    :query "SELECT ?file WHERE { ?file git:status git:staged . }"
  ] ;
  :handler [
    a :BreeJob ;
    bree:jobName "validate-staged-files" ;
    bree:schedule "immediate" ;
    bree:timeout 30000
  ] ;
  :audit true .
```

## Execution Flow

### Example: Pre-commit Hook

1. **Git Hook Trigger**
   ```bash
   git commit -m "Add feature"
   ```
   → Husky executes `.husky/pre-commit`

2. **Event Capture**
   ```javascript
   HuskyHookBridge.captureGitEvent('pre-commit', {
     stagedFiles: ['src/feature.js'],
     branchName: 'feature/new-feature',
     commitMessage: 'Add feature'
   })
   ```
   → Stores RDF event in git notes

3. **Hook Evaluation**
   ```sparql
   SELECT ?hook WHERE {
     ?hook :triggerEvent git:pre-commit ;
           :predicate ?pred .
     ?event a git:PreCommitEvent ;
            git:stagedFiles ?files .
   }
   ```
   → Evaluates which hooks should trigger

4. **Job Scheduling**
   ```javascript
   const job = {
     name: 'validate-staged-files',
     timeout: 30000,
     data: { event: eventUri, files: [...] }
   }
   BreeScheduler.addJob(job)
   ```
   → Enqueues for background execution

5. **Job Execution**
   - Validates files
   - Logs audit trail
   - Returns result to git hook

6. **Git Hook Result**
   - If validation passes: git commit succeeds (exit 0)
   - If validation fails: git commit rejected (exit 1)

## Data Flow

### RDF Store Structure

```
Event (RDF Triple)
├─ rdf:type → git:PreCommitEvent
├─ git:eventType → "pre-commit"
├─ prov:atTime → 2024-01-15T10:30:00Z
├─ git:stagedFiles → ["src/file.js"]
├─ git:branchName → "feature/new-feature"
└─ git:exitCode → 0

Hook (RDF Triple)
├─ rdf:type → hook:Hook
├─ hook:name → "pre-commit-validation"
├─ hook:triggerEvent → git:pre-commit
├─ hook:predicate → <sparql-query>
└─ hook:handler → <bree-job-config>

Execution (RDF Triple)
├─ rdf:type → hook:Execution
├─ hook:executionId → "exec_1234567890_abc123"
├─ hook:hookId → "pre-commit-validation"
├─ prov:atTime → 2024-01-15T10:30:01Z
├─ hook:status → "completed"
└─ hook:duration → 1200
```

## Configuration

### Husky Setup

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "node -e 'import(\"./dist/hooks/pre-commit.mjs\").then(m => m.default())'",
      "post-commit": "node -e 'import(\"./dist/hooks/post-commit.mjs\").then(m => m.default())'",
      "post-merge": "node -e 'import(\"./dist/hooks/post-merge.mjs\").then(m => m.default())'"
    }
  }
}
```

### Hook Configuration

```javascript
// gitvan.config.js
export default {
  hooks: {
    dir: "./hooks",                    // Hook definitions directory
    autoevaluate: true,               // Auto-evaluate on git events
    audit: true,                       // Enable audit logging
  },
  bree: {
    jobsDir: "./jobs",                // Bree jobs directory
    timeout: 30000,                   // Default job timeout
    interval: 1000,                   // Job check interval
  },
  git: {
    auditRef: "refs/notes/gitvan/audit"  // Git notes ref for audit trails
  }
}
```

## API Usage Examples

### Register a Hook

```javascript
import { useUnifiedHooks } from './composables/unified-hooks.mjs'

const hooks = useUnifiedHooks()

// Using predicate
await hooks.on('pre-commit', {
  predicate: ({ event }) => event.stagedFiles?.length > 0,
  handler: async (event) => {
    console.log('Files staged:', event.stagedFiles)
  },
  breeConfig: {
    jobName: 'lint-staged',
    timeout: 30000
  }
})

// Using SPARQL query
await hooks.on('post-commit', {
  sparql: `SELECT ?file WHERE { ?file git:status git:modified }`,
  handler: async (results) => {
    console.log('Modified files:', results)
  }
})
```

### Emit an Event

```javascript
// Manually emit an event
await hooks.emit('pre-commit', {
  stagedFiles: ['src/app.js'],
  branchName: 'main'
})

// Or via Husky (automatic)
git commit -m "Fix bug"  // → Husky hook → hooks.emit() → evaluation
```

### Monitor Hook Execution

```javascript
const status = hooks.getStatus()
console.log(status)
// {
//   activeHooks: 5,
//   recentExecutions: [...],
//   jobsQueued: 2,
//   jobsCompleted: 47
// }
```

## Error Handling

### Hook Validation Errors

```
pre-commit validation failed
├─ Event: pre-commit-2024-01-15T10:30:00Z-abc123
├─ Hook: pre-commit-validation
├─ Error: File size exceeds limit (5MB > 3MB)
└─ Exit Code: 1 (git commit rejected)
```

### Job Execution Errors

```
Hook job failed
├─ Job Name: validate-staged-files
├─ Error: Timeout after 30000ms
├─ Audit Trail: Recorded to refs/notes/gitvan/audit
└─ Action: Retry available (exponential backoff)
```

## Testing Strategy

### Unit Tests

- **HuskyHookBridge**: Event capture, RDF triple creation
- **UnrdfHooksBridge**: Job registration, scheduling
- **UnifiedHooks**: API behavior, predicate evaluation

### Integration Tests

- **Full Flow**: Git hook → RDF store → evaluation → Bree job
- **Error Cases**: Timeout, validation failure, job crash
- **Audit Logging**: Verify receipt in git notes

### E2E Tests

- **Real Git Commit**: Test actual pre-commit hook flow
- **Branch Scenarios**: Test with different branches/files
- **Concurrent Hooks**: Multiple hooks triggering simultaneously

## Performance Considerations

### Latency

- Pre-commit hooks: <100ms (synchronous evaluation)
- Post-commit hooks: <500ms (async + Bree scheduling)

### Throughput

- Can handle 100+ concurrent hook evaluations
- Job queue can buffer 1000+ jobs before slowdown
- RDF store efficient for 10,000+ events

### Resource Usage

- Bree worker pool: Tunable (default 4 workers)
- RDF store: In-memory with git notes persistence
- Git notes: One note per event (minimal overhead)

## Security Considerations

- Hook validation against SPARQL injection
- Bree job sandboxing via worker threads
- Audit trail immutable (git notes signed)
- No sensitive data in RDF store

## Future Enhancements

1. **Distributed Hooks**: Federated SPARQL queries across repos
2. **Hook Versioning**: Version control hook definitions
3. **Policy Engine**: Policy-based hook execution
4. **Machine Learning**: Learn from execution patterns
5. **Webhooks**: External trigger support

---

## Implementation Phases

### Phase 1: Core Infrastructure (Current)

- HuskyHookBridge
- UnrdfHooksBridge
- Unified composable
- Basic git hooks

### Phase 2: Enhanced Features

- Advanced SPARQL predicates
- Job retry logic
- Distributed execution

### Phase 3: Enterprise Features

- Multi-repo coordination
- Policy engine
- ML-based optimization
