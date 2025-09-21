# Getting Started

This chapter will get you up and running with testing GitVan applications using `citty-test-utils`. We'll cover installation, basic setup, and your first test.

## Installation

### Prerequisites

Before installing `citty-test-utils`, ensure you have:

- **Node.js** >= 18.0.0
- **GitVan Project** with CLI installed
- **Docker** (optional, for cleanroom testing)

### Install citty-test-utils

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
  },
  "devDependencies": {
    "citty-test-utils": "^0.2.3",
    "vitest": "^1.0.0"
  }
}
```

## Your First Test

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

## Common First Tests

### Test Help Commands

```javascript
async function testHelpCommands() {
  // Test main help
  const mainHelp = await runLocalCitty(['--help'])
  mainHelp
    .expectSuccess()
    .expectOutput('USAGE')
    .expectOutput(/gitvan/)
    .expectNoStderr()
  
  // Test command-specific help
  const commandHelp = await runLocalCitty(['init', '--help'])
  commandHelp
    .expectSuccess()
    .expectOutput(/init/i)
    .expectOutputLength(100, 2000)
}
```

### Test Version Commands

```javascript
async function testVersionCommands() {
  const result = await runLocalCitty(['--version'])
  
  result
    .expectSuccess()
    .expectOutput(/\d+\.\d+\.\d+/)  // Semantic version pattern
    .expectOutputLength(1, 20)      // Short output
    .expectNoStderr()
    .expectDuration(1000)           // Fast execution
}
```

### Test Error Cases

```javascript
async function testErrorCases() {
  // Test invalid command
  const errorResult = await runLocalCitty(['invalid-command'])
  errorResult
    .expectFailure()                    // Non-zero exit code
    .expectStderr(/Unknown command/)    // Error message
    .expectNoOutput()                  // No stdout
}
```

## Next Steps

Now that you have the basics working, you're ready to explore:

- **[Core Testing Concepts](./core-concepts.md)**: Understanding the testing framework
- **[Local Testing](./local-testing.md)**: Advanced local testing patterns
- **[Cleanroom Testing](./cleanroom-testing.md)**: Isolated Docker testing

## Troubleshooting

### CLI Not Found

**Error:** `CLI not found at /path/to/src/cli.mjs`

**Solution:** Ensure you're in a GitVan project with `src/cli.mjs`

### Project Detection Failed

**Error:** Runner can't find GitVan project

**Solution:** Check that `package.json` contains `"name": "gitvan"`

### Import Errors

**Error:** `Cannot find module 'citty-test-utils'`

**Solution:** 
```bash
npm install citty-test-utils
```

### Command Timeout

**Error:** `Command timed out after 30000ms`

**Solution:** Increase timeout or optimize your command:

```javascript
const result = await runLocalCitty(['long-running-command'], {
  timeout: 120000  // 2 minutes
})
```

---

**Ready for more?** Let's dive into [Core Testing Concepts](./core-concepts.md)!
