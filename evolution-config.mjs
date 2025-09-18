// evolution-config.mjs
// GitVan v2 — Evolution Configuration System
// Supports future project evolution and migration paths

import { promises as fs } from "node:fs";
import { join } from "node:path";

export class EvolutionConfig {
  constructor(configPath = "evolution.config.json") {
    this.configPath = configPath;
    this.config = null;
  }

  async load() {
    try {
      const data = await fs.readFile(this.configPath, "utf8");
      this.config = JSON.parse(data);
      return this.config;
    } catch (error) {
      // Return default config if file doesn't exist
      this.config = this.getDefaultConfig();
      await this.save();
      return this.config;
    }
  }

  async save() {
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
  }

  getDefaultConfig() {
    return {
      version: "2.1.0",
      evolution: {
        currentPhase: 1,
        totalPhases: 4,
        phaseDuration: 3, // months
        autoAdvance: false,
        milestones: [
          {
            phase: 1,
            name: "Foundation",
            description: "Basic automation and CI/CD",
            completed: false,
            targetDate: null,
            actualDate: null,
          },
          {
            phase: 2,
            name: "Development Workflow",
            description: "Advanced development automation",
            completed: false,
            targetDate: null,
            actualDate: null,
          },
          {
            phase: 3,
            name: "AI-Powered Development",
            description: "AI-assisted development",
            completed: false,
            targetDate: null,
            actualDate: null,
          },
          {
            phase: 4,
            name: "Production Excellence",
            description: "Enterprise-grade automation",
            completed: false,
            targetDate: null,
            actualDate: null,
          },
        ],
      },
      automation: {
        jobs: {
          enabled: true,
          maxConcurrent: 5,
          retryAttempts: 3,
          timeout: 300000, // 5 minutes
        },
        templates: {
          enabled: true,
          cacheEnabled: true,
          autoReload: true,
        },
        packs: {
          enabled: true,
          autoUpdate: false,
          marketplace: true,
        },
      },
      ai: {
        enabled: false,
        provider: "ollama",
        model: "qwen3-coder:30b",
        maxTokens: 4000,
        temperature: 0.7,
        features: {
          codeReview: false,
          documentation: false,
          refactoring: false,
          testing: false,
        },
      },
      monitoring: {
        enabled: false,
        metrics: {
          jobSuccess: true,
          performance: true,
          errors: true,
          evolution: true,
        },
        alerts: {
          email: false,
          slack: false,
          webhook: false,
        },
      },
      future: {
        roadmap: {
          phases: [
            {
              phase: 5,
              name: "Autonomous Development",
              description:
                "Self-evolving codebase with minimal human intervention",
              features: [
                "Self-healing code",
                "Automatic refactoring",
                "Intelligent bug fixes",
                "Performance optimization",
              ],
              targetDate: "2025-06-01",
            },
            {
              phase: 6,
              name: "Predictive Development",
              description: "AI predicts and prevents issues before they occur",
              features: [
                "Predictive bug detection",
                "Proactive security scanning",
                "Performance prediction",
                "Resource optimization",
              ],
              targetDate: "2025-09-01",
            },
          ],
        },
        extensions: {
          enabled: true,
          marketplace: true,
          customPlugins: true,
          apiVersion: "v2",
        },
      },
    };
  }

  async advancePhase() {
    if (
      this.config.evolution.currentPhase < this.config.evolution.totalPhases
    ) {
      this.config.evolution.currentPhase++;
      await this.save();
      return this.config.evolution.currentPhase;
    }
    return null;
  }

  async completeMilestone(phase) {
    const milestone = this.config.evolution.milestones.find(
      (m) => m.phase === phase
    );
    if (milestone) {
      milestone.completed = true;
      milestone.actualDate = new Date().toISOString();
      await this.save();
    }
  }

  async enableAIFeature(feature) {
    if (this.config.ai.features[feature] !== undefined) {
      this.config.ai.features[feature] = true;
      await this.save();
    }
  }

  async setTargetDate(phase, date) {
    const milestone = this.config.evolution.milestones.find(
      (m) => m.phase === phase
    );
    if (milestone) {
      milestone.targetDate = date;
      await this.save();
    }
  }

  getCurrentPhase() {
    return this.config.evolution.currentPhase;
  }

  getNextPhase() {
    const nextPhase = this.config.evolution.currentPhase + 1;
    return nextPhase <= this.config.evolution.totalPhases ? nextPhase : null;
  }

  isPhaseComplete(phase) {
    const milestone = this.config.evolution.milestones.find(
      (m) => m.phase === phase
    );
    return milestone ? milestone.completed : false;
  }

  getEvolutionStatus() {
    const completed = this.config.evolution.milestones.filter(
      (m) => m.completed
    ).length;
    const total = this.config.evolution.milestones.length;
    const progress = (completed / total) * 100;

    return {
      currentPhase: this.config.evolution.currentPhase,
      completedPhases: completed,
      totalPhases: total,
      progress: Math.round(progress),
      nextPhase: this.getNextPhase(),
      isComplete: completed === total,
    };
  }
}

export async function createEvolutionConfig(
  configPath = "evolution.config.json"
) {
  const config = new EvolutionConfig(configPath);
  await config.load();
  return config;
}

export default EvolutionConfig;
