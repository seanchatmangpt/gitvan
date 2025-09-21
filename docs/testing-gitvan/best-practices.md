# Best Practices

This chapter covers recommended patterns and practices for effective testing of GitVan applications using `citty-test-utils`. Follow these guidelines to write maintainable, reliable, and efficient tests.

## Test Organization

### File Structure

Organize your tests logically:

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

#### Unit Tests
Test individual commands in isolation:

```javascript
describe('Unit Tests', () => {
  it('help command', async () => {
    const result = await runLocalCitty(['--help'])
    result.expectSuccess().expectOutput('USAGE')
  })
})
```

#### Integration Tests
Test command interactions:

```javascript
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
```

#### E2E Tests
Test complete workflows:

```javascript
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
  .expectNoOutput()                  // No stdout for errors
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
const quickResult = await runLocalCitty(['--help'], {
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
await setupCleanroom({ rootDir: '.' })
try {
  const result = await runCitty(['--help'])
  result.expectSuccess()
} finally {
  await teardownCleanroom()  // Always cleanup
}

// Bad: Resource leak
await setupCleanroom({ rootDir: '.' })
const result = await runCitty(['--help'])
result.expectSuccess()
// Missing teardown
```

### Memory Optimization

```javascript
// Good: Efficient test data
const testCommands = ['--help', '--version', 'status']

for (const command of testCommands) {
  const result = await runLocalCitty(command)
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
      
    - name: Run CLI tests
      run: npm run test:cli
```

### Test Scripts

```json
{
  "scripts": {
    "test:cli": "vitest tests/cli-tests.mjs",
    "test:cli:local": "vitest tests/cli-tests.mjs --reporter=verbose",
    "test:cli:cleanroom": "vitest tests/cleanroom-tests.mjs",
    "test:cli:all": "npm run test:cli && npm run test:cli:cleanroom"
  }
}
```

## Code Quality

### Test Helpers

```javascript
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

export function expectErrorOutput(result, errorPattern) {
  result
    .expectFailure()
    .expectStderr(errorPattern)
    .expectNoOutput()
  return result
}

// Usage
import { expectValidVersion, expectHelpOutput, expectErrorOutput } from './test-helpers.mjs'

const versionResult = await runLocalCitty(['--version'])
expectValidVersion(versionResult)

const helpResult = await runLocalCitty(['--help'])
expectHelpOutput(helpResult)

const errorResult = await runLocalCitty(['invalid-command'])
expectErrorOutput(errorResult, /Unknown command/)
```

### Custom Assertions

```javascript
// custom-assertions.mjs
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

## Common Anti-Patterns

### ❌ Avoid These Patterns

```javascript
// Hardcoded paths
const result = await runLocalCitty(['--help'], {
  cwd: '/hardcoded/path/to/project'
})

// No error handling
const result = await runLocalCitty(['--help'])
result.expectSuccess()  // May throw unhandled error

// Inefficient sequential execution
const helpResult = await runLocalCitty(['--help'])
const versionResult = await runLocalCitty(['--version'])
const statusResult = await runLocalCitty(['status'])

// Resource leaks
await setupCleanroom()
const result = await runCitty(['--help'])
// Missing teardown

// Vague assertions
result.expectOutput('something')  // Too generic

// No timeout management
const result = await runLocalCitty(['build'])  // May timeout
```

### ✅ Use These Patterns Instead

```javascript
// Automatic project detection
const result = await runLocalCitty(['--help'])

// Proper error handling
try {
  const result = await runLocalCitty(['--help'])
  result.expectSuccess()
} catch (error) {
  console.error('Test failed:', error.message)
  throw error
}

// Parallel execution
const promises = [
  runLocalCitty(['--help']),
  runLocalCitty(['--version']),
  runLocalCitty(['status'])
]
const results = await Promise.all(promises)

// Proper cleanup
await setupCleanroom()
try {
  const result = await runCitty(['--help'])
  result.expectSuccess()
} finally {
  await teardownCleanroom()
}

// Specific assertions
result.expectOutput('USAGE').expectOutput(/gitvan/)

// Appropriate timeouts
const result = await runLocalCitty(['--help'], {
  timeout: 5000  // 5 seconds for quick commands
})
```

## Testing Strategies

### Test Pyramid

Follow the testing pyramid:

```
    /\
   /  \     E2E Tests (Few)
  /____\    - Complete workflows
 /      \   - Cross-environment
/________\  - Integration scenarios

   /\
  /  \      Integration Tests (Some)
 /____\     - Command interactions
/      \    - Multi-step workflows
/________\  - Environment consistency

  /\
 /  \       Unit Tests (Many)
/____\      - Individual commands
/      \    - Error handling
/________\  - Output validation
```

### Test Coverage

Aim for comprehensive coverage:

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Cover critical workflows
- **E2E Tests**: Cover user journeys
- **Error Tests**: Cover error conditions
- **Performance Tests**: Cover performance requirements

### Test Maintenance

Keep tests maintainable:

1. **Regular updates** - Update tests when code changes
2. **Remove obsolete tests** - Delete tests for removed features
3. **Refactor tests** - Improve test structure and readability
4. **Monitor performance** - Track test execution times
5. **Review test quality** - Regular code reviews for tests

## Summary

Following these best practices will help you:

1. **Write maintainable tests** - Clear structure and naming
2. **Improve test reliability** - Proper error handling and retry logic
3. **Optimize performance** - Efficient execution and resource management
4. **Ensure consistency** - Standardized patterns across your test suite
5. **Facilitate debugging** - Clear error messages and documentation

Remember: Good tests are not just about coverage, but about reliability, maintainability, and clarity.

---

**Ready for examples?** Let's explore [Examples](./examples.md)!
