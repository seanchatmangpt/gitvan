# Examples

This chapter provides comprehensive examples of testing GitVan applications using `citty-test-utils`. These examples demonstrate real-world testing scenarios and patterns.

## Basic Examples

### Simple Command Testing

```javascript
// tests/basic/help-version.test.mjs
import { describe, it } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

describe('Basic CLI Commands', () => {
  it('should show help', async () => {
    const result = await runLocalCitty(['--help'])
    
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectOutput(/gitvan/)
      .expectNoStderr()
  })
  
  it('should show version', async () => {
    const result = await runLocalCitty(['--version'])
    
    result
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
      .expectOutputLength(1, 20)
      .expectNoStderr()
  })
  
  it('should handle invalid command', async () => {
    const result = await runLocalCitty(['invalid-command'])
    
    result
      .expectFailure()
      .expectStderr(/Unknown command/)
      .expectNoOutput()
  })
})
```

### Error Testing

```javascript
// tests/basic/error-handling.test.mjs
import { describe, it } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

describe('Error Handling', () => {
  it('should fail with missing arguments', async () => {
    const result = await runLocalCitty(['init'])
    
    result
      .expectFailure()
      .expectStderr(/required|missing/i)
  })
  
  it('should fail with invalid options', async () => {
    const result = await runLocalCitty(['--invalid-option'])
    
    result
      .expectFailure()
      .expectStderr(/Unknown option/)
  })
  
  it('should handle permission errors gracefully', async () => {
    const result = await runLocalCitty(['daemon', 'start'])
    
    // Accept different exit codes due to permissions
    if (result.result.exitCode === 0) {
      result.expectSuccess()
    } else {
      result.expectFailure().expectExitCodeIn([1, 2, 13])
    }
  })
})
```

## Intermediate Examples

### Workflow Testing

```javascript
// tests/intermediate/workflow.test.mjs
import { describe, it, beforeAll, afterAll } from 'vitest'
import { scenario } from 'citty-test-utils'

describe('Workflow Testing', () => {
  it('should handle complete project workflow', async () => {
    const result = await scenario('Project Workflow')
      .step('Initialize project')
      .run('init', 'workflow-test')
      .expectSuccess()
      .expectOutput(/Initialized/)
      
      .step('Check project status')
      .run('status')
      .expectSuccess()
      .expectOutput(/workflow-test/)
      
      .step('Install dependencies')
      .run('pack', 'install')
      .expectSuccess()
      .expectOutput(/Installed/)
      
      .step('Build project')
      .run('build')
      .expectSuccess()
      .expectOutput(/Build complete/)
      
      .execute('local')
    
    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(4)
  })
  
  it('should handle error recovery workflow', async () => {
    const result = await scenario('Error Recovery')
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
  })
})
```

### Environment Testing

```javascript
// tests/intermediate/environment.test.mjs
import { describe, it } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

describe('Environment Testing', () => {
  it('should work with different Node environments', async () => {
    const environments = [
      { NODE_ENV: 'development' },
      { NODE_ENV: 'production' },
      { NODE_ENV: 'test' }
    ]
    
    for (const env of environments) {
      const result = await runLocalCitty(['--help'], { env })
      
      result
        .expectSuccess()
        .expectOutput('USAGE')
        .expectNoStderr()
    }
  })
  
  it('should work with debug mode', async () => {
    const result = await runLocalCitty(['--help'], {
      env: { DEBUG: 'true' }
    })
    
    result
      .expectSuccess()
      .expectOutput('USAGE')
  })
  
  it('should work with custom working directory', async () => {
    const result = await runLocalCitty(['status'], {
      cwd: process.cwd()
    })
    
    result.expectSuccess()
  })
})
```

## Advanced Examples

### Cleanroom Testing

```javascript
// tests/advanced/cleanroom.test.mjs
import { describe, it, beforeAll, afterAll } from 'vitest'
import { setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

describe('Cleanroom Testing', () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: '.' })
  })
  
  afterAll(async () => {
    await teardownCleanroom()
  })
  
  it('should work in cleanroom environment', async () => {
    const result = await runCitty(['--help'])
    
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectOutput(/gitvan/)
      .expectNoStderr()
  })
  
  it('should handle project initialization in cleanroom', async () => {
    const result = await runCitty(['init', 'cleanroom-test'])
    
    result
      .expectSuccess()
      .expectOutput(/Initialized/)
      .expectOutput(/cleanroom-test/)
  })
  
  it('should maintain state across commands in cleanroom', async () => {
    // Initialize project
    const initResult = await runCitty(['init', 'state-test'])
    initResult.expectSuccess()
    
    // Check status
    const statusResult = await runCitty(['status'])
    statusResult.expectSuccess().expectOutput(/state-test/)
  })
})
```

### Cross-Environment Testing

```javascript
// tests/advanced/cross-env.test.mjs
import { describe, it, beforeAll, afterAll } from 'vitest'
import { 
  runLocalCitty, 
  setupCleanroom, 
  runCitty, 
  teardownCleanroom 
} from 'citty-test-utils'

describe('Cross-Environment Testing', () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: '.' })
  })
  
  afterAll(async () => {
    await teardownCleanroom()
  })
  
  it('should produce consistent results across environments', async () => {
    const commands = ['--help', '--version', 'status']
    
    for (const cmd of commands) {
      // Test locally
      const localResult = await runLocalCitty(cmd)
      
      // Test in cleanroom
      const cleanroomResult = await runCitty(cmd)
      
      // Compare results
      expect(localResult.result.exitCode).toBe(cleanroomResult.result.exitCode)
      expect(localResult.result.stdout).toBe(cleanroomResult.result.stdout)
    }
  })
  
  it('should handle environment-specific behavior', async () => {
    // Test daemon status (might behave differently in container)
    const localResult = await runLocalCitty(['daemon', 'status'])
    const cleanroomResult = await runCitty(['daemon', 'status'])
    
    // Both should be valid responses, but might differ
    expect([0, 1, 2]).toContain(localResult.result.exitCode)
    expect([0, 1, 2]).toContain(cleanroomResult.result.exitCode)
  })
})
```

### Performance Testing

```javascript
// tests/advanced/performance.test.mjs
import { describe, it } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

describe('Performance Testing', () => {
  it('should execute commands within performance limits', async () => {
    const performanceTests = [
      { command: ['--help'], maxDuration: 1000 },
      { command: ['--version'], maxDuration: 500 },
      { command: ['status'], maxDuration: 2000 }
    ]
    
    for (const { command, maxDuration } of performanceTests) {
      const result = await runLocalCitty(command)
      
      result
        .expectSuccess()
        .expectDuration(maxDuration)
    }
  })
  
  it('should handle concurrent execution', async () => {
    const promises = Array.from({ length: 10 }, () => 
      runLocalCitty(['--help'])
    )
    
    const results = await Promise.all(promises)
    
    // All should succeed
    results.forEach(result => {
      result.expectSuccess().expectOutput('USAGE')
    })
  })
  
  it('should maintain performance under load', async () => {
    const iterations = 50
    const startTime = Date.now()
    
    for (let i = 0; i < iterations; i++) {
      const result = await runLocalCitty(['--version'])
      result.expectSuccess()
    }
    
    const totalTime = Date.now() - startTime
    const avgTime = totalTime / iterations
    
    expect(avgTime).toBeLessThan(100)  // Average should be under 100ms
  })
})
```

## Enterprise Examples

### Custom Test Framework

```javascript
// tests/enterprise/test-framework.mjs
import { runLocalCitty, setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

class GitVanTestFramework {
  constructor() {
    this.results = []
    this.cleanroomSetup = false
  }
  
  async setup() {
    await setupCleanroom({ rootDir: '.' })
    this.cleanroomSetup = true
  }
  
  async teardown() {
    if (this.cleanroomSetup) {
      await teardownCleanroom()
      this.cleanroomSetup = false
    }
  }
  
  async testCommand(name, command, expectations) {
    console.log(`🧪 Testing: ${name}`)
    
    try {
      // Test locally
      const localResult = await runLocalCitty(command)
      await this.validateExpectations(localResult, expectations, 'local')
      
      // Test in cleanroom
      const cleanroomResult = await runCitty(command)
      await this.validateExpectations(cleanroomResult, expectations, 'cleanroom')
      
      this.results.push({ name, status: 'passed', environment: 'both' })
      console.log(`✅ ${name} passed`)
    } catch (error) {
      this.results.push({ name, status: 'failed', error: error.message })
      console.log(`❌ ${name} failed: ${error.message}`)
    }
  }
  
  async validateExpectations(result, expectations, environment) {
    if (expectations.success !== undefined) {
      if (expectations.success) {
        result.expectSuccess()
      } else {
        result.expectFailure()
      }
    }
    
    if (expectations.output) {
      result.expectOutput(expectations.output)
    }
    
    if (expectations.stderr) {
      result.expectStderr(expectations.stderr)
    }
    
    if (expectations.duration) {
      result.expectDuration(expectations.duration)
    }
  }
  
  generateReport() {
    const total = this.results.length
    const passed = this.results.filter(r => r.status === 'passed').length
    const failed = total - passed
    
    console.log('\n📊 Test Report:')
    console.log(`Total Tests: ${total}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Success Rate: ${(passed / total * 100).toFixed(2)}%`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => r.status === 'failed')
        .forEach(test => {
          console.log(`  ${test.name}: ${test.error}`)
        })
    }
    
    return { total, passed, failed, successRate: passed / total }
  }
}

// Usage
const framework = new GitVanTestFramework()

await framework.setup()

try {
  await framework.testCommand('Help Command', ['--help'], {
    success: true,
    output: 'USAGE',
    duration: 1000
  })
  
  await framework.testCommand('Version Command', ['--version'], {
    success: true,
    output: /\d+\.\d+\.\d+/,
    duration: 500
  })
  
  await framework.testCommand('Invalid Command', ['invalid-command'], {
    success: false,
    stderr: /Unknown command/
  })
} finally {
  await framework.teardown()
}

const report = framework.generateReport()
```

### Data-Driven Testing

```javascript
// tests/enterprise/data-driven.test.mjs
import { describe, it } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

// Test data
const testCases = [
  {
    name: 'Help Command',
    command: ['--help'],
    expectations: {
      success: true,
      output: 'USAGE',
      stderr: ''
    }
  },
  {
    name: 'Version Command',
    command: ['--version'],
    expectations: {
      success: true,
      output: /\d+\.\d+\.\d+/,
      stderr: ''
    }
  },
  {
    name: 'Status Command',
    command: ['status'],
    expectations: {
      success: true,
      output: /ready|running/,
      stderr: ''
    }
  },
  {
    name: 'Invalid Command',
    command: ['invalid-command'],
    expectations: {
      success: false,
      output: '',
      stderr: /Unknown command/
    }
  }
]

describe('Data-Driven Tests', () => {
  testCases.forEach(testCase => {
    it(`should handle ${testCase.name}`, async () => {
      const result = await runLocalCitty(testCase.command)
      
      if (testCase.expectations.success) {
        result.expectSuccess()
      } else {
        result.expectFailure()
      }
      
      if (testCase.expectations.output) {
        result.expectOutput(testCase.expectations.output)
      }
      
      if (testCase.expectations.stderr) {
        if (testCase.expectations.stderr === '') {
          result.expectNoStderr()
        } else {
          result.expectStderr(testCase.expectations.stderr)
        }
      }
    })
  })
})
```

### Scenario-Based Testing

```javascript
// tests/enterprise/scenario-based.test.mjs
import { describe, it } from 'vitest'
import { scenario, scenarios } from 'citty-test-utils'

describe('Scenario-Based Testing', () => {
  it('should handle user onboarding scenario', async () => {
    const result = await scenario('User Onboarding')
      .step('User discovers GitVan')
      .run('--help')
      .expectSuccess()
      .expectOutput('USAGE')
      
      .step('User checks version')
      .run('--version')
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
      
      .step('User initializes project')
      .run('init', 'onboarding-test')
      .expectSuccess()
      .expectOutput(/Initialized/)
      
      .step('User checks project status')
      .run('status')
      .expectSuccess()
      .expectOutput(/onboarding-test/)
      
      .step('User installs dependencies')
      .run('pack', 'install')
      .expectSuccess()
      .expectOutput(/Installed/)
      
      .execute('local')
    
    expect(result.success).toBe(true)
    expect(result.results).toHaveLength(5)
  })
  
  it('should handle error recovery scenario', async () => {
    const result = await scenario('Error Recovery')
      .step('User makes mistake')
      .run('invalid-command')
      .expectFailure()
      .expectStderr(/Unknown command/)
      
      .step('User seeks help')
      .run('--help')
      .expectSuccess()
      .expectOutput('USAGE')
      
      .step('User tries again with correct command')
      .run('--version')
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
      
      .execute('local')
    
    expect(result.success).toBe(true)
  })
  
  it('should use pre-built scenarios', async () => {
    const scenarios = [
      scenarios.help(),
      scenarios.version(),
      scenarios.invalidCommand()
    ]
    
    for (const scenario of scenarios) {
      const result = await scenario.execute('local')
      expect(result.success).toBe(true)
    }
  })
})
```

## Integration Examples

### CI/CD Integration

```javascript
// tests/integration/ci-cd.test.mjs
import { describe, it } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

describe('CI/CD Integration', () => {
  it('should work in CI environment', async () => {
    // Simulate CI environment
    const ciEnv = {
      CI: 'true',
      NODE_ENV: 'test',
      GITHUB_ACTIONS: 'true'
    }
    
    const result = await runLocalCitty(['--help'], { env: ciEnv })
    
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectNoStderr()
  })
  
  it('should handle CI timeout constraints', async () => {
    const result = await runLocalCitty(['--help'], {
      timeout: 30000  // CI timeout
    })
    
    result
      .expectSuccess()
      .expectDuration(30000)  // Should complete within CI timeout
  })
  
  it('should work with different Node versions', async () => {
    const nodeVersions = ['18', '20']
    
    for (const version of nodeVersions) {
      const result = await runLocalCitty(['--version'], {
        env: { NODE_VERSION: version }
      })
      
      result.expectSuccess()
    }
  })
})
```

### Docker Integration

```javascript
// tests/integration/docker.test.mjs
import { describe, it, beforeAll, afterAll } from 'vitest'
import { setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

describe('Docker Integration', () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: '.' })
  })
  
  afterAll(async () => {
    await teardownCleanroom()
  })
  
  it('should work in Docker container', async () => {
    const result = await runCitty(['--help'])
    
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectNoStderr()
  })
  
  it('should handle container resource limits', async () => {
    const result = await runCitty(['--version'])
    
    result
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
      .expectDuration(5000)  // Should complete within container limits
  })
  
  it('should maintain state in container', async () => {
    // Initialize project in container
    const initResult = await runCitty(['init', 'docker-test'])
    initResult.expectSuccess()
    
    // Check status in same container
    const statusResult = await runCitty(['status'])
    statusResult.expectSuccess().expectOutput(/docker-test/)
  })
})
```

## Summary

These examples demonstrate:

1. **Basic testing** - Simple command and error testing
2. **Intermediate patterns** - Workflow and environment testing
3. **Advanced techniques** - Cleanroom and cross-environment testing
4. **Enterprise patterns** - Custom frameworks and data-driven testing
5. **Integration scenarios** - CI/CD and Docker integration

Use these examples as templates for your own testing scenarios. Adapt them to your specific needs and GitVan CLI commands.

---

**Congratulations!** You've completed the Testing GitVan guide. You now have comprehensive knowledge of testing GitVan applications with `citty-test-utils`.
