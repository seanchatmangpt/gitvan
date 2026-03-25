// src/composables/git/notes.mjs
// GitVan v2 — Notes operations factory
// - Git notes for storing metadata
// - Default NOTES_REF constant

/**
 * Default notes ref for GitVan results
 */
export const NOTES_REF = "refs/notes/gitvan/results";

/**
 * Create Git notes operations
 * @param {Object} base - Base configuration {cwd, env}
 * @param {Function} run - Execute git command with output
 * @param {Function} runVoid - Execute git command without output
 * @param {Function} toArr - Convert to array helper
 * @returns {Object} Notes operations interface
 */
export default function makeNotes(base, run, runVoid, toArr) {
  return {
    // Add a note to a commit
    async noteAdd(ref = NOTES_REF, message, sha = "HEAD") {
      // git will create the notes ref if needed
      await runVoid(
        ["notes", `--ref=${ref}`, "add", "-f", "-m", message, sha]
      );
    },

    // Append to an existing note
    async noteAppend(ref = NOTES_REF, message, sha = "HEAD") {
      await runVoid(
        ["notes", `--ref=${ref}`, "append", "-m", message, sha]
      );
    },

    // Show note content
    async noteShow(ref = NOTES_REF, sha = "HEAD") {
      return run(["notes", `--ref=${ref}`, "show", sha]);
    },

    // List all notes
    async notesList(ref = NOTES_REF) {
      try {
        const output = await run(["notes", `--ref=${ref}`, "list"]);
        return output.split("\n").filter(line => line.trim());
      } catch {
        return [];
      }
    },
  };
}
