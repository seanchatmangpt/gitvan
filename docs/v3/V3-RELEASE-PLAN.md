# GitVan v3.0.0 Release Plan

**Status**: ✅ APPROVED FOR IMPLEMENTATION
**Type**: COMPLETE REWRITE (No Backwards Compatibility)
**Timeline**: 10 weeks (400 hours)
**Target**: Production-ready npm package

---

## Executive Summary

GitVan v3.0.0 is a **complete rewrite** that:

- ✅ **Eliminates 90% of code** (76,483 → ~8,000 LOC)
- ✅ **Builds entirely on unrdf** (zero RDF code duplication)
- ✅ **Production-ready from day 1** (80%+ test coverage)
- ✅ **Focused scope** (Git + Dev automation only)
- ❌ **No backwards compatibility** (clean break from v2)

### Why Complete Rewrite?

| Issue | v2 Impact | v3 Solution |
|-------|-----------|-------------|
| 60% code duplicates unrdf | Maintenance nightmare | Delete all, import unrdf |
| 7 pack registry implementations | Confusing, fragmented | Single RDF-based registry |
| Invalid package.json | Cannot publish | Proper npm package |
| 277 files, 76k LOC | 50-70% incomplete | ~50 files, ~8k LOC, 100% complete |
| No test infrastructure | Cannot validate | 80%+ coverage from start |

---

## Architecture Overview

### v3 = unrdf + Git-Native I/O + Dev Workflows

```
┌─────────────────────────────────────────────────────┐
│                  GitVan v3.0.0                      │
├─────────────────────────────────────────────────────┤
│  CLI Layer (citty)                                  │
│  └── gitvan [init|hooks|workflow|pack|git|daemon]   │
├─────────────────────────────────────────────────────┤
│  Domain Layer                                       │
│  ├── hooks/      JTBD hooks → unrdf defineHook     │
│  ├── workflows/  YAML workflows → unrdf transactions│
│  └── packs/      Single registry → unrdf SPARQL    │
├─────────────────────────────────────────────────────┤
│  Core Layer                                         │
│  ├── git/        Git operations (simple-git)       │
│  └── git-native/ Locks, queues, receipts           │
├─────────────────────────────────────────────────────┤
│  Foundation Layer (external)                        │
│  └── unrdf v4.1.1  RDF, SPARQL, hooks, transactions│
└─────────────────────────────────────────────────────┘
```

### File Structure (~50 files, ~8,000 LOC)

```
gitvan/
├── bin/
│   └── gitvan.mjs              # CLI entry (20 LOC)
├── src/
│   ├── index.mjs               # Public exports (100 LOC)
│   ├── cli/                    # CLI commands (800 LOC)
│   │   ├── index.mjs           # Main CLI
│   │   ├── init.mjs            # gitvan init
│   │   ├── hooks.mjs           # gitvan hooks [list|run|create]
│   │   ├── workflow.mjs        # gitvan workflow [list|run|create]
│   │   ├── pack.mjs            # gitvan pack [install|list|search]
│   │   ├── git.mjs             # gitvan git [status|commit|push]
│   │   └── daemon.mjs          # gitvan daemon [start|stop]
│   ├── git/                    # Git operations (1,200 LOC)
│   │   ├── index.mjs           # useGit composable
│   │   ├── commits.mjs         # Commit operations
│   │   ├── branches.mjs        # Branch operations
│   │   ├── worktrees.mjs       # Worktree operations
│   │   ├── remotes.mjs         # Remote operations
│   │   └── refs.mjs            # Ref operations
│   ├── git-native/             # Git-native I/O (2,000 LOC)
│   │   ├── index.mjs           # Public exports
│   │   ├── lock-manager.mjs    # Distributed locking
│   │   ├── queue-manager.mjs   # Operation queuing
│   │   ├── snapshot-store.mjs  # State snapshots
│   │   ├── receipt-writer.mjs  # Audit trails
│   │   └── worker-pool.mjs     # Parallel execution
│   ├── hooks/                  # JTBD hooks (1,000 LOC)
│   │   ├── index.mjs           # Hook exports
│   │   ├── registry.mjs        # Hook discovery
│   │   ├── executor.mjs        # Hook execution
│   │   └── bridge.mjs          # unrdf defineHook bridge
│   ├── workflows/              # Workflow engine (1,500 LOC)
│   │   ├── index.mjs           # Workflow exports
│   │   ├── parser.mjs          # YAML → workflow
│   │   ├── executor.mjs        # Step execution
│   │   ├── handlers/           # Step handlers
│   │   │   ├── sparql.mjs      # SPARQL queries
│   │   │   ├── template.mjs    # Nunjucks templates
│   │   │   ├── file.mjs        # File operations
│   │   │   ├── cli.mjs         # Shell commands
│   │   │   ├── http.mjs        # HTTP requests
│   │   │   └── git.mjs         # Git operations
│   │   └── transactions.mjs    # unrdf transaction integration
│   ├── packs/                  # Pack system (1,000 LOC)
│   │   ├── index.mjs           # Pack exports
│   │   ├── registry.mjs        # Single RDF-based registry
│   │   ├── installer.mjs       # Pack installation
│   │   ├── templates.mjs       # Template processing
│   │   └── sources/            # Pack sources
│   │       ├── npm.mjs         # npm registry
│   │       ├── github.mjs      # GitHub repos
│   │       └── local.mjs       # Local directories
│   ├── integration/            # unrdf integration (500 LOC)
│   │   ├── index.mjs           # Integration exports
│   │   ├── context.mjs         # GitVan context
│   │   ├── graph-sync.mjs      # RDF ↔ Git sync
│   │   └── hooks.mjs           # Hook bridge
│   └── utils/                  # Shared utilities (400 LOC)
│       ├── index.mjs           # Utility exports
│       ├── logger.mjs          # Logging (consola)
│       ├── config.mjs          # Configuration
│       └── errors.mjs          # Error handling
├── hooks/                      # JTBD hook definitions (.ttl)
│   ├── developer-workflow/     # Dev workflow hooks
│   └── jtbd-hooks/             # Business hooks
├── workflows/                  # Workflow definitions (.yaml)
│   ├── data-processing.yaml
│   └── code-generation.yaml
├── packs/                      # Pack templates
│   ├── nextjs-dashboard/
│   └── docker-compose/
├── test/                       # Tests (vitest)
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                       # Documentation
│   ├── getting-started.md
│   ├── api/
│   └── tutorials/
├── package.json                # npm package
├── vitest.config.mjs           # Test config
└── README.md                   # Project readme
```

---

## What Gets Deleted (v2 → v3)

### Complete Deletion List

**Engines** (defer to unrdf):
- ❌ `src/engines/RdfEngine.mjs` (502 LOC) → `import { RdfEngine } from 'unrdf'`

**Duplicate Composables** (defer to unrdf):
- ❌ `src/composables/graph.mjs` → `import { useGraph } from 'unrdf'`
- ❌ `src/composables/turtle.mjs` → `import { useTurtle } from 'unrdf'`

**Pack Registry Implementations** (replace with 1):
- ❌ `src/pack/pack-registry-manager.mjs`
- ❌ `src/pack/registry-manager.mjs`
- ❌ `src/pack/registry-original.mjs` (1,917 LOC!)
- ❌ `src/pack/registry-refactored.mjs`
- ❌ `src/pack/lazy-registry.mjs`
- ❌ `src/pack/graph-registry.mjs`
- ❌ `src/pack/pack-registry-search.mjs`

**Legacy CLI** (replace with citty):
- ❌ `src/cli/cli-core.mjs`
- ❌ `src/cli/cli-legacy.mjs`
- ❌ All command files using old patterns

**Test Stubs** (replace with proper tests):
- ❌ `examples/*.test.mjs` (82 files in wrong location)

**Unused Files**:
- ❌ Root folder test/demo files (100+ files)
- ❌ Incomplete implementations
- ❌ Duplicate configurations

**Total Deletion**: ~250 files, ~68,000 LOC

---

## What Gets Kept (Refactored)

### Git-Native I/O (Keep, Refactor)
```
src/git-native/
├── LockManager.mjs      → lock-manager.mjs (cleanup)
├── QueueManager.mjs     → queue-manager.mjs (cleanup)
├── SnapshotStore.mjs    → snapshot-store.mjs (cleanup)
├── ReceiptWriter.mjs    → receipt-writer.mjs (cleanup)
└── WorkerPool.mjs       → worker-pool.mjs (cleanup)
```

**Refactoring**:
- Consistent naming (kebab-case)
- Remove duplicate files (lowercase vs PascalCase)
- Add TypeScript-style JSDoc
- Add proper tests

### Git Operations (Keep, Refactor)
```
src/composables/git/
├── commits.mjs          → git/commits.mjs
├── branches.mjs         → git/branches.mjs
├── worktrees.mjs        → git/worktrees.mjs
└── ...
```

**Refactoring**:
- Move to `src/git/`
- Use simple-git consistently
- Add error handling
- Add tests

### Hook Definitions (Keep, Format Change)
```
hooks/*.ttl              → Keep structure
                         → Add YAML alternative
```

**Changes**:
- Keep .ttl format (RDF-native)
- Add .yaml format option (human-friendly)
- Better documentation

### Workflow Definitions (Keep, Format Change)
```
workflows/*.ttl          → workflows/*.yaml (new format)
```

**Changes**:
- Convert from Turtle to YAML
- More human-readable
- Schema validation via Zod

### Pack Templates (Keep, Cleanup)
```
packs/
├── nextjs-dashboard-pack/  → packs/nextjs-dashboard/
└── nextjs-cms-pack/        → packs/nextjs-cms/
```

**Changes**:
- Simplified directory names
- Updated to Next.js 15
- Better documentation

---

## Implementation Phases

### Phase 0: Scaffolding (Week 1, 40 hours)

**Goal**: Clean project foundation

**Tasks**:
1. Create fresh branch `v3-rewrite`
2. Delete all v2 source code
3. Create new directory structure
4. Setup package.json
5. Configure vitest
6. Configure unbuild
7. Setup GitHub Actions CI
8. Create initial README

**Deliverables**:
- [ ] Clean `src/` directory structure
- [ ] Working `package.json` with unrdf dependency
- [ ] `pnpm test` runs (no tests yet)
- [ ] `pnpm build` works
- [ ] CI pipeline green

**Acceptance Criteria**:
```bash
pnpm install    # Works
pnpm build      # Works
pnpm test       # Runs (0 tests)
pnpm lint       # Passes
```

---

### Phase 1: Core Foundation (Weeks 2-3, 80 hours)

**Goal**: Git operations and unrdf integration

**Tasks**:

**Week 2: Git Operations**
1. Port `git-native/` with cleanup (20h)
   - lock-manager.mjs
   - queue-manager.mjs
   - snapshot-store.mjs
   - receipt-writer.mjs
   - worker-pool.mjs
2. Create `git/` composable (20h)
   - useGit() factory
   - Commit operations
   - Branch operations
   - Ref operations

**Week 3: unrdf Integration**
3. Create integration layer (20h)
   - context.mjs (GitVan context using unctx)
   - graph-sync.mjs (RDF ↔ Git synchronization)
4. Basic CLI (20h)
   - gitvan init
   - gitvan git status
   - gitvan git commit

**Deliverables**:
- [ ] Git-native I/O working with tests
- [ ] Git operations working with tests
- [ ] unrdf integration layer
- [ ] Basic CLI commands

**Acceptance Criteria**:
```bash
gitvan init                     # Creates .gitvan/
gitvan git status               # Shows git status
gitvan git commit -m "test"     # Creates commit
```

---

### Phase 2: Hook System (Weeks 4-5, 80 hours)

**Goal**: JTBD hooks bridging to unrdf

**Tasks**:

**Week 4: Hook Infrastructure**
1. Hook registry (20h)
   - Discover hooks from `hooks/` directory
   - Parse .ttl and .yaml formats
   - Index by category/domain
2. Hook executor (20h)
   - Bridge to unrdf defineHook
   - Evaluate SPARQL conditions
   - Execute workflows on trigger

**Week 5: Hook CLI**
3. Hook CLI commands (20h)
   - gitvan hooks list
   - gitvan hooks run <hook-id>
   - gitvan hooks create <name>
4. Hook evaluation (20h)
   - Predicate types (ASK, SELECTThreshold, ResultDelta, SHACL)
   - Integration with Git events
   - Tests for all predicate types

**Deliverables**:
- [ ] Hook discovery and registry
- [ ] Hook execution via unrdf
- [ ] CLI commands for hooks
- [ ] 80%+ test coverage for hooks

**Acceptance Criteria**:
```bash
gitvan hooks list                   # Lists discovered hooks
gitvan hooks run version-change     # Runs specific hook
gitvan hooks create my-hook         # Creates hook template
```

---

### Phase 3: Workflow Engine (Weeks 6-7, 80 hours)

**Goal**: YAML workflows with unrdf transactions

**Tasks**:

**Week 6: Workflow Core**
1. YAML parser (20h)
   - Parse workflow YAML
   - Validate with Zod schema
   - Convert to execution plan
2. Step handlers (20h)
   - SPARQL handler (query via unrdf)
   - Template handler (render via nunjucks)
   - File handler (read/write/copy)
   - CLI handler (execute commands)
   - HTTP handler (fetch APIs)
   - Git handler (Git operations)

**Week 7: Workflow Execution**
3. Transaction integration (20h)
   - Wrap workflow in unrdf transaction
   - Rollback on failure
   - Commit on success
4. Workflow CLI (20h)
   - gitvan workflow list
   - gitvan workflow run <id>
   - gitvan workflow create <name>

**Deliverables**:
- [ ] YAML workflow parser
- [ ] 6 step handlers
- [ ] Transaction-based execution
- [ ] CLI commands for workflows

**Acceptance Criteria**:
```bash
gitvan workflow list              # Lists workflows
gitvan workflow run data-process  # Runs workflow
gitvan workflow create my-flow    # Creates workflow template
```

---

### Phase 4: Pack System (Week 8, 40 hours)

**Goal**: Single pack registry (not 7!)

**Tasks**:
1. Pack registry (15h)
   - RDF-based metadata storage
   - SPARQL discovery queries
   - Single source of truth
2. Pack installer (15h)
   - Install from npm
   - Install from GitHub
   - Install from local
3. Pack CLI (10h)
   - gitvan pack install <name>
   - gitvan pack list
   - gitvan pack search <query>

**Deliverables**:
- [ ] Single pack registry
- [ ] Multi-source installation
- [ ] CLI commands for packs

**Acceptance Criteria**:
```bash
gitvan pack list                    # Lists installed packs
gitvan pack install nextjs-dashboard # Installs pack
gitvan pack search "react"          # Searches registry
```

---

### Phase 5: Polish (Weeks 9-10, 80 hours)

**Goal**: Production-ready release

**Tasks**:

**Week 9: Documentation**
1. README with quick start (8h)
2. API documentation with JSDoc (16h)
3. Tutorials (16h)
   - Getting started
   - Creating hooks
   - Creating workflows
   - Creating packs

**Week 10: Testing & Release**
4. Integration tests (16h)
5. E2E tests (8h)
6. Performance benchmarks (8h)
7. npm publish preparation (8h)

**Deliverables**:
- [ ] Complete documentation
- [ ] 80%+ test coverage
- [ ] Performance benchmarks
- [ ] npm package published

**Acceptance Criteria**:
```bash
npm install -g gitvan@3.0.0   # Works!
gitvan --version              # 3.0.0
gitvan init && gitvan setup   # Full workflow works
```

---

## Dependencies

### Production Dependencies (8 packages)

```json
{
  "dependencies": {
    "unrdf": "^4.1.1",        // RDF foundation (includes 44 deps)
    "simple-git": "^3.25.0",  // Git operations
    "hookable": "^5.5.3",     // Hook system
    "unctx": "^2.3.1",        // Context management
    "consola": "^3.2.3",      // Logging
    "pathe": "^1.1.2",        // Path utilities
    "ofetch": "^1.3.4",       // HTTP fetching
    "defu": "^6.1.4"          // Config merging
  }
}
```

**Note**: citty, nunjucks, zod, n3 come from unrdf

### Dev Dependencies (8 packages)

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "unbuild": "^2.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0",
    "citty-test-utils": "^1.0.2"
  }
}
```

---

## Success Metrics

### Code Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | 80%+ | vitest --coverage |
| Type Coverage | 100% | JSDoc annotations |
| Lint Errors | 0 | eslint |
| Bundle Size | <500KB | unbuild stats |

### Performance

| Operation | Target | Measurement |
|-----------|--------|-------------|
| CLI startup | <100ms | time gitvan --version |
| Hook evaluation | <5ms | Benchmark tests |
| Workflow step | <100ms | Benchmark tests |
| Pack install | <10s | Integration tests |

### Documentation

| Metric | Target |
|--------|--------|
| API coverage | 100% of exports |
| Tutorials | 4 complete guides |
| Examples | 10+ working examples |

---

## Risk Mitigation

### Risk: unrdf API Changes
**Mitigation**: Pin to specific version (^4.1.1), wrap in integration layer

### Risk: Missing Features from v2
**Mitigation**: Document breaking changes, provide migration guide

### Risk: Performance Regression
**Mitigation**: Benchmark tests, performance budgets

### Risk: User Adoption
**Mitigation**: Clear migration guide, deprecation warnings in v2

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Scaffolding | Clean project, CI/CD |
| 2-3 | Core Foundation | Git ops, unrdf integration |
| 4-5 | Hook System | JTBD hooks, CLI |
| 6-7 | Workflow Engine | YAML workflows, transactions |
| 8 | Pack System | Single registry, CLI |
| 9-10 | Polish | Docs, tests, npm publish |

**Total**: 10 weeks, 400 hours
**Release Date**: Week 10

---

## Migration Guide (v2 → v3)

### Breaking Changes

1. **No backwards compatibility** - v3 is a complete rewrite
2. **New CLI syntax** - Commands restructured
3. **New config format** - YAML instead of JSON
4. **New workflow format** - YAML instead of Turtle
5. **New API surface** - Different exports

### Migration Steps

1. **Backup v2 project**
   ```bash
   cp -r .gitvan .gitvan-v2-backup
   ```

2. **Install v3**
   ```bash
   npm install -g gitvan@3.0.0
   ```

3. **Reinitialize**
   ```bash
   rm -rf .gitvan
   gitvan init
   ```

4. **Convert hooks** (if custom)
   - Move .ttl files to `hooks/`
   - Or convert to .yaml format

5. **Convert workflows** (if custom)
   - Convert .ttl to .yaml format
   - Update step syntax

### What Doesn't Migrate

- Custom RDF engine extensions (use unrdf directly)
- Pack registry customizations (single registry now)
- Legacy CLI scripts (new syntax)

---

## Approval

**Architecture**: ✅ Approved (system-architect agent)
**Implementation**: ✅ Approved (planner agent)
**Package Design**: ✅ Approved (coder agent)

**Ready to begin Phase 0 implementation.**

---

## Next Steps

1. Create `v3-rewrite` branch
2. Delete all v2 source code
3. Setup new package.json
4. Begin Phase 0 scaffolding

**Let's build GitVan v3.0.0! 🚀**
