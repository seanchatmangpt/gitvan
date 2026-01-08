# Job System Troubleshooting Guide

GitVan v4.0.0 - Bree Integration

## Table of Contents

- [Common Errors and Solutions](#common-errors-and-solutions)
- [Debugging Strategies](#debugging-strategies)
- [Performance Troubleshooting](#performance-troubleshooting)
- [Windows-Specific Issues](#windows-specific-issues)
- [Advanced Diagnostics](#advanced-diagnostics)

---

## Common Errors and Solutions

### Error: "Job is already running"

**Symptom:**
```
Error: Job backup-job is already running
```

**Cause:** Lock is held from a previous execution that hasn't released yet.

**Solutions:**

1. **Wait for lock to expire** (default TTL: 5 minutes)
   ```bash
   # Check lock status
   gitvan job status backup-job
   ```

2. **Manually release the lock**
   ```javascript
   import { withGitVan, useLock } from 'gitvan';

   await withGitVan({ cwd: process.cwd() }, async () => {
     const lock = useLock();
     await lock.release('job-backup-job');
   });
   ```

3. **Force execution** (use with caution)
   ```javascript
   const job = useJob();
   await job.runWithBree('backup-job', { force: true });
   ```

4. **Clean up stale locks**
   ```javascript
   const lock = useLock();
   const cleanup = await lock.cleanup({
     expired: true,
     orphaned: true
   });
   console.log(`Cleaned up ${cleanup.cleaned} locks`);
   ```

**Prevention:**
- Ensure proper error handling in jobs
- Set appropriate lock TTL
- Implement job timeouts
- Use graceful shutdown

---

### Error: "Job not found"

**Symptom:**
```
Error: Job not found: backup-job
```

**Causes:**
1. Job file doesn't exist
2. Job file is not a `.mjs` file
3. Job is in a subdirectory
4. Job discovery failed

**Solutions:**

1. **Verify job file exists**
   ```bash
   ls -la jobs/backup-job.mjs
   # or
   ls -la jobs/*/backup-job.mjs
   ```

2. **Check job discovery**
   ```javascript
   const job = useJob();
   const allJobs = await job.list();
   console.log(allJobs.map(j => j.id));
   ```

3. **Use full path for subdirectory jobs**
   ```javascript
   // If job is in jobs/chat/backup-job.mjs
   await job.run('chat/backup-job');  // ✓ Correct
   await job.run('backup-job');        // ✗ Wrong
   ```

4. **Check file extension**
   ```bash
   # Must be .mjs, not .js
   mv jobs/backup-job.js jobs/backup-job.mjs
   ```

**Prevention:**
- Follow naming conventions
- Use `job.exists()` before operations
- Implement job validation

---

### Error: "Worker execution failed"

**Symptom:**
```
Worker execution failed: Cannot find module...
```

**Causes:**
1. Job file has syntax errors
2. Missing dependencies
3. Import path issues
4. Worker file generation failed

**Solutions:**

1. **Validate job syntax**
   ```javascript
   const job = useJob();
   const validation = await job.validate('backup-job');

   if (!validation.valid) {
     console.error('Errors:', validation.errors);
     console.warn('Warnings:', validation.warnings);
   }
   ```

2. **Check job definition**
   ```javascript
   // Correct job structure
   export const meta = {
     name: 'Backup Job',
     desc: 'Backup database and files'
   };

   export default async function run({ payload, ctx }) {
     // Job logic
     return { success: true };
   }
   ```

3. **Test job directly**
   ```javascript
   // Import and test job
   import jobDef from './jobs/backup-job.mjs';

   const result = await jobDef.run({
     payload: {},
     ctx: { cwd: process.cwd() }
   });

   console.log(result);
   ```

4. **Check worker file**
   ```bash
   ls -la .gitvan/workers/
   cat .gitvan/workers/backup-job-worker.mjs
   ```

5. **Regenerate worker file**
   ```javascript
   // Force worker file regeneration
   const job = useJob();
   await job.unschedule('backup-job');
   await job.schedule('backup-job');
   ```

**Prevention:**
- Use `defineJob()` helper
- Validate jobs before deployment
- Test jobs in development
- Implement error handling in jobs

---

### Error: "Context not available"

**Symptom:**
```
Error: GitVan context not available
TypeError: Cannot read property 'cwd' of undefined
```

**Cause:** useJob() called outside withGitVan() context

**Solutions:**

1. **Wrap in withGitVan()**
   ```javascript
   // ✗ Wrong
   const job = useJob();
   await job.run('test');

   // ✓ Correct
   await withGitVan({ cwd: process.cwd() }, async () => {
     const job = useJob();
     await job.run('test');
   });
   ```

2. **Check async boundaries**
   ```javascript
   // ✗ Context lost
   await withGitVan(context, async () => {
     const job = useJob();

     await someAsyncOperation();  // Context lost here!

     await job.run('test');  // Error!
   });

   // ✓ Context preserved
   await withGitVan(context, async () => {
     const job = useJob();
     await job.run('test');  // Within same async scope
   });
   ```

3. **Use tryUseGitVan() for optional context**
   ```javascript
   import { tryUseGitVan } from 'gitvan';

   const ctx = tryUseGitVan();
   if (ctx) {
     // Context available
   } else {
     // Fallback behavior
   }
   ```

**Prevention:**
- Always use withGitVan() wrapper
- Understand unctx context system
- Review CLAUDE.md async patterns

---

### Error: "Receipt write failed"

**Symptom:**
```
Error: Failed to write receipt: Git notes ref not found
```

**Causes:**
1. Git repository not initialized
2. Git notes ref doesn't exist
3. Permissions issues
4. Git configuration errors

**Solutions:**

1. **Initialize Git repo**
   ```bash
   git init
   git config user.name "Your Name"
   git config user.email "your@email.com"
   ```

2. **Create initial commit**
   ```bash
   # Receipts require at least one commit
   touch README.md
   git add README.md
   git commit -m "Initial commit"
   ```

3. **Check Git notes configuration**
   ```javascript
   import { useGit } from 'gitvan';

   await withGitVan({ cwd: process.cwd() }, async () => {
     const git = useGit();
     const refs = await git.listRefs();
     console.log('Available refs:', refs);
   });
   ```

4. **Verify write permissions**
   ```bash
   ls -la .git/refs/notes/
   # Ensure write permissions
   ```

5. **Check gitvan.config.js**
   ```javascript
   export default {
     receipts: {
       ref: 'refs/notes/gitvan/audit'  // Verify this is correct
     }
   };
   ```

**Prevention:**
- Ensure Git repo initialized
- Create initial commit before running jobs
- Test receipt system in development

---

### Error: "Scheduler failed to start"

**Symptom:**
```
Error: Failed to start Bree scheduler: ...
```

**Causes:**
1. Bree already running
2. Port/resource conflict
3. Invalid job configuration
4. Worker thread issues

**Solutions:**

1. **Check if scheduler is running**
   ```javascript
   const job = useJob();
   const status = job.getSchedulerStatus();
   console.log('Running:', status.isRunning);

   if (status.isRunning) {
     await job.stopScheduler();
   }
   ```

2. **Reset scheduler**
   ```javascript
   import { resetBreeScheduler } from 'gitvan';

   resetBreeScheduler();  // Reset singleton
   ```

3. **Check for invalid jobs**
   ```javascript
   const job = useJob();
   const validations = await job.validateAll();

   validations.forEach(v => {
     if (!v.valid) {
       console.error(`Invalid job ${v.id}:`, v.errors);
     }
   });
   ```

4. **Start with clean state**
   ```javascript
   const job = useJob();

   // Stop and clean up
   await job.shutdownScheduler();

   // Remove all scheduled jobs
   const scheduled = job.listScheduledJobs();
   for (const j of scheduled) {
     await job.unschedule(j.name);
   }

   // Start fresh
   await job.startScheduler();
   ```

**Prevention:**
- Implement graceful shutdown
- Validate jobs before scheduling
- Handle scheduler lifecycle properly

---

## Debugging Strategies

### Enable Debug Logging

**Environment Variable:**
```bash
DEBUG=gitvan:* npm start
# or specific modules
DEBUG=gitvan:jobs:*,gitvan:lock npm start
```

**Code-based:**
```javascript
import { createLogger } from 'gitvan';

const logger = createLogger('my-job', { level: 'debug' });

logger.debug('Job starting', { jobId, payload });
logger.info('Job progress', { step: 1 });
logger.warn('Job warning', { issue });
logger.error('Job failed', { error });
```

### Inspect Worker Files

**Location:** `.gitvan/workers/`

**View generated worker:**
```bash
cat .gitvan/workers/backup-job-worker.mjs
```

**Common issues:**
- Incorrect file:// URL
- Windows path issues (`C:\\` vs `C:/`)
- Missing imports

**Manual test:**
```bash
node .gitvan/workers/backup-job-worker.mjs
```

### Check Lock Status

**List all locks:**
```javascript
const lock = useLock();
const locks = await lock.list();

locks.forEach(l => {
  console.log(`Lock: ${l.name}`);
  console.log(`  Acquired: ${l.timestamp}`);
  console.log(`  Timeout: ${l.timeout}ms`);
  console.log(`  Branch: ${l.branch}`);
  console.log(`  Worktree: ${l.worktree}`);
});
```

**Check specific lock:**
```javascript
const locked = await lock.isLocked('job-backup-job');
console.log('Locked:', locked);

if (locked) {
  const info = await lock.getLockInfo('job-backup-job');
  console.log('Lock info:', info);
}
```

**Lock analytics:**
```javascript
const stats = await lock.getStats();
console.log('Total locks:', stats.total);
console.log('Active locks:', stats.active);
console.log('Expired locks:', stats.expired);
console.log('By worktree:', stats.byWorktree);
```

### Verify Receipts

**List recent receipts:**
```javascript
const receipt = useReceipt();
const history = await receipt.list({ limit: 10 });

history.forEach(r => {
  console.log(`${r.timestamp}: ${r.jobId} - ${r.status}`);
  if (r.error) {
    console.error('  Error:', r.error);
  }
});
```

**Verify receipt integrity:**
```javascript
const verification = await receipt.verify(receiptId);

if (!verification.valid) {
  console.error('Receipt verification failed!');
  console.error('Fingerprint valid:', verification.fingerprintValid);
  console.error('Note valid:', verification.noteValid);
}
```

**Receipt analytics:**
```javascript
const stats = await receipt.getStats({ jobId: 'backup-job' });
console.log('Total runs:', stats.total);
console.log('Success rate:', stats.successRate + '%');
console.log('Average duration:', stats.averageDuration + 'ms');
```

### Monitor Memory Usage

**Track worker files:**
```javascript
import { getJobBridge } from 'gitvan';

const bridge = getJobBridge({ cwd: process.cwd() });
console.log('Worker files created:', bridge.createdWorkerFiles.size);

bridge.createdWorkerFiles.forEach(file => {
  console.log('  -', file);
});
```

**Monitor Node.js memory:**
```javascript
const memUsage = process.memoryUsage();
console.log('Memory usage:');
console.log('  RSS:', (memUsage.rss / 1024 / 1024).toFixed(2), 'MB');
console.log('  Heap:', (memUsage.heapUsed / 1024 / 1024).toFixed(2), 'MB');
```

**Set memory limit:**
```bash
node --max-old-space-size=4096 your-script.mjs
```

### Test Job Execution

**Minimal test:**
```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const job = useJob();

  console.log('Testing job execution...');

  try {
    const result = await job.run('backup-job', {
      payload: { test: true }
    });

    console.log('✓ Job succeeded');
    console.log('Result:', result);
  } catch (error) {
    console.error('✗ Job failed');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
});
```

**Test with locking:**
```javascript
const result1 = job.runWithLock('test-job');
const result2 = job.runWithLock('test-job');  // Should fail

await Promise.allSettled([result1, result2]).then(results => {
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      console.log(`Job ${i}: Success`);
    } else {
      console.log(`Job ${i}: Failed - ${r.reason.message}`);
    }
  });
});
```

---

## Performance Troubleshooting

### High Memory Usage

**Symptoms:**
- Node.js process using excessive memory
- OOM (Out of Memory) errors
- Slow performance

**Diagnosis:**
```javascript
// Check worker file count
const bridge = getJobBridge();
console.log('Worker files:', bridge.createdWorkerFiles.size);

// Check scheduled jobs
const job = useJob();
const status = job.getSchedulerStatus();
console.log('Scheduled jobs:', status.jobCount);

// Check memory usage
const mem = process.memoryUsage();
console.log('Heap used:', (mem.heapUsed / 1024 / 1024).toFixed(2), 'MB');
```

**Solutions:**

1. **Cleanup worker files**
   ```javascript
   await job.shutdownScheduler();  // Cleans up workers
   ```

2. **Limit concurrent jobs**
   ```javascript
   // In gitvan.config.js
   export default {
     jobs: {
       maxConcurrent: 5  // Limit concurrent executions
     }
   };
   ```

3. **Increase memory limit**
   ```bash
   node --max-old-space-size=8192 your-script.mjs
   ```

4. **Profile memory**
   ```bash
   node --inspect your-script.mjs
   # Then open Chrome DevTools → Memory
   ```

### Slow Job Execution

**Symptoms:**
- Jobs taking longer than expected
- Timeout errors
- Queue backlog

**Diagnosis:**
```javascript
// Check job duration
const history = await receipt.list({ jobId: 'slow-job', limit: 10 });
history.forEach(r => {
  console.log(`${r.timestamp}: ${r.duration}ms`);
});

// Average duration
const stats = await receipt.getStats({ jobId: 'slow-job' });
console.log('Average:', stats.averageDuration, 'ms');
```

**Solutions:**

1. **Increase timeout**
   ```javascript
   await job.schedule('slow-job', {
     cron: '0 * * * *',
     timeout: 600000  // 10 minutes
   });
   ```

2. **Optimize job logic**
   ```javascript
   // Use async operations efficiently
   export default async function run({ payload }) {
     // ✗ Sequential (slow)
     const result1 = await operation1();
     const result2 = await operation2();

     // ✓ Parallel (fast)
     const [result1, result2] = await Promise.all([
       operation1(),
       operation2()
     ]);
   }
   ```

3. **Profile job execution**
   ```javascript
   export default async function run({ payload }) {
     console.time('job-execution');

     console.time('step-1');
     await step1();
     console.timeEnd('step-1');

     console.time('step-2');
     await step2();
     console.timeEnd('step-2');

     console.timeEnd('job-execution');
   }
   ```

### File Accumulation

**Symptoms:**
- `.gitvan/workers/` directory growing
- Disk space usage increasing

**Diagnosis:**
```bash
du -sh .gitvan/workers/
ls -1 .gitvan/workers/ | wc -l
```

**Solutions:**

1. **Manual cleanup**
   ```bash
   rm -rf .gitvan/workers/*
   ```

2. **Automatic cleanup**
   ```javascript
   // Shutdown cleans up automatically
   await job.shutdownScheduler();
   ```

3. **Periodic cleanup job**
   ```javascript
   // jobs/cleanup.mjs
   export const meta = {
     name: 'Cleanup Worker Files',
     desc: 'Remove old worker files'
   };
   export const cron = '0 0 * * *';  // Daily

   export default async function run() {
     const { rmSync, readdirSync, statSync } = await import('fs');
     const { join } = await import('path');

     const workerDir = '.gitvan/workers';
     const files = readdirSync(workerDir);

     let removed = 0;
     for (const file of files) {
       const filePath = join(workerDir, file);
       const stats = statSync(filePath);
       const age = Date.now() - stats.mtimeMs;

       if (age > 24 * 60 * 60 * 1000) {  // Older than 24 hours
         rmSync(filePath);
         removed++;
       }
     }

     return { removed };
   }
   ```

---

## Windows-Specific Issues

### Path Separator Issues

**Symptom:**
```
Error: Cannot find module 'C:\\Users\\...'
```

**Cause:** Windows uses backslashes, worker needs forward slashes

**Solution:** GitVan handles this automatically, but if issues persist:

```javascript
// Ensure pathe is used for path operations
import { join, normalize } from 'pathe';

const jobPath = join('jobs', 'backup-job.mjs');  // Always forward slashes
```

### File URL Issues

**Symptom:**
```
Error: Invalid URL: C:\Users\...
```

**Cause:** Windows paths need special handling for file:// URLs

**Solution:** JobBridge handles this, but verify:

```javascript
// In worker file generation
const fileUrl = 'file://' +
  (process.platform === 'win32' ? '/' : '') +
  jobDef.file.replace(/\\/g, '/');
```

### Line Ending Issues

**Symptom:**
- Syntax errors in generated workers
- Unexpected token errors

**Cause:** Windows uses CRLF, Unix uses LF

**Solution:**

```bash
# Configure Git
git config core.autocrlf true

# Or configure editor
# VS Code: "files.eol": "\n"
```

### Permission Issues

**Symptom:**
```
Error: EPERM: operation not permitted
```

**Solutions:**

1. **Run as Administrator** (if necessary)

2. **Check file permissions**
   ```powershell
   icacls .gitvan\workers
   ```

3. **Disable antivirus temporarily** (if blocking)

---

## Advanced Diagnostics

### Comprehensive Health Check

```javascript
import { withGitVan, useJob, useLock, useReceipt, useGit } from 'gitvan';

async function healthCheck() {
  await withGitVan({ cwd: process.cwd() }, async () => {
    const job = useJob();
    const lock = useLock();
    const receipt = useReceipt();
    const git = useGit();

    console.log('=== GitVan Job System Health Check ===\n');

    // Git status
    const gitInfo = await git.info();
    console.log('Git:');
    console.log('  Branch:', gitInfo.branch);
    console.log('  Head:', gitInfo.head);
    console.log('  Worktree:', gitInfo.worktree);

    // Job discovery
    const jobs = await job.list();
    console.log('\nJobs:');
    console.log('  Total:', jobs.length);

    // Validation
    const validations = await job.validateAll();
    const invalid = validations.filter(v => !v.valid);
    console.log('  Valid:', jobs.length - invalid.length);
    console.log('  Invalid:', invalid.length);

    if (invalid.length > 0) {
      console.log('\n  Invalid jobs:');
      invalid.forEach(v => {
        console.log(`    - ${v.id}:`, v.errors.join(', '));
      });
    }

    // Scheduler status
    const schedulerStatus = job.getSchedulerStatus();
    console.log('\nScheduler:');
    console.log('  Running:', schedulerStatus.isRunning);
    console.log('  Jobs:', schedulerStatus.jobCount);

    // Locks
    const locks = await lock.list();
    console.log('\nLocks:');
    console.log('  Total:', locks.length);
    console.log('  Active:', locks.filter(l => l.locked).length);

    // Receipts
    const receiptStats = await receipt.getStats({ limit: 1000 });
    console.log('\nReceipts:');
    console.log('  Total:', receiptStats.total);
    console.log('  Success rate:', receiptStats.successRate + '%');
    console.log('  Average duration:', receiptStats.averageDuration.toFixed(0) + 'ms');

    // Memory
    const mem = process.memoryUsage();
    console.log('\nMemory:');
    console.log('  RSS:', (mem.rss / 1024 / 1024).toFixed(2), 'MB');
    console.log('  Heap:', (mem.heapUsed / 1024 / 1024).toFixed(2), 'MB');

    console.log('\n=== Health Check Complete ===');
  });
}

healthCheck().catch(console.error);
```

### Trace Job Execution

```javascript
async function traceJobExecution(jobId) {
  await withGitVan({ cwd: process.cwd() }, async () => {
    const job = useJob();
    const lock = useLock();
    const receipt = useReceipt();

    console.log(`=== Tracing job: ${jobId} ===\n`);

    // Job definition
    console.log('1. Loading job definition...');
    const jobDef = await job.get(jobId);
    console.log('   ✓ Job found:', jobDef.name);

    // Validation
    console.log('\n2. Validating job...');
    const validation = await job.validate(jobId);
    if (validation.valid) {
      console.log('   ✓ Job is valid');
    } else {
      console.log('   ✗ Job is invalid:');
      validation.errors.forEach(e => console.log('     -', e));
      return;
    }

    // Lock check
    console.log('\n3. Checking lock status...');
    const isLocked = await lock.isLocked(`job-${jobId}`);
    if (isLocked) {
      console.log('   ⚠ Job is currently locked');
      const lockInfo = await lock.getLockInfo(`job-${jobId}`);
      console.log('   Lock acquired:', lockInfo.data.timestamp);
    } else {
      console.log('   ✓ No lock held');
    }

    // Execute
    console.log('\n4. Executing job...');
    const startTime = Date.now();

    try {
      const result = await job.runWithLock(jobId, {
        payload: { trace: true }
      });

      const duration = Date.now() - startTime;
      console.log(`   ✓ Job completed in ${duration}ms`);
      console.log('   Result:', result);

      // Verify receipt
      console.log('\n5. Verifying receipt...');
      const history = await receipt.list({ jobId, limit: 1 });
      if (history.length > 0) {
        const lastReceipt = history[0];
        console.log('   ✓ Receipt written');
        console.log('   Receipt ID:', lastReceipt.id);
        console.log('   Status:', lastReceipt.status);
        console.log('   Duration:', lastReceipt.duration + 'ms');

        const verification = await receipt.verify(lastReceipt.id);
        if (verification.valid) {
          console.log('   ✓ Receipt verified');
        } else {
          console.log('   ✗ Receipt verification failed');
        }
      }
    } catch (error) {
      console.log('   ✗ Job failed:', error.message);
      console.error(error.stack);
    }

    console.log('\n=== Trace Complete ===');
  });
}

traceJobExecution('backup-job').catch(console.error);
```

---

## Getting Help

If you're still experiencing issues after trying these solutions:

1. **Check the logs** with `DEBUG=gitvan:* npm start`
2. **Run health check** to identify system issues
3. **Trace job execution** to pinpoint failures
4. **Review documentation:**
   - [API Reference](api/job-scheduler.md)
   - [Architecture Guide](ARCHITECTURE-BREE-INTEGRATION.md)
   - [Performance Tuning](PERFORMANCE-TUNING-JOBS.md)
5. **Create an issue** with:
   - GitVan version
   - Node.js version
   - Operating system
   - Full error message
   - Minimal reproduction steps
   - Health check output

---

## See Also

- [API Reference](api/job-scheduler.md)
- [Architecture & Design](ARCHITECTURE-BREE-INTEGRATION.md)
- [Performance Tuning](PERFORMANCE-TUNING-JOBS.md)
- [Security Hardening](SECURITY-JOBS.md)
- [Windows Compatibility](WINDOWS-COMPATIBILITY-JOBS.md)
