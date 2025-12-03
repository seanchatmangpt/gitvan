# GitVan v3.0.0 Package Design

## Overview

GitVan v3.0.0 is a complete rewrite built on top of **unrdf** (v4.1.1), leveraging its RDF knowledge graph capabilities while adding Git-native development automation.

## Package Structure

### Dependencies Strategy

**Primary Dependency: unrdf (v4.1.1)**
- Provides: RDF engine, SPARQL, SHACL, hooks, transactions
- Includes: citty, n3, @comunica/query-sparql, nunjucks, zod
- Total: 44+ transitive dependencies

**GitVan-Specific Dependencies (Minimal)**
- `simple-git@^3.25.0` - Git operations wrapper
- `hookable@^5.5.3` - Hook system (if not using unrdf's hooks)
- `unctx@^2.3.1` - Context management
- `consola@^3.2.3` - Logging
- `pathe@^1.1.2` - Path utilities
- `ofetch@^1.3.4` - HTTP fetching
- `defu@^6.1.4` - Deep merge utilities

**Why This Is Minimal:**
- unrdf already provides citty (CLI framework)
- unrdf already provides nunjucks (templates)
- unrdf already provides zod (validation)
- unrdf already provides n3 (RDF parsing)
- GitVan only adds Git-specific operations

### Exports Map

```json
{
  ".": "./src/index.mjs",                    // Main entry
  "./composables": "./src/composables/index.mjs",
  "./composables/*": "./src/composables/*.mjs",
  "./git-native": "./src/git-native/GitNativeIO.mjs",
  "./git-native/*": "./src/git-native/*.mjs",
  "./jobs": "./src/jobs/runner.mjs",
  "./jobs/*": "./src/jobs/*.mjs",
  "./pack": "./src/pack/index.mjs",
  "./pack/*": "./src/pack/*.mjs",
  "./engines": "./src/engines/RdfEngine.mjs",
  "./cli": "./src/cli.mjs",
  "./runtime": "./src/runtime/boot.mjs",
  "./runtime/*": "./src/runtime/*.mjs",
  "./config": "./src/config/loader.mjs"
}
```

### Module Organization

#### 1. Core Composables (`./composables`)
Git-native composable utilities following Vue/Nuxt patterns:
- `useGit()` - Git operations
- `useFileSystem()` - File system utilities
- `useWorktree()` - Worktree management
- `useTemplate()` - Template rendering (via unrdf/nunjucks)
- `useNotes()` - Git notes management
- `useJob()` - Job system
- `useEvent()` - Event handling
- `useSchedule()` - Cron scheduling
- `useReceipt()` - Receipt management
- `useLock()` - File locking
- `useRegistry()` - Pack registry
- `usePack()` - Pack utilities

#### 2. Git-Native I/O (`./git-native`)
Low-level Git-native storage and I/O:
- `GitNativeIO` - Core Git I/O operations
- `LockManager` - File locking using Git refs
- `SnapshotStore` - Git-based snapshots
- `QueueManager` - Queue management
- `WorkerPool` - Worker thread pool
- `ReceiptWriter` - Receipt writing

#### 3. Job System (`./jobs`)
Job definition, scanning, and execution:
- `JobRunner` - Execute jobs
- `scanJobs()` - Discover jobs
- `defineJob()` - Define jobs
- Cron scheduling
- Event triggers

#### 4. Pack System (`./pack`)
Package management and distribution:
- `PackManager` - Pack lifecycle
- `PackApplier` - Apply packs
- `PackPlanner` - Plan operations
- `PackRegistry` - Registry management
- `PackSigner` - Security/signatures
- `ReceiptManager` - Receipt tracking

#### 5. RDF Engine (`./engines`)
RDF integration wrapper around unrdf:
- `RdfEngine` - Unified RDF operations
- Delegates to unrdf's KnowledgeEngine
- Adds Git-native graph storage

#### 6. Runtime (`./runtime`)
Bootstrap and initialization:
- `boot()` - Initialize GitVan
- `createGitVan()` - Factory function
- `GitVanDaemon` - Background daemon
- Lock utilities
- Configuration

#### 7. CLI (`./cli`)
Command-line interface (using citty from unrdf):
- Graph commands
- Daemon commands
- Event commands
- Cron commands
- Audit commands
- Hook commands
- Workflow commands
- JTBD commands
- Cleanroom commands

## Usage Examples

### Basic Usage

```javascript
import { useGit, useJob, defineJob } from 'gitvan';

// Use composables
const git = useGit();
await git.commit('Initial commit');

// Define a job
const job = defineJob({
  name: 'build',
  handler: async () => {
    console.log('Building...');
  }
});
```

### Advanced Usage

```javascript
import { GitNativeIO } from 'gitvan/git-native';
import { RdfEngine } from 'gitvan/engines';
import { PackManager } from 'gitvan/pack';

// Git-native I/O
const io = new GitNativeIO({ repoPath: '.' });
await io.write('data.json', { foo: 'bar' });

// RDF engine (delegates to unrdf)
const rdf = new RdfEngine();
await rdf.loadTTL('schema.ttl');

// Pack management
const packs = new PackManager();
await packs.install('react-pack');
```

### CLI Usage

```bash
# Install globally
npm install -g gitvan

# Use CLI
gitvan init
gitvan graph save my-data
gitvan daemon start
gitvan pack install react-pack
gitvan workflow run my-workflow
```

## Dependency Tree

```
gitvan@3.0.0
├── unrdf@4.1.1 (PRIMARY)
│   ├── citty@0.1.6
│   ├── n3@1.17.0
│   ├── @comunica/query-sparql@3.0.0
│   ├── nunjucks@3.2.4
│   ├── zod@3.22.0
│   └── (40+ more)
├── simple-git@3.25.0
├── hookable@5.5.3
├── unctx@2.3.1
├── consola@3.2.3
├── pathe@1.1.2
├── ofetch@1.3.4
└── defu@6.1.4
```

**Total Dependencies:**
- Direct: 8
- Transitive (via unrdf): ~44
- **Total: ~52**

Compare to unrdf alone: **44 dependencies**
GitVan adds only: **8 Git-specific utilities**

## Scripts

```json
{
  "dev": "node src/cli.mjs",
  "build": "unbuild",
  "test": "vitest run --coverage",
  "test:watch": "vitest --coverage",
  "test:e2e": "vitest run test/e2e/",
  "lint": "eslint src/ test/ examples/ --max-warnings=0",
  "format": "prettier --write src/ test/ examples/",
  "docs": "jsdoc -c jsdoc.conf.json",
  "precommit": "pnpm lint && pnpm test",
  "prepublishOnly": "pnpm build && pnpm test"
}
```

## Quality Standards

Following Lean Six Sigma principles:

### Type Safety
- 100% JSDoc coverage
- Type definitions for all exports
- Zod schemas (from unrdf)

### Testing
- Vitest for testing
- Coverage tracking
- E2E test suite
- 80%+ coverage minimum

### Code Quality
- ESLint with strict rules
- Prettier formatting
- Pre-commit hooks
- Zero warnings policy

### Build Process
- unbuild for modern ESM
- Tree-shakeable exports
- No side effects
- Clean dist output

## Migration from v2.x

### Breaking Changes
1. **RDF dependency**: Now built on unrdf instead of custom RDF
2. **Exports map**: New structured exports (no default export)
3. **Dependencies**: Removed duplicate packages (now via unrdf)
4. **Node version**: Requires Node 18+ (was 16+)

### Migration Guide

```javascript
// v2.x
import GitVan from 'gitvan';
const gv = new GitVan();

// v3.0
import { createGitVan } from 'gitvan';
const gv = await createGitVan();
```

## Publishing

```bash
# Build and test
pnpm build
pnpm test

# Publish (automatic via prepublishOnly)
pnpm release:patch  # 3.0.1
pnpm release:minor  # 3.1.0
pnpm release:major  # 4.0.0
```

## Files Included in Package

```
gitvan-3.0.0.tgz
├── src/           # Source code
├── bin/           # CLI executable
├── dist/          # Built output
├── docs/          # Documentation
├── examples/      # Example code
├── README.md
├── LICENSE
└── CHANGELOG.md
```

**Package size**: ~200KB (excluding node_modules)
**With dependencies**: ~50MB (via unrdf)

## Design Decisions

### Why unrdf as Primary Dependency?

1. **RDF Knowledge Graph**: Core requirement for GitVan's knowledge-driven automation
2. **Battle-tested**: 44 production dependencies, proven stack
3. **Feature-rich**: SPARQL, SHACL, hooks, transactions, streaming
4. **CLI Framework**: Citty already included
5. **Validation**: Zod already included
6. **Templates**: Nunjucks already included
7. **Maintenance**: Reduces GitVan's maintenance burden

### Why Minimal Additional Dependencies?

1. **DRY Principle**: Don't duplicate what unrdf provides
2. **Bundle Size**: Keep GitVan lean
3. **Maintenance**: Fewer direct dependencies = less maintenance
4. **Compatibility**: Reduce version conflicts

### Why simple-git?

1. **Git Operations**: Proven library for Git operations
2. **Type Safety**: Full TypeScript support
3. **Feature Complete**: All Git operations covered
4. **Maintained**: Active development

### Why hookable?

1. **Hook System**: May complement unrdf's hooks
2. **Lightweight**: Minimal overhead
3. **Standard**: Used by Nuxt, Nitro, etc.

## Conclusion

GitVan v3.0.0 is a **lean, focused package** that leverages unrdf's robust RDF infrastructure while adding Git-native automation capabilities. The minimal dependency footprint (8 direct) ensures maintainability while the comprehensive exports map provides flexible usage patterns.

**Total Package Quality:**
- Clean npm metadata (no "my-awesome-project")
- Minimal dependencies (leverage unrdf)
- Comprehensive exports map
- Production-ready bin entry
- Full type coverage via JSDoc
- Tested and documented
