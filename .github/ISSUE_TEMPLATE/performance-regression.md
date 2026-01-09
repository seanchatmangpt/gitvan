---
name: Performance Regression Report
about: Report a performance regression detected in benchmarks
title: '[PERF] Performance regression in [OPERATION]'
labels: performance, regression, needs-investigation
assignees: ''
---

## Performance Regression Details

**Phase:**
<!-- Select one: Phase 1 (Git-Native I/O), Phase 2 (Performance Monitoring), Phase 3 (RevOps), Phase 4 (Pack System) -->

**Operation:**
<!-- e.g., lock_acquire, churn_risk_scoring, dependency_resolution -->

**Current Performance:**
<!-- e.g., P95: 150ms -->

**Baseline Performance:**
<!-- e.g., P95: 100ms -->

**Regression:**
<!-- e.g., +50% slower -->

**Benchmark Run:**
<!-- Link to benchmark results artifact or commit SHA -->

## Environment

- **Node Version:** <!-- e.g., 20.x -->
- **OS:** <!-- e.g., Ubuntu 22.04, macOS 14 -->
- **Commit SHA:** <!-- Commit where regression was detected -->
- **Branch:** <!-- e.g., main, develop -->

## Benchmark Data

<!-- Attach or paste benchmark results -->
```json
{
  "operation": "",
  "current_p95": 0,
  "baseline_p95": 0,
  "mean": 0,
  "median": 0,
  "target": 0
}
```

## SPARQL Query (if applicable)

<!-- If regression is in a SPARQL query, paste the query here -->
```sparql

```

## Steps to Reproduce

1. Run benchmarks: `node scripts/benchmark-phaseX.mjs`
2. Compare with baseline: `node scripts/check-regressions.mjs`
3. Observe regression in operation: [OPERATION]

## Expected Behavior

The operation should complete within the performance target ([TARGET]ms).

## Actual Behavior

The operation is taking [CURRENT]ms (P95), which exceeds the target by [EXCESS]%.

## Possible Causes

<!-- Check all that apply -->
- [ ] Increased data volume
- [ ] Inefficient SPARQL query
- [ ] N3 reasoning overhead
- [ ] Lock contention
- [ ] Memory pressure
- [ ] Dependency chain length
- [ ] Other: <!-- Please describe -->

## Analysis

<!-- Provide profiling data, flamegraphs, or other analysis -->

## Suggested Fixes

<!-- What optimization strategies might help? -->

## Additional Context

<!-- Add any other context, logs, or screenshots -->

## Related Issues

<!-- Link to related performance issues -->

---

**Regression Detection Report:**
<!-- Attach the full regression report if available -->
