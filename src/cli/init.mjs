import { defineCommand } from "citty";
import consola from "consola";
import { join } from "pathe";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createLogger } from "../utils/logger.mjs";
import {
  initializeKnowledgeGraph,
  createSampleHooks,
  createSampleWorkflows,
  createSampleTemplates,
  createPackageScripts,
} from "./init-samples.mjs";

const logger = createLogger("cli:init");

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Initialize GitVan project with Knowledge Hook Engine support",
  },
  args: {
    cwd: { type: "string", description: "Working directory", default: process.cwd() },
    name: { type: "string", description: "Project name", default: "gitvan-project" },
    description: {
      type: "string",
      description: "Project description",
      default: "A GitVan-powered project with Knowledge Hook Engine",
    },
  },
  async run({ args }) {
    const cwd = args.cwd || process.cwd();
    const projectName = args.name || "gitvan-project";
    const projectDescription =
      args.description || "A GitVan-powered project with Knowledge Hook Engine";

    logger.info("Initializing GitVan project with Knowledge Hook Engine...");
    logger.info(`   Project: ${projectName}`);
    logger.info(`   Directory: ${cwd}`);

    try {
      await initializeGit(cwd);
      await initializeNpm(cwd, projectName, projectDescription);
      await createDirectoryStructure(cwd);
      await createGitVanConfig(cwd, projectName, projectDescription);
      await initializeKnowledgeGraph(cwd, projectName, projectDescription, logger);
      await createSampleHooks(cwd, logger);
      await createSampleWorkflows(cwd, logger);
      await createSampleTemplates(cwd, logger);
      await createPackageScripts(cwd, logger);
      await installDependencies(cwd);
      await verifyInstallation(cwd);

      logger.info("\nGitVan project initialization complete!");
      logger.info("\nNext steps:");
      logger.info('   1. Configure Git user: git config user.name "Your Name"');
      logger.info('   2. Configure Git email: git config user.email "your@email.com"');
      logger.info("   3. Complete setup: gitvan setup");
      logger.info("   4. Test hooks: gitvan hooks list");
      logger.info("   5. Test workflows: gitvan workflow list");
      logger.info("   6. Save changes: gitvan save");
      logger.info("\nFor more help: gitvan help");
    } catch (error) {
      logger.info("\nInitialization failed:");
      logger.info("   Error:", error.message);
      logger.info("\nYou can try again or run: gitvan help");
      await exitWithError(new Error("Operation failed"), 1);
    }
  },
});

/**
 * Initialize Git repository
 */
async function initializeGit(cwd) {
  logger.info("\nInitializing Git repository...");

  try {
    if (existsSync(join(cwd, ".git"))) {
      logger.info("   Git repository already exists");
      return;
    }

    execSync("git init", { cwd, stdio: "pipe" });
    logger.info("   Git repository initialized");

    execSync("git add .", { cwd, stdio: "pipe" });
    execSync('git commit -m "Initial GitVan project setup"', { cwd, stdio: "pipe" });
    logger.info("   Initial commit created");
  } catch (error) {
    logger.info("   Git initialization had issues:", error.message);
  }
}

/**
 * Initialize npm project
 */
async function initializeNpm(cwd, projectName, projectDescription) {
  logger.info("\nInitializing npm project...");

  try {
    if (existsSync(join(cwd, "package.json"))) {
      logger.info("   package.json already exists");
      return;
    }

    const packageJson = {
      name: projectName,
      version: "1.0.0",
      description: projectDescription,
      type: "module",
      main: "index.js",
      scripts: {
        test: "vitest",
        dev: "gitvan daemon",
        build: "gitvan build",
        hooks: "gitvan hooks",
        workflows: "gitvan workflow",
      },
      keywords: ["gitvan", "automation", "knowledge-hooks", "workflows"],
      author: "",
      license: "MIT",
      dependencies: { gitvan: "^2.1.0" },
      devDependencies: { vitest: "^1.0.0" },
    };

    writeFileSync(join(cwd, "package.json"), JSON.stringify(packageJson, null, 2));
    logger.info("   package.json created");
  } catch (error) {
    logger.info("   npm initialization had issues:", error.message);
  }
}

/**
 * Create GitVan directory structure
 */
async function createDirectoryStructure(cwd) {
  logger.info("\nCreating GitVan directory structure...");

  const dirs = [
    ".gitvan", ".gitvan/packs", ".gitvan/state", ".gitvan/backups",
    "jobs", "events", "templates", "packs", "hooks", "workflows",
    "graph", "docs", "tests", "tests/hooks", "tests/workflows",
  ];

  for (const dir of dirs) {
    try {
      mkdirSync(join(cwd, dir), { recursive: true });
      logger.info(`   Created: ${dir}`);
    } catch (error) {
      logger.info(`   Failed to create ${dir}:`, error.message);
    }
  }
}

/**
 * Create GitVan configuration
 */
async function createGitVanConfig(cwd, projectName, projectDescription) {
  logger.info("\nCreating GitVan configuration...");

  const configPath = join(cwd, "gitvan.config.js");

  if (existsSync(configPath)) {
    logger.info("   gitvan.config.js already exists");
    return;
  }

  const config = `export default {
  templates: { dirs: ["templates"], autoescape: false, noCache: true },
  jobs: { dirs: ["jobs"] },
  events: { dirs: ["events"] },
  packs: { dirs: ["packs", ".gitvan/packs"] },
  hooks: { dirs: ["hooks"], autoEvaluate: true, evaluationInterval: 30000 },
  workflows: { dirs: ["workflows"], autoExecute: false, timeout: 300000 },
  graph: { dirs: ["graph"], format: "turtle", autoCommit: true },
  daemon: { enabled: true, worktrees: "current" },
  shell: { allow: ["echo", "git", "npm", "pnpm", "yarn"] },
  ai: { provider: "ollama", model: "qwen3-coder:30b" },
  autoInstall: { packs: [] },
  data: {
    project: {
      name: "${projectName}",
      description: "${projectDescription}",
    },
  },
};
`;

  writeFileSync(configPath, config);
  logger.info("   gitvan.config.js created");
}

/**
 * Install dependencies automatically
 */
async function installDependencies(cwd) {
  logger.info("\nInstalling dependencies...");

  try {
    if (existsSync(join(cwd, "node_modules"))) {
      logger.info("   Dependencies already installed");
      return;
    }

    execSync("npm install", { cwd, stdio: "inherit" });
    logger.info("   Dependencies installed successfully");
  } catch (error) {
    logger.info("   Dependency installation had issues:", error.message);
    logger.info("   You can run 'npm install' manually later");
  }
}

/**
 * Verify installation
 */
async function verifyInstallation(cwd) {
  logger.info("\nVerifying installation...");

  const checks = [
    { name: "Git repository", path: ".git" },
    { name: "package.json", path: "package.json" },
    { name: "gitvan.config.js", path: "gitvan.config.js" },
    { name: "Knowledge Graph", path: "graph/init.ttl" },
    { name: "Hooks directory", path: "hooks" },
    { name: "Workflows directory", path: "workflows" },
    { name: "Templates directory", path: "templates" },
  ];

  let allGood = true;

  for (const check of checks) {
    const exists = existsSync(join(cwd, check.path));
    if (exists) {
      logger.info(`   ${check.name}: OK`);
    } else {
      logger.info(`   ${check.name}: missing`);
      allGood = false;
    }
  }

  if (allGood) {
    logger.info("   All components verified!");
  } else {
    logger.info("   Some components missing - check above");
  }
}
