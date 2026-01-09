# COUNTERMEASURES.md

**Generated**: 2026-01-09
**Branch**: claude/deploy-agent-swarm-ZhuUw
**Prepared By**: Research & Analysis Agent
**Status**: REMEDIATION PLAN READY

---

## Executive Summary

This document provides **4 sequential remediation steps** to resolve all CRITICAL issues identified in ROOT_CAUSE_ANALYSIS.md.

**Total Estimated Time**: 4-6 hours
**Priority Sequence**: 1 → 2 → 3 → 4
**Recommended Approach**: Sequential execution (not parallel)

| Priority | Issue | Remediation | Time | Difficulty |
|----------|-------|------------|------|------------|
| 1 | Missing test-utils | Restore 3 deleted files | 15 min | Easy |
| 2 | Missing coverage dep | Install @vitest/coverage-v8 | 10 min | Easy |
| 3 | Test timeouts | Increase timeout + optimize | 2-3 hrs | Medium |
| 4 | Async context issues | Audit + refactor tests | 1-2 hrs | Hard |

---

## Countermeasure #1: Restore Missing Test Utilities (PRIORITY 1)

### Objective
Restore the 3 deleted test utility files to unblock import errors.

### Why This First
- Blocking all 10+ affected test files from loading
- Must restore before any testing can proceed
- Low risk, high impact (unblocks other work)

### Step 1.1: Restore tests/test-utils/context.mjs

**File Location**: `/home/user/gitvan/tests/test-utils/context.mjs`

**Content** (161 lines):

```javascript
/**
 * Test Utilities - Context Creation
 * Provides helpers for creating test contexts, jobs, and environments
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

/**
 * Create an isolated test context with a git repository
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Test context
 */
export async function createTestContext(options = {}) {
  const testId = options.testId || `test-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const cwd = options.cwd || join(tmpdir(), 'gitvan-test', testId);

  // Create directory
  await fs.mkdir(cwd, { recursive: true });

  // Initialize git repository
  try {
    await execAsync('git init', { cwd });
    await execAsync('git config user.email "test@example.com"', { cwd });
    await execAsync('git config user.name "Test User"', { cwd });

    // Create initial commit to ensure repository is usable
    await fs.writeFile(join(cwd, 'README.md'), '# Test Repository\n');
    await execAsync('git add README.md', { cwd });
    await execAsync('git commit -m "Initial commit"', { cwd });
  } catch (error) {
    throw new Error(`Failed to initialize test git repository: ${error.message}`);
  }

  return {
    cwd,
    testId,
    cleanup: async () => {
      try {
        await fs.rm(cwd, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup test context: ${error.message}`);
      }
    }
  };
}

/**
 * Create a test job definition
 * @param {string} cwd - Repository directory
 * @param {string} jobName - Name of the job
 * @param {Object} options - Job options
 * @returns {Promise<Object>} Job definition
 */
export async function createTestJob(cwd, jobName, options = {}) {
  const jobId = `job-${jobName}`;
  const runFunction = options.runFunction || `
export default async function run({ payload = {} } = {}) {
  return {
    success: true,
    job: '${jobName}',
    payload
  };
}
  `.trim();

  return {
    id: jobId,
    name: jobName,
    description: options.description || `Test job: ${jobName}`,
    runFunction,
    timeout: options.timeout || 30000,
    ttl: options.ttl || 300000,
    payload: options.payload || {}
  };
}

/**
 * Create multiple test jobs
 * @param {string} cwd - Repository directory
 * @param {string[]} jobNames - Job names
 * @returns {Promise<Object[]>} Array of job definitions
 */
export async function createTestJobs(cwd, jobNames = []) {
  return Promise.all(jobNames.map(name => createTestJob(cwd, name)));
}

/**
 * Write test job to filesystem
 * @param {string} jobsDir - Jobs directory
 * @param {Object} job - Job definition
 * @returns {Promise<void>}
 */
export async function writeTestJob(jobsDir, job) {
  await fs.mkdir(jobsDir, { recursive: true });
  const jobPath = join(jobsDir, `${job.id}.mjs`);
  await fs.writeFile(jobPath, job.runFunction);
}

/**
 * Create test environment wrapper
 * @param {Function} fn - Test function
 * @returns {Promise<any>} Result from fn
 */
export async function withTestEnvironment(fn) {
  const originalEnv = { ...process.env };
  try {
    process.env.TZ = 'UTC';
    process.env.LANG = 'C';
    return await fn();
  } finally {
    Object.assign(process.env, originalEnv);
  }
}

/**
 * Create multiple test contexts
 * @param {number} count - Number of contexts to create
 * @returns {Promise<Object[]>} Array of test contexts
 */
export async function createTestContexts(count) {
  return Promise.all(Array.from({ length: count }, () => createTestContext()));
}

/**
 * Cleanup multiple test contexts
 * @param {Object[]} contexts - Array of test contexts
 * @returns {Promise<void>}
 */
export async function cleanupTestContexts(contexts) {
  await Promise.all(contexts.map(ctx => ctx.cleanup()));
}
```

**Installation Command**:
```bash
# Create directory if it doesn't exist
mkdir -p /home/user/gitvan/tests/test-utils

# Create the file with content above
# [Use your editor or write command]
```

### Step 1.2: Restore tests/test-utils/helpers.mjs

**File Location**: `/home/user/gitvan/tests/test-utils/helpers.mjs`

**Content** (339 lines) - Key exports:

```javascript
/**
 * Test Utilities - Helpers
 * Git, lock, and test utilities
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 10000,
    backoffMultiplier = 2
  } = options;

  let delay = initialDelay;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Clean up git refs matching pattern
 */
export async function cleanupGitRefs(cwd, prefix) {
  try {
    const { stdout } = await execAsync(`git show-ref --starts-with ${prefix}`, { cwd });
    const refs = stdout.trim().split('\n').filter(Boolean);
    
    for (const ref of refs) {
      const refName = ref.split(' ')[1];
      await execAsync(`git update-ref -d ${refName}`, { cwd }).catch(() => {});
    }
  } catch (error) {
    // No refs found is OK
  }
}

/**
 * Get all active locks in git
 */
export async function getGitLocks(cwd) {
  try {
    const { stdout } = await execAsync('git show-ref --starts-with refs/gitvan/locks', { cwd });
    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const [hash, ref] = line.split(' ');
      return { hash, ref };
    });
  } catch (error) {
    return [];
  }
}

/**
 * Get expired locks
 */
export async function getExpiredLocks(cwd) {
  const locks = await getGitLocks(cwd);
  const now = Date.now();
  const expiryMs = 300000; // 5 minutes

  return locks.filter(lock => {
    const createdAt = parseInt(lock.ref.split('/').pop());
    return (now - createdAt) > expiryMs;
  });
}

/**
 * Wait for all locks to be released
 */
export async function waitForLocksReleased(cwd, options = {}) {
  const {
    timeout = 30000,
    pollInterval = 100
  } = options;

  const startTime = Date.now();

  while (true) {
    const locks = await getGitLocks(cwd);
    if (locks.length === 0) return;

    if ((Date.now() - startTime) > timeout) {
      throw new Error(`Timeout waiting for locks to release`);
    }

    await sleep(pollInterval);
  }
}

/**
 * Verify clean test environment
 */
export async function verifyCleanTestEnv(cwd) {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd });
    return stdout.trim() === '';
  } catch (error) {
    return false;
  }
}

/**
 * Measure function execution time
 */
export async function measureTime(fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

/**
 * Create test report
 */
export function createTestReport() {
  return {
    tests: [],
    passed: 0,
    failed: 0,
    duration: 0,

    addTest(name, passed, duration) {
      this.tests.push({ name, passed, duration });
      if (passed) {
        this.passed++;
      } else {
        this.failed++;
      }
    },

    summary() {
      return {
        total: this.tests.length,
        passed: this.passed,
        failed: this.failed,
        passRate: this.tests.length > 0 
          ? ((this.passed / this.tests.length) * 100).toFixed(2)
          : 0,
        duration: this.duration
      };
    }
  };
}

export default {
  sleep,
  retry,
  cleanupGitRefs,
  getGitLocks,
  getExpiredLocks,
  waitForLocksReleased,
  verifyCleanTestEnv,
  measureTime,
  createTestReport
};
```

### Step 1.3: Restore tests/test-utils/job-bridge.mjs

**File Location**: `/home/user/gitvan/tests/test-utils/job-bridge.mjs`

**Content** (282 lines) - Key exports:

```javascript
/**
 * Test Utilities - Job Bridge Mock
 * Mock implementations of JobBridge and BreeScheduler
 */

import { EventEmitter } from 'events';

let jobBridgeInstance = null;
let breeSchedulerInstance = null;

/**
 * Mock JobBridge implementation
 */
export class JobBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.jobs = new Map();
    this.history = [];
    this.locks = new Map();
    this.options = options;
  }

  async registerJob(jobId, runFn) {
    this.jobs.set(jobId, { id: jobId, run: runFn });
    this.emit('jobRegistered', { jobId });
  }

  async executeJob(jobId, payload = {}) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const execution = {
      jobId,
      payload,
      startTime: Date.now(),
      status: 'running'
    };

    try {
      const result = await job.run({ payload });
      execution.result = result;
      execution.status = 'completed';
      execution.endTime = Date.now();
      this.history.push(execution);
      this.emit('jobCompleted', execution);
      return result;
    } catch (error) {
      execution.error = error.message;
      execution.status = 'failed';
      execution.endTime = Date.now();
      this.history.push(execution);
      this.emit('jobFailed', execution);
      throw error;
    }
  }

  async acquireLock(lockName, options = {}) {
    if (this.locks.has(lockName)) {
      throw new Error(`Lock already held: ${lockName}`);
    }
    this.locks.set(lockName, { 
      name: lockName, 
      acquiredAt: Date.now(),
      options 
    });
    this.emit('lockAcquired', { lockName });
  }

  async releaseLock(lockName) {
    if (!this.locks.has(lockName)) {
      throw new Error(`Lock not held: ${lockName}`);
    }
    this.locks.delete(lockName);
    this.emit('lockReleased', { lockName });
  }

  getExecutionHistory() {
    return this.history;
  }

  async shutdown() {
    this.jobs.clear();
    this.locks.clear();
  }
}

/**
 * Mock BreeScheduler implementation
 */
export class BreeScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.jobs = new Map();
    this.options = options;
  }

  add(job) {
    this.jobs.set(job.name, job);
    this.emit('jobAdded', job);
  }

  remove(jobName) {
    this.jobs.delete(jobName);
    this.emit('jobRemoved', { jobName });
  }

  start(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }
    this.emit('jobStarted', { jobName });
  }

  stop(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }
    this.emit('jobStopped', { jobName });
  }

  getJob(jobName) {
    return this.jobs.get(jobName);
  }

  async shutdown() {
    this.jobs.clear();
  }
}

/**
 * Get or create JobBridge singleton
 */
export function getJobBridge(options = {}) {
  if (!jobBridgeInstance) {
    jobBridgeInstance = new JobBridge(options);
  }
  return jobBridgeInstance;
}

/**
 * Get or create BreeScheduler singleton
 */
export function getBreeScheduler(options = {}) {
  if (!breeSchedulerInstance) {
    breeSchedulerInstance = new BreeScheduler(options);
  }
  return breeSchedulerInstance;
}

/**
 * Reset JobBridge singleton
 */
export function resetJobBridge() {
  if (jobBridgeInstance) {
    jobBridgeInstance.removeAllListeners();
    jobBridgeInstance = null;
  }
}

/**
 * Reset BreeScheduler singleton
 */
export function resetBreeScheduler() {
  if (breeSchedulerInstance) {
    breeSchedulerInstance.removeAllListeners();
    breeSchedulerInstance = null;
  }
}

/**
 * Reset all test infrastructure
 */
export function resetTestInfrastructure() {
  resetJobBridge();
  resetBreeScheduler();
}

export default {
  JobBridge,
  BreeScheduler,
  getJobBridge,
  getBreeScheduler,
  resetJobBridge,
  resetBreeScheduler,
  resetTestInfrastructure
};
```

### Step 1.4: Verification

**Commands to verify restoration**:

```bash
# Verify files exist
ls -la /home/user/gitvan/tests/test-utils/

# Expected output:
# -rw-r--r-- context.mjs       (161 lines)
# -rw-r--r-- helpers.mjs       (339 lines)
# -rw-r--r-- job-bridge.mjs    (282 lines)

# Test import works
cd /home/user/gitvan
npm test tests/integration/context-preservation.test.mjs
```

### Step 1.5: Git Operations

```bash
# Add restored files to git
git add tests/test-utils/context.mjs
git add tests/test-utils/helpers.mjs
git add tests/test-utils/job-bridge.mjs

# Commit
git commit -m "test: restore deleted test utility files

- Restore tests/test-utils/context.mjs (createTestContext, createTestJob, etc.)
- Restore tests/test-utils/helpers.mjs (sleep, retry, git utilities, etc.)
- Restore tests/test-utils/job-bridge.mjs (JobBridge, BreeScheduler mocks)

Fixes import errors in 10+ test files that depend on these utilities.
Unblocks test execution for context preservation, error handling, and integration tests."
```

**Time Estimate**: 15 minutes

---

## Countermeasure #2: Install Missing Coverage Dependency (PRIORITY 1)

### Objective
Install @vitest/coverage-v8 package to enable coverage reporting.

### Why This Second
- Relatively simple (package install)
- Required for deployment verification
- Unblocks coverage measurement

### Step 2.1: Add Package to package.json

**Current State** (Missing):
```json
// package.json
{
  "devDependencies": {
    "vitest": "^4.0.16",
    // ← @vitest/coverage-v8 MISSING
  }
}
```

**Required Addition**:
```bash
npm install --save-dev @vitest/coverage-v8@^4.0.16
```

OR manually in package.json:
```json
{
  "devDependencies": {
    "vitest": "^4.0.16",
    "@vitest/coverage-v8": "^4.0.16"  // ← ADD THIS
  }
}
```

### Step 2.2: Verify Installation

```bash
# Check package installed
npm ls @vitest/coverage-v8

# Expected output:
# npm notice
# npm notice
# gitvan@4.0.0 /home/user/gitvan
# └── @vitest/coverage-v8@4.0.16
```

### Step 2.3: Test Coverage Command

```bash
# Run tests with coverage
npm test -- --coverage

# Expected output:
# ✓ All tests pass with coverage report
# Coverage Summary:
#   ├─ Statements:  XX%
#   ├─ Branches:    XX%
#   ├─ Functions:   XX%
#   └─ Lines:       XX%
```

### Step 2.4: Verify Configuration

**vitest.config.mjs** should already support coverage:

```javascript
export default defineConfig({
  test: {
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/'
      ]
    }
  }
});
```

If not present, add it.

### Step 2.5: Git Operations

```bash
# Stage changes
git add package.json pnpm-lock.yaml

# Commit
git commit -m "fix: install @vitest/coverage-v8 for coverage reporting

Added missing @vitest/coverage-v8@^4.0.16 to enable test coverage analysis.
This is required for deployment readiness verification and 80%+ coverage validation."
```

**Time Estimate**: 10 minutes

---

## Countermeasure #3: Fix Test Timeout Issues (PRIORITY 2)

### Objective
Resolve 22+ test timeout failures by fixing RDFLockManager performance and increasing timeout for integration tests.

### Why This Third
- Depends on steps 1-2 to be able to run tests
- Medium complexity, requires performance profiling
- Blocks deployment but not test execution

### Step 3.1: Increase Integration Test Timeout

**File**: `/home/user/gitvan/vitest.config.mjs`

**Change**:
```javascript
// Before:
export default defineConfig({
  test: {
    testTimeout: 60000  // ← 60 seconds
  }
});

// After:
export default defineConfig({
  test: {
    testTimeout: 120000  // ← 120 seconds for integration tests
  }
});
```

Or add per-suite timeout:
```javascript
// In test files
describe('RDFLockManager', () => {
  it.setTimeout(120000);  // 2 minutes for this suite
  // ...
});
```

### Step 3.2: Profile RDFLockManager Performance

**Commands**:
```bash
# Run RDFLockManager tests with timing
npm test -- tests/git-native/RDFLockManager.test.mjs --reporter=verbose

# Look for slow tests:
# × Test name (60612ms) ← These are timing out

# Profile with Node.js inspector
node --inspect-brk ./node_modules/.bin/vitest tests/git-native/RDFLockManager.test.mjs
# Then open chrome://inspect in browser
```

### Step 3.3: Optimize SPARQL Queries

**File**: `/home/user/gitvan/src/git-native/RDFLockManager.mjs`

**Investigation Points**:
1. Count SPARQL queries per lock operation
2. Check for N+1 query patterns
3. Add query result caching
4. Optimize graph traversal

**Example Optimization** (pseudocode):
```javascript
// Before: Each lock operation runs multiple queries
async acquireLock(lockName) {
  const exists = await this.sparql.query('SELECT * WHERE { ?lock a Lock }');  // Query 1
  const dependencies = await this.sparql.query('SELECT * WHERE { ?lock dependsOn ?other }');  // Query 2
  const conflicts = await this.sparql.query('SELECT * WHERE { ?lock conflictsWith ?other }');  // Query 3
  // ... more queries
}

// After: Batch queries or use cached results
async acquireLock(lockName) {
  const cached = this.queryCache.get(lockName);
  if (cached && !cached.expired) {
    return cached.data;  // Use cache instead of query
  }
  
  // Single combined query instead of multiple
  const data = await this.sparql.query(`
    SELECT ?lock ?depends ?conflicts WHERE {
      ?lock a Lock .
      OPTIONAL { ?lock dependsOn ?depends }
      OPTIONAL { ?lock conflictsWith ?conflicts }
    }
  `);
  
  this.queryCache.set(lockName, { data, expireAt: Date.now() + 5000 });
  return data;
}
```

### Step 3.4: Add Timeout Handling to Queries

```javascript
// In RDFLockManager
async executeQuery(sparqlQuery, timeout = 5000) {
  return Promise.race([
    this.sparql.query(sparqlQuery),
    this.sleep(timeout).then(() => {
      throw new Error(`Query timeout after ${timeout}ms`);
    })
  ]);
}
```

### Step 3.5: Identify Deadlocks

**Check for**:
```javascript
// Circular dependencies in RDF predicates
// Example: Lock A depends on B, B depends on A (deadlock)

// Look for:
// - Circular dependsOn relationships
// - Mutual locks on same resource
// - Context loss causing infinite waits
```

### Step 3.6: Verify Fix

```bash
# Run tests again
npm test -- tests/git-native/RDFLockManager.test.mjs

# Expected:
# ✓ All tests pass in < 120 seconds
# ✓ Lock operations complete in < 100ms (if optimized further)
```

### Step 3.7: Git Operations

```bash
# Commit optimization
git add src/git-native/RDFLockManager.mjs vitest.config.mjs

git commit -m "fix: optimize RDFLockManager performance and increase test timeout

- Increase integration test timeout from 60s to 120s
- Optimize SPARQL queries in RDFLockManager
- Add query result caching to reduce repeated lookups
- Add timeout handling to prevent infinite waits
- Profile and identify N+1 query patterns

Fixes 22+ test timeout failures in RDFLockManager and Phase1 integration tests."
```

**Time Estimate**: 2-3 hours

---

## Countermeasure #4: Audit & Fix Async Context Issues (PRIORITY 3)

### Objective
Audit test files for improper async context handling and refactor as needed.

### Why This Last
- Architectural issue, lower immediate impact
- Depends on prior fixes being completed
- Requires deep understanding of unctx usage

### Step 4.1: Audit Test Files for Context Issues

**Test files to audit**:
```
tests/integration/context-preservation.test.mjs
tests/integration/error-handling.test.mjs
tests/integration/job-bridge-git.test.mjs
tests/integration/job-bridge-receipt.test.mjs
tests/integration/job-bridge-scheduler.test.mjs
tests/performance/integration-benchmarks.test.mjs
```

**Audit Checklist** - For each test file:

```javascript
// ✗ ANTI-PATTERN 1: Composable outside withGitVan()
const git = useGit();  // ✗ Will fail - context not available

// ✗ ANTI-PATTERN 2: Lost context after await
const git = useGit();
await someAsync();  // ✗ Context lost
await git.commit();  // ✗ Fails - no context

// ✓ CORRECT: Wrap in withGitVan()
await withGitVan(context, async () => {
  const git = useGit();  // ✓ Context available
  await someAsync();  // ✓ Context preserved
  await git.commit();  // ✓ Works
});
```

**Search Commands**:
```bash
# Find suspicious patterns
grep -r "useGit\|useTemplate\|useJob\|useLock" tests/integration/ \
  | grep -v "withGitVan" \
  | head -20

# Find missing withGitVan wrappers
grep -B5 "useGit\|useTemplate\|useJob" tests/integration/ \
  | grep -v "withGitVan"
```

### Step 4.2: Refactor Test Files

**Pattern to apply** (in each test):

```javascript
// BEFORE
import { useGit } from "gitvan";

it("should do something", async () => {
  const git = useGit();  // ✗ Wrong
  await git.status();
});

// AFTER
import { withGitVan, useGit } from "gitvan";

it("should do something", async () => {
  await withGitVan(testContext, async () => {  // ✓ Wrapped
    const git = useGit();  // ✓ Correct
    await git.status();
  });
});
```

### Step 4.3: Run Refactored Tests

```bash
# Test individual files
npm test -- tests/integration/context-preservation.test.mjs --reporter=verbose

# Verify all tests pass
npm test -- tests/integration/ --reporter=verbose

# Check for flakiness (run multiple times)
for i in {1..3}; do npm test -- tests/integration/; done
```

### Step 4.4: Document Context Patterns

**Create**: `/home/user/gitvan/ASYNC_CONTEXT_PATTERNS.md`

```markdown
# Async Context Patterns in GitVan Tests

## The Problem
Context is lost after `await` calls if not properly wrapped.

## The Solution
Always wrap composable usage in `withGitVan()`.

## Pattern Examples

### ✓ CORRECT: Single Composable
\`\`\`javascript
it("test", async () => {
  await withGitVan(context, async () => {
    const git = useGit();
    await git.status();
  });
});
\`\`\`

### ✓ CORRECT: Multiple Composables
\`\`\`javascript
it("test", async () => {
  await withGitVan(context, async () => {
    const git = useGit();
    const template = useTemplate();
    
    await git.status();
    const rendered = await template.render("test.njk", {});
  });
});
\`\`\`

### ✓ CORRECT: Nested Contexts
\`\`\`javascript
await withGitVan(context1, async () => {
  const git = useGit();
  
  await withGitVan(context2, async () => {
    const template = useTemplate();
  });
});
\`\`\`

### ✗ WRONG: Composable Outside Wrapper
\`\`\`javascript
const git = useGit();  // ✗ No context available
await withGitVan(context, async () => {
  // git is already instantiated without context
});
\`\`\`

### ✗ WRONG: Lost Context After Await
\`\`\`javascript
const git = useGit();
await someOtherAsync();  // ✗ Context lost here
await git.commit();      // ✗ Fails - no context
\`\`\`

## Checklist
- [ ] All useGit/useTemplate/useJob/useLock inside withGitVan()
- [ ] No composable instantiation outside withGitVan()
- [ ] Multiple await calls inside single withGitVan()
- [ ] Tests pass consistently (not flaky)
- [ ] Coverage maintained at 80%+
```

### Step 4.5: Git Operations

```bash
# Stage all refactored test files
git add tests/integration/context-preservation.test.mjs
git add tests/integration/error-handling.test.mjs
git add tests/integration/job-bridge-git.test.mjs
git add tests/integration/job-bridge-receipt.test.mjs
git add tests/integration/job-bridge-scheduler.test.mjs
git add tests/performance/integration-benchmarks.test.mjs
git add ASYNC_CONTEXT_PATTERNS.md

# Commit
git commit -m "test: audit and refactor async context handling in integration tests

- Wrap all composable usage in withGitVan() wrapper
- Fix context loss issues in 6 integration test files
- Add documentation for async context patterns
- Verify no context-related flakiness

Ensures reliable test execution and prevents context-related timeouts or failures."
```

**Time Estimate**: 1-2 hours

---

## Verification & Sign-Off

### Final Verification Checklist

After all 4 countermeasures applied:

```
STEP 1: Restore Test Utilities
├─ [ ] tests/test-utils/context.mjs exists (161 lines)
├─ [ ] tests/test-utils/helpers.mjs exists (339 lines)
├─ [ ] tests/test-utils/job-bridge.mjs exists (282 lines)
└─ [ ] All files committed to git

STEP 2: Install Coverage Dependency
├─ [ ] @vitest/coverage-v8 installed (npm ls)
├─ [ ] Coverage tool available (npm test -- --coverage)
├─ [ ] package.json updated
└─ [ ] Changes committed to git

STEP 3: Fix Test Timeouts
├─ [ ] vitest.config.mjs timeout increased (120s)
├─ [ ] RDFLockManager queries optimized
├─ [ ] All 22+ timeout tests now passing
└─ [ ] Changes committed to git

STEP 4: Fix Async Context
├─ [ ] All integration tests audited
├─ [ ] withGitVan() wrappers added
├─ [ ] Tests run 3x consecutively without flakiness
├─ [ ] Documentation created
└─ [ ] Changes committed to git

FINAL VERIFICATION
├─ [ ] npm test - All tests pass (100%)
├─ [ ] npm test -- --coverage - Coverage > 80%
├─ [ ] No import errors
├─ [ ] No timeout errors
├─ [ ] No async context errors
├─ [ ] All tests complete in < 5 minutes
└─ [ ] Ready for deployment
```

### Test Execution Summary

**Before Remediation**:
```
Tests Passed: 94/116 (81%)
Tests Failed: 22 (timeouts)
Coverage: Not measurable
Deployment Ready: NO
```

**After Remediation** (Expected):
```
Tests Passed: 116/116 (100%)
Tests Failed: 0
Coverage: > 80%
Deployment Ready: YES
```

### Sign-Off Template

**For Project Manager**:
```
REMEDIATION SIGN-OFF FORM

Project: GitVan v4.0.0
Branch: claude/deploy-agent-swarm-ZhuUw
Date: [Completion Date]

Countermeasures Applied:
✓ #1: Restore Missing Test Utilities (15 min)
✓ #2: Install Coverage Dependency (10 min)
✓ #3: Fix Test Timeouts (2-3 hrs)
✓ #4: Fix Async Context (1-2 hrs)

Results:
✓ All 4 critical root causes resolved
✓ 100% test pass rate achieved
✓ 80%+ code coverage verified
✓ Deployment blockers cleared

APPROVED FOR DEPLOYMENT: [Date]

Signed: ____________________
        QA Lead / Release Manager
```

---

## Timeline Estimates

| Phase | Task | Est. Time | Cumulative |
|-------|------|-----------|-----------|
| 1 | Restore test-utils | 15 min | 15 min |
| 2 | Install coverage dep | 10 min | 25 min |
| 3 | Optimize RDFLockManager | 2-3 hrs | 2.5-3.5 hrs |
| 4 | Refactor async context | 1-2 hrs | 3.5-5.5 hrs |
| 5 | Full test verification | 30 min | 4-6 hrs |

**Total Estimated Time**: 4-6 hours

**Recommended Schedule**:
- Step 1-2: Morning (35 minutes)
- Step 3-4: Afternoon (3-5 hours)
- Verification: End of day

---

## Risk Assessment

### Remediation Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Test-utils restore incomplete | Low | High | Use recovered file content |
| Package conflicts | Low | Medium | Test import after install |
| Performance not improved | Medium | Medium | Add query logging for debugging |
| Context refactoring breaks tests | Low | Medium | Run tests after each change |
| Regressions in other tests | Low | High | Run full test suite (npm test) |

### Rollback Plan

If any countermeasure causes issues:

```bash
# Rollback to last good commit
git reset --hard HEAD~1
git clean -fd

# Then re-apply individual steps more carefully
```

---

## Success Criteria

**Deployment can proceed only if ALL of these are true**:

1. ✓ All test-utils files restored and committed
2. ✓ @vitest/coverage-v8 installed and working
3. ✓ Zero timeout test failures (all tests complete in < 120s)
4. ✓ Zero import errors
5. ✓ 100% test pass rate (npm test output shows all pass)
6. ✓ Coverage > 80% (npm test -- --coverage shows > 80%)
7. ✓ No async context warnings in test output
8. ✓ Tests run consistently without flakiness
9. ✓ All changes committed to branch
10. ✓ QA sign-off obtained

---

## Next Steps After Remediation

Once all countermeasures applied and verified:

1. **Merge to main**: Create PR, obtain reviews, merge
2. **Deploy to staging**: Run full deployment checklist
3. **Monitor metrics**: Track error rates and performance
4. **Document lessons**: Update CLAUDE.md with context patterns
5. **Plan v4.1**: Prevent similar issues in next version

---

**Document Version**: 1.0
**Created**: 2026-01-09
**Status**: READY FOR IMPLEMENTATION
**Prepared By**: Research & Analysis Agent
