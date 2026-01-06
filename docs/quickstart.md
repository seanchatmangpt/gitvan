# GitVan Quick Start Guide

> **Get up and running with GitVan in 5-10 minutes**

## What is GitVan?

GitVan is a Git-native development automation platform that brings Git into your workflow system. It enables:

- **Git-Native Workflows** - Define workflows in Git, trigger on Git events
- **Semantic Graphs** - Query workflows with SPARQL, federated knowledge hooks
- **Zero Dependencies** - Everything stored in Git, no external databases
- **AI-Powered** - Generate jobs with AI, learn from executions

## Prerequisites

- **Node.js** 18+ installed
- **Git** 2.30+ installed
- A Git repository (or create one)

## Installation

### 1. Install GitVan

```bash
npm install -D gitvan
# or
yarn add -D gitvan
# or
pnpm add -D gitvan
```

### 2. Initialize Configuration

Create `gitvan.config.mjs` in your project root:

```javascript
export default {
  jobs: { dir: "jobs" },
  templates: { dirs: ["templates"] }
};
```

### 3. Add Scripts to package.json

```json
{
  "scripts": {
    "gitvan": "gitvan",
    "job": "gitvan job run --name"
  }
}
```

## Your First Job

### 1. Create Jobs Directory

```bash
mkdir -p jobs
```

### 2. Create a Simple Job

Create `jobs/hello.mjs`:

```javascript
/**
 * @name Hello World
 * @desc Your first GitVan job
 */
export default {
  meta: {
    name: "Hello World",
    desc: "Your first GitVan job",
    tags: ["tutorial", "hello"]
  },

  async run(payload) {
    console.log("Hello from GitVan!");
    console.log("Payload:", payload);

    return {
      success: true,
      message: "Job completed successfully",
      timestamp: new Date().toISOString()
    };
  }
};
```

### 3. Run the Job

```bash
npm run gitvan job run --name hello
```

**Output:**
```
Running job: hello
Hello from GitVan!
Payload: {}

✓ Job completed successfully
Duration: 0.1s
```

Congratulations! You've run your first GitVan job. 🎉

---

## Your First Automation

Let's create a practical automation that generates a changelog.

### 1. Create Changelog Job

Create `jobs/changelog.mjs`:

```javascript
import { useGit } from "gitvan";

/**
 * @name Generate Changelog
 * @desc Generates changelog from git commits since last tag
 */
export default {
  meta: {
    name: "Generate Changelog",
    desc: "Generates changelog from git commits",
    tags: ["automation", "docs"]
  },

  async run(payload) {
    const { withGitVan, useGit, useFileSystem } = await import("gitvan");

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const git = useGit();
      const fs = useFileSystem();

      // Get commits since last tag
      const log = await git.logSinceLastTag("%h - %s (%an)");
      const commits = log.split("\n").filter(Boolean);

      // Generate changelog content
      const date = new Date().toISOString().split("T")[0];
      const changelog = [
        `## [Unreleased] - ${date}`,
        "",
        "### Changes",
        ...commits.map(commit => `- ${commit}`),
        ""
      ].join("\n");

      // Write to file
      await fs.write("CHANGELOG.md", changelog);

      return {
        success: true,
        commits: commits.length,
        file: "CHANGELOG.md"
      };
    });
  }
};
```

### 2. Run Changelog Generation

```bash
npm run gitvan job run --name changelog
```

**Output:**
```
Running job: changelog

✓ Job completed successfully
Duration: 0.3s

Result:
  commits: 15
  file: CHANGELOG.md

Artifacts:
  - CHANGELOG.md
```

### 3. Check the Generated File

```bash
cat CHANGELOG.md
```

---

## Event-Driven Automation

Let's make the changelog job run automatically when you push to the `main` branch.

### 1. Create Event Job

Create `jobs/events/merge-to/main.mjs`:

```bash
mkdir -p jobs/events/merge-to
```

```javascript
import changelogJob from "../../changelog.mjs";

/**
 * @name Main Branch Changelog
 * @desc Runs when commits are merged to main
 */
export default {
  meta: {
    name: "Main Branch Changelog",
    desc: "Auto-generates changelog on main branch merge",
    tags: ["event", "changelog"]
  },

  // This job runs when merging to 'main'
  // The directory structure defines the event: events/merge-to/main

  async run(payload) {
    console.log("Merge to main detected, generating changelog...");
    return await changelogJob.run(payload);
  }
};
```

### 2. Test Event Simulation

```bash
gitvan event simulate --branch main
```

**Output:**
```
Simulating event...

Event Details:
  Type: merge-to
  Branch: main

Matching Jobs:
  ✓ Main Branch Changelog
    Reason: Merge to 'main' branch

Would execute 1 job(s)
```

### 3. Activate Event Monitoring

```bash
gitvan daemon start
```

Now, whenever you merge to `main`, the changelog will be generated automatically!

---

## Scheduled Automation

Let's create a daily backup job.

### 1. Create Backup Job

Create `jobs/cron/daily-backup.mjs`:

```bash
mkdir -p jobs/cron
```

```javascript
import { useGit } from "gitvan";

/**
 * @name Daily Backup
 * @desc Creates daily backup of repository
 * @cron 0 2 * * *
 */
export default {
  meta: {
    name: "Daily Backup",
    desc: "Creates daily backup",
    tags: ["cron", "backup"]
  },

  // Runs daily at 2 AM
  cron: "0 2 * * *",

  async run(payload) {
    const { withGitVan, useGit, useFileSystem } = await import("gitvan");

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const git = useGit();
      const fs = useFileSystem();

      // Get repository info
      const branch = await git.branch();
      const head = await git.head();
      const date = new Date().toISOString().split("T")[0];

      // Create backup info
      const backup = {
        date,
        branch,
        commit: head,
        timestamp: new Date().toISOString()
      };

      // Write backup metadata
      await fs.writeJSON(`backups/backup-${date}.json`, backup);

      return {
        success: true,
        backup: backup
      };
    });
  }
};
```

### 2. List Cron Jobs

```bash
gitvan cron list
```

**Output:**
```
Found 1 cron job(s):

📅 daily-backup
   Cron: 0 2 * * *
   File: jobs/cron/daily-backup.mjs
   Desc: Creates daily backup
   Next: 2026-01-07 02:00:00 UTC
```

### 3. Test Cron Job

```bash
# Run immediately (don't wait for schedule)
npm run gitvan job run --name daily-backup

# Or test what would run at 2 AM
gitvan cron dry-run --at "2026-01-07T02:00:00Z"
```

---

## Using Templates

Let's create a job generator using templates.

### 1. Create Template

Create `templates/job-template.njk`:

```bash
mkdir -p templates
```

```nunjucks
/**
 * @name {{ jobName | title }}
 * @desc {{ description }}
 */
export default {
  meta: {
    name: "{{ jobName | title }}",
    desc: "{{ description }}",
    tags: {{ tags | dump }}
  },

  async run(payload) {
    console.log("Running {{ jobName }}...");

    // TODO: Implement job logic

    return {
      success: true,
      message: "{{ jobName }} completed"
    };
  }
};
```

### 2. Create Template Job

Create `jobs/generate-job.mjs`:

```javascript
import { withGitVan, useTemplate, useFileSystem } from "gitvan";

/**
 * @name Generate Job
 * @desc Generates a new job from template
 */
export default {
  meta: {
    name: "Generate Job",
    desc: "Generates a new job from template",
    tags: ["generator", "template"]
  },

  async run(payload) {
    return await withGitVan({ cwd: process.cwd() }, async () => {
      const template = await useTemplate({ paths: ["templates"] });
      const fs = useFileSystem();

      // Render template
      const jobCode = await template.render("job-template.njk", {
        jobName: payload.name || "my-job",
        description: payload.description || "A new job",
        tags: payload.tags || ["generated"]
      });

      // Write job file
      const fileName = `jobs/${payload.name || "my-job"}.mjs`;
      await fs.write(fileName, jobCode);

      return {
        success: true,
        file: fileName
      };
    });
  }
};
```

### 3. Generate a Job

```bash
npm run gitvan job run --name generate-job \
  --payload '{"name":"my-custom-job","description":"Does something cool","tags":["custom"]}'
```

### 4. Check Generated Job

```bash
cat jobs/my-custom-job.mjs
```

---

## Working with Receipts

GitVan automatically creates audit receipts for all job executions.

### 1. List Recent Receipts

```bash
gitvan audit list --limit 10
```

**Output:**
```
┌──────────────┬──────────┬────────────┬─────────────────┐
│ Job ID       │ Status   │ Duration   │ Timestamp       │
├──────────────┼──────────┼────────────┼─────────────────┤
│ changelog    │ success  │ 0.3s       │ 2026-01-06 14:30│
│ hello        │ success  │ 0.1s       │ 2026-01-06 14:25│
│ generate-job │ success  │ 0.2s       │ 2026-01-06 14:20│
└──────────────┴──────────┴────────────┴─────────────────┘
```

### 2. Show Receipt Details

```bash
gitvan audit show --id <receipt-id>
```

### 3. Build Audit Report

```bash
gitvan audit build --out audit-report.json
```

---

## Next Steps

### Learn More

- **[Complete API Reference](./api/complete-reference.md)** - All composables and methods
- **[CLI Reference](./cli/complete-reference.md)** - All commands and options
- **[Configuration Guide](./configuration.md)** - Configure GitVan for your project
- **[Advanced Patterns](./advanced/patterns.md)** - Advanced workflows and techniques

### Advanced Features

**Workflows (DAG Execution):**
```bash
gitvan workflow execute ci-pipeline
```

**Knowledge Hooks (RDF/SPARQL):**
```bash
gitvan hooks list
```

**AI Job Generation:**
```bash
gitvan chat generate --prompt "Create a deployment job for AWS"
```

**Interactive Studio:**
```bash
gitvan studio
```

---

## Common Patterns

### Job with Error Handling

```javascript
export default {
  async run(payload) {
    const { withGitVan, useJob, useReceipt } = await import("gitvan");

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const job = useJob();
      const receipt = useReceipt();

      try {
        // Job logic
        const result = await performWork();

        // Success receipt
        await receipt.create({
          jobId: "my-job",
          status: "success",
          artifacts: result.artifacts
        });

        return result;

      } catch (error) {
        // Error receipt
        await receipt.create({
          jobId: "my-job",
          status: "error",
          error: {
            message: error.message,
            stack: error.stack
          }
        });

        throw error;
      }
    });
  }
};
```

### Job with Distributed Lock

```javascript
export default {
  async run(payload) {
    const { withGitVan, useLock } = await import("gitvan");

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const lock = useLock();

      const lockResult = await lock.acquire("deploy-lock", {
        timeout: 30000
      });

      if (lockResult.acquired) {
        try {
          // Critical section
          return await deploy();
        } finally {
          await lock.release("deploy-lock");
        }
      } else {
        throw new Error("Could not acquire lock");
      }
    });
  }
};
```

### Job with Parallel Execution

```javascript
export default {
  async run(payload) {
    const { withGitVan, useJob } = await import("gitvan");

    return await withGitVan({ cwd: process.cwd() }, async () => {
      const job = useJob();

      // Run jobs in parallel
      const results = await Promise.all([
        job.run("test-unit"),
        job.run("test-integration"),
        job.run("test-e2e")
      ]);

      return {
        success: results.every(r => r.success),
        results
      };
    });
  }
};
```

---

## Troubleshooting

### Job Not Found

```bash
# List all jobs
gitvan job list

# Check jobs directory
ls -la jobs/
```

### Context Not Available Error

Make sure you're using `withGitVan()`:

```javascript
// ✗ WRONG
const git = useGit();

// ✓ CORRECT
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
});
```

### Template Not Found

Check template paths in `gitvan.config.mjs`:

```javascript
export default {
  templates: {
    dirs: ["templates", "packs/*/templates"]
  }
};
```

---

## Getting Help

- **Documentation:** [https://gitvan.dev/docs](https://gitvan.dev/docs)
- **GitHub Issues:** [https://github.com/gitvan/gitvan/issues](https://github.com/gitvan/gitvan/issues)
- **Discord:** [https://discord.gg/gitvan](https://discord.gg/gitvan)
- **Troubleshooting:** [Error Codes & Troubleshooting](./errors-troubleshooting.md)

---

## Summary

You've learned:

- ✅ How to install and configure GitVan
- ✅ How to create and run jobs
- ✅ How to use event-driven automation
- ✅ How to schedule jobs with cron
- ✅ How to use templates
- ✅ How to work with audit receipts

**Ready to build more?** Check out the [Advanced Patterns](./advanced/patterns.md) guide!

---

## Example Repository

Clone our example repository to see GitVan in action:

```bash
git clone https://github.com/gitvan/examples
cd examples
npm install
npm run gitvan job list
```

Explore the `jobs/` directory for real-world examples!
