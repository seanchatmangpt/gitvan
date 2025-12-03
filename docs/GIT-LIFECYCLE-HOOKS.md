# Git Lifecycle Knowledge Hooks (v3.2.0)

**Goal**: Semantic integration of git lifecycle events with reactive knowledge hooks.

GitVan v3.2.0 extends knowledge hooks to react to the full git lifecycle, enabling intelligent automation at every git operation (commit, push, merge, branch, tag, etc.).

---

## Vision

Current state: "Run workflows on git hooks"
v3.2.0: "Reactive automation deeply integrated with git semantics"

### What Changes

**v3.1.0**: Workflows trigger on git events
```
git commit → pre-commit hook → Run workflow
```

**v3.2.0**: Git lifecycle modeled as RDF graph, hooks react to semantic patterns
```
git commit → Capture as RDF triples:
  - Commit created
  - Author known
  - Files changed
  - Message matches pattern
  - Branch updated
  - Parents linked

Knowledge hooks query this graph:
  "If commit to main AND files in src/ AND author is junior-dev THEN review"
  "If merge AND conflicts > 0 THEN notify team"
  "If tag matches v* AND tests passing THEN deploy"
```

---

## Architecture: Three Layers

### Layer 1: Git Event Capture (Semantic)

**What**: Model git operations as RDF triples.

**Events captured**:
- `pre-commit` - Files staged, author, message preview
- `post-commit` - Commit hash, parent, author, timestamp
- `pre-push` - Commits to push, remote, force flag
- `post-push` - Success, pushed commits, refs updated
- `pre-merge` - Merge base, branch, conflicts detected
- `post-merge` - Merge commit, parents, conflict resolution
- `branch` - Branch created/deleted, point, author
- `tag` - Tag created, ref, message, tagger
- `checkout` - Branch changed, previous, new
- `reset` - Ref moved, old commit, new commit

**RDF representation**:
```turtle
@prefix git: <http://example.org/git#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# Commit event
git:commit-abc123 a git:CommitEvent ;
  git:hash "abc123" ;
  git:author "alice@example.com" ;
  git:message "feat: add feature X" ;
  git:timestamp "2024-01-15T14:23:45Z"^^xsd:dateTime ;
  git:parents git:commit-parent1 ;
  git:filesChanged 3 ;
  git:branch "main" ;
  git:filesAdded ("src/feature.js" "tests/feature.test.js") ;
  git:filesModified ("README.md") ;
  git:filesDeleted () ;
  prov:wasAttributedTo "alice@example.com" ;
  prov:wasGeneratedBy git:post-commit .

# Branch event
git:branch-feature a git:BranchEvent ;
  rdfs:label "Created feature/xyz" ;
  git:action git:BranchCreated ;
  git:branchName "feature/xyz" ;
  git:pointingTo git:commit-abc123 ;
  git:author "bob@example.com" ;
  git:timestamp "2024-01-15T14:00:00Z"^^xsd:dateTime .

# Merge event
git:merge-1 a git:MergeEvent ;
  git:source "feature/xyz" ;
  git:target "main" ;
  git:mergeBase git:commit-base ;
  git:mergeCommit git:commit-merged ;
  git:conflictsDetected 0 ;
  git:author "alice@example.com" ;
  git:timestamp "2024-01-15T14:30:00Z"^^xsd:dateTime .

# Push event
git:push-1 a git:PushEvent ;
  git:remote "origin" ;
  git:branch "main" ;
  git:force false ;
  git:commitsPushed (git:commit-abc123 git:commit-xyz789) ;
  git:refUpdated "refs/heads/main" ;
  git:author "alice@example.com" ;
  git:timestamp "2024-01-15T14:35:00Z"^^xsd:dateTime .
```

### Layer 2: Knowledge Hooks React to Patterns

**What**: Define hooks that query git lifecycle triples.

**Examples**:

```turtle
@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .
@prefix op: <http://example.org/operations#> .

# Hook 1: Review commits to main by junior devs
gh:ReviewJuniorDevCommits a gh:Hook ;
  rdfs:label "Review junior dev commits to main" ;
  gh:query """
    SELECT ?commit ?author ?message WHERE {
      ?commit a git:CommitEvent ;
        git:branch "main" ;
        git:author ?author ;
        git:message ?message .

      ?author a git:Author ;
        git:seniority git:Junior .
    }
  """ ;
  gh:onMatch [
    op:action op:NotifySlack ;
    op:template "junior-dev-commit" ;
    op:params [
      op:channel "#code-review" ;
      op:assignee "senior-dev-group"
    ]
  ] .

# Hook 2: Deploy on tag matching v*
gh:DeployOnVersionTag a gh:Hook ;
  rdfs:label "Deploy when version tag pushed" ;
  gh:query """
    SELECT ?tag ?commit WHERE {
      ?tag a git:TagEvent ;
        git:tagName ?name ;
        git:pointingTo ?commit ;
        FILTER(REGEX(?name, "^v[0-9]+\\.[0-9]+\\.[0-9]+$"))
    }
  """ ;
  gh:onMatch [
    op:action op:ExecuteWorkflow ;
    op:workflow op:DeployProduction ;
    op:params [
      op:version ?name ;
      op:commitHash ?commit
    ]
  ] .

# Hook 3: Alert on merge conflicts
gh:AlertOnMergeConflicts a gh:Hook ;
  rdfs:label "Alert when merge has conflicts" ;
  gh:query """
    SELECT ?merge ?source ?target WHERE {
      ?merge a git:MergeEvent ;
        git:source ?source ;
        git:target ?target ;
        git:conflictsDetected ?count .
      FILTER(?count > 0)
    }
  """ ;
  gh:onMatch [
    op:action op:NotifySlack ;
    op:urgency op:High ;
    op:template "merge-conflicts"
  ] .

# Hook 4: Enforce branch naming
gh:EnforceBranchNaming a gh:Hook ;
  rdfs:label "Enforce branch naming convention" ;
  gh:query """
    SELECT ?branch WHERE {
      ?branch a git:BranchEvent ;
        git:action git:BranchCreated ;
        git:branchName ?name .
      FILTER(NOT(REGEX(?name, "^(main|develop|feature/|hotfix/|release/)")))
    }
  """ ;
  gh:onMatch [
    op:action op:BlockGitOperation ;
    op:reason "Branch must match naming convention" ;
    op:suggestion "Use feature/, hotfix/, or release/ prefix"
  ] .

# Hook 5: Track author statistics
gh:TrackAuthorStats a gh:Hook ;
  rdfs:label "Update author commit statistics" ;
  gh:query """
    SELECT ?author (COUNT(?commit) as ?count) WHERE {
      ?commit a git:CommitEvent ;
        git:author ?author .
    }
    GROUP BY ?author
  """ ;
  gh:onMatch [
    op:action op:UpdateRDF ;
    op:triple [
      op:subject ?author ;
      op:predicate git:commitCount ;
      op:object ?count
    ]
  ] .
```

### Layer 3: Reactive Workflow Execution

**What**: Workflows triggered by hook matches.

```turtle
gh:AutoReviewWorkflow a gh:Hook ;
  gh:query """
    SELECT ?commit ?author ?files WHERE {
      ?commit a git:CommitEvent ;
        git:branch "main" ;
        git:author ?author ;
        git:filesChanged ?files .
      ?author a git:Author ;
        git:seniority git:Junior .
      FILTER(?files > 10)  # Large commit
    }
  """ ;
  op:hasPipeline [
    op:hasStep gh:step-static-analysis ;
    op:hasStep gh:step-notify-reviewer ;
    op:hasStep gh:step-schedule-meeting
  ] .

gh:step-static-analysis a op:SPARQLStep ;
  op:query """
    SELECT ?issue WHERE {
      ?commit git:filesChanged ?file .
      ?file a git:CodeFile ;
        code:hasIssue ?issue .
    }
  """ ;
  op:timeout 60000 .

gh:step-notify-reviewer a op:CLIStep ;
  op:command "gh pr comment ${commit} --body 'Large commit detected. Assigned to @senior-dev for review.'" ;
  op:timeout 30000 .

gh:step-schedule-meeting a op:HTTPStep ;
  op:endpoint "https://slack.com/api/chat.scheduleMessage" ;
  op:method "POST" ;
  op:timeout 30000 .
```

---

## Implementation: Git Lifecycle Events

### 1. Pre-Commit (Files Staged)

**Trigger**: `git commit` (before commit is created)

**Available Data**:
- Staged files and hunks
- Author (from git config)
- Commit message (if available)
- Branch
- Repository state

**RDF Triples Created**:
```turtle
git:precommit-1 a git:PreCommitEvent ;
  git:author "alice@example.com" ;
  git:message "feat: add feature" ;
  git:branch "main" ;
  git:stagedFiles ("src/file1.js" "src/file2.js") ;
  git:timestamp "2024-01-15T14:23:00Z"^^xsd:dateTime .
```

**Use Cases**:
- Lint staged files
- Check for secrets
- Validate commit message
- Prevent commits to main

### 2. Prepare-Commit-Msg (Message Edited)

**Trigger**: `git commit` (before user edits message)

**Available Data**:
- Default message (merge/amend/etc)
- Commit type
- Branch
- Staged files

**Use Cases**:
- Auto-generate changelog entries
- Add issue references
- Suggest conventional commit format

### 3. Commit-Msg (Message Available)

**Trigger**: `git commit` (after user edits message)

**Available Data**:
- Full commit message
- Author
- Staged files
- Branch

**Use Cases**:
- Validate commit message format
- Check issue reference exists
- Ensure message length
- Parse semantic commit info

### 4. Post-Commit (Commit Created)

**Trigger**: `git commit` (after commit is created)

**Available Data**:
- Commit hash
- Author
- Message
- Files changed
- Parent commits
- Timestamp

**RDF Triples Created**:
```turtle
git:commit-abc123 a git:CommitEvent ;
  git:hash "abc123" ;
  git:author "alice@example.com" ;
  git:message "feat: add feature X" ;
  git:branch "main" ;
  git:filesAdded ("src/feature.js") ;
  git:filesModified ("README.md") ;
  git:parents git:commit-parent1 ;
  git:timestamp "2024-01-15T14:23:45Z"^^xsd:dateTime .
```

**Use Cases**:
- Track commit statistics
- Trigger CI/CD on commit
- Generate changelog
- Update project metrics

### 5. Pre-Push (Before Push)

**Trigger**: `git push` (before pushing to remote)

**Available Data**:
- Remote
- Commits to push
- Branches
- Force flag
- Tracked vs untracked

**Use Cases**:
- Validate commits before push
- Check all tests pass
- Require code review approval
- Prevent force push to main

### 6. Post-Push (After Push)

**Trigger**: `git push` (after successful push)

**Available Data**:
- Remote
- Pushed commits
- Updated refs
- Branch
- Timestamp

**Use Cases**:
- Notify team of changes
- Trigger deployment
- Update dashboard
- Archive to backup

### 7. Pre-Merge (Before Merge)

**Trigger**: `git merge` (before merge operation)

**Available Data**:
- Source branch
- Target branch
- Merge base
- Conflicts (pre-detected)
- Commits to merge
- Files affected

**Use Cases**:
- Detect conflicts early
- Require approvals
- Check branch protections
- Validate merge strategy

### 8. Post-Merge (After Merge)

**Trigger**: `git merge` (after merge completes)

**Available Data**:
- Merge commit
- Source branch
- Target branch
- Conflicts resolved count
- Files merged
- Duration

**Use Cases**:
- Track merge metrics
- Auto-delete merged branches
- Notify stakeholders
- Trigger post-merge tests

### 9. Post-Checkout (After Checkout)

**Trigger**: `git checkout` (after switching branches)

**Available Data**:
- Previous branch
- New branch
- Commit changed
- Files affected
- Is branch creation flag

**Use Cases**:
- Install dependencies if package.json changed
- Update IDE settings
- Notify developer
- Log work in progress

### 10. Post-Rewrite (After Rebase/Amend)

**Trigger**: `git rebase` or `git commit --amend`

**Available Data**:
- Old commits
- New commits
- Rebase head
- Whether amend or rebase

**Use Cases**:
- Validate rewritten commits
- Update CI/CD status
- Notify reviewers
- Update dashboards

---

## Data Model: Git Events in RDF

### Core Ontologies

```turtle
@prefix git: <http://example.org/git#> .
@prefix op: <http://example.org/operations#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# Event types
git:CommitEvent rdfs:subClassOf prov:Activity .
git:BranchEvent rdfs:subClassOf prov:Activity .
git:PushEvent rdfs:subClassOf prov:Activity .
git:MergeEvent rdfs:subClassOf prov:Activity .
git:TagEvent rdfs:subClassOf prov:Activity .
git:CheckoutEvent rdfs:subClassOf prov:Activity .

# Properties
git:hash rdf:type rdf:Property ; rdfs:range xsd:string .
git:author rdf:type rdf:Property ; rdfs:range git:Author .
git:timestamp rdf:type rdf:Property ; rdfs:range xsd:dateTime .
git:branch rdf:type rdf:Property ; rdfs:range xsd:string .
git:message rdf:type rdf:Property ; rdfs:range xsd:string .
git:filesChanged rdf:type rdf:Property ; rdfs:range rdf:Seq .
git:filesAdded rdf:type rdf:Property ; rdfs:range rdf:Seq .
git:filesModified rdf:type rdf:Property ; rdfs:range rdf:Seq .
git:filesDeleted rdf:type rdf:Property ; rdfs:range rdf:Seq .
git:parents rdf:type rdf:Property ; rdfs:range git:Commit .
git:conflictsDetected rdf:type rdf:Property ; rdfs:range xsd:integer .

# Author information
git:Author a rdfs:Class .
git:Author rdfs:property git:name ; rdfs:range xsd:string .
git:Author rdfs:property git:email ; rdfs:range xsd:string .
git:Author rdfs:property git:commitCount ; rdfs:range xsd:integer .
git:Author rdfs:property git:seniority ; rdfs:range git:SeniorityLevel .

git:SeniorityLevel a rdfs:Class .
git:Junior a git:SeniorityLevel .
git:Senior a git:SeniorityLevel .
git:Lead a git:SeniorityLevel .
```

### Author Tracking

```turtle
# Track authors in RDF for repeated queries
git:author-alice a git:Author ;
  git:name "Alice Developer" ;
  git:email "alice@example.com" ;
  git:commitCount 127 ;
  git:linesAdded 5432 ;
  git:linesDeleted 892 ;
  git:seniority git:Senior ;
  git:joinDate "2023-01-15"^^xsd:date ;
  git:lastCommit "2024-01-15T14:23:45Z"^^xsd:dateTime .

# Track per-branch statistics
git:branch-main a git:Branch ;
  git:name "main" ;
  git:commitCount 427 ;
  git:contributors (git:author-alice git:author-bob git:author-carol) ;
  git:lastCommit git:commit-abc123 ;
  git:lastPush "2024-01-15T14:35:00Z"^^xsd:dateTime ;
  git:protected true .
```

---

## Query Patterns: Knowledge Hook Examples

### Pattern 1: Find High-Risk Commits

```sparql
PREFIX git: <http://example.org/git#>
SELECT ?commit ?author ?files ?changes WHERE {
  ?commit a git:CommitEvent ;
    git:author ?author ;
    git:filesChanged ?files ;
    git:branch "main" .

  ?commit git:filesModified ?modified ;
    git:filesDeleted ?deleted .

  BIND(strlen(?modified) + strlen(?deleted) AS ?changes)
  FILTER(?changes > 1000)  # Large commit
}
ORDER BY DESC(?changes)
```

### Pattern 2: Track Merge Velocity

```sparql
PREFIX git: <http://example.org/git#>
SELECT ?author (COUNT(?merge) AS ?merges)
       (AVG(?duration) AS ?avgTime) WHERE {
  ?merge a git:MergeEvent ;
    git:author ?author ;
    git:duration ?duration .

  FILTER(?duration < 3600000)  # Less than 1 hour
}
GROUP BY ?author
ORDER BY DESC(?merges)
```

### Pattern 3: Detect CI/CD Failures Before Merge

```sparql
PREFIX git: <http://example.org/git#>
PREFIX ci: <http://example.org/ci#>
SELECT ?merge ?branch ?failedTests WHERE {
  ?merge a git:MergeEvent ;
    git:source ?branch .

  ?branch ci:hasCI ?ciRun .
  ?ciRun ci:status ci:Failed ;
    ci:failedTests ?failedTests .

  FILTER(?failedTests > 0)
}
```

### Pattern 4: Enforce Code Review on Large Changes

```sparql
PREFIX git: <http://example.org/git#>
PREFIX review: <http://example.org/review#>
SELECT ?commit ?author ?fileCount WHERE {
  ?commit a git:CommitEvent ;
    git:branch "main" ;
    git:author ?author ;
    git:filesChanged ?fileCount .

  FILTER(?fileCount > 5)

  OPTIONAL {
    ?review review:approvesCommit ?commit ;
      review:reviewer ?reviewer .
  }

  FILTER(!BOUND(?reviewer))  # Not approved yet
}
```

---

## Implementation Roadmap: v3.2.0 - v3.4.0

### Phase 1: Semantic Git Events (v3.2.0)

**Goal**: Model git lifecycle as RDF.

**Tasks**:
1. Define git event ontology (RDF schema)
2. Implement event capture for 10 git hooks
3. Store events as RDF triples
4. Create query patterns for common use cases
5. Add SPARQL step type support

**Deliverables**:
- `src/git-lifecycle/GitEventCapture.mjs` - Capture git events
- `src/rdf/git-ontology.ttl` - RDF schema for git events
- `tests/e2e/git-lifecycle.test.mjs` - 30+ tests
- `docs/GIT-LIFECYCLE-ARCHITECTURE.md` - Design docs

### Phase 2: Knowledge Hooks Integration (v3.3.0)

**Goal**: Reactive hooks on git patterns.

**Tasks**:
1. Extend HookOrchestrator to query git triples
2. Implement hook matching on git events
3. Add workflow triggering from hook matches
4. Create reusable hook templates
5. Add debugging/tracing

**Deliverables**:
- `src/hooks/GitLifecycleHooks.mjs` - Hook engine for git events
- `examples/git-lifecycle-hooks/` - 10+ example hooks
- `tests/e2e/git-hooks-integration.test.mjs` - 50+ tests

### Phase 3: Advanced Features (v3.4.0)

**Goal**: Sophisticated git automation.

**Tasks**:
1. Server-side hooks (pre-receive, update)
2. Async event processing
3. Multi-repository correlation
4. ML-based anomaly detection
5. Dashboard visualization

**Deliverables**:
- Server-side hook support
- Event correlation engine
- Analytics dashboard
- Advanced query optimization

---

## Testing Strategy

### Unit Tests
- Event capture correctness
- RDF triple generation
- SPARQL query execution
- Hook matching logic

### Integration Tests
- End-to-end git operations
- Hook execution flow
- Workflow triggering
- Data consistency

### E2E Tests
- Real git repository
- Multiple hooks firing
- Concurrent operations
- Conflict scenarios

---

## Security Considerations

### 1. Hook Execution Context
- Hooks run with repository access
- Prevent arbitrary code execution
- Sandbox hook actions

### 2. Data Privacy
- Commit messages may contain sensitive data
- Control what's stored in RDF
- Audit trail for hook executions

### 3. Server-Side Hooks
- Prevent unauthorized pushes
- Validate merge strategies
- Enforce branch protection

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Event capture | < 50ms per git operation |
| Hook evaluation | < 100ms per pattern |
| Query execution | < 500ms for 10k commits |
| Workflow trigger | < 1s total latency |
| Storage | < 10MB per 1000 events |

---

## Next Steps

1. **Design Review**: Discuss ontology design with team
2. **Prototype**: Build event capture for 3 git events
3. **Validate**: Test with real repositories
4. **Iterate**: Refine based on feedback
5. **Release**: v3.2.0 with full implementation

---

## References

- Git Hooks: https://git-scm.com/docs/githooks
- PROV Ontology: https://www.w3.org/TR/prov-o/
- SPARQL 1.1: https://www.w3.org/TR/sparql11-query/
- Previous: [v3.1.0 Architecture](docs/80-20-ARCHITECTURE.md)
