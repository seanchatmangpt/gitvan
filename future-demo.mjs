// future-demo.mjs
// GitVan v2 — Future Demo
// Demonstrates future capabilities and evolution planning

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { promises as fs } from "node:fs";
import { EvolutionConfig } from "./evolution-config.mjs";
import { MigrationUtils } from "./migration-utils.mjs";
import { ExtensionFramework } from "./extension-framework.mjs";
import { FutureRoadmap } from "./future-roadmap.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function createFutureDemo() {
  console.log("🚀 GitVan v2 — Future Capabilities Demo\n");
  console.log(
    "This demo shows future evolution planning and extension capabilities\n"
  );

  // Create demo project directory
  const demoDir = join(__dirname, "demo-future-project");
  await fs.mkdir(demoDir, { recursive: true });

  try {
    // Initialize evolution system
    const config = await new EvolutionConfig(
      join(demoDir, "evolution.config.json")
    ).load();
    const migration = new MigrationUtils(demoDir);
    const extensions = new ExtensionFramework(demoDir);
    const roadmap = new FutureRoadmap(demoDir);

    console.log("📁 Future Demo Project Created\n");

    // Demonstrate evolution configuration
    console.log("🔧 Evolution Configuration:");
    console.log(`   Current Phase: ${config.evolution.currentPhase}`);
    console.log(`   Total Phases: ${config.evolution.totalPhases}`);
    console.log(`   AI Enabled: ${config.ai.enabled}`);
    console.log(`   Monitoring Enabled: ${config.monitoring.enabled}\n`);

    // Demonstrate migration capabilities
    console.log("🔄 Migration Capabilities:");
    await migration.migrateToPhase(2);
    console.log(`   Migrated to Phase: ${config.evolution.currentPhase}\n`);

    // Demonstrate extension framework
    console.log("🔌 Extension Framework:");
    await extensions.createExtension("job", "future-job", {
      description: "A job for future capabilities",
      schedule: "on-commit",
      steps: [
        { type: "cli", command: "echo 'Future job running'" },
        { type: "js", module: "./future-logic.mjs" },
      ],
    });

    await extensions.createExtension("plugin", "future-plugin", {
      description: "A plugin for future capabilities",
      hooks: {
        "before-job": "console.log('Future plugin: before job')",
        "after-job": "console.log('Future plugin: after job')",
      },
    });

    console.log("   Created future job extension");
    console.log("   Created future plugin extension\n");

    // Demonstrate roadmap generation
    console.log("🗺️ Future Roadmap:");
    const roadmapData = await roadmap.generateRoadmap();
    console.log(`   Timeline Items: ${roadmapData.timeline.length}`);
    console.log(`   Recommendations: ${roadmapData.recommendations.length}`);
    console.log(`   Future Phases: ${roadmapData.future.length}\n`);

    // Create future phase plans
    console.log("📋 Future Phase Plans:");
    for (const phase of config.future.roadmap.phases) {
      const plan = await roadmap.createPhasePlan(phase.phase);
      console.log(`   Phase ${phase.phase}: ${phase.name}`);
      console.log(`     Features: ${plan.features.length}`);
      console.log(`     Implementation Steps: ${plan.implementation.length}`);
    }

    console.log("\n");

    // Generate comprehensive future report
    console.log("📊 Future Report Generation:");
    const report = await roadmap.generateFutureReport();
    console.log(`   Report Generated: ${report.generated}`);
    console.log(`   Current Status: Phase ${report.current.phase}`);
    console.log(`   Next Steps: ${report.nextSteps.length}`);
    console.log(`   Risks Identified: ${report.risks.length}`);
    console.log(`   Opportunities: ${report.opportunities.length}\n`);

    // Demonstrate extension listing
    console.log("📝 Extension Registry:");
    const extensionsList = await extensions.listExtensions();
    for (const [type, extensions] of Object.entries(extensionsList)) {
      console.log(`   ${type}: ${Object.keys(extensions).length} extensions`);
    }

    console.log("\n");

    // Show evolution status
    console.log("📈 Evolution Status:");
    const status = {
      currentPhase: config.evolution.currentPhase,
      completedPhases: config.evolution.milestones.filter((m) => m.completed)
        .length,
      totalPhases: config.evolution.milestones.length,
      progress: Math.round(
        (config.evolution.milestones.filter((m) => m.completed).length /
          config.evolution.milestones.length) *
          100
      ),
      nextPhase:
        config.evolution.currentPhase < config.evolution.totalPhases
          ? config.evolution.currentPhase + 1
          : null,
      isComplete: config.evolution.milestones.every((m) => m.completed),
    };
    console.log(`   Current Phase: ${status.currentPhase}`);
    console.log(`   Completed Phases: ${status.completedPhases}`);
    console.log(`   Total Phases: ${status.totalPhases}`);
    console.log(`   Progress: ${status.progress}%`);
    console.log(`   Next Phase: ${status.nextPhase || "None"}`);
    console.log(`   Complete: ${status.isComplete ? "Yes" : "No"}\n`);

    // Demonstrate future capabilities
    console.log("🔮 Future Capabilities Preview:");
    console.log("   ✅ Evolution Configuration System");
    console.log("   ✅ Migration Utilities");
    console.log("   ✅ Extension Framework");
    console.log("   ✅ Future Roadmap Planning");
    console.log("   ✅ Comprehensive Reporting");
    console.log("   ✅ Risk and Opportunity Analysis");
    console.log("   ✅ Phase Planning and Implementation");
    console.log("   ✅ Extension Registry and Management\n");

    console.log("🎯 Future Demo Complete!");
    console.log("   The project now has full future evolution capabilities");
    console.log("   Ready for autonomous development and predictive features");
  } finally {
    console.log(`\n📁 Future demo project created at: ${demoDir}`);
    console.log("🔍 Explore the evolution system, extensions, and roadmap");
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createFutureDemo()
    .then(() => {
      console.log("\n✨ Future demo completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Future demo failed:", error);
      process.exit(1);
    });
}

export { createFutureDemo };
