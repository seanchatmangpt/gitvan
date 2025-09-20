// src/cli/workflow.mjs
// CLI commands for the Turtle as Workflow engine
// Provides command-line interface for workflow management

import { WorkflowEngine } from "../workflow/workflow-engine.mjs";
import { tryUseGitVan } from "../core/context.mjs";

/**
 * Workflow CLI commands
 */
export class WorkflowCLI {
  /**
   * @param {object} options
   * @param {object} [options.logger] - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.engine = null;
  }

  /**
   * Initialize the workflow CLI
   * @param {object} context - GitVan context
   */
  async initialize(context) {
    this.engine = new WorkflowEngine({
      graphDir: "./workflows",
      logger: this.logger,
    });
    await this.engine.initialize();
  }

  /**
   * List all available workflows
   * @returns {Promise<void>}
   */
  async list() {
    try {
      this.logger.info("📋 Available Workflows:");
      this.logger.info("─".repeat(50));

      const workflows = await this.engine.listWorkflows();

      if (workflows.length === 0) {
        this.logger.info("No workflows found in ./workflows directory");
        return;
      }

      for (const workflow of workflows) {
        this.logger.info(`🔧 ${workflow.id}`);
        this.logger.info(`   Title: ${workflow.title}`);
        this.logger.info(`   Pipelines: ${workflow.pipelineCount}`);
        this.logger.info("");
      }
    } catch (error) {
      this.logger.error(`❌ Failed to list workflows: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a workflow
   * @param {string} workflowId - Workflow ID to execute
   * @param {object} options - Execution options
   * @param {object} [options.inputs] - Input parameters
   * @param {boolean} [options.dryRun] - Dry run mode
   * @param {boolean} [options.verbose] - Verbose output
   * @returns {Promise<void>}
   */
  async run(workflowId, options = {}) {
    try {
      this.logger.info(`🚀 Executing workflow: ${workflowId}`);

      if (options.dryRun) {
        this.logger.info("🔍 Dry run mode - no actual execution");

        // For now, just check if workflow exists
        const workflows = await this.engine.listWorkflows();
        const workflow = workflows.find((w) => w.id === workflowId);

        if (workflow) {
          this.logger.info("✅ Workflow found");
          this.logger.info(`   Title: ${workflow.title}`);
          this.logger.info(`   Pipelines: ${workflow.pipelineCount}`);
        } else {
          this.logger.error(`❌ Workflow not found: ${workflowId}`);
          throw new Error(`Workflow not found: ${workflowId}`);
        }
        return;
      }

      const startTime = performance.now();
      const result = await this.engine.executeWorkflow(workflowId);
      const endTime = performance.now();

      this.logger.info("✅ Workflow execution completed");
      this.logger.info(`   Duration: ${(endTime - startTime).toFixed(2)}ms`);
      this.logger.info(`   Status: ${result.status}`);
      this.logger.info(`   Steps executed: ${result.steps.length}`);

      if (result.steps.length > 0) {
        this.logger.info("   Step results:");
        result.steps.forEach((step, index) => {
          const status = step.success ? "✅" : "❌";
          this.logger.info(
            `     ${status} Step ${index + 1}: ${step.stepId || "Unknown"}`
          );
          if (step.error) {
            this.logger.info(`       Error: ${step.error}`);
          }
        });
      }

      if (options.verbose) {
        this.logger.info("\n📊 Execution Details:");
        this.logger.info("─".repeat(30));

        for (const step of result.steps) {
          const status = step.success ? "✅" : "❌";
          this.logger.info(
            `${status} ${step.stepId || step.id || "Unknown"} (${
              step.type || "unknown"
            })`
          );
          if (step.error) {
            this.logger.info(`   Error: ${step.error}`);
          }
        }

        this.logger.info("\n📤 Workflow Summary:");
        this.logger.info("─".repeat(20));
        this.logger.info(`Workflow ID: ${result.workflowId}`);
        this.logger.info(`Title: ${result.title}`);
        this.logger.info(`Status: ${result.status}`);
        this.logger.info(`Executed At: ${result.executedAt}`);
      }
    } catch (error) {
      this.logger.error(`❌ Workflow execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate a workflow
   * @param {string} workflowId - Workflow ID to validate
   * @returns {Promise<void>}
   */
  async validate(workflowId) {
    try {
      this.logger.info(`🔍 Validating workflow: ${workflowId}`);

      const validation = await this.executor.validateWorkflow(workflowId);

      if (validation.valid) {
        this.logger.info("✅ Workflow validation passed");
        this.logger.info(`   Steps: ${validation.stepCount}`);
        this.logger.info(`   Dependencies: ${validation.dependencies.length}`);
        this.logger.info(
          `   Estimated duration: ${validation.estimatedDuration}ms`
        );

        this.logger.info("\n📋 Execution Plan:");
        this.logger.info("─".repeat(30));
        for (const dep of validation.dependencies) {
          this.logger.info(`🔧 ${dep.id}`);
          if (dep.dependsOn.length > 0) {
            this.logger.info(`   Depends on: ${dep.dependsOn.join(", ")}`);
          }
        }
      } else {
        this.logger.error(`❌ Workflow validation failed: ${validation.error}`);
        throw new Error(`Workflow validation failed: ${validation.error}`);
      }
    } catch (error) {
      this.logger.error(`❌ Validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get workflow statistics
   * @returns {Promise<void>}
   */
  async stats() {
    try {
      this.logger.info("📊 Workflow Engine Statistics:");
      this.logger.info("─".repeat(40));

      const stats = this.executor.getStats();

      this.logger.info(`Workflows loaded: ${stats.workflowsLoaded}`);
      this.logger.info(`Context initialized: ${stats.contextInitialized}`);

      if (stats.lastExecution) {
        this.logger.info(`Last execution: ${stats.lastExecution.timestamp}`);
        this.logger.info(`Last workflow: ${stats.lastExecution.workflowId}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to get statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new workflow template
   * @param {string} workflowId - Workflow ID
   * @param {string} [title] - Workflow title
   * @returns {Promise<void>}
   */
  async create(workflowId, title = null) {
    try {
      this.logger.info(`📝 Creating workflow template: ${workflowId}`);

      const workflowTitle =
        title ||
        workflowId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

      const template = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# ${workflowTitle} Workflow
# Generated on: ${new Date().toISOString()}

ex:${workflowId} rdf:type gh:Hook ;
    gv:title "${workflowTitle}" ;
    gh:hasPredicate ex:${workflowId.replace(/-/g, "")} ;
    gh:orderedPipelines ex:${workflowId}-pipeline .

ex:${workflowId}-pipeline rdf:type op:Pipeline ;
    op:steps ex:${workflowId}-step1 .

# Example Step
ex:${workflowId}-step1 rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX ex: <http://example.org/>
        SELECT ?item WHERE {
            ?item rdf:type ex:ExampleItem .
        }
    """ ;
    gv:outputMapping '{"items": "results"}' .`;

      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      const workflowsDir = "./workflows";
      await fs.mkdir(workflowsDir, { recursive: true });

      const filePath = path.join(workflowsDir, `${workflowId}.ttl`);
      await fs.writeFile(filePath, template, "utf8");

      this.logger.info(`✅ Workflow template created: ${filePath}`);
      this.logger.info("📝 Edit the template to customize your workflow");
    } catch (error) {
      this.logger.error(`❌ Failed to create workflow: ${error.message}`);
      throw error;
    }
  }

  /**
   * Show workflow help
   * @returns {void}
   */
  help() {
    this.logger.info("🔧 GitVan Workflow Commands:");
    this.logger.info("─".repeat(40));
    this.logger.info("");
    this.logger.info("📋 List workflows:");
    this.logger.info("   gitvan workflow list");
    this.logger.info("");
    this.logger.info("🚀 Execute workflow:");
    this.logger.info("   gitvan workflow run <workflow-id>");
    this.logger.info("   gitvan workflow run <workflow-id> --input key=value");
    this.logger.info("   gitvan workflow run <workflow-id> --dry-run");
    this.logger.info("");
    this.logger.info("🔍 Validate workflow:");
    this.logger.info("   gitvan workflow validate <workflow-id>");
    this.logger.info("");
    this.logger.info("📊 Show statistics:");
    this.logger.info("   gitvan workflow stats");
    this.logger.info("");
    this.logger.info("📝 Create workflow template:");
    this.logger.info("   gitvan workflow create <workflow-id> [title]");
    this.logger.info("");
    this.logger.info("❓ Show this help:");
    this.logger.info("   gitvan workflow help");
  }
}

/**
 * CLI command handler for workflow operations
 * @param {Array<string>} args - Command line arguments
 * @param {object} options - Command options
 * @returns {Promise<void>}
 */
export async function handleWorkflowCommand(args, options = {}) {
  const cli = new WorkflowCLI({ logger: options.logger });

  try {
    // Initialize GitVan context - use tryUseGitVan for CLI context
    const context = tryUseGitVan() || { cwd: process.cwd(), env: process.env };
    await cli.initialize(context);

    const command = args[0];

    switch (command) {
      case "list":
        await cli.list();
        break;

      case "run":
        const workflowId = args[1];
        if (!workflowId) {
          throw new Error("Workflow ID required for run command");
        }

        // Parse command line options
        const dryRun = args.includes("--dry-run");
        const verbose = args.includes("--verbose") || args.includes("-v");

        const runOptions = {
          inputs: options.inputs || {},
          dryRun: dryRun,
          verbose: verbose,
        };

        await cli.run(workflowId, runOptions);
        break;

      case "validate":
        const validateWorkflowId = args[1];
        if (!validateWorkflowId) {
          throw new Error("Workflow ID required for validate command");
        }

        await cli.validate(validateWorkflowId);
        break;

      case "stats":
        await cli.stats();
        break;

      case "create":
        const createWorkflowId = args[1];
        if (!createWorkflowId) {
          throw new Error("Workflow ID required for create command");
        }

        const title = args[2];
        await cli.create(createWorkflowId, title);
        break;

      case "help":
      default:
        cli.help();
        break;
    }
  } catch (error) {
    console.error(`❌ Workflow command failed: ${error.message}`);
    process.exit(1);
  }
}
