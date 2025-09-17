# GitVan v2 Composables Examples

This document provides practical examples of using GitVan v2 composables in various scenarios.

## Table of Contents

- [Basic Job Execution](#basic-job-execution)
- [Event-Driven Workflows](#event-driven-workflows)
- [Scheduled Automation](#scheduled-automation)
- [Multi-Environment Deployment](#multi-environment-deployment)
- [Dynamic Job Generation](#dynamic-job-generation)
- [Audit Trail Management](#audit-trail-management)
- [Distributed Locking](#distributed-locking)
- [Template-Based Workflows](#template-based-workflows)
- [Git Worktree Management](#git-worktree-management)
- [Registry Management](#registry-management)
- [Complete Automation Pipeline](#complete-automation-pipeline)

## Basic Job Execution

### Simple Job Run
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useJob } from './src/composables/job.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const job = useJob();
  
  // List available jobs
  const jobs = await job.list();
  console.log('Available jobs:', jobs.map(j => j.name));
  
  // Execute a job
  const result = await job.run('hello-world', { 
    message: 'Hello from GitVan!' 
  });
  
  console.log('Job result:', result);
});
```

### Job Validation and Statistics
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useJob } from './src/composables/job.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const job = useJob();
  
  // Validate all jobs
  const validations = await job.validateAll();
  const validJobs = validations.filter(v => v.valid);
  const invalidJobs = validations.filter(v => !v.valid);
  
  console.log(`Valid jobs: ${validJobs.length}`);
  console.log(`Invalid jobs: ${invalidJobs.length}`);
  
  // Get job statistics
  const stats = await job.getStats();
  console.log('Job stats:', stats);
  
  // Get job fingerprint for change detection
  const fingerprint = await job.getFingerprint('my-job');
  console.log('Job fingerprint:', fingerprint);
});
```

## Event-Driven Workflows

### Event Registration and Triggering
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useEvent, useJob } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const event = useEvent();
  const job = useJob();
  
  // Register custom events
  await event.register('deploy-started', {
    name: 'Deploy Started',
    description: 'Triggered when deployment begins',
    type: 'custom',
    job: 'notify-deploy-started'
  });
  
  await event.register('deploy-completed', {
    name: 'Deploy Completed',
    description: 'Triggered when deployment finishes',
    type: 'custom',
    job: 'notify-deploy-completed'
  });
  
  // Trigger events
  await event.trigger('deploy-started', { 
    environment: 'production',
    version: 'v1.2.3'
  });
  
  // Simulate event to test conditions
  const simulation = await event.simulate('deploy-completed', {
    success: true,
    duration: 120000
  });
  
  console.log('Event simulation:', simulation);
});
```

### Cron Event Handling
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useEvent } from './src/composables/event.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const event = useEvent();
  
  // List cron events
  const cronEvents = await event.getByType('cron');
  console.log('Cron events:', cronEvents);
  
  // Unroute cron expressions
  cronEvents.forEach(evt => {
    const cronExpr = event.unrouteCron(evt.id);
    const category = event.getCategory(evt.id);
    console.log(`${category}: ${cronExpr}`);
  });
  
  // Trigger cron event manually
  await event.trigger('cron/0_3_*_*_*', { 
    timestamp: new Date().toISOString() 
  });
});
```

## Scheduled Automation

### Basic Scheduling
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useSchedule, useJob } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const schedule = useSchedule();
  const job = useJob();
  
  // Add scheduled jobs
  await schedule.add('daily-backup', '0 3 * * *', 'backup-job', {
    description: 'Daily backup at 3 AM',
    payload: { target: 'production' }
  });
  
  await schedule.add('weekly-cleanup', '0 2 * * 0', 'cleanup-job', {
    description: 'Weekly cleanup on Sunday',
    payload: { retention: '7d' }
  });
  
  // List schedules
  const schedules = await schedule.list();
  console.log('Scheduled jobs:', schedules);
  
  // Get next run time
  const nextRun = await schedule.nextRun('daily-backup');
  console.log('Next backup:', nextRun);
  
  // Start the scheduler
  await schedule.startScheduler();
  console.log('Scheduler started');
});
```

### Schedule Management
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useSchedule } from './src/composables/schedule.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const schedule = useSchedule();
  
  // Update schedule
  await schedule.update('daily-backup', {
    cron: '0 4 * * *',  // Change to 4 AM
    enabled: false      // Disable temporarily
  });
  
  // Run schedule manually
  const result = await schedule.run('daily-backup');
  console.log('Manual run result:', result);
  
  // Remove schedule
  await schedule.remove('weekly-cleanup');
  console.log('Schedule removed');
});
```

## Multi-Environment Deployment

### Worktree-Based Deployment
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useGit, useWorktree, useJob } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const git = useGit();
  const worktree = useWorktree();
  const job = useJob();
  
  // Get current repository info
  const repoInfo = await git.info();
  console.log('Repository info:', repoInfo);
  
  // Create worktree for staging
  const stagingWorktree = await worktree.add('staging', 'staging');
  console.log('Staging worktree:', stagingWorktree);
  
  // Deploy to staging
  const stagingResult = await job.run('deploy-job', {
    environment: 'staging',
    worktree: stagingWorktree.path
  });
  
  if (stagingResult.success) {
    // Create worktree for production
    const prodWorktree = await worktree.add('production', 'main');
    
    // Deploy to production
    const prodResult = await job.run('deploy-job', {
      environment: 'production',
      worktree: prodWorktree.path
    });
    
    // Clean up worktrees
    await worktree.remove('staging');
    await worktree.remove('production');
    
    console.log('Deployment complete:', prodResult);
  }
});
```

### Branch-Based Workflows
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useGit, useEvent, useJob } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const git = useGit();
  const event = useEvent();
  const job = useJob();
  
  // Get current branch
  const currentBranch = await git.getCurrentBranch();
  console.log('Current branch:', currentBranch);
  
  // Handle branch-specific events
  if (currentBranch === 'main') {
    await event.trigger('merge-to/main', { 
      branch: currentBranch,
      timestamp: new Date().toISOString()
    });
  } else if (currentBranch.startsWith('feature/')) {
    await event.trigger('push-to/feature/*', {
      branch: currentBranch,
      feature: currentBranch.replace('feature/', '')
    });
  }
  
  // Run branch-specific jobs
  const branchJobs = await job.getByDirectory(currentBranch);
  for (const branchJob of branchJobs) {
    await job.run(branchJob.id, { branch: currentBranch });
  }
});
```

## Dynamic Job Generation

### Template-Based Job Creation
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useTemplate, useJob, useEvent } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const template = useTemplate({ paths: ['templates'] });
  const job = useJob();
  const event = useEvent();
  
  // Parse job template with frontmatter
  const jobTemplate = await template.parseFrontmatter('dynamic-job.md');
  console.log('Job template data:', jobTemplate.data);
  
  // Create execution plan
  const plan = await template.plan('dynamic-job.njk', jobTemplate.data);
  console.log('Execution plan:', plan);
  
  // Apply the plan
  const applied = await template.apply(plan);
  console.log('Applied changes:', applied);
  
  // Register event for the generated job
  await event.register('dynamic-job-ready', {
    name: 'Dynamic Job Ready',
    description: 'Triggered when dynamic job is generated',
    type: 'custom',
    job: applied.jobId
  });
  
  // Execute the generated job
  const result = await job.run(applied.jobId, jobTemplate.data);
  
  // Trigger completion event
  await event.trigger('dynamic-job-ready', { result });
});
```

### Conditional Job Generation
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useTemplate, useJob, useEvent } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const template = useTemplate({ paths: ['templates'] });
  const job = useJob();
  const event = useEvent();
  
  // Generate jobs based on conditions
  const environments = ['staging', 'production'];
  
  for (const env of environments) {
    const envData = {
      environment: env,
      timestamp: new Date().toISOString(),
      config: await loadConfig(env)
    };
    
    // Create environment-specific job
    const plan = await template.plan('env-job.njk', envData);
    const applied = await template.apply(plan);
    
    // Register environment event
    await event.register(`${env}-deploy-ready`, {
      name: `${env} Deploy Ready`,
      type: 'custom',
      job: applied.jobId
    });
    
    // Execute job
    await job.run(applied.jobId, envData);
    await event.trigger(`${env}-deploy-ready`, { environment: env });
  }
});
```

## Audit Trail Management

### Comprehensive Receipt Tracking
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useReceipt, useJob, useEvent } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const receipt = useReceipt();
  const job = useJob();
  const event = useEvent();
  
  // Create receipt for job execution
  const jobResult = await job.run('important-job', { data: 'critical' });
  
  const jobReceipt = await receipt.create({
    jobId: 'important-job',
    status: jobResult.success ? 'success' : 'error',
    artifacts: jobResult.artifacts,
    meta: {
      duration: jobResult.duration,
      environment: 'production',
      user: 'automation'
    },
    error: jobResult.error
  });
  
  console.log('Job receipt:', jobReceipt);
  
  // Create receipt for event triggering
  const eventResult = await event.trigger('job-completed', { 
    jobId: 'important-job',
    result: jobResult
  });
  
  const eventReceipt = await receipt.create({
    eventId: 'job-completed',
    status: 'success',
    meta: {
      triggeredBy: 'important-job',
      timestamp: new Date().toISOString()
    }
  });
  
  // Get receipt statistics
  const stats = await receipt.getStats();
  console.log('Receipt stats:', stats);
  
  // Verify receipt integrity
  const verification = await receipt.verify(jobReceipt.id);
  console.log('Receipt verification:', verification);
});
```

### Receipt Analysis and Reporting
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useReceipt } from './src/composables/receipt.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const receipt = useReceipt();
  
  // Get recent receipts
  const recentReceipts = await receipt.list({ limit: 50 });
  
  // Analyze by job
  const jobStats = {};
  recentReceipts.forEach(r => {
    if (r.jobId) {
      jobStats[r.jobId] = (jobStats[r.jobId] || 0) + 1;
    }
  });
  
  console.log('Job execution counts:', jobStats);
  
  // Analyze success rates
  const successRate = recentReceipts.filter(r => r.status === 'success').length / recentReceipts.length;
  console.log('Success rate:', Math.round(successRate * 100) + '%');
  
  // Get timeline analysis
  const timeline = await receipt.getStats({ limit: 100 });
  console.log('Timeline:', timeline.timeline);
});
```

## Distributed Locking

### Critical Section Protection
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useLock, useJob, useReceipt } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const lock = useLock();
  const job = useJob();
  const receipt = useReceipt();
  
  // Acquire lock for critical operation
  const lockResult = await lock.acquire('database-migration', {
    timeout: 300000, // 5 minutes
    metadata: {
      operation: 'migration',
      version: 'v2.0.0'
    }
  });
  
  if (lockResult.acquired) {
    try {
      console.log('Lock acquired, starting migration');
      
      // Execute critical job
      const result = await job.run('database-migration', {
        version: 'v2.0.0',
        backup: true
      });
      
      // Create receipt
      await receipt.create({
        jobId: 'database-migration',
        status: result.success ? 'success' : 'error',
        artifacts: result.artifacts,
        meta: {
          locked: true,
          lockId: lockResult.id,
          version: 'v2.0.0'
        }
      });
      
      console.log('Migration completed:', result);
      
    } finally {
      // Always release the lock
      await lock.release('database-migration');
      console.log('Lock released');
    }
  } else {
    console.log('Failed to acquire lock:', lockResult.reason);
  }
});
```

### Lock Status Monitoring
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useLock } from './src/composables/lock.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const lock = useLock();
  
  // List all locks
  const locks = await lock.list();
  console.log('Active locks:', locks);
  
  // Check specific lock status
  const isLocked = await lock.isLocked('database-migration');
  console.log('Database migration locked:', isLocked);
  
  if (isLocked) {
    const lockInfo = await lock.getInfo('database-migration');
    console.log('Lock info:', lockInfo);
  }
});
```

## Template-Based Workflows

### Frontmatter Processing
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useTemplate } from './src/composables/template.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const template = useTemplate({ paths: ['templates'] });
  
  // Process multiple files with frontmatter
  const files = ['config.md', 'deployment.md', 'monitoring.md'];
  
  for (const file of files) {
    const { data, body } = await template.parseFrontmatter(file);
    
    console.log(`Processing ${file}:`);
    console.log('Data:', data);
    console.log('Body:', body);
    
    // Apply frontmatter operations
    if (data.to) {
      const plan = await template.plan('file-template.njk', data);
      const applied = await template.apply(plan);
      console.log(`Applied to ${data.to}:`, applied);
    }
  }
});
```

### Conditional Template Rendering
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useTemplate } from './src/composables/template.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const template = useTemplate({ paths: ['templates'] });
  
  // Render template with conditional logic
  const data = {
    environment: 'production',
    features: ['auth', 'payments', 'notifications'],
    debug: false
  };
  
  const result = await template.render('config.njk', data);
  console.log('Generated config:', result);
  
  // Render string template
  const stringResult = await template.renderString(`
    {% if environment == 'production' %}
    Production configuration
    {% else %}
    Development configuration
    {% endif %}
    
    Features: {{ features | join(', ') }}
  `, data);
  
  console.log('String result:', stringResult);
});
```

## Git Worktree Management

### Multi-Branch Development
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useWorktree, useJob } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const worktree = useWorktree();
  const job = useJob();
  
  // List existing worktrees
  const worktrees = await worktree.list();
  console.log('Existing worktrees:', worktrees);
  
  // Create worktrees for different features
  const features = ['feature/auth', 'feature/payments', 'feature/ui'];
  
  for (const feature of features) {
    const worktreeInfo = await worktree.add(feature, feature);
    console.log(`Created worktree for ${feature}:`, worktreeInfo);
    
    // Run tests in the worktree
    const testResult = await job.run('test-suite', {
      worktree: worktreeInfo.path,
      feature: feature
    });
    
    console.log(`Test result for ${feature}:`, testResult);
  }
  
  // Clean up worktrees
  for (const feature of features) {
    await worktree.remove(feature);
    console.log(`Removed worktree for ${feature}`);
  }
});
```

### Worktree Pruning
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useWorktree } from './src/composables/worktree.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const worktree = useWorktree();
  
  // List worktrees before pruning
  const beforePrune = await worktree.list();
  console.log('Worktrees before prune:', beforePrune);
  
  // Prune stale worktrees
  const pruned = await worktree.prune();
  console.log('Pruned worktrees:', pruned);
  
  // List worktrees after pruning
  const afterPrune = await worktree.list();
  console.log('Worktrees after prune:', afterPrune);
});
```

## Registry Management

### Registry Search and Filtering
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useRegistry } from './src/composables/registry.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const registry = useRegistry();
  
  // Get registry statistics
  const stats = await registry.getStats();
  console.log('Registry stats:', stats);
  
  // Search registry
  const searchResults = await registry.search('backup');
  console.log('Search results for "backup":', searchResults);
  
  // Filter by type and tags
  const cronJobs = await registry.filter({ 
    type: 'job', 
    tag: 'cron' 
  });
  console.log('Cron jobs:', cronJobs);
  
  const customEvents = await registry.filter({ 
    type: 'event', 
    category: 'custom' 
  });
  console.log('Custom events:', customEvents);
  
  // Validate registry
  const validation = await registry.validate();
  console.log('Registry validation:', validation);
});
```

### Registry Maintenance
```javascript
import { withGitVan } from './src/core/context.mjs';
import { useRegistry } from './src/composables/registry.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const registry = useRegistry();
  
  // Refresh registry cache
  await registry.refresh();
  console.log('Registry cache refreshed');
  
  // Check individual entries
  const entries = ['job-1', 'event-1', 'schedule-1'];
  
  for (const entry of entries) {
    const isValid = await registry.isValid(entry);
    console.log(`${entry} is valid:`, isValid);
  }
});
```

## Complete Automation Pipeline

### End-to-End Deployment Pipeline
```javascript
import { withGitVan } from './src/core/context.mjs';
import { 
  useJob, 
  useEvent, 
  useSchedule, 
  useLock, 
  useReceipt,
  useWorktree,
  useTemplate
} from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const job = useJob();
  const event = useEvent();
  const schedule = useSchedule();
  const lock = useLock();
  const receipt = useReceipt();
  const worktree = useWorktree();
  const template = useTemplate({ paths: ['templates'] });
  
  // 1. Setup scheduled deployment
  await schedule.add('daily-deploy', '0 2 * * *', 'deploy-pipeline');
  
  // 2. Register deployment events
  await event.register('deploy-started', {
    name: 'Deploy Started',
    type: 'custom',
    job: 'notify-deploy-started'
  });
  
  await event.register('deploy-completed', {
    name: 'Deploy Completed',
    type: 'custom',
    job: 'notify-deploy-completed'
  });
  
  // 3. Execute deployment pipeline with locking
  const lockResult = await lock.acquire('deployment-pipeline');
  if (lockResult.acquired) {
    try {
      // Start deployment
      await event.trigger('deploy-started');
      
      // Create staging worktree
      const stagingWorktree = await worktree.add('staging', 'staging');
      
      // Deploy to staging
      const stagingResult = await job.run('deploy-job', {
        environment: 'staging',
        worktree: stagingWorktree.path
      });
      
      if (stagingResult.success) {
        // Run tests in staging
        const testResult = await job.run('test-suite', {
          environment: 'staging',
          worktree: stagingWorktree.path
        });
        
        if (testResult.success) {
          // Deploy to production
          const prodResult = await job.run('deploy-job', {
            environment: 'production',
            worktree: stagingWorktree.path
          });
          
          // Complete deployment
          await event.trigger('deploy-completed', { 
            staging: stagingResult,
            tests: testResult,
            production: prodResult
          });
          
          // Create comprehensive receipt
          await receipt.create({
            jobId: 'deploy-pipeline',
            status: 'success',
            artifacts: [
              stagingResult.artifacts,
              testResult.artifacts,
              prodResult.artifacts
            ],
            meta: {
              environments: ['staging', 'production'],
              duration: Date.now() - startTime,
              worktree: stagingWorktree.path
            }
          });
        }
      }
      
      // Clean up worktree
      await worktree.remove('staging');
      
    } finally {
      await lock.release('deployment-pipeline');
    }
  }
  
  console.log('Deployment pipeline completed');
});
```

### Dynamic Workflow Generation
```javascript
import { withGitVan } from './src/core/context.mjs';
import { 
  useTemplate, 
  useJob, 
  useEvent, 
  useSchedule 
} from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const template = useTemplate({ paths: ['templates'] });
  const job = useJob();
  const event = useEvent();
  const schedule = useSchedule();
  
  // Generate workflow from template
  const workflowTemplate = await template.parseFrontmatter('workflow.yaml');
  
  // Process each step in the workflow
  for (const step of workflowTemplate.data.steps) {
    // Generate job for this step
    const jobPlan = await template.plan('step-job.njk', step);
    const jobApplied = await template.apply(jobPlan);
    
    // Register event for step completion
    await event.register(`${step.name}-completed`, {
      name: `${step.name} Completed`,
      type: 'custom',
      job: jobApplied.jobId
    });
    
    // Schedule step if specified
    if (step.schedule) {
      await schedule.add(`${step.name}-schedule`, step.schedule, jobApplied.jobId);
    }
    
    // Execute step
    const stepResult = await job.run(jobApplied.jobId, step.data);
    
    // Trigger completion event
    await event.trigger(`${step.name}-completed`, { result: stepResult });
  }
  
  console.log('Dynamic workflow generated and executed');
});
```

These examples demonstrate the power and flexibility of GitVan v2 composables, showing how they can be combined to create sophisticated automation workflows that are Git-native, auditable, and maintainable.
