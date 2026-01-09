# Phase 1 Performance Tracking & Benchmarking

This document describes the performance tracking and benchmarking setup for GitVan Phase 1 RDF implementation.

## Overview

GitVan Phase 1 implements RDF-backed semantic state management for Git-Native I/O operations. To ensure performance remains within acceptable bounds, we have implemented comprehensive benchmarking and regression detection.

## Performance Targets

All Phase 1 operations must meet the following performance targets (P95):

| Operation | Target | Description |
|-----------|--------|-------------|
| Lock acquire/release | < 10ms | Distributed lock acquisition and release |
| SPARQL queries | < 100ms | All SPARQL queries (deadlock detection, etc.) |
| Snapshot operations | < 50ms | Snapshot save/load operations |
| Queue operations | < 25ms | Job queue enqueue/dequeue |

**P95**: 95th percentile - 95% of operations must complete within the target time.

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/test.yml` workflow includes:

1. **Phase 1 RDF Tests** - Run all Phase 1 tests with coverage
   - Lock Manager tests
   - Snapshot Store tests
   - Queue Manager tests
   - Integration tests
   - Coverage threshold: 80%

2. **Performance Benchmarks** - Run on every push and nightly
   - Phase 1 performance benchmarks
   - Regression detection (>10% slowdown fails CI)
   - Results stored in `.benchmarks/` directory
   - Historical tracking via Git

### Running Benchmarks Locally

```bash
# Run Phase 1 benchmarks
node scripts/benchmark-phase1.mjs

# Check for performance regressions
node scripts/check-performance-regression.mjs
```

## Benchmark Output

Example benchmark output:

```
================================================================================
Phase 1 RDF Performance Benchmarks
================================================================================

Operation                   Mean      Median         P95         P99      Target  Status
------------------------------------------------------------------------------------
lock_acquire              3.45ms      3.21ms      4.12ms      5.67ms       10ms  ✓ PASS
lock_release              2.89ms      2.67ms      3.45ms      4.23ms       10ms  ✓ PASS
lock_query               45.67ms     42.34ms     67.89ms     78.90ms      100ms  ✓ PASS
snapshot_save            23.45ms     21.23ms     34.56ms     45.67ms       50ms  ✓ PASS
snapshot_load            19.87ms     18.45ms     28.90ms     36.78ms       50ms  ✓ PASS
snapshot_query           56.78ms     53.45ms     78.90ms     89.01ms      100ms  ✓ PASS
queue_enqueue            12.34ms     11.23ms     17.89ms     23.45ms       25ms  ✓ PASS
queue_dequeue            11.89ms     10.67ms     16.78ms     21.23ms       25ms  ✓ PASS
queue_query              67.89ms     64.56ms     89.01ms     98.76ms      100ms  ✓ PASS
sparql_deadlock          34.56ms     32.45ms     48.90ms     56.78ms      100ms  ✓ PASS
sparql_blocking          42.34ms     39.87ms     58.90ms     67.89ms      100ms  ✓ PASS
sparql_long_locks        38.90ms     36.78ms     52.34ms     61.23ms      100ms  ✓ PASS
------------------------------------------------------------------------------------

Total: 12 passed, 0 failed

✅ All benchmarks passed performance targets!

Benchmarks completed in 15.34s
```

## Performance Regression Detection

The CI pipeline automatically detects performance regressions:

1. **Baseline Establishment**: First successful benchmark run creates `baseline.json`
2. **Comparison**: Each subsequent run compares against baseline
3. **Regression Threshold**: >10% slowdown is flagged as regression
4. **CI Failure**: Regressions fail the CI pipeline

### Regression Report Example

```
================================================================================
Performance Regression Check
================================================================================

Current:  2026-01-09T12:34:56.789Z
Baseline: 2026-01-08T10:20:30.456Z
Threshold: 10% slowdown

Operation                   Current     Baseline       Change  Status
------------------------------------------------------------------------------------
lock_acquire              4.12ms      3.89ms       +5.9%  ✓ OK
lock_release              3.45ms      3.12ms       +10.6%  ⚠️  ✗ REGRESSION
lock_query               67.89ms     72.34ms       -6.1%  🚀 ✓ IMPROVED
------------------------------------------------------------------------------------

⚠️  1 performance regression(s) detected:

  - lock_release: 3.12ms → 3.45ms (+10.6%)

🚀 1 performance improvement(s) detected:

  - lock_query: 72.34ms → 67.89ms (-6.1%)
```

## Benchmark Storage

Benchmarks are stored in `.benchmarks/` directory:

```
.benchmarks/
├── latest.json          # Most recent benchmark results
├── baseline.json        # Baseline for regression detection
└── benchmark-*.json     # Historical results
```

**Format** (JSON):

```json
{
  "timestamp": "2026-01-09T12:34:56.789Z",
  "commit": "abc123...",
  "branch": "main",
  "results": {
    "lock_acquire": {
      "mean": 3.45,
      "median": 3.21,
      "p95": 4.12,
      "p99": 5.67,
      "min": 2.89,
      "max": 7.89,
      "iterations": 100,
      "target": 10,
      "pass": true
    },
    ...
  }
}
```

## Monitoring in CI

GitHub Actions provides:

1. **Job Summary**: Performance metrics in GitHub UI
2. **Artifacts**: Benchmark results downloadable for analysis
3. **Status Checks**: Pass/fail based on targets and regressions
4. **Annotations**: Regressions highlighted in PR checks

## Updating Performance Targets

If performance targets need adjustment:

1. Update `TARGETS` in `scripts/benchmark-phase1.mjs`
2. Document reason in commit message
3. Ensure all tests pass with new targets
4. Update this documentation

## Troubleshooting

### Benchmark Failures

**Problem**: Benchmarks fail to meet targets

**Solutions**:
1. Check for resource contention (reduce `maxConcurrency` in vitest.config.mjs)
2. Profile slow operations with `node --prof`
3. Review SPARQL query optimization
4. Check for N+1 query patterns
5. Verify caching is working correctly

### Regression False Positives

**Problem**: Legitimate code changes flagged as regressions

**Solutions**:
1. Run benchmarks multiple times to confirm
2. Check for environment differences (CI vs local)
3. Update baseline if intentional architectural change
4. Document performance trade-offs in PR

### Missing Benchmark Results

**Problem**: No benchmark artifacts in CI

**Solutions**:
1. Check workflow logs for script errors
2. Verify `.benchmarks/` directory created
3. Ensure `continue-on-error: true` not hiding failures
4. Run locally to reproduce issue

## Best Practices

1. **Run benchmarks locally** before pushing
2. **Check for regressions** in PR reviews
3. **Document performance changes** in commit messages
4. **Profile before optimizing** - measure first
5. **Keep benchmarks fast** - total runtime < 2 minutes
6. **Use realistic test data** - not artificial microbenchmarks
7. **Track long-term trends** - save historical data

## Future Enhancements

- [ ] Benchmark visualization dashboard
- [ ] Automated performance alerts (Slack, email)
- [ ] Historical trend analysis
- [ ] Comparison across branches
- [ ] Memory usage tracking
- [ ] CPU profiling integration
- [ ] Load testing (1000+ concurrent operations)

## Related Documentation

- [Phase 1 Implementation Plan](PHASE-1-GIT-NATIVE-RDF-IMPLEMENTATION.md)
- [GitHub Actions Workflow](.github/workflows/test.yml)
- [Deadlock Report Template](.github/ISSUE_TEMPLATE/deadlock-report.md)

---

**Last Updated**: January 9, 2026
**Status**: ✅ Active
**Maintained By**: GitVan Core Team
