/**
 * GitVan AI Template Loop CLI Commands
 * CLI interface for the AI template loop enhancement system
 */

import { aiTemplateLoop } from "../ai/template-loop-enhancement.mjs";
import { createLogger } from "../utils/logger.mjs";
import { useGitVan } from "../core/context.mjs";
import { join } from "pathe";
import { promises as fs } from "node:fs";

const logger = createLogger("ai-template-cli");

/**
 * Generate template with AI loop integration
 */
export async function generateTemplateCommand(args) {
  try {
    const prompt = args.prompt || args.arg0;
    if (!prompt) {
      throw new Error("Prompt required for template generation");
    }

    logger.info("🤖 Generating template with AI loop integration...");

    const result = await aiTemplateLoop.generateTemplate(prompt, {
      rootPath: process.cwd(),
      userAgent: "cli",
      model: args.model,
      temperature: args.temp ? parseFloat(args.temp) : 0.7,
    });

    logger.info("✅ Template generated successfully!");
    logger.info(`📊 Generation ID: ${result.generationId}`);
    logger.info(`⏱️  Duration: ${result.executionResult.duration}ms`);
    logger.info(`🎯 Project Type: ${result.projectContext.projectType}`);
    logger.info(`🔧 Framework: ${result.projectContext.framework}`);
    logger.info(
      `📈 Success Rate: ${(result.learningInsights.successRate * 100).toFixed(
        1
      )}%`
    );

    // Save template to file if requested
    if (args.output) {
      await fs.writeFile(args.output, result.template);
      logger.info(`💾 Template saved to: ${args.output}`);
    } else {
      logger.info("\n📝 Generated Template:");
      logger.info("─".repeat(50));
      logger.info(result.template);
    }

    return result;
  } catch (error) {
    logger.error("❌ Failed to generate template:", error.message);
    throw error;
  }
}

/**
 * Optimize template with AI loop integration
 */
export async function optimizeTemplateCommand(args) {
  try {
    const templatePath = args.template || args.arg0;
    if (!templatePath) {
      throw new Error("Template path required for optimization");
    }

    logger.info(`🔧 Optimizing template: ${templatePath}`);

    const result = await aiTemplateLoop.optimizeTemplate(templatePath, {
      rootPath: process.cwd(),
      userAgent: "cli",
    });

    logger.info("✅ Template optimized successfully!");
    logger.info(
      `📊 Optimization Suggestions: ${result.optimizationResult.optimizationSuggestions.length}`
    );
    logger.info(
      `📈 Feedback Score: ${result.feedbackInsights.overallScore.toFixed(2)}`
    );
    logger.info(
      `🎯 Overall Health: ${result.feedbackInsights.overallScore.toFixed(2)}`
    );

    // Save optimized template if requested
    if (args.output) {
      await fs.writeFile(
        args.output,
        result.integratedOptimization.integratedTemplate
      );
      logger.info(`💾 Optimized template saved to: ${args.output}`);
    } else {
      logger.info("\n📝 Optimized Template:");
      logger.info("─".repeat(50));
      logger.info(result.integratedOptimization.integratedTemplate);
    }

    return result;
  } catch (error) {
    logger.error("❌ Failed to optimize template:", error.message);
    throw error;
  }
}

/**
 * Collect user feedback for template
 */
export async function collectFeedbackCommand(args) {
  try {
    const templatePath = args.template || args.arg0;
    if (!templatePath) {
      throw new Error("Template path required for feedback collection");
    }

    const rating = args.rating ? parseInt(args.rating) : null;
    const comment = args.comment || "";
    const suggestions = args.suggestions
      ? args.suggestions.split(",").map((s) => s.trim())
      : [];
    const issues = args.issues
      ? args.issues.split(",").map((s) => s.trim())
      : [];

    if (rating === null) {
      throw new Error("Rating required for feedback collection");
    }

    logger.info(`📝 Collecting feedback for template: ${templatePath}`);

    const result = await aiTemplateLoop.collectFeedback(
      templatePath,
      {
        rating,
        comment,
        suggestions,
        issues,
      },
      {
        rootPath: process.cwd(),
        userAgent: "cli",
      }
    );

    logger.info("✅ Feedback collected successfully!");
    logger.info(`📊 Feedback ID: ${result.feedbackId}`);
    logger.info(
      `⭐ Average Rating: ${result.feedbackSummary.averageRating.toFixed(1)}/5`
    );
    logger.info(`📝 Total Feedback: ${result.feedbackSummary.totalFeedback}`);
    logger.info(
      `💡 Common Suggestions: ${result.feedbackSummary.commonSuggestions.length}`
    );
    logger.info(
      `🐛 Common Issues: ${result.feedbackSummary.commonIssues.length}`
    );

    if (result.recommendations.length > 0) {
      logger.info("\n🎯 Recommendations:");
      result.recommendations.forEach((rec) => {
        logger.info(`  - ${rec.message} (Priority: ${rec.priority})`);
      });
    }

    return result;
  } catch (error) {
    logger.error("❌ Failed to collect feedback:", error.message);
    throw error;
  }
}

/**
 * Get template insights
 */
export async function getInsightsCommand(args) {
  try {
    const templatePath = args.template || args.arg0;
    if (!templatePath) {
      throw new Error("Template path required for insights");
    }

    logger.info(`📊 Getting insights for template: ${templatePath}`);

    const result = await aiTemplateLoop.getTemplateInsights(templatePath);

    logger.info("✅ Template insights retrieved successfully!");
    logger.info(`📈 Overall Health: ${result.overallHealth.toFixed(2)}`);
    logger.info(
      `🎯 Success Rate: ${(result.learningInsights.successRate * 100).toFixed(
        1
      )}%`
    );
    logger.info(
      `📝 Total Executions: ${result.learningInsights.totalExecutions}`
    );
    logger.info(
      `⭐ Average Rating: ${result.feedbackInsights.feedbackSummary.averageRating.toFixed(
        1
      )}/5`
    );
    logger.info(
      `💡 Total Feedback: ${result.feedbackInsights.feedbackSummary.totalFeedback}`
    );

    // Show successful patterns
    if (result.learningInsights.successfulPatterns.length > 0) {
      logger.info("\n✅ Successful Patterns:");
      result.learningInsights.successfulPatterns
        .slice(0, 5)
        .forEach((pattern) => {
          logger.info(
            `  - ${pattern.pattern} (${pattern.successCount} successes)`
          );
        });
    }

    // Show failed patterns
    if (result.learningInsights.failedPatterns.length > 0) {
      logger.info("\n❌ Failed Patterns:");
      result.learningInsights.failedPatterns.slice(0, 5).forEach((pattern) => {
        logger.info(
          `  - ${pattern.pattern} (${pattern.failureCount} failures)`
        );
      });
    }

    // Show optimization recommendations
    if (result.optimizationRecommendations.length > 0) {
      logger.info("\n🔧 Optimization Recommendations:");
      result.optimizationRecommendations.forEach((rec) => {
        logger.info(`  - ${rec.title} (Priority: ${rec.priority})`);
        logger.info(`    ${rec.description}`);
      });
    }

    return result;
  } catch (error) {
    logger.error("❌ Failed to get template insights:", error.message);
    throw error;
  }
}

/**
 * Get system metrics
 */
export async function getSystemMetricsCommand(args) {
  try {
    logger.info("📊 Getting system metrics...");

    const result = await aiTemplateLoop.getSystemMetrics();

    logger.info("✅ System metrics retrieved successfully!");
    logger.info(`🎯 System Health: ${result.systemHealth.toFixed(2)}`);
    logger.info(
      `📈 Global Success Rate: ${(
        result.globalInsights.successRate * 100
      ).toFixed(1)}%`
    );
    logger.info(
      `📝 Total Executions: ${result.globalInsights.totalExecutions}`
    );
    logger.info(`🔄 Total Generations: ${result.totalExecutions}`);

    // Show global success patterns
    if (result.globalSuccessPatterns.length > 0) {
      logger.info("\n✅ Global Success Patterns:");
      result.globalSuccessPatterns.slice(0, 10).forEach((pattern) => {
        logger.info(
          `  - ${pattern.pattern} (${pattern.successCount} successes)`
        );
      });
    }

    // Show global failure patterns
    if (result.globalFailurePatterns.length > 0) {
      logger.info("\n❌ Global Failure Patterns:");
      result.globalFailurePatterns.slice(0, 10).forEach((pattern) => {
        logger.info(
          `  - ${pattern.pattern} (${pattern.failureCount} failures)`
        );
      });
    }

    return result;
  } catch (error) {
    logger.error("❌ Failed to get system metrics:", error.message);
    throw error;
  }
}

/**
 * Persist learning data
 */
export async function persistLearningDataCommand(args) {
  try {
    logger.info("💾 Persisting learning data...");

    await aiTemplateLoop.persist();

    logger.info("✅ Learning data persisted successfully!");
  } catch (error) {
    logger.error("❌ Failed to persist learning data:", error.message);
    throw error;
  }
}

/**
 * Show execution history
 */
export async function showHistoryCommand(args) {
  try {
    const history = aiTemplateLoop.getExecutionHistory();
    const limit = args.limit ? parseInt(args.limit) : 10;

    logger.info(`📜 Showing last ${limit} executions:`);

    if (history.length === 0) {
      logger.info("No execution history found.");
      return;
    }

    history.slice(0, limit).forEach((execution, index) => {
      logger.info(`\n${index + 1}. ${execution.id}`);
      logger.info(`   Prompt: ${execution.prompt.substring(0, 50)}...`);
      logger.info(
        `   Project: ${execution.projectContext.projectType} (${execution.projectContext.framework})`
      );
      logger.info(`   Duration: ${execution.executionResult.duration}ms`);
      logger.info(`   Success: ${execution.executionResult.ok ? "✅" : "❌"}`);
      logger.info(`   Timestamp: ${execution.timestamp}`);
    });
  } catch (error) {
    logger.error("❌ Failed to show execution history:", error.message);
    throw error;
  }
}

/**
 * Clear execution history
 */
export async function clearHistoryCommand(args) {
  try {
    logger.info("🗑️  Clearing execution history...");

    aiTemplateLoop.clearExecutionHistory();

    logger.info("✅ Execution history cleared successfully!");
  } catch (error) {
    logger.error("❌ Failed to clear execution history:", error.message);
    throw error;
  }
}





