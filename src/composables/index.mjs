/**
 * GitVan v2 - Composables Index
 * Centralized exports for all composables
 *
 * This module re-exports all composables for convenient importing.
 * Import from here to get access to all GitVan composables.
 *
 * @example
 * import { useGit, useWorktree, useJob } from 'src/composables/index.mjs'
 */

// Core composables
export { useGit } from "./git.mjs";
export { useFileSystem } from "./filesystem.mjs";
export {
  useTestEnvironment,
  withTestEnvironment,
} from "./test-environment.mjs";
export { useWorktree } from "./worktree.mjs";
export { useTemplate } from "./template.mjs";
export { useNotes } from "./notes.mjs";
export { useUnrouting } from "./unrouting.mjs";

// Job & Event composables
export { useJob } from "./job.mjs";
export { useEvent } from "./event.mjs";
export { useSchedule } from "./schedule.mjs";

// Infrastructure composables
export { useReceipt } from "./receipt.mjs";
export { useLock } from "./lock.mjs";
export { useRegistry } from "./registry.mjs";
export { usePack } from "./pack.mjs";

// Hooks composables
export { useKnowledgeHookRegistry, resetKnowledgeHookRegistry } from "./useKnowledgeHookRegistry.mjs";

// Federation composables (v3.2.0+)
export { useFederationDiscovery } from "./federation-discovery.mjs";
export { useFederatedQuery } from "./federated-query.mjs";
export { useFederationEvents } from "./federation-events.mjs";

// Streaming composables (v4.0.0+)
export { useChangeStream } from "./useChangeStream.mjs";

// Re-export context utilities for convenience
export { withGitVan, useGitVan, tryUseGitVan } from "../core/context.mjs";
