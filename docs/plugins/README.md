# GitVan Plugin Development Guide

GitVan v2 features a powerful hookable plugin architecture that allows developers to extend functionality at every stage of the workflow lifecycle. This guide covers everything you need to know to create, test, and share GitVan plugins.

## Overview

The GitVan plugin system is built on the [hookable](https://github.com/unjs/hookable) library, providing:

- **Lifecycle hooks** for job execution, daemon operations, and Git events
- **Event-driven architecture** for reactive plugin behavior
- **Async/await support** for complex operations
- **Error handling** and graceful degradation
- **Parallel execution** for performance-critical hooks
- **Plugin isolation** and sandboxing

## Quick Start

### 1. Basic Plugin Structure

```javascript
// plugins/my-plugin.mjs
export default {
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    'job:before': async (context) => {
      console.log(`Starting job: ${context.id}`)
    },
    'job:after': async (context) => {
      console.log(`Completed job: ${context.id} in ${context.result.duration}ms`)
    }
  }
}
```

### 2. Register Plugin

```javascript
// gitvan.config.mjs
export default {
  plugins: [
    './plugins/my-plugin.mjs',
    '@company/gitvan-slack-notifications',
    ['./plugins/metrics.mjs', { interval: 5000 }]
  ]
}
```

### 3. Install and Run

```bash
pnpm install
pnpm gitvan daemon start
```

## Architecture

### Hookable System

GitVan uses a hierarchical hook system with the following categories:

#### Job Lifecycle Hooks
- `job:before` - Called before job execution starts
- `job:after` - Called after job execution completes successfully
- `job:error` - Called when job execution fails

#### Daemon Hooks
- `daemon:start` - Called when daemon starts
- `daemon:stop` - Called when daemon stops
- `daemon:tick` - Called on each daemon tick

#### Event Hooks
- `event:detected` - Called when a git event is detected
- `event:processed` - Called after event jobs are processed

#### Cron Hooks
- `cron:schedule` - Called when cron jobs are scheduled
- `cron:execute` - Called when cron jobs are executed

#### Storage Hooks
- `receipt:write` - Called when a job receipt is written
- `receipt:read` - Called when a job receipt is read

#### Lock Management Hooks
- `lock:acquire` - Called when a job lock is acquired
- `lock:release` - Called when a job lock is released
- `lock:fail` - Called when a job lock acquisition fails

### Plugin Definition

```javascript
export default {
  // Plugin metadata
  name: 'plugin-name',
  version: '1.0.0',
  description: 'Plugin description',
  author: 'Your Name',

  // Dependencies (optional)
  dependencies: ['other-plugin'],

  // Configuration schema (optional)
  config: {
    apiKey: { type: 'string', required: true },
    enabled: { type: 'boolean', default: true }
  },

  // Setup function (optional)
  setup(options, hooks) {
    // Initialize plugin
    this.client = new APIClient(options.apiKey)

    // Register hooks programmatically
    hooks.hook('job:after', this.handleJobComplete.bind(this))
  },

  // Hook definitions
  hooks: {
    'job:before': async (context) => {
      // Hook implementation
    }
  },

  // Cleanup function (optional)
  cleanup() {
    // Cleanup resources
    this.client?.close()
  }
}
```

## Plugin Types

### 1. Notification Plugins

Send notifications to external services when events occur:

```javascript
// plugins/slack-notifications.mjs
export default {
  name: 'slack-notifications',
  hooks: {
    'job:error': async ({ id, error }) => {
      await fetch(process.env.SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ Job failed: ${id}\nError: ${error.message}`
        })
      })
    },
    'daemon:start': async () => {
      await fetch(process.env.SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🚀 GitVan daemon started'
        })
      })
    }
  }
}
```

### 2. Metrics and Analytics

Collect performance metrics and analytics:

```javascript
// plugins/metrics.mjs
export default {
  name: 'metrics-collector',
  setup(options) {
    this.metrics = new Map()
    this.startTime = Date.now()
  },
  hooks: {
    'job:before': async ({ id }) => {
      this.metrics.set(id, { startTime: Date.now() })
    },
    'job:after': async ({ id, result }) => {
      const jobMetrics = this.metrics.get(id)
      if (jobMetrics) {
        const duration = Date.now() - jobMetrics.startTime
        console.log(`📊 Job ${id}: ${duration}ms`)
        this.metrics.delete(id)
      }
    },
    'daemon:tick': async () => {
      const uptime = Date.now() - this.startTime
      console.log(`💓 Daemon uptime: ${Math.floor(uptime / 1000)}s`)
    }
  }
}
```

### 3. Storage Adapters

Extend storage capabilities with custom backends:

```javascript
// plugins/s3-storage.mjs
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export default {
  name: 's3-storage',
  setup(options) {
    this.s3 = new S3Client({
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey
      }
    })
    this.bucket = options.bucket
  },
  hooks: {
    'receipt:write': async ({ id, note, ref }) => {
      const key = `receipts/${id}/${ref}.json`
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: JSON.stringify({ id, note, ref, timestamp: new Date().toISOString() }),
        ContentType: 'application/json'
      }))
      console.log(`📦 Receipt uploaded to S3: ${key}`)
    }
  }
}
```

### 4. Authentication Plugins

Enhance security with custom authentication:

```javascript
// plugins/oauth-auth.mjs
export default {
  name: 'oauth-auth',
  setup(options) {
    this.clientId = options.clientId
    this.allowedUsers = options.allowedUsers || []
  },
  hooks: {
    'job:before': async ({ id, ctx }) => {
      // Verify user authentication
      const user = await this.validateToken(ctx.env.OAUTH_TOKEN)
      if (!this.allowedUsers.includes(user.email)) {
        throw new Error(`Unauthorized user: ${user.email}`)
      }
      ctx.user = user
    }
  },
  async validateToken(token) {
    const response = await fetch('https://api.oauth-provider.com/user', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.json()
  }
}
```

### 5. AI/LLM Integration

Enhance GitVan with AI capabilities:

```javascript
// plugins/ai-code-review.mjs
export default {
  name: 'ai-code-review',
  setup(options) {
    this.apiKey = options.openaiApiKey
  },
  hooks: {
    'event:detected': async ({ from, to, ctx }) => {
      if (ctx.isPush && ctx.changedPaths?.some(p => p.endsWith('.mjs'))) {
        await this.reviewCodeChanges(ctx)
      }
    }
  },
  async reviewCodeChanges(ctx) {
    const diff = await ctx.git.diff('HEAD~1', 'HEAD')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: `Review this code diff and suggest improvements:\n\n${diff}`
        }]
      })
    })
    const review = await response.json()
    console.log('🤖 AI Code Review:', review.choices[0].message.content)
  }
}
```

## Plugin Configuration

### Environment Variables

```bash
# .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Configuration File

```javascript
// gitvan.config.mjs
export default {
  plugins: [
    ['./plugins/slack-notifications.mjs', {
      webhook: process.env.SLACK_WEBHOOK_URL,
      channels: ['#deployments', '#errors']
    }],
    ['./plugins/metrics.mjs', {
      interval: 5000,
      exportPath: './metrics'
    }],
    ['./plugins/s3-storage.mjs', {
      region: 'us-east-1',
      bucket: 'gitvan-receipts',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }]
  ]
}
```

## Best Practices

### 1. Error Handling

Always wrap hook implementations in try-catch blocks:

```javascript
hooks: {
  'job:after': async (context) => {
    try {
      await sendNotification(context)
    } catch (error) {
      console.error('Notification failed:', error.message)
      // Don't throw - let other hooks continue
    }
  }
}
```

### 2. Performance

Use parallel hooks for independent operations:

```javascript
// This will run in parallel with other 'job:after' hooks
hooks: {
  'job:after': async (context) => {
    await Promise.all([
      sendSlackNotification(context),
      updateMetrics(context),
      backupResults(context)
    ])
  }
}
```

### 3. Configuration Validation

Validate plugin configuration on startup:

```javascript
setup(options) {
  if (!options.apiKey) {
    throw new Error('API key is required')
  }
  if (options.timeout && typeof options.timeout !== 'number') {
    throw new Error('Timeout must be a number')
  }
}
```

### 4. Resource Cleanup

Always implement cleanup for resources:

```javascript
setup(options) {
  this.interval = setInterval(() => {
    this.pingHealthcheck()
  }, 30000)
},
cleanup() {
  if (this.interval) {
    clearInterval(this.interval)
  }
}
```

### 5. Conditional Execution

Use context information to conditionally execute hooks:

```javascript
hooks: {
  'job:after': async ({ id, result, ctx }) => {
    // Only notify on production errors
    if (ctx.env.NODE_ENV === 'production' && result.error) {
      await sendAlert(result.error)
    }
  }
}
```

## Testing Plugins

### Unit Testing

```javascript
// plugins/__tests__/slack-notifications.test.mjs
import { test, expect, vi } from 'vitest'
import slackPlugin from '../slack-notifications.mjs'

test('sends notification on job error', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({})
  })

  await slackPlugin.hooks['job:error']({
    id: 'test-job',
    error: new Error('Test error')
  })

  expect(fetchSpy).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('Test error')
    })
  )
})
```

### Integration Testing

```javascript
// test plugin with real GitVan instance
import { createJobHooks } from 'gitvan/jobs/hooks'
import myPlugin from '../plugins/my-plugin.mjs'

const hooks = createJobHooks()
hooks.hook('job:before', myPlugin.hooks['job:before'])

await hooks.callHook('job:before', {
  id: 'test-job',
  payload: {},
  ctx: {}
})
```

## Publishing Plugins

### Package Structure

```
my-gitvan-plugin/
├── package.json
├── README.md
├── index.mjs          # Main plugin file
├── lib/               # Plugin implementation
├── docs/              # Documentation
└── __tests__/         # Tests
```

### Package.json

```json
{
  "name": "@company/gitvan-plugin-name",
  "version": "1.0.0",
  "type": "module",
  "main": "index.mjs",
  "keywords": ["gitvan", "plugin", "automation"],
  "peerDependencies": {
    "gitvan": "^2.0.0"
  },
  "gitvan": {
    "plugin": true,
    "hooks": ["job:before", "job:after", "event:detected"]
  }
}
```

### NPM Publishing

```bash
npm publish --access public
```

### Git Repository

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Plugin Registry

### Installing Plugins

```bash
# From npm
pnpm add @company/gitvan-slack-notifications

# From git
pnpm add github:company/gitvan-custom-plugin
```

### Plugin Discovery

GitVan automatically discovers plugins in:

1. `node_modules` with `gitvan.plugin: true` in package.json
2. Local `plugins/` directory
3. Plugins specified in `gitvan.config.mjs`

## Advanced Features

### Plugin Dependencies

```javascript
export default {
  name: 'dependent-plugin',
  dependencies: ['metrics-collector', 'slack-notifications'],
  setup(options, hooks) {
    // This plugin requires others to be loaded first
  }
}
```

### Dynamic Hook Registration

```javascript
setup(options, hooks) {
  // Register hooks based on configuration
  if (options.enableMetrics) {
    hooks.hook('job:after', this.collectMetrics.bind(this))
  }

  if (options.enableNotifications) {
    hooks.hook('job:error', this.sendAlert.bind(this))
  }
}
```

### Plugin Communication

```javascript
// Share data between plugins using context
hooks: {
  'job:before': async (context) => {
    context.pluginData = context.pluginData || {}
    context.pluginData.startTime = Date.now()
  },
  'job:after': async (context) => {
    const duration = Date.now() - context.pluginData.startTime
    console.log(`Job took ${duration}ms`)
  }
}
```

## Next Steps

- [Hooks Reference](./hooks-reference.md) - Complete hook documentation
- [Plugin Examples](./examples.md) - Real-world plugin implementations
- [API Documentation](../api/) - GitVan API reference
- [Contributing](../../CONTRIBUTING.md) - Contribute to GitVan

---

For support and questions, visit the [GitVan GitHub repository](https://github.com/sac/gitvan) or join our community discussions.