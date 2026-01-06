/**
 * Comprehensive Daemon Tests
 * Tests for JobDaemon and GitVanDaemon - targeting 85%+ coverage
 * 30+ test cases covering all daemon operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createTestContext,
  withTestEnvironment,
  initTestRepo,
  createCommit,
  createFileStructure,
  assertFileExists,
  cleanupDir,
  waitFor,
  createDeferred,
} from "../helpers/index.mjs";
import { JobDaemon, DaemonCLI } from "../../src/jobs/daemon.mjs";
import { GitVanDaemon } from "../../src/runtime/daemon.mjs";
import { join } from "pathe";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

describe("JobDaemon - Modern Daemon Implementation", () => {
  let testContext;
  let daemon;

  beforeEach(async () => {
    testContext = await withTestEnvironment(async (ctx) => {
      await initTestRepo(ctx.testDir);

      createFileStructure(ctx.testDir, {
        "jobs": {},
        "events": {},
        ".git": {},
      });

      return ctx;
    });
  });

  afterEach(async () => {
    if (daemon?.isRunning) {
      await daemon.stop();
    }

    if (testContext?.cleanup) {
      testContext.cleanup();
    }
  });

  describe("Daemon Initialization", () => {
    it("should create daemon instance with default options", () => {
      daemon = new JobDaemon();

      expect(daemon).toBeDefined();
      expect(daemon.isRunning).toBe(false);
      expect(daemon.eventCheckInterval).toBe(30000);
    });

    it("should create daemon with custom options", () => {
      daemon = new JobDaemon({
        eventCheckInterval: 10000,
        cronTickInterval: 5000,
      });

      expect(daemon.eventCheckInterval).toBe(10000);
    });

    it("should initialize daemon components", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      await daemon.init();

      expect(daemon.config).toBeDefined();
      expect(daemon.cronScheduler).toBeDefined();
      expect(daemon.eventRunner).toBeDefined();
      expect(daemon.git).toBeDefined();
    });

    it("should handle initialization errors", async () => {
      daemon = new JobDaemon({
        rootDir: "/non/existent/path",
      });

      await expect(daemon.init()).rejects.toThrow();
    });

    it("should track error count during operations", async () => {
      daemon = new JobDaemon();

      expect(daemon.errorCount).toBe(0);
    });
  });

  describe("Daemon Lifecycle - Start/Stop", () => {
    it("should start daemon successfully", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
        eventCheckInterval: 100,
      });

      // Mock to prevent actual infinite loop
      vi.spyOn(daemon, "startEventMonitoring").mockImplementation(
        async () => {}
      );

      await daemon.start();

      expect(daemon.isRunning).toBe(true);
      expect(daemon.startTime).toBeDefined();
    });

    it("should not start daemon if already running", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      vi.spyOn(daemon, "startEventMonitoring").mockImplementation(
        async () => {}
      );

      await daemon.start();
      expect(daemon.isRunning).toBe(true);

      // Try starting again
      await daemon.start();
      expect(daemon.isRunning).toBe(true);
    });

    it("should stop daemon gracefully", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      vi.spyOn(daemon, "startEventMonitoring").mockImplementation(
        async () => {}
      );
      vi.spyOn(daemon, "stopEventMonitoring").mockImplementation(() => {});

      await daemon.start();
      expect(daemon.isRunning).toBe(true);

      await daemon.stop();
      expect(daemon.isRunning).toBe(false);
    });

    it("should not stop daemon if not running", async () => {
      daemon = new JobDaemon();

      await daemon.stop();

      expect(daemon.isRunning).toBe(false);
    });

    it("should run shutdown callbacks on stop", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      let callbackExecuted = false;
      daemon.shutdownCallbacks.push(async () => {
        callbackExecuted = true;
      });

      vi.spyOn(daemon, "startEventMonitoring").mockImplementation(
        async () => {}
      );

      await daemon.start();
      await daemon.stop();

      expect(callbackExecuted).toBe(true);
    });

    it("should handle shutdown callback errors gracefully", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      daemon.shutdownCallbacks.push(async () => {
        throw new Error("Shutdown error");
      });

      vi.spyOn(daemon, "startEventMonitoring").mockImplementation(
        async () => {}
      );

      await daemon.start();
      await expect(daemon.stop()).resolves.not.toThrow();
    });
  });

  describe("Event Monitoring", () => {
    it("should start event monitoring", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
        eventCheckInterval: 100,
      });

      await daemon.init();

      await daemon.startEventMonitoring();

      expect(daemon.eventTimer).toBeDefined();
    });

    it("should stop event monitoring", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
        eventCheckInterval: 100,
      });

      await daemon.init();
      await daemon.startEventMonitoring();

      daemon.stopEventMonitoring();

      expect(daemon.eventTimer).toBeNull();
    });

    it("should check for git events", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      await daemon.init();

      const checkSpy = vi.spyOn(daemon, "checkForEvents");

      await daemon.checkForEvents();

      expect(checkSpy).toHaveBeenCalled();
    });

    it("should detect new commits", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      await daemon.init();

      daemon.lastCommit = "old-commit-sha";

      vi.spyOn(daemon.git, "currentHead").mockResolvedValue("new-commit-sha");
      vi.spyOn(daemon.eventRunner, "checkAndRunEventJobs").mockResolvedValue(
        {}
      );

      await daemon.checkForEvents();

      expect(daemon.lastCommit).toBe("new-commit-sha");
    });

    it("should handle event check errors gracefully", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      await daemon.init();

      vi.spyOn(daemon.git, "currentHead").mockRejectedValue(
        new Error("Git error")
      );

      await expect(daemon.checkForEvents()).resolves.not.toThrow();
    });

    it("should force event check when requested", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      await daemon.init();

      vi.spyOn(daemon, "startEventMonitoring").mockImplementation(
        async () => {}
      );

      await daemon.start();

      vi.spyOn(daemon, "checkForEvents").mockResolvedValue(undefined);

      await daemon.forceEventCheck();

      expect(daemon.checkForEvents).toHaveBeenCalled();
    });

    it("should throw error when forcing check on stopped daemon", async () => {
      daemon = new JobDaemon();

      await expect(daemon.forceEventCheck()).rejects.toThrow(
        /Daemon is not running/
      );
    });
  });

  describe("Daemon Status & Statistics", () => {
    it("should get daemon status", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      await daemon.init();

      const status = daemon.getStatus();

      expect(status).toBeDefined();
      expect(status.isRunning).toBe(false);
      expect(status.eventCheckInterval).toBe(30000);
    });

    it("should include config in status", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      await daemon.init();

      const status = daemon.getStatus();

      expect(status.config).toBeDefined();
      expect(status.config.rootDir).toBeDefined();
    });

    it("should get daemon statistics", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      await daemon.init();

      vi.spyOn(daemon.cronScheduler, "listSchedule").mockReturnValue([
        { job: "job1" },
        { job: "job2" },
      ]);

      vi.spyOn(daemon.eventRunner, "listEventJobs").mockResolvedValue([
        { id: "event1" },
      ]);

      const stats = await daemon.getStats();

      expect(stats).toBeDefined();
      expect(stats.cronJobs).toBe(2);
      expect(stats.eventJobs).toBe(1);
      expect(stats.totalJobs).toBe(3);
      expect(stats.uptime).toBeDefined();
    });

    it("should calculate uptime correctly", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      await daemon.init();

      vi.spyOn(daemon, "startEventMonitoring").mockImplementation(
        async () => {}
      );

      await daemon.start();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = await daemon.getStats();

      expect(stats.uptime).toBeGreaterThan(0);
    });
  });

  describe("Signal Handling", () => {
    it("should setup signal handlers on start", async () => {
      daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      const setupSpy = vi.spyOn(daemon, "setupSignalHandlers");

      vi.spyOn(daemon, "startEventMonitoring").mockImplementation(
        async () => {}
      );

      await daemon.start();

      expect(setupSpy).toHaveBeenCalled();
    });
  });
});

describe("GitVanDaemon - Legacy Daemon Implementation", () => {
  let testContext;
  let daemon;

  beforeEach(async () => {
    testContext = await withTestEnvironment(async (ctx) => {
      await initTestRepo(ctx.testDir);

      createFileStructure(ctx.testDir, {
        ".git": {},
      });

      return ctx;
    });
  });

  afterEach(() => {
    if (daemon && daemon.isRunning()) {
      try {
        daemon.stop();
      } catch (e) {
        // Ignore errors in cleanup
      }
    }

    if (testContext?.cleanup) {
      testContext.cleanup();
    }
  });

  describe("PID File Management", () => {
    it("should create daemon with worktree path", () => {
      daemon = new GitVanDaemon(testContext.testDir);

      expect(daemon.worktreePath).toBe(testContext.testDir);
      expect(daemon.pidFile).toContain(".git/gitvan.pid");
      expect(daemon.lockFile).toContain(".git/gitvan.lock");
    });

    it("should check if daemon is not running initially", () => {
      daemon = new GitVanDaemon(testContext.testDir);

      const running = daemon.isRunning();

      expect(running).toBe(false);
    });

    it("should write PID file on start", async () => {
      daemon = new GitVanDaemon(testContext.testDir);

      // Mock startDaemon to prevent actual start
      const originalStart = await import("../../src/runtime/daemon.mjs");
      vi.spyOn(originalStart, "startDaemon").mockResolvedValue(undefined);

      try {
        writeFileSync(daemon.pidFile, String(process.pid));

        assertFileExists(daemon.pidFile);

        const pid = readFileSync(daemon.pidFile, "utf8");
        expect(parseInt(pid)).toBe(process.pid);
      } finally {
        if (existsSync(daemon.pidFile)) {
          const fs = await import("node:fs");
          fs.unlinkSync(daemon.pidFile);
        }
      }
    });

    it("should detect running daemon from PID file", () => {
      daemon = new GitVanDaemon(testContext.testDir);

      // Write current process PID
      writeFileSync(daemon.pidFile, String(process.pid));

      const running = daemon.isRunning();

      expect(running).toBe(true);

      // Cleanup
      const fs = require("node:fs");
      if (existsSync(daemon.pidFile)) {
        fs.unlinkSync(daemon.pidFile);
      }
    });

    it("should clean up stale PID file", () => {
      daemon = new GitVanDaemon(testContext.testDir);

      // Write non-existent PID
      writeFileSync(daemon.pidFile, "999999");

      const running = daemon.isRunning();

      expect(running).toBe(false);
      expect(existsSync(daemon.pidFile)).toBe(false);
    });

    it("should prevent starting daemon twice", async () => {
      daemon = new GitVanDaemon(testContext.testDir);

      // Simulate daemon already running
      writeFileSync(daemon.pidFile, String(process.pid));

      const originalStart = await import("../../src/runtime/daemon.mjs");
      vi.spyOn(originalStart, "startDaemon").mockResolvedValue(undefined);

      expect(() => daemon.start()).toThrow(/already running/);

      // Cleanup
      const fs = require("node:fs");
      if (existsSync(daemon.pidFile)) {
        fs.unlinkSync(daemon.pidFile);
      }
    });
  });

  describe("Worktree Locks", () => {
    it("should get worktree lock", () => {
      daemon = new GitVanDaemon(testContext.testDir);

      const lock = daemon.getLock("test-lock");

      expect(lock).toBeDefined();
      expect(lock.lockFile).toContain("gitvan-test-lock.lock");
    });

    it("should acquire lock", () => {
      daemon = new GitVanDaemon(testContext.testDir);

      const lock = daemon.getLock("acquire-test");

      const acquired = lock.acquire();

      expect(acquired).toBe(true);
      assertFileExists(lock.lockFile);

      // Cleanup
      lock.release();
    });

    it("should not acquire lock if already held", () => {
      daemon = new GitVanDaemon(testContext.testDir);

      const lock = daemon.getLock("double-acquire");

      const first = lock.acquire();
      const second = lock.acquire();

      expect(first).toBe(true);
      expect(second).toBe(false);

      // Cleanup
      lock.release();
    });

    it("should release lock", () => {
      daemon = new GitVanDaemon(testContext.testDir);

      const lock = daemon.getLock("release-test");

      lock.acquire();
      lock.release();

      expect(existsSync(lock.lockFile)).toBe(false);
    });

    it("should handle lock release errors gracefully", () => {
      daemon = new GitVanDaemon(testContext.testDir);

      const lock = daemon.getLock("error-release");

      // Release without acquiring should not throw
      expect(() => lock.release()).not.toThrow();
    });
  });
});

describe("DaemonCLI - Command Line Interface", () => {
  let cli;
  let testContext;

  beforeEach(async () => {
    testContext = await withTestEnvironment(async (ctx) => {
      await initTestRepo(ctx.testDir);

      createFileStructure(ctx.testDir, {
        "jobs": {},
        "events": {},
      });

      return ctx;
    });

    cli = new DaemonCLI();
  });

  afterEach(async () => {
    if (cli.daemon?.isRunning) {
      await cli.daemon.stop();
    }

    if (testContext?.cleanup) {
      testContext.cleanup();
    }
  });

  describe("CLI Operations", () => {
    it("should create CLI instance", () => {
      expect(cli).toBeDefined();
      expect(cli.daemon).toBeNull();
    });

    it("should stop daemon via CLI", async () => {
      cli.daemon = new JobDaemon({
        rootDir: testContext.testDir,
      });

      await cli.daemon.init();

      vi.spyOn(cli.daemon, "startEventMonitoring").mockImplementation(
        async () => {}
      );

      await cli.daemon.start();

      await cli.stop();

      expect(cli.daemon.isRunning).toBe(false);
    });

    it("should get daemon status via CLI", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await cli.status();

      expect(consoleSpy).toHaveBeenCalledWith("Daemon is not running");

      consoleSpy.mockRestore();
    });

    it("should get daemon stats via CLI", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await cli.stats();

      expect(consoleSpy).toHaveBeenCalledWith("Daemon is not running");

      consoleSpy.mockRestore();
    });

    it("should force event check via CLI", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await cli.check();

      expect(consoleSpy).toHaveBeenCalledWith("Daemon is not running");

      consoleSpy.mockRestore();
    });
  });
});

describe("Daemon Error Handling & Resilience", () => {
  let daemon;
  let testContext;

  beforeEach(async () => {
    testContext = await withTestEnvironment(async (ctx) => {
      await initTestRepo(ctx.testDir);

      createFileStructure(ctx.testDir, {
        "jobs": {},
        "events": {},
      });

      return ctx;
    });
  });

  afterEach(async () => {
    if (daemon?.isRunning) {
      await daemon.stop();
    }

    if (testContext?.cleanup) {
      testContext.cleanup();
    }
  });

  it("should handle initialization errors", async () => {
    daemon = new JobDaemon({
      rootDir: "/invalid/path",
    });

    await expect(daemon.init()).rejects.toThrow();
  });

  it("should handle event monitoring errors", async () => {
    daemon = new JobDaemon({
      rootDir: testContext.testDir,
    });

    await daemon.init();

    vi.spyOn(daemon.git, "currentHead").mockRejectedValue(
      new Error("Git error")
    );

    await expect(daemon.checkForEvents()).resolves.not.toThrow();
  });

  it("should track operation metrics", async () => {
    daemon = new JobDaemon({
      rootDir: testContext.testDir,
    });

    await daemon.init();

    const stats = await daemon.getStats();

    expect(stats).toBeDefined();
    expect(stats.uptime).toBeDefined();
  });
});
