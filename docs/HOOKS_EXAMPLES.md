# GitVan Hooks Examples

**Real-world examples and use cases for the Husky + @unrdf/hooks + Bree integration**

Version: 1.0.0
Last Updated: January 9, 2026
GitVan Version: 3.0.0+

---

## Table of Contents

1. [Code Quality Automation](#code-quality-automation)
2. [Branch Protection](#branch-protection)
3. [Dependency Management](#dependency-management)
4. [Security Scanning](#security-scanning)
5. [CI/CD Integration](#cicd-integration)
6. [Team Notifications](#team-notifications)
7. [Performance Monitoring](#performance-monitoring)
8. [Documentation Generation](#documentation-generation)
9. [Database Migrations](#database-migrations)
10. [Release Automation](#release-automation)

---

## Code Quality Automation

### Pre-Commit Linting and Formatting

**Use Case**: Enforce code quality before every commit

**Hook Definition** (`hooks/pre-commit-quality.ttl`):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

:PreCommitQuality a hook:Hook ;
  rdfs:label "Pre-commit code quality check" ;
  rdfs:comment "Run linting, formatting, and tests on staged files" ;

  hook:on [
    a git:PreCommitEvent ;
    hook:pathChanged "**/*.{js,ts,jsx,tsx,mjs}"
  ] ;

  hook:when [
    hook:all [
      # Only if staged files exist
      hook:hasStagedFiles true ;

      # Skip for merge commits
      hook:notMergeCommit true ;

      # Skip if commit message contains [skip-quality]
      hook:messageNotMatch "\\[skip-quality\\]"
    ]
  ] ;

  hook:job [
    hook:name "quality-check" ;
    hook:schedule "immediate" ;
    hook:timeout 120000  # 2 minutes
  ] .
```

**Job File** (`jobs/quality-check.mjs`):
```javascript
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { logger } from '../src/utils/logger.mjs'

export default async function qualityCheck(context = {}) {
  const startTime = Date.now()
  logger.info('🔍 Running code quality checks...')

  const results = {
    linting: null,
    formatting: null,
    tests: null
  }

  try {
    // Get staged files
    const stagedOutput = execSync('git diff --cached --name-only', {
      encoding: 'utf-8'
    })
    const stagedFiles = stagedOutput.trim().split('\n').filter(Boolean)

    if (stagedFiles.length === 0) {
      logger.info('No staged files, skipping checks')
      return { success: true, skipped: true }
    }

    logger.info(`Checking ${stagedFiles.length} staged files...`)

    // Filter JavaScript/TypeScript files
    const jsFiles = stagedFiles.filter(f =>
      /\.(js|ts|jsx|tsx|mjs)$/.test(f)
    )

    if (jsFiles.length === 0) {
      logger.info('No JS/TS files staged, skipping checks')
      return { success: true, skipped: true }
    }

    // Step 1: Check formatting with Prettier
    logger.info(`📝 Checking formatting for ${jsFiles.length} files...`)
    try {
      execSync(`npx prettier --check ${jsFiles.join(' ')}`, {
        stdio: 'pipe'
      })
      logger.info('✅ Formatting check passed')
      results.formatting = 'passed'
    } catch (error) {
      logger.error('❌ Formatting check failed')
      logger.info('💡 Run: npm run format:fix')
      results.formatting = 'failed'
      throw new Error('Formatting check failed')
    }

    // Step 2: Run ESLint
    logger.info(`🔎 Running ESLint on ${jsFiles.length} files...`)
    try {
      execSync(`npx eslint ${jsFiles.join(' ')}`, {
        stdio: 'inherit'
      })
      logger.info('✅ Linting passed')
      results.linting = 'passed'
    } catch (error) {
      logger.error('❌ Linting failed')
      logger.info('💡 Run: npm run lint:fix')
      results.linting = 'failed'
      throw new Error('Linting failed')
    }

    // Step 3: Run affected tests
    logger.info('🧪 Running affected tests...')
    try {
      execSync('npm test -- --run --passWithNoTests', {
        stdio: 'inherit'
      })
      logger.info('✅ Tests passed')
      results.tests = 'passed'
    } catch (error) {
      logger.error('❌ Tests failed')
      results.tests = 'failed'
      throw new Error('Tests failed')
    }

    const duration = Date.now() - startTime
    logger.info(`✅ All checks passed in ${duration}ms`)

    return {
      success: true,
      duration,
      filesChecked: jsFiles.length,
      results
    }

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`❌ Quality checks failed after ${duration}ms`)

    return {
      success: false,
      error: error.message,
      duration,
      results
    }
  }
}
```

**Usage**:
```bash
# Register hook
gitvan hooks register hooks/pre-commit-quality.ttl

# Test it
echo "console.log('test')" > test.js
git add test.js
git commit -m "test: quality check"
# Hook will run automatically
```

---

## Branch Protection

### Prevent Direct Pushes to Main/Production

**Use Case**: Protect main branches from direct pushes

**Hook Definition** (`hooks/pre-push-branch-protection.ttl`):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:BranchProtection a hook:Hook ;
  rdfs:label "Branch protection" ;
  rdfs:comment "Prevent direct pushes to protected branches" ;

  hook:on [
    a git:PrePushEvent ;
    hook:any [
      hook:branchName "main" ;
      hook:branchName "master" ;
      hook:branchName "production"
    ]
  ] ;

  hook:job [
    hook:name "branch-protection" ;
    hook:schedule "immediate" ;
    hook:timeout 5000
  ] .
```

**Job File** (`jobs/branch-protection.mjs`):
```javascript
import { execSync } from 'node:child_process'
import { logger } from '../src/utils/logger.mjs'

const PROTECTED_BRANCHES = ['main', 'master', 'production']
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || []

export default async function branchProtection(context = {}) {
  logger.info('🛡️  Checking branch protection...')

  try {
    // Get current branch
    const currentBranch = execSync('git branch --show-current', {
      encoding: 'utf-8'
    }).trim()

    logger.info(`Current branch: ${currentBranch}`)

    // Check if branch is protected
    if (!PROTECTED_BRANCHES.includes(currentBranch)) {
      logger.info('✅ Branch is not protected, allowing push')
      return { success: true, protected: false }
    }

    // Get user email
    const userEmail = execSync('git config user.email', {
      encoding: 'utf-8'
    }).trim()

    logger.info(`User email: ${userEmail}`)

    // Check if user is admin
    if (ADMIN_EMAILS.includes(userEmail)) {
      logger.warn(`⚠️  Admin override: ${userEmail} pushing to ${currentBranch}`)
      return {
        success: true,
        protected: true,
        adminOverride: true,
        branch: currentBranch
      }
    }

    // Block the push
    logger.error(`❌ Direct pushes to '${currentBranch}' are not allowed`)
    logger.info('💡 Create a pull request instead:')
    logger.info('   1. Create a feature branch: git checkout -b feature/my-feature')
    logger.info('   2. Push to feature branch: git push origin feature/my-feature')
    logger.info('   3. Create pull request on GitHub/GitLab')

    return {
      success: false,
      error: `Direct pushes to '${currentBranch}' are not allowed`,
      protected: true,
      branch: currentBranch
    }

  } catch (error) {
    logger.error('Branch protection check failed:', error.message)
    // Fail open (allow push) on errors to avoid blocking developers
    return { success: true, error: error.message }
  }
}
```

---

## Dependency Management

### Auto-Update Dependencies After Merge

**Use Case**: Automatically install dependencies when package.json changes

**Hook Definition** (`hooks/post-merge-deps.ttl`):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:PostMergeDeps a hook:Hook ;
  rdfs:label "Post-merge dependency update" ;

  hook:on [
    a git:PostMergeEvent ;
    hook:any [
      hook:pathChanged "package.json" ;
      hook:pathChanged "package-lock.json" ;
      hook:pathChanged "yarn.lock" ;
      hook:pathChanged "pnpm-lock.yaml"
    ]
  ] ;

  hook:job [
    hook:name "update-deps" ;
    hook:schedule "immediate" ;
    hook:timeout 300000  # 5 minutes
  ] .
```

**Job File** (`jobs/update-deps.mjs`):
```javascript
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { logger } from '../src/utils/logger.mjs'

export default async function updateDeps(context = {}) {
  logger.info('📦 Checking for dependency updates...')

  try {
    // Get changed files
    const changedFiles = execSync(
      'git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD',
      { encoding: 'utf-8' }
    ).trim().split('\n')

    logger.info(`Changed files: ${changedFiles.join(', ')}`)

    const needsUpdate = changedFiles.some(f =>
      ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(f)
    )

    if (!needsUpdate) {
      logger.info('No dependency files changed, skipping update')
      return { success: true, updated: false }
    }

    // Detect package manager
    let packageManager = 'npm'
    let installCmd = 'npm install'

    if (existsSync('pnpm-lock.yaml')) {
      packageManager = 'pnpm'
      installCmd = 'pnpm install'
    } else if (existsSync('yarn.lock')) {
      packageManager = 'yarn'
      installCmd = 'yarn install'
    }

    logger.info(`📦 Using ${packageManager} to update dependencies...`)
    logger.info(`Running: ${installCmd}`)

    // Run install
    execSync(installCmd, {
      stdio: 'inherit',
      timeout: 300000  // 5 minute timeout
    })

    logger.info('✅ Dependencies updated successfully')

    // Check for migration files (db schema changes)
    const hasMigrations = changedFiles.some(f =>
      f.includes('migration') || f.includes('schema')
    )

    if (hasMigrations) {
      logger.warn('⚠️  Database migrations detected!')
      logger.info('💡 Run: npm run db:migrate')
    }

    return {
      success: true,
      updated: true,
      packageManager,
      hasMigrations,
      changedFiles
    }

  } catch (error) {
    logger.error('❌ Dependency update failed:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}
```

---

## Security Scanning

### Secret Detection in Commits

**Use Case**: Prevent committing secrets (API keys, passwords)

**Hook Definition** (`hooks/pre-commit-secrets.ttl`):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:SecretDetection a hook:Hook ;
  rdfs:label "Secret detection" ;
  rdfs:comment "Scan commits for leaked secrets" ;

  hook:on [
    a git:PreCommitEvent
  ] ;

  hook:job [
    hook:name "secret-scan" ;
    hook:schedule "immediate" ;
    hook:timeout 30000
  ] .
```

**Job File** (`jobs/secret-scan.mjs`):
```javascript
import { execSync } from 'node:child_process'
import { logger } from '../src/utils/logger.mjs'

// Secret patterns to detect
const SECRET_PATTERNS = [
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g
  },
  {
    name: 'AWS Secret Key',
    pattern: /aws_secret_access_key\s*=\s*['"]?[A-Za-z0-9/+=]{40}['"]?/g
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g
  },
  {
    name: 'Generic API Key',
    pattern: /api[_-]?key\s*[=:]\s*['"]?[A-Za-z0-9_\-]{20,}['"]?/gi
  },
  {
    name: 'Generic Secret',
    pattern: /secret\s*[=:]\s*['"]?[A-Za-z0-9_\-]{20,}['"]?/gi
  },
  {
    name: 'Password',
    pattern: /password\s*[=:]\s*['"]?[^'"\s]{8,}['"]?/gi
  },
  {
    name: 'GitHub Token',
    pattern: /gh[ps]_[A-Za-z0-9_]{36,}/g
  },
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,}/g
  }
]

// Files to exclude from scanning
const EXCLUDED_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.min.js',
  '*.min.css'
]

export default async function secretScan(context = {}) {
  logger.info('🔒 Scanning for secrets...')

  try {
    // Get staged changes (diff)
    const diff = execSync('git diff --cached', {
      encoding: 'utf-8'
    })

    if (!diff) {
      logger.info('No staged changes to scan')
      return { success: true, scanned: 0 }
    }

    const secrets = []

    // Scan for each pattern
    for (const { name, pattern } of SECRET_PATTERNS) {
      const matches = diff.match(pattern)
      if (matches) {
        for (const match of matches) {
          // Skip if it looks like a placeholder
          if (
            match.includes('YOUR_') ||
            match.includes('EXAMPLE') ||
            match.includes('xxx') ||
            match.includes('...')
          ) {
            continue
          }

          secrets.push({
            type: name,
            value: match.substring(0, 20) + '...',  // Truncate for logging
            full: match
          })
        }
      }
    }

    if (secrets.length > 0) {
      logger.error(`❌ Found ${secrets.length} potential secrets:`)
      secrets.forEach(({ type, value }, i) => {
        logger.error(`  ${i + 1}. ${type}: ${value}`)
      })

      logger.info('\n💡 To fix:')
      logger.info('  1. Remove secrets from staged files')
      logger.info('  2. Use environment variables instead')
      logger.info('  3. Add .env files to .gitignore')
      logger.info('  4. Use git-secrets or similar tools')

      return {
        success: false,
        error: `Found ${secrets.length} potential secrets`,
        secrets: secrets.map(s => ({ type: s.type, preview: s.value }))
      }
    }

    logger.info('✅ No secrets detected')
    return {
      success: true,
      scanned: diff.split('\n').length,
      patternsChecked: SECRET_PATTERNS.length
    }

  } catch (error) {
    logger.error('Secret scan failed:', error.message)
    return { success: false, error: error.message }
  }
}
```

---

## CI/CD Integration

### Trigger CI Pipeline on Push

**Use Case**: Trigger external CI/CD pipeline when pushing

**Hook Definition** (`hooks/post-push-ci.ttl`):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:TriggerCI a hook:Hook ;
  rdfs:label "Trigger CI pipeline" ;

  hook:on [
    a git:PostPushEvent ;
    hook:branchPattern "^(main|develop|release/.*)$"
  ] ;

  hook:job [
    hook:name "trigger-ci" ;
    hook:schedule "background" ;
    hook:timeout 10000
  ] .
```

**Job File** (`jobs/trigger-ci.mjs`):
```javascript
import { execSync } from 'node:child_process'
import { logger } from '../src/utils/logger.mjs'

const CI_WEBHOOK_URL = process.env.CI_WEBHOOK_URL
const CI_API_TOKEN = process.env.CI_API_TOKEN

export default async function triggerCI(context = {}) {
  logger.info('🚀 Triggering CI pipeline...')

  if (!CI_WEBHOOK_URL) {
    logger.warn('CI_WEBHOOK_URL not configured, skipping')
    return { success: true, skipped: true }
  }

  try {
    // Get current branch and commit
    const branch = execSync('git branch --show-current', {
      encoding: 'utf-8'
    }).trim()

    const commitHash = execSync('git rev-parse HEAD', {
      encoding: 'utf-8'
    }).trim()

    const commitMessage = execSync('git log -1 --pretty=%B', {
      encoding: 'utf-8'
    }).trim()

    const author = execSync('git log -1 --pretty=%an', {
      encoding: 'utf-8'
    }).trim()

    logger.info(`Branch: ${branch}`)
    logger.info(`Commit: ${commitHash.substring(0, 8)}`)
    logger.info(`Author: ${author}`)

    // Trigger CI webhook
    const payload = {
      branch,
      commit: commitHash,
      message: commitMessage,
      author,
      timestamp: new Date().toISOString()
    }

    const response = await fetch(CI_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CI_API_TOKEN}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`CI webhook failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    logger.info('✅ CI pipeline triggered successfully')
    logger.info(`Pipeline ID: ${result.id || 'N/A'}`)
    logger.info(`URL: ${result.url || 'N/A'}`)

    return {
      success: true,
      pipelineId: result.id,
      pipelineUrl: result.url,
      branch,
      commit: commitHash
    }

  } catch (error) {
    logger.error('❌ Failed to trigger CI:', error.message)
    return { success: false, error: error.message }
  }
}
```

---

## Team Notifications

### Slack Notifications for Important Events

**Use Case**: Notify team on Slack when critical branches are updated

**Hook Definition** (`hooks/post-push-notify.ttl`):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:SlackNotification a hook:Hook ;
  rdfs:label "Slack notification" ;

  hook:on [
    a git:PostPushEvent ;
    hook:any [
      hook:branchName "main" ;
      hook:branchName "production"
    ]
  ] ;

  hook:job [
    hook:name "slack-notify" ;
    hook:schedule "background" ;
    hook:timeout 10000
  ] .
```

**Job File** (`jobs/slack-notify.mjs`):
```javascript
import { execSync } from 'node:child_process'
import { logger } from '../src/utils/logger.mjs'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

export default async function slackNotify(context = {}) {
  logger.info('📢 Sending Slack notification...')

  if (!SLACK_WEBHOOK_URL) {
    logger.warn('SLACK_WEBHOOK_URL not configured, skipping')
    return { success: true, skipped: true }
  }

  try {
    // Get commit info
    const branch = execSync('git branch --show-current', {
      encoding: 'utf-8'
    }).trim()

    const commitHash = execSync('git rev-parse HEAD', {
      encoding: 'utf-8'
    }).trim().substring(0, 8)

    const commitMessage = execSync('git log -1 --pretty=%B', {
      encoding: 'utf-8'
    }).trim()

    const author = execSync('git log -1 --pretty=%an', {
      encoding: 'utf-8'
    }).trim()

    const authorEmail = execSync('git log -1 --pretty=%ae', {
      encoding: 'utf-8'
    }).trim()

    const repoUrl = execSync('git config --get remote.origin.url', {
      encoding: 'utf-8'
    }).trim()

    // Build Slack message
    const message = {
      text: `🚀 New commit pushed to *${branch}*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚀 New commit on ${branch}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Author:*\n${author} (${authorEmail})`
            },
            {
              type: 'mrkdwn',
              text: `*Commit:*\n\`${commitHash}\``
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Message:*\n${commitMessage}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Commit'
              },
              url: `${repoUrl}/commit/${commitHash}`
            }
          ]
        }
      ]
    }

    // Send to Slack
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`)
    }

    logger.info('✅ Slack notification sent')
    return {
      success: true,
      branch,
      commit: commitHash,
      author
    }

  } catch (error) {
    logger.error('❌ Slack notification failed:', error.message)
    return { success: false, error: error.message }
  }
}
```

---

## Performance Monitoring

### Track Build Performance

**Use Case**: Monitor build times and performance metrics

**Hook Definition** (`hooks/post-commit-metrics.ttl`):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:PerformanceMetrics a hook:Hook ;
  rdfs:label "Performance metrics collection" ;

  hook:on [
    a git:PostCommitEvent
  ] ;

  hook:job [
    hook:name "collect-metrics" ;
    hook:schedule "background" ;
    hook:timeout 60000
  ] .
```

**Job File** (`jobs/collect-metrics.mjs`):
```javascript
import { execSync } from 'node:child_process'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { logger } from '../src/utils/logger.mjs'

const METRICS_FILE = '.gitvan/metrics.json'

export default async function collectMetrics(context = {}) {
  logger.info('📊 Collecting performance metrics...')

  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      commit: null,
      build: null,
      tests: null,
      bundle: null
    }

    // Get commit info
    const commitHash = execSync('git rev-parse HEAD', {
      encoding: 'utf-8'
    }).trim()

    metrics.commit = {
      hash: commitHash.substring(0, 8),
      timestamp: new Date().toISOString()
    }

    // Measure build time
    logger.info('Building project...')
    const buildStart = Date.now()
    try {
      execSync('npm run build', {
        stdio: 'pipe',
        timeout: 60000
      })
      metrics.build = {
        duration: Date.now() - buildStart,
        success: true
      }
      logger.info(`✅ Build completed in ${metrics.build.duration}ms`)
    } catch (error) {
      metrics.build = {
        duration: Date.now() - buildStart,
        success: false,
        error: error.message
      }
      logger.warn('⚠️  Build failed')
    }

    // Measure test time
    logger.info('Running tests...')
    const testStart = Date.now()
    try {
      const testOutput = execSync('npm test -- --run --reporter=json', {
        encoding: 'utf-8',
        timeout: 60000
      })
      const testResults = JSON.parse(testOutput)

      metrics.tests = {
        duration: Date.now() - testStart,
        success: true,
        total: testResults.numTotalTests,
        passed: testResults.numPassedTests,
        failed: testResults.numFailedTests
      }
      logger.info(`✅ Tests completed in ${metrics.tests.duration}ms`)
    } catch (error) {
      metrics.tests = {
        duration: Date.now() - testStart,
        success: false
      }
      logger.warn('⚠️  Tests failed')
    }

    // Analyze bundle size (if dist/ exists)
    if (existsSync('dist')) {
      const bundleSize = execSync('du -sb dist', {
        encoding: 'utf-8'
      }).split('\t')[0]

      metrics.bundle = {
        size: parseInt(bundleSize),
        sizeKB: (parseInt(bundleSize) / 1024).toFixed(2)
      }
      logger.info(`📦 Bundle size: ${metrics.bundle.sizeKB} KB`)
    }

    // Load historical metrics
    let history = []
    if (existsSync(METRICS_FILE)) {
      history = JSON.parse(readFileSync(METRICS_FILE, 'utf-8'))
    }

    // Add current metrics
    history.push(metrics)

    // Keep last 100 entries
    if (history.length > 100) {
      history = history.slice(-100)
    }

    // Save metrics
    writeFileSync(METRICS_FILE, JSON.stringify(history, null, 2))

    logger.info('✅ Metrics collected and saved')

    // Check for performance regressions
    if (history.length >= 2) {
      const previous = history[history.length - 2]
      const current = metrics

      if (current.build && previous.build) {
        const buildDiff = current.build.duration - previous.build.duration
        const buildPctChange = (buildDiff / previous.build.duration) * 100

        if (buildPctChange > 20) {
          logger.warn(`⚠️  Build time increased by ${buildPctChange.toFixed(1)}%`)
        }
      }

      if (current.bundle && previous.bundle) {
        const sizeDiff = current.bundle.size - previous.bundle.size
        const sizePctChange = (sizeDiff / previous.bundle.size) * 100

        if (sizePctChange > 10) {
          logger.warn(`⚠️  Bundle size increased by ${sizePctChange.toFixed(1)}%`)
        }
      }
    }

    return {
      success: true,
      metrics
    }

  } catch (error) {
    logger.error('❌ Metrics collection failed:', error.message)
    return { success: false, error: error.message }
  }
}
```

---

## Documentation Generation

### Auto-Generate API Docs on Commit

**Use Case**: Automatically generate documentation when code changes

**Hook Definition** (`hooks/post-commit-docs.ttl`):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:GenerateDocs a hook:Hook ;
  rdfs:label "Generate documentation" ;

  hook:on [
    a git:PostCommitEvent ;
    hook:pathChanged "src/**/*.{js,ts}"
  ] ;

  hook:job [
    hook:name "generate-docs" ;
    hook:schedule "background" ;
    hook:timeout 60000
  ] .
```

**Job File** (`jobs/generate-docs.mjs`):
```javascript
import { execSync } from 'node:child_process'
import { logger } from '../src/utils/logger.mjs'

export default async function generateDocs(context = {}) {
  logger.info('📚 Generating documentation...')

  try {
    // Generate TypeScript documentation with TypeDoc
    logger.info('Running TypeDoc...')
    execSync('npx typedoc --out docs/api src/', {
      stdio: 'inherit',
      timeout: 60000
    })
    logger.info('✅ TypeDoc generation complete')

    // Generate JSDoc documentation
    logger.info('Running JSDoc...')
    execSync('npx jsdoc -c jsdoc.json', {
      stdio: 'inherit',
      timeout: 60000
    })
    logger.info('✅ JSDoc generation complete')

    // Generate README TOC
    logger.info('Updating README TOC...')
    execSync('npx markdown-toc -i README.md', {
      stdio: 'inherit'
    })
    logger.info('✅ README TOC updated')

    // Check if docs changed
    const docsChanged = execSync('git status --porcelain docs/', {
      encoding: 'utf-8'
    }).trim()

    if (docsChanged) {
      logger.info('📝 Documentation files changed:')
      logger.info(docsChanged)

      // Optionally auto-commit docs
      if (process.env.AUTO_COMMIT_DOCS === 'true') {
        execSync('git add docs/ README.md', { stdio: 'inherit' })
        execSync('git commit -m "docs: auto-generate API documentation"', {
          stdio: 'inherit'
        })
        logger.info('✅ Documentation changes committed')
      } else {
        logger.info('💡 Run: git add docs/ && git commit -m "docs: update"')
      }
    } else {
      logger.info('No documentation changes')
    }

    return {
      success: true,
      changed: !!docsChanged
    }

  } catch (error) {
    logger.error('❌ Documentation generation failed:', error.message)
    return { success: false, error: error.message }
  }
}
```

---

## Database Migrations

### Run Migrations on Schema Changes

**Use Case**: Automatically run database migrations when schema files change

**Hook Definition** (`hooks/post-merge-migrations.ttl`):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:RunMigrations a hook:Hook ;
  rdfs:label "Run database migrations" ;

  hook:on [
    a git:PostMergeEvent ;
    hook:any [
      hook:pathChanged "migrations/**" ;
      hook:pathChanged "prisma/schema.prisma" ;
      hook:pathChanged "database/schema.sql"
    ]
  ] ;

  hook:job [
    hook:name "run-migrations" ;
    hook:schedule "immediate" ;
    hook:timeout 120000
  ] .
```

**Job File** (`jobs/run-migrations.mjs`):
```javascript
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { logger } from '../src/utils/logger.mjs'

export default async function runMigrations(context = {}) {
  logger.info('🗄️  Running database migrations...')

  const AUTO_MIGRATE = process.env.AUTO_MIGRATE === 'true'

  if (!AUTO_MIGRATE) {
    logger.warn('⚠️  Auto-migration is disabled')
    logger.info('💡 Set AUTO_MIGRATE=true to enable automatic migrations')
    logger.info('💡 Or run manually: npm run db:migrate')
    return { success: true, skipped: true }
  }

  try {
    // Detect migration tool
    let migrationCmd = null

    if (existsSync('prisma/schema.prisma')) {
      // Prisma
      migrationCmd = 'npx prisma migrate deploy'
      logger.info('Detected Prisma migrations')
    } else if (existsSync('knexfile.js')) {
      // Knex
      migrationCmd = 'npx knex migrate:latest'
      logger.info('Detected Knex migrations')
    } else if (existsSync('migrations/')) {
      // Generic migration directory
      migrationCmd = 'npm run db:migrate'
      logger.info('Detected generic migrations')
    }

    if (!migrationCmd) {
      logger.warn('No migration tool detected, skipping')
      return { success: true, skipped: true }
    }

    // Run migrations
    logger.info(`Running: ${migrationCmd}`)
    const output = execSync(migrationCmd, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 120000
    })

    logger.info(output)
    logger.info('✅ Migrations completed successfully')

    return {
      success: true,
      migrationTool: migrationCmd,
      output
    }

  } catch (error) {
    logger.error('❌ Migration failed:', error.message)
    logger.info('💡 Fix the migration and run manually: npm run db:migrate')

    return {
      success: false,
      error: error.message
    }
  }
}
```

---

## Release Automation

### Auto-Tag Releases on Version Bump

**Use Case**: Automatically create Git tags when package.json version changes

**Hook Definition** (`hooks/post-commit-version.ttl`):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:AutoTag a hook:Hook ;
  rdfs:label "Auto-tag releases" ;

  hook:on [
    a git:PostCommitEvent ;
    hook:pathChanged "package.json"
  ] ;

  hook:job [
    hook:name "auto-tag" ;
    hook:schedule "background" ;
    hook:timeout 10000
  ] .
```

**Job File** (`jobs/auto-tag.mjs`):
```javascript
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { logger } from '../src/utils/logger.mjs'

export default async function autoTag(context = {}) {
  logger.info('🏷️  Checking for version changes...')

  try {
    // Read current package.json
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
    const currentVersion = packageJson.version

    logger.info(`Current version: ${currentVersion}`)

    // Check if version changed in this commit
    const previousPackageJson = execSync('git show HEAD~1:package.json', {
      encoding: 'utf-8'
    })
    const previousVersion = JSON.parse(previousPackageJson).version

    logger.info(`Previous version: ${previousVersion}`)

    if (currentVersion === previousVersion) {
      logger.info('Version unchanged, skipping tag creation')
      return { success: true, tagged: false }
    }

    logger.info(`Version changed: ${previousVersion} → ${currentVersion}`)

    // Check if tag already exists
    const existingTags = execSync('git tag -l', {
      encoding: 'utf-8'
    }).split('\n')

    const tagName = `v${currentVersion}`

    if (existingTags.includes(tagName)) {
      logger.warn(`⚠️  Tag ${tagName} already exists`)
      return { success: true, tagged: false, alreadyExists: true }
    }

    // Create annotated tag
    logger.info(`Creating tag: ${tagName}`)

    const commitMessage = execSync('git log -1 --pretty=%B', {
      encoding: 'utf-8'
    }).trim()

    execSync(`git tag -a ${tagName} -m "Release ${currentVersion}\n\n${commitMessage}"`, {
      stdio: 'inherit'
    })

    logger.info(`✅ Tag ${tagName} created`)

    // Optionally push tag
    if (process.env.AUTO_PUSH_TAGS === 'true') {
      logger.info(`Pushing tag ${tagName}...`)
      execSync(`git push origin ${tagName}`, { stdio: 'inherit' })
      logger.info('✅ Tag pushed to remote')

      return {
        success: true,
        tagged: true,
        tagName,
        version: currentVersion,
        pushed: true
      }
    }

    logger.info(`💡 Push tag with: git push origin ${tagName}`)

    return {
      success: true,
      tagged: true,
      tagName,
      version: currentVersion,
      pushed: false
    }

  } catch (error) {
    logger.error('❌ Auto-tag failed:', error.message)
    return { success: false, error: error.message }
  }
}
```

---

## Testing Hooks Locally

### Test Without Committing

```bash
# Dry-run evaluation
gitvan hooks evaluate --dry-run --verbose

# Simulate specific event
gitvan hooks simulate pre-commit --files="src/index.js"

# Run specific hook manually
gitvan hooks run pre-commit-quality

# Run specific job directly
gitvan jobs run quality-check
```

---

## Environment Variables Reference

```bash
# Slack integration
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# CI/CD integration
export CI_WEBHOOK_URL="https://ci.example.com/webhook"
export CI_API_TOKEN="your-token"

# Branch protection
export ADMIN_EMAILS="admin1@example.com,admin2@example.com"

# Auto-commit settings
export AUTO_COMMIT_DOCS="true"
export AUTO_PUSH_TAGS="true"
export AUTO_MIGRATE="true"
```

---

## Next Steps

- **Integration Guide**: See [HOOKS_INTEGRATION_GUIDE.md](./HOOKS_INTEGRATION_GUIDE.md)
- **Architecture**: See [HOOKS_ARCHITECTURE.md](./HOOKS_ARCHITECTURE.md)
- **API Reference**: See [HOOKS_API_REFERENCE.md](./HOOKS_API_REFERENCE.md)

---

**Last Updated**: January 9, 2026
**GitVan Version**: 3.0.0+
**License**: Apache-2.0
