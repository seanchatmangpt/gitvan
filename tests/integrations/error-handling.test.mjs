/**
 * @fileoverview Comprehensive Error Handling Test Suite for Hooks System
 *
 * Tests all error scenarios, timeout handling, retry logic, and recovery mechanisms
 * for the @unrdf/hooks + Husky + Bree integration system.
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  HuskyHookBridge,
  resetHuskyHookBridge,
} from "../../src/integrations/husky-hook-bridge.mjs";
import {
  UnrdfHooksBridge,
  resetUnrdfHooksBridge,
} from "../../src/integrations/unrdf-hooks-bridge.mjs";
import { GitEventCapture } from "../../src/git-lifecycle/GitEventCapture.mjs";

describe("Error Handling - Hooks System", () => {
  const cwd = process.cwd();
  let huskyBridge;
  let unrdfBridge;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  afterEach(async () => {
    if (huskyBridge) {
      await resetHuskyHookBridge(cwd);
      huskyBridge = null;
    }
    if (unrdfBridge) {
      await resetUnrdfHooksBridge(cwd);
      unrdfBridge = null;
    }
  });

  describe("HuskyHookBridge - Git Command Failures", () => {
    beforeEach(() => {
      huskyBridge = new HuskyHookBridge({
        cwd,
        logger: mockLogger,
        enableAudit: false,
      });
    });

    it("should handle GitEventCapture initialization failure", async () => {
      // Mock GitEventCapture to fail initialization
      huskyBridge.eventCapture.initialize = vi
        .fn()
        .mockRejectedValue(new Error("Failed to initialize event capture"));

      await expect(huskyBridge.initialize()).rejects.toThrow(
        "Failed to initialize HuskyHookBridge"
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("initialization failed"),
        expect.any(Error)
      );
    });

    it("should handle event capture failures gracefully", async () => {
      await huskyBridge.initialize();

      // Mock captureEvent to fail
      huskyBridge.eventCapture.captureEvent = vi.fn().mockResolvedValue({
        success: false,
        error: "Failed to capture event",
      });

      await expect(
        huskyBridge.processHook("pre-commit", {})
      ).rejects.toThrow("Failed to capture event");

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should not stop git flow on hook evaluation failure", async () => {
      await huskyBridge.initialize();

      // Mock successful capture but failed evaluation
      huskyBridge.eventCapture.captureEvent = vi.fn().mockResolvedValue({
        success: true,
        eventUri: "test://event/123",
        eventId: "test-123",
      });

      huskyBridge.orchestrator.evaluate = vi
        .fn()
        .mockRejectedValue(new Error("Hook evaluation failed"));

      // processHook should succeed even if evaluation fails
      const result = await huskyBridge.processHook("pre-commit", {});

      expect(result.success).toBe(true);
      expect(result.eventCaptured).toBe(true);
      expect(result.hooksTriggered).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Hook evaluation failed"),
        expect.any(String)
      );
    });

    it("should retry failed git operations with exponential backoff", async () => {
      await huskyBridge.initialize();

      let attempts = 0;
      huskyBridge.eventCapture.captureEvent = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            success: false,
            error: "Temporary failure",
          });
        }
        return Promise.resolve({
          success: true,
          eventUri: "test://event/123",
          eventId: "test-123",
        });
      });

      // Enable retry logic
      huskyBridge.maxRetries = 3;
      huskyBridge.retryDelay = 10;

      const result = await huskyBridge.processHook("pre-commit", {});

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
      expect(result.retryCount).toBe(2);
    });

    it("should log errors without stopping git flow", async () => {
      await huskyBridge.initialize();

      huskyBridge.eventCapture.captureEvent = vi
        .fn()
        .mockRejectedValue(new Error("Git command failed"));

      await expect(
        huskyBridge.processHook("pre-commit", {})
      ).rejects.toThrow();

      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to process hook"),
        expect.any(String)
      );
    });

    it("should handle missing git data gracefully", async () => {
      const eventCapture = new GitEventCapture({
        cwd: "/non/existent/path",
        logger: mockLogger,
      });

      const result = await eventCapture.captureEvent("pre-commit", {});

      // Should succeed but with default/unknown values
      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should create audit trail for failures", async () => {
      huskyBridge.enableAudit = true;
      await huskyBridge.initialize();

      huskyBridge.eventCapture.captureEvent = vi
        .fn()
        .mockRejectedValue(new Error("Capture failed"));

      const auditSpy = vi.spyOn(huskyBridge, "_logAuditTrail");

      try {
        await huskyBridge.processHook("pre-commit", {});
      } catch (error) {
        // Expected to fail
      }

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        })
      );
    });
  });

  describe("UnrdfHooksBridge - Bree Job Failures", () => {
    beforeEach(() => {
      unrdfBridge = new UnrdfHooksBridge({
        cwd,
        logger: mockLogger,
        enableAudit: false,
        timeout: 1000,
        maxRetries: 3,
      });
    });

    it("should handle Bree initialization failure", async () => {
      unrdfBridge.scheduler.init = vi
        .fn()
        .mockRejectedValue(new Error("Bree initialization failed"));

      await expect(unrdfBridge.initialize()).rejects.toThrow(
        "Failed to initialize UnrdfHooksBridge"
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle job timeout with exponential backoff retry", async () => {
      await unrdfBridge.initialize();

      const hookDef = {
        id: "timeout-hook",
        name: "Timeout Hook",
        breeConfig: {
          jobName: "timeout-job",
          timeout: 100, // Very short timeout
        },
      };

      await unrdfBridge.registerHook(hookDef);

      // Mock job that times out first 2 times, succeeds on 3rd
      let attempts = 0;
      unrdfBridge.scheduler.runJob = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return new Promise((resolve) => setTimeout(resolve, 200)); // Timeout
        }
        return Promise.resolve();
      });

      const result = await unrdfBridge.executeHook("timeout-hook", {});

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(2);
      expect(attempts).toBe(3);
    });

    it("should gracefully degrade if Bree unavailable", async () => {
      // Simulate Bree not available
      unrdfBridge.scheduler = null;

      await expect(unrdfBridge.initialize()).rejects.toThrow();

      // Should fall back to synchronous execution
      unrdfBridge.fallbackMode = true;

      const hookDef = {
        id: "fallback-hook",
        name: "Fallback Hook",
        breeConfig: { jobName: "fallback-job" },
      };

      const result = await unrdfBridge.registerHook(hookDef);

      expect(result.success).toBe(true);
      expect(result.fallbackMode).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("fallback")
      );
    });

    it("should handle job registration failure with retry", async () => {
      await unrdfBridge.initialize();

      let attempts = 0;
      unrdfBridge.scheduler.addJob = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error("Job registration failed");
        }
        return Promise.resolve({ name: "test-job" });
      });

      unrdfBridge.retryRegistration = true;

      const hookDef = {
        id: "retry-hook",
        name: "Retry Hook",
        breeConfig: { jobName: "retry-job" },
      };

      const result = await unrdfBridge.registerHook(hookDef);

      expect(result.success).toBe(true);
      expect(attempts).toBe(2);
    });

    it("should handle job execution failure with retry and backoff", async () => {
      await unrdfBridge.initialize();

      const hookDef = {
        id: "fail-hook",
        name: "Fail Hook",
        breeConfig: { jobName: "fail-job" },
      };

      await unrdfBridge.registerHook(hookDef);

      let attempts = 0;
      const errors = ["Network error", "Disk full", "Success"];
      unrdfBridge.scheduler.runJob = vi.fn().mockImplementation(() => {
        const error = errors[attempts++];
        if (error !== "Success") {
          throw new Error(error);
        }
        return Promise.resolve();
      });

      const result = await unrdfBridge.executeHook("fail-hook", {});

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(2);
      expect(attempts).toBe(3);
    });

    it("should create audit trail for job failures", async () => {
      unrdfBridge.enableAudit = true;
      await unrdfBridge.initialize();

      const hookDef = {
        id: "audit-fail-hook",
        name: "Audit Fail Hook",
        breeConfig: { jobName: "audit-fail-job" },
      };

      await unrdfBridge.registerHook(hookDef);

      unrdfBridge.scheduler.runJob = vi
        .fn()
        .mockRejectedValue(new Error("Job execution failed"));

      const auditSpy = vi.spyOn(unrdfBridge, "_logAuditTrail");

      try {
        await unrdfBridge.executeHook("audit-fail-hook", {});
      } catch (error) {
        // Expected
      }

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        })
      );
    });

    it("should handle max retries exceeded", async () => {
      await unrdfBridge.initialize();
      unrdfBridge.maxRetries = 3;

      const hookDef = {
        id: "max-retry-hook",
        name: "Max Retry Hook",
        breeConfig: { jobName: "max-retry-job" },
      };

      await unrdfBridge.registerHook(hookDef);

      let attempts = 0;
      unrdfBridge.scheduler.runJob = vi.fn().mockImplementation(() => {
        attempts++;
        throw new Error(`Attempt ${attempts} failed`);
      });

      await expect(
        unrdfBridge.executeHook("max-retry-hook", {})
      ).rejects.toThrow();

      expect(attempts).toBe(4); // Initial + 3 retries
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Max retries exceeded"),
        expect.any(String)
      );
    });
  });

  describe("Hook Evaluation - SPARQL/RDF Failures", () => {
    beforeEach(() => {
      huskyBridge = new HuskyHookBridge({
        cwd,
        logger: mockLogger,
        enableAudit: false,
      });
    });

    it("should handle invalid SPARQL query", async () => {
      await huskyBridge.initialize();

      // Mock orchestrator to throw SPARQL error
      huskyBridge.orchestrator.evaluate = vi.fn().mockRejectedValue(
        new Error("SPARQL syntax error: Invalid query")
      );

      huskyBridge.eventCapture.captureEvent = vi.fn().mockResolvedValue({
        success: true,
        eventUri: "test://event/123",
        eventId: "test-123",
      });

      const result = await huskyBridge.processHook("pre-commit", {});

      expect(result.success).toBe(true);
      expect(result.hooksTriggered).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("SPARQL syntax error")
      );
    });

    it("should handle missing RDF data", async () => {
      await huskyBridge.initialize();

      huskyBridge.orchestrator.evaluate = vi.fn().mockRejectedValue(
        new Error("RDF data not found")
      );

      huskyBridge.eventCapture.captureEvent = vi.fn().mockResolvedValue({
        success: true,
        eventUri: "test://event/123",
        eventId: "test-123",
      });

      const result = await huskyBridge.processHook("pre-commit", {});

      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("RDF data not found")
      );
    });

    it("should handle RDF type mismatch errors", async () => {
      await huskyBridge.initialize();

      huskyBridge.orchestrator.evaluate = vi.fn().mockRejectedValue(
        new Error("Type mismatch: Expected Literal, got NamedNode")
      );

      huskyBridge.eventCapture.captureEvent = vi.fn().mockResolvedValue({
        success: true,
        eventUri: "test://event/123",
        eventId: "test-123",
      });

      const result = await huskyBridge.processHook("pre-commit", {});

      expect(result.success).toBe(true);
      expect(result.hooksTriggered).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Type mismatch")
      );
    });

    it("should handle hook predicate evaluation failure", async () => {
      await huskyBridge.initialize();

      // Simulate predicate evaluation failure
      huskyBridge.orchestrator.evaluate = vi.fn().mockResolvedValue({
        hooksEvaluated: 5,
        triggeredHooks: [],
        workflowsExecuted: 0,
        errors: [
          {
            hookId: "hook1",
            error: "Predicate evaluation failed: Invalid comparison",
          },
        ],
      });

      huskyBridge.eventCapture.captureEvent = vi.fn().mockResolvedValue({
        success: true,
        eventUri: "test://event/123",
        eventId: "test-123",
      });

      const result = await huskyBridge.processHook("pre-commit", {});

      expect(result.success).toBe(true);
      expect(result.hooksEvaluated).toBe(5);
      expect(result.hooksTriggered).toBe(0);
    });
  });

  describe("Recovery Mechanisms", () => {
    it("should support manual retry of failed hook", async () => {
      unrdfBridge = new UnrdfHooksBridge({
        cwd,
        logger: mockLogger,
        enableAudit: false,
      });

      await unrdfBridge.initialize();

      const hookDef = {
        id: "manual-retry-hook",
        name: "Manual Retry Hook",
        breeConfig: { jobName: "manual-retry-job" },
      };

      await unrdfBridge.registerHook(hookDef);

      // First execution fails
      unrdfBridge.scheduler.runJob = vi
        .fn()
        .mockRejectedValueOnce(new Error("Job failed"));

      try {
        await unrdfBridge.executeHook("manual-retry-hook", {});
      } catch (error) {
        // Expected failure
      }

      // Manual retry succeeds
      unrdfBridge.scheduler.runJob = vi.fn().mockResolvedValue();

      const result = await unrdfBridge.retryHook("manual-retry-hook");

      expect(result.success).toBe(true);
      expect(result.isRetry).toBe(true);
    });

    it("should implement circuit breaker pattern", async () => {
      unrdfBridge = new UnrdfHooksBridge({
        cwd,
        logger: mockLogger,
        enableAudit: false,
        circuitBreakerThreshold: 3,
      });

      await unrdfBridge.initialize();

      const hookDef = {
        id: "circuit-breaker-hook",
        name: "Circuit Breaker Hook",
        breeConfig: { jobName: "circuit-breaker-job" },
      };

      await unrdfBridge.registerHook(hookDef);

      unrdfBridge.scheduler.runJob = vi
        .fn()
        .mockRejectedValue(new Error("Job failed"));

      // Execute 3 times to trip circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await unrdfBridge.executeHook("circuit-breaker-hook", {});
        } catch (error) {
          // Expected
        }
      }

      // Circuit should be open now
      await expect(
        unrdfBridge.executeHook("circuit-breaker-hook", {})
      ).rejects.toThrow("Circuit breaker is open");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Circuit breaker opened")
      );
    });

    it("should implement fallback behavior on failure", async () => {
      unrdfBridge = new UnrdfHooksBridge({
        cwd,
        logger: mockLogger,
        enableAudit: false,
        fallbackBehavior: "skip",
      });

      await unrdfBridge.initialize();

      const hookDef = {
        id: "fallback-hook",
        name: "Fallback Hook",
        breeConfig: { jobName: "fallback-job" },
      };

      await unrdfBridge.registerHook(hookDef);

      unrdfBridge.scheduler.runJob = vi
        .fn()
        .mockRejectedValue(new Error("Job failed"));

      const result = await unrdfBridge.executeHook("fallback-hook", {});

      expect(result.success).toBe(true);
      expect(result.fallback).toBe(true);
      expect(result.fallbackBehavior).toBe("skip");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Fallback behavior applied")
      );
    });

    it("should track failure metrics for observability", async () => {
      unrdfBridge = new UnrdfHooksBridge({
        cwd,
        logger: mockLogger,
        enableAudit: false,
      });

      await unrdfBridge.initialize();

      const hookDef = {
        id: "metrics-hook",
        name: "Metrics Hook",
        breeConfig: { jobName: "metrics-job" },
      };

      await unrdfBridge.registerHook(hookDef);

      // Execute with some failures
      unrdfBridge.scheduler.runJob = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValue();

      await unrdfBridge.executeHook("metrics-hook", {});

      const metrics = unrdfBridge.getErrorMetrics();

      expect(metrics.totalFailures).toBeGreaterThan(0);
      expect(metrics.failuresByHook["metrics-hook"]).toBeDefined();
      expect(metrics.recoveryTimeMs).toBeDefined();
      expect(metrics.meanTimeToRecovery).toBeGreaterThan(0);
    });
  });

  describe("Performance and Recovery Time", () => {
    it("should measure recovery time for failed operations", async () => {
      unrdfBridge = new UnrdfHooksBridge({
        cwd,
        logger: mockLogger,
        enableAudit: false,
      });

      await unrdfBridge.initialize();

      const hookDef = {
        id: "recovery-time-hook",
        name: "Recovery Time Hook",
        breeConfig: { jobName: "recovery-time-job" },
      };

      await unrdfBridge.registerHook(hookDef);

      let attempts = 0;
      unrdfBridge.scheduler.runJob = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Failed")), 50)
          );
        }
        return Promise.resolve();
      });

      const result = await unrdfBridge.executeHook("recovery-time-hook", {});

      expect(result.success).toBe(true);
      expect(result.recoveryTimeMs).toBeGreaterThan(100); // At least 2 * 50ms
      expect(result.retryCount).toBe(2);
    });

    it("should provide detailed error context for debugging", async () => {
      huskyBridge = new HuskyHookBridge({
        cwd,
        logger: mockLogger,
        enableAudit: true,
      });

      await huskyBridge.initialize();

      huskyBridge.eventCapture.captureEvent = vi.fn().mockRejectedValue(
        new Error("Test error with stack trace")
      );

      try {
        await huskyBridge.processHook("pre-commit", {});
      } catch (error) {
        // Expected
      }

      const errorLog = mockLogger.error.mock.calls[0];
      expect(errorLog).toBeDefined();

      const auditLog = huskyBridge.getAuditLog();
      const lastEntry = auditLog[auditLog.length - 1];

      expect(lastEntry.success).toBe(false);
      expect(lastEntry.error).toBeDefined();
      expect(lastEntry.stackTrace).toBeDefined();
      expect(lastEntry.timestamp).toBeDefined();
    });
  });
});
