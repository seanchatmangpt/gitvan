import { useGraph } from "../composables/graph.mjs";
import { useTurtle } from "../composables/turtle.mjs";
import { useLog } from "../composables/log.mjs";
import { StepRunner } from "./StepRunner.mjs";
import { ContextManager } from "./ContextManager.mjs";

/**
 * WorkflowEngine - Simple engine that loads Turtle files using useGraph
 */
export class WorkflowEngine {
  constructor(options = {}) {
    this.graphDir = options.graphDir || "./workflows";
    this.logger = useLog();
    this.graph = null;
    this.turtle = null;
    this.stepRunner = new StepRunner({ logger: this.logger });
    this.contextManager = new ContextManager();
  }

  /**
   * Initialize the engine by loading Turtle files
   */
  async initialize() {
    try {
      this.logger.info(
        `🚀 Initializing WorkflowEngine with graphDir: ${this.graphDir}`
      );

      // Load Turtle files directly from the specified directory
      const { readdir, readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const N3 = await import("n3");

      const fileNames = (await readdir(this.graphDir)).filter((f) =>
        f.endsWith(".ttl")
      );
      const files = await Promise.all(
        fileNames.map(async (name) => ({
          name,
          content: await readFile(join(this.graphDir, name), "utf8"),
        }))
      );

      const store = new N3.Store();
      const parser = new N3.Parser();
      for (const file of files) {
        try {
          store.addQuads(parser.parse(file.content));
        } catch (error) {
          this.logger.warn(
            `⚠️ Failed to parse turtle file ${file.name}: ${error.message}`
          );
        }
      }

      this.logger.info(
        `📁 Loaded ${files.length} Turtle files from: ${this.graphDir}`
      );

      // Create graph interface using the store
      this.graph = await useGraph(store);
      this.logger.info(`📊 Created graph interface`);

      return this;
    } catch (error) {
      this.logger.error(`❌ Failed to initialize WorkflowEngine:`, error);
      throw error;
    }
  }

  /**
   * List all workflows found in Turtle files
   */
  async listWorkflows() {
    if (!this.graph) {
      await this.initialize();
    }

    try {
      // Query for all hooks using SPARQL
      const query = `
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

      const results = await this.graph.query(query);
      this.logger.info(`📋 Found ${results.results?.length || 0} workflows`);

      return (results.results || []).map((result) => ({
        id: result.workflow.value,
        title: result.title.value,
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
   */
  async executeWorkflow(workflowId) {
    if (!this.graph) {
      await this.initialize();
    }

    try {
      this.logger.info(`🎯 Executing workflow: ${workflowId}`);

      // Find the workflow hook using SPARQL
      const query = `
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

      const results = await this.graph.query(query);

      if (!results.results || results.results.length === 0) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      const workflowTitle = results.results[0].title.value;
      const pipelineId = results.results[0].pipeline.value;
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
            this.graph,
            null, // No turtle needed since we have graph
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
      // Query for all steps in the pipeline
      const query = `
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

      const results = await this.graph.query(query);
      const stepMap = new Map();

      // Group results by step
      for (const result of results.results) {
        const stepId = result.step.value;
        const stepType = result.stepType.value;

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
          if (result.configProp.value.includes("#")) {
            // Handle full URIs like http://example.org/gitvan#template
            prop = result.configProp.value.split("#")[1];
          } else {
            // Handle prefixed names like gv:template
            prop = result.configProp.value.split(":")[1];
          }
          const value = result.configValue.value;

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

  async query(sparqlQuery) {
    if (!this.graph) {
      await this.initialize();
    }

    try {
      this.logger.info(`🔍 Executing SPARQL query`);
      const results = await this.graph.query(sparqlQuery);
      this.logger.info(
        `✅ Query completed, ${results.results?.length || 0} results`
      );
      return results;
    } catch (error) {
      this.logger.error(`❌ SPARQL query failed:`, error);
      throw error;
    }
  }

  /**
   * Get graph statistics
   */
  async getStats() {
    if (!this.graph) {
      await this.initialize();
    }

    try {
      const stats = await this.graph.getStats();
      this.logger.info(`📊 Graph stats: ${stats.tripleCount} triples`);
      return stats;
    } catch (error) {
      this.logger.error(`❌ Failed to get graph stats:`, error);
      throw error;
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
