# GitVan v4.0.0 Migration Guide

**Target Audience:** Developers, DevOps Engineers, System Administrators
**Estimated Time:** 15-30 minutes
**Difficulty:** Low (zero breaking changes)

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Migration Steps](#migration-steps)
4. [Post-Migration Verification](#post-migration-verification)
5. [Rollback Instructions](#rollback-instructions)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

## Prerequisites

### System Requirements
- Node.js 18+ (unchanged from v3.0.0)
- Git 2.30+ (unchanged)
- 100MB free disk space for worker files

### Current Version
- GitVan v3.0.0 or later
- Check version: `gitvan --version`

### Backup Recommendations
```bash
# Backup your repository
git bundle create backup-$(date +%Y%m%d).bundle --all

# Backup Git notes (audit trail)
git notes --ref refs/notes/gitvan/audit show HEAD > notes-backup.txt

# Backup configuration
cp gitvan.config.js gitvan.config.js.backup
```

## Pre-Migration Checklist

### 1. Verify Current Installation

```bash
# Check GitVan version
gitvan --version

# List current jobs
gitvan job list

# Check job history (verify Git notes working)
gitvan job history

# Verify no jobs currently running
gitvan job status
```

### 2. Document Current Configuration

```bash
# Save current configuration
cat gitvan.config.js

# Document scheduled jobs (if any)
gitvan job list --format json > current-jobs.json
```

### 3. Review Existing Jobs

```bash
# List all job files
find jobs -name "*.mjs" -type f

# Check for cron definitions
grep -r "export const cron" jobs/
```

## Migration Steps

### Step 1: Update Dependencies (Automatic)

The `bree@^9.0.0` dependency is already in `package.json`. Simply run:

```bash
npm install
```

**Expected Output:**
```
added 82 packages in 15s
```

**Verification:**
```bash
# Verify Bree installed
npm list bree
# Should show: bree@9.0.0
```

### Step 2: Test Backward Compatibility

**No code changes required.** Existing jobs work identically:

```bash
# Run an existing job (legacy mode)
gitvan job run my-existing-job

# Verify output matches previous behavior
gitvan job history my-existing-job
```

If jobs fail at this step, **do not proceed**. See [Rollback Instructions](#rollback-instructions).

### Step 3: Optional - Enable Bree Scheduling

This step is **optional** and can be done gradually per job.

#### Option A: Auto-Schedule All Cron Jobs

```bash
# Automatically schedule jobs with cron definitions
gitvan job auto-schedule

# Verify jobs were scheduled
gitvan job scheduler-status
```

#### Option B: Schedule Jobs Individually

```bash
# Schedule specific jobs
gitvan job schedule my-job --cron "0 * * * *"
gitvan job schedule another-job --interval 60000

# Verify scheduling
gitvan job scheduler-status
```

### Step 4: Start the Scheduler (Optional)

Only if you scheduled jobs in Step 3:

```bash
# Start the Bree scheduler
gitvan job start-scheduler

# Verify running
gitvan job scheduler-status
# Expected: isRunning: true
```

### Step 5: Update Configuration (Optional)

Add Bree-specific settings to `gitvan.config.js`:

```javascript
export default {
  jobs: {
    dir: "jobs",

    // Optional Bree configuration
    bree: {
      timeout: 300000,              // 5 minute job timeout
      interval: 1000,               // Check every 1 second
      closeWorkerAfterMs: 5000,     // Close workers after 5s idle
      removeCompleted: true,        // Auto-remove completed jobs
    }
  },

  // Existing configuration preserved
  templates: {
    dirs: ["templates"],
    autoescape: false,
  },

  receipts: {
    ref: "refs/notes/gitvan/audit"
  }
}
```

**Note:** These settings are optional. Defaults work for most use cases.

### Step 6: Update CI/CD (If Applicable)

If you use GitVan in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm install

      # Legacy job execution (no changes needed)
      - name: Run GitVan job
        run: gitvan job run build-job

      # Or use Bree scheduler
      - name: Run with Bree
        run: |
          gitvan job schedule build-job --cron "0 * * * *"
          gitvan job start-scheduler
          gitvan job run build-job
          gitvan job stop-scheduler
```

**No changes required** if using legacy `gitvan job run` commands.

## Post-Migration Verification

### Verification Checklist

Run these commands to verify successful migration:

```bash
# 1. Check version
gitvan --version
# Expected: v4.0.0 or later

# 2. List jobs (legacy API)
gitvan job list
# Should show all jobs

# 3. Run a test job
gitvan job run test-job
# Should execute successfully

# 4. Verify Git notes (audit trail)
git notes --ref refs/notes/gitvan/audit list
# Should show receipts

# 5. Check scheduler status (if enabled)
gitvan job scheduler-status
# Shows scheduled jobs

# 6. Verify worker cleanup
ls .gitvan/workers/
# Should be empty or contain only active workers
```

### Integration Testing

Create a test job to verify all features:

```bash
# Create test job
cat > jobs/migration-test.mjs << 'EOF'
export const meta = {
  name: "Migration Test",
  desc: "Verify v4.0.0 works correctly",
  tags: ["test"]
};

export default async function run({ payload, ctx }) {
  console.log("Migration test successful!");
  console.log("Git HEAD:", ctx.git?.head);
  console.log("Payload:", payload);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    version: "4.0.0"
  };
}
EOF

# Test legacy execution
echo "Testing legacy job execution..."
gitvan job run migration-test --payload '{"test": true}'

# Test Bree execution
echo "Testing Bree execution..."
gitvan job schedule migration-test --cron "*/5 * * * *"
gitvan job start-scheduler
sleep 10
gitvan job stop-scheduler

# Verify receipt
gitvan job history migration-test

# Cleanup
rm jobs/migration-test.mjs
gitvan job unschedule migration-test
```

### Performance Baseline

Establish performance baseline for comparison:

```bash
# Time a job execution
time gitvan job run my-job

# Check worker overhead
ps aux | grep gitvan
# Workers should appear during execution, disappear after

# Monitor memory
top -b -n 1 | grep gitvan
# Note memory usage for comparison
```

## Rollback Instructions

### When to Rollback

Rollback if:
- Jobs fail that previously worked
- Performance degrades significantly
- Unexpected errors in logs
- Context errors ("context not available")

### Rollback Procedure

```bash
# 1. Stop the scheduler (if running)
gitvan job stop-scheduler

# 2. Reinstall previous version
npm install gitvan@3.0.0

# 3. Restore configuration (if modified)
cp gitvan.config.js.backup gitvan.config.js

# 4. Verify rollback
gitvan --version
# Should show v3.0.0

# 5. Test jobs
gitvan job run my-job

# 6. Restore Git notes (if corrupted)
git notes --ref refs/notes/gitvan/audit add -f -F notes-backup.txt HEAD
```

### Partial Rollback (Disable Bree Only)

If you want to keep v4.0.0 but disable Bree:

```bash
# Stop scheduler
gitvan job stop-scheduler

# Unschedule all jobs
gitvan job list --format json | jq -r '.[] | .id' | while read job; do
  gitvan job unschedule "$job"
done

# Use legacy execution only
gitvan job run my-job
```

## Troubleshooting

### Common Issues

#### Issue: "Context not available" errors

**Cause:** Composables used outside `withGitVan()` wrapper

**Solution:**
```javascript
// Incorrect
const git = useGit();
await someAsyncCall();
git.status(); // Error!

// Correct
await withGitVan(context, async () => {
  const git = useGit();
  await someAsyncCall();
  git.status(); // Works!
});
```

#### Issue: Worker files accumulate in `.gitvan/workers/`

**Cause:** Abnormal shutdown without cleanup

**Solution:**
```bash
# Stop scheduler gracefully
gitvan job stop-scheduler

# Manual cleanup
rm -rf .gitvan/workers/*.mjs

# Restart
gitvan job start-scheduler
```

#### Issue: Jobs don't execute on schedule

**Cause:** Scheduler not started or cron syntax error

**Solution:**
```bash
# Check scheduler status
gitvan job scheduler-status

# Start if not running
gitvan job start-scheduler

# Verify cron syntax at https://crontab.guru/
# Example: "0 * * * *" = every hour

# Re-schedule with correct syntax
gitvan job schedule my-job --cron "0 * * * *"
```

#### Issue: Job execution times out

**Cause:** Default 5-minute timeout exceeded

**Solution:**
```javascript
// In gitvan.config.js
export default {
  jobs: {
    bree: {
      timeout: 600000  // Increase to 10 minutes
    }
  }
}
```

#### Issue: Memory usage increases

**Cause:** Workers not closing after execution

**Solution:**
```javascript
// In gitvan.config.js
export default {
  jobs: {
    bree: {
      closeWorkerAfterMs: 3000  // Close after 3 seconds
    }
  }
}
```

### Debug Mode

Enable verbose logging:

```bash
# Set log level
export GITVAN_LOG_LEVEL=debug

# Run job
gitvan job run my-job

# Check logs
cat .gitvan/logs/jobs.log
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh - Verify GitVan v4.0.0 health

echo "GitVan Health Check"
echo "==================="

# Version
VERSION=$(gitvan --version)
echo "Version: $VERSION"

# Jobs
JOB_COUNT=$(gitvan job list --format json | jq length)
echo "Jobs found: $JOB_COUNT"

# Scheduler
STATUS=$(gitvan job scheduler-status --format json 2>/dev/null)
if [ $? -eq 0 ]; then
  IS_RUNNING=$(echo "$STATUS" | jq -r .isRunning)
  SCHEDULED=$(echo "$STATUS" | jq -r .jobCount)
  echo "Scheduler: $IS_RUNNING ($SCHEDULED scheduled)"
else
  echo "Scheduler: Not configured"
fi

# Workers
WORKER_COUNT=$(ls .gitvan/workers/*.mjs 2>/dev/null | wc -l)
echo "Active workers: $WORKER_COUNT"

# Git notes
NOTE_COUNT=$(git notes --ref refs/notes/gitvan/audit list 2>/dev/null | wc -l)
echo "Audit receipts: $NOTE_COUNT"

echo "==================="
echo "Health check complete"
```

## FAQ

### Q: Do I need to rewrite my existing jobs?

**A:** No. All existing jobs work without any changes. The new Bree features are opt-in.

### Q: Can I use both legacy and Bree execution?

**A:** Yes. You can use `gitvan job run` (legacy) and `gitvan job schedule` (Bree) side-by-side.

### Q: What happens to Git notes (audit trail)?

**A:** Unchanged. All executions (legacy and Bree) write receipts to `refs/notes/gitvan/audit`.

### Q: Do cron jobs automatically schedule?

**A:** No, unless you run `gitvan job auto-schedule`. This is opt-in.

### Q: Can I schedule jobs without cron syntax?

**A:** Yes. Use `--interval` for millisecond-based scheduling: `gitvan job schedule my-job --interval 60000` (every 60 seconds).

### Q: How do I stop the scheduler?

**A:** Run `gitvan job stop-scheduler`. This gracefully shuts down all workers.

### Q: What's the worker overhead?

**A:** Each active worker uses ~10-20MB of memory. Workers close after 5 seconds of inactivity by default.

### Q: Are worker files committed to Git?

**A:** No. Worker files in `.gitvan/workers/` are temporary and should be in `.gitignore`.

### Q: Can I run multiple jobs in parallel?

**A:** Yes. Bree executes jobs in separate worker threads, enabling true parallelism.

### Q: What about Windows support?

**A:** Fully supported. Worker import paths use file:// URLs with platform detection.

## Next Steps

After successful migration:

1. **Explore Scheduling**: Try scheduling recurring jobs with cron
2. **Monitor Performance**: Compare execution times and memory usage
3. **Update Documentation**: Document which jobs are scheduled
4. **Gradual Adoption**: Migrate jobs to Bree scheduling incrementally
5. **Provide Feedback**: Report issues or suggestions on GitHub

## Additional Resources

- [Release Notes](./RELEASE_NOTES_v4.0.0.md) - Complete feature overview
- [Bree Documentation](https://github.com/breejs/bree) - Official Bree docs
- [Cron Syntax Guide](https://crontab.guru/) - Test cron expressions
- [GitVan Job System](./docs/jobs.md) - Job system documentation
- [Troubleshooting Guide](./docs/troubleshooting.md) - Common issues

## Support

If you encounter issues during migration:

1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Review [Known Issues](./RELEASE_NOTES_v4.0.0.md#known-issues)
3. File an issue on GitHub with:
   - GitVan version (`gitvan --version`)
   - Node.js version (`node --version`)
   - Error messages and logs
   - Steps to reproduce

---

**Migration Guide Version:** 1.0
**Last Updated:** January 8, 2026
**Applies To:** GitVan v3.x → v4.0.0
