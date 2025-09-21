# Citty Test Utils Playground

A comprehensive playground project demonstrating the capabilities of `citty-test-utils` for testing CLI applications built with Citty.

## Overview

This playground serves as both a testing ground and example implementation of how to use `citty-test-utils` effectively. It includes a complete Citty CLI with various commands, subcommands, and features that showcase the testing utilities.

## Features

- **Complete Citty CLI**: Full-featured CLI with commands, subcommands, and options
- **Comprehensive Test Suite**: Unit tests, integration tests, and scenario tests
- **Local and Cleanroom Testing**: Examples of both local and Docker-based testing
- **Fluent Assertions**: Demonstrates the fluent assertion API
- **Scenario DSL**: Shows how to build complex test scenarios
- **JSON Output Testing**: Examples of testing JSON output
- **Error Handling**: Demonstrates error simulation and testing

## CLI Commands

### Basic Commands

```bash
# Show help
playground --help

# Show version
playground --version

# Greet someone
playground greet Alice
playground greet Bob --count 3 --verbose
playground greet Charlie --json
```

### Math Operations

```bash
# Add two numbers
playground math add 5 3

# Multiply two numbers
playground math multiply 4 7

# JSON output
playground math add 10 20 --json
```

### Error Simulation

```bash
# Generic error
playground error generic

# Validation error
playground error validation

# Timeout simulation
playground error timeout
```

### Information

```bash
# Show playground info
playground info
playground info --json
```

## Testing Examples

### Basic Testing

```javascript
import { runLocalCitty } from 'citty-test-utils'

// Test basic command
const result = await runLocalCitty(['greet', 'Alice'], { 
  env: { TEST_CLI: 'true' },
  cwd: process.cwd()
})

result
  .expectSuccess()
  .expectOutput(/Hello, Alice/)
  .expectNoStderr()
```

### JSON Output Testing

```javascript
// Test JSON output
const result = await runLocalCitty(['greet', 'Bob', '--json'], { 
  env: { TEST_CLI: 'true' },
  cwd: process.cwd(),
  json: true
})

result
  .expectSuccess()
  .expectJson((json) => {
    expect(json.message).toBe('Hello, Bob!')
    expect(json.count).toBe(1)
  })
```

### Scenario Testing

```javascript
import { scenario } from 'citty-test-utils'

// Complex workflow testing
const workflow = scenario('Greet Workflow')
  .step('Greet Alice')
  .run(['greet', 'Alice'])
  .expectSuccess()
  .expectOutput(/Hello, Alice/)
  .step('Greet Bob with options')
  .run(['greet', 'Bob', '--count', '2', '--verbose'])
  .expectSuccess()
  .expectOutput(/Verbose mode enabled/)

const result = await workflow.execute('local')
expect(result.success).toBe(true)
```

### Cleanroom Testing

```javascript
import { runCitty, setupCleanroom, teardownCleanroom } from 'citty-test-utils'

// Setup cleanroom environment
await setupCleanroom({ rootDir: '.', timeout: 30000 })

// Test in isolated Docker environment
const result = await runCitty(['greet', 'Cleanroom'], {
  env: { TEST_CLI: 'true' }
})

result
  .expectSuccess()
  .expectOutput(/Hello, Cleanroom/)

// Cleanup
await teardownCleanroom()
```

### Pre-built Scenarios

```javascript
import { scenarios } from 'citty-test-utils'

// Use pre-built scenarios
const helpResult = await scenarios.help('local').execute()
const versionResult = await scenarios.version('cleanroom').execute()
const errorResult = await scenarios.invalidCommand('nonexistent', 'local').execute()
```

## Running Tests

### Install Dependencies

```bash
cd playground
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Fast tests (no coverage)
npm run test:fast

# Watch mode
npm run test:watch
```

### Run CLI Directly

```bash
# Start the playground CLI
npm start

# Or run directly
node src/cli.mjs greet Alice
```

## Test Structure

```
playground/
├── src/
│   └── cli.mjs              # Main CLI implementation
├── test/
│   ├── unit/
│   │   └── cli.test.mjs     # Unit tests
│   └── integration/
│       ├── playground.test.mjs    # Integration tests
│       └── scenarios.test.mjs     # Scenario tests
├── package.json             # Playground dependencies
├── vitest.config.mjs        # Test configuration
└── README.md               # This file
```

## Key Testing Patterns

### 1. Local Testing
- Direct process execution
- Fast execution
- Good for development and unit tests

### 2. Cleanroom Testing
- Docker-based isolated environment
- Consistent results across environments
- Good for integration and CI/CD testing

### 3. Fluent Assertions
- Chainable API for readable tests
- Comprehensive assertion methods
- Clear error messages

### 4. Scenario DSL
- Multi-step workflow testing
- Reusable test patterns
- Complex integration testing

### 5. Pre-built Scenarios
- Common testing patterns
- Quick setup for typical use cases
- Cross-environment consistency

## Best Practices Demonstrated

1. **Environment Variables**: Using `TEST_CLI=true` to enable test mode
2. **Working Directory**: Proper `cwd` configuration for CLI execution
3. **Timeout Management**: Appropriate timeout settings for different test types
4. **Error Handling**: Comprehensive error testing and validation
5. **JSON Testing**: Structured output validation
6. **Cross-Environment**: Consistent testing across local and cleanroom environments

## Integration with Main Library

This playground demonstrates how to integrate `citty-test-utils` into a real project:

1. **Dependency**: Install as a local dependency (`file:..`)
2. **Configuration**: Proper test configuration for the playground
3. **Examples**: Comprehensive examples of all testing features
4. **Documentation**: Clear documentation of usage patterns

The playground serves as both a testing ground for the main library and a reference implementation for users wanting to integrate `citty-test-utils` into their own projects.
