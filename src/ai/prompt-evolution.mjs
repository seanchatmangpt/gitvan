/**
 * GitVan AI Prompt Evolution Engine
 * Evolves AI prompts based on template execution success/failure patterns
 */

import { templateLearning } from "./template-learning.mjs";
import { generateText } from "./provider.mjs";
import { createLogger } from "../utils/logger.mjs";
import { useGitVan } from "../core/context.mjs";
import { join } from "pathe";
import { promises as fs } from "node:fs";

const logger = createLogger("ai-prompt-evolution");

/**
 * AI Prompt Evolution Engine
 */
export class AIPromptEvolution {
  constructor() {
    this.evolutionHistory = new Map();
    this.successPatterns = new Map();
    this.failurePatterns = new Map();
    this.userPreferences = new Map();
  }

  /**
   * Evolve AI prompt based on template execution results
   */
  async evolvePrompt(basePrompt, templatePath, executionResult, context = {}) {
    const evolutionId = `${templatePath}-${Date.now()}`;

    // Analyze execution result
    const analysis = await this.analyzeExecution(
      templatePath,
      executionResult,
      context
    );

    // Get learning insights
    const insights = await templateLearning.getInsights(templatePath);

    // Generate evolved prompt
    const evolvedPrompt = await this.generateEvolvedPrompt(
      basePrompt,
      analysis,
      insights,
      context
    );

    // Record evolution
    this.evolutionHistory.set(evolutionId, {
      templatePath,
      basePrompt,
      evolvedPrompt,
      analysis,
      insights,
      timestamp: new Date().toISOString(),
    });

    logger.info(`Evolved prompt for template ${templatePath}`);
    return evolvedPrompt;
  }

  /**
   * Analyze template execution result
   */
  async analyzeExecution(templatePath, executionResult, context) {
    const analysis = {
      success: executionResult.ok,
      duration: executionResult.duration || 0,
      artifacts: executionResult.artifacts || [],
      errors: executionResult.errors || [],
      context,
      patterns: [],
      improvements: [],
      userSatisfaction: this.estimateUserSatisfaction(executionResult),
    };

    // Analyze success patterns
    if (executionResult.ok) {
      analysis.patterns.push("successful_execution");
      analysis.patterns.push(`context_${context.projectType || "unknown"}`);
      analysis.patterns.push(`framework_${context.framework || "unknown"}`);

      // Identify successful elements
      if (executionResult.artifacts && executionResult.artifacts.length > 0) {
        analysis.patterns.push("generated_artifacts");
      }

      if (executionResult.duration && executionResult.duration < 2000) {
        analysis.patterns.push("fast_execution");
      }
    } else {
      // Analyze failure patterns
      analysis.patterns.push("failed_execution");

      if (executionResult.errors && executionResult.errors.length > 0) {
        const errorTypes = executionResult.errors.map(
          (e) => e.type || "unknown_error"
        );
        analysis.patterns.push(...errorTypes.map((t) => `error_${t}`));
      }

      if (executionResult.duration && executionResult.duration > 10000) {
        analysis.patterns.push("slow_execution");
      }
    }

    // Generate improvement suggestions
    analysis.improvements = await this.generateImprovements(analysis);

    return analysis;
  }

  /**
   * Estimate user satisfaction based on execution result
   */
  estimateUserSatisfaction(executionResult) {
    let satisfaction = 0;

    if (executionResult.ok) {
      satisfaction += 0.5;

      if (executionResult.artifacts && executionResult.artifacts.length > 0) {
        satisfaction += 0.3;
      }

      if (executionResult.duration && executionResult.duration < 2000) {
        satisfaction += 0.2;
      }
    } else {
      satisfaction = 0.1; // Minimal satisfaction for failures
    }

    return Math.min(satisfaction, 1.0);
  }

  /**
   * Generate improvement suggestions
   */
  async generateImprovements(analysis) {
    const improvements = [];

    if (!analysis.success) {
      improvements.push({
        type: "error_handling",
        priority: "high",
        suggestion:
          "Improve error handling and validation in template generation",
      });
    }

    if (analysis.duration > 5000) {
      improvements.push({
        type: "performance",
        priority: "medium",
        suggestion: "Optimize template generation for faster execution",
      });
    }

    if (analysis.artifacts.length === 0) {
      improvements.push({
        type: "output",
        priority: "medium",
        suggestion: "Ensure template generates expected artifacts",
      });
    }

    return improvements;
  }

  /**
   * Generate evolved prompt based on analysis and insights
   */
  async generateEvolvedPrompt(basePrompt, analysis, insights, context) {
    const evolutionContext = {
      basePrompt,
      analysis,
      insights,
      context,
      timestamp: new Date().toISOString(),
    };

    const evolutionPrompt = `
# AI Prompt Evolution for GitVan Template Generation

## Base Prompt Analysis
Original prompt: "${basePrompt}"

## Execution Analysis
- Success: ${analysis.success}
- Duration: ${analysis.duration}ms
- User Satisfaction: ${(analysis.userSatisfaction * 100).toFixed(1)}%
- Patterns: ${analysis.patterns.join(", ")}
- Improvements: ${analysis.improvements.map((i) => i.suggestion).join(", ")}

## Learning Insights
- Template Success Rate: ${(insights.successRate * 100).toFixed(1)}%
- Total Executions: ${insights.totalExecutions}
- Successful Patterns: ${insights.successfulPatterns.length}
- Failed Patterns: ${insights.failedPatterns.length}

## Context Information
- Project Type: ${context.projectType || "unknown"}
- Framework: ${context.framework || "unknown"}
- User Agent: ${context.userAgent || "unknown"}

## Evolution Instructions
Based on the analysis above, evolve the base prompt to:

1. **Emphasize Successful Patterns**: Include patterns that have high success rates
2. **Avoid Failed Patterns**: Exclude or modify patterns that commonly fail
3. **Optimize for Context**: Tailor the prompt for the specific project context
4. **Improve User Experience**: Focus on aspects that increase user satisfaction
5. **Handle Edge Cases**: Address common error patterns

## Evolved Prompt Requirements
- Maintain the core functionality of the base prompt
- Incorporate successful patterns from learning insights
- Avoid patterns that commonly fail
- Optimize for the specific project context
- Include specific guidance for error handling
- Focus on generating high-quality, useful templates

Generate an evolved prompt that addresses these requirements:
`;

    try {
      const evolvedPrompt = await generateText({
        prompt: evolutionPrompt,
        model: "qwen3-coder:30b",
        options: {
          temperature: 0.3, // Lower temperature for more consistent evolution
          maxTokens: 2000,
        },
      });

      return evolvedPrompt.trim();
    } catch (error) {
      logger.error("Failed to generate evolved prompt:", error);
      return basePrompt; // Fallback to original prompt
    }
  }

  /**
   * Get evolution history for template
   */
  getEvolutionHistory(templatePath) {
    return Array.from(this.evolutionHistory.values())
      .filter((e) => e.templatePath === templatePath)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get successful patterns across all templates
   */
  getGlobalSuccessPatterns() {
    const patterns = new Map();

    for (const [templatePath, insights] of this.successPatterns) {
      for (const pattern of insights.successfulPatterns) {
        const key = pattern.pattern;
        if (!patterns.has(key)) {
          patterns.set(key, {
            pattern: key,
            successCount: 0,
            templateCount: 0,
            avgSuccessRate: 0,
          });
        }

        const globalPattern = patterns.get(key);
        globalPattern.successCount += pattern.successCount;
        globalPattern.templateCount += 1;
        globalPattern.avgSuccessRate =
          (globalPattern.avgSuccessRate * (globalPattern.templateCount - 1) +
            pattern.successRate) /
          globalPattern.templateCount;
      }
    }

    return Array.from(patterns.values()).sort(
      (a, b) => b.successCount - a.successCount
    );
  }

  /**
   * Get failed patterns across all templates
   */
  getGlobalFailurePatterns() {
    const patterns = new Map();

    for (const [templatePath, insights] of this.failurePatterns) {
      for (const pattern of insights.failedPatterns) {
        const key = pattern.pattern;
        if (!patterns.has(key)) {
          patterns.set(key, {
            pattern: key,
            failureCount: 0,
            templateCount: 0,
            avgFailureRate: 0,
          });
        }

        const globalPattern = patterns.get(key);
        globalPattern.failureCount += pattern.failureCount;
        globalPattern.templateCount += 1;
        globalPattern.avgFailureRate =
          (globalPattern.avgFailureRate * (globalPattern.templateCount - 1) +
            pattern.failureRate) /
          globalPattern.templateCount;
      }
    }

    return Array.from(patterns.values()).sort(
      (a, b) => b.failureCount - a.failureCount
    );
  }

  /**
   * Persist evolution data
   */
  async persist() {
    try {
      const ctx = useGitVan();
      const evolutionPath = join(
        ctx.root,
        ".gitvan",
        "ai",
        "prompt-evolution.json"
      );

      await fs.mkdir(dirname(evolutionPath), { recursive: true });

      const data = {
        evolutionHistory: Object.fromEntries(this.evolutionHistory),
        successPatterns: Object.fromEntries(this.successPatterns),
        failurePatterns: Object.fromEntries(this.failurePatterns),
        userPreferences: Object.fromEntries(this.userPreferences),
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeFile(evolutionPath, JSON.stringify(data, null, 2));
      logger.info(`Persisted AI prompt evolution data to ${evolutionPath}`);
    } catch (error) {
      logger.error("Failed to persist AI prompt evolution data:", error);
    }
  }

  /**
   * Load evolution data
   */
  async load() {
    try {
      const ctx = useGitVan();
      const evolutionPath = join(
        ctx.root,
        ".gitvan",
        "ai",
        "prompt-evolution.json"
      );

      const data = JSON.parse(await fs.readFile(evolutionPath, "utf8"));

      this.evolutionHistory = new Map(
        Object.entries(data.evolutionHistory || {})
      );
      this.successPatterns = new Map(
        Object.entries(data.successPatterns || {})
      );
      this.failurePatterns = new Map(
        Object.entries(data.failurePatterns || {})
      );
      this.userPreferences = new Map(
        Object.entries(data.userPreferences || {})
      );

      logger.info(`Loaded AI prompt evolution data from ${evolutionPath}`);
    } catch (error) {
      logger.warn("No existing AI prompt evolution data found, starting fresh");
    }
  }
}

// Export singleton instance
export const aiPromptEvolution = new AIPromptEvolution();



