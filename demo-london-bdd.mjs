#!/usr/bin/env node

/**
 * GitVan London BDD Demonstration
 *
 * This script demonstrates the London BDD implementation for GitVan
 * by running sample scenarios and showing the behavior-driven approach.
 */

import { runBDDTests } from "./tests/bdd/runner.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";

console.log("🎭 GitVan London BDD Demonstration");
console.log("=====================================\n");

console.log("📋 London BDD Principles:");
console.log("1. Outside-in development - Start with acceptance tests");
console.log("2. Behavior specification - Use Given-When-Then scenarios");
console.log("3. Domain language - Write tests in business language");
console.log("4. Test-driven development - Write tests before implementation\n");

console.log("🚀 Running BDD Test Scenarios...\n");

try {
  // Run BDD tests
  const results = await runBDDTests({
    featuresDir: "tests/bdd/features",
    outputDir: "tests/bdd/reports",
  });

  console.log("\n📊 BDD Test Results Summary:");
  console.log("============================");
  console.log(`Total Scenarios: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️ Skipped: ${results.skipped}`);

  if (results.failed === 0) {
    console.log("\n🎉 All BDD scenarios passed!");
    console.log(
      "GitVan behavior is working as expected according to London BDD principles."
    );
  } else {
    console.log("\n⚠️ Some BDD scenarios failed.");
    console.log("Review the behavior specifications and implementation.");
  }

  // Show example scenarios
  console.log("\n📝 Example BDD Scenarios:");
  console.log("=========================");

  const exampleScenarios = [
    {
      feature: "CLI Commands",
      scenario: "Initialize GitVan project",
      steps: [
        "Given I have a GitVan project",
        "When I initialize GitVan",
        "Then the command should succeed",
        "And GitVan should be properly configured",
      ],
    },
    {
      feature: "AI Job Generation",
      scenario: "Generate a backup job using AI",
      steps: [
        "Given I want to create a backup job",
        "When I ask AI to generate a backup job",
        "Then the AI should create a working backup job",
        "And the job should be executable",
        "And the job should follow GitVan conventions",
      ],
    },
    {
      feature: "Graph Persistence",
      scenario: "Initialize default graph",
      steps: [
        'When I run the GitVan command "graph init-default"',
        "Then the command should succeed",
        'And the file "graph/default.ttl" should exist',
      ],
    },
  ];

  exampleScenarios.forEach((example, index) => {
    console.log(`\n${index + 1}. ${example.feature} - ${example.scenario}`);
    example.steps.forEach((step) => {
      console.log(`   ${step}`);
    });
  });

  console.log("\n🔧 BDD Commands Available:");
  console.log("==========================");
  console.log("pnpm test:bdd              # Run all BDD tests");
  console.log("pnpm test:bdd:watch         # Run BDD tests in watch mode");
  console.log("pnpm test:bdd:runner       # Run with custom BDD runner");
  console.log("node tests/bdd/runner.mjs  # Direct runner execution");

  console.log("\n📚 Documentation:");
  console.log("==================");
  console.log("docs/bdd/london-bdd-implementation.md  # Complete BDD guide");
  console.log("tests/bdd/features/                     # Feature files");
  console.log("tests/bdd/step-definitions/            # Step definitions");
  console.log("tests/bdd/support/                     # Test utilities");

  console.log("\n✨ London BDD Benefits:");
  console.log("========================");
  console.log("• Clear Requirements - Scenarios as executable specifications");
  console.log(
    "• User Focus - Tests focus on user behavior, not implementation"
  );
  console.log("• Documentation - Feature files document system behavior");
  console.log(
    "• Collaboration - Business stakeholders can understand and contribute"
  );
  console.log("• Quality - Outside-in approach ensures user needs are met");

  console.log("\n🎯 Next Steps:");
  console.log("===============");
  console.log("1. Add more feature files for additional GitVan behaviors");
  console.log("2. Implement additional step definitions for complex scenarios");
  console.log("3. Integrate with CI/CD pipeline for automated BDD testing");
  console.log("4. Add BDD reports to documentation generation");
  console.log("5. Create BDD training materials for the team");

  process.exit(results.failed > 0 ? 1 : 0);
} catch (error) {
  console.error("❌ BDD Demonstration Error:", error.message);
  process.exit(1);
}
