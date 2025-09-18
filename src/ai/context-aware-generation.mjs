/**
 * GitVan Context-Aware AI Generation System
 * Generates templates with rich project context and user behavior analysis
 */

import { generateText } from "./provider.mjs";
import { templateLearning } from "./template-learning.mjs";
import { aiPromptEvolution } from "./prompt-evolution.mjs";
import { useGitVan } from "../core/context.mjs";
import { useGit } from "../composables/git/index.mjs";
import { createLogger } from "../utils/logger.mjs";
import { join } from "pathe";
import { promises as fs } from "node:fs";

const logger = createLogger("context-aware-generation");

/**
 * Project Context Analyzer
 */
export class ProjectContextAnalyzer {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Analyze project context
   */
  async analyzeProjectContext(rootPath) {
    const cacheKey = `project-${rootPath}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const context = {
      projectType: "unknown",
      framework: "unknown",
      dependencies: [],
      userPatterns: [],
      teamConventions: [],
      successPatterns: [],
      projectStructure: {},
      gitHistory: {},
      lastAnalyzed: new Date().toISOString(),
    };

    try {
      // Analyze package.json for dependencies
      const packageJsonPath = join(rootPath, "package.json");
      try {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, "utf8")
        );
        context.dependencies = Object.keys(packageJson.dependencies || {});
        context.framework = this.detectFramework(packageJson);
        context.projectType = this.detectProjectType(packageJson);
      } catch (error) {
        logger.warn("Could not analyze package.json:", error.message);
      }

      // Analyze project structure
      context.projectStructure = await this.analyzeProjectStructure(rootPath);

      // Analyze git history for user patterns
      context.gitHistory = await this.analyzeGitHistory(rootPath);

      // Analyze team conventions
      context.teamConventions = await this.analyzeTeamConventions(rootPath);

      // Get success patterns from learning system
      context.successPatterns = await this.getSuccessPatterns(rootPath);

      this.cache.set(cacheKey, context);
      return context;
    } catch (error) {
      logger.error("Failed to analyze project context:", error);
      return context;
    }
  }

  /**
   * Detect framework from package.json
   */
  detectFramework(packageJson) {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (deps.next) return "nextjs";
    if (deps.react) return "react";
    if (deps.vue) return "vue";
    if (deps.angular) return "angular";
    if (deps.svelte) return "svelte";
    if (deps.express) return "express";
    if (deps.fastify) return "fastify";
    if (deps.koa) return "koa";

    return "unknown";
  }

  /**
   * Detect project type from package.json
   */
  detectProjectType(packageJson) {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (deps.next) return "nextjs-app";
    if (deps.react) return "react-app";
    if (deps.vue) return "vue-app";
    if (deps.angular) return "angular-app";
    if (deps.express || deps.fastify || deps.koa) return "node-api";
    if (deps.typescript) return "typescript-project";

    return "javascript-project";
  }

  /**
   * Analyze project structure
   */
  async analyzeProjectStructure(rootPath) {
    const structure = {
      hasSrc: false,
      hasComponents: false,
      hasPages: false,
      hasApi: false,
      hasTests: false,
      hasDocs: false,
      hasConfig: false,
      directories: [],
      files: [],
    };

    try {
      const entries = await fs.readdir(rootPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          structure.directories.push(entry.name);

          if (entry.name === "src") structure.hasSrc = true;
          if (entry.name === "components") structure.hasComponents = true;
          if (entry.name === "pages") structure.hasPages = true;
          if (entry.name === "api") structure.hasApi = true;
          if (entry.name === "tests" || entry.name === "__tests__")
            structure.hasTests = true;
          if (entry.name === "docs") structure.hasDocs = true;
          if (entry.name === "config") structure.hasConfig = true;
        } else {
          structure.files.push(entry.name);
        }
      }
    } catch (error) {
      logger.warn("Could not analyze project structure:", error.message);
    }

    return structure;
  }

  /**
   * Analyze git history for user patterns
   */
  async analyzeGitHistory(rootPath) {
    const gitHistory = {
      commitPatterns: [],
      filePatterns: [],
      branchPatterns: [],
      authorPatterns: [],
    };

    try {
      const git = useGit();

      // Get recent commits
      const commits = await git.log({ maxCount: 50 });

      for (const commit of commits) {
        // Analyze commit message patterns
        const message = commit.message || "";
        if (message.includes("feat:"))
          gitHistory.commitPatterns.push("feature_commits");
        if (message.includes("fix:"))
          gitHistory.commitPatterns.push("bugfix_commits");
        if (message.includes("refactor:"))
          gitHistory.commitPatterns.push("refactor_commits");
        if (message.includes("test:"))
          gitHistory.commitPatterns.push("test_commits");

        // Analyze file patterns
        if (commit.files) {
          for (const file of commit.files) {
            if (file.includes(".tsx") || file.includes(".jsx"))
              gitHistory.filePatterns.push("react_components");
            if (file.includes(".ts") && !file.includes(".tsx"))
              gitHistory.filePatterns.push("typescript_files");
            if (file.includes(".test.") || file.includes(".spec."))
              gitHistory.filePatterns.push("test_files");
            if (file.includes(".md"))
              gitHistory.filePatterns.push("documentation_files");
          }
        }
      }

      // Get unique patterns
      gitHistory.commitPatterns = [...new Set(gitHistory.commitPatterns)];
      gitHistory.filePatterns = [...new Set(gitHistory.filePatterns)];
    } catch (error) {
      logger.warn("Could not analyze git history:", error.message);
    }

    return gitHistory;
  }

  /**
   * Analyze team conventions
   */
  async analyzeTeamConventions(rootPath) {
    const conventions = [];

    try {
      // Check for common config files
      const configFiles = [
        "eslint.config.js",
        "eslint.config.mjs",
        ".eslintrc.js",
        ".eslintrc.json",
        "prettier.config.js",
        "prettier.config.mjs",
        ".prettierrc",
        "tsconfig.json",
        "tailwind.config.js",
        "vite.config.js",
        "next.config.js",
      ];

      for (const configFile of configFiles) {
        try {
          await fs.access(join(rootPath, configFile));
          conventions.push(
            `uses_${configFile.replace(/\./g, "_").replace(/-/g, "_")}`
          );
        } catch (error) {
          // File doesn't exist
        }
      }

      // Check for common directories
      const commonDirs = ["src", "components", "pages", "api", "tests", "docs"];
      for (const dir of commonDirs) {
        try {
          await fs.access(join(rootPath, dir));
          conventions.push(`has_${dir}_directory`);
        } catch (error) {
          // Directory doesn't exist
        }
      }
    } catch (error) {
      logger.warn("Could not analyze team conventions:", error.message);
    }

    return conventions;
  }

  /**
   * Get success patterns from learning system
   */
  async getSuccessPatterns(rootPath) {
    try {
      const insights = await templateLearning.getInsights("global");
      return insights.successfulPatterns || [];
    } catch (error) {
      logger.warn("Could not get success patterns:", error.message);
      return [];
    }
  }
}

/**
 * Context-Aware AI Generator
 */
export class ContextAwareGenerator {
  constructor() {
    this.contextAnalyzer = new ProjectContextAnalyzer();
    this.isInitialized = false;
  }

  /**
   * Initialize the generator
   */
  async initialize() {
    if (this.isInitialized) return;

    await templateLearning.initialize();
    await aiPromptEvolution.load();
    this.isInitialized = true;
    logger.info("Context-aware AI generator initialized");
  }

  /**
   * Generate template with rich context
   */
  async generateTemplate(prompt, context = {}) {
    await this.initialize();

    // Analyze project context
    const projectContext = await this.contextAnalyzer.analyzeProjectContext(
      context.rootPath || process.cwd()
    );

    // Get learning insights
    const learningInsights = await templateLearning.getInsights("global");

    // Get evolution history
    const evolutionHistory = aiPromptEvolution.getEvolutionHistory("global");

    // Build enriched prompt
    const enrichedPrompt = await this.buildEnrichedPrompt(
      prompt,
      projectContext,
      learningInsights,
      evolutionHistory,
      context
    );

    // Generate template
    const template = await this.generateWithContext(
      enrichedPrompt,
      projectContext,
      context
    );

    // Record generation for learning
    await this.recordGeneration(prompt, template, projectContext, context);

    return template;
  }

  /**
   * Build enriched prompt with context
   */
  async buildEnrichedPrompt(
    prompt,
    projectContext,
    learningInsights,
    evolutionHistory,
    context
  ) {
    const enrichedPrompt = `
# GitVan Context-Aware Template Generation

## User Request
"${prompt}"

## Project Context Analysis
- **Project Type**: ${projectContext.projectType}
- **Framework**: ${projectContext.framework}
- **Dependencies**: ${projectContext.dependencies.join(", ")}
- **Structure**: ${JSON.stringify(projectContext.projectStructure, null, 2)}
- **Git Patterns**: ${JSON.stringify(projectContext.gitHistory, null, 2)}
- **Team Conventions**: ${projectContext.teamConventions.join(", ")}

## Learning Insights
- **Global Success Rate**: ${(learningInsights.successRate * 100).toFixed(1)}%
- **Total Executions**: ${learningInsights.totalExecutions}
- **Successful Patterns**: ${learningInsights.successfulPatterns
      .map((p) => p.pattern)
      .join(", ")}
- **Failed Patterns**: ${learningInsights.failedPatterns
      .map((p) => p.pattern)
      .join(", ")}

## Evolution History
${evolutionHistory
  .slice(0, 3)
  .map(
    (e) => `
- **${e.timestamp}**: ${e.analysis.success ? "Success" : "Failure"} (${
      e.analysis.duration
    }ms)
  - Patterns: ${e.analysis.patterns.join(", ")}
  - Improvements: ${e.analysis.improvements.map((i) => i.suggestion).join(", ")}
`
  )
  .join("\n")}

## Generation Instructions
Based on the rich context above, generate a GitVan template that:

1. **Matches Project Context**: Tailor the template for ${
      projectContext.projectType
    } with ${projectContext.framework}
2. **Follows Team Conventions**: Incorporate patterns like ${projectContext.teamConventions
      .slice(0, 3)
      .join(", ")}
3. **Leverages Success Patterns**: Use successful patterns like ${learningInsights.successfulPatterns
      .slice(0, 3)
      .map((p) => p.pattern)
      .join(", ")}
4. **Avoids Failed Patterns**: Avoid patterns like ${learningInsights.failedPatterns
      .slice(0, 3)
      .map((p) => p.pattern)
      .join(", ")}
5. **Includes Rich Front-Matter**: Add comprehensive YAML front-matter with AI learning context
6. **Optimizes for User Experience**: Focus on aspects that increase user satisfaction

## Template Requirements
- Include comprehensive YAML front-matter with AI learning context
- Use Nunjucks templating with appropriate filters
- Include conditional logic based on project context
- Add error handling and validation
- Optimize for the specific framework and project type
- Include user preference learning

Generate a complete GitVan template with front-matter:
`;

    return enrichedPrompt;
  }

  /**
   * Generate template with context
   */
  async generateWithContext(enrichedPrompt, projectContext, context) {
    try {
      const template = await generateText({
        prompt: enrichedPrompt,
        model: context.model || "qwen3-coder:30b",
        options: {
          temperature: context.temperature || 0.7,
          maxTokens: context.maxTokens || 3000,
        },
      });

      return template.trim();
    } catch (error) {
      logger.error("Failed to generate template with context:", error);
      throw error;
    }
  }

  /**
   * Record generation for learning
   */
  async recordGeneration(prompt, template, projectContext, context) {
    try {
      // Record as a successful execution for learning
      const executionResult = {
        ok: true,
        duration: 0, // Will be updated when template is actually executed
        artifacts: [template],
        errors: [],
      };

      await templateLearning.recordExecution(
        "context-aware-generation",
        executionResult,
        {
          projectType: projectContext.projectType,
          framework: projectContext.framework,
          userAgent: context.userAgent || "context-aware-generator",
          prompt: prompt.substring(0, 100), // Truncate for storage
        }
      );

      logger.info("Recorded context-aware generation for learning");
    } catch (error) {
      logger.warn("Failed to record generation for learning:", error);
    }
  }

  /**
   * Get context recommendations
   */
  async getContextRecommendations(rootPath) {
    const projectContext = await this.contextAnalyzer.analyzeProjectContext(
      rootPath
    );
    const learningInsights = await templateLearning.getInsights("global");

    const recommendations = [];

    // Framework-specific recommendations
    if (projectContext.framework === "nextjs") {
      recommendations.push({
        type: "framework",
        priority: "high",
        message:
          "Next.js project detected. Consider using App Router patterns and Next.js-specific optimizations.",
        suggestions: [
          "Use App Router directory structure",
          "Include Next.js-specific front-matter directives",
          "Optimize for Next.js build system",
        ],
      });
    }

    // Dependency-based recommendations
    if (projectContext.dependencies.includes("typescript")) {
      recommendations.push({
        type: "language",
        priority: "medium",
        message:
          "TypeScript detected. Include type definitions and TypeScript-specific patterns.",
        suggestions: [
          "Generate TypeScript interfaces",
          "Include type definitions",
          "Use TypeScript-specific filters",
        ],
      });
    }

    // Learning-based recommendations
    if (learningInsights.successRate < 0.7) {
      recommendations.push({
        type: "learning",
        priority: "high",
        message:
          "Low success rate detected. Consider reviewing failed patterns and improving template generation.",
        suggestions: [
          "Review failed patterns",
          "Improve error handling",
          "Add more context validation",
        ],
      });
    }

    return recommendations;
  }
}

// Export singleton instance
export const contextAwareGenerator = new ContextAwareGenerator();





