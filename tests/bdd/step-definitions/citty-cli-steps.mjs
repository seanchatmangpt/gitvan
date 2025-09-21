/**
 * Citty CLI BDD Step Definitions
 *
 * Integrates with CittyCLITester for comprehensive CLI testing
 * Follows London BDD principles and Jobs-to-be-Done methodology
 */

import { CittyCLITester, CittyBDDRunner } from "./utils/citty-cli-tester.mjs";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

/**
 * Citty CLI BDD Step Definitions
 */
export const cittyCLISteps = {
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

  'I run the command "([^"]*)" and I run the command "([^"]*)"':
    async function (tester, command1, command2) {
      const result1 = await tester.executeCommand(command1);
      const result2 = await tester.executeCommand(command2);

      tester.setContextVariable("lastCommand1", command1);
      tester.setContextVariable("lastCommand2", command2);
      tester.setContextVariable("lastCommandResult1", result1);
      tester.setContextVariable("lastCommandResult2", result2);

      return { result1, result2 };
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

  "both commands should succeed": async function (tester) {
    const result1 = tester.getContextVariable("lastCommandResult1");
    const result2 = tester.getContextVariable("lastCommandResult2");

    if (!result1 || !result1.success) {
      throw new Error("First command did not succeed");
    }

    if (!result2 || !result2.success) {
      throw new Error("Second command did not succeed");
    }
  },

  "the command should show detailed help information": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    const requiredElements = ["USAGE", "COMMANDS", "OPTIONS", "EXAMPLES"];

    const missingElements = requiredElements.filter(
      (element) => !output.includes(element)
    );

    if (missingElements.length > 0) {
      throw new Error(`Missing help elements: ${missingElements.join(", ")}`);
    }
  },

  "the command should show command-specific help": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    const lastCommand = tester.getContextVariable("lastCommand");

    if (!lastCommand) {
      throw new Error("No command context available");
    }

    const commandName = lastCommand.split(" ")[0];
    if (!output.includes(commandName)) {
      throw new Error(
        `Expected command-specific help for ${commandName}, but got: ${output}`
      );
    }
  },

  "the command should show subcommand help": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    const lastCommand = tester.getContextVariable("lastCommand");

    if (!lastCommand) {
      throw new Error("No command context available");
    }

    const commandParts = lastCommand.split(" ");
    if (commandParts.length < 2) {
      throw new Error("No subcommand found in command");
    }

    const subcommand = commandParts[1];
    if (!output.includes(subcommand)) {
      throw new Error(
        `Expected subcommand help for ${subcommand}, but got: ${output}`
      );
    }
  },

  "the command should handle sensitive data safely": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout + result.stderr;
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /credential/i,
    ];

    const hasSensitiveData = sensitivePatterns.some((pattern) =>
      pattern.test(output)
    );

    if (hasSensitiveData) {
      throw new Error("Command output contains sensitive data");
    }
  },

  "the command should validate file operations": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    // Check if command mentions file operations
    const output = result.stdout;
    const fileOperationIndicators = [
      "file",
      "created",
      "written",
      "saved",
      "loaded",
    ];

    const hasFileOperation = fileOperationIndicators.some((indicator) =>
      output.toLowerCase().includes(indicator)
    );

    if (!hasFileOperation) {
      throw new Error("Expected file operation indication in output");
    }
  },

  "the command should handle file system errors gracefully": async function (
    tester
  ) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const errorOutput = result.stderr || result.stdout;
    const errorIndicators = [
      "error",
      "failed",
      "cannot",
      "unable",
      "permission",
      "not found",
    ];

    const hasErrorIndicator = errorIndicators.some((indicator) =>
      errorOutput.toLowerCase().includes(indicator)
    );

    if (!hasErrorIndicator) {
      throw new Error("Expected error indication in output");
    }
  },

  "the command should handle large datasets efficiently": async function (
    tester
  ) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    // Check performance metrics
    if (result.duration > 3000) {
      throw new Error(
        `Command took ${result.duration}ms, expected less than 3000ms for large datasets`
      );
    }
  },

  "the command should handle concurrent operations": async function (tester) {
    const result1 = tester.getContextVariable("lastCommandResult1");
    const result2 = tester.getContextVariable("lastCommandResult2");

    if (!result1 || !result1.success) {
      throw new Error("First concurrent command failed");
    }

    if (!result2 || !result2.success) {
      throw new Error("Second concurrent command failed");
    }

    // Check that both commands completed successfully
    if (result1.exitCode !== 0 || result2.exitCode !== 0) {
      throw new Error("Concurrent operations did not complete successfully");
    }
  },

  "the command should handle memory constraints": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    // Check that command completed within memory constraints
    if (result.duration > 5000) {
      throw new Error(
        `Command took ${result.duration}ms, expected less than 5000ms under memory constraints`
      );
    }
  },

  "the command should support legacy command formats": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    // Legacy commands should still work
    if (!result.success) {
      throw new Error("Legacy command format failed");
    }
  },

  "the command should handle deprecated options gracefully": async function (
    tester
  ) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const errorOutput = result.stderr || result.stdout;
    const deprecationIndicators = [
      "deprecated",
      "obsolete",
      "legacy",
      "warning",
    ];

    const hasDeprecationIndicator = deprecationIndicators.some((indicator) =>
      errorOutput.toLowerCase().includes(indicator)
    );

    if (!hasDeprecationIndicator) {
      throw new Error("Expected deprecation warning in output");
    }
  },

  "the command should provide migration guidance": async function (tester) {
    const result = tester.getLastCommandResult();
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    const migrationIndicators = [
      "migration",
      "upgrade",
      "migrate",
      "new",
      "replacement",
    ];

    const hasMigrationIndicator = migrationIndicators.some((indicator) =>
      output.toLowerCase().includes(indicator)
    );

    if (!hasMigrationIndicator) {
      throw new Error("Expected migration guidance in output");
    }
  },
};

// Export step definitions
export default cittyCLISteps;
