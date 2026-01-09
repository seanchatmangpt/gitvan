# RDF and SPARQL Query Guide

**Version**: v4.0.1
**Last Updated**: January 9, 2026
**Target Audience**: Developers using semantic graphs and RDF queries

---

## Table of Contents

1. [RDF Fundamentals](#rdf-fundamentals)
2. [Turtle Format](#turtle-format)
3. [GitVan RDF Schema](#gitvan-rdf-schema)
4. [SPARQL Query Basics](#sparql-query-basics)
5. [Common SPARQL Patterns](#common-sparql-patterns)
6. [Graph Operations](#graph-operations)
7. [Advanced Queries](#advanced-queries)
8. [Performance Optimization](#performance-optimization)
9. [Integration Examples](#integration-examples)
10. [Troubleshooting](#troubleshooting)

---

## RDF Fundamentals

### What is RDF?

RDF (Resource Description Framework) represents knowledge as subject-predicate-object triples:

```
Subject  → Predicate  → Object
Commit   → hasAuthor  → Developer
Branch   → pointsTo   → Commit
Repository → contains  → Branch
```

### Triple Structure

Each RDF statement is a triple:

```turtle
# Subject         Predicate      Object
<commit/abc>      git:author     "Alice" .
<branch/main>     git:pointsTo   <commit/abc> .
<repo/gitvan>     git:hasVersion "4.0.1" .
```

### Graph Visualization

```
    Repository (gitvan)
         |
         ├─→ Branch (main)
         │      └─→ Commit (abc)
         │           └─→ Author (Alice)
         │
         └─→ Branch (develop)
                └─→ Commit (def)
                     └─→ Author (Bob)
```

---

## Turtle Format

### Turtle Syntax Overview

Turtle (Terse RDF Triple Language) is a compact RDF serialization:

```turtle
@prefix git: <http://example.com/git/> .
@prefix repo: <http://example.com/repo/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

# Define resource
repo:gitvan
  a git:Repository ;                    # Type declaration
  git:name "GitVan" ;                   # String property
  git:version "4.0.1" ;
  git:license <http://opensource.org/licenses/MIT> ;
  git:hasBranch repo:gitvan-main, repo:gitvan-develop .

# Main branch
repo:gitvan-main
  a git:Branch ;
  git:name "main" ;
  git:pointsTo repo:commit-abc123 .

# Commit
repo:commit-abc123
  a git:Commit ;
  git:message "Release v4.0.1" ;
  git:author repo:author-alice ;
  git:timestamp "2026-01-09T10:30:00Z" ;
  git:hash "abc123def456" .

# Author
repo:author-alice
  a foaf:Person ;
  foaf:name "Alice Developer" ;
  foaf:email "alice@example.com" .
```

### Turtle Syntax Elements

| Element | Example | Meaning |
|---------|---------|---------|
| **Prefix** | `@prefix git: <http://...>` | Namespace shorthand |
| **Resource** | `repo:gitvan` | Named entity |
| **Type** | `a git:Repository` | Instance type |
| **Property** | `git:name "value"` | Attribute |
| **String** | `"literal text"` | Text value |
| **Number** | `42` or `3.14` | Numeric value |
| **Boolean** | `true` or `false` | Boolean value |
| **Date** | `"2026-01-09T..."` | ISO 8601 timestamp |
| **URI** | `<http://...>` | Full IRI |
| **Reference** | `repo:other` | Link to another resource |
| **List** | `(item1 item2 item3)` | Ordered collection |

---

## GitVan RDF Schema

### Core Ontology

GitVan uses a Git-focused RDF schema defined in `/src/rdf/git-ontology.ttl`:

```turtle
@prefix git: <http://example.com/git/> .

# Repository
git:Repository a rdfs:Class ;
  rdfs:label "A Git repository" ;
  rdfs:comment "Root Git resource" .

# Branch
git:Branch a rdfs:Class ;
  rdfs:label "A Git branch" ;
  rdfs:comment "Named branch reference" .

# Commit
git:Commit a rdfs:Class ;
  rdfs:label "A Git commit" ;
  rdfs:comment "Version control point" ;
  git:hasProperties (
    git:message
    git:author
    git:timestamp
    git:hash
    git:parentCommit
  ) .

# Tag
git:Tag a rdfs:Class ;
  rdfs:label "A Git tag" ;
  rdfs:comment "Named reference to specific commit" .

# Properties
git:name a rdf:Property ;
  rdfs:domain (git:Repository git:Branch git:Tag) ;
  rdfs:range xsd:string .

git:author a rdf:Property ;
  rdfs:domain git:Commit ;
  rdfs:range foaf:Person .

git:timestamp a rdf:Property ;
  rdfs:domain git:Commit ;
  rdfs:range xsd:dateTime .

git:message a rdf:Property ;
  rdfs:domain git:Commit ;
  rdfs:range xsd:string .

git:pointsTo a rdf:Property ;
  rdfs:domain (git:Branch git:Tag) ;
  rdfs:range git:Commit .

git:parentCommit a rdf:Property ;
  rdfs:domain git:Commit ;
  rdfs:range git:Commit .
```

### Using the Schema

```javascript
import { useGraph, useTurtle } from 'gitvan';

await withGitVan(context, async () => {
  const graph = useGraph();
  const turtle = useTurtle();

  // Load GitVan ontology
  const ontology = await turtle.parse(await readFile('src/rdf/git-ontology.ttl'));

  // Create RDF instance
  const repositoryTriples = [
    { subject: 'repo:gitvan', predicate: 'rdf:type', object: 'git:Repository' },
    { subject: 'repo:gitvan', predicate: 'git:name', object: '"GitVan"' },
    { subject: 'repo:gitvan', predicate: 'git:version', object: '"4.0.1"' }
  ];

  // Add to graph
  await graph.addTriples(repositoryTriples);
});
```

---

## SPARQL Query Basics

### What is SPARQL?

SPARQL (Simple Protocol and RDF Query Language) queries RDF graphs with SQL-like syntax:

```sparql
PREFIX git: <http://example.com/git/>

SELECT ?branch ?lastCommit
WHERE {
  ?branch a git:Branch ;
    git:pointsTo ?lastCommit .
}
```

### Basic Query Structure

```sparql
PREFIX prefix: <namespace>

SELECT ?variable1 ?variable2
WHERE {
  # Query pattern
  ?variable predicate object .
}
```

### SPARQL Clauses

| Clause | Purpose | Example |
|--------|---------|---------|
| **SELECT** | Choose variables to return | `SELECT ?name ?email` |
| **CONSTRUCT** | Build new RDF graph | `CONSTRUCT { ?s foaf:knows ?o }` |
| **WHERE** | Specify query pattern | `WHERE { ?s ?p ?o }` |
| **FILTER** | Add conditions | `FILTER (?age > 18)` |
| **ORDER BY** | Sort results | `ORDER BY ?name` |
| **LIMIT** | Limit results | `LIMIT 10` |
| **OFFSET** | Skip results | `OFFSET 5` |
| **GROUP BY** | Aggregate | `GROUP BY ?category` |
| **OPTIONAL** | Optional patterns | `OPTIONAL { ?s foaf:knows ?o }` |
| **UNION** | Alternative patterns | `{ ?s rdf:type A } UNION { ?s rdf:type B }` |

---

## Common SPARQL Patterns

### Pattern 1: Simple Property Query

```sparql
PREFIX git: <http://example.com/git/>

# Find all commits by Alice
SELECT ?commit ?message
WHERE {
  ?commit a git:Commit ;
    git:author "Alice" ;
    git:message ?message .
}
```

### Pattern 2: Following Relationships

```sparql
PREFIX git: <http://example.com/git/>

# Find commits on main branch
SELECT ?commit ?message
WHERE {
  ?branch a git:Branch ;
    git:name "main" ;
    git:pointsTo ?commit .

  ?commit git:message ?message .
}
```

### Pattern 3: Filtering with FILTER

```sparql
PREFIX git: <http://example.com/git/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

# Find recent commits (last 7 days)
SELECT ?commit ?timestamp
WHERE {
  ?commit a git:Commit ;
    git:timestamp ?timestamp .

  FILTER (?timestamp > "2026-01-02T00:00:00Z"^^xsd:dateTime)
}
```

### Pattern 4: Aggregation

```sparql
PREFIX git: <http://example.com/git/>

# Count commits by author
SELECT ?author (COUNT(?commit) AS ?commitCount)
WHERE {
  ?commit a git:Commit ;
    git:author ?author .
}
GROUP BY ?author
ORDER BY DESC(?commitCount)
```

### Pattern 5: Optional Patterns

```sparql
PREFIX git: <http://example.com/git/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

# Find authors with optional email
SELECT ?name ?email
WHERE {
  ?author a foaf:Person ;
    foaf:name ?name .

  OPTIONAL { ?author foaf:email ?email }
}
```

### Pattern 6: Union Queries

```sparql
PREFIX git: <http://example.com/git/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

# Find both commits and tags
SELECT ?item ?name
WHERE {
  {
    ?item a git:Commit ;
      git:message ?name .
  }
  UNION
  {
    ?item a git:Tag ;
      git:name ?name .
  }
}
```

---

## Graph Operations

### Creating RDF Data

```javascript
import { useGraph, useTurtle } from 'gitvan';

await withGitVan(context, async () => {
  const graph = useGraph();
  const turtle = useTurtle();

  // Parse Turtle file
  const data = await turtle.parse(`
    @prefix git: <http://example.com/git/> .
    @prefix repo: <http://example.com/repo/> .

    repo:gitvan
      a git:Repository ;
      git:name "GitVan" ;
      git:version "4.0.1" .
  `);

  // Add to graph
  await graph.addTriples(data.triples);
});
```

### Querying RDF Data

```javascript
import { useGraph } from 'gitvan';

await withGitVan(context, async () => {
  const graph = useGraph();

  // Execute SPARQL query
  const results = await graph.query(`
    PREFIX git: <http://example.com/git/>

    SELECT ?repo ?version
    WHERE {
      ?repo a git:Repository ;
        git:version ?version .
    }
  `);

  console.log(results);
  // [
  //   { repo: 'repo:gitvan', version: '4.0.1' },
  //   { repo: 'repo:other', version: '3.0.0' }
  // ]
});
```

### Updating Graph Data

```javascript
// Add new triples
await graph.addTriples([
  {
    subject: 'repo:gitvan',
    predicate: 'git:lastUpdated',
    object: '"2026-01-09T10:30:00Z"'
  }
]);

// Remove triples
await graph.removeTriples([
  {
    subject: 'repo:gitvan',
    predicate: 'git:version',
    object: '"4.0.0"'
  }
]);

// Update (remove old, add new)
await graph.updateTriple({
  subject: 'repo:gitvan',
  predicate: 'git:version',
  oldObject: '"4.0.0"',
  newObject: '"4.0.1"'
});
```

### Validating RDF Data

```javascript
// Validate against ontology
const validationRules = `
  PREFIX git: <http://example.com/git/>

  # Commits must have timestamp
  CONSTRUCT {
    ?invalid a git:InvalidCommit ;
      git:reason "Missing timestamp" .
  }
  WHERE {
    ?commit a git:Commit .
    FILTER NOT EXISTS { ?commit git:timestamp ?ts }
  }
`;

const invalid = await graph.query(validationRules);
if (invalid.length > 0) {
  console.error('Invalid commits found:', invalid);
}
```

---

## Advanced Queries

### Pattern 1: Recursive Queries

```sparql
PREFIX git: <http://example.com/git/>

# Find entire commit history (parent chain)
SELECT ?commit ?hash
WHERE {
  ?commit a git:Commit ;
    git:hash ?hash .

  # Find root commit and all ancestors
  {
    SELECT ?commit
    WHERE {
      ?branch a git:Branch ;
        git:pointsTo ?commit .

      # Recursive: follow parentCommit chain
      ?commit (git:parentCommit)* ?root .
    }
  }
}
```

### Pattern 2: Path Finding

```sparql
PREFIX git: <http://example.com/git/>

# Find path from branch to specific commit
SELECT ?path
WHERE {
  ?branch a git:Branch ;
    git:name "main" ;
    git:pointsTo+ ?targetCommit .

  BIND (CONCAT("Branch -> ", ?targetCommit) AS ?path)
}
```

### Pattern 3: Complex Aggregation

```sparql
PREFIX git: <http://example.com/git/>

# Commit statistics
SELECT ?author
  (COUNT(?commit) AS ?totalCommits)
  (MAX(?timestamp) AS ?lastCommitDate)
  (MIN(?timestamp) AS ?firstCommitDate)
WHERE {
  ?commit a git:Commit ;
    git:author ?author ;
    git:timestamp ?timestamp .
}
GROUP BY ?author
HAVING (COUNT(?commit) > 5)
ORDER BY DESC(?totalCommits)
```

### Pattern 4: Federated Queries

```sparql
PREFIX git: <http://example.com/git/>

# Query multiple SPARQL endpoints
SELECT ?repo ?branch ?lastCommit
WHERE {
  SERVICE <http://local-sparql:8080/gitvan> {
    ?repo a git:Repository ;
      git:hasBranch ?branch .
    ?branch git:pointsTo ?lastCommit .
  }

  SERVICE <http://remote-sparql:8080/other> {
    ?remoteRepo a git:Repository .
  }
}
```

---

## Performance Optimization

### Query Optimization Tips

```sparql
PREFIX git: <http://example.com/git/>

-- GOOD: Specific type filter early
SELECT ?commit ?message
WHERE {
  ?commit a git:Commit .           # Filter by type first
  ?commit git:message ?message .
  ?commit git:author "Alice" .
}

-- LESS EFFICIENT: Generic pattern first
SELECT ?commit ?message
WHERE {
  ?s ?p ?o .                       # Too broad
  FILTER (?s = <repo:commit1>)
}
```

### Index and Cache Strategy

```javascript
// Create indexes for frequently queried properties
const graph = useGraph();

await graph.createIndex({
  property: 'git:author',
  type: 'hash'  // Quick lookup by author
});

await graph.createIndex({
  property: 'git:timestamp',
  type: 'range'  // Range queries on dates
});

// These indexes speed up subsequent queries
```

### Result Caching

```javascript
import { useRegistry } from 'gitvan';

const registry = useRegistry();

async function cachedQuery(sparql) {
  const cacheKey = `sparql:${hash(sparql)}`;

  // Check cache
  const cached = await registry.get(cacheKey);
  if (cached && !isStale(cached)) {
    return cached.results;
  }

  // Execute query
  const results = await graph.query(sparql);

  // Cache with TTL
  await registry.set(cacheKey, {
    results,
    timestamp: Date.now()
  }, { ttl: 60 * 60 * 1000 });  // 1 hour

  return results;
}
```

---

## Integration Examples

### Example 1: Knowledge Hook with RDF

```javascript
// Query RDF to decide workflow trigger
export async function checkCommitQuality() {
  const graph = useGraph();

  const poorQualityCommits = await graph.query(`
    PREFIX git: <http://example.com/git/>

    SELECT ?commit ?author
    WHERE {
      ?commit a git:Commit ;
        git:message ?message ;
        git:author ?author .

      FILTER (STRLEN(?message) < 10)  # Short message
    }
  `);

  if (poorQualityCommits.length > 0) {
    return {
      trigger: 'quality-check',
      payload: { commits: poorQualityCommits }
    };
  }
}
```

### Example 2: Metrics Aggregation

```javascript
// Aggregate commit metrics from RDF graph
async function generateMetrics() {
  const graph = useGraph();

  const metrics = await graph.query(`
    PREFIX git: <http://example.com/git/>

    SELECT ?branch
      (COUNT(?commit) AS ?commitCount)
      (COUNT(DISTINCT ?author) AS ?authorCount)
    WHERE {
      ?branch a git:Branch ;
        git:pointsTo ?commit .
      ?commit git:author ?author .
    }
    GROUP BY ?branch
  `);

  return metrics;
}
```

### Example 3: Workflow Selection Based on Graph

```javascript
// Choose workflow based on RDF predicates
async function selectWorkflow(commit) {
  const graph = useGraph();

  const repoType = await graph.query(`
    PREFIX git: <http://example.com/git/>

    SELECT ?repoType
    WHERE {
      ?repo a ?repoType ;
        git:contains ${commit} .
    }
  `);

  // Route to appropriate workflow
  if (repoType.includes('git:ProductionRepo')) {
    return 'production-workflow';
  } else if (repoType.includes('git:TestRepo')) {
    return 'test-workflow';
  }
}
```

---

## Troubleshooting

### Query Returns No Results

```javascript
// Debug empty results
async function debugEmptyResults(sparql) {
  const graph = useGraph();

  // 1. Check triple count
  const allTriples = await graph.query('SELECT * WHERE { ?s ?p ?o }');
  console.log(`Total triples: ${allTriples.length}`);

  // 2. Test simpler query
  const simpleResults = await graph.query(`
    SELECT DISTINCT ?type
    WHERE { ?s a ?type }
  `);
  console.log('Available types:', simpleResults);

  // 3. Check prefixes
  console.log('Registered prefixes:', graph.getPrefixes());

  // 4. Run query with debugging
  const results = await graph.query(sparql, { debug: true });
}
```

### Performance Issues with Large Graphs

```javascript
// Solutions for slow queries
async function optimizeLargeGraphQuery() {
  const graph = useGraph();

  // 1. Use LIMIT to test query
  const sample = await graph.query(`
    SELECT ?s ?p ?o
    WHERE { ?s ?p ?o }
    LIMIT 100
  `);

  // 2. Add type filters early
  const typed = await graph.query(`
    SELECT ?commit
    WHERE {
      ?commit a git:Commit .  # Filter by type first
      ?commit git:author "Alice" .
    }
  `);

  // 3. Create indexes
  await graph.createIndex({ property: 'git:author' });
}
```

### Invalid RDF Syntax

```javascript
// Validate Turtle syntax before loading
import { useTurtle } from 'gitvan';

const turtle = useTurtle();

try {
  const data = await turtle.parse(turtleString);
} catch (error) {
  console.error('Invalid Turtle syntax:');
  console.error(`Line ${error.line}: ${error.message}`);
  console.error(`Context: ${turtleString.split('\n')[error.line - 1]}`);
}
```

---

## Summary

This guide covers:
- RDF fundamentals and Turtle syntax
- GitVan's Git-focused RDF schema
- SPARQL query patterns and syntax
- Advanced queries and optimizations
- Integration with workflows and knowledge hooks
- Practical troubleshooting

For more examples, see `/src/rdf/` and the SPARQL patterns in `/src/queries/`.

---

**Last Updated**: January 9, 2026
**Status**: Complete
**Related Docs**: HOOKS_ARCHITECTURE.md, SPARQL-QUERIES-REFERENCE.md
