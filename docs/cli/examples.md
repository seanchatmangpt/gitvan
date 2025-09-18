# GitVan CLI Examples

This guide demonstrates practical usage of GitVan CLI commands through real-world scenarios and workflows.

## Quick Start Workflows

### Setting Up Automated Development

```bash
# Start daemon for background automation
gitvan daemon start

# List available jobs
gitvan job list

# Check what cron jobs are configured
gitvan cron list

# Test event simulation
gitvan event simulate --files "src/api/**" --message "fix: API security update"
```

## Job Management Examples

### Running Jobs On-Demand

```bash
# Execute specific automation tasks
gitvan job run --name changelog
gitvan job run --name test-suite
gitvan job run --name deploy-staging

# Run with environment variables
gitvan job run --name deploy --env STAGE=production --env VERSION=1.2.0

# Dry-run to preview changes
gitvan job run --name database-migration --dry-run
```

### Listing and Discovering Jobs

```bash
# See all available jobs
gitvan job list
# Output:
# Available jobs:
#   changelog
#   deploy-staging
#   security-scan
#   test-suite
#   validate-pr

# Get job details with event listing
gitvan event list
# Shows which jobs respond to git events
```

## Cron Scheduling Examples

### Managing Scheduled Jobs

```bash
# View all scheduled jobs
gitvan cron list
# Output:
# Found 3 cron job(s):
#
# 📅 daily-backup
#    Cron: 0 2 * * *
#    File: jobs/backup.mjs
#    Desc: Daily repository backup at 2 AM
#
# 📅 weekly-report
#    Cron: 0 9 * * 1
#    File: jobs/reports/weekly.mjs
#    Desc: Generate weekly development report

# Test what would run right now
gitvan cron dry-run

# Test specific time
gitvan cron dry-run --at "2024-12-01T02:00:00Z"
# Shows: Jobs that would run: daily-backup (0 2 * * *)

# Start scheduler
gitvan cron start
```

### Common Cron Patterns

```bash
# Test various time scenarios
gitvan cron dry-run --at "2024-12-01T09:00:00Z"  # Monday 9 AM
gitvan cron dry-run --at "2024-12-01T14:30:00Z"  # Afternoon
gitvan cron dry-run --at "2024-12-01T23:59:00Z"  # End of day
```

## Event-Driven Automation

### Testing File-Based Events

```bash
# Simulate code changes
gitvan event simulate --files "src/api/auth.js,src/api/users.js"

# Simulate documentation changes
gitvan event simulate --files "README.md,docs/setup.md"

# Simulate configuration changes
gitvan event simulate --files "package.json,gitvan.config.mjs"

# Complex file pattern simulation
gitvan event simulate --files "src/components/**,tests/unit/**"
```

### Testing Git Events

```bash
# Simulate tag creation (release events)
gitvan event simulate --tags "v1.2.0,v1.2.1-beta"

# Simulate merge to main branch
gitvan event simulate --branch "main" --message "feat: new user dashboard"

# Simulate signed commits
gitvan event simulate --signed true --author "security@company.com"

# Combined event simulation
gitvan event simulate \
  --files "src/security/**" \
  --message "fix: critical security patch" \
  --signed true \
  --author "security-team@company.com"
```

### Advanced Event Testing

```bash
# Test specific event predicates
gitvan event test \
  --predicate '{"filesChanged": ["src/api/**"], "signed": true}' \
  --files "src/api/auth.js" \
  --signed true

# Test complex predicates
gitvan event test \
  --predicate '{"mergedTo": "main", "authorEmail": "*@company.com"}' \
  --branch "main" \
  --author "dev@company.com"
```

## Daemon Management Workflows

### Development Setup

```bash
# Start daemon for current project
gitvan daemon start

# Check if running properly
gitvan daemon status
# Output:
# GitVan Daemon Status:
#   Running: Yes
#   PID: 45123
#   Uptime: 15m 32s
#   Worktrees: 1 (current)
#   Active Jobs: 0
#   Completed Jobs: 8
#   Failed Jobs: 0

# Monitor all worktrees in organization
gitvan daemon start --worktrees all

# Restart with new configuration
gitvan daemon restart --worktrees all
```

### Production Deployment

```bash
# Stop daemon before deployment
gitvan daemon stop

# Deploy new version
git pull origin main
pnpm install

# Restart daemon
gitvan daemon start --worktrees all

# Verify everything is working
gitvan daemon status
gitvan cron list
```

## Audit and Compliance

### Building Audit Reports

```bash
# Generate comprehensive audit pack
gitvan audit build

# Custom audit report location
gitvan audit build --out reports/compliance-$(date +%Y%m).json

# List recent execution receipts
gitvan audit list
# Output:
# Found 25 receipt(s):
#
# 📋 job-20241201-143022-abc123
#    Status: OK
#    Action: changelog
#    Time: 2024-12-01T14:30:22.456Z
#    Commit: a1b2c3d4

# Show detailed receipt information
gitvan audit show --id job-20241201-143022-abc123

# Verify specific receipt integrity
gitvan audit verify --id job-20241201-143022-abc123
# Output:
# Receipt found:
#   ID: job-20241201-143022-abc123
#   Status: OK
#   Action: changelog
#   Timestamp: 2024-12-01T14:30:22.456Z
#   Commit: a1b2c3d4e5f6
# ✅ Receipt verification passed
```

### Compliance Workflows

```bash
# Daily audit checks
gitvan audit list --limit 100 | grep ERROR
gitvan audit build --out "compliance/audit-$(date +%Y%m%d).json"

# Verify critical operations
gitvan audit verify --id $(gitvan audit list | grep "deploy-production" | head -1 | cut -d' ' -f2)
```

## AI-Powered Job Generation

### Creating Jobs with Chat Interface

```bash
# Generate job specifications
gitvan chat draft --prompt "Create a job that generates changelogs from Git commits since the last tag"

# Generate complete job files
gitvan chat generate --prompt "Build a security scanner that checks for hardcoded secrets in source code"

# Generate event-driven jobs
gitvan chat generate \
  --prompt "Create an event job that validates PR titles match conventional commit format" \
  --kind event

# Custom file paths
gitvan chat generate \
  --prompt "Build a deployment job for Kubernetes" \
  --path "jobs/deploy/k8s-staging.mjs"
```

### AI Model Management

```bash
# Check AI availability
gitvan llm models
# Output:
# Provider: anthropic
# Model: qwen3-coder:30b
# Available: Yes

# Direct AI interaction
gitvan llm call "What are the security implications of the changes in the last commit?"

# Use specific models
gitvan llm call "Generate a Git hook script for pre-commit linting" --model qwen3-coder:30b

# Generate documentation
gitvan llm call "Create documentation for this job file: $(cat jobs/deploy.mjs)"
```

## Complex Workflow Examples

### Release Automation Workflow

```bash
# 1. Generate release notes
gitvan job run --name changelog --env VERSION=1.2.0

# 2. Run full test suite
gitvan job run --name test-suite

# 3. Build and package
gitvan job run --name build-release --env VERSION=1.2.0

# 4. Deploy to staging
gitvan job run --name deploy-staging

# 5. Verify deployment
gitvan event simulate --tags "v1.2.0" --branch "main"
```

### Security Monitoring Setup

```bash
# Start daemon for monitoring
gitvan daemon start

# Test security event detection
gitvan event simulate \
  --files "src/auth/**,src/security/**" \
  --message "fix: security vulnerability in authentication"

# Generate security scanning job
gitvan chat generate \
  --prompt "Create a job that scans for potential security vulnerabilities in JavaScript code"

# Schedule daily security scans
gitvan cron list | grep security
gitvan cron start
```

### Team Development Workflow

```bash
# Morning standup automation
gitvan job run --name daily-report

# Pre-push validation
gitvan event test \
  --predicate '{"filesChanged": ["src/**"], "mergedTo": "main"}' \
  --files "src/components/Dashboard.tsx" \
  --branch "main"

# Code review automation
gitvan chat generate \
  --prompt "Create a job that analyzes PR diffs and suggests improvements"

# End-of-day cleanup
gitvan job run --name cleanup-branches
gitvan audit build --out "reports/daily-$(date +%Y%m%d).json"
```

## Troubleshooting Examples

### Debugging Job Execution

```bash
# Check daemon status
gitvan daemon status

# List recent receipts to see failures
gitvan audit list | grep ERROR

# Verify specific failed receipt
gitvan audit verify --id job-20241201-151022-xyz789

# Test event predicates
gitvan event simulate --files "src/problematic-file.js"

# Dry-run jobs before execution
gitvan job run --name problematic-job --dry-run
```

### Configuration Validation

```bash
# Test AI configuration
gitvan llm models

# Validate cron schedules
gitvan cron dry-run

# Check event job definitions
gitvan event list

# Verify job discovery
gitvan job list
```

## Integration Examples

### CI/CD Integration

```bash
# In CI pipeline
gitvan daemon start
gitvan job run --name lint-and-test
gitvan job run --name security-scan
gitvan audit build --out artifacts/audit-$CI_BUILD_ID.json
gitvan daemon stop
```

### Git Hooks Integration

```bash
# Pre-commit hook
gitvan event simulate --files "$(git diff --cached --name-only)"

# Post-merge hook
gitvan event simulate --branch "$(git branch --show-current)" --message "$(git log -1 --pretty=%B)"

# Pre-push hook
gitvan job run --name validate-commits --dry-run
```

These examples demonstrate the 20% of commands that handle 80% of GitVan use cases, focusing on practical workflows that teams encounter daily.