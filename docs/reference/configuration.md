# GitVan v2 Configuration Reference

Complete reference for `gitvan.config.js` with all available options, types, and defaults.

## Table of Contents

- [Configuration File](#configuration-file)
- [Schema Reference](#schema-reference)
- [Core Configuration](#core-configuration)
- [Git Configuration](#git-configuration)
- [AI Configuration](#ai-configuration)
- [Job Configuration](#job-configuration)
- [Event Configuration](#event-configuration)
- [Template Configuration](#template-configuration)
- [Pack Configuration](#pack-configuration)
- [Daemon Configuration](#daemon-configuration)
- [Security Configuration](#security-configuration)
- [Performance Configuration](#performance-configuration)
- [Examples](#examples)

## Configuration File

GitVan looks for configuration in the following order:

1. `gitvan.config.js` (JavaScript)
2. `gitvan.config.mjs` (ES modules)
3. `gitvan.config.ts` (TypeScript)
4. `package.json` (under `gitvan` key)

### Basic Configuration

```javascript
// gitvan.config.js
export default {
  debug: false,
  notesRef: 'refs/notes/gitvan',
  resultsRef: 'refs/notes/gitvan/results',
  locksRoot: 'refs/gitvan/locks',
  runsRoot: 'refs/gitvan/runs',
  scheduleRoot: 'refs/gitvan/schedule',
  
  git: {
    autoInit: true,
    defaultBranch: 'main',
    hooks: {
      enabled: true,
      preCommit: true,
      postCommit: true,
      prePush: true
    }
  },
  
  ai: {
    provider: 'ollama',
    model: 'qwen3-coder:30b',
    baseURL: 'http://127.0.0.1:11434',
    timeout: 30000,
    maxTokens: 4000,
    temperature: 0.7
  },
  
  jobs: {
    directory: 'jobs',
    concurrency: 5,
    timeout: 300000,
    retries: 3
  },
  
  events: {
    directory: 'events',
    polling: {
      enabled: true,
      interval: 1500,
      lookback: 600
    }
  },
  
  templates: {
    directory: 'templates',
    cache: true,
    autoescape: true
  },
  
  packs: {
    directory: 'packs',
    registry: 'https://registry.gitvan.dev',
    cache: true
  },
  
  daemon: {
    enabled: true,
    pollMs: 1500,
    lookback: 600,
    maxPerTick: 50
  }
};
```

## Schema Reference

### TypeScript Definitions

```typescript
interface GitVanConfig {
  // Core settings
  debug?: boolean;
  notesRef?: string;
  resultsRef?: string;
  locksRoot?: string;
  runsRoot?: string;
  scheduleRoot?: string;
  
  // Git configuration
  git?: GitConfig;
  
  // AI configuration
  ai?: AIConfig;
  
  // Job configuration
  jobs?: JobConfig;
  
  // Event configuration
  events?: EventConfig;
  
  // Template configuration
  templates?: TemplateConfig;
  
  // Pack configuration
  packs?: PackConfig;
  
  // Daemon configuration
  daemon?: DaemonConfig;
  
  // Security configuration
  security?: SecurityConfig;
  
  // Performance configuration
  performance?: PerformanceConfig;
}

interface GitConfig {
  autoInit?: boolean;
  defaultBranch?: string;
  hooks?: GitHooksConfig;
  worktrees?: WorktreeConfig;
}

interface AIConfig {
  provider?: 'ollama' | 'openai' | 'anthropic' | 'custom';
  model?: string;
  baseURL?: string;
  apiKey?: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface JobConfig {
  directory?: string;
  concurrency?: number;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cleanup?: boolean;
}

interface EventConfig {
  directory?: string;
  polling?: PollingConfig;
  webhooks?: WebhookConfig;
}

interface TemplateConfig {
  directory?: string;
  cache?: boolean;
  autoescape?: boolean;
  filters?: Record<string, Function>;
  globals?: Record<string, any>;
}

interface PackConfig {
  directory?: string;
  registry?: string;
  cache?: boolean;
  autoUpdate?: boolean;
}

interface DaemonConfig {
  enabled?: boolean;
  pollMs?: number;
  lookback?: number;
  maxPerTick?: number;
  restartPolicy?: 'always' | 'on-failure' | 'never';
}

interface SecurityConfig {
  allowlist?: string[];
  sandbox?: boolean;
  maxFileSize?: number;
  allowedExtensions?: string[];
}

interface PerformanceConfig {
  cache?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
  memoryLimit?: string;
}
```

## Core Configuration

### Basic Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debug` | boolean | `false` | Enable debug logging |
| `notesRef` | string | `'refs/notes/gitvan'` | Git notes reference for metadata |
| `resultsRef` | string | `'refs/notes/gitvan/results'` | Git notes reference for results |
| `locksRoot` | string | `'refs/gitvan/locks'` | Git refs root for locks |
| `runsRoot` | string | `'refs/gitvan/runs'` | Git refs root for run tracking |
| `scheduleRoot` | string | `'refs/gitvan/schedule'` | Git refs root for schedules |

### Example

```javascript
export default {
  debug: process.env.NODE_ENV === 'development',
  notesRef: 'refs/notes/gitvan',
  resultsRef: 'refs/notes/gitvan/results',
  locksRoot: 'refs/gitvan/locks',
  runsRoot: 'refs/gitvan/runs',
  scheduleRoot: 'refs/gitvan/schedule'
};
```

## Git Configuration

### Git Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoInit` | boolean | `true` | Automatically initialize Git repository |
| `defaultBranch` | string | `'main'` | Default branch name |
| `hooks.enabled` | boolean | `true` | Enable Git hooks integration |
| `hooks.preCommit` | boolean | `true` | Run pre-commit hooks |
| `hooks.postCommit` | boolean | `true` | Run post-commit hooks |
| `hooks.prePush` | boolean | `true` | Run pre-push hooks |
| `worktrees.enabled` | boolean | `true` | Enable worktree support |
| `worktrees.autoPrune` | boolean | `true` | Automatically prune stale worktrees |

### Example

```javascript
export default {
  git: {
    autoInit: true,
    defaultBranch: 'main',
    hooks: {
      enabled: true,
      preCommit: true,
      postCommit: true,
      prePush: true
    },
    worktrees: {
      enabled: true,
      autoPrune: true
    }
  }
};
```

## AI Configuration

### AI Provider Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | string | `'ollama'` | AI provider (`ollama`, `openai`, `anthropic`, `custom`) |
| `model` | string | `'qwen3-coder:30b'` | AI model identifier |
| `baseURL` | string | `'http://127.0.0.1:11434'` | API base URL |
| `apiKey` | string | `undefined` | API key (from environment) |
| `timeout` | number | `30000` | Request timeout in milliseconds |
| `maxTokens` | number | `4000` | Maximum tokens per request |
| `temperature` | number | `0.7` | Response randomness (0-1) |
| `systemPrompt` | string | `undefined` | Custom system prompt |

### Provider-Specific Configuration

#### Ollama Configuration

```javascript
export default {
  ai: {
    provider: 'ollama',
    model: 'qwen3-coder:30b',
    baseURL: 'http://127.0.0.1:11434',
    timeout: 30000,
    maxTokens: 4000,
    temperature: 0.7
  }
};
```

#### OpenAI Configuration

```javascript
export default {
  ai: {
    provider: 'openai',
    model: 'qwen3-coder:30b',
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
    maxTokens: 4000,
    temperature: 0.7
  }
};
```

#### Anthropic Configuration

```javascript
export default {
  ai: {
    provider: 'anthropic',
    model: 'qwen3-coder:30b',
    baseURL: 'https://api.anthropic.com',
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 30000,
    maxTokens: 4000,
    temperature: 0.7
  }
};
```

#### Custom Provider Configuration

```javascript
export default {
  ai: {
    provider: 'custom',
    model: 'my-custom-model',
    baseURL: 'https://my-ai-service.com/api',
    apiKey: process.env.CUSTOM_API_KEY,
    timeout: 30000,
    maxTokens: 4000,
    temperature: 0.7,
    systemPrompt: 'You are a helpful coding assistant.'
  }
};
```

## Job Configuration

### Job Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `directory` | string | `'jobs'` | Jobs directory path |
| `concurrency` | number | `5` | Maximum concurrent jobs |
| `timeout` | number | `300000` | Default job timeout (5 minutes) |
| `retries` | number | `3` | Number of retry attempts |
| `retryDelay` | number | `1000` | Delay between retries (ms) |
| `cleanup` | boolean | `true` | Clean up job artifacts |

### Example

```javascript
export default {
  jobs: {
    directory: 'jobs',
    concurrency: 5,
    timeout: 300000,
    retries: 3,
    retryDelay: 1000,
    cleanup: true
  }
};
```

## Event Configuration

### Event Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `directory` | string | `'events'` | Events directory path |
| `polling.enabled` | boolean | `true` | Enable event polling |
| `polling.interval` | number | `1500` | Polling interval (ms) |
| `polling.lookback` | number | `600` | Lookback window (seconds) |
| `webhooks.enabled` | boolean | `false` | Enable webhook support |
| `webhooks.port` | number | `3000` | Webhook server port |

### Example

```javascript
export default {
  events: {
    directory: 'events',
    polling: {
      enabled: true,
      interval: 1500,
      lookback: 600
    },
    webhooks: {
      enabled: false,
      port: 3000
    }
  }
};
```

## Template Configuration

### Template Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `directory` | string | `'templates'` | Templates directory path |
| `cache` | boolean | `true` | Enable template caching |
| `autoescape` | boolean | `true` | Enable auto-escaping |
| `filters` | object | `{}` | Custom Nunjucks filters |
| `globals` | object | `{}` | Custom Nunjucks globals |

### Example

```javascript
export default {
  templates: {
    directory: 'templates',
    cache: true,
    autoescape: true,
    filters: {
      kebabCase: (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
      pascalCase: (str) => str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase())
    },
    globals: {
      currentYear: new Date().getFullYear(),
      gitvanVersion: '2.0.0'
    }
  }
};
```

## Pack Configuration

### Pack Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `directory` | string | `'packs'` | Packs directory path |
| `registry` | string | `'https://registry.gitvan.dev'` | Pack registry URL |
| `cache` | boolean | `true` | Enable pack caching |
| `autoUpdate` | boolean | `false` | Automatically update packs |

### Example

```javascript
export default {
  packs: {
    directory: 'packs',
    registry: 'https://registry.gitvan.dev',
    cache: true,
    autoUpdate: false
  }
};
```

## Daemon Configuration

### Daemon Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable daemon mode |
| `pollMs` | number | `1500` | Polling interval (ms) |
| `lookback` | number | `600` | Lookback window (seconds) |
| `maxPerTick` | number | `50` | Maximum events per tick |
| `restartPolicy` | string | `'always'` | Restart policy |

### Example

```javascript
export default {
  daemon: {
    enabled: true,
    pollMs: 1500,
    lookback: 600,
    maxPerTick: 50,
    restartPolicy: 'always'
  }
};
```

## Security Configuration

### Security Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowlist` | string[] | `[]` | Allowed file paths |
| `sandbox` | boolean | `true` | Enable sandboxing |
| `maxFileSize` | number | `10485760` | Maximum file size (10MB) |
| `allowedExtensions` | string[] | `['.js', '.mjs', '.ts', '.json']` | Allowed file extensions |

### Example

```javascript
export default {
  security: {
    allowlist: [
      'src/**',
      'templates/**',
      'jobs/**',
      'events/**'
    ],
    sandbox: true,
    maxFileSize: 10485760,
    allowedExtensions: ['.js', '.mjs', '.ts', '.json', '.md']
  }
};
```

## Performance Configuration

### Performance Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cache` | boolean | `true` | Enable caching |
| `parallel` | boolean | `true` | Enable parallel processing |
| `maxConcurrency` | number | `10` | Maximum concurrent operations |
| `memoryLimit` | string | `'512MB'` | Memory limit |

### Example

```javascript
export default {
  performance: {
    cache: true,
    parallel: true,
    maxConcurrency: 10,
    memoryLimit: '512MB'
  }
};
```

## Examples

### Development Configuration

```javascript
// gitvan.config.js
export default {
  debug: true,
  
  git: {
    autoInit: true,
    defaultBranch: 'main',
    hooks: {
      enabled: true,
      preCommit: true,
      postCommit: true,
      prePush: false
    }
  },
  
  ai: {
    provider: 'ollama',
    model: 'qwen3-coder:30b',
    baseURL: 'http://127.0.0.1:11434',
    timeout: 60000,
    temperature: 0.8
  },
  
  jobs: {
    directory: 'jobs',
    concurrency: 3,
    timeout: 600000,
    retries: 1
  },
  
  templates: {
    directory: 'templates',
    cache: false,
    autoescape: true
  },
  
  daemon: {
    enabled: false
  }
};
```

### Production Configuration

```javascript
// gitvan.config.js
export default {
  debug: false,
  
  git: {
    autoInit: true,
    defaultBranch: 'main',
    hooks: {
      enabled: true,
      preCommit: true,
      postCommit: true,
      prePush: true
    }
  },
  
  ai: {
    provider: 'openai',
    model: 'qwen3-coder:30b',
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
    temperature: 0.7
  },
  
  jobs: {
    directory: 'jobs',
    concurrency: 10,
    timeout: 300000,
    retries: 3
  },
  
  events: {
    directory: 'events',
    polling: {
      enabled: true,
      interval: 1000,
      lookback: 300
    }
  },
  
  templates: {
    directory: 'templates',
    cache: true,
    autoescape: true
  },
  
  packs: {
    directory: 'packs',
    registry: 'https://registry.gitvan.dev',
    cache: true,
    autoUpdate: true
  },
  
  daemon: {
    enabled: true,
    pollMs: 1000,
    lookback: 300,
    maxPerTick: 100,
    restartPolicy: 'always'
  },
  
  security: {
    allowlist: [
      'src/**',
      'templates/**',
      'jobs/**',
      'events/**'
    ],
    sandbox: true,
    maxFileSize: 52428800,
    allowedExtensions: ['.js', '.mjs', '.ts', '.json', '.md']
  },
  
  performance: {
    cache: true,
    parallel: true,
    maxConcurrency: 20,
    memoryLimit: '1GB'
  }
};
```

### CI/CD Configuration

```javascript
// gitvan.config.js
export default {
  debug: false,
  
  git: {
    autoInit: false,
    defaultBranch: 'main',
    hooks: {
      enabled: false
    }
  },
  
  ai: {
    provider: 'openai',
    model: 'qwen3-coder:30b',
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 15000,
    temperature: 0.3
  },
  
  jobs: {
    directory: 'jobs',
    concurrency: 5,
    timeout: 180000,
    retries: 2
  },
  
  events: {
    directory: 'events',
    polling: {
      enabled: false
    }
  },
  
  templates: {
    directory: 'templates',
    cache: true,
    autoescape: true
  },
  
  daemon: {
    enabled: false
  },
  
  security: {
    allowlist: [
      'src/**',
      'templates/**',
      'jobs/**'
    ],
    sandbox: true,
    maxFileSize: 10485760,
    allowedExtensions: ['.js', '.mjs', '.ts', '.json']
  }
};
```

### Custom Provider Configuration

```javascript
// gitvan.config.js
export default {
  ai: {
    provider: 'custom',
    model: 'my-enterprise-model',
    baseURL: 'https://ai.mycompany.com/api',
    apiKey: process.env.ENTERPRISE_AI_KEY,
    timeout: 45000,
    maxTokens: 8000,
    temperature: 0.5,
    systemPrompt: 'You are an enterprise coding assistant specialized in our codebase patterns.'
  },
  
  packs: {
    directory: 'packs',
    registry: 'https://packs.mycompany.com',
    cache: true,
    autoUpdate: false
  },
  
  security: {
    allowlist: [
      'src/**',
      'templates/**',
      'jobs/**',
      'events/**',
      'company-templates/**'
    ],
    sandbox: true,
    maxFileSize: 104857600,
    allowedExtensions: ['.js', '.mjs', '.ts', '.json', '.md', '.yaml', '.yml']
  }
};
```

This comprehensive configuration reference provides all the options available in GitVan v2, with detailed explanations, types, defaults, and practical examples for different use cases.
