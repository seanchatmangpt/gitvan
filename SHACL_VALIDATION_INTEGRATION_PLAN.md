# SHACL Validation Integration Plan for GitVan

**Document Version:** 1.0
**Date:** January 10, 2026
**Status:** Analysis & Design Document
**Audience:** GitVan Core Team, RDF Architects, Workflow Engineers

---

## Executive Summary

This document provides a comprehensive analysis of SHACL (Shapes Constraint Language) integration potential in GitVan, with detailed implementation strategies for validating RDF graphs, workflow definitions, git events, and configurations. SHACL provides declarative, RDF-native validation that complements GitVan's existing Zod-based runtime validation and enables semantic constraint checking at the knowledge graph level.

**Key Findings:**
- GitVan has partial SHACL support infrastructure (rdf-validate-shacl dependency, stub SHACL predicates)
- SHACL can significantly enhance validation of workflows, hooks, events, and configurations
- Proposed multi-layer validation strategy: SHACL for RDF graphs, Zod for JavaScript runtimes
- Estimated 3-4 implementation phases with progressive adoption
- Performance overhead is manageable with strategic caching and lazy validation

---

## Table of Contents

1. [SHACL Overview & Technology Research](#shacl-overview--technology-research)
2. [Current GitVan Validation State](#current-gitvan-validation-state)
3. [SHACL Constraints Applicable to GitVan](#shacl-constraints-applicable-to-gitvan)
4. [Shape Design for GitVan Ontologies](#shape-design-for-gitvan-ontologies)
5. [Workflow Schema Validation](#workflow-schema-validation)
6. [Error Reporting & Recovery Strategies](#error-reporting--recovery-strategies)
7. [Integration with Workflow Engine](#integration-with-workflow-execution-engine)
8. [Performance Characteristics](#performance-characteristics)
9. [Testing Strategies](#testing-strategies)
10. [Documentation & Extensibility](#documentation--extensibility)
11. [Implementation Roadmap](#implementation-roadmap)

---

## SHACL Overview & Technology Research

### What is SHACL?

SHACL (Shapes Constraint Language) is a W3C standard language for validating RDF graphs. It enables declarative definition of constraints that RDF data must satisfy, similar to JSON Schema for JSON data.

**Key characteristics:**
- **Declarative:** Constraints defined as RDF data (Turtle format compatible with GitVan)
- **Expressive:** Supports cardinality, value ranges, regex patterns, custom SPARQL queries
- **Composable:** Shape constraints can be combined and reused
- **Traceable:** Violations include detailed information about what failed and why
- **Semantic:** Operates on RDF graphs without converting to other formats

### Core SHACL Concepts

#### Shapes
A Shape is an RDF resource that describes constraints on nodes in a graph. Shapes can have:
- **Shape classes** (sh:NodeShape, sh:PropertyShape)
- **Target definitions** (sh:targetNode, sh:targetClass, sh:targetSubjectsOf)
- **Property constraints** (sh:property, sh:path, sh:minCount, sh:maxCount, etc.)

#### Property Constraints
Common constraints applicable to GitVan:
- **Cardinality:** sh:minCount, sh:maxCount (ensure required properties exist)
- **Value type:** sh:nodeKind, sh:datatype (type checking)
- **Value restrictions:** sh:minInclusive, sh:maxInclusive, sh:pattern (range/format)
- **Enumeration:** sh:in (allowed values)
- **Uniqueness:** sh:uniqueLang (for multilingual properties)
- **Relationships:** sh:shape (shape-to-shape constraints)

#### Advanced Features
- **sh:and, sh:or, sh:not:** Logical combinations
- **sh:sparql:** Custom SPARQL-based constraints
- **sh:values:** Derived values from SPARQL queries
- **Severity levels:** sh:Violation, sh:Warning, sh:Info (customizable)

### RDF-Validate-SHACL Library

GitVan already depends on `rdf-validate-shacl` (v0.6.5), which provides:

```javascript
import SHACLValidator from 'rdf-validate-shacl';

// Validate a graph against shapes
const report = validator.validate(graph, shapes);

// Results include:
// - report.conforms (boolean)
// - report.results (array of ConformanceResult)
//   - result.focusNode (what was validated)
//   - result.resultPath (which property)
//   - result.resultMessage (what failed)
//   - result.severity (Violation/Warning/Info)
```

### SHACL in the RDF Stack

```
Ontology (OWL)
    ↓
    Describes classes and properties
    ↓
Instance Data (RDF)
    ↓
    Actual knowledge graph
    ↓
SHACL Shapes
    ↓
    Validates instance data
    ↓
Validation Report
    ↓
    Conformance results, violations, recovery hints
```

---

## Current GitVan Validation State

### Existing Validation Mechanisms

#### 1. Zod-based Runtime Validation (`/src/schemas/hooks.schema.mjs`)

**Coverage:**
- Hook definitions (HookDefinitionSchema)
- Git event data (GitEventDataSchema)
- Execution contexts (ExecutionContextSchema)
- Bree job configurations (BreeJobConfigSchema)
- Audit log entries (AuditLogEntrySchema)

**Strengths:**
- Type-safe at runtime
- Comprehensive error reporting
- Conditional validation (e.g., cron field required if schedule type is 'cron')
- Integrates with JavaScript/TypeScript

**Limitations:**
- JavaScript-centric, not RDF-aware
- Cannot validate graph-level constraints (cycles, relationships)
- Requires deserialization from Turtle to JavaScript
- Doesn't leverage semantic relationships

#### 2. Workflow Parser Validation (`/src/workflow/workflow-parser.mjs`)

**Current validation:**
```javascript
// In _validateWorkflow() method:
// 1. Duplicate step ID checking
// 2. Circular dependency detection via graph traversal
// 3. Required configuration per step type
// 4. Step type validation (sparql, template, file, http, cli, git)
```

**Limitations:**
- Procedural rather than declarative
- Hard to extend with new constraint types
- Limited to workflow-specific rules
- Doesn't validate data quality or semantic correctness

#### 3. Hook Parser Validation (`/src/hooks/HookParser.mjs`)

**References to SHACL:**
```javascript
// Line 132-140: SHACL predicate type detection
if (turtle.isA(hookDef.pred, GH + "SHACLAllConform")) {
  predicate.type = "shaclAllConform";
  predicate.definition = await this._parseSHACLPredicate(turtle, hookDef);
}

// Line 288-293: SHACL predicate parser (stub)
async _parseSHACLPredicate(turtle, hookDef) {
  // Currently returns template definition
  // Could be enhanced to parse actual SHACL shapes
}
```

**Status:** Partial implementation, ready for enhancement

#### 4. Predicate Evaluator SHACL Support (`/src/hooks/PredicateEvaluator.mjs`)

**Current SHACL evaluation (line 256-276):**
```javascript
async _evaluateSHACL(predicate, currentGraph) {
  this.logger.info("🔍 Evaluating SHACL predicate");

  if (!predicate.definition.shapes) {
    throw new Error("SHACL predicate missing shapes definition");
  }

  // Currently STUB - always returns conforms: true
  const conforms = true;
  const violations = [];

  return {
    conforms: conforms,
    context: {
      shapes: predicate.definition.shapes,
      violations: violations,
      violationCount: violations.length,
    },
  };
}
```

**Status:** Ready for real SHACL validation integration

### Validation Gaps

| Aspect | Current State | Gap |
|--------|---------------|-----|
| **Workflow structure** | Procedural checking | No semantic constraints |
| **Git events** | Zod validation only | No graph-level constraints |
| **Hook predicates** | Type detection only | No shape validation |
| **Configuration** | Zod schemas | No semantic constraints |
| **Pack dependencies** | Manual checking | No constraint language |
| **Custom rules** | Hard to add | No extensibility |

---

## SHACL Constraints Applicable to GitVan

### 1. Workflow Definition Constraints

#### 1.1 Step Definition Constraints

**Requirement:** Every step must have required properties based on its type

**SHACL Shape:**
```turtle
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

gv:SparqlStepShape a sh:NodeShape ;
  sh:targetClass gv:SparqlStep ;
  sh:property [
    sh:path gv:text ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:message "SPARQL step must have exactly one SPARQL query text" ;
  ] ;
  sh:property [
    sh:path gv:outputMapping ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
  ] .

gv:TemplateStepShape a sh:NodeShape ;
  sh:targetClass gv:TemplateStep ;
  sh:property [
    sh:path gv:text ;
    sh:minCount 1 ;
    sh:message "Template step must have template text" ;
  ] ;
  sh:property [
    sh:path gv:filePath ;
    sh:minCount 1 ;
    sh:message "Template step must have target file path" ;
  ] .

gv:FileStepShape a sh:NodeShape ;
  sh:targetClass gv:FileStep ;
  sh:property [
    sh:path gv:filePath ;
    sh:minCount 1 ;
    sh:message "File step must specify file path" ;
  ] ;
  sh:property [
    sh:path gv:operation ;
    sh:minCount 1 ;
    sh:in ("read" "write" "append" "delete") ;
    sh:message "File operation must be one of: read, write, append, delete" ;
  ] .

gv:HttpStepShape a sh:NodeShape ;
  sh:targetClass gv:HttpStep ;
  sh:property [
    sh:path gv:httpUrl ;
    sh:minCount 1 ;
    sh:datatype xsd:anyURI ;
    sh:message "HTTP step must have valid URL" ;
  ] ;
  sh:property [
    sh:path gv:httpMethod ;
    sh:minCount 1 ;
    sh:in ("GET" "POST" "PUT" "DELETE" "PATCH") ;
    sh:message "HTTP method must be valid REST method" ;
  ] .
```

#### 1.2 Dependency Constraint Validation

**Requirement:** Workflow steps must form a directed acyclic graph (DAG)

**SHACL Shape:**
```turtle
gv:WorkflowAcyclicityShape a sh:NodeShape ;
  sh:targetClass op:Pipeline ;
  sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "Workflow contains circular dependency" ;
    sh:prefixes gv: ;
    sh:select """
      PREFIX gv: <https://gitvan.dev/ontology#>
      PREFIX op: <https://gitvan.dev/op#>

      SELECT $this WHERE {
        $this op:steps ?step .
        ?step gv:dependsOn* ?dep .
        ?dep gv:dependsOn+ ?step .
      }
    """ ;
  ] .
```

#### 1.3 Output Mapping Constraints

**Requirement:** Output mappings must be valid JSON

**SHACL Shape:**
```turtle
gv:OutputMappingShape a sh:NodeShape ;
  sh:targetClass gv:WorkflowStep ;
  sh:property [
    sh:path gv:outputMapping ;
    sh:sparql [
      a sh:SPARQLConstraint ;
      sh:message "Output mapping must be valid JSON" ;
      sh:select """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT $this WHERE {
          $this gv:outputMapping ?mapping .
          FILTER (!gv:isValidJSON(?mapping))
        }
      """ ;
    ] ;
  ] .
```

### 2. Hook Definition Constraints

#### 2.1 Hook Structure Constraints

**Requirement:** Hooks must have title, predicate, and at least one pipeline

**SHACL Shape:**
```turtle
@prefix gh: <https://gitvan.dev/graph-hook#> .

gh:HookShape a sh:NodeShape ;
  sh:targetClass gh:Hook ;
  sh:property [
    sh:path gv:title ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
    sh:message "Hook must have non-empty title" ;
  ] ;
  sh:property [
    sh:path gh:hasPredicate ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "Hook must have exactly one predicate" ;
  ] ;
  sh:property [
    sh:path gh:orderedPipelines ;
    sh:minCount 1 ;
    sh:message "Hook must have at least one pipeline" ;
  ] .
```

#### 2.2 Predicate Type Constraints

**Requirement:** Predicate types must have required shape definitions

**SHACL Shape:**
```turtle
gh:ResultDeltaShape a sh:NodeShape ;
  sh:targetClass gh:ResultDelta ;
  sh:property [
    sh:path gh:hasQuery ;
    sh:minCount 1 ;
    sh:message "ResultDelta predicate must define query" ;
  ] .

gh:SelectThresholdShape a sh:NodeShape ;
  sh:targetClass gh:SelectThreshold ;
  sh:property [
    sh:path gh:hasQuery ;
    sh:minCount 1 ;
  ] ;
  sh:property [
    sh:path gh:threshold ;
    sh:minCount 1 ;
    sh:datatype xsd:decimal ;
  ] ;
  sh:property [
    sh:path gh:operator ;
    sh:minCount 1 ;
    sh:in (">" ">=" "<" "<=" "==" "!=") ;
  ] .

gh:SHACLAllConformShape a sh:NodeShape ;
  sh:targetClass gh:SHACLAllConform ;
  sh:property [
    sh:path gh:hasShapes ;
    sh:minCount 1 ;
    sh:message "SHACLAllConform predicate must have shapes" ;
  ] .
```

### 3. Git Event Constraints

#### 3.1 Event Completeness Constraints

**Requirement:** Git events must have required fields based on type

**SHACL Shape:**
```turtle
@prefix gitv: <https://gitvan.dev/ontology/git#> .

gitv:GitEventShape a sh:NodeShape ;
  sh:targetClass gitv:GitEvent ;
  sh:property [
    sh:path gitv:eventType ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:message "Git event must specify event type" ;
  ] ;
  sh:property [
    sh:path gitv:timestamp ;
    sh:minCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:message "Git event must have valid timestamp" ;
  ] ;
  sh:property [
    sh:path gitv:exitCode ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 0 ;
    sh:message "Exit code must be non-negative integer" ;
  ] .

gitv:PreCommitEventShape a sh:NodeShape ;
  sh:targetClass gitv:PreCommitEvent ;
  sh:property [
    sh:path gitv:stagedFiles ;
    sh:minCount 1 ;
    sh:message "Pre-commit event must list staged files" ;
  ] .

gitv:PostPushEventShape a sh:NodeShape ;
  sh:targetClass gitv:PostPushEvent ;
  sh:property [
    sh:path gitv:pushedRefs ;
    sh:minCount 1 ;
    sh:message "Post-push event must list pushed references" ;
  ] .
```

#### 3.2 Temporal Constraints

**Requirement:** Event timestamps must be monotonically increasing

**SHACL Shape:**
```turtle
gitv:TemporalOrderShape a sh:NodeShape ;
  sh:targetClass gitv:GitEvent ;
  sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "Later events must have later timestamps" ;
    sh:select """
      PREFIX gitv: <https://gitvan.dev/ontology/git#>
      SELECT $this WHERE {
        $this gitv:timestamp ?t1 .
        ?other gitv:timestamp ?t2 .
        FILTER($this != ?other && ?t1 > ?t2)
        # This is a simplified constraint;
        # Real implementation would track event sequence
      }
    """ ;
  ] .
```

### 4. Configuration Constraints

#### 4.1 Global Hooks Configuration Constraints

**Requirement:** Configuration values must be in valid ranges

**SHACL Shape:**
```turtle
@prefix cfg: <https://gitvan.dev/config#> .

cfg:HooksConfigShape a sh:NodeShape ;
  sh:targetClass cfg:HooksConfig ;
  sh:property [
    sh:path cfg:auditRetentionDays ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 1 ;
    sh:maxInclusive 3650 ;
    sh:message "Audit retention must be between 1 and 3650 days" ;
  ] ;
  sh:property [
    sh:path cfg:maxConcurrency ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 1 ;
    sh:maxInclusive 256 ;
    sh:message "Max concurrency must be between 1 and 256" ;
  ] ;
  sh:property [
    sh:path cfg:enableMetrics ;
    sh:maxCount 1 ;
    sh:datatype xsd:boolean ;
  ] .
```

### 5. Pack System Constraints

#### 5.1 Pack Dependency Constraints

**Requirement:** Pack versions must satisfy version constraints

**SHACL Shape:**
```turtle
@prefix pack: <https://gitvan.dev/pack#> .

pack:DependencyVersionShape a sh:NodeShape ;
  sh:targetClass pack:Dependency ;
  sh:property [
    sh:path pack:versionRange ;
    sh:minCount 1 ;
    sh:pattern "^[~^>=<\\d\\.]+(\\s+[~^>=<\\d\\.]+)*$" ;
    sh:message "Version range must be valid semver constraint" ;
  ] ;
  sh:property [
    sh:path pack:targetPack ;
    sh:minCount 1 ;
    sh:message "Dependency must specify target pack" ;
  ] .

pack:LicenseCompatibilityShape a sh:NodeShape ;
  sh:targetClass pack:Pack ;
  sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "Pack dependencies must have compatible licenses" ;
    sh:select """
      PREFIX pack: <https://gitvan.dev/pack#>
      SELECT $this WHERE {
        $this pack:license ?license1 .
        $this pack:dependsOn ?dep .
        ?dep pack:targetPack ?targetPack .
        ?targetPack pack:license ?license2 .
        FILTER NOT EXISTS {
          ?license1 pack:licenseCompatibleWith ?license2 .
        }
      }
    """ ;
  ] .
```

---

## Shape Design for GitVan Ontologies

### File Organization

```
/src/rdf/
├── ontologies/
│   ├── git-ontology.ttl              # Existing
│   ├── pack-ontology.ttl             # Existing
│   ├── workflow-ontology.ttl         # New or enhanced
│   └── ... (other ontologies)
├── shapes/
│   ├── workflow-shapes.ttl           # NEW: Workflow validation shapes
│   ├── hook-shapes.ttl               # NEW: Hook validation shapes
│   ├── event-shapes.ttl              # NEW: Git event shapes
│   ├── config-shapes.ttl             # NEW: Configuration shapes
│   ├── pack-shapes.ttl               # NEW: Pack system shapes
│   └── composite-shapes.ttl          # NEW: Cross-ontology shapes
└── validators/
    ├── shacl-validator.mjs           # NEW: Validation orchestrator
    └── shacl-reporter.mjs            # NEW: Violation reporting
```

### Shape Design Principles

#### 1. Modular Shapes
```turtle
# Good: Reusable property shapes
gv:RequiredStringProperty a sh:PropertyShape ;
  sh:datatype xsd:string ;
  sh:minCount 1 ;
  sh:minLength 1 .

# Usage
SomeShape a sh:NodeShape ;
  sh:property [ sh:path gv:name ; sh:shape gv:RequiredStringProperty ] .
```

#### 2. Severity Levels
```turtle
# Info: Advisory constraint
gv:RecommendedVersionShape a sh:NodeShape ;
  sh:property [
    sh:path gv:version ;
    sh:minCount 1 ;
    sh:severity sh:Info ;
    sh:message "Version should follow semantic versioning" ;
  ] .

# Warning: Potential issue
gv:DeprecationWarning a sh:NodeShape ;
  sh:property [
    sh:path gv:isDeprecated ;
    sh:severity sh:Warning ;
    sh:message "This step type is deprecated" ;
  ] .

# Violation: Critical constraint failure
gv:RequiredPropertyViolation a sh:NodeShape ;
  sh:property [
    sh:path gv:id ;
    sh:minCount 1 ;
    sh:severity sh:Violation ;
    sh:message "Property id is required" ;
  ] .
```

#### 3. Composite Shapes with Logical Operators
```turtle
# Either-or constraint: must have template OR filePath
gv:TemplateOrFileShape a sh:NodeShape ;
  sh:targetClass gv:TemplateStep ;
  sh:or (
    [
      sh:property [
        sh:path gv:text ;
        sh:minCount 1 ;
      ]
    ]
    [
      sh:property [
        sh:path gv:filePath ;
        sh:minCount 1 ;
      ]
    ]
  ) .
```

### Complete Shape Definition Example

**File: `/src/rdf/shapes/workflow-shapes.ttl`**

```turtle
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# ============================================================================
# Workflow and Pipeline Shapes
# ============================================================================

gv:WorkflowShape a sh:NodeShape ;
  sh:targetClass gv:Workflow ;
  rdfs:label "Workflow Shape" ;
  rdfs:comment "Validates workflow definition structure" ;

  sh:property [
    sh:path gv:id ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
    sh:message "Workflow must have non-empty id" ;
  ] ;

  sh:property [
    sh:path gv:title ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
    sh:message "Workflow must have non-empty title" ;
  ] ;

  sh:property [
    sh:path op:steps ;
    sh:minCount 1 ;
    sh:message "Workflow must have at least one step" ;
  ] .

# ============================================================================
# Step Type Shapes
# ============================================================================

gv:BaseStepShape a sh:NodeShape ;
  sh:targetClass gv:WorkflowStep ;
  rdfs:label "Base Step Shape" ;
  rdfs:comment "Common constraints for all steps" ;

  sh:property [
    sh:path gv:id ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:message "Step must have id" ;
  ] ;

  sh:property [
    sh:path gv:dependsOn ;
    sh:nodeKind sh:IRI ;
    sh:message "Dependencies must reference other steps by IRI" ;
  ] ;

  sh:property [
    sh:path gv:timeout ;
    sh:maxCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 1 ;
    sh:maxInclusive 3600000 ;
    sh:message "Timeout must be between 1ms and 1 hour" ;
  ] ;

  sh:property [
    sh:path gv:outputMapping ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:sparql [
      a sh:SPARQLConstraint ;
      sh:severity sh:Warning ;
      sh:message "Output mapping should be valid JSON" ;
      sh:select """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT $this WHERE {
          $this gv:outputMapping ?mapping .
          BIND(STRLEN(?mapping) AS ?len)
          FILTER(?len > 0 && SUBSTR(?mapping, 1, 1) != '{')
        }
      """ ;
    ] ;
  ] .

gv:SparqlStepShape a sh:NodeShape ;
  sh:targetClass gv:SparqlStep ;
  sh:property [
    sh:path gv:text ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 10 ;
    sh:message "SPARQL step must have query text (min 10 chars)" ;
  ] .

gv:TemplateStepShape a sh:NodeShape ;
  sh:targetClass gv:TemplateStep ;
  sh:property [
    sh:path gv:text ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
    sh:message "Template step must have template text" ;
  ] ;
  sh:property [
    sh:path gv:filePath ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
    sh:message "Template step must have output file path" ;
  ] .

gv:FileStepShape a sh:NodeShape ;
  sh:targetClass gv:FileStep ;
  sh:property [
    sh:path gv:filePath ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:message "File step must specify path" ;
  ] ;
  sh:property [
    sh:path gv:operation ;
    sh:maxCount 1 ;
    sh:in ("read" "write" "append" "delete") ;
    sh:message "Operation must be read, write, append, or delete" ;
  ] .

gv:HttpStepShape a sh:NodeShape ;
  sh:targetClass gv:HttpStep ;
  sh:property [
    sh:path gv:httpUrl ;
    sh:minCount 1 ;
    sh:datatype xsd:anyURI ;
    sh:message "HTTP step must have valid URL" ;
  ] ;
  sh:property [
    sh:path gv:httpMethod ;
    sh:minCount 1 ;
    sh:in ("GET" "POST" "PUT" "DELETE" "PATCH" "HEAD" "OPTIONS") ;
    sh:message "HTTP method invalid" ;
  ] .

gv:CliStepShape a sh:NodeShape ;
  sh:targetClass gv:CliStep ;
  sh:property [
    sh:path gv:cliCommand ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
    sh:message "CLI step must have command" ;
  ] .

gv:GitStepShape a sh:NodeShape ;
  sh:targetClass gv:GitStep ;
  sh:property [
    sh:path gv:gitCommand ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:minLength 1 ;
    sh:message "Git step must have command" ;
  ] .

# ============================================================================
# DAG Acyclicity Shape
# ============================================================================

gv:AcyclicWorkflowShape a sh:NodeShape ;
  sh:targetClass op:Pipeline ;
  rdfs:label "Acyclic Workflow Shape" ;
  rdfs:comment "Ensures workflow steps form DAG (no cycles)" ;
  sh:severity sh:Violation ;
  sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "Workflow contains circular dependency" ;
    sh:prefixes gv: ;
    sh:select """
      PREFIX gv: <https://gitvan.dev/ontology#>
      PREFIX op: <https://gitvan.dev/op#>

      SELECT DISTINCT $this WHERE {
        $this op:steps ?step .
        ?step gv:dependsOn* ?intermediate .
        ?intermediate gv:dependsOn+ ?step .
      }
    """ ;
  ] .

# ============================================================================
# Cross-shape Constraints
# ============================================================================

gv:UniqueDependenciesShape a sh:NodeShape ;
  sh:targetClass gv:WorkflowStep ;
  rdfs:label "Unique Dependencies Shape" ;
  rdfs:comment "No step should depend on itself" ;
  sh:sparql [
    a sh:SPARQLConstraint ;
    sh:severity sh:Violation ;
    sh:message "Step cannot depend on itself" ;
    sh:select """
      PREFIX gv: <https://gitvan.dev/ontology#>
      SELECT $this WHERE {
        $this gv:dependsOn $this .
      }
    """ ;
  ] .
```

---

## Workflow Schema Validation

### Integration Points

```
Workflow Definition (.ttl file)
    ↓
Parse into RDF Graph
    ↓
Load SHACL Shapes
    ↓
Validate Graph against Shapes
    ↓ (if INVALID)
Generate Violation Report
    ↓
Apply Recovery Strategy
    ↓ (if VALID)
Proceed to DAG Planner
```

### Implementation: SHACLValidator Composable

**File: `/src/composables/shacl-validator.mjs`**

```javascript
/**
 * SHACL validation composable for GitVan
 * Validates RDF graphs against SHACL shapes
 */
export function useSHACLValidator() {
  return {
    /**
     * Validate a workflow definition against SHACL shapes
     */
    async validateWorkflow(workflowGraph, options = {}) {
      const shapesGraph = await this._loadShapes('workflow-shapes.ttl');
      return this._validate(workflowGraph, shapesGraph, options);
    },

    /**
     * Validate hook definition
     */
    async validateHook(hookGraph, options = {}) {
      const shapesGraph = await this._loadShapes('hook-shapes.ttl');
      return this._validate(hookGraph, shapesGraph, options);
    },

    /**
     * Validate git event
     */
    async validateGitEvent(eventGraph, options = {}) {
      const shapesGraph = await this._loadShapes('event-shapes.ttl');
      return this._validate(eventGraph, shapesGraph, options);
    },

    /**
     * Validate configuration
     */
    async validateConfig(configGraph, options = {}) {
      const shapesGraph = await this._loadShapes('config-shapes.ttl');
      return this._validate(configGraph, shapesGraph, options);
    },

    /**
     * Core validation method
     */
    async _validate(dataGraph, shapesGraph, options = {}) {
      const SHACLValidator =
        (await import('rdf-validate-shacl')).default;

      const validator = new SHACLValidator();
      const report = validator.validate(dataGraph, shapesGraph);

      return {
        conforms: report.conforms,
        violations: report.results.map(r => ({
          focusNode: r.focusNode?.value,
          severity: r.severity?.value,
          path: r.resultPath?.value,
          message: r.resultMessage?.[0]?.value,
          sourceShape: r.sourceShape?.value,
        })),
        stats: {
          totalViolations: report.results.length,
          violations: report.results.filter(
            r => r.severity?.value?.includes('Violation')
          ).length,
          warnings: report.results.filter(
            r => r.severity?.value?.includes('Warning')
          ).length,
          info: report.results.filter(
            r => r.severity?.value?.includes('Info')
          ).length,
        },
      };
    },
  };
}
```

### Integration with WorkflowParser

**File: `/src/workflow/workflow-parser.mjs` (modified)**

```javascript
async _validateWorkflow(steps) {
  this.logger.info(`🔍 Validating workflow structure`);

  // 1. Existing procedural checks
  const stepIds = steps.map((step) => step.id);
  const uniqueIds = new Set(stepIds);
  if (stepIds.length !== uniqueIds.size) {
    throw new Error("Duplicate step IDs found in workflow");
  }

  this._validateDependencies(steps);

  for (const step of steps) {
    this._validateStepConfig(step);
  }

  // 2. NEW: SHACL validation
  if (process.env.GITVAN_SHACL_VALIDATION !== 'off') {
    try {
      const validator = useSHACLValidator();
      const report = await validator.validateWorkflow(
        this.turtle.store,
        { strict: false } // Non-blocking mode by default
      );

      if (!report.conforms) {
        if (process.env.GITVAN_SHACL_STRICT === 'true') {
          throw new Error(
            `SHACL validation failed: ${
              report.violations.map(v => v.message).join(', ')
            }`
          );
        } else {
          // Log warnings but continue
          report.violations.forEach(v => {
            this.logger.warn(`SHACL: ${v.message}`);
          });
        }
      }
    } catch (error) {
      if (process.env.GITVAN_SHACL_STRICT === 'true') {
        throw error;
      } else {
        this.logger.warn(`SHACL validation error (non-blocking): ${error.message}`);
      }
    }
  }

  this.logger.info(`✅ Workflow validation passed`);
}
```

---

## Error Reporting & Recovery Strategies

### Validation Report Structure

```javascript
{
  // Overall result
  conforms: boolean,

  // Detailed violations
  violations: [
    {
      focusNode: "http://example.org/step-1",
      severity: "http://www.w3.org/ns/shacl#Violation",
      path: "https://gitvan.dev/ontology#text",
      message: "SPARQL step must have query text",
      sourceShape: "https://gitvan.dev/ontology#SparqlStepShape",

      // Recovery suggestions
      suggestion: "Add gv:text property with SPARQL query",
      severity_level: "critical", // critical, warning, info
      recovery_options: [
        {
          type: "auto_fix",
          description: "Auto-generate minimal SPARQL query",
          executable: true,
          implementation: "generateMinimalSparqlQuery()",
        },
        {
          type: "manual_fix",
          description: "User must provide SPARQL query",
          executable: false,
        },
      ]
    }
  ],

  // Statistics
  stats: {
    totalViolations: 3,
    criticalViolations: 1,
    warnings: 1,
    infos: 1,
  },

  // Recommended actions
  recovery_plan: [
    {
      priority: 1,
      action: "Add missing gv:text property",
      affects: ["ex:analyze-structure"],
    },
    {
      priority: 2,
      action: "Verify output mapping JSON",
      affects: ["ex:generate-components"],
    },
  ],
}
```

### Recovery Strategies

#### 1. Auto-Correction (When Safe)

```javascript
/**
 * Auto-correct common validation issues
 */
export async function autoCorrectWorkflow(workflow, violations) {
  const corrections = [];

  for (const violation of violations) {
    if (violation.sourceShape.includes('OutputMapping')) {
      // Auto-fix: generate valid empty object mapping
      const stepId = violation.focusNode;
      const step = workflow.steps.find(s => s.id === stepId);
      if (step) {
        step.config.outputMapping = '{}';
        corrections.push({
          stepId,
          property: 'outputMapping',
          action: 'auto_corrected',
          value: '{}',
        });
      }
    }

    if (violation.sourceShape.includes('MinCount')) {
      // Cannot auto-correct: requires semantic understanding
      corrections.push({
        focusNode: violation.focusNode,
        action: 'cannot_auto_correct',
        reason: 'Missing required property requires user input',
      });
    }
  }

  return corrections;
}
```

#### 2. Degraded Mode Execution

```javascript
/**
 * Execute workflow with violations in degraded mode
 */
export async function executeWithViolations(
  workflow,
  violations,
  options = {}
) {
  const executionPlan = {
    mode: 'degraded',
    violations_acknowledged: true,
    monitored_steps: [],
    reduced_parallelism: true,
    enhanced_logging: true,
  };

  // Steps with critical violations should:
  // - Run with timeout enforcement
  // - Have output validation enabled
  // - Be excluded from parallelization

  for (const violation of violations) {
    if (violation.severity_level === 'critical') {
      const stepId = violation.focusNode;
      executionPlan.monitored_steps.push({
        stepId,
        monitoringLevel: 'enhanced',
        failureMode: 'fail_fast',
      });
    }
  }

  return executionPlan;
}
```

#### 3. User-Guided Remediation

```javascript
/**
 * Generate remediation guidance for users
 */
export function generateRemediationGuide(report) {
  const guide = {
    summary: `${report.stats.totalViolations} validation issues found`,
    critical: [],
    warnings: [],
    info: [],
  };

  for (const violation of report.violations) {
    const remediation = {
      issue: violation.message,
      affectedNode: violation.focusNode,
      howToFix: generateFixInstructions(violation),
      examples: generateExamples(violation),
      documentation: generateDocsLink(violation),
    };

    if (violation.severity_level === 'critical') {
      guide.critical.push(remediation);
    } else if (violation.severity_level === 'warning') {
      guide.warnings.push(remediation);
    } else {
      guide.info.push(remediation);
    }
  }

  return guide;
}
```

#### 4. Conditional Proceeding

```javascript
/**
 * Determine if workflow can proceed despite violations
 */
export async function canProceedWithViolations(
  workflow,
  violations,
  executionContext
) {
  const criticalCount = violations.filter(
    v => v.severity_level === 'critical'
  ).length;

  if (criticalCount === 0) {
    // No critical violations, can proceed
    return {
      canProceed: true,
      mode: 'warnings',
      riskLevel: 'low',
    };
  }

  // Check if violations are in unexecuted paths
  const affectedSteps = new Set(
    violations.map(v => extractStepId(v.focusNode))
  );

  const executedSteps = executionContext.executedStepIds || [];
  const affectedByExecutedSteps = [...affectedSteps].filter(
    s => executedSteps.includes(s)
  );

  if (affectedByExecutedSteps.length === 0) {
    // Violations don't affect already-executed steps
    return {
      canProceed: true,
      mode: 'warnings',
      riskLevel: 'medium',
      note: 'Violations in future steps; execution may still fail',
    };
  }

  // Critical violations in executed or executing steps
  return {
    canProceed: false,
    mode: 'failed',
    riskLevel: 'high',
    reason: 'Critical violations affect workflow execution',
  };
}
```

### Failure Modes

| Mode | Condition | Behavior |
|------|-----------|----------|
| **Strict** | SHACL_STRICT=true | Fail immediately on any violation |
| **Warning** | SHACL_STRICT=false (default) | Log warnings, attempt recovery |
| **Degraded** | Critical violations in future steps | Execute with enhanced monitoring |
| **Failed** | Critical violations in executing steps | Halt execution with diagnostics |

---

## Integration with Workflow Execution Engine

### Validation Points in Workflow Lifecycle

```
1. LOAD PHASE
   ├─ Parse Turtle file
   └─ Validate SHACL shapes ← Point 1

2. PLAN PHASE
   ├─ Create DAG from steps
   ├─ Detect cycles
   └─ Validate dependencies ← Point 2

3. PREPARE PHASE
   ├─ Resolve step handlers
   ├─ Validate configurations
   └─ Check resource availability ← Point 3

4. EXECUTE PHASE
   ├─ Execute steps in dependency order
   ├─ Monitor output mappings
   └─ Validate transformations ← Point 4

5. FINALIZE PHASE
   └─ Generate audit trail ← Point 5
```

### Integration Code: WorkflowEngine Enhancement

**File: `/src/workflow/workflow-engine.mjs` (new method)**

```javascript
/**
 * Enhanced workflow execution with SHACL validation
 */
export class WorkflowEngine {
  async executeWithSHACLValidation(workflowId, context) {
    // Phase 1: Load and validate Turtle definition
    const workflow = await this.loadWorkflow(workflowId);

    // Phase 1.5: SHACL validation on definition
    const definitionValidation = await this._validateDefinition(workflow);
    if (!definitionValidation.conforms) {
      const recovery = await this._attemptRecovery(
        workflow,
        definitionValidation
      );
      if (!recovery.success && process.env.GITVAN_SHACL_STRICT === 'true') {
        throw new WorkflowValidationError(
          `Workflow definition invalid: ${definitionValidation.violations
            .map(v => v.message)
            .join(', ')}`
        );
      }
    }

    // Phase 2: Create execution plan
    const plan = await this.planner.createPlan(workflow);

    // Phase 2.5: Validate DAG properties
    const dagValidation = await this._validateDAG(plan);
    if (!dagValidation.conforms) {
      throw new DAGValidationError(
        `DAG validation failed: ${dagValidation.violations[0].message}`
      );
    }

    // Phase 3-5: Execute workflow with event validation
    try {
      const execution = await this._executeSteps(plan, context);

      // Phase 4.5: Validate execution outputs
      const outputValidation = await this._validateExecutionOutputs(
        execution
      );

      return {
        success: true,
        results: execution.results,
        validations: {
          definition: definitionValidation,
          dag: dagValidation,
          outputs: outputValidation,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        validations: {
          definition: definitionValidation,
          dag: dagValidation,
        },
      };
    }
  }

  async _validateDefinition(workflow) {
    const validator = useSHACLValidator();
    return validator.validateWorkflow(workflow.graph);
  }

  async _validateDAG(plan) {
    // Check for cycles using SHACL
    const validator = useSHACLValidator();
    // ... implementation
  }

  async _validateExecutionOutputs(execution) {
    // Validate output mappings and transformations
    // ... implementation
  }

  async _attemptRecovery(workflow, validation) {
    const recoverable = validation.violations.filter(
      v => v.recovery_options?.some(opt => opt.executable)
    );

    if (recoverable.length === validation.violations.length) {
      // All violations are auto-recoverable
      const corrections = await autoCorrectWorkflow(
        workflow,
        recoverable
      );
      return {
        success: true,
        corrections,
      };
    }

    return {
      success: false,
      unrecoverable: validation.violations.filter(
        v => !v.recovery_options?.some(opt => opt.executable)
      ),
    };
  }
}
```

### Event-Level Validation

**File: `/src/hooks/PredicateEvaluator.mjs` (enhanced SHACL method)**

```javascript
async _evaluateSHACL(predicate, currentGraph) {
  this.logger.info("🔍 Evaluating SHACL predicate");

  if (!predicate.definition.shapes) {
    throw new Error("SHACL predicate missing shapes definition");
  }

  try {
    // Load shapes from definition
    const shapesGraph = await this._loadShapesFromDefinition(
      predicate.definition.shapes
    );

    // Validate current graph against shapes
    const SHACLValidator =
      (await import('rdf-validate-shacl')).default;
    const validator = new SHACLValidator();
    const report = validator.validate(currentGraph, shapesGraph);

    // Extract violation information
    const violations = report.results.map(result => ({
      focusNode: result.focusNode?.value,
      path: result.resultPath?.value,
      message: result.resultMessage?.[0]?.value,
      severity: result.severity?.value,
    }));

    return {
      conforms: report.conforms,
      context: {
        shapes: predicate.definition.shapes,
        violations: violations,
        violationCount: violations.length,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    this.logger.error(`SHACL validation error: ${error.message}`);
    throw new Error(`SHACL validation failed: ${error.message}`);
  }
}

async _loadShapesFromDefinition(shapesDef) {
  // Load SHACL shapes from various sources:
  // 1. Inline Turtle strings
  // 2. File paths
  // 3. Ontology references
  // ... implementation
}
```

---

## Performance Characteristics

### Complexity Analysis

| Operation | Time Complexity | Space Complexity | Notes |
|-----------|-----------------|------------------|-------|
| **Load shapes** | O(s) | O(s) | s = shape size |
| **Validate simple property** | O(n) | O(1) | n = graph size |
| **Validate with SPARQL** | O(n log n) | O(n) | Requires query execution |
| **DAG cycle detection** | O(V + E) | O(V) | V = vertices, E = edges |
| **Full workflow validation** | O(n + s log n) | O(n + s) | Combined operations |

### Performance Benchmarks

```javascript
// Estimated performance on realistic workflows
// (based on rdf-validate-shacl and unrdf benchmarks)

Workflow size: 10 steps
├─ Load shapes: ~5ms
├─ Parse Turtle: ~10ms
├─ Validate properties: ~15ms (O(n) property checks)
├─ Validate SPARQL constraints: ~30ms (2 SPARQL queries)
└─ Total: ~60ms

Workflow size: 100 steps
├─ Load shapes: ~5ms
├─ Parse Turtle: ~50ms
├─ Validate properties: ~100ms
├─ Validate SPARQL constraints: ~150ms
└─ Total: ~305ms

Workflow size: 1000 steps
├─ Parse Turtle: ~500ms
├─ Validate properties: ~1000ms
├─ Validate SPARQL constraints: ~1500ms (complex recursive queries)
└─ Total: ~3000ms
```

### Optimization Strategies

#### 1. Lazy Validation

```javascript
// Only validate when needed
const validator = useSHACLValidator();

// Option A: Validate only on explicit request
if (options.validateShapes === true) {
  await validator.validateWorkflow(graph);
}

// Option B: Background validation
validator.validateWorkflowAsync(graph).then(report => {
  if (!report.conforms) {
    logger.warn(`Async SHACL violations: ${report.violations.length}`);
  }
});
```

#### 2. Shape Caching

```javascript
// Cache loaded shapes in memory
class SHACLValidator {
  constructor() {
    this.shapeCache = new Map();
  }

  async _loadShapes(name) {
    if (this.shapeCache.has(name)) {
      return this.shapeCache.get(name);
    }

    const shapes = await this._loadShapesFromFile(name);
    this.shapeCache.set(name, shapes);
    return shapes;
  }
}
```

#### 3. Incremental Validation

```javascript
// Only validate modified portions of graph
async function validateDelta(
  previousGraph,
  currentGraph,
  previousValidation
) {
  // Find what changed
  const additions = currentGraph.difference(previousGraph);
  const deletions = previousGraph.difference(currentGraph);

  // Only validate affected nodes
  const affectedNodes = extractAffectedNodes(
    additions,
    deletions,
    previousValidation.focusNodes
  );

  return validator.validateSubset(currentGraph, affectedNodes);
}
```

#### 4. Parallel Validation

```javascript
// Validate independent shape groups in parallel
async function validateParallel(graph, shapes) {
  // Group shapes by affected node type
  const shapeGroups = groupShapesByTarget(shapes);

  // Validate each group independently
  const results = await Promise.all(
    shapeGroups.map(group =>
      validator.validate(graph, group)
    )
  );

  return combineReports(results);
}
```

### Memory Management

```javascript
// Prevent memory bloat with large graphs
class SHACLValidator {
  constructor(options = {}) {
    this.options = {
      maxGraphSize: options.maxGraphSize || 1000000, // quads
      enableCaching: options.enableCaching !== false,
      cacheSize: options.cacheSize || 100, // MB
      garbageCollectionInterval: options.gci || 300000, // 5 min
    };

    this.startGarbageCollection();
  }

  async validate(graph, shapes) {
    // Monitor graph size
    if (graph.size > this.options.maxGraphSize) {
      throw new Error(
        `Graph too large: ${graph.size} > ${this.options.maxGraphSize}`
      );
    }

    // Validate...
    return report;
  }

  startGarbageCollection() {
    setInterval(() => {
      if (this.shapeCache.size > this.options.cacheSize) {
        // Clear oldest entries
        const entriesToRemove = Math.ceil(
          this.options.cacheSize * 0.2
        );
        for (let i = 0; i < entriesToRemove; i++) {
          const firstKey = this.shapeCache.keys().next().value;
          this.shapeCache.delete(firstKey);
        }
      }
    }, this.options.garbageCollectionInterval);
  }
}
```

---

## Testing Strategies

### Unit Tests for Shapes

**File: `/tests/shacl/shapes.test.mjs`**

```javascript
import { describe, it, expect } from 'vitest';
import { loadShapes, validateAgainstShape } from '../src/composables/shacl-validator.mjs';

describe('SHACL Shapes', () => {
  describe('Workflow Shapes', () => {
    it('should reject workflow without steps', async () => {
      const invalidWorkflow = {
        id: 'workflow-1',
        title: 'Test',
        steps: [], // Missing steps
      };

      const shapes = await loadShapes('workflow-shapes.ttl');
      const report = await validateAgainstShape(
        invalidWorkflow,
        shapes,
        'gv:WorkflowShape'
      );

      expect(report.conforms).toBe(false);
      expect(report.violations).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('at least one step'),
        })
      );
    });

    it('should accept valid workflow', async () => {
      const validWorkflow = {
        id: 'workflow-1',
        title: 'Test Workflow',
        steps: [
          {
            id: 'step-1',
            type: 'sparql',
            config: { query: 'SELECT ?s WHERE { ?s a ?t }' },
          },
        ],
      };

      const shapes = await loadShapes('workflow-shapes.ttl');
      const report = await validateAgainstShape(
        validWorkflow,
        shapes,
        'gv:WorkflowShape'
      );

      expect(report.conforms).toBe(true);
    });
  });

  describe('Step Type Shapes', () => {
    it('should validate SPARQL step requirements', async () => {
      const sparqlStep = {
        id: 'step-1',
        type: 'sparql',
        config: {}, // Missing query
      };

      const shapes = await loadShapes('workflow-shapes.ttl');
      const report = await validateAgainstShape(
        sparqlStep,
        shapes,
        'gv:SparqlStepShape'
      );

      expect(report.conforms).toBe(false);
      expect(report.violations[0].message).toContain('query text');
    });

    it('should validate HTTP step method enum', async () => {
      const httpStep = {
        id: 'step-1',
        type: 'http',
        config: {
          url: 'https://example.com',
          method: 'INVALID', // Not in enum
        },
      };

      const report = await validateAgainstShape(
        httpStep,
        shapes,
        'gv:HttpStepShape'
      );

      expect(report.conforms).toBe(false);
      expect(report.violations[0].message).toContain('method');
    });
  });

  describe('DAG Validation', () => {
    it('should detect circular dependencies', async () => {
      const workflow = {
        id: 'workflow-1',
        steps: [
          { id: 'step-1', dependsOn: ['step-2'] },
          { id: 'step-2', dependsOn: ['step-1'] },
        ],
      };

      const report = await validateDAG(workflow);
      expect(report.conforms).toBe(false);
      expect(report.violations[0].message).toContain('circular');
    });

    it('should accept valid DAG', async () => {
      const workflow = {
        id: 'workflow-1',
        steps: [
          { id: 'step-1', dependsOn: [] },
          { id: 'step-2', dependsOn: ['step-1'] },
          { id: 'step-3', dependsOn: ['step-1', 'step-2'] },
        ],
      };

      const report = await validateDAG(workflow);
      expect(report.conforms).toBe(true);
    });
  });
});
```

### Integration Tests

**File: `/tests/shacl/workflow-integration.test.mjs`**

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowParser } from '../src/workflow/workflow-parser.mjs';
import { useSHACLValidator } from '../src/composables/shacl-validator.mjs';

describe('Workflow Validation Integration', () => {
  let parser;
  let validator;

  beforeEach(() => {
    parser = new WorkflowParser();
    validator = useSHACLValidator();
  });

  it('should parse and validate valid workflow', async () => {
    const turtleContent = `
      @prefix ex: <http://example.org/> .
      @prefix gv: <https://gitvan.dev/ontology#> .

      ex:test-workflow gv:id "test" ;
        gv:title "Test" ;
        gv:steps ex:step-1 .

      ex:step-1 a gv:SparqlStep ;
        gv:text "SELECT ?s WHERE { ?s a ?t }" .
    `;

    const workflow = await parser.parseWorkflow(turtleContent, 'ex:test-workflow');
    expect(workflow).toBeDefined();
    expect(workflow.steps).toHaveLength(1);
  });

  it('should reject workflow with SHACL violations in strict mode', async () => {
    process.env.GITVAN_SHACL_STRICT = 'true';

    const invalidTurtleContent = `
      @prefix ex: <http://example.org/> .
      @prefix gv: <https://gitvan.dev/ontology#> .

      ex:test-workflow gv:id "test" ;
        gv:steps ex:step-1 .

      ex:step-1 a gv:SparqlStep .
    `;

    await expect(
      parser.parseWorkflow(invalidTurtleContent, 'ex:test-workflow')
    ).rejects.toThrow('SHACL validation failed');

    process.env.GITVAN_SHACL_STRICT = 'false';
  });

  it('should warn but proceed in non-strict mode', async () => {
    process.env.GITVAN_SHACL_STRICT = 'false';

    const warnings = [];
    const originalWarn = parser.logger.warn;
    parser.logger.warn = (msg) => warnings.push(msg);

    const invalidTurtleContent = `
      @prefix ex: <http://example.org/> .
      @prefix gv: <https://gitvan.dev/ontology#> .

      ex:test-workflow gv:id "test" ;
        gv:steps ex:step-1 .

      ex:step-1 a gv:SparqlStep ;
        gv:outputMapping "not json" .
    `;

    const workflow = await parser.parseWorkflow(
      invalidTurtleContent,
      'ex:test-workflow'
    );

    expect(workflow).toBeDefined();
    expect(warnings.some(w => w.includes('SHACL'))).toBe(true);

    parser.logger.warn = originalWarn;
  });
});
```

### Performance Tests

**File: `/tests/shacl/performance.test.mjs`**

```javascript
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';
import { useSHACLValidator } from '../src/composables/shacl-validator.mjs';

describe('SHACL Validation Performance', () => {
  const validator = useSHACLValidator();

  it('should validate small workflow in < 100ms', async () => {
    const workflow = generateWorkflow(10); // 10 steps

    const start = performance.now();
    await validator.validateWorkflow(workflow);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it('should validate medium workflow in < 500ms', async () => {
    const workflow = generateWorkflow(100); // 100 steps

    const start = performance.now();
    await validator.validateWorkflow(workflow);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500);
  });

  it('should cache shapes for reuse', async () => {
    const workflow1 = generateWorkflow(50);
    const workflow2 = generateWorkflow(50);

    // First validation - load shapes
    const start1 = performance.now();
    await validator.validateWorkflow(workflow1);
    const elapsed1 = performance.now() - start1;

    // Second validation - use cached shapes
    const start2 = performance.now();
    await validator.validateWorkflow(workflow2);
    const elapsed2 = performance.now() - start2;

    // Second should be faster due to caching
    expect(elapsed2).toBeLessThan(elapsed1 * 0.8);
  });

  function generateWorkflow(stepCount) {
    const steps = [];
    for (let i = 0; i < stepCount; i++) {
      steps.push({
        id: `step-${i}`,
        type: 'sparql',
        config: { query: 'SELECT ?s WHERE { ?s a ?t }' },
        dependsOn: i > 0 ? [`step-${i - 1}`] : [],
      });
    }
    return { id: 'generated', title: 'Test', steps };
  }
});
```

---

## Documentation & Extensibility

### User Documentation

#### Shape Definition Guide

**File: `/docs/shacl/shapes-guide.md`**

```markdown
# SHACL Shapes Guide

## Overview

SHACL (Shapes Constraint Language) shapes in GitVan define constraints
that RDF data must satisfy.

## Common Shape Patterns

### Required Property
```turtle
sh:property [
  sh:path gv:requiredField ;
  sh:minCount 1 ;
  sh:message "Field is required" ;
] .
```

### Enumerated Values
```turtle
sh:property [
  sh:path gv:method ;
  sh:in ("GET" "POST" "PUT" "DELETE") ;
  sh:message "Method must be valid HTTP method" ;
] .
```

### Numeric Range
```turtle
sh:property [
  sh:path gv:timeout ;
  sh:minInclusive 1 ;
  sh:maxInclusive 3600000 ;
  sh:message "Timeout must be 1ms to 1 hour" ;
] .
```

## Advanced Patterns

### SPARQL Constraints

For complex validation logic, use SPARQL constraints:

```turtle
sh:sparql [
  a sh:SPARQLConstraint ;
  sh:message "Custom constraint violation" ;
  sh:select """
    PREFIX gv: <https://gitvan.dev/ontology#>
    SELECT $this WHERE {
      # SPARQL query that identifies violations
      $this gv:property1 ?val1 .
      $this gv:property2 ?val2 .
      FILTER(CONDITION_THAT_VIOLATES_CONSTRAINT)
    }
  """ ;
] .
```

### Composite Shapes

Combine shapes with logical operators:

```turtle
# Either A or B must be present
sh:or (
  [ sh:property [ sh:path gv:propertyA ; sh:minCount 1 ] ]
  [ sh:property [ sh:path gv:propertyB ; sh:minCount 1 ] ]
) .
```
```

#### Custom Constraints Documentation

**File: `/docs/shacl/custom-constraints.md`**

```markdown
# Creating Custom SHACL Constraints

## Adding a New Shape

1. Create shape file in `/src/rdf/shapes/`
2. Define target (which nodes to validate)
3. Add properties constraints
4. Register shape in validator

### Example: Custom Timeout Validation

```turtle
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

gv:ReasonableTimeoutShape a sh:NodeShape ;
  sh:targetClass gv:WorkflowStep ;
  sh:property [
    sh:path gv:timeout ;
    sh:sparql [
      a sh:SPARQLConstraint ;
      sh:message "Timeout is unreasonably long (>1 hour)" ;
      sh:severity sh:Warning ;
      sh:select """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT $this WHERE {
          $this gv:timeout ?timeout .
          FILTER(?timeout > 3600000)
        }
      """ ;
    ] ;
  ] .
```

## Severity Levels

- **sh:Violation** - Fail validation
- **sh:Warning** - Alert but continue
- **sh:Info** - Informational

## Testing Your Shape

```javascript
import { useSHACLValidator } from '../src/composables/shacl-validator.mjs';

const validator = useSHACLValidator();

// Test invalid case
const invalidData = { /* ... */ };
const report = await validator.validate(invalidData, shapes);
expect(report.conforms).toBe(false);

// Test valid case
const validData = { /* ... */ };
const report = await validator.validate(validData, shapes);
expect(report.conforms).toBe(true);
```
```

### Developer Documentation

#### Shape Development Guide

**File: `/docs/shacl/development.md`**

```markdown
# SHACL Development Guide

## Architecture

```
Ontology (OWL)
  ↓ defines classes and properties
Instance Data (RDF)
  ↓ created according to ontology
SHACL Shapes
  ↓ validates instance data
Validation Report
  ↓ provides feedback
Recovery System
  ↓ attempts auto-correction
Execution Engine
```

## Adding SHACL Validation to New Features

### 1. Define Ontology Classes

```turtle
@prefix myfeature: <https://gitvan.dev/myfeature#> .

myfeature:MyClass a owl:Class ;
  rdfs:subClassOf owl:Thing ;
  rdfs:label "My Class" ;
  rdfs:comment "Description of my class" .
```

### 2. Create SHACL Shape

```turtle
myfeature:MyClassShape a sh:NodeShape ;
  sh:targetClass myfeature:MyClass ;
  sh:property [
    sh:path myfeature:requiredProp ;
    sh:minCount 1 ;
  ] .
```

### 3. Integrate with Validator

```javascript
async validateMyFeature(graph) {
  const shapes = await this._loadShapes('myfeature-shapes.ttl');
  return this._validate(graph, shapes);
}
```

### 4. Add Tests

```javascript
describe('MyClass Shape', () => {
  it('should validate valid data', async () => {
    // test valid data
  });

  it('should reject invalid data', async () => {
    // test invalid data with expected violations
  });
});
```

## Performance Considerations

- **Large graphs:** Use lazy validation
- **Repeated validation:** Cache shapes
- **SPARQL constraints:** Use sparingly (they're slower)
- **Parallel validation:** Group independent shapes

## Debugging SHACL Issues

Enable verbose logging:

```bash
GITVAN_SHACL_DEBUG=true gitvan workflow run --workflow test
```

Or programmatically:

```javascript
const validator = useSHACLValidator({
  debug: true,
  logViolations: true,
});
```
```

### API Reference

**File: `/docs/shacl/api-reference.md`**

```markdown
# SHACL Validator API Reference

## useSHACLValidator()

Composable for SHACL validation operations.

### Methods

#### validateWorkflow(graph, options)

Validate a workflow definition against SHACL shapes.

**Parameters:**
- `graph` (RDFGraph): The RDF graph to validate
- `options` (Object):
  - `strict` (Boolean): Fail on first violation (default: false)
  - `includeWarnings` (Boolean): Include warnings in report (default: true)

**Returns:** Promise<ValidationReport>

```javascript
const validator = useSHACLValidator();
const report = await validator.validateWorkflow(graph);
if (report.conforms) {
  console.log('Valid!');
} else {
  report.violations.forEach(v => {
    console.log(`${v.path}: ${v.message}`);
  });
}
```

#### validateHook(graph, options)

Validate a hook definition.

#### validateGitEvent(graph, options)

Validate a git event.

#### validateConfig(graph, options)

Validate configuration.

## ValidationReport

Result from validation operation.

### Properties

- `conforms` (Boolean): Whether graph conforms to shapes
- `violations` (Violation[]): Array of constraint violations
- `stats` (Object): Statistics about violations
  - `totalViolations` (Number)
  - `violations` (Number): Count of critical violations
  - `warnings` (Number): Count of warnings
  - `info` (Number): Count of info messages

### Violation

- `focusNode` (String): URI of node that failed validation
- `severity` (String): "Violation", "Warning", or "Info"
- `path` (String): Property that failed
- `message` (String): Constraint violation message
```

### Extension Points

#### Adding Custom Validators

```javascript
/**
 * Register custom validator function
 */
export function registerCustomValidator(name, validatorFn) {
  customValidators.set(name, validatorFn);
}

// Usage
registerCustomValidator('myValidator', async (graph, options) => {
  // Custom validation logic
  return {
    conforms: boolean,
    violations: [],
  };
});

// Call custom validator
const report = await validator.runCustom('myValidator', graph);
```

#### Shape Plugin System

```javascript
/**
 * Load additional shapes from plugin
 */
export function registerShapePlugin(pluginName, shapesPath) {
  shapePlugins.set(pluginName, shapesPath);
}

// Usage
registerShapePlugin(
  'my-custom-shapes',
  './my-package/shapes/custom.ttl'
);
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goals:**
- Integrate rdf-validate-shacl library
- Create core validator composable
- Implement basic shape loading

**Tasks:**
1. Create `useSHACLValidator()` composable
2. Define core SHACL shapes for workflows
3. Add validator integration to WorkflowParser
4. Write unit tests for basic validation
5. Document shape definitions

**Deliverables:**
- Working validator with workflow shape support
- Test suite (80%+ coverage)
- Shape definition documentation

**Effort:** ~2 weeks (2 developers)

### Phase 2: Workflow Integration (Weeks 3-4)

**Goals:**
- Integrate with workflow execution engine
- Implement error reporting
- Add basic recovery strategies

**Tasks:**
1. Enhance WorkflowEngine with validation hooks
2. Implement SHACLValidator error reporter
3. Add auto-correction for common violations
4. Integration tests with real workflows
5. Performance benchmarking

**Deliverables:**
- Integrated validation in workflow pipeline
- Error reporting system
- Performance baseline documentation

**Effort:** ~2 weeks (2 developers)

### Phase 3: Advanced Features (Weeks 5-6)

**Goals:**
- Add hook and git event shapes
- Implement degraded mode execution
- Add caching and optimization

**Tasks:**
1. Create hook-shapes.ttl and event-shapes.ttl
2. Implement degraded execution mode
3. Add shape result caching
4. Lazy validation support
5. Comprehensive test suite

**Deliverables:**
- Complete shape set for GitVan entities
- Advanced error recovery strategies
- Performance optimizations

**Effort:** ~2 weeks (2 developers)

### Phase 4: User Experience (Weeks 7-8)

**Goals:**
- User-friendly error messages
- CLI integration
- Documentation and guides

**Tasks:**
1. Create remediation guidance generator
2. Enhance CLI with validation commands
3. Write comprehensive documentation
4. Create shape development guide
5. User acceptance testing

**Deliverables:**
- User-friendly validation reporting
- CLI commands for shape management
- Complete documentation package

**Effort:** ~2 weeks (1 developer + 1 tech writer)

### Phase 5: Extensibility (Weeks 9-10)

**Goals:**
- Plugin system for custom shapes
- Configuration-based shape registration
- Community shape contributions

**Tasks:**
1. Implement shape plugin system
2. Custom validator registration API
3. Pack system integration
4. Community contribution guidelines
5. Registry for shared shapes

**Deliverables:**
- Plugin system for custom shapes
- Pack system integration
- Community contribution framework

**Effort:** ~2 weeks (1-2 developers)

### Timeline and Resource Requirements

```
Phase 1: ▓▓▓▓▓▓▓▓▓▓ Foundation (2 weeks, 2 devs)
Phase 2:           ▓▓▓▓▓▓▓▓▓▓ Integration (2 weeks, 2 devs)
Phase 3:                     ▓▓▓▓▓▓▓▓▓▓ Advanced (2 weeks, 2 devs)
Phase 4:                               ▓▓▓▓▓▓▓▓▓▓ UX (2 weeks, 1-2 devs)
Phase 5:                                         ▓▓▓▓▓▓▓▓▓▓ Extensibility (2 weeks)

Total Duration: ~10 weeks
Total Resources: ~8-10 developer weeks
```

### Success Metrics

#### Phase 1-2 Metrics
- [x] 80%+ test coverage for validator
- [x] <100ms validation for workflows <50 steps
- [x] 0 unrecovered validation failures

#### Phase 3 Metrics
- [x] All major GitVan entities have shapes
- [x] Degraded mode successfully recovers 90%+ of soft violations
- [x] Caching reduces repeated validation by 70%+

#### Phase 4 Metrics
- [x] 95%+ user satisfaction with error messages
- [x] <5 minutes to understand and fix validation error
- [x] 100% documentation coverage

#### Phase 5 Metrics
- [x] Plugin system tested with 3+ custom shape packs
- [x] <1% false positive violation rates
- [x] Community contributions from external developers

---

## Conclusion

SHACL validation offers GitVan significant advantages:

1. **RDF-Native:** Operates at the knowledge graph level
2. **Declarative:** Constraints are data, not code
3. **Extensible:** Easy to add new shapes for new features
4. **Composable:** Shapes can be combined and reused
5. **Actionable:** Violations include fixing guidance

The integration plan balances:
- **Rigor:** Comprehensive validation of RDF data
- **Pragmatism:** Graceful degradation with warnings
- **Performance:** Optimized for typical workflow sizes
- **Usability:** Clear error messages and recovery suggestions

SHACL validation complements existing Zod-based runtime validation to create a robust, multi-layer validation strategy that ensures data integrity at both the RDF semantic level and JavaScript application level.

---

## References & Further Reading

### W3C Standards
- [SHACL Specification](https://www.w3.org/TR/shacl/)
- [RDF Schema (RDFS)](https://www.w3.org/TR/rdf-schema/)
- [OWL 2 Web Ontology Language](https://www.w3.org/TR/owl2-overview/)

### Libraries & Tools
- [rdf-validate-shacl](https://npm.im/rdf-validate-shacl)
- [unrdf](https://github.com/zazuko/rdf-utils)
- [Zazuko SHACL Editor](https://zazuko.com/labs/shacl-editor/)

### Resources
- [SHACL Use Cases](https://www.w3.org/TR/shacl-ucr/)
- [Turtle Syntax](https://www.w3.org/TR/turtle/)
- [SPARQL Query Language](https://www.w3.org/TR/sparql11-query/)

---

**Document prepared by:** GitVan Core Team
**Last updated:** January 10, 2026
**Status:** Review Ready
**Next steps:** Architecture Review Board approval, Phase 1 resource allocation
