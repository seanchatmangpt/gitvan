# Migration Guide: v1 to v2

This guide helps you migrate from gitvan v1 to v2, covering breaking changes, new features, and step-by-step transformation examples.

## Pre-Migration Checklist

- [ ] Backup your current repository (git clone or git bundle)
- [ ] Document your current job definitions and workflows
- [ ] Test your existing jobs in a separate branch
- [ ] Review the [Architecture Decisions](./ARCHITECTURE_DECISIONS.md) for context
- [ ] Identify dependencies on removed features

## Breaking Changes Overview

### 1. Package Structure

**v1**: Multiple packages (`@gitvan/core`, `@gitvan/cli`, etc.)
**v2**: Single package (`gitvan`)

**Migration**: Update import statements and dependencies.

### 2. Job Definition Pattern

**v1**: Various job patterns (functions, objects, etc.)
**v2**: Standardized `defineJob()` pattern

### 3. Context Management

**v1**: Explicit context passing
**v2**: Composables pattern with implicit context

### 4. Template Engine

**v1**: Custom template system or external tools
**v2**: First-class Nunjucks support with `exec: 'tmpl'`

### 5. Event System

**v1**: Configuration-based event definitions
**v2**: File-system convention-based events

## Step-by-Step Migration

### Step 1: Update Dependencies

**Before (v1)**:
```json
{
  "dependencies": {
    "@gitvan/core": "^1.0.0",
    "@gitvan/cli": "^1.0.0"
  }
}
```

**After (v2)**:
```json
{
  "dependencies": {
    "gitvan": "^2.0.0",
    "nunjucks": "^3.2.4",
    "unctx": "^2.3.0"
  }
}
```

### Step 2: Transform Job Definitions

**Before (v1)**:
```javascript
// jobs/build.js
module.exports = async function(context) {
  const { git, exec } = context
  const branch = await git.getCurrentBranch()
  return exec.run('npm', ['run', 'build'])
}
```

**After (v2)**:
```javascript
// jobs/build.mjs
import { defineJob } from 'gitvan/jobs'
import { useGit, useExec } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Build the project' },
  async run() {
    const git = useGit()
    const exec = useExec()
    const branch = git.branch()
    return exec.cli('npm', ['run', 'build'])
  }
})
```

### Step 3: Update Import Statements

**Before (v1)**:
```javascript
import { GitVan } from '@gitvan/core'
import { CLI } from '@gitvan/cli'
```

**After (v2)**:
```javascript
import { defineJob } from 'gitvan/jobs'
import { useGit, useTemplate, useExec } from 'gitvan/composables'
```

### Step 4: Migrate Template Usage

**Before (v1)**:
```javascript
// Custom template handling
const template = fs.readFileSync('templates/changelog.hbs', 'utf-8')
const compiled = Handlebars.compile(template)
const output = compiled({ commits })
```

**After (v2)**:
```javascript
// First-class template support
const t = useTemplate()
const output = t.render('changelog.njk', { commits })

// Or using exec spec
export default defineJob({
  kind: 'atomic',
  action: {
    exec: 'tmpl',
    template: 'changelog.njk',
    out: 'CHANGELOG.md',
    data: { commits: ({ git }) => git.run('log --oneline -50').split('\n') }
  }
})
```

### Step 5: Convert Event Handlers

**Before (v1)**:
```javascript
// gitvan.config.js
module.exports = {
  events: [
    {
      on: { pushTo: 'main' },
      run: 'jobs/deploy'
    }
  ]
}
```

**After (v2)**:
```javascript
// events/push-to/main.mjs
export const job = 'deploy'

// Or inline:
export default async function({ payload, git }) {
  // Handle push to main
  return { ok: true }
}
```

### Step 6: Update Configuration

**Before (v1)**:
```javascript
// gitvan.config.js
module.exports = {
  git: {
    defaultBranch: 'main'
  },
  daemon: {
    port: 3000
  }
}
```

**After (v2)**:
```javascript
// gitvan.config.js
import { defineConfig } from 'gitvan/config'

export default defineConfig({
  git: {
    defaultBranch: 'main',
    noteRefs: {
      results: 'refs/notes/gitvan/results',
      locks: 'refs/gitvan/locks'
    }
  },
  daemon: {
    port: 3000,
    logLevel: 'info'
  }
})
```

## Code Transformation Examples

### Example 1: Simple Build Job

**v1 Version**:
```javascript
// jobs/build.js
const { spawn } = require('child_process')

module.exports = {
  name: 'build',
  description: 'Build the project',
  async run(ctx) {
    const result = spawn('npm', ['run', 'build'], {
      cwd: ctx.git.root,
      stdio: 'inherit'
    })
    return { success: result.status === 0 }
  }
}
```

**v2 Version**:
```javascript
// jobs/build.mjs
import { defineJob } from 'gitvan/jobs'
import { useExec } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Build the project' },
  async run() {
    const exec = useExec()
    return exec.cli('npm', ['run', 'build'])
  }
})
```

### Example 2: Documentation Generation

**v1 Version**:
```javascript
// jobs/docs.js
const fs = require('fs')
const Handlebars = require('handlebars')

module.exports = async function(ctx) {
  const commits = await ctx.git.log({ n: 50 })
  const template = fs.readFileSync('templates/changelog.hbs', 'utf-8')
  const compiled = Handlebars.compile(template)
  const output = compiled({ commits, date: new Date() })
  fs.writeFileSync('CHANGELOG.md', output)
  return { success: true }
}
```

**v2 Version**:
```javascript
// jobs/docs.mjs
import { defineJob } from 'gitvan/jobs'
import { useGit, useTemplate } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Generate documentation' },
  async run() {
    const git = useGit()
    const t = useTemplate()

    const commits = git.run('log --oneline -50').split('\n')
    t.renderToFile('changelog.njk', 'CHANGELOG.md', { commits })

    return { ok: true, artifact: 'CHANGELOG.md' }
  }
})
```

### Example 3: Composite Workflow

**v1 Version**:
```javascript
// jobs/deploy.js
module.exports = {
  steps: [
    { job: 'test' },
    { job: 'build' },
    { cmd: 'rsync', args: ['-av', 'dist/', 'user@server:/var/www/'] }
  ]
}
```

**v2 Version**:
```javascript
// jobs/deploy.mjs
import { defineJob } from 'gitvan/jobs'

export default defineJob({
  kind: 'sequence',
  meta: { desc: 'Deploy to production' },
  steps: [
    { exec: 'job', name: 'test' },
    { exec: 'job', name: 'build' },
    { exec: 'cli', cmd: 'rsync', args: ['-av', 'dist/', 'user@server:/var/www/'] }
  ]
})
```

## Directory Structure Changes

### Before (v1)
```
project/
├── .gitvan/
│   ├── config.js
│   └── jobs/
├── scripts/
└── templates/
```

### After (v2)
```
project/
├── jobs/               # Job definitions
│   ├── build.mjs
│   └── deploy/
│       └── production.mjs
├── events/             # Event handlers
│   ├── push-to/
│   │   └── main.mjs
│   └── cron/
│       └── 0_2_*_*_*.mjs
├── templates/          # Nunjucks templates
│   └── changelog.njk
└── gitvan.config.js    # Main configuration
```

## Common Migration Issues

### Issue 1: CommonJS vs ES Modules

**Problem**: v2 uses ES modules (.mjs), v1 used CommonJS (.js)

**Solution**:
```javascript
// Change from:
module.exports = { ... }
const pkg = require('./package.json')

// To:
export default defineJob({ ... })
import pkg from './package.json' assert { type: 'json' }
```

### Issue 2: Context Access Patterns

**Problem**: v1 passed context explicitly, v2 uses composables

**Solution**:
```javascript
// Change from:
async function myJob(context) {
  const branch = await context.git.getCurrentBranch()
  return context.exec.run('npm', ['test'])
}

// To:
async function run() {
  const git = useGit()
  const exec = useExec()
  const branch = git.branch()
  return exec.cli('npm', ['test'])
}
```

### Issue 3: Event Registration

**Problem**: v1 used config-based events, v2 uses file conventions

**Solution**:
```javascript
// Change from config:
{
  events: [
    { on: { pushTo: 'main' }, run: 'deploy' }
  ]
}

// To file: events/push-to/main.mjs
export const job = 'deploy'
```

## Testing Migration

1. **Parallel Testing**: Keep v1 and v2 side-by-side in different branches
2. **Job-by-Job**: Migrate one job at a time and test thoroughly
3. **Event Validation**: Verify events trigger correctly with new file structure
4. **Template Testing**: Ensure Nunjucks templates produce same output as previous system

## Rollback Procedure

If migration issues arise:

1. **Git Reset**: `git reset --hard v1-working-branch`
2. **Dependency Restore**: `npm install` (will restore v1 dependencies)
3. **Configuration Restore**: Restore original config files
4. **Job Files**: Restore original job directory structure

## Performance Considerations

**v2 Improvements**:
- Faster startup (single package, pure JS runtime)
- Better memory usage (per-worktree daemons)
- Improved concurrency (atomic git ref locking)

**Potential Regressions**:
- Template rendering may be slower for large datasets
- More processes running (per-worktree daemons)

## Getting Help

- **Documentation**: Check [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for detailed patterns
- **Examples**: Look at migrated jobs in the `examples/` directory
- **Issues**: File migration-specific issues with `[migration]` label
- **Community**: Join discussions for migration assistance

## Post-Migration Checklist

- [ ] All jobs execute correctly
- [ ] Events trigger as expected
- [ ] Templates render properly
- [ ] Configuration options work
- [ ] Performance is acceptable
- [ ] Tests pass
- [ ] Documentation is updated
- [ ] Team is trained on new patterns