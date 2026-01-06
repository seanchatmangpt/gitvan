# GitVan Complete API Reference

> **Version:** 3.0.0
> **Last Updated:** January 6, 2026

Complete API documentation for all GitVan composables, methods, and utilities.

## Table of Contents

- [Core Composables](#core-composables)
  - [useGit](#usegit)
  - [useFileSystem](#usefilesystem)
  - [useWorktree](#useworktree)
  - [useTemplate](#usetemplate)
  - [useNotes](#usenotes)
- [Job & Event System](#job--event-system)
  - [useJob](#usejob)
  - [useEvent](#useevent)
  - [useSchedule](#useschedule)
- [Infrastructure](#infrastructure)
  - [useReceipt](#usereceipt)
  - [useLock](#uselock)
  - [useRegistry](#useregistry)
  - [usePack](#usepack)
- [Graph & RDF](#graph--rdf)
  - [useGraph](#usegraph)
  - [useTurtle](#useturtle)
- [Context Management](#context-management)
  - [withGitVan](#withgitvan)
  - [useGitVan](#usegitvan)

---

## Core Composables

### useGit

**Description:** Comprehensive Git operations within GitVan context. Provides POSIX-first implementation with no external dependencies.

**Import:**
```javascript
import { useGit } from 'gitvan/composables';
```

**Signature:**
```typescript
function useGit(options?: GitOptions): GitInterface

interface GitOptions {
  backend?: 'native' | 'memfs' | 'auto';
  hybrid?: boolean;
}

interface GitInterface {
  // Repository Info
  branch(): Promise<string>;
  head(): Promise<string>;
  headSha(): Promise<string>;
  repoRoot(): Promise<string>;
  worktreeGitDir(): Promise<string>;
  nowISO(): string;

  // Read Operations
  log(format?: string, extra?: string[]): Promise<string>;
  logSinceLastTag(format?: string): Promise<string>;
  statusPorcelain(): Promise<string>;
  isAncestor(a: string, b?: string): Promise<boolean>;
  mergeBase(a: string, b: string): Promise<string>;
  revList(args?: string[]): Promise<string>;

  // Write Operations
  add(paths: string | string[]): Promise<void>;
  writeFile(filePath: string, content: string): Promise<string>;
  commit(message: string, opts?: CommitOptions): Promise<void>;
  tag(name: string, msg?: string, opts?: TagOptions): Promise<void>;

  // Notes (Receipts)
  noteAdd(ref: string, message: string, sha?: string): Promise<void>;
  noteAppend(ref: string, message: string, sha?: string): Promise<void>;
  noteShow(ref: string, sha?: string): Promise<string>;

  // Refs
  updateRefCreate(ref: string, valueSha: string): Promise<boolean>;
  listRefs(pattern?: string): Promise<string[]>;
  getRef(ref: string): Promise<string | null>;

  // Plumbing
  hashObject(filePath: string, opts?: HashObjectOptions): Promise<string>;
  writeTree(): Promise<string>;
  catFilePretty(sha: string): Promise<string>;

  // Utility Methods
  isClean(): Promise<boolean>;
  hasUncommittedChanges(): Promise<boolean>;
  getCurrentBranch(): Promise<string>;
  getCommitCount(branch?: string): Promise<number>;
  info(): Promise<GitInfo>;

  // Worktrees
  listWorktrees(): Promise<Worktree[]>;

  // Diff Operations
  diff(options?: DiffOptions): Promise<string>;

  // Remote Operations
  fetch(remote?: string, refspec?: string, options?: FetchOptions): Promise<void>;
  push(remote?: string, ref?: string, options?: PushOptions): Promise<void>;
  pull(remote?: string, branch?: string, options?: PullOptions): Promise<void>;

  // Branch Operations
  branchList(options?: BranchListOptions): Promise<string[]>;
  branchCreate(name: string, startPoint?: string, options?: BranchCreateOptions): Promise<void>;
  branchDelete(name: string, options?: BranchDeleteOptions): Promise<void>;

  // Checkout/Switch
  checkout(ref: string, options?: CheckoutOptions): Promise<void>;
  switch(branch: string, options?: SwitchOptions): Promise<void>;

  // Merge/Rebase
  merge(ref: string, options?: MergeOptions): Promise<void>;
  rebase(onto?: string, options?: RebaseOptions): Promise<void>;

  // Reset
  reset(mode?: 'soft' | 'mixed' | 'hard', ref?: string, options?: ResetOptions): Promise<void>;

  // Stash
  stashSave(message?: string, options?: StashOptions): Promise<void>;
  stashList(): Promise<string[]>;
  stashApply(stash?: string, options?: StashApplyOptions): Promise<void>;
  stashDrop(stash?: string): Promise<void>;

  // Cherry-pick/Revert
  cherryPick(commit: string, options?: CherryPickOptions): Promise<void>;
  revert(commit: string, options?: RevertOptions): Promise<void>;

  // Generic Runner
  run(args: string | string[]): Promise<string>;
  runVoid(args: string | string[]): Promise<void>;
}
```

**Examples:**

```javascript
// Basic repository info
import { withGitVan, useGit } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();

  // Get current branch
  const branch = await git.branch();
  console.log(`Current branch: ${branch}`);

  // Check if working directory is clean
  const isClean = await git.isClean();
  console.log(`Working directory clean: ${isClean}`);

  // Get repository info
  const info = await git.info();
  console.log('Repo info:', info);
  /*
  {
    head: 'abc123...',
    branch: 'main',
    worktree: '/path/to/repo',
    isClean: true,
    hasUncommittedChanges: false
  }
  */
});
```

```javascript
// Making commits
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();

  // Stage files
  await git.add(['src/index.js', 'src/utils.js']);

  // Commit with message
  await git.commit('feat: add new utilities');

  // Create signed commit
  await git.commit('feat: secure feature', { sign: true });
});
```

```javascript
// Branch operations
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();

  // List all branches
  const branches = await git.branchList();
  console.log('Branches:', branches);

  // Create new branch
  await git.branchCreate('feature/new-feature');

  // Switch to branch
  await git.switch('feature/new-feature');

  // Delete branch (force)
  await git.branchDelete('old-branch', { force: true });
});
```

```javascript
// Working with notes
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();

  // Add note to current commit
  await git.noteAdd('refs/notes/gitvan/audit', 'Job executed successfully');

  // Append to existing note
  await git.noteAppend('refs/notes/gitvan/audit', 'Additional metadata');

  // Read note
  const note = await git.noteShow('refs/notes/gitvan/audit');
  console.log('Note:', note);
});
```

**Common Errors:**

- `Context not available` - You must use `useGit()` within `withGitVan()` context
- `Command failed: git ...` - Git command failed, check error.stderr for details
- `Object ${sha} not found` - Git object doesn't exist in repository

**Performance Tips:**

- Use `statusPorcelain()` instead of multiple status checks
- Batch `add()` operations with array of files
- Use `listRefs()` with pattern to filter refs
- Cache results of `info()` when making multiple queries

---

### useFileSystem

**Description:** File system operations with async/await support.

**Import:**
```javascript
import { useFileSystem } from 'gitvan/composables';
```

**Signature:**
```typescript
function useFileSystem(): FileSystemInterface

interface FileSystemInterface {
  read(filePath: string): Promise<string>;
  write(filePath: string, content: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  delete(filePath: string): Promise<void>;
  list(dirPath: string): Promise<string[]>;
  mkdir(dirPath: string, options?: MkdirOptions): Promise<void>;
  stat(filePath: string): Promise<Stats>;
  readJSON(filePath: string): Promise<any>;
  writeJSON(filePath: string, data: any): Promise<void>;
}
```

**Examples:**

```javascript
import { withGitVan, useFileSystem } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const fs = useFileSystem();

  // Read file
  const content = await fs.read('README.md');
  console.log(content);

  // Write file
  await fs.write('output.txt', 'Generated content');

  // Check if file exists
  const exists = await fs.exists('package.json');
  console.log(`package.json exists: ${exists}`);

  // Read JSON
  const pkg = await fs.readJSON('package.json');
  console.log(`Package name: ${pkg.name}`);

  // List directory
  const files = await fs.list('src');
  console.log('Source files:', files);
});
```

---

### useWorktree

**Description:** Git worktree management for parallel development.

**Import:**
```javascript
import { useWorktree } from 'gitvan/composables';
```

**Signature:**
```typescript
function useWorktree(): WorktreeInterface

interface WorktreeInterface {
  list(): Promise<Worktree[]>;
  add(name: string, branch: string, options?: AddOptions): Promise<Worktree>;
  remove(name: string, options?: RemoveOptions): Promise<void>;
  prune(): Promise<void>;
  getPath(name: string): Promise<string>;
  getBranch(name: string): Promise<string>;
}

interface Worktree {
  path: string;
  head: string;
  branch: string;
  detached?: boolean;
  isMain: boolean;
}
```

**Examples:**

```javascript
import { withGitVan, useWorktree, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const worktree = useWorktree();
  const job = useJob();

  // List existing worktrees
  const worktrees = await worktree.list();
  console.log('Worktrees:', worktrees);

  // Create new worktree for feature branch
  const featureWorktree = await worktree.add(
    'feature-worktree',
    'feature/new-feature'
  );
  console.log(`Created worktree at: ${featureWorktree.path}`);

  // Run job in worktree context
  await job.run('test-suite', {
    cwd: featureWorktree.path
  });

  // Clean up worktree
  await worktree.remove('feature-worktree');

  // Prune stale worktrees
  await worktree.prune();
});
```

---

### useTemplate

**Description:** Nunjucks template rendering with frontmatter support.

**Import:**
```javascript
import { useTemplate } from 'gitvan/composables';
```

**Signature:**
```typescript
function useTemplate(options?: TemplateOptions): Promise<TemplateInterface>

interface TemplateOptions {
  paths?: string[];
  autoescape?: boolean;
  noCache?: boolean;
}

interface TemplateInterface {
  render(template: string, data: object): Promise<string>;
  renderString(template: string, data: object): string;
  parseFrontmatter(file: string): Promise<{ data: object; body: string }>;
  plan(template: string, data: object): Promise<ExecutionPlan>;
  apply(plan: ExecutionPlan): Promise<ApplyResult>;
  renderAndApply(template: string, data: object): Promise<ApplyResult>;
}

interface ExecutionPlan {
  template: string;
  data: object;
  rendered: string;
  frontmatter?: object;
  actions?: Action[];
}

interface ApplyResult {
  success: boolean;
  artifacts: string[];
  receipt?: Receipt;
}
```

**Examples:**

```javascript
import { withGitVan, useTemplate } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const template = await useTemplate({
    paths: ['templates'],
    autoescape: false
  });

  // Render template file
  const result = await template.render('greeting.njk', {
    name: 'World',
    version: '1.0.0'
  });
  console.log(result);

  // Render string template
  const inline = template.renderString('Hello {{ name }}!', {
    name: 'GitVan'
  });
  console.log(inline); // "Hello GitVan!"

  // Parse frontmatter
  const { data, body } = await template.parseFrontmatter('job-template.md');
  console.log('Frontmatter:', data);
  console.log('Body:', body);

  // Create and apply execution plan
  const plan = await template.plan('job-template.njk', {
    jobName: 'backup',
    schedule: '0 2 * * *'
  });
  const applied = await template.apply(plan);
  console.log('Applied artifacts:', applied.artifacts);
});
```

---

### useNotes

**Description:** Git notes management for metadata and audit trails.

**Import:**
```javascript
import { useNotes } from 'gitvan/composables';
```

**Signature:**
```typescript
function useNotes(): NotesInterface

interface NotesInterface {
  add(ref: string, message: string, sha?: string): Promise<void>;
  append(ref: string, message: string, sha?: string): Promise<void>;
  show(ref: string, sha?: string): Promise<string>;
  remove(ref: string, sha?: string): Promise<void>;
  list(ref: string): Promise<Note[]>;
}

interface Note {
  sha: string;
  message: string;
  timestamp: string;
}
```

**Examples:**

```javascript
import { withGitVan, useNotes } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const notes = useNotes();

  // Add audit note
  await notes.add(
    'refs/notes/gitvan/audit',
    JSON.stringify({
      job: 'deploy',
      status: 'success',
      timestamp: new Date().toISOString()
    })
  );

  // Append additional info
  await notes.append(
    'refs/notes/gitvan/audit',
    'Deployment completed successfully'
  );

  // Read notes
  const note = await notes.show('refs/notes/gitvan/audit');
  console.log('Audit note:', note);

  // List all notes for ref
  const allNotes = await notes.list('refs/notes/gitvan/audit');
  console.log(`Found ${allNotes.length} audit notes`);
});
```

---

## Job & Event System

### useJob

**Description:** Job lifecycle management, execution, and discovery.

**Import:**
```javascript
import { useJob } from 'gitvan/composables';
```

**Signature:**
```typescript
function useJob(): JobInterface

interface JobInterface {
  // Discovery
  list(options?: ListOptions): Promise<Job[]>;
  get(jobId: string): Promise<JobDefinition>;
  exists(jobId: string): Promise<boolean>;

  // Execution
  run(jobId: string, options?: RunOptions): Promise<JobResult>;
  runWithLock(jobId: string, options?: RunOptions): Promise<JobResult>;

  // Validation
  validate(jobId: string): Promise<ValidationResult>;
  getFingerprint(jobId: string): Promise<string>;

  // Statistics
  getStats(): Promise<JobStats>;

  // Unrouting
  unroute(jobId: string): string;
  getDirectory(jobId: string): string;
  isInDirectory(jobId: string, directory: string): boolean;
}

interface Job {
  id: string;
  name: string;
  description: string;
  tags: string[];
  cron?: string;
  file: string;
  metadata?: object;
}

interface JobResult {
  success: boolean;
  output?: any;
  error?: Error;
  duration: number;
  artifacts?: string[];
}

interface JobStats {
  total: number;
  byTag: Record<string, number>;
  byStatus: Record<string, number>;
}
```

**Examples:**

```javascript
import { withGitVan, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const job = useJob();

  // List all jobs
  const jobs = await job.list();
  console.log(`Found ${jobs.length} jobs`);

  // Filter jobs by tag
  const cronJobs = await job.list({
    filter: { tags: ['cron'] }
  });
  console.log('Cron jobs:', cronJobs);

  // Get specific job
  const jobDef = await job.get('backup');
  console.log('Job definition:', jobDef);

  // Execute job
  const result = await job.run('backup', {
    payload: { target: 'production' }
  });

  if (result.success) {
    console.log('Job completed successfully');
    console.log('Artifacts:', result.artifacts);
  } else {
    console.error('Job failed:', result.error);
  }

  // Execute with distributed lock
  const lockedResult = await job.runWithLock('deploy', {
    payload: { environment: 'staging' }
  });

  // Get job statistics
  const stats = await job.getStats();
  console.log('Job statistics:', stats);

  // Unroute job ID
  const unroutedName = job.unroute('cron/daily-backup');
  console.log('Unrouted name:', unroutedName); // "daily-backup"
});
```

---

### useEvent

**Description:** Event system management, registration, and triggering.

**Import:**
```javascript
import { useEvent } from 'gitvan/composables';
```

**Signature:**
```typescript
function useEvent(): EventInterface

interface EventInterface {
  // Management
  list(options?: ListOptions): Promise<Event[]>;
  get(eventId: string): Promise<EventDefinition>;
  register(eventId: string, definition: EventDefinition): Promise<void>;
  unregister(eventId: string): Promise<void>;

  // Triggering
  trigger(eventId: string, context: object): Promise<EventResult>;
  simulate(eventId: string, context: object): Promise<SimulationResult>;

  // Statistics
  getStats(): Promise<EventStats>;

  // Unrouting
  unroute(eventId: string): string;
  unrouteCron(eventId: string): string;
  unrouteBranch(eventId: string): string;
  getCategory(eventId: string): string;
}

interface Event {
  id: string;
  name: string;
  description: string;
  type: 'cron' | 'merge' | 'commit' | 'custom';
  job: string;
}

interface EventResult {
  triggered: boolean;
  jobResult?: JobResult;
  error?: Error;
}
```

**Examples:**

```javascript
import { withGitVan, useEvent, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const event = useEvent();
  const job = useJob();

  // List all events
  const events = await event.list();
  console.log(`Found ${events.length} events`);

  // Register custom event
  await event.register('deploy-complete', {
    name: 'Deployment Complete',
    description: 'Triggered when deployment finishes',
    type: 'custom',
    job: 'notify-slack'
  });

  // Trigger event
  const result = await event.trigger('deploy-complete', {
    environment: 'production',
    version: '1.2.3'
  });

  console.log('Event triggered:', result.triggered);

  // Simulate event without executing
  const simulation = await event.simulate('deploy-complete', {
    environment: 'staging'
  });
  console.log('Would trigger jobs:', simulation.jobs);

  // Unroute cron expression
  const cronExpr = event.unrouteCron('cron/0_3_*_*_*');
  console.log('Cron expression:', cronExpr); // "0 3 * * *"

  // Get event statistics
  const stats = await event.getStats();
  console.log('Event statistics:', stats);
});
```

---

### useSchedule

**Description:** Cron scheduling and scheduler management.

**Import:**
```javascript
import { useSchedule } from 'gitvan/composables';
```

**Signature:**
```typescript
function useSchedule(): ScheduleInterface

interface ScheduleInterface {
  // Management
  list(options?: ListOptions): Promise<Schedule[]>;
  get(scheduleId: string): Promise<Schedule>;
  add(scheduleId: string, cron: string, jobId: string, options?: AddOptions): Promise<void>;
  update(scheduleId: string, updates: Partial<Schedule>): Promise<void>;
  remove(scheduleId: string): Promise<void>;

  // Execution
  run(scheduleId: string, context?: object): Promise<JobResult>;
  nextRun(scheduleId: string): Promise<Date>;

  // Scheduler Control
  startScheduler(): Promise<void>;
  stopScheduler(): Promise<void>;
  getSchedulerStatus(): Promise<SchedulerStatus>;
}

interface Schedule {
  id: string;
  name: string;
  cron: string;
  jobId: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}
```

**Examples:**

```javascript
import { withGitVan, useSchedule } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const schedule = useSchedule();

  // Add new schedule
  await schedule.add(
    'daily-backup',
    '0 2 * * *',  // 2 AM daily
    'backup-job',
    { enabled: true }
  );

  // List all schedules
  const schedules = await schedule.list();
  console.log('Schedules:', schedules);

  // Update schedule
  await schedule.update('daily-backup', {
    cron: '0 3 * * *',  // Change to 3 AM
    enabled: false
  });

  // Get next run time
  const nextRun = await schedule.nextRun('daily-backup');
  console.log('Next run:', nextRun);

  // Run schedule immediately
  const result = await schedule.run('daily-backup');
  console.log('Manual run result:', result);

  // Start scheduler daemon
  await schedule.startScheduler();

  // Check scheduler status
  const status = await schedule.getSchedulerStatus();
  console.log('Scheduler running:', status.running);

  // Stop scheduler
  await schedule.stopScheduler();
});
```

---

## Infrastructure

### useReceipt

**Description:** Receipt and audit trail management.

**Import:**
```javascript
import { useReceipt } from 'gitvan/composables';
```

**Signature:**
```typescript
function useReceipt(): ReceiptInterface

interface ReceiptInterface {
  // Management
  list(options?: ListOptions): Promise<Receipt[]>;
  get(receiptId: string): Promise<Receipt>;
  create(receiptData: ReceiptData): Promise<Receipt>;

  // Verification
  verify(receiptId: string): Promise<VerificationResult>;
  exists(receiptId: string): Promise<boolean>;

  // Statistics
  getStats(options?: StatsOptions): Promise<ReceiptStats>;
  generateFingerprint(receipt: Receipt): string;
}

interface Receipt {
  id: string;
  jobId: string;
  status: 'success' | 'error' | 'skipped';
  timestamp: string;
  artifacts?: string[];
  meta?: object;
  error?: {
    message: string;
    stack?: string;
  };
  fingerprint: string;
}

interface VerificationResult {
  valid: boolean;
  errors?: string[];
}
```

**Examples:**

```javascript
import { withGitVan, useReceipt, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const receipt = useReceipt();
  const job = useJob();

  // Execute job and create receipt
  try {
    const result = await job.run('deploy', {
      payload: { environment: 'production' }
    });

    const rec = await receipt.create({
      jobId: 'deploy',
      status: 'success',
      artifacts: result.artifacts,
      meta: {
        environment: 'production',
        duration: result.duration
      }
    });

    console.log('Receipt created:', rec.id);

  } catch (error) {
    // Create error receipt
    await receipt.create({
      jobId: 'deploy',
      status: 'error',
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }

  // List recent receipts
  const receipts = await receipt.list({ limit: 10 });
  console.log('Recent receipts:', receipts);

  // Verify receipt integrity
  const verification = await receipt.verify(rec.id);
  console.log('Receipt valid:', verification.valid);

  // Get statistics
  const stats = await receipt.getStats();
  console.log('Success rate:', stats.byStatus.success / stats.total);
});
```

---

### useLock

**Description:** Distributed locking for job coordination.

**Import:**
```javascript
import { useLock } from 'gitvan/composables';
```

**Signature:**
```typescript
function useLock(): LockInterface

interface LockInterface {
  // Lock Management
  list(): Promise<Lock[]>;
  acquire(lockName: string, options?: AcquireOptions): Promise<AcquireResult>;
  release(lockName: string): Promise<void>;

  // Lock Status
  isLocked(lockName: string): Promise<boolean>;
  getInfo(lockName: string): Promise<LockInfo>;
  getLockRef(lockName: string, gitInfo: GitInfo): string;
}

interface AcquireOptions {
  timeout?: number;  // milliseconds
  ttl?: number;      // milliseconds
}

interface AcquireResult {
  acquired: boolean;
  lockName: string;
  expiresAt?: Date;
}

interface Lock {
  name: string;
  acquiredAt: Date;
  expiresAt: Date;
  owner: string;
}
```

**Examples:**

```javascript
import { withGitVan, useLock, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const lock = useLock();
  const job = useJob();

  // Acquire lock
  const lockResult = await lock.acquire('deploy-lock', {
    timeout: 30000,  // 30 seconds
    ttl: 300000      // 5 minutes
  });

  if (lockResult.acquired) {
    try {
      console.log('Lock acquired, executing job...');

      await job.run('deploy', {
        payload: { environment: 'production' }
      });

    } finally {
      // Always release lock
      await lock.release('deploy-lock');
      console.log('Lock released');
    }
  } else {
    console.log('Could not acquire lock, job already running');
  }

  // Check lock status
  const isLocked = await lock.isLocked('deploy-lock');
  console.log('Lock held:', isLocked);

  // Get lock info
  if (isLocked) {
    const info = await lock.getInfo('deploy-lock');
    console.log('Lock owner:', info.owner);
    console.log('Expires at:', info.expiresAt);
  }

  // List all active locks
  const locks = await lock.list();
  console.log('Active locks:', locks);
});
```

---

### useRegistry

**Description:** Job and event registry management.

**Import:**
```javascript
import { useRegistry } from 'gitvan/composables';
```

**Signature:**
```typescript
function useRegistry(): RegistryInterface

interface RegistryInterface {
  // Statistics
  getStats(): Promise<RegistryStats>;

  // Search & Filter
  search(query: string): Promise<RegistryEntry[]>;
  filter(criteria: FilterCriteria): Promise<RegistryEntry[]>;

  // Validation
  validate(): Promise<ValidationResult>;
  isValid(id: string): Promise<boolean>;

  // Cache Management
  refresh(): Promise<void>;
}

interface RegistryStats {
  jobs: number;
  events: number;
  schedules: number;
  tags: Record<string, number>;
}

interface RegistryEntry {
  id: string;
  type: 'job' | 'event' | 'schedule';
  name: string;
  tags: string[];
  file: string;
}
```

**Examples:**

```javascript
import { withGitVan, useRegistry } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const registry = useRegistry();

  // Get registry statistics
  const stats = await registry.getStats();
  console.log('Registry stats:', stats);
  console.log(`Jobs: ${stats.jobs}, Events: ${stats.events}`);

  // Search registry
  const searchResults = await registry.search('backup');
  console.log('Search results:', searchResults);

  // Filter by criteria
  const cronJobs = await registry.filter({
    type: 'job',
    tags: ['cron']
  });
  console.log('Cron jobs:', cronJobs);

  // Validate registry
  const validation = await registry.validate();
  if (validation.valid) {
    console.log('Registry is valid');
  } else {
    console.error('Registry errors:', validation.errors);
  }

  // Check specific entry
  const isValid = await registry.isValid('deploy-job');
  console.log('Deploy job valid:', isValid);

  // Refresh cache
  await registry.refresh();
});
```

---

### usePack

**Description:** Pack (plugin) management system.

**Import:**
```javascript
import { usePack } from 'gitvan/composables';
```

**Signature:**
```typescript
function usePack(): PackInterface

interface PackInterface {
  // Pack Management
  list(): Promise<Pack[]>;
  get(packId: string): Promise<Pack>;
  install(packId: string, options?: InstallOptions): Promise<InstallResult>;
  uninstall(packId: string): Promise<void>;
  update(packId: string): Promise<UpdateResult>;

  // Pack Discovery
  search(query: string): Promise<Pack[]>;
  info(packId: string): Promise<PackInfo>;

  // Validation
  validate(packId: string): Promise<ValidationResult>;
}

interface Pack {
  id: string;
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  templates: string[];
  jobs: string[];
  workflows: string[];
}
```

**Examples:**

```javascript
import { withGitVan, usePack } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const pack = usePack();

  // List installed packs
  const packs = await pack.list();
  console.log('Installed packs:', packs);

  // Install pack
  const installResult = await pack.install('gitvan-pack-ci', {
    version: '1.0.0'
  });
  console.log('Pack installed:', installResult.success);

  // Get pack info
  const info = await pack.info('gitvan-pack-ci');
  console.log('Pack info:', info);
  console.log('Templates:', info.templates);
  console.log('Jobs:', info.jobs);

  // Update pack
  const updateResult = await pack.update('gitvan-pack-ci');
  console.log('Pack updated to:', updateResult.version);

  // Validate pack
  const validation = await pack.validate('gitvan-pack-ci');
  if (validation.valid) {
    console.log('Pack is valid');
  }

  // Search marketplace
  const searchResults = await pack.search('deployment');
  console.log('Available packs:', searchResults);

  // Uninstall pack
  await pack.uninstall('gitvan-pack-ci');
});
```

---

## Context Management

### withGitVan

**Description:** Establishes GitVan execution context for composables. **CRITICAL:** All composables must be used within this context.

**Import:**
```javascript
import { withGitVan } from 'gitvan';
```

**Signature:**
```typescript
function withGitVan<T>(
  context: GitVanContext,
  fn: () => Promise<T>
): Promise<T>

interface GitVanContext {
  cwd: string;
  env?: Record<string, string>;
  now?: () => string;
}
```

**Examples:**

```javascript
import { withGitVan, useGit, useJob } from 'gitvan';

// Basic usage
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  const branch = await git.branch();
  console.log('Branch:', branch);
});

// Custom environment
await withGitVan({
  cwd: '/path/to/repo',
  env: {
    ...process.env,
    CUSTOM_VAR: 'value'
  }
}, async () => {
  const job = useJob();
  await job.run('my-job');
});

// Deterministic time
await withGitVan({
  cwd: process.cwd(),
  now: () => '2027-01-01T00:00:00Z'
}, async () => {
  const git = useGit();
  console.log('Fixed time:', git.nowISO());
});

// Nested contexts
await withGitVan({ cwd: '/repo1' }, async () => {
  const git1 = useGit();
  const branch1 = await git1.branch();

  await withGitVan({ cwd: '/repo2' }, async () => {
    const git2 = useGit();
    const branch2 = await git2.branch();

    console.log('Repo 1:', branch1);
    console.log('Repo 2:', branch2);
  });
});
```

**Common Errors:**

```javascript
// ✗ WRONG - Context lost after await
const git = useGit();
await someAsyncCall();
await git.branch(); // ✗ CRASH - context gone!

// ✓ CORRECT - Context preserved
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  await someAsyncCall();
  await git.branch(); // ✓ Works!
});
```

---

### useGitVan

**Description:** Access current GitVan context. Must be called within `withGitVan()`.

**Import:**
```javascript
import { useGitVan } from 'gitvan';
```

**Signature:**
```typescript
function useGitVan(): GitVanContext

interface GitVanContext {
  cwd: string;
  env: Record<string, string>;
  now?: () => string;
}
```

**Examples:**

```javascript
import { withGitVan, useGitVan } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const ctx = useGitVan();

  console.log('Working directory:', ctx.cwd);
  console.log('Environment:', ctx.env);

  if (ctx.now) {
    console.log('Current time:', ctx.now());
  }
});
```

---

## Best Practices

### 1. Always Use Context

```javascript
// ✓ CORRECT
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  await git.branch();
});

// ✗ WRONG
const git = useGit(); // Context not available!
```

### 2. Handle Errors Gracefully

```javascript
await withGitVan({ cwd: process.cwd() }, async () => {
  const job = useJob();
  const receipt = useReceipt();

  try {
    const result = await job.run('deploy');
    await receipt.create({
      jobId: 'deploy',
      status: 'success'
    });
  } catch (error) {
    await receipt.create({
      jobId: 'deploy',
      status: 'error',
      error: { message: error.message }
    });
    throw error;
  }
});
```

### 3. Clean Up Resources

```javascript
await withGitVan({ cwd: process.cwd() }, async () => {
  const lock = useLock();
  const lockResult = await lock.acquire('my-lock');

  if (lockResult.acquired) {
    try {
      // Do work
    } finally {
      await lock.release('my-lock');
    }
  }
});
```

### 4. Batch Operations

```javascript
// ✓ Good - Single call
await git.add(['file1.js', 'file2.js', 'file3.js']);

// ✗ Bad - Multiple calls
await git.add('file1.js');
await git.add('file2.js');
await git.add('file3.js');
```

### 5. Use Type Hints

```javascript
/** @type {import('gitvan').JobResult} */
const result = await job.run('my-job');
```

---

## Performance Tips

1. **Cache Context**: Don't repeatedly call `useGitVan()` in loops
2. **Batch Git Operations**: Use array parameters when available
3. **Use Patterns with listRefs**: Filter refs at Git level, not in JavaScript
4. **Reuse Template Environments**: Don't create multiple `useTemplate()` instances
5. **Lock Timeouts**: Set appropriate timeouts to prevent deadlocks

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Context not available" | Not in `withGitVan()` | Wrap code in `withGitVan()` |
| "Command failed: git ..." | Git operation failed | Check `error.stderr` for details |
| "Job not found" | Invalid job ID | Verify job exists with `job.list()` |
| "Lock timeout" | Lock held too long | Increase timeout or check lock release |
| "Template not found" | Invalid template path | Verify template paths in config |

---

## See Also

- [CLI Reference](../cli/README.md)
- [Configuration Guide](../configuration.md)
- [Quick Start Guide](../quickstart.md)
- [Advanced Patterns](../advanced/patterns.md)
