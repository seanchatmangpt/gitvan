/**
 * Tests for src/ai/user-feedback-integration.mjs
 * UserFeedbackManager and FeedbackIntegrationSystem
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../src/ai/template-learning.mjs", () => ({
  templateLearning: {
    initialize: vi.fn(async () => {}),
    getInsights: vi.fn(async () => ({
      successRate: 0.85,
      totalExecutions: 50,
      successfulPatterns: [{ pattern: "validation" }],
      failedPatterns: [],
    })),
    recordExecution: vi.fn(async () => {}),
  },
}));

vi.mock("../../src/ai/prompt-evolution.mjs", () => ({
  aiPromptEvolution: {
    load: vi.fn(async () => {}),
    evolvePrompt: vi.fn(async () => {}),
  },
}));

vi.mock("../../src/ai/context-aware-generation.mjs", () => ({
  contextAwareGenerator: {},
}));

vi.mock("../../src/ai/template-optimization.mjs", () => ({
  templateOptimizer: {
    getOptimizationRecommendations: vi.fn(async () => []),
  },
}));

vi.mock("../../src/ai/provider.mjs", () => ({
  generateText: vi.fn(async () => "feedback-integrated template"),
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
    readFile: vi.fn(async () => {
      throw new Error("File not found");
    }),
    writeFile: vi.fn(async () => {}),
    mkdir: vi.fn(async () => {}),
  },
}));

import {
  UserFeedbackManager,
  FeedbackIntegrationSystem,
} from "../../src/ai/user-feedback-integration.mjs";

describe("UserFeedbackManager", () => {
  let manager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new UserFeedbackManager();
  });

  describe("constructor", () => {
    it("initializes with empty state", () => {
      expect(manager.feedback.size).toBe(0);
      expect(manager.preferences.size).toBe(0);
      expect(manager.isInitialized).toBe(false);
    });
  });

  describe("initialize", () => {
    it("initializes once", async () => {
      await manager.initialize();
      expect(manager.isInitialized).toBe(true);
    });

    it("does not reinitialize", async () => {
      await manager.initialize();
      await manager.initialize();
      const { templateLearning } = await import(
        "../../src/ai/template-learning.mjs"
      );
      expect(templateLearning.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe("collectFeedback", () => {
    it("stores feedback and returns id", async () => {
      const feedbackId = await manager.collectFeedback("test.njk", {
        rating: 4,
        comment: "Good template",
        suggestions: ["add tests"],
        issues: [],
      });
      expect(feedbackId).toBeDefined();
      expect(manager.feedback.size).toBe(1);
    });

    it("defaults missing fields", async () => {
      const feedbackId = await manager.collectFeedback("test.njk", {});
      const feedback = manager.feedback.get(feedbackId);
      expect(feedback.rating).toBe(0);
      expect(feedback.comment).toBe("");
      expect(feedback.suggestions).toEqual([]);
      expect(feedback.issues).toEqual([]);
    });

    it("includes context info", async () => {
      const feedbackId = await manager.collectFeedback(
        "test.njk",
        { rating: 5 },
        { userAgent: "test-agent", projectType: "react-app" }
      );
      const feedback = manager.feedback.get(feedbackId);
      expect(feedback.context.userAgent).toBe("test-agent");
      expect(feedback.context.projectType).toBe("react-app");
    });
  });

  describe("updateUserPreferences", () => {
    it("creates new preferences for first feedback", async () => {
      await manager.updateUserPreferences({
        templatePath: "new.njk",
        rating: 4,
        suggestions: ["improve docs"],
        issues: ["slow"],
        context: { projectType: "react-app", framework: "react" },
      });
      const prefs = manager.preferences.get("new.njk");
      expect(prefs.totalRatings).toBe(1);
      expect(prefs.averageRating).toBe(4);
    });

    it("updates existing preferences", async () => {
      await manager.updateUserPreferences({
        templatePath: "test.njk",
        rating: 4,
        suggestions: [],
        issues: [],
        context: { projectType: "react", framework: "react" },
      });
      await manager.updateUserPreferences({
        templatePath: "test.njk",
        rating: 2,
        suggestions: [],
        issues: [],
        context: { projectType: "react", framework: "react" },
      });
      const prefs = manager.preferences.get("test.njk");
      expect(prefs.totalRatings).toBe(2);
      expect(prefs.averageRating).toBe(3);
    });

    it("tracks common suggestions", async () => {
      await manager.updateUserPreferences({
        templatePath: "test.njk",
        rating: 3,
        suggestions: ["add caching"],
        issues: [],
        context: { projectType: "node", framework: "express" },
      });
      const prefs = manager.preferences.get("test.njk");
      expect(prefs.commonSuggestions.get("add caching")).toBe(1);
    });
  });

  describe("getFeedbackSummary", () => {
    it("returns empty summary for no feedback", async () => {
      const summary = await manager.getFeedbackSummary("nonexistent.njk");
      expect(summary.totalFeedback).toBe(0);
      expect(summary.averageRating).toBe(0);
    });

    it("returns summary with feedback", async () => {
      await manager.collectFeedback("summary.njk", {
        rating: 4,
        suggestions: ["improve docs"],
        issues: ["slow"],
      });
      const summary = await manager.getFeedbackSummary("summary.njk");
      expect(summary.totalFeedback).toBe(1);
      expect(summary.averageRating).toBe(4);
      expect(summary.commonSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe("getUserPreferences", () => {
    it("returns undefined for no preferences", () => {
      expect(manager.getUserPreferences("missing.njk")).toBeUndefined();
    });
  });

  describe("getFeedbackRecommendations", () => {
    it("generates rating recommendation for low ratings", async () => {
      await manager.collectFeedback("test.njk", { rating: 1 });
      await manager.collectFeedback("test.njk", { rating: 2 });
      const recs = await manager.getFeedbackRecommendations("test.njk");
      const ratingRec = recs.find((r) => r.type === "rating");
      expect(ratingRec).toBeDefined();
      expect(ratingRec.priority).toBe("high");
    });

    it("returns rating recommendation when avg rating is 0 (no feedback)", async () => {
      const recs = await manager.getFeedbackRecommendations("empty.njk");
      // averageRating is 0 which is < 3, so a rating recommendation is generated
      const ratingRec = recs.find((r) => r.type === "rating");
      expect(ratingRec).toBeDefined();
    });
  });

  describe("triggerLearningUpdates", () => {
    it("records positive feedback as success", async () => {
      await manager.triggerLearningUpdates({
        rating: 4,
        templatePath: "test.njk",
        comment: "good",
        context: {},
      });
      const { templateLearning } = await import(
        "../../src/ai/template-learning.mjs"
      );
      expect(templateLearning.recordExecution).toHaveBeenCalled();
    });

    it("triggers prompt evolution for negative feedback", async () => {
      await manager.triggerLearningUpdates({
        rating: 1,
        templatePath: "test.njk",
        comment: "bad",
        context: {},
      });
      const { aiPromptEvolution } = await import(
        "../../src/ai/prompt-evolution.mjs"
      );
      expect(aiPromptEvolution.evolvePrompt).toHaveBeenCalled();
    });
  });
});

describe("FeedbackIntegrationSystem", () => {
  let system;

  beforeEach(() => {
    vi.clearAllMocks();
    system = new FeedbackIntegrationSystem();
  });

  describe("constructor", () => {
    it("creates with feedback manager", () => {
      expect(system.feedbackManager).toBeDefined();
      expect(system.isInitialized).toBe(false);
    });
  });

  describe("initialize", () => {
    it("initializes once", async () => {
      await system.initialize();
      expect(system.isInitialized).toBe(true);
    });
  });

  describe("calculateOverallScore", () => {
    it("calculates weighted average of feedback and learning", () => {
      const feedbackSummary = { averageRating: 4 }; // 4/5 = 0.8
      const learningInsights = { successRate: 0.9 };
      const score = system.calculateOverallScore(
        feedbackSummary,
        learningInsights
      );
      // 0.8 * 0.6 + 0.9 * 0.4 = 0.48 + 0.36 = 0.84
      expect(score).toBeCloseTo(0.84);
    });

    it("handles zero ratings", () => {
      const feedbackSummary = { averageRating: 0 };
      const learningInsights = { successRate: 1.0 };
      const score = system.calculateOverallScore(
        feedbackSummary,
        learningInsights
      );
      expect(score).toBeCloseTo(0.4);
    });
  });
});
