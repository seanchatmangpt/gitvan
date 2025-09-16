# GitVan v2

**Git-Native Automation with Composables and Templates**

GitVan v2 is a lean, single-package JavaScript solution that transforms your Git repository into an intelligent automation platform. Built with modern composables, Nunjucks templates, and Git-native storage, it provides zero-configuration workflow automation with Vue-inspired ergonomics.

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
- **Vue-inspired ergonomics** with `useGit()`, `useTemplate()`, `useExec()`
- **Automatic dependency injection** using unctx
- **Context isolation** for concurrent execution

### 📝 **Five Execution Types**
- **`cli`** - Shell command execution with environment control
- **`js`** - JavaScript module execution with import resolution  
- **`llm`** - Language model integration (Ollama, OpenAI, etc.)
- **`job`** - Recursive job execution for composition
- **`tmpl`** - Nunjucks template rendering with Git context

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
│   ├── exec.mjs         # Execution composable
│   └── index.mjs        # Composable exports
├── runtime/              # Core runtime engine
│   ├── boot.mjs         # Context bootstrapping
│   ├── define.mjs       # Job definition system
│   ├── daemon.mjs       # Worktree-scoped daemon
│   ├── events.mjs       # Event discovery and routing
│   ├── locks.mjs        # Distributed locking
│   └── receipt.mjs      # Execution receipts
└── cli.mjs              # Command-line interface
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

### Basic Job Execution

```bash
# Run a specific job
gitvan run docs:changelog

# List available jobs
gitvan list
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

### Event Discovery

```bash
# List discovered events
gitvan event list

# List all worktrees
gitvan worktree list
```

## 🔧 Job Definition

Jobs are defined using the `defineJob()` pattern with composables:

```javascript
// jobs/docs/changelog.mjs
import { defineJob } from '../../src/runtime/define.mjs'
import { useGit } from '../../src/composables/git.mjs'
import { useTemplate } from '../../src/composables/template.mjs'

export default defineJob({
  kind: 'atomic',
  meta: { 
    desc: 'Generate CHANGELOG.md', 
    schedule: '0 3 * * *' 
  },
  async run() {
    const git = useGit()
    const t = useTemplate()
    
    const commits = git.run('log --pretty=%h%x09%s -n 50').split('\n')
    t.renderToFile('templates/changelog.njk', 'dist/CHANGELOG.md', { commits })
    
    return { ok: true, artifact: 'dist/CHANGELOG.md' }
  }
})
```

### Job Types

- **`atomic`** - Single execution unit
- **`composite`** - Multiple steps with dependencies
- **`sequence`** - Sequential execution
- **`parallel`** - Concurrent execution

## 🎨 Template System

GitVan includes first-class Nunjucks template support with Git context injection:

```njk
<!-- templates/changelog.njk -->
# Changelog
Generated: {{ nowISO }}

{% for line in commits %}
- {{ line }}
{% endfor %}
```

### Template Features
- **Git context injection** - `{{ git.branch() }}`, `{{ git.head() }}`
- **Deterministic helpers** - `{{ nowISO }}`, `{{ formatDate() }}`
- **File output** - Render directly to files
- **Include/extends** - Full Nunjucks functionality

## ⚙️ Configuration

Create `gitvan.config.js` in your project root:

```javascript
export default {
  // Repository settings
  repo: {
    defaultBranch: "main",
    notesRef: "refs/notes/gitvan",
    signing: { require: true }
  },

  // LLM configuration
  llm: {
    baseURL: "http://localhost:11434", // Ollama
    model: "llama3.2",
    temperature: 0.2
  },

  // Event-driven automation
  events: [
    {
      id: "daily-summary",
      workflow: "cron",
      schedule: "0 18 * * *",
      run: { type: "cookbook", recipe: "dev-diary" }
    }
  ]
}
```

## 🔌 Composables API

### `useGit()`
```javascript
const git = useGit()
git.run('log --oneline -10')        // Execute git command
git.branch()                        // Current branch
git.head()                          // Current HEAD
git.note('refs/notes/test', 'msg')  // Add git note
```

### `useTemplate()`
```javascript
const t = useTemplate()
t.render('template.njk', { data })           // Render to string
t.renderToFile('template.njk', 'out.md', {}) // Render to file
```

### `useExec()`
```javascript
const exec = useExec()
exec.cli('npm', ['test'])                    // CLI execution
exec.js('./script.mjs', 'default', {})       // JS execution
exec.tmpl({ template: 'test.njk', data: {} }) // Template execution
```

## 🎯 Event System

GitVan discovers events through file system conventions:

```
events/
├── cron/
│   └── 0_9_*_*_*.mjs          # Daily at 9 AM
├── merge-to/
│   └── main.mjs               # On merge to main
├── push-to/
│   └── feature/*.mjs          # On push to feature/*
└── message/
    └── release.mjs            # On commit message "release"
```

### Event Handler Example
```javascript
// events/merge-to/main.mjs
export default async function handler({ payload, git, meta }) {
  const git = useGit()
  // Deploy to production
  return { ok: true, action: 'deploy' }
}
```

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

- **[Specifications](./specs/)** - Complete system specifications
- **[API Contracts](./specs/docs/API_CONTRACTS.md)** - Detailed API documentation
- **[Architecture Decisions](./specs/docs/ARCHITECTURE_DECISIONS.md)** - Design rationale
- **[Implementation Guide](./specs/docs/IMPLEMENTATION_GUIDE.md)** - Development guide

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test composables
pnpm test runtime
pnpm test cli

# Run with coverage
pnpm test --coverage
```

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

---

**Transform your Git workflow with intelligent automation. Start with GitVan v2 today!**