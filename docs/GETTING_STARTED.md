# Getting Started with GitVan

This guide will help you get started with GitVan, a Git-native development automation platform. By the end of this guide, you'll have GitVan installed, configured, and running your first workflow.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Initial Setup](#initial-setup)
4. [Your First Workflow](#your-first-workflow)
5. [Using Composables](#using-composables)
6. [CLI Basics](#cli-basics)
7. [Configuration](#configuration)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting](#troubleshooting)
10. [Next Steps](#next-steps)

---

## Prerequisites

Before installing GitVan, ensure you have:

### Required

- **Node.js 18 or higher**
  ```bash
  node --version  # Should be 18.0.0 or higher
  ```

- **Git 2.30 or higher**
  ```bash
  git --version  # Should be 2.30 or higher
  ```

- **ES Modules support** (automatic in Node.js 18+)

### Recommended

- **npm 8 or higher** (comes with Node.js 18+)
- Basic knowledge of:
  - Git operations
  - JavaScript/Node.js
  - Command-line interfaces
  - Async/await patterns

---

## Installation

### Install GitVan Globally (Recommended)

```bash
npm install -g gitvan
```

This makes the `gitvan` CLI available system-wide.

### Install GitVan Locally in Your Project

```bash
npm install gitvan
```

Use with npx:
```bash
npx gitvan --version
```

### Verify Installation

```bash
gitvan --version
# Output: gitvan v1.0.0
```

---

## Initial Setup

### 1. Navigate to Your Repository

```bash
cd /path/to/your/repository

# Ensure it's a Git repository
git status
```

If not a Git repository:
```bash
git init
```

### 2. Initialize GitVan

```bash
gitvan init
```

This creates:
- `gitvan.config.js` - Main configuration file
- `.gitvan/` directory with:
  - `workflows/` - Workflow definitions
  - `templates/` - Nunjucks templates
  - `jobs/` - Background job definitions

### 3. Verify Setup

```bash
# Check configuration
gitvan config show

# List available commands
gitvan --help
```

---

## Your First Workflow

Let's create a simple workflow that runs tests on every commit.

### Step 1: Create Workflow Definition

Create `.gitvan/workflows/test-on-commit.ttl`:

```turtle
@prefix : <http://gitvan.dev/workflow/> .
@prefix step: <http://gitvan.dev/step/> .
@prefix git: <http://gitvan.dev/git/> .

:TestOnCommit a :Workflow ;
  :name "Test on Commit" ;
  :description "Run tests whenever code is committed" ;
  :trigger git:commit ;
  :hasStep step:install ;
  :hasStep step:test .

step:install a :ScriptStep ;
  :name "Install Dependencies" ;
  :script "npm install" .

step:test a :TestStep ;
  :name "Run Tests" ;
  :script "npm test" ;
  :dependsOn step:install .
```

### Step 2: Validate Workflow

```bash
gitvan workflow validate test-on-commit
# Output: ✓ Workflow is valid
```

### Step 3: Run Workflow Manually

```bash
gitvan workflow run test-on-commit
```

Output:
```
→ Starting workflow: Test on Commit
  ✓ Install Dependencies (2.3s)
  ✓ Run Tests (1.8s)
→ Workflow completed successfully in 4.1s
```

### Step 4: Enable Automatic Triggering

```bash
# Start GitVan daemon
gitvan daemon start

# Verify daemon is running
gitvan daemon status
# Output: GitVan daemon is running (PID: 12345)
```

Now, every time you commit, the workflow runs automatically:

```bash
git add .
git commit -m "feat: add new feature"
# GitVan automatically triggers test-on-commit workflow
```

---

## Using Composables

GitVan's programmatic API is based on composables - context-aware functions that provide access to Git, workflows, templates, and more.

### Basic Pattern

All composable usage must be wrapped in `withGitVan()`:

```javascript
import { withGitVan, useGit } from 'gitvan';

// Create context
const context = {
  repo: process.cwd(),
  config: {}
};

// Execute within context
await withGitVan(context, async () => {
  const git = useGit();
  const status = await git.status();
  console.log('Current branch:', status.branch);
});
```

### Git Operations

Create `example-git.mjs`:

```javascript
import { withGitVan, useGit } from 'gitvan';

const context = {
  repo: process.cwd(),
  config: {}
};

await withGitVan(context, async () => {
  const git = useGit();

  // Get status
  const status = await git.status();
  console.log('Branch:', status.branch);
  console.log('Modified files:', status.modified);

  // Create branch
  await git.branch('feature/new-feature');

  // Commit changes
  await git.commit('feat: add new feature');

  // Push to remote
  await git.push({
    remote: 'origin',
    branch: 'feature/new-feature'
  });
});
```

Run it:
```bash
node example-git.mjs
```

### Workflow Execution

Create `example-workflow.mjs`:

```javascript
import { withGitVan, useWorkflow } from 'gitvan';

const context = {
  repo: process.cwd(),
  config: {}
};

await withGitVan(context, async () => {
  const workflow = useWorkflow();

  // List available workflows
  const workflows = await workflow.list();
  console.log('Available workflows:', workflows);

  // Execute workflow
  const result = await workflow.execute('test-on-commit');
  console.log('Workflow result:', result.status);
  console.log('Duration:', result.duration, 'ms');
});
```

### Template Rendering

Create `example-template.mjs`:

```javascript
import { withGitVan, useTemplate } from 'gitvan';

const context = {
  repo: process.cwd(),
  config: {}
};

await withGitVan(context, async () => {
  const template = useTemplate();

  // Render template
  const output = await template.render('component.njk', {
    name: 'MyComponent',
    props: ['title', 'description', 'onClick'],
    imports: ['React', 'PropTypes']
  });

  console.log(output);
});
```

Create `.gitvan/templates/component.njk`:

```javascript
import React from 'react';
{% for import in imports %}
import {{ import }} from '{{ import }}';
{% endfor %}

export const {{ name }} = ({ {{ props | join(', ') }} }) => {
  return (
    <div className="{{ name | lower }}">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
};

{{ name }}.propTypes = {
  {% for prop in props %}
  {{ prop }}: PropTypes.any,
  {% endfor %}
};
```

---

## CLI Basics

### Workflow Commands

```bash
# List all workflows
gitvan workflow list

# Run specific workflow
gitvan workflow run <workflow-name>

# Validate workflow syntax
gitvan workflow validate <workflow-name>

# Show workflow details
gitvan workflow show <workflow-name>
```

### Git Commands

```bash
# Git status
gitvan git status

# Create branch
gitvan git branch <branch-name>

# Commit changes
gitvan git commit -m "commit message"

# Push to remote
gitvan git push
```

### Daemon Commands

```bash
# Start daemon (enables automatic workflow triggers)
gitvan daemon start

# Stop daemon
gitvan daemon stop

# Check daemon status
gitvan daemon status

# View daemon logs
gitvan daemon logs
```

### Pack Commands

```bash
# List installed packs
gitvan pack list

# Install pack
gitvan pack install <pack-name>

# Remove pack
gitvan pack remove <pack-name>

# Search marketplace
gitvan pack search <query>
```

### Template Commands

```bash
# List templates
gitvan template list

# Render template
gitvan template render <template-name> --data '{"key":"value"}'

# Validate template syntax
gitvan template validate <template-name>
```

### Job Commands

```bash
# List jobs
gitvan job list

# Run job manually
gitvan job run <job-name>

# Schedule job
gitvan job schedule <job-name> --cron "0 0 * * *"
```

### Audit Commands

```bash
# Show audit trail
gitvan audit show

# Verify audit trail integrity
gitvan audit verify

# Export audit records
gitvan audit export --format json
```

---

## Configuration

### Basic Configuration

Edit `gitvan.config.js`:

```javascript
export default {
  // Job configuration
  jobs: {
    dir: 'jobs',           // Directory for job files
    maxConcurrent: 5       // Max concurrent jobs
  },

  // Template configuration
  templates: {
    dirs: ['templates'],   // Template directories
    autoescape: false,     // Nunjucks autoescape
    globals: {             // Global variables available in all templates
      projectName: 'My Project',
      author: 'Your Name'
    }
  },

  // Workflow configuration
  workflows: {
    dir: 'workflows',      // Workflow directory
    parallel: true,        // Enable parallel step execution
    timeout: 300000        // Default timeout (5 minutes)
  },

  // Audit trail
  receipts: {
    ref: 'refs/notes/gitvan/audit',  // Git notes ref for audit
    sign: true                        // Sign audit records
  },

  // Security policy
  policy: {
    requireSignedCommits: false,     // Require GPG-signed commits
    allowedCommands: ['npm', 'git']  // Allowed shell commands
  },

  // RDF graph
  graph: {
    dir: 'graph',          // Graph storage directory
    autoLoad: true         // Auto-load ontologies
  }
};
```

### Environment Variables

Create `.env` file:

```bash
# GitVan configuration
GITVAN_HOME=/path/to/config
GITVAN_REPO=/path/to/repo

# AI provider
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Environment
NODE_ENV=development
TZ=UTC
LANG=C
```

Load in your code:

```javascript
import 'dotenv/config';
import { withGitVan } from 'gitvan';

const context = {
  repo: process.env.GITVAN_REPO || process.cwd(),
  config: {}
};

await withGitVan(context, async () => {
  // Your code
});
```

---

## Common Patterns

### Pattern 1: Event-Driven Workflows

Trigger workflows based on Git events:

```javascript
import { withGitVan, useEvent, useWorkflow } from 'gitvan';

await withGitVan(context, async () => {
  const event = useEvent();
  const workflow = useWorkflow();

  // Listen for commit events
  event.on('git:commit', async ({ sha, message }) => {
    console.log(`Commit detected: ${sha}`);

    // Run CI workflow
    if (message.includes('[ci]')) {
      await workflow.execute('ci-pipeline');
    }
  });

  // Listen for push events
  event.on('git:push', async ({ branch, commits }) => {
    console.log(`Pushed ${commits.length} commits to ${branch}`);

    // Deploy on main branch push
    if (branch === 'main') {
      await workflow.execute('deploy-production');
    }
  });
});
```

### Pattern 2: Template-Based Code Generation

Generate code from templates:

```javascript
import { withGitVan, useTemplate, useFileSystem } from 'gitvan';

await withGitVan(context, async () => {
  const template = useTemplate();
  const fs = useFileSystem();

  // Generate component
  const component = await template.render('react-component.njk', {
    name: 'UserProfile',
    props: ['user', 'onEdit', 'onDelete']
  });

  // Write to file
  await fs.write('src/components/UserProfile.jsx', component);
  console.log('Component generated successfully');
});
```

### Pattern 3: Background Job Scheduling

Schedule recurring tasks:

```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan(context, async () => {
  const job = useJob();

  // Schedule daily cleanup
  await job.schedule('cleanup', {
    cron: '0 0 * * *',  // Daily at midnight
    async run(context) {
      console.log('Running cleanup...');
      // Cleanup logic
    }
  });

  // Schedule hourly sync
  await job.schedule('sync', {
    cron: '0 * * * *',  // Every hour
    async run(context) {
      console.log('Syncing data...');
      // Sync logic
    }
  });
});
```

### Pattern 4: Audit Trail Verification

Verify operations with cryptographic audit:

```javascript
import { withGitVan, useReceipt, useWorkflow } from 'gitvan';

await withGitVan(context, async () => {
  const receipt = useReceipt();
  const workflow = useWorkflow();

  // Execute workflow
  const result = await workflow.execute('deploy');

  // Write audit record
  await receipt.write({
    action: 'deploy',
    status: result.status,
    timestamp: new Date().toISOString(),
    metadata: {
      user: process.env.USER,
      branch: result.branch
    }
  });

  // Verify audit trail
  const records = await receipt.read();
  const isValid = await receipt.verify(records);
  console.log('Audit trail valid:', isValid);
});
```

### Pattern 5: Distributed Locking

Coordinate concurrent operations:

```javascript
import { withGitVan, useLock, useWorkflow } from 'gitvan';

await withGitVan(context, async () => {
  const lock = useLock();
  const workflow = useWorkflow();

  // Acquire lock
  const lockId = await lock.acquire('deploy-lock', {
    ttl: 60000  // 1 minute
  });

  try {
    // Critical section - only one process can execute
    await workflow.execute('deploy');
    console.log('Deployment successful');
  } finally {
    // Always release lock
    await lock.release(lockId);
  }
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "GitVan context not available"

**Cause**: Composables used outside `withGitVan()` wrapper.

**Solution**:
```javascript
// Wrong
const git = useGit();
await someAsync();
await git.status();  // Error!

// Correct
await withGitVan(context, async () => {
  const git = useGit();
  await someAsync();
  await git.status();  // Works!
});
```

#### Issue: Workflow fails to execute

**Cause**: Invalid workflow syntax or missing dependencies.

**Solution**:
```bash
# Validate workflow
gitvan workflow validate my-workflow

# Check logs
gitvan daemon logs --follow

# Run with verbose output
gitvan workflow run my-workflow --verbose
```

#### Issue: Templates not found

**Cause**: Template directory not configured correctly.

**Solution**:
```javascript
// gitvan.config.js
export default {
  templates: {
    dirs: [
      'templates',
      '.gitvan/templates',
      'node_modules/@gitvan/templates'
    ]
  }
};
```

#### Issue: Jobs not running

**Cause**: Daemon not started or job directory not configured.

**Solution**:
```bash
# Start daemon
gitvan daemon start

# Verify configuration
gitvan config show | grep jobs

# List discovered jobs
gitvan job list
```

#### Issue: Performance is slow

**Cause**: Too many sequential operations or caching disabled.

**Solution**:
```javascript
// gitvan.config.js
export default {
  workflows: {
    parallel: true,   // Enable parallel execution
    cache: true       // Enable caching
  },
  graph: {
    cache: true       // Cache RDF graphs
  }
};
```

### Debug Mode

Enable verbose logging:

```bash
# Set environment variable
export DEBUG=gitvan:*

# Run command
gitvan workflow run my-workflow

# Or inline
DEBUG=gitvan:* gitvan workflow run my-workflow
```

### Getting Help

1. Check documentation: https://gitvan.dev/docs
2. Search issues: https://github.com/yourusername/gitvan/issues
3. Ask in discussions: https://github.com/yourusername/gitvan/discussions
4. Join community: https://discord.gg/gitvan

---

## Next Steps

Now that you have GitVan set up, explore these topics:

### 1. Advanced Workflows
- Learn about complex DAG structures
- Implement conditional steps
- Use workflow variables and contexts
- Handle errors and retries

See: [Advanced Workflows Guide](./ADVANCED_WORKFLOWS.md)

### 2. Pack Development
- Create reusable packs
- Publish to marketplace
- Version and dependencies
- Pack security

See: [Pack Development Guide](./PACK_DEVELOPMENT.md)

### 3. AI Integration
- Configure AI providers
- Context-aware code generation
- Learning from feedback
- Custom prompts

See: [AI Integration Guide](./AI_INTEGRATION.md)

### 4. RDF and SPARQL
- Understanding semantic graphs
- Writing SPARQL queries
- Custom ontologies
- Federated queries

See: [RDF Guide](./RDF_GUIDE.md)

### 5. Production Deployment
- Security best practices
- Performance optimization
- Monitoring and alerting
- Backup and recovery

See: [Production Guide](./PRODUCTION.md)

---

## Example Projects

Explore complete example projects:

- **CI/CD Pipeline**: Automated testing and deployment
  - Location: `examples/ci-cd-pipeline/`
  - Features: GitHub Actions integration, Docker builds, multi-stage deployment

- **Code Generator**: Template-based code generation
  - Location: `examples/code-generator/`
  - Features: React components, API endpoints, database models

- **Documentation Site**: Automated docs generation
  - Location: `examples/docs-site/`
  - Features: Markdown to HTML, API reference, search indexing

- **Monorepo Manager**: Multi-package repository automation
  - Location: `examples/monorepo/`
  - Features: Dependency management, version sync, batch operations

## Community Resources

- **Blog**: https://gitvan.dev/blog
- **YouTube**: https://youtube.com/gitvan
- **Twitter**: https://twitter.com/gitvan
- **Newsletter**: https://gitvan.dev/newsletter

---

**Welcome to GitVan!** You're now ready to automate your development workflows with Git-native power.

Questions? Open an issue or join our community discussions.

Happy automating!
