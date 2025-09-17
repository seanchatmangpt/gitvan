// src/composables/git/index.mjs
// GitVan v2 — useGit() barrel export
// - Composes all Git factory modules
// - Single entry point for Git operations
// - Exposes context properties for testing

import { createRunner } from "./runner.mjs";
import makeRepo from "./repo.mjs";
import makeCommits from "./commits.mjs";
import makeDiff from "./diff.mjs";
import makeBranches from "./branches.mjs";
import makeTags from "./tags.mjs";
import makeNotes, { NOTES_REF } from "./notes.mjs";
import makeRefs from "./refs.mjs";
import makeWorktrees from "./worktrees.mjs";
import makeRemotes from "./remotes.mjs";
import makeMergeRebaseReset from "./merge_rebase_reset.mjs";
import makeStash from "./stash.mjs";
import makeCherryRevert from "./cherry_revert.mjs";
import makePlumbing from "./plumbing.mjs";

export function useGit() {
  // Create runner with base, run, runVoid, toArr
  const { base, run, runVoid, toArr } = createRunner();

  // Create all factory instances
  const repo = makeRepo(base, run, runVoid, toArr);
  const commits = makeCommits(base, run, runVoid, toArr);
  const diff = makeDiff(base, run, runVoid, toArr);
  const branches = makeBranches(base, run, runVoid, toArr);
  const tags = makeTags(base, run, runVoid, toArr);
  const notes = makeNotes(base, run, runVoid, toArr);
  const refs = makeRefs(base, run, runVoid, toArr);
  const worktrees = makeWorktrees(base, run, runVoid, toArr);
  const remotes = makeRemotes(base, run, runVoid, toArr);
  const mergeRebaseReset = makeMergeRebaseReset(base, run, runVoid, toArr);
  const stash = makeStash(base, run, runVoid, toArr);
  const cherryRevert = makeCherryRevert(base, run, runVoid, toArr);
  const plumbing = makePlumbing(base, run, runVoid, toArr);

  // Compose all factories into single object
  return Object.assign(
    {
      // Context properties (exposed for testing)
      cwd: base.cwd,
      env: base.env,
      
      // Constants
      NOTES_REF,
      
      // Generic runner (escape hatch)
      async run(args) {
        return run(toArr(args));
      },
      async runVoid(args) {
        await runVoid(toArr(args));
      },
    },
    repo,
    commits,
    diff,
    branches,
    tags,
    notes,
    refs,
    worktrees,
    remotes,
    mergeRebaseReset,
    stash,
    cherryRevert,
    plumbing
  );
}

// Re-export constants for convenience
export { NOTES_REF };
