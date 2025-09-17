# Migrating from GitHub Actions to GitVan v2

## Why Choose GitVan Over GitHub Actions?

### 🏠 Local-First Development
- **Offline Capability**: Run workflows without internet connection
- **Instant Feedback**: No waiting for cloud runners
- **Private Repositories**: Full functionality without GitHub Premium
- **Cost Effective**: No usage limits or billing surprises

### 🚀 Enhanced Developer Experience
- **AI-Powered Generation**: `gitvan chat "create a deployment workflow"`
- **Real-time Testing**: `gitvan event simulate` before pushing
- **Rich Templates**: Nunjucks with custom filters and functions
- **Unified CLI**: Single tool for all Git automation needs

### 🔧 Advanced Features
- **Composable APIs**: Reusable logic across workflows
- **Git-Native Storage**: Metadata stored in Git refs/notes
- **Conditional Logic**: Complex event predicates and matching
- **Hot Reloading**: Development mode with instant updates

### 📊 Performance Benefits
- **Zero Cold Start**: Instant execution
- **Parallel Processing**: Concurrent job execution
- **Efficient Caching**: Git-based artifact storage
- **Resource Control**: Use your own hardware optimally

## Conceptual Mapping

### GitHub Actions → GitVan Equivalents

| GitHub Actions | GitVan v2 | Notes |
|----------------|-----------|-------|
| `.github/workflows/` | `jobs/` | Job definition directory |
| `workflow.yml` | `workflow.mjs` | ESM modules with `defineJob()` |
| `on: push` | `on: { pathChanged: [...] }` | Rich event predicates |
| `runs-on: ubuntu-latest` | Local execution | Your machine, your control |
| `steps:` | `async run({ ctx })` | Single function with composables |
| `uses: actions/...` | `await import('gitvan/composables')` | Built-in utilities |
| `env:` | Job context + environment | Unified context object |
| `if:` conditions | Event predicates | More powerful matching |
| `matrix:` | Multiple job files | Explicit job definitions |
| `needs:` | Job orchestration | Dependency management |
| `artifacts` | Git refs/notes | Persistent, versioned storage |

## Migration Examples

### 1. Basic CI Workflow

**GitHub Actions:**
```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
    paths: ['src/**']
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run build
```

**GitVan v2:**
```javascript
// jobs/ci.mjs
import { defineJob } from 'gitvan/define'

export default defineJob({
  meta: {
    desc: 'Continuous Integration',
    tags: ['ci', 'testing']
  },
  on: {
    any: [
      {
        pathChanged: ['src/**'],
        branchCreate: 'main'
      },
      {
        mergeTo: 'main'
      }
    ]
  },
  async run({ ctx }) {
    const { useGit } = await import('gitvan/composables')
    const { useTemplate } = await import('gitvan/composables')

    const git = useGit()

    // Ensure we're in a clean state
    const status = await git.status()
    if (!status.isClean()) {
      throw new Error('Working directory not clean')
    }

    // Install dependencies
    await ctx.exec('npm', ['ci'])

    // Run tests
    await ctx.exec('npm', ['test'])

    // Build project
    await ctx.exec('npm', ['run', 'build'])

    return {
      ok: true,
      artifacts: ['dist/']
    }
  }
})
```

### 2. Deployment Workflow

**GitHub Actions:**
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    environment: production
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          npm ci
          npm run build
          npm run deploy
```

**GitVan v2:**
```javascript
// jobs/deploy.mjs
import { defineJob } from 'gitvan/define'

export default defineJob({
  meta: {
    desc: 'Deploy to production',
    tags: ['deployment', 'production']
  },
  on: {
    tagCreate: '^v\\d+\\.\\d+\\.\\d+$', // Semantic version tags
    semverTag: true
  },
  async run({ ctx, payload }) {
    const { useGit } = await import('gitvan/composables')
    const { useTemplate } = await import('gitvan/composables')

    const git = useGit()
    const template = useTemplate()

    // Get tag information
    const tag = await git.getCurrentTag()
    const version = tag.replace(/^v/, '')

    // Build deployment script from template
    const deployScript = await template.render('deploy.sh.njk', {
      version,
      timestamp: new Date().toISOString(),
      commit: await git.head(),
      branch: await git.getCurrentBranch()
    })

    // Execute deployment
    await ctx.exec('npm', ['ci'])
    await ctx.exec('npm', ['run', 'build'])

    // Custom deployment logic
    await ctx.exec('bash', ['-c', deployScript])

    return {
      ok: true,
      artifacts: [`deployment-${version}.log`],
      version
    }
  }
})
```

### 3. Matrix Build

**GitHub Actions:**
```yaml
# .github/workflows/matrix.yml
name: Matrix Build
on: [push]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

**GitVan v2:**
```javascript
// jobs/test-node16.mjs
import { defineJob } from 'gitvan/define'

export default defineJob({
  meta: {
    desc: 'Test on Node.js 16',
    tags: ['testing', 'node16']
  },
  on: { pathChanged: ['src/**', 'test/**'] },
  async run({ ctx }) {
    await ctx.exec('nvm', ['use', '16'])
    await ctx.exec('npm', ['ci'])
    await ctx.exec('npm', ['test'])
    return { ok: true, nodeVersion: '16' }
  }
})

// jobs/test-node18.mjs
import { defineJob } from 'gitvan/define'

export default defineJob({
  meta: {
    desc: 'Test on Node.js 18',
    tags: ['testing', 'node18']
  },
  on: { pathChanged: ['src/**', 'test/**'] },
  async run({ ctx }) {
    await ctx.exec('nvm', ['use', '18'])
    await ctx.exec('npm', ['ci'])
    await ctx.exec('npm', ['test'])
    return { ok: true, nodeVersion: '18' }
  }
})

// jobs/test-node20.mjs
import { defineJob } from 'gitvan/define'

export default defineJob({
  meta: {
    desc: 'Test on Node.js 20',
    tags: ['testing', 'node20']
  },
  on: { pathChanged: ['src/**', 'test/**'] },
  async run({ ctx }) {
    await ctx.exec('nvm', ['use', '20'])
    await ctx.exec('npm', ['ci'])
    await ctx.exec('npm', ['test'])
    return { ok: true, nodeVersion: '20' }
  }
})
```

### 4. Conditional Workflows

**GitHub Actions:**
```yaml
# .github/workflows/conditional.yml
name: Conditional
on:
  push:
    paths-ignore: ['docs/**', '*.md']
  pull_request:
    types: [opened, synchronize]

jobs:
  build:
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
    runs-on: ubuntu-latest
    steps:
      - run: echo "Building..."

  security:
    if: contains(github.event.pull_request.title, 'security')
    runs-on: ubuntu-latest
    steps:
      - run: echo "Security scan..."
```

**GitVan v2:**
```javascript
// jobs/conditional-build.mjs
import { defineJob } from 'gitvan/define'

export default defineJob({
  meta: {
    desc: 'Conditional build job',
    tags: ['build', 'conditional']
  },
  on: {
    all: [
      {
        // Files changed but not docs
        pathChanged: ['**/*'],
        pathAdded: ['**/*']
      }
    ],
    // Skip if commit message contains [skip ci]
    message: '^(?!.*\\[skip ci\\]).*$'
  },
  async run({ ctx, payload }) {
    // Additional runtime conditions
    if (payload.pathChanged?.every(path => path.startsWith('docs/'))) {
      return { ok: true, skipped: 'Documentation only changes' }
    }

    console.log('Building...')
    await ctx.exec('npm', ['run', 'build'])

    return { ok: true }
  }
})

// jobs/security-scan.mjs
import { defineJob } from 'gitvan/define'

export default defineJob({
  meta: {
    desc: 'Security scan for PRs',
    tags: ['security', 'scanning']
  },
  on: {
    message: 'security|Security|SECURITY',
    pathChanged: ['src/**', 'lib/**']
  },
  async run({ ctx }) {
    console.log('Running security scan...')
    await ctx.exec('npm', ['audit'])
    await ctx.exec('npm', ['run', 'security-scan'])

    return { ok: true, artifacts: ['security-report.json'] }
  }
})
```

## Advanced Migration Patterns

### 1. Reusable Actions → Composables

**GitHub Actions (Reusable Action):**
```yaml
# .github/actions/setup/action.yml
name: 'Setup'
inputs:
  node-version:
    required: true
runs:
  using: 'composite'
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: ${{ inputs.node-version }}
    - run: npm ci
```

**GitVan v2 (Composable):**
```javascript
// composables/setup.mjs
export async function useSetup(nodeVersion = '18') {
  const { useGit } = await import('gitvan/composables')

  return {
    async setupNode() {
      await ctx.exec('nvm', ['use', nodeVersion])
      await ctx.exec('npm', ['ci'])
    },

    async ensureClean() {
      const git = useGit()
      const status = await git.status()
      if (!status.isClean()) {
        throw new Error('Working directory not clean')
      }
    }
  }
}

// Usage in job
import { defineJob } from 'gitvan/define'
import { useSetup } from '../composables/setup.mjs'

export default defineJob({
  async run({ ctx }) {
    const setup = await useSetup('18')
    await setup.ensureClean()
    await setup.setupNode()
    // Continue with job logic...
  }
})
```

### 2. Secrets Management

**GitHub Actions:**
```yaml
env:
  API_KEY: ${{ secrets.API_KEY }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**GitVan v2:**
```javascript
// Use environment variables or external secret management
export default defineJob({
  async run({ ctx }) {
    // Option 1: Environment variables
    const apiKey = process.env.API_KEY
    if (!apiKey) {
      throw new Error('API_KEY environment variable required')
    }

    // Option 2: External secret manager
    const { useSecrets } = await import('../composables/secrets.mjs')
    const secrets = useSecrets()
    const dbUrl = await secrets.get('DATABASE_URL')

    // Job logic with secrets...
  }
})
```

### 3. Artifacts and Caching

**GitHub Actions:**
```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

- uses: actions/upload-artifact@v3
  with:
    name: build-files
    path: dist/
```

**GitVan v2:**
```javascript
import { defineJob } from 'gitvan/define'

export default defineJob({
  async run({ ctx }) {
    const { useGit } = await import('gitvan/composables')
    const git = useGit()

    // Git-native caching using refs
    const cacheKey = await git.hashObject('package-lock.json')
    const cached = await git.getRef(`refs/cache/npm/${cacheKey}`)

    if (!cached) {
      await ctx.exec('npm', ['ci'])
      // Store cache reference
      await git.setRef(`refs/cache/npm/${cacheKey}`, await git.head())
    } else {
      console.log('Using cached dependencies')
    }

    // Build and store artifacts in Git notes
    await ctx.exec('npm', ['run', 'build'])

    // Store build artifacts as Git note
    const buildHash = await git.hashDir('dist/')
    await git.addNote('gitvan/artifacts', buildHash, {
      type: 'build',
      timestamp: new Date().toISOString(),
      commit: await git.head()
    })

    return {
      ok: true,
      artifacts: ['dist/'],
      cacheKey,
      buildHash
    }
  }
})
```

## Template System Migration

### GitHub Actions Templates
```yaml
# GitHub Actions doesn't have native templating
name: Deploy ${{ github.event.repository.name }}
env:
  VERSION: ${{ github.ref_name }}
```

### GitVan v2 Rich Templates
```javascript
// templates/deploy.sh.njk
#!/bin/bash
set -euo pipefail

# Generated deployment script
# Project: {{ gitRepoName() }}
# Version: {{ version }}
# Timestamp: {{ timestamp | formatDate }}
# Branch: {{ gitBranch() }}
# Commit: {{ gitCommit() | truncate(8) }}

echo "Deploying {{ gitRepoName() | titleCase }} v{{ version }}"

# Build info
BUILD_ID="{{ timestamp | toUnixTimestamp }}"
COMMIT_SHA="{{ gitCommit() }}"
BRANCH_NAME="{{ gitBranch() }}"

# Deployment steps
{% for step in deploySteps %}
echo "Step {{ loop.index }}: {{ step.description }}"
{{ step.command }}
{% endfor %}

echo "Deployment completed successfully!"
```

## Local-First Benefits

### 1. Development Workflow
```bash
# Test workflows locally before pushing
gitvan event simulate '{"pathChanged": ["src/index.js"]}'

# Debug job execution
gitvan job run ci --debug

# Interactive job generation
gitvan chat "create a job that runs linting on JavaScript files"
```

### 2. Offline Capability
```bash
# Works without internet
gitvan daemon start

# Local AI model (with Ollama)
gitvan chat "optimize my build process"

# All operations are local
gitvan audit build
```

### 3. Cost Benefits
- **No usage limits**: Run unlimited workflows
- **No billing surprises**: Use your own compute resources
- **Private repos**: Full functionality without GitHub Pro
- **Resource control**: Optimize for your hardware

## Migration Tools

### 1. Automated Conversion
```bash
# AI-powered migration
gitvan chat "convert my GitHub Actions workflows to GitVan jobs"

# Bulk conversion helper
gitvan migrate from-github-actions .github/workflows/
```

### 2. Validation Tools
```bash
# Validate converted jobs
gitvan job list --validate

# Test event matching
gitvan event test --file jobs/ci.mjs --event '{"pathChanged": ["src/index.js"]}'

# Dry run workflows
gitvan job run ci --dry-run
```

### 3. Migration Script Example
```javascript
// scripts/migrate-workflows.mjs
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import YAML from 'yaml'

async function migrateWorkflows() {
  const workflowDir = '.github/workflows'
  const jobsDir = 'jobs'

  const files = await readdir(workflowDir)

  for (const file of files) {
    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
      const content = await readFile(join(workflowDir, file), 'utf8')
      const workflow = YAML.parse(content)

      const gitvanJob = convertWorkflowToJob(workflow)
      const outputFile = join(jobsDir, file.replace(/\.ya?ml$/, '.mjs'))

      await writeFile(outputFile, gitvanJob)
      console.log(`Converted ${file} → ${outputFile}`)
    }
  }
}

function convertWorkflowToJob(workflow) {
  // Conversion logic here
  return `
import { defineJob } from 'gitvan/define'

export default defineJob({
  meta: {
    desc: '${workflow.name}',
    tags: ['migrated']
  },
  // Converted logic...
})
  `.trim()
}
```

## Best Practices for Migration

### 1. Gradual Migration
- Start with simple workflows
- Keep GitHub Actions as backup initially
- Test thoroughly in development
- Migrate critical workflows last

### 2. Leverage GitVan Advantages
- Use AI for complex workflow generation
- Take advantage of local development
- Implement richer event predicates
- Use composables for code reuse

### 3. Testing Strategy
```bash
# Compare outputs
gitvan job run build > gitvan-output.txt
# Compare with GitHub Actions output

# Performance testing
time gitvan job run test
# Compare with GitHub Actions timing
```

### 4. Documentation
- Document migration decisions
- Update team documentation
- Create troubleshooting guides
- Share best practices

## Troubleshooting

### Common Migration Issues

1. **Event Triggering Differences**
   - GitHub Actions: Limited event types
   - GitVan: Rich predicates may be too broad/narrow
   - Solution: Use `gitvan event simulate` to test

2. **Environment Differences**
   - GitHub Actions: Ubuntu runners
   - GitVan: Your local environment
   - Solution: Use containers or normalize environments

3. **Secret Management**
   - GitHub Actions: Built-in secrets
   - GitVan: External secret management needed
   - Solution: Use environment variables or secret managers

4. **Parallel Execution**
   - GitHub Actions: Automatic job parallelism
   - GitVan: Explicit job orchestration
   - Solution: Create separate job files for parallel execution

## Getting Help

- **AI Assistant**: `gitvan chat "help me migrate from GitHub Actions"`
- **Documentation**: Check migration examples in `docs/examples/`
- **Community**: Share migration experiences
- **GitHub Issues**: Report migration problems

## Summary

Migrating from GitHub Actions to GitVan v2 provides:

- **Superior Developer Experience**: Local-first development with AI assistance
- **Cost Efficiency**: No usage limits or billing surprises
- **Enhanced Capabilities**: Rich event predicates and composable architecture
- **Better Performance**: Zero cold start and efficient execution
- **Privacy**: Everything runs locally with your data

The migration effort pays off through improved productivity, reduced costs, and enhanced workflow capabilities that GitHub Actions cannot match.