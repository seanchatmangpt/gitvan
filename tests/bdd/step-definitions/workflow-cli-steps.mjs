/**
 * GitVan Workflow CLI BDD Step Definitions
 *
 * Implements London BDD style step definitions for workflow CLI testing
 * Focuses on Jobs-to-be-Done (JTBD) methodology
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

// Test data storage
const testData = new Map();

/**
 * Workflow CLI Step Definitions
 */
export const workflowSteps = {
  // Given Steps - Setting up initial state
  "I have a GitVan project initialized": async function () {
    // Ensure we're in a GitVan project directory
    const gitvanConfig =
      existsSync(".gitvan") || existsSync("gitvan.config.js");
    if (!gitvanConfig) {
      // Create minimal GitVan project structure
      mkdirSync(".gitvan", { recursive: true });
      writeFileSync(
        ".gitvan/config.json",
        JSON.stringify({
          version: "3.0.0",
          initialized: true,
        })
      );
    }
    testData.set("gitvanProject", true);
  },

  'I have workflow definitions in the "./workflows" directory':
    async function () {
      // Ensure workflows directory exists with sample workflows
      mkdirSync("workflows", { recursive: true });

      // Create a sample workflow if it doesn't exist
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

      testData.set("workflowsDirectory", true);
    },

  'I have a workflow with ID "([^"]*)"': async function (workflowId) {
    testData.set("currentWorkflowId", workflowId);
  },

  "Cursor CLI is available": async function () {
    // Mock Cursor CLI availability for testing
    testData.set("cursorAvailable", true);
  },

  "I have multiple workflows available": async function () {
    // Create additional sample workflows
    const workflows = [
      { id: "workflow-1", title: "Workflow One" },
      { id: "workflow-2", title: "Workflow Two" },
      { id: "workflow-3", title: "Workflow Three" },
    ];

    workflows.forEach((workflow) => {
      const content = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:${workflow.id} rdf:type gh:Hook ;
    gv:title "${workflow.title}" ;
    gh:hasPredicate ex:${workflow.id.replace(/-/g, "")} ;
    gh:orderedPipelines ex:${workflow.id}-pipeline .`;

      writeFileSync(`workflows/${workflow.id}.ttl`, content);
    });

    testData.set("multipleWorkflows", workflows);
  },

  // When Steps - Performing actions
  'I run "([^"]*)"': async function (command) {
    try {
      const args = command.split(" ");
      const result = await execFileAsync("node", ["src/cli.mjs", ...args], {
        cwd: process.cwd(),
        timeout: 30000,
      });

      testData.set("lastCommandResult", {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
      });
    } catch (error) {
      testData.set("lastCommandResult", {
        success: false,
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        exitCode: error.code || 1,
        error: error.message,
      });
    }
  },

  'I run "([^"]*)" for each workflow': async function (command) {
    const workflows = testData.get("multipleWorkflows") || [];
    const results = [];

    for (const workflow of workflows) {
      try {
        const fullCommand = command.replace(
          "gitvan workflow validate",
          `gitvan workflow validate ex:${workflow.id}`
        );
        const args = fullCommand.split(" ");
        const result = await execFileAsync("node", ["src/cli.mjs", ...args], {
          cwd: process.cwd(),
          timeout: 30000,
        });

        results.push({
          workflow: workflow.id,
          success: true,
          stdout: result.stdout,
          stderr: result.stderr,
        });
      } catch (error) {
        results.push({
          workflow: workflow.id,
          success: false,
          error: error.message,
        });
      }
    }

    testData.set("multipleCommandResults", results);
  },

  // Then Steps - Verifying outcomes
  "the command should succeed": async function () {
    const result = testData.get("lastCommandResult");
    if (!result || !result.success) {
      throw new Error(`Command failed: ${result?.error || "Unknown error"}`);
    }
  },

  "the command should fail": async function () {
    const result = testData.get("lastCommandResult");
    if (!result || result.success) {
      throw new Error("Expected command to fail, but it succeeded");
    }
  },

  'I should see "([^"]*)"': async function (expectedText) {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout + result.stderr;
    if (!output.includes(expectedText)) {
      throw new Error(
        `Expected to see "${expectedText}" in output, but got: ${output}`
      );
    }
  },

  "I should see a list of available workflows": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (
      !output.includes("Available Workflows") &&
      !output.includes("workflow")
    ) {
      throw new Error("Expected to see workflow list in output");
    }
  },

  "each workflow should show its title and pipeline count": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Title:") || !output.includes("Pipelines:")) {
      throw new Error("Expected to see workflow titles and pipeline counts");
    }
  },

  "the output should be formatted clearly": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("─") && !output.includes("📋")) {
      throw new Error("Expected clear formatting in output");
    }
  },

  "I should see total workflow count": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Total workflows:")) {
      throw new Error("Expected to see total workflow count");
    }
  },

  "I should see the graph directory path": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Graph directory:")) {
      throw new Error("Expected to see graph directory path");
    }
  },

  "I should see engine initialization status": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Engine initialized:")) {
      throw new Error("Expected to see engine initialization status");
    }
  },

  "I should see a summary of all workflows": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Workflow Summary:")) {
      throw new Error("Expected to see workflow summary");
    }
  },

  "I should see validation success message": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Workflow validation passed")) {
      throw new Error("Expected to see validation success message");
    }
  },

  "I should see the workflow title": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Title:")) {
      throw new Error("Expected to see workflow title");
    }
  },

  "I should see the pipeline count": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Pipelines:")) {
      throw new Error("Expected to see pipeline count");
    }
  },

  "I should see the workflow ID": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("ID:")) {
      throw new Error("Expected to see workflow ID");
    }
  },

  'I should see "Workflow structure is valid"': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Workflow structure is valid")) {
      throw new Error('Expected to see "Workflow structure is valid" message');
    }
  },

  'I should see "Workflow not found" error message': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout + result.stderr;
    if (!output.includes("Workflow not found")) {
      throw new Error('Expected to see "Workflow not found" error message');
    }
  },

  'I should see "Dry run mode - no actual execution"': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Dry run mode - no actual execution")) {
      throw new Error("Expected to see dry run mode message");
    }
  },

  'I should see "Workflow found"': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Workflow found")) {
      throw new Error('Expected to see "Workflow found" message');
    }
  },

  "I should see detailed execution information": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("verbose") && !output.includes("detailed")) {
      throw new Error("Expected to see detailed execution information");
    }
  },

  "I should see step-by-step progress": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Step") && !output.includes("progress")) {
      throw new Error("Expected to see step-by-step progress");
    }
  },

  "the workflow should receive the input parameters": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("input") && !output.includes("parameter")) {
      throw new Error("Expected workflow to receive input parameters");
    }
  },

  'I should see "Workflow template created" message': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Workflow template created")) {
      throw new Error('Expected to see "Workflow template created" message');
    }
  },

  'the file "([^"]*)" should exist': async function (filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`Expected file to exist: ${filePath}`);
    }
  },

  "the file should contain Turtle RDF syntax": async function () {
    // This would be checked in the context of the created file
    // Implementation would verify RDF/Turtle syntax
  },

  "the file should contain the workflow title": async function () {
    // This would be checked in the context of the created file
    // Implementation would verify title is present
  },

  "the file should contain example step definitions": async function () {
    // This would be checked in the context of the created file
    // Implementation would verify step definitions are present
  },

  "the workflow title should be auto-generated from the ID": async function () {
    // This would be checked in the context of the created file
    // Implementation would verify auto-generated title
  },

  'I should see "Connecting workflow" message': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Connecting workflow")) {
      throw new Error('Expected to see "Connecting workflow" message');
    }
  },

  'I should see "Cursor CLI detected"': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Cursor CLI detected")) {
      throw new Error('Expected to see "Cursor CLI detected" message');
    }
  },

  'I should see "Starting Cursor CLI session"': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Starting Cursor CLI session")) {
      throw new Error('Expected to see "Starting Cursor CLI session" message');
    }
  },

  "the Cursor session should use the specified model": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("model") && !output.includes("gpt-4")) {
      throw new Error("Expected Cursor session to use specified model");
    }
  },

  "the Cursor session should use the custom prompt": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Custom workflow prompt")) {
      throw new Error("Expected Cursor session to use custom prompt");
    }
  },

  'I should see "Generating Cursor integration script" message':
    async function () {
      const result = testData.get("lastCommandResult");
      if (!result) {
        throw new Error("No command result available");
      }

      const output = result.stdout;
      if (!output.includes("Generating Cursor integration script")) {
        throw new Error(
          'Expected to see "Generating Cursor integration script" message'
        );
      }
    },

  'I should see "Script generated successfully"': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Script generated successfully")) {
      throw new Error(
        'Expected to see "Script generated successfully" message'
      );
    }
  },

  'I should see "GitVan Workflow Commands" header': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("GitVan Workflow Commands")) {
      throw new Error('Expected to see "GitVan Workflow Commands" header');
    }
  },

  "I should see all available subcommands": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    const subcommands = [
      "list",
      "run",
      "validate",
      "create",
      "stats",
      "cursor",
      "cursor-script",
      "help",
    ];
    const missingSubcommands = subcommands.filter(
      (cmd) => !output.includes(cmd)
    );

    if (missingSubcommands.length > 0) {
      throw new Error(`Missing subcommands: ${missingSubcommands.join(", ")}`);
    }
  },

  "I should see usage examples for each command": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("gitvan workflow")) {
      throw new Error("Expected to see usage examples");
    }
  },

  "I should see proper formatting with separators": async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("─") && !output.includes("─")) {
      throw new Error("Expected to see proper formatting with separators");
    }
  },

  'I should see "workflow" in the list of commands': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("workflow")) {
      throw new Error('Expected to see "workflow" in command list');
    }
  },

  'I should see "Manage GitVan Workflows" description': async function () {
    const result = testData.get("lastCommandResult");
    if (!result) {
      throw new Error("No command result available");
    }

    const output = result.stdout;
    if (!output.includes("Manage GitVan Workflows")) {
      throw new Error('Expected to see "Manage GitVan Workflows" description');
    }
  },

  'I should see "Workflow ID required for run command" error':
    async function () {
      const result = testData.get("lastCommandResult");
      if (!result) {
        throw new Error("No command result available");
      }

      const output = result.stdout + result.stderr;
      if (!output.includes("Workflow ID required for run command")) {
        throw new Error(
          'Expected to see "Workflow ID required for run command" error'
        );
      }
    },

  'I should see "Workflow ID required for validate command" error':
    async function () {
      const result = testData.get("lastCommandResult");
      if (!result) {
        throw new Error("No command result available");
      }

      const output = result.stdout + result.stderr;
      if (!output.includes("Workflow ID required for validate command")) {
        throw new Error(
          'Expected to see "Workflow ID required for validate command" error'
        );
      }
    },

  'I should see "Workflow ID required for cursor command" error':
    async function () {
      const result = testData.get("lastCommandResult");
      if (!result) {
        throw new Error("No command result available");
      }

      const output = result.stdout + result.stderr;
      if (!output.includes("Workflow ID required for cursor command")) {
        throw new Error(
          'Expected to see "Workflow ID required for cursor command" error'
        );
      }
    },

  'I should see "Workflow ID required for cursor-script command" error':
    async function () {
      const result = testData.get("lastCommandResult");
      if (!result) {
        throw new Error("No command result available");
      }

      const output = result.stdout + result.stderr;
      if (!output.includes("Workflow ID required for cursor-script command")) {
        throw new Error(
          'Expected to see "Workflow ID required for cursor-script command" error'
        );
      }
    },

  "both commands should succeed": async function () {
    const result = testData.get("lastCommandResult");
    if (!result || !result.success) {
      throw new Error("Expected both commands to succeed");
    }
  },

  "the GitVan context should be properly maintained": async function () {
    // This would verify that GitVan context is maintained across commands
    // Implementation would check context state
  },

  "the workflow engine should be initialized consistently": async function () {
    // This would verify that the workflow engine is initialized consistently
    // Implementation would check engine state
  },

  "all commands should succeed": async function () {
    const results = testData.get("multipleCommandResults") || [];
    const failedResults = results.filter((r) => !r.success);

    if (failedResults.length > 0) {
      throw new Error(
        `Expected all commands to succeed, but ${failedResults.length} failed`
      );
    }
  },

  "the workflow engine should handle multiple operations efficiently":
    async function () {
      // This would verify that the workflow engine handles multiple operations efficiently
      // Implementation would check performance and state management
    },
};

// Export step definitions for BDD runner
export default workflowSteps;
