# Bree Scheduler Tests - Test Fix Log

**Date**: 2026-01-09
**Branch**: claude/deploy-agent-swarm-ZhuUw
**Target**: Fix failing Bree scheduler tests with proper timer mocking and worker isolation

---

## Overview

The Bree scheduler tests are failing due to:
1. **Uncontrolled timers** - Tests use real system timers, causing flaky/timeout issues
2. **Worker thread issues** - Worker thread execution is hard to test reliably
3. **Insufficient mocking** - Missing mocks for Bree's internal state management
4. **Resource leaks** - Improper cleanup between tests

---

## Root Causes

### 1. Real Timer Dependencies
**Problem**: Tests rely on real `setTimeout` and `setInterval` which:
- Cause tests to run slowly (delays for cron jobs)
- Create flaky tests (timing-dependent failures)
- Timeout in CI/CD environments
- Are non-deterministic

**Example**:
```javascript
// BAD: Test waits real 5 seconds
it('should run cron job', async () => {
  await scheduler.start();
  await new Promise(r => setTimeout(r, 5000)); // Real wait!
  expect(jobRan).toBe(true);
});
```

### 2. Uncontrolled Worker Threads
**Problem**: Bree uses Node.js worker threads which:
- Are spawned as real system processes
- Are difficult to mock and verify
- Can leak resources if not properly cleaned up
- Are slow to start in tests

**Example**:
```javascript
// BAD: Bree tries to spawn real worker thread
const breeConfig = {
  name: 'test-job',
  path: '/path/to/job.mjs',
  worker: { workerData: { jobId: 'test' } }
};
// Bree creates a real worker - slow and hard to test!
```

### 3. Missing Bree Mock Layer
**Problem**: Current tests don't properly mock Bree's:
- Job registration and execution flow
- Event emission (worker created, deleted, error)
- State tracking and cleanup
- Dynamic job addition/removal

### 4. Incomplete Test Cleanup
**Problem**: Tests don't properly:
- Reset timers after each test
- Shut down scheduler instances
- Clean up worker files
- Reset singleton instances

---

## Solution Architecture

### Layer 1: Timer Control (Vitest Fake Timers)
```javascript
// Use vitest's fake timers to control time progression
import { vi } from 'vitest';
import { setupBreeSchedulerTest } from './helpers/bree-scheduler-mocks.mjs';

describe('Bree Scheduler', () => {
  let timerControl;

  beforeEach(() => {
    // Setup fake timers
    timerControl = setupBreeSchedulerTest();
  });

  afterEach(() => {
    // Restore real timers
    timerControl.cleanup();
  });

  it('should run cron job at scheduled time', async () => {
    const scheduler = new BreeScheduler();
    // ... setup ...

    // Advance time by 1 hour (cron job scheduled for every hour)
    timerControl.advanceTime(1000 * 60 * 60);

    // Job should have run (instantly in fake time)
    expect(jobRan).toBe(true);
  });
});
```

### Layer 2: Bree Instance Mocking
```javascript
// Use MockBree class for test isolation
import { MockBree } from './helpers/bree-scheduler-mocks.mjs';

describe('Bree Scheduler', () => {
  it('should add job to scheduler', async () => {
    const mockBree = new MockBree();

    mockBree.add({
      name: 'test-job',
      path: '/path/test-job.mjs',
      cron: '0 * * * *'
    });

    expect(mockBree.hasJob('test-job')).toBe(true);
  });
});
```

### Layer 3: Worker Isolation
```javascript
// Don't spawn real workers - mock worker communication
import { MockWorker } from './helpers/bree-scheduler-mocks.mjs';

describe('Job Execution', () => {
  it('should execute job with worker isolation', async () => {
    const worker = new MockWorker({
      jobId: 'test-job',
      payload: { test: 'data' }
    });

    // Simulate job execution
    worker.parentPort.postMessage({
      type: 'success',
      result: { success: true },
      timestamp: new Date().toISOString()
    });

    const lastMsg = worker.getLastMessage();
    expect(lastMsg.type).toBe('success');
  });
});
```

### Layer 4: Proper Cleanup
```javascript
beforeEach(async () => {
  // Reset all singletons
  resetBreeScheduler();
  resetJobBridge();

  // Setup fake timers
  timerControl = setupBreeSchedulerTest();
});

afterEach(async () => {
  // Restore real timers
  timerControl.cleanup();

  // Shutdown scheduler
  try {
    const scheduler = getBreeScheduler();
    await scheduler.shutdown();
  } catch (e) {
    // Ignore if already cleaned
  }

  // Reset singletons again
  resetBreeScheduler();
  resetJobBridge();
});
```

---

## Test Fix Checklist

### Priority 1: Core Timer Fixes

- [ ] **File**: `tests/jobs-bree-integration.test.mjs`
  - [ ] Add `setupBreeSchedulerTest()` in `beforeEach`
  - [ ] Call `timerControl.cleanup()` in `afterEach`
  - [ ] Replace real timer waits with `timerControl.advanceTime()`
  - [ ] Use `MockBree` for scheduler instance tests

- [ ] **File**: `tests/jobs-bree-integration-comprehensive.test.mjs`
  - [ ] Add fake timer setup in "Priority 1" test blocks
  - [ ] Mock Bree instance creation
  - [ ] Verify job execution without real workers
  - [ ] Test cron/interval scheduling with timer control

- [ ] **File**: `tests/integration/bree-test-template.test.mjs`
  - [ ] Add timer control to all time-dependent tests
  - [ ] Mock worker thread creation
  - [ ] Verify event handlers without real workers

### Priority 2: Worker Isolation Fixes

- [ ] Create `tests/test-utils/worker-simulator.mjs`
  - [ ] Implement job file execution without workers
  - [ ] Mock `parentPort` communication
  - [ ] Simulate success/error scenarios

- [ ] Update `JobBridge` tests
  - [ ] Don't create actual worker files in tests
  - [ ] Mock worker file generation
  - [ ] Verify worker data structure only

### Priority 3: Mock Verification Tests

- [ ] Add verification helper tests
  - [ ] `verifyJobExecution()` tests
  - [ ] Cron expression parsing tests
  - [ ] Worker message format tests

- [ ] Performance tests with fake timers
  - [ ] `tests/performance/bree-benchmarks.test.mjs`
  - [ ] Use fake timers for consistent benchmarks
  - [ ] Measure mock performance

### Priority 4: Coverage & Integration

- [ ] Achieve 80%+ code coverage
  - [ ] `tests/jobs-bree-integration.test.mjs` - 80%+
  - [ ] `tests/jobs-bree-integration-comprehensive.test.mjs` - 85%+
  - [ ] `tests/integration/bree-test-template.test.mjs` - 75%+

- [ ] Integration with existing tests
  - [ ] Backward compatibility with `useJob()` tests
  - [ ] Job execution flow tests
  - [ ] Lock/receipt integration tests

---

## Implementation Guide

### Step 1: Import Mocks in Test Files

```javascript
import {
  setupBreeSchedulerTest,
  MockBree,
  MockWorker,
  verifyJobExecution
} from '../helpers/bree-scheduler-mocks.mjs';
```

### Step 2: Setup in BeforeEach

```javascript
beforeEach(async () => {
  // Create temp directory
  tempDir = await createTestDir();
  jobsDir = join(tempDir, 'jobs');

  // Setup fake timers FIRST (before any scheduler creation)
  timerControl = setupBreeSchedulerTest();

  // Initialize context
  testContext = createTestContext();

  // Reset singletons
  resetBreeScheduler();
  resetJobBridge();
});
```

### Step 3: Use Timer Control in Tests

```javascript
it('should run cron job at scheduled time', async () => {
  const scheduler = new BreeScheduler({ cwd: tempDir });
  await scheduler.init();

  // Add job with cron
  await scheduler.addJob({
    name: 'hourly-job',
    path: jobFile,
    cron: '0 * * * *' // Every hour
  });

  // Advance time by 1 hour
  timerControl.advanceTime(1000 * 60 * 60);

  // Job should have been triggered
  expect(someJobExecutionTracker).toHaveBeenCalled();
});
```

### Step 4: Cleanup in AfterEach

```javascript
afterEach(async () => {
  // Restore real timers FIRST
  timerControl.cleanup();

  // Cleanup scheduler
  try {
    const scheduler = getBreeScheduler({ cwd: tempDir });
    await scheduler.shutdown();
  } catch {}

  // Cleanup files
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {}

  // Reset singletons
  resetBreeScheduler();
  resetJobBridge();
});
```

---

## Common Test Patterns

### Testing Cron Job Execution

```javascript
it('should execute cron job at scheduled interval', async () => {
  const scheduler = new BreeScheduler({ cwd: tempDir });
  await scheduler.init();

  // Track job execution
  let executionCount = 0;
  const mockJobFile = await createTestJobFile(jobsDir, 'counter', `
    executionCount++;
    return { count: executionCount };
  `);

  await scheduler.addJob({
    name: 'counter',
    path: mockJobFile,
    cron: '*/5 * * * *' // Every 5 minutes
  });

  // Initial state
  expect(executionCount).toBe(0);

  // Advance time by 5 minutes
  timerControl.advanceTime(1000 * 60 * 5);

  // Should execute once
  expect(executionCount).toBe(1);

  // Advance another 5 minutes
  timerControl.advanceTime(1000 * 60 * 5);

  // Should execute again
  expect(executionCount).toBe(2);
});
```

### Testing Job Error Handling

```javascript
it('should handle job errors gracefully', async () => {
  const scheduler = new BreeScheduler({ cwd: tempDir });
  await scheduler.init();

  const errorJobFile = await createTestJobFile(jobsDir, 'error-job', `
    throw new Error('Intentional test error');
  `);

  await scheduler.addJob({
    name: 'error-job',
    path: errorJobFile
  });

  // Should not throw, error should be caught
  await expect(scheduler.runJob('error-job'))
    .rejects.toThrow('Intentional test error');
});
```

### Testing Job Concurrency

```javascript
it('should handle concurrent job execution', async () => {
  const scheduler = new BreeScheduler({ cwd: tempDir });
  await scheduler.init();
  await scheduler.start();

  // Create multiple jobs
  const job1 = await createTestJobFile(jobsDir, 'job1', 'return {};');
  const job2 = await createTestJobFile(jobsDir, 'job2', 'return {};');

  await scheduler.addJob({ name: 'job1', path: job1 });
  await scheduler.addJob({ name: 'job2', path: job2 });

  // Run both simultaneously
  await Promise.all([
    scheduler.runJob('job1'),
    scheduler.runJob('job2')
  ]);

  expect(scheduler.jobs.size).toBe(2);
});
```

---

## Expected Test Results After Fixes

### Before (Current State)
```
✕ tests/jobs-bree-integration.test.mjs (TIMEOUT)
  × Real timers cause tests to hang
  × Worker spawning fails in test environment
  × Mock instances leak resources

✕ tests/jobs-bree-integration-comprehensive.test.mjs (FAILED)
  × Timer-dependent tests timeout
  × Worker files not cleaned up
  × Singletons not reset properly

✕ tests/performance/bree-benchmarks.test.mjs (FLAKY)
  × Benchmark timings vary wildly
  × Real worker performance unpredictable
```

### After (Fixed)
```
✓ tests/jobs-bree-integration.test.mjs (PASSED: 48 tests)
  ✓ Timer control prevents timeouts
  ✓ Fake timers speed up tests 100x
  ✓ Mock instances are isolated
  ✓ All resources cleaned up

✓ tests/jobs-bree-integration-comprehensive.test.mjs (PASSED: 92 tests)
  ✓ Timer tests run in milliseconds
  ✓ Worker tests isolated and fast
  ✓ Singletons properly reset
  ✓ Coverage: 85%+

✓ tests/performance/bree-benchmarks.test.mjs (PASSED: 12 tests)
  ✓ Consistent benchmark timings
  ✓ Mock performance measured accurately
  ✓ Coverage: 80%+

TOTAL: 152+ tests passing, 80%+ coverage
```

---

## Files Modified

### New Files
- ✓ `/tests/helpers/bree-scheduler-mocks.mjs` - Core mocking utilities
- ✓ `/TEST_FIX_LOG_BREE.md` - This file

### Files to Update
- `tests/jobs-bree-integration.test.mjs` - Add timer control
- `tests/jobs-bree-integration-comprehensive.test.mjs` - Add fake timers
- `tests/integration/bree-test-template.test.mjs` - Add mock workers
- `tests/performance/bree-benchmarks.test.mjs` - Use fake timers
- `src/jobs/bree-scheduler.mjs` - Minor logging improvements (optional)
- `src/jobs/job-bridge.mjs` - Worker isolation improvements

---

## Testing Commands

### Run All Bree Tests (After Fixes)
```bash
npm test -- tests/jobs-bree-integration.test.mjs
npm test -- tests/jobs-bree-integration-comprehensive.test.mjs
npm test -- tests/integration/bree-test-template.test.mjs
npm test -- tests/performance/bree-benchmarks.test.mjs
```

### Run with Coverage
```bash
npm test -- --coverage tests/jobs-bree-integration.test.mjs
```

### Run in Watch Mode
```bash
npm test -- --watch tests/jobs-bree-integration.test.mjs
```

---

## Validation Criteria

### ✓ Tests Must Pass
- All 152+ Bree scheduler tests pass
- No timeouts or flaky failures
- All error cases handled properly
- Resource cleanup verified

### ✓ Coverage Must Meet Target
- Statements: ≥80%
- Branches: ≥75%
- Functions: ≥80%
- Lines: ≥80%

### ✓ Performance Must Improve
- Test suite runs in <5 seconds (was 30+)
- Individual tests complete in <100ms
- No real worker thread spawning
- Memory stable throughout test run

### ✓ Code Quality Maintained
- No breaking changes to API
- All existing tests still pass
- Documentation updated
- No hardcoded test values

---

## Next Steps

1. ✓ Create `bree-scheduler-mocks.mjs` with utilities
2. ✓ Create `TEST_FIX_LOG_BREE.md` documentation
3. Update `tests/jobs-bree-integration.test.mjs` with timer control
4. Update `tests/jobs-bree-integration-comprehensive.test.mjs` with mocks
5. Update `tests/integration/bree-test-template.test.mjs` with worker mocks
6. Run full test suite and verify coverage
7. Commit changes with detailed message

---

## References

- **Vitest Fake Timers**: https://vitest.dev/guide/mocking.html#timers
- **Bree Documentation**: https://jobscheduler.net/
- **Worker Threads**: https://nodejs.org/api/worker_threads.html
- **Test Utilities**: `/tests/helpers/`

---

**Status**: READY FOR IMPLEMENTATION
**Last Updated**: 2026-01-09
**Next Review**: After test fixes complete

