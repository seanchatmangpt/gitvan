# GitVan v2 - Migration Guide

## Overview

This guide helps you migrate from the monolithic GitVan composables to the new modular factory pattern.

## Breaking Changes

### Import Path Changes

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

### API Renames

The following function names have been changed for consistency:

| Old Name | New Name | Notes |
|----------|----------|-------|
| `head()` | `headSha()` | More descriptive name |
| `repoRoot()` | `root()` | Shorter, cleaner name |
| `statusPorcelain()` | `status()` | Simplified name |
| `catFilePretty()` | `catFile()` | Simplified name |

### Migration Examples

#### Basic Repository Operations

**Before:**
```javascript
const git = useGit();
const head = await git.head();
const root = await git.repoRoot();
const status = await git.statusPorcelain();
const content = await git.catFilePretty("abc123");
```

**After:**
```javascript
const git = useGit();
const headSha = await git.headSha();
const root = await git.root();
const status = await git.status();
const content = await git.catFile("abc123");
```

#### Advanced Features

**Before:**
```javascript
// No equivalent - these are new features
```

**After:**
```javascript
// New release helpers
const shortlog = await git.shortlog("v1.0.0..HEAD");
const trailers = await git.trailers("HEAD~5..HEAD");

// New path filtering
const jsFiles = await git.pathsChanged(["*.js", "*.mjs"], "HEAD~1", "HEAD");

// New convenience methods
await git.pushTags("origin");
const defaultRemote = await git.defaultRemote();
```

## New Features

### Release Helpers

The new modular structure includes specialized release helpers:

```javascript
// Generate shortlog for release notes
const shortlog = await git.shortlog("v1.0.0..HEAD");
// Returns: "5\tSean Chatman"

// Extract commit trailers
const trailers = await git.trailers("HEAD~5..HEAD");
// Returns: "Signed-off-by: Sean Chatman <sean@example.com>"
```

### Path Filtering

Filter changed files by glob patterns:

```javascript
// Get only JavaScript files that changed
const jsFiles = await git.pathsChanged(["*.js", "*.mjs"], "HEAD~1", "HEAD");
// Returns: ["src/composables/git.mjs", "src/index.mjs"]
```

### Tag Convenience

Push tags with a single method:

```javascript
// Push all tags to origin
await git.pushTags("origin");
```

### Default Remote Detection

Automatically detect the default remote:

```javascript
const remote = await git.defaultRemote();
// Returns: "origin"
```

### Notes with Default Reference

Use the default notes reference without specifying it:

```javascript
// Uses NOTES_REF = "refs/notes/gitvan/results"
await git.noteAdd(undefined, "Build successful", "HEAD");
const notes = await git.notesList();
```

## Environment Improvements

The new runner provides enhanced deterministic environment:

```javascript
// New environment variables
const env = git.env;
// Now includes:
// - TZ: "UTC"
// - LANG: "C" 
// - LC_ALL: "C"
// - GIT_TERMINAL_PROMPT: "0"
```

## Testing Migration

### Before (Monolithic Testing)

```javascript
import { useGit } from "./src/composables/git.mjs";

// Hard to test individual functions
const git = useGit();
// All functions are coupled together
```

### After (Modular Testing)

```javascript
import makeRepo from "./src/composables/git/repo.mjs";

// Test individual modules
const mockBase = { cwd: "/test", env: {} };
const mockRun = async (args) => "test-output";
const mockRunVoid = async (args) => {};
const mockToArr = (x) => Array.isArray(x) ? x : [x];

const repo = makeRepo(mockBase, mockRun, mockVoid, mockToArr);
const root = await repo.root(); // Uses mockRun
```

## Performance Considerations

### Lazy Loading

The new modular structure allows for better tree-shaking:

```javascript
// Only load what you need
import makeRepo from "./src/composables/git/repo.mjs";
import makeCommits from "./src/composables/git/commits.mjs";

// Compose only the modules you need
const git = Object.assign(
  {},
  makeRepo(base, run, runVoid, toArr),
  makeCommits(base, run, runVoid, toArr)
);
```

### Memory Efficiency

Each module is smaller and more focused:

- **Before**: 617 lines in single file
- **After**: ~80 lines per module, 15 modules total

## Error Handling

The new structure maintains the same error handling behavior:

```javascript
// Same error handling as before
try {
  const root = await git.root();
} catch (error) {
  console.error("Git operation failed:", error.message);
}
```

## Context Integration

Context integration remains unchanged:

```javascript
import { withGitVan } from "./src/core/context.mjs";

await withGitVan({ cwd: "/custom/path" }, async () => {
  const git = useGit();
  // All operations use the custom context
  const root = await git.root(); // Returns "/custom/path"
});
```

## Backward Compatibility

### What Still Works

- All existing function calls (except renamed ones)
- Context integration
- Error handling
- Environment configuration
- Async/await patterns

### What Changed

- Import paths
- Function names (see table above)
- Internal structure (but not external API)

## Step-by-Step Migration

### 1. Update Import Statements

Find all imports of the old Git composable:

```bash
# Find all files importing the old composable
grep -r "from.*git\.mjs" src/
```

Update them to use the new path:

```javascript
// Change this:
import { useGit } from "./src/composables/git.mjs";

// To this:
import { useGit } from "./src/composables/git/index.mjs";
```

### 2. Update Function Calls

Search for renamed functions:

```bash
# Find usage of renamed functions
grep -r "\.head(" src/
grep -r "\.repoRoot(" src/
grep -r "\.statusPorcelain(" src/
grep -r "\.catFilePretty(" src/
```

Update them to use the new names:

```javascript
// Change these:
await git.head()
await git.repoRoot()
await git.statusPorcelain()
await git.catFilePretty()

// To these:
await git.headSha()
await git.root()
await git.status()
await git.catFile()
```

### 3. Test Your Changes

Run your tests to ensure everything still works:

```bash
pnpm test
```

### 4. Take Advantage of New Features

Consider using the new features:

```javascript
// Use new release helpers
const shortlog = await git.shortlog("v1.0.0..HEAD");

// Use new path filtering
const jsFiles = await git.pathsChanged(["*.js"], "HEAD~1", "HEAD");

// Use new convenience methods
await git.pushTags("origin");
```

## Troubleshooting

### Common Issues

#### Import Errors

**Error**: `Module not found: ./src/composables/git.mjs`

**Solution**: Update import path to `./src/composables/git/index.mjs`

#### Function Not Found

**Error**: `git.head is not a function`

**Solution**: Use `git.headSha()` instead of `git.head()`

#### Context Issues

**Error**: Context not working properly

**Solution**: Ensure you're importing from the correct path and using the same context functions

### Getting Help

If you encounter issues during migration:

1. Check the [API Reference](./git-api.md) for correct function names
2. Verify import paths are correct
3. Run tests to identify specific issues
4. Check the [Architecture Guide](./index.md) for understanding the new structure

## Benefits of Migration

### Improved Maintainability

- Smaller, focused modules
- Clear separation of concerns
- Easier to understand and modify

### Better Testability

- Test individual modules in isolation
- Mock dependencies more easily
- Faster test execution

### Enhanced Extensibility

- Add new Git operations easily
- Compose only what you need
- Better tree-shaking support

### Future-Proof Architecture

- Modular design scales better
- Easier to add new features
- Better separation of concerns
