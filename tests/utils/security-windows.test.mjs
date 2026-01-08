/**
 * Windows Compatibility Tests for Security Utilities
 * Tests cross-platform path handling, file:// URL generation, and Windows-specific validation
 *
 * Tests run on all platforms but have platform-specific assertions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isWindows,
  isDrivePath,
  isUNCPath,
  isReservedName,
  hasInvalidControlChars,
  validateWindowsPath,
  pathToFileURL,
  normalizeLineEndings,
} from "../../src/utils/security.mjs";

describe("Windows Platform Detection", () => {
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = process.platform;
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it("should detect Windows platform", () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
      writable: true,
      configurable: true,
    });
    expect(isWindows()).toBe(true);
  });

  it("should detect non-Windows platform", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      writable: true,
      configurable: true,
    });
    expect(isWindows()).toBe(false);
  });
});

describe("Windows Drive Path Detection", () => {
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "win32",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it("should detect drive letter paths", () => {
    expect(isDrivePath("C:\\Users\\test")).toBe(true);
    expect(isDrivePath("D:/Projects")).toBe(true);
    expect(isDrivePath("c:\\temp")).toBe(true);
  });

  it("should not detect non-drive paths", () => {
    expect(isDrivePath("/usr/local")).toBe(false);
    expect(isDrivePath("\\\\server\\share")).toBe(false);
    expect(isDrivePath("relative/path")).toBe(false);
  });

  it("should return false on non-Windows platforms", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      writable: true,
      configurable: true,
    });
    expect(isDrivePath("C:\\Users\\test")).toBe(false);
  });
});

describe("Windows UNC Path Detection", () => {
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "win32",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it("should detect UNC paths with backslashes", () => {
    expect(isUNCPath("\\\\server\\share")).toBe(true);
    expect(isUNCPath("\\\\192.168.1.1\\folder")).toBe(true);
  });

  it("should detect UNC paths with forward slashes", () => {
    expect(isUNCPath("//server/share")).toBe(true);
    expect(isUNCPath("//192.168.1.1/folder")).toBe(true);
  });

  it("should not detect non-UNC paths", () => {
    expect(isUNCPath("C:\\Users\\test")).toBe(false);
    expect(isUNCPath("/usr/local")).toBe(false);
    expect(isUNCPath("relative/path")).toBe(false);
  });
});

describe("Windows Reserved Names", () => {
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "win32",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it("should detect reserved device names", () => {
    expect(isReservedName("CON")).toBe(true);
    expect(isReservedName("PRN")).toBe(true);
    expect(isReservedName("AUX")).toBe(true);
    expect(isReservedName("NUL")).toBe(true);
  });

  it("should detect reserved device names with extensions", () => {
    expect(isReservedName("CON.txt")).toBe(true);
    expect(isReservedName("PRN.log")).toBe(true);
    expect(isReservedName("nul.dat")).toBe(true);
  });

  it("should detect COM and LPT ports", () => {
    expect(isReservedName("COM1")).toBe(true);
    expect(isReservedName("COM9")).toBe(true);
    expect(isReservedName("LPT1")).toBe(true);
    expect(isReservedName("LPT9")).toBe(true);
  });

  it("should not detect normal filenames", () => {
    expect(isReservedName("config.txt")).toBe(false);
    expect(isReservedName("console.log")).toBe(false);
    expect(isReservedName("print.js")).toBe(false);
  });

  it("should be case-insensitive", () => {
    expect(isReservedName("con")).toBe(true);
    expect(isReservedName("Con")).toBe(true);
    expect(isReservedName("CON")).toBe(true);
  });
});

describe("Windows Invalid Control Characters", () => {
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "win32",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it("should detect null bytes", () => {
    expect(hasInvalidControlChars("test\x00file.txt")).toBe(true);
  });

  it("should detect control characters", () => {
    expect(hasInvalidControlChars("test\x01file.txt")).toBe(true);
    expect(hasInvalidControlChars("test\x1Ffile.txt")).toBe(true);
  });

  it("should allow normal characters", () => {
    expect(hasInvalidControlChars("normal-file_123.txt")).toBe(false);
    expect(hasInvalidControlChars("file with spaces.txt")).toBe(false);
  });
});

describe("Windows Path Validation", () => {
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "win32",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it("should validate normal paths", () => {
    const result = validateWindowsPath("C:\\Users\\test\\file.txt");
    expect(result.valid).toBe(true);
  });

  it("should reject paths with reserved names", () => {
    const result = validateWindowsPath("C:\\Users\\CON\\file.txt");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("reserved");
  });

  it("should reject paths with control characters", () => {
    const result = validateWindowsPath("C:\\Users\\test\x00\\file.txt");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("control characters");
  });

  it("should reject paths exceeding 260 characters", () => {
    const longPath = "C:\\" + "a".repeat(270);
    const result = validateWindowsPath(longPath);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("maximum length");
  });

  it("should accept paths just under 260 characters", () => {
    const maxPath = "C:\\" + "a".repeat(250);
    const result = validateWindowsPath(maxPath);
    expect(result.valid).toBe(true);
  });

  it("should always validate on non-Windows platforms", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
      writable: true,
      configurable: true,
    });
    const result = validateWindowsPath("/usr/local/CON");
    expect(result.valid).toBe(true);
  });
});

describe("Path to file:// URL Conversion", () => {
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = process.platform;
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  describe("Windows platform", () => {
    beforeEach(() => {
      Object.defineProperty(process, "platform", {
        value: "win32",
        writable: true,
        configurable: true,
      });
    });

    it("should convert Windows drive letter paths", () => {
      expect(pathToFileURL("C:\\Users\\test\\file.js")).toBe(
        "file:///C:/Users/test/file.js"
      );
      expect(pathToFileURL("D:/Projects/app.mjs")).toBe(
        "file:///D:/Projects/app.mjs"
      );
    });

    it("should handle backslashes in paths", () => {
      expect(pathToFileURL("C:\\path\\to\\file.js")).toBe(
        "file:///C:/path/to/file.js"
      );
    });

    it("should convert UNC paths", () => {
      expect(pathToFileURL("\\\\server\\share\\file.js")).toBe(
        "file://server/share/file.js"
      );
      expect(pathToFileURL("//server/share/file.js")).toBe(
        "file://server/share/file.js"
      );
    });
  });

  describe("Unix platform", () => {
    beforeEach(() => {
      Object.defineProperty(process, "platform", {
        value: "linux",
        writable: true,
        configurable: true,
      });
    });

    it("should convert Unix absolute paths", () => {
      expect(pathToFileURL("/usr/local/file.js")).toBe(
        "file:///usr/local/file.js"
      );
      expect(pathToFileURL("/home/user/app.mjs")).toBe(
        "file:///home/user/app.mjs"
      );
    });

    it("should handle paths starting with /", () => {
      expect(pathToFileURL("/path/to/file.js")).toBe(
        "file:///path/to/file.js"
      );
    });
  });

  it("should handle empty or null paths", () => {
    expect(pathToFileURL("")).toBe("");
    expect(pathToFileURL(null)).toBe(null);
  });
});

describe("Line Ending Normalization", () => {
  it("should normalize CRLF to LF", () => {
    const input = "line1\r\nline2\r\nline3\r\n";
    const expected = "line1\nline2\nline3\n";
    expect(normalizeLineEndings(input)).toBe(expected);
  });

  it("should preserve LF line endings", () => {
    const input = "line1\nline2\nline3\n";
    expect(normalizeLineEndings(input)).toBe(input);
  });

  it("should handle mixed line endings", () => {
    const input = "line1\r\nline2\nline3\r\n";
    const expected = "line1\nline2\nline3\n";
    expect(normalizeLineEndings(input)).toBe(expected);
  });

  it("should handle empty strings", () => {
    expect(normalizeLineEndings("")).toBe("");
  });

  it("should handle strings without line endings", () => {
    const input = "single line";
    expect(normalizeLineEndings(input)).toBe(input);
  });
});

describe("Integration: Full Windows Path Processing", () => {
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "win32",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it("should validate and convert valid Windows paths", () => {
    const path = "C:\\Projects\\gitvan\\src\\jobs\\test.mjs";
    const validation = validateWindowsPath(path);
    expect(validation.valid).toBe(true);

    const fileUrl = pathToFileURL(path);
    expect(fileUrl).toBe("file:///C:/Projects/gitvan/src/jobs/test.mjs");
  });

  it("should reject invalid Windows paths before conversion", () => {
    const path = "C:\\Projects\\CON\\test.mjs";
    const validation = validateWindowsPath(path);
    expect(validation.valid).toBe(false);
  });
});
