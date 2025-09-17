# GitVan v2 Composables Documentation

## 📚 Complete Documentation Index

This directory contains comprehensive documentation for the refactored GitVan v2 composables system.

## 📖 Documentation Files

### Core Documentation

1. **[index.md](./index.md)** - Main architecture overview and module index
   - Factory pattern explanation
   - Directory structure
   - Usage examples
   - Migration guide overview

2. **[git-api.md](./git-api.md)** - Complete API reference for Git operations
   - Detailed function documentation
   - Parameter descriptions
   - Return value examples
   - Usage patterns

3. **[migration-guide.md](./migration-guide.md)** - Step-by-step migration from v1
   - Breaking changes
   - API renames
   - New features
   - Troubleshooting

4. **[quick-reference.md](./quick-reference.md)** - Cheat sheet for quick lookup
   - Common operations
   - Function signatures
   - Migration table
   - New features summary

## 🏗️ Architecture Overview

### Factory Pattern
Each module exports a factory function:
```javascript
export default function makeX(base, run, runVoid, toArr) {
  return { /* functions */ }
}
```

### Modular Structure
- **15 focused modules** (~80 lines each)
- **Single responsibility** per module
- **No cross-imports** between modules
- **Barrel export** for composition

### Key Improvements
- **80/20 features**: Release helpers, path filtering, convenience methods
- **Enhanced environment**: Deterministic locale and timezone
- **Better testability**: Mock individual modules
- **Improved maintainability**: Smaller, focused files

## 🚀 New Features

### Release Helpers
- `shortlog(range)` - Generate shortlog for release notes
- `trailers(range)` - Extract commit trailers

### Path Filtering
- `pathsChanged(globs, from, to)` - Filter changed files by glob patterns

### Convenience Methods
- `pushTags(remote)` - Push tags to remote
- `defaultRemote()` - Detect default remote
- `NOTES_REF` constant with defaulting

### Enhanced Environment
- `TZ=UTC` - UTC timezone
- `LANG=C` - C locale
- `LC_ALL=C` - C locale for all categories
- `GIT_TERMINAL_PROMPT=0` - Disable terminal prompts

## 📋 API Changes

| Old Name | New Name | Notes |
|----------|----------|-------|
| `head()` | `headSha()` | More descriptive |
| `repoRoot()` | `root()` | Shorter |
| `statusPorcelain()` | `status()` | Simplified |
| `catFilePretty()` | `catFile()` | Simplified |

## 🔧 Usage Examples

### Basic Usage
```javascript
import { useGit } from "./src/composables/git/index.mjs";
const git = useGit();

const root = await git.root();
const headSha = await git.headSha();
const status = await git.status();
```

### Advanced Features
```javascript
// Release helpers
const shortlog = await git.shortlog("v1.0.0..HEAD");
const trailers = await git.trailers("HEAD~5..HEAD");

// Path filtering
const jsFiles = await git.pathsChanged(["*.js", "*.mjs"], "HEAD~1", "HEAD");

// Convenience methods
await git.pushTags("origin");
const remote = await git.defaultRemote();
```

### Testing
```javascript
import makeRepo from "./src/composables/git/repo.mjs";

const mockBase = { cwd: "/test", env: {} };
const mockRun = async (args) => "test-output";
const mockRunVoid = async (args) => {};
const mockToArr = (x) => Array.isArray(x) ? x : [x];

const repo = makeRepo(mockBase, mockRun, mockRunVoid, mockToArr);
const root = await repo.root();
```

## 📁 Module Structure

```
src/composables/git/
├── index.mjs              # Barrel export
├── runner.mjs             # Core runner
├── repo.mjs               # Repository info
├── commits.mjs            # Commit operations
├── diff.mjs               # Diff operations
├── branches.mjs           # Branch operations
├── tags.mjs               # Tag operations
├── notes.mjs              # Notes operations
├── refs.mjs               # Reference operations
├── worktrees.mjs          # Worktree operations
├── remotes.mjs            # Remote operations
├── merge_rebase_reset.mjs # Merge/rebase/reset
├── stash.mjs              # Stash operations
├── cherry_revert.mjs      # Cherry-pick/revert
└── plumbing.mjs           # Low-level operations
```

## 🧪 Testing Strategy

### Unit Testing
- Test individual modules in isolation
- Mock dependencies easily
- Faster test execution
- Better coverage

### Integration Testing
- Test composed functionality
- Verify context integration
- Test error handling
- Performance testing

## 🔄 Migration Process

1. **Update imports** - Change paths to new structure
2. **Rename functions** - Use new API names
3. **Test changes** - Verify functionality
4. **Adopt new features** - Use enhanced capabilities

## 📊 Benefits

### Maintainability
- Smaller, focused modules
- Clear separation of concerns
- Easier to understand and modify

### Testability
- Test individual modules
- Mock dependencies easily
- Faster test execution

### Extensibility
- Add new operations easily
- Compose only what you need
- Better tree-shaking

### Performance
- Modular loading
- Efficient composition
- Deterministic behavior

## 🎯 Next Steps

1. **Review documentation** - Understand the new structure
2. **Plan migration** - Identify affected code
3. **Update imports** - Change to new paths
4. **Rename functions** - Use new API names
5. **Test thoroughly** - Verify functionality
6. **Adopt new features** - Use enhanced capabilities

## 📞 Support

For questions or issues:
1. Check the [Migration Guide](./migration-guide.md)
2. Review the [API Reference](./git-api.md)
3. Consult the [Quick Reference](./quick-reference.md)
4. Check existing tests for examples
