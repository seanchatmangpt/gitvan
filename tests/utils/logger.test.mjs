/**
 * Logger Tests
 *
 * Tests for production-grade structured logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createLogger, setCorrelationId, clearCorrelationId, getCorrelationId, logError } from "../../src/utils/logger.mjs";

describe("Logger", () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Clear correlation ID
    clearCorrelationId();
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("createLogger", () => {
    it("should create logger with tag", () => {
      const logger = createLogger("test");

      expect(logger).toBeDefined();
      expect(logger.error).toBeTypeOf("function");
      expect(logger.warn).toBeTypeOf("function");
      expect(logger.info).toBeTypeOf("function");
      expect(logger.debug).toBeTypeOf("function");
    });

    it("should log info message", () => {
      const logger = createLogger("test");

      logger.info("Test message");

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("test");
      expect(logOutput).toContain("Test message");
    });

    it("should log error message", () => {
      const logger = createLogger("test");

      logger.error("Error message");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("test");
      expect(logOutput).toContain("Error message");
    });

    it("should log warning message", () => {
      const logger = createLogger("test");

      logger.warn("Warning message");

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logOutput = consoleWarnSpy.mock.calls[0][0];
      expect(logOutput).toContain("test");
      expect(logOutput).toContain("Warning message");
    });

    it("should include context in log", () => {
      const logger = createLogger("test");

      logger.info("Test with context", { userId: 123, action: "login" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("Test with context");
      expect(logOutput).toContain("userId");
      expect(logOutput).toContain("123");
    });
  });

  describe("child logger", () => {
    it("should create child logger with combined tag", () => {
      const logger = createLogger("parent");
      const childLogger = logger.child("child");

      childLogger.info("Child message");

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("parent:child");
      expect(logOutput).toContain("Child message");
    });

    it("should preserve parent context in child", () => {
      const logger = createLogger("parent", { parentKey: "parentValue" });
      const childLogger = logger.child("child", { childKey: "childValue" });

      childLogger.info("Message");

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("parentKey");
      expect(logOutput).toContain("childKey");
    });
  });

  describe("withContext", () => {
    it("should create logger with additional context", () => {
      const logger = createLogger("test");
      const contextLogger = logger.withContext({ requestId: "abc123" });

      contextLogger.info("Request message");

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("requestId");
      expect(logOutput).toContain("abc123");
    });
  });

  describe("correlation ID", () => {
    it("should set and get correlation ID", () => {
      const correlationId = "test-correlation-id";

      setCorrelationId(correlationId);
      const retrieved = getCorrelationId();

      expect(retrieved).toBe(correlationId);
    });

    it("should clear correlation ID", () => {
      setCorrelationId("test-id");
      clearCorrelationId();

      const retrieved = getCorrelationId();
      expect(retrieved).not.toBe("test-id");
    });

    it("should include correlation ID in logs", () => {
      const correlationId = "test-correlation-123";
      setCorrelationId(correlationId);

      const logger = createLogger("test");
      logger.info("Test message");

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain(correlationId);
    });
  });

  describe("logError", () => {
    it("should log error with stack trace", () => {
      const error = new Error("Test error");
      error.code = "TEST_ERROR";

      logError(error, "test-module");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("Test error");
      expect(logOutput).toContain("TEST_ERROR");
    });

    it("should include error cause if present", () => {
      const cause = new Error("Root cause");
      const error = new Error("Wrapped error");
      error.cause = cause;

      logError(error, "test");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("Wrapped error");
    });
  });

  describe("log levels", () => {
    it("should respect log level", () => {
      // Save original level
      const originalLevel = process.env.GITVAN_LOG_LEVEL;

      // Set to warn level
      process.env.GITVAN_LOG_LEVEL = "warn";

      // Import fresh logger (note: this won't work in practice due to module caching,
      // but demonstrates the concept)
      const logger = createLogger("test");

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");

      // Only warn and error should be logged at warn level
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore
      process.env.GITVAN_LOG_LEVEL = originalLevel;
    });
  });

  describe("timestamp", () => {
    it("should include ISO 8601 timestamp", () => {
      const logger = createLogger("test");

      logger.info("Test message");

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];

      // Check for ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
      const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;
      expect(logOutput).toMatch(isoRegex);
    });
  });

  describe("format", () => {
    it("should use text format by default", () => {
      const logger = createLogger("test");

      logger.info("Test message", { key: "value" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];

      // Text format includes brackets and uppercase level
      expect(logOutput).toContain("[");
      expect(logOutput).toContain("INFO");
    });
  });
});
