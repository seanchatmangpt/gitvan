# GitVan Migration Guide: Git Hooks to Knowledge Hooks

**Date:** January 18, 2025  
**Status:** ✅ **MIGRATION COMPLETE**  
**Objective:** Transition from traditional Git hooks to Knowledge Hook architecture

## Executive Summary

This guide documents the complete migration of GitVan from traditional Git hooks to a sophisticated Knowledge Hook system where Git hooks serve only as signals for SPARQL-driven automation.

## Architecture Transformation

### Before: Traditional Git Hooks
```javascript
// OLD: Direct Git hook implementation
this.hooks.hook("pre-commit", async (context) => {
  return await this.processStagedChanges(context);
});
```

### After: Knowledge Hook System
```javascript
// NEW: Git hooks as signals for Knowledge Hook evaluation
async processGitSignal(signalType, context) {
  const orchestrator = new HookOrchestrator({
    graphDir: "./hooks",
    context: { cwd: context.cwd },
  });
  
  const evaluationResult = await orchestrator.evaluate({
    gitSignal: signalType,
    gitContext: gitContext,
  });
}
```

## Two-Layer Architecture

### Layer 1: Git Hooks (Signals)
- **Purpose:** Provide signals for when to evaluate
- **Implementation:** Simple shell scripts that trigger Knowledge Hook evaluation
- **Location:** `.git/hooks/` directory

### Layer 2: Knowledge Hooks (Intelligence)
- **Purpose:** Provide intelligence for what to evaluate with SPARQL
- **Implementation:** Turtle (.ttl) files with SPARQL predicates
- **Location:** `hooks/` directory

## Migration Steps Completed

### ✅ Step 1: Refactor Core Hookable System
**File:** `src/core/hookable.mjs`

**Changes:**
- Removed direct Git hook registration
- Added Knowledge Hook Orchestrator integration
- Implemented unified Git signal processing
- Added change caching for Knowledge Hook context

**Before:**
```javascript
registerCoreHooks() {
  this.hooks.hook("pre-commit", async (context) => {
    return await this.processStagedChanges(context);
  });
}
```

**After:**
```javascript
registerGitSignalHooks() {
  this.hooks.hook("pre-commit", async (context) => {
    return await this.processGitSignal("pre-commit", context);
  });
}
```

### ✅ Step 2: Update Git Hooks Setup
**File:** `bin/git-hooks-setup.mjs`

**Changes:**
- Updated hook creation to reflect signal nature
- Modified comments to emphasize Knowledge Hook integration
- Updated success messages to mention Knowledge Hook system

**Before:**
```bash
# GitVan Pre-Commit Hook - Surgical Precision
# Only processes staged changes, not entire repository
```

**After:**
```bash
# GitVan Pre-Commit Signal Hook - Knowledge Hook Trigger
# Signals Knowledge Hook system to evaluate code quality
```

### ✅ Step 3: Standardize Job Definitions
**Files:** All job files in `jobs/` directory

**Changes:**
- Added Knowledge Hook Orchestrator integration
- Updated job descriptions to mention Knowledge Hook integration
- Added Knowledge Hook evaluation results to job outputs
- Maintained backward compatibility with legacy routing

**Example (unrouting.route.mjs):**
```javascript
// Initialize Knowledge Hook Orchestrator
const orchestrator = new HookOrchestrator({
  graphDir: "./hooks",
  context: { cwd: process.cwd() },
  logger: console,
});

// Evaluate Knowledge Hooks with file change context
const evaluationResult = await orchestrator.evaluate({
  gitSignal: hookName,
  gitContext: gitContext,
  verbose: true,
});
```

### ✅ Step 4: Create Knowledge Hook Registry
**File:** `src/hooks/KnowledgeHookRegistry.mjs`

**Features:**
- Central registry for all Knowledge Hooks
- Automatic discovery of .ttl files
- Categorization by domain and category
- Statistics and reporting
- Integration with HookOrchestrator

**Usage:**
```javascript
import { knowledgeHookRegistry } from "./KnowledgeHookRegistry.mjs";

// Get all hooks
const allHooks = knowledgeHookRegistry.getAllHooks();

// Get hooks by category
const developerHooks = knowledgeHookRegistry.getHooksByCategory('developer-workflow');

// Evaluate all hooks
const result = await knowledgeHookRegistry.evaluateAll();
```

### ✅ Step 5: Implement Scrum@Scale Detection
**Files:** 
- `graph/scrum-at-scale.ttl` - Core Scrum@Scale ontology and Knowledge Hooks
- `graph/scrum-at-scale-example-data.ttl` - Example data for testing

**Features:**
- Scrum of Scrums (SoS) meeting preparation
- Cross-team dependency risk detection
- Sprint cadence misalignment detection
- Impediment aging escalation
- SPARQL-driven intelligence

## Knowledge Hook Categories

### 1. Developer Workflow Hooks
**Location:** `hooks/developer-workflow/`
**Purpose:** Developer-centric automation using Scrum at Scale terminology

**Hooks:**
- `start-of-day.ttl` - Start of day detection and reporting
- `end-of-day.ttl` - End of day activities and sprint reflection
- `file-saving.ttl` - File saving events with code quality checks
- `definition-of-done.ttl` - Definition of Done validation
- `daily-scrum.ttl` - Daily scrum preparation
- `sprint-planning.ttl` - Sprint planning activation

### 2. JTBD (Jobs to be Done) Hooks
**Location:** `hooks/jtbd-hooks/`
**Purpose:** Core development lifecycle automation

**Hooks:**
- `code-quality-gatekeeper.ttl` - Code quality validation
- `dependency-vulnerability-scanner.ttl` - Security vulnerability scanning
- `test-coverage-enforcer.ttl` - Test coverage enforcement

### 3. Scrum@Scale Hooks
**Location:** `graph/scrum-at-scale.ttl`
**Purpose:** Enterprise-scale Scrum automation

**Hooks:**
- SoS preparation (15 minutes before meeting)
- Cross-team dependency risk detection
- Sprint cadence misalignment detection
- Impediment aging escalation (>24h SoS, >48h EAT)

## SPARQL Predicate Types

### 1. ASK Predicate
**Purpose:** Boolean evaluation (true/false)
**Use Case:** "Is there a critical code quality issue?"

```turtle
ex:predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?file rdf:type gv:CodeFile .
            ?file gv:hasQualityIssue true .
            ?file gv:severity "critical" .
        }
    """ .
```

### 2. SELECT Threshold Predicate
**Purpose:** Numeric threshold evaluation
**Use Case:** "Are there more than 5 cross-team dependencies?"

```turtle
ex:predicate rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX scr: <https://gitvan.dev/scrum#>
        SELECT (COUNT(*) AS ?risk) WHERE {
            ?b a scr:BacklogItem ; scr:team ?t1 ; scr:dependsOn ?d .
            ?d a scr:BacklogItem ; scr:team ?t2 .
            FILTER(?t1 != ?t2)
        }
    """ ;
    gh:threshold "5"^^xsd:integer ;
    gh:operator ">" .
```

### 3. Result Delta Predicate
**Purpose:** Change detection between states
**Use Case:** "Has the project version changed since last commit?"

```turtle
ex:predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?version WHERE {
            ?project gv:version ?version .
        }
    """ .
```

### 4. SHACL All Conform Predicate
**Purpose:** Data validation against shapes
**Use Case:** "Do all backlog items conform to the required shape?"

```turtle
ex:predicate rdf:type gh:SHACLAllConform ;
    gh:shapeFile "shapes/backlog-item.shacl.ttl" ;
    gh:dataQuery """
        PREFIX scr: <https://gitvan.dev/scrum#>
        SELECT ?item WHERE {
            ?item a scr:BacklogItem .
        }
    """ .
```

## Workflow Pipeline Types

### 1. Template Step
**Purpose:** Generate files from templates
```turtle
ex:step rdf:type gv:TemplateStep ;
    gv:text "## Report\nGenerated: {{ 'now' | date('YYYY-MM-DD') }}" ;
    gv:filePath "./reports/report-{{ 'now' | date('YYYYMMDD') }}.md" .
```

### 2. SPARQL to Template Step
**Purpose:** Generate files from SPARQL query results
```turtle
ex:step rdf:type gv:SparqlToTemplateStep ;
    gv:text """
        PREFIX scr: <https://gitvan.dev/scrum#>
        SELECT ?team (COUNT(?item) AS ?count) WHERE {
            ?item a scr:BacklogItem ; scr:team ?team .
        } GROUP BY ?team
    """ ;
    gv:template """
        ## Team Summary
        {% for row in results -%}
        - {{ row.team.value }}: {{ row.count.value }} items
        {%- endfor %}
    """ ;
    gv:filePath "./reports/team-summary.md" .
```

### 3. Shell Step
**Purpose:** Execute shell commands
```turtle
ex:step rdf:type gv:ShellStep ;
    gv:command "npm run lint" ;
    gv:description "Run linter" .
```

### 4. HTTP Step
**Purpose:** Make HTTP requests
```turtle
ex:step rdf:type gv:HttpStep ;
    gv:httpUrl "https://api.example.com/webhook" ;
    gv:httpMethod "POST" ;
    gv:headers '{"Content-Type": "application/json"}' ;
    gv:body '{"status": "completed"}' .
```

## Integration Patterns

### 1. Git Signal Integration
```javascript
// Git hook triggers Knowledge Hook evaluation
async processGitSignal(signalType, context) {
  const orchestrator = new HookOrchestrator({
    graphDir: "./hooks",
    context: { cwd: context.cwd },
  });
  
  const evaluationResult = await orchestrator.evaluate({
    gitSignal: signalType,
    gitContext: gitContext,
  });
  
  return {
    processed: gitContext.changedFiles.length,
    knowledgeHooksTriggered: evaluationResult.hooksTriggered,
    evaluationResult: evaluationResult,
  };
}
```

### 2. Developer Workflow Integration
```javascript
// Developer workflow Knowledge Hooks
const orchestrator = new HookOrchestrator({
  graphDir: "./hooks/developer-workflow",
  context: gitvanContext,
});

const evaluationResult = await orchestrator.evaluate({
  developerContext: developerContext,
  developerSignal: context.hookName,
});
```

### 3. Scrum@Scale Integration
```javascript
// Scrum@Scale Knowledge Hooks
const orchestrator = new HookOrchestrator({
  graphDir: "./graph",
  context: gitvanContext,
});

const evaluationResult = await orchestrator.evaluate({
  scrumContext: scrumContext,
  scrumSignal: context.hookName,
});
```

## Benefits Achieved

### 1. Intelligence Layer
- **Before:** Simple file change detection
- **After:** SPARQL-driven semantic analysis

### 2. Scalability
- **Before:** Hard-coded logic in JavaScript
- **After:** Declarative Turtle definitions

### 3. Maintainability
- **Before:** Complex JavaScript hook implementations
- **After:** Simple Turtle files with clear semantics

### 4. Extensibility
- **Before:** Code changes required for new automation
- **After:** New Turtle files for new automation

### 5. Developer Experience
- **Before:** Git-centric workflow
- **After:** Developer-centric workflow with Scrum at Scale

## Testing and Validation

### 1. Knowledge Hook Tests
**File:** `tests/developer-workflow-knowledge-hooks.test.mjs`

**Coverage:**
- Turtle syntax validation
- SPARQL predicate validation
- Scrum at Scale terminology
- Developer-centric terminology
- Integration testing

### 2. Integration Tests
**File:** `tests/knowledge-hooks-git-integration.test.mjs`

**Coverage:**
- Git signal processing
- Knowledge Hook evaluation
- Workflow execution
- Error handling

### 3. Demo Scripts
**Files:**
- `examples/start-of-day-detection-demo.mjs`
- `examples/start-of-day-simple-demo.mjs`

**Purpose:** Demonstrate Knowledge Hook functionality

## Migration Checklist

### ✅ Core System Migration
- [x] Refactor `src/core/hookable.mjs`
- [x] Update `bin/git-hooks-setup.mjs`
- [x] Create `src/hooks/KnowledgeHookRegistry.mjs`

### ✅ Job Definition Migration
- [x] Update `jobs/unrouting.route.mjs`
- [x] Update `jobs/graph-report.mjs`
- [x] Update `jobs/marketplace.scanner.mjs`
- [x] Update `jobs/marketplace.index-update.mjs`

### ✅ Knowledge Hook Implementation
- [x] Create developer workflow hooks
- [x] Create JTBD hooks
- [x] Create Scrum@Scale hooks
- [x] Create example data

### ✅ Testing and Validation
- [x] Create comprehensive test suite
- [x] Create demo scripts
- [x] Validate integration

### ✅ Documentation
- [x] Create migration guide
- [x] Document architecture
- [x] Document SPARQL predicates
- [x] Document workflow pipelines

## Next Steps

### 1. CLI Integration
Update CLI commands to integrate with Knowledge Hook system:
- `gitvan hooks list` - List all Knowledge Hooks
- `gitvan hooks evaluate` - Evaluate Knowledge Hooks
- `gitvan hooks test` - Test Knowledge Hook functionality

### 2. Performance Optimization
- Optimize SPARQL query performance
- Implement Knowledge Hook caching
- Add parallel evaluation support

### 3. Advanced Features
- Add more SPARQL predicate types
- Implement Knowledge Hook composition
- Add Knowledge Hook debugging tools

## Conclusion

The migration from traditional Git hooks to Knowledge Hooks represents a fundamental architectural improvement that provides:

1. **Semantic Intelligence:** SPARQL-driven automation instead of simple file change detection
2. **Developer-Centric Workflow:** Scrum at Scale terminology and developer-focused automation
3. **Scalable Architecture:** Declarative Turtle definitions instead of hard-coded JavaScript
4. **Enterprise Integration:** Scrum@Scale detection and cross-team dependency management
5. **Maintainable Codebase:** Clear separation between signals (Git hooks) and intelligence (Knowledge Hooks)

The two-layer architecture ensures that Git hooks serve only as signals while Knowledge Hooks provide the intelligent evaluation and automation capabilities that make GitVan a powerful development automation platform.
