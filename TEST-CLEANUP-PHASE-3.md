# Phase 3: Optimization - Improve Remaining Tests

## Objective
Optimize the remaining test files for better coverage, performance, and maintainability. Focus on improving test quality and adding missing coverage.

## Timeline
**Duration:** 1 week  
**Risk Level:** Medium  
**Impact:** Medium (Quality improvement)

## Phase 3A: Improve Test Coverage (Day 1-2)

### Current State Analysis
After Phases 1-2, we have ~80-100 focused test files. Now we need to ensure comprehensive coverage.

### Coverage Analysis Commands
```bash
# Run test coverage analysis
pnpm test --coverage

# Identify uncovered areas
pnpm test --coverage --reporter=html
```

### Areas Needing Coverage
1. **CLI Commands** - Ensure all CLI commands are tested
2. **Composables** - Ensure all composables have comprehensive tests
3. **Git Operations** - Ensure all Git operations are covered
4. **Template System** - Ensure all template functionality is tested
5. **Configuration** - Ensure all configuration scenarios are tested

### Coverage Improvement Tasks

#### 1. CLI Coverage Enhancement
```bash
# Review CLI test coverage
pnpm test cli.test.mjs --coverage

# Add missing CLI command tests
# - gitvan init
# - gitvan status
# - gitvan config
# - gitvan help (all subcommands)
```

#### 2. Composables Coverage Enhancement
```bash
# Review composables test coverage
pnpm test composables.test.mjs --coverage

# Add missing composable tests
# - useExec edge cases
# - useTemplate error handling
# - useGit error scenarios
```

#### 3. Git Operations Coverage Enhancement
```bash
# Review Git test coverage
pnpm test git-atomic.test.mjs --coverage
pnpm test git-environment.test.mjs --coverage

# Add missing Git operation tests
# - Error handling scenarios
# - Edge cases
# - Performance scenarios
```

### Verification Commands
```bash
# Verify improved coverage
pnpm test --coverage

# Check coverage reports
open coverage/index.html
```

## Phase 3B: Performance Optimization (Day 2-3)

### Current State Analysis
Test execution time after cleanup should be significantly faster.

### Performance Measurement
```bash
# Measure current test execution time
time pnpm test

# Measure individual test file execution times
for file in $(find . -name "*.test.mjs" | head -10); do
  echo "Testing $file"
  time pnpm test "$file"
done
```

### Performance Optimization Tasks

#### 1. Parallel Test Execution
```bash
# Configure parallel test execution
# Update vitest.config.mjs
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

#### 2. Test File Optimization
- **Remove slow tests** - Identify and optimize slow-running tests
- **Mock external dependencies** - Reduce I/O operations
- **Use test fixtures** - Pre-create test data

#### 3. Memory Optimization
```bash
# Monitor memory usage during tests
node --max-old-space-size=4096 node_modules/.bin/vitest run

# Optimize memory usage
# - Clean up test data properly
# - Use smaller test datasets
# - Avoid memory leaks in tests
```

### Verification Commands
```bash
# Verify performance improvement
time pnpm test

# Check memory usage
node --max-old-space-size=4096 node_modules/.bin/vitest run --reporter=verbose
```

## Phase 3C: Test Quality Improvement (Day 3-4)

### Current State Analysis
Focus on improving the quality of remaining tests.

### Quality Improvement Tasks

#### 1. Standardize Test Structure
Create standard test template:
```bash
cat > tests/test-template.mjs << 'EOF'
/**
 * Test Template for GitVan Tests
 * Standard structure for all tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Name', () => {
  let testData;

  beforeEach(() => {
    // Setup test data
    testData = {
      // Test data here
    };
  });

  afterEach(() => {
    // Cleanup test data
  });

  describe('Core Functionality', () => {
    it('should handle basic functionality', () => {
      // Test basic functionality
    });

    it('should handle error cases', () => {
      // Test error handling
    });
  });

  describe('Edge Cases', () => {
    it('should handle edge case 1', () => {
      // Test edge case
    });
  });
});
EOF
```

#### 2. Improve Error Handling Tests
```bash
# Add comprehensive error handling tests to each test file
# - Invalid input handling
# - Network error handling
# - File system error handling
# - Git error handling
```

#### 3. Add Integration Tests
```bash
# Create integration test suite
mkdir -p tests/integration

cat > tests/integration/cli-integration.test.mjs << 'EOF'
/**
 * CLI Integration Tests
 * Tests CLI commands with real Git operations
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('CLI Integration', () => {
  it('should handle complete workflow', () => {
    // Test complete CLI workflow
  });
});
EOF
```

### Verification Commands
```bash
# Verify test quality improvements
pnpm test --reporter=verbose

# Check test structure consistency
grep -r "describe(" tests/ --include="*.test.mjs" | wc -l
```

## Phase 3D: Documentation and Organization (Day 4-5)

### Current State Analysis
Organize remaining tests into clear categories.

### Organization Tasks

#### 1. Create Test Categories
```bash
# Organize tests into categories
mkdir -p tests/{unit,integration,e2e,performance}

# Move tests to appropriate categories
mv tests/cli.test.mjs tests/integration/
mv tests/git-atomic.test.mjs tests/unit/
mv tests/template-simple.test.mjs tests/unit/
mv tests/knowledge-hooks-end-to-end.test.mjs tests/e2e/
```

#### 2. Create Test Documentation
```bash
cat > tests/README.md << 'EOF'
# GitVan Test Suite

## Test Categories

### Unit Tests (`tests/unit/`)
- Test individual functions and components
- Fast, isolated tests
- Mock external dependencies

### Integration Tests (`tests/integration/`)
- Test component interactions
- Use real dependencies where possible
- Test API boundaries

### End-to-End Tests (`tests/e2e/`)
- Test complete workflows
- Use real Git operations
- Test user scenarios

### Performance Tests (`tests/performance/`)
- Test performance characteristics
- Benchmark critical operations
- Monitor resource usage

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific category
pnpm test tests/unit/
pnpm test tests/integration/
pnpm test tests/e2e/

# Run with coverage
pnpm test --coverage
```

## Test Guidelines

1. **One test file per feature**
2. **Clear test descriptions**
3. **Proper setup/teardown**
4. **Comprehensive error handling**
5. **Deterministic results**
EOF
```

#### 3. Update Test Scripts
```bash
# Update package.json test scripts
cat >> package.json << 'EOF'
{
  "scripts": {
    "test:unit": "vitest run tests/unit/",
    "test:integration": "vitest run tests/integration/",
    "test:e2e": "vitest run tests/e2e/",
    "test:performance": "vitest run tests/performance/",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
EOF
```

### Verification Commands
```bash
# Verify test organization
ls tests/
ls tests/unit/
ls tests/integration/
ls tests/e2e/

# Verify test scripts work
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

## Phase 3E: Add Missing Tests (Day 5-7)

### Current State Analysis
Identify and add any missing critical tests.

### Missing Test Identification
```bash
# Identify untested source files
find src/ -name "*.mjs" | while read file; do
  testfile="tests/$(basename "$file" .mjs).test.mjs"
  if [ ! -f "$testfile" ]; then
    echo "Missing test for: $file"
  fi
done
```

### Add Missing Tests
```bash
# Create tests for missing functionality
# - Error handling tests
# - Edge case tests
# - Performance tests
# - Security tests
```

### Verification Commands
```bash
# Verify all source files have tests
find src/ -name "*.mjs" | while read file; do
  testfile="tests/$(basename "$file" .mjs).test.mjs"
  if [ ! -f "$testfile" ]; then
    echo "WARNING: Missing test for $file"
  fi
done
```

## Phase 3 Summary

### Improvements Made
- **Coverage Enhanced:** Added missing test coverage
- **Performance Optimized:** Faster test execution
- **Quality Improved:** Better test structure and error handling
- **Organization Enhanced:** Clear test categories
- **Documentation Added:** Test guidelines and documentation

### Verification Checklist
- [ ] Test coverage improved
- [ ] Performance optimized
- [ ] Test quality enhanced
- [ ] Tests organized into categories
- [ ] Documentation created
- [ ] Missing tests added
- [ ] `pnpm test` passes
- [ ] All test scripts work

### Success Metrics
- **Coverage:** >90% code coverage
- **Performance:** <2 minutes total test execution
- **Organization:** Clear test categories
- **Quality:** Consistent test structure
- **Documentation:** Complete test guidelines

## Next Phase
Proceed to **Phase 4: Standardization** - Create consistent patterns and finalize the test suite.
