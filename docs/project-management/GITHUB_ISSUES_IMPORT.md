# GitHub Issues Import Guide

This document contains copy-paste ready issue templates for importing into GitHub.

## How to Import

### Option 1: Manual Import
1. Go to GitHub repository → Issues → New Issue
2. Copy template below
3. Paste into issue description
4. Add labels, assignees, milestone, epic
5. Create issue

### Option 2: GitHub CLI (Bulk Import)
```bash
# Install GitHub CLI if not already installed
# brew install gh (macOS)
# apt-get install gh (Linux)

# Authenticate
gh auth login

# Create issues using templates below
gh issue create --title "[Phase 0] Fix Test Environment Setup" \
  --body "$(cat issue-001.md)" \
  --label "testing,infrastructure,p0-critical" \
  --milestone "Phase 0: Diagnostic"

# Repeat for all issues...
```

### Option 3: GitHub Projects Import (CSV)
See `github-issues-import.csv` at end of this document.

---

## Phase 0: Diagnostic Phase (Week 1)

### Issue #1: Fix Test Environment Setup

```markdown
**Labels**: `testing`, `infrastructure`, `p0-critical`
**Milestone**: Phase 0: Diagnostic
**Epic**: Diagnostic Phase
**Estimated Effort**: 3 hours

## Description
The test environment must be properly configured before baseline coverage can be measured. This includes ensuring all test dependencies are installed, test databases are seeded, and environment variables are correctly set.

## Tasks
- [ ] Verify all test dependencies in `package.json` are installed
- [ ] Check `tests/setup.mjs` and `tests/global-setup.mjs` for missing configurations
- [ ] Ensure test database/fixtures are properly initialized
- [ ] Validate environment variables for test mode
- [ ] Verify vitest.config.mjs settings (coverage thresholds, reporters, etc.)
- [ ] Run `npm test` to confirm basic test execution works

## Acceptance Criteria
- [ ] All tests can be discovered by vitest
- [ ] `npm test` runs without configuration errors
- [ ] Coverage reporter generates output (even if coverage is low)
- [ ] No "module not found" or "cannot resolve" errors
- [ ] Test setup/teardown hooks execute successfully

## Dependencies
- None (blocking all other diagnostic tasks)

## Success Metrics
- Test suite runs to completion
- Coverage report is generated
- 0 environment-related test failures
```

---

### Issue #2: Generate Coverage Baseline Report

```markdown
**Labels**: `testing`, `metrics`, `p0-critical`
**Milestone**: Phase 0: Diagnostic
**Epic**: Diagnostic Phase
**Estimated Effort**: 2 hours
**Depends On**: #1

## Description
Generate a comprehensive coverage baseline report to understand current test coverage across all modules. This will identify which areas of the codebase have the lowest coverage and need the most attention.

## Tasks
- [ ] Run `npm test -- --coverage` to generate full coverage report
- [ ] Analyze coverage by module/directory
- [ ] Identify modules with <50% coverage (critical gaps)
- [ ] Identify modules with 50-79% coverage (need improvement)
- [ ] Identify modules with ≥80% coverage (good baseline)
- [ ] Create coverage heatmap (visualize gaps)
- [ ] Document untested code paths in critical modules
- [ ] Export coverage data to JSON for trend tracking

## Acceptance Criteria
- [ ] Coverage report generated for all modules
- [ ] Baseline metrics documented (overall, by module, critical paths)
- [ ] Coverage baseline report committed to repo (`docs/project-management/coverage-baseline-YYYY-MM-DD.md`)

## Dependencies
- Blocked by: #1 (Fix Test Environment Setup)

## Success Metrics
- Coverage report generated successfully
- Baseline metrics captured for future comparison
- Coverage gaps identified and prioritized
```

---

### Issue #3: Assess Bug Risk by Module

```markdown
**Labels**: `testing`, `risk-assessment`, `p1-high`
**Milestone**: Phase 0: Diagnostic
**Epic**: Diagnostic Phase
**Estimated Effort**: 3 hours
**Depends On**: #2

## Description
Perform a risk assessment to identify which untested modules pose the highest bug risk in production. This will help prioritize testing efforts on high-impact areas.

## Tasks
- [ ] Review production error logs to identify frequently failing modules
- [ ] Analyze module criticality (composables, workflow, git, jobs, locks)
- [ ] Map untested modules to business impact (P0: data loss, P1: crashes, P2: degraded UX, P3: minor bugs)
- [ ] Create risk matrix (coverage % vs. business impact)
- [ ] Prioritize testing backlog based on risk

## Acceptance Criteria
- [ ] Risk assessment completed for all modules with <80% coverage
- [ ] Risk matrix created (Priority vs. Coverage)
- [ ] Top 10 highest-risk untested modules identified
- [ ] Testing priorities aligned with business risk
- [ ] Risk assessment report committed to repo

## Dependencies
- Blocked by: #2 (Generate Coverage Baseline Report)

## Success Metrics
- Risk matrix created
- Testing priorities aligned with production stability goals
- Stakeholder sign-off on prioritization
```

---

### Issue #4: Audit Composable Testability

```markdown
**Labels**: `testing`, `architecture`, `p1-high`
**Milestone**: Phase 0: Diagnostic
**Epic**: Diagnostic Phase
**Estimated Effort**: 3 hours
**Depends On**: #2

## Description
Audit all composables (`use*` functions) to assess testability. GitVan's composable architecture requires proper `withGitVan()` context wrapping, and many composables may be difficult to test due to tight coupling or missing test utilities.

## Tasks
- [ ] Review all composables in `src/composables/`
- [ ] Identify composables with unctx dependencies
- [ ] Identify composables with external dependencies (Git, filesystem, network)
- [ ] Document testability blockers
- [ ] Create test utility helpers (e.g., `createTestContext()`, `mockGitOperations()`)
- [ ] Recommend refactoring if needed

## Acceptance Criteria
- [ ] All composables audited for testability
- [ ] Testability blockers documented
- [ ] Test utility helpers created
- [ ] Refactoring recommendations (if needed)
- [ ] Composable testability report committed to repo

## Dependencies
- Blocked by: #2 (Generate Coverage Baseline Report)

## Success Metrics
- Composable testability assessment complete
- Test utilities created to simplify testing
- Clear path forward for testing all composables
```

---

### Issue #5: Define Success Criteria & Metrics

```markdown
**Labels**: `testing`, `planning`, `p1-high`
**Milestone**: Phase 0: Diagnostic
**Epic**: Diagnostic Phase
**Estimated Effort**: 1 hour
**Depends On**: #2, #3

## Description
Define clear, measurable success criteria for the test coverage improvement initiative. This ensures alignment between stakeholders and provides objective measures of progress.

## Tasks
- [ ] Define target coverage metrics (80% overall, 70% per-module, 90% critical)
- [ ] Define quality metrics (flakiness <2%, execution time <5 min, 100% reviewed)
- [ ] Define business metrics (30% bug reduction, MTTD <1 hour)
- [ ] Define exit criteria (all issues completed, 80% coverage, 0 flakiness)

## Acceptance Criteria
- [ ] Success criteria documented and approved by stakeholders
- [ ] Metrics tracking plan in place (daily/weekly reporting)
- [ ] Exit criteria clearly defined
- [ ] Success criteria committed to repo

## Dependencies
- Blocked by: #2 (Generate Coverage Baseline Report), #3 (Assess Bug Risk by Module)

## Success Metrics
- Clear, measurable success criteria defined
- Stakeholder alignment on goals
- Metrics dashboard ready for tracking
```

---

### Issue #6: Identify Test Failures & Flakiness

```markdown
**Labels**: `testing`, `quality`, `p1-high`
**Milestone**: Phase 0: Diagnostic
**Epic**: Diagnostic Phase
**Estimated Effort**: 2 hours
**Depends On**: #1

## Description
Identify and categorize all failing or flaky tests in the current test suite. Flaky tests undermine confidence and must be fixed before coverage expansion.

## Tasks
- [ ] Run full test suite 10 times to identify flaky tests
- [ ] Document all test failures (consistent, intermittent, environment-dependent)
- [ ] Categorize failures (config issues, race conditions, external deps, state leakage, assertion errors)
- [ ] Create tickets for each failing/flaky test
- [ ] Prioritize fixes (blocking vs. non-blocking)

## Acceptance Criteria
- [ ] Full test suite run 10 times
- [ ] All failures documented with test name, failure type, rate, error, root cause hypothesis
- [ ] Tickets created for each failure
- [ ] Test failure report committed to repo

## Dependencies
- Blocked by: #1 (Fix Test Environment Setup)

## Success Metrics
- All test failures cataloged
- Flaky tests identified (goal: 0 flaky tests)
- Clear plan to fix failures before coverage expansion
```

---

### Issue #7: Create Detailed Implementation Plan

```markdown
**Labels**: `testing`, `planning`, `p1-high`
**Milestone**: Phase 0: Diagnostic
**Epic**: Diagnostic Phase
**Estimated Effort**: 2 hours
**Depends On**: #2, #3, #4, #5, #6

## Description
Synthesize findings from Issues #1-6 into a detailed implementation plan for Phase 1. This plan will guide the team through the testing effort with clear priorities, assignments, and timelines.

## Tasks
- [ ] Review all diagnostic phase findings
- [ ] Prioritize test development based on risk assessment and coverage gaps
- [ ] Break down Phase 1 into specific, actionable tasks
- [ ] Assign effort estimates to each task
- [ ] Identify dependencies and critical path
- [ ] Create Gantt chart / timeline
- [ ] Get stakeholder approval

## Acceptance Criteria
- [ ] Implementation plan document created
- [ ] All Phase 1 tasks defined with description, criteria, effort, dependencies, owner
- [ ] Critical path identified
- [ ] Stakeholder approval obtained
- [ ] Implementation plan committed to repo

## Dependencies
- Blocked by: #2, #3, #4, #5, #6

## Success Metrics
- Detailed implementation plan approved
- Team aligned on priorities and timeline
- Clear path forward to Phase 1
```

---

## Phase 1: Implementation (Weeks 2-3)

### Epic 1: High-Impact Error Path Testing

#### Issue #8: Job System Error Path Tests

```markdown
**Labels**: `testing`, `jobs`, `error-handling`, `p0-critical`
**Milestone**: Phase 1: Implementation
**Epic**: High-Impact Error Path Testing
**Estimated Effort**: 2 hours

## Description
The job system is critical for background task execution. Error paths must be tested to ensure jobs don't fail silently or corrupt data.

## Tasks
- [ ] Test job execution failures (uncaught exception, timeout, crash)
- [ ] Test job state management errors (invalid transitions, conflicts, persistence failures)
- [ ] Test job recovery (retry logic, cleanup, rollback)
- [ ] Test error propagation (logging, alerts, system stability)

## Acceptance Criteria
- [ ] Error path coverage for job system ≥90%
- [ ] All error scenarios documented in tests
- [ ] Tests verify graceful failures, logging, retry, system stability
- [ ] Tests added to `tests/composables/job.test.mjs`

## Success Metrics
- Job system error coverage ≥90%
- 0 flaky job tests
- All error paths covered
```

---

#### Issue #9: Lock System Error Path Tests

```markdown
**Labels**: `testing`, `concurrency`, `error-handling`, `p0-critical`
**Milestone**: Phase 1: Implementation
**Epic**: High-Impact Error Path Testing
**Estimated Effort**: 2 hours

## Description
The distributed lock system prevents race conditions. Lock failures can cause data corruption or deadlocks.

## Tasks
- [ ] Test lock acquisition failures (already held, timeout, corruption)
- [ ] Test lock release failures (wrong process, missing file, timeout)
- [ ] Test deadlock scenarios (circular deps, holder crashes, starvation)
- [ ] Test lock recovery (stale cleanup, force release, health checks)

## Acceptance Criteria
- [ ] Error path coverage for lock system ≥90%
- [ ] All error scenarios documented in tests
- [ ] Tests verify race prevention, deadlock detection, stale cleanup, no corruption
- [ ] Tests added to `tests/composables/lock.test.mjs`

## Success Metrics
- Lock system error coverage ≥90%
- 0 race condition bugs in production
- All deadlock scenarios tested
```

---

#### Issue #10: Workflow Engine Error Path Tests

```markdown
**Labels**: `testing`, `workflow`, `error-handling`, `p0-critical`
**Milestone**: Phase 1: Implementation
**Epic**: High-Impact Error Path Testing
**Estimated Effort**: 2 hours

## Description
The workflow engine orchestrates complex DAG execution. Workflow errors must be handled gracefully to prevent partial state corruption.

## Tasks
- [ ] Test workflow parsing errors (invalid Turtle, missing steps, circular deps)
- [ ] Test workflow execution errors (step failures, dependency failures, timeouts)
- [ ] Test workflow state errors (corruption, conflicts, rollback failures)
- [ ] Test error recovery (retry logic, partial rollback, state recovery)

## Acceptance Criteria
- [ ] Error path coverage for workflow engine ≥90%
- [ ] All error scenarios documented in tests
- [ ] Tests verify graceful failures, logging, retry/rollback, error isolation
- [ ] Tests added to `tests/workflow/workflow-engine.test.mjs`

## Success Metrics
- Workflow engine error coverage ≥90%
- 0 partial state corruption bugs
- All error paths covered
```

---

#### Issue #11: API Error Handling Tests

```markdown
**Labels**: `testing`, `api`, `error-handling`, `p1-high`
**Milestone**: Phase 1: Implementation
**Epic**: High-Impact Error Path Testing
**Estimated Effort**: 2 hours

## Description
API endpoints must handle errors gracefully and return appropriate HTTP status codes.

## Tasks
- [ ] Test API validation errors (missing params, invalid types, out-of-range)
- [ ] Test API authorization errors (missing token, expired token, insufficient perms)
- [ ] Test API server errors (DB connection, external timeouts, exceptions)
- [ ] Test error response format (status codes, error messages, schema compliance)

## Acceptance Criteria
- [ ] Error path coverage for API endpoints ≥90%
- [ ] All error scenarios documented in tests
- [ ] Tests verify correct status codes, actionable messages, no sensitive leaks, logging
- [ ] Tests added to `tests/api/` (if applicable)

## Success Metrics
- API error coverage ≥90%
- 0 API error handling bugs in production
- All error paths return correct status codes
```

---

### Epic 2: Core System Tests

#### Issue #12: Hookable System Tests

```markdown
**Labels**: `testing`, `core`, `hooks`, `p1-high`
**Milestone**: Phase 1: Implementation
**Epic**: Core System Tests
**Estimated Effort**: 1.5 hours

## Description
The hookable system provides extensibility. Proper testing ensures hooks execute in correct order and don't interfere with each other.

## Tasks
- [ ] Test hook registration (various orders, multiple hooks, unregister)
- [ ] Test hook execution (order, arguments, error isolation)
- [ ] Test hook composition (calling hooks, modifying args, preventing default)
- [ ] Test async hooks (sequential execution, error handling, context preservation)

## Acceptance Criteria
- [ ] Hookable system coverage ≥80%
- [ ] All hook patterns tested
- [ ] Tests verify reliable execution, error isolation, deterministic order
- [ ] Tests added to `tests/core/hookable.test.mjs`

## Success Metrics
- Hookable system coverage ≥80%
- 0 hook-related bugs in production
- All hook patterns documented
```

---

#### Issue #13: Job Registry Tests

```markdown
**Labels**: `testing`, `core`, `jobs`, `p1-high`
**Milestone**: Phase 1: Implementation
**Epic**: Core System Tests
**Estimated Effort**: 1 hour

## Description
The job registry manages job discovery and registration. Tests must ensure jobs are correctly registered and can be executed.

## Tasks
- [ ] Test job registration (dynamic, multi-directory, duplicate names)
- [ ] Test job discovery (directory scan, metadata loading, malformed files)
- [ ] Test job lookup (by name, by type, missing jobs)
- [ ] Test job metadata (validation, dependency resolution, versioning)

## Acceptance Criteria
- [ ] Job registry coverage ≥80%
- [ ] All job registration patterns tested
- [ ] Tests verify correct discovery/registration, metadata validation, duplicate handling
- [ ] Tests added to `tests/core/job-registry.test.mjs`

## Success Metrics
- Job registry coverage ≥80%
- 0 job registration bugs
- All job discovery paths tested
```

---

#### Issue #14: Graph Architecture Tests

```markdown
**Labels**: `testing`, `core`, `rdf`, `p1-high`
**Milestone**: Phase 1: Implementation
**Epic**: Core System Tests
**Estimated Effort**: 1.5 hours

## Description
The graph architecture manages RDF graphs and semantic queries. Tests must ensure graphs are correctly loaded and queried.

## Tasks
- [ ] Test graph loading (ontologies from files, multiple graphs, invalid Turtle)
- [ ] Test SPARQL queries (simple queries, federated queries, query errors)
- [ ] Test graph updates (insert, delete, update triples)
- [ ] Test graph persistence (save to disk, load from disk, corruption handling)

## Acceptance Criteria
- [ ] Graph architecture coverage ≥80%
- [ ] All graph operations tested
- [ ] Tests verify correct loading, query results, persisted updates
- [ ] Tests added to `tests/core/graph-architecture.test.mjs`

## Success Metrics
- Graph architecture coverage ≥80%
- 0 graph-related bugs
- All SPARQL query patterns tested
```

---

### Epic 3: Job/Workflow/Lock Advanced Tests

#### Issue #15: Job Execution Advanced Tests

```markdown
**Labels**: `testing`, `jobs`, `integration`, `p1-high`
**Milestone**: Phase 1: Implementation
**Epic**: Job/Workflow/Lock Advanced Tests
**Estimated Effort**: 4 hours

## Description
Advanced job execution tests including concurrency, retry logic, job chaining, and performance.

## Tasks
- [ ] Test concurrent job execution (parallel, resource contention, priority)
- [ ] Test job retry logic (exponential backoff, max retries, strategies)
- [ ] Test job chaining (triggering jobs, dependency graphs, error handling)
- [ ] Test job performance (execution time, memory, throughput)
- [ ] Test job state persistence (save to Git, recovery, audit trail)

## Acceptance Criteria
- [ ] Job execution coverage ≥85%
- [ ] All advanced job patterns tested
- [ ] Tests verify concurrency reliability, retry logic, chain order, state persistence
- [ ] Tests added to `tests/composables/job-advanced.test.mjs`

## Success Metrics
- Job execution coverage ≥85%
- 0 concurrency bugs
- Job retry logic validated
```

---

#### Issue #16: Workflow DAG Advanced Tests

```markdown
**Labels**: `testing`, `workflow`, `integration`, `p1-high`
**Milestone**: Phase 1: Implementation
**Epic**: Job/Workflow/Lock Advanced Tests
**Estimated Effort**: 4 hours

## Description
Advanced workflow DAG tests including complex dependency graphs, parallel execution, and workflow versioning.

## Tasks
- [ ] Test complex DAGs (multi-level deps, diamond deps, conditional steps)
- [ ] Test parallel execution (parallel steps, synchronization, resource contention)
- [ ] Test workflow versioning (schema changes, backward compatibility, migration)
- [ ] Test workflow optimization (DAG optimization, step caching, performance)
- [ ] Test workflow audit (execution history, step logs, state snapshots)

## Acceptance Criteria
- [ ] Workflow DAG coverage ≥85%
- [ ] All advanced DAG patterns tested
- [ ] Tests verify complex DAG execution, parallel correctness, versioning, audit trail
- [ ] Tests added to `tests/workflow/dag-advanced.test.mjs`

## Success Metrics
- Workflow DAG coverage ≥85%
- 0 DAG execution bugs
- Workflow optimization validated
```

---

#### Issue #17: Lock System Advanced Tests

```markdown
**Labels**: `testing`, `concurrency`, `integration`, `p1-high`
**Milestone**: Phase 1: Implementation
**Epic**: Job/Workflow/Lock Advanced Tests
**Estimated Effort**: 3 hours

## Description
Advanced lock system tests including distributed locking, lock fairness, and lock performance.

## Tasks
- [ ] Test distributed locking (multi-process, Git sync, conflict resolution)
- [ ] Test lock fairness (FIFO, priority, starvation prevention)
- [ ] Test lock performance (acquisition time, throughput, overhead)
- [ ] Test lock monitoring (health checks, metrics, alerts)

## Acceptance Criteria
- [ ] Lock system coverage ≥85%
- [ ] All advanced lock patterns tested
- [ ] Tests verify distributed locking, fairness, performance, monitoring
- [ ] Tests added to `tests/composables/lock-advanced.test.mjs`

## Success Metrics
- Lock system coverage ≥85%
- 0 distributed locking bugs
- Lock performance benchmarks established
```

---

#### Issue #18: Pack Dependency Tests

```markdown
**Labels**: `testing`, `packs`, `integration`, `p2-medium`
**Milestone**: Phase 1: Implementation
**Epic**: Job/Workflow/Lock Advanced Tests
**Estimated Effort**: 4 hours

## Description
Test pack system dependency resolution, version compatibility, and pack lifecycle.

## Tasks
- [ ] Test pack installation (with deps, multi-source, failures)
- [ ] Test dependency resolution (transitive, circular, version conflicts)
- [ ] Test pack versioning (semver, compatibility, upgrade/downgrade)
- [ ] Test pack lifecycle (activation, deactivation, uninstall, cleanup)
- [ ] Test pack security (signature verification, permissions, sandboxing)

## Acceptance Criteria
- [ ] Pack system coverage ≥80%
- [ ] All pack patterns tested
- [ ] Tests verify installation, dependency resolution, versioning, security
- [ ] Tests added to `tests/pack/pack-dependency.test.mjs`

## Success Metrics
- Pack system coverage ≥80%
- 0 pack dependency bugs
- Pack security validated
```

---

## Phase 2: Validation (Week 4)

### Issue #19: Coverage Verification

```markdown
**Labels**: `testing`, `validation`, `p0-critical`
**Milestone**: Phase 2: Validation
**Epic**: Validation Phase
**Estimated Effort**: 1 hour
**Depends On**: All Phase 1 issues

## Description
Verify that coverage targets have been met across all modules and identify any remaining gaps.

## Tasks
- [ ] Run full test suite with coverage: `npm test -- --coverage`
- [ ] Compare coverage against baseline (from Issue #2)
- [ ] Verify coverage meets targets (80% overall, 70% per-module, 90% critical)
- [ ] Identify remaining gaps (if any)
- [ ] Create follow-up tickets for gaps
- [ ] Generate coverage trend graph

## Acceptance Criteria
- [ ] Coverage report generated
- [ ] Coverage meets or exceeds 80% overall
- [ ] All critical modules have ≥90% coverage
- [ ] No modules with <70% coverage
- [ ] Coverage improvement documented (baseline vs. final)
- [ ] Coverage verification report committed to repo

## Dependencies
- Blocked by: All Phase 1 issues (#8-#18)

## Success Metrics
- Coverage ≥80% overall
- 100% of modules meet minimum coverage targets
- Coverage trend shows consistent improvement
```

---

### Issue #20: Test Quality Verification

```markdown
**Labels**: `testing`, `validation`, `quality`, `p0-critical`
**Milestone**: Phase 2: Validation
**Epic**: Validation Phase
**Estimated Effort**: 1 hour
**Depends On**: All Phase 1 issues

## Description
Verify that tests are high quality: meaningful assertions, good naming, proper isolation, and no false positives.

## Tasks
- [ ] Review sample of tests for quality (descriptive names, meaningful assertions, isolation, determinism, setup/teardown)
- [ ] Check for code smells (no assertions, always pass, excessive mocking, hardcoded values)
- [ ] Verify error messages are helpful
- [ ] Check test execution time
- [ ] Code review all new tests

## Acceptance Criteria
- [ ] Sample review completed (20% of new tests)
- [ ] No critical quality issues found
- [ ] All new tests have been code reviewed
- [ ] Test quality guidelines documented
- [ ] Test quality report committed to repo

## Dependencies
- Blocked by: All Phase 1 issues (#8-#18)

## Success Metrics
- 100% of new tests code reviewed
- 0 critical test quality issues
- Test execution time <5 minutes
```

---

### Issue #21: Flakiness Verification

```markdown
**Labels**: `testing`, `validation`, `flakiness`, `p0-critical`
**Milestone**: Phase 2: Validation
**Epic**: Validation Phase
**Estimated Effort**: 0.5 hours (setup) + automated runs
**Depends On**: All Phase 1 issues

## Description
Verify that no tests are flaky by running the full test suite multiple times and checking for inconsistent results.

## Tasks
- [ ] Run full test suite 20 times (automated)
- [ ] Identify any tests that fail intermittently
- [ ] Calculate flakiness rate: (failed runs / total runs)
- [ ] For any flaky tests: create ticket, disable temporarily, investigate root cause
- [ ] Verify flakiness rate <2%

## Acceptance Criteria
- [ ] Test suite run 20 times successfully
- [ ] Flakiness rate calculated
- [ ] Flakiness rate <2% (target: 0%)
- [ ] All flaky tests identified and ticketed
- [ ] Flakiness report committed to repo

## Dependencies
- Blocked by: All Phase 1 issues (#8-#18)

## Success Metrics
- Flakiness rate <2%
- 0 flaky tests (ideal)
- All flaky tests have fix plans
```

---

### Issue #22: Documentation Updates

```markdown
**Labels**: `documentation`, `validation`, `p1-high`
**Milestone**: Phase 2: Validation
**Epic**: Validation Phase
**Estimated Effort**: 0.5 hours
**Depends On**: #19, #20, #21

## Description
Update all project documentation to reflect new test coverage, testing guidelines, and lessons learned.

## Tasks
- [ ] Update `README.md` with coverage badge
- [ ] Update `CLAUDE.md` with testing best practices
- [ ] Update `CONTRIBUTING.md` with test requirements
- [ ] Create/update `docs/testing/TESTING_GUIDE.md`
- [ ] Document common test patterns
- [ ] Document test utilities and helpers
- [ ] Add lessons learned / retrospective notes

## Acceptance Criteria
- [ ] All documentation updated
- [ ] Coverage badge added to README
- [ ] Testing guide is comprehensive
- [ ] Documentation reviewed and approved
- [ ] Documentation committed to repo

## Dependencies
- Blocked by: #19, #20, #21

## Success Metrics
- Documentation up to date
- Testing guidelines clear and actionable
- Future contributors can easily write tests
```

---

## GitHub Projects CSV Import

Save this as `github-issues-import.csv` and import to GitHub Projects:

```csv
Title,Labels,Milestone,Epic,Assignee,Estimate,Dependencies,Priority
"[Phase 0] Fix Test Environment Setup","testing,infrastructure,p0-critical","Phase 0: Diagnostic","Diagnostic Phase",,3,,P0
"[Phase 0] Generate Coverage Baseline Report","testing,metrics,p0-critical","Phase 0: Diagnostic","Diagnostic Phase",,2,#1,P0
"[Phase 0] Assess Bug Risk by Module","testing,risk-assessment,p1-high","Phase 0: Diagnostic","Diagnostic Phase",,3,#2,P1
"[Phase 0] Audit Composable Testability","testing,architecture,p1-high","Phase 0: Diagnostic","Diagnostic Phase",,3,#2,P1
"[Phase 0] Define Success Criteria & Metrics","testing,planning,p1-high","Phase 0: Diagnostic","Diagnostic Phase",,1,"#2,#3",P1
"[Phase 0] Identify Test Failures & Flakiness","testing,quality,p1-high","Phase 0: Diagnostic","Diagnostic Phase",,2,#1,P1
"[Phase 0] Create Detailed Implementation Plan","testing,planning,p1-high","Phase 0: Diagnostic","Diagnostic Phase",,2,"#2,#3,#4,#5,#6",P1
"[Phase 1] Job System Error Path Tests","testing,jobs,error-handling,p0-critical","Phase 1: Implementation","High-Impact Error Path Testing",,2,,P0
"[Phase 1] Lock System Error Path Tests","testing,concurrency,error-handling,p0-critical","Phase 1: Implementation","High-Impact Error Path Testing",,2,,P0
"[Phase 1] Workflow Engine Error Path Tests","testing,workflow,error-handling,p0-critical","Phase 1: Implementation","High-Impact Error Path Testing",,2,,P0
"[Phase 1] API Error Handling Tests","testing,api,error-handling,p1-high","Phase 1: Implementation","High-Impact Error Path Testing",,2,,P1
"[Phase 1] Hookable System Tests","testing,core,hooks,p1-high","Phase 1: Implementation","Core System Tests",,1.5,,P1
"[Phase 1] Job Registry Tests","testing,core,jobs,p1-high","Phase 1: Implementation","Core System Tests",,1,,P1
"[Phase 1] Graph Architecture Tests","testing,core,rdf,p1-high","Phase 1: Implementation","Core System Tests",,1.5,,P1
"[Phase 1] Job Execution Advanced Tests","testing,jobs,integration,p1-high","Phase 1: Implementation","Job/Workflow/Lock Advanced Tests",,4,#8,P1
"[Phase 1] Workflow DAG Advanced Tests","testing,workflow,integration,p1-high","Phase 1: Implementation","Job/Workflow/Lock Advanced Tests",,4,#10,P1
"[Phase 1] Lock System Advanced Tests","testing,concurrency,integration,p1-high","Phase 1: Implementation","Job/Workflow/Lock Advanced Tests",,3,#9,P1
"[Phase 1] Pack Dependency Tests","testing,packs,integration,p2-medium","Phase 1: Implementation","Job/Workflow/Lock Advanced Tests",,4,,P2
"[Phase 2] Coverage Verification","testing,validation,p0-critical","Phase 2: Validation","Validation Phase",,1,"#8,#9,#10,#11,#12,#13,#14,#15,#16,#17,#18",P0
"[Phase 2] Test Quality Verification","testing,validation,quality,p0-critical","Phase 2: Validation","Validation Phase",,1,"#8,#9,#10,#11,#12,#13,#14,#15,#16,#17,#18",P0
"[Phase 2] Flakiness Verification","testing,validation,flakiness,p0-critical","Phase 2: Validation","Validation Phase",,0.5,"#8,#9,#10,#11,#12,#13,#14,#15,#16,#17,#18",P0
"[Phase 2] Documentation Updates","documentation,validation,p1-high","Phase 2: Validation","Validation Phase",,0.5,"#19,#20,#21",P1
```

---

## Bulk Import Script

```bash
#!/bin/bash
# bulk-import-issues.sh
# Usage: ./bulk-import-issues.sh ruvnet/gitvan

REPO="$1"

if [ -z "$REPO" ]; then
  echo "Usage: $0 <owner/repo>"
  exit 1
fi

# Authenticate with GitHub CLI
gh auth status || gh auth login

# Import Phase 0 issues
gh issue create --repo "$REPO" \
  --title "[Phase 0] Fix Test Environment Setup" \
  --body-file issue-templates/issue-001.md \
  --label "testing,infrastructure,p0-critical" \
  --milestone "Phase 0: Diagnostic"

gh issue create --repo "$REPO" \
  --title "[Phase 0] Generate Coverage Baseline Report" \
  --body-file issue-templates/issue-002.md \
  --label "testing,metrics,p0-critical" \
  --milestone "Phase 0: Diagnostic"

# ... repeat for all 22 issues ...

echo "All issues imported successfully!"
```

---

## Next Steps

1. **Review** this import guide
2. **Choose** import method (manual, CLI, or CSV)
3. **Create** GitHub milestones:
   - Phase 0: Diagnostic (Week 1)
   - Phase 1: Implementation (Weeks 2-3)
   - Phase 2: Validation (Week 4)
4. **Create** GitHub labels:
   - `testing`, `infrastructure`, `metrics`, `risk-assessment`, `architecture`, `planning`, `quality`, `jobs`, `error-handling`, `concurrency`, `workflow`, `api`, `core`, `hooks`, `rdf`, `integration`, `packs`, `validation`, `flakiness`, `documentation`
   - Priority labels: `p0-critical`, `p1-high`, `p2-medium`, `p3-low`
5. **Import** issues using chosen method
6. **Set up** GitHub Projects board with columns: Backlog, Ready, In Progress, Review, Done
7. **Configure** automation for issue status transitions
8. **Assign** issues to team members
9. **Start** diagnostic phase!

---

**End of GitHub Issues Import Guide**
