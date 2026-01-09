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
    async tagCreate(name, ref = "HEAD", options = {}) {
      const args = ["tag"];

      if (options.annotate || options.sign) args.push("-a");
      if (options.sign) args.push("-s");
      if (options.message) args.push("-m", options.message);

      args.push(name);
      if (ref && ref !== "HEAD") args.push(ref);

      await runVoid(args);
    },

    // Delete a tag
    async tagDelete(name, options = {}) {
      const args = ["tag"];

      if (options.force) args.push("-f");
      args.push("-d");
      args.push(name);

      await runVoid(args);
    },

    // Push tags to remote
    async pushTags(remote = "origin") {
      await runVoid(["push", remote, "--tags"]);
    },
  };
}
