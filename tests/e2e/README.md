# GitVan v2 E2E Tests

This directory contains comprehensive end-to-end tests for GitVan v2 CLI commands, testing against the playground environment.

## Test Structure

### Individual CLI Command Tests
- **`chat-cli.test.mjs`** - Tests for AI-powered chat commands (draft, generate, preview, apply, explain, design)
- **`cron-cli.test.mjs`** - Tests for cron job management commands (list, start, dry-run, status)
- **`daemon-cli.test.mjs`** - Tests for daemon control commands (start, stop, status, restart)
- **`event-cli.test.mjs`** - Tests for event management commands (list, simulate, test, trigger)
- **`audit-cli.test.mjs`** - Tests for receipt auditing commands (build, verify, list, show)
- **`llm-cli.test.mjs`** - Tests for direct LLM operations (call, models)

### Integration Tests
- **`cli-integration.test.mjs`** - Comprehensive integration tests covering complete workflows

## Test Environment

All tests run against the **playground** environment (`/playground/`), which provides:
- Pre-configured GitVan setup
- Sample jobs and templates
- Realistic project structure
- Working configuration

## Running Tests

### Run All E2E Tests
```bash
# From project root
node tests/e2e/run-e2e-tests.mjs
```

### Run Individual Test Files
```bash
# Run specific CLI command tests
pnpm test tests/e2e/chat-cli.test.mjs
pnpm test tests/e2e/cron-cli.test.mjs
pnpm test tests/e2e/daemon-cli.test.mjs

# Run integration tests
pnpm test tests/e2e/cli-integration.test.mjs
```

### Run with Vitest
```bash
# Run all e2e tests
pnpm test tests/e2e/

# Run with specific reporter
pnpm test tests/e2e/ --reporter=verbose
```

## Test Coverage

### Chat Commands
- ✅ `chat draft` - AI job specification generation
- ✅ `chat generate` - Complete job file generation
- ✅ `chat preview` - Preview without file creation
- ✅ `chat apply` - Apply generated jobs
- ✅ `chat explain` - Job analysis and explanation
- ✅ `chat design` - Job design recommendations
- ✅ Error handling and edge cases

### Cron Commands
- ✅ `cron list` - List scheduled jobs
- ✅ `cron start` - Start cron scheduler
- ✅ `cron dry-run` - Preview cron execution
- ✅ `cron status` - Check scheduler status
- ✅ Error handling

### Daemon Commands
- ✅ `daemon start` - Start background daemon
- ✅ `daemon stop` - Stop daemon
- ✅ `daemon status` - Check daemon status
- ✅ `daemon restart` - Restart daemon
- ✅ Worktree management

### Event Commands
- ✅ `event list` - List available events
- ✅ `event simulate` - Simulate event triggers
- ✅ `event test` - Test event predicates
- ✅ `event trigger` - Manual event triggering
- ✅ Event validation

### Audit Commands
- ✅ `audit build` - Build audit packs
- ✅ `audit verify` - Verify receipts
- ✅ `audit list` - List receipts
- ✅ `audit show` - Show receipt details
- ✅ Receipt management

### LLM Commands
- ✅ `llm call` - Direct LLM calls
- ✅ `llm models` - List available models
- ✅ Custom parameters (temperature, model)
- ✅ AI unavailability handling

### Integration Workflows
- ✅ Complete job lifecycle
- ✅ AI-powered job generation workflow
- ✅ Daemon and cron integration
- ✅ Event simulation and testing
- ✅ Audit and receipt management
- ✅ LLM operations
- ✅ Error handling and edge cases
- ✅ Configuration and environment
- ✅ Performance and reliability

## Test Features

### Real Environment Testing
- Tests run against actual playground setup
- Uses real GitVan configuration
- Tests with real job files and templates

### Comprehensive Coverage
- All CLI commands tested
- Error conditions covered
- Edge cases handled
- Integration workflows verified

### Reliable Execution
- Proper cleanup after tests
- Isolated test environments
- Consistent test data
- Parallel execution support

### AI Integration Testing
- Tests AI-powered features
- Handles AI unavailability gracefully
- Validates AI-generated content
- Tests custom AI parameters

## Test Data

Tests use the playground environment which includes:
- **Jobs**: `foundation/`, `cicd/`, `docs/`, `test/` directories
- **Templates**: Nunjucks templates for various purposes
- **Configuration**: `gitvan.config.js` with hooks and settings
- **Events**: Sample event handlers
- **Receipts**: Git notes with execution records

## Debugging Tests

### Verbose Output
```bash
pnpm test tests/e2e/ --reporter=verbose
```

### Single Test Debugging
```bash
pnpm test tests/e2e/chat-cli.test.mjs --reporter=verbose
```

### Test Environment Inspection
```bash
# Check playground setup
ls -la playground/
cat playground/gitvan.config.js
```

## Contributing

When adding new E2E tests:

1. **Follow naming convention**: `{command}-cli.test.mjs`
2. **Test against playground**: Use playground environment
3. **Include error cases**: Test both success and failure scenarios
4. **Clean up**: Ensure proper cleanup in `afterEach`
5. **Document**: Add test descriptions and comments
6. **Update coverage**: Update this README with new test coverage

## Test Results

E2E tests verify that:
- ✅ All CLI commands work correctly
- ✅ Commands integrate properly
- ✅ Error handling is robust
- ✅ AI features function as expected
- ✅ Configuration is respected
- ✅ Performance is acceptable
- ✅ Real-world workflows complete successfully

This comprehensive E2E test suite ensures GitVan v2 CLI is production-ready and reliable.
