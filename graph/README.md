# Knowledge Graph

This directory contains the Knowledge Graph for your GitVan project.

## Files

- `init.ttl` - Initial project knowledge graph
- `project.ttl` - Project-specific knowledge
- `domain.ttl` - Domain-specific knowledge

## Usage

The Knowledge Graph is automatically loaded by GitVan's Knowledge Hook Engine and can be queried using SPARQL.

## Examples

```sparql
# Find all active items
PREFIX gv: <https://gitvan.dev/ontology#>
SELECT ?item ?name WHERE {
    ?item rdf:type gv:TestItem .
    ?item gv:status "active" .
    ?item gv:name ?name .
}
```

## Integration

The Knowledge Graph integrates with:
- Knowledge Hooks (predicate evaluation)
- Workflows (data processing)
- Templates (data rendering)
- AI Commands (context provision)
