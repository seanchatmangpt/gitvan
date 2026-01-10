# @unrdf/validation Integration Plan - Executive Summary

## Document Location
`/home/user/gitvan/UNRDF_VALIDATION_INTEGRATION_PLAN.md` (2,847 lines)

## Overview
Comprehensive 60+ page integration plan for incorporating @unrdf/validation package into GitVan v4.0.2+. The plan covers SHACL shapes validation, data quality checks, and schema enforcement across GitVan's RDF-driven architecture.

## Key Findings

### Package Capabilities
- Full SHACL 1.1 specification support
- Advanced features including SPARQL-based custom rules
- Data quality pattern composition
- Recursive shape validation
- Performance optimization through caching

### Current GitVan Validation Gaps
1. **No Declarative Validation** - Ad-hoc checks scattered throughout codebase
2. **Poor Error Messages** - Generic strings, no structured feedback
3. **No Shape Composition** - Cannot share validation rules across components
4. **No Ontology Enforcement** - Data quality not tied to schema
5. **No Automated Repair** - Validation fails but doesn't suggest fixes

## Integration Opportunities

### 8 Major Integration Points
1. **RDF Schema Validation** - Ensure git-derived RDF conforms to ontology
2. **Code Schema Validation** - Define valid code patterns via SHACL shapes
3. **Workflow Validation** - Validate DAG workflows before execution
4. **Data Quality Checks** - Ensure hook results meet quality standards
5. **Ontology Compliance** - All packs conform to GitVan ontology
6. **Breaking Change Detection** - Shapes changes that would break packs
7. **Pack Metadata Validation** - Pack manifests well-formed and valid
8. **Hook Result Validation** - Hooks produce valid RDF data

## Implementation Roadmap

### Phase 1: Core SHACL Integration (8-12 hours)
- Package setup and composable implementation
- Basic Git ontology SHACL shapes
- Initial integration tests
- **Output:** Basic validation infrastructure

### Phase 2: Ontology Formalization (12-16 hours)
- Complete formalization of 5 ontology areas:
  - RDF Schema Shapes (Quad, Resource, BlankNode, Literal)
  - Code Schema Shapes (Function, Class, Module, Variable)
  - Workflow Schema Shapes (Workflow, Step, Action, Dependency)
  - Pack Schema Shapes (Package, Dependency, Template, Job)
  - Quality Schema Shapes (HookResult, Artifact, Metric)
- Shape registry and comprehensive tests
- **Output:** 50+ SHACL shape definitions

### Phase 3: Validation Hooks & Feedback (10-14 hours)
- Validation gate middleware
- Hook result validator
- Violation reporter with clear messages
- Repair suggestion engine
- CLI validation commands
- **Output:** Integrated validation with inline feedback

### Phase 4: Schema Evolution & Migration (8-12 hours)
- Shape versioning system
- Breaking change detector
- Migration utilities
- Shape evolution documentation
- **Output:** Safe shape evolution mechanisms

**Total Effort:** 38-54 hours (5-6 weeks with 1-2 engineers)

## 8 Complete SHACL Shape Examples

The plan includes full, production-ready SHACL shape definitions:

1. **Git Commit Validation** - SHA validation, author checks, date ordering
2. **Workflow Step Validation** - Step naming, action references, dependencies
3. **Pack Metadata Validation** - Name patterns, semver, licensing, author requirements
4. **RDF Literal Validation** - Datatype constraints, cardinality, format checking
5. **Hook Configuration Validation** - Event triggers, enabled flags, timeout limits
6. **Graph Namespace Validation** - Prefix uniqueness, IRI validation, versioning
7. **Quality Metric Validation** - Name patterns, measurement timestamps, unit constraints
8. **Access Control Policy Validation** - Resource protection, subject/action validation

## Success Metrics

### Validation Coverage
- **Target:** >95% of RDF data validated
- **Metrics:** Hook results, pack metadata, workflows, code entities
- **False Positive Rate:** <0.1%

### Performance
- **Baseline:** ~50ms hook execution
- **Target Overhead:** <5% (2.5ms validation)
- **Optimization:** Shape caching, lazy loading, parallel validation

### Developer Friction
- **Clear Error Messages:** All violations with context
- **Repair Suggestions:** Auto-fixes for safe transformations
- **Time to Resolution:** <5 minutes for typical validation errors

## Technical Architecture

### Current State
```
Ad-hoc validation scattered:
├─ job-validator.mjs (string checks)
├─ unrdf-validator.mjs (export checking)
└─ Various inline validations
```

### Target State
```
Declarative SHACL-based validation:
├─ useValidation() Composable
├─ Shape Registry & Manager
├─ Violation Reporter
├─ Repair Suggester
├─ Quality Metrics Collector
└─ Shape Evolution Tooling
```

## Specific Validations Defined

1. **RDF Store Integrity** - No orphaned quads, referential integrity
2. **Hook Result Shape** - Status, duration, timestamps, artifacts
3. **Pack Metadata** - Name, version, license, authors, dependencies
4. **Workflow DAG** - Acyclic structure, valid entry/exit points
5. **Code Ownership** - Owner consistency, valid persons
6. **Policy Rules** - Condition validity, action validity
7. **Performance Assertions** - Metric thresholds, unit constraints
8. **Security Constraints** - Access control, encryption, audit requirements

## Error Handling & Recovery

### Clear Error Messages
Violations formatted as:
- **Element:** What's being validated (e.g., "commit:abc123")
- **Property:** Which field failed (e.g., "author")
- **Issue:** Human-readable constraint description
- **Received:** Actual value provided
- **Expected:** What was required
- **Severity:** error | warning | info

### Repair Suggestions
Automatic suggestions for:
- Missing required properties
- Wrong datatype conversions
- Cardinality violations
- Constraint violations
- Invalid references

### Automatic Repair (Safe Cases)
Auto-fix for:
- Default values
- String trimming
- Case normalization
- Safe type conversion
- Safe ID generation

### Validation Reports
Structured reports with:
- Summary statistics
- Detailed violations
- Repair suggestions
- Pattern identification
- Recommendations

## Risk Analysis

### Technical Risks
- **Validation Performance:** Mitigated through caching and benchmarking
- **Shape Complexity:** Addressed via modularization and composition library
- **Breaking Changes:** Pin versions, create adapter layer
- **Data Corruption:** Validate before commit, maintain backups

### Adoption Risks
- **Shape Language Complexity:** Comprehensive examples and tooling
- **Validation Fatigue:** Auto-repair obvious issues, severity levels
- **Over-Validation:** Allow opt-out per component, calibrate strictness

## File Structure

### New Files Created
```
src/
├── composables/validation.mjs
├── validation/
│   ├── shape-registry.mjs
│   ├── violation-reporter.mjs
│   ├── repair-suggester.mjs
│   ├── quality-gate.mjs
│   └── ...other validators
├── rdf/shapes/
│   ├── git-ontology.shacl.ttl
│   ├── code-ontology.shacl.ttl
│   ├── workflow-ontology.shacl.ttl
│   ├── pack-ontology.shacl.ttl
│   └── quality-ontology.shacl.ttl

tests/validation/
├── shapes.test.mjs
├── integration.test.mjs
├── performance.test.mjs
└── repairs.test.mjs

docs/validation/
├── guide.md
├── shape-examples.md
├── error-messages.md
└── shape-evolution.md
```

## Production Readiness Criteria

- [ ] >95% validation coverage achieved
- [ ] <0.1% false positive rate
- [ ] <5% performance overhead
- [ ] All error messages tested with users
- [ ] Repair suggestions helpful (user survey)
- [ ] Complete documentation
- [ ] Team training complete
- [ ] Monitoring configured
- [ ] Rollback plan documented

## Recommended Next Steps

1. **Schedule Architecture Review** - Review plan with tech leads
2. **Phase 1 Kickoff** - Begin core SHACL integration
3. **Team Training** - Introduction to SHACL shapes syntax
4. **POC Development** - Build prototype with Git ontology shapes
5. **Performance Baseline** - Establish validation overhead metrics
6. **Iterative Rollout** - Phase by phase integration

## Conclusion

The @unrdf/validation integration will transform GitVan's validation approach from scattered ad-hoc checks to declarative, composable, SHACL-based validation. This enables:

- **Greater Correctness** through schema enforcement
- **Better UX** with clear error messages and repair suggestions
- **Improved Maintainability** with centralized, reusable shapes
- **Future Extensibility** for advanced validation patterns

**Timeline:** 5-6 weeks with 1-2 engineers
**Target Release:** GitVan v4.1.0

---

**Generated:** 2026-01-10
**Status:** Ready for Architecture Review
**Total Document Length:** 2,847 lines (60+ pages equivalent)
