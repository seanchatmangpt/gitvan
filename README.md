# GitVan v2.2.0

**The Git-Native Development Automation Platform with Knowledge-Driven Workflows**

GitVan transforms Git into a runtime environment for development automation. Define intelligent workflows, schedule tasks, and automate your entire development lifecycle using a unified, knowledge-driven system.

- **[Documentation](#documentation)** · **[Quick Links](#quick-links)** · **[GitHub](https://github.com/seanchatmangpt/gitvan)** · **[NPM](https://www.npmjs.com/package/gitvan)**

---

## Quick Links

- **New Users**: Start with [Getting Started Tutorial](#getting-started-tutorial)
- **Browse Guides**: See [How-to Guides](#how-to-guides)
- **API Docs**: Check [Reference Section](#reference)
- **Concepts**: Read [Explanations](#explanations)

---

## What's New in v2.2.0

### Latest Improvements
- **Enhanced Workflow Engine**: Better dependency management and error handling
- **OpenTelemetry Integration**: Full observability and distributed tracing
- **Performance Optimizations**: Faster execution and reduced memory footprint
- **Extended Pack Ecosystem**: New packs for dashboards and CMS applications
- **Improved CLI**: Better error messages and command structure

---

# Tutorials

*Learn GitVan by doing. These step-by-step guides will help you get started quickly.*

## Getting Started Tutorial

In this tutorial, you'll install GitVan, initialize a project, and run your first automated workflow.

### Prerequisites
- Node.js 18+
- Git 2.30+
- A code editor (VS Code, vim, etc.)

### Step 1: Install GitVan

Install GitVan globally so you can use it in any project:

```bash
npm install -g gitvan@2.2.0
```

Or locally in your project:

```bash
npm install gitvan@2.2.0
```

Verify the installation:

```bash
gitvan --version
```

### Step 2: Initialize Your Project

Create a new directory for your project:

```bash
mkdir my-gitvan-project
cd my-gitvan-project
```

Initialize GitVan:

```bash
# Initialize with default settings
gitvan init

# Or with custom options
gitvan init --name "my-project" --description "My GitVan automation project"
```

This creates:
- `.gitvan/` - Configuration directory
- `hooks/` - Hook definitions
- `workflows/` - Workflow definitions
- `.gitignore` entries for GitVan directories

### Step 3: Configure Git (If Not Already Done)

GitVan uses Git to store state and automation data. Configure your Git identity:

```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

### Step 4: Complete Setup

Run the setup command to finalize configuration:

```bash
gitvan setup
```

This creates necessary Git hooks and initializes the automation system.

### Step 5: Verify Your Setup

Check that everything is working:

```bash
# List available hooks
gitvan hooks list

# List available workflows
gitvan workflow list

# Evaluate all hooks (runs all registered hooks)
gitvan hooks evaluate
```

**Congratulations!** You now have a GitVan project initialized and ready to use.

---

## Creating Your First Workflow

In this tutorial, you'll create a simple workflow that processes data and generates a report.

### What You'll Build

A workflow that:
1. Queries your project data
2. Processes the results
3. Generates a markdown report
4. Saves it to a file

### Step 1: Create a Workflow File

Create a new file `workflows/first-workflow.js`:

```javascript
export default {
  hooks: [{
    id: "my-first-workflow",
    title: "First Workflow",
    pipelines: ["main-pipeline"]
  }],

  pipelines: [{
    id: "main-pipeline",
    steps: ["fetch-data", "generate-report"]
  }],

  steps: [
    {
      id: "fetch-data",
      type: "cli",
      config: {
        command: "echo 'Getting project data...'"
      }
    },
    {
      id: "generate-report",
      type: "template",
      config: {
        template: `# Project Report\n\nGenerated at: {{ 'now' | date('YYYY-MM-DD HH:mm') }}\n\nThis is your first automated report!`,
        outputPath: "reports/first-report.md"
      },
      dependsOn: ["fetch-data"]
    }
  ]
};
```

### Step 2: Execute the Workflow

Run your workflow:

```bash
gitvan workflow run my-first-workflow
```

You should see:
- Workflow execution starting
- Each step completing in order
- Output file created at `reports/first-report.md`

### Step 3: Check the Results

View the generated report:

```bash
cat reports/first-report.md
```

You should see something like:

```
# Project Report

Generated at: 2024-01-15 14:30

This is your first automated report!
```

**What You Learned:**
- Creating workflow definitions
- Defining workflow steps
- Setting up step dependencies
- Using template rendering
- Running workflows

---

## Creating Your First Hook

In this tutorial, you'll create a hook that automatically runs whenever Git detects changes.

### What You'll Build

A hook that monitors for new commits and logs them to a file.

### Step 1: Create a Hook File

Create `hooks/monitor-commits.turtle`:

```turtle
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix ex: <http://example.org/> .

ex:monitor-commits rdf:type gh:Hook ;
    rdfs:label "Monitor Commits" ;
    gh:predicate ex:has-new-commits-predicate ;
    gh:action ex:log-commit-action .

ex:has-new-commits-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?commit ?author ?message WHERE {
            ?commit rdf:type gv:Commit ;
            gv:author ?author ;
            gv:message ?message .
        }
    """ .
```

### Step 2: Register the Hook

Hooks are automatically discovered. List your hooks:

```bash
gitvan hooks list
```

You should see "monitor-commits" in the list.

### Step 3: Make a Commit

Create a test commit:

```bash
git add .
git commit -m "Test commit for hook monitoring"
```

### Step 4: Evaluate Hooks

Run hook evaluation to see if your hook triggers:

```bash
gitvan hooks evaluate
```

The hook will check if there are new commits and can trigger configured actions.

**What You Learned:**
- Creating hook definitions in Turtle format
- Understanding predicates (ResultDelta)
- How hooks detect changes
- Registering and evaluating hooks

---

## Building a Dashboard Pack

In this tutorial, you'll create a modern dashboard using GitVan's Next.js pack system.

### Prerequisites

- Docker and Docker Compose installed
- Basic familiarity with React (optional)

### Step 1: Install the Dashboard Pack

```bash
gitvan pack install nextjs-dashboard-pack
```

### Step 2: Generate a Dashboard Project

```bash
gitvan run create-dashboard-project --name "my-dashboard"
```

This creates:
- A Next.js 15 project with React 19
- TypeScript configuration
- shadcn/ui components
- deck.gl for data visualization
- Docker Compose setup

### Step 3: Start Development

Navigate to your dashboard project:

```bash
cd my-dashboard
```

Start the development environment:

```bash
docker-compose up --build
```

Wait for the container to start, then open http://localhost:3000

### Step 4: Explore the Dashboard

You'll see:
- Pre-built dashboard layout with charts
- Real-time data streaming example
- Interactive components with shadcn/ui
- Live reloading when you make changes

### Step 5: Customize Your Dashboard

Edit `app/page.tsx` to customize the dashboard. Changes will hot-reload automatically.

Example: Add a new metric card:

```typescript
<Card>
  <CardHeader>
    <CardTitle>Custom Metric</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Your custom data here</p>
  </CardContent>
</Card>
```

**What You Learned:**
- Installing and using packs
- Creating a Next.js dashboard
- Working with Docker Compose
- Using shadcn/ui components
- Hot reloading in development

---

# How-to Guides

*Practical guides for common tasks and workflows.*

## How to Install and Set Up GitVan

### Installation Options

**Global Installation** (recommended for general use):
```bash
npm install -g gitvan@2.2.0
gitvan --version
```

**Local Installation** (recommended for projects):
```bash
npm install gitvan@2.2.0
npx gitvan --version
```

**Docker** (for isolated environments):
```bash
docker run --rm -v $(pwd):/workspace gitvan-cleanroom gitvan --version
```

### Initial Setup

In your project directory:

```bash
# Initialize project
gitvan init --name "my-project"

# Configure Git
git config user.name "Your Name"
git config user.email "your@email.com"

# Complete setup
gitvan setup
```

### Verify Installation

```bash
# Check version
gitvan --version

# List available commands
gitvan --help

# Verify hooks are installed
gitvan hooks list
```

---

## How to Create Custom Workflows

### Workflow Structure

A workflow consists of:
- **Hooks**: Entry points that define when workflows run
- **Pipelines**: Sequences of steps
- **Steps**: Individual operations (SPARQL, template, file, HTTP, CLI)

### Creating a Workflow File

Create `workflows/my-workflow.js`:

```javascript
export default {
  hooks: [{
    id: "my-workflow-id",
    title: "My Workflow Title",
    description: "What this workflow does",
    pipelines: ["main"]
  }],

  pipelines: [{
    id: "main",
    steps: ["step-1", "step-2", "step-3"]
  }],

  steps: [
    {
      id: "step-1",
      type: "cli",
      config: {
        command: "echo 'First step'"
      }
    },
    {
      id: "step-2",
      type: "template",
      config: {
        template: "Processed data: {{ data }}",
        outputPath: "output.md"
      },
      dependsOn: ["step-1"]
    },
    {
      id: "step-3",
      type: "file",
      config: {
        filePath: "result.json",
        operation: "write",
        content: '{"status": "complete"}'
      },
      dependsOn: ["step-2"]
    }
  ]
};
```

### Running Workflows

```bash
# Run a workflow
gitvan workflow run my-workflow-id

# Validate before running
gitvan workflow validate my-workflow-id

# View execution history
gitvan workflow history

# See execution details
gitvan workflow logs <execution-id>
```

### Common Workflow Patterns

**Sequential Execution**:
```javascript
steps: [
  { id: "step-1", type: "cli", config: {...} },
  { id: "step-2", type: "cli", config: {...}, dependsOn: ["step-1"] }
]
```

**Parallel Execution**:
```javascript
steps: [
  { id: "step-1", type: "cli", config: {...} },
  { id: "step-2", type: "cli", config: {...} },  // No dependsOn
  { id: "step-3", type: "cli", config: {...}, dependsOn: ["step-1", "step-2"] }
]
```

**Conditional Templates**:
```javascript
{
  id: "conditional-step",
  type: "template",
  config: {
    template: `
{% if success %}
## Success Report
All steps completed successfully!
{% else %}
## Error Report
Some steps failed.
{% endif %}
    `,
    outputPath: "report.md"
  }
}
```

---

## How to Define Custom Hooks

### Hook Types

GitVan supports four types of predicates:

#### ResultDelta Predicates
Detect changes in your knowledge graph state:

```turtle
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:version-change rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?project ?version WHERE {
            ?project rdf:type gv:Project ;
            gv:version ?version .
        }
    """ .
```

#### ASK Predicates
Simple boolean conditions:

```turtle
ex:has-open-issues rdf:type gh:ASK ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?issue rdf:type gv:Issue ;
            gv:status "open" .
        }
    """ .
```

#### SELECTThreshold Predicates
Monitor metrics and thresholds:

```turtle
ex:high-bug-count rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?bug) AS ?count) WHERE {
            ?bug rdf:type gv:Bug ;
            gv:status "open" .
        }
    """ ;
    gh:threshold "10" ;
    gh:operator ">" .
```

#### SHACL Validation Predicates
Shape-based validation:

```turtle
ex:validate-projects rdf:type gh:SHACLAllConform ;
    gh:shapesText """
        PREFIX sh: <http://www.w3.org/ns/shacl#>
        ex:ProjectShape
            sh:targetClass gv:Project ;
            sh:property [
                sh:path gv:name ;
                sh:minCount 1 ;
            ] .
    """ .
```

### Creating a Complete Hook

Create `hooks/quality-gate.turtle`:

```turtle
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix ex: <http://example.org/> .

ex:quality-gate rdf:type gh:Hook ;
    rdfs:label "Quality Gate" ;
    gh:predicate ex:test-coverage-check ;
    gh:predicate ex:lint-check ;
    gh:action ex:notify-team .

ex:test-coverage-check rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (AVG(?coverage) AS ?avgCoverage) WHERE {
            ?file rdf:type gv:SourceFile ;
            gv:testCoverage ?coverage .
        }
    """ ;
    gh:threshold "80" ;
    gh:operator "<" .

ex:lint-check rdf:type gh:ASK ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?error rdf:type gv:LintError ;
            gv:severity "error" .
        }
    """ .
```

---

## How to Develop Locally

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/seanchatmangpt/gitvan.git
cd gitvan

# Install dependencies
pnpm install
```

### Build and Test

```bash
# Build the project
pnpm run build

# Run tests
pnpm test

# Run specific test suite
pnpm test tests/workflows/

# Run with coverage
pnpm test --coverage

# Watch mode for development
pnpm test:watch
```

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Run tests to ensure everything works
4. Commit your changes
5. Push to your fork
6. Create a pull request

### Testing Specific Components

```bash
# Test hooks
pnpm test:hooks

# Test workflows
pnpm test:workflows

# Test packs
pnpm test tests/pack/

# Test composables
pnpm test tests/composables/
```

### Docker Development

```bash
# Build Docker image
docker build -t gitvan-dev .

# Run in container
docker run --rm -v $(pwd):/workspace gitvan-dev pnpm test
```

---

## How to Run and Debug Tests

### Running Tests

```bash
# All tests
pnpm test

# Specific test file
pnpm test path/to/test.mjs

# With filter (by test name)
pnpm test --grep "hook parsing"

# Watch mode (reruns on file changes)
pnpm test:watch
```

### BDD Testing

```bash
# Run Behavior-Driven Development tests
pnpm test:bdd

# Run workflow BDD tests
pnpm test:workflow:bdd

# Run CLI BDD tests
pnpm test:citty:bdd
```

### Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# Opens coverage report in HTML
open coverage/index.html
```

### Debugging Tips

**Enable detailed logging**:
```bash
DEBUG=gitvan:* pnpm test
```

**Run single test**:
```bash
pnpm test path/to/specific.test.mjs
```

**Debug in VS Code**:
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Vitest",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

## How to Contribute

### Before You Start

1. Fork the repository
2. Clone your fork locally
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Install dependencies: `pnpm install`

### Code Standards

- **Linting**: `pnpm lint` (ESLint configured)
- **Formatting**: `pnpm lint:fix` (Prettier)
- **TypeScript**: Use TypeScript for all new features
- **Tests**: All new features must have tests

### Making Changes

```bash
# Make your changes
# Add tests for new functionality
# Run tests
pnpm test

# Fix any linting issues
pnpm lint:fix

# Commit with clear message
git commit -m "feat: describe your feature"

# Push to your fork
git push origin feature/my-feature
```

### Submitting a Pull Request

1. Push your branch to your fork
2. Open a pull request against the main branch
3. Fill in the PR description
4. Ensure all checks pass
5. Wait for review

### PR Guidelines

- **One feature per PR**: Keep PRs focused
- **Tests required**: All features need tests
- **Documentation**: Update docs if needed
- **Commit messages**: Use conventional commits (feat:, fix:, docs:, etc.)

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/seanchatmangpt/gitvan/issues)
- **Discussions**: [GitHub Discussions](https://github.com/seanchatmangpt/gitvan/discussions)
- **Documentation**: [docs.gitvan.dev](https://docs.gitvan.dev)

---

# Reference

*Complete technical specifications and API documentation.*

## CLI Commands

### Global Options
```bash
gitvan [command] [options]

--help, -h          Show help
--version, -v       Show version
--verbose           Enable verbose logging
--debug             Enable debug mode
```

### Core Commands

#### `gitvan init`
Initialize a new GitVan project.

```bash
gitvan init [options]

Options:
  --name <name>           Project name
  --description <desc>    Project description
  --template <template>   Project template
```

#### `gitvan setup`
Complete the GitVan setup process.

```bash
gitvan setup [options]

Options:
  --force    Force setup even if already configured
```

#### `gitvan hooks list`
List all available hooks.

```bash
gitvan hooks list [options]

Options:
  --json     Output as JSON
  --detailed Show detailed information
```

#### `gitvan hooks evaluate`
Evaluate all hooks to check if they should trigger.

```bash
gitvan hooks evaluate [options]

Options:
  --hook <id>   Evaluate specific hook
  --dry-run     Show what would happen
```

#### `gitvan workflow list`
List all available workflows.

```bash
gitvan workflow list [options]

Options:
  --json     Output as JSON
```

#### `gitvan workflow run <id>`
Execute a workflow.

```bash
gitvan workflow run <workflow-id> [options]

Options:
  --input <json>   Input parameters as JSON
  --timeout <ms>   Execution timeout in milliseconds
```

#### `gitvan workflow validate <id>`
Validate a workflow definition.

```bash
gitvan workflow validate <workflow-id>
```

#### `gitvan workflow history`
View workflow execution history.

```bash
gitvan workflow history [options]

Options:
  --limit <n>   Show last N executions
  --json        Output as JSON
```

#### `gitvan workflow logs <id>`
View detailed execution logs.

```bash
gitvan workflow logs <execution-id> [options]

Options:
  --step <id>   Show logs for specific step
```

#### `gitvan pack list`
List available packs.

```bash
gitvan pack list [options]

Options:
  --json       Output as JSON
  --installed  Show only installed packs
```

#### `gitvan pack install <pack>`
Install a pack.

```bash
gitvan pack install <pack-name> [options]

Options:
  --location <path>  Install location
  --force            Overwrite if exists
```

#### `gitvan daemon`
Start the GitVan daemon process.

```bash
gitvan daemon [options]

Options:
  --port <n>     Daemon port
  --log <file>   Log file path
```

---

## Workflow Step Types

### SPARQL Step
Execute SPARQL queries against your knowledge graph.

**Configuration**:
```javascript
{
  id: "sparql-example",
  type: "sparql",
  config: {
    query: `SELECT ?var WHERE { ... }`,
    outputMapping: '{"results": "results"}'
  }
}
```

**Returns**:
- `type`: Query type ("select", "ask", "construct")
- `results`: Array of query results
- `count`: Number of results
- `hasResults`: Boolean indicating if results exist
- `variables`: Query variables
- `queryMetadata`: Additional query info

**Example**:
```javascript
{
  id: "fetch-projects",
  type: "sparql",
  config: {
    query: `
      PREFIX gv: <https://gitvan.dev/ontology#>
      SELECT ?project ?status WHERE {
        ?project rdf:type gv:Project ;
        gv:status ?status .
      }
    `,
    outputMapping: '{"projects": "results"}'
  }
}
```

---

### Template Step
Generate content using Nunjucks templates.

**Configuration**:
```javascript
{
  id: "template-example",
  type: "template",
  config: {
    template: "# Report\n\n{{ content }}",
    outputPath: "output.md"
  },
  dependsOn: ["previous-step"]
}
```

**Returns**:
- `outputPath`: Path where content was written
- `content`: Generated content
- `contentLength`: Length of generated content
- `templateUsed`: Template type ("inline" or file path)

**Built-in Filters**:
- `date(format)`: Format date/time
- `capitalize`: Capitalize first letter
- `uppercase`: Convert to uppercase
- `lowercase`: Convert to lowercase
- `dump(indent)`: Convert to JSON
- `length`: Get string/array length

**Example**:
```javascript
{
  id: "generate-report",
  type: "template",
  config: {
    template: `
# Project Report
Generated: {{ now | date('YYYY-MM-DD') }}

## Summary
{{ summary }}

## Items
{% for item in items %}
- {{ item.name }}: {{ item.value }}
{% endfor %}
    `,
    outputPath: "reports/summary.md"
  },
  dependsOn: ["fetch-data"]
}
```

---

### File Step
Perform file system operations.

**Configuration**:
```javascript
{
  id: "file-example",
  type: "file",
  config: {
    filePath: "output.json",
    operation: "write",  // read, write, copy, move, delete
    content: '{"status": "complete"}'
  },
  dependsOn: ["previous-step"]
}
```

**Returns**:
- `operation`: Operation performed
- `filePath`: Path of the file
- `contentLength`: Length of content (for write)
- `rendered`: Whether content was template-rendered

**Supported Operations**:
- `read`: Read file contents
- `write`: Write or overwrite file
- `copy`: Copy from one path to another
- `move`: Move/rename file
- `delete`: Delete file

**Example**:
```javascript
{
  id: "save-results",
  type: "file",
  config: {
    filePath: "data/results.json",
    operation: "write",
    content: '{"projects": {{ projects | dump }}, "timestamp": "{{ now | date(\'YYYY-MM-DD\') }}"}'
  },
  dependsOn: ["process-data"]
}
```

---

### HTTP Step
Make HTTP requests to external APIs.

**Configuration**:
```javascript
{
  id: "http-example",
  type: "http",
  config: {
    url: "https://api.example.com/data",
    method: "GET",  // GET, POST, PUT, DELETE, PATCH
    headers: {
      "Authorization": "Bearer {{ token }}",
      "Content-Type": "application/json"
    },
    body: '{"query": "{{ search }}"}'
  }
}
```

**Returns**:
- `url`: Request URL
- `method`: HTTP method used
- `status`: HTTP status code
- `statusText`: HTTP status text
- `headers`: Response headers
- `responseData`: Parsed response body
- `success`: Boolean indicating success

**Example**:
```javascript
{
  id: "fetch-external-data",
  type: "http",
  config: {
    url: "https://api.github.com/repos/{{ owner }}/{{ repo }}/issues",
    method: "GET",
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": "token {{ githubToken }}"
    }
  }
}
```

---

### CLI Step
Execute command-line commands.

**Configuration**:
```javascript
{
  id: "cli-example",
  type: "cli",
  config: {
    command: "npm test",
    cwd: "/path/to/directory",     // Optional
    timeout: 30000,                 // Optional, in ms
    env: {                          // Optional
      "NODE_ENV": "production"
    }
  },
  dependsOn: ["previous-step"]
}
```

**Returns**:
- `command`: Command executed
- `cwd`: Working directory
- `stdout`: Standard output
- `stderr`: Standard error
- `exitCode`: Exit code (0 = success)
- `success`: Boolean indicating success

**Example**:
```javascript
{
  id: "run-tests",
  type: "cli",
  config: {
    command: "npm test -- --coverage",
    cwd: "/home/user/project",
    timeout: 60000,
    env: {
      "NODE_ENV": "test",
      "CI": "true"
    }
  }
}
```

---

## Hook Predicate Types

### ResultDelta
Detects changes in query results between evaluations.

**Use When**: You want to trigger actions when data in your knowledge graph changes.

**Configuration**:
```turtle
ex:predicate rdf:type gh:ResultDelta ;
    gh:queryText "SELECT ?var WHERE { ... }" .
```

**How It Works**:
1. Stores results from previous query execution
2. Runs query again
3. Compares old and new results
4. Triggers if results differ

**Example**:
```turtle
ex:project-version-change rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?project ?version WHERE {
            ?project rdf:type gv:Project ;
            gv:version ?version .
        }
    """ .
```

---

### ASK
Simple boolean SPARQL conditions.

**Use When**: You need a yes/no check of your knowledge graph.

**Configuration**:
```turtle
ex:predicate rdf:type gh:ASK ;
    gh:queryText "ASK WHERE { ... }" .
```

**Returns**: Boolean (true/false)

**Example**:
```turtle
ex:has-critical-bugs rdf:type gh:ASK ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?bug rdf:type gv:Bug ;
            gv:severity "critical" ;
            gv:status "open" .
        }
    """ .
```

---

### SELECTThreshold
Monitor metrics against thresholds.

**Use When**: You want to trigger based on metric values (e.g., CPU usage > 80%).

**Configuration**:
```turtle
ex:predicate rdf:type gh:SELECTThreshold ;
    gh:queryText "SELECT (COUNT(?x) AS ?count) WHERE { ... }" ;
    gh:threshold "100" ;
    gh:operator ">" .  // >, <, >=, <=, ==, !=
```

**Operators**:
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal
- `==` - Equal
- `!=` - Not equal

**Example**:
```turtle
ex:high-memory-usage rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (AVG(?usage) AS ?avgUsage) WHERE {
            ?metric rdf:type gv:MemoryMetric ;
            gv:value ?usage .
        }
    """ ;
    gh:threshold "80" ;
    gh:operator ">" .
```

---

### SHACLAllConform
Shape-based RDF validation using SHACL.

**Use When**: You need to validate that your knowledge graph conforms to a schema.

**Configuration**:
```turtle
ex:predicate rdf:type gh:SHACLAllConform ;
    gh:shapesText "PREFIX sh: <http://www.w3.org/ns/shacl#> ..." .
```

**Example**:
```turtle
ex:validate-projects rdf:type gh:SHACLAllConform ;
    gh:shapesText """
        PREFIX sh: <http://www.w3.org/ns/shacl#>
        PREFIX gv: <https://gitvan.dev/ontology#>

        gv:ProjectShape
            sh:targetClass gv:Project ;
            sh:property [
                sh:path gv:name ;
                sh:minCount 1 ;
                sh:maxCount 1 ;
                sh:datatype xsd:string ;
            ] ;
            sh:property [
                sh:path gv:version ;
                sh:minCount 1 ;
            ] .
    """ .
```

---

## Configuration Options

### Project Configuration

GitVan looks for configuration in `gitvan.config.js` or `gitvan.config.json`:

```javascript
// gitvan.config.js
export default {
  // Project metadata
  name: "my-project",
  description: "My GitVan project",
  version: "1.0.0",

  // Paths
  hooksDir: "./hooks",
  workflowsDir: "./workflows",
  packsDir: "./packs",

  // Git configuration
  git: {
    hooks: {
      preCommit: true,
      postCommit: true,
      postMerge: true
    }
  },

  // AI provider configuration
  ai: {
    provider: "ollama",
    model: "mistral",
    baseURL: "http://localhost:11434"
  },

  // Workflow execution settings
  workflows: {
    timeout: 300000,      // 5 minutes default
    retries: 3,
    retryDelay: 1000
  },

  // Hook evaluation
  hooks: {
    autoEvaluate: true,
    evaluateInterval: 60000  // 1 minute
  },

  // Logging
  logging: {
    level: "info",        // debug, info, warn, error
    format: "json"        // json, text
  }
};
```

---

## Environment Variables

```bash
# AI Configuration
GITVAN_AI_PROVIDER=ollama
GITVAN_OLLAMA_BASE_URL=http://localhost:11434
GITVAN_MODEL=mistral

# Git Configuration
GIT_AUTHOR_NAME="Your Name"
GIT_AUTHOR_EMAIL="your@email.com"

# Logging
GITVAN_LOG_LEVEL=info
GITVAN_DEBUG=false

# Workflow Settings
GITVAN_WORKFLOW_TIMEOUT=300000
GITVAN_WORKFLOW_RETRIES=3
```

---

# Explanations

*Conceptual understanding of GitVan and its architecture.*

## What is Git-Native Automation?

### The Traditional Approach

In traditional CI/CD and automation systems, automation logic lives separately from your code:
- CI configs in `.github/workflows/` or `.gitlab-ci.yml`
- Build scripts in separate repositories
- Infrastructure code in different systems
- State stored in external databases

This separation creates problems:
- **Fragmentation**: Your automation logic is scattered
- **Synchronization**: Keeping automation in sync with code is manual
- **Learning Curve**: Different tools for different tasks
- **Coupling**: Tight integration with specific platforms

### Git-Native Approach

GitVan treats **Git itself as the automation runtime**:
- Automation logic lives in your repository with your code
- Git hooks provide the execution environment
- Knowledge graphs store automation state
- Everything is version-controlled and auditable

**Key Principles**:

1. **Co-location**: Automation code lives with your project code
2. **Versioning**: Automation history is Git history
3. **Atomic Operations**: Git commits are atomic automation units
4. **Distributed**: Works offline like Git works offline
5. **Intelligent**: Uses semantic knowledge graphs for smart decisions

### Why Git-Native?

**Version Control**: Automation changes are committed like code changes
```bash
git log --oneline     # See automation history
git diff HEAD~1       # See what changed in automation
git revert abc1234    # Undo a workflow change
```

**Collaboration**: Branches work for automation too
```bash
git checkout -b feature/new-automation
# Make changes to workflows and hooks
git push origin feature/new-automation
# Create PR for review
```

**Audit Trail**: Every automation execution is trackable
```bash
git log --grep="workflow:"    # Find automation runs
git show abc1234              # See exact automation state
```

---

## Understanding the Knowledge Hook Engine

### The Problem It Solves

Traditional hooks are reactive and dumb:
```bash
#!/bin/bash
# Simple pre-commit hook
npm test
```

Issues:
- Only checks file changes, not semantic meaning
- Can't understand project context
- No cross-system awareness
- Limited decision-making capability

### The Solution: Knowledge-Driven Hooks

Knowledge Hooks combine:
1. **Hooks as Signal**: Git hooks detect when something changed
2. **SPARQL as Logic**: Complex queries determine if action is needed
3. **Knowledge Graph as Context**: Semantic data about your project

### How It Works

```
Git Event (commit)
  ↓
Hook Triggers
  ↓
Predicate Evaluates (SPARQL query)
  ↓
Knowledge Graph Queried
  ↓
Result Checked Against Threshold/Pattern
  ↓
Action Executed (if condition met)
```

### Practical Example

**Traditional Approach**:
```bash
#!/bin/bash
# Prevent commits that break tests
npm test || exit 1
```

**Knowledge Hook Approach**:
```turtle
ex:prevent-breaking-changes rdf:type gh:Hook ;
    gh:predicate ex:check-test-coverage .

ex:check-test-coverage rdf:type gh:SELECTThreshold ;
    gh:queryText """
        SELECT (AVG(?coverage) as ?avg) WHERE {
            ?file rdf:type gv:TestFile ;
            gv:coverage ?coverage .
        }
    """ ;
    gh:threshold "80" ;
    gh:operator "<" .
```

**Benefits**:
- Understands context (which files changed, their test coverage)
- Can make smart decisions (only block if coverage drops below threshold)
- Integrates with knowledge graph (knows about all files and their metrics)
- Reusable (same logic used by other hooks)

---

## Understanding the Workflow Engine

### Sequential vs. Parallel Execution

**Sequential**: Each step waits for previous to complete
```javascript
steps: [
  { id: "step-1", type: "cli", ... },
  { id: "step-2", type: "cli", ..., dependsOn: ["step-1"] },
  { id: "step-3", type: "cli", ..., dependsOn: ["step-2"] }
]
```

**Parallel with Synchronization**:
```javascript
steps: [
  { id: "step-1", type: "cli", ... },
  { id: "step-2", type: "cli", ... },           // Runs in parallel with step-1
  { id: "step-3", type: "cli", ..., dependsOn: ["step-1", "step-2"] }  // Waits for both
]
```

### Context Passing

Each step can access outputs from previous steps:

```javascript
// Step 1: Fetch data
{
  id: "fetch",
  type: "sparql",
  config: { query: "SELECT ?item WHERE ..." }
  // Returns: { results: [...], count: 5 }
}

// Step 2: Use data from step 1
{
  id: "process",
  type: "template",
  config: {
    template: "Processed {{ count }} items",
    // Automatically has access to results from step 1
  },
  dependsOn: ["fetch"]
}
```

### Error Handling

Workflows handle errors gracefully:

```javascript
{
  id: "risky-step",
  type: "http",
  config: {
    url: "https://api.example.com/data",
    errorHandler: (error) => {
      console.error("API call failed:", error.message);
      return { fallback: true, message: "Using cached data" };
    }
  }
}
```

---

## Understanding the Pack System

### What are Packs?

Packs are **project templates** that you can install and customize:

```
Pack = Boilerplate + Configuration + Automation
```

### Built-in Packs

**nextjs-dashboard-pack**
- Complete Next.js 15 dashboard
- shadcn/ui components
- deck.gl visualizations
- Docker Compose setup
- Hot reloading

**nextjs-cms-pack**
- MDX-based content management
- React components in markdown
- GitHub Pages deployment
- Static site generation

**nodejs-basic**
- Simple Node.js starter
- npm scripts set up
- Basic testing configured

### Using Packs

```bash
# List available packs
gitvan pack list

# Install a pack
gitvan pack install nextjs-dashboard-pack

# Generate project from pack
gitvan run create-dashboard-project --name "my-dashboard"

# Customize and deploy
cd my-dashboard
docker-compose up
```

### Creating Custom Packs

Packs are in `packs/` directory with structure:

```
my-pack/
├── template/           # Project template files
│   ├── package.json
│   ├── src/
│   └── ...
├── pack.config.js      # Pack configuration
├── hook.turtle         # Automation hooks
└── README.md           # Pack documentation
```

---

## Architecture Overview

### Component Interaction

```
User Commands (CLI)
  ↓
Command Handlers
  ↓
Workflow Engine ← → Knowledge Hook Engine
  ↓                 ↓
Composables        SPARQL Predicates
  ↓                 ↓
Git Operations     Knowledge Graph (RDF)
```

### Data Flow

```
Source Code
  ↓ (Git hooks trigger)
Hooks Evaluation
  ↓ (SPARQL queries)
Knowledge Graph
  ↓ (Results trigger workflows)
Workflow Execution
  ↓ (Steps run in dependency order)
Output (files, reports, API calls)
  ↓ (Results stored in knowledge graph)
Knowledge Graph Updated
```

### Storage

- **Code & Automation**: Your repository (Git)
- **Automation State**: Git commits and objects
- **Knowledge Graph**: RDF store (Turtle format)
- **Execution History**: Git log and custom receipts
- **Configuration**: `gitvan.config.js` files

---

## When to Use What Feature

### Use Workflows When...

- You have **multi-step processes** that need orchestration
- You need **branching logic** (if this then that)
- You want **clear dependency management** between steps
- You need **context passing** between operations
- You're doing **data processing pipelines**

Example: ETL (Extract, Transform, Load)
```javascript
workflow: [extract data, transform, load, notify]
```

### Use Hooks When...

- You want **automatic reactions to changes**
- You need **continuous monitoring** of metrics
- You want to **enforce policies** (quality gates)
- You need **smart conditions** (not just "did X happen")
- You want **always-on** automation

Example: Continuous Code Quality
```turtle
hook: detect low test coverage → run full test suite
```

### Use Packs When...

- You want to **scaffold new projects quickly**
- You need **consistent project structure**
- You want **pre-configured tools** ready to go
- You need **shared templates** across teams
- You want **production-ready** starting points

Example: New dashboard project
```bash
gitvan pack install nextjs-dashboard-pack
gitvan run create-dashboard-project --name my-app
```

### Combined Approach

The real power comes from **combining all three**:

```
Pack (Create project structure)
  ↓
Hooks (Monitor project health)
  ↓
Workflows (Automate common tasks)
```

Example:
1. Install nextjs-dashboard-pack (scaffold)
2. Add hooks to monitor test coverage (continuous)
3. Create workflow for CI/CD pipeline (orchestration)

---

## Best Practices

### Workflow Design

**✅ DO**:
- Keep steps focused and single-purpose
- Use descriptive step IDs
- Document complex template logic
- Add error handling to critical steps
- Test workflows before deployment

**❌ DON'T**:
- Make workflows too long (break into multiple)
- Hardcode values (use template variables)
- Ignore error cases
- Skip documentation
- Run untested workflows in production

### Hook Design

**✅ DO**:
- Use specific predicates (ASK for yes/no, SELECTThreshold for metrics)
- Document what your hook detects
- Test hook predicates before deploying
- Use meaningful hook IDs
- Keep predicates readable

**❌ DON'T**:
- Use overly complex SPARQL queries
- Make hooks trigger too frequently
- Forget to update knowledge graph state
- Ignore performance implications
- Create circular dependencies between hooks

### Pack Development

**✅ DO**:
- Provide clear README with examples
- Include example workflows and hooks
- Test pack scaffolding thoroughly
- Document configuration options
- Version your packs

**❌ DON'T**:
- Include unnecessary dependencies
- Assume specific directory structure
- Skip documentation
- Hard-code paths
- Create breaking changes without versioning

---

## Troubleshooting

### Workflows Not Running

```bash
# Check workflow syntax
gitvan workflow validate my-workflow

# Check step dependencies
gitvan workflow logs <execution-id>

# Run with debug logging
DEBUG=gitvan:* gitvan workflow run my-workflow
```

### Hooks Not Triggering

```bash
# Verify hook definition
gitvan hooks list

# Check predicate evaluation
gitvan hooks evaluate --hook my-hook

# View knowledge graph state
gitvan graph query "SELECT * WHERE { ... }"
```

### Performance Issues

```bash
# Profile workflow execution
gitvan workflow run my-workflow --profile

# Check step timing
gitvan workflow logs <execution-id> --detailed

# Monitor daemon
gitvan daemon --stats
```

---

# Quick Reference

## Common Commands

```bash
# Project setup
gitvan init --name "my-project"
gitvan setup

# Workflows
gitvan workflow list
gitvan workflow run workflow-id
gitvan workflow validate workflow-id

# Hooks
gitvan hooks list
gitvan hooks evaluate

# Packs
gitvan pack list
gitvan pack install pack-name

# Development
pnpm test
pnpm build
pnpm lint:fix
```

## Common Patterns

### Data Processing Workflow
```javascript
[fetch-data] → [process] → [generate-report] → [save-file]
```

### Quality Gate
```turtle
ResultDelta: Detect coverage drop
SELECTThreshold: Check if below minimum
Action: Block commit or notify team
```

### Dashboard Creation
```bash
gitvan pack install nextjs-dashboard-pack
gitvan run create-dashboard-project --name my-app
cd my-app && docker-compose up
```

---

# Additional Resources

- **[GitHub Repository](https://github.com/seanchatmangpt/gitvan)**
- **[NPM Package](https://www.npmjs.com/package/gitvan)**
- **[Documentation Site](https://docs.gitvan.dev)**
- **[Issues & Discussions](https://github.com/seanchatmangpt/gitvan/issues)**

---

## License

GitVan is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## Acknowledgments

- **Git**: For being the perfect automation runtime
- **RDF.js Community**: For excellent RDF tooling
- **Nunjucks**: For powerful templating
- **Next.js & React**: For modern web development
- **shadcn/ui**: For beautiful components
- **deck.gl**: For data visualization
- **Ollama**: For local AI integration
- **Contributors**: Everyone who makes GitVan possible

---

**GitVan v2.2.0** - Git meets AI meets automation. Transform your development workflow with intelligent, knowledge-driven automation.

*Last updated: 2024-01-15*
