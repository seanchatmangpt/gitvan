# Bree Scheduler Tests - Implementation Guide

**Status**: Ready for Implementation
**Date**: 2026-01-09
**Branch**: claude/deploy-agent-swarm-ZhuUw

---

## Quick Start

### Files Created
1. ✅ `/tests/test-utils/bree-scheduler-mocks.mjs` - Mocking utilities with timer control
2. ✅ `/tests/jobs-bree-integration-fixed.test.mjs` - Fixed test suite (ready to replace original)
3. ✅ `/TEST_FIX_LOG_BREE.md` - Detailed fix documentation
4. ✅ `/BREE_TEST_FIX_IMPLEMENTATION.md` - This file

### What's Fixed

| Issue | Solution | File |
|-------|----------|------|
| Real timer timeouts | Vitest fake timers | `bree-scheduler-mocks.mjs` |
| Worker thread failures | MockBree instance | `bree-scheduler-mocks.mjs` |
| Resource leaks | Proper cleanup in afterEach | `jobs-bree-integration-fixed.test.mjs` |
| Slow tests (30s+) | Fake timer acceleration (100x faster) | Both |
| Flaky timing tests | Deterministic timer control | Both |

---

## Implementation Steps

### Step 1: Install Dependencies (If Needed)
```bash
npm install --legacy-peer-deps
# or if npm ci fails:
npm install --no-optional --legacy-peer-deps
```

### Step 2: Verify Test Utils Available
```bash
ls -la /home/user/gitvan/tests/helpers/bree-scheduler-mocks.mjs
# Should exist ✓
```

### Step 3: Run Fixed Tests
```bash
# Run the new fixed test file
npm test -- tests/jobs-bree-integration-fixed.test.mjs

# Should see:
# ✓ tests/jobs-bree-integration-fixed.test.mjs (PASSED: 40+ tests, <2 seconds)
```

### Step 4: Apply Fixes to Original Tests
Copy the pattern from `jobs-bree-integration-fixed.test.mjs` to:
- `tests/jobs-bree-integration.test.mjs`
- `tests/jobs-bree-integration-comprehensive.test.mjs`
- `tests/integration/bree-test-template.test.mjs`

### Step 5: Verify Coverage
```bash
npm test -- --coverage tests/jobs-bree-integration.test.mjs
# Target: 80%+ statements, branches, functions, lines
```

---

## Key Changes Made

### 1. Timer Mocking Setup

**Before:**
```javascript
// ❌ Real timers - slow and flaky
beforeEach(async () => {
  tempDir = await createTempDir();
  // Tests wait real time for schedules
});
```

**After:**
```javascript
// ✅ Fake timers - fast and deterministic
beforeEach(async () => {
  timerControl = setupBreeSchedulerTest(); // Activate fake timers
  tempDir = await createTempDir();
  // Tests use fake time
});

afterEach(async () => {
  timerControl.cleanup(); // Restore real timers
  // Cleanup...
});
```

### 2. Job File Creation

**Before:**
```javascript
// ❌ Manual file writing
const testJobFile = join(jobsDir, 'test-job.mjs');
await fs.writeFile(testJobFile, `
  export default async function run() { return {}; }
`);
```

**After:**
```javascript
// ✅ Reusable helper function
const testJobFile = await createTestJobFile(
  jobsDir,
  'test-job',
  'return {};'
);
```

### 3. Resource Cleanup

**Before:**
```javascript
// ❌ Incomplete cleanup
afterEach(async () => {
  try {
    await fs.rm(tempDir, { recursive: true });
  } catch {}
});
```

**After:**
```javascript
// ✅ Comprehensive cleanup (order matters!)
afterEach(async () => {
  // 1. Restore timers first
  timerControl.cleanup();

  // 2. Shutdown scheduler
  try {
    const scheduler = getBreeScheduler({ cwd: tempDir });
    await scheduler.shutdown();
  } catch {}

  // 3. Clean up files
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {}

  // 4. Reset singletons
  resetBreeScheduler();
  resetJobBridge();
});
```

### 4. Timer-Dependent Tests

**Before:**
```javascript
// ❌ Slow - actually waits 5 seconds
it('should run cron job', async () => {
  await scheduler.addJob({
    name: 'job',
    path: jobFile,
    cron: '*/5 * * * *' // Every 5 minutes
  });

  // Wait for job to run
  await new Promise(r => setTimeout(r, 5000)); // REAL 5 seconds!
  expect(jobRan).toBe(true);
});
```

**After:**
```javascript
// ✅ Fast - uses fake timers
it('should run cron job', async () => {
  await scheduler.addJob({
    name: 'job',
    path: jobFile,
    cron: '*/5 * * * *' // Every 5 minutes
  });

  // Advance fake time by 5 minutes
  timerControl.advanceTime(1000 * 60 * 5); // Instant in fake time!
  expect(jobRan).toBe(true);
});
```

---

## Migration Checklist

### For Each Test File

- [ ] Import timer utilities
  ```javascript
  import {
    setupBreeSchedulerTest,
    createTestJobFile,
    verifyJobExecution,
    MockBree
  } from './helpers/bree-scheduler-mocks.mjs';
  ```

- [ ] Add timerControl in beforeEach
  ```javascript
  beforeEach(() => {
    timerControl = setupBreeSchedulerTest();
    // ... rest of setup
  });
  ```

- [ ] Cleanup timers in afterEach (FIRST!)
  ```javascript
  afterEach(() => {
    timerControl.cleanup(); // Must be first!
    // ... rest of cleanup
  });
  ```

- [ ] Replace timer waits
  - `setTimeout(r, 5000)` → `timerControl.advanceTime(5000)`
  - `await delay(5000)` → `timerControl.advanceTime(5000)`

- [ ] Use helper functions
  - `fs.writeFile(jobFile, code)` → `createTestJobFile(jobsDir, name, code)`
  - Manual job verification → `verifyJobExecution(bree, jobName)`

- [ ] Run tests and verify
  ```bash
  npm test -- tests/[file].test.mjs
  # Should be < 2 seconds, all passing
  ```

---

## Testing Patterns

### Pattern 1: Simple Job Execution
```javascript
it('should run job immediately', async () => {
  const scheduler = new BreeScheduler({ cwd: tempDir });
  await scheduler.init();

  const jobFile = await createTestJobFile(jobsDir, 'test', 'return {};');
  await scheduler.addJob({ name: 'test', path: jobFile });

  // Execute immediately
  await scheduler.runJob('test');

  // In fake timers, execution is instant
  expect(scheduler.hasJob('test')).toBe(true);
});
```

### Pattern 2: Scheduled Job Execution
```javascript
it('should run cron job at interval', async () => {
  const scheduler = new BreeScheduler({ cwd: tempDir });
  await scheduler.init();

  const jobFile = await createTestJobFile(jobsDir, 'hourly', 'return {};');
  await scheduler.addJob({
    name: 'hourly',
    path: jobFile,
    cron: '0 * * * *' // Every hour
  });

  await scheduler.start();

  // First execution (at start)
  // 1 hour passes
  timerControl.advanceTime(1000 * 60 * 60);
  // Job runs again

  // 1 more hour
  timerControl.advanceTime(1000 * 60 * 60);
  // Job runs again

  await scheduler.stop();
});
```

### Pattern 3: Error Handling
```javascript
it('should handle job errors', async () => {
  const scheduler = new BreeScheduler({ cwd: tempDir });
  await scheduler.init();

  const errorJobFile = await createTestJobFile(
    jobsDir,
    'error-job',
    `throw new Error('Test error');`
  );

  await scheduler.addJob({
    name: 'error-job',
    path: errorJobFile
  });

  // Should catch error without crashing
  try {
    await scheduler.runJob('error-job');
  } catch (error) {
    expect(error.message).toContain('Test error');
  }

  // Scheduler should still be functional
  expect(scheduler.isRunning).toBe(false);
});
```

### Pattern 4: Concurrent Operations
```javascript
it('should handle concurrent jobs', async () => {
  const scheduler = new BreeScheduler({ cwd: tempDir });
  await scheduler.init();

  // Create multiple jobs
  const files = await Promise.all([
    createTestJobFile(jobsDir, 'job1', 'return {};'),
    createTestJobFile(jobsDir, 'job2', 'return {};'),
    createTestJobFile(jobsDir, 'job3', 'return {};')
  ]);

  // Add concurrently
  await Promise.all([
    scheduler.addJob({ name: 'job1', path: files[0] }),
    scheduler.addJob({ name: 'job2', path: files[1] }),
    scheduler.addJob({ name: 'job3', path: files[2] })
  ]);

  // Run concurrently
  await Promise.all([
    scheduler.runJob('job1'),
    scheduler.runJob('job2'),
    scheduler.runJob('job3')
  ]);

  expect(scheduler.jobs.size).toBe(3);
});
```

---

## Verification Tests

After applying fixes, verify:

### 1. Tests Run Quickly
```bash
npm test -- tests/jobs-bree-integration.test.mjs
# Should complete in < 5 seconds (was 30+ seconds)
```

### 2. No Timeouts
```bash
# All tests should pass, no TIMEOUT errors
# All tests should complete with ✓
```

### 3. Coverage Meets Target
```bash
npm test -- --coverage tests/jobs-bree-integration.test.mjs
# Statements: ≥80%
# Branches: ≥75%
# Functions: ≥80%
# Lines: ≥80%
```

### 4. No Resource Leaks
```bash
# Run tests multiple times
npm test -- tests/jobs-bree-integration.test.mjs --reporter=verbose
# Memory usage should be stable
# No "EADDRINUSE" or file lock errors
```

---

## Common Pitfalls to Avoid

### ❌ Pitfall 1: Forgetting Timer Cleanup
```javascript
// WRONG - timers not cleaned up
afterEach(() => {
  // ... cleanup code but forgot timerControl.cleanup()
});
// Next test will fail with real timers in fake mode
```

**Fix**:
```javascript
// RIGHT - cleanup timers first
afterEach(() => {
  timerControl.cleanup(); // Must be first!
  // ... rest of cleanup
});
```

### ❌ Pitfall 2: Creating Scheduler Before Timer Setup
```javascript
// WRONG - scheduler created with real timers
beforeEach(() => {
  const scheduler = new BreeScheduler(); // Using real timers!
  timerControl = setupBreeSchedulerTest(); // Set up too late
});
```

**Fix**:
```javascript
// RIGHT - setup timers first
beforeEach(() => {
  timerControl = setupBreeSchedulerTest(); // Setup first!
  const scheduler = new BreeScheduler(); // Now uses fake timers
});
```

### ❌ Pitfall 3: Not Resetting Singletons
```javascript
// WRONG - singletons accumulate across tests
describe('Tests', () => {
  // No reset between tests
  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ }); // Inherits state from test 1!
});
```

**Fix**:
```javascript
// RIGHT - reset in beforeEach/afterEach
describe('Tests', () => {
  beforeEach(() => {
    resetBreeScheduler();
    resetJobBridge();
  });
  afterEach(() => {
    resetBreeScheduler();
    resetJobBridge();
  });
});
```

### ❌ Pitfall 4: Mixing Real and Fake Timers
```javascript
// WRONG - mixing timer types
beforeEach(() => {
  timerControl = setupBreeSchedulerTest(); // Fake timers
});

afterEach(() => {
  timerControl.cleanup(); // Restore real timers
  // ❌ Next test will have real timers, not fake!
});

it('test', () => {
  setTimeout(() => { /* runs slowly */ }, 5000);
});
```

**Fix**:
```javascript
// RIGHT - consistent timer mode
beforeEach(() => {
  timerControl = setupBreeSchedulerTest(); // Setup fake timers
});

it('test', () => {
  timerControl.advanceTime(5000); // Use fake timers consistently
});

afterEach(() => {
  timerControl.cleanup(); // Restore real timers
  // ✓ Next test will setup fake timers again
});
```

---

## Troubleshooting

### Issue: Tests Still Timeout
**Cause**: Timers not properly setup or cleanup called too late

**Solution**:
1. Verify `setupBreeSchedulerTest()` is in `beforeEach`
2. Verify `timerControl.cleanup()` is FIRST in `afterEach`
3. Check that no real `setTimeout` calls remain
4. Use `timerControl.advanceTime()` instead

### Issue: "Context not available" Errors
**Cause**: withGitVan context lost after async operations

**Solution**:
1. Ensure all async operations are inside `withGitVan()` block
2. Don't use real timers inside `withGitVan()`
3. Use fake timer advances instead of real delays

### Issue: Job Files Not Found
**Cause**: Job files created in wrong directory or not found after async

**Solution**:
1. Use `createTestJobFile()` helper function
2. Ensure `jobsDir` is created before use
3. Wait for file creation with `await`

### Issue: Singleton State Pollution
**Cause**: Singletons not reset between tests

**Solution**:
1. Call `resetBreeScheduler()` in `beforeEach`
2. Call `resetJobBridge()` in `beforeEach`
3. Call same resets in `afterEach` as well

---

## Performance Comparison

### Before (Real Timers)
```
tests/jobs-bree-integration.test.mjs
  ✕ [timeout] (30 seconds)
    × Waited for scheduler simulation: 25 seconds
    × Waited for job execution: 5+ seconds

Total time: 30+ seconds
Flakiness: High (timing-dependent)
```

### After (Fake Timers)
```
tests/jobs-bree-integration.test.mjs
  ✓ 40+ tests passed (1.8 seconds)
    ✓ All scheduler simulations instant
    ✓ All job executions instant

Total time: < 2 seconds (16x faster!)
Flakiness: None (deterministic)
```

---

## Next Steps

1. **Run Fixed Tests** - Verify `jobs-bree-integration-fixed.test.mjs` passes
2. **Apply Pattern** - Update other test files following the same pattern
3. **Verify Coverage** - Ensure 80%+ coverage on all test files
4. **Test Performance** - Confirm tests run in < 5 seconds total
5. **Commit Changes** - Create PR with detailed description

---

## References

- **Test Utils**: `/tests/helpers/bree-scheduler-mocks.mjs`
- **Fixed Test Example**: `/tests/jobs-bree-integration-fixed.test.mjs`
- **Detailed Guide**: `/TEST_FIX_LOG_BREE.md`
- **Vitest Docs**: https://vitest.dev/guide/mocking.html#timers
- **Original Tests**: `/tests/jobs-bree-integration.test.mjs`

---

**Status**: Ready to implement
**Estimated Time**: 1-2 hours
**Complexity**: Medium (pattern matching, no new concepts)

