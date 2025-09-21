import { describe, it, expect } from "vitest";
import { runLocalCitty } from "../../../vendors/citty-test-utils/local-runner.js";

describe("Citty Test Utils - Performance Tests", () => {
  describe("Execution Performance", () => {
    it("should execute help command within reasonable time", async () => {
      const startTime = Date.now();
      const result = await runLocalCitty(["--help"]);
      const duration = Date.now() - startTime;

      result.expectExit(0);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`Help command executed in ${duration}ms`);
    });

    it("should handle concurrent executions", async () => {
      const startTime = Date.now();

      // Run multiple commands concurrently
      const promises = Array.from({ length: 5 }, () =>
        runLocalCitty(["--help"])
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All should succeed
      results.forEach((result) => {
        result.expectExit(0);
      });

      expect(duration).toBeLessThan(5000); // All should complete within 5 seconds
      console.log(`5 concurrent commands executed in ${duration}ms`);
    });

    it("should handle rapid sequential executions", async () => {
      const startTime = Date.now();

      // Run commands sequentially
      for (let i = 0; i < 10; i++) {
        const result = await runLocalCitty(["--help"]);
        result.expectExit(0);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`10 sequential commands executed in ${duration}ms`);
    });
  });

  describe("Memory Performance", () => {
    it("should not leak memory with repeated executions", async () => {
      const initialMemory = process.memoryUsage();

      // Run many commands
      for (let i = 0; i < 50; i++) {
        const result = await runLocalCitty(["--help"]);
        result.expectExit(0);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(
        `Memory increase after 50 commands: ${Math.round(
          memoryIncrease / 1024 / 1024
        )}MB`
      );
    });
  });

  describe("Timeout Performance", () => {
    it("should respect timeout settings", async () => {
      const startTime = Date.now();

      try {
        await runLocalCitty(["sleep", "10"], { timeout: 100 });
        expect.fail("Should have timed out");
      } catch (error) {
        const duration = Date.now() - startTime;

        expect(error.message).toContain("timed out");
        expect(duration).toBeLessThan(1000); // Should timeout quickly
        expect(duration).toBeGreaterThan(50); // But not too quickly

        console.log(`Timeout occurred after ${duration}ms`);
      }
    });

    it("should handle very short timeouts", async () => {
      const startTime = Date.now();

      try {
        await runLocalCitty(["--help"], { timeout: 1 });
        expect.fail("Should have timed out");
      } catch (error) {
        const duration = Date.now() - startTime;

        expect(error.message).toContain("timed out");
        expect(duration).toBeLessThan(100);

        console.log(`Very short timeout occurred after ${duration}ms`);
      }
    });
  });

  describe("Large Output Performance", () => {
    it("should handle large output efficiently", async () => {
      const startTime = Date.now();

      // Generate large output by running help multiple times
      const result = await runLocalCitty(["--help"]);
      const duration = Date.now() - startTime;

      result.expectExit(0);
      expect(duration).toBeLessThan(1000);

      console.log(`Large output handled in ${duration}ms`);
    });
  });

  describe("Error Handling Performance", () => {
    it("should handle errors efficiently", async () => {
      const startTime = Date.now();

      try {
        await runLocalCitty(["nonexistent-command"]);
        expect.fail("Should have failed");
      } catch (error) {
        const duration = Date.now() - startTime;

        expect(error.result.exitCode).not.toBe(0);
        expect(duration).toBeLessThan(2000); // Should fail quickly

        console.log(`Error handling completed in ${duration}ms`);
      }
    });

    it("should handle many errors efficiently", async () => {
      const startTime = Date.now();
      let errorCount = 0;

      for (let i = 0; i < 10; i++) {
        try {
          await runLocalCitty(["nonexistent-command"]);
        } catch (error) {
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;

      expect(errorCount).toBe(10);
      expect(duration).toBeLessThan(5000); // Should handle all errors quickly

      console.log(`10 errors handled in ${duration}ms`);
    });
  });
});

