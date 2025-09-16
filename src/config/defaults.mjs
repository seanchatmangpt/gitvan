// src/config/defaults.mjs
// GitVan v2 — Minimal, deterministic defaults
// Engine is fixed to Nunjucks for consistency and performance

export const GitVanDefaults = {
  // General
  debug: false,
  logLevel: 3,

  // Dirs
  rootDir: process.cwd(),
  buildDir: ".gitvan",
  output: {
    dir: "{{ rootDir }}/.out",
    distDir: "{{ rootDir }}/dist",
  },

  // Features
  jobs: { dir: "jobs" }, // scan jobs/**/*.mjs
  templates: { dirs: ["templates"], autoescape: false, noCache: true },
  receipts: { ref: "refs/notes/gitvan/results" },

  // Policy
  policy: {
    requireSignedCommits: false,
    allowUnsignedReceipts: true,
  },

  // Runtime config bag (serializable only)
  runtimeConfig: {
    app: {},
    gitvan: {
      notesRef: "refs/notes/gitvan/results",
    },
  },

  // Time injector (optional). If omitted, no ambient time is injected.
  now: undefined,

  // Hooks (hookable)
  hooks: {},
};
