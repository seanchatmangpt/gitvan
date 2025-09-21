#!/usr/bin/env node

/**
 * Citty CLI BDD Test Runner
 *
 * Comprehensive test runner for Citty-based CLI commands using London BDD
 * Focuses on Jobs-to-be-Done methodology and user-centric testing
 */

import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CittyCLITester, CittyBDDRunner } from "./utils/citty-cli-tester.mjs";
import cittyCLISteps from "./step-definitions/citty-cli-steps.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Citty CLI BDD Test Runner
 */
export class CittyCLIBDDRunner {
  constructor(options = {}) {
    this.options = {
      featuresDir: join(__dirname, "features"),
      reportsDir: join(__dirname, "reports"),
      cliPath: options.cliPath || "src/cli.mjs",
      verbose: options.verbose || false,
      timeout: options.timeout || 30000,
      ...options,
    };

    this.tester = new CittyCLITester({
      cliPath: this.options.cliPath,
      timeout: this.options.timeout,
      verbose: this.options.verbose,
    });

    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      scenarios: [],
      jobs: new Map(),
    };

    this.stepDefinitions = cittyCLISteps;
  }

  /**
   * Run all Citty CLI BDD tests
   */
  async runAll() {
    console.log("🚀 Starting Citty CLI BDD Test Suite\n");
    console.log("📋 Testing Jobs-to-be-Done scenarios for CLI commands\n");

    try {
      // Ensure reports directory exists
      await mkdir(this.options.reportsDir, { recursive: true });

      // Find and run all feature files
      const featureFiles = await this.findFeatureFiles();

      for (const featureFile of featureFiles) {
        await this.runFeatureFile(featureFile);
      }

      // Generate comprehensive report
      await this.generateReport();

      // Print summary
      this.printSummary();

      return this.results;
    } catch (error) {
      console.error("❌ BDD Test Suite failed:", error.message);
      throw error;
    }
  }

  /**
   * Find all feature files
   */
  async findFeatureFiles() {
    const files = await readdir(this.options.featuresDir);
    return files
      .filter((file) => file.endsWith(".feature"))
      .map((file) => join(this.options.featuresDir, file));
  }

  /**
   * Run a single feature file
   */
  async runFeatureFile(featurePath) {
    const content = await readFile(featurePath, "utf8");
    const feature = this.parseFeature(content);

    console.log(`\n📁 Running Feature: ${feature.name}`);
    console.log(`📝 ${feature.description}\n`);

    for (const scenario of feature.scenarios) {
      await this.runScenario(scenario, featurePath);
    }
  }

  /**
   * Parse Gherkin feature file
   */
  parseFeature(content) {
    const lines = content.split("\n").map((line) => line.trim());
    const feature = {
      name: "",
      description: "",
      scenarios: [],
    };

    let currentScenario = null;
    let inBackground = false;
    let backgroundSteps = [];

    for (const line of lines) {
      if (line.startsWith("Feature:")) {
        feature.name = line.replace("Feature:", "").trim();
      } else if (
        line.startsWith("As a") ||
        line.startsWith("I want") ||
        line.startsWith("So that")
      ) {
        feature.description += line + " ";
      } else if (line.startsWith("Background:")) {
        inBackground = true;
      } else if (line.startsWith("Scenario:")) {
        if (currentScenario) {
          feature.scenarios.push(currentScenario);
        }
        currentScenario = {
          name: line.replace("Scenario:", "").trim(),
          steps: [...backgroundSteps], // Include background steps
          job: this.extractJobFromScenario(line),
          outcome: null,
        };
        inBackground = false;
      } else if (
        line.startsWith("Given ") ||
        line.startsWith("When ") ||
        line.startsWith("Then ") ||
        line.startsWith("And ")
      ) {
        const step = {
          type: line.split(" ")[0].toLowerCase(),
          text: line.substring(line.indexOf(" ") + 1),
          originalText: line,
        };

        if (inBackground) {
          backgroundSteps.push(step);
        } else if (currentScenario) {
          currentScenario.steps.push(step);
        }
      }
    }

    if (currentScenario) {
      feature.scenarios.push(currentScenario);
    }

    return feature;
  }

  /**
   * Extract job from scenario name
   */
  extractJobFromScenario(scenarioName) {
    const jobPatterns = {
      "List all available commands": "Discover Available Commands",
      "Show help for specific command": "Discover Available Commands",
      "Show version information": "Discover Available Commands",
      "Execute basic command": "Execute Commands Successfully",
      "Execute command with options": "Execute Commands Successfully",
      "Execute command with positional arguments":
        "Execute Commands Successfully",
      "Execute command with multiple arguments":
        "Execute Commands Successfully",
      "Handle unknown command": "Handle Errors Gracefully",
      "Handle missing required arguments": "Handle Errors Gracefully",
      "Handle invalid arguments": "Handle Errors Gracefully",
      "Handle command timeout": "Handle Errors Gracefully",
      "Handle interactive input": "Provide Interactive Experience",
      "Handle multiple interactive inputs": "Provide Interactive Experience",
      "Command should be idempotent": "Maintain Consistency and Reliability",
      "Command should be deterministic": "Maintain Consistency and Reliability",
      "Command should complete within reasonable time":
        "Maintain Consistency and Reliability",
      "Output should be well-formatted": "Provide Rich Output Formats",
      "Output should be structured": "Provide Rich Output Formats",
      "Error output should be clear": "Provide Rich Output Formats",
      "Work in different working directories": "Handle Different Environments",
      "Handle environment variables": "Handle Different Environments",
      "Handle missing environment": "Handle Different Environments",
      "Show detailed help information": "Provide Comprehensive Help",
      "Show command-specific help": "Provide Comprehensive Help",
      "Show subcommand help": "Provide Comprehensive Help",
      "Validate JSON output": "Validate Input and Output",
      "Validate structured output": "Validate Input and Output",
      "Validate error output format": "Validate Input and Output",
      "Handle sensitive data safely": "Ensure Security and Safety",
      "Validate file operations": "Ensure Security and Safety",
      "Handle file system errors gracefully": "Ensure Security and Safety",
      "Handle large datasets efficiently":
        "Provide Performance and Scalability",
      "Handle concurrent operations": "Provide Performance and Scalability",
      "Handle memory constraints": "Provide Performance and Scalability",
      "Support legacy command formats": "Maintain Backward Compatibility",
      "Handle deprecated options gracefully": "Maintain Backward Compatibility",
      "Provide migration guidance": "Maintain Backward Compatibility",
    };

    for (const [pattern, job] of Object.entries(jobPatterns)) {
      if (scenarioName.includes(pattern)) {
        return job;
      }
    }

    return "Unknown Job";
  }

  /**
   * Run a single scenario
   */
  async runScenario(scenario, featurePath) {
    console.log(`  🎯 Scenario: ${scenario.name}`);

    if (this.options.verbose) {
      console.log(`     Job: ${scenario.job}`);
    }

    const scenarioResult = {
      name: scenario.name,
      job: scenario.job,
      steps: [],
      passed: true,
      error: null,
      startTime: Date.now(),
    };

    try {
      // Track job execution
      if (!this.results.jobs.has(scenario.job)) {
        this.results.jobs.set(scenario.job, {
          name: scenario.job,
          total: 0,
          passed: 0,
          failed: 0,
          scenarios: [],
        });
      }

      const jobStats = this.results.jobs.get(scenario.job);
      jobStats.total++;
      jobStats.scenarios.push(scenario.name);

      // Execute each step
      for (const step of scenario.steps) {
        const stepResult = await this.executeStep(step);
        scenarioResult.steps.push(stepResult);

        if (!stepResult.passed) {
          scenarioResult.passed = false;
          scenarioResult.error = stepResult.error;
          break;
        }
      }

      if (scenarioResult.passed) {
        jobStats.passed++;
        console.log(`     ✅ Passed`);
      } else {
        jobStats.failed++;
        console.log(`     ❌ Failed: ${scenarioResult.error}`);
      }
    } catch (error) {
      scenarioResult.passed = false;
      scenarioResult.error = error.message;
      console.log(`     ❌ Failed: ${error.message}`);
    }

    scenarioResult.endTime = Date.now();
    scenarioResult.duration = scenarioResult.endTime - scenarioResult.startTime;

    this.results.scenarios.push(scenarioResult);
    this.results.total++;

    if (scenarioResult.passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
  }

  /**
   * Execute a single step
   */
  async executeStep(step) {
    const stepResult = {
      type: step.type,
      text: step.text,
      passed: false,
      error: null,
      startTime: Date.now(),
    };

    try {
      // Find matching step definition
      const stepDefinition = this.findStepDefinition(step.text);

      if (!stepDefinition) {
        throw new Error(`No step definition found for: ${step.text}`);
      }

      // Execute step definition with tester context
      await stepDefinition.call(this, this.tester);

      stepResult.passed = true;

      if (this.options.verbose) {
        console.log(`       ${step.type} ${step.text} ✅`);
      }
    } catch (error) {
      stepResult.error = error.message;

      if (this.options.verbose) {
        console.log(`       ${step.type} ${step.text} ❌`);
      }
    }

    stepResult.endTime = Date.now();
    stepResult.duration = stepResult.endTime - stepResult.startTime;

    return stepResult;
  }

  /**
   * Find step definition for given step text
   */
  findStepDefinition(stepText) {
    for (const [pattern, definition] of Object.entries(this.stepDefinitions)) {
      if (this.matchesStepPattern(pattern, stepText)) {
        return definition;
      }
    }
    return null;
  }

  /**
   * Check if step text matches pattern
   */
  matchesStepPattern(pattern, stepText) {
    // Convert Gherkin pattern to regex
    const regexPattern = pattern
      .replace(/\([^)]*\)/g, '([^"]*)') // Replace capture groups
      .replace(/\[([^\]]*)\]/g, "($1)") // Replace optional groups
      .replace(/\*/g, ".*"); // Replace wildcards

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(stepText);
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      title: "Citty CLI BDD Test Report",
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        successRate:
          this.results.total > 0
            ? ((this.results.passed / this.results.total) * 100).toFixed(2)
            : 0,
      },
      jobs: Array.from(this.results.jobs.values()).map((job) => ({
        ...job,
        successRate:
          job.total > 0 ? ((job.passed / job.total) * 100).toFixed(2) : 0,
      })),
      scenarios: this.results.scenarios,
      commandHistory: this.tester.getCommandHistory(),
      testReport: this.tester.generateTestReport(),
      recommendations: this.generateRecommendations(),
    };

    const reportPath = join(
      this.options.reportsDir,
      `citty-cli-bdd-report-${Date.now()}.json`
    );
    await writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];

    // Analyze job success rates
    for (const job of this.results.jobs.values()) {
      if (job.failed > 0) {
        recommendations.push({
          type: "job_improvement",
          job: job.name,
          issue: `${job.failed} scenarios failed`,
          recommendation: `Review and improve ${job.name} functionality`,
        });
      }
    }

    // Analyze overall success rate
    if (this.results.failed > 0) {
      recommendations.push({
        type: "overall_improvement",
        issue: `${this.results.failed} total scenarios failed`,
        recommendation:
          "Review failed scenarios and improve CLI implementation",
      });
    }

    // Analyze command performance
    const commandHistory = this.tester.getCommandHistory();
    const slowCommands = commandHistory.filter((cmd) => cmd.duration > 3000);
    if (slowCommands.length > 0) {
      recommendations.push({
        type: "performance_improvement",
        issue: `${slowCommands.length} commands took longer than 3 seconds`,
        recommendation:
          "Optimize command performance for better user experience",
      });
    }

    return recommendations;
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 Citty CLI BDD Test Summary");
    console.log("=".repeat(60));

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Scenarios: ${this.results.total}`);
    console.log(`   ✅ Passed: ${this.results.passed}`);
    console.log(`   ❌ Failed: ${this.results.failed}`);
    console.log(`   ⏭️ Skipped: ${this.results.skipped}`);
    console.log(
      `   📊 Success Rate: ${
        this.results.total > 0
          ? ((this.results.passed / this.results.total) * 100).toFixed(2)
          : 0
      }%`
    );

    console.log(`\n🎯 Jobs-to-be-Done Analysis:`);
    for (const job of this.results.jobs.values()) {
      const successRate =
        job.total > 0 ? ((job.passed / job.total) * 100).toFixed(2) : 0;
      const status = job.failed === 0 ? "✅" : "❌";
      console.log(
        `   ${status} ${job.name}: ${job.passed}/${job.total} (${successRate}%)`
      );
    }

    if (this.results.failed > 0) {
      console.log(`\n⚠️ Failed Scenarios:`);
      this.results.scenarios
        .filter((s) => !s.passed)
        .forEach((scenario) => {
          console.log(`   ❌ ${scenario.name} (${scenario.job})`);
          console.log(`      Error: ${scenario.error}`);
        });
    }

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

    console.log("\n" + "=".repeat(60));
  }
}

// Main execution
async function main() {
  const runner = new CittyCLIBDDRunner({ verbose: true });

  try {
    await runner.runAll();
    process.exit(runner.results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Test runner failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default CittyCLIBDDRunner;
