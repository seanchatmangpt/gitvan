# GitVan Advanced Patterns

> **Version:** 3.0.0
> **Last Updated:** January 6, 2026

Advanced patterns and techniques for GitVan automation.

## Table of Contents

- [Workflow Composition](#workflow-composition)
- [Error Recovery](#error-recovery)
- [Performance Optimization](#performance-optimization)
- [Distributed Coordination](#distributed-coordination)
- [Custom Job Types](#custom-job-types)
- [Template Inheritance](#template-inheritance)
- [Dynamic Job Generation](#dynamic-job-generation)
- [Multi-Environment Deployments](#multi-environment-deployments)

---

## Workflow Composition

### Pattern: Composite Jobs

Compose complex workflows from smaller, reusable jobs.

```javascript
// jobs/deploy-full.mjs
import { withGitVan, useJob } from 'gitvan';

export default {
  meta: {
    name: "Full Deployment",
    desc: "Complete deployment pipeline",
    tags: ["deployment", "composite"]
  },

  async run(payload) {
    return await withGitVan({ cwd: process.cwd() }, async () => {
      const job = useJob();

      // Sequential execution
      await job.run('build');
      await job.run('test');
      await job.run('deploy');

      // Or parallel execution
      const results = await Promise.all([
        job.run('build'),
        job.run('test'),
        job.run('lint')
      ]);

      return { success: true, results };
    });
  }
};
```

### Pattern: DAG-Based Workflows

Define workflows as directed acyclic graphs using Turtle/RDF.

```turtle
# workflows/ci-pipeline.ttl
@prefix : <http://example.com/workflow/> .
@prefix step: <http://example.com/step/> .

:CIPipeline a :Workflow ;
  :name "CI Pipeline" ;
  :hasStep step:install ;
  :hasStep step:lint ;
  :hasStep step:test ;
  :hasStep step:build ;
  :hasStep step:deploy .

step:lint :dependsOn step:install .
step:test :dependsOn step:install .
step:build :dependsOn step:lint, step:test .
step:deploy :dependsOn step:build .
```

**Execute:**
```bash
gitvan workflow execute ci-pipeline
```

---

## Error Recovery

### Pattern: Retry with Exponential Backoff

```javascript
async function retryWithBackoff(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      const delay = Math.pow(2, attempt) * 1000; // Exponential
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export default {
  async run(payload) {
    return await retryWithBackoff(async () => {
      // Operation that might fail
      return await deployToProduction();
    }, 5);
  }
};
```

### Pattern: Graceful Degradation

```javascript
export default {
  async run(payload) {
    const { withGitVan, useJob, useReceipt } = await import('gitvan');

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const job = useJob();
      const receipt = useReceipt();

      try {
        // Try primary method
        return await deployViaCI();
      } catch (error) {
        console.warn('CI deployment failed, falling back to direct deploy');

        try {
          // Fallback method
          return await deployDirect();
        } catch (fallbackError) {
          // Record failure
          await receipt.create({
            jobId: 'deploy',
            status: 'error',
            error: { primary: error.message, fallback: fallbackError.message }
          });

          throw new Error('All deployment methods failed');
        }
      }
    });
  }
};
```

### Pattern: Circuit Breaker

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
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
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

const deployBreaker = new CircuitBreaker(5, 300000); // 5 failures, 5 min timeout

export default {
  async run(payload) {
    return await deployBreaker.execute(async () => {
      return await deploy();
    });
  }
};
```

---

## Performance Optimization

### Pattern: Batch Operations

```javascript
// Slow: Multiple Git operations
for (const file of files) {
  await git.add(file);
}

// Fast: Single batched operation
await git.add(files);
```

### Pattern: Parallel Execution

```javascript
export default {
  async run(payload) {
    const { withGitVan, useJob } = await import('gitvan');

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const job = useJob();

      // Run tests in parallel
      const testResults = await Promise.all([
        job.run('test-unit'),
        job.run('test-integration'),
        job.run('test-e2e')
      ]);

      // All tests must pass
      const allPassed = testResults.every(r => r.success);

      return { success: allPassed, results: testResults };
    });
  }
};
```

### Pattern: Caching

```javascript
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour

async function cached(key, fn) {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.value;
  }

  const value = await fn();
  cache.set(key, { value, timestamp: now });
  return value;
}

export default {
  async run(payload) {
    return await cached('expensive-operation', async () => {
      return await expensiveComputation();
    });
  }
};
```

### Pattern: Streaming Large Files

```javascript
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export default {
  async run(payload) {
    // Stream instead of loading entire file
    await pipeline(
      createReadStream('large-file.txt'),
      transform(),
      createWriteStream('output.txt')
    );
  }
};
```

---

## Distributed Coordination

### Pattern: Leader Election

```javascript
export default {
  async run(payload) {
    const { withGitVan, useLock } = await import('gitvan');

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const lock = useLock();

      const lockResult = await lock.acquire('leader-election', {
        timeout: 30000,
        ttl: 60000
      });

      if (!lockResult.acquired) {
        console.log('Another instance is leader, skipping...');
        return { success: true, role: 'follower' };
      }

      try {
        console.log('I am the leader, executing...');
        const result = await executeLeaderTask();
        return { success: true, role: 'leader', result };
      } finally {
        await lock.release('leader-election');
      }
    });
  }
};
```

### Pattern: Work Queue

```javascript
// Producer job
export default {
  meta: { name: "Queue Producer" },
  async run(payload) {
    const tasks = generateTasks(); // Array of task objects

    for (const task of tasks) {
      await queueTask(task);
    }

    return { success: true, queued: tasks.length };
  }
};

// Consumer job
export default {
  meta: { name: "Queue Consumer" },
  async run(payload) {
    const { withGitVan, useLock } = await import('gitvan');

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const lock = useLock();

      while (true) {
        const task = await dequeueTask();
        if (!task) break;

        const lockResult = await lock.acquire(`task-${task.id}`);
        if (!lockResult.acquired) continue; // Another worker got it

        try {
          await processTask(task);
        } finally {
          await lock.release(`task-${task.id}`);
        }
      }
    });
  }
};
```

---

## Custom Job Types

### Pattern: Abstract Base Job

```javascript
// base-deploy-job.mjs
export class BaseDeployJob {
  constructor(environment) {
    this.environment = environment;
  }

  async run(payload) {
    const { withGitVan, useGit, useLock, useReceipt } = await import('gitvan');

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const git = useGit();
      const lock = useLock();
      const receipt = useReceipt();

      // Pre-deploy checks
      await this.preDeployChecks(git);

      // Acquire lock
      const lockResult = await lock.acquire(`deploy-${this.environment}`);
      if (!lockResult.acquired) {
        throw new Error('Deployment already in progress');
      }

      try {
        // Execute deployment
        const result = await this.deploy(payload);

        // Create receipt
        await receipt.create({
          jobId: `deploy-${this.environment}`,
          status: 'success',
          artifacts: result.artifacts
        });

        return result;
      } finally {
        await lock.release(`deploy-${this.environment}`);
      }
    });
  }

  async preDeployChecks(git) {
    const isClean = await git.isClean();
    if (!isClean) {
      throw new Error('Working directory not clean');
    }
  }

  async deploy(payload) {
    throw new Error('deploy() must be implemented by subclass');
  }
}

// staging-deploy.mjs
import { BaseDeployJob } from './base-deploy-job.mjs';

class StagingDeployJob extends BaseDeployJob {
  constructor() {
    super('staging');
  }

  async deploy(payload) {
    // Staging-specific deployment
    return await deployToStaging(payload);
  }
}

export default new StagingDeployJob();
```

---

## Template Inheritance

### Pattern: Template Extends

```nunjucks
{# base-job.njk #}
/**
 * @name {{ jobName }}
 * @desc {{ description }}
 */
export default {
  meta: {
    name: "{{ jobName }}",
    desc: "{{ description }}",
    tags: {{ tags | dump }}
  },

  async run(payload) {
    {% block runMethod %}
    // Default implementation
    console.log("Running {{ jobName }}...");
    {% endblock %}

    return { success: true };
  }
};

{# deploy-job.njk #}
{% extends "base-job.njk" %}

{% block runMethod %}
// Deployment-specific implementation
const result = await deploy(payload);
return result;
{% endblock %}
```

---

## Dynamic Job Generation

### Pattern: Job Factory

```javascript
export default {
  meta: { name: "Job Factory" },

  async run(payload) {
    const { withGitVan, useTemplate, useFileSystem } = await import('gitvan');

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const template = await useTemplate({ paths: ['templates'] });
      const fs = useFileSystem();

      const jobs = payload.jobs || [];

      for (const jobSpec of jobs) {
        const jobCode = await template.render('job-template.njk', jobSpec);
        await fs.write(`jobs/${jobSpec.name}.mjs`, jobCode);
      }

      return { success: true, generated: jobs.length };
    });
  }
};
```

---

## Multi-Environment Deployments

### Pattern: Environment-Specific Configuration

```javascript
const ENVIRONMENTS = {
  staging: {
    apiUrl: 'https://staging-api.example.com',
    replicas: 2,
    timeout: 300000
  },
  production: {
    apiUrl: 'https://api.example.com',
    replicas: 5,
    timeout: 600000
  }
};

export default {
  async run(payload) {
    const env = payload.environment || 'staging';
    const config = ENVIRONMENTS[env];

    if (!config) {
      throw new Error(`Unknown environment: ${env}`);
    }

    return await deploy(config);
  }
};
```

### Pattern: Blue-Green Deployment

```javascript
export default {
  meta: { name: "Blue-Green Deploy" },

  async run(payload) {
    const { withGitVan, useGit } = await import('gitvan');

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const git = useGit();

      // Get current version
      const currentVersion = await getCurrentVersion();
      const newColor = currentVersion.color === 'blue' ? 'green' : 'blue';

      // Deploy to new color
      await deployToEnvironment(newColor, payload.version);

      // Run smoke tests
      await runSmokeTests(newColor);

      // Switch traffic
      await switchTraffic(newColor);

      // Create tag
      await git.tag(`deploy-${newColor}-${payload.version}`);

      return {
        success: true,
        previousColor: currentVersion.color,
        newColor,
        version: payload.version
      };
    });
  }
};
```

---

## See Also

- [Complete API Reference](../api/complete-reference.md)
- [Configuration Guide](../configuration.md)
- [Architecture Deep Dive](./architecture.md)
