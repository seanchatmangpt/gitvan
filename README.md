# GitVan v2

**Autonomic Git-native development automation platform with AI-powered workflows**

GitVan transforms Git into a runtime environment for development automation, providing intelligent job scheduling, template generation, and AI-powered workflow creation through a unified autonomic system. Everything happens automatically after initialization.

## 📦 NPM Package

GitVan v2.0.0 is now available on npm! Install it globally or locally:

- **Package:** [gitvan@2.0.0](https://www.npmjs.com/package/gitvan)
- **Registry:** npmjs.org
- **Size:** 3.1 MB unpacked
- **Dependencies:** 7 core packages (Ollama, Giget, Hookable, etc.)

## 🚀 Quick Start

### Installation

```bash
# Install globally for CLI access
npm install -g gitvan

# Or install locally in your project
npm install gitvan

# Verify installation
gitvan --version
```

**📦 Available on npm:** [gitvan@2.0.0](https://www.npmjs.com/package/gitvan)

### Autonomic First Run

```bash
# 1. Initialize GitVan (does everything automatically)
git init my-repo && cd my-repo
gitvan init

# 2. Start coding - GitVan handles everything
echo 'console.log("Hello GitVan!")' > index.js
gitvan save  # AI generates commit message, jobs run automatically

# 3. That's it! The system is fully autonomic
```

**What happens automatically:**
- ✅ Daemon starts and monitors Git events
- ✅ Git hooks install for automatic job execution  
- ✅ Pack registry loads for project scaffolding
- ✅ AI generates intelligent commit messages (local Ollama)
- ✅ Jobs run automatically on commits
- ✅ Complete 360 project lifecycle automation

## 🔒 Security-First AI Integration

GitVan prioritizes security with **Ollama-first AI processing**:

- **🔐 Local AI Processing**: All AI operations happen on your machine
- **🛡️ No API Keys Required**: Completely self-contained operation  
- **🏠 Offline Capable**: Works without internet connection
- **⚡ Fast & Reliable**: Local processing with timeout protection

```bash
# AI commit messages generated locally with Ollama
gitvan save  # Uses qwen3-coder:30b model locally

# Fallback to external AI only if explicitly configured
export ANTHROPIC_API_KEY="your-key"  # Optional external fallback
```

## 🏗️ Architecture Features

### **Autonomic System**
- **Single Command Setup**: `gitvan init` does everything automatically
- **Background Processing**: Non-blocking daemon and pack loading
- **Lazy Loading**: Packs loaded only when needed
- **Event-Driven**: All operations triggered by Git events

### **Job-Only Architecture** 
- **Unified Execution**: Jobs handle all automation tasks
- **No Hooks Directory**: Simplified architecture eliminates complexity
- **Direct Git Integration**: Jobs interact with Git directly
- **Automatic Discovery**: Jobs discovered and executed automatically

### **Pack System**
- **GitHub Templates**: Auto-install packs from `gitvan.config.js`
- **Lazy Registry**: Packs loaded on-demand for performance
- **Built-in Packs**: Next.js, React, Node.js starters included
- **Remote Support**: Install packs from GitHub/GitLab via Giget

### **Non-Blocking Operations**
- **Fast Init**: Completes in < 1 second with background setup
- **Timeout Protection**: All operations have safety timeouts
- **Graceful Degradation**: Continue on errors with fallbacks
- **Resource Efficient**: Load only what's needed when needed

## 🎯 GitHub Templates

Create repositories with just `gitvan.config.js` - everything else happens automatically:

### **Next.js Template**
```javascript
// gitvan.config.js
export default {
  autoInstall: {
    packs: ["nextjs-github-pack"]
  },
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b"
  }
};
```

**Usage:**
```bash
# 1. Create repository from template
# 2. Clone repository  
# 3. One command:
gitvan init

# 4. Start coding:
gitvan save
```

### **React Template**
```javascript
// gitvan.config.js  
export default {
  autoInstall: {
    packs: ["react-vite-pack", "tailwind-pack"]
  },
  ai: {
    provider: "ollama", 
    model: "qwen3-coder:30b"
  }
};
```

**Result**: Complete project setup with:
- ✅ Next.js/React project structure
- ✅ TypeScript configuration
- ✅ ESLint and Tailwind CSS
- ✅ Development server ready
- ✅ AI-powered commit messages

## 🚀 Core Commands

### **Essential Commands**
```bash
gitvan init          # Complete autonomic setup (daemon + hooks + packs)
gitvan save          # AI-powered commit with automatic job execution
gitvan help          # Show all available commands
```

### **Job Management**
```bash
gitvan list          # List available jobs
gitvan run <job>     # Run specific job manually
gitvan job list      # Detailed job information
```

### **Daemon Control**
```bash
gitvan daemon start  # Start background daemon
gitvan daemon stop   # Stop daemon
gitvan daemon status # Check daemon status
```

### **Pack Management**
```bash
gitvan pack list     # List installed packs
gitvan pack apply    # Apply pack to project
gitvan marketplace   # Browse and install packs
```

### **Advanced Features**
```bash
gitvan event simulate --files "src/**"  # Test job execution
gitvan audit build                      # Generate audit reports
gitvan chat generate "Create a job"     # AI job generation
```

## 🔄 360 Project Lifecycle

GitVan provides complete automation from initialization to deployment:

### **1. Initialization**
```bash
gitvan init  # Sets up everything automatically
```

### **2. Development** 
```bash
# Edit files
echo "console.log('Hello World')" > src/index.js

# Save with AI commit message
gitvan save  # AI generates: "feat: add Hello World console log"
```

### **3. Automation**
- Jobs run automatically on commits
- Templates generate project files
- Packs scaffold complete applications
- AI provides intelligent commit messages

### **4. Deployment**
- Built-in deployment jobs
- CI/CD integration via Git hooks
- Automated testing and validation
- Production-ready configurations

**The Result**: Complete autonomic development workflow where everything happens automatically after `gitvan init`.

## 🧩 Composables API

GitVan v2 provides a comprehensive set of composables for building automation workflows:

### Core Composables
- **`useGit`** - Git operations and repository management
- **`useWorktree`** - Git worktree management  
- **`useTemplate`** - Template rendering with Nunjucks
- **`useNotes`** - Git notes management for receipts

### Job & Hook Composables
- **`useJob`** - Job lifecycle and execution management
- **`useHook`** - Unified hooks system and triggering
- **`useSchedule`** - Cron and scheduling management

### Infrastructure Composables
- **`useReceipt`** - Receipt and audit management
- **`useLock`** - Distributed locking
- **`useRegistry`** - Job and hook registry management

### API Reference

#### defineJob
```javascript
import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'

export default defineJob({
  meta: { name: "changelog", desc: "Generate changelog from commits" },
  hooks: ["post-commit", "post-merge"], // Unified hooks system
  async run() {
    const git = useGit()
    const tpl = await useTemplate()
    const notes = useNotes()

    const commits = await git.logSinceLastTag()
    const body = tpl.render("changelog.njk", { commits })
    await git.writeFile("CHANGELOG.md", body)
    await notes.write(`changelog for ${await git.headSha()}`)
    return { ok: true, artifacts: ["CHANGELOG.md"] }
  }
})
```

#### Hooks Schema
```javascript
hooks: [
  "post-commit",    // After commit
  "post-merge",     // After merge
  "post-rewrite",   // After rebase/amend (future)
  "pre-push"        // Before push (future)
]
```

## 🎯 Job-Only Architecture

GitVan v2 features a **job-only architecture** that eliminates complexity by having jobs handle Git operations directly:

### **Single Layer Execution**
- **Jobs**: Define `hooks: ["post-commit", "post-merge"]` and handle Git operations directly
- **No Hooks Directory**: Eliminates `src/hooks/` complexity entirely
- **Registry**: Automatic job discovery and hook-to-job mapping
- **Loader**: Direct job execution - simple and predictable

### **Benefits**
- **Eliminates Complexity**: No hooks directory to maintain
- **Jobs Handle Everything**: Git operations, routing, execution all in jobs
- **Simpler Execution**: Direct job execution without intermediate layers
- **Fewer Files**: Less code to maintain and understand
- **More Intuitive**: Developers work directly with jobs

### **Git Hook Integration**
```bash
# Install Git hooks
gitvan ensure

# Manual hook execution (executes jobs directly)
gitvan hook post-commit
gitvan hook post-merge

# Event simulation
gitvan event simulate --files "src/components/Button.tsx"
```

## ✨ Features

### 🎯 **Core Capabilities**
- **Git-Native**: Uses Git refs for locking, notes for audit trails
- **Job-Only Architecture**: Single layer execution with jobs handling everything
- **Template Engine**: Nunjucks-powered with front-matter support
- **Job System**: Automated task execution with hook-based scheduling
- **Pack System**: Reusable automation components
- **Composables API**: Comprehensive composables for automation workflows
- **AI Integration**: Generate jobs and templates with AI assistance

### 📋 **Front-Matter Templates**
GitVan supports Hygen-style templates with rich front-matter:

```yaml
---
to: "src/components/{{ name | pascalCase }}.tsx"
force: "overwrite"
inject:
  - into: "src/index.ts"
    snippet: "export { {{ name | pascalCase }} } from './components/{{ name | pascalCase }}';"
    find: "// EXPORTS"
    where: "after"
sh:
  before: ["npm run lint"]
  after: ["npm run test"]
when: "{{ createComponent }}"
---
import React from 'react';

interface {{ name | pascalCase }}Props {
  // Props here
}

export const {{ name | pascalCase }}: React.FC<{{ name | pascalCase }}Props> = () => {
  return <div>{{ name | titleCase }}</div>;
};
```

### 🤖 **AI-Powered Workflows**
Generate jobs and templates using natural language:

```bash
gitvan chat generate "Create a changelog job that runs on every release"
gitvan llm call "Summarize recent commits and create a release note"
```

### 📦 **Pack System**
Create and share reusable automation components:

```bash
gitvan pack apply my-pack --inputs '{"name":"MyComponent"}'
gitvan scaffold react-pack:component --inputs '{"name":"Button"}'
```

## 🛠️ Commands

### Core Commands
- `gitvan init` - Initialize GitVan in current directory
- `gitvan ensure` - Install Git hooks for unified hooks system
- `gitvan help` - Show all available commands

### Unified Hooks System
- `gitvan hook <name>` - Execute specific Git hook (post-commit, post-merge)
- `gitvan event simulate --files "<path>"` - Test router logic without real commit
- `gitvan ensure` - Install Git hooks for surgical precision

### Job Management
- `gitvan job list` - List available jobs
- `gitvan job run --name <job>` - Run a specific job
- `gitvan run <job>` - Run job (legacy syntax)

### Template & Pack System
- `gitvan pack list` - List installed packs
- `gitvan pack apply <pack>` - Apply a pack
- `gitvan pack plan <pack>` - Show pack execution plan
- `gitvan scaffold <pack:scaffold>` - Run a scaffold

### AI Features
- `gitvan chat generate <prompt>` - Generate job via AI
- `gitvan chat draft <prompt>` - Draft template via AI
- `gitvan llm call <prompt>` - Direct AI interaction

### Daemon & Hooks
- `gitvan daemon start` - Start GitVan daemon
- `gitvan daemon status` - Check daemon status
- `gitvan hook post-commit` - Execute post-commit hook manually
- `gitvan hook post-merge` - Execute post-merge hook manually

### Audit & Compliance
- `gitvan audit build` - Build audit report
- `gitvan audit verify` - Verify operation integrity
- `gitvan audit list` - List all receipts

## 📁 Project Structure

After running `gitvan init`:

```
my-project/
├── .gitvan/           # GitVan state and configuration
│   ├── packs/         # Installed packs
│   ├── state/         # Runtime state
│   └── backups/       # Automatic backups
├── src/hooks/         # Unified hooks system
│   ├── 10-router.post-commit.mjs
│   ├── 10-router.post-merge.mjs
│   └── _shared/       # Shared utilities
├── jobs/              # Job definitions (with hooks)
├── templates/         # Nunjucks templates
├── packs/             # Local pack definitions
└── gitvan.config.js   # Configuration file
```

## ⚙️ Configuration

GitVan uses `gitvan.config.js` for configuration:

```javascript
export default {
  templates: {
    dirs: ["templates"],
    autoescape: false,
    noCache: true,
  },
  
  jobs: {
    dirs: ["jobs"],
  },
  
  packs: {
    dirs: ["packs", ".gitvan/packs"],
  },
  
  daemon: {
    enabled: true,
    worktrees: "current",
  },
  
  shell: {
    allow: ["echo", "git", "npm", "pnpm", "yarn"],
  },
  
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b", // Default from GitVanDefaults
  },
  
  data: {
    project: {
      name: "my-project",
      description: "A GitVan-powered project",
    },
  },
};
```

## 🎯 Strategy Presets

GitVan supports multiple development strategies with preset configurations:

### Trunk-Based (Default)
- Direct commits to main branch
- Feature branches merged via PR
- Continuous deployment on main

### Release Flow
- Release branches for versioning
- Feature branches → Release → Main
- Tagged releases with changelogs

### Forking Workflow
- External contributor support
- Fork-based pull requests
- Security scanning for external PRs

## 📊 Event Model

GitVan supports a comprehensive event system with standardized patterns:

| Event        | Key payload              | Pattern example        |
| ------------ | ------------------------ | ---------------------- |
| `push`       | `ref`, `before`, `after` | `push:refs/heads/main` |
| `tag:create` | `ref`, `tag`             | `tag:create:v*`        |
| `merge`      | `from`, `into`           | `merge:into:main`      |
| `fs:change`  | `paths`                  | `fs:change:src/**`     |
| `cron`       | `cron`                   | `cron:0 */2 * * *`     |

Predicates compose under `all` and `any`. Keep it to those two.

## 🔄 Evolution Story

GitVan's power lies in how the tree stays fixed while behavior changes. Here's how workflows evolve:

### Phase 1 → Phase 2 (add release flow)

```diff
 // gitvan.config.js
 export default {
-  strategy: "tbd",
+  strategy: "release-flow",
   events: {
     "push:refs/heads/main": ["notes:write","changelog"],
     "push:refs/heads/feature/*": ["lint.changed","test.changed"],
+    "branch:create:refs/heads/release/*": ["version.freeze","changelog.seed"],
+    "push:refs/heads/release/*": ["release.plan"],
     "tag:create:v*": ["release.publish"]
   }
 }
```

### Phase 2 → Phase 3 (enable OSS PRs)

```diff
   events: {
     ...
+    "pr:opened:external": ["security.scan","ai.review.summary"]
   }
 }
```

## 🔒 Security & Safety

- **Path Sandboxing**: Prevents directory traversal attacks
- **Atomic Locking**: Git ref-based concurrency control
- **Shell Allowlists**: Configurable command execution
- **Audit Trails**: Complete operation logging in Git notes
- **Idempotent Operations**: Safe to run multiple times

## 📝 Receipts

GitVan maintains complete audit trails through Git notes:

- **Location**: `refs/notes/gitvan/results`
- **Key**: `${commitSHA}:${jobName}:${timestamp}`
- **Body**: JSON `{ ok, startedAt, finishedAt, inputs, outputs, artifacts, seed }`

## 🎨 Front-Matter Support

GitVan uses YAML front-matter for all templates and configuration:

### YAML Front-Matter
```yaml
---
to: "output.txt"
force: "overwrite"
---
Content here
```

## 📚 Examples

### Canonical Job Skeleton
```javascript
// jobs/changelog.mjs
import { defineJob, useGit, useTemplate, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'

export default defineJob({
  meta: { name: "changelog", desc: "Generate changelog from commits" },
  hooks: ["post-commit", "post-merge"], // Unified hooks system
  async run() {
    const git = useGit()
    const tpl = await useTemplate()
    const notes = useNotes()

    const commits = await git.logSinceLastTag()
    const body = tpl.render("changelog.njk", { commits })
    await git.writeFile("CHANGELOG.md", body)
    await notes.write(`changelog for ${await git.headSha()}`)
    return { ok: true, artifacts: ["CHANGELOG.md"] }
  }
})
```

### Template with Front-Matter
```yaml
---
to: "src/{{ name | kebabCase }}.ts"
force: "overwrite"
inject:
  - into: "src/index.ts"
    snippet: "export * from './{{ name | kebabCase }}';"
    find: "// EXPORTS"
---
export interface {{ name | pascalCase }} {
  id: string;
  name: string;
}
```

### Pack Definition
```json
{
  "name": "react-component",
  "version": "1.0.0",
  "description": "Generate React components",
  "scaffolds": {
    "component": {
      "description": "Create a React component",
      "templates": ["templates/component.njk"],
      "inputs": {
        "name": {
          "type": "string",
          "description": "Component name",
          "required": true
        }
      }
    }
  }
}
```

### Worktree Management
```javascript
// Using the useWorktree composable
import { useWorktree } from 'gitvan/composables/worktree';

const worktree = useWorktree();

// Get worktree information
const info = await worktree.info();
console.log(`Current branch: ${info.branch}`);
console.log(`Worktree path: ${info.worktree}`);

// List all worktrees
const worktrees = await worktree.list();
worktrees.forEach(wt => {
  console.log(`${wt.path} (${wt.branch}) ${wt.isMain ? '(main)' : ''}`);
});

// Create a new worktree
await worktree.create('/path/to/new-worktree', 'feature-branch');

// Get worktree status
const status = await worktree.status();
console.log(`Total worktrees: ${status.count}`);
console.log(`Is main worktree: ${status.isMain}`);
```

## 🚀 Performance

GitVan is optimized for autonomic operation with:
- **Fast Init**: < 1 second initialization with background setup
- **Non-Blocking**: All operations run asynchronously
- **Lazy Loading**: Packs and jobs loaded only when needed
- **Timeout Protection**: No hanging operations
- **Resource Efficient**: Minimal memory and CPU usage

## 🎯 Vision: The Autonomic Future

GitVan represents the future of development automation - where everything happens automatically after initialization. No more manual setup, no more configuration complexity, no more external dependencies for basic operations.

**The Dream**: A user can `gitvan init` and have a complete, intelligent development environment that handles everything from commit messages to deployment - all powered by local AI and autonomic systems.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit: `gitvan save` (uses AI commit messages!)
6. Push: `git push origin feature-name`
7. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](docs/)
- 🐛 [Issues](https://github.com/gitvan/gitvan/issues)
- 💬 [Discussions](https://github.com/gitvan/gitvan/discussions)

---

**GitVan v2** - Transform Git into your development automation platform 🚀