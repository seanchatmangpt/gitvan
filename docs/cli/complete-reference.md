# GitVan CLI Complete Reference

> **Version:** 3.0.0
> **Last Updated:** January 6, 2026

Complete command-line interface reference for GitVan automation platform.

## Table of Contents

- [Overview](#overview)
- [Command Structure](#command-structure)
- [Global Options](#global-options)
- [Commands](#commands)
  - [Job Management](#job-management)
  - [Workflow Operations](#workflow-operations)
  - [Event System](#event-system)
  - [Cron Scheduling](#cron-scheduling)
  - [Daemon Control](#daemon-control)
  - [Audit & Compliance](#audit--compliance)
  - [JTBD (Jobs-to-be-Done)](#jtbd-jobs-to-be-done)
  - [Knowledge Hooks](#knowledge-hooks)
  - [Studio (Interactive)](#studio-interactive)
  - [Cleanroom Testing](#cleanroom-testing)
- [Exit Codes](#exit-codes)
- [Environment Variables](#environment-variables)
- [Examples](#examples)

---

## Overview

GitVan CLI provides a comprehensive command-line interface for:

- **Job execution** - Run automation tasks on-demand
- **Workflow orchestration** - Define and execute DAG-based workflows
- **Event handling** - Simulate and trigger Git events
- **Cron scheduling** - Schedule recurring tasks
- **Daemon management** - Control background automation
- **Audit trails** - Build and verify execution receipts
- **Knowledge hooks** - Semantic RDF-based automation
- **Interactive studio** - Visual workflow builder

---

## Command Structure

```bash
gitvan <command> [subcommand] [options]

# Examples
gitvan job run --name deploy
gitvan workflow execute my-workflow
gitvan daemon start --worktrees all
gitvan audit build --out report.json
```

---

## Global Options

Available for all commands:

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--help` | Show command help | - | `gitvan job --help` |
| `--version` | Show GitVan version | - | `gitvan --version` |
| `--verbose` | Enable verbose logging | `false` | `gitvan job run --verbose` |
| `--config <path>` | Custom config file | `gitvan.config.mjs` | `--config custom.config.mjs` |
| `--root <path>` | Repository root directory | `process.cwd()` | `--root /var/repos/myapp` |
| `--no-color` | Disable colored output | `false` | `gitvan job list --no-color` |

---

## Commands

### Job Management

#### `gitvan job list`

List all available jobs in the repository.

**Usage:**
```bash
gitvan job list [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--filter <tag>` | Filter by tag | - |
| `--dir <directory>` | Filter by directory | - |
| `--format <type>` | Output format: `table`, `json`, `yaml` | `table` |

**Examples:**
```bash
# List all jobs
gitvan job list

# Filter by tag
gitvan job list --filter cron

# JSON output
gitvan job list --format json

# Filter by directory
gitvan job list --dir automation/ci
```

**Output:**
```
Found 5 job(s):

┌──────────────┬─────────────────────┬──────────────┐
│ ID           │ Name                │ Tags         │
├──────────────┼─────────────────────┼──────────────┤
│ backup       │ Daily Backup        │ cron, data   │
│ deploy       │ Deploy to Staging   │ deployment   │
│ test-suite   │ Run Test Suite      │ testing      │
│ security-scan│ Security Scan       │ security     │
│ changelog    │ Generate Changelog  │ docs         │
└──────────────┴─────────────────────┴──────────────┘
```

---

#### `gitvan job run`

Execute a specific job by name or ID.

**Usage:**
```bash
gitvan job run --name <job-name> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--name <name>` | **Required.** Job name or ID | - |
| `--payload <json>` | Job payload (JSON) | `{}` |
| `--env <key=value>` | Set environment variable | - |
| `--dry-run` | Simulate without executing | `false` |
| `--lock` | Acquire distributed lock | `false` |
| `--timeout <ms>` | Execution timeout | `300000` |

**Examples:**
```bash
# Run simple job
gitvan job run --name backup

# With payload
gitvan job run --name deploy --payload '{"env":"staging"}'

# With environment variables
gitvan job run --name test --env NODE_ENV=test --env DEBUG=true

# Dry run (simulation)
gitvan job run --name deploy --dry-run

# With distributed lock
gitvan job run --name deploy --lock --timeout 600000
```

**Output:**
```
Running job: deploy
Environment: staging
Duration: 2.3s

✓ Job completed successfully

Artifacts:
  - dist/bundle.js
  - dist/index.html
  - deploy-log.txt

Receipt: refs/notes/gitvan/audit/abc123...
```

---

#### `gitvan job validate`

Validate job definition without executing.

**Usage:**
```bash
gitvan job validate --name <job-name>
```

**Examples:**
```bash
gitvan job validate --name deploy
```

**Output:**
```
Validating job: deploy

✓ Job definition valid
✓ Dependencies satisfied
✓ Permissions correct
✓ Schema valid

Job is ready to execute.
```

---

### Workflow Operations

#### `gitvan workflow list`

List all workflow definitions.

**Usage:**
```bash
gitvan workflow list [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--format <type>` | Output format | `table` |
| `--status <status>` | Filter by status | - |

**Examples:**
```bash
# List all workflows
gitvan workflow list

# JSON output
gitvan workflow list --format json
```

---

#### `gitvan workflow execute`

Execute a workflow by name.

**Usage:**
```bash
gitvan workflow execute <workflow-name> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--context <json>` | Workflow context | `{}` |
| `--parallel` | Execute steps in parallel | `false` |
| `--dry-run` | Simulate execution | `false` |

**Examples:**
```bash
# Execute workflow
gitvan workflow execute ci-pipeline

# With context
gitvan workflow execute deploy --context '{"branch":"main"}'

# Parallel execution
gitvan workflow execute test-matrix --parallel

# Dry run
gitvan workflow execute deploy --dry-run
```

**Output:**
```
Executing workflow: ci-pipeline

Steps:
  1. ✓ install-deps (2.1s)
  2. ✓ run-tests (15.3s)
  3. ✓ build (8.7s)
  4. ✓ deploy (12.4s)

✓ Workflow completed in 38.5s
```

---

#### `gitvan workflow validate`

Validate workflow definition.

**Usage:**
```bash
gitvan workflow validate <workflow-file>
```

**Examples:**
```bash
gitvan workflow validate workflows/ci.ttl
```

---

#### `gitvan workflow graph`

Visualize workflow DAG.

**Usage:**
```bash
gitvan workflow graph <workflow-name> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--format <type>` | Output format: `dot`, `mermaid`, `ascii` | `ascii` |
| `--out <file>` | Output file | - |

**Examples:**
```bash
# ASCII visualization
gitvan workflow graph ci-pipeline

# Mermaid diagram
gitvan workflow graph ci-pipeline --format mermaid --out ci.mmd

# Graphviz DOT
gitvan workflow graph ci-pipeline --format dot --out ci.dot
```

---

### Event System

#### `gitvan event list`

List all event-triggered jobs.

**Usage:**
```bash
gitvan event list [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--type <type>` | Filter by event type | - |
| `--format <format>` | Output format | `table` |

**Examples:**
```bash
# List all events
gitvan event list

# Filter by type
gitvan event list --type commit
gitvan event list --type merge-to
```

**Output:**
```
Found 3 event job(s):

Event Type: commit
  • pr-validator
    Predicate: {"filesChanged": "src/**"}

Event Type: merge-to
  • deploy-staging
    Branch: develop

Event Type: tag-created
  • release-notes
    Pattern: v*
```

---

#### `gitvan event simulate`

Simulate event to see which jobs would trigger.

**Usage:**
```bash
gitvan event simulate [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--files <list>` | Changed files (comma-separated) | - |
| `--tags <list>` | Created tags (comma-separated) | - |
| `--message <text>` | Commit message | - |
| `--author <email>` | Author email | - |
| `--branch <name>` | Target branch for merges | - |
| `--signed` | Whether commit is signed | `false` |

**Examples:**
```bash
# Simulate file changes
gitvan event simulate --files "src/api/users.js,src/api/auth.js"

# Simulate tag creation
gitvan event simulate --tags "v1.2.0"

# Simulate merge
gitvan event simulate --branch main --message "feat: new feature"

# Complex simulation
gitvan event simulate \
  --files "src/**/*.js" \
  --message "fix: security patch" \
  --author "security@company.com" \
  --signed true
```

**Output:**
```
Simulating event...

Event Details:
  Type: commit
  Files: src/api/users.js, src/api/auth.js
  Author: dev@company.com

Matching Jobs:
  ✓ pr-validator
    Reason: Files match pattern "src/**"

  ✓ security-scan
    Reason: API files changed

Would execute 2 job(s)
```

---

#### `gitvan event test`

Test specific event predicates.

**Usage:**
```bash
gitvan event test --predicate <json> [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--predicate <json>` | **Required.** Predicate JSON | - |
| Plus all simulation options | - | - |

**Examples:**
```bash
# Test predicate
gitvan event test \
  --predicate '{"filesChanged": ["src/**"]}' \
  --files "src/api/users.js"

# Test complex predicate
gitvan event test \
  --predicate '{"branch":"main","filesChanged":["*.md"]}' \
  --branch main \
  --files "README.md,CHANGELOG.md"
```

---

### Cron Scheduling

#### `gitvan cron list`

Display all scheduled (cron) jobs.

**Usage:**
```bash
gitvan cron list [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--format <type>` | Output format | `table` |
| `--enabled` | Show only enabled | `false` |

**Examples:**
```bash
# List all cron jobs
gitvan cron list

# JSON output
gitvan cron list --format json

# Only enabled jobs
gitvan cron list --enabled
```

**Output:**
```
Found 2 cron job(s):

📅 daily-backup
   Cron: 0 2 * * *
   File: jobs/backup.mjs
   Desc: Daily repository backup
   Next: 2026-01-07 02:00:00 UTC

📅 weekly-report
   Cron: 0 9 * * 1
   File: jobs/report.mjs
   Desc: Weekly status report
   Next: 2026-01-13 09:00:00 UTC
```

---

#### `gitvan cron start`

Start the cron scheduler daemon.

**Usage:**
```bash
gitvan cron start [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--interval <ms>` | Check interval | `60000` |
| `--daemon` | Run as background daemon | `false` |

**Examples:**
```bash
# Start scheduler
gitvan cron start

# Background daemon
gitvan cron start --daemon

# Custom interval
gitvan cron start --interval 30000
```

---

#### `gitvan cron stop`

Stop the running cron scheduler.

**Usage:**
```bash
gitvan cron stop
```

---

#### `gitvan cron dry-run`

Test which jobs would run at a specific time.

**Usage:**
```bash
gitvan cron dry-run [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--at <iso-time>` | Test time (ISO 8601) | `now` |

**Examples:**
```bash
# Test current time
gitvan cron dry-run

# Test specific time
gitvan cron dry-run --at "2026-01-07T02:00:00Z"

# Test next week
gitvan cron dry-run --at "2026-01-13T09:00:00Z"
```

**Output:**
```
Dry run at: 2026-01-07T02:00:00Z

Would execute:
  ✓ daily-backup (0 2 * * *)
    Last run: 2026-01-06T02:00:00Z
    Next run: 2026-01-07T02:00:00Z

1 job(s) would run
```

---

### Daemon Control

#### `gitvan daemon start`

Start the GitVan background daemon.

**Usage:**
```bash
gitvan daemon start [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--worktrees <scope>` | Monitor scope: `current` or `all` | `current` |
| `--interval <ms>` | Check interval | `60000` |
| `--log <file>` | Log file path | `.gitvan/daemon.log` |

**Examples:**
```bash
# Start daemon for current worktree
gitvan daemon start

# Monitor all worktrees
gitvan daemon start --worktrees all

# Custom interval
gitvan daemon start --interval 30000 --log /var/log/gitvan.log
```

**Output:**
```
Starting GitVan daemon...

Configuration:
  Worktrees: current
  Interval: 60s
  PID: 12345
  Log: .gitvan/daemon.log

✓ Daemon started successfully
```

---

#### `gitvan daemon stop`

Stop the running daemon.

**Usage:**
```bash
gitvan daemon stop
```

**Output:**
```
Stopping GitVan daemon (PID: 12345)...
✓ Daemon stopped successfully
```

---

#### `gitvan daemon status`

Check daemon status and statistics.

**Usage:**
```bash
gitvan daemon status
```

**Output:**
```
GitVan Daemon Status:

Status: Running
PID: 12345
Uptime: 2h 15m 30s
Worktrees: current

Statistics:
  Active Jobs: 0
  Completed Jobs: 15
  Failed Jobs: 1
  Total Executions: 16

Recent Activity:
  2026-01-06 14:30:00 - backup (success)
  2026-01-06 13:15:00 - test-suite (success)
  2026-01-06 12:00:00 - deploy (failed)
```

---

#### `gitvan daemon restart`

Restart the daemon with current configuration.

**Usage:**
```bash
gitvan daemon restart [options]
```

**Examples:**
```bash
# Restart daemon
gitvan daemon restart

# Restart with new configuration
gitvan daemon restart --worktrees all --interval 120000
```

---

#### `gitvan daemon logs`

View daemon logs.

**Usage:**
```bash
gitvan daemon logs [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--tail <n>` | Show last N lines | `50` |
| `--follow` | Follow log output | `false` |
| `--level <level>` | Filter by level | - |

**Examples:**
```bash
# Last 50 lines
gitvan daemon logs

# Last 100 lines
gitvan daemon logs --tail 100

# Follow logs
gitvan daemon logs --follow

# Filter by level
gitvan daemon logs --level error
```

---

### Audit & Compliance

#### `gitvan audit build`

Build comprehensive audit report from all receipts.

**Usage:**
```bash
gitvan audit build [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--out <path>` | Output file path | `dist/audit.json` |
| `--format <type>` | Format: `json`, `html`, `pdf` | `json` |
| `--from <date>` | Start date (ISO 8601) | - |
| `--to <date>` | End date (ISO 8601) | - |
| `--filter <criteria>` | Filter receipts | - |

**Examples:**
```bash
# Build audit report
gitvan audit build

# Custom output
gitvan audit build --out reports/audit-2026-01.json

# HTML report
gitvan audit build --format html --out audit.html

# Date range
gitvan audit build \
  --from "2026-01-01T00:00:00Z" \
  --to "2026-01-31T23:59:59Z"

# Filter by status
gitvan audit build --filter '{"status":"error"}'
```

**Output:**
```
Building audit report...

Scanning receipts...
  Found: 150 receipts
  Timespan: 2026-01-01 to 2026-01-31

Statistics:
  Success: 145 (96.7%)
  Error: 3 (2.0%)
  Skipped: 2 (1.3%)

Report written to: dist/audit.json
Size: 45.2 KB
```

---

#### `gitvan audit verify`

Verify receipt integrity.

**Usage:**
```bash
gitvan audit verify --id <receipt-id>
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--id <id>` | **Required.** Receipt ID | - |
| `--verbose` | Show verification details | `false` |

**Examples:**
```bash
# Verify receipt
gitvan audit verify --id job-20260106-143022-abc123

# Verbose output
gitvan audit verify --id job-20260106-143022-abc123 --verbose
```

**Output:**
```
Verifying receipt: job-20260106-143022-abc123

Checks:
  ✓ Receipt exists
  ✓ Fingerprint valid
  ✓ Signature valid
  ✓ Timestamp valid
  ✓ Artifacts exist

✓ Receipt is valid
```

---

#### `gitvan audit list`

List recent receipts.

**Usage:**
```bash
gitvan audit list [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--limit <n>` | Maximum receipts | `50` |
| `--status <status>` | Filter by status | - |
| `--job <jobId>` | Filter by job ID | - |
| `--format <type>` | Output format | `table` |

**Examples:**
```bash
# List 50 recent receipts
gitvan audit list

# List 100 receipts
gitvan audit list --limit 100

# Filter by status
gitvan audit list --status error

# Filter by job
gitvan audit list --job deploy

# JSON output
gitvan audit list --format json
```

---

#### `gitvan audit show`

Show detailed receipt information.

**Usage:**
```bash
gitvan audit show --id <receipt-id>
```

**Examples:**
```bash
gitvan audit show --id job-20260106-143022-abc123
```

**Output:**
```
Receipt: job-20260106-143022-abc123

Job: deploy
Status: success
Timestamp: 2026-01-06T14:30:22Z
Duration: 12.4s

Artifacts:
  - dist/bundle.js (245 KB)
  - dist/index.html (4 KB)
  - deploy-log.txt (12 KB)

Metadata:
  environment: production
  version: 1.2.3
  deployer: ops@company.com

Fingerprint: sha256:abc123def456...
Signature: ✓ Valid
```

---

### JTBD (Jobs-to-be-Done)

#### `gitvan jtbd list`

List all JTBD scenarios.

**Usage:**
```bash
gitvan jtbd list
```

---

#### `gitvan jtbd execute`

Execute a JTBD scenario.

**Usage:**
```bash
gitvan jtbd execute <scenario-id> [options]
```

**Examples:**
```bash
gitvan jtbd execute onboarding
gitvan jtbd execute deployment --context '{"env":"prod"}'
```

---

### Knowledge Hooks

#### `gitvan hooks list`

List all knowledge hooks.

**Usage:**
```bash
gitvan hooks list [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--format <type>` | Output format | `table` |
| `--type <type>` | Filter by hook type | - |

**Examples:**
```bash
# List all hooks
gitvan hooks list

# Filter by type
gitvan hooks list --type before

# JSON output
gitvan hooks list --format json
```

---

#### `gitvan hooks register`

Register a new knowledge hook.

**Usage:**
```bash
gitvan hooks register <hook-file> [options]
```

**Examples:**
```bash
gitvan hooks register hooks/commit-lint.ttl
gitvan hooks register hooks/auto-tag.ttl --enabled
```

---

#### `gitvan hooks test`

Test hook predicate matching.

**Usage:**
```bash
gitvan hooks test --hook <hook-id> [options]
```

**Examples:**
```bash
gitvan hooks test --hook commit-lint --files "src/index.js"
```

---

### Studio (Interactive)

#### `gitvan studio`

Launch interactive workflow studio.

**Usage:**
```bash
gitvan studio [options]
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--port <port>` | Server port | `3000` |
| `--open` | Open browser automatically | `true` |

**Examples:**
```bash
# Launch studio
gitvan studio

# Custom port
gitvan studio --port 8080

# Don't open browser
gitvan studio --no-open
```

---

### Cleanroom Testing

#### `gitvan cleanroom init`

Initialize cleanroom test environment.

**Usage:**
```bash
gitvan cleanroom init [options]
```

**Examples:**
```bash
gitvan cleanroom init
gitvan cleanroom init --docker
```

---

#### `gitvan cleanroom run`

Run tests in cleanroom environment.

**Usage:**
```bash
gitvan cleanroom run <test-suite>
```

**Examples:**
```bash
gitvan cleanroom run integration-tests
```

---

## Exit Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `0` | Success | Command completed successfully |
| `1` | General Error | Unspecified error occurred |
| `2` | Invalid Arguments | Invalid command-line arguments |
| `3` | Job Execution Failure | Job failed during execution |
| `4` | Configuration Error | Invalid or missing configuration |
| `5` | Permission Denied | Insufficient permissions |
| `6` | Resource Not Found | Job, workflow, or file not found |
| `7` | Timeout | Operation timed out |
| `8` | Lock Acquisition Failed | Could not acquire distributed lock |

---

## Environment Variables

See [Configuration Guide](../configuration.md#environment-variables) for complete list.

---

## Examples

### Daily Workflow

```bash
# Morning: Check status
gitvan daemon status
gitvan job list --filter recent

# Run tests
gitvan job run --name test-suite

# Deploy to staging
gitvan job run --name deploy --payload '{"env":"staging"}' --lock

# Evening: Check audit trail
gitvan audit list --limit 20
gitvan daemon logs --tail 100
```

### CI/CD Pipeline

```bash
# Build and test
gitvan workflow execute ci-pipeline --context '{"branch":"main"}'

# Deploy to production
gitvan job run --name deploy-production --lock --timeout 600000

# Verify deployment
gitvan audit verify --id $(gitvan audit list --limit 1 --format json | jq -r '.[0].id')

# Generate report
gitvan audit build --format html --out deploy-report.html
```

### Event Simulation

```bash
# Simulate PR
gitvan event simulate \
  --files "src/api/*.js,tests/api/*.test.js" \
  --branch main \
  --message "feat: new API endpoint"

# Check which jobs would run
gitvan job list --filter pr

# Test specific hook
gitvan hooks test --hook pr-validator --files "src/api/users.js"
```

---

## See Also

- [Complete API Reference](../api/complete-reference.md)
- [Configuration Guide](../configuration.md)
- [Quick Start Guide](../quickstart.md)
- [Examples](./examples.md)
