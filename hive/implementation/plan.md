# useGit() Composable Implementation Plan

## Overview
Implementation strategy for the useGit() composable following the prototype specification in USE-GIT-PROTOTYPE.md. The goal is to create a clean ESM module with no external dependencies, POSIX-first approach, and deterministic execution environment.

## Key Differences from Current Implementation
The existing `git.mjs` uses `execSync` and shell string interpolation, while the prototype specifies:
- Async operations with `execFile` (promisified)
- No shell interpolation for security
- Deterministic environment (TZ=UTC, LANG=C)
- Context binding with unctx to avoid async context loss
- 80/20 command selection focusing on core operations

## Implementation Strategy

### 1. Core Architecture
```js
// Context binding pattern from prototype
function bindContext() {
  let ctx;
  try {
    ctx = useGitVan?.();
  } catch {
    ctx = tryUseGitVan?.();
  }
  const cwd = (ctx && ctx.cwd) || process.cwd();
  const env = {
    TZ: "UTC",
    LANG: "C",
    ...process.env,
    ...(ctx && ctx.env ? ctx.env : {}),
  };
  return { ctx, cwd, env };
}
```

### 2. Execution Layer
- Use `promisify(execFile)` instead of `execSync`
- No shell interpolation - pass arguments as array
- Deterministic environment variables
- Error handling for happy path execution

### 3. API Surface (80/20 Command Selection)

#### Repository Information
- `branch()` - Current branch name
- `head()` - Current HEAD SHA
- `repoRoot()` - Repository root path
- `worktreeGitDir()` - Git directory path
- `nowISO()` - Current ISO timestamp (with GITVAN_NOW override)

#### Read-only Operations
- `log(format, extra)` - Git log with custom format
- `statusPorcelain()` - Porcelain status output
- `isAncestor(a, b)` - Check if commit is ancestor
- `mergeBase(a, b)` - Find merge base
- `revList(args)` - List revisions

#### Write Operations
- `add(paths)` - Stage files
- `commit(message, opts)` - Create commit
- `tag(name, msg, opts)` - Create tag

#### Notes Management (for receipts)
- `noteAdd(ref, message, sha)` - Add note
- `noteAppend(ref, message, sha)` - Append to note
- `noteShow(ref, sha)` - Show note content

#### Atomic Reference Operations (for locks)
- `updateRefCreate(ref, valueSha)` - Atomically create ref if absent

#### Plumbing Commands
- `hashObject(filePath, opts)` - Hash file object
- `writeTree()` - Write tree object
- `catFilePretty(sha)` - Show object content

#### Generic Runners
- `run(args)` - Generic git command with output
- `runVoid(args)` - Generic git command without output

### 4. Context Integration
The implementation must work with the existing unctx-based context system:
- Import from `../core/context.mjs` (needs verification/creation)
- Support both strict `useGitVan()` and fallback `tryUseGitVan()`
- Bind context once at function creation to avoid async loss

### 5. Environment Determinism
- `TZ=UTC` for consistent timestamps
- `LANG=C` for consistent command output
- Merge with process.env and context-specific env

### 6. Security Considerations
- No shell string interpolation
- Path validation for file operations
- Proper argument escaping via execFile array parameters

## Implementation Steps

1. **Replace existing implementation** - Override current git.mjs with prototype-based implementation
2. **Context integration** - Ensure proper import paths for context functions
3. **Testing infrastructure** - Create basic tests to verify functionality
4. **Error handling** - Implement robust error handling for happy path
5. **Validation** - Test all operations against real git repository

## Dependencies
- `node:child_process` (execFile)
- `node:util` (promisify)
- `node:path` (path operations)
- `unctx` (context management) - already in package.json
- Context module (needs verification: `../core/context.mjs`)

## Success Criteria
- All operations work with real git repository
- No external dependencies beyond Node.js built-ins and unctx
- Deterministic execution environment
- Proper context binding without async loss
- Clean ESM module structure
- 80/20 command coverage for core Git operations