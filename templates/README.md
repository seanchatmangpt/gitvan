# Templates

This directory contains Nunjucks templates for generating content from your Knowledge Graph data.

## Available Templates

- `project-status.njk` - Project status report
- `example.njk` - Basic example template

## Usage

Templates are processed by:
- Workflow steps (TemplateStep)
- Hook actions
- Manual processing

## Data Sources

Templates can access:
- Project configuration data
- Knowledge graph data (via SPARQL)
- Workflow execution results
- Hook evaluation context

## Filters

Available Nunjucks filters:
- `| date(format)` - Date formatting
- `| length` - Array/object length
- `| tojson` - JSON serialization
- `| upper` - Uppercase conversion
- `| lower` - Lowercase conversion
