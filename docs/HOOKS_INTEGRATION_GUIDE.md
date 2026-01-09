# GitVan Hooks Integration Guide

**Complete guide to setting up and using the Husky + @unrdf/hooks + Bree integration system**

Version: 1.0.0
Last Updated: January 9, 2026
GitVan Version: 3.0.0+

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [System Components](#system-components)
5. [Installation & Setup](#installation--setup)
6. [Configuration](#configuration)
7. [Creating Your First Hook](#creating-your-first-hook)
8. [Advanced Usage](#advanced-usage)
9. [Testing & Debugging](#testing--debugging)
10. [Troubleshooting](#troubleshooting)
11. [Migration Guide](#migration-guide)
12. [Best Practices](#best-practices)

---

## Overview

GitVan's hooks integration system combines three powerful technologies to provide Git-native workflow automation:

- **Husky**: Git hooks manager that intercepts Git events (pre-commit, post-merge, etc.)
- **@unrdf/hooks**: RDF-based reactive hook system for knowledge graph triggers
- **Bree**: Background job scheduler for async task execution

### What This Integration Does

1. **Captures Git Events**: Husky intercepts Git operations (commit, push, merge)
2. **Stores as RDF**: Events are converted to semantic triples in the knowledge graph
3. **Evaluates Hooks**: @unrdf/hooks evaluates conditions against the knowledge graph
4. **Executes Jobs**: Triggered hooks run as Bree background jobs
5. **Audit Trail**: All operations are logged to Git notes for full traceability

### Benefits

✅ **Git-Native**: Everything stored in Git (no external databases)
✅ **Declarative**: Define hooks in Turtle (RDF) format
✅ **Reactive**: Hooks trigger automatically on graph state changes
✅ **Scalable**: Background processing via Bree job queue
✅ **Traceable**: Complete audit trail in Git notes
✅ **Queryable**: SPARQL queries across hook history

---

## Prerequisites

### Required

- **Node.js**: Version 18 or higher
- **Git**: Version 2.30 or higher
- **GitVan**: Version 3.0.0 or higher

### Knowledge Requirements

**Basic**:
- Git fundamentals (commit, push, merge)
- JavaScript/Node.js basics
- Command-line interface (CLI) usage

**Advanced** (optional):
- RDF/Turtle syntax (for custom hooks)
- SPARQL queries (for complex hook conditions)
- Background job patterns

### System Requirements

- **Disk Space**: 100MB minimum for GitVan + dependencies
- **Memory**: 512MB RAM minimum, 1GB recommended
- **OS**: Linux, macOS, or Windows with WSL2

---

## Quick Start

### 5-Minute Setup

```bash
# 1. Install GitVan globally
npm install -g gitvan

# 2. Initialize in your Git repository
cd /path/to/your/repo
gitvan init

# 3. Set up hooks integration
gitvan hooks setup

# 4. Verify installation
gitvan hooks status

# 5. Test with a pre-commit hook
echo "console.log('Hook working!')" > test.js
git add test.js
git commit -m "test: verify hooks"
# Should trigger pre-commit hook
```

### Verify Installation

```bash
# Check hook registration
gitvan hooks list

# View hook stats
gitvan hooks stats

# Test hook evaluation
gitvan hooks evaluate --dry-run
```

---

## System Components

### 1. Husky Hook Bridge

**Location**: `/src/integrations/husky-hook-bridge.mjs`

**Purpose**: Bridges Husky Git hooks to @unrdf/hooks system

**Key Features**:
- Captures Git events (10 hook types)
- Stores events as RDF triples
- Evaluates registered hooks
- Triggers background jobs
- Logs audit trail

**Configuration**:
```javascript
{
  cwd: process.cwd(),
  autoEvaluate: true,
  enableAudit: true,
  eventCapture: { /* options */ },
  orchestrator: { /* options */ }
}
```

### 2. UnRDF Hooks Bridge

**Location**: `/src/integrations/unrdf-hooks-bridge.mjs`

**Purpose**: Bridges @unrdf/hooks to Bree background job scheduler

**Key Features**:
- Registers hooks as Bree jobs
- Schedules job execution (immediate, cron, interval)
- Tracks execution history
- Handles retries and timeouts
- Provides execution statistics

**Configuration**:
```javascript
{
  cwd: process.cwd(),
  jobsDir: "jobs",
  timeout: 30000,
  maxRetries: 3,
  enableAudit: true
}
```

### 3. Bree Scheduler

**Location**: `/src/jobs/bree-scheduler.mjs`

**Purpose**: Background job scheduling and execution

**Key Features**:
- Job lifecycle management (add, remove, run, stop)
- Cron scheduling support
- Interval-based execution
- Worker pool management
- Job timeout handling

**Configuration**:
```javascript
{
  cwd: process.cwd(),
  jobsDir: "jobs",
  timeout: 0,  // 0 = no timeout
  interval: 1000,
  closeWorkerAfterMs: 5000,
  removeCompleted: true
}
```

---

## Installation & Setup

### Step 1: Install GitVan

```bash
# Global installation (recommended)
npm install -g gitvan

# OR local installation
npm install --save-dev gitvan
```

### Step 2: Initialize Repository

```bash
# Navigate to your Git repository
cd /path/to/your/repo

# Initialize GitVan
gitvan init

# This creates:
# - .gitvan/ directory
# - gitvan.config.js
# - hooks/ directory for hook definitions
# - jobs/ directory for job files
```

### Step 3: Set Up Hooks Integration

```bash
# Set up the complete hooks system
gitvan hooks setup

# This will:
# ✓ Initialize Husky
# ✓ Configure @unrdf/hooks
# ✓ Set up Bree scheduler
# ✓ Install Git hooks
# ✓ Create example hooks
```

### Step 4: Verify Setup

```bash
# Check system status
gitvan hooks status

# Expected output:
# ✓ Husky Hook Bridge: Initialized
# ✓ UnRDF Hooks Bridge: Initialized
# ✓ Bree Scheduler: Running
# ✓ Registered Hooks: 5
# ✓ Active Jobs: 2
```

---

## Configuration

### Main Configuration File

**File**: `gitvan.config.js`

```javascript
export default defineGitVanConfig({
  // Hook system configuration
  hooks: {
    // Directory for hook definitions (.ttl files)
    dir: "hooks",

    // Auto-evaluate hooks after Git events
    autoEvaluate: true,

    // Enable audit logging
    enableAudit: true,

    // Hook timeout (ms)
    timeout: 300000,  // 5 minutes

    // Bree scheduler options
    bree: {
      jobsDir: "jobs",
      timeout: 30000,
      maxRetries: 3,
      closeWorkerAfterMs: 5000
    }
  },

  // Jobs directory
  jobs: {
    dir: "jobs"
  },

  // Audit trail configuration
  receipts: {
    ref: "refs/notes/gitvan/audit"
  },

  // RDF graph configuration
  graph: {
    dir: "graph",
    autoLoad: true,
    uriRoots: {
      "graph://": "graph/",
      "hooks://": "hooks/"
    }
  }
});
```

### Environment Variables

```bash
# GitVan home directory
export GITVAN_HOME="$HOME/.gitvan"

# Repository directory
export GITVAN_REPO="/path/to/repo"

# Enable debug logging
export DEBUG="gitvan:hooks:*"

# Bree scheduler options
export BREE_TIMEOUT=30000
export BREE_MAX_RETRIES=3
```

---

## Creating Your First Hook

### Example 1: Pre-Commit Code Quality Hook

**File**: `hooks/pre-commit-quality.ttl`

```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

:PreCommitQuality a hook:Hook ;
  rdfs:label "Pre-commit code quality check" ;
  rdfs:comment "Run linting and tests before commit" ;

  # Trigger on pre-commit Git event
  hook:on [
    a git:PreCommitEvent ;
    hook:pathChanged "**/*.{js,ts,mjs}"
  ] ;

  # Job configuration
  hook:job [
    hook:name "quality-check" ;
    hook:schedule "immediate" ;
    hook:timeout 60000  # 60 seconds
  ] ;

  # Predicates (conditions)
  hook:when [
    # Only if staged files exist
    hook:hasStagedFiles true ;

    # Skip for merge commits
    hook:notMergeCommit true
  ] .
```

**File**: `jobs/quality-check.mjs`

```javascript
// Background job for quality checks
import { execSync } from 'node:child_process';

export default async function qualityCheck() {
  console.log('🔍 Running quality checks...');

  try {
    // Run ESLint
    execSync('npx eslint src/', { stdio: 'inherit' });
    console.log('✅ Linting passed');

    // Run tests
    execSync('npm test', { stdio: 'inherit' });
    console.log('✅ Tests passed');

    return { success: true };
  } catch (error) {
    console.error('❌ Quality checks failed');
    throw error;
  }
}
```

### Example 2: Post-Merge Dependency Update

**File**: `hooks/post-merge-deps.ttl`

```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:PostMergeDeps a hook:Hook ;
  rdfs:label "Post-merge dependency update" ;

  # Trigger on post-merge Git event
  hook:on [
    a git:PostMergeEvent ;
    hook:pathChanged "package.json"
  ] ;

  # Job configuration
  hook:job [
    hook:name "update-deps" ;
    hook:schedule "immediate"
  ] .
```

**File**: `jobs/update-deps.mjs`

```javascript
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export default async function updateDeps() {
  console.log('📦 Updating dependencies...');

  // Detect package manager
  const hasYarn = existsSync('yarn.lock');
  const hasPnpm = existsSync('pnpm-lock.yaml');

  const cmd = hasYarn ? 'yarn install' :
              hasPnpm ? 'pnpm install' :
              'npm install';

  execSync(cmd, { stdio: 'inherit' });
  console.log('✅ Dependencies updated');

  return { success: true };
}
```

### Register and Test

```bash
# Register the hooks
gitvan hooks register hooks/pre-commit-quality.ttl
gitvan hooks register hooks/post-merge-deps.ttl

# List registered hooks
gitvan hooks list

# Test pre-commit hook
echo "test" > test.js
git add test.js
git commit -m "test: hooks"
# Hook should trigger automatically

# Test hook evaluation (dry-run)
gitvan hooks evaluate --dry-run --verbose
```

---

## Advanced Usage

### Conditional Hook Execution

**File**: `hooks/conditional-hook.ttl`

```turtle
@prefix : <http://example.com/hooks#> .
@prefix hook: <http://example.com/hook#> .

:ConditionalHook a hook:Hook ;
  rdfs:label "Conditional execution example" ;

  hook:on [
    a git:PreCommitEvent
  ] ;

  # Complex conditions
  hook:when [
    # All conditions must be true
    hook:all [
      # Changed files in src/ directory
      hook:pathChanged "src/**" ;

      # Not a merge commit
      hook:notMergeCommit true ;

      # Author is not a bot
      hook:authorEmail "^(?!.*bot@).*" ;

      # Commit message doesn't contain [skip]
      hook:messageNotMatch "\\[skip\\]"
    ]
  ] ;

  hook:job [
    hook:name "conditional-job" ;
    hook:schedule "immediate"
  ] .
```

### Scheduled Background Jobs

**File**: `hooks/scheduled-cleanup.ttl`

```turtle
@prefix : <http://example.com/hooks#> .
@prefix hook: <http://example.com/hook#> .

:ScheduledCleanup a hook:Hook ;
  rdfs:label "Daily cleanup job" ;

  # No Git event trigger - cron-based
  hook:job [
    hook:name "cleanup" ;
    hook:schedule "cron" ;
    hook:cron "0 2 * * *"  # Daily at 2 AM
  ] .
```

**File**: `jobs/cleanup.mjs`

```javascript
import { execSync } from 'node:child_process';

export default async function cleanup() {
  console.log('🧹 Running daily cleanup...');

  // Clean build artifacts
  execSync('rm -rf dist/ .cache/', { stdio: 'inherit' });

  // Prune Git worktrees
  execSync('git worktree prune', { stdio: 'inherit' });

  // Clean npm cache
  execSync('npm cache clean --force', { stdio: 'inherit' });

  console.log('✅ Cleanup complete');
  return { success: true };
}
```

### SPARQL-Based Hook Conditions

**File**: `hooks/sparql-hook.ttl`

```turtle
@prefix : <http://example.com/hooks#> .
@prefix hook: <http://example.com/hook#> .

:SPARQLHook a hook:Hook ;
  rdfs:label "SPARQL-based condition" ;

  hook:on [
    a git:PostCommitEvent
  ] ;

  # SPARQL query as condition
  hook:when [
    hook:sparql """
      PREFIX git: <http://example.com/git#>
      PREFIX prov: <http://www.w3.org/ns/prov#>

      ASK {
        ?commit a git:Commit ;
                git:hasChange ?change ;
                prov:wasGeneratedBy ?author .

        ?change git:path ?path .
        FILTER(CONTAINS(?path, "src/"))

        ?author prov:actedOnBehalfOf ?team .
        ?team git:name "core-team" .
      }
    """
  ] ;

  hook:job [
    hook:name "sparql-job" ;
    hook:schedule "immediate"
  ] .
```

---

## Testing & Debugging

### Enable Debug Logging

```bash
# Enable all GitVan debug logs
export DEBUG="gitvan:*"

# Enable hooks-specific logs
export DEBUG="gitvan:hooks:*,gitvan:integrations:*"

# Enable Bree scheduler logs
export DEBUG="bree:*"

# Run with debug output
gitvan hooks evaluate --verbose
```

### Dry-Run Mode

```bash
# Evaluate hooks without executing jobs
gitvan hooks evaluate --dry-run

# Test specific hook
gitvan hooks test pre-commit-quality --dry-run

# Simulate Git event
gitvan hooks simulate pre-commit \
  --files="src/index.js,src/utils.js" \
  --dry-run
```

### Inspect Hook State

```bash
# View registered hooks
gitvan hooks list --verbose

# View hook details
gitvan hooks show pre-commit-quality

# View execution history
gitvan hooks history --limit=20

# View Bree job status
gitvan hooks jobs status
```

### Manual Hook Execution

```bash
# Run specific hook manually
gitvan hooks run pre-commit-quality

# Run with custom data
gitvan hooks run post-merge-deps \
  --data='{"files":["package.json"]}'

# Run Bree job directly
gitvan jobs run update-deps
```

### Debugging Failed Hooks

```bash
# View error logs
gitvan hooks errors --recent=10

# View audit trail
gitvan audit list --type=hook --failed

# Inspect RDF event data
gitvan hooks events --format=turtle

# Query hook executions
gitvan hooks query """
  PREFIX hook: <http://example.com/hook#>
  SELECT ?hook ?status ?duration WHERE {
    ?execution hook:forHook ?hook ;
               hook:status ?status ;
               hook:duration ?duration .
  }
  ORDER BY DESC(?duration)
  LIMIT 10
"""
```

---

## Troubleshooting

### Hook Not Triggering

**Symptom**: Git event occurs but hook doesn't run

**Diagnosis**:
```bash
# 1. Check hook registration
gitvan hooks list | grep "your-hook-name"

# 2. Check Git hooks installation
ls -la .git/hooks/

# 3. Test event capture
gitvan hooks simulate pre-commit --verbose

# 4. Check hook conditions
gitvan hooks evaluate --dry-run --verbose
```

**Solutions**:
```bash
# Re-register hook
gitvan hooks register hooks/your-hook.ttl

# Reinstall Git hooks
gitvan hooks setup --force

# Verify hook syntax
gitvan hooks validate hooks/your-hook.ttl
```

### Job Execution Failures

**Symptom**: Hook triggers but job fails

**Diagnosis**:
```bash
# View job execution logs
gitvan jobs logs your-job-name

# Check job file exists
ls -la jobs/your-job-name.mjs

# Test job directly
node jobs/your-job-name.mjs
```

**Solutions**:
```bash
# Check job syntax
node --check jobs/your-job-name.mjs

# Run job with Bree directly
gitvan jobs run your-job-name --debug

# Increase job timeout
# In gitvan.config.js:
{
  hooks: {
    bree: {
      timeout: 60000  // Increase to 60 seconds
    }
  }
}
```

### Performance Issues

**Symptom**: Hooks are slow

**Diagnosis**:
```bash
# Profile hook execution
gitvan hooks profile

# View execution times
gitvan hooks stats --sort=duration

# Check background job queue
gitvan jobs status
```

**Solutions**:
```bash
# Optimize hook conditions (reduce SPARQL complexity)
# Use file patterns instead of querying all commits

# Run heavy jobs in background
hook:schedule "background"  # Instead of "immediate"

# Disable audit logging for performance
{
  hooks: {
    enableAudit: false
  }
}

# Increase worker pool
{
  hooks: {
    bree: {
      workers: 4  // Increase parallel job execution
    }
  }
}
```

### RDF/Turtle Syntax Errors

**Symptom**: Hook definition parsing fails

**Diagnosis**:
```bash
# Validate Turtle syntax
gitvan hooks validate hooks/your-hook.ttl

# Check RDF graph loading
gitvan graph load hooks/your-hook.ttl --validate
```

**Solutions**:
```bash
# Use online Turtle validator
# https://www.w3.org/2015/03/ShExValidata/

# Check namespace prefixes
@prefix hook: <http://example.com/hook#> .  # Missing trailing #

# Verify URI syntax
:MyHook a hook:Hook ;  # Correct
MyHook a hook:Hook ;   # Wrong (missing :)
```

### Bree Scheduler Issues

**Symptom**: Scheduler not starting or crashing

**Diagnosis**:
```bash
# Check Bree status
gitvan hooks scheduler status

# View Bree logs
DEBUG=bree:* gitvan daemon start

# Check job directory
ls -la jobs/
```

**Solutions**:
```bash
# Restart scheduler
gitvan hooks scheduler restart

# Reset scheduler state
gitvan hooks scheduler reset

# Check Node.js version (18+ required)
node --version
```

---

## Migration Guide

### From Husky-Only Setup

If you're currently using Husky without GitVan:

```bash
# 1. Install GitVan
npm install -g gitvan

# 2. Initialize (preserves existing .husky/)
gitvan init --preserve-husky

# 3. Convert Husky hooks to GitVan hooks
gitvan hooks migrate from-husky .husky/

# 4. Review converted hooks
ls hooks/

# 5. Test converted hooks
gitvan hooks evaluate --dry-run

# 6. Remove old Husky hooks (after verification)
rm -rf .husky/
```

### From Custom Git Hooks

If you have custom Git hooks in `.git/hooks/`:

```bash
# 1. Backup existing hooks
cp -r .git/hooks/ .git/hooks.backup/

# 2. Convert to GitVan format
gitvan hooks convert .git/hooks/pre-commit hooks/pre-commit.ttl

# 3. Register converted hooks
gitvan hooks register hooks/*.ttl

# 4. Test
gitvan hooks simulate pre-commit
```

---

## Best Practices

### 1. Hook Organization

```
hooks/
├── pre-commit/
│   ├── code-quality.ttl
│   ├── security-scan.ttl
│   └── format-check.ttl
├── post-commit/
│   ├── notification.ttl
│   └── metrics.ttl
├── pre-push/
│   ├── branch-protection.ttl
│   └── tests.ttl
└── scheduled/
    ├── daily-cleanup.ttl
    └── weekly-report.ttl
```

### 2. Job File Structure

```javascript
// jobs/my-job.mjs
import { logger } from '../src/utils/logger.mjs';

/**
 * Job: My Job
 * Trigger: Pre-commit
 * Timeout: 30s
 */
export default async function myJob(context = {}) {
  const startTime = Date.now();
  logger.info('Starting my-job...');

  try {
    // Job logic here
    const result = await doWork();

    logger.info(`my-job completed in ${Date.now() - startTime}ms`);
    return {
      success: true,
      duration: Date.now() - startTime,
      ...result
    };
  } catch (error) {
    logger.error('my-job failed:', error);
    throw error;
  }
}

async function doWork() {
  // Implementation
}
```

### 3. Error Handling

```javascript
export default async function robustJob() {
  try {
    await criticalOperation();
  } catch (error) {
    // Log error with context
    console.error('Critical operation failed:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Notify team
    await notifyTeam(error);

    // Fail loudly
    throw error;
  }
}
```

### 4. Performance Optimization

```turtle
# Use specific file patterns
hook:pathChanged "src/**/*.{js,ts}"  # Specific
hook:pathChanged "**/*"              # Avoid (too broad)

# Skip unnecessary work
hook:when [
  hook:hasStagedFiles true  # Only run if files staged
] .

# Set appropriate timeouts
hook:timeout 30000  # 30s for quick checks
hook:timeout 300000 # 5min for comprehensive tests
```

### 5. Versioning Hooks

```turtle
:MyHook a hook:Hook ;
  rdfs:label "My Hook v2.0.0" ;
  hook:version "2.0.0" ;
  hook:deprecated false ;
  hook:changelog """
    v2.0.0: Added SPARQL condition support
    v1.1.0: Improved error handling
    v1.0.0: Initial release
  """ .
```

### 6. Testing Before Production

```bash
# Always test in dry-run mode first
gitvan hooks evaluate --dry-run

# Test individual hooks
gitvan hooks test my-hook --verbose

# Verify all hooks before merge
gitvan hooks validate hooks/*.ttl

# Run integration test
gitvan hooks integration-test
```

---

## Next Steps

- **Architecture Deep Dive**: See [HOOKS_ARCHITECTURE.md](./HOOKS_ARCHITECTURE.md)
- **API Reference**: See [HOOKS_API_REFERENCE.md](./HOOKS_API_REFERENCE.md)
- **Examples**: See [HOOKS_EXAMPLES.md](./HOOKS_EXAMPLES.md)
- **Migration**: See [docs/migration/from-husky.md](./migration/from-husky.md)

---

## Support & Resources

- **Documentation**: https://gitvan.dev/docs
- **GitHub**: https://github.com/gitvan/gitvan
- **Discord**: https://discord.gg/gitvan
- **Issues**: https://github.com/gitvan/gitvan/issues

---

**Last Updated**: January 9, 2026
**GitVan Version**: 3.0.0+
**License**: Apache-2.0
