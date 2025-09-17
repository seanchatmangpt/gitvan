# GitVan Hooks Reference

This document provides a comprehensive reference for all available hooks in the GitVan plugin system. Each hook includes detailed information about parameters, return values, execution order, and usage patterns.

## Hook Categories

- [Job Lifecycle Hooks](#job-lifecycle-hooks)
- [Daemon Hooks](#daemon-hooks)
- [Event Hooks](#event-hooks)
- [Cron Hooks](#cron-hooks)
- [Storage Hooks](#storage-hooks)
- [Lock Management Hooks](#lock-management-hooks)

## Job Lifecycle Hooks

These hooks are called during job execution and provide access to the complete job context.

### `job:before`

Called before job execution starts.

**Parameters:**
```typescript
{
  id: string,           // Job identifier
  payload: object,      // Job payload data
  ctx: JobContext       // Complete job context
}
```

**Example:**
```javascript
hooks: {
  'job:before': async ({ id, payload, ctx }) => {
    console.log(`Starting job: ${id}`)

    // Log job metadata
    if (ctx.trigger) {
      console.log(`Triggered by: ${ctx.trigger.type}`)
    }

    // Validate prerequisites
    if (payload.requiresAuth && !ctx.env.API_TOKEN) {
      throw new Error('API_TOKEN required for this job')
    }

    // Initialize tracking
    ctx.startTime = Date.now()
  }
}
```

**Use Cases:**
- Job validation and prerequisites
- Resource allocation
- Logging and monitoring
- Authentication checks
- Environment preparation

---

### `job:after`

Called after job execution completes successfully.

**Parameters:**
```typescript
{
  id: string,           // Job identifier
  result: JobResult,    // Job execution result
  ctx: JobContext       // Complete job context
}
```

**JobResult Structure:**
```typescript
{
  ok: boolean,          // Success status
  duration: number,     // Execution time in milliseconds
  artifacts?: string[], // Generated artifacts
  data?: any,           // Result data
  logs?: string[]       // Execution logs
}
```

**Example:**
```javascript
hooks: {
  'job:after': async ({ id, result, ctx }) => {
    const duration = Date.now() - ctx.startTime

    console.log(`Job completed: ${id}`)
    console.log(`Duration: ${duration}ms`)

    // Log artifacts
    if (result.artifacts?.length > 0) {
      console.log(`Artifacts: ${result.artifacts.join(', ')}`)
    }

    // Send success notification
    if (ctx.env.NODE_ENV === 'production') {
      await sendSlackNotification({
        title: `✅ Job Completed: ${id}`,
        duration: `${duration}ms`,
        artifacts: result.artifacts
      })
    }

    // Update metrics
    await recordMetric('job.duration', duration, { jobId: id })
  }
}
```

**Use Cases:**
- Success notifications
- Metrics collection
- Artifact processing
- Cleanup operations
- Result persistence

---

### `job:error`

Called when job execution fails.

**Parameters:**
```typescript
{
  id: string,           // Job identifier
  error: Error,         // Error that caused failure
  ctx: JobContext       // Complete job context
}
```

**Example:**
```javascript
hooks: {
  'job:error': async ({ id, error, ctx }) => {
    console.error(`Job failed: ${id}`)
    console.error(`Error: ${error.message}`)

    // Enhanced error logging
    const errorInfo = {
      jobId: id,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: {
        branch: ctx.git?.branch,
        commit: ctx.git?.head,
        trigger: ctx.trigger?.type
      }
    }

    // Log to error tracking service
    await sendToSentry(errorInfo)

    // Send alert for critical jobs
    if (ctx.meta?.critical) {
      await sendPagerDutyAlert({
        severity: 'critical',
        summary: `Critical job failed: ${id}`,
        details: errorInfo
      })
    }

    // Attempt recovery for specific errors
    if (error.message.includes('timeout')) {
      console.log('Scheduling retry for timeout error')
      await scheduleRetry(id, ctx.payload)
    }
  }
}
```

**Use Cases:**
- Error notifications and alerts
- Error tracking and logging
- Recovery mechanisms
- Incident management
- Debugging assistance

## Daemon Hooks

These hooks are called during daemon lifecycle events.

### `daemon:start`

Called when the GitVan daemon starts.

**Parameters:** None

**Example:**
```javascript
hooks: {
  'daemon:start': async () => {
    console.log('🚀 GitVan daemon started')

    // Initialize external connections
    await connectToDatabase()
    await authenticateWithServices()

    // Send startup notification
    await sendSlackNotification({
      title: '🚀 GitVan Daemon Started',
      timestamp: new Date().toISOString(),
      hostname: process.env.HOSTNAME || 'unknown'
    })

    // Register health check
    await registerHealthCheck()
  }
}
```

**Use Cases:**
- Service initialization
- External connections setup
- Startup notifications
- Health check registration
- Resource allocation

---

### `daemon:stop`

Called when the GitVan daemon stops.

**Parameters:** None

**Example:**
```javascript
hooks: {
  'daemon:stop': async () => {
    console.log('⏹️ GitVan daemon stopping')

    // Graceful shutdown
    await flushPendingOperations()
    await closeConnections()

    // Send shutdown notification
    await sendSlackNotification({
      title: '⏹️ GitVan Daemon Stopped',
      timestamp: new Date().toISOString()
    })

    // Cleanup resources
    await cleanupTempFiles()
  }
}
```

**Use Cases:**
- Graceful shutdown procedures
- Resource cleanup
- Connection termination
- Final notifications
- State persistence

---

### `daemon:tick`

Called periodically during daemon operation (typically every few seconds).

**Parameters:** None

**Example:**
```javascript
hooks: {
  'daemon:tick': async () => {
    // Health monitoring
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    // Log health metrics
    if (uptime % 300 === 0) { // Every 5 minutes
      console.log(`💓 Daemon uptime: ${Math.floor(uptime)}s`)
      console.log(`Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`)
    }

    // Check for stuck jobs
    const stuckJobs = await findStuckJobs()
    if (stuckJobs.length > 0) {
      console.warn(`⚠️ Found ${stuckJobs.length} stuck jobs`)
      await notifyStuckJobs(stuckJobs)
    }

    // Cleanup old locks
    await cleanupExpiredLocks()
  }
}
```

**Use Cases:**
- Health monitoring
- Periodic cleanup
- Resource monitoring
- Stuck job detection
- Heartbeat operations

## Event Hooks

These hooks are called when Git events are detected and processed.

### `event:detected`

Called when a Git event (push, merge, tag, etc.) is detected.

**Parameters:**
```typescript
{
  from: string,         // Previous commit hash
  to: string,           // New commit hash
  type: string,         // Event type: 'push', 'merge', 'tag'
  branch?: string,      // Branch name (for push/merge events)
  tag?: string,         // Tag name (for tag events)
  ctx: GitContext       // Git context with detailed information
}
```

**GitContext Structure:**
```typescript
{
  isPush: boolean,
  isMerge: boolean,
  isTag: boolean,
  branch: string,
  targetBranch?: string,
  changedPaths?: string[],
  message?: string,
  author?: string,
  timestamp: string
}
```

**Example:**
```javascript
hooks: {
  'event:detected': async ({ from, to, type, ctx }) => {
    console.log(`📡 Git event detected: ${type} (${from.slice(0, 7)} → ${to.slice(0, 7)})`)

    // Log detailed event information
    if (ctx.isPush) {
      console.log(`Push to branch: ${ctx.branch}`)
      if (ctx.changedPaths?.length > 0) {
        console.log(`Changed files: ${ctx.changedPaths.length}`)
      }
    }

    if (ctx.isMerge) {
      console.log(`Merge to: ${ctx.targetBranch}`)
      console.log(`From: ${ctx.branch}`)
    }

    if (ctx.isTag) {
      console.log(`Tag created: ${ctx.tag}`)
    }

    // Send event notification
    await sendEventNotification({
      type,
      branch: ctx.branch,
      author: ctx.author,
      message: ctx.message,
      changedFiles: ctx.changedPaths?.length || 0
    })

    // Trigger external webhooks
    if (ctx.branch === 'main' && ctx.isPush) {
      await triggerDeploymentWebhook({
        commit: to,
        branch: ctx.branch,
        author: ctx.author
      })
    }
  }
}
```

**Use Cases:**
- Event logging and monitoring
- External integrations
- Deployment triggers
- Notification systems
- Analytics collection

---

### `event:processed`

Called after all jobs triggered by an event have been processed.

**Parameters:**
```typescript
{
  event: GitEvent,      // Original event data
  jobs: JobResult[],    // Results from all triggered jobs
  success: boolean,     // Overall success status
  duration: number      // Total processing time
}
```

**Example:**
```javascript
hooks: {
  'event:processed': async ({ event, jobs, success, duration }) => {
    const successCount = jobs.filter(j => j.ok).length
    const failureCount = jobs.length - successCount

    console.log(`📊 Event processing complete:`)
    console.log(`  Jobs: ${jobs.length} (${successCount} success, ${failureCount} failed)`)
    console.log(`  Duration: ${duration}ms`)

    // Send summary notification
    await sendSummaryNotification({
      event: event.type,
      branch: event.ctx.branch,
      jobsTotal: jobs.length,
      jobsSuccess: successCount,
      jobsFailed: failureCount,
      duration,
      overallSuccess: success
    })

    // Log failed jobs
    if (failureCount > 0) {
      const failedJobs = jobs.filter(j => !j.ok)
      console.error(`Failed jobs:`)
      failedJobs.forEach(job => {
        console.error(`  - ${job.id}: ${job.error?.message}`)
      })
    }

    // Update deployment status
    if (event.ctx.branch === 'main') {
      await updateDeploymentStatus({
        commit: event.to,
        success,
        jobs: jobs.map(j => ({ id: j.id, success: j.ok }))
      })
    }
  }
}
```

**Use Cases:**
- Event processing summaries
- Deployment status updates
- Analytics and reporting
- Failure analysis
- Notification aggregation

## Cron Hooks

These hooks are called for scheduled job operations.

### `cron:schedule`

Called when cron jobs are scheduled.

**Parameters:**
```typescript
{
  jobs: CronJob[],      // Array of scheduled cron jobs
  nextRun: Date         // Next scheduled execution time
}
```

**Example:**
```javascript
hooks: {
  'cron:schedule': async ({ jobs, nextRun }) => {
    console.log(`⏰ Scheduled ${jobs.length} cron jobs`)
    console.log(`Next run: ${nextRun.toISOString()}`)

    // Log individual job schedules
    jobs.forEach(job => {
      console.log(`  - ${job.id}: ${job.cron}`)
    })

    // Update monitoring dashboard
    await updateCronDashboard({
      scheduledJobs: jobs.length,
      nextExecution: nextRun,
      jobs: jobs.map(j => ({
        id: j.id,
        schedule: j.cron,
        enabled: true
      }))
    })
  }
}
```

**Use Cases:**
- Schedule monitoring
- Dashboard updates
- Job validation
- Resource planning
- Notification setup

---

### `cron:execute`

Called when cron jobs are executed.

**Parameters:**
```typescript
{
  jobs: CronJob[],      // Array of jobs being executed
  timestamp: Date       // Execution timestamp
}
```

**Example:**
```javascript
hooks: {
  'cron:execute': async ({ jobs, timestamp }) => {
    console.log(`⏰ Executing ${jobs.length} cron jobs at ${timestamp.toISOString()}`)

    // Log execution details
    jobs.forEach(job => {
      console.log(`  - Starting: ${job.id}`)
    })

    // Send execution notification
    if (jobs.some(j => j.meta?.critical)) {
      await sendCriticalJobNotification({
        count: jobs.length,
        criticalJobs: jobs.filter(j => j.meta?.critical).map(j => j.id),
        timestamp
      })
    }

    // Update execution metrics
    await recordMetric('cron.execution', jobs.length, {
      timestamp: timestamp.toISOString()
    })
  }
}
```

**Use Cases:**
- Execution logging
- Critical job monitoring
- Metrics collection
- Resource allocation
- Performance tracking

## Storage Hooks

These hooks are called during receipt (job result) storage operations.

### `receipt:write`

Called when a job receipt is written to storage.

**Parameters:**
```typescript
{
  id: string,           // Job identifier
  note: string,         // Git note reference
  ref: string,          // Git reference
  receipt: JobReceipt   // Complete receipt data
}
```

**JobReceipt Structure:**
```typescript
{
  id: string,
  timestamp: string,
  result: JobResult,
  context: JobContext,
  metadata: object
}
```

**Example:**
```javascript
hooks: {
  'receipt:write': async ({ id, note, ref, receipt }) => {
    console.log(`📝 Writing receipt for job: ${id}`)
    console.log(`  Note: ${note}`)
    console.log(`  Ref: ${ref}`)

    // Backup to external storage
    if (receipt.result.ok && receipt.context.env.NODE_ENV === 'production') {
      await backupToS3({
        key: `receipts/${id}/${ref}.json`,
        data: receipt,
        metadata: {
          jobId: id,
          timestamp: receipt.timestamp,
          success: receipt.result.ok
        }
      })
    }

    // Index for search
    await indexReceipt({
      id,
      timestamp: receipt.timestamp,
      success: receipt.result.ok,
      duration: receipt.result.duration,
      branch: receipt.context.git?.branch,
      tags: receipt.metadata?.tags || []
    })

    // Update analytics
    await updateAnalytics('receipt.written', {
      jobId: id,
      success: receipt.result.ok,
      duration: receipt.result.duration
    })
  }
}
```

**Use Cases:**
- External backup
- Search indexing
- Analytics collection
- Compliance logging
- Data archival

---

### `receipt:read`

Called when a job receipt is read from storage.

**Parameters:**
```typescript
{
  id: string,           // Job identifier
  note: string,         // Git note reference
  ref: string,          // Git reference
  receipt: JobReceipt   // Retrieved receipt data
}
```

**Example:**
```javascript
hooks: {
  'receipt:read': async ({ id, note, ref, receipt }) => {
    console.log(`📖 Reading receipt for job: ${id}`)

    // Log access for audit trail
    await logReceiptAccess({
      jobId: id,
      accessor: process.env.USER || 'system',
      timestamp: new Date().toISOString(),
      purpose: 'retrieval'
    })

    // Update cache
    await cacheReceipt(id, receipt, {
      ttl: 3600 // 1 hour
    })

    // Increment read metrics
    await recordMetric('receipt.read', 1, {
      jobId: id,
      age: Date.now() - new Date(receipt.timestamp).getTime()
    })
  }
}
```

**Use Cases:**
- Access logging
- Cache management
- Usage analytics
- Audit trails
- Performance monitoring

## Lock Management Hooks

These hooks are called during job lock operations to prevent concurrent execution.

### `lock:acquire`

Called when a job lock is successfully acquired.

**Parameters:**
```typescript
{
  id: string,           // Job identifier
  fingerprint: string,  // Lock fingerprint
  lockData: LockData    // Complete lock information
}
```

**LockData Structure:**
```typescript
{
  jobId: string,
  fingerprint: string,
  timestamp: string,
  expiry: string,
  holder: string
}
```

**Example:**
```javascript
hooks: {
  'lock:acquire': async ({ id, fingerprint, lockData }) => {
    console.log(`🔒 Lock acquired for job: ${id}`)
    console.log(`  Fingerprint: ${fingerprint}`)
    console.log(`  Expires: ${lockData.expiry}`)

    // Log lock acquisition
    await logLockEvent({
      type: 'acquire',
      jobId: id,
      fingerprint,
      timestamp: lockData.timestamp,
      holder: lockData.holder
    })

    // Update lock monitoring dashboard
    await updateLockDashboard({
      action: 'acquire',
      jobId: id,
      activeLocks: await getActiveLockCount()
    })

    // Set up lock expiry monitoring
    const expiryTime = new Date(lockData.expiry).getTime()
    const now = Date.now()
    if (expiryTime - now > 60000) { // More than 1 minute
      setTimeout(async () => {
        await checkLockStatus(id, fingerprint)
      }, expiryTime - now - 30000) // Check 30 seconds before expiry
    }
  }
}
```

**Use Cases:**
- Lock monitoring
- Deadlock detection
- Resource tracking
- Performance analysis
- Debugging assistance

---

### `lock:release`

Called when a job lock is released.

**Parameters:**
```typescript
{
  id: string,           // Job identifier
  fingerprint?: string, // Lock fingerprint (if available)
  reason: string        // Release reason: 'completed', 'failed', 'expired'
}
```

**Example:**
```javascript
hooks: {
  'lock:release': async ({ id, fingerprint, reason }) => {
    console.log(`🔓 Lock released for job: ${id}`)
    console.log(`  Reason: ${reason}`)

    // Log lock release
    await logLockEvent({
      type: 'release',
      jobId: id,
      fingerprint,
      reason,
      timestamp: new Date().toISOString()
    })

    // Update monitoring
    await updateLockDashboard({
      action: 'release',
      jobId: id,
      reason,
      activeLocks: await getActiveLockCount()
    })

    // Check for queued jobs
    const queuedJobs = await getQueuedJobsForLock(fingerprint)
    if (queuedJobs.length > 0) {
      console.log(`🔄 ${queuedJobs.length} jobs queued for this lock`)
      await notifyQueuedJobs(queuedJobs)
    }

    // Record lock duration
    const lockDuration = await calculateLockDuration(id, fingerprint)
    if (lockDuration > 0) {
      await recordMetric('lock.duration', lockDuration, {
        jobId: id,
        reason
      })
    }
  }
}
```

**Use Cases:**
- Lock monitoring
- Queue management
- Performance metrics
- Resource cleanup
- Debugging support

---

### `lock:fail`

Called when lock acquisition fails.

**Parameters:**
```typescript
{
  id: string,           // Job identifier
  fingerprint: string,  // Attempted lock fingerprint
  reason: string,       // Failure reason
  retryCount?: number   // Number of retry attempts
}
```

**Example:**
```javascript
hooks: {
  'lock:fail': async ({ id, fingerprint, reason, retryCount = 0 }) => {
    console.warn(`⚠️ Lock acquisition failed for job: ${id}`)
    console.warn(`  Reason: ${reason}`)
    console.warn(`  Retry count: ${retryCount}`)

    // Log lock failure
    await logLockEvent({
      type: 'fail',
      jobId: id,
      fingerprint,
      reason,
      retryCount,
      timestamp: new Date().toISOString()
    })

    // Check for lock contention
    if (reason === 'already_locked') {
      const currentHolder = await getCurrentLockHolder(fingerprint)
      console.warn(`  Current holder: ${currentHolder}`)

      // Alert on high contention
      const contentionCount = await getLockContentionCount(fingerprint)
      if (contentionCount > 5) {
        await sendContentionAlert({
          fingerprint,
          contentionCount,
          failedJob: id,
          currentHolder
        })
      }
    }

    // Handle retry logic
    if (retryCount < 3 && reason === 'temporary_failure') {
      const retryDelay = Math.pow(2, retryCount) * 1000 // Exponential backoff
      console.log(`🔄 Scheduling retry in ${retryDelay}ms`)

      setTimeout(async () => {
        await retryLockAcquisition(id, fingerprint, retryCount + 1)
      }, retryDelay)
    }

    // Record failure metrics
    await recordMetric('lock.failure', 1, {
      jobId: id,
      reason,
      retryCount
    })
  }
}
```

**Use Cases:**
- Failure analysis
- Contention monitoring
- Retry management
- Alert generation
- Performance debugging

## Async Patterns

### Sequential Execution

Hooks are called sequentially by default:

```javascript
hooks: {
  'job:before': async (context) => {
    // This completes before the next hook
    await validatePrerequisites(context)
    await allocateResources(context)
  }
}
```

### Parallel Execution

Use `callHookParallel` for independent operations:

```javascript
// Plugin registration
hooks.hook('job:after', async (context) => {
  // These run in parallel
  await Promise.all([
    sendNotification(context),
    updateMetrics(context),
    cleanupTemp(context)
  ])
})
```

### Error Handling

Handle errors gracefully to avoid breaking other plugins:

```javascript
hooks: {
  'job:error': async ({ id, error }) => {
    try {
      await sendErrorNotification(id, error)
    } catch (notificationError) {
      // Log but don't throw - let other hooks continue
      console.error('Notification failed:', notificationError.message)
    }
  }
}
```

### Conditional Execution

Use context data for conditional hook execution:

```javascript
hooks: {
  'job:after': async ({ id, result, ctx }) => {
    // Only for production deployments
    if (ctx.git?.branch === 'main' && ctx.env.NODE_ENV === 'production') {
      await notifyDeployment(result)
    }

    // Only for failed jobs
    if (!result.ok) {
      await createIncident(id, result.error)
    }

    // Only for jobs with artifacts
    if (result.artifacts?.length > 0) {
      await uploadArtifacts(result.artifacts)
    }
  }
}
```

## Best Practices

1. **Always handle errors** - Don't let plugin failures break the system
2. **Use appropriate execution patterns** - Sequential for dependencies, parallel for independent operations
3. **Log meaningful information** - Help with debugging and monitoring
4. **Validate context data** - Check for required fields before using them
5. **Clean up resources** - Implement proper cleanup in error cases
6. **Use meaningful hook names** - Follow the established naming conventions
7. **Document hook behavior** - Clear documentation helps other developers

## Hook Execution Order

Hooks are executed in registration order within each category. Use plugin dependencies to control loading order if needed.

```javascript
// Plugin A
export default {
  name: 'plugin-a',
  hooks: {
    'job:before': async () => console.log('A: before')
  }
}

// Plugin B
export default {
  name: 'plugin-b',
  dependencies: ['plugin-a'], // Loads after plugin-a
  hooks: {
    'job:before': async () => console.log('B: before')
  }
}

// Output:
// A: before
// B: before
```

## Custom Hooks

Plugins can define and call custom hooks:

```javascript
export default {
  name: 'custom-hooks-plugin',
  setup(options, hooks) {
    // Define custom hook
    this.hooks = hooks
  },
  hooks: {
    'job:before': async (context) => {
      // Call custom hook
      await this.hooks.callHook('custom:validation', context)
    }
  }
}

// Other plugins can listen to custom hooks
export default {
  name: 'validator-plugin',
  hooks: {
    'custom:validation': async (context) => {
      // Custom validation logic
      await validateJobContext(context)
    }
  }
}
```