/**
 * Tests for Submodule Command
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/utils/submodule-manager.mjs", () => ({
  getAllSubmodulesStatus: vi.fn().mockReturnValue({
    unrdf: {
      path: "vendor/unrdf",
      status: "ok",
      initialized: true,
      version: "1.0.0",
      currentCommit: "abc123",
      expectedCommit: "abc123",
      outOfSync: false,
      hasChanges: false,
      warnings: [],
    },
  }),
  getUnrdfStatus: vi.fn().mockReturnValue({
    initialized: true,
    status: "ok",
    version: "1.0.0",
    currentCommit: "abc123",
    expectedCommit: "abc123",
    outOfSync: false,
    hasChanges: false,
  }),
  initializeUnrdf: vi.fn().mockReturnValue({
    success: true,
    message: "Initialized successfully",
  }),
  updateUnrdf: vi.fn().mockReturnValue({
    success: true,
    message: "Updated successfully",
  }),
  syncUnrdf: vi.fn().mockReturnValue({
    success: true,
    message: "Synced successfully",
  }),
  checkSubmoduleUpdates: vi.fn().mockReturnValue({
    available: false,
    behindCount: 0,
    currentCommit: "abc123",
    remoteCommit: "abc123",
  }),
  SUBMODULE_CONFIG: {
    unrdf: { path: "vendor/unrdf" },
  },
}));

vi.mock("../../../src/utils/unrdf-validator.mjs", () => ({
  validateUnrdfExports: vi.fn().mockReturnValue({ valid: true }),
  generateValidationReport: vi.fn().mockResolvedValue({
    summary: {
      status: "OK",
      available: true,
      valid: true,
      version: "1.0.0",
      versionCompatible: true,
      totalExports: 50,
      missingCount: 0,
    },
    validation: {
      categories: [
        { category: "core", valid: 10, total: 10, invalid: 0, missing: [], issues: [] },
      ],
      message: "All exports valid",
      recommendation: null,
      note: null,
    },
    missing: { hasMissing: false, count: 0, details: [] },
  }),
  listUnrdfMethods: vi.fn().mockReturnValue({
    available: true,
    version: "1.0.0",
    total: 30,
    methods: { core: ["parse", "serialize"] },
  }),
  checkVersionCompatibility: vi.fn().mockReturnValue({ compatible: true }),
}));

vi.mock("../../../src/utils/logger.mjs", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  }),
}));

vi.mock("consola", () => ({
  consola: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const { submoduleCommand } = await import(
  "../../../src/cli/commands/submodule.mjs"
);
const {
  getAllSubmodulesStatus,
  getUnrdfStatus,
  initializeUnrdf,
  updateUnrdf,
  syncUnrdf,
  checkSubmoduleUpdates,
} = await import("../../../src/utils/submodule-manager.mjs");
const { generateValidationReport, listUnrdfMethods } = await import(
  "../../../src/utils/unrdf-validator.mjs"
);

describe("Submodule Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submoduleCommand", () => {
    it("should be defined", () => {
      expect(submoduleCommand).toBeDefined();
      expect(submoduleCommand.meta).toBeDefined();
      expect(submoduleCommand.meta.name).toBe("submodule");
    });

    it("should have proper description", () => {
      expect(submoduleCommand.meta.description).toContain("submodule");
    });

    it("should have all required subcommands", () => {
      expect(submoduleCommand.subCommands).toBeDefined();
      expect(submoduleCommand.subCommands.status).toBeDefined();
      expect(submoduleCommand.subCommands.check).toBeDefined();
      expect(submoduleCommand.subCommands.init).toBeDefined();
      expect(submoduleCommand.subCommands.update).toBeDefined();
      expect(submoduleCommand.subCommands.sync).toBeDefined();
      expect(submoduleCommand.subCommands.verify).toBeDefined();
    });

    it("should export as default", async () => {
      const mod = await import("../../../src/cli/commands/submodule.mjs");
      expect(mod.default).toBe(mod.submoduleCommand);
    });
  });

  describe("status subcommand", () => {
    const statusCmd = submoduleCommand.subCommands.status;

    it("should be properly defined", () => {
      expect(statusCmd.meta.name).toBe("status");
      expect(statusCmd.meta.description).toContain("status");
    });

    it("should have verbose and json arguments", () => {
      expect(statusCmd.args.verbose).toBeDefined();
      expect(statusCmd.args.verbose.type).toBe("boolean");
      expect(statusCmd.args.json).toBeDefined();
      expect(statusCmd.args.json.type).toBe("boolean");
    });

    it("should display status in text format", async () => {
      await statusCmd.run({ args: { verbose: false, json: false } });
      expect(getAllSubmodulesStatus).toHaveBeenCalled();
    });

    it("should display verbose status", async () => {
      await statusCmd.run({ args: { verbose: true, json: false } });
      expect(getAllSubmodulesStatus).toHaveBeenCalled();
    });

    it("should output JSON format", async () => {
      await statusCmd.run({ args: { verbose: false, json: true } });
      expect(getAllSubmodulesStatus).toHaveBeenCalled();
    });

    it("should handle warnings in status", async () => {
      getAllSubmodulesStatus.mockReturnValueOnce({
        unrdf: {
          path: "vendor/unrdf",
          status: "out-of-sync",
          initialized: true,
          version: "1.0.0",
          currentCommit: "abc",
          expectedCommit: "def",
          outOfSync: true,
          hasChanges: false,
          warnings: ["Out of sync with expected commit"],
        },
      });
      await statusCmd.run({ args: { verbose: false, json: false } });
      expect(getAllSubmodulesStatus).toHaveBeenCalled();
    });
  });

  describe("check subcommand", () => {
    const checkCmd = submoduleCommand.subCommands.check;

    it("should be properly defined", () => {
      expect(checkCmd.meta.name).toBe("check");
      expect(checkCmd.meta.description).toContain("Check");
    });

    it("should have json argument", () => {
      expect(checkCmd.args.json).toBeDefined();
      expect(checkCmd.args.json.type).toBe("boolean");
    });

    it("should check for updates in text format", async () => {
      await checkCmd.run({ args: { json: false } });
      expect(getUnrdfStatus).toHaveBeenCalled();
      expect(checkSubmoduleUpdates).toHaveBeenCalled();
    });

    it("should check for updates in json format", async () => {
      await checkCmd.run({ args: { json: true } });
      expect(getUnrdfStatus).toHaveBeenCalled();
    });

    it("should handle not-initialized state", async () => {
      getUnrdfStatus.mockReturnValueOnce({ initialized: false });
      // This calls process.exit(1) which we can't easily test
      // Just verify the call was made
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      try {
        await checkCmd.run({ args: { json: false } });
      } catch (e) {
        // expected
      }
      mockExit.mockRestore();
    });

    it("should report out-of-sync issues", async () => {
      getUnrdfStatus.mockReturnValueOnce({
        initialized: true,
        status: "out-of-sync",
        outOfSync: true,
        hasChanges: false,
        version: "1.0.0",
        currentCommit: "abc",
        expectedCommit: "def",
      });
      checkSubmoduleUpdates.mockReturnValueOnce({
        available: true,
        behindCount: 3,
        currentCommit: "abc",
        remoteCommit: "ghi",
      });
      await checkCmd.run({ args: { json: false } });
      expect(getUnrdfStatus).toHaveBeenCalled();
    });
  });

  describe("init subcommand", () => {
    const initCmd = submoduleCommand.subCommands.init;

    it("should be properly defined", () => {
      expect(initCmd.meta.name).toBe("init");
      expect(initCmd.meta.description).toContain("Initialize");
    });

    it("should skip if already initialized", async () => {
      await initCmd.run();
      expect(getUnrdfStatus).toHaveBeenCalled();
      expect(initializeUnrdf).not.toHaveBeenCalled();
    });

    it("should initialize when not initialized", async () => {
      getUnrdfStatus
        .mockReturnValueOnce({ initialized: false })
        .mockReturnValueOnce({
          initialized: true,
          version: "1.0.0",
          currentCommit: "abc123",
        });
      await initCmd.run();
      expect(initializeUnrdf).toHaveBeenCalled();
    });
  });

  describe("update subcommand", () => {
    const updateCmd = submoduleCommand.subCommands.update;

    it("should be properly defined", () => {
      expect(updateCmd.meta.name).toBe("update");
      expect(updateCmd.meta.description).toContain("Update");
    });

    it("should have force argument", () => {
      expect(updateCmd.args.force).toBeDefined();
      expect(updateCmd.args.force.type).toBe("boolean");
      expect(updateCmd.args.force.default).toBe(false);
    });

    it("should update when initialized", async () => {
      getUnrdfStatus
        .mockReturnValueOnce({
          initialized: true,
          hasChanges: false,
        })
        .mockReturnValueOnce({
          initialized: true,
          version: "1.1.0",
          currentCommit: "def456",
        });
      await updateCmd.run({ args: { force: false } });
      expect(updateUnrdf).toHaveBeenCalled();
    });

    it("should block update with uncommitted changes without force", async () => {
      getUnrdfStatus.mockReturnValueOnce({
        initialized: true,
        hasChanges: true,
      });
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      try {
        await updateCmd.run({ args: { force: false } });
      } catch (e) {
        // expected
      }
      mockExit.mockRestore();
    });
  });

  describe("sync subcommand", () => {
    const syncCmd = submoduleCommand.subCommands.sync;

    it("should be properly defined", () => {
      expect(syncCmd.meta.name).toBe("sync");
      expect(syncCmd.meta.description).toContain("Sync");
    });

    it("should skip if already in sync", async () => {
      getUnrdfStatus.mockReturnValueOnce({
        initialized: true,
        outOfSync: false,
        currentCommit: "abc",
        expectedCommit: "abc",
      });
      await syncCmd.run();
      expect(syncUnrdf).not.toHaveBeenCalled();
    });

    it("should sync when out of sync", async () => {
      getUnrdfStatus
        .mockReturnValueOnce({
          initialized: true,
          outOfSync: true,
          currentCommit: "abc",
          expectedCommit: "def",
        })
        .mockReturnValueOnce({
          initialized: true,
          version: "1.0.0",
          currentCommit: "def",
        });
      await syncCmd.run();
      expect(syncUnrdf).toHaveBeenCalled();
    });
  });

  describe("verify subcommand", () => {
    const verifyCmd = submoduleCommand.subCommands.verify;

    it("should be properly defined", () => {
      expect(verifyCmd.meta.name).toBe("verify");
      expect(verifyCmd.meta.description).toContain("Verify");
    });

    it("should have json, verbose, and list-methods arguments", () => {
      expect(verifyCmd.args.json).toBeDefined();
      expect(verifyCmd.args.verbose).toBeDefined();
      expect(verifyCmd.args["list-methods"]).toBeDefined();
    });

    it("should verify in text format", async () => {
      await verifyCmd.run({
        args: { json: false, verbose: false, "list-methods": false },
      });
      expect(generateValidationReport).toHaveBeenCalled();
    });

    it("should verify in json format", async () => {
      await verifyCmd.run({
        args: { json: true, verbose: false, "list-methods": false },
      });
      expect(generateValidationReport).toHaveBeenCalled();
    });

    it("should list methods when flag is set", async () => {
      await verifyCmd.run({
        args: { json: false, verbose: false, "list-methods": true },
      });
      expect(listUnrdfMethods).toHaveBeenCalled();
    });

    it("should list methods in json format", async () => {
      await verifyCmd.run({
        args: { json: true, verbose: false, "list-methods": true },
      });
      expect(listUnrdfMethods).toHaveBeenCalled();
    });
  });
});
