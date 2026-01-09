# GitVan Hooks System Architecture

**Technical architecture and design of the Husky + @unrdf/hooks + Bree integration**

Version: 1.0.0
Last Updated: January 9, 2026
GitVan Version: 3.0.0+

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Integration Points](#integration-points)
6. [Storage Architecture](#storage-architecture)
7. [Concurrency & Threading](#concurrency--threading)
8. [Error Handling Strategy](#error-handling-strategy)
9. [Performance Characteristics](#performance-characteristics)
10. [Security Model](#security-model)
11. [Scalability Considerations](#scalability-considerations)
12. [Design Decisions](#design-decisions)

---

## System Overview

### High-Level Architecture

The GitVan hooks integration system is a three-tier architecture that bridges Git operations to background job execution through semantic knowledge graphs:

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitVan Hooks System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐       │
│  │   Husky     │───▶│  @unrdf/     │───▶│    Bree     │       │
│  │ Git Hooks   │    │    hooks     │    │  Scheduler  │       │
│  │  Manager    │    │ RDF System   │    │             │       │
│  └─────────────┘    └──────────────┘    └─────────────┘       │
│       │                    │                     │              │
│       │                    │                     │              │
│       ▼                    ▼                     ▼              │
│  ┌─────────────────────────────────────────────────────┐       │
│  │            Git-Native Storage Layer                  │       │
│  │  (Git refs, Git notes, RDF triples in .git/)        │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Husky Hook Bridge** | Capture Git events, convert to RDF | Node.js, GitEventCapture |
| **UnRDF Hooks Bridge** | Evaluate hook conditions, trigger jobs | @unrdf/hooks, SPARQL |
| **Bree Scheduler** | Execute background jobs, manage workers | Bree, Worker Threads |
| **Git-Native I/O** | Store/retrieve RDF data in Git | isomorphic-git, Git refs/notes |
| **Knowledge Substrate** | RDF triple store, graph queries | @unrdf/substrate |
| **Hook Orchestrator** | Coordinate hook lifecycle | HookOrchestrator.mjs |

---

## Architecture Diagram

### System Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                 Git Repository                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────┐  Git Event   ┌──────────────────────────────────────────┐  │
│  │  Husky    │─────────────▶│       Husky Hook Bridge                  │  │
│  │ pre-commit│              │  /src/integrations/husky-hook-bridge.mjs │  │
│  │ post-merge│              └──────────────────┬───────────────────────┘  │
│  │ pre-push  │                                 │                          │
│  │   ...     │                                 ▼                          │
│  └───────────┘              ┌──────────────────────────────────────────┐  │
│                             │      GitEventCapture                      │  │
│                             │  /src/git-lifecycle/GitEventCapture.mjs  │  │
│                             └──────────────────┬───────────────────────┘  │
│                                                │                          │
│                                                │ RDF Event                │
│                                                ▼                          │
│                             ┌──────────────────────────────────────────┐  │
│                             │   Knowledge Substrate Core                │  │
│                             │   (RDF Triple Store)                      │  │
│                             │   vendor/unrdf/src/                       │  │
│                             └──────────────────┬───────────────────────┘  │
│                                                │                          │
│                                                │ Graph Updated            │
│                                                ▼                          │
│                             ┌──────────────────────────────────────────┐  │
│                             │      Hook Orchestrator                    │  │
│                             │  /src/hooks/HookOrchestrator.mjs         │  │
│                             │                                           │  │
│                             │  - Parse hook definitions (.ttl)          │  │
│                             │  - Evaluate predicates (SPARQL)           │  │
│                             │  - Determine triggered hooks              │  │
│                             └──────────────────┬───────────────────────┘  │
│                                                │                          │
│                                                │ Triggered Hooks          │
│                                                ▼                          │
│                             ┌──────────────────────────────────────────┐  │
│                             │    UnRDF Hooks Bridge                     │  │
│                             │  /src/integrations/unrdf-hooks-bridge.mjs│  │
│                             └──────────────────┬───────────────────────┘  │
│                                                │                          │
│                                                │ Register Jobs            │
│                                                ▼                          │
│                             ┌──────────────────────────────────────────┐  │
│                             │        Bree Scheduler                     │  │
│                             │   /src/jobs/bree-scheduler.mjs            │  │
│                             │                                           │  │
│                             │  - Job queue management                   │  │
│                             │  - Worker pool                            │  │
│                             │  - Cron/interval scheduling               │  │
│                             └──────────────────┬───────────────────────┘  │
│                                                │                          │
│                                                │ Execute Job              │
│                                                ▼                          │
│                             ┌──────────────────────────────────────────┐  │
│                             │      Job Worker (Worker Thread)           │  │
│                             │   jobs/*.mjs                              │  │
│                             └───────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                    Git-Native Storage Layer                         │   │
│  ├────────────────────────────────────────────────────────────────────┤   │
│  │  .git/refs/notes/gitvan/events     - Event history (RDF)           │   │
│  │  .git/refs/notes/gitvan/audit      - Audit trail                   │   │
│  │  .git/refs/gitvan/hooks/*          - Hook definitions              │   │
│  │  .git/refs/gitvan/jobs/*           - Job state                     │   │
│  │  graph/                             - Local RDF cache               │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Husky Hook Bridge

**Location**: `/src/integrations/husky-hook-bridge.mjs`

#### Architecture

```javascript
export class HuskyHookBridge {
  constructor(options = {}) {
    this.eventCapture = new GitEventCapture()
    this.orchestrator = new HookOrchestrator()
    this.autoEvaluate = true
    this.enableAudit = true
  }

  async processHook(hookName, eventData) {
    // 1. Capture Git event as RDF
    const captureResult = await this.eventCapture.captureEvent(hookName, eventData)

    // 2. Evaluate registered hooks
    const evaluationResult = await this._evaluateHooksForEvent(captureResult.eventUri)

    // 3. Log audit trail
    await this._logAuditTrail(evaluationResult)

    return evaluationResult
  }
}
```

#### Key Responsibilities

1. **Event Capture**: Intercepts Git hook invocations (10 hook types)
2. **RDF Conversion**: Converts Git event data to RDF triples
3. **Hook Evaluation**: Triggers `HookOrchestrator` to evaluate conditions
4. **Audit Logging**: Records all hook executions to Git notes
5. **Error Handling**: Graceful degradation on failures

#### Data Structures

**Git Event → RDF Mapping**:

```turtle
@prefix git: <http://example.com/git#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<event://pre-commit/1234567890> a git:PreCommitEvent ;
  prov:wasGeneratedBy <author://john@example.com> ;
  prov:generatedAtTime "2026-01-09T12:00:00Z"^^xsd:dateTime ;
  git:hasChange <change://abc123> ;
  git:branch "main" ;
  git:repository <repo://path/to/repo> .

<change://abc123> a git:Change ;
  git:path "src/index.js" ;
  git:operation git:Modified ;
  git:diff "+console.log('hello')" .
```

### 2. UnRDF Hooks Bridge

**Location**: `/src/integrations/unrdf-hooks-bridge.mjs`

#### Architecture

```javascript
export class UnrdfHooksBridge {
  constructor(options = {}) {
    this.scheduler = getBreeScheduler(options)
    this.registeredHooks = new Map()
    this.executionLog = []
  }

  async registerHook(hookDef) {
    // Convert hook definition to Bree job config
    const jobConfig = this._convertHookToJob(hookDef)

    // Register with Bree scheduler
    await this.scheduler.addJob(jobConfig)

    // Track registration
    this.registeredHooks.set(hookDef.id, hookDef)
  }

  async executeHook(hookId, data, options) {
    // Get registered hook
    const hookDef = this.registeredHooks.get(hookId)

    // Execute via Bree
    await this.scheduler.runJob(hookDef.jobName)

    // Log execution
    this._logExecution(hookId, data)
  }
}
```

#### Key Responsibilities

1. **Hook Registration**: Converts hook definitions to Bree jobs
2. **Job Scheduling**: Manages cron, interval, and immediate execution
3. **Execution Tracking**: Maintains execution history
4. **Error Recovery**: Retry logic and timeout handling
5. **Statistics**: Provides execution metrics

#### Hook → Job Conversion

**Input** (Turtle hook definition):
```turtle
:MyHook a hook:Hook ;
  hook:job [
    hook:name "my-job" ;
    hook:schedule "immediate" ;
    hook:timeout 30000
  ] .
```

**Output** (Bree job config):
```javascript
{
  name: "my-job",
  path: "/path/to/jobs/my-job.mjs",
  timeout: 30000,
  // No cron/interval for immediate execution
}
```

### 3. Bree Scheduler

**Location**: `/src/jobs/bree-scheduler.mjs`

#### Architecture

```javascript
export class BreeScheduler {
  constructor(options = {}) {
    this.bree = new Bree({
      root: options.jobsDir,
      hasSeconds: false,
      timeout: options.timeout || 0,
      closeWorkerAfterMs: 5000,
      defaultExtension: 'mjs'
    })

    this.jobs = new Map()
    this.isRunning = false
  }

  async addJob(jobConfig) {
    this.bree.add(jobConfig)
    this.jobs.set(jobConfig.name, jobConfig)
  }

  async runJob(name) {
    // Ensure Bree is started
    if (!this.isRunning) await this.start()

    // Execute job
    await this.bree.run(name)
  }
}
```

#### Key Responsibilities

1. **Job Lifecycle**: Add, remove, start, stop jobs
2. **Worker Management**: Worker thread pool for concurrent execution
3. **Scheduling**: Cron and interval-based triggers
4. **Timeout Handling**: Kill long-running jobs
5. **Error Propagation**: Capture and report job failures

#### Worker Thread Model

```
┌─────────────────────────────────────────────────────────────┐
│                      Bree Scheduler                          │
│                     (Main Thread)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Job Queue: [job1, job2, job3, ...]                         │
│                                                              │
│  Worker Pool:                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Worker 1   │  │  Worker 2   │  │  Worker 3   │         │
│  │  (Thread)   │  │  (Thread)   │  │  (Thread)   │         │
│  │             │  │             │  │             │         │
│  │  job1.mjs   │  │  job2.mjs   │  │  job3.mjs   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Hook Orchestrator

**Location**: `/src/hooks/HookOrchestrator.mjs`

#### Architecture

```javascript
export class HookOrchestrator {
  constructor(options = {}) {
    this.parser = new HookParser()
    this.predicateEvaluator = new PredicateEvaluator()
    this.planner = new DAGPlanner()
    this.runner = new StepRunner()
  }

  async evaluate(options = {}) {
    // Parse all hook definitions
    const hooks = await this._parseAllHooks()

    // Evaluate each hook's predicate against current graph state
    const evaluationResults = await this._evaluateHooks(hooks)

    // Get triggered hooks
    const triggeredHooks = evaluationResults.filter(r => r.triggered)

    // Execute workflows for triggered hooks
    const executions = await this._executeWorkflows(triggeredHooks)

    return { triggeredHooks, executions }
  }
}
```

#### Key Responsibilities

1. **Hook Parsing**: Load and parse Turtle hook definitions
2. **Predicate Evaluation**: Execute SPARQL queries to check conditions
3. **Workflow Planning**: Build DAG of steps to execute
4. **Execution Coordination**: Trigger workflows for matched hooks
5. **State Management**: Track graph state changes

#### Evaluation Algorithm

```javascript
async _evaluateHooks(hooks) {
  const results = []

  for (const hook of hooks) {
    // Extract predicate (SPARQL query or pattern)
    const predicate = hook.when || hook.predicate

    // Evaluate against current graph state
    const satisfied = await this.predicateEvaluator.evaluate(predicate, {
      currentGraph: this.graph,
      previousGraph: this.previousGraph
    })

    results.push({
      hookId: hook.id,
      triggered: satisfied,
      timestamp: Date.now(),
      predicate
    })
  }

  return results
}
```

---

## Data Flow

### Complete Hook Execution Flow

```
1. Git Operation
   └─▶ User runs: git commit -m "message"

2. Husky Intercepts
   └─▶ .git/hooks/pre-commit invoked

3. Husky Hook Bridge
   ├─▶ processHook("pre-commit", eventData)
   └─▶ GitEventCapture.captureEvent()
       ├─▶ Generate event URI: event://pre-commit/1234567890
       ├─▶ Extract git data (files, author, message, etc.)
       ├─▶ Convert to RDF triples
       └─▶ Store in Knowledge Substrate

4. Knowledge Substrate
   ├─▶ Add triples to graph
   ├─▶ Update indices
   └─▶ Trigger reactive hooks (if any)

5. Hook Orchestrator
   ├─▶ Parse all hook definitions from hooks/*.ttl
   ├─▶ For each hook:
   │   ├─▶ Extract predicate/condition
   │   ├─▶ Evaluate against current graph state
   │   │   └─▶ SPARQL query or pattern matching
   │   └─▶ Determine if hook should trigger
   └─▶ Return list of triggered hooks

6. UnRDF Hooks Bridge
   ├─▶ For each triggered hook:
   │   ├─▶ Get job configuration from hook definition
   │   ├─▶ Convert to Bree job config
   │   └─▶ executeHook(hookId, eventData)
   └─▶ Log execution metadata

7. Bree Scheduler
   ├─▶ Lookup job by name
   ├─▶ Create worker thread
   ├─▶ Load job file (jobs/my-job.mjs)
   └─▶ Execute job function

8. Job Worker
   ├─▶ Run job logic (linting, tests, etc.)
   ├─▶ Return result { success, data }
   └─▶ Exit worker thread

9. Result Propagation
   ├─▶ Bree captures worker result
   ├─▶ UnRDF Hooks Bridge logs execution
   ├─▶ Husky Hook Bridge logs audit trail
   └─▶ Store result in Git notes

10. Audit Trail
    └─▶ Write to refs/notes/gitvan/audit
        ├─▶ Event URI
        ├─▶ Triggered hooks
        ├─▶ Execution results
        ├─▶ Duration
        └─▶ Timestamp
```

---

## Integration Points

### 1. Husky ↔ GitVan Integration

**Entry Point**: `.git/hooks/*` (Husky-managed hooks)

**Integration Code**:
```javascript
// .git/hooks/pre-commit (generated by Husky)
#!/usr/bin/env sh

# Invoke GitVan hook bridge
node -e "
  import { getHuskyHookBridge } from 'gitvan/integrations/husky-hook-bridge';
  const bridge = getHuskyHookBridge();
  await bridge.processHook('pre-commit', {
    files: process.argv.slice(2),
    cwd: process.cwd()
  });
"
```

### 2. UnRDF ↔ Bree Integration

**Hook Definition → Job Registration**:

```javascript
// Hook definition (Turtle)
:MyHook a hook:Hook ;
  hook:job [
    hook:name "my-job" ;
    hook:schedule "immediate"
  ] .

// Converted to Bree job
const bridge = new UnrdfHooksBridge()
await bridge.registerHook({
  id: "my-hook",
  breeConfig: {
    jobName: "my-job",
    schedule: "immediate"
  }
})

// Results in Bree job:
scheduler.addJob({
  name: "my-job",
  path: "/path/to/jobs/my-job.mjs"
})
```

### 3. RDF ↔ Git Storage Integration

**RDF Triple → Git Notes**:

```javascript
// RDF triple
<event://pre-commit/123> a git:PreCommitEvent .

// Stored in Git notes as:
git notes --ref=refs/notes/gitvan/events add -m "
  <event://pre-commit/123> a git:PreCommitEvent ;
    prov:generatedAtTime \"2026-01-09T12:00:00Z\"^^xsd:dateTime .
" HEAD
```

---

## Storage Architecture

### Git-Native Storage Model

All data is stored in Git, eliminating external dependencies:

```
.git/
├── refs/
│   ├── notes/
│   │   ├── gitvan/
│   │   │   ├── events      # RDF event history
│   │   │   ├── audit       # Audit trail
│   │   │   └── hooks       # Hook execution logs
│   │   └── commits         # Git commit notes
│   └── gitvan/
│       ├── hooks/          # Hook state
│       │   ├── my-hook-state
│       │   └── ...
│       └── jobs/           # Job state
│           ├── job1-state
│           └── ...
└── objects/
    └── ...                 # Git objects (blobs, trees, commits)

graph/                      # Local RDF cache (not in .git/)
├── hooks/
│   ├── pre-commit-quality.ttl
│   └── ...
└── events/
    ├── event-123.ttl
    └── ...
```

### Storage Operations

**Write Event**:
```javascript
// 1. Generate RDF triples
const triples = [
  quad(namedNode('event://123'), namedNode('rdf:type'), namedNode('git:PreCommitEvent')),
  quad(namedNode('event://123'), namedNode('prov:generatedAtTime'), literal(timestamp))
]

// 2. Serialize to Turtle
const turtle = serializeToTurtle(triples)

// 3. Write to Git notes
await git.notes('add', {
  ref: 'refs/notes/gitvan/events',
  message: turtle,
  object: 'HEAD'
})
```

**Read Event**:
```javascript
// 1. Read from Git notes
const noteContent = await git.notes('show', {
  ref: 'refs/notes/gitvan/events',
  object: 'HEAD'
})

// 2. Parse Turtle to RDF
const triples = parseFromTurtle(noteContent)

// 3. Load into Knowledge Substrate
await core.loadTriples(triples)
```

---

## Concurrency & Threading

### Threading Model

```
Main Thread
├── Husky Hook Bridge (async)
├── UnRDF Hooks Bridge (async)
├── Hook Orchestrator (async)
└── Bree Scheduler
    └── Worker Thread Pool
        ├── Worker 1 (job execution)
        ├── Worker 2 (job execution)
        └── Worker 3 (job execution)
```

### Concurrency Control

**1. Event Capture Locking**:
```javascript
// Ensure only one event capture at a time
const lockManager = new LockManager()

async function captureEvent(hookName, data) {
  const lock = await lockManager.acquire('event-capture')
  try {
    // Capture event
    const result = await _captureEventImpl(hookName, data)
    return result
  } finally {
    await lockManager.release(lock)
  }
}
```

**2. Hook Evaluation Isolation**:
```javascript
// Each hook evaluation gets isolated graph snapshot
async function evaluateHook(hook) {
  const snapshot = await graphManager.createSnapshot()
  try {
    const result = await predicateEvaluator.evaluate(hook.predicate, { graph: snapshot })
    return result
  } finally {
    await snapshot.release()
  }
}
```

**3. Job Execution Parallelism**:
```javascript
// Bree manages worker pool automatically
// Configure max concurrent workers
const scheduler = new BreeScheduler({
  workerPool: {
    maxWorkers: 4,  // Max 4 concurrent jobs
    workerData: {}  // Shared data across workers
  }
})
```

---

## Error Handling Strategy

### Error Categories

1. **Capture Errors**: Git event capture failures
2. **Evaluation Errors**: Hook predicate evaluation failures
3. **Execution Errors**: Job execution failures
4. **Storage Errors**: Git I/O failures
5. **System Errors**: Scheduler/worker crashes

### Error Handling Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ Level 1: Try-Catch Individual Operations                │
│ - Log error with context                                │
│ - Return error result (don't crash)                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Level 2: Graceful Degradation                           │
│ - Continue processing other hooks                       │
│ - Skip failed hooks                                     │
│ - Return partial success                                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Level 3: Audit Trail Logging                            │
│ - Log all errors to Git notes                           │
│ - Include full stack trace                              │
│ - Timestamp and context                                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Level 4: System Recovery                                │
│ - Retry with exponential backoff                        │
│ - Circuit breaker pattern                               │
│ - Fallback to safe state                                │
└─────────────────────────────────────────────────────────┘
```

### Implementation Example

```javascript
async function processHook(hookName, eventData) {
  const result = {
    success: false,
    hookName,
    errors: []
  }

  try {
    // Level 1: Try core operation
    const captureResult = await this.eventCapture.captureEvent(hookName, eventData)
    result.eventUri = captureResult.eventUri

    // Level 2: Graceful degradation
    try {
      const evaluationResult = await this.orchestrator.evaluate({ eventUri: result.eventUri })
      result.triggeredHooks = evaluationResult.triggeredHooks
      result.success = true
    } catch (evalError) {
      // Log but continue
      this.logger.warn('Hook evaluation failed:', evalError)
      result.errors.push({ phase: 'evaluation', error: evalError.message })
      // Still return success for event capture
      result.success = true
    }

  } catch (error) {
    // Level 1: Capture failed - this is critical
    this.logger.error('Event capture failed:', error)
    result.errors.push({ phase: 'capture', error: error.message })
    result.success = false
  } finally {
    // Level 3: Always log audit trail
    await this._logAuditTrail(result).catch(err => {
      // Even audit logging can fail - log to console as last resort
      console.error('Audit logging failed:', err)
    })
  }

  // Level 4: System recovery (if needed)
  if (!result.success && this.retryEnabled) {
    return await this._retryWithBackoff(() => this.processHook(hookName, eventData))
  }

  return result
}
```

---

## Performance Characteristics

### Benchmarks

**Event Capture**:
- Simple event (no files): ~10ms
- Event with 10 files: ~50ms
- Event with 100 files: ~200ms

**Hook Evaluation**:
- Single hook (simple predicate): ~5ms
- 10 hooks (simple predicates): ~30ms
- Complex SPARQL query: ~100ms

**Job Execution**:
- Job startup overhead: ~50ms
- Typical job (linting): ~1-5s
- Heavy job (tests): ~10-60s

### Optimization Strategies

**1. Lazy Loading**:
```javascript
// Don't load all hooks at startup
// Load on-demand when event occurs
async function evaluateForEvent(eventUri) {
  const hooks = await this._loadRelevantHooks(eventUri)  // Only hooks for this event type
  return await this._evaluate(hooks, eventUri)
}
```

**2. Caching**:
```javascript
// Cache parsed hook definitions
const hookCache = new Map()

async function parseHook(hookFile) {
  if (hookCache.has(hookFile)) {
    return hookCache.get(hookFile)
  }

  const parsed = await this._parseHookFile(hookFile)
  hookCache.set(hookFile, parsed)
  return parsed
}
```

**3. Parallel Execution**:
```javascript
// Evaluate multiple hooks in parallel
async function evaluateHooks(hooks) {
  const evaluations = await Promise.all(
    hooks.map(hook => this._evaluateSingleHook(hook))
  )
  return evaluations
}
```

**4. Background Processing**:
```javascript
// Heavy jobs run in background, don't block Git operation
hook:schedule "background"  # Queued for later execution
# vs
hook:schedule "immediate"   # Blocks Git operation until complete
```

---

## Security Model

### Threat Model

1. **Malicious Hook Definitions**: Untrusted .ttl files
2. **Malicious Job Files**: Untrusted .mjs files
3. **Code Injection**: SPARQL injection, shell injection
4. **Resource Exhaustion**: Infinite loops, fork bombs
5. **Data Exfiltration**: Hooks sending data externally

### Security Mitigations

**1. Hook Definition Validation**:
```javascript
async function validateHook(hookDef) {
  // Validate Turtle syntax
  await this.parser.validate(hookDef)

  // Check for suspicious patterns
  const suspicious = [
    /eval\(/,
    /Function\(/,
    /child_process/,
    /exec/
  ]

  for (const pattern of suspicious) {
    if (pattern.test(hookDef)) {
      throw new Error(`Suspicious pattern detected: ${pattern}`)
    }
  }
}
```

**2. Job Sandboxing**:
```javascript
// Jobs run in isolated worker threads
const job = new Worker(jobPath, {
  // Restrict access
  workerData: safeContext,

  // Resource limits
  resourceLimits: {
    maxOldGenerationSizeMb: 512,
    maxYoungGenerationSizeMb: 128
  }
})

// Kill after timeout
setTimeout(() => {
  job.terminate()
}, jobTimeout)
```

**3. SPARQL Query Validation**:
```javascript
function validateSPARQL(query) {
  // Prevent dangerous operations
  const forbidden = [
    /DELETE/i,
    /INSERT/i,
    /DROP/i,
    /LOAD/i
  ]

  for (const pattern of forbidden) {
    if (pattern.test(query)) {
      throw new Error('Forbidden SPARQL operation')
    }
  }

  // Only allow SELECT and ASK
  if (!/^(SELECT|ASK)/i.test(query.trim())) {
    throw new Error('Only SELECT and ASK queries allowed')
  }
}
```

**4. Git Signature Verification**:
```javascript
async function verifyHookSignature(hookFile) {
  // Require GPG-signed commits for hook changes
  const commit = await git.log({ file: hookFile, maxCount: 1 })

  if (!commit.gpgsig) {
    throw new Error('Hook changes must be GPG-signed')
  }

  const verified = await verifyGPGSignature(commit.gpgsig)
  if (!verified) {
    throw new Error('Invalid GPG signature')
  }
}
```

---

## Scalability Considerations

### Horizontal Scalability

**Multi-Repository Support**:
```javascript
// Each repository gets isolated bridge instance
const bridgeInstances = new Map()

function getHuskyHookBridge(repoPath) {
  if (!bridgeInstances.has(repoPath)) {
    bridgeInstances.set(repoPath, new HuskyHookBridge({ cwd: repoPath }))
  }
  return bridgeInstances.get(repoPath)
}
```

### Vertical Scalability

**Worker Pool Sizing**:
```javascript
// Auto-scale worker pool based on CPU cores
import { cpus } from 'os'

const maxWorkers = Math.max(2, cpus().length - 1)  // Leave 1 core for system

const scheduler = new BreeScheduler({
  workerPool: {
    maxWorkers,
    minWorkers: 1
  }
})
```

### Storage Scalability

**Event History Pruning**:
```javascript
// Prune old events to prevent Git repo bloat
async function pruneOldEvents(olderThan = 30 * 24 * 60 * 60 * 1000) {  // 30 days
  const cutoffTime = Date.now() - olderThan

  const events = await this.core.query(`
    SELECT ?event ?time WHERE {
      ?event a git:Event ;
             prov:generatedAtTime ?time .
      FILTER(?time < ${cutoffTime})
    }
  `)

  // Remove from Git notes
  for (const event of events) {
    await git.notes('remove', {
      ref: 'refs/notes/gitvan/events',
      object: event.commit
    })
  }
}
```

---

## Design Decisions

### Why Three Components?

**Design Decision**: Use three separate components (Husky, @unrdf/hooks, Bree) instead of a monolithic system.

**Rationale**:
1. **Separation of Concerns**: Each component has single responsibility
2. **Flexibility**: Can replace/upgrade components independently
3. **Testability**: Easier to test isolated components
4. **Reusability**: Components can be used separately in other projects

**Trade-offs**:
- ✅ Modularity and maintainability
- ✅ Clear interfaces between components
- ❌ Increased complexity (three systems to coordinate)
- ❌ More potential failure points

### Why RDF/Turtle for Hook Definitions?

**Design Decision**: Use RDF/Turtle instead of JSON/YAML for hook definitions.

**Rationale**:
1. **Semantic Queries**: SPARQL enables complex condition evaluation
2. **Graph Relationships**: Express dependencies and relationships naturally
3. **Extensibility**: Easy to add custom properties without schema changes
4. **Provenance**: Built-in support for PROV-O ontology

**Trade-offs**:
- ✅ Powerful query capabilities
- ✅ Semantic richness
- ❌ Steeper learning curve
- ❌ Less familiar to most developers

### Why Git-Native Storage?

**Design Decision**: Store all data in Git (refs, notes) instead of external database.

**Rationale**:
1. **Zero Dependencies**: No database to install/maintain
2. **Version Control**: All hook data is versioned with code
3. **Atomic Operations**: Git provides ACID guarantees
4. **Distributed**: Works offline, syncs via Git
5. **Cryptographic Integrity**: Git's SHA-1 ensures data integrity

**Trade-offs**:
- ✅ Simplicity (no external dependencies)
- ✅ Git integration (audit trail travels with code)
- ✅ Offline support
- ❌ Limited query performance (no indexes)
- ❌ Git repo size growth (mitigated by pruning)

### Why Worker Threads for Jobs?

**Design Decision**: Use Node.js Worker Threads (via Bree) instead of child processes.

**Rationale**:
1. **Lower Overhead**: Threads share memory, faster startup than processes
2. **Better Resource Control**: Can set memory limits per worker
3. **Isolation**: Workers are still isolated (can't crash main thread)
4. **Communication**: Easier message passing than IPC

**Trade-offs**:
- ✅ Performance (lower overhead)
- ✅ Resource control
- ❌ Shared memory complexity
- ❌ Node.js dependency (can't use non-JS workers)

---

## Future Architecture Enhancements

### 1. Distributed Hook Execution

**Proposal**: Execute hooks across multiple machines for large teams.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Machine A  │────▶│  Hook Queue  │◀────│   Machine B  │
│  (Developer) │     │  (Shared)    │     │  (CI Server) │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 2. Event Streaming

**Proposal**: Stream Git events to external systems (Kafka, RabbitMQ).

```javascript
// Hook configuration
:MyHook a hook:Hook ;
  hook:stream [
    hook:target "kafka://localhost:9092/git-events" ;
    hook:format "application/ld+json"
  ] .
```

### 3. Machine Learning Integration

**Proposal**: Learn from hook execution history to optimize conditions.

```javascript
// Analyze which hooks trigger most frequently
// Suggest condition refinements to reduce noise
const optimizer = new HookOptimizer()
const suggestions = await optimizer.analyze(executionHistory)
// → "Consider adding pathChanged filter to reduce false triggers by 80%"
```

---

## Conclusion

The GitVan hooks architecture provides a robust, scalable, and maintainable system for Git-native workflow automation. By leveraging semantic technologies (RDF, SPARQL) and modern JavaScript patterns (Worker Threads, async/await), it achieves both power and usability.

Key architectural strengths:
- **Modularity**: Clear separation of concerns
- **Git-Native**: No external dependencies
- **Semantic**: Rich query capabilities via RDF
- **Scalable**: Worker pool and caching strategies
- **Secure**: Validation and sandboxing

---

**Last Updated**: January 9, 2026
**GitVan Version**: 3.0.0+
**License**: Apache-2.0
