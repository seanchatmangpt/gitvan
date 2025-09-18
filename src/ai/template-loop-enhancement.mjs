/**
 * GitVan AI Template Loop Enhancement - Main Integration Module
 * Integrates all AI and template learning components for a tight feedback loop
 */

import { templateLearning } from "./template-learning.mjs";
import { aiPromptEvolution } from "./prompt-evolution.mjs";
import { contextAwareGenerator } from "./context-aware-generation.mjs";
import { templateOptimizer } from "./template-optimization.mjs";
import { feedbackIntegration } from "./user-feedback-integration.mjs";
import { createLogger } from "../utils/logger.mjs";
import { useGitVan } from "../core/context.mjs";
import { join } from "pathe";
import { promises as fs } from "node:fs";

const logger = createLogger("ai-template-loop");

/**
 * AI Template Loop Enhancement System
 * Main orchestrator for the tight feedback loop between LLMs and front-matter templates
 */
export class AITemplateLoopEnhancement {
  constructor() {
    this.isInitialized = false;
    this.executionHistory = new Map();
    this.learningMetrics = new Map();
  }

  /**
   * Initialize the complete AI template loop system
   */
  async initialize() {
    if (this.isInitialized) return;

    logger.info("Initializing AI Template Loop Enhancement System...");

    // Initialize all subsystems
    await templateLearning.initialize();
    await aiPromptEvolution.load();
    await contextAwareGenerator.initialize();
    await templateOptimizer.initialize();
    await feedbackIntegration.initialize();

    this.isInitialized = true;
    logger.info("AI Template Loop Enhancement System initialized successfully");
  }

  /**
   * Generate template with full AI loop integration
   */
  async generateTemplate(prompt, context = {}) {
    await this.initialize();

    const generationId = `gen-${Date.now()}`;
    const startTime = Date.now();

    try {
      logger.info(`Starting AI template generation: ${generationId}`);

      // 1. Analyze project context
      const projectContext =
        await contextAwareGenerator.contextAnalyzer.analyzeProjectContext(
          context.rootPath || process.cwd()
        );

      // 2. Get learning insights
      const learningInsights = await templateLearning.getInsights("global");

      // 3. Generate context-aware template
      const template = await contextAwareGenerator.generateTemplate(prompt, {
        ...context,
        projectContext,
      });

      // 4. Record generation for learning
      const executionResult = {
        ok: true,
        duration: Date.now() - startTime,
        artifacts: [template],
        errors: [],
      };

      await templateLearning.recordExecution(
        "ai-template-generation",
        executionResult,
        {
          projectType: projectContext.projectType,
          framework: projectContext.framework,
          userAgent: context.userAgent || "ai-template-loop",
          prompt: prompt.substring(0, 100),
        }
      );

      // 5. Store execution history
      this.executionHistory.set(generationId, {
        id: generationId,
        prompt,
        template,
        projectContext,
        learningInsights,
        executionResult,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Completed AI template generation: ${generationId}`);
      return {
        generationId,
        template,
        projectContext,
        learningInsights,
        executionResult,
      };
    } catch (error) {
      logger.error(`Failed AI template generation: ${generationId}`, error);

      // Record failure for learning
      const executionResult = {
        ok: false,
        duration: Date.now() - startTime,
        artifacts: [],
        errors: [{ type: "generation_error", message: error.message }],
      };

      await templateLearning.recordExecution(
        "ai-template-generation",
        executionResult,
        {
          projectType: context.projectType || "unknown",
          framework: context.framework || "unknown",
          userAgent: context.userAgent || "ai-template-loop",
          prompt: prompt.substring(0, 100),
        }
      );

      throw error;
    }
  }

  /**
   * Optimize template based on execution feedback
   */
  async optimizeTemplate(templatePath, context = {}) {
    await this.initialize();

    logger.info(`Starting template optimization: ${templatePath}`);

    try {
      // 1. Get optimization recommendations
      const optimizationResult = await templateOptimizer.optimizeTemplate(
        templatePath,
        context
      );

      // 2. Get feedback insights
      const feedbackInsights = await feedbackIntegration.getFeedbackInsights(
        templatePath
      );

      // 3. Integrate feedback into optimization
      const integratedOptimization =
        await feedbackIntegration.integrateFeedback(templatePath, context);

      logger.info(`Completed template optimization: ${templatePath}`);
      return {
        templatePath,
        optimizationResult,
        feedbackInsights,
        integratedOptimization,
      };
    } catch (error) {
      logger.error(`Failed template optimization: ${templatePath}`, error);
      throw error;
    }
  }

  /**
   * Evolve AI prompts based on template execution results
   */
  async evolvePrompts(templatePath, executionResult, context = {}) {
    await this.initialize();

    logger.info(`Starting prompt evolution: ${templatePath}`);

    try {
      // 1. Evolve prompts based on execution results
      const evolvedPrompt = await aiPromptEvolution.evolvePrompt(
        "template_generation",
        templatePath,
        executionResult,
        context
      );

      // 2. Get learning insights for context
      const learningInsights = await templateLearning.getInsights(templatePath);

      // 3. Get evolution history
      const evolutionHistory =
        aiPromptEvolution.getEvolutionHistory(templatePath);

      logger.info(`Completed prompt evolution: ${templatePath}`);
      return {
        templatePath,
        evolvedPrompt,
        learningInsights,
        evolutionHistory,
      };
    } catch (error) {
      logger.error(`Failed prompt evolution: ${templatePath}`, error);
      throw error;
    }
  }

  /**
   * Collect and integrate user feedback
   */
  async collectFeedback(templatePath, feedbackData, context = {}) {
    await this.initialize();

    logger.info(`Collecting user feedback: ${templatePath}`);

    try {
      // 1. Collect feedback
      const feedbackId =
        await feedbackIntegration.feedbackManager.collectFeedback(
          templatePath,
          feedbackData,
          context
        );

      // 2. Get feedback summary
      const feedbackSummary =
        await feedbackIntegration.feedbackManager.getFeedbackSummary(
          templatePath
        );

      // 3. Get recommendations
      const recommendations =
        await feedbackIntegration.feedbackManager.getFeedbackRecommendations(
          templatePath
        );

      // 4. Trigger learning updates
      await feedbackIntegration.feedbackManager.triggerLearningUpdates({
        templatePath,
        rating: feedbackData.rating,
        comment: feedbackData.comment,
        suggestions: feedbackData.suggestions,
        issues: feedbackData.issues,
        context,
      });

      logger.info(`Completed feedback collection: ${templatePath}`);
      return {
        feedbackId,
        feedbackSummary,
        recommendations,
      };
    } catch (error) {
      logger.error(`Failed feedback collection: ${templatePath}`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive insights for template
   */
  async getTemplateInsights(templatePath) {
    await this.initialize();

    try {
      // Get insights from all subsystems
      const learningInsights = await templateLearning.getInsights(templatePath);
      const feedbackInsights = await feedbackIntegration.getFeedbackInsights(
        templatePath
      );
      const optimizationRecommendations =
        await templateOptimizer.getOptimizationRecommendations(templatePath);
      const evolutionHistory =
        aiPromptEvolution.getEvolutionHistory(templatePath);

      return {
        templatePath,
        learningInsights,
        feedbackInsights,
        optimizationRecommendations,
        evolutionHistory,
        overallHealth: this.calculateOverallHealth(
          learningInsights,
          feedbackInsights
        ),
      };
    } catch (error) {
      logger.error(`Failed to get template insights: ${templatePath}`, error);
      throw error;
    }
  }

  /**
   * Calculate overall template health score
   */
  calculateOverallHealth(learningInsights, feedbackInsights) {
    const learningScore = learningInsights.successRate;
    const feedbackScore = feedbackInsights.feedbackSummary.averageRating / 5;
    const optimizationScore = feedbackInsights.overallScore;

    // Weighted average: 40% learning, 30% feedback, 30% optimization
    return learningScore * 0.4 + feedbackScore * 0.3 + optimizationScore * 0.3;
  }

  /**
   * Get system-wide metrics and insights
   */
  async getSystemMetrics() {
    await this.initialize();

    try {
      const globalInsights = await templateLearning.getInsights("global");
      const globalSuccessPatterns =
        aiPromptEvolution.getGlobalSuccessPatterns();
      const globalFailurePatterns =
        aiPromptEvolution.getGlobalFailurePatterns();

      return {
        globalInsights,
        globalSuccessPatterns,
        globalFailurePatterns,
        totalExecutions: Array.from(this.executionHistory.values()).length,
        systemHealth: this.calculateSystemHealth(globalInsights),
      };
    } catch (error) {
      logger.error("Failed to get system metrics:", error);
      throw error;
    }
  }

  /**
   * Calculate system health score
   */
  calculateSystemHealth(globalInsights) {
    const successRate = globalInsights.successRate;
    const totalExecutions = globalInsights.totalExecutions;

    // Base health on success rate, with bonus for high execution count
    let health = successRate;

    if (totalExecutions > 100) health += 0.1;
    if (totalExecutions > 500) health += 0.1;

    return Math.min(health, 1.0);
  }

  /**
   * Persist all learning data
   */
  async persist() {
    await this.initialize();

    try {
      await templateLearning.persist();
      await aiPromptEvolution.persist();
      await templateOptimizer.persistOptimizationHistory();
      await feedbackIntegration.feedbackManager.persistFeedback();

      logger.info("Persisted all AI template loop learning data");
    } catch (error) {
      logger.error("Failed to persist learning data:", error);
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory() {
    return Array.from(this.executionHistory.values()).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory() {
    this.executionHistory.clear();
    logger.info("Cleared execution history");
  }
}

// Export singleton instance
export const aiTemplateLoop = new AITemplateLoopEnhancement();

/**
 * Convenience functions for easy integration
 */
export const generateTemplateWithAI = (prompt, context) =>
  aiTemplateLoop.generateTemplate(prompt, context);
export const optimizeTemplateWithAI = (templatePath, context) =>
  aiTemplateLoop.optimizeTemplate(templatePath, context);
export const evolvePromptsWithAI = (templatePath, executionResult, context) =>
  aiTemplateLoop.evolvePrompts(templatePath, executionResult, context);
export const collectFeedbackWithAI = (templatePath, feedbackData, context) =>
  aiTemplateLoop.collectFeedback(templatePath, feedbackData, context);
export const getTemplateInsights = (templatePath) =>
  aiTemplateLoop.getTemplateInsights(templatePath);
export const getSystemMetrics = () => aiTemplateLoop.getSystemMetrics();
