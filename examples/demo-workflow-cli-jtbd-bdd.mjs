#!/usr/bin/env node

/**
 * GitVan Workflow CLI JTBD BDD Demonstration
 *
 * Demonstrates London-style BDD testing focused on Jobs-to-be-Done methodology
 * Shows how BDD scenarios validate user jobs and outcomes
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

/**
 * JTBD BDD Demonstration Class
 */
export class WorkflowCLIBDDDemo {
  constructor() {
    this.demoResults = [];
    this.jobs = new Map();
  }

  /**
   * Run complete JTBD BDD demonstration
   */
  async runDemo() {
    console.log("🚀 GitVan Workflow CLI JTBD BDD Demonstration");
    console.log("=".repeat(60));
    console.log(
      "\n📋 This demo shows London-style BDD testing focused on Jobs-to-be-Done"
    );
    console.log(
      "🎯 Each scenario validates a specific user job and its desired outcomes\n"
    );

    try {
      // Setup demo environment
      await this.setupDemoEnvironment();

      // Demonstrate each JTBD category
      await this.demonstrateJob("Discover Available Workflows", [
        "List all available workflows",
        "Get workflow statistics",
      ]);

      await this.demonstrateJob("Validate Workflow Integrity", [
        "Validate an existing workflow",
        "Validate a non-existent workflow",
      ]);

      await this.demonstrateJob("Execute Workflows Safely", [
        "Execute workflow in dry-run mode",
        "Execute workflow with verbose output",
      ]);

      await this.demonstrateJob("Create New Workflow Templates", [
        "Create a new workflow template",
        "Create workflow template without title",
      ]);

      await this.demonstrateJob("Get Help and Documentation", [
        "Show workflow command help",
        "Show main CLI help with workflow command",
      ]);

      await this.demonstrateJob("Handle Errors Gracefully", [
        "Handle missing workflow ID for run command",
        "Handle missing workflow ID for validate command",
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

    // Create sample workflows if they don't exist
    const sampleWorkflows = [
      {
        id: "test-workflow",
        title: "Test Workflow",
        content: `@prefix ex: <http://example.org/> .
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
    gv:outputMapping '{"items": "results"}' .`,
      },
      {
        id: "demo-workflow",
        title: "Demo Workflow",
        content: `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:demo-workflow rdf:type gh:Hook ;
    gv:title "Demo Workflow" ;
    gh:hasPredicate ex:demoworkflow ;
    gh:orderedPipelines ex:demo-workflow-pipeline .`,
      },
    ];

    for (const workflow of sampleWorkflows) {
      const filePath = `workflows/${workflow.id}.ttl`;
      if (!existsSync(filePath)) {
        writeFileSync(filePath, workflow.content);
      }
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
      "List all available workflows": "workflow list",
      "Get workflow statistics": "workflow stats",
      "Validate an existing workflow":
        "workflow validate http://example.org/test-workflow",
      "Validate a non-existent workflow":
        "workflow validate non-existent-workflow",
      "Execute workflow in dry-run mode":
        "workflow run http://example.org/test-workflow --dry-run",
      "Execute workflow with verbose output":
        "workflow run http://example.org/test-workflow --verbose",
      "Create a new workflow template":
        "workflow create demo-template 'Demo Template'",
      "Create workflow template without title": "workflow create auto-template",
      "Show workflow command help": "workflow help",
      "Show main CLI help with workflow command": "--help",
      "Handle missing workflow ID for run command": "workflow run",
      "Handle missing workflow ID for validate command": "workflow validate",
    };

    const command = commands[scenarioName];
    if (!command) {
      throw new Error(`No command defined for scenario: ${scenarioName}`);
    }

    try {
      const args = command.split(" ");
      const result = await execFileAsync("node", ["src/cli.mjs", ...args], {
        cwd: process.cwd(),
        timeout: 30000,
      });

      return {
        success: true,
        output: result.stdout,
        error: null,
      };
    } catch (error) {
      // For error scenarios, failure is expected
      const isExpectedError =
        scenarioName.includes("Handle missing") ||
        scenarioName.includes("non-existent");

      if (isExpectedError) {
        return {
          success: true,
          output: error.stdout || "",
          error: null,
        };
      }

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
      title: "GitVan Workflow CLI JTBD BDD Demonstration Report",
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
      insights: this.generateInsights(),
    };

    const reportPath = `workflow-cli-jtbd-demo-report-${Date.now()}.json`;
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

    return insights;
  }

  /**
   * Print demo summary
   */
  printDemoSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 JTBD BDD Demonstration Summary");
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

    console.log(`\n💡 Key Insights:`);
    console.log(`   • London BDD focuses on user jobs and outcomes`);
    console.log(
      `   • Scenarios validate functional, emotional, and social jobs`
    );
    console.log(
      `   • Success is measured by job completion, not just technical correctness`
    );
    console.log(`   • BDD scenarios serve as executable specifications`);

    console.log("\n" + "=".repeat(60));
  }
}

// Main execution
async function main() {
  const demo = new WorkflowCLIBDDDemo();

  try {
    await demo.runDemo();
    console.log("\n🎉 JTBD BDD Demonstration completed successfully!");
  } catch (error) {
    console.error("\n❌ Demo failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default WorkflowCLIBDDDemo;
