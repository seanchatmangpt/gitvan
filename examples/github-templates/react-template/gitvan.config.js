export default {
  // GitVan v2 Configuration for React Projects
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
    allow: ["echo", "git", "npm", "pnpm", "yarn", "vite"],
  },

  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
    endpoint: "http://localhost:11434",
  },

  // Auto-install packs for React projects
  autoInstall: {
    packs: ["react-vite-pack", "tailwind-pack"],
  },

  // Custom data for React projects
  data: {
    project: {
      name: "react-app",
      description: "A React application powered by GitVan",
      framework: "react",
      version: "18.0.0",
      bundler: "vite",
    },
  },
};
