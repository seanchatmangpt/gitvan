# Getting Started

A comprehensive guide to getting started with `citty-test-utils`.

## Table of Contents

- [Installation](#installation)
- [Project Setup](#project-setup)
- [First Test](#first-test)
- [Understanding the Basics](#understanding-the-basics)
- [Next Steps](#next-steps)

## Installation

### Prerequisites

Before installing `citty-test-utils`, ensure you have:

- **Node.js** >= 18.0.0
- **GitVan Project** - A project with GitVan CLI installed
- **Docker** (optional) - For cleanroom testing

### Install the Package

```bash
npm install citty-test-utils
```

### Verify Installation

Create a simple test to verify the installation:

```javascript
// test-installation.mjs
import { runLocalCitty } from 'citty-test-utils'

async function testInstallation() {
  try {
    const result = await runLocalCitty(['--help'])
    console.log('✅ Installation successful!')
    console.log('Exit code:', result.result.exitCode)
    console.log('Output length:', result.result.stdout.length)
  } catch (error) {
    console.error('❌ Installation failed:', error.message)
  }
}

testInstallation()
```

Run the test:

```bash
node test-installation.mjs
```

## Project Setup

### GitVan Project Structure

`citty-test-utils` works with GitVan projects that have this structure:

```
my-gitvan-project/
├── src/
│   └── cli.mjs          # GitVan CLI entry point
├── package.json         # Contains "name": "gitvan"
├── tests/               # Your test files
│   └── cli-tests.mjs
└── node_modules/
    └── citty-test-utils/
```

### Verify GitVan CLI

Ensure your GitVan CLI is working:

```bash
node src/cli.mjs --help
```

You should see output like:

```
Git-native development automation platform (gitvan v3.0.0)

USAGE gitvan graph|daemon|event|cron|audit|hooks|workflow|jtbd|cleanroom|init|setup|save|ensure|pack|marketplace|scaffold|compose|chat
...
```

### Package.json Configuration

Your `package.json` should contain:

```json
{
  "name": "gitvan",
  "type": "module",
  "scripts": {
    "test": "vitest",
    "test:cli": "vitest tests/cli-tests.mjs"
  }
}
```

## First Test

### Basic Local Test

Create your first test file:

```javascript
// tests/first-test.mjs
import { runLocalCitty } from 'citty-test-utils'

async function testHelpCommand() {
  console.log('🧪 Testing help command...')
  
  const result = await runLocalCitty(['--help'])
  
  // Use fluent assertions
  result
    .expectSuccess()           // Expect exit code 0
    .expectOutput('USAGE')    // Expect 'USAGE' in output
    .expectNoStderr()         // Expect no error output
  
  console.log('✅ Help command test passed!')
}

testHelpCommand().catch(console.error)
```

Run the test:

```bash
node tests/first-test.mjs
```

### Using Vitest

For a more structured testing approach, use Vitest:

```javascript
// tests/cli-tests.mjs
import { describe, it } from 'vitest'
import { runLocalCitty } from 'citty-test-utils'

describe('GitVan CLI Tests', () => {
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
      .expectOutput(/\d+\.\d+\.\d+/)  // Regex for version pattern
  })
})
```

Run with Vitest:

```bash
npm run test:cli
```

## Understanding the Basics

### How Local Runner Works

The local runner (`runLocalCitty`) automatically:

1. **Finds GitVan Project**: Searches up the directory tree for `package.json` with `"name": "gitvan"`
2. **Validates CLI Path**: Ensures `src/cli.mjs` exists
3. **Executes Command**: Runs the command with proper working directory
4. **Returns Result**: Provides a fluent assertion object

### Fluent Assertions

The fluent assertion API allows chaining expectations:

```javascript
const result = await runLocalCitty(['--help'])

result
  .expectSuccess()                    // Exit code 0
  .expectOutput('USAGE')              // String match
  .expectOutput(/gitvan/)             // Regex match
  .expectNoStderr()                   // Empty stderr
  .expectOutputLength(100, 5000)      // Length range
```

### Error Messages

When assertions fail, you get detailed error messages:

```
Expected stdout to match USAGE, got: 
Command: node src/cli.mjs --help
Working directory: /path/to/project
Stdout: 
Stderr: Error: Command not found
```

### Working Directory Detection

The runner automatically detects your GitVan project root:

```javascript
// Works from any subdirectory
const result = await runLocalCitty(['--help'])
// Automatically finds the GitVan project root
```

You can also specify a custom working directory:

```javascript
const result = await runLocalCitty(['--help'], {
  cwd: '/custom/path'
})
```

## Next Steps

### 1. Explore More Assertions

Try different assertion methods:

```javascript
const result = await runLocalCitty(['--version'])

result
  .expectSuccess()
  .expectOutput(/\d+\.\d+\.\d+/)      // Version pattern
  .expectOutputLength(1, 20)          // Short output
  .expectDuration(1000)               // Fast execution
```

### 2. Test Error Cases

Test how your CLI handles invalid commands:

```javascript
const result = await runLocalCitty(['invalid-command'])

result
  .expectFailure()                    // Non-zero exit code
  .expectStderr(/Unknown command/)     // Error message
  .expectNoOutput()                   // No stdout
```

### 3. Use Environment Variables

Test with custom environment:

```javascript
const result = await runLocalCitty(['dev'], {
  env: {
    NODE_ENV: 'development',
    DEBUG: 'true'
  },
  timeout: 60000  // 60 second timeout
})
```

### 4. Try Cleanroom Testing

Test in isolated Docker containers:

```javascript
import { setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

// Setup (run once per test suite)
await setupCleanroom({ rootDir: '.' })

// Run tests in cleanroom
const result = await runCitty(['--help'])
result.expectSuccess().expectOutput('USAGE')

// Cleanup
await teardownCleanroom()
```

### 5. Explore Scenarios

Use the scenario DSL for complex workflows:

```javascript
import { scenario } from 'citty-test-utils'

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

## Common Issues

### CLI Not Found

**Error:** `CLI not found at /path/to/src/cli.mjs`

**Solution:** Ensure you're in a GitVan project with `src/cli.mjs`

### Project Detection Failed

**Error:** Runner can't find GitVan project

**Solution:** Check that `package.json` contains `"name": "gitvan"`

### Docker Not Available

**Error:** `Docker is not available`

**Solution:** Install Docker and ensure it's running for cleanroom tests

### Command Timeout

**Error:** `Command timed out after 30000ms`

**Solution:** Increase timeout or optimize your command:

```javascript
const result = await runLocalCitty(['long-running-command'], {
  timeout: 120000  // 2 minutes
})
```

## What's Next?

- [API Reference](../api/README.md) - Complete API documentation
- [Cookbooks](../cookbooks/README.md) - Common use case patterns
- [Advanced Examples](../examples/README.md) - Complex testing scenarios
- [Troubleshooting Guide](../guides/troubleshooting.md) - Common issues and solutions
