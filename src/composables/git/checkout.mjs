// src/composables/git/checkout.mjs
// GitVan v2 — Git Checkout/Switch Operations
// Modular checkout/switch commands to prevent bloat in main useGit()

import { runGitVoid } from "../git-core.mjs";

export function createCheckoutCommands(base) {
  return {
    // ---------- Checkout/Switch operations ----------
    async checkout(ref, options = {}) {
      const args = ["checkout"];

      if (options.force) args.push("-f");
      if (options.create) args.push("-b");
      if (options.track) args.push("--track");
      if (options.detach) args.push("--detach");

      if (ref) args.push(ref);

      await runGitVoid(args, base);
    },

    async switch(branch, options = {}) {
      const args = ["switch"];

      if (options.create) args.push("-c");
      if (options.force) args.push("-f");
      if (options.detach) args.push("--detach");
      if (options.track) args.push("--track");
      if (options.noTrack) args.push("--no-track");

      if (branch) args.push(branch);

      await runGitVoid(args, base);
    },

    async restore(paths, options = {}) {
      const args = ["restore"];

      if (options.staged) args.push("--staged");
      if (options.source) args.push("--source", options.source);

      if (Array.isArray(paths)) {
        args.push("--", ...paths);
      } else {
        args.push("--", paths);
      }

      await runGitVoid(args, base);
    },
  };
}
