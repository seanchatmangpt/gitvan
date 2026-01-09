# GitVan Testing Guide

**Goal**: Write reliable, maintainable tests for GitVan workflows.

This guide covers testing patterns, fixtures, strategies, and best practices for building confidence in your Git automation.

---

## Table of Contents

1. [Testing Fundamentals](#testing-fundamentals)
2. [Unit Testing Composables](#unit-testing-composables)
3. [Integration Testing](#integration-testing)
4. [Test Fixtures and Setup](#test-fixtures-and-setup)
5. [Mocking Strategies](#mocking-strategies)
6. [Coverage Requirements](#coverage-requirements)
7. [Common Patterns](#common-patterns)
8. [Debugging Tests](#debugging-tests)

---

## Testing Fundamentals

### Test Framework

GitVan uses **Vitest** for fast, modern testing:

```bash
# Run all tests
npm test

# Run specific test
npm test tests/composables/git.test.mjs

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Coverage Target

**Minimum 80% coverage** across:
- **Branches**: All if/else paths
- **Functions**: All functions called
- **Lines**: All lines executed
- **Statements**: All statements executed

```bash
# Generate coverage report
npm test -- --coverage --coverage.reporter=html

# View report
open coverage/index.html
```

---

## Unit Testing Composables

### Basic Pattern

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withGitVan, useGit } from 'gitvan';
import { createTestContext } from 'gitvan/test-environment';

describe('useGit composable', () => {
  let context;

  beforeEach(() => {
    // Setup before each test
    context = createTestContext();
  });

  afterEach(async () => {
    // Cleanup after each test
    if (context?.tempDir) {
      await context.cleanup();
    }
  });

  it('should get status', async () => {
    await withGitVan(context, async () => {
      const git = useGit();
      const status = await git.status();

      expect(status).toBeDefined();
      expect(status.branch).toBeDefined();
      expect(typeof status.modified).toBe('object');
    });
  });
});
```

### Testing Async Operations

**✓ CORRECT - Using await and withGitVan:**

```javascript
it('should commit changes', async () => {
  await withGitVan(context, async () => {
    const git = useGit();
    const fs = useFileSystem();

    // Make changes
    await fs.write('README.md', 'content');

    // Stage changes
    await git.add('README.md');

    // Commit
    const sha = await git.commit('test: initial commit');

    expect(sha).toMatch(/^[a-f0-9]{40}$/);
  });
});
```

**✗ WRONG - Missing await or context:**

```javascript
// ✗ Missing await
it('should commit', async () => {
  await withGitVan(context, async () => {
    const git = useGit();
    const sha = git.commit('test');  // Missing await!
    expect(sha).toBeDefined();
  });
});

// ✗ Missing withGitVan
it('should work', async () => {
  const git = useGit();  // No context!
  const status = await git.status();
});
```

### Testing Error Cases

```javascript
describe('Error handling', () => {
  it('should reject invalid branch names', async () => {
    await withGitVan(context, async () => {
      const git = useGit();

      // Expect error
      expect(async () => {
        await git.branch('invalid..name');
      }).rejects.toThrow('Invalid branch name');
    });
  });

  it('should fail on non-existent repo', async () => {
    const badContext = {
      repo: '/non/existent/path',
      config: {}
    };

    expect(async () => {
      await withGitVan(badContext, async () => {
        const git = useGit();
        await git.status();
      });
    }).rejects.toThrow('not a git repository');
  });
});
```

---

## Integration Testing

### End-to-End Workflow Testing

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { withGitVan, useGit, useTemplate, useJob } from 'gitvan';
import { createTestRepo } from 'gitvan/test-environment';

describe('Complete Workflow', () => {
  let context;

  beforeEach(async () => {
    context = await createTestRepo();
  });

  it('should execute full workflow', async () => {
    await withGitVan(context, async () => {
      const git = useGit();
      const template = useTemplate();
      const job = useJob();

      // 1. Create feature branch
      await git.branch('feature/workflow-test');
      await git.checkout('feature/workflow-test');

      // 2. Render template
      const content = await template.render('readme.njk', {
        name: 'test-project'
      });

      // 3. Write file
      const fs = useFileSystem();
      await fs.write('README.md', content);

      // 4. Execute job
      await git.add('README.md');
      const jobResult = await job.execute('validate', {
        files: ['README.md']
      });

      // 5. Commit
      const sha = await git.commit('feat: add workflow');

      // Verify
      expect(sha).toBeDefined();
      expect(jobResult.success).toBe(true);
    });
  });
});
```

### Testing Hooks

```javascript
describe('Hook Integration', () => {
  let context;

  beforeEach(async () => {
    context = await createTestRepo();

    // Setup hooks
    await context.setupHook('pre-commit', {
      pathChanged: '**/*.js',
      job: 'lint'
    });
  });

  it('should trigger hook on commit', async () => {
    await withGitVan(context, async () => {
      const git = useGit();
      const fs = useFileSystem();

      // Make change
      await fs.write('src/index.js', 'console.log("test")');
      await git.add('src/index.js');

      // Commit should trigger hook
      const sha = await git.commit('feat: test hook');

      // Verify hook ran
      const hookLog = await context.getHookLog();
      expect(hookLog).toContainEqual(
        expect.objectContaining({
          hook: 'pre-commit',
          status: 'success'
        })
      );
    });
  });
});
```

---

## Test Fixtures and Setup

### Creating Test Repository

```javascript
import { createTestRepo, createTestContext } from 'gitvan/test-environment';

describe('Git operations', () => {
  let context;

  beforeEach(async () => {
    // Create isolated test repository
    context = await createTestRepo({
      name: 'test-repo',
      // Optional: initial files
      files: {
        'README.md': '# Test Project',
        'package.json': '{}'
      }
    });
  });

  afterEach(async () => {
    // Cleanup
    await context.cleanup();
  });

  // Tests here
});
```

### Fixture Files

**Create reusable test files:**

```javascript
// tests/fixtures/test-workflows.mjs
export const simpleWorkflow = `
@prefix : <http://example.org#> .
@prefix op: <http://example.org/op#> .

:SimpleWorkflow a op:Workflow ;
  op:hasStep [
    a op:CLIStep ;
    op:command "echo 'test'"
  ] .
`;

export const errorWorkflow = `
@prefix : <http://example.org#> .
@prefix op: <http://example.org/op#> .

:ErrorWorkflow a op:Workflow ;
  op:hasStep [
    a op:CLIStep ;
    op:command "exit 1"
  ] .
`;
```

**Use fixtures in tests:**

```javascript
import { simpleWorkflow, errorWorkflow } from '../fixtures/test-workflows.mjs';

it('should execute workflow', async () => {
  await context.createWorkflow('simple.ttl', simpleWorkflow);

  const result = await workflowEngine.execute('simple.ttl');
  expect(result.success).toBe(true);
});

it('should handle workflow errors', async () => {
  await context.createWorkflow('error.ttl', errorWorkflow);

  const result = await workflowEngine.execute('error.ttl');
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
});
```

### Environment Setup

```javascript
beforeEach(() => {
  // Set deterministic environment
  process.env.TZ = 'UTC';
  process.env.LANG = 'C';
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Clean up environment
  delete process.env.TEST_FLAG;
});
```

---

## Mocking Strategies

### Mocking External Services

```javascript
import { vi } from 'vitest';

describe('With mocks', () => {
  it('should use mocked fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true })
    });

    // Your code using fetch
    const response = await fetch('https://api.example.com');
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com');
  });
});
```

### Mocking File System

```javascript
import { vol } from 'memfs';

describe('With MemFS', () => {
  it('should work with virtual file system', async () => {
    // Create virtual files
    vol.fromJSON({
      '/repo/file.txt': 'content'
    });

    // Use virtual filesystem
    const content = fs.readFileSync('/repo/file.txt', 'utf-8');
    expect(content).toBe('content');

    // Cleanup
    vol.reset();
  });
});
```

### Mocking Git Commands

```javascript
import { vi } from 'vitest';

describe('With git mock', () => {
  it('should handle git mock', async () => {
    const gitMock = vi.fn().mockResolvedValue({
      branch: 'main',
      modified: []
    });

    // Replace git with mock
    const originalGit = globalThis.git;
    globalThis.git = gitMock;

    try {
      const result = await gitMock();
      expect(result.branch).toBe('main');
    } finally {
      globalThis.git = originalGit;
    }
  });
});
```

---

## Coverage Requirements

### Measuring Coverage

```bash
# Generate coverage report
npm test -- --coverage

# HTML report
npm test -- --coverage --coverage.reporter=html
open coverage/index.html

# View coverage summary
npm test -- --coverage --coverage.reporter=text
```

### Coverage Thresholds

```javascript
// vitest.config.mjs
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,

      // Minimum coverage requirements
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,

      // Exclude certain files
      exclude: [
        'node_modules/',
        'dist/',
        'tests/'
      ]
    }
  }
};
```

### Improving Coverage

**Find untested code:**
```bash
npm test -- --coverage | grep "^|"
```

**Test edge cases:**
```javascript
describe('Edge cases', () => {
  it('should handle empty input', async () => {
    const result = await processInput('');
    expect(result).toBe(null);
  });

  it('should handle null input', async () => {
    const result = await processInput(null);
    expect(result).toBe(null);
  });

  it('should handle very large input', async () => {
    const largeInput = 'x'.repeat(1000000);
    const result = await processInput(largeInput);
    expect(result).toBeDefined();
  });
});
```

---

## Common Patterns

### Testing Deterministic Operations

```javascript
it('should produce consistent output', async () => {
  const input = { name: 'test', date: new Date('2024-01-01') };

  const result1 = await processInput(input);
  const result2 = await processInput(input);

  expect(result1).toEqual(result2);  // Same input = same output
});
```

### Testing Async Sequences

```javascript
it('should execute in correct order', async () => {
  const execution = [];

  await step1(execution);
  await step2(execution);
  await step3(execution);

  expect(execution).toEqual(['step1', 'step2', 'step3']);
});
```

### Testing Error Recovery

```javascript
it('should recover from temporary error', async () => {
  let attempts = 0;

  const operation = async () => {
    attempts++;
    if (attempts < 2) {
      throw new Error('Temporary error');
    }
    return 'success';
  };

  const result = await retry(operation, { maxRetries: 3 });
  expect(result).toBe('success');
  expect(attempts).toBe(2);
});
```

### Testing with Snapshots

```javascript
it('should match snapshot', async () => {
  const result = await complexOperation();
  expect(result).toMatchSnapshot();
});
```

---

## Debugging Tests

### Enable Debug Logging

```bash
# Show debug output
DEBUG=gitvan:* npm test

# Verbose output
npm test -- --reporter=verbose

# Single test
npm test -- --reporter=verbose --t "should work"
```

### Use Console Logging

```javascript
it('should debug', async () => {
  await withGitVan(context, async () => {
    const git = useGit();

    // Add debug output
    console.log('Before status');
    const status = await git.status();
    console.log('Status:', status);

    expect(status).toBeDefined();
  });
});
```

### Debug with Node Inspector

```bash
# Run test with inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Then open chrome://inspect in Chrome DevTools
```

### Slow Test Investigation

```javascript
// Measure timing
it('should complete quickly', async () => {
  const start = performance.now();

  await withGitVan(context, async () => {
    const git = useGit();
    await git.status();
  });

  const duration = performance.now() - start;
  console.log(`Duration: ${duration}ms`);

  expect(duration).toBeLessThan(5000);  // Should complete in 5s
});
```

---

## Test Organization

### File Structure

```
tests/
├── composables/
│   ├── git.test.mjs
│   ├── template.test.mjs
│   ├── job.test.mjs
│   └── ...
├── integration/
│   ├── workflow.test.mjs
│   ├── hooks.test.mjs
│   └── ...
├── fixtures/
│   ├── test-workflows.mjs
│   ├── test-repos.mjs
│   └── ...
└── setup.mjs
```

### Test Naming

```javascript
// ✓ GOOD - Clear, specific names
it('should create branch from main', () => {})
it('should reject invalid branch names', () => {})
it('should handle missing author in config', () => {})

// ✗ BAD - Vague names
it('should work', () => {})
it('git test', () => {})
it('test branching', () => {})
```

---

## Running Tests in CI/CD

**GitHub Actions example:**

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: 'recursive'

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm run setup-dev
      - run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Best Practices

1. **Test behavior, not implementation**
   - ✓ Test that commit succeeds
   - ✗ Don't test internal details

2. **Use descriptive names**
   - ✓ "should reject unsigned commits when policy requires signing"
   - ✗ "test commit"

3. **Keep tests isolated**
   - Each test should be independent
   - Use beforeEach/afterEach for setup/cleanup

4. **Test edge cases**
   - Empty inputs
   - Large inputs
   - Null/undefined
   - Error conditions

5. **Mock external dependencies**
   - Don't make real network calls
   - Don't modify real file systems
   - Mock time if needed

---

**Last Updated**: January 9, 2026
**Version**: 4.0.1
