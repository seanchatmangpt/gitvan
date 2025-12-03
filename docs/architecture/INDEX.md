# GitVan v3.0.0 Architecture Documentation

**Version**: 3.0.0
**Status**: Complete Architecture Design
**Last Updated**: 2025-12-02

---

## Overview

This directory contains the complete architecture documentation for GitVan v3.0.0, a **complete rewrite** with **NO backwards compatibility**. The v3 design reduces the codebase by **89%** (76k → 8.5k LOC) while achieving production-ready quality.

---

## Documents

### 1. Executive Summary
**File**: [`/Users/sac/gitvan/docs/GITVAN-V3-EXECUTIVE-SUMMARY.md`](/Users/sac/gitvan/docs/GITVAN-V3-EXECUTIVE-SUMMARY.md)

**Audience**: Leadership, stakeholders, decision-makers

**Contents**:
- TL;DR (key metrics, benefits)
- Problem statement (v2.1.1 issues)
- Solution (v3 architecture)
- Benefits (users, developers, maintainers)
- Risks and mitigations
- Success metrics
- Timeline and resources

**Key Takeaways**:
- **89% smaller codebase** (8,450 LOC vs 76,483)
- **60% faster workflows** (<2s vs 5s)
- **Production-ready from day 1** (80%+ test coverage)

---

### 2. Complete Architecture Design
**File**: [`/Users/sac/gitvan/docs/GITVAN-V3-ARCHITECTURE.md`](/Users/sac/gitvan/docs/GITVAN-V3-ARCHITECTURE.md)

**Audience**: Architects, senior developers

**Contents**:
- Design principles (composability, pure functions)
- System architecture (4 layers)
- Component design (Git-native I/O, workflows, hooks, packs)
- Data flows (execution paths)
- Integration points (unrdf, Git)
- Performance considerations
- Security model
- Future extensibility

**Key Sections**:
- **Module Structure**: New `src/` layout (8,450 LOC)
- **Git-Native I/O**: Locks, queues, receipts, snapshots
- **Workflow Engine**: Transaction-based execution
- **Hook System**: unrdf defineHook integration
- **Pack System**: Single RDF-based registry

---

### 3. Architecture Decision Records (ADRs)
**File**: [`/Users/sac/gitvan/docs/architecture/ADR-001-complete-rewrite.md`](/Users/sac/gitvan/docs/architecture/ADR-001-complete-rewrite.md)

**Audience**: Technical decision-makers

**Contents**:
- **ADR-001**: Complete Rewrite vs Incremental Refactor
- **ADR-002**: unrdf as Foundation (import, don't duplicate)
- **ADR-003**: Git-Native I/O as Core Competency
- **ADR-004**: citty CLI Framework
- **ADR-005**: Single Pack Registry
- **ADR-006**: Workflow Engine with unrdf Transactions

**Decision Framework**:
- Context (what problem are we solving?)
- Options considered (with pros/cons)
- Decision (selected option)
- Rationale (why this option?)
- Consequences (positive, negative, mitigations)

---

### 4. C4 Architecture Diagrams

#### 4.1 Context Diagram (Level 1)
**File**: [`/Users/sac/gitvan/docs/architecture/C4-CONTEXT-DIAGRAM.md`](/Users/sac/gitvan/docs/architecture/C4-CONTEXT-DIAGRAM.md)

**Scope**: GitVan in its operational environment

**Elements**:
- **Users**: Developers executing workflows
- **Systems**: GitVan, unrdf, Git, File System
- **Relationships**: CLI commands, RDF operations, Git plumbing

**Diagram**:
```
Developer → GitVan → unrdf (RDF/SPARQL)
                  → Git (refs, notes)
                  → File System (.ttl files)
```

#### 4.2 Container Diagram (Level 2)
**File**: [`/Users/sac/gitvan/docs/architecture/C4-CONTAINER-DIAGRAM.md`](/Users/sac/gitvan/docs/architecture/C4-CONTAINER-DIAGRAM.md)

**Scope**: GitVan internal modules

**Containers**:
- **CLI Layer**: citty commands (workflow, pack, hook)
- **Integration Layer**: unrdf adapter, Git wrapper
- **Domain Layer**: Workflows, Hooks, Packs
- **Foundation Layer**: Git-Native I/O

**Data Flows**:
- Workflow execution: CLI → Parser → Executor → Git-Native I/O
- Pack installation: CLI → Registry (SPARQL) → Installer → File System
- Hook triggering: Workflow → Bridge → unrdf defineHook

---

### 5. Technology Evaluation Matrix
**File**: [`/Users/sac/gitvan/docs/architecture/TECHNOLOGY-EVALUATION-MATRIX.md`](/Users/sac/gitvan/docs/architecture/TECHNOLOGY-EVALUATION-MATRIX.md)

**Audience**: Technical evaluators

**Contents**:
- Evaluation criteria (maturity, ecosystem fit, performance, DX)
- Technology comparisons (scored 1-5)
- Decisions (with rationale and trade-offs)

**Technologies Evaluated**:
1. **Runtime**: Node.js 18+ vs Deno vs Bun
2. **RDF/Knowledge**: unrdf vs rdflib.js vs graphy vs custom
3. **CLI Framework**: citty vs commander vs yargs vs custom
4. **Template Engine**: Nunjucks vs Handlebars vs EJS vs template literals
5. **Validation**: Zod vs Yup vs Joi vs AJV
6. **Testing**: Vitest vs Jest vs Mocha vs Tap
7. **Git Operations**: Native CLI vs simple-git vs isomorphic-git
8. **Package Manager**: pnpm vs npm vs yarn vs bun

**Selected Stack**:
- Node.js 18+, unrdf v4.1.1, citty, Nunjucks, Zod, Vitest, pnpm
- **15 dependencies** (vs v2's 42 = 64% reduction)

---

### 6. Implementation Roadmap
**File**: [`/Users/sac/gitvan/docs/V3-IMPLEMENTATION-ROADMAP.md`](/Users/sac/gitvan/docs/V3-IMPLEMENTATION-ROADMAP.md)

**Audience**: Development team, project managers

**Contents**:
- 4-phase implementation plan (16 weeks)
- Week-by-week deliverables
- Success criteria per phase
- Risk management
- Team & resources

**Timeline**:
- **Phase 1** (Weeks 1-4): Foundation (Git-native I/O, integration layer)
- **Phase 2** (Weeks 5-8): Domain logic (workflows, hooks, packs)
- **Phase 3** (Weeks 9-12): CLI & tooling (commands, migration)
- **Phase 4** (Weeks 13-16): Stable release (beta testing, final release)

**Milestones**:
- Week 4: Alpha release (v3.0.0-alpha.1)
- Week 8: Beta release (v3.0.0-beta.1)
- Week 12: Release candidate (v3.0.0-rc.1)
- Week 16: Stable release (v3.0.0)

---

## Quick Reference

### Architecture Summary

| Aspect | v2.1.1 | v3.0.0 | Change |
|--------|--------|--------|--------|
| **Files** | 277 | ~30 | -89% |
| **LOC** | 76,483 | 8,450 | -89% |
| **Dependencies** | 42 | 15 | -64% |
| **Test Coverage** | 35% | 80%+ | +129% |
| **Bundle Size** | 2.3 MB | 500 KB | -78% |
| **Workflow Speed** | 5s | <2s | +60% |
| **Pack Registries** | 7 | 1 | -86% |
| **RDF Code** | 6,000 LOC | 0 (use unrdf) | -100% |

### Module Breakdown (8,450 LOC)

| Module | LOC | % of Total | Purpose |
|--------|-----|------------|---------|
| `cli/` | 800 | 9.5% | citty CLI commands |
| `git/` | 1,200 | 14.2% | Git operations |
| `git-native/` | 2,000 | 23.7% | Locks, queues, receipts |
| `workflows/` | 1,500 | 17.8% | Workflow engine |
| `hooks/` | 800 | 9.5% | JTBD hook bridge |
| `packs/` | 1,200 | 14.2% | Pack registry & installer |
| `integration/` | 500 | 5.9% | unrdf adapters |
| `utils/` | 400 | 4.7% | Shared utilities |
| `index.mjs` | 50 | 0.6% | Main exports |

---

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| Executive Summary | ✅ Complete | 2025-12-02 |
| Architecture Design | ✅ Complete | 2025-12-02 |
| ADR-001 | ✅ Accepted | 2025-12-02 |
| C4 Context | ✅ Complete | 2025-12-02 |
| C4 Container | ✅ Complete | 2025-12-02 |
| Technology Matrix | ✅ Final | 2025-12-02 |
| Implementation Roadmap | ✅ Final | 2025-12-02 |

---

**Architecture Design**: ✅ Complete and Ready for Implementation
