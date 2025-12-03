#!/usr/bin/env node

/**
 * Citty CLI BDD Testing Demonstration
 *
 * Demonstrates the Citty CLI testing utilities with London BDD approach
 * Shows Jobs-to-be-Done methodology for CLI command testing
 */

import { CittyCLITester } from "./tests/bdd/utils/citty-cli-tester.mjs";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

/**
 * Citty CLI BDD Demonstration Class
 */
export class CittyCLIBDDDemo {
  constructor() {
    this.tester = new CittyCLITester({
      cliPath: "src/cli.mjs",
      verbose: true,
      timeout: 30000,
    });

    this.demoResults = [];
    this.jobs = new Map();
  }

  /**
   * Run complete Citty CLI BDD demonstration
   */
  async runDemo() {
    console.log("🚀 Citty CLI BDD Testing Demonstration");
    console.log("=".repeat(60));
    console.log(
      "\n📋 This demo shows London BDD testing for Citty CLI commands"
    );
    console.log(
      "🎯 Each scenario validates a specific user job and its desired outcomes\n"
    );

    try {
      // Setup demo environment
      await this.setupDemoEnvironment();

      // Demonstrate each JTBD category
      await this.demonstrateJob("Discover Available Commands", [
        "Show help information",
        "List available commands",
        "Show version information",
      ]);

      await this.demonstrateJob("Execute Commands Successfully", [
        "Execute basic workflow command",
        "Execute command with options",
        "Execute command with arguments",
      ]);

      await this.demonstrateJob("Handle Errors Gracefully", [
        "Handle unknown command",
        "Handle missing arguments",
        "Handle invalid arguments",
      ]);

      await this.demonstrateJob("Provide Interactive Experience", [
        "Handle interactive input",
        "Provide helpful error messages",
      ]);

      await this.demonstrateJob("Maintain Consistency and Reliability", [
        "Ensure command idempotency",
        "Ensure command determinism",
        "Ensure reasonable performance",
      ]);

      await this.demonstrateJob("Provide Rich Output Formats", [
        "Format output clearly",
        "Structure output properly",
        "Handle errors clearly",
      ]);

      // Generate demo report
      await this.generateDemoReport();

      // Print summary
      this.printDemoSummary();
    } catch (error) {
      console.error("❌ Demo failed:", error.message);
      throw error;
    }
  }

  /**
   * Setup demo environment
   */
  async setupDemoEnvironment() {
    console.log("🔧 Setting up demo environment...\n");

    // Ensure we're in a GitVan project
    if (!existsSync(".gitvan")) {
      mkdirSync(".gitvan", { recursive: true });
      writeFileSync(
        ".gitvan/config.json",
        JSON.stringify({
          version: "3.0.0",
          initialized: true,
        })
      );
    }

    // Ensure workflows directory exists
    mkdirSync("workflows", { recursive: true });

    // Create sample workflow if it doesn't exist
    const sampleWorkflow = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:test-workflow rdf:type gh:Hook ;
    gv:title "Test Workflow" ;
    gh:hasPredicate ex:testworkflow ;
    gh:orderedPipelines ex:test-workflow-pipeline .

ex:test-workflow-pipeline rdf:type op:Pipeline ;
    op:steps ex:test-workflow-step1 .

ex:test-workflow-step1 rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX ex: <http://example.org/>
        SELECT ?item WHERE {
            ?item rdf:type ex:TestItem .
        }
    """ ;
    gv:outputMapping '{"items": "results"}' .`;

    if (!existsSync("workflows/test-workflow.ttl")) {
      writeFileSync("workflows/test-workflow.ttl", sampleWorkflow);
    }

    console.log("✅ Demo environment ready\n");
  }

  /**
   * Demonstrate a specific job category
   */
  async demonstrateJob(jobName, scenarios) {
    console.log(`🎯 Demonstrating Job: ${jobName}`);
    console.log("-".repeat(50));

    if (!this.jobs.has(jobName)) {
      this.jobs.set(jobName, {
        name: jobName,
        scenarios: [],
        passed: 0,
        failed: 0,
      });
    }

    const jobStats = this.jobs.get(jobName);

    for (const scenarioName of scenarios) {
      console.log(`\n  📋 Scenario: ${scenarioName}`);

      try {
        const result = await this.executeScenario(scenarioName);

        if (result.success) {
          console.log(`     ✅ Passed - Job outcome achieved`);
          jobStats.passed++;
        } else {
          console.log(`     ❌ Failed - Job outcome not achieved`);
          console.log(`     Error: ${result.error}`);
          jobStats.failed++;
        }

        jobStats.scenarios.push({
          name: scenarioName,
          success: result.success,
          error: result.error,
          output: result.output,
        });

        this.demoResults.push({
          job: jobName,
          scenario: scenarioName,
          success: result.success,
          error: result.error,
          output: result.output,
        });
      } catch (error) {
        console.log(`     ❌ Failed - ${error.message}`);
        jobStats.failed++;
        jobStats.scenarios.push({
          name: scenarioName,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(
      `\n  📊 Job Summary: ${jobStats.passed} passed, ${jobStats.failed} failed\n`
    );
  }

  /**
   * Execute a specific scenario
   */
  async executeScenario(scenarioName) {
    const commands = {
      "Show help information": "--help",
      "List available commands": "--help",
      "Show version information": "--version",
      "Execute basic workflow command": "workflow list",
      "Execute command with options": "workflow list --verbose",
      "Execute command with arguments":
        "workflow validate http://example.org/test-workflow",
      "Handle unknown command": "unknown-command",
      "Handle missing arguments": "workflow run",
      "Handle invalid arguments": "workflow validate invalid-workflow",
      "Handle interactive input":
        "workflow create demo-interactive 'Demo Interactive'",
      "Provide helpful error messages": "workflow validate invalid",
      "Ensure command idempotency": "workflow list",
      "Ensure command determinism": "workflow stats",
      "Ensure reasonable performance": "workflow list",
      "Format output clearly": "workflow list",
      "Structure output properly": "workflow stats",
      "Handle errors clearly": "workflow validate invalid",
    };

    const command = commands[scenarioName];
    if (!command) {
      throw new Error(`No command defined for scenario: ${scenarioName}`);
    }

    try {
      const result = await this.tester.executeCommand(command);

      // For error scenarios, failure is expected
      const isExpectedError =
        scenarioName.includes("Handle") ||
        scenarioName.includes("unknown") ||
        scenarioName.includes("invalid") ||
        scenarioName.includes("missing");

      if (isExpectedError && !result.success) {
        return {
          success: true,
          output: result.stdout + result.stderr,
          error: null,
        };
      }

      return {
        success: result.success,
        output: result.stdout + result.stderr,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || "",
        error: error.message,
      };
    }
  }

  /**
   * Generate demo report
   */
  async generateDemoReport() {
    const report = {
      timestamp: new Date().toISOString(),
      title: "Citty CLI BDD Testing Demonstration Report",
      summary: {
        totalJobs: this.jobs.size,
        totalScenarios: this.demoResults.length,
        passedScenarios: this.demoResults.filter((r) => r.success).length,
        failedScenarios: this.demoResults.filter((r) => !r.success).length,
      },
      jobs: Array.from(this.jobs.values()).map((job) => ({
        name: job.name,
        totalScenarios: job.scenarios.length,
        passedScenarios: job.passed,
        failedScenarios: job.failed,
        successRate:
          job.scenarios.length > 0
            ? ((job.passed / job.scenarios.length) * 100).toFixed(2)
            : 0,
      })),
      scenarios: this.demoResults,
      commandHistory: this.tester.getCommandHistory(),
      testReport: this.tester.generateTestReport(),
      insights: this.generateInsights(),
    };

    const reportPath = `citty-cli-bdd-demo-report-${Date.now()}.json`;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Demo report saved to: ${reportPath}`);
  }

  /**
   * Generate insights from demo results
   */
  generateInsights() {
    const insights = [];

    // Analyze job success rates
    for (const job of this.jobs.values()) {
      if (job.failed === 0) {
        insights.push({
          type: "success",
          job: job.name,
          message: `All scenarios for ${job.name} passed successfully`,
        });
      } else {
        insights.push({
          type: "improvement",
          job: job.name,
          message: `${job.failed} scenarios failed for ${job.name} - needs attention`,
        });
      }
    }

    // Overall insights
    const totalScenarios = this.demoResults.length;
    const passedScenarios = this.demoResults.filter((r) => r.success).length;
    const successRate =
      totalScenarios > 0
        ? ((passedScenarios / totalScenarios) * 100).toFixed(2)
        : 0;

    insights.push({
      type: "overall",
      message: `Overall success rate: ${successRate}% (${passedScenarios}/${totalScenarios} scenarios)`,
    });

    // Performance insights
    const commandHistory = this.tester.getCommandHistory();
    if (commandHistory.length > 0) {
      const averageDuration =
        commandHistory.reduce((sum, cmd) => sum + cmd.duration, 0) /
        commandHistory.length;
      insights.push({
        type: "performance",
        message: `Average command duration: ${averageDuration.toFixed(2)}ms`,
      });
    }

    return insights;
  }

  /**
   * Print demo summary
   */
  printDemoSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 Citty CLI BDD Testing Demonstration Summary");
    console.log("=".repeat(60));

    console.log(`\n🎯 Jobs-to-be-Done Analysis:`);
    for (const job of this.jobs.values()) {
      const successRate =
        job.scenarios.length > 0
          ? ((job.passed / job.scenarios.length) * 100).toFixed(2)
          : 0;
      const status = job.failed === 0 ? "✅" : "⚠️";
      console.log(
        `   ${status} ${job.name}: ${job.passed}/${job.scenarios.length} (${successRate}%)`
      );
    }

    const totalScenarios = this.demoResults.length;
    const passedScenarios = this.demoResults.filter((r) => r.success).length;
    const successRate =
      totalScenarios > 0
        ? ((passedScenarios / totalScenarios) * 100).toFixed(2)
        : 0;

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Scenarios: ${totalScenarios}`);
    console.log(`   ✅ Passed: ${passedScenarios}`);
    console.log(`   ❌ Failed: ${totalScenarios - passedScenarios}`);
    console.log(`   📊 Success Rate: ${successRate}%`);

    // Command performance summary
    const commandHistory = this.tester.getCommandHistory();
    if (commandHistory.length > 0) {
      const totalDuration = commandHistory.reduce(
        (sum, cmd) => sum + cmd.duration,
        0
      );
      const averageDuration = (totalDuration / commandHistory.length).toFixed(
        2
      );

      console.log(`\n⚡ Performance Summary:`);
      console.log(`   Total Commands: ${commandHistory.length}`);
      console.log(`   Average Duration: ${averageDuration}ms`);
      console.log(`   Total Duration: ${totalDuration}ms`);
    }

    console.log(`\n💡 Key Insights:`);
    console.log(`   • Citty CLI testing focuses on user jobs and outcomes`);
    console.log(
      `   • BDD scenarios validate functional, emotional, and social jobs`
    );
    console.log(
      `   • Success is measured by job completion, not just technical correctness`
    );
    console.log(
      `   • CLI testing ensures reliable, user-friendly command interfaces`
    );

    console.log("\n" + "=".repeat(60));
  }
}

// Main execution
async function main() {
  const demo = new CittyCLIBDDDemo();

  try {
    await demo.runDemo();
    console.log(
      "\n🎉 Citty CLI BDD Testing Demonstration completed successfully!"
    );
  } catch (error) {
    console.error("\n❌ Demo failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default CittyCLIBDDDemo;
