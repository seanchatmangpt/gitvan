# Toyota Production System (TPS) Action Plan
## GitVan v4.0.1 - Critical Path to Release

**Status**: 🔴 **JIDOKA ACTIVATED - PRODUCTION STOPPED**
**Effective Date**: January 9, 2026
**Target Release**: v4.0.1 (7-14 days)
**Owner**: Development Team

---

## Executive Summary

Following TPS principles, v4.0.0 has triggered the **Jidoka stop-on-defect mechanism**. This action plan defines the critical path to resolve blockers and release v4.0.1.

### Key Principle
**"Stop the line when a defect is found. Don't pass defects downstream."**

In software: Don't ship code that fails quality gates.

---

## Critical Blockers (JIDOKA TRIGGERED)

```
🔴 BLOCKER 1: Test Pass Rate 67.9% (Target: 100%)
   Impact:     CRITICAL - Code quality unknown
   Severity:   P0 (Jidoka Gate #1)
   Owner:      Development Team
   ETA:        2-3 days
   Dependencies: Fix Blocker #2 first (dependencies)

🔴 BLOCKER 2: Security Vulnerabilities (5)
   Impact:     CRITICAL - Security breach risk
   Severity:   P0 (Jidoka Gate #2)
   Owner:      Security / Development
   ETA:        1-2 days
   Dependencies: None - parallel

🔴 BLOCKER 3: Missing Dependencies (30+)
   Impact:     CRITICAL - Build fails
   Severity:   P0 (Jidoka Gate #3)
   Owner:      Development Team
   ETA:        1 day
   Dependencies: Must fix BEFORE Blocker #1 tests run
```

---

## Critical Path (Sequential Order)

### Phase 0: ROOT CAUSE ANALYSIS (Day 1 - 4 hours)

**Activity**: Apply 5-Why method to each blocker

**Blocker 1: Why do 44 tests fail?**
```
Why #1: Missing dependencies (nunjucks, cacache, prompts, marked, exceljs)
Why #2: Dependencies declared after code written
Why #3: No dependency verification gate
Why #4: No quality gate enforcement
Why #5: No Jidoka mechanism activated

ROOT CAUSE: Absence of quality-first development process
COUNTERMEASURE: Declare dependencies FIRST, implement CI/CD gate
```

**Blocker 2: Why 5 security vulnerabilities?**
```
Why #1: Packages have CVEs (rollup, vite)
Why #2: Security not scanned before release
Why #3: No security audit gate
Why #4: Release timeline didn't include security
Why #5: No company security policy

ROOT CAUSE: Missing security-first release policy
COUNTERMEASURE: Add `npm audit` gate, patch dependencies
```

**Blocker 3: Why 30+ dependencies missing?**
```
Why #1: Code imports packages not in package.json
Why #2: Dependencies declared after code is written
Why #3: No automated verification of clean build
Why #4: No CI/CD pipeline
Why #5: Development process doesn't enforce gates

ROOT CAUSE: Push-driven development instead of pull-driven
COUNTERMEASURE: Require build verification before merge/release
```

**Deliverable**: Root cause document (5-Why for each blocker)

---

### Phase 1: DEPENDENCY REMEDIATION (Day 2 - 4 hours)

**Activity**: Declare all missing dependencies

**Step 1.1: Identify all 30+ missing dependencies**
```bash
# Review package.json vs import statements
npm list --depth=0 2>&1 | grep "missing"
```

**Step 1.2: Update package.json with all missing packages**
```javascript
// Add to package.json
{
  "dependencies": {
    // Existing...
    "nunjucks": "^3.2.0",      // For templating
    "cacache": "^18.0.0",      // For caching
    "prompts": "^2.4.0",       // For CLI prompts
    "marked": "^11.0.0",       // For markdown
    "exceljs": "^4.3.0",       // For Excel export
    // ... 25 more packages
  }
}
```

**Step 1.3: Install and verify**
```bash
npm install
npm run build
```

**Step 1.4: Commit**
```bash
git add package.json package-lock.json
git commit -m "fix: declare all missing dependencies for v4.0.1"
```

**Verification**:
- [ ] `npm install` completes without errors
- [ ] `npm run build` succeeds
- [ ] No unresolved import warnings

**Blocker Status**: ✅ FIXED (Blocker #3)

---

### Phase 2: TEST REMEDIATION (Day 3-4 - 6-8 hours)

**Activity**: Fix 44 failing tests, achieve 100% pass rate

**Step 2.1: Run test suite and categorize failures**
```bash
npm test 2>&1 | tee test-report.log
```

**Categories of failures**:
1. Pack system tests (nunjucks, marked, exceljs not found)
2. Bree timing issues (job scheduler conflicts)
3. Git lock conflicts (worktree issues)
4. Setup failures (missing test fixtures)

**Step 2.2: Fix by category**

**Category A: Missing Imports** (Quick fixes)
```javascript
// Files to update: tests/v4/hooks.test.mjs
// Add proper imports after dependencies installed
import nunjucks from "nunjucks"
import cacache from "cacache"
import prompts from "prompts"
```

**Category B: Bree Timing Issues** (Medium fixes)
```javascript
// Issue: Tests timeout waiting for job scheduler
// Solution: Mock Bree in tests, test scheduler separately
// Files: tests/v4/hooks.test.mjs, tests/jobs/bree-scheduler.test.mjs
// Approach: Use fake timers or job queue mocking
```

**Category C: Git Lock Conflicts** (Complex fixes)
```bash
# Issue: Worktree operations conflict with git locks
# Solution: Clean up git locks before tests, use isolated repos
# Implementation: Create test fixture for isolated git repo per test
# Files: tests/composables/worktree.test.mjs
```

**Step 2.3: Achieve 100% pass rate**
```bash
npm test                                    # Run all tests
npm test -- --coverage                      # Verify 80%+ coverage
npm test -- --reporter=verbose              # Detailed output
```

**Step 2.4: Commit fixes**
```bash
git add tests/
git commit -m "fix: resolve 44 test failures, achieve 100% pass rate"
```

**Verification**:
- [ ] All 137 tests passing
- [ ] Test coverage ≥80% (branches, functions, lines, statements)
- [ ] No flaky tests (run 3x to confirm consistency)

**Blocker Status**: ✅ FIXED (Blocker #1)

---

### Phase 3: SECURITY HARDENING (Day 4-5 - 4-6 hours)

**Activity**: Fix vulnerabilities, achieve 0 CVEs

**Step 3.1: Identify vulnerabilities**
```bash
npm audit
```

**Known vulnerabilities**:
```
1. rollup: DOM Clobbering XSS (HIGH)
   - Fix: Update rollup to ≥4.x

2. vite: Multiple security issues (HIGH, MODERATE)
   - Fix: Update vite to latest

3. Other transitive: (MODERATE, LOW)
   - Fix: Update dependencies
```

**Step 3.2: Update vulnerable packages**
```bash
npm audit fix                    # Auto-fix what's possible
npm update rollup vite          # Manual update if needed
npm audit                        # Verify 0 vulnerabilities
```

**Step 3.3: Verify build still works**
```bash
npm run build
npm test
```

**Step 3.4: Commit**
```bash
git add package.json package-lock.json
git commit -m "fix: patch security vulnerabilities for v4.0.1"
```

**Verification**:
- [ ] `npm audit` returns 0 vulnerabilities
- [ ] Build succeeds
- [ ] Tests still pass

**Blocker Status**: ✅ FIXED (Blocker #2)

---

### Phase 4: CODE QUALITY SPRINT (Day 5-6 - 6-8 hours)

**Activity**: Fix code quality violations (medium priority, but improves maintainability)

**Step 4.1: Replace console.log statements (35 instances)**

**Find all console.log instances**:
```bash
grep -r "console\.log" src/ --include="*.mjs" --include="*.ts"
```

**Replace with consola logger**:
```javascript
// Before:
console.log("Processing workflow");
console.log("Error:", error);

// After:
import { consola } from "consola";
consola.info("Processing workflow");
consola.error("Error:", error);
```

**Step 4.2: Refactor oversized files (6 files > 500 lines)**

**Files to refactor**:
1. src/v4/index.ts (analyze & split)
2. src/v4/core/context.ts (analyze & split)
3. src/v4/hooks/gitvan.ts (analyze & split)
4. [3 more files...]

**Refactoring strategy**:
```
For each large file:
1. Identify logical groups of functions
2. Extract groups into separate files (same directory)
3. Re-export from index.ts for backward compatibility
4. Update imports in dependent files
5. Test to ensure behavior unchanged
```

**Example**:
```
src/v4/core/
├── context.ts          (was 600 lines)
├── context/
│   ├── dependency-injection.ts  (200 lines)
│   ├── context-creation.ts      (150 lines)
│   ├── token-system.ts          (100 lines)
│   └── index.ts                 (re-exports)
└── [other files]
```

**Step 4.3: Verify code quality**
```bash
npm run lint
npm run build
```

**Step 4.4: Commit**
```bash
git add src/
git commit -m "refactor: improve code quality (logger, file sizes)"
```

**Verification**:
- [ ] All console.log replaced with consola
- [ ] All files <500 lines
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Tests still pass

**Status**: ✅ FIXED (Code Quality)

---

### Phase 5: DOCUMENTATION COMPLETION (Day 6-7 - 6-8 hours)

**Activity**: Complete remaining 10-15% of documentation

**Step 5.1: Identify missing documentation**
```bash
# Review all references in docs/v4/README.md
# Check for broken links or missing files
find docs/v4/ -type f -name "*.md" | xargs grep "\[.*\](.*\.md)"
```

**Step 5.2: Complete missing sections**

**Common gaps to address**:
1. API reference completeness
2. Tutorial walkthroughs with examples
3. Migration guide edge cases
4. Troubleshooting section
5. Performance tuning guide

**Step 5.3: Verify documentation accuracy**
```bash
# For each claim in docs:
1. Verify code exists at referenced location
2. Run example code to ensure it works
3. Check for broken links
4. Verify API signatures match documentation
```

**Step 5.4: Update CHANGELOG**
```
# CHANGELOG.md
## [4.0.1] - 2026-01-16

### Fixed
- 44 test failures (missing dependencies, timing issues)
- 5 security vulnerabilities (rollup, vite updates)
- 30+ missing dependency declarations
- Code quality violations (console.log, file sizes)
- Documentation gaps (10-15% completion)

### Added
- TPS release readiness evaluation
- CI/CD quality gates documentation
- Kaizen continuous improvement process

### Changed
- Release process now requires all gates to pass
```

**Step 5.5: Commit**
```bash
git add docs/ CHANGELOG.md
git commit -m "docs: complete v4.0.1 documentation and changelog"
```

**Verification**:
- [ ] All documentation links valid
- [ ] All examples tested and working
- [ ] No broken references
- [ ] CHANGELOG complete and accurate

**Status**: ✅ FIXED (Documentation)

---

### Phase 6: VERIFICATION & SIGN-OFF (Day 7-8 - 4-6 hours)

**Activity**: Final verification before release

**Step 6.1: Run complete test suite**
```bash
npm test -- --coverage
npm test -- --reporter=verbose
```

**Criteria**:
- ✅ 100% of tests passing (137/137)
- ✅ Coverage >80% on all metrics (branches, functions, lines, statements)
- ✅ No flaky tests
- ✅ <5 minute total runtime

**Step 6.2: Verify security**
```bash
npm audit
npm run lint
```

**Criteria**:
- ✅ 0 vulnerabilities
- ✅ Linting passes
- ✅ No security warnings

**Step 6.3: Build production artifacts**
```bash
npm run build
ls -lh dist/
```

**Criteria**:
- ✅ Build succeeds
- ✅ Artifacts generated (cli.mjs, bin/gitvan.mjs)
- ✅ Artifact size reasonable (not bloated)

**Step 6.4: Test installation (dry-run)**
```bash
# Simulate npm publish
npm pack
npm install gitvan-4.0.1.tgz
gitvan --version  # Should output 4.0.1
```

**Criteria**:
- ✅ Package installs without errors
- ✅ CLI works
- ✅ Help output displays
- ✅ Basic commands execute

**Step 6.5: Release sign-off**

**Sign-off checklist**:
```
QUALITY ASSURANCE
  ✅ 100% tests passing (137/137)
  ✅ 80%+ coverage on all metrics
  ✅ No flaky tests
  ✅ No performance regressions

SECURITY
  ✅ 0 vulnerabilities (npm audit)
  ✅ No CVEs in dependencies
  ✅ Signed commits enabled
  ✅ No secrets in code

CODE QUALITY
  ✅ All files <500 lines
  ✅ No console.log statements
  ✅ Linting passes
  ✅ Type checking passes

DOCUMENTATION
  ✅ 100% documentation complete
  ✅ All examples verified
  ✅ API reference accurate
  ✅ CHANGELOG updated

DEPLOYMENT
  ✅ Build succeeds
  ✅ Artifacts generated
  ✅ Installation tested
  ✅ Basic operations verified

FINAL VERDICT: ✅ APPROVED FOR RELEASE v4.0.1
```

**Step 6.6: Create release commit**
```bash
git tag -a v4.0.1 -m "v4.0.1: Released with full TPS compliance

This release:
- Fixes 44 test failures
- Resolves 5 security vulnerabilities
- Declares all dependencies
- Improves code quality
- Completes documentation
- Implements TPS release process

Breaking changes: None
Deprecations: None
Migration required: v3 users can upgrade seamlessly

Full details: docs/v4/RELEASE_NOTES_v4.0.1.md"

git push origin v4.0.1
git push origin claude/evaluate-release-readiness-6Wm2O
```

---

## Daily Status Reporting

During the critical path (Days 1-8), report status daily:

```
DAILY STATUS TEMPLATE
═════════════════════════════════════════════

Date: [Day X]
Phase: [Current Phase]
Owner: [Lead Developer]

BLOCKERS RESOLVED TODAY
├─ [Item 1]: [Status]
├─ [Item 2]: [Status]
└─ [Item 3]: [Status]

PROGRESS
├─ % Complete: [X]%
├─ Tests Passing: [X]/137
├─ Vulnerabilities: [X]/5 fixed
└─ Files Refactored: [X]/6

BLOCKERS
├─ [Current blocker 1]
├─ [Current blocker 2]
└─ [Current blocker 3]

NEXT STEPS
├─ [ ] Task 1
├─ [ ] Task 2
└─ [ ] Task 3

ETA to Completion: [Days]
Risk Level: [LOW/MEDIUM/HIGH]
```

---

## Success Criteria

### Definition of Done (v4.0.1 Release)

✅ **All Critical Gates Pass**:
```
Gate 1: Tests                100% (137/137)
Gate 2: Security             0 vulnerabilities
Gate 3: Dependencies         All declared
Gate 4: Code Quality         No violations
Gate 5: Documentation        100% complete
```

✅ **Jidoka Principles Met**:
```
✓ Quality gates enforced (automatic stop if gate fails)
✓ Root causes analyzed (5-Why documented)
✓ Countermeasures implemented (systematic fixes)
✓ Verification completed (sign-off checklist)
✓ Prevention added (CI/CD gates for future)
```

✅ **Release Readiness Achieved**:
```
✓ Build completes
✓ Installation works
✓ Basic operations verified
✓ No known issues
✓ Documentation complete
```

---

## Resource Plan

### Team Requirements

| Role | Hours/Day | Days | Total Hours | Notes |
|------|-----------|------|-------------|-------|
| Lead Developer | 8 | 8 | 64 | Owns test fixes, security patches |
| QA Engineer | 4 | 8 | 32 | Verifies gates, sign-off |
| DevOps/CI | 2 | 8 | 16 | Sets up CI/CD gates |
| Documentation | 4 | 7 | 28 | Completes docs |
| Security Review | 1 | 8 | 8 | Security audit, vulnerability review |
| Release Manager | 2 | 8 | 16 | Coordinates, sign-off |
| **TOTAL** | | | **164 hours** | |

### Cost/Effort Estimate

- **Best case**: 7 days (all items parallel, no blockers)
- **Realistic case**: 10 days (some blockers, good progress)
- **Worst case**: 14 days (unexpected issues discovered)

---

## Risk Mitigation

### Known Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Tests still failing after dep fix** | MEDIUM | HIGH | 2-3 day buffer in schedule |
| **Security patches cause regression** | LOW | HIGH | Separate test phase for patches |
| **Documentation too extensive** | MEDIUM | MEDIUM | Prioritize critical sections only |
| **Team unavailable** | LOW | CRITICAL | Cross-train backup developers |
| **Git conflicts during merge** | LOW | MEDIUM | Clean merge strategy, small commits |

### Contingency Plans

**If tests still fail after dependencies fixed**:
- Extend phase 2 by 2 days
- Root cause each test individually (5-Why)
- Consider partial release of working components

**If security patch causes regression**:
- Revert patch and research alternative
- Add regression tests before re-applying
- Contact library maintainers for guidance

**If documentation incomplete by day 7**:
- Release with placeholder sections marked "TBD"
- Plan docs sprint immediately post-release
- Create issue for documentation debt

---

## Post-Release Actions (v4.0.2+)

After successful v4.0.1 release:

### Immediate (Days 1-3 Post-Release)
1. ✅ Monitor production for issues
2. ✅ Gather user feedback
3. ✅ Hotfix any critical bugs

### Short-term (Weeks 1-2)
1. ✅ Implement CI/CD gates (prevent future slips)
2. ✅ Establish kaizen weekly meetings
3. ✅ Begin team training on TPS principles

### Medium-term (Months 1-3)
1. ✅ Expand automated testing (integration tests)
2. ✅ Implement visual management dashboard
3. ✅ Establish peer review process
4. ✅ Distribute team ownership (reduce single-threaded risk)

### Long-term (Ongoing)
1. ✅ Continuous kaizen culture
2. ✅ Metrics tracking & trending
3. ✅ Process standardization
4. ✅ Team engagement & empowerment

---

## Sign-Off

This action plan activates the Jidoka (stop-on-defect) mechanism and defines the critical path to v4.0.1 release.

**Approved by**: [Release Manager signature needed]
**Date**: January 9, 2026
**Effective**: Immediately

**Next Review**: Daily during critical path (Days 1-8)

---

**Document Owner**: Development Team Lead
**Last Updated**: January 9, 2026
**Status**: 🔴 ACTIVE - JIDOKA STOPPED PRODUCTION
