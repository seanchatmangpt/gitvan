# Citty Test Utils - Comprehensive Test Suite

A complete testing framework for GitVan CLI with unit, integration, and BDD tests.

## 🧪 Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── assertions.test.mjs  # Fluent assertion API tests
│   ├── scenario-dsl.test.mjs # Scenario DSL and test utils tests
│   └── local-runner.test.mjs # Local runner component tests
├── integration/             # Integration tests for component interactions
│   └── full-integration.test.mjs # Cross-component integration tests
└── bdd/                     # BDD tests with scenario-based testing
    └── gitvan-cli-bdd.test.mjs # Behavior-driven development tests
```

## 🚀 Quick Start

### Run All Tests
```bash
pnpm test:run
```

### Run Specific Test Types
```bash
# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# BDD tests only
pnpm test:bdd

# With coverage
pnpm test:coverage
```

### Interactive Testing
```bash
# Watch mode
pnpm test:watch

# UI mode
pnpm test:ui
```

### Comprehensive Test Runner
```bash
node run-tests.mjs
```

## 📋 Test Categories

### Unit Tests (`tests/unit/`)

**Purpose**: Test individual components in isolation

**Coverage**:
- ✅ Fluent assertion API (`assertions.test.mjs`)
- ✅ Scenario DSL and test utilities (`scenario-dsl.test.mjs`)
- ✅ Local runner component (`local-runner.test.mjs`)

**Key Features**:
- Mocked dependencies for isolated testing
- Comprehensive assertion method testing
- Error handling validation
- Method chaining verification

### Integration Tests (`tests/integration/`)

**Purpose**: Test component interactions and real CLI execution

**Coverage**:
- ✅ Local runner with actual GitVan CLI
- ✅ Cleanroom runner with Docker containers
- ✅ Scenario DSL execution
- ✅ Test utilities integration
- ✅ Cross-component workflows

**Key Features**:
- Real CLI command execution
- Docker container management
- File system operations
- Multi-step workflows

### BDD Tests (`tests/bdd/`)

**Purpose**: Behavior-driven development with user-focused scenarios

**Coverage**:
- ✅ CLI help system scenarios
- ✅ Error handling scenarios
- ✅ Command-specific help scenarios
- ✅ Docker cleanroom scenarios
- ✅ Complex workflow scenarios
- ✅ Test utilities scenarios
- ✅ Cross-environment testing

**Key Features**:
- Given-When-Then structure
- User-focused test descriptions
- Scenario-based testing
- Real-world usage patterns

## 🛠️ Test Configuration

### Vitest Configuration (`vitest.config.mjs`)

```javascript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    timeout: 60000, // 60 seconds for Docker operations
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
})
```

### Coverage Thresholds

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## 📊 Test Reports

### Coverage Reports
- **HTML**: `coverage/lcov-report/index.html`
- **JSON**: `coverage/coverage-final.json`
- **LCOV**: `coverage/lcov.info`

### Test Results
- **JSON**: `test-results.json`
- **HTML**: `test-results.html`

## 🎯 Test Scenarios

### Unit Test Scenarios

#### Assertions API
- ✅ Exit code validation
- ✅ Output content matching (string/regex)
- ✅ Stderr validation
- ✅ JSON output handling
- ✅ Success/failure expectations
- ✅ Output length validation
- ✅ Method chaining

#### Scenario DSL
- ✅ Scenario builder creation
- ✅ Step definition and execution
- ✅ Expectation validation
- ✅ Error handling
- ✅ Test utilities (waitFor, retry, temp files)

#### Local Runner
- ✅ Project root detection
- ✅ Process spawning
- ✅ Error handling
- ✅ Timeout management
- ✅ JSON parsing
- ✅ Environment variables

### Integration Test Scenarios

#### Local Runner Integration
- ✅ GitVan CLI command execution
- ✅ Version command handling
- ✅ Invalid command handling
- ✅ Fluent assertions integration
- ✅ JSON output parsing
- ✅ Timeout handling

#### Cleanroom Runner Integration
- ✅ Docker container execution
- ✅ Multiple commands in same container
- ✅ Invalid command handling
- ✅ Fluent assertions in container
- ✅ Container lifecycle management

#### Scenario DSL Integration
- ✅ Complex multi-step scenarios
- ✅ Scenario failure handling
- ✅ Cross-runner compatibility

#### Test Utils Integration
- ✅ Temporary file creation/cleanup
- ✅ Retry logic for flaky operations
- ✅ Wait for conditions
- ✅ Complex workflow integration

### BDD Test Scenarios

#### CLI Help System
- ✅ User requests help
- ✅ Help includes all commands
- ✅ Help is well-formatted
- ✅ User requests version
- ✅ Version is valid semantic version

#### Error Handling
- ✅ Invalid command handling
- ✅ Helpful error messages
- ✅ Graceful failure (no crashes)

#### Command-Specific Help
- ✅ Help for specific commands
- ✅ Relevant help content
- ✅ Multiple command support

#### Docker Cleanroom Testing
- ✅ Isolated environment execution
- ✅ Consistent results
- ✅ Multiple commands in same container

#### Complex Workflows
- ✅ Multi-step GitVan workflows
- ✅ Reproducible workflows
- ✅ Scenario DSL integration

#### Test Utilities
- ✅ Temporary file management
- ✅ Retry logic for flaky operations
- ✅ Wait for conditions
- ✅ Cross-environment testing

## 🔧 Test Utilities

### Available Utilities

```javascript
import { testUtils } from './index.js'

// Wait for conditions
await testUtils.waitFor(() => condition, timeout, interval)

// Retry operations
await testUtils.retry(operation, maxAttempts, delay)

// Temporary files
const tempFile = await testUtils.createTempFile(content, extension)
await testUtils.cleanupTempFiles([tempFile])
```

### Scenario DSL

```javascript
import { scenario } from './index.js'

const testScenario = scenario("Test Name")
  .step("Description")
  .run(args, options)
  .expect(result => result.expectSuccess())

const results = await testScenario.execute(runner)
```

## 🐳 Docker Requirements

For cleanroom tests, ensure Docker is running:

```bash
# Check Docker status
docker --version
docker ps

# Start Docker if needed
sudo systemctl start docker  # Linux
# or start Docker Desktop    # macOS/Windows
```

## 📈 Performance

### Test Execution Times
- **Unit Tests**: ~2-5 seconds
- **Integration Tests**: ~10-30 seconds
- **BDD Tests**: ~30-60 seconds
- **Full Suite**: ~60-120 seconds

### Optimization Tips
- Use `pnpm test:unit` for fast feedback during development
- Use `pnpm test:watch` for continuous testing
- Use `pnpm test:coverage` for coverage analysis
- Use `pnpm test:ui` for interactive debugging

## 🚨 Troubleshooting

### Common Issues

#### Docker Not Running
```bash
# Error: Docker container failed to start
# Solution: Start Docker service
sudo systemctl start docker
```

#### Permission Issues
```bash
# Error: Permission denied
# Solution: Check file permissions
chmod +x run-tests.mjs
```

#### Timeout Issues
```bash
# Error: Test timeout
# Solution: Increase timeout in vitest.config.mjs
timeout: 120000  // 2 minutes
```

#### Coverage Issues
```bash
# Error: Coverage threshold not met
# Solution: Add more tests or adjust thresholds
```

## 📚 Best Practices

### Writing Tests
1. **Unit Tests**: Mock external dependencies
2. **Integration Tests**: Use real components
3. **BDD Tests**: Focus on user scenarios
4. **Coverage**: Aim for 80%+ coverage
5. **Naming**: Use descriptive test names

### Test Organization
1. **Group related tests** in describe blocks
2. **Use beforeEach/afterEach** for setup/cleanup
3. **Keep tests independent** and isolated
4. **Use meaningful assertions** with clear error messages

### Performance
1. **Run unit tests frequently** during development
2. **Run integration tests** before commits
3. **Run BDD tests** for feature validation
4. **Use watch mode** for continuous testing

## 🎉 Success Criteria

A successful test run should show:
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ All BDD tests passing
- ✅ Coverage thresholds met (80%+)
- ✅ No flaky tests
- ✅ Clean test output

## 📞 Support

For issues with the test suite:
1. Check the troubleshooting section
2. Review test output for specific errors
3. Ensure all dependencies are installed
4. Verify Docker is running for cleanroom tests
5. Check file permissions and paths
