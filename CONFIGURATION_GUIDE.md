# GitVan Configuration Guide

Complete reference for configuring GitVan for your project.

## Table of Contents

1. [Configuration Basics](#configuration-basics)
2. [Main Configuration File](#main-configuration-file)
3. [Environment Variables](#environment-variables)
4. [AI Provider Configuration](#ai-provider-configuration)
5. [Logging Configuration](#logging-configuration)
6. [Job System Configuration](#job-system-configuration)
7. [Git Hooks Configuration](#git-hooks-configuration)
8. [Performance Tuning](#performance-tuning)
9. [Configuration Examples](#configuration-examples)

---

## Configuration Basics

GitVan uses multiple layers of configuration:

1. **gitvan.config.js** - Main project configuration (committed to repo)
2. **Environment variables** - Runtime overrides (not committed)
3. **CLI flags** - Command-line overrides (highest priority)

### Configuration Loading Order

```
1. gitvan.config.js (base)
2. gitvan.config.local.js (local overrides, not committed)
3. gitvan.config.{NODE_ENV}.js (environment-specific)
4. Environment variables (override all)
5. CLI flags (highest priority)
```

---

## Main Configuration File

### File Location

Create `gitvan.config.js` in your repository root:

```javascript
// gitvan.config.js
export default {
  // Your configuration here
};
```

### Complete Example

```javascript
export default {
  // AI Provider
  ai: {
    provider: 'anthropic',           // 'anthropic' | 'openai' | 'ollama'
    model: 'claude-opus-4-5',        // Model to use
    temperature: 0.7,                // 0-1, lower = deterministic
    maxTokens: 2000,                 // Max output tokens
    apiKey: process.env.ANTHROPIC_API_KEY // From environment
  },

  // Job System
  jobs: {
    dir: 'jobs',                     // Directory containing job files
    schedule: 'cron',                // 'cron' | 'interval' | 'manual'
    maxConcurrent: 5,                // Max concurrent job executions
    timeout: 300000,                 // Job timeout in ms (5 min)
    retries: 3,                      // Max retries on failure
    backoffMs: 1000                  // Exponential backoff multiplier
  },

  // Logging
  logging: {
    level: 'info',                   // 'silent' | 'error' | 'warn' | 'info' | 'debug'
    format: 'text',                  // 'text' | 'json'
    file: undefined,                 // Optional: log file path
    maxSize: '10MB',                 // Max file size before rotation
    maxFiles: 10                      // Max rotated files to keep
  },

  // Git Hooks
  hooks: {
    enabled: true,                   // Enable Git hooks
    autoSetup: true,                 // Auto-setup hooks on init
    dir: '.gitvan/hooks'             // Hook definitions directory
  },

  // Workflow Engine
  workflows: {
    dir: '.gitvan/workflows',        // Workflow definitions directory
    validateOnLoad: true,            // Validate workflows when loading
    parallel: false,                 // Run steps in parallel
    timeout: 3600000                 // Workflow timeout (1 hour)
  },

  // Templates
  templates: {
    dirs: ['templates'],             // Directories to search for templates
    autoescape: false,               // Nunjucks autoescape
    throwOnUndefined: true,          // Throw on undefined variables
    cache: true                      // Cache compiled templates
  },

  // Git Configuration
  git: {
    deterministic: true,             // Use deterministic environment
    author: 'GitVan <gitvan@example.com>', // Default commit author
    gpgSign: false,                  // Require GPG signatures
    refPrefix: 'refs/gitvan/'        // Prefix for GitVan refs
  },

  // RDF/Graph
  graph: {
    dir: 'graph',                    // Graph storage directory
    autoLoad: true,                  // Auto-load ontologies
    cache: true                      // Cache SPARQL queries
  },

  // Performance
  performance: {
    sloTarget: 300000,               // Default SLO target (ms)
    sloP99: 360000,                  // P99 target (ms)
    trackMetrics: true,              // Track performance metrics
    reportInterval: 60000            // Metric report interval (ms)
  },

  // Security
  security: {
    requireSignedCommits: false,     // Require GPG signatures
    validateWorkflows: true,         // Validate workflows before execution
    sandboxExecution: true           // Run workflows in sandbox
  },

  // Development
  dev: {
    watch: false,                    // Watch mode
    verbose: false,                  // Verbose output
    debug: false                     // Debug mode
  }
};
```

---

## Environment Variables

Override configuration using environment variables:

### AI Provider

```bash
# Provider selection
export GITVAN_AI_PROVIDER=anthropic    # anthropic | openai | ollama
export GITVAN_AI_MODEL=claude-opus-4-5

# API Keys (never commit!)
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export OLLAMA_API_URL=http://localhost:11434
```

### Logging

```bash
# Logging configuration
export GITVAN_LOG_LEVEL=info           # silent | error | warn | info | debug
export GITVAN_LOG_FORMAT=text          # text | json
export GITVAN_LOG_FILE=/var/log/gitvan.log

# Log rotation
export GITVAN_LOG_MAX_SIZE=10MB
export GITVAN_LOG_MAX_FILES=10
```

### Jobs

```bash
# Job system configuration
export GITVAN_JOBS_DIR=jobs
export GITVAN_JOBS_MAX_CONCURRENT=5
export GITVAN_JOBS_TIMEOUT=300000
export GITVAN_JOBS_RETRIES=3
```

### Workflows

```bash
# Workflow configuration
export GITVAN_WORKFLOWS_DIR=.gitvan/workflows
export GITVAN_WORKFLOWS_PARALLEL=false
export GITVAN_WORKFLOWS_TIMEOUT=3600000
```

### Git

```bash
# Git configuration
export GITVAN_GIT_DETERMINISTIC=true
export GITVAN_GIT_AUTHOR="GitVan <gitvan@example.com>"
export GITVAN_GIT_GPG_SIGN=false
```

### Development

```bash
# Development flags
export NODE_ENV=development
export GITVAN_DEBUG=true
export GITVAN_VERBOSE=true
```

---

## AI Provider Configuration

### Anthropic (Default)

```javascript
export default {
  ai: {
    provider: 'anthropic',
    model: 'claude-opus-4-5',
    temperature: 0.7,
    maxTokens: 2000,
    apiKey: process.env.ANTHROPIC_API_KEY
  }
};
```

**Required Environment Variable:**
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### OpenAI

```javascript
export default {
  ai: {
    provider: 'openai',
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    apiKey: process.env.OPENAI_API_KEY
  }
};
```

**Required Environment Variable:**
```bash
export OPENAI_API_KEY=sk-...
```

### Ollama (Local)

```javascript
export default {
  ai: {
    provider: 'ollama',
    model: 'llama2',
    baseUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434'
  }
};
```

**Required Environment Variable:**
```bash
export OLLAMA_API_URL=http://localhost:11434
```

---

## Logging Configuration

### Text Format

```javascript
export default {
  logging: {
    level: 'info',      // Default level
    format: 'text',     // Human-readable
    file: undefined     // No file output
  }
};
```

Output:
```
[INFO] Starting workflow: build
[DEBUG] Loading template: build.njk
[ERROR] Workflow failed: build
```

### JSON Format (Production)

```javascript
export default {
  logging: {
    level: 'warn',      // Only warnings and errors
    format: 'json',     // Machine-readable
    file: '/var/log/gitvan.log'  // File output
  }
};
```

Output:
```json
{"level":"info","timestamp":"2026-01-09T10:00:00Z","message":"Starting workflow","workflow":"build","context":{}}
```

### Environment Variables

```bash
# Set logging level
export GITVAN_LOG_LEVEL=debug

# JSON format for production
export GITVAN_LOG_FORMAT=json

# Log to file
export GITVAN_LOG_FILE=/var/log/gitvan.log

# Log rotation
export GITVAN_LOG_MAX_SIZE=100MB
export GITVAN_LOG_MAX_FILES=20
```

---

## Job System Configuration

### Basic Configuration

```javascript
export default {
  jobs: {
    dir: 'jobs',           // Job files location
    schedule: 'cron',      // Scheduling method
    maxConcurrent: 5,      // Max parallel jobs
    timeout: 300000,       // 5 minute timeout
    retries: 3,            // Retry failed jobs
    backoffMs: 1000        // Exponential backoff
  }
};
```

### Job Directory Structure

```
jobs/
├── build.mjs           # export default async function build() { }
├── test.mjs            # export default async function test() { }
├── deploy.mjs          # export default async function deploy() { }
└── cleanup.mjs         # export default async function cleanup() { }
```

### Cron Scheduling

```javascript
// .gitvan/workflows/scheduled.ttl
@prefix : <http://example.org/schedule#> .
@prefix op: <http://example.org/ops#> .

:DailyMaintenance a op:ScheduledJob ;
  op:jobName "cleanup" ;
  op:schedule "0 2 * * *" ;    # 2 AM daily
  op:timeout 600000 .           # 10 minutes

:HourlyMetrics a op:ScheduledJob ;
  op:jobName "metrics" ;
  op:schedule "0 * * * *" ;     # Every hour
  op:timeout 60000 .            # 1 minute
```

---

## Git Hooks Configuration

### Enable/Disable Hooks

```javascript
export default {
  hooks: {
    enabled: true,              // Global enable/disable
    autoSetup: true,            // Auto-setup on init
    dir: '.gitvan/hooks'        // Hook definitions
  }
};
```

### Hook Definition Example

```turtle
@prefix : <http://example.org/hooks#> .
@prefix git: <http://example.org/git#> .

:PreCommitLint a git:Hook ;
  rdfs:label "Pre-commit linting" ;
  git:on [ a git:PreCommitEvent ] ;
  git:runs [
    git:command "npm run lint" ;
    git:timeout 30000
  ] .
```

### Environment Variables

```bash
# Hooks configuration
export GITVAN_HOOKS_ENABLED=true
export GITVAN_HOOKS_AUTO_SETUP=true
export GITVAN_HOOKS_DIR=.gitvan/hooks
```

---

## Performance Tuning

### Default SLO Configuration

```javascript
export default {
  performance: {
    sloTarget: 300000,      // Target: 5 minutes
    sloP99: 360000,         // P99: 6 minutes
    trackMetrics: true,     // Track performance
    reportInterval: 60000   // Report every minute
  }
};
```

### Optimization Tips

1. **Reduce Job Timeout** - Set realistic timeouts
```javascript
jobs: { timeout: 60000 }  // 1 minute for quick jobs
```

2. **Enable Caching**
```javascript
templates: { cache: true },
graph: { cache: true }
```

3. **Parallel Execution**
```javascript
workflows: { parallel: true },
jobs: { maxConcurrent: 10 }
```

4. **Reduce Logging Verbosity** (Production)
```bash
export GITVAN_LOG_LEVEL=warn
```

---

## Configuration Examples

### Development Configuration

```javascript
// gitvan.config.dev.js
export default {
  logging: {
    level: 'debug',
    format: 'text'
  },
  ai: {
    provider: 'ollama',
    model: 'llama2'
  },
  dev: {
    watch: true,
    verbose: true,
    debug: true
  }
};
```

### Production Configuration

```javascript
// gitvan.config.prod.js
export default {
  logging: {
    level: 'warn',
    format: 'json',
    file: '/var/log/gitvan.log'
  },
  ai: {
    provider: 'anthropic',
    model: 'claude-opus-4-5'
  },
  jobs: {
    maxConcurrent: 10,
    timeout: 600000,
    retries: 5
  },
  security: {
    requireSignedCommits: true,
    validateWorkflows: true,
    sandboxExecution: true
  }
};
```

### CI/CD Configuration

```javascript
// gitvan.config.ci.js
export default {
  logging: {
    level: 'info',
    format: 'json'
  },
  workflows: {
    timeout: 1800000,  // 30 minutes
    parallel: true
  },
  jobs: {
    maxConcurrent: 20,
    timeout: 600000
  },
  git: {
    gpgSign: true
  }
};
```

---

## Troubleshooting Configuration

### Issue: Configuration not applied

```bash
# Check configuration loading
export GITVAN_DEBUG=true
gitvan workflow list

# Check which config file is used
node -e "import('./gitvan.config.js').then(c => console.log(c.default))"
```

### Issue: Environment variables not recognized

```bash
# Verify variable name (must use GITVAN_ prefix)
echo $GITVAN_AI_PROVIDER

# Check if variable is exported
export GITVAN_AI_PROVIDER=anthropic
```

### Issue: Logging not working

```bash
# Check log level
echo $GITVAN_LOG_LEVEL

# Set explicit level
export GITVAN_LOG_LEVEL=debug
export GITVAN_LOG_FORMAT=text
```

---

## Environment Matrix

| Environment | Log Level | Format | Provider | Notes |
|------------|----------|--------|----------|-------|
| development | debug | text | ollama | Watch mode, verbose |
| testing | warn | text | ollama | Isolated, quick |
| staging | info | json | anthropic | Pre-production |
| production | warn | json | anthropic | Monitored, logged |

---

## Next Steps

- See [GETTING_STARTED.md](GETTING_STARTED.md) for initial setup
- See [API_REFERENCE.md](API_REFERENCE.md) for configuration APIs
- See [SECURITY.md](SECURITY.md) for security configuration
