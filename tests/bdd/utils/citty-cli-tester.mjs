/**
 * Citty Testing CLI Utilities for London BDD
 *
 * Provides comprehensive testing utilities for Citty-based CLI commands
 * following London BDD principles and Jobs-to-be-Done methodology
 */

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Citty CLI Testing Framework
 *
 * Provides utilities for testing Citty-based CLI commands with BDD approach
 */
export class CittyCLITester {
  constructor(options = {}) {
    this.options = {
      cliPath: options.cliPath || "src/cli.mjs",
      timeout: options.timeout || 30000,
      workingDir: options.workingDir || process.cwd(),
      verbose: options.verbose || false,
      ...options,
    };

    this.testData = new Map();
    this.commandHistory = [];
    this.context = {
      cwd: this.options.workingDir,
      env: { ...process.env },
      variables: new Map(),
    };
  }

  /**
   * Execute a Citty CLI command
   * @param {string} command - Command to execute
   * @param {object} options - Execution options
   * @returns {Promise<object>} Command result
   */
  async executeCommand(command, options = {}) {
    const startTime = Date.now();

    try {
      const args = command.split(" ");
      const execOptions = {
        cwd: this.context.cwd,
        timeout: options.timeout || this.options.timeout,
        env: { ...this.context.env, ...options.env },
        ...options,
      };

      if (this.options.verbose) {
        console.log(
          `🔧 Executing: node ${this.options.cliPath} ${args.join(" ")}`
        );
      }

      const result = await execFileAsync(
        "node",
        [this.options.cliPath, ...args],
        execOptions
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      const commandResult = {
        success: true,
        command,
        args,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
        duration,
        timestamp: new Date().toISOString(),
      };

      this.commandHistory.push(commandResult);
      this.testData.set("lastCommandResult", commandResult);

      return commandResult;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const commandResult = {
        success: false,
        command,
        args: command.split(" "),
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        exitCode: error.code || 1,
        error: error.message,
        duration,
        timestamp: new Date().toISOString(),
      };

      this.commandHistory.push(commandResult);
      this.testData.set("lastCommandResult", commandResult);

      return commandResult;
    }
  }

  /**
   * Execute command with interactive input
   * @param {string} command - Command to execute
   * @param {Array<string>} inputs - Input responses
   * @param {object} options - Execution options
   * @returns {Promise<object>} Command result
   */
  async executeInteractiveCommand(command, inputs = [], options = {}) {
    return new Promise((resolve, reject) => {
      const args = command.split(" ");
      const child = spawn("node", [this.options.cliPath, ...args], {
        cwd: this.context.cwd,
        env: { ...this.context.env, ...options.env },
        stdio: ["pipe", "pipe", "pipe"],
        ...options,
      });

      let stdout = "";
      let stderr = "";
      let inputIndex = 0;

      child.stdout.on("data", (data) => {
        stdout += data.toString();

        // Send input if available
        if (inputIndex < inputs.length) {
          child.stdin.write(inputs[inputIndex] + "\n");
          inputIndex++;
        }
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        const commandResult = {
          success: code === 0,
          command,
          args,
          stdout,
          stderr,
          exitCode: code,
          inputs,
          timestamp: new Date().toISOString(),
        };

        this.commandHistory.push(commandResult);
        this.testData.set("lastCommandResult", commandResult);

        resolve(commandResult);
      });

      child.on("error", (error) => {
        reject(error);
      });

      // Start the process
      setTimeout(() => {
        if (inputIndex < inputs.length) {
          child.stdin.write(inputs[inputIndex] + "\n");
          inputIndex++;
        }
      }, 100);
    });
  }

  /**
   * Set context variable
   * @param {string} key - Variable key
   * @param {any} value - Variable value
   */
  setContextVariable(key, value) {
    this.context.variables.set(key, value);
  }

  /**
   * Get context variable
   * @param {string} key - Variable key
   * @returns {any} Variable value
   */
  getContextVariable(key) {
    return this.context.variables.get(key);
  }

  /**
   * Set working directory
   * @param {string} cwd - Working directory path
   */
  setWorkingDirectory(cwd) {
    this.context.cwd = cwd;
  }

  /**
   * Set environment variable
   * @param {string} key - Environment variable key
   * @param {string} value - Environment variable value
   */
  setEnvironmentVariable(key, value) {
    this.context.env[key] = value;
  }

  /**
   * Get last command result
   * @returns {object} Last command result
   */
  getLastCommandResult() {
    return this.testData.get("lastCommandResult");
  }

  /**
   * Get command history
   * @returns {Array<object>} Command history
   */
  getCommandHistory() {
    return this.commandHistory;
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.commandHistory = [];
    this.testData.clear();
  }

  /**
   * Assert command succeeded
   * @param {object} result - Command result (optional, uses last if not provided)
   * @throws {Error} If command failed
   */
  assertCommandSucceeded(result = null) {
    const commandResult = result || this.getLastCommandResult();
    if (!commandResult || !commandResult.success) {
      throw new Error(
        `Command failed: ${commandResult?.error || "Unknown error"}`
      );
    }
  }

  /**
   * Assert command failed
   * @param {object} result - Command result (optional, uses last if not provided)
   * @throws {Error} If command succeeded
   */
  assertCommandFailed(result = null) {
    const commandResult = result || this.getLastCommandResult();
    if (!commandResult || commandResult.success) {
      throw new Error("Expected command to fail, but it succeeded");
    }
  }

  /**
   * Assert output contains text
   * @param {string} expectedText - Expected text
   * @param {object} result - Command result (optional, uses last if not provided)
   * @throws {Error} If text not found
   */
  assertOutputContains(expectedText, result = null) {
    const commandResult = result || this.getLastCommandResult();
    if (!commandResult) {
      throw new Error("No command result available");
    }

    const output = commandResult.stdout + commandResult.stderr;
    if (!output.includes(expectedText)) {
      throw new Error(
        `Expected to see "${expectedText}" in output, but got: ${output}`
      );
    }
  }

  /**
   * Assert output does not contain text
   * @param {string} unexpectedText - Unexpected text
   * @param {object} result - Command result (optional, uses last if not provided)
   * @throws {Error} If text found
   */
  assertOutputNotContains(unexpectedText, result = null) {
    const commandResult = result || this.getLastCommandResult();
    if (!commandResult) {
      throw new Error("No command result available");
    }

    const output = commandResult.stdout + commandResult.stderr;
    if (output.includes(unexpectedText)) {
      throw new Error(
        `Expected not to see "${unexpectedText}" in output, but got: ${output}`
      );
    }
  }

  /**
   * Assert exit code
   * @param {number} expectedCode - Expected exit code
   * @param {object} result - Command result (optional, uses last if not provided)
   * @throws {Error} If exit code doesn't match
   */
  assertExitCode(expectedCode, result = null) {
    const commandResult = result || this.getLastCommandResult();
    if (!commandResult) {
      throw new Error("No command result available");
    }

    if (commandResult.exitCode !== expectedCode) {
      throw new Error(
        `Expected exit code ${expectedCode}, but got ${commandResult.exitCode}`
      );
    }
  }

  /**
   * Assert command duration is within limit
   * @param {number} maxDuration - Maximum duration in milliseconds
   * @param {object} result - Command result (optional, uses last if not provided)
   * @throws {Error} If duration exceeds limit
   */
  assertDurationWithinLimit(maxDuration, result = null) {
    const commandResult = result || this.getLastCommandResult();
    if (!commandResult) {
      throw new Error("No command result available");
    }

    if (commandResult.duration > maxDuration) {
      throw new Error(
        `Command took ${commandResult.duration}ms, expected less than ${maxDuration}ms`
      );
    }
  }

  /**
   * Generate test report
   * @returns {object} Test report
   */
  generateTestReport() {
    const totalCommands = this.commandHistory.length;
    const successfulCommands = this.commandHistory.filter(
      (cmd) => cmd.success
    ).length;
    const failedCommands = totalCommands - successfulCommands;
    const totalDuration = this.commandHistory.reduce(
      (sum, cmd) => sum + cmd.duration,
      0
    );

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalCommands,
        successfulCommands,
        failedCommands,
        successRate:
          totalCommands > 0
            ? ((successfulCommands / totalCommands) * 100).toFixed(2)
            : 0,
        totalDuration,
        averageDuration:
          totalCommands > 0 ? (totalDuration / totalCommands).toFixed(2) : 0,
      },
      commands: this.commandHistory,
      context: {
        workingDirectory: this.context.cwd,
        environmentVariables: Object.keys(this.context.env).length,
        variables: this.context.variables.size,
      },
    };
  }
}

/**
 * BDD Step Definitions for Citty CLI Testing
 *
 * Provides Given-When-Then step definitions for testing Citty commands
 */
export const cittyBDDSteps = {
  // Given Steps - Setting up initial state
  "I have a Citty CLI application": async function (tester) {
    if (!existsSync(tester.options.cliPath)) {
      throw new Error(
        `CLI application not found at: ${tester.options.cliPath}`
      );
    }
    tester.setContextVariable("cliApplication", true);
  },

  'I am in the working directory "([^"]*)"': async function (
    tester,
    directory
  ) {
    tester.setWorkingDirectory(directory);
    tester.setContextVariable("workingDirectory", directory);
  },

  'I have the environment variable "([^"]*)" set to "([^"]*)"': async function (
    tester,
    key,
    value
  ) {
    tester.setEnvironmentVariable(key, value);
  },

  'I have a test file "([^"]*)" with content "([^"]*)"': async function (
    tester,
    filePath,
    content
  ) {
    const fullPath = join(tester.context.cwd, filePath);
    const dir = dirname(fullPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, content);
    tester.setContextVariable(`testFile:${filePath}`, fullPath);
  },

  "I have a Git repository initialized": async function (tester) {
    const result = await tester.executeCommand("git init");
    tester.assertCommandSucceeded(result);
    tester.setContextVariable("gitRepository", true);
  },

  "I have a GitVan project initialized": async function (tester) {
    const result = await tester.executeCommand("init");
    tester.assertCommandSucceeded(result);
    tester.setContextVariable("gitvanProject", true);
  },

  // When Steps - Performing actions
  'I run the command "([^"]*)"': async function (tester, command) {
    const result = await tester.executeCommand(command);
    tester.setContextVariable("lastCommand", command);
    return result;
  },

  'I run the command "([^"]*)" with input "([^"]*)"': async function (
    tester,
    command,
    input
  ) {
    const inputs = input.split(",").map((i) => i.trim());
    const result = await tester.executeInteractiveCommand(command, inputs);
    tester.setContextVariable("lastCommand", command);
    tester.setContextVariable("lastInput", input);
    return result;
  },

  'I run the command "([^"]*)" with timeout ([0-9]+)ms': async function (
    tester,
    command,
    timeout
  ) {
    const result = await tester.executeCommand(command, {
      timeout: parseInt(timeout),
    });
    tester.setContextVariable("lastCommand", command);
    tester.setContextVariable("lastTimeout", timeout);
    return result;
  },

  // Then Steps - Verifying outcomes
  "the command should succeed": async function (tester) {
    tester.assertCommandSucceeded();
  },

  "the command should fail": async function (tester) {
    tester.assertCommandFailed();
  },

  "the command should fail with exit code ([0-9]+)": async function (
    tester,
    exitCode
  ) {
    tester.assertCommandFailed();
    tester.assertExitCode(parseInt(exitCode));
  },

  'I should see "([^"]*)" in the output': async function (
    tester,
    expectedText
  ) {
    tester.assertOutputContains(expectedText);
  },

  'I should not see "([^"]*)" in the output': async function (
    tester,
    unexpectedText
  ) {
    tester.assertOutputNotContains(unexpectedText);
  },

  'the output should contain "([^"]*)"': async function (tester, expectedText) {
    tester.assertOutputContains(expectedText);
  },

  'the output should not contain "([^"]*)"': async function (
    tester,
    unexpectedText
  ) {
    tester.assertOutputNotContains(unexpectedText);
  },

  "the command should complete within ([0-9]+)ms": async function (
    tester,
    maxDuration
  ) {
    tester.assertDurationWithinLimit(parseInt(maxDuration));
  },

  "the exit code should be ([0-9]+)": async function (tester, expectedCode) {
    tester.assertExitCode(parseInt(expectedCode));
  },

  "the stdout should be empty": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }
    if (result.stdout.trim() !== "") {
      throw new Error(`Expected empty stdout, but got: ${result.stdout}`);
    }
  },

  "the stderr should be empty": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }
    if (result.stderr.trim() !== "") {
      throw new Error(`Expected empty stderr, but got: ${result.stderr}`);
    }
  },

  "the output should be formatted as JSON": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    try {
      JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(`Expected JSON output, but got: ${result.stdout}`);
    }
  },

  "the output should be valid YAML": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    // Basic YAML validation - check for common YAML patterns
    const yamlPatterns = [
      /^---$/m, // YAML document separator
      /^[a-zA-Z_][a-zA-Z0-9_]*:\s*$/m, // Key-value pairs
      /^\s*-\s+/m, // List items
    ];

    const hasYamlPattern = yamlPatterns.some((pattern) =>
      pattern.test(result.stdout)
    );
    if (!hasYamlPattern) {
      throw new Error(`Expected YAML output, but got: ${result.stdout}`);
    }
  },

  "the help text should be displayed": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const helpIndicators = [
      "USAGE",
      "COMMANDS",
      "OPTIONS",
      "EXAMPLES",
      "help",
      "--help",
      "-h",
    ];

    const output = result.stdout.toLowerCase();
    const hasHelpIndicator = helpIndicators.some((indicator) =>
      output.includes(indicator.toLowerCase())
    );

    if (!hasHelpIndicator) {
      throw new Error(`Expected help text, but got: ${result.stdout}`);
    }
  },

  "the version should be displayed": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const versionPattern = /\d+\.\d+\.\d+/;
    if (!versionPattern.test(result.stdout)) {
      throw new Error(`Expected version number, but got: ${result.stdout}`);
    }
  },

  "the command should show usage information": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const usageIndicators = ["USAGE", "usage:", "Usage:"];
    const output = result.stdout;
    const hasUsageIndicator = usageIndicators.some((indicator) =>
      output.includes(indicator)
    );

    if (!hasUsageIndicator) {
      throw new Error(`Expected usage information, but got: ${result.stdout}`);
    }
  },

  "the command should list available commands": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    const hasCommandList =
      output.includes("COMMANDS") ||
      output.includes("Available commands") ||
      output.includes("Subcommands");

    if (!hasCommandList) {
      throw new Error(`Expected command list, but got: ${result.stdout}`);
    }
  },

  "the command should show examples": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    const hasExamples =
      output.includes("EXAMPLES") ||
      output.includes("Examples:") ||
      output.includes("examples:");

    if (!hasExamples) {
      throw new Error(`Expected examples, but got: ${result.stdout}`);
    }
  },

  "the error message should be helpful": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const errorOutput = result.stderr || result.stdout;
    const helpfulIndicators = [
      "try",
      "use",
      "run",
      "help",
      "see",
      "check",
      "verify",
    ];

    const hasHelpfulIndicator = helpfulIndicators.some((indicator) =>
      errorOutput.toLowerCase().includes(indicator)
    );

    if (!hasHelpfulIndicator) {
      throw new Error(
        `Expected helpful error message, but got: ${errorOutput}`
      );
    }
  },

  "the command should be idempotent": async function (tester) {
    const lastCommand = tester.getContextVariable("lastCommand");
    if (!lastCommand) {
      throw new Error("No previous command to test idempotency");
    }

    // Run the command again
    const firstResult = tester.getLastCommandResult();
    const secondResult = await tester.executeCommand(lastCommand);

    // Compare results
    if (firstResult.success !== secondResult.success) {
      throw new Error("Command is not idempotent - success status differs");
    }

    if (firstResult.exitCode !== secondResult.exitCode) {
      throw new Error("Command is not idempotent - exit codes differ");
    }
  },

  "the command should be deterministic": async function (tester) {
    const lastCommand = tester.getContextVariable("lastCommand");
    if (!lastCommand) {
      throw new Error("No previous command to test determinism");
    }

    // Run the command multiple times
    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = await tester.executeCommand(lastCommand);
      results.push(result);
    }

    // Check that all results are identical
    const firstResult = results[0];
    for (let i = 1; i < results.length; i++) {
      const result = results[i];
      if (
        result.success !== firstResult.success ||
        result.exitCode !== firstResult.exitCode ||
        result.stdout !== firstResult.stdout
      ) {
        throw new Error(
          "Command is not deterministic - results differ between runs"
        );
      }
    }
  },
};

/**
 * BDD Test Runner for Citty CLI
 *
 * Runs BDD scenarios specifically for Citty CLI testing
 */
export class CittyBDDRunner {
  constructor(options = {}) {
    this.options = {
      featuresDir: options.featuresDir || "tests/bdd/features",
      reportsDir: options.reportsDir || "tests/bdd/reports",
      verbose: options.verbose || false,
      ...options,
    };

    this.tester = new CittyCLITester(options);
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      scenarios: [],
    };
  }

  /**
   * Run BDD test scenario
   * @param {object} scenario - BDD scenario
   * @returns {Promise<object>} Test result
   */
  async runScenario(scenario) {
    const scenarioResult = {
      name: scenario.name,
      steps: [],
      passed: true,
      error: null,
      startTime: Date.now(),
    };

    try {
      for (const step of scenario.steps) {
        const stepResult = await this.executeStep(step);
        scenarioResult.steps.push(stepResult);

        if (!stepResult.passed) {
          scenarioResult.passed = false;
          scenarioResult.error = stepResult.error;
          break;
        }
      }
    } catch (error) {
      scenarioResult.passed = false;
      scenarioResult.error = error.message;
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

    return scenarioResult;
  }

  /**
   * Execute BDD step
   * @param {object} step - BDD step
   * @returns {Promise<object>} Step result
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
      const stepDefinition = this.findStepDefinition(step.text);
      if (!stepDefinition) {
        throw new Error(`No step definition found for: ${step.text}`);
      }

      await stepDefinition.call(this, this.tester);
      stepResult.passed = true;
    } catch (error) {
      stepResult.error = error.message;
    }

    stepResult.endTime = Date.now();
    stepResult.duration = stepResult.endTime - stepResult.startTime;

    return stepResult;
  }

  /**
   * Find step definition for step text
   * @param {string} stepText - Step text
   * @returns {Function|null} Step definition function
   */
  findStepDefinition(stepText) {
    for (const [pattern, definition] of Object.entries(cittyBDDSteps)) {
      if (this.matchesStepPattern(pattern, stepText)) {
        return definition;
      }
    }
    return null;
  }

  /**
   * Check if step text matches pattern
   * @param {string} pattern - Step pattern
   * @param {string} stepText - Step text
   * @returns {boolean} Whether pattern matches
   */
  matchesStepPattern(pattern, stepText) {
    const regexPattern = pattern
      .replace(/\([^)]*\)/g, '([^"]*)')
      .replace(/\[([^\]]*)\]/g, "($1)")
      .replace(/\*/g, ".*");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(stepText);
  }

  /**
   * Generate test report
   * @returns {object} Test report
   */
  generateReport() {
    return {
      timestamp: new Date().toISOString(),
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
      scenarios: this.results.scenarios,
      commandHistory: this.tester.getCommandHistory(),
      testReport: this.tester.generateTestReport(),
    };
  }
}

// Export utilities
export default {
  CittyCLITester,
  CittyBDDRunner,
  cittyBDDSteps,
};
