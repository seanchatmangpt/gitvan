# GitVan v2 Component Architecture

This document provides detailed technical specifications for GitVan's core components, their interactions, and implementation details.

## Core Runtime Components

### 1. Context Management (`src/composables/ctx.mjs`)

The context system provides execution isolation and state management:

```javascript
// Global context using unctx
const GV = createContext()

export function withGitVan(ctx, fn) {
  return GV.call(ctx, fn)  // Execute within context
}

export function useGitVan() {
  return GV.use()          // Access current context
}
```

**Features:**
- **Isolation**: Each execution context is completely isolated
- **Context Binding**: Automatic context propagation through async operations
- **State Management**: Centralized state access pattern
- **Memory Safety**: Automatic cleanup when context ends

### 2. Git Operations Engine (`src/composables/git.mjs`)

Low-level Git operations with deterministic behavior:

```javascript
// Deterministic Git Environment
const env = {
  ...process.env,
  TZ: "UTC",     // Force UTC timezone
  LANG: "C",     // Force C locale
}

async function runGit(args, { cwd, env, maxBuffer }) {
  const { stdout } = await execFileAsync("git", args, {
    cwd, env, maxBuffer: 12 * 1024 * 1024
  })
  return stdout.trim()
}
```

**Capabilities:**
- **POSIX-first Design**: No external Git library dependencies
- **Error Handling**: Graceful handling of empty repositories
- **Atomic Operations**: Git refs for locking, notes for receipts
- **Performance**: Optimized for high-frequency operations

**Core Methods:**
```javascript
const git = useGit()

// Repository Information
await git.branch()           // Current branch name
await git.head()             // Current HEAD SHA
await git.repoRoot()         // Repository root path
await git.worktreeGitDir()   // Git directory path

// Read Operations
await git.log(format, extra) // Commit history
await git.revList(args)      // Revision listing
await git.isAncestor(a, b)   // Ancestry check

// Write Operations
await git.add(paths)         // Stage files
await git.commit(message)    // Create commit
await git.tag(name, msg)     // Create tag

// Notes System (Receipts)
await git.noteAdd(ref, msg, sha)    // Add execution note
await git.noteShow(ref, sha)        // Read execution note

// Atomic References (Locks)
await git.updateRefCreate(ref, sha) // Atomic ref creation
```

### 3. Template Engine (`src/composables/template.mjs`)

Nunjucks-based template system with configuration discovery:

```javascript
export async function useTemplate(opts = {}) {
  const binding = await bindContext(opts)
  const env = getCachedEnvironment({
    paths: binding.paths,
    autoescape: binding.autoescape,
    noCache: binding.noCache,
  })

  return {
    render(templateName, data),          // File-based rendering
    renderString(templateStr, data),     // String-based rendering
    renderToFile(template, outPath, data) // Direct file output
  }
}
```

**Features:**
- **Config Discovery**: Automatic template path resolution
- **Inflection Filters**: Built-in text transformation filters
- **Context Integration**: Automatic Git context injection
- **Performance**: Template caching with cache invalidation

### 4. Command Execution (`src/composables/exec.mjs`)

Secure command execution with context awareness:

```javascript
export function useExec() {
  return {
    async cli(cmd, args, env),     // CLI command execution
    async js(module, export, input), // JavaScript module execution
    async tmpl(spec)               // Template-based execution
  }
}
```

## Job Execution Engine

### 1. Job Definition System (`src/runtime/define-job.mjs`)

Structured job definition and validation:

```javascript
export function defineJob(spec) {
  return {
    name: spec.name,
    description: spec.description,
    async run(context) {
      // Job execution logic with full context access
      return { ok: true, result: /* execution result */ }
    }
  }
}
```

### 2. Job Runner (`src/jobs/runner.mjs`)

Orchestrates job execution with context management:

```javascript
export async function runJobWithContext(ctx, jobMod, payload = {}) {
  return withGitVan(ctx, async () => {
    const job = jobMod.default || jobMod
    if (typeof job.run === 'function') {
      return await job.run({ payload, ctx })
    }
    return { ok: true, warning: 'No run method found' }
  })
}
```

**Execution Flow:**
1. Context establishment
2. Job validation
3. Resource allocation
4. Execution monitoring
5. Result processing
6. Cleanup operations

## Event Router and Matchers

### 1. Event Discovery (`src/runtime/events.mjs`)

File-system based event pattern discovery:

```javascript
export function discoverEvents(eventsDir) {
  const events = []
  scanDirectory(eventsDir, '', events)
  return events
}

function parseEventPath(relativePath) {
  const parts = relativePath.replace(/\.mjs$/, '').split('/')
  const [category, ...pathParts] = parts
  const pattern = pathParts.join('/')

  switch (category) {
    case 'cron':     return { type: 'cron', pattern: pattern.replace(/_/g, ' ') }
    case 'merge-to': return { type: 'merge', pattern, branch: pattern }
    case 'push-to':  return { type: 'push', pattern, branch: pattern }
    case 'path-changed': return { type: 'path', pattern: normalizePathPattern(pattern) }
    case 'tag':      return { type: 'tag', pattern }
    case 'message':  return { type: 'message', pattern, regex: new RegExp(pattern) }
    case 'author':   return { type: 'author', pattern, regex: new RegExp(pattern) }
  }
}
```

### 2. Pattern Matchers (`src/router/matchers/`)

Specialized pattern matching for different event types:

#### Path Matcher (`path.mjs`)
```javascript
function matchesPathPattern(filePath, pattern) {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')        // ** matches everything
    .replace(/\*/g, '[^/]*')       // * matches anything except /
    .replace(/\?/g, '[^/]')        // ? matches single char except /

  return new RegExp(`^${regexPattern}$`).test(filePath)
}
```

#### Tag Matcher (`tag.mjs`)
```javascript
function matchesTagPattern(tag, pattern) {
  if (pattern === 'semver') {
    return /^v?\d+\.\d+\.\d+/.test(tag)  // Semantic versioning
  }
  return matchesGlobPattern(tag, pattern)
}
```

#### Merge Matcher (`merge.mjs`)
```javascript
function isMergeToTarget(commit, targetBranch) {
  // Detect merge commits targeting specific branches
  return commit.parents.length > 1 &&
         commit.targetBranch === targetBranch
}
```

## Lock System Architecture

### 1. Distributed Locking (`src/runtime/locks.mjs`)

Git-native atomic locking using references:

```javascript
export function acquireLock(key, sha) {
  const git = useGit()
  const ref = `refs/gitvan/locks/${key}`

  try {
    // Atomic creation - fails if ref already exists
    const success = git.updateRefCreate(ref, sha)
    return success ? ref : null
  } catch {
    return null  // Lock acquisition failed
  }
}

export function worktreeLockRef(locksRoot, wtId, eventId, sha) {
  const cleanEventId = eventId.replace(/[\\/]/g, '-')
  return `${locksRoot}/${wtId}/${cleanEventId}/${sha}`
}
```

**Lock Hierarchy:**
```
refs/gitvan/locks/
├── worktree-main/
│   ├── merge-to-main/
│   │   └── abc123def456...     # Lock for specific commit
│   └── path-changed-src/
│       └── def456abc123...     # Lock for specific commit
└── worktree-feature/
    └── push-to-feature/
        └── 789abc012def...     # Lock for specific commit
```

### 2. Lock Lifecycle Management

```javascript
// Lock Acquisition Pattern
const lockRef = worktreeLockRef(locksRoot, worktreeId, eventId, sha)
const acquired = acquireLock(lockRef, sha)

if (!acquired) {
  console.debug(`Lock already held for ${eventId}@${sha}`)
  return  // Skip execution
}

try {
  // Protected execution
  await executeEvent(event, context)
} finally {
  // Always release lock
  releaseLock(lockRef)
}
```

## Receipt System Implementation

### 1. Execution Receipts (`src/runtime/receipt.mjs`)

Git notes-based audit trail:

```javascript
export function writeReceipt(data) {
  const receipt = {
    role: 'receipt',
    id: data.id,
    status: data.status,           // OK | ERROR
    ts: new Date().toISOString(),
    commit: data.commit,
    action: data.action,           // job | cli | tmpl
    artifact: data.artifact,       // Output file paths
    meta: {
      ...data.meta,
      duration: data.result?.duration,
      exitCode: data.result?.exitCode
    }
  }

  const git = useGit()
  const receiptJson = JSON.stringify(receipt, null, 2)

  try {
    git.noteAppend(resultsRef, receiptJson, commit)
  } catch {
    git.noteAdd(resultsRef, receiptJson, commit)
  }
}
```

### 2. Receipt Query System

```javascript
export function readReceipts(commit = 'HEAD', resultsRef = 'refs/notes/gitvan/results') {
  const git = useGit()
  const notesContent = git.noteShow(resultsRef, commit)
  const receipts = []

  // Parse multiple receipts from notes
  const receiptTexts = notesContent.split(/(?=\{[^}]*"role":\s*"receipt")/g)

  for (const receiptText of receiptTexts) {
    const receipt = JSON.parse(receiptText.trim())
    if (receipt.role === 'receipt') {
      receipts.push(receipt)
    }
  }

  return receipts
}

export function hasReceipt(eventId, commit) {
  const receipts = readReceipts(commit)
  return receipts.some(r => r.id === eventId)
}
```

## Storage Adapters

### 1. Git-Native Storage

Primary storage through Git's native systems:

- **Refs**: Atomic locks and state markers
- **Notes**: Execution receipts and audit logs
- **Objects**: Template cache and artifacts
- **Worktrees**: Execution isolation

### 2. File System Storage

Secondary storage for runtime data:

```javascript
// Configuration files
├── gitvan.config.js         # Project configuration
├── .gitvan/
│   ├── cache/              # Template compilation cache
│   ├── locks/              # Legacy file-based locks
│   └── logs/               # Execution logs

// Event definitions
├── events/
│   ├── cron/              # Time-based events
│   ├── merge-to/          # Merge events
│   ├── push-to/           # Push events
│   └── path-changed/      # File change events

// Templates
├── templates/
│   ├── workflows/         # Workflow templates
│   ├── notifications/     # Notification templates
│   └── reports/           # Report templates
```

## Configuration Management

### 1. Configuration Loader (`src/config/loader.mjs`)

Hierarchical configuration system using `c12`:

```javascript
export async function loadOptions(opts = {}) {
  const { config } = await loadConfig({
    name: 'gitvan',
    cwd: opts.rootDir || process.cwd(),
    configFile: opts.configFile,
    defaultConfig: defaults,
    overrides: opts
  })

  return config
}
```

### 2. Runtime Configuration (`src/config/runtime-config.mjs`)

Dynamic configuration resolution:

```javascript
export function resolveRuntimeConfig(baseConfig, context) {
  return defu(
    context.overrides,        // Runtime overrides
    context.env,              // Environment variables
    baseConfig,               // Base configuration
    defaults                  // Built-in defaults
  )
}
```

## Schema Validation

### 1. Zod Schemas (`src/schemas/`)

Type-safe validation for all data structures:

```javascript
// Event Schema
export const EventSchema = z.object({
  id: z.string(),
  type: z.enum(['cron', 'merge', 'push', 'path', 'tag', 'message', 'author']),
  pattern: z.string(),
  run: z.function().optional(),
  job: z.string().optional()
})

// Job Schema
export const JobSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  run: z.function()
})

// Receipt Schema
export const ReceiptSchema = z.object({
  role: z.literal('receipt'),
  id: z.string(),
  status: z.enum(['OK', 'ERROR']),
  ts: z.string().datetime(),
  commit: z.string(),
  action: z.string(),
  meta: z.object({}).passthrough()
})
```

## Performance Optimizations

### 1. Template Caching

```javascript
// Global template environment cache
const envCache = new Map()

export function getCachedEnvironment(opts) {
  const key = JSON.stringify(opts)

  if (!envCache.has(key)) {
    const env = new nunjucks.Environment(
      new nunjucks.FileSystemLoader(opts.paths),
      { autoescape: opts.autoescape, noCache: opts.noCache }
    )
    setupInflectionFilters(env)
    envCache.set(key, env)
  }

  return envCache.get(key)
}
```

### 2. Event Processing Optimization

```javascript
// Batch processing with limits
const maxPerTick = opts.daemon?.maxPerTick || 50
let processed = 0

for (const sha of recentCommits) {
  if (processed >= maxPerTick) break

  for (const event of events) {
    if (processed >= maxPerTick) break

    if (await eventMatches(event, sha)) {
      await processEvent(event, sha)
      processed++
    }
  }
}
```

### 3. Memory Management

```javascript
// Context cleanup after execution
export async function runJobWithContext(ctx, jobMod, payload) {
  try {
    return await withGitVan(ctx, async () => {
      return await jobMod.run({ payload, ctx })
    })
  } finally {
    // Context automatically cleaned up by unctx
    cleanupResources(ctx)
  }
}
```

This component architecture ensures GitVan v2 delivers enterprise-grade reliability, performance, and maintainability while maintaining simplicity in its core abstractions.