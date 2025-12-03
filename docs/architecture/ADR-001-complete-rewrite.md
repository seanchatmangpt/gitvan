# ADR-001: Complete Rewrite with Zero Backwards Compatibility

**Status**: Accepted
**Date**: 2025-12-02
**Deciders**: System Architecture Designer
**Context**: GitVan v3.0.0 Architecture

---

## Context

GitVan v2.1.1 has grown to 277 source files with 76,483 lines of code, yet remains only 50-70% feature-complete. The codebase exhibits several critical issues:

1. **Duplicate implementations**: 7 different pack registry implementations, each incomplete
2. **RDF duplication**: Custom RdfEngine that reimplements functionality available in unrdf v4.1.1
3. **Architectural debt**: Unclear module boundaries, circular dependencies
4. **Invalid package.json**: Build fails due to malformed configuration
5. **Test fragmentation**: Test files scattered across root directory instead of `tests/`
6. **Unused code**: 30%+ of composables are never imported

Example of duplication:
```javascript
// v2.1.1 has 7 registry implementations:
src/pack/registry-original.mjs          (450 LOC)
src/pack/registry-refactored.mjs        (380 LOC)
src/pack/lazy-registry.mjs              (290 LOC)
src/pack/graph-registry.mjs             (520 LOC)
src/pack/pack-registry-manager.mjs      (340 LOC)
src/pack/pack-registry-search.mjs       (280 LOC)
src/pack/registry.mjs                   (190 LOC)
// Total: 2,450 LOC doing the same thing
```

Meanwhile, unrdf v4.1.1 provides production-ready:
- RDF parsing/serialization (Turtle, N-Triples, JSON-LD)
- SPARQL query engine (via Comunica)
- Knowledge Hooks system (defineHook)
- Transaction support (commit/rollback)
- Validation (SHACL)
- Observability (OpenTelemetry)

## Decision

**We will implement GitVan v3.0.0 as a complete rewrite with NO backwards compatibility to v2.x.**

This means:
- New `src/` directory structure (delete all v2 code)
- New module boundaries and responsibilities
- New CLI based on citty (not custom argparse)
- New package.json from scratch
- Import unrdf v4.1.1 as foundation, delete all RDF duplication
- Single pack registry implementation using unrdf's graph storage
- Estimated 8,450 LOC (89% reduction from v2)

## Rationale

### Option 1: Incremental Refactor (Rejected)

**Approach**: Gradually improve v2.1.1 codebase over 6-12 months.

**Pros**:
- Maintains some backwards compatibility
- Lower immediate risk
- Incremental value delivery

**Cons**:
- Still carries 70% of v2's architectural debt
- 7 registry implementations → still need to consolidate
- Unclear when "done" (ship of Theseus problem)
- Slower to production-ready state
- Higher total cost (refactor + maintain old + test both)

**Verdict**: Rejected. Would take 12+ months to achieve same quality as v3 rewrite.

---

### Option 2: Complete Rewrite (SELECTED)

**Approach**: Clean slate, keep only Git-native I/O and workflow concepts.

**Pros**:
- **Architectural clarity**: Clear module boundaries from day 1
- **Massive size reduction**: 76k → 8.5k LOC (89% smaller)
- **Production-ready immediately**: Leverage unrdf's maturity
- **Maintainable**: 15 dependencies vs 42, single responsibility modules
- **Faster**: No legacy baggage, optimized from start
- **Testable**: Chicago School TDD from start, 80%+ coverage target

**Cons**:
- **Breaking changes**: Users must migrate
- **Higher upfront effort**: 3-4 months development
- **Risk of missing features**: Must carefully preserve v2 value

**Mitigation**:
- Automated migration script (`scripts/migrate-v2-to-v3.mjs`)
- 3-month deprecation timeline (alpha → beta → stable)
- Comprehensive migration guide
- Feature parity verification (checklist of v2 capabilities)

**Verdict**: SELECTED. Benefits outweigh costs, faster to production.

---

### Option 3: Fork unrdf (Rejected)

**Approach**: Fork unrdf v4.1.1 and add GitVan features.

**Pros**:
- Full control over RDF stack
- Can customize internals

**Cons**:
- **Massive maintenance burden**: 40k+ LOC to maintain
- **Upstream divergence**: Can't benefit from unrdf improvements
- **Duplicates work**: unrdf already has everything GitVan needs
- **Not GitVan's competency**: We're workflow automation, not RDF library

**Verdict**: Rejected. Violates "import, don't duplicate" principle.

---

## Consequences

### Positive

1. **Codebase Quality**
   - 89% smaller codebase (8,450 LOC vs 76,483)
   - No duplicate implementations
   - Clear module responsibilities
   - Production-ready from day 1

2. **Maintainability**
   - 64% fewer dependencies (15 vs 42)
   - Single pack registry (vs 7)
   - Test coverage >80% (vs 35% in v2)
   - Clear upgrade path (unrdf handles RDF evolution)

3. **Performance**
   - Faster workflows (<2s for 10 steps vs 5s in v2)
   - Smaller bundle (500KB vs 2.3MB)
   - Faster builds (<3s vs 12s)

4. **Developer Experience**
   - Clean CLI (citty-based)
   - Type-safe commands
   - Better error messages
   - Consistent API

### Negative

1. **Migration Cost**
   - Users must update imports: `gitvan/composables` → `unrdf/composables`
   - Workflows may need minor updates
   - Pack manifests need schema validation
   - Estimated 2-4 hours per project

2. **Development Timeline**
   - 3-4 months to v3.0.0 stable
   - Alpha (Dec 2025), Beta (Jan 2026), Stable (Feb 2026)
   - v2.x maintenance until March 2026

3. **Risk of Missing Features**
   - Must audit v2 to identify all used features
   - May miss edge cases users depend on
   - Requires beta testing period

### Mitigation Strategies

1. **Automated Migration**
   ```javascript
   // scripts/migrate-v2-to-v3.mjs
   export async function migrateProject(projectPath) {
     // 1. Update imports
     await replaceInFiles('**/*.mjs', {
       'from "gitvan/composables"': 'from "unrdf/composables"',
       'RdfEngine': 'KnowledgeEngine'
     });

     // 2. Update package.json
     await updateDependencies({
       'gitvan': '^3.0.0',
       'unrdf': '^4.1.1'
     });

     // 3. Move .gitvan structure
     await restructureGitVanDir();

     console.log('✅ Migration complete. Run tests to verify.');
   }
   ```

2. **Feature Parity Checklist**
   - [ ] Git operations (commit, branch, merge, worktree)
   - [ ] Git-native I/O (locks, queues, receipts)
   - [ ] Workflow execution (Turtle-based)
   - [ ] Hook system (JTBD hooks)
   - [ ] Pack registry (search, install, publish)
   - [ ] Template rendering (Nunjucks)
   - [ ] CLI commands (workflow, pack, hook, graph)

3. **Beta Testing Program**
   - 4-week beta period (Jan 15 - Feb 15, 2026)
   - Early adopter cohort (10-20 projects)
   - Weekly feedback sessions
   - Bug bounty for migration issues

4. **Deprecation Timeline**
   ```
   Dec 15, 2025: v3.0.0-alpha (breaking changes announced)
   Jan 15, 2026: v3.0.0-beta (migration tools, docs)
   Feb 15, 2026: v3.0.0 stable release
   Mar 15, 2026: v2.x end-of-life
   ```

## Implementation Plan

### Phase 1: Core Architecture (Weeks 1-4)
- [ ] New `src/` structure
- [ ] Git-native I/O (refactored from v2)
- [ ] Integration layer (unrdf adapters)
- [ ] Unit tests (>80% coverage)

### Phase 2: Workflows & Hooks (Weeks 5-8)
- [ ] Workflow parser (Turtle → AST)
- [ ] Workflow executor (transaction-based)
- [ ] Hook bridge (unrdf defineHook)
- [ ] Built-in hooks (dev-ready, pr-merge, release)
- [ ] Integration tests

### Phase 3: Packs & CLI (Weeks 9-12)
- [ ] Pack registry (single implementation)
- [ ] Pack installer (Nunjucks templates)
- [ ] citty CLI (workflow, pack, hook commands)
- [ ] End-to-end tests
- [ ] Documentation

### Phase 4: Migration & Release (Weeks 13-16)
- [ ] Migration script
- [ ] Migration guide
- [ ] Beta testing
- [ ] Performance benchmarks
- [ ] v3.0.0 release

## Metrics for Success

| Metric | v2.1.1 | v3.0.0 Target | Measurement |
|--------|--------|---------------|-------------|
| LOC | 76,483 | 8,450 | `cloc src/` |
| Dependencies | 42 | 15 | `package.json` |
| Test coverage | 35% | 80%+ | Vitest coverage |
| Build time | 12s | <3s | CI pipeline |
| Workflow exec | 5s | <2s | Benchmark |
| Bundle size | 2.3 MB | <500 KB | `npm pack` |
| Migration time | N/A | <4 hrs | User survey |

## Review and Approval

**Approved by**: System Architecture Designer
**Review Date**: 2025-12-02

**Next Steps**:
1. Create v3 project structure
2. Begin Phase 1 implementation
3. Set up CI/CD for v3 branch
4. Draft migration guide

---

## References

- GitVan v2.1.1 codebase: `/Users/sac/gitvan`
- unrdf v4.1.1: `/Users/sac/unrdf`
- ADR-002: unrdf as Foundation
- ADR-003: Git-Native I/O as Core Competency
- ADR-004: citty CLI Framework
- ADR-005: Single Pack Registry
