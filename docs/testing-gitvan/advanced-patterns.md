# Advanced Patterns

This chapter covers advanced testing patterns and enterprise strategies for testing GitVan applications. These patterns are designed for complex, large-scale testing scenarios.

## Overview

Advanced patterns include:

- **Enterprise testing frameworks** - Custom test frameworks
- **Performance benchmarking** - Load testing and profiling
- **Security testing** - Input validation and security patterns
- **Data-driven testing** - CSV and database-driven tests
- **Parallel execution** - Concurrent testing strategies
- **Custom assertions** - Domain-specific validation

## Enterprise Testing Frameworks

### Multi-Environment Test Suite

```javascript
// enterprise-test-suite.mjs
import { 
  runLocalCitty, 
  setupCleanroom, 
  runCitty, 
  teardownCleanroom,
  scenario,
  testUtils
} from 'citty-test-utils'

class MultiEnvironmentTestSuite {
  constructor() {
    this.environments = ['local', 'cleanroom']
    this.testResults = new Map()
  }
  
  async runTest(testName, testFn) {
    console.log(`🧪 Running ${testName} across environments...`)
    
    for (const env of this.environments) {
      try {
        const result = await this.runInEnvironment(env, testFn)
        this.testResults.set(`${testName}-${env}`, result)
        console.log(`✅ ${testName} passed in ${env}`)
      } catch (error) {
        console.error(`❌ ${testName} failed in ${env}:`, error.message)
        this.testResults.set(`${testName}-${env}`, { success: false, error })
      }
    }
  }
  
  async runInEnvironment(env, testFn) {
    if (env === 'cleanroom') {
      await setupCleanroom({ rootDir: '.' })
      try {
        return await testFn('cleanroom')
      } finally {
        await teardownCleanroom()
      }
    } else {
      return await testFn('local')
    }
  }
  
  generateReport() {
    console.log('\n📊 Test Report:')
    for (const [test, result] of this.testResults) {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${test}`)
    }
  }
}

// Usage
const testSuite = new MultiEnvironmentTestSuite()

await testSuite.runTest('Help Command', async (env) => {
  const runner = env === 'cleanroom' ? runCitty : runLocalCitty
  const result = await runner(['--help'])
  
  result
    .expectSuccess()
    .expectOutput('USAGE')
    .expectNoStderr()
  
  return { success: true, result }
})

testSuite.generateReport()
```

### Test Configuration Management

```javascript
// test-config.mjs
export class TestConfig {
  constructor() {
    this.configs = {
      development: {
        env: { NODE_ENV: 'development' },
        timeout: 30000,
        retries: 3
      },
      production: {
        env: { NODE_ENV: 'production' },
        timeout: 60000,
        retries: 5
      },
      testing: {
        env: { NODE_ENV: 'test' },
        timeout: 10000,
        retries: 1
      }
    }
  }
  
  getConfig(environment) {
    return this.configs[environment] || this.configs.testing
  }
  
  async runWithConfig(environment, command, testFn) {
    const config = this.getConfig(environment)
    
    return await testUtils.retry(async () => {
      const result = await runLocalCitty(command, config)
      return await testFn(result)
    }, config.retries, 1000)
  }
}

// Usage
const testConfig = new TestConfig()

// Test in different environments
const environments = ['development', 'production', 'testing']

for (const env of environments) {
  console.log(`Testing in ${env} environment...`)
  
  await testConfig.runWithConfig(env, ['--help'], (result) => {
    result.expectSuccess().expectOutput('USAGE')
  })
}
```

### Behavior-Driven Testing Framework

```javascript
// bdd-framework.mjs
export class BDDFramework {
  constructor() {
    this.features = []
    this.currentFeature = null
    this.currentScenario = null
  }
  
  feature(name, description) {
    this.currentFeature = { name, description, scenarios: [] }
    this.features.push(this.currentFeature)
    return this
  }
  
  scenario(name, description) {
    this.currentScenario = { name, description, steps: [] }
    this.currentFeature.scenarios.push(this.currentScenario)
    return this
  }
  
  given(description, action) {
    this.currentScenario.steps.push({ type: 'given', description, action })
    return this
  }
  
  when(description, action) {
    this.currentScenario.steps.push({ type: 'when', description, action })
    return this
  }
  
  then(description, assertion) {
    this.currentScenario.steps.push({ type: 'then', description, assertion })
    return this
  }
  
  async execute() {
    console.log('🚀 Executing BDD Test Suite...')
    
    for (const feature of this.features) {
      console.log(`\n📋 Feature: ${feature.name}`)
      console.log(`   ${feature.description}`)
      
      for (const scenario of feature.scenarios) {
        console.log(`\n  🎬 Scenario: ${scenario.name}`)
        console.log(`     ${scenario.description}`)
        
        try {
          await this.executeScenario(scenario)
          console.log(`     ✅ Scenario passed`)
        } catch (error) {
          console.log(`     ❌ Scenario failed: ${error.message}`)
        }
      }
    }
  }
  
  async executeScenario(scenario) {
    let context = {}
    
    for (const step of scenario.steps) {
      console.log(`     ${step.type.toUpperCase()}: ${step.description}`)
      
      if (step.action) {
        context = await step.action(context)
      }
      
      if (step.assertion) {
        await step.assertion(context)
      }
    }
  }
}

// Usage
const bdd = new BDDFramework()

bdd
  .feature('CLI Help System', 'As a user, I want to get help information')
  .scenario('User requests help', 'User runs help command')
  .given('a user wants to understand GitVan commands', (ctx) => {
    ctx.user = { needsHelp: true }
    return ctx
  })
  .when('the user runs help command', async (ctx) => {
    ctx.result = await runLocalCitty(['--help'])
    return ctx
  })
  .then('the system should display help information', (ctx) => {
    ctx.result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectOutput(/gitvan/)
  })

await bdd.execute()
```

## Performance Benchmarking

### Command Performance Profiler

```javascript
// profiler.mjs
export class CommandProfiler {
  constructor() {
    this.profiles = new Map()
  }
  
  async profile(command, iterations = 10) {
    console.log(`🔬 Profiling command: ${command.join(' ')}`)
    
    const results = []
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now()
      const startMemory = process.memoryUsage()
      
      const result = await runLocalCitty(command)
      
      const endTime = Date.now()
      const endMemory = process.memoryUsage()
      
      results.push({
        iteration: i + 1,
        duration: endTime - startTime,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
        exitCode: result.result.exitCode,
        outputLength: result.result.stdout.length
      })
    }
    
    const profile = this.calculateProfile(results)
    this.profiles.set(command.join(' '), profile)
    
    console.log(`✅ Profiled ${command.join(' ')}`)
    return profile
  }
  
  calculateProfile(results) {
    const durations = results.map(r => r.duration)
    const memoryDeltas = results.map(r => r.memoryDelta)
    
    return {
      command: results[0] ? results[0].command : 'unknown',
      iterations: results.length,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b) / durations.length,
        median: this.median(durations)
      },
      memory: {
        min: Math.min(...memoryDeltas),
        max: Math.max(...memoryDeltas),
        avg: memoryDeltas.reduce((a, b) => a + b) / memoryDeltas.length
      },
      consistency: {
        exitCodeConsistent: results.every(r => r.exitCode === results[0].exitCode),
        outputLengthVariance: this.variance(results.map(r => r.outputLength))
      }
    }
  }
  
  median(arr) {
    const sorted = arr.slice().sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid]
  }
  
  variance(arr) {
    const mean = arr.reduce((a, b) => a + b) / arr.length
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length
  }
  
  generateReport() {
    console.log('\n📊 Performance Profile Report:')
    
    for (const [command, profile] of this.profiles) {
      console.log(`\n🔧 ${command}:`)
      console.log(`  Duration: ${profile.duration.avg.toFixed(2)}ms avg (${profile.duration.min}-${profile.duration.max}ms)`)
      console.log(`  Memory: ${profile.memory.avg.toFixed(2)} bytes avg`)
      console.log(`  Consistency: ${profile.consistency.exitCodeConsistent ? '✅' : '❌'}`)
    }
  }
}

// Usage
const profiler = new CommandProfiler()

await profiler.profile(['--help'], 20)
await profiler.profile(['--version'], 20)
await profiler.profile(['status'], 20)

profiler.generateReport()
```

### Load Testing Framework

```javascript
// load-tester.mjs
export class LoadTester {
  constructor() {
    this.results = []
  }
  
  async loadTest(command, concurrency = 10, duration = 30000) {
    console.log(`🚀 Load testing: ${command.join(' ')}`)
    console.log(`   Concurrency: ${concurrency}`)
    console.log(`   Duration: ${duration}ms`)
    
    const startTime = Date.now()
    const promises = []
    
    // Create concurrent workers
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.worker(command, startTime, duration))
    }
    
    const workerResults = await Promise.all(promises)
    
    // Flatten results
    this.results = workerResults.flat()
    
    return this.generateLoadReport()
  }
  
  async worker(command, startTime, duration) {
    const results = []
    
    while (Date.now() - startTime < duration) {
      const iterationStart = Date.now()
      
      try {
        const result = await runLocalCitty(command)
        const iterationEnd = Date.now()
        
        results.push({
          success: true,
          duration: iterationEnd - iterationStart,
          exitCode: result.result.exitCode,
          timestamp: iterationStart
        })
      } catch (error) {
        const iterationEnd = Date.now()
        
        results.push({
          success: false,
          duration: iterationEnd - iterationStart,
          error: error.message,
          timestamp: iterationStart
        })
      }
    }
    
    return results
  }
  
  generateLoadReport() {
    const total = this.results.length
    const successful = this.results.filter(r => r.success).length
    const failed = total - successful
    
    const durations = this.results.map(r => r.duration)
    const avgDuration = durations.reduce((a, b) => a + b) / durations.length
    
    const throughput = total / (this.results[this.results.length - 1].timestamp - this.results[0].timestamp) * 1000
    
    console.log('\n📊 Load Test Report:')
    console.log(`Total Requests: ${total}`)
    console.log(`Successful: ${successful}`)
    console.log(`Failed: ${failed}`)
    console.log(`Success Rate: ${(successful / total * 100).toFixed(2)}%`)
    console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`)
    console.log(`Throughput: ${throughput.toFixed(2)} requests/second`)
    
    return {
      total,
      successful,
      failed,
      successRate: successful / total,
      avgDuration,
      throughput
    }
  }
}

// Usage
const loadTester = new LoadTester()

await loadTester.loadTest(['--help'], 20, 10000)  // 20 concurrent, 10 seconds
await loadTester.loadTest(['--version'], 50, 15000)  // 50 concurrent, 15 seconds
```

## Security Testing

### Input Validation Testing

```javascript
// security-tester.mjs
export class SecurityTester {
  constructor() {
    this.maliciousInputs = [
      '; rm -rf /',
      '$(whoami)',
      '`cat /etc/passwd`',
      '${HOME}',
      '..\\..\\..\\windows\\system32',
      '<script>alert("xss")</script>',
      'SELECT * FROM users',
      'eval("malicious code")'
    ]
  }
  
  async testCommandInjection(command) {
    console.log(`🔒 Testing command injection for: ${command.join(' ')}`)
    
    for (const maliciousInput of this.maliciousInputs) {
      try {
        const result = await runLocalCitty([...command, maliciousInput])
        
        // Should fail safely or not execute malicious code
        if (result.result.exitCode === 0) {
          // Check if malicious input was executed
          if (result.result.stdout.includes('root') || 
              result.result.stdout.includes('system32') ||
              result.result.stdout.includes('alert')) {
            console.log(`⚠️  Potential security issue with input: ${maliciousInput}`)
          }
        }
        
        console.log(`✅ Input handled safely: ${maliciousInput.substring(0, 20)}...`)
      } catch (error) {
        console.log(`✅ Input rejected: ${maliciousInput.substring(0, 20)}...`)
      }
    }
  }
  
  async testPathTraversal() {
    console.log('🔒 Testing path traversal...')
    
    const traversalPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '/etc/shadow',
      'C:\\Windows\\System32\\config\\SAM'
    ]
    
    for (const path of traversalPaths) {
      try {
        const result = await runLocalCitty(['read', path])
        
        if (result.result.exitCode === 0 && 
            result.result.stdout.includes('root') ||
            result.result.stdout.includes('Administrator')) {
          console.log(`⚠️  Potential path traversal vulnerability: ${path}`)
        } else {
          console.log(`✅ Path traversal prevented: ${path}`)
        }
      } catch (error) {
        console.log(`✅ Path traversal blocked: ${path}`)
      }
    }
  }
}

// Usage
const securityTester = new SecurityTester()

await securityTester.testCommandInjection(['init'])
await securityTester.testCommandInjection(['pack', 'install'])
await securityTester.testPathTraversal()
```

## Data-Driven Testing

### CSV-Driven Test Suite

```javascript
// csv-tester.mjs
import { readFileSync } from 'fs'

export class CSVTestSuite {
  constructor(csvPath) {
    this.csvPath = csvPath
    this.testData = this.loadTestData()
  }
  
  loadTestData() {
    const csvContent = readFileSync(this.csvPath, 'utf8')
    const lines = csvContent.split('\n')
    const headers = lines[0].split(',')
    
    return lines.slice(1).map(line => {
      const values = line.split(',')
      const testCase = {}
      
      headers.forEach((header, index) => {
        testCase[header.trim()] = values[index]?.trim()
      })
      
      return testCase
    })
  }
  
  async runDataDrivenTests() {
    console.log(`📊 Running ${this.testData.length} data-driven tests...`)
    
    for (const testCase of this.testData) {
      console.log(`\n🧪 Test: ${testCase.name}`)
      
      try {
        const args = testCase.command.split(' ')
        const result = await runLocalCitty(args)
        
        // Validate expected exit code
        if (testCase.expectedExitCode) {
          result.expectExit(parseInt(testCase.expectedExitCode))
        }
        
        // Validate expected output
        if (testCase.expectedOutput) {
          result.expectOutput(testCase.expectedOutput)
        }
        
        // Validate expected stderr
        if (testCase.expectedStderr) {
          result.expectStderr(testCase.expectedStderr)
        }
        
        console.log(`✅ ${testCase.name} passed`)
      } catch (error) {
        console.log(`❌ ${testCase.name} failed: ${error.message}`)
      }
    }
  }
}

// CSV file: tests/data/test-cases.csv
// name,command,expectedExitCode,expectedOutput,expectedStderr
// Help Test,--help,0,USAGE,
// Version Test,--version,0,\d+\.\d+\.\d+,
// Invalid Command,invalid-command,1,,Unknown command

// Usage
const csvTester = new CSVTestSuite('tests/data/test-cases.csv')
await csvTester.runDataDrivenTests()
```

## Parallel Execution

### Parallel Test Runner

```javascript
// parallel-runner.mjs
export class ParallelTestRunner {
  constructor(maxConcurrency = 5) {
    this.maxConcurrency = maxConcurrency
    this.results = []
  }
  
  async runTestsInParallel(testSuites) {
    console.log(`🚀 Running ${testSuites.length} test suites in parallel...`)
    console.log(`   Max concurrency: ${this.maxConcurrency}`)
    
    const chunks = this.chunkArray(testSuites, this.maxConcurrency)
    
    for (const chunk of chunks) {
      const promises = chunk.map(suite => this.runTestSuite(suite))
      const chunkResults = await Promise.all(promises)
      this.results.push(...chunkResults)
    }
    
    return this.generateParallelReport()
  }
  
  chunkArray(array, chunkSize) {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
  
  async runTestSuite(suite) {
    const startTime = Date.now()
    
    try {
      await suite.run()
      const duration = Date.now() - startTime
      
      return {
        name: suite.name,
        success: true,
        duration,
        tests: suite.results?.length || 0
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      return {
        name: suite.name,
        success: false,
        duration,
        error: error.message
      }
    }
  }
  
  generateParallelReport() {
    const total = this.results.length
    const successful = this.results.filter(r => r.success).length
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    
    console.log('\n📊 Parallel Test Report:')
    console.log(`Total Suites: ${total}`)
    console.log(`Successful: ${successful}`)
    console.log(`Failed: ${total - successful}`)
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log(`Average Duration: ${(totalDuration / total).toFixed(2)}ms`)
    
    // Show individual results
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${result.name}: ${result.duration}ms`)
    })
    
    return {
      total,
      successful,
      failed: total - successful,
      totalDuration,
      avgDuration: totalDuration / total
    }
  }
}

// Usage
const parallelRunner = new ParallelTestRunner(3)

const testSuites = [
  { name: 'Help Tests', run: async () => { /* test suite */ } },
  { name: 'Version Tests', run: async () => { /* test suite */ } },
  { name: 'Error Tests', run: async () => { /* test suite */ } }
]

await parallelRunner.runTestsInParallel(testSuites)
```

## Custom Assertions

### Domain-Specific Assertions

```javascript
// custom-assertions.mjs
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

export function expectCommandSuccess(result, expectedOutput) {
  result
    .expectSuccess()
    .expectOutput(expectedOutput)
    .expectNoStderr()
    .expectDuration(5000)
  return result
}

// Usage
import { expectValidVersion, expectHelpOutput, expectErrorOutput } from './custom-assertions.mjs'

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

## Best Practices

### 1. Framework Design

Design reusable frameworks:

```javascript
// Good: Reusable framework
class TestFramework {
  constructor(config) {
    this.config = config
    this.results = []
  }
  
  async runTest(name, testFn) {
    // Framework logic
  }
  
  generateReport() {
    // Report generation
  }
}

// Bad: One-off test code
async function testSomething() {
  // Test logic mixed with framework logic
}
```

### 2. Performance Optimization

Optimize for performance:

```javascript
// Good: Parallel execution
const promises = testCases.map(testCase => runTest(testCase))
const results = await Promise.all(promises)

// Bad: Sequential execution
for (const testCase of testCases) {
  await runTest(testCase)
}
```

### 3. Error Handling

Handle errors gracefully:

```javascript
// Good: Comprehensive error handling
try {
  const result = await runTest()
  return { success: true, result }
} catch (error) {
  console.error('Test failed:', error.message)
  return { success: false, error: error.message }
}

// Bad: No error handling
const result = await runTest()
return result
```

### 4. Resource Management

Manage resources properly:

```javascript
// Good: Proper cleanup
await setupCleanroom()
try {
  const result = await runCitty(['--help'])
  result.expectSuccess()
} finally {
  await teardownCleanroom()
}

// Bad: Resource leak
await setupCleanroom()
const result = await runCitty(['--help'])
result.expectSuccess()
// Missing cleanup
```

## Summary

Advanced patterns provide:

1. **Enterprise frameworks** - Custom test frameworks for large teams
2. **Performance benchmarking** - Load testing and profiling capabilities
3. **Security testing** - Input validation and security patterns
4. **Data-driven testing** - CSV and database-driven test suites
5. **Parallel execution** - Concurrent testing strategies
6. **Custom assertions** - Domain-specific validation

These patterns are essential for:
- Large-scale testing projects
- Enterprise development teams
- Performance-critical applications
- Security-sensitive applications
- Complex integration testing

For CI/CD integration and automated testing, see [CI/CD Integration](./cicd-integration.md).

---

**Ready for automation?** Let's explore [CI/CD Integration](./cicd-integration.md)!
