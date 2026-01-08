# Integration Testing Quick Start Guide

**GitVan v4.0.0 - Bree Scheduler Refactoring**

This guide gets you started with integration testing in under 15 minutes.

---

## TL;DR

```bash
# 1. Read the summary
cat docs/bree-integration-test-summary.md

# 2. Copy the template
cp tests/integration/bree-test-template.test.mjs \
   tests/integration/bree-context-management.test.mjs

# 3. Edit the new file and implement tests

# 4. Run your test
npm test tests/integration/bree-context-management.test.mjs

# 5. Fix bugs, repeat
```

---

## What You Need to Know

### The Problem

We refactored the job system to use Bree scheduler. This introduces **9 integration points** that need testing:

1. Context Management (unctx + worker threads)
2. Git Integration (locks + receipts)
3. Workflow Engine
4. Cross-Directory Isolation
5. Hook System
6. CLI Commands
7. Pack System
8. Receipt/Audit System
9. Error Recovery

### The Gaps

**Current coverage:**
- ✅ Basic Bree functionality (40%)
- ⚠️ Git integration (20%)
- ❌ Context management (0%)
- ❌ Workflow integration (0%)
- ❌ Cross-directory isolation (0%)

**Critical gaps:**
- Context may be lost in worker threads → composables fail
- Lock lifecycle not verified → concurrent execution bugs
- Receipt writing not verified end-to-end → audit trail gaps

### The Goal

Write integration tests that verify all 9 integration points work correctly together.

---

## Step-by-Step Guide

### Step 1: Understand the Architecture (5 min)

Read this simplified architecture:

```
User Code
    ↓
useJob() composable
    ↓
JobBridge (adapts GitVan to Bree)
    ↓
BreeScheduler (manages Bree instance)
    ↓
Bree (spawns worker threads)
    ↓
Worker Thread (executes job)
    ↓
Job function (user code)
    ↓
Composables: useLock(), useReceipt(), useGit()
    ↓
Git refs and notes
```

**Key question:** Does context flow through all these layers?

### Step 2: Run Existing Tests (2 min)

```bash
# Run existing Bree tests
npm test tests/jobs-bree-integration.test.mjs

# Check coverage
npm test -- --coverage tests/jobs-bree-integration.test.mjs
```

**Expected output:**
- All tests pass
- ~40% coverage for Bree code

### Step 3: Pick a Test to Implement (1 min)

Start with **Context Management** (highest priority):

```bash
# Create test directory
mkdir -p tests/integration

# Copy template
cp tests/integration/bree-test-template.test.mjs \
   tests/integration/bree-context-management.test.mjs
```

### Step 4: Implement the Test (30 min)

Open `tests/integration/bree-context-management.test.mjs` and replace template placeholders:

```javascript
// Replace {COMPONENT} with "Context Management"
// Replace {component} with "context"

describe("Bree Context Management Integration", () => {
  // ... setup code from template ...

  describe("Worker Thread Context", () => {
    it("should preserve context through worker execution", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        // Create job that uses context
        await fs.writeFile(
          join(jobsDir, "context-test.mjs"),
          `
export const meta = { name: "Context Test", desc: "Test", tags: [] };
export default async function run({ payload, ctx }) {
  // Verify context has git info
  if (!ctx.git) {
    throw new Error("Git context missing");
  }
  return { ok: true, head: ctx.git.head };
}
          `.trim()
        );

        const job = useJob();

        // Run via Bree (uses worker threads)
        const result = await job.runWithBree("context-test");

        // Assertions
        expect(result.ok).toBe(true);
        expect(result.result.head).toBeDefined();
      });
    });

    it("should allow composables in worker", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        // Create job that uses composable
        await fs.writeFile(
          join(jobsDir, "composable-test.mjs"),
          `
import { useGit } from "../../src/composables/git/index.mjs";

export const meta = { name: "Composable Test", desc: "Test", tags: [] };
export default async function run() {
  const git = useGit();
  const info = await git.info();
  return { ok: true, branch: info.branch };
}
          `.trim()
        );

        const job = useJob();
        const result = await job.runWithBree("composable-test");

        expect(result.ok).toBe(true);
        expect(result.result.branch).toBeDefined();
      });
    });
  });

  describe("Context Isolation", () => {
    it("should isolate context between concurrent jobs", async () => {
      await withGitVan({ cwd: tempDir }, async () => {
        // Create 2 jobs with different context
        await fs.writeFile(
          join(jobsDir, "job-a.mjs"),
          `
export const meta = { name: "Job A", desc: "Test", tags: [] };
export default async function run({ ctx }) {
  return { ok: true, job: "A", cwd: ctx.cwd };
}
          `.trim()
        );

        await fs.writeFile(
          join(jobsDir, "job-b.mjs"),
          `
export const meta = { name: "Job B", desc: "Test", tags: [] };
export default async function run({ ctx }) {
  return { ok: true, job: "B", cwd: ctx.cwd };
}
          `.trim()
        );

        const job = useJob();

        // Run concurrently
        const [resultA, resultB] = await Promise.all([
          job.runWithBree("job-a"),
          job.runWithBree("job-b")
        ]);

        // Verify isolation
        expect(resultA.result.job).toBe("A");
        expect(resultB.result.job).toBe("B");
      });
    });
  });
});
```

### Step 5: Run the Test (1 min)

```bash
npm test tests/integration/bree-context-management.test.mjs
```

**If it fails:** Fix bugs in source code
**If it passes:** Move to next test

### Step 6: Check Coverage (1 min)

```bash
npm test -- --coverage tests/integration/bree-context-management.test.mjs
```

**Goal:** 80%+ coverage for:
- `src/jobs/bree-scheduler.mjs`
- `src/jobs/job-bridge.mjs`
- `src/composables/job.mjs` (Bree methods)

### Step 7: Repeat for Other Integration Points

Priority order:

1. ✅ Context Management (just completed)
2. Git Integration (locks + receipts)
3. Workflow Integration
4. Cross-Directory Isolation
5. Error Recovery
6. Hook System
7. CLI Commands
8. Pack System
9. Performance

---

## Common Test Patterns

### Pattern 1: Create Test Job

```javascript
await fs.writeFile(
  join(jobsDir, "my-job.mjs"),
  `
export const meta = {
  name: "My Job",
  desc: "Test job",
  tags: ["test"]
};

export default async function run({ payload, ctx }) {
  return { ok: true, result: "success" };
}
  `.trim()
);
```

### Pattern 2: Run Job with Lock

```javascript
const job = useJob();
const result = await job.runWithLock("my-job");

expect(result).toBeDefined();
expect(result.ok).toBe(true);
```

### Pattern 3: Verify Lock Released

```javascript
const lock = useLock();
const isLocked = await lock.isLocked("job-my-job");

expect(isLocked).toBe(false);
```

### Pattern 4: Verify Receipt Written

```javascript
const receipts = await job.history("my-job");

expect(receipts.length).toBeGreaterThan(0);
expect(receipts[0]).toHaveProperty("fingerprint");
expect(receipts[0]).toHaveProperty("timestamp");
expect(receipts[0].status).toBe("success");
```

### Pattern 5: Verify Git Ref

```javascript
const git = useGit();
const lockExists = await git.refExists("refs/gitvan/locks/job-my-job");

expect(lockExists).toBe(false); // After job completes
```

### Pattern 6: Schedule Job

```javascript
const job = useJob();
await job.schedule("my-job", { cron: "0 * * * *" });

const status = job.getSchedulerStatus();
expect(status.jobCount).toBeGreaterThan(0);
```

### Pattern 7: Test Error Handling

```javascript
await fs.writeFile(
  join(jobsDir, "failing-job.mjs"),
  `
export const meta = { name: "Failing Job", desc: "Test", tags: [] };
export default async function run() {
  throw new Error("Intentional failure");
}
  `.trim()
);

const job = useJob();

await expect(job.runWithLock("failing-job")).rejects.toThrow();

// Verify lock still released
const lock = useLock();
const isLocked = await lock.isLocked("job-failing-job");
expect(isLocked).toBe(false);
```

---

## Debugging Tips

### Test Fails with "Context not available"

**Problem:** Composable called outside `withGitVan()`

**Fix:**
```javascript
// ✗ WRONG
const job = useJob();
await job.run("my-job");

// ✓ CORRECT
await withGitVan({ cwd: tempDir }, async () => {
  const job = useJob();
  await job.run("my-job");
});
```

### Test Hangs Forever

**Problem:** Lock not released or scheduler not shut down

**Fix:**
```javascript
afterEach(async () => {
  // Always shutdown scheduler
  const scheduler = getBreeScheduler({ cwd: tempDir });
  await scheduler.shutdown();

  // Always reset singletons
  resetBreeScheduler();
  resetJobBridge();
});
```

### Git Commands Fail

**Problem:** Git repo not initialized properly

**Fix:**
```javascript
beforeEach(async () => {
  // Initialize git properly
  execSync("git init", { cwd: tempDir });
  execSync('git config user.name "Test"', { cwd: tempDir });
  execSync('git config user.email "test@test.com"', { cwd: tempDir });

  // Create initial commit (required)
  await fs.writeFile(join(tempDir, "README.md"), "# Test");
  execSync("git add . && git commit -m 'init'", { cwd: tempDir });
});
```

### Worker Thread Errors

**Problem:** Worker can't find job file

**Fix:**
```javascript
// Use absolute paths
const jobPath = join(jobsDir, "my-job.mjs");
await fs.writeFile(jobPath, jobCode);

// Verify file exists
expect(await fs.access(jobPath)).resolves.toBeUndefined();
```

---

## Resources

### Documentation
- **Full Strategy:** `docs/integration-test-strategy-bree.md` (comprehensive)
- **Summary:** `docs/bree-integration-test-summary.md` (executive summary)
- **This Guide:** `docs/INTEGRATION-TESTING-QUICKSTART.md` (you are here)

### Source Code
- `src/jobs/bree-scheduler.mjs` - Bree wrapper
- `src/jobs/job-bridge.mjs` - GitVan to Bree adapter
- `src/composables/job.mjs` - Job composable (uses both)

### Existing Tests
- `tests/jobs-bree-integration.test.mjs` - Basic Bree tests
- `tests/integration/bree-test-template.test.mjs` - Test template

---

## Validation Checklist

Before claiming a test is complete:

- [ ] Test creates temp directory
- [ ] Test initializes git repo
- [ ] Test creates jobs directory
- [ ] All tests use `withGitVan()` wrapper
- [ ] Tests verify expected behavior
- [ ] Tests verify error handling
- [ ] Tests verify cleanup (locks released, etc.)
- [ ] Cleanup removes temp directory
- [ ] Cleanup resets singletons
- [ ] Coverage ≥80% for tested components
- [ ] All tests pass consistently

---

## Next Steps

1. **Read the summary:** `docs/bree-integration-test-summary.md` (5 min)
2. **Implement context test:** Follow Step 3-5 above (30 min)
3. **Run coverage:** Check you hit 80%+ (1 min)
4. **Pick next test:** Git integration (30 min)
5. **Repeat:** Until all critical tests done

**Total time to complete critical tests:** ~8-10 hours (1-2 days)

---

## Questions?

Check the full strategy document for:
- Detailed test scenarios
- Complete test code examples
- Integration point analysis
- Risk assessment
- Success criteria

**File:** `docs/integration-test-strategy-bree.md`

---

**Happy Testing! Remember:** Jidoka - Prevent defects at the source, not in production.
