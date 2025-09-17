# GitVan v2 Composables

This directory contains the modular composables for GitVan v2, refactored from a monolithic structure into focused, testable factory modules.

## Architecture

The composables follow a factory pattern where each module exports a factory function that accepts shared dependencies:

```javascript
export default function makeX(base, run, runVoid, toArr) {
  return { /* functions */ }
}
```

## Directory Structure

```
src/composables/
├── git/                    # Modular Git operations
│   ├── index.mjs          # Barrel export (useGit)
│   ├── runner.mjs         # Core runner with deterministic env
│   ├── repo.mjs           # Repository info
│   ├── commits.mjs        # Commit operations
│   ├── diff.mjs           # Diff operations
│   ├── branches.mjs       # Branch operations
│   ├── tags.mjs           # Tag operations
│   ├── notes.mjs          # Notes operations
│   ├── refs.mjs           # Reference operations
│   ├── worktrees.mjs      # Worktree operations
│   ├── remotes.mjs        # Remote operations
│   ├── merge_rebase_reset.mjs  # Merge/rebase/reset operations
│   ├── stash.mjs          # Stash operations
│   ├── cherry_revert.mjs  # Cherry-pick/revert operations
│   └── plumbing.mjs       # Low-level operations
├── index.mjs              # Main composables barrel
├── worktree.mjs           # Worktree management
├── template.mjs           # Template system
├── notes.mjs              # Notes system
├── job.mjs                # Job system
├── event.mjs              # Event system
├── schedule.mjs           # Schedule system
├── receipt.mjs            # Receipt system
├── lock.mjs               # Lock system
└── registry.mjs           # Registry system
```

## Usage

### Import the main composable

```javascript
import { useGit } from "./src/composables/git/index.mjs";
const git = useGit();
```

### Or import from the main barrel

```javascript
import { useGit } from "./src/composables/index.mjs";
const git = useGit();
```

### Use individual modules for testing

```javascript
import makeRepo from "./src/composables/git/repo.mjs";

const mockBase = { cwd: "/test", env: {} };
const mockRun = async (args) => "test-output";
const mockRunVoid = async (args) => {};
const mockToArr = (x) => Array.isArray(x) ? x : [x];

const repo = makeRepo(mockBase, mockRun, mockRunVoid, mockToArr);
```

## Key Features

### 80/20 Must-Add Features

- **Release Helpers**: `shortlog(range)`, `trailers(range)`
- **Path Filtering**: `pathsChanged(globs, from, to)`
- **Notes Default**: `NOTES_REF` constant with defaulting
- **Tag Convenience**: `pushTags(remote)`
- **Remote Detection**: `defaultRemote()`

### Enhanced Environment

- `TZ=UTC` - UTC timezone
- `LANG=C` - C locale
- `LC_ALL=C` - C locale for all categories
- `GIT_TERMINAL_PROMPT=0` - Disable terminal prompts

### API Improvements

- `head()` → `headSha()` (more descriptive)
- `repoRoot()` → `root()` (shorter)
- `statusPorcelain()` → `status()` (simplified)
- `catFilePretty()` → `catFile()` (simplified)

## Documentation

- [Composables Index](../docs/composables/index.md) - Architecture overview
- [Git API Reference](../docs/composables/git-api.md) - Detailed function documentation
- [Migration Guide](../docs/composables/migration-guide.md) - Upgrade from v1
- [Quick Reference](../docs/composables/quick-reference.md) - Cheat sheet

## Testing

Each module can be tested independently:

```javascript
import makeRepo from "./src/composables/git/repo.mjs";

// Mock dependencies
const mockBase = { cwd: "/test", env: {} };
const mockRun = async (args) => "test-output";
const mockRunVoid = async (args) => {};
const mockToArr = (x) => Array.isArray(x) ? x : [x];

// Create instance
const repo = makeRepo(mockBase, mockRun, mockRunVoid, mockToArr);

// Test functions
const root = await repo.root(); // Uses mockRun
```

## Benefits

### Maintainability
- Smaller, focused modules (~80 lines each)
- Clear separation of concerns
- Easier to understand and modify

### Testability
- Test individual modules in isolation
- Mock dependencies easily
- Faster test execution

### Extensibility
- Add new Git operations easily
- Compose only what you need
- Better tree-shaking support

### Performance
- Modular loading
- Efficient object composition
- Deterministic behavior

## Migration from v1

See the [Migration Guide](../docs/composables/migration-guide.md) for detailed instructions on upgrading from the monolithic version.

Key changes:
1. Update import paths
2. Rename functions (see API changes above)
3. Take advantage of new features
4. Update tests to use modular approach