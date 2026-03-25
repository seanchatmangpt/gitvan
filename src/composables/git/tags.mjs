// src/composables/git/tags.mjs
// GitVan v2 — Tag operations factory
// - Tag listing and creation
// - Tag push convenience

/**
 * Create Git tag operations
 * @param {Object} base - Base configuration {cwd, env}
 * @param {Function} run - Execute git command with output
 * @param {Function} runVoid - Execute git command without output
 * @param {Function} toArr - Convert to array helper
 * @returns {Object} Tag operations interface
 */
export default function makeTags(base, run, runVoid, toArr) {
  return {
    // List tags
    async tagList(options = {}) {
      const args = ["tag"];

      if (options.sort) args.push(`--sort=${options.sort}`);
      if (options.pattern) args.push(options.pattern);

      const output = await run(args);
      return output.split("\n").filter(line => line.trim());
    },

    // Create a tag
    async tagCreate(name, msg, options = {}) {
      const args = ["tag"];

      if (options.sign) args.push("-s");
      if (msg) args.push("-m", msg);
      args.push(name);

      await runVoid(args);
    },

    // Push tags to remote
    async pushTags(remote = "origin") {
      await runVoid(["push", remote, "--tags"]);
    },
  };
}
