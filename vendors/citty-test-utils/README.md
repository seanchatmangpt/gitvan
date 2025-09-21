# citty-test-utils

A comprehensive testing utility for GitVan CLI applications with Docker cleanroom support, fluent assertions, and advanced scenario DSL.

[![npm version](https://badge.fury.io/js/citty-test-utils.svg)](https://badge.fury.io/js/citty-test-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/citty-test-utils.svg)](https://nodejs.org/)

## Installation

```bash
npm install citty-test-utils
```

## Quick Start

```javascript
import { runLocalCitty, setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

// Local testing with automatic project detection
const result = await runLocalCitty(['--help'])
result.expectSuccess().expectOutput('USAGE').expectNoStderr()

// Docker cleanroom testing
await setupCleanroom({ rootDir: '.' })
const cleanResult = await runCitty(['--version'])
cleanResult.expectSuccess().expectOutput(/\d+\.\d+\.\d+/)
await teardownCleanroom()
```

> **Note**: These examples assume you're working within a GitVan project. The local runner automatically detects the GitVan project root and executes commands against the local CLI.

## Features

- **🔍 Smart Project Detection**: Automatically finds GitVan project root from any directory
- **🏃 Local Runner**: Execute CLI commands locally with timeout and environment support
- **🐳 Docker Cleanroom**: Isolated testing in Docker containers using testcontainers
- **🔗 Fluent Assertions**: Chainable expectation API with detailed error messages
- **📋 Scenario DSL**: Complex multi-step test workflows with retry mechanisms
- **🛠️ Test Utilities**: Wait conditions, retry logic, temporary files, and more
- **📦 Pre-built Scenarios**: Ready-to-use test templates for common workflows
- **⚡ TypeScript Support**: Complete type definitions for all APIs
- **🔄 Cross-Environment**: Test consistency between local and cleanroom environments

## Core API

### Local Runner

Execute GitVan CLI commands locally with automatic project root detection.

```javascript
import { runLocalCitty } from 'citty-test-utils'

const result = await runLocalCitty(['--help'], {
  cwd: process.cwd(),     // Working directory (auto-detected if not provided)
  json: false,            // Parse stdout as JSON
  timeout: 30000,         // Timeout in milliseconds
  env: {                  // Environment variables
    NODE_ENV: 'test'
  }
})

// Fluent assertions
result
  .expectSuccess()                    // Shorthand for expectExit(0)
  .expectOutput('USAGE')              // String match
  .expectOutput(/gitvan/)             // Regex match
  .expectNoStderr()                   // Expect empty stderr
  .expectOutputLength(100, 5000)      // Length range validation
```

### Cleanroom Runner

Execute commands in isolated Docker containers for consistent testing.

```javascript
import { setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

// Setup (run once per test suite)
await setupCleanroom({ 
  rootDir: '.',                    // Directory to copy into container
  nodeImage: 'node:20-alpine'      // Docker image to use
})

// Run commands in cleanroom
const result = await runCitty(['--help'], {
  json: false,    // Parse stdout as JSON
  cwd: '/app',    // Working directory in container
  timeout: 30000  // Timeout in milliseconds
})

// Cleanup (run once per test suite)
await teardownCleanroom()
```

### Fluent Assertions

Comprehensive chainable expectation API with detailed error messages.

```javascript
const result = await runLocalCitty(['--help'])

result
  .expectSuccess()                    // expectExit(0)
  .expectFailure()                   // Expect non-zero exit code
  .expectExit(0)                     // Check specific exit code
  .expectExitCodeIn([0, 1, 2])       // Check exit code is in array
  .expectOutput('Usage:')            // String match
  .expectOutput(/gitvan/)            // Regex match
  .expectOutputContains('commands')  // Contains text
  .expectOutputNotContains('error')  // Does not contain text
  .expectStderr('')                  // Check stderr
  .expectNoOutput()                  // Expect empty stdout
  .expectNoStderr()                  // Expect empty stderr
  .expectOutputLength(10, 100)      // Check output length range
  .expectStderrLength(0, 50)        // Check stderr length range
  .expectDuration(5000)              // Check execution time
  .expectJson(data => {              // JSON validation
    expect(data.version).toBeDefined()
  })
```

### Scenario DSL

Build complex multi-step test workflows with step-by-step execution.

```javascript
import { scenario, scenarios, cleanroomScenario, localScenario } from 'citty-test-utils'

// Basic scenario with multiple steps
const result = await scenario('Complete workflow')
  .step('Get help')
  .run('--help')
  .expectSuccess()
  .expectOutput('USAGE')
  .step('Get version')
  .run(['--version'])
  .expectSuccess()
  .expectOutput(/\d+\.\d+\.\d+/)
  .step('Test invalid command')
  .run('invalid-command')
  .expectFailure()
  .expectStderr(/Unknown command/)
  .execute('local')  // or 'cleanroom'

// Pre-built scenarios
await scenarios.help().execute('local')
await scenarios.version().execute('local')
await scenarios.invalidCommand().execute('local')
await scenarios.initProject('my-project').execute('local')
await scenarios.buildAndTest().execute('local')

// Environment-specific scenarios
await cleanroomScenario('Cleanroom test')
  .step('Test help')
  .run('--help')
  .expectSuccess()
  .execute()

await localScenario('Local test')
  .step('Start dev')
  .run('dev', { env: { NODE_ENV: 'development' } })
  .expectSuccess()
  .execute()
```

### Test Utilities

Utility functions for common testing patterns and edge cases.

```javascript
import { testUtils } from 'citty-test-utils'

// Wait for conditions with timeout
await testUtils.waitFor(
  () => checkCondition(), 
  5000,    // timeout
  100      // interval
)

// Retry with exponential backoff
await testUtils.retry(
  () => flakyOperation(), 
  3,       // max attempts
  1000     // delay between attempts
)

// Temporary files for testing
const tempFile = await testUtils.createTempFile('test content', '.txt')
await testUtils.cleanupTempFiles([tempFile])
```

## Complete Example

```javascript
import { 
  runLocalCitty, 
  setupCleanroom, 
  runCitty, 
  teardownCleanroom,
  scenario,
  scenarios,
  testUtils
} from 'citty-test-utils'

async function testGitVanCLI() {
  // Test local runner
  const localResult = await runLocalCitty(['--help'])
  localResult
    .expectSuccess()
    .expectOutput('USAGE')
    .expectOutput(/gitvan/)
    .expectNoStderr()

  // Test scenario
  const scenarioResult = await scenario('Complete workflow')
    .step('Get help')
    .run('--help')
    .expectSuccess()
    .expectOutput('USAGE')
    .step('Get version')
    .run('--version')
    .expectSuccess()
    .expectOutput(/\d+\.\d+\.\d+/)
    .step('Test invalid command')
    .run('invalid-command')
    .expectFailure()
    .expectStderr(/Unknown command/)
    .execute('local')
  
  console.log('Scenario success:', scenarioResult.success)

  // Test pre-built scenarios
  const helpResult = await scenarios.help().execute('local')
  const versionResult = await scenarios.version().execute('local')
  
  console.log('Help success:', helpResult.success)
  console.log('Version success:', versionResult.success)

  // Test flaky operations
  await testUtils.retry(async () => {
    const result = await runLocalCitty(['--help'])
    result.expectSuccess()
  }, 3, 1000)
}

// For Vitest users
import { describe, it, beforeAll, afterAll } from 'vitest'

describe('GitVan CLI Tests', () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: '.' })
  })

  afterAll(async () => {
    await teardownCleanroom()
  })

  it('should work locally', async () => {
    const result = await runLocalCitty(['--help'])
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectOutput(/gitvan/)
      .expectNoStderr()
  })

  it('should work in cleanroom', async () => {
    const result = await runCitty(['--help'])
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectOutput(/gitvan/)
      .expectNoStderr()
  })

  it('should handle complex workflow', async () => {
    const result = await scenario('Complete workflow')
      .step('Get help')
      .run('--help')
      .expectSuccess()
      .expectOutput('USAGE')
      .step('Get version')
      .run('--version')
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
      .step('Test invalid command')
      .run('invalid-command')
      .expectFailure()
      .expectStderr(/Unknown command/)
      .execute('local')
    
    expect(result.success).toBe(true)
  })

  it('should use pre-built scenarios', async () => {
    const helpResult = await scenarios.help().execute('local')
    const versionResult = await scenarios.version().execute('local')
    
    expect(helpResult.success).toBe(true)
    expect(versionResult.success).toBe(true)
  })

  it('should handle flaky operations', async () => {
    await testUtils.retry(async () => {
      const result = await runLocalCitty(['--help'])
      result.expectSuccess()
    }, 3, 1000)
  })
})
```

## Error Handling

The utility provides detailed error messages with full context:

```
Expected exit code 0, got 1
Command: node src/cli.mjs --help
Working directory: /app
Stdout: 
Stderr: Error: Command not found
```

## Advanced Features

### Cross-Environment Testing

Test consistency between local and cleanroom environments:

```javascript
const localResult = await runLocalCitty(['--version'])
const cleanroomResult = await runCitty(['--version'])

expect(localResult.result.stdout).toBe(cleanroomResult.result.stdout)
```

### Custom Actions in Scenarios

Execute custom logic within scenarios:

```javascript
const result = await scenario('Custom workflow')
  .step('Custom action', async ({ lastResult, context }) => {
    // Custom logic here
    return { success: true, data: 'processed' }
  })
  .step('Run command')
  .run('--help')
  .expectSuccess()
  .execute()
```

### Environment-Specific Configuration

```javascript
// Local development with custom environment
const result = await runLocalCitty(['dev'], {
  env: {
    NODE_ENV: 'development',
    DEBUG: 'true',
    PORT: '3000'
  },
  timeout: 60000
})

// Cleanroom with specific Docker image
await setupCleanroom({ 
  rootDir: '.',
  nodeImage: 'node:18-alpine'
})
```

## Requirements

- **Node.js**: >= 18.0.0
- **Docker**: Required for cleanroom testing
- **GitVan Project**: Required for CLI testing

## Project Setup

To use `citty-test-utils`, you need to be working within a GitVan project:

1. **Install GitVan**: Follow the [GitVan setup guide](https://github.com/seanchatmangpt/gitvan)
2. **Install citty-test-utils**: `npm install citty-test-utils`
3. **Run tests**: The local runner will automatically detect your GitVan project root

```bash
# Example project structure
my-gitvan-project/
├── src/
│   └── cli.mjs          # GitVan CLI
├── package.json         # Contains "name": "gitvan"
└── tests/
    └── my-tests.mjs     # Your tests using citty-test-utils
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import type { 
  CliResult, 
  CliExpectation, 
  RunOptions, 
  ScenarioBuilder,
  ScenarioResult 
} from 'citty-test-utils'

const result: CliResult = await runLocalCitty(['--help'])
const expectation: CliExpectation = result.expectExit(0)
const scenario: ScenarioBuilder = scenario('My Test')
```

## Testing Configuration

The package includes comprehensive test configuration with Vitest:

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:bdd

# Run with coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

## Contributing

Contributions are welcome! Please see the [GitVan repository](https://github.com/seanchatmangpt/gitvan) for contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.