# Git Lifecycle Knowledge Hooks: Implementation Architecture

**For v3.2.0 Feature Development**

---

## System Architecture

### Layer Stack

```
┌─────────────────────────────────────────────────────────────┐
│  User Layer: Knowledge Hooks (TTL definitions)              │
│  "When git events match pattern, execute workflow"          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Application Layer: Hook Engine & Workflow Executor         │
│  - GitLifecycleHooks: Match patterns against events         │
│  - HookOrchestrator: Execute workflows on matches           │
│  - KnowledgeHookManager: Reactive event handling            │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Integration Layer: Git Event Capture & RDF Store           │
│  - GitEventCapture: Hook into 10 git lifecycle events       │
│  - EventToRDF: Convert git events to RDF triples            │
│  - KnowledgeSubstrateCore: Store and query triples          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│  Data Layer: RDF Store (N3 triples)                         │
│  - Commit events, branch events, merge events, etc.         │
│  - Author statistics, repository metrics                    │
│  - Query index for SPARQL performance                       │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. **GitEventCapture** (`src/git-lifecycle/GitEventCapture.mjs`)

**Responsibility**: Hook into git operations and capture semantic events.

```javascript
/**
 * Captures git lifecycle events and converts to RDF
 */
export class GitEventCapture {
  constructor(core, gitNative) {
    this.core = core;              // KnowledgeSubstrateCore
    this.gitNative = gitNative;    // Git operations
    this.eventHandlers = new Map();
  }

  // Register handlers for git hooks
  async registerHooks() {
    this.on('pre-commit', this.handlePreCommit);
    this.on('post-commit', this.handlePostCommit);
    this.on('pre-push', this.handlePrePush);
    this.on('post-push', this.handlePostPush);
    this.on('pre-merge', this.handlePreMerge);
    this.on('post-merge', this.handlePostMerge);
    this.on('post-checkout', this.handlePostCheckout);
    this.on('branch-create', this.handleBranchCreate);
    this.on('tag-create', this.handleTagCreate);
    this.on('post-rewrite', this.handlePostRewrite);
  }

  // Event handlers convert git state to RDF
  async handlePostCommit(context) {
    const { hash, author, message, files, branch, timestamp } = context;

    // Create RDF triples for commit event
    const commitTriple = quad(
      namedNode(`git:commit-${hash}`),
      namedNode('rdf:type'),
      namedNode('git:CommitEvent')
    );

    const authorTriple = quad(
      namedNode(`git:commit-${hash}`),
      namedNode('git:author'),
      namedNode(`git:author-${author}`)
    );

    const filesTriple = quad(
      namedNode(`git:commit-${hash}`),
      namedNode('git:filesChanged'),
      literal(files.length)
    );

    // Store in KnowledgeSubstrateCore
    await this.core.store.add(commitTriple);
    await this.core.store.add(authorTriple);
    await this.core.store.add(filesTriple);

    // Trigger knowledge hook evaluation
    await this.evaluateHooks('post-commit', { hash, author, message, files, branch, timestamp });
  }

  async handlePreMerge(context) {
    const { source, target, conflicts } = context;

    // Create merge event triples
    const mergeTriple = quad(
      namedNode(`git:merge-${Date.now()}`),
      namedNode('rdf:type'),
      namedNode('git:MergeEvent')
    );

    // ... additional triples for merge details

    // Evaluate hooks before merge happens
    await this.evaluateHooks('pre-merge', context);
  }

  // Query helpers for common patterns
  async queryCommitsByBranch(branch) {
    return this.core.query({
      query: `
        PREFIX git: <http://example.org/git#>
        SELECT ?commit ?author ?timestamp WHERE {
          ?commit a git:CommitEvent ;
            git:branch "${branch}" ;
            git:author ?author ;
            git:timestamp ?timestamp .
        }
        ORDER BY DESC(?timestamp)
      `
    });
  }

  async queryAuthorStats(author) {
    return this.core.query({
      query: `
        PREFIX git: <http://example.org/git#>
        SELECT (COUNT(?commit) AS ?count) ?author WHERE {
          ?commit a git:CommitEvent ;
            git:author "${author}" .
        }
        GROUP BY ?author
      `
    });
  }
}
```

#### 2. **GitLifecycleHooks** (`src/hooks/GitLifecycleHooks.mjs`)

**Responsibility**: Evaluate knowledge hooks against git events.

```javascript
/**
 * Matches git events against knowledge hook patterns
 */
export class GitLifecycleHooks {
  constructor(core, orchest rator) {
    this.core = core;                    // KnowledgeSubstrateCore
    this.orchestrator = orchestrator;    // HookOrchestrator
    this.hooks = new Map();              // Loaded hooks
  }

  async loadHooks() {
    // Load all hooks from RDF store
    const hooksResult = await this.core.query({
      query: `
        PREFIX gh: <http://example.org/git-hooks#>
        PREFIX git: <http://example.org/git#>
        SELECT ?hook ?label ?query WHERE {
          ?hook a gh:Hook ;
            rdfs:label ?label ;
            gh:query ?query ;
            gh:eventType ?eventType .
        }
      `
    });

    for (const row of hooksResult.results.bindings) {
      this.hooks.set(row.hook.value, {
        label: row.label.value,
        query: row.query.value,
        actions: await this.loadHookActions(row.hook.value)
      });
    }
  }

  async evaluateHooks(eventType, eventData) {
    // Get matching hooks for this event type
    const matchingHooks = this.hooks.filter(hook => {
      return hook.eventTypes.includes(eventType);
    });

    // Execute each matching hook
    for (const [hookId, hook] of matchingHooks) {
      try {
        // Query to find matching patterns
        const matches = await this.core.query({
          query: hook.query,
          timeout: 5000
        });

        if (matches.results.bindings.length > 0) {
          // Hook matched! Execute actions
          await this.executeHookActions(hookId, hook.actions, matches);

          // Trigger workflows if configured
          if (hook.workflow) {
            await this.orchestrator.executeWorkflow(hook.workflow, {
              matchedEvents: matches.results.bindings,
              originalEvent: eventData
            });
          }
        }
      } catch (error) {
        console.error(`Error evaluating hook ${hookId}:`, error);
        // Log error but don't block other hooks
      }
    }
  }

  async executeHookActions(hookId, actions, matches) {
    for (const action of actions) {
      switch (action.type) {
        case 'notify-slack':
          await this.notifySlack(action, matches);
          break;
        case 'create-issue':
          await this.createGitHubIssue(action, matches);
          break;
        case 'update-rdf':
          await this.updateRDF(action, matches);
          break;
        case 'execute-workflow':
          // Handled separately by orchestrator
          break;
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    }
  }

  async notifySlack(action, matches) {
    const message = this.renderTemplate(action.template, matches);
    // Call Slack API
  }

  async createGitHubIssue(action, matches) {
    const title = this.renderTemplate(action.titleTemplate, matches);
    const body = this.renderTemplate(action.bodyTemplate, matches);
    // Create GitHub issue
  }

  async updateRDF(action, matches) {
    for (const match of matches.results.bindings) {
      const triple = this.createTripleFromAction(action, match);
      await this.core.store.add(triple);
    }
  }
}
```

#### 3. **GitEventStore** (`src/git-lifecycle/GitEventStore.mjs`)

**Responsibility**: Manage lifecycle and retention of git events.

```javascript
/**
 * Manages storage and lifecycle of git events
 */
export class GitEventStore {
  constructor(core) {
    this.core = core;
    this.retentionPolicy = {
      commitEvents: 90 * 24 * 60 * 60 * 1000,      // 90 days
      pushEvents: 30 * 24 * 60 * 60 * 1000,        // 30 days
      branchEvents: 60 * 24 * 60 * 60 * 1000,      // 60 days
      temporaryEvents: 7 * 24 * 60 * 60 * 1000     // 7 days (pre-commit, etc)
    };
  }

  async archiveOldEvents() {
    // Move old events to archive, keep index
    const now = Date.now();

    for (const [type, retention] of Object.entries(this.retentionPolicy)) {
      const cutoffTime = new Date(now - retention);

      await this.core.query({
        query: `
          PREFIX git: <http://example.org/git#>
          DELETE {
            ?event ?predicate ?object .
          }
          WHERE {
            ?event a git:${type} ;
              git:timestamp ?timestamp .
            ?event ?predicate ?object .
            FILTER(?timestamp < "${cutoffTime.toISOString()}"^^xsd:dateTime)
          }
        `
      });
    }
  }

  async compressEvents() {
    // Summarize old events into aggregates
    // Keep detailed data for 30 days, aggregates for 1 year
  }

  async getEventMetrics() {
    return this.core.query({
      query: `
        PREFIX git: <http://example.org/git#>
        SELECT
          (COUNT(?commit) as ?totalCommits)
          (COUNT(DISTINCT ?author) as ?uniqueAuthors)
          (COUNT(?merge) as ?totalMerges)
          (AVG(?filesChanged) as ?avgFilesPerCommit)
        WHERE {
          OPTIONAL { ?commit a git:CommitEvent ; git:filesChanged ?filesChanged . }
          OPTIONAL { ?author a git:Author . }
          OPTIONAL { ?merge a git:MergeEvent . }
        }
      `
    });
  }
}
```

---

## File Structure

```
src/
├── git-lifecycle/                  # NEW: Git lifecycle integration
│   ├── GitEventCapture.mjs        # Capture git events
│   ├── GitEventStore.mjs          # Manage event lifecycle
│   ├── git-hooks/                 # Git hook shell scripts
│   │   ├── pre-commit.sh
│   │   ├── post-commit.sh
│   │   ├── pre-push.sh
│   │   └── ... (10 hooks total)
│   └── index.mjs                  # Exports
│
├── hooks/
│   ├── GitLifecycleHooks.mjs      # MODIFIED: Add git lifecycle support
│   ├── HookOrchestrator.mjs       # MODIFIED: Support git lifecycle hooks
│   └── ...
│
├── rdf/                            # NEW: Ontologies
│   ├── git-ontology.ttl           # Git event schema
│   ├── prov-ontology.ttl          # Provenance schema
│   └── index.mjs
│
└── ...

tests/
└── e2e/
    ├── git-lifecycle.test.mjs     # NEW: End-to-end tests
    └── git-hooks-integration.test.mjs  # NEW: Hook integration tests

docs/
├── GIT-LIFECYCLE-HOOKS.md         # Architecture & concepts
├── GIT-LIFECYCLE-IMPLEMENTATION.md  # This file
└── examples/
    ├── git-lifecycle-hooks-tutorial.md  # Beginner tutorial
    └── git-lifecycle-advanced-patterns.md # Advanced patterns

examples/
└── git-lifecycle-hooks/           # NEW: Example hooks
    ├── enforce-branch-naming.ttl
    ├── deploy-on-version-tag.ttl
    ├── review-large-commits.ttl
    ├── track-author-stats.ttl
    └── ... (10+ examples)
```

---

## Integration Points

### 1. Git Configuration

```bash
# In .git/hooks/, GitVan installs wrapper scripts
gitvan init --enable-git-lifecycle

# Sets up:
# .git/hooks/pre-commit → gitvan-pre-commit
# .git/hooks/post-commit → gitvan-post-commit
# .git/hooks/pre-push → gitvan-pre-push
# ... and 7 more hooks
```

### 2. KnowledgeSubstrateCore Integration

```javascript
// Events stored in core.store
const core = await createKnowledgeSubstrateCore({
  enableObservability: true,
  enableKnowledgeHookManager: true,  // Hooks react to events
  enableTransactionManager: true,    // Events are transactions
});

// Git events are RDF triples
await core.store.add(commitTriple);

// Hooks query the store
const results = await core.query({ query: sparqlQuery });
```

### 3. Workflow Execution

```javascript
// Hook matches trigger workflows
gh:DeployOnTag a gh:Hook ;
  gh:query "..." ;
  gh:workflow op:DeployProduction .  // Workflow to run

// Workflow receives context
{
  matchedEvents: [ { commit, author, tag } ],
  originalEvent: { timestamp, branch }
}
```

---

## Key Design Decisions

### 1. **Events as RDF Triples (Not Events)**

✅ **Why**: Query-able, composable, provenance tracking
❌ **Alternative**: Event objects in memory

### 2. **Synchronous Hook Evaluation**

✅ **Why**: Immediate response (block commits if needed)
❌ **Alternative**: Async queue processing
📌 **Future**: Hybrid approach in v3.3.0

### 3. **Author Entities in RDF**

✅ **Why**: Enable author-based queries, track stats
❌ **Alternative**: Just store email strings
📌 **Extension**: Link to team data in v3.3.0

### 4. **Event Retention Policy**

✅ **Why**: Keep detailed data for 90 days, aggregate after
❌ **Alternative**: Store everything forever
📌 **Rationale**: Performance + storage tradeoff

### 5. **Hook Definitions in TTL**

✅ **Why**: Versioned in git, queryable, composable
❌ **Alternative**: YAML or JavaScript files
📌 **Pattern**: Consistent with GitVan philosophy

---

## Example: From Commit to Hook Execution

### Scenario: "Alert on commits > 1000 lines to main by junior devs"

**Step 1: Git Event Captured**
```bash
$ git commit -m "feat: large feature"
# Hook runs: post-commit
```

**Step 2: Event Converted to RDF**
```turtle
git:commit-abc123 a git:CommitEvent ;
  git:hash "abc123" ;
  git:author "junior@example.com" ;
  git:branch "main" ;
  git:filesChanged 15 ;
  git:linesAdded 1200 ;
  git:timestamp "2024-01-15T14:23:45Z"^^xsd:dateTime ;
  git:message "feat: large feature" .

git:author-junior a git:Author ;
  git:seniority git:Junior .
```

**Step 3: Hook Pattern Matched**
```sparql
SELECT ?commit ?author ?lines WHERE {
  ?commit a git:CommitEvent ;
    git:branch "main" ;
    git:linesAdded ?lines ;
    git:author ?author .

  ?author git:seniority git:Junior .
  FILTER(?lines > 1000)
}
# Result: Matches! commit=abc123, author=junior@example.com, lines=1200
```

**Step 4: Hook Actions Executed**
```javascript
// From hook definition:
gh:AlertLargeCommits a gh:Hook ;
  gh:query "..." ;
  gh:onMatch [
    op:action op:NotifySlack ;
    op:channel "#code-review" ;
    op:template "large-commit-alert"
  ] .

// Renders message with matched values
// Sends: "@senior-devs Large commit detected: 1200 lines by junior@example.com"
```

**Step 5: Workflow Triggered (Optional)**
```turtle
gh:AlertLargeCommits op:hasPipeline [
  op:hasStep gh:step-notify ;
  op:hasStep gh:step-assign-reviewer
] .

# Workflow runs with context:
# { commit: abc123, author: junior@example.com, lines: 1200 }
```

---

## Testing Strategy

### Unit Tests

```javascript
// Test event capture
test('post-commit captures commit as RDF', async () => {
  const context = {
    hash: 'abc123',
    author: 'alice@example.com',
    message: 'feat: test',
    files: ['src/file.js'],
    branch: 'main'
  };

  await eventCapture.handlePostCommit(context);

  const triples = await core.query({
    query: `
      SELECT * WHERE {
        ?commit a git:CommitEvent ;
          git:hash "abc123" .
      }
    `
  });

  expect(triples.results.bindings).toHaveLength(1);
});

// Test hook matching
test('hook matches large commits to main', async () => {
  await core.store.add(largeCommitTriple);

  const matches = await gitLifecycleHooks.evaluateHooks('post-commit', {});

  expect(matches).toContainHook('AlertLargeCommits');
});
```

### Integration Tests

```javascript
// Test real git operations
test('commit → RDF → hook match → workflow trigger', async () => {
  // Create temp repo
  const repo = await createTestRepo();

  // Make commit
  await git.commit('feat: test feature');

  // Hook should have fired
  const hooks = await getExecutedHooks();
  expect(hooks).toContain('SomeHook');

  // Workflow should have been triggered
  const executions = await getWorkflowExecutions();
  expect(executions).toHaveLength(1);
});
```

### E2E Tests

```javascript
// Real repository, multiple hooks, concurrent operations
test('realistic git workflow triggers multiple hooks', async () => {
  // Clone real repo or create complex scenario
  // Make multiple commits
  // Create branch
  // Create merge
  // Verify all hooks fired correctly
  // Check RDF store has all events
  // Validate workflows executed
});
```

---

## Performance Considerations

### Hook Evaluation Latency

**Target**: < 100ms total

- Event capture: 10ms
- RDF storage: 20ms
- Hook query execution: 50ms
- Action execution: 20ms

**Optimization**:
- Index common queries (branch, author)
- Cache hook definitions
- Parallel action execution
- Query result caching

### Storage Efficiency

**Target**: < 10MB per 1000 events

- Compress old events (aggregate)
- Archive to git history
- Use RDF compression (HDT format)
- Summary statistics instead of details

---

## Deployment Strategy

### Phase 1: Feature Branch Development

```bash
git checkout -b feature/git-lifecycle
# Implement all components
# All tests passing locally
```

### Phase 2: PR Review

```bash
git push origin feature/git-lifecycle
# Create PR
# Code review + architecture review
# Update based on feedback
```

### Phase 3: Staging Testing

```bash
# Deploy to staging environment
# Test with real repositories
# Performance testing
# Concurrent hook execution
```

### Phase 4: Release v3.2.0

```bash
# Merge to main
# Tag v3.2.0
# Update docs
# Announce new features
```

---

## Success Criteria

✅ **Functional**
- [ ] 10 git hooks capturing events
- [ ] Events stored as RDF triples
- [ ] Hook evaluation on patterns
- [ ] Workflow execution from hooks

✅ **Quality**
- [ ] 80%+ test coverage
- [ ] All 59+ tests passing
- [ ] No performance degradation
- [ ] Full documentation

✅ **Usability**
- [ ] 5+ example hooks
- [ ] Tutorial guide
- [ ] Clear error messages
- [ ] Easy integration

---

## References

- Git Hooks: `git help hooks`
- Current v3.1.0: [80-20 Architecture](80-20-ARCHITECTURE.md)
- Previous: [FMEA Risk Analysis](FMEA-RISK-ANALYSIS.md)
