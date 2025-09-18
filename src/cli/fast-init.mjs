/**
 * Fast, non-blocking GitVan initialization
 * Completes in < 1 second with no hanging operations
 */
async function handleInitFast() {
  const cwd = process.cwd();

  console.log("🚀 Initializing GitVan v2...");

  // Initialize Git repository (sync, fast)
  console.log("\n📦 Initializing Git repository...");
  try {
    const { execSync } = await import("node:child_process");
    execSync("git init", { cwd, stdio: "pipe" });
    console.log("✅ Git repository initialized");
  } catch (error) {
    console.log("❌ Failed to initialize Git repository:", error.message);
    return;
  }

  // Create GitVan directories (sync, fast)
  console.log("\n📁 Creating GitVan directories...");
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
      console.log(`   ✅ Created: ${dir}`);
    } catch (error) {
      console.log(`   ❌ Failed to create ${dir}:`, error.message);
    }
  }

  // Create configuration file (sync, fast)
  console.log("\n⚙️  Creating configuration...");
  const configPath = join(cwd, "gitvan.config.js");
  
  if (existsSync(configPath)) {
    console.log("   ⚠️  Exists: gitvan.config.js");
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
    provider: "anthropic",
    model: "claude-3-haiku-20240307",
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
      name: "my-project",
      description: "A GitVan-powered project",
    },
  },
};
`;

    writeFileSync(configPath, defaultConfig);
    console.log("   ✅ Created: gitvan.config.js");
  }

  // Create sample files (sync, fast)
  console.log("\n📝 Creating sample files...");
  
  // Sample job
  const jobContent = `import { defineJob } from "../src/define.mjs";

export default defineJob({
  meta: {
    name: "hello",
    description: "A simple hello world job",
  },
  
  async run({ inputs }) {
    console.log("Hello from GitVan job!", inputs);
    return { status: "success", message: "Hello world!" };
  },
});
`;

  writeFileSync(join(cwd, "jobs", "hello.mjs"), jobContent);
  console.log("   ✅ Created: jobs/hello.mjs");

  // Sample template
  const templateContent = `Hello {{ name }}!

This is a sample GitVan template.

Project: {{ project.name }}
Description: {{ project.description }}
`;

  writeFileSync(join(cwd, "templates", "example.njk"), templateContent);
  console.log("   ✅ Created: templates/example.njk");

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
  console.log("   ✅ Created: packs/example-pack.json");

  // Check Git configuration (sync, fast)
  console.log("\n🔧 Checking Git configuration...");
  try {
    const { execSync } = await import("node:child_process");
    const userName = execSync("git config user.name", { cwd, encoding: "utf8" }).trim();
    const userEmail = execSync("git config user.email", { cwd, encoding: "utf8" }).trim();
    
    if (userName && userEmail) {
      console.log(`   ✅ Git user: ${userName} <${userEmail}>`);
    } else {
      console.log("   ⚠️  Git user not configured");
      console.log("   ℹ️  Run: git config user.name \"Your Name\"");
      console.log("   ℹ️  Run: git config user.email \"your@email.com\"");
    }
  } catch (error) {
    console.log("   ❌ Failed to check Git configuration");
  }

  console.log("\n🎉 GitVan initialization complete!");
  
  console.log("\nNext steps:");
  console.log("   1. Configure Git user: git config user.name \"Your Name\"");
  console.log("   2. Configure Git email: git config user.email \"your@email.com\"");
  console.log("   3. Complete setup: gitvan setup");
  console.log("   4. Save changes: gitvan save");
  console.log("\nFor more help: gitvan help");
}
