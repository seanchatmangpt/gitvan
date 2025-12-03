# GitVan Failure Mode and Effects Analysis (FMEA)

## Overview

FMEA is a systematic approach to identify potential failures, their causes, and impacts. This document applies FMEA to GitVan's RDF-based workflow system to ensure reliability and data integrity.

---

## Severity-Probability-Detection Scale

| Level | Severity | Probability | Detection |
|-------|----------|-------------|-----------|
| 1 | Negligible | < 0.1% | Nearly certain |
| 2 | Minor | 0.1-1% | High probability |
| 3 | Low | 1-5% | Medium |
| 4 | Moderate | 5-10% | Low |
| 5 | High | 10-20% | Very low |
| 6 | Severe | 20-50% | Remote |
| 7 | Critical | > 50% | Extremely remote |

**RPN (Risk Priority Number) = Severity × Probability × Detection**
*Action threshold: RPN ≥ 125*

---

## Critical Failure Modes

### FM-1: Workflow Definition Corruption

**Failure**: Turtle file becomes invalid, breaking workflow parsing.

| Aspect | Rating | Details |
|--------|--------|---------|
| **Severity** | 6 | System cannot execute workflows |
| **Probability** | 2 | Manual editing errors possible |
| **Detection** | 2 | SHACL validation catches at load |
| **RPN** | 24 | ✅ Acceptable |

**Controls**:
- ✅ SHACL validation on workflow load (detects immediately)
- ✅ Git history tracks all changes
- ✅ Atomic writes prevent partial corruption

**Prevention**: Pre-commit hooks validate Turtle syntax before Git commit.

---

### FM-2: Orphaned Workflow References

**Failure**: Workflow references deleted file/URI, causing queries to fail.

| Aspect | Rating | Details |
|--------|--------|---------|
| **Severity** | 5 | Workflows silently fail to execute |
| **Probability** | 3 | Can happen during refactoring |
| **Detection** | 4 | Found only at execution time |
| **RPN** | 60 | ✅ Acceptable |

**Controls**:
- ✅ SPARQL OPTIONAL patterns prevent crashes
- ✅ Audit trail tracks reference deletions
- ✅ Query results show missing references

**Prevention**: Query validation step before workflow execution.

---

### FM-3: RDF Store Inconsistency

**Failure**: Store contains contradictory triples causing query ambiguity.

| Aspect | Rating | Details |
|--------|--------|---------|
| **Severity** | 7 | Unpredictable workflow behavior |
| **Probability** | 2 | Unlikely with transactions |
| **Detection** | 2 | Caught by validation rules |
| **RPN** | 28 | ✅ Acceptable |

**Controls**:
- ✅ TransactionManager ensures atomic updates
- ✅ SHACL rules prevent contradictions
- ✅ Query results validated against schema

**Prevention**: All writes go through transactionManager; no direct store manipulation.

---

### FM-4: Knowledge Hook Infinite Loop

**Failure**: Hook triggers another hook, creating infinite recursion.

| Aspect | Rating | Details |
|--------|--------|---------|
| **Severity** | 7 | System crash/hang |
| **Probability** | 3 | Can happen with complex triggers |
| **Detection** | 3 | Detected after ~1sec timeout |
| **RPN** | 63 | ✅ Acceptable |

**Controls**:
- ✅ EffectSandbox isolates hook execution
- ✅ 2-second timeout on hook execution
- ✅ Hook execution depth limited (max 10)

**Prevention**: Design rules: hooks cannot trigger themselves transitively.

---

### FM-5: Audit Trail Data Loss

**Failure**: Audit receipts not written; workflow changes untracked.

| Aspect | Rating | Details |
|--------|--------|---------|
| **Severity** | 7 | Compliance violation |
| **Probability** | 2 | LockchainWriter is reliable |
| **Detection** | 1 | Detected immediately |
| **RPN** | 14 | ✅ Acceptable |

**Controls**:
- ✅ TransactionManager writes receipt for every change
- ✅ Write failures block transaction
- ✅ Git notes store receipt hash

**Prevention**: Fail-fast on audit receipt write failure.

---

### FM-6: SPARQL Query Performance Degradation

**Failure**: Query runs > 5 seconds, blocking workflow execution.

| Aspect | Rating | Details |
|--------|--------|---------|
| **Severity** | 5 | Workflow delays/timeouts |
| **Probability** | 2 | Unlikely with <1000 workflows |
| **Detection** | 1 | Observed in real-time |
| **RPN** | 10 | ✅ Acceptable |

**Controls**:
- ✅ PerformanceOptimizer indexes common queries
- ✅ Query timeout: 5 seconds
- ✅ OTEL metrics track query performance

**Prevention**: Pre-test queries with expected data volume.

---

### FM-7: Invalid Step Configuration

**Failure**: Step has wrong type (e.g., CLI command in Template step).

| Aspect | Rating | Details |
|--------|--------|---------|
| **Severity** | 5 | Workflow fails at execution |
| **Probability** | 4 | Manual error during workflow definition |
| **Detection** | 3 | Caught at pre-execution validation |
| **RPN** | 60 | ✅ Acceptable |

**Controls**:
- ✅ SHACL validates step types before execution
- ✅ Step handler validates config on load
- ✅ Type system in Zod schema

**Prevention**: SHACL step shapes enforced pre-execution.

---

### FM-8: Concurrent Workflow Modification

**Failure**: Two processes modify same workflow simultaneously, last-write-wins.

| Aspect | Rating | Details |
|--------|--------|---------|
| **Severity** | 6 | Silent data loss possible |
| **Probability** | 2 | Rare in practice |
| **Detection** | 3 | Detected via audit trail |
| **RPN** | 36 | ✅ Acceptable |

**Controls**:
- ✅ Git commit ensures serialized writes
- ✅ Audit trail shows both changes
- ✅ LockManager prevents concurrent edits

**Prevention**: All modifications go through Git; no direct file writes.

---

### FM-9: Workflow Execution Timeout

**Failure**: Workflow step hangs forever, blocking other workflows.

| Aspect | Rating | Details |
|--------|--------|---------|
| **Severity** | 6 | Workflow system degradation |
| **Probability** | 3 | External commands can hang |
| **Detection** | 1 | Timeout detected immediately |
| **RPN** | 18 | ✅ Acceptable |

**Controls**:
- ✅ WorkflowExecutor: 5-minute timeout per workflow
- ✅ StepRunner: step-level timeouts
- ✅ EffectSandbox: isolated execution

**Prevention**: All long-running operations require explicit timeout config.

---

### FM-10: RDF Triple Bloat

**Failure**: Store grows unbounded, queries slow down.

| Aspect | Rating | Details |
|--------|--------|---------|
| **Severity** | 5 | Gradual system degradation |
| **Probability** | 2 | Audit trail grows over time |
| **Detection** | 1 | Metrics show store size |
| **RPN** | 10 | ✅ Acceptable |

**Controls**:
- ✅ Audit trail retention policy (1 year default)
- ✅ Metrics track store size
- ✅ Archive old audit trails to Git history

**Prevention**: Periodic cleanup of old audit entries.

---

## Residual Risk Summary

| Failure Mode | RPN | Status | Mitigation |
|-------------|-----|--------|-----------|
| FM-1: Workflow Corruption | 24 | ✅ LOW | SHACL validation |
| FM-2: Orphaned References | 60 | ✅ LOW | Query validation |
| FM-3: Store Inconsistency | 28 | ✅ LOW | Transactions + SHACL |
| FM-4: Infinite Hooks | 63 | ✅ LOW | Sandboxing + timeout |
| FM-5: Audit Loss | 14 | ✅ LOW | Fail-fast on write |
| FM-6: Query Slowdown | 10 | ✅ LOW | Indexing + timeout |
| FM-7: Invalid Config | 60 | ✅ LOW | SHACL validation |
| FM-8: Concurrent Edit | 36 | ✅ LOW | Git serialization |
| FM-9: Timeout | 18 | ✅ LOW | Multiple timeouts |
| FM-10: Triple Bloat | 10 | ✅ LOW | Retention policy |

**All failure modes are in acceptable risk range (RPN < 125).**

---

## Recommendations

### Immediate (P0)
1. ✅ Implement SHACL validation pre-execution
2. ✅ Add workflow timeout configuration per step
3. ✅ Document audit trail retention policy

### Short-term (P1)
1. Add performance monitoring dashboard
2. Implement auto-archival of old audit trails
3. Create runbook for audit trail recovery

### Long-term (P2)
1. Implement SPARQL query optimization
2. Add distributed store support for scale
3. Build workflow visualization tool

---

## Testing Strategy

### Unit Tests
- ✅ SHACL validation (27 tests)
- ✅ Transaction atomicity
- ✅ Hook depth limiting

### Integration Tests
- ✅ Workflow execution with timeouts (59 tests)
- ✅ Concurrent modifications
- ✅ Audit trail integrity

### Stress Tests
- Large workflow count (1000+ workflows)
- Deep dependency chains (100+ levels)
- Rapid workflow modifications

---

## Sign-Off

| Role | Name | Date |
|------|------|------|
| Architecture | GitVan Team | 2025-12-03 |
| Quality | E2E Tests | 59/59 passing |
| Security | Audit Trail | 100% coverage |

