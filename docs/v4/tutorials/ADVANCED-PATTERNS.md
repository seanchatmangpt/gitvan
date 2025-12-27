# Advanced Hook Patterns

Master sophisticated patterns for building powerful Knowledge Hook systems.

---

## Table of Contents

1. [Reactive Hook Chains](#reactive-hook-chains)
2. [Event Sourcing Pattern](#event-sourcing-pattern)
3. [Saga Pattern for Distributed Workflows](#saga-pattern)
4. [Feature Flags with Knowledge Graphs](#feature-flags)
5. [Dynamic Workflow Generation](#dynamic-workflow-generation)
6. [Multi-Environment Hooks](#multi-environment-hooks)
7. [Observability Patterns](#observability-patterns)
8. [Hook Composition](#hook-composition)

---

## Reactive Hook Chains

Create hooks that trigger other hooks based on graph changes.

### Pattern: Cascading Hooks

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Level 1: PR Merged Hook
ex:pr-merged-hook rdf:type gh:Hook ;
    gv:title "PR Merged Handler" ;
    gh:hasPredicate ex:pr-merged-pred ;
    gh:orderedPipelines ex:pr-merged-pipeline .

ex:pr-merged-pred rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?pr ?mergedAt WHERE {
            ?pr rdf:type gv:PullRequest .
            ?pr gv:status "merged" .
            ?pr gv:mergedAt ?mergedAt .
        } ORDER BY ?pr
    """ .

ex:pr-merged-pipeline rdf:type op:Pipeline ;
    op:steps (ex:mark-release-candidate ex:trigger-next) .

# This step updates the graph, triggering Level 2
ex:mark-release-candidate rdf:type gv:TemplateStep ;
    gv:text """
        @prefix gv: <https://gitvan.dev/ontology#> .
        gv:currentBuild rdf:type gv:ReleaseCandidate ;
            gv:triggeredAt "{{ now }}" ;
            gv:fromPR "{{ pr }}" .
    """ ;
    gv:filePath "./hooks/state/release-candidate.ttl" .

ex:trigger-next rdf:type op:CLIStep ;
    op:command "gitvan hooks evaluate-category release" ;
    op:dependsOn ex:mark-release-candidate .

# Level 2: Release Candidate Hook
ex:release-candidate-hook rdf:type gh:Hook ;
    gv:title "Release Candidate Builder" ;
    gh:category "release" ;
    gh:hasPredicate ex:has-release-candidate ;
    gh:orderedPipelines ex:build-release-pipeline .

ex:has-release-candidate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?build rdf:type gv:ReleaseCandidate .
            NOT EXISTS { ?build gv:processed true }
        }
    """ .

ex:build-release-pipeline rdf:type op:Pipeline ;
    op:steps (ex:build-artifacts ex:run-tests ex:mark-processed) .
```

### Pattern: Fan-Out Hooks

Trigger multiple independent hooks from one event.

```turtle
# Master hook that fans out
ex:code-change-hook rdf:type gh:Hook ;
    gv:title "Code Change Fan-Out" ;
    gh:hasPredicate ex:code-changed-pred ;
    gh:orderedPipelines ex:fan-out-pipeline .

ex:fan-out-pipeline rdf:type op:Pipeline ;
    op:steps (ex:trigger-lint ex:trigger-test ex:trigger-security) .

# These run in parallel
ex:trigger-lint rdf:type op:CLIStep ;
    op:command "gitvan hooks evaluate-domain lint" ;
    op:async true .

ex:trigger-test rdf:type op:CLIStep ;
    op:command "gitvan hooks evaluate-domain test" ;
    op:async true .

ex:trigger-security rdf:type op:CLIStep ;
    op:command "gitvan hooks evaluate-domain security" ;
    op:async true .
```

---

## Event Sourcing Pattern

Capture all state changes as immutable events.

### Event Store Implementation

```turtle
# Event Producer Hook
ex:state-change-hook rdf:type gh:Hook ;
    gv:title "Event Sourcing Producer" ;
    gh:hasPredicate ex:any-change-pred ;
    gh:orderedPipelines ex:event-pipeline .

ex:any-change-pred rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?s ?p ?o WHERE {
            ?s ?p ?o .
        } ORDER BY ?s ?p ?o
    """ .

ex:event-pipeline rdf:type op:Pipeline ;
    op:steps (ex:capture-diff ex:write-event ex:update-snapshot) .

ex:capture-diff rdf:type op:SPARQLStep ;
    op:query """
        # Compare current and previous state
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?subject ?predicate ?oldValue ?newValue WHERE {
            # This would use MINUS to find changes
            ?subject ?predicate ?newValue .
        }
    """ ;
    op:outputVar "changes" .

ex:write-event rdf:type gv:TemplateStep ;
    gv:text """
@prefix ev: <https://gitvan.dev/events#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ev:event-{{ eventId }} rdf:type ev:StateChangeEvent ;
    ev:timestamp "{{ now }}"^^xsd:dateTime ;
    ev:changeCount {{ changes.length }} ;
    ev:aggregateId "{{ aggregateId }}" ;
    ev:eventData '''{{ changes | json }}''' .
""" ;
    gv:filePath "./events/{{ now | date('YYYYMMDD') }}/event-{{ eventId }}.ttl" ;
    op:dependsOn ex:capture-diff .

# Event Consumer Hook
ex:event-consumer-hook rdf:type gh:Hook ;
    gv:title "Event Consumer" ;
    gh:hasPredicate ex:new-events-pred ;
    gh:orderedPipelines ex:consume-pipeline .

ex:new-events-pred rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX ev: <https://gitvan.dev/events#>
        SELECT ?event ?timestamp WHERE {
            ?event rdf:type ev:StateChangeEvent .
            ?event ev:timestamp ?timestamp .
            NOT EXISTS { ?event ev:processed true }
        } ORDER BY ?timestamp
    """ .
```

---

## Saga Pattern

Coordinate long-running workflows with compensation.

```turtle
# Saga: Multi-Step Deployment
ex:deployment-saga rdf:type gh:Hook ;
    gv:title "Deployment Saga" ;
    gh:hasPredicate ex:deployment-requested ;
    gh:orderedPipelines ex:saga-pipeline .

ex:deployment-requested rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?deploy rdf:type gv:DeploymentRequest .
            ?deploy gv:status "pending" .
        }
    """ .

ex:saga-pipeline rdf:type op:Pipeline ;
    op:steps (
        ex:saga-start
        ex:step-backup
        ex:step-deploy
        ex:step-verify
        ex:saga-complete
    ) .

# Saga state tracking
ex:saga-start rdf:type gv:TemplateStep ;
    gv:text """
        @prefix saga: <https://gitvan.dev/saga#> .
        saga:current rdf:type saga:ActiveSaga ;
            saga:startedAt "{{ now }}" ;
            saga:status "running" ;
            saga:completedSteps () .
    """ ;
    gv:filePath "./saga/current.ttl" .

# Step with compensation
ex:step-backup rdf:type op:CLIStep ;
    gv:label "Create Backup" ;
    op:command "npm run backup:create" ;
    op:onFailure ex:saga-compensate ;
    op:dependsOn ex:saga-start .

ex:step-deploy rdf:type op:CLIStep ;
    gv:label "Deploy Application" ;
    op:command "npm run deploy:production" ;
    op:onFailure ex:compensate-backup ;
    op:dependsOn ex:step-backup .

ex:step-verify rdf:type op:CLIStep ;
    gv:label "Verify Deployment" ;
    op:command "npm run verify:production" ;
    op:onFailure ex:compensate-deploy ;
    op:dependsOn ex:step-deploy .

# Compensation handlers
ex:compensate-deploy rdf:type op:CLIStep ;
    op:command "npm run rollback:production" ;
    op:condition "{{ previousStepFailed }}" .

ex:compensate-backup rdf:type op:CLIStep ;
    op:command "npm run backup:cleanup" ;
    op:dependsOn ex:compensate-deploy .

ex:saga-complete rdf:type gv:TemplateStep ;
    gv:text """
        @prefix saga: <https://gitvan.dev/saga#> .
        saga:current saga:status "completed" ;
            saga:completedAt "{{ now }}" .
    """ ;
    gv:filePath "./saga/current.ttl" ;
    op:dependsOn ex:step-verify .
```

---

## Feature Flags

Control feature rollout through knowledge graphs.

```turtle
# Feature Flag State
# File: hooks/features.ttl
@prefix ff: <https://gitvan.dev/features#> .

ff:darkMode rdf:type ff:FeatureFlag ;
    ff:name "dark-mode" ;
    ff:enabled true ;
    ff:rolloutPercentage 50 ;
    ff:targetEnvironments ("staging" "production") .

ff:newCheckout rdf:type ff:FeatureFlag ;
    ff:name "new-checkout" ;
    ff:enabled false ;
    ff:requiresFlags (ff:darkMode) .

# Feature Flag Hook
ex:feature-flag-sync rdf:type gh:Hook ;
    gv:title "Feature Flag Sync" ;
    gh:hasPredicate ex:flags-changed ;
    gh:orderedPipelines ex:sync-flags-pipeline .

ex:flags-changed rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX ff: <https://gitvan.dev/features#>
        SELECT ?flag ?enabled ?percentage WHERE {
            ?flag rdf:type ff:FeatureFlag .
            ?flag ff:enabled ?enabled .
            OPTIONAL { ?flag ff:rolloutPercentage ?percentage }
        } ORDER BY ?flag
    """ .

ex:sync-flags-pipeline rdf:type op:Pipeline ;
    op:steps (ex:generate-config ex:deploy-config) .

ex:generate-config rdf:type op:SPARQLStep ;
    op:query """
        PREFIX ff: <https://gitvan.dev/features#>
        SELECT ?name ?enabled ?percentage WHERE {
            ?flag rdf:type ff:FeatureFlag .
            ?flag ff:name ?name .
            ?flag ff:enabled ?enabled .
            OPTIONAL { ?flag ff:rolloutPercentage ?percentage }
        }
    """ ;
    op:outputVar "flags" .

ex:deploy-config rdf:type gv:TemplateStep ;
    gv:text """
{
  "features": {
    {% for flag in flags.results %}
    "{{ flag.name }}": {
      "enabled": {{ flag.enabled }},
      "rollout": {{ flag.percentage | default(100) }}
    }{% if not loop.last %},{% endif %}
    {% endfor %}
  }
}
    """ ;
    gv:filePath "./config/features.json" ;
    op:dependsOn ex:generate-config .
```

---

## Dynamic Workflow Generation

Generate workflows based on graph queries.

```turtle
# Dynamic Task Processor
ex:dynamic-processor rdf:type gh:Hook ;
    gv:title "Dynamic Task Processor" ;
    gh:hasPredicate ex:pending-tasks ;
    gh:orderedPipelines ex:dynamic-pipeline .

ex:pending-tasks rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?task rdf:type gv:AutomatedTask .
            ?task gv:status "pending" .
        }
    """ .

ex:dynamic-pipeline rdf:type op:Pipeline ;
    op:steps (ex:query-tasks ex:generate-workflow ex:execute-workflow) .

ex:query-tasks rdf:type op:SPARQLStep ;
    op:query """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?task ?command ?timeout ?priority WHERE {
            ?task rdf:type gv:AutomatedTask .
            ?task gv:status "pending" .
            ?task gv:command ?command .
            OPTIONAL { ?task gv:timeout ?timeout }
            OPTIONAL { ?task gv:priority ?priority }
        } ORDER BY DESC(?priority)
    """ ;
    op:outputVar "tasks" .

ex:generate-workflow rdf:type gv:TemplateStep ;
    gv:text """
@prefix op: <https://gitvan.dev/op#> .
@prefix gv: <https://gitvan.dev/ontology#> .

ex:generated-pipeline rdf:type op:Pipeline ;
    op:steps (
        {% for task in tasks.results %}
        ex:task-{{ loop.index }}{% if not loop.last %},{% endif %}
        {% endfor %}
    ) .

{% for task in tasks.results %}
ex:task-{{ loop.index }} rdf:type op:CLIStep ;
    gv:label "Task {{ loop.index }}" ;
    op:command "{{ task.command }}" ;
    op:timeout {{ task.timeout | default(60000) }} .
{% endfor %}
    """ ;
    gv:filePath "./hooks/generated/tasks.ttl" ;
    op:dependsOn ex:query-tasks .

ex:execute-workflow rdf:type op:CLIStep ;
    op:command "gitvan workflow run generated-pipeline" ;
    op:dependsOn ex:generate-workflow .
```

---

## Multi-Environment Hooks

Environment-aware hook execution.

```turtle
# Environment Detection
ex:env-aware-hook rdf:type gh:Hook ;
    gv:title "Environment-Aware Deployment" ;
    gh:hasPredicate ex:deployment-trigger ;
    gh:orderedPipelines ex:env-pipeline .

ex:deployment-trigger rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?deploy rdf:type gv:DeploymentRequest .
            ?deploy gv:approved true .
        }
    """ .

ex:env-pipeline rdf:type op:Pipeline ;
    op:steps (ex:detect-env ex:dev-deploy ex:staging-deploy ex:prod-deploy) .

ex:detect-env rdf:type op:CLIStep ;
    op:command "echo $DEPLOY_ENV" ;
    op:outputVar "env" .

ex:dev-deploy rdf:type op:CLIStep ;
    gv:label "Deploy to Development" ;
    op:command "npm run deploy:dev" ;
    op:condition "{{ env == 'development' }}" ;
    op:dependsOn ex:detect-env .

ex:staging-deploy rdf:type op:CLIStep ;
    gv:label "Deploy to Staging" ;
    op:command "npm run deploy:staging" ;
    op:condition "{{ env == 'staging' }}" ;
    op:dependsOn ex:detect-env .

ex:prod-deploy rdf:type op:Pipeline ;
    gv:label "Deploy to Production" ;
    op:condition "{{ env == 'production' }}" ;
    op:steps (ex:prod-backup ex:prod-deploy-step ex:prod-verify) ;
    op:dependsOn ex:detect-env .

ex:prod-backup rdf:type op:CLIStep ;
    op:command "npm run backup:create" .

ex:prod-deploy-step rdf:type op:CLIStep ;
    op:command "npm run deploy:production" ;
    op:dependsOn ex:prod-backup .

ex:prod-verify rdf:type op:CLIStep ;
    op:command "npm run verify:production" ;
    op:dependsOn ex:prod-deploy-step .
```

---

## Observability Patterns

### Metrics Collection Hook

```turtle
ex:metrics-collector rdf:type gh:Hook ;
    gv:title "Metrics Collector" ;
    gh:hasPredicate ex:collect-interval ;
    gh:orderedPipelines ex:metrics-pipeline .

ex:collect-interval rdf:type gh:TemporalPredicate ;
    gh:timeWindow 300000 ;  # Every 5 minutes
    gh:queryText """
        ASK WHERE { BIND(true AS ?always) }
    """ .

ex:metrics-pipeline rdf:type op:Pipeline ;
    op:steps (ex:collect-hook-metrics ex:collect-workflow-metrics ex:push-metrics) .

ex:collect-hook-metrics rdf:type op:SPARQLStep ;
    op:query """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX ev: <https://gitvan.dev/events#>
        SELECT
            (COUNT(?hook) AS ?totalHooks)
            (COUNT(?triggered) AS ?triggeredHooks)
            (AVG(?duration) AS ?avgDuration)
        WHERE {
            ?execution rdf:type ev:HookExecution .
            ?execution ev:hookId ?hook .
            OPTIONAL {
                ?execution ev:triggered true .
                BIND(?execution AS ?triggered)
            }
            OPTIONAL { ?execution ev:duration ?duration }
        }
    """ ;
    op:outputVar "hookMetrics" .

ex:push-metrics rdf:type op:HTTPStep ;
    op:url "https://metrics.example.com/api/v1/write" ;
    op:method "POST" ;
    op:headers """{"Authorization": "Bearer ${METRICS_TOKEN}"}""" ;
    op:body """
        {
            "metrics": [
                {"name": "gitvan.hooks.total", "value": {{ hookMetrics.totalHooks }}},
                {"name": "gitvan.hooks.triggered", "value": {{ hookMetrics.triggeredHooks }}},
                {"name": "gitvan.hooks.avg_duration_ms", "value": {{ hookMetrics.avgDuration }}}
            ]
        }
    """ ;
    op:dependsOn ex:collect-hook-metrics .
```

### Audit Trail Hook

```turtle
ex:audit-trail rdf:type gh:Hook ;
    gv:title "Audit Trail Logger" ;
    gh:hasPredicate ex:any-execution ;
    gh:orderedPipelines ex:audit-pipeline .

ex:any-execution rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX ev: <https://gitvan.dev/events#>
        SELECT ?execution ?timestamp ?hookId WHERE {
            ?execution rdf:type ev:HookExecution .
            ?execution ev:timestamp ?timestamp .
            ?execution ev:hookId ?hookId .
        } ORDER BY DESC(?timestamp) LIMIT 100
    """ .

ex:audit-pipeline rdf:type op:Pipeline ;
    op:steps (ex:format-audit ex:write-audit ex:rotate-logs) .

ex:format-audit rdf:type gv:TemplateStep ;
    gv:text """
{{ now | date('YYYY-MM-DD HH:mm:ss') }} | HOOK_EXECUTION | {{ hookId }} | {{ status }}
    """ ;
    gv:filePath "./logs/audit.log" ;
    gv:mode "append" .
```

---

## Hook Composition

Compose reusable hook components.

```turtle
# Base notification component
ex:notification-component rdf:type op:Pipeline ;
    op:steps (ex:format-message ex:send-slack ex:send-email) .

ex:format-message rdf:type gv:TemplateStep ;
    gv:text "{{ messageTemplate }}" ;
    gv:outputVar "formattedMessage" .

ex:send-slack rdf:type op:HTTPStep ;
    op:url "https://slack.com/api/chat.postMessage" ;
    op:condition "{{ channels.slack }}" ;
    op:body """{"text": "{{ formattedMessage }}"}""" ;
    op:dependsOn ex:format-message .

ex:send-email rdf:type op:HTTPStep ;
    op:url "https://api.sendgrid.com/v3/mail/send" ;
    op:condition "{{ channels.email }}" ;
    op:body """{"content": "{{ formattedMessage }}"}""" ;
    op:dependsOn ex:format-message .

# Hook using the component
ex:bug-notification-hook rdf:type gh:Hook ;
    gv:title "Bug Notification" ;
    gh:hasPredicate ex:critical-bug-pred ;
    gh:orderedPipelines ex:bug-notify-pipeline .

ex:bug-notify-pipeline rdf:type op:Pipeline ;
    op:steps (ex:prepare-bug-message ex:use-notification) .

ex:prepare-bug-message rdf:type op:SPARQLStep ;
    op:query """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?title ?severity WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:severity "critical" .
            ?bug gv:title ?title .
        }
    """ ;
    op:outputVar "bugs" .

# Compose with notification component
ex:use-notification rdf:type op:WorkflowStep ;
    op:workflow ex:notification-component ;
    op:inputs """
        {
            "messageTemplate": "Critical Bug Alert: {{ bugs.results | length }} bugs found",
            "channels": {"slack": true, "email": true}
        }
    """ ;
    op:dependsOn ex:prepare-bug-message .
```

---

## Summary

These advanced patterns enable:

1. **Reactive Systems**: Hooks that respond to and trigger other hooks
2. **Event Sourcing**: Immutable event logs for debugging and replay
3. **Saga Workflows**: Compensating transactions for reliability
4. **Feature Flags**: Dynamic feature control through graphs
5. **Dynamic Workflows**: Runtime workflow generation
6. **Multi-Environment**: Environment-aware execution
7. **Observability**: Metrics, logging, and audit trails
8. **Composition**: Reusable hook components

---

## Next Steps

- [Performance Optimization](PERFORMANCE-OPTIMIZATION.md)
- [Security Best Practices](../security/SECURITY-GUIDE.md)
- [Testing Strategies](../testing/TESTING-GUIDE.md)
