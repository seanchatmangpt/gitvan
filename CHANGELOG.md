# Changelog

All notable changes to GitVan will be documented in this file.

## [3.0.1] - 2025-12-03

### Fixed
- Fixed package.json with proper name, version, and all dependencies
- Fixed LRUCache ESM import compatibility issue
- Fixed GitNativeIO import path in HookOrchestrator

### Changed
- Updated README to accurately reflect v3.0 capabilities
- Removed duplicate git-native files (kept PascalCase canonical versions)

### Added
- Complete dependency list in package.json (25+ packages)
- Proper npm package configuration (bin, exports, files)

## [3.0.0] - 2025-12-03

### Breaking Changes
- Complete v3 rewrite - no backwards compatibility with v2.x
- Removed marketing claims and overpromised features from README
- Consolidated duplicate implementations

### Added
- Knowledge Hook Engine with SPARQL predicates
  - ResultDelta predicates for state change detection
  - ASK predicates for boolean conditions
  - SELECTThreshold predicates for metric-based triggers
  - SHACL validation predicates
- Workflow Engine with dependency management
  - SPARQL step type
  - Template step type (Nunjucks)
  - File step type
  - HTTP step type
  - CLI step type
- Git-Native I/O layer
  - LockManager for distributed locking
  - QueueManager for operation queuing
  - SnapshotStore for state tracking
  - WorkerPool for non-blocking operations
  - ReceiptWriter for audit logging
- RDF Engine built on unrdf
  - Full SPARQL 1.1 support
  - SHACL validation
  - N3 reasoning
  - Clownface graph traversal
- Vue.js-style composables architecture
  - useGit, useGraph, useTurtle, useTemplate, useJob, usePack

### Changed
- CLI built on citty framework
- Configuration via c12 loader
- All 17 CLI commands functional

### Removed
- Duplicate kebab-case git-native files
- Marketing claims that didn't match implementation
- Over-engineered pack registry implementations

## [2.1.1] - 2025-12-02

### Changed
- Build script updated to use unbuild directly

## [2.1.0] - 2025-11-XX

### Added
- Knowledge Hook Engine initial implementation
- Turtle workflow definitions
- JTBD hooks system

---

For older versions, see git history.
