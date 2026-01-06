# Test Templates and Utilities - GitVan

**Quick Reference Guide for Writing Tests**

This document provides copy-paste ready templates and utilities for writing tests in GitVan. All templates follow the project's testing standards and handle the critical `withGitVan()` context pattern correctly.

---

## Table of Contents

1. [Standard Test File Template](#1-standard-test-file-template)
2. [Error Scenario Templates](#2-error-scenario-templates)
3. [Concurrency Test Templates](#3-concurrency-test-templates)
4. [Mock Utilities](#4-mock-utilities)
5. [Assertion Patterns](#5-assertion-patterns)
6. [Common Pitfalls & Solutions](#6-common-pitfalls--solutions)
7. [Vitest Setup Reference](#7-vitest-setup-reference)
8. [Code Review Checklist](#8-code-review-checklist)

---

## 1. Standard Test File Template

### Basic Composable Test Template

**File**: `tests/composables/my-feature.test.mjs`

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useMyFeature } from "../../src/composables/my-feature.mjs";
import { createTestContext, cleanupTestContext } from "../test-helpers.mjs";

describe("useMyFeature composable", () => {
  let context;

  beforeEach(async () => {
    // Create isolated test context with deterministic environment
    context = await createTestContext({
      repo: "/tmp/test-repo",
      config: {
        // Override default config for testing
      }
    });
  });

  afterEach(async () => {
    // Clean up resources
    await cleanupTestContext(context);
  });

  describe("basic functionality", () => {
    it("should perform core operation successfully", async () => {
      await withGitVan(context, async () => {
        // Arrange
        const feature = useMyFeature();
        const input = { data: "test" };

        // Act
        const result = await feature.doOperation(input);

        // Assert - MINIMUM 3 assertions per test
        expect(result).toBeDefined();
        expect(result.status).toBe("success");
        expect(result.data).toEqual(expect.objectContaining({
          processed: true,
          input: input.data
        }));
      });
    });

    it("should handle synchronous operations", async () => {
      await withGitVan(context, async () => {
        // Arrange
        const feature = useMyFeature();

        // Act
        const result = feature.getSyncData();

        // Assert
        expect(result).toBeDefined();
        expect(typeof result).toBe("object");
        expect(result).toHaveProperty("key");
      });
    });

    it("should maintain state across operations", async () => {
      await withGitVan(context, async () => {
        // Arrange
        const feature = useMyFeature();

        // Act
        await feature.setState("value1");
        const state1 = feature.getState();
        await feature.setState("value2");
        const state2 = feature.getState();

        // Assert
        expect(state1).toBe("value1");
        expect(state2).toBe("value2");
        expect(state1).not.toBe(state2);
      });
    });
  });

  describe("error handling", () => {
    it("should throw error for invalid input", async () => {
      await withGitVan(context, async () => {
        // Arrange
        const feature = useMyFeature();

        // Act & Assert
        await expect(async () => {
          await feature.doOperation(null);
        }).rejects.toThrow("Invalid input");
      });
    });

    it("should handle missing dependencies gracefully", async () => {
      await withGitVan(context, async () => {
        // Arrange
        const feature = useMyFeature();
        const invalidInput = { missingRequired: true };

        // Act & Assert
        await expect(async () => {
          await feature.doOperation(invalidInput);
        }).rejects.toThrow(/dependency/i);
      });
    });

    it("should recover from transient failures", async () => {
      await withGitVan(context, async () => {
        // Arrange
        const feature = useMyFeature();
        let callCount = 0;

        // Mock to fail first time, succeed second time
        vi.spyOn(feature, "internalOperation").mockImplementation(async () => {
          callCount++;
          if (callCount === 1) throw new Error("Transient failure");
          return { success: true };
        });

        // Act
        const result = await feature.doOperationWithRetry();

        // Assert
        expect(result.success).toBe(true);
        expect(callCount).toBe(2);
        expect(result.retries).toBe(1);
      });
    });
  });

  describe("async operations", () => {
    it("should handle multiple async operations sequentially", async () => {
      await withGitVan(context, async () => {
        // Arrange
        const feature = useMyFeature();

        // Act
        const result1 = await feature.asyncOp1();
        const result2 = await feature.asyncOp2(result1);
        const result3 = await feature.asyncOp3(result2);

        // Assert
        expect(result1).toBeDefined();
        expect(result2).toMatchObject({ dependsOn: result1.id });
        expect(result3.chain).toEqual([result1.id, result2.id]);
      });
    });

    it("should handle parallel async operations", async () => {
      await withGitVan(context, async () => {
        // Arrange
        const feature = useMyFeature();

        // Act
        const [result1, result2, result3] = await Promise.all([
          feature.asyncOp1(),
          feature.asyncOp1(),
          feature.asyncOp1()
        ]);

        // Assert
        expect(result1).toBeDefined();
        expect(result2).toBeDefined();
        expect(result3).toBeDefined();
        expect(new Set([result1.id, result2.id, result3.id]).size).toBe(3);
      });
    });
  });

  describe("integration with other composables", () => {
    it("should work with useGit composable", async () => {
      await withGitVan(context, async () => {
        // Arrange
        const feature = useMyFeature();
        const git = useGit();

        // Act
        await git.init();
        const result = await feature.doGitOperation();

        // Assert
        expect(result).toBeDefined();
        expect(result.gitStatus).toEqual(expect.objectContaining({
          branch: "main"
        }));
        expect(git.status).toHaveBeenCalled();
      });
    });
  });
});
```

### CLI Command Test Template

**File**: `tests/cli/commands/my-command.test.mjs`

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { runMain } from "citty";
import myCommand from "../../../src/cli/commands/my-command.mjs";
import { createTestContext, cleanupTestContext } from "../../test-helpers.mjs";

describe("my-command CLI", () => {
  let context;
  let consoleOutput;

  beforeEach(async () => {
    context = await createTestContext();

    // Capture console output
    consoleOutput = [];
    vi.spyOn(console, "log").mockImplementation((msg) => consoleOutput.push(msg));
    vi.spyOn(console, "error").mockImplementation((msg) => consoleOutput.push(msg));
  });

  afterEach(async () => {
    await cleanupTestContext(context);
    vi.restoreAllMocks();
  });

  it("should execute command with valid arguments", async () => {
    // Act
    await runMain(myCommand, {
      rawArgs: ["my-command", "arg1", "arg2"]
    });

    // Assert
    expect(consoleOutput).toContain(expect.stringMatching(/success/i));
    expect(consoleOutput.length).toBeGreaterThan(0);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("should display help when --help flag is provided", async () => {
    // Act
    await runMain(myCommand, {
      rawArgs: ["my-command", "--help"]
    });

    // Assert
    expect(consoleOutput.join("\n")).toContain("Usage:");
    expect(consoleOutput.join("\n")).toContain("Options:");
    expect(consoleOutput.join("\n")).toContain(myCommand.meta.description);
  });

  it("should handle errors gracefully", async () => {
    // Act & Assert
    await expect(async () => {
      await runMain(myCommand, {
        rawArgs: ["my-command", "--invalid-flag"]
      });
    }).rejects.toThrow();
  });
});
```

---

## 2. Error Scenario Templates

### Timeout Error Test

```javascript
describe("timeout handling", () => {
  it("should timeout after configured duration", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      const slowOperation = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      });

      // Act & Assert
      await expect(async () => {
        await feature.executeWithTimeout(slowOperation, { timeout: 100 });
      }).rejects.toThrow(/timeout/i);
    });
  });

  it("should cleanup resources on timeout", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      const cleanupSpy = vi.fn();
      feature.onCleanup(cleanupSpy);

      // Act
      try {
        await feature.executeWithTimeout(
          async () => new Promise((resolve) => setTimeout(resolve, 10000)),
          { timeout: 100 }
        );
      } catch (error) {
        // Expected
      }

      // Assert
      expect(cleanupSpy).toHaveBeenCalledTimes(1);
      expect(cleanupSpy).toHaveBeenCalledWith(expect.objectContaining({
        reason: "timeout"
      }));
    });
  });
});
```

### Dependency Error Test

```javascript
describe("dependency errors", () => {
  it("should detect missing dependencies", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      vi.spyOn(feature, "checkDependencies").mockResolvedValue({
        missing: ["required-dependency"],
        satisfied: []
      });

      // Act & Assert
      await expect(async () => {
        await feature.execute();
      }).rejects.toThrow("Missing dependencies: required-dependency");
    });
  });

  it("should suggest installation for missing dependencies", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();

      // Act
      let error;
      try {
        await feature.executeWithMissingDep();
      } catch (e) {
        error = e;
      }

      // Assert
      expect(error).toBeDefined();
      expect(error.message).toMatch(/missing/i);
      expect(error.suggestion).toMatch(/npm install/i);
    });
  });
});
```

### Permission Error Test

```javascript
describe("permission errors", () => {
  it("should handle read permission denied", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const fs = useFileSystem();
      const path = "/protected/file.txt";
      vi.spyOn(fs, "read").mockRejectedValue(
        new Error("EACCES: permission denied")
      );

      // Act & Assert
      await expect(async () => {
        await fs.read(path);
      }).rejects.toThrow(/permission denied/i);
    });
  });

  it("should handle write permission denied", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const fs = useFileSystem();
      const path = "/protected/file.txt";
      vi.spyOn(fs, "write").mockRejectedValue(
        new Error("EACCES: permission denied")
      );

      // Act & Assert
      await expect(async () => {
        await fs.write(path, "content");
      }).rejects.toThrow(/permission denied/i);
    });
  });

  it("should provide actionable error message for permission issues", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();

      // Act
      let error;
      try {
        await feature.writeProtectedFile();
      } catch (e) {
        error = e;
      }

      // Assert
      expect(error).toBeDefined();
      expect(error.message).toMatch(/permission/i);
      expect(error.help).toMatch(/chmod|chown/i);
    });
  });
});
```

### Resource Exhaustion Test

```javascript
describe("resource exhaustion", () => {
  it("should handle out of memory errors", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      const hugeData = new Array(1e9); // Simulate large data

      // Act & Assert
      await expect(async () => {
        await feature.processLargeData(hugeData);
      }).rejects.toThrow(/memory|heap/i);
    });
  });

  it("should handle file descriptor exhaustion", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      const openFiles = [];

      // Act
      let error;
      try {
        // Open many files without closing
        for (let i = 0; i < 10000; i++) {
          openFiles.push(await feature.openFile(`/tmp/file${i}.txt`));
        }
      } catch (e) {
        error = e;
      }

      // Assert
      expect(error).toBeDefined();
      expect(error.code).toBe("EMFILE");
      expect(error.message).toMatch(/too many open files/i);
    });
  });

  it("should cleanup resources on exhaustion", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      const cleanupSpy = vi.fn();
      feature.onResourceExhaustion(cleanupSpy);

      // Act
      try {
        await feature.exhaustResources();
      } catch (error) {
        // Expected
      }

      // Assert
      expect(cleanupSpy).toHaveBeenCalled();
      expect(feature.getOpenResources()).toHaveLength(0);
    });
  });
});
```

### Recovery Test

```javascript
describe("recovery mechanisms", () => {
  it("should recover from transient network failures", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      let attempts = 0;
      vi.spyOn(feature, "networkCall").mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("ETIMEDOUT");
        }
        return { success: true };
      });

      // Act
      const result = await feature.executeWithRetry({
        maxRetries: 5,
        backoff: "exponential"
      });

      // Assert
      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
      expect(result.retriesUsed).toBe(2);
    });
  });

  it("should use exponential backoff for retries", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      const delays = [];
      let attempts = 0;

      vi.spyOn(feature, "sleep").mockImplementation(async (ms) => {
        delays.push(ms);
      });

      vi.spyOn(feature, "operation").mockImplementation(async () => {
        attempts++;
        if (attempts < 4) throw new Error("Failure");
        return { success: true };
      });

      // Act
      await feature.executeWithRetry({
        maxRetries: 5,
        backoff: "exponential",
        initialDelay: 100
      });

      // Assert
      expect(delays).toHaveLength(3);
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
      expect(delays[2]).toBe(400);
    });
  });

  it("should rollback on unrecoverable failure", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      const rollbackSpy = vi.fn();
      feature.onRollback(rollbackSpy);

      // Act
      try {
        await feature.executeWithRollback({
          operation: async () => {
            throw new Error("Unrecoverable");
          }
        });
      } catch (error) {
        // Expected
      }

      // Assert
      expect(rollbackSpy).toHaveBeenCalledTimes(1);
      expect(rollbackSpy).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(Error),
        state: "rolled_back"
      }));
    });
  });
});
```

---

## 3. Concurrency Test Templates

### Parallel Operation Test

```javascript
describe("parallel operations", () => {
  it("should execute operations in parallel", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      const startTime = Date.now();

      // Act
      const results = await Promise.all([
        feature.operation(1), // Each takes ~100ms
        feature.operation(2),
        feature.operation(3),
        feature.operation(4),
        feature.operation(5)
      ]);

      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
      // Should complete in ~100ms (parallel), not 500ms (sequential)
      expect(duration).toBeLessThan(200);
    });
  });

  it("should handle mixed success and failure in parallel", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();

      // Act
      const results = await Promise.allSettled([
        feature.operation(1), // Success
        feature.failingOperation(2), // Failure
        feature.operation(3), // Success
        feature.failingOperation(4), // Failure
        feature.operation(5) // Success
      ]);

      // Assert
      expect(results).toHaveLength(5);
      expect(results.filter(r => r.status === "fulfilled")).toHaveLength(3);
      expect(results.filter(r => r.status === "rejected")).toHaveLength(2);
    });
  });
});
```

### Lock Contention Test

```javascript
describe("lock contention", () => {
  it("should handle concurrent lock acquisition", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const lock = useLock();
      const resource = "test-resource";
      const executions = [];

      // Act - Multiple concurrent attempts to acquire lock
      const results = await Promise.allSettled(
        Array.from({ length: 10 }, async (_, i) => {
          await lock.acquire(resource);
          executions.push(`execution-${i}`);
          await new Promise(resolve => setTimeout(resolve, 10));
          await lock.release(resource);
          return i;
        })
      );

      // Assert
      expect(results.filter(r => r.status === "fulfilled")).toHaveLength(10);
      // Executions should be serialized by lock
      expect(executions).toHaveLength(10);
      expect(new Set(executions).size).toBe(10);
    });
  });

  it("should timeout waiting for lock", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const lock = useLock();
      const resource = "test-resource";

      // Hold lock in first operation
      await lock.acquire(resource);

      // Act & Assert - Second operation should timeout
      await expect(async () => {
        await lock.acquire(resource, { timeout: 100 });
      }).rejects.toThrow(/lock timeout/i);

      // Cleanup
      await lock.release(resource);
    });
  });

  it("should detect and prevent deadlock", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const lock = useLock();

      // Act - Create potential deadlock scenario
      const task1 = lock.acquireMultiple(["resource-A", "resource-B"]);
      const task2 = lock.acquireMultiple(["resource-B", "resource-A"]);

      // Assert - Should detect and prevent deadlock
      const results = await Promise.allSettled([task1, task2]);
      const failures = results.filter(r => r.status === "rejected");

      expect(failures.length).toBeGreaterThan(0);
      expect(failures[0].reason.message).toMatch(/deadlock/i);
    });
  });
});
```

### Race Condition Test

```javascript
describe("race conditions", () => {
  it("should handle concurrent writes to same resource", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      const state = { counter: 0 };

      // Act - Concurrent increments (race condition)
      await Promise.all(
        Array.from({ length: 100 }, async () => {
          await feature.increment(state);
        })
      );

      // Assert - With proper locking, counter should be 100
      expect(state.counter).toBe(100);
    });
  });

  it("should prevent double execution of idempotent operation", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      const executionCount = { count: 0 };

      // Act - Multiple concurrent calls to idempotent operation
      const results = await Promise.all(
        Array.from({ length: 10 }, async () => {
          return feature.executeIdempotent("operation-id", () => {
            executionCount.count++;
          });
        })
      );

      // Assert - Operation should only execute once despite 10 calls
      expect(executionCount.count).toBe(1);
      expect(results.every(r => r.result === results[0].result)).toBe(true);
    });
  });

  it("should maintain consistency under concurrent updates", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const feature = useMyFeature();
      await feature.initialize({ balance: 1000 });

      // Act - Concurrent withdrawals
      const withdrawals = await Promise.allSettled(
        Array.from({ length: 20 }, async (_, i) => {
          return feature.withdraw(100);
        })
      );

      // Assert
      const successful = withdrawals.filter(r => r.status === "fulfilled");
      const failed = withdrawals.filter(r => r.status === "rejected");

      // Should only allow 10 successful withdrawals (1000 / 100)
      expect(successful).toHaveLength(10);
      expect(failed).toHaveLength(10);

      const finalBalance = await feature.getBalance();
      expect(finalBalance).toBe(0);
    });
  });
});
```

### Deadlock Detection Test

```javascript
describe("deadlock detection", () => {
  it("should detect simple deadlock cycle", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const lock = useLock();

      // Task 1: Lock A → Lock B
      const task1 = async () => {
        await lock.acquire("resource-A");
        await new Promise(resolve => setTimeout(resolve, 10));
        await lock.acquire("resource-B");
      };

      // Task 2: Lock B → Lock A (creates cycle)
      const task2 = async () => {
        await lock.acquire("resource-B");
        await new Promise(resolve => setTimeout(resolve, 10));
        await lock.acquire("resource-A");
      };

      // Act & Assert
      const results = await Promise.allSettled([task1(), task2()]);

      expect(results.some(r => r.status === "rejected")).toBe(true);
      const error = results.find(r => r.status === "rejected").reason;
      expect(error.message).toMatch(/deadlock|cycle/i);
    });
  });

  it("should detect complex deadlock with multiple resources", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const lock = useLock();

      // Create circular dependency: A→B→C→A
      const task1 = lock.acquireChain(["A", "B"]);
      const task2 = lock.acquireChain(["B", "C"]);
      const task3 = lock.acquireChain(["C", "A"]);

      // Act
      const results = await Promise.allSettled([task1, task2, task3]);

      // Assert - At least one should fail with deadlock detection
      expect(results.filter(r => r.status === "rejected").length).toBeGreaterThan(0);
    });
  });

  it("should provide deadlock resolution strategy", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const lock = useLock({ deadlockResolution: "abort-youngest" });

      // Act
      let abortedTask;
      try {
        await Promise.all([
          lock.acquireChain(["A", "B"]),
          lock.acquireChain(["B", "A"])
        ]);
      } catch (error) {
        abortedTask = error;
      }

      // Assert
      expect(abortedTask).toBeDefined();
      expect(abortedTask.resolution).toBe("abort-youngest");
      expect(abortedTask.abortedTask).toBeDefined();
    });
  });
});
```

---

## 4. Mock Utilities

### Mock Job System

```javascript
// tests/mocks/job-system.mock.mjs
import { vi } from "vitest";

export function createMockJobSystem() {
  const jobs = new Map();
  const executions = [];

  return {
    register: vi.fn((name, handler) => {
      jobs.set(name, handler);
    }),

    execute: vi.fn(async (name, context) => {
      executions.push({ name, context, timestamp: Date.now() });
      const handler = jobs.get(name);
      if (!handler) {
        throw new Error(`Job not found: ${name}`);
      }
      return handler(context);
    }),

    schedule: vi.fn((name, cron) => {
      return { name, cron, scheduled: true };
    }),

    getExecutions: () => executions,
    getJob: (name) => jobs.get(name),
    clear: () => {
      jobs.clear();
      executions.length = 0;
    }
  };
}

// Usage example
describe("with mock job system", () => {
  it("should execute job", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const mockJobs = createMockJobSystem();
      context.jobs = mockJobs;

      mockJobs.register("test-job", async (ctx) => {
        return { result: "success", input: ctx.input };
      });

      // Act
      const result = await mockJobs.execute("test-job", { input: "data" });

      // Assert
      expect(result.result).toBe("success");
      expect(mockJobs.execute).toHaveBeenCalledWith("test-job", { input: "data" });
      expect(mockJobs.getExecutions()).toHaveLength(1);
    });
  });
});
```

### Mock Lock System

```javascript
// tests/mocks/lock-system.mock.mjs
import { vi } from "vitest";

export function createMockLockSystem() {
  const locks = new Map();
  const waitQueue = new Map();

  return {
    acquire: vi.fn(async (resource, options = {}) => {
      if (locks.has(resource)) {
        if (options.timeout) {
          throw new Error(`Lock timeout for ${resource}`);
        }
        // Simulate waiting
        await new Promise(resolve => {
          if (!waitQueue.has(resource)) {
            waitQueue.set(resource, []);
          }
          waitQueue.get(resource).push(resolve);
        });
      }

      locks.set(resource, {
        acquiredAt: Date.now(),
        owner: options.owner || "test"
      });

      return { resource, acquired: true };
    }),

    release: vi.fn(async (resource) => {
      if (!locks.has(resource)) {
        throw new Error(`Lock not held: ${resource}`);
      }

      locks.delete(resource);

      // Release waiting tasks
      const waiting = waitQueue.get(resource);
      if (waiting && waiting.length > 0) {
        const next = waiting.shift();
        next();
      }

      return { resource, released: true };
    }),

    extend: vi.fn(async (resource, duration) => {
      if (!locks.has(resource)) {
        throw new Error(`Lock not held: ${resource}`);
      }

      const lock = locks.get(resource);
      lock.extendedAt = Date.now();
      lock.duration = duration;

      return { resource, extended: true };
    }),

    isLocked: (resource) => locks.has(resource),
    getLock: (resource) => locks.get(resource),
    clear: () => {
      locks.clear();
      waitQueue.clear();
    }
  };
}

// Usage example
describe("with mock lock system", () => {
  it("should acquire and release lock", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const mockLock = createMockLockSystem();

      // Act
      await mockLock.acquire("resource-1");
      const isLocked = mockLock.isLocked("resource-1");
      await mockLock.release("resource-1");
      const isStillLocked = mockLock.isLocked("resource-1");

      // Assert
      expect(isLocked).toBe(true);
      expect(isStillLocked).toBe(false);
      expect(mockLock.acquire).toHaveBeenCalledWith("resource-1");
      expect(mockLock.release).toHaveBeenCalledWith("resource-1");
    });
  });
});
```

### Mock Git Operations

```javascript
// tests/mocks/git.mock.mjs
import { vi } from "vitest";

export function createMockGit() {
  const commits = [];
  const branches = new Map([["main", { head: "abc123" }]]);
  const files = new Map();
  let currentBranch = "main";

  return {
    init: vi.fn(async () => {
      return { initialized: true };
    }),

    status: vi.fn(async () => {
      return {
        branch: currentBranch,
        ahead: 0,
        behind: 0,
        modified: Array.from(files.entries())
          .filter(([_, f]) => f.modified)
          .map(([path]) => path),
        staged: Array.from(files.entries())
          .filter(([_, f]) => f.staged)
          .map(([path]) => path),
        untracked: []
      };
    }),

    commit: vi.fn(async (message) => {
      const commit = {
        oid: `commit-${commits.length + 1}`,
        message,
        timestamp: Date.now(),
        branch: currentBranch
      };
      commits.push(commit);

      // Mark staged files as committed
      for (const [path, file] of files) {
        if (file.staged) {
          file.staged = false;
          file.modified = false;
        }
      }

      return commit;
    }),

    branch: vi.fn(async (name) => {
      branches.set(name, { head: commits[commits.length - 1]?.oid || "abc123" });
      return { name, created: true };
    }),

    checkout: vi.fn(async (branch) => {
      if (!branches.has(branch)) {
        throw new Error(`Branch not found: ${branch}`);
      }
      currentBranch = branch;
      return { branch, checkedOut: true };
    }),

    add: vi.fn(async (paths) => {
      const pathArray = Array.isArray(paths) ? paths : [paths];
      for (const path of pathArray) {
        if (!files.has(path)) {
          files.set(path, { content: "", modified: true });
        }
        files.get(path).staged = true;
      }
      return { added: pathArray.length };
    }),

    push: vi.fn(async (options = {}) => {
      return {
        remote: options.remote || "origin",
        branch: options.branch || currentBranch,
        pushed: true
      };
    }),

    pull: vi.fn(async (options = {}) => {
      return {
        remote: options.remote || "origin",
        branch: options.branch || currentBranch,
        pulled: true
      };
    }),

    log: vi.fn(async (options = {}) => {
      const limit = options.limit || commits.length;
      return commits.slice(-limit).reverse();
    }),

    // Helpers
    getCommits: () => commits,
    getBranches: () => Array.from(branches.keys()),
    getCurrentBranch: () => currentBranch,
    getFiles: () => files,
    clear: () => {
      commits.length = 0;
      branches.clear();
      branches.set("main", { head: "abc123" });
      files.clear();
      currentBranch = "main";
    }
  };
}

// Usage example
describe("with mock git", () => {
  it("should commit changes", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const mockGit = createMockGit();
      context.git = mockGit;

      // Act
      await mockGit.add(["file.txt"]);
      const commit = await mockGit.commit("test commit");

      // Assert
      expect(commit.message).toBe("test commit");
      expect(mockGit.getCommits()).toHaveLength(1);
      expect(mockGit.commit).toHaveBeenCalledWith("test commit");
    });
  });
});
```

### Mock File System

```javascript
// tests/mocks/file-system.mock.mjs
import { vi } from "vitest";

export function createMockFileSystem() {
  const files = new Map();
  const directories = new Set(["/"]);

  return {
    read: vi.fn(async (path) => {
      if (!files.has(path)) {
        throw new Error(`ENOENT: no such file or directory: ${path}`);
      }
      return files.get(path).content;
    }),

    write: vi.fn(async (path, content) => {
      files.set(path, {
        content,
        modified: Date.now(),
        size: content.length
      });
      return { path, written: true };
    }),

    delete: vi.fn(async (path) => {
      if (!files.has(path)) {
        throw new Error(`ENOENT: no such file or directory: ${path}`);
      }
      files.delete(path);
      return { path, deleted: true };
    }),

    exists: vi.fn(async (path) => {
      return files.has(path) || directories.has(path);
    }),

    list: vi.fn(async (path) => {
      const prefix = path.endsWith("/") ? path : `${path}/`;
      return Array.from(files.keys())
        .filter(p => p.startsWith(prefix) && p !== prefix)
        .map(p => p.slice(prefix.length).split("/")[0]);
    }),

    mkdir: vi.fn(async (path) => {
      directories.add(path);
      return { path, created: true };
    }),

    stat: vi.fn(async (path) => {
      if (!files.has(path)) {
        throw new Error(`ENOENT: no such file or directory: ${path}`);
      }
      const file = files.get(path);
      return {
        size: file.size,
        modified: file.modified,
        isFile: () => true,
        isDirectory: () => false
      };
    }),

    // Helpers
    getFiles: () => Array.from(files.keys()),
    getContent: (path) => files.get(path)?.content,
    clear: () => {
      files.clear();
      directories.clear();
      directories.add("/");
    }
  };
}

// Usage example
describe("with mock file system", () => {
  it("should read and write files", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const mockFs = createMockFileSystem();

      // Act
      await mockFs.write("/test.txt", "content");
      const content = await mockFs.read("/test.txt");
      const exists = await mockFs.exists("/test.txt");

      // Assert
      expect(content).toBe("content");
      expect(exists).toBe(true);
      expect(mockFs.write).toHaveBeenCalledWith("/test.txt", "content");
    });
  });
});
```

### Mock AI Provider

```javascript
// tests/mocks/ai-provider.mock.mjs
import { vi } from "vitest";

export function createMockAIProvider() {
  const conversations = [];

  return {
    generate: vi.fn(async (prompt, options = {}) => {
      const response = {
        content: `Mock response to: ${prompt.slice(0, 50)}...`,
        model: options.model || "mock-model",
        tokens: {
          input: prompt.length / 4,
          output: 100
        },
        timestamp: Date.now()
      };

      conversations.push({ prompt, response, options });

      return response;
    }),

    chat: vi.fn(async (messages, options = {}) => {
      const lastMessage = messages[messages.length - 1];
      const response = {
        role: "assistant",
        content: `Mock response to: ${lastMessage.content.slice(0, 50)}...`,
        model: options.model || "mock-model"
      };

      conversations.push({ messages, response, options });

      return response;
    }),

    embed: vi.fn(async (text) => {
      // Return deterministic fake embedding
      return Array.from({ length: 1536 }, (_, i) =>
        Math.sin(i * text.length) / text.length
      );
    }),

    // Helpers
    getConversations: () => conversations,
    getLastPrompt: () => conversations[conversations.length - 1]?.prompt,
    getLastResponse: () => conversations[conversations.length - 1]?.response,
    clear: () => {
      conversations.length = 0;
    }
  };
}

// Usage example
describe("with mock AI provider", () => {
  it("should generate response", async () => {
    await withGitVan(context, async () => {
      // Arrange
      const mockAI = createMockAIProvider();

      // Act
      const response = await mockAI.generate("Test prompt", {
        model: "claude-3"
      });

      // Assert
      expect(response.content).toContain("Mock response");
      expect(response.model).toBe("claude-3");
      expect(mockAI.generate).toHaveBeenCalledWith("Test prompt", {
        model: "claude-3"
      });
    });
  });
});
```

---

## 5. Assertion Patterns

### Minimum 3 Assertions Per Test

```javascript
// ✓ GOOD - Multiple specific assertions
it("should create user successfully", async () => {
  const user = await createUser({ name: "Test" });

  expect(user).toBeDefined();                    // 1. Exists
  expect(user.name).toBe("Test");                // 2. Correct data
  expect(user.id).toMatch(/^[a-f0-9-]{36}$/);   // 3. Valid format
});

// ✗ BAD - Single vague assertion
it("should create user successfully", async () => {
  const user = await createUser({ name: "Test" });
  expect(user).toBeTruthy(); // Too vague!
});
```

### Error Case Assertion Patterns

```javascript
// Pattern 1: toThrow matcher
it("should throw on invalid input", async () => {
  await expect(async () => {
    await feature.operation(null);
  }).rejects.toThrow("Invalid input");
});

// Pattern 2: Error object verification
it("should throw with error details", async () => {
  let error;
  try {
    await feature.operation(null);
  } catch (e) {
    error = e;
  }

  expect(error).toBeDefined();
  expect(error.message).toMatch(/invalid/i);
  expect(error.code).toBe("ERR_INVALID_INPUT");
  expect(error.details).toEqual({ field: "input", received: null });
});

// Pattern 3: Error type verification
it("should throw specific error type", async () => {
  await expect(async () => {
    await feature.operation(null);
  }).rejects.toThrow(ValidationError);
});
```

### Async Assertion Patterns

```javascript
// Pattern 1: Await resolution
it("should resolve async operation", async () => {
  const promise = feature.asyncOperation();
  await expect(promise).resolves.toBeDefined();

  const result = await promise;
  expect(result.status).toBe("success");
});

// Pattern 2: Await rejection
it("should reject async operation", async () => {
  const promise = feature.failingOperation();
  await expect(promise).rejects.toThrow("Operation failed");
});

// Pattern 3: Multiple async operations
it("should handle multiple async operations", async () => {
  const [result1, result2, result3] = await Promise.all([
    feature.op1(),
    feature.op2(),
    feature.op3()
  ]);

  expect(result1).toBeDefined();
  expect(result2).toBeDefined();
  expect(result3).toBeDefined();
  expect([result1, result2, result3].every(r => r.success)).toBe(true);
});
```

### State Verification Patterns

```javascript
// Pattern 1: Before/After state
it("should modify state correctly", async () => {
  // Before state
  const initialState = await feature.getState();
  expect(initialState.counter).toBe(0);

  // Operation
  await feature.increment();

  // After state
  const finalState = await feature.getState();
  expect(finalState.counter).toBe(1);
  expect(finalState.modified).toBe(true);
});

// Pattern 2: Side effects verification
it("should trigger expected side effects", async () => {
  const sideEffectSpy = vi.fn();
  feature.onSideEffect(sideEffectSpy);

  await feature.operation();

  expect(sideEffectSpy).toHaveBeenCalledTimes(1);
  expect(sideEffectSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "operation_complete",
      data: expect.any(Object)
    })
  );
});

// Pattern 3: Snapshot testing for complex objects
it("should produce expected output structure", async () => {
  const result = await feature.complexOperation();

  expect(result).toMatchSnapshot();
  // Or for inline snapshots:
  expect(result).toMatchInlineSnapshot(`
    {
      "id": "123",
      "status": "success",
      "data": {...}
    }
  `);
});
```

---

## 6. Common Pitfalls & Solutions

### Pitfall 1: Context Loss in Async

**Problem**: Calling composables after `await` without `withGitVan` wrapper

```javascript
// ✗ WRONG - Context lost after await
async function buggyTest() {
  const git = useGit();
  await someAsyncCall();
  await git.status(); // CRASH - context gone!
}
```

**Solution**: Wrap in `withGitVan`

```javascript
// ✓ CORRECT - Context preserved
async function correctTest() {
  await withGitVan(context, async () => {
    const git = useGit();
    await someAsyncCall();
    await git.status(); // Works!
  });
}
```

### Pitfall 2: Flaky Tests (Non-Deterministic)

**Problem**: Tests that pass/fail randomly due to timestamps, random values, or race conditions

```javascript
// ✗ WRONG - Uses real timestamps
it("should create timestamp", async () => {
  const result = await feature.create();
  expect(result.timestamp).toBe(Date.now()); // Flaky!
});

// ✗ WRONG - Uses random values
it("should generate ID", async () => {
  const result = await feature.create();
  expect(result.id).toBe("abc123"); // Flaky - ID is random!
});
```

**Solution**: Use deterministic data and mocks

```javascript
// ✓ CORRECT - Mock Date.now()
it("should create timestamp", async () => {
  const mockNow = 1234567890;
  vi.spyOn(Date, "now").mockReturnValue(mockNow);

  const result = await feature.create();
  expect(result.timestamp).toBe(mockNow);
});

// ✓ CORRECT - Test ID format, not value
it("should generate ID", async () => {
  const result = await feature.create();
  expect(result.id).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  expect(typeof result.id).toBe("string");
  expect(result.id.length).toBe(36);
});
```

### Pitfall 3: Timeout Issues

**Problem**: Tests timeout due to slow operations or infinite loops

```javascript
// ✗ WRONG - Real network call (slow)
it("should fetch data", async () => {
  const data = await fetch("https://api.example.com/data");
  expect(data).toBeDefined();
});

// ✗ WRONG - No timeout set
it("should complete eventually", async () => {
  await feature.slowOperation(); // Takes 5 minutes!
});
```

**Solution**: Mock slow operations and set timeouts

```javascript
// ✓ CORRECT - Mock network call
it("should fetch data", async () => {
  const mockFetch = vi.fn().mockResolvedValue({ data: "test" });
  global.fetch = mockFetch;

  const data = await fetch("https://api.example.com/data");
  expect(data).toEqual({ data: "test" });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

// ✓ CORRECT - Set timeout for slow tests
it("should complete eventually", async () => {
  await feature.slowOperation();
  expect(true).toBe(true);
}, 30000); // 30 second timeout
```

### Pitfall 4: File System Dependencies

**Problem**: Tests that depend on real file system state

```javascript
// ✗ WRONG - Uses real file system
it("should read config file", async () => {
  const config = await fs.readFile("/etc/gitvan/config.json");
  expect(config).toBeDefined();
});
```

**Solution**: Use in-memory file system or mocks

```javascript
// ✓ CORRECT - Use mock file system
it("should read config file", async () => {
  const mockFs = createMockFileSystem();
  await mockFs.write("/etc/gitvan/config.json", '{"key": "value"}');

  const config = await mockFs.read("/etc/gitvan/config.json");
  const parsed = JSON.parse(config);

  expect(parsed).toEqual({ key: "value" });
  expect(mockFs.read).toHaveBeenCalledWith("/etc/gitvan/config.json");
});
```

### Pitfall 5: Incomplete Cleanup

**Problem**: Tests leave behind state that affects other tests

```javascript
// ✗ WRONG - No cleanup
describe("my tests", () => {
  it("test 1", async () => {
    await feature.createResource("test");
    // ... test logic
    // Resource still exists after test!
  });

  it("test 2", async () => {
    // Fails because resource from test 1 still exists!
    await feature.createResource("test");
  });
});
```

**Solution**: Always cleanup in `afterEach`

```javascript
// ✓ CORRECT - Proper cleanup
describe("my tests", () => {
  let resources = [];

  afterEach(async () => {
    // Cleanup all created resources
    for (const resource of resources) {
      await feature.deleteResource(resource);
    }
    resources = [];
  });

  it("test 1", async () => {
    const resource = await feature.createResource("test");
    resources.push(resource);
    expect(resource).toBeDefined();
  });

  it("test 2", async () => {
    const resource = await feature.createResource("test");
    resources.push(resource);
    expect(resource).toBeDefined();
  });
});
```

### Pitfall 6: Missing Error Assertions

**Problem**: Not testing error cases or only testing happy path

```javascript
// ✗ WRONG - Only tests success case
describe("user creation", () => {
  it("should create user", async () => {
    const user = await createUser({ name: "Test" });
    expect(user).toBeDefined();
  });
  // Missing: What if name is null? Empty? Too long?
});
```

**Solution**: Test error cases explicitly

```javascript
// ✓ CORRECT - Tests both success and error cases
describe("user creation", () => {
  it("should create user with valid data", async () => {
    const user = await createUser({ name: "Test" });
    expect(user).toBeDefined();
    expect(user.name).toBe("Test");
  });

  it("should reject null name", async () => {
    await expect(createUser({ name: null }))
      .rejects.toThrow("Name is required");
  });

  it("should reject empty name", async () => {
    await expect(createUser({ name: "" }))
      .rejects.toThrow("Name cannot be empty");
  });

  it("should reject name over 100 characters", async () => {
    const longName = "a".repeat(101);
    await expect(createUser({ name: longName }))
      .rejects.toThrow("Name too long");
  });
});
```

---

## 7. Vitest Setup Reference

### Available Globals

Vitest provides these globals automatically (no imports needed if configured):

```javascript
// Test structure
describe("suite", () => {});
it("test", () => {});
test("test", () => {}); // alias for it

// Lifecycle hooks
beforeAll(() => {});
afterAll(() => {});
beforeEach(() => {});
afterEach(() => {});

// Assertions
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeDefined();
expect(array).toHaveLength(3);
expect(string).toMatch(/pattern/);
expect(fn).toHaveBeenCalled();

// Mocking
vi.fn();
vi.spyOn(object, "method");
vi.mock("module");
vi.useFakeTimers();
vi.useRealTimers();
```

### Coverage Configuration

**vitest.config.mjs**:

```javascript
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.mjs"],
      exclude: [
        "src/**/*.test.mjs",
        "src/**/*.spec.mjs",
        "node_modules/**"
      ],
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
});
```

Run coverage:
```bash
npm test -- --coverage
```

### Watch Mode for Development

```bash
# Watch all tests
npm test -- --watch

# Watch specific file
npm test -- --watch tests/composables/git.test.mjs

# Watch with coverage
npm test -- --watch --coverage
```

### Parallel Execution Settings

```javascript
export default defineConfig({
  test: {
    // Run tests in parallel (default)
    threads: true,

    // Limit parallel workers
    maxWorkers: 4,

    // Timeout for tests
    testTimeout: 10000, // 10 seconds

    // Retry failed tests
    retry: 2
  }
});
```

### Test Isolation

```javascript
export default defineConfig({
  test: {
    // Isolate test environment
    isolate: true,

    // Pool options
    pool: "threads", // or "forks"

    // Environment
    environment: "node", // or "jsdom" for browser tests

    // Setup files
    setupFiles: ["./tests/setup.mjs"],

    // Global setup
    globalSetup: ["./tests/global-setup.mjs"]
  }
});
```

---

## 8. Code Review Checklist for Tests

Use this checklist when reviewing test code:

### Completeness
- [ ] **Min 3 assertions per test?** Each test should verify multiple aspects
- [ ] **Error cases tested?** Don't just test the happy path
- [ ] **Edge cases covered?** Null, empty, boundary values, etc.
- [ ] **Integration tested?** Tests composables working together

### Correctness
- [ ] **Async context properly wrapped?** All composables in `withGitVan()`
- [ ] **Mocks used correctly?** Mocks reset between tests
- [ ] **No skipped tests?** (`it.skip`, `describe.skip`)
- [ ] **No pending tests?** (`it.todo`)

### Clarity
- [ ] **Clear test names?** Name describes what is being tested
- [ ] **Arrange-Act-Assert pattern?** Clear separation of test phases
- [ ] **Meaningful assertions?** Not just `expect(x).toBeTruthy()`
- [ ] **Deterministic data?** No random values or timestamps

### Quality
- [ ] **Proper cleanup?** `afterEach` removes test artifacts
- [ ] **No side effects between tests?** Each test is isolated
- [ ] **Performance reasonable?** Tests complete in reasonable time
- [ ] **Coverage meets threshold?** 80%+ branches, functions, lines, statements

### Structure
- [ ] **Logical grouping?** Related tests in same `describe` block
- [ ] **Setup in `beforeEach`?** Common setup extracted
- [ ] **Teardown in `afterEach`?** Resources cleaned up
- [ ] **Helper functions extracted?** Reusable test utilities

### Example Review Comments

```javascript
// ✗ NEEDS IMPROVEMENT
it("works", async () => {
  const result = await feature.doThing();
  expect(result).toBeTruthy(); // Too vague!
});
// Comments:
// - Test name not descriptive
// - Only 1 assertion (need 3+)
// - Assertion too vague
// - No error case tested
// - Missing context wrapper

// ✓ APPROVED
it("should process user data and return formatted result", async () => {
  await withGitVan(context, async () => {
    // Arrange
    const feature = useMyFeature();
    const input = { name: "Test", age: 25 };

    // Act
    const result = await feature.processUser(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.name).toBe("Test");
    expect(result.age).toBe(25);
    expect(result.formatted).toBe("Test (25)");
  });
});
// Comments:
// - Descriptive test name ✓
// - 4 specific assertions ✓
// - Proper context wrapper ✓
// - Clear AAA pattern ✓
```

---

## Quick Reference Card

### Essential Imports
```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withGitVan } from "../../src/core/context.mjs";
import { useMyFeature } from "../../src/composables/my-feature.mjs";
```

### Test Structure
```javascript
describe("feature", () => {
  let context;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await cleanupTestContext(context);
  });

  it("should do something", async () => {
    await withGitVan(context, async () => {
      // Test code here
    });
  });
});
```

### Common Assertions
```javascript
expect(value).toBeDefined();
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(array).toHaveLength(3);
expect(string).toMatch(/pattern/);
expect(fn).toHaveBeenCalled();
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow("error");
```

### Running Tests
```bash
npm test                          # Run all tests
npm test -- --coverage            # With coverage
npm test -- --watch              # Watch mode
npm test path/to/test.mjs        # Single file
```

---

**Last Updated**: January 6, 2026
**For**: GitVan v3.0.0 Test Infrastructure
**Maintained by**: Test Infrastructure Specialist
