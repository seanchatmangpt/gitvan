# GitVan E2E Citty Testing Harness

## Overview

This document describes the comprehensive E2E (End-to-End) testing harness specifically designed for testing GitVan's Citty-based CLI implementation. The harness provides robust testing capabilities, utilities, and organized test suites for validating all CLI commands and functionality.

## Architecture

### Core Components

1. **CittyTestHarness** - Main testing harness for executing CLI commands
2. **CittyTestUtils** - Static utilities for common testing operations
3. **CittyTestSuite** - Organized test suite functionality
4. **CittyTestRunner** - Main test runner for executing test suites
5. **MockDataGenerator** - Generates realistic test data
6. **TestFixtures** - Pre-configured test scenarios
7. **CLIAssertions** - Extended assertion utilities
8. **PerformanceTestUtils** - Performance testing capabilities

### Test Suites

- **GitVanCLITestSuite** - Tests main CLI functionality
- **GitVanGraphTestSuite** - Tests graph persistence commands
- **GitVanDaemonTestSuite** - Tests daemon management commands
- **GitVanEventTestSuite** - Tests event simulation commands
- **GitVanCronTestSuite** - Tests cron scheduling commands
- **GitVanAuditTestSuite** - Tests audit commands
- **GitVanJTBDTestSuite** - Tests JTBD (Jobs To Be Done) commands
- **GitVanWorkflowTestSuite** - Tests workflow commands
- **GitVanHooksTestSuite** - Tests hooks commands

## Usage

### Basic Usage

```javascript
import { CittyTestHarness } from "./citty-test-harness.mjs";

const harness = new CittyTestHarness({
  cliPath: "src/cli.mjs",
  timeout: 30000,
  workingDir: process.cwd(),
});

// Test command success
const result = await harness.testSuccess("graph init-default");

// Test command output
await harness.testOutputContains("graph list-files", "default.ttl");

// Test command failure
await harness.testFailure("invalid-command");
```

### Test Suite Usage

```javascript
import { GitVanE2ETestRunner } from "./gitvan-citty-test-suite.mjs";

const runner = new GitVanE2ETestRunner({
  cliPath: "src/cli.mjs",
  timeout: 30000,
});

const results = await runner.run();
console.log(`Tests passed: ${results.passed}/${results.total}`);
```

### Custom Test Suite

```javascript
import { CittyTestSuite } from "./citty-test-harness.mjs";

const suite = new CittyTestSuite("My Custom Suite", harness);

suite.test("should do something", async () => {
  const result = await harness.testSuccess("my-command");
  // Add assertions
});

await suite.run();
```

## Features

### Command Execution

- **Spawn Process Management**: Proper process spawning with timeout control
- **Output Capture**: Capture stdout and stderr
- **Exit Code Validation**: Validate command exit codes
- **Error Handling**: Comprehensive error handling and reporting

### Test Organization

- **Test Suites**: Organized test suites for different command categories
- **Before/After Hooks**: Setup and teardown hooks for test suites
- **Test Results**: Comprehensive test result tracking and reporting
- **Parallel Execution**: Support for parallel test execution

### Mock Data Generation

- **Project Structure**: Generate realistic GitVan project structures
- **Git Repository**: Create mock Git repositories with commits
- **JTBD Hooks**: Generate mock JTBD hook definitions
- **Workflows**: Create mock workflow definitions
- **Templates**: Generate mock template files

### Assertions

- **Output Validation**: Assert command output contains expected text
- **Pattern Matching**: Assert output matches regex patterns
- **File Operations**: Assert file existence and content
- **Performance**: Assert command execution time limits
- **Exit Codes**: Assert specific exit codes

### Performance Testing

- **Execution Time Measurement**: Measure command execution time
- **Multiple Iterations**: Run commands multiple times for statistics
- **Performance Limits**: Assert performance within specified limits
- **Statistical Analysis**: Calculate average, median, min, max execution times

## Test Data

### Mock Project Structure

```
test-project/
├── package.json
├── gitvan.config.js
├── README.md
├── src/
│   └── index.mjs
├── hooks/
│   ├── code-quality-gatekeeper.mjs
│   └── dependency-vulnerability-scanner.mjs
├── templates/
│   └── component.njk
├── workflows/
│   └── test-workflow.ttl
└── graph/
    └── default.ttl
```

### Mock JTBD Hooks

```javascript
{
  "code-quality-gatekeeper": {
    name: "code-quality-gatekeeper",
    description: "Comprehensive code quality validation",
    category: "core-development-lifecycle",
    domain: "quality",
    hooks: ["pre-commit", "pre-push"],
    predicates: ["ask", "threshold"]
  }
}
```

### Mock Workflows

```javascript
{
  "test-workflow": {
    id: "http://example.org/test-workflow",
    name: "Test Workflow",
    description: "A test workflow for E2E testing",
    steps: [
      {
        id: "step1",
        type: "FileStep",
        operation: "read",
        filePath: "./src/index.mjs"
      }
    ]
  }
}
```

## Running Tests

### Command Line

```bash
# Run all E2E tests
node tests/e2e/run-citty-tests.mjs

# Run specific test suite
node tests/e2e/run-citty-tests.mjs --suite graph

# Run demo
node tests/e2e/citty-test-demo.mjs

# Show help
node tests/e2e/run-citty-tests.mjs --help
```

### Programmatic

```javascript
import { GitVanE2ETestRunner } from "./gitvan-citty-test-suite.mjs";

const runner = new GitVanE2ETestRunner();
const results = await runner.run();
```

## Test Results

### Result Structure

```javascript
{
  total: 72,
  passed: 67,
  failed: 5,
  suites: [
    {
      suite: "GitVan CLI",
      total: 4,
      passed: 4,
      failed: 0,
      tests: [
        {
          name: "should show help when no arguments provided",
          status: "passed"
        }
      ]
    }
  ]
}
```

### Export Results

```javascript
const harness = new CittyTestHarness();
// ... run tests ...
const summary = await harness.exportResults("test-results.json");
```

## Best Practices

### Test Organization

1. **Group Related Tests**: Use test suites to group related functionality
2. **Use Descriptive Names**: Use clear, descriptive test names
3. **Setup and Teardown**: Use beforeEach/afterEach hooks for cleanup
4. **Mock Data**: Use mock data generators for consistent test data

### Assertions

1. **Specific Assertions**: Use specific assertions rather than generic ones
2. **Output Validation**: Validate both stdout and stderr when relevant
3. **Performance Limits**: Set reasonable performance limits for commands
4. **Error Handling**: Test both success and failure scenarios

### Test Data

1. **Realistic Data**: Use realistic mock data that reflects real usage
2. **Consistent Structure**: Maintain consistent project structure across tests
3. **Cleanup**: Always cleanup test data after tests complete
4. **Isolation**: Ensure tests don't interfere with each other

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase timeout for slow commands
2. **Permission Errors**: Ensure test directories are writable
3. **Path Issues**: Use absolute paths for test directories
4. **Process Issues**: Ensure CLI path is correct and executable

### Debugging

1. **Verbose Output**: Enable verbose output for debugging
2. **Result Inspection**: Inspect test results for detailed error information
3. **Manual Testing**: Test commands manually to verify expected behavior
4. **Log Analysis**: Analyze command output and error messages

## Integration

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run E2E Tests
  run: |
    node tests/e2e/run-citty-tests.mjs
    if [ $? -ne 0 ]; then
      echo "E2E tests failed"
      exit 1
    fi
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:e2e": "node tests/e2e/run-citty-tests.mjs",
    "test:e2e:suite": "node tests/e2e/run-citty-tests.mjs --suite",
    "test:e2e:demo": "node tests/e2e/citty-test-demo.mjs"
  }
}
```

## Conclusion

The GitVan E2E Citty Testing Harness provides comprehensive testing capabilities for Citty-based CLI applications. It offers organized test suites, robust utilities, and extensive assertion capabilities to ensure CLI commands work correctly and perform well.

The harness is designed to be easy to use while providing powerful testing capabilities for complex CLI applications. It supports both individual command testing and comprehensive test suite execution, making it suitable for both development and CI/CD environments.
