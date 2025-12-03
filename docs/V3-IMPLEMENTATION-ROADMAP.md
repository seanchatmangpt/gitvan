# GitVan v3.0.0 Implementation Roadmap

**Version**: 1.0.0
**Date**: 2025-12-02
**Timeline**: 16 weeks (Dec 2025 - Mar 2026)
**Status**: Planning

---

## Overview

This roadmap outlines the 4-phase implementation plan for GitVan v3.0.0, from initial architecture setup to stable release.

**Key Milestones**:
- **Week 4**: Alpha release (core modules functional)
- **Week 8**: Beta release (migration tools ready)
- **Week 12**: Release candidate (production-ready)
- **Week 16**: Stable v3.0.0 release

---

## Phase 1: Foundation (Weeks 1-4)

**Goal**: Establish core architecture, Git-native I/O, and integration layer

### Week 1: Project Setup

#### Deliverables
- [x] Architecture design complete
- [ ] New `v3` branch created
- [ ] Project structure scaffolded
- [ ] CI/CD pipeline configured
- [ ] Development environment documented

#### Tasks
```bash
# 1. Create v3 branch
git checkout -b v3
git push -u origin v3

# 2. Scaffold project structure
mkdir -p src/{cli,git,git-native,workflows,hooks,packs,integration,utils}
mkdir -p tests/{cli,git,git-native,workflows,hooks,packs,integration}
mkdir -p docs/{architecture,guides,api}

# 3. Initialize package.json
{
  "name": "gitvan",
  "version": "3.0.0-alpha.0",
  "type": "module",
  "main": "src/index.mjs",
  "exports": {
    ".": "./src/index.mjs",
    "./cli": "./src/cli/index.mjs",
    "./hooks": "./src/hooks/index.mjs"
  },
  "dependencies": {
    "unrdf": "^4.1.1",
    "citty": "^0.1.6",
    "nunjucks": "^3.2.4",
    "zod": "^3.22.0",
    "unctx": "^1.0.0",
    "yaml": "^2.8.1",
    "table": "^6.9.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jsdoc": "^4.0.0",
    "madge": "^6.0.0"
  }
}

# 4. Setup CI/CD (.github/workflows/ci.yml)
# - Lint (ESLint + Prettier)
# - Test (Vitest with coverage)
# - Build verification
# - Dependency audit
```

**Success Criteria**:
- ✅ CI pipeline passes
- ✅ 100% test coverage (no code yet, just setup)
- ✅ Documentation builds successfully

---

### Week 2: Git-Native I/O (Core)

#### Deliverables
- [ ] `LockManager.mjs` (Git ref-based locks)
- [ ] `QueueManager.mjs` (Priority queues in notes)
- [ ] `ReceiptWriter.mjs` (Immutable receipts)
- [ ] `SnapshotStore.mjs` (State snapshots)
- [ ] Unit tests (80%+ coverage)

#### Implementation Plan

**LockManager** (~300 LOC):
```javascript
// src/git-native/LockManager.mjs
export class LockManager {
  async acquireLock(name, options = {}) {
    // 1. Create empty commit
    // 2. Atomic update-ref (fails if exists)
    // 3. Return lock handle
  }

  async releaseLock(name) {
    // 1. Delete lock ref
    // 2. Verify deletion
  }

  async isLocked(name) {
    // Check ref exists
  }
}

// Tests: tests/git-native/LockManager.test.mjs
// - Acquire lock succeeds
// - Acquire lock fails if already held
// - Release lock succeeds
// - Concurrent lock acquisition (race condition)
```

**QueueManager** (~400 LOC):
```javascript
// src/git-native/QueueManager.mjs
export class QueueManager {
  async enqueue(priority, task, metadata) {
    // 1. JSON encode task
    // 2. Add to git notes (refs/notes/gitvan/queue/<priority>)
    // 3. Verify addition
  }

  async dequeue(priority) {
    // 1. Read notes
    // 2. Get highest priority
    // 3. Remove from notes
    // 4. Return task
  }

  async peek(priority) {
    // Read without removing
  }
}
```

**ReceiptWriter** (~250 LOC):
```javascript
// src/git-native/ReceiptWriter.mjs
export class ReceiptWriter {
  async writeReceipt(uri, payload) {
    // 1. Hash URI
    // 2. Create receipt commit
    // 3. Update refs/receipts/<hash>
  }

  async getReceipt(uri) {
    // 1. Hash URI
    // 2. Read ref
    // 3. Parse receipt
  }
}
```

**SnapshotStore** (~300 LOC):
```javascript
// src/git-native/SnapshotStore.mjs
export class SnapshotStore {
  async createSnapshot(name, state) {
    // 1. JSON encode state
    // 2. Create snapshot commit
    // 3. Update refs/snapshots/<timestamp>-<name>
  }

  async restoreSnapshot(name) {
    // 1. Find latest snapshot
    // 2. Read state
    // 3. Return parsed state
  }
}
```

**Success Criteria**:
- ✅ All unit tests pass (80%+ coverage)
- ✅ Lock acquisition <100ms (benchmark)
- ✅ Queue operations <50ms (benchmark)
- ✅ No circular dependencies (madge)

---

### Week 3: Integration Layer

#### Deliverables
- [ ] `integration/knowledge-engine.mjs` (unrdf wrapper)
- [ ] `integration/git-wrapper.mjs` (Git operations)
- [ ] `integration/config.mjs` (Config loader)
- [ ] `git/operations.mjs` (High-level Git ops)
- [ ] Unit tests (80%+ coverage)

#### Implementation Plan

**unrdf Adapter** (~150 LOC):
```javascript
// src/integration/knowledge-engine.mjs
import { KnowledgeEngine } from 'unrdf/knowledge-engine';

export function createGitVanEngine(options = {}) {
  return new KnowledgeEngine({
    baseIRI: 'http://gitvan.dev/',
    enableLockchain: true,
    enableObservability: options.telemetry ?? false,
    ...options
  });
}

// Re-export composables
export {
  useTurtle,
  useGraph,
  useZod,
  useValidator
} from 'unrdf/composables';
```

**Git Wrapper** (~200 LOC):
```javascript
// src/integration/git-wrapper.mjs
import { execFile } from 'node:child_process';

export async function runGit(args, options = {}) {
  const env = { ...process.env, TZ: 'UTC', LANG: 'C' };
  return new Promise((resolve, reject) => {
    execFile('git', args, { env, cwd: options.cwd }, (error, stdout) => {
      if (error) reject(new GitError(error, args));
      else resolve(stdout.trim());
    });
  });
}
```

**Git Operations** (~500 LOC):
```javascript
// src/git/operations.mjs
export async function commit(message, options = {}) {
  await runGit(['commit', '-m', message], options);
}

export async function branch(name, options = {}) {
  await runGit(['branch', name], options);
}

export async function merge(branch, options = {}) {
  await runGit(['merge', branch], options);
}

// ... more operations
```

**Success Criteria**:
- ✅ unrdf integration verified (KnowledgeEngine works)
- ✅ Git operations deterministic (TZ=UTC, LANG=C)
- ✅ Config loader validates schemas (Zod)

---

### Week 4: Alpha Release Preparation

#### Deliverables
- [ ] `src/index.mjs` (main exports)
- [ ] Integration tests (core modules)
- [ ] Performance benchmarks (locks, queues)
- [ ] Alpha documentation
- [ ] v3.0.0-alpha.1 release

#### Tasks
```javascript
// src/index.mjs
export { LockManager, QueueManager, ReceiptWriter, SnapshotStore } from './git-native/index.mjs';
export { createGitVanEngine } from './integration/knowledge-engine.mjs';
export { runGit } from './integration/git-wrapper.mjs';
export { commit, branch, merge } from './git/operations.mjs';
```

**Integration Tests**:
```javascript
// tests/integration/git-native-e2e.test.mjs
describe('Git-Native I/O E2E', () => {
  it('acquires lock, enqueues task, writes receipt', async () => {
    const lock = await lockManager.acquireLock('test');
    await queueManager.enqueue('high', { task: 'test' });
    await receiptWriter.writeReceipt('test://task', { success: true });
    await lockManager.releaseLock('test');

    const receipt = await receiptWriter.getReceipt('test://task');
    expect(receipt.success).toBe(true);
  });
});
```

**Benchmarks**:
```javascript
// scripts/benchmark.mjs
import Benchmark from 'benchmark';

const suite = new Benchmark.Suite();

suite
  .add('Lock acquisition', async () => {
    await lockManager.acquireLock('bench');
    await lockManager.releaseLock('bench');
  })
  .add('Queue enqueue/dequeue', async () => {
    await queueManager.enqueue('high', { task: 'bench' });
    await queueManager.dequeue('high');
  })
  .on('complete', function() {
    console.log('Fastest: ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });
```

**Alpha Release**:
```bash
# 1. Bump version
npm version 3.0.0-alpha.1

# 2. Generate changelog
git log --oneline v2.1.1..HEAD > CHANGELOG-v3-alpha.md

# 3. Tag release
git tag v3.0.0-alpha.1

# 4. Push
git push --tags origin v3

# 5. Publish to npm (alpha tag)
npm publish --tag alpha
```

**Success Criteria**:
- ✅ All tests pass (80%+ coverage)
- ✅ Benchmarks meet targets (lock <100ms, queue <50ms)
- ✅ Alpha release published to npm
- ✅ Documentation updated

---

## Phase 2: Domain Logic (Weeks 5-8)

**Goal**: Implement workflows, hooks, and packs systems

### Week 5-6: Workflow Engine

#### Deliverables
- [ ] `workflows/parser.mjs` (Turtle → AST)
- [ ] `workflows/executor.mjs` (Execution with transactions)
- [ ] `workflows/state.mjs` (State management)
- [ ] `workflows/scheduler.mjs` (Dependency resolution)
- [ ] Unit + integration tests (80%+ coverage)

#### Implementation Plan

**Parser** (~400 LOC):
```javascript
// src/workflows/parser.mjs
import { useTurtle } from 'unrdf/composables';

export async function parseWorkflow(ttl) {
  const { parseTurtle } = useTurtle();
  const store = await parseTurtle(ttl);

  // SPARQL queries to extract workflow metadata
  const workflow = await store.query(`
    SELECT ?name ?description WHERE {
      ?workflow a gitvan:Workflow ;
                gitvan:name ?name ;
                gitvan:description ?description .
    }
  `);

  const steps = await store.query(`
    SELECT ?step ?name ?command ?requires WHERE {
      ?step a gitvan:Step ;
            gitvan:name ?name ;
            gitvan:command ?command .
      OPTIONAL { ?step gitvan:requires ?requires }
    }
  `);

  return { workflow, steps };
}
```

**Executor** (~600 LOC):
```javascript
// src/workflows/executor.mjs
import { beginTransaction } from 'unrdf/knowledge-engine';
import { GitNativeIO } from '../git-native/index.mjs';

export async function executeWorkflow(workflowTtl, options = {}) {
  const tx = await beginTransaction();
  const io = new GitNativeIO();

  try {
    const { steps } = await parseWorkflow(workflowTtl);

    for (const step of steps) {
      await triggerHook('workflow:pre-step', { step, tx });

      const lock = await io.acquireLock(`workflow:${step.name}`);
      try {
        const result = await executeStep(step, { tx, io });
        await io.writeReceipt(`workflow://${step.name}`, result);
      } finally {
        await io.releaseLock(`workflow:${step.name}`);
      }

      await triggerHook('workflow:post-step', { step, result, tx });
    }

    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}
```

**Success Criteria**:
- ✅ Can parse workflow .ttl files
- ✅ Can execute 10-step workflow in <2s
- ✅ Transactions rollback on failure
- ✅ 80%+ test coverage

---

### Week 7: Hook System

#### Deliverables
- [ ] `hooks/bridge.mjs` (unrdf defineHook bridge)
- [ ] `hooks/lifecycle.mjs` (Pre/post hooks)
- [ ] `hooks/builtin/dev-ready.mjs`
- [ ] `hooks/builtin/pr-merge.mjs`
- [ ] `hooks/builtin/release.mjs`
- [ ] Unit + integration tests (80%+ coverage)

#### Implementation Plan

**Bridge** (~300 LOC):
```javascript
// src/hooks/bridge.mjs
import { defineHook } from 'unrdf/knowledge-engine';

export function registerGitVanHooks() {
  defineHook('workflow:pre-step', async (context) => {
    // Pre-step validation
  });

  defineHook('workflow:post-step', async (context) => {
    // Post-step cleanup
  });

  defineHook('git:pre-commit', async (context) => {
    // Linting, formatting
  });
}

export async function triggerHook(name, context) {
  const engine = getKnowledgeEngine();
  await engine.executeHook(name, context);
}
```

**Built-in Hooks** (~500 LOC total):
```javascript
// src/hooks/builtin/dev-ready.mjs
export async function devReadyHook(context) {
  // Check Node.js version
  const nodeVersion = process.version;
  if (!nodeVersion.match(/v18\.|v20\./)) {
    throw new Error('Node.js 18+ required');
  }

  // Check Git config
  const gitEmail = await runGit(['config', '--get', 'user.email']);
  if (!gitEmail) {
    throw new Error('Git user.email not configured');
  }

  // Check dependencies
  await execFile('npm', ['install', '--dry-run']);

  return { ready: true };
}
```

**Success Criteria**:
- ✅ Hooks integrate with unrdf defineHook
- ✅ Pre/post hooks trigger correctly
- ✅ Built-in hooks functional
- ✅ 80%+ test coverage

---

### Week 8: Pack System & Beta Release

#### Deliverables
- [ ] `packs/registry.mjs` (SINGLE implementation)
- [ ] `packs/installer.mjs` (Pack installation)
- [ ] `packs/templates.mjs` (Nunjucks rendering)
- [ ] `packs/validator.mjs` (Zod schemas)
- [ ] Pack catalog (nextjs, docker, react)
- [ ] v3.0.0-beta.1 release

#### Implementation Plan

**Registry** (~400 LOC):
```javascript
// src/packs/registry.mjs
import { createGitVanEngine } from '../integration/knowledge-engine.mjs';

export class PackRegistry {
  constructor() {
    this.engine = createGitVanEngine();
  }

  async load() {
    const files = await glob('.gitvan/packs/catalog/*.ttl');
    for (const file of files) {
      const ttl = await readFile(file, 'utf-8');
      await this.engine.parseTurtle(ttl);
    }
  }

  async search(query) {
    return this.engine.query(`
      SELECT ?pack ?name ?description ?version
      WHERE {
        ?pack a gitvan:Pack ;
              gitvan:name ?name ;
              gitvan:description ?description ;
              gitvan:version ?version .
        FILTER(CONTAINS(LCASE(?name), LCASE("${query}")))
      }
      ORDER BY ?name
    `);
  }

  async install(packName, targetDir) {
    // 1. Query for pack
    // 2. Fetch templates
    // 3. Render Nunjucks
    // 4. Write files
    // 5. Write receipt
  }
}
```

**Beta Release**:
```bash
# 1. Bump version
npm version 3.0.0-beta.1

# 2. Tag and publish
git tag v3.0.0-beta.1
npm publish --tag beta

# 3. Announce beta testing program
# - Early adopter cohort (10-20 projects)
# - Weekly feedback sessions
# - Migration support
```

**Success Criteria**:
- ✅ Can search pack catalog
- ✅ Can install packs in <5s
- ✅ Beta release published
- ✅ Beta testers recruited

---

## Phase 3: CLI & Tooling (Weeks 9-12)

**Goal**: Implement CLI, migration tools, and comprehensive documentation

### Week 9-10: CLI (citty)

#### Deliverables
- [ ] `cli/index.mjs` (CLI entry point)
- [ ] `cli/commands/workflow.mjs`
- [ ] `cli/commands/pack.mjs`
- [ ] `cli/commands/hook.mjs`
- [ ] `cli/commands/graph.mjs`
- [ ] CLI tests (80%+ coverage)

#### Implementation Plan

**CLI Structure**:
```javascript
// src/cli/index.mjs
import { defineCommand, runMain } from 'citty';

const cli = defineCommand({
  meta: { name: 'gitvan', version: '3.0.0', description: 'Git-native dev automation' },
  subCommands: {
    workflow: () => import('./commands/workflow.mjs'),
    pack: () => import('./commands/pack.mjs'),
    hook: () => import('./commands/hook.mjs'),
    graph: () => import('./commands/graph.mjs')
  }
});

runMain(cli);
```

**Commands** (~200 LOC each):
```javascript
// src/cli/commands/workflow.mjs
export default defineCommand({
  meta: { name: 'workflow', description: 'Workflow operations' },
  args: {
    file: { type: 'positional', required: true, description: 'Workflow .ttl file' },
    dry: { type: 'boolean', default: false, description: 'Dry run' },
    verbose: { type: 'boolean', alias: 'v', default: false }
  },
  async run({ args }) {
    const workflow = await parseWorkflow(args.file);
    if (args.dry) {
      console.log('Dry run:', workflow);
      return;
    }
    await executeWorkflow(workflow);
  }
});
```

**Success Criteria**:
- ✅ All CLI commands functional
- ✅ Help text auto-generated
- ✅ Error messages actionable
- ✅ 80%+ test coverage

---

### Week 11: Migration Tools

#### Deliverables
- [ ] `scripts/migrate-v2-to-v3.mjs`
- [ ] Migration guide (docs/MIGRATION-GUIDE.md)
- [ ] Migration examples (before/after)
- [ ] Migration tests (validate v2 → v3)

#### Implementation Plan

**Migration Script**:
```javascript
// scripts/migrate-v2-to-v3.mjs
export async function migrateProject(projectPath) {
  console.log('Migrating GitVan v2 → v3...');

  // 1. Update imports
  await replaceInFiles('**/*.mjs', {
    'from "gitvan/composables"': 'from "unrdf/composables"',
    'RdfEngine': 'KnowledgeEngine'
  });

  // 2. Update package.json
  await updatePackageJson({
    dependencies: {
      'gitvan': '^3.0.0',
      'unrdf': '^4.1.1'
    }
  });

  // 3. Move .gitvan structure
  await move('.gitvan/hooks', '.gitvan/workflows/hooks');

  // 4. Validate
  await validateMigration(projectPath);

  console.log('✅ Migration complete. Review changes and run tests.');
}
```

**Migration Guide**:
```markdown
# GitVan v2 → v3 Migration Guide

## Breaking Changes

### 1. RDF Imports
**Before (v2)**:
```javascript
import { useGraph } from 'gitvan/composables';
```

**After (v3)**:
```javascript
import { useGraph } from 'unrdf/composables';
```

### 2. RdfEngine → KnowledgeEngine
**Before (v2)**:
```javascript
import { RdfEngine } from 'gitvan';
const engine = new RdfEngine();
```

**After (v3)**:
```javascript
import { createGitVanEngine } from 'gitvan';
const engine = createGitVanEngine();
```

## Automated Migration

```bash
npx gitvan@3.0.0 migrate --from v2 --to v3
```

## Manual Steps

1. Review `.gitvan/` structure changes
2. Update workflow .ttl files (if needed)
3. Test all workflows
4. Verify hooks still work
```

**Success Criteria**:
- ✅ Migration script works on 10+ test projects
- ✅ Migration time <4 hours (user survey)
- ✅ Migration guide comprehensive

---

### Week 12: Release Candidate

#### Deliverables
- [ ] Complete API documentation (JSDoc)
- [ ] Performance benchmarks (final)
- [ ] Security audit (npm audit)
- [ ] v3.0.0-rc.1 release
- [ ] Release notes

#### Tasks

**API Documentation**:
```javascript
// Generate JSDoc
npm run docs

// Outputs to docs/api/
// - index.html
// - modules/
// - classes/
// - functions/
```

**Performance Benchmarks**:
```bash
# Run full benchmark suite
npm run benchmark

# Results:
# ✅ Workflow execution (10 steps): 1.8s (target: <2s)
# ✅ Pack installation: 4.2s (target: <5s)
# ✅ Lock acquisition: 78ms (target: <100ms)
# ✅ SPARQL query: 32ms (target: <50ms)
```

**Security Audit**:
```bash
npm audit
# 0 vulnerabilities

npm audit signatures
# All packages signed
```

**RC Release**:
```bash
npm version 3.0.0-rc.1
git tag v3.0.0-rc.1
npm publish --tag rc
```

**Success Criteria**:
- ✅ API docs complete (100% coverage)
- ✅ Benchmarks meet targets
- ✅ Zero security vulnerabilities
- ✅ RC release published

---

## Phase 4: Stable Release (Weeks 13-16)

**Goal**: Beta testing, bug fixes, stable release

### Week 13-14: Beta Testing

#### Activities
- [ ] Beta testing program (4 weeks)
- [ ] Weekly feedback sessions
- [ ] Bug triage and fixes
- [ ] Performance optimization
- [ ] Documentation updates

#### Beta Testing Plan

**Cohort**: 10-20 early adopters

**Weekly Schedule**:
- **Week 13**: Initial beta testing, collect feedback
- **Week 14**: Bug fixes, performance optimization
- **Week 15**: Final testing, documentation polish
- **Week 16**: Stable release

**Feedback Channels**:
- GitHub Discussions (beta feedback)
- Weekly video calls (office hours)
- Bug reports (GitHub Issues, beta label)

**Success Metrics**:
- ✅ 80%+ beta testers complete migration
- ✅ Migration time <4 hours (avg)
- ✅ Zero critical bugs
- ✅ Performance targets met

---

### Week 15: Release Preparation

#### Deliverables
- [ ] Final bug fixes
- [ ] Documentation review (all docs)
- [ ] Changelog generation
- [ ] Release notes
- [ ] Marketing materials

#### Tasks

**Changelog**:
```markdown
# GitVan v3.0.0 - Complete Rewrite

## Breaking Changes
- Complete rewrite, NO backwards compatibility
- RDF imports moved to unrdf
- Single pack registry (not 7)
- New CLI (citty-based)

## New Features
- Git-native I/O (locks, queues, receipts)
- Workflow engine (transaction-based)
- Hook system (unrdf integration)
- Pack system (SPARQL-based registry)

## Performance
- 60% faster workflows (<2s vs 5s)
- 78% smaller bundle (500KB vs 2.3MB)
- 75% faster builds (<3s vs 12s)

## Migration
See MIGRATION-GUIDE.md for automated migration.
Estimated time: 2-4 hours per project.
```

**Release Notes**:
```markdown
# GitVan v3.0.0 - "Fresh Start"

We're excited to announce GitVan v3.0.0, a complete rewrite focused on:

1. **Production-ready**: 80%+ test coverage, zero critical bugs
2. **Lean**: 89% smaller codebase (8,450 LOC vs 76,483)
3. **Fast**: 60% faster workflows, 78% smaller bundle
4. **Maintainable**: Single responsibility modules, clear APIs

## Highlights

✨ **Git-native I/O**: Deterministic workflows backed by Git
✨ **unrdf integration**: Production-ready RDF knowledge graph
✨ **Transaction-based workflows**: Atomic execution with rollback
✨ **Modern CLI**: citty-based, auto-generated help

## Migration

See [Migration Guide](MIGRATION-GUIDE.md) for detailed instructions.
Automated migration script: `npx gitvan@3.0.0 migrate`

## Acknowledgments

Thanks to all beta testers and contributors!
Special thanks to unrdf team for the solid foundation.
```

---

### Week 16: Stable Release

#### Deliverables
- [ ] v3.0.0 stable release
- [ ] npm publish (latest tag)
- [ ] GitHub release
- [ ] Blog post / announcement
- [ ] Community outreach

#### Release Checklist

```markdown
## Pre-Release
- [x] All tests pass (100%)
- [x] Test coverage ≥80%
- [x] Performance benchmarks met
- [x] Security audit clean
- [x] Documentation complete
- [x] Migration guide tested
- [x] Beta feedback addressed
- [x] Zero critical bugs

## Release
- [ ] Bump version to 3.0.0
- [ ] Generate changelog
- [ ] Tag release (v3.0.0)
- [ ] Publish to npm (latest)
- [ ] Create GitHub release
- [ ] Update docs site

## Post-Release
- [ ] Announce on Twitter/X
- [ ] Blog post
- [ ] Reddit (r/node, r/git)
- [ ] Hacker News
- [ ] Newsletter
```

**Release Commands**:
```bash
# 1. Final version bump
npm version 3.0.0

# 2. Tag
git tag v3.0.0

# 3. Push
git push --tags origin v3

# 4. Publish (remove alpha/beta/rc tags)
npm publish

# 5. Create GitHub release
gh release create v3.0.0 --title "GitVan v3.0.0 - Fresh Start" --notes-file RELEASE-NOTES.md
```

---

## Success Criteria Summary

### Phase 1 (Foundation)
- ✅ Git-native I/O functional (locks, queues, receipts)
- ✅ Integration layer complete (unrdf, Git)
- ✅ Alpha release published

### Phase 2 (Domain Logic)
- ✅ Workflow engine functional (parse, execute, transact)
- ✅ Hook system integrated (unrdf defineHook)
- ✅ Pack system functional (search, install)
- ✅ Beta release published

### Phase 3 (CLI & Tooling)
- ✅ CLI complete (all commands)
- ✅ Migration tools ready
- ✅ RC release published

### Phase 4 (Stable)
- ✅ Beta testing complete (80%+ success rate)
- ✅ Zero critical bugs
- ✅ v3.0.0 stable released

---

## Risk Management

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **unrdf breaking changes** | Low | High | Lock to v4.1.x, track releases |
| **Migration complexity** | Medium | High | Automated script, 4-week beta |
| **Performance regression** | Low | Medium | Continuous benchmarks |
| **Security vulnerabilities** | Low | Critical | npm audit, Zod validation |
| **Timeline slippage** | Medium | Medium | 2-week buffer built in |

---

## Team & Resources

### Recommended Team
- **1 Senior Architect**: Weeks 1-16 (full-time)
- **2 Senior Engineers**: Weeks 1-16 (full-time)
- **1 Technical Writer**: Weeks 11-16 (part-time)
- **1 QA Engineer**: Weeks 13-16 (full-time)

### Total Effort
- **12-16 person-months** over 16 weeks

---

## Conclusion

This roadmap provides a structured, 4-phase approach to GitVan v3.0.0:

1. **Phase 1**: Foundation (Git-native I/O, integration layer)
2. **Phase 2**: Domain logic (workflows, hooks, packs)
3. **Phase 3**: CLI & tooling (commands, migration)
4. **Phase 4**: Stable release (beta testing, final release)

With this plan, GitVan v3.0.0 will be **production-ready from day 1**, achieving:
- **89% smaller codebase**
- **60% faster workflows**
- **80%+ test coverage**
- **Zero backwards compatibility** (clean slate)

**Next Step**: Begin Phase 1, Week 1 implementation.

---

**Document Status**: ✅ Final Roadmap
**Next Review**: End of Phase 1 (Week 4)
