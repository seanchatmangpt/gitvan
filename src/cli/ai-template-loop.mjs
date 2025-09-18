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

    console.log("🤖 Generating template with AI loop integration...");

    const result = await aiTemplateLoop.generateTemplate(prompt, {
      rootPath: process.cwd(),
      userAgent: "cli",
      model: args.model,
      temperature: args.temp ? parseFloat(args.temp) : 0.7,
    });

    console.log("✅ Template generated successfully!");
    console.log(`📊 Generation ID: ${result.generationId}`);
    console.log(`⏱️  Duration: ${result.executionResult.duration}ms`);
    console.log(`🎯 Project Type: ${result.projectContext.projectType}`);
    console.log(`🔧 Framework: ${result.projectContext.framework}`);
    console.log(
      `📈 Success Rate: ${(result.learningInsights.successRate * 100).toFixed(
        1
      )}%`
    );

    // Save template to file if requested
    if (args.output) {
      await fs.writeFile(args.output, result.template);
      console.log(`💾 Template saved to: ${args.output}`);
    } else {
      console.log("\n📝 Generated Template:");
      console.log("─".repeat(50));
      console.log(result.template);
    }

    return result;
  } catch (error) {
    console.error("❌ Failed to generate template:", error.message);
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

    console.log(`🔧 Optimizing template: ${templatePath}`);

    const result = await aiTemplateLoop.optimizeTemplate(templatePath, {
      rootPath: process.cwd(),
      userAgent: "cli",
    });

    console.log("✅ Template optimized successfully!");
    console.log(
      `📊 Optimization Suggestions: ${result.optimizationResult.optimizationSuggestions.length}`
    );
    console.log(
      `📈 Feedback Score: ${result.feedbackInsights.overallScore.toFixed(2)}`
    );
    console.log(
      `🎯 Overall Health: ${result.feedbackInsights.overallScore.toFixed(2)}`
    );

    // Save optimized template if requested
    if (args.output) {
      await fs.writeFile(
        args.output,
        result.integratedOptimization.integratedTemplate
      );
      console.log(`💾 Optimized template saved to: ${args.output}`);
    } else {
      console.log("\n📝 Optimized Template:");
      console.log("─".repeat(50));
      console.log(result.integratedOptimization.integratedTemplate);
    }

    return result;
  } catch (error) {
    console.error("❌ Failed to optimize template:", error.message);
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

    console.log(`📝 Collecting feedback for template: ${templatePath}`);

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

    console.log("✅ Feedback collected successfully!");
    console.log(`📊 Feedback ID: ${result.feedbackId}`);
    console.log(
      `⭐ Average Rating: ${result.feedbackSummary.averageRating.toFixed(1)}/5`
    );
    console.log(`📝 Total Feedback: ${result.feedbackSummary.totalFeedback}`);
    console.log(
      `💡 Common Suggestions: ${result.feedbackSummary.commonSuggestions.length}`
    );
    console.log(
      `🐛 Common Issues: ${result.feedbackSummary.commonIssues.length}`
    );

    if (result.recommendations.length > 0) {
      console.log("\n🎯 Recommendations:");
      result.recommendations.forEach((rec) => {
        console.log(`  - ${rec.message} (Priority: ${rec.priority})`);
      });
    }

    return result;
  } catch (error) {
    console.error("❌ Failed to collect feedback:", error.message);
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

    console.log(`📊 Getting insights for template: ${templatePath}`);

    const result = await aiTemplateLoop.getTemplateInsights(templatePath);

    console.log("✅ Template insights retrieved successfully!");
    console.log(`📈 Overall Health: ${result.overallHealth.toFixed(2)}`);
    console.log(
      `🎯 Success Rate: ${(result.learningInsights.successRate * 100).toFixed(
        1
      )}%`
    );
    console.log(
      `📝 Total Executions: ${result.learningInsights.totalExecutions}`
    );
    console.log(
      `⭐ Average Rating: ${result.feedbackInsights.feedbackSummary.averageRating.toFixed(
        1
      )}/5`
    );
    console.log(
      `💡 Total Feedback: ${result.feedbackInsights.feedbackSummary.totalFeedback}`
    );

    // Show successful patterns
    if (result.learningInsights.successfulPatterns.length > 0) {
      console.log("\n✅ Successful Patterns:");
      result.learningInsights.successfulPatterns
        .slice(0, 5)
        .forEach((pattern) => {
          console.log(
            `  - ${pattern.pattern} (${pattern.successCount} successes)`
          );
        });
    }

    // Show failed patterns
    if (result.learningInsights.failedPatterns.length > 0) {
      console.log("\n❌ Failed Patterns:");
      result.learningInsights.failedPatterns.slice(0, 5).forEach((pattern) => {
        console.log(
          `  - ${pattern.pattern} (${pattern.failureCount} failures)`
        );
      });
    }

    // Show optimization recommendations
    if (result.optimizationRecommendations.length > 0) {
      console.log("\n🔧 Optimization Recommendations:");
      result.optimizationRecommendations.forEach((rec) => {
        console.log(`  - ${rec.title} (Priority: ${rec.priority})`);
        console.log(`    ${rec.description}`);
      });
    }

    return result;
  } catch (error) {
    console.error("❌ Failed to get template insights:", error.message);
    throw error;
  }
}

/**
 * Get system metrics
 */
export async function getSystemMetricsCommand(args) {
  try {
    console.log("📊 Getting system metrics...");

    const result = await aiTemplateLoop.getSystemMetrics();

    console.log("✅ System metrics retrieved successfully!");
    console.log(`🎯 System Health: ${result.systemHealth.toFixed(2)}`);
    console.log(
      `📈 Global Success Rate: ${(
        result.globalInsights.successRate * 100
      ).toFixed(1)}%`
    );
    console.log(
      `📝 Total Executions: ${result.globalInsights.totalExecutions}`
    );
    console.log(`🔄 Total Generations: ${result.totalExecutions}`);

    // Show global success patterns
    if (result.globalSuccessPatterns.length > 0) {
      console.log("\n✅ Global Success Patterns:");
      result.globalSuccessPatterns.slice(0, 10).forEach((pattern) => {
        console.log(
          `  - ${pattern.pattern} (${pattern.successCount} successes)`
        );
      });
    }

    // Show global failure patterns
    if (result.globalFailurePatterns.length > 0) {
      console.log("\n❌ Global Failure Patterns:");
      result.globalFailurePatterns.slice(0, 10).forEach((pattern) => {
        console.log(
          `  - ${pattern.pattern} (${pattern.failureCount} failures)`
        );
      });
    }

    return result;
  } catch (error) {
    console.error("❌ Failed to get system metrics:", error.message);
    throw error;
  }
}

/**
 * Persist learning data
 */
export async function persistLearningDataCommand(args) {
  try {
    console.log("💾 Persisting learning data...");

    await aiTemplateLoop.persist();

    console.log("✅ Learning data persisted successfully!");
  } catch (error) {
    console.error("❌ Failed to persist learning data:", error.message);
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

    console.log(`📜 Showing last ${limit} executions:`);

    if (history.length === 0) {
      console.log("No execution history found.");
      return;
    }

    history.slice(0, limit).forEach((execution, index) => {
      console.log(`\n${index + 1}. ${execution.id}`);
      console.log(`   Prompt: ${execution.prompt.substring(0, 50)}...`);
      console.log(
        `   Project: ${execution.projectContext.projectType} (${execution.projectContext.framework})`
      );
      console.log(`   Duration: ${execution.executionResult.duration}ms`);
      console.log(`   Success: ${execution.executionResult.ok ? "✅" : "❌"}`);
      console.log(`   Timestamp: ${execution.timestamp}`);
    });
  } catch (error) {
    console.error("❌ Failed to show execution history:", error.message);
    throw error;
  }
}

/**
 * Clear execution history
 */
export async function clearHistoryCommand(args) {
  try {
    console.log("🗑️  Clearing execution history...");

    aiTemplateLoop.clearExecutionHistory();

    console.log("✅ Execution history cleared successfully!");
  } catch (error) {
    console.error("❌ Failed to clear execution history:", error.message);
    throw error;
  }
}
