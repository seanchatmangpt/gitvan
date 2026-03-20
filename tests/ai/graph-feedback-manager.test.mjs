/**
 * Tests for src/ai/graph-feedback-manager.mjs
 * GraphUserFeedbackManager
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockGraph = {
  addTurtle: vi.fn(async () => {}),
  setShapes: vi.fn(async () => {}),
  setQuery: vi.fn(async () => {}),
  select: vi.fn(async () => []),
  snapshotJSON: vi.fn(async () => {}),
};

vi.mock("../../src/composables/graph.mjs", () => ({
  useGraph: vi.fn(async () => mockGraph),
}));

vi.mock("../../src/composables/ctx.mjs", () => ({
  withGitVan: vi.fn(async (ctx, fn) => await fn()),
}));

vi.mock("consola", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
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
  GraphUserFeedbackManager,
  createGraphUserFeedbackManager,
} from "../../src/ai/graph-feedback-manager.mjs";

describe("GraphUserFeedbackManager", () => {
  let manager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new GraphUserFeedbackManager();
  });

  describe("constructor", () => {
    it("creates with default options", () => {
      expect(manager.options.feedbackDir).toBe(".gitvan/feedback");
      expect(manager.options.baseIRI).toBe("https://gitvan.dev/feedback/");
      expect(manager.initialized).toBe(false);
    });

    it("accepts custom options", () => {
      const custom = new GraphUserFeedbackManager({
        feedbackDir: "/custom/feedback",
        baseIRI: "http://custom/",
      });
      expect(custom.options.feedbackDir).toBe("/custom/feedback");
      expect(custom.options.baseIRI).toBe("http://custom/");
    });
  });

  describe("initialize", () => {
    it("initializes graph and sets shapes", async () => {
      await manager.initialize();
      expect(manager.initialized).toBe(true);
      expect(mockGraph.setShapes).toHaveBeenCalled();
    });

    it("does not reinitialize", async () => {
      await manager.initialize();
      await manager.initialize();
      expect(mockGraph.setShapes).toHaveBeenCalledTimes(1);
    });

    it("returns this for chaining", async () => {
      const result = await manager.initialize();
      expect(result).toBe(manager);
    });
  });

  describe("submitFeedback", () => {
    it("adds feedback turtle to graph", async () => {
      const result = await manager.submitFeedback({
        templateId: "tmpl-1",
        rating: 4,
        comment: "Nice template",
        category: "usability",
      });
      expect(result.feedbackId).toBeDefined();
      expect(result.status).toBe("submitted");
      expect(mockGraph.addTurtle).toHaveBeenCalled();
    });

    it("calls updateTemplateStatistics", async () => {
      mockGraph.select.mockResolvedValueOnce([]); // For updateTemplateStatistics
      mockGraph.select.mockResolvedValueOnce([]); // For analyzePatterns (category)
      mockGraph.select.mockResolvedValueOnce([]); // For analyzePatterns (template)

      await manager.submitFeedback({
        templateId: "tmpl-1",
        rating: 5,
      });
      // addTurtle called for: feedback, template stats update, pattern
      expect(mockGraph.addTurtle).toHaveBeenCalledTimes(3);
    });

    it("creates snapshot after submission", async () => {
      await manager.submitFeedback({
        templateId: "tmpl-1",
        rating: 3,
      });
      expect(mockGraph.snapshotJSON).toHaveBeenCalledWith(
        "feedback",
        "feedback-submitted",
        expect.objectContaining({ templateId: "tmpl-1" })
      );
    });
  });

  describe("updateTemplateStatistics", () => {
    it("creates new stats for first rating", async () => {
      mockGraph.select.mockResolvedValueOnce([]); // No existing stats
      await manager.initialize();
      await manager.updateTemplateStatistics("tmpl-1", 4);
      expect(mockGraph.addTurtle).toHaveBeenCalled();
    });

    it("updates existing stats", async () => {
      mockGraph.select.mockResolvedValueOnce([
        { averageRating: "4.00", totalRatings: "2" },
      ]);
      await manager.initialize();
      await manager.updateTemplateStatistics("tmpl-1", 2);
      expect(mockGraph.addTurtle).toHaveBeenCalled();
    });
  });

  describe("getTemplateFeedback", () => {
    it("returns parsed feedback results", async () => {
      mockGraph.select.mockResolvedValueOnce([
        {
          feedbackId: "fb-1",
          rating: "4",
          comment: "good",
          timestamp: "2024-01-01",
          userContext: "{}",
          templateContext: "{}",
          category: "general",
          tags: "[]",
        },
      ]);

      const results = await manager.getTemplateFeedback("tmpl-1");
      expect(results).toHaveLength(1);
      expect(results[0].rating).toBe(4);
      expect(results[0].feedbackId).toBe("fb-1");
    });

    it("accepts limit and offset options", async () => {
      mockGraph.select.mockResolvedValueOnce([]);
      await manager.getTemplateFeedback("tmpl-1", {
        limit: 10,
        offset: 5,
      });
      expect(mockGraph.setQuery).toHaveBeenCalled();
    });
  });

  describe("getTemplateStatistics", () => {
    it("returns stats for existing template", async () => {
      mockGraph.select.mockResolvedValueOnce([
        {
          averageRating: "4.50",
          totalRatings: "10",
          lastUpdated: "2024-01-01",
        },
      ]);

      const stats = await manager.getTemplateStatistics("tmpl-1");
      expect(stats.averageRating).toBe(4.5);
      expect(stats.totalRatings).toBe(10);
    });

    it("returns defaults for unknown template", async () => {
      mockGraph.select.mockResolvedValueOnce([]);
      const stats = await manager.getTemplateStatistics("unknown");
      expect(stats.averageRating).toBe(0);
      expect(stats.totalRatings).toBe(0);
      expect(stats.lastUpdated).toBeNull();
    });
  });

  describe("getSuggestionForCategory", () => {
    it("returns specific suggestion for known category", () => {
      expect(manager.getSuggestionForCategory("performance")).toContain(
        "performance"
      );
      expect(manager.getSuggestionForCategory("usability")).toContain(
        "usability"
      );
    });

    it("returns generic suggestion for unknown category", () => {
      expect(manager.getSuggestionForCategory("unknown")).toContain(
        "improvements"
      );
    });
  });

  describe("getSuggestionForPattern", () => {
    it("returns specific suggestion for known pattern", () => {
      expect(
        manager.getSuggestionForPattern("feedback-analysis")
      ).toContain("feedback");
    });

    it("returns generic suggestion for unknown pattern", () => {
      expect(manager.getSuggestionForPattern("unknown")).toContain(
        "improvements"
      );
    });
  });

  describe("generateRecommendations", () => {
    it("generates recommendations from category patterns", () => {
      const lowRated = [];
      const categoryPatterns = [
        { category: "performance", count: 3, avgRating: 2 },
      ];
      const improvementPatterns = [];

      const recs = manager.generateRecommendations(
        lowRated,
        categoryPatterns,
        improvementPatterns
      );
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].severity).toBe("high");
    });

    it("generates recommendations from improvement patterns", () => {
      const recs = manager.generateRecommendations(
        [],
        [],
        [{ patternType: "feedback-analysis", confidence: 0.9, frequency: 5 }]
      );
      expect(recs.length).toBe(1);
    });

    it("sorts by severity and frequency", () => {
      const recs = manager.generateRecommendations(
        [],
        [
          { category: "usability", count: 5, avgRating: 3 },
          { category: "performance", count: 3, avgRating: 1 },
        ],
        []
      );
      expect(recs[0].severity).toBe("high");
    });

    it("returns empty for no data", () => {
      const recs = manager.generateRecommendations([], [], []);
      expect(recs).toHaveLength(0);
    });
  });

  describe("generateAnalytics", () => {
    it("returns analytics object", async () => {
      mockGraph.select
        .mockResolvedValueOnce([{ totalFeedback: "10" }])
        .mockResolvedValueOnce([
          { rating: "5", count: "3" },
          { rating: "4", count: "5" },
        ])
        .mockResolvedValueOnce([
          { category: "general", count: "8", avgRating: "4.2" },
        ])
        .mockResolvedValueOnce([
          {
            templateId: "tmpl-1",
            averageRating: "4.5",
            totalRatings: "6",
          },
        ]);

      const analytics = await manager.generateAnalytics();
      expect(analytics.totalFeedback).toBe(10);
      expect(analytics.ratingDistribution).toBeDefined();
      expect(analytics.categoryDistribution).toHaveLength(1);
      expect(analytics.topTemplates).toHaveLength(1);
      expect(analytics.generatedAt).toBeDefined();
    });
  });
});

describe("createGraphUserFeedbackManager", () => {
  it("creates a new manager instance", () => {
    const manager = createGraphUserFeedbackManager();
    expect(manager).toBeInstanceOf(GraphUserFeedbackManager);
  });

  it("passes options through", () => {
    const manager = createGraphUserFeedbackManager({
      feedbackDir: "/custom",
    });
    expect(manager.options.feedbackDir).toBe("/custom");
  });
});
