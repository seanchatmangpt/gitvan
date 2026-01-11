/**
 * @fileoverview GitVan Integrations Module
 *
 * Provides integration bridges between major systems:
 * - Husky: Git hooks manager
 * - @unrdf/hooks: RDF-based hook system
 * - Bree: Background job scheduler
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

// Husky bridge
export {
  HuskyHookBridge,
  getHuskyHookBridge,
  resetHuskyHookBridge,
} from "./husky-hook-bridge.mjs";

// Unrdf hooks bridge
export {
  UnrdfHooksBridge,
  getUnrdfHooksBridge,
  resetUnrdfHooksBridge,
} from "./bree-hook-adapter.mjs";

// Re-export unified composable from composables
export { useUnifiedHooks } from "../composables/unified-hooks.mjs";

/**
 * Integration status constants
 */
export const INTEGRATION_STATUS = {
  UNINITIALIZED: "uninitialized",
  INITIALIZING: "initializing",
  READY: "ready",
  ERROR: "error",
};

/**
 * Git hook names
 */
export const GIT_HOOKS = {
  PRE_COMMIT: "pre-commit",
  POST_COMMIT: "post-commit",
  PREPARE_COMMIT_MSG: "prepare-commit-msg",
  COMMIT_MSG: "commit-msg",
  PRE_PUSH: "pre-push",
  POST_PUSH: "post-push",
  POST_CHECKOUT: "post-checkout",
  POST_MERGE: "post-merge",
  POST_REWRITE: "post-rewrite",
  POST_UPDATE: "post-update",
};

/**
 * Hook execution statuses
 */
export const HOOK_STATUS = {
  PENDING: "pending",
  EXECUTING: "executing",
  COMPLETED: "completed",
  FAILED: "failed",
  TIMEOUT: "timeout",
};

export default {
  HuskyHookBridge,
  getHuskyHookBridge,
  resetHuskyHookBridge,
  UnrdfHooksBridge,
  getUnrdfHooksBridge,
  resetUnrdfHooksBridge,
  useUnifiedHooks,
  INTEGRATION_STATUS,
  GIT_HOOKS,
  HOOK_STATUS,
};
