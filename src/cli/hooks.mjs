// src/cli/hooks.mjs
// CLI commands for the Knowledge Hook Engine
// Provides command-line interface for hook management and evaluation

import { HookOrchestrator } from "../hooks/HookOrchestrator.mjs";
import { useGitVan } from "../core/context.mjs";

/**
 * Knowledge Hook CLI commands
 */
export class HooksCLI {
  /**
   * @param {object} options
   * @param {object} [options.logger] - Logger instance
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.orchestrator = null;
  }

  /**
   * Initialize the hooks CLI
   * @param {object} context - GitVan context
   */
  async initialize(context) {
    this.orchestrator = new HookOrchestrator({
      graphDir: "./hooks",
      context: context,
      logger: this.logger,
    });
  }

  /**
   * List all available hooks
   * @returns {Promise<void>}
   */
  async list() {
    try {
      this.logger.info("🧠 Available Knowledge Hooks:");
      this.logger.info("─".repeat(60));

      const hooks = await this.orchestrator.listHooks();

      if (hooks.length === 0) {
        this.logger.info("No hooks found in ./hooks directory");
        return;
      }

      for (const hook of hooks) {
        this.logger.info(`🔧 ${hook.id}`);
        this.logger.info(`   Title: ${hook.title}`);
        this.logger.info(`   Predicate Type: ${hook.predicateType}`);
        this.logger.info(`   Workflows: ${hook.workflowCount}`);
        this.logger.info("");
      }
    } catch (error) {
      this.logger.error(`❌ Failed to list hooks: ${error.message}`);
      throw error;
    }
  }

  /**
   * Evaluate all hooks
   * @param {object} options - Evaluation options
   * @param {boolean} [options.dryRun] - Dry run mode
   * @param {boolean} [options.verbose] - Verbose output
   * @returns {Promise<void>}
   */
  async evaluate(options = {}) {
    try {
      this.logger.info("🧠 Starting Knowledge Hook evaluation");

      if (options.dryRun) {
        this.logger.info("🔍 Dry run mode - no actual execution");
        // In dry run, we would validate all hooks without executing
        const hooks = await this.orchestrator.listHooks();
        this.logger.info(`Found ${hooks.length} hooks to evaluate`);
        return;
      }

      const startTime = performance.now();
      const result = await this.orchestrator.evaluate(options);
      const endTime = performance.now();

      this.logger.info("✅ Knowledge Hook evaluation completed");
      this.logger.info(`   Duration: ${result.duration}ms`);
      this.logger.info(`   Hooks evaluated: ${result.hooksEvaluated}`);
      this.logger.info(`   Hooks triggered: ${result.hooksTriggered}`);
      this.logger.info(`   Workflows executed: ${result.workflowsExecuted}`);
      this.logger.info(
        `   Workflows successful: ${result.workflowsSuccessful}`
      );

      if (result.hooksTriggered > 0) {
        this.logger.info("\n🎯 Triggered Hooks:");
        this.logger.info("─".repeat(30));
        for (const hook of result.triggeredHooks) {
          this.logger.info(`✅ ${hook.id} (${hook.predicateType})`);
        }
      }

      if (options.verbose) {
        this.logger.info("\n📊 Evaluation Details:");
        this.logger.info("─".repeat(30));

        for (const evalResult of result.metadata.evaluationResults) {
          const status = evalResult.triggered ? "✅" : "⏸️";
          this.logger.info(
            `${status} ${evalResult.hookId} (${evalResult.predicateType})`
          );
        }

        if (result.executions.length > 0) {
          this.logger.info("\n⚡ Workflow Executions:");
          this.logger.info("─".repeat(30));
          for (const execution of result.executions) {
            const status = execution.success ? "✅" : "❌";
            this.logger.info(`${status} ${execution.hookId}`);
            if (execution.error) {
              this.logger.info(`   Error: ${execution.error}`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`❌ Hook evaluation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate a hook
   * @param {string} hookId - Hook ID to validate
   * @returns {Promise<void>}
   */
  async validate(hookId) {
    try {
      this.logger.info(`🔍 Validating hook: ${hookId}`);

      const validation = await this.orchestrator.validateHook(hookId);

      if (validation.valid) {
        this.logger.info("✅ Hook validation passed");
        this.logger.info(`   Predicate Type: ${validation.predicateType}`);
        this.logger.info(`   Workflow Steps: ${validation.workflowSteps}`);
        this.logger.info(`   Complexity: ${validation.estimatedComplexity}`);
      } else {
        this.logger.error(`❌ Hook validation failed: ${validation.error}`);
        throw new Error(`Hook validation failed: ${validation.error}`);
      }
    } catch (error) {
      this.logger.error(`❌ Validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get hook statistics
   * @returns {Promise<void>}
   */
  async stats() {
    try {
      this.logger.info("📊 Knowledge Hook Engine Statistics:");
      this.logger.info("─".repeat(50));

      const stats = this.orchestrator.getStats();

      this.logger.info(`Hooks loaded: ${stats.hooksLoaded}`);
      this.logger.info(`Context initialized: ${stats.contextInitialized}`);
      this.logger.info(`Graph size: ${stats.graphSize} triples`);

      if (stats.lastEvaluation) {
        this.logger.info(`Last evaluation: ${stats.lastEvaluation.timestamp}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to get statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new hook template
   * @param {string} hookId - Hook ID
   * @param {string} [title] - Hook title
   * @param {string} [predicateType] - Predicate type
   * @returns {Promise<void>}
   */
  async create(hookId, title = null, predicateType = "ask") {
    try {
      this.logger.info(`📝 Creating hook template: ${hookId}`);

      const hookTitle =
        title ||
        hookId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

      const template = this._generateHookTemplate(
        hookId,
        hookTitle,
        predicateType
      );

      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      const hooksDir = "./hooks";
      await fs.mkdir(hooksDir, { recursive: true });

      const filePath = path.join(hooksDir, `${hookId}.ttl`);
      await fs.writeFile(filePath, template, "utf8");

      this.logger.info(`✅ Hook template created: ${filePath}`);
      this.logger.info("📝 Edit the template to customize your hook");
    } catch (error) {
      this.logger.error(`❌ Failed to create hook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate hook template based on predicate type
   * @private
   */
  _generateHookTemplate(hookId, title, predicateType) {
    const baseTemplate = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# ${title} Hook
# Generated on: ${new Date().toISOString()}

ex:${hookId} rdf:type gh:Hook ;
    gv:title "${title}" ;
    gh:hasPredicate ex:${hookId}-predicate ;
    gh:orderedPipelines ex:${hookId}-pipeline .`;

    let predicateTemplate = "";
    let workflowTemplate = "";

    switch (predicateType) {
      case "resultDelta":
        predicateTemplate = `ex:${hookId}-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?item WHERE {
            ?item rdf:type gv:ExampleItem .
        }
    """ ;
    gh:description "Detects changes in query result sets between commits" .`;
        break;

      case "ask":
        predicateTemplate = `ex:${hookId}-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:ExampleItem .
        }
    """ ;
    gh:description "Evaluates a boolean condition using SPARQL ASK" .`;
        break;

      case "selectThreshold":
        predicateTemplate = `ex:${hookId}-predicate rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?item) AS ?count) WHERE {
            ?item rdf:type gv:ExampleItem .
        }
    """ ;
    gh:threshold 10 ;
    gh:operator ">" ;
    gh:description "Monitors numerical values against thresholds" .`;
        break;

      case "shacl":
        predicateTemplate = `ex:${hookId}-predicate rdf:type gh:SHACLAllConform ;
    gh:shapesText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX sh: <http://www.w3.org/ns/shacl#>
        
        gv:ExampleShape a sh:NodeShape ;
            sh:targetClass gv:ExampleItem ;
            sh:property [
                sh:path gv:name ;
                sh:minCount 1 ;
            ] .
    """ ;
    gh:description "Validates graph conformance against SHACL shapes" .`;
        break;

      default:
        predicateTemplate = `ex:${hookId}-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?item rdf:type gv:ExampleItem .
        }
    """ ;
    gh:description "Example predicate - customize as needed" .`;
    }

    workflowTemplate = `ex:${hookId}-pipeline rdf:type op:Pipeline ;
    op:steps ex:${hookId}-step1 .

ex:${hookId}-step1 rdf:type gv:TemplateStep ;
    gv:text "Hook ${hookId} triggered at {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}" ;
    gv:filePath "./output/${hookId}-output.txt" .`;

    return `${baseTemplate}

${predicateTemplate}

${workflowTemplate}`;
  }

  /**
   * Show hook help
   * @returns {void}
   */
  help() {
    this.logger.info("🧠 GitVan Knowledge Hook Commands:");
    this.logger.info("─".repeat(50));
    this.logger.info("");
    this.logger.info("📋 List hooks:");
    this.logger.info("   gitvan hooks list");
    this.logger.info("");
    this.logger.info("🧠 Evaluate hooks:");
    this.logger.info("   gitvan hooks evaluate");
    this.logger.info("   gitvan hooks evaluate --dry-run");
    this.logger.info("   gitvan hooks evaluate --verbose");
    this.logger.info("");
    this.logger.info("🔍 Validate hook:");
    this.logger.info("   gitvan hooks validate <hook-id>");
    this.logger.info("");
    this.logger.info("📊 Show statistics:");
    this.logger.info("   gitvan hooks stats");
    this.logger.info("");
    this.logger.info("📝 Create hook template:");
    this.logger.info(
      "   gitvan hooks create <hook-id> [title] [predicate-type]"
    );
    this.logger.info(
      "   Predicate types: ask, resultDelta, selectThreshold, shacl"
    );
    this.logger.info("");
    this.logger.info("❓ Show this help:");
    this.logger.info("   gitvan hooks help");
  }
}

/**
 * CLI command handler for hook operations
 * @param {Array<string>} args - Command line arguments
 * @param {object} options - Command options
 * @returns {Promise<void>}
 */
export async function handleHooksCommand(args, options = {}) {
  const cli = new HooksCLI({ logger: options.logger });

  try {
    // Initialize GitVan context
    const context = useGitVan();
    await cli.initialize(context);

    const command = args[0];

    switch (command) {
      case "list":
        await cli.list();
        break;

      case "evaluate":
        const evalOptions = {
          dryRun: options.dryRun || false,
          verbose: options.verbose || false,
        };
        await cli.evaluate(evalOptions);
        break;

      case "validate":
        const validateHookId = args[1];
        if (!validateHookId) {
          throw new Error("Hook ID required for validate command");
        }
        await cli.validate(validateHookId);
        break;

      case "stats":
        await cli.stats();
        break;

      case "create":
        const createHookId = args[1];
        if (!createHookId) {
          throw new Error("Hook ID required for create command");
        }
        const title = args[2];
        const predicateType = args[3] || "ask";
        await cli.create(createHookId, title, predicateType);
        break;

      case "help":
      default:
        cli.help();
        break;
    }
  } catch (error) {
    console.error(`❌ Hooks command failed: ${error.message}`);
    process.exit(1);
  }
}
