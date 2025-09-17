// src/composables/git/reset.mjs
// GitVan v2 — Git Reset Operations
// Modular reset commands to prevent bloat in main useGit()

import { runGitVoid } from "../git-core.mjs";

export function createResetCommands(base) {
  return {
    // ---------- Reset operations ----------
    async reset(mode = "mixed", ref = "HEAD", options = {}) {
      const args = ["reset"];

      // Reset modes: soft, mixed, hard, merge, keep
      if (mode) args.push(`--${mode}`);

      if (options.paths && options.paths.length > 0) {
        args.push("--", ...options.paths);
      } else if (ref) {
        args.push(ref);
      }

      await runGitVoid(args, base);
    },

    async resetSoft(ref = "HEAD") {
      await this.reset("soft", ref);
    },

    async resetMixed(ref = "HEAD") {
      await this.reset("mixed", ref);
    },

    async resetHard(ref = "HEAD") {
      await this.reset("hard", ref);
    },

    async resetPaths(paths, ref = "HEAD") {
      await this.reset("mixed", ref, { paths });
    },
  };
}
