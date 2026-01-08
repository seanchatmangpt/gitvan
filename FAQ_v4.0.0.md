# GitVan v4.0.0 - Frequently Asked Questions (FAQ)

**Last Updated:** January 8, 2026
**Version:** v4.0.0

---

## General Questions

### Q1: What is GitVan v4.0.0?

**A:** GitVan v4.0.0 is a major release that integrates Bree scheduler into GitVan's job system, bringing enterprise-grade job scheduling with worker-thread execution, cron support, and enhanced reliability. The release maintains 100% backward compatibility with v3.x.

### Q2: Is this a breaking change release?

**A:** No. v4.0.0 has **zero breaking changes**. All existing code, APIs, CLI commands, and job definitions continue to work exactly as before. The new Bree features are completely opt-in.

### Q3: Do I need to rewrite my existing jobs?

**A:** No. All existing jobs work without any modifications. You can continue using them exactly as before with `gitvan job run my-job`.

### Q4: Can I upgrade without downtime?

**A:** Yes. The upgrade process is non-disruptive:
1. Install: `npm install gitvan@4.0.0`
2. Test: `gitvan job run my-job`
3. (Optional) Enable scheduler: `gitvan job auto-schedule`

Existing job execution continues throughout the process.

### Q5: What happens if I don't want to use the new scheduler features?

**A:** That's perfectly fine! You can continue using GitVan exactly as before. The legacy job execution via `gitvan job run` remains fully supported with no deprecation timeline.

---

## Installation & Upgrade

### Q6: How do I upgrade to v4.0.0?

**A:** Simple:
```bash
npm install gitvan@4.0.0
```

Then verify:
```bash
gitvan --version  # Should show v4.0.0
gitvan job run test-job  # Test existing job
```

See [Migration Guide](./MIGRATION_GUIDE_v4.0.0.md) for detailed steps.

### Q7: What are the system requirements?

**A:** Same as v3.0.0:
- Node.js 18+ (unchanged)
- Git 2.30+ (unchanged)
- 100MB free disk space (for worker files)
- 512MB+ free memory (recommended)

### Q8: Do I need to backup before upgrading?

**A:** While not strictly required (due to zero breaking changes), we recommend:
```bash
git bundle create backup.bundle --all
git notes --ref refs/notes/gitvan/audit show HEAD > notes-backup.txt
cp gitvan.config.js gitvan.config.js.backup
```

### Q9: Can I rollback to v3.0.0 if needed?

**A:** Yes, easily:
```bash
npm install gitvan@3.0.0
gitvan --version  # Verify
```

All your data remains intact (Git notes, configuration, etc.).

### Q10: Will my CI/CD pipelines break?

**A:** No. All existing CI/CD commands work unchanged:
```yaml
- name: Run GitVan job
  run: gitvan job run build-job  # Works identically
```

---

## Bree Scheduler

### Q11: What is Bree?

**A:** [Bree](https://github.com/breejs/bree) is a battle-tested job scheduler for Node.js with worker-thread support, cron expressions, and robust error handling. GitVan v4.0.0 uses Bree for enhanced scheduling capabilities.

### Q12: Do I need to learn Bree to use GitVan v4.0.0?

**A:** No. GitVan abstracts Bree behind its familiar API. You interact with GitVan's `useJob()` composable and CLI commands, not Bree directly.

### Q13: How do I enable the Bree scheduler?

**A:** Three ways:

**Option 1: Auto-schedule all cron jobs**
```bash
gitvan job auto-schedule
gitvan job start-scheduler
```

**Option 2: Schedule specific jobs**
```bash
gitvan job schedule my-job --cron "0 * * * *"
gitvan job start-scheduler
```

**Option 3: Programmatically**
```javascript
const job = useJob();
await job.schedule('my-job', { cron: '0 * * * *' });
await job.startScheduler();
```

### Q14: What's the difference between cron and interval scheduling?

**A:**
- **Cron**: Time-based scheduling with standard cron syntax (e.g., `"0 * * * *"` = every hour)
- **Interval**: Duration-based scheduling in milliseconds (e.g., `60000` = every 60 seconds)

Examples:
```bash
# Cron: Every day at 2am
gitvan job schedule backup --cron "0 2 * * *"

# Interval: Every 5 minutes
gitvan job schedule monitor --interval 300000
```

### Q15: Can I use both legacy and Bree execution?

**A:** Yes! You can use both side-by-side:
```bash
# Legacy execution
gitvan job run immediate-job

# Bree execution (scheduled)
gitvan job schedule recurring-job --cron "0 * * * *"
```

They both write to the same audit trail (Git notes).

### Q16: How do I stop the scheduler?

**A:**
```bash
gitvan job stop-scheduler
```

This gracefully shuts down the scheduler and cleans up all worker threads.

---

## Worker Threads

### Q17: What are worker threads?

**A:** Worker threads are isolated JavaScript execution environments that run in parallel. In GitVan v4.0.0, each job executes in its own worker thread, providing:
- Crash isolation (one job failure doesn't affect others)
- True parallelism (multiple jobs run simultaneously)
- Better resource management

### Q18: How much memory do worker threads use?

**A:** Each active worker uses approximately 10-20MB. Workers automatically close after 5 seconds of inactivity (configurable), so memory usage is efficient.

### Q19: Where do worker files get created?

**A:** Worker files are temporarily created in `.gitvan/workers/` directory. They are:
- Auto-generated from your job definitions
- Cleaned up on scheduler shutdown
- Never committed to Git (add to `.gitignore`)

### Q20: What if worker files accumulate?

**A:** This shouldn't happen with v4.0.0 (we fixed this bug). But if it does:
```bash
gitvan job stop-scheduler
rm -rf .gitvan/workers/*.mjs
gitvan job start-scheduler
```

### Q21: Can jobs run in parallel?

**A:** Yes! Multiple jobs can execute in parallel via worker threads. GitVan's locking mechanism prevents the same job from running concurrently.

Example:
```bash
# These run in parallel (different jobs)
gitvan job run job1 &
gitvan job run job2 &
gitvan job run job3 &
wait
```

### Q22: Are worker threads sandboxed?

**A:** Yes. Each worker runs in isolation:
- No shared state between workers
- Clean environment per execution
- Crashes don't affect other workers or main process

---

## Configuration

### Q23: Do I need to change my configuration?

**A:** No. Existing configuration works unchanged. But you can optionally add Bree-specific settings:

```javascript
// gitvan.config.js
export default {
  jobs: {
    dir: "jobs",  // Existing

    // Optional Bree configuration
    bree: {
      timeout: 300000,              // 5 minute job timeout
      interval: 1000,               // Check every 1 second
      closeWorkerAfterMs: 5000,     // Close workers after 5s
      removeCompleted: true,        // Auto-remove completed jobs
    }
  }
}
```

### Q24: What timeout should I use for jobs?

**A:** Depends on your jobs:
- Quick jobs (<1 min): Default 300000ms (5 min) is fine
- Medium jobs (1-10 min): Set to 600000ms (10 min)
- Long jobs (>10 min): Set to 3600000ms (60 min) or disable (0)

```javascript
bree: {
  timeout: 600000  // 10 minutes
}
```

### Q25: How do I adjust worker cleanup timing?

**A:** Use `closeWorkerAfterMs`:

```javascript
bree: {
  closeWorkerAfterMs: 3000  // Close after 3 seconds
}
```

Lower values = faster cleanup, but more overhead for frequent jobs
Higher values = less overhead, but more memory usage

---

## Cron Syntax

### Q26: What cron syntax does GitVan support?

**A:** Standard cron expressions with 5 fields:
```
┌───────────── minute (0-59)
│ ┌─────────── hour (0-23)
│ │ ┌───────── day of month (1-31)
│ │ │ ┌─────── month (1-12)
│ │ │ │ ┌───── day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *
```

### Q27: What are common cron patterns?

**A:** Here are useful patterns:

```bash
# Every minute
"* * * * *"

# Every hour at minute 0
"0 * * * *"

# Every day at 2am
"0 2 * * *"

# Every Monday at 9am
"0 9 * * 1"

# Every 15 minutes
"*/15 * * * *"

# First day of every month at midnight
"0 0 1 * *"
```

Use [crontab.guru](https://crontab.guru/) to test expressions.

### Q28: Can I use seconds in cron expressions?

**A:** No. GitVan uses standard 5-field cron (minute-level precision). Use `interval` for second-level precision:

```bash
# Every 30 seconds
gitvan job schedule my-job --interval 30000
```

### Q29: How do I schedule a job to run once?

**A:** Use `gitvan job run` for one-time execution:
```bash
gitvan job run my-job
```

Or use a `date` parameter (requires Bree advanced configuration).

---

## Performance

### Q30: Will v4.0.0 make my jobs faster?

**A:** Possibly, through parallel execution:
- Single job: Similar performance to v3.0.0
- Multiple jobs: Faster due to parallel worker threads
- Long-running jobs: Better main thread responsiveness

### Q31: What's the overhead of worker threads?

**A:** Minimal:
- ~10-20MB memory per active worker
- ~100-200ms startup time per worker
- Workers close after 5s idle

For short jobs (<1 second), use legacy execution for lower overhead.

### Q32: Can I benchmark the performance difference?

**A:** Yes:

```bash
# Legacy execution
time gitvan job run benchmark-job

# Bree execution
gitvan job schedule benchmark-job --cron "* * * * *"
gitvan job start-scheduler
# Wait for execution
gitvan job history benchmark-job  # Check duration
```

### Q33: How many jobs can run concurrently?

**A:** Limited only by system resources (CPU cores, memory):
- Each worker uses 1 CPU core
- Each worker uses ~10-20MB RAM
- Recommended max: Number of CPU cores - 1

Example: 8-core system = 7 concurrent jobs comfortably.

---

## Troubleshooting

### Q34: I'm getting "context not available" errors

**A:** This was a bug in the initial v4.0.0 release but was fixed in commit 43d133d. Ensure you have the latest v4.0.0:

```bash
npm install gitvan@4.0.0
gitvan --version  # Verify it's 4.0.0
```

If the issue persists, wrap your code in `withGitVan()`:
```javascript
await withGitVan(context, async () => {
  const job = useJob();
  await job.run('my-job');
});
```

### Q35: Jobs aren't executing on schedule

**A:** Check these:

1. **Is scheduler running?**
   ```bash
   gitvan job scheduler-status
   # isRunning should be true
   ```

2. **Is job scheduled?**
   ```bash
   gitvan job scheduler-status
   # Should list your job
   ```

3. **Is cron syntax correct?**
   Test at [crontab.guru](https://crontab.guru/)

4. **Check logs:**
   ```bash
   tail -100 .gitvan/logs/jobs.log
   ```

### Q36: Worker files are accumulating in .gitvan/workers/

**A:** This bug was fixed in commit 43d133d. Update to latest v4.0.0:
```bash
npm install gitvan@4.0.0
```

Manual cleanup (if needed):
```bash
gitvan job stop-scheduler
rm -rf .gitvan/workers/*.mjs
gitvan job start-scheduler
```

### Q37: Memory usage is increasing

**A:** Check worker lifetime configuration:

```javascript
// In gitvan.config.js
export default {
  jobs: {
    bree: {
      closeWorkerAfterMs: 3000  // Close faster (3 seconds)
    }
  }
}
```

Also verify workers are closing:
```bash
ps aux | grep gitvan
# Should show minimal processes when idle
```

### Q38: How do I debug job execution?

**A:** Enable debug logging:

```bash
export GITVAN_LOG_LEVEL=debug
gitvan job run my-job
```

Check detailed logs:
```bash
cat .gitvan/logs/jobs.log
```

### Q39: Can I see what jobs are scheduled?

**A:** Yes:
```bash
gitvan job scheduler-status

# Or in JSON format
gitvan job scheduler-status --format json
```

### Q40: How do I unschedule a job?

**A:**
```bash
gitvan job unschedule my-job
```

The job definition remains, but it won't run on schedule.

---

## Git Integration

### Q41: Does v4.0.0 still use Git notes for audit trail?

**A:** Yes! All executions (legacy and Bree) write receipts to `refs/notes/gitvan/audit`. Nothing changed in audit trail functionality.

### Q42: Are worker files committed to Git?

**A:** No. Worker files in `.gitvan/workers/` are temporary and should be in `.gitignore`:

```
# .gitignore
.gitvan/workers/
.gitvan/logs/
```

### Q43: Does the scheduler work with signed commits?

**A:** Yes. GitVan's signing policy (`requireSignedCommits`) continues to work with v4.0.0.

### Q44: Can I query job execution history with SPARQL?

**A:** Yes, if you're using GitVan's RDF features. Job receipts are stored as RDF graphs and queryable via SPARQL.

---

## Security

### Q45: Is worker thread execution secure?

**A:** Yes. Workers provide enhanced security:
- Isolated execution (no shared state)
- Clean environment per execution
- Crash isolation
- Deterministic environment (TZ=UTC, LANG=C)

### Q46: Were any vulnerabilities fixed in v4.0.0?

**A:** Yes, we resolved potential import path injection vulnerabilities by using file:// URLs for worker imports. No known exploits existed.

### Q47: Can workers access the filesystem?

**A:** Yes, workers have same filesystem access as your job definitions. Implement your own sandboxing if needed.

### Q48: Are job payloads encrypted?

**A:** No. Job payloads are stored in Git notes in plaintext. Don't pass secrets via payloads—use environment variables instead.

---

## Migration & Compatibility

### Q49: Can I run v3.0.0 and v4.0.0 side-by-side?

**A:** In different repositories, yes. In the same repository, no—you can only have one version installed.

### Q50: Will v3.0.0 jobs work in v4.0.0?

**A:** Yes, 100% compatible. All v3.0.0 jobs work in v4.0.0 without changes.

### Q51: Can I gradually migrate jobs to Bree?

**A:** Yes! Migrate incrementally:

1. Keep using `gitvan job run` for immediate jobs
2. Schedule recurring jobs one at a time:
   ```bash
   gitvan job schedule job1 --cron "0 * * * *"
   gitvan job schedule job2 --cron "0 2 * * *"
   ```
3. Monitor and adjust

### Q52: What if I want to go back to v3.0.0?

**A:** Easy rollback:
```bash
npm install gitvan@3.0.0
```

Your jobs, configuration, and Git notes remain intact.

---

## Support & Community

### Q53: Where can I get help?

**A:** Multiple channels:
- **GitHub Issues**: https://github.com/owner/gitvan/issues (bug reports)
- **GitHub Discussions**: https://github.com/owner/gitvan/discussions (questions)
- **Documentation**: ./docs/ directory
- **Email**: support@gitvan.dev (if applicable)

### Q54: How do I report a bug?

**A:** File a GitHub issue with:
```
- GitVan version: gitvan --version
- Node.js version: node --version
- Operating system: uname -a
- Steps to reproduce
- Expected vs actual behavior
- Logs (if applicable)
```

### Q55: Can I contribute to GitVan?

**A:** Yes! GitVan is open source. Check CONTRIBUTING.md for guidelines.

### Q56: Where can I request new features?

**A:** GitHub Discussions under "Ideas" category: https://github.com/owner/gitvan/discussions

### Q57: Is there a roadmap?

**A:** Yes! See [RELEASE_NOTES_v4.0.0.md](./RELEASE_NOTES_v4.0.0.md#whats-next-v410-roadmap) for v4.1.0 planned features.

---

## What's Next

### Q58: What's coming in v4.1.0?

**A:** Planned features:
- Job dependency graphs (DAG execution)
- Real-time monitoring dashboard
- Enhanced retry policies
- Job pause/resume capabilities
- Distributed scheduling across machines
- Failure notifications (email, Slack, webhooks)

Expected: February 2026

### Q59: Will there be a v4.0.1?

**A:** Yes, for minor bug fixes. Planned for January 15, 2026.

### Q60: How often are releases?

**A:**
- **Major releases** (v5.0.0): Yearly
- **Minor releases** (v4.1.0): Quarterly
- **Patch releases** (v4.0.1): As needed

---

## Additional Resources

- [Release Notes](./RELEASE_NOTES_v4.0.0.md) - Complete feature overview
- [Migration Guide](./MIGRATION_GUIDE_v4.0.0.md) - Step-by-step upgrade
- [Operator Checklist](./OPERATOR_CHECKLIST_v4.0.0.md) - Deployment procedures
- [Technical Summary](./BREE_REFACTORING_SUMMARY.md) - Architecture details
- [Bree Documentation](https://github.com/breejs/bree) - Upstream docs
- [Cron Syntax Tester](https://crontab.guru/) - Test expressions

---

**FAQ Version:** 1.0
**Last Updated:** January 8, 2026
**Maintainer:** GitVan Team

**Question not answered?** Ask on [GitHub Discussions](https://github.com/owner/gitvan/discussions)!
