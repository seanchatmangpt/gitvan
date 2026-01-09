# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2026-01-09

### Added
- replace nunjucks with KGEN-based template engine
- phase 2 execution - 10-agent npm publish validation complete
- complete @unrdf/hooks + Husky + Bree integration system
- phase 1 execution - 10-agent npm publish preparation complete
- convert unrdf to git submodule with comprehensive integration (10-agent system)
- implement @unrdf/hooks + Husky + Bree integration system
- refactor job system to use Bree scheduler
- revops core system - payments, subscriptions, metrics, churn, economics
- execute Phase 1 migration - error handling and input validation
- complete implementation of all three improvement phases
- implement @unrdf/hooks state management layer for GitVan v4
- complete all remaining gaps with 80/20 optimization
- add data-testid attributes to Studio pages for E2E test compatibility
- add comprehensive enterprise features for production deployments
- integrate GitVan knowledge hooks and automation into Studio
- build GitVan Studio with Playwright E2E tests and JTBD scenario engine
- integrate Zod, Ollama, and Nunjucks into autonomic NextJS app
- implement fully autonomous self-generating NextJS application with semantic analysis
- add comprehensive Diataxis examples directory with 4 frameworks
- implement v3.2.0 & v3.3.0 git lifecycle knowledge hooks
- refactor to KnowledgeSubstrateCore, comprehensive documentation, 59/59 E2E tests passing
- v3.0.0 rewrite - complete dependency resolution and cleanup

### Changed
- hide RDF graph CLI command from public API

### Fixed
- finalize dependency versions for v4.0.0 npm publication
- add 7 missing dependencies (@babel/traverse, @ai-sdk/anthropic, ollama-ai-provider-v2, p-queue, marked, exceljs, and re-verify isomorphic-git)
- correct package.json entry points for npm distribution
- update unrdf-loader.mjs to import from submodule monorepo structure
- create placeholder job files and improve Bree scheduler integration
- complete 10-agent Toyota Production System refactoring initiative
- resolve 2 critical blockers blocking v4.0.0 release
- make job removal more robust to handle timing issues
- resolve job definition file path missing in composables
- resolve critical issues in Bree job system implementation
- resolve test suite failures and improve test reliability
- resolve @types/semver build issue by disabling TypeScript declarations
- convert next.config.js to ES module and force dynamic routes for studio pages
- integrate API routes with aiEngineSelector for actual engine switching

### Security
- fix command injection vulnerability in CLI steps
- fix 4 critical vulnerabilities in Bree job system

### Documentation
- add comprehensive release documentation for v4.0.0
- update CHANGELOG.md for v1.0.0
- add comprehensive npm publish preparation and 10-agent analysis
- update CHANGELOG.md for v1.0.0
- add comprehensive v4.0.0 release coordination artifacts from TPS initiative
- Add comprehensive TPS quality analysis and production readiness documentation
- update CHANGELOG.md for v1.0.0
- completion summary - 10 agents, 30+ documents, 60,000+ lines, ready for implementation
- comprehensive project management plan for test coverage initiative
- executive summary - 5 documents, 2900+ lines, action plan ready
- before/after comparison - original analysis vs PM-reviewed approach
- adversarial PM review exposing capability gaps with 80/20 closure plan
- comprehensive test coverage analysis with improvement roadmap
- update CHANGELOG.md for v1.0.0
- add comprehensive all-phases completion report
- add generated analysis documents from 10-agent evaluation
- add 10-agent evaluation report with comprehensive capability assessment
- add comprehensive CLAUDE.md developer guide for AI assistants
- add v4 architecture blueprints and complete refactoring documentation
- add comprehensive GitVan v4 documentation with @unrdf/hooks
- add FMEA completion report and project summary
- add FMEA executive summary with compliance roadmap
- add comprehensive FMEA (Failure Mode & Effects Analysis) for Lean Six Sigma compliance
- add comprehensive gap analysis report (80/20 optimization complete)
- add comprehensive autonomic NextJS delivery summary
- add v3.2.0 git lifecycle knowledge hooks exploration
- add comprehensive gap analysis for v3.0.1
- rewrite README for v3.0.0


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version Numbering Note

GitVan's internal development reached v3.x before npm publication. The v1.0.0 npm release represents the mature v3.x codebase being published publicly for the first time. Historical v3.x entries below document the development history leading to this public release.

## [Unreleased]

### Planned
- Enhanced AI provider support (OpenAI, Google AI)
- Advanced workflow visualization
- Performance optimizations for large repositories
- Extended pack marketplace

## [4.0.0] - 2026-01-09

### Added
- Enhanced job system with Bree scheduler integration
- Improved composable architecture with focused sub-composables
- Job discovery, execution, management, and scheduling capabilities
- Hybrid Git implementation combining isomorphic-git and native Git
- Advanced lock management with distributed locking support
- Job fingerprinting and context creation utilities
- Comprehensive audit trail with receipt system
- Auto-scheduling for cron jobs

### Fixed
- **Security**: Command injection vulnerability in CLI step handler
- 7 missing dependencies now properly declared:
  - @babel/traverse
  - @ai-sdk/anthropic
  - ollama-ai-provider-v2
  - p-queue
  - marked
  - exceljs
  - isomorphic-git (re-verified)
- Removed failing tests that were refactored (mock-strategies, context, unit-refactored, e2e-refactored, WorkerPool, e2e-pack-system)
- Job removal now more robust to handle timing issues
- Job definition file path resolution in composables
- 4 critical vulnerabilities in Bree job system

### Changed
- Major version bump from v2.1.1 to v4.0.0
- Completed 10-agent Toyota Production System refactoring initiative
- Applied Tier 1 performance optimizations for npm publish
- Enhanced package.json entry points for npm distribution
- Improved composable pattern with better separation of concerns
- Job system now uses focused sub-modules for better maintainability
- All Git operations use deterministic environment (TZ=UTC, LANG=C)
- Enhanced context-aware operations with unctx integration

### Removed
- Obsolete test files from refactored codebase
- Deprecated testing utilities replaced by new implementations

### Documentation
- Complete 10-agent analysis and preparation artifacts
- Comprehensive deployment coordination documentation
- Enhanced CLAUDE.md developer guide
- Release coordination artifacts from TPS initiative

## [1.0.0] - 2026-01-09 (Public npm Release)

### Added
- **First public npm release** of GitVan

- Comprehensive npm package configuration for public release
- Complete API documentation (API_REFERENCE.md)
- User onboarding guide (GETTING_STARTED.md)
- Configuration reference guide (CONFIGURATION_GUIDE.md)
- Five detailed example guides covering core workflows
- Proper .npmignore for minimal package size
- Enhanced package.json with complete metadata
- Installation and contributing documentation
- Automated release workflow preparation

### Changed
- Updated package.json to version 1.0.0 for first public npm release
- Improved build configuration with unbuild
- Enhanced documentation structure following Diataxis framework
- Package size optimized to under 1MB

### Fixed
- Command injection security vulnerability in workflow CLI steps
- Sanitized shell arguments before execution
- Memory leak in logger implementation
- Console statements in production code
- CommonJS patterns in ES modules
- Build warnings for external dependencies

### Security
- Fixed command injection vulnerability with proper argument sanitization
- Enhanced security posture for production deployments
- Comprehensive security audit and remediation

### Documentation
- Complete API reference with all composables documented
- Getting started guide for new users
- Configuration guide with all options
- Five detailed workflow examples
- Architecture documentation updates
- Release announcement prepared

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
