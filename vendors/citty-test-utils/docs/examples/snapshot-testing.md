# Snapshot Testing Examples

This document provides comprehensive examples of using snapshot testing with citty-test-utils.

## Basic Snapshot Testing

### Simple Output Snapshot

```javascript
import { runLocalCitty } from 'citty-test-utils'

// Test that help output matches expected snapshot
const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
result
  .expectSuccess()
  .expectSnapshotStdout('help-output')
```

### Error Output Snapshot

```javascript
// Test that error output matches expected snapshot
const result = await runLocalCitty(['invalid-command'], { env: { TEST_CLI: 'true' } })
result
  .expectFailure()
  .expectSnapshotStderr('error-output')
```

### JSON Output Snapshot

```javascript
// Test that JSON output matches expected snapshot
const result = await runLocalCitty(['--json', 'status'], { env: { TEST_CLI: 'true' } })
result
  .expectSuccess()
  .expectSnapshotJson('status-json')
```

### Full Result Snapshot

```javascript
// Test that complete result matches expected snapshot
const result = await runLocalCitty(['status'], { env: { TEST_CLI: 'true' } })
result
  .expectSuccess()
  .expectSnapshotFull('status-result')
```

## Advanced Snapshot Testing

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

## Scenario DSL Snapshot Testing

### Basic Scenario with Snapshots

```javascript
import { scenario } from 'citty-test-utils'

const result = await scenario('Help snapshot test')
  .step('Get help')
  .run('--help', { env: { TEST_CLI: 'true' } })
  .expectSuccess()
  .expectSnapshotStdout('help-output')
  .execute()
```

### Multi-step Snapshot Workflow

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

### Cleanroom Snapshot Testing

```javascript
import { cleanroomScenario, setupCleanroom, teardownCleanroom } from 'citty-test-utils'

await setupCleanroom()

const result = await cleanroomScenario('Cleanroom snapshot test')
  .step('Run in cleanroom')
  .run('--version', { env: { TEST_CLI: 'true' } })
  .expectSuccess()
  .expectSnapshotStdout('cleanroom-version')
  .execute()

await teardownCleanroom()
```

## Pre-built Snapshot Scenarios

### Using Built-in Snapshot Scenarios

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

## Snapshot Configuration

### Custom Snapshot Configuration

```javascript
import { SnapshotConfig, getSnapshotManager } from 'citty-test-utils'

// Configure snapshot testing
const config = new SnapshotConfig({
  snapshotDir: '__snapshots__',
  updateSnapshots: false,
  ciMode: process.env.CI === 'true',
  ignoreWhitespace: true,
  ignoreTimestamps: true,
  maxDiffSize: 1000
})

const manager = getSnapshotManager(config)

// Use the configured manager
const result = await runLocalCitty(['--help'], { env: { TEST_CLI: 'true' } })
result.expectSnapshotStdout('help-output')
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

## Snapshot Management

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

### Snapshot Utilities

```javascript
import { snapshotUtils } from 'citty-test-utils'

const result = await runLocalCitty(['status'], { env: { TEST_CLI: 'true' } })

// Create different types of snapshots
const stdoutSnapshot = snapshotUtils.createSnapshotFromResult(result, 'stdout')
const stderrSnapshot = snapshotUtils.createSnapshotFromResult(result, 'stderr')
const jsonSnapshot = snapshotUtils.createSnapshotFromResult(result, 'json')
const fullSnapshot = snapshotUtils.createSnapshotFromResult(result, 'full')

// Create custom snapshot
const customSnapshot = snapshotUtils.createSnapshot({
  custom: 'data',
  timestamp: new Date().toISOString()
}, {
  testName: 'custom-test',
  version: '1.0.0'
})

// Validate snapshot data
const validation = snapshotUtils.validateSnapshot(customSnapshot)
if (!validation.valid) {
  throw new Error(validation.error)
}
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

This comprehensive guide covers all aspects of snapshot testing with citty-test-utils, from basic usage to advanced scenarios and best practices.
