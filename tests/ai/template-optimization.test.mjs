/**
 * Tests for src/ai/template-optimization.mjs
 * Template Optimization Engine
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../src/ai/template-learning.mjs", () => ({
  templateLearning: {
    initialize: vi.fn(async () => {}),
    getInsights: vi.fn(async () => ({
      successRate: 0.9,
      totalExecutions: 50,
      successfulPatterns: [
        { pattern: "error_handling", avgDuration: 1200 },
        { pattern: "caching", avgDuration: 800 },
      ],
      failedPatterns: [],
    })),
    recordExecution: vi.fn(async () => {}),
  },
}));

vi.mock("../../src/ai/prompt-evolution.mjs", () => ({
  aiPromptEvolution: {
    load: vi.fn(async () => {}),
    getEvolutionHistory: vi.fn(() => []),
  },
}));

vi.mock("../../src/ai/context-aware-generation.mjs", () => ({
  contextAwareGenerator: {
    initialize: vi.fn(async () => {}),
  },
}));

vi.mock("../../src/ai/provider.mjs", () => ({
  generateText: vi.fn(async () => "optimized template content"),
}));

vi.mock("../../src/core/context.mjs", () => ({
  useGitVan: vi.fn(() => ({ root: "/test" })),
}));

vi.mock("../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("node:fs", () => ({
  promises: {
    readFile: vi.fn(async (path) => {
      if (path.includes("optimization-rules")) {
        return JSON.stringify({
          performance: {
            threshold: 0.7,
            priority: "high",
            actions: ["optimize_rendering"],
          },
        });
      }
      if (path.includes("feedback")) {
        return JSON.stringify({
          ratings: [4, 5],
          comments: ["good"],
          suggestions: ["add caching"],
          lastUpdated: "2024-01-01T00:00:00Z",
        });
      }
      return "template content";
    }),
    writeFile: vi.fn(async () => {}),
    mkdir: vi.fn(async () => {}),
  },
}));

import { TemplateOptimizer } from "../../src/ai/template-optimization.mjs";

describe("TemplateOptimizer", () => {
  let optimizer;

  beforeEach(() => {
    vi.clearAllMocks();
    optimizer = new TemplateOptimizer();
  });

  describe("constructor", () => {
    it("initializes with empty state", () => {
      expect(optimizer.optimizationHistory.size).toBe(0);
      expect(optimizer.optimizationRules.size).toBe(0);
      expect(optimizer.isInitialized).toBe(false);
    });
  });

  describe("initialize", () => {
    it("initializes once", async () => {
      await optimizer.initialize();
      expect(optimizer.isInitialized).toBe(true);
    });

    it("does not reinitialize", async () => {
      await optimizer.initialize();
      await optimizer.initialize();
      const { templateLearning } = await import(
        "../../src/ai/template-learning.mjs"
      );
      expect(templateLearning.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe("calculateAverageDuration", () => {
    it("returns 0 for no patterns", () => {
      const insights = { successfulPatterns: [] };
      expect(optimizer.calculateAverageDuration(insights)).toBe(0);
    });

    it("calculates average duration", () => {
      const insights = {
        successfulPatterns: [
          { avgDuration: 1000 },
          { avgDuration: 2000 },
        ],
      };
      expect(optimizer.calculateAverageDuration(insights)).toBe(1500);
    });
  });

  describe("calculateUserSatisfaction", () => {
    it("returns 0 for no executions", () => {
      const insights = { totalExecutions: 0, successRate: 0, successfulPatterns: [] };
      expect(optimizer.calculateUserSatisfaction(insights)).toBe(0);
    });

    it("returns success rate as base satisfaction", () => {
      const insights = {
        totalExecutions: 10,
        successRate: 0.8,
        successfulPatterns: [],
      };
      expect(optimizer.calculateUserSatisfaction(insights)).toBe(0.8);
    });

    it("boosts satisfaction for fast execution", () => {
      const insights = {
        totalExecutions: 10,
        successRate: 0.8,
        successfulPatterns: [{ avgDuration: 500 }],
      };
      expect(optimizer.calculateUserSatisfaction(insights)).toBe(0.9);
    });

    it("caps satisfaction at 1.0", () => {
      const insights = {
        totalExecutions: 10,
        successRate: 0.95,
        successfulPatterns: [{ avgDuration: 100 }],
      };
      expect(optimizer.calculateUserSatisfaction(insights)).toBe(1.0);
    });
  });

  describe("calculatePerformanceScore", () => {
    it("returns 0 for no patterns", () => {
      const insights = { successfulPatterns: [] };
      expect(optimizer.calculatePerformanceScore(insights)).toBe(0);
    });

    it("returns high score for fast operations", () => {
      const insights = {
        successfulPatterns: [{ avgDuration: 500 }],
      };
      const score = optimizer.calculatePerformanceScore(insights);
      expect(score).toBeGreaterThan(0.9);
    });

    it("returns low score for slow operations", () => {
      const insights = {
        successfulPatterns: [{ avgDuration: 9000 }],
      };
      const score = optimizer.calculatePerformanceScore(insights);
      expect(score).toBeLessThan(0.2);
    });
  });

  describe("calculateReliabilityScore", () => {
    it("returns success rate", () => {
      expect(
        optimizer.calculateReliabilityScore({ successRate: 0.75 })
      ).toBe(0.75);
    });
  });

  describe("generateOptimizationSuggestions", () => {
    it("generates performance suggestion for low score", async () => {
      const metrics = {
        performanceScore: 0.5,
        reliabilityScore: 0.9,
        userSatisfaction: 0.8,
      };
      const feedback = { suggestions: [] };
      const insights = { failedPatterns: [], totalExecutions: 10 };

      const suggestions = await optimizer.generateOptimizationSuggestions(
        "test.njk",
        metrics,
        feedback,
        insights
      );
      const perfSuggestion = suggestions.find(
        (s) => s.type === "performance"
      );
      expect(perfSuggestion).toBeDefined();
      expect(perfSuggestion.priority).toBe("high");
    });

    it("generates reliability suggestion for low score", async () => {
      const metrics = {
        performanceScore: 0.9,
        reliabilityScore: 0.5,
        userSatisfaction: 0.8,
      };
      const feedback = { suggestions: [] };
      const insights = { failedPatterns: [], totalExecutions: 10 };

      const suggestions = await optimizer.generateOptimizationSuggestions(
        "test.njk",
        metrics,
        feedback,
        insights
      );
      const relSuggestion = suggestions.find((s) => s.type === "reliability");
      expect(relSuggestion).toBeDefined();
    });

    it("generates user experience suggestion for low satisfaction", async () => {
      const metrics = {
        performanceScore: 0.9,
        reliabilityScore: 0.9,
        userSatisfaction: 0.5,
      };
      const feedback = { suggestions: [] };
      const insights = { failedPatterns: [], totalExecutions: 10 };

      const suggestions = await optimizer.generateOptimizationSuggestions(
        "test.njk",
        metrics,
        feedback,
        insights
      );
      const ueSuggestion = suggestions.find(
        (s) => s.type === "user_experience"
      );
      expect(ueSuggestion).toBeDefined();
    });

    it("generates learning suggestion for failed patterns", async () => {
      const metrics = {
        performanceScore: 0.9,
        reliabilityScore: 0.9,
        userSatisfaction: 0.9,
      };
      const feedback = { suggestions: [] };
      const insights = {
        failedPatterns: [{ pattern: "timeout" }],
        totalExecutions: 10,
      };

      const suggestions = await optimizer.generateOptimizationSuggestions(
        "test.njk",
        metrics,
        feedback,
        insights
      );
      const learnSuggestion = suggestions.find((s) => s.type === "learning");
      expect(learnSuggestion).toBeDefined();
    });

    it("generates user feedback suggestion when present", async () => {
      const metrics = {
        performanceScore: 0.9,
        reliabilityScore: 0.9,
        userSatisfaction: 0.9,
      };
      const feedback = { suggestions: ["add dark mode"] };
      const insights = { failedPatterns: [], totalExecutions: 10 };

      const suggestions = await optimizer.generateOptimizationSuggestions(
        "test.njk",
        metrics,
        feedback,
        insights
      );
      const fbSuggestion = suggestions.find(
        (s) => s.type === "user_feedback"
      );
      expect(fbSuggestion).toBeDefined();
    });

    it("returns no suggestions for optimal metrics", async () => {
      const metrics = {
        performanceScore: 0.95,
        reliabilityScore: 0.95,
        userSatisfaction: 0.95,
      };
      const feedback = { suggestions: [] };
      const insights = { failedPatterns: [], totalExecutions: 10 };

      const suggestions = await optimizer.generateOptimizationSuggestions(
        "test.njk",
        metrics,
        feedback,
        insights
      );
      expect(suggestions).toHaveLength(0);
    });
  });

  describe("loadDefaultOptimizationRules", () => {
    it("sets default rules", () => {
      optimizer.loadDefaultOptimizationRules();
      expect(optimizer.optimizationRules.has("performance")).toBe(true);
      expect(optimizer.optimizationRules.has("reliability")).toBe(true);
      expect(optimizer.optimizationRules.has("user_experience")).toBe(true);
    });
  });

  describe("getOptimizationHistory", () => {
    it("returns empty array for no history", () => {
      const history = optimizer.getOptimizationHistory("test.njk");
      expect(history).toHaveLength(0);
    });

    it("filters by template path", () => {
      optimizer.optimizationHistory.set("a", {
        templatePath: "test.njk",
        timestamp: "2024-01-01",
      });
      optimizer.optimizationHistory.set("b", {
        templatePath: "other.njk",
        timestamp: "2024-01-02",
      });
      const history = optimizer.getOptimizationHistory("test.njk");
      expect(history).toHaveLength(1);
    });

    it("sorts by timestamp descending", () => {
      optimizer.optimizationHistory.set("a", {
        templatePath: "test.njk",
        timestamp: "2024-01-01",
      });
      optimizer.optimizationHistory.set("b", {
        templatePath: "test.njk",
        timestamp: "2024-01-02",
      });
      const history = optimizer.getOptimizationHistory("test.njk");
      expect(history[0].timestamp).toBe("2024-01-02");
    });
  });

  describe("recordOptimization", () => {
    it("stores optimization in history", async () => {
      await optimizer.recordOptimization("test.njk", [{ type: "perf" }], {});
      expect(optimizer.optimizationHistory.size).toBe(1);
    });
  });
});
