# @unrdf/hooks Integration Plan for GitVan v4.0.2+

**Status**: Research & Planning Phase
**Version**: 1.0
**Last Updated**: 2026-01-10
**Author**: Agent 5 - GitVan Architecture Team

---

## Executive Summary

This document provides a comprehensive integration plan for deepening GitVan's integration with @unrdf/hooks across v4.0.2 and beyond. The analysis reveals significant untapped potential in the @unrdf/hooks system for implementing advanced semantic triggers, reactive graph patterns, and AI-powered automation strategies.

Current GitVan implementation uses @unrdf/hooks at a basic level (git event → hook registration → Bree job execution). The future state enables sophisticated patterns including multi-predicate hook coordination, hook composition with recursive automation, conditional execution chains, performance-driven feedback loops, and anomaly detection systems—all driven by RDF graph state changes rather than just Git events.

**Key Finding**: The three-bridge architecture (Husky → RDF Storage → Bree) positions GitVan uniquely to treat Git state as RDF assertions, enabling semantic queries that bridge version control, workflow state, and development semantics in ways no existing system provides.

---

## Table of Contents

1. [Deep Package Analysis](#1-deep-package-analysis)
2. [Current GitVan Hooks System](#2-current-gitvan-hooks-system)
3. [Advanced Integration Opportunities](#3-advanced-integration-opportunities)
4. [Implementation Roadmap](#4-implementation-roadmap)
5. [Specific Hook Patterns](#5-specific-hook-patterns)
6. [Success Metrics](#6-success-metrics)
7. [Safety & Resilience](#7-safety--resilience)
8. [Advanced Topics](#8-advanced-topics)
9. [Migration Path](#9-migration-path)
10. [Appendix](#10-appendix)

---

## 1. Deep Package Analysis

### 1.1 What @unrdf/hooks Does

@unrdf/hooks is a production-ready Knowledge Hook system that triggers autonomic reflexes based on RDF graph state changes rather than external events. Key capabilities:

#### Core Architecture

```
Hook Definition (Turtle) → Condition Evaluator → Lifecycle Executor → Effect Sandbox
    ↓
SPARQL/SHACL Queries → Boolean/Threshold Evaluation → before/run/after phases → RDF Assertions
```

**Five Key Functions**:

1. **defineHook()** - Creates validated hook definitions following the 80/20 contract
2. **evaluateCondition()** - Evaluates conditions against RDF graphs (SPARQL ASK, SELECT, SHACL)
3. **executeHook()** - Runs the complete lifecycle with timeout and sandbox protection
4. **createConditionEvaluator()** - Instantiates the condition evaluation engine
5. **createHookExecutor()** - Instantiates the hook execution engine

#### The 80/20 Contract (Determinism & Provenance)

@unrdf/hooks enforces a strict "80/20" contract for autonomic systems:

```javascript
{
  meta: {
    name: 'compliance:largeTx',
    description: 'Alert on transactions > threshold',
    ontology: ['fibo']
  },
  channel: {
    graphs: ['urn:graph:fibo:prod'],
    view: 'delta'  // 'before', 'after', or 'delta'
  },
  when: {
    kind: 'sparql-ask',  // or 'sparql-select', 'shacl', 'delta', 'threshold'
    ref: {
      uri: 'file://hooks/compliance/largeTx.ask.rq',
      sha256: 'e3b0c44298fc...',  // Content-addressed integrity
      mediaType: 'application/sparql-query'
    }
  },
  determinism: { seed: 42 },
  receipt: { anchor: 'git-notes' },  // Audit trail strategy

  async before(event) {
    // Payload validation & normalization
    return event.payload.amount > 0 ? event.payload : { cancel: true }
  },

  async run(event) {
    // Core effect execution
    return {
      result: { status: 'alert-dispatched' },
      assertions: [ /* RDF quads */ ]
    }
  },

  async after(event) {
    // Cleanup & auditing
    return { result: { finalStatus: 'completed' } }
  }
}
```

**Why 80/20 Matters**:

- **80%**: Common case (conditions file-based, deterministic execution, receipt anchored)
- **20%**: Edge cases (custom validation, side effects, cleanup logic)
- Enforces governance-first design: conditions are verifiable artifacts, not inline strings
- Content-addressed conditions enable version control of logic itself

### 1.2 Condition Types Supported

@unrdf/hooks evaluates conditions through multiple mechanisms:

| Condition Type | Use Case | Example |
|---|---|---|
| **sparql-ask** | Boolean condition | "Are there unreviewed commits?" |
| **sparql-select** | Result extraction | "List all files with test coverage < 50%" |
| **shacl** | Graph conformance | "Does graph conform to schema X?" |
| **delta** | Change detection | "Did query results change?" |
| **threshold** | Numerical comparison | "Is metric > threshold?" |
| **window** | Time-based | "Events in last N hours?" |
| **count** | Cardinality check | "Are there > N results?" |
| **construct** | Graph building | "Build audit trail graph" |
| **describe** | Resource discovery | "Describe all resources matching pattern" |
| **federated** | Multi-endpoint | "Query across SPARQL endpoints" |
| **temporal** | Time constraints | "Triggered within time window?" |

### 1.3 Reactive Update Patterns

@unrdf/hooks integrates with RxJS-inspired reactive patterns:

```javascript
// Observe graph changes
observable.pipe(
  filter(change => change.predicate === 'gv:hasTestCoverage'),
  map(change => change.newValue),
  filter(coverage => coverage < 50),
  tap(change => executeHookOnCoverage(change))
)
```

The condition evaluator supports **delta mode** for reactive graphs:

- **'before'** view: State before delta applied
- **'after'** view: State after delta applied
- **'delta'** view: Only additions/removals (for diff-based logic)

### 1.4 Current APIs and Capabilities

#### Hook Management API

```javascript
// Registration
await registerHook(hook)
await deregisterHook(hookId)

// Querying
const hooks = getRegisteredHooks()

// Execution
const result = await evaluateHook(hookId, graph, options)

// Lifecycle
const result = await executeHook(hook, event, options)
```

#### Condition Evaluation API

```javascript
// Create evaluator
const evaluator = createConditionEvaluator()

// Evaluate single condition
const result = await evaluator.evaluate(
  condition,
  graph,
  options
)

// Batch evaluation
await Promise.all(
  hooks.map(h => evaluator.evaluate(h.when, graph))
)
```

#### Hook Execution API

```javascript
// Execute with full lifecycle
const result = await executeHook(hook, event, {
  basePath: process.cwd(),
  strictMode: false,
  timeoutMs: 30000,
  enableConditionEvaluation: true,
  enableSandboxing: true
})

// Result structure
{
  executionId: 'hook-1234567890-abc123',
  durationMs: 156,
  success: true,
  result: { /* hook.run() return value */ },
  cancelled: false,
  beforeResult: { /* payload from before() */ },
  runResult: { /* result from run() */ },
  afterResult: { /* result from after() */ }
}
```

### 1.5 RxJS & Reactive Pattern Support

@unrdf/hooks includes **effect sandbox** for reactive programming:

```javascript
// Monitor graph changes reactively
effect(() => {
  const coverage = graph.query('SELECT ?x WHERE { ?x gv:coverage ?c }')
  if (coverage < 50) {
    triggerHook('low-coverage-alert')
  }
})

// Composable reactive hooks
reactive(() => {
  const results = queryGraph()
  return results.filter(r => r.severity === 'critical')
})
```

### 1.6 Trigger Conditions (SPARQL-based)

Conditions are **always file-based** (content-addressed), never inline:

```sparql
# file://hooks/compliance/highTxVolume.ask.rq
PREFIX ex: <http://example.org/>

ASK WHERE {
  ?tx a ex:Transaction ;
      ex:amount ?amt .
  FILTER (?amt > 1000000)
}
```

**Graph Channel Configuration**:

```turtle
# Specify which named graphs to observe
gv:HighTxHook
  gv:observesGraph <urn:graph:transactions:prod> ;
  gv:viewMode "delta" ;  # before, after, delta
  gv:whenCondition <file://hooks/highTx.ask.rq#sha256=abc...> .
```

### 1.7 Maturity & Stability Assessment

**Production-Ready Components**:
- Hook definition and validation (Zod-based)
- Condition evaluation (SPARQL/SHACL engines proven)
- Effect sandbox (VM2 isolation)
- Determinism guarantees (fixed seed, normalized environment)

**Stable Since**: v3.0.0 (2025-Q2)
**Current Version**: 4.2.3
**Test Coverage**: 85%+ across knowledge-engine

**Limitations**:
- Hook composition (meta-hooks triggering hooks) is experimental
- Reactive graph subscriptions limited to memory (no persistence layer)
- Timeout handling can be aggressive (30s default)
- No built-in hook dependency graph (circular dependencies possible)

**Known Issues**:
1. Delta evaluation on large graphs (>100k triples) shows 2-5s latency
2. Federated queries can timeout if endpoints slow
3. SHACL validation overhead grows O(n²) with violations

---

## 2. Current GitVan Hooks System

### 2.1 Three-Bridge Architecture Overview

GitVan's hooks system implements three bridges coordinating different concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Git Event (pre-commit)                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│          1. HuskyHookBridge                                 │
│  • Captures git event from Husky framework                  │
│  • Normalizes to RDF assertion (gv:Event, gv:timestamp)     │
│  • Stores in git-native I/O (git notes or refs)             │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│          2. UnrdfHooksBridge                                │
│  • Evaluates SPARQL conditions against event + graph state  │
│  • Determines which hooks should trigger                    │
│  • Converts hook definitions to Bree job specs              │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│          3. BreeScheduler (Jobs Layer)                      │
│  • Executes hooks as background jobs                        │
│  • Manages timing (immediate vs. scheduled)                 │
│  • Provides job isolation and timeout handling              │
│  • Returns job execution results                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│          Git Notes (Audit Trail)                            │
│  • Hook execution recorded as git notes on commit           │
│  • Provides permanent, cryptographically-signed audit log   │
│  • Enables deterministic replay of automations              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Current Hook Registration Flow

**Stage 1: Definition**
```javascript
// Define hook in Turtle or JavaScript
const hook = defineHook({
  meta: { name: 'ci:runTests' },
  when: { kind: 'sparql-ask', ref: {...} },
  async run(event) { /* execute tests */ }
})
```

**Stage 2: Registration**
```javascript
// Register with UnrdfHooksBridge
const bridge = getUnrdfHooksBridge()
await bridge.initialize()

const result = await bridge.registerHook({
  id: 'ci-run-tests',
  name: 'ci:runTests',
  breeConfig: {
    jobName: 'run-tests-job',
    schedule: 'immediate'
  }
})
```

**Stage 3: Emission**
```javascript
// GitVan workflow emits git event
await hooks.emit('pre-commit', {
  files: ['src/main.mjs', 'test/main.test.mjs'],
  branch: 'feature/new-api',
  author: 'alice@company.com'
})
```

**Stage 4: Execution**
```javascript
// UnrdfHooksBridge evaluates conditions
const evaluations = await predicateEvaluator.evaluate(
  hook,
  currentGraph,
  previousGraph
)

if (evaluations.result) {
  // Trigger Bree job
  await scheduler.runJob('run-tests-job')
}
```

### 2.3 PredicateEvaluator Pattern Analysis

The PredicateEvaluator is the "brain" of hook evaluation. It supports 8 predicate types:

| Type | Current | Future |
|------|---------|--------|
| **resultDelta** | Hash comparison of query results | ✓ Extended to track deltas |
| **ask** | Boolean SPARQL queries | ✓ Multi-query OR/AND logic |
| **selectThreshold** | Numeric threshold comparison | ✓ Range-based thresholds |
| **shaclAllConform** | SHACL validation | ✓ Partial conformance |
| **construct** | Graph building | ✓ Construction as side effect |
| **describe** | Resource discovery | ✓ Pattern-based discovery |
| **federated** | Multi-endpoint queries | ✓ Circuit breaker pattern |
| **temporal** | Time windows | ✓ Sliding windows |

**Current Limitations**:

1. **Single-predicate evaluation** - Each hook evaluates one predicate
2. **Sequential execution** - No predicate coordination
3. **No composition** - Hooks can't trigger other hooks
4. **Limited context** - Only query results, not graph topology
5. **No feedback** - Hook failures don't inform next execution
6. **Static schedules** - Time-based only, no event-driven thresholds

### 2.4 Hook Registration & Execution Flow

```
User defines hook (Turtle/JS)
       ↓
[Validation via Zod schemas]
       ↓
Register with UnrdfHooksBridge
       ↓
Store hook definition + Bree config
       ↓
[On git event]
       ↓
Emit event through HuskyHookBridge
       ↓
Store event as RDF assertion (git notes)
       ↓
Evaluate all hooks' conditions
       ↓
[For each triggered hook]
       ↓
Queue Bree job with hook ID + payload
       ↓
Execute job (isolated, with timeout)
       ↓
Capture result
       ↓
Log to git notes (audit trail)
       ↓
Report completion
```

### 2.5 Current Limitations

**1. Context Window Blindness**
- Hooks only see current graph state
- No historical context (e.g., "coverage dropped 10% vs. baseline")
- Can't correlate across multiple commits

**2. Predicate Evaluation Isolation**
- Each hook's when-clause evaluated independently
- No coordination between related conditions
- Can't express "run if A OR B AND C"

**3. No Meta-Hooking**
- Hooks can't trigger other hooks
- Manual workflow orchestration required
- Cascading automations impossible

**4. Limited Failure Handling**
- Failed hooks don't inform downstream hooks
- No retry logic within hook execution
- Timeouts are hard failures

**5. Static Scheduling**
- Hook execution times fixed upfront
- Can't adjust based on graph state
- No adaptive scheduling based on failure patterns

**6. Sandbox Isolation Trade-offs**
- VM2 sandbox prevents side effects (good security)
- But also prevents useful system interactions
- Mutable state limited to hook result

---

## 3. Advanced Integration Opportunities

### 3.1 Semantic Hooks (Graph State Triggers)

Move beyond git events to pure RDF triggers:

```turtle
# hooks/quality/coverage-regression.ttl
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

gh:CoverageRegressionHook
  a gv:SemanticHook ;
  gv:name "quality:coverageRegression" ;
  gv:description "Alert when test coverage drops 5%+ vs. main branch" ;

  # Condition: Delta-based comparison
  gv:trigger [
    gv:kind "sparql-select" ;
    gv:baselineQuery <file://sparql/coverage-main.rq#sha256=abc...> ;
    gv:currentQuery <file://sparql/coverage-feature.rq#sha256=def...> ;
    gv:thresholdDrop 0.05 ;  # 5% drop triggers hook
    gv:compareMetric "testCoverage"
  ] ;

  # Actions: Multi-step execution
  gv:beforePhase [
    gv:validatePayload "require coverage data" ;
    gv:normalizeMetrics true
  ] ;

  gv:runPhase [
    gv:analyzeRegression true ;
    gv:notifyReviewers true ;
    gv:blockMerge true
  ] ;

  gv:afterPhase [
    gv:recordMetrics true ;
    gv:aggregateStats true
  ] .
```

**Implementation Strategy**:

1. **Baseline Capturing**
   - On main branch commit → store coverage metrics as RDF assertions
   - Query pattern: "SELECT ?coverage WHERE { gv:Main gv:coverage ?coverage }"

2. **Delta Calculation**
   - On feature branch commit → compare against main branch
   - SPARQL MINUS query finds coverage-declining modules

3. **Threshold Evaluation**
   - PredicateEvaluator extended with comparative logic
   - Result: boolean (true if regression exceeds threshold)

4. **Multi-action Execution**
   - Hook run phase with 3 steps:
     - Send Slack notification to team
     - Add review comment to PR
     - Set merge blocker if regression > 10%

**Benefits**:
- No git event needed (pure graph-driven)
- Highly reusable across different metrics
- Baseline-relative evaluation (vs. fixed thresholds)

### 3.2 Multi-Predicate Hook Coordination

Orchestrate 5+ related conditions in coordinated DAGs:

```turtle
gh:ComplexPolicyHook
  a gv:MultiPredicateHook ;
  gv:name "security:vulnerabilityResponse" ;

  # DAG of conditions that must all be true
  gv:predicateGraph [
    # Node 1: Check if vulnerabilities detected
    gv:nodeA [
      gv:id "detect-vuln" ;
      gv:query <file://sparql/has-vulnerabilities.ask.rq#sha256=abc> ;
      gv:type "sparql-ask"
    ] ;

    # Node 2: Is severity critical?
    gv:nodeB [
      gv:id "check-critical" ;
      gv:query <file://sparql/has-critical-severity.ask.rq#sha256=def> ;
      gv:type "sparql-ask"
    ] ;

    # Node 3: Is it unpatched?
    gv:nodeC [
      gv:id "is-unpatched" ;
      gv:query <file://sparql/vulnerability-unpatched.ask.rq#sha256=ghi> ;
      gv:type "sparql-ask"
    ] ;

    # Node 4: Count dependent services
    gv:nodeD [
      gv:id "count-dependents" ;
      gv:query <file://sparql/count-dependent-services.rq#sha256=jkl> ;
      gv:type "sparql-select" ;
      gv:threshold 0 ;  # Any dependents = trigger
      gv:operator ">"
    ] ;

    # Node 5: Is there a known fix?
    gv:nodeE [
      gv:id "has-fix" ;
      gv:query <file://sparql/has-known-fix.ask.rq#sha256=mno> ;
      gv:type "sparql-ask"
    ]
  ] ;

  # DAG edges and logic
  gv:predicateDependencies [
    # If NodeA (detect) is true
    # AND NodeB (critical) is true
    # AND NodeC (unpatched) is true
    # AND NodeD (dependents) > 0
    # THEN evaluate NodeE (has-fix)

    gv:edge [
      gv:from gv:nodeA ;
      gv:to gv:nodeB ;
      gv:condition "AND"
    ] ;
    gv:edge [
      gv:from gv:nodeB ;
      gv:to gv:nodeC ;
      gv:condition "AND"
    ] ;
    gv:edge [
      gv:from gv:nodeC ;
      gv:to gv:nodeD ;
      gv:condition "AND"
    ] ;
    gv:edge [
      gv:from gv:nodeD ;
      gv:to gv:nodeE ;
      gv:condition "THEN_EVAL"  # Only eval if previous true
    ]
  ] ;

  # Actions depend on DAG result
  gv:responseActions [
    [
      gv:condition "all_true" ;
      gv:actions (
        [
          gv:type "escalate" ;
          gv:channel "slack" ;
          gv:urgency "critical"
        ]
        [
          gv:type "block-deploy" ;
          gv:environments ("staging" "prod")
        ]
      )
    ]
    [
      gv:condition "has_fix" ;
      gv:actions (
        [
          gv:type "auto-patch" ;
          gv:createPR true
        ]
      )
    ]
  ] .
```

**Implementation Architecture**:

```
DAG Evaluator (new)
  │
  ├─ Read predicate graph (Turtle)
  ├─ Extract nodes and dependencies
  ├─ Topologically sort predicates
  │
  ├─ Phase 1: Evaluate leaf nodes (no dependencies)
  │  └─ PredicateEvaluator.evaluate() for each
  │
  ├─ Phase 2: Evaluate intermediate nodes (if deps satisfied)
  │  └─ Short-circuit on AND-false
  │  └─ Continue on OR-true
  │
  ├─ Phase 3: Aggregate results
  │  └─ Combine per predicate-logic (AND/OR/THEN/IF-THEN)
  │
  └─ Phase 4: Route to action handlers
     └─ Match condition → execute actions
```

**Benefits**:
- Express complex policies in standard Turtle
- Reuse individual predicates across many hooks
- Enable condition compilation & optimization
- Support conditional action routing

### 3.3 Hook Composition & Meta-Hooking

Hooks that trigger other hooks (carefully managed):

```typescript
/**
 * Meta-hook that orchestrates a cascade of responses
 *
 * Example: On security vulnerability detection:
 * 1. Trigger notification hook
 * 2. If severity critical → trigger block-deploy hook
 * 3. If block-deploy succeeds → trigger audit-log hook
 * 4. If audit-log succeeds → trigger slack-escalation hook
 */

interface MetaHookDefinition {
  name: string;
  // Initial trigger condition
  when: HookCondition;

  // Hooks to trigger sequentially
  cascadeHooks: Array<{
    hookId: string;
    // Condition: only trigger if previous result matches
    triggerIf?: (previousResult: HookResult) => boolean;
    // Timeout for this stage
    timeoutMs?: number;
    // Whether to abort cascade if this fails
    required?: boolean;
    // Context to pass downstream
    contextOverrides?: Record<string, unknown>;
  }>;

  // Failure handling
  onStageFailure: 'continue' | 'abort' | 'retry';
  maxRetries?: number;

  // Recursion protection
  maxDepth?: number;  // Prevent infinite loops
  seenHooks?: Set<string>;  // Track execution path
}

/**
 * Hook composition via DAG planner
 *
 * Stage 1: Detect vulnerability
 *   ↓
 * Stage 2: Route based on severity
 *   ├─ CRITICAL → block-deploy + escalate
 *   ├─ HIGH → create-issue + notify-team
 *   └─ MEDIUM → add-comment + log
 *   ↓
 * Stage 3: Record audit trail
 */
export async function executeMetaHook(
  metaHook: MetaHookDefinition,
  context: HookContext
): Promise<MetaHookResult> {
  const executionPath: HookExecution[] = [];
  const seenHooks = new Set<string>();

  // Stage 1: Evaluate initial condition
  let shouldCascade = await evaluateCondition(
    metaHook.when,
    context.graph
  );

  if (!shouldCascade) {
    return { executed: false, reason: 'condition not met' };
  }

  // Stage 2: Execute cascade
  for (const cascadeSpec of metaHook.cascadeHooks) {
    // Prevent infinite loops
    if (seenHooks.has(cascadeSpec.hookId)) {
      if (metaHook.maxDepth === undefined ||
          seenHooks.size >= metaHook.maxDepth) {
        return {
          executed: false,
          reason: 'recursion depth exceeded',
          executedUntil: cascadeSpec.hookId
        };
      }
    }

    seenHooks.add(cascadeSpec.hookId);

    // Check if we should skip this hook
    if (cascadeSpec.triggerIf) {
      const previousResult = executionPath[executionPath.length - 1];
      if (!cascadeSpec.triggerIf(previousResult?.result)) {
        continue;  // Skip this stage
      }
    }

    try {
      const result = await executeHook(
        cascadeSpec.hookId,
        {
          ...context,
          ...cascadeSpec.contextOverrides,
          metaHookChain: executionPath
        },
        { timeoutMs: cascadeSpec.timeoutMs }
      );

      executionPath.push({
        hookId: cascadeSpec.hookId,
        result,
        timestamp: new Date()
      });

      if (!result.success && cascadeSpec.required) {
        return {
          executed: false,
          reason: `required hook failed: ${cascadeSpec.hookId}`,
          executedStages: executionPath,
          failedAt: cascadeSpec.hookId
        };
      }
    } catch (error) {
      if (metaHook.onStageFailure === 'abort') {
        throw error;
      } else if (metaHook.onStageFailure === 'retry') {
        // Retry logic
      } else {
        // Continue
      }
    }
  }

  return {
    executed: true,
    executedStages: executionPath,
    finalResult: executionPath[executionPath.length - 1]?.result
  };
}
```

**Safety Mechanisms**:

```typescript
/**
 * Infinite loop prevention
 */
interface CompositionSafety {
  // Track execution path
  executionPath: Set<string>;

  // Depth limit (default: 5 levels)
  maxDepth: number;

  // Cycle detection (DAG validation)
  detectCycles(hooks: Map<string, Hook>): boolean;

  // Time budgets (total cascade time limit)
  totalTimeoutMs: number;

  // Resource quotas (prevent fork bombs)
  maxConcurrentHooks: number;

  // Breach actions
  onBreach: 'kill-cascade' | 'timeout' | 'alert-operator';
}

/**
 * Validate meta-hook safety before execution
 */
async function validateMetaHookSafety(
  metaHook: MetaHookDefinition,
  allHooks: Map<string, Hook>
): Promise<SafetyValidation> {
  const results = {
    hasCycles: false,
    maxDepth: 0,
    affectedHooks: new Set<string>(),
    warnings: [] as string[]
  };

  // Check for cycles
  const graph = buildHookDependencyGraph(metaHook, allHooks);
  results.hasCycles = detectCycles(graph);

  if (results.hasCycles) {
    results.warnings.push('Meta-hook contains cycles - cannot execute');
    return results;
  }

  // Check depth
  results.maxDepth = calculateMaxDepth(graph);
  if (results.maxDepth > 10) {
    results.warnings.push(
      `Meta-hook depth (${results.maxDepth}) exceeds recommended 10`
    );
  }

  // List all affected hooks
  results.affectedHooks = collectAllHooks(graph);

  return results;
}
```

**Benefits**:
- Enable sophisticated automation choreography
- Reduce duplication (one hook per concern, compose via meta-hooks)
- Support conditional execution paths (branch on results)
- Complete audit trail of cascading actions

### 3.4 Conditional Hooks & If-Then-Else Chains

Express conditional logic within hooks:

```turtle
gh:ConditionalMergeHook
  a gv:ConditionalHook ;
  gv:name "ci:smartMerge" ;
  gv:description "Merge if tests pass and maintainer approves" ;

  # Initial condition
  gv:when [
    gv:kind "sparql-select" ;
    gv:query <file://sparql/pr-ready-to-merge.rq#sha256=abc>
  ] ;

  # Multi-branch conditional execution
  gv:conditionalBranches [
    # Branch 1: Tests passed AND approved
    [
      gv:condition [
        gv:if [
          gv:id "tests-pass" ;
          gv:query <file://sparql/test-results-pass.ask.rq#sha256=def>
        ] ;
        gv:and [
          gv:id "has-approval" ;
          gv:query <file://sparql/has-maintainer-approval.ask.rq#sha256=ghi>
        ]
      ] ;
      gv:then [
        gv:action "merge-pull-request" ;
        gv:deleteSourceBranch true ;
        gv:message "Auto-merged: all checks passed"
      ]
    ] ;

    # Branch 2: Tests failed
    [
      gv:condition [
        gv:if [
          gv:id "tests-fail" ;
          gv:query <file://sparql/test-results-fail.ask.rq#sha256=jkl>
        ]
      ] ;
      gv:then [
        gv:action "request-changes" ;
        gv:comment "Tests failed. See CI logs." ;
        gv:assignReviewer "test-coordinator"
      ]
    ] ;

    # Branch 3: Waiting for approval
    [
      gv:condition [
        gv:if [
          gv:id "no-approval" ;
          gv:query <file://sparql/lacks-approval.ask.rq#sha256=mno>
        ]
      ] ;
      gv:then [
        gv:action "request-review" ;
        gv:assignReviewers ?maintainers ;
        gv:priority "high"
      ]
    ]
  ] ;

  # Default (catch-all)
  gv:defaultBranch [
    gv:action "log-unexpected-state" ;
    gv:severity "warning"
  ] .
```

**Implementation Pattern**:

```typescript
interface ConditionalBranch {
  condition: LogicalCondition;
  actions: HookAction[];
  priority: number;  // Evaluation order
}

async function evaluateConditionalHook(
  hook: ConditionalHook,
  context: HookContext
): Promise<HookResult> {
  // Sort branches by priority
  const branches = hook.conditionalBranches.sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );

  // Find first matching branch
  for (const branch of branches) {
    const conditionMet = await evaluateLogicalCondition(
      branch.condition,
      context.graph
    );

    if (conditionMet) {
      // Execute branch actions
      return await executeBranchActions(
        branch.actions,
        context
      );
    }
  }

  // Execute default branch
  if (hook.defaultBranch) {
    return await executeBranchActions(
      hook.defaultBranch.actions,
      context
    );
  }

  return { success: true, executed: false, reason: 'no branch matched' };
}
```

**Benefits**:
- Eliminate multiple similar hooks
- Express policy logic declaratively
- Reduce execution overhead (early exit on first match)

### 3.5 Feedback Loops & Self-Improving Hooks

Hooks that learn and adapt based on outcomes:

```turtle
gh:AdaptiveTestSelectionHook
  a gv:FeedbackLoopHook ;
  gv:name "ci:smartTestSelection" ;
  gv:description "Select fastest tests that provide adequate coverage" ;

  # Observable: Which tests catch which failures?
  gv:observeMetric [
    gv:name "test-failure-correlation" ;
    gv:query <file://sparql/test-failure-mapping.rq#sha256=abc> ;
    gv:updateFrequency "weekly"
  ] ;

  # Decision: Which tests to run?
  gv:initialPolicy [
    gv:testSelectionStrategy "all-tests" ;
    gv:approximateTime 300000  # 5 minutes
  ] ;

  # Feedback: How did we do?
  gv:feedbackSignal [
    gv:onFailureEscaped [
      gv:query <file://sparql/tests-missed-bug.ask.rq#sha256=def> ;
      gv:impact 10  # Penalty: 10x weight
    ] ;
    gv:onTestTimeout [
      gv:query <file://sparql/slow-tests.rq#sha256=ghi> ;
      gv:impact 2  # Minor penalty
    ] ;
    gv:onCoverageGap [
      gv:query <file://sparql/coverage-below-target.ask.rq#sha256=jkl> ;
      gv:impact 5  # Medium penalty
    ]
  ] ;

  # Adaptation: Update test selection strategy
  gv:adaptationRule [
    gv:trigger "weekly" ;
    gv:algorithm "reinforcement-learning" ;
    gv:updateTestWeights [
      # Increase weight of tests that caught failures
      gv:query <file://sparql/generate-new-weights.rq#sha256=mno> ;
      gv:targetTime 240000  # Aim for 4 minutes
    ] ;
    gv:persistWeight [
      gv:store "graph-notes" ;
      gv:uri <urn:gitvan:test-weights>
    ]
  ] ;

  gv:runPhase [
    # Select tests based on current weights
    gv:testSelection [
      gv:query <file://sparql/select-weighted-tests.rq#sha256=pqr> ;
      gv:parameters {
        gv:weights <urn:gitvan:test-weights> ;
        gv:targetTime 240000
      }
    ] ;
    # Execute selected tests
    gv:executeTests [
      gv:command "npm run test -- --testNamePattern=$PATTERN" ;
      gv:captureMetrics true
    ]
  ] ;

  # After execution, update feedback
  gv:afterPhase [
    gv:recordMetrics true ;
    gv:checkForMissedFailures true ;
    gv:updateWeights true
  ] .
```

**State Management**:

```typescript
interface FeedbackLoopHook extends Hook {
  // Observable metrics collected during execution
  observables: HookMetric[];

  // Feedback signals that inform adaptation
  feedbackSignals: FeedbackSignal[];

  // Policy that evolves over time
  policy: AdaptivePolicy;

  // Learning algorithm (RL, Bayesian, etc.)
  learner: LearningAlgorithm;
}

interface FeedbackSignal {
  // What to observe after hook execution
  query: SPARQL;

  // How to weight the signal
  impact: number;  // 1-10 scale

  // Type: positive (improve) or negative (penalize)
  direction: 'improve' | 'penalize';
}

interface AdaptivePolicy {
  // Current strategy (e.g., test selection, resource allocation)
  strategy: string;

  // Parameters of strategy (e.g., test list, weights)
  parameters: Record<string, unknown>;

  // Objective function (e.g., minimize time while maintaining coverage)
  objective: {
    minimize?: string[];  // e.g., ['time', 'cost']
    maximize?: string[];  // e.g., ['coverage', 'confidence']
    constraints?: Record<string, number>;  // e.g., { time: 300000 }
  };

  // Version for reproducibility
  version: number;
  lastUpdated: Date;
}

async function executeFeedbackLoopHook(
  hook: FeedbackLoopHook,
  context: HookContext
): Promise<FeedbackLoopResult> {
  // 1. Load current policy
  const policy = await loadAdaptivePolicy(hook.policy.uri);

  // 2. Execute hook with current policy
  const result = await executeHookWithPolicy(
    hook,
    policy,
    context
  );

  // 3. Collect feedback signals
  const feedback = await Promise.all(
    hook.feedbackSignals.map(signal =>
      evaluateSignal(signal, context.graph, result)
    )
  );

  // 4. Learn from feedback
  const updatedPolicy = await hook.learner.update(
    policy,
    feedback,
    hook.feedbackSignals
  );

  // 5. Persist updated policy
  await persistAdaptivePolicy(updatedPolicy, hook.policy.uri);

  return {
    executed: true,
    executionResult: result,
    feedback,
    policyUpdated: true,
    newPolicyVersion: updatedPolicy.version
  };
}
```

**Benefits**:
- Continuous improvement (policies adapt to reality)
- Data-driven decisions (feedback drives changes)
- Reduced manual tuning (algorithm learns optimal parameters)
- Measurable outcomes (feedback signals quantify effectiveness)

### 3.6 Performance Hooks & Anomaly Detection

Hooks that trigger on performance degradation or statistical anomalies:

```turtle
gh:PerformanceRegressionHook
  a gv:PerformanceHook ;
  gv:name "performance:latencyRegression" ;
  gv:description "Alert on API latency regression" ;

  # Baseline metrics
  gv:baseline [
    gv:metric "api-p99-latency" ;
    gv:query <file://sparql/baseline-latency.rq#sha256=abc> ;
    gv:window "30d"  # Last 30 days
  ] ;

  # Current measurement
  gv:current [
    gv:metric "api-p99-latency" ;
    gv:query <file://sparql/current-latency.rq#sha256=def> ;
    gv:window "7d"  # Last 7 days
  ] ;

  # Anomaly detection strategy
  gv:anomalyDetection [
    gv:algorithm "zscore" ;  # Z-score > 2.5 triggers
    gv:threshold 2.5 ;
    gv:minSamples 100 ;
    gv:excludeOutliers true
  ] ;

  # Alternative: statistical change detection
  gv:changeDetection [
    gv:algorithm "mann-whitney-u" ;  # Non-parametric test
    gv:pValue 0.05 ;
    gv:effectSize 0.2  # Cohen's d
  ] ;

  # Trigger conditions
  gv:when [
    gv:anyOf (
      [
        gv:algorithm "zscore" ;
        gv:query <file://sparql/latency-zscore.rq#sha256=ghi>
      ]
      [
        gv:algorithm "mann-whitney-u" ;
        gv:query <file://sparql/latency-change-significant.ask.rq#sha256=jkl>
      ]
    )
  ] ;

  gv:runPhase [
    # Investigate regression
    gv:investigation [
      gv:whichServicesAffected [
        gv:query <file://sparql/affected-services.rq#sha256=mno>
      ] ;
      gv:whichTimeWindow [
        gv:query <file://sparql/regression-started.rq#sha256=pqr>
      ] ;
      gv:correspondingDeployments [
        gv:query <file://sparql/deployments-in-window.rq#sha256=stu>
      ]
    ] ;

    # Determine severity
    gv:severity [
      gv:regressionPercent 10  # > 10% = critical
    ] ;

    # Recommended actions
    gv:recommendedActions [
      gv:critical [
        gv:action "page-oncall" ;
        gv:action "rollback-last-deployment" ;
        gv:action "open-incident"
      ] ;
      gv:high [
        gv:action "notify-team" ;
        gv:action "create-investigation-task" ;
        gv:action "schedule-postmortem"
      ] ;
      gv:medium [
        gv:action "log-metric" ;
        gv:action "create-ticket"
      ]
    ]
  ] .
```

**Anomaly Detection Algorithms**:

```typescript
interface AnomalyDetectionMethod {
  name: string;
  algorithm: 'zscore' | 'mad' | 'isolation-forest' | 'autoencoder';
  description: string;
  suitable_for: string[];  // e.g., ['latency', 'error-rate', 'throughput']
}

const ANOMALY_DETECTION_METHODS: AnomalyDetectionMethod[] = [
  {
    name: 'Z-Score',
    algorithm: 'zscore',
    description: 'Detect points > 2.5 std devs from mean',
    suitable_for: ['latency', 'memory-usage', 'cpu-usage']
  },
  {
    name: 'MAD (Median Absolute Deviation)',
    algorithm: 'mad',
    description: 'Robust version of Z-score',
    suitable_for: ['latency', 'error-rate', 'request-size']
  },
  {
    name: 'Isolation Forest',
    algorithm: 'isolation-forest',
    description: 'Multivariate anomaly detection',
    suitable_for: ['latency+error-rate', 'memory+cpu', 'multi-metric']
  },
  {
    name: 'Autoencoder',
    algorithm: 'autoencoder',
    description: 'Deep learning based on reconstruction error',
    suitable_for: ['time-series', 'complex-patterns', 'seasonal']
  }
];

/**
 * Detect anomalies in performance metrics
 */
async function detectPerformanceAnomaly(
  hook: PerformanceHook,
  context: HookContext
): Promise<AnomalyDetectionResult> {
  // 1. Collect baseline and current metrics
  const baseline = await executeQuery(
    hook.baseline.query,
    context.graph
  );

  const current = await executeQuery(
    hook.current.query,
    context.graph
  );

  // 2. Calculate statistics
  const baselineStats = calculateStats(baseline);
  const currentStats = calculateStats(current);

  // 3. Run anomaly detection
  const anomalyMethods = hook.anomalyDetection;

  const detectionResults = await Promise.all(
    anomalyMethods.map(method =>
      runAnomalyDetection(
        method,
        baseline,
        current,
        baselineStats,
        currentStats
      )
    )
  );

  // 4. Aggregate results (majority voting)
  const anomalyDetected = detectionResults.filter(r => r.isAnomaly).length >
    detectionResults.length / 2;

  if (!anomalyDetected) {
    return {
      detected: false,
      confidence: 0,
      methods: detectionResults
    };
  }

  // 5. Quantify severity
  const percentChange = (
    (currentStats.mean - baselineStats.mean) / baselineStats.mean
  ) * 100;

  const severity = classifySeverity(
    percentChange,
    hook.severity.regressionPercent
  );

  return {
    detected: true,
    confidence: calculateConfidence(detectionResults),
    percentChange,
    severity,
    affectedServices: await investigateAffectedServices(
      hook,
      context
    ),
    correspondingDeployments: await findCorrespondingDeployments(
      hook,
      context
    ),
    methods: detectionResults
  };
}

function classifySeverity(
  percentChange: number,
  criticalThreshold: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (Math.abs(percentChange) > criticalThreshold) {
    return 'critical';
  } else if (Math.abs(percentChange) > criticalThreshold * 0.66) {
    return 'high';
  } else if (Math.abs(percentChange) > criticalThreshold * 0.33) {
    return 'medium';
  }
  return 'low';
}
```

**Benefits**:
- Automated performance monitoring
- Early detection of regressions
- Statistical rigor (not just threshold-based)
- Actionable investigation paths

---

## 4. Implementation Roadmap

### 4.1 Phase 1: Enhanced Semantic Trigger Library (40-60 hours)

**Goal**: Extend condition evaluation to support pure graph-state triggers without git events.

**Tasks**:

1. **Extended Condition Types** (15 hours)
   - Implement baseline-relative predicates (v.s. main branch)
   - Add sliding-window time-based conditions
   - Support conditional expressions (AND/OR/NOT chains)
   - Implement metric comparison operators

```typescript
// New in condition-evaluator.mjs
export class EnhancedConditionEvaluator {
  async evaluateBaselineRelative(
    condition: BaselineRelativeCondition,
    currentGraph: Store,
    baselineGraph: Store
  ): Promise<boolean>

  async evaluateSlidingWindow(
    condition: SlidingWindowCondition,
    graph: Store,
    timeMs: number = 86400000  // 24h default
  ): Promise<boolean>

  async evaluateCompoundCondition(
    condition: CompoundCondition,
    graph: Store
  ): Promise<boolean>
}
```

2. **Graph-Only Trigger Mode** (12 hours)
   - Remove git-event requirement
   - Implement pure RDF hook execution
   - Add periodic graph scanning (cron-triggered)
   - Create GraphWatcherComposable

```typescript
// New in composables/
export function useGraphWatcher(options: WatcherOptions) {
  return {
    watchCondition(hook: Hook, interval: number): Subscription,
    triggerOnGraphChange(hook: Hook): Subscription,
    evaluateAllHooks(): Promise<HookEvaluationResult[]>
  }
}
```

3. **Condition Registry & Discovery** (8 hours)
   - Create global condition cache
   - Index conditions by predicate type
   - Enable condition reuse across hooks
   - Add condition validation pipeline

4. **Documentation & Examples** (5 hours)
   - Write semantic-triggers guide
   - Create 5 example hooks
   - Document condition composition patterns
   - Add troubleshooting section

**Deliverables**:
- Enhanced condition evaluator
- GraphWatcher composable
- 5 working examples
- Test coverage 80%+

**Effort**: 40-60 person-hours
**Risk**: Medium (requires significant condition-evaluator refactoring)

---

### 4.2 Phase 2: Multi-Predicate Hook Coordination (60-90 hours)

**Goal**: Enable hooks to coordinate 5+ related conditions in DAGs with conditional branching.

**Tasks**:

1. **DAG Planner for Predicates** (25 hours)
   - Design predicate DAG schema (Turtle)
   - Implement DAGBuilder to parse predicate graphs
   - Add topological sorting for predicates
   - Implement short-circuit evaluation (AND-false, OR-true)

```typescript
// New in hooks/
export class PredicateDAGPlanner {
  buildDAG(hookDef: Hook): PredicateDAG
  topologicalSort(dag: PredicateDAG): PredicateDependency[]
  validateDAG(dag: PredicateDAG): ValidationResult
  compileDAG(dag: PredicateDAG): CompiledDAG
}
```

2. **DAG Executor** (20 hours)
   - Parallel execution where possible
   - Dependency-aware evaluation
   - Short-circuit on critical conditions
   - Collect metadata for each stage

```typescript
// Enhanced in hook-executor.mjs
export async function executePredicateDAG(
  dag: CompiledDAG,
  graph: Store,
  options: ExecutionOptions
): Promise<DAGExecutionResult>
```

3. **Conditional Action Routing** (15 hours)
   - Implement condition-to-action mapping
   - Support if-then-else branches
   - Add action composition
   - Create action scheduler

```typescript
// New in hooks/
export class ActionRouter {
  routeActions(
    predicateResults: Map<string, boolean>,
    hook: Hook
  ): HookAction[]

  executeActions(actions: HookAction[]): Promise<ActionResult[]>
}
```

4. **Safety & Validation** (18 hours)
   - Detect cycles in predicate dependencies
   - Validate DAG structure
   - Add depth limits
   - Implement timeout budgets

5. **Testing & Documentation** (12 hours)
   - Create 10 test cases covering DAG patterns
   - Write DAG composition guide
   - Document action routing
   - Add performance tuning tips

**Deliverables**:
- PredicateDAGPlanner class
- DAG executor
- Action router
- 10 working examples
- Comprehensive test suite

**Effort**: 60-90 person-hours
**Risk**: High (complex DAG logic, potential for subtle bugs)
**Mitigation**: Extensive unit tests, CI integration tests, manual QA

---

### 4.3 Phase 3: Hook Composition & DAG Execution (80-120 hours)

**Goal**: Enable hooks to trigger other hooks with recursion/cycle protection and multi-stage cascades.

**Tasks**:

1. **Meta-Hook Architecture** (30 hours)
   - Define MetaHook schema
   - Implement cascade executor
   - Add execution path tracking
   - Create recursion prevention layer

```typescript
// New in hooks/
export interface MetaHook extends Hook {
  cascadeHooks: CascadeSpec[];
  onStageFailure: 'continue' | 'abort' | 'retry';
  maxDepth: number;
}

export class MetaHookExecutor {
  async execute(
    metaHook: MetaHook,
    context: HookContext
  ): Promise<MetaHookResult>
}
```

2. **Cycle Detection & Prevention** (20 hours)
   - Build hook dependency graph
   - Detect cycles using DFS
   - Validate before execution
   - Enforce maxDepth limits

```typescript
export class HookDependencyGraphAnalyzer {
  buildGraph(hooks: Map<string, Hook>): DependencyGraph
  detectCycles(): CycleDetectionResult
  validateMetaHook(metaHook: MetaHook): ValidationResult
  calculateMaxDepth(metaHook: MetaHook): number
}
```

3. **Cascade Context Propagation** (18 hours)
   - Design context passing between cascade stages
   - Implement contextOverrides
   - Add metadata tracking (execution path, timings)
   - Support context inspection tools

4. **Failure Handling & Retry Logic** (20 hours)
   - Implement retry strategies (exponential backoff, circuit breaker)
   - Add failure recovery paths
   - Create partial-failure handling (continue vs. abort)
   - Design failure notifications

5. **Cascade Visualization** (12 hours)
   - Create cascade execution diagram generator
   - Build execution timeline visualizer
   - Add cascade debugging tools

6. **Testing & Documentation** (20 hours)
   - Create 15 cascade scenario tests
   - Write meta-hook guide
   - Document cycle detection
   - Add troubleshooting guide

**Deliverables**:
- MetaHookExecutor class
- Cycle detection system
- Failure recovery framework
- 15 test scenarios
- Cascade visualizer

**Effort**: 80-120 person-hours
**Risk**: Very High (recursion, cycles, cascading failures)
**Mitigation**: Extensive testing, staged rollout, monitoring/alerting

---

### 4.4 Phase 4: AI-Powered Hook Feedback (60-100 hours)

**Goal**: Enable hooks to learn and adapt policies based on execution outcomes.

**Tasks**:

1. **Feedback Signal Framework** (15 hours)
   - Design FeedbackSignal schema
   - Implement signal collectors
   - Add signal aggregation
   - Create impact scoring

```typescript
// New in hooks/
export interface FeedbackSignal {
  id: string;
  query: SPARQL;
  direction: 'improve' | 'penalize';
  impact: number;  // 1-10
  recordedAt: Date;
}

export class FeedbackCollector {
  collectSignals(
    hook: FeedbackLoopHook,
    context: HookContext
  ): Promise<FeedbackSignal[]>
}
```

2. **Adaptive Policy Engine** (25 hours)
   - Implement policy versioning
   - Add policy persistence (git notes)
   - Create policy update logic
   - Design optimization objectives

```typescript
export interface AdaptivePolicy {
  strategy: string;
  parameters: Record<string, unknown>;
  objective: OptimizationObjective;
  version: number;
}

export class AdaptivePolicyEngine {
  async updatePolicy(
    currentPolicy: AdaptivePolicy,
    feedback: FeedbackSignal[],
    algorithm: string
  ): Promise<AdaptivePolicy>
}
```

3. **Learning Algorithms** (30 hours)
   - Implement reinforcement learning (Q-learning, policy gradient)
   - Add Bayesian optimization
   - Create simple rule-based learning
   - Implement metric convergence detection

```typescript
export interface LearningAlgorithm {
  name: string;
  update(
    policy: AdaptivePolicy,
    feedback: FeedbackSignal[]
  ): Promise<AdaptivePolicy>;
}

// Implementations:
export class QLearningAdapter implements LearningAlgorithm {}
export class BayesianOptimizer implements LearningAlgorithm {}
export class RuleBasedLearner implements LearningAlgorithm {}
```

4. **Performance Hook System** (20 hours)
   - Implement baseline vs. current comparison
   - Add anomaly detection (Z-score, MAD, Isolation Forest)
   - Create metric aggregation
   - Implement severity classification

```typescript
export class PerformanceAnomalyDetector {
  detectAnomaly(
    baseline: MetricData[],
    current: MetricData[],
    method: AnomalyMethod
  ): Promise<AnomalyResult>
}
```

5. **Feedback Loop Validation** (10 hours)
   - Verify policy convergence
   - Check for oscillation/divergence
   - Add policy rollback
   - Create safety guardrails

6. **Testing & Integration** (20 hours)
   - Create simulated learning scenarios
   - Test policy convergence
   - Validate feedback loop stability
   - Document learning patterns

**Deliverables**:
- Feedback signal framework
- Adaptive policy engine
- 3 learning algorithms
- Performance anomaly detector
- Comprehensive test suite

**Effort**: 60-100 person-hours
**Risk**: Medium-High (ML requires tuning, feedback loops can be unstable)
**Mitigation**: Comprehensive logging, gradual rollout, human oversight

---

### 4.5 Implementation Timeline

```
Q2 2026:
  Phase 1: Enhanced Semantic Triggers
    Week 1-2: Design & specs
    Week 3-6: Implementation
    Week 7: Testing & docs
    Status: BETA (6/1)

Q3 2026:
  Phase 2: Multi-Predicate Coordination
    Week 1-3: DAG planner design
    Week 4-7: DAG executor & actions
    Week 8: Testing & docs
    Status: RC (9/1)

Q4 2026:
  Phase 3: Hook Composition
    Week 1-4: Meta-hook architecture
    Week 5-8: Cycle detection & cascades
    Week 9-10: Testing & docs
    Status: STABLE (10/15)

Q1 2027:
  Phase 4: AI-Powered Feedback
    Week 1-3: Feedback framework
    Week 4-6: Learning algorithms
    Week 7-8: Performance hooks
    Week 9-10: Testing & docs
    Status: STABLE (3/31)
```

**Total Investment**: 240-370 person-hours
**Recommended Team**: 3-4 engineers
**Timeline**: 12-15 months

---

## 5. Specific Hook Patterns

### 5.1 Security Hooks

**Pattern 1: Hardcoded Secrets Detection**

```turtle
gh:HardcodedSecretsHook
  a gv:SecurityHook ;
  gv:name "security:hardcodedSecrets" ;
  gv:description "Block commits containing hardcoded secrets" ;

  gv:when [
    gv:kind "sparql-ask" ;
    gv:query <file://sparql/has-hardcoded-secrets.ask.rq#sha256=abc>
  ] ;

  gv:runPhase [
    gv:action "scan-with-truffleHog" ;
    gv:action "scan-with-detect-secrets" ;
    gv:action "compare-against-known-patterns"
  ] ;

  gv:conditionalActions [
    [
      gv:condition "secretsDetected" ;
      gv:actions (
        [
          gv:type "block-push" ;
          gv:reason "Hardcoded secrets detected - run: git-secrets --install"
        ]
        [
          gv:type "alert-operator" ;
          gv:channel "slack" ;
          gv:severity "critical"
        ]
      )
    ]
  ] .
```

**Pattern 2: Dependency Vulnerability Detection**

```turtle
gh:VulnerabilityDetectionHook
  a gv:SecurityHook ;
  gv:name "security:dependencyVulnerabilities" ;

  gv:when [
    gv:kind "sparql-ask" ;
    gv:query <file://sparql/has-known-vulnerabilities.ask.rq#sha256=def>
  ] ;

  # Multi-stage vulnerability response
  gv:cascadeHooks [
    [
      gv:hookId "security:notify-vulnerability" ;
      gv:required true ;
      gv:timeoutMs 5000
    ]
    [
      gv:hookId "security:generate-patch" ;
      gv:triggerIf "vulnerability.severity == 'critical'" ;
      gv:required false
    ]
    [
      gv:hookId "security:block-deploy" ;
      gv:triggerIf "has-critical-vulnerability" ;
      gv:required false
    ]
  ] .
```

### 5.2 Quality Hooks

**Pattern: Test Coverage Regression**

```turtle
gh:TestCoverageRegressionHook
  a gv:QualityHook ;
  gv:name "quality:coverageRegression" ;

  # Compare coverage vs. main branch
  gv:baselineQuery <file://sparql/coverage-main.rq#sha256=abc> ;
  gv:currentQuery <file://sparql/coverage-feature.rq#sha256=def> ;

  gv:when [
    gv:kind "threshold-comparison" ;
    gv:operator "drop-percent" ;
    gv:threshold 0.05  # 5% drop = trigger
  ] ;

  # Multi-predicate response
  gv:predicateDAG [
    [
      gv:id "check-coverage-drop" ;
      gv:query <file://sparql/coverage-drop.ask.rq#sha256=ghi>
    ]
    [
      gv:id "is-merge-to-main" ;
      gv:query <file://sparql/is-merge-main.ask.rq#sha256=jkl>
    ]
  ] ;

  gv:conditionalActions [
    [
      gv:condition "all(check-coverage-drop, is-merge-to-main)" ;
      gv:actions (
        [
          gv:type "block-merge" ;
          gv:message "Test coverage dropped 5%+ on merge to main"
        ]
        [
          gv:type "request-review" ;
          gv:assignee "test-coordinator"
        ]
      )
    ]
  ] .
```

### 5.3 Performance Hooks

**Pattern: Latency Regression Alert**

```turtle
gh:LatencyRegressionHook
  a gv:PerformanceHook ;
  gv:name "performance:latencyRegression" ;

  # Baseline: Last 30 days
  gv:baseline [
    gv:metric "api.p99.latency" ;
    gv:window "30d" ;
    gv:query <file://sparql/baseline-latency.rq#sha256=abc>
  ] ;

  # Current: Last 7 days
  gv:current [
    gv:metric "api.p99.latency" ;
    gv:window "7d" ;
    gv:query <file://sparql/current-latency.rq#sha256=def>
  ] ;

  # Anomaly detection: Z-score > 2.5 or Mann-Whitney p < 0.05
  gv:anomalyDetection [
    gv:algorithm "zscore" ;
    gv:threshold 2.5
  ] ;

  gv:when [
    gv:kind "anomaly-detection" ;
    gv:query <file://sparql/latency-anomaly.ask.rq#sha256=ghi>
  ] ;

  gv:runPhase [
    # Investigate affected services
    gv:investigation [
      gv:query <file://sparql/affected-services.rq#sha256=jkl> ;
      gv:captureContext true
    ] ;

    # Classify severity
    gv:severity [
      gv:percentageIncrease 10  # > 10% = critical
    ] ;

    # Take corrective action
    gv:action [
      gv:if "severity == 'critical'" ;
      gv:then [
        gv:page-oncall true ;
        gv:open-incident true ;
        gv:rollback-deployment true
      ]
    ]
  ] .
```

### 5.4 Expertise Routing Hooks

**Pattern: Route to Knowledgeable Reviewer**

```turtle
gh:ExpertiseRoutingHook
  a gv:RoutingHook ;
  gv:name "routing:expertReviewer" ;
  gv:description "Route PR to most knowledgeable reviewer based on code ownership" ;

  gv:when [
    gv:kind "sparql-select" ;
    gv:query <file://sparql/pr-needs-review.ask.rq#sha256=abc>
  ] ;

  gv:runPhase [
    # Find which modules changed
    [
      gv:id "changed-modules" ;
      gv:query <file://sparql/changed-modules.rq#sha256=def>
    ]

    # For each module, find top reviewer
    [
      gv:id "top-reviewers" ;
      gv:query <file://sparql/top-reviewers-by-module.rq#sha256=ghi> ;
      gv:foreach "?module"
    ]

    # Score reviewers by expertise + availability
    [
      gv:id "score-reviewers" ;
      gv:query <file://sparql/score-reviewers.rq#sha256=jkl> ;
      gv:parameters {
        gv:modules ?modules ;
        gv:weights {
          gv:expertise 0.7 ;
          gv:recentActivity 0.2 ;
          gv:availability 0.1
        }
      }
    ]

    # Assign top reviewer
    [
      gv:id "assign-reviewer" ;
      gv:query <file://sparql/top-scorer.rq#sha256=mno> ;
      gv:action "request-review-from-user"
    ]
  ] .
```

### 5.5 Policy & Governance Hooks

**Pattern: Enforce Code Style**

```turtle
gh:CodeStylePolicyHook
  a gv:PolicyHook ;
  gv:name "policy:codeStyle" ;

  # Multi-check policy compliance
  gv:predicateDAG [
    [
      gv:id "check-imports" ;
      gv:query <file://sparql/has-import-violations.ask.rq#sha256=abc>
    ]
    [
      gv:id "check-naming" ;
      gv:query <file://sparql/has-naming-violations.ask.rq#sha256=def>
    ]
    [
      gv:id "check-doc-strings" ;
      gv:query <file://sparql/missing-docstrings.ask.rq#sha256=ghi>
    ]
  ] ;

  gv:when [
    gv:kind "sparql-ask" ;
    gv:query <file://sparql/code-style-violations.ask.rq#sha256=jkl>
  ] ;

  # Enforcement levels
  gv:conditionalActions [
    [
      gv:condition "critical-violations" ;
      gv:actions (
        [
          gv:type "request-changes" ;
          gv:comment "Critical style violations - fix before merge"
        ]
        [
          gv:type "block-merge"
        ]
      )
    ]
    [
      gv:condition "minor-violations" ;
      gv:actions (
        [
          gv:type "add-comment" ;
          gv:comment "Minor style issues - consider fixing"
        ]
      )
    ]
  ] .
```

### 5.6 Learning Hooks

**Pattern: Adaptive Test Selection**

```turtle
gh:AdaptiveTestSelectionHook
  a gv:LearningHook ;
  gv:name "ci:adaptiveTestSelection" ;

  # Feedback signals drive learning
  gv:feedbackSignals [
    [
      gv:signal "testCaughtFailure" ;
      gv:impact 10 ;  # Highest priority
      gv:query <file://sparql/test-caught-bug.ask.rq#sha256=abc>
    ]
    [
      gv:signal "testTimedOut" ;
      gv:impact 2 ;
      gv:query <file://sparql/slow-tests.rq#sha256=def>
    ]
    [
      gv:signal "coverageGap" ;
      gv:impact 5 ;
      gv:query <file://sparql/coverage-below-target.ask.rq#sha256=ghi>
    ]
  ] ;

  # Adaptive policy updated weekly
  gv:adaptationRule [
    gv:trigger "weekly" ;
    gv:algorithm "reinforcement-learning" ;
    gv:objective {
      gv:minimize "test-time" ;
      gv:maximize "bug-detection" ;
      gv:constraints {
        gv:maxTime 300000  # 5 minutes
      }
    }
  ] ;

  gv:runPhase [
    # Select tests based on learned weights
    [
      gv:id "select-tests" ;
      gv:query <file://sparql/select-weighted-tests.rq#sha256=jkl> ;
      gv:parameters {
        gv:weights <urn:gitvan:test-weights> ;
        gv:targetTime 300000
      }
    ]
    # Execute selected tests
    [
      gv:id "run-tests" ;
      gv:command "npm run test -- --testNamePattern=$PATTERN" ;
      gv:captureMetrics true
    ]
  ] ;

  # After execution, update weights
  gv:afterPhase [
    [
      gv:id "record-results" ;
      gv:action "record-execution-metrics"
    ]
    [
      gv:id "collect-feedback" ;
      gv:query <file://sparql/evaluate-test-effectiveness.rq#sha256=mno>
    ]
    [
      gv:id "update-weights" ;
      gv:action "apply-reinforcement-learning" ;
      gv:updateFrequency "weekly"
    ]
  ] .
```

---

## 6. Success Metrics

### 6.1 Hook Execution Reliability

**Metric 1: Hook Triggering Coverage**

```
Definition: Percentage of commits that meet hook condition actually trigger hook

Target: >= 99%
  Good: 95-99%
  Fair: 90-95%
  Poor: < 90%

Measurement:
  total_triggered = COUNT(commits WHERE hook.condition = true AND hook.executed = true)
  total_eligible = COUNT(commits WHERE hook.condition = true)
  coverage = total_triggered / total_eligible * 100

Sampling: Weekly aggregation over 4-week period
```

**Metric 2: Hook Execution Success Rate**

```
Definition: Percentage of hook executions that complete without error

Target: >= 99.5%
  Good: 98-99.5%
  Fair: 95-98%
  Poor: < 95%

Measurement:
  successful = COUNT(executions WHERE result.success = true)
  total = COUNT(executions)
  success_rate = successful / total * 100

Sampling: Daily with rolling 30-day window
```

### 6.2 Hook Evaluation Performance

**Metric 1: Condition Evaluation Latency (p50, p99)**

```
Definition: Time from hook trigger to condition evaluation completion

Target:
  p50: <= 400ms (single condition)
  p99: <= 1800ms (complex DAG with 5+ conditions)

Multi-predicate DAG Performance:
  Single predicate: p50 < 100ms, p99 < 500ms
  2-3 predicates (sequential): p50 < 250ms, p99 < 1200ms
  4+ predicates (parallel): p50 < 400ms, p99 < 1800ms

Measurement:
  FROM hook_execution_logs
  SELECT PERCENTILE_CONT(0.50) evaluation_duration_ms as p50,
         PERCENTILE_CONT(0.99) evaluation_duration_ms as p99
  GROUP BY hook_id, predicate_count

Sampling: Continuous monitoring, alert on SLA breach
```

**Metric 2: Hook Execution Latency (p50, p99)**

```
Definition: Time from condition pass to hook run phase completion

Target:
  p50: <= 2000ms
  p99: <= 8000ms

Measurement:
  FROM hook_execution_logs
  SELECT PERCENTILE_CONT(0.50) execution_duration_ms as p50,
         PERCENTILE_CONT(0.99) execution_duration_ms as p99
  GROUP BY hook_id

Sampling: Continuous monitoring
```

**Metric 3: Cascade Execution Latency**

```
Definition: End-to-end time for multi-stage meta-hook execution

Target:
  Single stage: p50 < 2000ms, p99 < 8000ms
  2-3 stages: p50 < 5000ms, p99 < 15000ms
  4+ stages: p50 < 10000ms, p99 < 30000ms

Measurement:
  FROM meta_hook_execution_logs
  SELECT PERCENTILE_CONT(0.50) total_duration_ms as p50,
         PERCENTILE_CONT(0.99) total_duration_ms as p99
  GROUP BY cascade_stage_count

Sampling: Continuous monitoring
```

### 6.3 False Positive / False Negative Rates

**Metric 1: False Positive Rate**

```
Definition: Hooks that trigger but shouldn't (condition evaluation error)

Target: < 1% of executions
  Ideal: < 0.1%
  Good: 0.1-1%
  Fair: 1-5%
  Poor: > 5%

Measurement:
  false_positives = COUNT(executions WHERE:
    hook.triggered = true AND
    conditions_actually_met = false AND
    result = error
  )
  total = COUNT(executions)
  fp_rate = false_positives / total * 100

Sampling: Manual spot-check (statistical sampling) weekly
```

**Metric 2: False Negative Rate**

```
Definition: Conditions that should trigger but don't (missed hooks)

Target: < 0.5% of eligible cases
  Ideal: < 0.1%
  Good: 0.1-0.5%
  Fair: 0.5-2%
  Poor: > 2%

Measurement:
  false_negatives = COUNT(commits WHERE:
    hook.condition = true AND
    hook.executed = false AND
    should_have_executed = true
  )
  total_eligible = COUNT(commits WHERE hook.condition = true)
  fn_rate = false_negatives / total_eligible * 100

Sampling: Manual spot-check (statistical sampling) weekly
```

### 6.4 Hook Effectiveness Metrics

**Metric 1: Issues Prevented**

```
Definition: Bugs/security issues caught before reaching production

Target: Measure impact of each hook category

Measurement:
  security_hooks:
    issues_prevented = COUNT(vulnerabilities NOT deployed)
    cost_avoidance = cost_per_incident * issues_prevented

  quality_hooks:
    regressions_prevented = COUNT(coverage drops blocked)
    mean_defect_lifetime_reduction = baseline - actual

  performance_hooks:
    regressions_caught = COUNT(perf regressions blocked)
    user_impact_prevented = sum(affected_users)

Sampling: Monthly retrospective review
```

**Metric 2: Developer Friction**

```
Definition: How much developer workflow is disrupted by hooks

Target: < 5% of commits require remediation
  Ideal: < 2%
  Good: 2-5%
  Fair: 5-10%
  Poor: > 10%

Measurement:
  blocked_commits = COUNT(commits WHERE hook.blocked = true)
  total_commits = COUNT(commits)
  friction_rate = blocked_commits / total_commits * 100

  remediation_time = AVG(time_to_fix_and_resubmit)

  developer_satisfaction = SURVEY(
    "Hooks help my workflow": 1-5 scale
  )

Sampling: Weekly tracking, monthly surveys
```

---

## 7. Safety & Resilience

### 7.1 Preventing Infinite Hook Loops

**Risk**: Meta-hook A triggers meta-hook B which triggers A...

**Protections**:

```typescript
interface LoopDetectionConfig {
  // Absolute depth limit
  maxDepth: number;  // Default: 5

  // Absolute time budget
  totalTimeoutMs: number;  // Default: 30000 (30s)

  // Per-stage timeout
  stageTimeoutMs: number;  // Default: 5000 (5s)

  // Visited hooks tracking
  visitedHooks: Set<string>;

  // Cycle detection algorithm
  algorithm: 'dfs' | 'visit-set';
}

class InfiniteLoopPrevention {
  /**
   * Validate hook execution doesn't create infinite loop
   */
  async validateMetaHook(
    hook: MetaHook,
    allHooks: Map<string, Hook>,
    maxDepth: number = 5
  ): Promise<ValidationResult> {
    // Build dependency graph
    const graph = this.buildDependencyGraph(hook, allHooks);

    // Check for cycles
    const hasCycle = this.detectCycle(graph);
    if (hasCycle) {
      return {
        valid: false,
        reason: `Cycle detected in meta-hook dependencies: ${
          this.describeCycle(graph)
        }`
      };
    }

    // Check depth
    const depth = this.calculateMaxDepth(graph);
    if (depth > maxDepth) {
      return {
        valid: false,
        reason: `Meta-hook depth ${depth} exceeds limit ${maxDepth}`
      };
    }

    return { valid: true };
  }

  /**
   * Detect cycles using DFS
   */
  private detectCycle(graph: DependencyGraph): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    for (const hookId of graph.nodes.keys()) {
      if (this._dfs(hookId, graph, visited, recStack)) {
        return true;
      }
    }

    return false;
  }

  private _dfs(
    node: string,
    graph: DependencyGraph,
    visited: Set<string>,
    recStack: Set<string>
  ): boolean {
    visited.add(node);
    recStack.add(node);

    for (const neighbor of graph.edges.get(node) || []) {
      if (!visited.has(neighbor)) {
        if (this._dfs(neighbor, graph, visited, recStack)) {
          return true;
        }
      } else if (recStack.has(neighbor)) {
        return true;  // Cycle found
      }
    }

    recStack.delete(node);
    return false;
  }

  /**
   * Enforce execution limits during runtime
   */
  async executeWithGuards<T>(
    fn: () => Promise<T>,
    config: LoopDetectionConfig
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(
            `Execution timeout after ${config.totalTimeoutMs}ms`
          ));
        }, config.totalTimeoutMs);
      });

      return await Promise.race([
        fn(),
        timeoutPromise
      ]) as T;
    } catch (error) {
      if (error.message.includes('timeout')) {
        // Possible infinite loop or deadlock
        return {
          success: false,
          reason: 'Execution timeout - possible infinite loop',
          durationMs: Date.now() - startTime,
          // Can trigger manual investigation
        } as any;
      }
      throw error;
    }
  }
}
```

### 7.2 Timeout & Cancellation Handling

**Risk**: Hooks hang or take excessive time, blocking deployment

```typescript
interface TimeoutConfig {
  // Single hook timeout
  hookTimeoutMs: number;  // Default: 30000 (30s)

  // Condition evaluation timeout
  conditionTimeoutMs: number;  // Default: 5000 (5s)

  // Cascade total timeout
  cascadeTimeoutMs: number;  // Default: 60000 (60s)

  // Per-stage timeout
  stageTimeoutMs: number;  // Default: 10000 (10s)

  // Timeout action
  onTimeout: 'fail' | 'skip-hook' | 'skip-cascade' | 'alert-operator';
}

class TimeoutManager {
  /**
   * Execute hook with timeout and graceful cleanup
   */
  async executeWithTimeout<T>(
    fn: () => Promise<T>,
    config: TimeoutConfig
  ): Promise<HookResult> {
    const abortController = new AbortController();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        abortController.abort();

        switch (config.onTimeout) {
          case 'fail':
            resolve({
              success: false,
              reason: 'Hook execution timeout',
              timedOut: true,
              durationMs: config.hookTimeoutMs
            });
            break;

          case 'skip-hook':
            resolve({
              success: true,
              executed: false,
              reason: 'Hook skipped due to timeout',
              timedOut: true
            });
            break;

          case 'alert-operator':
            resolve({
              success: false,
              reason: 'Hook timeout - operator notified',
              timedOut: true,
              alertTriggered: true
            });
            // Send alert
            this.alertOperator(
              `Hook timeout after ${config.hookTimeoutMs}ms`
            );
            break;
        }
      }, config.hookTimeoutMs);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve({ success: true, result });
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Graceful hook cancellation
   */
  async cancelHook(hookId: string): Promise<void> {
    // Abort any running operations
    const operations = this.operationMap.get(hookId) || [];
    for (const op of operations) {
      op.abort();
    }

    // Notify hook executor
    this.hookExecutor.cancel(hookId);

    // Record cancellation
    this.recordCancellation(hookId, {
      timestamp: new Date(),
      reason: 'user-initiated'
    });
  }
}
```

### 7.3 Partial Failure Handling

**Risk**: One hook fails, should others in cascade continue?

```typescript
interface FailureHandlingPolicy {
  // How to handle failed stages
  onStageFail: {
    required: 'abort' | 'continue' | 'retry';
    optional: 'continue';
  };

  // Retry configuration
  retry: {
    maxAttempts: number;  // Default: 1 (no retry)
    backoffMs: number;    // Exponential backoff base
    backoffMultiplier: number;  // Default: 2
  };

  // Partial results handling
  partialResults: 'merge' | 'latest' | 'first-success';

  // Failure notification
  onCascadeFail: 'alert-operator' | 'log-only' | 'rollback-changes';
}

class FailureHandler {
  /**
   * Handle cascade stage failure gracefully
   */
  async handleStageFail(
    stage: CascadeStage,
    error: Error,
    policy: FailureHandlingPolicy
  ): Promise<FailureHandlingResult> {
    const isRequired = stage.required !== false;
    const action = isRequired
      ? policy.onStageFail.required
      : policy.onStageFail.optional;

    switch (action) {
      case 'abort':
        return {
          action: 'abort',
          reason: `Required stage failed: ${error.message}`
        };

      case 'retry':
        return await this.retryStage(stage, policy.retry);

      case 'continue':
        return {
          action: 'continue',
          skippedStage: stage.id,
          error: error.message
        };
    }
  }

  /**
   * Retry with exponential backoff
   */
  private async retryStage(
    stage: CascadeStage,
    retryConfig: RetryConfig
  ): Promise<FailureHandlingResult> {
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      const delay = retryConfig.backoffMs *
        Math.pow(retryConfig.backoffMultiplier, attempt - 1);

      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        const result = await executeStage(stage);
        return {
          action: 'retry-success',
          attempt,
          result
        };
      } catch (error) {
        if (attempt === retryConfig.maxAttempts) {
          throw error;  // Final attempt failed
        }
      }
    }
  }
}
```

### 7.4 Hook Dependency Management

**Prevention**: Validate hook dependencies at registration time

```typescript
class HookDependencyManager {
  /**
   * Validate hook doesn't create problematic dependencies
   */
  validateDependencies(
    hook: Hook | MetaHook,
    allHooks: Map<string, Hook>
  ): ValidationResult {
    const checks = [
      this.checkForCycles(hook, allHooks),
      this.checkForDeadlocks(hook, allHooks),
      this.checkDependencyDepth(hook, allHooks),
      this.checkResourceConflicts(hook, allHooks),
      this.checkTimingConflicts(hook, allHooks)
    ];

    const failures = checks.filter(c => !c.success);

    if (failures.length > 0) {
      return {
        success: false,
        failures: failures.map(f => f.reason)
      };
    }

    return { success: true };
  }

  /**
   * Check for mutual blocking (deadlock)
   */
  private checkForDeadlocks(
    hook: Hook,
    allHooks: Map<string, Hook>
  ): ValidationResult {
    // If hook A requires hook B and hook B requires hook A
    if (hook instanceof MetaHook) {
      for (const cascadeSpec of hook.cascadeHooks) {
        const dependencyHook = allHooks.get(cascadeSpec.hookId);

        if (dependencyHook instanceof MetaHook) {
          // Check if B depends on A
          const bDependsOnA = dependencyHook.cascadeHooks.some(
            s => s.hookId === hook.meta.name
          );

          if (bDependsOnA) {
            return {
              success: false,
              reason: `Circular dependency detected: ${
                hook.meta.name
              } ↔ ${cascadeSpec.hookId}`
            };
          }
        }
      }
    }

    return { success: true };
  }
}
```

---

## 8. Advanced Topics

### 8.1 Machine Learning Integration

**Hook Learning Framework**:

```typescript
/**
 * ML-Powered Hook Adaptation
 *
 * Hooks can learn from historical data to improve decisions
 */

interface MLPoweredHook extends Hook {
  // Learning model
  model: HookLearningModel;

  // Training data sources
  trainingData: {
    query: SPARQL;  // Collect training examples
    labels: SPARQL; // Provide ground truth labels
    frequency: 'weekly' | 'daily' | 'on-demand';
  };

  // Prediction interface
  predict(context: HookContext): Promise<Prediction>;
}

class HookLearningModel {
  /**
   * Train model on historical hook data
   */
  async train(
    trainingExamples: TrainingExample[],
    options: TrainingOptions
  ): Promise<TrainedModel> {
    // Feature extraction
    const features = trainingExamples.map(e => ({
      ...extractFeatures(e),
      label: e.label
    }));

    // Model selection based on problem type
    const model = this.selectModel(options.problemType);

    // Training
    await model.fit(features, {
      epochs: options.epochs || 100,
      batchSize: options.batchSize || 32,
      validationSplit: 0.2
    });

    return model;
  }

  /**
   * Make predictions on new data
   */
  async predict(
    context: HookContext,
    features: FeatureVector
  ): Promise<Prediction> {
    const prediction = await this.model.predict(features);

    return {
      prediction: prediction.value,
      confidence: prediction.confidence,
      alternativeHypotheses: prediction.topK(3)
    };
  }
}

// Example: Predict which hooks to run based on commit characteristics
async function predictHooksForCommit(
  commit: GitCommit,
  hooks: Map<string, MLPoweredHook>
): Promise<PredictionResult[]> {
  const features = extractCommitFeatures(commit);

  const predictions = await Promise.all(
    Array.from(hooks.values()).map(hook =>
      hook.model.predict(features)
    )
  );

  // Filter predictions with high confidence
  return predictions.filter(p => p.confidence > 0.8);
}
```

**Benefits**:
- Predictive hook triggering (avoid missed bugs)
- Optimized hook ordering (run most important first)
- Adaptive resource allocation
- Pattern discovery (learn what commits typically break)

### 8.2 Natural Language Hook Specification

**Goal**: Write hooks in English-like DSL, compile to Turtle:

```
Describe a hook in natural language:

"When a commit adds files to src/ without corresponding test files,
 and the test coverage drops below 80%, block the merge and request
 the author to add tests. If they add the tests within 24 hours,
 automatically approve the merge."

Compiler generates Turtle:

gh:AutoTestEnforcementHook
  a gv:CompoundHook ;
  gv:name "quality:autoTestEnforcement" ;

  gv:when [
    gv:allOf (
      [
        gv:query "SELECT ?file WHERE {
          ?file gv:addedInCommit true ;
              gv:path ?path .
          FILTER(REGEX(?path, '^src/'))
          MINUS {
            ?testFile gv:testFor ?file
          }
        }"
      ]
      [
        gv:query "ASK WHERE {
          ?coverage gv:value ?val .
          FILTER(?val < 0.80)
        }"
      ]
    )
  ] ;

  gv:cascadeHooks [
    [ gv:hookId "block-merge" ]
    [ gv:hookId "request-tests" ]
    [
      gv:hookId "auto-approve-on-tests-added" ;
      gv:condition "tests-added-within-24h"
    ]
  ] .
```

**Implementation**:

```typescript
class NLHookCompiler {
  /**
   * Parse natural language hook description
   */
  async parseHookDescription(
    description: string
  ): Promise<ParsedHookIntent> {
    // Use LLM to extract intent
    const intent = await this.llm.extractIntent(description);

    return {
      conditions: intent.conditions,  // Extracted conditions
      actions: intent.actions,        // Extracted actions
      parameters: intent.parameters,  // Extracted parameters
      confidence: intent.confidence
    };
  }

  /**
   * Compile to Turtle
   */
  async compileTurtle(
    intent: ParsedHookIntent
  ): Promise<string> {
    // Generate SPARQL queries for conditions
    const sparqlQueries = await Promise.all(
      intent.conditions.map(c =>
        this.generateSPARQL(c)
      )
    );

    // Generate Turtle skeleton
    return this.generateTurtle(
      intent,
      sparqlQueries
    );
  }
}
```

### 8.3 Cross-Team Hook Sharing via Pack System

**Pattern**: Share common hooks across teams:

```typescript
/**
 * Package common hooks for distribution
 */
export const SecurityHooksPack = createPack({
  name: '@gitvan/hooks-security',
  version: '1.0.0',
  description: 'Common security hooks for all teams',

  hooks: [
    // Hardcoded secrets detection
    {
      name: 'security:hardcodedSecrets',
      file: './hooks/security/hardcoded-secrets.ttl',
      sha256: 'abc...'
    },

    // Dependency vulnerability detection
    {
      name: 'security:dependencyVulnerabilities',
      file: './hooks/security/vulnerabilities.ttl',
      sha256: 'def...'
    },

    // License compliance
    {
      name: 'security:licenseCompliance',
      file: './hooks/security/licenses.ttl',
      sha256: 'ghi...'
    }
  ],

  dependencies: [
    '@gitvan/hooks-quality',
    '@gitvan/sparql-patterns'
  ],

  // Package signature for verification
  signature: 'sig_...',

  // Distribution
  registry: 'npm',
  publish: true
});

/**
 * Use pack in project
 */
async function installSecurityPack() {
  const pack = await downloadPack('@gitvan/hooks-security@1.0.0');

  // Verify signature
  const isValid = await verifyPackSignature(pack);
  if (!isValid) {
    throw new Error('Pack signature verification failed');
  }

  // Install hooks
  for (const hookDef of pack.hooks) {
    await registerHook(hookDef);
  }
}
```

---

## 9. Migration Path

### 9.1 Backward Compatibility

Current hooks continue working without changes:

```typescript
// Existing hook (v3.0.0 style) - still works
const hook = defineHook({
  meta: { name: 'ci:runTests' },
  when: {
    kind: 'sparql-ask',
    ref: { uri: 'file://...', sha256: '...' }
  },
  run: async (event) => {
    return { result: { success: true } };
  }
});

// Automatically migrated to v4.0.2+ with compatibility layer
const v4Hook = autoMigrateHook(hook);  // Returns equivalent v4 hook
```

### 9.2 Gradual Upgrade Path

**Phase 1**: Use existing hooks as-is (no changes needed)

**Phase 2**: Optionally upgrade to new features:

```typescript
// Enhanced hook with multi-predicate DAG
const enhancedHook = defineHook({
  ...existingHook,

  // New: Multi-predicate coordination
  predicateDAG: [
    { id: 'check-coverage', ... },
    { id: 'check-tests-pass', ... }
  ],

  // New: Conditional actions
  conditionalActions: [
    {
      condition: 'all(check-coverage, check-tests-pass)',
      actions: [...]
    }
  ]
});
```

**Phase 3**: Leverage meta-hooks and feedback loops:

```typescript
// New: Meta-hook that coordinates multiple hooks
const metaHook = defineMetaHook({
  name: 'security:vulnerabilityResponse',
  when: { ... },
  cascadeHooks: [
    { hookId: 'notify-team' },
    { hookId: 'generate-patch', triggerIf: isCritical },
    { hookId: 'block-deploy', triggerIf: hasCritical }
  ]
});
```

### 9.3 Migration Checklist

```
[ ] Audit existing hooks (identify candidates for enhancement)
[ ] Test Phase 1 features in dev environment
[ ] Deploy Phase 1 to staging (4-week trial)
[ ] Gather feedback from team
[ ] Document new patterns in team handbook
[ ] Train team on new features
[ ] Deploy Phase 1 to production
[ ] Plan Phase 2 implementation
[ ] Identify complex policies for Phase 3
[ ] Prototype AI features for Phase 4
```

---

## 10. Appendix

### 10.1 SPARQL Query Examples for Common Hooks

**Coverage Detection**:

```sparql
# Select files with coverage < 50%
PREFIX gv: <https://gitvan.dev/ontology#>

SELECT ?file ?coverage WHERE {
  ?file a gv:SourceFile ;
        gv:testCoverage ?coverage .
  FILTER (?coverage < 0.50)
}
ORDER BY ?coverage
```

**Vulnerability Detection**:

```sparql
# Find unpatched critical vulnerabilities
PREFIX gv: <https://gitvan.dev/ontology#>

SELECT ?vuln ?package ?severity WHERE {
  ?vuln a gv:Vulnerability ;
        gv:affectsPackage ?package ;
        gv:severity ?severity ;
        gv:patchAvailable false .
  FILTER (?severity = "critical" OR ?severity = "high")
}
```

**Performance Regression**:

```sparql
# Latency increased 10%+ vs. baseline
PREFIX gv: <https://gitvan.dev/ontology#>

SELECT ?endpoint ?currentLatency ?baselineLatency WHERE {
  ?endpoint a gv:ApiEndpoint ;
            gv:currentP99 ?currentLatency ;
            gv:baselineP99 ?baselineLatency .
  BIND((?currentLatency - ?baselineLatency) / ?baselineLatency AS ?increase)
  FILTER (?increase > 0.10)
}
```

### 10.2 Testing Framework

```typescript
/**
 * Hook testing utilities
 */

export function createHookTestSuite(hook: Hook) {
  return {
    /**
     * Test condition evaluation
     */
    testCondition: async (graph: Store, expected: boolean) => {
      const evaluator = createConditionEvaluator();
      const result = await evaluator.evaluate(
        hook.when,
        graph
      );

      assert.equal(result, expected,
        `Expected condition to evaluate to ${expected}`
      );
    },

    /**
     * Test hook execution
     */
    testExecution: async (event: HookEvent, expected: HookResult) => {
      const result = await executeHook(hook, event);
      assert.deepEqual(result, expected);
    },

    /**
     * Test lifecycle phases
     */
    testLifecycle: async (event: HookEvent) => {
      const results = {
        before: null,
        run: null,
        after: null
      };

      if (hook.before) {
        results.before = await hook.before(event);
      }

      if (hook.run) {
        results.run = await hook.run(event);
      }

      if (hook.after) {
        results.after = await hook.after({
          ...event,
          result: results.run,
          cancelled: false
        });
      }

      return results;
    }
  };
}

// Usage
const testSuite = createHookTestSuite(myHook);

test('condition triggers on large transaction', async () => {
  const graph = createTestGraph();
  await testSuite.testCondition(graph, true);
});

test('run phase executes and returns result', async () => {
  const event = { payload: { amount: 1000000 } };
  const result = await testSuite.testExecution(event, {
    result: { status: 'alert-dispatched' }
  });
});
```

### 10.3 Monitoring & Observability

```typescript
/**
 * Hook execution monitoring
 */

interface HookObservability {
  // Metrics
  executionLatency: Histogram;        // ms per hook
  conditionEvaluationLatency: Histogram;
  hookTriggeredCount: Counter;
  hookFailureCount: Counter;
  hookTimeoutCount: Counter;

  // Tracing
  hookExecutionSpans: Map<string, Span>;

  // Logging
  hookExecutionLogs: HookExecutionLog[];
}

export class HookObservabilityCollector {
  /**
   * Record hook execution
   */
  recordExecution(execution: HookExecution) {
    this.executionLatency.record(execution.durationMs);

    if (execution.success) {
      this.hookTriggeredCount.add(1);
    } else {
      this.hookFailureCount.add(1);
    }

    // Send to monitoring system
    this.sendToMonitoring(execution);
  }

  /**
   * Get execution stats
   */
  getStats(): ObservabilityStats {
    return {
      avgLatency: this.executionLatency.mean(),
      p95Latency: this.executionLatency.percentile(0.95),
      p99Latency: this.executionLatency.percentile(0.99),
      successRate: this.hookTriggeredCount.value /
        (this.hookTriggeredCount.value + this.hookFailureCount.value),
      timeoutRate: this.hookTimeoutCount.value /
        (this.hookTriggeredCount.value + this.hookFailureCount.value)
    };
  }
}
```

### 10.4 Troubleshooting Guide

**Problem**: Hook not triggering

```
1. Check condition syntax:
   - Is condition file readable?
   - Are prefixes correctly declared?
   - Does SPARQL query have syntax errors?

2. Check graph state:
   - Does graph contain expected triples?
   - Run condition query manually to verify

3. Check hook registration:
   - Is hook in registered hooks list?
   - Does hook.when match actual condition?

4. Enable verbose logging:
   - Set DEBUG=gitvan:hooks
   - Check predicate evaluation output
```

**Problem**: Hook timeout

```
1. Check condition complexity:
   - Is SPARQL query inefficient?
   - Add LIMIT or narrow WHERE clause

2. Check system resources:
   - CPU usage during evaluation?
   - Memory pressure?

3. Increase timeout:
   - Raise timeoutMs in hook config
   - Or optimize query first
```

**Problem**: False positives (wrong hooks triggering)

```
1. Validate condition:
   - Test SPARQL query manually
   - Check for unintended triples

2. Add filtering:
   - Add FILTER to SPARQL query
   - Narrow condition specificity

3. Debug predicate evaluation:
   - Add logging to before() phase
   - Print evaluated conditions
```

---

## Conclusion

The @unrdf/hooks system in GitVan represents a fundamental paradigm shift from "Git hooks react to git events" to "Semantic hooks react to graph state changes." This integration plan outlines how to leverage this power through four implementation phases:

1. **Enhanced Semantic Triggers** (Q2 2026) - Pure graph-driven hooks without git events
2. **Multi-Predicate Coordination** (Q3 2026) - Complex DAG-based policies
3. **Hook Composition** (Q4 2026) - Meta-hooks with cascade orchestration
4. **AI-Powered Adaptation** (Q1 2027) - Hooks that learn and optimize

**Total Effort**: 240-370 person-hours across 12-15 months
**Team Size**: 3-4 engineers
**Expected Outcomes**:
- 99%+ hook execution reliability
- <2s p99 latency for complex cascades
- <1% false positive rate
- 20%+ reduction in merge time through automation

The success metrics framework ensures continuous monitoring of hook effectiveness, and the safety/resilience architecture prevents infinite loops, timeouts, and cascading failures. This positions GitVan as the industry-leading platform for semantic automation in software development.

---

**Document Version**: 1.0
**Status**: Ready for Architecture Review
**Next Steps**:
1. Stakeholder review & feedback
2. Detailed design specifications for Phase 1
3. Resource allocation & team planning
4. Prototype implementation of semantic triggers
