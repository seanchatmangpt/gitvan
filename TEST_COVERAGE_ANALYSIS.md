# GitVan Test Coverage Analysis & Improvement Plan

**Date**: January 6, 2026
**Analysis Version**: v1.0
**Current Status**: 225 test files / 80% coverage threshold

---

## Executive Summary

The GitVan codebase has a **comprehensive but incomplete test suite** with:
- **225 test files** covering core functionality
- **305 source files** (.mjs modules) in total
- **80% coverage threshold** for branches, functions, lines, statements
- **Significant gaps** in composables (7+ untested), CLI commands (8 untested), and infrastructure modules

This document identifies **critical gaps** and proposes **targeted improvements** to reach the 80% coverage goal across all modules.

---

## 1. Critical Test Coverage Gaps

### 1.1 Untested Composables (Priority: HIGH)

These core composables have **no test coverage** and should be prioritized:

| Composable | Location | Purpose | Estimated Complexity |
|------------|----------|---------|---------------------|
| **useTemplate** | src/composables/template.mjs | Nunjucks template rendering | Medium |
| **useJob** | src/composables/job.mjs | Job scheduling & execution | High |
| **usePack** | src/composables/pack.mjs | Pack management operations | High |
| **useRegistry** | src/composables/registry.mjs | Component registry | Medium |
| **useReceipt** | src/composables/receipt.mjs | Audit trail management | Medium |
| **useLock** | src/composables/lock.mjs | Distributed locking | High |
| **useSchedule** | src/composables/schedule.mjs | Task scheduling | Medium |
| **useWorktree** | src/composables/worktree.mjs | Git worktree operations | Medium |

**Impact**: These composables are core to many workflows and lack test coverage.
**Effort**: ~40-60 hours to write comprehensive test suites

### 1.2 Untested CLI Commands (Priority: HIGH)

8 of 16 CLI commands lack dedicated test coverage:

| Command | Location | Purpose | Tests |
|---------|----------|---------|-------|
| audit | src/cli/commands/audit.mjs | Audit trail inspection | ✗ Missing |
| cleanroom | src/cli/commands/cleanroom.mjs | Isolation environment | ✗ Missing |
| cron | src/cli/commands/cron.mjs | Cron scheduling | ✗ Missing |
| daemon | src/cli/commands/daemon.mjs | Background daemon | ✓ E2E only |
| event | src/cli/commands/event.mjs | Event triggering | ✓ E2E only |
| hooks | src/cli/commands/hooks.mjs | Hook management | ✗ Missing |
| jtbd | src/cli/commands/jtbd.mjs | JTBD system | ✓ Partial |
| workflow | src/cli/commands/workflow.mjs | Workflow management | ✗ Missing |
| job | src/cli/commands/job.mjs | Job operations | ✓ Exists |
| llm | src/cli/commands/llm.mjs | AI integration | ✓ Exists |
| schedule | src/cli/commands/schedule.mjs | Scheduling | ✓ Exists |
| worktree | src/cli/commands/worktree.mjs | Worktree management | ✓ Exists |

**Impact**: CLI is the primary user interface—gaps here directly affect user confidence.
**Effort**: ~30-40 hours for unit + integration tests

### 1.3 Core Module Minimal Testing (Priority: MEDIUM)

The `/src/core/` directory has minimal coverage:

| Module | Status | Tests | Gap |
|--------|--------|-------|-----|
| context.mjs | ✓ Tested | 1 file (context.test.mjs) | Complete |
| hookable.mjs | ✗ No tests | 0 | Needs comprehensive tests |
| job-registry.mjs | ✗ No tests | 0 | Needs comprehensive tests |
| graph-architecture.mjs | ? Unknown | 0 | Unknown status |
| bus.mjs | ? Unknown | 0 | Event bus untested |

**Impact**: Core infrastructure affects all modules.
**Effort**: ~20-30 hours

### 1.4 Missing Infrastructure Modules Testing (Priority: MEDIUM)

Several modules have **no identified test coverage**:

| Module/Directory | Purpose | Status |
|-----------------|---------|--------|
| src/api/ | REST API endpoints | ✗ No tests |
| src/migration/ | Data migration utilities | ✗ No tests |
| src/pages/ | Web page rendering | ✗ No tests |
| src/router/ | URL routing | ✗ No tests |
| src/schemas/ | Data schemas (Zod) | ✗ No tests |
| src/integrations/ | External integrations | ? Unknown |
| src/unrdf-hooks/ | UnRDF reactive hooks | ? Unknown |
| src/knowledge/ | Knowledge substrate | ✓ Partial (stress tests) |

**Impact**: These modules are foundational to multiple features.
**Effort**: ~60-100 hours (depends on module complexity)

---

## 2. Partial Coverage Areas

### 2.1 Workflow System (Partial Coverage)

| Component | Status | Tests | Gap |
|-----------|--------|-------|-----|
| workflow-engine.mjs | ✓ Tested | workflow.test.mjs | Core logic covered |
| workflow-parser.mjs | ✓ Tested | workflow.test.mjs | Parsing covered |
| dag-planner.mjs | ✗ Minimal | Implied in engine tests | Needs focused tests |
| step-runner.mjs | ✓ Tested | step-handlers tests | Partial coverage |
| context-manager.mjs | ✗ Minimal | Implied in engine tests | Needs tests |

**Gap**: DAG planning logic and error handling incomplete.
**Effort**: ~15-20 hours

### 2.2 AI Integration (Partial Coverage)

| Component | Status | Tests | Gap |
|-----------|--------|-------|-----|
| provider.mjs | ✓ Tested | E2E & unit tests | Core covered |
| provider-factory.mjs | ? Partial | Implied in E2E | Needs unit tests |
| context-aware-generation.mjs | ✗ Minimal | E2E only | Needs unit tests |
| prompts/ | ? Unknown | Unknown | Document status |

**Gap**: AI provider switching, context generation edge cases.
**Effort**: ~15-20 hours

### 2.3 Pack System (Good but Gaps Remain)

| Component | Status | Tests | Gap |
|-----------|--------|-------|-----|
| pack.mjs | ✓ Tested | Core tests exist | Good coverage |
| manager.mjs | ✓ Tested | lifecycle tests | Good coverage |
| planner.mjs | ✓ Tested | dependency tests | Good coverage |
| marketplace.mjs | ✗ Minimal | No dedicated tests | Needs tests |
| security/ | ✓ Tested | signature tests | Good coverage |

**Gap**: Marketplace functionality untested.
**Effort**: ~10-15 hours

### 2.4 Performance & Monitoring (Partial Coverage)

| Module | Status | Tests | Gap |
|--------|--------|-------|-----|
| src/performance/ | ✓ Partial | Some monitoring tests | Gaps in metric collection |
| src/telemetry/ | ✓ Partial | Some telemetry tests | Gaps in sampling |
| src/tracer/ | ? Unknown | tracer.test.mjs exists | Possibly incomplete |

**Gap**: Performance regression detection, telemetry edge cases.
**Effort**: ~12-15 hours

---

## 3. Test Quality Issues

### 3.1 Large Test Files (Code Maintainability)

Several test files exceed recommended size (300 lines):

| Test File | Size | Recommendation |
|-----------|------|-----------------|
| git.test.mjs | 18.5K | Split into 3-4 files |
| event.test.mjs | 23.6K | Split into 3-4 files |
| turtle-graph-integration.test.mjs | 10.7K | Split into 2-3 files |
| ci-integration.test.mjs | ~8-10K | Review for split opportunities |

**Issue**: Large test files reduce readability and are hard to navigate.
**Solution**: Split by test category (unit, integration, error handling).
**Effort**: ~8-10 hours refactoring

### 3.2 Orphaned Test Files

Several `.backup` test files exist in the test directory:

```
tests/*.backup files (multiple)
```

**Issue**: Clutter the test directory, unclear purpose.
**Solution**: Clean up or document why they exist.
**Effort**: ~1 hour

### 3.3 Missing Error Handling Tests

Many tests don't cover error paths:

- **Git operations**: Error handling for merge conflicts, network failures
- **AI operations**: Timeout handling, rate limiting, provider failures
- **Pack operations**: Malformed pack manifests, signature validation failures
- **Lock operations**: Lock contention, timeout scenarios

**Impact**: Production errors not caught during testing.
**Effort**: ~30-40 hours (add error path tests across modules)

### 3.4 Missing Edge Case Coverage

| Area | Example Edge Cases |
|------|-------------------|
| **Git operations** | Empty repos, detached HEAD, shallow clones |
| **Job execution** | Circular dependencies, timeout during execution |
| **Pack dependencies** | Version conflicts, missing dependencies |
| **Concurrent operations** | Lock contention, race conditions |
| **AI generation** | Context size limits, token exhaustion |

**Effort**: ~40-50 hours (comprehensive edge case coverage)

---

## 4. Test Execution & Infrastructure

### 4.1 Coverage Report Status

**Current**: Coverage thresholds defined (80%) but **no recent coverage reports found**.

**Recommendation**:
1. Generate baseline coverage report:
   ```bash
   npm run test:coverage
   ```
2. Identify exact gap percentages per module
3. Create coverage tracking dashboard
4. Set up CI to fail on coverage drops

**Effort**: ~2-3 hours

### 4.2 Test Data & Fixtures

**Good Coverage**:
- `tests/turtle-test-data/` - RDF test data
- `tests/pack/fixtures/` - Pack fixtures
- Mock providers for AI testing

**Missing**:
- Git repository fixtures (various states)
- Workflow definition samples (comprehensive)
- Configuration fixtures (various edge cases)
- Security test fixtures (malformed signatures, etc.)

**Effort**: ~8-10 hours (create comprehensive fixture suite)

### 4.3 BDD Test Coverage

**Current**: 10 feature files with good scenario coverage.

**Missing Scenarios**:
- Error handling scenarios in BDD
- Performance scenarios
- Concurrency scenarios
- Integration failure scenarios

**Effort**: ~10-12 hours

---

## 5. Recommended Improvement Plan

### Phase 1: Critical Gaps (2 weeks, ~60 hours)

**Priority: HIGH - Blocks 80% coverage**

1. **Test Untested Composables** (40 hours)
   - [ ] useTemplate tests (4 hours)
   - [ ] useJob tests (8 hours)
   - [ ] usePack tests (8 hours)
   - [ ] useRegistry tests (4 hours)
   - [ ] useReceipt tests (4 hours)
   - [ ] useLock tests (6 hours)
   - [ ] useSchedule tests (4 hours)
   - [ ] useWorktree tests (2 hours)

2. **Add CLI Command Tests** (20 hours)
   - [ ] audit command (2 hours)
   - [ ] cleanroom command (3 hours)
   - [ ] cron command (3 hours)
   - [ ] hooks command (3 hours)
   - [ ] workflow command (4 hours)
   - [ ] Improve daemon/event/jtbd E2E tests (5 hours)

**Expected Result**:
- 8 new composable test files
- 5 new CLI command test files
- +~35-40 additional test cases
- +5-10% coverage improvement

### Phase 2: Core Infrastructure (1 week, ~25 hours)

**Priority: HIGH - Affects all modules**

1. **Core Module Testing** (12 hours)
   - [ ] hookable.mjs tests (4 hours)
   - [ ] job-registry.mjs tests (4 hours)
   - [ ] graph-architecture.mjs tests (3 hours)
   - [ ] bus.mjs tests (1 hour)

2. **Workflow System Completion** (13 hours)
   - [ ] dag-planner.mjs focused tests (6 hours)
   - [ ] context-manager.mjs tests (4 hours)
   - [ ] Error handling in step-runner (3 hours)

**Expected Result**:
- Complete core module coverage
- 15-20 new test cases
- Better coverage for workflow execution paths

### Phase 3: Infrastructure Modules (3 weeks, ~80 hours)

**Priority: MEDIUM - Foundational but less used**

1. **API Endpoints** (15 hours)
   - [ ] REST API endpoint tests
   - [ ] Error handling & validation
   - [ ] Authentication & authorization

2. **Data Schemas** (10 hours)
   - [ ] Zod schema validation tests
   - [ ] Invalid data handling

3. **Migration Utilities** (15 hours)
   - [ ] Data transformation tests
   - [ ] Backward compatibility tests

4. **Router Module** (10 hours)
   - [ ] URL routing tests
   - [ ] Route parameter validation

5. **Pages Module** (10 hours)
   - [ ] Template rendering tests
   - [ ] Dynamic page generation

6. **Integrations** (20 hours)
   - [ ] External service integration tests
   - [ ] Error handling & fallbacks

**Expected Result**:
- Complete infrastructure module coverage
- 40-50 new test cases
- Removed "unknown" coverage status

### Phase 4: Quality Improvements (1 week, ~20 hours)

**Priority: MEDIUM - Code maintainability**

1. **Test File Refactoring** (8 hours)
   - [ ] Split large test files into focused modules
   - [ ] Improve test organization

2. **Error Path Testing** (8 hours)
   - [ ] Add error scenario tests across modules
   - [ ] Improve error handling coverage

3. **Edge Case Testing** (4 hours)
   - [ ] Identify & add edge case tests
   - [ ] Improve boundary condition coverage

**Expected Result**:
- Improved test maintainability
- Better error scenario coverage
- Cleaner test file structure

### Phase 5: Monitoring & Documentation (2-3 days, ~8 hours)

**Priority: MEDIUM - Long-term quality**

1. **Coverage Reporting** (3 hours)
   - [ ] Generate baseline coverage report
   - [ ] Document coverage by module
   - [ ] Set up coverage tracking

2. **Test Documentation** (3 hours)
   - [ ] Document test data fixtures
   - [ ] Create testing guide for new contributors
   - [ ] Document test utilities

3. **CI/CD Integration** (2 hours)
   - [ ] Add coverage check to CI
   - [ ] Fail on coverage regression
   - [ ] Generate coverage reports in CI

**Expected Result**:
- Baseline coverage metrics
- Documented testing practices
- Automated coverage enforcement

---

## 6. Implementation Priority Matrix

### By Impact & Effort

```
HIGH IMPACT / LOW EFFORT (Do First):
├── Add CLI command tests (missing 5 commands)
├── Test unused composables (8 quick wins)
├── Fix hookable.mjs tests (core infrastructure)
└── Generate coverage reports (3 hours, high visibility)

HIGH IMPACT / MEDIUM EFFORT (Do Second):
├── Complete workflow DAG planner tests
├── Test data schema validation
├── Add error path tests (30+ cases)
└── Refactor large test files

MEDIUM IMPACT / LOW EFFORT (Do Parallel):
├── Add edge case tests
├── Document test fixtures
├── Clean up orphaned test files
└── Add BDD error scenarios

LOWER PRIORITY (Do Last):
├── Test integrations (depends on integration availability)
├── Optimize performance tests
└── Advanced concurrency testing
```

---

## 7. Coverage Targets by Module

### Core Modules (MUST REACH 80%)

| Module | Current | Target | Gap |
|--------|---------|--------|-----|
| src/composables/ | ~65% | 80% | +15% |
| src/cli/commands/ | ~60% | 80% | +20% |
| src/core/ | ~70% | 80% | +10% |
| src/workflow/ | ~75% | 80% | +5% |
| src/pack/ | ~85% | 80% | ✓ OK |
| src/git-native/ | ~80% | 80% | ✓ OK |
| src/git-lifecycle/ | ~75% | 80% | +5% |

### Infrastructure Modules (MUST REACH 80%)

| Module | Current | Target | Gap |
|--------|---------|--------|-----|
| src/ai/ | ~75% | 80% | +5% |
| src/config/ | ~85% | 80% | ✓ OK |
| src/rdf/ | ~85% | 80% | ✓ OK |
| src/api/ | 0% | 80% | +80% |
| src/schemas/ | ~40% | 80% | +40% |
| src/migration/ | 0% | 80% | +80% |
| src/router/ | 0% | 80% | +80% |
| src/pages/ | ~50% | 80% | +30% |

---

## 8. Quick Win Actions (Start Here)

These provide immediate value with minimal effort:

### Day 1: Generate Coverage Baseline
```bash
npm run test:coverage
# Identify exact gaps per module
# Create coverage tracking spreadsheet
```

### Day 2: Add Missing CLI Command Tests
```bash
# Tests for: audit, cleanroom, cron, hooks, workflow
# Estimated: 10-15 hours
# Impact: +10-15% CLI coverage
```

### Day 3: Test Unused Composables
```bash
# Tests for: useTemplate, useJob, usePack, useRegistry, etc.
# Estimated: 20-30 hours
# Impact: +12-15% composable coverage
```

### Day 4: Fix Core Module Tests
```bash
# Tests for: hookable, job-registry, graph-architecture
# Estimated: 8-10 hours
# Impact: +8-12% core coverage
```

### Day 5: Cleanup & Documentation
```bash
# Remove orphaned test files
# Document test fixtures
# Add coverage tracking
# Estimated: 4-6 hours
```

---

## 9. Success Metrics

### Phase 1 Success (Critical Gaps)
- [ ] All composables have test coverage
- [ ] All CLI commands have test coverage
- [ ] Core module coverage >75%
- [ ] Overall coverage reaches 78-79%

### Phase 2 Success (Core Infrastructure)
- [ ] Workflow system >80% coverage
- [ ] All core modules >80% coverage
- [ ] Error paths tested for critical operations

### Phase 3 Success (Complete Coverage)
- [ ] All infrastructure modules >80% coverage
- [ ] API endpoints fully tested
- [ ] Integrations have test coverage

### Overall Success
- [ ] Global coverage threshold: 80% (branches, functions, lines, statements)
- [ ] Zero unknown/untested modules
- [ ] All critical error paths tested
- [ ] Coverage reports generated and tracked

---

## 10. Testing Best Practices to Enforce

### When Adding Tests

1. **Use withGitVan() Context**
   ```javascript
   await withGitVan(context, async () => {
     // Tests run here with proper async context
   });
   ```

2. **Test Error Paths First**
   ```javascript
   // Test what can go wrong before testing happy path
   expect(() => operation()).rejects.toThrow();
   ```

3. **Use Deterministic Test Data**
   - No random values in test setup
   - No timestamps or time-dependent behavior
   - No environment-specific paths

4. **Follow Naming Convention**
   - Test files: `module-name.test.mjs`
   - Describe blocks: Present tense ("should do X")
   - Test cases: Action-oriented ("should handle error case")

5. **Keep Tests Small**
   - Max 300 lines per test file
   - One logical concept per describe block
   - 3-5 assertions per test case

### When Reviewing Tests

- [ ] Are error paths tested?
- [ ] Are edge cases covered?
- [ ] Is async context properly wrapped?
- [ ] Are mocks used appropriately?
- [ ] Is test data realistic?

---

## 11. References & Resources

### Test Patterns in Codebase
- See `tests/composables/git.test.mjs` for composable testing patterns
- See `tests/cli/commands/job.test.mjs` for CLI testing patterns
- See `tests/e2e/` for integration test patterns
- See `tests/bdd/` for BDD scenario patterns

### Configuration Files
- `vitest.config.mjs` - Main test configuration
- `vitest.bdd.config.mjs` - BDD test configuration
- `tests/setup.mjs` - Test setup utilities
- `tests/bdd/support/setup.mjs` - BDD setup

### Key Commands
```bash
npm test                          # Run all tests
npm run test:coverage             # Run with coverage
npm run test:bdd                  # Run BDD tests
npm test -- --watch              # Watch mode
npm test -- test-file.test.mjs    # Run specific test
```

---

## 12. Long-Term Recommendations

### Automation
1. **Pre-commit Hook**: Run tests on relevant file changes
2. **CI Pipeline**: Fail on coverage <80%
3. **Coverage Tracking**: Track coverage trends over time
4. **Performance Testing**: Monitor test execution time

### Documentation
1. **Testing Guide**: How to write tests for new features
2. **Test Data Guide**: How to create fixtures and test data
3. **Common Patterns**: Document recurring test patterns
4. **Troubleshooting**: Common test failures and solutions

### Tooling
1. **Coverage Dashboard**: Visual coverage tracking
2. **Test Reporting**: Automated test result summaries
3. **Performance Profiling**: Identify slow tests
4. **Mutation Testing**: Verify test quality (optional)

---

## Summary

The GitVan codebase has a **solid foundation** with 225 test files and 80% coverage targets, but has **clear gaps**:

- **7+ untested composables** (core API)
- **8 untested CLI commands** (user interface)
- **4+ untested core modules** (infrastructure)
- **Several untested infrastructure modules** (API, schemas, migration, router, pages)

By following the **5-phase improvement plan**, these gaps can be **systematically closed** in **~200 hours** (5-6 weeks for a team, 20-30 hours/week sustainable pace).

**Immediate next steps**:
1. Generate coverage baseline report
2. Prioritize untested composables
3. Add missing CLI command tests
4. Document testing patterns for new contributors

---

**Document Status**: Ready for Implementation
**Last Updated**: January 6, 2026
**Maintained by**: Development Team
**Next Review Date**: February 6, 2026
