# Snapshot Testing

Citty-Test-Utils now includes comprehensive snapshot testing capabilities that allow you to capture and compare CLI output deterministically. This feature is perfect for ensuring that CLI commands produce consistent output across different environments and over time.

## Features

- **Multiple Snapshot Types**: Support for stdout, stderr, JSON, full results, and custom data
- **Intelligent Normalization**: Automatic handling of timestamps, whitespace, and dynamic content
- **Fluent API Integration**: Seamless integration with existing assertion methods
- **Scenario DSL Support**: Snapshot testing within complex test scenarios
- **Pre-built Scenarios**: Ready-to-use snapshot testing patterns
- **Cross-Environment Consistency**: Same snapshots work in local and cleanroom environments

## Quick Start

### Basic Snapshot Testing

```javascript
import { runLocalCitty } from 'citty-test-utils'

// Test that help output matches expected snapshot
const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
result
  .expectSuccess()
  .expectSnapshotStdout('help-output')
```

### Snapshot Types

```javascript
// Different types of snapshots
result.expectSnapshotStdout('help-output')     // stdout only
result.expectSnapshotStderr('error-output')    // stderr only
result.expectSnapshotJson('api-response')      // JSON data
result.expectSnapshotFull('complete-result')   // full result object
result.expectSnapshotOutput('combined')        // stdout + stderr
```

### Scenario DSL Integration

```javascript
import { scenario } from 'citty-test-utils'

const result = await scenario('Help snapshot test')
  .step('Get help')
  .run('--help', { env: { TEST_CLI: 'true' } })
  .expectSuccess()
  .expectSnapshotStdout('help-output')
  .execute()
```

### Snapshot Steps

```javascript
const result = await scenario('Multi-step snapshot workflow')
  .step('Initialize project')
  .run('init', 'test-project', { env: { TEST_CLI: 'true' } })
  .expectSuccess()
  .snapshot('init-output')
  .step('Check status')
  .run('status', { env: { TEST_CLI: 'true' } })
  .expectSuccess()
  .snapshot('status-output', { type: 'full' })
  .execute()
```

## Configuration

### Snapshot Configuration

```javascript
import { SnapshotConfig, getSnapshotManager } from 'citty-test-utils'

const config = new SnapshotConfig({
  snapshotDir: '__snapshots__',        // Directory for snapshots
  updateSnapshots: false,              // Update snapshots on mismatch
  ciMode: process.env.CI === 'true',   // CI environment mode
  ignoreWhitespace: true,              // Normalize whitespace
  ignoreTimestamps: true,              // Remove timestamps
  maxDiffSize: 1000                   // Max diff size for errors
})

const manager = getSnapshotManager(config)
```

### Environment-based Configuration

```javascript
// Different configurations for different environments
const config = new SnapshotConfig({
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true',
  ciMode: process.env.CI === 'true',
  ignoreTimestamps: process.env.NODE_ENV === 'test'
})
```

## Pre-built Snapshot Scenarios

```javascript
import { scenarios } from 'citty-test-utils'

// Help output snapshot
const helpResult = await scenarios.snapshotHelp({ env: { TEST_CLI: 'true' } }).execute()

// Version output snapshot
const versionResult = await scenarios.snapshotVersion({ env: { TEST_CLI: 'true' } }).execute()

// Error output snapshot
const errorResult = await scenarios.snapshotError({ env: { TEST_CLI: 'true' } }).execute()

// Full result snapshot
const fullResult = await scenarios.snapshotFull({ env: { TEST_CLI: 'true' } }).execute()

// Workflow snapshot
const workflowResult = await scenarios.snapshotWorkflow({ env: { TEST_CLI: 'true' } }).execute()
```

## Advanced Usage

### Custom Snapshot Data

```javascript
import { matchSnapshot, snapshotUtils } from 'citty-test-utils'

const result = await runLocalCitty(['status'], { env: { TEST_CLI: 'true' } })

// Create custom snapshot data
const customData = {
  exitCode: result.exitCode,
  hasOutput: result.stdout.length > 0,
  timestamp: new Date().toISOString()
}

// Match against custom snapshot
const snapshotResult = matchSnapshot(customData, __filename, 'custom-status')
if (!snapshotResult.match) {
  throw new Error(snapshotResult.error)
}
```

### Snapshot with Options

```javascript
const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
result
  .expectSuccess()
  .expectSnapshot('help-with-options', {
    type: 'stdout',
    testFile: __filename,
    env: { TEST_CLI: 'true' },
    cwd: process.cwd()
  })
```

### Manual Snapshot Operations

```javascript
import { SnapshotManager } from 'citty-test-utils'

const manager = new SnapshotManager()

// Generate snapshot key
const key = manager.generateKey('test-name', 'snapshot-name', {
  args: ['--help'],
  env: { TEST_CLI: 'true' },
  cwd: process.cwd()
})

// Get snapshot path
const snapshotPath = manager.getSnapshotPath(__filename, 'snapshot-name')

// Load existing snapshot
const existingSnapshot = manager.loadSnapshot(snapshotPath)

// Save new snapshot
const snapshotData = {
  data: 'snapshot content',
  metadata: {
    created: new Date().toISOString(),
    testFile: __filename,
    snapshotName: 'snapshot-name'
  }
}
manager.saveSnapshot(snapshotPath, snapshotData)
```

## Best Practices

### 1. Use Descriptive Snapshot Names

```javascript
// Good: Descriptive names
result.expectSnapshotStdout('help-output')
result.expectSnapshotStderr('invalid-command-error')
result.expectSnapshotJson('status-response')

// Bad: Generic names
result.expectSnapshotStdout('snapshot1')
result.expectSnapshotStderr('error')
```

### 2. Organize Snapshots by Test Context

```javascript
// Group related snapshots
result.expectSnapshotStdout('help-output')
result.expectSnapshotStdout('help-output-detailed')
result.expectSnapshotStdout('help-output-json')
```

### 3. Use Appropriate Snapshot Types

```javascript
// Use stdout for command output
result.expectSnapshotStdout('command-output')

// Use stderr for error messages
result.expectSnapshotStderr('error-message')

// Use json for structured data
result.expectSnapshotJson('api-response')

// Use full for complete result data
result.expectSnapshotFull('complete-result')
```

### 4. Handle Dynamic Content

```javascript
// Configure to ignore timestamps and dynamic content
const config = new SnapshotConfig({
  ignoreTimestamps: true,
  ignoreWhitespace: true
})

const manager = getSnapshotManager(config)
```

### 5. Update Snapshots Safely

```javascript
// Use environment variable to control snapshot updates
const config = new SnapshotConfig({
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true'
})
```

## Troubleshooting

### Common Issues

1. **Snapshot Mismatch**: Check if the output has changed intentionally
2. **Missing Snapshots**: Ensure snapshots are created on first run
3. **Path Issues**: Verify test file paths are correct
4. **Permission Issues**: Check file system permissions for snapshot directory

### Debugging Snapshots

```javascript
// Enable detailed logging
const manager = new SnapshotManager()
const result = manager.matchSnapshot(data, testFile, snapshotName, options)

if (!result.match) {
  console.log('Snapshot mismatch details:', result.comparison)
  console.log('Snapshot path:', result.snapshotPath)
}
```

## Integration with Test Runners

### Vitest Integration

```javascript
import { describe, it, expect } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

describe('CLI Snapshot Tests', () => {
  it('should match help output snapshot', async () => {
    const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
    result
      .expectSuccess()
      .expectSnapshotStdout('help-output')
  })
})
```

### Jest Integration

```javascript
import { runLocalCitty } from 'citty-test-utils'

describe('CLI Snapshot Tests', () => {
  test('should match help output snapshot', async () => {
    const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
    result
      .expectSuccess()
      .expectSnapshotStdout('help-output')
  })
})
```

## API Reference

### SnapshotConfig

Configuration options for snapshot testing:

- `snapshotDir`: Directory for storing snapshots (default: `__snapshots__`)
- `updateSnapshots`: Whether to update snapshots on mismatch (default: `false`)
- `ciMode`: CI environment mode (default: `process.env.CI === 'true'`)
- `ignoreWhitespace`: Normalize whitespace (default: `true`)
- `ignoreTimestamps`: Remove timestamps (default: `true`)
- `maxDiffSize`: Maximum diff size for error messages (default: `1000`)

### SnapshotManager

Core snapshot management functionality:

- `generateKey()`: Generate consistent snapshot keys
- `getSnapshotPath()`: Get snapshot file path
- `loadSnapshot()`: Load existing snapshot
- `saveSnapshot()`: Save snapshot to file
- `normalizeData()`: Normalize data for comparison
- `compareData()`: Compare data structures
- `matchSnapshot()`: Main snapshot matching function

### snapshotUtils

Utility functions for snapshot operations:

- `createSnapshotFromResult()`: Create snapshot from CLI result
- `createSnapshot()`: Create custom snapshot
- `validateSnapshot()`: Validate snapshot data

### Assertion Methods

Snapshot assertion methods available on result objects:

- `expectSnapshot()`: Generic snapshot assertion
- `expectSnapshotStdout()`: stdout snapshot assertion
- `expectSnapshotStderr()`: stderr snapshot assertion
- `expectSnapshotJson()`: JSON snapshot assertion
- `expectSnapshotFull()`: Full result snapshot assertion
- `expectSnapshotOutput()`: Combined output snapshot assertion

### Scenario DSL Methods

Snapshot methods available in scenario DSL:

- `expectSnapshot()`: Add snapshot expectation to step
- `expectSnapshotStdout()`: Add stdout snapshot expectation
- `expectSnapshotStderr()`: Add stderr snapshot expectation
- `expectSnapshotJson()`: Add JSON snapshot expectation
- `expectSnapshotFull()`: Add full result snapshot expectation
- `expectSnapshotOutput()`: Add combined output snapshot expectation
- `snapshot()`: Create snapshot step

This comprehensive snapshot testing system provides deterministic testing capabilities that ensure CLI output consistency across different environments and over time.
