# GitVan v4 Example Projects

Complete example hook collections for common use cases.

---

## Table of Contents

1. [Bug Tracking System](#bug-tracking-system)
2. [CI/CD Pipeline](#cicd-pipeline)
3. [Release Automation](#release-automation)
4. [Code Quality Gates](#code-quality-gates)
5. [Developer Workflow](#developer-workflow)

---

## Bug Tracking System

A complete bug tracking and alert system using Knowledge Hooks.

### Project Structure

```
bug-tracker/
  hooks/
    data/
      bugs.ttl           # Bug data
      projects.ttl       # Project data
    alerts/
      critical-bugs.ttl  # Critical bug alerts
      bug-threshold.ttl  # Bug count threshold
      overdue-bugs.ttl   # Overdue bug alerts
    reports/
      daily-report.ttl   # Daily bug report
      weekly-summary.ttl # Weekly summary
  reports/               # Generated reports
  logs/                  # Alert logs
```

### Bug Data Model

```turtle
# hooks/data/bugs.ttl
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

gv:bug-001 rdf:type gv:Bug ;
    gv:title "Login page crashes on mobile" ;
    gv:severity "critical" ;
    gv:status "open" ;
    gv:assignee gv:dev-alice ;
    gv:createdAt "2024-01-15"^^xsd:date ;
    gv:dueDate "2024-01-20"^^xsd:date .

gv:bug-002 rdf:type gv:Bug ;
    gv:title "Typo in settings page" ;
    gv:severity "low" ;
    gv:status "open" ;
    gv:assignee gv:dev-bob ;
    gv:createdAt "2024-01-18"^^xsd:date .

gv:bug-003 rdf:type gv:Bug ;
    gv:title "API timeout on large datasets" ;
    gv:severity "high" ;
    gv:status "in-progress" ;
    gv:assignee gv:dev-charlie ;
    gv:createdAt "2024-01-10"^^xsd:date ;
    gv:dueDate "2024-01-25"^^xsd:date .
```

### Critical Bug Alert Hook

```turtle
# hooks/alerts/critical-bugs.ttl
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:critical-bug-alert rdf:type gh:Hook ;
    gv:title "Critical Bug Alert" ;
    gv:category "alerts" ;
    gh:hasPredicate ex:has-critical-bugs ;
    gh:orderedPipelines ex:alert-pipeline .

ex:has-critical-bugs rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:severity "critical" .
            ?bug gv:status "open" .
        }
    """ ;
    gh:description "Triggers when critical bugs exist" .

ex:alert-pipeline rdf:type op:Pipeline ;
    op:steps (ex:count-critical ex:send-slack ex:log-alert) .

ex:count-critical rdf:type op:SPARQLStep ;
    gv:label "Count Critical Bugs" ;
    op:query """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?bug) AS ?count) ?title WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:severity "critical" .
            ?bug gv:status "open" .
            ?bug gv:title ?title .
        } GROUP BY ?title
    """ ;
    op:outputVar "criticalBugs" .

ex:send-slack rdf:type op:HTTPStep ;
    gv:label "Send Slack Alert" ;
    op:url "${SLACK_WEBHOOK_URL}" ;
    op:method "POST" ;
    op:body """
        {
            "text": "ALERT: {{ criticalBugs.count }} critical bug(s) found!",
            "attachments": [
                {
                    "color": "danger",
                    "title": "Critical Bugs",
                    "text": "{% for bug in criticalBugs.results %}{{ bug.title }}\n{% endfor %}"
                }
            ]
        }
    """ ;
    op:dependsOn ex:count-critical .

ex:log-alert rdf:type gv:TemplateStep ;
    gv:text """{{ now | date('YYYY-MM-DD HH:mm:ss') }} | CRITICAL | {{ criticalBugs.count }} bugs | {{ criticalBugs.results | map('title') | join(', ') }}""" ;
    gv:filePath "./logs/alerts.log" ;
    gv:mode "append" ;
    op:dependsOn ex:send-slack .
```

### Bug Threshold Hook

```turtle
# hooks/alerts/bug-threshold.ttl
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:bug-threshold-alert rdf:type gh:Hook ;
    gv:title "Bug Threshold Alert" ;
    gv:category "alerts" ;
    gh:hasPredicate ex:too-many-bugs ;
    gh:orderedPipelines ex:threshold-pipeline .

ex:too-many-bugs rdf:type gh:SELECTThreshold ;
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

ex:threshold-pipeline rdf:type op:Pipeline ;
    op:steps (ex:generate-triage-report) .

ex:generate-triage-report rdf:type gv:TemplateStep ;
    gv:text """
# Bug Triage Required - {{ now | date('YYYY-MM-DD') }}

Open bug count exceeds threshold (10).

## Recommended Actions
1. Review and prioritize open bugs
2. Close stale or duplicate bugs
3. Assign unassigned bugs
4. Escalate critical issues

Run: `gitvan query "SELECT ?bug ?title ?severity WHERE { ... }"`
    """ ;
    gv:filePath "./reports/triage-required.md" .
```

### Daily Report Hook

```turtle
# hooks/reports/daily-report.ttl
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:daily-report rdf:type gh:Hook ;
    gv:title "Daily Bug Report" ;
    gv:schedule "0 9 * * *" ;
    gh:hasPredicate ex:always-run ;
    gh:orderedPipelines ex:report-pipeline .

ex:always-run rdf:type gh:ASKPredicate ;
    gh:queryText "ASK WHERE { BIND(true AS ?always) }" .

ex:report-pipeline rdf:type op:Pipeline ;
    op:steps (ex:gather-stats ex:generate-report ex:send-email) .

ex:gather-stats rdf:type op:SPARQLStep ;
    op:query """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT
            (COUNT(?bug) AS ?total)
            (COUNT(?open) AS ?openCount)
            (COUNT(?critical) AS ?criticalCount)
            (COUNT(?high) AS ?highCount)
        WHERE {
            ?bug rdf:type gv:Bug .
            OPTIONAL {
                ?open rdf:type gv:Bug .
                ?open gv:status "open" .
            }
            OPTIONAL {
                ?critical rdf:type gv:Bug .
                ?critical gv:severity "critical" .
                ?critical gv:status "open" .
            }
            OPTIONAL {
                ?high rdf:type gv:Bug .
                ?high gv:severity "high" .
                ?high gv:status "open" .
            }
        }
    """ ;
    op:outputVar "stats" .

ex:generate-report rdf:type gv:TemplateStep ;
    gv:text """
# Daily Bug Report - {{ now | date('YYYY-MM-DD') }}

## Summary
| Metric | Count |
|--------|-------|
| Total Bugs | {{ stats.total }} |
| Open | {{ stats.openCount }} |
| Critical | {{ stats.criticalCount }} |
| High Priority | {{ stats.highCount }} |

## Health Status
{% if stats.criticalCount > 0 %}
**Status: CRITICAL** - Immediate attention required!
{% elif stats.highCount > 5 %}
**Status: WARNING** - High priority bugs need attention
{% else %}
**Status: GOOD** - Bug queue is manageable
{% endif %}

---
*Generated by GitVan v4*
    """ ;
    gv:filePath "./reports/daily/{{ now | date('YYYYMMDD') }}.md" ;
    op:dependsOn ex:gather-stats .
```

---

## CI/CD Pipeline

Automated CI/CD using Knowledge Hooks.

### Project Structure

```
cicd-hooks/
  hooks/
    data/
      build-status.ttl
    ci/
      pre-push.ttl
      build.ttl
      test.ttl
    cd/
      staging-deploy.ttl
      production-deploy.ttl
```

### Pre-Push Validation

```turtle
# hooks/ci/pre-push.ttl
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:pre-push-validation rdf:type gh:Hook ;
    gv:title "Pre-Push Validation" ;
    gv:category "ci" ;
    gh:hasPredicate ex:always-validate ;
    gh:orderedPipelines ex:validation-pipeline .

ex:always-validate rdf:type gh:ASKPredicate ;
    gh:queryText "ASK WHERE { BIND(true AS ?always) }" .

ex:validation-pipeline rdf:type op:Pipeline ;
    op:steps (ex:lint ex:type-check ex:unit-tests ex:security-scan) .

ex:lint rdf:type op:CLIStep ;
    gv:label "Lint Code" ;
    op:command "npm run lint" ;
    op:timeout 60000 ;
    op:failOn "error" .

ex:type-check rdf:type op:CLIStep ;
    gv:label "Type Check" ;
    op:command "npm run type-check" ;
    op:timeout 120000 ;
    op:dependsOn ex:lint .

ex:unit-tests rdf:type op:CLIStep ;
    gv:label "Unit Tests" ;
    op:command "npm run test:unit" ;
    op:timeout 300000 ;
    op:dependsOn ex:type-check .

ex:security-scan rdf:type op:CLIStep ;
    gv:label "Security Scan" ;
    op:command "npm audit --audit-level=high" ;
    op:timeout 120000 ;
    op:dependsOn ex:unit-tests .
```

### Build Pipeline

```turtle
# hooks/ci/build.ttl
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:build-pipeline rdf:type gh:Hook ;
    gv:title "Build Pipeline" ;
    gv:category "ci" ;
    gh:hasPredicate ex:code-changed ;
    gh:orderedPipelines ex:build-workflow .

ex:code-changed rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?file ?hash WHERE {
            ?file rdf:type gv:SourceFile .
            ?file gv:contentHash ?hash .
        } ORDER BY ?file
    """ .

ex:build-workflow rdf:type op:Pipeline ;
    op:steps (ex:install-deps ex:build ex:update-status) .

ex:install-deps rdf:type op:CLIStep ;
    gv:label "Install Dependencies" ;
    op:command "npm ci" ;
    op:timeout 120000 .

ex:build rdf:type op:CLIStep ;
    gv:label "Build" ;
    op:command "npm run build" ;
    op:timeout 180000 ;
    op:dependsOn ex:install-deps .

ex:update-status rdf:type gv:TemplateStep ;
    gv:text """
        @prefix gv: <https://gitvan.dev/ontology#> .
        gv:lastBuild gv:status "success" ;
            gv:timestamp "{{ now }}" ;
            gv:commit "{{ gitHead }}" .
    """ ;
    gv:filePath "./hooks/data/build-status.ttl" ;
    op:dependsOn ex:build .
```

### Staging Deployment

```turtle
# hooks/cd/staging-deploy.ttl
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:staging-deploy rdf:type gh:Hook ;
    gv:title "Staging Deployment" ;
    gv:category "cd" ;
    gh:hasPredicate ex:build-success ;
    gh:orderedPipelines ex:staging-pipeline .

ex:build-success rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            gv:lastBuild gv:status "success" .
        }
    """ .

ex:staging-pipeline rdf:type op:Pipeline ;
    op:steps (ex:deploy-staging ex:run-e2e ex:notify-team) .

ex:deploy-staging rdf:type op:CLIStep ;
    gv:label "Deploy to Staging" ;
    op:command "npm run deploy:staging" ;
    op:timeout 300000 .

ex:run-e2e rdf:type op:CLIStep ;
    gv:label "Run E2E Tests" ;
    op:command "npm run test:e2e" ;
    op:timeout 600000 ;
    op:dependsOn ex:deploy-staging .

ex:notify-team rdf:type op:HTTPStep ;
    gv:label "Notify Team" ;
    op:url "${SLACK_WEBHOOK}" ;
    op:method "POST" ;
    op:body """{"text": "Staging deployment complete!"}""" ;
    op:dependsOn ex:run-e2e .
```

---

## Release Automation

Automated release workflow.

```turtle
# hooks/release/version-bump.ttl
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:release-automation rdf:type gh:Hook ;
    gv:title "Release Automation" ;
    gh:hasPredicate ex:version-changed ;
    gh:orderedPipelines ex:release-pipeline .

ex:version-changed rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?version WHERE {
            ?project rdf:type gv:Project .
            ?project gv:version ?version .
        }
    """ .

ex:release-pipeline rdf:type op:Pipeline ;
    op:steps (
        ex:get-version
        ex:build-release
        ex:run-tests
        ex:create-changelog
        ex:create-tag
        ex:publish-npm
        ex:create-github-release
        ex:notify-release
    ) .

ex:get-version rdf:type op:CLIStep ;
    op:command "node -p 'require(\"./package.json\").version'" ;
    op:outputVar "version" .

ex:build-release rdf:type op:CLIStep ;
    op:command "npm run build:release" ;
    op:dependsOn ex:get-version .

ex:run-tests rdf:type op:CLIStep ;
    op:command "npm test" ;
    op:dependsOn ex:build-release .

ex:create-changelog rdf:type op:CLIStep ;
    op:command "npx conventional-changelog -p angular -i CHANGELOG.md -s" ;
    op:dependsOn ex:run-tests .

ex:create-tag rdf:type op:CLIStep ;
    op:command "git tag -a v{{ version }} -m 'Release v{{ version }}'" ;
    op:dependsOn ex:create-changelog .

ex:publish-npm rdf:type op:CLIStep ;
    op:command "npm publish" ;
    op:dependsOn ex:create-tag .

ex:create-github-release rdf:type op:CLIStep ;
    op:command "gh release create v{{ version }} --generate-notes" ;
    op:dependsOn ex:publish-npm .

ex:notify-release rdf:type op:HTTPStep ;
    op:url "${SLACK_WEBHOOK}" ;
    op:body """{"text": "Released v{{ version }}!"}""" ;
    op:dependsOn ex:create-github-release .
```

---

## Code Quality Gates

Quality enforcement hooks.

```turtle
# hooks/quality/coverage-check.ttl
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:coverage-check rdf:type gh:Hook ;
    gv:title "Coverage Check" ;
    gh:hasPredicate ex:low-coverage ;
    gh:orderedPipelines ex:coverage-pipeline .

ex:low-coverage rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?coverage WHERE {
            ?project rdf:type gv:Project .
            ?project gv:testCoverage ?coverage .
        }
    """ ;
    gh:threshold 80 ;
    gh:operator "<" ;
    gh:description "Triggers when coverage falls below 80%" .

ex:coverage-pipeline rdf:type op:Pipeline ;
    op:steps (ex:generate-coverage-report ex:fail-build) .

ex:generate-coverage-report rdf:type gv:TemplateStep ;
    gv:text """
# Coverage Report

Current coverage is below minimum threshold (80%).

Please add tests for uncovered code before merging.

Run `npm run test:coverage` to see detailed report.
    """ ;
    gv:filePath "./coverage-warning.md" .

ex:fail-build rdf:type op:CLIStep ;
    op:command "exit 1" ;
    op:dependsOn ex:generate-coverage-report .
```

---

## Developer Workflow

Daily developer workflow automation.

```turtle
# hooks/developer/start-of-day.ttl
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:start-of-day rdf:type gh:Hook ;
    gv:title "Start of Day Workflow" ;
    gv:schedule "0 9 * * 1-5" ;
    gh:hasPredicate ex:weekday-morning ;
    gh:orderedPipelines ex:morning-pipeline .

ex:weekday-morning rdf:type gh:TemporalPredicate ;
    gh:timeWindow 3600000 ;
    gh:queryText "ASK WHERE { BIND(true AS ?always) }" .

ex:morning-pipeline rdf:type op:Pipeline ;
    op:steps (ex:fetch-updates ex:my-tasks ex:daily-standup) .

ex:fetch-updates rdf:type op:CLIStep ;
    op:command "git fetch --all --prune" .

ex:my-tasks rdf:type op:SPARQLStep ;
    op:query """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?task ?title ?priority WHERE {
            ?task rdf:type gv:Task .
            ?task gv:assignee gv:currentUser .
            ?task gv:status "in-progress" .
            ?task gv:title ?title .
            OPTIONAL { ?task gv:priority ?priority }
        } ORDER BY DESC(?priority)
    """ ;
    op:outputVar "myTasks" ;
    op:dependsOn ex:fetch-updates .

ex:daily-standup rdf:type gv:TemplateStep ;
    gv:text """
# Daily Standup - {{ now | date('YYYY-MM-DD') }}

## My Tasks
{% for task in myTasks.results %}
- [ ] {{ task.title }}{% if task.priority %} (Priority: {{ task.priority }}){% endif %}
{% endfor %}

## Notes
-
    """ ;
    gv:filePath "./standup/{{ now | date('YYYYMMDD') }}.md" ;
    op:dependsOn ex:my-tasks .
```

---

## Running Examples

```bash
# Clone examples
git clone https://github.com/gitvan/gitvan-examples
cd gitvan-examples

# Install GitVan
npm install -g gitvan

# List available hooks
gitvan hooks list

# Run specific category
gitvan hooks evaluate-category alerts

# Run all hooks
gitvan hooks evaluate --verbose
```

---

## Next Steps

- [Getting Started](../tutorials/GETTING-STARTED.md)
- [API Reference](../api/HOOK-REFERENCE.md)
- [Best Practices](../api/BEST-PRACTICES.md)
