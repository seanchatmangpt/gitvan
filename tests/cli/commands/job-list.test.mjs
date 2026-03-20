/**
 * Tests for Job List Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockJobList = vi.fn().mockResolvedValue([]);

vi.mock("../../../src/core/context.mjs", () => ({
  withGitVan: vi.fn(async (ctx, fn) => fn()),
}));

vi.mock("../../../src/composables/job.mjs", () => ({
  useJob: () => ({
    list: mockJobList,
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

const { listSubcommand } = await import(
  "../../../src/cli/commands/job-list.mjs"
);

describe("Job List Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listSubcommand", () => {
    it("should be defined", () => {
      expect(listSubcommand).toBeDefined();
      expect(listSubcommand.meta).toBeDefined();
      expect(listSubcommand.meta.name).toBe("list");
    });

    it("should have proper description", () => {
      expect(listSubcommand.meta.description).toContain("List");
    });

    it("should have usage and examples", () => {
      expect(listSubcommand.meta.usage).toContain("gitvan job list");
      expect(listSubcommand.meta.examples).toBeDefined();
      expect(listSubcommand.meta.examples.length).toBeGreaterThan(0);
    });

    it("should export as default", async () => {
      const mod = await import("../../../src/cli/commands/job-list.mjs");
      expect(mod.default).toBe(mod.listSubcommand);
    });
  });

  describe("arguments", () => {
    it("should have verbose argument", () => {
      expect(listSubcommand.args.verbose).toBeDefined();
      expect(listSubcommand.args.verbose.type).toBe("boolean");
      expect(listSubcommand.args.verbose.default).toBe(false);
    });

    it("should have filter argument", () => {
      expect(listSubcommand.args.filter).toBeDefined();
      expect(listSubcommand.args.filter.type).toBe("string");
    });

    it("should have format argument with default table", () => {
      expect(listSubcommand.args.format).toBeDefined();
      expect(listSubcommand.args.format.type).toBe("string");
      expect(listSubcommand.args.format.default).toBe("table");
    });
  });

  describe("run", () => {
    it("should handle empty job list", async () => {
      mockJobList.mockResolvedValueOnce([]);
      await listSubcommand.run({
        args: { verbose: false, format: "table" },
      });
      expect(mockJobList).toHaveBeenCalled();
    });

    it("should list jobs in table format", async () => {
      mockJobList.mockResolvedValueOnce([
        {
          id: "job-1",
          name: "Test Job",
          description: "A test job",
          tags: ["test"],
          cron: null,
          file: "/test.mjs",
        },
      ]);
      await listSubcommand.run({
        args: { verbose: false, format: "table" },
      });
      expect(mockJobList).toHaveBeenCalled();
    });

    it("should list jobs in json format", async () => {
      mockJobList.mockResolvedValueOnce([
        {
          id: "job-1",
          name: "Test Job",
          description: "A test",
          tags: [],
          file: "/test.mjs",
        },
      ]);
      await listSubcommand.run({
        args: { verbose: false, format: "json" },
      });
      expect(mockJobList).toHaveBeenCalled();
    });

    it("should list jobs in yaml format", async () => {
      mockJobList.mockResolvedValueOnce([
        {
          id: "job-1",
          name: "Test Job",
          description: "A test",
          tags: ["deploy"],
          cron: "0 * * * *",
          file: "/test.mjs",
        },
      ]);
      await listSubcommand.run({
        args: { verbose: false, format: "yaml" },
      });
      expect(mockJobList).toHaveBeenCalled();
    });

    it("should show verbose details in table format", async () => {
      mockJobList.mockResolvedValueOnce([
        {
          id: "job-1",
          name: "Test Job",
          description: "A test job",
          tags: ["test", "ci"],
          cron: "*/5 * * * *",
          file: "/test.mjs",
        },
      ]);
      await listSubcommand.run({
        args: { verbose: true, format: "table" },
      });
      expect(mockJobList).toHaveBeenCalledWith(
        expect.objectContaining({ includeMetadata: true })
      );
    });

    it("should apply name filter", async () => {
      mockJobList.mockResolvedValueOnce([]);
      await listSubcommand.run({
        args: { verbose: false, format: "table", filter: "name=test" },
      });
      expect(mockJobList).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ name: "test" }),
        })
      );
    });

    it("should apply tag filter", async () => {
      mockJobList.mockResolvedValueOnce([]);
      await listSubcommand.run({
        args: { verbose: false, format: "table", filter: "tag=deploy" },
      });
      expect(mockJobList).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ tags: ["deploy"] }),
        })
      );
    });

    it("should handle truncation of long values in table", async () => {
      mockJobList.mockResolvedValueOnce([
        {
          id: "a-very-long-job-identifier-name",
          name: "A Very Long Job Name That Exceeds",
          description: "A very long description that should be truncated in the output",
          tags: [],
          file: "/test.mjs",
        },
      ]);
      await listSubcommand.run({
        args: { verbose: false, format: "table" },
      });
      expect(mockJobList).toHaveBeenCalled();
    });
  });
});
