# GitVan v2 - The UnJS-powered Git Workflow Automation Toolkit

[![npm version](https://badge.fury.io/js/gitvan.svg)](https://badge.fury.io/js/gitvan)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

GitVan v2 is a modern, local-first Git workflow automation toolkit that makes routine development tasks disappear. Built on the powerful UnJS ecosystem, it provides composable Git operations, event-driven automation, and AI-powered assistance—all with auditable receipts stored natively in Git.

## Why GitVan?

**Stop writing glue scripts.** GitVan turns your Git repository into an intelligent automation platform where workflows live alongside your code, not buried in CI configurations.

- 🚀 **5-minute setup** from clean repo to first automation
- 🔒 **Git-native receipts** for every operation (no external databases)
- ⚡ **Sub-300ms performance** for most operations
- 🧠 **AI-powered** job generation and assistance (local-first with Ollama)
- 🔧 **Composable architecture** with useGit, useTemplate, and more
- 📦 **UnJS ecosystem** powers - built on proven foundations
- 🔐 **Worktree-safe** with atomic locking and isolation

## Quick Start

Get your first automation running in under 5 minutes:

```bash
# Install GitVan
npm install -g gitvan

# Initialize in your repository
cd your-repo
gitvan daemon start

# Generate your first job with AI
gitvan chat generate "Create a changelog job that runs when tags are created"

# Run it immediately
gitvan job run changelog
```

[→ Complete Getting Started Guide](./getting-started.md)

## Core Concepts

### Jobs
Self-contained automation scripts that live in your `jobs/` directory:

```javascript
// jobs/changelog.mjs
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { desc: "Generate changelog from commits" },
  on: { tagCreate: "v*" }, // Trigger on version tags
  async run({ ctx }) {
    const { useGit, useTemplate } = await import("gitvan/composables")
    const git = useGit()
    const tpl = useTemplate()

    const commits = await git.logSince("HEAD~10")
    const changelog = await tpl.render("changelog.njk", { commits })

    await git.writeFile("CHANGELOG.md", changelog)
    return { ok: true, artifacts: ["CHANGELOG.md"] }
  }
})
```

### Composables
Powerful, reusable Git and template operations:

- **`useGit()`** - Git operations (commit, tag, diff, etc.)
- **`useTemplate()`** - Nunjucks templating with inflection helpers
- **`useExec()`** - Safe command execution with sandboxing

### Events
Declarative triggers that respond to Git changes:

```javascript
// Trigger on any tag creation
on: { tagCreate: ".*" }

// Trigger on file changes
on: { pathChanged: ["src/**/*.js", "docs/**/*.md"] }

// Trigger on merge to main
on: { mergeTo: "main" }

// Complex conditions
on: {
  all: [
    { message: "feat:" },
    { pathChanged: ["src/**"] }
  ]
}
```

### AI Integration
Local-first AI assistance with auditable receipts:

```bash
# Generate jobs conversationally
gitvan chat generate "Create a job that updates README on releases"

# Direct AI calls with receipts
gitvan llm call "Summarize recent commits for release notes"

# List available models (Ollama integration)
gitvan llm models
```

## Features

### 🎯 **Automation Without Overhead**
- **Filesystem discovery** - Drop jobs in `jobs/`, events in `events/`
- **Zero-config cron** - `*.cron.mjs` files automatically scheduled
- **Event-driven** - Respond to commits, tags, merges, file changes
- **Template engine** - Nunjucks with inflection helpers included

### 🔒 **Audit-First Design**
- **Git-native receipts** stored in `refs/notes/gitvan/results`
- **Deterministic execution** with recorded seeds and parameters
- **Atomic locking** prevents duplicate runs across worktrees
- **Signed operations** for compliance and security

### 🧠 **AI-Powered Assistance**
- **Local-first** with Ollama (no cloud required)
- **Template-driven** prompts for consistent outputs
- **Receipt generation** for all AI operations
- **Redaction controls** to protect sensitive data

### ⚡ **Performance & Reliability**
- **p95 < 300ms** for simple operations
- **Worktree isolation** prevents conflicts
- **Background daemon** for continuous monitoring
- **Cross-platform** support (Windows, macOS, Linux)

## Installation

### Prerequisites
- **Node.js 18+**
- **Git** (any recent version)
- **pnpm 8+** (recommended) or npm
- **Ollama** (optional, for AI features)

### Install GitVan

```bash
# Global installation
npm install -g gitvan

# Or use pnpm
pnpm add -g gitvan

# Or run without installing
npx gitvan help
```

### AI Setup (Optional)

For AI-powered features, install Ollama:

```bash
# Install Ollama (https://ollama.ai)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2

# Verify integration
gitvan llm models
```

## Architecture

GitVan v2 is built on a modular, composable architecture:

```
src/
├── composables/     # Reusable Git & template operations
├── jobs/           # Job discovery, execution, and scheduling
├── runtime/        # Core execution engine and daemon
├── router/         # Event matching and routing
├── ai/             # AI providers and prompt templates
├── schemas/        # Zod validation schemas
├── cli/            # Command-line interface
└── utils/          # Shared utilities
```

### Key Technologies
- **UnJS ecosystem** - Modern JavaScript tooling
- **Nunjucks** - Powerful templating engine
- **Zod** - Runtime type validation
- **Git notes** - Native receipt storage
- **Ollama** - Local AI inference

## Documentation

### Getting Started
- [Installation & Setup](./getting-started.md)
- [Your First Job](./getting-started.md#your-first-job)
- [Understanding Events](./getting-started.md#understanding-events)

### Guides
- [Job Development](./guides/job-development.md)
- [Event-Driven Automation](./guides/events.md)
- [AI Integration](./guides/ai-integration.md)
- [Templates & Rendering](./guides/templates.md)
- [Daemon & Scheduling](./guides/daemon.md)

### API Reference
- [Composables API](./api/composables.md)
- [Job Definition](./api/job-definition.md)
- [Event Predicates](./api/event-predicates.md)
- [Configuration](./reference/configuration.md)

### Advanced Topics
- [Receipt System](./advanced/receipts.md)
- [Worktree Safety](./advanced/worktrees.md)
- [Security & Compliance](./advanced/security.md)
- [Performance Tuning](./advanced/performance.md)

### Examples
- [Common Recipes](./examples/recipes.md)
- [AI-Powered Workflows](./examples/ai-workflows.md)
- [CI/CD Integration](./examples/cicd.md)

## CLI Reference

```bash
# Daemon management
gitvan daemon start                    # Start automation daemon
gitvan daemon status                   # Check daemon status
gitvan daemon stop                     # Stop daemon

# Job operations
gitvan job list                        # List available jobs
gitvan job run <name>                  # Run specific job
gitvan job plan <name>                 # Show what job would do

# Event management
gitvan event list                      # List event-driven jobs
gitvan event simulate --files "src/**" # Test event matching

# AI operations
gitvan llm call "<prompt>"            # Generate text with AI
gitvan llm models                     # List available models
gitvan chat generate "<description>"   # Generate job via chat

# Scheduling
gitvan cron list                      # List scheduled jobs
gitvan cron start                     # Start cron scheduler

# Audit & compliance
gitvan audit build                    # Generate audit report
gitvan audit verify                   # Verify receipts
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](../LICENSE) for details.

## Support

- 📖 [Documentation](./getting-started.md)
- 🐛 [Issues](https://github.com/sac/gitvan/issues)
- 💬 [Discussions](https://github.com/sac/gitvan/discussions)

---

**Made with ❤️ by the GitVan team**

Ready to automate your Git workflows? [Get started now →](./getting-started.md)