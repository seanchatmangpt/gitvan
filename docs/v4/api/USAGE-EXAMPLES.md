# GitVan v4 Hook Usage Examples

Practical examples for every hook type and common use cases.

---

## Table of Contents

1. [Basic Hook Examples](#basic-hook-examples)
2. [Predicate Examples](#predicate-examples)
3. [Workflow Examples](#workflow-examples)
4. [Integration Examples](#integration-examples)
5. [Advanced Patterns](#advanced-patterns)

---

## Basic Hook Examples

### Example 1: Simple ASK Hook

Triggers when any bug exists in the project.

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:bug-exists-hook rdf:type gh:Hook ;
    gv:title "Bug Exists Alert" ;
    gh:hasPredicate ex:bug-exists-pred ;
    gh:orderedPipelines ex:bug-alert-pipeline .

ex:bug-exists-pred rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?bug rdf:type gv:Bug .
        }
    """ ;
    gh:description "Checks if any bugs exist" .

ex:bug-alert-pipeline rdf:type op:Pipeline ;
    op:steps (ex:log-bugs) .

ex:log-bugs rdf:type gv:TemplateStep ;
    gv:text "Bug detected at {{ now | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:filePath "./logs/bugs.log" .
```

### Example 2: Version Change Detection

Triggers when project version changes.

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:version-change-hook rdf:type gh:Hook ;
    gv:title "Version Change Detection" ;
    gh:hasPredicate ex:version-change-pred ;
    gh:orderedPipelines ex:version-pipeline .

ex:version-change-pred rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?version WHERE {
            ?project rdf:type gv:Project .
            ?project gv:version ?version .
        }
    """ ;
    gh:description "Detects version changes" .

ex:version-pipeline rdf:type op:Pipeline ;
    op:steps (ex:update-changelog ex:notify-team) .

ex:update-changelog rdf:type gv:TemplateStep ;
    gv:text """
## {{ version }} - {{ now | date('YYYY-MM-DD') }}

Version updated automatically.
""" ;
    gv:filePath "./CHANGELOG.md" .

ex:notify-team rdf:type op:CLIStep ;
    op:command "echo 'Version changed to {{ version }}'" ;
    op:dependsOn ex:update-changelog .
```

### Example 3: Bug Threshold Alert

Triggers when open bugs exceed threshold.

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:bug-threshold-hook rdf:type gh:Hook ;
    gv:title "Bug Threshold Alert" ;
    gh:hasPredicate ex:bug-threshold-pred ;
    gh:orderedPipelines ex:alert-pipeline .

ex:bug-threshold-pred rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?bug) AS ?count) WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:status "open" .
        }
    """ ;
    gh:threshold 10 ;
    gh:operator ">" ;
    gh:description "Triggers when more than 10 open bugs" .

ex:alert-pipeline rdf:type op:Pipeline ;
    op:steps (ex:send-alert) .

ex:send-alert rdf:type op:CLIStep ;
    op:command "curl -X POST https://alerts.example.com/webhook -d '{\"message\": \"Bug threshold exceeded\"}'" ;
    op:timeout 30000 .
```

---

## Predicate Examples

### ResultDelta: Detecting Task Completion

```turtle
ex:task-completion-pred rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?task ?status ?completedAt WHERE {
            ?task rdf:type gv:Task .
            ?task gv:status ?status .
            FILTER(?status = "completed")
            OPTIONAL { ?task gv:completedAt ?completedAt }
        } ORDER BY ?task
    """ ;
    gh:description "Detects when tasks are completed" .
```

### ASK: Checking Deployment Readiness

```turtle
ex:deployment-ready-pred rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?project rdf:type gv:Project .
            ?project gv:testsPassing true .
            ?project gv:lintPassing true .
            ?project gv:buildPassing true .
            NOT EXISTS {
                ?bug rdf:type gv:Bug .
                ?bug gv:severity "critical" .
                ?bug gv:status "open" .
            }
        }
    """ ;
    gh:description "Checks if project is ready for deployment" .
```

### SELECTThreshold: Code Coverage Monitoring

```turtle
ex:coverage-pred rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?coverage WHERE {
            ?project rdf:type gv:Project .
            ?project gv:testCoverage ?coverage .
        }
    """ ;
    gh:threshold 80 ;
    gh:operator "<" ;
    gh:description "Triggers when code coverage falls below 80%" .
```

### SHACL: Schema Validation

```turtle
ex:schema-validation-pred rdf:type gh:SHACLAllConform ;
    gh:shapesText """
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix gv: <https://gitvan.dev/ontology#> .

        gv:TaskShape a sh:NodeShape ;
            sh:targetClass gv:Task ;
            sh:property [
                sh:path gv:title ;
                sh:minCount 1 ;
                sh:datatype xsd:string ;
                sh:minLength 3 ;
            ] ;
            sh:property [
                sh:path gv:status ;
                sh:minCount 1 ;
                sh:in ("pending" "in-progress" "completed" "blocked") ;
            ] ;
            sh:property [
                sh:path gv:assignee ;
                sh:maxCount 1 ;
                sh:nodeKind sh:IRI ;
            ] .
    """ ;
    gh:description "Validates task structure compliance" .
```

### CONSTRUCT: Deriving Dependencies

```turtle
ex:dependency-pred rdf:type gh:CONSTRUCT ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        CONSTRUCT {
            ?task gv:blockedBy ?blocker .
        } WHERE {
            ?task rdf:type gv:Task .
            ?task gv:dependsOn ?dependency .
            ?dependency gv:status ?status .
            FILTER(?status != "completed")
            BIND(?dependency AS ?blocker)
        }
    """ ;
    gh:description "Identifies blocking dependencies" .
```

### Temporal: Deadline Monitoring

```turtle
ex:deadline-pred rdf:type gh:TemporalPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
        SELECT ?task ?deadline WHERE {
            ?task rdf:type gv:Task .
            ?task gv:deadline ?deadline .
            ?task gv:status ?status .
            FILTER(?status != "completed")
            FILTER(?deadline < NOW())
        }
    """ ;
    gh:timeWindow 86400000 ;
    gh:description "Detects overdue tasks within 24 hours" .
```

---

## Workflow Examples

### Multi-Step Build Pipeline

```turtle
ex:build-pipeline rdf:type op:Pipeline ;
    op:steps (ex:lint ex:test ex:build ex:deploy) .

ex:lint rdf:type op:CLIStep ;
    gv:label "Run Linter" ;
    op:command "npm run lint" ;
    op:timeout 60000 ;
    op:failOn "error" .

ex:test rdf:type op:CLIStep ;
    gv:label "Run Tests" ;
    op:command "npm test" ;
    op:timeout 300000 ;
    op:dependsOn ex:lint .

ex:build rdf:type op:CLIStep ;
    gv:label "Build Project" ;
    op:command "npm run build" ;
    op:timeout 180000 ;
    op:dependsOn ex:test .

ex:deploy rdf:type op:CLIStep ;
    gv:label "Deploy to Staging" ;
    op:command "npm run deploy:staging" ;
    op:timeout 300000 ;
    op:dependsOn ex:build .
```

### Report Generation Workflow

```turtle
ex:report-pipeline rdf:type op:Pipeline ;
    op:steps (ex:gather-metrics ex:generate-report ex:send-report) .

ex:gather-metrics rdf:type op:SPARQLStep ;
    gv:label "Gather Metrics" ;
    op:query """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT
            (COUNT(?task) AS ?totalTasks)
            (COUNT(?completed) AS ?completedTasks)
            (COUNT(?bug) AS ?openBugs)
        WHERE {
            ?task rdf:type gv:Task .
            OPTIONAL {
                ?completed rdf:type gv:Task .
                ?completed gv:status "completed" .
            }
            OPTIONAL {
                ?bug rdf:type gv:Bug .
                ?bug gv:status "open" .
            }
        }
    """ ;
    op:outputVar "metrics" .

ex:generate-report rdf:type gv:TemplateStep ;
    gv:label "Generate Report" ;
    gv:text """
# Weekly Project Report - {{ now | date('YYYY-MM-DD') }}

## Summary
- Total Tasks: {{ metrics.totalTasks }}
- Completed: {{ metrics.completedTasks }}
- Open Bugs: {{ metrics.openBugs }}

## Status
{% if metrics.openBugs > 10 %}
**WARNING**: High number of open bugs!
{% else %}
Project health: Good
{% endif %}
""" ;
    gv:filePath "./reports/weekly-{{ now | date('YYYYMMDD') }}.md" ;
    op:dependsOn ex:gather-metrics .

ex:send-report rdf:type op:HTTPStep ;
    gv:label "Send Report" ;
    op:url "https://slack.com/api/chat.postMessage" ;
    op:method "POST" ;
    op:headers """{"Authorization": "Bearer ${SLACK_TOKEN}"}""" ;
    op:body """{"channel": "#reports", "text": "Weekly report generated"}""" ;
    op:dependsOn ex:generate-report .
```

### Conditional Workflow

```turtle
ex:conditional-pipeline rdf:type op:Pipeline ;
    op:steps (ex:check-env ex:prod-deploy ex:staging-deploy) .

ex:check-env rdf:type op:CLIStep ;
    gv:label "Check Environment" ;
    op:command "echo $DEPLOY_ENV" ;
    op:outputVar "deployEnv" .

ex:prod-deploy rdf:type op:CLIStep ;
    gv:label "Production Deploy" ;
    op:command "npm run deploy:prod" ;
    op:condition "{{ deployEnv == 'production' }}" ;
    op:dependsOn ex:check-env .

ex:staging-deploy rdf:type op:CLIStep ;
    gv:label "Staging Deploy" ;
    op:command "npm run deploy:staging" ;
    op:condition "{{ deployEnv != 'production' }}" ;
    op:dependsOn ex:check-env .
```

---

## Integration Examples

### GitHub Actions Integration

```javascript
// .github/scripts/run-hooks.mjs
import { KnowledgeHookRegistry } from 'gitvan/hooks';

async function runHooks() {
  const registry = new KnowledgeHookRegistry({
    hooksDir: './hooks',
    logger: console
  });

  await registry.initialize();

  const result = await registry.evaluateAll({
    verbose: true
  });

  console.log(`Hooks evaluated: ${result.hooksEvaluated}`);
  console.log(`Hooks triggered: ${result.hooksTriggered}`);
  console.log(`Workflows executed: ${result.workflowsExecuted}`);

  if (result.workflowsSuccessful < result.workflowsExecuted) {
    process.exit(1);
  }
}

runHooks().catch(console.error);
```

```yaml
# .github/workflows/hooks.yml
name: GitVan Hooks
on: [push, pull_request]

jobs:
  evaluate-hooks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: node .github/scripts/run-hooks.mjs
```

### Pre-Commit Hook Integration

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run GitVan hooks before commit
gitvan hooks evaluate --category pre-commit

if [ $? -ne 0 ]; then
    echo "GitVan pre-commit hooks failed!"
    exit 1
fi
```

### Programmatic Usage in Node.js

```javascript
import { HookOrchestrator } from 'gitvan/hooks';
import { useGit } from 'gitvan/composables';

async function automateWorkflow() {
  const git = useGit();
  const orchestrator = new HookOrchestrator({
    graphDir: './hooks'
  });

  // Check for changes
  const status = await git.statusPorcelain();

  if (status) {
    // Evaluate hooks before committing
    const result = await orchestrator.evaluate({
      dryRun: false,
      verbose: true
    });

    if (result.hooksTriggered > 0) {
      console.log('Hooks triggered workflows:');
      result.triggeredHooks.forEach(h => console.log(`  - ${h.title}`));
    }

    // Proceed with commit
    await git.add(['*']);
    await git.commit('chore: automated commit');
  }
}
```

---

## Advanced Patterns

### Cascading Hooks

Create hooks that trigger other hooks:

```turtle
# Primary hook
ex:primary-hook rdf:type gh:Hook ;
    gv:title "Primary Hook" ;
    gh:hasPredicate ex:primary-pred ;
    gh:orderedPipelines ex:primary-pipeline .

ex:primary-pipeline rdf:type op:Pipeline ;
    op:steps (ex:update-graph ex:trigger-secondary) .

ex:update-graph rdf:type gv:TemplateStep ;
    gv:text """
        @prefix gv: <https://gitvan.dev/ontology#> .
        gv:triggerSecondary gv:activated true .
    """ ;
    gv:filePath "./hooks/triggers.ttl" .

ex:trigger-secondary rdf:type op:CLIStep ;
    op:command "gitvan hooks evaluate --category secondary" ;
    op:dependsOn ex:update-graph .

# Secondary hook triggered by graph change
ex:secondary-hook rdf:type gh:Hook ;
    gv:title "Secondary Hook" ;
    gh:category "secondary" ;
    gh:hasPredicate ex:secondary-pred ;
    gh:orderedPipelines ex:secondary-pipeline .

ex:secondary-pred rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            gv:triggerSecondary gv:activated true .
        }
    """ .
```

### Parallel Step Execution

```turtle
ex:parallel-pipeline rdf:type op:Pipeline ;
    op:steps (ex:setup ex:parallel-group ex:finalize) .

ex:setup rdf:type op:CLIStep ;
    op:command "echo 'Setup complete'" .

# Parallel group - steps without explicit dependencies run concurrently
ex:parallel-group rdf:type op:ParallelGroup ;
    op:parallel (ex:task-a ex:task-b ex:task-c) ;
    op:dependsOn ex:setup .

ex:task-a rdf:type op:CLIStep ;
    op:command "npm run task:a" .

ex:task-b rdf:type op:CLIStep ;
    op:command "npm run task:b" .

ex:task-c rdf:type op:CLIStep ;
    op:command "npm run task:c" .

ex:finalize rdf:type op:CLIStep ;
    op:command "echo 'All parallel tasks complete'" ;
    op:dependsOn ex:parallel-group .
```

### Error Handling and Retry

```turtle
ex:resilient-pipeline rdf:type op:Pipeline ;
    op:steps (ex:risky-operation ex:fallback) .

ex:risky-operation rdf:type op:CLIStep ;
    op:command "npm run risky-task" ;
    op:timeout 60000 ;
    op:retries 3 ;
    op:retryDelay 5000 ;
    op:onFailure ex:fallback .

ex:fallback rdf:type op:CLIStep ;
    op:command "npm run safe-fallback" ;
    op:condition "{{ previousStepFailed }}" .
```

### Context-Aware Templates

```turtle
ex:context-aware-pipeline rdf:type op:Pipeline ;
    op:steps (ex:detect-context ex:apply-template) .

ex:detect-context rdf:type op:SPARQLStep ;
    op:query """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?env ?branch ?version WHERE {
            ?project rdf:type gv:Project .
            ?project gv:environment ?env .
            ?project gv:currentBranch ?branch .
            ?project gv:version ?version .
        }
    """ ;
    op:outputVar "context" .

ex:apply-template rdf:type gv:TemplateStep ;
    gv:text """
{% if context.env == 'production' %}
# Production Configuration
API_URL=https://api.example.com
{% elif context.env == 'staging' %}
# Staging Configuration
API_URL=https://staging.api.example.com
{% else %}
# Development Configuration
API_URL=http://localhost:3000
{% endif %}

VERSION={{ context.version }}
BRANCH={{ context.branch }}
""" ;
    gv:filePath "./.env.generated" ;
    op:dependsOn ex:detect-context .
```

---

## Next Steps

- [Best Practices Guide](BEST-PRACTICES.md)
- [Architecture Overview](../architecture/OVERVIEW.md)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)
