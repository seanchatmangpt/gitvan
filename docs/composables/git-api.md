# GitVan v2 - Git Composables API Reference

## Repository Operations (`repo.mjs`)

### `root()`
Returns the absolute path to the repository root directory.

```javascript
const root = await git.root();
// Returns: "/Users/sac/gitvan"
```

### `headSha()`
Returns the SHA hash of the current HEAD commit.

```javascript
const headSha = await git.headSha();
// Returns: "67fc8482c90f76e004d640a65290858e60320c36"
```

### `currentRef()`
Returns the current branch name or "HEAD" if in detached state.

```javascript
const currentRef = await git.currentRef();
// Returns: "main"
```

### `status()`
Returns the repository status in porcelain format.

```javascript
const status = await git.status();
// Returns: "M  src/composables/git.mjs\n?? new-file.txt"
```

### `isClean()`
Checks if the working directory is clean (no uncommitted changes).

```javascript
const isClean = await git.isClean();
// Returns: false
```

### `hasUncommittedChanges()`
Checks if there are uncommitted changes in the working directory.

```javascript
const hasChanges = await git.hasUncommittedChanges();
// Returns: true
```

### `nowISO()`
Returns the current timestamp in ISO format, respecting context time.

```javascript
const now = git.nowISO();
// Returns: "2025-09-17T07:55:03.135Z"
```

### `info()`
Returns comprehensive repository information.

```javascript
const info = await git.info();
// Returns: {
//   head: "67fc8482c90f76e004d640a65290858e60320c36",
//   branch: "main",
//   worktree: "/Users/sac/gitvan",
//   isClean: false,
//   hasUncommittedChanges: true
// }
```

### `worktreeGitDir()`
Returns the path to the Git directory for the current worktree.

```javascript
const gitDir = await git.worktreeGitDir();
// Returns: "/Users/sac/gitvan/.git"
```

## Commit Operations (`commits.mjs`)

### `log(format, extra)`
Returns commit log with custom format.

```javascript
const log = await git.log("%h %s", ["--max-count=5"]);
// Returns: "67fc848 getting near ready for prod\n031b602 docs: Add useWorktree composable"
```

### `logSinceLastTag(format)`
Returns commits since the last tag.

```javascript
const log = await git.logSinceLastTag("%h %s");
// Returns: "67fc848 getting near ready for prod"
```

### `isAncestor(a, b)`
Checks if commit A is an ancestor of commit B.

```javascript
const isAncestor = await git.isAncestor("HEAD~1", "HEAD");
// Returns: true
```

### `mergeBase(a, b)`
Finds the merge base between two commits.

```javascript
const mergeBase = await git.mergeBase("feature-branch", "main");
// Returns: "abc123def456..."
```

### `revList(args)`
Returns commit list using rev-list.

```javascript
const commits = await git.revList(["--max-count=10", "HEAD"]);
// Returns: "67fc8482c90f76e004d640a65290858e60320c36\n031b602..."
```

### `getCommitCount(branch)`
Returns the number of commits in a branch.

```javascript
const count = await git.getCommitCount("main");
// Returns: 32
```

### `describeLastTag()`
Describes the last tag.

```javascript
const lastTag = await git.describeLastTag();
// Returns: "v1.0.0"
```

### `shortlog(range)`
Returns shortlog for release notes.

```javascript
const shortlog = await git.shortlog("v1.0.0..HEAD");
// Returns: "5\tSean Chatman"
```

### `trailers(range)`
Returns commit trailers for release notes.

```javascript
const trailers = await git.trailers("HEAD~5..HEAD");
// Returns: "Signed-off-by: Sean Chatman <sean@example.com>"
```

## Diff Operations (`diff.mjs`)

### `diff(options)`
Returns diff output with various options.

```javascript
const diff = await git.diff({ 
  from: "HEAD~1", 
  to: "HEAD", 
  nameOnly: true 
});
// Returns: "src/composables/git.mjs\nREADME.md"
```

### `changedFiles(from, to)`
Returns list of changed files between commits.

```javascript
const files = await git.changedFiles("HEAD~1", "HEAD");
// Returns: ["src/composables/git.mjs", "README.md"]
```

### `diffNames(from, to)`
Returns file names from diff.

```javascript
const names = await git.diffNames("HEAD~1", "HEAD");
// Returns: ["src/composables/git.mjs", "README.md"]
```

### `pathsChanged(globs, from, to)`
Filters changed paths by glob patterns.

```javascript
const jsFiles = await git.pathsChanged(["*.js", "*.mjs"], "HEAD~1", "HEAD");
// Returns: ["src/composables/git.mjs"]
```

## Branch Operations (`branches.mjs`)

### `branchList(options)`
Lists branches with various options.

```javascript
const branches = await git.branchList({ all: true });
// Returns: ["main", "feature/new-feature"]
```

### `branchCreate(name, startPoint, options)`
Creates a new branch.

```javascript
await git.branchCreate("feature/new-feature", "HEAD", { track: true });
```

### `branchDelete(name, options)`
Deletes a branch.

```javascript
await git.branchDelete("feature/old-feature", { force: true });
```

### `checkout(ref, options)`
Checks out a reference.

```javascript
await git.checkout("feature/new-feature", { create: true });
```

### `switch(branch, options)`
Switches to a branch.

```javascript
await git.switch("feature/new-feature", { create: true });
```

## Tag Operations (`tags.mjs`)

### `tagList(options)`
Lists tags with options.

```javascript
const tags = await git.tagList({ sort: "version:refname" });
// Returns: ["v1.0.0", "v1.1.0"]
```

### `tagCreate(name, msg, options)`
Creates a tag.

```javascript
await git.tagCreate("v1.1.0", "Release v1.1.0", { sign: true });
```

### `pushTags(remote)`
Pushes tags to remote.

```javascript
await git.pushTags("origin");
```

## Notes Operations (`notes.mjs`)

### `noteAdd(ref, message, sha)`
Adds a note to a commit.

```javascript
await git.noteAdd(undefined, "Build successful", "HEAD");
// Uses default NOTES_REF
```

### `noteAppend(ref, message, sha)`
Appends to an existing note.

```javascript
await git.noteAppend(undefined, "Additional info", "HEAD");
```

### `noteShow(ref, sha)`
Shows note content.

```javascript
const note = await git.noteShow(undefined, "HEAD");
// Returns: "Build successful"
```

### `notesList(ref)`
Lists all notes.

```javascript
const notes = await git.notesList();
// Returns: ["HEAD", "HEAD~1"]
```

### Constants
- `NOTES_REF = "refs/notes/gitvan/results"` - Default notes reference

## Reference Operations (`refs.mjs`)

### `listRefs(pattern)`
Lists references matching pattern.

```javascript
const refs = await git.listRefs("refs/heads/");
// Returns: ["refs/heads/main", "refs/heads/feature/new-feature"]
```

### `getRef(ref)`
Gets reference value.

```javascript
const ref = await git.getRef("HEAD");
// Returns: "67fc8482c90f76e004d640a65290858e60320c36 HEAD"
```

### `updateRef(ref, valueSha)`
Updates a reference.

```javascript
await git.updateRef("refs/heads/main", "new-sha");
```

### `updateRefCreate(ref, valueSha)`
Atomically creates a reference if it doesn't exist.

```javascript
const created = await git.updateRefCreate("refs/locks/build", "sha");
// Returns: true if created, false if already exists
```

## Worktree Operations (`worktrees.mjs`)

### `listWorktrees()`
Lists all worktrees.

```javascript
const worktrees = await git.listWorktrees();
// Returns: [{
//   path: "/Users/sac/gitvan",
//   head: "67fc8482c90f76e004d640a65290858e60320c36",
//   branch: "main",
//   isMain: true
// }]
```

### `worktreeAdd(path, branch, options)`
Adds a new worktree.

```javascript
await git.worktreeAdd("/path/to/worktree", "feature-branch", { checkout: true });
```

### `worktreeRemove(path, options)`
Removes a worktree.

```javascript
await git.worktreeRemove("/path/to/worktree", { force: true });
```

### `worktreePrune(options)`
Prunes worktrees.

```javascript
await git.worktreePrune({ dryRun: true });
```

## Remote Operations (`remotes.mjs`)

### `fetch(remote, refspec, options)`
Fetches from remote.

```javascript
await git.fetch("origin", "", { prune: true, tags: true });
```

### `push(remote, ref, options)`
Pushes to remote.

```javascript
await git.push("origin", "HEAD", { setUpstream: true });
```

### `pull(remote, branch, options)`
Pulls from remote.

```javascript
await git.pull("origin", "main", { rebase: true });
```

### `defaultRemote()`
Gets the default remote.

```javascript
const remote = await git.defaultRemote();
// Returns: "origin"
```

## Merge/Rebase/Reset Operations (`merge_rebase_reset.mjs`)

### `merge(ref, options)`
Merges a reference.

```javascript
await git.merge("feature-branch", { noff: true });
```

### `rebase(onto, options)`
Rebases onto a reference.

```javascript
await git.rebase("origin/main", { interactive: true });
```

### `reset(mode, ref, options)`
Resets to a reference.

```javascript
await git.reset("hard", "HEAD~1");
```

## Stash Operations (`stash.mjs`)

### `stashPush(message, options)`
Pushes to stash.

```javascript
await git.stashPush("WIP: working on feature", { includeUntracked: true });
```

### `stashList()`
Lists stashes.

```javascript
const stashes = await git.stashList();
// Returns: ["stash@{0}: WIP: working on feature"]
```

### `stashApply(stash, options)`
Applies a stash.

```javascript
await git.stashApply("stash@{0}", { pop: true });
```

### `stashDrop(stash)`
Drops a stash.

```javascript
await git.stashDrop("stash@{0}");
```

## Cherry-pick/Revert Operations (`cherry_revert.mjs`)

### `cherryPick(commit, options)`
Cherry-picks a commit.

```javascript
await git.cherryPick("abc123", { noCommit: true });
```

### `revert(commit, options)`
Reverts a commit.

```javascript
await git.revert("abc123", { noCommit: true });
```

## Plumbing Operations (`plumbing.mjs`)

### `hashObject(filePath, options)`
Hashes an object.

```javascript
const hash = await git.hashObject("file.txt", { write: true });
// Returns: "abc123def456..."
```

### `writeTree()`
Writes a tree object.

```javascript
const tree = await git.writeTree();
// Returns: "abc123def456..."
```

### `catFile(sha)`
Pretty prints an object.

```javascript
const content = await git.catFile("abc123");
// Returns: "tree abc123\n..."
```

### `revParse(ref)`
Parses a reference.

```javascript
const sha = await git.revParse("HEAD");
// Returns: "67fc8482c90f76e004d640a65290858e60320c36"
```

## Generic Runner

### `run(args)`
Runs a Git command and returns output.

```javascript
const output = await git.run(["rev-parse", "--abbrev-ref", "HEAD"]);
// Returns: "main"
```

### `runVoid(args)`
Runs a Git command with no return value.

```javascript
await git.runVoid(["add", "file.txt"]);
```

## Context Properties

### `cwd`
Current working directory.

```javascript
const cwd = git.cwd;
// Returns: "/Users/sac/gitvan"
```

### `env`
Environment variables.

```javascript
const env = git.env;
// Returns: { TZ: "UTC", LANG: "C", ... }
```
