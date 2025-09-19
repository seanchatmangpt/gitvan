# Git Hooks as Signals for Knowledge Hook System - Architecture Analysis

**Date:** January 18, 2025  
**Status:** ✅ **ARCHITECTURE CLARIFIED**  
**Key Insight:** Git hooks provide signals that trigger Knowledge Hook SPARQL evaluation

## Two-Layer Architecture

You're absolutely correct! GitVan uses a sophisticated **two-layer architecture** where:

1. **Git Hooks** = **Signals** (when to evaluate)
2. **Knowledge Hooks** = **Intelligence** (what to evaluate with SPARQL)

## Architecture Flow

```
Git Operation → Git Hook Signal → Knowledge Hook Evaluation → SPARQL Predicate → Workflow Execution
```

### Layer 1: Git Hooks (Signals)
```javascript
// GitVan Job System - Provides the SIGNAL
export default defineJob({
  meta: {
    name: "knowledge-hooks-git-integration",
    desc: "Integrates Knowledge Hooks with Git lifecycle events",
  },
  
  // Git hooks provide the SIGNALS
  hooks: ["post-commit", "post-merge", "post-checkout"],
  
  async run(context) {
    // Extract Git context (commit SHA, branch, changed files)
    const gitContext = await this.getGitContext(context);
    
    // Initialize Knowledge Hook Orchestrator
    const orchestrator = new HookOrchestrator({
      graphDir: "./hooks",
      context: gitvanContext,
    });
    
    // Evaluate knowledge hooks with Git context
    const evaluationResult = await orchestrator.evaluate({
      gitContext: gitContext,
      verbose: true,
    });
  }
});
```

### Layer 2: Knowledge Hooks (Intelligence)
```turtle
# Turtle Knowledge Hook - Provides the INTELLIGENCE
ex:code-quality-gatekeeper-hook rdf:type gh:Hook ;
    gv:title "Code Quality Gatekeeper" ;
    gh:hasPredicate ex:code-quality-predicate ;
    gh:orderedPipelines ex:code-quality-pipeline .

# SPARQL Predicate - The INTELLIGENT SENSOR
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

## Complete Integration Flow

### 1. Git Operation Occurs
```bash
git commit -m "Add new feature"
```

### 2. Git Hook Signal Fired
```javascript
// GitVan job system detects post-commit
hooks: ["post-commit"]  // Signal: "Something was committed"
```

### 3. Git Context Extracted
```javascript
const gitContext = {
  event: "post-commit",
  commitSha: "abc123...",
  branch: "main",
  changedFiles: ["src/feature.js", "tests/feature.test.js"],
  commitMessage: "Add new feature"
};
```

### 4. Knowledge Hook Evaluation Triggered
```javascript
// HookOrchestrator evaluates ALL knowledge hooks
const evaluationResult = await orchestrator.evaluate({
  gitContext: gitContext,
  verbose: true,
});
```

### 5. SPARQL Predicates Evaluated
```turtle
# Each knowledge hook's SPARQL predicate is evaluated
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

### 6. Workflows Executed (if predicates return true)
```turtle
# If SPARQL predicate returns true, execute workflow
ex:code-quality-pipeline rdf:type op:Pipeline ;
    op:steps ex:analyze-code-quality, ex:notify-team, ex:update-dashboard .
```

## Key Benefits of This Architecture

### 1. **Separation of Concerns**
- **Git Hooks**: Handle timing and context extraction
- **Knowledge Hooks**: Handle intelligent decision-making with SPARQL

### 2. **Flexible Triggering**
- Git hooks provide **when** (timing)
- SPARQL predicates provide **what** (conditions)
- Multiple knowledge hooks can evaluate on same Git event

### 3. **Context-Aware Intelligence**
- Git context (commit SHA, branch, files) available to SPARQL queries
- Knowledge graph can be updated with Git context
- Previous vs current graph state comparison possible

### 4. **Scalable Architecture**
- Add new Git hooks for new signals
- Add new knowledge hooks for new intelligence
- Independent scaling of signal detection vs intelligence evaluation

## JTBD Hooks Integration

For the 25 JTBD hooks, this means:

### Git Hook Signals (Layer 1)
```javascript
// Each JTBD category can have different Git hook signals
export default defineJob({
  hooks: [
    "pre-commit",    // Code quality signals
    "pre-push",      // Security validation signals
    "post-commit",   // Analysis signals
    "post-merge",   // Integration signals
  ],
  async run(context) {
    // Trigger knowledge hook evaluation
    await orchestrator.evaluate({ gitContext });
  }
});
```

### Knowledge Hook Intelligence (Layer 2)
```turtle
# Each JTBD hook defines its SPARQL intelligence
ex:code-quality-gatekeeper-hook rdf:type gh:Hook ;
    gh:hasPredicate ex:code-quality-predicate .

ex:dependency-vulnerability-scanner-hook rdf:type gh:Hook ;
    gh:hasPredicate ex:dependency-vulnerability-predicate .

ex:test-coverage-enforcer-hook rdf:type gh:Hook ;
    gh:hasPredicate ex:test-coverage-predicate .
```

## Implementation Strategy

### 1. **Git Hook Integration Jobs**
Create GitVan jobs that trigger on specific Git events:
- `pre-commit-jtbd-signals.mjs` - Triggers before commits
- `post-commit-jtbd-signals.mjs` - Triggers after commits
- `pre-push-jtbd-signals.mjs` - Triggers before pushes

### 2. **Knowledge Hook Definitions**
Create Turtle files for each JTBD hook:
- `code-quality-gatekeeper.ttl`
- `dependency-vulnerability-scanner.ttl`
- `test-coverage-enforcer.ttl`
- etc.

### 3. **SPARQL Predicate Types**
Use appropriate predicate types for each JTBD:
- **ASK Predicate**: Binary conditions (quality issues detected?)
- **SELECTThreshold**: Numerical thresholds (coverage < 80%?)
- **ResultDelta**: Change detection (version changed?)
- **SHACLAllConform**: Data quality (compliance met?)

## Example: Complete Flow

### Git Operation
```bash
git commit -m "Update dependencies"
```

### Git Hook Signal
```javascript
// knowledge-hooks-git-integration.mjs
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

The GitVan architecture brilliantly separates **signal detection** (Git hooks) from **intelligent evaluation** (Knowledge hooks with SPARQL). This allows:

- ✅ **Git hooks** to provide timing and context signals
- ✅ **Knowledge hooks** to provide SPARQL-based intelligence
- ✅ **Flexible combination** of signals and intelligence
- ✅ **Scalable architecture** for complex automation scenarios

The JTBD hooks should leverage this two-layer architecture:
1. **Git hook signals** for when to evaluate
2. **SPARQL predicates** for what to evaluate
3. **Workflow pipelines** for what to execute

This creates a powerful, semantic-driven automation system that combines Git's event model with knowledge graph intelligence.

