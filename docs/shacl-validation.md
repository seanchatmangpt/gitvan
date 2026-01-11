# SHACL Validation in GitVan

## Overview

SHACL (Shapes Constraint Language) validation provides declarative, RDF-native validation of GitVan workflows, hooks, git events, and configurations. It complements the existing Zod-based runtime validation with semantic constraint checking at the knowledge graph level.

## Quick Start

### Validate a Workflow

```bash
# Basic validation
gitvan validate workflow ./my-workflow.ttl

# Strict mode (fail on any violation)
gitvan validate workflow ./my-workflow.ttl --strict

# Verbose output
gitvan validate workflow ./my-workflow.ttl --verbose
```

### Validate Other Entities

```bash
# Validate hooks
gitvan validate hook ./my-hook.ttl

# Validate configuration
gitvan validate config ./gitvan.config.js

# Validate pack
gitvan validate pack ./pack.json

# Validate all
gitvan validate all
```

## Architecture

### Multi-Layer Validation

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

### Shape Organization

Shapes are organized by entity type in `/config/shacl/`:

- **workflow-shapes.ttl** - Workflow definitions and steps
- **hook-shapes.ttl** - Hook definitions and predicates
- **git-event-shapes.ttl** - Git event data and metadata
- **config-shapes.ttl** - Configuration values
- **pack-shapes.ttl** - Pack definitions and dependencies

## Using the SHACL Validator

### Programmatic Usage

```javascript
import { useSHACLValidator } from './src/composables/shacl-validator.mjs';

const validator = useSHACLValidator();

// Validate a workflow
const report = await validator.validateWorkflow(graph);

if (report.conforms) {
  console.log('✅ Workflow is valid');
} else {
  console.log(`⚠️ Found ${report.stats.violations} violations`);

  // Format for display
  const formatted = validator.formatErrorReport(report);
  formatted.violations.forEach(v => {
    console.error(`  - ${v.message}`);
  });
}
```

### In Workflow Execution

The SHACL validation is automatically integrated into workflow execution:

```javascript
import { enhanceWorkflowEngineWithSHACL } from './src/workflow/workflow-shacl-integration.mjs';

// Enhance engine with SHACL validation
enhanceWorkflowEngineWithSHACL(workflowEngine);

// Execute workflow with validation
const result = await workflowEngine.executeWorkflow(workflowId);
// Validation is performed automatically before execution
```

## SHACL Shapes

### Workflow Shapes

#### Base Requirements

Every workflow must have:
- `gv:id` - Unique identifier (required)
- `gv:title` - Human-readable title (required)
- `op:steps` - At least one step (required)

#### Step Type Constraints

Each step type has specific requirements:

**SPARQL Step**
```turtle
gv:SparqlStepShape a sh:NodeShape ;
  sh:targetClass gv:SparqlStep ;
  sh:property [
    sh:path gv:text ;
    sh:minCount 1 ;
    sh:minLength 10 ;
    sh:message "SPARQL step must have query text (at least 10 characters)" ;
  ] .
```

**HTTP Step**
```turtle
gv:HttpStepShape a sh:NodeShape ;
  sh:targetClass gv:HttpStep ;
  sh:property [
    sh:path gv:httpMethod ;
    sh:in ("GET" "POST" "PUT" "DELETE" "PATCH") ;
    sh:message "HTTP method must be valid REST method" ;
  ] .
```

#### DAG Validation

Workflows must form a directed acyclic graph (DAG):

```turtle
gv:AcyclicWorkflowShape a sh:NodeShape ;
  sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "Workflow contains circular dependency" ;
    sh:select """
      PREFIX gv: <https://gitvan.dev/ontology#>
      SELECT $this WHERE {
        $this gv:dependsOn* ?intermediate .
        ?intermediate gv:dependsOn+ $this .
      }
    """ ;
  ] .
```

### Hook Shapes

Hooks must have:
- `gv:title` - Non-empty title
- `gh:hasPredicate` - Exactly one predicate
- `gh:orderedPipelines` - At least one pipeline

### Git Event Shapes

Git events must have:
- `gitv:eventType` - Valid event type (pre-commit, post-push, etc.)
- `gitv:timestamp` - ISO 8601 timestamp
- Event-specific properties based on type

### Configuration Shapes

Configuration values must be within valid ranges:
- `cfg:auditRetentionDays` - Between 1 and 3650 days
- `cfg:maxConcurrency` - Between 1 and 256
- `cfg:logLevel` - One of: debug, info, warn, error

### Pack Shapes

Packs must have:
- `pack:name` - Lowercase alphanumeric with hyphens
- `pack:version` - Valid semver (e.g., 1.2.3)
- `pack:license` - Recognized SPDX identifier

## Validation Modes

### Strict Mode

Fails immediately on any violation:

```bash
gitvan validate workflow ./workflow.ttl --strict
```

Or programmatically:

```javascript
const report = await validator.validateWorkflow(graph, { strict: true });
if (!report.conforms) {
  throw new Error('Validation failed');
}
```

Environment variable:
```bash
export GITVAN_SHACL_STRICT=true
gitvan workflow run my-workflow
```

### Warning Mode (Default)

Logs warnings but continues execution:

```bash
gitvan validate workflow ./workflow.ttl
```

## Error Reporting

### Validation Report Structure

```javascript
{
  conforms: boolean,
  violations: [
    {
      focusNode: "http://example.org/step-1",
      severity: "Violation" | "Warning" | "Info",
      path: "https://gitvan.dev/ontology#text",
      message: "SPARQL step must have query text",
      sourceShape: "https://gitvan.dev/ontology#SparqlStepShape",
    }
  ],
  stats: {
    totalViolations: number,
    violations: number,     // critical only
    warnings: number,
    info: number,
  },
  timestamp: "2026-01-10T12:00:00Z",
}
```

### Formatted Error Report

```javascript
const formatted = validator.formatErrorReport(report);

// Output:
{
  success: boolean,
  summary: "1 violations, 2 warnings",
  violations: [ /* critical violations */ ],
  warnings: [ /* warnings */ ],
  info: [ /* info messages */ ],
  stats: { /* stats */ },
}
```

## Recovery Strategies

### Automatic Recovery

Some violations can be automatically corrected:

- Optional fields with missing values
- Deprecated features with migration paths
- Output mappings set to empty objects
- Timeout values set to defaults

### Degraded Mode

Workflows with non-critical violations can execute in degraded mode:

```javascript
const result = await workflowEngine.validateWorkflow(workflow);
if (result.valid === false && result.canExecute) {
  // Execute with enhanced monitoring
  await workflowEngine.executeWorkflow(workflowId, {
    degradedMode: true,
    enhancedLogging: true,
  });
}
```

### User-Guided Remediation

For violations requiring user input, detailed remediation guidance is provided:

```javascript
const formatted = validator.formatErrorReport(report);
formatted.violations.forEach(v => {
  console.log(`Issue: ${v.message}`);
  console.log(`Node: ${v.node}`);
  console.log(`Property: ${v.path}`);
});
```

## Performance Considerations

### Shape Loading

Shapes are loaded once and cached:

```javascript
// First call - loads from disk
const report1 = await validator.validateWorkflow(graph);

// Second call - uses cache
const report2 = await validator.validateWorkflow(graph);
// ~70% faster due to caching
```

### Large Workflows

For workflows with 100+ steps:

1. Use lazy validation for non-critical checks
2. Validate only modified portions in CI/CD
3. Parallelize independent constraint checks

```javascript
// Lazy validation - only validate on demand
const report = await validator.validateWorkflow(graph, {
  lazy: true,
  checkOnly: ['required_properties', 'dag']
});
```

### Optimization Tips

- Batch validations for multiple workflows
- Use warnings mode for development
- Enable strict mode for production deployments
- Cache validation results during development

## Extending SHACL Validation

### Adding Custom Shapes

1. Create shape file in `/config/shacl/`:

```turtle
@prefix myfeature: <https://gitvan.dev/myfeature#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .

myfeature:MyClassShape a sh:NodeShape ;
  sh:targetClass myfeature:MyClass ;
  sh:property [
    sh:path myfeature:requiredProp ;
    sh:minCount 1 ;
    sh:message "Property is required" ;
  ] .
```

2. Register in validator:

```javascript
const validator = useSHACLValidator();
const shapes = await validator._loadShapes('myfeature-shapes.ttl');
```

3. Validate:

```javascript
const report = await validator._validate(graph, shapes);
```

### Custom Validators

Register custom validation logic:

```javascript
async function customValidator(graph, options) {
  // Custom validation logic
  return {
    conforms: true,
    violations: [],
  };
}

// Use in validation pipeline
const reports = [
  await validator.validateWorkflow(graph),
  await customValidator(graph),
];
```

## Troubleshooting

### Validation Fails with "Shapes not found"

Ensure shape files exist in `/config/shacl/`:

```bash
ls -la config/shacl/
# Should show workflow-shapes.ttl, hook-shapes.ttl, etc.
```

### All Violations Reported as Non-Conforming

Check that RDF graphs are properly formatted:

```javascript
// Verify graph has quads
console.log(`Graph size: ${graph.size} quads`);

// Parse Turtle correctly
const quads = parseTurtle(turtleContent);
for (const quad of quads) {
  graph.addQuad(quad);
}
```

### Performance Issues

1. Check graph size:
```javascript
console.log(`Graph contains ${graph.size} quads`);
```

2. Enable caching:
```javascript
const validator = useSHACLValidator();
// Shapes cached automatically
```

3. Use lazy validation for large workflows

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GITVAN_SHACL_STRICT` | false | Fail on any violation |
| `GITVAN_SHACL_VALIDATION` | on | Enable/disable validation (on/off) |
| `GITVAN_SHACL_DEBUG` | false | Enable debug logging |

Example:

```bash
export GITVAN_SHACL_STRICT=true
export GITVAN_SHACL_DEBUG=true
gitvan workflow run my-workflow
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Validate workflows
  run: |
    gitvan validate all --strict

- name: Validate before deployment
  run: |
    gitvan validate workflow ./production-workflow.ttl --strict
```

### GitLab CI Example

```yaml
validate_workflows:
  script:
    - gitvan validate all --strict
  only:
    - merge_requests
    - main
```

## Best Practices

1. **Development**: Use warning mode to catch issues early
2. **Testing**: Use strict mode in CI/CD pipelines
3. **Production**: Use strict mode for deployments
4. **Large Workflows**: Validate incrementally during development
5. **Documentation**: Keep shapes documented with rdfs:comment
6. **Versioning**: Version SHACL shapes alongside ontologies

## Further Reading

- [SHACL Specification](https://www.w3.org/TR/shacl/)
- [RDF Specification](https://www.w3.org/RDF/)
- [Turtle Syntax](https://www.w3.org/TR/turtle/)
- [SPARQL Query Language](https://www.w3.org/TR/sparql11-query/)
