export default {
  // GitVan v2 Configuration for Next.js Projects
  templates: {
    dirs: ["templates"],
    autoescape: false,
    noCache: true,
  },

  jobs: {
    dirs: ["jobs"],
  },

  events: {
    dirs: ["events"],
  },

  packs: {
    dirs: ["packs", ".gitvan/packs"],
  },

  daemon: {
    enabled: true,
    worktrees: "current",
  },

  shell: {
    allow: ["echo", "git", "npm", "pnpm", "yarn", "next"],
  },

  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
    endpoint: "http://localhost:11434",
  },

  // Auto-install packs for Next.js projects
  autoInstall: {
    packs: ["nextjs-github-pack"],
  },

  // Custom data for Next.js projects
  data: {
    project: {
      name: "nextjs-app",
      description: "A Next.js application powered by GitVan",
      framework: "nextjs",
      version: "14.0.0",
    },
  },
};
