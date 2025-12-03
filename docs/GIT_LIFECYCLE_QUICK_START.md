# GitVan Git Lifecycle — Quick Start Guide

## Installation

```bash
# Install GitVan
npm install gitvan

# Copy git hooks to your repository
cp node_modules/gitvan/src/git-lifecycle/git-hooks/* .git/hooks/

# Make hooks executable
chmod +x .git/hooks/*
```

## Basic Usage

### Capture Git Events

```javascript
import { GitEventCapture } from "gitvan/git-lifecycle";

const capture = new GitEventCapture();
await capture.initialize();

// Capture a commit event
await capture.capturePostCommit({
  commitHash: "abc123",
  commitMessage: "feat: add feature",
  branchName: "main",
});
```

### Query Events

```javascript
import { GitEventStore } from "gitvan/git-lifecycle";

const store = new GitEventStore();
await store.initialize();

// Get recent commits
const events = await store.getEventsByType("post-commit", {
  limit: 10,
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
});
```

### Evaluate Hooks

```javascript
import { GitLifecycleHooks } from "gitvan/git-lifecycle";

const hooks = new GitLifecycleHooks();
await hooks.initialize();

// Handle pre-commit (with hook evaluation)
const result = await hooks.handlePreCommit({
  stagedFiles: ["src/index.js", "README.md"],
});

console.log(result.hooksEvaluated); // true
```

## SPARQL Queries

### Find Recent Commits
```sparql
PREFIX gitv: <https://gitvan.dev/ontology/git#>
PREFIX prov: <http://www.w3.org/ns/prov#>

SELECT ?commitHash ?branchName ?timestamp
WHERE {
  ?event gitv:eventType "post-commit" ;
         gitv:commitHash ?commitHash ;
         gitv:branchName ?branchName ;
         prov:atTime ?timestamp .
}
ORDER BY DESC(?timestamp)
LIMIT 10
```

### Count Events by Type
```sparql
PREFIX gitv: <https://gitvan.dev/ontology/git#>

SELECT ?eventType (COUNT(?event) as ?count)
WHERE {
  ?event gitv:eventType ?eventType .
}
GROUP BY ?eventType
ORDER BY DESC(?count)
```

## CLI Commands

```bash
# Handle a git event (called by hooks)
gitvan hooks handle-event pre-commit --stdin < event.json

# Query events
gitvan hooks query-events --type post-commit --limit 100

# Get statistics
gitvan hooks stats

# Enforce retention (dry run)
gitvan hooks enforce-retention --dry-run

# Enforce retention (actual cleanup)
gitvan hooks enforce-retention
```

## Environment Variables

```bash
# Enable verbose hook output
export GITVAN_VERBOSE=1

# Customize GitVan CLI path
export GITVAN_CLI=/path/to/gitvan
```

## Hook Configuration

### Enable Specific Hooks Only

```bash
# Only enable pre-commit and post-commit
cd .git/hooks
rm -f prepare-commit-msg commit-msg pre-push post-push \
      post-checkout post-merge post-rewrite post-update
```

### Disable Hook Evaluation

```javascript
const hooks = new GitLifecycleHooks({
  evaluateHooks: false, // Only capture events, don't evaluate hooks
});
```

### Capture-Only Mode

```javascript
// Capture event without evaluating hooks
await hooks.handlePreCommit({}, { captureOnly: true });
```

## Testing Hooks

```bash
# Test pre-commit hook
echo '{"branchName":"main","stagedFiles":["test.js"]}' | \
  gitvan hooks handle-event pre-commit --stdin

# Test post-commit hook
echo '{"commitHash":"abc123","branchName":"main"}' | \
  gitvan hooks handle-event post-commit --stdin
```

## Retention Policies

**Detail Tier (90 days):**
- Full event data
- All properties
- Diagnostic information

**Aggregate Tier (1 year):**
- Daily statistics
- Event counts
- Basic metadata

**Automatic Cleanup:**
```javascript
const store = new GitEventStore({
  detailRetentionDays: 90,
  aggregateRetentionDays: 365,
  autoCleanup: true, // Cleanup every 24 hours
});
```

## Performance Tips

1. **Use capture-only mode** for high-frequency operations
2. **Enable auto-cleanup** to prevent unbounded growth
3. **Limit SPARQL queries** with appropriate filters
4. **Persist events** periodically for crash recovery

## Common Patterns

### Commit Workflow
```javascript
// Pre-commit: Validate before commit
await hooks.handlePreCommit({ stagedFiles: [...] });

// Post-commit: Capture successful commit
await hooks.handlePostCommit({
  commitHash: "abc123",
  commitMessage: "feat: add feature",
  filesChanged: 5,
});
```

### Push Workflow
```javascript
// Pre-push: Validate before push
await hooks.handlePrePush({
  remoteName: "origin",
  pushedRefs: ["refs/heads/main"],
});

// Post-push: Capture successful push
await hooks.handlePostPush({
  remoteName: "origin",
  pushedRefs: ["refs/heads/main"],
});
```

### Analytics
```javascript
const store = new GitEventStore();
await store.initialize();

// Get statistics
const stats = await store.getStats();
console.log(`Total events: ${stats.totalEvents}`);
console.log(`By type:`, stats.eventTypes);

// Enforce retention
const retention = await store.enforceRetention({ dryRun: false });
console.log(`Removed ${retention.detailEventsRemoved} detail events`);
```

## Troubleshooting

### Hooks Not Executing
```bash
# Check hook permissions
ls -la .git/hooks/

# Make executable if needed
chmod +x .git/hooks/*

# Check GitVan CLI is in PATH
which gitvan
```

### Events Not Captured
```bash
# Enable verbose mode
export GITVAN_VERBOSE=1

# Check for errors
git commit -m "test" 2>&1 | grep -i error
```

### Store Growing Too Large
```javascript
// Reduce retention periods
const store = new GitEventStore({
  detailRetentionDays: 30,  // Reduced from 90
  aggregateRetentionDays: 180, // Reduced from 365
});

// Manual cleanup
await store.enforceRetention({ dryRun: false });
```

## Next Steps

1. Read the [full documentation](./GIT_LIFECYCLE_PHASE1.md)
2. Explore [example queries](./GIT_LIFECYCLE_PHASE1.md#sparql-queries)
3. Check the [API reference](./GIT_LIFECYCLE_PHASE1.md#api-reference)
4. Review [performance benchmarks](./GIT_LIFECYCLE_PHASE1.md#performance)

## Support

- Documentation: `/docs/GIT_LIFECYCLE_PHASE1.md`
- Tests: `/tests/git-lifecycle/git-lifecycle-phase1.test.mjs`
- Issues: https://github.com/gitvan/gitvan/issues
