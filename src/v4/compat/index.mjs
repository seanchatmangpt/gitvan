/**
 * GitVan v4 Compatibility Layer
 *
 * Provides V3-style composables that wrap V4 hooks, enabling gradual migration.
 * This layer maintains backward compatibility while internally using V4 architecture.
 *
 * @packageDocumentation
 * @module @gitvan/v4/compat
 *
 * @deprecated This compatibility layer is provided for migration purposes.
 * New code should use V4 hooks directly. See migration guide at:
 * /docs/migration/v3-to-v4.md
 *
 * Deprecation timeline:
 * - 2026-Q2: Compatibility layer available (current)
 * - 2026-Q3: Deprecation warnings added
 * - 2026-Q4: V4 becomes default
 * - 2027-Q2: V3 support ends
 * - 2027-Q4: V3 code removed
 */

import { createContext, runInContextAsync } from '../core/context.js';
import { useGit as useGitV4 } from '../hooks/gitvan.js';
import { useJob as useJobV4 } from '../hooks/gitvan.js';
import { useTemplate as useTemplateV4 } from '../hooks/gitvan.js';
import { useConfig as useConfigV4 } from '../hooks/gitvan.js';
import { useWorkflow as useWorkflowV4 } from '../hooks/gitvan.js';
import { createLogger } from "../../utils/logger.mjs";
const logger = createLogger("v4:compat:index");

// =============================================================================
// Deprecation Warnings
// =============================================================================

let hasWarnedGlobal = false;

/**
 * Show deprecation warning (once per process)
 */
function warnDeprecation(name, v4Alternative) {
  if (hasWarnedGlobal) return;
  hasWarnedGlobal = true;

  logger.warn(
    `\n⚠️  DEPRECATION WARNING: V3 composables are deprecated\n` +
    `   Current function: ${name}\n` +
    `   Use V4 alternative: ${v4Alternative}\n` +
    `   Migration guide: /docs/migration/v3-to-v4.md\n` +
    `   Timeline: V3 support ends in Q2 2027\n`
  );
}

/**
 * Create a context wrapper for V3 composables
 */
function createV3Context(gitvanContext = {}) {
  return createContext(undefined, {
    cwd: gitvanContext.cwd || process.cwd(),
    env: gitvanContext.env || process.env,
    ...gitvanContext,
  });
}

// =============================================================================
// Git Composable (V3 compatibility)
// =============================================================================

/**
 * V3-style Git composable (wraps V4 useGit hook)
 *
 * @deprecated Use V4 `useGit()` hook instead
 * @example
 * ```js
 * // V3 (deprecated)
 * import { useGit } from '@gitvan/v4/compat';
 * const git = useGit();
 * await git.run(['status']);
 *
 * // V4 (recommended)
 * import { useGit } from '@gitvan/v4/hooks/gitvan';
 * const git = useGit();
 * await git.run(['status']);
 * ```
 */
export function useGit(gitvanContext) {
  warnDeprecation('useGit()', 'useGit() from @gitvan/v4/hooks/gitvan');

  const ctx = createV3Context(gitvanContext);

  return {
    /**
     * Run a git command
     * @param {string[]} args - Git command arguments
     * @returns {Promise<string>} Command output
     */
    async run(args) {
      return runInContextAsync(ctx, async () => {
        const git = useGitV4();
        return git.run(args);
      });
    },

    /**
     * Get current branch name
     * @returns {Promise<string>}
     */
    async branch() {
      return runInContextAsync(ctx, async () => {
        const git = useGitV4();
        return git.getBranch();
      });
    },

    /**
     * Get current HEAD commit
     * @returns {Promise<string>}
     */
    async head() {
      return runInContextAsync(ctx, async () => {
        const git = useGitV4();
        return git.getHead();
      });
    },

    /**
     * Get git status
     * @returns {Promise<{isDirty: boolean, files: string[]}>}
     */
    async status() {
      return runInContextAsync(ctx, async () => {
        const git = useGitV4();
        await git.refresh();
        return {
          isDirty: git.isDirty,
          files: [], // V3 compatibility - files list would need additional implementation
        };
      });
    },

    /**
     * Commit changes
     * @param {string} message - Commit message
     * @param {Object} options - Commit options
     * @returns {Promise<string>} Commit hash
     */
    async commit(message, options = {}) {
      return runInContextAsync(ctx, async () => {
        const git = useGitV4();
        await git.run(['commit', '-m', message, ...(options.all ? ['-a'] : [])]);
        return git.getHead();
      });
    },

    /**
     * Create or switch to branch
     * @param {string} name - Branch name
     * @param {Object} options - Branch options
     * @returns {Promise<void>}
     */
    async branch(name, options = {}) {
      return runInContextAsync(ctx, async () => {
        const git = useGitV4();
        if (options.create) {
          await git.run(['checkout', '-b', name]);
        } else {
          await git.run(['checkout', name]);
        }
      });
    },

    // Add other V3 git methods as needed...
  };
}

// =============================================================================
// Job Composable (V3 compatibility)
// =============================================================================

/**
 * V3-style Job composable (wraps V4 useJob hook)
 *
 * @deprecated Use V4 `useJob()` hook instead
 */
export function useJob(gitvanContext) {
  warnDeprecation('useJob()', 'useJob() from @gitvan/v4/hooks/gitvan');

  const ctx = createV3Context(gitvanContext);

  return {
    cwd: ctx.meta.cwd,
    env: ctx.meta.env,

    /**
     * List available jobs
     * @param {Object} options - List options
     * @returns {Promise<Array>} Job list
     */
    async list(options = {}) {
      // V3 compatibility - would need full implementation
      return [];
    },

    /**
     * Execute a job
     * @param {Object} job - Job definition
     * @param {Object} jobContext - Job context
     * @returns {Promise<Object>} Job result
     */
    async execute(job, jobContext = {}) {
      return runInContextAsync(ctx, async () => {
        const jobHook = useJobV4();
        return jobHook.run(job, jobContext);
      });
    },

    /**
     * Cancel a running job
     * @returns {void}
     */
    cancel() {
      return runInContextAsync(ctx, () => {
        const jobHook = useJobV4();
        jobHook.cancel();
      });
    },

    // Add other V3 job methods as needed...
  };
}

// =============================================================================
// Template Composable (V3 compatibility)
// =============================================================================

/**
 * V3-style Template composable (wraps V4 useTemplate hook)
 *
 * @deprecated Use V4 `useTemplate()` hook instead
 */
export function useTemplate(gitvanContext) {
  warnDeprecation('useTemplate()', 'useTemplate() from @gitvan/v4/hooks/gitvan');

  const ctx = createV3Context(gitvanContext);

  return {
    /**
     * Render template string
     * @param {string} template - Template content
     * @param {Object} data - Template data
     * @returns {string} Rendered output
     */
    render(template, data = {}) {
      return runInContextAsync(ctx, () => {
        const templateHook = useTemplateV4();
        return templateHook.render(template, data);
      });
    },

    /**
     * Render template file
     * @param {string} path - Template file path
     * @param {Object} data - Template data
     * @param {Object} options - Render options
     * @returns {Promise<string>} Rendered output
     */
    async renderFile(path, data = {}, options = {}) {
      return runInContextAsync(ctx, async () => {
        const templateHook = useTemplateV4();
        return templateHook.renderFile(path, data, options);
      });
    },

    /**
     * Clear template cache
     * @returns {void}
     */
    clearCache() {
      return runInContextAsync(ctx, () => {
        const templateHook = useTemplateV4();
        templateHook.clearCache();
      });
    },

    // Add other V3 template methods as needed...
  };
}

// =============================================================================
// Config Composable (V3 compatibility)
// =============================================================================

/**
 * V3-style Config composable (wraps V4 useConfig hook)
 *
 * @deprecated Use V4 `useConfig()` hook instead
 */
export function useConfig(gitvanContext) {
  warnDeprecation('useConfig()', 'useConfig() from @gitvan/v4/hooks/gitvan');

  const ctx = createV3Context(gitvanContext);

  return {
    /**
     * Get config value
     * @param {string} path - Config path (dot-notation)
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Config value
     */
    get(path, defaultValue) {
      return runInContextAsync(ctx, () => {
        const config = useConfigV4();
        return config.get(path, defaultValue);
      });
    },

    /**
     * Set config value
     * @param {string} path - Config path (dot-notation)
     * @param {*} value - Value to set
     * @returns {void}
     */
    set(path, value) {
      return runInContextAsync(ctx, () => {
        const config = useConfigV4();
        config.set(path, value);
      });
    },

    /**
     * Watch config path for changes
     * @param {string} path - Config path to watch
     * @param {Function} callback - Change callback
     * @returns {Function} Unsubscribe function
     */
    watch(path, callback) {
      let unsubscribe;
      runInContextAsync(ctx, () => {
        const config = useConfigV4();
        unsubscribe = config.watch(path, callback);
      });
      return unsubscribe || (() => {});
    },

    // Add other V3 config methods as needed...
  };
}

// =============================================================================
// Workflow Composable (V3 compatibility)
// =============================================================================

/**
 * V3-style Workflow composable (wraps V4 useWorkflow hook)
 *
 * @deprecated Use V4 `useWorkflow()` hook instead
 */
export function useWorkflow(steps, gitvanContext) {
  warnDeprecation('useWorkflow()', 'useWorkflow() from @gitvan/v4/hooks/gitvan');

  const ctx = createV3Context(gitvanContext);

  return {
    /**
     * Execute workflow
     * @returns {Promise<Map<string, unknown>>} Workflow results
     */
    async run() {
      return runInContextAsync(ctx, async () => {
        const workflow = useWorkflowV4(steps);
        return workflow.run();
      });
    },

    /**
     * Cancel running workflow
     * @returns {void}
     */
    cancel() {
      return runInContextAsync(ctx, () => {
        const workflow = useWorkflowV4(steps);
        workflow.cancel();
      });
    },

    /**
     * Reset workflow state
     * @returns {void}
     */
    reset() {
      return runInContextAsync(ctx, () => {
        const workflow = useWorkflowV4(steps);
        workflow.reset();
      });
    },

    /**
     * Get workflow state
     * @returns {Object} Workflow state
     */
    get state() {
      let state;
      runInContextAsync(ctx, () => {
        const workflow = useWorkflowV4(steps);
        state = workflow.state;
      });
      return state;
    },
  };
}

// =============================================================================
// Context Wrapper (V3 compatibility)
// =============================================================================

/**
 * V3-style withGitVan wrapper (wraps V4 runInContextAsync)
 *
 * @deprecated Use V4 `runInContextAsync()` instead
 */
export function withGitVan(context, fn) {
  warnDeprecation('withGitVan()', 'runInContextAsync() from @gitvan/v4/core/context');

  const ctx = createV3Context(context);
  return runInContextAsync(ctx, fn);
}

// =============================================================================
// Exports
// =============================================================================

/**
 * Export all V3-compatible composables
 *
 * @deprecated This entire module is deprecated. Use V4 hooks instead.
 */
export default {
  useGit,
  useJob,
  useTemplate,
  useConfig,
  useWorkflow,
  withGitVan,
};
