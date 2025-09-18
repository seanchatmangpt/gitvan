/**
 * GitVan v2 Default Configuration
 * Production-ready defaults for GitVan deployment
 */

export const GitVanDefaults = {
  // Root directory
  rootDir: process.cwd(),

  // Job configuration
  jobs: {
    dir: "jobs",
    scan: {
      patterns: [
        "jobs/**/*.mjs",
        "jobs/**/*.cron.mjs",
        "jobs/**/*.evt.mjs",
        "jobs/**/*.js",
      ],
      ignore: ["node_modules/**", ".git/**", "**/*.test.*", "**/*.spec.*"],
    },
  },

  // Template configuration
  templates: {
    engine: "nunjucks",
    dirs: ["templates"],
    autoescape: false,
    noCache: false,
    filters: ["inflection", "json", "slug"],
  },

  // Receipt configuration
  receipts: {
    ref: "refs/notes/gitvan/results",
    enabled: true,
    compress: false,
  },

  // Lock configuration
  locks: {
    ref: "refs/gitvan/locks",
    timeout: 30000,
    retries: 3,
  },

  // AI configuration
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    temperature: 0.7,
    maxTokens: 4096,
    defaults: {
      temperature: 0.7,
      top_p: 0.8,
      top_k: 20,
      repeat_penalty: 1.05,
    },
  },

  // Runtime configuration
  runtime: {
    timezone: "UTC",
    locale: "en-US",
    deterministic: true,
    sandbox: true,
  },

  // Hooks configuration
  hooks: {},

  // Daemon configuration
  daemon: {
    pollMs: 1500,
    lookback: 600,
    maxPerTick: 50,
  },

  // Events configuration
  events: {
    directory: "events",
  },

  // Graph configuration
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
};
