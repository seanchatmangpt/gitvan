// migration-utils.mjs
// GitVan v2 — Migration Utilities
// Supports project evolution and migration between phases

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { EvolutionConfig } from "./evolution-config.mjs";

export class MigrationUtils {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.config = null;
  }

  async initialize() {
    this.config = await new EvolutionConfig(
      join(this.projectRoot, "evolution.config.json")
    ).load();
  }

  async migrateToPhase(targetPhase) {
    if (!this.config) await this.initialize();

    const currentPhase = this.config.evolution.currentPhase;

    if (targetPhase <= currentPhase) {
      throw new Error(
        `Target phase ${targetPhase} is not ahead of current phase ${currentPhase}`
      );
    }

    console.log(
      `🚀 Migrating from Phase ${currentPhase} to Phase ${targetPhase}`
    );

    // Step through each phase
    for (let phase = currentPhase + 1; phase <= targetPhase; phase++) {
      await this.migratePhase(phase);
    }

    // Update config
    this.config.evolution.currentPhase = targetPhase;
    await this.config.save();

    console.log(`✅ Successfully migrated to Phase ${targetPhase}`);
  }

  async migratePhase(phase) {
    console.log(`📦 Migrating to Phase ${phase}...`);

    switch (phase) {
      case 1:
        await this.migrateToFoundation();
        break;
      case 2:
        await this.migrateToDevelopment();
        break;
      case 3:
        await this.migrateToAI();
        break;
      case 4:
        await this.migrateToProduction();
        break;
      default:
        throw new Error(`Unknown phase: ${phase}`);
    }

    // Mark milestone as completed
    const milestone = this.config.evolution.milestones.find(
      (m) => m.phase === phase
    );
    if (milestone) {
      milestone.completed = true;
      milestone.actualDate = new Date().toISOString();
      await this.config.save();
    }
  }

  async migrateToFoundation() {
    // Create basic project structure
    await this.createDirectory("jobs");
    await this.createDirectory("templates");
    await this.createDirectory("packs");

    // Create basic jobs
    await this.createJob("setup-project", {
      description: "Initialize project structure",
      schedule: "on-commit",
      steps: [
        { type: "cli", command: "echo 'Setting up project'" },
        { type: "js", module: "./setup-project-logic.mjs" },
      ],
    });

    await this.createJob("basic-ci", {
      description: "Basic build, test, and deploy pipeline",
      schedule: "on-push",
      steps: [
        { type: "cli", command: "npm test" },
        { type: "cli", command: "npm run build" },
      ],
    });

    // Create basic templates
    await this.createTemplate("foundation", {
      title: "Foundation Phase",
      description: "Basic automation setup",
    });

    console.log("✅ Foundation phase migration complete");
  }

  async migrateToDevelopment() {
    // Add advanced development jobs
    await this.createJob("automated-testing", {
      description: "Run tests on every commit",
      schedule: "on-commit",
      steps: [
        { type: "cli", command: "npm test" },
        { type: "js", module: "./test-analysis.mjs" },
      ],
    });

    await this.createJob("code-quality", {
      description: "Automated linting and formatting",
      schedule: "on-push",
      steps: [
        { type: "cli", command: "npm run lint" },
        { type: "cli", command: "npm run format" },
      ],
    });

    // Create development templates
    await this.createTemplate("development", {
      title: "Development Workflow",
      description: "Advanced development automation",
    });

    console.log("✅ Development phase migration complete");
  }

  async migrateToAI() {
    // Enable AI features
    this.config.ai.enabled = true;
    await this.config.save();

    // Add AI-powered jobs
    await this.createJob("ai-code-review", {
      description: "AI-powered code analysis",
      schedule: "on-pull-request",
      steps: [
        { type: "js", module: "./ai-review-logic.mjs" },
        {
          type: "llm",
          prompt: "Review this code for quality and best practices",
          model: "qwen3-coder:30b",
        },
      ],
    });

    await this.createJob("smart-documentation", {
      description: "AI-generated documentation",
      schedule: "on-merge",
      steps: [
        {
          type: "llm",
          prompt: "Generate comprehensive documentation for this code",
          model: "qwen3-coder:30b",
        },
        { type: "js", module: "./doc-generation.mjs" },
      ],
    });

    // Enable AI features
    await this.config.enableAIFeature("codeReview");
    await this.config.enableAIFeature("documentation");

    console.log("✅ AI phase migration complete");
  }

  async migrateToProduction() {
    // Add production jobs
    await this.createJob("production-deployment", {
      description: "Zero-downtime deployments",
      schedule: "on-release-tag",
      steps: [
        { type: "cli", command: "npm run build:prod" },
        { type: "js", module: "./deployment-logic.mjs" },
      ],
    });

    await this.createJob("monitoring-integration", {
      description: "Automated health checks",
      schedule: "*/5 * * * *", // Every 5 minutes
      steps: [
        { type: "js", module: "./health-check.mjs" },
        { type: "js", module: "./alerting.mjs" },
      ],
    });

    // Enable monitoring
    this.config.monitoring.enabled = true;
    await this.config.save();

    console.log("✅ Production phase migration complete");
  }

  async createJob(name, jobConfig) {
    const jobsDir = join(this.projectRoot, "jobs");
    await fs.mkdir(jobsDir, { recursive: true });
    const jobFile = join(jobsDir, `${name}.mjs`);

    const jobContent = `// ${name}.mjs
// ${jobConfig.description}

import { defineJob } from 'gitvan';

export default defineJob({
  name: '${name}',
  description: '${jobConfig.description}',
  schedule: '${jobConfig.schedule}',
  steps: ${JSON.stringify(jobConfig.steps, null, 2)}
});
`;

    await fs.writeFile(jobFile, jobContent);
  }

  async createTemplate(name, templateConfig) {
    const templatesDir = join(this.projectRoot, "templates");
    await fs.mkdir(templatesDir, { recursive: true });
    const templateFile = join(templatesDir, `${name}.njk`);

    const templateContent = `---
title: "${templateConfig.title}"
description: "${templateConfig.description}"
phase: ${this.config.evolution.currentPhase}
---

# ${templateConfig.title}

${templateConfig.description}

## Phase Information

- **Current Phase**: {{ phase }}
- **Migration Date**: {{ migrationDate }}
- **Status**: {{ status }}

## Next Steps

{{ nextSteps }}
`;

    await fs.writeFile(templateFile, templateContent);
  }

  async createDirectory(name) {
    const dirPath = join(this.projectRoot, name);
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  async createPack(name, packConfig) {
    const packsDir = join(this.projectRoot, "packs");
    const packFile = join(packsDir, `${name}-pack.json`);

    const packContent = {
      name: `${name}-pack`,
      version: "1.0.0",
      description: packConfig.description,
      author: "GitVan Migration",
      jobs: packConfig.jobs || [],
      templates: packConfig.templates || [],
      dependencies: packConfig.dependencies || [],
    };

    await fs.writeFile(packFile, JSON.stringify(packContent, null, 2));
  }

  async rollbackToPhase(targetPhase) {
    if (!this.config) await this.initialize();

    const currentPhase = this.config.evolution.currentPhase;

    if (targetPhase >= currentPhase) {
      throw new Error(
        `Target phase ${targetPhase} is not behind current phase ${currentPhase}`
      );
    }

    console.log(
      `🔄 Rolling back from Phase ${currentPhase} to Phase ${targetPhase}`
    );

    // Remove phase-specific files
    for (let phase = currentPhase; phase > targetPhase; phase--) {
      await this.rollbackPhase(phase);
    }

    // Update config
    this.config.evolution.currentPhase = targetPhase;
    await this.config.save();

    console.log(`✅ Successfully rolled back to Phase ${targetPhase}`);
  }

  async rollbackPhase(phase) {
    console.log(`🔄 Rolling back Phase ${phase}...`);

    // Remove phase-specific jobs
    const jobsDir = join(this.projectRoot, "jobs");
    const phaseJobs = await this.getPhaseJobs(phase);

    for (const job of phaseJobs) {
      const jobFile = join(jobsDir, `${job}.mjs`);
      try {
        await fs.unlink(jobFile);
      } catch (error) {
        // File might not exist, ignore error
      }
    }

    // Remove phase-specific templates
    const templatesDir = join(this.projectRoot, "templates");
    const phaseTemplates = await this.getPhaseTemplates(phase);

    for (const template of phaseTemplates) {
      const templateFile = join(templatesDir, `${template}.njk`);
      try {
        await fs.unlink(templateFile);
      } catch (error) {
        // File might not exist, ignore error
      }
    }

    console.log(`✅ Phase ${phase} rollback complete`);
  }

  async getPhaseJobs(phase) {
    const phaseJobMap = {
      1: ["setup-project", "basic-ci"],
      2: ["automated-testing", "code-quality"],
      3: ["ai-code-review", "smart-documentation"],
      4: ["production-deployment", "monitoring-integration"],
    };
    return phaseJobMap[phase] || [];
  }

  async getPhaseTemplates(phase) {
    const phaseTemplateMap = {
      1: ["foundation"],
      2: ["development"],
      3: ["ai-powered"],
      4: ["production"],
    };
    return phaseTemplateMap[phase] || [];
  }

  async generateMigrationReport() {
    if (!this.config) await this.initialize();

    const status = this.config.getEvolutionStatus();
    const report = {
      timestamp: new Date().toISOString(),
      status: status,
      milestones: this.config.evolution.milestones,
      ai: this.config.ai,
      monitoring: this.config.monitoring,
      future: this.config.future,
    };

    const reportFile = join(this.projectRoot, "migration-report.json");
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

    return report;
  }
}

export async function createMigrationUtils(projectRoot = process.cwd()) {
  const utils = new MigrationUtils(projectRoot);
  await utils.initialize();
  return utils;
}

export default MigrationUtils;
