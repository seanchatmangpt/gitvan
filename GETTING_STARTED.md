# Getting Started with GitVan v4.0.0

Get up and running with GitVan in 10 minutes.

## What is GitVan?

GitVan is a Git-native workflow automation platform that brings Git into your workflow system. Define workflows in `.ttl` files, trigger them on Git events, and track performance automatically.

**Key Features**:
- Git-native workflows (version-controlled with your code)
- Automatic triggers on commit/push/merge
- Built-in performance tracking
- Queryable workflows with SPARQL
- Job scheduling with cron
- Audit trails in Git notes

## Installation

### Prerequisites

- **Node.js 18+** (check: `node --version`)
- **Git** (check: `git --version`)
- **npm** or **pnpm**

### Install GitVan

```bash
# Global installation (recommended)
npm install -g gitvan

# Or local installation
npm install gitvan

# Or with pnpm
pnpm add -g gitvan
```

### Verify Installation

```bash
gitvan --version
# Should output: 4.0.0

gitvan --help
# Shows all available commands
```

## Your First Workflow (5 minutes)

### 1. Initialize GitVan

```bash
# Navigate to your Git repository
cd /path/to/your/repo

# Initialize GitVan
gitvan workflow init
```

This creates:
- `.gitvan/` directory
- `.gitvan/workflows/` for workflow definitions
- `.gitvan/config.yaml` for configuration

### 2. Create a Simple Workflow

Create `.gitvan/workflows/hello.ttl`:

```bash
cat > .gitvan/workflows/hello.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:HelloWorld a gh:Hook ;
  rdfs:label "Hello World" ;
  op:hasPipeline [
    op:hasStep [
      a op:CLIStep ;
      rdfs:label "Say Hello" ;
      op:command "echo Hello, GitVan!" ;
      op:timeout 5000
    ]
  ] .
EOF
```

### 3. List Workflows

```bash
gitvan workflow list
```

Output:
```
Available workflows:
  - HelloWorld: Hello World
```

### 4. Run Your Workflow

```bash
gitvan workflow run HelloWorld
```

Output:
```
Running workflow: HelloWorld
Step: Say Hello
Hello, GitVan!
✓ Workflow completed successfully (25ms)
```

Congratulations! You've created and run your first GitVan workflow.

## Multi-Step Workflow (10 minutes)

Let's create a more realistic workflow that runs tests and builds your project.

### 1. Create Build Workflow

Create `.gitvan/workflows/build.ttl`:

```turtle
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:BuildPipeline a gh:Hook ;
  rdfs:label "Build Pipeline" ;
  op:hasPipeline [
    op:hasStep gh:install ;
    op:hasStep gh:lint ;
    op:hasStep gh:test ;
    op:hasStep gh:build
  ] .

gh:install a op:CLIStep ;
  rdfs:label "Install dependencies" ;
  op:command "npm install" ;
  op:timeout 120000 .

gh:lint a op:CLIStep ;
  rdfs:label "Lint code" ;
  op:command "npm run lint" ;
  op:timeout 30000 ;
  op:dependsOn gh:install .

gh:test a op:CLIStep ;
  rdfs:label "Run tests" ;
  op:command "npm test" ;
  op:timeout 300000 ;
  op:dependsOn gh:install .

gh:build a op:CLIStep ;
  rdfs:label "Build project" ;
  op:command "npm run build" ;
  op:timeout 180000 ;
  op:dependsOn gh:lint, gh:test .
```

### 2. Run Build Workflow

```bash
gitvan workflow run BuildPipeline
```

Output:
```
Running workflow: BuildPipeline
Step: Install dependencies (running...)
✓ Install dependencies (2.3s)
Step: Lint code (running...)
Step: Run tests (running...)
✓ Lint code (1.2s)
✓ Run tests (5.4s)
Step: Build project (running...)
✓ Build project (3.1s)
✓ Workflow completed successfully (12.0s)
```

Notice how lint and test run in parallel (both depend only on install), but build waits for both to complete.

## Git Hooks Integration (5 minutes)

Make workflows run automatically on Git events.

### 1. Create Pre-Commit Hook

```bash
gitvan hook install pre-commit BuildPipeline
```

This installs a Git hook that runs `BuildPipeline` before every commit.

### 2. Test Pre-Commit Hook

```bash
# Make a change
echo "// test" >> README.md

# Try to commit
git add README.md
git commit -m "test commit"
```

Output:
```
Running pre-commit hook: BuildPipeline
Step: Install dependencies
✓ Install dependencies (0.5s - cached)
Step: Lint code
✓ Lint code (0.8s)
Step: Run tests
✓ Run tests (4.2s)
Step: Build project
✓ Build project (2.1s)
✓ Pre-commit hook passed
[main abc1234] test commit
```

### 3. List Installed Hooks

```bash
gitvan hook list
```

Output:
```
Installed Git hooks:
  - pre-commit: BuildPipeline
```

### 4. Uninstall Hook

```bash
gitvan hook uninstall pre-commit
```

## Job Scheduling (5 minutes)

Schedule recurring jobs with cron expressions.

### 1. Create a Job

Create `jobs/backup.mjs`:

```javascript
/**
 * @job
 * @name backup
 * @description Backup important data
 * @cron 0 2 * * *
 * @tags backup, maintenance
 */
export default async function backup(context) {
  console.log("Running backup...");

  // Your backup logic here
  // Example: copy files, upload to S3, etc.

  return {
    success: true,
    message: "Backup completed"
  };
}
```

### 2. List Jobs

```bash
gitvan job list
```

Output:
```
Available jobs:
  - backup: Backup important data
    Schedule: 0 2 * * * (daily at 2am)
    Tags: backup, maintenance
```

### 3. Run Job Manually

```bash
gitvan job run backup
```

Output:
```
Running job: backup
Running backup...
✓ Job completed successfully (125ms)
Result: { success: true, message: "Backup completed" }
```

### 4. Schedule Jobs

```bash
# Auto-schedule all jobs with @cron annotations
gitvan job schedule --auto

# Or schedule specific job
gitvan job schedule backup "0 2 * * *"
```

### 5. Start Scheduler

```bash
gitvan daemon start
```

The scheduler will now run jobs according to their cron schedules.

### 6. View Job Status

```bash
gitvan job status backup
```

Output:
```
Job: backup
Status: scheduled
Last run: 2026-01-09 02:00:00 UTC
Next run: 2026-01-10 02:00:00 UTC
Executions: 5 (5 successful, 0 failed)
```

## Templates (10 minutes)

Use Nunjucks templates for code generation and file scaffolding.

### 1. Create Template

Create `templates/component.njk`:

```nunjucks
/**
 * {{ name | pascalize }} Component
 * Generated by GitVan
 */

export class {{ name | pascalize }} {
  constructor() {
    this.name = "{{ name }}";
  }

  render() {
    return `<div class="{{ name | dasherize }}">
      {{ description }}
    </div>`;
  }
}
```

### 2. Use Template in Workflow

Create `.gitvan/workflows/generate.ttl`:

```turtle
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:GenerateComponent a gh:Hook ;
  rdfs:label "Generate Component" ;
  op:hasPipeline [
    op:hasStep [
      a op:TemplateStep ;
      rdfs:label "Generate component file" ;
      op:template "component.njk" ;
      op:output "src/components/{{ name }}.js" ;
      op:context [
        op:name "{{ params.name }}" ;
        op:description "{{ params.description }}"
      ]
    ]
  ] .
```

### 3. Use Template Programmatically

Create `jobs/generate-component.mjs`:

```javascript
/**
 * @job
 * @name generate-component
 * @description Generate new component
 */
import { withGitVan, useTemplate } from "gitvan";

export default async function generateComponent(context) {
  await withGitVan(context, async () => {
    const template = useTemplate();

    const result = await template.render("component.njk", {
      name: "UserProfile",
      description: "User profile component"
    });

    console.log(result);
  });

  return { success: true };
}
```

### 4. Run Template Job

```bash
gitvan job run generate-component
```

## Performance Monitoring (5 minutes)

GitVan automatically tracks workflow performance.

### 1. View Workflow Stats

```bash
gitvan workflow stats BuildPipeline
```

Output:
```
Workflow: BuildPipeline
Executions: 15
Success rate: 93.3% (14/15)

Performance:
  p50: 12.3s
  p95: 18.7s
  p99: 24.1s

Recent executions:
  2026-01-09 10:30:15  12.5s  ✓ success
  2026-01-09 09:15:42  13.1s  ✓ success
  2026-01-09 08:22:33  11.8s  ✓ success
```

### 2. View Workflow History

```bash
gitvan workflow history BuildPipeline --limit 5
```

Output:
```
Recent executions of BuildPipeline:

1. 2026-01-09 10:30:15 (12.5s) ✓
   Install: 2.3s, Lint: 1.2s, Test: 5.4s, Build: 3.6s

2. 2026-01-09 09:15:42 (13.1s) ✓
   Install: 2.1s, Lint: 1.4s, Test: 5.8s, Build: 3.8s

3. 2026-01-09 08:22:33 (11.8s) ✓
   Install: 1.9s, Lint: 1.1s, Test: 5.2s, Build: 3.6s
```

### 3. Set SLO Targets

Add SLO to workflow definition:

```turtle
gh:BuildPipeline a gh:Hook ;
  rdfs:label "Build Pipeline" ;
  perf:sloTarget 15000 ;    # Target: 15 seconds
  perf:sloP99 20000 ;       # P99 should be under 20s
  op:hasPipeline [ ... ] .
```

### 4. View SLO Compliance

```bash
gitvan workflow stats BuildPipeline --slo
```

Output:
```
SLO Compliance:
  Target: 15.0s
  Current p50: 12.3s ✓ (82% of target)
  Current p99: 24.1s ✗ (exceeds 20.0s limit)

Recommendation: Optimize slowest steps (test, build)
```

## Configuration (5 minutes)

Customize GitVan behavior.

### 1. Create Configuration File

Create `gitvan.config.js` in your repo root:

```javascript
export default {
  // Job configuration
  jobs: {
    dir: "jobs",        // Job directory
    timeout: 300000,    // Default timeout (5 min)
  },

  // Template configuration
  templates: {
    dirs: ["templates"],  // Template directories
    autoescape: false,    // Nunjucks autoescape
    globals: {            // Global variables
      projectName: "My Project",
      version: "1.0.0"
    }
  },

  // Receipt/audit configuration
  receipts: {
    ref: "refs/notes/gitvan/audit",  // Git notes ref
    enabled: true
  },

  // Security policy
  policy: {
    requireSignedCommits: true,  // Enforce GPG
    allowedCommands: []          // Whitelist commands
  },

  // Graph configuration
  graph: {
    dir: "graph",         // Graph storage
    autoLoad: true        // Auto-load ontologies
  }
}
```

### 2. Environment Variables

Create `.env`:

```bash
# GitVan configuration
GITVAN_HOME=/path/to/gitvan
GITVAN_REPO=/path/to/repo

# Deterministic behavior
TZ=UTC
LANG=C

# AI provider
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-key-here

# Environment
NODE_ENV=production
```

## Next Steps

### Learn More

- **[API Reference](API_REFERENCE.md)** - Complete API documentation
- **[Migration Guide](MIGRATION_GUIDE.md)** - Upgrade from v2.1.1
- **[Examples](examples/)** - Real-world examples
- **[CLAUDE.md](CLAUDE.md)** - Developer guide for AI assistants

### Advanced Topics

- **SPARQL Queries** - Query your workflows with SPARQL
- **RDF Graphs** - Work with semantic graphs
- **Pack System** - Create and share workflow packs
- **AI Integration** - Use Anthropic/Ollama for smart workflows
- **Distributed Locking** - Coordinate multi-instance workflows
- **Audit Trails** - Track all workflow changes

### Community

- **GitHub**: [github.com/seanchatmangpt/gitvan](https://github.com/seanchatmangpt/gitvan)
- **Issues**: [github.com/seanchatmangpt/gitvan/issues](https://github.com/seanchatmangpt/gitvan/issues)
- **Discussions**: [github.com/seanchatmangpt/gitvan/discussions](https://github.com/seanchatmangpt/gitvan/discussions)

## Common Tasks Reference

| Task | Command |
|------|---------|
| Initialize | `gitvan workflow init` |
| List workflows | `gitvan workflow list` |
| Run workflow | `gitvan workflow run <name>` |
| Install Git hook | `gitvan hook install <type> <workflow>` |
| List jobs | `gitvan job list` |
| Run job | `gitvan job run <name>` |
| Schedule job | `gitvan job schedule <name> <cron>` |
| Start daemon | `gitvan daemon start` |
| View stats | `gitvan workflow stats <name>` |
| View history | `gitvan workflow history <name>` |

## Troubleshooting

### Command Not Found

```bash
# If gitvan command not found after global install
npm install -g gitvan

# Or use npx
npx gitvan --version
```

### Workflow Not Found

```bash
# Check workflow exists
ls .gitvan/workflows/

# List available workflows
gitvan workflow list

# Validate workflow syntax
gitvan workflow validate <name>
```

### Job Fails

```bash
# Run with verbose output
gitvan job run <name> --verbose

# Check job logs
gitvan job history <name>

# Validate job
gitvan job validate <name>
```

### Git Hook Not Running

```bash
# Check hook is installed
gitvan hook list

# Reinstall hook
gitvan hook uninstall pre-commit
gitvan hook install pre-commit <workflow>

# Check .git/hooks/ directory
ls -la .git/hooks/
```

## Getting Help

- Run `gitvan --help` for CLI help
- Run `gitvan <command> --help` for command-specific help
- Check [API Reference](API_REFERENCE.md) for detailed documentation
- Open an issue on [GitHub](https://github.com/seanchatmangpt/gitvan/issues)

---

**Last Updated**: 2026-01-09
**Version**: 4.0.0
**License**: MIT
