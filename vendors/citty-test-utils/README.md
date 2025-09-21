# Citty Test Utils

A comprehensive testing utility for Citty CLI applications with Docker cleanroom support, fluent assertions, and scenario DSL.

[![npm version](https://badge.fury.io/js/citty-test-utils.svg)](https://badge.fury.io/js/citty-test-utils)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/citty-test-utils.svg)](https://nodejs.org/)

## Installation

```bash
# Install from npm
npm install citty-test-utils

# Or with pnpm
pnpm add citty-test-utils

# Or with yarn
yarn add citty-test-utils
```

### Requirements

- Node.js >= 18.0.0
- Docker (for cleanroom testing)
- GitVan project (for CLI testing)

## Features

- **Cleanroom Runner**: Run commands in isolated Docker containers with proper stderr capture
- **Local Runner**: Run commands locally with timeout and environment support
- **Fluent Assertions**: Chainable expectation API with detailed error messages
- **Scenario DSL**: Complex test workflows with retry mechanisms
- **TypeScript Support**: Full type definitions included
- **Timeout Support**: Configurable timeouts for long-running commands
- **Retry Logic**: Automatic retry with exponential backoff
- **Environment Variables**: Support for custom environment configuration

## Quick Start

```javascript
import { describe, it, beforeAll, afterAll } from "vitest"
import { setupCleanroom, runCitty, teardownCleanroom, scenario, scenarios } from "./vendors/citty-test-utils/index.js"

describe("CLI Tests", () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: "." })
  })

  afterAll(async () => {
    await teardownCleanroom()
  })

  it("shows help", async () => {
    const result = await runCitty(["--help"])
    result
      .expectSuccess()
      .expectOutput(/Usage:/)
      .expectOutput(/gitvan/)
      .expectNoStderr()
  })

  it("handles invalid commands", async () => {
    const result = await runCitty(["invalid-command"])
    result
      .expectFailure()
      .expectStderr(/Unknown command/)
  })

  it("runs complex scenario", async () => {
    const result = await scenario("Full CLI workflow")
      .step("Check help")
      .run("--help")
      .expectSuccess()
      .expectOutput(/USAGE/)
      .step("Check version")
      .run("--version")
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
      .execute('local')
    
    expect(result.success).toBe(true)
  })

  it("uses pre-built scenarios", async () => {
    const helpResult = await scenarios.help().execute('local')
    const versionResult = await scenarios.version().execute('local')
    
    expect(helpResult.success).toBe(true)
    expect(versionResult.success).toBe(true)
  })

  it("uses cleanroom scenarios", async () => {
    const result = await cleanroomScenario("Cleanroom test")
      .step("Test help")
      .run("--help")
      .expectSuccess()
      .execute()
    
    expect(result.success).toBe(true)
  })
})
```

## API Reference

### Cleanroom Runner

```javascript
// Setup cleanroom environment
await setupCleanroom({ 
  rootDir: ".",           // Directory to copy into container
  nodeImage: "node:20-alpine"  // Docker image to use
})

// Run command in cleanroom
const result = await runCitty(["command", "args"], {
  json: false,    // Parse stdout as JSON
  cwd: "/app",    // Working directory in container
  timeout: 30000  // Timeout in milliseconds
})

// Cleanup
await teardownCleanroom()
```

### Local Runner

```javascript
import { runLocalCitty } from "./vendors/citty-test-utils/index.js"

const result = await runLocalCitty(["command", "args"], {
  cwd: process.cwd(),  // Working directory
  json: false,         // Parse stdout as JSON
  timeout: 30000,      // Timeout in milliseconds
  env: {               // Environment variables
    NODE_ENV: "test"
  }
})
```

### Enhanced Assertions

```javascript
const result = await runCitty(["--help"])

result
  .expectSuccess()                    // Shorthand for expectExit(0)
  .expectFailure()                   // Expect non-zero exit code
  .expectExit(0)                     // Check exit code
  .expectOutput("Usage:")            // String match
  .expectOutput(/gitvan/)            // Regex match
  .expectStderr("")                  // Check stderr
  .expectNoOutput()                  // Expect empty stdout
  .expectNoStderr()                  // Expect empty stderr
  .expectOutputLength(10, 100)       // Check output length range
  .expectJson(data => {              // JSON validation
    expect(data.version).toBeDefined()
  })
```

### Scenario DSL

```javascript
import { scenario, scenarios, cleanroomScenario, localScenario, testUtils } from "./vendors/citty-test-utils/index.js"

// Basic scenario with step-by-step execution
const result = await scenario("My workflow")
  .step("Show help")
  .run("--help")                    // String command
  .expectSuccess()                 // Shorthand assertion
  .step("Get version")
  .run(["--version"])              // Array command
  .expectSuccess()
  .expectOutput(/\d+\.\d+\.\d+/)  // Regex assertion
  .execute('local')                // or 'cleanroom'

// Pre-built scenarios
await scenarios.help().execute('local')
await scenarios.version().execute('local')
await scenarios.invalidCommand().execute('local')
await scenarios.initProject("my-project").execute('local')

// Cleanroom scenarios
await cleanroomScenario("Cleanroom test")
  .step("Test help")
  .run("--help")
  .expectSuccess()
  .execute()

// Local scenarios
await localScenario("Local test")
  .step("Start dev")
  .run("dev", { env: { NODE_ENV: "development" } })
  .expectSuccess()
  .execute()

// Test utilities
await testUtils.waitFor(() => checkCondition(), 5000)
await testUtils.retry(() => flakyOperation(), 3, 1000)
const tempFile = await testUtils.createTempFile("test content", ".txt")
await testUtils.cleanupTempFiles([tempFile])
```

### Advanced Scenario Features

```javascript
// Multiple assertions per step
const result = await scenario("Multiple assertions")
  .step("Test help")
  .run("--help")
  .expectSuccess()                    // expectExit(0)
  .expectOutput(/USAGE/)              // String/regex match
  .expectNoStderr()                  // Empty stderr
  .expectOutputLength(10, 1000)      // Length range
  .expectJson(data => {              // JSON validation
    expect(data.commands).toBeDefined()
  })
  .execute('local')

// Custom options per step
const result = await scenario("Custom options")
  .step("Long running command")
  .run("build", { timeout: 60000, env: { NODE_ENV: "production" } })
  .expectSuccess()
  .execute('local')
```

## Error Handling

The utility provides detailed error messages with context:

```
Expected exit code 0, got 1
Command: node src/cli/cli.mjs --help
Working directory: /app
Stdout: 
Stderr: Error: Command not found
```

## File Structure

```
vendors/citty-test-utils/
├── package.json          # Package configuration
├── index.js             # Main exports
├── cleanroom-runner.js  # Docker container runner
├── local-runner.js      # Local process runner
├── assertions.js        # Fluent assertion API
├── scenario-dsl.js      # Scenario DSL implementation
├── types.d.ts          # TypeScript definitions
└── README.md           # This file
```

## Dependencies

- `testcontainers`: Docker container management
- Node.js 18+ with ES modules support

## Advanced Usage

### Custom Environment Variables

```javascript
const result = await runLocalCitty(["build"], {
  env: {
    NODE_ENV: "production",
    DEBUG: "true",
    API_KEY: "test-key"
  }
})
```

### Retry with Exponential Backoff

```javascript
const result = await scenario("Flaky operation")
  .step("Unreliable command", ["unreliable"])
  .retries(5)  // Will retry up to 5 times
  .execute()
```

### Timeout Configuration

```javascript
const result = await runCitty(["long-running"], {
  timeout: 120000  // 2 minutes
})
```