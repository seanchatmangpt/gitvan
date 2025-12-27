# GitVan v4 Best Practices Guide

Guidelines for building robust, maintainable, and performant Knowledge Hooks.

---

## Table of Contents

1. [Hook Design Principles](#hook-design-principles)
2. [Predicate Best Practices](#predicate-best-practices)
3. [Workflow Best Practices](#workflow-best-practices)
4. [Performance Optimization](#performance-optimization)
5. [Error Handling](#error-handling)
6. [Testing Strategies](#testing-strategies)
7. [Security Considerations](#security-considerations)
8. [Naming Conventions](#naming-conventions)

---

## Hook Design Principles

### 1. Single Responsibility

Each hook should have one clear purpose.

**Good:**
```turtle
ex:bug-threshold-alert rdf:type gh:Hook ;
    gv:title "Alert when bugs exceed threshold" .
```

**Avoid:**
```turtle
ex:do-everything-hook rdf:type gh:Hook ;
    gv:title "Check bugs, update changelog, deploy, and send notifications" .
```

### 2. Declarative Over Imperative

Define what should happen, not how to do it.

**Good:**
```turtle
ex:deployment-ready-pred rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            ?project gv:testsPassing true .
            ?project gv:buildPassing true .
        }
    """ .
```

**Avoid:**
```turtle
ex:check-deployment rdf:type op:CLIStep ;
    op:command "bash -c 'if npm test && npm run build; then echo ready; fi'" .
```

### 3. Idempotency

Hooks should produce the same result when run multiple times.

**Good:**
```turtle
ex:update-status rdf:type gv:TemplateStep ;
    gv:text "Status: {{ status }}" ;
    gv:filePath "./status.txt" .
    # Overwrites with same content - idempotent
```

**Avoid:**
```turtle
ex:append-log rdf:type gv:TemplateStep ;
    gv:text "Entry: {{ now }}" ;
    gv:filePath "./log.txt" ;
    gv:mode "append" .
    # Creates duplicate entries - not idempotent
```

### 4. Fail Fast

Detect problems early and fail clearly.

```turtle
ex:validate-first-pipeline rdf:type op:Pipeline ;
    op:steps (ex:validate ex:process ex:deploy) .

ex:validate rdf:type op:CLIStep ;
    op:command "npm run validate" ;
    op:failOn "warning" .  # Fail on any issue
```

---

## Predicate Best Practices

### 1. Use Specific Queries

Be precise in what you're querying.

**Good:**
```sparql
SELECT ?bug WHERE {
    ?bug rdf:type gv:Bug .
    ?bug gv:severity "critical" .
    ?bug gv:status "open" .
    ?bug gv:assignee ?assignee .
}
```

**Avoid:**
```sparql
SELECT * WHERE {
    ?s ?p ?o .
}
```

### 2. Order Results Consistently

Ensure ResultDelta predicates produce stable hashes.

```sparql
SELECT ?task ?status WHERE {
    ?task rdf:type gv:Task .
    ?task gv:status ?status .
} ORDER BY ?task
```

### 3. Use OPTIONAL for Incomplete Data

Handle missing properties gracefully.

```sparql
SELECT ?task ?assignee ?deadline WHERE {
    ?task rdf:type gv:Task .
    OPTIONAL { ?task gv:assignee ?assignee }
    OPTIONAL { ?task gv:deadline ?deadline }
}
```

### 4. Limit Query Scope

Avoid unbounded queries.

```sparql
SELECT ?task WHERE {
    ?task rdf:type gv:Task .
    ?task gv:createdAt ?created .
    FILTER(?created > "2024-01-01"^^xsd:date)
} LIMIT 100
```

### 5. Use Appropriate Predicate Types

| Use Case | Predicate Type |
|----------|---------------|
| Boolean check | `ASK` |
| State change detection | `ResultDelta` |
| Numeric monitoring | `SELECTThreshold` |
| Schema validation | `SHACL` |
| Time-based triggers | `Temporal` |

---

## Workflow Best Practices

### 1. Define Clear Dependencies

Make step dependencies explicit.

```turtle
ex:test rdf:type op:CLIStep ;
    op:command "npm test" ;
    op:dependsOn ex:build .  # Explicit dependency

ex:deploy rdf:type op:CLIStep ;
    op:command "npm run deploy" ;
    op:dependsOn ex:test .
```

### 2. Set Appropriate Timeouts

Prevent hanging steps.

```turtle
ex:quick-step rdf:type op:CLIStep ;
    op:command "npm run lint" ;
    op:timeout 30000 .  # 30 seconds

ex:long-step rdf:type op:CLIStep ;
    op:command "npm test" ;
    op:timeout 300000 .  # 5 minutes
```

### 3. Use Labels for Clarity

Add human-readable labels.

```turtle
ex:step1 rdf:type op:CLIStep ;
    gv:label "Run Unit Tests" ;
    op:command "npm run test:unit" .
```

### 4. Handle Step Output

Capture and use step output.

```turtle
ex:get-version rdf:type op:CLIStep ;
    op:command "node -p 'require(\"./package.json\").version'" ;
    op:outputVar "version" .

ex:tag-release rdf:type op:CLIStep ;
    op:command "git tag v{{ version }}" ;
    op:dependsOn ex:get-version .
```

### 5. Keep Workflows Small

Break large workflows into smaller, composable units.

```turtle
# Build workflow
ex:build-workflow rdf:type op:Pipeline ;
    op:steps (ex:lint ex:compile ex:bundle) .

# Test workflow
ex:test-workflow rdf:type op:Pipeline ;
    op:steps (ex:unit-tests ex:integration-tests) .

# Deploy workflow uses both
ex:deploy-workflow rdf:type op:Pipeline ;
    op:steps (ex:run-build ex:run-tests ex:deploy-step) .

ex:run-build rdf:type op:WorkflowStep ;
    op:workflow ex:build-workflow .

ex:run-tests rdf:type op:WorkflowStep ;
    op:workflow ex:test-workflow ;
    op:dependsOn ex:run-build .
```

---

## Performance Optimization

### 1. Minimize Graph Scans

Use indexed properties when possible.

```sparql
# Good - Uses indexed rdf:type
SELECT ?task WHERE {
    ?task rdf:type gv:Task .
    ?task gv:status "open" .
}

# Avoid - Scans all triples
SELECT ?s WHERE {
    ?s ?p "open" .
}
```

### 2. Cache Expensive Queries

Use ResultDelta for queries that don't need to run every time.

```turtle
ex:expensive-check rdf:type gh:ResultDelta ;
    gh:queryText """
        SELECT (COUNT(?item) AS ?count) WHERE {
            ?item rdf:type gv:LargeCollection .
        }
    """ .
    # Only triggers on change, not every evaluation
```

### 3. Limit Workflow Steps

Keep step counts reasonable.

```turtle
# Good - Focused workflow
ex:small-pipeline rdf:type op:Pipeline ;
    op:steps (ex:step1 ex:step2 ex:step3) .

# Avoid - Too many steps
ex:huge-pipeline rdf:type op:Pipeline ;
    op:steps (ex:step1 ex:step2 ... ex:step50) .
```

### 4. Use Parallel Execution

Run independent steps concurrently.

```turtle
ex:parallel-tests rdf:type op:ParallelGroup ;
    op:parallel (ex:unit-tests ex:integration-tests ex:e2e-tests) .
```

### 5. Lazy Loading

Only load graphs when needed.

```javascript
const orchestrator = new HookOrchestrator({
  lazyLoad: true,  // Only load hooks when evaluated
  graphDir: './hooks'
});
```

---

## Error Handling

### 1. Define Failure Behaviors

```turtle
ex:critical-step rdf:type op:CLIStep ;
    op:command "npm run critical-task" ;
    op:failOn "error" ;        # Stop on error
    op:continueOnError false . # Don't continue pipeline
```

### 2. Implement Retries

```turtle
ex:flaky-step rdf:type op:CLIStep ;
    op:command "npm run network-task" ;
    op:retries 3 ;
    op:retryDelay 5000 ;  # 5 seconds
    op:retryBackoff "exponential" .
```

### 3. Define Fallbacks

```turtle
ex:with-fallback rdf:type op:Pipeline ;
    op:steps (ex:main-step ex:fallback-step) .

ex:main-step rdf:type op:CLIStep ;
    op:command "npm run primary-task" ;
    op:onFailure ex:fallback-step .

ex:fallback-step rdf:type op:CLIStep ;
    op:command "npm run backup-task" ;
    op:condition "{{ previousStepFailed }}" .
```

### 4. Log Errors Appropriately

```turtle
ex:with-logging rdf:type op:CLIStep ;
    op:command "npm run task 2>&1 | tee ./logs/task.log" ;
    op:timeout 60000 .
```

---

## Testing Strategies

### 1. Test Predicates in Isolation

```javascript
import { PredicateEvaluator } from 'gitvan/hooks';

describe('Bug Threshold Predicate', () => {
  it('triggers when bugs exceed threshold', async () => {
    const evaluator = new PredicateEvaluator();
    const mockGraph = createMockGraph({ bugCount: 15 });

    const result = await evaluator.evaluate(
      predicate,
      mockGraph,
      null,
      {}
    );

    expect(result.result).toBe(true);
  });
});
```

### 2. Test Workflows End-to-End

```javascript
import { HookOrchestrator } from 'gitvan/hooks';

describe('Build Workflow', () => {
  it('executes all steps in order', async () => {
    const orchestrator = new HookOrchestrator({
      graphDir: './test-hooks'
    });

    const result = await orchestrator.evaluate({ verbose: true });

    expect(result.workflowsSuccessful).toBe(result.workflowsExecuted);
  });
});
```

### 3. Use Dry Run Mode

```bash
gitvan hooks evaluate --dry-run
```

### 4. Validate Hooks Before Deployment

```bash
gitvan hooks validate my-hook
```

---

## Security Considerations

### 1. Never Hardcode Secrets

```turtle
# Good - Use environment variables
ex:deploy rdf:type op:CLIStep ;
    op:command "curl -H 'Authorization: Bearer ${API_TOKEN}' ..." .

# Avoid - Hardcoded secrets
ex:deploy rdf:type op:CLIStep ;
    op:command "curl -H 'Authorization: Bearer abc123secret' ..." .
```

### 2. Validate Input

```turtle
ex:user-input rdf:type op:CLIStep ;
    op:command "echo {{ input | escape }}" .
```

### 3. Limit Command Scope

```turtle
# Good - Specific command
ex:lint rdf:type op:CLIStep ;
    op:command "npm run lint" .

# Avoid - Shell interpolation
ex:dangerous rdf:type op:CLIStep ;
    op:command "bash -c '{{ userCommand }}'" .
```

### 4. Use Sandboxed Execution

```javascript
const orchestrator = new HookOrchestrator({
  sandbox: true,  // Enable sandbox mode
  allowedCommands: ['npm', 'node', 'git']
});
```

### 5. Audit Hook Changes

```bash
git log --oneline -- hooks/
```

---

## Naming Conventions

### Hook Files

```
hooks/
  domain-area/
    feature-name.ttl
```

Examples:
- `hooks/developer-workflow/start-of-day.ttl`
- `hooks/jtbd-hooks/core-development/code-review.ttl`
- `hooks/cron/daily-cleanup.ttl`

### Hook IDs

Use kebab-case with descriptive names.

```turtle
ex:critical-bug-alert rdf:type gh:Hook .
ex:version-change-detection rdf:type gh:Hook .
ex:deployment-readiness-check rdf:type gh:Hook .
```

### Predicate IDs

Suffix with `-pred` or `-predicate`.

```turtle
ex:bug-threshold-pred rdf:type gh:SELECTThreshold .
ex:version-change-predicate rdf:type gh:ResultDelta .
```

### Pipeline IDs

Suffix with `-pipeline`.

```turtle
ex:build-pipeline rdf:type op:Pipeline .
ex:deploy-production-pipeline rdf:type op:Pipeline .
```

### Step IDs

Use action-oriented names.

```turtle
ex:run-tests rdf:type op:CLIStep .
ex:send-notification rdf:type op:HTTPStep .
ex:generate-report rdf:type gv:TemplateStep .
```

---

## Summary Checklist

- [ ] Single responsibility per hook
- [ ] Specific and ordered SPARQL queries
- [ ] Explicit step dependencies
- [ ] Appropriate timeouts set
- [ ] Error handling defined
- [ ] No hardcoded secrets
- [ ] Hooks validated before deployment
- [ ] Meaningful names following conventions
- [ ] Tests for predicates and workflows
- [ ] Documentation for complex hooks

---

## Next Steps

- [Security Best Practices](../security/SECURITY-GUIDE.md)
- [Testing Strategies](../testing/TESTING-GUIDE.md)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)
