# GitVan Public API Documentation

**Version:** 3.1.0 (with v4.0.0 preview)
**Last Updated:** 2026-01-08

## Table of Contents

1. [Overview](#overview)
2. [Core Composables](#core-composables)
3. [Context Management](#context-management)
4. [Runtime APIs](#runtime-apis)
5. [Job System](#job-system)
6. [Pack System](#pack-system)
7. [Git-Native I/O](#git-native-io)
8. [Configuration](#configuration)
9. [V4 API Preview](#v4-api-preview)
10. [Testing Utilities](#testing-utilities)

---

## Overview

GitVan's public API is primarily composable-based, following Vue's composition API pattern. All composables must be used within a `withGitVan()` context wrapper due to `unctx` async context preservation.

### Entry Points

- **Main API:** `import { ... } from "gitvan"`
- **V4 API:** `import { ... } from "gitvan/v4"`
- **Testing:** `import { ... } from "gitvan/testing"` (planned)

---

## Core Composables

All composables follow the `use*` naming pattern and must be called within `withGitVan()`.

### useGit()

Git operations composable.

```javascript
import { withGitVan, useGit } from "gitvan";

await withGitVan(context, async () => {
  const git = useGit();

  // Get repository status
  const status = await git.status();

  // Create a commit
  await git.commit("feat: add new feature");

  // Create a branch
  await git.branch("feature/new");

  // Push to remote
  await git.push({ remote: "origin", branch: "main" });
});
```

**Methods:**
- `status()` - Get repository status
- `commit(message)` - Create a commit
- `branch(name)` - Create a branch
- `merge(branch)` - Merge a branch
- `push(options)` - Push to remote
- `pull(options)` - Pull from remote
- `checkout(ref)` - Checkout a reference
- `log(options)` - Get commit history

**Usage:** 43 imports (core API)

---

### useTemplate()

Template rendering with Nunjucks.

```javascript
import { withGitVan, useTemplate } from "gitvan";

await withGitVan(context, async () => {
  const template = useTemplate();

  // Render a template
  const output = await template.render("job-template.njk", {
    name: "myJob",
    description: "My job description"
  });

  // Add custom filter
  template.addFilter("uppercase", (str) => str.toUpperCase());
});
```

**Methods:**
- `render(templatePath, data)` - Render template with data
- `compile(templateString)` - Compile template string
- `addFilter(name, fn)` - Add custom filter
- `addGlobal(name, value)` - Add global variable

**Usage:** 15 imports

---

### useJob()

Job execution and scheduling.

```javascript
import { withGitVan, useJob } from "gitvan";

await withGitVan(context, async () => {
  const job = useJob();

  // Execute a job
  const result = await job.execute("build-job");

  // Schedule a job
  await job.schedule("daily-sync", "0 2 * * *");

  // Get job status
  const status = await job.status("build-job");
});
```

**Methods:**
- `execute(jobName, options)` - Execute a job
- `schedule(jobName, cronSchedule)` - Schedule a job
- `status(jobName)` - Get job status
- `cancel(jobName)` - Cancel a running job

**Usage:** 10 imports

---

### useFileSystem()

File system operations.

```javascript
import { withGitVan, useFileSystem } from "gitvan";

await withGitVan(context, async () => {
  const fs = useFileSystem();

  // Read file
  const content = await fs.read("path/to/file.txt");

  // Write file
  await fs.write("path/to/output.txt", "content");

  // Check if exists
  const exists = await fs.exists("path/to/file.txt");

  // List directory
  const files = await fs.list("path/to/directory");
});
```

**Methods:**
- `read(path)` - Read file content
- `write(path, content)` - Write file content
- `exists(path)` - Check if file exists
- `list(path)` - List directory contents
- `delete(path)` - Delete file or directory
- `copy(src, dest)` - Copy file or directory
- `move(src, dest)` - Move file or directory

---

### useNotes()

Git notes operations.

```javascript
import { withGitVan, useNotes } from "gitvan";

await withGitVan(context, async () => {
  const notes = useNotes();

  // Add note to commit
  await notes.add("HEAD", "This is a note", { ref: "refs/notes/commits" });

  // Get notes for commit
  const note = await notes.get("HEAD", { ref: "refs/notes/commits" });

  // List all notes
  const allNotes = await notes.list({ ref: "refs/notes/commits" });
});
```

**Methods:**
- `add(commit, message, options)` - Add note
- `get(commit, options)` - Get note
- `list(options)` - List notes
- `remove(commit, options)` - Remove note

**Usage:** 10 imports

---

### useWorktree()

Git worktree management.

```javascript
import { withGitVan, useWorktree } from "gitvan";

await withGitVan(context, async () => {
  const worktree = useWorktree();

  // Create worktree
  await worktree.create("path/to/worktree", "branch-name");

  // List worktrees
  const worktrees = await worktree.list();

  // Remove worktree
  await worktree.remove("path/to/worktree");

  // Prune stale worktrees
  await worktree.prune();
});
```

**Methods:**
- `create(path, branch)` - Create worktree
- `list()` - List worktrees
- `remove(path)` - Remove worktree
- `prune()` - Prune stale worktrees

---

### useEvent()

Event system for triggering workflows.

```javascript
import { withGitVan, useEvent } from "gitvan";

await withGitVan(context, async () => {
  const event = useEvent();

  // Emit event
  await event.emit("workflow:triggered", { workflow: "build" });

  // Listen for event
  event.on("workflow:triggered", async (data) => {
    console.log("Workflow triggered:", data.workflow);
  });

  // Listen once
  event.once("workflow:completed", async (data) => {
    console.log("Workflow completed:", data);
  });
});
```

**Methods:**
- `emit(eventName, data)` - Emit event
- `on(eventName, handler)` - Listen for event
- `once(eventName, handler)` - Listen for event once
- `off(eventName, handler)` - Remove event listener

---

### useSchedule()

Cron-based scheduling.

```javascript
import { withGitVan, useSchedule } from "gitvan";

await withGitVan(context, async () => {
  const schedule = useSchedule();

  // Schedule a task
  const taskId = await schedule.add("daily-task", "0 2 * * *", async () => {
    console.log("Running daily task");
  });

  // Remove scheduled task
  await schedule.remove(taskId);

  // List scheduled tasks
  const tasks = await schedule.list();
});
```

**Methods:**
- `add(name, cronExpression, handler)` - Schedule task
- `remove(taskId)` - Remove scheduled task
- `list()` - List scheduled tasks

---

### useReceipt()

Audit trail and receipt management.

```javascript
import { withGitVan, useReceipt } from "gitvan";

await withGitVan(context, async () => {
  const receipt = useReceipt();

  // Write receipt
  await receipt.write({
    operation: "workflow-execution",
    data: { workflow: "build", status: "success" },
    timestamp: new Date().toISOString()
  });

  // Read receipts
  const receipts = await receipt.read({ operation: "workflow-execution" });

  // Verify receipt integrity
  const isValid = await receipt.verify(receiptId);
});
```

**Methods:**
- `write(data)` - Write receipt
- `read(query)` - Read receipts
- `verify(receiptId)` - Verify receipt integrity

**Usage:** 6 imports

---

### useLock()

Distributed locking for concurrent operations.

```javascript
import { withGitVan, useLock } from "gitvan";

await withGitVan(context, async () => {
  const lock = useLock();

  // Acquire lock
  const lockId = await lock.acquire("resource-name");

  try {
    // Do work while holding lock
    await doWork();
  } finally {
    // Always release lock
    await lock.release(lockId);
  }

  // Or use withLock helper
  await lock.withLock("resource-name", async () => {
    await doWork();
  });
});
```

**Methods:**
- `acquire(resourceName, options)` - Acquire lock
- `release(lockId)` - Release lock
- `extend(lockId, ttl)` - Extend lock TTL
- `withLock(resourceName, fn)` - Execute with lock

---

### usePack()

Pack (plugin) management.

```javascript
import { withGitVan, usePack } from "gitvan";

await withGitVan(context, async () => {
  const pack = usePack();

  // Install pack
  await pack.install("gitvan-pack-ci");

  // List installed packs
  const packs = await pack.list();

  // Remove pack
  await pack.remove("gitvan-pack-ci");

  // Get pack info
  const info = await pack.info("gitvan-pack-ci");
});
```

**Methods:**
- `install(packName, options)` - Install pack
- `remove(packName)` - Remove pack
- `list()` - List installed packs
- `info(packName)` - Get pack information

---

### useUnrouting()

URL routing and path matching.

```javascript
import { withGitVan, useUnrouting } from "gitvan";

await withGitVan(context, async () => {
  const router = useUnrouting();

  // Define route
  router.on("/workflow/:id", async (params) => {
    console.log("Workflow ID:", params.id);
  });

  // Match route
  const matched = router.match("/workflow/123");
});
```

**Methods:**
- `on(pattern, handler)` - Define route
- `match(path)` - Match path to route

---

## Context Management

### withGitVan()

Context wrapper for async-safe composable usage.

```javascript
import { withGitVan } from "gitvan";

const context = createGitVan({ cwd: process.cwd() });

await withGitVan(context, async () => {
  // All composables work here
  const git = useGit();
  await git.status();
});
```

**Usage:** 38 imports (critical infrastructure)

---

### useGitVan()

Get current GitVan context (must be inside `withGitVan()`).

```javascript
import { withGitVan, useGitVan } from "gitvan";

await withGitVan(context, async () => {
  const ctx = useGitVan();

  console.log("Current repo:", ctx.repo);
  console.log("Config:", ctx.config);
});
```

**Returns:**
- `repo` - Repository path
- `config` - GitVan configuration
- `hookable` - Hook system

**Usage:** 51 imports (most used composable)

---

### tryUseGitVan()

Safe context access (returns null if outside context).

```javascript
import { tryUseGitVan } from "gitvan";

function someFunction() {
  const ctx = tryUseGitVan();

  if (ctx) {
    // Inside GitVan context
    console.log("Repo:", ctx.repo);
  } else {
    // Outside context
    console.log("No GitVan context");
  }
}
```

**Usage:** 19 imports

---

## Runtime APIs

### boot()

Initialize GitVan runtime.

```javascript
import { boot } from "gitvan";

const gitvan = await boot({
  cwd: process.cwd(),
  config: {
    jobs: { dir: "jobs" },
    templates: { dirs: ["templates"] }
  }
});
```

---

### createGitVan()

Create GitVan context instance.

```javascript
import { createGitVan } from "gitvan";

const context = await createGitVan({
  cwd: process.cwd(),
  gitDir: ".git"
});
```

---

### defineJob()

Define a job programmatically.

```javascript
import { defineJob } from "gitvan";

export default defineJob({
  name: "build",
  description: "Build the project",
  handler: async (ctx) => {
    console.log("Building...");
    return { status: "success" };
  }
});
```

**Usage:** 24 imports

---

## Job System

### JobRunner

Execute jobs.

```javascript
import { JobRunner } from "gitvan";

const runner = new JobRunner(config);
const result = await runner.execute("build-job", context);
```

---

### scanJobs()

Scan directory for job definitions.

```javascript
import { scanJobs } from "gitvan";

const jobs = await scanJobs("jobs");
console.log("Found jobs:", jobs);
```

---

## Pack System

### Pack

Pack definition class.

```javascript
import { Pack } from "gitvan";

const pack = new Pack({
  name: "my-pack",
  version: "1.0.0",
  templates: ["templates/*.njk"],
  jobs: ["jobs/*.mjs"]
});
```

---

### PackManager

Manage pack lifecycle.

```javascript
import { PackManager } from "gitvan";

const manager = new PackManager(config);
await manager.install("gitvan-pack-ci");
await manager.list();
```

---

### PackRegistry

Pack discovery and search.

```javascript
import { PackRegistry } from "gitvan";

const registry = new PackRegistry();
const packs = await registry.search({ tags: ["ci"] });
```

---

## Git-Native I/O

### GitNativeIO

Git-based storage operations.

```javascript
import { GitNativeIO } from "gitvan";

const io = new GitNativeIO({ repoPath: ".git" });
await io.write("key", "value");
const value = await io.read("key");
```

---

### LockManager

Distributed locking.

```javascript
import { LockManager } from "gitvan";

const lockManager = new LockManager({ repoPath: ".git" });
const lock = await lockManager.acquire("resource");
await lockManager.release(lock);
```

---

## Configuration

### loadOptions()

Load GitVan configuration.

```javascript
import { loadOptions } from "gitvan";

const config = await loadOptions({ cwd: process.cwd() });
```

---

### GitVanDefaults

Default configuration values.

```javascript
import { GitVanDefaults } from "gitvan";

console.log("Default job dir:", GitVanDefaults.jobs.dir);
```

---

## V4 API Preview

GitVan v4 introduces a hooks-based reactive API compatible with `@unrdf/hooks`.

### Core Hooks

```javascript
import { useState, useEffect, useMemo } from "gitvan/v4";

const [count, setCount] = useState(0);

useEffect(() => {
  console.log("Count changed:", count);
}, [count]);

const doubled = useMemo(() => count * 2, [count]);
```

---

### Signals

```javascript
import { signal, computed, effect } from "gitvan/v4";

const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => {
  console.log("Count:", count.value);
});

count.value = 10; // Triggers effect
```

---

### Context & DI

```javascript
import { createContext, provide, inject } from "gitvan/v4";

const LoggerToken = token("logger");

const context = createContext();
provide(context, LoggerToken, console);

runInContext(context, () => {
  const logger = inject(LoggerToken);
  logger.log("Hello!");
});
```

---

## Testing Utilities

### useTestEnvironment()

Create isolated test environment.

```javascript
import { useTestEnvironment, withTestEnvironment } from "gitvan";

await withTestEnvironment(async (env) => {
  const git = useGit();
  // Isolated git operations for testing
  await git.commit("test commit");
});
```

**Note:** Currently exported in main API, but should be moved to `gitvan/testing`.

---

## Export Summary

### Main API (`gitvan`)

**Composables:** 19
- useGit, useFileSystem, useTemplate, useNotes, useWorktree
- useJob, useEvent, useSchedule
- useReceipt, useLock, usePack, useUnrouting
- useGitVan, withGitVan, tryUseGitVan
- useTestEnvironment, withTestEnvironment (to be moved)

**Classes:** 16
- Pack, PackManager, PackApplier, PackPlanner, PackRegistry
- GitNativeIO, LockManager, SnapshotStore, QueueManager, WorkerPool
- GitVanContext, GitVanHookable, JobRegistry
- JobRunner, GitVanDaemon

**Functions:** 8
- boot, createGitVan, defineJob, scanJobs
- loadOptions, loadPackManifest, validateManifest
- cli, main

**Total:** ~43 public exports

### V4 API (`gitvan/v4`)

**Hooks:** ~30
**Utilities:** ~50
**Classes:** ~15
**Total:** ~95 exports (future API)

---

## Best Practices

1. **Always use `withGitVan()`** - Required for async context preservation
2. **Composables are context-aware** - Don't call outside `withGitVan()`
3. **Use `tryUseGitVan()`** - When context might not exist
4. **Follow naming patterns** - `use*` for composables
5. **Prefer composables** - Over direct class instantiation

---

## Deprecation Policy

- **V3 API:** Stable, supported
- **V4 API:** Preview, subject to change
- **V2 API:** Deprecated, use V3

---

## Migration Guide

See:
- `/docs/migration/v2-to-v3.md`
- `/docs/migration/v3-to-v4.md`

---

**Last Updated:** 2026-01-08
**Maintainer:** GitVan Core Team
