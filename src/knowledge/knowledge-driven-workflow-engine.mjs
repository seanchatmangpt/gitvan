// Knowledge-Driven Workflow Engine Integration
// Connects the formal knowledge hooks model to the existing WorkflowEngine

import { WorkflowEngine } from "../workflow/workflow-engine.mjs";
import { KnowledgeSubstrate } from "./knowledge-substrate.mjs";
import {
  GitEventProcess,
  ExternalFeedProcess,
  KnowledgeIngestion,
} from "./event-feed-processes.mjs";
import { QueryGraphAlgebra, PredicateEngine } from "./query-graph-algebra.mjs";
import { KnowledgeHook } from "./knowledge-hook-primitive.mjs";
import { WorkflowDAGExecution } from "./workflow-dag-execution.mjs";
import { useLog } from "../composables/log.mjs";

const logger = useLog("KnowledgeWorkflowIntegration");

/**
 * Knowledge-Driven Workflow Engine
 * Integrates the formal knowledge hooks model with the existing WorkflowEngine
 */
export class KnowledgeDrivenWorkflowEngine extends WorkflowEngine {
  constructor(options = {}) {
    super(options);
    this.logger = options.logger || logger;

    // Initialize knowledge substrate
    this.knowledgeSubstrate = new KnowledgeSubstrate({ logger: this.logger });
    this.queryAlgebra = new QueryGraphAlgebra(this.knowledgeSubstrate, {
      logger: this.logger,
    });
    this.predicateEngine = new PredicateEngine(this.queryAlgebra, {
      logger: this.logger,
    });

    // Initialize event and feed processes
    this.knowledgeIngestion = new KnowledgeIngestion(this.knowledgeSubstrate, {
      logger: this.logger,
    });
    this.eventProcesses = new Map();
    this.feedProcesses = new Map();

    // Initialize knowledge hooks
    this.knowledgeHooks = new Map();
    this.hookExecutionHistory = [];

    // Initialize DAG execution for complex workflows
    this.dagExecution = new WorkflowDAGExecution({ logger: this.logger });

    // Knowledge-driven execution state
    this.executionContext = {
      currentState: {},
      knowledgeState: null,
      hooksTriggered: [],
      eventsProcessed: [],
      feedsUpdated: [],
    };
  }

  /**
   * Enhanced initialization with knowledge substrate
   */
  async initialize() {
    // Initialize base workflow engine
    await super.initialize();

    this.logger.info("🧠 Initializing Knowledge-Driven Workflow Engine");

    // Set up knowledge substrate with workflow data
    await this.initializeKnowledgeSubstrate();

    // Set up event and feed processes
    await this.setupEventFeedProcesses();

    // Set up knowledge hooks
    await this.setupKnowledgeHooks();

    this.logger.info("✅ Knowledge-Driven Workflow Engine initialized");

    return this;
  }

  /**
   * Initialize knowledge substrate with workflow data
   */
  async initializeKnowledgeSubstrate() {
    this.logger.info("📊 Initializing knowledge substrate with workflow data");

    // Convert workflow graph to knowledge triples
    if (this.graph) {
      const workflows = await this.listWorkflows();

      for (const workflow of workflows) {
        // Add workflow as knowledge triple
        this.knowledgeSubstrate.addTriple(
          workflow.id,
          "rdf:type",
          "workflow:Workflow",
          Date.now()
        );

        this.knowledgeSubstrate.addTriple(
          workflow.id,
          "workflow:title",
          workflow.title,
          Date.now()
        );

        this.knowledgeSubstrate.addTriple(
          workflow.id,
          "workflow:status",
          "available",
          Date.now()
        );

        // Query workflow steps and add them as knowledge
        try {
          const steps = await this._parseWorkflowSteps(workflow.id);
          for (const step of steps) {
            this.knowledgeSubstrate.addTriple(
              step.id,
              "rdf:type",
              `workflow:${step.type}Step`,
              Date.now()
            );

            this.knowledgeSubstrate.addTriple(
              workflow.id,
              "workflow:hasStep",
              step.id,
              Date.now()
            );

            // Add step configuration as knowledge
            for (const [key, value] of Object.entries(step.config)) {
              this.knowledgeSubstrate.addTriple(
                step.id,
                `workflow:${key}`,
                value.toString(),
                Date.now()
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `⚠️ Could not parse steps for workflow ${workflow.id}: ${error.message}`
          );
        }
      }
    }

    this.logger.info(
      `📊 Knowledge substrate initialized with ${
        this.knowledgeSubstrate.getStats().totalTriples
      } triples`
    );
  }

  /**
   * Set up event and feed processes
   */
  async setupEventFeedProcesses() {
    this.logger.info("📡 Setting up event and feed processes");

    // Git event processes
    const commitProcess = new GitEventProcess("commit", {
      logger: this.logger,
    });
    const pushProcess = new GitEventProcess("push", { logger: this.logger });
    const mergeProcess = new GitEventProcess("merge", { logger: this.logger });

    // External feed processes
    const issuesFeed = new ExternalFeedProcess("issues", {
      logger: this.logger,
    });
    const ciFeed = new ExternalFeedProcess("CI", { logger: this.logger });
    const monitoringFeed = new ExternalFeedProcess("monitoring", {
      logger: this.logger,
    });

    // Register processes
    this.knowledgeIngestion.registerEventProcess("commit", commitProcess);
    this.knowledgeIngestion.registerEventProcess("push", pushProcess);
    this.knowledgeIngestion.registerEventProcess("merge", mergeProcess);

    this.knowledgeIngestion.registerFeedProcess("issues", issuesFeed);
    this.knowledgeIngestion.registerFeedProcess("CI", ciFeed);
    this.knowledgeIngestion.registerFeedProcess("monitoring", monitoringFeed);

    // Store references
    this.eventProcesses.set("commit", commitProcess);
    this.eventProcesses.set("push", pushProcess);
    this.eventProcesses.set("merge", mergeProcess);

    this.feedProcesses.set("issues", issuesFeed);
    this.feedProcesses.set("CI", ciFeed);
    this.feedProcesses.set("monitoring", monitoringFeed);

    this.logger.info("📡 Event and feed processes set up");
  }

  /**
   * Set up knowledge hooks for intelligent workflow execution
   */
  async setupKnowledgeHooks() {
    this.logger.info("🔗 Setting up knowledge hooks");

    // Hook 1: Auto-execute workflow when conditions are met
    const autoExecuteHook = new KnowledgeHook(
      "workflow_auto_execute",
      {
        type: "composite",
        predicates: [
          {
            type: "threshold",
            query: {
              subject: null,
              predicate: "rdf:type",
              object: "event:commit",
            },
            threshold: 3,
          },
          {
            type: "ask",
            query: {
              subject: null,
              predicate: "workflow:status",
              object: "available",
            },
          },
        ],
        operator: "AND",
      },
      {
        type: "composite",
        actions: [
          {
            type: "log",
            message: "Auto-executing workflow due to commit threshold",
          },
          {
            type: "updateState",
            updates: { autoExecuteTriggered: true, triggerTime: Date.now() },
          },
        ],
      },
      { logger: this.logger }
    );

    // Hook 2: Monitor workflow performance
    const performanceHook = new KnowledgeHook(
      "workflow_performance_monitor",
      {
        type: "threshold",
        query: {
          subject: null,
          predicate: "workflow:executionTime",
          object: null,
        },
        threshold: 1,
      },
      {
        type: "composite",
        actions: [
          { type: "log", message: "Workflow performance monitoring triggered" },
          {
            type: "addTriple",
            subject: "performance:alert",
            predicate: "alert:type",
            object: "performance",
          },
        ],
      },
      { logger: this.logger }
    );

    // Hook 3: Dependency resolution
    const dependencyHook = new KnowledgeHook(
      "workflow_dependency_resolver",
      {
        type: "ask",
        query: {
          subject: null,
          predicate: "workflow:hasDependency",
          object: null,
        },
      },
      {
        type: "composite",
        actions: [
          { type: "log", message: "Resolving workflow dependencies" },
          {
            type: "updateState",
            updates: { dependencyResolution: true, resolutionTime: Date.now() },
          },
        ],
      },
      { logger: this.logger }
    );

    // Register hooks
    this.knowledgeHooks.set("auto_execute", autoExecuteHook);
    this.knowledgeHooks.set("performance_monitor", performanceHook);
    this.knowledgeHooks.set("dependency_resolver", dependencyHook);

    this.logger.info(`🔗 Set up ${this.knowledgeHooks.size} knowledge hooks`);
  }

  /**
   * Enhanced workflow execution with knowledge-driven intelligence
   */
  async executeWorkflow(workflowId, options = {}) {
    this.logger.info(
      `🧠 Knowledge-driven execution of workflow: ${workflowId}`
    );

    // Update execution context
    this.executionContext.knowledgeState = this.knowledgeSubstrate;
    this.executionContext.currentState = { ...options };

    // Execute knowledge hooks before workflow execution
    await this.executeKnowledgeHooks("pre_execution", {
      workflowId,
      ...options,
    });

    // Execute the base workflow
    const baseResult = await super.executeWorkflow(workflowId);

    // Add execution metadata to knowledge base
    this.knowledgeSubstrate.addTriple(
      workflowId,
      "workflow:lastExecuted",
      new Date().toISOString(),
      Date.now()
    );

    this.knowledgeSubstrate.addTriple(
      workflowId,
      "workflow:executionTime",
      (
        Date.now() -
        (baseResult.executedAt
          ? new Date(baseResult.executedAt).getTime()
          : Date.now())
      ).toString(),
      Date.now()
    );

    this.knowledgeSubstrate.addTriple(
      workflowId,
      "workflow:status",
      baseResult.status,
      Date.now()
    );

    // Execute knowledge hooks after workflow execution
    await this.executeKnowledgeHooks("post_execution", {
      workflowId,
      result: baseResult,
    });

    // Generate intelligent insights
    const insights = await this.generateExecutionInsights(
      workflowId,
      baseResult
    );

    return {
      ...baseResult,
      knowledgeInsights: insights,
      hooksTriggered: this.executionContext.hooksTriggered,
      knowledgeState: this.knowledgeSubstrate.getStats(),
    };
  }

  /**
   * Execute knowledge hooks for a specific phase
   */
  async executeKnowledgeHooks(phase, context) {
    this.logger.info(`🔗 Executing knowledge hooks for phase: ${phase}`);

    const hooksExecuted = [];

    for (const [hookId, hook] of this.knowledgeHooks) {
      try {
        const event = {
          type: phase,
          timestamp: Date.now(),
          data: context,
        };

        const result = await hook.execute(
          event,
          this.knowledgeSubstrate,
          this.executionContext.currentState
        );

        if (result.executed) {
          hooksExecuted.push({
            hookId,
            phase,
            result: result.actionResult,
            executionCount: result.executionCount,
          });

          this.executionContext.hooksTriggered.push(hookId);
        }
      } catch (error) {
        this.logger.error(
          `❌ Hook ${hookId} execution failed: ${error.message}`
        );
      }
    }

    this.logger.info(
      `🔗 Executed ${hooksExecuted.length} hooks for phase: ${phase}`
    );
    return hooksExecuted;
  }

  /**
   * Generate intelligent insights about workflow execution
   */
  async generateExecutionInsights(workflowId, executionResult) {
    this.logger.info(
      `🧠 Generating execution insights for workflow: ${workflowId}`
    );

    const insights = {
      performance: await this.analyzePerformance(workflowId, executionResult),
      dependencies: await this.analyzeDependencies(workflowId),
      patterns: await this.analyzeExecutionPatterns(workflowId),
      recommendations: await this.generateRecommendations(
        workflowId,
        executionResult
      ),
    };

    return insights;
  }

  /**
   * Analyze workflow performance
   */
  async analyzePerformance(workflowId, executionResult) {
    const executionTimes = this.knowledgeSubstrate.query(
      workflowId,
      "workflow:executionTime",
      null
    );

    const avgExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce(
            (sum, triple) => sum + parseInt(triple.object),
            0
          ) / executionTimes.length
        : 0;

    return {
      averageExecutionTime: avgExecutionTime,
      totalExecutions: executionTimes.length,
      lastExecutionTime: executionTimes[executionTimes.length - 1]?.object || 0,
      performanceTrend: this.calculatePerformanceTrend(executionTimes),
    };
  }

  /**
   * Analyze workflow dependencies
   */
  async analyzeDependencies(workflowId) {
    const dependencies = this.knowledgeSubstrate.query(
      workflowId,
      "workflow:hasDependency",
      null
    );

    const dependents = this.knowledgeSubstrate.query(
      null,
      "workflow:hasDependency",
      workflowId
    );

    return {
      dependencies: dependencies.map((triple) => triple.object),
      dependents: dependents.map((triple) => triple.subject),
      dependencyCount: dependencies.length,
      dependentCount: dependents.length,
    };
  }

  /**
   * Analyze execution patterns
   */
  async analyzeExecutionPatterns(workflowId) {
    const executions = this.knowledgeSubstrate.query(
      workflowId,
      "workflow:lastExecuted",
      null
    );

    const patterns = {
      executionFrequency: executions.length,
      timePatterns: this.analyzeTimePatterns(executions),
      successRate: this.calculateSuccessRate(workflowId),
    };

    return patterns;
  }

  /**
   * Generate intelligent recommendations
   */
  async generateRecommendations(workflowId, executionResult) {
    const recommendations = [];

    // Performance recommendations
    const performance = await this.analyzePerformance(
      workflowId,
      executionResult
    );
    if (performance.averageExecutionTime > 5000) {
      recommendations.push({
        type: "performance",
        message: "Consider optimizing workflow steps for better performance",
        priority: "medium",
      });
    }

    // Dependency recommendations
    const dependencies = await this.analyzeDependencies(workflowId);
    if (dependencies.dependencyCount > 5) {
      recommendations.push({
        type: "complexity",
        message:
          "Workflow has many dependencies - consider breaking into smaller workflows",
        priority: "high",
      });
    }

    // Execution pattern recommendations
    const patterns = await this.analyzeExecutionPatterns(workflowId);
    if (patterns.executionFrequency < 2) {
      recommendations.push({
        type: "usage",
        message: "Workflow is rarely used - consider if it's still needed",
        priority: "low",
      });
    }

    return recommendations;
  }

  /**
   * Calculate performance trend
   */
  calculatePerformanceTrend(executionTimes) {
    if (executionTimes.length < 2) return "stable";

    const times = executionTimes.map((triple) => parseInt(triple.object));
    const recent = times.slice(-3);
    const older = times.slice(-6, -3);

    if (recent.length === 0 || older.length === 0) return "stable";

    const recentAvg =
      recent.reduce((sum, time) => sum + time, 0) / recent.length;
    const olderAvg = older.reduce((sum, time) => sum + time, 0) / older.length;

    if (recentAvg > olderAvg * 1.1) return "degrading";
    if (recentAvg < olderAvg * 0.9) return "improving";
    return "stable";
  }

  /**
   * Analyze time patterns
   */
  analyzeTimePatterns(executions) {
    const times = executions.map((triple) => new Date(triple.object));
    const hours = times.map((time) => time.getHours());

    const hourCounts = {};
    hours.forEach((hour) => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const mostActiveHour = Object.keys(hourCounts).reduce((a, b) =>
      hourCounts[a] > hourCounts[b] ? a : b
    );

    return {
      mostActiveHour: parseInt(mostActiveHour),
      executionDistribution: hourCounts,
    };
  }

  /**
   * Calculate success rate
   */
  calculateSuccessRate(workflowId) {
    const statuses = this.knowledgeSubstrate.query(
      workflowId,
      "workflow:status",
      null
    );

    const successful = statuses.filter(
      (triple) => triple.object === "completed"
    ).length;
    const total = statuses.length;

    return total > 0 ? (successful / total) * 100 : 0;
  }

  /**
   * Get comprehensive knowledge-driven statistics
   */
  async getKnowledgeStats() {
    const baseStats = await this.getStats();
    const knowledgeStats = this.knowledgeSubstrate.getStats();
    const hookStats = Array.from(this.knowledgeHooks.values()).map((hook) =>
      hook.getStats()
    );

    return {
      ...baseStats,
      knowledge: knowledgeStats,
      hooks: hookStats,
      eventProcesses: this.eventProcesses.size,
      feedProcesses: this.feedProcesses.size,
      executionContext: {
        hooksTriggered: this.executionContext.hooksTriggered.length,
        eventsProcessed: this.executionContext.eventsProcessed.length,
        feedsUpdated: this.executionContext.feedsUpdated.length,
      },
    };
  }

  /**
   * Query knowledge base with SPARQL-like interface
   */
  async queryKnowledge(query) {
    if (typeof query === "string") {
      // SPARQL query
      return await this.graph.query(query);
    } else {
      // Structured query using query algebra
      return this.queryAlgebra.complexQuery(query);
    }
  }

  /**
   * Add custom knowledge hook
   */
  addKnowledgeHook(hookId, eventType, predicate, action, options = {}) {
    const hook = new KnowledgeHook(eventType, predicate, action, {
      logger: this.logger,
      ...options,
    });

    this.knowledgeHooks.set(hookId, hook);
    this.logger.info(`🔗 Added custom knowledge hook: ${hookId}`);

    return hook;
  }

  /**
   * Trigger event for knowledge hooks
   */
  async triggerEvent(eventType, eventData) {
    this.logger.info(`📡 Triggering event: ${eventType}`);

    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: eventData,
    };

    // Add event to knowledge base
    this.knowledgeSubstrate.addTriple(
      `event:${eventType}_${event.timestamp}`,
      "rdf:type",
      `event:${eventType}`,
      event.timestamp
    );

    // Execute relevant hooks
    const hooksExecuted = [];
    for (const [hookId, hook] of this.knowledgeHooks) {
      if (hook.eventType === eventType) {
        try {
          const result = await hook.execute(
            event,
            this.knowledgeSubstrate,
            this.executionContext.currentState
          );
          if (result.executed) {
            hooksExecuted.push({ hookId, result });
          }
        } catch (error) {
          this.logger.error(
            `❌ Hook ${hookId} execution failed: ${error.message}`
          );
        }
      }
    }

    this.executionContext.eventsProcessed.push(eventType);

    return {
      event,
      hooksExecuted: hooksExecuted.length,
      results: hooksExecuted,
    };
  }

  /**
   * Provides access to the underlying knowledge system components.
   */
  getKnowledgeSystem() {
    return {
      substrate: this.knowledgeSubstrate,
      eventsAndFeeds: this.knowledgeIngestion,
      queryAlgebra: this.queryAlgebra,
      predicateEngine: this.predicateEngine,
      hooks: this.knowledgeHooks,
      workflowDAG: this.workflowDAGExecution,
      systemState: this.executionContext.currentState,
    };
  }
}

/**
 * Create a knowledge-driven workflow engine
 */
export async function createKnowledgeDrivenWorkflowEngine(options = {}) {
  const engine = new KnowledgeDrivenWorkflowEngine(options);
  await engine.initialize();
  return engine;
}
