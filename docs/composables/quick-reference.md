# GitVan v2 - Quick Reference

## Import

```javascript
import { useGit } from "./src/composables/git/index.mjs";
const git = useGit();
```

## Repository Info

```javascript
const root = await git.root();                    // "/Users/sac/gitvan"
const headSha = await git.headSha();             // "67fc8482c90f76e004d640a65290858e60320c36"
const currentRef = await git.currentRef();       // "main"
const status = await git.status();               // "M  file.txt\n?? new-file.txt"
const isClean = await git.isClean();             // false
const nowISO = git.nowISO();                     // "2025-09-17T07:55:03.135Z"
const info = await git.info();                   // { head, branch, worktree, isClean, hasUncommittedChanges }
```

## Commits

```javascript
const log = await git.log("%h %s", ["--max-count=5"]);
const commitCount = await git.getCommitCount();
const mergeBase = await git.mergeBase("branch1", "branch2");
const shortlog = await git.shortlog("v1.0.0..HEAD");
const trailers = await git.trailers("HEAD~5..HEAD");
```

## Diff

```javascript
const diff = await git.diff({ nameOnly: true });
const changedFiles = await git.changedFiles("HEAD~1", "HEAD");
const jsFiles = await git.pathsChanged(["*.js", "*.mjs"], "HEAD~1", "HEAD");
```

## Branches

```javascript
const branches = await git.branchList();
await git.branchCreate("feature/new-feature");
await git.branchDelete("feature/old-feature");
await git.checkout("feature/new-feature");
await git.switch("feature/new-feature");
```

## Tags

```javascript
const tags = await git.tagList();
await git.tagCreate("v1.1.0", "Release v1.1.0");
await git.pushTags("origin");
```

## Notes

```javascript
await git.noteAdd(undefined, "Build successful", "HEAD");  // Uses NOTES_REF
const notes = await git.notesList();
const note = await git.noteShow(undefined, "HEAD");
```

## References

```javascript
const refs = await git.listRefs("refs/heads/");
const ref = await git.getRef("HEAD");
await git.updateRef("refs/heads/main", "new-sha");
const created = await git.updateRefCreate("refs/locks/build", "sha");
```

## Worktrees

```javascript
const worktrees = await git.listWorktrees();
await git.worktreeAdd("/path/to/worktree", "feature-branch");
await git.worktreeRemove("/path/to/worktree");
await git.worktreePrune();
```

## Remotes

```javascript
await git.fetch("origin", "", { prune: true });
await git.push("origin", "HEAD", { setUpstream: true });
await git.pull("origin", "main", { rebase: true });
const remote = await git.defaultRemote();
```

## Merge/Rebase/Reset

```javascript
await git.merge("feature-branch", { noff: true });
await git.rebase("origin/main", { interactive: true });
await git.reset("hard", "HEAD~1");
```

## Stash

```javascript
await git.stashPush("WIP: working on feature");
const stashes = await git.stashList();
await git.stashApply("stash@{0}", { pop: true });
await git.stashDrop("stash@{0}");
```

## Cherry-pick/Revert

```javascript
await git.cherryPick("abc123", { noCommit: true });
await git.revert("abc123", { noCommit: true });
```

## Plumbing

```javascript
const hash = await git.hashObject("file.txt", { write: true });
const tree = await git.writeTree();
const content = await git.catFile("abc123");
const sha = await git.revParse("HEAD");
```

## Generic Runner

```javascript
const output = await git.run(["rev-parse", "--abbrev-ref", "HEAD"]);
await git.runVoid(["add", "file.txt"]);
```

## Context Properties

```javascript
const cwd = git.cwd;    // "/Users/sac/gitvan"
const env = git.env;    // { TZ: "UTC", LANG: "C", ... }
```

## Constants

```javascript
const NOTES_REF = git.NOTES_REF;  // "refs/notes/gitvan/results"
```

## Context Integration

```javascript
import { withGitVan } from "./src/core/context.mjs";

await withGitVan({ cwd: "/custom/path" }, async () => {
  const git = useGit();
  const root = await git.root();  // Returns "/custom/path"
});
```

## Error Handling

```javascript
try {
  const root = await git.root();
} catch (error) {
  console.error("Git operation failed:", error.message);
}
```

## Migration from v1

| Old Name | New Name |
|----------|----------|
| `head()` | `headSha()` |
| `repoRoot()` | `root()` |
| `statusPorcelain()` | `status()` |
| `catFilePretty()` | `catFile()` |

## New Features in v2

- `shortlog(range)` - Generate shortlog for release notes
- `trailers(range)` - Extract commit trailers
- `pathsChanged(globs, from, to)` - Filter changed files by glob patterns
- `pushTags(remote)` - Push tags convenience method
- `defaultRemote()` - Detect default remote
- Enhanced deterministic environment (`LC_ALL=C`, `GIT_TERMINAL_PROMPT=0`)
