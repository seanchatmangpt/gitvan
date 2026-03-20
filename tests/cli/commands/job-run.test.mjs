/**
 * Tests for Job Run Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockJobRun = vi.fn().mockResolvedValue({ status: "success" });
const mockJobRunWithLock = vi.fn().mockResolvedValue({ status: "success" });

vi.mock("../../../src/core/context.mjs", () => ({
  withGitVan: vi.fn(async (ctx, fn) => fn()),
}));

vi.mock("../../../src/composables/job.mjs", () => ({
  useJob: () => ({
    run: mockJobRun,
    runWithLock: mockJobRunWithLock,
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

const { runSubcommand } = await import(
  "../../../src/cli/commands/job-run.mjs"
);

describe("Job Run Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runSubcommand", () => {
    it("should be defined", () => {
      expect(runSubcommand).toBeDefined();
      expect(runSubcommand.meta).toBeDefined();
      expect(runSubcommand.meta.name).toBe("run");
    });

    it("should have proper description", () => {
      expect(runSubcommand.meta.description).toContain("Execute");
    });

    it("should have usage and examples", () => {
      expect(runSubcommand.meta.usage).toContain("gitvan job run");
      expect(runSubcommand.meta.examples).toBeDefined();
      expect(runSubcommand.meta.examples.length).toBeGreaterThan(0);
    });

    it("should export as default", async () => {
      const mod = await import("../../../src/cli/commands/job-run.mjs");
      expect(mod.default).toBe(mod.runSubcommand);
    });
  });

  describe("arguments", () => {
    it("should have required jobId positional argument", () => {
      expect(runSubcommand.args.jobId).toBeDefined();
      expect(runSubcommand.args.jobId.type).toBe("positional");
      expect(runSubcommand.args.jobId.required).toBe(true);
    });

    it("should have payload argument", () => {
      expect(runSubcommand.args.payload).toBeDefined();
      expect(runSubcommand.args.payload.type).toBe("string");
    });

    it("should have with-lock boolean argument", () => {
      expect(runSubcommand.args["with-lock"]).toBeDefined();
      expect(runSubcommand.args["with-lock"].type).toBe("boolean");
      expect(runSubcommand.args["with-lock"].default).toBe(false);
    });
  });

  describe("run", () => {
    it("should execute a job by id", async () => {
      mockJobRun.mockResolvedValueOnce({ status: "done" });
      await runSubcommand.run({
        args: { jobId: "my-job", "with-lock": false },
      });
      expect(mockJobRun).toHaveBeenCalledWith("my-job", { payload: {} });
    });

    it("should parse payload string", async () => {
      mockJobRun.mockResolvedValueOnce({ status: "done" });
      await runSubcommand.run({
        args: { jobId: "my-job", payload: "key=value", "with-lock": false },
      });
      expect(mockJobRun).toHaveBeenCalledWith("my-job", {
        payload: { key: "value" },
      });
    });

    it("should handle payload array", async () => {
      mockJobRun.mockResolvedValueOnce({ status: "done" });
      await runSubcommand.run({
        args: {
          jobId: "my-job",
          payload: ["key1=val1", "key2=val2"],
          "with-lock": false,
        },
      });
      expect(mockJobRun).toHaveBeenCalledWith("my-job", {
        payload: { key1: "val1", key2: "val2" },
      });
    });

    it("should use runWithLock when with-lock is true", async () => {
      mockJobRunWithLock.mockResolvedValueOnce({ status: "done" });
      await runSubcommand.run({
        args: { jobId: "my-job", "with-lock": true },
      });
      expect(mockJobRunWithLock).toHaveBeenCalledWith("my-job", {
        payload: {},
      });
      expect(mockJobRun).not.toHaveBeenCalled();
    });

    it("should handle job returning an object result", async () => {
      mockJobRun.mockResolvedValueOnce({ output: "test-result" });
      await runSubcommand.run({
        args: { jobId: "my-job", "with-lock": false },
      });
      expect(mockJobRun).toHaveBeenCalled();
    });

    it("should handle job returning null", async () => {
      mockJobRun.mockResolvedValueOnce(null);
      await runSubcommand.run({
        args: { jobId: "my-job", "with-lock": false },
      });
      expect(mockJobRun).toHaveBeenCalled();
    });

    it("should handle no payload provided", async () => {
      mockJobRun.mockResolvedValueOnce({});
      await runSubcommand.run({
        args: { jobId: "test-job", "with-lock": false },
      });
      expect(mockJobRun).toHaveBeenCalledWith("test-job", { payload: {} });
    });
  });
});
