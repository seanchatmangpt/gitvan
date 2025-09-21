# Best Practices

Recommended patterns and practices for effective testing with `citty-test-utils`.

## Table of Contents

- [Test Organization](#test-organization)
- [Assertion Patterns](#assertion-patterns)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Environment Management](#environment-management)
- [CI/CD Integration](#cicd-integration)
- [Code Quality](#code-quality)
- [Documentation](#documentation)

## Test Organization

### File Structure

```
tests/
├── unit/                    # Unit tests
│   ├── cli-commands.test.mjs
│   └── cli-helpers.test.mjs
├── integration/             # Integration tests
│   ├── workflows.test.mjs
│   └── scenarios.test.mjs
├── e2e/                     # End-to-end tests
│   ├── cleanroom.test.mjs
│   └── cross-env.test.mjs
├── fixtures/                # Test data
│   ├── test-projects/
│   └── mock-responses/
└── helpers/                 # Test utilities
    ├── test-helpers.mjs
    └── custom-assertions.mjs
```

### Test Naming Conventions

```javascript
// Good: Descriptive test names
describe('GitVan CLI Commands', () => {
  it('should display help information when --help is provided', async () => {
    // test implementation
  })
  
  it('should show version number when --version is provided', async () => {
    // test implementation
  })
  
  it('should fail gracefully when invalid command is provided', async () => {
    // test implementation
  })
})

// Bad: Vague test names
describe('CLI', () => {
  it('should work', async () => {
    // test implementation
  })
  
  it('test 1', async () => {
    // test implementation
  })
})
```

### Test Categories

```javascript
// Unit tests - Test individual commands
describe('Unit Tests', () => {
  it('help command', async () => {
    const result = await runLocalCitty(['--help'])
    result.expectSuccess().expectOutput('USAGE')
  })
})

// Integration tests - Test command interactions
describe('Integration Tests', () => {
  it('help and version workflow', async () => {
    const result = await scenario('Help and Version')
      .step('Get help')
      .run('--help')
      .expectSuccess()
      .step('Get version')
      .run('--version')
      .expectSuccess()
      .execute('local')
  })
})

// E2E tests - Test complete workflows
describe('E2E Tests', () => {
  it('complete project setup', async () => {
    await setupCleanroom({ rootDir: '.' })
    
    try {
      const result = await runCitty(['init', 'test-project'])
      result.expectSuccess().expectOutput(/Initialized/)
    } finally {
      await teardownCleanroom()
    }
  })
})
```

## Assertion Patterns

### Fluent Assertion Chains

```javascript
// Good: Logical assertion order
const result = await runLocalCitty(['--help'])

result
  .expectSuccess()                    // Check exit code first
  .expectOutput('USAGE')              // Check main output
  .expectOutput(/gitvan/)             // Check for specific content
  .expectNoStderr()                  // Check error output
  .expectOutputLength(100, 5000)      // Check output size
  .expectDuration(1000)               // Check performance

// Bad: Random assertion order
result
  .expectOutputLength(100, 5000)
  .expectSuccess()
  .expectNoStderr()
  .expectOutput('USAGE')
```

### Specific Assertions

```javascript
// Good: Specific assertions
result
  .expectExit(0)                      // Specific exit code
  .expectOutput('USAGE')              // Exact string match
  .expectOutput(/gitvan/)              // Regex pattern
  .expectStderrLength(0, 50)           // Range validation

// Bad: Generic assertions
result
  .expectSuccess()                    // Too generic
  .expectOutput('something')          // Vague expectation
```

### Error Testing

```javascript
// Good: Test expected failures
const errorResult = await runLocalCitty(['invalid-command'])
errorResult
  .expectFailure()                    // Expect non-zero exit code
  .expectStderr(/Unknown command/)    // Check error message
  .expectNoOutput()                   // No stdout for errors
  .expectExitCodeIn([1, 2])           // Acceptable error codes

// Bad: Not testing error cases
const result = await runLocalCitty(['invalid-command'])
// Missing error handling
```

## Error Handling

### Graceful Error Handling

```javascript
// Good: Comprehensive error handling
async function testCommand(command) {
  try {
    const result = await runLocalCitty(command)
    result.expectSuccess()
    return result
  } catch (error) {
    console.error(`Command failed: ${command.join(' ')}`)
    console.error(`Error: ${error.message}`)
    throw error
  }
}

// Bad: Silent failures
async function testCommand(command) {
  const result = await runLocalCitty(command)
  // No error handling
}
```

### Retry Logic

```javascript
// Good: Retry for flaky operations
import { testUtils } from 'citty-test-utils'

const result = await testUtils.retry(async () => {
  const result = await runLocalCitty(['daemon', 'status'])
  result.expectSuccess()
  return result
}, 3, 2000)  // 3 attempts, 2 second delay

// Bad: No retry for known flaky operations
const result = await runLocalCitty(['daemon', 'status'])
result.expectSuccess()  // May fail due to timing
```

### Timeout Management

```javascript
// Good: Appropriate timeouts
const quickResult = await runLocalCitty(['--version'], {
  timeout: 5000  // 5 seconds for quick commands
})

const slowResult = await runLocalCitty(['build'], {
  timeout: 120000  // 2 minutes for slow commands
})

// Bad: Default timeout for all commands
const result = await runLocalCitty(['build'])  // May timeout
```

## Performance Optimization

### Test Execution Speed

```javascript
// Good: Parallel execution for independent tests
const promises = [
  runLocalCitty(['--help']),
  runLocalCitty(['--version']),
  runLocalCitty(['status'])
]

const results = await Promise.all(promises)
results.forEach(result => result.expectSuccess())

// Bad: Sequential execution for independent tests
const helpResult = await runLocalCitty(['--help'])
const versionResult = await runLocalCitty(['--version'])
const statusResult = await runLocalCitty(['status'])
```

### Resource Management

```javascript
// Good: Proper cleanup
async function testWithCleanroom() {
  await setupCleanroom({ rootDir: '.' })
  
  try {
    const result = await runCitty(['--help'])
    result.expectSuccess()
  } finally {
    await teardownCleanroom()  // Always cleanup
  }
}

// Bad: Resource leaks
async function testWithCleanroom() {
  await setupCleanroom({ rootDir: '.' })
  const result = await runCitty(['--help'])
  result.expectSuccess()
  // Missing cleanup
}
```

### Memory Optimization

```javascript
// Good: Efficient test data
const testCommands = ['--help', '--version', 'status']

for (const command of testCommands) {
  const result = await runLocalCitty([command])
  result.expectSuccess()
}

// Bad: Inefficient test data
const testCommands = [
  { args: ['--help'], expected: 'USAGE' },
  { args: ['--version'], expected: /\d+\.\d+\.\d+/ },
  { args: ['status'], expected: 'ready' }
]
// More complex data structure than needed
```

## Environment Management

### Environment-Specific Testing

```javascript
// Good: Environment-aware testing
const environments = ['local', 'cleanroom']

for (const env of environments) {
  describe(`${env} environment`, () => {
    beforeEach(async () => {
      if (env === 'cleanroom') {
        await setupCleanroom({ rootDir: '.' })
      }
    })
    
    afterEach(async () => {
      if (env === 'cleanroom') {
        await teardownCleanroom()
      }
    })
    
    it('should work in cleanroom', async () => {
      const runner = env === 'cleanroom' ? runCitty : runLocalCitty
      const result = await runner(['--help'])
      result.expectSuccess()
    })
  })
}
```

### Configuration Management

```javascript
// Good: Centralized configuration
const testConfig = {
  local: {
    timeout: 30000,
    env: { NODE_ENV: 'test' }
  },
  cleanroom: {
    timeout: 60000,
    env: { NODE_ENV: 'test' }
  }
}

const result = await runLocalCitty(['--help'], testConfig.local)

// Bad: Hardcoded configuration
const result = await runLocalCitty(['--help'], {
  timeout: 30000,
  env: { NODE_ENV: 'test' }
})
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/cli-tests.yml
name: CLI Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install citty-test-utils
      run: npm install citty-test-utils
      
    - name: Run unit tests
      run: npm run test:unit
      
    - name: Run integration tests
      run: npm run test:integration
      
    - name: Run E2E tests
      run: npm run test:e2e
```

### Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest tests/unit",
    "test:integration": "vitest tests/integration",
    "test:e2e": "vitest tests/e2e",
    "test:cli": "vitest tests/cli-tests.mjs",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Docker Integration

```dockerfile
# Dockerfile.test
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Install citty-test-utils
RUN npm install citty-test-utils

# Copy source code
COPY . .

# Run tests
CMD ["npm", "run", "test:cli"]
```

## Code Quality

### Test Helpers

```javascript
// Good: Reusable test helpers
// test-helpers.mjs
export function expectValidVersion(result) {
  result
    .expectSuccess()
    .expectOutput(/\d+\.\d+\.\d+/)
    .expectOutputLength(1, 20)
    .expectNoStderr()
  return result
}

export function expectHelpOutput(result) {
  result
    .expectSuccess()
    .expectOutput('USAGE')
    .expectOutput(/gitvan/)
    .expectOutputLength(100, 10000)
    .expectNoStderr()
  return result
}

// Usage
import { expectValidVersion, expectHelpOutput } from './test-helpers.mjs'

const versionResult = await runLocalCitty(['--version'])
expectValidVersion(versionResult)

const helpResult = await runLocalCitty(['--help'])
expectHelpOutput(helpResult)
```

### Custom Assertions

```javascript
// Good: Custom assertion extensions
export function expectCommandSuccess(result, expectedOutput) {
  result
    .expectSuccess()
    .expectOutput(expectedOutput)
    .expectNoStderr()
    .expectDuration(5000)
  return result
}

// Usage
const result = await runLocalCitty(['--help'])
expectCommandSuccess(result, 'USAGE')
```

### Test Data Management

```javascript
// Good: Centralized test data
const testData = {
  commands: {
    help: ['--help'],
    version: ['--version'],
    status: ['status']
  },
  expectedOutputs: {
    help: 'USAGE',
    version: /\d+\.\d+\.\d+/,
    status: 'ready'
  }
}

// Usage
for (const [name, command] of Object.entries(testData.commands)) {
  const result = await runLocalCitty(command)
  result.expectSuccess().expectOutput(testData.expectedOutputs[name])
}
```

## Documentation

### Test Documentation

```javascript
// Good: Well-documented tests
/**
 * Tests the GitVan CLI help system
 * 
 * This test suite verifies that:
 * - Help command displays usage information
 * - Help output contains expected sections
 * - Help command executes quickly
 */
describe('CLI Help System', () => {
  /**
   * Verifies that --help displays usage information
   * 
   * Expected behavior:
   * - Exit code: 0
   * - Output contains: "USAGE"
   * - Output contains: "gitvan"
   * - No error output
   * - Execution time < 1 second
   */
  it('should display usage information', async () => {
    const result = await runLocalCitty(['--help'])
    
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectOutput(/gitvan/)
      .expectNoStderr()
      .expectDuration(1000)
  })
})
```

### README Documentation

```markdown
# CLI Tests

This directory contains tests for the GitVan CLI using `citty-test-utils`.

## Test Structure

- `unit/` - Unit tests for individual commands
- `integration/` - Integration tests for command workflows
- `e2e/` - End-to-end tests with cleanroom environment

## Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Test Patterns

### Basic Command Testing
```javascript
const result = await runLocalCitty(['--help'])
result.expectSuccess().expectOutput('USAGE')
```

### Error Testing
```javascript
const result = await runLocalCitty(['invalid-command'])
result.expectFailure().expectStderr(/Unknown command/)
```

### Scenario Testing
```javascript
const result = await scenario('Help and Version')
  .step('Get help')
  .run('--help')
  .expectSuccess()
  .step('Get version')
  .run('--version')
  .expectSuccess()
  .execute('local')
```
```

### API Documentation

```javascript
/**
 * Runs a GitVan CLI command locally with automatic project detection
 * 
 * @param {string[]} args - Command line arguments
 * @param {RunOptions} [options] - Optional configuration
 * @returns {Promise<CliExpectation>} Fluent assertion object
 * 
 * @example
 * ```javascript
 * const result = await runLocalCitty(['--help'])
 * result.expectSuccess().expectOutput('USAGE')
 * ```
 */
export function runLocalCitty(args, options) {
  // implementation
}
```

## Common Anti-Patterns

### ❌ Avoid These Patterns

```javascript
// Bad: Hardcoded paths
const result = await runLocalCitty(['--help'], {
  cwd: '/hardcoded/path/to/project'
})

// Bad: No error handling
const result = await runLocalCitty(['--help'])
result.expectSuccess()  // May throw unhandled error

// Bad: Inefficient sequential execution
const helpResult = await runLocalCitty(['--help'])
const versionResult = await runLocalCitty(['--version'])
const statusResult = await runLocalCitty(['status'])

// Bad: Resource leaks
await setupCleanroom()
const result = await runCitty(['--help'])
// Missing teardown

// Bad: Vague assertions
result.expectOutput('something')  // Too generic

// Bad: No timeout management
const result = await runLocalCitty(['long-running-command'])
```

### ✅ Use These Patterns Instead

```javascript
// Good: Automatic project detection
const result = await runLocalCitty(['--help'])

// Good: Proper error handling
try {
  const result = await runLocalCitty(['--help'])
  result.expectSuccess()
} catch (error) {
  console.error('Test failed:', error.message)
  throw error
}

// Good: Parallel execution
const promises = [
  runLocalCitty(['--help']),
  runLocalCitty(['--version']),
  runLocalCitty(['status'])
]
const results = await Promise.all(promises)

// Good: Proper cleanup
await setupCleanroom()
try {
  const result = await runCitty(['--help'])
  result.expectSuccess()
} finally {
  await teardownCleanroom()
}

// Good: Specific assertions
result.expectOutput('USAGE').expectOutput(/gitvan/)

// Good: Appropriate timeouts
const result = await runLocalCitty(['long-running-command'], {
  timeout: 120000  // 2 minutes
})
```

## Summary

Following these best practices will help you:

1. **Write maintainable tests** - Clear structure and naming
2. **Improve test reliability** - Proper error handling and retry logic
3. **Optimize performance** - Efficient execution and resource management
4. **Ensure consistency** - Standardized patterns across your test suite
5. **Facilitate debugging** - Clear error messages and documentation

Remember: Good tests are not just about coverage, but about reliability, maintainability, and clarity.
