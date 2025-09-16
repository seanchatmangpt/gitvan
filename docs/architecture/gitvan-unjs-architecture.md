# GitVan: The Nitro for Git Workflows

## Vision
GitVan becomes the **UnJS-powered universal Git workflow toolkit** - the "Nitro" for Git-native automation, supporting all 43 workflow patterns with maximum Git CLI integration.

---

## Core UnJS Modules Integration

### 1. **Foundation Layer**

```javascript
// GitVan leverages UnJS ecosystem like Nitro does
{
  "dependencies": {
    // Core UnJS
    "citty": "^0.1.6",        // CLI framework (replaces basic argv parsing)
    "consola": "^3.2.3",       // Elegant console logging
    "defu": "^6.1.4",          // Config merging
    "h3": "^1.11.1",           // HTTP server for webhook/API mode
    "hookable": "^5.5.3",      // Plugin hooks system
    "listhen": "^1.7.2",       // Elegant HTTP listener
    "ofetch": "^1.3.3",        // Better fetch for external integrations
    "pathe": "^1.1.2",         // Path utilities
    "ufo": "^1.5.3",           // URL utilities
    "unctx": "^2.3.1",         // Context management

    // Build & Config
    "c12": "^1.10.0",          // Smart config loader
    "giget": "^1.2.3",         // Template/preset downloading
    "mlly": "^1.6.1",          // Module analysis
    "unbuild": "^2.0.0",       // Build system

    // Storage & Cache
    "unstorage": "^1.10.2",    // Universal storage layer
    "cacache": "^18.0.2",      // Content-addressable cache

    // Utilities
    "destr": "^2.0.3",         // Safe JSON parsing
    "ohash": "^1.1.3",         // Object hashing
    "radix3": "^1.1.0",        // Route matching
    "unimport": "^3.7.1",      // Auto-imports
    "scule": "^1.3.0"          // String utilities
  }
}
```

### 2. **Architecture Layers**

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI (citty)                          │
├─────────────────────────────────────────────────────────────┤
│                    API/Webhook Server (h3)                   │
├─────────────────────────────────────────────────────────────┤
│                    GitVan Core Runtime                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Workflow │  Event   │   Job    │  Lock    │ Receipt  │  │
│  │ Engine   │  Router  │ Executor │  System  │  System  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Plugin System (hookable)                  │
├─────────────────────────────────────────────────────────────┤
│                    Storage Layer (unstorage)                 │
├─────────────────────────────────────────────────────────────┤
│                     Git Abstraction Layer                    │
│                    (isomorphic-git + CLI)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 43 Workflow Patterns Implementation

### Pattern Categories with Git Primitives

```javascript
// gitvan.config.js - Pattern definitions
export default defineConfig({
  patterns: {
    // 1. Basic Control Flow (7 patterns)
    sequence: {
      primitive: 'commits',
      implementation: 'linear commit chain'
    },
    parallel: {
      primitive: 'branches',
      implementation: 'parallel branch execution'
    },
    conditional: {
      primitive: 'refs + tags',
      implementation: 'conditional ref checking'
    },
    iteration: {
      primitive: 'rev-list',
      implementation: 'commit iteration'
    },

    // 2. Advanced Branching (6 patterns)
    exclusiveChoice: {
      primitive: 'branch divergence',
      implementation: 'XOR gateway via refs'
    },
    simpleJoin: {
      primitive: 'merge',
      implementation: 'fast-forward or merge commit'
    },
    multipleChoice: {
      primitive: 'cherry-pick',
      implementation: 'selective commit application'
    },
    synchronizingJoin: {
      primitive: 'octopus merge',
      implementation: 'multi-branch merge'
    },
    multiMerge: {
      primitive: 'merge + rebase',
      implementation: 'complex merge strategies'
    },
    discriminator: {
      primitive: 'first-parent',
      implementation: 'mainline selection'
    },

    // 3. Multiple Instances (7 patterns)
    multiInstanceSequential: {
      primitive: 'linear commits',
      implementation: 'foreach commit in range'
    },
    multiInstanceParallel: {
      primitive: 'worktrees',
      implementation: 'parallel worktree execution'
    },
    multiInstanceSync: {
      primitive: 'atomic refs',
      implementation: 'synchronized ref updates'
    },
    multiInstanceNoSync: {
      primitive: 'independent branches',
      implementation: 'async branch operations'
    },

    // 4. State-based (5 patterns)
    deferredChoice: {
      primitive: 'symbolic-ref',
      implementation: 'runtime ref resolution'
    },
    interleavedRouting: {
      primitive: 'alternating commits',
      implementation: 'round-robin on branches'
    },
    milestone: {
      primitive: 'annotated tags',
      implementation: 'signed milestone tags'
    },
    criticalSection: {
      primitive: 'ref locks',
      implementation: 'atomic ref operations'
    },

    // 5. Cancellation (5 patterns)
    cancel: {
      primitive: 'reset',
      implementation: 'reset --hard'
    },
    cancelRegion: {
      primitive: 'revert range',
      implementation: 'revert commit range'
    },
    cancelMultiple: {
      primitive: 'interactive rebase',
      implementation: 'rebase -i drop'
    },

    // 6. Compensation (4 patterns)
    compensate: {
      primitive: 'revert',
      implementation: 'revert commit'
    },
    compensateRegion: {
      primitive: 'revert sequence',
      implementation: 'revert A..B'
    },

    // 7. Triggers & Events (5 patterns)
    messageTrigger: {
      primitive: 'commit message',
      implementation: 'message pattern matching'
    },
    timerTrigger: {
      primitive: 'cron + refs',
      implementation: 'time-based ref checks'
    },
    signalTrigger: {
      primitive: 'notes',
      implementation: 'note-based signaling'
    },

    // 8. Other Patterns (4 patterns)
    arbitraryLoop: {
      primitive: 'rev-walk',
      implementation: 'custom traversal'
    },
    implicitTermination: {
      primitive: 'dangling commits',
      implementation: 'unreachable detection'
    },
    explicitTermination: {
      primitive: 'signed tags',
      implementation: 'termination markers'
    },
    transientTrigger: {
      primitive: 'hooks',
      implementation: 'ephemeral hooks'
    }
  }
})
```

---

## GitVan Nitro-Style Configuration

### 1. **Main Config (c12 powered)**

```javascript
// gitvan.config.ts
export default defineConfig({
  // Preset selection (like Nitro)
  preset: 'github-actions', // or 'gitlab-ci', 'local', 'docker', etc.

  // Storage configuration (unstorage)
  storage: {
    cache: {
      driver: 'fs',
      base: '.gitvan/cache'
    },
    state: {
      driver: 'git-notes',
      ref: 'refs/gitvan/state'
    },
    logs: {
      driver: 'fs',
      base: '.gitvan/logs'
    }
  },

  // Hooks (hookable)
  hooks: {
    'job:before': async (job) => {},
    'job:after': async (job, result) => {},
    'workflow:error': async (error) => {},
    'git:commit': async (sha) => {},
    'pattern:execute': async (pattern, context) => {}
  },

  // Routes (radix3 powered)
  routes: {
    '/api/**': 'api/',
    '/webhooks/github': 'webhooks/github.ts',
    '/dashboard': 'dashboard/index.html'
  },

  // Auto-imports (unimport)
  imports: {
    dirs: ['./utils', './patterns'],
    presets: ['gitvan', 'git-utils']
  },

  // Workflow patterns
  patterns: {
    enabled: ['all'], // or specific patterns
    customPatterns: './patterns'
  }
})
```

### 2. **Plugin System (like Nitro plugins)**

```javascript
// plugins/github.js
export default defineGitVanPlugin({
  name: 'github-integration',

  setup(gitvan) {
    // Hook into lifecycle
    gitvan.hook('workflow:start', async (workflow) => {
      const status = await $fetch('/repos/owner/repo/statuses/' + workflow.sha, {
        method: 'POST',
        body: {
          state: 'pending',
          description: 'GitVan workflow started'
        }
      })
    })

    // Add custom patterns
    gitvan.patterns.register('github-pr-merge', {
      primitive: 'pull-request',
      implementation: async (context) => {
        // Custom GitHub-specific pattern
      }
    })

    // Extend storage
    gitvan.storage.mount('/github', {
      driver: 'github-api',
      token: process.env.GITHUB_TOKEN
    })
  }
})
```

### 3. **Presets (like Nitro presets)**

```javascript
// presets/github-actions.js
export default definePreset({
  extends: 'base',

  storage: {
    cache: {
      driver: 'github-actions-cache'
    }
  },

  hooks: {
    'workflow:complete': async (result) => {
      // GitHub Actions specific reporting
      console.log(`::set-output name=result::${result}`)
    }
  },

  env: {
    GITVAN_CI: 'github-actions',
    GITVAN_REPO: process.env.GITHUB_REPOSITORY,
    GITVAN_SHA: process.env.GITHUB_SHA
  }
})
```

---

## CLI with Citty

```javascript
// src/cli/index.js
import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: {
    name: 'gitvan',
    description: 'The Nitro for Git Workflows'
  },
  subCommands: {
    run: {
      meta: { description: 'Run a workflow' },
      args: {
        pattern: {
          type: 'string',
          description: 'Workflow pattern to execute',
          required: true,
          valueHint: '43 patterns available'
        },
        preset: {
          type: 'string',
          description: 'Preset to use',
          default: 'auto'
        }
      },
      run({ args }) {
        return runWorkflow(args.pattern, { preset: args.preset })
      }
    },

    dev: {
      meta: { description: 'Start development server' },
      async run() {
        const { listen } = await import('listhen')
        const { createApp } = await import('./app')

        const app = await createApp()
        await listen(app, {
          port: 3000,
          showURL: true
        })
      }
    },

    build: {
      meta: { description: 'Build for production' },
      args: {
        preset: {
          type: 'string',
          description: 'Target preset'
        }
      },
      async run({ args }) {
        const { build } = await import('unbuild')
        await build('.', {
          preset: args.preset,
          rollup: {
            inlineDependencies: true
          }
        })
      }
    }
  }
})

runMain(main)
```

---

## Storage Abstraction with Unstorage

```javascript
// src/storage.js
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'
import redisDriver from 'unstorage/drivers/redis'

// Custom Git driver for unstorage
const gitNotesDriver = defineDriver({
  name: 'git-notes',

  async get(key) {
    const { git } = useGit()
    try {
      const note = await git.noteShow(`refs/gitvan/${key}`)
      return destr(note)
    } catch {
      return null
    }
  },

  async set(key, value) {
    const { git } = useGit()
    await git.noteAdd(`refs/gitvan/${key}`, JSON.stringify(value))
  },

  async remove(key) {
    const { git } = useGit()
    await git.delRef(`refs/gitvan/${key}`)
  }
})

export const storage = createStorage({
  driver: gitNotesDriver
})

// Mount additional storages
storage.mount('/cache', { driver: fsDriver({ base: '.gitvan/cache' }) })
storage.mount('/logs', { driver: fsDriver({ base: '.gitvan/logs' }) })
```

---

## HTTP API with h3

```javascript
// src/app.js
import { createApp, eventHandler, createRouter } from 'h3'
import { handleCors, defineEventHandler } from 'h3'

export function createGitVanApp() {
  const app = createApp()
  const router = createRouter()

  // Middleware
  app.use(handleCors())

  // API Routes
  router.get('/api/workflows', eventHandler(async () => {
    const workflows = await storage.getKeys('/workflows')
    return { workflows }
  }))

  router.post('/api/workflows/:pattern', eventHandler(async (event) => {
    const pattern = event.context.params.pattern
    const body = await readBody(event)

    const result = await executePattern(pattern, body)
    return { result }
  }))

  // Webhooks
  router.post('/webhooks/github', eventHandler(async (event) => {
    const payload = await readBody(event)
    const signature = event.node.req.headers['x-hub-signature-256']

    if (!verifyGitHubWebhook(payload, signature)) {
      throw createError({ statusCode: 401 })
    }

    await handleGitHubEvent(payload)
    return { ok: true }
  }))

  app.use(router)
  return app
}
```

---

## Development Experience Features

### 1. **Auto-imports with unimport**

```javascript
// gitvan/auto-imports.d.ts
export {}
declare global {
  // Git operations
  const useGit: typeof import('./composables')['useGit']
  const $git: typeof import('./utils')['$git']

  // Workflow patterns
  const sequence: typeof import('./patterns')['sequence']
  const parallel: typeof import('./patterns')['parallel']

  // Utils
  const $fetch: typeof import('ofetch')['$fetch']
  const consola: typeof import('consola')['default']
  const defu: typeof import('defu')['default']
}
```

### 2. **Type Safety**

```typescript
// types/gitvan.d.ts
import type { Hookable } from 'hookable'
import type { Storage } from 'unstorage'

export interface GitVanApp {
  storage: Storage
  hooks: Hookable<GitVanHooks>
  patterns: PatternRegistry
}

export interface GitVanHooks {
  'job:before': (job: Job) => void | Promise<void>
  'job:after': (job: Job, result: JobResult) => void | Promise<void>
  'pattern:execute': (pattern: Pattern, context: Context) => void | Promise<void>
  'git:commit': (sha: string) => void | Promise<void>
}
```

### 3. **Watch Mode with MLly**

```javascript
// Development hot reload
import { loadModule, analyzeModule } from 'mlly'

async function watchAndReload() {
  const watcher = watch(['jobs/**/*.js', 'patterns/**/*.js'])

  watcher.on('change', async (file) => {
    const analysis = await analyzeModule(file)

    if (analysis.exports.includes('default')) {
      const module = await loadModule(file, { force: true })
      gitvan.reload(file, module.default)
    }
  })
}
```

---

## Deployment Presets

### GitHub Actions
```yaml
# Auto-detected preset
name: GitVan Workflow
on: [push]
jobs:
  gitvan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx gitvan run sequence --preset github-actions
```

### Docker
```dockerfile
FROM node:20-slim
RUN npm i -g gitvan
CMD ["gitvan", "run", "--preset", "docker"]
```

### Edge/Serverless
```javascript
// Cloudflare Workers, Vercel Edge, etc.
export default definePreset({
  extends: 'edge',
  storage: {
    driver: 'cloudflare-kv'
  }
})
```

---

## Benefits of UnJS Architecture

1. **Modular & Composable**: Each UnJS package solves one problem well
2. **Universal Deployment**: Works everywhere (Node, Edge, Browser)
3. **Developer Experience**: Auto-imports, hot reload, TypeScript
4. **Performance**: Bundled dependencies, tree-shaking
5. **Ecosystem**: Leverage 60+ battle-tested UnJS packages
6. **Extensible**: Hooks, plugins, presets, custom drivers
7. **Standards-based**: Web APIs, ESM, TypeScript

## Comparison to Nitro

| Feature | Nitro | GitVan |
|---------|-------|---------|
| Domain | HTTP Servers | Git Workflows |
| Primitives | Routes, Middleware | Commits, Branches, Refs |
| Patterns | REST, GraphQL | 43 Workflow Patterns |
| Storage | KV, Database | Git Notes, Refs, Objects |
| Triggers | HTTP Requests | Git Events, Webhooks |
| Output | Server Bundle | Workflow Results |

## Next Steps

1. Replace current implementation with UnJS modules
2. Implement pattern registry with radix3 routing
3. Add hookable plugin system
4. Create unstorage drivers for Git
5. Build CLI with citty
6. Add h3 API server mode
7. Create preset system for CI/CD platforms
8. Package with unbuild

This architecture makes GitVan a true "Nitro for Git" - a universal, extensible, and powerful toolkit for Git-native workflow automation.