# GitVan v4.0.0 API Reference

Complete API reference for GitVan composables, commands, and configuration.

## Table of Contents

1. [Core Composables](#core-composables)
2. [Git Operations](#git-operations)
3. [Job System](#job-system)
4. [Template System](#template-system)
5. [Graph & RDF](#graph--rdf)
6. [CLI Commands](#cli-commands)
7. [Configuration](#configuration)
8. [Events & Hooks](#events--hooks)

---

## Core Composables

All composables must be used within a `withGitVan()` context wrapper to preserve async context.

### Basic Pattern

```javascript
import { withGitVan, useGit, useTemplate } from "gitvan";

await withGitVan(context, async () => {
  const git = useGit();
  const template = useTemplate();

  // All operations here preserve context
  await git.status();
  await template.render("my-template.njk", {});
});
```

---

## Git Operations

### `useGit()`

Provides comprehensive Git operations with deterministic behavior (TZ=UTC, LANG=C).

#### Methods

##### `status(options)`
Get repository status.

```javascript
const git = useGit();
const status = await git.status();
// Returns: { branch, ahead, behind, modified, staged, untracked }
```

##### `commit(message, options)`
Create a commit.

```javascript
await git.commit("feat: add new feature", {
  allowEmpty: false,
  author: "Name <email@example.com>"
});
```

##### `branch(name, options)`
Create or manage branches.

```javascript
// Create branch
await git.branch("feature/new-feature");

// Delete branch
await git.branch("old-feature", { delete: true });

// List branches
const branches = await git.branch({ list: true });
```

##### `merge(branch, options)`
Merge branches.

```javascript
await git.merge("feature/new-feature", {
  ff: "only",  // Fast-forward only
  squash: false
});
```

##### `worktree(options)`
Manage Git worktrees.

```javascript
// Add worktree
await git.worktree({ add: "/path/to/worktree", branch: "feature" });

// List worktrees
const trees = await git.worktree({ list: true });

// Remove worktree
await git.worktree({ remove: "/path/to/worktree" });
```

##### `refs(options)`
Manage Git references.

```javascript
// List refs
const refs = await git.refs({ pattern: "refs/heads/*" });

// Update ref
await git.refs({ ref: "refs/heads/main", value: commitSha });

// Delete ref
await git.refs({ ref: "refs/heads/old", delete: true });
```

##### `notes(options)`
Manage Git notes.

```javascript
// Add note
await git.notes({
  ref: "refs/notes/gitvan/audit",
  object: commitSha,
  message: "Audit entry"
});

// Read note
const note = await git.notes({
  ref: "refs/notes/gitvan/audit",
  object: commitSha,
  show: true
});
```

##### `push(options)` / `pull(options)`
Synchronize with remote.

```javascript
// Push
await git.push({
  remote: "origin",
  branch: "main",
  force: false
});

// Pull
await git.pull({
  remote: "origin",
  branch: "main",
  rebase: false
});
```

---

## Job System

### `useJob()`

Comprehensive job lifecycle management including discovery, execution, scheduling, and monitoring.

#### Discovery Methods

##### `list(options)`
List all available jobs.

```javascript
const job = useJob();
const jobs = await job.list();
// Returns: Array of job definitions
```

##### `get(name)`
Get specific job by name.

```javascript
const jobDef = await job.get("my-job");
// Returns: Job definition or null
```

##### `exists(name)`
Check if job exists.

```javascript
const exists = await job.exists("my-job");
// Returns: boolean
```

##### `search(query)`
Search jobs by name/description.

```javascript
const results = await job.search("backup");
// Returns: Array of matching jobs
```

##### `getByTag(tag)`
Find jobs by tag.

```javascript
const deployJobs = await job.getByTag("deploy");
// Returns: Array of jobs with tag
```

##### `getCronJobs()`
Get all jobs with cron schedules.

```javascript
const cronJobs = await job.getCronJobs();
// Returns: Array of scheduled jobs
```

#### Execution Methods

##### `run(name, context)`
Execute a job.

```javascript
const result = await job.run("my-job", {
  env: { MY_VAR: "value" },
  params: { key: "value" }
});
// Returns: { success, output, duration, receipt }
```

##### `runWithLock(name, context)`
Execute job with distributed locking.

```javascript
const result = await job.runWithLock("my-job", {
  lockTimeout: 60000,  // 60 seconds
  params: {}
});
```

##### `status(name)`
Get job execution status.

```javascript
const status = await job.status("my-job");
// Returns: { running, lastRun, nextRun, executions }
```

##### `isRunning(name)`
Check if job is currently running.

```javascript
const running = await job.isRunning("my-job");
// Returns: boolean
```

##### `history(name, limit)`
Get job execution history.

```javascript
const history = await job.history("my-job", { limit: 10 });
// Returns: Array of execution records
```

#### Scheduling Methods

##### `schedule(name, cronExpression)`
Schedule a job with cron.

```javascript
await job.schedule("backup-job", "0 2 * * *");  // Daily at 2am
```

##### `unschedule(name)`
Remove job from scheduler.

```javascript
await job.unschedule("backup-job");
```

##### `startScheduler()`
Start the job scheduler.

```javascript
await job.startScheduler();
```

##### `stopScheduler()`
Stop the job scheduler.

```javascript
await job.stopScheduler();
```

##### `getSchedulerStatus()`
Get scheduler status.

```javascript
const status = await job.getSchedulerStatus();
// Returns: { running, jobs, uptime }
```

##### `listScheduledJobs()`
List all scheduled jobs.

```javascript
const scheduled = await job.listScheduledJobs();
// Returns: Array of scheduled job info
```

##### `autoScheduleCronJobs()`
Auto-schedule all jobs with cron expressions.

```javascript
await job.autoScheduleCronJobs();
```

#### Management Methods

##### `validate(name)`
Validate a job definition.

```javascript
const validation = await job.validate("my-job");
// Returns: { valid, errors }
```

##### `validateAll()`
Validate all jobs.

```javascript
const results = await job.validateAll();
// Returns: Map of job names to validation results
```

#### Utility Methods

##### `createContext(name)`
Create execution context for a job.

```javascript
const context = await job.createContext("my-job");
// Returns: Context object with env, cwd, etc.
```

##### `getFingerprint(name)`
Get job fingerprint (hash of definition).

```javascript
const fingerprint = await job.getFingerprint("my-job");
// Returns: SHA-256 hash string
```

---

## Template System

### `useTemplate()`

Nunjucks-based template rendering with inflection filters and frontmatter support.

#### Methods

##### `render(templatePath, context, options)`
Render a template.

```javascript
const template = useTemplate();
const result = await template.render("my-template.njk", {
  name: "GitVan",
  version: "4.0.0",
  items: [1, 2, 3]
}, {
  autoescape: false,
  noCache: false
});
// Returns: Rendered string
```

##### `renderString(templateString, context)`
Render template from string.

```javascript
const result = await template.renderString(
  "Hello {{ name }}!",
  { name: "World" }
);
// Returns: "Hello World!"
```

##### `compile(templatePath)`
Compile a template for reuse.

```javascript
const compiled = await template.compile("my-template.njk");
const result = compiled.render({ name: "Test" });
```

##### `addFilter(name, fn)`
Add custom Nunjucks filter.

```javascript
template.addFilter("uppercase", (str) => str.toUpperCase());

// Use in template: {{ name | uppercase }}
```

##### `addGlobal(name, value)`
Add global variable.

```javascript
template.addGlobal("siteName", "GitVan");

// Available in all templates: {{ siteName }}
```

#### Built-in Filters

GitVan includes inflection filters:
- `pluralize` - Pluralize word
- `singularize` - Singularize word
- `camelize` - camelCase
- `pascalize` - PascalCase
- `underscore` - snake_case
- `dasherize` - kebab-case
- `humanize` - Human Readable

```nunjucks
{{ "user" | pluralize }}  {# users #}
{{ "users" | singularize }}  {# user #}
{{ "my_variable" | camelize }}  {# myVariable #}
{{ "MyClass" | underscore }}  {# my_class #}
```

---

## Graph & RDF

### `useGraph()`

RDF graph operations and SPARQL queries.

#### Methods

##### `query(sparql)`
Execute SPARQL query.

```javascript
const graph = useGraph();
const results = await graph.query(`
  SELECT ?workflow ?label
  WHERE {
    ?workflow a gh:Hook .
    ?workflow rdfs:label ?label .
  }
`);
// Returns: Array of bindings
```

##### `insert(triples)`
Insert RDF triples.

```javascript
await graph.insert(`
  @prefix gh: <http://example.org/git-hooks#> .

  gh:MyWorkflow a gh:Hook ;
    rdfs:label "My Workflow" .
`);
```

##### `delete(triples)`
Delete RDF triples.

```javascript
await graph.delete(`
  gh:OldWorkflow ?p ?o .
`);
```

### `useTurtle()`

Parse and serialize Turtle format.

#### Methods

##### `parse(turtle)`
Parse Turtle string to RDF dataset.

```javascript
const turtle = useTurtle();
const dataset = await turtle.parse(`
  @prefix gh: <http://example.org/git-hooks#> .
  gh:Test a gh:Hook .
`);
```

##### `serialize(dataset)`
Serialize RDF dataset to Turtle.

```javascript
const turtleString = await turtle.serialize(dataset);
```

---

## CLI Commands

### Workflow Commands

```bash
# Initialize workflows
gitvan workflow init

# List workflows
gitvan workflow list

# Run workflow
gitvan workflow run <name>

# Validate workflow
gitvan workflow validate <name>

# View workflow history
gitvan workflow history <name>

# Show workflow stats
gitvan workflow stats <name>
```

### Hook Commands

```bash
# Install Git hook
gitvan hook install <hook-type> <workflow>
# Example: gitvan hook install pre-commit LintWorkflow

# List installed hooks
gitvan hook list

# Uninstall hook
gitvan hook uninstall <hook-type>
```

### Job Commands

```bash
# List jobs
gitvan job list

# Run job
gitvan job run <name>

# Schedule job
gitvan job schedule <name> <cron-expression>

# Unschedule job
gitvan job unschedule <name>

# View job status
gitvan job status <name>

# View job history
gitvan job history <name>
```

### Daemon Commands

```bash
# Start daemon
gitvan daemon start

# Stop daemon
gitvan daemon stop

# View daemon status
gitvan daemon status
```

### Event Commands

```bash
# Emit event
gitvan event emit <event-name> [data]

# List event history
gitvan event list

# View event details
gitvan event show <event-id>
```

### Cron Commands

```bash
# List cron jobs
gitvan cron list

# Enable cron
gitvan cron enable

# Disable cron
gitvan cron disable
```

---

## Configuration

### File Locations

GitVan looks for configuration in:
1. `gitvan.config.js`
2. `gitvan.config.mjs`
3. `gitvan.config.ts`
4. `.gitvanrc`
5. `package.json` (gitvan field)

### Configuration Schema

```javascript
// gitvan.config.js
export default {
  // Job configuration
  jobs: {
    dir: "jobs",  // Directory for job definitions
    timeout: 300000,  // Default timeout (5 minutes)
  },

  // Template configuration
  templates: {
    dirs: ["templates"],  // Template directories
    autoescape: false,     // Nunjucks autoescape
    noCache: false,        // Disable template caching
    globals: {             // Global variables
      projectName: "My Project"
    }
  },

  // Receipt/audit configuration
  receipts: {
    ref: "refs/notes/gitvan/audit",  // Git notes ref
    enabled: true
  },

  // Security policy
  policy: {
    requireSignedCommits: true,  // Enforce GPG signatures
    allowedCommands: [],         // Whitelist CLI commands
  },

  // RDF graph configuration
  graph: {
    dir: "graph",           // Graph storage directory
    autoLoad: true,         // Auto-load ontologies
    uriRoots: {             // URI to filesystem mappings
      "graph://": "graph/",
      "templates://": "templates/"
    }
  },

  // Git configuration
  git: {
    defaultBranch: "main",
    requireCleanWorkingTree: false
  }
}
```

### Environment Variables

```bash
# Working directory
GITVAN_HOME=/path/to/gitvan

# Repository directory
GITVAN_REPO=/path/to/repo

# Timezone (should be UTC)
TZ=UTC

# Locale (should be C)
LANG=C

# Environment
NODE_ENV=production

# AI provider
AI_PROVIDER=anthropic

# API keys
ANTHROPIC_API_KEY=your-key
OLLAMA_HOST=http://localhost:11434
```

---

## Events & Hooks

### `useEvent()`

Event system for workflow triggers.

#### Methods

##### `emit(eventName, data)`
Emit an event.

```javascript
const event = useEvent();
await event.emit("workflow.completed", {
  workflow: "MyWorkflow",
  duration: 1234,
  success: true
});
```

##### `on(eventName, handler)`
Register event handler.

```javascript
event.on("workflow.started", async (data) => {
  console.log(`Workflow ${data.workflow} started`);
});
```

##### `once(eventName, handler)`
Register one-time handler.

```javascript
event.once("workflow.completed", async (data) => {
  console.log("First workflow completed!");
});
```

##### `off(eventName, handler)`
Remove event handler.

```javascript
const handler = (data) => console.log(data);
event.on("test", handler);
event.off("test", handler);
```

### Built-in Events

- `workflow.started` - Workflow execution began
- `workflow.completed` - Workflow finished (success/failure)
- `workflow.step.started` - Step execution began
- `workflow.step.completed` - Step finished
- `job.started` - Job execution began
- `job.completed` - Job finished
- `git.commit` - Git commit created
- `git.push` - Git push completed
- `git.merge` - Git merge completed

---

## Additional Composables

### `useReceipt()`

Audit trail and receipt management.

```javascript
const receipt = useReceipt();

// Write receipt
await receipt.write({
  operation: "workflow.run",
  workflow: "MyWorkflow",
  timestamp: Date.now(),
  result: { success: true }
});

// Read receipts
const receipts = await receipt.read({
  operation: "workflow.run",
  limit: 10
});
```

### `useLock()`

Distributed locking.

```javascript
const lock = useLock();

// Acquire lock
const acquired = await lock.acquire("my-resource", {
  timeout: 60000,  // 60 seconds
  retries: 3
});

if (acquired) {
  try {
    // Do work
  } finally {
    await lock.release("my-resource");
  }
}
```

### `useFilesystem()`

File operations.

```javascript
const fs = useFilesystem();

// Read file
const content = await fs.read("/path/to/file.txt");

// Write file
await fs.write("/path/to/file.txt", "content");

// List directory
const files = await fs.list("/path/to/dir");

// Check existence
const exists = await fs.exists("/path/to/file.txt");

// Delete file
await fs.delete("/path/to/file.txt");
```

### `usePack()`

Pack management (plugin system).

```javascript
const pack = usePack();

// Install pack
await pack.install("@gitvan/pack-ci");

// List packs
const packs = await pack.list();

// Remove pack
await pack.remove("@gitvan/pack-ci");
```

---

## TypeScript Support

GitVan provides TypeScript definitions for all APIs.

```typescript
import type { GitVanContext, JobDefinition, WorkflowConfig } from "gitvan";

const context: GitVanContext = {
  cwd: process.cwd(),
  env: process.env,
  now: () => new Date().toISOString()
};
```

---

## Error Handling

All composable methods throw standard Error objects with additional context:

```javascript
try {
  await git.commit("message");
} catch (error) {
  console.error(error.message);     // Human-readable message
  console.error(error.command);     // Command that failed
  console.error(error.args);        // Command arguments
  console.error(error.stderr);      // Error output
  console.error(error.originalError); // Original error object
}
```

---

## Performance Characteristics

| Operation | Typical Time |
|-----------|--------------|
| List workflows | 5ms |
| Run workflow (setup) | 50ms |
| SPARQL query | < 10ms |
| Audit trail write | 5ms |
| Hook execution | 0.2ms (p50), 2ms (p99) |
| Job execution (depends on job) | Variable |
| Template render | 2-10ms |

---

## Next Steps

- [Getting Started Guide](GETTING_STARTED.md)
- [Migration Guide](MIGRATION_GUIDE.md)
- [Configuration Reference](CONFIGURATION.md)
- [Examples](examples/)

---

**Last Updated**: 2026-01-09
**Version**: 4.0.0
**License**: MIT
