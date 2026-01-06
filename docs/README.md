# GitVan Documentation

> **Version:** 3.0.0
> **Complete Documentation Index**

Welcome to the GitVan documentation! This guide will help you find what you need.

## Quick Navigation

### Getting Started (5-10 minutes)

- **[Quick Start Guide](./quickstart.md)** - Get up and running in 5-10 minutes
- **[Installation](#installation)** - Install and configure GitVan
- **[Your First Job](#your-first-job)** - Create and run your first automation

### Core Documentation

- **[Complete API Reference](./api/complete-reference.md)** - All composables, methods, and types
- **[CLI Reference](./cli/complete-reference.md)** - All 22 commands with examples
- **[Configuration Guide](./configuration.md)** - Complete configuration options
- **[Error Codes & Troubleshooting](./errors-troubleshooting.md)** - Error reference and solutions

### Advanced Topics

- **[Advanced Patterns](./advanced/patterns.md)** - Advanced workflows and techniques
- **[Architecture Deep Dive](./advanced/architecture.md)** - System internals and design

### Migration & Upgrades

- **[v3 to v4 Migration Guide](./migration/v3-to-v4.md)** - Upgrade to v4
- **[Breaking Changes](#breaking-changes)** - What changed and why

---

## Documentation Structure

```
docs/
├── README.md                          # This file
├── quickstart.md                      # 5-10 minute tutorial
├── configuration.md                   # Configuration guide
├── errors-troubleshooting.md          # Error reference
├── api/
│   ├── complete-reference.md          # Complete API docs
│   ├── composables.md                 # Composables overview
│   └── composables-quick-reference.md # Quick reference
├── cli/
│   ├── complete-reference.md          # All CLI commands
│   ├── README.md                      # CLI overview
│   └── examples.md                    # CLI examples
├── advanced/
│   ├── patterns.md                    # Advanced patterns
│   └── architecture.md                # Architecture deep dive
└── migration/
    └── v3-to-v4.md                    # Migration guide
```

---

## By Topic

### Jobs

- [Creating Jobs](./quickstart.md#your-first-job)
- [Job API Reference](./api/complete-reference.md#usejob)
- [Job Patterns](./advanced/patterns.md#custom-job-types)
- [CLI: Job Commands](./cli/complete-reference.md#job-management)

### Events

- [Event-Driven Automation](./quickstart.md#event-driven-automation)
- [Event API Reference](./api/complete-reference.md#useevent)
- [Event Simulation](./cli/complete-reference.md#event-system)

### Workflows

- [Workflow Composition](./advanced/patterns.md#workflow-composition)
- [DAG Workflows](./advanced/architecture.md#workflow-engine)
- [CLI: Workflow Commands](./cli/complete-reference.md#workflow-operations)

### Templates

- [Using Templates](./quickstart.md#using-templates)
- [Template API Reference](./api/complete-reference.md#usetemplate)
- [Template Patterns](./advanced/patterns.md#template-inheritance)

### Scheduling

- [Cron Scheduling](./quickstart.md#scheduled-automation)
- [Schedule API Reference](./api/complete-reference.md#useschedule)
- [CLI: Cron Commands](./cli/complete-reference.md#cron-scheduling)

### Audit & Compliance

- [Audit Receipts](./quickstart.md#working-with-receipts)
- [Receipt API Reference](./api/complete-reference.md#usereceipt)
- [CLI: Audit Commands](./cli/complete-reference.md#audit--compliance)

---

## By Role

### For Developers

Start here:
1. [Quick Start](./quickstart.md)
2. [API Reference](./api/complete-reference.md)
3. [Advanced Patterns](./advanced/patterns.md)

### For DevOps Engineers

Start here:
1. [Quick Start](./quickstart.md)
2. [Configuration Guide](./configuration.md)
3. [CLI Reference](./cli/complete-reference.md)

### For Architects

Start here:
1. [Architecture Deep Dive](./advanced/architecture.md)
2. [Advanced Patterns](./advanced/patterns.md)
3. [API Reference](./api/complete-reference.md)

### For New Users

Start here:
1. **[Quick Start](./quickstart.md)** - Complete this first!
2. [Configuration Guide](./configuration.md)
3. [CLI Reference](./cli/complete-reference.md)

---

## Common Tasks

### Setup

- [Install GitVan](./quickstart.md#installation)
- [Create Configuration](./configuration.md#configuration-file)
- [Initialize First Job](./quickstart.md#your-first-job)

### Development

- [Create a Job](./quickstart.md#your-first-job)
- [Use Templates](./quickstart.md#using-templates)
- [Handle Errors](./advanced/patterns.md#error-recovery)
- [Test Jobs](./api/complete-reference.md#best-practices)

### Deployment

- [Configure for Production](./configuration.md#production-configuration)
- [Start Daemon](./cli/complete-reference.md#daemon-control)
- [Monitor Execution](./cli/complete-reference.md#daemon-logs)
- [Build Audit Reports](./cli/complete-reference.md#audit-build)

### Troubleshooting

- [Error Codes](./errors-troubleshooting.md#error-code-reference)
- [Common Errors](./errors-troubleshooting.md#common-errors)
- [Debug Tools](./errors-troubleshooting.md#debugging-tools)
- [Getting Help](./errors-troubleshooting.md#getting-help)

---

## API Documentation

### Composables

| Composable | Purpose | Documentation |
|------------|---------|---------------|
| `useGit()` | Git operations | [API](./api/complete-reference.md#usegit) |
| `useJob()` | Job management | [API](./api/complete-reference.md#usejob) |
| `useEvent()` | Event system | [API](./api/complete-reference.md#useevent) |
| `useSchedule()` | Cron scheduling | [API](./api/complete-reference.md#useschedule) |
| `useTemplate()` | Template rendering | [API](./api/complete-reference.md#usetemplate) |
| `useReceipt()` | Audit trails | [API](./api/complete-reference.md#usereceipt) |
| `useLock()` | Distributed locking | [API](./api/complete-reference.md#uselock) |
| `usePack()` | Pack management | [API](./api/complete-reference.md#usepack) |
| `useWorktree()` | Worktree operations | [API](./api/complete-reference.md#useworktree) |

### CLI Commands

| Command | Purpose | Documentation |
|---------|---------|---------------|
| `gitvan job` | Job management | [CLI](./cli/complete-reference.md#job-management) |
| `gitvan workflow` | Workflow operations | [CLI](./cli/complete-reference.md#workflow-operations) |
| `gitvan event` | Event simulation | [CLI](./cli/complete-reference.md#event-system) |
| `gitvan cron` | Cron scheduling | [CLI](./cli/complete-reference.md#cron-scheduling) |
| `gitvan daemon` | Daemon control | [CLI](./cli/complete-reference.md#daemon-control) |
| `gitvan audit` | Audit & compliance | [CLI](./cli/complete-reference.md#audit--compliance) |

---

## Key Concepts

### Context Management

**Critical:** All composables must be used within `withGitVan()` context.

```javascript
import { withGitVan, useGit } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  await git.branch(); // ✓ Works
});
```

[Learn more](./api/complete-reference.md#withgitvan)

### Git-Native Storage

GitVan stores everything in Git - no external databases.

- Git refs for locks and state
- Git notes for audit trails
- Git objects for receipts
- Git worktrees for parallel execution

[Learn more](./advanced/architecture.md#git-native-storage)

### Event-Driven Automation

Jobs can trigger automatically on Git events:

```
jobs/
  events/
    merge-to/
      main.mjs      # Runs when merging to main
    commit/
      *.mjs         # Runs on commits
```

[Learn more](./quickstart.md#event-driven-automation)

---

## Examples

### Quick Examples

**Run a job:**
```bash
gitvan job run --name deploy
```

**Schedule a job:**
```javascript
// jobs/cron/backup.mjs
export default {
  cron: "0 2 * * *",  // Daily at 2 AM
  async run() { /* ... */ }
};
```

**Create audit report:**
```bash
gitvan audit build --out report.json
```

### Complete Examples

See [Quick Start Guide](./quickstart.md) for step-by-step tutorials.

---

## Version Information

| Version | Status | Documentation |
|---------|--------|---------------|
| v3.0.x | **Current** | This documentation |
| v4.0.x | Beta | [Migration Guide](./migration/v3-to-v4.md) |
| v2.x | End of Life | Archive |

---

## Contributing

Documentation contributions are welcome! See [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Getting Help

- **Documentation Issues:** [Report here](https://github.com/gitvan/gitvan/issues/new?labels=documentation)
- **Questions:** [GitHub Discussions](https://github.com/gitvan/gitvan/discussions)
- **Chat:** [Discord](https://discord.gg/gitvan)
- **Email:** support@gitvan.dev

---

## Documentation Updates

This documentation is updated with each release. Last updated: January 6, 2026 for v3.0.0.

**Next Update:** v3.1.0 (February 2026)
