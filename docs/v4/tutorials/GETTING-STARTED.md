# Getting Started with GitVan v4 Hooks

Learn to create and use Knowledge Hooks in 15 minutes.

---

## Prerequisites

- Node.js 18+
- Git repository
- Basic understanding of SPARQL (optional)

## Installation

```bash
# Global installation
npm install -g gitvan

# Verify installation
gitvan --version
```

---

## Quick Start

### Step 1: Initialize GitVan

```bash
cd your-project
gitvan init
```

This creates:
```
.gitvan/
  workflows/
  config.yaml
hooks/
  README.md
```

### Step 2: Create Your First Hook

Create `hooks/hello-world.ttl`:

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Hello World Hook
ex:hello-world rdf:type gh:Hook ;
    gv:title "Hello World Hook" ;
    gh:hasPredicate ex:always-true ;
    gh:orderedPipelines ex:hello-pipeline .

# ASK predicate that always triggers
ex:always-true rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE { BIND(true AS ?result) }
    """ ;
    gh:description "Always triggers for testing" .

# Simple pipeline
ex:hello-pipeline rdf:type op:Pipeline ;
    op:steps (ex:say-hello) .

# Output step
ex:say-hello rdf:type op:CLIStep ;
    gv:label "Say Hello" ;
    op:command "echo 'Hello from GitVan v4!'" .
```

### Step 3: Run the Hook

```bash
gitvan hooks list
gitvan hooks evaluate --verbose
```

Expected output:
```
Hooks evaluated: 1
Hooks triggered: 1
Workflows executed: 1
Hello from GitVan v4!
```

---

## Core Concepts

### 1. Knowledge Graph

Your project state is represented as RDF triples in `.ttl` files:

```turtle
# Project knowledge graph
gv:myProject rdf:type gv:Project ;
    gv:version "1.0.0" ;
    gv:status "active" .

gv:task1 rdf:type gv:Task ;
    gv:title "Implement feature X" ;
    gv:status "in-progress" ;
    gv:assignee gv:developer1 .
```

### 2. Predicates

Logical conditions evaluated against the graph:

```turtle
# Boolean check
ex:has-open-tasks rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            ?task rdf:type gv:Task .
            ?task gv:status "open" .
        }
    """ .

# Threshold check
ex:too-many-bugs rdf:type gh:SELECTThreshold ;
    gh:queryText """
        SELECT (COUNT(?bug) AS ?count) WHERE {
            ?bug rdf:type gv:Bug .
        }
    """ ;
    gh:threshold 10 ;
    gh:operator ">" .
```

### 3. Workflows

Sequences of steps executed when predicates trigger:

```turtle
ex:my-pipeline rdf:type op:Pipeline ;
    op:steps (ex:step1 ex:step2 ex:step3) .

ex:step1 rdf:type op:CLIStep ;
    op:command "npm run lint" .

ex:step2 rdf:type op:CLIStep ;
    op:command "npm test" ;
    op:dependsOn ex:step1 .

ex:step3 rdf:type gv:TemplateStep ;
    gv:text "Build completed at {{ now }}" ;
    gv:filePath "./build.log" ;
    op:dependsOn ex:step2 .
```

---

## Tutorial: Bug Tracker Hook

Let's build a practical hook that monitors bugs in your project.

### Step 1: Define the Knowledge Graph

Create `hooks/project-data.ttl`:

```turtle
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# Project definition
gv:myProject rdf:type gv:Project ;
    gv:name "My Awesome Project" ;
    gv:version "1.2.0" .

# Sample bugs
gv:bug1 rdf:type gv:Bug ;
    gv:title "Login fails on mobile" ;
    gv:severity "high" ;
    gv:status "open" ;
    gv:createdAt "2024-01-15"^^xsd:date .

gv:bug2 rdf:type gv:Bug ;
    gv:title "UI glitch in dashboard" ;
    gv:severity "low" ;
    gv:status "open" ;
    gv:createdAt "2024-01-18"^^xsd:date .

gv:bug3 rdf:type gv:Bug ;
    gv:title "API timeout" ;
    gv:severity "critical" ;
    gv:status "open" ;
    gv:createdAt "2024-01-20"^^xsd:date .
```

### Step 2: Create the Bug Alert Hook

Create `hooks/bug-alert.ttl`:

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Critical Bug Alert Hook
ex:critical-bug-alert rdf:type gh:Hook ;
    gv:title "Critical Bug Alert" ;
    gh:hasPredicate ex:has-critical-bugs ;
    gh:orderedPipelines ex:alert-pipeline .

# Check for critical bugs
ex:has-critical-bugs rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:severity "critical" .
            ?bug gv:status "open" .
        }
    """ ;
    gh:description "Triggers when critical bugs exist" .

# Alert pipeline
ex:alert-pipeline rdf:type op:Pipeline ;
    op:steps (ex:count-bugs ex:generate-report ex:notify) .

# Count critical bugs
ex:count-bugs rdf:type op:SPARQLStep ;
    gv:label "Count Critical Bugs" ;
    op:query """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?bug) AS ?count) ?title WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:severity "critical" .
            ?bug gv:status "open" .
            ?bug gv:title ?title .
        } GROUP BY ?title
    """ ;
    op:outputVar "criticalBugs" .

# Generate report
ex:generate-report rdf:type gv:TemplateStep ;
    gv:label "Generate Bug Report" ;
    gv:text """
# Critical Bug Report - {{ now | date('YYYY-MM-DD HH:mm') }}

## Summary
Found {{ criticalBugs.count }} critical bug(s) requiring immediate attention.

## Details
{% for bug in criticalBugs.results %}
- {{ bug.title }}
{% endfor %}

## Action Required
Please review and address these issues immediately.
""" ;
    gv:filePath "./reports/critical-bugs.md" ;
    op:dependsOn ex:count-bugs .

# Send notification
ex:notify rdf:type op:CLIStep ;
    gv:label "Send Notification" ;
    op:command "echo 'ALERT: {{ criticalBugs.count }} critical bug(s) found!'" ;
    op:dependsOn ex:generate-report .
```

### Step 3: Test the Hook

```bash
# List hooks
gitvan hooks list

# Validate hook
gitvan hooks validate critical-bug-alert

# Dry run
gitvan hooks evaluate --dry-run

# Execute
gitvan hooks evaluate --verbose
```

### Step 4: Check Results

```bash
cat reports/critical-bugs.md
```

---

## Tutorial: Version Change Detection

Create a hook that detects and responds to version changes.

### Hook Definition

Create `hooks/version-watcher.ttl`:

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Version Change Hook
ex:version-watcher rdf:type gh:Hook ;
    gv:title "Version Change Watcher" ;
    gh:hasPredicate ex:version-changed ;
    gh:orderedPipelines ex:version-pipeline .

# Detect version changes using ResultDelta
ex:version-changed rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?version WHERE {
            ?project rdf:type gv:Project .
            ?project gv:version ?version .
        }
    """ ;
    gh:description "Detects when project version changes" .

# Version change pipeline
ex:version-pipeline rdf:type op:Pipeline ;
    op:steps (ex:get-version ex:update-changelog ex:create-tag) .

# Get current version
ex:get-version rdf:type op:CLIStep ;
    gv:label "Get Version" ;
    op:command "node -p 'require(\"./package.json\").version'" ;
    op:outputVar "version" .

# Update changelog
ex:update-changelog rdf:type gv:TemplateStep ;
    gv:label "Update Changelog" ;
    gv:text """
## v{{ version }} - {{ now | date('YYYY-MM-DD') }}

- Version bump detected
- Automatically generated entry
""" ;
    gv:filePath "./CHANGELOG.md" ;
    gv:mode "prepend" ;
    op:dependsOn ex:get-version .

# Create git tag
ex:create-tag rdf:type op:CLIStep ;
    gv:label "Create Git Tag" ;
    op:command "git tag -a v{{ version }} -m 'Release v{{ version }}'" ;
    op:dependsOn ex:update-changelog .
```

---

## Next Steps

1. **[Advanced Patterns](ADVANCED-PATTERNS.md)** - Complex hook architectures and patterns
2. **[API Reference](../api/HOOK-REFERENCE.md)** - Complete API documentation
3. **[Best Practices](../api/BEST-PRACTICES.md)** - Guidelines and recommendations
4. **[Usage Examples](../api/USAGE-EXAMPLES.md)** - Practical code examples

---

## Quick Reference

### Common Commands

```bash
# List all hooks
gitvan hooks list

# Evaluate hooks
gitvan hooks evaluate

# Verbose output
gitvan hooks evaluate --verbose

# Dry run (no execution)
gitvan hooks evaluate --dry-run

# Validate hook
gitvan hooks validate <hook-id>

# Get statistics
gitvan hooks stats

# Create hook template
gitvan hooks create <name> "<title>" <predicate-type>

# Refresh registry
gitvan hooks refresh
```

### Predicate Types

| Type | Trigger Condition |
|------|-------------------|
| `ASK` | Query returns true |
| `ResultDelta` | Query results changed |
| `SELECTThreshold` | Value exceeds threshold |
| `SHACL` | Graph conforms to shapes |
| `Temporal` | Time condition met |

### Step Types

| Type | Usage |
|------|-------|
| `op:CLIStep` | Shell commands |
| `gv:TemplateStep` | Template rendering |
| `op:HTTPStep` | HTTP requests |
| `op:SPARQLStep` | Graph queries |
| `op:FileStep` | File operations |
