# GitVan Plugin System with Hookable

A comprehensive guide to GitVan's plugin architecture using UnJS hookable for extensible, event-driven Git workflow automation.

## Overview

GitVan's plugin system leverages **hookable** to provide a powerful, extensible architecture where plugins can hook into every aspect of the Git workflow lifecycle. This enables custom integrations, workflow patterns, performance monitoring, and security validation through a unified hook-based API.

## Table of Contents

1. [Core Hook Points](#core-hook-points)
2. [Plugin API Design](#plugin-api-design)
3. [Built-in Platform Plugins](#built-in-platform-plugins)
4. [Workflow Pattern Plugins](#workflow-pattern-plugins)
5. [Event System Integration](#event-system-integration)
6. [Performance Monitoring](#performance-monitoring)
7. [Security & Validation](#security--validation)
8. [Real Plugin Examples](#real-plugin-examples)
9. [Advanced Patterns](#advanced-patterns)

## Core Hook Points

GitVan defines strategic hook points throughout the entire workflow lifecycle:

### 1. Runtime Lifecycle Hooks

```javascript
// src/runtime/hooks.mjs
import { createHooks } from 'hookable'

export const gitvanHooks = createHooks({
  // Runtime initialization
  'runtime:init': [],
  'runtime:config:loaded': [],
  'runtime:plugins:registered': [],
  'runtime:ready': [],
  'runtime:shutdown': [],

  // Job lifecycle
  'job:before': [],
  'job:prepare': [],
  'job:validate': [],
  'job:execute': [],
  'job:after': [],
  'job:error': [],
  'job:complete': [],

  // Git operations
  'git:before:clone': [],
  'git:after:clone': [],
  'git:before:commit': [],
  'git:after:commit': [],
  'git:before:push': [],
  'git:after:push': [],
  'git:before:merge': [],
  'git:after:merge': [],

  // Template processing
  'template:before:render': [],
  'template:after:render': [],
  'template:filter:register': [],
  'template:global:register': [],

  // Event processing
  'event:discovered': [],
  'event:matched': [],
  'event:executed': [],
  'event:failed': [],

  // Plugin lifecycle
  'plugin:before:load': [],
  'plugin:after:load': [],
  'plugin:before:unload': [],
  'plugin:after:unload': []
})
```

### 2. Context-Aware Hooks

```javascript
// Context is passed to all hooks
export interface HookContext {
  git: GitContext
  config: GitVanConfig
  logger: Logger
  metrics: MetricsCollector
  template: TemplateEngine
  plugins: PluginManager
}

export interface GitContext {
  repo: string
  branch: string
  commit: string
  author: string
  message: string
  changedPaths: string[]
  isMerge: boolean
  isPush: boolean
  isTag: boolean
  tag?: string
  targetBranch?: string
}
```

## Plugin API Design

### 1. Plugin Definition Interface

```javascript
// types/plugin.d.ts
export interface GitVanPlugin {
  name: string
  version?: string
  description?: string
  dependencies?: string[]

  // Hook registration
  hooks?: HookDefinitions

  // Lifecycle methods
  setup?(context: PluginContext): Promise<void> | void
  ready?(context: PluginContext): Promise<void> | void
  cleanup?(context: PluginContext): Promise<void> | void

  // Configuration schema
  configSchema?: JSONSchema
  defaultConfig?: Record<string, any>
}

export interface HookDefinitions {
  [hookName: string]: HookHandler | HookHandler[]
}

export type HookHandler = (
  payload: any,
  context: HookContext
) => Promise<any> | any
```

### 2. Plugin Manager Implementation

```javascript
// src/runtime/plugin-manager.mjs
import { resolve } from 'pathe'
import { gitvanHooks } from './hooks.mjs'

export class PluginManager {
  constructor(config, logger) {
    this.config = config
    this.logger = logger
    this.plugins = new Map()
    this.loadedPlugins = new Set()
  }

  async loadPlugin(pluginName, options = {}) {
    await gitvanHooks.callHook('plugin:before:load', {
      name: pluginName,
      options
    })

    try {
      // Load plugin module
      const plugin = await this.resolvePlugin(pluginName)

      // Validate plugin
      this.validatePlugin(plugin)

      // Setup plugin context
      const context = this.createPluginContext(plugin, options)

      // Register hooks
      if (plugin.hooks) {
        this.registerHooks(plugin.hooks, context)
      }

      // Call setup lifecycle
      if (plugin.setup) {
        await plugin.setup(context)
      }

      this.plugins.set(pluginName, { plugin, context })
      this.loadedPlugins.add(pluginName)

      this.logger.info(`Plugin ${pluginName} loaded successfully`)

      await gitvanHooks.callHook('plugin:after:load', {
        name: pluginName,
        plugin,
        context
      })

      return plugin
    } catch (error) {
      this.logger.error(`Failed to load plugin ${pluginName}:`, error)
      throw error
    }
  }

  async resolvePlugin(pluginName) {
    const paths = [
      // Built-in plugins
      resolve('./plugins', pluginName),
      // Node modules
      pluginName,
      `gitvan-plugin-${pluginName}`,
      // Local plugins
      resolve(this.config.pluginDir || './plugins', pluginName)
    ]

    for (const path of paths) {
      try {
        const module = await import(path)
        return module.default || module
      } catch (err) {
        continue
      }
    }

    throw new Error(`Plugin ${pluginName} not found`)
  }

  registerHooks(hooks, context) {
    for (const [hookName, handlers] of Object.entries(hooks)) {
      const handlerArray = Array.isArray(handlers) ? handlers : [handlers]

      for (const handler of handlerArray) {
        gitvanHooks.hook(hookName, (payload) =>
          handler(payload, context)
        )
      }
    }
  }

  createPluginContext(plugin, options) {
    return {
      plugin,
      options,
      config: this.config,
      logger: this.logger.child({ plugin: plugin.name }),
      hooks: gitvanHooks,
      emit: (event, payload) => gitvanHooks.callHook(event, payload)
    }
  }
}
```

## Built-in Platform Plugins

### 1. GitHub Integration Plugin

```javascript
// plugins/github/index.mjs
export default {
  name: 'github',
  description: 'GitHub platform integration with advanced workflow support',

  configSchema: {
    type: 'object',
    properties: {
      token: { type: 'string' },
      owner: { type: 'string' },
      repo: { type: 'string' },
      webhooks: {
        type: 'object',
        properties: {
          events: { type: 'array', items: { type: 'string' } },
          secret: { type: 'string' }
        }
      }
    },
    required: ['token', 'owner', 'repo']
  },

  hooks: {
    'git:after:push': async (payload, { config, logger }) => {
      const { branch, commits } = payload

      // Create deployment if pushing to main
      if (branch === 'main') {
        await createGitHubDeployment({
          owner: config.owner,
          repo: config.repo,
          ref: payload.commit,
          environment: 'production'
        })
      }
    },

    'job:complete': async (payload, { config, logger }) => {
      const { job, result, metrics } = payload

      // Update commit status
      await updateCommitStatus({
        owner: config.owner,
        repo: config.repo,
        sha: payload.git.commit,
        state: result.success ? 'success' : 'failure',
        context: `gitvan/${job.name}`,
        description: `Job completed in ${metrics.duration}ms`
      })
    },

    'event:matched': async (payload, { config, logger }) => {
      // Create check run for workflow events
      const { event, context } = payload

      await createCheckRun({
        owner: config.owner,
        repo: config.repo,
        head_sha: context.commit,
        name: `GitVan: ${event.id}`,
        status: 'in_progress'
      })
    }
  },

  async setup({ config, logger, hooks }) {
    // Initialize GitHub API client
    this.github = new GitHubAPI({
      auth: config.token
    })

    // Setup webhook endpoint if configured
    if (config.webhooks) {
      await this.setupWebhooks(config.webhooks)
    }

    logger.info('GitHub plugin initialized')
  }
}

async function createGitHubDeployment(options) {
  // GitHub API deployment creation
}

async function updateCommitStatus(options) {
  // GitHub API commit status update
}

async function createCheckRun(options) {
  // GitHub API check run creation
}
```

### 2. GitLab Integration Plugin

```javascript
// plugins/gitlab/index.mjs
export default {
  name: 'gitlab',
  description: 'GitLab platform integration with CI/CD pipeline support',

  hooks: {
    'git:after:commit': async (payload, { config, logger }) => {
      // Trigger GitLab CI pipeline
      await triggerPipeline({
        projectId: config.projectId,
        ref: payload.branch,
        variables: {
          GITVAN_JOB: payload.job?.name,
          GITVAN_COMMIT: payload.commit
        }
      })
    },

    'job:error': async (payload, { config, logger }) => {
      // Create GitLab issue for failed jobs
      if (config.createIssuesOnFailure) {
        await createIssue({
          projectId: config.projectId,
          title: `GitVan Job Failed: ${payload.job.name}`,
          description: `Job failed with error: ${payload.error.message}`,
          labels: ['gitvan', 'automation', 'bug']
        })
      }
    }
  },

  async setup({ config, logger }) {
    this.gitlab = new GitLabAPI({
      host: config.host || 'https://gitlab.com',
      token: config.token
    })

    logger.info('GitLab plugin initialized')
  }
}
```

### 3. Bitbucket Integration Plugin

```javascript
// plugins/bitbucket/index.mjs
export default {
  name: 'bitbucket',
  description: 'Bitbucket platform integration with Pipelines support',

  hooks: {
    'git:before:push': async (payload, { config, logger }) => {
      // Validate branch permissions
      const canPush = await checkBranchPermissions({
        workspace: config.workspace,
        repo: config.repo,
        branch: payload.branch,
        user: payload.git.author
      })

      if (!canPush) {
        throw new Error(`No permission to push to ${payload.branch}`)
      }
    },

    'template:after:render': async (payload, { config, logger }) => {
      // Upload rendered templates as artifacts
      if (config.uploadArtifacts) {
        await uploadArtifact({
          workspace: config.workspace,
          repo: config.repo,
          commit: payload.git.commit,
          filename: payload.outputPath,
          content: payload.rendered
        })
      }
    }
  }
}
```

## Workflow Pattern Plugins

GitVan supports 43+ workflow patterns through dedicated plugins:

### 1. GitFlow Plugin

```javascript
// plugins/patterns/gitflow/index.mjs
export default {
  name: 'gitflow',
  description: 'GitFlow workflow pattern with automated branch management',

  hooks: {
    'git:before:merge': async (payload, { config, logger }) => {
      const { sourceBranch, targetBranch } = payload

      // Enforce GitFlow rules
      if (targetBranch === 'main') {
        if (!sourceBranch.startsWith('release/') && sourceBranch !== 'develop') {
          throw new Error('Only release branches and develop can merge to main')
        }
      }

      if (targetBranch === 'develop') {
        if (!sourceBranch.startsWith('feature/') &&
            !sourceBranch.startsWith('bugfix/') &&
            !sourceBranch.startsWith('hotfix/')) {
          throw new Error('Invalid branch type for develop merge')
        }
      }
    },

    'git:after:merge': async (payload, { config, logger, hooks }) => {
      const { targetBranch, sourceBranch } = payload

      // Auto-create release branch from develop
      if (targetBranch === 'develop' && config.autoRelease) {
        const version = await calculateNextVersion(payload.git)
        await hooks.emit('gitflow:create:release', {
          version,
          fromBranch: 'develop'
        })
      }

      // Auto-tag on main merge
      if (targetBranch === 'main' && sourceBranch.startsWith('release/')) {
        const version = sourceBranch.replace('release/', '')
        await hooks.emit('git:create:tag', {
          tag: `v${version}`,
          message: `Release ${version}`
        })
      }
    }
  },

  async setup({ config, logger, hooks }) {
    // Register custom gitflow hooks
    hooks.hook('gitflow:create:release', async (payload) => {
      await createBranch(`release/${payload.version}`, payload.fromBranch)
      logger.info(`Created release branch: release/${payload.version}`)
    })

    hooks.hook('gitflow:create:hotfix', async (payload) => {
      await createBranch(`hotfix/${payload.version}`, 'main')
      logger.info(`Created hotfix branch: hotfix/${payload.version}`)
    })
  }
}
```

### 2. Trunk-Based Development Plugin

```javascript
// plugins/patterns/trunk-based/index.mjs
export default {
  name: 'trunk-based',
  description: 'Trunk-based development with feature flags',

  hooks: {
    'git:before:commit': async (payload, { config, logger }) => {
      // Ensure all changes are behind feature flags
      if (config.requireFeatureFlags) {
        const hasFeatureFlags = await validateFeatureFlags(payload.changedPaths)
        if (!hasFeatureFlags) {
          throw new Error('All features must be behind feature flags')
        }
      }
    },

    'git:after:push': async (payload, { config, logger }) => {
      // Auto-deploy to staging on main push
      if (payload.branch === 'main') {
        await deployToStaging({
          commit: payload.commit,
          features: await extractFeatureFlags(payload.changedPaths)
        })
      }
    }
  }
}
```

### 3. Release Train Plugin

```javascript
// plugins/patterns/release-train/index.mjs
export default {
  name: 'release-train',
  description: 'Scheduled release train pattern',

  hooks: {
    'runtime:ready': async (payload, { config, logger, hooks }) => {
      // Schedule release trains
      if (config.schedule) {
        scheduleReleaseTrain(config.schedule, hooks)
      }
    },

    'cron:release-train': async (payload, { config, logger, hooks }) => {
      const { version, features } = await prepareRelease()

      await hooks.emit('release-train:start', {
        version,
        features,
        scheduledAt: new Date()
      })
    }
  }
}
```

## Event System Integration

### 1. Event-Driven Plugin Activation

```javascript
// src/runtime/event-plugin-bridge.mjs
export class EventPluginBridge {
  constructor(pluginManager, eventSystem) {
    this.pluginManager = pluginManager
    this.eventSystem = eventSystem
    this.setupBridge()
  }

  setupBridge() {
    // Bridge events to plugin hooks
    this.eventSystem.on('event:matched', async (event, context) => {
      await gitvanHooks.callHook('event:matched', { event, context })
    })

    this.eventSystem.on('event:executed', async (event, result) => {
      await gitvanHooks.callHook('event:executed', { event, result })
    })

    // Allow plugins to register event handlers
    gitvanHooks.hook('event:register', (handler) => {
      this.eventSystem.registerHandler(handler)
    })
  }
}
```

### 2. Dynamic Plugin Loading Based on Events

```javascript
// plugins/event-loader/index.mjs
export default {
  name: 'event-loader',
  description: 'Dynamically loads plugins based on events',

  hooks: {
    'event:discovered': async (payload, { logger, hooks }) => {
      const { event } = payload

      // Load pattern-specific plugins
      if (event.type === 'push' && event.branch.startsWith('release/')) {
        await hooks.emit('plugin:load', { name: 'release-automation' })
      }

      if (event.type === 'path' && event.pattern.includes('docs/')) {
        await hooks.emit('plugin:load', { name: 'documentation-generator' })
      }
    }
  }
}
```

## Performance Monitoring

### 1. Performance Monitoring Plugin

```javascript
// plugins/monitoring/performance/index.mjs
import { performance } from 'node:perf_hooks'

export default {
  name: 'performance-monitor',
  description: 'Comprehensive performance monitoring and metrics collection',

  hooks: {
    'job:before': async (payload, { logger }) => {
      payload._startTime = performance.now()
      payload._memoryStart = process.memoryUsage()
    },

    'job:after': async (payload, { logger, hooks }) => {
      const duration = performance.now() - payload._startTime
      const memoryEnd = process.memoryUsage()
      const memoryDelta = {
        rss: memoryEnd.rss - payload._memoryStart.rss,
        heapUsed: memoryEnd.heapUsed - payload._memoryStart.heapUsed,
        external: memoryEnd.external - payload._memoryStart.external
      }

      const metrics = {
        jobName: payload.job.name,
        duration,
        memoryDelta,
        timestamp: new Date().toISOString()
      }

      await hooks.emit('metrics:collect', metrics)

      // Alert on performance thresholds
      if (duration > 30000) { // 30 seconds
        await hooks.emit('alert:performance', {
          type: 'slow_job',
          job: payload.job.name,
          duration,
          threshold: 30000
        })
      }
    },

    'git:after:clone': async (payload, { logger }) => {
      const { repo, duration, size } = payload

      await hooks.emit('metrics:collect', {
        type: 'git_clone',
        repo,
        duration,
        sizeBytes: size,
        timestamp: new Date().toISOString()
      })
    }
  },

  async setup({ config, logger, hooks }) {
    // Setup metrics storage
    this.metrics = []

    hooks.hook('metrics:collect', (metrics) => {
      this.metrics.push(metrics)

      // Persist metrics if configured
      if (config.persist) {
        this.persistMetrics(metrics)
      }
    })

    // Periodic metrics reporting
    if (config.reportInterval) {
      setInterval(() => {
        this.generateReport()
      }, config.reportInterval)
    }
  },

  async persistMetrics(metrics) {
    // Store metrics in configured backend
  },

  generateReport() {
    const report = {
      period: new Date().toISOString(),
      totalJobs: this.metrics.length,
      averageDuration: this.calculateAverage('duration'),
      memoryTrends: this.analyzeMemoryTrends(),
      slowestJobs: this.findSlowestJobs(5)
    }

    this.logger.info('Performance Report:', report)
    return report
  }
}
```

### 2. Resource Usage Plugin

```javascript
// plugins/monitoring/resources/index.mjs
import { cpuUsage } from 'node:process'
import { freemem, totalmem } from 'node:os'

export default {
  name: 'resource-monitor',
  description: 'System resource usage monitoring',

  hooks: {
    'runtime:ready': async (payload, { config, logger, hooks }) => {
      // Start resource monitoring
      this.startMonitoring(config.interval || 5000, hooks)
    },

    'job:before': async (payload, { hooks }) => {
      payload._cpuStart = cpuUsage()
    },

    'job:after': async (payload, { hooks }) => {
      const cpuDelta = cpuUsage(payload._cpuStart)

      await hooks.emit('resource:usage', {
        job: payload.job.name,
        cpu: cpuDelta,
        memory: {
          free: freemem(),
          total: totalmem(),
          usage: (totalmem() - freemem()) / totalmem()
        }
      })
    }
  },

  startMonitoring(interval, hooks) {
    this.monitoringInterval = setInterval(() => {
      const usage = {
        timestamp: new Date().toISOString(),
        cpu: cpuUsage(),
        memory: {
          free: freemem(),
          total: totalmem(),
          process: process.memoryUsage()
        }
      }

      hooks.callHook('resource:sample', usage)
    }, interval)
  }
}
```

## Security & Validation

### 1. Security Validation Plugin

```javascript
// plugins/security/validator/index.mjs
export default {
  name: 'security-validator',
  description: 'Comprehensive security validation and compliance checking',

  hooks: {
    'git:before:commit': async (payload, { config, logger }) => {
      // Scan for secrets
      const secrets = await scanForSecrets(payload.changedPaths)
      if (secrets.length > 0) {
        throw new SecurityError('Secrets detected in commit', { secrets })
      }

      // Validate dependencies
      if (hasPackageChanges(payload.changedPaths)) {
        await validateDependencies(payload.changedPaths)
      }
    },

    'template:before:render': async (payload, { config, logger }) => {
      // Validate template data for injection attacks
      await validateTemplateData(payload.data)

      // Check template paths for directory traversal
      validateTemplatePath(payload.template)
    },

    'job:validate': async (payload, { config, logger }) => {
      const { job } = payload

      // Validate job execution permissions
      if (job.exec === 'cli') {
        await validateCommandSafety(job.cmd, job.args)
      }

      // Check resource limits
      if (job.resources) {
        validateResourceLimits(job.resources)
      }
    }
  },

  async setup({ config, logger, hooks }) {
    // Load security rules
    this.rules = await loadSecurityRules(config.rulesPath)

    // Setup audit logging
    hooks.hook('security:violation', (violation) => {
      this.auditLog.warn('Security violation detected', violation)
    })
  }
}

class SecurityError extends Error {
  constructor(message, details) {
    super(message)
    this.name = 'SecurityError'
    this.details = details
  }
}

async function scanForSecrets(paths) {
  // Implement secret scanning logic
  const secretPatterns = [
    /(?:password|pwd|pass|secret|key|token)\s*[=:]\s*["']([^"']+)["']/gi,
    /(?:api[_-]?key|apikey)\s*[=:]\s*["']([^"']+)["']/gi,
    /-----BEGIN [A-Z ]+-----[\s\S]+-----END [A-Z ]+-----/g
  ]

  // Scan files for patterns
  return []
}
```

### 2. Access Control Plugin

```javascript
// plugins/security/access-control/index.mjs
export default {
  name: 'access-control',
  description: 'Role-based access control for GitVan operations',

  hooks: {
    'job:before': async (payload, { config, logger }) => {
      const { job, user } = payload

      // Check job execution permissions
      const hasPermission = await checkPermission(user, job.name, 'execute')
      if (!hasPermission) {
        throw new AccessDeniedError(`User ${user} cannot execute job ${job.name}`)
      }
    },

    'git:before:push': async (payload, { config, logger }) => {
      const { branch, user } = payload

      // Check branch push permissions
      const canPush = await checkBranchPermission(user, branch, 'push')
      if (!canPush) {
        throw new AccessDeniedError(`User ${user} cannot push to ${branch}`)
      }
    }
  },

  async setup({ config, logger }) {
    // Load RBAC configuration
    this.roles = await loadRoleDefinitions(config.rolesPath)
    this.permissions = await loadPermissions(config.permissionsPath)
  }
}
```

## Real Plugin Examples

### 1. Slack Notification Plugin

```javascript
// plugins/notifications/slack/index.mjs
export default {
  name: 'slack-notifications',
  description: 'Slack integration for GitVan notifications',

  configSchema: {
    type: 'object',
    properties: {
      webhookUrl: { type: 'string' },
      channels: {
        type: 'object',
        properties: {
          success: { type: 'string' },
          failure: { type: 'string' },
          alerts: { type: 'string' }
        }
      }
    },
    required: ['webhookUrl']
  },

  hooks: {
    'job:complete': async (payload, { config, logger }) => {
      const { job, result, duration } = payload
      const channel = result.success ? config.channels.success : config.channels.failure

      await sendSlackMessage({
        webhook: config.webhookUrl,
        channel,
        message: {
          text: `GitVan Job ${result.success ? 'Completed' : 'Failed'}: ${job.name}`,
          attachments: [{
            color: result.success ? 'good' : 'danger',
            fields: [
              { title: 'Duration', value: `${duration}ms`, short: true },
              { title: 'Branch', value: payload.git.branch, short: true },
              { title: 'Commit', value: payload.git.commit.slice(0, 8), short: true }
            ]
          }]
        }
      })
    },

    'alert:performance': async (payload, { config, logger }) => {
      await sendSlackMessage({
        webhook: config.webhookUrl,
        channel: config.channels.alerts,
        message: {
          text: `⚠️ Performance Alert: ${payload.type}`,
          attachments: [{
            color: 'warning',
            text: `Job ${payload.job} took ${payload.duration}ms (threshold: ${payload.threshold}ms)`
          }]
        }
      })
    }
  }
}
```

### 2. Database Backup Plugin

```javascript
// plugins/utilities/db-backup/index.mjs
export default {
  name: 'database-backup',
  description: 'Automated database backup before deployments',

  hooks: {
    'event:matched': async (payload, { config, logger }) => {
      const { event } = payload

      // Backup database before production deployments
      if (event.type === 'push' && event.branch === 'main') {
        const backupId = await createDatabaseBackup({
          database: config.database,
          retentionDays: config.retentionDays || 30
        })

        logger.info(`Database backup created: ${backupId}`)

        // Store backup ID for potential rollback
        payload.backupId = backupId
      }
    },

    'job:error': async (payload, { config, logger }) => {
      // Auto-restore on deployment failure
      if (payload.backupId && config.autoRestore) {
        await restoreDatabaseBackup(payload.backupId)
        logger.info(`Database restored from backup: ${payload.backupId}`)
      }
    }
  }
}
```

### 3. Semantic Release Plugin

```javascript
// plugins/release/semantic-release/index.mjs
export default {
  name: 'semantic-release',
  description: 'Automated semantic versioning and release management',

  hooks: {
    'git:after:merge': async (payload, { config, logger, hooks }) => {
      const { targetBranch, commits } = payload

      if (targetBranch === 'main') {
        // Analyze commit messages for version bump
        const versionBump = analyzeCommits(commits)

        if (versionBump !== 'none') {
          const newVersion = await bumpVersion(versionBump)

          // Create release
          await hooks.emit('release:create', {
            version: newVersion,
            changelog: await generateChangelog(commits),
            assets: await buildReleaseAssets()
          })
        }
      }
    },

    'release:create': async (payload, { config, logger }) => {
      const { version, changelog, assets } = payload

      // Create GitHub release
      await createGitHubRelease({
        tag: `v${version}`,
        name: `Release ${version}`,
        body: changelog,
        assets
      })

      // Publish to npm if configured
      if (config.publishNpm) {
        await publishToNpm(version)
      }
    }
  }
}

function analyzeCommits(commits) {
  const breakingChanges = commits.some(c =>
    c.message.includes('BREAKING CHANGE') ||
    c.message.match(/^[^:]+!:/)
  )

  if (breakingChanges) return 'major'

  const features = commits.some(c => c.message.startsWith('feat:'))
  if (features) return 'minor'

  const fixes = commits.some(c => c.message.startsWith('fix:'))
  if (fixes) return 'patch'

  return 'none'
}
```

## Advanced Patterns

### 1. Plugin Composition

```javascript
// plugins/composed/ci-cd-pipeline/index.mjs
export default {
  name: 'ci-cd-pipeline',
  description: 'Composed CI/CD pipeline with multiple plugins',
  dependencies: ['testing', 'security-validator', 'deployment'],

  hooks: {
    'git:after:push': async (payload, { hooks, logger }) => {
      const pipeline = [
        'testing:run',
        'security:scan',
        'deployment:staging',
        'testing:e2e',
        'deployment:production'
      ]

      for (const step of pipeline) {
        try {
          await hooks.callHook(step, payload)
          logger.info(`Pipeline step completed: ${step}`)
        } catch (error) {
          logger.error(`Pipeline step failed: ${step}`, error)
          await hooks.callHook('pipeline:rollback', { step, error })
          throw error
        }
      }
    }
  }
}
```

### 2. Plugin Configuration Inheritance

```javascript
// plugins/base/platform-base/index.mjs
export default {
  name: 'platform-base',
  description: 'Base plugin for platform integrations',

  createPlatformPlugin(platformConfig) {
    return {
      ...this,
      name: `${platformConfig.name}-integration`,

      hooks: {
        ...this.hooks,
        'git:after:push': async (payload, context) => {
          // Base platform behavior
          await this.updateCommitStatus(payload, context)

          // Platform-specific behavior
          if (platformConfig.customHooks?.['git:after:push']) {
            await platformConfig.customHooks['git:after:push'](payload, context)
          }
        }
      },

      async setup(context) {
        await this.setup(context)
        if (platformConfig.setup) {
          await platformConfig.setup(context)
        }
      }
    }
  }
}
```

### 3. Dynamic Hook Registration

```javascript
// plugins/dynamic/conditional-hooks/index.mjs
export default {
  name: 'conditional-hooks',
  description: 'Dynamically register hooks based on conditions',

  async setup({ config, hooks, logger }) {
    // Register hooks based on environment
    if (process.env.NODE_ENV === 'production') {
      hooks.hook('job:before', this.productionValidation)
    }

    // Register hooks based on configuration
    if (config.enableMetrics) {
      hooks.hook('job:after', this.collectMetrics)
    }

    // Register hooks based on repository detection
    const isMonorepo = await this.detectMonorepo()
    if (isMonorepo) {
      hooks.hook('git:after:commit', this.monorepoHandling)
    }
  }
}
```

## Configuration and Best Practices

### 1. Plugin Configuration

```javascript
// gitvan.config.js
export default {
  plugins: [
    // Simple plugin loading
    'github',
    'slack-notifications',

    // Plugin with configuration
    ['performance-monitor', {
      reportInterval: 60000,
      persist: true,
      thresholds: {
        duration: 30000,
        memory: 100 * 1024 * 1024 // 100MB
      }
    }],

    // Conditional plugin loading
    ...(process.env.NODE_ENV === 'production' ? [
      ['security-validator', { strict: true }],
      'access-control'
    ] : []),

    // Platform-specific plugins
    ...detectPlatform() === 'github' ? ['github'] : [],
    ...detectPlatform() === 'gitlab' ? ['gitlab'] : []
  ],

  pluginConfig: {
    github: {
      token: process.env.GITHUB_TOKEN,
      owner: 'your-org',
      repo: 'your-repo'
    },
    'slack-notifications': {
      webhookUrl: process.env.SLACK_WEBHOOK,
      channels: {
        success: '#deployments',
        failure: '#alerts',
        alerts: '#monitoring'
      }
    }
  }
}
```

### 2. Plugin Development Best Practices

- **Single Responsibility**: Each plugin should have a focused purpose
- **Error Handling**: Always handle errors gracefully and provide meaningful messages
- **Configuration Validation**: Use JSON schemas for configuration validation
- **Logging**: Use the provided logger with appropriate levels
- **Testing**: Write comprehensive tests for plugin functionality
- **Documentation**: Document hook behaviors and configuration options
- **Performance**: Be mindful of performance impact, especially in frequent hooks
- **Security**: Validate all inputs and avoid security vulnerabilities

This comprehensive plugin system makes GitVan highly extensible while maintaining performance and security standards through hookable's robust event system.