# GitVan Error Handling Guide

**Goal**: Build robust error recovery into your workflows.

This guide covers error patterns, recovery strategies, retry logic, and best practices for handling failures gracefully.

---

## Table of Contents

1. [Error Types](#error-types)
2. [Try/Catch Patterns](#trycatch-patterns)
3. [Retry Strategies](#retry-strategies)
4. [Graceful Degradation](#graceful-degradation)
5. [Error Logging and Reporting](#error-logging-and-reporting)
6. [Recovery Mechanisms](#recovery-mechanisms)
7. [User-Friendly Messages](#user-friendly-messages)
8. [Testing Error Cases](#testing-error-cases)

---

## Error Types

### GitVan Error Hierarchy

```
Error (base)
├── GitVanError
│   ├── ContextError - Context not available
│   ├── GitError - Git operations failed
│   │   ├── RepoNotFoundError
│   │   ├── BranchNotFoundError
│   │   ├── CommitFailedError
│   │   └── MergeConflictError
│   ├── JobError - Job execution failed
│   │   ├── JobNotFoundError
│   │   ├── JobTimeoutError
│   │   └── JobExecutionError
│   ├── HookError - Hook execution failed
│   ├── TemplateError - Template rendering failed
│   └── ConfigError - Configuration error
```

### Identifying Error Types

```javascript
await withGitVan(context, async () => {
  try {
    const git = useGit();
    await git.commit('test');
  } catch (error) {
    // Check error type
    if (error.name === 'ContextError') {
      console.error('Not in withGitVan context');
    } else if (error.message.includes('not a git repository')) {
      console.error('Invalid repository');
    } else if (error.message.includes('nothing to commit')) {
      console.error('No staged files');
    } else {
      console.error('Unknown error:', error);
    }
  }
});
```

---

## Try/Catch Patterns

### Basic Error Handling

```javascript
await withGitVan(context, async () => {
  const git = useGit();

  try {
    const status = await git.status();
    console.log('Status:', status);
  } catch (error) {
    console.error('Failed to get status:', error.message);
    // Handle error
  }
});
```

### Nested Try/Catch

```javascript
await withGitVan(context, async () => {
  const git = useGit();
  const job = useJob();

  try {
    // Try to commit
    try {
      const sha = await git.commit('feat: new feature');
      console.log('Committed:', sha);
    } catch (commitError) {
      // If commit fails, try alternative approach
      console.warn('Commit failed, trying without sign:', commitError.message);

      const sha = await git.commit('feat: new feature', { sign: false });
      console.log('Committed without signing:', sha);
    }

    // Then execute job
    await job.execute('test');
  } catch (error) {
    // Handle job error
    console.error('Workflow failed:', error.message);
  }
});
```

### Finally Block for Cleanup

```javascript
let tempBranch = null;

try {
  await withGitVan(context, async () => {
    const git = useGit();

    // Create temporary branch
    tempBranch = 'temp-' + Date.now();
    await git.branch(tempBranch);

    // Do work
    await doComplexWork();
  });
} catch (error) {
  console.error('Work failed:', error);
} finally {
  // Always cleanup, even if error
  if (tempBranch) {
    await git.branch('-D', tempBranch);
    console.log('Cleaned up temporary branch');
  }
}
```

### Custom Error Classes

```javascript
class WorkflowError extends Error {
  constructor(message, step, cause) {
    super(message);
    this.name = 'WorkflowError';
    this.step = step;
    this.cause = cause;
  }
}

async function workflow() {
  try {
    await executeStep1();
    await executeStep2();
    await executeStep3();
  } catch (error) {
    throw new WorkflowError(
      'Workflow failed',
      'step2',
      error
    );
  }
}
```

---

## Retry Strategies

### Simple Retry

```javascript
async function withRetry(fn, maxRetries = 3, delayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

// Usage
await withGitVan(context, async () => {
  const git = useGit();

  const sha = await withRetry(
    () => git.push({ remote: 'origin', branch: 'main' }),
    3,  // 3 attempts
    1000  // 1 second delay
  );

  console.log('Pushed:', sha);
});
```

### Exponential Backoff

```javascript
async function withExponentialBackoff(fn, maxRetries = 5) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Calculate delay: 1s, 2s, 4s, 8s, 16s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Usage
const sha = await withExponentialBackoff(() =>
  git.push({ remote: 'origin' })
);
```

### Retry with Jitter

```javascript
async function withJitter(fn, maxRetries = 5) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Random delay between 0ms and 2^attempt * 100ms
        const maxDelay = Math.pow(2, attempt) * 100;
        const delay = Math.random() * maxDelay;
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### Conditional Retry

```javascript
function isRetryable(error) {
  // Retry on transient errors
  return (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ECONNRESET' ||
    error.code === 'TIMEOUT' ||
    error.status === 429 ||  // Rate limited
    error.status === 503     // Service unavailable
  );
}

async function withConditionalRetry(fn, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error)) {
        // Don't retry non-transient errors
        throw error;
      }

      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

---

## Graceful Degradation

### Fallback Options

```javascript
await withGitVan(context, async () => {
  const git = useGit();
  const template = useTemplate();

  let result;

  // Try to use preferred method
  try {
    result = await git.push({ remote: 'origin', branch: 'main' });
  } catch (error) {
    console.warn('Push failed, using alternative method:', error.message);

    // Fallback
    result = await git.push({ remote: 'origin', force: true });
  }

  return result;
});
```

### Partial Failure Handling

```javascript
async function processMultipleFiles(files) {
  const results = {
    succeeded: [],
    failed: []
  };

  for (const file of files) {
    try {
      const result = await processFile(file);
      results.succeeded.push(result);
    } catch (error) {
      results.failed.push({
        file,
        error: error.message
      });
    }
  }

  // Report on success
  console.log(`Processed ${results.succeeded.length}/${files.length} files`);

  if (results.failed.length > 0) {
    console.warn(`Failed to process ${results.failed.length} files:`);
    results.failed.forEach(f => {
      console.warn(`  - ${f.file}: ${f.error}`);
    });
  }

  return results;
}
```

### Default Values

```javascript
function getConfig(path, defaultValue = {}) {
  try {
    const config = loadConfigFile(path);
    return config || defaultValue;
  } catch (error) {
    console.warn(`Could not load config from ${path}, using defaults`);
    return defaultValue;
  }
}

// Usage
const config = getConfig('gitvan.config.js', {
  jobs: { dir: 'jobs' },
  templates: { dirs: ['templates'] }
});
```

---

## Error Logging and Reporting

### Structured Error Logging

```javascript
import { consola } from 'consola';

await withGitVan(context, async () => {
  const git = useGit();
  const receipt = useReceipt();

  try {
    const sha = await git.commit('test');
    console.log('Committed:', sha);
  } catch (error) {
    // Log to console
    consola.error('Commit failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Log to audit trail
    await receipt.write({
      type: 'error',
      level: 'error',
      action: 'commit',
      error: error.message,
      timestamp: new Date()
    });

    throw error;
  }
});
```

### Error Aggregation

```javascript
class ErrorCollector {
  constructor() {
    this.errors = [];
  }

  add(error, context) {
    this.errors.push({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  report() {
    if (this.hasErrors()) {
      console.error(`${this.errors.length} errors occurred:`);
      this.errors.forEach((err, i) => {
        console.error(`${i + 1}. ${err.message}`);
        if (err.context) {
          console.error(`   Context: ${JSON.stringify(err.context)}`);
        }
      });
    }
  }
}

// Usage
const collector = new ErrorCollector();

for (const file of files) {
  try {
    await processFile(file);
  } catch (error) {
    collector.add(error, { file });
  }
}

collector.report();
```

---

## Recovery Mechanisms

### State Rollback

```javascript
await withGitVan(context, async () => {
  const git = useGit();

  const initialBranch = (await git.status()).branch;

  try {
    // Do work
    await git.branch('feature/risky');
    await doRiskyOperation();
  } catch (error) {
    console.error('Operation failed, rolling back');

    // Rollback
    await git.checkout(initialBranch);

    // Clean up
    try {
      await git.branch('-D', 'feature/risky');
    } catch (cleanupError) {
      console.warn('Cleanup warning:', cleanupError.message);
    }

    throw error;
  }
});
```

### Transaction-Like Behavior

```javascript
class GitTransaction {
  constructor(git) {
    this.git = git;
    this.operations = [];
    this.initialBranch = null;
  }

  async begin() {
    this.initialBranch = (await this.git.status()).branch;
  }

  async add(operation) {
    this.operations.push(operation);
  }

  async commit() {
    try {
      for (const op of this.operations) {
        await op();
      }
      return { success: true };
    } catch (error) {
      // Rollback all operations
      await this.rollback();
      return { success: false, error: error.message };
    }
  }

  async rollback() {
    // Switch back to initial branch
    if (this.initialBranch) {
      await this.git.checkout(this.initialBranch);
    }
  }
}

// Usage
const tx = new GitTransaction(git);
await tx.begin();

await tx.add(() => git.branch('feature/new'));
await tx.add(() => updateFiles());
await tx.add(() => git.commit('feat: new'));

const result = await tx.commit();
```

---

## User-Friendly Messages

### Error Messages Best Practices

**✗ BAD - Technical and cryptic:**
```javascript
throw new Error('ENOENT: no such file or directory, open \'gitvan.config.js\'');
```

**✓ GOOD - Clear and actionable:**
```javascript
throw new Error(
  'Configuration file not found.\n' +
  'Create gitvan.config.js in your repository root with:\n' +
  '  export default { jobs: { dir: "jobs" } }'
);
```

### Contextual Error Messages

```javascript
function formatGitError(error) {
  if (error.message.includes('not a git repository')) {
    return (
      'Not a Git repository\n' +
      'Initialize with: git init'
    );
  }

  if (error.message.includes('nothing to commit')) {
    return (
      'Nothing to commit\n' +
      'Stage files with: git add .\n' +
      'Or make changes to tracked files'
    );
  }

  if (error.message.includes('CONFLICT')) {
    return (
      'Merge conflict detected\n' +
      'Resolve conflicts and run: git add .\n' +
      'Then run: git commit'
    );
  }

  return error.message;
}

try {
  await git.commit('test');
} catch (error) {
  const message = formatGitError(error);
  console.error('Git Error:\n' + message);
}
```

### Progress Reporting During Errors

```javascript
async function withErrorReporting(operation, name) {
  const startTime = Date.now();

  try {
    console.log(`Starting: ${name}`);
    const result = await operation();
    const duration = Date.now() - startTime;
    console.log(`✓ Completed: ${name} (${duration}ms)`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`✗ Failed: ${name} after ${duration}ms`);
    console.error(`  Reason: ${error.message}`);

    if (error.code) {
      console.error(`  Code: ${error.code}`);
    }

    throw error;
  }
}

// Usage
await withErrorReporting(
  () => git.push(),
  'Push to origin'
);
```

---

## Testing Error Cases

### Test Error Paths

```javascript
import { describe, it, expect } from 'vitest';

describe('Error handling', () => {
  it('should throw on invalid input', async () => {
    expect(async () => {
      await withGitVan(context, async () => {
        const git = useGit();
        await git.branch('invalid..name');
      });
    }).rejects.toThrow();
  });

  it('should provide helpful error message', async () => {
    try {
      await withGitVan({ repo: '/fake/path' }, async () => {
        const git = useGit();
        await git.status();
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('not a git repository');
    }
  });
});
```

---

## Error Recovery Checklist

Before deploying workflows:

- [ ] All async operations have try/catch
- [ ] Errors are logged with context
- [ ] Audit trail captures errors
- [ ] Retry logic for transient errors
- [ ] Graceful degradation paths
- [ ] Cleanup in finally blocks
- [ ] User-friendly error messages
- [ ] Error testing included
- [ ] Recovery documentation

---

**Last Updated**: January 9, 2026
**Version**: 4.0.1
