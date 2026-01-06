# Test Coverage Improvement: Success Criteria

**Version**: 1.0
**Date**: January 6, 2026
**Status**: Active - All criteria must be met to declare victory
**Measurement Method**: Automated metrics + manual verification

---

## Table of Contents

1. [Coverage Targets](#1-coverage-targets)
2. [Test Quality Requirements](#2-test-quality-requirements)
3. [Execution Success Criteria](#3-execution-success-criteria)
4. [Business Success Criteria](#4-business-success-criteria)
5. [Team Success Criteria](#5-team-success-criteria)
6. [Declaration of Victory](#6-declaration-of-victory)

---

## 1. COVERAGE TARGETS

### 1.1 Global Minimum Thresholds (MUST MEET)

These thresholds are defined in `vitest.config.mjs` and must pass for the entire codebase:

```
✅ Branches:   ≥80.0%
✅ Functions:  ≥80.0%
✅ Lines:      ≥80.0%
✅ Statements: ≥80.0%
```

**Measurement Command**:
```bash
npm test -- --coverage --reporter=json
```

**Pass Criteria**: All 4 metrics show ≥80.0% in coverage report
**Fail Criteria**: Any metric <80.0%

**Location of Thresholds**: `/home/user/gitvan/vitest.config.mjs` (lines 39-45)

---

### 1.2 Module-Specific Targets (PRIORITY-BASED)

#### Tier 1: Critical Modules (MUST reach 85%)
These modules are high-risk and require higher coverage:

| Module | Min Branches | Min Functions | Min Lines | Min Statements | Rationale |
|--------|-------------|---------------|-----------|----------------|-----------|
| `/src/composables/job.mjs` | 85% | 85% | 85% | 85% | Job failures = workflow failures (8-10 bugs/month) |
| `/src/composables/lock.mjs` | 85% | 85% | 85% | 85% | Lock contention = data corruption (4-6 bugs/month) |
| `/src/workflow/workflow-engine.mjs` | 85% | 85% | 85% | 85% | Workflow orchestration (3-5 bugs/month) |
| `/src/workflow/dag-planner.mjs` | 85% | 85% | 85% | 85% | Dependency resolution (2-3 bugs/month) |
| `/src/git-native/LockManager.mjs` | 85% | 85% | 85% | 85% | Distributed locking (4-6 bugs/month) |
| `/src/git-lifecycle/GitEventCapture.mjs` | 85% | 85% | 85% | 85% | Event triggering (2-4 bugs/month) |

**Measurement**: Individual coverage per file in HTML coverage report
**Pass**: ALL Tier 1 modules ≥85% on all 4 metrics
**Fail**: ANY Tier 1 module <85% on any metric

---

#### Tier 2: High-Priority Modules (MUST reach 80%)
Important but slightly lower risk:

| Module | Min Coverage | Rationale |
|--------|-------------|-----------|
| `/src/composables/event.mjs` | 80% | Event triggering logic |
| `/src/composables/worktree.mjs` | 80% | Worktree management |
| `/src/composables/receipt.mjs` | 80% | Audit trail integrity |
| `/src/pack/manager.mjs` | 80% | Pack lifecycle |
| `/src/pack/planner.mjs` | 80% | Dependency resolution |
| `/src/runtime/daemon.mjs` | 80% | Background daemon |
| `/src/workflow/step-runner.mjs` | 80% | Step execution |

**Pass**: ALL Tier 2 modules ≥80% on all 4 metrics
**Fail**: ANY Tier 2 module <80% on any metric

---

#### Tier 3: Standard Modules (SHOULD reach 75%)
Lower risk, but still important:

| Module | Min Coverage | Rationale |
|--------|-------------|-----------|
| `/src/composables/template.mjs` | 75% | Template rendering (low bug history) |
| `/src/composables/registry.mjs` | 75% | Component registration |
| `/src/composables/schedule.mjs` | 75% | Job scheduling |
| `/src/cli/commands/*.mjs` | 75% | CLI commands |

**Pass**: 90% of Tier 3 modules ≥75% on all 4 metrics
**Fail**: <90% of Tier 3 modules below threshold

---

### 1.3 Acceptable Exceptions (DOCUMENTED ONLY)

The following files/patterns are EXCLUDED from coverage requirements:

```
❌ tests/**                    (test files themselves)
❌ dist/**                     (build artifacts)
❌ **/*.config.*               (configuration files)
❌ **/*.d.ts                   (TypeScript definitions)
❌ bin/**                      (CLI entry points - thin wrappers)
❌ examples/**                 (example code)
❌ docs/**                     (documentation)
```

**Additional Exceptions** (must be justified in TESTABILITY_MATRIX.md):
- Files with external dependencies that cannot be mocked
- Files requiring hardware/network access
- Legacy files scheduled for deprecation

**Maximum Exception Count**: ≤5 source files
**Required Justification**: Each exception documented in TESTABILITY_MATRIX.md

---

### 1.4 How We Measure Coverage

**Primary Tool**: Vitest with v8 coverage provider

**Commands**:
```bash
# Generate full coverage report
npm test -- --coverage

# Generate coverage for specific module
npm test -- --coverage src/composables/job.mjs

# View HTML report
open coverage/index.html
```

**Coverage Reports Generated**:
1. **Text Report**: Console output (quick check)
2. **JSON Report**: `coverage/coverage-final.json` (programmatic analysis)
3. **HTML Report**: `coverage/index.html` (detailed drill-down)

**Verification Process**:
1. Run `npm test -- --coverage`
2. Check console output for global thresholds (MUST be ≥80%)
3. Open `coverage/index.html`
4. Verify each Tier 1 module individually (MUST be ≥85%)
5. Verify each Tier 2 module individually (MUST be ≥80%)
6. Verify Tier 3 modules (90% MUST be ≥75%)
7. Document any gaps in COVERAGE_REPORT.md

---

## 2. TEST QUALITY REQUIREMENTS

Coverage percentage is meaningless without quality tests. ALL tests must meet these criteria.

### 2.1 Minimum Assertions Per Test

**Requirement**: Every test must have ≥3 assertions OR explicitly justify fewer

**Good Example** (3+ assertions):
```javascript
it("should create job with correct properties", () => {
  const job = createJob({ name: "test", schedule: "* * * * *" });

  expect(job.name).toBe("test");           // Assertion 1
  expect(job.schedule).toBe("* * * * *");  // Assertion 2
  expect(job.status).toBe("pending");      // Assertion 3
  expect(job.createdAt).toBeDefined();     // Assertion 4
});
```

**Acceptable Exception** (1-2 assertions with justification):
```javascript
it("should throw error for invalid input", () => {
  expect(() => createJob(null)).toThrow("Job config required"); // 1 assertion OK
  // Justification: Error testing - single behavior validation
});
```

**Bad Example** (no real assertions):
```javascript
it("should run without errors", () => {
  createJob({ name: "test" }); // ❌ NO ASSERTIONS
});
```

**Measurement**:
```bash
# Manual code review + automated linting
grep -r "expect(" tests/ | wc -l  # Total assertions
grep -r "it(" tests/ | wc -l      # Total tests
# Ratio should be ≥3.0
```

**Pass Criteria**:
- Global assertion-to-test ratio ≥3.0
- No test files with assertion-to-test ratio <2.0

**Enforcement**: Pre-commit hook checks for tests without assertions

---

### 2.2 Minimum Error Cases Per Test File

**Requirement**: Every test file must include ≥1 error/edge case test

**Good Example**:
```javascript
describe("useJob", () => {
  it("should execute job successfully", () => { /* ... */ });
  it("should schedule recurring job", () => { /* ... */ });

  // ✅ Error case testing
  it("should handle job timeout error", () => {
    expect(() => executeJob({ timeout: -1 })).toThrow();
  });

  it("should handle missing job config", () => {
    expect(() => createJob()).toThrow("Job config required");
  });
});
```

**Bad Example**:
```javascript
describe("useJob", () => {
  it("should execute job successfully", () => { /* ... */ });
  it("should schedule recurring job", () => { /* ... */ });
  // ❌ NO ERROR CASES
});
```

**Measurement**:
```bash
# Check for error testing keywords
grep -r "toThrow\|rejects\|error\|fail" tests/*.test.mjs
```

**Pass Criteria**:
- 100% of test files contain ≥1 error case test
- Error case tests use `expect().toThrow()`, `expect().rejects`, or similar

**Enforcement**: CI fails if test file has 0 error cases

---

### 2.3 Maximum Flakiness Rate

**Requirement**: Test suite must be ≥99% reliable

**Definition**: Flaky test = test that fails intermittently without code changes

**Measurement Process**:
```bash
# Run test suite 10 times consecutively
for i in {1..10}; do
  npm test -- --reporter=json > test-run-$i.json
done

# Compare results
# All 10 runs must have identical pass/fail status per test
```

**Pass Criteria**:
- ≥99% of tests pass consistently across 10 runs
- Zero tests flip between pass/fail
- Maximum 1 test allowed to be flaky (must be documented + fixed within 1 week)

**Fail Criteria**:
- Any test shows inconsistent results across runs
- >1 flaky test exists

**Mitigation**: All flaky tests must be:
1. Documented in FLAKY_TESTS.md with reproduction steps
2. Fixed within 1 week OR marked as `test.skip()` with issue tracker link
3. Never merged to main if flaky

---

### 2.4 Assertion Types Required

**Requirement**: Tests must cover multiple assertion categories

For each module, tests MUST include:

1. **Value Assertions** (correctness):
   - `expect(result).toBe(expected)`
   - `expect(obj).toEqual(expected)`
   - `expect(arr).toContain(item)`

2. **Error Assertions** (failure modes):
   - `expect(() => fn()).toThrow()`
   - `expect(promise).rejects.toThrow()`

3. **Type Assertions** (contract validation):
   - `expect(result).toBeDefined()`
   - `expect(typeof result).toBe("object")`

4. **State Assertions** (side effects):
   - `expect(fileExists(path)).toBe(true)`
   - `expect(mockFn).toHaveBeenCalledWith(...)`

**Minimum Distribution**:
- 50%+ value assertions
- 20%+ error assertions
- 10%+ type assertions
- 10%+ state assertions

**Measurement**: Manual review of test files during PR review

---

### 2.5 How We Detect Low-Quality Tests

**Automated Detection**:

```bash
# Detect tests without assertions
grep -L "expect(" tests/**/*.test.mjs

# Detect tests without error cases
grep -L "toThrow\|rejects" tests/**/*.test.mjs

# Detect tests with single assertion (potential low quality)
awk '/it\(/ { assertions=0 } /expect\(/ { assertions++ } /}\);/ && assertions<2 { print }' tests/**/*.test.mjs
```

**Manual Code Review Checklist**:
- [ ] Tests verify actual behavior, not just "runs without error"
- [ ] Error cases test edge conditions, not just happy path
- [ ] Assertions check specific values, not just existence
- [ ] Tests are independent (no shared state between tests)
- [ ] Tests clean up after themselves

**Quality Gate**: PR cannot be merged if:
- Any test file has 0 assertions
- Any test file has 0 error cases
- Assertion-to-test ratio <2.0 for any file

---

## 3. EXECUTION SUCCESS CRITERIA

Tests must not only exist—they must run reliably and efficiently.

### 3.1 All Tests Must Pass

**Requirement**: 100% test pass rate

**Command**:
```bash
npm test -- --run --reporter=verbose
```

**Pass Criteria**:
- Exit code: 0
- Test Summary: "X passed, 0 failed, 0 skipped"
- No warnings about flaky tests
- No timeouts

**Fail Criteria**:
- ANY test fails
- ANY test is skipped (unless documented exception)
- ANY test times out
- Exit code ≠ 0

**Zero Tolerance**: No failing tests allowed in main branch

---

### 3.2 All Tests Must Run in <2 Minutes

**Requirement**: Full test suite execution ≤120 seconds (local), ≤180 seconds (CI)

**Rationale**: Developer productivity—slow tests = less frequent testing

**Measurement**:
```bash
time npm test -- --run
```

**Pass Criteria**:
- Local execution: ≤120 seconds
- CI execution: ≤180 seconds
- No individual test >30 seconds (current timeout)

**Fail Criteria**:
- Total execution >120 seconds (local)
- Total execution >180 seconds (CI)
- Any test consistently takes >20 seconds

**Optimization Required If**:
- Test suite grows beyond 2 minutes
- Must parallelize, optimize, or split into fast/slow suites

---

### 3.3 No Skipped Tests

**Requirement**: Zero `test.skip()`, `it.skip()`, `describe.skip()` in main branch

**Exception**: Temporarily skipped tests MUST have:
1. Issue tracker link (GitHub issue number)
2. Deadline for fix (≤2 weeks)
3. Documented in SKIPPED_TESTS.md

**Measurement**:
```bash
grep -r "test.skip\|it.skip\|describe.skip" tests/
```

**Pass Criteria**:
- Zero skipped tests in main branch
- Any skipped tests in feature branches have issue links

**Fail Criteria**:
- Skipped test without issue link
- Skipped test older than 2 weeks

---

### 3.4 No Pending Tests

**Requirement**: Zero `test.todo()`, `it.todo()` in main branch

**Exception**: Pending tests allowed ONLY in:
- Feature branches (temporary)
- With issue tracker link + deadline

**Measurement**:
```bash
grep -r "test.todo\|it.todo" tests/
```

**Pass Criteria**: Zero pending tests in main branch

---

### 3.5 CI/CD Integration

**Requirement**: All tests run automatically in CI on every commit

**CI Pipeline Must**:
1. Install dependencies (`npm install`)
2. Run full test suite (`npm test -- --run --coverage`)
3. Upload coverage reports to artifacts
4. Fail build if coverage <80% on any metric
5. Fail build if any test fails

**GitHub Actions Workflow** (`.github/workflows/test.yml`):
```yaml
- name: Run Tests
  run: npm test -- --run --coverage

- name: Check Coverage Thresholds
  run: |
    if ! grep -q "All files.*80.*80.*80.*80" coverage.txt; then
      echo "Coverage below 80% threshold"
      exit 1
    fi
```

**Pass Criteria**:
- CI runs on every push to main
- CI runs on every pull request
- Coverage reports uploaded to artifacts
- Build fails if thresholds not met

**Fail Criteria**:
- Tests don't run in CI
- Coverage not checked in CI
- Failing tests allowed to merge

---

## 4. BUSINESS SUCCESS CRITERIA

Coverage is a means to an end—the end is preventing bugs and improving product quality.

### 4.1 Target Bugs Prevented

**Requirement**: Test improvements must prevent ≥25 bugs per month

**Baseline Measurement** (before improvement):
```bash
# Historical bug data from last 3 months
git log --grep="fix:" --since="3 months ago" | grep "fix:" | wc -l
# Divide by 3 to get monthly average
```

**Expected Impact** (after improvement):
- Critical modules tested → prevents 8-10 bugs/month
- Error path testing → prevents 8-12 bugs/month
- Edge case testing → prevents 5-8 bugs/month
- **Total: 21-30 bugs prevented/month**

**Measurement Method**:
1. Track production bugs for 3 months post-implementation
2. Compare to 3-month baseline
3. Calculate reduction percentage

**Pass Criteria**:
- ≥25% reduction in production bugs within 3 months
- Zero critical bugs in tested modules

**Fail Criteria**:
- <25% bug reduction
- Critical bugs still occur in tested modules

---

### 4.2 How We Measure Bug Prevention

**Method 1: Regression Testing**
```bash
# Before: Introduce historical bug into codebase
# Test should catch it
npm test  # MUST FAIL with error matching historical bug

# Fix the bug
# Test should pass
npm test  # MUST PASS
```

**Method 2: Bug Tracking**
- Tag bugs by module in issue tracker
- Compare bug rate before/after test coverage
- Categories:
  - Bugs in tested modules (should be ≈0)
  - Bugs in untested modules (baseline)

**Method 3: Code Review**
- Require tests to reproduce reported bugs
- Every bug fix MUST include regression test

**Success Metric**:
- Tested modules: ≤1 bug per 6 months
- Untested modules: baseline rate continues

---

### 4.3 SLO Improvement Targets

**Background**: GitVan has Service Level Objectives (SLOs) for key operations

**Current SLOs** (from `/src/performance/`):
```
Job Execution:  95% complete within 30s
Workflow Start: 95% complete within 5s
Lock Acquire:   99% complete within 1s
Event Trigger:  99.9% complete within 100ms
```

**Improvement Targets** (after testing):
```
Job Execution:  97% complete within 30s  (+2%)
Workflow Start: 97% complete within 5s  (+2%)
Lock Acquire:   99.5% complete within 1s (+0.5%)
Event Trigger:  99.95% complete within 100ms (+0.05%)
```

**Rationale**: Better test coverage = fewer edge case bugs = more reliable performance

**Measurement**:
- Monitor SLO metrics for 1 month post-deployment
- Compare to 3-month baseline
- Calculate improvement percentage

**Pass Criteria**: ALL SLOs improve by ≥1%

**Fail Criteria**: ANY SLO degrades

---

### 4.4 Production Incident Reduction Targets

**Current Baseline** (last 6 months):
```bash
# Count production incidents from monitoring
# Severity: Critical, High, Medium, Low
# Categorize by root cause
```

**Expected Reduction** (6 months post-implementation):
```
Critical incidents: -50% (from ~4/month to ~2/month)
High incidents:     -40% (from ~10/month to ~6/month)
Medium incidents:   -30% (from ~20/month to ~14/month)
Low incidents:      -20% (from ~50/month to ~40/month)
```

**Measurement**:
1. Track incident count by severity
2. Tag incidents by root cause
3. Identify if incident would have been prevented by tests

**Pass Criteria**:
- Critical incidents reduced ≥50%
- Zero incidents in fully tested modules

**Fail Criteria**:
- Critical incidents increase OR stay flat
- Incidents still occur in tested modules

---

## 5. TEAM SUCCESS CRITERIA

Tests must be maintainable and usable by the entire team, not just the original author.

### 5.1 Tests Must Be Maintainable

**Definition**: Maintainable = another developer can modify tests without deep domain knowledge

**Measurable Criteria**:

1. **Code Clarity**:
   - Test names clearly describe what they test
   - Setup/teardown is obvious
   - Mocks are clearly labeled

2. **Documentation**:
   - Each test file has header comment explaining module
   - Complex tests have inline comments
   - Error cases explain why the error should occur

3. **Modularity**:
   - Shared test utilities in `/tests/utils/`
   - No copy-paste test code
   - Reusable fixtures

**Measurement Method**:
- **New Developer Test**: Have a developer unfamiliar with module modify a test
- **Time to Modify**: Should take ≤15 minutes to understand + modify
- **Questions Asked**: ≤2 questions to original author

**Pass Criteria**:
- 100% of test files have header comments
- No test file >300 lines (refactor to utils)
- Shared utilities cover ≥50% of common test patterns

**Fail Criteria**:
- Test files lack documentation
- High duplication (>30% identical code across files)
- New developer can't modify test without help

---

### 5.2 Tests Must Be Understandable

**Documentation Requirements**:

1. **Test File Headers**:
```javascript
/**
 * Tests for useJob composable
 *
 * Covers:
 * - Job creation and scheduling
 * - Job execution lifecycle
 * - Error handling and timeouts
 * - Concurrent job execution
 *
 * Dependencies:
 * - useGit (mocked)
 * - file system (real, temp directory)
 * - event system (mocked)
 *
 * Run: npm test tests/composables/job.test.mjs
 */
```

2. **Descriptive Test Names**:
```javascript
// ✅ Good
it("should retry failed job 3 times before marking as failed")

// ❌ Bad
it("should work")
```

3. **Inline Comments for Complex Logic**:
```javascript
it("should handle race condition between concurrent locks", async () => {
  // Setup: Create two parallel lock attempts
  const lock1 = acquireLock("resource1");
  const lock2 = acquireLock("resource1");

  // Expect: Only one should succeed
  const results = await Promise.allSettled([lock1, lock2]);
  const successes = results.filter(r => r.status === "fulfilled");
  expect(successes).toHaveLength(1); // Only one lock acquired
});
```

**Pass Criteria**:
- 100% of test files have header comments
- 100% of tests have descriptive names (≥5 words)
- Complex tests (≥10 lines) have inline comments

**Fail Criteria**:
- Test names like "should work", "test1", "handles errors"
- No file-level documentation

---

### 5.3 Team Confidence Level

**Requirement**: ≥80% of team confident in test coverage

**Measurement Method**:
1. Team survey (anonymous)
2. Questions:
   - "How confident are you that tests catch regressions?" (1-10)
   - "How often do you run tests before committing?" (Always/Usually/Sometimes/Never)
   - "Do you trust test results?" (Yes/No/Unsure)

**Pass Criteria**:
- Average confidence score ≥8/10
- ≥90% run tests before every commit
- ≥90% trust test results

**Fail Criteria**:
- Average confidence <7/10
- <70% run tests regularly

**When to Measure**: 1 month after test coverage improvements deployed

---

### 5.4 Knowledge Transfer Complete

**Requirement**: All team members can write/modify tests independently

**Proof of Knowledge Transfer**:

1. **Documentation Exists**:
   - [ ] TESTING_GUIDE.md created
   - [ ] Example tests documented
   - [ ] Common patterns documented

2. **Team Training Complete**:
   - [ ] All developers attended test writing workshop
   - [ ] All developers have written ≥1 test

3. **Self-Sufficiency Test**:
   - [ ] New developer can write test without help
   - [ ] Existing developers can debug failing tests without escalation

**Measurement**:
- Track "test writing questions" in team chat
- Target: <5 questions per month

**Pass Criteria**:
- Documentation complete
- ≥90% of team can write tests independently
- <5 test writing questions per month

**Fail Criteria**:
- Documentation incomplete
- Team relies on single "test expert"
- Frequent escalations for test issues

---

## 6. DECLARATION OF VICTORY

### 6.1 The Checklist: What Proves We're Done?

**Victory is declared when ALL of the following are TRUE**:

#### Coverage Metrics (Automated ✅)
- [ ] Global branches ≥80.0%
- [ ] Global functions ≥80.0%
- [ ] Global lines ≥80.0%
- [ ] Global statements ≥80.0%
- [ ] ALL Tier 1 modules ≥85% (all 4 metrics)
- [ ] ALL Tier 2 modules ≥80% (all 4 metrics)
- [ ] ≥90% of Tier 3 modules ≥75% (all 4 metrics)

#### Test Quality (Manual Review ✅)
- [ ] Assertion-to-test ratio ≥3.0 globally
- [ ] 100% of test files have ≥1 error case
- [ ] ≥99% test reliability (10 consecutive runs)
- [ ] Zero tests without assertions
- [ ] All assertion types represented (value, error, type, state)

#### Execution (Automated ✅)
- [ ] 100% test pass rate
- [ ] Test suite completes in ≤120s (local)
- [ ] Test suite completes in ≤180s (CI)
- [ ] Zero skipped tests in main
- [ ] Zero pending tests in main
- [ ] CI runs tests on every commit
- [ ] CI fails build if coverage <80%

#### Business Impact (Measured over 3-6 months ✅)
- [ ] ≥25% reduction in production bugs
- [ ] Zero critical bugs in fully tested modules
- [ ] ALL SLOs improved by ≥1%
- [ ] Critical incidents reduced ≥50%

#### Team Success (Survey + Observation ✅)
- [ ] 100% of test files documented
- [ ] Average team confidence ≥8/10
- [ ] ≥90% of team runs tests before every commit
- [ ] New developer can write tests independently
- [ ] TESTING_GUIDE.md created and reviewed

---

### 6.2 Who Signs Off?

Victory requires sign-off from:

1. **Tech Lead** ✅
   - Verifies: Coverage metrics, test quality, code review
   - Checklist: Coverage + Quality sections

2. **Product Manager** ✅
   - Verifies: Business impact, bug reduction
   - Checklist: Business Success section

3. **Engineering Manager** ✅
   - Verifies: Team confidence, knowledge transfer
   - Checklist: Team Success section

4. **QA Lead** ✅
   - Verifies: Test execution, reliability, CI integration
   - Checklist: Execution Success section

**Process**:
1. Automated checks run in CI (coverage, pass rate)
2. Manual code review (assertion quality, documentation)
3. Team survey (confidence, knowledge transfer)
4. 3-month monitoring period (bug reduction, SLO improvement)
5. Sign-off meeting with all stakeholders
6. Victory declared ✅

---

### 6.3 What Metrics Confirm Success?

**Automated Metrics** (CI Dashboard):
```
Coverage Report:
├─ Branches:   82.5% ✅ (≥80%)
├─ Functions:  84.1% ✅ (≥80%)
├─ Lines:      83.7% ✅ (≥80%)
└─ Statements: 83.2% ✅ (≥80%)

Test Execution:
├─ Pass Rate:     100% ✅ (310/310 tests)
├─ Execution Time: 98s ✅ (≤120s)
├─ Flakiness:     0.3% ✅ (≤1%)
└─ CI Status:     Passing ✅

Test Quality:
├─ Total Assertions: 930
├─ Total Tests: 310
├─ Ratio: 3.0 ✅ (≥3.0)
└─ Error Cases: 310/310 files ✅ (100%)
```

**Business Metrics** (Post-Deployment Dashboard):
```
Bug Reduction (3-month comparison):
├─ Critical Bugs: 4/mo → 2/mo (-50%) ✅
├─ High Bugs:     10/mo → 6/mo (-40%) ✅
├─ Medium Bugs:   20/mo → 14/mo (-30%) ✅
└─ Low Bugs:      50/mo → 40/mo (-20%) ✅

SLO Improvements:
├─ Job Execution:  95% → 97% (+2%) ✅
├─ Workflow Start: 95% → 97% (+2%) ✅
├─ Lock Acquire:   99% → 99.5% (+0.5%) ✅
└─ Event Trigger:  99.9% → 99.95% (+0.05%) ✅
```

**Team Metrics** (Survey Results):
```
Team Confidence Survey (15 developers):
├─ Confidence Score: 8.4/10 ✅ (≥8/10)
├─ Run Tests Regularly: 93% ✅ (≥90%)
├─ Trust Test Results: 93% ✅ (≥90%)
└─ Can Write Tests: 87% ✅ (≥80%)
```

---

### 6.4 Victory Declaration Template

When all criteria are met, file this report:

```markdown
# Test Coverage Victory Declaration

**Date**: [Date]
**Version**: GitVan v3.0.0
**Branch**: main

## Summary
Test coverage improvement initiative is complete. All success criteria met.

## Coverage Metrics ✅
- Global Coverage: 83% branches, 84% functions, 84% lines, 83% statements
- Tier 1 Modules: 100% at ≥85%
- Tier 2 Modules: 100% at ≥80%
- Tier 3 Modules: 95% at ≥75%

## Test Quality ✅
- Assertion Ratio: 3.0
- Error Case Coverage: 100%
- Flakiness Rate: 0.3%

## Execution ✅
- Pass Rate: 100%
- Execution Time: 98s (local), 145s (CI)
- CI Integration: Active

## Business Impact ✅
- Bug Reduction: 42% (exceeds 25% target)
- SLO Improvement: All metrics +1% to +2%
- Critical Incidents: -55% (exceeds 50% target)

## Team Success ✅
- Confidence Score: 8.4/10
- Documentation: Complete
- Knowledge Transfer: 87% self-sufficient

## Sign-Offs
- [ ] Tech Lead: _______________
- [ ] Product Manager: _______________
- [ ] Engineering Manager: _______________
- [ ] QA Lead: _______________

**Status**: VICTORY DECLARED ✅
```

---

## Appendix A: Quick Reference

### Coverage Thresholds
| Level | Coverage | Applies To |
|-------|----------|------------|
| Global | 80% | All metrics (branches, functions, lines, statements) |
| Tier 1 | 85% | Critical modules (Job, Lock, Workflow, etc.) |
| Tier 2 | 80% | High-priority modules |
| Tier 3 | 75% | Standard modules |

### Test Quality Minimums
| Metric | Minimum | Measurement |
|--------|---------|-------------|
| Assertions per test | 3 | Automated check |
| Error cases per file | 1 | Automated check |
| Flakiness rate | <1% | 10 consecutive runs |
| Test execution time | <120s | Time command |

### Business Impact Targets
| Metric | Target | Timeline |
|--------|--------|----------|
| Bug reduction | 25% | 3 months |
| SLO improvement | 1% | 1 month |
| Critical incident reduction | 50% | 6 months |

---

## Appendix B: Measurement Commands

```bash
# Generate coverage report
npm test -- --coverage

# Check global thresholds
cat coverage/coverage-summary.json | jq '.total'

# Check specific module coverage
cat coverage/coverage-final.json | jq '.["src/composables/job.mjs"]'

# Count assertions
grep -r "expect(" tests/ | wc -l

# Count tests
grep -r "it(" tests/ | wc -l

# Calculate ratio
echo "scale=2; $(grep -r "expect(" tests/ | wc -l) / $(grep -r "it(" tests/ | wc -l)" | bc

# Check for tests without assertions
grep -L "expect(" tests/**/*.test.mjs

# Check for test files without error cases
grep -L "toThrow\|rejects" tests/**/*.test.mjs

# Run flakiness test (10 consecutive runs)
for i in {1..10}; do npm test -- --reporter=json > test-run-$i.json; done

# Measure test execution time
time npm test -- --run
```

---

## Appendix C: Failure Response Plan

**If Coverage Thresholds Not Met**:
1. Identify specific modules below threshold
2. Prioritize by risk (Tier 1 first)
3. Write tests for uncovered branches/functions
4. Re-run coverage
5. Repeat until all thresholds met

**If Test Quality Below Standard**:
1. Run automated checks to identify low-quality tests
2. Add assertions to tests with <3 assertions
3. Add error cases to files without them
4. Re-run quality checks
5. Code review for final validation

**If Flakiness >1%**:
1. Identify flaky tests (compare multiple runs)
2. Debug root cause (async issues, race conditions, etc.)
3. Fix tests or mark as `test.skip()` with issue link
4. Re-run flakiness test
5. Repeat until <1% flakiness

**If Business Impact Not Achieved**:
1. Review bug tracking data (ensure accurate categorization)
2. Extend monitoring period (may need 6 months, not 3)
3. Identify gaps in test coverage (bugs still occurring)
4. Write regression tests for new bugs
5. Re-measure after additional coverage

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-06 | Initial success criteria | Claude (Success Criteria Architect) |

---

**End of Success Criteria Document**

This document defines crystal-clear, measurable success criteria for GitVan test coverage improvement. Victory is declared when ALL criteria are met and ALL stakeholders sign off.

**No ambiguity. No exceptions. Clear victory conditions.**
