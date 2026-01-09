# Testing Action Plan - Path to 100% Pass Rate & 80%+ Coverage

**Created**: January 9, 2026
**Target**: Achieve 100% test pass rate and 80%+ coverage metrics
**Current Status**: 50-60% baseline pass rate, infrastructure improved

---

## Priority 1: Resolve Critical Blockers (Est. 1-2 hours)

### Task 1.1: Initialize UnRDF Submodule
**Status**: BLOCKED - Missing dependency
**Files Affected**:
- vendor/unrdf/ (all tests using RDF features)
- tests/cli.test.mjs (6 failures due to missing @unrdf/oxigraph)

**Action**:
```bash
# Try recursive initialization with depth limit
git submodule update --init --recursive --depth=1

# If that fails, try alternative approach
git submodule foreach --recursive git fetch
git submodule update --init --recursive

# Verify UnRDF is accessible
ls vendor/unrdf/packages/core/package.json
```

**Expected Outcome**: @unrdf/oxigraph becomes available
**Pass Rate Impact**: +25-30% (enables CLI tests)

### Task 1.2: Fix Test Code API Mismatches
**Status**: IDENTIFIED - Test code issues
**File**: tests/cache-system.test.mjs
**Lines**: Around 340-360

**Issues to Fix**:
```javascript
// WRONG - These methods don't exist:
await registry.get('pack-name');      // ✗ registry has no get()
await registry.resolve('pack-name');  // ✗ registry has no resolve()

// CORRECT - Should use actual API:
// Review: src/pack/registry.mjs or src/composables/registry.mjs
// For actual available methods
```

**Action Steps**:
1. Open src/composables/registry.mjs or src/pack/registry.mjs
2. Identify available public methods
3. Update tests in tests/cache-system.test.mjs
4. Run: `npm test -- tests/cache*.test.mjs --run`

**Expected Outcome**: Cache tests pass rate improves to 85%+
**Pass Rate Impact**: +15-20% (fixes cache test suite)

---

## Priority 2: Measure Coverage (Est. 30 minutes)

### Task 2.1: Run Full Test Suite with Coverage
**Status**: READY - Tools installed
**Command**:
```bash
npm test -- --run --coverage
```

**Expected Output**:
- HTML report at: coverage/index.html
- JSON report at: coverage/coverage-final.json
- Summary in terminal showing:
  - Statements: X%
  - Branches: Y%
  - Functions: Z%
  - Lines: W%

**Success Criteria**:
- All tests complete without timeout issues
- Coverage report generated successfully
- Identify under-covered code paths

**Action**:
1. Run command above
2. Open coverage/index.html in browser
3. Document coverage percentages in TEST_VERIFICATION_LOG.md
4. Identify which source files need more coverage

---

## Priority 3: Fix Timeout Issues (Est. 2-3 hours)

### Task 3.1: Profile RDFLockManager Performance
**Status**: DOCUMENTED - Timeout at 60+ seconds for <10ms tests
**File**: tests/git-native/RDFLockManager.test.mjs

**Current Problem**:
```
Test: "should handle lock operations under 10ms"
Expected: <10ms
Actual: >60000ms (timeout)
```

**Investigation Steps**:
1. Use Node.js profiler:
```bash
node --prof tests/git-native/RDFLockManager.test.mjs
node --prof-process isolate-*.log > profile.txt
```

2. Add performance timing markers:
```javascript
// In RDFLockManager.test.mjs
console.time('lock-acquire');
const acquired = await rdfLockManager.acquireLock(lockName);
console.timeEnd('lock-acquire');
```

3. Check MockKnowledgeSubstrate for bottlenecks

**Likely Causes**:
- Inefficient RDF query patterns
- N+1 problems in lock lookups
- Blocking async operations
- Memory leaks causing GC pauses

**Fix Strategy**:
1. Add query result caching to MockKnowledgeSubstrate
2. Batch RDF operations
3. Use Promise.all() for parallel operations
4. Profile and optimize hot paths

**Expected Outcome**: Tests complete in <100ms
**Pass Rate Impact**: +30-40% (enables integration tests)

### Task 3.2: Update Test Timeouts (Fallback)
**If profiling shows acceptable times**:
```javascript
// In vitest.config.mjs - make more granular
const config = {
  test: {
    // Default for most tests
    testTimeout: 30000,

    // For specific suites
    define: {
      'integration': 120000,  // 2 minutes
      'e2e': 180000,          // 3 minutes
      'unit': 10000,          // 10 seconds
    }
  }
}
```

---

## Priority 4: Address Remaining Issues (Est. 1-2 hours)

### Task 4.1: Fix Git-Native Tests
**Status**: Timeout issues identified
**Files Affected**:
- tests/git-native/Phase1-Integration.test.mjs
- tests/git-native/RDFLockManager.test.mjs

**Action**:
1. After profiling, apply performance fixes
2. Re-run with timeout profiling data
3. Adjust timeouts as needed
4. Add performance assertions

### Task 4.2: Review and Update Other Failing Tests
**Status**: Case-by-case review needed
**Process**:
1. Run full suite: `npm test -- --run 2>&1 | tee test-results.txt`
2. Filter failures: `grep "FAIL\|×" test-results.txt`
3. For each failure:
   - Understand root cause
   - Fix or document as known issue
   - Update test code if needed
   - Re-run to verify fix

---

## Priority 5: Achieve 80%+ Coverage (Est. 2 hours)

### Task 5.1: Analyze Coverage Report
**After running with --coverage**:
1. Open coverage/index.html
2. Sort by coverage percentage (lowest first)
3. Identify files below 80%:
   - Note current percentage
   - Count lines not covered
   - Understand why they're not tested

### Task 5.2: Increase Coverage
**For each under-covered file**:

**Strategy 1: Add Unit Tests**
```javascript
// tests/my-module.test.mjs
describe('MyModule', () => {
  it('should handle edge case X', () => {
    // Test uncovered branch
  });

  it('should handle error condition Y', () => {
    // Test error path
  });
});
```

**Strategy 2: Add Integration Tests**
- Test module in real workflow context
- Coverage will naturally improve

**Strategy 3: Refactor for Testability**
- Remove untestable code
- Extract complex logic to functions
- Add dependency injection

**Target**: Each file >80% coverage

---

## Success Criteria & Metrics

### Passing All Tests
```
✓ npm test -- --run shows:
  Test Files: 0 failed
  Tests: 0 failed (all passed)
```

### Coverage Targets
```
✓ npm test -- --run --coverage shows:
  Statements:  ≥80%
  Branches:    ≥75%
  Functions:   ≥80%
  Lines:       ≥80%
```

### Performance Requirements
```
✓ Unit tests: <100ms each
✓ Integration tests: <500ms each
✓ E2E tests: <2000ms each
✓ No test timeouts (all complete within 120s)
```

---

## Validation Checklist

Before marking session as complete:

- [ ] `npm test -- --run` produces 0 failures
- [ ] `npm test -- --run --coverage` shows ≥80% across all metrics
- [ ] TEST_VERIFICATION_LOG.md updated with final results
- [ ] All configuration changes committed
- [ ] No timeout warnings in test output
- [ ] Coverage report shows improvement from baseline
- [ ] UnRDF submodule fully initialized
- [ ] All test code APIs match implementations

---

## Implementation Timeline

### Hour 1: Critical Blockers
- [ ] Initialize UnRDF submodule (30 min)
- [ ] Fix API mismatches in tests (30 min)
- [ ] Quick test run to verify (15 min)

### Hour 2: Coverage Baseline
- [ ] Run full suite with coverage (15 min)
- [ ] Analyze coverage report (15 min)
- [ ] Document under-covered areas (15 min)
- [ ] Plan coverage improvement (15 min)

### Hour 3-5: Performance & Coverage
- [ ] Profile timeout tests (30 min)
- [ ] Optimize RDF operations (60 min)
- [ ] Add coverage-improving tests (45 min)
- [ ] Final validation run (15 min)

**Total Estimated Time**: 5-7 hours for full completion

---

## Fallback Options

**If timeout issues persist after profiling**:
1. Increase test timeout to 180-300 seconds
2. Mark specific tests as @slow or @integration
3. Run timeout-prone tests separately
4. Accept 95%+ pass rate instead of 100%

**If coverage goals seem unattainable**:
1. Aim for 75-80% (from current 50-60%)
2. Focus on critical path coverage
3. Document why certain code isn't tested
4. Use coverage thresholds enforcement

**If UnRDF submodule won't initialize**:
1. Skip UnRDF-dependent tests
2. Mark tests with @requires-unrdf
3. Run reduced test suite for baseline
4. Defer UnRDF integration to future sprint

---

## Communication Checkpoints

### After Priority 1 (Critical Blockers)
- Expected: 70-80% of tests runnable
- Report: Number of newly-passing tests
- Next: Proceed to Priority 2

### After Priority 2 (Coverage Baseline)
- Expected: Full coverage report
- Report: Coverage percentages by file
- Next: Identify optimization targets

### After Priority 3 (Timeout Fixes)
- Expected: 85-95% pass rate
- Report: Tests completing in <120s
- Next: Address final edge cases

### Final Validation
- Expected: 100% pass rate, 80%+ coverage
- Report: Full summary in TEST_VERIFICATION_LOG.md
- Sign-off: Ready for production

---

## Notes for Next QA Session

1. **Critical**: Start with Task 1.1 (UnRDF initialization)
2. **Use baseline**: 50-60% starting point for comparison
3. **Track metrics**: Document coverage % before/after each fix
4. **Commit often**: Small, focused commits for each fix
5. **Test frequently**: Run suite after each significant change

---

**This Action Plan Created By**: QA Testing Agent
**Session Date**: January 9, 2026
**Review Date**: Next QA Session
**Status**: READY FOR IMPLEMENTATION
