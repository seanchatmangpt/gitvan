# useGit API Documentation

GitVan v2's `useGit()` composable provides a POSIX-first, dependency-free interface to Git operations with context awareness through UnJS.

## Table of Contents

- [Overview](#overview)
- [Context System](#context-system)
- [API Reference](#api-reference)
  - [Repository Information](#repository-information)
  - [Read-only Operations](#read-only-operations)
  - [Write Operations](#write-operations)
  - [Git Notes (Receipts)](#git-notes-receipts)
  - [Atomic Operations (Locks)](#atomic-operations-locks)
  - [Plumbing Commands](#plumbing-commands)
  - [Generic Runner](#generic-runner)
- [Usage Examples](#usage-examples)
- [Migration Guide](#migration-guide)
- [Error Handling](#error-handling)

## Overview

The `useGit()` composable is designed for:

- **POSIX-first**: No external dependencies, pure ESM
- **Deterministic environment**: `TZ=UTC`, `LANG=C`
- **Context-aware**: Uses UnJS unctx for context binding
- **Happy path**: No retries, no shell string interpolation
- **80/20 principle**: Essential commands plus primitives for locks/receipts

```js
import { useGit } from 'gitvan/composables/git'

const git = useGit()
const currentBranch = await git.branch()
```

## Context System

GitVan uses UnJS unctx for context management, allowing you to bind working directory and environment variables:

```js
import { withGitVan } from 'gitvan/core/context'

// Set context for all git operations
await withGitVan({
  cwd: '/path/to/repo',
  env: { GIT_AUTHOR_NAME: 'GitVan' }
}, async () => {
  const git = useGit()
  // All operations use the bound context
  await git.commit('Initial commit')
})
```

### Context Binding

The `bindContext()` function resolves context once to avoid async pitfalls:

- Prefers strict `useGitVan()` within `withGitVan` calls
- Falls back to `tryUseGitVan()` for graceful degradation
- Defaults to `process.cwd()` and `process.env` when no context

## API Reference

### Repository Information

#### `branch()`
Get the current branch name.

```js
const currentBranch = await git.branch()
// Returns: "main" or "feature/new-api"
```

#### `head()`
Get the current HEAD commit SHA.

```js
const headSha = await git.head()
// Returns: "a1b2c3d4e5f6..."
```

#### `repoRoot()`
Get the repository root directory.

```js
const rootPath = await git.repoRoot()
// Returns: "/Users/dev/my-project"
```

#### `worktreeGitDir()`
Get the .git directory path.

```js
const gitDir = await git.worktreeGitDir()
// Returns: "/Users/dev/my-project/.git"
```

#### `nowISO()`
Get current timestamp in ISO format (supports GITVAN_NOW env var for testing).

```js
const timestamp = git.nowISO()
// Returns: "2024-01-15T10:30:00.000Z"
```

### Read-only Operations

#### `log(format, extra)`
Get git log with custom format and options.

**Parameters:**
- `format` (string, optional): Pretty format string (default: `"%h%x09%s"`)
- `extra` (string|array, optional): Additional git log arguments

```js
// Basic log
const log = await git.log()
// Returns: "a1b2c3d\tInitial commit\nb2c3d4e\tAdd feature"

// Custom format
const detailedLog = await git.log("%H %an %ad %s", ["--since=1.week.ago"])
// Returns: Full SHA, author, date, subject for commits in last week

// With extra arguments
const recentCommits = await git.log("%h %s", "--max-count=5")
```

#### `statusPorcelain()`
Get repository status in porcelain format.

```js
const status = await git.statusPorcelain()
// Returns: " M file.js\n?? new-file.txt"
```

#### `isAncestor(a, b)`
Check if commit `a` is an ancestor of commit `b`.

**Parameters:**
- `a` (string): Ancestor commit SHA or ref
- `b` (string, optional): Descendant commit SHA or ref (default: "HEAD")

```js
const isAncestor = await git.isAncestor('abc123', 'main')
// Returns: true or false
```

#### `mergeBase(a, b)`
Find the merge base between two commits.

**Parameters:**
- `a` (string): First commit SHA or ref
- `b` (string): Second commit SHA or ref

```js
const base = await git.mergeBase('feature-branch', 'main')
// Returns: "def456..."
```

#### `revList(args)`
Get commit list with custom arguments.

**Parameters:**
- `args` (string|array, optional): Arguments for git rev-list (default: `["--max-count=50", "HEAD"]`)

```js
// Recent commits
const commits = await git.revList()
// Returns: "a1b2c3d\nb2c3d4e\n..."

// Custom range
const range = await git.revList(['main..feature'])
// Returns commits in feature branch not in main

// With options
const tagged = await git.revList(['--tags', '--max-count=10'])
```

### Write Operations

#### `add(paths)`
Stage files for commit.

**Parameters:**
- `paths` (string|array): File paths to stage

```js
// Single file
await git.add('src/index.js')

// Multiple files
await git.add(['src/index.js', 'package.json'])

// All changes
await git.add('.')
```

#### `commit(message, opts)`
Create a commit with the staged changes.

**Parameters:**
- `message` (string): Commit message
- `opts` (object, optional): Commit options
  - `sign` (boolean): Sign the commit with GPG

```js
// Basic commit
await git.commit('Fix bug in user authentication')

// Signed commit
await git.commit('Release v1.0.0', { sign: true })
```

#### `tag(name, msg, opts)`
Create a git tag.

**Parameters:**
- `name` (string): Tag name
- `msg` (string, optional): Tag message
- `opts` (object, optional): Tag options
  - `sign` (boolean): Sign the tag with GPG

```js
// Lightweight tag
await git.tag('v1.0.0')

// Annotated tag
await git.tag('v1.0.0', 'Release version 1.0.0')

// Signed tag
await git.tag('v1.0.0', 'Signed release', { sign: true })
```

### Git Notes (Receipts)

Git notes are used by GitVan for storing metadata and receipts.

#### `noteAdd(ref, message, sha)`
Add a note to a commit.

**Parameters:**
- `ref` (string): Notes ref (e.g., 'receipts', 'metadata')
- `message` (string): Note content
- `sha` (string, optional): Target commit SHA (default: "HEAD")

```js
await git.noteAdd('receipts', 'Job completed successfully', 'abc123')
```

#### `noteAppend(ref, message, sha)`
Append to an existing note.

**Parameters:**
- `ref` (string): Notes ref
- `message` (string): Content to append
- `sha` (string, optional): Target commit SHA (default: "HEAD")

```js
await git.noteAppend('receipts', '\nAdditional metadata', 'abc123')
```

#### `noteShow(ref, sha)`
Show note content for a commit.

**Parameters:**
- `ref` (string): Notes ref
- `sha` (string, optional): Target commit SHA (default: "HEAD")

```js
const note = await git.noteShow('receipts', 'abc123')
// Returns: "Job completed successfully\nAdditional metadata"
```

### Atomic Operations (Locks)

#### `updateRefCreate(ref, valueSha)`
Atomically create a ref if it doesn't exist (used for locking).

**Parameters:**
- `ref` (string): Reference name (e.g., 'refs/locks/job-123')
- `valueSha` (string): SHA to point the ref to

**Returns:** `boolean` - `true` if created, `false` if already exists

```js
const created = await git.updateRefCreate('refs/locks/job-123', headSha)
if (created) {
  // Lock acquired, proceed with operation
  console.log('Lock acquired')
} else {
  // Lock already exists
  console.log('Another process has the lock')
}
```

### Plumbing Commands

Low-level Git operations for advanced use cases.

#### `hashObject(filePath, opts)`
Generate SHA hash for a file.

**Parameters:**
- `filePath` (string): Path to file
- `opts` (object, optional): Options
  - `write` (boolean): Write object to Git database

```js
// Hash without writing
const hash = await git.hashObject('package.json')
// Returns: "a1b2c3d4e5f6..."

// Hash and write to database
const hash = await git.hashObject('package.json', { write: true })
```

#### `writeTree()`
Write current index as a tree object.

```js
const treeHash = await git.writeTree()
// Returns: "def456..."
```

#### `catFilePretty(sha)`
Show the contents of a Git object.

**Parameters:**
- `sha` (string): Object SHA to display

```js
const content = await git.catFilePretty('abc123')
// Returns: Formatted object content
```

### Generic Runner

#### `run(args)`
Execute arbitrary git command and return output.

**Parameters:**
- `args` (string|array): Git command arguments

```js
const result = await git.run(['config', 'user.name'])
// Returns: "John Doe"

const branches = await git.run('branch -r')
// Returns: "  origin/main\n  origin/develop"
```

#### `runVoid(args)`
Execute git command without returning output.

**Parameters:**
- `args` (string|array): Git command arguments

```js
await git.runVoid(['config', 'user.email', 'john@example.com'])
```

## Usage Examples

### Basic Repository Operations

```js
import { useGit } from 'gitvan/composables/git'

const git = useGit()

// Check repository status
const branch = await git.branch()
const status = await git.statusPorcelain()

if (status) {
  console.log(`On branch ${branch} with changes:`)
  console.log(status)

  // Stage and commit changes
  await git.add('.')
  await git.commit(`Update from ${branch}`)
}
```

### Working with Context

```js
import { withGitVan } from 'gitvan/core/context'
import { useGit } from 'gitvan/composables/git'

await withGitVan({
  cwd: '/path/to/repo',
  env: {
    GIT_AUTHOR_NAME: 'GitVan Bot',
    GIT_AUTHOR_EMAIL: 'bot@gitvan.dev'
  }
}, async () => {
  const git = useGit()

  // All operations use the bound context
  await git.add('.')
  await git.commit('Automated update')
  await git.tag('auto-v1.0.0', 'Automated release')
})
```

### Receipt Management

```js
const git = useGit()

// Store job receipt
const jobId = 'job-12345'
const receipt = {
  startTime: git.nowISO(),
  status: 'completed',
  artifacts: ['build.zip', 'report.html']
}

await git.noteAdd('receipts', JSON.stringify(receipt))

// Retrieve receipt later
const storedReceipt = await git.noteShow('receipts')
const parsed = JSON.parse(storedReceipt)
```

### Distributed Locking

```js
const git = useGit()
const lockRef = 'refs/locks/deploy'
const headSha = await git.head()

// Try to acquire lock
const lockAcquired = await git.updateRefCreate(lockRef, headSha)

if (lockAcquired) {
  try {
    // Perform locked operation
    console.log('Deploying...')
    await git.add('.')
    await git.commit('Deploy changes')
  } finally {
    // Release lock (in real implementation)
    await git.runVoid(['update-ref', '-d', lockRef])
  }
} else {
  console.log('Deploy already in progress')
}
```

### Advanced Log Analysis

```js
const git = useGit()

// Get recent commits with full details
const recentCommits = await git.log(
  '%H|%an|%ad|%s',
  ['--since=1.week.ago', '--date=iso']
)

const commits = recentCommits.split('\n').map(line => {
  const [sha, author, date, subject] = line.split('|')
  return { sha, author, date: new Date(date), subject }
})

// Find commits by specific author
const authorCommits = commits.filter(c =>
  c.author === 'GitVan Bot'
)

// Check if feature branch is ready to merge
const isReady = await git.isAncestor('main', 'feature/new-api')
if (isReady) {
  const base = await git.mergeBase('main', 'feature/new-api')
  console.log(`Feature branch ready to merge from ${base}`)
}
```

## Migration Guide

### From v1 to v2

GitVan v2 introduces significant changes in the API design and context system.

#### Key Changes

1. **Context Binding**: Operations now use bound context instead of per-call options
2. **Simplified API**: Removed complex retry logic and error handling
3. **ESM Only**: No CommonJS support
4. **No External Dependencies**: Pure Node.js implementation

#### Migration Steps

**Before (v1):**
```js
import GitVan from 'gitvan'

const gv = new GitVan({ cwd: '/repo' })
await gv.git.commit('message', { cwd: '/other/repo' })
```

**After (v2):**
```js
import { withGitVan } from 'gitvan/core/context'
import { useGit } from 'gitvan/composables/git'

await withGitVan({ cwd: '/repo' }, async () => {
  const git = useGit()

  // For different repo, use nested context
  await withGitVan({ cwd: '/other/repo' }, async () => {
    const otherGit = useGit()
    await otherGit.commit('message')
  })
})
```

#### API Mapping

| v1 Method | v2 Method | Notes |
|-----------|-----------|-------|
| `gv.git.getCurrentBranch()` | `git.branch()` | Simplified name |
| `gv.git.getHead()` | `git.head()` | Simplified name |
| `gv.git.addFiles(files)` | `git.add(files)` | Simplified name |
| `gv.git.commitChanges(msg)` | `git.commit(msg)` | Simplified name |
| `gv.git.createTag(name, msg)` | `git.tag(name, msg)` | Simplified name |
| `gv.notes.add(ref, msg)` | `git.noteAdd(ref, msg)` | Integrated into main API |
| `gv.locks.acquire(ref)` | `git.updateRefCreate(ref, sha)` | More explicit |

#### Environment Variables

**v1:**
```js
const gv = new GitVan({
  env: { TZ: 'America/New_York' }
})
```

**v2:**
```js
await withGitVan({
  env: { TZ: 'America/New_York' }
}, async () => {
  // Git operations inherit environment
})
```

Note: v2 always sets `TZ=UTC` and `LANG=C` for deterministic behavior unless overridden.

## Error Handling

GitVan v2 follows a "happy path" approach with minimal error handling:

```js
const git = useGit()

try {
  await git.commit('Empty commit')
} catch (error) {
  // Handle git command failures
  console.error('Commit failed:', error.message)
}

// Graceful checks for optional operations
const hasChanges = await git.statusPorcelain()
if (hasChanges) {
  await git.add('.')
  await git.commit('Auto-commit changes')
}
```

### Common Error Scenarios

1. **No repository**: Operations fail if not in a Git repository
2. **No changes**: `git.commit()` fails with no staged changes
3. **Lock conflicts**: `git.updateRefCreate()` returns `false` for existing refs
4. **Missing refs**: `git.noteShow()` throws for non-existent notes

### Best Practices

- Always check for changes before committing
- Use `updateRefCreate()` return value for lock acquisition
- Wrap operations in try-catch for error handling
- Use context binding for consistent working directory

---

For more examples and advanced usage patterns, see the GitVan documentation and test files.