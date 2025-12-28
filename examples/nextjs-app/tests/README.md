# GitVan v4 Test Suite Documentation

Comprehensive testing infrastructure for `@unrdf/hooks` and the GitVan v4 autonomic system.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Categories](#test-categories)
5. [Coverage Requirements](#coverage-requirements)
6. [Writing New Tests](#writing-new-tests)
7. [Fixtures and Mocks](#fixtures-and-mocks)
8. [Performance Benchmarks](#performance-benchmarks)
9. [CI/CD Integration](#cicd-integration)

---

## Overview

This test suite provides comprehensive coverage for the GitVan v4 hook system, including:

- **Unit Tests**: Individual component testing
- **Integration Tests**: Multi-component interaction testing
- **E2E Tests**: Full workflow validation
- **Performance Benchmarks**: Performance regression detection
- **Snapshot Tests**: State structure validation
- **Memory Leak Tests**: Resource management verification

### Key Technologies

- **Vitest**: Fast, Vite-native testing framework
- **Zod**: Schema validation testing
- **TypeScript**: Type-safe test implementation

---

## Test Structure

```
tests/
├── utils/
│   ├── test-utils.ts       # Testing utilities and helpers
│   └── mocks.ts            # Mock implementations
├── fixtures/
│   └── index.ts            # Test data fixtures
├── unit/
│   ├── schemas.test.ts     # Zod schema tests
│   ├── jtbd-engine.test.ts # JTBD engine tests
│   ├── workflow-generator.test.ts
│   ├── enhanced-workflow-generator.test.ts
│   ├── nunjucks-engine.test.ts
│   ├── hook-state-management.test.ts
│   ├── hook-dependency.test.ts
│   ├── snapshots.test.ts
│   └── memory-leak.test.ts
├── integration/
│   ├── api-hooks.test.ts   # API endpoint tests
│   └── multi-component.test.ts
├── e2e/
│   └── workflow-e2e.test.ts
├── benchmarks/
│   └── performance.bench.ts
└── README.md               # This file
```

---

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test -- --run tests/unit
```

### Integration Tests
```bash
npm test -- --run tests/integration
```

### E2E Tests
```bash
npm test -- --run tests/e2e
```

### With Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

### Specific Test File
```bash
npm test -- tests/unit/schemas.test.ts
```

### Pattern Matching
```bash
npm test -- --grep "should validate"
```

---

## Test Categories

### Unit Tests

Test individual components in isolation.

```typescript
describe('HookSchema', () => {
  it('should validate valid hook', () => {
    const hook = createTestHook();
    const result = safeValidate(HookSchema, hook);
    expect(result.success).toBe(true);
  });
});
```

#### Key Unit Test Files

| File | Description |
|------|-------------|
| `schemas.test.ts` | Zod schema validation |
| `jtbd-engine.test.ts` | Jobs-to-be-Done engine |
| `workflow-generator.test.ts` | Autonomic workflow generation |
| `nunjucks-engine.test.ts` | Template rendering |
| `hook-state-management.test.ts` | State tracking |
| `hook-dependency.test.ts` | Dependency resolution |

### Integration Tests

Test multiple components working together.

```typescript
describe('JTBD + Workflow Integration', () => {
  it('should generate hooks from JTBD outcomes', async () => {
    const job = JTBD_JOB_FIXTURES.developerProductivity;
    jtbdEngine.registerJob(job);

    const hooks = await generator.generateHooksFromPatterns(
      job.outcomes.map(o => ({ type: o.name, ... }))
    );

    expect(hooks.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests

Test complete user workflows.

```typescript
describe('E2E: Deployment Workflow', () => {
  it('should execute complete deployment', async () => {
    stateTracker.update({ stage: 'pre-deployment' });
    await hookExecutor.execute(preDeployHook);

    stateTracker.update({ stage: 'staging' });
    await hookExecutor.execute(stagingHook);

    stateTracker.update({ stage: 'production' });
    await hookExecutor.execute(prodHook);

    expect(stateTracker.getCurrent().stage).toBe('complete');
  });
});
```

---

## Coverage Requirements

Minimum coverage thresholds are enforced:

| Metric | Threshold |
|--------|-----------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

View coverage report:
```bash
npm test -- --coverage
open coverage/index.html
```

---

## Writing New Tests

### Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestHook, assertValidHook } from '../utils/test-utils';

describe('ComponentName', () => {
  let component: ComponentType;

  beforeEach(() => {
    component = new ComponentType();
  });

  describe('methodName', () => {
    it('should do expected behavior', () => {
      // Arrange
      const input = createTestHook();

      // Act
      const result = component.methodName(input);

      // Assert
      expect(result).toBeDefined();
      assertValidHook(result);
    });

    it('should handle edge case', () => {
      expect(() => component.methodName(null)).toThrow();
    });
  });
});
```

### Best Practices

1. **Use descriptive test names**: `should validate hook with valid data`
2. **One assertion per test** when possible
3. **Use fixtures** for consistent test data
4. **Mock external dependencies**
5. **Clean up after tests** using `afterEach`

---

## Fixtures and Mocks

### Using Fixtures

```typescript
import { HOOK_FIXTURES, JTBD_JOB_FIXTURES } from '../fixtures';

it('should process hook', () => {
  const hook = HOOK_FIXTURES.enforcePatternHook;
  // Use fixture...
});
```

### Available Fixtures

- `HOOK_FIXTURES` - Predefined hook configurations
- `JTBD_JOB_FIXTURES` - JTBD job definitions
- `JTBD_SCENARIO_FIXTURES` - JTBD scenarios
- `GIT_EVENT_FIXTURES` - Git events
- `ANALYTICS_FIXTURES` - Analytics data
- `HEALTH_CHECK_FIXTURES` - Health status data

### Using Mocks

```typescript
import { MockOllamaEngine, MockJTBDEngine } from '../utils/mocks';

const mockEngine = new MockOllamaEngine();
mockEngine.setHealthy(true);
mockEngine.setResponse('commitMessage', 'feat: test');
```

---

## Performance Benchmarks

Run benchmarks:
```bash
npm test -- tests/benchmarks
```

### Benchmark Example

```typescript
it('should validate hooks quickly', async () => {
  const benchmark = await runBenchmark(
    'hook-validation',
    () => HOOK_COLLECTION.forEach(h => safeValidate(HookSchema, h)),
    1000
  );

  expect(benchmark.averageTime).toBeLessThan(1);
});
```

### Performance Targets

| Operation | Target |
|-----------|--------|
| Schema validation | < 1ms |
| Template rendering | < 5ms |
| Hook generation | < 20ms |
| Scenario execution | < 50ms |
| High-volume execution | > 200 hooks/sec |

---

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Scheduled runs (nightly)

### Configuration

See `.github/workflows/test.yml` for CI configuration.

### Local CI Simulation

```bash
# Install dependencies
npm ci

# Run linting
npm run lint

# Run tests with coverage
npm test -- --coverage

# Check coverage thresholds
npm test -- --coverage --coverage.check
```

---

## Troubleshooting

### Common Issues

**Tests timing out**
```bash
npm test -- --testTimeout=60000
```

**Memory issues**
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm test
```

**Coverage not generating**
```bash
npm test -- --coverage --reporter=verbose
```

### Debug Mode

```bash
npm test -- --reporter=verbose --inspect
```

---

## Contributing

1. Write tests for all new features
2. Maintain coverage thresholds
3. Follow existing test patterns
4. Update fixtures for new data types
5. Document complex test scenarios

---

## License

MIT License - See repository root for full license.
