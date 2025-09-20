# Phase 4: Standardization - Create Consistent Patterns

## Objective
Standardize the remaining test suite with consistent patterns, naming conventions, and best practices. Finalize the test suite for long-term maintainability.

## Timeline
**Duration:** 1 week  
**Risk Level:** Low  
**Impact:** High (Long-term maintainability)

## Phase 4A: Standardize Test Structure (Day 1-2)

### Current State Analysis
After Phases 1-3, we have a clean, organized test suite. Now standardize the structure.

### Standardization Tasks

#### 1. Create Standard Test Template
```bash
cat > tests/test-template.mjs << 'EOF'
/**
 * GitVan Test Template
 * Standard structure for all GitVan tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('FeatureName', () => {
  let testContext;

  beforeEach(() => {
    // Setup test context
    testContext = {
      // Test data
    };
  });

  afterEach(() => {
    // Cleanup test context
  });

  describe('Core Functionality', () => {
    it('should handle basic functionality', () => {
      // Test basic functionality
      expect(true).toBe(true);
    });

    it('should handle error cases', () => {
      // Test error handling
      expect(() => {
        throw new Error('Test error');
      }).toThrow('Test error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle edge case', () => {
      // Test edge case
      expect(true).toBe(true);
    });
  });
});
EOF
```

#### 2. Standardize Test Naming
```bash
# Rename tests to follow standard convention
# Format: feature-name.test.mjs

# Examples:
# cli.test.mjs (already correct)
# git-atomic.test.mjs (already correct)
# template-simple.test.mjs (already correct)
# knowledge-hooks-end-to-end.test.mjs (already correct)
```

#### 3. Standardize Test Organization
```bash
# Ensure all tests follow standard structure:
# 1. Imports
# 2. Test setup/teardown
# 3. Core functionality tests
# 4. Error handling tests
# 5. Edge case tests
```

### Verification Commands
```bash
# Verify test structure consistency
grep -r "describe(" tests/ --include="*.test.mjs" | wc -l
grep -r "beforeEach" tests/ --include="*.test.mjs" | wc -l
grep -r "afterEach" tests/ --include="*.test.mjs" | wc -l
```

## Phase 4B: Standardize Test Patterns (Day 2-3)

### Current State Analysis
Standardize common test patterns across all test files.

### Pattern Standardization Tasks

#### 1. Standardize Setup/Teardown Patterns
```bash
# Create standard setup/teardown patterns
cat > tests/patterns/setup-teardown.mjs << 'EOF'
/**
 * Standard Setup/Teardown Patterns
 */

// Pattern 1: File System Tests
export const fileSystemSetup = () => {
  const testDir = join(process.cwd(), `test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  return testDir;
};

export const fileSystemTeardown = (testDir) => {
  rmSync(testDir, { recursive: true, force: true });
};

// Pattern 2: Git Repository Tests
export const gitRepoSetup = (testDir) => {
  execSync('git init', { cwd: testDir, stdio: 'pipe' });
  execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });
};

// Pattern 3: Context Tests
export const contextSetup = () => ({
  cwd: '/test/repo',
  env: {
    TZ: 'UTC',
    LANG: 'C',
    NODE_ENV: 'test'
  }
});
EOF
```

#### 2. Standardize Error Handling Patterns
```bash
# Create standard error handling patterns
cat > tests/patterns/error-handling.mjs << 'EOF'
/**
 * Standard Error Handling Patterns
 */

// Pattern 1: Async Error Handling
export const testAsyncError = async (fn, expectedError) => {
  await expect(fn()).rejects.toThrow(expectedError);
};

// Pattern 2: Sync Error Handling
export const testSyncError = (fn, expectedError) => {
  expect(fn).toThrow(expectedError);
};

// Pattern 3: Git Error Handling
export const testGitError = async (gitOperation, expectedError) => {
  await expect(gitOperation()).rejects.toThrow(expectedError);
};
EOF
```

#### 3. Standardize Assertion Patterns
```bash
# Create standard assertion patterns
cat > tests/patterns/assertions.mjs << 'EOF'
/**
 * Standard Assertion Patterns
 */

// Pattern 1: File Existence
export const assertFileExists = (filePath) => {
  expect(existsSync(filePath)).toBe(true);
};

// Pattern 2: File Content
export const assertFileContent = (filePath, expectedContent) => {
  const content = readFileSync(filePath, 'utf8');
  expect(content).toContain(expectedContent);
};

// Pattern 3: Git Status
export const assertGitStatus = (status, expectedStatus) => {
  expect(status).toContain(expectedStatus);
};
EOF
```

### Verification Commands
```bash
# Verify pattern usage
grep -r "testAsyncError" tests/ --include="*.test.mjs"
grep -r "testSyncError" tests/ --include="*.test.mjs"
grep -r "assertFileExists" tests/ --include="*.test.mjs"
```

## Phase 4C: Standardize Test Configuration (Day 3-4)

### Current State Analysis
Standardize test configuration and environment setup.

### Configuration Standardization Tasks

#### 1. Standardize Vitest Configuration
```bash
# Create standard vitest configuration
cat > vitest.config.mjs << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test patterns
    include: ['**/*.test.mjs'],
    exclude: ['node_modules/**', 'dist/**'],
    
    // Performance settings
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 2
      }
    },
    
    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.mjs',
        '**/*.config.mjs'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Timeout settings
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Reporter settings
    reporter: ['verbose', 'html'],
    outputFile: {
      html: 'coverage/index.html'
    }
  }
});
EOF
```

#### 2. Standardize Test Environment
```bash
# Create standard test environment setup
cat > tests/setup/test-environment.mjs << 'EOF'
/**
 * Standard Test Environment Setup
 */

// Set standard environment variables
process.env.TZ = 'UTC';
process.env.LANG = 'C';
process.env.NODE_ENV = 'test';

// Global test utilities
global.testUtils = {
  createTempDir: () => {
    const tempDir = join(process.cwd(), `test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    return tempDir;
  },
  
  cleanupTempDir: (tempDir) => {
    rmSync(tempDir, { recursive: true, force: true });
  },
  
  createGitRepo: (dir) => {
    execSync('git init', { cwd: dir, stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: dir, stdio: 'pipe' });
  }
};
EOF
```

#### 3. Standardize Test Scripts
```bash
# Update package.json with standard test scripts
cat >> package.json << 'EOF'
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit/",
    "test:integration": "vitest run tests/integration/",
    "test:e2e": "vitest run tests/e2e/",
    "test:performance": "vitest run tests/performance/",
    "test:ci": "vitest run --coverage --reporter=json --outputFile=test-results.json"
  }
}
EOF
```

### Verification Commands
```bash
# Verify configuration works
pnpm test --version
pnpm test:coverage
pnpm test:unit
pnpm test:integration
```

## Phase 4D: Create Test Documentation (Day 4-5)

### Current State Analysis
Create comprehensive documentation for the standardized test suite.

### Documentation Tasks

#### 1. Create Test Suite Documentation
```bash
cat > tests/README.md << 'EOF'
# GitVan Test Suite

## Overview
This directory contains the GitVan test suite, organized into categories and following standardized patterns.

## Test Categories

### Unit Tests (`tests/unit/`)
- **Purpose:** Test individual functions and components
- **Characteristics:** Fast, isolated, mocked dependencies
- **Examples:** `git-atomic.test.mjs`, `template-simple.test.mjs`

### Integration Tests (`tests/integration/`)
- **Purpose:** Test component interactions
- **Characteristics:** Real dependencies, API boundaries
- **Examples:** `cli.test.mjs`, `composables.test.mjs`

### End-to-End Tests (`tests/e2e/`)
- **Purpose:** Test complete workflows
- **Characteristics:** Real Git operations, user scenarios
- **Examples:** `knowledge-hooks-end-to-end.test.mjs`

### Performance Tests (`tests/performance/`)
- **Purpose:** Test performance characteristics
- **Characteristics:** Benchmarks, resource monitoring
- **Examples:** `git-benchmarks.test.mjs`

## Test Patterns

### Standard Test Structure
```javascript
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
```

### Common Patterns
- **File System Tests:** Use `fileSystemSetup()` and `fileSystemTeardown()`
- **Git Repository Tests:** Use `gitRepoSetup()`
- **Error Handling:** Use `testAsyncError()` and `testSyncError()`
- **Assertions:** Use `assertFileExists()` and `assertFileContent()`

## Running Tests

### Basic Commands
```bash
# Run all tests
pnpm test

# Run specific category
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### CI Commands
```bash
# Run tests for CI
pnpm test:ci
```

## Test Guidelines

### 1. Test Structure
- One test file per feature
- Clear, descriptive test names
- Proper setup/teardown
- Group related tests with `describe`

### 2. Test Quality
- Test both success and error cases
- Use deterministic data
- Avoid flaky tests
- Keep tests fast

### 3. Test Coverage
- Aim for >90% coverage
- Test edge cases
- Test error handling
- Test performance characteristics

### 4. Test Maintenance
- Keep tests up to date
- Remove obsolete tests
- Refactor when needed
- Document complex tests

## Troubleshooting

### Common Issues
1. **Tests failing:** Check environment setup
2. **Slow tests:** Optimize test data and operations
3. **Flaky tests:** Use deterministic data
4. **Coverage issues:** Add missing tests

### Getting Help
- Check test documentation
- Review existing test patterns
- Ask team members
- Check CI logs
EOF
```

#### 2. Create Test Patterns Documentation
```bash
cat > tests/PATTERNS.md << 'EOF'
# GitVan Test Patterns

## Setup/Teardown Patterns

### File System Tests
```javascript
import { fileSystemSetup, fileSystemTeardown } from './patterns/setup-teardown.mjs';

describe('File Operations', () => {
  let testDir;

  beforeEach(() => {
    testDir = fileSystemSetup();
  });

  afterEach(() => {
    fileSystemTeardown(testDir);
  });
});
```

### Git Repository Tests
```javascript
import { gitRepoSetup } from './patterns/setup-teardown.mjs';

describe('Git Operations', () => {
  let testDir;

  beforeEach(() => {
    testDir = fileSystemSetup();
    gitRepoSetup(testDir);
  });
});
```

## Error Handling Patterns

### Async Error Handling
```javascript
import { testAsyncError } from './patterns/error-handling.mjs';

it('should handle async errors', async () => {
  await testAsyncError(
    () => someAsyncOperation(),
    'Expected error message'
  );
});
```

### Sync Error Handling
```javascript
import { testSyncError } from './patterns/error-handling.mjs';

it('should handle sync errors', () => {
  testSyncError(
    () => someSyncOperation(),
    'Expected error message'
  );
});
```

## Assertion Patterns

### File Assertions
```javascript
import { assertFileExists, assertFileContent } from './patterns/assertions.mjs';

it('should create file with content', () => {
  const filePath = 'test.txt';
  writeFileSync(filePath, 'test content');
  
  assertFileExists(filePath);
  assertFileContent(filePath, 'test content');
});
```

### Git Assertions
```javascript
import { assertGitStatus } from './patterns/assertions.mjs';

it('should show git status', async () => {
  const status = await git.status();
  assertGitStatus(status, 'nothing to commit');
});
```
EOF
```

### Verification Commands
```bash
# Verify documentation exists
ls tests/README.md
ls tests/PATTERNS.md

# Verify documentation is complete
wc -l tests/README.md
wc -l tests/PATTERNS.md
```

## Phase 4E: Final Validation (Day 5-7)

### Current State Analysis
Final validation of the standardized test suite.

### Validation Tasks

#### 1. Test Suite Validation
```bash
# Run complete test suite
pnpm test

# Check test coverage
pnpm test:coverage

# Verify test organization
ls tests/
ls tests/unit/
ls tests/integration/
ls tests/e2e/
```

#### 2. Performance Validation
```bash
# Measure test execution time
time pnpm test

# Check memory usage
node --max-old-space-size=4096 node_modules/.bin/vitest run
```

#### 3. Quality Validation
```bash
# Check test structure consistency
grep -r "describe(" tests/ --include="*.test.mjs" | wc -l
grep -r "beforeEach" tests/ --include="*.test.mjs" | wc -l
grep -r "afterEach" tests/ --include="*.test.mjs" | wc -l

# Check test naming consistency
find tests/ -name "*.test.mjs" | sort
```

### Final Checklist
- [ ] All tests pass
- [ ] Test coverage >90%
- [ ] Test execution <2 minutes
- [ ] Tests organized into categories
- [ ] Standard patterns implemented
- [ ] Documentation complete
- [ ] Configuration standardized
- [ ] Performance optimized

## Phase 4 Summary

### Standardization Achieved
- **Test Structure:** Consistent across all tests
- **Test Patterns:** Standardized setup/teardown and error handling
- **Test Configuration:** Standardized vitest configuration
- **Test Documentation:** Complete documentation and guidelines
- **Test Organization:** Clear categories and naming

### Final Results
- **Total Test Files:** ~80-100 (down from 200+)
- **Test Coverage:** >90%
- **Test Execution Time:** <2 minutes
- **Test Organization:** Clear categories
- **Test Quality:** Consistent and maintainable
- **Test Documentation:** Complete

### Success Metrics
- **File Reduction:** 60% fewer test files
- **Coverage:** >90% code coverage
- **Performance:** <2 minutes total execution
- **Organization:** Clear test categories
- **Quality:** Consistent test structure
- **Maintainability:** Standardized patterns

## Project Completion

The GitVan test suite cleanup is now complete. The test suite has been:
1. **Cleaned** - Removed waste and duplicates
2. **Consolidated** - Merged related functionality
3. **Optimized** - Improved coverage and performance
4. **Standardized** - Consistent patterns and documentation

The test suite is now maintainable, fast, and comprehensive.

