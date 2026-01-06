import { createLogger } from "../../utils/logger.mjs";
const logger = createLogger("composables:git:submodules");

// src/composables/git/submodules.mjs
// GitVan v2 — Submodules operations factory
// - Add, remove, update, and list submodules
// - Recursive submodule operations
// - Submodule status and synchronization
// - URL and branch management

/**
 * Create submodules operations
 *
 * @param {Object} base - Base configuration {cwd, env}
 * @param {Function} run - Execute git command with output
 * @param {Function} runVoid - Execute git command without output
 * @param {Function} toArr - Convert to array helper
 * @returns {Object} Submodules operations interface
 */
export default function makeSubmodules(base, run, runVoid, toArr) {
  return {
    /**
     * Add a submodule to the repository
     *
     * @param {string} url - Repository URL
     * @param {string} path - Path where submodule will be cloned
     * @param {Object} [options={}] - Add options
     * @param {string} [options.branch] - Branch to track
     * @param {string} [options.name] - Submodule name
     * @param {number} [options.depth] - Shallow clone depth
     * @param {boolean} [options.force=false] - Force add
     * @returns {Promise<void>}
     *
     * @example
     * // Add submodule
     * await addSubmodule('https://github.com/user/repo.git', 'lib/repo');
     *
     * // Add with specific branch
     * await addSubmodule('https://github.com/user/repo.git', 'lib/repo', {
     *   branch: 'main'
     * });
     *
     * // Shallow clone
     * await addSubmodule('https://github.com/user/repo.git', 'lib/repo', {
     *   depth: 1
     * });
     */
    async addSubmodule(url, path, options = {}) {
      const args = ["submodule", "add"];

      if (options.force) {
        args.push("--force");
      }

      if (options.branch) {
        args.push("--branch", options.branch);
      }

      if (options.name) {
        args.push("--name", options.name);
      }

      if (options.depth) {
        args.push("--depth", options.depth.toString());
      }

      args.push(url);
      args.push(path);

      await runVoid(args);
    },

    /**
     * Remove a submodule from the repository
     *
     * @param {string} path - Submodule path to remove
     * @param {Object} [options={}] - Remove options
     * @param {boolean} [options.force=false] - Force removal
     * @returns {Promise<void>}
     *
     * @example
     * await removeSubmodule('lib/repo');
     *
     * // Force removal
     * await removeSubmodule('lib/repo', { force: true });
     */
    async removeSubmodule(path, options = {}) {
      const args = ["submodule", "deinit"];

      if (options.force) {
        args.push("--force");
      }

      args.push(path);
      await runVoid(args);

      // Remove from .git/modules
      await runVoid(["rm", "-rf", `.git/modules/${path}`]);

      // Remove from working tree
      await runVoid(["rm", "--force", path]);
    },

    /**
     * Update submodules to latest commits
     *
     * @param {Object} [options={}] - Update options
     * @param {boolean} [options.init=false] - Initialize submodules
     * @param {boolean} [options.recursive=false] - Update recursively
     * @param {boolean} [options.remote=false] - Update to latest remote commit
     * @param {boolean} [options.merge=false] - Merge instead of checkout
     * @param {boolean} [options.rebase=false] - Rebase instead of checkout
     * @param {Array<string>} [options.paths] - Specific submodules to update
     * @returns {Promise<void>}
     *
     * @example
     * // Initialize and update all submodules
     * await updateSubmodules({ init: true });
     *
     * // Update recursively
     * await updateSubmodules({ recursive: true });
     *
     * // Update to latest remote
     * await updateSubmodules({ remote: true });
     *
     * // Update specific submodules
     * await updateSubmodules({ paths: ['lib/repo1', 'lib/repo2'] });
     */
    async updateSubmodules(options = {}) {
      const args = ["submodule", "update"];

      if (options.init) {
        args.push("--init");
      }

      if (options.recursive) {
        args.push("--recursive");
      }

      if (options.remote) {
        args.push("--remote");
      }

      if (options.merge) {
        args.push("--merge");
      }

      if (options.rebase) {
        args.push("--rebase");
      }

      if (options.paths && options.paths.length > 0) {
        args.push("--", ...toArr(options.paths));
      }

      await runVoid(args);
    },

    /**
     * Initialize submodules
     *
     * @param {Array<string>} [paths] - Specific submodules to initialize
     * @returns {Promise<void>}
     *
     * @example
     * // Initialize all submodules
     * await initSubmodules();
     *
     * // Initialize specific submodules
     * await initSubmodules(['lib/repo1', 'lib/repo2']);
     */
    async initSubmodules(paths) {
      const args = ["submodule", "init"];

      if (paths && paths.length > 0) {
        args.push("--", ...toArr(paths));
      }

      await runVoid(args);
    },

    /**
     * List all submodules
     *
     * @param {Object} [options={}] - List options
     * @param {boolean} [options.recursive=false] - List recursively
     * @returns {Promise<Array>} Array of submodule information
     *
     * @example
     * const submodules = await listSubmodules();
     * // Returns: [
     * //   { status: ' ', commit: 'abc123', path: 'lib/repo', description: '...' },
     * //   ...
     * // ]
     */
    async listSubmodules(options = {}) {
      const args = ["submodule", "status"];

      if (options.recursive) {
        args.push("--recursive");
      }

      const output = await run(args);

      return output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          // Format: [status][commit] path (description)
          const match = line.match(/^([ +-U])([a-f0-9]+) (.+?)(?: \((.+)\))?$/);
          if (match) {
            return {
              status: match[1],
              commit: match[2],
              path: match[3],
              description: match[4] || "",
            };
          }
          return null;
        })
        .filter(Boolean);
    },

    /**
     * Get submodule status
     *
     * @param {string} [path] - Specific submodule path
     * @returns {Promise<Object>} Submodule status information
     *
     * @example
     * const status = await getSubmoduleStatus('lib/repo');
     * // Returns: {
     * //   initialized: true,
     * //   upToDate: true,
     * //   commit: 'abc123',
     * //   branch: 'main'
     * // }
     */
    async getSubmoduleStatus(path) {
      const args = ["submodule", "status"];
      if (path) args.push(path);

      const output = await run(args);

      if (!output.trim()) {
        return null;
      }

      const match = output.match(/^([ +-U])([a-f0-9]+) (.+?)(?: \((.+)\))?$/);
      if (!match) {
        return null;
      }

      const statusChar = match[1];
      return {
        initialized: statusChar !== "-",
        upToDate: statusChar === " ",
        hasChanges: statusChar === "+",
        hasConflicts: statusChar === "U",
        commit: match[2],
        path: match[3],
        branch: match[4] || null,
      };
    },

    /**
     * Sync submodule URLs from .gitmodules
     *
     * @param {Array<string>} [paths] - Specific submodules to sync
     * @returns {Promise<void>}
     *
     * @example
     * // Sync all submodules
     * await syncSubmodules();
     *
     * // Sync specific submodules
     * await syncSubmodules(['lib/repo1']);
     */
    async syncSubmodules(paths) {
      const args = ["submodule", "sync"];

      if (paths && paths.length > 0) {
        args.push("--", ...toArr(paths));
      }

      await runVoid(args);
    },

    /**
     * Set submodule branch
     *
     * @param {string} path - Submodule path
     * @param {string} branch - Branch name
     * @returns {Promise<void>}
     *
     * @example
     * await setSubmoduleBranch('lib/repo', 'develop');
     */
    async setSubmoduleBranch(path, branch) {
      await runVoid(["submodule", "set-branch", "--branch", branch, path]);
    },

    /**
     * Set submodule URL
     *
     * @param {string} path - Submodule path
     * @param {string} url - New URL
     * @returns {Promise<void>}
     *
     * @example
     * await setSubmoduleUrl('lib/repo', 'https://github.com/user/new-repo.git');
     */
    async setSubmoduleUrl(path, url) {
      await runVoid(["submodule", "set-url", path, url]);
    },

    /**
     * Execute command in all submodules
     *
     * @param {string} command - Command to execute
     * @param {Object} [options={}] - Execution options
     * @param {boolean} [options.recursive=false] - Execute recursively
     * @returns {Promise<string>} Command output
     *
     * @example
     * // Run git status in all submodules
     * await foreachSubmodule('git status');
     *
     * // Run recursively
     * await foreachSubmodule('git pull', { recursive: true });
     */
    async foreachSubmodule(command, options = {}) {
      const args = ["submodule", "foreach"];

      if (options.recursive) {
        args.push("--recursive");
      }

      args.push(command);

      return run(args);
    },

    /**
     * Get submodule summary
     *
     * @param {Object} [options={}] - Summary options
     * @param {string} [options.commit] - Commit to compare against
     * @param {boolean} [options.files=false] - Show file changes
     * @returns {Promise<string>} Summary output
     *
     * @example
     * const summary = await getSubmoduleSummary();
     *
     * // Compare against specific commit
     * const summary = await getSubmoduleSummary({ commit: 'HEAD~5' });
     */
    async getSubmoduleSummary(options = {}) {
      const args = ["submodule", "summary"];

      if (options.files) {
        args.push("--files");
      }

      if (options.commit) {
        args.push(options.commit);
      }

      return run(args);
    },

    /**
     * Absorb submodule git directories into superproject
     *
     * @param {Array<string>} [paths] - Specific submodules
     * @returns {Promise<void>}
     *
     * @example
     * await absorbSubmodules();
     */
    async absorbSubmodules(paths) {
      const args = ["submodule", "absorbgitdirs"];

      if (paths && paths.length > 0) {
        args.push("--", ...toArr(paths));
      }

      await runVoid(args);
    },

    /**
     * Check if path is a submodule
     *
     * @param {string} path - Path to check
     * @returns {Promise<boolean>} True if path is a submodule
     *
     * @example
     * if (await isSubmodule('lib/repo')) {
     *   logger.info('This is a submodule');
     * }
     */
    async isSubmodule(path) {
      try {
        const submodules = await this.listSubmodules();
        return submodules.some((sub) => sub.path === path);
      } catch {
        return false;
      }
    },
  };
}
