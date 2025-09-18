# GitVan Plugin Examples

This document provides real-world examples of GitVan plugins, demonstrating common patterns and use cases. Each example includes complete implementation code, configuration, and usage instructions.

## Table of Contents

- [Notification Plugins](#notification-plugins)
  - [Slack Notifications](#slack-notifications)
  - [Discord Webhooks](#discord-webhooks)
  - [Email Alerts](#email-alerts)
- [Storage Adapters](#storage-adapters)
  - [AWS S3 Storage](#aws-s3-storage)
  - [Google Cloud Storage](#google-cloud-storage)
- [Authentication Plugins](#authentication-plugins)
  - [OAuth2 Authentication](#oauth2-authentication)
  - [API Key Validation](#api-key-validation)
- [Metrics and Analytics](#metrics-and-analytics)
  - [Performance Metrics](#performance-metrics)
  - [Custom Analytics](#custom-analytics)
- [AI Integration](#ai-integration)
  - [OpenAI Code Review](#openai-code-review)
  - [Custom AI Provider](#custom-ai-provider)

## Notification Plugins

### Slack Notifications

A comprehensive Slack integration plugin that sends notifications for various GitVan events.

```javascript
// plugins/slack-notifications.mjs
import { WebClient } from '@slack/web-api'

export default {
  name: 'slack-notifications',
  version: '1.0.0',
  description: 'Send GitVan notifications to Slack channels',

  setup(options) {
    this.slack = new WebClient(options.token)
    this.channels = options.channels || {}
    this.defaultChannel = options.defaultChannel || '#general'
    this.enabled = options.enabled !== false
    this.environments = options.environments || ['production']
  },

  hooks: {
    'daemon:start': async () => {
      if (!this.enabled) return

      await this.sendMessage({
        channel: this.channels.system || this.defaultChannel,
        text: '🚀 GitVan daemon started',
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*GitVan Daemon Started*\n:rocket: System is now monitoring for Git events\n*Host:* ${process.env.HOSTNAME || 'unknown'}\n*Time:* ${new Date().toISOString()}`
          }
        }]
      })
    },

    'daemon:stop': async () => {
      if (!this.enabled) return

      await this.sendMessage({
        channel: this.channels.system || this.defaultChannel,
        text: '⏹️ GitVan daemon stopped',
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*GitVan Daemon Stopped*\n:stop_sign: System is no longer monitoring\n*Time:* ${new Date().toISOString()}`
          }
        }]
      })
    },

    'job:before': async ({ id, ctx }) => {
      // Only notify for critical jobs
      if (!this.enabled || !ctx.meta?.critical) return

      await this.sendMessage({
        channel: this.channels.jobs || this.defaultChannel,
        text: `🔄 Starting critical job: ${id}`,
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Job Starting*\n:arrows_counterclockwise: \`${id}\`\n*Branch:* ${ctx.git?.branch || 'unknown'}\n*Trigger:* ${ctx.trigger?.type || 'manual'}`
          }
        }]
      })
    },

    'job:after': async ({ id, result, ctx }) => {
      if (!this.enabled) return

      // Only notify for production environment
      if (!this.environments.includes(ctx.env.NODE_ENV)) return

      const channel = this.channels.deployments || this.defaultChannel
      const emoji = result.ok ? '✅' : '❌'
      const status = result.ok ? 'Completed' : 'Failed'

      const blocks = [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Job ${status}*\n${emoji} \`${id}\`\n*Duration:* ${result.duration}ms\n*Branch:* ${ctx.git?.branch || 'unknown'}`
        }
      }]

      // Add artifacts information
      if (result.artifacts?.length > 0) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Artifacts:*\n${result.artifacts.map(a => `• ${a}`).join('\n')}`
          }
        })
      }

      await this.sendMessage({
        channel,
        text: `${emoji} Job ${status.toLowerCase()}: ${id}`,
        blocks
      })
    },

    'job:error': async ({ id, error, ctx }) => {
      if (!this.enabled) return

      const channel = this.channels.errors || this.defaultChannel

      await this.sendMessage({
        channel,
        text: `❌ Job failed: ${id}`,
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Job Failed*\n:x: \`${id}\`\n*Error:* ${error.message}\n*Branch:* ${ctx.git?.branch || 'unknown'}\n*Time:* ${new Date().toISOString()}`
          }
        }, {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Stack Trace:*\n\`\`\`\n${error.stack?.slice(0, 500) || 'Not available'}\n\`\`\``
          }
        }]
      })

      // Send to incident channel for critical jobs
      if (ctx.meta?.critical) {
        await this.sendMessage({
          channel: this.channels.incidents || channel,
          text: `🚨 CRITICAL JOB FAILED: ${id}`,
          blocks: [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*CRITICAL JOB FAILURE*\n:rotating_light: \`${id}\`\n*Error:* ${error.message}\n*Immediate attention required*`
            }
          }]
        })
      }
    },

    'event:detected': async ({ type, ctx }) => {
      if (!this.enabled) return

      // Only notify for main branch events
      if (ctx.branch !== 'main') return

      const channel = this.channels.git || this.defaultChannel
      let emoji = '📡'
      let description = 'Git event detected'

      switch (type) {
        case 'push':
          emoji = '📤'
          description = `Push to ${ctx.branch}`
          break
        case 'merge':
          emoji = '🔀'
          description = `Merge to ${ctx.targetBranch || ctx.branch}`
          break
        case 'tag':
          emoji = '🏷️'
          description = `Tag created: ${ctx.tag}`
          break
      }

      const blocks = [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${description}*\n${emoji} ${type.toUpperCase()}\n*Author:* ${ctx.author || 'unknown'}\n*Files changed:* ${ctx.changedPaths?.length || 0}`
        }
      }]

      if (ctx.message) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Commit Message:*\n\`\`\`\n${ctx.message.slice(0, 200)}\n\`\`\``
          }
        })
      }

      await this.sendMessage({
        channel,
        text: `${emoji} ${description}`,
        blocks
      })
    }
  },

  async sendMessage({ channel, text, blocks }) {
    try {
      await this.slack.chat.postMessage({
        channel,
        text,
        blocks
      })
    } catch (error) {
      console.error('Slack notification failed:', error.message)
    }
  }
}
```

**Configuration:**

```javascript
// gitvan.config.mjs
export default {
  plugins: [
    ['./plugins/slack-notifications.mjs', {
      token: process.env.SLACK_BOT_TOKEN,
      channels: {
        system: '#gitvan-system',
        jobs: '#deployments',
        errors: '#alerts',
        git: '#git-events',
        incidents: '#incidents'
      },
      defaultChannel: '#general',
      environments: ['production', 'staging'],
      enabled: process.env.NODE_ENV !== 'test'
    }]
  ]
}
```

---

### Discord Webhooks

Send notifications to Discord channels using webhooks.

```javascript
// plugins/discord-webhooks.mjs
export default {
  name: 'discord-webhooks',
  version: '1.0.0',
  description: 'Send GitVan notifications to Discord via webhooks',

  setup(options) {
    this.webhooks = options.webhooks || {}
    this.defaultWebhook = options.defaultWebhook
    this.botName = options.botName || 'GitVan'
    this.enabled = options.enabled !== false
  },

  hooks: {
    'job:after': async ({ id, result, ctx }) => {
      if (!this.enabled) return

      const webhook = this.webhooks.deployments || this.defaultWebhook
      if (!webhook) return

      const color = result.ok ? 0x00ff00 : 0xff0000
      const status = result.ok ? 'Success' : 'Failed'

      const embed = {
        title: `Job ${status}: ${id}`,
        color,
        fields: [
          { name: 'Duration', value: `${result.duration}ms`, inline: true },
          { name: 'Branch', value: ctx.git?.branch || 'unknown', inline: true },
          { name: 'Environment', value: ctx.env.NODE_ENV || 'unknown', inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'GitVan' }
      }

      if (result.artifacts?.length > 0) {
        embed.fields.push({
          name: 'Artifacts',
          value: result.artifacts.join(', '),
          inline: false
        })
      }

      await this.sendWebhook(webhook, {
        username: this.botName,
        embeds: [embed]
      })
    },

    'job:error': async ({ id, error, ctx }) => {
      if (!this.enabled) return

      const webhook = this.webhooks.errors || this.defaultWebhook
      if (!webhook) return

      await this.sendWebhook(webhook, {
        username: this.botName,
        embeds: [{
          title: `Job Failed: ${id}`,
          description: error.message,
          color: 0xff0000,
          fields: [
            { name: 'Branch', value: ctx.git?.branch || 'unknown', inline: true },
            { name: 'Time', value: new Date().toISOString(), inline: true }
          ],
          footer: { text: 'GitVan Error' }
        }]
      })
    }
  },

  async sendWebhook(url, payload) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Discord webhook failed:', error.message)
    }
  }
}
```

---

### Email Alerts

Send email notifications for critical events.

```javascript
// plugins/email-alerts.mjs
import nodemailer from 'nodemailer'

export default {
  name: 'email-alerts',
  version: '1.0.0',
  description: 'Send email alerts for critical GitVan events',

  setup(options) {
    this.transporter = nodemailer.createTransporter({
      host: options.smtp.host,
      port: options.smtp.port,
      secure: options.smtp.secure,
      auth: {
        user: options.smtp.user,
        pass: options.smtp.password
      }
    })

    this.from = options.from
    this.recipients = options.recipients || []
    this.criticalOnly = options.criticalOnly !== false
  },

  hooks: {
    'job:error': async ({ id, error, ctx }) => {
      // Only send for critical jobs or if criticalOnly is disabled
      if (this.criticalOnly && !ctx.meta?.critical) return

      const subject = `GitVan Alert: Job Failed - ${id}`
      const html = `
        <h2>GitVan Job Failure</h2>
        <p><strong>Job ID:</strong> ${id}</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Branch:</strong> ${ctx.git?.branch || 'unknown'}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${ctx.env.NODE_ENV || 'unknown'}</p>

        <h3>Stack Trace</h3>
        <pre>${error.stack || 'Not available'}</pre>

        <hr>
        <p><em>This is an automated message from GitVan</em></p>
      `

      await this.sendEmail({
        subject,
        html,
        priority: ctx.meta?.critical ? 'high' : 'normal'
      })
    },

    'daemon:stop': async () => {
      await this.sendEmail({
        subject: 'GitVan Daemon Stopped',
        html: `
          <h2>GitVan Daemon Alert</h2>
          <p>The GitVan daemon has stopped unexpectedly.</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Host:</strong> ${process.env.HOSTNAME || 'unknown'}</p>
          <p>Please check the system status and restart if necessary.</p>
        `,
        priority: 'high'
      })
    }
  },

  async sendEmail({ subject, html, priority = 'normal' }) {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: this.recipients.join(', '),
        subject,
        html,
        headers: {
          'X-Priority': priority === 'high' ? '1' : '3'
        }
      })
    } catch (error) {
      console.error('Email alert failed:', error.message)
    }
  }
}
```

## Storage Adapters

### AWS S3 Storage

Store job receipts and artifacts in AWS S3.

```javascript
// plugins/s3-storage.mjs
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

export default {
  name: 's3-storage',
  version: '1.0.0',
  description: 'Store GitVan receipts and artifacts in AWS S3',

  setup(options) {
    this.s3 = new S3Client({
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey
      }
    })

    this.bucket = options.bucket
    this.prefix = options.prefix || 'gitvan'
    this.backupReceipts = options.backupReceipts !== false
    this.backupArtifacts = options.backupArtifacts !== false
  },

  hooks: {
    'receipt:write': async ({ id, note, ref, receipt }) => {
      if (!this.backupReceipts) return

      const key = `${this.prefix}/receipts/${id}/${ref}.json`

      try {
        await this.s3.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: JSON.stringify(receipt, null, 2),
          ContentType: 'application/json',
          Metadata: {
            jobId: id,
            timestamp: receipt.timestamp,
            success: receipt.result.ok.toString(),
            branch: receipt.context.git?.branch || 'unknown'
          }
        }))

        console.log(`📦 Receipt backed up to S3: s3://${this.bucket}/${key}`)
      } catch (error) {
        console.error('S3 receipt backup failed:', error.message)
      }
    },

    'job:after': async ({ id, result, ctx }) => {
      if (!this.backupArtifacts || !result.artifacts?.length) return

      // Upload each artifact
      for (const artifact of result.artifacts) {
        const key = `${this.prefix}/artifacts/${id}/${artifact}`

        try {
          // Read artifact file
          const fs = await import('node:fs/promises')
          const content = await fs.readFile(artifact)

          await this.s3.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: content,
            Metadata: {
              jobId: id,
              originalPath: artifact,
              timestamp: new Date().toISOString()
            }
          }))

          console.log(`📦 Artifact uploaded to S3: s3://${this.bucket}/${key}`)
        } catch (error) {
          console.error(`S3 artifact upload failed for ${artifact}:`, error.message)
        }
      }
    }
  },

  async getReceipt(jobId, ref) {
    const key = `${this.prefix}/receipts/${jobId}/${ref}.json`

    try {
      const response = await this.s3.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      }))

      const content = await response.Body.transformToString()
      return JSON.parse(content)
    } catch (error) {
      console.error(`Failed to retrieve receipt from S3: ${error.message}`)
      return null
    }
  }
}
```

---

### Google Cloud Storage

Alternative cloud storage using Google Cloud Platform.

```javascript
// plugins/gcs-storage.mjs
import { Storage } from '@google-cloud/storage'

export default {
  name: 'gcs-storage',
  version: '1.0.0',
  description: 'Store GitVan data in Google Cloud Storage',

  setup(options) {
    this.storage = new Storage({
      projectId: options.projectId,
      keyFilename: options.keyFilename
    })

    this.bucket = this.storage.bucket(options.bucketName)
    this.prefix = options.prefix || 'gitvan'
  },

  hooks: {
    'receipt:write': async ({ id, receipt }) => {
      const fileName = `${this.prefix}/receipts/${id}/${receipt.timestamp}.json`
      const file = this.bucket.file(fileName)

      try {
        await file.save(JSON.stringify(receipt, null, 2), {
          metadata: {
            contentType: 'application/json',
            metadata: {
              jobId: id,
              timestamp: receipt.timestamp,
              success: receipt.result.ok.toString()
            }
          }
        })

        console.log(`📦 Receipt saved to GCS: gs://${this.bucket.name}/${fileName}`)
      } catch (error) {
        console.error('GCS receipt save failed:', error.message)
      }
    }
  }
}
```

## Authentication Plugins

### OAuth2 Authentication

Validate OAuth2 tokens for job execution.

```javascript
// plugins/oauth2-auth.mjs
export default {
  name: 'oauth2-auth',
  version: '1.0.0',
  description: 'OAuth2 authentication for GitVan jobs',

  setup(options) {
    this.clientId = options.clientId
    this.clientSecret = options.clientSecret
    this.tokenEndpoint = options.tokenEndpoint
    this.userInfoEndpoint = options.userInfoEndpoint
    this.requiredRoles = options.requiredRoles || []
    this.allowedUsers = options.allowedUsers || []
  },

  hooks: {
    'job:before': async ({ id, ctx }) => {
      const token = ctx.env.OAUTH_TOKEN || ctx.payload?.token

      if (!token) {
        throw new Error('OAuth token required for job execution')
      }

      try {
        const user = await this.validateToken(token)

        // Check user authorization
        if (this.allowedUsers.length > 0 && !this.allowedUsers.includes(user.email)) {
          throw new Error(`User ${user.email} not authorized for GitVan access`)
        }

        // Check role requirements
        if (this.requiredRoles.length > 0) {
          const hasRequiredRole = this.requiredRoles.some(role =>
            user.roles?.includes(role)
          )

          if (!hasRequiredRole) {
            throw new Error(`User lacks required roles: ${this.requiredRoles.join(', ')}`)
          }
        }

        // Add user info to context
        ctx.user = user
        console.log(`✅ Authenticated user: ${user.email}`)

      } catch (error) {
        console.error(`❌ Authentication failed: ${error.message}`)
        throw error
      }
    }
  },

  async validateToken(token) {
    const response = await fetch(this.userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Token validation failed: ${response.status}`)
    }

    return await response.json()
  }
}
```

---

### API Key Validation

Simple API key authentication system.

```javascript
// plugins/api-key-auth.mjs
import crypto from 'node:crypto'

export default {
  name: 'api-key-auth',
  version: '1.0.0',
  description: 'API key authentication for GitVan',

  setup(options) {
    this.validKeys = new Set(options.keys || [])
    this.keyHeader = options.keyHeader || 'X-API-Key'
    this.hashKeys = options.hashKeys === true

    // Hash keys if required
    if (this.hashKeys) {
      this.validKeys = new Set(
        Array.from(this.validKeys).map(key => this.hashKey(key))
      )
    }
  },

  hooks: {
    'job:before': async ({ ctx }) => {
      const apiKey = ctx.env[this.keyHeader] || ctx.payload?.apiKey

      if (!apiKey) {
        throw new Error('API key required')
      }

      const keyToCheck = this.hashKeys ? this.hashKey(apiKey) : apiKey

      if (!this.validKeys.has(keyToCheck)) {
        throw new Error('Invalid API key')
      }

      console.log('✅ API key authenticated')
    }
  },

  hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex')
  }
}
```

## Metrics and Analytics

### Performance Metrics

Comprehensive performance monitoring and metrics collection.

```javascript
// plugins/performance-metrics.mjs
export default {
  name: 'performance-metrics',
  version: '1.0.0',
  description: 'Collect and report GitVan performance metrics',

  setup(options) {
    this.metrics = new Map()
    this.startTime = Date.now()
    this.reportInterval = options.reportInterval || 60000 // 1 minute
    this.exportFile = options.exportFile
    this.webhookUrl = options.webhookUrl

    // Start periodic reporting
    this.intervalId = setInterval(() => {
      this.reportMetrics()
    }, this.reportInterval)
  },

  hooks: {
    'job:before': async ({ id }) => {
      this.metrics.set(`job:${id}`, {
        startTime: Date.now(),
        memoryBefore: process.memoryUsage().heapUsed
      })
    },

    'job:after': async ({ id, result }) => {
      const jobMetrics = this.metrics.get(`job:${id}`)
      if (!jobMetrics) return

      const duration = Date.now() - jobMetrics.startTime
      const memoryAfter = process.memoryUsage().heapUsed
      const memoryDelta = memoryAfter - jobMetrics.memoryBefore

      const metric = {
        jobId: id,
        duration,
        memoryDelta,
        success: result.ok,
        artifactCount: result.artifacts?.length || 0,
        timestamp: new Date().toISOString()
      }

      this.recordMetric('job.completed', metric)
      this.metrics.delete(`job:${id}`)
    },

    'job:error': async ({ id, error }) => {
      const jobMetrics = this.metrics.get(`job:${id}`)
      if (jobMetrics) {
        const duration = Date.now() - jobMetrics.startTime

        this.recordMetric('job.failed', {
          jobId: id,
          duration,
          error: error.message,
          timestamp: new Date().toISOString()
        })

        this.metrics.delete(`job:${id}`)
      }
    },

    'daemon:tick': async () => {
      const memUsage = process.memoryUsage()
      const uptime = Date.now() - this.startTime

      this.recordMetric('daemon.health', {
        uptime,
        memoryHeap: memUsage.heapUsed,
        memoryTotal: memUsage.heapTotal,
        memoryExternal: memUsage.external,
        timestamp: new Date().toISOString()
      })
    }
  },

  recordMetric(type, data) {
    if (!this.metrics.has('recorded')) {
      this.metrics.set('recorded', [])
    }

    this.metrics.get('recorded').push({
      type,
      data,
      recordedAt: Date.now()
    })
  },

  async reportMetrics() {
    const recorded = this.metrics.get('recorded') || []
    if (recorded.length === 0) return

    const report = {
      period: {
        start: new Date(Date.now() - this.reportInterval).toISOString(),
        end: new Date().toISOString()
      },
      metrics: recorded
    }

    // Export to file
    if (this.exportFile) {
      try {
        const fs = await import('node:fs/promises')
        await fs.appendFile(this.exportFile, JSON.stringify(report) + '\n')
      } catch (error) {
        console.error('Failed to export metrics:', error.message)
      }
    }

    // Send to webhook
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        })
      } catch (error) {
        console.error('Failed to send metrics webhook:', error.message)
      }
    }

    // Log summary
    const jobMetrics = recorded.filter(r => r.type.startsWith('job.'))
    const completedJobs = jobMetrics.filter(r => r.type === 'job.completed')
    const failedJobs = jobMetrics.filter(r => r.type === 'job.failed')

    console.log(`📊 Metrics Report:`)
    console.log(`  Jobs completed: ${completedJobs.length}`)
    console.log(`  Jobs failed: ${failedJobs.length}`)
    console.log(`  Total metrics: ${recorded.length}`)

    // Clear recorded metrics
    this.metrics.set('recorded', [])
  },

  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }
}
```

---

### Custom Analytics

Track custom business metrics and KPIs.

```javascript
// plugins/custom-analytics.mjs
export default {
  name: 'custom-analytics',
  version: '1.0.0',
  description: 'Track custom business metrics from GitVan events',

  setup(options) {
    this.analyticsEndpoint = options.endpoint
    this.apiKey = options.apiKey
    this.trackingId = options.trackingId
    this.events = new Map()
  },

  hooks: {
    'event:detected': async ({ type, ctx }) => {
      // Track deployment frequency
      if (ctx.branch === 'main' && type === 'push') {
        await this.trackEvent('deployment.triggered', {
          branch: ctx.branch,
          author: ctx.author,
          filesChanged: ctx.changedPaths?.length || 0,
          timestamp: new Date().toISOString()
        })
      }

      // Track feature branch activity
      if (ctx.branch?.startsWith('feature/') && type === 'push') {
        await this.trackEvent('feature.updated', {
          featureName: ctx.branch.replace('feature/', ''),
          author: ctx.author,
          timestamp: new Date().toISOString()
        })
      }
    },

    'job:after': async ({ id, result, ctx }) => {
      // Track deployment success rate
      if (id.includes('deploy')) {
        await this.trackEvent('deployment.completed', {
          success: result.ok,
          duration: result.duration,
          environment: ctx.env.NODE_ENV,
          branch: ctx.git?.branch,
          timestamp: new Date().toISOString()
        })
      }

      // Track test execution
      if (id.includes('test')) {
        await this.trackEvent('tests.executed', {
          success: result.ok,
          duration: result.duration,
          branch: ctx.git?.branch,
          timestamp: new Date().toISOString()
        })
      }
    }
  },

  async trackEvent(eventName, properties) {
    try {
      await fetch(this.analyticsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          trackingId: this.trackingId,
          event: eventName,
          properties,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Analytics tracking failed:', error.message)
    }
  }
}
```

## AI Integration

### OpenAI Code Review

Automated code review using OpenAI's GPT models.

```javascript
// plugins/openai-code-review.mjs
export default {
  name: 'openai-code-review',
  version: '1.0.0',
  description: 'AI-powered code review using OpenAI',

  setup(options) {
    this.apiKey = options.apiKey
    this.model = options.model || 'qwen3-coder:30b'
    this.maxTokens = options.maxTokens || 1000
    this.reviewComments = options.reviewComments !== false
    this.enabledBranches = options.enabledBranches || ['main', 'develop']
  },

  hooks: {
    'event:detected': async ({ type, ctx }) => {
      // Only review pushes to enabled branches
      if (type !== 'push' || !this.enabledBranches.includes(ctx.branch)) {
        return
      }

      // Only review if there are code changes
      const codeFiles = ctx.changedPaths?.filter(path =>
        path.endsWith('.js') ||
        path.endsWith('.mjs') ||
        path.endsWith('.ts') ||
        path.endsWith('.tsx') ||
        path.endsWith('.jsx')
      ) || []

      if (codeFiles.length === 0) return

      console.log(`🤖 Starting AI code review for ${codeFiles.length} files`)

      try {
        // Get the diff for review
        const { execSync } = await import('node:child_process')
        const diff = execSync('git diff HEAD~1 HEAD', {
          encoding: 'utf8',
          cwd: ctx.root
        })

        if (!diff.trim()) return

        const review = await this.reviewCode(diff, codeFiles)

        if (review) {
          console.log('🤖 AI Code Review Results:')
          console.log(review)

          // Save review as artifact
          await this.saveReview(review, ctx)
        }

      } catch (error) {
        console.error('AI code review failed:', error.message)
      }
    }
  },

  async reviewCode(diff, files) {
    const prompt = `
Review the following code changes and provide feedback on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security concerns
5. Suggestions for improvement

Changed files: ${files.join(', ')}

Diff:
\`\`\`
${diff.slice(0, 4000)} // Truncate to avoid token limits
\`\`\`

Please provide concise, actionable feedback.
`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: this.maxTokens,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content

    } catch (error) {
      console.error('OpenAI API call failed:', error.message)
      return null
    }
  },

  async saveReview(review, ctx) {
    try {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')

      const reviewsDir = path.join(ctx.root, '.gitvan', 'reviews')
      await fs.mkdir(reviewsDir, { recursive: true })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `review-${ctx.git?.head?.slice(0, 7)}-${timestamp}.md`
      const reviewPath = path.join(reviewsDir, filename)

      const content = `# AI Code Review

**Commit:** ${ctx.git?.head}
**Branch:** ${ctx.git?.branch}
**Date:** ${new Date().toISOString()}

## Review

${review}

---
*Generated by GitVan OpenAI Code Review Plugin*
`

      await fs.writeFile(reviewPath, content)
      console.log(`📄 Review saved: ${reviewPath}`)

    } catch (error) {
      console.error('Failed to save review:', error.message)
    }
  }
}
```

---

### Custom AI Provider

Generic AI provider plugin that can work with multiple AI services.

```javascript
// plugins/custom-ai-provider.mjs
export default {
  name: 'custom-ai-provider',
  version: '1.0.0',
  description: 'Generic AI provider for GitVan integration',

  setup(options) {
    this.provider = options.provider // 'openai', 'anthropic', 'ollama'
    this.baseUrl = options.baseUrl
    this.apiKey = options.apiKey
    this.model = options.model
    this.prompts = options.prompts || {}
  },

  hooks: {
    'job:error': async ({ id, error, ctx }) => {
      // AI-powered error analysis
      if (this.prompts.errorAnalysis) {
        const analysis = await this.analyzeError(error, ctx)
        if (analysis) {
          console.log(`🤖 AI Error Analysis for ${id}:`)
          console.log(analysis)
        }
      }
    },

    'event:detected': async ({ type, ctx }) => {
      // AI-powered commit message analysis
      if (this.prompts.commitAnalysis && ctx.message) {
        const analysis = await this.analyzeCommit(ctx.message, ctx)
        if (analysis) {
          console.log(`🤖 AI Commit Analysis:`)
          console.log(analysis)
        }
      }
    }
  },

  async callAI(prompt, context = {}) {
    const payload = {
      messages: [{ role: 'user', content: prompt }],
      model: this.model,
      max_tokens: 500
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content

    } catch (error) {
      console.error('AI API call failed:', error.message)
      return null
    }
  },

  async analyzeError(error, ctx) {
    const prompt = this.prompts.errorAnalysis
      .replace('{error}', error.message)
      .replace('{stack}', error.stack || '')
      .replace('{context}', JSON.stringify(ctx, null, 2))

    return await this.callAI(prompt)
  },

  async analyzeCommit(message, ctx) {
    const prompt = this.prompts.commitAnalysis
      .replace('{message}', message)
      .replace('{branch}', ctx.branch || '')
      .replace('{files}', (ctx.changedPaths || []).join(', '))

    return await this.callAI(prompt)
  }
}
```

**Configuration:**

```javascript
// gitvan.config.mjs
export default {
  plugins: [
    ['./plugins/custom-ai-provider.mjs', {
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'qwen3-coder:30b',
      prompts: {
        errorAnalysis: `
Analyze this GitVan job error and provide suggestions for resolution:

Error: {error}

Stack Trace:
{stack}

Context: {context}

Provide specific, actionable steps to resolve this issue.
        `,
        commitAnalysis: `
Analyze this commit and provide insights:

Message: {message}
Branch: {branch}
Files changed: {files}

Evaluate the commit quality and suggest improvements if needed.
        `
      }
    }]
  ]
}
```

## Plugin Testing

Each plugin should include comprehensive tests. Here's an example test setup:

```javascript
// plugins/__tests__/slack-notifications.test.mjs
import { test, expect, vi } from 'vitest'
import slackPlugin from '../slack-notifications.mjs'

// Mock the Slack WebClient
vi.mock('@slack/web-api', () => ({
  WebClient: vi.fn(() => ({
    chat: {
      postMessage: vi.fn()
    }
  }))
}))

test('plugin setup configures correctly', () => {
  const options = {
    token: 'test-token',
    channels: { errors: '#errors' },
    defaultChannel: '#general'
  }

  slackPlugin.setup(options)

  expect(slackPlugin.channels.errors).toBe('#errors')
  expect(slackPlugin.defaultChannel).toBe('#general')
})

test('job error hook sends notification', async () => {
  const mockPostMessage = vi.fn()
  slackPlugin.slack = { chat: { postMessage: mockPostMessage } }
  slackPlugin.enabled = true

  await slackPlugin.hooks['job:error']({
    id: 'test-job',
    error: new Error('Test error'),
    ctx: { git: { branch: 'main' } }
  })

  expect(mockPostMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      text: expect.stringContaining('Test error')
    })
  )
})
```

## Installation and Usage

1. **Create the plugin file** in your `plugins/` directory
2. **Install dependencies** if needed: `pnpm add @slack/web-api`
3. **Configure the plugin** in `gitvan.config.mjs`
4. **Set environment variables** for API keys and secrets
5. **Test the plugin** with unit tests
6. **Start GitVan** to activate the plugin

Each plugin demonstrates different patterns and capabilities of the GitVan plugin system. Use these examples as starting points for your own custom plugins.

---

For more information, see the [Plugin Development Guide](./README.md) and [Hooks Reference](./hooks-reference.md).