# GitVan v2 Events System

Comprehensive guide to GitVan's event-driven automation system, including event types, triggers, handlers, and payload structures.

## Table of Contents

- [Events Overview](#events-overview)
- [Event Types](#event-types)
- [Event Structure](#event-structure)
- [Event Handlers](#event-handlers)
- [Event Payloads](#event-payloads)
- [Event Discovery](#event-discovery)
- [Event Triggering](#event-triggering)
- [Event Lifecycle](#event-lifecycle)
- [Writing Event Handlers](#writing-event-handlers)
- [Event Examples](#event-examples)
- [Advanced Event Patterns](#advanced-event-patterns)

## Events Overview

GitVan's event system provides a powerful way to trigger automation based on Git operations, time-based schedules, and custom conditions. Events are the foundation of GitVan's reactive automation capabilities.

### Key Concepts

- **Event Types**: Different categories of events (cron, git, custom)
- **Event Handlers**: Jobs or functions that respond to events
- **Event Payloads**: Data passed to event handlers
- **Event Discovery**: How GitVan finds and registers events
- **Event Triggering**: How events are fired and processed

## Event Types

### 1. Cron Events

Time-based events triggered by cron expressions.

**File Pattern**: `events/cron/{expression}.mjs`
**Example**: `events/cron/0_3_*_*_*.mjs` → `"0 3 * * *"` (3 AM daily)

```javascript
// events/cron/0_3_*_*_*.mjs
export default {
  name: 'Daily Backup',
  description: 'Triggers daily backup at 3 AM',
  type: 'cron',
  pattern: '0 3 * * *',
  
  job: 'backup-job',
  
  // Optional: Custom payload
  payload: {
    target: 'production',
    retention: '7d'
  },
  
  // Optional: Conditions
  when: {
    branch: 'main',
    environment: 'production'
  }
};
```

### 2. Git Events

Events triggered by Git operations.

#### Merge Events
**File Pattern**: `events/merge-to/{branch}.mjs`

```javascript
// events/merge-to/main.mjs
export default {
  name: 'Merge to Main',
  description: 'Triggers when merging to main branch',
  type: 'merge',
  pattern: 'main',
  branch: 'main',
  
  job: 'deploy-production',
  
  payload: {
    environment: 'production',
    branch: 'main'
  }
};
```

#### Push Events
**File Pattern**: `events/push-to/{pattern}.mjs`

```javascript
// events/push-to/feature/*.mjs
export default {
  name: 'Push to Feature Branch',
  description: 'Triggers when pushing to feature branches',
  type: 'push',
  pattern: 'feature/*',
  branch: 'feature/*',
  
  job: 'test-feature',
  
  payload: {
    environment: 'staging',
    branch: '{{ branch }}'
  }
};
```

#### Path Change Events
**File Pattern**: `events/path-changed/{pattern}.mjs`

```javascript
// events/path-changed/src/[...slug].mjs
export default {
  name: 'Source Code Changed',
  description: 'Triggers when source code changes',
  type: 'path',
  pattern: 'src/**',
  
  job: 'lint-and-test',
  
  payload: {
    changedFiles: '{{ changedFiles }}',
    patterns: ['src/**']
  }
};
```

#### Tag Events
**File Pattern**: `events/tag/{pattern}.mjs`

```javascript
// events/tag/semver.mjs
export default {
  name: 'Semantic Version Tag',
  description: 'Triggers on semantic version tags',
  type: 'tag',
  pattern: 'v*.*.*',
  
  job: 'create-release',
  
  payload: {
    version: '{{ tag }}',
    releaseType: '{{ releaseType }}'
  }
};
```

#### Message Events
**File Pattern**: `events/message/{regex}.mjs`

```javascript
// events/message/^release:/.mjs
export default {
  name: 'Release Commit Message',
  description: 'Triggers on release commit messages',
  type: 'message',
  pattern: '^release:',
  regex: /^release:/,
  
  job: 'prepare-release',
  
  payload: {
    message: '{{ message }}',
    version: '{{ version }}'
  }
};
```

#### Author Events
**File Pattern**: `events/author/{pattern}.mjs`

```javascript
// events/author/@company\.com/.mjs
export default {
  name: 'Company Author',
  description: 'Triggers on commits by company authors',
  type: 'author',
  pattern: '@company\\.com',
  regex: /@company\.com/,
  
  job: 'notify-team',
  
  payload: {
    author: '{{ author }}',
    email: '{{ email }}'
  }
};
```

### 3. Custom Events

User-defined events triggered programmatically.

**File Pattern**: `events/custom/{name}.mjs`

```javascript
// events/custom/deployment-complete.mjs
export default {
  name: 'Deployment Complete',
  description: 'Triggers when deployment completes',
  type: 'custom',
  
  job: 'notify-deployment',
  
  payload: {
    environment: '{{ environment }}',
    version: '{{ version }}',
    status: '{{ status }}'
  }
};
```

## Event Structure

### Event Definition Schema

```typescript
interface EventDefinition {
  // Basic metadata
  name: string;
  description: string;
  type: 'cron' | 'merge' | 'push' | 'path' | 'tag' | 'message' | 'author' | 'custom';
  pattern: string;
  
  // Git-specific fields
  branch?: string;
  regex?: RegExp;
  
  // Handler
  job?: string;
  run?: Function;
  
  // Payload and conditions
  payload?: any;
  when?: EventConditions;
  
  // Metadata
  version?: string;
  tags?: string[];
  enabled?: boolean;
}

interface EventConditions {
  branch?: string | string[];
  environment?: string;
  user?: string;
  time?: {
    start?: string;
    end?: string;
  };
  custom?: Record<string, any>;
}
```

### Event File Structure

```javascript
/**
 * GitVan Event: {Event Name}
 * {Event Description}
 */

export default {
  // Required fields
  name: 'Event Name',
  description: 'Event description',
  type: 'event-type',
  pattern: 'event-pattern',
  
  // Handler (choose one)
  job: 'job-id',           // Reference to a job
  run: async ({ payload, ctx }) => { /* direct handler */ },
  
  // Optional fields
  payload: {
    // Default payload data
  },
  
  when: {
    // Conditional execution
    branch: 'main',
    environment: 'production'
  },
  
  version: '1.0.0',
  tags: ['tag1', 'tag2'],
  enabled: true
};
```

## Event Handlers

Event handlers can be implemented in two ways:

### 1. Job References

Reference an existing job by ID:

```javascript
// events/cron/daily-backup.mjs
export default {
  name: 'Daily Backup',
  type: 'cron',
  pattern: '0 3 * * *',
  job: 'backup-job'  // References jobs/backup-job.mjs
};
```

### 2. Direct Handlers

Define the handler directly in the event:

```javascript
// events/custom/quick-notification.mjs
export default {
  name: 'Quick Notification',
  type: 'custom',
  
  async run({ payload, ctx }) {
    const { message, channel } = payload;
    
    // Send notification
    await sendNotification(channel, message);
    
    return {
      success: true,
      message: 'Notification sent'
    };
  }
};
```

## Event Payloads

Event payloads contain data passed to event handlers. They can include:

### Standard Payload Fields

```typescript
interface EventPayload {
  // Event metadata
  eventId: string;
  eventName: string;
  eventType: string;
  timestamp: string;
  
  // Git context
  commit: string;
  branch: string;
  author: string;
  message: string;
  
  // Custom data
  [key: string]: any;
}
```

### Payload Examples

#### Cron Event Payload

```javascript
{
  eventId: 'cron/0_3_*_*_*',
  eventName: 'Daily Backup',
  eventType: 'cron',
  timestamp: '2024-01-15T03:00:00.000Z',
  
  // Cron-specific
  cronExpression: '0 3 * * *',
  nextRun: '2024-01-16T03:00:00.000Z',
  
  // Custom payload
  target: 'production',
  retention: '7d'
}
```

#### Git Event Payload

```javascript
{
  eventId: 'merge-to/main',
  eventName: 'Merge to Main',
  eventType: 'merge',
  timestamp: '2024-01-15T10:30:00.000Z',
  
  // Git context
  commit: 'abc123def456',
  branch: 'main',
  author: 'John Doe <john@example.com>',
  message: 'Merge feature/user-auth',
  
  // Merge-specific
  sourceBranch: 'feature/user-auth',
  mergeCommit: 'def456ghi789',
  
  // Custom payload
  environment: 'production'
}
```

#### Path Change Payload

```javascript
{
  eventId: 'path-changed/src/[...slug]',
  eventName: 'Source Code Changed',
  eventType: 'path',
  timestamp: '2024-01-15T14:20:00.000Z',
  
  // Git context
  commit: 'abc123def456',
  branch: 'feature/new-feature',
  author: 'Jane Smith <jane@example.com>',
  message: 'Add new user component',
  
  // Path-specific
  changedFiles: [
    'src/components/User.tsx',
    'src/hooks/useUser.ts',
    'src/types/user.ts'
  ],
  patterns: ['src/**'],
  
  // Custom payload
  patterns: ['src/**']
}
```

## Event Discovery

GitVan automatically discovers events by scanning the `events/` directory:

### Discovery Process

1. **Scan Directory**: Recursively scan `events/` directory
2. **Parse File Paths**: Extract event type and pattern from file path
3. **Load Definitions**: Import event definition files
4. **Validate Events**: Check event structure and dependencies
5. **Register Events**: Add events to the event registry

### File Path Parsing

| File Path | Event Type | Pattern | Description |
|-----------|------------|---------|-------------|
| `events/cron/0_3_*_*_*.mjs` | `cron` | `0 3 * * *` | Daily at 3 AM |
| `events/merge-to/main.mjs` | `merge` | `main` | Merge to main |
| `events/push-to/feature/*.mjs` | `push` | `feature/*` | Push to feature branches |
| `events/path-changed/src/[...slug].mjs` | `path` | `src/**` | Source code changes |
| `events/tag/v*.mjs` | `tag` | `v*` | Version tags |
| `events/message/^release:/.mjs` | `message` | `^release:` | Release messages |
| `events/author/@company\.com/.mjs` | `author` | `@company\.com` | Company authors |
| `events/custom/my-event.mjs` | `custom` | `my-event` | Custom event |

## Event Triggering

### Automatic Triggering

Events are triggered automatically based on their type:

- **Cron Events**: Triggered by the scheduler at specified times
- **Git Events**: Triggered by Git hooks or daemon polling
- **Custom Events**: Triggered programmatically

### Manual Triggering

Trigger events manually using the `useEvent` composable:

```javascript
import { useEvent } from './src/composables/event.mjs';

const event = useEvent();

// Trigger event with payload
await event.trigger('deployment-complete', {
  environment: 'production',
  version: 'v1.2.3',
  status: 'success'
});
```

### Event Simulation

Simulate events to test handlers:

```javascript
const simulation = await event.simulate('merge-to/main', {
  branch: 'main',
  commit: 'abc123'
});

console.log('Event would fire:', simulation.fires);
console.log('Simulated context:', simulation.context);
```

## Event Lifecycle

### 1. Event Registration

```javascript
// Register event programmatically
await event.register('custom-event', {
  name: 'Custom Event',
  description: 'A custom event',
  type: 'custom',
  job: 'handle-custom-event'
});
```

### 2. Event Discovery

```javascript
// List all events
const events = await event.list();

// Get specific event
const eventDef = await event.get('cron/daily-backup');
```

### 3. Event Triggering

```javascript
// Trigger event
const result = await event.trigger('cron/daily-backup', {
  customData: 'value'
});
```

### 4. Event Handling

```javascript
// Event handler execution
const handlerResult = await job.run('backup-job', eventPayload);
```

### 5. Event Cleanup

```javascript
// Unregister event
await event.unregister('custom-event');
```

## Writing Event Handlers

### Job-Based Handlers

Create a job file and reference it in the event:

```javascript
// jobs/backup-job.mjs
export default {
  meta: {
    name: 'Backup Job',
    description: 'Creates system backup',
    tags: ['backup', 'maintenance']
  },

  async run({ payload, ctx }) {
    const { target, retention } = payload;
    
    // Perform backup
    const backupPath = await createBackup(target);
    
    // Clean up old backups
    await cleanupBackups(retention);
    
    return {
      success: true,
      artifacts: [backupPath],
      message: `Backup created: ${backupPath}`
    };
  }
};
```

```javascript
// events/cron/daily-backup.mjs
export default {
  name: 'Daily Backup',
  type: 'cron',
  pattern: '0 3 * * *',
  job: 'backup-job',
  
  payload: {
    target: 'production',
    retention: '7d'
  }
};
```

### Direct Handlers

Define the handler directly in the event:

```javascript
// events/custom/quick-deploy.mjs
export default {
  name: 'Quick Deploy',
  type: 'custom',
  
  async run({ payload, ctx }) {
    const { environment, version } = payload;
    
    // Deploy application
    const deployResult = await deploy(environment, version);
    
    // Send notification
    await notify(`Deployment to ${environment} completed`);
    
    return {
      success: deployResult.success,
      artifacts: deployResult.artifacts,
      message: `Deployed ${version} to ${environment}`
    };
  }
};
```

### Conditional Handlers

Use conditions to control when events fire:

```javascript
// events/merge-to/main.mjs
export default {
  name: 'Merge to Main',
  type: 'merge',
  pattern: 'main',
  
  job: 'deploy-production',
  
  when: {
    branch: 'main',
    environment: 'production',
    time: {
      start: '09:00',
      end: '17:00'
    }
  },
  
  payload: {
    environment: 'production',
    branch: 'main'
  }
};
```

## Event Examples

### Complete Automation Pipeline

```javascript
// events/merge-to/main.mjs
export default {
  name: 'Production Deployment',
  type: 'merge',
  pattern: 'main',
  
  job: 'deploy-pipeline',
  
  payload: {
    environment: 'production',
    branch: 'main',
    steps: ['test', 'build', 'deploy', 'verify']
  }
};

// jobs/deploy-pipeline.mjs
export default {
  meta: {
    name: 'Deploy Pipeline',
    description: 'Complete deployment pipeline',
    tags: ['deployment', 'pipeline']
  },

  async run({ payload, ctx }) {
    const { environment, branch, steps } = payload;
    
    const results = {};
    
    for (const step of steps) {
      console.log(`Executing step: ${step}`);
      
      switch (step) {
        case 'test':
          results.test = await runTests();
          break;
        case 'build':
          results.build = await buildApplication();
          break;
        case 'deploy':
          results.deploy = await deployToEnvironment(environment);
          break;
        case 'verify':
          results.verify = await verifyDeployment(environment);
          break;
      }
      
      if (!results[step].success) {
        throw new Error(`Step ${step} failed`);
      }
    }
    
    return {
      success: true,
      artifacts: Object.values(results).flatMap(r => r.artifacts),
      message: `Deployment to ${environment} completed successfully`
    };
  }
};
```

### Multi-Environment Deployment

```javascript
// events/push-to/staging.mjs
export default {
  name: 'Staging Deployment',
  type: 'push',
  pattern: 'staging',
  
  job: 'deploy-staging',
  
  payload: {
    environment: 'staging',
    branch: 'staging'
  }
};

// events/merge-to/main.mjs
export default {
  name: 'Production Deployment',
  type: 'merge',
  pattern: 'main',
  
  job: 'deploy-production',
  
  when: {
    branch: 'main',
    environment: 'production'
  },
  
  payload: {
    environment: 'production',
    branch: 'main'
  }
};
```

### Feature Branch Workflow

```javascript
// events/push-to/feature/*.mjs
export default {
  name: 'Feature Branch Push',
  type: 'push',
  pattern: 'feature/*',
  
  job: 'test-feature',
  
  payload: {
    environment: 'staging',
    branch: '{{ branch }}',
    feature: '{{ feature }}'
  }
};

// jobs/test-feature.mjs
export default {
  meta: {
    name: 'Test Feature',
    description: 'Run tests for feature branch',
    tags: ['testing', 'feature']
  },

  async run({ payload, ctx }) {
    const { environment, branch, feature } = payload;
    
    // Run feature-specific tests
    const testResult = await runFeatureTests(feature);
    
    // Deploy to staging
    const deployResult = await deployToStaging(branch);
    
    // Run integration tests
    const integrationResult = await runIntegrationTests(environment);
    
    return {
      success: testResult.success && deployResult.success && integrationResult.success,
      artifacts: [
        testResult.artifacts,
        deployResult.artifacts,
        integrationResult.artifacts
      ],
      message: `Feature ${feature} tested and deployed to ${environment}`
    };
  }
};
```

## Advanced Event Patterns

### Event Chaining

Chain events together for complex workflows:

```javascript
// events/custom/deployment-started.mjs
export default {
  name: 'Deployment Started',
  type: 'custom',
  
  async run({ payload, ctx }) {
    const { environment, version } = payload;
    
    // Start deployment
    const deployResult = await startDeployment(environment, version);
    
    // Trigger next event
    await event.trigger('deployment-in-progress', {
      environment,
      version,
      deployId: deployResult.id
    });
    
    return deployResult;
  }
};

// events/custom/deployment-in-progress.mjs
export default {
  name: 'Deployment In Progress',
  type: 'custom',
  
  async run({ payload, ctx }) {
    const { environment, version, deployId } = payload;
    
    // Monitor deployment
    const status = await monitorDeployment(deployId);
    
    if (status.completed) {
      await event.trigger('deployment-completed', {
        environment,
        version,
        deployId,
        status: status.success ? 'success' : 'failed'
      });
    }
    
    return status;
  }
};
```

### Event Aggregation

Aggregate multiple events into a single handler:

```javascript
// events/custom/batch-process.mjs
export default {
  name: 'Batch Process',
  type: 'custom',
  
  async run({ payload, ctx }) {
    const { events } = payload;
    
    const results = await Promise.all(
      events.map(event => processEvent(event))
    );
    
    return {
      success: results.every(r => r.success),
      results,
      message: `Processed ${events.length} events`
    };
  }
};
```

### Event Filtering

Filter events based on complex conditions:

```javascript
// events/custom/smart-deploy.mjs
export default {
  name: 'Smart Deploy',
  type: 'custom',
  
  async run({ payload, ctx }) {
    const { branch, files } = payload;
    
    // Determine deployment strategy based on changes
    const strategy = determineDeploymentStrategy(files);
    
    if (strategy === 'full') {
      await event.trigger('full-deployment', { branch });
    } else if (strategy === 'incremental') {
      await event.trigger('incremental-deployment', { branch, files });
    } else {
      await event.trigger('no-deployment', { branch, reason: 'No significant changes' });
    }
    
    return { strategy, files };
  }
};
```

This comprehensive guide covers all aspects of GitVan's event system, from basic event types to advanced patterns for complex automation workflows.
