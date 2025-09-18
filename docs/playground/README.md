# GitVan Playground - Developer Guide

## 🎯 Overview

The GitVan Playground is a comprehensive demonstration and testing environment for the GitVan Jobs System. It showcases all core features including job discovery, execution, template rendering, git integration, cron scheduling, event-driven jobs, and hooks.

## 📁 Project Structure

```
playground/
├── package.json           # Dependencies and scripts
├── gitvan.config.js       # GitVan configuration
├── dev.mjs               # Main development runner
├── test-playground.mjs   # Comprehensive test suite
├── README.md             # Quick start guide
├── jobs/                 # Job definitions
│   ├── docs/
│   │   └── changelog.mjs  # Changelog generation job
│   ├── test/
│   │   ├── simple.mjs     # Simple status report job
│   │   └── cleanup.cron.mjs # Cron cleanup job
│   └── alerts/
│       └── release.evt.mjs # Event-driven release job
├── templates/            # Nunjucks templates
│   └── changelog.njk     # Changelog template
└── dist/                 # Generated output files
    ├── CHANGELOG.md      # Generated changelog
    ├── status-report.json # Generated status report
    └── notifications/    # Release notifications
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Git repository

### Installation

```bash
cd playground
pnpm install
```

### Basic Usage

```bash
# Start the playground with hot reload
pnpm dev

# List all discovered jobs
pnpm list

# Run a specific job
pnpm run:changelog
pnpm run:simple

# Show daemon status
pnpm status
```

## 🔧 Configuration

### GitVan Configuration (`gitvan.config.js`)

```javascript
export default {
  root: process.cwd(),
  jobs: { dir: "jobs" },
  templates: { engine: "nunjucks", dirs: ["templates"] },
  receipts: { ref: "refs/notes/gitvan/results" },
  hooks: {
    "job:before"({ id, payload }) {
      console.log(`[playground] 🚀 Starting job: ${id}`);
    },
    "job:after"({ id, result }) {
      console.log(`[playground] ✅ Job done: ${id}`, result?.ok ? "OK" : "ERR");
    },
    "job:error"({ id, error }) {
      console.log(`[playground] ❌ Job failed: ${id}`, error.message);
    },
    "lock:acquire"({ id }) {
      console.log(`[playground] 🔒 Lock acquired: ${id}`);
    },
    "lock:release"({ id }) {
      console.log(`[playground] 🔓 Lock released: ${id}`);
    },
    "receipt:write"({ id }) {
      console.log(`[playground] 📝 Receipt written: ${id}`);
    }
  }
};
```

### Key Configuration Options

- **`root`**: Working directory for jobs
- **`jobs.dir`**: Directory to scan for job files
- **`templates.dirs`**: Template directories for Nunjucks
- **`receipts.ref`**: Git ref for storing execution receipts
- **`hooks`**: Custom lifecycle hooks

## 📋 Job Types

### 1. On-Demand Jobs

Jobs that run manually via CLI or API.

**Example**: `jobs/docs/changelog.mjs`

```javascript
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";

export default defineJob({
  meta: { desc: "Render changelog from git log" },
  async run({ ctx }) {
    const git = useGit();
    const template = await useTemplate();
    
    // Get recent commits
    const logOutput = await git.log("%h%x09%s", ["-n", "30"]);
    const lines = logOutput.split("\n").filter(Boolean);
    
    const commits = lines.map((line) => {
      const [hash, subject] = line.split("\t");
      return { hash, subject };
    });

    // Render template to file
    const outputPath = await template.renderToFile(
      "changelog.njk", 
      "dist/CHANGELOG.md", 
      { 
        commits,
        generatedAt: ctx.nowISO,
        totalCommits: commits.length
      }
    );

    return { 
      ok: true, 
      artifacts: [outputPath],
      data: {
        commitsProcessed: commits.length,
        outputPath
      }
    };
  }
});
```

### 2. Cron Jobs

Jobs that run on a schedule using cron expressions.

**Example**: `jobs/test/cleanup.cron.mjs`

```javascript
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";

export default defineJob({
  meta: { 
    desc: "Clean up temporary files and old artifacts",
    tags: ["cleanup", "maintenance"]
  },
  cron: "0 2 * * *", // Run daily at 2 AM
  async run({ ctx }) {
    const git = useGit();
    const artifacts = [];
    
    // Clean up dist directory
    const distDir = join(ctx.root, "dist");
    try {
      const files = await fs.readdir(distDir);
      const oldFiles = files.filter((file) => {
        return (
          file.includes("old") ||
          file.includes("temp") ||
          file.includes("backup")
        );
      });
      
      for (const file of oldFiles) {
        const filePath = join(distDir, file);
        await fs.unlink(filePath);
        artifacts.push(`Removed: ${file}`);
        ctx.logger.log(`Removed old file: ${file}`);
      }
      
      if (oldFiles.length === 0) {
        artifacts.push("No old files found to clean up");
        ctx.logger.log("No old files found to clean up");
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        artifacts.push("Dist directory does not exist");
        ctx.logger.log("Dist directory does not exist");
      } else {
        throw error;
      }
    }

    return {
      ok: true,
      artifacts,
      data: {
        cleanedFiles: artifacts.length,
        timestamp: ctx.nowISO
      }
    };
  }
});
```

### 3. Event-Driven Jobs

Jobs that trigger based on git events using predicates.

**Example**: `jobs/alerts/release.evt.mjs`

```javascript
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";

export default defineJob({
  meta: { 
    desc: "Notify on new tags or releases",
    tags: ["notification", "release"]
  },
  on: {
    any: [{ tagCreate: "v*.*.*" }, { semverTag: true }]
  },
  async run({ ctx, trigger }) {
    const git = useGit();
    
    // Get the latest tag (handle case where no tags exist)
    let latestTag;
    try {
      latestTag = await git.run(["describe", "--tags", "--abbrev=0", "HEAD"]);
    } catch (error) {
      if (error.message.includes("No names found")) {
        ctx.logger.log("No tags found in repository");
        latestTag = "no-tags";
      } else {
        throw error;
      }
    }

    const notification = {
      type: "release",
      tag: latestTag.trim(),
      timestamp: ctx.nowISO,
      trigger: trigger?.data || {},
      repository: {
        head: await git.head(),
        branch: await git.getCurrentBranch()
      }
    };

    // Create notification file
    const outputPath = join(
      ctx.root,
      "dist",
      "notifications",
      `${Date.now()}-release.json`
    );
    await fs.mkdir(join(ctx.root, "dist", "notifications"), {
      recursive: true
    });
    await fs.writeFile(outputPath, JSON.stringify(notification, null, 2));

    ctx.logger.log(`Release notification created for tag: ${latestTag}`);

    return {
      ok: true,
      artifacts: [outputPath],
      data: notification
    };
  }
});
```

## 🎨 Template System

### Nunjucks Templates

The playground uses Nunjucks for template rendering with custom filters.

**Example**: `templates/changelog.njk`

```njk
# Changelog

Generated at: {{ generatedAt }}
Total commits: {{ totalCommits }}

## Recent Changes

{% for commit in commits -%}
- **{{ commit.hash }}** {{ commit.subject }}
{% endfor %}

---
*Generated by GitVan Jobs System*
```

### Available Filters

- `capitalize` - Capitalize first letter
- `pluralize` - Convert to plural form
- `singularize` - Convert to singular form
- `camelize` - Convert to camelCase
- `underscore` - Convert to snake_case
- `dasherize` - Convert to kebab-case
- `humanize` - Convert to human-readable form
- `titleize` - Convert to Title Case
- `json` - Pretty-print JSON

## 🔄 Development Workflow

### Hot Reload Development

```bash
# Start playground with hot reload
pnpm dev
```

This starts the daemon and enables hot reloading of job files. Any changes to job files will be automatically detected.

### Testing Jobs

```bash
# Run comprehensive test suite
node test-playground.mjs

# Test individual jobs
pnpm run:changelog
pnpm run:simple
pnpm run:cleanup
```

### Job Discovery

```bash
# List all discovered jobs
pnpm list
```

Output:
```
Discovered jobs:
==================================================
alerts:release       (event) - Notify on new tags or releases
  └─ Events: {"any":[{"tagCreate":"v*.*.*"},{"semverTag":true}]}
docs:changelog       (on-demand) - Render changelog from git log
test:cleanup         (cron) - Clean up temporary files and old artifacts
  └─ Cron: 0 2 * * *
test:simple          (on-demand) - Generate a simple status report

Total: 4 jobs
```

## 🔧 Advanced Usage

### Custom Hooks

Add custom hooks to `gitvan.config.js`:

```javascript
hooks: {
  "job:before"({ id, payload }) {
    // Custom logic before job execution
  },
  "job:after"({ id, result }) {
    // Custom logic after job execution
  },
  "job:error"({ id, error }) {
    // Custom error handling
  }
}
```

### Event Predicates

Event-driven jobs support various predicates:

```javascript
on: {
  any: [
    { tagCreate: "v*.*.*" },           // New version tags
    { semverTag: true },               // Any semver tag
    { mergeTo: "main" },               // Merge to main branch
    { pushTo: "develop" },             // Push to develop branch
    { pathChanged: ["src/**/*.js"] },  // JavaScript files changed
    { pathAdded: ["docs/**/*.md"] },   // New markdown files
    { pathModified: ["*.json"] },      // JSON files modified
    { message: "release" },            // Commit message contains "release"
    { authorEmail: "*@company.com" },  // Author email pattern
    { signed: true }                   // Signed commits
  ]
}
```

### Cron Expressions

Supported cron format: `minute hour day month weekday`

```javascript
cron: "0 2 * * *"     // Daily at 2 AM
cron: "*/15 * * * *"  // Every 15 minutes
cron: "0 9-17 * * 1-5" // Every hour 9-17, weekdays only
```

### Job Context

Jobs receive a rich context object:

```javascript
async run({ ctx, trigger, payload }) {
  // ctx.root - Working directory
  // ctx.nowISO - Current timestamp
  // ctx.env - Environment variables
  // ctx.git - Git repository info
  // ctx.trigger - Event trigger details
  // ctx.logger - Logger instance
  // payload - Job payload data
}
```

## 🧪 Testing

### E2E Tests

The playground includes comprehensive E2E tests:

```bash
# Run E2E tests from project root
npx vitest run tests/playground-e2e.test.mjs
```

### Test Coverage

- ✅ Job discovery and execution
- ✅ Template rendering
- ✅ Git integration
- ✅ Lock management
- ✅ Hooks system
- ✅ Error handling
- ✅ Performance validation

### Manual Testing

```bash
# Test job execution
node -e "import('./dev.mjs').then(m=>m.run('docs:changelog'))"

# Test daemon functionality
node -e "import('./dev.mjs').then(m=>m.startDaemon())"

# Test event evaluation
node -e "import('./dev.mjs').then(m=>m.stats())"
```

## 📊 Monitoring and Debugging

### Git Receipts

All job executions are stored as git notes:

```bash
# View execution receipts
git notes --ref=refs/notes/gitvan/results show HEAD
```

### Daemon Status

```bash
# Check daemon status
pnpm status
```

### Job Statistics

```bash
# View job statistics
node -e "import('./dev.mjs').then(m=>m.stats())"
```

### Logs and Debugging

The playground provides detailed logging through hooks:

```
[playground] 🚀 Starting job: docs:changelog
[playground] 🔒 Lock acquired: docs:changelog
[playground] ✅ Job done: docs:changelog OK
[playground] 🔓 Lock released: docs:changelog
[playground] 📝 Receipt written: docs:changelog
```

## 🚀 Production Deployment

### Prerequisites

- Git repository with proper permissions
- Node.js 18+ environment
- GitVan package installed

### Configuration

1. Copy `gitvan.config.js` to your project
2. Customize hooks and settings
3. Create job files in `jobs/` directory
4. Add templates in `templates/` directory

### Daemon Deployment

```bash
# Start daemon in production
node -e "import('./dev.mjs').then(m=>m.startDaemon())"
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run GitVan Jobs
  run: |
    cd playground
    pnpm install
    pnpm run:changelog
```

## 🔍 Troubleshooting

### Common Issues

1. **Job not discovered**: Check file naming and exports
2. **Template not found**: Verify template directory configuration
3. **Git operations fail**: Ensure repository is initialized
4. **Lock conflicts**: Check for concurrent executions
5. **Hooks not firing**: Verify hook configuration

### Debug Commands

```bash
# Check job discovery
pnpm list

# Test individual components
node -e "import('./dev.mjs').then(m=>m.run('test:simple'))"

# View git receipts
git notes --ref=refs/notes/gitvan/results show HEAD

# Check daemon status
pnpm status
```

### Performance Optimization

- Use `noCache: true` for development
- Enable caching in production
- Monitor job execution times
- Use appropriate cron intervals

## 📚 API Reference

### Job Definition API

```javascript
defineJob({
  id: "custom:id",           // Optional, inferred from path
  kind: "atomic",            // atomic, batch, daemon
  cron: "0 2 * * *",         // Cron expression
  on: { /* predicates */ },  // Event predicates
  meta: {                    // Job metadata
    desc: "Description",
    tags: ["tag1", "tag2"]
  },
  async run({ ctx, trigger, payload }) {
    // Job implementation
    return { ok: true, artifacts: [] };
  }
})
```

### Composable APIs

```javascript
// Git operations
const git = useGit();
await git.head();
await git.getCurrentBranch();
await git.log("%h%x09%s", ["-n", "30"]);

// Template rendering
const template = await useTemplate();
await template.renderToFile("template.njk", "output.md", data);
```

### Event Predicates

```javascript
{
  any: [/* OR conditions */],
  all: [/* AND conditions */],
  tagCreate: "pattern",
  semverTag: true,
  mergeTo: "branch",
  pushTo: "branch",
  pathChanged: ["glob/**/*"],
  pathAdded: ["glob/**/*"],
  pathModified: ["glob/**/*"],
  message: "pattern",
  authorEmail: "pattern",
  signed: true
}
```

## 🎯 Best Practices

### Job Design

1. **Keep jobs focused**: One job, one responsibility
2. **Handle errors gracefully**: Use try-catch blocks
3. **Return meaningful results**: Include artifacts and data
4. **Use descriptive metadata**: Clear descriptions and tags
5. **Test thoroughly**: Validate job behavior

### Template Design

1. **Use semantic variable names**: Clear, descriptive names
2. **Handle missing data**: Use default values
3. **Keep templates simple**: Avoid complex logic
4. **Use filters appropriately**: Leverage built-in filters

### Configuration

1. **Environment-specific configs**: Different settings per environment
2. **Secure sensitive data**: Use environment variables
3. **Document custom hooks**: Explain hook behavior
4. **Version control configs**: Track configuration changes

### Performance

1. **Optimize git operations**: Use appropriate git commands
2. **Cache expensive operations**: Enable template caching
3. **Monitor execution times**: Track performance metrics
4. **Use appropriate intervals**: Balance frequency vs. performance

## 🔗 Related Documentation

- [GitVan Core Documentation](../README.md)
- [Job System Specification](../../specs/002-composables-system/SPECIFICATION.md)
- [Template Engine Guide](../../specs/003-template-engine/SPECIFICATION.md)
- [E2E Test Results](../playground-e2e-results.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.
