# GitVan v2

**Git-Native Job System with Composables**

GitVan v2 is a Git-native job system that transforms your Git repository into an intelligent automation platform. Built with modern composables, Nunjucks templates, and Git-native storage, it provides zero-configuration workflow automation with Vue-inspired ergonomics.

## 🚀 Quick Start

```bash
# Install GitVan globally
npm install -g gitvan

# Navigate to your Git repository
cd your-project

# Run a job
gitvan run docs:changelog

# Start the daemon for continuous automation
gitvan daemon start
```

## ✨ Key Features

### 🎯 **Composables-First API**
- **Vue-inspired ergonomics** with `useGit()`, `useTemplate()`
- **Automatic dependency injection** using unctx
- **Context isolation** for concurrent execution

### 🔄 **Git-Native Job System**
- **Filesystem discovery** of jobs in `jobs/` directory
- **Multiple job types**: on-demand, cron, event-driven
- **Atomic execution** with Git refs for locking
- **Auditable receipts** stored in Git notes

### 📝 **Advanced Template System**
- **Nunjucks templates** with Git context injection
- **Inflection filters** for string transformations
- **Deterministic rendering** with cached environments
- **File and string output** support

### 🌳 **Git-Native Storage**
- **Git refs** for distributed locking across worktrees
- **Git notes** for execution metadata and receipts
- **No external databases** - everything stored in Git

### 🔄 **Worktree-Aware Design**
- **Per-worktree daemons** with complete isolation
- **Distributed locking** prevents conflicts
- **Concurrent execution** across multiple branches

## 🏗️ Architecture

GitVan v2 is built as a **single package** with clear internal boundaries:

```
src/
├── composables/          # Vue-inspired composables API
│   ├── ctx.mjs          # Context management (unctx)
│   ├── git.mjs          # Git operations composable
│   ├── template.mjs     # Nunjucks template composable
│   └── index.mjs        # Composable exports
├── jobs/                 # Job system implementation
│   ├── define.mjs       # Job definition system
│   ├── scan.mjs         # Filesystem job discovery
│   ├── runner.mjs       # Job execution engine
│   ├── cron.mjs         # Cron scheduler
│   ├── events.mjs       # Event-driven jobs
│   ├── daemon.mjs       # Background daemon
│   └── hooks.mjs        # Lifecycle hooks
├── config/               # Configuration system
│   ├── defaults.mjs     # Default configuration
│   ├── loader.mjs      # Configuration loading
│   └── runtime-config.mjs # Runtime normalization
├── utils/                # Utility functions
│   └── nunjucks-config.mjs # Template configuration
└── cli/                  # Command-line interface
    └── job.mjs          # Job management commands
```

## 📦 Installation

### Prerequisites
- **Node.js** 18+ 
- **Git** 2.30+ with GPG signing (recommended)
- **pnpm** 8+ (for development)

### Global Installation
```bash
npm install -g gitvan
```

### Development Setup
```bash
# Clone the repository
git clone https://github.com/sac/gitvan.git
cd gitvan

# Install dependencies
pnpm install

# Run tests
pnpm test

# Start development CLI
pnpm dev
```

## 🎮 Usage

### Job Management

```bash
# List available jobs
gitvan job list

# Run a specific job
gitvan job run --name docs:changelog

# Run job with payload
gitvan job run --name foundation:template-greeting --payload '{"custom": "value"}'

# Show job details
gitvan job show docs:changelog

# Plan job execution (dry run)
gitvan job plan docs:changelog
```

### Daemon Management

```bash
# Start daemon for current worktree
gitvan daemon start

# Start daemon for all worktrees
gitvan daemon start --worktrees all

# Check daemon status
gitvan daemon status

# Stop daemon
gitvan daemon stop
```

### Lock Management

```bash
# List active job locks
gitvan job locks

# Unlock a specific job
gitvan job unlock docs:changelog
```

## 🔧 Job Definition

Jobs are defined using the `defineJob()` pattern with composables:

```javascript
// jobs/docs/changelog.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";

export default defineJob({
  meta: { 
    desc: "Generate CHANGELOG.md from git log",
    tags: ["documentation", "changelog"]
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const template = await useTemplate();
    
    // Get commits
    const logOutput = await git.log("%h%x09%s", ["-n", "50"]);
    const commits = logOutput.split("\n").filter(Boolean);
    
    // Render template to file
    const outputPath = await template.renderToFile(
      "changelog.njk",
      "dist/CHANGELOG.md",
      { commits, generatedAt: ctx.nowISO }
    );
    
    return {
      ok: true,
      artifacts: [outputPath]
    };
  }
});
```

### Job Types

- **On-demand** - Manual execution via CLI
- **Cron** - Scheduled execution (`.cron.mjs` suffix)
- **Event-driven** - Triggered by Git events (`.evt.mjs` suffix)

## 🎨 Template System

GitVan includes first-class Nunjucks template support with Git context injection:

```njk
<!-- templates/changelog.njk -->
# Changelog

Generated at: {{ generatedAt }}
Total commits: {{ commits.length }}

## Recent Changes

{% for commit in commits %}
- **{{ commit.split('\t')[0] }}** {{ commit.split('\t')[1] }}
{% endfor %}

---
*Generated by GitVan Jobs System*
```

### Template Features
- **Git context injection** - Access to repository information
- **Inflection filters** - `titleize`, `camelize`, `underscore`, etc.
- **Deterministic helpers** - `nowISO`, `formatDate()`
- **File output** - Render directly to files
- **Include/extends** - Full Nunjucks functionality

## ⚙️ Configuration

Create `gitvan.config.js` in your project root:

```javascript
export default {
  // Repository settings
  root: process.cwd(),
  
  // Job configuration
  jobs: {
    dir: "jobs"
  },
  
  // Template configuration
  templates: {
    engine: "nunjucks",
    dirs: ["templates"]
  },
  
  // Receipts configuration
  receipts: {
    ref: "refs/notes/gitvan/results"
  },
  
  // Custom hooks
  hooks: {
    "job:after": (payload, result) => {
      console.log(`Job completed: ${payload.jobId}`);
    }
  }
};
```

## 🔌 Composables API

### `useGit()`
```javascript
const git = useGit();

// Basic Git operations
await git.run("log --oneline -10");
await git.head();                    // Current HEAD
await git.getCurrentBranch();        // Current branch
await git.isClean();                 // Working directory status

// Git notes
await git.noteAdd("refs/notes/test", "message");
await git.noteShow("refs/notes/test");

// Atomic operations
await git.updateRefCreate("refs/gitvan/lock/job-id", commitSha);
```

### `useTemplate()`
```javascript
const template = await useTemplate();

// Render to string
const html = await template.renderString("Hello {{ name }}!", { name: "World" });

// Render to file
const outputPath = await template.renderToFile(
  "template.njk",
  "dist/output.html",
  { data: "value" }
);
```

## 🎯 Event System

GitVan supports event-driven jobs with Git-native predicates:

```javascript
// jobs/alerts/release.evt.mjs
import { defineJob } from "gitvan/define";

export default defineJob({
  meta: {
    desc: "Notify on new releases",
    tags: ["alerts", "releases"]
  },
  on: {
    any: [
      { tagCreate: true },
      { semverTag: true }
    ]
  },
  async run({ ctx, payload }) {
    // Handle release notification
    return { ok: true };
  }
});
```

### Event Predicates
- **`tagCreate`** - New tag created
- **`semverTag`** - Semantic version tag
- **`branchCreate`** - New branch created
- **`mergeTo`** - Merge to specific branch
- **`pushTo`** - Push to specific branch pattern

## 🚀 Performance

GitVan v2 is optimized for speed and efficiency:

- **Job execution**: < 100ms for simple tasks
- **Template rendering**: > 1000 templates/second
- **Daemon memory**: < 50MB baseline usage
- **Lock contention**: < 1 second resolution
- **Context initialization**: < 50ms

## 🛡️ Security

- **Git-native authentication** with signed commits
- **Path traversal prevention** in all file operations
- **Input validation** and sanitization
- **No external dependencies** for core functionality
- **Worktree isolation** prevents cross-contamination

## 📚 Documentation

### Core Documentation
- **[Playground Guide](./docs/playground/)** - Complete developer guide for the playground application
- **[Cookbook](./docs/cookbook/)** - Practical recipes and patterns for common use cases

### Playground Documentation
- **[Playground README](./docs/playground/README.md)** - Main developer guide
- **[Job Examples](./docs/playground/job-examples.md)** - Detailed job examples and patterns
- **[Testing Guide](./docs/playground/testing-guide.md)** - Testing strategies and best practices
- **[Architecture Guide](./docs/playground/architecture-guide.md)** - System architecture overview
- **[Troubleshooting Guide](./docs/playground/troubleshooting-guide.md)** - Common issues and solutions

### Cookbook Recipes
- **[Foundation Recipes](./docs/cookbook/foundation/)** - Basic job setup, configuration, templates, error handling
- **[Documentation Recipes](./docs/cookbook/documentation/)** - Changelog generation, documentation automation
- **[CI/CD Recipes](./docs/cookbook/cicd/)** - Build automation, deployment workflows

### API Reference
- **[Composables API](./src/composables/)** - `useGit`, `useTemplate`, context management
- **[Job System API](./src/jobs/)** - Job definition, execution, scheduling
- **[Configuration API](./src/config/)** - Configuration loading and normalization

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test composables
pnpm test jobs
pnpm test config

# Run E2E tests
pnpm test playground-e2e
pnpm test playground-cookbook-e2e

# Run with coverage
pnpm test --coverage
```

## 🎮 Playground

The GitVan playground is a self-contained example application that demonstrates all features:

```bash
# Navigate to playground
cd playground

# Install dependencies
pnpm install

# Start development mode
pnpm dev

# Run specific jobs
pnpm run:changelog
pnpm run:simple
```

The playground includes:
- **Foundation jobs** - Basic setup, file output, templates, error handling
- **Documentation jobs** - Advanced changelog generation
- **CI/CD jobs** - Build automation workflows
- **Event-driven jobs** - Release notifications
- **Comprehensive E2E tests** - Full system validation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Commands

```bash
# Install dependencies
pnpm install

# Run linting
pnpm lint

# Type checking
pnpm typecheck

# Clean build artifacts
pnpm clean
```

## 📄 License

Published under the [MIT](./LICENSE) license.

## 🙏 Acknowledgments

GitVan v2 is inspired by:
- **Vue.js** for the composables pattern
- **Git** for the powerful foundation
- **Nunjucks** for template rendering
- **unctx** for context management
- **Nitro** for configuration patterns

---

**Transform your Git workflow with intelligent automation. Start with GitVan v2 today!**