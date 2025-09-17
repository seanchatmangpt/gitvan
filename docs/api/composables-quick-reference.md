# GitVan v2 Composables Quick Reference

## Core Composables

### useGit
```javascript
const git = useGit();
await git.head()                    // Get HEAD commit
await git.getCurrentBranch()        // Get current branch
await git.isClean()                 // Check if clean
await git.info()                    // Get repo info
await git.listRefs()                // List Git refs
await git.listWorktrees()           // List worktrees
await git.repoRoot()                // Get repo root
```

### useWorktree
```javascript
const worktree = useWorktree();
await worktree.list()               // List worktrees
await worktree.add(name, branch)    // Add worktree
await worktree.remove(name)         // Remove worktree
await worktree.prune()              // Prune stale
await worktree.getPath(name)        // Get path
await worktree.getBranch(name)      // Get branch
```

### useTemplate
```javascript
const template = useTemplate({ paths: ['templates'] });
await template.render('file.njk', data)           // Render file
await template.renderString('{{ name }}', data)   // Render string
await template.parseFrontmatter('file.md')        // Parse frontmatter
await template.plan('template.njk', data)         // Create plan
await template.apply(plan)                        // Apply plan
```

## Job & Event Composables

### useJob
```javascript
const job = useJob();
await job.list()                    // List jobs
await job.get('job-id')            // Get job
await job.run('job-id', payload)   // Run job
await job.runWithLock('job-id', payload)  // Run with lock
await job.validate('job-id')       // Validate job
await job.getStats()               // Get stats
await job.getFingerprint('job-id') // Get fingerprint
job.unroute('cron/backup')         // Unroute name
job.getDirectory('cron/backup')    // Get directory
job.isInDirectory('cron/backup', 'cron')  // Check directory
```

### useEvent
```javascript
const event = useEvent();
await event.list()                 // List events
await event.get('event-id')        // Get event
await event.register('id', def)    // Register event
await event.unregister('id')       // Unregister event
await event.trigger('id', ctx)     // Trigger event
await event.simulate('id', ctx)    // Simulate event
await event.getStats()             // Get stats
event.unroute('cron/0_3_*_*_*')    // Unroute name
event.unrouteCron('cron/0_3_*_*_*') // Unroute cron
event.unrouteBranch('merge-to/main') // Unroute branch
event.getCategory('cron/daily')    // Get category
```

### useSchedule
```javascript
const schedule = useSchedule();
await schedule.list()              // List schedules
await schedule.get('id')          // Get schedule
await schedule.add('id', cron, jobId)  // Add schedule
await schedule.update('id', updates)    // Update schedule
await schedule.remove('id')        // Remove schedule
await schedule.run('id')           // Run schedule
await schedule.nextRun('id')       // Get next run
await schedule.startScheduler()    // Start scheduler
await schedule.stopScheduler()     // Stop scheduler
```

## Infrastructure Composables

### useReceipt
```javascript
const receipt = useReceipt();
await receipt.list()               // List receipts
await receipt.get('id')           // Get receipt
await receipt.create(data)         // Create receipt
await receipt.verify('id')         // Verify receipt
await receipt.exists('id')         // Check exists
await receipt.getStats()           // Get stats
receipt.generateFingerprint(data)  // Generate fingerprint
```

### useLock
```javascript
const lock = useLock();
await lock.list()                 // List locks
await lock.acquire('name', opts)   // Acquire lock
await lock.release('name')         // Release lock
await lock.isLocked('name')        // Check locked
await lock.getInfo('name')         // Get lock info
lock.getLockRef('name', gitInfo)   // Get lock ref
```

### useRegistry
```javascript
const registry = useRegistry();
await registry.getStats()         // Get stats
await registry.search('query')    // Search
await registry.filter(criteria)   // Filter
await registry.validate()         // Validate
await registry.isValid('id')      // Check valid
await registry.refresh()          // Refresh cache
```

## Common Patterns

### Job + Lock + Receipt
```javascript
const lockResult = await lock.acquire('critical');
if (lockResult.acquired) {
  try {
    const result = await job.run('critical-job');
    await receipt.create({ jobId: 'critical-job', status: 'success' });
  } finally {
    await lock.release('critical');
  }
}
```

### Event + Job + Schedule
```javascript
await schedule.add('daily', '0 3 * * *', 'backup-job');
await event.register('backup-done', { job: 'notify-job' });
const result = await job.run('backup-job');
if (result.success) {
  await event.trigger('backup-done', { result });
}
```

### Template + Job + Event
```javascript
const { data } = await template.parseFrontmatter('job.md');
const plan = await template.plan('job.njk', data);
const applied = await template.apply(plan);
await event.register('job-ready', { job: applied.jobId });
await event.trigger('job-ready');
```

### Git + Worktree + Job
```javascript
const worktree = await worktree.add('feature', 'feature/new');
const result = await job.run('test-job', { worktree: worktree.path });
await worktree.remove('feature');
```

## Unrouting Examples

### Job Unrouting
```javascript
job.unroute('cron/daily-backup')           // 'daily-backup'
job.getDirectory('cron/daily-backup')      // 'cron'
job.isInDirectory('cron/daily-backup', 'cron')  // true
```

### Event Unrouting
```javascript
event.unroute('cron/0_3_*_*_*')           // '0_3_*_*_*'
event.unrouteCron('cron/0_3_*_*_*')        // '0 3 * * *'
event.unrouteBranch('merge-to/main')       // 'main'
event.unroutePath('path-changed/src/**')   // 'src/**'
event.getCategory('cron/daily')            // 'cron'
```

## Error Handling
```javascript
try {
  const result = await job.run('my-job');
  await receipt.create({ jobId: 'my-job', status: 'success' });
} catch (error) {
  await receipt.create({ 
    jobId: 'my-job', 
    status: 'error', 
    error: { message: error.message } 
  });
  throw error;
}
```

## Context Usage
```javascript
import { withGitVan } from './src/core/context.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const job = useJob();
  const result = await job.run('my-job');
});
```
