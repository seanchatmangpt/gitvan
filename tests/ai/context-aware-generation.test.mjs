/**
 * Tests for src/ai/context-aware-generation.mjs
 * ProjectContextAnalyzer and ContextAwareGenerator
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies
vi.mock("../../src/ai/provider.mjs", () => ({
  generateText: vi.fn(async () => "mock generated template"),
}));

vi.mock("../../src/ai/template-learning.mjs", () => ({
  templateLearning: {
    initialize: vi.fn(async () => {}),
    getInsights: vi.fn(async () => ({
      successRate: 0.85,
      totalExecutions: 100,
      successfulPatterns: [
        { pattern: "error_handling", avgDuration: 1500 },
        { pattern: "validation", avgDuration: 800 },
      ],
      failedPatterns: [{ pattern: "timeout", avgDuration: 5000 }],
    })),
    recordExecution: vi.fn(async () => {}),
  },
}));

vi.mock("../../src/ai/prompt-evolution.mjs", () => ({
  aiPromptEvolution: {
    load: vi.fn(async () => {}),
    getEvolutionHistory: vi.fn(() => [
      {
        timestamp: "2024-01-01",
        analysis: {
          success: true,
          duration: 1000,
          patterns: ["good"],
          improvements: [{ suggestion: "add cache" }],
        },
      },
    ]),
  },
}));

vi.mock("../../src/core/context.mjs", () => ({
  useGitVan: vi.fn(() => ({ root: "/test" })),
}));

vi.mock("../../src/composables/git/index.mjs", () => ({
  useGit: vi.fn(() => ({
    log: vi.fn(async () => [
      { message: "feat: add feature", files: ["src/app.tsx"] },
      { message: "fix: resolve bug", files: ["src/util.ts"] },
      { message: "test: add tests", files: ["tests/app.test.ts"] },
    ]),
  })),
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
      if (path.endsWith("package.json")) {
        return JSON.stringify({
          dependencies: { react: "^18.0.0", typescript: "^5.0.0" },
          devDependencies: { vitest: "^1.0.0" },
        });
      }
      throw new Error("File not found");
    }),
    readdir: vi.fn(async () => [
      { name: "src", isDirectory: () => true },
      { name: "tests", isDirectory: () => true },
      { name: "docs", isDirectory: () => true },
      { name: "package.json", isDirectory: () => false },
    ]),
    access: vi.fn(async (path) => {
      const existing = ["src", "tests", "docs", "eslint.config.js"];
      if (existing.some((f) => path.endsWith(f))) return;
      throw new Error("Not found");
    }),
  },
}));

import {
  ProjectContextAnalyzer,
  ContextAwareGenerator,
} from "../../src/ai/context-aware-generation.mjs";

describe("ProjectContextAnalyzer", () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ProjectContextAnalyzer();
  });

  describe("detectFramework", () => {
    it("detects React framework", () => {
      expect(
        analyzer.detectFramework({ dependencies: { react: "^18" } })
      ).toBe("react");
    });

    it("detects Next.js framework", () => {
      expect(
        analyzer.detectFramework({ dependencies: { next: "^14" } })
      ).toBe("nextjs");
    });

    it("detects Vue framework", () => {
      expect(
        analyzer.detectFramework({ dependencies: { vue: "^3" } })
      ).toBe("vue");
    });

    it("detects Express framework", () => {
      expect(
        analyzer.detectFramework({ dependencies: { express: "^4" } })
      ).toBe("express");
    });

    it("returns unknown for no matching framework", () => {
      expect(analyzer.detectFramework({ dependencies: {} })).toBe("unknown");
    });

    it("checks devDependencies too", () => {
      expect(
        analyzer.detectFramework({ devDependencies: { svelte: "^4" } })
      ).toBe("svelte");
    });
  });

  describe("detectProjectType", () => {
    it("detects react-app", () => {
      expect(
        analyzer.detectProjectType({ dependencies: { react: "^18" } })
      ).toBe("react-app");
    });

    it("detects node-api for express", () => {
      expect(
        analyzer.detectProjectType({ dependencies: { express: "^4" } })
      ).toBe("node-api");
    });

    it("detects typescript-project", () => {
      expect(
        analyzer.detectProjectType({
          devDependencies: { typescript: "^5" },
        })
      ).toBe("typescript-project");
    });

    it("defaults to javascript-project", () => {
      expect(
        analyzer.detectProjectType({ dependencies: {}, devDependencies: {} })
      ).toBe("javascript-project");
    });
  });

  describe("analyzeProjectContext", () => {
    it("analyzes project and returns context", async () => {
      const context = await analyzer.analyzeProjectContext("/test/project");
      expect(context.framework).toBe("react");
      expect(context.projectType).toBe("react-app");
      expect(context.dependencies).toContain("react");
      expect(context.projectStructure).toBeDefined();
    });

    it("caches analysis results", async () => {
      const first = await analyzer.analyzeProjectContext("/test/project");
      const second = await analyzer.analyzeProjectContext("/test/project");
      expect(first).toBe(second);
    });
  });

  describe("analyzeProjectStructure", () => {
    it("identifies common directories", async () => {
      const structure = await analyzer.analyzeProjectStructure("/test/project");
      expect(structure.hasSrc).toBe(true);
      expect(structure.hasTests).toBe(true);
      expect(structure.hasDocs).toBe(true);
      expect(structure.directories).toContain("src");
    });
  });
});

describe("ContextAwareGenerator", () => {
  let generator;

  beforeEach(() => {
    generator = new ContextAwareGenerator();
  });

  describe("initialize", () => {
    it("initializes once", async () => {
      await generator.initialize();
      expect(generator.isInitialized).toBe(true);
    });

    it("does not reinitialize", async () => {
      await generator.initialize();
      await generator.initialize();
      // isInitialized should still be true, second call is a no-op
      expect(generator.isInitialized).toBe(true);
    });
  });

  describe("buildEnrichedPrompt", () => {
    it("builds prompt with context data", async () => {
      const projectContext = {
        projectType: "react-app",
        framework: "react",
        dependencies: ["react", "typescript"],
        teamConventions: ["uses_eslint"],
        projectStructure: { hasSrc: true },
        gitHistory: { commitPatterns: ["feature_commits"] },
      };
      const insights = {
        successRate: 0.85,
        totalExecutions: 100,
        successfulPatterns: [{ pattern: "validation" }],
        failedPatterns: [{ pattern: "timeout" }],
      };
      const history = [];

      const prompt = await generator.buildEnrichedPrompt(
        "create a component",
        projectContext,
        insights,
        history,
        {}
      );
      expect(prompt).toContain("create a component");
      expect(prompt).toContain("react-app");
      expect(prompt).toContain("react");
    });
  });

  describe("getContextRecommendations", () => {
    it("returns recommendations array", async () => {
      const recs = await generator.getContextRecommendations("/test/project");
      expect(Array.isArray(recs)).toBe(true);
    });
  });
});
