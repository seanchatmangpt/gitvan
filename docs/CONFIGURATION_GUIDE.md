# GitVan Configuration Guide

Complete guide to configuring GitVan for your project. This document covers all configuration options, environment variables, and best practices.

## Table of Contents

1. [Configuration File](#configuration-file)
2. [Environment Variables](#environment-variables)
3. [Configuration Options](#configuration-options)
4. [Examples by Use Case](#examples-by-use-case)
5. [Best Practices](#best-practices)

---

## Configuration File

GitVan uses **c12** for configuration loading. Configuration files are searched in this order:

1. `gitvan.config.js` (recommended)
2. `gitvan.config.mjs`
3. `gitvan.config.ts`
4. `.gitvanrc`
5. `package.json` (under `gitvan` key)

### Basic Configuration

Create `gitvan.config.js` in your repository root:

```javascript
export default {
  // Job configuration
  jobs: {
    dir: 'jobs'
  },

  // Template configuration
  templates: {
    dirs: ['templates']
  },

  // Workflow configuration
  workflows: {
    dir: 'workflows'
  }
};
```

### Complete Configuration Template

```javascript
// gitvan.config.js
export default {
  // ===================================
  // Job Configuration
  // ===================================
  jobs: {
    // Directory containing job files
    dir: 'jobs',

    // Maximum concurrent jobs
    maxConcurrent: 5,

    // Default timeout for jobs (milliseconds)
    timeout: 300000,  // 5 minutes

    // Timezone for cron schedules
    timezone: 'UTC',

    // Enable job discovery
    autoScan: true
  },

  // ===================================
  // Template Configuration
  // ===================================
  templates: {
    // Template directories (searched in order)
    dirs: [
      'templates',
      '.gitvan/templates',
      'node_modules/@gitvan/templates'
    ],

    // Nunjucks configuration
    autoescape: false,      // Auto-escape HTML
    trimBlocks: true,       // Trim block whitespace
    lstripBlocks: true,     // Left-strip block whitespace
    throwOnUndefined: false, // Throw on undefined variables

    // Global template variables
    globals: {
      projectName: 'My Project',
      version: '1.0.0',
      author: 'Your Name',
      year: new Date().getFullYear()
    },

    // Custom filters
    filters: {
      uppercase: (str) => str.toUpperCase(),
      lowercase: (str) => str.toLowerCase(),
      capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
      reverse: (str) => str.split('').reverse().join(''),
      truncate: (str, len) => str.length > len ? str.slice(0, len) + '...' : str
    },

    // Watch templates for changes (development only)
    watch: process.env.NODE_ENV === 'development'
  },

  // ===================================
  // Workflow Configuration
  // ===================================
  workflows: {
    // Workflow directory
    dir: 'workflows',

    // Enable parallel step execution
    parallel: true,

    // Default timeout for workflows (milliseconds)
    timeout: 600000,  // 10 minutes

    // Enable caching
    cache: true,

    // Maximum retries for failed steps
    maxRetries: 3,

    // Retry delay (milliseconds)
    retryDelay: 5000,

    // Auto-load workflows on start
    autoLoad: true
  },

  // ===================================
  // Audit Trail Configuration
  // ===================================
  receipts: {
    // Git notes ref for audit trail
    ref: 'refs/notes/gitvan/audit',

    // Sign audit records with GPG
    sign: true,

    // Include system metadata
    includeMetadata: true,

    // Compress audit data
    compress: false,

    // Maximum audit records to keep
    maxRecords: 10000,

    // Export format
    exportFormat: 'json'
  },

  // ===================================
  // Security Policy
  // ===================================
  policy: {
    // Require GPG-signed commits
    requireSignedCommits: false,

    // Allowed shell commands (whitelist)
    allowedCommands: [
      'npm',
      'git',
      'node',
      'sh',
      'bash'
    ],

    // Maximum execution time (milliseconds)
    maxExecutionTime: 3600000,  // 1 hour

    // Block dangerous operations
    blockDangerousOps: true,

    // Allowed environment variables
    allowedEnvVars: [
      'NODE_ENV',
      'CI',
      'HOME',
      'PATH'
    ]
  },

  // ===================================
  // RDF Graph Configuration
  // ===================================
  graph: {
    // Graph storage directory
    dir: 'graph',

    // Auto-load ontologies
    autoLoad: true,

    // Enable caching
    cache: true,

    // Cache TTL (milliseconds)
    cacheTTL: 3600000,  // 1 hour

    // URI to path mapping
    uriRoots: {
      'graph://': 'graph/',
      'templates://': 'templates/',
      'workflows://': 'workflows/',
      'jobs://': 'jobs/'
    },

    // SPARQL endpoint (optional)
    sparqlEndpoint: null,

    // Enable query optimization
    optimizeQueries: true
  },

  // ===================================
  // AI Configuration
  // ===================================
  ai: {
    // Default AI provider
    provider: 'anthropic',

    // Anthropic configuration
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-opus-20240229',
      maxTokens: 4096,
      temperature: 0.7
    },

    // Ollama configuration
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: 'codellama',
      temperature: 0.7
    },

    // Enable context injection
    injectContext: true,

    // Context size limit (tokens)
    maxContextTokens: 8000,

    // Enable learning from feedback
    enableLearning: true
  },

  // ===================================
  // Pack Configuration
  // ===================================
  packs: {
    // Pack registry URL
    registry: 'https://registry.gitvan.dev',

    // Cache directory
    cacheDir: '.gitvan/pack-cache',

    // Auto-update packs
    autoUpdate: false,

    // Verify pack signatures
    verifySignatures: true,

    // Allowed pack sources
    allowedSources: [
      'https://registry.gitvan.dev',
      'https://github.com'
    ]
  },

  // ===================================
  // Git Configuration
  // ===================================
  git: {
    // Default remote
    defaultRemote: 'origin',

    // Default branch
    defaultBranch: 'main',

    // Sign commits by default
    signCommits: false,

    // GPG key ID
    gpgKeyId: null,

    // Git author
    author: {
      name: process.env.GIT_AUTHOR_NAME,
      email: process.env.GIT_AUTHOR_EMAIL
    },

    // Commit message template
    commitTemplate: null,

    // Auto-prune worktrees
    autoPruneWorktrees: true
  },

  // ===================================
  // Event Configuration
  // ===================================
  events: {
    // Enable event system
    enabled: true,

    // Git events to capture
    captureGitEvents: [
      'commit',
      'push',
      'merge',
      'branch',
      'tag'
    ],

    // Event queue size
    queueSize: 1000,

    // Event processing delay (milliseconds)
    processingDelay: 0
  },

  // ===================================
  // Daemon Configuration
  // ===================================
  daemon: {
    // Enable daemon
    enabled: true,

    // Daemon port (if applicable)
    port: 3000,

    // Log file
    logFile: '.gitvan/daemon.log',

    // Log level
    logLevel: 'info',

    // PID file
    pidFile: '.gitvan/daemon.pid',

    // Graceful shutdown timeout
    shutdownTimeout: 10000
  },

  // ===================================
  // Performance Configuration
  // ===================================
  performance: {
    // Enable performance tracking
    enabled: true,

    // Sample rate (0-1)
    sampleRate: 1.0,

    // Metrics output file
    metricsFile: '.gitvan/metrics.json',

    // Enable profiling
    profiling: false
  },

  // ===================================
  // Telemetry Configuration
  // ===================================
  telemetry: {
    // Enable telemetry
    enabled: false,

    // Telemetry endpoint
    endpoint: null,

    // Anonymous usage statistics
    anonymous: true
  }
};
```

---

## Environment Variables

GitVan respects the following environment variables:

### Core Variables

```bash
# GitVan home directory
GITVAN_HOME=/path/to/config

# Repository path
GITVAN_REPO=/path/to/repo

# Node environment
NODE_ENV=development|production|test

# Timezone (always UTC for determinism)
TZ=UTC

# Locale (always C for determinism)
LANG=C
```

### AI Provider Variables

```bash
# AI provider
AI_PROVIDER=anthropic|ollama

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
```

### Git Variables

```bash
# Git author
GIT_AUTHOR_NAME="Your Name"
GIT_AUTHOR_EMAIL="your@email.com"

# Git committer
GIT_COMMITTER_NAME="Your Name"
GIT_COMMITTER_EMAIL="your@email.com"

# GPG key
GPG_KEY_ID=ABCDEF1234567890
```

### Debug Variables

```bash
# Enable debug logging
DEBUG=gitvan:*

# Specific module debugging
DEBUG=gitvan:workflow
DEBUG=gitvan:git
DEBUG=gitvan:template

# Verbose output
VERBOSE=true
```

### CI/CD Variables

```bash
# CI environment detection
CI=true

# Common CI variables
GITHUB_ACTIONS=true
GITLAB_CI=true
CIRCLECI=true
TRAVIS=true
```

---

## Configuration Options

### Jobs

```javascript
jobs: {
  dir: 'jobs',              // Job directory
  maxConcurrent: 5,         // Max concurrent jobs
  timeout: 300000,          // Default timeout (5 min)
  timezone: 'UTC',          // Cron timezone
  autoScan: true            // Auto-discover jobs
}
```

### Templates

```javascript
templates: {
  dirs: ['templates'],      // Template directories
  autoescape: false,        // HTML auto-escape
  trimBlocks: true,         // Trim whitespace
  lstripBlocks: true,       // Left-strip whitespace
  throwOnUndefined: false,  // Throw on undefined vars
  globals: {},              // Global variables
  filters: {},              // Custom filters
  watch: false              // Watch for changes
}
```

### Workflows

```javascript
workflows: {
  dir: 'workflows',         // Workflow directory
  parallel: true,           // Parallel execution
  timeout: 600000,          // Default timeout (10 min)
  cache: true,              // Enable caching
  maxRetries: 3,            // Max retries
  retryDelay: 5000,         // Retry delay (5 sec)
  autoLoad: true            // Auto-load workflows
}
```

### Security Policy

```javascript
policy: {
  requireSignedCommits: false,      // Require GPG signatures
  allowedCommands: ['npm', 'git'],  // Command whitelist
  maxExecutionTime: 3600000,        // Max execution (1 hour)
  blockDangerousOps: true,          // Block dangerous ops
  allowedEnvVars: []                // Env var whitelist
}
```

### RDF Graph

```javascript
graph: {
  dir: 'graph',             // Graph storage
  autoLoad: true,           // Auto-load ontologies
  cache: true,              // Enable caching
  cacheTTL: 3600000,        // Cache TTL (1 hour)
  uriRoots: {},             // URI mappings
  sparqlEndpoint: null,     // SPARQL endpoint
  optimizeQueries: true     // Query optimization
}
```

---

## Examples by Use Case

### Development Environment

```javascript
// gitvan.config.js
export default {
  jobs: {
    dir: 'jobs',
    maxConcurrent: 10,  // Higher for dev
    timeout: 60000      // Shorter timeout
  },

  templates: {
    dirs: ['templates'],
    watch: true,        // Hot reload
    throwOnUndefined: true  // Strict mode
  },

  workflows: {
    parallel: true,
    cache: false,       // Disable for testing
    timeout: 300000
  },

  daemon: {
    enabled: true,
    logLevel: 'debug',  // Verbose logging
    logFile: '.gitvan/daemon.log'
  },

  performance: {
    enabled: true,
    profiling: true     // Enable profiling
  }
};
```

### Production Environment

```javascript
// gitvan.config.js
export default {
  jobs: {
    dir: 'jobs',
    maxConcurrent: 5,
    timeout: 600000,    // Longer timeout
    timezone: 'UTC'
  },

  templates: {
    dirs: ['templates'],
    watch: false,
    cache: true         // Enable caching
  },

  workflows: {
    parallel: true,
    cache: true,
    timeout: 1800000,   // 30 minutes
    maxRetries: 5
  },

  policy: {
    requireSignedCommits: true,
    blockDangerousOps: true,
    maxExecutionTime: 3600000
  },

  receipts: {
    ref: 'refs/notes/gitvan/audit',
    sign: true,         // Sign audit records
    compress: true
  },

  daemon: {
    enabled: true,
    logLevel: 'info',
    logFile: '/var/log/gitvan/daemon.log'
  },

  telemetry: {
    enabled: true,
    endpoint: 'https://telemetry.yourcompany.com'
  }
};
```

### CI/CD Environment

```javascript
// gitvan.config.js
export default {
  jobs: {
    dir: 'jobs',
    maxConcurrent: 10,
    timeout: 900000     // 15 minutes
  },

  workflows: {
    parallel: true,
    cache: false,       // No cache in CI
    timeout: 1800000,   // 30 minutes
    maxRetries: 3
  },

  policy: {
    requireSignedCommits: false,  // No signing in CI
    maxExecutionTime: 3600000
  },

  ai: {
    provider: 'anthropic',
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxTokens: 2048  // Lower for CI
    }
  },

  receipts: {
    sign: false,        // No signing in CI
    exportFormat: 'json'
  },

  daemon: {
    enabled: false      // No daemon in CI
  }
};
```

### Monorepo Configuration

```javascript
// gitvan.config.js
export default {
  jobs: {
    dir: 'jobs',
    maxConcurrent: 20   // Higher for monorepo
  },

  templates: {
    dirs: [
      'templates',
      'packages/*/templates',
      'apps/*/templates'
    ]
  },

  workflows: {
    dir: 'workflows',
    parallel: true,
    cache: true
  },

  graph: {
    dir: 'graph',
    uriRoots: {
      'graph://': 'graph/',
      'packages://': 'packages/',
      'apps://': 'apps/'
    }
  },

  packs: {
    registry: 'https://registry.yourcompany.com',
    allowedSources: [
      'https://registry.yourcompany.com',
      'https://registry.gitvan.dev'
    ]
  }
};
```

### Team Collaboration

```javascript
// gitvan.config.js
export default {
  git: {
    defaultRemote: 'origin',
    defaultBranch: 'main',
    signCommits: true,
    commitTemplate: '.gitmessage'
  },

  policy: {
    requireSignedCommits: true,
    allowedCommands: ['npm', 'git', 'node'],
    blockDangerousOps: true
  },

  receipts: {
    ref: 'refs/notes/gitvan/audit',
    sign: true,
    includeMetadata: true
  },

  events: {
    enabled: true,
    captureGitEvents: ['commit', 'push', 'merge']
  },

  ai: {
    provider: 'anthropic',
    injectContext: true,
    enableLearning: true
  }
};
```

---

## Best Practices

### 1. Use Environment-Specific Configs

```javascript
// gitvan.config.js
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

export default {
  workflows: {
    cache: isProd,          // Cache only in production
    timeout: isDev ? 60000 : 600000
  },

  daemon: {
    logLevel: isDev ? 'debug' : 'info'
  },

  templates: {
    watch: isDev            // Hot reload only in dev
  }
};
```

### 2. Keep Secrets in Environment Variables

```javascript
// gitvan.config.js
export default {
  ai: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,  // From env
      model: 'claude-3-opus-20240229'         // In config
    }
  }
};
```

### 3. Use Reasonable Timeouts

```javascript
export default {
  jobs: {
    timeout: 300000      // 5 minutes for jobs
  },

  workflows: {
    timeout: 600000      // 10 minutes for workflows
  }
};
```

### 4. Enable Caching in Production

```javascript
export default {
  workflows: {
    cache: process.env.NODE_ENV === 'production'
  },

  graph: {
    cache: true,
    cacheTTL: 3600000    // 1 hour
  }
};
```

### 5. Configure Security Policies

```javascript
export default {
  policy: {
    requireSignedCommits: true,
    allowedCommands: ['npm', 'git'],
    blockDangerousOps: true,
    maxExecutionTime: 3600000
  }
};
```

### 6. Organize Templates by Feature

```javascript
export default {
  templates: {
    dirs: [
      'templates/components',
      'templates/api',
      'templates/tests'
    ]
  }
};
```

### 7. Use Parallel Execution

```javascript
export default {
  workflows: {
    parallel: true,      // Enable parallel steps
    maxRetries: 3        // Retry failed steps
  },

  jobs: {
    maxConcurrent: 5     // Limit concurrent jobs
  }
};
```

### 8. Monitor Performance

```javascript
export default {
  performance: {
    enabled: true,
    metricsFile: '.gitvan/metrics.json',
    profiling: process.env.PROFILE === 'true'
  }
};
```

---

## Configuration Validation

Validate your configuration:

```bash
# Show current configuration
gitvan config show

# Validate configuration
gitvan config validate

# Test configuration
gitvan config test
```

---

## See Also

- [API Reference](./API_REFERENCE.md)
- [Getting Started Guide](./GETTING_STARTED.md)
- [Production Deployment](./PRODUCTION.md)
- [Security Best Practices](./SECURITY.md)

---

**GitVan v1.0.0** Configuration Guide
