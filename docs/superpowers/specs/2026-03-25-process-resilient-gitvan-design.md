# Process-Resilient GitVan: Supervision Trees & Process Mining

**Date:** 2026-03-25
**Authors:** AI Design (van der Aalst + Armstrong principles)
**Status:** Design Complete

## Executive Summary

This design integrates Wil van der Aalst's process mining principles and Joe Armstrong's fault-tolerant actor model into GitVan using an 80/20 approach—focusing on highest-impact additions with minimal architectural disruption.

**Key Outcomes:**
- 80% reduction in cascading failures
- 50% faster mean-time-to-recovery
- Real-time bottleneck visibility
- Automated deviation detection

## Current Gaps Analysis

### van der Aalst Gaps (Process Intelligence)
- No process discovery from Git event logs
- No conformance checking (expected vs actual execution)
- No bottleneck identification in workflows
- No process variant detection
- Limited workflow pattern support

### Armstrong Gaps (Fault Tolerance)
- No supervision trees for hierarchical fault isolation
- No "let it crash" philosophy with structured restarts
- No restart strategies (one-for-one, one-for-all, rest-for-one)
- No process monitoring/heartbeat system
- Ad-hoc error handling throughout

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Supervision Root (GitVanSupervisor)          │
│  - Monitors all child supervisors                               │
│  - Global health checking                                       │
│  - Cascading failure containment                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼────────┐ ┌──────▼─────────┐
│ WorkflowSupervisor│ │  JobSupervisor │
│  - Workflow trees │ │  - Job workers │
│  - Step restarts  │ │  - Task retries │
└───────┬─────────┘ └──────┬─────────┘
        │                 │
┌───────▼──────────────────▼─────────┐
│     Process Mining Layer           │
│  - Event log extraction            │
│  - Conformance checking            │
│  - Bottleneck detection            │
└────────────────────────────────────┘
```

## Component 1: Supervision Tree Layer

### GitVanSupervisor (Root)
**File:** `src/supervision/GitVanSupervisor.mjs`

**Responsibilities:**
- Monitors all domain supervisors (Workflow, Job, Hook)
- Implements cascading shutdown on critical failures
- Global health reporting and metrics aggregation
- Strategic restart decisions (system overload, resource exhaustion)

**Interface:**
```javascript
export class GitVanSupervisor {
  // Start all child supervisors
  async start()

  // Stop all supervisors gracefully
  async stop()

  // Handle child supervisor crash
  async handleChildCrash(childId, error)

  // Get system health status
  getHealth()
}
```

### WorkflowSupervisor (Domain)
**File:** `src/supervision/WorkflowSupervisor.mjs`

**Responsibilities:**
- Supervises workflow executions
- Restarts failed workflows with exponential backoff
- Implements workflow-level timeout
- Workflow variant tracking for process mining

**Restart Strategy:** `rest_for_one` (restart crashed workflow + dependent workflows)

**Interface:**
```javascript
export class WorkflowSupervisor {
  // Execute workflow with supervision
  async executeWorkflow(workflowId, inputs)

  // Handle workflow crash
  async handleCrash(workflowId, error, crashContext)

  // Get workflow execution status
  getStatus(workflowId)
}
```

### StepSupervisor (Leaf)
**File:** `src/supervision/StepSupervisor.mjs`

**Responsibilities:**
- Supervises individual workflow steps
- One-for-one restart strategy
- Step-level metrics collection (execution time, resource usage)
- Crash log aggregation

**Restart Strategy:** `one_for_one` (restart only crashed step)

**Interface:**
```javascript
export class StepSupervisor {
  // Execute step with supervision
  async executeStep(step, context)

  // Handle step crash
  async handleCrash(stepId, error)

  // Get step metrics
  getMetrics(stepId)
}
```

## Component 2: Process Mining Layer

### EventLogExtractor
**File:** `src/process-mining/EventLogExtractor.mjs`

**Responsibilities:**
- Mines Git commit history for workflow events
- Extracts event traces: `case_id → activity → timestamp → resource`
- Builds process models from execution patterns

**Data Model:**
```javascript
{
  caseId: "workflow-123",
  activities: [
    { name: "step1", timestamp: "2026-03-25T01:00:00Z", resource: "worker1" },
    { name: "step2", timestamp: "2026-03-25T01:00:05Z", resource: "worker2" }
  ]
}
```

### ConformanceChecker
**File:** `src/process-mining/ConformanceChecker.mjs`

**Responsibilities:**
- Compares expected workflow definitions vs actual executions
- Detects deviations: skipped steps, unauthorized actions, out-of-order executions
- Calculates fitness score (0-1, where 1 = perfect conformance)

**Output:**
```javascript
{
  workflowId: "workflow-123",
  fitness: 0.95,
  deviations: [
    { type: "skip", step: "validation", count: 3 },
    { type: "reorder", expected: ["a","b","c"], actual: ["a","c","b"] }
  ]
}
```

### BottleneckDetector
**File:** `src/process-mining/BottleneckDetector.mjs`

**Responsibilities:**
- Identifies slow workflow steps (p95, p99 latency)
- Calculates waiting times between steps
- Flags concurrency bottlenecks (resource contention)

**Output:**
```javascript
{
  workflowId: "workflow-123",
  bottlenecks: [
    { step: "approval", p95: 5000, p99: 10000, status: "critical" },
    { step: "notification", waitTime: 2000, status: "warning" }
  ]
}
```

### VariantAnalyzer
**File:** `src/process-mining/VariantAnalyzer.mjs`

**Responsibilities:**
- Discovers process variants (different execution paths)
- Clusters similar execution patterns
- Reports variant frequency and statistics

## Component 3: Fault Tolerance Integration

### "Let It Crash" Philosophy

**Error Boundaries:**
- Each supervisor is an error boundary
- Crashes don't propagate beyond supervisor
- Fail-fast with structured logging

**Supervision Strategies:**
```javascript
const RestartStrategies = {
  ONE_FOR_ONE: 'one_for_one',      // Restart only crashed child
  ONE_FOR_ALL: 'one_for_all',      // Restart all children on crash
  REST_FOR_ONE: 'rest_for_one',    // Restart crashed + dependents
  MAX_RESTARTS: 3,                 // Maximum restarts before giving up
  BACKOFF: [1000, 5000, 10000]     // Exponential backoff (ms)
};
```

**Child Specification:**
```javascript
const childSpec = {
  id: "workflow-runner",
  restart: 'one_for_one',
  maxRestarts: 3,
  shutdown: 5000,  // ms to wait for graceful shutdown
  crashLog: true   // write crash logs to Git
};
```

### Heartbeat Monitoring
- Workers send heartbeat every 30s
- Supervisor declares worker dead after 3 missed beats
- Automatic restart with exponential backoff

### Crash Logs in Git
- Crash reports stored as Git notes (`refs/notes/gitvan/crashes`)
- Stack traces, heap dumps, context state
- Post-mortem analysis capability

## Data Flow

```
Git Push/Event → HookOrchestrator → WorkflowSupervisor
                                     ↓
                              StepSupervisor (per step)
                                     ↓
                              Execution + Monitoring
                                     ↓
                    ┌────────────────┴────────────────┐
                    ↓                                 ↓
            Success Receipt                    Crash Log
                    ↓                                 ↓
            Git Notes (audit)              Git Notes (crash)
                    ↓                                 ↓
            Process Mining Layer ← Event Log Extraction
                    ↓
            Conformance Check
                    ↓
            Bottleneck Report
```

## Error Handling Strategy

**Hierarchy of Error Recovery:**

1. **Step Level** (StepSupervisor)
   - Transient errors: retry with backoff
   - Permanent errors: fail fast, notify supervisor

2. **Workflow Level** (WorkflowSupervisor)
   - Step failure: restart workflow from checkpoint
   - Timeout: kill workflow, log partial execution

3. **System Level** (GitVanSupervisor)
   - Supervisor crash: restart supervisor (one-for-one)
   - System overload: shed load, queue for later

**Error Categories:**
```javascript
const ErrorTypes = {
  TRANSIENT: ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'],
  PERMANENT: ['EINVAL', 'ENOENT', 'EACCES'],
  CRASH: ['uncaughtException', 'unhandledRejection']
};
```

## Implementation Phases (80/20)

### Phase 1: Quick Wins (Week 1-2)
**Impact:** Immediate fault isolation

**Deliverables:**
- Add StepSupervisor with one-for-one restarts
- Basic crash logging to Git notes
- Event log extraction from Git commits
- Heartbeat monitoring for workers

**Files:**
- `src/supervision/StepSupervisor.mjs` (new)
- `src/process-mining/EventLogExtractor.mjs` (new)
- Modify: `src/workflow/workflow-executor.mjs`

### Phase 2: Core Intelligence (Week 3-4)
**Impact:** Process observability

**Deliverables:**
- WorkflowSupervisor with rest-for-one strategy
- Conformance checking (expected vs actual)
- Bottleneck detection (slow step identification)
- Variant analysis (execution path clustering)

**Files:**
- `src/supervision/WorkflowSupervisor.mjs` (new)
- `src/process-mining/ConformanceChecker.mjs` (new)
- `src/process-mining/BottleneckDetector.mjs` (new)
- `src/process-mining/VariantAnalyzer.mjs` (new)

### Phase 3: Advanced Features (Week 5-6)
**Impact:** Full system resilience

**Deliverables:**
- GitVanSupervisor root layer
- Process discovery algorithms
- Advanced restart strategies
- System-wide health dashboard

**Files:**
- `src/supervision/GitVanSupervisor.mjs` (new)
- `src/process-mining/ProcessDiscovery.mjs` (new)

## File Summary

**New Files (8):**
```
src/supervision/GitVanSupervisor.mjs
src/supervision/WorkflowSupervisor.mjs
src/supervision/StepSupervisor.mjs
src/process-mining/EventLogExtractor.mjs
src/process-mining/ConformanceChecker.mjs
src/process-mining/BottleneckDetector.mjs
src/process-mining/VariantAnalyzer.mjs
src/process-mining/ProcessDiscovery.mjs
```

**Modified Files (3):**
```
src/workflow/workflow-executor.mjs (add supervision)
src/jobs/job-bridge-scheduler.mjs (add supervision)
src/hooks/HookOrchestrator.mjs (add supervision)
```

## Testing Strategy

### Unit Tests
- Supervisor restart strategies
- Process mining algorithms
- Conformance checking logic

### Integration Tests
- Full workflow execution with crashes
- Process discovery from Git logs
- Bottleneck detection accuracy

### Chaos Tests
- Kill workers mid-execution
- Network partition simulation
- Resource exhaustion scenarios

### Conformance Tests
- Known-good workflow executions
- Deviation detection validation

## Success Criteria

- [ ] 80% reduction in cascading failures
- [ ] 50% faster mean-time-to-recovery
- [ ] Real-time bottleneck visibility
- [ ] Automated deviation detection
- [ ] Crash logs stored in Git notes
- [ ] Process variants discovered automatically
- [ ] Conformance fitness scores calculated

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supervision overhead | Medium | Lightweight monitoring, async operations |
| Git notes performance | Low | Batch writes, compression |
| Process mining accuracy | Medium | Statistical validation, tuning |
| Restart storms | High | Exponential backoff, max restart caps |

## References

- van der Aalst, W. "Process Mining: Discovery, Conformance and Enhancement of Business Processes"
- Armstrong, J. "Making reliable distributed systems in the presence of software errors"
- Erlang/OTP Supervision Trees
- ProM Framework (process mining)
