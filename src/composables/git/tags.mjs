// src/composables/git/tags.mjs
// GitVan v2 — Tag operations factory
// - Tag listing and creation
// - Tag push convenience

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
