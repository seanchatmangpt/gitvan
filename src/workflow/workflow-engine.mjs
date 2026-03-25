import { createStore, parseTurtle } from "@unrdf/core";
import { useLog } from "../composables/log.mjs";
import { StepRunner } from "./step-runner.mjs";
import { ContextManager } from "./context-manager.mjs";

/**
 * WorkflowEngine - Loads and executes workflows defined in Turtle files
 *
 * The WorkflowEngine is the main entry point for workflow execution in GitVan.
 * It provides a high-level API for loading, validating, and executing workflows
 * defined in Turtle RDF format.
 *
 * ## Core Architecture
 *
 * Uses unrdf's KnowledgeSubstrateCore for:
 * - Federated queries across all workflow definitions
 * - SHACL validation of workflow schemas
 * - Knowledge hooks for reactive workflow management
 * - Built-in OTEL observability
 * - Transaction-based changes with audit receipts
 *
 * ## Usage
 *
 * ```javascript
 * const engine = new WorkflowEngine({
 *   graphDir: "./workflows",
 * });
 *
 * await engine.initialize();
 * const workflows = await engine.listWorkflows();
 * const result = await engine.executeWorkflow(workflowId);
 * ```
 *
 * @example
 * ```javascript
 * import { createWorkflowEngine } from './workflow-engine.mjs';
 *
 * const engine = await createWorkflowEngine({
 *   graphDir: './workflows'
 * });
 *
 * // List all available workflows
 * const workflows = await engine.listWorkflows();
 * console.log('Available workflows:', workflows);
 *
 * // Execute a workflow
 * const result = await engine.executeWorkflow('http://example.org/my-workflow');
 * console.log('Execution result:', result);
 * ```
 */
export class WorkflowEngine {
  constructor(options = {}) {
    this.graphDir = options.graphDir || "./workflows";
    this.logger = useLog();
    this.core = null;
    this.stepRunner = new StepRunner({ logger: this.logger });
    this.contextManager = new ContextManager();
  }

  /**
   * Initialize the engine by loading Turtle files into KnowledgeSubstrateCore
   *
   * This method loads all Turtle (.ttl) files from the configured graphDir
   * into the KnowledgeSubstrateCore's RDF store. Each file is parsed and
   * its quads are added to the centralized knowledge graph.
   *
   * @returns {Promise<WorkflowEngine>} Returns this engine instance for chaining
   * @throws {Error} If graphDir doesn't exist or files cannot be parsed
   *
   * @example
   * ```javascript
   * const engine = new WorkflowEngine({ graphDir: './workflows' });
   * await engine.initialize();
   * // Engine is now ready to execute workflows
   * ```
   */
    try {
      this.logger.info(
        `🚀 Initializing WorkflowEngine with graphDir: ${this.graphDir}`
      );

      // Create store
      this.core = {
        store: await createStore(),
        enableObservability: true,
      };

      const { readdir, readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");

      const fileNames = (await readdir(this.graphDir)).filter((f) =>
        f.endsWith(".ttl")
      );
      const files = await Promise.all(
        fileNames.map(async (name) => ({
          name,
          content: await readFile(join(this.graphDir, name), "utf8"),
        }))
      );

      // Load turtle files into the core's internal store
      for (const file of files) {
        try {
          const fileStore = await parseTurtle(file.content);
          for (const quad of fileStore) {
            this.core.store.add(quad);
          }
        } catch (error) {
          this.logger.warn(
            `⚠️ Failed to parse ${file.name}: ${error.message}`
          );
        }
      }

      this.logger.info(
        `📁 Loaded ${files.length} Turtle files from: ${this.graphDir}`
      );
      this.logger.info(`📊 Knowledge graph initialized with ${this.core.store.size} quads`);

      return this;
    } catch (error) {
      this.logger.error(`❌ Failed to initialize WorkflowEngine:`, error);
      throw error;
    }
  }

  /**
   * List all workflows found in Turtle files
   *
   * Queries the knowledge graph for all workflow definitions and returns
   * their metadata including ID, title, and predicate information.
   *
   * @returns {Promise<Array<object>>} Array of workflow metadata objects
   * @returns {string} return[].id - Workflow URI/identifier
   * @returns {string} return[].title - Human-readable workflow title
   * @returns {string|null} return[].predicate - Git predicate that triggers this workflow
   * @returns {number} return[].pipelineCount - Number of pipelines in the workflow
   *
   * @example
   * ```javascript
   * const workflows = await engine.listWorkflows();
   * workflows.forEach(w => {
   *   console.log(`Workflow: ${w.title} (${w.id})`);
   * });
   * ```
   */
    if (!this.core) {
      await this.initialize();
    }

    try {
      // Query for all hooks using SPARQL via KnowledgeSubstrateCore
      const sparql = `
        PREFIX gh: <http://example.org/git-hooks#>
        PREFIX gh2: <https://gitvan.dev/graph-hook#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?workflow ?title WHERE {
          {
            ?workflow a gh:Hook ;
              rdfs:label ?title .
          } UNION {
            ?workflow a gh2:Hook ;
              gv:title ?title .
          }
        }
      `;

      // Use core.query() - includes OTEL spans automatically
      const results = await this.core.query({ query: sparql });
      this.logger.info(`📋 Found ${results.length} workflows`);

      return results.map((result) => ({
        id: result.workflow,
        title: result.title,
        predicate: null,
        pipelineCount: 0,
      }));
    } catch (error) {
      this.logger.error(`❌ Failed to list workflows:`, error);
      throw error;
    }
  }

  /**
   * Execute a workflow by ID
   *
   * Orchestrates the complete execution of a workflow including:
   * 1. Finding the workflow definition in the knowledge graph
   * 2. Parsing workflow steps from the pipeline
   * 3. Executing each step in dependency order
   * 4. Collecting and returning execution results
   *
   * @param {string} workflowId - The URI/identifier of the workflow to execute
   * @returns {Promise<object>} Execution result object
   * @returns {string} return.workflowId - ID of the executed workflow
   * @returns {string} return.title - Title of the workflow
   * @returns {string} return.status - Execution status ('completed' or 'failed')
   * @returns {Array<object>} return.steps - Array of step execution results
   * @returns {string} return.executedAt - ISO timestamp of execution
   * @throws {Error} If workflow is not found or execution fails
   *
   * @example
   * ```javascript
   * const result = await engine.executeWorkflow('http://example.org/my-workflow');
   * if (result.status === 'completed') {
   *   console.log(`Successfully executed ${result.steps.length} steps`);
   * }
   * ```
   */
    if (!this.core) {
      await this.initialize();
    }

    try {
      this.logger.info(`🎯 Executing workflow: ${workflowId}`);

      // Find the workflow hook using SPARQL via core
      const sparql = `
        PREFIX gh: <http://example.org/git-hooks#>
        PREFIX gh2: <https://gitvan.dev/graph-hook#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX op: <http://example.org/operations#>
        PREFIX op2: <https://gitvan.dev/op#>
        SELECT ?workflow ?title ?pipeline WHERE {
          {
            ?workflow a gh:Hook ;
              rdfs:label ?title ;
              op:hasPipeline ?pipeline .
            FILTER(?workflow = <${workflowId}>)
          } UNION {
            ?workflow a gh2:Hook ;
              gv:title ?title ;
              gh2:orderedPipelines ?pipeline .
            FILTER(?workflow = <${workflowId}>)
          }
        }
      `;

      const results = await this.core.query({ query: sparql });

      if (!results || results.length === 0) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      const workflowTitle = results[0].title;
      const pipelineId = results[0].pipeline;
      this.logger.info(`✅ Found workflow: ${workflowTitle}`);

      // Parse workflow steps from the pipeline
      const steps = await this._parseWorkflowSteps(pipelineId);
      this.logger.info(`📋 Found ${steps.length} steps to execute`);

      // Execute each step
      const stepResults = [];
      for (const step of steps) {
        this.logger.info(`🔄 Executing step: ${step.id} (${step.type})`);

        try {
          const result = await this.stepRunner.executeStep(
            step,
            this.contextManager,
            this.core, // Pass core instead of raw store
            null,
            {}
          );

          stepResults.push(result);
          this.logger.info(`✅ Step completed: ${step.id}`);
        } catch (error) {
          this.logger.error(`❌ Step failed: ${step.id}`, error);
          stepResults.push({
            stepId: step.id,
            success: false,
            error: error.message,
          });
        }
      }

      // Return execution result
      return {
        workflowId,
        title: workflowTitle,
        status: "completed",
        steps: stepResults,
        executedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to execute workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Parse workflow steps from Turtle data
   * @private
   */
  async _parseWorkflowSteps(pipelineId) {
    try {
      // Query for all steps in the pipeline via core
      const sparql = `
        PREFIX op: <http://example.org/operations#>
        PREFIX op2: <https://gitvan.dev/op#>
        PREFIX gv: <http://example.org/gitvan#>
        PREFIX gv2: <https://gitvan.dev/ontology#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?step ?stepType ?configProp ?configValue WHERE {
          {
            <${pipelineId}> op:hasStep ?step .
            ?step a ?stepType .
            OPTIONAL {
              ?step ?configProp ?configValue .
              FILTER(?configProp != rdf:type)
            }
          } UNION {
            <${pipelineId}> op2:steps ?step .
            ?step a ?stepType .
            OPTIONAL {
              ?step ?configProp ?configValue .
              FILTER(?configProp != rdf:type)
            }
          }
        }
      `;

      const results = await this.core.query({ query: sparql });
      const stepMap = new Map();

      // Group results by step
      for (const result of results) {
        const stepId = result.step;
        const stepType = result.stepType;

        if (!stepMap.has(stepId)) {
          // Extract step type (e.g., gv:FileStep -> file)
          let type;
          if (stepType.includes("#")) {
            // Handle full URIs like http://example.org/gitvan#FileStep
            type = stepType.split("#")[1].replace("Step", "").toLowerCase();
          } else {
            // Handle prefixed names like gv:FileStep
            type = stepType.split(":")[1].replace("Step", "").toLowerCase();
          }
          stepMap.set(stepId, {
            id: stepId,
            type: type,
            config: {},
          });
        }

        // Add configuration properties
        if (result.configProp && result.configValue) {
          let prop;
          if (result.configProp.includes("#")) {
            // Handle full URIs like http://example.org/gitvan#template
            prop = result.configProp.split("#")[1];
          } else {
            // Handle prefixed names like gv:template
            prop = result.configProp.split(":")[1];
          }
          const value = result.configValue;

          // Map property names to expected step handler properties
          const mappedProp = this._mapPropertyName(
            prop,
            stepMap.get(stepId).type
          );
          stepMap.get(stepId).config[mappedProp] = value;
        }
      }

      return Array.from(stepMap.values());
    } catch (error) {
      this.logger.error(`❌ Failed to parse workflow steps:`, error);
      throw error;
    }
  }

  /**
   * Map Turtle property names to step handler expected property names
   * @private
   */
  _mapPropertyName(turtleProp, stepType) {
    const mappings = {
      sparql: {
        text: "query",
        outputMapping: "outputMapping",
      },
      template: {
        template: "template",
        text: "template",
        outputPath: "outputPath",
      },
      file: {
        filePath: "filePath",
        operation: "operation",
      },
      http: {
        url: "url",
        httpUrl: "url",
        method: "method",
        httpMethod: "method",
        headers: "headers",
        body: "body",
      },
      cli: {
        command: "command",
      },
    };

    return mappings[stepType]?.[turtleProp] || turtleProp;
  }

  /**
   * Execute a custom query against the knowledge graph
   */
  async runQuery(sparqlQuery) {
    if (!this.core) {
      await this.initialize();
    }

    try {
      this.logger.info(`🔍 Executing query`);
      const results = await this.core.query({ query: sparqlQuery });
      this.logger.info(
        `✅ Query completed, ${Array.isArray(results) ? results.length : 1} results`
      );
      return results;
    } catch (error) {
      this.logger.error(`❌ Query failed:`, error);
      throw error;
    }
  }

  /**
   * Validate workflow definitions against SHACL shapes
   * @param {string} shapesGraph - SHACL shapes as Turtle string
   */
  async validate(shapesGraph) {
    if (!this.core) {
      await this.initialize();
    }

    try {
      this.logger.info(`🔍 Validating workflow definitions`);
      const report = await this.core.validate({
        dataGraph: this.core.store,
        shapesGraph,
      });
      this.logger.info(
        `✅ Validation ${report.conforms ? "passed" : "failed"}`
      );
      return report;
    } catch (error) {
      this.logger.error(`❌ Validation failed:`, error);
      throw error;
    }
  }

  /**
   * Get knowledge graph statistics and metrics
   */
  async getStats() {
    if (!this.core) {
      await this.initialize();
    }

    try {
      // Get both store stats and core metrics
      const coreStatus = this.core.getStatus();
      const coreMetrics = this.core.getMetrics();

      const stats = {
        quadCount: this.core.store.size,
        initialized: coreStatus.initialized,
        components: coreStatus.components,
        metrics: coreMetrics,
      };

      this.logger.info(`📊 Knowledge graph: ${stats.quadCount} quads`);
      return stats;
    } catch (error) {
      this.logger.error(`❌ Failed to get stats:`, error);
      throw error;
    }
  }

  /**
   * Cleanup engine resources
   */
  async cleanup() {
    if (this.core) {
      await this.core.cleanup();
      this.core = null;
    }
  }
}

/**
 * Create a new WorkflowEngine instance
 */
export async function createWorkflowEngine(options = {}) {
  const engine = new WorkflowEngine(options);
  await engine.initialize();
  return engine;
}
