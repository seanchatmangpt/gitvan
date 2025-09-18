// src/composables/git/refs.mjs
// GitVan v2 — Reference operations factory
// - Reference listing, getting, updating
// - Atomic ref creation for locks

export default function makeRefs(base, run, runVoid, toArr) {
  return {
    // List references
    async listRefs(pattern = "") {
      try {
        const args = ["for-each-ref", "--format=%(refname)"];
        if (pattern) {
          args.push(pattern);
        }
        const output = await run(args);
        return output.split("\n").filter((line) => line.trim());
      } catch (error) {
        return [];
      }
    },

    // Get reference value
    async getRef(ref) {
      try {
        const output = await run(["show-ref", "--verify", ref]);
        return output.trim();
      } catch (error) {
        return null;
      }
    },

    // Update reference
    async updateRef(ref, valueSha) {
      await runVoid(["update-ref", ref, valueSha]);
    },

    // Atomic ref create (locks)
    // Uses stdin protocol to atomically create a ref if absent.
    async updateRefCreate(ref, valueSha) {
      // Check if ref exists first
      try {
        await runVoid(["show-ref", "--verify", "--quiet", ref]);
        // Ref exists, return false to indicate failure
        return false;
      } catch {
        // Ref doesn't exist, try to create it
        try {
          await runVoid(["update-ref", ref, valueSha]);
          return true;
        } catch (error) {
          // If creation failed due to race condition, check if it exists now
          try {
            await runVoid(["show-ref", "--verify", "--quiet", ref]);
            return false; // Someone else created it
          } catch {
            throw error; // Real error, re-throw
          }
        }
      }
    },
  };
}
