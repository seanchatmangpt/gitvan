import { createLogger } from "../utils/logger.mjs";
const logger = createLogger("cli:fast-init");

/**
 * Fast, non-blocking GitVan initialization
 * Completes in < 1 second with no hanging operations
 */
async function handleInitFast() {
  const cwd = process.cwd();

  logger.info("🚀 Initializing GitVan v2...");

  // Initialize Git repository (sync, fast)
  logger.info("\n📦 Initializing Git repository...");
  try {
    const { execSync } = await import("node:child_process");
    execSync("git init", { cwd, stdio: "pipe" });
    logger.info("✅ Git repository initialized");
  } catch (error) {
    logger.info("❌ Failed to initialize Git repository:", error.message);
    return;
  }

  // Create GitVan directories (sync, fast)
  logger.info("\n📁 Creating GitVan directories...");
  const dirs = [
    ".gitvan",
    ".gitvan/packs",
    ".gitvan/state",
    ".gitvan/backups",
    "jobs",
    "events",
    "templates",
    "packs",
  ];

  for (const dir of dirs) {
    try {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(join(cwd, dir), { recursive: true });
      logger.info(`   ✅ Created: ${dir}`);
    } catch (error) {
      logger.info(`   ❌ Failed to create ${dir}:`, error.message);
    }
  }

  // Create configuration file (sync, fast)
  logger.info("\n⚙️  Creating configuration...");
  const configPath = join(cwd, "gitvan.config.js");

  if (existsSync(configPath)) {
    logger.info("   ⚠️  Exists: gitvan.config.js");
  } else {
    const defaultConfig = `export default {
  // GitVan v2 Configuration
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
    allow: ["echo", "git", "npm", "pnpm", "yarn"],
  },
  
  ai: {
    provider: "ollama",
    model: "qwen3-coder:30b",
  },
  
  // Auto-install packs on gitvan init
  autoInstall: {
    packs: [
      // Add packs here that should be auto-installed
      // Example: "nextjs-github-pack"
    ]
  },
  
  // Custom data available in templates
  data: {
    project: {
      name: "gitvan-project",
      description: "A GitVan-powered project",
    },
  },
};
`;

    writeFileSync(configPath, defaultConfig);
    logger.info("   ✅ Created: gitvan.config.js");
  }

  // Create sample files (sync, fast)
  logger.info("\n📝 Creating sample files...");

  // Sample job
  const jobContent = `import { defineJob } from "../src/define.mjs";

export default defineJob({
  meta: {
    name: "hello",
    description: "A simple hello world job",
  },
  
  async run({ inputs }) {
    logger.info("Hello from GitVan job!", inputs);
    return { status: "success", message: "Hello world!" };
  },
});
`;

  writeFileSync(join(cwd, "jobs", "hello.mjs"), jobContent);
  logger.info("   ✅ Created: jobs/hello.mjs");

  // Sample template
  const templateContent = `Hello {{ name }}!

This is a sample GitVan template.

Project: {{ project.name }}
Description: {{ project.description }}
`;

  writeFileSync(join(cwd, "templates", "example.njk"), templateContent);
  logger.info("   ✅ Created: templates/example.njk");

  // Sample pack
  const packContent = {
    id: "example-pack",
    name: "Example Pack",
    version: "1.0.0",
    description: "An example GitVan pack",
    author: "GitVan",
    license: "MIT",
    tags: ["example"],
    capabilities: ["example"],
  };

  writeFileSync(
    join(cwd, "packs", "example-pack.json"),
    JSON.stringify(packContent, null, 2)
  );
  logger.info("   ✅ Created: packs/example-pack.json");

  // Check Git configuration (sync, fast)
  logger.info("\n🔧 Checking Git configuration...");
  try {
    const { execSync } = await import("node:child_process");
    const userName = execSync("git config user.name", {
      cwd,
      encoding: "utf8",
    }).trim();
    const userEmail = execSync("git config user.email", {
      cwd,
      encoding: "utf8",
    }).trim();

    if (userName && userEmail) {
      logger.info(`   ✅ Git user: ${userName} <${userEmail}>`);
    } else {
      logger.info("   ⚠️  Git user not configured");
      logger.info('   ℹ️  Run: git config user.name "Your Name"');
      logger.info('   ℹ️  Run: git config user.email "your@email.com"');
    }
  } catch (error) {
    logger.info("   ❌ Failed to check Git configuration");
  }

  logger.info("\n🎉 GitVan initialization complete!");

  logger.info("\nNext steps:");
  logger.info('   1. Configure Git user: git config user.name "Your Name"');
  logger.info(
    '   2. Configure Git email: git config user.email "your@email.com"'
  );
  logger.info("   3. Complete setup: gitvan setup");
  logger.info("   4. Save changes: gitvan save");
  logger.info("\nFor more help: gitvan help");
}
