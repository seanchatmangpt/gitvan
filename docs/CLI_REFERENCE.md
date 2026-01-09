# GitVan CLI Complete Reference

**Version**: v4.0.1
**Last Updated**: January 9, 2026
**Target Audience**: Users of GitVan command-line interface

---

## Table of Contents

1. [CLI Overview](#cli-overview)
2. [Global Options](#global-options)
3. [Command Categories](#command-categories)
4. [Git Commands](#git-commands)
5. [Job Commands](#job-commands)
6. [Hook Commands](#hook-commands)
7. [Workflow Commands](#workflow-commands)
8. [LLM Commands](#llm-commands)
9. [RevOps Commands](#revops-commands)
10. [Administrative Commands](#administrative-commands)

---

## CLI Overview

### Invocation

```bash
gitvan [global-options] <command> [command-options]

# Examples
gitvan workflow list
gitvan job-run my-job
gitvan schedule --list
```

### Help System

```bash
# Show general help
gitvan --help

# Show command-specific help
gitvan <command> --help

# Show examples
gitvan <command> --examples
```

---

## Global Options

These options work with all GitVan commands:

| Option | Long Form | Description | Default |
|--------|-----------|-------------|---------|
| `-h` | `--help` | Show help message | - |
| `-v` | `--version` | Show GitVan version | - |
| `-q` | `--quiet` | Suppress normal output | false |
| `-d` | `--debug` | Enable debug logging | false |
| `--config` | - | Path to gitvan.config.js | Auto-detect |
| `--repo` | - | Repository path | Current directory |
| `--json` | - | Output as JSON | false |
| `--color` | - | Enable colored output | auto |
| `--cwd` | - | Change working directory | Current |

### Global Options Examples

```bash
# Quiet output
gitvan --quiet job-run my-job

# Debug mode
gitvan --debug workflow list

# JSON output for scripting
gitvan --json job-status my-job

# Specific config file
gitvan --config ./custom.config.js job list

# Disable colors
gitvan --color=false schedule --list
```

---

## Command Categories

GitVan commands are organized by feature:

1. **Git Commands** - Git repository operations
2. **Job Commands** - Job discovery, execution, scheduling
3. **Hook Commands** - Knowledge hook management
4. **Workflow Commands** - Workflow execution and management
5. **LLM Commands** - AI/LLM integration
6. **RevOps Commands** - Revenue operations automation
7. **Admin Commands** - System administration

---

## Git Commands

### git status

Get repository status.

```bash
gitvan git status [options]
```

**Options:**
- `--branch` - Show current branch only
- `--modified` - Show modified files only
- `--staged` - Show staged files only
- `--untracked` - Show untracked files only
- `--porcelain` - Machine-readable format

**Examples:**
```bash
# Full status
gitvan git status

# JSON output
gitvan --json git status

# Only modified files
gitvan git status --modified

# Porcelain format for scripting
gitvan git status --porcelain
```

### git commit

Create a commit with staged changes.

```bash
gitvan git commit [options]
```

**Options:**
- `-m, --message <text>` - Commit message (required)
- `-a, --all` - Stage all modified files
- `--amend` - Amend previous commit
- `-S, --sign` - Sign commit with GPG
- `--no-verify` - Skip pre-commit hooks

**Examples:**
```bash
# Simple commit
gitvan git commit -m "Fix bug in parser"

# Stage and commit all
gitvan git commit -a -m "Update documentation"

# Signed commit
gitvan git commit -m "Security fix" -S

# Amend previous commit
gitvan git commit --amend -m "Updated message"
```

### git branch

List, create, or delete branches.

```bash
gitvan git branch [options] [branch-name]
```

**Options:**
- `-a, --all` - List all branches (local + remote)
- `-l, --list` - List branches (default)
- `-d, --delete` - Delete branch
- `-D` - Force delete branch
- `-r, --remote` - List remote branches
- `--no-prefix` - Omit refs/heads/ prefix

**Examples:**
```bash
# List local branches
gitvan git branch

# List all branches
gitvan git branch -a

# Create new branch
gitvan git branch feature/new-feature

# Delete branch
gitvan git branch -d feature/old-feature

# Force delete
gitvan git branch -D feature/abandoned
```

### git log

Show commit history.

```bash
gitvan git log [options] [branch]
```

**Options:**
- `--depth <n>` - Show last n commits
- `--author <name>` - Filter by author
- `--grep <pattern>` - Filter by message
- `--since <date>` - Show commits since date
- `--until <date>` - Show commits until date
- `--oneline` - One commit per line
- `--graph` - Show branch graph
- `--stat` - Show file statistics

**Examples:**
```bash
# Recent commits
gitvan git log --depth 20

# Commits by author
gitvan git log --author "Alice"

# Commits since date
gitvan git log --since "2026-01-01"

# With statistics
gitvan git log --stat

# Graph view
gitvan git log --graph --oneline
```

### git merge

Merge branches.

```bash
gitvan git merge [options] <branch>
```

**Options:**
- `--no-ff` - Create merge commit
- `--squash` - Squash commits
- `--abort` - Abort merge

**Examples:**
```bash
# Merge develop into main
gitvan git merge develop

# Merge with commit
gitvan git merge --no-ff feature/new-feature

# Squash merge
gitvan git merge --squash experimental
```

---

## Job Commands

### job list

List all available jobs.

```bash
gitvan job list [options]
```

**Options:**
- `--search <pattern>` - Filter jobs by name
- `--details` - Show job details
- `--category <name>` - Filter by category
- `--executable` - Show only executable jobs

**Examples:**
```bash
# List all jobs
gitvan job list

# With details
gitvan job list --details

# Search jobs
gitvan job list --search "test"

# Specific category
gitvan job list --category "ci"
```

### job run

Execute a job immediately.

```bash
gitvan job run <job-name> [options]
```

**Options:**
- `-p, --param <key=value>` - Pass parameters (repeatable)
- `-t, --timeout <ms>` - Job timeout
- `--async` - Run asynchronously
- `--wait` - Wait for completion

**Examples:**
```bash
# Run job
gitvan job run my-job

# With parameters
gitvan job run my-job -p count=100 -p verbose=true

# Custom timeout
gitvan job run slow-job --timeout 60000

# Run asynchronously
gitvan job run background-task --async
```

### job schedule

Schedule a job for future execution.

```bash
gitvan job schedule <job-name> [options]
```

**Options:**
- `-c, --cron <expression>` - Cron schedule
- `-i, --interval <ms>` - Interval in milliseconds
- `-a, --at <date>` - Run at specific date/time
- `-d, --delay <ms>` - Run after delay
- `--timezone <tz>` - Set timezone for cron

**Examples:**
```bash
# Daily at 2 AM
gitvan job schedule daily-backup --cron "0 2 * * *"

# Every 5 minutes
gitvan job schedule health-check --interval 300000

# In 1 hour
gitvan job schedule cleanup --delay 3600000

# At specific time (EST timezone)
gitvan job schedule report --at "2026-01-10T10:00:00" --timezone "America/New_York"
```

### job status

Show job execution status.

```bash
gitvan job status [options] [job-name]
```

**Options:**
- `--job <name>` - Specific job
- `--all` - Show all jobs
- `--history` - Show execution history
- `--limit <n>` - Limit history entries

**Examples:**
```bash
# Show all job statuses
gitvan job status --all

# Specific job
gitvan job status my-job

# With history
gitvan job status my-job --history --limit 10

# JSON output
gitvan --json job status --all
```

### job search

Search and analyze jobs.

```bash
gitvan job search [options] <query>
```

**Options:**
- `--by <field>` - Search field (name, description, category)
- `--regex` - Use regex patterns
- `--details` - Show detailed results

**Examples:**
```bash
# Search by name
gitvan job search test

# Search by category
gitvan job search --by category ci

# Regex pattern
gitvan job search --regex ".*test.*" --by name
```

### job validate

Validate job configuration.

```bash
gitvan job validate [job-name]
```

**Options:**
- `-s, --syntax` - Check syntax only
- `--deps` - Check dependencies
- `--dry-run` - Simulate execution

**Examples:**
```bash
# Validate all jobs
gitvan job validate

# Specific job
gitvan job validate my-job

# Check dependencies
gitvan job validate --deps

# Dry run
gitvan job validate --dry-run
```

---

## Hook Commands

### hooks list

List all knowledge hooks.

```bash
gitvan hooks list [options]
```

**Options:**
- `--details` - Show hook details
- `--enabled` - Show only enabled hooks
- `--trigger <type>` - Filter by trigger type

**Examples:**
```bash
# List all hooks
gitvan hooks list

# With details
gitvan hooks list --details

# Only enabled hooks
gitvan hooks list --enabled

# Filter by trigger
gitvan hooks list --trigger "commit"
```

### hooks validate

Validate hook definitions.

```bash
gitvan hooks validate [options]
```

**Options:**
- `--file <path>` - Validate specific file
- `--syntax` - Check Turtle syntax only
- `--predicates` - Check predicate validity

**Examples:**
```bash
# Validate all hooks
gitvan hooks validate

# Specific file
gitvan hooks validate --file hooks/my-hook.ttl

# Syntax only
gitvan hooks validate --syntax
```

### hooks enable

Enable a knowledge hook.

```bash
gitvan hooks enable <hook-id>
```

**Examples:**
```bash
gitvan hooks enable pre-commit-quality
gitvan hooks enable post-merge-sync
```

### hooks disable

Disable a knowledge hook.

```bash
gitvan hooks disable <hook-id>
```

**Examples:**
```bash
gitvan hooks disable pre-commit-quality
```

### hooks test

Test a knowledge hook.

```bash
gitvan hooks test <hook-id> [options]
```

**Options:**
- `--event <type>` - Trigger event type
- `--dry-run` - Don't execute, just validate

**Examples:**
```bash
# Test hook
gitvan hooks test pre-commit-quality --event "pre-commit"

# Dry run
gitvan hooks test my-hook --dry-run
```

---

## Workflow Commands

### workflow list

List available workflows.

```bash
gitvan workflow list [options]
```

**Options:**
- `--details` - Show workflow details
- `--status` - Show execution status
- `--category <name>` - Filter by category

**Examples:**
```bash
# List workflows
gitvan workflow list

# With details
gitvan workflow list --details

# Show status
gitvan workflow list --status
```

### workflow run

Execute a workflow.

```bash
gitvan workflow run <workflow-name> [options]
```

**Options:**
- `-p, --param <key=value>` - Parameters (repeatable)
- `--step <name>` - Run specific step
- `--dry-run` - Plan without executing
- `-w, --wait` - Wait for completion

**Examples:**
```bash
# Run workflow
gitvan workflow run release

# With parameters
gitvan workflow run deploy -p environment=staging -p version=4.0.1

# Run specific step
gitvan workflow run release --step "build"

# Dry run (show plan)
gitvan workflow run release --dry-run
```

### workflow status

Show workflow status.

```bash
gitvan workflow status [workflow-name]
```

**Options:**
- `--all` - Show all workflows
- `--history` - Show execution history
- `--active` - Show currently running

**Examples:**
```bash
# Check workflow status
gitvan workflow status release

# Show history
gitvan workflow status release --history

# Show active workflows
gitvan workflow status --active
```

---

## LLM Commands

### llm chat

Interactive chat with AI.

```bash
gitvan llm chat [options]
```

**Options:**
- `--provider <name>` - AI provider (anthropic, ollama)
- `-c, --context <type>` - Include context (repo, workflow, git)
- `--system <prompt>` - System prompt
- `-t, --temperature <0-1>` - Creativity setting

**Examples:**
```bash
# Chat with AI
gitvan llm chat

# With repo context
gitvan llm chat --context repo

# Specific provider
gitvan llm chat --provider ollama

# Custom system prompt
gitvan llm chat --system "You are a Git expert"
```

### llm generate

Generate code or content.

```bash
gitvan llm generate <type> [options]
```

**Options:**
- `--prompt <text>` - Generation prompt
- `-p, --param <key=value>` - Parameters
- `--style <name>` - Output style

**Examples:**
```bash
# Generate test
gitvan llm generate test --prompt "Write test for login"

# Generate job
gitvan llm generate job --prompt "Daily backup task"

# Generate workflow
gitvan llm generate workflow --prompt "CI/CD pipeline"
```

### llm explain

Explain code or Git concepts.

```bash
gitvan llm explain [options]
```

**Options:**
- `--file <path>` - File to explain
- `--commit <hash>` - Commit to explain
- `-l, --language <lang>` - Code language

**Examples:**
```bash
# Explain file
gitvan llm explain --file src/main.js

# Explain commit
gitvan llm explain --commit abc123

# Explain Git concept
gitvan llm explain --file "What is a rebase?"
```

---

## RevOps Commands

### revops metrics

Show revenue operations metrics.

```bash
gitvan revops metrics [options]
```

**Options:**
- `--period <days>` - Time period
- `--team <name>` - Filter by team
- `--export <format>` - Export format (csv, json)

**Examples:**
```bash
# Show metrics
gitvan revops metrics

# Last 30 days
gitvan revops metrics --period 30

# Specific team
gitvan revops metrics --team "engineering"

# Export
gitvan revops metrics --export json > metrics.json
```

### revops forecast

Generate RevOps forecast.

```bash
gitvan revops forecast [options]
```

**Options:**
- `--horizon <days>` - Forecast horizon
- `--model <name>` - Forecast model

**Examples:**
```bash
# 90-day forecast
gitvan revops forecast --horizon 90

# Using specific model
gitvan revops forecast --model "linear-regression"
```

### revops sync

Synchronize with external systems.

```bash
gitvan revops sync [options] <system>
```

**Options:**
- `--system <name>` - Target system
- `--direction <pull|push>` - Sync direction

**Examples:**
```bash
# Sync with Salesforce
gitvan revops sync salesforce

# Pull from HubSpot
gitvan revops sync hubspot --direction pull
```

---

## Administrative Commands

### schedule

View and manage scheduled jobs.

```bash
gitvan schedule [options]
```

**Options:**
- `--list` - List scheduled jobs
- `--add <job>` - Add schedule
- `--remove <job>` - Remove schedule
- `--run <job>` - Run scheduled job now

**Examples:**
```bash
# List schedules
gitvan schedule --list

# Run scheduled job
gitvan schedule --run daily-backup

# Add schedule
gitvan schedule --add "health-check" --interval 300000
```

### daemon

Run background daemon.

```bash
gitvan daemon [options]
```

**Options:**
- `--start` - Start daemon
- `--stop` - Stop daemon
- `--status` - Show daemon status
- `--log` - Show daemon logs
- `-p, --port <number>` - Daemon port

**Examples:**
```bash
# Start daemon
gitvan daemon --start

# Check status
gitvan daemon --status

# View logs
gitvan daemon --log

# Stop daemon
gitvan daemon --stop
```

### event

Trigger manual events.

```bash
gitvan event trigger <event-type> [options]
```

**Options:**
- `--data <json>` - Event data
- `--async` - Trigger asynchronously

**Examples:**
```bash
# Trigger event
gitvan event trigger commit --data '{"branch":"main"}'

# Asynchronously
gitvan event trigger push --async
```

### cron

View cron schedule details.

```bash
gitvan cron [options]
```

**Options:**
- `--next <n>` - Show next n executions
- `--validate <expr>` - Validate cron expression

**Examples:**
```bash
# Show cron details
gitvan cron

# Validate expression
gitvan cron --validate "0 2 * * *"

# Next 5 runs
gitvan cron --next 5
```

### cleanroom

Run in isolated cleanroom environment.

```bash
gitvan cleanroom [options] <command>
```

**Options:**
- `--image <name>` - Container image
- `--mount <path>` - Mount path
- `--keep` - Keep cleanroom after run

**Examples:**
```bash
# Run in cleanroom
gitvan cleanroom npm test

# With specific image
gitvan cleanroom --image "node:18" npm run build

# Keep cleanroom
gitvan cleanroom --keep npm test
```

### audit

Show audit trail.

```bash
gitvan audit [options]
```

**Options:**
- `--since <date>` - Show since date
- `--action <type>` - Filter by action
- `--actor <user>` - Filter by user

**Examples:**
```bash
# Show audit trail
gitvan audit

# Recent actions
gitvan audit --since "2026-01-01"

# Specific action
gitvan audit --action "commit"

# By user
gitvan audit --actor "alice"
```

### jtbd

Job-to-be-done analysis.

```bash
gitvan jtbd [options] <context>
```

**Options:**
- `--analyze` - Run analysis
- `--scenarios` - Show scenarios

**Examples:**
```bash
# JTBD analysis
gitvan jtbd "help developers commit code"

# Show scenarios
gitvan jtbd "ci/cd pipeline" --scenarios
```

---

## Output Formats

### JSON Output

All commands support `--json` for machine-readable output:

```bash
gitvan --json job list
# Returns:
# [
#   {
#     "name": "job-1",
#     "category": "ci",
#     "executable": true
#   },
#   ...
# ]
```

### Table Output

Default human-readable table format:

```bash
gitvan job list
# NAME       CATEGORY   STATUS
# job-1      ci         ready
# job-2      deploy     running
# job-3      test       idle
```

### Porcelain Format

Machine-readable format for Git commands:

```bash
gitvan git status --porcelain
# M  src/main.js
# A  docs/new-file.md
# ?? untracked.txt
```

---

## Environment Variables

These environment variables configure CLI behavior:

| Variable | Purpose | Example |
|----------|---------|---------|
| `GITVAN_HOME` | Config directory | `~/.gitvan` |
| `GITVAN_REPO` | Repository path | `/home/user/repo` |
| `GITVAN_CONFIG` | Config file path | `./gitvan.config.js` |
| `GITVAN_LOG_LEVEL` | Logging level | `debug`, `info`, `warn`, `error` |
| `GITVAN_TIMEOUT` | Default timeout | `30000` |
| `AI_PROVIDER` | AI provider | `anthropic`, `ollama` |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `OLLAMA_URL` | Ollama endpoint | `http://localhost:11434` |

---

## Examples and Recipes

### Recipe 1: Daily Development Workflow

```bash
# Morning: Check status and pull latest
gitvan git status
gitvan git pull

# During day: Create feature branch
gitvan git branch feature/my-feature

# Evening: Commit work
gitvan git commit -a -m "Work in progress"

# Weekly: Merge to main
gitvan git merge main
gitvan git push
```

### Recipe 2: Run Automated Tests

```bash
# List available test jobs
gitvan job list --category test

# Run specific test
gitvan job run test-suite

# Check status
gitvan job status test-suite

# Schedule daily runs
gitvan job schedule test-suite --cron "0 2 * * *"
```

### Recipe 3: Deploy to Production

```bash
# Prepare deployment
gitvan workflow run release-prep

# Plan deployment
gitvan workflow run deploy --dry-run

# Execute deployment
gitvan workflow run deploy -p environment=production

# Monitor
gitvan workflow status deploy --history
```

---

## Summary

GitVan provides comprehensive CLI commands organized by feature:
- **Git Commands**: Repository operations
- **Job Commands**: Job execution and scheduling
- **Hook Commands**: Knowledge hook management
- **Workflow Commands**: Workflow execution
- **LLM Commands**: AI integration
- **RevOps Commands**: Revenue operations
- **Admin Commands**: System administration

All commands support `--help`, `--json`, and debug options for flexible usage.

---

**Last Updated**: January 9, 2026
**Status**: Complete
**Related Docs**: GETTING_STARTED.md, CONFIGURATION_GUIDE.md
