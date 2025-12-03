# Installation Guide - GitVan Git Lifecycle Hooks

This guide walks you through installing and configuring GitVan git lifecycle hooks in your repository.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [Hook Configuration](#hook-configuration)
- [Environment Setup](#environment-setup)
- [Verification](#verification)
- [Team Setup](#team-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js:** 18.x or higher
- **Git:** 2.30 or higher
- **Operating System:** macOS, Linux, or Windows with WSL
- **Memory:** 512MB minimum, 1GB recommended

### Install GitVan

**Option 1: Global Installation (Recommended)**
```bash
npm install -g gitvan

# Verify installation
gitvan --version
```

**Option 2: Project-Local Installation**
```bash
npm install --save-dev gitvan

# Use via npx
npx gitvan --version
```

**Option 3: Using pnpm or yarn**
```bash
# pnpm
pnpm add -g gitvan

# yarn
yarn global add gitvan
```

## Installation Methods

### Method 1: Interactive Setup (Easiest)

```bash
# Navigate to your repository
cd /path/to/your/repo

# Run interactive setup
gitvan hooks init

# Follow the prompts:
# 1. Select hooks to install
# 2. Configure settings
# 3. Enable notifications
# 4. Set up team configuration
```

The interactive wizard will:
- ✅ Create `.gitvan/hooks/` directory
- ✅ Copy selected hook templates
- ✅ Configure git settings
- ✅ Set up notification channels
- ✅ Initialize the RDF knowledge graph

### Method 2: Manual Installation

**Step 1: Initialize GitVan**
```bash
cd /path/to/your/repo

# Create directory structure
mkdir -p .gitvan/hooks
mkdir -p .gitvan/reports
mkdir -p .gitvan/data

# Initialize RDF store
gitvan init
```

**Step 2: Copy Hook Templates**
```bash
# Copy all examples
cp examples/git-lifecycle-hooks/*.ttl .gitvan/hooks/

# Or copy specific hooks
cp examples/git-lifecycle-hooks/enforce-branch-naming.ttl .gitvan/hooks/
cp examples/git-lifecycle-hooks/deploy-on-version-tag.ttl .gitvan/hooks/
cp examples/git-lifecycle-hooks/review-large-commits.ttl .gitvan/hooks/
```

**Step 3: Configure Hooks**

See [Hook Configuration](#hook-configuration) section below.

**Step 4: Enable Hooks**
```bash
# Enable specific hooks
gitvan hooks enable enforce-branch-naming
gitvan hooks enable deploy-on-version-tag
gitvan hooks enable review-large-commits

# Or enable all hooks
gitvan hooks enable --all

# Verify
gitvan hooks list --enabled
```

### Method 3: Using Configuration File

Create `.gitvan/config.yml`:

```yaml
# GitVan Configuration
version: "3.2.0"

# Hooks to enable
hooks:
  enabled:
    - enforce-branch-naming
    - deploy-on-version-tag
    - review-large-commits
    - track-author-statistics
    - alert-on-merge-conflicts
    - ci-integration

# Global settings
settings:
  # Branch naming
  branchPatterns:
    - "feature/*"
    - "bugfix/*"
    - "hotfix/*"
    - "release/*"
  protectedBranches:
    - "main"
    - "master"
    - "develop"

  # Commit size
  commitMaxLines: 1000
  commitWarningLines: 500

  # Deployment
  deploy:
    production: "https://api.deploy.com/prod"
    staging: "https://api.deploy.com/staging"
    token: "${DEPLOY_TOKEN}"  # Use environment variable

  # CI Integration
  ci:
    webhook: "https://ci.yourcompany.com/webhook"
    token: "${CI_TOKEN}"
    provider: "github-actions"

  # Notifications
  notifications:
    slack:
      webhook: "${SLACK_WEBHOOK}"
      channel: "#dev-team"
    email:
      smtp: "smtp.gmail.com:587"
      from: "gitvan@yourcompany.com"
      recipients:
        - "team@yourcompany.com"

# Team configuration
team:
  members:
    - name: "Alice"
      email: "alice@company.com"
      level: "senior"
      expertise: ["backend", "api"]
    - name: "Bob"
      email: "bob@company.com"
      level: "junior"
      expertise: ["frontend"]
    - name: "Charlie"
      email: "charlie@company.com"
      level: "mid-level"
      expertise: ["devops", "ci-cd"]
```

**Apply Configuration:**
```bash
gitvan config apply .gitvan/config.yml
```

## Hook Configuration

### Per-Hook Configuration

Each hook can be configured via git config or environment variables:

#### 1. Enforce Branch Naming

```bash
# Set allowed branch patterns
git config gitvan.branchPatterns "feature/*,bugfix/*,hotfix/*,release/*"

# Set protected branches
git config gitvan.protectedBranches "main,master,develop"

# Disable for specific branches (comma-separated)
git config gitvan.enforceBranch.ignore "experimental,playground"
```

**Environment Variables:**
```bash
export GITVAN_BRANCH_PATTERNS="feature/*,bugfix/*,hotfix/*,release/*"
export GITVAN_PROTECTED_BRANCHES="main,master,develop"
```

#### 2. Deploy on Version Tag

```bash
# Deployment URLs
git config gitvan.deploy.production "https://api.deploy.com/prod"
git config gitvan.deploy.staging "https://api.deploy.com/staging"

# Deployment token (sensitive)
git config gitvan.deploy.token "$(cat ~/.deploy-token)"

# Require approval for production
git config gitvan.deploy.requireApproval true
```

**Environment Variables:**
```bash
export GITVAN_DEPLOY_PRODUCTION_URL="https://api.deploy.com/prod"
export GITVAN_DEPLOY_STAGING_URL="https://api.deploy.com/staging"
export GITVAN_DEPLOY_TOKEN="your-secure-token"
```

#### 3. Review Large Commits

```bash
# Size thresholds
git config gitvan.commit.maxLines 1000
git config gitvan.commit.warningLines 500

# Author experience levels
git config gitvan.author.junior "alice@co.com,bob@co.com"
git config gitvan.author.senior "charlie@co.com,diana@co.com"

# Auto-assign reviewers
git config gitvan.review.autoAssign true
```

#### 4. Track Author Statistics

```bash
# Enable daily rollup
git config gitvan.metrics.daily true

# Enable weekly reports
git config gitvan.metrics.weekly true

# Report recipients
git config gitvan.metrics.recipients "team@company.com"
```

#### 5. Alert on Merge Conflicts

```bash
# Notification channels
git config gitvan.notify.slack "#dev-team"
git config gitvan.notify.email "team@company.com"

# Conflict detection sensitivity
git config gitvan.conflict.checkBeforeMerge true
git config gitvan.conflict.autoResolve false
```

#### 6. CI Integration

```bash
# CI provider
git config gitvan.ci.provider "github-actions"  # or gitlab-ci, jenkins, circle-ci

# Webhook for CI events
git config gitvan.ci.webhook "https://ci.yourcompany.com/webhook"

# CI token
git config gitvan.ci.token "$(cat ~/.ci-token)"

# Auto-retry failed builds
git config gitvan.ci.autoRetry true
git config gitvan.ci.maxRetries 3
```

### Global vs Local Configuration

**Local (repository-specific):**
```bash
git config gitvan.setting value
```

**Global (all repositories):**
```bash
git config --global gitvan.setting value
```

**System-wide (all users):**
```bash
sudo git config --system gitvan.setting value
```

## Environment Setup

### 1. Notification Channels

#### Slack Integration

```bash
# Create Slack webhook: https://api.slack.com/messaging/webhooks
# Then configure:
git config gitvan.slack.webhook "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
git config gitvan.slack.channel "#dev-team"
git config gitvan.slack.username "GitVan Bot"
```

#### Email Integration

```bash
# SMTP settings
git config gitvan.email.smtp "smtp.gmail.com:587"
git config gitvan.email.from "gitvan@yourcompany.com"
git config gitvan.email.username "your-email@gmail.com"
git config gitvan.email.password "your-app-password"

# Recipients
git config gitvan.email.recipients "team@company.com,alerts@company.com"
```

#### Webhook Integration

```bash
# Custom webhook for general notifications
git config gitvan.webhook.url "https://api.yourcompany.com/gitvan/webhook"
git config gitvan.webhook.secret "your-webhook-secret"
git config gitvan.webhook.headers "Authorization: Bearer ${TOKEN}"
```

### 2. CI/CD Integration

#### GitHub Actions

```yaml
# .github/workflows/gitvan.yml
name: GitVan CI Integration

on:
  push:
  pull_request:
  workflow_run:
    workflows: ["CI"]
    types: [completed]

jobs:
  gitvan-notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup GitVan
        run: |
          npm install -g gitvan
          gitvan init

      - name: Notify GitVan
        env:
          GITVAN_CI_WEBHOOK: ${{ secrets.GITVAN_CI_WEBHOOK }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gitvan ci notify \
            --build-id ${{ github.run_id }} \
            --status ${{ job.status }} \
            --commit ${{ github.sha }}
```

#### GitLab CI

```yaml
# .gitlab-ci.yml
gitvan-notify:
  stage: notify
  script:
    - npm install -g gitvan
    - gitvan init
    - |
      gitvan ci notify \
        --build-id $CI_PIPELINE_ID \
        --status $CI_JOB_STATUS \
        --commit $CI_COMMIT_SHA
  only:
    - main
    - develop
  when: always
```

### 3. Team Configuration

Create `.gitvan/team.yml`:

```yaml
# Team Members
members:
  - name: "Alice Smith"
    email: "alice@company.com"
    github: "alice-dev"
    level: "senior"
    role: "tech-lead"
    expertise:
      - "backend"
      - "api-design"
      - "databases"
    joinedAt: "2022-01-15"

  - name: "Bob Johnson"
    email: "bob@company.com"
    github: "bob-codes"
    level: "junior"
    role: "developer"
    expertise:
      - "frontend"
      - "react"
    joinedAt: "2024-06-01"
    mentor: "alice@company.com"

  - name: "Charlie Brown"
    email: "charlie@company.com"
    github: "charlie-ops"
    level: "mid-level"
    role: "devops"
    expertise:
      - "ci-cd"
      - "docker"
      - "kubernetes"
    joinedAt: "2023-03-10"

# Review Assignment Rules
review:
  minReviewers: 2
  requireSeniorForJunior: true
  autoAssignByExpertise: true

# Notification Preferences
notifications:
  alice@company.com:
    slack: true
    email: false
    threshold: "high"
  bob@company.com:
    slack: true
    email: true
    threshold: "medium"
```

**Load Team Configuration:**
```bash
gitvan team import .gitvan/team.yml
```

## Verification

### Test Hook Installation

```bash
# List all hooks
gitvan hooks list

# Check enabled hooks
gitvan hooks list --enabled

# Verify hook configuration
gitvan hooks info enforce-branch-naming

# Test hook execution (dry-run)
gitvan hooks test enforce-branch-naming --dry-run

# Run hook manually
gitvan hooks run enforce-branch-naming
```

### Validate Configuration

```bash
# Check all configuration
gitvan config check

# Validate specific hook
gitvan hooks validate enforce-branch-naming

# Test notification channels
gitvan notify test --channel slack
gitvan notify test --channel email
```

### Integration Tests

```bash
# Test branch naming
git checkout -b invalid-branch-name
git commit --allow-empty -m "test"
# Should be blocked by hook

# Test valid branch
git checkout -b feature/test-hook
git commit --allow-empty -m "test"
# Should succeed

# Test large commit detection
# (create commit with >1000 lines)

# Test CI integration
# (trigger CI pipeline and check notification)
```

## Team Setup

### 1. Share Configuration

**Commit `.gitvan/` directory:**
```bash
# Add GitVan files to repository
git add .gitvan/
git commit -m "Add GitVan hooks configuration"
git push origin main
```

**Create `.gitvan/.gitignore`:**
```
# Ignore sensitive data
config-secrets.yml
*.token
*.key

# Ignore local overrides
config.local.yml

# Ignore generated reports (optional)
reports/
data/*.db
```

### 2. Team Onboarding

Create `.gitvan/ONBOARDING.md`:

```markdown
# GitVan Hooks - Team Setup

Welcome! This repository uses GitVan for automated git workflows.

## Quick Setup

1. Install GitVan:
   ```bash
   npm install -g gitvan
   ```

2. Initialize hooks:
   ```bash
   gitvan hooks init
   ```

3. Configure your profile:
   ```bash
   git config gitvan.author.name "Your Name"
   git config gitvan.author.email "you@company.com"
   git config gitvan.author.level "junior|mid-level|senior"
   ```

4. Test your setup:
   ```bash
   gitvan hooks test --all
   ```

## Active Hooks

- **Branch Naming:** Enforces feature/*, bugfix/*, etc.
- **Large Commits:** Alerts on commits >1000 lines
- **Merge Conflicts:** Notifies on conflicts
- **CI Integration:** Correlates failures with commits

## Need Help?

- Documentation: `.gitvan/README.md`
- Slack: #gitvan-support
- Contact: team-lead@company.com
```

### 3. CI/CD Setup

Ensure CI has access to GitVan:

```yaml
# .github/workflows/ci.yml
env:
  GITVAN_CI_WEBHOOK: ${{ secrets.GITVAN_CI_WEBHOOK }}
  GITVAN_SLACK_WEBHOOK: ${{ secrets.GITVAN_SLACK_WEBHOOK }}
  DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - name: Install GitVan
        run: npm install -g gitvan

      - name: Configure GitVan
        run: |
          gitvan config apply .gitvan/config.yml
          # Secrets loaded from environment
```

## Troubleshooting

### Common Issues

#### Hook Not Running

**Problem:** Hook doesn't trigger on git events

**Solution:**
```bash
# Check if hook is enabled
gitvan hooks list --enabled

# Enable hook
gitvan hooks enable my-hook

# Check git hooks integration
ls -la .git/hooks/
cat .git/hooks/post-commit

# Reinstall git hooks
gitvan hooks install --force
```

#### Configuration Not Loaded

**Problem:** Settings not applied

**Solution:**
```bash
# Check configuration
git config --list | grep gitvan

# Reload configuration
gitvan config reload

# Apply from file
gitvan config apply .gitvan/config.yml

# Check for typos in config keys
gitvan config validate
```

#### Permission Errors

**Problem:** Cannot write reports or update RDF store

**Solution:**
```bash
# Fix directory permissions
chmod -R u+w .gitvan/

# Create missing directories
mkdir -p .gitvan/{hooks,reports,data}

# Check disk space
df -h .gitvan/
```

#### Notification Failures

**Problem:** Slack/email notifications not working

**Solution:**
```bash
# Test connection
gitvan notify test --channel slack
gitvan notify test --channel email

# Check credentials
git config gitvan.slack.webhook
git config gitvan.email.smtp

# View notification logs
gitvan logs --filter notifications

# Enable debug mode
gitvan notify test --channel slack --debug
```

#### SPARQL Query Errors

**Problem:** Hook fails with SPARQL errors

**Solution:**
```bash
# Validate hook syntax
gitvan hooks validate my-hook

# Test SPARQL query
gitvan sparql query "SELECT * WHERE { ?s ?p ?o } LIMIT 10"

# Rebuild RDF index
gitvan rdf rebuild

# Check for corrupted data
gitvan rdf verify
```

### Debug Mode

Enable verbose logging:

```bash
# Environment variable
export GITVAN_DEBUG=1

# Or git config
git config gitvan.debug true

# Run hook with debugging
gitvan hooks run my-hook --debug --verbose

# View debug logs
gitvan logs --level debug
```

### Getting Help

1. **Check Documentation:**
   - README: `.gitvan/README.md`
   - Examples: `examples/git-lifecycle-hooks/`
   - API Docs: https://gitvan.dev/docs/api

2. **Community Support:**
   - GitHub Issues: https://github.com/gitvan/gitvan/issues
   - Discord: https://discord.gg/gitvan
   - Stack Overflow: tag `gitvan`

3. **Professional Support:**
   - Email: support@gitvan.dev
   - Enterprise: enterprise@gitvan.dev

## Next Steps

After installation:

1. ✅ Read the [main README](./README.md) for hook details
2. ✅ Review [SPARQL patterns](./SPARQL-PATTERNS.md) for custom queries
3. ✅ Customize hooks for your workflow
4. ✅ Set up team notifications
5. ✅ Monitor hook execution and metrics

---

**Questions?** Open an issue or reach out on Discord!
