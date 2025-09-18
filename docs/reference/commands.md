# GitVan v2 Command Reference

Complete reference for all GitVan CLI commands with flags, options, and examples.

## Table of Contents

- [Core Commands](#core-commands)
- [Job Commands](#job-commands)
- [Event Commands](#event-commands)
- [Template Commands](#template-commands)
- [Pack Commands](#pack-commands)
- [Marketplace Commands](#marketplace-commands)
- [AI Commands](#ai-commands)
- [Git Commands](#git-commands)
- [Utility Commands](#utility-commands)
- [Configuration Commands](#configuration-commands)

## Core Commands

### `gitvan init`

Initialize a new GitVan project.

```bash
# Basic initialization
gitvan init

# Initialize with specific options
gitvan init --name "my-project" --template "react" --ai-provider "ollama"

# Initialize in existing directory
gitvan init --force --skip-git
```

**Options:**
- `--name, -n <name>` - Project name
- `--template, -t <template>` - Initial template to use
- `--ai-provider <provider>` - AI provider (ollama, openai, anthropic)
- `--force, -f` - Overwrite existing files
- `--skip-git` - Skip Git repository initialization
- `--dry-run` - Show what would be created without creating files

**Examples:**
```bash
# Initialize React project
gitvan init --name "my-react-app" --template "react"

# Initialize with OpenAI
gitvan init --ai-provider "openai" --template "node"

# Initialize in existing repo
gitvan init --skip-git --force
```

### `gitvan run`

Execute a job.

```bash
# Run job with default payload
gitvan run <job-id>

# Run job with custom payload
gitvan run <job-id> --payload '{"key": "value"}'

# Run job with file payload
gitvan run <job-id> --payload-file payload.json

# Run job with environment variables
gitvan run <job-id> --env NODE_ENV=production

# Run job with timeout
gitvan run <job-id> --timeout 300000

# Run job in dry-run mode
gitvan run <job-id> --dry-run
```

**Options:**
- `--payload, -p <json>` - Job payload as JSON string
- `--payload-file, -f <file>` - Job payload from file
- `--env, -e <key=value>` - Environment variables
- `--timeout, -t <ms>` - Job timeout in milliseconds
- `--dry-run` - Show what would be executed
- `--verbose, -v` - Verbose output
- `--quiet, -q` - Quiet output

**Examples:**
```bash
# Run backup job
gitvan run backup-job --payload '{"target": "production"}'

# Run deployment with environment
gitvan run deploy --env ENVIRONMENT=staging --env VERSION=1.2.3

# Run with timeout
gitvan run long-running-job --timeout 600000

# Dry run
gitvan run deploy --dry-run --verbose
```

### `gitvan list`

List available jobs, events, or templates.

```bash
# List all jobs
gitvan list jobs

# List jobs with filters
gitvan list jobs --tag "deployment" --category "automation"

# List events
gitvan list events

# List templates
gitvan list templates

# List with details
gitvan list jobs --detailed

# List with JSON output
gitvan list jobs --format json
```

**Options:**
- `--tag <tag>` - Filter by tag
- `--category <category>` - Filter by category
- `--detailed, -d` - Show detailed information
- `--format <format>` - Output format (table, json, yaml)
- `--filter <pattern>` - Filter by name pattern

**Examples:**
```bash
# List deployment jobs
gitvan list jobs --tag "deployment"

# List cron events
gitvan list events --category "cron"

# List with details
gitvan list jobs --detailed --format json
```

## Job Commands

### `gitvan job create`

Create a new job.

```bash
# Create job interactively
gitvan job create

# Create job from template
gitvan job create --template "node-job" --name "my-job"

# Create job with specific options
gitvan job create --name "deploy" --type "deployment" --cron "0 2 * * *"
```

**Options:**
- `--name, -n <name>` - Job name
- `--template, -t <template>` - Job template
- `--type <type>` - Job type
- `--cron <expression>` - Cron expression
- `--description <desc>` - Job description
- `--tags <tags>` - Comma-separated tags

**Examples:**
```bash
# Create deployment job
gitvan job create --name "deploy-prod" --type "deployment" --cron "0 2 * * *"

# Create from template
gitvan job create --template "node-job" --name "api-server"
```

### `gitvan job validate`

Validate job definitions.

```bash
# Validate specific job
gitvan job validate <job-id>

# Validate all jobs
gitvan job validate --all

# Validate with fix suggestions
gitvan job validate <job-id> --fix
```

**Options:**
- `--all, -a` - Validate all jobs
- `--fix` - Show fix suggestions
- `--strict` - Use strict validation
- `--format <format>` - Output format

**Examples:**
```bash
# Validate all jobs
gitvan job validate --all --format json

# Validate with fixes
gitvan job validate backup-job --fix
```

### `gitvan job test`

Test job execution.

```bash
# Test job with sample payload
gitvan job test <job-id>

# Test job with custom payload
gitvan job test <job-id> --payload '{"test": true}'

# Test job in isolation
gitvan job test <job-id> --isolated
```

**Options:**
- `--payload, -p <json>` - Test payload
- `--isolated` - Run in isolated environment
- `--timeout <ms>` - Test timeout
- `--verbose` - Verbose output

## Event Commands

### `gitvan event trigger`

Manually trigger an event.

```bash
# Trigger event with default payload
gitvan event trigger <event-id>

# Trigger event with custom payload
gitvan event trigger <event-id> --payload '{"key": "value"}'

# Trigger event with context
gitvan event trigger <event-id> --context '{"branch": "main"}'
```

**Options:**
- `--payload, -p <json>` - Event payload
- `--context, -c <json>` - Event context
- `--dry-run` - Simulate event trigger
- `--verbose` - Verbose output

**Examples:**
```bash
# Trigger deployment event
gitvan event trigger deployment-complete --payload '{"environment": "production"}'

# Simulate event
gitvan event trigger cron-daily --dry-run
```

### `gitvan event simulate`

Simulate event execution.

```bash
# Simulate event
gitvan event simulate <event-id>

# Simulate with context
gitvan event simulate <event-id> --context '{"branch": "feature/new"}'
```

**Options:**
- `--context, -c <json>` - Simulation context
- `--format <format>` - Output format

## Template Commands

### `gitvan template render`

Render a template.

```bash
# Render template with data
gitvan template render <template> --data '{"name": "World"}'

# Render template from file
gitvan template render <template> --data-file data.json

# Render to file
gitvan template render <template> --output output.txt
```

**Options:**
- `--data, -d <json>` - Template data
- `--data-file, -f <file>` - Data from file
- `--output, -o <file>` - Output file
- `--format <format>` - Output format

**Examples:**
```bash
# Render React component
gitvan template render react-component --data '{"name": "Button"}'

# Render to file
gitvan template render package-json --data-file config.json --output package.json
```

### `gitvan template plan`

Create execution plan for template.

```bash
# Create plan
gitvan template plan <template> --data '{"name": "World"}'

# Create plan with options
gitvan template plan <template> --data '{"name": "World"}' --dry-run
```

**Options:**
- `--data, -d <json>` - Template data
- `--dry-run` - Show plan without executing
- `--format <format>` - Output format

## Pack Commands

### `gitvan pack install`

Install a pack.

```bash
# Install pack
gitvan pack install <pack-name>

# Install specific version
gitvan pack install <pack-name>@1.2.3

# Install with configuration
gitvan pack install <pack-name> --config config.json

# Install from local path
gitvan pack install ./local-pack
```

**Options:**
- `--config, -c <file>` - Configuration file
- `--force` - Force installation
- `--dev` - Install as development dependency
- `--global` - Install globally

**Examples:**
```bash
# Install React pack
gitvan pack install react-scaffolder

# Install with config
gitvan pack install vue-pack --config vue-config.json
```

### `gitvan pack list`

List installed packs.

```bash
# List installed packs
gitvan pack list

# List with details
gitvan pack list --detailed

# List with updates
gitvan pack list --outdated
```

**Options:**
- `--detailed, -d` - Show detailed information
- `--outdated` - Show outdated packs
- `--format <format>` - Output format

### `gitvan pack update`

Update installed packs.

```bash
# Update all packs
gitvan pack update

# Update specific pack
gitvan pack update <pack-name>

# Update to specific version
gitvan pack update <pack-name>@1.2.3
```

**Options:**
- `--force` - Force update
- `--dry-run` - Show what would be updated

### `gitvan pack remove`

Remove installed pack.

```bash
# Remove pack
gitvan pack remove <pack-name>

# Remove with cleanup
gitvan pack remove <pack-name> --cleanup
```

**Options:**
- `--cleanup` - Clean up pack files
- `--force` - Force removal

### `gitvan pack publish`

Publish pack to registry.

```bash
# Publish pack
gitvan pack publish

# Publish with specific version
gitvan pack publish --version 1.2.3

# Publish to specific registry
gitvan pack publish --registry https://my-registry.com
```

**Options:**
- `--version <version>` - Version to publish
- `--registry <url>` - Registry URL
- `--access <access>` - Access level (public, private)
- `--dry-run` - Show what would be published

## Marketplace Commands

### `gitvan marketplace browse`

Browse available packs.

```bash
# Browse all packs
gitvan marketplace browse

# Browse by category
gitvan marketplace browse --category "frontend"

# Browse with search
gitvan marketplace browse --search "react"
```

**Options:**
- `--category <category>` - Filter by category
- `--search <query>` - Search query
- `--sort <field>` - Sort by field
- `--limit <number>` - Limit results

### `gitvan marketplace search`

Search for packs.

```bash
# Search packs
gitvan marketplace search <query>

# Search with filters
gitvan marketplace search "react" --category "frontend" --tag "typescript"
```

**Options:**
- `--category <category>` - Filter by category
- `--tag <tag>` - Filter by tag
- `--sort <field>` - Sort by field
- `--limit <number>` - Limit results

### `gitvan marketplace info`

Get pack information.

```bash
# Get pack info
gitvan marketplace info <pack-name>

# Get specific version info
gitvan marketplace info <pack-name>@1.2.3
```

**Options:**
- `--version <version>` - Specific version
- `--format <format>` - Output format

### `gitvan marketplace quickstart`

Quick start with a pack.

```bash
# Quick start with pack
gitvan marketplace quickstart <pack-name>

# Quick start with options
gitvan marketplace quickstart <pack-name> --name "my-project" --template "basic"
```

**Options:**
- `--name <name>` - Project name
- `--template <template>` - Template to use
- `--config <file>` - Configuration file

## AI Commands

### `gitvan chat generate`

Generate content with AI.

```bash
# Generate job
gitvan chat generate job "Create a backup job"

# Generate template
gitvan chat generate template "React component template"

# Generate with context
gitvan chat generate job "Deployment job" --context "Node.js application"
```

**Options:**
- `--context <text>` - Additional context
- `--model <model>` - AI model to use
- `--temperature <number>` - Response randomness
- `--max-tokens <number>` - Maximum tokens

### `gitvan chat explain`

Explain code or concepts.

```bash
# Explain job
gitvan chat explain <job-id>

# Explain template
gitvan chat explain <template-id>

# Explain with context
gitvan chat explain <job-id> --context "deployment workflow"
```

**Options:**
- `--context <text>` - Additional context
- `--format <format>` - Output format

### `gitvan chat draft`

Draft content with AI assistance.

```bash
# Draft job
gitvan chat draft job "Backup automation"

# Draft template
gitvan chat draft template "API endpoint template"

# Draft with requirements
gitvan chat draft job "Deployment" --requirements "Must support rollback"
```

**Options:**
- `--requirements <text>` - Requirements
- `--format <format>` - Output format

## Git Commands

### `gitvan git status`

Show Git status.

```bash
# Show status
gitvan git status

# Show detailed status
gitvan git status --detailed

# Show status with ignored files
gitvan git status --ignored
```

**Options:**
- `--detailed` - Detailed output
- `--ignored` - Show ignored files
- `--format <format>` - Output format

### `gitvan git worktree`

Manage worktrees.

```bash
# List worktrees
gitvan git worktree list

# Add worktree
gitvan git worktree add <name> <branch>

# Remove worktree
gitvan git worktree remove <name>

# Prune worktrees
gitvan git worktree prune
```

**Options:**
- `--force` - Force operations
- `--dry-run` - Show what would be done

## Utility Commands

### `gitvan config`

Manage configuration.

```bash
# Show configuration
gitvan config

# Set configuration
gitvan config set <key> <value>

# Get configuration
gitvan config get <key>

# Reset configuration
gitvan config reset
```

**Options:**
- `--global` - Global configuration
- `--local` - Local configuration
- `--format <format>` - Output format

### `gitvan daemon`

Manage daemon.

```bash
# Start daemon
gitvan daemon start

# Stop daemon
gitvan daemon stop

# Restart daemon
gitvan daemon restart

# Show daemon status
gitvan daemon status
```

**Options:**
- `--foreground` - Run in foreground
- `--config <file>` - Configuration file
- `--log-level <level>` - Log level

### `gitvan logs`

Show logs.

```bash
# Show recent logs
gitvan logs

# Show logs with filters
gitvan logs --level error --since "1 hour ago"

# Follow logs
gitvan logs --follow
```

**Options:**
- `--level <level>` - Log level filter
- `--since <time>` - Show logs since time
- `--until <time>` - Show logs until time
- `--follow, -f` - Follow log output
- `--tail <number>` - Number of lines to show

## Configuration Commands

### `gitvan env`

Manage environment variables.

```bash
# Show environment
gitvan env

# Set environment variable
gitvan env set <key> <value>

# Get environment variable
gitvan env get <key>

# Unset environment variable
gitvan env unset <key>
```

**Options:**
- `--global` - Global environment
- `--local` - Local environment

### `gitvan version`

Show version information.

```bash
# Show version
gitvan version

# Show detailed version
gitvan version --detailed

# Check for updates
gitvan version --check-updates
```

**Options:**
- `--detailed` - Detailed version info
- `--check-updates` - Check for updates
- `--format <format>` - Output format

## Global Options

These options are available for all commands:

- `--help, -h` - Show help
- `--version, -v` - Show version
- `--verbose` - Verbose output
- `--quiet, -q` - Quiet output
- `--config <file>` - Configuration file
- `--cwd <dir>` - Working directory
- `--no-color` - Disable colored output
- `--json` - JSON output format
- `--yaml` - YAML output format

## Examples

### Complete Workflow

```bash
# Initialize project
gitvan init --name "my-app" --template "react"

# Install additional pack
gitvan pack install vue-components

# Create custom job
gitvan job create --name "deploy" --type "deployment"

# Run job
gitvan run deploy --payload '{"environment": "production"}'

# Check status
gitvan git status

# View logs
gitvan logs --tail 50
```

### CI/CD Integration

```bash
# Install dependencies
gitvan pack install react-scaffolder

# Run tests
gitvan run test-suite --env NODE_ENV=test

# Build application
gitvan run build-app --env NODE_ENV=production

# Deploy
gitvan run deploy --payload '{"environment": "staging"}'
```

### Development Workflow

```bash
# Start daemon
gitvan daemon start

# Create feature branch
gitvan git worktree add feature-auth feature/user-auth

# Run development job
gitvan run dev-server --env NODE_ENV=development

# Check logs
gitvan logs --follow
```

This comprehensive command reference provides all the information needed to effectively use GitVan v2's CLI interface for automation workflows.
