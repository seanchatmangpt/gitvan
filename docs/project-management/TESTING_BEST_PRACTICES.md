# GitVan Testing Best Practices

> **Comprehensive testing guide for the GitVan codebase**
>
> Target: 80% test coverage across all metrics (branches, functions, lines, statements)

---

## Table of Contents

1. [Composable Testing Pattern](#1-composable-testing-pattern)
2. [Error Handling Testing Pattern](#2-error-handling-testing-pattern)
3. [Async Testing Pattern](#3-async-testing-pattern)
4. [Mocking Strategy](#4-mocking-strategy)
5. [Coverage Validation](#5-coverage-validation)
6. [Test Maintenance](#6-test-maintenance)
7. [Performance Testing](#7-performance-testing)
8. [Common Mistakes & Fixes](#8-common-mistakes--fixes)

---

## 1. Composable Testing Pattern

### Why Use Composables?

Composables (`use*` functions) are the heart of GitVan's architecture:

- **Reusable logic**: Share functionality across components
- **Context-aware**: Automatically access GitVan context via unctx
- **Testable**: Can be tested in isolation or integration
- **Deterministic**: Same input = same output (no side effects)

### How to Test Composables?

All composables MUST be tested within a `withGitVan()` context wrapper or using test environment helpers.

#### Pattern 1: Using Test Environment Helpers (Recommended)

```javascript
import { describe, it, expect } from "vitest";
import {
  withMemFSTestEnvironment,
  withNativeGitTestEnvironment
} from "../src/composables/test-environment.mjs";

describe("useGit() composable", () => {
  describe("with MemFS (fast, unit tests)", () => {
    it("should perform basic Git operations", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Test Repository\n",
            "src/index.js": 'console.log("Hello");\n',
          },
        },
        async (env) => {
          // Test Git status
          const status = await env.gitStatus();
          expect(status).toBeDefined();

          // Test Git log
          const log = await env.gitLog();
          expect(log[0].message).toContain("Initial commit");

          // Test file operations
          env.files.write("src/utils.js", 'export const utils = {};\n');
          await env.gitAdd("src/utils.js");
          await env.gitCommit("Add utils module");

          // Verify commit
          const newLog = await env.gitLog();
          expect(newLog[0].message).toContain("Add utils module");
          expect(newLog).toHaveLength(2);
        }
      );
    });
  });

  describe("with Native Git (slower, integration tests)", () => {
    it("should handle complex workflows", async () => {
      await withNativeGitTestEnvironment(
        {
          initialFiles: {
            "README.md": "# Integration Test\n",
          },
        },
        async (env) => {
          // Create branch
          await env.gitCheckoutBranch("feature/auth");
          env.files.write("src/auth.js", 'export const auth = {};\n');
          await env.gitAdd("src/auth.js");
          await env.gitCommit("Add authentication module");

          // Merge
          await env.gitCheckout("master");
          await env.gitMerge("feature/auth");

          // Verify
          expect(env.files.exists("src/auth.js")).toBe(true);
        }
      );
    });
  });
});
```

#### Pattern 2: Using withGitVan Directly (Advanced)

```javascript
import { withGitVan } from "../src/core/context.mjs";
import { useGit } from "../src/composables/git.mjs";

it("should work with custom context", async () => {
  const context = {
    cwd: "/test/repo",
    env: {
      TZ: "UTC",
      LANG: "C",
      TEST_VAR: "test_value"
    },
  };

  await withGitVan(context, async () => {
    const git = useGit();
    const branch = await git.branch();

    expect(branch).toBeDefined();
  });
});
```

### Mock Dependencies

When testing composables that depend on other composables:

```javascript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useWorkflow() composable", () => {
  let mockGit;

  beforeEach(() => {
    // Mock the useGit composable
    mockGit = {
      status: vi.fn().mockResolvedValue({ clean: true }),
      commit: vi.fn().mockResolvedValue("abc123"),
    };

    vi.doMock("../src/composables/git.mjs", () => ({
      useGit: () => mockGit,
    }));
  });

  it("should use git composable correctly", async () => {
    const { useWorkflow } = await import("../src/composables/workflow.mjs");

    await withGitVan({ cwd: "/test" }, async () => {
      const workflow = useWorkflow();
      await workflow.run();

      expect(mockGit.status).toHaveBeenCalled();
      expect(mockGit.commit).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
```

### Test Both Sync and Async Methods

```javascript
describe("useTemplate() composable", () => {
  it("should handle synchronous operations", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      const template = useTemplate();

      // Sync method
      const filters = template.getFilters();
      expect(filters).toBeInstanceOf(Array);
    });
  });

  it("should handle asynchronous operations", async () => {
    await withMemFSTestEnvironment({
      initialFiles: {
        "templates/test.njk": "Hello {{ name }}!",
      },
    }, async (env) => {
      const template = useTemplate();

      // Async method
      const result = await template.render("test.njk", { name: "World" });
      expect(result).toBe("Hello World!");
    });
  });
});
```

### Complete Example: Testing a Composable

```javascript
/**
 * Complete example: Testing useJob() composable
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withMemFSTestEnvironment } from "../src/composables/test-environment.mjs";
import { useJob } from "../src/composables/job.mjs";

describe("useJob() composable", () => {
  describe("job scanning", () => {
    it("should scan job directory", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "jobs/test-job.mjs": `
              export default {
                name: 'test-job',
                async execute() { return 'success'; }
              };
            `,
          },
        },
        async (env) => {
          const job = useJob();

          const jobs = await job.scan();

          expect(jobs).toHaveLength(1);
          expect(jobs[0].name).toBe("test-job");
        }
      );
    });
  });

  describe("job execution", () => {
    it("should execute job successfully", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "jobs/hello-job.mjs": `
              export default {
                name: 'hello-job',
                async execute(context) {
                  return \`Hello \${context.name}\`;
                }
              };
            `,
          },
        },
        async (env) => {
          const job = useJob();

          const result = await job.execute("hello-job", { name: "GitVan" });

          expect(result).toBe("Hello GitVan");
        }
      );
    });

    it("should handle job errors gracefully", async () => {
      await withMemFSTestEnvironment(
        {
          initialFiles: {
            "jobs/error-job.mjs": `
              export default {
                name: 'error-job',
                async execute() {
                  throw new Error('Job failed');
                }
              };
            `,
          },
        },
        async (env) => {
          const job = useJob();

          await expect(job.execute("error-job")).rejects.toThrow("Job failed");
        }
      );
    });
  });

  describe("job scheduling", () => {
    it("should schedule job with cron expression", async () => {
      await withMemFSTestEnvironment({}, async (env) => {
        const job = useJob();

        const scheduled = await job.schedule("test-job", "0 0 * * *");

        expect(scheduled).toBeDefined();
        expect(scheduled.name).toBe("test-job");
        expect(scheduled.cron).toBe("0 0 * * *");
      });
    });
  });
});
```

---

## 2. Error Handling Testing Pattern

### Why Test Errors?

**Most bugs hide in error paths!** Error handling is critical:

- **Resilience**: System must handle failures gracefully
- **User experience**: Clear error messages help users
- **Debugging**: Proper error propagation aids troubleshooting
- **Coverage**: Error paths often represent 20%+ of code

### How to Trigger Errors in Tests?

#### Pattern 1: Use `expect().rejects.toThrow()`

```javascript
describe("Git error handling", () => {
  it("should throw on invalid checkout", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Expect async function to throw
      await expect(
        env.gitCheckout("nonexistent-branch")
      ).rejects.toThrow();
    });
  });

  it("should throw specific error message", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      await expect(
        env.gitCheckout("nonexistent-branch")
      ).rejects.toThrow(/branch.*not found/i);
    });
  });
});
```

#### Pattern 2: Use try-catch for Complex Scenarios

```javascript
describe("Complex error scenarios", () => {
  it("should handle and log errors", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      let errorCaught = false;
      let errorMessage = "";

      try {
        await env.gitMerge("nonexistent-branch");
      } catch (error) {
        errorCaught = true;
        errorMessage = error.message;
      }

      expect(errorCaught).toBe(true);
      expect(errorMessage).toContain("merge");
    });
  });
});
```

#### Pattern 3: Mock to Force Errors

```javascript
import { vi } from "vitest";

describe("Forced error scenarios", () => {
  it("should handle file system errors", async () => {
    const mockReadFile = vi.fn().mockRejectedValue(
      new Error("ENOENT: File not found")
    );

    vi.doMock("node:fs/promises", () => ({
      readFile: mockReadFile,
    }));

    const { useFileSystem } = await import("../src/composables/file-system.mjs");

    await withGitVan({ cwd: "/test" }, async () => {
      const fs = useFileSystem();

      await expect(fs.read("missing.txt")).rejects.toThrow("ENOENT");
    });
  });
});
```

### Assertions for Error Tests

```javascript
describe("Error assertions", () => {
  it("should validate error type", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      try {
        await env.gitAdd("nonexistent.txt");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe("Error");
        expect(error.message).toBeTruthy();
      }
    });
  });

  it("should validate error properties", async () => {
    const customError = new Error("Custom error");
    customError.code = "CUSTOM_ERROR";
    customError.details = { foo: "bar" };

    expect(customError.code).toBe("CUSTOM_ERROR");
    expect(customError.details).toEqual({ foo: "bar" });
  });
});
```

### Common Error Scenarios

Test these error scenarios for every feature:

```javascript
describe("Common error scenarios", () => {
  describe("1. Invalid input", () => {
    it("should reject null input", async () => {
      await expect(someFunction(null)).rejects.toThrow();
    });

    it("should reject undefined input", async () => {
      await expect(someFunction(undefined)).rejects.toThrow();
    });

    it("should reject invalid type", async () => {
      await expect(someFunction(123)).rejects.toThrow(/expected string/i);
    });
  });

  describe("2. Resource not found", () => {
    it("should handle missing file", async () => {
      await withMemFSTestEnvironment({}, async (env) => {
        await expect(env.gitAdd("missing.txt")).rejects.toThrow();
      });
    });

    it("should handle missing branch", async () => {
      await withMemFSTestEnvironment({}, async (env) => {
        await expect(env.gitCheckout("missing-branch")).rejects.toThrow();
      });
    });
  });

  describe("3. Permission errors", () => {
    it("should handle read-only file system", async () => {
      // Mock read-only FS
      const mockWrite = vi.fn().mockRejectedValue(
        new Error("EACCES: Permission denied")
      );

      await expect(mockWrite()).rejects.toThrow(/permission denied/i);
    });
  });

  describe("4. Network errors", () => {
    it("should handle timeout", async () => {
      const mockFetch = vi.fn().mockRejectedValue(
        new Error("ETIMEDOUT: Request timeout")
      );

      await expect(mockFetch()).rejects.toThrow(/timeout/i);
    });

    it("should handle connection refused", async () => {
      const mockFetch = vi.fn().mockRejectedValue(
        new Error("ECONNREFUSED: Connection refused")
      );

      await expect(mockFetch()).rejects.toThrow(/connection refused/i);
    });
  });

  describe("5. State errors", () => {
    it("should handle invalid state", async () => {
      await withMemFSTestEnvironment({}, async (env) => {
        // Cannot commit without changes
        await expect(env.gitCommit("Empty commit")).rejects.toThrow();
      });
    });
  });
});
```

### Complete Example: Error Path Tests

```javascript
/**
 * Complete example: Error handling in workflow execution
 */
describe("Workflow error handling", () => {
  it("should handle missing workflow file", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      const workflow = useWorkflow();

      await expect(
        workflow.load("missing-workflow.ttl")
      ).rejects.toThrow(/workflow.*not found/i);
    });
  });

  it("should handle invalid workflow syntax", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "workflows/invalid.ttl": "This is not valid Turtle syntax {{{",
        },
      },
      async (env) => {
        const workflow = useWorkflow();

        await expect(
          workflow.load("invalid.ttl")
        ).rejects.toThrow(/parse error/i);
      }
    );
  });

  it("should handle step execution failure", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "workflows/failing.ttl": `
            @prefix : <http://example.com/workflow/> .
            :FailingWorkflow a :Workflow ;
              :hasStep :step1 .
            :step1 a :ScriptStep ;
              :script "exit 1" .
          `,
        },
      },
      async (env) => {
        const workflow = useWorkflow();
        await workflow.load("failing.ttl");

        await expect(
          workflow.execute("FailingWorkflow")
        ).rejects.toThrow(/step.*failed/i);
      }
    );
  });

  it("should provide detailed error context", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      const workflow = useWorkflow();

      try {
        await workflow.load("missing.ttl");
        fail("Should have thrown error");
      } catch (error) {
        // Validate error context
        expect(error.message).toContain("missing.ttl");
        expect(error.code).toBe("WORKFLOW_NOT_FOUND");
        expect(error.details).toMatchObject({
          filename: "missing.ttl",
          path: expect.stringContaining("workflows"),
        });
      }
    });
  });
});
```

---

## 3. Async Testing Pattern

### Critical Concept: withGitVan() Context Wrapper

**THE #1 SOURCE OF BUGS IN GITVAN: Context loss after `await` calls!**

GitVan uses `unctx` for async-safe context preservation. **Without proper wrapping, context is lost!**

### Why Context Matters

```javascript
// ✗ WRONG - Context lost after await
async function buggyTest() {
  const git = useGit();  // Get composable

  await someAsyncOperation();  // ✗ Context lost here!

  await git.commit("msg");  // ✗ CRASH - context gone!
}

// ✓ CORRECT - Context preserved
async function correctTest() {
  await withGitVan({ cwd: "/test" }, async () => {
    const git = useGit();  // Get composable inside wrapper

    await someAsyncOperation();  // ✓ Context preserved!

    await git.commit("msg");  // ✓ Works - context alive!
  });
}
```

### How to Avoid Context Loss

#### Rule 1: Always Use Test Environment Helpers

```javascript
describe("Context-safe tests", () => {
  it("should preserve context with test environment", async () => {
    // ✓ Test environment helpers handle context automatically
    await withMemFSTestEnvironment({}, async (env) => {
      // Context is preserved for the entire async block
      await env.gitStatus();
      await env.gitLog();
      await env.gitCommit("test");
    });
  });
});
```

#### Rule 2: Use withGitVan for Custom Contexts

```javascript
describe("Custom context tests", () => {
  it("should preserve context with withGitVan wrapper", async () => {
    const context = { cwd: "/test/repo", env: { TZ: "UTC" } };

    // ✓ withGitVan preserves context
    await withGitVan(context, async () => {
      const git = useGit();

      await git.status();     // ✓ Context alive
      await git.log();        // ✓ Context alive
      await git.commit("msg"); // ✓ Context alive
    });
  });
});
```

#### Rule 3: Get Composables Inside Context Block

```javascript
describe("Composable instantiation", () => {
  it("should instantiate composables inside context", async () => {
    // ✗ WRONG - Composable created outside context
    const git = useGit();  // Throws or returns invalid instance

    await withGitVan({ cwd: "/test" }, async () => {
      await git.status();  // ✗ Won't work
    });
  });

  it("should instantiate composables inside context", async () => {
    // ✓ CORRECT - Composable created inside context
    await withGitVan({ cwd: "/test" }, async () => {
      const git = useGit();    // ✓ Correct
      await git.status();       // ✓ Works
    });
  });
});
```

### Testing Concurrent Operations

```javascript
describe("Concurrent async operations", () => {
  it("should handle multiple operations in parallel", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // All operations share the same context
      const results = await Promise.all([
        env.gitStatus(),
        env.gitLog(),
        env.gitCurrentBranch(),
      ]);

      expect(results[0]).toBeDefined(); // status
      expect(results[1]).toBeDefined(); // log
      expect(results[2]).toBe("master"); // branch
    });
  });

  it("should handle sequential operations", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Sequential operations maintain context
      env.files.write("file1.txt", "content1");
      await env.gitAdd("file1.txt");
      await env.gitCommit("Add file1");

      env.files.write("file2.txt", "content2");
      await env.gitAdd("file2.txt");
      await env.gitCommit("Add file2");

      const log = await env.gitLog();
      expect(log).toHaveLength(3); // Initial + 2 commits
    });
  });
});
```

### Nested Context Tests

```javascript
describe("Nested contexts", () => {
  it("should handle nested withGitVan calls", async () => {
    const outerContext = { cwd: "/outer", env: { LEVEL: "outer" } };
    const innerContext = { cwd: "/inner", env: { LEVEL: "inner" } };

    await withGitVan(outerContext, async () => {
      const git1 = useGit();
      const ctx1 = useGitVan();
      expect(ctx1.env.LEVEL).toBe("outer");

      await withGitVan(innerContext, async () => {
        const git2 = useGit();
        const ctx2 = useGitVan();
        expect(ctx2.env.LEVEL).toBe("inner");
      });

      // Back to outer context
      const ctx3 = useGitVan();
      expect(ctx3.env.LEVEL).toBe("outer");
    });
  });
});
```

### Complete Example: Async Pattern Tests

```javascript
/**
 * Complete example: Testing async workflow execution
 */
describe("Async workflow execution", () => {
  it("should execute multi-step workflow with context", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "workflows/multi-step.ttl": `
            @prefix : <http://example.com/workflow/> .
            :MultiStep a :Workflow ;
              :hasStep :build ;
              :hasStep :test ;
              :hasStep :deploy .
            :build a :ScriptStep ;
              :script "echo 'Building...'" .
            :test a :ScriptStep ;
              :script "echo 'Testing...'" ;
              :dependsOn :build .
            :deploy a :ScriptStep ;
              :script "echo 'Deploying...'" ;
              :dependsOn :test .
          `,
        },
      },
      async (env) => {
        const workflow = useWorkflow();

        // Load workflow (async)
        await workflow.load("multi-step.ttl");

        // Parse workflow (async)
        const parsed = await workflow.parse("MultiStep");
        expect(parsed.steps).toHaveLength(3);

        // Execute workflow (async)
        const result = await workflow.execute("MultiStep");
        expect(result.status).toBe("success");
        expect(result.steps).toHaveLength(3);

        // Verify all steps completed
        for (const step of result.steps) {
          expect(step.status).toBe("completed");
        }
      }
    );
  });

  it("should handle async errors in workflow", async () => {
    await withMemFSTestEnvironment(
      {
        initialFiles: {
          "workflows/error-workflow.ttl": `
            @prefix : <http://example.com/workflow/> .
            :ErrorWorkflow a :Workflow ;
              :hasStep :failingStep .
            :failingStep a :ScriptStep ;
              :script "exit 1" .
          `,
        },
      },
      async (env) => {
        const workflow = useWorkflow();

        await workflow.load("error-workflow.ttl");

        // Should throw during async execution
        await expect(
          workflow.execute("ErrorWorkflow")
        ).rejects.toThrow(/step.*failed/i);
      }
    );
  });

  it("should preserve context across multiple awaits", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      const git = useGit();

      // Multiple awaits - context must be preserved
      await new Promise((resolve) => setTimeout(resolve, 10));
      const status1 = await git.status();
      expect(status1).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 10));
      const log1 = await git.log();
      expect(log1).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 10));
      const branch1 = await git.branch();
      expect(branch1).toBe("master");
    });
  });
});
```

---

## 4. Mocking Strategy

### When to Mock, When to Test Real

Use the **Test Pyramid**:

```
        /\
       /E2E\      ← Few, expensive, full integration
      /------\
     /  Int.  \   ← Some, moderate cost, partial integration
    /----------\
   /   Unit     \ ← Many, cheap, fast, mocked
  /--------------\
```

#### Unit Tests: Mock Dependencies

```javascript
describe("Unit tests (mocked)", () => {
  it("should test function logic with mocks", async () => {
    // Mock external dependencies
    const mockGit = {
      status: vi.fn().mockResolvedValue({ clean: true }),
      commit: vi.fn().mockResolvedValue("abc123"),
    };

    vi.doMock("../src/composables/git.mjs", () => ({
      useGit: () => mockGit,
    }));

    // Test the function logic in isolation
    const { myFunction } = await import("../src/utils/my-function.mjs");
    const result = await myFunction();

    expect(result).toBe(expected);
    expect(mockGit.status).toHaveBeenCalled();
  });
});
```

#### Integration Tests: Test Real Interactions

```javascript
describe("Integration tests (real)", () => {
  it("should test real Git interactions", async () => {
    // Use real Git operations
    await withNativeGitTestEnvironment({}, async (env) => {
      // Real Git commands
      env.files.write("test.txt", "content");
      await env.gitAdd("test.txt");
      await env.gitCommit("Add test file");

      // Real verification
      const log = await env.gitLog();
      expect(log[0].message).toContain("Add test file");
    });
  });
});
```

#### E2E Tests: Test Entire System

```javascript
describe("E2E tests (full system)", () => {
  it("should test complete workflow end-to-end", async () => {
    await withNativeGitTestEnvironment(
      {
        initialFiles: {
          "workflows/deploy.ttl": "...",
          "src/app.js": "...",
        },
      },
      async (env) => {
        // Run actual CLI command
        const { execSync } = await import("child_process");
        const output = execSync("gitvan workflow run deploy", {
          cwd: env.cwd,
        });

        // Verify real outcomes
        expect(output.toString()).toContain("Workflow completed");
        expect(env.files.exists("dist/app.js")).toBe(true);
      }
    );
  });
});
```

### Mock Pyramid Decision Tree

```
Need to test?
├─ Pure logic/algorithms → Unit test with mocks
├─ Component interaction → Integration test with partial mocks
└─ User workflow → E2E test with real system
```

### Git Operations Mocking

```javascript
describe("Mocking Git operations", () => {
  it("should mock Git commands", async () => {
    const mockExecFile = vi.fn().mockResolvedValue({
      stdout: "master\n",
      stderr: "",
    });

    vi.doMock("node:child_process", () => ({
      execFile: mockExecFile,
    }));

    const { useGit } = await import("../src/composables/git.mjs");

    await withGitVan({ cwd: "/test" }, async () => {
      const git = useGit();
      const branch = await git.branch();

      expect(branch).toBe("master");
      expect(mockExecFile).toHaveBeenCalledWith(
        "git",
        ["rev-parse", "--abbrev-ref", "HEAD"],
        expect.objectContaining({ cwd: "/test" })
      );
    });
  });
});
```

### File System Mocking (memfs)

```javascript
describe("Mocking file system", () => {
  it("should use memfs for fast file operations", async () => {
    // memfs is automatically used with withMemFSTestEnvironment
    await withMemFSTestEnvironment({}, async (env) => {
      // All file operations are in-memory
      env.files.write("test.txt", "content");
      const content = env.files.read("test.txt");

      expect(content).toBe("content");
      expect(env.files.exists("test.txt")).toBe(true);
    });
  });

  it("should verify backend type", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      expect(env.getBackendType()).toBe("memfs");
    });

    await withNativeGitTestEnvironment({}, async (env) => {
      expect(env.getBackendType()).toBe("native");
    });
  });
});
```

### AI Provider Mocking

```javascript
import { MockGitVanAIProvider } from "../tests/ai-mock-provider.mjs";

describe("Mocking AI provider", () => {
  it("should mock AI responses", async () => {
    const mockProvider = new MockGitVanAIProvider({
      responses: [
        "First response",
        "Second response",
      ],
    });

    const response1 = await mockProvider.generate("prompt1");
    expect(response1).toBe("First response");

    const response2 = await mockProvider.generate("prompt2");
    expect(response2).toBe("Second response");
  });

  it("should mock streaming responses", async () => {
    const mockProvider = new MockGitVanAIProvider({
      streamResponses: true,
    });

    const stream = mockProvider.generateStream("prompt");
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
  });
});
```

### Complete Example: Mock Setup and Usage

```javascript
/**
 * Complete example: Mocking strategy for workflow system
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Workflow system with mocking", () => {
  let mockGit;
  let mockTemplate;
  let mockJob;

  beforeEach(() => {
    // Setup mocks before each test
    mockGit = {
      status: vi.fn().mockResolvedValue({ clean: true }),
      commit: vi.fn().mockResolvedValue("abc123"),
      log: vi.fn().mockResolvedValue([
        { hash: "abc123", message: "Test commit" },
      ]),
    };

    mockTemplate = {
      render: vi.fn().mockResolvedValue("rendered content"),
      compile: vi.fn().mockResolvedValue(() => "compiled"),
    };

    mockJob = {
      scan: vi.fn().mockResolvedValue([
        { name: "test-job", path: "/jobs/test-job.mjs" },
      ]),
      execute: vi.fn().mockResolvedValue({ status: "success" }),
    };

    // Mock modules
    vi.doMock("../src/composables/git.mjs", () => ({
      useGit: () => mockGit,
    }));
    vi.doMock("../src/composables/template.mjs", () => ({
      useTemplate: () => mockTemplate,
    }));
    vi.doMock("../src/composables/job.mjs", () => ({
      useJob: () => mockJob,
    }));
  });

  afterEach(() => {
    // Reset mocks after each test
    vi.resetAllMocks();
  });

  describe("Unit tests with mocks", () => {
    it("should execute workflow with mocked dependencies", async () => {
      const { useWorkflow } = await import("../src/composables/workflow.mjs");

      await withGitVan({ cwd: "/test" }, async () => {
        const workflow = useWorkflow();

        // Execute workflow (uses mocked dependencies)
        const result = await workflow.run("test-workflow");

        // Verify mocks were called
        expect(mockGit.status).toHaveBeenCalled();
        expect(mockTemplate.render).toHaveBeenCalled();
        expect(mockJob.execute).toHaveBeenCalled();

        // Verify result
        expect(result.status).toBe("success");
      });
    });

    it("should handle mock errors", async () => {
      // Mock an error scenario
      mockGit.status.mockRejectedValue(new Error("Git failed"));

      const { useWorkflow } = await import("../src/composables/workflow.mjs");

      await withGitVan({ cwd: "/test" }, async () => {
        const workflow = useWorkflow();

        await expect(workflow.run("test-workflow")).rejects.toThrow("Git failed");

        expect(mockGit.status).toHaveBeenCalled();
      });
    });
  });

  describe("Integration tests with real dependencies", () => {
    it("should test with real Git operations", async () => {
      // Don't mock - use real operations
      await withNativeGitTestEnvironment({}, async (env) => {
        env.files.write("test.txt", "content");
        await env.gitAdd("test.txt");
        await env.gitCommit("Test commit");

        const log = await env.gitLog();
        expect(log[0].message).toContain("Test commit");
      });
    });
  });
});
```

---

## 5. Coverage Validation

### How to Measure Test Coverage

```bash
# Run tests with coverage
npm test -- --coverage

# Output:
# ----------------------|---------|----------|---------|---------|
# File                  | % Stmts | % Branch | % Funcs | % Lines |
# ----------------------|---------|----------|---------|---------|
# All files             |   82.5  |   80.3   |   85.1  |   82.8  |
# src/composables/git   |   90.2  |   88.5   |   92.0  |   90.5  |
# src/workflow/engine   |   75.8  |   72.1   |   78.3  |   76.2  |
# ----------------------|---------|----------|---------|---------|
```

### What 80% Coverage Means

**80% minimum across all metrics:**

- **Statements**: 80% of executable statements run
- **Branches**: 80% of decision points tested (if/else, switch, ternary)
- **Functions**: 80% of functions called
- **Lines**: 80% of code lines executed

```javascript
// Example: Branch coverage
function example(value) {
  if (value > 10) {      // Branch 1
    return "high";
  } else if (value > 5) { // Branch 2
    return "medium";
  } else {                // Branch 3
    return "low";
  }
}

// Need tests for all 3 branches to reach 100% branch coverage
it("should cover all branches", () => {
  expect(example(15)).toBe("high");    // Branch 1 ✓
  expect(example(7)).toBe("medium");   // Branch 2 ✓
  expect(example(2)).toBe("low");      // Branch 3 ✓
});
```

### Which Metrics Matter

**Priority order:**

1. **Branches** (most important) - Find untested decision paths
2. **Functions** - Ensure all functions are used
3. **Lines** - Basic code execution coverage
4. **Statements** - Usually similar to lines

```javascript
// Why branches matter most:
function processData(data) {
  if (!data) {
    throw new Error("No data");  // Branch 1
  }

  if (data.length === 0) {
    return [];  // Branch 2
  }

  return data.map(item => item * 2);  // Branch 3
}

// ✗ BAD: Only 33% branch coverage
it("should process data", () => {
  expect(processData([1, 2, 3])).toEqual([2, 4, 6]);  // Only Branch 3
});

// ✓ GOOD: 100% branch coverage
describe("processData", () => {
  it("should throw on null data", () => {
    expect(() => processData(null)).toThrow("No data");  // Branch 1
  });

  it("should return empty array for empty data", () => {
    expect(processData([])).toEqual([]);  // Branch 2
  });

  it("should process data", () => {
    expect(processData([1, 2, 3])).toEqual([2, 4, 6]);  // Branch 3
  });
});
```

### How to Improve Weak Areas

#### Step 1: Identify Uncovered Code

```bash
# Generate coverage report
npm test -- --coverage

# Open HTML report
open coverage/index.html
```

#### Step 2: Focus on Red/Yellow Lines

- **Red**: Not covered at all
- **Yellow**: Partially covered (some branches missed)
- **Green**: Fully covered

#### Step 3: Write Missing Tests

```javascript
// Example: Uncovered error path (red)
function divide(a, b) {
  if (b === 0) {
    throw new Error("Division by zero");  // ← RED: Not tested
  }
  return a / b;  // ← GREEN: Tested
}

// Add test to cover red path:
it("should throw on division by zero", () => {
  expect(() => divide(10, 0)).toThrow("Division by zero");
});
```

### Red/Yellow/Green Thresholds

Vitest configuration (`vitest.config.mjs`):

```javascript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 80,   // Minimum 80% branch coverage
          functions: 80,  // Minimum 80% function coverage
          lines: 80,      // Minimum 80% line coverage
          statements: 80, // Minimum 80% statement coverage
        },
      },
    },
  },
});
```

**Color coding:**

- **Red** (< 50%): Critical - immediate attention needed
- **Yellow** (50-79%): Warning - needs improvement
- **Green** (≥ 80%): Good - meets minimum standard
- **Dark Green** (≥ 95%): Excellent - exceptional coverage

### Complete Example: Coverage Improvement

```javascript
/**
 * Before: Low coverage (45% branches)
 */
function processUser(user) {
  if (!user) {
    throw new Error("User required");
  }

  if (!user.email) {
    throw new Error("Email required");
  }

  if (user.age < 18) {
    return { ...user, status: "minor" };
  }

  if (user.age >= 65) {
    return { ...user, status: "senior" };
  }

  return { ...user, status: "adult" };
}

// ✗ Initial test - only 20% branch coverage
describe("processUser (initial)", () => {
  it("should process adult user", () => {
    const user = { name: "John", email: "john@example.com", age: 30 };
    const result = processUser(user);
    expect(result.status).toBe("adult");
  });
});

/**
 * After: High coverage (100% branches)
 */
describe("processUser (improved)", () => {
  it("should throw on missing user", () => {
    expect(() => processUser(null)).toThrow("User required");
  });

  it("should throw on missing email", () => {
    expect(() => processUser({ name: "John", age: 30 })).toThrow("Email required");
  });

  it("should mark minor users", () => {
    const user = { name: "Jane", email: "jane@example.com", age: 15 };
    const result = processUser(user);
    expect(result.status).toBe("minor");
  });

  it("should mark senior users", () => {
    const user = { name: "Bob", email: "bob@example.com", age: 70 };
    const result = processUser(user);
    expect(result.status).toBe("senior");
  });

  it("should mark adult users", () => {
    const user = { name: "John", email: "john@example.com", age: 30 };
    const result = processUser(user);
    expect(result.status).toBe("adult");
  });
});

// Coverage improved: 20% → 100% ✓
```

---

## 6. Test Maintenance

### Keeping Tests from Becoming Brittle

Brittle tests break when implementation changes, even if behavior is correct.

#### Anti-Pattern: Testing Implementation

```javascript
// ✗ BAD: Brittle - tests implementation details
it("should call internal method", () => {
  const workflow = new Workflow();
  const spy = vi.spyOn(workflow, "_parseInternal");

  workflow.parse("test.ttl");

  expect(spy).toHaveBeenCalled();  // Breaks if refactored
});
```

#### Best Practice: Testing Behavior

```javascript
// ✓ GOOD: Tests behavior, not implementation
it("should parse workflow correctly", async () => {
  const workflow = useWorkflow();

  await workflow.load("test.ttl");
  const result = await workflow.parse("TestWorkflow");

  expect(result.name).toBe("TestWorkflow");
  expect(result.steps).toHaveLength(3);
  // Test what it does, not how it does it
});
```

### When Tests Need Updating

#### 1. Design Change (Update Tests)

```javascript
// Old API
it("should get user by ID", async () => {
  const user = await getUser(123);
  expect(user.name).toBe("John");
});

// New API (return value changed)
it("should get user by ID", async () => {
  const result = await getUser(123);  // Now returns { user, metadata }
  expect(result.user.name).toBe("John");
  expect(result.metadata.fetchedAt).toBeDefined();
});
```

#### 2. Bug Fix (Add Regression Test)

```javascript
// Bug: Division by zero not handled
it("should throw on division by zero", () => {
  expect(() => divide(10, 0)).toThrow("Division by zero");
});
```

#### 3. New Feature (Add Tests)

```javascript
// New feature: User roles
it("should assign role to user", async () => {
  const user = { name: "John", email: "john@example.com" };
  const result = await assignRole(user, "admin");

  expect(result.role).toBe("admin");
  expect(result.permissions).toContain("manage-users");
});
```

### When Tests Are Dead (Cleanup)

Delete tests when:

- Feature removed
- Code no longer exists
- Test duplicates another test
- Test is always skipped

```javascript
// ✗ Dead test - remove it
it.skip("should do something that no longer exists", () => {
  // This feature was removed in v2.0
});

// ✓ Instead, remove the test entirely
```

### Test File Organization

```
tests/
├── unit/                      # Unit tests (fast, mocked)
│   ├── composables/
│   │   ├── git.test.mjs
│   │   ├── template.test.mjs
│   │   └── workflow.test.mjs
│   └── utils/
│       └── helpers.test.mjs
├── integration/               # Integration tests (moderate)
│   ├── workflow-integration.test.mjs
│   └── pack-lifecycle.test.mjs
├── e2e/                       # End-to-end tests (slow)
│   ├── cli-integration.test.mjs
│   └── workflow-capabilities.test.mjs
└── setup.mjs                  # Global test setup
```

### Naming Conventions

```javascript
// ✓ GOOD: Descriptive, clear intent
describe("useGit() composable", () => {
  describe("branch operations", () => {
    it("should create new branch", async () => {});
    it("should checkout existing branch", async () => {});
    it("should throw on invalid branch name", async () => {});
  });

  describe("commit operations", () => {
    it("should commit with message", async () => {});
    it("should throw on empty message", async () => {});
  });
});

// ✗ BAD: Vague, unclear
describe("git", () => {
  it("test1", () => {});
  it("test2", () => {});
  it("works", () => {});
});
```

### Complete Example: Test Maintenance

```javascript
/**
 * Maintainable test suite example
 */
describe("User management", () => {
  // Helper functions - DRY principle
  const createTestUser = (overrides = {}) => ({
    name: "John Doe",
    email: "john@example.com",
    age: 30,
    ...overrides,
  });

  // Clear setup/teardown
  beforeEach(async () => {
    // Setup test environment
  });

  afterEach(async () => {
    // Cleanup
  });

  // Group related tests
  describe("user creation", () => {
    it("should create user with valid data", async () => {
      const user = createTestUser();
      const result = await createUser(user);

      // Test behavior, not implementation
      expect(result.id).toBeDefined();
      expect(result.name).toBe(user.name);
      expect(result.email).toBe(user.email);
    });

    it("should validate email format", async () => {
      const user = createTestUser({ email: "invalid-email" });

      await expect(createUser(user)).rejects.toThrow(/invalid email/i);
    });
  });

  describe("user updates", () => {
    it("should update user name", async () => {
      const user = createTestUser();
      const created = await createUser(user);

      const updated = await updateUser(created.id, { name: "Jane Doe" });

      expect(updated.name).toBe("Jane Doe");
      expect(updated.email).toBe(user.email); // Other fields unchanged
    });
  });

  // Regression test (from bug fix)
  describe("regression: email uniqueness", () => {
    it("should prevent duplicate emails", async () => {
      const user1 = createTestUser({ email: "test@example.com" });
      const user2 = createTestUser({ email: "test@example.com" });

      await createUser(user1);

      await expect(createUser(user2)).rejects.toThrow(/email already exists/i);
    });
  });
});
```

---

## 7. Performance Testing

### Why Performance Tests Matter

- **Regression detection**: Catch performance degradation early
- **Optimization validation**: Verify improvements
- **Resource limits**: Ensure operations complete within constraints
- **User experience**: Fast tests = fast feedback

### How to Write Performant Tests

#### Pattern 1: Use MemFS for Speed

```javascript
describe("Performance: MemFS vs Native", () => {
  it("should be fast with MemFS", async () => {
    const start = performance.now();

    await withMemFSTestEnvironment({}, async (env) => {
      // Fast in-memory operations
      for (let i = 0; i < 100; i++) {
        env.files.write(`file${i}.txt`, "content");
        await env.gitAdd(`file${i}.txt`);
        await env.gitCommit(`Add file ${i}`);
      }
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(3000); // Should be < 3s

    console.log(`✓ MemFS: ${duration.toFixed(2)}ms`);
  });

  it("should be slower with Native Git", async () => {
    const start = performance.now();

    await withNativeGitTestEnvironment({}, async (env) => {
      // Real disk I/O operations
      for (let i = 0; i < 20; i++) {
        env.files.write(`file${i}.txt`, "content");
        await env.gitAdd(`file${i}.txt`);
        await env.gitCommit(`Add file ${i}`);
      }
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10000); // Should be < 10s

    console.log(`✓ Native: ${duration.toFixed(2)}ms`);
  });
});
```

#### Pattern 2: Measure Specific Operations

```javascript
describe("Performance: Individual operations", () => {
  it("should parse workflow quickly", async () => {
    await withMemFSTestEnvironment({
      initialFiles: {
        "workflows/test.ttl": generateLargeWorkflow(100), // 100 steps
      },
    }, async (env) => {
      const workflow = useWorkflow();

      const start = performance.now();
      await workflow.load("test.ttl");
      const parsed = await workflow.parse("TestWorkflow");
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // Should parse in < 500ms
      expect(parsed.steps).toHaveLength(100);

      console.log(`✓ Parsed 100 steps in ${duration.toFixed(2)}ms`);
    });
  });
});
```

### Timeout Strategies

#### Global Timeout (vitest.config.mjs)

```javascript
export default defineConfig({
  test: {
    testTimeout: 30000, // 30 seconds default
  },
});
```

#### Per-Test Timeout

```javascript
describe("Custom timeouts", () => {
  it("should complete quickly", async () => {
    // Fast test - use default timeout (30s)
  });

  it("should handle long operation", { timeout: 60000 }, async () => {
    // Slow test - extend to 60s
    await longRunningOperation();
  });

  it("should be really fast", { timeout: 1000 }, async () => {
    // Very fast test - reduce to 1s
    await quickOperation();
  });
});
```

### Identifying Slow Tests

```bash
# Run tests with timing
npm test -- --reporter=verbose

# Output shows timing per test:
# ✓ tests/unit/git.test.mjs > useGit > status (45ms)
# ✓ tests/unit/git.test.mjs > useGit > commit (120ms)
# ⚠ tests/integration/workflow.test.mjs > workflow > execute (8500ms) ← SLOW!
```

### Optimization Strategies

```javascript
describe("Performance optimization", () => {
  // ✗ SLOW: Creates new environment per test
  it("test 1", async () => {
    await withNativeGitTestEnvironment({}, async (env) => {
      // ... test
    });
  });

  it("test 2", async () => {
    await withNativeGitTestEnvironment({}, async (env) => {
      // ... test
    });
  });

  // ✓ FAST: Shares environment (when safe)
  describe("optimized", () => {
    let sharedEnv;

    beforeAll(async () => {
      sharedEnv = await createTestEnvironment();
    });

    afterAll(async () => {
      await sharedEnv.cleanup();
    });

    it("test 1", async () => {
      // Use shared environment
      await sharedEnv.doSomething();
    });

    it("test 2", async () => {
      // Use shared environment
      await sharedEnv.doSomethingElse();
    });
  });
});
```

### Complete Example: Performance Testing

```javascript
/**
 * Complete example: Performance testing workflow execution
 */
describe("Workflow execution performance", () => {
  describe("Baseline performance", () => {
    it("should execute simple workflow quickly", async () => {
      await withMemFSTestEnvironment({
        initialFiles: {
          "workflows/simple.ttl": `
            @prefix : <http://example.com/workflow/> .
            :Simple a :Workflow ;
              :hasStep :echo .
            :echo a :ScriptStep ;
              :script "echo 'Hello'" .
          `,
        },
      }, async (env) => {
        const workflow = useWorkflow();

        const start = performance.now();
        await workflow.load("simple.ttl");
        await workflow.execute("Simple");
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(100); // < 100ms for simple workflow
        console.log(`✓ Simple workflow: ${duration.toFixed(2)}ms`);
      });
    });
  });

  describe("Stress testing", () => {
    it("should handle large workflow", async () => {
      const stepCount = 50;
      const workflowTTL = generateWorkflowWithSteps(stepCount);

      await withMemFSTestEnvironment({
        initialFiles: {
          "workflows/large.ttl": workflowTTL,
        },
      }, async (env) => {
        const workflow = useWorkflow();

        const start = performance.now();
        await workflow.load("large.ttl");
        const result = await workflow.execute("LargeWorkflow");
        const duration = performance.now() - start;

        // Should scale linearly: ~50ms per step
        expect(duration).toBeLessThan(stepCount * 100);
        expect(result.steps).toHaveLength(stepCount);

        console.log(`✓ ${stepCount} steps: ${duration.toFixed(2)}ms`);
        console.log(`  Average: ${(duration / stepCount).toFixed(2)}ms per step`);
      });
    });
  });

  describe("Parallel execution", () => {
    it("should execute independent steps in parallel", async () => {
      await withMemFSTestEnvironment({
        initialFiles: {
          "workflows/parallel.ttl": `
            @prefix : <http://example.com/workflow/> .
            :Parallel a :Workflow ;
              :hasStep :step1 ;
              :hasStep :step2 ;
              :hasStep :step3 .
            :step1 a :ScriptStep ; :script "sleep 0.1" .
            :step2 a :ScriptStep ; :script "sleep 0.1" .
            :step3 a :ScriptStep ; :script "sleep 0.1" .
          `,
        },
      }, async (env) => {
        const workflow = useWorkflow();

        const start = performance.now();
        await workflow.load("parallel.ttl");
        await workflow.execute("Parallel");
        const duration = performance.now() - start;

        // Parallel: ~100ms total (not 300ms sequential)
        expect(duration).toBeLessThan(200);

        console.log(`✓ Parallel execution: ${duration.toFixed(2)}ms`);
      });
    });
  });

  describe("Memory efficiency", () => {
    it("should not leak memory", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Execute many workflows
      for (let i = 0; i < 100; i++) {
        await withMemFSTestEnvironment({
          initialFiles: {
            "workflows/test.ttl": generateSimpleWorkflow(),
          },
        }, async (env) => {
          const workflow = useWorkflow();
          await workflow.load("test.ttl");
          await workflow.execute("TestWorkflow");
        });
      }

      // Force garbage collection (if available)
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      // Should not increase by more than 50MB
      expect(memoryIncreaseMB).toBeLessThan(50);

      console.log(`✓ Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    });
  });
});

// Helper function
function generateWorkflowWithSteps(count) {
  const steps = Array.from({ length: count }, (_, i) => `
    :step${i} a :ScriptStep ;
      :script "echo 'Step ${i}'" .
  `).join("\n");

  const hasSteps = Array.from({ length: count }, (_, i) =>
    `:hasStep :step${i} ;`
  ).join("\n      ");

  return `
    @prefix : <http://example.com/workflow/> .
    :LargeWorkflow a :Workflow ;
      ${hasSteps} .
    ${steps}
  `;
}
```

---

## 8. Common Mistakes & Fixes

### Mistake 1: Context Lost in Async

#### ✗ Wrong

```javascript
// Context lost after await
async function buggyTest() {
  const git = useGit();  // Get composable

  await someAsyncOperation();  // ✗ Context lost!

  await git.commit("msg");  // ✗ CRASH!
}
```

#### ✓ Fix

```javascript
// Use withGitVan wrapper
async function correctTest() {
  await withGitVan({ cwd: "/test" }, async () => {
    const git = useGit();  // Get inside context

    await someAsyncOperation();  // ✓ Context preserved

    await git.commit("msg");  // ✓ Works!
  });
}
```

### Mistake 2: Flaky Time-Based Tests

#### ✗ Wrong

```javascript
// Depends on system time - flaky!
it("should create timestamp", () => {
  const result = createTimestamp();
  expect(result).toBe("2024-01-15T10:30:00Z");  // ✗ Fails at different times
});
```

#### ✓ Fix

```javascript
// Use deterministic data or mock time
it("should create timestamp", () => {
  const mockDate = new Date("2024-01-15T10:30:00Z");
  vi.setSystemTime(mockDate);

  const result = createTimestamp();
  expect(result).toBe("2024-01-15T10:30:00Z");  // ✓ Always passes

  vi.useRealTimers();
});
```

### Mistake 3: No Assertions

#### ✗ Wrong

```javascript
// No assertions - test passes even if broken!
it("should process data", async () => {
  await processData([1, 2, 3]);
  // ✗ No assertions - what are we testing?
});
```

#### ✓ Fix

```javascript
// Minimum 3 assertions per test (rule of thumb)
it("should process data", async () => {
  const result = await processData([1, 2, 3]);

  expect(result).toBeDefined();              // 1. Result exists
  expect(result).toHaveLength(3);            // 2. Correct length
  expect(result).toEqual([2, 4, 6]);         // 3. Correct values
});
```

### Mistake 4: Only Happy Path

#### ✗ Wrong

```javascript
// Only tests success case
describe("divide function", () => {
  it("should divide numbers", () => {
    expect(divide(10, 2)).toBe(5);  // ✗ Only happy path
  });
});
```

#### ✓ Fix

```javascript
// Test error cases too
describe("divide function", () => {
  it("should divide numbers", () => {
    expect(divide(10, 2)).toBe(5);
  });

  it("should throw on division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Division by zero");
  });

  it("should handle negative numbers", () => {
    expect(divide(-10, 2)).toBe(-5);
  });

  it("should handle decimal results", () => {
    expect(divide(10, 3)).toBeCloseTo(3.333, 2);
  });
});
```

### Mistake 5: Brittle Selectors

#### ✗ Wrong

```javascript
// Tests implementation details
it("should call internal method", () => {
  const obj = new MyClass();
  const spy = vi.spyOn(obj, "_internalMethod");

  obj.publicMethod();

  expect(spy).toHaveBeenCalled();  // ✗ Breaks if refactored
});
```

#### ✓ Fix

```javascript
// Test behavior, not implementation
it("should produce correct result", () => {
  const obj = new MyClass();

  const result = obj.publicMethod();

  expect(result).toBe(expectedValue);  // ✓ Tests behavior
});
```

### Mistake 6: Shared Mutable State

#### ✗ Wrong

```javascript
// Shared state causes test interdependence
let sharedData = { count: 0 };

it("test 1", () => {
  sharedData.count++;
  expect(sharedData.count).toBe(1);  // ✓ Passes when run alone
});

it("test 2", () => {
  expect(sharedData.count).toBe(0);  // ✗ Fails when run after test 1
});
```

#### ✓ Fix

```javascript
// Reset state in beforeEach
describe("tests with state", () => {
  let data;

  beforeEach(() => {
    data = { count: 0 };  // ✓ Fresh state per test
  });

  it("test 1", () => {
    data.count++;
    expect(data.count).toBe(1);
  });

  it("test 2", () => {
    expect(data.count).toBe(0);  // ✓ Passes independently
  });
});
```

### Mistake 7: Ignoring Async Errors

#### ✗ Wrong

```javascript
// Async errors swallowed - test passes incorrectly
it("should handle error", () => {
  asyncFunction().catch(err => {
    // ✗ Error caught but not tested
  });
  // Test completes before async operation
});
```

#### ✓ Fix

```javascript
// Use async/await or return Promise
it("should handle error", async () => {
  await expect(asyncFunction()).rejects.toThrow("Expected error");
});
```

### Mistake 8: Too Many Mocks

#### ✗ Wrong

```javascript
// Over-mocked - tests nothing real
it("should do something", async () => {
  const mock1 = vi.fn().mockResolvedValue("a");
  const mock2 = vi.fn().mockResolvedValue("b");
  const mock3 = vi.fn().mockResolvedValue("c");
  const mock4 = vi.fn().mockResolvedValue("d");

  // Everything mocked - what are we testing?
  const result = await myFunction(mock1, mock2, mock3, mock4);
  expect(result).toBe("abcd");  // ✗ Just testing mocks
});
```

#### ✓ Fix

```javascript
// Mock only external dependencies
it("should do something", async () => {
  // Mock only external API
  const mockApi = vi.fn().mockResolvedValue({ data: "real data" });

  // Test real logic with one mocked dependency
  const result = await myFunction(mockApi);
  expect(result.processed).toBe(true);
  expect(result.data).toContain("real data");
});
```

### Complete Example: Common Mistakes Fixed

```javascript
/**
 * Before: Tests with common mistakes
 */
describe("User service (bad)", () => {
  let userData = { name: "John", age: 30 };  // ✗ Shared state

  it("should create user", () => {  // ✗ No async
    createUser(userData);
    expect(userData.id).toBeDefined();  // ✗ Only 1 assertion
  });

  it("should update user", () => {  // ✗ No error testing
    updateUser(userData);
    // ✗ No assertions at all!
  });
});

/**
 * After: Tests with fixes applied
 */
describe("User service (good)", () => {
  let userData;

  beforeEach(() => {
    // ✓ Fresh state per test
    userData = { name: "John", age: 30 };
  });

  describe("user creation", () => {
    it("should create user with valid data", async () => {  // ✓ Async
      const result = await createUser(userData);

      // ✓ Multiple assertions
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe("John");
      expect(result.age).toBe(30);
    });

    it("should throw on invalid data", async () => {  // ✓ Error path
      const invalidData = { age: 30 };  // Missing name

      await expect(createUser(invalidData)).rejects.toThrow(/name required/i);
    });
  });

  describe("user updates", () => {
    it("should update user successfully", async () => {
      const created = await createUser(userData);
      const updated = await updateUser(created.id, { name: "Jane" });

      // ✓ Test behavior
      expect(updated.name).toBe("Jane");
      expect(updated.age).toBe(30);
      expect(updated.id).toBe(created.id);
    });

    it("should throw on non-existent user", async () => {  // ✓ Error path
      await expect(
        updateUser("non-existent-id", { name: "Jane" })
      ).rejects.toThrow(/user not found/i);
    });
  });
});
```

---

## Summary Checklist

Before claiming a test is complete, verify:

- [ ] **Composable Pattern**: Tests use `withGitVan()` or test environment helpers
- [ ] **Error Handling**: Error paths tested with `expect().rejects.toThrow()`
- [ ] **Async Safety**: No context loss - all composables inside context wrapper
- [ ] **Mocking Strategy**: Appropriate level (unit = mocked, integration = real)
- [ ] **Coverage**: ≥80% across branches, functions, lines, statements
- [ ] **Maintenance**: Tests behavior not implementation, clear naming
- [ ] **Performance**: Uses MemFS for speed, appropriate timeouts
- [ ] **No Common Mistakes**:
  - ✓ Context preserved in async
  - ✓ Deterministic data (no time/randomness)
  - ✓ Minimum 3 assertions per test
  - ✓ Both happy path and error paths
  - ✓ Tests behavior not implementation
  - ✓ Fresh state per test
  - ✓ Async errors caught
  - ✓ Not over-mocked

---

## Quick Reference

### Test Structure Template

```javascript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withMemFSTestEnvironment } from "../src/composables/test-environment.mjs";

describe("Feature name", () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe("happy path", () => {
    it("should do something correctly", async () => {
      await withMemFSTestEnvironment({}, async (env) => {
        // Arrange
        const input = "test data";

        // Act
        const result = await doSomething(input);

        // Assert
        expect(result).toBeDefined();
        expect(result).toBe(expected);
        expect(result.property).toMatchObject({});
      });
    });
  });

  describe("error handling", () => {
    it("should throw on invalid input", async () => {
      await withMemFSTestEnvironment({}, async (env) => {
        await expect(doSomething(null)).rejects.toThrow();
      });
    });
  });
});
```

### Common Assertions

```javascript
// Equality
expect(value).toBe(expected);                // Strict equality
expect(value).toEqual(expected);             // Deep equality
expect(value).toMatchObject({ key: "val" }); // Partial match

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(3.14, 2); // Decimal precision

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);
expect(array).toContainEqual({ key: "val" });

// Strings
expect(string).toMatch(/regex/);
expect(string).toContain("substring");

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow("message");
expect(async () => fn()).rejects.toThrow();

// Mocks
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(3);
```

---

**Last Updated**: January 6, 2026
**For**: GitVan v3.0.0
**Maintained by**: Testing Practices Documentarian
