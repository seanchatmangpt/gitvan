# Local Testing

This chapter covers testing GitVan applications in your local development environment using the local runner. Local testing is fast, convenient, and perfect for development and quick validation.

## Overview

Local testing executes GitVan CLI commands directly in your development environment. It's ideal for:

- **Development testing** - Quick feedback during development
- **Unit testing** - Testing individual commands
- **Integration testing** - Testing command interactions
- **Debugging** - Investigating issues locally

## Basic Local Testing

### Simple Command Testing

Test individual GitVan commands:

```javascript
import { runLocalCitty } from 'citty-test-utils'

// Test help command
const helpResult = await runLocalCitty(['--help'])
helpResult
  .expectSuccess()
  .expectOutput('USAGE')
  .expectNoStderr()

// Test version command
const versionResult = await runLocalCitty(['--version'])
versionResult
  .expectSuccess()
  .expectOutput(/\d+\.\d+\.\d+/)
  .expectDuration(1000)
```

### Error Testing

Test how commands handle errors:

```javascript
// Test invalid command
const errorResult = await runLocalCitty(['invalid-command'])
errorResult
  .expectFailure()
  .expectStderr(/Unknown command/)
  .expectNoOutput()

// Test missing arguments
const missingArgResult = await runLocalCitty(['init'])
missingArgResult
  .expectFailure()
  .expectStderr(/required|missing/i)
```

## Advanced Local Testing

### Environment Variables

Test with custom environment variables:

```javascript
// Test with development environment
const devResult = await runLocalCitty(['dev'], {
  env: {
    NODE_ENV: 'development',
    DEBUG: 'true',
    PORT: '3000'
  }
})
devResult.expectSuccess()

// Test with production environment
const prodResult = await runLocalCitty(['build'], {
  env: {
    NODE_ENV: 'production',
    DEBUG: 'false'
  }
})
prodResult.expectSuccess()
```

### Working Directory

Test with different working directories:

```javascript
// Test from project root
const rootResult = await runLocalCitty(['status'], {
  cwd: process.cwd()
})

// Test from subdirectory
const subResult = await runLocalCitty(['status'], {
  cwd: path.join(process.cwd(), 'subdir')
})

// Compare results
expect(rootResult.result.stdout).toBe(subResult.result.stdout)
```

### Timeout Management

Handle long-running commands:

```javascript
// Quick commands
const quickResult = await runLocalCitty(['--help'], {
  timeout: 5000  // 5 seconds
})

// Long-running commands
const longResult = await runLocalCitty(['build'], {
  timeout: 120000  // 2 minutes
})

// No timeout (for daemon commands)
const daemonResult = await runLocalCitty(['daemon', 'start'], {
  timeout: 0  // No timeout
})
```

### JSON Output

Test commands that output JSON:

```javascript
// Parse JSON output
const jsonResult = await runLocalCitty(['--version'], {
  json: true
})

if (jsonResult.result.json) {
  expect(jsonResult.result.json.version).toBeDefined()
  expect(jsonResult.result.json.version).toMatch(/\d+\.\d+\.\d+/)
}

// Test JSON validation
jsonResult.expectJson(data => {
  expect(data.version).toBeDefined()
  expect(data.name).toBe('gitvan')
})
```

## Testing Patterns

### Command Validation

Validate command outputs:

```javascript
async function testCommandOutput(command, expectedOutput) {
  const result = await runLocalCitty(command)
  
  result
    .expectSuccess()
    .expectOutput(expectedOutput)
    .expectNoStderr()
    .expectDuration(5000)
}

// Test multiple commands
const commands = [
  { cmd: ['--help'], expected: 'USAGE' },
  { cmd: ['--version'], expected: /\d+\.\d+\.\d+/ },
  { cmd: ['status'], expected: /ready|running/ }
]

for (const { cmd, expected } of commands) {
  await testCommandOutput(cmd, expected)
}
```

### Error Handling

Test error conditions:

```javascript
async function testErrorHandling(command, expectedError) {
  const result = await runLocalCitty(command)
  
  result
    .expectFailure()
    .expectStderr(expectedError)
    .expectNoOutput()
    .expectExitCodeIn([1, 2, 3])
}

// Test various error conditions
const errorCases = [
  { cmd: ['invalid-command'], error: /Unknown command/ },
  { cmd: ['init'], error: /required|missing/ },
  { cmd: ['pack', 'install', 'nonexistent'], error: /not found/ }
]

for (const { cmd, error } of errorCases) {
  await testErrorHandling(cmd, error)
}
```

### Performance Testing

Test command performance:

```javascript
async function testCommandPerformance(command, maxDuration) {
  const result = await runLocalCitty(command)
  
  result
    .expectSuccess()
    .expectDuration(maxDuration)
}

// Test performance of different commands
const performanceTests = [
  { cmd: ['--help'], maxDuration: 1000 },
  { cmd: ['--version'], maxDuration: 500 },
  { cmd: ['status'], maxDuration: 2000 }
]

for (const { cmd, maxDuration } of performanceTests) {
  await testCommandPerformance(cmd, maxDuration)
}
```

### State Testing

Test command state changes:

```javascript
async function testStateChange() {
  // Check initial state
  const initialState = await runLocalCitty(['status'])
  initialState.expectSuccess()
  
  // Perform action
  const initResult = await runLocalCitty(['init', 'test-project'])
  initResult.expectSuccess().expectOutput(/Initialized/)
  
  // Check final state
  const finalState = await runLocalCitty(['status'])
  finalState.expectSuccess()
  
  // Verify state changed
  expect(finalState.result.stdout).not.toBe(initialState.result.stdout)
}
```

## Parallel Testing

### Concurrent Execution

Run multiple tests in parallel:

```javascript
async function testConcurrentCommands() {
  const commands = [
    ['--help'],
    ['--version'],
    ['status'],
    ['daemon', 'status']
  ]
  
  const promises = commands.map(cmd => runLocalCitty(cmd))
  const results = await Promise.all(promises)
  
  // All should succeed
  results.forEach(result => {
    result.expectSuccess()
  })
}
```

### Load Testing

Test system under load:

```javascript
async function testLoad() {
  const concurrency = 10
  const iterations = 100
  
  const promises = []
  
  for (let i = 0; i < iterations; i++) {
    promises.push(runLocalCitty(['--help']))
    
    if (promises.length >= concurrency) {
      const results = await Promise.all(promises)
      results.forEach(result => result.expectSuccess())
      promises.length = 0
    }
  }
  
  // Handle remaining promises
  if (promises.length > 0) {
    const results = await Promise.all(promises)
    results.forEach(result => result.expectSuccess())
  }
}
```

## Custom Assertions

### Helper Functions

Create reusable assertion helpers:

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
```

### Using Custom Assertions

```javascript
import { expectValidVersion, expectHelpOutput, expectErrorOutput } from './test-helpers.mjs'

// Test version
const versionResult = await runLocalCitty(['--version'])
expectValidVersion(versionResult)

// Test help
const helpResult = await runLocalCitty(['--help'])
expectHelpOutput(helpResult)

// Test error
const errorResult = await runLocalCitty(['invalid-command'])
expectErrorOutput(errorResult, /Unknown command/)
```

## Test Organization

### File Structure

Organize local tests logically:

```
tests/
├── local/
│   ├── commands/
│   │   ├── help.test.mjs
│   │   ├── version.test.mjs
│   │   └── status.test.mjs
│   ├── workflows/
│   │   ├── init.test.mjs
│   │   └── build.test.mjs
│   └── integration/
│       ├── cli-integration.test.mjs
│       └── workflow-integration.test.mjs
```

### Test Categories

#### Command Tests

```javascript
// tests/local/commands/help.test.mjs
import { describe, it } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

describe('Help Command', () => {
  it('should show main help', async () => {
    const result = await runLocalCitty(['--help'])
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectOutput(/gitvan/)
      .expectNoStderr()
  })
  
  it('should show command-specific help', async () => {
    const result = await runLocalCitty(['init', '--help'])
    result
      .expectSuccess()
      .expectOutput(/init/i)
      .expectOutputLength(100, 2000)
  })
})
```

#### Workflow Tests

```javascript
// tests/local/workflows/init.test.mjs
import { describe, it } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

describe('Init Workflow', () => {
  it('should initialize project', async () => {
    const result = await runLocalCitty(['init', 'test-project'])
    result
      .expectSuccess()
      .expectOutput(/Initialized/)
      .expectOutput(/test-project/)
  })
  
  it('should fail with missing project name', async () => {
    const result = await runLocalCitty(['init'])
    result
      .expectFailure()
      .expectStderr(/required|missing/i)
  })
})
```

#### Integration Tests

```javascript
// tests/local/integration/cli-integration.test.mjs
import { describe, it } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

describe('CLI Integration', () => {
  it('should handle complete workflow', async () => {
    // Initialize project
    const initResult = await runLocalCitty(['init', 'integration-test'])
    initResult.expectSuccess()
    
    // Check status
    const statusResult = await runLocalCitty(['status'])
    statusResult.expectSuccess().expectOutput(/integration-test/)
    
    // Build project
    const buildResult = await runLocalCitty(['build'])
    buildResult.expectSuccess().expectOutput(/Build complete/)
  })
})
```

## Debugging Local Tests

### Verbose Logging

Enable detailed logging for debugging:

```javascript
// Enable debug mode
process.env.DEBUG = 'citty-test-utils'

const result = await runLocalCitty(['--help'])
console.log('Command:', result.result.args)
console.log('Working directory:', result.result.cwd)
console.log('Exit code:', result.result.exitCode)
console.log('Stdout:', result.result.stdout)
console.log('Stderr:', result.result.stderr)
```

### Test Individual Components

```javascript
// Test project detection
import { findGitVanProject } from 'citty-test-utils'

const projectRoot = await findGitVanProject(process.cwd())
console.log('Project root:', projectRoot)

// Test CLI directly
import { spawn } from 'child_process'

const proc = spawn('node', ['src/cli.mjs', '--help'], {
  cwd: projectRoot
})

proc.stdout.on('data', (data) => {
  console.log('CLI output:', data.toString())
})
```

### Common Debug Commands

```bash
# Check GitVan CLI directly
node src/cli.mjs --help

# Check project structure
ls -la src/
cat package.json | grep name

# Check Node.js
node --version
npm --version

# Check environment
echo $NODE_ENV
echo $PATH
```

## Best Practices

### 1. Test Independence

Keep tests independent:

```javascript
// Good: Each test is independent
describe('CLI Commands', () => {
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

### 2. Clear Assertions

Make assertions clear and specific:

```javascript
// Good: Clear and specific
result
  .expectSuccess()
  .expectOutput('USAGE')
  .expectOutput(/gitvan/)
  .expectNoStderr()

// Bad: Vague
result.expectOutput('something')
```

### 3. Error Handling

Handle errors gracefully:

```javascript
// Good: Proper error handling
try {
  const result = await runLocalCitty(['--help'])
  result.expectSuccess()
} catch (error) {
  console.error('Test failed:', error.message)
  throw error
}
```

### 4. Performance Awareness

Be aware of test performance:

```javascript
// Good: Appropriate timeouts
const result = await runLocalCitty(['--help'], {
  timeout: 5000  // 5 seconds for quick commands
})

// Bad: Default timeout for all commands
const result = await runLocalCitty(['build'])  // May timeout
```

## Common Issues

### CLI Not Found

**Error:** `CLI not found at /path/to/src/cli.mjs`

**Solution:** Ensure you're in a GitVan project with `src/cli.mjs`

### Project Detection Failed

**Error:** Runner can't find GitVan project

**Solution:** Check that `package.json` contains `"name": "gitvan"`

### Command Timeout

**Error:** `Command timed out after 30000ms`

**Solution:** Increase timeout or optimize your command:

```javascript
const result = await runLocalCitty(['long-running-command'], {
  timeout: 120000  // 2 minutes
})
```

### Environment Issues

**Error:** Command fails due to missing environment variables

**Solution:** Pass environment variables:

```javascript
const result = await runLocalCitty(['command'], {
  env: { ...process.env, CUSTOM_VAR: 'value' }
})
```

## Summary

Local testing with `citty-test-utils` provides:

1. **Fast execution** - No Docker overhead
2. **Easy debugging** - Direct access to your environment
3. **Flexible configuration** - Environment variables, timeouts, working directories
4. **Comprehensive assertions** - Detailed error messages and validation
5. **Parallel execution** - Run multiple tests concurrently

Local testing is perfect for development, unit testing, and quick validation. For production-like testing and cross-environment validation, consider using [Cleanroom Testing](./cleanroom-testing.md).

---

**Ready for isolated testing?** Let's explore [Cleanroom Testing](./cleanroom-testing.md)!
