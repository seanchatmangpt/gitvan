# GitVan Tutorials: Learn by Doing

**Goal**: Get you productive with GitVan workflows in 30 minutes.

These tutorials are **learning-oriented**: they assume no prior knowledge and focus on practical, hands-on experience. Each tutorial builds on the previous one.

---

## Tutorial 1: Your First Workflow

### Goal
Create and execute your first GitVan workflow.

### Time
10 minutes

### Prerequisites
- GitVan installed (`npm install -g gitvan`)
- Git repository initialized (`git init`)

### Steps

**1. Create a workflow file**

```bash
# Create workflows directory
mkdir -p .gitvan/workflows

# Create your first workflow
cat > .gitvan/workflows/hello-world.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:HelloWorld a gh:Hook ;
  rdfs:label "Hello World" ;
  op:hasPipeline [
    a op:Pipeline ;
    op:hasStep gh:step-1
  ] .

gh:step-1 a op:CLIStep ;
  rdfs:label "Print greeting" ;
  op:command "echo 'Hello, GitVan!'" .
EOF
```

**2. List available workflows**

```bash
gitvan workflow list
```

Expected output:
```
Workflows available:
✓ HelloWorld - Hello World
```

**3. Execute the workflow**

```bash
gitvan workflow run HelloWorld
```

Expected output:
```
Executing HelloWorld...
[step-1] Hello, GitVan!
✓ Workflow completed in 145ms
```

**Congratulations!** You've created and executed your first workflow.

### What Just Happened

- **Workflow Definition** (`.ttl` file): Describes your workflow in RDF format (but you never interact with the RDF directly)
- **Workflow List**: GitVan discovered your workflow and listed it
- **Workflow Execution**: GitVan validated your workflow and ran each step sequentially

---

## Tutorial 2: Multi-Step Workflows with Dependencies

### Goal
Create a workflow with multiple steps and data flow between them.

### Time
15 minutes

### Prerequisites
- Completed Tutorial 1

### Steps

**1. Create a multi-step workflow**

```bash
cat > .gitvan/workflows/build-and-test.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:BuildAndTest a gh:Hook ;
  rdfs:label "Build and Test Pipeline" ;
  op:hasPipeline [
    a op:Pipeline ;
    op:hasStep gh:step-lint ;
    op:hasStep gh:step-build ;
    op:hasStep gh:step-test
  ] .

gh:step-lint a op:CLIStep ;
  rdfs:label "Lint code" ;
  op:command "npm run lint" ;
  op:timeout 30000 .

gh:step-build a op:CLIStep ;
  rdfs:label "Build project" ;
  op:command "npm run build" ;
  op:timeout 60000 ;
  op:dependsOn gh:step-lint .

gh:step-test a op:CLIStep ;
  rdfs:label "Run tests" ;
  op:command "npm test" ;
  op:timeout 120000 ;
  op:dependsOn gh:step-build .
EOF
```

**2. Execute with step tracking**

```bash
gitvan workflow run BuildAndTest --verbose
```

Expected output:
```
Executing BuildAndTest...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[step-lint] Linting code...
✓ step-lint completed in 2.3s
[step-build] Building project...
✓ step-build completed in 5.1s
[step-test] Running tests...
✓ step-test completed in 8.7s
✓ Workflow completed in 16.1s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**3. View workflow structure**

```bash
gitvan workflow describe BuildAndTest
```

Expected output:
```
BuildAndTest
├─ step-lint
│  └─ Depends on: (none)
├─ step-build
│  └─ Depends on: step-lint
└─ step-test
   └─ Depends on: step-build

Execution order: sequential
Total timeout: 210s
```

### What Just Happened

- **Step Dependencies**: Each step waits for its `dependsOn` step to complete
- **Timeouts**: Each step has a timeout to prevent hangs
- **Sequential Execution**: GitVan executed steps in dependency order
- **Step Output**: Each step's output displayed in real-time

### Try This

Modify the workflow to run lint and build in parallel:

```bash
cat > .gitvan/workflows/build-parallel.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:step-build a op:CLIStep ;
  op:command "npm run build" ;
  op:timeout 60000 .
  # No dependsOn → runs in parallel

gh:step-test a op:CLIStep ;
  op:command "npm test" ;
  op:timeout 120000 ;
  op:dependsOn gh:step-build .
EOF
```

---

## Tutorial 3: Querying Your Workflow Execution History

### Goal
Learn to query workflow execution history and metrics.

### Time
10 minutes

### Prerequisites
- Completed Tutorials 1 & 2
- Executed workflows at least once

### Steps

**1. View recent executions**

```bash
gitvan workflow history BuildAndTest --limit 5
```

Expected output:
```
Recent executions of BuildAndTest:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 2024-01-15 14:23:45 UTC
   Status: ✓ PASSED
   Duration: 16.1s
   Started by: alice@example.com

2. 2024-01-15 14:15:30 UTC
   Status: ✓ PASSED
   Duration: 15.8s
   Started by: alice@example.com

3. 2024-01-15 13:45:12 UTC
   Status: ✗ FAILED
   Duration: 5.2s (step-lint failed)
   Started by: system (pre-commit hook)
```

**2. View execution details**

```bash
gitvan workflow show BuildAndTest --execution 2024-01-15T14:23:45Z
```

Expected output:
```
Execution: BuildAndTest @ 2024-01-15T14:23:45Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: PASSED
Started by: alice@example.com
Duration: 16.1s

Steps:
  [1] step-lint (2.3s)
      ✓ Passed
  [2] step-build (5.1s)
      ✓ Passed
  [3] step-test (8.7s)
      ✓ Passed

Performance vs Target:
  16.1s actual vs 20s target (80% of SLO)
```

**3. Compare performance over time**

```bash
gitvan workflow stats BuildAndTest
```

Expected output:
```
BuildAndTest Performance Stats
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Last 10 executions:
  Median: 16.0s
  p95: 17.2s
  p99: 18.5s
  Max: 19.1s
  Failures: 0

Step Breakdown:
  step-lint (avg 2.3s) - fastest
  step-build (avg 5.0s) - variance: ±0.3s
  step-test (avg 8.6s) - slowest, check for flakes
```

### What Just Happened

- **Execution History**: GitVan tracks every workflow execution with timestamps and outcomes
- **Step Metrics**: Each step's duration is measured and recorded
- **SLO Tracking**: Your workflow is compared against performance targets
- **Trend Analysis**: You can see if workflows are getting faster or slower

### Try This

Check if any workflow has been failing:

```bash
gitvan workflow stats --status failed
```

---

## Tutorial 4: Working with Git Hooks (Automated Workflows)

### Goal
Trigger workflows automatically on Git events.

### Time
15 minutes

### Prerequisites
- Completed Tutorials 1-3
- Git repository with commits

### Steps

**1. Create a pre-commit workflow**

```bash
cat > .gitvan/workflows/pre-commit-checks.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:PreCommitChecks a gh:Hook ;
  rdfs:label "Pre-commit Checks" ;
  gh:trigger gh:event-pre-commit ;
  op:hasPipeline [
    a op:Pipeline ;
    op:hasStep gh:step-format ;
    op:hasStep gh:step-lint
  ] .

gh:event-pre-commit a gh:GitEvent ;
  rdfs:label "Before commit" .

gh:step-format a op:CLIStep ;
  rdfs:label "Format code" ;
  op:command "npm run format" .

gh:step-lint a op:CLIStep ;
  rdfs:label "Lint code" ;
  op:command "npm run lint" ;
  op:onFailure gh:fail-commit .

gh:fail-commit a op:Action ;
  rdfs:label "Fail commit if lint fails" .
EOF
```

**2. Register the workflow as a git hook**

```bash
gitvan hook install pre-commit PreCommitChecks
```

Expected output:
```
✓ Installed PreCommitChecks as pre-commit hook
  Runs before every git commit
  Will fail commit if workflow fails
```

**3. Make a commit (workflow runs automatically)**

```bash
echo "test content" > test.txt
git add test.txt
git commit -m "Add test file"
```

Expected output:
```
Running PreCommitChecks...
  [step-format] Formatting code... ✓ (0.5s)
  [step-lint] Linting code... ✓ (2.1s)
✓ Pre-commit checks passed

[main abc1234] Add test file
 1 file changed, 1 insertion(+)
```

**4. See all registered hooks**

```bash
gitvan hook list
```

Expected output:
```
Git Hooks Registered
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pre-commit: PreCommitChecks
  Runs before every commit
  Fails commit if workflow fails

post-commit: (none)
pre-push: (none)
```

### What Just Happened

- **Git Integration**: Your workflow runs automatically on `git commit`
- **Fail Prevention**: If lint fails, the commit is blocked
- **Workflow Automation**: No manual commands needed; Git triggers workflow

### Try This

Add a post-commit hook that notifies on success:

```bash
cat > .gitvan/workflows/post-commit-notify.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .

gh:PostCommitNotify a gh:Hook ;
  gh:trigger gh:event-post-commit ;
  op:hasPipeline [
    op:hasStep gh:notify-slack
  ] .

gh:notify-slack a op:CLIStep ;
  op:command "curl https://hooks.slack.com/... -d 'Committed'" .
EOF

gitvan hook install post-commit PostCommitNotify
```

---

## Tutorial 5: Monitoring Workflow Performance

### Goal
Set up SLOs (Service Level Objectives) and monitor performance.

### Time
10 minutes

### Prerequisites
- Completed Tutorials 1-4

### Steps

**1. Create a performance-monitored workflow**

```bash
cat > .gitvan/workflows/production-deploy.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix perf: <http://example.org/performance#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:ProductionDeploy a gh:Hook ;
  rdfs:label "Production Deploy" ;
  perf:targetDuration 180000 ;  # 3 minutes
  perf:p99Target 200000 ;        # p99 under 3.3 minutes
  op:hasPipeline [
    op:hasStep gh:step-deploy ;
    op:hasStep gh:step-health-check ;
    op:hasStep gh:step-smoke-test
  ] .

gh:step-deploy a op:CLIStep ;
  rdfs:label "Deploy to production" ;
  op:command "./deploy.sh" ;
  op:timeout 120000 .

gh:step-health-check a op:CLIStep ;
  rdfs:label "Health check" ;
  op:command "curl -f https://api.example.com/health" ;
  op:timeout 30000 .

gh:step-smoke-test a op:CLIStep ;
  rdfs:label "Run smoke tests" ;
  op:command "npm run smoke-test" ;
  op:timeout 60000 .
EOF
```

**2. Execute and check performance**

```bash
gitvan workflow run ProductionDeploy
gitvan workflow stats ProductionDeploy
```

Expected output:
```
ProductionDeploy Performance Stats
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: 180s | p99 Target: 200s

Last 10 executions:
  Median: 156s
  p95: 178s
  p99: 192s ← Within SLO ✓
  Max: 195s

SLO Status: ✓ PASSING
  180s target: 15/15 executions ✓
  200s p99: 15/15 executions ✓
```

**3. Set up alerts**

```bash
gitvan alert create \
  --workflow ProductionDeploy \
  --metric duration \
  --threshold 240000 \
  --action notify-slack \
  --message "Production deploy exceeded 4 minutes"
```

Expected output:
```
✓ Alert created
  Triggers if ProductionDeploy takes > 4 minutes
  Notifies Slack channel: #deployments
```

**4. View all alerts**

```bash
gitvan alert list
```

Expected output:
```
Alerts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ProductionDeploy duration > 240s
   Status: ARMED
   Notifications: Slack

2. BuildAndTest failures > 2/10
   Status: ARMED
   Notifications: Email, Slack
```

### What Just Happened

- **Performance Targets**: You set SLOs for your workflow
- **Automatic Measurement**: GitVan measures p50, p95, p99 performance
- **Alerts**: When workflows violate SLOs, you're notified
- **Trend Tracking**: Performance is monitored continuously

### Try This

Query your performance data:

```bash
gitvan workflow metrics ProductionDeploy --json | jq '.stats | keys'
```

---

## Tutorial 6: Composing Workflows (Workflow of Workflows)

### Goal
Create complex workflows by combining simpler ones.

### Time
10 minutes

### Prerequisites
- Completed Tutorials 1-5

### Steps

**1. Create simple, reusable workflows**

```bash
cat > .gitvan/workflows/test.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:Test a gh:Hook ;
  rdfs:label "Test Suite" ;
  op:hasPipeline [
    op:hasStep gh:step-test
  ] .

gh:step-test a op:CLIStep ;
  op:command "npm test" ;
  op:timeout 120000 .
EOF

cat > .gitvan/workflows/build.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .

gh:Build a gh:Hook ;
  rdfs:label "Build" ;
  op:hasPipeline [
    op:hasStep gh:step-build
  ] .

gh:step-build a op:CLIStep ;
  op:command "npm run build" .
EOF
```

**2. Create a composed workflow**

```bash
cat > .gitvan/workflows/full-pipeline.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix comp: <http://example.org/compose#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:FullPipeline a gh:Hook ;
  rdfs:label "Full CI/CD Pipeline" ;
  comp:include gh:Test ;
  comp:include gh:Build ;
  comp:executionMode comp:Sequential .
EOF
```

**3. Execute the composed workflow**

```bash
gitvan workflow run FullPipeline
```

Expected output:
```
Executing FullPipeline...
  ├─ Test
  │  [step-test] Running tests...
  │  ✓ Test completed (8.2s)
  │
  └─ Build
     [step-build] Building...
     ✓ Build completed (5.1s)

✓ FullPipeline completed (13.3s)
```

**4. Query the workflow composition**

```bash
gitvan workflow describe FullPipeline
```

Expected output:
```
FullPipeline
├─ Includes: Test
│  └─ test: 1 step, timeout 120s
├─ Includes: Build
│  └─ build: 1 step, timeout 60s
└─ Execution: Sequential
   Total timeout: 300s
```

### What Just Happened

- **Workflow Reuse**: Test and Build workflows are defined once, reused everywhere
- **Composition**: FullPipeline combines them without duplicating logic
- **Orchestration**: GitVan handles execution order and data flow

### Try This

Create a parallel composition:

```bash
cat > .gitvan/workflows/full-pipeline-parallel.ttl << 'EOF'
gh:FullPipelineParallel a gh:Hook ;
  comp:include gh:Test ;
  comp:include gh:Build ;
  comp:executionMode comp:Parallel .
EOF

gitvan workflow run FullPipelineParallel
```

---

## Next Steps

Now that you've completed all tutorials, you're ready to:

1. **Create custom workflows** for your project
2. **Integrate with Git hooks** for CI/CD
3. **Monitor performance** with SLOs and alerts
4. **Compose complex pipelines** from reusable workflows

For deeper learning, see:
- **[How-To Guides](HOW-TO-GUIDES.md)**: Solve specific problems
- **[Reference](REFERENCE.md)**: Complete API and format specifications
- **[Explanation](EXPLANATION.md)**: Understand architectural decisions

---

## Troubleshooting

### "Workflow not found"
```bash
# Check that your .ttl file is in .gitvan/workflows/
ls -la .gitvan/workflows/

# Re-list workflows
gitvan workflow list
```

### "Step failed with timeout"
```bash
# Increase timeout in your .ttl file
# Current: op:timeout 30000 (30 seconds)
# Change to: op:timeout 60000 (60 seconds)
```

### "Pre-commit hook not running"
```bash
# Verify hook is installed
gitvan hook list

# Re-install if missing
gitvan hook install pre-commit WorkflowName
```

For more help: `gitvan --help` or `gitvan workflow --help`
