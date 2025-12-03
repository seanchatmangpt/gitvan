# SPARQL Query Patterns for GitVan Hooks

This reference guide provides common SPARQL query patterns for creating custom GitVan git lifecycle hooks. Use these patterns as building blocks for your own hooks.

## Table of Contents

- [Basic Patterns](#basic-patterns)
- [Commit Queries](#commit-queries)
- [Branch Queries](#branch-queries)
- [Author Queries](#author-queries)
- [File Change Queries](#file-change-queries)
- [Merge Queries](#merge-queries)
- [CI/CD Queries](#cicd-queries)
- [Metrics Queries](#metrics-queries)
- [Time-Based Queries](#time-based-queries)
- [Advanced Patterns](#advanced-patterns)

## Basic Patterns

### Namespaces

Always include these prefixes in your SPARQL queries:

```sparql
PREFIX git: <https://gitvan.dev/git#>
PREFIX gv: <https://gitvan.dev/ontology#>
PREFIX ci: <https://gitvan.dev/ci#>
PREFIX metrics: <https://gitvan.dev/metrics#>
PREFIX team: <https://gitvan.dev/team#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
```

### ASK Query Template

Use ASK queries in hook predicates to determine if the hook should run:

```sparql
ASK WHERE {
    # Your conditions here
    ?commit rdf:type git:Commit .
    # Returns true/false
}
```

### SELECT Query Template

Use SELECT queries in hook steps to gather data:

```sparql
SELECT ?variable1 ?variable2 WHERE {
    # Your query pattern here
    ?subject ?predicate ?object .
}
ORDER BY ?variable1
LIMIT 10
```

### UPDATE Query Template

Use UPDATE queries to modify the knowledge graph:

```sparql
INSERT DATA {
    # Triples to insert
    <urn:resource:id> rdf:type gv:Type ;
        gv:property "value" .
}
```

Or with DELETE:

```sparql
DELETE {
    ?subject gv:oldProperty ?oldValue .
}
INSERT {
    ?subject gv:newProperty ?newValue .
}
WHERE {
    ?subject gv:oldProperty ?oldValue .
}
```

## Commit Queries

### Get Most Recent Commit

```sparql
SELECT ?commit ?sha ?author ?message ?timestamp WHERE {
    ?commit rdf:type git:Commit ;
            git:sha ?sha ;
            git:author ?author ;
            git:message ?message ;
            git:timestamp ?timestamp .
}
ORDER BY DESC(?timestamp)
LIMIT 1
```

### Get Commits in Time Range

```sparql
SELECT ?commit ?timestamp WHERE {
    ?commit rdf:type git:Commit ;
            git:timestamp ?timestamp .

    # Last 24 hours
    FILTER(?timestamp > NOW() - "P1D"^^xsd:duration)
}
ORDER BY DESC(?timestamp)
```

### Get Commits by Author

```sparql
SELECT ?commit ?sha ?message WHERE {
    ?commit rdf:type git:Commit ;
            git:sha ?sha ;
            git:message ?message ;
            git:author ?author .

    FILTER(?author = "alice@company.com")
}
```

### Get Large Commits

```sparql
SELECT ?commit ?sha ?linesAdded ?linesDeleted ?totalLines WHERE {
    ?commit rdf:type git:Commit ;
            git:sha ?sha ;
            git:linesAdded ?linesAdded ;
            git:linesDeleted ?linesDeleted .

    BIND(?linesAdded + ?linesDeleted AS ?totalLines)

    FILTER(?totalLines > 1000)
}
ORDER BY DESC(?totalLines)
```

### Get Commits with Specific File Changes

```sparql
SELECT ?commit ?filePath WHERE {
    ?commit rdf:type git:Commit ;
            git:hasChange ?change .

    ?change git:filePath ?filePath .

    # Filter for specific files
    FILTER(REGEX(?filePath, "package\\.json$"))
}
```

## Branch Queries

### Get Current Branch

```sparql
SELECT ?branch ?branchName WHERE {
    ?branch rdf:type git:Branch ;
            git:isCurrent true ;
            git:branchName ?branchName .
}
```

### Get All Branches

```sparql
SELECT ?branch ?name ?lastCommit WHERE {
    ?branch rdf:type git:Branch ;
            git:branchName ?name ;
            git:head ?lastCommit .
}
ORDER BY ?name
```

### Check if Branch Matches Pattern

```sparql
ASK WHERE {
    ?branch rdf:type git:Branch ;
            git:isCurrent true ;
            git:branchName ?name .

    # Check if matches feature/* pattern
    FILTER(REGEX(?name, "^feature/[a-z0-9-]+$", "i"))
}
```

### Get Protected Branches

```sparql
SELECT ?branch ?name WHERE {
    ?branch rdf:type git:Branch ;
            git:branchName ?name ;
            git:isProtected true .
}
```

Or check against list:

```sparql
SELECT ?branch ?name WHERE {
    ?branch rdf:type git:Branch ;
            git:branchName ?name .

    FILTER(?name IN ("main", "master", "develop"))
}
```

### Get Branch Commit Count

```sparql
SELECT ?branch (COUNT(?commit) AS ?commitCount) WHERE {
    ?branch rdf:type git:Branch .
    ?commit git:onBranch ?branch .
}
GROUP BY ?branch
```

## Author Queries

### Get Author Information

```sparql
SELECT ?author ?name ?email ?level WHERE {
    ?author rdf:type team:Author ;
            team:name ?name ;
            team:email ?email ;
            team:experienceLevel ?level .
}
```

### Get Author Commit Statistics

```sparql
SELECT ?author
       (COUNT(?commit) AS ?totalCommits)
       (AVG(?lines) AS ?avgCommitSize)
WHERE {
    ?commit rdf:type git:Commit ;
            git:author ?author ;
            git:linesAdded ?added ;
            git:linesDeleted ?deleted .

    BIND(?added + ?deleted AS ?lines)
}
GROUP BY ?author
ORDER BY DESC(?totalCommits)
```

### Classify Author by Experience

```sparql
SELECT ?author ?level WHERE {
    ?commit git:author ?author .

    # Count commits
    {
        SELECT ?author (COUNT(?c) AS ?commitCount) WHERE {
            ?c git:author ?author .
        }
        GROUP BY ?author
    }

    # Classify by commit count
    BIND(
        IF(?commitCount < 100, "junior",
        IF(?commitCount < 500, "mid-level",
        "senior"))
        AS ?level
    )
}
```

### Get Authors Active Today

```sparql
SELECT DISTINCT ?author WHERE {
    ?commit rdf:type git:Commit ;
            git:author ?author ;
            git:timestamp ?time .

    # Today only
    FILTER(STRSTARTS(STR(?time), STR(SUBSTR(STR(NOW()), 1, 10))))
}
```

### Get Team Members by Expertise

```sparql
SELECT ?member ?name ?expertise WHERE {
    ?member rdf:type team:TeamMember ;
            team:name ?name ;
            team:expertise ?expertise .

    FILTER(?expertise = "backend")
}
```

## File Change Queries

### Get Files Changed in Commit

```sparql
SELECT ?file ?filePath ?changeType ?linesAdded ?linesDeleted WHERE {
    ?commit rdf:type git:Commit ;
            git:hasChange ?change .

    ?change git:file ?file ;
            git:filePath ?filePath ;
            git:changeType ?changeType ;
            git:linesAdded ?linesAdded ;
            git:linesDeleted ?linesDeleted .
}
```

### Get Files by Type

```sparql
SELECT ?filePath ?fileType WHERE {
    ?commit git:hasChange ?change .
    ?change git:filePath ?filePath .

    # Extract file extension
    BIND(REPLACE(?filePath, "^.+\\.([^.]+)$", "$1") AS ?fileType)

    # Filter for specific types
    FILTER(?fileType IN ("js", "ts", "py"))
}
```

### Get Test Files

```sparql
SELECT ?filePath WHERE {
    ?commit git:hasChange ?change .
    ?change git:filePath ?filePath .

    # Test files contain "test" or "spec"
    FILTER(REGEX(?filePath, "test|spec", "i"))
}
```

### Get Modified Configuration Files

```sparql
SELECT ?filePath WHERE {
    ?commit git:hasChange ?change .
    ?change git:filePath ?filePath ;
            git:changeType ?changeType .

    # Config file extensions
    FILTER(REGEX(?filePath, "\\.(json|yaml|yml|toml|ini|conf)$", "i"))

    # Only modifications (not additions)
    FILTER(?changeType = "modified")
}
```

### Get Frequently Changed Files

```sparql
SELECT ?filePath (COUNT(?change) AS ?changeCount) WHERE {
    ?commit git:hasChange ?change .
    ?change git:filePath ?filePath .

    # Recent commits (last 30 days)
    ?commit git:timestamp ?time .
    FILTER(?time > NOW() - "P30D"^^xsd:duration)
}
GROUP BY ?filePath
HAVING (COUNT(?change) > 5)
ORDER BY DESC(?changeCount)
```

### Detect Files with High Churn

```sparql
SELECT ?filePath
       (SUM(?added) AS ?totalAdded)
       (SUM(?deleted) AS ?totalDeleted)
       (SUM(?added + ?deleted) AS ?churn)
WHERE {
    ?commit git:hasChange ?change .
    ?change git:filePath ?filePath ;
            git:linesAdded ?added ;
            git:linesDeleted ?deleted .
}
GROUP BY ?filePath
HAVING (SUM(?added + ?deleted) > 1000)
ORDER BY DESC(?churn)
```

## Merge Queries

### Detect Active Merge

```sparql
ASK WHERE {
    ?merge rdf:type git:Merge ;
           git:status ?status .

    FILTER(?status IN ("in-progress", "conflicted"))
}
```

### Get Merge Details

```sparql
SELECT ?merge ?sourceBranch ?targetBranch ?status WHERE {
    ?merge rdf:type git:Merge ;
           git:sourceBranch ?sourceBranch ;
           git:targetBranch ?targetBranch ;
           git:status ?status ;
           git:timestamp ?time .

    # Recent merges
    FILTER(?time > NOW() - "PT1H"^^xsd:duration)
}
ORDER BY DESC(?time)
```

### Get Conflicted Files

```sparql
SELECT ?file ?filePath ?conflictType WHERE {
    ?merge rdf:type git:Merge ;
           git:status "conflicted" .

    ?file git:hasConflict true ;
          git:filePath ?filePath ;
          git:conflictType ?conflictType .
}
```

### Find Conflicting Authors

```sparql
SELECT ?file ?sourceAuthor ?targetAuthor WHERE {
    ?file git:hasConflict true ;
          git:filePath ?path .

    # Last author on source branch
    {
        SELECT ?path ?sourceAuthor WHERE {
            ?sourceCommit git:onBranch ?sourceBranch ;
                         git:author ?sourceAuthor ;
                         git:hasChange ?sourceChange .
            ?sourceChange git:filePath ?path .
        }
    }

    # Last author on target branch
    {
        SELECT ?path ?targetAuthor WHERE {
            ?targetCommit git:onBranch ?targetBranch ;
                         git:author ?targetAuthor ;
                         git:hasChange ?targetChange .
            ?targetChange git:filePath ?path .
        }
    }
}
```

### Get Merge History

```sparql
SELECT ?merge ?sourceBranch ?targetBranch ?timestamp ?conflicted WHERE {
    ?merge rdf:type git:Merge ;
           git:sourceBranch ?sourceBranch ;
           git:targetBranch ?targetBranch ;
           git:timestamp ?timestamp .

    # Check if had conflicts
    OPTIONAL {
        ?merge git:hadConflicts ?conflicted .
    }
    BIND(COALESCE(?conflicted, false) AS ?conflicted)
}
ORDER BY DESC(?timestamp)
LIMIT 20
```

## CI/CD Queries

### Get Recent CI Failures

```sparql
SELECT ?build ?buildId ?status ?jobName WHERE {
    ?build rdf:type ci:Build ;
           ci:buildId ?buildId ;
           ci:status ?status ;
           ci:jobName ?jobName ;
           ci:completedAt ?time .

    FILTER(?status IN ("failed", "error"))
    FILTER(?time > NOW() - "P1D"^^xsd:duration)
}
ORDER BY DESC(?time)
```

### Correlate CI Failure with Commit

```sparql
SELECT ?build ?commit ?author ?message WHERE {
    ?build rdf:type ci:Build ;
           ci:status "failed" ;
           ci:forCommit ?commit .

    ?commit git:author ?author ;
            git:message ?message .
}
```

### Get CI Build Duration Trends

```sparql
SELECT ?jobName
       (AVG(?duration) AS ?avgDuration)
       (MIN(?duration) AS ?minDuration)
       (MAX(?duration) AS ?maxDuration)
WHERE {
    ?build rdf:type ci:Build ;
           ci:jobName ?jobName ;
           ci:duration ?duration ;
           ci:completedAt ?time .

    FILTER(?time > NOW() - "P7D"^^xsd:duration)
}
GROUP BY ?jobName
ORDER BY DESC(?avgDuration)
```

### Detect Flaky Tests

```sparql
SELECT ?testName (COUNT(?result) AS ?runs)
       (SUM(IF(?result = "passed", 1, 0)) AS ?passes)
       (SUM(IF(?result = "failed", 1, 0)) AS ?failures)
WHERE {
    ?test rdf:type ci:Test ;
          ci:testName ?testName ;
          ci:result ?result ;
          ci:timestamp ?time .

    FILTER(?time > NOW() - "P30D"^^xsd:duration)
}
GROUP BY ?testName
HAVING (COUNT(?result) > 10 &&
        SUM(IF(?result = "passed", 1, 0)) > 0 &&
        SUM(IF(?result = "failed", 1, 0)) > 0)
ORDER BY DESC(?failures)
```

### Get CI Success Rate by Author

```sparql
SELECT ?author
       (COUNT(?build) AS ?totalBuilds)
       (SUM(IF(?status = "passed", 1, 0)) AS ?passed)
       (SUM(IF(?status = "failed", 1, 0)) AS ?failed)
WHERE {
    ?build rdf:type ci:Build ;
           ci:status ?status ;
           ci:forCommit ?commit .

    ?commit git:author ?author .

    FILTER(?status IN ("passed", "failed"))
}
GROUP BY ?author
ORDER BY DESC(?totalBuilds)
```

## Metrics Queries

### Get Author Productivity Metrics

```sparql
SELECT ?author
       (COUNT(?commit) AS ?commits)
       (SUM(?linesAdded) AS ?totalAdded)
       (SUM(?linesDeleted) AS ?totalDeleted)
       (AVG(?linesAdded + ?linesDeleted) AS ?avgCommitSize)
WHERE {
    ?commit rdf:type git:Commit ;
            git:author ?author ;
            git:linesAdded ?linesAdded ;
            git:linesDeleted ?linesDeleted ;
            git:timestamp ?time .

    # Last 30 days
    FILTER(?time > NOW() - "P30D"^^xsd:duration)
}
GROUP BY ?author
ORDER BY DESC(?commits)
```

### Get Code Quality Scores

```sparql
SELECT ?commit ?qualityScore WHERE {
    ?commit rdf:type metrics:CommitRecord ;
            metrics:qualityScore ?qualityScore ;
            metrics:timestamp ?time .

    FILTER(?time > NOW() - "P7D"^^xsd:duration)
}
ORDER BY DESC(?qualityScore)
```

### Get Team Velocity

```sparql
SELECT ?week
       (COUNT(?commit) AS ?commits)
       (SUM(?linesAdded + ?linesDeleted) AS ?linesChanged)
WHERE {
    ?commit rdf:type git:Commit ;
            git:linesAdded ?linesAdded ;
            git:linesDeleted ?linesDeleted ;
            git:timestamp ?time .

    # Group by week
    BIND(FLOOR((NOW() - ?time) / (60*60*24*7)) AS ?week)
}
GROUP BY ?week
ORDER BY ?week
```

### Track Deployment Frequency

```sparql
SELECT ?environment (COUNT(?deployment) AS ?count) WHERE {
    ?deployment rdf:type metrics:Deployment ;
                metrics:environment ?environment ;
                metrics:timestamp ?time .

    FILTER(?time > NOW() - "P30D"^^xsd:duration)
}
GROUP BY ?environment
```

## Time-Based Queries

### Get Activity in Last N Minutes

```sparql
SELECT ?commit WHERE {
    ?commit rdf:type git:Commit ;
            git:timestamp ?time .

    # Last 30 minutes
    BIND(NOW() - ?time AS ?age)
    FILTER(?age < "PT30M"^^xsd:duration)
}
```

### Get Daily Activity Pattern

```sparql
SELECT ?hour (COUNT(?commit) AS ?commitCount) WHERE {
    ?commit rdf:type git:Commit ;
            git:timestamp ?time .

    # Extract hour of day
    BIND(HOURS(?time) AS ?hour)

    # Last 30 days
    FILTER(?time > NOW() - "P30D"^^xsd:duration)
}
GROUP BY ?hour
ORDER BY ?hour
```

### Get Commits by Day of Week

```sparql
SELECT ?dayOfWeek (COUNT(?commit) AS ?commits) WHERE {
    ?commit rdf:type git:Commit ;
            git:timestamp ?time .

    # 0 = Sunday, 6 = Saturday
    BIND((FLOOR((UNIX_TIMESTAMP(?time) / 86400 + 4) % 7)) AS ?dayOfWeek)
}
GROUP BY ?dayOfWeek
ORDER BY ?dayOfWeek
```

### Filter by Date Range

```sparql
SELECT ?commit WHERE {
    ?commit rdf:type git:Commit ;
            git:timestamp ?time .

    # Between specific dates
    FILTER(?time >= "2025-01-01T00:00:00Z"^^xsd:dateTime &&
           ?time <= "2025-12-31T23:59:59Z"^^xsd:dateTime)
}
```

## Advanced Patterns

### Aggregate with HAVING Clause

```sparql
SELECT ?author (COUNT(?commit) AS ?commitCount) WHERE {
    ?commit git:author ?author .
}
GROUP BY ?author
HAVING (COUNT(?commit) > 10)
ORDER BY DESC(?commitCount)
```

### Subqueries

```sparql
SELECT ?commit ?linesChanged WHERE {
    ?commit rdf:type git:Commit ;
            git:linesAdded ?added ;
            git:linesDeleted ?deleted .

    BIND(?added + ?deleted AS ?linesChanged)

    # Only commits above average
    {
        SELECT (AVG(?lines) AS ?avgLines) WHERE {
            ?c git:linesAdded ?a ;
               git:linesDeleted ?d .
            BIND(?a + ?d AS ?lines)
        }
    }

    FILTER(?linesChanged > ?avgLines)
}
```

### Optional Data with COALESCE

```sparql
SELECT ?author ?level WHERE {
    ?author rdf:type team:Author .

    OPTIONAL {
        ?author team:experienceLevel ?explicitLevel .
    }

    # Use explicit level or default to "unknown"
    BIND(COALESCE(?explicitLevel, "unknown") AS ?level)
}
```

### String Manipulation

```sparql
SELECT ?commit ?shortSha ?firstLine WHERE {
    ?commit git:sha ?sha ;
            git:message ?message .

    # First 7 chars of SHA
    BIND(SUBSTR(?sha, 1, 7) AS ?shortSha)

    # First line of message
    BIND(REPLACE(?message, "\n.*", "") AS ?firstLine)
}
```

### Conditional Logic with IF

```sparql
SELECT ?commit ?size ?category WHERE {
    ?commit git:linesAdded ?added ;
            git:linesDeleted ?deleted .

    BIND(?added + ?deleted AS ?size)

    BIND(
        IF(?size < 100, "small",
        IF(?size < 500, "medium",
        IF(?size < 1000, "large", "very-large")))
        AS ?category
    )
}
```

### Graph Patterns with UNION

```sparql
SELECT ?event ?timestamp WHERE {
    {
        ?event rdf:type git:Commit ;
               git:timestamp ?timestamp .
    }
    UNION
    {
        ?event rdf:type git:Merge ;
               git:timestamp ?timestamp .
    }
    UNION
    {
        ?event rdf:type git:Tag ;
               git:createdAt ?timestamp .
    }
}
ORDER BY DESC(?timestamp)
```

### Negative Patterns with FILTER NOT EXISTS

```sparql
# Find commits without tests
SELECT ?commit WHERE {
    ?commit rdf:type git:Commit ;
            git:hasChange ?change .

    ?change git:filePath ?path .

    # Has source files
    FILTER(REGEX(?path, "\\.(js|ts|py)$"))

    # But no test files
    FILTER NOT EXISTS {
        ?commit git:hasChange ?testChange .
        ?testChange git:filePath ?testPath .
        FILTER(REGEX(?testPath, "test|spec"))
    }
}
```

### Property Paths

```sparql
SELECT ?commit ?file WHERE {
    # Navigate through relationships
    ?commit git:hasChange+ / git:file ?file .
}
```

### COUNT DISTINCT

```sparql
SELECT ?author (COUNT(DISTINCT ?file) AS ?uniqueFiles) WHERE {
    ?commit git:author ?author ;
            git:hasChange ?change .

    ?change git:file ?file .
}
GROUP BY ?author
```

## Tips and Best Practices

### 1. Always Use LIMIT

Prevent performance issues by limiting results:

```sparql
SELECT ?commit WHERE {
    ?commit rdf:type git:Commit .
}
LIMIT 100  # Always limit!
```

### 2. Filter Early

Apply filters in WHERE clause, not outside:

```sparql
# ✅ Good - filter early
SELECT ?commit WHERE {
    ?commit rdf:type git:Commit ;
            git:timestamp ?time .
    FILTER(?time > NOW() - "P1D"^^xsd:duration)
}

# ❌ Bad - filters all commits first
SELECT ?commit WHERE {
    ?commit rdf:type git:Commit .
}
# Then filter in application code
```

### 3. Use OPTIONAL Carefully

OPTIONAL can be slow - use only when necessary:

```sparql
SELECT ?commit ?author ?email WHERE {
    ?commit git:author ?author .

    # Email is optional
    OPTIONAL {
        ?author team:email ?email .
    }
}
```

### 4. Bind for Calculations

Use BIND for computed values:

```sparql
SELECT ?commit ?totalLines WHERE {
    ?commit git:linesAdded ?added ;
            git:linesDeleted ?deleted .

    BIND(?added + ?deleted AS ?totalLines)
}
```

### 5. Comment Your Queries

```sparql
SELECT ?commit ?author WHERE {
    # Get recent commits
    ?commit rdf:type git:Commit ;
            git:timestamp ?time ;
            git:author ?author .

    # Last 24 hours only
    FILTER(?time > NOW() - "P1D"^^xsd:duration)
}
ORDER BY DESC(?time)
LIMIT 10
```

## Resources

- **SPARQL 1.1 Spec:** https://www.w3.org/TR/sparql11-query/
- **GitVan Ontology:** `.gitvan/ontology/git-ontology.ttl`
- **Interactive SPARQL Editor:** `gitvan sparql --interactive`
- **Query Examples:** https://gitvan.dev/docs/sparql/examples

## Testing Queries

### Test in CLI

```bash
# Run query directly
gitvan sparql query "SELECT * WHERE { ?s ?p ?o } LIMIT 10"

# Load from file
gitvan sparql query --file my-query.sparql

# With parameters
gitvan sparql query --param author=alice@co.com "SELECT ..."

# Format output
gitvan sparql query --format json "SELECT ..."
gitvan sparql query --format table "SELECT ..."
```

### Debug Queries

```bash
# Explain query plan
gitvan sparql explain "SELECT ..."

# Show execution time
gitvan sparql query --timing "SELECT ..."

# Validate syntax
gitvan sparql validate --file query.sparql
```

---

**Questions?** Open an issue or ask on Discord!
