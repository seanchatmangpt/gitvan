/**
 * Tests for Job Search and Chain Commands
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockJobSearch = vi.fn().mockResolvedValue([]);
const mockJobRun = vi.fn().mockResolvedValue({ status: "success" });

vi.mock("../../../src/core/context.mjs", () => ({
  withGitVan: vi.fn(async (ctx, fn) => fn()),
}));

vi.mock("../../../src/composables/job.mjs", () => ({
  useJob: () => ({
    search: mockJobSearch,
    run: mockJobRun,
  }),
}));

vi.mock("../../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  }),
}));

vi.mock("../../../src/core/error-handler.mjs", () => ({
  exitWithError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("consola", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    start: vi.fn(),
    warn: vi.fn(),
  },
}));

const { searchSubcommand, chainSubcommand } = await import(
  "../../../src/cli/commands/job-search.mjs"
);

describe("Job Search Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchSubcommand", () => {
    it("should be defined", () => {
      expect(searchSubcommand).toBeDefined();
      expect(searchSubcommand.meta).toBeDefined();
      expect(searchSubcommand.meta.name).toBe("search");
    });

    it("should have proper description", () => {
      expect(searchSubcommand.meta.description).toContain("Search");
    });

    it("should have usage and examples", () => {
      expect(searchSubcommand.meta.usage).toContain("gitvan job search");
      expect(searchSubcommand.meta.examples).toBeDefined();
      expect(searchSubcommand.meta.examples.length).toBeGreaterThan(0);
    });

    it("should export searchSubcommand as default", async () => {
      const mod = await import("../../../src/cli/commands/job-search.mjs");
      expect(mod.default).toBe(mod.searchSubcommand);
    });
  });

  describe("search arguments", () => {
    it("should have required query positional argument", () => {
      expect(searchSubcommand.args.query).toBeDefined();
      expect(searchSubcommand.args.query.type).toBe("positional");
      expect(searchSubcommand.args.query.required).toBe(true);
    });
  });

  describe("search run", () => {
    it("should handle no results", async () => {
      mockJobSearch.mockResolvedValueOnce([]);
      await searchSubcommand.run({ args: { query: "nonexistent" } });
      expect(mockJobSearch).toHaveBeenCalledWith("nonexistent");
    });

    it("should display search results", async () => {
      mockJobSearch.mockResolvedValueOnce([
        {
          id: "job-1",
          name: "Test Job",
          description: "A test",
          tags: ["test"],
        },
        {
          id: "job-2",
          name: "Deploy Job",
          description: "Deployment",
          tags: [],
        },
      ]);
      await searchSubcommand.run({ args: { query: "test" } });
      expect(mockJobSearch).toHaveBeenCalledWith("test");
    });

    it("should display jobs with tags", async () => {
      mockJobSearch.mockResolvedValueOnce([
        {
          id: "deploy-job",
          name: "Deploy",
          description: "Deploy to prod",
          tags: ["deploy", "production"],
        },
      ]);
      await searchSubcommand.run({ args: { query: "deploy" } });
      expect(mockJobSearch).toHaveBeenCalledWith("deploy");
    });
  });
});

describe("Job Chain Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("chainSubcommand", () => {
    it("should be defined", () => {
      expect(chainSubcommand).toBeDefined();
      expect(chainSubcommand.meta).toBeDefined();
      expect(chainSubcommand.meta.name).toBe("chain");
    });

    it("should have proper description", () => {
      expect(chainSubcommand.meta.description).toContain("Chain");
    });

    it("should have usage and examples", () => {
      expect(chainSubcommand.meta.usage).toContain("gitvan job chain");
      expect(chainSubcommand.meta.examples).toBeDefined();
    });
  });

  describe("chain arguments", () => {
    it("should have required jobs positional argument", () => {
      expect(chainSubcommand.args.jobs).toBeDefined();
      expect(chainSubcommand.args.jobs.type).toBe("positional");
      expect(chainSubcommand.args.jobs.required).toBe(true);
    });
  });

  describe("chain run", () => {
    it("should require at least 2 jobs", async () => {
      await chainSubcommand.run({ args: { _: ["only-one"] } });
      const { exitWithError } = await import(
        "../../../src/core/error-handler.mjs"
      );
      expect(exitWithError).toHaveBeenCalled();
    });

    it("should require jobs array", async () => {
      await chainSubcommand.run({ args: { _: undefined } });
      const { exitWithError } = await import(
        "../../../src/core/error-handler.mjs"
      );
      expect(exitWithError).toHaveBeenCalled();
    });

    it("should chain multiple jobs sequentially", async () => {
      mockJobRun
        .mockResolvedValueOnce({ result: "build-done" })
        .mockResolvedValueOnce({ result: "test-done" });

      await chainSubcommand.run({
        args: { _: ["build", "test"] },
      });

      expect(mockJobRun).toHaveBeenCalledTimes(2);
      // First call should have no previousResult
      expect(mockJobRun).toHaveBeenNthCalledWith(1, "build", {
        payload: {
          previousResult: null,
          chainIndex: 0,
          chainTotal: 2,
        },
      });
      // Second call should have first result as previousResult
      expect(mockJobRun).toHaveBeenNthCalledWith(2, "test", {
        payload: {
          previousResult: { result: "build-done" },
          chainIndex: 1,
          chainTotal: 2,
        },
      });
    });

    it("should handle job failure in chain", async () => {
      mockJobRun.mockRejectedValueOnce(new Error("Build failed"));

      await chainSubcommand.run({
        args: { _: ["build", "test", "deploy"] },
      });

      // exitWithError is called when a job fails
      const { exitWithError } = await import(
        "../../../src/core/error-handler.mjs"
      );
      expect(exitWithError).toHaveBeenCalled();
    });
  });
});
