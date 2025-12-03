# Reference: Git Lifecycle Events

Complete reference for all git events captured by GitVan.

## Event Types

GitVan captures and models **10 semantic git lifecycle events** as RDF triples with full metadata.

| Event | Type | Trigger | Metadata |
|-------|------|---------|----------|
| **pre-commit** | `git:PreCommitEvent` | Before commit created | Files staged, hooks can modify |
| **commit-msg** | `git:CommitMsgEvent` | After commit message written | Message content available |
| **post-commit** | `git:PostCommitEvent` | After commit created | Full commit hash, author, diff |
| **pre-push** | `git:PrePushEvent` | Before push sent | Remote, branch, commits to push |
| **post-push** | `git:PostPushEvent` | After push sent | Push status, destination |
| **post-checkout** | `git:PostCheckoutEvent` | After branch switch | From/to branch, file changes |
| **post-merge** | `git:PostMergeEvent` | After merge complete | Merge type, conflicted files |
| **post-rewrite** | `git:PostRewriteEvent` | After rebase/squash | Operation type, affected commits |
| **prepare-commit-msg** | `git:PrepareCommitMsgEvent` | Before commit message editor | Template content |
| **post-update** | `git:PostUpdateEvent` | After ref update | Ref name, old/new values |

## Event Structure

Each event is captured as RDF triples:

```sparql
?event a git:CommitEvent ;
  git:author ?author ;
  git:timestamp ?timestamp ;
  git:branch ?branch ;
  git:commit ?hash ;
  git:message ?message ;
  git:files ?files ;
  git:stats [
    git:additions ?additions ;
    git:deletions ?deletions ;
    git:filesChanged ?filesChanged
  ] ;
  prov:wasAssociatedWith ?author ;
  prov:wasInformedBy ?previousCommit .
```

## Event Metadata

### Pre-Commit Event

```sparql
?event a git:PreCommitEvent ;
  git:stagedFiles [
    rdf:_1 "src/main.ts" ;
    rdf:_2 "package.json"
  ] ;
  git:unstagedFiles [
    rdf:_1 "README.md"
  ] ;
  git:timestamp ?timestamp ;
  git:branch ?branch .
```

**Use Case**: Prevent commits with certain patterns in staged files

### Commit-Msg Event

```sparql
?event a git:CommitMsgEvent ;
  git:message "feat: add user authentication" ;
  git:messageSource [ a git:CommitSource | git:MergeSource ] ;
  git:timestamp ?timestamp ;
  git:author ?author .
```

**Use Case**: Validate commit message format

### Post-Commit Event

```sparql
?event a git:PostCommitEvent ;
  git:commit "a1b2c3d4e5f6..." ;
  git:author "john@example.com" ;
  git:email "john@example.com" ;
  git:timestamp ?timestamp ;
  git:branch ?branch ;
  git:message "feat: add user authentication" ;
  git:files [
    rdf:_1 "src/auth.ts" ;
    rdf:_2 "tests/auth.test.ts"
  ] ;
  git:stats [
    git:additions 150 ;
    git:deletions 45 ;
    git:filesChanged 2
  ] .
```

**Use Case**: Track all commits, update metrics

### Pre-Push Event

```sparql
?event a git:PrePushEvent ;
  git:localRef "refs/heads/main" ;
  git:remoteRef "refs/heads/main" ;
  git:remote "origin" ;
  git:remoteUrl "https://github.com/user/repo.git" ;
  git:commits [
    rdf:_1 ?commit1 ;
    rdf:_2 ?commit2
  ] ;
  git:timestamp ?timestamp .
```

**Use Case**: Validate commits before pushing, run tests

### Post-Push Event

```sparql
?event a git:PostPushEvent ;
  git:localRef "refs/heads/main" ;
  git:remoteRef "refs/heads/main" ;
  git:remote "origin" ;
  git:status "success" ;  # or "error", "rejected"
  git:commits [
    rdf:_1 ?commit1 ;
    rdf:_2 ?commit2
  ] ;
  git:pushedAt ?timestamp .
```

**Use Case**: Trigger CI/CD, deployments, notifications

### Post-Checkout Event

```sparql
?event a git:PostCheckoutEvent ;
  git:fromRef "main" ;
  git:toRef "feature/new-feature" ;
  git:fromCommit "a1b2c3d4..." ;
  git:toCommit "x1y2z3a4..." ;
  git:changeType [ a git:SwitchBranch | git:CheckoutFile ] ;
  git:filesChanged 12 ;
  git:timestamp ?timestamp ;
  git:currentBranch "feature/new-feature" .
```

**Use Case**: Run setup scripts, install dependencies for branch

### Post-Merge Event

```sparql
?event a git:PostMergeEvent ;
  git:mergeType "merge" ;  # or "squash", "rebase"
  git:mergedBranch ?source ;
  git:targetBranch ?target ;
  git:conflicts ?count ;
  git:conflictedFiles [
    rdf:_1 "file1.ts" ;
    rdf:_2 "file2.ts"
  ] ;
  git:timestamp ?timestamp ;
  git:author ?author .
```

**Use Case**: Alert on conflicts, trigger tests

### Post-Rewrite Event

```sparql
?event a git:PostRewriteEvent ;
  git:rewriteType "rebase" ;  # or "squash", "amend"
  git:oldHeadCommit "a1b2c3d4..." ;
  git:newHeadCommit "x1y2z3a4..." ;
  git:rewrittenCommits [
    rdf:_1 ?oldCommit1 ;
    rdf:_2 ?oldCommit2
  ] ;
  git:timestamp ?timestamp .
```

**Use Case**: Update downstream systems, track history rewrites

### Prepare-Commit-Msg Event

```sparql
?event a git:PrepareCommitMsgEvent ;
  git:messageTemplate "Add feature description\n\n" ;
  git:messageSource [ a git:CommitSource | git:MergeSource ] ;
  git:timestamp ?timestamp ;
  git:branch ?branch .
```

**Use Case**: Pre-fill commit message templates

### Post-Update Event

```sparql
?event a git:PostUpdateEvent ;
  git:refName "refs/heads/main" ;
  git:oldValue "a1b2c3d4..." ;
  git:newValue "x1y2z3a4..." ;
  git:refType "branch" ;  # or "tag"
  git:timestamp ?timestamp .
```

**Use Case**: Track all ref updates

## Querying Events

### Find All Commits by Author

```sparql
SELECT ?commit ?message ?date WHERE {
  ?event a git:CommitEvent ;
    git:author "john@example.com" ;
    git:commit ?commit ;
    git:message ?message ;
    git:timestamp ?date .
}
ORDER BY DESC(?date)
```

### Find Large Commits

```sparql
SELECT ?commit ?author ?additions ?deletions WHERE {
  ?event a git:CommitEvent ;
    git:commit ?commit ;
    git:author ?author ;
    git:stats [
      git:additions ?additions ;
      git:deletions ?deletions
    ] .
  FILTER (?additions > 500 OR ?deletions > 500)
}
ORDER BY DESC(?additions)
```

### Find Merges with Conflicts

```sparql
SELECT ?merge ?source ?target ?conflictCount WHERE {
  ?event a git:PostMergeEvent ;
    git:mergedBranch ?source ;
    git:targetBranch ?target ;
    git:conflicts ?conflictCount .
  FILTER (?conflictCount > 0)
}
```

### Find Fast-Paced Developers

```sparql
SELECT ?author (COUNT(?commit) AS ?commitCount) WHERE {
  ?event a git:CommitEvent ;
    git:author ?author ;
    git:commit ?commit ;
    git:timestamp ?timestamp .
  FILTER (?timestamp > NOW() - "P1D"^^xsd:duration)
}
GROUP BY ?author
ORDER BY DESC(?commitCount)
```

## Event Retention Policy

- **90 days**: Full event detail (all metadata)
- **1 year**: Aggregated statistics (commit counts, authors)
- **Forever**: Archive (optional, for compliance)

```bash
# View retention settings
gitvan config show retention

# Adjust retention
gitvan config set retention.detail 120d
gitvan config set retention.aggregate 2y
```

## Event Performance Metrics

| Operation | Target | Typical | Notes |
|-----------|--------|---------|-------|
| Event Capture | <10ms | 0.2-8.5ms | Per git operation |
| RDF Serialization | <10ms | 2-5ms | Turtle format |
| SPARQL Query (1k triples) | <100ms | 8-95ms | Simple patterns |
| SPARQL Query (10k triples) | <500ms | 120-480ms | Complex joins |

## See Also

- **How to Use**: [How-To Guides](../how-to/)
- **Query Patterns**: [SPARQL Patterns](./sparql-patterns.md)
- **Git Operations**: [Git Lifecycle Explanation](../explanation/knowledge-hooks-architecture.md)

