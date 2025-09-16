# GitVan v2 Test Suite

## Overview

This test suite verifies all functionality described in the GitVan v2 quickstart guide and ensures the implementation actually works as documented.

## Test Structure

```
tests/
├── quickstart.test.mjs    # Complete quickstart flow tests
├── composables.test.mjs   # useGit, useTemplate, useExec tests
├── cli.test.mjs          # CLI command tests
├── vitest.config.mjs     # Test runner configuration
└── README.md            # This file
```

## Running Tests

```bash
# Install test dependencies
npm install --save-dev vitest @vitest/coverage-v8

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test quickstart

# Run with verbose output
npm test -- --reporter=verbose
```

## Test Coverage

Based on the implementation delta report, current expected coverage:

| Component | Coverage | Status |
|-----------|----------|---------|
| CLI Commands | 60% | Partially implemented |
| Composables | 100% | Fully implemented |
| Templates | 100% | Fully implemented |
| Git Operations | 100% | Fully implemented |
| Job Execution | 60% | Subcommands not working |
| Event System | 30% | Discovery broken |
| Daemon | 30% | Framework only |
| Locks | 20% | Untested |
| Receipts | 20% | Untested |

## Test Categories

### 1. Quickstart Tests (`quickstart.test.mjs`)
Tests the complete 5-minute quickstart flow:
- Installation and setup
- Template creation
- Job definition
- Git history creation
- Job execution
- CHANGELOG.md generation
- Receipt creation
- Event binding
- Daemon operation

### 2. Composables Tests (`composables.test.mjs`)
Tests the composable functions:
- `useGit()` - All 40+ Git operations
- `useTemplate()` - Nunjucks rendering
- `useExec()` - Execution types (cli, js, tmpl)
- Context management with `withGitVan()`

### 3. CLI Tests (`cli.test.mjs`)
Tests all CLI commands:
- `gitvan help`
- `gitvan list` (legacy)
- `gitvan run <job>` (legacy)
- `gitvan job list` ❌ Not implemented
- `gitvan job run --name` ⚠️ Partial
- `gitvan event list` ⚠️ Broken (lists all .mjs files)
- `gitvan schedule apply` ❌ Not implemented
- `gitvan worktree list` ✅ Works
- `gitvan daemon [start|stop|status]` ⚠️ Partial

## Known Test Failures

Based on the implementation delta, these tests will fail:

### Not Implemented
- `gitvan job list` - Returns "not yet implemented"
- `gitvan schedule apply` - Returns "not yet implemented"
- Event pattern matching - No `eventFires()` function
- Lock system tests - Functions exist but untested
- Receipt system tests - Functions exist but untested

### Partially Working
- `gitvan job run --name` - Runs but no output
- Event discovery - Lists ALL .mjs files instead of events
- Daemon polling - Structure exists but untested

### Working But Not Tested
- Multi-worktree support
- LLM execution type
- Job chaining execution type
- Error handling throughout

## Test-Fix-Verify Loop

Following CLAUDE.md requirements, each test should:

1. **TEST** - Run the actual command/function
2. **CAPTURE** - Document what fails
3. **FIX** - Implement only what's needed (80/20)
4. **VERIFY** - Re-run test to confirm
5. **REPEAT** - Minimum 3 iterations

## Adding New Tests

When adding tests for new features:

1. Write the test FIRST (TDD)
2. Run it and verify it fails
3. Implement the minimal code to pass
4. Refactor if needed
5. Ensure all related tests still pass

## Continuous Integration

Add to `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Debugging Failed Tests

```bash
# Run with Node inspector
node --inspect-brk ./node_modules/.bin/vitest run

# Run single test with console output
npm test -- --reporter=verbose --run quickstart

# Check test output directory
ls -la tests/.test-workspace/
ls -la tests/.test-cli/
```

## Test Philosophy

These tests follow the principle: **"Don't claim it works unless you've tested it works."**

Every feature claimed in documentation MUST have a corresponding test that actually executes the feature and verifies the output.

No more "95% complete" claims without verification!