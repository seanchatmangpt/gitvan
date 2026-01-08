# Quick Start Guide - Job System

GitVan v4.0.0 - Bree Integration

## Getting Started

This guide will get you up and running with GitVan's job system in 5 minutes.

---

## 1. Create Your First Job

**Create file:** `jobs/hello.mjs`

```javascript
export const meta = {
  name: 'Hello Job',
  desc: 'My first GitVan job'
};

export default async function run({ payload, ctx }) {
  console.log('Hello from GitVan!');
  console.log('Payload:', payload);

  return {
    success: true,
    message: 'Job completed successfully',
    timestamp: new Date().toISOString()
  };
}
```

---

## 2. Run the Job

```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const job = useJob();

  const result = await job.run('hello', {
    payload: { message: 'Hello World!' }
  });

  console.log(result);
});
```

**Output:**
```
Hello from GitVan!
Payload: { message: 'Hello World!' }
{
  success: true,
  message: 'Job completed successfully',
  timestamp: '2026-01-08T10:30:00Z'
}
```

---

## 3. Schedule a Cron Job

**Create file:** `jobs/daily-backup.mjs`

```javascript
export const meta = {
  name: 'Daily Backup',
  desc: 'Backup database daily at 2 AM'
};

export const cron = '0 2 * * *';  // Daily at 2 AM

export default async function run() {
  console.log('Running daily backup...');

  // Your backup logic here
  const backupFile = await backupDatabase();

  return {
    success: true,
    file: backupFile,
    size: '1.2GB'
  };
}

async function backupDatabase() {
  // Backup implementation
  return '/backups/backup-2026-01-08.tar.gz';
}
```

**Schedule it:**
```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const job = useJob();

  // Auto-schedule all cron jobs
  await job.autoScheduleCronJobs();

  // Start scheduler
  await job.startScheduler();

  console.log('Scheduler started!');
});
```

---

## 4. Monitor Job Execution

**Check job status:**
```javascript
const job = useJob();

const status = await job.status('daily-backup');
console.log('Is running:', status.isRunning);
console.log('Last run:', status.lastRun);
console.log('Success rate:', status.successRate + '%');
```

**View history:**
```javascript
const history = await job.history('daily-backup', { limit: 10 });

history.forEach(receipt => {
  console.log(`${receipt.timestamp}: ${receipt.status}`);
});
```

---

## 5. Common Tasks

### List All Jobs

```javascript
const jobs = await job.list();
jobs.forEach(j => {
  console.log(`- ${j.name}: ${j.description}`);
});
```

### Run with Lock (Prevent Concurrent Execution)

```javascript
await job.runWithLock('daily-backup', {
  payload: { target: '/backups' }
});
```

### Get Scheduler Status

```javascript
const status = job.getSchedulerStatus();
console.log('Running:', status.isRunning);
console.log('Scheduled jobs:', status.jobCount);
```

### Graceful Shutdown

```javascript
process.on('SIGTERM', async () => {
  await job.shutdownScheduler();
  process.exit(0);
});
```

---

## Next Steps

- **[API Reference](api/job-scheduler.md)** - Full API documentation
- **[Integration Examples](INTEGRATION-EXAMPLES-JOBS.md)** - More examples
- **[Architecture Guide](ARCHITECTURE-BREE-INTEGRATION.md)** - How it works
- **[Troubleshooting](TROUBLESHOOTING-JOBS.md)** - Common issues

---

## Complete Example App

```javascript
// app.mjs
import { withGitVan, useJob } from 'gitvan';

async function main() {
  await withGitVan({ cwd: process.cwd() }, async () => {
    const job = useJob();

    console.log('=== GitVan Job System Demo ===\n');

    // Discover jobs
    const jobs = await job.list();
    console.log(`Found ${jobs.length} jobs:\n`);
    jobs.forEach(j => console.log(`- ${j.name}: ${j.description}`));

    // Auto-schedule cron jobs
    console.log('\nScheduling cron jobs...');
    await job.autoScheduleCronJobs();

    // Start scheduler
    console.log('Starting scheduler...');
    await job.startScheduler();

    // Check status
    const status = job.getSchedulerStatus();
    console.log(`\nScheduler running: ${status.isRunning}`);
    console.log(`Jobs scheduled: ${status.jobCount}`);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\nShutting down...');
      await job.shutdownScheduler();
      process.exit(0);
    });

    console.log('\nPress Ctrl+C to stop');
  });
}

main().catch(console.error);
```

Run it:
```bash
node app.mjs
```
