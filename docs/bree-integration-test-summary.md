# Bree Integration Test Summary

**GitVan v4.0.0 - TPS Jidoka Analysis**
**Date:** 2026-01-08

---

## Executive Summary

Analyzed integration testing for Bree scheduler refactoring. Found **6 critical gaps**, **4 high-priority gaps**, and **3 medium-priority gaps** across 9 major integration points.

**Current State:**
- ✅ Basic Bree functionality tested (BreeScheduler, JobBridge)
- ✅ Job discovery and scheduling tested
- ⚠️ Git integration partially tested
- ❌ Context management (unctx) NOT verified in worker threads
- ❌ Workflow integration NOT tested
- ❌ Cross-directory isolation NOT tested
- ❌ Hook system integration NOT tested

**Risk Level:** HIGH - Context loss in worker threads could break composables

---

## Critical Gaps (Must Fix Before Release)

### 1. Context Management (unctx)
**Impact:** Composables (lock, receipt, git) will FAIL in worker threads

**Problem:**
```javascript
// JobBridge creates worker threads
// Workers may lose unctx context
// Composables called in worker: useLock(), useReceipt(), useGit()
// Result: "Context not available" errors
```

**Test Needed:**
- Verify context passes to worker
- Verify composables work in worker
- Verify async operations preserve context

**Priority:** CRITICAL
**Estimated Effort:** 4 hours

### 2. Git Lock Lifecycle
**Impact:** Jobs may run concurrently when they shouldn't, data corruption

**Problem:**
- Lock ref `refs/gitvan/locks/job-{jobId}` creation not verified
- Lock deletion after success not verified
- Lock deletion after failure not verified
- Stale locks not cleaned

**Test Needed:**
- End-to-end lock creation/deletion
- Lock cleanup on failure
- Stale lock detection

**Priority:** CRITICAL
**Estimated Effort:** 3 hours

### 3. Receipt Writing
**Impact:** Audit trail incomplete, compliance issues

**Problem:**
- Receipt write to `refs/notes/gitvan/audit` not verified end-to-end
- Fingerprint determinism not tested
- Receipt fields not validated
- Concurrent writes not tested

**Test Needed:**
- Receipt written for all executions
- All fields present and correct
- Fingerprint is deterministic
- No data loss under concurrency

**Priority:** CRITICAL
**Estimated Effort:** 3 hours

### 4. Workflow Integration
**Impact:** DAG workflows may fail to execute jobs

**Problem:**
- Jobs in workflow steps not tested with Bree
- DAG dependencies not verified with Bree jobs
- Context passing from workflow to job not tested

**Test Needed:**
- Workflow executes jobs via Bree
- Dependencies respected
- Context flows correctly

**Priority:** CRITICAL
**Estimated Effort:** 4 hours

### 5. Cross-Directory Isolation
**Impact:** Jobs from different repos may interfere

**Problem:**
- Scheduler singleton keyed by cwd, but not tested
- Lock/receipt isolation not verified
- Data leakage between repos not tested

**Test Needed:**
- Separate scheduler per cwd
- No data mixing
- Concurrent execution in different repos

**Priority:** CRITICAL
**Estimated Effort:** 3 hours

### 6. Error Recovery
**Impact:** System left in inconsistent state on failures

**Problem:**
- Lock cleanup on job crash not tested
- Receipt write on error not verified
- Worker cleanup not tested

**Test Needed:**
- Locks released on all error paths
- Error receipts written
- No resource leaks

**Priority:** CRITICAL
**Estimated Effort:** 2 hours

**Total Critical Work:** ~19 hours (2-3 days)

---

## High-Priority Gaps

### 7. Hook System Integration
- Hooks may not trigger Bree jobs
- Bree may conflict with hook jobs
- **Effort:** 3 hours

### 8. CLI Integration
- Scheduler commands not fully tested
- Exit codes not verified
- **Effort:** 2 hours

### 9. Pack System Integration
- Jobs in packs not tested with Bree
- Pack installation with Bree jobs not verified
- **Effort:** 2 hours

**Total High-Priority Work:** ~7 hours (1 day)

---

## Medium-Priority Gaps

### 10. Performance Testing
- No load tests (100+ jobs)
- No memory leak tests
- **Effort:** 4 hours

### 11. Edge Cases
- Malformed cron expressions
- Missing job files
- Invalid worker data
- **Effort:** 2 hours

**Total Medium-Priority Work:** ~6 hours (1 day)

---

## Integration Test Matrix

| Component A | Component B | Status | Tests Needed | Priority |
|-------------|-------------|--------|--------------|----------|
| BreeScheduler | JobBridge | ✅ Tested | None | - |
| JobBridge | useLock() | ❌ Critical | Lock lifecycle E2E | Critical |
| JobBridge | useReceipt() | ❌ Critical | Receipt write E2E | Critical |
| JobBridge | useGit() | ⚠️ Partial | Git info in worker | Critical |
| Worker Thread | unctx | ❌ Critical | Context preservation | Critical |
| useJob() | BreeScheduler | ✅ Tested | None | - |
| Workflow | JobBridge | ❌ Critical | Jobs in workflows | Critical |
| Hook System | JobBridge | ❌ High | Hook triggers | High |
| CLI | useJob() | ⚠️ Partial | All commands | High |
| Pack System | Job Discovery | ❌ High | Pack jobs | High |
| Multiple Repos | BreeScheduler | ❌ Critical | Isolation | Critical |

---

## Recommended Test Implementation Order

### Week 1: Critical Tests (Must-Have)

**Day 1-2: Context and Git Integration**
1. `tests/integration/bree-context-management.test.mjs`
   - Context passes to worker
   - Composables work in worker
   - Async operations preserve context

2. `tests/integration/bree-git-integration.test.mjs`
   - Lock ref lifecycle
   - Receipt writing
   - Deterministic fingerprints

**Day 3: Workflow and Isolation**
3. `tests/integration/bree-workflow-integration.test.mjs`
   - Jobs in workflows
   - DAG dependencies
   - Context passing

4. `tests/integration/bree-cross-directory.test.mjs`
   - Scheduler isolation
   - Lock/receipt scoping
   - No data mixing

**Day 4: Error Recovery**
5. `tests/integration/bree-error-recovery.test.mjs`
   - Lock cleanup on failure
   - Error receipts
   - Resource cleanup

### Week 2: High-Priority Tests

**Day 5: Hook and CLI Integration**
6. `tests/integration/bree-hooks-integration.test.mjs`
7. `tests/integration/bree-cli-integration.test.mjs`

**Day 6: Pack Integration**
8. `tests/integration/bree-pack-integration.test.mjs`

### Week 3: Performance and Edge Cases

**Day 7: Performance**
9. `tests/integration/bree-performance.test.mjs`

**Day 8: Edge Cases and Polish**
10. `tests/integration/bree-edge-cases.test.mjs`

---

## Test Code Structure

Each integration test file follows this pattern:

```javascript
// tests/integration/bree-{component}-integration.test.mjs
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useJob } from "../../src/composables/job.mjs";
// ... other imports

describe("{Component} Integration", () => {
  let tempDir;

  beforeEach(async () => {
    // Setup: Create temp dir, git repo, jobs
    tempDir = join(process.cwd(), "test-bree-{component}");
    await fs.mkdir(join(tempDir, "jobs"), { recursive: true });

    execSync("git init", { cwd: tempDir });
    execSync('git config user.name "Test"', { cwd: tempDir });
    execSync('git config user.email "test@test.com"', { cwd: tempDir });
    await fs.writeFile(join(tempDir, "README.md"), "# Test");
    execSync("git add . && git commit -m 'init'", { cwd: tempDir });
  });

  afterEach(async () => {
    // Cleanup: Remove temp dir, reset singletons
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("{Feature}", () => {
    it("should {behavior}", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        // Test implementation
      });
    });
  });
});
```

---

## Validation Checklist

Use this checklist for each test:

### Setup
- [ ] Temp directory created
- [ ] Git repo initialized
- [ ] Jobs directory exists
- [ ] Test job files created
- [ ] Singletons reset

### Pre-Execution
- [ ] Job definition valid
- [ ] Context has cwd, env, git
- [ ] withGitVan() wrapper used

### Execution
- [ ] Lock acquired
- [ ] Job runs in worker
- [ ] Context preserved
- [ ] No errors thrown

### Post-Execution
- [ ] Lock released
- [ ] Receipt written
- [ ] Receipt has all fields
- [ ] Results correct

### Cleanup
- [ ] Temp files removed
- [ ] Singletons reset
- [ ] No resource leaks

---

## Success Criteria

Integration testing is complete when:

✅ All critical tests pass (6 test files)
✅ All high-priority tests pass (3 test files)
✅ Test coverage ≥80% for:
  - src/jobs/bree-scheduler.mjs
  - src/jobs/job-bridge.mjs
  - src/composables/job.mjs (Bree methods)
✅ No context loss bugs
✅ Locks always released
✅ Receipts always written
✅ Cross-directory isolation works
✅ Workflow integration works
✅ All CLI commands work

---

## Quick Start

### Run Existing Tests
```bash
# Baseline: existing Bree tests
npm test tests/jobs-bree-integration.test.mjs

# Check coverage
npm test -- --coverage tests/jobs-bree-integration.test.mjs
```

### Create First Integration Test
```bash
# Create test file
touch tests/integration/bree-context-management.test.mjs

# Copy template from docs/integration-test-strategy-bree.md
# Section 4.1: Context Management Test

# Run test
npm test tests/integration/bree-context-management.test.mjs
```

### Iterate
1. Write test (TDD)
2. Run test (should fail)
3. Fix code
4. Run test (should pass)
5. Commit

---

## Resources

- **Full Strategy:** `/home/user/gitvan/docs/integration-test-strategy-bree.md`
- **Existing Tests:** `/home/user/gitvan/tests/jobs-bree-integration.test.mjs`
- **Source Code:**
  - `/home/user/gitvan/src/jobs/bree-scheduler.mjs`
  - `/home/user/gitvan/src/jobs/job-bridge.mjs`
  - `/home/user/gitvan/src/composables/job.mjs`

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation | Status |
|------|--------|------------|------------|--------|
| Context loss in workers | HIGH | HIGH | Test & serialize context | ❌ Not tested |
| Stale locks | HIGH | MEDIUM | Lock TTL & cleanup | ❌ Not tested |
| Receipt corruption | MEDIUM | LOW | Git locking | ⚠️ Partial |
| Cross-repo interference | HIGH | MEDIUM | Singleton isolation | ❌ Not tested |
| Memory leaks | MEDIUM | MEDIUM | Resource tracking | ❌ Not tested |
| Workflow failures | HIGH | MEDIUM | Integration tests | ❌ Not tested |

**Overall Risk:** HIGH - Do not release without critical tests

---

## Next Actions

**Immediate (Today):**
1. Review this summary
2. Create `tests/integration/` directory
3. Implement context management test (4 hours)
4. Run test, fix bugs found

**This Week:**
1. Implement all critical tests (6 files)
2. Fix bugs found during testing
3. Verify 80% coverage for Bree code

**Next Week:**
1. Implement high-priority tests
2. Document findings
3. Update CHANGELOG

---

**TPS Jidoka Applied:**
Testing integration points prevents defects from reaching production. Each integration point is a potential failure—test them all before release.

**Status:** Analysis complete, implementation pending
**Prepared by:** QA Testing Agent
**Review Date:** 2026-01-08
