# Getting Started with GitVan v2

Welcome to GitVan v2! This guide will get you from zero to your first automation in under 10 minutes.

## Prerequisites

Before installing GitVan, ensure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - Any recent version
- **pnpm 8+** (recommended) or npm
- **Ollama** (optional, for AI features) - [Install guide](https://ollama.ai)

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be 18.0.0 or higher

# Check Git
git --version

# Check pnpm (recommended)
pnpm --version

# Optional: Check Ollama (for AI features)
ollama --version
```

## Installation

### Install GitVan

Choose your preferred package manager:

```bash
# Using pnpm (recommended)
pnpm add -g gitvan

# Using npm
npm install -g gitvan

# Using npx (no installation)
npx gitvan help
```

### Verify Installation

```bash
gitvan help
```

You should see the GitVan help menu with available commands.

## Your First Automation

Let's create a simple automation that generates a changelog when you create version tags.

### 1. Initialize Your Repository

```bash
# Navigate to your Git repository
cd your-project

# Create the jobs directory
mkdir -p jobs

# Start the GitVan daemon
gitvan daemon start
```

### 2. Create Your First Job

Create a file called `jobs/changelog.mjs`:

```javascript
// jobs/changelog.mjs
import { defineJob } from "gitvan/define"

export default defineJob({
  meta: {
    desc: "Generate changelog from recent commits",
    tags: ["release", "docs"]
  },
  on: { tagCreate: "v*" }, // Trigger when version tags are created
  async run({ ctx }) {
    const { useGit, useTemplate } = await import("gitvan/composables")

    const git = useGit()
    const tpl = useTemplate()

    // Get commits since last tag
    const commits = await git.getCommitsSinceLastTag()
    const lastTag = await git.getLastTag()
    const currentTag = await git.getCurrentTag()

    // Generate changelog content
    const changelog = await tpl.renderString(`
# Changelog

## ${currentTag} ({{ now | date('YYYY-MM-DD') }})

{% for commit in commits %}
- {{ commit.message }} ({{ commit.hash | slice(0, 8) }})
{% endfor %}

Previous version: ${lastTag}
Total commits: {{ commits.length }}
    `, { commits, now: new Date() })

    // Write changelog file
    await git.writeFile("CHANGELOG.md", changelog)

    return {
      ok: true,
      artifacts: ["CHANGELOG.md"],
      summary: `Generated changelog with ${commits.length} commits`
    }
  }
})
```

### 3. Test Your Job

```bash
# Run the job manually
gitvan job run changelog

# Check if it worked
cat CHANGELOG.md
```

### 4. Create a Version Tag

```bash
# Create a commit
git add .
git commit -m "feat: add changelog automation"

# Create a version tag to trigger the job
git tag v1.0.0

# The job should run automatically!
# Check the changelog
cat CHANGELOG.md
```

### 5. Verify the Receipt

GitVan creates receipts for every operation:

```bash
# View recent receipts
gitvan audit build

# See job execution history
git notes --ref=refs/notes/gitvan/results list
```

## Understanding the Basics

### Jobs vs Events

**Jobs** are your automation scripts. They can run:
- **On-demand**: `gitvan job run <name>`
- **On schedule**: Using cron syntax in filename (`daily.cron.mjs`)
- **On events**: When Git changes occur (commits, tags, merges)

**Events** are triggers that activate jobs:
```javascript
// Trigger on file changes
on: { pathChanged: ["src/**/*.js"] }

// Trigger on merges to main
on: { mergeTo: "main" }

// Trigger on commit messages
on: { message: "feat:" }
```

### Composables

GitVan provides powerful composables for common operations:

```javascript
const git = useGit()
const tpl = useTemplate()
const exec = useExec()

// Git operations
await git.getCurrentBranch()
await git.getLastCommit()
await git.createTag("v1.0.0")

// Template rendering
await tpl.render("template.njk", { data })
await tpl.renderString("Hello {{ name }}", { name: "World" })

// Safe command execution
await exec.run("npm", ["test"])
```

### File Organization

GitVan automatically discovers files in these locations:

```
your-repo/
├── jobs/                  # Regular jobs
│   ├── changelog.mjs      # On-demand job
│   ├── daily.cron.mjs     # Runs daily via cron
│   └── backup.evt.mjs     # Event-triggered job
├── events/                # Event-only jobs
│   └── on-merge.mjs
├── templates/             # Nunjucks templates
│   ├── changelog.njk
│   └── release-notes.njk
└── gitvan.config.js       # Configuration (optional)
```

## AI-Powered Job Generation

If you have Ollama installed, you can generate jobs using AI:

### Setup Ollama (Optional)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2

# Verify it works
gitvan llm models
```

### Generate Jobs with AI

```bash
# Generate a job description
gitvan chat generate "Create a job that updates package.json version on release"

# Generate more complex automations
gitvan chat generate "Create a job that runs tests and creates a release if they pass"

# Get AI assistance for existing jobs
gitvan llm call "How can I improve this job?" --context jobs/changelog.mjs
```

## Configuration

Create a `gitvan.config.js` file for customization:

```javascript
// gitvan.config.js
export default {
  // Job discovery
  jobs: {
    dir: "automation" // Use 'automation/' instead of 'jobs/'
  },

  // Template configuration
  templates: {
    dirs: ["templates", "docs/templates"],
    autoescape: false
  },

  // AI configuration (if using)
  ai: {
    provider: "ollama",
    model: "llama3.2",
    redact: {
      enabled: true,
      patterns: ["password", "token", "secret"]
    }
  },

  // Receipt storage
  receipts: {
    ref: "refs/notes/gitvan/results"
  }
}
```

## Next Steps

Now that you have GitVan running, explore these guides:

### Essential Guides
- [Job Development](./guides/job-development.md) - Learn to write powerful jobs
- [Event-Driven Automation](./guides/events.md) - Respond to Git changes
- [Templates & Rendering](./guides/templates.md) - Master Nunjucks templating
- [AI Integration](./guides/ai-integration.md) - Use AI for automation

### Common Patterns
- [Release Automation](./examples/recipes.md#release-automation)
- [Documentation Generation](./examples/recipes.md#documentation-generation)
- [Code Quality Checks](./examples/recipes.md#code-quality)
- [Notification Systems](./examples/recipes.md#notifications)

### Advanced Topics
- [Daemon Management](./guides/daemon.md) - Background automation
- [Worktree Safety](./advanced/worktrees.md) - Multi-worktree environments
- [Security & Compliance](./advanced/security.md) - Audit trails and receipts
- [Performance Tuning](./advanced/performance.md) - Optimize your automations

## Troubleshooting

### Common Issues

**Job not running automatically?**
```bash
# Check daemon status
gitvan daemon status

# Restart daemon
gitvan daemon stop
gitvan daemon start

# Check event matching
gitvan event simulate --files "path/to/changed/file"
```

**AI not working?**
```bash
# Check Ollama status
ollama list

# Test AI integration
gitvan llm models

# Try a simple call
gitvan llm call "Hello"
```

**Performance issues?**
```bash
# Check recent receipts for timing
gitvan audit build

# Enable debug logging
GITVAN_LOG_LEVEL=debug gitvan job run <name>
```

### Getting Help

- 📖 [Full Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/sac/gitvan/issues)
- 💬 [Community Discussions](https://github.com/sac/gitvan/discussions)
- 📧 [Support Email](mailto:support@gitvan.dev)

## What's Next?

Congratulations! You now have GitVan v2 running and your first automation working. Here are some ideas for your next automations:

1. **Release Notes Generation** - Automatically create release notes from commits
2. **Test Status Updates** - Update README badges when tests pass
3. **Dependency Audits** - Weekly security check notifications
4. **Backup Automation** - Export important data on schedule
5. **Code Style Enforcement** - Auto-format and commit style fixes

Ready to build more? Dive into our [comprehensive guides](./guides/) or explore our [recipe collection](./examples/recipes.md).

Happy automating! 🚀