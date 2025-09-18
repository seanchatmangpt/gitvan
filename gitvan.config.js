/**
 * GitVan Configuration
 *
 * This is the main configuration file for GitVan.
 * It defines repository settings, LLM configuration, cookbook installations,
 * and automated workflow events.
 */

export default defineGitVanConfig({
  // Only override when needed
  jobs: { dir: "jobs" },
  templates: { dirs: ["templates"], autoescape: false, noCache: true },
  receipts: { ref: "refs/notes/gitvan/audit" },
  policy: { requireSignedCommits: true, allowUnsignedReceipts: true },
  graph: {
    dir: "graph",
    snapshotsDir: ".gitvan/graphs/snapshots",
    uriRoots: {
      "graph://": "graph/",
      "templates://": "templates/",
      "queries://": "queries/",
    },
    autoLoad: true,
    validateOnLoad: false,
  },
  now: () => "2027-01-01T00:00:00Z",
  runtimeConfig: {
    app: { name: "demo" },
    gitvan: { notesRef: "refs/notes/gitvan/audit" },
  },
});
