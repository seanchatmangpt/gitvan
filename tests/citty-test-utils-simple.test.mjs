import { describe, it, expect } from "vitest";
import {
  runLocalCitty,
  wrapExpectation,
  scenario,
  TestConfig,
  FileSystemOperations,
  RetryManager,
  CircuitBreaker,
  PerformanceMonitor,
  MemoryMonitor,
  TestMetrics,
  TestDataManager,
  createTestDataManager,
} from "../vendors/citty-test-utils/index.js";

describe("Citty Test Utils - Core Functionality", () => {
  describe("Basic Assertions", () => {
    it("should provide fluent assertion API", () => {
      const mockResult = {
        exitCode: 0,
        stdout: "Hello World",
        stderr: "",
        args: ["--help"],
        cwd: "/app",
      };

      const expectation = wrapExpectation(mockResult);
      expectation.expectExit(0).expectOutput("Hello").expectStderr("");

      console.log("✅ Assertions API works correctly");
    });
  });

  describe("Scenario DSL", () => {
    it("should create basic scenarios", async () => {
      const testScenario = scenario("test scenario")
        .step("setup", (ctx) => {
          ctx.message = "Hello";
          return ctx;
        })
        .step("process", (ctx) => {
          ctx.processed = true;
          return ctx;
        })
        .expect((ctx) => {
          if (!ctx.processed) throw new Error("Expected processed to be true");
        });

      const results = await testScenario.execute();
      expect(results.success).toBe(true);
      console.log("✅ Scenario DSL works");
    });
  });

  describe("Configuration", () => {
    it("should manage configuration", () => {
      const config = new TestConfig();
      config.setEnv("TEST_VAR", "test_value");
      config.set("timeout", 5000);

      expect(config.getEnv("TEST_VAR")).toBe("test_value");
      expect(config.get("timeout")).toBe(5000);
      console.log("✅ Configuration works");
    });
  });

  describe("File System", () => {
    it("should perform file operations", () => {
      const fs = new FileSystemOperations();

      fs.writeFile("test-file.txt", "Hello World");
      fs.expectFileExists("test-file.txt");
      fs.expectFileContent("test-file.txt", "Hello World");

      fs.deleteFile("test-file.txt");
      fs.expectFileNotExists("test-file.txt");

      console.log("✅ File system operations work");
    });
  });

  describe("Resilience", () => {
    it("should handle retries", async () => {
      let attempts = 0;
      const retryManager = new RetryManager({ maxRetries: 2, delay: 10 });

      const result = await retryManager.execute(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary failure");
        }
        return "success";
      });

      expect(result).toBe("success");
      expect(attempts).toBe(3);
      console.log("✅ Retry mechanism works");
    });
  });

  describe("Performance Monitoring", () => {
    it("should monitor performance", () => {
      const monitor = new PerformanceMonitor();

      monitor.startTimer("test-operation");
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait
      }
      const duration = monitor.endTimer("test-operation");

      expect(duration).toBeGreaterThan(0);
      console.log("✅ Performance monitoring works");
    });
  });

  describe("Test Data", () => {
    it("should generate test data", () => {
      const manager = createTestDataManager();

      const randomString = manager.generate("string", { length: 10 });
      expect(randomString).toHaveLength(10);

      const email = manager.generate("email");
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

      console.log("✅ Test data generation works");
    });
  });
});
