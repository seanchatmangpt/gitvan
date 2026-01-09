# Example 4: Job Scheduling

This example demonstrates using GitVan's job system for background tasks, scheduled operations, and recurring workflows.

## Scenario: Automated Maintenance Tasks

Create a suite of background jobs for repository maintenance:
1. Daily cleanup of temporary files
2. Hourly sync with remote repository
3. Weekly dependency updates
4. Monthly security audits

## Job Definitions

### Cleanup Job

Create `jobs/cleanup.mjs`:

```javascript
export default {
  name: 'cleanup',
  description: 'Clean up temporary files and caches',
  schedule: '0 0 * * *',  // Daily at midnight

  async run(context) {
    const { useFileSystem, useGit } = await import('gitvan');

    await withGitVan(context, async () => {
      const fs = useFileSystem();
      const git = useGit();

      console.log('Starting cleanup job...');

      // 1. Remove temporary files
      const tempFiles = await fs.list('temp');
      for (const file of tempFiles) {
        await fs.delete(`temp/${file}`);
      }
      console.log(`Removed ${tempFiles.length} temp files`);

      // 2. Clean Git worktrees
      const worktree = git.worktree();
      await worktree.prune();
      console.log('Pruned stale worktrees');

      // 3. Clean build artifacts older than 7 days
      const buildFiles = await fs.list('dist');
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const file of buildFiles) {
        const stats = await fs.stat(`dist/${file}`);
        if (stats.mtime < weekAgo) {
          await fs.delete(`dist/${file}`);
        }
      }

      // 4. Garbage collect Git objects
      await git.gc();
      console.log('Git garbage collection complete');

      console.log('✓ Cleanup job completed');

      return {
        status: 'success',
        filesRemoved: tempFiles.length,
        timestamp: new Date().toISOString()
      };
    });
  }
};
```

### Sync Job

Create `jobs/sync.mjs`:

```javascript
export default {
  name: 'sync',
  description: 'Sync with remote repository',
  schedule: '0 * * * *',  // Every hour

  async run(context) {
    const { withGitVan, useGit, useReceipt } = await import('gitvan');

    await withGitVan(context, async () => {
      const git = useGit();
      const receipt = useReceipt();

      console.log('Starting sync job...');

      try {
        // 1. Fetch from all remotes
        const remotes = await git.listRemotes();
        for (const remote of remotes) {
          console.log(`Fetching from ${remote}...`);
          await git.fetch({ remote });
        }

        // 2. Check for updates
        const status = await git.status();
        if (status.behind > 0) {
          console.log(`${status.behind} commits behind. Pulling...`);

          // Pull with rebase
          await git.pull({
            remote: 'origin',
            branch: status.branch,
            rebase: true
          });

          console.log('✓ Pulled latest changes');
        } else {
          console.log('Already up to date');
        }

        // 3. Record sync in audit trail
        await receipt.write({
          action: 'job:sync',
          status: 'success',
          commitsBehind: status.behind,
          timestamp: new Date().toISOString()
        });

        return {
          status: 'success',
          updated: status.behind > 0,
          commitsPulled: status.behind
        };
      } catch (error) {
        console.error('Sync failed:', error);

        await receipt.write({
          action: 'job:sync',
          status: 'failure',
          error: error.message,
          timestamp: new Date().toISOString()
        });

        throw error;
      }
    });
  }
};
```

### Dependency Update Job

Create `jobs/update-deps.mjs`:

```javascript
import { execSync } from 'child_process';

export default {
  name: 'update-deps',
  description: 'Check for and update dependencies',
  schedule: '0 0 * * 0',  // Weekly on Sunday at midnight

  async run(context) {
    const { withGitVan, useGit, useWorkflow } = await import('gitvan');

    await withGitVan(context, async () => {
      const git = useGit();
      const workflow = useWorkflow();

      console.log('Checking for dependency updates...');

      // 1. Check for outdated packages
      const outdated = execSync('npm outdated --json', {
        encoding: 'utf8'
      });
      const packages = JSON.parse(outdated || '{}');

      if (Object.keys(packages).length === 0) {
        console.log('All dependencies up to date');
        return { status: 'success', updated: false };
      }

      console.log(`Found ${Object.keys(packages).length} outdated packages`);

      // 2. Create update branch
      const branchName = `deps/auto-update-${Date.now()}`;
      await git.branch(branchName, { checkout: true });

      // 3. Update packages
      console.log('Updating packages...');
      execSync('npm update', { stdio: 'inherit' });

      // 4. Run tests
      console.log('Running tests...');
      const testResult = await workflow.execute('test-suite');

      if (testResult.status !== 'success') {
        console.error('Tests failed after update. Aborting.');
        await git.checkout('main');
        await git.deleteBranch(branchName);
        return { status: 'failure', reason: 'tests-failed' };
      }

      // 5. Commit and push
      await git.add(['package.json', 'package-lock.json']);
      await git.commit('chore: update dependencies\n\nAutomated dependency update');
      await git.push({
        remote: 'origin',
        branch: branchName,
        setUpstream: true
      });

      console.log('✓ Dependency update branch created');
      console.log(`Branch: ${branchName}`);

      return {
        status: 'success',
        updated: true,
        packagesUpdated: Object.keys(packages).length,
        branch: branchName
      };
    });
  }
};
```

### Security Audit Job

Create `jobs/security-audit.mjs`:

```javascript
import { execSync } from 'child_process';

export default {
  name: 'security-audit',
  description: 'Run security audit and fix vulnerabilities',
  schedule: '0 0 1 * *',  // Monthly on 1st at midnight

  async run(context) {
    const { withGitVan, useReceipt, useEvent } = await import('gitvan');

    await withGitVan(context, async () => {
      const receipt = useReceipt();
      const event = useEvent();

      console.log('Running security audit...');

      try {
        // 1. Run npm audit
        const auditOutput = execSync('npm audit --json', {
          encoding: 'utf8'
        });
        const audit = JSON.parse(auditOutput);

        console.log(`Vulnerabilities found:`);
        console.log(`  High: ${audit.metadata.vulnerabilities.high}`);
        console.log(`  Moderate: ${audit.metadata.vulnerabilities.moderate}`);
        console.log(`  Low: ${audit.metadata.vulnerabilities.low}`);

        // 2. Auto-fix if possible
        if (audit.metadata.vulnerabilities.total > 0) {
          console.log('Attempting auto-fix...');
          execSync('npm audit fix', { stdio: 'inherit' });

          // Check if fixes were applied
          const postFixAudit = JSON.parse(
            execSync('npm audit --json', { encoding: 'utf8' })
          );

          const fixed =
            audit.metadata.vulnerabilities.total -
            postFixAudit.metadata.vulnerabilities.total;

          console.log(`Fixed ${fixed} vulnerabilities`);
        }

        // 3. Record audit results
        await receipt.write({
          action: 'security:audit',
          vulnerabilities: audit.metadata.vulnerabilities,
          timestamp: new Date().toISOString()
        });

        // 4. Emit event if high-severity issues found
        if (audit.metadata.vulnerabilities.high > 0) {
          await event.emit('security:alert', {
            severity: 'high',
            count: audit.metadata.vulnerabilities.high,
            details: audit.advisories
          });
        }

        return {
          status: 'success',
          vulnerabilities: audit.metadata.vulnerabilities,
          fixed: audit.metadata.vulnerabilities.total
        };
      } catch (error) {
        console.error('Security audit failed:', error);

        await receipt.write({
          action: 'security:audit',
          status: 'failure',
          error: error.message,
          timestamp: new Date().toISOString()
        });

        throw error;
      }
    });
  }
};
```

## Job Management

### Schedule Jobs Programmatically

```javascript
import { withGitVan, useJob } from 'gitvan';

const context = {
  repo: process.cwd(),
  config: {}
};

await withGitVan(context, async () => {
  const job = useJob();

  // Schedule jobs
  await job.schedule('cleanup', {
    cron: '0 0 * * *',  // Daily at midnight
    timezone: 'UTC'
  });

  await job.schedule('sync', {
    cron: '0 * * * *',  // Every hour
    timezone: 'UTC'
  });

  await job.schedule('update-deps', {
    cron: '0 0 * * 0',  // Weekly on Sunday
    timezone: 'UTC'
  });

  await job.schedule('security-audit', {
    cron: '0 0 1 * *',  // Monthly on 1st
    timezone: 'UTC'
  });

  console.log('✓ All jobs scheduled');
});
```

### Run Jobs Manually

```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan(context, async () => {
  const job = useJob();

  // Execute job immediately
  const result = await job.execute('cleanup', {
    timeout: 60000  // 1 minute timeout
  });

  console.log('Job completed:', result.status);
  console.log('Files removed:', result.filesRemoved);
});
```

### List Active Jobs

```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan(context, async () => {
  const job = useJob();

  const jobs = await job.list();

  console.log('Active jobs:');
  jobs.forEach(j => {
    console.log(`  ${j.name}: ${j.schedule}`);
    console.log(`    Last run: ${j.lastRun}`);
    console.log(`    Status: ${j.status}`);
  });
});
```

### Cancel Scheduled Job

```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan(context, async () => {
  const job = useJob();

  // Get job by name
  const jobs = await job.list();
  const cleanupJob = jobs.find(j => j.name === 'cleanup');

  // Cancel job
  if (cleanupJob) {
    await job.cancel(cleanupJob.id);
    console.log('Job cancelled');
  }
});
```

## CLI Job Management

```bash
# List all jobs
gitvan job list

# Run job manually
gitvan job run cleanup

# Schedule job
gitvan job schedule cleanup --cron "0 0 * * *"

# Cancel job
gitvan job cancel <job-id>

# View job logs
gitvan daemon logs --filter job:cleanup
```

## Advanced Job Patterns

### Job with Parameters

```javascript
export default {
  name: 'backup',
  description: 'Backup repository to remote storage',

  async run(context, params) {
    const { destination, compress = true } = params;

    console.log(`Backing up to ${destination}`);

    if (compress) {
      // Create compressed backup
    } else {
      // Create uncompressed backup
    }

    return { status: 'success', size: backupSize };
  }
};
```

Execute with parameters:

```javascript
await job.execute('backup', {
  data: {
    destination: 's3://my-bucket/backups',
    compress: true
  }
});
```

### Job with Retry Logic

```javascript
export default {
  name: 'flaky-api-call',
  description: 'API call with retry logic',

  retry: {
    times: 3,
    delay: 5000,  // 5 seconds
    backoff: 'exponential'
  },

  async run(context) {
    // Job logic that might fail
    const response = await fetch('https://api.example.com/data');

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return await response.json();
  }
};
```

### Job with Dependencies

```javascript
export default {
  name: 'deploy',
  description: 'Deploy application',

  // Run after these jobs complete
  dependsOn: ['build', 'test'],

  async run(context) {
    // Deployment logic
    console.log('Deploying application...');

    return { status: 'success', deployedAt: new Date().toISOString() };
  }
};
```

### Job with Timeout

```javascript
export default {
  name: 'long-running-task',
  description: 'Task with timeout',

  timeout: 300000,  // 5 minutes

  async run(context) {
    // Long-running operation
    await performLongOperation();

    return { status: 'success' };
  }
};
```

### Job with Error Handling

```javascript
export default {
  name: 'resilient-job',
  description: 'Job with error handling',

  async run(context) {
    try {
      await performTask();
      return { status: 'success' };
    } catch (error) {
      console.error('Job failed:', error);

      // Send notification
      await sendNotification({
        type: 'error',
        job: 'resilient-job',
        error: error.message
      });

      // Log to audit trail
      const { useReceipt } = await import('gitvan');
      const receipt = useReceipt();
      await receipt.write({
        action: 'job:error',
        job: 'resilient-job',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;  // Re-throw to mark job as failed
    }
  }
};
```

## Monitoring Jobs

### Job Status Dashboard

Create `job-dashboard.mjs`:

```javascript
import { withGitVan, useJob, useReceipt } from 'gitvan';

const context = { repo: process.cwd(), config: {} };

await withGitVan(context, async () => {
  const job = useJob();
  const receipt = useReceipt();

  console.log('Job Dashboard');
  console.log('=============\n');

  // List all jobs
  const jobs = await job.list();

  for (const j of jobs) {
    console.log(`${j.name}:`);
    console.log(`  Schedule: ${j.schedule}`);
    console.log(`  Status: ${j.status}`);
    console.log(`  Last run: ${j.lastRun || 'Never'}`);
    console.log(`  Next run: ${j.nextRun || 'N/A'}`);

    // Get job history from audit trail
    const history = await receipt.read({
      action: `job:${j.name}`,
      limit: 5
    });

    if (history.length > 0) {
      console.log(`  Recent executions:`);
      history.forEach(h => {
        console.log(`    - ${h.timestamp}: ${h.status}`);
      });
    }

    console.log();
  }
});
```

### Job Performance Metrics

```javascript
import { withGitVan, useReceipt } from 'gitvan';

await withGitVan(context, async () => {
  const receipt = useReceipt();

  const records = await receipt.read({
    action: 'job:cleanup',
    limit: 100
  });

  const durations = records.map(r => r.metadata?.duration || 0);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

  const successCount = records.filter(r => r.status === 'success').length;
  const successRate = (successCount / records.length) * 100;

  console.log('Cleanup Job Metrics:');
  console.log(`  Average duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Success rate: ${successRate.toFixed(2)}%`);
  console.log(`  Total executions: ${records.length}`);
});
```

## Cron Expression Reference

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday=0)
│ │ │ │ │
* * * * *
```

Common patterns:
- `0 * * * *` - Every hour
- `0 0 * * *` - Daily at midnight
- `0 0 * * 0` - Weekly on Sunday
- `0 0 1 * *` - Monthly on 1st
- `*/15 * * * *` - Every 15 minutes
- `0 9-17 * * 1-5` - Every hour 9am-5pm, Mon-Fri

## Best Practices

### 1. Keep Jobs Focused

Each job should do one thing well:

```javascript
// Good - focused job
export default {
  name: 'cleanup-temp-files',
  async run(context) {
    // Only clean temp files
  }
};

// Bad - does too much
export default {
  name: 'maintenance',
  async run(context) {
    // Cleans, syncs, updates, audits...
  }
};
```

### 2. Use Appropriate Timeouts

```javascript
export default {
  name: 'quick-check',
  timeout: 10000,  // 10 seconds for quick tasks
  async run(context) { }
};

export default {
  name: 'heavy-processing',
  timeout: 600000,  // 10 minutes for heavy tasks
  async run(context) { }
};
```

### 3. Add Retry Logic for Flaky Operations

```javascript
export default {
  name: 'external-api-call',
  retry: {
    times: 3,
    delay: 5000,
    backoff: 'exponential'
  },
  async run(context) { }
};
```

### 4. Record Job Execution in Audit Trail

```javascript
const receipt = useReceipt();

await receipt.write({
  action: 'job:execute',
  job: 'my-job',
  status: 'success',
  duration: 1234,
  timestamp: new Date().toISOString()
});
```

### 5. Use Environment-Specific Schedules

```javascript
export default {
  name: 'deploy',
  schedule:
    process.env.NODE_ENV === 'production'
      ? '0 2 * * *'  // 2am in production
      : '*/5 * * * *',  // Every 5 min in dev
  async run(context) { }
};
```

## Next Steps

- [Example 5: Error Handling](./05-error-handling.md)
- [Production Deployment Guide](../PRODUCTION.md)

---

**Key Takeaways:**

1. Jobs are defined as ES modules in the jobs directory
2. Use cron syntax for scheduling
3. Jobs run within GitVan context
4. Add retry logic for reliability
5. Monitor job execution via audit trail
