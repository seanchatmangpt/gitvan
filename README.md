---
title: "GitVan v2"
description: "Git-native development automation platform with AI-powered workflows"
version: "2.0.0"
author: "GitVan Team"
license: "MIT"
tags: ["git", "automation", "templating", "ai", "workflows"]
---

# GitVan v2

**Git-native development automation platform with unified hooks system**

GitVan transforms Git into a runtime environment for development automation, providing intelligent job scheduling, template generation, and AI-powered workflow creation through a unified hooks system.

## 🚀 Quick Start

### Installation

```bash
npm install -g gitvan
# or
npm install gitvan
```

### Deterministic First Run

```bash
git init my-repo && cd my-repo
gitvan init
echo 'console.log(1)' > index.js
git add . && git commit -m "init"

# Add a real job with unified hooks system
echo "import { defineJob, useGit, useNotes } from 'file:///Users/sac/gitvan/src/index.mjs'

export default defineJob({
  meta: { name: 'touch', desc: 'Touch file on commit/merge' },
  hooks: ['post-commit', 'post-merge'], // Unified hooks system
  async run(context) {
    const git = useGit()
    const notes = useNotes()
    await git.writeFile('TOUCHED', 'ok')
    await notes.write(\`touch for \${await git.headSha()}\`)
    return { ok: true, artifacts: ['TOUCHED'] }
  }
})" > jobs/touch.mjs

git commit -m "feat: add touch job"
gitvan hook post-commit
test -f TOUCHED && echo ok
```

### Initialize a Project

```bash
gitvan init
```

This creates a complete GitVan project structure with:
- 📁 Directory structure (`.gitvan/`, `jobs/`, `templates/`, `packs/`)
- ⚙️ Configuration file (`gitvan.config.js`)
- 📝 Sample files (job, template, pack)
- 🔧 Git repository setup

### Run Your First Job

```bash
gitvan run hello
```

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

GitVan is optimized for sub-second execution of single-file jobs on local repositories. For complex workflows, performance scales linearly with job complexity.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit: `git commit -m "Add feature"`
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