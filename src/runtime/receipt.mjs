/**
 * GitVan v2 Receipt Writing Utilities
 * Writes structured receipts to Git notes for auditability
 */

import { useGit } from "../composables/git/index.mjs";

/**
 * Writes a structured receipt to Git notes
 * @param {Object} receipt - Receipt data to write
 * @param {Object} options - Receipt options
 * @param {string} options.ref - Git notes ref (default: 'refs/notes/gitvan/results')
 * @param {string} options.sha - Git SHA to attach note to (default: 'HEAD')
 * @returns {Promise<void>}
 */
export async function writeReceipt(
  receipt,
  { ref = "refs/notes/gitvan/results", sha = "HEAD" } = {}
) {
  const git = useGit();
  const payload = {
    schema: "gitvan.receipt.v1",
    role: "receipt",
    ts: git.nowISO(),
    commit: await git.currentHead(),
    ...receipt,
  };

  // Append to avoid overwriting other receipts on the same commit
  await git.noteAppend(ref, JSON.stringify(payload));
}

/**
 * Reads receipts from Git notes
 * @param {Object} options - Read options
 * @param {string} options.ref - Git notes ref (default: 'refs/notes/gitvan/results')
 * @param {string} options.sha - Git SHA to read notes from (default: 'HEAD')
 * @returns {Promise<Array>} Array of receipt objects
 */
export async function readReceipts({
  ref = "refs/notes/gitvan/results",
  sha = "HEAD",
} = {}) {
  const git = useGit();
  try {
    const notes = await git.noteShow(ref, sha);
    const lines = notes.split("\n").filter((line) => line.trim());
    return lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return []; // No notes found
  }
}

/**
 * Lists all commits that have receipts
 * @param {Object} options - List options
 * @param {string} options.ref - Git notes ref (default: 'refs/notes/gitvan/results')
 * @returns {Promise<Array>} Array of commit SHAs with receipts
 */
export async function listReceiptCommits({
  ref = "refs/notes/gitvan/results",
} = {}) {
  const git = useGit();
  try {
    const output = await git.run(`notes --ref=${ref} list`);
    return output
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => line.split(" ")[1]);
  } catch {
    return []; // No notes found
  }
}

/**
 * Reads receipts from a range of commits
 * @param {Object} options - Read options
 * @param {string} options.from - Start commit SHA
 * @param {string} options.to - End commit SHA
 * @param {string} options.ref - Git notes ref (default: 'refs/notes/gitvan/results')
 * @returns {Promise<Array>} Array of receipt objects
 */
export async function readReceiptsRange({
  from,
  to,
  ref = "refs/notes/gitvan/results",
} = {}) {
  const git = useGit();
  try {
    const commits = await git.run(`rev-list ${from}..${to}`);
    const commitList = commits.split("\n").filter((line) => line.trim());

    const allReceipts = [];
    for (const commit of commitList) {
      const receipts = await readReceipts({ ref, sha: commit });
      allReceipts.push(...receipts);
    }

    return allReceipts;
  } catch {
    return []; // No commits or notes found
  }
}
