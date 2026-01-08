# GitVan Export Audit Report

**Date:** 2026-01-08
**Agent:** Agent 7 - API & Export Cleanup
**Initiative:** Toyota Production System v4.0.0 Completion

## Executive Summary

Comprehensive audit of all exports in the GitVan codebase revealed:

- **Total exports:** 890
- **Unused exports:** 571 (64.2%)
- **Export consistency:** ✅ All composables follow `use*` pattern

## Detailed Breakdown

### 1. Composables (use* functions)

**Total:** 151
**Used:** 68 (45.0%)
**Unused:** 83 (55.0%)

#### Top Used Composables
1. `useGitVan` - 51 imports (core context hook)
2. `useGit` - 43 imports (git operations)
3. `useTemplate` - 15 imports (template rendering)
4. `useLog` - 11 imports (logging)
5. `useGraph` - 10 imports (RDF graph operations)
6. `useNotes` - 10 imports (git notes)
7. `useJob` - 10 imports (job execution)
8. `useState` - 8 imports (v4 state management)
9. `useEffect` - 8 imports (v4 lifecycle)
10. `useReceipt` - 6 imports (audit trails)

#### Unused Composables (Selection)

**Performance/Optimization:**
- `useAdaptiveTiming` - Performance timing utilities
- `useBatchProcessor` - Batch operation processing
- `useCoalescer` - Operation coalescing
- `useDebounce` - Debouncing utility
- `useThrottle` - Throttling utility
- `useRateLimiter` - Rate limiting
- `useMemo`, `useBatchMemo`, `useWeakMemo`, `usePersistentMemo` - Various memoization
- `useQueryCache`, `useComputedCache`, `useCacheManager` - Caching utilities
- `usePerformanceMonitor`, `useExecutionTracer` - Performance monitoring

**UnRDF Hooks (mostly in /src/unrdf-hooks/):**
- `useCache`, `useCachedValue`, `useCacheStats`, `useInvalidate`, `usePrefetch`
- `useEventHistory`, `useEventCount`, `useDebouncedEvent`, `useThrottledEvent`
- `useGitLog`, `useGitRebase`, `useGitRemote`, `useGitReset`, `useGitTag`, `useGitClean`
- `useRemotes`, `useStashes`, `useTags`, `useWorktrees`, `useCurrentSha`
- `useError`, `useErrorReporter`, `useErrorAggregator`, `useTryCatch`
- `useIdle`, `useAsyncInit`, `useCleanup`
- `useRace`, `useSwitch`

**V4 Hooks (in /src/v4/):**
- `useCounter`, `useToggle`, `usePrevious`, `useTimeout`, `useId`
- `useDebouncedAsync`, `usePersistentRef`
- `useMiddleware`, `useRequest`, `useResponse`
- `useHooks` (v4 hook registry)

**RevOps Composables (in /src/revops/ and /src/composables/revops/):**
- `useRevOpsCustomers`, `useRevOpsForecast`, `useRevOpsHealth`
- `useRevOpsMetrics`, `useRevOpsReport`, `useRevOpsIntegrations`
- `usePaymentProcessor`, `useUnitEconomics`

**Examples/Demo:**
- `useConnection`, `useFeatureFlags`, `useForm`, `usePagination`
- `useStore`, `useUndoRedo`, `useGitWorkflow`, `useGitRepository`

**Other:**
- `useNativeIO` - Native I/O operations
- `useRegistry` - Component registry (exported in index but unused!)
- `useTestEnvironment` - Test utilities (exported but unused internally)
- `useTemplateSync` - Synchronous template operations

### 2. Classes

**Total:** 189
**Used:** 80 (42.3%)
**Unused:** 109 (57.7%)

#### Notable Unused Classes

**AI/ML Related:**
- `AIPromptEvolution`
- `AITemplateLoopEnhancement`
- `ContextAwareGenerator`
- `GraphAwareTemplateGenerator`
- `TemplateLearningManager`
- `UserFeedbackManager`

**Git Lifecycle:**
- `AsyncEventProcessor`
- `EventCorrelator`
- `DashboardAggregator`
- `VisualizationData`

**Job System:**
- `BreeScheduler`
- `JobBridge`

**Pack System:**
- Many internal pack utilities and helpers

**RDF/Unrdf:**
- Various hook implementation classes

### 3. Functions (non-composable)

**Total:** 405
**Used:** 105 (25.9%)
**Unused:** 300 (74.1%)

#### Top Used Functions
1. `createLogger` - 165 imports (logging utility)
2. `withGitVan` - 38 imports (context wrapper)
3. `defineJob` - 24 imports (job definition)
4. `tryUseGitVan` - 19 imports (safe context access)
5. `sha256Hex` - 8 imports (hashing)
6. `fingerprint` - 7 imports (fingerprinting)
7. `signal` - 7 imports (v4 reactivity)

#### Unused Functions (Notable)

**Security:**
- `addSafeFilter`, `auditTemplate`, `checkExposedSecrets`
- Various template sanitization functions

**Error Handling:**
- `assert`, `assertDefined`, `assertType`, `categorizeError`

**API/Request Handling:**
- `badRequest`, `buildQuery`, `cacheMiddleware`
- Many v4 API helpers

**Utilities:**
- Many utility functions that might be needed later

### 4. Constants & Objects

**Total:** 145
**Used:** 66 (45.5%)
**Unused:** 79 (54.5%)

#### Notable Unused Constants

**Templates:**
- `BASE_JOB_TEMPLATE`
- `CHANGELOG_TEMPLATE`
- `DEV_DIARY_TEMPLATE`
- `EVENT_WRITER_TEMPLATE`
- `JOB_WRITER_TEMPLATE`
- `RELEASE_NOTES_TEMPLATE`
- `TEMPLATE_GENERATOR_TEMPLATE`
- `GIT_OPERATION_TEMPLATE`
- `FILE_OPERATION_TEMPLATE`

**Schemas:**
- Various Zod schemas (ChatInput, ChatOutput, ConfigSchema, etc.)
- EventDefinition, EventMetadata schemas

**Configuration:**
- `ErrorCategory`, `RecoveryStrategy`, `HealthStatus`
- `DEFAULT_LIFECYCLE_CONFIG`, `DEFAULT_HOOKS`
- `GitVanTokens`, `SECURITY_DEFAULTS`

## Public API Analysis

### Officially Exported (src/index.mjs)

The main entry point exports these composables:
- ✅ `useGit` - USED (43 imports)
- ✅ `useFileSystem` - USED (several imports)
- ⚠️ `useTestEnvironment`, `withTestEnvironment` - EXPORTED but unused internally
- ✅ `useWorktree` - USED
- ✅ `useTemplate` - USED (15 imports)
- ✅ `useNotes` - USED (10 imports)
- ✅ `useUnrouting` - USED
- ✅ `useJob` - USED (10 imports)
- ✅ `useEvent` - USED
- ✅ `useSchedule` - USED
- ✅ `useReceipt` - USED (6 imports)
- ✅ `useLock` - USED
- ⚠️ `useRegistry` - EXPORTED but only 0-2 imports!
- ✅ `usePack` - USED
- ✅ `withGitVan`, `useGitVan`, `tryUseGitVan` - HEAVILY USED

### V4 API (src/v4/index.ts)

Many V4 exports are unused because v4 is still in development. Key exports:
- Core hooks: `useState`, `useEffect`, `useMemo`, `useCallback`, etc.
- Context/DI: `createContext`, `provide`, `inject`, etc.
- Middleware: `createPipeline`, `defineMiddleware`, etc.
- Error handling: Error classes and boundaries
- GitVan-specific: `useGit`, `useJob`, `useTemplate`, `useConfig`, `useWorkflow`

Most v4 exports show low usage because the migration is in progress.

## Categories of Unused Exports

### Category 1: Safe to Remove ❌
**Examples/Demo Code:**
- `/src/unrdf-hooks/examples/` - All example composables
- Demo implementations that aren't part of the public API

**Recommendation:** Remove or move to separate examples directory

### Category 2: Future API (Keep) ✅
**V4 Development:**
- Most hooks in `/src/v4/` are for future use
- Keep all v4 exports as they're part of the planned API

**Performance Utilities:**
- `/src/performance/` composables might be used by consumers
- Keep as they're likely part of extended API

### Category 3: Internal Refactoring Candidates ⚙️
**Git Internal Helpers:**
- `/src/composables/git/*.mjs` - Many git submodule helpers
- Consider consolidation into fewer exports

**Pack System Internals:**
- Many internal pack utilities that could be private

### Category 4: Uncertain/Review Needed ⚠️
**AI/Template System:**
- Large AI system with many unused classes
- Needs review: Is this completed? Planned? Deprecated?

**RevOps System:**
- Complete RevOps subsystem with no usage
- Needs decision: Keep for future or remove?

**UnRDF Hooks:**
- Extensive hook library with low usage
- Review: Which are essential vs. nice-to-have?

## Export Consistency Analysis

### ✅ Patterns Followed Correctly

1. **Composables:** All use `export function use*()` pattern
2. **Main index files:** Properly re-export from submodules
3. **Type definitions:** Properly exported where used

### ⚠️ Potential Issues

1. **Index file exports:** Some index files re-export items that are never imported
2. **Duplicate exports:** Some items exported from multiple locations
3. **Circular dependencies:** Potential issues in some modules (needs deeper analysis)

## Recommendations

### Immediate Actions (Phase 1)

1. **Remove example code:**
   - Move `/src/unrdf-hooks/examples/` to `/examples/` or remove entirely
   - These are demo patterns, not production code

2. **Audit test-only exports:**
   - `useTestEnvironment` is exported in main index but might be test-only
   - Move test utilities to separate export path

3. **Document public API:**
   - Create comprehensive API documentation
   - Mark which exports are public vs. internal
   - Use JSDoc `@internal` for internal exports

4. **Clean up dead templates:**
   - Many template constants are unused
   - Remove or consolidate template definitions

### Medium-term Actions (Phase 2)

1. **Review RevOps system:**
   - Complete system with zero usage
   - Decision needed: Remove or complete implementation?

2. **Consolidate AI system:**
   - Many AI-related classes are unused
   - Consolidate or remove unfinished features

3. **Review performance utilities:**
   - Many performance hooks unused
   - Keep essential ones, remove duplicates

4. **Optimize git composables:**
   - Many git submodule helpers unused
   - Consolidate into fewer, more focused exports

### Long-term Actions (Phase 3)

1. **V4 migration completion:**
   - Many v4 exports will become used as migration completes
   - Re-audit after v4 migration is done

2. **Create internal vs. public exports:**
   - Use `/internal` path for internal-only exports
   - Keep public API surface small and documented

3. **Automated export tracking:**
   - Add CI check for unused exports
   - Require documentation for all public exports

## Breaking Changes Assessment

### Low Risk (Can Remove)
- Example composables in `/examples/`
- Unused template constants
- Internal utilities with no external usage

### Medium Risk (Review Needed)
- RevOps system (check if external packages use it)
- Some performance utilities (might be used by consumers)
- AI system classes (check if they're work-in-progress)

### High Risk (Don't Remove)
- Anything exported from `/src/index.mjs`
- V4 API exports (future public API)
- Core composables even if low usage

## Metrics Summary

```
Total Exports: 890
├── Composables: 151 (17%)
│   ├── Used: 68 (45%)
│   └── Unused: 83 (55%)
├── Classes: 189 (21%)
│   ├── Used: 80 (42%)
│   └── Unused: 109 (58%)
├── Functions: 405 (46%)
│   ├── Used: 105 (26%)
│   └── Unused: 300 (74%)
└── Constants: 145 (16%)
    ├── Used: 66 (46%)
    └── Unused: 79 (54%)

Overall Unused: 571/890 (64.2%)
```

## Next Steps

1. ✅ Complete export audit (DONE)
2. 🔄 Get stakeholder approval for removal categories
3. ⏳ Create detailed removal plan
4. ⏳ Execute removal in phases
5. ⏳ Update documentation
6. ⏳ Add CI checks for future exports

---

**Generated by:** GitVan Export Analysis Tool
**Script:** `/home/user/gitvan/scripts/analyze-exports.mjs`
