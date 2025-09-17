/**
 * GitVan useGit() Composable Context
 * Comprehensive education for LLMs about GitVan's Git operations
 */

export const USE_GIT_CONTEXT = `
# GitVan useGit() Composable

## Overview
The useGit() composable provides comprehensive Git operations through a modular factory pattern. It's the core composable for all Git interactions in GitVan.

## Architecture
- **Factory Pattern**: Each operation type is a separate module (~80 lines each)
- **Context Aware**: Uses unctx for async context binding
- **POSIX First**: No external dependencies, pure ESM
- **Deterministic**: TZ=UTC, LANG=C environment
- **Happy Path**: No retries, no shell string interpolation

## Core Modules & Functions

### Repository Information (repo.mjs)
- **worktreeRoot()**: Get repository root directory
- **currentHead()**: Get current HEAD commit SHA
- **currentBranch()**: Get current branch name  
- **worktreeStatus()**: Get repository status
- **isClean()**: Check if working directory is clean
- **info()**: Get comprehensive repository information

### File Operations (built into repo.mjs)
- **writeFile(path, content)**: Write file to working directory
- **readFile(path)**: Read file from working directory
- **exists(path)**: Check if file exists

### Commit Operations (commits.mjs)
- **log(options)**: Get commit history with filtering
- **revList(range)**: Get commit SHAs in range
- **mergeBase(commit1, commit2)**: Find merge base
- **getCommitCount(range)**: Count commits in range
- **describeLastTag()**: Describe last tag
- **shortlog(range)**: Generate shortlog for release notes
- **trailers(range)**: Extract commit trailers

### Diff Operations (diff.mjs)
- **diff(options)**: Get diff output
- **changedFiles(from, to)**: Get list of changed files
- **diffNames(from, to)**: Get changed file names only
- **pathsChanged(globs, from, to)**: Filter changed files by glob patterns

### Branch Operations (branches.mjs)
- **branchList()**: List all branches
- **branchCreate(name)**: Create new branch
- **branchDelete(name)**: Delete branch
- **checkout(ref)**: Checkout branch/commit
- **switch(branch)**: Switch to branch

### Tag Operations (tags.mjs)
- **tagList()**: List all tags
- **tagCreate(name, message)**: Create annotated tag
- **pushTags(remote)**: Push tags to remote

### Notes Operations (notes.mjs)
- **noteAdd(key, value)**: Add Git note for audit trail
- **noteAppend(key, value)**: Append to existing note
- **noteShow(key)**: Retrieve Git note
- **notesList()**: List all notes
- **NOTES_REF**: Constant = "refs/notes/gitvan/results"

### Reference Operations (refs.mjs)
- **listRefs()**: List all Git references
- **getRef(name)**: Get specific reference
- **updateRef(name, value)**: Update reference
- **updateRefCreate(name, value)**: Create reference atomically

### Worktree Operations (worktrees.mjs)
- **listWorktrees()**: List all worktrees
- **worktreeAdd(name, branch)**: Add new worktree
- **worktreeRemove(name)**: Remove worktree
- **worktreePrune()**: Prune stale worktrees

### Remote Operations (remotes.mjs)
- **fetch(remote)**: Fetch from remote
- **push(remote, refs)**: Push to remote
- **pull(remote)**: Pull from remote
- **defaultRemote()**: Detect default remote

## Usage Pattern
\`\`\`javascript
import { useGit } from 'file:///Users/sac/gitvan/src/index.mjs'

const git = useGit()

// Repository information
const root = await git.worktreeRoot()
const head = await git.currentHead()
const branch = await git.currentBranch()
const status = await git.worktreeStatus()
const isClean = await git.isClean()

// File operations
await git.writeFile('path/file.txt', 'content')
const content = await git.readFile('path/file.txt')
const exists = await git.exists('path/file.txt')

// Commit operations
await git.commit('message')
const commits = await git.log({ maxCount: 10 })
const lastTag = await git.describeLastTag()

// Notes (audit trail)
await git.noteAdd('job-result', JSON.stringify({ status: 'success' }))
const note = await git.noteShow('job-result')
\`\`\`

## Context Binding
\`\`\`javascript
import { withGitVan } from './src/core/context.mjs'

await withGitVan({ cwd: '/path/to/repo' }, async () => {
  const git = useGit()
  // All operations use bound context
  const root = await git.worktreeRoot() // Uses bound cwd
})
\`\`\`

## Error Handling
All methods throw on failure - no retries, no shell interpolation.
Use try/catch for error handling:

\`\`\`javascript
try {
  await git.writeFile('file.txt', 'content')
} catch (error) {
  console.error('Failed to write file:', error.message)
  throw error
}
\`\`\`

## Common Patterns

### File Processing
\`\`\`javascript
const files = ['src/**/*.js', 'docs/**/*.md']
for (const file of files) {
  if (await git.exists(file)) {
    const content = await git.readFile(file)
    const processed = processContent(content)
    await git.writeFile(file, processed)
  }
}
\`\`\`

### Backup Operations
\`\`\`javascript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = \`backups/\${timestamp}\`

const files = ['package.json', 'README.md']
for (const file of files) {
  const content = await git.readFile(file)
  await git.writeFile(\`\${backupDir}/\${file}\`, content)
}
\`\`\`

### Audit Trail
\`\`\`javascript
await git.noteAdd('job-execution', JSON.stringify({
  jobId: 'backup-job',
  status: 'success',
  artifacts: ['backup.tar.gz'],
  timestamp: new Date().toISOString()
}))
\`\`\`

## Integration with Other Composables
\`\`\`javascript
const git = useGit()
const template = useTemplate()
const notes = useNotes()

// Read data, process with template, write result
const data = await git.readFile('data.json')
const rendered = await template.render('template.njk', JSON.parse(data))
await git.writeFile('output.md', rendered)

// Log completion
await notes.write('processing-completed')
\`\`\`
`;
