# Git Lifecycle Knowledge Hooks - Visual Architecture Diagrams

**Version:** 1.0.0
**Date:** 2025-12-03

---

## System Component Diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GitVan Knowledge Hooks System                        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      Git Repository (External System)                   │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │ │
│  │  │ Commits  │  │  Merges  │  │ Branches │  │   Tags   │               │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘               │ │
│  └───────┼─────────────┼─────────────┼─────────────┼────────────────────────┘ │
│          │             │             │             │                        │
│          └─────────────┴─────────────┴─────────────┘                        │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Component 1: GitEventCapture                                       │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │ • Captures git lifecycle events via hooks                      │ │   │
│  │  │ • Converts events to RDF triples                               │ │   │
│  │  │ • Stores in KnowledgeSubstrate (K_t)                           │ │   │
│  │  │ • Manages retention policy (90d→1y)                            │ │   │
│  │  │                                                                 │ │   │
│  │  │ Depends on:                                                     │ │   │
│  │  │   - knowledge-substrate.mjs (KnowledgeSubstrate)               │ │   │
│  │  │   - event-feed-processes.mjs (GitEventProcess)                 │ │   │
│  │  │   - graph.mjs (useGraph)                                       │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────┬───────────────────────────────────────────────┘   │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Knowledge Substrate Core (Shared Component)                        │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │ RDF Triple Store: K_t = {(s,p,o) | s,p,o ∈ R}                 │ │   │
│  │  │ Time-indexed snapshots: {K_t}_t                                │ │   │
│  │  │ Delta calculation: ΔK_t = K_t ∖ K_{t-1}                        │ │   │
│  │  │                                                                 │ │   │
│  │  │ Operations:                                                     │ │   │
│  │  │   - addTriple(s,p,o,t)                                         │ │   │
│  │  │   - query(s,p,o,t) → results                                   │ │   │
│  │  │   - calculateDelta(t) → ΔK_t                                   │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────┬───────────────────────────────────────────────┘   │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Component 2: GitLifecycleHooks                                     │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │ • Hook definitions: h=(e,φ,a)                                  │ │   │
│  │  │ • Predicate evaluation: φ(K_t)                                 │ │   │
│  │  │ • Pattern matchers: ASK, Threshold, Delta, SHACL, Temporal    │ │   │
│  │  │ • Trigger detection: T_e = {t : E_e(t)=1}                      │ │   │
│  │  │                                                                 │ │   │
│  │  │ Depends on:                                                     │ │   │
│  │  │   - knowledge-hook-primitive.mjs (KnowledgeHook)               │ │   │
│  │  │   - HookOrchestrator.mjs                                       │ │   │
│  │  │   - PredicateEvaluator.mjs                                     │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────┬───────────────────────────────────────────────┘   │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Component 3: GitWorkflowExecutor                                   │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │ • Workflow planning: DAG construction (S, D⊆S×S)               │ │   │
│  │  │ • Topological ordering: ≺                                      │ │   │
│  │  │ • Step execution: c_i^out = α_i(c^in, K_t)                    │ │   │
│  │  │ • Git-Native I/O: locks, receipts, snapshots                   │ │   │
│  │  │                                                                 │ │   │
│  │  │ Depends on:                                                     │ │   │
│  │  │   - workflow-dag-execution.mjs (WorkflowDAGExecution)          │ │   │
│  │  │   - GitNativeIO.mjs                                            │ │   │
│  │  │   - step-runner.mjs (StepRunner)                               │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────┬───────────────────────────────────────────────┘   │
│                        │                                                    │
│                        ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Git-Native I/O Layer (Storage Backend)                            │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │ • CAS locks: refs/gitvan/locks/*                               │ │   │
│  │  │ • Receipts: refs/gitvan/notes/*                                │ │   │
│  │  │ • Snapshots: refs/gitvan/executions/*                          │ │   │
│  │  │ • Queue management                                             │ │   │
│  │  │ • Worker pool                                                  │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 vs Phase 2 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PHASE 1: SYNCHRONOUS                              │
│                         (Real-time, Blocking Git Ops)                        │
│                                                                              │
│  Git Operation ──▶ Git Hook ──▶ Capture Event ──▶ Eval Hooks ──▶ Execute   │
│     (commit)      (post-*)     (GitEventCapt)   (GitLifecycle)  (Workflow)  │
│                                                                              │
│  Timeline:         0ms           <10ms            <50ms          <100ms     │
│  Total Latency:    ~160ms (blocks git operation until complete)             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Characteristics:                                                      │  │
│  │ • Immediate feedback to developer                                     │  │
│  │ • Simple implementation (single code path)                            │  │
│  │ • Git operation blocks until workflow completes                       │  │
│  │ • Suitable for critical checks (tests, linting)                       │  │
│  │ • Handles ~100 events/second                                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 2: ASYNCHRONOUS                              │
│                      (High-throughput, Non-blocking Git)                     │
│                                                                              │
│  Git Operation ──▶ Git Hook ──▶ Queue Event ──────────▶ Return             │
│     (commit)      (post-*)    (AsyncProcessor)        (immediate)           │
│                                                                              │
│  Timeline:         0ms           <5ms                  <10ms                │
│  Total Latency:    ~15ms (git operation completes, processing continues)    │
│                                                                              │
│                                      │                                       │
│                                      │ (Background processing)               │
│                                      ▼                                       │
│                        ┌──────────────────────────┐                         │
│                        │   Priority Queue         │                         │
│                        │   (Git-backed)           │                         │
│                        └──────────┬───────────────┘                         │
│                                   │                                          │
│                                   ▼                                          │
│                        ┌──────────────────────────┐                         │
│                        │   Batch Processor        │                         │
│                        │   (100 events/batch)     │                         │
│                        └──────────┬───────────────┘                         │
│                                   │                                          │
│                    ┌──────────────┴──────────────┐                          │
│                    ▼                              ▼                          │
│         ┌──────────────────────┐      ┌──────────────────────┐             │
│         │ Multi-Event          │      │ Dashboard            │             │
│         │ Correlator           │      │ Aggregator           │             │
│         │ (Pattern matching)   │      │ (Time-series stats)  │             │
│         └──────────────────────┘      └──────────────────────┘             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Characteristics:                                                      │  │
│  │ • Non-blocking git operations                                         │  │
│  │ • High throughput (1000+ events/second)                               │  │
│  │ • Multi-event correlation (temporal patterns)                         │  │
│  │ • Dashboard data aggregation                                          │  │
│  │ • Batch processing (reduced overhead)                                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Event Capture → RDF Triple Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 1: Git Operation Occurs                                            │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 2: Git Hook Triggered (post-commit, post-merge, etc.)             │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ #!/usr/bin/env node                                                 │ │
│  │ const capture = new GitEventCapture();                              │ │
│  │ await capture.captureEvent('commit', {                              │ │
│  │   sha: 'abc123',                                                    │ │
│  │   branch: 'main',                                                   │ │
│  │   author: 'user@example.com',                                       │ │
│  │   message: 'Add feature X'                                          │ │
│  │ });                                                                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 3: GitEventCapture.captureEvent()                                 │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ 1. Generate event via GitEventProcess                               │ │
│  │    event = {                                                        │ │
│  │      type: 'commit',                                                │ │
│  │      timestamp: 1733241600000,                                      │ │
│  │      id: 'commit_1733241600_abc123',                                │ │
│  │      data: { sha, branch, author, message }                         │ │
│  │    }                                                                │ │
│  │                                                                     │ │
│  │ 2. Convert to RDF triples                                           │ │
│  │    triples = [                                                      │ │
│  │      (gv:event/commit_..., rdf:type, gv:commitEvent),              │ │
│  │      (gv:event/commit_..., gv:timestamp, "1733241600000"),         │ │
│  │      (gv:event/commit_..., gv:sha, "abc123"),                      │ │
│  │      (gv:event/commit_..., gv:branch, "main"),                     │ │
│  │      (gv:event/commit_..., gv:author, "user@example.com")          │ │
│  │    ]                                                                │ │
│  │                                                                     │ │
│  │ 3. Add to KnowledgeSubstrate                                        │ │
│  │    for (triple of triples) {                                        │ │
│  │      substrate.addTriple(s, p, o, timestamp)                        │ │
│  │    }                                                                │ │
│  │                                                                     │ │
│  │ 4. Calculate delta                                                  │ │
│  │    delta = substrate.calculateDelta(timestamp)                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 4: Knowledge Substrate State (K_t)                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ K_t = {                                                             │ │
│  │   (gv:event/commit_1733241600_abc123, rdf:type, gv:commitEvent),   │ │
│  │   (gv:event/commit_1733241600_abc123, gv:timestamp, "1733241..."), │ │
│  │   (gv:event/commit_1733241600_abc123, gv:sha, "abc123"),           │ │
│  │   (gv:event/commit_1733241600_abc123, gv:branch, "main"),          │ │
│  │   (gv:event/commit_1733241600_abc123, gv:author, "user@..."),      │ │
│  │   ... (previous events)                                             │ │
│  │ }                                                                   │ │
│  │                                                                     │ │
│  │ ΔK_t = {                                                            │ │
│  │   added: [(new commit event triples)],                              │ │
│  │   removed: [],                                                      │ │
│  │   timestamp: 1733241600000                                          │ │
│  │ }                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Hook Pattern Matching Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Input: Event in K_t                                                     │
│  event = { type: 'commit', timestamp: t, data: {...} }                   │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  GitLifecycleHooks.evaluateHooks(eventType, K_t, eventData)             │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  FOR EACH hook h=(e,φ,a) in registry                                     │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 1: Check Event Type Match (t∈T_e)                                 │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ if (hook.eventType === eventType || hook.eventType === '*') {      │ │
│  │   // Continue to predicate evaluation                               │ │
│  │ } else {                                                            │ │
│  │   // Skip this hook                                                 │ │
│  │ }                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 2: Evaluate Predicate (φ(K_t)=1?)                                 │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Pattern Type 1: ASK                                                 │ │
│  │   φ_ask(K_t) = 1{∃x∈Q_t}                                           │ │
│  │   Query K_t, return true if results exist                           │ │
│  │                                                                     │ │
│  │ Pattern Type 2: Threshold                                           │ │
│  │   φ_≥(K_t) = 1{|Q_t|≥τ}                                            │ │
│  │   Query K_t, return true if count >= threshold                      │ │
│  │                                                                     │ │
│  │ Pattern Type 3: ResultDelta                                         │ │
│  │   φ_Δ(K_t) = 1{Q_t≠Q_{t^-}}                                        │ │
│  │   Compare current query results to previous                         │ │
│  │                                                                     │ │
│  │ Pattern Type 4: SHACL                                               │ │
│  │   φ_shape(K_t) = ∏_{c∈C} 1{c(K_t)=true}                            │ │
│  │   Validate all constraints                                          │ │
│  │                                                                     │ │
│  │ Pattern Type 5: Temporal                                            │ │
│  │   Multi-event correlation across time window                        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 3: Predicate Result                                               │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ if (predicateResult === true) {                                     │ │
│  │   triggeredHooks.push({                                             │ │
│  │     hookId,                                                         │ │
│  │     hook,                                                           │ │
│  │     eventType,                                                      │ │
│  │     timestamp,                                                      │ │
│  │     predicateResult                                                 │ │
│  │   });                                                               │ │
│  │ }                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Output: Triggered Hooks                                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ [                                                                   │ │
│  │   { hookId: 'ci-on-main', hook: {...}, eventType: 'commit' },      │ │
│  │   { hookId: 'update-dashboard', hook: {...}, eventType: 'commit' } │ │
│  │ ]                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Execution Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Input: Triggered Hook                                                   │
│  triggeredHook = {                                                       │
│    hookId: 'ci-on-main',                                                 │
│    hook: h=(e,φ,a),                                                      │
│    eventType: 'commit',                                                  │
│    timestamp: t                                                          │
│  }                                                                       │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 1: Acquire Lock (CAS)                                             │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ lockName = `workflow-${hookId}-${timestamp}`                        │ │
│  │ lockAcquired = await gitNativeIO.acquireLock(lockName, {           │ │
│  │   timeout: 300000,  // 5 minutes                                    │ │
│  │   exclusive: true                                                   │ │
│  │ })                                                                  │ │
│  │                                                                     │ │
│  │ if (!lockAcquired) {                                                │ │
│  │   throw Error('Lock acquisition failed')                            │ │
│  │ }                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 2: Build Workflow DAG (S, D⊆S×S)                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ workflowDef = hook.action                                           │ │
│  │                                                                     │ │
│  │ // Add steps to DAG                                                 │ │
│  │ for (step of workflowDef.steps) {                                   │ │
│  │   workflowEngine.addStep(step.id, step.definition)                  │ │
│  │ }                                                                   │ │
│  │                                                                     │ │
│  │ // Add edges for dependencies                                       │ │
│  │ for (step of workflowDef.steps) {                                   │ │
│  │   if (step.dependsOn) {                                             │ │
│  │     for (depId of step.dependsOn) {                                 │ │
│  │       workflowEngine.addEdge(depId, step.id)                        │ │
│  │     }                                                               │ │
│  │   }                                                                 │ │
│  │ }                                                                   │ │
│  │                                                                     │ │
│  │ // Validate (check for cycles)                                      │ │
│  │ validation = workflowEngine.validate()                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 3: Calculate Topological Order (≺)                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ executionOrder = workflowEngine.calculateTopologicalOrder()         │ │
│  │                                                                     │ │
│  │ Example DAG:                                                        │ │
│  │   run-tests ──┐                                                     │ │
│  │               ├──▶ run-lint ──▶ build ──▶ deploy                   │ │
│  │   run-docs ───┘                                                     │ │
│  │                                                                     │ │
│  │ Topological order: [run-tests, run-docs, run-lint, build, deploy]  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 4: Execute Steps (c_i^out = α_i(c^in, K_t))                      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ for (stepId of executionOrder) {                                    │ │
│  │   // Check dependencies completed                                   │ │
│  │   for (depId of step.dependencies) {                                │ │
│  │     assert(depStep.status === 'completed')                          │ │
│  │   }                                                                 │ │
│  │                                                                     │ │
│  │   // Prepare input context                                          │ │
│  │   inputContext = prepareInputContext(stepId)                        │ │
│  │                                                                     │ │
│  │   // Execute step                                                   │ │
│  │   output = await executeStepFunction(                               │ │
│  │     step.definition,                                                │ │
│  │     inputContext,                                                   │ │
│  │     knowledgeState                                                  │ │
│  │   )                                                                 │ │
│  │                                                                     │ │
│  │   // Update state                                                   │ │
│  │   currentState = { ...currentState, ...output }                     │ │
│  │ }                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 5: Write Receipt & Snapshot                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ // Write execution receipt to git notes                             │ │
│  │ await gitNativeIO.writeReceipt(hookId, result, {                    │ │
│  │   executionId,                                                      │ │
│  │   timestamp,                                                        │ │
│  │   duration                                                          │ │
│  │ })                                                                  │ │
│  │                                                                     │ │
│  │ // Store execution snapshot to git refs                             │ │
│  │ await gitNativeIO.storeSnapshot(                                    │ │
│  │   `workflow-${hookId}-${timestamp}`,                                │ │
│  │   result,                                                           │ │
│  │   { hookId, eventType, timestamp }                                  │ │
│  │ )                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 6: Release Lock                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ await gitNativeIO.releaseLock(lockName)                             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Output: Workflow Execution Result                                      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ {                                                                   │ │
│  │   success: true,                                                    │ │
│  │   hookId: 'ci-on-main',                                             │ │
│  │   stepResults: [...],                                               │ │
│  │   outputs: {...},                                                   │ │
│  │   executionId: 'exec_...',                                          │ │
│  │   duration: 1250ms                                                  │ │
│  │ }                                                                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Event Retention Policy Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Day 0: Event Created                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ event = {                                                           │ │
│  │   id: 'commit_1733241600_abc123',                                   │ │
│  │   type: 'commit',                                                   │ │
│  │   timestamp: 1733241600000,                                         │ │
│  │   data: { sha, branch, author, message, files, ... }               │ │
│  │ }                                                                   │ │
│  │                                                                     │ │
│  │ Storage: All triples in K_t                                         │ │
│  │   (gv:event/commit_..., rdf:type, gv:commitEvent)                  │ │
│  │   (gv:event/commit_..., gv:sha, "abc123")                          │ │
│  │   (gv:event/commit_..., gv:branch, "main")                         │ │
│  │   (gv:event/commit_..., gv:author, "user@example.com")             │ │
│  │   (gv:event/commit_..., gv:message, "Add feature X")               │ │
│  │   (gv:event/commit_..., gv:filesChanged, "5")                      │ │
│  │   (gv:event/commit_..., gv:insertions, "120")                      │ │
│  │   (gv:event/commit_..., gv:deletions, "30")                        │ │
│  │                                                                     │ │
│  │ Queryable: Full event details                                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ (Time passes: Day 1-89)
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Days 1-89: Full Details Retained                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Storage: All triples in K_t (unchanged)                             │ │
│  │ Queryable: Full event details                                       │ │
│  │                                                                     │ │
│  │ Retention metadata:                                                 │ │
│  │   detailExpiresAt: Day 90                                           │ │
│  │   aggregateExpiresAt: Day 365                                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ (Retention policy triggered: Day 90)
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Day 90: Convert to Aggregate                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ applyRetentionPolicy():                                             │ │
│  │                                                                     │ │
│  │ 1. Extract statistics:                                              │ │
│  │    stats = {                                                        │ │
│  │      eventType: 'commit',                                           │ │
│  │      timestamp: 1733241600000,                                      │ │
│  │      branch: 'main',                                                │ │
│  │      filesChanged: 5,                                               │ │
│  │      insertions: 120,                                               │ │
│  │      deletions: 30                                                  │ │
│  │    }                                                                │ │
│  │                                                                     │ │
│  │ 2. Create aggregate triples:                                        │ │
│  │    (gv:aggregate/commit_..., rdf:type, gv:EventAggregate)          │ │
│  │    (gv:aggregate/commit_..., gv:eventType, "commit")               │ │
│  │    (gv:aggregate/commit_..., gv:timestamp, "1733241600000")        │ │
│  │    (gv:aggregate/commit_..., gv:branch, "main")                    │ │
│  │    (gv:aggregate/commit_..., gv:filesChanged, "5")                 │ │
│  │    (gv:aggregate/commit_..., gv:insertions, "120")                 │ │
│  │    (gv:aggregate/commit_..., gv:deletions, "30")                   │ │
│  │                                                                     │ │
│  │ 3. Remove detailed triples:                                         │ │
│  │    DELETE (gv:event/commit_..., gv:sha, "abc123")                  │ │
│  │    DELETE (gv:event/commit_..., gv:author, "user@example.com")     │ │
│  │    DELETE (gv:event/commit_..., gv:message, "Add feature X")       │ │
│  │                                                                     │ │
│  │ Result: Reduced storage, key stats retained                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ (Time passes: Day 91-364)
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Days 91-364: Aggregate Retained                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Storage: Aggregate triples only                                     │ │
│  │ Queryable: Summary statistics (event type, timestamp, counts)       │ │
│  │ Not queryable: Detailed data (commit message, author, sha)          │ │
│  │                                                                     │ │
│  │ Use case: Dashboard time-series, trend analysis                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             │ (Retention policy triggered: Day 365)
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Day 365: Full Removal                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ removeEvent(eventId):                                               │ │
│  │                                                                     │ │
│  │ 1. Remove aggregate triples:                                        │ │
│  │    DELETE (gv:aggregate/commit_..., ...)                           │ │
│  │                                                                     │ │
│  │ 2. Remove event metadata:                                           │ │
│  │    eventMetadata.delete(eventId)                                    │ │
│  │                                                                     │ │
│  │ 3. Mark for Git GC:                                                 │ │
│  │    Event eligible for garbage collection                            │ │
│  │                                                                     │ │
│  │ Result: Complete removal from system                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points with Existing Codebase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEW COMPONENTS                                       │
│                                                                              │
│  ┌──────────────────────┐   ┌──────────────────────┐   ┌─────────────────┐ │
│  │ GitEventCapture.mjs  │   │GitLifecycleHooks.mjs │   │GitWorkflow      │ │
│  │                      │   │                      │   │Executor.mjs     │ │
│  │ Phase 1              │   │ Phase 1              │   │ Phase 1         │ │
│  └──────────┬───────────┘   └──────────┬───────────┘   └────────┬────────┘ │
│             │                          │                         │          │
│             │ Uses                     │ Uses                    │ Uses     │
│             ▼                          ▼                         ▼          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    EXISTING COMPONENTS                                 │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ knowledge-substrate.mjs                                          │ │ │
│  │  │ • KnowledgeSubstrate class                                       │ │ │
│  │  │ • addTriple(), query(), calculateDelta()                         │ │ │
│  │  │ Location: src/knowledge/knowledge-substrate.mjs                  │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ event-feed-processes.mjs                                         │ │ │
│  │  │ • GitEventProcess class                                          │ │ │
│  │  │ • generateEvent(), addListener()                                 │ │ │
│  │  │ Location: src/knowledge/event-feed-processes.mjs                 │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ knowledge-hook-primitive.mjs                                     │ │ │
│  │  │ • KnowledgeHook class                                            │ │ │
│  │  │ • execute(), evaluatePredicate(), executeAction()                │ │ │
│  │  │ Location: src/knowledge/knowledge-hook-primitive.mjs             │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ HookOrchestrator.mjs                                             │ │ │
│  │  │ • evaluate(), _evaluateHooks(), _executeTriggeredWorkflows()     │ │ │
│  │  │ Location: src/hooks/HookOrchestrator.mjs                         │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ PredicateEvaluator.mjs                                           │ │ │
│  │  │ • evaluate() for different predicate types                       │ │ │
│  │  │ Location: src/hooks/PredicateEvaluator.mjs                       │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ workflow-dag-execution.mjs                                       │ │ │
│  │  │ • WorkflowDAGExecution class                                     │ │ │
│  │  │ • addStep(), addEdge(), execute()                                │ │ │
│  │  │ Location: src/knowledge/workflow-dag-execution.mjs               │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ GitNativeIO.mjs                                                  │ │ │
│  │  │ • acquireLock(), writeReceipt(), storeSnapshot()                 │ │ │
│  │  │ Location: src/git-native/GitNativeIO.mjs                         │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ graph.mjs                                                        │ │ │
│  │  │ • useGraph() composable                                          │ │ │
│  │  │ • query(), validate(), serialize()                               │ │ │
│  │  │ Location: src/composables/graph.mjs                              │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── git-lifecycle/               # NEW DIRECTORY (Phase 1 & 2)
│   ├── GitEventCapture.mjs      # Event capture → RDF triples
│   ├── GitLifecycleHooks.mjs    # Hook pattern matching
│   ├── GitWorkflowExecutor.mjs  # Workflow execution
│   ├── AsyncEventProcessor.mjs  # Phase 2: Async processing
│   ├── MultiEventCorrelator.mjs # Phase 2: Event correlation
│   └── DashboardAggregator.mjs  # Phase 2: Dashboard data
│
├── knowledge/                    # EXISTING DIRECTORY
│   ├── knowledge-substrate.mjs   # Core RDF store (K_t)
│   ├── knowledge-hook-primitive.mjs # Hook: h=(e,φ,a)
│   ├── event-feed-processes.mjs  # Event processes
│   ├── workflow-dag-execution.mjs # Workflow DAG
│   └── ...
│
├── hooks/                        # EXISTING DIRECTORY
│   ├── HookOrchestrator.mjs      # Hook orchestration
│   ├── PredicateEvaluator.mjs    # Predicate evaluation
│   ├── HookParser.mjs            # Hook parsing
│   └── ...
│
├── git-native/                   # EXISTING DIRECTORY
│   ├── GitNativeIO.mjs           # Git-backed I/O
│   ├── LockManager.mjs           # CAS locks
│   ├── ReceiptWriter.mjs         # Receipt writing
│   └── ...
│
└── composables/                  # EXISTING DIRECTORY
    ├── graph.mjs                 # Graph operations
    ├── turtle.mjs                # Turtle parsing
    └── ...
```

---

**End of Visual Architecture Diagrams**
