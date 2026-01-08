# Procedure 02: Testing Procedure

## Purpose
Ensure code quality through comprehensive testing at unit, integration, and end-to-end levels, maintaining ≥80% coverage across all metrics.

## Scope
Covers all testing activities from test design to coverage verification, including unit tests, integration tests, BDD tests, and performance tests.

## Frequency
- **Unit Tests**: Every code change
- **Integration Tests**: Every PR
- **Full Test Suite**: Every commit to main
- **Performance Tests**: Weekly
- **Coverage Review**: Every PR

## Responsible Party
**Primary**: All developers
**Secondary**: QA team, Team lead

## Prerequisites
- Development environment set up
- Dependencies installed (`npm install`)
- Understanding of Vitest framework
- Understanding of unctx context system
- Access to test utilities

## Step-by-Step Instructions

### Phase 1: Test Planning

**Step 1.1: Identify What to Test**
- Review feature requirements
- Identify all code paths
- List edge cases and error scenarios
- Plan test categories (unit, integration, E2E)

**Expected Outcome**: Clear test plan
**Verification**: Checklist of scenarios to test

**Step 1.2: Determine Test Type**
| Scenario | Test Type | Location |
|----------|-----------|----------|
| Single function logic | Unit | `tests/unit/` |
| Composable usage | Unit + Context | `tests/composables/` |
| Multiple modules together | Integration | `tests/integration/` |
| CLI commands | BDD | `tests/bdd/` |
| Full workflow | E2E | `tests/e2e/` |

**Expected Outcome**: Test file locations determined
**Verification**: Know which directory to create test in

### Phase 2: Write Unit Tests (TDD)

**Step 2.1: Create Test File First**
```bash
# Follow naming convention: [module].test.mjs
touch tests/composables/my-feature.test.mjs
```
**Expected Outcome**: Test file created
**Verification**: File exists in correct directory

**Step 2.2: Write Test Structure**
```javascript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "@/core/context.mjs";
import { useMyFeature } from "@/composables/my-feature.mjs";
import { createTestContext } from "@tests/helpers/context.mjs";

describe("useMyFeature composable", () => {
  let context;

  beforeEach(async () => {
    // Setup test environment
    context = await createTestContext({
      tempDir: true,
      gitRepo: true
    });
  });

  afterEach(async () => {
    // Cleanup
    await context.cleanup();
  });

  it("should be defined", () => {
    expect(useMyFeature).toBeDefined();
    expect(typeof useMyFeature).toBe("function");
  });

  // Add more tests here
});
```
**Expected Outcome**: Test file structure created
**Verification**: Can run test (even if it fails)

**Step 2.3: Write Specific Test Cases**
```javascript
describe("useMyFeature composable", () => {
  // ... setup ...

  describe("doSomething method", () => {
    it("should return true when condition is met", async () => {
      await withGitVan(context, async () => {
        const feature = useMyFeature();
        const result = await feature.doSomething({ condition: true });

        expect(result).toBe(true);
      });
    });

    it("should return false when condition is not met", async () => {
      await withGitVan(context, async () => {
        const feature = useMyFeature();
        const result = await feature.doSomething({ condition: false });

        expect(result).toBe(false);
      });
    });

    it("should throw error when parameter is invalid", async () => {
      await withGitVan(context, async () => {
        const feature = useMyFeature();

        await expect(
          feature.doSomething({ invalid: true })
        ).rejects.toThrow("Invalid parameter");
      });
    });

    it("should handle async operations correctly", async () => {
      await withGitVan(context, async () => {
        const feature = useMyFeature();

        const promise = feature.doSomething({ async: true });
        expect(promise).toBeInstanceOf(Promise);

        const result = await promise;
        expect(result).toBeDefined();
      });
    });
  });
});
```
**Expected Outcome**: Comprehensive test coverage
**Verification**: Tests cover happy path, edge cases, errors

**Step 2.4: Run Test in Watch Mode**
```bash
npm test my-feature.test.mjs -- --watch
```
**Expected Outcome**: Tests run automatically on file changes
**Verification**: See test results update on save

### Phase 3: Write Integration Tests

**Step 3.1: Create Integration Test**
```bash
touch tests/integration/my-feature-integration.test.mjs
```
**Expected Outcome**: Integration test file created
**Verification**: File exists in integration/ directory

**Step 3.2: Test Multiple Components Together**
```javascript
import { describe, it, expect, beforeEach } from "vitest";
import { withGitVan } from "@/core/context.mjs";
import { useGit } from "@/composables/git.mjs";
import { useTemplate } from "@/composables/template.mjs";
import { useMyFeature } from "@/composables/my-feature.mjs";
import { createTestContext } from "@tests/helpers/context.mjs";

describe("MyFeature Integration", () => {
  let context;

  beforeEach(async () => {
    context = await createTestContext({
      tempDir: true,
      gitRepo: true,
      templates: ["test-template.njk"]
    });
  });

  it("should work with git operations", async () => {
    await withGitVan(context, async () => {
      const git = useGit();
      const feature = useMyFeature();

      // Create a commit
      await git.commit("test commit");

      // Use feature with git context
      const result = await feature.processCommit();

      expect(result.ok).toBe(true);
      expect(result.artifacts).toHaveLength(1);
    });
  });

  it("should work with template rendering", async () => {
    await withGitVan(context, async () => {
      const template = useTemplate();
      const feature = useMyFeature();

      // Generate data
      const data = await feature.generateData();

      // Render template with data
      const rendered = await template.render("test-template.njk", data);

      expect(rendered).toContain("expected output");
    });
  });
});
```
**Expected Outcome**: Integration scenarios tested
**Verification**: Multiple composables work together

### Phase 4: Write BDD Tests (CLI Commands)

**Step 4.1: Create BDD Test**
```bash
touch tests/bdd/my-command.bdd.test.mjs
```
**Expected Outcome**: BDD test file created
**Verification**: File exists in bdd/ directory

**Step 4.2: Test CLI Command**
```javascript
import { describe, it, expect } from "vitest";
import { runCLI } from "@tests/helpers/cli.mjs";

describe("my-command CLI", () => {
  it("should display help when --help is passed", async () => {
    const { stdout, exitCode } = await runCLI(["my-command", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("my-command");
  });

  it("should execute command successfully", async () => {
    const { stdout, exitCode } = await runCLI([
      "my-command",
      "--option",
      "value"
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Success");
  });

  it("should show error for invalid option", async () => {
    const { stderr, exitCode } = await runCLI([
      "my-command",
      "--invalid-option"
    ]);

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Unknown option");
  });
});
```
**Expected Outcome**: CLI behavior tested
**Verification**: Command works as expected

### Phase 5: Run Tests

**Step 5.1: Run Specific Test**
```bash
npm test my-feature.test.mjs
```
**Expected Outcome**: Single test file runs
**Verification**: See test results for that file only

**Step 5.2: Run Test Category**
```bash
# Run all unit tests
npm test tests/unit/

# Run all integration tests
npm test tests/integration/

# Run all BDD tests
npm test tests/bdd/
```
**Expected Outcome**: Category of tests runs
**Verification**: See results for all tests in category

**Step 5.3: Run Full Test Suite**
```bash
npm test
```
**Expected Outcome**: All tests run
**Verification**: See summary of all test results

**Step 5.4: Run with UI**
```bash
npm run test:ui
```
**Expected Outcome**: Browser opens with test UI
**Verification**: Interactive test runner at http://localhost:51204

### Phase 6: Check Coverage

**Step 6.1: Run Coverage Report**
```bash
npm run test:coverage
```
**Expected Outcome**: Coverage report generated
**Verification**: See coverage summary in terminal

**Step 6.2: Review Coverage Report**
```bash
# Open HTML report
open coverage/index.html
# Or on Linux: xdg-open coverage/index.html
```
**Expected Outcome**: Detailed coverage report opens
**Verification**: See line-by-line coverage

**Step 6.3: Verify Coverage Thresholds**
Check that all metrics meet ≥80%:
- **Branches**: ≥ 80%
- **Functions**: ≥ 80%
- **Lines**: ≥ 80%
- **Statements**: ≥ 80%

**Expected Outcome**: All thresholds met
**Verification**: Coverage report shows all green

**Step 6.4: Address Coverage Gaps**
```bash
# Find uncovered code
npm run test:coverage -- --reporter=text

# Review uncovered lines in HTML report
# Add tests for uncovered code
# Re-run coverage
```
**Expected Outcome**: Coverage increases to ≥80%
**Verification**: All metrics above threshold

### Phase 7: Debug Failing Tests

**Step 7.1: Run Single Failing Test**
```bash
npm test my-feature.test.mjs -- --reporter=verbose
```
**Expected Outcome**: Detailed error output
**Verification**: See exact failure reason

**Step 7.2: Add Debug Output**
```javascript
it("should do something", async () => {
  await withGitVan(context, async () => {
    const feature = useMyFeature();

    console.log("Input:", input);
    const result = await feature.doSomething(input);
    console.log("Result:", result);

    expect(result).toBe(expected);
  });
});
```
**Expected Outcome**: Debug information visible
**Verification**: Console logs show in test output

**Step 7.3: Use Debugger**
```javascript
import { describe, it, expect } from "vitest";

it("should do something", async () => {
  debugger; // Will pause here if running with --inspect

  await withGitVan(context, async () => {
    const feature = useMyFeature();
    const result = await feature.doSomething();
    expect(result).toBe(true);
  });
});
```
**Run with debugger**:
```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run my-feature.test.mjs
```
**Expected Outcome**: Debugger pauses at breakpoint
**Verification**: Can step through code

### Phase 8: Performance Testing

**Step 8.1: Create Performance Test**
```javascript
import { describe, it, expect } from "vitest";
import { performance } from "node:perf_hooks";

describe("Performance Tests", () => {
  it("should complete within performance budget", async () => {
    const start = performance.now();

    await withGitVan(context, async () => {
      const feature = useMyFeature();
      await feature.heavyOperation();
    });

    const duration = performance.now() - start;

    // Should complete in under 300ms (p95 target)
    expect(duration).toBeLessThan(300);
  });

  it("should handle concurrent operations", async () => {
    const operations = Array.from({ length: 10 }, (_, i) =>
      withGitVan(context, async () => {
        const feature = useMyFeature();
        return await feature.doSomething({ id: i });
      })
    );

    const start = performance.now();
    const results = await Promise.all(operations);
    const duration = performance.now() - start;

    expect(results).toHaveLength(10);
    expect(duration).toBeLessThan(1000); // All should complete in 1s
  });
});
```
**Expected Outcome**: Performance tests pass
**Verification**: Operations within time budgets

### Phase 9: Continuous Integration Tests

**Step 9.1: Verify CI Configuration**
```yaml
# .github/workflows/test.yml (verify exists)
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```
**Expected Outcome**: CI runs tests automatically
**Verification**: See CI results on GitHub

**Step 9.2: Monitor CI Results**
- Check GitHub Actions tab
- Verify all tests pass
- Review coverage report
- Fix failures before merging

**Expected Outcome**: All CI checks green
**Verification**: Green checkmarks on PR

## Success Criteria

- [ ] All tests pass (0 failures)
- [ ] Coverage ≥ 80% (branches, functions, lines, statements)
- [ ] No skipped tests (.skip or .todo removed)
- [ ] Performance tests within budgets
- [ ] CI tests pass on all commits
- [ ] No test warnings or deprecations
- [ ] Tests are deterministic (no flaky tests)
- [ ] Cleanup properly (no temp files left)

## Troubleshooting

### Issue: Tests Timeout
**Cause**: Async operations not completing
**Solution**:
```javascript
// Increase timeout for specific test
it("slow operation", async () => {
  // ... test code
}, 60000); // 60 second timeout

// Or in config
// vitest.config.mjs
export default defineConfig({
  test: {
    testTimeout: 30000
  }
});
```

### Issue: Context Not Available Error
**Cause**: Not using `withGitVan()` wrapper
**Solution**:
```javascript
// ✗ WRONG
it("test", async () => {
  const git = useGit();
  await git.commit(); // Context lost!
});

// ✓ CORRECT
it("test", async () => {
  await withGitVan(context, async () => {
    const git = useGit();
    await git.commit(); // Context preserved!
  });
});
```

### Issue: Flaky Tests (Sometimes Pass, Sometimes Fail)
**Cause**: Non-deterministic behavior (timing, random values, dates)
**Solution**:
```javascript
// ✗ WRONG - uses current time
const now = new Date();

// ✓ CORRECT - uses fixed time
const now = new Date("2024-01-01T00:00:00Z");

// ✗ WRONG - random values
const value = Math.random();

// ✓ CORRECT - deterministic values
const value = 0.5;

// ✗ WRONG - timing dependent
setTimeout(() => { ... }, 100);

// ✓ CORRECT - await promises
await new Promise(resolve => setTimeout(resolve, 100));
```

### Issue: Low Coverage
**Cause**: Missing test cases
**Solution**:
1. Run `npm run test:coverage`
2. Open `coverage/index.html`
3. Click on file with low coverage
4. See red lines (uncovered)
5. Add tests for those lines
6. Re-run coverage

### Issue: Tests Fail in CI But Pass Locally
**Cause**: Environment differences
**Solution**:
```bash
# Match CI environment
export TZ=UTC
export LANG=C
export NODE_ENV=test

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

### Issue: Memory Leaks in Tests
**Cause**: Not cleaning up resources
**Solution**:
```javascript
describe("tests", () => {
  let context;

  afterEach(async () => {
    // Always cleanup!
    if (context) {
      await context.cleanup();
    }
  });
});
```

## References
- [Vitest Documentation](https://vitest.dev/)
- [Development Workflow](01-DEVELOPMENT-WORKFLOW.md)
- [CLAUDE.md Testing Strategy](/home/user/gitvan/CLAUDE.md#testing-strategy)
- [Test Patterns Guide](/home/user/gitvan/docs/testing/PATTERNS.md)

## Training Requirements

**Who Needs This Training**: All developers

**Training Duration**: 3 hours

**Training Method**:
1. Read this procedure (45 min)
2. Watch testing walkthrough (45 min)
3. Pair programming session (90 min)
4. Write tests independently with review

**Competency Check**:
- [ ] Can write unit tests
- [ ] Can write integration tests
- [ ] Can use unctx context correctly
- [ ] Can check and improve coverage
- [ ] Can debug failing tests
- [ ] Can write performance tests
- [ ] Understands TDD workflow
- [ ] Can use test utilities

## Related Procedures
- [01-DEVELOPMENT-WORKFLOW.md](01-DEVELOPMENT-WORKFLOW.md)
- [03-BUILD-PROCEDURE.md](03-BUILD-PROCEDURE.md)
- [06-PERFORMANCE-MONITORING.md](06-PERFORMANCE-MONITORING.md)

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-08 | 1.0 | Initial creation | GitVan Team |

## Approval

**Approved By**: Team Lead
**Date**: 2026-01-08
**Next Review**: 2026-04-08 (Quarterly)

---

**Remember**: Tests are not optional. 80% coverage is the minimum, not the target. Aim for 100%.
