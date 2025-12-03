# GitVan Git Lifecycle Hooks - Examples

Welcome to the GitVan git lifecycle hooks examples! This directory contains production-ready hook templates that demonstrate how to automate and enhance your git workflows using GitVan's RDF-based hook system.

## Table of Contents

- [Overview](#overview)
- [Available Examples](#available-examples)
- [Quick Start](#quick-start)
- [Hook Architecture](#hook-architecture)
- [Creating Custom Hooks](#creating-custom-hooks)
- [Best Practices](#best-practices)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Overview

GitVan's git lifecycle hooks use **RDF/Turtle format** to define intelligent, graph-based automation that integrates with your git operations. Unlike traditional git hooks, GitVan hooks:

- ✅ **Query the knowledge graph** using SPARQL to make context-aware decisions
- ✅ **Generate rich reports** with Nunjucks templates
- ✅ **Track patterns and metrics** over time in the RDF store
- ✅ **Correlate data** across commits, authors, files, and CI/CD pipelines
- ✅ **Notify team members** via Slack, email, or other channels
- ✅ **Provide AI-powered insights** and automated suggestions

## Available Examples

### 1. [enforce-branch-naming.ttl](./enforce-branch-naming.ttl)
**Use Case:** Policy enforcement for branch naming conventions

Blocks commits to branches that don't follow team patterns like `feature/*`, `bugfix/*`, `hotfix/*`, or `release/*`. Protects main branches from direct commits.

**Triggers:** `pre-commit`, `pre-push`

**Key Features:**
- Validates branch names against regex patterns
- Protects main/master/develop from direct commits
- Suggests correct branch naming patterns
- Generates helpful error messages with fix commands

**Success Criteria:**
- ✅ Properly named branches allow commits
- ✅ Invalid branches are blocked with clear instructions
- ✅ Protected branches require special permissions

---

### 2. [deploy-on-version-tag.ttl](./deploy-on-version-tag.ttl)
**Use Case:** Automated deployment on semantic version tags

Automatically triggers deployment workflows when version tags are created (e.g., `v1.0.0`, `v2.1.3-beta.1`). Determines deployment environment and validates readiness.

**Triggers:** `post-tag`, `post-push`

**Key Features:**
- Parses semantic versions (major.minor.patch)
- Determines environment (production, staging) from version pattern
- Validates deployment readiness (tests, build, security)
- Triggers CI/CD deployment via HTTP webhook
- Records deployment metadata in knowledge graph

**Success Criteria:**
- ✅ Detects semantic version tags automatically
- ✅ Production deployments require approval
- ✅ Failed readiness checks block deployment
- ✅ Full audit trail in RDF store

---

### 3. [review-large-commits.ttl](./review-large-commits.ttl)
**Use Case:** Code review assistance for large commits

Alerts reviewers when commits exceed size thresholds (>1000 lines), especially for junior developers. Provides commit splitting strategies and routes to appropriate reviewers.

**Triggers:** `post-commit`, `pre-push`

**Key Features:**
- Detects commits with >1000 lines changed
- Identifies author experience level (junior/mid/senior)
- Calculates complexity score and review time estimate
- Suggests commit splitting strategies
- Routes to senior reviewers for complex changes
- Tracks author statistics and patterns

**Success Criteria:**
- ✅ Junior devs get mentoring on commit size
- ✅ Complex commits routed to senior reviewers
- ✅ Practical splitting suggestions provided
- ✅ Review time accurately estimated

---

### 4. [track-author-statistics.ttl](./track-author-statistics.ttl)
**Use Case:** Developer productivity and contribution metrics

Automatically tracks and aggregates developer metrics on every commit. Generates dashboards showing productivity, code quality, and contribution patterns.

**Triggers:** `post-commit`, `daily-rollup`

**Key Features:**
- Captures commit frequency, size, and timing
- Tracks languages and file types used
- Calculates code quality scores (tests, docs, churn)
- Aggregates team-wide daily metrics
- Generates author-specific dashboards
- Identifies peak productivity hours

**Success Criteria:**
- ✅ All commits tracked automatically
- ✅ Quality scores calculated accurately
- ✅ Historical trends visible
- ✅ Team metrics aggregated daily

---

### 5. [alert-on-merge-conflicts.ttl](./alert-on-merge-conflicts.ttl)
**Use Case:** Early conflict detection and team notification

Detects merge conflicts and notifies affected team members. Analyzes conflict complexity and suggests resolution strategies.

**Triggers:** `pre-merge`, `post-merge`, `on-conflict`

**Key Features:**
- Detects conflicts before and during merge
- Identifies conflicting authors for each file
- Analyzes conflict complexity (lines, types, patterns)
- Suggests resolution tools and strategies
- Recommends pairing for complex conflicts
- Tracks conflict frequency and patterns

**Success Criteria:**
- ✅ All conflicts detected immediately
- ✅ Relevant team members notified
- ✅ Resolution strategies provided
- ✅ Conflict patterns tracked for prevention

---

### 6. [ci-integration.ttl](./ci-integration.ttl)
**Use Case:** CI/CD failure correlation and root cause analysis

Correlates CI pipeline failures with commits and provides automated root cause analysis. Suggests fixes based on error patterns.

**Triggers:** `ci-failure`, `post-test`, `post-build`

**Key Features:**
- Links CI failures to specific commits
- Identifies changed files that may have caused failure
- Analyzes error messages for common patterns
- Suggests automated fixes with commands
- Tracks failure trends and recurring issues
- Notifies commit authors immediately

**Success Criteria:**
- ✅ Failures linked to commits within seconds
- ✅ Root cause identified automatically
- ✅ Automated fix suggestions provided
- ✅ Recurring issues flagged for prevention

---

## Quick Start

### Prerequisites

```bash
# Ensure GitVan is installed
npm install -g gitvan

# Or use npx
npx gitvan --version
```

### Installation

1. **Copy hooks to your repository:**

```bash
# Copy all examples
cp examples/git-lifecycle-hooks/*.ttl .gitvan/hooks/

# Or copy individual hooks
cp examples/git-lifecycle-hooks/enforce-branch-naming.ttl .gitvan/hooks/
```

2. **Configure hooks (optional):**

```bash
# Branch naming
git config gitvan.branchPatterns "feature/*,bugfix/*,hotfix/*,release/*"
git config gitvan.protectedBranches "main,master,develop"

# Deployment
git config gitvan.deploy.production "https://api.deploy.com/prod"
git config gitvan.deploy.staging "https://api.deploy.com/staging"

# Commit size thresholds
git config gitvan.commit.maxLines 1000

# CI integration
git config gitvan.ci.webhook "https://your-ci.com/webhook"
```

3. **Enable hooks:**

```bash
# Enable specific hook
gitvan hooks enable enforce-branch-naming

# Enable all hooks
gitvan hooks enable --all

# List enabled hooks
gitvan hooks list
```

4. **Test hooks:**

```bash
# Test hook execution
gitvan hooks test enforce-branch-naming

# Dry-run mode (no actual execution)
gitvan hooks run enforce-branch-naming --dry-run
```

## Hook Architecture

### TTL Structure

Every GitVan hook follows this structure:

```turtle
@prefix ex: <http://example.org/gitvan/hooks/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix git: <https://gitvan.dev/git#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# 1. Hook Definition
ex:my-hook rdf:type gh:Hook ;
    gv:title "My Hook" ;
    gh:hookType "post-commit" ;
    gh:priority 50 ;
    gh:hasPredicate ex:my-predicate ;
    gh:orderedPipelines ex:my-pipeline .

# 2. ASK Predicate (When to trigger)
ex:my-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX git: <https://gitvan.dev/git#>
        ASK WHERE {
            ?commit rdf:type git:Commit .
            # Your conditions here
        }
    """ .

# 3. Pipeline (What to do)
ex:my-pipeline rdf:type op:Pipeline ;
    op:steps (ex:step1, ex:step2, ex:step3) .

# 4. Steps (Actions)
ex:step1 rdf:type gv:SparqlStep ;
    gv:text "SELECT ?data WHERE { ... }" ;
    gv:outputMapping '{"result": "results[0].data.value"}' .

ex:step2 rdf:type gv:TemplateStep ;
    gv:text "# Report\n{{ result }}" ;
    gv:filePath "./reports/my-report.md" .
```

### Hook Lifecycle

```
1. Git Event (commit, push, merge, etc.)
   ↓
2. GitVan detects event
   ↓
3. ASK Predicate evaluates (should hook run?)
   ↓
4. If TRUE → Execute Pipeline
   ↓
5. Each step runs sequentially:
   - SparqlStep: Query knowledge graph
   - TemplateStep: Generate reports
   - ActionStep: Perform actions (notify, block, etc.)
   ↓
6. Results stored in RDF graph
   ↓
7. Notifications sent (if configured)
```

### Step Types

#### SparqlStep
Queries the knowledge graph using SPARQL SELECT.

```turtle
ex:query-step rdf:type gv:SparqlStep ;
    gv:text """
        SELECT ?commit ?author WHERE {
            ?commit git:author ?author .
        }
    """ ;
    gv:outputMapping '{
        "commitSha": "results[0].commit.value",
        "authorName": "results[0].author.value"
    }' .
```

#### TemplateStep
Generates reports using Nunjucks templates.

```turtle
ex:report-step rdf:type gv:TemplateStep ;
    gv:text """
        # Report
        Author: {{ authorName }}
        Commit: {{ commitSha }}
    """ ;
    gv:filePath "./reports/commit-report.md" .
```

#### ActionStep
Performs actions like blocking commits or sending notifications.

```turtle
ex:action-step rdf:type gv:ActionStep ;
    gv:actionType "block-commit" ;
    gv:condition "!isValid" ;
    gv:errorMessage "Invalid commit!" ;
    gv:exitCode 1 .
```

## Creating Custom Hooks

### Example: Block Commits Without Tests

```turtle
@prefix ex: <http://example.org/gitvan/hooks/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix git: <https://gitvan.dev/git#> .

# Hook Definition
ex:require-tests-hook rdf:type gh:Hook ;
    gv:title "Require Tests for Commits" ;
    gh:hookType "pre-commit" ;
    gh:priority 90 ;
    gh:hasPredicate ex:tests-predicate ;
    gh:orderedPipelines ex:tests-pipeline .

# Predicate: Detect commits without tests
ex:tests-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX git: <https://gitvan.dev/git#>

        ASK WHERE {
            # Get recent commit
            ?commit rdf:type git:Commit ;
                    git:hasChange ?change .
            ?change git:filePath ?path .

            # Check if any source files changed
            FILTER(REGEX(?path, "\\.(js|ts|py)$") &&
                   !REGEX(?path, "test|spec"))

            # But no test files changed
            FILTER NOT EXISTS {
                ?commit git:hasChange ?testChange .
                ?testChange git:filePath ?testPath .
                FILTER(REGEX(?testPath, "test|spec"))
            }
        }
    """ .

# Pipeline: Block and report
ex:tests-pipeline rdf:type op:Pipeline ;
    op:steps (ex:detect-missing-tests, ex:block-commit) .

ex:detect-missing-tests rdf:type gv:SparqlStep ;
    gv:text """
        SELECT ?file WHERE {
            ?commit git:hasChange ?change .
            ?change git:filePath ?file .
            FILTER(REGEX(?file, "\\.(js|ts|py)$") &&
                   !REGEX(?file, "test|spec"))
        }
    """ ;
    gv:outputMapping '{
        "sourceFiles": "results.map(r => r.file.value)"
    }' .

ex:block-commit rdf:type gv:ActionStep ;
    gv:actionType "block-commit" ;
    gv:errorMessage """
❌ COMMIT BLOCKED: No tests included

You modified source files but didn't add any tests:
{% for file in sourceFiles %}
- {{ file }}
{% endfor %}

Please add tests before committing.
    """ ;
    gv:exitCode 1 .
```

### Testing Your Hook

```bash
# Add hook to .gitvan/hooks/
cp my-custom-hook.ttl .gitvan/hooks/

# Enable it
gitvan hooks enable my-custom-hook

# Test it
gitvan hooks test my-custom-hook

# Make a commit to trigger it
git add .
git commit -m "test commit"
```

## Best Practices

### 1. Hook Priority

Use priority to control execution order:
- **100:** Critical validation (branch naming, security)
- **75-90:** Quality checks (tests, linting)
- **50-75:** Analysis and metrics
- **25-50:** Notifications and reporting
- **0-25:** Optional enhancements

### 2. Performance

Keep hooks fast:
- ✅ Use LIMIT in SPARQL queries
- ✅ Filter early in WHERE clauses
- ✅ Cache expensive operations
- ✅ Run heavy analysis asynchronously

```turtle
# ✅ Good - filtered and limited
SELECT ?commit WHERE {
    ?commit git:timestamp ?time .
    FILTER(?time > NOW() - "PT5M"^^xsd:duration)
} LIMIT 1

# ❌ Bad - processes all commits
SELECT ?commit WHERE {
    ?commit rdf:type git:Commit .
}
```

### 3. Error Handling

Always provide helpful error messages:

```turtle
ex:block-step rdf:type gv:ActionStep ;
    gv:errorMessage """
❌ COMMIT BLOCKED: {{ reason }}

Problem: {{ problem }}

How to fix:
{{ fixInstructions }}

Need help? Run: gitvan hooks help {{ hookName }}
    """ .
```

### 4. Documentation

Document your hooks inline:

```turtle
# =============================================================================
# My Custom Hook
# =============================================================================
#
# USE CASE:
# Brief description of what this hook does
#
# TRIGGERS ON:
# - Event types that trigger this hook
#
# SUCCESS CRITERIA:
# - What defines success
#
# INSTALLATION:
# 1. Step-by-step setup instructions
#
# =============================================================================
```

### 5. Testing

Test hooks thoroughly:

```bash
# Unit test
gitvan hooks test my-hook

# Integration test with real commits
gitvan hooks test my-hook --with-fixtures

# Performance test
gitvan hooks benchmark my-hook
```

## Advanced Usage

### Chaining Hooks

Hooks can depend on each other:

```turtle
ex:hook-b rdf:type gh:Hook ;
    gh:dependsOn ex:hook-a ;
    gh:condition "hookA.success" .
```

### Conditional Execution

Use conditions to control execution:

```turtle
ex:step rdf:type gv:ActionStep ;
    gv:condition "isJunior && commitSize > 1000" ;
    gv:actionType "notify" .
```

### Multi-Channel Notifications

Notify via multiple channels:

```turtle
ex:notify rdf:type gv:ActionStep ;
    gv:actionType "notification" ;
    gv:notificationChannels "slack:#dev,email:team@co.com,webhook:https://api" .
```

### Knowledge Graph Updates

Update the graph from hooks:

```turtle
ex:update rdf:type gv:SparqlStep ;
    gv:updateQuery """
        INSERT DATA {
            <urn:metric:{{ id }}>
                metrics:value {{ value }} ;
                metrics:timestamp NOW() .
        }
    """ .
```

### AI-Powered Analysis

Integrate with AI for insights:

```turtle
ex:ai-analysis rdf:type gv:ActionStep ;
    gv:actionType "ai-analysis" ;
    gv:aiModel "gpt-4" ;
    gv:aiPrompt """
        Analyze this commit for potential issues:
        Files: {{ files }}
        Changes: {{ changes }}

        Provide specific recommendations.
    """ .
```

## Troubleshooting

### Hook Not Triggering

**Check:**
1. Hook is enabled: `gitvan hooks list --enabled`
2. Predicate returns true: `gitvan hooks debug my-hook --show-predicate`
3. Event type matches: `gitvan hooks info my-hook`

### SPARQL Query Errors

**Debug queries:**
```bash
# Test query in isolation
gitvan sparql query "SELECT ?s WHERE { ?s ?p ?o } LIMIT 10"

# Check graph contents
gitvan rdf export --format turtle > graph.ttl
```

### Performance Issues

**Profile hooks:**
```bash
# Measure execution time
gitvan hooks profile my-hook

# Identify slow steps
gitvan hooks trace my-hook --verbose
```

### Template Errors

**Validate templates:**
```bash
# Test template rendering
gitvan template render my-template.njk --data '{"var": "value"}'

# Check Nunjucks syntax
gitvan template validate my-template.njk
```

## Additional Resources

- **Installation Guide:** [INSTALLATION.md](./INSTALLATION.md)
- **SPARQL Patterns:** [SPARQL-PATTERNS.md](./SPARQL-PATTERNS.md)
- **GitVan Documentation:** https://gitvan.dev/docs
- **Hook API Reference:** https://gitvan.dev/docs/api/hooks
- **Community Examples:** https://github.com/gitvan/hooks-gallery

## Contributing

Have a useful hook? Share it with the community!

```bash
# Format your hook
gitvan hooks format my-hook.ttl

# Validate it
gitvan hooks validate my-hook.ttl

# Submit a PR to hooks-gallery
```

## License

MIT License - See LICENSE file for details

---

**Need Help?**
- GitHub Issues: https://github.com/gitvan/gitvan/issues
- Discord: https://discord.gg/gitvan
- Email: support@gitvan.dev
