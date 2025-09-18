# Knowledge Hook Engine Examples

This directory contains example hook definitions that demonstrate the capabilities of the Knowledge Hook Engine. These examples showcase the four types of intelligent "sensors" that can trigger automated workflows.

## Hook Structure

Knowledge Hooks are defined in Turtle (.ttl) format using GitVan's ontology. Each hook consists of:

1. **Hook Definition**: The main hook with its predicate
2. **Predicate Logic**: The intelligent "sensor" that determines when to trigger
3. **Workflow Steps**: Actions to execute when the hook fires
4. **Dependencies**: Step dependencies and execution order

## Predicate Types (Intelligent Sensors)

### 1. ResultDelta Predicate - "State Change" Sensor
Detects changes in query result sets between commits.

**What it senses**: Has a specific piece of knowledge changed?
**Real-world example**: "Has the project version changed since the last commit?"

### 2. ASK Predicate - "Condition" Sensor  
Evaluates binary conditions using SPARQL ASK queries.

**What it senses**: Is a specific condition currently true or false?
**Real-world example**: "Are there any critical issues in the system?"

### 3. SELECTThreshold Predicate - "Threshold" Sensor
Monitors numerical values and triggers when they cross defined thresholds.

**What it senses**: Has a key metric crossed a business-critical threshold?
**Real-world example**: "Has the bug count exceeded 25?"

### 4. SHACLAllConform Predicate - "Integrity" Sensor
Validates graph conformance against SHACL shapes.

**What it senses**: Does the data conform to our required quality standards?
**Real-world example**: "Does every employee have a valid manager?"

## Example Hooks

### 1. Version Change Detection (`version-change.ttl`)
Demonstrates ResultDelta predicate for detecting project version changes.

### 2. Critical Issue Alert (`critical-issues.ttl`)
Demonstrates ASK predicate for monitoring critical issues.

### 3. Bug Threshold Monitor (`bug-threshold.ttl`)
Demonstrates SELECTThreshold predicate for monitoring bug counts.

### 4. Data Quality Check (`data-quality.ttl`)
Demonstrates SHACL predicate for validating data integrity.

## Hook Definition Format

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Hook Definition
ex:version-change-hook rdf:type gh:Hook ;
    gv:title "Version Change Detection" ;
    gh:hasPredicate ex:version-change-predicate ;
    gh:orderedPipelines ex:version-change-pipeline .

# ResultDelta Predicate
ex:version-change-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?version WHERE {
            ?project gv:version ?version .
        }
    """ .

# Workflow Pipeline
ex:version-change-pipeline rdf:type op:Pipeline ;
    op:steps ex:notify-team, ex:update-docs, ex:create-release .

# Workflow Steps
ex:notify-team rdf:type gv:HttpStep ;
    gv:httpUrl "https://hooks.slack.com/services/YOUR/WEBHOOK" ;
    gv:httpMethod "POST" ;
    gv:body '{"text": "Version changed to {{ version }}"}' .

ex:update-docs rdf:type gv:TemplateStep ;
    gv:text "Updated to version {{ version }}" ;
    gv:filePath "./CHANGELOG.md" .

ex:create-release rdf:type gv:GitStep ;
    gv:gitCommand "git tag v{{ version }}" ;
    gv:dependsOn ex:update-docs .
```

## Usage

To run hook evaluation:

```bash
# List available hooks
gitvan hooks list

# Evaluate all hooks
gitvan hooks evaluate

# Evaluate with dry run
gitvan hooks evaluate --dry-run

# Evaluate with verbose output
gitvan hooks evaluate --verbose

# Validate a specific hook
gitvan hooks validate version-change-hook
```

## Advanced Features

### Context Passing
Hooks can pass context from predicate evaluation to workflow execution:

```turtle
# Predicate provides context
gh:queryText """
    PREFIX gv: <https://gitvan.dev/ontology#>
    SELECT ?version ?project WHERE {
        ?project gv:version ?version .
    }
""" .

# Workflow uses context
gv:body '{"text": "Project {{ project }} updated to version {{ version }}"}' .
```

### Complex Predicates
Predicates can be sophisticated logical queries:

```turtle
# Complex threshold monitoring
gh:queryText """
    PREFIX gv: <https://gitvan.dev/ontology#>
    SELECT (COUNT(?bug) AS ?bugCount) WHERE {
        ?bug rdf:type gv:Bug .
        ?bug gv:status "open" .
        ?bug gv:severity "critical" .
    }
""" ;
gh:threshold 5 ;
gh:operator ">" .
```

### Multi-Step Workflows
Workflows can have complex dependencies and parallel execution:

```turtle
ex:step1 rdf:type gv:SparqlStep ;
    gv:text "SELECT ?data WHERE { ?data gv:status 'pending' }" .

ex:step2 rdf:type gv:TemplateStep ;
    gv:dependsOn ex:step1 ;
    gv:text "Processing {{ data | length }} items" .

ex:step3 rdf:type gv:HttpStep ;
    gv:dependsOn ex:step2 ;
    gv:httpUrl "https://api.example.com/notify" .
```

## Best Practices

1. **Meaningful Predicates**: Design predicates that capture meaningful business logic
2. **Efficient Queries**: Optimize SPARQL queries for performance
3. **Clear Context**: Provide clear context from predicates to workflows
4. **Error Handling**: Include error handling in workflow steps
5. **Documentation**: Document hook purpose and expected behavior

## Integration with GitVan

The Knowledge Hook Engine integrates seamlessly with GitVan's RDF Composable Architecture:

- **useTurtle**: Loads and parses hook definitions
- **useGraph**: Executes predicate queries and workflow steps
- **RdfEngine**: Provides SPARQL, SHACL, and serialization capabilities

This creates a powerful system where automation is driven by changes in the logical state of your domain knowledge, not just simple file changes or commit messages.
