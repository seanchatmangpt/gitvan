# GitVan How-To Guides: Solve Specific Problems

**Goal**: Practical recipes for common tasks.

These guides are **problem-solving oriented**: each addresses a specific goal and shows you exactly how to achieve it. They assume you've completed the tutorials.

---

## How to: Add a Custom Workflow

**Problem**: You want to create a new workflow specific to your project.

**Solution**:

**1. Plan your workflow**

Think about the steps:
- What needs to happen first?
- What depends on what?
- How long should each step take?

Example: "I want to deploy to staging, run smoke tests, then deploy to production"

**2. Create the workflow file**

```bash
cat > .gitvan/workflows/deploy-full-stack.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:DeployFullStack a gh:Hook ;
  rdfs:label "Deploy Full Stack" ;
  op:hasPipeline [
    a op:Pipeline ;
    op:hasStep gh:step-deploy-backend ;
    op:hasStep gh:step-deploy-frontend ;
    op:hasStep gh:step-smoke-test ;
    op:hasStep gh:step-monitor
  ] .

gh:step-deploy-backend a op:CLIStep ;
  rdfs:label "Deploy backend" ;
  op:command "cd backend && npm run deploy:staging" ;
  op:timeout 60000 .

gh:step-deploy-frontend a op:CLIStep ;
  rdfs:label "Deploy frontend" ;
  op:command "cd frontend && npm run deploy:staging" ;
  op:timeout 45000 ;
  op:dependsOn gh:step-deploy-backend .

gh:step-smoke-test a op:CLIStep ;
  rdfs:label "Run smoke tests" ;
  op:command "npm run test:smoke" ;
  op:timeout 30000 ;
  op:dependsOn gh:step-deploy-frontend .

gh:step-monitor a op:CLIStep ;
  rdfs:label "Check monitoring" ;
  op:command "curl https://api.example.com/health" ;
  op:timeout 10000 ;
  op:dependsOn gh:step-smoke-test .
EOF
```

**3. Test it**

```bash
gitvan workflow run DeployFullStack
```

**4. (Optional) Trigger on Git event**

```bash
# Run on every merge to staging branch
gitvan hook install post-commit DeployFullStack
```

---

## How to: Parallelize Steps

**Problem**: Your workflow has steps that don't depend on each other; you want them to run simultaneously.

**Solution**:

**Before** (sequential - 30s total):
```turtle
gh:step-lint (5s) → gh:step-format (5s) → gh:step-test (20s) = 30s total
```

**After** (parallel - 20s total):
```bash
cat > .gitvan/workflows/parallel-checks.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .

gh:ParallelChecks a gh:Hook ;
  op:hasPipeline [
    op:hasStep gh:step-lint ;
    op:hasStep gh:step-format ;
    op:hasStep gh:step-test
  ] .

# No dependsOn means these run in parallel
gh:step-lint a op:CLIStep ;
  op:command "npm run lint" ;
  op:timeout 5000 .

gh:step-format a op:CLIStep ;
  op:command "npm run format" ;
  op:timeout 5000 .

gh:step-test a op:CLIStep ;
  op:command "npm test" ;
  op:timeout 20000 .
EOF
```

**Key**: Only add `op:dependsOn` if a step truly requires another step to finish first.

---

## How to: Run a Workflow Only on Specific Branches

**Problem**: Deploy workflow should only run on main branch, not on feature branches.

**Solution**:

```bash
cat > .gitvan/workflows/deploy-main-only.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix cond: <http://example.org/conditions#> .

gh:DeployMainOnly a gh:Hook ;
  cond:onBranch "main" ;
  op:hasPipeline [
    op:hasStep gh:step-deploy
  ] .

gh:step-deploy a op:CLIStep ;
  op:command "./deploy-to-production.sh" .
EOF
```

**Register it**:
```bash
gitvan hook install post-commit DeployMainOnly
```

**Test it**:
```bash
# On main branch
git checkout main
git commit --allow-empty -m "test"  # Deploys

# On feature branch
git checkout -b feature/test
git commit --allow-empty -m "test"  # Doesn't deploy (condition not met)
```

---

## How to: Fail a Workflow on Specific Errors

**Problem**: If tests fail, you want the entire workflow to stop (and block commit).

**Solution**:

```bash
cat > .gitvan/workflows/strict-quality.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .

gh:StrictQuality a gh:Hook ;
  op:hasPipeline [
    op:hasStep gh:step-lint ;
    op:hasStep gh:step-test
  ] .

gh:step-lint a op:CLIStep ;
  op:command "npm run lint" ;
  op:timeout 30000 ;
  op:failOn "error" .  # Fail workflow if lint outputs "error"

gh:step-test a op:CLIStep ;
  op:command "npm test" ;
  op:timeout 120000 ;
  op:failOn "FAIL" ;  # Fail workflow if tests fail
  op:dependsOn gh:step-lint .
EOF
```

**Effect**: If lint or test fails, commit is blocked:
```bash
$ git commit -m "Add feature"
Running StrictQuality...
  [step-lint] Linting... ✓
  [step-test] Testing... ✗ FAIL

✗ Workflow failed; commit blocked
```

---

## How to: Retry a Step on Failure

**Problem**: A flaky network step sometimes fails; you want to retry.

**Solution**:

```bash
cat > .gitvan/workflows/resilient-deploy.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .

gh:ResilientDeploy a gh:Hook ;
  op:hasPipeline [
    op:hasStep gh:step-pull-docker
  ] .

gh:step-pull-docker a op:CLIStep ;
  op:command "docker pull myregistry.azurecr.io/myapp:latest" ;
  op:timeout 60000 ;
  op:retries 3 ;  # Retry up to 3 times on failure
  op:retryBackoff 5000 .  # Wait 5 seconds between retries
EOF
```

**Behavior**:
```
Attempt 1: Failed (timeout)
  Waiting 5 seconds...
Attempt 2: Failed (connection reset)
  Waiting 5 seconds...
Attempt 3: ✓ Success
```

---

## How to: Query Workflow History

**Problem**: You want to find when a specific workflow failed and what the error was.

**Solution**:

```bash
# Show last 10 executions
gitvan workflow history BuildAndTest --limit 10

# Show only failures
gitvan workflow history BuildAndTest --status failed

# Show executions from last 24 hours
gitvan workflow history BuildAndTest --since "24h"

# Export as JSON for analysis
gitvan workflow history BuildAndTest --json > history.json
jq '.[] | select(.status == "failed")' history.json
```

**Example output**:
```
Recent executions of BuildAndTest:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 2024-01-15 14:23:45 UTC
   Status: ✓ PASSED
   Duration: 16.1s

2. 2024-01-15 13:45:12 UTC
   Status: ✗ FAILED
   Duration: 5.2s
   Error: [step-lint] exit code 1
   Step output: 'Missing semicolon on line 42'
```

---

## How to: Set Up an SLO (Service Level Objective)

**Problem**: Your deploy workflow should complete in < 5 minutes, p99 < 6 minutes.

**Solution**:

**1. Define SLO in workflow**

```bash
cat > .gitvan/workflows/deploy-slo.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix perf: <http://example.org/performance#> .

gh:DeployWithSLO a gh:Hook ;
  perf:sloTarget 300000 ;      # 5 minutes
  perf:sloP99 360000 ;         # p99: 6 minutes
  op:hasPipeline [
    op:hasStep gh:step-deploy ;
    op:hasStep gh:step-verify
  ] .

gh:step-deploy a op:CLIStep ;
  op:command "./deploy.sh" ;
  op:timeout 240000 .

gh:step-verify a op:CLIStep ;
  op:command "curl -f https://api.example.com/health" ;
  op:timeout 60000 ;
  op:dependsOn gh:step-deploy .
EOF
```

**2. Check SLO status**

```bash
gitvan workflow stats DeployWithSLO
```

**Expected output**:
```
DeployWithSLO SLO Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: 300s (5 min)
p99 Target: 360s (6 min)

Last 10 executions:
  Median: 256s
  p95: 298s
  p99: 315s ← Within SLO ✓

SLO: ✓ PASSING (10/10 executions)
```

**3. Alert if SLO violated**

```bash
gitvan alert create \
  --workflow DeployWithSLO \
  --metric p99 \
  --threshold 360000 \
  --action notify-slack
```

---

## How to: Add Observability/Metrics to a Workflow

**Problem**: You want to track custom metrics during workflow execution.

**Solution**:

```bash
cat > .gitvan/workflows/observable-build.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix obs: <http://example.org/observability#> .

gh:ObservableBuild a gh:Hook ;
  obs:enableMetrics true ;
  obs:enableTracing true ;
  op:hasPipeline [
    op:hasStep gh:step-build ;
    op:hasStep gh:step-publish
  ] .

gh:step-build a op:CLIStep ;
  op:command "npm run build" ;
  op:timeout 60000 ;
  obs:trackMetric "bundle.size" ;
  obs:trackMetric "build.files.count" .

gh:step-publish a op:CLIStep ;
  op:command "npm publish" ;
  op:timeout 30000 ;
  obs:trackMetric "publish.duration" .
EOF
```

**View metrics**:
```bash
gitvan workflow metrics ObservableBuild
```

**Output**:
```
ObservableBuild Metrics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Last 10 executions:

bundle.size
  avg: 245.3 KB
  max: 256.1 KB
  p99: 254.2 KB

build.files.count
  avg: 156
  max: 167
  min: 145

publish.duration
  avg: 12.3s
  p95: 14.1s
```

---

## How to: Validate a Workflow Before Running

**Problem**: You modified a workflow file; you want to verify it's valid before committing.

**Solution**:

```bash
# Validate specific workflow
gitvan workflow validate DeployFullStack

# Validate all workflows
gitvan workflow validate --all

# Verbose output shows what was checked
gitvan workflow validate DeployFullStack --verbose
```

**Output**:
```
Validating DeployFullStack...
✓ Workflow structure valid
✓ All steps have required fields
✓ All dependencies resolved
✓ Timeouts reasonable (30-240 seconds)
✓ No circular dependencies detected

Valid! Ready to execute.
```

---

## How to: Disable a Workflow Temporarily

**Problem**: You want to keep a workflow definition but prevent it from running.

**Solution**:

```bash
cat > .gitvan/workflows/deploy-staging.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix admin: <http://example.org/admin#> .

gh:DeployStaging a gh:Hook ;
  admin:disabled true ;  # This workflow is disabled
  rdfs:comment "Disabled 2024-01-15: waiting for infrastructure" ;
  op:hasPipeline [
    op:hasStep gh:step-deploy
  ] .
EOF
```

**Result**:
```bash
$ gitvan workflow run DeployStaging
✗ Workflow disabled: DeployStaging
Reason: Disabled 2024-01-15: waiting for infrastructure
```

---

## How to: Run a One-Off Workflow (Not Stored)

**Problem**: You want to execute a quick workflow without creating a file.

**Solution**:

```bash
# Inline workflow execution
gitvan workflow run --inline << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .

gh:QuickCheck a gh:Hook ;
  op:hasPipeline [
    op:hasStep [ a op:CLIStep ; op:command "npm run lint" ]
  ] .
EOF
```

**Or use JSON format**:

```bash
gitvan workflow run --json << 'EOF'
{
  "name": "QuickTest",
  "steps": [
    {"type": "cli", "command": "npm test"}
  ]
}
EOF
```

---

## How to: Export Workflow Execution Data

**Problem**: You want to analyze workflow performance in a spreadsheet or BI tool.

**Solution**:

```bash
# Export as CSV
gitvan workflow history BuildAndTest --csv > history.csv

# Export as JSON
gitvan workflow history BuildAndTest --json > history.json

# Export specific fields
gitvan workflow history BuildAndTest --json | \
  jq '.[] | {timestamp, status, duration}' > analytics.json

# Pipe to your data warehouse
gitvan workflow history BuildAndTest --json | \
  curl -X POST https://analytics.example.com/api/events -d @-
```

---

## How to: Compose Multiple Workflows

**Problem**: You have separate lint, test, and build workflows; you want to run them together.

**Solution**:

```bash
cat > .gitvan/workflows/ci-pipeline.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix comp: <http://example.org/compose#> .

gh:CIPipeline a gh:Hook ;
  rdfs:label "CI Pipeline" ;
  comp:includes gh:Lint ;
  comp:includes gh:Test ;
  comp:includes gh:Build ;
  comp:executionMode comp:Sequential ;
  comp:stopOnFailure true .
EOF
```

**Execute**:
```bash
gitvan workflow run CIPipeline
```

**Output**:
```
Executing CIPipeline...
  ├─ Lint
  │  ✓ Completed (2.3s)
  ├─ Test
  │  ✓ Completed (8.1s)
  └─ Build
     ✓ Completed (5.2s)

✓ CIPipeline completed (15.6s)
```

---

## How to: Set Environment Variables for a Workflow

**Problem**: Your deploy workflow needs AWS credentials and environment-specific variables.

**Solution**:

```bash
# Set via environment variables before running
export DEPLOY_ENV=staging
export AWS_REGION=us-east-1
export DEPLOY_VERSION=1.2.3

gitvan workflow run DeployStaging

# Or set in workflow definition
cat > .gitvan/workflows/deploy-env.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix env: <http://example.org/environment#> .

gh:DeployWithEnv a gh:Hook ;
  env:set "DEPLOY_ENV" "production" ;
  env:set "LOG_LEVEL" "info" ;
  op:hasPipeline [
    op:hasStep gh:step-deploy
  ] .

gh:step-deploy a op:CLIStep ;
  op:command "cd infra && ./deploy.sh" ;
  op:env {
    "DEPLOY_ENV": "${DEPLOY_ENV}",
    "AWS_REGION": "${AWS_REGION}",
    "DEPLOY_VERSION": "${DEPLOY_VERSION}"
  } .
EOF
```

---

## How to: Debug a Failed Workflow Step

**Problem**: A step is failing; you need to see the full output and environment.

**Solution**:

```bash
# Run with verbose logging
gitvan workflow run BuildAndTest --verbose

# Capture full step output
gitvan workflow run BuildAndTest --capture-output > build.log

# Run single step in isolation
gitvan step run gh:step-build --debug

# Show step environment
gitvan workflow run BuildAndTest --show-env
```

**Output**:
```
Executing BuildAndTest with debugging enabled...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[step-lint] Linting code...

Command: npm run lint
Working directory: /Users/alice/project
Environment:
  NODE_ENV=test
  PATH=/usr/local/bin:/usr/bin:/bin
  HOME=/Users/alice

Output:
  ✓ All files checked
  ✓ 0 errors, 0 warnings

✓ step-lint completed (2.3s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Quick Reference

| Task | Command |
|------|---------|
| List workflows | `gitvan workflow list` |
| Run workflow | `gitvan workflow run WorkflowName` |
| Show workflow structure | `gitvan workflow describe WorkflowName` |
| View history | `gitvan workflow history WorkflowName` |
| Check performance | `gitvan workflow stats WorkflowName` |
| Validate | `gitvan workflow validate WorkflowName` |
| List git hooks | `gitvan hook list` |
| Install hook | `gitvan hook install pre-commit WorkflowName` |
| View metrics | `gitvan workflow metrics WorkflowName` |
| Create alert | `gitvan alert create --workflow X --metric Y` |

For complete reference: `gitvan --help`

