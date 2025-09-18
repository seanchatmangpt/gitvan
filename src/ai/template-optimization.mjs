/**
 * GitVan Continuous Template Optimization System
 * Continuously improves templates based on execution metrics and user feedback
 */

import { templateLearning } from "./template-learning.mjs";
import { aiPromptEvolution } from "./prompt-evolution.mjs";
import { contextAwareGenerator } from "./context-aware-generation.mjs";
import { generateText } from "./provider.mjs";
import { createLogger } from "../utils/logger.mjs";
import { useGitVan } from "../core/context.mjs";
import { join } from "pathe";
import { promises as fs } from "node:fs";

const logger = createLogger("template-optimization");

/**
 * Template Optimization Engine
 */
export class TemplateOptimizer {
  constructor() {
    this.optimizationHistory = new Map();
    this.optimizationRules = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the optimizer
   */
  async initialize() {
    if (this.isInitialized) return;

    await templateLearning.initialize();
    await aiPromptEvolution.load();
    await this.loadOptimizationRules();
    this.isInitialized = true;
    logger.info("Template optimizer initialized");
  }

  /**
   * Optimize template based on execution metrics
   */
  async optimizeTemplate(templatePath, context = {}) {
    await this.initialize();

    // Get execution metrics
    const metrics = await this.getExecutionMetrics(templatePath);

    // Get user feedback
    const userFeedback = await this.getUserFeedback(templatePath);

    // Get learning insights
    const learningInsights = await templateLearning.getInsights(templatePath);

    // Generate optimization suggestions
    const optimizationSuggestions = await this.generateOptimizationSuggestions(
      templatePath,
      metrics,
      userFeedback,
      learningInsights,
      context
    );

    // Apply optimizations
    const optimizedTemplate = await this.applyOptimizations(
      templatePath,
      optimizationSuggestions,
      context
    );

    // Record optimization
    await this.recordOptimization(
      templatePath,
      optimizationSuggestions,
      context
    );

    return {
      originalTemplate: templatePath,
      optimizedTemplate,
      optimizationSuggestions,
      metrics,
      userFeedback,
      learningInsights,
    };
  }

  /**
   * Get execution metrics for template
   */
  async getExecutionMetrics(templatePath) {
    const insights = await templateLearning.getInsights(templatePath);

    return {
      successRate: insights.successRate,
      totalExecutions: insights.totalExecutions,
      avgDuration: this.calculateAverageDuration(insights),
      errorRate: 1 - insights.successRate,
      userSatisfaction: this.calculateUserSatisfaction(insights),
      performanceScore: this.calculatePerformanceScore(insights),
      reliabilityScore: this.calculateReliabilityScore(insights),
    };
  }

  /**
   * Calculate average execution duration
   */
  calculateAverageDuration(insights) {
    if (insights.successfulPatterns.length === 0) return 0;

    const totalDuration = insights.successfulPatterns.reduce(
      (sum, pattern) => sum + pattern.avgDuration,
      0
    );
    return totalDuration / insights.successfulPatterns.length;
  }

  /**
   * Calculate user satisfaction score
   */
  calculateUserSatisfaction(insights) {
    if (insights.totalExecutions === 0) return 0;

    // Base satisfaction on success rate
    let satisfaction = insights.successRate;

    // Boost satisfaction for high-performing patterns
    if (insights.successfulPatterns.length > 0) {
      const avgPerformance =
        insights.successfulPatterns.reduce((sum, p) => sum + p.avgDuration, 0) /
        insights.successfulPatterns.length;
      if (avgPerformance < 2000) satisfaction += 0.1; // Fast execution
    }

    return Math.min(satisfaction, 1.0);
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore(insights) {
    if (insights.successfulPatterns.length === 0) return 0;

    const avgDuration = this.calculateAverageDuration(insights);
    const performanceScore = Math.max(0, 1 - avgDuration / 10000); // Normalize to 10 seconds

    return performanceScore;
  }

  /**
   * Calculate reliability score
   */
  calculateReliabilityScore(insights) {
    return insights.successRate;
  }

  /**
   * Get user feedback for template
   */
  async getUserFeedback(templatePath) {
    try {
      const ctx = useGitVan();
      const feedbackPath = join(
        ctx.root,
        ".gitvan",
        "feedback",
        `${templatePath.replace(/\//g, "_")}.json`
      );

      const feedback = JSON.parse(await fs.readFile(feedbackPath, "utf8"));
      return feedback;
    } catch (error) {
      logger.warn(`No user feedback found for template ${templatePath}`);
      return {
        ratings: [],
        comments: [],
        suggestions: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate optimization suggestions
   */
  async generateOptimizationSuggestions(
    templatePath,
    metrics,
    userFeedback,
    learningInsights,
    context
  ) {
    const suggestions = [];

    // Performance optimization suggestions
    if (metrics.performanceScore < 0.7) {
      suggestions.push({
        type: "performance",
        priority: "high",
        title: "Improve Template Performance",
        description: "Template execution is slower than optimal",
        currentScore: metrics.performanceScore,
        targetScore: 0.8,
        recommendations: [
          "Optimize template rendering logic",
          "Reduce complex operations in front-matter",
          "Cache frequently used data",
          "Simplify conditional logic",
        ],
        implementation: "Optimize template rendering and reduce complexity",
      });
    }

    // Reliability optimization suggestions
    if (metrics.reliabilityScore < 0.8) {
      suggestions.push({
        type: "reliability",
        priority: "high",
        title: "Improve Template Reliability",
        description: "Template has low success rate",
        currentScore: metrics.reliabilityScore,
        targetScore: 0.9,
        recommendations: [
          "Add better error handling",
          "Validate inputs more thoroughly",
          "Handle edge cases",
          "Improve error messages",
        ],
        implementation: "Add comprehensive error handling and validation",
      });
    }

    // User satisfaction optimization suggestions
    if (metrics.userSatisfaction < 0.7) {
      suggestions.push({
        type: "user_experience",
        priority: "medium",
        title: "Improve User Experience",
        description: "User satisfaction is below optimal",
        currentScore: metrics.userSatisfaction,
        targetScore: 0.8,
        recommendations: [
          "Improve template output quality",
          "Add more helpful error messages",
          "Provide better documentation",
          "Optimize for common use cases",
        ],
        implementation: "Enhance user experience and output quality",
      });
    }

    // Learning-based suggestions
    if (learningInsights.failedPatterns.length > 0) {
      suggestions.push({
        type: "learning",
        priority: "medium",
        title: "Address Failed Patterns",
        description: "Template has known failure patterns",
        currentScore:
          1 -
          learningInsights.failedPatterns.length /
            learningInsights.totalExecutions,
        targetScore: 0.9,
        recommendations: [
          "Avoid patterns that commonly fail",
          "Add fallbacks for failed patterns",
          "Improve error handling for specific cases",
          "Learn from successful alternatives",
        ],
        implementation: "Address known failure patterns and add fallbacks",
      });
    }

    // User feedback-based suggestions
    if (userFeedback.suggestions && userFeedback.suggestions.length > 0) {
      suggestions.push({
        type: "user_feedback",
        priority: "low",
        title: "Implement User Suggestions",
        description: "Users have provided improvement suggestions",
        currentScore: 0.5, // Neutral score for user suggestions
        targetScore: 0.8,
        recommendations: userFeedback.suggestions,
        implementation: "Implement user-requested improvements",
      });
    }

    return suggestions;
  }

  /**
   * Apply optimizations to template
   */
  async applyOptimizations(templatePath, optimizationSuggestions, context) {
    try {
      // Read original template
      const ctx = useGitVan();
      const templateContent = await fs.readFile(
        join(ctx.root, templatePath),
        "utf8"
      );

      // Generate optimized template using AI
      const optimizationPrompt = `
# GitVan Template Optimization

## Original Template
\`\`\`
${templateContent}
\`\`\`

## Optimization Suggestions
${optimizationSuggestions
  .map(
    (s) => `
### ${s.title} (Priority: ${s.priority})
- **Current Score**: ${s.currentScore}
- **Target Score**: ${s.targetScore}
- **Description**: ${s.description}
- **Recommendations**: ${s.recommendations.join(", ")}
- **Implementation**: ${s.implementation}
`
  )
  .join("\n")}

## Optimization Instructions
Based on the suggestions above, optimize the template to:

1. **Improve Performance**: Optimize rendering logic and reduce complexity
2. **Enhance Reliability**: Add better error handling and validation
3. **Improve User Experience**: Enhance output quality and error messages
4. **Address Failed Patterns**: Avoid known failure patterns and add fallbacks
5. **Implement User Suggestions**: Incorporate user-requested improvements

## Requirements
- Maintain the core functionality of the original template
- Keep the same front-matter structure
- Preserve existing template logic
- Add optimizations without breaking changes
- Include comprehensive error handling
- Optimize for performance and reliability

Generate an optimized version of the template:
`;

      const optimizedTemplate = await generateText({
        prompt: optimizationPrompt,
        model: context.model || "qwen3-coder:30b",
        options: {
          temperature: 0.3, // Lower temperature for more consistent optimization
          maxTokens: 4000,
        },
      });

      return optimizedTemplate.trim();
    } catch (error) {
      logger.error("Failed to apply optimizations:", error);
      throw error;
    }
  }

  /**
   * Record optimization for learning
   */
  async recordOptimization(templatePath, optimizationSuggestions, context) {
    const optimizationId = `${templatePath}-${Date.now()}`;

    const optimization = {
      id: optimizationId,
      templatePath,
      timestamp: new Date().toISOString(),
      suggestions: optimizationSuggestions,
      context,
      applied: true,
    };

    this.optimizationHistory.set(optimizationId, optimization);

    // Persist optimization history
    await this.persistOptimizationHistory();

    logger.info(
      `Recorded optimization ${optimizationId} for template ${templatePath}`
    );
  }

  /**
   * Load optimization rules
   */
  async loadOptimizationRules() {
    try {
      const ctx = useGitVan();
      const rulesPath = join(
        ctx.root,
        ".gitvan",
        "ai",
        "optimization-rules.json"
      );

      const rules = JSON.parse(await fs.readFile(rulesPath, "utf8"));
      this.optimizationRules = new Map(Object.entries(rules));

      logger.info("Loaded optimization rules");
    } catch (error) {
      logger.warn("No optimization rules found, using defaults");
      this.loadDefaultOptimizationRules();
    }
  }

  /**
   * Load default optimization rules
   */
  loadDefaultOptimizationRules() {
    this.optimizationRules.set("performance", {
      threshold: 0.7,
      priority: "high",
      actions: ["optimize_rendering", "reduce_complexity", "add_caching"],
    });

    this.optimizationRules.set("reliability", {
      threshold: 0.8,
      priority: "high",
      actions: ["add_error_handling", "validate_inputs", "handle_edge_cases"],
    });

    this.optimizationRules.set("user_experience", {
      threshold: 0.7,
      priority: "medium",
      actions: ["improve_output", "better_errors", "add_documentation"],
    });
  }

  /**
   * Persist optimization history
   */
  async persistOptimizationHistory() {
    try {
      const ctx = useGitVan();
      const historyPath = join(
        ctx.root,
        ".gitvan",
        "ai",
        "optimization-history.json"
      );

      await fs.mkdir(dirname(historyPath), { recursive: true });

      const data = {
        optimizationHistory: Object.fromEntries(this.optimizationHistory),
        optimizationRules: Object.fromEntries(this.optimizationRules),
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeFile(historyPath, JSON.stringify(data, null, 2));
      logger.info("Persisted optimization history");
    } catch (error) {
      logger.error("Failed to persist optimization history:", error);
    }
  }

  /**
   * Get optimization history for template
   */
  getOptimizationHistory(templatePath) {
    return Array.from(this.optimizationHistory.values())
      .filter((o) => o.templatePath === templatePath)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(templatePath) {
    const metrics = await this.getExecutionMetrics(templatePath);
    const userFeedback = await this.getUserFeedback(templatePath);
    const learningInsights = await templateLearning.getInsights(templatePath);

    return await this.generateOptimizationSuggestions(
      templatePath,
      metrics,
      userFeedback,
      learningInsights
    );
  }
}

// Export singleton instance
export const templateOptimizer = new TemplateOptimizer();


