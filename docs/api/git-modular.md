# GitVan v2 — Modular Git Commands

## Overview

GitVan v2 implements a **modular approach** to Git commands to prevent bloat in the main `useGit()` composable. Instead of including all Git commands in a single large file, commands are organized into focused modules that are loaded on-demand.

## Architecture

### Core Commands (Always Loaded)
The main `useGitModular()` composable includes essential commands that are always available:

- **Repository Info**: `branch()`, `head()`, `repoRoot()`, `worktreeGitDir()`
- **Read Operations**: `log()`, `statusPorcelain()`, `isAncestor()`, `mergeBase()`, `revList()`
- **Write Operations**: `add()`, `commit()`, `tag()`
- **Notes System**: `noteAdd()`, `noteAppend()`, `noteShow()`
- **Atomic Operations**: `updateRefCreate()`
- **Plumbing**: `hashObject()`, `writeTree()`, `catFilePretty()`

### Modular Commands (Loaded On-Demand)
Additional commands are organized into focused modules:

- **`git.diff`** - Diff operations
- **`git.remote`** - Remote operations (fetch, push, pull)
- **`git.branchCommands`** - Branch management
- **`git.checkout`** - Checkout/switch operations
- **`git.merge`** - Merge operations (merge, rebase, cherry-pick, revert)
- **`git.stash`** - Stash operations
- **`git.reset`** - Reset operations

## Usage

### Basic Usage
```javascript
import { useGitModular } from 'gitvan/composables/git-modular';
import { withGitVan } from 'gitvan/core/context';

await withGitVan({ cwd: '/path/to/repo' }, async () => {
  const git = useGitModular();
  
  // Core commands (always available)
  const branch = await git.branch();
  await git.add(['file.txt']);
  await git.commit('Add file');
  
  // Modular commands (loaded on-demand)
  const diff = await git.diff.diff();
  await git.branchCommands.branchCreate('feature-branch');
  await git.checkout.checkout('feature-branch');
});
```

### Diff Operations
```javascript
// Working directory changes
const workingDiff = await git.diff.diff();

// Staged changes
const stagedDiff = await git.diff.diff({ cached: true });

// File names only
const fileNames = await git.diff.diff({ nameOnly: true });

// Commit range
const rangeDiff = await git.diff.diff({ from: 'HEAD~2', to: 'HEAD' });

// Specific files
const fileDiff = await git.diff.diff({ files: ['src/file.js'] });
```

### Remote Operations
```javascript
// Fetch from remote
await git.remote.fetch('origin', 'main');

// Push to remote
await git.remote.push('origin', 'HEAD', { setUpstream: true });

// Pull from remote
await git.remote.pull('origin', 'main', { rebase: true });

// List remotes
const remotes = await git.remote.remoteList();
```

### Branch Management
```javascript
// List branches
const branches = await git.branchCommands.branchList();
const allBranches = await git.branchCommands.branchList({ all: true });

// Create branch
await git.branchCommands.branchCreate('feature-branch');
await git.branchCommands.branchCreate('hotfix', 'main');

// Delete branch
await git.branchCommands.branchDelete('old-branch');
await git.branchCommands.branchDelete('force-delete', { force: true });

// Check if branch exists
const exists = await git.branchCommands.branchExists('feature-branch');
```

### Checkout/Switch Operations
```javascript
// Switch to branch
await git.checkout.checkout('feature-branch');
await git.checkout.switch('main');

// Create and switch to new branch
await git.checkout.checkout('new-feature', { create: true });
await git.checkout.switch('new-feature', { create: true });

// Restore files
await git.checkout.restore(['file.txt']);
await git.checkout.restore(['file.txt'], { staged: true });
```

### Merge Operations
```javascript
// Merge branch
await git.merge.merge('feature-branch');

// Merge with options
await git.merge.merge('feature-branch', { 
  noff: true, 
  message: 'Merge feature' 
});

// Rebase
await git.merge.rebase('origin/main');
await git.merge.rebase('origin/main', { interactive: true });

// Cherry-pick
await git.merge.cherryPick('abc123');

// Revert
await git.merge.revert('abc123');
```

### Stash Operations
```javascript
// Save stash
await git.stash.stashSave('Work in progress');

// List stashes
const stashes = await git.stash.stashList();

// Apply stash
await git.stash.stashApply();
await git.stash.stashApply('stash@{1}');

// Pop stash (apply and remove)
await git.stash.stashApply('stash@{0}', { pop: true });

// Drop stash
await git.stash.stashDrop('stash@{0}');

// Clear all stashes
await git.stash.stashClear();
```

### Reset Operations
```javascript
// Mixed reset (default)
await git.reset.reset('mixed', 'HEAD');

// Soft reset
await git.reset.resetSoft('HEAD~1');

// Hard reset
await git.reset.resetHard('HEAD~2');

// Reset specific files
await git.reset.resetPaths(['file.txt'], 'HEAD');
```

## Benefits of Modular Approach

### 1. **Prevents Bloat**
- Core functionality remains lightweight
- Additional commands loaded only when needed
- Smaller bundle size for basic usage

### 2. **Better Organization**
- Commands grouped by functionality
- Easier to maintain and extend
- Clear separation of concerns

### 3. **Lazy Loading**
- Commands loaded on first access
- Cached for subsequent uses
- Better performance for unused features

### 4. **Extensibility**
- Easy to add new command modules
- Can be imported individually
- Supports tree-shaking

## Migration from Monolithic useGit()

If you're migrating from the monolithic `useGit()`, the changes are minimal:

```javascript
// Before (monolithic)
const git = useGit();
await git.diff();
await git.branchList();

// After (modular)
const git = useGitModular();
await git.diff.diff();
await git.branchCommands.branchList();
```

## File Structure

```
src/composables/
├── git-modular.mjs          # Main modular composable
├── git-core.mjs             # Core utilities
└── git/
    ├── diff.mjs             # Diff operations
    ├── remote.mjs           # Remote operations
    ├── branch.mjs           # Branch management
    ├── checkout.mjs         # Checkout/switch
    ├── merge.mjs            # Merge operations
    ├── stash.mjs            # Stash operations
    └── reset.mjs            # Reset operations
```

## Testing

The modular approach includes comprehensive tests:

```bash
# Test modular Git commands
node test-modular-git.mjs

# Test specific modules
node test-new-git-commands.mjs --quick
```

This modular approach ensures GitVan remains lightweight while providing comprehensive Git functionality when needed.
