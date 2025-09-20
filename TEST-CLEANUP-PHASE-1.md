# Phase 1: Immediate Cleanup - Remove Obvious Waste

## Objective
Remove all obvious waste from the test suite: demo tests, skipped tests, and duplicates. This phase focuses on low-risk, high-impact cleanup.

## Timeline
**Duration:** 1 week  
**Risk Level:** Low  
**Impact:** High (60% file reduction)

## Phase 1A: Remove Demo Tests (Day 1-2)

### Files to Delete
```bash
# Demo/Educational Tests (Not Production Tests)
rm tests/memfs-demo.test.mjs
rm tests/memfs-refactoring-demo.test.mjs
rm tests/memfs-refactoring-demonstration.test.mjs
rm tests/memfs-utils-demo.test.mjs
rm tests/proper-test-environment-demo.test.mjs
```

### Verification Commands
```bash
# Verify files are gone
ls tests/memfs-*demo*
ls tests/*demo*

# Run tests to ensure nothing broke
pnpm test
```

### Expected Results
- **Files Removed:** 5
- **Time Saved:** ~30 seconds per test run
- **Maintenance Reduced:** No more demo test maintenance

## Phase 1B: Remove Skipped Tests (Day 2-3)

### Files to Delete
```bash
# Skipped Tests (Don't Run)
rm composables.test.mjs  # Contains describe.skip
```

### Verification Commands
```bash
# Verify skipped test is gone
grep -r "describe.skip" . --include="*.test.mjs"

# Run tests to ensure nothing broke
pnpm test
```

### Expected Results
- **Files Removed:** 1
- **Tests Removed:** ~20 skipped test cases
- **Confusion Eliminated:** No more "why aren't these tests running?"

## Phase 1C: Remove Duplicate Tests (Day 3-5)

### Strategy
Keep tests in `/tests/` directory, remove duplicates from root directory.

### Files to Delete (Root Directory Duplicates)
```bash
# CLI Tests
rm tests/cli.test.mjs  # Keep root/cli.test.mjs

# Composables Tests  
rm tests/composables.test.mjs  # Keep root/composables.test.mjs

# Git Tests
rm tests/git-atomic.test.mjs
rm tests/git-comprehensive.test.mjs
rm tests/git-implementation.test.mjs
rm tests/git-environment.test.mjs

# Template Tests
rm tests/template-simple.test.mjs
rm tests/template-comprehensive.test.mjs

# Config Tests
rm tests/config-simple.test.mjs
rm tests/nunjucks-config.test.mjs

# UseGit Tests
rm tests/useGit.context.test.mjs
rm tests/useGit.e2e.test.mjs
rm tests/useGit.integration.test.mjs
rm tests/useGit.mock-strategies.test.mjs
rm tests/useGit.unit.test.mjs
rm tests/useGit-comprehensive.test.mjs

# Root Directory Duplicates
rm useGit.context.test.mjs
rm useGit.e2e.test.mjs
rm useGit.integration.test.mjs
rm useGit.mock-strategies.test.mjs
rm useGit.unit.test.mjs
rm useGit-comprehensive.test.mjs
```

### Verification Commands
```bash
# Check for remaining duplicates
find . -name "*.test.mjs" | sort | uniq -d

# Run tests to ensure nothing broke
pnpm test
```

### Expected Results
- **Files Removed:** ~25 duplicates
- **Confusion Eliminated:** No more "which test file should I edit?"
- **Maintenance Simplified:** One test file per functionality

## Phase 1D: Replace Originals with Refactored (Day 5-7)

### Strategy
Replace original (broken/skipped) tests with working refactored versions.

### Replacements
```bash
# Replace skipped composables test with working refactored version
rm composables.test.mjs
mv tests/composables-refactored.test.mjs composables.test.mjs

# Replace other refactored tests
rm git-comprehensive.test.mjs
mv tests/git-comprehensive-refactored.test.mjs git-comprehensive.test.mjs

rm tests/useGit-comprehensive.test.mjs
mv tests/useGit-comprehensive-refactored.test.mjs tests/useGit-comprehensive.test.mjs

rm tests/useGit.context.test.mjs
mv tests/useGit.context-refactored.test.mjs tests/useGit.context.test.mjs

rm tests/useGit.mock-strategies.test.mjs
mv tests/useGit.mock-strategies-refactored.test.mjs tests/useGit.mock-strategies.test.mjs

rm tests/useGit.unit.test.mjs
mv tests/useGit.unit-refactored.test.mjs tests/useGit.unit.test.mjs
```

### Verification Commands
```bash
# Verify refactored tests work
pnpm test composables.test.mjs
pnpm test git-comprehensive.test.mjs

# Check for remaining -refactored files
find . -name "*-refactored.test.mjs"
```

### Expected Results
- **Tests Fixed:** ~5 broken/skipped tests now work
- **Coverage Improved:** Actual test execution instead of skipped tests
- **Quality Improved:** Better test implementations

## Phase 1 Summary

### Files Removed
- **Demo Tests:** 5 files
- **Skipped Tests:** 1 file  
- **Duplicates:** ~25 files
- **Total Removed:** ~31 files

### Files Improved
- **Refactored Tests:** 6 files now work properly

### Verification Checklist
- [ ] All demo tests removed
- [ ] All skipped tests removed
- [ ] All duplicates removed
- [ ] All refactored tests working
- [ ] `pnpm test` passes
- [ ] No broken imports or references

### Success Metrics
- **File Reduction:** ~15% (31 files removed)
- **Test Execution:** Faster (fewer files to process)
- **Maintenance:** Simpler (no duplicates to maintain)
- **Quality:** Better (working tests instead of skipped)

## Next Phase
Proceed to **Phase 2: Consolidation** - Merge related tests and remove excessive stress testing.

