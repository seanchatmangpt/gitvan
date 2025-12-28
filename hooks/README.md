# GitVan v4 Knowledge Hooks

This directory contains Knowledge Hook definitions that power intelligent, reactive automation based on changes in your project's knowledge graph.

---

## Quick Reference

### Available Hooks

| Hook | Type | Description |
|------|------|-------------|
| `version-change.ttl` | ResultDelta | Detects project version changes |
| `critical-issues.ttl` | ASK | Monitors for critical issues |
| `bug-threshold.ttl` | SELECTThreshold | Alerts when bugs exceed threshold |
| `knowledge-graph-builder.ttl` | CONSTRUCT | Builds derived knowledge |
| `resource-inspector.ttl` | ASK | Inspects resource states |

### Hook Categories

- **cron/** - Scheduled automation hooks
- **developer-workflow/** - Daily developer workflow hooks
- **jtbd-hooks/** - Jobs-to-be-Done pattern hooks
- **knowledge-hooks-suite/** - Knowledge management hooks
- **message/** - Message-triggered hooks
- **path-changed/** - File change hooks
- **push-to/** - Push event hooks
- **tag/** - Tag event hooks

---

## CLI Commands

```bash
# List all hooks
gitvan hooks list

# Evaluate all hooks
gitvan hooks evaluate

# Dry run (no execution)
gitvan hooks evaluate --dry-run

# Verbose output
gitvan hooks evaluate --verbose

# List by category
gitvan hooks list-category <category>

# Evaluate by category
gitvan hooks evaluate-category <category>

# Validate a specific hook
gitvan hooks validate <hook-id>

# Get registry statistics
gitvan hooks stats

# Create new hook template
gitvan hooks create <hook-id> [title] [predicate-type]

# Refresh registry
gitvan hooks refresh
```

---

## Creating a New Hook

### 1. Using CLI

```bash
# Create hook with ASK predicate
gitvan hooks create my-new-hook "My Hook Title" ask

# Create hook with ResultDelta predicate
gitvan hooks create version-watcher "Version Watcher" resultDelta

# Create hook with SELECTThreshold predicate
gitvan hooks create bug-alert "Bug Alert" selectThreshold
```

### 2. Manual Creation

Create a new `.ttl` file:

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Hook Definition
ex:my-hook rdf:type gh:Hook ;
    gv:title "My Hook Title" ;
    gh:hasPredicate ex:my-predicate ;
    gh:orderedPipelines ex:my-pipeline .

# Predicate - When to trigger
ex:my-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:ExampleItem .
        }
    """ ;
    gh:description "Triggers when example items exist" .

# Workflow Pipeline - What to do
ex:my-pipeline rdf:type op:Pipeline ;
    op:steps (ex:step1) .

ex:step1 rdf:type op:CLIStep ;
    gv:label "Execute Task" ;
    op:command "echo 'Hook triggered!'" .
```

### 3. Validate and Test

```bash
# Validate hook syntax
gitvan hooks validate my-hook

# Test with dry run
gitvan hooks evaluate --dry-run --verbose
```

---

## Predicate Types

### ASKPredicate

Boolean condition evaluation.

```turtle
ex:my-pred rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:severity "critical" .
        }
    """ .
```

### ResultDelta

Detects changes between commits.

```turtle
ex:my-pred rdf:type gh:ResultDelta ;
    gh:queryText """
        SELECT ?version WHERE {
            ?project gv:version ?version .
        } ORDER BY ?project
    """ .
```

### SELECTThreshold

Monitors numerical values.

```turtle
ex:my-pred rdf:type gh:SELECTThreshold ;
    gh:queryText """
        SELECT (COUNT(?bug) AS ?count) WHERE {
            ?bug rdf:type gv:Bug .
        }
    """ ;
    gh:threshold 10 ;
    gh:operator ">" .
```

### SHACLAllConform

Validates graph conformance.

```turtle
ex:my-pred rdf:type gh:SHACLAllConform ;
    gh:shapesText """
        gv:ProjectShape a sh:NodeShape ;
            sh:targetClass gv:Project ;
            sh:property [
                sh:path gv:version ;
                sh:minCount 1 ;
            ] .
    """ .
```

---

## Step Types

| Type | Description | Properties |
|------|-------------|------------|
| `op:CLIStep` | Execute shell command | `op:command`, `op:timeout` |
| `gv:TemplateStep` | Render template | `gv:text`, `gv:filePath` |
| `op:HTTPStep` | HTTP request | `op:url`, `op:method`, `op:body` |
| `op:SPARQLStep` | Query graph | `op:query`, `op:outputVar` |
| `op:FileStep` | File operations | `op:operation`, `op:source` |

---

## Directory Structure

```
hooks/
  README.md              # This file
  version-change.ttl     # Example: Version change detection
  critical-issues.ttl    # Example: Critical issue monitoring
  bug-threshold.ttl      # Example: Bug threshold alerts
  cron/                  # Scheduled hooks
    daily-cleanup.ttl
  developer-workflow/    # Developer workflow hooks
    start-of-day.ttl
    end-of-day.ttl
  jtbd-hooks/            # Jobs-to-be-Done hooks
    core-development/
    security-compliance/
```

---

## Best Practices

1. **One hook, one purpose** - Keep hooks focused
2. **Use descriptive names** - `critical-bug-alert.ttl` not `hook1.ttl`
3. **Add labels** - Use `gv:label` for step descriptions
4. **Set timeouts** - Always set `op:timeout` for CLI steps
5. **Order query results** - Use `ORDER BY` in ResultDelta queries
6. **Validate before commit** - Run `gitvan hooks validate`

---

## Documentation

For comprehensive documentation, see:

- [GitVan v4 Documentation](../docs/v4/README.md)
- [Hook Reference](../docs/v4/api/HOOK-REFERENCE.md)
- [Usage Examples](../docs/v4/api/USAGE-EXAMPLES.md)
- [Best Practices](../docs/v4/api/BEST-PRACTICES.md)
- [Troubleshooting](../docs/v4/TROUBLESHOOTING.md)

---

## Support

- [GitHub Issues](https://github.com/seanchatmangpt/gitvan/issues)
- [FAQ](../docs/v4/FAQ.md)
