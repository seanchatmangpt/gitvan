/**
 * Tests for Audit Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/composables/git/index.mjs", () => ({
  useGit: vi.fn(() => ({
    status: vi.fn(async () => ({ branch: "main", clean: true })),
  })),
}));

vi.mock("../../../src/composables/notes.mjs", () => ({
  useNotes: vi.fn(() => ({
    getAllReceipts: vi.fn(async () => []),
    getReceipt: vi.fn(async () => ({})),
    verifyReceiptSignature: vi.fn(async () => true),
    verifyReceiptHash: vi.fn(async () => true),
  })),
}));

vi.mock("../../../src/utils/fs.mjs", () => ({
  writeFileSafe: vi.fn(async () => {}),
}));

vi.mock("../../../src/config/loader.mjs", () => ({
  loadOptions: vi.fn(async () => ({
    rootDir: "/tmp/test",
    version: "3.0.0",
  })),
}));

vi.mock("../../../src/schemas/receipt.zod.mjs", () => ({
  Receipt: {},
  ReceiptQuery: {},
}));

vi.mock("js-yaml", () => ({
  default: {
    dump: vi.fn((obj) => JSON.stringify(obj)),
  },
}));

import { auditCommand } from "../../../src/cli/commands/audit.mjs";

describe("Audit Command", () => {
  describe("auditCommand", () => {
    it("should be defined", () => {
      expect(auditCommand).toBeDefined();
      expect(auditCommand.meta).toBeDefined();
      expect(auditCommand.meta.name).toBe("audit");
    });

    it("should have proper metadata", () => {
      expect(auditCommand.meta.description).toContain("audit");
    });

    it("should have all required subcommands", () => {
      expect(auditCommand.subCommands).toBeDefined();
      expect(auditCommand.subCommands.build).toBeDefined();
      expect(auditCommand.subCommands.verify).toBeDefined();
      expect(auditCommand.subCommands.list).toBeDefined();
      expect(auditCommand.subCommands.show).toBeDefined();
    });
  });

  describe("build subcommand", () => {
    const buildCmd = auditCommand.subCommands.build;

    it("should be properly defined", () => {
      expect(buildCmd).toBeDefined();
      expect(buildCmd.meta.name).toBe("build");
      expect(buildCmd.meta.description).toContain("Build");
    });

    it("should have output argument with default", () => {
      expect(buildCmd.args.output).toBeDefined();
      expect(buildCmd.args.output.type).toBe("string");
      expect(buildCmd.args.output.default).toBe("audit-pack.json");
    });

    it("should have include-metadata flag", () => {
      expect(buildCmd.args["include-metadata"]).toBeDefined();
      expect(buildCmd.args["include-metadata"].type).toBe("boolean");
      expect(buildCmd.args["include-metadata"].default).toBe(true);
    });

    it("should have compress flag", () => {
      expect(buildCmd.args.compress).toBeDefined();
      expect(buildCmd.args.compress.type).toBe("boolean");
      expect(buildCmd.args.compress.default).toBe(false);
    });

    it("should have since and until date filters", () => {
      expect(buildCmd.args.since).toBeDefined();
      expect(buildCmd.args.since.type).toBe("string");
      expect(buildCmd.args.until).toBeDefined();
      expect(buildCmd.args.until.type).toBe("string");
    });

    it("should have verbose flag", () => {
      expect(buildCmd.args.verbose).toBeDefined();
      expect(buildCmd.args.verbose.type).toBe("boolean");
      expect(buildCmd.args.verbose.default).toBe(false);
    });
  });

  describe("verify subcommand", () => {
    const verifyCmd = auditCommand.subCommands.verify;

    it("should be properly defined", () => {
      expect(verifyCmd).toBeDefined();
      expect(verifyCmd.meta.name).toBe("verify");
      expect(verifyCmd.meta.description).toContain("Verify");
    });

    it("should require receipt argument", () => {
      expect(verifyCmd.args.receipt).toBeDefined();
      expect(verifyCmd.args.receipt.type).toBe("string");
      expect(verifyCmd.args.receipt.required).toBe(true);
    });

    it("should have check-signature flag", () => {
      expect(verifyCmd.args["check-signature"]).toBeDefined();
      expect(verifyCmd.args["check-signature"].type).toBe("boolean");
      expect(verifyCmd.args["check-signature"].default).toBe(true);
    });

    it("should have check-hash flag", () => {
      expect(verifyCmd.args["check-hash"]).toBeDefined();
      expect(verifyCmd.args["check-hash"].type).toBe("boolean");
      expect(verifyCmd.args["check-hash"].default).toBe(true);
    });

    it("should have verbose flag", () => {
      expect(verifyCmd.args.verbose).toBeDefined();
      expect(verifyCmd.args.verbose.type).toBe("boolean");
    });
  });

  describe("list subcommand", () => {
    const listCmd = auditCommand.subCommands.list;

    it("should be properly defined", () => {
      expect(listCmd).toBeDefined();
      expect(listCmd.meta.name).toBe("list");
      expect(listCmd.meta.description).toContain("List");
    });

    it("should have job-name filter", () => {
      expect(listCmd.args["job-name"]).toBeDefined();
      expect(listCmd.args["job-name"].type).toBe("string");
    });

    it("should have date range filters", () => {
      expect(listCmd.args.since).toBeDefined();
      expect(listCmd.args.until).toBeDefined();
    });

    it("should have status filter", () => {
      expect(listCmd.args.status).toBeDefined();
      expect(listCmd.args.status.type).toBe("string");
    });

    it("should have limit with default of 50", () => {
      expect(listCmd.args.limit).toBeDefined();
      expect(listCmd.args.limit.type).toBe("number");
      expect(listCmd.args.limit.default).toBe(50);
    });

    it("should have verbose flag", () => {
      expect(listCmd.args.verbose).toBeDefined();
      expect(listCmd.args.verbose.type).toBe("boolean");
    });
  });

  describe("show subcommand", () => {
    const showCmd = auditCommand.subCommands.show;

    it("should be properly defined", () => {
      expect(showCmd).toBeDefined();
      expect(showCmd.meta.name).toBe("show");
      expect(showCmd.meta.description).toContain("Show");
    });

    it("should require receipt argument", () => {
      expect(showCmd.args.receipt).toBeDefined();
      expect(showCmd.args.receipt.type).toBe("string");
      expect(showCmd.args.receipt.required).toBe(true);
    });

    it("should have show-output flag", () => {
      expect(showCmd.args["show-output"]).toBeDefined();
      expect(showCmd.args["show-output"].type).toBe("boolean");
      expect(showCmd.args["show-output"].default).toBe(false);
    });

    it("should have show-logs flag", () => {
      expect(showCmd.args["show-logs"]).toBeDefined();
      expect(showCmd.args["show-logs"].type).toBe("boolean");
      expect(showCmd.args["show-logs"].default).toBe(false);
    });

    it("should have format argument with table default", () => {
      expect(showCmd.args.format).toBeDefined();
      expect(showCmd.args.format.type).toBe("string");
      expect(showCmd.args.format.default).toBe("table");
    });
  });
});

describe("Audit Command Integration", () => {
  describe("build subcommand run", () => {
    it("should handle empty receipts gracefully", async () => {
      const { useNotes } = await import(
        "../../../src/composables/notes.mjs"
      );
      useNotes.mockReturnValue({
        getAllReceipts: vi.fn(async () => []),
      });

      const buildCmd = auditCommand.subCommands.build;
      // Should not throw when no receipts exist
      await expect(
        buildCmd.run({
          args: {
            output: "audit-pack.json",
            "include-metadata": true,
            compress: false,
            since: "",
            until: "",
            verbose: false,
          },
        })
      ).resolves.not.toThrow();
    });

    it("should write audit pack with receipts", async () => {
      const { useNotes } = await import(
        "../../../src/composables/notes.mjs"
      );
      const { writeFileSafe } = await import("../../../src/utils/fs.mjs");

      useNotes.mockReturnValue({
        getAllReceipts: vi.fn(async () => [
          {
            id: "receipt-1",
            jobName: "test-job",
            timestamp: "2024-06-01T00:00:00Z",
            status: "success",
            duration: 100,
          },
        ]),
      });

      const buildCmd = auditCommand.subCommands.build;
      await buildCmd.run({
        args: {
          output: "/tmp/test-audit.json",
          "include-metadata": true,
          compress: false,
          since: "",
          until: "",
          verbose: false,
        },
      });

      expect(writeFileSafe).toHaveBeenCalled();
      const writtenContent = JSON.parse(writeFileSafe.mock.calls[0][1]);
      expect(writtenContent.receipts).toHaveLength(1);
      expect(writtenContent.receipts[0].jobName).toBe("test-job");
    });

    it("should filter receipts by date range", async () => {
      const { useNotes } = await import(
        "../../../src/composables/notes.mjs"
      );
      const { writeFileSafe } = await import("../../../src/utils/fs.mjs");

      useNotes.mockReturnValue({
        getAllReceipts: vi.fn(async () => [
          {
            id: "r1",
            jobName: "job-a",
            timestamp: "2024-01-15T00:00:00Z",
            status: "success",
          },
          {
            id: "r2",
            jobName: "job-b",
            timestamp: "2024-06-15T00:00:00Z",
            status: "success",
          },
          {
            id: "r3",
            jobName: "job-c",
            timestamp: "2024-12-15T00:00:00Z",
            status: "success",
          },
        ]),
      });

      writeFileSafe.mockClear();

      const buildCmd = auditCommand.subCommands.build;
      await buildCmd.run({
        args: {
          output: "/tmp/filtered.json",
          "include-metadata": true,
          compress: false,
          since: "2024-03-01",
          until: "2024-09-01",
          verbose: false,
        },
      });

      expect(writeFileSafe).toHaveBeenCalled();
      const writtenContent = JSON.parse(writeFileSafe.mock.calls[0][1]);
      expect(writtenContent.receipts).toHaveLength(1);
      expect(writtenContent.receipts[0].id).toBe("r2");
    });

    it("should produce compressed output when compress flag is set", async () => {
      const { useNotes } = await import(
        "../../../src/composables/notes.mjs"
      );
      const { writeFileSafe } = await import("../../../src/utils/fs.mjs");

      useNotes.mockReturnValue({
        getAllReceipts: vi.fn(async () => [
          {
            id: "r1",
            jobName: "job-a",
            timestamp: "2024-01-15T00:00:00Z",
            status: "success",
          },
        ]),
      });

      writeFileSafe.mockClear();

      const buildCmd = auditCommand.subCommands.build;
      await buildCmd.run({
        args: {
          output: "/tmp/compressed.json",
          "include-metadata": false,
          compress: true,
          since: "",
          until: "",
          verbose: false,
        },
      });

      expect(writeFileSafe).toHaveBeenCalled();
      const written = writeFileSafe.mock.calls[0][1];
      // Compressed output should not have newlines (minified)
      expect(written).not.toContain("\n");
    });
  });

  describe("verify subcommand run", () => {
    it("should verify receipt with signature and hash", async () => {
      const { useNotes } = await import(
        "../../../src/composables/notes.mjs"
      );

      useNotes.mockReturnValue({
        getReceipt: vi.fn(async () => ({
          id: "receipt-1",
          jobName: "test-job",
          timestamp: "2024-06-01T00:00:00Z",
          status: "success",
          duration: 100,
          verified: true,
        })),
        verifyReceiptSignature: vi.fn(async () => true),
        verifyReceiptHash: vi.fn(async () => true),
      });

      const verifyCmd = auditCommand.subCommands.verify;
      await expect(
        verifyCmd.run({
          args: {
            receipt: "receipt-1",
            "check-signature": true,
            "check-hash": true,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();
    });
  });

  describe("list subcommand run", () => {
    it("should list receipts without error", async () => {
      const { useNotes } = await import(
        "../../../src/composables/notes.mjs"
      );

      useNotes.mockReturnValue({
        getAllReceipts: vi.fn(async () => [
          {
            id: "r1",
            jobName: "job-a",
            timestamp: "2024-06-01T00:00:00Z",
            status: "success",
            duration: 50,
          },
        ]),
      });

      const listCmd = auditCommand.subCommands.list;
      await expect(
        listCmd.run({
          args: {
            "job-name": "",
            since: "",
            until: "",
            status: "",
            limit: 50,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();
    });

    it("should filter by job name", async () => {
      const { useNotes } = await import(
        "../../../src/composables/notes.mjs"
      );

      const getAllReceipts = vi.fn(async () => [
        { id: "r1", jobName: "deploy-job", timestamp: "2024-06-01T00:00:00Z", status: "success", duration: 50 },
        { id: "r2", jobName: "test-job", timestamp: "2024-06-01T00:00:00Z", status: "success", duration: 30 },
      ]);

      useNotes.mockReturnValue({ getAllReceipts });

      const listCmd = auditCommand.subCommands.list;
      await expect(
        listCmd.run({
          args: {
            "job-name": "deploy",
            since: "",
            until: "",
            status: "",
            limit: 50,
            verbose: false,
          },
        })
      ).resolves.not.toThrow();
    });
  });
});

export default auditCommand;
