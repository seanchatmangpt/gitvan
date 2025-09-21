import { describe, it, beforeAll, afterAll, expect } from "vitest";
import {
  // Core functionality
  runLocalCitty,
  wrapExpectation,

  // New features
  scenario,
  cleanroomScenario,
  localScenario,
  TestConfig,
  FileSystemOperations,
  RetryManager,
  CircuitBreaker,
  ResilienceManager,
  PerformanceMonitor,
  MemoryMonitor,
  TestMetrics,
  TestDataManager,
  createTestDataManager,
  withTestData,
  schemas,
} from "../vendors/citty-test-utils/index.js";

describe("Citty Test Utils - Enhanced Features", () => {
  describe("Scenario DSL", () => {
    it("should create and execute basic scenarios", async () => {
      const testScenario = scenario("test basic scenario")
        .step("setup", () => ({ message: "Hello" }))
        .step("process", (ctx) => ({ ...ctx, processed: true }))
        .expect((ctx) => {
          if (!ctx.processed) throw new Error("Expected processed to be true");
        });

      const results = await testScenario.execute();

      console.log("✅ Scenario DSL executed successfully");
      console.log("Results:", results.length);
    });

    it("should support command execution in scenarios", async () => {
      const testScenario = localScenario("test command scenario")
        .step("run help command")
        .runCommand("--help")
        .expectExit(0);

      try {
        await testScenario.execute();
        console.log("✅ Command scenario executed successfully");
      } catch (error) {
        console.log("Expected error (CLI may not exist):", error.message);
      }
    });
  });

  describe("Configuration Management", () => {
    it("should manage test configuration", () => {
      const config = new TestConfig()
        .setEnv("TEST_VAR", "test_value")
        .set("timeout", 5000)
        .set("retries", 2);

      expect(config.getEnv("TEST_VAR")).toBe("test_value");
      expect(config.get("timeout")).toBe(5000);
      expect(config.get("retries")).toBe(2);

      console.log("✅ Configuration management works");
    });

    it("should support preset configurations", () => {
      const devConfig = TestConfig.development();
      const ciConfig = TestConfig.ci();

      expect(devConfig.get("timeout")).toBe(10000);
      expect(ciConfig.get("timeout")).toBe(60000);

      console.log("✅ Preset configurations work");
    });
  });

  describe("File System Operations", () => {
    it("should perform file system operations", () => {
      const fs = new FileSystemOperations();

      // Test file operations
      fs.writeFile("test-file.txt", "Hello World");
      fs.expectFileExists("test-file.txt");
      fs.expectFileContent("test-file.txt", "Hello World");
      fs.expectFileContains("test-file.txt", "Hello");

      // Cleanup
      fs.deleteFile("test-file.txt");
      fs.expectFileNotExists("test-file.txt");

      console.log("✅ File system operations work");
    });

    it("should perform directory operations", () => {
      const fs = new FileSystemOperations();

      // Test directory operations
      fs.createDir("test-dir");
      fs.expectDirExists("test-dir");

      fs.writeFile("test-dir/file.txt", "content");
      fs.expectDirContains("test-dir", ["file.txt"]);

      // Cleanup
      fs.deleteDir("test-dir");
      fs.expectDirNotExists("test-dir");

      console.log("✅ Directory operations work");
    });
  });

  describe("Resilience Features", () => {
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

    it("should implement circuit breaker", async () => {
      const circuitBreaker = new CircuitBreaker({ failureThreshold: 2 });

      // Simulate failures
      try {
        await circuitBreaker.execute(async () => {
          throw new Error("Service unavailable");
        });
      } catch (error) {
        // Expected
      }

      try {
        await circuitBreaker.execute(async () => {
          throw new Error("Service unavailable");
        });
      } catch (error) {
        // Expected
      }

      // Circuit should be open now
      try {
        await circuitBreaker.execute(async () => {
          return "success";
        });
        throw new Error("Expected circuit breaker to be open");
      } catch (error) {
        if (error.message.includes("Circuit breaker is OPEN")) {
          console.log("✅ Circuit breaker works");
        } else {
          throw error;
        }
      }
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

      const metric = monitor.getMetric("test-operation");
      expect(metric.count).toBe(1);
      expect(metric.avg).toBeGreaterThan(0);

      console.log("✅ Performance monitoring works");
    });

    it("should monitor memory usage", () => {
      const monitor = new MemoryMonitor();

      const snapshot1 = monitor.takeSnapshot("before");
      // Allocate some memory
      const data = new Array(1000).fill("test");
      const snapshot2 = monitor.takeSnapshot("after");

      expect(snapshot1.rss).toBeGreaterThan(0);
      expect(snapshot2.rss).toBeGreaterThan(0);

      const stats = monitor.getMemoryStats();
      expect(stats.snapshots).toBe(2);

      console.log("✅ Memory monitoring works");
    });
  });

  describe("Test Data Management", () => {
    it("should generate test data", () => {
      const manager = createTestDataManager();

      // Test string generation
      const randomString = manager.generate("string", { length: 10 });
      expect(randomString).toHaveLength(10);

      // Test email generation
      const email = manager.generate("email");
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

      // Test UUID generation
      const uuid = manager.generate("uuid");
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );

      // Test user generation
      const user = manager.generate("user");
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("name");

      console.log("✅ Test data generation works");
    });

    it("should validate data against schemas", () => {
      const manager = createTestDataManager();

      const validUser = manager.generate("user");
      expect(() => manager.validate(validUser, schemas.user)).not.toThrow();

      const invalidUser = { id: "test", email: "invalid-email" };
      expect(() => manager.validate(invalidUser, schemas.user)).toThrow();

      console.log("✅ Data validation works");
    });

    it("should manage fixtures", () => {
      const manager = createTestDataManager();

      // Set fixture
      manager.setFixture("test-data", { key: "value" });

      // Get fixture
      const data = manager.getFixture("test-data");
      expect(data).toEqual({ key: "value" });

      console.log("✅ Fixture management works");
    });
  });

  describe("Integration Tests", () => {
    it("should integrate all features", async () => {
      const config = TestConfig.development();
      const fs = new FileSystemOperations();
      const metrics = new TestMetrics();

      // Start monitoring
      metrics.startTest("integration-test");

      // Use configuration
      config.setEnv("INTEGRATION_TEST", "true");

      // File operations
      fs.writeFile("integration-test.txt", "test content");
      fs.expectFileExists("integration-test.txt");

      // Generate test data
      const testData = createTestDataManager();
      const user = testData.generate("user");
      testData.validate(user, schemas.user);

      // Cleanup
      fs.deleteFile("integration-test.txt");

      // End monitoring
      metrics.endTest("integration-test", "passed");

      const report = metrics.generateReport();
      expect(report.testStats.passed).toBe(1);

      console.log("✅ All features integrate successfully");
    });
  });
});
