# GitVan API Reference

Complete API reference for GitVan v1.0.0. This document covers composables, CLI commands, configuration options, and the hook system.

## Table of Contents

1. [Composables API](#composables-api)
2. [CLI Commands](#cli-commands)
3. [Configuration](#configuration)
4. [Hook System](#hook-system)
5. [Type Definitions](#type-definitions)

---

## Composables API

All composables must be used within `withGitVan()` context. They provide async-safe access to GitVan functionality.

### Core Pattern

```javascript
import { withGitVan, useComposable } from 'gitvan';

const context = { repo: process.cwd(), config: {} };

await withGitVan(context, async () => {
  const composable = useComposable();
  // Use composable methods
});
```

---

### useGit()

Provides Git operations.

#### Methods

##### `status(): Promise<GitStatus>`

Get repository status.

```javascript
const git = useGit();
const status = await git.status();

console.log(status.branch);      // Current branch
console.log(status.modified);    // Modified files
console.log(status.staged);      // Staged files
console.log(status.untracked);   // Untracked files
```

**Returns**: `GitStatus`
```typescript
interface GitStatus {
  branch: string;
  commit: string;
  modified: string[];
  staged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}
```

##### `commit(message: string, options?: CommitOptions): Promise<string>`

Create a commit.

```javascript
const sha = await git.commit('feat: add new feature', {
  sign: true,           // GPG sign commit
  author: {             // Override author
    name: 'John Doe',
    email: 'john@example.com'
  }
});
```

**Parameters**:
- `message` (string): Commit message
- `options` (CommitOptions, optional):
  - `sign` (boolean): GPG sign the commit
  - `author` (object): Override commit author
    - `name` (string): Author name
    - `email` (string): Author email
  - `date` (Date): Override commit date

**Returns**: `Promise<string>` - Commit SHA

##### `branch(name: string, options?: BranchOptions): Promise<void>`

Create or switch branch.

```javascript
// Create new branch
await git.branch('feature/new-feature');

// Create from specific ref
await git.branch('hotfix/bug', {
  from: 'v1.0.0',
  checkout: true
});
```

**Parameters**:
- `name` (string): Branch name
- `options` (BranchOptions, optional):
  - `from` (string): Create from ref (commit SHA, tag, branch)
  - `checkout` (boolean): Checkout after creation
  - `force` (boolean): Force create/update

##### `merge(branch: string, options?: MergeOptions): Promise<MergeResult>`

Merge branches.

```javascript
const result = await git.merge('feature/new-feature', {
  strategy: 'recursive',
  squash: false
});

if (result.conflicts.length > 0) {
  console.log('Conflicts:', result.conflicts);
}
```

**Parameters**:
- `branch` (string): Branch to merge
- `options` (MergeOptions, optional):
  - `strategy` (string): Merge strategy ('recursive', 'ours', 'theirs')
  - `squash` (boolean): Squash commits
  - `noCommit` (boolean): Don't create merge commit

**Returns**: `Promise<MergeResult>`
```typescript
interface MergeResult {
  success: boolean;
  conflicts: string[];
  sha?: string;
}
```

##### `push(options?: PushOptions): Promise<void>`

Push to remote.

```javascript
await git.push({
  remote: 'origin',
  branch: 'main',
  force: false,
  tags: true
});
```

**Parameters**:
- `options` (PushOptions, optional):
  - `remote` (string): Remote name (default: 'origin')
  - `branch` (string): Branch to push (default: current)
  - `force` (boolean): Force push
  - `tags` (boolean): Push tags

##### `pull(options?: PullOptions): Promise<void>`

Pull from remote.

```javascript
await git.pull({
  remote: 'origin',
  branch: 'main',
  rebase: true
});
```

**Parameters**:
- `options` (PullOptions, optional):
  - `remote` (string): Remote name
  - `branch` (string): Branch to pull
  - `rebase` (boolean): Rebase instead of merge

##### `refs(): Promise<GitRefs>`

Get repository refs.

```javascript
const refs = await git.refs();

console.log(refs.heads);    // Branch refs
console.log(refs.tags);     // Tag refs
console.log(refs.remotes);  // Remote refs
```

**Returns**: `Promise<GitRefs>`

##### `notes(ref: string): Promise<GitNotes>`

Read Git notes.

```javascript
const notes = await git.notes('refs/notes/gitvan/audit');

for (const [commit, note] of Object.entries(notes)) {
  console.log(`${commit}: ${note}`);
}
```

**Parameters**:
- `ref` (string): Notes ref

**Returns**: `Promise<GitNotes>` - Map of commit SHA to note content

##### `worktree(): WorktreeAPI`

Access worktree operations. See [useWorktree()](#useworktree).

---

### useWorkflow()

Execute and manage workflows.

#### Methods

##### `execute(name: string, options?: ExecuteOptions): Promise<WorkflowResult>`

Execute a workflow.

```javascript
const workflow = useWorkflow();

const result = await workflow.execute('build-test', {
  variables: {
    NODE_ENV: 'production'
  },
  dryRun: false
});

console.log('Status:', result.status);
console.log('Duration:', result.duration, 'ms');
console.log('Steps:', result.steps);
```

**Parameters**:
- `name` (string): Workflow name
- `options` (ExecuteOptions, optional):
  - `variables` (object): Workflow variables
  - `dryRun` (boolean): Don't execute, just validate
  - `parallel` (boolean): Enable parallel execution
  - `timeout` (number): Timeout in milliseconds

**Returns**: `Promise<WorkflowResult>`
```typescript
interface WorkflowResult {
  status: 'success' | 'failure' | 'timeout';
  duration: number;
  steps: StepResult[];
  error?: Error;
}

interface StepResult {
  name: string;
  status: 'success' | 'failure' | 'skipped';
  duration: number;
  output?: string;
  error?: Error;
}
```

##### `list(): Promise<WorkflowInfo[]>`

List available workflows.

```javascript
const workflows = await workflow.list();

workflows.forEach(wf => {
  console.log(`${wf.name}: ${wf.description}`);
  console.log(`  Steps: ${wf.steps.length}`);
  console.log(`  Triggers: ${wf.triggers.join(', ')}`);
});
```

**Returns**: `Promise<WorkflowInfo[]>`

##### `validate(name: string): Promise<ValidationResult>`

Validate workflow syntax.

```javascript
const result = await workflow.validate('my-workflow');

if (!result.valid) {
  console.error('Errors:', result.errors);
}
```

**Returns**: `Promise<ValidationResult>`

##### `parse(content: string): Promise<WorkflowDefinition>`

Parse workflow from Turtle content.

```javascript
import { readFileSync } from 'fs';

const content = readFileSync('workflow.ttl', 'utf8');
const definition = await workflow.parse(content);
```

**Returns**: `Promise<WorkflowDefinition>`

---

### useTemplate()

Render templates with Nunjucks.

#### Methods

##### `render(name: string, data: object): Promise<string>`

Render template.

```javascript
const template = useTemplate();

const output = await template.render('component.njk', {
  name: 'UserCard',
  props: ['user', 'onEdit']
});

console.log(output);
```

**Parameters**:
- `name` (string): Template name (relative to template directories)
- `data` (object): Template variables

**Returns**: `Promise<string>` - Rendered output

##### `compile(content: string): Promise<Template>`

Compile template string.

```javascript
const tmpl = await template.compile('Hello {{ name }}!');
const output = tmpl.render({ name: 'World' });
```

**Returns**: `Promise<Template>`

##### `addFilter(name: string, fn: Function): void`

Add custom filter.

```javascript
template.addFilter('uppercase', (str) => str.toUpperCase());
template.addFilter('reverse', (str) => str.split('').reverse().join(''));

// Use in template
// {{ "hello" | uppercase | reverse }}
// Output: OLLEH
```

**Parameters**:
- `name` (string): Filter name
- `fn` (Function): Filter function

##### `addGlobal(name: string, value: any): void`

Add global variable.

```javascript
template.addGlobal('projectName', 'My Project');
template.addGlobal('version', '1.0.0');

// Available in all templates
// {{ projectName }} v{{ version }}
```

##### `list(): Promise<string[]>`

List available templates.

```javascript
const templates = await template.list();
console.log('Available templates:', templates);
```

**Returns**: `Promise<string[]>` - Template paths

---

### useJob()

Schedule and execute background jobs.

#### Methods

##### `execute(name: string, options?: JobOptions): Promise<JobResult>`

Execute job immediately.

```javascript
const job = useJob();

const result = await job.execute('cleanup', {
  timeout: 60000
});

console.log('Job completed:', result.status);
```

**Parameters**:
- `name` (string): Job name
- `options` (JobOptions, optional):
  - `timeout` (number): Timeout in milliseconds
  - `data` (object): Job data

**Returns**: `Promise<JobResult>`

##### `schedule(name: string, options: ScheduleOptions): Promise<string>`

Schedule recurring job.

```javascript
const jobId = await job.schedule('sync', {
  cron: '0 * * * *',  // Every hour
  data: { source: 'api' },
  async run(context) {
    // Job implementation
  }
});
```

**Parameters**:
- `name` (string): Job name
- `options` (ScheduleOptions):
  - `cron` (string): Cron expression
  - `data` (object): Job data
  - `run` (Function): Job function

**Returns**: `Promise<string>` - Job ID

##### `cancel(jobId: string): Promise<void>`

Cancel scheduled job.

```javascript
await job.cancel(jobId);
```

##### `list(): Promise<JobInfo[]>`

List all jobs.

```javascript
const jobs = await job.list();

jobs.forEach(j => {
  console.log(`${j.name}: ${j.status}`);
  console.log(`  Schedule: ${j.schedule}`);
  console.log(`  Last run: ${j.lastRun}`);
});
```

**Returns**: `Promise<JobInfo[]>`

##### `scan(): Promise<string[]>`

Scan for job files in configured directories.

```javascript
const discovered = await job.scan();
console.log('Discovered jobs:', discovered);
```

**Returns**: `Promise<string[]>` - Job file paths

---

### useEvent()

Event system for triggering workflows.

#### Methods

##### `emit(event: string, data?: any): Promise<void>`

Emit event.

```javascript
const event = useEvent();

await event.emit('git:commit', {
  sha: 'abc123',
  message: 'feat: add feature',
  author: 'John Doe'
});
```

**Parameters**:
- `event` (string): Event name
- `data` (any): Event data

##### `on(event: string, handler: Function): void`

Listen for event.

```javascript
event.on('git:commit', async (data) => {
  console.log('Commit:', data.sha);
  // Handle event
});
```

**Parameters**:
- `event` (string): Event name
- `handler` (Function): Event handler

##### `once(event: string, handler: Function): void`

Listen for event once.

```javascript
event.once('workflow:complete', async (data) => {
  console.log('Workflow completed:', data.name);
});
```

##### `off(event: string, handler?: Function): void`

Remove event listener.

```javascript
const handler = async (data) => { /* ... */ };

event.on('git:push', handler);
// Later...
event.off('git:push', handler);
```

---

### usePack()

Manage packs (plugins).

#### Methods

##### `install(name: string, options?: InstallOptions): Promise<void>`

Install pack.

```javascript
const pack = usePack();

await pack.install('@gitvan/ci-cd', {
  version: '^1.0.0',
  registry: 'https://registry.gitvan.dev'
});
```

**Parameters**:
- `name` (string): Pack name
- `options` (InstallOptions, optional):
  - `version` (string): Version constraint
  - `registry` (string): Pack registry URL

##### `remove(name: string): Promise<void>`

Remove pack.

```javascript
await pack.remove('@gitvan/ci-cd');
```

##### `list(): Promise<PackInfo[]>`

List installed packs.

```javascript
const packs = await pack.list();

packs.forEach(p => {
  console.log(`${p.name}@${p.version}`);
  console.log(`  Description: ${p.description}`);
});
```

**Returns**: `Promise<PackInfo[]>`

##### `search(query: string): Promise<PackInfo[]>`

Search pack marketplace.

```javascript
const results = await pack.search('ci');

results.forEach(p => {
  console.log(`${p.name}: ${p.description}`);
});
```

**Returns**: `Promise<PackInfo[]>`

---

### useReceipt()

Manage audit trail in Git notes.

#### Methods

##### `write(data: AuditRecord): Promise<void>`

Write audit record.

```javascript
const receipt = useReceipt();

await receipt.write({
  action: 'workflow:execute',
  workflow: 'deploy',
  status: 'success',
  timestamp: new Date().toISOString(),
  metadata: {
    user: process.env.USER,
    duration: 5234
  }
});
```

**Parameters**:
- `data` (AuditRecord): Audit record
  - `action` (string): Action type
  - `status` (string): Status
  - `timestamp` (string): ISO timestamp
  - `metadata` (object): Additional data

##### `read(options?: ReadOptions): Promise<AuditRecord[]>`

Read audit records.

```javascript
const records = await receipt.read({
  limit: 100,
  since: new Date('2025-01-01'),
  action: 'workflow:execute'
});
```

**Parameters**:
- `options` (ReadOptions, optional):
  - `limit` (number): Max records
  - `since` (Date): Filter by date
  - `action` (string): Filter by action

**Returns**: `Promise<AuditRecord[]>`

##### `verify(records?: AuditRecord[]): Promise<boolean>`

Verify audit trail integrity.

```javascript
const records = await receipt.read();
const isValid = await receipt.verify(records);

if (!isValid) {
  console.error('Audit trail compromised!');
}
```

**Returns**: `Promise<boolean>` - True if valid

---

### useLock()

Distributed locking for concurrent operations.

#### Methods

##### `acquire(resource: string, options?: LockOptions): Promise<string>`

Acquire lock.

```javascript
const lock = useLock();

const lockId = await lock.acquire('deploy-lock', {
  ttl: 60000,        // 1 minute
  retry: {
    times: 5,
    interval: 1000
  }
});
```

**Parameters**:
- `resource` (string): Resource name
- `options` (LockOptions, optional):
  - `ttl` (number): Time-to-live in milliseconds
  - `retry` (object): Retry configuration
    - `times` (number): Max retry attempts
    - `interval` (number): Retry interval in ms

**Returns**: `Promise<string>` - Lock ID

##### `release(lockId: string): Promise<void>`

Release lock.

```javascript
await lock.release(lockId);
```

##### `extend(lockId: string, ttl: number): Promise<void>`

Extend lock TTL.

```javascript
await lock.extend(lockId, 30000);  // Extend by 30 seconds
```

##### `isLocked(resource: string): Promise<boolean>`

Check if resource is locked.

```javascript
if (await lock.isLocked('deploy-lock')) {
  console.log('Deployment in progress');
}
```

**Returns**: `Promise<boolean>`

---

### useFileSystem()

File operations.

#### Methods

##### `read(path: string): Promise<string>`

Read file.

```javascript
const fs = useFileSystem();
const content = await fs.read('src/index.js');
```

##### `write(path: string, content: string): Promise<void>`

Write file.

```javascript
await fs.write('output.txt', 'Hello World');
```

##### `delete(path: string): Promise<void>`

Delete file.

```javascript
await fs.delete('temp.txt');
```

##### `exists(path: string): Promise<boolean>`

Check if file exists.

```javascript
if (await fs.exists('config.js')) {
  // File exists
}
```

##### `list(dir: string): Promise<string[]>`

List directory contents.

```javascript
const files = await fs.list('src/');
```

---

### useWorktree()

Git worktree management.

#### Methods

##### `create(path: string, options?: WorktreeOptions): Promise<void>`

Create worktree.

```javascript
const worktree = useWorktree();

await worktree.create('/tmp/feature-branch', {
  branch: 'feature/new-feature',
  detach: false
});
```

##### `remove(path: string): Promise<void>`

Remove worktree.

```javascript
await worktree.remove('/tmp/feature-branch');
```

##### `list(): Promise<WorktreeInfo[]>`

List worktrees.

```javascript
const trees = await worktree.list();
```

##### `prune(): Promise<void>`

Prune stale worktrees.

```javascript
await worktree.prune();
```

---

### useGraph()

RDF graph operations.

#### Methods

##### `query(sparql: string): Promise<QueryResult[]>`

Execute SPARQL query.

```javascript
const graph = useGraph();

const results = await graph.query(`
  PREFIX : <http://gitvan.dev/workflow/>
  SELECT ?workflow ?step
  WHERE {
    ?workflow a :Workflow ;
      :hasStep ?step .
  }
`);
```

##### `load(uri: string): Promise<void>`

Load RDF graph from URI.

```javascript
await graph.load('file:///path/to/ontology.ttl');
```

##### `insert(triples: string): Promise<void>`

Insert RDF triples.

```javascript
await graph.insert(`
  @prefix : <http://example.com/> .
  :subject :predicate :object .
`);
```

---

### useAI()

AI integration.

#### Methods

##### `generate(options: GenerateOptions): Promise<string>`

Generate code with AI.

```javascript
const ai = useAI();

const code = await ai.generate({
  prompt: 'Create a React component for user profile',
  context: {
    repo: process.cwd(),
    files: ['src/components/']
  },
  provider: 'anthropic',
  model: 'claude-3-opus-20240229'
});
```

**Parameters**:
- `options` (GenerateOptions):
  - `prompt` (string): Generation prompt
  - `context` (object): Repository context
  - `provider` (string): AI provider
  - `model` (string): Model name

**Returns**: `Promise<string>` - Generated content

---

### useGraph()

RDF graph operations and SPARQL queries.

#### Methods

##### `load(uri: string): Promise<Graph>`

Load RDF graph.

```javascript
const graph = useGraph();
const rdf = await graph.load('graph://workflows');

// Query graph
const results = await rdf.query(`
  SELECT ?workflow WHERE {
    ?workflow a :Workflow .
  }
`);
```

**Parameters**:
- `uri` (string): Graph URI

**Returns**: `Promise<Graph>` - RDF graph instance

##### `query(sparql: string): Promise<any[]>`

Execute SPARQL query.

```javascript
const results = await graph.query(`
  SELECT ?workflow ?name WHERE {
    ?workflow a :Workflow ;
      rdfs:label ?name .
  }
`);

results.forEach(row => {
  console.log(`${row.workflow}: ${row.name}`);
});
```

**Parameters**:
- `sparql` (string): SPARQL query

**Returns**: `Promise<any[]>` - Query results

##### `insert(triples: Triple[]): Promise<void>`

Insert RDF triples.

```javascript
const triples = [
  {
    subject: 'workflow://my-workflow',
    predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    object: 'workflow://Workflow'
  }
];

await graph.insert(triples);
```

---

### useHybridGit()

Hybrid Git backend (MemFS or native).

#### Methods

##### `auto(): Promise<GitBackend>`

Auto-select backend based on environment.

```javascript
const git = useHybridGit();
const backend = await git.auto();

console.log('Using backend:', backend.type);  // 'memfs' or 'native'
```

**Returns**: `Promise<GitBackend>`

##### `setBackend(type: 'memfs' | 'native'): void`

Manually select backend.

```javascript
const git = useHybridGit();
git.setBackend('memfs');  // Use MemFS (testing)
git.setBackend('native'); // Use native Git (production)
```

##### `getBackend(): GitBackend`

Get current backend.

```javascript
const git = useHybridGit();
const backend = git.getBackend();
console.log('Current backend:', backend.type);
```

---

### useJobDiscovery()

Discover available jobs in configured directories.

#### Methods

##### `list(options?: ListOptions): Promise<JobInfo[]>`

List all discovered jobs.

```javascript
const discovery = useJobDiscovery();
const jobs = await discovery.list();

jobs.forEach(job => {
  console.log(`${job.name}: ${job.description}`);
  console.log(`  Path: ${job.path}`);
});
```

**Returns**: `Promise<JobInfo[]>`

##### `find(query: string): Promise<JobInfo[]>`

Find jobs by name or description.

```javascript
const matches = await discovery.find('deploy');
// Returns all jobs matching 'deploy'
```

**Parameters**:
- `query` (string): Search query

**Returns**: `Promise<JobInfo[]>`

##### `getStats(): Promise<JobStats>`

Get discovery statistics.

```javascript
const stats = await discovery.getStats();
console.log(`Found ${stats.total} jobs`);
console.log(`From ${stats.directories.length} directories`);
```

---

### useJobExecution()

Execute jobs with proper context and error handling.

#### Methods

##### `execute(name: string, context?: object): Promise<JobResult>`

Execute job with context.

```javascript
const execution = useJobExecution();

const result = await execution.execute('build', {
  NODE_ENV: 'production',
  VERSION: '1.0.0'
});

console.log('Status:', result.status);
console.log('Output:', result.output);
```

**Parameters**:
- `name` (string): Job name
- `context` (object): Job context

**Returns**: `Promise<JobResult>`

##### `withTimeout(name: string, timeout: number): Promise<JobResult>`

Execute job with timeout.

```javascript
const result = await execution.withTimeout('sync', 30000);
```

##### `withRetry(name: string, options: RetryOptions): Promise<JobResult>`

Execute job with retry logic.

```javascript
const result = await execution.withRetry('deploy', {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential'
});
```

---

### useJobManagement()

Manage job lifecycle and state.

#### Methods

##### `start(name: string): Promise<string>`

Start job asynchronously.

```javascript
const jobId = await management.start('background-sync');
console.log('Job ID:', jobId);
```

**Returns**: `Promise<string>` - Job ID

##### `stop(jobId: string): Promise<void>`

Stop running job.

```javascript
await management.stop(jobId);
```

##### `getStatus(jobId: string): Promise<JobStatus>`

Get job status.

```javascript
const status = await management.getStatus(jobId);
console.log('Progress:', status.progress, '%');
console.log('Status:', status.state);
```

##### `wait(jobId: string, timeout?: number): Promise<JobResult>`

Wait for job completion.

```javascript
const result = await management.wait(jobId, 60000);
```

---

### useJobScheduler()

Schedule recurring job execution.

#### Methods

##### `schedule(name: string, cron: string): Promise<string>`

Schedule job with cron expression.

```javascript
const scheduler = useJobScheduler();

const id = await scheduler.schedule('daily-cleanup', '0 2 * * *');
// Runs daily at 2 AM
```

**Returns**: `Promise<string>` - Schedule ID

##### `at(name: string, date: Date): Promise<string>`

Schedule job for specific time.

```javascript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const id = await scheduler.at('deploy', tomorrow);
```

##### `cancel(id: string): Promise<void>`

Cancel scheduled job.

```javascript
await scheduler.cancel(id);
```

##### `list(): Promise<ScheduledJob[]>`

List all scheduled jobs.

```javascript
const scheduled = await scheduler.list();
scheduled.forEach(job => {
  console.log(`${job.name}: ${job.schedule}`);
});
```

---

### useJobUtilities()

Utility functions for job development.

#### Methods

##### `parseArgs(argv: string[]): ParsedArgs`

Parse command-line arguments.

```javascript
const utils = useJobUtilities();
const args = utils.parseArgs(['--env', 'production', '--verbose']);

console.log(args.env);      // 'production'
console.log(args.verbose);  // true
```

##### `formatOutput(data: any, format: string): string`

Format job output.

```javascript
const output = utils.formatOutput(data, 'json');
// or 'text', 'csv', 'table'
```

##### `createLogger(name: string): Logger`

Create job logger.

```javascript
const logger = utils.createLogger('my-job');
logger.info('Starting job');
logger.error('Job failed');
```

---

### useLog()

Logging utilities for GitVan operations.

#### Methods

##### `debug(message: string, data?: object): void`

Log debug message.

```javascript
const log = useLog();
log.debug('Processing file', { file: 'index.js' });
```

##### `info(message: string, data?: object): void`

Log info message.

```javascript
log.info('Workflow started', { workflow: 'build' });
```

##### `warn(message: string, data?: object): void`

Log warning.

```javascript
log.warn('Deprecated function', { function: 'old_api' });
```

##### `error(message: string, error?: Error): void`

Log error.

```javascript
log.error('Operation failed', err);
```

##### `setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void`

Set log level.

```javascript
log.setLevel('debug');  // Show all messages
```

---

### useNativeIO()

Git-native file I/O using refs and notes.

#### Methods

##### `writeRef(ref: string, sha: string): Promise<void>`

Write ref (branch/tag).

```javascript
const io = useNativeIO();
await io.writeRef('refs/heads/main', 'abc123def456...');
```

##### `readRef(ref: string): Promise<string>`

Read ref value.

```javascript
const sha = await io.readRef('refs/heads/main');
```

##### `writeNote(ref: string, data: object): Promise<void>`

Write Git note.

```javascript
await io.writeNote('refs/notes/gitvan/metadata', {
  timestamp: new Date().toISOString(),
  user: 'alice@example.com'
});
```

##### `readNote(ref: string): Promise<object>`

Read Git note.

```javascript
const note = await io.readNote('refs/notes/gitvan/metadata');
```

---

### useNotes()

Advanced Git notes operations.

#### Methods

##### `create(commit: string, message: string): Promise<void>`

Create note for commit.

```javascript
const notes = useNotes();
await notes.create('abc123', 'This commit fixes bug #42');
```

##### `read(commit: string): Promise<string>`

Read commit note.

```javascript
const note = await notes.read('abc123');
```

##### `list(ref?: string): Promise<NoteEntry[]>`

List all notes.

```javascript
const allNotes = await notes.list('refs/notes/gitvan/audit');
```

---

### useRegistry()

Component registry for extensibility.

#### Methods

##### `register(name: string, component: any): void`

Register component.

```javascript
const registry = useRegistry();
registry.register('my-handler', {
  handle: async (data) => { /* ... */ }
});
```

##### `get(name: string): any`

Get registered component.

```javascript
const handler = registry.get('my-handler');
await handler.handle(data);
```

##### `list(): string[]`

List registered components.

```javascript
const components = registry.list();
console.log('Registered:', components);
```

---

### useSchedule()

Low-level job scheduling.

#### Methods

##### `schedule(options: ScheduleOptions): Promise<string>`

Schedule operation.

```javascript
const schedule = useSchedule();

const id = await schedule.schedule({
  type: 'cron',
  expression: '0 * * * *',
  handler: async () => {
    // Job code
  }
});
```

**Returns**: `Promise<string>` - Schedule ID

##### `unschedule(id: string): Promise<void>`

Remove schedule.

```javascript
await schedule.unschedule(id);
```

---

### useTestEnvironment()

Test environment setup and utilities.

#### Methods

##### `createRepo(options?: RepoOptions): Promise<TestRepo>`

Create isolated test repository.

```javascript
const env = useTestEnvironment();

const repo = await env.createRepo({
  name: 'test-repo',
  bare: false
});

console.log('Repo path:', repo.path);
```

**Returns**: `Promise<TestRepo>`

##### `cleanup(): Promise<void>`

Clean up test resources.

```javascript
await env.cleanup();
```

---

### useTurtle()

RDF Turtle format parsing and generation.

#### Methods

##### `parse(content: string): Promise<RDFGraph>`

Parse Turtle content.

```javascript
const turtle = useTurtle();

const ttl = `
@prefix : <http://example.org#> .
:subject :predicate :object .
`;

const graph = await turtle.parse(ttl);
```

**Parameters**:
- `content` (string): Turtle content

**Returns**: `Promise<RDFGraph>`

##### `generate(graph: RDFGraph): string`

Generate Turtle from graph.

```javascript
const ttl = turtle.generate(graph);
console.log(ttl);
```

---

### useUnifiedHooks()

Unified hooks interface for Git and workflow events.

#### Methods

##### `on(event: string, handler: Function): void`

Register event handler.

```javascript
const hooks = useUnifiedHooks();

hooks.on('git:commit', async (commit) => {
  console.log('Commit:', commit.sha);
});

hooks.on('workflow:complete', async (result) => {
  console.log('Workflow:', result.status);
});
```

##### `emit(event: string, data: any): Promise<void>`

Emit event.

```javascript
await hooks.emit('custom:event', { data: 'value' });
```

##### `off(event: string, handler?: Function): void`

Unregister handler.

```javascript
hooks.off('git:commit', handler);
```

---

### useUnrouting()

URL/path routing utilities for job discovery.

#### Methods

##### `resolve(jobId: string): Promise<string>`

Resolve job path from ID.

```javascript
const routing = useUnrouting();
const path = await routing.resolve('my-job');
// Returns: '/path/to/jobs/my-job.mjs'
```

##### `unresolve(path: string): string`

Get job ID from path.

```javascript
const id = routing.unresolve('/path/to/jobs/my-job.mjs');
// Returns: 'my-job'
```

---

## CLI Commands

### General Options

All commands support:
- `--help`, `-h`: Show help
- `--version`, `-v`: Show version
- `--config <path>`: Custom config file
- `--repo <path>`: Repository path
- `--verbose`: Verbose output
- `--quiet`: Quiet mode

### Workflow Commands

#### `gitvan workflow list`

List all workflows.

```bash
gitvan workflow list

# Output:
# Available workflows:
#   - build-test: Build and run tests
#   - deploy: Deploy to production
#   - lint: Run linters
```

Options:
- `--format <type>`: Output format (table, json, yaml)

#### `gitvan workflow run <name>`

Execute workflow.

```bash
gitvan workflow run build-test

# With variables
gitvan workflow run deploy --var NODE_ENV=production --var VERSION=1.0.0

# Dry run
gitvan workflow run deploy --dry-run
```

Options:
- `--var <key>=<value>`: Set workflow variable
- `--dry-run`: Validate without executing
- `--timeout <ms>`: Execution timeout
- `--parallel`: Enable parallel execution

#### `gitvan workflow validate <name>`

Validate workflow syntax.

```bash
gitvan workflow validate my-workflow

# Output:
# ✓ Workflow is valid
```

#### `gitvan workflow show <name>`

Show workflow details.

```bash
gitvan workflow show build-test

# Output:
# Workflow: build-test
# Description: Build and run tests
# Triggers: git:commit
# Steps:
#   1. install: Install dependencies
#   2. build: Build project (depends on: install)
#   3. test: Run tests (depends on: build)
```

---

### Git Commands

#### `gitvan git status`

Show Git status.

```bash
gitvan git status

# Output:
# Branch: main
# Commit: abc123
# Modified: 3 files
# Staged: 1 file
# Untracked: 2 files
```

#### `gitvan git commit`

Create commit.

```bash
gitvan git commit -m "feat: add new feature"

# Sign commit
gitvan git commit -m "fix: bug fix" --sign
```

Options:
- `-m, --message <msg>`: Commit message
- `--sign`: GPG sign commit

#### `gitvan git branch <name>`

Create or switch branch.

```bash
gitvan git branch feature/new-feature

# Create from ref
gitvan git branch hotfix --from v1.0.0 --checkout
```

Options:
- `--from <ref>`: Create from ref
- `--checkout`: Checkout after creation
- `--force`: Force create/update

#### `gitvan git push`

Push to remote.

```bash
gitvan git push

# Push specific branch
gitvan git push --branch main --remote origin

# Force push
gitvan git push --force
```

Options:
- `--branch <name>`: Branch to push
- `--remote <name>`: Remote name
- `--force`: Force push
- `--tags`: Push tags

---

### Daemon Commands

#### `gitvan daemon start`

Start background daemon.

```bash
gitvan daemon start

# Output:
# → GitVan daemon started (PID: 12345)
```

Options:
- `--detach`: Run in background

#### `gitvan daemon stop`

Stop daemon.

```bash
gitvan daemon stop
```

#### `gitvan daemon status`

Check daemon status.

```bash
gitvan daemon status

# Output:
# GitVan daemon is running (PID: 12345)
# Uptime: 2h 15m
# Active workflows: 0
```

#### `gitvan daemon logs`

View daemon logs.

```bash
gitvan daemon logs

# Follow logs
gitvan daemon logs --follow

# Filter by level
gitvan daemon logs --level error
```

Options:
- `--follow`, `-f`: Follow logs
- `--level <level>`: Filter by level (info, error, debug)
- `--lines <n>`: Show last n lines

---

### Pack Commands

#### `gitvan pack list`

List installed packs.

```bash
gitvan pack list

# Output:
# Installed packs:
#   - @gitvan/ci-cd@1.0.0: CI/CD automation
#   - @gitvan/templates@2.1.0: Common templates
```

#### `gitvan pack install <name>`

Install pack.

```bash
gitvan pack install @gitvan/ci-cd

# Specific version
gitvan pack install @gitvan/ci-cd@1.0.0
```

Options:
- `--version <ver>`: Version constraint
- `--registry <url>`: Pack registry URL

#### `gitvan pack remove <name>`

Remove pack.

```bash
gitvan pack remove @gitvan/ci-cd
```

#### `gitvan pack search <query>`

Search packs.

```bash
gitvan pack search ci

# Output:
# Found 5 packs:
#   - @gitvan/ci-cd: CI/CD automation
#   - @gitvan/circle-ci: CircleCI integration
#   ...
```

---

### Template Commands

#### `gitvan template list`

List templates.

```bash
gitvan template list

# Output:
# Available templates:
#   - component.njk
#   - api-endpoint.njk
#   - test-suite.njk
```

#### `gitvan template render <name>`

Render template.

```bash
gitvan template render component.njk --data '{"name":"UserCard"}'

# From file
gitvan template render component.njk --data-file data.json

# Output to file
gitvan template render component.njk --data '{"name":"UserCard"}' --output src/UserCard.jsx
```

Options:
- `--data <json>`: Template data as JSON
- `--data-file <path>`: Template data from file
- `--output <path>`: Output file

---

### Job Commands

#### `gitvan job list`

List jobs.

```bash
gitvan job list

# Output:
# Available jobs:
#   - cleanup: Daily cleanup (0 0 * * *)
#   - sync: Hourly sync (0 * * * *)
```

#### `gitvan job run <name>`

Run job manually.

```bash
gitvan job run cleanup

# With data
gitvan job run sync --data '{"source":"api"}'
```

Options:
- `--data <json>`: Job data
- `--timeout <ms>`: Timeout

#### `gitvan job schedule <name>`

Schedule job.

```bash
gitvan job schedule cleanup --cron "0 0 * * *"
```

Options:
- `--cron <expr>`: Cron expression

---

### Audit Commands

#### `gitvan audit show`

Show audit trail.

```bash
gitvan audit show

# Filter
gitvan audit show --action workflow:execute --limit 10

# Since date
gitvan audit show --since 2025-01-01
```

Options:
- `--action <type>`: Filter by action
- `--limit <n>`: Limit records
- `--since <date>`: Filter by date
- `--format <type>`: Output format

#### `gitvan audit verify`

Verify audit trail integrity.

```bash
gitvan audit verify

# Output:
# ✓ Audit trail is valid
# Verified 1,234 records
```

#### `gitvan audit export`

Export audit records.

```bash
gitvan audit export --format json --output audit.json
```

Options:
- `--format <type>`: Export format (json, csv, xml)
- `--output <path>`: Output file

---

## Configuration

### Configuration File

`gitvan.config.js` in repository root:

```javascript
export default {
  // Job configuration
  jobs: {
    dir: 'jobs',              // Job directory
    maxConcurrent: 5,         // Max concurrent jobs
    timeout: 300000           // Default timeout (5 minutes)
  },

  // Template configuration
  templates: {
    dirs: ['templates'],      // Template directories
    autoescape: false,        // Nunjucks autoescape
    trimBlocks: true,         // Trim blocks
    lstripBlocks: true,       // Left strip blocks
    globals: {                // Global variables
      projectName: 'My Project',
      version: '1.0.0'
    },
    filters: {                // Custom filters
      uppercase: (str) => str.toUpperCase()
    }
  },

  // Workflow configuration
  workflows: {
    dir: 'workflows',         // Workflow directory
    parallel: true,           // Enable parallel execution
    timeout: 300000,          // Default timeout
    cache: true               // Enable caching
  },

  // Audit trail
  receipts: {
    ref: 'refs/notes/gitvan/audit',  // Git notes ref
    sign: true,                       // Sign records
    includeMetadata: true             // Include system metadata
  },

  // Security policy
  policy: {
    requireSignedCommits: false,      // Require GPG signatures
    allowedCommands: ['npm', 'git'],  // Allowed shell commands
    maxExecutionTime: 3600000         // Max execution time (1 hour)
  },

  // RDF graph
  graph: {
    dir: 'graph',             // Graph storage directory
    autoLoad: true,           // Auto-load ontologies
    cache: true,              // Enable caching
    uriRoots: {               // URI to path mapping
      'graph://': 'graph/',
      'templates://': 'templates/'
    }
  },

  // AI configuration
  ai: {
    provider: 'anthropic',    // Default provider
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-opus-20240229'
    },
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'codellama'
    }
  },

  // Pack configuration
  packs: {
    registry: 'https://registry.gitvan.dev',
    cacheDir: '.gitvan/pack-cache'
  }
};
```

### Environment Variables

```bash
# GitVan
GITVAN_HOME=/path/to/config          # Config directory
GITVAN_REPO=/path/to/repo            # Repository path

# Environment
NODE_ENV=development                  # Environment
TZ=UTC                                # Timezone (always UTC)
LANG=C                                # Locale (always C)

# AI Providers
AI_PROVIDER=anthropic                 # Default provider
ANTHROPIC_API_KEY=sk-ant-xxx          # Anthropic API key
OLLAMA_BASE_URL=http://localhost:11434  # Ollama URL

# Debug
DEBUG=gitvan:*                        # Enable debug logging
```

---

## Hook System

GitVan uses hookable for extensibility.

### Available Hooks

#### `workflow:before`

Called before workflow execution.

```javascript
hooks.hook('workflow:before', async (context) => {
  console.log('Starting workflow:', context.workflow);
});
```

#### `workflow:after`

Called after workflow execution.

```javascript
hooks.hook('workflow:after', async (context, result) => {
  console.log('Workflow completed:', result.status);
});
```

#### `workflow:error`

Called on workflow error.

```javascript
hooks.hook('workflow:error', async (context, error) => {
  console.error('Workflow failed:', error);
});
```

#### `step:before`

Called before step execution.

```javascript
hooks.hook('step:before', async (context, step) => {
  console.log('Running step:', step.name);
});
```

#### `step:after`

Called after step execution.

```javascript
hooks.hook('step:after', async (context, step, result) => {
  console.log('Step completed:', step.name, result.status);
});
```

#### `git:commit`

Called on Git commit.

```javascript
hooks.hook('git:commit', async (data) => {
  console.log('Commit:', data.sha, data.message);
});
```

#### `git:push`

Called on Git push.

```javascript
hooks.hook('git:push', async (data) => {
  console.log('Pushed to:', data.remote, data.branch);
});
```

### Using Hooks

```javascript
import { withGitVan, useHooks } from 'gitvan';

await withGitVan(context, async () => {
  const hooks = useHooks();

  // Register hook
  hooks.hook('workflow:before', async (ctx) => {
    console.log('Pre-workflow setup');
    // Custom logic
  });

  // Execute workflow (triggers hooks)
  const workflow = useWorkflow();
  await workflow.execute('my-workflow');
});
```

---

## Type Definitions

### GitStatus

```typescript
interface GitStatus {
  branch: string;
  commit: string;
  modified: string[];
  staged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}
```

### WorkflowResult

```typescript
interface WorkflowResult {
  status: 'success' | 'failure' | 'timeout';
  duration: number;
  steps: StepResult[];
  error?: Error;
}

interface StepResult {
  name: string;
  status: 'success' | 'failure' | 'skipped';
  duration: number;
  output?: string;
  error?: Error;
}
```

### AuditRecord

```typescript
interface AuditRecord {
  action: string;
  status: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

### PackInfo

```typescript
interface PackInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies: Record<string, string>;
}
```

---

For more examples and guides, see:
- [Getting Started Guide](./GETTING_STARTED.md)
- [Advanced Workflows](./ADVANCED_WORKFLOWS.md)
- [Pack Development](./PACK_DEVELOPMENT.md)

**GitVan v1.0.0** API Reference
