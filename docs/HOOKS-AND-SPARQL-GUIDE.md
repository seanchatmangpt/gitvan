# Reactive Hooks & SPARQL Guide

**Version:** 3.0.0
**Purpose:** Comprehensive guide to GitVan's knowledge hooks and SPARQL-driven automation

---

## What Are Reactive Hooks?

Reactive hooks are **Git events that trigger SPARQL queries**, which evaluate conditions against your RDF knowledge graph. When conditions match, workflows execute automatically.

```
Git Event → RDF Graph Updated → SPARQL Predicate Evaluated → Workflow Triggered
```

Unlike traditional Git hooks (which are just scripts), reactive hooks are **semantic** - they reason about your project's structure and state.

---

## The 8 Hook Predicate Types

### 1. ResultDelta: Change Detection (Most Common)

**Triggers when:** Query results differ from previous state

```turtle
ex:task-completion-detector rdf:type gh:ResultDelta ;
  gh:queryText """
    SELECT ?task ?title WHERE {
      ?task rdf:type gv:Task .
      ?task gv:status "completed" .
      ?task gv:title ?title .
    }
  """ ;
  gh:description "Triggers when task completion state changes" .
```

**How it works:**
1. Execute SELECT query on current graph
2. Execute same SELECT on previous commit's graph
3. Hash both result sets
4. If hashes differ → Hook triggers

**Use cases:**
- Detect when bugs are fixed
- Monitor task completion
- Track code structure changes
- Detect new dependencies added

### 2. ASK: Boolean Conditions

**Triggers when:** SPARQL ASK query returns TRUE

```turtle
ex:enforce-branch-rules rdf:type gh:ASKPredicate ;
  gh:queryText """
    ASK WHERE {
      ?branch rdf:type git:Branch ;
              git:isCurrent true ;
              git:branchName ?name .
      FILTER(
        !REGEX(?name, "^(feature|bugfix|hotfix|release)/[a-z0-9-]+$", "i") &&
        !(?name IN ("main", "master", "develop"))
      )
    }
  """ ;
  gh:description "Enforce branch naming convention" .
```

**Use cases:**
- Validate branch names
- Check for critical items
- Verify compliance rules
- Assert project constraints

### 3. SELECTThreshold: Numeric Monitoring

**Triggers when:** SELECT query result crosses threshold

```turtle
ex:bug-threshold-monitor rdf:type gh:SELECTThreshold ;
  gh:queryText """
    SELECT (COUNT(?bug) AS ?bugCount) WHERE {
      ?bug rdf:type gv:Bug .
      ?bug gv:status "open" .
      ?bug gv:priority ?priority .
      FILTER(?priority IN ("high", "critical"))
    }
  """ ;
  gh:threshold 10 ;
  gh:operator ">" ;
  gh:description "Alert when >10 high-priority bugs open" .
```

**Operators:** `>`, `>=`, `<`, `<=`, `==`, `!=`

**Use cases:**
- Monitor open bugs
- Track technical debt
- Enforce team size limits
- Control test coverage

### 4. SHACL: Shape Validation

**Triggers when:** RDF graph violates SHACL shape

```turtle
ex:project-shape-validator rdf:type gh:SHACLAllConform ;
  gh:shapesText """
    gv:ProjectShape a sh:NodeShape ;
      sh:targetClass gv:Project ;
      sh:property [
        sh:path gv:name ;
        sh:minCount 1 ;
        sh:datatype xsd:string ;
      ] ;
      sh:property [
        sh:path gv:owner ;
        sh:minCount 1 ;
      ] .
  """ ;
  gh:description "Validate project structure conformance" .
```

**Use cases:**
- Enforce schema conformance
- Validate data completeness
- Ensure data types
- Prevent invalid states

### 5. CONSTRUCT: Dynamic Graph Building

**Triggers when:** CONSTRUCT query generates new knowledge

```turtle
ex:component-mapper rdf:type gh:CONSTRUCTPredicate ;
  gh:queryText """
    CONSTRUCT {
      ?file rdf:type gv:SourceFile .
      ?file gv:hasComponent ?component .
      ?component rdf:type gv:Component .
      ?component gv:hasDependency ?dependency .
      ?dependency rdf:type gv:Dependency .
    } WHERE {
      ?file rdf:type gv:SourceFile ;
            gv:filePath ?path .
      FILTER(CONTAINS(?path, ".js") || CONTAINS(?path, ".ts"))

      BIND(IRI(CONCAT("https://gitvan.dev/component/",
        REPLACE(?path, ".*/([^/]+)\\.[^.]+$", "$1"))) AS ?component)

      OPTIONAL {
        ?file gv:hasImport ?import .
        BIND(IRI(CONCAT("https://gitvan.dev/dependency/", ?import)) AS ?dependency)
      }
    }
  """ ;
  gh:description "Build component knowledge graph from source files" .
```

**Use cases:**
- Auto-discover components
- Build dependency graphs
- Extract code structure
- Generate documentation

### 6. DESCRIBE: Resource Properties

**Triggers when:** DESCRIBE query finds specific resources

```turtle
ex:changed-file-analyzer rdf:type gh:DESCRIBEPredicate ;
  gh:queryText """
    DESCRIBE ?changedFile WHERE {
      ?changedFile rdf:type git:ChangedFile ;
                   git:path ?path .
      FILTER(CONTAINS(?path, ".mjs"))
    }
  """ ;
  gh:description "Analyze properties of changed JavaScript files" .
```

**Use cases:**
- Get all properties of resources
- Inspect file metadata
- Analyze entity relationships
- Debug graph structure

### 7. Federated: Multi-Source Queries

**Triggers when:** Remote SPARQL endpoints match conditions

```turtle
ex:multi-repo-validator rdf:type gh:FederatedPredicate ;
  gh:endpoints [
    { gh:url "https://repo1.example.com/sparql" ;
      gh:timeout 5000 } ,
    { gh:url "https://repo2.example.com/sparql" ;
      gh:timeout 5000 }
  ] ;
  gh:queryText """
    SELECT ?dependency WHERE {
      ?dependency rdf:type ex:SharedDependency .
      ?dependency ex:inUse true .
    }
  """ ;
  gh:description "Query across multiple repositories" .
```

**Use cases:**
- Query multiple repositories
- Aggregate project status
- Cross-team metrics
- Federated governance

### 8. Temporal: Time-Based Conditions

**Triggers when:** Time-window conditions met

```turtle
ex:overdue-tasks-detector rdf:type gh:TemporalPredicate ;
  gh:queryText """
    SELECT ?task WHERE {
      ?task rdf:type gv:Task .
      ?task gv:dueDate ?date .
      FILTER(?date < NOW())
    }
  """ ;
  gh:timeWindow 3600000 ;
  gh:description "Trigger for overdue tasks (1 hour window)" .
```

**Use cases:**
- Monitor deadlines
- Time-based alerts
- Periodic checks
- Window-based aggregation

---

## Hook Definition Format (Turtle)

### Complete Hook Example

```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

:PreCommitQuality a hook:Hook ;
  rdfs:label "Pre-commit Code Quality" ;
  rdfs:comment "Enforce code quality before commit" ;
  hook:version "1.0.0" ;
  hook:author "team@example.com" ;
  hook:tags ("quality", "pre-commit", "linting") ;

  hook:hasPredicate :quality-check-predicate ;
  hook:orderedPipelines ( :lint-step :test-step :report-step ) .

:quality-check-predicate rdf:type hook:ASKPredicate ;
  hook:queryText """
    ASK WHERE {
      ?file rdf:type git:ChangedFile ;
            git:filePath ?path .
      FILTER(CONTAINS(?path, ".js") || CONTAINS(?path, ".ts"))
    }
  """ .

:lint-step a :LintStep ;
  hook:name "eslint" ;
  hook:command "npm run lint" ;
  hook:timeout 30000 ;
  hook:onError "warn" .

:test-step a :TestStep ;
  hook:name "vitest" ;
  hook:command "npm test" ;
  hook:timeout 60000 ;
  hook:dependsOn :lint-step ;
  hook:onError "error" .

:report-step a :ReportStep ;
  hook:name "quality-report" ;
  hook:template "quality-report.njk" ;
  hook:outputPath "./reports/quality.html" ;
  hook:dependsOn :test-step .
```

---

## Workflow Pipeline Structure

### Pipeline Steps

**1. SPARQL Steps** - Query knowledge graph

```turtle
ex:analyze-code-structure rdf:type gv:SparqlStep ;
  gv:text """
    SELECT ?file ?component WHERE {
      ?file rdf:type gv:SourceFile ;
            gv:filePath ?path .
      FILTER(CONTAINS(?path, ".js"))
      BIND(IRI(CONCAT("file://", ?path)) AS ?file)
      BIND(REGEX(?path, ".*/([^/]+)/") AS ?component)
    }
  """ ;
  gv:outputMapping '{"components": "results"}' .
```

**2. Template Steps** - Render and save output

```turtle
ex:generate-report rdf:type gv:TemplateStep ;
  gv:text """
    # Code Analysis Report
    Generated: {% now 'utc' %}

    ## Components Found
    {% for component in components %}
    - {{ component.name }}
    {% endfor %}
  """ ;
  gv:filePath "./reports/analysis-{{ 'now' | date('YYYY-MM-DD') }}.md" ;
  gv:dependsOn ex:analyze-code-structure .
```

**3. Shell Steps** - Execute commands

```turtle
ex:run-build rdf:type gv:ShellStep ;
  gv:command "npm run build" ;
  gv:timeout 120000 ;
  gv:onError "stop" ;
  gv:dependsOn ex:generate-report .
```

**4. HTTP Steps** - Make API requests

```turtle
ex:notify-team rdf:type gv:HttpStep ;
  gv:httpUrl "https://api.slack.com/hooks/..." ;
  gv:httpMethod "POST" ;
  gv:headers '{"Content-Type": "application/json"}' ;
  gv:body '{"text": "Build completed"}' ;
  gv:timeout 10000 ;
  gv:dependsOn ex:run-build .
```

**5. Action Steps** - Conditional actions

```turtle
ex:block-if-failed rdf:type gv:ActionStep ;
  gv:actionType "block-commit" ;
  gv:condition "!buildSuccess" ;
  gv:errorMessage "Build failed - commit blocked" ;
  gv:exitCode 1 .
```

### Step Execution (DAG)

```
Step 1: analyze-code-structure (SPARQL)
    ↓
Step 2: generate-report (TEMPLATE)
    ↓
Step 3: run-build (SHELL)
    ├─→ Step 3a: notify-team (HTTP)
    └─→ Step 3b: block-if-failed (ACTION)
```

---

## Real-World Hook Patterns

### Pattern 1: Branch Naming Enforcement

**Scenario:** Enforce that all branches follow naming convention

```turtle
@prefix : <http://example.com/hooks#> .

:enforce-branch-naming a hook:Hook ;
  rdfs:label "Enforce Branch Naming" ;
  hook:hasPredicate :invalid-branch-predicate ;
  hook:orderedPipelines ( :generate-error-message :block-commit ) .

:invalid-branch-predicate rdf:type hook:ASKPredicate ;
  hook:queryText """
    ASK WHERE {
      ?branch rdf:type git:Branch ;
              git:isCurrent true ;
              git:branchName ?name .
      FILTER(
        !REGEX(?name, "^(feature|bugfix|hotfix|release)/[a-z0-9-]+$", "i") &&
        !(?name IN ("main", "master", "develop"))
      )
    }
  """ .

:generate-error-message rdf:type gv:TemplateStep ;
  gv:text "Branch name does not follow convention: feature/, bugfix/, hotfix/, release/" ;
  gv:filePath "/tmp/error.txt" .

:block-commit rdf:type gv:ActionStep ;
  gv:actionType "block-commit" ;
  gv:errorMessage "Invalid branch name" .
```

### Pattern 2: Critical Issues Monitor

**Scenario:** Block commits if >5 critical bugs open

```turtle
@prefix : <http://example.com/hooks#> .

:critical-bugs-monitor a hook:Hook ;
  rdfs:label "Monitor Critical Bugs" ;
  hook:hasPredicate :has-critical-bugs ;
  hook:orderedPipelines ( :report-bugs :maybe-block ) .

:has-critical-bugs rdf:type hook:SELECTThreshold ;
  hook:queryText """
    SELECT (COUNT(?bug) AS ?count) WHERE {
      ?bug rdf:type gv:Bug ;
           gv:severity "critical" ;
           gv:status "open" .
    }
  """ ;
  hook:threshold 5 ;
  hook:operator ">" .

:report-bugs rdf:type gv:SparqlStep ;
  gv:text """
    SELECT ?bug ?title ?assignee WHERE {
      ?bug rdf:type gv:Bug ;
           gv:severity "critical" ;
           gv:status "open" ;
           gv:title ?title .
      OPTIONAL { ?bug gv:assignee ?assignee }
    }
  """ .

:maybe-block rdf:type gv:ActionStep ;
  gv:actionType "block-commit" ;
  gv:condition "count > 5" ;
  gv:errorMessage "Too many critical bugs ({count}) - commit blocked" .
```

### Pattern 3: Knowledge Graph Auto-Builder

**Scenario:** Auto-generate component dependency graph

```turtle
@prefix : <http://example.com/hooks#> .

:auto-build-dependency-graph a hook:Hook ;
  rdfs:label "Auto-Build Dependency Graph" ;
  hook:hasPredicate :js-files-changed ;
  hook:orderedPipelines ( :analyze-dependencies :save-graph ) .

:js-files-changed rdf:type hook:ASKPredicate ;
  hook:queryText """
    ASK WHERE {
      ?file rdf:type git:ChangedFile ;
            git:path ?path .
      FILTER(CONTAINS(?path, ".js") || CONTAINS(?path, ".ts"))
    }
  """ .

:analyze-dependencies rdf:type hook:SparqlStep ;
  gv:text """
    CONSTRUCT {
      ?file rdf:type gv:SourceFile .
      ?file gv:hasComponent ?component .
      ?component rdf:type gv:Component .
      ?component gv:hasDependency ?dependency .
    } WHERE {
      ?file rdf:type gv:SourceFile ;
            gv:filePath ?path .
      FILTER(CONTAINS(?path, ".js") || CONTAINS(?path, ".ts"))
      BIND(IRI(CONCAT("component:", REGEX(?path, ".*/"))) AS ?component)
      ?file gv:hasImport ?import .
      BIND(IRI(CONCAT("dependency:", ?import)) AS ?dependency)
    }
  """ .

:save-graph rdf:type gv:TemplateStep ;
  gv:text "@prefix gv: <http://example.com/ontology#> . (from previous step)" ;
  gv:filePath "./graph/components-{{ 'now' | date('YYYY-MM-DD') }}.ttl" .
```

### Pattern 4: Scrum Event Triggers

**Scenario:** Notify team when sprint status changes

```turtle
@prefix : <http://example.com/hooks#> .
@prefix scrum: <http://example.com/scrum#> .

:sprint-status-change a hook:Hook ;
  rdfs:label "Sprint Status Change Monitor" ;
  hook:hasPredicate :sprint-changed ;
  hook:orderedPipelines ( :get-sprint-details :notify-team ) .

:sprint-changed rdf:type hook:ResultDelta ;
  hook:queryText """
    SELECT ?sprint ?status WHERE {
      ?sprint rdf:type scrum:Sprint ;
              scrum:status ?status .
    }
  """ .

:get-sprint-details rdf:type gv:SparqlStep ;
  gv:text """
    SELECT ?sprintName ?status ?itemsCompleted ?totalItems WHERE {
      ?sprint rdf:type scrum:Sprint ;
              scrum:name ?sprintName ;
              scrum:status ?status .
      {
        SELECT ?sprint (COUNT(?item) AS ?itemsCompleted) WHERE {
          ?sprint scrum:hasItem ?item .
          ?item scrum:status "done" .
        } GROUP BY ?sprint
      }
      {
        SELECT ?sprint (COUNT(?item) AS ?totalItems) WHERE {
          ?sprint scrum:hasItem ?item .
        } GROUP BY ?sprint
      }
    }
  """ .

:notify-team rdf:type gv:HttpStep ;
  gv:httpUrl "https://slack.com/api/chat.postMessage" ;
  gv:httpMethod "POST" ;
  gv:body """
    {
      "channel": "#engineering",
      "text": "Sprint {{sprintName}}: {{status}} - {{itemsCompleted}}/{{totalItems}} items complete"
    }
  """ .
```

---

## SPARQL Query Techniques

### 1. Filtering by Type

```sparql
SELECT ?item WHERE {
  ?item rdf:type gv:Bug .  -- Select all bugs
  ?item gv:status "open" .
}
```

### 2. Aggregation & Grouping

```sparql
SELECT ?author (COUNT(?commit) AS ?commitCount) WHERE {
  ?commit rdf:type git:Commit ;
          git:author ?author .
} GROUP BY ?author
ORDER BY DESC(?commitCount)
```

### 3. Optional Properties

```sparql
SELECT ?bug ?title ?assignee WHERE {
  ?bug rdf:type gv:Bug ;
       gv:title ?title .
  OPTIONAL { ?bug gv:assignee ?assignee }
  -- Returns bugs even if unassigned
}
```

### 4. UNION for Compatibility

```sparql
SELECT ?hook WHERE {
  { ?hook a gh:Hook ; rdfs:label ?label }
  UNION
  { ?hook a hook:Hook ; hook:title ?label }
  -- Works with both ontology versions
}
```

### 5. BIND for Computed Values

```sparql
SELECT ?file ?fileName WHERE {
  ?file rdf:type gv:SourceFile ;
        gv:filePath ?path .
  BIND(REGEX(?path, ".*/([^/]+)$") AS ?fileName)
}
```

### 6. Complex Filters

```sparql
SELECT ?file WHERE {
  ?file rdf:type gv:SourceFile ;
        gv:filePath ?path .
  FILTER(
    (CONTAINS(?path, ".js") || CONTAINS(?path, ".ts")) &&
    !CONTAINS(?path, "node_modules") &&
    !CONTAINS(?path, "dist")
  )
}
```

### 7. Subqueries

```sparql
SELECT ?author ?totalCommits WHERE {
  {
    SELECT ?author (COUNT(?commit) AS ?totalCommits) WHERE {
      ?commit git:author ?author .
    } GROUP BY ?author
  }
  FILTER(?totalCommits > 10)
}
```

---

## Debugging Hooks

### Check Hook Status

```bash
gitvan hook status
  # Lists all hooks and their state
```

### Validate Turtle Syntax

```bash
gitvan turtle validate hooks/my-hook.ttl
  # Checks if Turtle is syntactically correct
```

### Test SPARQL Query

```bash
gitvan graph query "SELECT ?bug WHERE { ?bug rdf:type gv:Bug }"
  # Execute query directly against graph
```

### Dry-run Hook

```bash
gitvan hook test --hook enforce-branch-naming
  # Test hook without executing actions
```

### View Execution History

```bash
gitvan hook history --hook enforce-branch-naming --limit 10
  # See last 10 executions of a hook
```

---

## Best Practices

### ✅ DO

- **Use meaningful labels** - Help team understand hook purpose
- **Start simple** - Begin with ASK predicates
- **Test predicates** - Validate SPARQL before deploying
- **Document queries** - Comments in SPARQL explain logic
- **Version hooks** - Track hook changes like code
- **Log decisions** - Explain why conditions trigger
- **Monitor impact** - Track hook execution statistics

### ❌ DON'T

- **Overly complex queries** - Keep SPARQL readable
- **Long-running operations** - Set appropriate timeouts
- **Blocking on external APIs** - Use timeouts and fallbacks
- **Silent failures** - Always report what happened
- **Breaking changes** - Communicate predicate changes
- **Hardcoded values** - Use graph data instead
- **Mix concerns** - Keep hooks focused on one task

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Hook not triggering | Predicate returns false | Test query: `gitvan graph query "..."`  |
| SPARQL syntax error | Invalid SPARQL | Validate with query analyzer |
| Hook executes constantly | ResultDelta always different | Check for non-deterministic values |
| Timeout on hook | Long-running operation | Increase timeout or simplify |
| Query returns empty | Wrong namespace | Check git-ontology.ttl prefixes |
| Hook logic not working | Context issues | Wrap operations in `withGitVan()` |

---

## Resources

### Official Standards
- **[SPARQL 1.1 Spec](https://www.w3.org/TR/sparql11-query/)** - W3C specification
- **[Turtle Syntax](https://www.w3.org/TR/turtle/)** - RDF syntax spec
- **[SHACL Spec](https://www.w3.org/TR/shacl/)** - Shape validation spec

### GitVan References
- **[UnRDF Architecture](./UNRDF-ARCHITECTURE.md)** - Technical deep-dive
- **[API Reference](./api/composables.md)** - Composable APIs
- **[Examples](../examples/)** - Working hook examples

---

**Last Updated:** January 9, 2026
**For:** GitVan v3.0.0
**Maintained by:** Development Team
