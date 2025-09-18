/**
 * GitVan Template Learning System
 * Tracks template execution patterns and learns from success/failure
 */

import { promises as fs } from "node:fs";
import { join, dirname } from "pathe";
import { useGitVan } from "../core/context.mjs";
import { sha256Hex } from "../utils/crypto.mjs";
import { createLogger } from "../utils/logger.mjs";

const logger = createLogger("template-learning");

/**
 * Template Execution Metrics
 */
export class TemplateMetrics {
  constructor() {
    this.executions = new Map();
    this.patterns = new Map();
    this.userPreferences = new Map();
  }

  /**
   * Record template execution
   */
  async recordExecution(templatePath, executionResult, context = {}) {
    const executionId = sha256Hex(`${templatePath}-${Date.now()}`);
    const execution = {
      id: executionId,
      templatePath,
      timestamp: new Date().toISOString(),
      success: executionResult.ok,
      duration: executionResult.duration || 0,
      artifacts: executionResult.artifacts || [],
      errors: executionResult.errors || [],
      context: {
        projectType: context.projectType || "unknown",
        framework: context.framework || "unknown",
        userAgent: context.userAgent || "unknown",
        ...context,
      },
    };

    // Store execution
    this.executions.set(executionId, execution);

    // Update patterns
    await this.updatePatterns(execution);

    // Update user preferences
    await this.updateUserPreferences(execution);

    logger.info(
      `Recorded execution ${executionId} for template ${templatePath}`
    );
    return executionId;
  }

  /**
   * Update success/failure patterns
   */
  async updatePatterns(execution) {
    const templatePath = execution.templatePath;
    const patternKey = this.getPatternKey(execution);

    if (!this.patterns.has(patternKey)) {
      this.patterns.set(patternKey, {
        templatePath,
        pattern: patternKey,
        successCount: 0,
        failureCount: 0,
        totalExecutions: 0,
        avgDuration: 0,
        commonErrors: new Map(),
        successContexts: [],
        failureContexts: [],
      });
    }

    const pattern = this.patterns.get(patternKey);
    pattern.totalExecutions++;

    if (execution.success) {
      pattern.successCount++;
      pattern.successContexts.push(execution.context);
    } else {
      pattern.failureCount++;
      pattern.failureContexts.push(execution.context);

      // Track common errors
      execution.errors.forEach((error) => {
        const errorKey = error.type || error.message;
        pattern.commonErrors.set(
          errorKey,
          (pattern.commonErrors.get(errorKey) || 0) + 1
        );
      });
    }

    // Update average duration
    pattern.avgDuration =
      (pattern.avgDuration * (pattern.totalExecutions - 1) +
        execution.duration) /
      pattern.totalExecutions;

    this.patterns.set(patternKey, pattern);
  }

  /**
   * Update user preferences based on successful executions
   */
  async updateUserPreferences(execution) {
    if (!execution.success) return;

    const preferences = this.userPreferences.get(execution.templatePath) || {
      templatePath: execution.templatePath,
      preferredPatterns: new Map(),
      avoidedPatterns: new Map(),
      contextPreferences: new Map(),
      lastUpdated: new Date().toISOString(),
    };

    // Learn from successful context
    const contextKey = `${execution.context.projectType}-${execution.context.framework}`;
    preferences.contextPreferences.set(
      contextKey,
      (preferences.contextPreferences.get(contextKey) || 0) + 1
    );

    // Learn from successful patterns
    const patternKey = this.getPatternKey(execution);
    preferences.preferredPatterns.set(
      patternKey,
      (preferences.preferredPatterns.get(patternKey) || 0) + 1
    );

    preferences.lastUpdated = new Date().toISOString();
    this.userPreferences.set(execution.templatePath, preferences);
  }

  /**
   * Get pattern key for execution
   */
  getPatternKey(execution) {
    return `${execution.templatePath}-${execution.context.projectType}-${execution.context.framework}`;
  }

  /**
   * Get success rate for template
   */
  getSuccessRate(templatePath) {
    const executions = Array.from(this.executions.values()).filter(
      (e) => e.templatePath === templatePath
    );
    if (executions.length === 0) return 0;

    const successful = executions.filter((e) => e.success).length;
    return successful / executions.length;
  }

  /**
   * Get successful patterns for template
   */
  getSuccessfulPatterns(templatePath) {
    return Array.from(this.patterns.values())
      .filter((p) => p.templatePath === templatePath && p.successCount > 0)
      .sort((a, b) => b.successCount - a.successCount);
  }

  /**
   * Get failed patterns for template
   */
  getFailedPatterns(templatePath) {
    return Array.from(this.patterns.values())
      .filter((p) => p.templatePath === templatePath && p.failureCount > 0)
      .sort((a, b) => b.failureCount - a.failureCount);
  }

  /**
   * Get user preferences for template
   */
  getUserPreferences(templatePath) {
    return this.userPreferences.get(templatePath);
  }

  /**
   * Persist metrics to file
   */
  async persist() {
    try {
      const ctx = useGitVan();
      const metricsPath = join(
        ctx.root,
        ".gitvan",
        "metrics",
        "template-learning.json"
      );

      await fs.mkdir(dirname(metricsPath), { recursive: true });

      const data = {
        executions: Object.fromEntries(this.executions),
        patterns: Object.fromEntries(this.patterns),
        userPreferences: Object.fromEntries(this.userPreferences),
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeFile(metricsPath, JSON.stringify(data, null, 2));
      logger.info(`Persisted template learning metrics to ${metricsPath}`);
    } catch (error) {
      logger.error("Failed to persist template learning metrics:", error);
    }
  }

  /**
   * Load metrics from file
   */
  async load() {
    try {
      const ctx = useGitVan();
      const metricsPath = join(
        ctx.root,
        ".gitvan",
        "metrics",
        "template-learning.json"
      );

      const data = JSON.parse(await fs.readFile(metricsPath, "utf8"));

      this.executions = new Map(Object.entries(data.executions || {}));
      this.patterns = new Map(Object.entries(data.patterns || {}));
      this.userPreferences = new Map(
        Object.entries(data.userPreferences || {})
      );

      logger.info(`Loaded template learning metrics from ${metricsPath}`);
    } catch (error) {
      logger.warn(
        "No existing template learning metrics found, starting fresh"
      );
    }
  }
}

/**
 * Template Learning Manager
 */
export class TemplateLearningManager {
  constructor() {
    this.metrics = new TemplateMetrics();
    this.isInitialized = false;
  }

  /**
   * Initialize the learning system
   */
  async initialize() {
    if (this.isInitialized) return;

    await this.metrics.load();
    this.isInitialized = true;
    logger.info("Template learning system initialized");
  }

  /**
   * Record template execution
   */
  async recordExecution(templatePath, executionResult, context = {}) {
    await this.initialize();
    return await this.metrics.recordExecution(
      templatePath,
      executionResult,
      context
    );
  }

  /**
   * Get learning insights for template
   */
  async getInsights(templatePath) {
    await this.initialize();

    const successRate = this.metrics.getSuccessRate(templatePath);
    const successfulPatterns = this.metrics.getSuccessfulPatterns(templatePath);
    const failedPatterns = this.metrics.getFailedPatterns(templatePath);
    const userPreferences = this.metrics.getUserPreferences(templatePath);

    return {
      templatePath,
      successRate,
      totalExecutions: Array.from(this.metrics.executions.values()).filter(
        (e) => e.templatePath === templatePath
      ).length,
      successfulPatterns: successfulPatterns.map((p) => ({
        pattern: p.pattern,
        successCount: p.successCount,
        avgDuration: p.avgDuration,
        successRate: p.successCount / p.totalExecutions,
      })),
      failedPatterns: failedPatterns.map((p) => ({
        pattern: p.pattern,
        failureCount: p.failureCount,
        commonErrors: Object.fromEntries(p.commonErrors),
      })),
      userPreferences: userPreferences
        ? {
            preferredPatterns: Object.fromEntries(
              userPreferences.preferredPatterns
            ),
            contextPreferences: Object.fromEntries(
              userPreferences.contextPreferences
            ),
            lastUpdated: userPreferences.lastUpdated,
          }
        : null,
    };
  }

  /**
   * Get recommendations for template improvement
   */
  async getRecommendations(templatePath) {
    const insights = await this.getInsights(templatePath);
    const recommendations = [];

    // Success rate recommendations
    if (insights.successRate < 0.7) {
      recommendations.push({
        type: "success_rate",
        priority: "high",
        message: `Template has low success rate (${(
          insights.successRate * 100
        ).toFixed(1)}%). Consider reviewing failed patterns.`,
        failedPatterns: insights.failedPatterns,
      });
    }

    // Performance recommendations
    const slowPatterns = insights.successfulPatterns.filter(
      (p) => p.avgDuration > 5000
    );
    if (slowPatterns.length > 0) {
      recommendations.push({
        type: "performance",
        priority: "medium",
        message: `Some patterns are slow (${slowPatterns.length} patterns > 5s). Consider optimization.`,
        slowPatterns,
      });
    }

    // User preference recommendations
    if (insights.userPreferences) {
      const topPreferences = Object.entries(
        insights.userPreferences.preferredPatterns
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      if (topPreferences.length > 0) {
        recommendations.push({
          type: "user_preferences",
          priority: "low",
          message:
            "Consider emphasizing these successful patterns in template generation.",
          topPreferences,
        });
      }
    }

    return recommendations;
  }

  /**
   * Persist learning data
   */
  async persist() {
    await this.metrics.persist();
  }
}

// Export singleton instance
export const templateLearning = new TemplateLearningManager();
