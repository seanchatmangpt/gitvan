/**
 * GitVan User Feedback Integration System
 * Collects and integrates user feedback to improve template generation
 */

import { templateLearning } from "./template-learning.mjs";
import { aiPromptEvolution } from "./prompt-evolution.mjs";
import { contextAwareGenerator } from "./context-aware-generation.mjs";
import { templateOptimizer } from "./template-optimization.mjs";
import { createLogger } from "../utils/logger.mjs";
import { useGitVan } from "../core/context.mjs";
import { join } from "pathe";
import { promises as fs } from "node:fs";

const logger = createLogger("user-feedback");

/**
 * User Feedback Manager
 */
export class UserFeedbackManager {
  constructor() {
    this.feedback = new Map();
    this.preferences = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the feedback system
   */
  async initialize() {
    if (this.isInitialized) return;

    await templateLearning.initialize();
    await this.loadFeedback();
    await this.loadPreferences();
    this.isInitialized = true;
    logger.info("User feedback system initialized");
  }

  /**
   * Collect user feedback for template
   */
  async collectFeedback(templatePath, feedbackData, context = {}) {
    await this.initialize();

    const feedbackId = `${templatePath}-${Date.now()}`;

    const feedback = {
      id: feedbackId,
      templatePath,
      timestamp: new Date().toISOString(),
      rating: feedbackData.rating || 0,
      comment: feedbackData.comment || "",
      suggestions: feedbackData.suggestions || [],
      issues: feedbackData.issues || [],
      improvements: feedbackData.improvements || [],
      context: {
        userAgent: context.userAgent || "unknown",
        projectType: context.projectType || "unknown",
        framework: context.framework || "unknown",
        ...context,
      },
    };

    // Store feedback
    this.feedback.set(feedbackId, feedback);

    // Update user preferences
    await this.updateUserPreferences(feedback);

    // Trigger learning updates
    await this.triggerLearningUpdates(feedback);

    // Persist feedback
    await this.persistFeedback();

    logger.info(
      `Collected feedback ${feedbackId} for template ${templatePath}`
    );
    return feedbackId;
  }

  /**
   * Update user preferences based on feedback
   */
  async updateUserPreferences(feedback) {
    const templatePath = feedback.templatePath;

    if (!this.preferences.has(templatePath)) {
      this.preferences.set(templatePath, {
        templatePath,
        totalRatings: 0,
        averageRating: 0,
        commonSuggestions: new Map(),
        commonIssues: new Map(),
        userPatterns: new Map(),
        lastUpdated: new Date().toISOString(),
      });
    }

    const preferences = this.preferences.get(templatePath);

    // Update rating statistics
    preferences.totalRatings++;
    preferences.averageRating =
      (preferences.averageRating * (preferences.totalRatings - 1) +
        feedback.rating) /
      preferences.totalRatings;

    // Track common suggestions
    feedback.suggestions.forEach((suggestion) => {
      const key = suggestion.toLowerCase();
      preferences.commonSuggestions.set(
        key,
        (preferences.commonSuggestions.get(key) || 0) + 1
      );
    });

    // Track common issues
    feedback.issues.forEach((issue) => {
      const key = issue.toLowerCase();
      preferences.commonIssues.set(
        key,
        (preferences.commonIssues.get(key) || 0) + 1
      );
    });

    // Track user patterns
    const contextKey = `${feedback.context.projectType}-${feedback.context.framework}`;
    preferences.userPatterns.set(
      contextKey,
      (preferences.userPatterns.get(contextKey) || 0) + 1
    );

    preferences.lastUpdated = new Date().toISOString();
    this.preferences.set(templatePath, preferences);
  }

  /**
   * Trigger learning updates based on feedback
   */
  async triggerLearningUpdates(feedback) {
    try {
      // Record feedback as execution result for learning
      const executionResult = {
        ok: feedback.rating >= 3, // Consider rating >= 3 as success
        duration: 0,
        artifacts: [],
        errors:
          feedback.rating < 3
            ? [{ type: "user_feedback", message: feedback.comment }]
            : [],
      };

      await templateLearning.recordExecution(
        feedback.templatePath,
        executionResult,
        feedback.context
      );

      // Trigger prompt evolution if needed
      if (feedback.rating < 3) {
        await aiPromptEvolution.evolvePrompt(
          "template_generation",
          feedback.templatePath,
          executionResult,
          feedback.context
        );
      }

      logger.info(
        `Triggered learning updates for template ${feedback.templatePath}`
      );
    } catch (error) {
      logger.error("Failed to trigger learning updates:", error);
    }
  }

  /**
   * Get feedback summary for template
   */
  async getFeedbackSummary(templatePath) {
    await this.initialize();

    const templateFeedback = Array.from(this.feedback.values()).filter(
      (f) => f.templatePath === templatePath
    );

    if (templateFeedback.length === 0) {
      return {
        templatePath,
        totalFeedback: 0,
        averageRating: 0,
        commonSuggestions: [],
        commonIssues: [],
        recentFeedback: [],
      };
    }

    const averageRating =
      templateFeedback.reduce((sum, f) => sum + f.rating, 0) /
      templateFeedback.length;

    // Get common suggestions
    const suggestionCounts = new Map();
    templateFeedback.forEach((f) => {
      f.suggestions.forEach((suggestion) => {
        const key = suggestion.toLowerCase();
        suggestionCounts.set(key, (suggestionCounts.get(key) || 0) + 1);
      });
    });

    // Get common issues
    const issueCounts = new Map();
    templateFeedback.forEach((f) => {
      f.issues.forEach((issue) => {
        const key = issue.toLowerCase();
        issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
      });
    });

    return {
      templatePath,
      totalFeedback: templateFeedback.length,
      averageRating,
      commonSuggestions: Array.from(suggestionCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([suggestion, count]) => ({ suggestion, count })),
      commonIssues: Array.from(issueCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([issue, count]) => ({ issue, count })),
      recentFeedback: templateFeedback
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10),
    };
  }

  /**
   * Get user preferences for template
   */
  getUserPreferences(templatePath) {
    return this.preferences.get(templatePath);
  }

  /**
   * Get feedback recommendations
   */
  async getFeedbackRecommendations(templatePath) {
    const summary = await this.getFeedbackSummary(templatePath);
    const preferences = this.getUserPreferences(templatePath);

    const recommendations = [];

    // Rating-based recommendations
    if (summary.averageRating < 3) {
      recommendations.push({
        type: "rating",
        priority: "high",
        message: `Template has low average rating (${summary.averageRating.toFixed(
          1
        )}/5). Consider addressing common issues.`,
        commonIssues: summary.commonIssues,
      });
    }

    // Suggestion-based recommendations
    if (summary.commonSuggestions.length > 0) {
      recommendations.push({
        type: "suggestions",
        priority: "medium",
        message: "Users have provided suggestions for improvement.",
        commonSuggestions: summary.commonSuggestions,
      });
    }

    // Issue-based recommendations
    if (summary.commonIssues.length > 0) {
      recommendations.push({
        type: "issues",
        priority: "high",
        message:
          "Common issues have been reported. Address these to improve user experience.",
        commonIssues: summary.commonIssues,
      });
    }

    return recommendations;
  }

  /**
   * Persist feedback data
   */
  async persistFeedback() {
    try {
      const ctx = useGitVan();
      const feedbackPath = join(
        ctx.root,
        ".gitvan",
        "feedback",
        "user-feedback.json"
      );

      await fs.mkdir(dirname(feedbackPath), { recursive: true });

      const data = {
        feedback: Object.fromEntries(this.feedback),
        preferences: Object.fromEntries(this.preferences),
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeFile(feedbackPath, JSON.stringify(data, null, 2));
      logger.info("Persisted user feedback data");
    } catch (error) {
      logger.error("Failed to persist user feedback data:", error);
    }
  }

  /**
   * Load feedback data
   */
  async loadFeedback() {
    try {
      const ctx = useGitVan();
      const feedbackPath = join(
        ctx.root,
        ".gitvan",
        "feedback",
        "user-feedback.json"
      );

      const data = JSON.parse(await fs.readFile(feedbackPath, "utf8"));

      this.feedback = new Map(Object.entries(data.feedback || {}));
      this.preferences = new Map(Object.entries(data.preferences || {}));

      logger.info("Loaded user feedback data");
    } catch (error) {
      logger.warn("No existing user feedback data found, starting fresh");
    }
  }

  /**
   * Load user preferences
   */
  async loadPreferences() {
    try {
      const ctx = useGitVan();
      const preferencesPath = join(
        ctx.root,
        ".gitvan",
        "preferences",
        "user-preferences.json"
      );

      const data = JSON.parse(await fs.readFile(preferencesPath, "utf8"));

      this.preferences = new Map(Object.entries(data.preferences || {}));

      logger.info("Loaded user preferences");
    } catch (error) {
      logger.warn("No existing user preferences found, starting fresh");
    }
  }
}

/**
 * Feedback Integration System
 */
export class FeedbackIntegrationSystem {
  constructor() {
    this.feedbackManager = new UserFeedbackManager();
    this.isInitialized = false;
  }

  /**
   * Initialize the integration system
   */
  async initialize() {
    if (this.isInitialized) return;

    await this.feedbackManager.initialize();
    await templateLearning.initialize();
    await aiPromptEvolution.load();
    this.isInitialized = true;
    logger.info("Feedback integration system initialized");
  }

  /**
   * Integrate feedback into template generation
   */
  async integrateFeedback(templatePath, context = {}) {
    await this.initialize();

    // Get feedback summary
    const feedbackSummary = await this.feedbackManager.getFeedbackSummary(
      templatePath
    );

    // Get user preferences
    const userPreferences =
      this.feedbackManager.getUserPreferences(templatePath);

    // Get learning insights
    const learningInsights = await templateLearning.getInsights(templatePath);

    // Get optimization recommendations
    const optimizationRecommendations =
      await templateOptimizer.getOptimizationRecommendations(templatePath);

    // Generate feedback-integrated template
    const integratedTemplate = await this.generateFeedbackIntegratedTemplate(
      templatePath,
      feedbackSummary,
      userPreferences,
      learningInsights,
      optimizationRecommendations,
      context
    );

    return {
      templatePath,
      integratedTemplate,
      feedbackSummary,
      userPreferences,
      learningInsights,
      optimizationRecommendations,
    };
  }

  /**
   * Generate feedback-integrated template
   */
  async generateFeedbackIntegratedTemplate(
    templatePath,
    feedbackSummary,
    userPreferences,
    learningInsights,
    optimizationRecommendations,
    context
  ) {
    const integrationPrompt = `
# GitVan Feedback-Integrated Template Generation

## Template Path
${templatePath}

## Feedback Summary
- **Total Feedback**: ${feedbackSummary.totalFeedback}
- **Average Rating**: ${feedbackSummary.averageRating.toFixed(1)}/5
- **Common Suggestions**: ${feedbackSummary.commonSuggestions
      .map((s) => s.suggestion)
      .join(", ")}
- **Common Issues**: ${feedbackSummary.commonIssues
      .map((i) => i.issue)
      .join(", ")}

## User Preferences
${
  userPreferences
    ? `
- **Total Ratings**: ${userPreferences.totalRatings}
- **Average Rating**: ${userPreferences.averageRating.toFixed(1)}/5
- **Common Suggestions**: ${Object.keys(userPreferences.commonSuggestions).join(
        ", "
      )}
- **Common Issues**: ${Object.keys(userPreferences.commonIssues).join(", ")}
`
    : "No user preferences available"
}

## Learning Insights
- **Success Rate**: ${(learningInsights.successRate * 100).toFixed(1)}%
- **Total Executions**: ${learningInsights.totalExecutions}
- **Successful Patterns**: ${learningInsights.successfulPatterns
      .map((p) => p.pattern)
      .join(", ")}
- **Failed Patterns**: ${learningInsights.failedPatterns
      .map((p) => p.pattern)
      .join(", ")}

## Optimization Recommendations
${optimizationRecommendations
  .map(
    (r) => `
- **${r.title}** (Priority: ${r.priority})
  - Description: ${r.description}
  - Recommendations: ${r.recommendations.join(", ")}
`
  )
  .join("\n")}

## Integration Instructions
Based on the feedback and insights above, generate a template that:

1. **Addresses Common Issues**: Incorporate solutions for reported issues
2. **Implements User Suggestions**: Include user-requested improvements
3. **Leverages Success Patterns**: Use patterns that have high success rates
4. **Avoids Failed Patterns**: Exclude patterns that commonly fail
5. **Optimizes for User Experience**: Focus on aspects that improve ratings
6. **Includes Feedback Context**: Add front-matter that tracks feedback integration

## Requirements
- Include comprehensive YAML front-matter with feedback context
- Address common issues and implement user suggestions
- Use successful patterns and avoid failed patterns
- Optimize for user experience and satisfaction
- Include feedback tracking and learning context
- Maintain backward compatibility

Generate a feedback-integrated template:
`;

    try {
      const integratedTemplate = await generateText({
        prompt: integrationPrompt,
        model: context.model || "qwen3-coder:30b",
        options: {
          temperature: 0.5,
          maxTokens: 4000,
        },
      });

      return integratedTemplate.trim();
    } catch (error) {
      logger.error("Failed to generate feedback-integrated template:", error);
      throw error;
    }
  }

  /**
   * Get feedback insights for template
   */
  async getFeedbackInsights(templatePath) {
    await this.initialize();

    const feedbackSummary = await this.feedbackManager.getFeedbackSummary(
      templatePath
    );
    const userPreferences =
      this.feedbackManager.getUserPreferences(templatePath);
    const learningInsights = await templateLearning.getInsights(templatePath);
    const optimizationRecommendations =
      await templateOptimizer.getOptimizationRecommendations(templatePath);

    return {
      templatePath,
      feedbackSummary,
      userPreferences,
      learningInsights,
      optimizationRecommendations,
      overallScore: this.calculateOverallScore(
        feedbackSummary,
        learningInsights
      ),
    };
  }

  /**
   * Calculate overall score based on feedback and learning
   */
  calculateOverallScore(feedbackSummary, learningInsights) {
    const feedbackScore = feedbackSummary.averageRating / 5; // Normalize to 0-1
    const learningScore = learningInsights.successRate;

    // Weighted average: 60% feedback, 40% learning
    return feedbackScore * 0.6 + learningScore * 0.4;
  }
}

// Export singleton instances
export const userFeedbackManager = new UserFeedbackManager();
export const feedbackIntegration = new FeedbackIntegrationSystem();



