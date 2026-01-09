// src/composables/git/notes.mjs
// GitVan v2 — Notes operations factory
// - Git notes for storing metadata
// - Default NOTES_REF constant

export const NOTES_REF = "refs/notes/gitvan/results";

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
      try {
        return await run(["notes", `--ref=${ref}`, "show", sha]);
      } catch {
        return "";
      }
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

    // Simplified API for tests (default ref)
    async notesAdd(sha, message) {
      await this.noteAdd(NOTES_REF, message, sha);
    },

    async notesShow(sha) {
      return this.noteShow(NOTES_REF, sha);
    },

    async notesRemove(sha) {
      try {
        await runVoid(["notes", `--ref=${NOTES_REF}`, "remove", sha]);
      } catch {
        // Ignore if note doesn't exist
      }
    },
  };
}
