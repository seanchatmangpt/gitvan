# Git Hooks as Signals for Knowledge Hook System - Complete Architecture

**Date:** January 18, 2025  
**Status:** ✅ **ARCHITECTURE IMPLEMENTED**  
**Key Insight:** Git hooks provide signals that trigger Knowledge Hook SPARQL evaluation

## Two-Layer Architecture Summary

You're absolutely correct! GitVan uses a sophisticated **two-layer architecture**:

### Layer 1: Git Hooks (Signals)
- **Purpose**: Provide timing and context signals
- **Format**: JavaScript GitVan jobs with `defineJob()`
- **Function**: Detect Git events and extract context
- **Example**: `jtbd-git-signals-integration.mjs`

### Layer 2: Knowledge Hooks (Intelligence)
- **Purpose**: Provide intelligent decision-making with SPARQL
- **Format**: Turtle (.ttl) files with SPARQL predicates
- **Function**: Evaluate conditions against knowledge graph
- **Example**: `code-quality-gatekeeper.ttl`

## Complete Flow Example

### 1. Git Operation
```bash
git commit -m "Add new feature"
```

### 2. Git Hook Signal (Layer 1)
```javascript
// jtbd-git-signals-integration.mjs
export default defineJob({
  hooks: ["post-commit"],  // Signal: "Something was committed"
  
  async run(context) {
    // Extract Git context
    const gitContext = await this.extractGitContext(context);
    
    // Trigger knowledge hook evaluation
    const evaluationResult = await orchestrator.evaluate({
      gitContext: gitContext,
      jtbdCategories: ["core-development-lifecycle"],
    });
  }
});
```

### 3. Knowledge Hook Intelligence (Layer 2)
```turtle
# code-quality-gatekeeper.ttl
ex:code-quality-gatekeeper-hook rdf:type gh:Hook ;
    gv:title "Code Quality Gatekeeper" ;
    gh:hasPredicate ex:code-quality-predicate .

# SPARQL Predicate - Intelligent sensor
ex:code-quality-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            ?file rdf:type gv:SourceFile .
            ?file gv:hasQualityIssue ?issue .
            ?issue gv:severity ?severity .
            FILTER(?severity IN ("high", "critical"))
        }
    """ .
```

### 4. Workflow Execution
```turtle
# If SPARQL returns true, execute workflow
ex:code-quality-pipeline rdf:type op:Pipeline ;
    op:steps ex:analyze-code-quality, ex:notify-team, ex:update-dashboard .
```

## JTBD Hooks Integration Strategy

### Git Hook Signals by Category

| Git Signal | JTBD Categories | Purpose |
|------------|----------------|---------|
| `pre-commit` | Core Development Lifecycle | Code quality validation |
| `post-commit` | Core Development, Monitoring | Code analysis |
| `pre-push` | Core Development, Security | Security validation |
| `post-merge` | Infrastructure, Monitoring | Integration validation |
| `post-checkout` | Infrastructure | Environment validation |
| `pre-rebase` | Core Development, Security | History validation |
| `post-rewrite` | Core Development, Monitoring | History analysis |

### SPARQL Predicate Types for JTBD

1. **ASK Predicate** - Binary conditions
   ```turtle
   ex:predicate rdf:type gh:ASKPredicate ;
       gh:queryText "ASK WHERE { ... }" .
   ```

2. **SELECTThreshold Predicate** - Numerical thresholds
   ```turtle
   ex:predicate rdf:type gh:SELECTThreshold ;
       gh:queryText "SELECT (COUNT(?x) AS ?count) WHERE { ... }" ;
       gh:threshold 80 ;
       gh:operator "<" .
   ```

3. **ResultDelta Predicate** - Change detection
   ```turtle
   ex:predicate rdf:type gh:ResultDelta ;
       gh:queryText "SELECT ?x ?y WHERE { ... }" .
   ```

4. **SHACLAllConform Predicate** - Data quality
   ```turtle
   ex:predicate rdf:type gh:SHACLAllConform ;
       gh:shapeFile "./shapes/quality-shape.ttl" .
   ```

## Implementation Status

### ✅ Completed
- [x] Architecture analysis and documentation
- [x] Git signals integration job (`jtbd-git-signals-integration.mjs`)
- [x] Sample Turtle knowledge hooks (3 examples)
- [x] Signal-to-category mapping

### 🔄 Next Steps
- [ ] Convert all 25 JTBD hooks to Turtle format
- [ ] Create knowledge graph schemas for JTBD data
- [ ] Test SPARQL predicates against knowledge graph
- [ ] Integrate with HookOrchestrator
- [ ] Create comprehensive test suite

## Key Benefits

### 1. **Separation of Concerns**
- Git hooks handle **when** (timing)
- Knowledge hooks handle **what** (intelligence)

### 2. **Flexible Architecture**
- Multiple knowledge hooks can evaluate on same Git event
- Different Git signals can trigger different JTBD categories
- SPARQL predicates provide sophisticated condition evaluation

### 3. **Context-Aware Intelligence**
- Git context (commit SHA, branch, files) available to SPARQL
- Knowledge graph can be updated with Git context
- Previous vs current graph state comparison

### 4. **Scalable Design**
- Add new Git hooks for new signals
- Add new knowledge hooks for new intelligence
- Independent scaling of signal detection vs intelligence evaluation

## Example: Complete JTBD Flow

### Git Operation
```bash
git commit -m "Update dependencies"
```

### Git Hook Signal
```javascript
// jtbd-git-signals-integration.mjs
hooks: ["post-commit"]  // Signal: "Dependencies were updated"
```

### Knowledge Hook Evaluation
```turtle
# dependency-vulnerability-scanner.ttl
ex:dependency-vulnerability-predicate rdf:type gh:SELECTThreshold ;
    gh:queryText """
        SELECT (COUNT(?vulnerability) AS ?vulnCount) WHERE {
            ?dependency rdf:type gv:Dependency .
            ?dependency gv:hasVulnerability ?vulnerability .
            ?vulnerability gv:severity ?severity .
            FILTER(?severity IN ("high", "critical"))
        }
    """ ;
    gh:threshold 0 ;
    gh:operator ">" .
```

### Workflow Execution
```turtle
# If vulnerability count > 0, execute security workflow
ex:dependency-vulnerability-pipeline rdf:type op:Pipeline ;
    op:steps ex:scan-dependencies, ex:notify-security-team, ex:update-security-dashboard .
```

## Conclusion

The GitVan architecture brilliantly combines:

- ✅ **Git hooks** as **signals** for timing and context
- ✅ **Knowledge hooks** as **intelligence** with SPARQL predicates
- ✅ **Flexible integration** between signals and intelligence
- ✅ **Scalable architecture** for complex automation scenarios

This two-layer approach enables sophisticated, semantic-driven automation that leverages both Git's event model and knowledge graph intelligence. The JTBD hooks can now be properly implemented using this architecture, with Git hooks providing the signals and Turtle knowledge hooks providing the SPARQL-based intelligence.

