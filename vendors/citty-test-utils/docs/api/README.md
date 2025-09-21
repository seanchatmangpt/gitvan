# API Reference

Complete API documentation for `citty-test-utils`.

## Table of Contents

- [Core Functions](#core-functions)
- [Local Runner](#local-runner)
- [Cleanroom Runner](#cleanroom-runner)
- [Fluent Assertions](#fluent-assertions)
- [Scenario DSL](#scenario-dsl)
- [Test Utilities](#test-utilities)
- [Pre-built Scenarios](#pre-built-scenarios)
- [TypeScript Types](#typescript-types)

## Core Functions

### `runLocalCitty(args, options?)`

Execute GitVan CLI commands locally with automatic project root detection.

**Parameters:**
- `args: string[]` - Command line arguments to pass to GitVan CLI
- `options?: RunOptions` - Optional configuration

**Returns:** `Promise<CliExpectation>` - Fluent assertion object

**Example:**
```javascript
import { runLocalCitty } from 'citty-test-utils'

const result = await runLocalCitty(['--help'])
result.expectSuccess().expectOutput('USAGE')
```

### `setupCleanroom(options?)`

Initialize Docker cleanroom environment for isolated testing.

**Parameters:**
- `options?: CleanroomOptions` - Optional configuration
  - `rootDir?: string` - Directory to copy into container (default: ".")
  - `nodeImage?: string` - Docker image to use (default: "node:20-alpine")

**Returns:** `Promise<Cleanroom>` - Cleanroom instance

**Example:**
```javascript
import { setupCleanroom } from 'citty-test-utils'

const cleanroom = await setupCleanroom({ 
  rootDir: '.',
  nodeImage: 'node:18-alpine'
})
```

### `runCitty(args, options?)`

Execute GitVan CLI commands in the cleanroom environment.

**Parameters:**
- `args: string[]` - Command line arguments to pass to GitVan CLI
- `options?: RunOptions` - Optional configuration

**Returns:** `Promise<CliExpectation>` - Fluent assertion object

**Example:**
```javascript
import { runCitty } from 'citty-test-utils'

const result = await runCitty(['--version'])
result.expectSuccess().expectOutput(/\d+\.\d+\.\d+/)
```

### `teardownCleanroom()`

Clean up the cleanroom environment and stop containers.

**Returns:** `Promise<void>`

**Example:**
```javascript
import { teardownCleanroom } from 'citty-test-utils'

await teardownCleanroom()
```

## Local Runner

The local runner executes GitVan CLI commands in your local environment with smart project detection.

### Features

- **Automatic Project Detection**: Finds GitVan project root by searching for `package.json` with `"name": "gitvan"`
- **Timeout Support**: Configurable timeout for long-running commands
- **Environment Variables**: Pass custom environment variables
- **JSON Parsing**: Optional JSON output parsing with graceful fallback
- **Error Handling**: Detailed error messages with context

### Options

```typescript
interface RunOptions {
  cwd?: string;                    // Working directory (auto-detected if not provided)
  json?: boolean;                  // Parse stdout as JSON
  timeout?: number;                // Timeout in milliseconds (default: 30000)
  env?: Record<string, string>;     // Environment variables
}
```

### Examples

**Basic Usage:**
```javascript
const result = await runLocalCitty(['--help'])
```

**With Options:**
```javascript
const result = await runLocalCitty(['dev'], {
  timeout: 60000,
  env: { NODE_ENV: 'development' }
})
```

**JSON Output:**
```javascript
const result = await runLocalCitty(['--version'], { json: true })
if (result.result.json) {
  console.log('Version:', result.result.json.version)
}
```

## Cleanroom Runner

The cleanroom runner executes commands in isolated Docker containers for consistent testing.

### Features

- **Isolated Environment**: Each test runs in a fresh container
- **Project Copying**: Automatically copies your project into the container
- **Docker Validation**: Checks Docker availability before setup
- **Persistent Container**: Reuses the same container for multiple commands
- **Error Handling**: Graceful handling of container failures

### Setup Process

1. **Docker Check**: Verifies Docker is available and running
2. **Container Creation**: Creates a new container with the specified image
3. **Project Copy**: Copies the specified directory into the container
4. **Working Directory**: Sets up the working directory in the container

### Examples

**Basic Setup:**
```javascript
await setupCleanroom({ rootDir: '.' })
const result = await runCitty(['--help'])
await teardownCleanroom()
```

**Custom Configuration:**
```javascript
await setupCleanroom({ 
  rootDir: '/path/to/project',
  nodeImage: 'node:18-alpine'
})
```

**Error Handling:**
```javascript
try {
  await setupCleanroom()
} catch (error) {
  console.error('Cleanroom setup failed:', error.message)
  // Handle Docker not available
}
```

## Fluent Assertions

The fluent assertion API provides chainable expectations with detailed error messages.

### Available Assertions

#### Exit Code Assertions

**`expectExit(code: number)`**
- Asserts the command exited with the specified code
- **Example:** `result.expectExit(0)`

**`expectSuccess()`**
- Shorthand for `expectExit(0)`
- **Example:** `result.expectSuccess()`

**`expectFailure()`**
- Asserts the command failed (non-zero exit code)
- **Example:** `result.expectFailure()`

**`expectExitCodeIn(codes: number[])`**
- Asserts the exit code is one of the specified values
- **Example:** `result.expectExitCodeIn([0, 1, 2])`

#### Output Assertions

**`expectOutput(match: string | RegExp)`**
- Asserts stdout matches the specified string or regex
- **Example:** `result.expectOutput('USAGE')` or `result.expectOutput(/gitvan/)`

**`expectOutputContains(text: string)`**
- Asserts stdout contains the specified text
- **Example:** `result.expectOutputContains('commands')`

**`expectOutputNotContains(text: string)`**
- Asserts stdout does not contain the specified text
- **Example:** `result.expectOutputNotContains('error')`

**`expectNoOutput()`**
- Asserts stdout is empty
- **Example:** `result.expectNoOutput()`

**`expectOutputLength(minLength: number, maxLength?: number)`**
- Asserts stdout length is within the specified range
- **Example:** `result.expectOutputLength(100, 1000)`

#### Stderr Assertions

**`expectStderr(match: string | RegExp)`**
- Asserts stderr matches the specified string or regex
- **Example:** `result.expectStderr('Error:')`

**`expectStderrContains(text: string)`**
- Asserts stderr contains the specified text
- **Example:** `result.expectStderrContains('not found')`

**`expectStderrNotContains(text: string)`**
- Asserts stderr does not contain the specified text
- **Example:** `result.expectStderrNotContains('warning')`

**`expectNoStderr()`**
- Asserts stderr is empty
- **Example:** `result.expectNoStderr()`

**`expectStderrLength(minLength: number, maxLength?: number)`**
- Asserts stderr length is within the specified range
- **Example:** `result.expectStderrLength(0, 100)`

#### JSON Assertions

**`expectJson<T>(validator?: (json: T) => void)`**
- Asserts JSON output is available and optionally validates it
- **Example:** `result.expectJson(data => expect(data.version).toBeDefined())`

#### Performance Assertions

**`expectDuration(maxDuration: number)`**
- Asserts command completed within the specified time
- **Example:** `result.expectDuration(5000)`

### Chaining Examples

```javascript
// Basic chaining
result
  .expectSuccess()
  .expectOutput('USAGE')
  .expectNoStderr()

// Complex validation
result
  .expectExit(0)
  .expectOutput(/gitvan/)
  .expectOutputLength(100, 5000)
  .expectStderrLength(0, 50)
  .expectDuration(3000)
  .expectJson(data => {
    expect(data.commands).toBeDefined()
    expect(data.version).toMatch(/\d+\.\d+\.\d+/)
  })
```

## Scenario DSL

The Scenario DSL allows you to build complex multi-step test workflows with detailed logging and error handling.

### Core Functions

#### `scenario(name: string)`

Creates a new scenario builder.

**Parameters:**
- `name: string` - Name of the scenario for logging and identification

**Returns:** `ScenarioBuilder` - Fluent scenario builder

**Example:**
```javascript
const scenario = scenario('My Test Workflow')
```

#### Scenario Builder Methods

**`step(description: string, action?: Function)`**
- Adds a new step to the scenario
- **Parameters:**
  - `description: string` - Human-readable description of the step
  - `action?: Function` - Optional custom action function
- **Returns:** `ScenarioBuilder` - For chaining

**`run(args: string | string[], options?: RunOptions)`**
- Sets the command to run for the current step
- **Parameters:**
  - `args: string | string[]` - Command arguments
  - `options?: RunOptions` - Optional run options
- **Returns:** `ScenarioBuilder` - For chaining

**`expect(expectationFn: (result: CliExpectation) => void)`**
- Adds an expectation to the current step
- **Parameters:**
  - `expectationFn: Function` - Expectation function
- **Returns:** `ScenarioBuilder` - For chaining

**`execute(runner?: 'local' | 'cleanroom')`**
- Executes the scenario
- **Parameters:**
  - `runner?: string` - Runner type ('local' or 'cleanroom')
- **Returns:** `Promise<ScenarioResult>` - Execution result

### Convenience Methods

The scenario builder includes convenience methods that combine `expect()` with common assertions:

- `expectSuccess()` - Expects exit code 0
- `expectFailure()` - Expects non-zero exit code
- `expectExit(code)` - Expects specific exit code
- `expectOutput(match)` - Expects output match
- `expectStderr(match)` - Expects stderr match
- `expectNoOutput()` - Expects empty output
- `expectNoStderr()` - Expects empty stderr
- `expectJson(validator)` - Expects JSON output

### Examples

**Basic Scenario:**
```javascript
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
```

**Complex Scenario:**
```javascript
const result = await scenario('Complete Workflow')
  .step('Initialize project')
  .run('init', 'my-project')
  .expectSuccess()
  .expectOutput(/Initialized/)
  .step('Check status')
  .run('status')
  .expectSuccess()
  .expectOutput(/my-project/)
  .step('Run build')
  .run('build')
  .expectSuccess()
  .expectOutput(/Build complete/)
  .execute('local')
```

**Custom Actions:**
```javascript
const result = await scenario('Custom Workflow')
  .step('Custom setup', async ({ lastResult, context }) => {
    // Custom logic here
    context.setupComplete = true
    return { success: true }
  })
  .step('Run command')
  .run('--help')
  .expectSuccess()
  .execute('local')
```

### Environment-Specific Scenarios

#### `cleanroomScenario(name: string)`

Creates a scenario that automatically uses the cleanroom runner.

**Example:**
```javascript
const result = await cleanroomScenario('Cleanroom Test')
  .step('Test help')
  .run('--help')
  .expectSuccess()
  .execute()
```

#### `localScenario(name: string)`

Creates a scenario that automatically uses the local runner.

**Example:**
```javascript
const result = await localScenario('Local Test')
  .step('Test version')
  .run('--version')
  .expectSuccess()
  .execute()
```

## Test Utilities

Utility functions for common testing patterns and edge cases.

### `testUtils.waitFor(conditionFn, timeout?, interval?)`

Waits for a condition to become true with timeout and interval control.

**Parameters:**
- `conditionFn: () => Promise<boolean>` - Function that returns true when condition is met
- `timeout?: number` - Maximum time to wait in milliseconds (default: 5000)
- `interval?: number` - Check interval in milliseconds (default: 100)

**Returns:** `Promise<boolean>` - True if condition was met, throws if timeout

**Example:**
```javascript
await testUtils.waitFor(async () => {
  const result = await runLocalCitty(['status'])
  return result.result.stdout.includes('ready')
}, 10000, 500)
```

### `testUtils.retry<T>(runnerFn, maxAttempts?, delay?)`

Retries a function until it succeeds or max attempts are reached.

**Parameters:**
- `runnerFn: () => Promise<T>` - Function to retry
- `maxAttempts?: number` - Maximum number of attempts (default: 3)
- `delay?: number` - Delay between attempts in milliseconds (default: 1000)

**Returns:** `Promise<T>` - Result of successful execution

**Example:**
```javascript
const result = await testUtils.retry(async () => {
  const result = await runLocalCitty(['build'])
  result.expectSuccess()
  return result
}, 5, 2000)
```

### `testUtils.createTempFile(content, extension?)`

Creates a temporary file with the specified content.

**Parameters:**
- `content: string` - File content
- `extension?: string` - File extension (default: '.txt')

**Returns:** `Promise<string>` - Path to the created file

**Example:**
```javascript
const tempFile = await testUtils.createTempFile('test data', '.json')
```

### `testUtils.cleanupTempFiles(files)`

Cleans up temporary files and their directories.

**Parameters:**
- `files: string[]` - Array of file paths to clean up

**Returns:** `Promise<void>`

**Example:**
```javascript
await testUtils.cleanupTempFiles([tempFile1, tempFile2])
```

## Pre-built Scenarios

Ready-to-use scenario templates for common GitVan CLI workflows.

### `scenarios.help(options?)`

Tests the help command functionality.

**Parameters:**
- `options?: RunOptions` - Optional run options

**Returns:** `ScenarioBuilder` - Configured scenario builder

**Example:**
```javascript
const result = await scenarios.help().execute('local')
```

### `scenarios.version(options?)`

Tests the version command functionality.

**Parameters:**
- `options?: RunOptions` - Optional run options

**Returns:** `ScenarioBuilder` - Configured scenario builder

**Example:**
```javascript
const result = await scenarios.version().execute('local')
```

### `scenarios.invalidCommand(options?)`

Tests invalid command handling.

**Parameters:**
- `options?: RunOptions` - Optional run options

**Returns:** `ScenarioBuilder` - Configured scenario builder

**Example:**
```javascript
const result = await scenarios.invalidCommand().execute('local')
```

### `scenarios.initProject(projectName?, options?)`

Tests project initialization workflow.

**Parameters:**
- `projectName?: string` - Name of the project to initialize (default: 'test-project')
- `options?: RunOptions` - Optional run options

**Returns:** `ScenarioBuilder` - Configured scenario builder

**Example:**
```javascript
const result = await scenarios.initProject('my-app').execute('local')
```

### `scenarios.buildAndTest(options?)`

Tests build and test workflow.

**Parameters:**
- `options?: RunOptions` - Optional run options

**Returns:** `ScenarioBuilder` - Configured scenario builder

**Example:**
```javascript
const result = await scenarios.buildAndTest().execute('local')
```

### `scenarios.cleanroomInit(projectName?)`

Tests project initialization in cleanroom environment.

**Parameters:**
- `projectName?: string` - Name of the project to initialize (default: 'test-project')

**Returns:** `ScenarioBuilder` - Configured scenario builder

**Example:**
```javascript
const result = await scenarios.cleanroomInit('my-app').execute()
```

### `scenarios.localDev(options?)`

Tests local development workflow.

**Parameters:**
- `options?: RunOptions` - Optional run options

**Returns:** `ScenarioBuilder` - Configured scenario builder

**Example:**
```javascript
const result = await scenarios.localDev().execute()
```

## TypeScript Types

Complete TypeScript definitions for all APIs.

### Core Types

```typescript
interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  json?: unknown;
  cwd: string;
  args: string[];
  duration?: number;
}

interface CliExpectation {
  expectExit(code: number): this;
  expectOutput(match: string | RegExp): this;
  expectStderr(match: string | RegExp): this;
  expectJson<T = any>(matcher?: (json: T) => void): this;
  expectSuccess(): this;
  expectFailure(): this;
  expectNoOutput(): this;
  expectNoStderr(): this;
  expectOutputLength(minLength: number, maxLength?: number): this;
  expectStderrLength(minLength: number, maxLength?: number): this;
  expectExitCodeIn(codes: number[]): this;
  expectOutputContains(text: string): this;
  expectStderrContains(text: string): this;
  expectOutputNotContains(text: string): this;
  expectStderrNotContains(text: string): this;
  expectDuration(maxDuration: number): this;
  result: CliResult;
}

interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  json?: boolean;
  timeout?: number;
}
```

### Cleanroom Types

```typescript
interface Cleanroom {
  runCitty(args: string[], opts?: RunOptions): Promise<CliExpectation>;
  stop(): Promise<void>;
}

interface CleanroomOptions {
  rootDir?: string;
  nodeImage?: string;
}
```

### Scenario Types

```typescript
interface ScenarioStep {
  description: string;
  command: {
    args: string[];
    options: RunOptions;
  } | null;
  expectations: Array<(result: CliExpectation) => void>;
}

interface ScenarioResult {
  scenario: string;
  results: Array<{
    step: string;
    success: boolean;
    result?: CliExpectation;
    error?: string;
  }>;
  success: boolean;
  lastResult?: CliExpectation;
}

interface ScenarioBuilder {
  step(description: string): this;
  run(args: string[], options?: RunOptions): this;
  expect(expectationFn: (result: CliExpectation) => void): this;
  execute(runner?: "local" | "cleanroom"): Promise<ScenarioResult>;
  
  // Convenience methods
  expectSuccess(): this;
  expectFailure(): this;
  expectExit(code: number): this;
  expectOutput(match: string | RegExp): this;
  expectStderr(match: string | RegExp): this;
  expectNoOutput(): this;
  expectNoStderr(): this;
  expectJson<T = any>(matcher?: (json: T) => void): this;
}
```

### Test Utilities Types

```typescript
interface TestUtils {
  waitFor: (
    conditionFn: () => Promise<boolean>,
    timeout?: number,
    interval?: number
  ) => Promise<boolean>;
  retry: <T>(
    runnerFn: () => Promise<T>,
    maxAttempts?: number,
    delay?: number
  ) => Promise<T>;
  createTempFile: (content: string, extension?: string) => Promise<string>;
  cleanupTempFiles: (files: string[]) => Promise<void>;
}
```

## Error Handling

All functions provide detailed error messages with context information.

### Error Message Format

```
Expected [condition], got [actual]
Command: node src/cli.mjs [args]
Working directory: [cwd]
Stdout: [stdout]
Stderr: [stderr]
```

### Common Error Scenarios

**Project Not Found:**
```
CLI not found at /path/to/src/cli.mjs
```

**Docker Not Available:**
```
Docker is not available. Please ensure Docker is installed and running.
```

**Command Timeout:**
```
Command timed out after 30000ms
```

**Cleanroom Setup Failed:**
```
Failed to setup cleanroom: [error message]. Make sure Docker is running and accessible.
```

**Expectation Failed:**
```
Expected stdout to match USAGE, got: [actual output]
Command: node src/cli.mjs --help
```
