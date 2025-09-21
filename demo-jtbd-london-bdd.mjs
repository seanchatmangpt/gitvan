#!/usr/bin/env node

/**
 * GitVan JTBD London BDD Demonstration
 *
 * This script demonstrates the London BDD implementation for GitVan JTBD
 * (Jobs To Be Done) functionality, focusing on user job-to-be-done scenarios
 * and how GitVan helps accomplish them through intelligent automation.
 */

import { runBDDTests } from "./tests/bdd/runner.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";

console.log("🎯 GitVan JTBD London BDD Demonstration");
console.log("==========================================\n");

console.log("📋 JTBD London BDD Principles:");
console.log("1. User-Centric - Focus on what users are trying to accomplish");
console.log(
  "2. Job-Focused - Understand the job the user is hiring GitVan to do"
);
console.log("3. Context-Aware - Consider the situation and context of the job");
console.log(
  "4. Outcome-Oriented - Focus on the desired outcome, not the process\n"
);

console.log("🚀 Running JTBD BDD Test Scenarios...\n");

try {
  // Run JTBD-specific BDD tests
  const results = await runBDDTests({
    featuresDir: "tests/bdd/features",
    outputDir: "tests/bdd/reports",
  });

  console.log("\n📊 JTBD BDD Test Results Summary:");
  console.log("==================================");
  console.log(`Total Scenarios: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️ Skipped: ${results.skipped}`);

  if (results.failed === 0) {
    console.log("\n🎉 All JTBD scenarios passed!");
    console.log(
      "GitVan JTBD functionality is working as expected according to London BDD principles."
    );
  } else {
    console.log("\n⚠️ Some JTBD scenarios failed.");
    console.log("Review the behavior specifications and implementation.");
  }

  // Show JTBD example scenarios
  console.log("\n📝 JTBD Example Scenarios:");
  console.log("===========================");

  const jtbdScenarios = [
    {
      feature: "JTBD Management",
      scenario: "List all available JTBD hooks",
      steps: [
        "Given I have a GitVan project",
        "And I have JTBD hooks configured",
        'When I run the GitVan command "jtbd list"',
        "Then the command should succeed",
        'And I should see "Available JTBD Hooks" in the output',
      ],
    },
    {
      feature: "JTBD Execution",
      scenario: "Execute code quality gatekeeper on pre-commit",
      steps: [
        'Given I have a JTBD hook named "code-quality-gatekeeper"',
        'And the hook is configured for "pre-commit" events',
        "When I commit changes to the repository",
        "Then the code quality gatekeeper should execute",
        "And the commit should be allowed if quality standards are met",
      ],
    },
    {
      feature: "JTBD Knowledge Integration",
      scenario: "JTBD hook with SPARQL predicate evaluation",
      steps: [
        'Given I have a JTBD hook named "intelligent-code-review"',
        "And the hook uses SPARQL predicates for evaluation",
        "When the hook executes",
        "Then it should evaluate SPARQL queries against the knowledge graph",
        "And the hook should make intelligent decisions based on the results",
      ],
    },
  ];

  jtbdScenarios.forEach((example, index) => {
    console.log(`\n${index + 1}. ${example.feature} - ${example.scenario}`);
    example.steps.forEach((step) => {
      console.log(`   ${step}`);
    });
  });

  console.log("\n🔧 JTBD BDD Commands Available:");
  console.log("=================================");
  console.log("pnpm test:bdd                     # Run all BDD tests");
  console.log(
    "pnpm test:bdd:watch               # Run BDD tests in watch mode"
  );
  console.log("pnpm test:bdd:runner              # Run with custom BDD runner");
  console.log("node tests/bdd/runner.mjs        # Direct runner execution");
  console.log("node demo-jtbd-london-bdd.mjs    # This JTBD demonstration");

  console.log("\n📚 JTBD Documentation:");
  console.log("=======================");
  console.log("docs/bdd/london-bdd-implementation.md  # Complete BDD guide");
  console.log("tests/bdd/features/jtbd-*.feature        # JTBD feature files");
  console.log(
    "tests/bdd/step-definitions/jtbd-steps.mjs # JTBD step definitions"
  );
  console.log(
    "src/cli/commands/jtbd.mjs               # JTBD CLI implementation"
  );

  console.log("\n✨ JTBD London BDD Benefits:");
  console.log("=============================");
  console.log(
    "• User Job Focus - Tests focus on what users are trying to accomplish"
  );
  console.log("• Context Awareness - Tests consider the situation and context");
  console.log(
    "• Outcome Orientation - Tests focus on desired outcomes, not processes"
  );
  console.log(
    "• Intelligent Automation - Tests verify intelligent decision making"
  );
  console.log(
    "• Knowledge Integration - Tests verify integration with knowledge graphs"
  );
  console.log(
    "• Event-Driven Execution - Tests verify event-based hook execution"
  );

  console.log("\n🎯 JTBD Categories Covered:");
  console.log("============================");
  console.log(
    "• Core Development Lifecycle - Code quality, testing, deployment"
  );
  console.log("• Infrastructure & DevOps - Security, performance, monitoring");
  console.log("• Quality Assurance - Testing, validation, compliance");
  console.log("• Security & Compliance - Vulnerability scanning, audits");
  console.log("• Performance & Monitoring - Metrics collection, optimization");

  console.log("\n🧠 Knowledge Hook Engine Integration:");
  console.log("=====================================");
  console.log("• SPARQL Predicates - ASK, CONSTRUCT, DESCRIBE, SELECT");
  console.log("• Threshold Evaluation - Metric-based decision making");
  console.log("• SHACL Validation - Data validation against shapes");
  console.log("• Result Delta Analysis - Change detection and analysis");
  console.log("• Workflow Orchestration - Multi-step process execution");
  console.log("• Context-Aware Execution - Project context analysis");

  console.log("\n🔄 Event-Driven Execution:");
  console.log("===========================");
  console.log("• Pre-commit Hooks - Code quality validation");
  console.log("• Pre-push Hooks - Dependency scanning");
  console.log("• Post-commit Hooks - Performance monitoring");
  console.log("• Scheduled Hooks - Security audits, backups");
  console.log("• Tag Creation Hooks - Deployment pipelines");
  console.log("• Pull Request Hooks - Test suite execution");
  console.log("• Merge Hooks - Documentation generation");

  console.log("\n🎯 Next Steps for JTBD:");
  console.log("========================");
  console.log("1. Add more JTBD categories and hooks");
  console.log("2. Implement additional SPARQL predicate types");
  console.log("3. Enhance context-aware decision making");
  console.log("4. Add more event-driven execution scenarios");
  console.log("5. Integrate with CI/CD pipelines");
  console.log("6. Add performance monitoring and optimization");
  console.log("7. Create JTBD training materials");

  console.log("\n🏆 JTBD Success Metrics:");
  console.log("========================");
  console.log(
    "• User Job Completion Rate - How often users accomplish their jobs"
  );
  console.log("• Context Accuracy - How well GitVan understands the situation");
  console.log(
    "• Outcome Achievement - How often desired outcomes are achieved"
  );
  console.log("• Intelligent Decision Quality - How good the AI decisions are");
  console.log(
    "• Knowledge Graph Utilization - How effectively knowledge is used"
  );
  console.log("• Event Response Time - How quickly hooks respond to events");

  process.exit(results.failed > 0 ? 1 : 0);
} catch (error) {
  console.error("❌ JTBD BDD Demonstration Error:", error.message);
  process.exit(1);
}
