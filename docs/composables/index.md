# GitVan v2 - Composables Documentation Index

## Overview

GitVan v2 composables have been refactored into a modular factory pattern for better maintainability, testability, and extensibility. This documentation covers the new architecture and all available composables.

## Architecture

### Factory Pattern
Each composable module exports a factory function that accepts shared dependencies:
```javascript
export default function makeX(base, run, runVoid, toArr) {
  return { /* functions */ }
}
```

### Barrel Export
The main `useGit()` function composes all factories into a single object:
```javascript
import { useGit } from "./src/composables/git/index.mjs";
const git = useGit();
```

## Core Composables

### Git Operations (`src/composables/git/`)

#### Repository Information
- **File**: `repo.mjs`
- **Functions**: `root()`, `headSha()`, `currentRef()`, `status()`, `isClean()`, `nowISO()`, `info()`

#### Commit Operations  
- **File**: `commits.mjs`
- **Functions**: `log()`, `revList()`, `mergeBase()`, `getCommitCount()`, `describeLastTag()`, `shortlog()`, `trailers()`

#### Diff Operations
- **File**: `diff.mjs`
- **Functions**: `diff()`, `changedFiles()`, `diffNames()`, `pathsChanged()`

#### Branch Operations
- **File**: `branches.mjs`
- **Functions**: `branchList()`, `branchCreate()`, `branchDelete()`, `checkout()`, `switch()`

#### Tag Operations
- **File**: `tags.mjs`
- **Functions**: `tagList()`, `tagCreate()`, `pushTags()`

#### Notes Operations
- **File**: `notes.mjs`
- **Functions**: `noteAdd()`, `noteAppend()`, `noteShow()`, `notesList()`
- **Constants**: `NOTES_REF = "refs/notes/gitvan/results"`

#### Reference Operations
- **File**: `refs.mjs`
- **Functions**: `listRefs()`, `getRef()`, `updateRef()`, `updateRefCreate()`

#### Worktree Operations
- **File**: `worktrees.mjs`
- **Functions**: `listWorktrees()`, `worktreeAdd()`, `worktreeRemove()`, `worktreePrune()`

#### Remote Operations
- **File**: `remotes.mjs`
- **Functions**: `fetch()`, `push()`, `pull()`, `defaultRemote()`

#### Merge/Rebase/Reset Operations
- **File**: `merge_rebase_reset.mjs`
- **Functions**: `merge()`, `rebase()`, `reset()`

#### Stash Operations
- **File**: `stash.mjs`
- **Functions**: `stashPush()`, `stashList()`, `stashApply()`, `stashDrop()`

#### Cherry-pick/Revert Operations
- **File**: `cherry_revert.mjs`
- **Functions**: `cherryPick()`, `revert()`

#### Plumbing Operations
- **File**: `plumbing.mjs`
- **Functions**: `hashObject()`, `writeTree()`, `catFile()`, `revParse()`

#### Core Runner
- **File**: `runner.mjs`
- **Functions**: `createRunner()` - provides `base`, `run`, `runVoid`, `toArr`

## Other Composables

### Worktree Management
- **File**: `worktree.mjs`
- **Function**: `useWorktree()`

### Template System
- **File**: `template.mjs`
- **Function**: `useTemplate()`

### Notes System
- **File**: `notes.mjs`
- **Function**: `useNotes()`

### Job System
- **File**: `job.mjs`
- **Function**: `useJob()`

### Event System
- **File**: `event.mjs`
- **Function**: `useEvent()`

### Schedule System
- **File**: `schedule.mjs`
- **Function**: `useSchedule()`

### Infrastructure Composables
- **Receipt System**: `receipt.mjs` - `useReceipt()`
- **Lock System**: `lock.mjs` - `useLock()`
- **Registry System**: `registry.mjs` - `useRegistry()`

## Usage Examples

### Basic Git Operations
```javascript
import { useGit } from "./src/composables/git/index.mjs";

const git = useGit();

// Repository info
const root = await git.root();
const headSha = await git.headSha();
const currentRef = await git.currentRef();

// Commit operations
const log = await git.log("%h %s", ["--max-count=5"]);
const commitCount = await git.getCommitCount();

// Branch operations
const branches = await git.branchList();
await git.branchCreate("feature/new-feature");

// Diff operations
const changedFiles = await git.changedFiles("HEAD~1", "HEAD");
const jsFiles = await git.pathsChanged(["*.js", "*.mjs"], "HEAD~1", "HEAD");
```

### Advanced Features
```javascript
// Release helpers
const shortlog = await git.shortlog("v1.0.0..HEAD");
const trailers = await git.trailers("HEAD~5..HEAD");

// Notes with default ref
await git.noteAdd(undefined, "Build successful", "HEAD");
const notes = await git.notesList();

// Tag operations
await git.tagCreate("v1.1.0", "Release v1.1.0");
await git.pushTags("origin");

// Worktree operations
const worktrees = await git.listWorktrees();
await git.worktreeAdd("/path/to/new-worktree", "feature-branch");
```

### Context Integration
```javascript
import { withGitVan } from "./src/core/context.mjs";

await withGitVan({ cwd: "/custom/path" }, async () => {
  const git = useGit();
  // All operations use the custom context
  const root = await git.root(); // Returns "/custom/path"
});
```

## Migration Guide

### From Monolithic to Modular

**Before:**
```javascript
import { useGit } from "./src/composables/git.mjs";
```

**After:**
```javascript
import { useGit } from "./src/composables/git/index.mjs";
// or
import { useGit } from "./src/composables/index.mjs";
```

### API Changes
- `head()` → `headSha()`
- `repoRoot()` → `root()`
- `statusPorcelain()` → `status()`
- `catFilePretty()` → `catFile()`

## Environment Configuration

The runner provides deterministic environment variables:
- `TZ=UTC` - UTC timezone
- `LANG=C` - C locale
- `LC_ALL=C` - C locale for all categories
- `GIT_TERMINAL_PROMPT=0` - Disable terminal prompts

## Constants

- `NOTES_REF = "refs/notes/gitvan/results"` - Default notes reference

## Error Handling

All operations follow the "happy path" principle:
- No retries
- Deterministic behavior
- Clear error messages
- Graceful handling of empty repositories

## Testing

Each module can be tested independently:
```javascript
import makeRepo from "./src/composables/git/repo.mjs";

const mockBase = { cwd: "/test", env: {} };
const mockRun = async (args) => "test-output";
const mockRunVoid = async (args) => {};
const mockToArr = (x) => Array.isArray(x) ? x : [x];

const repo = makeRepo(mockBase, mockRun, mockRunVoid, mockToArr);
const root = await repo.root(); // Uses mockRun
```

## Performance

- **Modular Loading**: Only load what you need
- **Factory Pattern**: Efficient object composition
- **Deterministic Environment**: Consistent behavior across systems
- **Context Preservation**: No context loss in async operations

## Extensibility

To add new Git operations:
1. Create a new factory module in `src/composables/git/`
2. Export a factory function following the pattern
3. Import and compose in `index.mjs`
4. Add tests for the new functionality

## Best Practices

1. **Use Factory Pattern**: Follow the established pattern for consistency
2. **Handle Errors Gracefully**: Implement proper error handling
3. **Maintain Determinism**: Use deterministic environment variables
4. **Test Independently**: Test each module in isolation
5. **Document Changes**: Update this documentation when adding features
