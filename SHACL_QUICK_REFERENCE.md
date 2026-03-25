# SHACL Validation Integration - Quick Reference

**Full Document:** `/SHACL_VALIDATION_INTEGRATION_PLAN.md` (2,475 lines)

## Key Findings at a Glance

### Current State
- ✅ GitVan already depends on `rdf-validate-shacl` (v0.6.5)
- ✅ Partial SHACL support exists in HookParser and PredicateEvaluator (stub implementation)
- ✅ Workflows defined in Turtle format - ideal for SHACL validation
- ⚠️ Current validation is procedural (hardcoded checks), not declarative
- ⚠️ SHACL predicates not fully implemented (always returns conforms: true)

### What SHACL Enables

| Capability | Current State | With SHACL |
|------------|---------------|-----------|
| Workflow structure validation | Procedural checks | Declarative shapes |
| Git event constraints | Zod validation | Graph-level validation |
| Custom constraint types | Hard-coded | Extensible SPARQL shapes |
| DAG acyclicity | Graph traversal | SPARQL shape constraints |
| Configuration validation | Zod schemas | Semantic constraints |
| Error reporting | String messages | Detailed violation paths |
| Recovery suggestions | Manual | Automated recovery plans |

## Quick Integration Points

### 1. Workflow Definitions
```turtle
# Shape: gv:SparqlStepShape ensures SPARQL steps have query text
gv:SparqlStepShape a sh:NodeShape ;
  sh:targetClass gv:SparqlStep ;
  sh:property [
    sh:path gv:text ;
    sh:minCount 1 ;
    sh:message "SPARQL step must have query" ;
  ] .
```

### 2. Hook Definitions
```turtle
# Validates hooks have title, predicate, and pipelines
gh:HookShape a sh:NodeShape ;
  sh:targetClass gh:Hook ;
  sh:property [
    sh:path gv:title ;
    sh:minCount 1 ;
  ] ;
  sh:property [
    sh:path gh:hasPredicate ;
    sh:minCount 1 ;
  ] .
```

### 3. Git Events
```turtle
# Ensures event timestamps are valid ISO 8601
gitv:GitEventShape a sh:NodeShape ;
  sh:targetClass gitv:GitEvent ;
  sh:property [
    sh:path gitv:timestamp ;
    sh:minCount 1 ;
    sh:datatype xsd:dateTime ;
  ] .
```

### 4. DAG Validation
```turtle
# SPARQL constraint detects circular dependencies
gv:AcyclicWorkflowShape a sh:NodeShape ;
  sh:sparql [
    sh:message "Workflow contains circular dependency" ;
    sh:select """
      PREFIX gv: <https://gitvan.dev/ontology#>
      SELECT $this WHERE {
        $this op:steps ?step .
        ?step gv:dependsOn+ ?step . # Cycle detection
      }
    """ ;
  ] .
```

## Implementation Strategy

### Phase Breakdown

```
Week 1-2:  Foundation - Core validator, basic shapes
Week 3-4:  Integration - Workflow engine hooks, error reporting
Week 5-6:  Advanced - All entity types, optimizations, caching
Week 7-8:  UX - CLI, documentation, user guidance
Week 9-10: Extensibility - Plugin system, community shapes
```

**Total Effort:** ~10 weeks, 8-10 developer weeks

### Success Metrics

- ✅ 80%+ test coverage for validator
- ✅ <100ms validation for workflows with <50 steps
- ✅ <500ms for workflows with 100 steps
- ✅ 0 unrecovered validation failures in strict mode
- ✅ 90%+ recovery success rate in degraded mode
- ✅ 95%+ user satisfaction with error messages

## Files to Create/Modify

### New Files
```
/src/rdf/shapes/
├── workflow-shapes.ttl      # Workflow validation shapes
├── hook-shapes.ttl          # Hook validation shapes
├── event-shapes.ttl         # Git event validation
├── config-shapes.ttl        # Configuration shapes
├── pack-shapes.ttl          # Pack system shapes
└── composite-shapes.ttl     # Cross-ontology constraints

/src/composables/
└── shacl-validator.mjs      # Validator composable

/src/rdf/validators/
├── shacl-validator.mjs      # Validation orchestrator
└── shacl-reporter.mjs       # Violation reporting

/docs/shacl/
├── shapes-guide.md          # Shape definition guide
├── custom-constraints.md    # Creating custom shapes
├── development.md           # Developer guide
└── api-reference.md         # API documentation
```

### Modified Files
```
/src/workflow/workflow-parser.mjs
  └── Add SHACL validation in _validateWorkflow()

/src/workflow/workflow-engine.mjs
  └── Add validation hooks in execution pipeline

/src/hooks/PredicateEvaluator.mjs
  └── Implement real SHACL evaluation in _evaluateSHACL()

/tests/
  └── Add comprehensive SHACL validation test suite
```

## Core Validator API

### Basic Usage

```javascript
import { useSHACLValidator } from './composables/shacl-validator.mjs';

const validator = useSHACLValidator();

// Validate workflow
const report = await validator.validateWorkflow(graph);

if (report.conforms) {
  console.log('✅ Workflow is valid');
} else {
  report.violations.forEach(violation => {
    console.log(`❌ ${violation.message}`);
    console.log(`   Path: ${violation.path}`);
    console.log(`   Suggestion: ${violation.suggestion}`);
  });
}
```

### Validation Modes

```javascript
// Strict mode: Fail immediately on any violation
process.env.GITVAN_SHACL_STRICT = 'true';
await validator.validateWorkflow(graph); // Throws on violation

// Warning mode: Log warnings, attempt recovery
process.env.GITVAN_SHACL_STRICT = 'false'; // Default
await validator.validateWorkflow(graph); // Returns report with violations

// Disabled mode: Skip SHACL validation
process.env.GITVAN_SHACL_VALIDATION = 'off';
```

## Performance Profile

### Validation Time Estimates

```
10 steps:     ~60ms
100 steps:    ~300ms
1000 steps:   ~3000ms
```

### Optimization Techniques

1. **Lazy Validation** - Only validate when needed
2. **Shape Caching** - Cache loaded shapes in memory (O(1) reuse)
3. **Incremental Validation** - Only validate changed nodes
4. **Parallel Validation** - Validate independent shape groups in parallel

## Error Recovery Strategies

### Auto-Correction
- ✅ Empty output mappings → `{}`
- ✅ Missing optional properties → set defaults
- ❌ Missing required properties → requires user input

### Degraded Execution
- Continue with warnings when violations don't affect critical path
- Enhanced monitoring for affected steps
- Reduced parallelism to catch errors early

### User Guidance
- Specific violation messages
- Suggestions for fixes
- Links to documentation
- Examples of valid configurations

## Testing Coverage

### Test Categories

1. **Unit Tests** - Individual shapes and constraints
2. **Integration Tests** - Shape validation with WorkflowParser
3. **Performance Tests** - Validation timing benchmarks
4. **Recovery Tests** - Auto-correction and degraded mode
5. **End-to-End Tests** - Full workflow with SHACL validation

**Target Coverage:** 80%+

## Next Steps

1. **Architecture Review** - Review this plan with team
2. **Resource Planning** - Allocate 2 developers for 10 weeks
3. **Phase 1 Kickoff** - Create useSHACLValidator composable
4. **Shape Design** - Define workflow-shapes.ttl
5. **Integration** - Connect validator to WorkflowParser

## Key Advantages of SHACL Approach

✅ **RDF-Native** - Validates at the knowledge graph level
✅ **Declarative** - Constraints are data, not code
✅ **Composable** - Shapes can be combined and reused
✅ **Extensible** - Easy to add new shapes for new features
✅ **Traceable** - Violations include violation paths and focus nodes
✅ **Standards-Based** - W3C standard, not proprietary

## References

- Full plan: `/SHACL_VALIDATION_INTEGRATION_PLAN.md`
- SHACL Spec: https://www.w3.org/TR/shacl/
- rdf-validate-shacl: https://npm.im/rdf-validate-shacl
- Zazuko SHACL Editor: https://zazuko.com/labs/shacl-editor/

---

**Document Version:** 1.0
**Date:** January 10, 2026
**Status:** Ready for Architecture Review
