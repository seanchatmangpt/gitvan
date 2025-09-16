/**
 * GitVan Configuration
 *
 * This is the main configuration file for GitVan.
 * It defines repository settings, LLM configuration, cookbook installations,
 * and automated workflow events.
 */

export default {
  // Repository configuration
  repo: {
    // Current working directory as the repository root
    dir: process.cwd(),

    // Default branch for operations
    defaultBranch: "main",

    // Git notes references for storing GitVan metadata
    notesRef: "refs/notes/gitvan",
    resultsRef: "refs/notes/gitvan/results",

    // Git signing requirements
    signing: {
      require: true
    },

    // Git hooks integration
    hooks: {
      "pre-commit": ["gitvan lint", "gitvan test"],
      "post-commit": ["gitvan diary update"],
      "pre-push": ["gitvan changelog check"]
    }
  },

  // Large Language Model configuration
  llm: {
    // Base URL for Ollama or other OpenAI-compatible endpoints
    baseURL: process.env.OLLAMA_BASE || process.env.OPENAI_BASE_URL || "http://localhost:11434",

    // Default model to use
    model: process.env.GITVAN_MODEL || "llama3.2",

    // Model parameters
    temperature: 0.2,
    maxTokens: 4096,

    // Fallback models in order of preference
    fallbacks: ["codellama", "llama3.1", "gpt-4o-mini"],

    // Model-specific configurations
    models: {
      "llama3.2": { temperature: 0.2, maxTokens: 4096 },
      "codellama": { temperature: 0.1, maxTokens: 8192 },
      "gpt-4o-mini": { temperature: 0.3, maxTokens: 16384 }
    }
  },

  // Cookbook packages to install by default
  cookbook: {
    install: [
      "dev-diary",
      "changelog",
      "commit-enhancer",
      "code-review",
      "security-audit",
      "performance-tracker"
    ],

    // Custom cookbook repositories
    repos: [
      "https://github.com/gitvan/official-cookbook",
      "https://github.com/gitvan/community-cookbook"
    ]
  },

  // Automated workflow events
  events: [
    {
      id: "daily-dev-diary",
      workflow: "cron",
      schedule: "0 18 * * *", // 6 PM daily
      run: {
        type: "llm-call",
        model: "llama3.2",
        prompt: "Summarize today's commits and development progress",
        output: "diary/daily-{date}.md"
      }
    },
    {
      id: "weekly-changelog",
      workflow: "cron",
      schedule: "0 10 * * 1", // 10 AM every Monday
      run: {
        type: "cookbook",
        recipe: "changelog",
        args: ["generate", "--period=week"]
      }
    },
    {
      id: "commit-analysis",
      workflow: "git-hook",
      trigger: "post-commit",
      run: {
        type: "llm-call",
        model: "codellama",
        prompt: "Analyze the latest commit for potential improvements",
        output: "analysis/commit-{hash}.json"
      }
    }
  ],

  // Output and logging configuration
  output: {
    // Directory for GitVan generated files
    dir: ".gitvan",

    // Logging configuration
    logging: {
      level: process.env.GITVAN_LOG_LEVEL || "info",
      file: ".gitvan/logs/gitvan.log",
      rotate: true,
      maxFiles: 10
    },

    // Report formats
    formats: {
      diary: "markdown",
      changelog: "markdown",
      analysis: "json",
      metrics: "json"
    }
  },

  // Plugin system configuration
  plugins: {
    // Built-in plugins to enable
    enabled: [
      "git-integration",
      "llm-provider",
      "cookbook-manager",
      "event-scheduler"
    ],

    // External plugin directories
    paths: [
      "./plugins",
      "~/.gitvan/plugins",
      "/usr/local/share/gitvan/plugins"
    ]
  },

  // Security and privacy settings
  security: {
    // Sensitive data patterns to exclude from LLM processing
    excludePatterns: [
      /api[_-]?key/i,
      /password/i,
      /secret/i,
      /token/i,
      /private[_-]?key/i
    ],

    // Maximum file size to process (in bytes)
    maxFileSize: 1024 * 1024, // 1MB

    // Require user confirmation for certain operations
    confirmOperations: [
      "push",
      "delete-branch",
      "force-push"
    ]
  }
};