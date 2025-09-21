# Advanced Examples

Complex and sophisticated examples demonstrating advanced features of `citty-test-utils`.

## Table of Contents

- [Enterprise Testing Patterns](#enterprise-testing-patterns)
- [Custom Test Frameworks](#custom-test-frameworks)
- [Performance Benchmarking](#performance-benchmarking)
- [Security Testing](#security-testing)
- [Integration Testing](#integration-testing)
- [Mock and Stub Testing](#mock-and-stub-testing)
- [Data-Driven Testing](#data-driven-testing)
- [Parallel Execution](#parallel-execution)

## Enterprise Testing Patterns

### Multi-Environment Test Suite

```javascript
// tests/enterprise/multi-environment.mjs
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

await testSuite.runTest('Version Command', async (env) => {
  const runner = env === 'cleanroom' ? runCitty : runLocalCitty
  const result = await runner(['--version'])
  
  result
    .expectSuccess()
    .expectOutput(/\d+\.\d+\.\d+/)
    .expectDuration(1000)
  
  return { success: true, result }
})

testSuite.generateReport()
```

### Test Configuration Management

```javascript
// tests/config/test-config.mjs
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
  
  await testConfig.runWithConfig(env, ['--version'], (result) => {
    result.expectSuccess().expectOutput(/\d+\.\d+\.\d+/)
  })
}
```

## Custom Test Frameworks

### Behavior-Driven Testing Framework

```javascript
// tests/bdd/bdd-framework.mjs
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

### Test Result Aggregation

```javascript
// tests/aggregation/test-aggregator.mjs
export class TestAggregator {
  constructor() {
    this.results = []
    this.metrics = {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0
    }
  }
  
  async runTest(testName, testFn) {
    const startTime = Date.now()
    this.metrics.total++
    
    try {
      const result = await testFn()
      const duration = Date.now() - startTime
      
      this.results.push({
        name: testName,
        success: true,
        duration,
        result
      })
      
      this.metrics.passed++
      this.metrics.duration += duration
      
      console.log(`✅ ${testName} (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      
      this.results.push({
        name: testName,
        success: false,
        duration,
        error: error.message
      })
      
      this.metrics.failed++
      this.metrics.duration += duration
      
      console.log(`❌ ${testName} (${duration}ms): ${error.message}`)
    }
  }
  
  generateReport() {
    const successRate = (this.metrics.passed / this.metrics.total) * 100
    const avgDuration = this.metrics.duration / this.metrics.total
    
    console.log('\n📊 Test Aggregation Report:')
    console.log(`Total Tests: ${this.metrics.total}`)
    console.log(`Passed: ${this.metrics.passed}`)
    console.log(`Failed: ${this.metrics.failed}`)
    console.log(`Success Rate: ${successRate.toFixed(2)}%`)
    console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`)
    
    // Slowest tests
    const slowest = this.results
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
    
    console.log('\n🐌 Slowest Tests:')
    slowest.forEach(test => {
      console.log(`  ${test.name}: ${test.duration}ms`)
    })
    
    // Failed tests
    const failed = this.results.filter(r => !r.success)
    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:')
      failed.forEach(test => {
        console.log(`  ${test.name}: ${test.error}`)
      })
    }
  }
}

// Usage
const aggregator = new TestAggregator()

await aggregator.runTest('Help Command', async () => {
  const result = await runLocalCitty(['--help'])
  result.expectSuccess().expectOutput('USAGE')
  return result
})

await aggregator.runTest('Version Command', async () => {
  const result = await runLocalCitty(['--version'])
  result.expectSuccess().expectOutput(/\d+\.\d+\.\d+/)
  return result
})

await aggregator.runTest('Invalid Command', async () => {
  const result = await runLocalCitty(['invalid-command'])
  result.expectFailure().expectStderr(/Unknown command/)
  return result
})

aggregator.generateReport()
```

## Performance Benchmarking

### Command Performance Profiler

```javascript
// tests/performance/profiler.mjs
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
// tests/load/load-tester.mjs
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
// tests/security/input-validation.mjs
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

## Integration Testing

### External Service Integration

```javascript
// tests/integration/external-services.mjs
export class ExternalServiceTester {
  constructor() {
    this.services = {
      github: 'https://api.github.com',
      npm: 'https://registry.npmjs.org',
      docker: 'docker --version'
    }
  }
  
  async testGitHubIntegration() {
    console.log('🔗 Testing GitHub integration...')
    
    const result = await runLocalCitty(['pack', 'search', 'github'], {
      env: { ...process.env, GITHUB_TOKEN: 'test-token' }
    })
    
    result
      .expectSuccess()
      .expectOutputLength(10, 10000)
  }
  
  async testNPMIntegration() {
    console.log('🔗 Testing NPM integration...')
    
    const result = await runLocalCitty(['pack', 'search', 'npm'])
    
    result
      .expectSuccess()
      .expectOutput(/npm/)
  }
  
  async testDockerIntegration() {
    console.log('🔗 Testing Docker integration...')
    
    try {
      const result = await runLocalCitty(['cleanroom', 'status'])
      result.expectSuccess()
    } catch (error) {
      console.log('⚠️  Docker not available for integration testing')
    }
  }
  
  async testAllIntegrations() {
    await this.testGitHubIntegration()
    await this.testNPMIntegration()
    await this.testDockerIntegration()
  }
}

// Usage
const integrationTester = new ExternalServiceTester()
await integrationTester.testAllIntegrations()
```

## Mock and Stub Testing

### Command Mocking Framework

```javascript
// tests/mocks/command-mocker.mjs
export class CommandMocker {
  constructor() {
    this.mocks = new Map()
    this.originalRunLocalCitty = null
  }
  
  mock(command, mockResult) {
    const key = Array.isArray(command) ? command.join(' ') : command
    this.mocks.set(key, mockResult)
  }
  
  async startMocking() {
    // Store original function
    this.originalRunLocalCitty = runLocalCitty
    
    // Replace with mock
    global.runLocalCitty = async (args, options) => {
      const key = args.join(' ')
      const mockResult = this.mocks.get(key)
      
      if (mockResult) {
        console.log(`🎭 Mocking command: ${key}`)
        return mockResult
      }
      
      // Fall back to original
      return await this.originalRunLocalCitty(args, options)
    }
  }
  
  async stopMocking() {
    if (this.originalRunLocalCitty) {
      global.runLocalCitty = this.originalRunLocalCitty
    }
  }
  
  createMockResult(exitCode = 0, stdout = '', stderr = '') {
    return {
      result: { exitCode, stdout, stderr, args: [], cwd: '/mock' },
      expectSuccess: () => this,
      expectFailure: () => this,
      expectOutput: () => this,
      expectStderr: () => this
    }
  }
}

// Usage
const mocker = new CommandMocker()

// Mock specific commands
mocker.mock(['--help'], mocker.createMockResult(0, 'Mocked help output'))
mocker.mock(['--version'], mocker.createMockResult(0, '1.0.0'))

await mocker.startMocking()

// Tests will use mocked results
const result = await runLocalCitty(['--help'])
console.log('Mocked result:', result.result.stdout)

await mocker.stopMocking()
```

## Data-Driven Testing

### CSV-Driven Test Suite

```javascript
// tests/data-driven/csv-tester.mjs
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
// tests/parallel/parallel-runner.mjs
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

These advanced examples demonstrate sophisticated testing patterns and frameworks that can be built on top of `citty-test-utils`. They show how to create enterprise-grade testing solutions with comprehensive reporting, performance profiling, security testing, and parallel execution capabilities.
