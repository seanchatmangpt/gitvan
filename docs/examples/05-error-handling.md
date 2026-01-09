# Example 5: Error Handling

This example demonstrates comprehensive error handling patterns in GitVan workflows, jobs, and composable operations.

## Error Handling Strategies

GitVan provides multiple layers of error handling:
1. Try-catch blocks for synchronous errors
2. Promise rejection handling for async errors
3. Workflow step error isolation
4. Job retry mechanisms
5. Audit trail error recording

## Basic Error Handling

### Try-Catch Pattern

```javascript
import { withGitVan, useGit, useWorkflow } from 'gitvan';

const context = { repo: process.cwd(), config: {} };

await withGitVan(context, async () => {
  const git = useGit();
  const workflow = useWorkflow();

  try {
    // Attempt operation
    const status = await git.status();

    if (status.modified.length > 0) {
      await git.commit('feat: add feature');
      await git.push({ remote: 'origin' });
    }
  } catch (error) {
    // Handle error
    console.error('Git operation failed:', error.message);

    // Log error details
    console.error('Stack trace:', error.stack);

    // Record in audit trail
    const receipt = useReceipt();
    await receipt.write({
      action: 'git:error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Re-throw or handle gracefully
    throw error;
  }
});
```

### Error Recovery

```javascript
import { withGitVan, useGit } from 'gitvan';

await withGitVan(context, async () => {
  const git = useGit();

  try {
    await git.push({ remote: 'origin', branch: 'main' });
  } catch (error) {
    if (error.message.includes('rejected')) {
      // Pull and retry
      console.log('Push rejected. Pulling and retrying...');

      await git.pull({ remote: 'origin', branch: 'main', rebase: true });
      await git.push({ remote: 'origin', branch: 'main' });

      console.log('✓ Push succeeded after pull');
    } else {
      throw error;
    }
  }
});
```

## Workflow Error Handling

### Step-Level Error Handling

Create `.gitvan/workflows/resilient-workflow.ttl`:

```turtle
@prefix : <http://gitvan.dev/workflow/> .
@prefix step: <http://gitvan.dev/step/> .

:ResilientWorkflow a :Workflow ;
  :name "Resilient Workflow" ;
  :hasStep step:critical ;
  :hasStep step:optional ;
  :hasStep step:cleanup .

step:critical a :ScriptStep ;
  :name "Critical Step" ;
  :script "npm run build" ;
  :continueOnError false .  # Fail workflow if this fails

step:optional a :ScriptStep ;
  :name "Optional Step" ;
  :script "npm run optional-task" ;
  :continueOnError true .  # Continue even if this fails

step:cleanup a :ScriptStep ;
  :name "Cleanup" ;
  :script "npm run cleanup" ;
  :alwaysRun true .  # Run even if previous steps failed
```

### Workflow Error Handling Script

```javascript
import { withGitVan, useWorkflow, useReceipt } from 'gitvan';

const context = { repo: process.cwd(), config: {} };

await withGitVan(context, async () => {
  const workflow = useWorkflow();
  const receipt = useReceipt();

  try {
    const result = await workflow.execute('resilient-workflow');

    if (result.status === 'success') {
      console.log('✓ Workflow completed successfully');
    } else if (result.status === 'partial') {
      console.warn('⚠ Workflow completed with warnings');

      // Check which steps failed
      const failedSteps = result.steps.filter(s => s.status === 'failure');
      console.log('Failed steps:', failedSteps.map(s => s.name));

      // Log to audit
      await receipt.write({
        action: 'workflow:partial',
        workflow: 'resilient-workflow',
        failedSteps: failedSteps.map(s => s.name),
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('✗ Workflow failed');
      throw new Error('Workflow execution failed');
    }
  } catch (error) {
    console.error('Workflow error:', error.message);

    // Attempt cleanup
    try {
      await workflow.execute('cleanup-workflow');
    } catch (cleanupError) {
      console.error('Cleanup also failed:', cleanupError.message);
    }

    // Log comprehensive error
    await receipt.write({
      action: 'workflow:error',
      workflow: 'resilient-workflow',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
});
```

## Job Error Handling

### Job with Retry Logic

```javascript
// jobs/resilient-job.mjs

export default {
  name: 'resilient-job',
  description: 'Job with comprehensive error handling',

  // Retry configuration
  retry: {
    times: 3,
    delay: 5000,  // 5 seconds
    backoff: 'exponential'  // 5s, 10s, 20s
  },

  timeout: 60000,  // 1 minute

  async run(context) {
    const { withGitVan, useReceipt, useEvent } = await import('gitvan');

    let attempt = 0;

    await withGitVan(context, async () => {
      const receipt = useReceipt();
      const event = useEvent();

      try {
        attempt++;
        console.log(`Attempt ${attempt}...`);

        // Simulate potentially failing operation
        const result = await performOperation();

        // Record success
        await receipt.write({
          action: 'job:success',
          job: 'resilient-job',
          attempt,
          timestamp: new Date().toISOString()
        });

        return { status: 'success', result };
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);

        // Record failure
        await receipt.write({
          action: 'job:attempt-failed',
          job: 'resilient-job',
          attempt,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        // Emit error event on final failure
        if (attempt === 3) {
          await event.emit('job:failed', {
            job: 'resilient-job',
            attempts: attempt,
            error: error.message
          });
        }

        throw error;  // Re-throw for retry mechanism
      }
    });
  }
};

async function performOperation() {
  // Simulate operation that might fail
  if (Math.random() < 0.5) {
    throw new Error('Operation failed randomly');
  }
  return 'success';
}
```

### Job with Graceful Degradation

```javascript
// jobs/degradable-job.mjs

export default {
  name: 'degradable-job',
  description: 'Job that degrades gracefully on errors',

  async run(context) {
    const { withGitVan } = await import('gitvan');

    await withGitVan(context, async () => {
      const results = {
        primaryTask: null,
        fallbackTask: null,
        minimalTask: null
      };

      // Try primary approach
      try {
        results.primaryTask = await primaryApproach();
        return { status: 'success', mode: 'primary', results };
      } catch (primaryError) {
        console.warn('Primary approach failed:', primaryError.message);

        // Try fallback approach
        try {
          results.fallbackTask = await fallbackApproach();
          return { status: 'success', mode: 'fallback', results };
        } catch (fallbackError) {
          console.warn('Fallback approach failed:', fallbackError.message);

          // Try minimal approach
          try {
            results.minimalTask = await minimalApproach();
            return { status: 'success', mode: 'minimal', results };
          } catch (minimalError) {
            console.error('All approaches failed');
            throw new Error('Job failed completely');
          }
        }
      }
    });
  }
};

async function primaryApproach() {
  // Best case scenario
}

async function fallbackApproach() {
  // Degraded but acceptable
}

async function minimalApproach() {
  // Bare minimum functionality
}
```

## Error Types and Handling

### Git Errors

```javascript
import { withGitVan, useGit } from 'gitvan';

await withGitVan(context, async () => {
  const git = useGit();

  try {
    await git.merge('feature-branch');
  } catch (error) {
    if (error.code === 'MERGE_CONFLICT') {
      console.error('Merge conflict detected');
      console.log('Conflicted files:', error.files);

      // Abort merge
      await git.abortMerge();

      // Or resolve conflicts
      for (const file of error.files) {
        await resolveConflict(file);
      }
      await git.commit('Merge resolved');
    } else if (error.code === 'NOT_FOUND') {
      console.error('Branch not found:', error.ref);
    } else if (error.code === 'PERMISSION_DENIED') {
      console.error('Permission denied:', error.message);
    } else {
      console.error('Unknown Git error:', error);
      throw error;
    }
  }
});
```

### Workflow Errors

```javascript
import { withGitVan, useWorkflow } from 'gitvan';

await withGitVan(context, async () => {
  const workflow = useWorkflow();

  try {
    await workflow.execute('my-workflow');
  } catch (error) {
    if (error.code === 'WORKFLOW_NOT_FOUND') {
      console.error('Workflow not found:', error.name);
    } else if (error.code === 'WORKFLOW_TIMEOUT') {
      console.error('Workflow timed out after', error.timeout, 'ms');
    } else if (error.code === 'STEP_FAILED') {
      console.error('Step failed:', error.step);
      console.error('Step error:', error.stepError);

      // Access failed step details
      console.log('Failed at:', error.failedAt);
      console.log('Completed steps:', error.completedSteps);
    } else if (error.code === 'VALIDATION_ERROR') {
      console.error('Workflow validation failed:');
      error.errors.forEach(e => console.error(`  - ${e}`));
    } else {
      throw error;
    }
  }
});
```

### Template Errors

```javascript
import { withGitVan, useTemplate } from 'gitvan';

await withGitVan(context, async () => {
  const template = useTemplate();

  try {
    const output = await template.render('my-template.njk', data);
  } catch (error) {
    if (error.code === 'TEMPLATE_NOT_FOUND') {
      console.error('Template not found:', error.name);

      // List available templates
      const templates = await template.list();
      console.log('Available templates:', templates);
    } else if (error.code === 'TEMPLATE_SYNTAX_ERROR') {
      console.error('Template syntax error:');
      console.error('  Line:', error.line);
      console.error('  Column:', error.column);
      console.error('  Message:', error.message);
    } else if (error.code === 'UNDEFINED_VARIABLE') {
      console.error('Undefined variable:', error.variable);
      console.log('Provided data:', Object.keys(data));
    } else {
      throw error;
    }
  }
});
```

## Advanced Error Handling Patterns

### Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.warn(`Circuit breaker opened. Next attempt at ${new Date(this.nextAttempt)}`);
    }
  }
}

// Usage
const breaker = new CircuitBreaker(5, 60000);

try {
  const result = await breaker.execute(async () => {
    return await unreliableOperation();
  });
} catch (error) {
  console.error('Operation failed or circuit open:', error.message);
}
```

### Bulkhead Pattern

```javascript
class Bulkhead {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.current = 0;
    this.queue = [];
  }

  async execute(fn) {
    if (this.current >= this.maxConcurrent) {
      // Queue request
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.current++;

    try {
      return await fn();
    } finally {
      this.current--;

      // Process queue
      if (this.queue.length > 0) {
        const resolve = this.queue.shift();
        resolve();
      }
    }
  }
}

// Usage
const bulkhead = new Bulkhead(5);

// Limit concurrent operations
const promises = jobs.map(job =>
  bulkhead.execute(async () => {
    return await processJob(job);
  })
);

const results = await Promise.allSettled(promises);
```

### Timeout Pattern

```javascript
async function withTimeout(promise, timeout, errorMessage) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeout}ms`));
    }, timeout);
  });

  return Promise.race([promise, timeoutPromise]);
}

// Usage
try {
  const result = await withTimeout(
    longRunningOperation(),
    30000,
    'Long running operation timed out'
  );
} catch (error) {
  if (error.message.includes('timed out')) {
    console.error('Timeout occurred');
    // Handle timeout
  } else {
    throw error;
  }
}
```

### Fallback Pattern

```javascript
async function withFallback(primary, fallback, onFallback) {
  try {
    return await primary();
  } catch (error) {
    console.warn('Primary operation failed, using fallback:', error.message);

    if (onFallback) {
      onFallback(error);
    }

    return await fallback();
  }
}

// Usage
const result = await withFallback(
  // Primary
  async () => await fetchFromAPI(),

  // Fallback
  async () => await fetchFromCache(),

  // Callback on fallback
  (error) => {
    console.log('Logged fallback usage');
  }
);
```

## Error Monitoring and Alerting

### Error Aggregation

```javascript
import { withGitVan, useReceipt } from 'gitvan';

class ErrorAggregator {
  constructor() {
    this.errors = new Map();
  }

  record(error, context) {
    const key = error.message;

    if (!this.errors.has(key)) {
      this.errors.set(key, {
        message: error.message,
        stack: error.stack,
        count: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
        contexts: []
      });
    }

    const entry = this.errors.get(key);
    entry.count++;
    entry.lastSeen = new Date();
    entry.contexts.push(context);
  }

  async flush() {
    await withGitVan(context, async () => {
      const receipt = useReceipt();

      for (const [message, data] of this.errors) {
        await receipt.write({
          action: 'error:aggregate',
          error: message,
          count: data.count,
          firstSeen: data.firstSeen.toISOString(),
          lastSeen: data.lastSeen.toISOString(),
          contexts: data.contexts,
          timestamp: new Date().toISOString()
        });
      }

      this.errors.clear();
    });
  }
}

// Usage
const aggregator = new ErrorAggregator();

try {
  await operation1();
} catch (error) {
  aggregator.record(error, { operation: 'operation1' });
}

try {
  await operation2();
} catch (error) {
  aggregator.record(error, { operation: 'operation2' });
}

// Flush errors periodically
await aggregator.flush();
```

### Error Notification

```javascript
import { withGitVan, useEvent } from 'gitvan';

await withGitVan(context, async () => {
  const event = useEvent();

  // Listen for errors
  event.on('error', async (error) => {
    // Send notification based on severity
    if (error.severity === 'critical') {
      await sendPagerDutyAlert(error);
      await sendSlackMessage('#alerts', error);
    } else if (error.severity === 'high') {
      await sendSlackMessage('#warnings', error);
    } else {
      await logError(error);
    }
  });

  // Emit error event
  try {
    await criticalOperation();
  } catch (error) {
    await event.emit('error', {
      severity: 'critical',
      message: error.message,
      stack: error.stack,
      context: 'critical-operation'
    });

    throw error;
  }
});

async function sendPagerDutyAlert(error) {
  // PagerDuty integration
}

async function sendSlackMessage(channel, error) {
  // Slack integration
}

async function logError(error) {
  // Log to file or service
}
```

## Testing Error Scenarios

### Unit Tests

```javascript
import { describe, it, expect } from 'vitest';
import { withGitVan, useGit } from 'gitvan';

describe('Git Error Handling', () => {
  it('should handle merge conflicts', async () => {
    const context = createTestContext();

    await withGitVan(context, async () => {
      const git = useGit();

      // Setup conflicting branches
      await setupConflict();

      // Attempt merge
      await expect(async () => {
        await git.merge('conflicting-branch');
      }).rejects.toThrow('Merge conflict');
    });
  });

  it('should recover from failed push', async () => {
    const context = createTestContext();

    await withGitVan(context, async () => {
      const git = useGit();

      // Mock rejected push
      mockPushRejection();

      // Should pull and retry
      await expect(git.pushWithRetry()).resolves.not.toThrow();
    });
  });
});
```

## Best Practices

### 1. Always Use Try-Catch for Critical Operations

```javascript
try {
  await criticalOperation();
} catch (error) {
  // Handle or log
  console.error('Critical operation failed:', error);
  throw error;
}
```

### 2. Log Errors to Audit Trail

```javascript
catch (error) {
  await receipt.write({
    action: 'error',
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  throw error;
}
```

### 3. Provide Meaningful Error Messages

```javascript
// Good
throw new Error(`Failed to merge branch '${branchName}': ${reason}`);

// Bad
throw new Error('Merge failed');
```

### 4. Use Error Codes for Categorization

```javascript
class GitVanError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

throw new GitVanError(
  'Workflow execution failed',
  'WORKFLOW_FAILED',
  { workflow: 'ci-pipeline', step: 'build' }
);
```

### 5. Clean Up Resources on Error

```javascript
const lock = await useLock().acquire('resource');

try {
  await performOperation();
} finally {
  await useLock().release(lock);
}
```

## Summary

Effective error handling in GitVan:

1. **Catch and handle** errors appropriately
2. **Log errors** to audit trail for tracking
3. **Emit events** for monitoring and alerting
4. **Use retry logic** for transient failures
5. **Degrade gracefully** when possible
6. **Clean up resources** in finally blocks
7. **Provide context** in error messages
8. **Test error scenarios** comprehensively

---

**Key Takeaways:**

1. Use try-catch blocks for error handling
2. Record errors in audit trail
3. Implement retry logic for flaky operations
4. Use circuit breakers for external services
5. Test error scenarios thoroughly
