// src/composables/git/plumbing.mjs
// GitVan v2 — Git plumbing operations factory
// - Low-level Git operations
// - Object manipulation and parsing

import path from "node:path";

/**
 * Create Git plumbing operations
 * @param {Object} base - Base configuration {cwd, env}
 * @param {Function} run - Execute git command with output
 * @param {Function} runVoid - Execute git command without output
 * @param {Function} toArr - Convert to array helper
 * @returns {Object} Plumbing operations interface
 */
export default function makePlumbing(base, run, runVoid, toArr) {
  return {
    // Hash object
    async hashObject(filePath, { write = false } = {}) {
      const abs = path.isAbsolute(filePath)
        ? filePath
        : path.join(base.cwd, filePath);
      const args = ["hash-object"];
      if (write) args.push("-w");
      args.push("--", abs);
      return run(args);
    },

    // Write tree
    async writeTree() {
      return run(["write-tree"]);
    },

    // Cat file (pretty print)
    async catFile(sha) {
      try {
        return run(["cat-file", "-p", sha]);
      } catch (error) {
        // Handle common error cases gracefully
        if (error.message.includes("Not a valid object name")) {
          throw new Error(`Object ${sha} not found`);
        }
        throw error;
      }
    },

    // Rev parse
    async revParse(ref) {
      return run(["rev-parse", ref]);
    },
  };
}
