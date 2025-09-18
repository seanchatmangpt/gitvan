/**
 * GitVan v2 - useNotes() Composable
 * Provides Git notes management for simple note operations
 */

import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import { useGit } from "./git/index.mjs";

export function useNotes() {
  // Get context from unctx - this must be called synchronously
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  // Resolve working directory and environment
  const cwd = (ctx && ctx.cwd) || process.cwd();
  const env = {
    ...process.env,
    ...(ctx && ctx.env ? ctx.env : {}),
    TZ: "UTC", // Always override to UTC for determinism
    LANG: "C", // Always override to C locale for determinism
  };

  const base = { cwd, env };

  // Initialize dependencies
  const git = useGit();

  return {
    // Context properties (exposed for testing)
    cwd: base.cwd,
    env: base.env,

    // === Notes Operations ===
    async write(message, sha = "HEAD") {
      try {
        await git.noteAdd("refs/notes/gitvan/results", message, sha);
        return { ok: true, message };
      } catch (error) {
        throw new Error(`Failed to write note: ${error.message}`);
      }
    },

    async read(sha = "HEAD") {
      try {
        return await git.noteShow("refs/notes/gitvan/results", sha);
      } catch (error) {
        return null; // Note doesn't exist
      }
    },

    async append(message, sha = "HEAD") {
      try {
        await git.noteAppend("refs/notes/gitvan/results", message, sha);
        return { ok: true, message };
      } catch (error) {
        throw new Error(`Failed to append note: ${error.message}`);
      }
    },

    async list() {
      try {
        const notes = await git.notesList("refs/notes/gitvan/results");
        return notes;
      } catch (error) {
        return [];
      }
    },

    async exists(sha = "HEAD") {
      try {
        await git.noteShow("refs/notes/gitvan/results", sha);
        return true;
      } catch {
        return false;
      }
    },
  };
}
