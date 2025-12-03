# GitVan Clean Architecture with unrdf Integration

## Executive Summary

**Design Philosophy**: GitVan should be a **thin Git-native layer** on top of unrdf, maximizing code reuse while preserving its unique value proposition as a development automation platform.

**Key Insight**: unrdf provides production-ready RDF infrastructure (4.1.1), while GitVan adds Git operations, development workflows, and automation patterns.

---

## Architecture Decision Records (ADRs)

### ADR-001: GitVan as Thin Layer on unrdf

**Context**: GitVan currently duplicates RDF functionality (RdfEngine, graph operations) that unrdf provides as production-ready components.

**Decision**: GitVan will depend on unrdf as its sole RDF library and delegate all RDF operations to unrdf's components.

**Consequences**:
- ✅ Eliminate ~2,000 LOC of duplicated RDF code
- ✅ Inherit production-grade RDF engine with SHACL, SPARQL, canonicalization
- ✅ Access to 27+ composables from unrdf
- ✅ Automatic security updates and bug fixes from unrdf
- ⚠️ Need to align GitVan hooks with unrdf's defineHook pattern
- ⚠️ Migration path required for existing GitVan code

**Alternatives Rejected**:
- Forking unrdf (maintenance burden, divergence risk)
- Maintaining parallel RDF implementation (code duplication, inconsistency)
- Using multiple RDF libraries (conflicting dependencies, bloat)

---

### ADR-002: Layering Strategy

**Context**: Need clear separation of concerns between unrdf (RDF operations) and GitVan (Git automation).

**Decision**: Three-layer architecture:
```
┌─────────────────────────────────────────┐
│   GitVan Layer (Git + Dev Workflows)    │
│  - Git operations (40+ commands)        │
│  - JTBD hooks (dev lifecycle)           │
│  - Pack system (templates)              │
│  - Workflow automation                  │
│  - Development tooling                  │
└─────────────────────────────────────────┘
                    ↓ uses
┌─────────────────────────────────────────┐
│    Integration Layer (Adapters)         │
│  - GitVan-to-unrdf adapters             │
│  - Hook system bridge                   │
│  - Graph-Git synchronization            │
│  - Context management                   │
└─────────────────────────────────────────┘
                    ↓ uses
┌─────────────────────────────────────────┐
│   unrdf Layer (RDF Infrastructure)      │
│  - Knowledge Engine                     │
│  - RDF operations (SPARQL, SHACL)       │
│  - Composables (27+ utilities)          │
│  - Transaction management               │
│  - Federation, Streaming, AI/Semantic   │
└─────────────────────────────────────────┘
```

**Rationale**: Clear separation enables independent evolution while maintaining clean interfaces.

---

### ADR-003: Dependency Strategy

**Context**: GitVan currently has 25+ dependencies, some of which overlap with unrdf.

**Decision**: Minimize GitVan dependencies by deferring to unrdf where possible:

**Keep in GitVan** (Git-specific, unique to GitVan):
- `citty` - CLI framework (used by both, keep for CLI)
- `c12` - Config loader (GitVan-specific config)
- `cacache` - Git-native caching
- `consola` - Logging (GitVan-specific)
- `defu` - Deep defaults (config merging)
- `gray-matter` - Frontmatter parsing (pack system)
- `hookable` - Hook system (GitVan JTBD hooks)
- `ollama` - AI integration (workflow automation)
- `ai` - Vercel AI SDK (workflow generation)
- `node-cron` - Job scheduling
- `giget` - Template fetching (pack system)
- `unctx` - Context management (GitVan context)
- `pathe`, `minimatch` - File utilities
- `prompts`, `semver`, `toml` - Dev tooling

**Remove from GitVan** (defer to unrdf):
- ❌ `n3` → Use unrdf's N3 integration
- ❌ `@rdfjs/*` → Use unrdf's RDF/JS integration
- ❌ `jsonld` → Use unrdf's JSON-LD composable
- ❌ `nunjucks` → Use unrdf's template engine
- ❌ `zod` → Use unrdf's Zod integration (peer dependency)

**Add to GitVan**:
- ✅ `unrdf` - RDF infrastructure (^4.1.1)

**Result**: ~18 dependencies in GitVan (down from 25+), plus unrdf bringing in its RDF ecosystem.

---

### ADR-004: Code Organization

**Context**: Need clear directory structure that separates GitVan-unique code from unrdf integration.

**Decision**: Reorganize GitVan source structure:

```
gitvan/
├── src/
│   ├── git/                    # KEEP - Git operations
│   │   ├── operations.mjs      # 40+ Git command composables
│   │   ├── worktree.mjs        # Worktree management
│   │   └── hybrid-git.mjs      # Hybrid operations
│   │
│   ├── git-native/             # KEEP - Git-native I/O
│   │   ├── locks.mjs           # File-based locking
│   │   ├── queues.mjs          # Git-native queues
│   │   ├── snapshots.mjs       # Graph snapshots
│   │   └── workers.mjs         # Worker coordination
│   │
│   ├── workflow/               # KEEP - Dev automation
│   │   ├── jtbd-hooks.mjs      # Job-to-be-Done hooks
│   │   ├── automation.mjs      # Workflow automation
│   │   └── scheduler.mjs       # Cron job scheduling
│   │
│   ├── pack/                   # KEEP - Template system
│   │   ├── registry.mjs        # Pack registry
│   │   ├── next-template.mjs   # Next.js templates
│   │   └── compose.mjs         # Docker Compose packs
│   │
│   ├── integrations/           # KEEP - Integrations layer
│   │   ├── unrdf-adapter.mjs   # ✨ NEW - unrdf integration
│   │   ├── hook-bridge.mjs     # ✨ NEW - Hook system bridge
│   │   └── graph-git-sync.mjs  # ✨ NEW - Graph-Git sync
│   │
│   ├── composables/            # REFACTOR - Thin wrappers
│   │   ├── index.mjs           # Re-export unrdf composables
│   │   ├── git.mjs             # Git operations composable
│   │   ├── pack.mjs            # Pack operations composable
│   │   ├── job.mjs             # Job operations composable
│   │   ├── turtle.mjs          # ✨ THIN - Wrapper around unrdf/useTurtle
│   │   ├── graph.mjs           # ✨ THIN - Wrapper around unrdf/useGraph
│   │   └── native-io.mjs       # Git-native I/O composable
│   │
│   ├── engines/                # DELETE - Use unrdf
│   │   └── RdfEngine.mjs       # ❌ DELETE - Use unrdf/RdfEngine
│   │
│   ├── hooks/                  # REFACTOR - Extend unrdf
│   │   ├── PredicateEvaluator.mjs      # Keep (GitVan-specific)
│   │   ├── HookOrchestrator.mjs        # Keep (extends unrdf)
│   │   ├── HookParser.mjs              # Keep (GitVan JTBD parsing)
│   │   └── KnowledgeHookRegistry.mjs   # ✨ BRIDGE - Use unrdf's registry
│   │
│   ├── cli/                    # KEEP - CLI commands
│   │   └── commands/           # GitVan-specific commands
│   │
│   ├── config/                 # KEEP - GitVan config
│   │   └── loader.mjs          # GitVan config system
│   │
│   ├── core/                   # KEEP - GitVan core
│   │   └── context.mjs         # GitVan context (unctx)
│   │
│   └── utils/                  # KEEP - GitVan utilities
│       └── persistence-helper.mjs      # Git-native persistence
│
├── docs/
│   ├── ARCHITECTURE_UNRDF_INTEGRATION.md   # This document
│   └── MIGRATION_TO_UNRDF.md               # Migration guide
│
└── package.json                # Minimal dependencies + unrdf
```

**Rationale**: Clear separation of GitVan-unique code from unrdf integration points.

---

### ADR-005: Integration Pattern

**Context**: Need pattern for initializing unrdf within GitVan and bridging hook systems.

**Decision**: Adapter Pattern with Context Isolation

**Implementation**:

```javascript
// src/integrations/unrdf-adapter.mjs
import { createKnowledgeEngine } from 'unrdf/knowledge-engine';
import { useGraph, useTurtle } from 'unrdf';
import { useGitVan } from '../core/context.mjs';

/**
 * Creates unrdf-powered knowledge engine within GitVan context
 */
export async function createGitVanKnowledgeEngine(options = {}) {
  const ctx = useGitVan();

  // Initialize unrdf knowledge engine
  const engine = await createKnowledgeEngine({
    baseIRI: options.baseIRI || 'https://gitvan.dev/',
    graphDir: options.graphDir || ctx.graphDir,
    enableTransactions: true,
    enableObservability: true,
    enableDarkMatter: true,
    ...options
  });

  // Bridge GitVan context with unrdf engine
  ctx.knowledgeEngine = engine;

  return engine;
}

/**
 * GitVan-aware graph composable (wraps unrdf's useGraph)
 */
export function useGitVanGraph(storeOrPath) {
  const ctx = useGitVan();

  // If path provided, load from Git-native storage
  if (typeof storeOrPath === 'string') {
    const store = ctx.loadGraphFromGit(storeOrPath);
    return useGraph(store);
  }

  return useGraph(storeOrPath);
}

/**
 * GitVan-aware turtle composable (wraps unrdf's useTurtle)
 */
export async function useGitVanTurtle(options = {}) {
  const ctx = useGitVan();

  const turtle = await useTurtle({
    graphDir: options.graphDir || ctx.graphDir,
    ...options
  });

  // Extend with GitVan-specific methods
  return {
    ...turtle,

    // Save graph to Git-native storage
    async saveToGit(path, commitMessage) {
      const ttl = await turtle.serialize({ format: 'Turtle' });
      await ctx.saveGraphToGit(path, ttl, commitMessage);
    },

    // Load graph from Git history
    async loadFromGit(path, revision = 'HEAD') {
      const ttl = await ctx.loadGraphFromGit(path, revision);
      const loadedStore = turtle.engine.parseTurtle(ttl);

      // Merge or replace based on options
      if (options.merge) {
        for (const quad of loadedStore) {
          turtle.store.add(quad);
        }
      } else {
        turtle.store.removeQuads([...turtle.store]);
        for (const quad of loadedStore) {
          turtle.store.add(quad);
        }
      }

      return turtle;
    },

    // Get JTBD hooks (GitVan-specific)
    getJtbdHooks() {
      return ctx.jtbdHooks.extractFromGraph(turtle.store);
    }
  };
}
```

**Hook System Bridge**:

```javascript
// src/integrations/hook-bridge.mjs
import { defineHook as unrdfDefineHook } from 'unrdf/knowledge-engine';
import { useGitVan } from '../core/context.mjs';

/**
 * GitVan hook wrapper that extends unrdf's defineHook
 */
export function defineGitVanHook(config) {
  const ctx = useGitVan();

  // Create unrdf hook with GitVan extensions
  const unrdfHook = unrdfDefineHook({
    name: config.name,
    predicate: config.predicate,

    // Wrap handler to include Git operations
    async handler(context) {
      const gitContext = {
        ...context,
        git: ctx.git,              // Git operations
        pack: ctx.pack,            // Pack system
        workflow: ctx.workflow,    // Workflow automation
      };

      // Execute original handler with Git context
      const result = await config.handler(gitContext);

      // Auto-commit if configured
      if (config.autoCommit && result.modified) {
        await ctx.git.commit({
          message: `[${config.name}] ${result.commitMessage}`,
          files: result.modified
        });
      }

      return result;
    },

    // Pass through other config
    condition: config.condition,
    priority: config.priority,
    tags: config.tags
  });

  // Register in GitVan's JTBD system
  if (config.jtbd) {
    ctx.jtbdHooks.register(config.jtbd, unrdfHook);
  }

  return unrdfHook;
}

/**
 * Convert GitVan JTBD hooks to unrdf hooks
 */
export function jtbdToUnrdfHook(jtbdConfig) {
  return defineGitVanHook({
    name: jtbdConfig.title,
    predicate: jtbdConfig.pred,
    handler: async (context) => {
      // Execute JTBD pipeline
      const result = await context.workflow.executePipeline(
        jtbdConfig.pipelines,
        context
      );
      return result;
    },
    jtbd: jtbdConfig
  });
}
```

**Graph-Git Synchronization**:

```javascript
// src/integrations/graph-git-sync.mjs
import { TransactionManager } from 'unrdf/knowledge-engine';
import { useGitVan } from '../core/context.mjs';

/**
 * Synchronize RDF graph changes with Git
 */
export class GraphGitSync {
  constructor(options = {}) {
    this.ctx = useGitVan();
    this.autoCommit = options.autoCommit !== false;
    this.commitPrefix = options.commitPrefix || '[graph]';
  }

  /**
   * Wrap unrdf transaction with Git commit
   */
  async transaction(callback, options = {}) {
    const txManager = new TransactionManager({
      enableObservability: true
    });

    // Start transaction
    const tx = txManager.begin({
      description: options.description || 'Graph update'
    });

    try {
      // Execute callback in transaction
      const result = await callback(tx);

      // Commit transaction
      await tx.commit();

      // Auto-commit to Git if enabled
      if (this.autoCommit) {
        const graphPath = options.graphPath || 'knowledge/default.ttl';
        const store = tx.getStore();

        // Serialize and save
        const ttl = await this.ctx.knowledgeEngine.serialize(store);
        await this.ctx.git.writeFile(graphPath, ttl);
        await this.ctx.git.commit({
          message: `${this.commitPrefix} ${options.description}`,
          files: [graphPath]
        });
      }

      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  /**
   * Load graph from Git revision
   */
  async loadRevision(path, revision = 'HEAD') {
    const ttl = await this.ctx.git.show({
      revision,
      path
    });

    return this.ctx.knowledgeEngine.parseTurtle(ttl);
  }

  /**
   * Get graph diff between revisions
   */
  async diff(path, fromRev, toRev = 'HEAD') {
    const fromStore = await this.loadRevision(path, fromRev);
    const toStore = await this.loadRevision(path, toRev);

    // Use unrdf's difference composable
    const { useDelta } = await import('unrdf');
    const delta = useDelta();

    return delta.diff(fromStore, toStore);
  }
}
```

---

## Migration Path

### Phase 1: Add unrdf Dependency (Week 1)

**Tasks**:
1. Add `unrdf: ^4.1.1` to package.json
2. Install and verify unrdf works
3. Create integration adapters (unrdf-adapter.mjs, hook-bridge.mjs)
4. Add compatibility layer for existing code

**Files Modified**:
- `package.json` - Add unrdf dependency
- `src/integrations/unrdf-adapter.mjs` - New file
- `src/integrations/hook-bridge.mjs` - New file
- `src/integrations/graph-git-sync.mjs` - New file

**Verification**:
```bash
pnpm add unrdf@^4.1.1
pnpm test  # All existing tests should still pass
```

---

### Phase 2: Refactor Composables (Week 2)

**Tasks**:
1. Refactor `src/composables/turtle.mjs` to wrap unrdf's useTurtle
2. Refactor `src/composables/graph.mjs` to wrap unrdf's useGraph
3. Update imports throughout codebase
4. Add integration tests

**Before** (src/composables/graph.mjs):
```javascript
import { RdfEngine } from "../engines/RdfEngine.mjs";
const rdfEngine = new RdfEngine();

export function useGraph(store) {
  return {
    query(sparql) {
      return rdfEngine.query(store, sparql);
    },
    // ... 10+ methods ...
  };
}
```

**After** (src/composables/graph.mjs):
```javascript
import { useGraph as unrdfUseGraph } from 'unrdf';
import { useGitVan } from '../core/context.mjs';

export function useGraph(store) {
  const ctx = useGitVan();
  const graph = unrdfUseGraph(store);

  return {
    ...graph,  // Inherit all unrdf methods

    // Add GitVan-specific extensions
    async saveToGit(path, commitMessage) {
      const ttl = await graph.serialize({ format: 'Turtle' });
      await ctx.git.writeFile(path, ttl);
      await ctx.git.commit({ message: commitMessage, files: [path] });
    }
  };
}
```

**Verification**:
```bash
pnpm test  # Verify backward compatibility
```

---

### Phase 3: Delete RdfEngine (Week 3)

**Tasks**:
1. Remove `src/engines/RdfEngine.mjs` entirely
2. Update all imports to use unrdf's RdfEngine
3. Remove N3, JSON-LD dependencies
4. Update tests

**Files Deleted**:
- ❌ `src/engines/RdfEngine.mjs` (~500 lines)

**Files Modified**:
- `src/composables/turtle.mjs` - Use unrdf imports
- `src/composables/graph.mjs` - Use unrdf imports
- `tests/**/*.test.mjs` - Update test imports

**Verification**:
```bash
pnpm test
pnpm build
# Verify binary size reduced
```

---

### Phase 4: Hook System Integration (Week 4)

**Tasks**:
1. Integrate GitVan JTBD hooks with unrdf's defineHook
2. Convert existing hooks to new pattern
3. Add hook bridge for backward compatibility
4. Update documentation

**Before** (GitVan-only hooks):
```javascript
// src/hooks/KnowledgeHookRegistry.mjs
export class KnowledgeHookRegistry {
  register(hook) {
    this.hooks.set(hook.id, hook);
  }
}
```

**After** (Bridge to unrdf):
```javascript
// src/hooks/KnowledgeHookRegistry.mjs
import { KnowledgeHookManager } from 'unrdf/knowledge-engine';

export class KnowledgeHookRegistry {
  constructor() {
    this.unrdfManager = new KnowledgeHookManager();
  }

  register(hook) {
    // Convert GitVan hook to unrdf format
    const unrdfHook = this.toUnrdfHook(hook);
    this.unrdfManager.registerHook(unrdfHook);
  }

  toUnrdfHook(gitvanHook) {
    return defineHook({
      name: gitvanHook.id,
      predicate: gitvanHook.pred,
      handler: gitvanHook.handler
    });
  }
}
```

---

### Phase 5: Documentation & Examples (Week 5)

**Tasks**:
1. Create migration guide for users
2. Update all examples to use new patterns
3. Add integration examples (Git + RDF)
4. Update README with architecture diagram

**Deliverables**:
- `docs/MIGRATION_TO_UNRDF.md` - User migration guide
- `examples/git-rdf-integration.mjs` - Integration example
- `examples/jtbd-with-unrdf.mjs` - JTBD hook example
- `README.md` - Updated architecture section

---

## Quality Attributes

### Performance
- **Target**: 20% reduction in bundle size (remove duplicate RDF code)
- **Measurement**: Track binary size before/after migration
- **Benefit**: Faster installation, lower memory footprint

### Maintainability
- **Target**: 80% reduction in RDF maintenance burden
- **Measurement**: Lines of GitVan-maintained RDF code
- **Benefit**: Focus development on Git-native features

### Scalability
- **Target**: Inherit unrdf's federation and streaming capabilities
- **Measurement**: Support for distributed graphs, real-time updates
- **Benefit**: Enable enterprise use cases

### Security
- **Target**: Automatic security updates from unrdf
- **Measurement**: CVE response time
- **Benefit**: Reduced security surface area

---

## Risk Mitigation

### Risk 1: Breaking Changes for Users

**Mitigation**:
- Provide compatibility layer for 1-2 minor versions
- Create automated migration tool
- Extensive testing of existing workflows
- Clear deprecation warnings

**Contingency**:
- Feature flag to enable/disable unrdf integration
- Rollback plan with version pinning

### Risk 2: Performance Regression

**Mitigation**:
- Benchmark before/after migration
- Profile critical paths (SPARQL queries, graph operations)
- Optimize adapters for zero-cost abstractions

**Contingency**:
- Keep RdfEngine.mjs as fallback for 1 version
- Performance tuning sprint if needed

### Risk 3: Feature Gaps in unrdf

**Mitigation**:
- Audit GitVan features vs unrdf capabilities
- Contribute missing features to unrdf upstream
- Maintain GitVan-specific extensions

**Contingency**:
- Selective delegation (use unrdf for 80%, keep 20% in GitVan)
- Fork unrdf only as last resort

---

## Success Metrics

### Code Metrics
- ✅ Remove 2,000+ LOC of duplicate RDF code
- ✅ Reduce dependencies from 25 to ~18
- ✅ Binary size reduction: 20%+ target
- ✅ Test coverage maintained: 80%+

### Developer Experience
- ✅ Migration path documented
- ✅ Backward compatibility maintained (1-2 versions)
- ✅ Examples updated and working
- ✅ User migration guide available

### Production Readiness
- ✅ All existing tests passing
- ✅ Integration tests for unrdf adapters
- ✅ Performance benchmarks stable/improved
- ✅ Security scan passing (no new CVEs)

---

## References

### unrdf Documentation
- Package: `/Users/sac/unrdf/package.json` (v4.1.1)
- Knowledge Engine: `/Users/sac/unrdf/src/knowledge-engine/`
- Composables: `/Users/sac/unrdf/src/composables/`
- Examples: `/Users/sac/unrdf/examples/`

### GitVan Current State
- Package: `/Users/sac/gitvan/package/package.json` (v2.0.1)
- RdfEngine: `/Users/sac/gitvan/src/engines/RdfEngine.mjs` (to be deleted)
- Composables: `/Users/sac/gitvan/src/composables/`
- Hooks: `/Users/sac/gitvan/src/hooks/`

### Related Documents
- ADR-001 through ADR-005 (this document)
- `docs/MIGRATION_TO_UNRDF.md` (to be created)
- `docs/UNRDF_INTEGRATION_GUIDE.md` (to be created)

---

## Appendices

### Appendix A: Dependency Comparison

**GitVan Current (25 deps)**:
```json
{
  "dependencies": {
    "@babel/parser": "^7.23.0",
    "@babel/traverse": "^7.23.0",
    "ai": "^3.0.0",
    "c12": "^3.3.0",
    "cacache": "^17.1.0",
    "citty": "^0.1.6",
    "consola": "^3.2.3",
    "defu": "^6.1.0",
    "fuse.js": "^7.0.0",
    "giget": "^1.2.2",
    "gray-matter": "^4.0.3",
    "hookable": "^5.5.3",
    "inflection": "^2.0.1",
    "klona": "^2.0.6",
    "lru-cache": "^10.0.0",
    "minimatch": "^9.0.0",
    "node-cron": "^3.0.3",
    "nunjucks": "^3.2.4",
    "ollama": "^0.5.0",
    "pathe": "^1.1.1",
    "prompts": "^2.4.2",
    "semver": "^7.5.0",
    "toml": "^3.0.0",
    "unctx": "^2.3.1",
    "zod": "^3.22.0"
  }
}
```

**GitVan After Migration (~18 deps + unrdf)**:
```json
{
  "dependencies": {
    "@babel/parser": "^7.23.0",
    "@babel/traverse": "^7.23.0",
    "ai": "^3.0.0",
    "c12": "^3.3.0",
    "cacache": "^17.1.0",
    "citty": "^0.1.6",
    "consola": "^3.2.3",
    "defu": "^6.1.0",
    "giget": "^1.2.2",
    "gray-matter": "^4.0.3",
    "hookable": "^5.5.3",
    "klona": "^2.0.6",
    "node-cron": "^3.0.3",
    "ollama": "^0.5.0",
    "pathe": "^1.1.1",
    "prompts": "^2.4.2",
    "unctx": "^2.3.1",
    "unrdf": "^4.1.1"
  },
  "peerDependencies": {
    "zod": "^3.22.0"
  }
}
```

**Removed**:
- ❌ `nunjucks` (use unrdf's template engine)
- ❌ `lru-cache` (use unrdf's caching)
- ❌ `minimatch` (use unrdf's utilities)
- ❌ `semver` (not critical, can remove)
- ❌ `toml` (not critical, can remove)
- ❌ `fuse.js` (evaluate if needed)
- ❌ `inflection` (evaluate if needed)

### Appendix B: Code Size Comparison

**GitVan Current**:
```
src/engines/RdfEngine.mjs         ~500 LOC
src/composables/graph.mjs         ~160 LOC
src/composables/turtle.mjs        ~540 LOC
src/hooks/KnowledgeHookRegistry   ~200 LOC
────────────────────────────────────────
Total RDF-related code:          ~1,400 LOC
```

**GitVan After Migration**:
```
src/integrations/unrdf-adapter.mjs    ~150 LOC
src/integrations/hook-bridge.mjs      ~100 LOC
src/integrations/graph-git-sync.mjs   ~150 LOC
src/composables/graph.mjs             ~50 LOC (thin wrapper)
src/composables/turtle.mjs            ~100 LOC (thin wrapper)
────────────────────────────────────────
Total RDF-related code:               ~550 LOC
```

**Savings**: ~850 LOC (60% reduction)

### Appendix C: Integration Test Examples

**Test 1: Git-RDF Transaction**:
```javascript
import { test, expect } from 'vitest';
import { useGitVan } from '../src/core/context.mjs';
import { createGitVanKnowledgeEngine } from '../src/integrations/unrdf-adapter.mjs';

test('Git-RDF transaction commits to both graph and Git', async () => {
  const ctx = useGitVan();
  const engine = await createGitVanKnowledgeEngine();

  await engine.transaction(async (tx) => {
    // Add RDF triple
    await tx.addTriple({
      subject: 'https://gitvan.dev/project/1',
      predicate: 'http://purl.org/dc/terms/title',
      object: { value: 'Test Project', type: 'literal' }
    });

    // Transaction commits to graph
  }, {
    description: 'Add test project',
    graphPath: 'knowledge/projects.ttl',
    autoCommit: true
  });

  // Verify Git commit
  const log = await ctx.git.log({ maxCount: 1 });
  expect(log[0].message).toContain('[graph] Add test project');

  // Verify graph content
  const ttl = await ctx.git.show({ path: 'knowledge/projects.ttl' });
  expect(ttl).toContain('Test Project');
});
```

**Test 2: JTBD Hook with unrdf**:
```javascript
import { test, expect } from 'vitest';
import { defineGitVanHook } from '../src/integrations/hook-bridge.mjs';

test('JTBD hook executes with Git context', async () => {
  const hook = defineGitVanHook({
    name: 'create-feature-branch',
    predicate: 'https://gitvan.dev/jtbd#StartFeature',

    async handler(context) {
      // Git operations available in context
      const branchName = `feature/${context.data.name}`;
      await context.git.createBranch(branchName);
      await context.git.checkout(branchName);

      return {
        success: true,
        branch: branchName,
        modified: []
      };
    },

    jtbd: {
      category: 'development',
      when: 'I want to start a new feature',
      then: 'create a feature branch'
    }
  });

  const result = await hook.execute({
    data: { name: 'user-auth' }
  });

  expect(result.success).toBe(true);
  expect(result.branch).toBe('feature/user-auth');
});
```

---

## Conclusion

This architecture maximizes code reuse by leveraging unrdf's production-ready RDF infrastructure while preserving GitVan's unique value proposition: Git-native development automation.

**Key Benefits**:
1. **Reduced Maintenance**: 60% less RDF code to maintain
2. **Production Quality**: Inherit enterprise-grade RDF engine
3. **Clear Separation**: Git operations in GitVan, RDF in unrdf
4. **Extensibility**: Easy to add Git-specific RDF features
5. **Future-Proof**: Automatic updates from unrdf ecosystem

**Next Steps**:
1. Review and approve this architecture
2. Begin Phase 1: Add unrdf dependency
3. Create migration guide for users
4. Execute 5-week migration plan
