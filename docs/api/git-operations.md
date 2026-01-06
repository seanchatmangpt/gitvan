# Git Operations API Reference

Complete reference for all 30+ Git lifecycle operations in GitVan v3.

## Table of Contents

1. [Commit Operations](#commit-operations)
2. [Branch Operations](#branch-operations)
3. [Merge Operations](#merge-operations)
4. [Stash Operations](#stash-operations)
5. [Cherry-Pick & Revert](#cherry-pick--revert)
6. [Rebase Operations](#rebase-operations)
7. [Reset Operations](#reset-operations)
8. [Tag Operations](#tag-operations)
9. [Diff & Patch Operations](#diff--patch-operations)
10. [Reflog Operations](#reflog-operations)
11. [Bisect Operations](#bisect-operations)
12. [Blame & History](#blame--history)
13. [Submodule Operations](#submodule-operations)
14. [Remote Operations](#remote-operations)

---

## Commit Operations

### Basic Commit Operations

#### `commit(message, options)`

Create a new commit with the given message.

```javascript
import { useGit } from 'gitvan';

const git = useGit();

// Simple commit
await git.commit('feat: add new feature');

// Signed commit
await git.commit('feat: add new feature', { sign: true });
```

**Parameters:**
- `message` (string): Commit message
- `options` (object):
  - `sign` (boolean): Sign commit with GPG

#### `amendCommit(options)`

Amend the last commit.

```javascript
// Amend without changing message
await git.amendCommit({ edit: false });

// Amend with new message
await git.amendCommit({ message: 'fix: corrected feature' });

// Amend and stage all changes
await git.amendCommit({ all: true, message: 'Updated commit' });
```

**Parameters:**
- `options` (object):
  - `message` (string): New commit message
  - `edit` (boolean): Open editor for message
  - `all` (boolean): Stage all changes
  - `sign` (boolean): Sign the commit

#### `verifyCommit(commit)`

Verify GPG signature of a commit.

```javascript
const result = await git.verifyCommit('HEAD');
// Returns: { verified: true, output: '...' }

const badResult = await git.verifyCommit('abc123');
// Returns: { verified: false, error: 'verification failed' }
```

**Parameters:**
- `commit` (string): Commit to verify (default: "HEAD")

**Returns:** `{ verified: boolean, output?: string, error?: string }`

#### `rewordCommit(commit, newMessage)`

Change the commit message.

```javascript
// Reword HEAD commit
await git.rewordCommit('HEAD', 'fix: corrected typo in commit message');
```

**Note:** Only supports HEAD commit programmatically. Other commits require interactive rebase.

#### `createFixup(targetCommit, options)`

Create a fixup commit for later auto-squashing.

```javascript
// Create fixup for specific commit
await git.createFixup('abc123');

// With all changes
await git.createFixup('abc123', { all: true });
```

#### `createSquash(targetCommit, options)`

Create a squash commit for later auto-squashing.

```javascript
await git.createSquash('abc123', {
  message: 'Additional changes',
  all: true
});
```

### Commit Query Operations

#### `log(format, extra)`

Get commit log with custom format.

```javascript
// Default format
const log = await git.log();

// Custom format
const log = await git.log('%H%x09%an%x09%s');

// With extra args
const log = await git.log('%h%x09%s', ['--since=2024-01-01', '--author=John']);
```

#### `showCommit(commit, options)`

Show details of a commit.

```javascript
// Show with diff
const details = await git.showCommit('HEAD');

// Show with stats
const details = await git.showCommit('HEAD', { stat: true });

// Show without patch
const details = await git.showCommit('HEAD', { patch: false });
```

#### `getCommitMessage(commit)`

Get commit message only.

```javascript
const message = await git.getCommitMessage('HEAD');
```

#### `getCommitAuthor(commit)`

Get commit author information.

```javascript
const author = await git.getCommitAuthor('HEAD');
// Returns: { name: 'John Doe', email: 'john@example.com' }
```

---

## Branch Operations

### Basic Branch Operations

#### `branchCreate(name, startPoint, options)`

Create a new branch.

```javascript
// Create from HEAD
await git.branchCreate('feature/new');

// Create from specific commit
await git.branchCreate('feature/new', 'abc123');

// Force create
await git.branchCreate('feature/new', 'HEAD', { force: true });

// Create with tracking
await git.branchCreate('feature/new', 'origin/main', { track: true });
```

#### `branchDelete(name, options)`

Delete a branch.

```javascript
// Safe delete (only if merged)
await git.branchDelete('feature/old');

// Force delete
await git.branchDelete('feature/old', { force: true });
```

#### `branchRename(oldName, newName, options)`

Rename a branch.

```javascript
// Rename branch
await git.branchRename('old-name', 'new-name');

// Force rename
await git.branchRename('old-name', 'new-name', { force: true });
```

#### `branchCopy(source, destination, options)`

Copy a branch.

```javascript
// Copy branch
await git.branchCopy('main', 'main-backup');

// Force copy
await git.branchCopy('main', 'main-backup', { force: true });
```

#### `branchList(options)`

List branches.

```javascript
// Local branches
const branches = await git.branchList();

// All branches (local and remote)
const branches = await git.branchList({ all: true });

// Remote branches
const branches = await git.branchList({ remote: true });

// Merged branches
const branches = await git.branchList({ merged: true });
```

### Branch Tracking Operations

#### `setUpstream(branch, upstream, options)`

Set upstream tracking for a branch.

```javascript
// Set upstream
await git.setUpstream('feature/new', 'origin/feature/new');

// Unset upstream
await git.setUpstream('feature/new', null, { unset: true });
```

#### `getUpstream(branch)`

Get upstream branch.

```javascript
const upstream = await git.getUpstream('main');
// Returns: 'origin/main' or null
```

#### `getTrackingStatus(branch)`

Get detailed tracking status.

```javascript
const status = await git.getTrackingStatus('main');
// Returns: {
//   tracking: true,
//   upstream: 'origin/main',
//   ahead: 2,
//   behind: 1,
//   inSync: false
// }
```

#### `branchesWithTracking()`

Get all branches with their tracking information.

```javascript
const branches = await git.branchesWithTracking();
// Returns: [
//   {
//     name: 'main',
//     upstream: 'origin/main',
//     ahead: 0,
//     behind: 0,
//     inSync: true
//   },
//   ...
// ]
```

#### `branchExists(name)`

Check if a branch exists.

```javascript
if (await git.branchExists('feature/new')) {
  console.log('Branch exists');
}
```

#### `currentBranch()`

Get current branch name.

```javascript
const current = await git.currentBranch();
// Returns: 'main' or null (if detached HEAD)
```

---

## Merge Operations

### Basic Merge

#### `merge(ref, options)`

Merge a branch or commit.

```javascript
// Simple merge
await git.merge('feature/new');

// No fast-forward
await git.merge('feature/new', { noff: true });

// Fast-forward only
await git.merge('feature/new', { ff: true });

// Squash merge
await git.merge('feature/new', { squash: true });

// With message
await git.merge('feature/new', { message: 'Merge feature X' });
```

### Merge Strategies

#### `mergeWithStrategy(ref, strategy, options)`

Merge with specific strategy.

```javascript
// Recursive strategy (default)
await git.mergeRecursive('feature/new');

// Ours strategy
await git.mergeOurs('feature/new');

// Subtree strategy
await git.mergeSubtree('feature/new');
```

#### `mergeOctopus(refs, options)`

Merge multiple branches (octopus merge).

```javascript
await git.mergeOctopus(['feature/a', 'feature/b', 'feature/c']);
```

### Conflict Handling

#### `mergeAbort()`

Abort current merge.

```javascript
await git.mergeAbort();
```

#### `hasConflicts()`

Check if there are merge conflicts.

```javascript
if (await git.hasConflicts()) {
  console.log('Conflicts detected');
}
```

#### `getConflictedFiles()`

Get list of conflicted files.

```javascript
const files = await git.getConflictedFiles();
// Returns: ['src/index.js', 'src/utils.js']
```

#### `resolveConflict(file, strategy)`

Resolve conflict using strategy.

```javascript
// Use our version
await git.resolveConflict('src/index.js', 'ours');

// Use their version
await git.resolveConflict('src/index.js', 'theirs');
```

#### `resolveAllConflicts(strategy)`

Resolve all conflicts with same strategy.

```javascript
const resolved = await git.resolveAllConflicts('ours');
// Returns: ['src/index.js', 'src/utils.js']
```

#### `getMergeStatus()`

Get current merge status.

```javascript
const status = await git.getMergeStatus();
// Returns: {
//   inProgress: true,
//   mergeHead: 'abc123',
//   hasConflicts: true,
//   conflictedFiles: ['src/index.js']
// }
```

#### `needsMerge(branch, targetBranch)`

Check if merge is needed.

```javascript
if (await git.needsMerge('feature/new', 'main')) {
  console.log('Merge required');
}
```

---

## Stash Operations

#### `stashSave(message, options)`

Save changes to stash.

```javascript
// Simple stash
await git.stashSave('Work in progress');

// Include untracked files
await git.stashSave('WIP', { includeUntracked: true });

// Keep index
await git.stashSave('WIP', { keepIndex: true });
```

#### `stashList()`

List all stashes.

```javascript
const stashes = await git.stashList();
// Returns: ['stash@{0}: WIP on main: abc123', ...]
```

#### `stashApply(stash, options)`

Apply stashed changes.

```javascript
// Apply latest stash
await git.stashApply();

// Apply specific stash
await git.stashApply('stash@{2}');

// Pop (apply and remove)
await git.stashApply('stash@{0}', { pop: true });
```

#### `stashDrop(stash)`

Remove stash.

```javascript
await git.stashDrop('stash@{0}');
```

---

## Cherry-Pick & Revert

#### `cherryPick(commit, options)`

Cherry-pick a commit.

```javascript
// Simple cherry-pick
await git.cherryPick('abc123');

// Without commit
await git.cherryPick('abc123', { noCommit: true });

// Continue after conflict
await git.cherryPick(null, { continue: true });

// Abort
await git.cherryPick(null, { abort: true });
```

#### `revert(commit, options)`

Revert a commit.

```javascript
// Revert commit
await git.revert('abc123');

// Without commit
await git.revert('abc123', { noCommit: true });

// Revert merge commit (specify mainline)
await git.revert('abc123', { mainline: 1 });
```

---

## Rebase Operations

#### `rebase(onto, options)`

Rebase current branch.

```javascript
// Simple rebase
await git.rebase('origin/main');

// Interactive rebase
await git.rebase('origin/main', { interactive: true });

// Continue after conflict
await git.rebase(null, { continue: true });

// Abort rebase
await git.rebase(null, { abort: true });

// Skip current commit
await git.rebase(null, { skip: true });

// Auto-squash fixup commits
await git.rebase('origin/main', { autosquash: true });
```

---

## Reset Operations

#### `reset(mode, ref, options)`

Reset to specific state.

```javascript
// Soft reset (keep changes in staging)
await git.reset('soft', 'HEAD~1');

// Mixed reset (keep changes in working directory)
await git.reset('mixed', 'HEAD~1');

// Hard reset (discard all changes)
await git.reset('hard', 'HEAD~1');

// Reset specific files
await git.reset('mixed', 'HEAD', { paths: ['src/index.js'] });
```

---

## Tag Operations

#### `tag(name, message, options)`

Create a tag.

```javascript
// Lightweight tag
await git.tag('v1.0.0');

// Annotated tag
await git.tag('v1.0.0', 'Version 1.0.0');

// Signed tag
await git.tag('v1.0.0', 'Version 1.0.0', { sign: true });
```

---

## Diff & Patch Operations

### Diff Operations

#### `diff(options)`

Get diff output.

```javascript
// Working directory changes
const diff = await git.diff();

// Staged changes
const diff = await git.diff({ staged: true });

// Between commits
const diff = await git.diff({ from: 'abc123', to: 'def456' });

// Specific files
const diff = await git.diff({ files: ['src/index.js'] });

// Name only
const diff = await git.diff({ nameOnly: true });

// With stats
const diff = await git.diff({ stat: true });
```

#### `changedFiles(from, to)`

Get list of changed files.

```javascript
const files = await git.changedFiles('HEAD~1', 'HEAD');
// Returns: ['src/index.js', 'src/utils.js']
```

#### `diffStats(from, to)`

Get detailed diff statistics.

```javascript
const stats = await git.diffStats('HEAD~5', 'HEAD');
// Returns: {
//   files: [
//     { file: 'src/index.js', changes: 25, insertions: 20, deletions: 5 }
//   ],
//   totalInsertions: 45,
//   totalDeletions: 12,
//   totalFiles: 3
// }
```

### Patch Operations

#### `generatePatch(options)`

Generate patch content.

```javascript
// Patch for working changes
const patch = await git.generatePatch();

// Patch between commits
const patch = await git.generatePatch({
  from: 'HEAD~3',
  to: 'HEAD'
});

// Patch for specific files
const patch = await git.generatePatch({
  files: ['src/index.js']
});
```

#### `applyPatch(patchContent, options)`

Apply a patch.

```javascript
// Apply patch
await git.applyPatch(patchContent);

// Check if can apply (dry run)
await git.applyPatch(patchContent, { check: true });

// Apply in reverse
await git.applyPatch(patchContent, { reverse: true });

// Apply to index only
await git.applyPatch(patchContent, { index: true });

// Save rejected hunks
await git.applyPatch(patchContent, { reject: true });
```

#### `applyPatchFile(patchFilePath, options)`

Apply patch from file.

```javascript
await git.applyPatchFile('/path/to/file.patch');
```

#### `formatPatch(options)`

Create formatted patch files.

```javascript
// Create patches for last 3 commits
const patches = await git.formatPatch({ count: 3 });

// Create patches between commits
const patches = await git.formatPatch({
  from: 'v1.0.0',
  to: 'HEAD'
});

// Output to directory
await git.formatPatch({
  count: 5,
  outputDir: '/tmp/patches'
});

// Output to stdout
const patchContent = await git.formatPatch({
  count: 1,
  stdout: true
});
```

#### `canApplyPatch(patchContent)`

Check if patch can be applied.

```javascript
if (await git.canApplyPatch(patchContent)) {
  await git.applyPatch(patchContent);
}
```

---

## Reflog Operations

#### `reflog(ref, options)`

View reflog entries.

```javascript
// View HEAD reflog
const log = await git.reflog();

// View specific ref
const log = await git.reflog('refs/heads/main');

// Limit entries
const log = await git.reflog('HEAD', { count: 10 });

// All refs
const log = await git.reflog(null, { all: true });
```

#### `getReflogEntries(ref, options)`

Get structured reflog data.

```javascript
const entries = await git.getReflogEntries('HEAD', { limit: 50 });
// Returns: [
//   { hash: 'abc123', selector: 'HEAD@{0}', message: 'commit: ...' },
//   ...
// ]
```

#### `getHistoryByTime(options)`

Get commits in time range.

```javascript
// Last 7 days
const commits = await git.getHistoryByTime({ since: '7 days ago' });

// Specific date range
const commits = await git.getHistoryByTime({
  since: '2024-01-01',
  until: '2024-01-31'
});

// Returns: [
//   { hash: 'abc123', subject: '...', author: '...', date: '...' },
//   ...
// ]
```

#### `recoverCommit(selector, options)`

Recover lost commit.

```javascript
// Get commit hash
const hash = await git.recoverCommit('HEAD@{5}');

// Create recovery branch
const hash = await git.recoverCommit('HEAD@{5}', {
  createBranch: true,
  branchName: 'recovered-work'
});
```

#### `expireReflog(options)`

Expire old reflog entries.

```javascript
// Expire entries older than 90 days
await git.expireReflog({ expire: '90.days.ago' });

// Dry run
await git.expireReflog({ expire: '30.days.ago', dryRun: true });
```

---

## Bisect Operations

#### `startBisect(options)`

Start binary search for bug.

```javascript
// Start bisect
await git.startBisect({
  bad: 'HEAD',
  good: 'v1.0.0'
});

// Bisect specific paths
await git.startBisect({
  bad: 'HEAD',
  good: 'v1.0.0',
  paths: ['src/']
});
```

#### `markGood(commit)` / `markBad(commit)`

Mark commits during bisect.

```javascript
// Mark current as good
await git.markGood();

// Mark specific commit as good
await git.markGood('abc123');

// Mark current as bad
await git.markBad();
```

#### `skipCommit(commit)`

Skip untestable commit.

```javascript
await git.skipCommit();
```

#### `resetBisect()`

End bisect session.

```javascript
await git.resetBisect();
```

#### `getBisectStatus()`

Get current bisect state.

```javascript
const status = await git.getBisectStatus();
// Returns: {
//   active: true,
//   good: ['abc123', 'def456'],
//   bad: ['xyz789'],
//   current: 'current-commit'
// }
```

#### `runAutoBisect(options)`

Automated bisect with test script.

```javascript
const result = await git.runAutoBisect({
  script: './test.sh',
  good: 'v1.0.0',
  bad: 'HEAD'
});
// Returns: { culprit: 'abc123', steps: 7, output: '...' }
```

---

## Blame & History

#### `blame(file, options)`

Get line-by-line authorship.

```javascript
// Blame file
const blame = await git.blame('src/index.js');

// Blame specific lines
const blame = await git.blame('src/index.js', {
  startLine: 10,
  endLine: 20
});

// Detect moved/copied lines
const blame = await git.blame('src/index.js', {
  detectMoved: true,
  detectCopied: true
});

// Ignore whitespace
const blame = await git.blame('src/index.js', {
  ignoreWhitespace: true
});
```

#### `getBlameData(file, options)`

Get structured blame data.

```javascript
const data = await git.getBlameData('src/index.js');
// Returns: [
//   {
//     line: 1,
//     hash: 'abc123',
//     author: 'John Doe',
//     date: '2024-01-15T10:30:00Z',
//     content: 'import foo from "bar";'
//   },
//   ...
// ]
```

#### `getCommitHistory(file, options)`

Get commit history for file.

```javascript
// Full history
const history = await git.getCommitHistory('src/index.js');

// With date range
const history = await git.getCommitHistory('src/index.js', {
  since: '2024-01-01',
  until: '2024-12-31'
});

// Limited number
const history = await git.getCommitHistory('src/index.js', {
  limit: 10
});

// Don't follow renames
const history = await git.getCommitHistory('src/index.js', {
  follow: false
});
```

#### `getAuthorsOfFile(file, options)`

Get authors who modified file.

```javascript
// Simple list
const authors = await git.getAuthorsOfFile('src/index.js');
// Returns: ['John Doe', 'Jane Smith']

// With statistics
const authors = await git.getAuthorsOfFile('src/index.js', {
  withStats: true
});
// Returns: [
//   {
//     name: 'John Doe',
//     commits: 15,
//     additions: 234,
//     deletions: 45,
//     totalLines: 279
//   },
//   ...
// ]
```

#### `getFilesByAuthor(author, options)`

Get files modified by author.

```javascript
const files = await git.getFilesByAuthor('john@example.com');

// With date range
const files = await git.getFilesByAuthor('john@example.com', {
  since: '2024-01-01',
  until: '2024-12-31'
});
```

#### `getFileOwnership(file)`

Get ownership statistics for file.

```javascript
const ownership = await git.getFileOwnership('src/index.js');
// Returns: {
//   primaryOwner: { name: 'John Doe', percentage: 65 },
//   contributors: [
//     { name: 'John Doe', lines: 150, percentage: 65 },
//     { name: 'Jane Smith', lines: 80, percentage: 35 }
//   ],
//   totalLines: 230
// }
```

#### `trackLineHistory(file, lineNumber)`

Track specific line's history.

```javascript
const history = await git.trackLineHistory('src/index.js', 42);
// Returns: {
//   currentCommit: 'abc123',
//   author: 'John Doe',
//   date: '2024-01-15',
//   message: 'fix: update function',
//   content: 'const foo = bar();'
// }
```

---

## Submodule Operations

#### `addSubmodule(url, path, options)`

Add a submodule.

```javascript
// Simple add
await git.addSubmodule('https://github.com/user/repo.git', 'lib/repo');

// With branch
await git.addSubmodule('https://github.com/user/repo.git', 'lib/repo', {
  branch: 'main'
});

// Shallow clone
await git.addSubmodule('https://github.com/user/repo.git', 'lib/repo', {
  depth: 1
});
```

#### `removeSubmodule(path, options)`

Remove a submodule.

```javascript
await git.removeSubmodule('lib/repo');

// Force removal
await git.removeSubmodule('lib/repo', { force: true });
```

#### `updateSubmodules(options)`

Update submodules.

```javascript
// Initialize and update
await git.updateSubmodules({ init: true });

// Recursive update
await git.updateSubmodules({ recursive: true });

// Update to latest remote
await git.updateSubmodules({ remote: true });

// Specific submodules
await git.updateSubmodules({
  paths: ['lib/repo1', 'lib/repo2']
});
```

#### `listSubmodules(options)`

List all submodules.

```javascript
const submodules = await git.listSubmodules();
// Returns: [
//   { status: ' ', commit: 'abc123', path: 'lib/repo', description: '...' },
//   ...
// ]

// Recursive
const submodules = await git.listSubmodules({ recursive: true });
```

#### `getSubmoduleStatus(path)`

Get submodule status.

```javascript
const status = await git.getSubmoduleStatus('lib/repo');
// Returns: {
//   initialized: true,
//   upToDate: true,
//   hasChanges: false,
//   hasConflicts: false,
//   commit: 'abc123',
//   path: 'lib/repo',
//   branch: 'main'
// }
```

#### `syncSubmodules(paths)`

Sync submodule URLs.

```javascript
// Sync all
await git.syncSubmodules();

// Sync specific
await git.syncSubmodules(['lib/repo1']);
```

#### `setSubmoduleBranch(path, branch)`

Set tracked branch for submodule.

```javascript
await git.setSubmoduleBranch('lib/repo', 'develop');
```

#### `setSubmoduleUrl(path, url)`

Update submodule URL.

```javascript
await git.setSubmoduleUrl('lib/repo', 'https://github.com/user/new-repo.git');
```

#### `foreachSubmodule(command, options)`

Execute command in all submodules.

```javascript
// Run command
await git.foreachSubmodule('git status');

// Recursive
await git.foreachSubmodule('git pull', { recursive: true });
```

---

## Remote Operations

#### `fetch(remote, refspec, options)`

Fetch from remote.

```javascript
// Simple fetch
await git.fetch();

// Fetch all remotes
await git.fetch(null, null, { all: true });

// Fetch with prune
await git.fetch('origin', null, { prune: true });

// Fetch tags
await git.fetch('origin', null, { tags: true });
```

#### `push(remote, ref, options)`

Push to remote.

```javascript
// Push current branch
await git.push();

// Push specific branch
await git.push('origin', 'feature/new');

// Force push
await git.push('origin', 'main', { force: true });

// Set upstream
await git.push('origin', 'feature/new', { setUpstream: true });

// Push tags
await git.push('origin', null, { tags: true });
```

#### `pull(remote, branch, options)`

Pull from remote.

```javascript
// Simple pull
await git.pull();

// Pull with rebase
await git.pull('origin', 'main', { rebase: true });

// Fast-forward only
await git.pull('origin', 'main', { ff: true });
```

---

## Error Handling

All operations may throw errors. Wrap in try-catch:

```javascript
try {
  await git.merge('feature/new');
} catch (error) {
  if (await git.hasConflicts()) {
    console.error('Merge conflicts detected');
    const files = await git.getConflictedFiles();
    console.log('Conflicted files:', files);
  }
}
```

---

## Complete Coverage Summary

**Commit Operations (10):**
- commit, amendCommit, verifyCommit, rewordCommit
- createFixup, createSquash, showCommit
- getCommitMessage, getCommitAuthor, log

**Branch Operations (11):**
- branchCreate, branchDelete, branchRename, branchCopy
- branchList, setUpstream, getUpstream
- getTrackingStatus, branchesWithTracking
- branchExists, currentBranch

**Merge Operations (12):**
- merge, mergeAbort, mergeWithStrategy
- mergeRecursive, mergeOctopus, mergeOurs, mergeSubtree
- hasConflicts, getConflictedFiles, resolveConflict
- resolveAllConflicts, getMergeStatus, needsMerge

**Stash Operations (4):**
- stashSave, stashList, stashApply, stashDrop

**Cherry-Pick & Revert (2):**
- cherryPick, revert

**Rebase Operations (1):**
- rebase

**Reset Operations (1):**
- reset

**Tag Operations (1):**
- tag

**Diff & Patch Operations (10):**
- diff, changedFiles, diffStats
- generatePatch, applyPatch, applyPatchFile
- formatPatch, canApplyPatch, diffWithContext

**Reflog Operations (6):**
- reflog, getReflogEntries, getHistoryByTime
- recoverCommit, expireReflog, deleteReflog

**Bisect Operations (9):**
- startBisect, markGood, markBad, skipCommit
- resetBisect, getBisectStatus, runAutoBisect
- visualizeBisect, bisectLog

**Blame & History (8):**
- blame, getBlameData, getCommitHistory
- getAuthorsOfFile, getFilesByAuthor
- getFileOwnership, trackLineHistory

**Submodule Operations (10):**
- addSubmodule, removeSubmodule, updateSubmodules
- listSubmodules, getSubmoduleStatus, syncSubmodules
- setSubmoduleBranch, setSubmoduleUrl, foreachSubmodule

**Remote Operations (3):**
- fetch, push, pull

**Total: 88 Git Operations**

---

**Last Updated:** January 6, 2026
**Version:** GitVan v3.0.0
