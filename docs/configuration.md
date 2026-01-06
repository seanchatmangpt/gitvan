# GitVan Configuration Guide

> **Version:** 3.0.0
> **Last Updated:** January 6, 2026

Complete guide to configuring GitVan for your project.

## Table of Contents

- [Overview](#overview)
- [Configuration File](#configuration-file)
- [Configuration Options](#configuration-options)
- [Environment Variables](#environment-variables)
- [Runtime Configuration](#runtime-configuration)
- [Configuration Loading](#configuration-loading)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Overview

GitVan uses **c12** for Nitro-style configuration loading with:

- Multiple file format support (`.js`, `.mjs`, `.ts`)
- Environment-specific overrides
- TypeScript support
- Config extends and inheritance
- Runtime configuration validation

---

## Configuration File

### File Locations (Priority Order)

GitVan searches for configuration files in this order:

1. `gitvan.config.mjs` (ES Modules - **recommended**)
2. `gitvan.config.js` (CommonJS)
3. `gitvan.config.ts` (TypeScript)
4. `gitvan.config.{NODE_ENV}.js` (Environment-specific)
5. `package.json` (`"gitvan"` field)

### Basic Configuration

**`gitvan.config.mjs`:**

```javascript
export default {
  jobs: {
    dir: "jobs"
  },
  templates: {
    dirs: ["templates"],
    autoescape: false,
    noCache: true
  },
  receipts: {
    ref: "refs/notes/gitvan/audit"
  },
  policy: {
    requireSignedCommits: true,
    allowUnsignedReceipts: true
  },
  graph: {
    dir: "graph",
    autoLoad: true,
    validateOnLoad: false
  }
}
```

### TypeScript Configuration

**`gitvan.config.ts`:**

```typescript
import type { GitVanConfig } from 'gitvan';

export default defineGitVanConfig({
  jobs: {
    dir: "jobs"
  },
  templates: {
    dirs: ["templates"],
    autoescape: false
  },
  // ... other options
}) satisfies GitVanConfig;
```

### Using `defineGitVanConfig`

The `defineGitVanConfig` helper provides type checking and IntelliSense:

```javascript
import { defineGitVanConfig } from 'gitvan';

export default defineGitVanConfig({
  // TypeScript will validate all options
  jobs: {
    dir: "jobs"
  }
});
```

---

## Configuration Options

### Jobs Configuration

Controls job discovery and execution.

```javascript
{
  jobs: {
    // Directory to scan for job files (default: "jobs")
    dir: "jobs",

    // Include subdirectories in scan
    recursive: true,

    // File pattern for job files
    pattern: "**/*.{mjs,js}",

    // Maximum concurrent job execution
    maxConcurrent: 5,

    // Default timeout for jobs (milliseconds)
    timeout: 300000, // 5 minutes

    // Retry configuration
    retry: {
      enabled: true,
      maxAttempts: 3,
      backoff: "exponential",
      initialDelay: 1000
    }
  }
}
```

**Examples:**

```javascript
// Simple configuration
{
  jobs: { dir: "automation" }
}

// Advanced configuration
{
  jobs: {
    dir: "jobs",
    recursive: true,
    maxConcurrent: 10,
    timeout: 600000, // 10 minutes
    retry: {
      enabled: true,
      maxAttempts: 5,
      backoff: "linear"
    }
  }
}
```

---

### Templates Configuration

Controls template rendering and discovery.

```javascript
{
  templates: {
    // Directories to search for templates
    dirs: ["templates", "packs/*/templates"],

    // Enable HTML auto-escaping (default: false)
    autoescape: false,

    // Disable template caching (default: true for dev)
    noCache: true,

    // Global variables available in all templates
    globals: {
      projectName: "My Project",
      version: "1.0.0"
    },

    // Custom Nunjucks filters
    filters: {
      uppercase: (str) => str.toUpperCase(),
      slugify: (str) => str.toLowerCase().replace(/\s+/g, '-')
    },

    // Template extensions
    extensions: ['.njk', '.html', '.md']
  }
}
```

**Examples:**

```javascript
// Basic template configuration
{
  templates: {
    dirs: ["templates"],
    autoescape: false
  }
}

// Advanced with custom filters
{
  templates: {
    dirs: ["templates", "shared/templates"],
    autoescape: true,
    noCache: false,
    globals: {
      siteName: "GitVan Demo",
      year: new Date().getFullYear()
    },
    filters: {
      markdown: (text) => marked(text),
      truncate: (str, len) => str.substring(0, len) + '...'
    }
  }
}
```

---

### Receipts Configuration

Controls audit trail and receipt management.

```javascript
{
  receipts: {
    // Git notes ref for storing receipts
    ref: "refs/notes/gitvan/audit",

    // Enable receipt signing
    sign: true,

    // Include full job output in receipts
    includeOutput: false,

    // Maximum receipt size (bytes)
    maxSize: 1048576, // 1MB

    // Retention policy
    retention: {
      enabled: true,
      maxAge: 7776000000, // 90 days in milliseconds
      maxCount: 1000
    },

    // Compression for large receipts
    compress: true
  }
}
```

**Examples:**

```javascript
// Minimal configuration
{
  receipts: {
    ref: "refs/notes/gitvan/audit"
  }
}

// Full audit configuration
{
  receipts: {
    ref: "refs/notes/gitvan/audit",
    sign: true,
    includeOutput: true,
    maxSize: 2097152, // 2MB
    retention: {
      enabled: true,
      maxAge: 15552000000, // 180 days
      maxCount: 5000
    },
    compress: true
  }
}
```

---

### Policy Configuration

Security and compliance policies.

```javascript
{
  policy: {
    // Require signed commits
    requireSignedCommits: true,

    // Allow unsigned receipts (for testing)
    allowUnsignedReceipts: false,

    // Require job approval
    requireApproval: {
      enabled: false,
      approvers: ["admin@example.com"],
      timeout: 3600000 // 1 hour
    },

    // Restrict job execution
    allowedJobs: [], // Empty = all allowed

    // Blocked job patterns
    blockedJobs: ["**/dangerous-*"],

    // Environment restrictions
    environments: {
      production: {
        requireSignedCommits: true,
        requireApproval: true,
        allowedJobs: ["deploy", "rollback"]
      }
    }
  }
}
```

**Examples:**

```javascript
// Development policy
{
  policy: {
    requireSignedCommits: false,
    allowUnsignedReceipts: true
  }
}

// Production policy
{
  policy: {
    requireSignedCommits: true,
    allowUnsignedReceipts: false,
    requireApproval: {
      enabled: true,
      approvers: ["ops@company.com", "security@company.com"],
      timeout: 1800000 // 30 minutes
    },
    allowedJobs: [
      "deploy-production",
      "rollback-production",
      "emergency-patch"
    ],
    blockedJobs: ["**/test-*", "**/experimental-*"]
  }
}
```

---

### Graph Configuration

RDF graph and semantic web features.

```javascript
{
  graph: {
    // Directory for graph storage
    dir: "graph",

    // Snapshots directory
    snapshotsDir: ".gitvan/graphs/snapshots",

    // URI root mappings
    uriRoots: {
      "graph://": "graph/",
      "templates://": "templates/",
      "queries://": "queries/",
      "workflows://": "workflows/"
    },

    // Auto-load ontologies on startup
    autoLoad: true,

    // Validate graphs on load
    validateOnLoad: false,

    // SPARQL endpoint configuration
    sparql: {
      enabled: false,
      port: 3030,
      path: "/sparql"
    },

    // Graph caching
    cache: {
      enabled: true,
      ttl: 3600000, // 1 hour
      maxSize: 100
    }
  }
}
```

**Examples:**

```javascript
// Basic graph configuration
{
  graph: {
    dir: "graph",
    autoLoad: true
  }
}

// Advanced with SPARQL endpoint
{
  graph: {
    dir: "graph",
    snapshotsDir: ".gitvan/snapshots",
    autoLoad: true,
    validateOnLoad: true,
    sparql: {
      enabled: true,
      port: 3030,
      path: "/sparql",
      cors: true
    },
    cache: {
      enabled: true,
      ttl: 1800000, // 30 minutes
      maxSize: 200
    }
  }
}
```

---

### AI Configuration

AI provider and model settings.

```javascript
{
  ai: {
    // AI provider: "anthropic" | "ollama" | "openai"
    provider: "anthropic",

    // Model name
    model: "claude-sonnet-4-5-20250929",

    // API configuration
    api: {
      baseURL: "https://api.anthropic.com",
      timeout: 60000,
      maxRetries: 3
    },

    // Generation parameters
    generation: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.9
    },

    // Context window
    contextWindow: 200000,

    // Enable streaming responses
    streaming: false,

    // Caching
    cache: {
      enabled: true,
      ttl: 3600000 // 1 hour
    }
  }
}
```

**Examples:**

```javascript
// Anthropic configuration
{
  ai: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    generation: {
      temperature: 0.7,
      maxTokens: 4096
    }
  }
}

// Ollama configuration (local)
{
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
    api: {
      baseURL: "http://localhost:11434",
      timeout: 120000
    },
    generation: {
      temperature: 0.5,
      maxTokens: 8192
    }
  }
}
```

---

### Daemon Configuration

Background daemon settings.

```javascript
{
  daemon: {
    // Enable daemon
    enabled: true,

    // Monitor interval (milliseconds)
    interval: 60000, // 1 minute

    // Worktree monitoring scope
    worktrees: "current", // "current" | "all"

    // PID file location
    pidFile: ".gitvan/daemon.pid",

    // Log file location
    logFile: ".gitvan/daemon.log",

    // Log level
    logLevel: "info", // "debug" | "info" | "warn" | "error"

    // Auto-restart on failure
    autoRestart: true,

    // Maximum restart attempts
    maxRestarts: 5
  }
}
```

---

### Runtime Configuration

Additional runtime settings.

```javascript
{
  // Deterministic time function
  now: () => "2027-01-01T00:00:00Z",

  // Runtime config object
  runtimeConfig: {
    app: {
      name: "gitvan-demo",
      version: "1.0.0"
    },
    gitvan: {
      notesRef: "refs/notes/gitvan/audit"
    }
  },

  // Hooks for lifecycle events
  hooks: {
    "job:before": async (job) => {
      console.log(`Starting job: ${job.id}`);
    },
    "job:after": async (job, result) => {
      console.log(`Completed job: ${job.id}`);
    },
    "job:error": async (job, error) => {
      console.error(`Job failed: ${job.id}`, error);
    }
  }
}
```

---

## Environment Variables

### Core Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GITVAN_HOME` | GitVan configuration directory | `.gitvan` | `/home/user/.gitvan` |
| `GITVAN_REPO` | Repository directory | `process.cwd()` | `/var/projects/my-app` |
| `GITVAN_CONFIG` | Custom config file path | - | `/etc/gitvan/config.mjs` |
| `NODE_ENV` | Environment mode | `development` | `production` |
| `TZ` | Timezone (always UTC in GitVan) | `UTC` | `UTC` |
| `LANG` | Locale (always C in GitVan) | `C` | `C` |

### AI Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `AI_PROVIDER` | AI provider name | `anthropic` | `ollama` |
| `AI_MODEL` | Model name | - | `claude-sonnet-4-5-20250929` |
| `ANTHROPIC_API_KEY` | Anthropic API key | - | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI API key | - | `sk-...` |
| `OLLAMA_HOST` | Ollama server URL | `http://localhost:11434` | `http://ai.local:11434` |

### Time Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GITVAN_NOW` | Fixed timestamp for determinism | `2027-01-01T00:00:00Z` |

### Debug Variables

| Variable | Description | Values | Default |
|----------|-------------|--------|---------|
| `DEBUG` | Enable debug logging | `gitvan:*` | - |
| `LOG_LEVEL` | Log level | `debug`, `info`, `warn`, `error` | `info` |
| `VERBOSE` | Verbose output | `true`, `false` | `false` |

---

## Configuration Loading

### Load Order

GitVan loads configuration in this order (later overrides earlier):

1. Default configuration
2. `gitvan.config.{mjs,js,ts}`
3. Environment-specific config
4. Environment variables
5. Runtime overrides

### Example Load Sequence

```
1. defaults.mjs          # Base defaults
2. gitvan.config.mjs     # Project config
3. gitvan.config.production.mjs  # Environment override
4. process.env.*         # Environment variables
5. runtime overrides     # CLI flags, code overrides
```

### Accessing Configuration

**In Code:**

```javascript
import { loadOptions } from 'gitvan/config';

const config = await loadOptions({ rootDir: process.cwd() });
console.log('Jobs directory:', config.jobs.dir);
```

**In Composables:**

```javascript
import { useGitVan } from 'gitvan';

const ctx = useGitVan();
const config = ctx.config;
```

---

## Best Practices

### 1. Use ES Modules

```javascript
// ✓ Recommended
// gitvan.config.mjs
export default {
  jobs: { dir: "jobs" }
};

// ✗ Avoid
// gitvan.config.js (CommonJS)
module.exports = {
  jobs: { dir: "jobs" }
};
```

### 2. Environment-Specific Configs

```javascript
// gitvan.config.mjs (base)
export default {
  jobs: { dir: "jobs" },
  policy: { requireSignedCommits: false }
};

// gitvan.config.production.mjs (override)
export default {
  policy: {
    requireSignedCommits: true,
    allowUnsignedReceipts: false
  }
};
```

### 3. Type-Safe Configuration

```typescript
import { defineGitVanConfig } from 'gitvan';

export default defineGitVanConfig({
  jobs: {
    dir: "jobs",
    timeout: 300000
  }
});
```

### 4. Secrets Management

```javascript
// ✗ NEVER hardcode secrets
export default {
  ai: {
    apiKey: "sk-..." // WRONG!
  }
};

// ✓ Use environment variables
export default {
  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY
  }
};
```

### 5. Config Validation

```javascript
import { defineGitVanConfig } from 'gitvan';
import { z } from 'zod';

const customSchema = z.object({
  customField: z.string()
});

export default defineGitVanConfig({
  jobs: { dir: "jobs" },
  // Validate custom fields
  customField: process.env.CUSTOM_FIELD || "default"
});
```

---

## Examples

### Development Configuration

```javascript
// gitvan.config.mjs
export default {
  jobs: {
    dir: "jobs",
    timeout: 60000 // 1 minute for fast feedback
  },
  templates: {
    dirs: ["templates"],
    noCache: true // Always reload templates
  },
  policy: {
    requireSignedCommits: false,
    allowUnsignedReceipts: true
  },
  daemon: {
    enabled: false, // Run jobs manually
    logLevel: "debug"
  }
};
```

### Production Configuration

```javascript
// gitvan.config.production.mjs
export default {
  jobs: {
    dir: "jobs",
    timeout: 600000, // 10 minutes
    maxConcurrent: 3,
    retry: {
      enabled: true,
      maxAttempts: 5
    }
  },
  templates: {
    dirs: ["templates"],
    noCache: false // Cache for performance
  },
  receipts: {
    ref: "refs/notes/gitvan/audit",
    sign: true,
    includeOutput: true,
    retention: {
      enabled: true,
      maxAge: 15552000000, // 180 days
      maxCount: 10000
    }
  },
  policy: {
    requireSignedCommits: true,
    allowUnsignedReceipts: false,
    requireApproval: {
      enabled: true,
      approvers: ["ops@company.com"],
      timeout: 3600000
    }
  },
  daemon: {
    enabled: true,
    interval: 300000, // 5 minutes
    autoRestart: true,
    logLevel: "info"
  }
};
```

### CI/CD Configuration

```javascript
// gitvan.config.ci.mjs
export default {
  jobs: {
    dir: "jobs",
    timeout: 900000, // 15 minutes for long builds
    maxConcurrent: 1 // Prevent resource contention
  },
  receipts: {
    ref: "refs/notes/gitvan/ci",
    sign: true,
    includeOutput: true // Full logs for debugging
  },
  policy: {
    requireSignedCommits: true,
    allowedJobs: [
      "build",
      "test",
      "deploy-staging",
      "deploy-production"
    ]
  },
  graph: {
    dir: "graph",
    autoLoad: false // Skip RDF in CI
  }
};
```

### Monorepo Configuration

```javascript
// gitvan.config.mjs
export default {
  jobs: {
    dir: "automation/jobs",
    recursive: true // Scan subdirectories
  },
  templates: {
    dirs: [
      "automation/templates",
      "packages/*/templates" // Package-specific templates
    ]
  },
  graph: {
    uriRoots: {
      "graph://": "automation/graph/",
      "packages://": "packages/",
      "workflows://": "automation/workflows/"
    }
  }
};
```

---

## Migration from v2

### Config Changes

```javascript
// v2 config
module.exports = {
  jobsDir: "jobs",
  templatesDir: "templates"
};

// v3 config
export default {
  jobs: { dir: "jobs" },
  templates: { dirs: ["templates"] }
};
```

### Breaking Changes

1. **ES Modules Required**: Config files must use `export default`
2. **Nested Configuration**: Options are now nested by category
3. **Template Paths**: Now an array (`dirs` instead of `dir`)
4. **Type Definitions**: Use `defineGitVanConfig` for types

---

## Troubleshooting

### Config Not Loading

```bash
# Check config file syntax
node -c gitvan.config.mjs

# Debug config loading
DEBUG=gitvan:config gitvan job list
```

### Environment Variables Not Working

```javascript
// Check if variable is set
console.log(process.env.GITVAN_HOME);

// Use defaults
export default {
  jobs: {
    dir: process.env.JOBS_DIR || "jobs"
  }
};
```

### Type Errors (TypeScript)

```typescript
import type { GitVanConfig } from 'gitvan';

const config: GitVanConfig = {
  jobs: { dir: "jobs" }
};

export default config;
```

---

## See Also

- [Complete API Reference](./api/complete-reference.md)
- [CLI Reference](./cli/README.md)
- [Quick Start Guide](./quickstart.md)
- [Environment Variables Reference](./environment.md)
