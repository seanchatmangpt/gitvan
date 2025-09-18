# Getting Started with GitVan

Welcome to GitVan! This guide will help you set up GitVan and create your first Git workflow automation.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** ≥ 18.0.0
- **Git** ≥ 2.40.0
- **pnpm** (recommended) or npm

```bash
# Check versions
node --version  # Should be v18.0.0 or higher
git --version   # Should be 2.40.0 or higher

# Install pnpm if needed
npm install -g pnpm
```

## Installation

### Global Installation

```bash
# Install GitVan globally
npm install -g gitvan

# Verify installation
gitvan --version  # Should show 2.0.0
```

### Project Installation

```bash
# Install as dev dependency
npm install --save-dev gitvan

# Or with pnpm
pnpm add -D gitvan
```

## Quick Start

### 1. Initialize GitVan

```bash
# Navigate to your project
cd my-project

# Initialize GitVan
gitvan init

# This creates:
# - gitvan.config.js (configuration)
# - .gitvan/jobs/ (job definitions)
# - .gitvan/events/ (event definitions)
# - .gitvan/cache/ (pack cache)
```

### 2. Create Your First Job

Create a simple job that formats code:

```javascript
// .gitvan/jobs/format.mjs
export default {
  name: 'format',
  description: 'Format code with Prettier',

  async run({ useExec }) {
    const exec = useExec();

    console.log('🎨 Formatting code...');

    // Run Prettier
    await exec.cli('npx', ['prettier', '--write', '.']);

    console.log('✅ Code formatted!');

    return { success: true };
  }
};
```

### 3. Run Your Job

```bash
# Run the format job
gitvan job run format

# See available jobs
gitvan job list
```

```javascript
export default {
  // Template engine settings
  templates: {
    dirs: ["templates"],
    autoescape: false,
    noCache: true,
  },

  // Job discovery
  jobs: {
    dirs: ["jobs"],
  },

  // Event system
  events: {
    dirs: ["events"],
  },

  // Pack management
  packs: {
    dirs: ["packs", ".gitvan/packs"],
  },

  // Background daemon
  daemon: {
    enabled: true,
    worktrees: "current",
  },

  // Security settings
  shell: {
    allow: ["echo", "git", "npm", "pnpm", "yarn"],
  },

  // AI integration
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
  },

  // Custom template data
  data: {
    project: {
      name: "my-project",
      description: "A GitVan-powered project",
    },
  },
};
```

## 🎯 Your First GitVan Job

### Creating a Simple Job

Jobs are the core of GitVan automation. Create `jobs/changelog.mjs`:

```javascript
// jobs/changelog.mjs
import { useGit } from 'gitvan';

export default {
  name: "changelog",
  description: "Generate changelog from recent commits",

  async run(ctx) {
    const git = useGit();

    // Get recent commits
    const commits = await git.log({
      maxCount: 10,
      format: 'oneline'
    });

    console.log("📝 Recent Changes:");
    commits.forEach(commit => {
      console.log(`- ${commit.message} (${commit.hash.slice(0, 7)})`);
    });

    return {
      success: true,
      commitCount: commits.length
    };
  }
};
```

### Running Your Job

```bash
# List available jobs
gitvan job list

# Run the changelog job
gitvan job run --name changelog

# Or use the legacy command
gitvan run changelog
```

### Jobs with Parameters

Create `jobs/release.mjs` with input validation:

```javascript
// jobs/release.mjs
import { useGit, useTemplate } from 'gitvan';

export default {
  name: "release",
  description: "Create a release with changelog",

  // Define expected inputs
  schema: {
    version: { type: 'string', required: true },
    message: { type: 'string', default: 'New release' }
  },

  async run(ctx) {
    const { version, message } = ctx.inputs;
    const git = useGit();
    const template = useTemplate();

    // Create git tag
    await git.tag.create(version, { message });

    // Generate release notes using template
    const releaseNotes = await template.render('release.md', {
      version,
      message,
      date: new Date().toISOString().split('T')[0],
      commits: await git.log({ since: `${version}^` })
    });

    console.log("🎉 Release created:", version);
    console.log("📋 Release Notes:\n", releaseNotes);

    return { version, releaseNotes };
  }
};
```

## ⚡ Understanding Events and Predicates

Events allow GitVan to respond to repository changes automatically.

### File Change Events

Create `events/file-changes/src.mjs`:

```javascript
// events/file-changes/src.mjs
export default {
  name: "src-file-changed",
  description: "Runs when source files change",

  // Event predicate - when should this trigger?
  predicate: {
    files: ["src/**/*.js", "src/**/*.ts"],
    events: ["create", "modify"]
  },

  async handler(ctx) {
    const { files, event } = ctx;

    console.log(`🔔 Source files ${event}:`, files);

    // Trigger related jobs
    await ctx.runJob('lint');
    await ctx.runJob('test');

    return { processed: files.length };
  }
};
```

### Branch Events

Create `events/branches/feature.mjs`:

```javascript
// events/branches/feature.mjs
export default {
  name: "feature-branch",
  description: "Runs when feature branches are created",

  predicate: {
    branches: ["feature/*"],
    events: ["create"]
  },

  async handler(ctx) {
    const { branch } = ctx;

    console.log(`🌿 New feature branch: ${branch}`);

    // Set up branch-specific automation
    await ctx.runJob('setup-ci', { branch });
    await ctx.runJob('create-pr-draft', { branch });

    return { branch, setup: true };
  }
};
```

### Testing Events

```bash
# List all events
gitvan event list

# Simulate file change event
gitvan event simulate --files "src/**/*.js"

# Test specific event
gitvan event test src-file-changed
```

## 🛠 Using Composables

GitVan provides powerful composables for common Git operations:

### Git Operations (useGit)

```javascript
import { useGit } from 'gitvan';

export default {
  name: "git-demo",
  async run() {
    const git = useGit();

    // Repository info
    const currentBranch = await git.branch.current();
    const isClean = await git.status.isClean();
    const remoteUrl = await git.remote.getUrl('origin');

    // Commit operations
    const commits = await git.log({ maxCount: 5 });
    const lastCommit = await git.commit.latest();

    // Branch operations
    const branches = await git.branch.list();
    await git.branch.create('feature/demo');

    // Working with files
    const modifiedFiles = await git.status.modified();
    const diff = await git.diff.files();

    // Tags and notes
    const tags = await git.tag.list();
    await git.notes.add('commit-hash', 'This is a note');

    console.log({
      currentBranch,
      isClean,
      commitCount: commits.length,
      branchCount: branches.length
    });
  }
};
```

### Template System (useTemplate)

```javascript
import { useTemplate } from 'gitvan';

export default {
  name: "template-demo",
  async run() {
    const template = useTemplate();

    // Render string template
    const greeting = await template.renderString(
      'Hello {{ name }}!',
      { name: 'GitVan' }
    );

    // Render file template
    const readme = await template.render('README.md', {
      projectName: 'My Project',
      version: '1.0.0',
      author: 'Me'
    });

    // Write rendered template
    await template.writeFile('dist/README.md', 'README.md', {
      projectName: 'My Project'
    });

    console.log('Template rendered:', greeting);
  }
};
```

### Pack System (usePack)

```javascript
import { usePack } from 'gitvan';

export default {
  name: "pack-demo",
  async run() {
    const pack = usePack();

    // List available packs
    const packs = await pack.list();

    // Apply a pack
    const result = await pack.apply('builtin/nodejs-basic', {
      projectName: 'my-app',
      description: 'My awesome app'
    });

    // Check pack status
    const status = await pack.status('builtin/nodejs-basic');

    console.log('Pack applied:', result.success);
    console.log('Files created:', result.files.length);
  }
};
```

### Job Orchestration (useJob)

```javascript
import { useJob } from 'gitvan';

export default {
  name: "orchestration-demo",
  async run() {
    const job = useJob();

    // Run jobs in sequence
    await job.run('lint');
    await job.run('test');
    await job.run('build');

    // Run jobs in parallel
    await Promise.all([
      job.run('lint'),
      job.run('type-check'),
      job.run('security-scan')
    ]);

    // Conditional job execution
    const testResult = await job.run('test');
    if (testResult.success) {
      await job.run('deploy');
    }

    console.log('Orchestration complete');
  }
};
```

## 💻 CLI Command Overview

GitVan provides a rich CLI interface:

### Core Commands

```bash
# Project initialization
gitvan init                          # Initialize GitVan
gitvan ensure                        # Verify setup

# Job management
gitvan job list                      # List all jobs
gitvan job run --name <job>          # Run specific job
gitvan run <job>                     # Legacy job runner

# Event system
gitvan event list                    # List events
gitvan event simulate --files "src/**" # Test events
gitvan event test <event-name>       # Test specific event

# Daemon management
gitvan daemon start                  # Start background daemon
gitvan daemon stop                   # Stop daemon
gitvan daemon status                 # Check daemon status

# Pack system
gitvan pack list                     # List available packs
gitvan pack apply <pack> --inputs '{}' # Apply a pack
gitvan pack plan <pack>              # Preview pack changes
gitvan pack status <pack>            # Check pack status
gitvan pack remove <pack>            # Remove applied pack

# Scaffolding
gitvan scaffold <pack:scaffold>      # Run pack scaffold
gitvan compose <pack1> <pack2>       # Combine multiple packs

# AI integration
gitvan chat generate "Create a test job"  # AI job generation
gitvan chat explain <job>            # Explain existing job
gitvan llm call "Summarize commits"  # Direct AI interaction

# Scheduling
gitvan cron list                     # List scheduled jobs
gitvan cron start                    # Start cron daemon
gitvan schedule apply                # Apply scheduled tasks

# Marketplace
gitvan marketplace browse            # Browse available packs
gitvan marketplace search <term>     # Search for packs
gitvan marketplace quickstart <type> # Quick project setup

# Auditing
gitvan audit build                   # Create audit trail
gitvan audit verify                  # Verify pack integrity
gitvan audit list                    # List audit records
```

### Working with Worktrees

```bash
# List all worktrees
gitvan worktree list

# Start daemon for all worktrees
gitvan daemon start --worktrees all

# Worktree-specific operations
cd /path/to/worktree
gitvan daemon start  # Starts for current worktree only
```

## 🔄 Background Daemon

The GitVan daemon monitors your repository and triggers events automatically:

```bash
# Start daemon for current directory
gitvan daemon start

# Check daemon status
gitvan daemon status

# Stop daemon
gitvan daemon stop
```

The daemon watches for:
- File changes
- Branch operations
- Commit events
- Tag creation
- Remote updates

## 🏗 Real-World Examples

### Continuous Integration Job

```javascript
// jobs/ci.mjs
import { useGit, useJob } from 'gitvan';

export default {
  name: "ci",
  description: "Complete CI pipeline",

  async run() {
    const git = useGit();
    const job = useJob();

    console.log("🚀 Starting CI pipeline...");

    // Ensure clean working directory
    const isClean = await git.status.isClean();
    if (!isClean) {
      throw new Error("Working directory not clean");
    }

    // Run pipeline steps
    const steps = [
      { name: 'lint', description: '🔍 Linting code' },
      { name: 'test', description: '🧪 Running tests' },
      { name: 'build', description: '🔨 Building project' },
      { name: 'security-scan', description: '🛡️ Security scan' }
    ];

    for (const step of steps) {
      console.log(step.description);
      const result = await job.run(step.name);
      if (!result.success) {
        throw new Error(`CI failed at step: ${step.name}`);
      }
    }

    console.log("✅ CI pipeline completed successfully");

    // Tag successful build
    const commit = await git.commit.latest();
    await git.tag.create(`ci-${Date.now()}`, {
      message: `CI passed for ${commit.hash}`
    });

    return { success: true, steps: steps.length };
  }
};
```

### Automated Release Job

```javascript
// jobs/release-auto.mjs
import { useGit, useTemplate } from 'gitvan';

export default {
  name: "release-auto",
  description: "Automated release with changelog",

  schema: {
    type: { type: 'string', enum: ['patch', 'minor', 'major'], default: 'patch' }
  },

  async run(ctx) {
    const { type } = ctx.inputs;
    const git = useGit();
    const template = useTemplate();

    // Get current version from package.json
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
    const currentVersion = pkg.version;

    // Calculate next version
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    let nextVersion;

    switch (type) {
      case 'major': nextVersion = `${major + 1}.0.0`; break;
      case 'minor': nextVersion = `${major}.${minor + 1}.0`; break;
      case 'patch': nextVersion = `${major}.${minor}.${patch + 1}`; break;
    }

    // Get commits since last tag
    const lastTag = await git.tag.latest();
    const commits = await git.log({ since: lastTag });

    // Generate changelog
    const changelog = await template.render('CHANGELOG.md', {
      version: nextVersion,
      date: new Date().toISOString().split('T')[0],
      commits: commits.map(c => ({
        message: c.message,
        author: c.author,
        hash: c.hash.slice(0, 7)
      }))
    });

    // Update package.json
    pkg.version = nextVersion;
    await fs.writeFile('package.json', JSON.stringify(pkg, null, 2));

    // Commit version bump
    await git.add(['package.json', 'CHANGELOG.md']);
    await git.commit(`chore: bump version to ${nextVersion}`);

    // Create git tag
    await git.tag.create(`v${nextVersion}`, {
      message: `Release ${nextVersion}\n\n${changelog}`
    });

    console.log(`🎉 Released version ${nextVersion}`);

    return {
      version: nextVersion,
      commits: commits.length,
      changelog
    };
  }
};
```

## 🚀 Next Steps

Now that you understand the basics:

1. **Explore Packs**: Check out `gitvan marketplace browse` for ready-to-use packs
2. **Set up Events**: Create event handlers for your specific workflow
3. **AI Integration**: Use `gitvan chat` to generate jobs with AI
4. **Background Automation**: Start the daemon with `gitvan daemon start`
5. **Custom Templates**: Create reusable templates in the `templates/` directory
6. **Advanced Git**: Explore the full `useGit()` API for complex Git operations

### Resources

- **Examples**: Check the `demo/` directory for complete examples
- **API Reference**: Explore the `src/composables/` for full API documentation
- **Pack Development**: Create your own packs in the `packs/` directory
- **Community**: Join the GitVan community for support and examples

### Common Patterns

- Use events for reactive workflows (file changes → run tests)
- Use jobs for imperative tasks (releases, deployments)
- Use packs for reusable project templates
- Use the daemon for continuous monitoring
- Use AI chat for rapid job prototyping

GitVan transforms your Git repository into a powerful automation platform. Start with simple jobs and events, then gradually build more sophisticated workflows as you become comfortable with the system.

Happy automating! 🚀