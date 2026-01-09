# GitVan

Git-native development automation platform that brings Git into your workflow system.

[![npm version](https://badge.fury.io/js/gitvan.svg)](https://www.npmjs.com/package/gitvan)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

## What is GitVan?

GitVan is a development automation platform that uses Git as its native storage layer. Define workflows in semantic Turtle format, trigger them on Git events, and track everything with cryptographic immutability.

**Key Features:**

- **Git-Native Storage**: No external databases - everything lives in Git refs, notes, and branches
- **Semantic Workflows**: Define workflows in RDF/Turtle with SPARQL query support
- **Event-Driven**: Trigger workflows on commits, pushes, merges, and custom events
- **Composable API**: Vue-inspired composables for all operations
- **Pack System**: Bundle and share templates, jobs, and workflows as packages
- **AI Integration**: Multi-provider AI support (Anthropic, Ollama) with context awareness
- **Immutable Audit**: Cryptographically signed audit trails in Git notes
- **Zero Dependencies**: Works entirely within Git - no external services required

## Installation

```bash
npm install gitvan
```

**Requirements:**
- Node.js 18 or higher
- Git 2.30 or higher
- ES Modules support

## Quick Start

### 1. Initialize GitVan in Your Repository

```bash
# Initialize GitVan configuration
npx gitvan init

# This creates:
# - gitvan.config.js (configuration)
# - .gitvan/ directory (workflows, templates, jobs)
```

### 2. Create Your First Workflow

Create `.gitvan/workflows/build-test.ttl`:

```turtle
@prefix : <http://gitvan.dev/workflow/> .
@prefix step: <http://gitvan.dev/step/> .

:BuildAndTest a :Workflow ;
  :hasStep step:install ;
  :hasStep step:build ;
  :hasStep step:test .

step:install a :ScriptStep ;
  :script "npm install" .

step:build a :ScriptStep ;
  :script "npm run build" ;
  :dependsOn step:install .

step:test a :TestStep ;
  :script "npm test" ;
  :dependsOn step:build .
```

### 3. Use GitVan Programmatically

```javascript
import { withGitVan, useGit, useWorkflow } from 'gitvan';

// Create context
const context = {
  repo: process.cwd(),
  config: {}
};

// Execute operations within GitVan context
await withGitVan(context, async () => {
  // Git operations
  const git = useGit();
  const status = await git.status();
  console.log('Current branch:', status.branch);

  // Run workflow
  const workflow = useWorkflow();
  await workflow.execute('build-test');
});
```

### 4. CLI Commands

```bash
# List available workflows
gitvan workflow list

# Execute a workflow
gitvan workflow run build-test

# Check Git status
gitvan git status

# Start background daemon
gitvan daemon start

# View audit trail
gitvan audit show
```

## Core Concepts

### Composables (use* functions)

All GitVan functionality is exposed through composables - context-aware functions that must be used within `withGitVan()`:

```javascript
import { withGitVan, useGit, useTemplate, useJob } from 'gitvan';

await withGitVan(context, async () => {
  const git = useGit();
  const template = useTemplate();
  const job = useJob();

  // All operations preserve async context
  await git.commit('feat: add feature');
  const rendered = await template.render('my-template.njk', { data });
  await job.execute('background-task');
});
```

### Git-Native Storage

GitVan stores everything in Git:

- **Workflows**: Git refs and tree objects
- **Audit Trail**: Git notes (`refs/notes/gitvan/audit`)
- **State**: Git branches and tags
- **Metadata**: Git commit messages and signatures

No databases, no external storage - just Git.

### Workflow DAG

Workflows are dependency graphs executed in parallel when possible:

```turtle
step:deploy a :DeployStep ;
  :dependsOn step:test ;
  :dependsOn step:build ;
  :script "npm run deploy" .
```

GitVan automatically:
- Resolves dependencies
- Runs independent steps in parallel
- Handles errors without cascading failures
- Records execution in audit trail

### Pack System

Packs bundle reusable functionality:

```bash
# Install a pack
gitvan pack install @gitvan/ci-cd

# List installed packs
gitvan pack list

# Create your own pack
gitvan pack create my-pack
```

Packs can contain:
- Templates (Nunjucks)
- Jobs (background tasks)
- Workflows (DAG definitions)
- Dependencies on other packs

## API Overview

### Composables

| Composable | Purpose | Key Methods |
|------------|---------|-------------|
| `useGit()` | Git operations | `status()`, `commit()`, `branch()`, `merge()`, `push()`, `pull()` |
| `useWorkflow()` | Workflow execution | `execute()`, `list()`, `parse()`, `validate()` |
| `useTemplate()` | Template rendering | `render()`, `compile()`, `addFilter()` |
| `useJob()` | Job scheduling | `execute()`, `schedule()`, `scan()` |
| `useEvent()` | Event system | `emit()`, `on()`, `once()` |
| `usePack()` | Pack management | `install()`, `remove()`, `list()` |
| `useReceipt()` | Audit trail | `write()`, `read()`, `verify()` |
| `useLock()` | Distributed locking | `acquire()`, `release()`, `extend()` |

### CLI Commands

```bash
gitvan workflow <run|list|validate>    # Workflow operations
gitvan git <status|commit|branch>      # Git operations
gitvan pack <install|remove|list>      # Pack management
gitvan job <run|schedule|list>         # Job operations
gitvan daemon <start|stop|status>      # Background daemon
gitvan event <emit|listen>             # Event system
gitvan audit <show|verify>             # Audit trail
gitvan template <render|list>          # Template operations
```

## Configuration

Create `gitvan.config.js` in your repository root:

```javascript
export default {
  // Job configuration
  jobs: {
    dir: 'jobs'
  },

  // Template configuration
  templates: {
    dirs: ['templates'],
    autoescape: false,
    globals: {
      // Global template variables
    }
  },

  // Audit trail configuration
  receipts: {
    ref: 'refs/notes/gitvan/audit'
  },

  // Security policy
  policy: {
    requireSignedCommits: true
  },

  // RDF graph configuration
  graph: {
    dir: 'graph',
    autoLoad: true
  }
};
```

### Environment Variables

```bash
GITVAN_HOME=/path/to/config      # Configuration directory
GITVAN_REPO=/path/to/repo        # Repository path
AI_PROVIDER=anthropic            # AI provider (anthropic/ollama)
ANTHROPIC_API_KEY=sk-ant-xxx     # Anthropic API key
NODE_ENV=production              # Environment
```

## Examples

### Trigger Workflow on Git Events

```javascript
import { withGitVan, useEvent, useWorkflow } from 'gitvan';

await withGitVan(context, async () => {
  const event = useEvent();
  const workflow = useWorkflow();

  // Listen for commit events
  event.on('git:commit', async ({ sha, message }) => {
    console.log(`Commit ${sha}: ${message}`);

    // Trigger workflow
    await workflow.execute('post-commit');
  });
});
```

### Render Templates

```javascript
import { withGitVan, useTemplate } from 'gitvan';

await withGitVan(context, async () => {
  const template = useTemplate();

  // Render template with data
  const output = await template.render('component.njk', {
    name: 'MyComponent',
    props: ['title', 'description']
  });

  console.log(output);
});
```

### Schedule Background Jobs

```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan(context, async () => {
  const job = useJob();

  // Schedule job (cron syntax)
  await job.schedule('cleanup', {
    cron: '0 0 * * *',  // Daily at midnight
    async run() {
      // Cleanup logic
    }
  });
});
```

### Audit Trail Verification

```javascript
import { withGitVan, useReceipt } from 'gitvan';

await withGitVan(context, async () => {
  const receipt = useReceipt();

  // Write audit record
  await receipt.write({
    action: 'workflow:execute',
    workflow: 'build-test',
    status: 'success',
    timestamp: new Date().toISOString()
  });

  // Verify audit trail
  const records = await receipt.read();
  const verified = await receipt.verify(records);
  console.log('Audit trail valid:', verified);
});
```

## Advanced Features

### Multi-Provider AI

```javascript
import { withGitVan, useAI } from 'gitvan';

await withGitVan(context, async () => {
  const ai = useAI();

  // Generate code with context awareness
  const code = await ai.generate({
    prompt: 'Create a React component',
    context: {
      repo: process.cwd(),
      files: ['src/components/']
    }
  });

  console.log(code);
});
```

### SPARQL Queries

```javascript
import { withGitVan, useGraph } from 'gitvan';

await withGitVan(context, async () => {
  const graph = useGraph();

  // Query workflows
  const results = await graph.query(`
    PREFIX : <http://gitvan.dev/workflow/>
    SELECT ?workflow ?step
    WHERE {
      ?workflow a :Workflow ;
        :hasStep ?step .
    }
  `);

  console.log(results);
});
```

### Distributed Locking

```javascript
import { withGitVan, useLock } from 'gitvan';

await withGitVan(context, async () => {
  const lock = useLock();

  // Acquire lock
  const lockId = await lock.acquire('resource-name', {
    ttl: 30000  // 30 seconds
  });

  try {
    // Critical section
    await performOperation();
  } finally {
    // Release lock
    await lock.release(lockId);
  }
});
```

## Testing

GitVan includes comprehensive testing utilities:

```javascript
import { describe, it, expect } from 'vitest';
import { withGitVan, useGit } from 'gitvan';
import { createTestContext } from 'gitvan/test-utils';

describe('My Feature', () => {
  it('should work with GitVan context', async () => {
    const context = createTestContext();

    await withGitVan(context, async () => {
      const git = useGit();
      const status = await git.status();

      expect(status).toBeDefined();
    });
  });
});
```

## Performance

GitVan is designed for performance:

- **Parallel Execution**: Independent workflow steps run concurrently
- **Smart Caching**: RDF graphs and Git objects are cached
- **Minimal Overhead**: Direct Git operations without abstraction layers
- **Efficient Storage**: Deduplication via Git's object store

Benchmarks:
- Workflow execution: ~50ms overhead per step
- Git operations: Near-native performance
- Template rendering: ~10ms for typical templates
- SPARQL queries: ~5ms for simple queries

## Architecture

GitVan follows a composable architecture:

```
┌─────────────────────────────────────┐
│         CLI / API Entry             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      withGitVan() Context           │
│    (unctx - async preservation)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Composables Layer           │
│  useGit, useWorkflow, useTemplate   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Core Systems                │
│  Git Native I/O, RDF Engine, Jobs   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Git Storage Layer           │
│   Refs, Notes, Branches, Objects    │
└─────────────────────────────────────┘
```

## Troubleshooting

### Context Not Available Error

**Problem**: `Error: GitVan context not available`

**Solution**: Ensure all composable calls are wrapped in `withGitVan()`:

```javascript
// Wrong
const git = useGit();
await someAsync();
await git.commit('msg');  // Context lost!

// Correct
await withGitVan(context, async () => {
  const git = useGit();
  await someAsync();
  await git.commit('msg');  // Context preserved
});
```

### Workflow Execution Fails

**Problem**: Workflow steps not executing

**Solution**: Check workflow syntax and dependencies:

```bash
# Validate workflow
gitvan workflow validate my-workflow

# Check logs
gitvan daemon logs
```

### Performance Issues

**Problem**: Slow workflow execution

**Solution**: Enable caching and parallel execution:

```javascript
export default {
  workflow: {
    parallel: true,
    cache: true
  }
};
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes (TDD approach)
4. Ensure tests pass (`npm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/gitvan.git
cd gitvan

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run in development
npm run dev
```

### Code Standards

- ES Modules only (no CommonJS)
- Test coverage: 80% minimum
- All async operations wrapped in `withGitVan()`
- Follow composable patterns (`use*` prefix)
- Files under 500 lines
- Deterministic operations (no random values)

See [CLAUDE.md](./CLAUDE.md) for detailed development guidelines.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Links

- [Documentation](https://gitvan.dev/docs)
- [GitHub Repository](https://github.com/yourusername/gitvan)
- [Issue Tracker](https://github.com/yourusername/gitvan/issues)
- [Changelog](./CHANGELOG.md)
- [Contributing Guide](./CONTRIBUTING.md)

## Support

- Documentation: https://gitvan.dev/docs
- Issues: https://github.com/yourusername/gitvan/issues
- Discussions: https://github.com/yourusername/gitvan/discussions

## Acknowledgments

GitVan is built on top of excellent open source projects:

- [unjs](https://github.com/unjs) ecosystem (citty, unctx, c12, defu, hookable)
- [isomorphic-git](https://isomorphicgit.org/) for Git operations
- [unrdf](https://github.com/jeswr/unrdf) for RDF/SPARQL support
- [nunjucks](https://mozilla.github.io/nunjucks/) for templating
- [vitest](https://vitest.dev/) for testing

---

**GitVan v1.0.0** - Git-native development automation for modern workflows.
