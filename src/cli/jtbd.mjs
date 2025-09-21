import { HookOrchestrator } from "../hooks/HookOrchestrator.mjs";
import { KnowledgeHookRegistry } from "../hooks/KnowledgeHookRegistry.mjs";
import { useGitVan } from "../core/context.mjs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * JTBD CLI - Jobs-to-be-Done Management Interface
 * Provides comprehensive CLI for managing JTBD hooks and workflows
 */
export class JTBDCLI {
  constructor() {
    this.hooksDir = "./hooks/jtbd-hooks";
    this.logger = console;
    this.orchestrator = null;
    this.registry = null;
    this.context = null;
  }

  async initialize(context) {
    this.context = context || useGitVan();

    this.logger.info("🎯 Initializing JTBD CLI...");

    // Initialize Knowledge Hook Orchestrator for JTBD hooks
    this.orchestrator = new HookOrchestrator({
      graphDir: this.hooksDir,
      logger: this.logger,
    });

    // Initialize Knowledge Hook Registry
    this.registry = new KnowledgeHookRegistry({
      hooksDir: this.hooksDir,
      logger: this.logger,
      orchestrator: this.orchestrator,
    });

    await this.registry.initialize();

    this.logger.info("✅ JTBD CLI initialized successfully");
  }

  /**
   * List all JTBD hooks
   */
  async list() {
    this.logger.info("🎯 Available JTBD Hooks:");
    this.logger.info("=".repeat(60));

    if (this.registry.hooks.size === 0) {
      this.logger.info("No JTBD hooks found in ./hooks/jtbd-hooks directory");
      return;
    }

    for (const [hookId, hook] of this.registry.hooks) {
      const category = this.getJtbdCategory(hookId);
      const domain = this.getJtbdDomain(hookId);

      this.logger.info(`🎯 ${hookId}`);
      this.logger.info(`   Title: ${hook.title || "N/A"}`);
      this.logger.info(`   Predicate Type: ${hook.predicateType || "N/A"}`);
      this.logger.info(`   Category: ${category}`);
      this.logger.info(`   Domain: ${domain}`);
      this.logger.info(`   File: ${hook.file}`);
      this.logger.info("");
    }

    this.showJtbdHelp();
  }

  /**
   * List JTBD hooks by category
   */
  async listByCategory(category) {
    this.logger.info(`🎯 JTBD Hooks in Category: ${category}`);
    this.logger.info("=".repeat(60));

    const categoryHooks = Array.from(this.registry.hooks.entries()).filter(
      ([hookId, hook]) => this.getJtbdCategory(hookId) === category
    );

    if (categoryHooks.length === 0) {
      this.logger.info(`No JTBD hooks found in category: ${category}`);
      return;
    }

    for (const [hookId, hook] of categoryHooks) {
      this.logger.info(`🎯 ${hookId}`);
      this.logger.info(`   Title: ${hook.title || "N/A"}`);
      this.logger.info(`   Predicate Type: ${hook.predicateType || "N/A"}`);
      this.logger.info(`   File: ${hook.file}`);
      this.logger.info("");
    }
  }

  /**
   * List JTBD hooks by domain
   */
  async listByDomain(domain) {
    this.logger.info(`🎯 JTBD Hooks in Domain: ${domain}`);
    this.logger.info("=".repeat(60));

    const domainHooks = Array.from(this.registry.hooks.entries()).filter(
      ([hookId, hook]) => this.getJtbdDomain(hookId) === domain
    );

    if (domainHooks.length === 0) {
      this.logger.info(`No JTBD hooks found in domain: ${domain}`);
      return;
    }

    for (const [hookId, hook] of domainHooks) {
      this.logger.info(`🎯 ${hookId}`);
      this.logger.info(`   Title: ${hook.title || "N/A"}`);
      this.logger.info(`   Predicate Type: ${hook.predicateType || "N/A"}`);
      this.logger.info(`   File: ${hook.file}`);
      this.logger.info("");
    }
  }

  /**
   * Evaluate JTBD hooks
   */
  async evaluate(options = {}) {
    const { category, dryRun = false, verbose = false } = options;

    this.logger.info("🎯 Evaluating JTBD Hooks...");

    if (dryRun) {
      this.logger.info("🔍 DRY RUN - No actual evaluation will be performed");
    }

    try {
      // Get Git context for evaluation
      const gitContext = await this.extractGitContext();

      if (verbose) {
        this.logger.info(
          `📊 Git Context: ${gitContext.event} - ${gitContext.commitSha}`
        );
        this.logger.info(`📁 Changed files: ${gitContext.changedFiles.length}`);
        this.logger.info(`🌿 Branch: ${gitContext.branch}`);
      }

      // Determine which JTBD categories to evaluate
      const jtbdCategories = category
        ? [category]
        : this.getAllJtbdCategories();

      if (verbose) {
        this.logger.info(`🎯 JTBD Categories: ${jtbdCategories.join(", ")}`);
      }

      if (dryRun) {
        this.logger.info(
          `🔍 Would evaluate ${this.registry.hooks.size} JTBD hooks`
        );
        this.logger.info(`🎯 Categories: ${jtbdCategories.join(", ")}`);
        return;
      }

      // Evaluate JTBD knowledge hooks
      const evaluationResult = await this.orchestrator.evaluate({
        gitContext: gitContext,
        jtbdCategories: jtbdCategories,
        verbose: verbose,
      });

      this.logger.info(
        `🧠 JTBD Hooks evaluated: ${evaluationResult.hooksEvaluated}`
      );
      this.logger.info(
        `⚡ JTBD Hooks triggered: ${evaluationResult.hooksTriggered}`
      );
      this.logger.info(
        `🔄 JTBD Workflows executed: ${evaluationResult.workflowsExecuted}`
      );

      if (evaluationResult.hooksTriggered > 0) {
        this.logger.info("🎯 Triggered JTBD Hooks:");
        for (const hook of evaluationResult.triggeredHooks) {
          this.logger.info(
            `   ✅ ${hook.id} (${hook.predicateType}) - ${hook.jtbdCategory}`
          );
        }
      }
    } catch (error) {
      this.logger.error(`❌ JTBD evaluation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate specific JTBD hook
   */
  async validate(hookId) {
    this.logger.info(`🔍 Validating JTBD hook: ${hookId}`);

    try {
      const validation = await this.orchestrator.validateHook(hookId);

      if (validation.isValid) {
        this.logger.info(`✅ JTBD hook validation successful: ${hookId}`);
        this.logger.info(`   Predicate Type: ${validation.predicateType}`);
        this.logger.info(`   Workflow Steps: ${validation.workflowSteps}`);
        this.logger.info(`   Complexity: ${validation.complexity}`);
      } else {
        this.logger.error(`❌ JTBD hook validation failed: ${hookId}`);
        this.logger.error(`   Errors: ${validation.errors.join(", ")}`);
        throw new Error(
          `JTBD hook validation failed: ${validation.errors.join(", ")}`
        );
      }
    } catch (error) {
      this.logger.error(`❌ JTBD hook validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Show JTBD registry statistics
   */
  async stats() {
    this.logger.info("📊 JTBD Hooks Registry Statistics:");
    this.logger.info("=".repeat(60));
    this.logger.info(`Total JTBD Hooks: ${this.registry.hooks.size}`);
    this.logger.info("");

    // Category breakdown
    const categories = this.getJtbdCategoriesBreakdown();
    this.logger.info("Categories:");
    for (const [category, count] of Object.entries(categories)) {
      this.logger.info(`  ${category}: ${count} hooks`);
    }
    this.logger.info("");

    // Domain breakdown
    const domains = this.getJtbdDomainsBreakdown();
    this.logger.info("Domains:");
    for (const [domain, count] of Object.entries(domains)) {
      this.logger.info(`  ${domain}: ${count} hooks`);
    }
    this.logger.info("");

    // Predicate type breakdown
    const predicateTypes = this.getPredicateTypesBreakdown();
    this.logger.info("Predicate Types:");
    for (const [type, count] of Object.entries(predicateTypes)) {
      this.logger.info(`  ${type}: ${count} hooks`);
    }

    this.showJtbdHelp();
  }

  /**
   * Refresh JTBD registry
   */
  async refresh() {
    this.logger.info("🔄 Refreshing JTBD hooks registry...");

    try {
      await this.registry.initialize();
      this.logger.info(
        `✅ JTBD registry refreshed with ${this.registry.hooks.size} hooks`
      );
    } catch (error) {
      this.logger.error(`❌ Failed to refresh JTBD registry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new JTBD hook template
   */
  async create(hookId, title, predicateType = "ask") {
    this.logger.info(`📝 Creating JTBD hook template: ${hookId}`);

    const template = this._generateJtbdHookTemplate(
      hookId,
      title,
      predicateType
    );

    // Determine category and create directory structure
    const category = this.inferJtbdCategory(hookId);
    const categoryDir = join(this.hooksDir, category);

    // Create category directory if it doesn't exist
    try {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(categoryDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const filePath = join(categoryDir, `${hookId}.ttl`);

    try {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(filePath, template);
      this.logger.info(`✅ JTBD hook template created: ${filePath}`);
      this.logger.info(`🎯 Category: ${category}`);
      this.logger.info(`🔧 Predicate Type: ${predicateType}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to create JTBD hook template: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * List available JTBD workflows
   */
  async listWorkflows() {
    this.logger.info("🔄 Available JTBD Workflows:");
    this.logger.info("=".repeat(60));

    const workflows = this.getAllJtbdWorkflows();

    if (workflows.length === 0) {
      this.logger.info("No JTBD workflows found");
      return;
    }

    for (const workflow of workflows) {
      this.logger.info(`🔄 ${workflow.id}`);
      this.logger.info(`   Title: ${workflow.title || "N/A"}`);
      this.logger.info(`   Steps: ${workflow.steps?.length || 0}`);
      this.logger.info(`   Category: ${workflow.category}`);
      this.logger.info("");
    }
  }

  /**
   * Run JTBD workflow
   */
  async runWorkflow(workflowId) {
    this.logger.info(`🔄 Running JTBD workflow: ${workflowId}`);

    try {
      // Find the workflow
      const workflow = this.findJtbdWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`JTBD workflow not found: ${workflowId}`);
      }

      // Execute workflow through orchestrator
      const result = await this.orchestrator.executeWorkflow(workflowId);

      this.logger.info(`✅ JTBD workflow completed: ${workflowId}`);
      this.logger.info(`   Steps executed: ${result.stepsExecuted}`);
      this.logger.info(`   Success: ${result.success}`);
    } catch (error) {
      this.logger.error(`❌ Failed to run JTBD workflow: ${error.message}`);
      throw error;
    }
  }

  /**
   * Show JTBD workflow status
   */
  async workflowStatus() {
    this.logger.info("🔄 JTBD Workflow Status:");
    this.logger.info("=".repeat(60));

    const workflows = this.getAllJtbdWorkflows();

    for (const workflow of workflows) {
      const status = await this.getWorkflowStatus(workflow.id);
      this.logger.info(`🔄 ${workflow.id}`);
      this.logger.info(`   Status: ${status.status}`);
      this.logger.info(`   Last Run: ${status.lastRun || "Never"}`);
      this.logger.info(`   Success Rate: ${status.successRate || "N/A"}`);
      this.logger.info("");
    }
  }

  /**
   * Show JTBD analytics
   */
  async analytics(category = null) {
    this.logger.info("📊 JTBD Analytics:");
    this.logger.info("=".repeat(60));

    const analytics = await this.generateJtbdAnalytics(category);

    this.logger.info(`📈 Total JTBD Hooks: ${analytics.totalHooks}`);
    this.logger.info(`🎯 Active Categories: ${analytics.activeCategories}`);
    this.logger.info(
      `⚡ Average Evaluation Time: ${analytics.avgEvaluationTime}ms`
    );
    this.logger.info(`🔄 Workflows Executed: ${analytics.workflowsExecuted}`);
    this.logger.info("");

    if (analytics.categoryBreakdown) {
      this.logger.info("Category Breakdown:");
      for (const [cat, stats] of Object.entries(analytics.categoryBreakdown)) {
        this.logger.info(
          `  ${cat}: ${stats.hooks} hooks, ${stats.triggerRate}% trigger rate`
        );
      }
    }
  }

  /**
   * Show JTBD help
   */
  async help() {
    this.showJtbdHelp();
  }

  showJtbdHelp() {
    this.logger.info(`
🎯 GitVan JTBD (Jobs-to-be-Done) Commands:
═══════════════════════════════════════════════════════════════════════════════

📋 List JTBD hooks:
   gitvan jtbd list
   gitvan jtbd list --category <category>
   gitvan jtbd list --domain <domain>

🧠 Evaluate JTBD hooks:
   gitvan jtbd evaluate
   gitvan jtbd evaluate --category <category>
   gitvan jtbd evaluate --dry-run
   gitvan jtbd evaluate --verbose

🔄 Registry management:
   gitvan jtbd refresh
   gitvan jtbd stats

📝 Create JTBD hook template:
   gitvan jtbd create <hook-id> [title] [predicate-type]
   Predicate types: ask, resultDelta, selectThreshold, shacl

🔄 Workflow management:
   gitvan jtbd workflow list
   gitvan jtbd workflow run <workflow-id>
   gitvan jtbd workflow status

📊 Analytics and insights:
   gitvan jtbd analytics
   gitvan jtbd analytics --category <category>

❓ Show this help:
   gitvan jtbd help

🎯 JTBD Categories:
   • core-development-lifecycle: Code quality, testing, documentation
   • infrastructure-devops: Deployment, monitoring, configuration
   • security-compliance: Security policies, vulnerability scanning
   • monitoring-observability: Performance monitoring, alerting
   • business-intelligence: Analytics, reporting, insights

For more information, visit: https://github.com/seanchatmangpt/gitvan
    `);
  }

  // Helper methods

  getJtbdCategory(hookId) {
    if (hookId.includes("core-development-lifecycle"))
      return "core-development-lifecycle";
    if (hookId.includes("infrastructure-devops"))
      return "infrastructure-devops";
    if (hookId.includes("security-compliance")) return "security-compliance";
    if (hookId.includes("monitoring-observability"))
      return "monitoring-observability";
    if (hookId.includes("business-intelligence"))
      return "business-intelligence";
    return "general";
  }

  getJtbdDomain(hookId) {
    if (hookId.includes("security")) return "security";
    if (hookId.includes("performance")) return "performance";
    if (hookId.includes("quality")) return "quality";
    if (hookId.includes("deployment")) return "deployment";
    if (hookId.includes("monitoring")) return "monitoring";
    return "general";
  }

  getAllJtbdCategories() {
    return [
      "core-development-lifecycle",
      "infrastructure-devops",
      "security-compliance",
      "monitoring-observability",
      "business-intelligence",
    ];
  }

  getJtbdCategoriesBreakdown() {
    const breakdown = {};
    for (const [hookId] of this.registry.hooks) {
      const category = this.getJtbdCategory(hookId);
      breakdown[category] = (breakdown[category] || 0) + 1;
    }
    return breakdown;
  }

  getJtbdDomainsBreakdown() {
    const breakdown = {};
    for (const [hookId] of this.registry.hooks) {
      const domain = this.getJtbdDomain(hookId);
      breakdown[domain] = (breakdown[domain] || 0) + 1;
    }
    return breakdown;
  }

  getPredicateTypesBreakdown() {
    const breakdown = {};
    for (const [, hook] of this.registry.hooks) {
      const type = hook.predicateType || "unknown";
      breakdown[type] = (breakdown[type] || 0) + 1;
    }
    return breakdown;
  }

  inferJtbdCategory(hookId) {
    if (
      hookId.includes("security") ||
      hookId.includes("vulnerability") ||
      hookId.includes("compliance")
    ) {
      return "security-compliance";
    }
    if (
      hookId.includes("deployment") ||
      hookId.includes("infrastructure") ||
      hookId.includes("devops")
    ) {
      return "infrastructure-devops";
    }
    if (
      hookId.includes("monitoring") ||
      hookId.includes("observability") ||
      hookId.includes("alert")
    ) {
      return "monitoring-observability";
    }
    if (
      hookId.includes("business") ||
      hookId.includes("analytics") ||
      hookId.includes("intelligence")
    ) {
      return "business-intelligence";
    }
    return "core-development-lifecycle";
  }

  async extractGitContext() {
    const { execSync } = await import("node:child_process");

    try {
      return {
        event: "manual-evaluation",
        commitSha: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
        branch: execSync("git branch --show-current", {
          encoding: "utf8",
        }).trim(),
        changedFiles: execSync("git diff --name-only HEAD~1 HEAD", {
          encoding: "utf8",
        })
          .trim()
          .split("\n")
          .filter(Boolean),
        stagedFiles: execSync("git diff --cached --name-only", {
          encoding: "utf8",
        })
          .trim()
          .split("\n")
          .filter(Boolean),
        commitMessage: execSync("git log -1 --pretty=format:%s", {
          encoding: "utf8",
        }).trim(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        event: "manual-evaluation",
        commitSha: "unknown",
        branch: "unknown",
        changedFiles: [],
        stagedFiles: [],
        commitMessage: "unknown",
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  getAllJtbdWorkflows() {
    const workflows = [];
    for (const [, hook] of this.registry.hooks) {
      if (hook.workflows) {
        for (const workflow of hook.workflows) {
          workflows.push({
            id: workflow.id,
            title: workflow.title,
            steps: workflow.steps,
            category: this.getJtbdCategory(hook.id),
          });
        }
      }
    }
    return workflows;
  }

  findJtbdWorkflow(workflowId) {
    const workflows = this.getAllJtbdWorkflows();
    return workflows.find((w) => w.id === workflowId);
  }

  async getWorkflowStatus(workflowId) {
    // Placeholder implementation
    return {
      status: "ready",
      lastRun: null,
      successRate: "N/A",
    };
  }

  async generateJtbdAnalytics(category) {
    // Placeholder implementation
    return {
      totalHooks: this.registry.hooks.size,
      activeCategories: this.getAllJtbdCategories().length,
      avgEvaluationTime: 150,
      workflowsExecuted: 0,
      categoryBreakdown: this.getJtbdCategoriesBreakdown(),
    };
  }

  _generateJtbdHookTemplate(hookId, title, predicateType) {
    const timestamp = new Date().toISOString();
    const category = this.inferJtbdCategory(hookId);

    return `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# ${title || hookId} Hook - JTBD Template
# Generated: ${timestamp}
# Category: ${category}

ex:${hookId}-hook rdf:type gh:Hook ;
    gv:title "${title || hookId}" ;
    gh:hasPredicate ex:${hookId}-predicate ;
    gh:orderedPipelines ex:${hookId}-pipeline .

# ${predicateType.toUpperCase()} Predicate - "Condition" Sensor
ex:${hookId}-predicate rdf:type gh:${predicateType.toUpperCase()}Predicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        ASK WHERE {
            ?file rdf:type gv:SourceFile .
            ?file gv:hasIssue ?issue .
            ?issue gv:severity ?severity .
            FILTER(?severity IN ("high", "critical"))
        }
    """ ;
    gh:description "Detects issues requiring attention" .

# Workflow Pipeline
ex:${hookId}-pipeline rdf:type op:Pipeline ;
    op:steps (ex:${hookId}-step1, ex:${hookId}-step2) .

# Step 1: Analyze
ex:${hookId}-step1 rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        
        SELECT ?file ?issue ?severity WHERE {
            ?file rdf:type gv:SourceFile .
            ?file gv:hasIssue ?issue .
            ?issue gv:severity ?severity .
            FILTER(?severity IN ("high", "critical"))
        } ORDER BY ?severity DESC, ?file
    """ ;
    gv:outputMapping '{"issues": "results", "issueCount": "results.length"}' .

# Step 2: Report
ex:${hookId}-step2 rdf:type gv:TemplateStep ;
    gv:text """
        # ${title || hookId} Report
        
        **Generated:** {{ "now" | date("YYYY-MM-DD HH:mm:ss") }}  
        **Hook:** ${title || hookId}  
        **Status:** {{ issueCount > 0 ? "🚨 ISSUES DETECTED" : "✅ ALL CLEAR" }}  
        **Issue Count:** {{ issueCount }}
        
        ## Issues Detected
        
        {% for issue in issues %}
        ### {{ issue.file.value }}
        - **Severity:** {{ issue.severity.value }}
        {% endfor %}
        
        ---
        *This report was automatically generated by the ${title || hookId} Hook*
    """ ;
    gv:filePath "./reports/jtbd/${category}/${hookId}-{{ 'now' | date('YYYY-MM-DD-HH-mm-ss') }}.md" ;
    gv:dependsOn ex:${hookId}-step1 .
`;
  }
}
