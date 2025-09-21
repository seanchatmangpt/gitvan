# Cookbooks

Ready-to-use patterns and recipes for common testing scenarios with `citty-test-utils`.

## Table of Contents

- [Basic CLI Testing](#basic-cli-testing)
- [Error Handling Tests](#error-handling-tests)
- [Environment Testing](#environment-testing)
- [Performance Testing](#performance-testing)
- [Cross-Environment Testing](#cross-environment-testing)
- [Complex Workflows](#complex-workflows)
- [CI/CD Integration](#cicd-integration)
- [Custom Assertions](#custom-assertions)

## Basic CLI Testing

### Testing Help Commands

```javascript
import { runLocalCitty } from 'citty-test-utils'

async function testHelpCommands() {
  // Test main help
  const mainHelp = await runLocalCitty(['--help'])
  mainHelp
    .expectSuccess()
    .expectOutput('USAGE')
    .expectOutput(/gitvan/)
    .expectNoStderr()
  
  // Test command-specific help
  const commandHelp = await runLocalCitty(['init', '--help'])
  commandHelp
    .expectSuccess()
    .expectOutput(/init/i)
    .expectOutputLength(100, 2000)
}
```

### Testing Version Commands

```javascript
async function testVersionCommands() {
  const result = await runLocalCitty(['--version'])
  
  result
    .expectSuccess()
    .expectOutput(/\d+\.\d+\.\d+/)  // Semantic version pattern
    .expectOutputLength(1, 20)      // Short output
    .expectNoStderr()
    .expectDuration(1000)           // Fast execution
}
```

### Testing Command Lists

```javascript
async function testCommandLists() {
  const result = await runLocalCitty(['--help'])
  
  // Test that all expected commands are present
  const expectedCommands = [
    'graph', 'daemon', 'event', 'cron', 'audit',
    'hooks', 'workflow', 'jtbd', 'cleanroom', 'init'
  ]
  
  expectedCommands.forEach(command => {
    result.expectOutputContains(command)
  })
}
```

## Error Handling Tests

### Testing Invalid Commands

```javascript
async function testInvalidCommands() {
  const invalidCommands = [
    'invalid-command',
    'unknown-action',
    'typo-command'
  ]
  
  for (const cmd of invalidCommands) {
    const result = await runLocalCitty([cmd])
    
    result
      .expectFailure()                    // Non-zero exit code
      .expectStderr(/Unknown command/)    // Error message
      .expectNoOutput()                  // No stdout
      .expectStderrLength(10, 200)       // Reasonable error length
  }
}
```

### Testing Missing Arguments

```javascript
async function testMissingArguments() {
  // Commands that require arguments
  const commandsRequiringArgs = [
    'init',      // Requires project name
    'pack',      // Requires pack name
    'scaffold'   // Requires template name
  ]
  
  for (const cmd of commandsRequiringArgs) {
    const result = await runLocalCitty([cmd])
    
    result
      .expectFailure()
      .expectStderr(/required|missing|argument/i)
  }
}
```

### Testing Permission Errors

```javascript
async function testPermissionErrors() {
  // Test commands that might fail due to permissions
  const result = await runLocalCitty(['daemon', 'start'], {
    env: { ...process.env, NODE_ENV: 'test' }
  })
  
  // Handle both success and permission failure gracefully
  if (result.result.exitCode === 0) {
    result.expectSuccess()
  } else {
    result
      .expectFailure()
      .expectExitCodeIn([1, 2, 13])  // Common error codes
  }
}
```

## Environment Testing

### Testing with Different Node Environments

```javascript
async function testNodeEnvironments() {
  const environments = [
    { NODE_ENV: 'development' },
    { NODE_ENV: 'production' },
    { NODE_ENV: 'test' },
    { DEBUG: 'true' },
    { DEBUG: 'false' }
  ]
  
  for (const env of environments) {
    const result = await runLocalCitty(['--version'], { env })
    
    result
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
  }
}
```

### Testing with Custom Working Directories

```javascript
async function testWorkingDirectories() {
  const testDirs = [
    '/tmp',
    process.cwd(),
    '/Users/test'
  ]
  
  for (const dir of testDirs) {
    try {
      const result = await runLocalCitty(['--help'], { cwd: dir })
      result.expectSuccess()
    } catch (error) {
      // Handle cases where directory doesn't exist
      console.log(`Skipping ${dir}: ${error.message}`)
    }
  }
}
```

### Testing Timeout Scenarios

```javascript
async function testTimeoutScenarios() {
  // Test with very short timeout
  const shortTimeout = await runLocalCitty(['--help'], {
    timeout: 100  // 100ms timeout
  })
  
  // Should still succeed for fast commands
  shortTimeout.expectSuccess()
  
  // Test with reasonable timeout
  const normalTimeout = await runLocalCitty(['--help'], {
    timeout: 5000  // 5 second timeout
  })
  
  normalTimeout.expectSuccess()
}
```

## Performance Testing

### Testing Command Execution Time

```javascript
async function testExecutionTimes() {
  const commands = [
    { args: ['--help'], maxTime: 1000 },
    { args: ['--version'], maxTime: 500 },
    { args: ['status'], maxTime: 2000 }
  ]
  
  for (const { args, maxTime } of commands) {
    const result = await runLocalCitty(args)
    
    result
      .expectSuccess()
      .expectDuration(maxTime)
  }
}
```

### Testing Memory Usage

```javascript
async function testMemoryUsage() {
  const result = await runLocalCitty(['--help'])
  
  result
    .expectSuccess()
    .expectOutputLength(100, 10000)  // Reasonable output size
}
```

### Load Testing

```javascript
async function testConcurrentExecution() {
  const promises = Array.from({ length: 10 }, () => 
    runLocalCitty(['--version'])
  )
  
  const results = await Promise.all(promises)
  
  // All should succeed
  results.forEach(result => {
    result.expectSuccess().expectOutput(/\d+\.\d+\.\d+/)
  })
}
```

## Cross-Environment Testing

### Local vs Cleanroom Consistency

```javascript
import { setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

async function testCrossEnvironmentConsistency() {
  // Setup cleanroom
  await setupCleanroom({ rootDir: '.' })
  
  try {
    const commands = ['--help', '--version', 'status']
    
    for (const cmd of commands) {
      // Run locally
      const localResult = await runLocalCitty([cmd])
      
      // Run in cleanroom
      const cleanroomResult = await runCitty([cmd])
      
      // Compare results
      expect(localResult.result.exitCode).toBe(cleanroomResult.result.exitCode)
      expect(localResult.result.stdout).toBe(cleanroomResult.result.stdout)
    }
  } finally {
    await teardownCleanroom()
  }
}
```

### Environment-Specific Behavior

```javascript
async function testEnvironmentSpecificBehavior() {
  // Test local-specific features
  const localResult = await runLocalCitty(['daemon', 'status'])
  
  // Test cleanroom isolation
  await setupCleanroom({ rootDir: '.' })
  const cleanroomResult = await runCitty(['daemon', 'status'])
  
  // Results might differ due to environment
  // Both should be valid responses
  expect([0, 1, 2]).toContain(localResult.result.exitCode)
  expect([0, 1, 2]).toContain(cleanroomResult.result.exitCode)
  
  await teardownCleanroom()
}
```

## Complex Workflows

### Multi-Step Project Setup

```javascript
import { scenario } from 'citty-test-utils'

async function testProjectSetup() {
  const result = await scenario('Project Setup Workflow')
    .step('Initialize project')
    .run('init', 'test-project')
    .expectSuccess()
    .expectOutput(/Initialized/)
    
    .step('Check project status')
    .run('status')
    .expectSuccess()
    .expectOutput(/test-project/)
    
    .step('Install dependencies')
    .run('pack', 'install')
    .expectSuccess()
    .expectOutput(/Installed/)
    
    .step('Run initial build')
    .run('build')
    .expectSuccess()
    .expectOutput(/Build complete/)
    
    .execute('local')
  
  expect(result.success).toBe(true)
}
```

### Error Recovery Workflows

```javascript
async function testErrorRecovery() {
  const result = await scenario('Error Recovery Workflow')
    .step('Try invalid command')
    .run('invalid-command')
    .expectFailure()
    .expectStderr(/Unknown command/)
    
    .step('Recover with help')
    .run('--help')
    .expectSuccess()
    .expectOutput('USAGE')
    
    .step('Continue with valid command')
    .run('--version')
    .expectSuccess()
    .expectOutput(/\d+\.\d+\.\d+/)
    
    .execute('local')
  
  expect(result.success).toBe(true)
}
```

### Conditional Workflows

```javascript
async function testConditionalWorkflow() {
  const result = await scenario('Conditional Workflow')
    .step('Check if daemon is running')
    .run('daemon', 'status')
    .expect((result) => {
      if (result.result.exitCode === 0) {
        result.expectOutput(/running/)
      } else {
        result.expectFailure()
      }
    })
    
    .step('Start daemon if not running', async ({ lastResult }) => {
      if (lastResult.result.exitCode !== 0) {
        const startResult = await runLocalCitty(['daemon', 'start'])
        startResult.expectSuccess()
        return startResult
      }
      return lastResult
    })
    
    .execute('local')
  
  expect(result.success).toBe(true)
}
```

## CI/CD Integration

### GitHub Actions Integration

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
        
    - name: Install dependencies
      run: npm install
      
    - name: Install citty-test-utils
      run: npm install citty-test-utils
      
    - name: Run CLI tests
      run: npm run test:cli
```

### Docker-based Testing

```dockerfile
# Dockerfile.test
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm install citty-test-utils

CMD ["npm", "run", "test:cli"]
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

## Custom Assertions

### Creating Custom Assertion Helpers

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

async function testWithCustomAssertions() {
  // Test version
  const versionResult = await runLocalCitty(['--version'])
  expectValidVersion(versionResult)
  
  // Test help
  const helpResult = await runLocalCitty(['--help'])
  expectHelpOutput(helpResult)
  
  // Test error
  const errorResult = await runLocalCitty(['invalid-command'])
  expectErrorOutput(errorResult, /Unknown command/)
}
```

### Scenario with Custom Assertions

```javascript
async function testWithCustomScenarioAssertions() {
  const result = await scenario('Custom Assertions Test')
    .step('Test version with custom assertion')
    .run('--version')
    .expect(expectValidVersion)
    
    .step('Test help with custom assertion')
    .run('--help')
    .expect(expectHelpOutput)
    
    .execute('local')
  
  expect(result.success).toBe(true)
}
```

## Advanced Patterns

### Retry Logic for Flaky Tests

```javascript
import { testUtils } from 'citty-test-utils'

async function testWithRetry() {
  const result = await testUtils.retry(async () => {
    const result = await runLocalCitty(['daemon', 'status'])
    result.expectSuccess()
    return result
  }, 5, 2000)  // 5 attempts, 2 second delay
  
  result.expectOutput(/running|stopped/)
}
```

### Parallel Testing

```javascript
async function testParallelCommands() {
  const commands = [
    ['--help'],
    ['--version'],
    ['status']
  ]
  
  const results = await Promise.all(
    commands.map(cmd => runLocalCitty(cmd))
  )
  
  results.forEach(result => {
    result.expectSuccess()
  })
}
```

### Dynamic Test Generation

```javascript
async function testDynamicCommands() {
  const commands = await getAvailableCommands()  // Your function
  
  for (const cmd of commands) {
    const result = await runLocalCitty([cmd, '--help'])
    
    result
      .expectSuccess()
      .expectOutputLength(10, 5000)
  }
}
```

These cookbooks provide ready-to-use patterns for common testing scenarios. Adapt them to your specific needs and GitVan CLI commands.
