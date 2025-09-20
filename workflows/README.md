# Workflows

This directory contains Workflow definitions for automated data processing and task execution.

## Available Workflows

- `data-processing.ttl` - Processes data changes and generates reports

## Usage

```bash
# List available workflows
gitvan workflow list

# Run a specific workflow
gitvan workflow run data-processing-workflow

# Validate a workflow
gitvan workflow validate data-processing-workflow
```

## Workflow Steps

- **SparqlStep** - Execute SPARQL queries
- **TemplateStep** - Process templates with data
- **FileStep** - File operations
- **HttpStep** - HTTP requests
- **GitStep** - Git operations

## Dependencies

Workflows support step dependencies to ensure proper execution order.
