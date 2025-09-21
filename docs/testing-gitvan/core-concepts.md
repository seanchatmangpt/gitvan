# Core Testing Concepts

This chapter covers the fundamental concepts behind testing GitVan applications with `citty-test-utils`. Understanding these concepts will help you write better, more effective tests.

## Testing Philosophy

### Why Test GitVan Applications?

GitVan applications are CLI tools that interact with:
- **File systems** (reading/writing files)
- **Git repositories** (commits, branches, refs)
- **External services** (APIs, databases)
- **User input** (commands, arguments)

Testing ensures these interactions work correctly and consistently.

### Testing Pyramid

The testing pyramid for GitVan applications:

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

## Core Components

### 1. Local Runner (`runLocalCitty`)

The local runner executes GitVan CLI commands in your development environment.

**Key Features:**
- Automatic project root detection
- Environment variable support
- Timeout management
- Safe JSON parsing

**Use Cases:**
- Development testing
- Quick validation
- Debugging
- Local CI/CD

### 2. Cleanroom Runner (`runCitty`)

The cleanroom runner executes commands in isolated Docker containers.

**Key Features:**
- Isolated environment
- Consistent results
- Cross-platform testing
- Resource management

**Use Cases:**
- Production-like testing
- Cross-environment validation
- Integration testing
- CI/CD pipelines

### 3. Fluent Assertions

Chainable expectation API with detailed error messages.

**Key Features:**
- Method chaining
- Detailed error context
- Multiple assertion types
- Performance validation

**Use Cases:**
- Output validation
- Error testing
- Performance testing
- Cross-environment comparison

### 4. Scenario DSL

Multi-step test workflows with step-by-step execution.

**Key Features:**
- Step-by-step execution
- Custom actions
- Environment switching
- Pre-built templates

**Use Cases:**
- Complex workflows
- Integration testing
- End-to-end testing
- User journey testing

## Testing Patterns

### 1. Command Testing

Test individual GitVan commands:

```javascript
// Test command success
const result = await runLocalCitty(['--help'])
result.expectSuccess().expectOutput('USAGE')

// Test command failure
const errorResult = await runLocalCitty(['invalid-command'])
errorResult.expectFailure().expectStderr(/Unknown command/)
```

### 2. Output Validation

Validate command output:

```javascript
const result = await runLocalCitty(['--version'])

// String matching
result.expectOutput('1.0.0')

// Regex matching
result.expectOutput(/\d+\.\d+\.\d+/)

// Length validation
result.expectOutputLength(1, 20)

// Content validation
result.expectOutputContains('version')
```

### 3. Error Testing

Test error conditions:

```javascript
// Test expected errors
const result = await runLocalCitty(['invalid-command'])
result
  .expectFailure()
  .expectStderr(/Unknown command/)
  .expectNoOutput()

// Test error codes
result.expectExitCodeIn([1, 2, 3])
```

### 4. Environment Testing

Test with different environments:

```javascript
// Test with environment variables
const result = await runLocalCitty(['dev'], {
  env: {
    NODE_ENV: 'development',
    DEBUG: 'true'
  }
})

// Test with custom working directory
const result = await runLocalCitty(['status'], {
  cwd: '/custom/path'
})
```

### 5. Performance Testing

Test command performance:

```javascript
const result = await runLocalCitty(['--help'])
result
  .expectSuccess()
  .expectDuration(1000)  // Should complete within 1 second
```

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

## Assertion Strategies

### 1. Positive Testing

Test that commands work as expected:

```javascript
const result = await runLocalCitty(['--help'])
result
  .expectSuccess()
  .expectOutput('USAGE')
  .expectNoStderr()
```

### 2. Negative Testing

Test error conditions:

```javascript
const result = await runLocalCitty(['invalid-command'])
result
  .expectFailure()
  .expectStderr(/Unknown command/)
  .expectNoOutput()
```

### 3. Boundary Testing

Test edge cases:

```javascript
// Test with empty arguments
const result = await runLocalCitty([])
result.expectFailure()

// Test with very long arguments
const longArg = 'a'.repeat(10000)
const result = await runLocalCitty([longArg])
result.expectFailure()
```

### 4. State Testing

Test command state changes:

```javascript
// Test before and after state
const beforeResult = await runLocalCitty(['status'])
const initResult = await runLocalCitty(['init', 'test-project'])
const afterResult = await runLocalCitty(['status'])

expect(beforeResult.result.stdout).not.toBe(afterResult.result.stdout)
```

## Error Handling Patterns

### 1. Graceful Degradation

Test that commands fail gracefully:

```javascript
const result = await runLocalCitty(['command-that-might-fail'])
if (result.result.exitCode === 0) {
  result.expectSuccess()
} else {
  result.expectFailure().expectStderr(/error/i)
}
```

### 2. Retry Logic

Test flaky operations:

```javascript
import { testUtils } from 'citty-test-utils'

const result = await testUtils.retry(async () => {
  const result = await runLocalCitty(['daemon', 'status'])
  result.expectSuccess()
  return result
}, 3, 1000)
```

### 3. Timeout Handling

Test long-running commands:

```javascript
const result = await runLocalCitty(['long-command'], {
  timeout: 60000  // 1 minute timeout
})
result.expectSuccess()
```

## Performance Considerations

### 1. Test Execution Speed

Optimize test execution:

```javascript
// Run independent tests in parallel
const promises = [
  runLocalCitty(['--help']),
  runLocalCitty(['--version']),
  runLocalCitty(['status'])
]

const results = await Promise.all(promises)
results.forEach(result => result.expectSuccess())
```

### 2. Resource Management

Manage test resources:

```javascript
// Clean up after tests
await setupCleanroom({ rootDir: '.' })
try {
  const result = await runCitty(['--help'])
  result.expectSuccess()
} finally {
  await teardownCleanroom()
}
```

### 3. Memory Optimization

Optimize memory usage:

```javascript
// Use efficient test data
const testCommands = ['--help', '--version', 'status']

for (const command of testCommands) {
  const result = await runLocalCitty([command])
  result.expectSuccess()
}
```

## Best Practices

### 1. Test Naming

Use descriptive test names:

```javascript
// Good
it('should display help information when --help is provided', async () => {
  // test implementation
})

// Bad
it('should work', async () => {
  // test implementation
})
```

### 2. Test Isolation

Keep tests independent:

```javascript
// Each test should be able to run independently
describe('CLI Tests', () => {
  it('help command', async () => {
    const result = await runLocalCitty(['--help'])
    result.expectSuccess()
  })
  
  it('version command', async () => {
    const result = await runLocalCitty(['--version'])
    result.expectSuccess()
  })
})
```

### 3. Assertion Clarity

Make assertions clear and specific:

```javascript
// Good
result
  .expectSuccess()
  .expectOutput('USAGE')
  .expectOutput(/gitvan/)
  .expectNoStderr()

// Bad
result.expectOutput('something')
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
```

## Summary

Understanding these core concepts will help you:

1. **Write better tests** - Clear understanding of testing patterns
2. **Organize effectively** - Logical test structure and categorization
3. **Handle errors properly** - Robust error handling and retry logic
4. **Optimize performance** - Efficient test execution and resource management
5. **Follow best practices** - Avoid common pitfalls and anti-patterns

---

**Ready to dive deeper?** Let's explore [Local Testing](./local-testing.md) patterns!
