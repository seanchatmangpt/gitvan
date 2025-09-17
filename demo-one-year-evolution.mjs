#!/usr/bin/env node
// GitVan v2 — One-Year Project Evolution Demo
// Complete demonstration of how a project evolves using GitVan over 12 months

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { promises as fs } from "node:fs";
import { execSync } from "node:child_process";
import { withGitVan } from "./src/core/context.mjs";
import { useGit8020 } from "./src/composables/git-8020.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Project evolution phases
const EVOLUTION_PHASES = [
  {
    name: "Phase 1: Foundation (Months 1-3)",
    description: "Project setup, basic automation, and CI/CD pipeline",
    jobs: [
      { name: "setup-project", description: "Initialize project structure" },
      { name: "install-deps", description: "Install and manage dependencies" },
      {
        name: "configure-environment",
        description: "Set up dev/staging/prod environments",
      },
      {
        name: "basic-ci",
        description: "Basic build, test, and deploy pipeline",
      },
    ],
  },
  {
    name: "Phase 2: Development Workflow (Months 4-6)",
    description: "Advanced development automation and code quality",
    jobs: [
      { name: "automated-testing", description: "Run tests on every commit" },
      { name: "code-quality", description: "Automated linting and formatting" },
      {
        name: "documentation",
        description: "Auto-generated docs and changelogs",
      },
      {
        name: "branch-management",
        description: "Automated feature branch workflows",
      },
    ],
  },
  {
    name: "Phase 3: AI-Powered Development (Months 7-9)",
    description: "AI-assisted development and intelligent automation",
    jobs: [
      { name: "ai-code-review", description: "AI-powered code analysis" },
      {
        name: "smart-documentation",
        description: "AI-generated documentation",
      },
      {
        name: "automated-refactoring",
        description: "AI-assisted code improvements",
      },
      { name: "intelligent-testing", description: "AI-generated test cases" },
    ],
  },
  {
    name: "Phase 4: Production Excellence (Months 10-12)",
    description: "Enterprise-grade automation and production deployment",
    jobs: [
      {
        name: "production-deployment",
        description: "Zero-downtime deployments",
      },
      {
        name: "monitoring-integration",
        description: "Automated health checks",
      },
      {
        name: "security-scanning",
        description: "Automated vulnerability detection",
      },
      {
        name: "performance-optimization",
        description: "Automated performance testing",
      },
    ],
  },
];

async function createEvolutionDemo() {
  console.log("🚀 GitVan v2 — One-Year Project Evolution Demo\n");
  console.log(
    "This demo shows how a project evolves using GitVan over 12 months\n"
  );

  // Create demo project directory
  const demoDir = join(__dirname, "demo-one-year-project");
  await fs.mkdir(demoDir, { recursive: true });

  try {
    // Initialize Git repository
    execSync("git init", { cwd: demoDir, stdio: "pipe" });
    execSync('git config user.name "GitVan Demo"', {
      cwd: demoDir,
      stdio: "pipe",
    });
    execSync('git config user.email "demo@gitvan.dev"', {
      cwd: demoDir,
      stdio: "pipe",
    });

    const ctx = {
      cwd: demoDir,
      env: { TZ: "UTC", LANG: "C" },
    };

    await withGitVan(ctx, async () => {
      const git = useGit8020();

      // Create initial project structure
      await createProjectStructure(demoDir);
      await git.add(["."]);
      await git.commit("Initial project structure");

      console.log("📁 Project Structure Created\n");

      // Simulate each evolution phase
      for (let i = 0; i < EVOLUTION_PHASES.length; i++) {
        const phase = EVOLUTION_PHASES[i];
        const month = (i + 1) * 3; // 3, 6, 9, 12 months

        console.log(`📅 ${phase.name}`);
        console.log(`📝 ${phase.description}\n`);

        // Create phase-specific files and automation
        await createPhaseFiles(demoDir, phase, month);

        // Create GitVan jobs for this phase
        await createGitVanJobs(demoDir, phase);

        // Create templates for this phase
        await createPhaseTemplates(demoDir, phase);

        // Create packs for this phase
        await createPhasePacks(demoDir, phase);

        // Commit the phase
        await git.add(["."]);
        await git.commit(`Phase ${i + 1}: ${phase.name}`);

        // Create a tag for this milestone
        await git.tag(`v${i + 1}.0.0`, `Milestone: ${phase.name}`);

        // Show evolution metrics
        await showEvolutionMetrics(git, phase, month);

        console.log("✅ Phase completed successfully!\n");
      }

      // Final project summary
      await showFinalSummary(git, demoDir);
    });
  } finally {
    // Keep the demo directory for inspection
    console.log(`📁 Demo project created at: ${demoDir}`);
    console.log(
      "🔍 You can explore the evolution by checking git log and tags"
    );
  }
}

async function createProjectStructure(demoDir) {
  // Create necessary directories first
  await fs.mkdir(join(demoDir, "src"), { recursive: true });
  await fs.mkdir(join(demoDir, "tests"), { recursive: true });

  const structure = {
    "package.json": JSON.stringify(
      {
        name: "one-year-evolution-project",
        version: "1.0.0",
        description: "A project that evolves using GitVan over 12 months",
        scripts: {
          test: "echo 'Tests pass!'",
          build: "echo 'Build complete!'",
          deploy: "echo 'Deployment successful!'",
        },
      },
      null,
      2
    ),

    "README.md": `# One-Year Evolution Project

This project demonstrates how GitVan transforms a simple project into a sophisticated, automated development ecosystem over 12 months.

## Evolution Timeline

- **Months 1-3**: Foundation and basic automation
- **Months 4-6**: Development workflow automation  
- **Months 7-9**: AI-powered development
- **Months 10-12**: Production excellence

## Getting Started

\`\`\`bash
# Run the evolution demo
node demo-one-year-evolution.mjs
\`\`\`
`,

    "src/index.js": `// Main application entry point
console.log('One-Year Evolution Project');
console.log('Powered by GitVan v2');
`,

    "tests/index.test.js": `// Basic test suite
const assert = require('assert');

describe('One-Year Evolution Project', () => {
  it('should initialize successfully', () => {
    assert.ok(true);
  });
});
`,
  };

  for (const [file, content] of Object.entries(structure)) {
    await fs.writeFile(join(demoDir, file), content);
  }
}

async function createPhaseFiles(demoDir, phase, month) {
  const phaseDir = join(demoDir, `phase-${Math.ceil(month / 3)}`);
  await fs.mkdir(phaseDir, { recursive: true });

  // Create phase-specific configuration
  const config = {
    phase: phase.name,
    month: month,
    description: phase.description,
    jobs: phase.jobs,
    timestamp: new Date().toISOString(),
  };

  await fs.writeFile(
    join(phaseDir, "phase-config.json"),
    JSON.stringify(config, null, 2)
  );

  // Create phase-specific source files
  const sourceFiles = {
    [`phase-${Math.ceil(month / 3)}/automation.js`]: `// ${phase.name}
// ${phase.description}

export const phaseAutomation = {
  name: "${phase.name}",
  month: ${month},
  jobs: ${JSON.stringify(phase.jobs, null, 2)}
};

export async function runPhaseAutomation() {
  console.log(\`Running \${phaseAutomation.name}\`);
  console.log(\`Month: \${phaseAutomation.month}\`);
  
  for (const job of phaseAutomation.jobs) {
    console.log(\`- \${job.name}: \${job.description}\`);
  }
}
`,

    [`phase-${Math.ceil(month / 3)}/README.md`]: `# ${phase.name}

${phase.description}

## Jobs in this Phase

${phase.jobs.map((job) => `- **${job.name}**: ${job.description}`).join("\n")}

## Evolution Metrics

- **Month**: ${month}
- **Phase**: ${Math.ceil(month / 3)}
- **Automation Level**: ${getAutomationLevel(month)}
- **AI Integration**: ${getAIIntegration(month)}
`,
  };

  for (const [file, content] of Object.entries(sourceFiles)) {
    await fs.writeFile(join(demoDir, file), content);
  }
}

async function createGitVanJobs(demoDir, phase) {
  const jobsDir = join(demoDir, "jobs");
  await fs.mkdir(jobsDir, { recursive: true });

  for (const job of phase.jobs) {
    const jobFile = join(jobsDir, `${job.name}.mjs`);
    const jobContent = `// ${job.name}.mjs
// ${job.description}

import { defineJob } from 'gitvan';

export default defineJob({
  name: '${job.name}',
  description: '${job.description}',
  schedule: '${getJobSchedule(phase.name)}',
  steps: [
    {
      type: 'cli',
      command: 'echo "Running ${job.name}"'
    },
    {
      type: 'js',
      module: './${job.name}-logic.mjs'
    }${
      phase.name.includes("AI")
        ? `,
    {
      type: 'llm',
      prompt: 'Analyze and improve this ${job.name} process',
      model: 'ollama/codellama'
    }`
        : ""
    }
  ]
});
`;

    await fs.writeFile(jobFile, jobContent);

    // Create job logic file
    const logicFile = join(jobsDir, `${job.name}-logic.mjs`);
    const logicContent = `// ${job.name}-logic.mjs
export async function run${
      job.name.charAt(0).toUpperCase() + job.name.slice(1)
    }() {
  console.log('Executing ${job.description}');
  
  // Simulate job execution
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    message: '${job.description} completed successfully',
    timestamp: new Date().toISOString()
  };
}
`;

    await fs.writeFile(logicFile, logicContent);
  }
}

async function createPhaseTemplates(demoDir, phase) {
  const templatesDir = join(demoDir, "templates");
  await fs.mkdir(templatesDir, { recursive: true });

  const templateFile = join(
    templatesDir,
    `${phase.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.njk`
  );
  const templateContent = `---
title: "{{ phase.name }}"
description: "{{ phase.description }}"
month: {{ month }}
phase: {{ phaseNumber }}
---

# {{ phase.name }}

{{ phase.description }}

## Automation Jobs

{% for job in phase.jobs %}
### {{ job.name }}
- **Description**: {{ job.description }}
- **Schedule**: {{ job.schedule }}
- **Status**: {{ job.status }}

{% endfor %}

## Evolution Metrics

- **Month**: {{ month }}
- **Phase**: {{ phaseNumber }}
- **Automation Level**: {{ automationLevel }}
- **AI Integration**: {{ aiIntegration }}

## Next Steps

{{ nextSteps }}
`;

  await fs.writeFile(templateFile, templateContent);
}

async function createPhasePacks(demoDir, phase) {
  const packsDir = join(demoDir, "packs");
  await fs.mkdir(packsDir, { recursive: true });

  const packFile = join(
    packsDir,
    `${phase.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-pack.json`
  );
  const packContent = {
    name: `${phase.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-pack`,
    version: "1.0.0",
    description: `Automation pack for ${phase.name}`,
    author: "GitVan Evolution Demo",
    jobs: phase.jobs.map((job) => ({
      name: job.name,
      description: job.description,
      schedule: getJobSchedule(phase.name),
    })),
    templates: [`${phase.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.njk`],
    dependencies: phase.name.includes("AI") ? ["@gitvan/llm"] : [],
  };

  await fs.writeFile(packFile, JSON.stringify(packContent, null, 2));
}

async function showEvolutionMetrics(git, phase, month) {
  const branch = await git.branch();
  const commitCount = await git.getCommitCount();
  const tags = await git.listRefs("refs/tags/*");

  console.log(`📊 Evolution Metrics (Month ${month}):`);
  console.log(`   Branch: ${branch}`);
  console.log(`   Commits: ${commitCount}`);
  console.log(`   Tags: ${tags.length}`);
  console.log(`   Jobs: ${phase.jobs.length}`);
  console.log(`   Automation Level: ${getAutomationLevel(month)}`);
  console.log(`   AI Integration: ${getAIIntegration(month)}`);
}

async function showFinalSummary(git, demoDir) {
  const branch = await git.branch();
  const commitCount = await git.getCommitCount();
  const tags = await git.listRefs("refs/tags/*");
  const worktrees = await git.listWorktrees();

  console.log("🎉 One-Year Project Evolution Complete!\n");
  console.log("📊 Final Project State:");
  console.log(`   Repository: ${demoDir}`);
  console.log(`   Branch: ${branch}`);
  console.log(`   Total Commits: ${commitCount}`);
  console.log(`   Milestone Tags: ${tags.length}`);
  console.log(`   Worktrees: ${worktrees.length}`);
  console.log(
    `   Total Jobs: ${EVOLUTION_PHASES.reduce(
      (sum, phase) => sum + phase.jobs.length,
      0
    )}`
  );
  console.log(`   Total Templates: ${EVOLUTION_PHASES.length}`);
  console.log(`   Total Packs: ${EVOLUTION_PHASES.length}`);

  console.log("\n🚀 Evolution Achievements:");
  console.log("   ✅ Fully Automated Development Pipeline");
  console.log("   ✅ AI-Enhanced Code Quality");
  console.log("   ✅ Zero-Touch Deployments");
  console.log("   ✅ Comprehensive Audit Trails");
  console.log("   ✅ Reusable Automation Components");
  console.log("   ✅ Intelligent Monitoring & Alerting");
  console.log("   ✅ Self-Healing Infrastructure");
  console.log("   ✅ Continuous Optimization");

  console.log(
    "\n🎯 The project has evolved into a self-evolving, intelligent development ecosystem!"
  );
}

// Helper functions
function getAutomationLevel(month) {
  if (month <= 3) return "Basic";
  if (month <= 6) return "Advanced";
  if (month <= 9) return "Intelligent";
  return "Enterprise";
}

function getAIIntegration(month) {
  if (month <= 6) return "None";
  if (month <= 9) return "Partial";
  return "Full";
}

function getJobSchedule(phaseName) {
  if (phaseName.includes("Foundation")) return "on-commit";
  if (phaseName.includes("Development")) return "on-push";
  if (phaseName.includes("AI")) return "on-pull-request";
  return "on-release-tag";
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createEvolutionDemo()
    .then(() => {
      console.log("\n✨ Demo completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Demo failed:", error);
      process.exit(1);
    });
}

export { createEvolutionDemo };
