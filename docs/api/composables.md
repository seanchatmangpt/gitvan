# GitVan v2 Composables API

GitVan composables provide a modern, context-aware API for Git operations, template rendering, and command execution. Built on [unctx](https://github.com/unjs/unctx) for proper async context management.

## Table of Contents

- [Context Management](#context-management)
- [Git Operations - useGit()](#git-operations---usegit)
- [Template Rendering - useTemplate()](#template-rendering---usetemplate)
- [Command Execution - useExec()](#command-execution---useexec)

## Context Management

GitVan uses unctx for context management, ensuring proper isolation and data flow across async operations.

### withGitVan(ctx, fn)

Execute a function within a GitVan context.

```javascript
import { withGitVan } from 'gitvan/composables'

const result = await withGitVan({
  cwd: '/path/to/repo',
  env: { CUSTOM_VAR: 'value' },
  now: () => '2024-01-01T00:00:00.000Z'
}, async () => {
  // Your code here has access to context
  const git = useGit()
  return await git.head()
})
```

**Parameters:**
- `ctx` - Context object with optional properties:
  - `cwd` - Working directory (defaults to `process.cwd()`)
  - `env` - Environment variables
  - `now` - Function returning current ISO timestamp

### useGitVan()

Access the current GitVan context. Must be called within a `withGitVan` context or available globally.

```javascript
import { useGitVan } from 'gitvan/composables'

const ctx = useGitVan()
console.log(ctx.cwd) // Current working directory
```

## Git Operations - useGit()

Provides a comprehensive API for Git operations with deterministic behavior and POSIX compliance.

### Basic Usage

```javascript
import { useGit } from 'gitvan/composables'

const git = useGit()

// Get current branch
const branch = await git.branch()

// Get HEAD commit SHA
const head = await git.head()

// Check if repository is clean
const isClean = await git.isClean()
```

### Core Properties

- `cwd` - Current working directory
- `env` - Environment variables (always includes `TZ=UTC`, `LANG=C` for determinism)

### Repository Information

#### git.branch()

Get current branch name.

```javascript
const branch = await git.branch() // "main"
```

#### git.head()

Get HEAD commit SHA.

```javascript
const sha = await git.head() // "abc123..."
```

#### git.repoRoot()

Get repository root directory.

```javascript
const root = await git.repoRoot() // "/path/to/repo"
```

#### git.worktreeGitDir()

Get Git directory path.

```javascript
const gitDir = await git.worktreeGitDir() // "/path/to/repo/.git"
```

#### git.nowISO()

Get current timestamp in ISO format (deterministic if context provides `now()`).

```javascript
const timestamp = git.nowISO() // "2024-01-01T00:00:00.000Z"
```

### Read-Only Operations

#### git.log(format?, extra?)

Get commit log with custom format.

```javascript
// Default format: "%h%x09%s" (short hash + tab + subject)
const log = await git.log()

// Custom format
const log = await git.log("%H %an %s", ["--max-count=10"])

// With extra arguments
const log = await git.log("%h %s", "--since=1.week.ago")
```

#### git.statusPorcelain()

Get repository status in porcelain format.

```javascript
const status = await git.statusPorcelain()
// "M  src/file.js\n A src/new.js"
```

#### git.isAncestor(a, b?)

Check if commit A is ancestor of commit B (defaults to HEAD).

```javascript
const isAncestor = await git.isAncestor("abc123", "def456")
const isFromMain = await git.isAncestor("main") // Is main ancestor of HEAD?
```

#### git.mergeBase(a, b)

Find merge base between two commits.

```javascript
const base = await git.mergeBase("main", "feature-branch")
```

#### git.revList(args?)

Get revision list.

```javascript
// Default: last 50 commits from HEAD
const commits = await git.revList()

// Custom arguments
const commits = await git.revList(["--max-count=10", "main"])
const recent = await git.revList("--since=1.week.ago")
```

### Write Operations

#### git.add(paths)

Stage files for commit.

```javascript
await git.add("src/file.js")
await git.add(["src/file1.js", "src/file2.js"])
```

#### git.commit(message, opts?)

Create a commit.

```javascript
await git.commit("Add new feature")

// Signed commit
await git.commit("Release v1.0.0", { sign: true })
```

#### git.tag(name, message?, opts?)

Create a tag.

```javascript
await git.tag("v1.0.0")
await git.tag("v1.0.0", "Release version 1.0.0")

// Signed tag
await git.tag("v1.0.0", "Release", { sign: true })
```

### Git Notes (Receipts)

GitVan uses Git notes for storing job execution receipts and metadata.

#### git.noteAdd(ref, message, sha?)

Add a note to a commit.

```javascript
await git.noteAdd("receipts", "Job completed successfully")
await git.noteAdd("receipts", "Build #123", "abc123")
```

#### git.noteAppend(ref, message, sha?)

Append to an existing note.

```javascript
await git.noteAppend("receipts", "Additional info")
```

#### git.noteShow(ref, sha?)

Show note content.

```javascript
const note = await git.noteShow("receipts")
const note = await git.noteShow("receipts", "abc123")
```

### Atomic Operations

#### git.updateRefCreate(ref, valueSha)

Atomically create a ref if it doesn't exist (used for locking).

```javascript
const created = await git.updateRefCreate("refs/locks/build", "abc123")
// Returns true if created, false if already exists
```

### Plumbing Operations

#### git.hashObject(filePath, opts?)

Hash a file object.

```javascript
const hash = await git.hashObject("README.md")
const hash = await git.hashObject("README.md", { write: true })
```

#### git.writeTree()

Write current index as tree object.

```javascript
const treeHash = await git.writeTree()
```

#### git.catFilePretty(sha)

Show object content.

```javascript
const content = await git.catFilePretty("abc123")
```

### Utility Methods

#### git.isClean()

Check if working directory is clean.

```javascript
const clean = await git.isClean()
```

#### git.hasUncommittedChanges()

Check for uncommitted changes.

```javascript
const hasChanges = await git.hasUncommittedChanges()
```

#### git.getCurrentBranch()

Get current branch (handles detached HEAD).

```javascript
const branch = await git.getCurrentBranch() // "main" or "HEAD"
```

#### git.getCommitCount(branch?)

Get number of commits in branch.

```javascript
const count = await git.getCommitCount() // HEAD
const count = await git.getCommitCount("main")
```

### Generic Runner

#### git.run(args) / git.runVoid(args)

Execute arbitrary git commands.

```javascript
const output = await git.run(["show", "--name-only", "HEAD"])
await git.runVoid(["reset", "--hard", "HEAD"])
```

## Template Rendering - useTemplate()

Nunjucks-based template engine with inflection filters and config discovery.

### Basic Usage

```javascript
import { useTemplate } from 'gitvan/composables'

const template = await useTemplate()

// Render from file
const output = template.render('hello.njk', { name: 'World' })

// Render from string
const output = template.renderString('Hello {{ name }}!', { name: 'World' })

// Render to file
await template.renderToFile('hello.njk', 'output.txt', { name: 'World' })
```

### Configuration Options

```javascript
const template = await useTemplate({
  paths: ['templates', 'custom-templates'],  // Template search paths
  autoescape: true,                          // HTML auto-escaping
  noCache: false                             // Disable template caching
})
```

### Methods

#### template.render(templateName, data?)

Render template from file.

```javascript
const html = template.render('page.html', {
  title: 'My Page',
  items: ['one', 'two', 'three']
})
```

#### template.renderString(templateStr, data?)

Render template from string.

```javascript
const text = template.renderString(
  'Hello {{ name | title }}!',
  { name: 'world' }
)
// "Hello World!"
```

#### template.renderToFile(templateName, outPath, data?)

Render template to file.

```javascript
const result = await template.renderToFile(
  'report.md',
  'output/report.md',
  { commits: [...] }
)
// { path: 'output/report.md', bytes: 1024 }
```

### Built-in Data

Templates automatically receive:

- `nowISO` - Current timestamp (deterministic if context provides)
- `git` - Git context object if available

```njk
<!-- In template -->
Generated at {{ nowISO }}
Current branch: {{ git.branch }}
```

### Available Filters

GitVan includes inflection filters for string manipulation:

```njk
{{ "hello_world" | camelCase }}     <!-- helloWorld -->
{{ "hello world" | pascalCase }}    <!-- HelloWorld -->
{{ "HelloWorld" | kebabCase }}      <!-- hello-world -->
{{ "hello-world" | snakeCase }}     <!-- hello_world -->
{{ "hello world" | upperCase }}     <!-- HELLO WORLD -->
{{ "HELLO WORLD" | lowerCase }}     <!-- hello world -->
{{ "hello" | capitalize }}          <!-- Hello -->
{{ "users" | singularize }}         <!-- user -->
{{ "user" | pluralize }}            <!-- users -->
```

### Properties

#### template.env

Access underlying Nunjucks environment.

```javascript
const env = template.env
env.addFilter('custom', (str) => str.toUpperCase())
```

#### template.paths

Get template search paths.

```javascript
const paths = template.paths
// ["/path/to/templates", "/path/to/custom"]
```

#### template.root

Get root directory.

```javascript
const root = template.root
// "/path/to/project"
```

### Synchronous Version

For cases where config discovery isn't needed:

```javascript
import { useTemplateSync } from 'gitvan/composables'

const template = useTemplateSync({
  paths: ['templates'],
  autoescape: false
})
```

## Command Execution - useExec()

Execute commands, JavaScript modules, and templates with context awareness.

### Basic Usage

```javascript
import { useExec } from 'gitvan/composables'

const exec = useExec()

// CLI command
const result = exec.cli('npm', ['test'])

// JavaScript module
const result = await exec.js('./scripts/build.mjs', 'default', { env: 'production' })

// Template rendering
const result = exec.tmpl({
  template: 'config.njk',
  out: 'dist/config.json',
  data: { version: '1.0.0' }
})
```

### Methods

#### exec.cli(cmd, args?, env?)

Execute CLI command synchronously.

```javascript
const result = exec.cli('git', ['status', '--porcelain'])
console.log(result.ok)     // true/false
console.log(result.code)   // exit code
console.log(result.stdout) // command output
console.log(result.stderr) // error output

// With custom environment
const result = exec.cli('node', ['script.js'], { NODE_ENV: 'test' })
```

#### exec.js(modulePath, exportName?, input?)

Execute JavaScript module function.

```javascript
// Default export
const result = await exec.js('./scripts/deploy.mjs')

// Named export
const result = await exec.js('./utils/transform.mjs', 'processData', {
  files: ['a.txt', 'b.txt']
})

console.log(result.ok)     // true
console.log(result.stdout) // stringified return value
console.log(result.meta.out) // raw return value
```

#### exec.tmpl(options)

Render template with output options.

```javascript
// Render to file
const result = exec.tmpl({
  template: 'deployment.yaml',
  out: 'k8s/deployment.yaml',
  data: { image: 'myapp:v1.0.0' },
  autoescape: false,
  paths: ['templates/k8s']
})

console.log(result.ok)           // true
console.log(result.artifact)     // output file path
console.log(result.meta.bytes)   // file size

// Render to string
const result = exec.tmpl({
  template: 'email.txt',
  data: { user: 'John' }
})

console.log(result.stdout) // rendered content
```

### Return Format

All exec methods return a consistent result object:

```javascript
{
  ok: boolean,        // Success/failure
  code?: number,      // Exit code (CLI only)
  stdout: string,     // Output content
  stderr?: string,    // Error content (CLI only)
  artifact?: string,  // Output file path (tmpl only)
  meta?: object       // Additional metadata
}
```

### Context Integration

All exec methods automatically use the current GitVan context:

- Commands run in context `root` directory
- Environment variables from context are merged
- Template data includes Git context

```javascript
// Within withGitVan context
const result = exec.cli('pwd') // Runs in context.cwd
```

## Error Handling

All composables follow a consistent error handling pattern:

### Git Operations

```javascript
try {
  const head = await git.head()
} catch (error) {
  console.log(error.command)       // Failed command
  console.log(error.args)          // Command arguments
  console.log(error.stderr)        // Git stderr output
  console.log(error.originalError) // Original error object
}
```

### Template Operations

```javascript
try {
  const output = template.render('missing.njk', {})
} catch (error) {
  // Nunjucks template errors
  console.log(error.message) // Template not found, syntax errors, etc.
}
```

### Execution Operations

```javascript
const result = exec.cli('invalid-command')
if (!result.ok) {
  console.log(`Command failed with code ${result.code}`)
  console.log(`Error: ${result.stderr}`)
}
```

## Best Practices

### 1. Use Context for Deterministic Behavior

```javascript
// Good: Deterministic timestamps
await withGitVan({
  now: () => '2024-01-01T00:00:00.000Z'
}, async () => {
  const git = useGit()
  const timestamp = git.nowISO() // Always returns same value
})
```

### 2. Configure Template Paths

```javascript
// Good: Explicit template paths
const template = await useTemplate({
  paths: ['templates/ci', 'templates/shared']
})
```

### 3. Handle Command Failures

```javascript
// Good: Check execution results
const result = exec.cli('npm', ['test'])
if (!result.ok) {
  throw new Error(`Tests failed: ${result.stderr}`)
}
```

### 4. Use Appropriate Git Operations

```javascript
// Good: Use utility methods for common checks
if (await git.isClean()) {
  await git.tag('v1.0.0')
}

// Good: Use specific methods over generic runner
const commits = await git.revList(['--max-count=10'])
// vs: await git.run(['rev-list', '--max-count=10', 'HEAD'])
```