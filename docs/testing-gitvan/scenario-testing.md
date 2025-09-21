# Scenario Testing

This chapter covers testing complex multi-step GitVan workflows using the Scenario DSL. Scenario testing allows you to build sophisticated test workflows with step-by-step execution, custom actions, and detailed logging.

## Overview

Scenario testing uses a Domain Specific Language (DSL) to define complex multi-step test workflows. It's ideal for:

- **Complex workflows** - Multi-step command sequences
- **Integration testing** - Testing command interactions
- **User journey testing** - End-to-end user workflows
- **State management** - Testing state changes across steps

## Basic Scenario Testing

### Simple Scenario

```javascript
import { scenario } from 'citty-test-utils'

// Basic scenario with multiple steps
const result = await scenario('Help and Version')
  .step('Get help')
  .run('--help')
  .expectSuccess()
  .expectOutput('USAGE')
  .step('Get version')
  .run(['--version'])
  .expectSuccess()
  .expectOutput(/\d+\.\d+\.\d+/)
  .execute('local')

console.log('Scenario success:', result.success)
console.log('Steps completed:', result.results.length)
```

### Scenario with Error Handling

```javascript
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
```

## Advanced Scenario Testing

### Custom Actions

Execute custom logic within scenarios:

```javascript
const result = await scenario('Custom Workflow')
  .step('Custom setup', async ({ lastResult, context }) => {
    // Custom logic here
    context.setupComplete = true
    context.startTime = Date.now()
    return { success: true, data: 'processed' }
  })
  .step('Run command')
  .run('--help')
  .expectSuccess()
  .step('Custom validation', async ({ lastResult, context }) => {
    // Validate custom conditions
    expect(context.setupComplete).toBe(true)
    expect(Date.now() - context.startTime).toBeLessThan(5000)
    return { success: true }
  })
  .execute('local')
```

### Environment-Specific Scenarios

Use different environments for different scenarios:

```javascript
// Local scenario
const localResult = await localScenario('Local Development')
  .step('Start dev server')
  .run('dev', { env: { NODE_ENV: 'development' } })
  .expectSuccess()
  .expectOutput(/Development server/)
  .execute()

// Cleanroom scenario
const cleanroomResult = await cleanroomScenario('Cleanroom Testing')
  .step('Test in isolation')
  .run('--help')
  .expectSuccess()
  .expectOutput('USAGE')
  .execute()
```

### Conditional Workflows

Build conditional logic into scenarios:

```javascript
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
```

## Pre-built Scenarios

### Using Pre-built Templates

```javascript
import { scenarios } from 'citty-test-utils'

// Help scenario
const helpResult = await scenarios.help().execute('local')
expect(helpResult.success).toBe(true)

// Version scenario
const versionResult = await scenarios.version().execute('local')
expect(versionResult.success).toBe(true)

// Invalid command scenario
const errorResult = await scenarios.invalidCommand().execute('local')
expect(errorResult.success).toBe(true)

// Project initialization scenario
const initResult = await scenarios.initProject('my-project').execute('local')
expect(initResult.success).toBe(true)

// Build and test scenario
const buildResult = await scenarios.buildAndTest().execute('local')
expect(buildResult.success).toBe(true)
```

### Customizing Pre-built Scenarios

```javascript
// Customize help scenario
const customHelpResult = await scenarios.help({
  timeout: 10000,
  env: { DEBUG: 'true' }
}).execute('local')

// Customize init scenario
const customInitResult = await scenarios.initProject('custom-project', {
  timeout: 30000,
  env: { NODE_ENV: 'production' }
}).execute('local')
```

## Complex Workflow Patterns

### Multi-Environment Testing

```javascript
async function testMultiEnvironment() {
  const environments = ['local', 'cleanroom']
  const results = []
  
  for (const env of environments) {
    const result = await scenario('Cross-Environment Test')
      .step('Get help')
      .run('--help')
      .expectSuccess()
      .expectOutput('USAGE')
      .step('Get version')
      .run('--version')
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
      .execute(env)
    
    results.push({ environment: env, result })
  }
  
  // Compare results across environments
  expect(results[0].result.results[0].result.stdout).toBe(
    results[1].result.results[0].result.stdout
  )
}
```

### State Management

```javascript
const result = await scenario('State Management')
  .step('Check initial state')
  .run('status')
  .expectSuccess()
  .step('Change state')
  .run('init', 'test-project')
  .expectSuccess()
  .expectOutput(/Initialized/)
  .step('Verify state change')
  .run('status')
  .expectSuccess()
  .expectOutput(/test-project/)
  .execute('local')
```

### Retry Logic

```javascript
import { testUtils } from 'citty-test-utils'

const result = await scenario('Retry Workflow')
  .step('Flaky operation', async () => {
    return await testUtils.retry(async () => {
      const result = await runLocalCitty(['daemon', 'status'])
      result.expectSuccess()
      return result
    }, 3, 2000)
  })
  .step('Continue workflow')
  .run('--help')
  .expectSuccess()
  .execute('local')
```

## Test Organization

### File Structure

Organize scenario tests:

```
tests/
├── scenarios/
│   ├── basic/
│   │   ├── help-version.test.mjs
│   │   └── error-recovery.test.mjs
│   ├── workflows/
│   │   ├── init-workflow.test.mjs
│   │   └── build-workflow.test.mjs
│   └── integration/
│       ├── cross-env.test.mjs
│       └── state-management.test.mjs
```

### Test Categories

#### Basic Scenarios

```javascript
// tests/scenarios/basic/help-version.test.mjs
import { describe, it } from 'vitest'
import { scenario } from 'citty-test-utils'

describe('Basic Scenarios', () => {
  it('help and version workflow', async () => {
    const result = await scenario('Help and Version')
      .step('Get help')
      .run('--help')
      .expectSuccess()
      .expectOutput('USAGE')
      .step('Get version')
      .run('--version')
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
      .execute('local')
    
    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(2)
  })
})
```

#### Workflow Scenarios

```javascript
// tests/scenarios/workflows/init-workflow.test.mjs
import { describe, it } from 'vitest'
import { scenario } from 'citty-test-utils'

describe('Init Workflow', () => {
  it('complete initialization workflow', async () => {
    const result = await scenario('Project Initialization')
      .step('Initialize project')
      .run('init', 'workflow-test')
      .expectSuccess()
      .expectOutput(/Initialized/)
      .step('Check status')
      .run('status')
      .expectSuccess()
      .expectOutput(/workflow-test/)
      .step('Install dependencies')
      .run('pack', 'install')
      .expectSuccess()
      .expectOutput(/Installed/)
      .execute('local')
    
    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(3)
  })
})
```

#### Integration Scenarios

```javascript
// tests/scenarios/integration/cross-env.test.mjs
import { describe, it } from 'vitest'
import { scenario } from 'citty-test-utils'

describe('Cross-Environment Integration', () => {
  it('consistent behavior across environments', async () => {
    const environments = ['local', 'cleanroom']
    const results = []
    
    for (const env of environments) {
      const result = await scenario('Cross-Environment Test')
        .step('Get help')
        .run('--help')
        .expectSuccess()
        .expectOutput('USAGE')
        .step('Get version')
        .run('--version')
        .expectSuccess()
        .expectOutput(/\d+\.\d+\.\d+/)
        .execute(env)
      
      results.push({ environment: env, result })
    }
    
    // Verify consistency
    expect(results[0].result.results[0].result.stdout).toBe(
      results[1].result.results[0].result.stdout
    )
  })
})
```

## Custom Scenario Builders

### Creating Custom Builders

```javascript
// custom-scenario-builders.mjs
export function projectScenario(projectName) {
  return scenario(`Project ${projectName}`)
    .step('Initialize project')
    .run('init', projectName)
    .expectSuccess()
    .expectOutput(/Initialized/)
    .step('Check status')
    .run('status')
    .expectSuccess()
    .expectOutput(projectName)
}

export function buildScenario() {
  return scenario('Build Process')
    .step('Install dependencies')
    .run('pack', 'install')
    .expectSuccess()
    .expectOutput(/Installed/)
    .step('Build project')
    .run('build')
    .expectSuccess()
    .expectOutput(/Build complete/)
    .step('Run tests')
    .run('test')
    .expectSuccess()
    .expectOutput(/Tests passed/)
}
```

### Using Custom Builders

```javascript
import { projectScenario, buildScenario } from './custom-scenario-builders.mjs'

// Use custom project scenario
const projectResult = await projectScenario('my-app').execute('local')
expect(projectResult.success).toBe(true)

// Use custom build scenario
const buildResult = await buildScenario().execute('local')
expect(buildResult.success).toBe(true)
```

## Performance Testing

### Load Testing with Scenarios

```javascript
async function testScenarioLoad() {
  const concurrency = 5
  const iterations = 10
  
  const promises = []
  
  for (let i = 0; i < iterations; i++) {
    promises.push(
      scenario(`Load Test ${i}`)
        .step('Get help')
        .run('--help')
        .expectSuccess()
        .step('Get version')
        .run('--version')
        .expectSuccess()
        .execute('local')
    )
    
    if (promises.length >= concurrency) {
      const results = await Promise.all(promises)
      results.forEach(result => expect(result.success).toBe(true))
      promises.length = 0
    }
  }
  
  // Handle remaining promises
  if (promises.length > 0) {
    const results = await Promise.all(promises)
    results.forEach(result => expect(result.success).toBe(true))
  }
}
```

### Performance Monitoring

```javascript
const result = await scenario('Performance Test')
  .step('Quick command', async () => {
    const start = Date.now()
    const result = await runLocalCitty(['--version'])
    const duration = Date.now() - start
    expect(duration).toBeLessThan(1000)
    return result
  })
  .step('Slow command', async () => {
    const start = Date.now()
    const result = await runLocalCitty(['build'])
    const duration = Date.now() - start
    expect(duration).toBeLessThan(30000)
    return result
  })
  .execute('local')
```

## Debugging Scenarios

### Verbose Logging

```javascript
const result = await scenario('Debug Workflow')
  .step('Debug step', async ({ lastResult, context }) => {
    console.log('Last result:', lastResult)
    console.log('Context:', context)
    console.log('Step completed at:', new Date().toISOString())
    return { success: true }
  })
  .step('Continue workflow')
  .run('--help')
  .expectSuccess()
  .execute('local')
```

### Step-by-Step Debugging

```javascript
const result = await scenario('Step Debug')
  .step('Step 1', async ({ lastResult, context }) => {
    console.log('Step 1 - Last result:', lastResult?.result?.stdout)
    const result = await runLocalCitty(['--help'])
    result.expectSuccess()
    return result
  })
  .step('Step 2', async ({ lastResult, context }) => {
    console.log('Step 2 - Last result:', lastResult?.result?.stdout)
    const result = await runLocalCitty(['--version'])
    result.expectSuccess()
    return result
  })
  .execute('local')
```

## Best Practices

### 1. Clear Step Descriptions

Use descriptive step names:

```javascript
// Good: Clear descriptions
const result = await scenario('Project Setup')
  .step('Initialize new project')
  .run('init', 'my-project')
  .expectSuccess()
  .step('Install project dependencies')
  .run('pack', 'install')
  .expectSuccess()
  .step('Verify project status')
  .run('status')
  .expectSuccess()
  .execute('local')

// Bad: Vague descriptions
const result = await scenario('Test')
  .step('Step 1')
  .run('init', 'my-project')
  .expectSuccess()
  .step('Step 2')
  .run('pack', 'install')
  .expectSuccess()
  .execute('local')
```

### 2. Proper Error Handling

Handle errors gracefully:

```javascript
const result = await scenario('Error Handling')
  .step('Try invalid command')
  .run('invalid-command')
  .expectFailure()
  .expectStderr(/Unknown command/)
  .step('Recover gracefully')
  .run('--help')
  .expectSuccess()
  .execute('local')
```

### 3. State Management

Manage state across steps:

```javascript
const result = await scenario('State Management')
  .step('Check initial state')
  .run('status')
  .expectSuccess()
  .step('Change state')
  .run('init', 'test-project')
  .expectSuccess()
  .step('Verify state change')
  .run('status')
  .expectSuccess()
  .expectOutput(/test-project/)
  .execute('local')
```

### 4. Resource Cleanup

Clean up resources properly:

```javascript
const result = await scenario('Resource Management')
  .step('Setup resources', async () => {
    await setupCleanroom({ rootDir: '.' })
    return { success: true }
  })
  .step('Use resources')
  .run('--help')
  .expectSuccess()
  .step('Cleanup resources', async () => {
    await teardownCleanroom()
    return { success: true }
  })
  .execute('local')
```

## Common Issues

### Scenario Execution Failed

**Error:** `Scenario execution failed`

**Solution:** Check step definitions and error handling

### Custom Action Errors

**Error:** `Custom action failed`

**Solution:** Ensure custom actions return proper results

### Environment Issues

**Error:** `Environment not available`

**Solution:** Check environment setup and Docker availability

### State Management Issues

**Error:** `State not preserved between steps`

**Solution:** Use context parameter to maintain state

## Summary

Scenario testing provides:

1. **Complex workflows** - Multi-step test sequences
2. **Custom actions** - Execute custom logic within scenarios
3. **Environment switching** - Test across different environments
4. **State management** - Maintain state across steps
5. **Detailed logging** - Step-by-step execution tracking

Scenario testing is essential for:
- Complex integration testing
- End-to-end workflows
- User journey testing
- State management testing

For advanced testing patterns and enterprise strategies, see [Advanced Patterns](./advanced-patterns.md).

---

**Ready for advanced patterns?** Let's explore [Advanced Patterns](./advanced-patterns.md)!
