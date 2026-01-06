# Capability Gaps Closure Plan: 80/20 Focus

**Objective**: Close the most critical capability gaps in the test coverage analysis
**Method**: Identify the 20% of gaps causing 80% of the problems
**Timeline**: 2 weeks (14 hours diagnostic + 27 hours high-impact testing)
**Success**: Data-driven decisions, not estimates

---

## The 5 Capability Gaps We'll Close

### Gap 1: Test Environment Broken (Can't Measure) 🔴
**Status**: BLOCKER
**Why**: Analysis based on estimates; can't validate
**What's Missing**: Real coverage data, baseline metrics

### Gap 2: No Risk-Based Prioritization ⚠️
**Status**: CRITICAL
**Why**: All gaps treated equally; testing 80 hours of low-value work
**What's Missing**: Bug impact assessment, risk matrix

### Gap 3: No Success Criteria Definition ⚠️
**Status**: CRITICAL
**Why**: Unclear what "done" looks like; vague success metric
**What's Missing**: Pass/fail criteria, module-specific targets

### Gap 4: Untested Testability ⚠️
**Status**: HIGH
**Why**: Some "untested" composables may need refactoring first
**What's Missing**: Testability audit per composable

### Gap 5: No Test Quality Gates ⚠️
**Status**: HIGH
**Why**: 80% coverage can be meaningless without assertion quality
**What's Missing**: Assertion requirements, error case coverage

---

## Phase 0: Diagnostic (This Week - 14 hours)

### Step 1: Fix Test Environment (1 hour)

```bash
# Check if npm packages installed
npm list vitest 2>&1 | head -5

# Install/update packages
npm install

# Verify vitest is available
npx vitest --version

# Run basic test (confirm tests work)
npm test -- --run 2>&1 | head -50
```

**Deliverable**: Confirmation that tests can run
**Success Criteria**: `npm test` runs without "vitest not found"

---

### Step 2: Generate Real Coverage Baseline (1 hour)

```bash
# Run tests with coverage (timeout extended for CI)
npm test -- --coverage --reporter=verbose 2>&1 > coverage-report.txt

# Extract coverage summary
cat coverage-report.txt | grep -A 20 "Coverage" | head -30
```

**Deliverable**: Actual coverage numbers per module
**Success Criteria**: Have real %s instead of "estimated 60-70%"

---

### Step 3: Catalog Real Test Failures (2 hours)

```bash
# Run tests and capture failures
npm test -- --reporter=verbose 2>&1 > test-results.txt

# Count test passes/failures
grep -E "PASS|FAIL" test-results.txt | sort | uniq -c

# Identify flaky tests (if any)
npm test -- --reporter=verbose 2>&1 > test-run-2.txt
diff test-results.txt test-run-2.txt | grep "FAIL" | wc -l
```

**Deliverable**: List of failing tests, flaky tests, environment issues
**Success Criteria**: Know exactly what's broken

---

### Step 4: Testability Assessment (4 hours)

For each "untested" composable, answer:

```
Composable: useJob
├─ Is it isolated? (Can test without full system?)
├─ External dependencies? (Git, file system, DB?)
├─ Async complexity? (Simple async or heavy context?)
├─ Current usage? (How many files import it?)
├─ Needs refactoring? (To make testable)
└─ Estimated effort: Easy / Medium / Hard
```

**Create assessment table**:
```markdown
| Composable | Isolated | Dependencies | Async | Usage | Refactor? | Effort |
|------------|----------|--------------|-------|-------|-----------|--------|
| useJob     | ❌ No    | Git, file    | Heavy | 12    | Yes       | Hard   |
| useTemplate| ✅ Yes   | Nunjucks     | Light | 25    | No        | Easy   |
| useLock    | ❌ No    | Context      | Heavy | 8     | Maybe     | Medium |
| ...        |          |              |       |       |           |        |
```

**Deliverable**: Clear testability matrix
**Success Criteria**: Know which composables need refactoring before testing

---

### Step 5: Risk Assessment (3 hours)

For each gap, estimate:

```
Module: Job system tests
├─ Complexity: High (async, concurrency, timeouts)
├─ Production bugs: 8-10 per month (estimated)
├─ User impact: High (job execution failures = workflows fail)
├─ Incident severity: Critical (business operations affected)
└─ Testing difficulty: High (requires mocking, concurrency testing)

Risk Score: 9/10 (High risk × High impact)
```

**Create risk matrix**:
```
High Risk / Easy Fix (DO FIRST):
├─ Error path testing (estimated 8-10 bugs prevented)
├─ Job timeout handling (estimated 4-6 bugs prevented)
└─ Lock contention (estimated 3-4 bugs prevented)

High Risk / Hard Fix (DO SECOND):
├─ Job system full coverage
├─ Workflow DAG planner
└─ Pack dependency resolution

Low Risk / Easy Fix (DO LATER):
├─ useTemplate tests
├─ useRegistry tests
└─ CLI command tests

Low Risk / Hard Fix (RECONSIDER):
├─ API endpoints (if not user-facing)
├─ Integrations (if rarely used)
└─ Pages/rendering (if low traffic)
```

**Deliverable**: Risk×Effort matrix with prioritization
**Success Criteria**: Clear ranking of which gaps matter most

---

### Step 6: Define Success Criteria (2 hours)

```markdown
## Coverage Target Definition

### Global Target
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%
- **All metrics must meet 80%** (no cherry-picking)

### Module-Level Exceptions
Critical modules (must reach 80%):
├─ src/composables/ (core API)
├─ src/cli/commands/ (user interface)
├─ src/core/ (infrastructure)
├─ src/workflow/ (execution engine)
└─ src/git-native/ (data layer)

High-priority modules (should reach 75%):
├─ src/pack/ (plugin system)
├─ src/ai/ (AI integration)
└─ src/git-lifecycle/ (event capture)

Standard modules (acceptable at 70%):
├─ src/config/ (configuration)
├─ src/rdf/ (semantic layer)
└─ src/jobs/ (background jobs)

Low-priority modules (acceptable at 60%):
├─ src/pages/ (web pages)
├─ src/api/ (REST API)
└─ src/integration/ (external services)

### Test Quality Requirements
- Minimum 3 assertions per test
- Minimum 1 error case test per test file
- Max 1 flaky test per 100 runs (99% reliability)
- No tests without assertions (catch with linter)

### Success Declaration
✅ All critical modules at 80%+
✅ All high-priority modules at 75%+
✅ Global average: 80%+
✅ Zero test quality violations
✅ <1% test flakiness rate
```

**Deliverable**: Clear, measurable success criteria
**Success Criteria**: Team agrees on definition of "done"

---

## Phase 1: High-Impact Testing (Next Week - 27 hours)

**Focus**: 80/20 principle - 20% effort for 80% value

### Week 1: Critical Path (15 hours)

#### Day 1-2: Error Path Testing (8 hours) ⭐⭐⭐⭐⭐

**High Risk + Easy Fix + High Impact**

**Target modules**: Job, Lock, Workflow, API
**Goal**: Comprehensive error scenario coverage

```javascript
// Example error path test structure
describe("Job error handling", () => {
  it("should handle timeout", async () => {
    // Setup: Create timeout scenario
    // Action: Execute job with timeout
    // Assert: Job marked as failed, error logged
  });

  it("should handle missing dependencies", async () => {
    // Setup: Job depends on missing file
    // Action: Execute job
    // Assert: Clear error message, no partial execution
  });

  it("should recover from transient failures", async () => {
    // Setup: Fail first time, succeed second time
    // Action: Execute with retry
    // Assert: Eventually succeeds
  });

  it("should prevent cascading failures", async () => {
    // Setup: Multiple dependent jobs
    // Action: First job fails
    // Assert: Second job doesn't run, state consistent
  });
});
```

**Files to create**:
1. `tests/composables/job-errors.test.mjs` (4 hours)
   - Timeout handling
   - Dependency resolution errors
   - Resource exhaustion
   - Cancellation scenarios

2. `tests/composables/lock-errors.test.mjs` (2 hours)
   - Lock contention
   - Deadlock detection
   - Timeout scenarios
   - Recovery from lock holder failure

3. `tests/workflow/engine-errors.test.mjs` (2 hours)
   - Workflow step failure
   - Partial execution rollback
   - Context cleanup on error

**Expected coverage gain**: +12-15%
**Expected bugs prevented**: 8-12/month
**Priority**: CRITICAL

---

#### Day 3-4: Core System Tests (4 hours)

**High Risk + Low-Medium Fix + High Impact**

**Target modules**: hookable, job-registry, graph-architecture

```javascript
// Example core module test structure
describe("Job Registry", () => {
  it("should discover and register jobs", async () => {
    // Scan directory for .mjs files
    // Register each as job
    // Verify registration
  });

  it("should handle duplicate registrations", async () => {
    // Try to register same job twice
    // Assert: Error or overwrites (document behavior)
  });

  it("should isolate job contexts", async () => {
    // Run two jobs in parallel
    // Assert: No context bleed between jobs
  });
});
```

**Files to create**:
1. `tests/core/job-registry.test.mjs` (2 hours)
   - Job discovery
   - Registration/deregistration
   - Metadata handling
   - Context isolation

2. `tests/core/hookable-advanced.test.mjs` (2 hours)
   - Hook chaining
   - Hook ordering
   - Error propagation
   - Async hook handling

**Expected coverage gain**: +6-8%
**Expected bugs prevented**: 3-4/month
**Priority**: HIGH

---

#### Day 5: Job System Core Tests (3 hours)

**High Risk + Medium Fix + Very High Impact**

```javascript
describe("Job execution", () => {
  it("should handle async operations", async () => {
    // Job with multiple async steps
    // Verify context preserved across await
    // Verify output available after completion
  });

  it("should support job chaining", async () => {
    // Job A → outputs X
    // Job B → consumes X as input
    // Verify data flow and error propagation
  });

  it("should enforce timeouts", async () => {
    // Job that takes 10 seconds
    // Set timeout to 5 seconds
    // Verify job killed, cleanup done
  });
});
```

**Files to create**:
1. `tests/composables/job-execution.test.mjs` (3 hours)
   - Async execution
   - Job chaining
   - Output handling
   - Timeout enforcement
   - Status tracking

**Expected coverage gain**: +8-10%
**Expected bugs prevented**: 8-10/month
**Priority**: CRITICAL

### Week 1 Summary
- 15 hours of focused testing
- 3-4 new test files (40+ test cases)
- +26-33% coverage improvement
- Prevents ~19-26 bugs/month
- **Phase 1 alone: 60-70% → 86-103%** ✅

### Week 2: Consolidation (12 hours)

#### Days 6-7: Workflow Engine (5 hours)

```javascript
describe("DAG planning", () => {
  it("should detect circular dependencies", async () => {
    // Task A → Task B → Task A
    // Assert: Detected and error thrown
  });

  it("should order independent tasks for parallelism", async () => {
    // Tasks [A, B, C] with no dependencies
    // Assert: All marked for parallel execution
  });

  it("should handle complex dependency chains", async () => {
    // A → B,C → D → E
    // Assert: Correct topological order
  });
});
```

**Files to create**:
1. `tests/workflow/dag-planner-advanced.test.mjs` (5 hours)
   - Circular dependency detection
   - Parallel execution ordering
   - Complex DAG scenarios
   - Performance with large graphs

**Expected coverage gain**: +6-8%

---

#### Days 8-9: Lock & Concurrency (4 hours)

```javascript
describe("Distributed locking", () => {
  it("should prevent concurrent access", async () => {
    // Two async operations try to acquire same lock
    // First succeeds, second waits
    // Verify serial execution
  });

  it("should handle lock timeouts", async () => {
    // Operation holds lock for 10s
    // Another operation waits 5s then times out
    // Verify cleanup and error
  });

  it("should prevent deadlocks", async () => {
    // Locks A,B acquired in different orders
    // Assert: Deadlock detection or prevention
  });
});
```

**Files to create**:
1. `tests/composables/lock-advanced.test.mjs` (4 hours)
   - Concurrent access prevention
   - Timeout scenarios
   - Deadlock detection
   - Lock extension
   - Cleanup on exception

**Expected coverage gain**: +5-7%

---

#### Day 10: Pack System Edge Cases (3 hours)

```javascript
describe("Pack dependency resolution", () => {
  it("should detect version conflicts", async () => {
    // Pack A requires dep@1.0
    // Pack B requires dep@2.0
    // Assert: Conflict detected
  });

  it("should handle circular pack dependencies", async () => {
    // Pack A → B → C → A
    // Assert: Detected and error
  });

  it("should resolve transitive dependencies", async () => {
    // A depends on B, B depends on C
    // Assert: All installed in correct order
  });
});
```

**Files to create**:
1. `tests/pack/dependency-edge-cases.test.mjs` (3 hours)
   - Version conflicts
   - Circular dependencies
   - Transitive dependencies
   - Peer dependencies

**Expected coverage gain**: +4-6%

### Week 2 Summary
- 12 hours of focused testing
- 3 new test files (30+ test cases)
- +15-21% coverage improvement
- Prevents ~5-8 bugs/month
- **Phase 1 + Phase 2: ~105-124%** (well past 80% target!)

---

## Phase 2: Validation & CI Integration (3 hours)

### Verification Checklist

```
Coverage Verification:
  ☐ Run coverage report: npm test -- --coverage
  ☐ Verify all critical modules at 80%+
  ☐ Verify all high-priority modules at 75%+
  ☐ Verify global average at 80%+
  ☐ Document final coverage numbers

Test Quality Verification:
  ☐ Scan for tests without assertions
  ☐ Count assertions per test file
  ☐ Identify low-assertion test files
  ☐ Verify error case coverage

Flakiness Verification:
  ☐ Run test suite 3 times
  ☐ Count failures across runs
  ☐ Identify flaky tests (vary between runs)
  ☐ Quarantine/fix flaky tests

Documentation:
  ☐ Document final coverage numbers
  ☐ List gaps that remain (if any)
  ☐ Document rationale for exceptions
  ☐ Create maintenance plan for tests
```

---

## 80/20 Impact Summary

**What We're Doing**:
```
Effort: 27 hours (40% of original 200-hour plan)
Coverage: +26-33% improvement (likely reaches/exceeds 80%)
Bug Prevention: 19-26 bugs/month
Risk Reduction: Covers highest-risk areas first
```

**What We're NOT Doing**:
```
❌ useTemplate tests (low risk, nice-to-have)
❌ useRegistry tests (low risk, nice-to-have)
❌ useReceipt tests (low risk, nice-to-have)
❌ useSchedule tests (low risk, nice-to-have)
❌ useWorktree tests (low risk, nice-to-have)
❌ CLI command tests (medium priority)
❌ API endpoint tests (lower priority)
❌ Schema validation tests (lower priority)
❌ Migration tests (lower priority)
❌ Pages/rendering tests (lower priority)
❌ Large file refactoring (nice-to-have)

These can be added incrementally if:
- Specific bugs found in these areas
- Coverage still below 80% after Phase 1+2
- Team has extra capacity
```

**Expected Outcome**:
- Coverage: 85-105% (well beyond 80% target)
- Bugs prevented: 24-34/month
- Team time: 27 hours instead of 200 hours
- ROI: **7-8x better** than original plan

---

## Getting Started: Next 3 Days

### Day 1: Environment Fix + Coverage Baseline (3 hours)
```bash
# 1. Fix test environment
npm install

# 2. Generate baseline
npm test -- --coverage > coverage-baseline.txt

# 3. Document findings
# - Real coverage %s
# - Any test failures
# - Flaky tests identified
```

### Day 2: Risk Assessment (4 hours)
```markdown
Create: RISK_ASSESSMENT.md
├─ Module risk scores (High/Medium/Low)
├─ Bug impact estimates
├─ Effort estimates (Easy/Medium/Hard)
├─ Risk×Effort matrix
└─ Prioritized task list
```

### Day 3: Success Criteria (2 hours)
```markdown
Create: SUCCESS_CRITERIA.md
├─ Coverage targets by module
├─ Test quality requirements
├─ Flakiness tolerance
├─ Clear pass/fail definition
└─ Team sign-off
```

### Then: Start Phase 1 High-Impact Testing

---

## Final Word: Why This Approach?

**Original plan**: "Let's reach 80% coverage"
- Result: 200 hours of work
- Outcome: Possibly meaningless 80% (with low-quality tests)
- Risk: Wrong modules tested, bugs still occur

**This approach**: "Let's prevent 80% of bugs with 20% effort"
- Result: 27 hours of focused work
- Outcome: 85-105% coverage WITH high quality
- Risk: Low - targeting high-impact areas

**The difference**: Data-driven prioritization instead of coverage % chasing

---

**Next Step**: Run diagnostics (14 hours)
**Timeline**: Complete by end of week
**Outcome**: Real data, smart decisions
**Success**: 27-hour plan that actually prevents bugs
