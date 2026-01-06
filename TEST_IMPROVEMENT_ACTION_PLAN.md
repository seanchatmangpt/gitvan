# GitVan Test Coverage Improvement Action Plan

**Created**: January 6, 2026
**Status**: Ready for Implementation
**Estimated Duration**: 8 weeks (100 days) with 20 hrs/week sustainable pace

---

## Overview

This document provides a **week-by-week implementation plan** to improve test coverage from current state to the **80% target** across all modules.

---

## Phase 1: Quick Wins (Week 1-2) ⚡

### Week 1: Diagnostic & Setup

**Duration**: 5 working days (40 hours)

#### Day 1: Baseline & Planning (8 hours)
- [ ] Generate coverage report with `npm test -- --coverage`
- [ ] Document exact coverage percentages per module
- [ ] Create coverage tracking spreadsheet
- [ ] Identify top 5 modules with lowest coverage

**Deliverable**: `COVERAGE_BASELINE.md` with metrics

#### Day 2: Cleanup & Preparation (8 hours)
- [ ] Remove orphaned `.backup` test files
- [ ] Organize test directory structure
- [ ] Document test utility functions in `tests/helpers/`
- [ ] Create test template for new test files

**Deliverable**: Clean test directory, reusable test template

#### Day 3: Add Missing Composable Tests (8 hours)
**Start with easiest composables**:

1. **useTemplate** (2 hours)
   - [ ] Create `tests/composables/template.test.mjs`
   - [ ] Test basic rendering functionality
   - [ ] Test filter addition
   - [ ] Test error handling

2. **useRegistry** (2 hours)
   - [ ] Create `tests/composables/registry.test.mjs`
   - [ ] Test component registration
   - [ ] Test component retrieval
   - [ ] Test listing components

3. **useReceipt** (2 hours)
   - [ ] Create `tests/composables/receipt.test.mjs`
   - [ ] Test receipt creation
   - [ ] Test receipt reading
   - [ ] Test verification

4. **useSchedule** (2 hours)
   - [ ] Create `tests/composables/schedule.test.mjs`
   - [ ] Test basic scheduling
   - [ ] Test schedule cancellation
   - [ ] Test schedule execution

**Deliverable**: 4 new test files with 40+ test cases

#### Day 4: Continue Composable Tests (8 hours)

**Focus on medium-complexity composables**:

1. **useWorktree** (3 hours)
   - [ ] Create `tests/composables/worktree.test.mjs`
   - [ ] Test worktree creation
   - [ ] Test worktree deletion
   - [ ] Test worktree listing
   - [ ] Test error handling (invalid paths, existing worktrees)

2. **useJob** (5 hours) - Complex, multiple tests needed
   - [ ] Create `tests/composables/job.test.mjs`
   - [ ] Test job scanning
   - [ ] Test job execution
   - [ ] Test job scheduling
   - [ ] Test error handling
   - [ ] Test timeout scenarios

**Deliverable**: 2 more test files with 30+ test cases

#### Day 5: CLI Command Tests (8 hours)

**Start with simpler CLI commands**:

1. **audit command** (2 hours)
   - [ ] Create `tests/cli/commands/audit.test.mjs`
   - [ ] Test audit history retrieval
   - [ ] Test filtering options
   - [ ] Test output formats

2. **hooks command** (2 hours)
   - [ ] Create `tests/cli/commands/hooks.test.mjs`
   - [ ] Test hook listing
   - [ ] Test hook creation
   - [ ] Test hook deletion

3. **cleanroom command** (2 hours)
   - [ ] Create `tests/cli/commands/cleanroom.test.mjs`
   - [ ] Test environment isolation
   - [ ] Test cleanup
   - [ ] Test verification

4. **cron command** (2 hours)
   - [ ] Create `tests/cli/commands/cron.test.mjs`
   - [ ] Test cron job creation
   - [ ] Test cron listing
   - [ ] Test cron deletion

**Deliverable**: 4 CLI command test files with 40+ test cases

### Week 1 Summary
- 10 new test files created
- 150+ new test cases
- Expected coverage improvement: +8-12%

---

### Week 2: Core Infrastructure & Continuation

**Duration**: 5 working days (40 hours)

#### Day 6: Core Module Tests (8 hours)

1. **hookable.mjs** (3 hours)
   - [ ] Create `tests/core/hookable.test.mjs`
   - [ ] Test hook registration
   - [ ] Test hook execution
   - [ ] Test hook chaining
   - [ ] Test error handling

2. **job-registry.mjs** (3 hours)
   - [ ] Create `tests/core/job-registry.test.mjs`
   - [ ] Test job registration
   - [ ] Test job discovery
   - [ ] Test job execution
   - [ ] Test job metadata

3. **graph-architecture.mjs** (2 hours)
   - [ ] Create `tests/core/graph-architecture.test.mjs`
   - [ ] Test graph initialization
   - [ ] Test graph operations
   - [ ] Test ontology loading

**Deliverable**: 3 test files with 40+ test cases

#### Day 7: Complex Composables (8 hours)

1. **useLock** (4 hours) - High complexity
   - [ ] Create `tests/composables/lock.test.mjs`
   - [ ] Test lock acquisition
   - [ ] Test lock release
   - [ ] Test lock extension
   - [ ] Test lock contention/timeout
   - [ ] Test deadlock prevention

2. **usePack** (4 hours) - High complexity
   - [ ] Create `tests/composables/pack.test.mjs`
   - [ ] Test pack installation
   - [ ] Test pack removal
   - [ ] Test pack listing
   - [ ] Test dependency resolution
   - [ ] Test error handling (malformed packs)

**Deliverable**: 2 test files with 40+ test cases

#### Day 8: CLI Command Tests - Complex (8 hours)

1. **workflow command** (4 hours)
   - [ ] Create `tests/cli/commands/workflow.test.mjs`
   - [ ] Test workflow listing
   - [ ] Test workflow execution
   - [ ] Test workflow validation
   - [ ] Test error handling

2. **cron command improvements** (2 hours)
   - [ ] Add advanced cron scenarios
   - [ ] Test cron patterns
   - [ ] Test timezone handling

3. **Improve existing E2E tests** (2 hours)
   - [ ] Enhance daemon/event/jtbd E2E coverage
   - [ ] Add missing scenarios

**Deliverable**: 1 CLI test file + enhanced E2E tests

#### Day 9: Workflow System (8 hours)

1. **dag-planner.mjs tests** (4 hours)
   - [ ] Create `tests/workflow/dag-planner.test.mjs`
   - [ ] Test dependency resolution
   - [ ] Test cycle detection
   - [ ] Test parallel execution ordering
   - [ ] Test edge cases (empty workflows, single step)

2. **context-manager.mjs tests** (4 hours)
   - [ ] Create `tests/workflow/context-manager.test.mjs`
   - [ ] Test context creation
   - [ ] Test context isolation
   - [ ] Test context cleanup
   - [ ] Test variable passing

**Deliverable**: 2 test files with 40+ test cases

#### Day 10: Error Path Testing (8 hours)

Focus on **critical error paths** across modules:

1. **Git operations error handling** (3 hours)
   - [ ] Test merge conflict scenarios
   - [ ] Test network failures
   - [ ] Test authentication errors
   - [ ] Test permission denied scenarios

2. **Job execution error handling** (2 hours)
   - [ ] Test timeout scenarios
   - [ ] Test circular dependency detection
   - [ ] Test resource exhaustion

3. **Pack system error handling** (2 hours)
   - [ ] Test malformed pack manifests
   - [ ] Test signature validation failures
   - [ ] Test dependency resolution failures

4. **AI provider error handling** (1 hour)
   - [ ] Test provider unavailable
   - [ ] Test rate limiting
   - [ ] Test timeout scenarios

**Deliverable**: 30+ error path test cases

### Week 2 Summary
- 8 new test files created
- 140+ new test cases
- 30+ error path tests
- Expected coverage improvement: +10-15%

### Phase 1 Total (After 2 Weeks)
- **18 new test files**
- **290+ new test cases**
- **Expected coverage improvement: +18-27%**
- **Estimated overall coverage: 65-75%** (approaching 80% target)

---

## Phase 2: Infrastructure Modules (Week 3-4)

### Week 3: API & Schemas

**Duration**: 5 working days (40 hours)

#### Day 11: API Endpoint Tests (8 hours)
- [ ] Create `tests/api/endpoints.test.mjs`
- [ ] Test all REST endpoints
- [ ] Test request validation
- [ ] Test response formats
- [ ] Test authentication/authorization
- [ ] Test error responses

**Deliverable**: 1 test file with 50+ test cases

#### Day 12: Schema Validation (8 hours)
- [ ] Create `tests/schemas/validation.test.mjs`
- [ ] Test each Zod schema
- [ ] Test valid/invalid inputs
- [ ] Test error messages
- [ ] Test type coercion

**Deliverable**: 1 test file with 60+ test cases

#### Day 13: Router Tests (8 hours)
- [ ] Create `tests/router/routing.test.mjs`
- [ ] Test route matching
- [ ] Test parameter extraction
- [ ] Test wildcards and patterns
- [ ] Test route ordering
- [ ] Test error handling

**Deliverable**: 1 test file with 40+ test cases

#### Day 14: Pages Module (8 hours)
- [ ] Create `tests/pages/rendering.test.mjs`
- [ ] Test template rendering
- [ ] Test dynamic content
- [ ] Test layout inheritance
- [ ] Test component composition
- [ ] Test error handling

**Deliverable**: 1 test file with 40+ test cases

#### Day 15: Migration Tests (8 hours)
- [ ] Create `tests/migration/transforms.test.mjs`
- [ ] Test data transformations
- [ ] Test version compatibility
- [ ] Test rollback scenarios
- [ ] Test error handling
- [ ] Test performance with large datasets

**Deliverable**: 1 test file with 45+ test cases

### Week 3 Summary
- 5 new test files
- 235+ new test cases
- Infrastructure modules now at ~70-75% coverage

---

### Week 4: Integrations & Advanced Testing

**Duration**: 5 working days (40 hours)

#### Day 16: Integration Tests (8 hours)
- [ ] Create `tests/integrations/external.test.mjs`
- [ ] Test external service integration
- [ ] Test API authentication
- [ ] Test error/fallback scenarios
- [ ] Test timeout handling
- [ ] Test data transformation

**Deliverable**: 1 test file with 50+ test cases

#### Day 17: Edge Case Testing (8 hours)

**Comprehensive edge case coverage across all modules**:

1. **Git operations** (2 hours)
   - Empty repositories
   - Detached HEAD states
   - Shallow clones
   - Large files
   - Special characters in paths/filenames

2. **Concurrent operations** (2 hours)
   - Race conditions
   - Lock contention
   - Parallel job execution
   - State synchronization

3. **Boundary conditions** (2 hours)
   - Empty strings/arrays
   - Null/undefined handling
   - Very large inputs
   - Very small timeouts

4. **Data validation** (2 hours)
   - Invalid UTF-8 sequences
   - Extremely long strings
   - Special characters
   - Type mismatches

**Deliverable**: 50+ edge case test cases

#### Day 18: Performance & Stress Tests (8 hours)

- [ ] Create `tests/performance/stress.test.mjs`
- [ ] Test with large datasets
- [ ] Test with many concurrent operations
- [ ] Test memory usage
- [ ] Test execution time
- [ ] Identify performance bottlenecks

**Deliverable**: 1 test file with 20+ stress test cases

#### Day 19: Refactor Large Test Files (8 hours)

**Split large test files into focused modules**:

1. **git.test.mjs** (3 hours)
   - Split into:
     - `git-basic.test.mjs` (status, commits)
     - `git-branches.test.mjs` (branch operations)
     - `git-advanced.test.mjs` (merge, rebase, worktree)

2. **event.test.mjs** (3 hours)
   - Split into:
     - `event-basic.test.mjs` (emit, on, once)
     - `event-advanced.test.mjs` (chaining, async)

3. **Other large files** (2 hours)
   - Identify and plan splits for other 8-10K+ files

**Deliverable**: Reorganized test suite with 6-8 new focused files

#### Day 20: BDD & Integration Tests (8 hours)

- [ ] Add error scenario feature files
- [ ] Add performance scenario features
- [ ] Add concurrency scenario features
- [ ] Enhance existing feature coverage
- [ ] Document step definitions

**Deliverable**: 5+ new feature files with 30+ scenarios

### Week 4 Summary
- 7 new test files created
- 155+ new test cases
- 6-8 test files refactored and reorganized
- 30+ BDD scenarios added

### Phase 2 Total (After 4 Weeks)
- **12 new test files for infrastructure**
- **390+ new test cases**
- **Infrastructure modules at 80%+ coverage**
- **Expected overall coverage: 75-80%**

---

## Phase 3: Finalization & Monitoring (Week 5)

### Week 5: Coverage Verification & Documentation

**Duration**: 5 working days (40 hours)

#### Day 21: Coverage Analysis (8 hours)
- [ ] Generate final coverage report
- [ ] Document coverage by module
- [ ] Identify remaining gaps (<1%)
- [ ] Document coverage trends
- [ ] Create coverage tracking dashboard

**Deliverable**: `COVERAGE_FINAL_REPORT.md` with metrics

#### Day 22: Testing Documentation (8 hours)
- [ ] Create testing guide for new contributors
- [ ] Document test patterns and best practices
- [ ] Document test data fixtures
- [ ] Create troubleshooting guide
- [ ] Document testing utilities and helpers

**Deliverable**: `TESTING_GUIDE.md` and companion docs

#### Day 23: CI/CD Integration (8 hours)
- [ ] Set up coverage reporting in CI
- [ ] Configure coverage threshold checks
- [ ] Set up automatic coverage reports
- [ ] Create coverage regression detection
- [ ] Document CI/CD testing process

**Deliverable**: CI pipeline configuration files

#### Day 24: Final Cleanup & Review (8 hours)
- [ ] Review all new test files
- [ ] Ensure consistent style and patterns
- [ ] Verify all tests pass
- [ ] Verify coverage meets 80% threshold
- [ ] Create summary of improvements

**Deliverable**: Verification checklist and summary

#### Day 25: Team Knowledge Transfer (8 hours)
- [ ] Present testing improvements to team
- [ ] Conduct testing best practices workshop
- [ ] Create video walkthroughs of test patterns
- [ ] Set up testing office hours
- [ ] Document common testing questions

**Deliverable**: Team training materials and documentation

### Week 5 Summary
- Testing framework fully documented
- CI/CD integration complete
- 80% coverage threshold achieved and verified
- Team trained on testing best practices

---

## Implementation Timeline Summary

```
Week 1 (40 hrs): Diagnostics + Quick Wins
  └─ 10 new test files, 150+ test cases
  └─ Cleanup and preparation

Week 2 (40 hrs): Core Infrastructure
  └─ 8 new test files, 140+ test cases
  └─ Error path testing

Week 3 (40 hrs): Infrastructure Modules P1
  └─ 5 new test files, 235+ test cases

Week 4 (40 hrs): Infrastructure Modules P2
  └─ 7 new test files, 155+ test cases
  └─ Large file refactoring
  └─ BDD enhancements

Week 5 (40 hrs): Finalization
  └─ Coverage verification
  └─ Documentation
  └─ CI/CD integration
  └─ Team training

Total: 200 hours (5 weeks @ 40 hrs/week)
       Sustainable pace: 20 hrs/week over 10 weeks
```

---

## Success Criteria

### Phase 1 (End of Week 2)
- [ ] 18 new test files created
- [ ] 290+ new test cases passing
- [ ] Coverage improved to 65-75%
- [ ] All quick-win composables tested

### Phase 2 (End of Week 4)
- [ ] 12 new test files for infrastructure
- [ ] 390+ new test cases total
- [ ] Coverage at 75-80%
- [ ] All modules have test coverage
- [ ] Large test files refactored

### Phase 3 (End of Week 5)
- [ ] Coverage at 80%+ (all modules)
- [ ] All test patterns documented
- [ ] CI/CD integration complete
- [ ] Team trained on testing practices
- [ ] Coverage reports generated automatically

---

## Weekly Checkpoints

### Checkpoint 1 (End of Week 1)
```
Expected Results:
- 10 new test files ✓
- 150+ new test cases ✓
- Coverage: +8-12%
- Baseline report created ✓
- Cleanup complete ✓

Decision Point:
- Proceed with Week 2 plan
- Adjust priorities based on actual coverage
- Update estimated timelines
```

### Checkpoint 2 (End of Week 2)
```
Expected Results:
- 18 total new test files ✓
- 290+ new test cases ✓
- Coverage: 65-75%
- Core modules tested ✓

Decision Point:
- Assess remaining gaps
- Adjust infrastructure module priorities
- Plan any refactoring needs
```

### Checkpoint 3 (End of Week 4)
```
Expected Results:
- 30+ new test files ✓
- 680+ new test cases ✓
- Coverage: 75-80%
- All modules have coverage ✓

Decision Point:
- Final push for 80% threshold
- Identify any remaining gaps <1%
- Plan finalization week
```

### Checkpoint 4 (End of Week 5)
```
Expected Results:
- 80%+ coverage (all modules) ✓
- All documentation complete ✓
- CI/CD integration working ✓
- Team trained ✓

Success Criteria Met ✓
```

---

## Resource Allocation

### Recommended Team Structure

**Option 1: Single Contributor (20 hrs/week)**
- Duration: 10 weeks
- One person working part-time
- Good for learning the codebase

**Option 2: Two Contributors (40 hrs/week)**
- Duration: 5 weeks
- Two people working in parallel
- Recommended for faster completion

**Option 3: Three Contributors (60 hrs/week)**
- Duration: 3-4 weeks
- Specialized by domain (composables, CLI, infrastructure)
- Fastest completion

---

## Risk Mitigation

### Common Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Test flakiness** | Medium | High | Use deterministic test data, proper async handling |
| **Coverage plateaus** | Low | Medium | Regular measurement, weekly checkpoints |
| **Test maintenance burden** | Medium | Medium | Document patterns, use templates, code review |
| **Time estimate errors** | Medium | Low | Weekly checkpoints, adjust future estimates |
| **Context/async issues** | Low | High | Strict code review, enforce withGitVan() pattern |

### Monitoring During Implementation

- [ ] Generate coverage report weekly
- [ ] Track metrics over time
- [ ] Monitor test execution time
- [ ] Monitor CI/CD impact
- [ ] Gather team feedback
- [ ] Adjust plan as needed

---

## Next Steps (Start Here!)

1. **Today**: Generate coverage baseline
   ```bash
   npm test -- --coverage
   ```

2. **This Week**: Complete Week 1 (Days 1-5)
   - Diagnostic reports
   - Quick-win composable tests
   - CLI command tests

3. **Schedule**: Book team meeting to review this plan
   - Discuss resource allocation
   - Confirm timeline feasibility
   - Assign ownership

4. **Track**: Set up weekly checkpoint reviews
   - Coverage metrics
   - Test metrics
   - Team feedback

---

## Questions & Support

**For implementation questions**: Refer to TEST_COVERAGE_ANALYSIS.md
**For test patterns**: Review existing test files in `/tests/`
**For documentation**: See CLAUDE.md section on Testing Strategy

---

**Document Status**: Ready for Implementation
**Estimated Start Date**: January 6, 2026
**Target Completion Date**: February 13, 2026 (5-week intensive) or March 20, 2026 (10-week sustainable)
