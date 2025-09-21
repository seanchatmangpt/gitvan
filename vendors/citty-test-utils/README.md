# citty-test-utils

A comprehensive testing utility for CLI applications built with Citty, featuring Docker cleanroom support, fluent assertions, and advanced scenario DSL.

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

// Local testing
const result = await runLocalCitty(['--help'], { 
  cwd: './playground',
  env: { TEST_CLI: 'true' }
})
result.expectSuccess().expectOutput('USAGE').expectNoStderr()

// Docker cleanroom testing
await setupCleanroom({ rootDir: './playground' })
const cleanResult = await runCitty(['--version'], {
  env: { TEST_CLI: 'true' }
})
cleanResult.expectSuccess().expectOutput(/\d+\.\d+\.\d+/)
await teardownCleanroom()
```

> **Note**: This example uses the included playground project. The playground demonstrates all features of `citty-test-utils` with a complete Citty CLI implementation.

## Features

- **🏃 Local Runner**: Execute CLI commands locally with timeout and environment support
- **🐳 Docker Cleanroom**: Isolated testing in Docker containers using testcontainers
- **🔗 Fluent Assertions**: Chainable expectation API with detailed error messages
- **📋 Scenario DSL**: Complex multi-step test workflows with retry mechanisms
- **🛠️ Test Utilities**: Wait conditions, retry logic, temporary files, and more
- **📦 Pre-built Scenarios**: Ready-to-use test templates for common workflows
- **🎯 Scenarios Pack**: Common CLI testing patterns with simple API
- **⚡ TypeScript Support**: Complete type definitions for all APIs
- **🔄 Cross-Environment**: Test consistency between local and cleanroom environments
- **🎮 Playground Project**: Complete example implementation with comprehensive tests

## Core API

### Local Runner

Execute CLI commands locally with proper working directory and environment configuration.

```javascript
import { runLocalCitty } from 'citty-test-utils'

const result = await runLocalCitty(['--help'], {
  cwd: './playground',        // Working directory for CLI execution
  json: false,                // Parse stdout as JSON
  timeout: 30000,             // Timeout in milliseconds
  env: {                      // Environment variables
    TEST_CLI: 'true'
  }
})

// Fluent assertions
result
  .expectSuccess()                    // Shorthand for expectExit(0)
  .expectOutput('USAGE')              // String match
  .expectOutput(/playground/)         // Regex match
  .expectNoStderr()                   // Expect empty stderr
  .expectOutputLength(100, 5000)      // Length range validation
```

### Cleanroom Runner

Execute commands in isolated Docker containers for consistent testing.

```javascript
import { setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

// Setup (run once per test suite)
await setupCleanroom({ 
  rootDir: './playground',           // Directory to copy into container
  nodeImage: 'node:20-alpine'        // Docker image to use
})

// Run commands in cleanroom
const result = await runCitty(['--help'], {
  json: false,    // Parse stdout as JSON
  cwd: '/app',    // Working directory in container
  timeout: 30000, // Timeout in milliseconds
  env: {          // Environment variables
    TEST_CLI: 'true'
  }
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
  .expectOutput(/playground/)        // Regex match
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
await scenarios.help('local').execute()
await scenarios.version('local').execute()
await scenarios.invalidCommand('nonexistent', 'local').execute()
await scenarios.jsonOutput(['greet', 'Alice', '--json'], 'local').execute()
await scenarios.subcommand('math', ['add', '5', '3'], 'local').execute()

// Environment-specific scenarios
await cleanroomScenario('Cleanroom test')
  .step('Test help')
  .run('--help')
  .expectSuccess()
  .execute()

await localScenario('Local test')
  .step('Test greet command')
  .run(['greet', 'Alice'], { env: { TEST_CLI: 'true' } })
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

### Scenarios Pack

Pre-built testing patterns for common CLI scenarios with a simple, consistent API.

```javascript
import { scenarios } from 'citty-test-utils'

// Basic scenarios
await scenarios.help('local').execute()
await scenarios.version('cleanroom').execute()
await scenarios.invalidCommand('nope', 'local').execute()

// JSON output testing
await scenarios.jsonOutput(['greet', 'Alice', '--json'], 'local').execute()
await scenarios.subcommand('math', ['add', '5', '3'], 'local').execute()

// Robustness testing
await scenarios.idempotent(['greet', 'Alice'], 'local').execute()
await scenarios.concurrent([
  { args: ['--help'] },
  { args: ['--version'] },
  { args: ['greet', 'Test'] }
], 'cleanroom').execute()

// Error testing
await scenarios.errorCase(['invalid-command'], /Unknown command/, 'local').execute()
```

**Available Scenarios:**

- `help(env?)` - Test help command output
- `version(env?)` - Test version command output  
- `invalidCommand(cmd?, env?)` - Test invalid command handling
- `jsonOutput(args, env?)` - Test JSON output parsing
- `subcommand(cmd, args?, env?)` - Test subcommand execution
- `idempotent(args, env?)` - Test idempotent operations
- `concurrent(runs[], env?)` - Test concurrent execution
- `errorCase(args, msgOrRe, env?)` - Test error conditions

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

async function testPlaygroundCLI() {
  // Test local runner
  const localResult = await runLocalCitty(['--help'], {
    cwd: './playground',
    env: { TEST_CLI: 'true' }
  })
  localResult
    .expectSuccess()
    .expectOutput('USAGE')
    .expectOutput(/playground/)
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
  const helpResult = await scenarios.help('local').execute()
  const versionResult = await scenarios.version('local').execute()
  
  console.log('Help success:', helpResult.success)
  console.log('Version success:', versionResult.success)

  // Test flaky operations
  await testUtils.retry(async () => {
    const result = await runLocalCitty(['--help'], {
      cwd: './playground',
      env: { TEST_CLI: 'true' }
    })
    result.expectSuccess()
  }, 3, 1000)
}

// For Vitest users
import { describe, it, beforeAll, afterAll } from 'vitest'

describe('Playground CLI Tests', () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: './playground' })
  })

  afterAll(async () => {
    await teardownCleanroom()
  })

  it('should work locally', async () => {
    const result = await runLocalCitty(['--help'], {
      cwd: './playground',
      env: { TEST_CLI: 'true' }
    })
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectOutput(/playground/)
      .expectNoStderr()
  })

  it('should work in cleanroom', async () => {
    const result = await runCitty(['--help'], {
      env: { TEST_CLI: 'true' }
    })
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectOutput(/playground/)
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
    const helpResult = await scenarios.help('local').execute()
    const versionResult = await scenarios.version('local').execute()
    
    expect(helpResult.success).toBe(true)
    expect(versionResult.success).toBe(true)
  })

  it('should handle flaky operations', async () => {
    await testUtils.retry(async () => {
      const result = await runLocalCitty(['--help'], {
        cwd: './playground',
        env: { TEST_CLI: 'true' }
      })
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
const localResult = await runLocalCitty(['--version'], {
  cwd: './playground',
  env: { TEST_CLI: 'true' }
})
const cleanroomResult = await runCitty(['--version'], {
  env: { TEST_CLI: 'true' }
})

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
const result = await runLocalCitty(['greet', 'Alice'], {
  cwd: './playground',
  env: {
    TEST_CLI: 'true',
    DEBUG: 'true'
  },
  timeout: 60000
})

// Cleanroom with specific Docker image
await setupCleanroom({ 
  rootDir: './playground',
  nodeImage: 'node:18-alpine'
})
```

## Requirements

- **Node.js**: >= 18.0.0
- **Docker**: Required for cleanroom testing
- **Citty Project**: Required for CLI testing

## Project Setup

To use `citty-test-utils`, you need a Citty-based CLI project:

1. **Install citty-test-utils**: `npm install citty-test-utils`
2. **Use the playground**: The included playground demonstrates all features
3. **Run tests**: The playground includes comprehensive test examples

```bash
# Example project structure
my-citty-project/
├── src/
│   └── cli.mjs          # Citty CLI
├── package.json         # Contains citty dependency
└── tests/
    └── my-tests.mjs     # Your tests using citty-test-utils
```

## Playground Project

The included playground project (`./playground/`) serves as a complete example:

- **Full Citty CLI**: Demonstrates commands, subcommands, and options
- **Comprehensive Tests**: Unit, integration, and scenario tests
- **All Features**: Shows every aspect of `citty-test-utils`
- **Best Practices**: Demonstrates proper usage patterns

```bash
# Run playground tests
cd playground
npm install
npm test

# Run playground CLI
npm start
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

Contributions are welcome! Please see the project repository for contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.