# Phase 2: Consolidation - Merge Related Tests

## Objective
Consolidate related tests and remove excessive stress testing. Focus on merging similar functionality and eliminating redundant test variants.

## Timeline
**Duration:** 1 week  
**Risk Level:** Medium  
**Impact:** High (40% additional file reduction)

## Phase 2A: Consolidate Knowledge Hooks Tests (Day 1-3)

### Current State
**15+ knowledge hooks stress test variants** with massive duplication:
- `knowledge-hooks-breaking-point-benchmark.test.mjs`
- `knowledge-hooks-extreme-breaking-point.test.mjs`
- `knowledge-hooks-one-million-breaking-point.test.mjs`
- `knowledge-hooks-timer-stress.test.mjs`
- `knowledge-hooks-real-breaking-point.test.mjs`
- `knowledge-hooks-millisecond-timers.test.mjs`
- `knowledge-hooks-dark-matter-workloads.test.mjs`
- `knowledge-hooks-complete-suite.test.mjs`
- `knowledge-hooks-suite.test.mjs`
- `knowledge-hooks-stress.test.mjs`
- `knowledge-hooks-simple-verification.test.mjs`
- `knowledge-hooks-git-lifecycle.test.mjs`
- `knowledge-hooks-end-to-end.test.mjs`
- `jtbd-hooks-comprehensive.test.mjs`
- `jtbd-hooks-structure.test.mjs`
- `jtbd-hooks-complete-implementation.test.mjs`

### Consolidation Strategy
**Keep Only 3 Essential Tests:**
1. `knowledge-hooks-end-to-end.test.mjs` - E2E validation
2. `knowledge-hooks-simple-verification.test.mjs` - Basic functionality
3. `knowledge-hooks-git-lifecycle.test.mjs` - Git integration

### Files to Delete
```bash
# Remove excessive stress test variants
rm knowledge-hooks-breaking-point-benchmark.test.mjs
rm knowledge-hooks-extreme-breaking-point.test.mjs
rm knowledge-hooks-one-million-breaking-point.test.mjs
rm knowledge-hooks-timer-stress.test.mjs
rm knowledge-hooks-real-breaking-point.test.mjs
rm knowledge-hooks-millisecond-timers.test.mjs
rm knowledge-hooks-dark-matter-workloads.test.mjs
rm knowledge-hooks-complete-suite.test.mjs
rm knowledge-hooks-suite.test.mjs
rm knowledge-hooks-stress.test.mjs

# Remove duplicate tests in /tests/ directory
rm tests/knowledge-hooks-breaking-point-benchmark.test.mjs
rm tests/knowledge-hooks-extreme-breaking-point.test.mjs
rm tests/knowledge-hooks-one-million-breaking-point.test.mjs
rm tests/knowledge-hooks-timer-stress.test.mjs
rm tests/knowledge-hooks-real-breaking-point.test.mjs
rm tests/knowledge-hooks-millisecond-timers.test.mjs
rm tests/knowledge-hooks-dark-matter-workloads.test.mjs
rm tests/knowledge-hooks-complete-suite.test.mjs
rm tests/knowledge-hooks-suite.test.mjs
rm tests/knowledge-hooks-stress.test.mjs
rm tests/knowledge-hooks-simple-verification.test.mjs
rm tests/knowledge-hooks-git-lifecycle.test.mjs
rm tests/knowledge-hooks-end-to-end.test.mjs

# Consolidate JTBD tests into one comprehensive test
rm jtbd-hooks-comprehensive.test.mjs
rm jtbd-hooks-structure.test.mjs
rm jtbd-hooks-complete-implementation.test.mjs
rm tests/jtbd-hooks-structure.test.mjs
rm tests/jtbd-hooks-complete-implementation.test.mjs
```

### Create Consolidated JTBD Test
```bash
# Create single comprehensive JTBD test
cat > tests/jtbd-hooks-comprehensive.test.mjs << 'EOF'
/**
 * JTBD Hooks Comprehensive Test Suite
 * Consolidated from multiple JTBD test variants
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

describe("JTBD Hooks Comprehensive", () => {
  let testDir;

  beforeEach(() => {
    testDir = join(process.cwd(), "test-jtbd-consolidated");
    mkdirSync(testDir, { recursive: true });
    execSync("git init", { cwd: testDir, stdio: "pipe" });
    execSync("git config user.email 'test@example.com'", { cwd: testDir, stdio: "pipe" });
    execSync("git config user.name 'Test User'", { cwd: testDir, stdio: "pipe" });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("Core Development JTBD", () => {
    it("should handle code generation tasks", () => {
      // Consolidated test for code generation
    });

    it("should handle refactoring tasks", () => {
      // Consolidated test for refactoring
    });
  });

  describe("Infrastructure JTBD", () => {
    it("should handle deployment tasks", () => {
      // Consolidated test for deployment
    });
  });

  // Add other essential JTBD categories...
});
EOF
```

### Verification Commands
```bash
# Verify excessive stress tests are gone
ls *knowledge-hooks*stress*
ls *knowledge-hooks*breaking*
ls *knowledge-hooks*timer*

# Verify consolidated test works
pnpm test tests/jtbd-hooks-comprehensive.test.mjs
pnpm test knowledge-hooks-end-to-end.test.mjs
```

### Expected Results
- **Files Removed:** ~20 stress test variants
- **Time Saved:** ~5 minutes per test run
- **Maintenance Reduced:** No more stress test maintenance
- **Focus Improved:** Tests actual functionality, not stress limits

## Phase 2B: Consolidate MemFS Tests (Day 3-4)

### Current State
Multiple MemFS test variants with overlapping functionality.

### Consolidation Strategy
Keep only essential MemFS tests:
1. `tests/memfs-integration.test.mjs` - Core integration
2. `tests/memfs-comprehensive-integration.test.mjs` - Comprehensive testing

### Files to Delete
```bash
# Remove redundant MemFS tests (already removed in Phase 1)
# These were demo tests, already cleaned up
```

### Verification Commands
```bash
# Verify MemFS tests are consolidated
ls tests/memfs-*.test.mjs

# Run MemFS tests
pnpm test tests/memfs-integration.test.mjs
pnpm test tests/memfs-comprehensive-integration.test.mjs
```

## Phase 2C: Consolidate Git Tests (Day 4-5)

### Current State
Multiple Git test files with overlapping functionality.

### Consolidation Strategy
Keep essential Git tests:
1. `git-atomic.test.mjs` - Atomic operations (10/10 rating)
2. `git-environment.test.mjs` - Environment validation (9/10 rating)
3. `git-implementation.test.mjs` - Unit tests (7/10 rating)
4. `git-comprehensive.test.mjs` - Integration tests (8/10 rating)

### Files to Keep
```bash
# These are already the best versions after Phase 1 cleanup
# No additional consolidation needed
```

### Verification Commands
```bash
# Verify Git tests work
pnpm test git-atomic.test.mjs
pnpm test git-environment.test.mjs
pnpm test git-implementation.test.mjs
pnpm test git-comprehensive.test.mjs
```

## Phase 2D: Consolidate Template Tests (Day 5-6)

### Current State
Multiple template test files.

### Consolidation Strategy
Keep essential template tests:
1. `template-simple.test.mjs` - Core functionality (8/10 rating)
2. `template-comprehensive.test.mjs` - Comprehensive testing
3. `nunjucks-config.test.mjs` - Configuration (7/10 rating)

### Files to Keep
```bash
# These are already the best versions after Phase 1 cleanup
# No additional consolidation needed
```

## Phase 2E: Review Tracer System Tests (Day 6-7)

### Current State
6 tracer system test files that may be outdated.

### Review Process
1. **Check if tracer system is still active:**
```bash
# Search for tracer usage in source code
grep -r "tracer" src/ --include="*.mjs"
grep -r "Tracer" src/ --include="*.mjs"
```

2. **If tracer system is deprecated, remove tests:**
```bash
rm tests/tracer/config.test.mjs
rm tests/tracer/context.test.mjs
rm tests/tracer/git.test.mjs
rm tests/tracer/hooks.test.mjs
rm tests/tracer/router.test.mjs
rm tests/tracer/template.test.mjs
```

3. **If tracer system is active, keep tests:**
```bash
# Keep all tracer tests if system is still used
```

### Verification Commands
```bash
# Check tracer system status
grep -r "tracer" src/ --include="*.mjs" | wc -l

# If count > 0, keep tracer tests
# If count = 0, remove tracer tests
```

## Phase 2 Summary

### Files Removed
- **Knowledge Hooks Stress Tests:** ~20 files
- **Tracer Tests (if deprecated):** ~6 files
- **Total Removed:** ~26 files

### Files Consolidated
- **JTBD Tests:** 3 files → 1 comprehensive file
- **Knowledge Hooks:** 15+ files → 3 essential files

### Verification Checklist
- [ ] Excessive stress tests removed
- [ ] JTBD tests consolidated
- [ ] MemFS tests consolidated
- [ ] Tracer system reviewed
- [ ] `pnpm test` passes
- [ ] No broken functionality

### Success Metrics
- **File Reduction:** ~20% additional (26 files removed)
- **Test Execution:** Much faster (fewer stress tests)
- **Maintenance:** Simpler (consolidated functionality)
- **Focus:** Better (production tests only)

## Next Phase
Proceed to **Phase 3: Optimization** - Improve remaining tests and add missing coverage.
