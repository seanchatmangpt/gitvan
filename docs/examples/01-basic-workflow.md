# Example 1: Basic Workflow

This example demonstrates creating a simple CI/CD workflow that installs dependencies, builds, and tests your project.

## Workflow Definition

Create `.gitvan/workflows/ci-pipeline.ttl`:

```turtle
@prefix : <http://gitvan.dev/workflow/> .
@prefix step: <http://gitvan.dev/step/> .
@prefix git: <http://gitvan.dev/git/> .

:CIPipeline a :Workflow ;
  :name "CI Pipeline" ;
  :description "Continuous Integration workflow for every commit" ;
  :trigger git:commit ;
  :hasStep step:install ;
  :hasStep step:lint ;
  :hasStep step:build ;
  :hasStep step:test ;
  :hasStep step:coverage .

step:install a :ScriptStep ;
  :name "Install Dependencies" ;
  :description "Install npm dependencies" ;
  :script "npm ci" ;
  :workingDir "." .

step:lint a :ScriptStep ;
  :name "Run Linter" ;
  :description "Check code quality with ESLint" ;
  :script "npm run lint" ;
  :dependsOn step:install .

step:build a :ScriptStep ;
  :name "Build Project" ;
  :description "Build production bundle" ;
  :script "npm run build" ;
  :dependsOn step:install .

step:test a :TestStep ;
  :name "Run Tests" ;
  :description "Execute test suite" ;
  :script "npm test" ;
  :dependsOn step:build .

step:coverage a :ScriptStep ;
  :name "Code Coverage" ;
  :description "Check test coverage" ;
  :script "npm run test:coverage" ;
  :dependsOn step:test ;
  :continueOnError true .
```

## Understanding the Workflow

### Workflow Declaration

```turtle
:CIPipeline a :Workflow ;
  :name "CI Pipeline" ;
  :description "Continuous Integration workflow for every commit" ;
  :trigger git:commit ;
```

- `:name`: Human-readable workflow name
- `:description`: What the workflow does
- `:trigger`: When to run (on every commit)

### Steps

Each step is defined with:
- `:name`: Step name
- `:script`: Command to execute
- `:dependsOn`: Dependencies (other steps that must complete first)

### Dependency Graph

```
install
├── lint
└── build
    └── test
        └── coverage
```

Steps with no dependencies (`install`) run first. Steps with dependencies wait for their dependencies to complete. `lint` and `build` run in parallel since they both only depend on `install`.

## Running the Workflow

### Manual Execution

```bash
# Validate workflow
gitvan workflow validate ci-pipeline

# Run workflow
gitvan workflow run ci-pipeline
```

Expected output:
```
→ Starting workflow: CI Pipeline
  ✓ Install Dependencies (2.3s)
  ✓ Run Linter (0.8s)
  ✓ Build Project (1.5s)
  ✓ Run Tests (3.2s)
  ✓ Code Coverage (1.1s)
→ Workflow completed successfully in 9.7s
```

### Automatic Execution

Start the daemon to trigger workflows automatically:

```bash
# Start daemon
gitvan daemon start

# Now make a commit
git add .
git commit -m "feat: add new feature"

# Workflow runs automatically
```

## Programmatic Usage

Create `run-ci.mjs`:

```javascript
import { withGitVan, useWorkflow } from 'gitvan';

const context = {
  repo: process.cwd(),
  config: {}
};

await withGitVan(context, async () => {
  const workflow = useWorkflow();

  console.log('Starting CI pipeline...');

  try {
    const result = await workflow.execute('ci-pipeline', {
      variables: {
        NODE_ENV: 'test'
      }
    });

    if (result.status === 'success') {
      console.log('✓ CI pipeline passed!');
      console.log(`Duration: ${result.duration}ms`);

      // Show step results
      result.steps.forEach(step => {
        console.log(`  ${step.name}: ${step.status} (${step.duration}ms)`);
      });
    } else {
      console.error('✗ CI pipeline failed!');
      console.error(`Error: ${result.error?.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to execute workflow:', error);
    process.exit(1);
  }
});
```

Run it:
```bash
node run-ci.mjs
```

## Customization

### Add Environment Variables

```turtle
step:build a :ScriptStep ;
  :name "Build Project" ;
  :script "npm run build" ;
  :env [
    :key "NODE_ENV" ;
    :value "production"
  ] ;
  :dependsOn step:install .
```

### Add Timeout

```turtle
step:test a :TestStep ;
  :name "Run Tests" ;
  :script "npm test" ;
  :timeout 300000 ;  # 5 minutes
  :dependsOn step:build .
```

### Conditional Execution

```turtle
step:deploy a :ScriptStep ;
  :name "Deploy" ;
  :script "npm run deploy" ;
  :condition [
    :branch "main" ;
    :event "git:push"
  ] ;
  :dependsOn step:test .
```

### Retry on Failure

```turtle
step:test a :TestStep ;
  :name "Run Tests" ;
  :script "npm test" ;
  :retry [
    :times 3 ;
    :delay 1000
  ] ;
  :dependsOn step:build .
```

## Monitoring

### View Workflow Status

```bash
# Check running workflows
gitvan workflow status

# View logs
gitvan daemon logs --follow
```

### Audit Trail

```bash
# Show recent workflow executions
gitvan audit show --action workflow:execute --limit 10

# Verify audit trail
gitvan audit verify
```

## Integration with Git Hooks

Create `.git/hooks/pre-push`:

```bash
#!/bin/bash

# Run CI pipeline before push
gitvan workflow run ci-pipeline

if [ $? -ne 0 ]; then
  echo "CI pipeline failed. Push aborted."
  exit 1
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-push
```

Now the CI pipeline runs before every push.

## Next Steps

- [Example 2: Git Integration](./02-git-integration.md)
- [Example 3: Template Usage](./03-template-usage.md)
- [Example 4: Job Scheduling](./04-job-scheduling.md)
- [Example 5: Error Handling](./05-error-handling.md)

## Complete Example

Full working example in: `examples/basic-workflow/`

```bash
cd examples/basic-workflow
npm install
gitvan workflow run ci-pipeline
```

---

**Key Takeaways:**

1. Workflows are defined in Turtle (.ttl) format
2. Steps have dependencies that create a DAG
3. Parallel execution happens automatically
4. Workflows can be triggered manually or automatically
5. All executions are recorded in audit trail
