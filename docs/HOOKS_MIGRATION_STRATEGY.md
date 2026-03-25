# GitVan Hooks Migration to @unrdf v5.0.1

## Executive Summary

GitVan contains **2,800+ lines of duplicate hook system code** that overlaps 80% with @unrdf/hooks capabilities. This document outlines the strategy to migrate to @unrdf packages while preserving Git-specific functionality.

**Goal:** Reduce custom hooks code by 74% while gaining 11+ condition types and better reliability.

## Current State Analysis

### Wrapper Components to Replace

| Component | Lines | Status | Replacement |
|-----------|-------|--------|------------|
| PredicateEvaluator.mjs | 1,025 | 88% overlap | @unrdf/hooks condition evaluator |
| HookOrchestrator.mjs | 761 | 75% overlap | @unrdf/hooks executor |
| HookParser.mjs | 660 | 80% overlap | @unrdf/hooks loader |
| CompositePredicates.mjs | ~200 | 95% overlap | @unrdf built-in compositions |
| reactive-triggers.mjs | ~150 | 70% overlap | @unrdf/streaming |
| state-change-detector.mjs | ~100 | 75% overlap | @unrdf/knowledge-engine |
| bree-hook-adapter.mjs | ~400 | Partial | Refactor for @unrdf/hooks |
| **TOTAL WRAPPERS** | **~3,300** | | |

### Custom Components to Keep

| Component | Lines | Reason |
|-----------|-------|--------|
| GitLifecycleHooks.mjs | ~200 | Git-specific semantics |
| ContextEnricher.mjs | ~150 | Git metadata enrichment |
| KnowledgeHookRegistry.mjs | ~150 | Hook discovery & organization |
| unified-hooks.mjs | 308 | Clean composable API layer |
| **TOTAL CUSTOM** | **~800** | |

## Migration Phases

### Phase 1: Foundation (Week 1) - LOW RISK
**Objective:** Add @unrdf packages and establish migration patterns

1. ✅ **DONE:** Add @unrdf/hooks, @unrdf/validation, @unrdf/knowledge-engine, @unrdf/streaming to package.json
2. ✅ **DONE:** Rename misleading `unrdf-hooks-bridge.mjs` → `bree-hook-adapter.mjs`
3. **TODO:** Create PredicateEvaluatorV2.mjs as thin wrapper over @unrdf/hooks
4. **TODO:** Create HookParserV2.mjs as thin wrapper over @unrdf/hooks loader
5. **TODO:** Migrate CompositePredicates to use @unrdf built-ins

### Phase 2: Condition Evaluation (Week 2-3) - MEDIUM RISK
**Objective:** Replace custom condition evaluation with @unrdf/hooks

1. **TODO:** Create PredicateEvaluatorV2 wrapper class
2. **TODO:** Port Git context enrichment to @unrdf evaluator options
3. **TODO:** Add cache integration (@unrdf + useGraphCache)
4. **TODO:** Update HookOrchestrator to use PredicateEvaluatorV2
5. **TODO:** Deprecate PredicateEvaluator.mjs (keep for compatibility)

### Phase 3: Hook Parsing & Registration (Week 3-4) - LOW RISK
**Objective:** Use @unrdf/hooks parser for Turtle hook definitions

1. **TODO:** Create HookParserV2 wrapper
2. **TODO:** Migrate Turtle parsing to @unrdf loader
3. **TODO:** Port custom validations to @unrdf/validation SHACL
4. **TODO:** Deprecate HookParser.mjs

### Phase 4: Streaming & Change Detection (Week 4-5) - MEDIUM RISK
**Objective:** Replace custom change streams with @unrdf/streaming

1. **TODO:** Implement @unrdf/streaming change feed wrapper
2. **TODO:** Port WeakRef cleanup pattern
3. **TODO:** Replace reactive-triggers with @unrdf subscriptions
4. **TODO:** Integrate @unrdf/knowledge-engine semantic diff

### Phase 5: Hook Execution (Week 5-6) - HIGH RISK
**Objective:** Replace HookOrchestrator with @unrdf/hooks executor

1. **TODO:** Create thin wrapper over @unrdf/hooks executor
2. **TODO:** Preserve stream-driven evaluation mode
3. **TODO:** Preserve Git notes receipt writing
4. **TODO:** Full test suite before deprecation

### Phase 6: Final Integration (Week 6-7) - CLEANUP
**Objective:** Remove deprecated wrappers, add @unrdf federation

1. **TODO:** Add @unrdf/federation support for multi-repo hooks
2. **TODO:** Remove deprecated components
3. **TODO:** Complete test coverage for @unrdf integration
4. **TODO:** Update documentation

## Migration Patterns

### Pattern 1: Simple Wrapper
Replace custom implementation with thin wrapper around @unrdf

```javascript
// Before: src/hooks/CompositePredicates.mjs (200 LOC)
export function AND(predicates) { /* custom AND logic */ }
export function OR(predicates) { /* custom OR logic */ }
export function NOT(predicate) { /* custom NOT logic */ }

// After: Use @unrdf/hooks built-in composition
import { composeConditions } from '@unrdf/hooks'
export const AND = (predicates) => composeConditions('AND', predicates)
export const OR = (predicates) => composeConditions('OR', predicates)
export const NOT = (predicate) => composeConditions('NOT', [predicate])
```

### Pattern 2: Wrapper with Custom Extension
Preserve custom functionality while using @unrdf base

```javascript
// Before: src/hooks/PredicateEvaluator.mjs (1,025 LOC)
export class PredicateEvaluator {
  async evaluate(hook, graph, previousGraph) { /* complex logic */ }
}

// After: Extend @unrdf evaluator with Git context
import { createConditionEvaluator } from '@unrdf/hooks'
import { ContextEnricher } from './ContextEnricher.mjs'

export class PredicateEvaluatorV2 {
  constructor(options) {
    this.evaluator = createConditionEvaluator(options)
    this.enricher = new ContextEnricher(options)
  }

  async evaluate(hook, graph, previousGraph, options) {
    const context = await this.enricher.enrich(hook, graph)
    return this.evaluator.evaluate(hook.when, graph, { context })
  }
}
```

### Pattern 3: Deprecation with Compatibility
Keep old implementation for backward compatibility, encourage migration

```javascript
// src/hooks/PredicateEvaluator.mjs - DEPRECATED
import { PredicateEvaluatorV2 } from './PredicateEvaluatorV2.mjs'

console.warn('[DEPRECATED] PredicateEvaluator will be removed in v5.0. Use PredicateEvaluatorV2')

export const PredicateEvaluator = PredicateEvaluatorV2
```

## Risk Assessment

### Low Risk (Safe to Replace Immediately)
- CompositePredicates.mjs - Direct swap to @unrdf built-ins
- HookParser.mjs - @unrdf/hooks loader is mature
- reactive-triggers.mjs - @unrdf/streaming has feature parity

### Medium Risk (Requires Testing)
- PredicateEvaluator.mjs - Git context enrichment must be preserved
- state-change-detector.mjs - Snapshot pattern must work with semantic diff

### High Risk (Strategic Review Needed)
- HookOrchestrator.mjs - DAG workflow execution is core to GitVan
- bree-hook-adapter.mjs - Bree integration must remain reliable
- unified-hooks.mjs composable - Public API, must maintain backward compatibility

## Dependency Changes

### Adding
- @unrdf/hooks@^5.0.1 - Hook execution framework
- @unrdf/validation@^5.0.1 - Schema validation (SHACL, OTEL)
- @unrdf/knowledge-engine@^5.0.1 - Inference, semantic diff, rules
- @unrdf/streaming@^5.0.1 - Change feeds, real-time sync

### Keeping
- @unrdf/core@^5.0.1 - RDF substrate (already used)
- @unrdf/kgc-4d@^5.0.1 - Event logging (already used)
- @unrdf/kgn@^5.0.1 - Templates (already used)

### Removing
- None (current dependencies still needed for other features)

## Testing Strategy

### Pre-Migration
- ✅ All existing tests pass
- ✅ Code coverage ≥ 45% (current state)

### Per-Phase Testing
1. **Phase 1:** Unit tests for wrapper compatibility
2. **Phase 2:** Condition evaluation parity tests
3. **Phase 3:** Turtle parsing equivalence tests
4. **Phase 4:** Change stream integration tests
5. **Phase 5:** Hook execution end-to-end tests
6. **Phase 6:** Full integration test suite with ≥ 85% coverage

### Post-Migration
- ✅ Code coverage ≥ 85%
- ✅ All hook types work (11+ condition types)
- ✅ Git-native features unchanged
- ✅ Performance benchmarks maintained or improved

## Success Criteria

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| **Custom hooks code** | 3,300 LOC | 800 LOC | Phase 6 |
| **Dependencies** | 3 @unrdf | 6 @unrdf | Week 1 |
| **Condition types** | 8 | 11+ | Phase 2 |
| **Test coverage** | 45% | 85%+ | Phase 6 |
| **Wrapper reduction** | Baseline | -74% | Phase 6 |

## Files to Migrate (In Order)

### ✅ DONE
- Package.json: Add @unrdf packages
- Rename unrdf-hooks-bridge.mjs → bree-hook-adapter.mjs

### 🔄 IN PROGRESS
- CompositePredicates.mjs (low risk)
- HookParser.mjs (low risk)

### ⏳ PENDING
1. PredicateEvaluator.mjs (medium risk)
2. reactive-triggers.mjs (medium risk)
3. state-change-detector.mjs (medium risk)
4. HookOrchestrator.mjs (high risk)
5. bree-hook-adapter.mjs (refactor)
6. unified-hooks.mjs (refactor)

## References

- [@unrdf/hooks docs](https://unrdf.dev/hooks)
- [@unrdf/knowledge-engine docs](https://unrdf.dev/knowledge-engine)
- [@unrdf/streaming docs](https://unrdf.dev/streaming)
- [@unrdf/validation docs](https://unrdf.dev/validation)

## Rollback Plan

Each phase is reversible:
- Keep deprecated components in tree until phase 6
- Use feature flags (`USE_NEW_HOOKS=true`) for gradual rollout
- Maintain git history for easy revert
- Parallel test suites (old vs new implementations)
