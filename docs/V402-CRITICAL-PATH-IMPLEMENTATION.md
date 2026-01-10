# GitVan v4.0.2 Critical Path Implementation Guide
## Hands-On Execution Plan for 7-Day Sprint

**Document**: Phase-by-phase implementation with specific commands, checkpoints, and troubleshooting

---

## Quick Start (For Experienced Devs)

```bash
# Day 1: Infrastructure
npm install
git submodule update --init --recursive
npm run build
npm test

# If everything passes, proceed to Phase 2
# If anything fails, see troubleshooting section below
```

---

## Phase 1: Infrastructure Setup (Day 1)
**Owner**: DevOps Lead
**Effort**: 4-6 hours
**Goal**: All foundational dependencies working

### Step 1.1: Install Dependencies

```bash
cd /home/user/gitvan
npm install
```

**Expected Output**:
```
added XXX packages in Xs
```

**Validation**:
```bash
npm ls --depth=0
# Should show NO "UNMET DEPENDENCY" errors
# All 130+ packages should be installed
```

**Troubleshooting**:
- **Error**: `ERR! code E404 Package not found`
  - **Cause**: Internet connectivity or registry issue
  - **Fix**: `npm cache clean --force && npm install`

- **Error**: `ERR! enoent ENOENT: no such file or directory`
  - **Cause**: Corrupted node_modules
  - **Fix**: `rm -rf node_modules package-lock.json && npm install`

---

### Step 1.2: Initialize Git Submodule

```bash
git submodule update --init --recursive
```

**Expected Output**:
```
Cloning into 'vendor/unrdf'...
Submodule path 'vendor/unrdf': checked out 'COMMIT_HASH'
```

**Validation**:
```bash
ls -la vendor/unrdf/
# Should show package.json, src/, etc. (not empty)
```

**Troubleshooting**:
- **Error**: `fatal: No url found for submodule path 'vendor/unrdf'`
  - **Cause**: .gitmodules corrupted or missing
  - **Fix**: `git config --file .gitmodules --list` (verify entries exist)

- **Error**: `fatal: repository not found`
  - **Cause**: Submodule repository URL incorrect or missing
  - **Fix**: `cat .gitmodules` (check URL is correct URL)

---

### Step 1.3: Verify Build System

```bash
npm run build
```

**Expected Output**:
```
> gitvan@4.0.1 build
> unbuild

Building gitvan (3s)
✓ dist/cli.mjs (234 KB)
✓ dist/bin/gitvan.mjs (45 KB)
```

**Validation**:
```bash
ls -lh dist/
# Should show: cli.mjs, bin/gitvan.mjs (not 0 bytes)
file dist/cli.mjs
# Should show: JavaScript
```

**Troubleshooting**:
- **Error**: `unbuild: command not found`
  - **Cause**: Dependencies not installed
  - **Fix**: `npm install` (go back to Step 1.1)

- **Error**: `Error: failed to build`
  - **Cause**: Source file syntax errors
  - **Fix**: `npm run lint` to find syntax issues, fix them

---

### Step 1.4: Verify Test Framework

```bash
npm test -- --run
```

**Expected Output**:
```
✓ tests/composables/git.test.mjs (12 tests) 45ms
✓ tests/composables/template.test.mjs (8 tests) 23ms
... (more test files)
✓ 264 passed in 45s
```

**Validation**:
```bash
npm test -- --run --reporter=verbose
# Should see: "✓ TOTAL: 264 passed"
# Should NOT see: "FAILED" or "ERR"
```

**Troubleshooting**:
- **Error**: `vitest: command not found`
  - **Cause**: devDependencies not installed
  - **Fix**: `npm install` (Step 1.1)

- **Error**: Tests timeout (> 60s per file)
  - **Cause**: Context preservation issues or missing mocks
  - **Fix**: Skip problematic tests temporarily: `npm test -- --run --skip failing.test.mjs`

---

### Step 1.5: Verify Linting

```bash
npm run lint
```

**Expected Output**:
```
> gitvan@4.0.1 lint
> eslint src/

✓ No linting errors found!
```

**Validation**:
```bash
npm run lint 2>&1 | tail -1
# Should NOT contain "error"
```

**Troubleshooting**:
- **Error**: `Cannot find package 'eslint-config-unjs'`
  - **Cause**: Config package not installed
  - **Fix**: `npm install eslint-config-unjs`

- **Error**: Linting errors in src files
  - **Cause**: Code style violations
  - **Fix**: `npm run lint -- --fix` (auto-fix)

---

### Phase 1 Checkpoint

**Green Light** (all pass):
```bash
✓ npm install completed
✓ Submodule initialized (vendor/unrdf/ populated)
✓ npm run build succeeded (dist/ files exist)
✓ npm test passed (264/264 tests)
✓ npm run lint passed (zero errors)
```

**If Green Light**: Proceed to Phase 2
**If Any Red**: Fix that specific step before proceeding

---

## Phase 2: Build & Test Healing (Days 2-3)
**Owner**: Dev + QA Lead
**Effort**: 16-20 hours
**Goal**: 100% test pass rate, 80%+ coverage

### Step 2.1: Analyze Test Failures

```bash
npm test -- --run --reporter=verbose > test-report.txt 2>&1
grep "FAIL\|ERR" test-report.txt | head -20
```

**Expected** (if Phase 1 passed): Zero failures

**If failures exist**, categorize them:

```bash
# Count failure types
grep -o "expected\|timeout\|FAIL" test-report.txt | sort | uniq -c
```

**Common Failure Patterns**:

1. **Context Loss (unctx)**:
   ```
   Error: Context not available
   at useGitVan (src/core/context.mjs:45)
   ```
   - **Fix**: Check test setup for `withGitVan()` wrapper
   - **Action**: Update vitest.config.mjs context hooks

2. **Async Timeout**:
   ```
   Timeout exceeded: 30000ms (vitest default)
   ```
   - **Fix**: Check for missing `await` or infinite loops
   - **Action**: Add debugging, increase timeout for specific tests

3. **Mock Setup Issue**:
   ```
   Error: Cannot read property 'commit' of undefined
   ```
   - **Fix**: Mock not configured correctly
   - **Action**: Review beforeEach() setup in tests

---

### Step 2.2: Fix High-Impact Failures

Run test suite with extended diagnostics:

```bash
npm test -- --run --bail
# --bail stops at first failure (faster debugging)
```

For each failure:

```bash
# Run single failing test
npm test -- --run tests/specific-file.test.mjs

# Get full stack trace
npm test -- --run --reporter=verbose tests/specific-file.test.mjs
```

**Fix Pattern**:
1. Identify failure pattern
2. Root cause analysis
3. Apply targeted fix
4. Verify fix doesn't break other tests: `npm test -- --run --related`

---

### Step 2.3: Achieve 80%+ Coverage

```bash
npm test -- --run --coverage
```

**Expected Output**:
```
✓ Statements   : 82% (12,345/15,000)
✓ Branches     : 80% (3,200/4,000)
✓ Functions    : 81% (540/670)
✓ Lines        : 82% (12,345/15,000)
```

**If Below 80%**:
```bash
# Find uncovered files
npm test -- --run --coverage --reporter=text | grep "0% coverage"
```

**Action for Uncovered Modules**:
- Add unit tests for untested functions
- Add integration tests for untested paths

---

### Step 2.4: Remove Console.log Statements

```bash
grep -r "console\.log\|console\.error\|console\.warn" src/ --include="*.mjs" > console-report.txt
cat console-report.txt
```

**Expected**: Either zero, or only in CLI output formatters

**For each console statement**:
```bash
# View context
grep -B2 -A2 "console.log" src/specific-file.mjs
```

**Remove or Replace**:
```javascript
// ❌ REMOVE
console.log("Debug info");

// ✓ REPLACE WITH (if needed for production output)
import { consola } from "consola";
consola.info("Debug info");  // Only in CLI
```

---

### Step 2.5: Verify Build Reproducibility

```bash
# Clean build
rm -rf dist/
npm run build

# Verify artifact sizes reasonable
ls -lh dist/cli.mjs
# Expected: > 100KB (has dependencies bundled)
```

---

### Phase 2 Checkpoint

**Green Light** (all pass):
```bash
✓ npm test 100% pass rate (264/264 tests)
✓ Coverage ≥80% (all 4 metrics)
✓ Zero console.log statements in src/
✓ npm run build reproducible
✓ npm run lint passes
```

**Coverage Detail Check**:
```bash
npm test -- --run --coverage --reporter=text-summary
# All percentages ≥80%
```

**If Green Light**: Proceed to Phase 3
**If Any Red**: Go back to debugging that specific test/module

---

## Phase 3: Code Quality (Days 4-6)
**Owner**: Architecture Lead
**Effort**: 24 hours
**Goal**: All files ≤500 lines, all composables tested

### Step 3.1: Identify Oversized Files

```bash
find src -name "*.mjs" -exec wc -l {} + | sort -rn | head -20
```

**Files to Refactor** (from earlier assessment):
1. `src/revops/integrations.mjs` - 932 lines
2. `src/jobs/job-bridge.mjs` - 912 lines
3. `src/git-native/RDFMigrationAdapter.mjs` - 884 lines
4. `src/cli/commands/cleanroom.mjs` - 837 lines
5. `src/cli/init.mjs` - 823 lines
6. `src/performance/RDFPerformanceMonitor.mjs` - 815 lines

---

### Step 3.2: Refactor One File at a Time

**Pattern for Each File**:

1. **Analyze Structure**:
   ```bash
   grep "^export\|^class\|^function\|^async function" src/FILE.mjs
   ```
   Identify logical groupings

2. **Create Split Plan**:
   ```markdown
   Original: integrations.mjs (932 lines)
   Split into:
   - integrations-github.mjs (300 lines) - GitHub-specific
   - integrations-slack.mjs (250 lines) - Slack-specific
   - integrations-core.mjs (382 lines) - Shared logic
   ```

3. **Execute Split**:
   - Create new files
   - Move related functions
   - Update imports
   - Keep exports stable (no API change)

4. **Verify**:
   ```bash
   npm run lint
   npm test -- --run
   # All tests still pass
   ```

5. **Commit**:
   ```bash
   git add src/integrations-*.mjs src/integrations.mjs
   git commit -m "refactor: split integrations.mjs (932 → 300/250/382 lines)"
   ```

---

### Step 3.3: Add Tests for Untested Composables

```bash
find src/composables -name "*.mjs" | while read f; do
  name=$(basename "$f" .mjs)
  if ! [ -f "tests/composables/${name}.test.mjs" ]; then
    echo "UNTESTED: $f"
  fi
done
```

**For Each Untested Composable**:

Create test file template:
```javascript
// tests/composables/my-composable.test.mjs
import { describe, it, expect, beforeEach } from "vitest";
import { withGitVan, useMyComposable } from "gitvan";

describe("useMyComposable", () => {
  let context;

  beforeEach(() => {
    context = createTestContext();
  });

  it("should perform basic operation", async () => {
    await withGitVan(context, async () => {
      const composable = useMyComposable();
      const result = await composable.doSomething();
      expect(result).toBeDefined();
    });
  });

  it("should handle errors gracefully", async () => {
    await withGitVan(context, async () => {
      const composable = useMyComposable();
      expect(async () => {
        await composable.failingOperation();
      }).rejects.toThrow();
    });
  });
});
```

**Add multiple tests** for:
- Happy path
- Error conditions
- Edge cases
- Context preservation

**Verify Coverage**:
```bash
npm test -- --run tests/composables/my-composable.test.mjs --coverage
# Expected: >80%
```

---

### Step 3.4: Final Code Quality Validation

```bash
# All files under 500 lines
find src -name "*.mjs" -exec wc -l {} + | awk '$1 > 500 {print}' | wc -l
# Expected: 0

# All composables tested
find src/composables -name "*.mjs" | wc -l
find tests/composables -name "*.test.mjs" | wc -l
# Expected: same number (or explained exclusions)

# Zero console.log
grep -r "console\.log" src --include="*.mjs" | wc -l
# Expected: 0 (or only in CLI formatters)
```

---

### Phase 3 Checkpoint

**Green Light** (all pass):
```bash
✓ All source files ≤500 lines
✓ All 67 composables have tests
✓ Zero console.log in production code
✓ All tests passing (264/264)
✓ Coverage ≥80%
```

**Detailed Check**:
```bash
# Verify max file size
find src -name "*.mjs" -exec wc -l {} + | sort -rn | head -1
# Expected first number: ≤500

# Count composables
ls -1 src/composables/*.mjs | wc -l
ls -1 tests/composables/*.test.mjs | wc -l
# Expected: same count
```

**If Green Light**: Proceed to Phase 4
**If Any Red**: Go back and fix that specific module

---

## Phase 4: Production Validation (Day 7)
**Owner**: PM + Architect
**Effort**: 8 hours
**Goal**: All user segments validated

### Step 4.1: Developer JTBD - Local Quality Enforcement

**Test**: Run quality checks locally in < 2s

```bash
time npm test -- --run tests/composables/git.test.mjs
# Expected: < 2000ms
```

**Action**: Create pre-commit hook
```bash
# .husky/pre-commit
#!/bin/bash
npm test -- --run --bail
npm run lint -- --fix
```

**Validate**: ✓ Developers can run quality checks before push

---

### Step 4.2: DevOps JTBD - Workflow Coordination

**Test**: Execute a complex workflow from .ttl file

```javascript
// tests/integration/jtbd-devops.test.mjs
it("should execute parallel workflow", async () => {
  const workflow = await parseWorkflow("test-workflow.ttl");
  const plan = await planWorkflow(workflow);

  expect(plan.steps[0]).toBeDefined();
  expect(plan.parallelGroups).toContainEqual(["step-a", "step-b"]);

  const result = await executeWorkflow(workflow);
  expect(result.success).toBe(true);
  expect(result.duration).toBeLessThan(5000);
});
```

**Run Test**:
```bash
npm test -- --run tests/integration/jtbd-devops.test.mjs
```

**Validate**: ✓ DevOps can declare workflows in .ttl, execute reliably

---

### Step 4.3: SRE JTBD - Incident Detection

**Test**: Query performance metrics in < 500ms

```javascript
it("should query SLO metrics < 500ms", async () => {
  const startTime = Date.now();

  const query = `
    SELECT ?metric ?value WHERE {
      ?metric a :SLOMetric ;
              :value ?value .
    }
  `;

  const results = await sparqlQuery(query);
  const duration = Date.now() - startTime;

  expect(results.length).toBeGreaterThan(0);
  expect(duration).toBeLessThan(500);
});
```

**Run Test**:
```bash
npm test -- --run tests/integration/jtbd-sre.test.mjs
```

**Validate**: ✓ SREs can detect metrics anomalies quickly

---

### Step 4.4: Product Manager JTBD - Revenue Tracking

**Test**: Calculate churn prediction

```javascript
it("should predict churn with 90% accuracy", async () => {
  const predictions = await predictChurn({
    historicalData: [...],
    features: ["executionFailures", "unusedWorkflows", "expiredLicense"]
  });

  expect(predictions.accuracy).toBeGreaterThan(0.9);
  expect(predictions.churnRisk).toBeDefined();
});
```

**Run Test**:
```bash
npm test -- --run tests/integration/jtbd-prodmgmt.test.mjs
```

**Validate**: ✓ Revenue tracking working accurately

---

### Step 4.5: Architect JTBD - Platform Extensibility

**Test**: Register and execute custom hook

```javascript
it("should allow custom hook registration", async () => {
  const customHook = {
    name: "CustomQualityCheck",
    predicate: (event) => event.type === "pre-commit",
    execute: async () => ({ success: true })
  };

  await registerHook(customHook);
  const result = await executeHook(customHook.name, testEvent);

  expect(result.success).toBe(true);
});
```

**Run Test**:
```bash
npm test -- --run tests/integration/jtbd-architect.test.mjs
```

**Validate**: ✓ Architects can extend without forking

---

### Step 4.6: Performance Benchmarking

```bash
npm run benchmark
```

**Expected Results**:
- Build time: < 15 seconds
- Test cycle: < 30 seconds
- Single test: < 100ms
- Hook execution: < 50ms
- SPARQL query: < 500ms

**If Slower**:
- Profile: `npm test -- --run --reporter=verbose`
- Identify bottleneck
- Document for v4.1 optimization

---

### Step 4.7: Security Audit

```bash
npm audit
```

**Expected**: 0 vulnerabilities

**If vulnerabilities exist**:
- Assess severity (high/critical only block release)
- Document known issues
- Plan patches for v4.0.3

---

### Step 4.8: Documentation Completeness

**Checklist**:
- [ ] README updated for v4.0.2 features
- [ ] CHANGELOG updated
- [ ] API documentation current
- [ ] Examples working
- [ ] Deployment guide updated
- [ ] Migration notes (if applicable)

---

### Phase 4 Checkpoint

**Green Light** (all pass):
```bash
✓ All 5 JTBD scenarios validated
✓ Performance benchmarks acceptable
✓ npm audit clean (or documented)
✓ Documentation complete
```

**Final Validation Command**:
```bash
npm test -- --run && npm run build && npm run lint && npm audit
```

**All 4 commands exit with code 0**: Ready for release

---

## Post-Implementation: Sign-Off Process

### Step 5.1: Gather Sign-Offs

Create sign-off checklist:

```markdown
# v4.0.2 Release Sign-Off

## Infrastructure (Days 1)
- [x] Dev Lead: npm install, build, tests, lint all pass
- [x] DevOps Lead: Build reproducible in CI environment
- [x] Architect: Submodule initialized, dependencies stable

## Build & Test (Days 2-3)
- [ ] QA Lead: 264/264 tests passing, 80%+ coverage
- [ ] Dev Lead: Zero console.log in production code
- [ ] Test Infrastructure: Vitest configured properly

## Code Quality (Days 4-6)
- [ ] Architecture: All files ≤500 lines refactored
- [ ] QA: All 67 composables have test coverage
- [ ] Code Review: Architecture approved

## Production Validation (Day 7)
- [ ] Product Manager: All 5 JTBD scenarios pass
- [ ] Security: npm audit clean
- [ ] Architect: Extensibility verified
- [ ] DevOps: Deployment tested in staging

## Release Authority (Final)
- [ ] Engineering Lead: All gates passed
- [ ] Product Lead: Ready for announcement
- [ ] Compliance: Security/privacy approved
```

### Step 5.2: Create Release Announcement

Template:
```markdown
# GitVan v4.0.2 Release Announcement

**Date**: [DATE]
**Version**: 4.0.2
**Status**: Production Ready

## What's New
- Infrastructure reliability (7-day hardening sprint)
- 80%+ test coverage achieved
- Code quality baseline established
- All 5 user segments validated

## Breaking Changes
None - backward compatible with v4.0.1

## Migration Guide
None needed for v4.0.0→v4.0.2 upgrade

## Known Limitations
- See CHANGELOG.md for known issues
- v4.1 roadmap: performance optimizations

## Support
- GitHub Issues for bug reports
- Documentation: docs/
- Developer Guide: CLAUDE.md
```

---

## Troubleshooting Reference

### Common Issues & Solutions

#### Issue: Build fails with "module not found"
**Diagnosis**:
```bash
npm run build 2>&1 | head -50
```

**Solution**:
1. Check all imports are lowercase: `import { useGit }` not `import { UseGit }`
2. Verify relative paths: `../composables/git.mjs` exists
3. Run: `npm install` to ensure all dependencies installed

---

#### Issue: Tests timeout
**Diagnosis**:
```bash
npm test -- --run --reporter=verbose 2>&1 | grep -A5 "FAIL"
```

**Solution**:
1. Check for missing `await` on async calls
2. Check for context loss (ensure `withGitVan()` wrapper exists)
3. Increase timeout for slow tests:
   ```javascript
   it("slow test", async () => {
     // ...
   }, 60000);  // 60s timeout
   ```

---

#### Issue: Coverage below 80%
**Diagnosis**:
```bash
npm test -- --run --coverage | grep "< 80"
```

**Solution**:
1. Identify uncovered files: `npm test -- --run --coverage --reporter=text`
2. Add unit tests for missing functions
3. Add integration tests for missing paths
4. Re-run: `npm test -- --run --coverage`

---

#### Issue: Lint fails with "eslint-config-unjs not found"
**Diagnosis**:
```bash
npm run lint 2>&1 | head
```

**Solution**:
1. Install missing dependency: `npm install eslint-config-unjs --save-dev`
2. Verify eslint.config.mjs imports correctly
3. Re-run: `npm run lint`

---

## Timeline Tracker

Copy this into your project management system:

```
WEEK 1:
Day 1:  ☐ Phase 1 (Infrastructure)      - Owner: DevOps  - ETA: 6 hours
Day 2:  ☐ Phase 2A (Test analysis)       - Owner: QA     - ETA: 4 hours
Day 3:  ☐ Phase 2B (Coverage fixes)      - Owner: Dev    - ETA: 8 hours

WEEK 2:
Day 4:  ☐ Phase 3A (File refactoring)    - Owner: Arch   - ETA: 8 hours
Day 5:  ☐ Phase 3B (Add tests)           - Owner: QA     - ETA: 8 hours
Day 6:  ☐ Phase 3C (Final validation)    - Owner: Dev    - ETA: 4 hours

Day 7:  ☐ Phase 4 (Production validation)- Owner: PM     - ETA: 8 hours

Day 8-10: ☐ Buffer for issues/rework    - All owners
```

---

## Success Definition

**v4.0.2 is ready when**:

✓ All 4 phases complete
✓ All 6 sign-offs obtained
✓ All checkpoints green light
✓ Zero critical issues open
✓ Release notes written
✓ Team confidence high

Then ship it!

---

**Last Updated**: January 9, 2026
**Next Review**: After Phase 1 completion
