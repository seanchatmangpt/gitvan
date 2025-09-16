# API Contracts

## Composables API

### useGit()

**Purpose**: Provides git operations within the current repository context.

**Returns**:
```javascript
{
  root: string,              // Repository root path
  head: () => string,        // Current HEAD commit SHA
  branch: () => string,      // Current branch name
  run: (args: string) => string,  // Execute git command
  note: (ref: string, msg: string, sha?: string) => void,      // Add git note
  appendNote: (ref: string, msg: string, sha?: string) => void, // Append to git note
  setRef: (ref: string, sha: string) => void,    // Create/update reference
  delRef: (ref: string) => void,                 // Delete reference
  listRefs: (prefix: string) => string[]         // List references by prefix
}
```

**Usage**:
```javascript
const git = useGit()
const currentBranch = git.branch()
const commits = git.run('log --oneline -10').split('\n')
git.note('refs/notes/deployments', `Deployed at ${Date.now()}`)
```

### useTemplate()

**Purpose**: Provides Nunjucks template rendering with git context.

**Parameters**:
```javascript
opts?: {
  autoescape?: boolean,    // HTML autoescape (default: false)
  paths?: string[]         // Additional template search paths
}
```

**Returns**:
```javascript
{
  render: (template: string, data?: object) => string,
  renderToFile: (template: string, out: string, data?: object) => { path: string, bytes: number },
  env: Environment         // Raw Nunjucks environment
}
```

**Context Variables**:
- `nowISO`: Current timestamp in ISO format
- `git`: Full git context object
- All data passed to render functions

**Usage**:
```javascript
const t = useTemplate()
const changelog = t.render('changelog.njk', { commits: [...] })
t.renderToFile('release.njk', 'dist/RELEASE.md', { version: '1.2.3' })
```

### useExec()

**Purpose**: Provides execution utilities for CLI, JS modules, and templates.

**Returns**:
```javascript
{
  cli: (cmd: string, args?: string[], env?: object) => ExecResult,
  js: (modulePath: string, exportName?: string, input?: object) => Promise<ExecResult>,
  tmpl: (spec: TemplateSpec) => ExecResult
}
```

**ExecResult**:
```javascript
{
  ok: boolean,
  code?: number,      // Exit code for CLI
  stdout?: string,    // Standard output
  stderr?: string,    // Standard error (CLI only)
  artifact?: string,  // Output file path (tmpl only)
  meta?: object      // Additional metadata
}
```

**TemplateSpec**:
```javascript
{
  template: string,     // Template path
  out?: string,         // Output file (optional)
  data?: object,        // Template data
  autoescape?: boolean, // HTML autoescape
  paths?: string[]      // Additional search paths
}
```

**Usage**:
```javascript
const exec = useExec()

// Run CLI command
const result = exec.cli('npm', ['test'])

// Execute JS module
const output = await exec.js('./scripts/build.mjs', 'build', { env: 'production' })

// Render template
const doc = exec.tmpl({
  template: 'api-docs.njk',
  out: 'dist/api.html',
  data: { version: '2.0.0' }
})
```

### useGitVan()

**Purpose**: Access the complete gitvan context (low-level API).

**Returns**:
```javascript
{
  root: string,           // Repository root
  head?: string,          // Current HEAD (if cached)
  branch?: string,        // Current branch (if cached)
  env: object,           // Environment variables
  now?: () => string,    // Timestamp function
  jobs: Map,             // Job registry
  llm?: object,          // LLM configuration
  payload?: object       // Event payload
}
```

## Job Definition API

### defineJob(definition)

**Purpose**: Creates a job with metadata and execution logic.

**Parameters**:
```javascript
{
  kind: 'atomic' | 'composite' | 'sequence' | 'parallel',
  meta?: {
    desc?: string,           // Job description
    schedule?: string,       // Cron expression
    timeout?: number,        // Timeout in milliseconds
    retry?: number,          // Retry attempts
    tags?: string[]          // Classification tags
  },
  run: (context) => Promise<JobResult> | JobResult,

  // For composite jobs
  steps?: JobStep[],

  // For atomic jobs with exec specs
  action?: ExecSpec
}
```

**JobResult**:
```javascript
{
  ok: boolean,
  error?: string,          // Error message if ok=false
  stdout?: string,         // Standard output
  artifact?: string,       // Generated file path
  meta?: object           // Additional metadata
}
```

**JobStep** (for composite jobs):
```javascript
{
  name?: string,
  exec: 'cli' | 'js' | 'llm' | 'job' | 'tmpl',
  // ... exec-specific properties
}
```

**Usage**:
```javascript
export default defineJob({
  kind: 'atomic',
  meta: {
    desc: 'Generate API documentation',
    schedule: '0 2 * * *',  // Daily at 2 AM
    tags: ['docs', 'api']
  },
  async run() {
    const git = useGit()
    const t = useTemplate()

    const commits = git.run('log --oneline -50').split('\n')
    t.renderToFile('changelog.njk', 'CHANGELOG.md', { commits })

    return { ok: true, artifact: 'CHANGELOG.md' }
  }
})
```

## Event System API

### File-Based Event Registration

Events are registered by file system convention in the `events/` directory:

**Cron Events**:
- `events/cron/0_2_*_*_*.mjs` → Runs daily at 2 AM
- Underscores represent spaces in cron expressions

**Git Events**:
- `events/merge-to/main.mjs` → Fires on merge to main branch
- `events/push-to/feature/*.mjs` → Fires on push to feature/* branches
- `events/tag/semver.mjs` → Fires on semantic version tags

**Path-Based Events**:
- `events/path-changed/src/**/*.js.mjs` → Fires when JS files in src/ change

**Message/Author Events**:
- `events/message/fix-*.mjs` → Fires on commit messages matching "fix-*"
- `events/author/user@domain.com.mjs` → Fires on commits by specific author

### Event Handler Contract

```javascript
// Option 1: Direct function
export default async function handler({ payload, git, meta }) {
  // Handle the event
  return { ok: true }
}

// Option 2: Job reference
export const job = 'deploy:production'

// Option 3: Inline exec
export const run = {
  exec: 'cli',
  cmd: 'npm',
  args: ['run', 'deploy']
}
```

## Execution Specs API

### CLI Execution
```javascript
{
  exec: 'cli',
  cmd: string,              // Command to execute
  args?: string[],          // Command arguments
  env?: object,             // Environment variables
  timeoutMs?: number        // Timeout in milliseconds
}
```

### JavaScript Module Execution
```javascript
{
  exec: 'js',
  module: string,           // Module path (relative to repo root)
  export?: string,          // Export name (default: 'default')
  input?: object,           // Input data passed to function
  timeoutMs?: number        // Timeout in milliseconds
}
```

### Template Execution
```javascript
{
  exec: 'tmpl',
  template: string,         // Template path (.njk file)
  data?: object,            // Template data
  out?: string,             // Output file path (optional)
  autoescape?: boolean,     // HTML autoescape
  paths?: string[]          // Additional search paths
}
```

### LLM Execution
```javascript
{
  exec: 'llm',
  model: string,            // Model name (e.g., 'llama2', 'codellama')
  prompt?: string,          // Prompt template
  input?: object,           // Input data
  options?: object,         // Model-specific options
  timeoutMs?: number        // Timeout in milliseconds
}
```

### Job Execution
```javascript
{
  exec: 'job',
  name: string              // Job name to execute
}
```

## Configuration API

### defineConfig(config)

**Purpose**: Define repository-wide gitvan configuration.

**Parameters**:
```javascript
{
  llm?: {
    baseURL: string,        // LLM API base URL
    defaultModel: string    // Default model name
  },
  git?: {
    defaultBranch: string,  // Default branch name
    noteRefs: {
      results: string,      // Ref for execution results
      locks: string         // Ref prefix for locks
    }
  },
  daemon?: {
    port: number,           // Daemon port
    logLevel: string        // Log level (debug, info, warn, error)
  },
  jobs?: {
    timeout: number,        // Default job timeout
    retry: number           // Default retry count
  }
}
```

### definePlugin(plugin)

**Purpose**: Define custom plugins for extending gitvan functionality.

**Parameters**:
```javascript
{
  name: string,
  hooks?: {
    'job:before'?: (context) => void,
    'job:after'?: (context, result) => void,
    'daemon:start'?: (config) => void,
    'daemon:stop'?: () => void
  },
  composables?: {
    [name: string]: () => object  // Custom composable functions
  },
  executors?: {
    [type: string]: (spec, context) => Promise<ExecResult>  // Custom exec types
  }
}
```

## Runtime Context API

### withGitVan(context, fn)

**Purpose**: Execute function within gitvan context scope.

**Parameters**:
- `context`: GitVan context object
- `fn`: Function to execute with access to composables

**Usage**:
```javascript
import { withGitVan } from 'gitvan/runtime'

const result = await withGitVan(ctx, async () => {
  const git = useGit()
  const commits = git.run('log --oneline -10')
  return commits
})
```

## Error Handling

All APIs follow consistent error patterns:

**Sync Operations**: Throw exceptions
**Async Operations**: Return `{ ok: false, error: string }`
**Composables**: Throw exceptions (caller should handle)
**Job Results**: Always return `{ ok: boolean, error?: string }`