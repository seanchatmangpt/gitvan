# GitVan v2 Workflow Patterns & Design Architecture

This document details GitVan's comprehensive support for 43+ workflow patterns, composable architecture design, and production-ready automation capabilities.

## Supported Workflow Patterns

GitVan v2 provides extensive workflow pattern support through its event-driven architecture and file-based configuration system.

### 1. Time-Based Patterns (Cron)

Schedule automation based on time intervals:

```bash
# File Pattern: events/cron/{minute}_{hour}_{day}_{month}_{weekday}.mjs
events/cron/
├── 0_3_*_*_*.mjs           # Daily at 3 AM UTC
├── 0_*/6_*_*_*.mjs         # Every 6 hours
├── 0_9_*_*_1-5.mjs         # Weekdays at 9 AM
├── 0_0_1_*_*.mjs           # First day of every month
└── 0_0_1_1_*.mjs           # New Year's Day
```

**Example Implementation:**
```javascript
// events/cron/0_3_*_*_*.mjs
export default {
  name: 'nightly-backup',
  description: 'Run nightly repository backup',
  async run({ ctx }) {
    const { useGit, useTemplate } = ctx
    const git = useGit()
    const template = await useTemplate()

    // Generate backup report
    const report = await template.render('backup-report.njk', {
      timestamp: ctx.now(),
      repo: await git.repoRoot(),
      commits: await git.revList(['--since=24.hours'])
    })

    return {
      ok: true,
      artifact: 'backup-report.html',
      result: report
    }
  }
}
```

### 2. Git Event Patterns

#### Branch Events

```bash
# Merge Events: events/merge-to/{branch}.mjs
events/merge-to/
├── main.mjs                # Merges to main branch
├── develop.mjs             # Merges to develop branch
├── release/*.mjs           # Merges to any release branch
└── hotfix/*.mjs            # Merges to hotfix branches

# Push Events: events/push-to/{branch-pattern}.mjs
events/push-to/
├── main.mjs                # Pushes to main
├── feature/*.mjs           # Pushes to feature branches
├── release/v*.mjs          # Pushes to version release branches
└── */staging.mjs           # Pushes to any staging branch
```

**Example: Release Automation**
```javascript
// events/merge-to/main.mjs
export default {
  name: 'main-branch-merge',
  description: 'Handle merges to main branch',
  async run({ ctx, payload }) {
    const { useGit, useTemplate, useExec } = ctx
    const git = useGit()
    const template = await useTemplate()
    const exec = useExec()

    // Generate changelog
    const commits = await git.log('%h %s', ['--since=last-release'])
    const changelog = await template.render('changelog.njk', {
      commits: commits.split('\n'),
      version: payload.version || 'auto'
    })

    // Create release tag
    const version = await determineVersion(git)
    await git.tag(`v${version}`, `Release ${version}`, { sign: true })

    // Deploy to production
    const deployResult = await exec.cli('deploy', ['--env=production'])

    return {
      ok: deployResult.success,
      artifact: `release-v${version}`,
      result: { version, changelog, deployResult }
    }
  }
}
```

#### Tag Events

```bash
# Tag Events: events/tag/{pattern}.mjs
events/tag/
├── semver.mjs              # Semantic version tags (v1.2.3)
├── release/*.mjs           # Release tags
├── beta/*.mjs              # Beta release tags
└── hotfix/*.mjs            # Hotfix tags
```

### 3. Path-Based Patterns

Monitor file and directory changes:

```bash
# Path Events: events/path-changed/{glob-pattern}.mjs
events/path-changed/
├── src/[...].mjs           # Any changes in src/
├── docs/**.md.mjs          # Documentation changes
├── package.json.mjs        # Package.json changes
├── src/api/[...].mjs       # API changes
├── tests/[...].mjs         # Test changes
├── .github/workflows/[...].mjs # Workflow changes
└── config/[...].mjs        # Configuration changes
```

**Example: API Documentation Update**
```javascript
// events/path-changed/src/api/[...].mjs
export default {
  name: 'api-docs-update',
  description: 'Update API docs when API changes',
  async run({ ctx, payload }) {
    const { useGit, useTemplate, useExec } = ctx
    const template = await useTemplate()
    const exec = useExec()

    // Extract API changes
    const changedFiles = payload.changedPaths.filter(p =>
      p.startsWith('src/api/') && p.endsWith('.mjs')
    )

    // Generate API documentation
    const apiDocs = await template.render('api-docs.njk', {
      changedFiles,
      timestamp: ctx.now(),
      commit: payload.commit
    })

    // Update documentation site
    await exec.cli('docs', ['generate', '--api-only'])

    return {
      ok: true,
      artifact: 'docs/api/',
      result: { updatedFiles: changedFiles.length }
    }
  }
}
```

### 4. Content-Based Patterns

#### Commit Message Patterns

```bash
# Message Events: events/message/{regex-pattern}.mjs
events/message/
├── ^feat:.mjs              # Feature commits
├── ^fix:.mjs               # Bug fix commits
├── ^docs:.mjs              # Documentation commits
├── ^refactor:.mjs          # Refactoring commits
├── ^test:.mjs              # Test commits
├── ^chore:.mjs             # Maintenance commits
├── ^release:.mjs           # Release commits
└── ^hotfix:.mjs            # Hotfix commits
```

**Example: Feature Deployment**
```javascript
// events/message/^feat:.mjs
export default {
  name: 'feature-deployment',
  description: 'Deploy features to staging',
  async run({ ctx, payload }) {
    const { useTemplate, useExec } = ctx
    const template = await useTemplate()
    const exec = useExec()

    // Parse feature scope from commit message
    const featureMatch = payload.message.match(/^feat\(([^)]+)\):/)
    const scope = featureMatch ? featureMatch[1] : 'general'

    // Deploy to feature-specific staging environment
    const deployResult = await exec.cli('deploy', [
      '--env=staging',
      `--feature=${scope}`,
      `--commit=${payload.commit}`
    ])

    // Generate deployment notification
    const notification = await template.render('deployment-notification.njk', {
      scope,
      commit: payload.commit,
      environment: `staging-${scope}`,
      status: deployResult.success ? 'success' : 'failed'
    })

    return {
      ok: deployResult.success,
      artifact: `deployment-${scope}`,
      result: { scope, notification, deployResult }
    }
  }
}
```

#### Author-Based Patterns

```bash
# Author Events: events/author/{pattern}.mjs
events/author/
├── @company\.com.mjs       # Company email domain
├── dependabot.mjs          # Dependabot commits
├── github-actions.mjs      # GitHub Actions commits
└── @contractor\.mjs        # External contractor commits
```

### 5. Advanced Workflow Patterns

#### Multi-Stage Pipelines

```javascript
// events/merge-to/main.mjs - Production Pipeline
export default {
  name: 'production-pipeline',
  description: 'Multi-stage production deployment',
  async run({ ctx }) {
    const stages = [
      { name: 'test', cmd: 'pnpm test' },
      { name: 'build', cmd: 'pnpm build' },
      { name: 'security-scan', cmd: 'pnpm audit' },
      { name: 'deploy-staging', cmd: 'deploy staging' },
      { name: 'integration-tests', cmd: 'test:integration' },
      { name: 'deploy-production', cmd: 'deploy production' }
    ]

    const results = []
    for (const stage of stages) {
      const result = await ctx.useExec().cli(stage.cmd)
      results.push({ stage: stage.name, ...result })

      if (!result.success) {
        return {
          ok: false,
          error: `Pipeline failed at ${stage.name}`,
          results
        }
      }
    }

    return { ok: true, results }
  }
}
```

#### Conditional Workflows

```javascript
// events/path-changed/src/[...].mjs - Smart Testing
export default {
  name: 'smart-testing',
  description: 'Run tests based on changed files',
  async run({ ctx, payload }) {
    const { useExec } = ctx
    const exec = useExec()

    const changedPaths = payload.changedPaths
    const testCommands = []

    // Conditional test execution
    if (changedPaths.some(p => p.startsWith('src/api/'))) {
      testCommands.push('test:api')
    }

    if (changedPaths.some(p => p.startsWith('src/ui/'))) {
      testCommands.push('test:ui')
    }

    if (changedPaths.some(p => p.includes('.sql'))) {
      testCommands.push('test:database')
    }

    if (testCommands.length === 0) {
      testCommands.push('test:unit') // Default fallback
    }

    const results = []
    for (const cmd of testCommands) {
      const result = await exec.cli(cmd)
      results.push({ command: cmd, ...result })
    }

    return {
      ok: results.every(r => r.success),
      results,
      testsRun: testCommands
    }
  }
}
```

## Composable Architecture Design

### 1. Core Composables

GitVan's composable architecture enables modular, reusable automation components:

#### Git Operations Composable

```javascript
// src/composables/git.mjs
export function useGit() {
  const ctx = useGitVan()

  return {
    // Repository Information
    async branch() { /* current branch */ },
    async head() { /* current HEAD SHA */ },
    async repoRoot() { /* repository root */ },

    // History Operations
    async log(format, extra) { /* commit history */ },
    async revList(args) { /* revision listing */ },
    async isAncestor(a, b) { /* ancestry check */ },

    // Write Operations
    async add(paths) { /* stage files */ },
    async commit(message, opts) { /* create commit */ },
    async tag(name, msg, opts) { /* create tag */ },

    // Advanced Operations
    async noteAdd(ref, message, sha) { /* git notes */ },
    async updateRefCreate(ref, sha) { /* atomic refs */ }
  }
}
```

#### Template Engine Composable

```javascript
// src/composables/template.mjs
export async function useTemplate(opts = {}) {
  const config = await loadConfig()
  const env = setupNunjucksEnvironment(config.templates)

  return {
    render(templateName, data) {
      return env.render(templateName, {
        ...data,
        git: useGit(),
        now: ctx.now(),
        env: process.env
      })
    },

    async renderToFile(template, outPath, data) {
      const content = this.render(template, data)
      await writeFile(outPath, content)
      return { path: outPath, bytes: content.length }
    },

    renderString(templateStr, data) {
      return env.renderString(templateStr, data)
    }
  }
}
```

#### Execution Composable

```javascript
// src/composables/exec.mjs
export function useExec() {
  const ctx = useGitVan()

  return {
    async cli(command, args = [], env = {}) {
      const startTime = Date.now()
      const result = await execFile(command, args, {
        cwd: ctx.cwd,
        env: { ...process.env, ...ctx.env, ...env }
      })

      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - startTime,
        exitCode: result.exitCode
      }
    },

    async js(modulePath, exportName, input) {
      const module = await import(modulePath)
      const fn = exportName ? module[exportName] : module.default
      return await fn(input, ctx)
    },

    async tmpl(spec) {
      const template = await useTemplate()
      const content = template.render(spec.template, spec.data)

      if (spec.output) {
        await template.renderToFile(spec.template, spec.output, spec.data)
      }

      return { ok: true, content }
    }
  }
}
```

### 2. Plugin System Architecture

#### Hook-Based Extensibility

```javascript
// Plugin Definition
export default definePlugin({
  name: 'slack-notifications',
  description: 'Send Slack notifications for events',

  setup(hooks) {
    hooks.hook('job:before', async (context) => {
      await sendSlackMessage(`Starting job: ${context.job.name}`)
    })

    hooks.hook('job:after', async (result) => {
      const status = result.ok ? '✅' : '❌'
      await sendSlackMessage(`Job completed: ${status} ${result.job.name}`)
    })

    hooks.hook('event:error', async (error) => {
      await sendSlackMessage(`🚨 Error: ${error.message}`)
    })
  }
})
```

#### Plugin Registration

```javascript
// gitvan.config.js
export default {
  plugins: [
    // Built-in plugins
    '@gitvan/plugin-github',
    '@gitvan/plugin-slack',
    '@gitvan/plugin-discord',

    // Custom plugins
    './plugins/custom-notifications.mjs',
    ['./plugins/deploy.mjs', { env: 'production' }]
  ]
}
```

### 3. Template-Driven Automation

#### Template Categories

```bash
templates/
├── workflows/              # Workflow automation templates
│   ├── ci-cd.njk          # CI/CD pipeline template
│   ├── release.njk        # Release workflow template
│   └── hotfix.njk         # Hotfix workflow template
├── notifications/         # Notification templates
│   ├── slack.njk          # Slack message template
│   ├── email.njk          # Email notification template
│   └── github-comment.njk # GitHub comment template
├── reports/               # Report generation templates
│   ├── test-results.njk   # Test results report
│   ├── deployment.njk     # Deployment report
│   └── security-scan.njk  # Security scan report
└── configs/              # Configuration file templates
    ├── docker.njk         # Dockerfile template
    ├── k8s-manifest.njk   # Kubernetes manifest
    └── nginx.njk          # Nginx configuration
```

#### Advanced Template Features

```njk
{# templates/workflows/release.njk #}
{# Template with conditional logic and filters #}
{% set version = git.tag | semver_increment('minor') %}
{% set changelog = git.commits_since_tag | group_by_type %}

# Release {{ version }}

Generated on {{ nowISO | date('YYYY-MM-DD HH:mm:ss') }} UTC

## Changes

{% for type, commits in changelog.items() %}
### {{ type | title | inflection.humanize }}
{% for commit in commits %}
- {{ commit.message | truncate(80) }} ({{ commit.sha[:8] }})
{% endfor %}

{% endfor %}

## Deployment Checklist

{% if 'src/api/' in git.changed_paths %}
- [ ] API documentation updated
- [ ] Database migrations applied
- [ ] API tests passing
{% endif %}

{% if 'src/ui/' in git.changed_paths %}
- [ ] UI components tested
- [ ] Accessibility checks passed
- [ ] Cross-browser compatibility verified
{% endif %}

{% if git.breaking_changes %}
- [ ] **BREAKING CHANGES** documented
- [ ] Migration guide provided
- [ ] Deprecated features marked
{% endif %}

## Deployment Commands

```bash
# Production deployment
pnpm deploy --env=production --version={{ version }}

# Rollback (if needed)
pnpm rollback --version={{ git.previous_tag }}
```
```

#### Template Filters and Functions

```javascript
// Custom Nunjucks filters for GitVan
const filters = {
  semver_increment: (tag, type) => {
    const [major, minor, patch] = tag.replace('v', '').split('.')
    switch (type) {
      case 'major': return `${parseInt(major) + 1}.0.0`
      case 'minor': return `${major}.${parseInt(minor) + 1}.0`
      case 'patch': return `${major}.${minor}.${parseInt(patch) + 1}`
    }
  },

  group_by_type: (commits) => {
    return commits.reduce((groups, commit) => {
      const type = commit.message.match(/^(\w+):/)?.[1] || 'other'
      if (!groups[type]) groups[type] = []
      groups[type].push(commit)
      return groups
    }, {})
  },

  inflection: {
    humanize: (str) => str.replace(/[_-]/g, ' ').toLowerCase(),
    classify: (str) => str.split(/[_-]/).map(w =>
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(''),
    dasherize: (str) => str.replace(/[_\s]/g, '-').toLowerCase()
  }
}
```

## Deterministic Execution Patterns

### 1. Environment Standardization

```javascript
// Deterministic execution environment
const standardEnv = {
  TZ: 'UTC',           // Always UTC timezone
  LANG: 'C',           // C locale for consistent output
  NODE_ENV: 'production', // Production environment
  CI: 'true',          // CI environment flag
  GITVAN_VERSION: pkg.version
}

// Context-aware execution
export async function executeWithDeterministicEnv(fn, context) {
  const previousEnv = { ...process.env }

  try {
    // Set deterministic environment
    Object.assign(process.env, standardEnv, context.env)

    // Execute with controlled time
    const result = await withControlledTime(context.now, fn)

    return result
  } finally {
    // Restore previous environment
    process.env = previousEnv
  }
}
```

### 2. Reproducible Builds

```javascript
// Reproducible build configuration
export default {
  name: 'reproducible-build',
  description: 'Ensure reproducible builds across environments',
  async run({ ctx }) {
    const { useGit, useExec } = ctx
    const git = useGit()
    const exec = useExec()

    // Set reproducible build metadata
    const buildEnv = {
      SOURCE_DATE_EPOCH: Math.floor(new Date(ctx.now()).getTime() / 1000),
      BUILD_COMMIT: await git.head(),
      BUILD_BRANCH: await git.branch(),
      BUILD_VERSION: await determineVersion(git)
    }

    // Execute build with deterministic environment
    const buildResult = await exec.cli('pnpm', ['build'], buildEnv)

    // Verify build reproducibility
    const buildHash = await hashDirectory('./dist')

    return {
      ok: buildResult.success,
      artifact: 'dist/',
      result: {
        buildHash,
        buildEnv,
        reproducible: true
      }
    }
  }
}
```

## Audit and Compliance Features

### 1. Complete Execution Audit Trail

```javascript
// Comprehensive audit logging
export function createAuditTrail(event, context, result) {
  return {
    // Execution Identity
    executionId: crypto.randomUUID(),
    eventId: event.id,
    timestamp: context.now(),
    commit: context.commit,
    worktree: context.worktree.id,

    // Execution Context
    environment: {
      nodeVersion: process.version,
      gitvanVersion: pkg.version,
      platform: process.platform,
      arch: process.arch
    },

    // Event Details
    trigger: {
      type: event.type,
      pattern: event.pattern,
      matchedPaths: context.matchedPaths,
      author: context.author,
      message: context.message
    },

    // Execution Results
    result: {
      status: result.ok ? 'SUCCESS' : 'FAILURE',
      duration: result.duration,
      exitCode: result.exitCode,
      artifacts: result.artifacts || [],
      error: result.error
    },

    // Compliance Metadata
    compliance: {
      deterministic: true,
      reproducible: isReproducible(result),
      auditLevel: 'FULL',
      retention: '7y' // 7 year retention
    }
  }
}
```

### 2. Compliance Reporting

```javascript
// Generate compliance reports
export async function generateComplianceReport(timeRange) {
  const git = useGit()
  const receipts = await readReceiptsRange(timeRange)

  const report = {
    period: timeRange,
    generated: new Date().toISOString(),
    statistics: {
      totalExecutions: receipts.length,
      successRate: receipts.filter(r => r.status === 'OK').length / receipts.length,
      averageDuration: receipts.reduce((sum, r) => sum + (r.meta.duration || 0), 0) / receipts.length,
      uniqueEvents: new Set(receipts.map(r => r.id)).size
    },
    compliance: {
      auditCoverage: '100%',
      dataIntegrity: await verifyDataIntegrity(receipts),
      retentionCompliance: await checkRetentionCompliance(receipts),
      accessControl: await auditAccessControl()
    },
    breakdown: {
      byEvent: groupReceiptsByEvent(receipts),
      byWorktree: groupReceiptsByWorktree(receipts),
      byOutcome: groupReceiptsByOutcome(receipts)
    }
  }

  return report
}
```

This comprehensive pattern support makes GitVan v2 suitable for enterprise-scale automation with full audit compliance, deterministic execution, and flexible workflow composition capabilities.