# Job System Integration Examples

GitVan v4.0.0 - Bree Integration

## Table of Contents

- [Example 1: Schedule a Cron Job](#example-1-schedule-a-cron-job)
- [Example 2: Run a Job with Payload](#example-2-run-a-job-with-payload)
- [Example 3: Chain Multiple Jobs with Receipts](#example-3-chain-multiple-jobs-with-receipts)
- [Example 4: Monitor Job Execution Status](#example-4-monitor-job-execution-status)
- [Example 5: Implement Custom Job Types](#example-5-implement-custom-job-types)
- [Example 6: Error Handling and Recovery](#example-6-error-handling-and-recovery)
- [Example 7: Integration with Git Workflows](#example-7-integration-with-git-workflows)
- [Example 8: Monitoring and Metrics](#example-8-monitoring-and-metrics)

---

## Example 1: Schedule a Cron Job

**Scenario:** Run a database backup every day at 2 AM

**Job Definition:** `jobs/db-backup.mjs`
```javascript
export const meta = {
  name: 'Database Backup',
  desc: 'Daily database backup',
  tags: ['backup', 'database', 'maintenance']
};

export const cron = '0 2 * * *';  // 2 AM daily

export default async function run({ ctx }) {
  const timestamp = new Date().toISOString();
  const backupFile = `/backups/db-${timestamp}.sql`;

  console.log('Starting database backup...');

  // Backup database
  await backupDatabase(backupFile);

  return {
    success: true,
    file: backupFile,
    timestamp
  };
}

async function backupDatabase(file) {
  // Implementation
}
```

**Scheduler Setup:** `scheduler.mjs`
```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const job = useJob();

  // Auto-schedule all cron jobs
  const results = await job.autoScheduleCronJobs();
  console.log('Scheduled:', results.filter(r => r.scheduled).length);

  // Start scheduler
  await job.startScheduler();
  console.log('Scheduler running');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await job.shutdownScheduler();
    process.exit(0);
  });
});
```

---

## Example 2: Run a Job with Payload

**Scenario:** Send email notification with custom data

**Job Definition:** `jobs/send-email.mjs`
```javascript
import { z } from 'zod';

const payloadSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  attachments: z.array(z.string()).optional()
});

export const meta = {
  name: 'Send Email',
  desc: 'Send email notification'
};

export default async function run({ payload }) {
  // Validate payload
  const { to, subject, body, attachments } = payloadSchema.parse(payload);

  // Send email
  await sendEmail({ to, subject, body, attachments });

  return {
    success: true,
    to,
    subject,
    sent: new Date().toISOString()
  };
}

async function sendEmail(options) {
  // Email implementation
}
```

**Usage:**
```javascript
const job = useJob();

await job.run('send-email', {
  payload: {
    to: 'user@example.com',
    subject: 'Backup Complete',
    body: 'Database backup completed successfully',
    attachments: ['/backups/db-2026-01-08.sql']
  }
});
```

---

## Example 3: Chain Multiple Jobs with Receipts

**Scenario:** Backup → Compress → Upload → Notify

**Job 1:** `jobs/backup-db.mjs`
```javascript
export default async function run() {
  const file = '/backups/db.sql';
  await backupDatabase(file);

  return { file };
}
```

**Job 2:** `jobs/compress-backup.mjs`
```javascript
export default async function run({ payload }) {
  const { file } = payload;
  const compressed = `${file}.gz`;

  await compressFile(file, compressed);

  return { compressed };
}
```

**Job 3:** `jobs/upload-backup.mjs`
```javascript
export default async function run({ payload }) {
  const { compressed } = payload;
  const url = await uploadToS3(compressed);

  return { url };
}
```

**Job 4:** `jobs/notify-complete.mjs`
```javascript
export default async function run({ payload }) {
  const { url } = payload;
  await sendNotification(`Backup uploaded: ${url}`);

  return { success: true };
}
```

**Orchestrator:** `jobs/backup-workflow.mjs`
```javascript
import { withGitVan, useJob, useReceipt } from 'gitvan';

export const meta = {
  name: 'Backup Workflow',
  desc: 'Complete backup workflow'
};

export const cron = '0 2 * * *';  // 2 AM daily

export default async function run() {
  const job = useJob();
  const receipt = useReceipt();

  // Step 1: Backup
  const backupResult = await job.run('backup-db');
  const backupReceipt = (await receipt.list({ jobId: 'backup-db', limit: 1 }))[0];

  if (backupResult.status === 'error') {
    throw new Error('Backup failed');
  }

  // Step 2: Compress (use result from step 1)
  const compressResult = await job.run('compress-backup', {
    payload: { file: backupResult.file }
  });

  if (compressResult.status === 'error') {
    throw new Error('Compression failed');
  }

  // Step 3: Upload
  const uploadResult = await job.run('upload-backup', {
    payload: { compressed: compressResult.compressed }
  });

  if (uploadResult.status === 'error') {
    throw new Error('Upload failed');
  }

  // Step 4: Notify
  await job.run('notify-complete', {
    payload: { url: uploadResult.url }
  });

  return {
    success: true,
    backupFile: backupResult.file,
    compressedFile: compressResult.compressed,
    uploadUrl: uploadResult.url
  };
}
```

---

## Example 4: Monitor Job Execution Status

**Job:** `jobs/monitor.mjs`
```javascript
export const cron = '*/5 * * * *';  // Every 5 minutes

export default async function run() {
  const job = useJob();
  const receipt = useReceipt();

  // Get all jobs
  const jobs = await job.list();

  // Check status of each
  const statusReport = [];

  for (const j of jobs) {
    const status = await job.status(j.id);
    const history = await receipt.list({ jobId: j.id, limit: 10 });

    statusReport.push({
      jobId: j.id,
      name: j.name,
      isRunning: status.isRunning,
      lastRun: status.lastRun,
      successRate: status.successRate,
      recentRuns: history.length
    });
  }

  // Alert on failures
  const critical = statusReport.filter(s => s.successRate < 90);
  if (critical.length > 0) {
    await alertOnCall({
      message: `${critical.length} jobs below 90% success rate`,
      jobs: critical
    });
  }

  return { statusReport, criticalJobs: critical.length };
}
```

---

## Example 5: Implement Custom Job Types

**Base Job Class:**
```javascript
// lib/BaseJob.mjs
export class BaseJob {
  constructor(meta) {
    this.meta = meta;
  }

  async preRun(ctx) {
    console.log(`[${this.meta.name}] Starting...`);
  }

  async postRun(ctx, result) {
    console.log(`[${this.meta.name}] Completed`);
  }

  async run(ctx) {
    throw new Error('Must implement run()');
  }
}
```

**Custom Job Type:** `jobs/custom-report.mjs`
```javascript
import { BaseJob } from '../lib/BaseJob.mjs';

class ReportJob extends BaseJob {
  async run({ payload }) {
    const data = await this.fetchData(payload.source);
    const report = await this.generateReport(data);
    await this.sendReport(report);

    return { report };
  }

  async fetchData(source) {
    // Implementation
  }

  async generateReport(data) {
    // Implementation
  }

  async sendReport(report) {
    // Implementation
  }
}

export const meta = {
  name: 'Custom Report Job',
  desc: 'Generate and send reports'
};

export const cron = '0 9 * * 1';  // Monday 9 AM

const reportJob = new ReportJob(meta);

export default async function run(ctx) {
  await reportJob.preRun(ctx);
  const result = await reportJob.run(ctx);
  await reportJob.postRun(ctx, result);
  return result;
}
```

---

## Example 6: Error Handling and Recovery

**Job with Retry Logic:** `jobs/api-sync.mjs`
```javascript
export const meta = {
  name: 'API Sync',
  desc: 'Sync data with external API'
};

export default async function run({ payload }) {
  const maxRetries = 3;
  const retryDelay = 5000;  // 5 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await syncWithAPI(payload);

      return {
        success: true,
        result,
        attempts: attempt
      };
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        // Final attempt failed
        throw new Error(`API sync failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

async function syncWithAPI(payload) {
  // API call that might fail
}
```

**Recovery Job:** `jobs/recovery.mjs`
```javascript
export const cron = '*/30 * * * *';  // Every 30 minutes

export default async function run() {
  const job = useJob();
  const receipt = useReceipt();

  // Find recent failures
  const failures = await receipt.list({
    status: 'error',
    since: new Date(Date.now() - 30 * 60 * 1000),  // Last 30 min
    limit: 100
  });

  const recovered = [];

  for (const failure of failures) {
    // Retry failed job
    try {
      await job.run(failure.jobId, {
        payload: failure.payload
      });

      recovered.push(failure.jobId);
    } catch (error) {
      console.error(`Recovery failed for ${failure.jobId}:`, error);
    }
  }

  return {
    attemptedRecovery: failures.length,
    recovered: recovered.length,
    jobs: recovered
  };
}
```

---

## Example 7: Integration with Git Workflows

**Git Hook Integration:** `hooks/post-commit`
```bash
#!/bin/sh
# Trigger job on commit

node -e "
import { withGitVan, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const job = useJob();

  // Run tests on commit
  await job.run('run-tests');

  // Update changelog
  await job.run('update-changelog');
});
"
```

**Job Triggered by Git Events:** `jobs/on-commit.mjs`
```javascript
export const meta = {
  name: 'On Commit Handler',
  desc: 'Runs on every commit'
};

export default async function run({ ctx }) {
  const { git } = ctx;

  console.log('Commit:', git.head);
  console.log('Branch:', git.branch);

  // Run linter
  await runLinter();

  // Run tests
  const testResults = await runTests();

  // Create Git note with results
  await git.addNote({
    ref: 'refs/notes/test-results',
    oid: git.head,
    note: JSON.stringify(testResults)
  });

  return { testResults };
}
```

---

## Example 8: Monitoring and Metrics

**Metrics Collection Job:** `jobs/collect-metrics.mjs`
```javascript
export const cron = '* * * * *';  // Every minute

export default async function run() {
  const job = useJob();
  const receipt = useReceipt();
  const lock = useLock();

  // Collect metrics
  const metrics = {
    timestamp: new Date().toISOString(),

    // Scheduler
    scheduler: job.getSchedulerStatus(),

    // Memory
    memory: {
      heapUsed: process.memoryUsage().heapUsed / 1024 / 1024,
      rss: process.memoryUsage().rss / 1024 / 1024
    },

    // Jobs
    jobs: {
      total: (await job.list()).length,
      scheduled: job.listScheduledJobs().length
    },

    // Locks
    locks: {
      active: (await lock.list()).length
    },

    // Receipts
    receipts: await receipt.getStats({ limit: 1000 })
  };

  // Send to monitoring system
  await sendToMonitoring(metrics);

  return metrics;
}

async function sendToMonitoring(metrics) {
  // Send to Prometheus, Datadog, etc.
}
```

**Dashboard:** `jobs/generate-dashboard.mjs`
```javascript
export const cron = '*/5 * * * *';  // Every 5 minutes

export default async function run() {
  const receipt = useReceipt();

  // Last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stats = await receipt.getStats({ since, limit: 10000 });

  const dashboard = {
    period: '24h',
    totalExecutions: stats.total,
    successRate: stats.successRate,
    avgDuration: stats.averageDuration,
    byJob: stats.byJob,
    timeline: stats.timeline,
    generatedAt: new Date().toISOString()
  };

  // Write to file
  await fs.writeFile(
    'dashboard.json',
    JSON.stringify(dashboard, null, 2)
  );

  return dashboard;
}
```

---

## See Also

- [API Reference](api/job-scheduler.md)
- [Quick Start Guide](QUICKSTART-JOBS.md)
- [Architecture Guide](ARCHITECTURE-BREE-INTEGRATION.md)
- [Troubleshooting Guide](TROUBLESHOOTING-JOBS.md)
