# Migration Guide

Guide for migrating from other testing approaches to `citty-test-utils`.

## Table of Contents

- [From Manual CLI Testing](#from-manual-cli-testing)
- [From Other Testing Libraries](#from-other-testing-libraries)
- [From Shell Scripts](#from-shell-scripts)
- [From Docker Compose](#from-docker-compose)
- [From Custom Test Runners](#from-custom-test-runners)
- [Migration Checklist](#migration-checklist)

## From Manual CLI Testing

### Before: Manual Testing

```javascript
// Old approach: Manual CLI testing
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function testCLI() {
  try {
    const { stdout, stderr } = await execAsync('node src/cli.mjs --help')
    
    if (stdout.includes('USAGE')) {
      console.log('✅ Help command works')
    } else {
      console.log('❌ Help command failed')
    }
    
    if (stderr) {
      console.log('⚠️  Stderr:', stderr)
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message)
  }
}
```

### After: Using citty-test-utils

```javascript
// New approach: Using citty-test-utils
import { runLocalCitty } from 'citty-test-utils'

async function testCLI() {
  const result = await runLocalCitty(['--help'])
  
  result
    .expectSuccess()
    .expectOutput('USAGE')
    .expectNoStderr()
  
  console.log('✅ Help command works')
}
```

### Migration Steps

1. **Replace exec calls:**
   ```javascript
   // Before
   const { stdout, stderr } = await execAsync('node src/cli.mjs --help')
   
   // After
   const result = await runLocalCitty(['--help'])
   ```

2. **Replace manual assertions:**
   ```javascript
   // Before
   if (stdout.includes('USAGE')) {
     console.log('✅ Test passed')
   }
   
   // After
   result.expectOutput('USAGE')
   ```

3. **Replace error handling:**
   ```javascript
   // Before
   try {
     const { stdout, stderr } = await execAsync('command')
   } catch (error) {
     console.error('Command failed:', error.message)
   }
   
   // After
   const result = await runLocalCitty(['command'])
   result.expectSuccess()  // Throws if command fails
   ```

## From Other Testing Libraries

### From Jest/Vitest with exec

#### Before: Jest with exec

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000
}

// cli.test.js
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

describe('CLI Tests', () => {
  test('help command works', async () => {
    const { stdout, stderr } = await execAsync('node src/cli.mjs --help')
    
    expect(stdout).toContain('USAGE')
    expect(stderr).toBe('')
  })
  
  test('version command works', async () => {
    const { stdout } = await execAsync('node src/cli.mjs --version')
    
    expect(stdout).toMatch(/\d+\.\d+\.\d+/)
  })
})
```

#### After: Jest with citty-test-utils

```javascript
// cli.test.js
import { runLocalCitty } from 'citty-test-utils'

describe('CLI Tests', () => {
  test('help command works', async () => {
    const result = await runLocalCitty(['--help'])
    
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectNoStderr()
  })
  
  test('version command works', async () => {
    const result = await runLocalCitty(['--version'])
    
    result
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
  })
})
```

### From Mocha with exec

#### Before: Mocha with exec

```javascript
// cli.test.js
import { exec } from 'child_process'
import { promisify } from 'util'
import { expect } from 'chai'

const execAsync = promisify(exec)

describe('CLI Tests', () => {
  it('should show help', async () => {
    const { stdout, stderr } = await execAsync('node src/cli.mjs --help')
    
    expect(stdout).to.include('USAGE')
    expect(stderr).to.be.empty
  })
  
  it('should show version', async () => {
    const { stdout } = await execAsync('node src/cli.mjs --version')
    
    expect(stdout).to.match(/\d+\.\d+\.\d+/)
  })
})
```

#### After: Mocha with citty-test-utils

```javascript
// cli.test.js
import { runLocalCitty } from 'citty-test-utils'
import { expect } from 'chai'

describe('CLI Tests', () => {
  it('should show help', async () => {
    const result = await runLocalCitty(['--help'])
    
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectNoStderr()
  })
  
  it('should show version', async () => {
    const result = await runLocalCitty(['--version'])
    
    result
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
  })
})
```

### Migration Benefits

1. **Automatic project detection**: No need to specify CLI paths
2. **Better error messages**: Detailed context when tests fail
3. **Fluent assertions**: More readable test code
4. **Consistent behavior**: Same API across different environments

## From Shell Scripts

### Before: Shell Script Testing

```bash
#!/bin/bash
# test-cli.sh

echo "Testing CLI..."

# Test help command
if node src/cli.mjs --help | grep -q "USAGE"; then
    echo "✅ Help command works"
else
    echo "❌ Help command failed"
    exit 1
fi

# Test version command
if node src/cli.mjs --version | grep -qE "[0-9]+\.[0-9]+\.[0-9]+"; then
    echo "✅ Version command works"
else
    echo "❌ Version command failed"
    exit 1
fi

echo "All tests passed!"
```

### After: JavaScript with citty-test-utils

```javascript
// test-cli.mjs
import { runLocalCitty } from 'citty-test-utils'

async function testCLI() {
  console.log('Testing CLI...')
  
  // Test help command
  const helpResult = await runLocalCitty(['--help'])
  helpResult
    .expectSuccess()
    .expectOutput('USAGE')
  console.log('✅ Help command works')
  
  // Test version command
  const versionResult = await runLocalCitty(['--version'])
  versionResult
    .expectSuccess()
    .expectOutput(/\d+\.\d+\.\d+/)
  console.log('✅ Version command works')
  
  console.log('All tests passed!')
}

testCLI().catch(console.error)
```

### Migration Steps

1. **Convert shell script to JavaScript**
2. **Replace grep with expectOutput**
3. **Replace exit codes with expectSuccess/expectFailure**
4. **Add proper error handling**

## From Docker Compose

### Before: Docker Compose Testing

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  cli-test:
    build: .
    command: node src/cli.mjs --help
    volumes:
      - .:/app
    working_dir: /app
```

```bash
# Run tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### After: Cleanroom Testing

```javascript
// test-cleanroom.mjs
import { setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

async function testCleanroom() {
  // Setup cleanroom (equivalent to docker-compose up)
  await setupCleanroom({ rootDir: '.' })
  
  try {
    // Run tests in cleanroom
    const result = await runCitty(['--help'])
    result
      .expectSuccess()
      .expectOutput('USAGE')
    
    console.log('✅ Cleanroom test passed')
  } finally {
    // Cleanup (equivalent to docker-compose down)
    await teardownCleanroom()
  }
}

testCleanroom().catch(console.error)
```

### Migration Benefits

1. **Simplified setup**: No need for docker-compose files
2. **Better integration**: Works with existing test frameworks
3. **Automatic cleanup**: Containers are cleaned up automatically
4. **Flexible configuration**: Easy to customize container settings

## From Custom Test Runners

### Before: Custom Test Runner

```javascript
// custom-test-runner.js
class CLITestRunner {
  constructor() {
    this.tests = []
    this.results = []
  }
  
  addTest(name, command, expectedOutput) {
    this.tests.push({ name, command, expectedOutput })
  }
  
  async runTests() {
    for (const test of this.tests) {
      try {
        const { stdout } = await execAsync(`node src/cli.mjs ${test.command}`)
        
        if (stdout.includes(test.expectedOutput)) {
          this.results.push({ name: test.name, success: true })
          console.log(`✅ ${test.name}`)
        } else {
          this.results.push({ name: test.name, success: false })
          console.log(`❌ ${test.name}`)
        }
      } catch (error) {
        this.results.push({ name: test.name, success: false, error: error.message })
        console.log(`❌ ${test.name}: ${error.message}`)
      }
    }
  }
  
  generateReport() {
    const passed = this.results.filter(r => r.success).length
    const total = this.results.length
    
    console.log(`\nTest Results: ${passed}/${total} passed`)
  }
}

// Usage
const runner = new CLITestRunner()
runner.addTest('Help', '--help', 'USAGE')
runner.addTest('Version', '--version', '1.0.0')
await runner.runTests()
runner.generateReport()
```

### After: Using citty-test-utils

```javascript
// test-runner.mjs
import { runLocalCitty, scenario } from 'citty-test-utils'

class CLITestRunner {
  constructor() {
    this.tests = []
  }
  
  addTest(name, command, expectedOutput) {
    this.tests.push({ name, command, expectedOutput })
  }
  
  async runTests() {
    for (const test of this.tests) {
      try {
        const result = await runLocalCitty([test.command])
        
        result
          .expectSuccess()
          .expectOutput(test.expectedOutput)
        
        console.log(`✅ ${test.name}`)
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`)
      }
    }
  }
  
  async runScenarioTests() {
    const result = await scenario('All Tests')
      .step('Help test')
      .run('--help')
      .expectSuccess()
      .expectOutput('USAGE')
      
      .step('Version test')
      .run('--version')
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
      
      .execute('local')
    
    console.log('Scenario result:', result.success)
  }
}

// Usage
const runner = new CLITestRunner()
runner.addTest('Help', '--help', 'USAGE')
runner.addTest('Version', '--version', /\d+\.\d+\.\d+/)
await runner.runTests()
await runner.runScenarioTests()
```

## Migration Checklist

### Pre-Migration

- [ ] **Audit existing tests**: Identify all CLI testing approaches
- [ ] **Document current behavior**: Note expected outputs and behaviors
- [ ] **Identify dependencies**: Check for custom test utilities
- [ ] **Plan migration strategy**: Decide on migration order and approach

### During Migration

- [ ] **Install citty-test-utils**: `npm install citty-test-utils`
- [ ] **Update imports**: Replace exec/child_process imports
- [ ] **Convert assertions**: Replace manual checks with fluent assertions
- [ ] **Update error handling**: Use expectSuccess/expectFailure
- [ ] **Test incrementally**: Migrate one test at a time
- [ ] **Verify behavior**: Ensure tests still pass

### Post-Migration

- [ ] **Remove old dependencies**: Clean up unused packages
- [ ] **Update documentation**: Update test documentation
- [ ] **Train team**: Ensure team understands new testing approach
- [ ] **Monitor performance**: Check test execution times
- [ ] **Gather feedback**: Collect feedback from team members

### Common Migration Patterns

#### Pattern 1: Simple Command Testing

```javascript
// Before
const { stdout } = await execAsync('node src/cli.mjs --help')
expect(stdout).toContain('USAGE')

// After
const result = await runLocalCitty(['--help'])
result.expectSuccess().expectOutput('USAGE')
```

#### Pattern 2: Error Testing

```javascript
// Before
try {
  await execAsync('node src/cli.mjs invalid-command')
  expect.fail('Should have thrown')
} catch (error) {
  expect(error.message).toContain('Unknown command')
}

// After
const result = await runLocalCitty(['invalid-command'])
result.expectFailure().expectStderr(/Unknown command/)
```

#### Pattern 3: Environment Testing

```javascript
// Before
const { stdout } = await execAsync('NODE_ENV=test node src/cli.mjs --help')

// After
const result = await runLocalCitty(['--help'], {
  env: { NODE_ENV: 'test' }
})
```

#### Pattern 4: Timeout Testing

```javascript
// Before
const { stdout } = await execAsync('node src/cli.mjs long-command', {
  timeout: 30000
})

// After
const result = await runLocalCitty(['long-command'], {
  timeout: 30000
})
```

### Migration Tools

#### Automated Migration Script

```javascript
// migrate-tests.mjs
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

async function migrateTests() {
  const testFiles = await glob('tests/**/*.test.{js,mjs}')
  
  for (const file of testFiles) {
    let content = readFileSync(file, 'utf8')
    
    // Replace common patterns
    content = content.replace(
      /const \{ stdout, stderr \} = await execAsync\('node src\/cli\.mjs ([^']+)'\)/g,
      'const result = await runLocalCitty([$1])'
    )
    
    content = content.replace(
      /expect\(stdout\)\.toContain\('([^']+)'\)/g,
      'result.expectOutput(\'$1\')'
    )
    
    content = content.replace(
      /expect\(stderr\)\.toBe\(''\)/g,
      'result.expectNoStderr()'
    )
    
    // Add import if not present
    if (!content.includes('import { runLocalCitty }')) {
      content = `import { runLocalCitty } from 'citty-test-utils'\n${content}`
    }
    
    writeFileSync(file, content)
    console.log(`Migrated: ${file}`)
  }
}

migrateTests().catch(console.error)
```

### Best Practices

1. **Start small**: Begin with simple tests and gradually migrate complex ones
2. **Maintain compatibility**: Keep old tests running during migration
3. **Test thoroughly**: Verify migrated tests produce same results
4. **Document changes**: Update documentation to reflect new approach
5. **Train team**: Ensure team understands new testing patterns

### Common Pitfalls

1. **Forgetting to import**: Always import `runLocalCitty` from `citty-test-utils`
2. **Wrong assertion order**: Use `expectSuccess()` before other assertions
3. **Missing error handling**: Use `expectFailure()` for expected failures
4. **Environment differences**: Test in both local and cleanroom environments
5. **Timeout issues**: Adjust timeouts for long-running commands

This migration guide should help you transition from your current testing approach to `citty-test-utils` smoothly and efficiently.
