# GitVan Export Cleanup - Removal Plan

**Date:** 2026-01-08
**Agent:** Agent 7 - API & Export Cleanup

## Phased Removal Approach

### Phase 1: Safe Immediate Removals ✅

Items that can be removed with zero risk:

#### 1.1 Backup Files
- ❌ `/src/pack/marketplace.mjs.bak` - Remove

#### 1.2 Example Code (Move or Remove)
- ⚠️ `/src/unrdf-hooks/examples/` - Move to `/examples/unrdf-hooks/`
  - `advanced-patterns.ts` (useGitRepository, useFeatureFlags, useForm, etc.)
  - `basic-usage.ts` (basicStateExample, effectExample, etc.)
  - `index.ts` (re-exports)

**Decision:** Move to examples directory, not part of public API

#### 1.3 Unused Template Constants
Check if these are referenced anywhere:
- ⚠️ `BASE_JOB_TEMPLATE` (src/templates/job-templates.mjs)
- ⚠️ `FILE_OPERATION_TEMPLATE` (src/templates/job-templates.mjs)
- ⚠️ `GIT_OPERATION_TEMPLATE` (src/templates/job-templates.mjs)

**Action:** Verify usage, then remove if confirmed unused

### Phase 2: Internal API Cleanup ⚙️

Items that should be marked as internal or moved:

#### 2.1 Test Utilities
Move from public API to separate export path:
- `useTestEnvironment` - Move to `gitvan/testing`
- `withTestEnvironment` - Move to `gitvan/testing`

**Action:**
1. Create `src/testing.mjs` with test exports
2. Remove from `src/index.mjs`
3. Update import paths in tests

#### 2.2 Mark Internal Exports
Add JSDoc `@internal` tag to:
- Internal pack utilities
- Internal job system helpers
- Internal workflow utilities

### Phase 3: Consolidation 🔄

Items to consolidate or refactor:

#### 3.1 Duplicate Exports
- `PackCache` exported from multiple locations
  - Keep: `src/pack/pack-cache.mjs` (primary)
  - Remove re-exports from `registry.mjs` and `optimization/index.mjs`

- `PackRegistry` mixed default/named export
  - Choose: Named export only
  - Remove default export

#### 3.2 Git Composable Helpers
Many git/* submodule exports are unused:
- Review `src/composables/git/*.mjs`
- Consolidate rarely-used functionality

### Phase 4: Feature Review 🔍

Requires stakeholder decision:

#### 4.1 RevOps System (0 usage)
Complete system with zero imports:
- `useRevOpsCustomers`
- `useRevOpsForecast`
- `useRevOpsHealth`
- `useRevOpsMetrics`
- `useRevOpsReport`
- `useRevOpsIntegrations`
- `usePaymentProcessor`
- `useChurnPredictor`
- `useSubscriptionManager`
- `useRevenueMetrics`
- `useUnitEconomics`

**Decision needed:** Remove or mark as experimental?

#### 4.2 AI/ML System (minimal usage)
Large AI system with classes:
- `AIPromptEvolution`
- `AITemplateLoopEnhancement`
- `ContextAwareGenerator`
- `GraphAwareTemplateGenerator`
- `TemplateLearningManager`
- `UserFeedbackManager`

**Decision needed:** Keep as internal, expose as plugin, or remove?

#### 4.3 Performance Utilities (0-1 usage)
Many performance composables unused:
- `useDebounce`, `useThrottle`, `useRateLimiter`
- `useMemo`, `useBatchMemo`, `useWeakMemo`, `usePersistentMemo`
- `useQueryCache`, `useComputedCache`, `useCacheManager`
- `useBatchProcessor`, `useTransactionalBatch`, `usePriorityBatchQueue`
- `usePerformanceMonitor`, `useExecutionTracer`

**Decision needed:** Keep for external use or remove?

### Phase 5: V4 Migration (Post v4.0.0) 🚀

After V4 is stable:
- Re-audit all exports
- Mark V3-only exports as deprecated
- Plan V3 → V4 migration timeline

## Removal Checklist

Before removing any export:

- [ ] Verify 0 internal usage (via grep/ripgrep)
- [ ] Check if exported from main index
- [ ] Check if documented in CLAUDE.md
- [ ] Check if used by tests
- [ ] Check if part of public API contract
- [ ] Search for string references (not just imports)
- [ ] Consider external package usage

## Immediate Actions (Safe)

### 1. Remove Backup File

```bash
rm src/pack/marketplace.mjs.bak
```

### 2. Move Examples

```bash
mkdir -p examples/unrdf-hooks
mv src/unrdf-hooks/examples/*.ts examples/unrdf-hooks/
# Update imports in example files
```

### 3. Create Testing Export Path

Create `src/testing.mjs`:
```javascript
/**
 * GitVan Testing Utilities
 *
 * @module gitvan/testing
 */

export {
  useTestEnvironment,
  withTestEnvironment
} from "./composables/test-environment.mjs";
```

Update `package.json`:
```json
{
  "exports": {
    ".": "./dist/index.mjs",
    "./v4": "./dist/v4/index.js",
    "./testing": "./dist/testing.mjs"
  }
}
```

Remove from `src/index.mjs`:
```javascript
// Remove these lines:
// useTestEnvironment,
// withTestEnvironment,
```

### 4. Fix PackRegistry Duplicate Export

In `src/pack/registry.mjs`:
```javascript
// Remove this line:
// export { PackRegistry as default } from "./pack-registry-core.mjs";

// Keep only:
export { PackRegistry } from "./pack-registry-core.mjs";
```

## Testing After Removals

```bash
# Run tests
npm test

# Build
npm run build

# Check for import errors
npm run lint

# Try example usage
node examples/basic-usage.mjs
```

## Rollback Plan

If issues arise:
1. Git revert the changes
2. Review what broke
3. Re-categorize the export
4. Try again with better analysis

## Success Metrics

- ✅ Unused percentage drops from 64.2% to <40%
- ✅ All tests pass
- ✅ Build succeeds
- ✅ Public API remains stable
- ✅ Documentation updated

## Timeline

- **Phase 1:** Immediate (today)
- **Phase 2:** Short-term (this week)
- **Phase 3:** Medium-term (this sprint)
- **Phase 4:** Long-term (requires stakeholder approval)
- **Phase 5:** Post v4.0.0 release

---

**Status:** Ready for Phase 1 execution
