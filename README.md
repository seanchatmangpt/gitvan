---
title: "GitVan v2"
description: "Git-native development automation platform with AI-powered workflows"
version: "2.0.0"
author: "GitVan Team"
license: "MIT"
tags: ["git", "automation", "templating", "ai", "workflows"]
---

# GitVan v2

**Git-native development automation platform with AI-powered workflows**

GitVan transforms Git into a runtime environment for development automation, providing intelligent job scheduling, template generation, and AI-powered workflow creation.

## 🚀 Quick Start

### Installation

```bash
npm install -g gitvan
# or
npm install gitvan
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

### Job & Event Composables
- **`useJob`** - Job lifecycle and execution management
- **`useEvent`** - Event system and triggering
- **`useSchedule`** - Cron and scheduling management

### Infrastructure Composables
- **`useReceipt`** - Receipt and audit management
- **`useLock`** - Distributed locking
- **`useRegistry`** - Job and event registry management

### Example Usage

```javascript
import { withGitVan, useJob, useEvent, useSchedule } from './src/composables/index.mjs';

await withGitVan({ cwd: process.cwd(), env: process.env }, async () => {
  const job = useJob();
  const event = useEvent();
  const schedule = useSchedule();
  
  // Schedule a job
  await schedule.add('daily-backup', '0 3 * * *', 'backup-job');
  
  // Register events
  await event.register('backup-complete', {
    name: 'Backup Complete',
    type: 'custom',
    job: 'notify-job'
  });
  
  // Execute job with event triggering
  const result = await job.run('backup-job');
  if (result.success) {
    await event.trigger('backup-complete', { result });
  }
});
```

**📚 Documentation**: [Composables API](docs/api/composables.md) | [Quick Reference](docs/api/composables-quick-reference.md) | [Examples](docs/examples/composables-examples.md)

## ✨ Features

### 🎯 **Core Capabilities**
- **Git-Native**: Uses Git refs for locking, notes for audit trails
- **Template Engine**: Nunjucks-powered with front-matter support
- **Job System**: Automated task execution with scheduling
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
- `gitvan ensure` - Verify and fix GitVan configuration
- `gitvan help` - Show all available commands

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

### Daemon & Events
- `gitvan daemon start` - Start GitVan daemon
- `gitvan daemon status` - Check daemon status
- `gitvan event simulate --files "src/**"` - Simulate file events

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
├── jobs/              # Job definitions
├── templates/         # Nunjucks templates
├── packs/             # Local pack definitions
├── events/            # Event handlers
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

## 🔒 Security & Safety

- **Path Sandboxing**: Prevents directory traversal attacks
- **Atomic Locking**: Git ref-based concurrency control
- **Shell Allowlists**: Configurable command execution
- **Audit Trails**: Complete operation logging in Git notes
- **Idempotent Operations**: Safe to run multiple times

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

### Simple Job
```javascript
// jobs/greeting.mjs
export default {
  name: "greeting",
  description: "Say hello",
  
  async run() {
    console.log("Hello from GitVan! 🚀");
  }
};
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