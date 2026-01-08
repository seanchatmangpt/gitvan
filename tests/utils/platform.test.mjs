/**
 * Platform Utilities Tests
 * Tests cross-platform file operations, environment handling, and retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import {
  deleteFileWithRetry,
  deleteFilesWithRetry,
  getTempDir,
  getEnvVar,
  setEnvVar,
  isProcessRunning,
  getPlatformInfo,
  normalizeEnvironment,
  isCI,
} from "../../src/utils/platform.mjs";

describe("File Deletion with Retry", () => {
  let testDir;
  let testFile;

  beforeEach(() => {
    // Create a unique test directory
    testDir = join(tmpdir(), `gitvan-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testFile = join(testDir, "test-file.txt");
  });

  afterEach(() => {
    // Cleanup
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should delete an existing file", async () => {
    writeFileSync(testFile, "test content");
    expect(existsSync(testFile)).toBe(true);

    const result = await deleteFileWithRetry(testFile);
    expect(result).toBe(true);
    expect(existsSync(testFile)).toBe(false);
  });

  it("should return false for non-existent file", async () => {
    const nonExistentFile = join(testDir, "non-existent.txt");
    const result = await deleteFileWithRetry(nonExistentFile);
    expect(result).toBe(false);
  });

  it("should retry on failure and eventually succeed", async () => {
    writeFileSync(testFile, "test content");

    let attempts = 0;
    const originalRmSync = rmSync;

    // Mock rmSync to fail first two times, then succeed
    vi.spyOn(global, "rmSync").mockImplementation((path, options) => {
      attempts++;
      if (attempts < 3) {
        throw new Error("EBUSY: resource busy or locked");
      }
      originalRmSync(path, options);
    });

    const result = await deleteFileWithRetry(testFile, {
      maxRetries: 3,
      initialDelay: 10,
    });

    expect(result).toBe(true);
    expect(attempts).toBe(3);

    vi.restoreAllMocks();
  });

  it("should throw error after max retries", async () => {
    writeFileSync(testFile, "test content");

    // Mock rmSync to always fail
    vi.spyOn(global, "rmSync").mockImplementation(() => {
      throw new Error("EBUSY: resource busy or locked");
    });

    await expect(
      deleteFileWithRetry(testFile, {
        maxRetries: 2,
        initialDelay: 10,
      })
    ).rejects.toThrow(/Failed to delete file after 2 attempts/);

    vi.restoreAllMocks();
  });

  it("should use exponential backoff", async () => {
    writeFileSync(testFile, "test content");

    const delays = [];
    let attempts = 0;

    vi.spyOn(global, "rmSync").mockImplementation(() => {
      attempts++;
      if (attempts < 4) {
        throw new Error("EBUSY");
      }
    });

    // Spy on setTimeout to capture delays
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, "setTimeout").mockImplementation((fn, delay) => {
      if (delay > 0) {
        delays.push(delay);
      }
      return originalSetTimeout(fn, 1); // Execute quickly
    });

    await deleteFileWithRetry(testFile, {
      maxRetries: 4,
      initialDelay: 100,
      backoffFactor: 2,
    });

    // Check exponential backoff: 100, 200, 400
    expect(delays).toHaveLength(3);
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    expect(delays[2]).toBe(400);

    vi.restoreAllMocks();
  });
});

describe("Batch File Deletion", () => {
  let testDir;
  let testFiles;

  beforeEach(() => {
    testDir = join(tmpdir(), `gitvan-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testFiles = [
      join(testDir, "file1.txt"),
      join(testDir, "file2.txt"),
      join(testDir, "file3.txt"),
    ];
    testFiles.forEach((file) => writeFileSync(file, "content"));
  });

  afterEach(() => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should delete multiple files", async () => {
    const result = await deleteFilesWithRetry(testFiles);

    expect(result.deleted).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);

    testFiles.forEach((file) => {
      expect(existsSync(file)).toBe(false);
    });
  });

  it("should handle partial failures", async () => {
    let callCount = 0;
    const originalRmSync = rmSync;

    // Make second file fail
    vi.spyOn(global, "rmSync").mockImplementation((path, options) => {
      callCount++;
      if (path === testFiles[1]) {
        throw new Error("Access denied");
      }
      originalRmSync(path, options);
    });

    const result = await deleteFilesWithRetry(testFiles, {
      maxRetries: 1,
      initialDelay: 10,
    });

    expect(result.deleted).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe(testFiles[1]);

    vi.restoreAllMocks();
  });

  it("should handle empty array", async () => {
    const result = await deleteFilesWithRetry([]);
    expect(result.deleted).toBe(0);
    expect(result.failed).toBe(0);
  });
});

describe("Temp Directory", () => {
  it("should return platform temp directory", () => {
    const temp = getTempDir();
    expect(temp).toBeDefined();
    expect(typeof temp).toBe("string");
    expect(temp.length).toBeGreaterThan(0);
  });

  it("should return actual system tmpdir", () => {
    const temp = getTempDir();
    const systemTemp = tmpdir();
    expect(temp).toBe(systemTemp);
  });
});

describe("Environment Variable Handling", () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should get environment variable with exact match", () => {
    process.env.TEST_VAR = "test-value";
    expect(getEnvVar("TEST_VAR")).toBe("test-value");
  });

  it("should return default value if not found", () => {
    expect(getEnvVar("NON_EXISTENT_VAR", "default")).toBe("default");
  });

  it("should return undefined if not found and no default", () => {
    expect(getEnvVar("NON_EXISTENT_VAR")).toBeUndefined();
  });

  it("should set environment variable", () => {
    setEnvVar("NEW_VAR", "new-value");
    expect(process.env.NEW_VAR).toBe("new-value");
  });
});

describe("Process Running Check", () => {
  it("should detect current process as running", () => {
    expect(isProcessRunning(process.pid)).toBe(true);
  });

  it("should detect non-existent process", () => {
    // Use a very high PID that's unlikely to exist
    const nonExistentPid = 999999;
    expect(isProcessRunning(nonExistentPid)).toBe(false);
  });
});

describe("Platform Information", () => {
  it("should return platform information", () => {
    const info = getPlatformInfo();

    expect(info).toBeDefined();
    expect(info.platform).toBeDefined();
    expect(info.isWindows).toBeDefined();
    expect(info.isMac).toBeDefined();
    expect(info.isLinux).toBeDefined();
    expect(info.arch).toBeDefined();
    expect(info.nodeVersion).toBeDefined();
    expect(info.tempDir).toBeDefined();
  });

  it("should have consistent platform detection", () => {
    const info = getPlatformInfo();

    if (process.platform === "win32") {
      expect(info.isWindows).toBe(true);
      expect(info.isMac).toBe(false);
      expect(info.isLinux).toBe(false);
    } else if (process.platform === "darwin") {
      expect(info.isWindows).toBe(false);
      expect(info.isMac).toBe(true);
      expect(info.isLinux).toBe(false);
    } else if (process.platform === "linux") {
      expect(info.isWindows).toBe(false);
      expect(info.isMac).toBe(false);
      expect(info.isLinux).toBe(true);
    }
  });
});

describe("Environment Normalization", () => {
  it("should normalize environment with UTC timezone", () => {
    const env = normalizeEnvironment();

    expect(env.TZ).toBe("UTC");
    expect(env.LANG).toBe("C");
    expect(env.LC_ALL).toBe("C");
  });

  it("should preserve existing environment variables", () => {
    const customEnv = {
      PATH: "/usr/bin",
      HOME: "/home/user",
      CUSTOM_VAR: "custom",
    };

    const normalized = normalizeEnvironment(customEnv);

    expect(normalized.TZ).toBe("UTC");
    expect(normalized.LANG).toBe("C");
    expect(normalized.PATH).toBe("/usr/bin");
    expect(normalized.HOME).toBe("/home/user");
    expect(normalized.CUSTOM_VAR).toBe("custom");
  });

  it("should override timezone and locale", () => {
    const customEnv = {
      TZ: "America/New_York",
      LANG: "en_US.UTF-8",
    };

    const normalized = normalizeEnvironment(customEnv);

    expect(normalized.TZ).toBe("UTC");
    expect(normalized.LANG).toBe("C");
  });
});

describe("CI Detection", () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear CI-related variables
    delete process.env.CI;
    delete process.env.CONTINUOUS_INTEGRATION;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.CIRCLECI;
    delete process.env.TRAVIS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should detect CI environment", () => {
    process.env.CI = "true";
    expect(isCI()).toBe(true);
  });

  it("should detect GitHub Actions", () => {
    process.env.GITHUB_ACTIONS = "true";
    expect(isCI()).toBe(true);
  });

  it("should detect GitLab CI", () => {
    process.env.GITLAB_CI = "true";
    expect(isCI()).toBe(true);
  });

  it("should detect CircleCI", () => {
    process.env.CIRCLECI = "true";
    expect(isCI()).toBe(true);
  });

  it("should detect Travis CI", () => {
    process.env.TRAVIS = "true";
    expect(isCI()).toBe(true);
  });

  it("should not detect CI in local environment", () => {
    expect(isCI()).toBe(false);
  });
});
