/**
 * GitVan v2 - Composables Index
 * Centralized exports for all composables
 */

// Core composables
export { useGit } from "./git/index.mjs";
export { useWorktree } from "./worktree.mjs";
export { useTemplate } from "./template.mjs";
export { useNotes } from "./notes.mjs";

// Job & Event composables
export { useJob } from "./job.mjs";
export { useEvent } from "./event.mjs";
export { useSchedule } from "./schedule.mjs";

// Infrastructure composables
export { useReceipt } from "./receipt.mjs";
export { useLock } from "./lock.mjs";
export { useRegistry } from "./registry.mjs";
export { usePack } from "./pack.mjs";

// Re-export context utilities for convenience
export { withGitVan, useGitVan, tryUseGitVan } from "../core/context.mjs";
