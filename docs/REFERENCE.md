# GitVan Reference: Complete API & Format Specifications

**Goal**: Complete specification of GitVan commands, workflow format, and APIs.

This is **information-oriented**: quick lookup for exact syntax and specifications.

---

## Table of Contents

1. [CLI Commands](#cli-commands)
2. [Workflow File Format](#workflow-file-format)
3. [Step Types](#step-types)
4. [Conditions](#conditions)
5. [Actions](#actions)
6. [Metrics & Observability](#metrics--observability)
7. [Configuration](#configuration)
8. [Exit Codes](#exit-codes)

---

## CLI Commands

### Workflow Commands

#### `gitvan workflow list`

List all available workflows.

```bash
gitvan workflow list [OPTIONS]
```

**Options:**
- `--format <format>` - Output format: `text` (default), `json`, `csv`, `table`
- `--sort <field>` - Sort by: `name`, `updated`, `size`, `step-count`
- `--filter <pattern>` - Only workflows matching pattern
- `--limit <n>` - Show only first N workflows (default: all)

**Output:**
```
Available Workflows
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Workflow Name          Steps  Last Updated      SLO
─────────────────────────────────────────────────
BuildAndTest           3      2024-01-15 14:23  20s
DeployStaging          4      2024-01-15 10:45  60s
LintAndFormat          2      2024-01-14 22:01  10s
```

#### `gitvan workflow run <workflow-id>`

Execute a workflow.

```bash
gitvan workflow run <workflow-id> [OPTIONS]
```

**Arguments:**
- `<workflow-id>` - Workflow name/ID to run (required)

**Options:**
- `--verbose` - Show detailed step output
- `--debug` - Show debugging information
- `--timeout <ms>` - Override workflow timeout
- `--env <key=value>` - Set environment variable (repeatable)
- `--skip-validation` - Skip pre-execution validation
- `--dry-run` - Validate but don't execute
- `--no-wait` - Start workflow, return immediately
- `--capture-output` - Save output to file

**Example:**
```bash
gitvan workflow run DeployStaging --verbose --env REGION=us-east-1
```

#### `gitvan workflow describe <workflow-id>`

Show detailed workflow structure.

```bash
gitvan workflow describe <workflow-id> [OPTIONS]
```

**Options:**
- `--format <format>` - Output format: `text` (default), `json`, `yaml`
- `--show-config` - Include full step configuration
- `--show-dependencies` - Show dependency graph

**Output:**
```
Workflow: DeployStaging
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Description: Deploy to staging environment
Status: Active
SLO Target: 60s (p99: 75s)

Pipeline:
  [1] Deploy Backend (30s)
  [2] Deploy Frontend (15s) → depends on [1]
  [3] Smoke Test (10s) → depends on [2]
  [4] Verify Monitoring (5s) → depends on [3]

Execution: Sequential
Total Timeout: 300s
```

#### `gitvan workflow history <workflow-id>`

Show execution history.

```bash
gitvan workflow history <workflow-id> [OPTIONS]
```

**Options:**
- `--limit <n>` - Show last N executions (default: 20)
- `--status <status>` - Filter by status: `passed`, `failed`, `timeout`
- `--since <duration>` - Show executions since (e.g., `24h`, `7d`)
- `--format <format>` - Output format: `text` (default), `json`, `csv`
- `--export <file>` - Export to file

**Output:**
```
Execution History: DeployStaging
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 2024-01-15 14:23:45 UTC
   Status: ✓ PASSED
   Duration: 45.2s
   Started by: alice@example.com

2. 2024-01-15 13:45:30 UTC
   Status: ✓ PASSED
   Duration: 47.1s
   Started by: alice@example.com
```

#### `gitvan workflow stats <workflow-id>`

Performance statistics.

```bash
gitvan workflow stats <workflow-id> [OPTIONS]
```

**Options:**
- `--period <duration>` - Analyze last (default: `7d`)
- `--format <format>` - Output format: `text` (default), `json`

**Output:**
```
Performance Statistics: DeployStaging
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Executions: 24 (last 7 days)
Success Rate: 95.8% (23/24)
Failures: 1 (timeout)

Duration Metrics:
  Median: 45.2s
  p95: 48.1s
  p99: 50.3s
  Max: 52.7s

SLO: ✓ PASSING
  Target 60s: 24/24 ✓
  p99 75s: 24/24 ✓
```

#### `gitvan workflow validate <workflow-id>`

Validate a workflow definition.

```bash
gitvan workflow validate <workflow-id> [OPTIONS]
```

**Options:**
- `--all` - Validate all workflows
- `--verbose` - Show detailed checks
- `--fix` - Attempt to auto-fix issues

**Output:**
```
Validating: DeployStaging
✓ Workflow structure valid
✓ All steps defined
✓ Dependencies resolved
✓ No circular dependencies
✓ Timeouts reasonable (30-300s)
✓ All required fields present

Valid! Ready to execute.
```

#### `gitvan workflow metrics <workflow-id>`

View workflow metrics.

```bash
gitvan workflow metrics <workflow-id> [OPTIONS]
```

**Options:**
- `--metric <metric>` - Specific metric to view
- `--period <duration>` - Time period (default: `7d`)
- `--format <format>` - Output format: `text` (default), `json`, `csv`
- `--chart` - Show ASCII chart

**Metrics:**
- `duration` - Execution time
- `steps.count` - Number of steps executed
- `success.rate` - Success percentage
- `failures.count` - Total failures
- `timeouts.count` - Total timeouts

---

### Hook Commands

#### `gitvan hook install <event> <workflow-id>`

Register a workflow as a Git hook.

```bash
gitvan hook install <event> <workflow-id> [OPTIONS]
```

**Arguments:**
- `<event>` - Git event: `pre-commit`, `post-commit`, `pre-push`, `post-push`, `pre-merge`
- `<workflow-id>` - Workflow to trigger

**Options:**
- `--fail-on-error` - Block Git operation if workflow fails
- `--timeout <ms>` - Max execution time
- `--async` - Run workflow async (don't wait)

**Example:**
```bash
gitvan hook install pre-commit BuildAndTest --fail-on-error
```

#### `gitvan hook list`

Show all registered Git hooks.

```bash
gitvan hook list
```

**Output:**
```
Git Hooks Registered
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pre-commit: BuildAndTest
  Fails commit if workflow fails

post-commit: (none)

pre-push: DeployStaging
  Async, doesn't block push
```

#### `gitvan hook uninstall <event>`

Remove a Git hook.

```bash
gitvan hook uninstall <event>
```

#### `gitvan hook test <event>`

Test a Git hook manually.

```bash
gitvan hook test <event>
```

---

### Alert Commands

#### `gitvan alert create`

Create an alert.

```bash
gitvan alert create [OPTIONS]
```

**Options:**
- `--workflow <id>` - Workflow to monitor (required)
- `--metric <metric>` - Metric to watch (required)
- `--threshold <value>` - Threshold value (required)
- `--action <action>` - Action: `notify-slack`, `notify-email`, `pagerduty`, `webhook`
- `--condition <condition>` - `exceeds`, `below`, `equals`, `increases`

**Example:**
```bash
gitvan alert create \
  --workflow DeployStaging \
  --metric duration \
  --threshold 90000 \
  --condition exceeds \
  --action notify-slack
```

#### `gitvan alert list`

List all alerts.

```bash
gitvan alert list [OPTIONS]
```

**Options:**
- `--workflow <id>` - Filter by workflow
- `--status <status>` - Filter by status: `armed`, `triggered`, `dismissed`

#### `gitvan alert delete <alert-id>`

Delete an alert.

```bash
gitvan alert delete <alert-id>
```

---

## Workflow File Format

### Basic Structure

Workflow files are RDF Turtle format (`.ttl`), but you interact via a simple domain model:

```turtle
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:MyWorkflow a gh:Hook ;
  rdfs:label "My Workflow" ;
  rdfs:comment "Detailed description" ;
  op:hasPipeline [
    a op:Pipeline ;
    op:hasStep gh:step-1 ;
    op:hasStep gh:step-2
  ] .
```

### Workflow Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `rdfs:label` | string | Yes | Human-readable workflow name |
| `rdfs:comment` | string | No | Description of what workflow does |
| `op:hasPipeline` | Pipeline | Yes | The steps to execute |
| `gh:trigger` | Event | No | What triggers this workflow |
| `perf:sloTarget` | integer | No | Target duration in milliseconds |
| `perf:sloP99` | integer | No | p99 target in milliseconds |
| `admin:disabled` | boolean | No | If true, workflow won't run |

### Example: Full Workflow

```turtle
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix perf: <http://example.org/performance#> .
@prefix cond: <http://example.org/conditions#> .

gh:FullExample a gh:Hook ;
  rdfs:label "Full Example Workflow" ;
  rdfs:comment "Demonstrates all features" ;
  cond:onBranch "main" ;
  perf:sloTarget 120000 ;
  perf:sloP99 150000 ;
  op:hasPipeline [
    a op:Pipeline ;
    op:hasStep gh:step-1 ;
    op:hasStep gh:step-2 ;
    op:hasStep gh:step-3
  ] .

gh:step-1 a op:CLIStep ;
  rdfs:label "First step" ;
  op:command "npm run lint" ;
  op:timeout 30000 ;
  op:retries 0 .

gh:step-2 a op:CLIStep ;
  rdfs:label "Second step" ;
  op:command "npm run build" ;
  op:timeout 60000 ;
  op:dependsOn gh:step-1 ;
  op:retries 2 ;
  op:retryBackoff 5000 .

gh:step-3 a op:CLIStep ;
  rdfs:label "Third step" ;
  op:command "npm run test" ;
  op:timeout 60000 ;
  op:dependsOn gh:step-2 ;
  op:failOn "FAIL" .
```

---

## Step Types

### CLI Step

Execute a shell command.

```turtle
gh:step-name a op:CLIStep ;
  rdfs:label "Step description" ;
  op:command "shell command" ;
  op:timeout 30000 ;
  op:retries 0 ;
  op:retryBackoff 5000 ;
  op:dependsOn gh:previous-step ;
  op:failOn "ERROR" .
```

**Properties:**
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `op:command` | string | Yes | Shell command to execute |
| `op:timeout` | integer | No | Timeout in milliseconds (default: 30000) |
| `op:retries` | integer | No | Number of retries on failure (default: 0) |
| `op:retryBackoff` | integer | No | Wait time between retries in ms (default: 5000) |
| `op:dependsOn` | Step | No | Step that must complete first |
| `op:failOn` | string | No | Output pattern that causes failure |
| `op:ignoreErrors` | boolean | No | Continue even if step fails (default: false) |

**Example:**
```turtle
gh:build a op:CLIStep ;
  rdfs:label "Build project" ;
  op:command "npm run build" ;
  op:timeout 120000 ;
  op:retries 2 ;
  op:retryBackoff 10000 ;
  op:dependsOn gh:lint ;
  op:failOn "error TS" .
```

### Template Step

Use a predefined template.

```turtle
gh:step-name a op:TemplateStep ;
  rdfs:label "Using template" ;
  op:template "docker-build" ;
  op:templateArgs {
    "image": "myapp:latest",
    "dockerfile": "Dockerfile",
    "registry": "myregistry.azurecr.io"
  } ;
  op:timeout 180000 .
```

**Available Templates:**
- `docker-build` - Build Docker image
- `docker-push` - Push Docker image
- `kubernetes-deploy` - Deploy to Kubernetes
- `s3-upload` - Upload to AWS S3
- `lambda-deploy` - Deploy AWS Lambda
- `healthcheck` - HTTP health check
- `wait-for` - Wait for condition

### SPARQL Step

Query the workflow graph.

```turtle
gh:step-name a op:SPARQLStep ;
  rdfs:label "Query workflows" ;
  op:query "SELECT ?workflow ?label WHERE { ... }" ;
  op:timeout 5000 .
```

---

## Conditions

### Branch Conditions

```turtle
gh:workflow a gh:Hook ;
  cond:onBranch "main" ;     # Only on main branch
  cond:onBranch "develop" ;  # Or develop
  cond:onBranch "release/*" . # Or release/* branches
```

### Tag Conditions

```turtle
gh:workflow a gh:Hook ;
  cond:onTag "v*" ;          # Only on version tags
  cond:onTag "release/*" .   # Or release tags
```

### Path Conditions

```turtle
gh:workflow a gh:Hook ;
  cond:whenPathsChanged "src/**" ;     # When src/ changed
  cond:whenPathsChanged "package.json" . # Or package.json
```

### Author Conditions

```turtle
gh:workflow a gh:Hook ;
  cond:whenAuthor "alice@example.com" ;  # Specific author
  cond:whenAuthorEmail "*@company.com" .  # Email pattern
```

### Composite Conditions

```turtle
gh:workflow a gh:Hook ;
  cond:when [
    cond:branch "main" ;
    cond:pathsChanged "src/**" ;
    cond:matchesAll true  # All conditions must be true
  ] .
```

---

## Actions

### Step Actions

#### On Failure

```turtle
gh:step a op:CLIStep ;
  op:command "npm test" ;
  op:onFailure gh:fail-workflow ;
  op:onFailure gh:notify-team .
```

**Actions:**
- `gh:fail-workflow` - Stop entire workflow
- `gh:skip-to <step>` - Jump to another step
- `gh:continue` - Continue to next step anyway
- `gh:retry` - Retry this step

#### On Success

```turtle
gh:step a op:CLIStep ;
  op:command "npm run build" ;
  op:onSuccess gh:publish-artifact ;
  op:onSuccess gh:notify-slack .
```

---

## Metrics & Observability

### Define SLOs

```turtle
gh:workflow a gh:Hook ;
  perf:sloTarget 180000 ;      # 3 minutes
  perf:sloP99 220000 ;         # p99 under 3:40
  perf:sloFailures 1 ;         # Allow 1 failure per day
  perf:errorBudget 0.01 .      # 1% error budget
```

### Track Custom Metrics

```turtle
gh:step a op:CLIStep ;
  obs:trackMetric "bundle.size" ;
  obs:trackMetric "build.files.count" ;
  obs:trackDuration true ;
  obs:trackMemory true ;
  obs:trackCPU true .
```

### Enable Distributed Tracing

```turtle
gh:workflow a gh:Hook ;
  obs:enableTracing true ;
  obs:tracingSampler 1.0 ;      # Sample 100%
  obs:tracingExporter "jaeger" .
```

---

## Configuration

### Global Configuration

File: `.gitvan/config.yaml`

```yaml
version: 1

# Execution defaults
execution:
  defaultTimeout: 300000      # 5 minutes
  defaultRetries: 0
  defaultRetryBackoff: 5000

# Observability
observability:
  enabled: true
  exporterType: "otel"
  samplingRate: 0.1

# Git hooks
hooks:
  autoInstall: false
  failOnError: true

# Alerts
alerts:
  slack:
    webhook: "https://hooks.slack.com/..."
    channel: "#deployments"
  email:
    enabled: false
```

### Workflow-Level Config

```turtle
gh:workflow a gh:Hook ;
  config:timeout 300000 ;
  config:retries 2 ;
  config:parallelism 4 ;
  config:failFast true .
```

---

## Exit Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | SUCCESS | Workflow completed successfully |
| 1 | FAILURE | Workflow failed (step exited non-zero) |
| 2 | TIMEOUT | Workflow exceeded timeout |
| 3 | VALIDATION_ERROR | Workflow definition invalid |
| 4 | NOT_FOUND | Workflow not found |
| 5 | GIT_ERROR | Git operation failed |
| 6 | CONDITION_NOT_MET | Trigger condition not met |
| 7 | INTERRUPTED | Workflow interrupted by user |
| 8 | SYSTEM_ERROR | Internal GitVan error |

---

## Quick Reference: All Prefixes

```turtle
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix perf: <http://example.org/performance#> .
@prefix obs: <http://example.org/observability#> .
@prefix cond: <http://example.org/conditions#> .
@prefix admin: <http://example.org/admin#> .
@prefix config: <http://example.org/config#> .
```

---

## File Organization

```
.gitvan/
├── workflows/
│   ├── build.ttl
│   ├── deploy-staging.ttl
│   ├── deploy-production.ttl
│   ├── lint-and-format.ttl
│   └── test.ttl
├── config.yaml
└── hooks/
    ├── pre-commit -> ../workflows/lint-and-format.ttl
    ├── post-commit -> ../workflows/build.ttl
    └── pre-push -> ../workflows/test.ttl
```

---

## Common Patterns

### Sequential Pipeline (Default)

```turtle
gh:step-2 op:dependsOn gh:step-1 .
gh:step-3 op:dependsOn gh:step-2 .
# Result: step-1 → step-2 → step-3
```

### Parallel Steps (No Dependencies)

```turtle
gh:step-1 a op:CLIStep ; op:command "npm run lint" .
gh:step-2 a op:CLIStep ; op:command "npm run format" .
gh:step-3 a op:CLIStep ; op:command "npm run type-check" .
# All three run in parallel (no dependsOn)
```

### Diamond Dependency

```turtle
gh:step-2 op:dependsOn gh:step-1 .
gh:step-3 op:dependsOn gh:step-1 .
gh:step-4 op:dependsOn gh:step-2 .
gh:step-4 op:dependsOn gh:step-3 .
# Result:
#     step-1
#    /      \
#  step-2  step-3
#    \      /
#    step-4
```

---

## Environment Variables

### System Variables (Available to all steps)

- `GIT_BRANCH` - Current Git branch
- `GIT_COMMIT` - Current commit hash
- `GIT_AUTHOR` - Commit author email
- `GITVAN_WORKFLOW_ID` - Current workflow ID
- `GITVAN_STEP_ID` - Current step ID
- `GITVAN_EXECUTION_ID` - Unique execution ID
- `HOME` - User home directory
- `USER` - Current user

### Custom Variables

```turtle
gh:workflow a gh:Hook ;
  env:set "DEPLOY_ENV" "staging" ;
  env:set "LOG_LEVEL" "debug" .
```

Pass at runtime:
```bash
gitvan workflow run MyWorkflow --env VAR=value
```

