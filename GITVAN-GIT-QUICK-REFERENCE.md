# GitVan Git Operations - Quick Reference Guide

## Importing useGit

```javascript
import { useGit } from "@gitvan/composables";
// or
import { useGit } from "./src/composables/git.mjs";
```

## Basic Repository Operations

```javascript
const git = useGit();

// Get repo info
const branch = await git.branch();
const head = await git.head();
const root = await git.repoRoot();
const clean = await git.isClean();
const info = await git.info();

// Get status
const status = await git.statusPorcelain();
const hasChanges = await git.hasUncommittedChanges();
```

## Working with Files

```javascript
// Stage files
await git.add("file.js");
await git.add(["src/", "package.json"]);

// Write file to disk
await git.writeFile("path/to/file.js", content);

// Commit
await git.commit("feat: add new feature");
await git.commit("fix: critical bug", { sign: true }); // GPG signed
```

## Branch Operations

```javascript
// List branches
const branches = await git.branchList();
const allBranches = await git.branchList({ all: true });
const remoteBranches = await git.branchList({ remote: true });

// Create branch
await git.branchCreate("feature/new-feature");
await git.branchCreate("fix/bug-123", "origin/develop");

// Switch branches
await git.checkout("main");
await git.switch("feature/new-feature");

// Delete branch
await git.branchDelete("feature/done");
await git.branchDelete("feature/force-delete", { force: true });
```

## Merging & Rebasing

```javascript
// Merge
await git.merge("feature/auth");
await git.merge("feature/auth", { noff: true }); // No-FF merge
await git.merge("feature/auth", { squash: true }); // Squash merge
await git.merge("feature/auth", { message: "Merge feature" });

// Rebase
await git.rebase("main");
await git.rebase("origin/main", { continue: true }); // Continue after conflict
await git.rebase("main", { abort: true }); // Abort rebase
```

## Cherry-pick, Revert, Reset

```javascript
// Cherry-pick
await git.cherryPick("abc123");
await git.cherryPick("abc123", { noCommit: true });

// Revert
await git.revert("abc123");
await git.revert("abc123", { noCommit: true });

// Reset
await git.reset("soft", "HEAD~1"); // Keep changes staged
await git.reset("mixed", "HEAD~1"); // Keep changes unstaged (default)
await git.reset("hard", "HEAD~1"); // Discard changes
```

## Remote Operations

```javascript
// Fetch
await git.fetch("origin");
await git.fetch("origin", "main");
await git.fetch("origin", "", { all: true, tags: true, prune: true });

// Push
await git.push("origin", "main");
await git.push("origin", "feature/new", { setUpstream: true });
await git.push("origin", "main", { force: true }); // Force push
await git.push("origin", "main", { tags: true }); // Push tags

// Pull
await git.pull("origin", "main");
await git.pull("origin", "main", { rebase: true });
await git.pull("origin", "main", { squash: true });
```

## Tags

```javascript
// List tags
const tags = await git.tagList();

// Create tag
await git.tag("v1.0.0", "Release version 1.0.0");
await git.tag("v1.0.0", "Release version 1.0.0", { sign: true });

// Delete tag
await git.tagDelete("v1.0.0");
```

## Stash Operations

```javascript
// Save stash
await git.stashSave("WIP: feature in progress");
await git.stashSave("WIP", { includeUntracked: true });

// List stashes
const stashes = await git.stashList();

// Apply/Pop stash
await git.stashApply("stash@{0}");
await git.stashApply("stash@{0}", { pop: true });

// Drop stash
await git.stashDrop("stash@{0}");
```

## Worktrees

```javascript
// List worktrees
const worktrees = await git.listWorktrees();

// Add worktree
await git.worktreeAdd("../feature-branch", "feature/new");

// Remove worktree
await git.worktreeRemove("../feature-branch");
```

## Git History & Diffs

```javascript
// Get logs
const log = await git.log();
const customLog = await git.log("%h %s %an");
const logSince = await git.logSinceLastTag();

// Get diffs
const diff = await git.diff();
const diffStaged = await git.diff({ staged: true });
const diffStat = await git.diff({ stat: true });
const diffFiles = await git.diff({ nameOnly: true });
const rangeDiff = await git.diff({ from: "main", to: "HEAD" });
```

## Notes & References (For Receipts/Metadata)

```javascript
// Add notes (audit trail)
await git.noteAdd("refs/gitvan/receipts", "Job execution successful", "HEAD");

// Show notes
const note = await git.noteShow("refs/gitvan/receipts", "HEAD");

// References
const refs = await git.listRefs();
const customRefs = await git.listRefs("refs/gitvan/*");

// Get specific ref
const ref = await git.getRef("refs/heads/main");

// Atomic ref creation (for distributed locks)
const acquired = await git.updateRefCreate("refs/gitvan/locks/build", "abc123");
```

## Git Plumbing (Low-level)

```javascript
// Hash file object
const hash = await git.hashObject("file.js");
const hashWrite = await git.hashObject("file.js", { write: true });

// Write tree
const treeHash = await git.writeTree();

// Cat file
const content = await git.catFilePretty("abc123");
```

## Advanced Queries

```javascript
// Check ancestry
const isAncestor = await git.isAncestor("main", "feature/branch");

// Get merge base
const mergeBase = await git.mergeBase("main", "develop");

// Get commit count
const count = await git.getCommitCount("main");
const countAll = await git.getCommitCount("HEAD");

// Revision list
const revs = await git.revList();
const customRevs = await git.revList(["--all", "--oneline"]);
```

## Error Handling

```javascript
try {
  await git.merge("feature/branch");
} catch (error) {
  if (error.message.includes("CONFLICT")) {
    console.log("Merge conflict occurred");
    // Handle conflict
  } else {
    console.error("Merge failed:", error.message);
  }
}
```

## Running Arbitrary Git Commands

```javascript
// Run git command and get output
const output = await git.run(["status", "--porcelain"]);

// Run git command without output
await git.runVoid(["config", "user.name", "John Doe"]);
```

## Using Hybrid Git (Test vs Production)

```javascript
import { useHybridGit } from "@gitvan/composables";

// For unit tests - MemFS backend (fast, isolated)
const hybrid = await useHybridGit({ backend: "memfs" });
await hybrid.useMemFS();

// For integration tests - Native Git backend
const hybrid = await useHybridGit({ backend: "native" });
await hybrid.useNative();

// Auto-select based on environment
const hybrid = await useHybridGit({ backend: "auto" });
```

## Context-Aware Execution

```javascript
import { useGit } from "@gitvan/composables";
import { withGitVan } from "@gitvan/core/context";

// With context
await withGitVan({ cwd: "/path/to/repo" }, async () => {
  const git = useGit();
  const branch = await git.branch();
});

// Without context (uses process.cwd())
const git = useGit();
const branch = await git.branch();
```

## Using useReceipt() for Audit Trails

```javascript
import { useReceipt } from "@gitvan/composables";

const receipt = useReceipt();

// Create receipt
const rec = await receipt.create({
  jobId: "build-123",
  status: "success",
  startTime: Date.now(),
  endTime: Date.now(),
});
```

## Using useLock() for Distributed Locking

```javascript
import { useLock } from "@gitvan/composables";

const lock = useLock();

// Acquire lock
const acquired = await lock.acquire("build", { timeout: 60000 });
if (acquired) {
  try {
    // Do work...
  } finally {
    await lock.release("build");
  }
}
```

## Common Patterns

### Safe Commit with Validation

```javascript
async function safeCommit(message) {
  if (await git.hasUncommittedChanges()) {
    await git.add(["."]); // Add all changes
    await git.commit(message);
    return true;
  }
  return false;
}
```

### Release Flow

```javascript
async function release(version) {
  // Create release branch
  await git.branchCreate(`release/${version}`);
  await git.checkout(`release/${version}`);
  
  // Commit version bump
  await git.commit(`chore: bump version to ${version}`);
  
  // Create tag
  await git.tag(`v${version}`, `Release ${version}`);
  
  // Merge back to main
  await git.checkout("main");
  await git.merge(`release/${version}`);
  
  // Push all
  await git.push("origin", "main");
  await git.push("origin", "main", { tags: true });
}
```

### Feature Branch with Sync

```javascript
async function createFeature(featureName) {
  // Update main
  await git.checkout("main");
  await git.pull("origin", "main");
  
  // Create feature branch
  await git.branchCreate(featureName, "main");
  await git.checkout(featureName);
  
  // Push to remote
  await git.push("origin", featureName, { setUpstream: true });
}
```

### Cleanup Branches

```javascript
async function cleanupMergedBranches() {
  const merged = await git.branchList({ merged: true });
  for (const branch of merged) {
    if (branch !== "main" && branch !== "develop") {
      await git.branchDelete(branch);
    }
  }
}
```

---

**Note**: All operations are async/await based. Always use `await` with git operations.

For more details, see **GITVAN-GIT-CAPABILITIES-SUMMARY.md**
