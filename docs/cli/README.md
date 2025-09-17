# GitVan CLI Reference

GitVan v2 provides a comprehensive command-line interface for AI-powered Git workflow automation. The CLI is built on modern patterns with citty framework for consistent command handling.

## Overview

```bash
gitvan <command> [subcommand] [options]
```

GitVan CLI organizes functionality into logical command groups:

- **job** - Execute and manage automation jobs
- **cron** - Schedule recurring tasks
- **daemon** - Background process management
- **event** - Event simulation and testing
- **audit** - Receipt verification and compliance
- **chat** - AI-powered job generation
- **llm** - Direct AI model operations

## Core Commands

### Job Management (`gitvan job`)

The job system is the heart of GitVan automation, providing on-demand and scheduled execution of automation tasks.

#### `gitvan job list`
List all available jobs in the current repository.

```bash
gitvan job list
# Output: Available jobs from jobs/ directory
```

#### `gitvan job run --name <job-name>`
Execute a specific job by name.

```bash
gitvan job run --name changelog
gitvan job run --name deploy-staging
```

**Options:**
- `--name <job-name>` - Required. Name of the job to execute
- `--dry-run` - Simulate execution without making changes
- `--env <key=value>` - Set environment variables

### Cron Scheduling (`gitvan cron`)

Manage scheduled jobs using cron-like syntax for automated execution.

#### `gitvan cron list`
Display all jobs with cron schedules.

```bash
gitvan cron list
# Output:
# Found 2 cron job(s):
#
# 📅 daily-backup
#    Cron: 0 2 * * *
#    File: jobs/backup.mjs
#    Desc: Daily repository backup
```

#### `gitvan cron start`
Start the cron scheduler daemon.

```bash
gitvan cron start
```

#### `gitvan cron dry-run [--at <time>]`
Test which jobs would run at a specific time.

```bash
gitvan cron dry-run
gitvan cron dry-run --at "2024-12-01T02:00:00Z"
```

**Options:**
- `--at <iso-time>` - Test specific time (defaults to now)

### Daemon Management (`gitvan daemon`)

Control the background daemon that monitors for events and executes scheduled tasks.

#### `gitvan daemon start [--worktrees <scope>]`
Start the GitVan daemon.

```bash
gitvan daemon start
gitvan daemon start --worktrees all
```

**Options:**
- `--worktrees <scope>` - Monitor scope: `current` or `all` worktrees

#### `gitvan daemon stop`
Stop the running daemon.

```bash
gitvan daemon stop
```

#### `gitvan daemon status`
Check daemon status and statistics.

```bash
gitvan daemon status
# Output:
# GitVan Daemon Status:
#   Running: Yes
#   PID: 12345
#   Uptime: 2h 15m
#   Active Jobs: 0
#   Completed Jobs: 15
```

#### `gitvan daemon restart`
Restart the daemon with current configuration.

```bash
gitvan daemon restart --worktrees all
```

### Event System (`gitvan event`)

Simulate and test event-driven automation before deployment.

#### `gitvan event list`
Show all event-triggered jobs.

```bash
gitvan event list
# Output:
# Found 3 event job(s):
#
# 🎯 pr-validator
#    File: jobs/validate-pr.mjs
#    Predicate: {"filesChanged": "src/**"}
```

#### `gitvan event simulate`
Test which jobs would trigger for simulated events.

```bash
gitvan event simulate --files "src/api/users.js,src/api/auth.js"
gitvan event simulate --tags "v1.2.0" --author "dev@company.com"
gitvan event simulate --branch "main" --message "fix: critical security patch"
```

**Options:**
- `--files <list>` - Comma-separated list of changed files
- `--tags <list>` - Comma-separated list of created tags
- `--message <text>` - Commit message
- `--author <email>` - Author email
- `--branch <name>` - Target branch for merge events
- `--signed <bool>` - Whether commits are signed

#### `gitvan event test`
Test specific event predicates.

```bash
gitvan event test --predicate '{"filesChanged": ["src/**"]}' --files "src/api/users.js"
```

**Options:**
- `--predicate <json>` - JSON predicate to test
- Plus all simulation options above

### Audit & Compliance (`gitvan audit`)

Build audit trails and verify execution receipts for compliance and debugging.

#### `gitvan audit build [--out <path>]`
Create comprehensive audit pack from all receipts.

```bash
gitvan audit build
gitvan audit build --out reports/audit-2024-12.json
```

**Options:**
- `--out <path>` - Output file path (default: `dist/audit.json`)

#### `gitvan audit verify --id <receipt-id>`
Verify integrity of a specific receipt.

```bash
gitvan audit verify --id job-20241201-143022-abc123
```

#### `gitvan audit list [--limit <n>]`
List recent receipts with status summary.

```bash
gitvan audit list
gitvan audit list --limit 100
```

**Options:**
- `--limit <number>` - Maximum receipts to show (default: 50)

#### `gitvan audit show --id <receipt-id>`
Display detailed receipt information.

```bash
gitvan audit show --id job-20241201-143022-abc123
```

### AI-Powered Chat (`gitvan chat`)

Generate jobs and automation using conversational AI interface.

#### `gitvan chat draft --prompt "<description>"`
Create job specifications without writing files.

```bash
gitvan chat draft --prompt "Create a changelog generator that scans commits since last tag"
gitvan chat draft --prompt "Build a deployment job for staging environment" --kind job
```

**Options:**
- `--prompt <text>` - Required. Description of desired automation
- `--kind <type>` - Job type: `job` or `event` (default: `job`)
- `--model <name>` - AI model to use
- `--temp <float>` - Temperature for generation (0.0-1.0)

#### `gitvan chat generate --prompt "<description>"`
Generate complete job files with source code.

```bash
gitvan chat generate --prompt "Create a security scanner that checks for secrets in commits"
gitvan chat generate --prompt "Build a PR validator for code style" --path "jobs/validation/style.mjs"
```

**Options:**
- `--prompt <text>` - Required. Description of desired automation
- `--path <file>` - Output file path (auto-generated if not specified)
- `--kind <type>` - Job type: `job` or `event`
- `--model <name>` - AI model to use

#### `gitvan chat explain --job <path>`
Get plain-English explanation of existing jobs.

```bash
gitvan chat explain --job jobs/deploy.mjs
```

### Direct AI Operations (`gitvan llm`)

Direct interface to AI models for custom prompts and model management.

#### `gitvan llm call "<prompt>" [--model <name>]`
Execute custom prompts against configured AI models.

```bash
gitvan llm call "Summarize the last 5 commits in this repository"
gitvan llm call "What security best practices should I follow for CI/CD?" --model claude-3-sonnet
```

**Options:**
- `--model <name>` - Specific model to use (overrides config)

#### `gitvan llm models`
Check AI provider availability and configured models.

```bash
gitvan llm models
# Output:
# Provider: anthropic
# Model: claude-3-haiku
# Available: Yes
```

## Legacy Commands

### `gitvan run <job-name>`
**Deprecated:** Use `gitvan job run --name <job-name>` instead.

### `gitvan list`
**Deprecated:** Use `gitvan job list` instead.

## Global Options

Most commands support these common options:

- `--help` - Show command-specific help
- `--verbose` - Enable detailed logging
- `--config <path>` - Use custom config file
- `--root <path>` - Set repository root directory

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - Job execution failure
- `4` - AI service unavailable

## Configuration

GitVan reads configuration from:
1. `gitvan.config.mjs` (recommended)
2. `gitvan.config.js`
3. `package.json` ("gitvan" field)

See the Configuration Guide for detailed setup instructions.

## Examples

See [CLI Examples](./examples.md) for practical usage scenarios and workflows.