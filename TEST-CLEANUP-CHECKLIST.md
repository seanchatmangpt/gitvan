# GitVan Test Suite Cleanup - Implementation Checklist

## Quick Start Guide

This checklist provides step-by-step implementation of the GitVan test suite cleanup plan.

## Pre-Implementation Setup

### 1. Backup Current State
```bash
# Create backup branch
git checkout -b test-cleanup-backup
git add .
git commit -m "Backup before test cleanup"

# Return to main branch
git checkout main
```

### 2. Verify Current Test Count
```bash
# Count current test files
find . -name "*.test.mjs" -o -name "*.test.js" | grep -v node_modules | wc -l

# Run current tests
pnpm test
```

## Phase 1: Immediate Cleanup (Week 1)

### Day 1-2: Remove Demo Tests
```bash
# Remove demo/educational tests
rm tests/memfs-demo.test.mjs
rm tests/memfs-refactoring-demo.test.mjs
rm tests/memfs-refactoring-demonstration.test.mjs
rm tests/memfs-utils-demo.test.mjs
rm tests/proper-test-environment-demo.test.mjs

# Verify removal
ls tests/memfs-*demo* 2>/dev/null || echo "Demo tests removed"
```

### Day 2-3: Remove Skipped Tests
```bash
# Remove skipped tests
rm composables.test.mjs

# Verify removal
grep -r "describe.skip" . --include="*.test.mjs" || echo "No skipped tests found"
```

### Day 3-5: Remove Duplicates
```bash
# Remove duplicate tests (keep root versions, remove /tests/ duplicates)
rm tests/cli.test.mjs
rm tests/composables.test.mjs
rm tests/git-atomic.test.mjs
rm tests/git-comprehensive.test.mjs
rm tests/git-implementation.test.mjs
rm tests/git-environment.test.mjs
rm tests/template-simple.test.mjs
rm tests/template-comprehensive.test.mjs
rm tests/config-simple.test.mjs
rm tests/nunjucks-config.test.mjs
rm tests/useGit.context.test.mjs
rm tests/useGit.e2e.test.mjs
rm tests/useGit.integration.test.mjs
rm tests/useGit.mock-strategies.test.mjs
rm tests/useGit.unit.test.mjs
rm tests/useGit-comprehensive.test.mjs

# Remove root duplicates
rm useGit.context.test.mjs
rm useGit.e2e.test.mjs
rm useGit.integration.test.mjs
rm useGit.mock-strategies.test.mjs
rm useGit.unit.test.mjs
rm useGit-comprehensive.test.mjs
```

### Day 5-7: Replace with Refactored Versions
```bash
# Replace with working refactored versions
rm composables.test.mjs
mv tests/composables-refactored.test.mjs composables.test.mjs

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

### Phase 1 Verification
```bash
# Verify Phase 1 completion
pnpm test
echo "Phase 1 complete if tests pass"
```

## Phase 2: Consolidation (Week 2)

### Day 1-3: Consolidate Knowledge Hooks Tests
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

# Remove duplicates in /tests/ directory
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

# Consolidate JTBD tests
rm jtbd-hooks-comprehensive.test.mjs
rm jtbd-hooks-structure.test.mjs
rm jtbd-hooks-complete-implementation.test.mjs
rm tests/jtbd-hooks-structure.test.mjs
rm tests/jtbd-hooks-complete-implementation.test.mjs
```

### Day 3-4: Review Tracer System
```bash
# Check if tracer system is still active
grep -r "tracer" src/ --include="*.mjs" | wc -l

# If count = 0, remove tracer tests
if [ $(grep -r "tracer" src/ --include="*.mjs" | wc -l) -eq 0 ]; then
  rm tests/tracer/config.test.mjs
  rm tests/tracer/context.test.mjs
  rm tests/tracer/git.test.mjs
  rm tests/tracer/hooks.test.mjs
  rm tests/tracer/router.test.mjs
  rm tests/tracer/template.test.mjs
  echo "Tracer tests removed (system deprecated)"
else
  echo "Tracer tests kept (system active)"
fi
```

### Phase 2 Verification
```bash
# Verify Phase 2 completion
pnpm test
echo "Phase 2 complete if tests pass"
```

## Phase 3: Optimization (Week 3)

### Day 1-2: Improve Test Coverage
```bash
# Run coverage analysis
pnpm test --coverage

# Review coverage report
open coverage/index.html
```

### Day 2-3: Performance Optimization
```bash
# Measure current performance
time pnpm test

# Configure parallel execution
cat >> vitest.config.mjs << 'EOF'
export default {
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 2
      }
    }
  }
}
EOF
```

### Day 3-4: Test Quality Improvement
```bash
# Create test categories
mkdir -p tests/{unit,integration,e2e,performance}

# Move tests to categories
mv tests/cli.test.mjs tests/integration/
mv tests/git-atomic.test.mjs tests/unit/
mv tests/template-simple.test.mjs tests/unit/
mv tests/knowledge-hooks-end-to-end.test.mjs tests/e2e/
```

### Day 4-5: Documentation
```bash
# Create test documentation
cat > tests/README.md << 'EOF'
# GitVan Test Suite

## Test Categories
- Unit Tests: tests/unit/
- Integration Tests: tests/integration/
- E2E Tests: tests/e2e/
- Performance Tests: tests/performance/

## Running Tests
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:coverage
EOF
```

### Phase 3 Verification
```bash
# Verify Phase 3 completion
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:coverage
echo "Phase 3 complete if all test categories pass"
```

## Phase 4: Standardization (Week 4)

### Day 1-2: Standardize Test Structure
```bash
# Create standard test template
cat > tests/test-template.mjs << 'EOF'
/**
 * GitVan Test Template
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('FeatureName', () => {
  let testContext;

  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Core Functionality', () => {
    it('should handle basic functionality', () => {
      // Test
    });
  });
});
EOF
```

### Day 2-3: Standardize Configuration
```bash
# Create standard vitest configuration
cat > vitest.config.mjs << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.mjs'],
    exclude: ['node_modules/**', 'dist/**'],
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 2
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
EOF
```

### Day 3-4: Update Package Scripts
```bash
# Update package.json scripts
cat >> package.json << 'EOF'
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit/",
    "test:integration": "vitest run tests/integration/",
    "test:e2e": "vitest run tests/e2e/",
    "test:performance": "vitest run tests/performance/"
  }
}
EOF
```

### Day 4-5: Final Documentation
```bash
# Create comprehensive documentation
cat > tests/PATTERNS.md << 'EOF'
# GitVan Test Patterns

## Setup/Teardown Patterns
- fileSystemSetup() / fileSystemTeardown()
- gitRepoSetup()
- contextSetup()

## Error Handling Patterns
- testAsyncError()
- testSyncError()
- testGitError()

## Assertion Patterns
- assertFileExists()
- assertFileContent()
- assertGitStatus()
EOF
```

### Phase 4 Verification
```bash
# Final verification
pnpm test
pnpm test:coverage
time pnpm test
echo "Phase 4 complete if all tests pass and performance is good"
```

## Final Validation

### Complete Test Suite Validation
```bash
# Run all tests
pnpm test

# Check coverage
pnpm test:coverage

# Measure performance
time pnpm test

# Count final test files
find . -name "*.test.mjs" -o -name "*.test.js" | grep -v node_modules | wc -l

# Verify test organization
ls tests/
ls tests/unit/
ls tests/integration/
ls tests/e2e/
```

### Success Criteria
- [ ] All tests pass
- [ ] Test coverage >90%
- [ ] Test execution <2 minutes
- [ ] Test files reduced by 60%
- [ ] Tests organized into categories
- [ ] Documentation complete

## Rollback Plan

If anything goes wrong:
```bash
# Return to backup
git checkout test-cleanup-backup

# Or reset to specific commit
git reset --hard <commit-hash>
```

## Completion

Once all phases are complete:
```bash
# Commit final state
git add .
git commit -m "Complete test suite cleanup and standardization"

# Remove backup branch
git branch -D test-cleanup-backup
```

The GitVan test suite cleanup is now complete!

