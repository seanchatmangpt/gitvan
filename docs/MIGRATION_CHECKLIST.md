# GitVan @UNRDF Migration Checklist

## ✅ Phase 0: Foundation (DONE)
- [x] Remove all non-scoped 'unrdf' imports (use @unrdf/core)
- [x] Delete unused composables (useRDFStore, useOxigraphStore, useN3Rules)
- [x] Delete wrapper modules (rdf-loader, rdf-config)
- [x] Add @unrdf packages to package.json (core, hooks, validation, knowledge-engine, streaming)
- [x] Create composable wrappers (useKnowledgeHookRegistry, useJobRegistry)
- [x] Add deprecation notices to anti-pattern classes

## 🔄 Phase 1: Quick Wins (80/20 - Next)
- [ ] Consolidate JobRegistry with define-job.mjs (single source of truth)
- [ ] Update graph-based-jobs.mjs to use consolidated registry
- [ ] Create proof-of-concept @unrdf/hooks integration (non-breaking)
- [ ] Document KnowledgeHookRegistry SPARQL migration path
- [ ] Add feature flags for @unrdf experimental features
- [ ] Verify all tests run with new @unrdf packages
- [ ] Update CLAUDE.md with @unrdf philosophy alignment section

## 📋 Phase 2: RDF Migration (Weeks 2-4)
- [ ] Replace KnowledgeHookRegistry with @unrdf/hooks evaluator wrapper
- [ ] Migrate hook parsing to @unrdf/hooks loader
- [ ] Add SPARQL queries for hook discovery
- [ ] Integrate @unrdf/validation for hook schema validation
- [ ] Add git-native hook storage (git refs)

## 🔧 Phase 3: Job System (Weeks 4-6)
- [ ] Replace JobRegistry with @unrdf RDF-backed storage
- [ ] Migrate job definitions to Turtle format
- [ ] Store job metadata in git refs
- [ ] Add SPARQL queries for job discovery
- [ ] Implement git notes audit trail for job execution

## 🎯 Phase 4: Full Integration (Weeks 6-8)
- [ ] Implement @unrdf/federation for multi-repo job discovery
- [ ] Add @unrdf/knowledge-engine for job inference
- [ ] Implement @unrdf/streaming for real-time job state changes
- [ ] Full test coverage for @unrdf integration
- [ ] Remove v3 fallback code

## ⚠️ Anti-Patterns to Address
- [ ] Global registries (KnowledgeHookRegistry, JobRegistry) → RDF storage
- [ ] Duplicate registries (job-registry.mjs, define-job.mjs) → single source
- [ ] v4 middleware pipeline → git hooks or remove if unused
- [ ] Factory patterns without business logic → direct class usage
- [ ] Dynamic imports → explicit static imports
- [ ] In-memory caches → @unrdf/core caching

## 🧪 Testing Requirements
- [ ] Unit tests for new composables
- [ ] Integration tests with @unrdf/core
- [ ] End-to-end tests for hook execution
- [ ] Performance benchmarks (no regression)
- [ ] Git-native storage tests (git refs, notes)

## 📚 Documentation Updates
- [ ] Update README.md with @unrdf architecture overview
- [ ] Document migration path for hook system
- [ ] Create @unrdf integration examples
- [ ] Update CLAUDE.md with best practices
- [ ] Add migration troubleshooting guide

## 🚀 Release Steps
- [ ] Bump version to v4.1.0 (foundation phase)
- [ ] Release v4.2.0 (RDF migration)
- [ ] Release v4.3.0 (job system)
- [ ] Release v5.0.0 (full @unrdf integration, remove v3)

## Current Status
- Foundation phase: 100% complete
- RDF layer: 80% analyzed, 0% implemented
- Job system: 100% analyzed, 0% implemented
- Full integration: 0% complete
