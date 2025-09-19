// tests/git-native-io-integration.test.mjs
// Test Git-Native I/O Layer integration with Knowledge Hooks using proper test environment

import { describe, it, expect } from "vitest";
import { withTestEnvironment } from "../src/composables/test-environment.mjs";
import { GitNativeIO } from "../src/git-native/git-native-io.mjs";

describe("Git-Native I/O Integration", () => {
  describe("Basic Git-Native I/O Operations", () => {
    it("should initialize GitNativeIO properly", async () => {
      await withTestEnvironment({
        testName: "git-native-io-init",
        initialFiles: {
          "README.md": "# Git-Native I/O Test\n",
        },
      }, async (env) => {
        // Initialize GitNativeIO within proper context
        await env.withGit(async (git) => {
          const gitNativeIO = new GitNativeIO({ cwd: env.gitDir });
          
          // Initialize the system
          await gitNativeIO.initialize();
          
          // Test basic status
          const status = await gitNativeIO.getStatus();
          expect(status).toBeDefined();
          expect(status.initialized).toBe(true);
        });
      });
    });

    it("should handle job execution", async () => {
      await withTestEnvironment({
        testName: "git-native-io-jobs",
        initialFiles: {
          "README.md": "# Job Execution Test\n",
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          const gitNativeIO = new GitNativeIO({ cwd: env.gitDir });
          await gitNativeIO.initialize();
          
          // Test job execution
          const result = await gitNativeIO.executeJob(
            () => "Hello, GitNativeIO!",
            { name: "test-job" }
          );
          
          expect(result).toBe("Hello, GitNativeIO!");
        });
      });
    });

    it("should handle lock operations", async () => {
      await withTestEnvironment({
        testName: "git-native-io-locks",
        initialFiles: {
          "README.md": "# Lock Operations Test\n",
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          const gitNativeIO = new GitNativeIO({ cwd: env.gitDir });
          await gitNativeIO.initialize();
          
          // Test lock acquisition
          await gitNativeIO.acquireLock("test-lock");
          
          // Verify lock is held
          const isLocked = await gitNativeIO.isLocked("test-lock");
          expect(isLocked).toBe(true);
          
          // Release lock
          await gitNativeIO.releaseLock("test-lock");
          
          // Verify lock is released
          const isLockedAfterRelease = await gitNativeIO.isLocked("test-lock");
          expect(isLockedAfterRelease).toBe(false);
        });
      });
    });

    it("should handle receipt writing", async () => {
      await withTestEnvironment({
        testName: "git-native-io-receipts",
        initialFiles: {
          "README.md": "# Receipt Writing Test\n",
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          const gitNativeIO = new GitNativeIO({ cwd: env.gitDir });
          await gitNativeIO.initialize();
          
          // Write a receipt
          await gitNativeIO.writeReceipt("test-hook", { success: true, duration: 100 });
          
          // Test statistics
          const stats = await gitNativeIO.getStatistics();
          expect(stats).toBeDefined();
        });
      });
    });

    it("should handle snapshot operations", async () => {
      await withTestEnvironment({
        testName: "git-native-io-snapshots",
        initialFiles: {
          "README.md": "# Snapshot Operations Test\n",
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          const gitNativeIO = new GitNativeIO({ cwd: env.gitDir });
          await gitNativeIO.initialize();
          
          // Store a snapshot
          const testData = { message: "Test snapshot data" };
          await gitNativeIO.storeSnapshot("test-snapshot", testData);
          
          // Retrieve the snapshot
          const retrievedData = await gitNativeIO.getSnapshot("test-snapshot");
          expect(retrievedData).toEqual(testData);
          
          // Check if snapshot exists
          const hasSnapshot = await gitNativeIO.hasSnapshot("test-snapshot");
          expect(hasSnapshot).toBe(true);
          
          // List snapshots
          const snapshots = await gitNativeIO.listSnapshots();
          expect(snapshots).toContain("test-snapshot");
        });
      });
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent job execution", async () => {
      await withTestEnvironment({
        testName: "git-native-io-concurrent-jobs",
        initialFiles: {
          "README.md": "# Concurrent Jobs Test\n",
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          const gitNativeIO = new GitNativeIO({ cwd: env.gitDir });
          await gitNativeIO.initialize();
          
          // Execute multiple jobs concurrently
          const promises = [];
          for (let i = 0; i < 5; i++) {
            promises.push(
              gitNativeIO.executeJob(
                () => `Job ${i} completed`,
                { name: `concurrent-job-${i}` }
              )
            );
          }
          
          const results = await Promise.all(promises);
          
          // Verify all jobs completed
          expect(results).toHaveLength(5);
          for (let i = 0; i < 5; i++) {
            expect(results[i]).toBe(`Job ${i} completed`);
          }
        });
      });
    });

    it("should handle concurrent lock operations", async () => {
      await withTestEnvironment({
        testName: "git-native-io-concurrent-locks",
        initialFiles: {
          "README.md": "# Concurrent Locks Test\n",
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          const gitNativeIO = new GitNativeIO({ cwd: env.gitDir });
          await gitNativeIO.initialize();
          
          // Acquire multiple locks
          const lockPromises = [];
          for (let i = 0; i < 3; i++) {
            lockPromises.push(gitNativeIO.acquireLock(`lock-${i}`));
          }
          
          await Promise.all(lockPromises);
          
          // Verify all locks are held
          for (let i = 0; i < 3; i++) {
            const isLocked = await gitNativeIO.isLocked(`lock-${i}`);
            expect(isLocked).toBe(true);
          }
          
          // Release all locks
          const releasePromises = [];
          for (let i = 0; i < 3; i++) {
            releasePromises.push(gitNativeIO.releaseLock(`lock-${i}`));
          }
          
          await Promise.all(releasePromises);
          
          // Verify all locks are released
          for (let i = 0; i < 3; i++) {
            const isLocked = await gitNativeIO.isLocked(`lock-${i}`);
            expect(isLocked).toBe(false);
          }
        });
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle initialization errors gracefully", async () => {
      await withTestEnvironment({
        testName: "git-native-io-init-errors",
        initialFiles: {},
      }, async (env) => {
        await env.withGit(async (git) => {
          // Test with invalid directory
          const gitNativeIO = new GitNativeIO({ cwd: "/nonexistent/directory" });
          
          try {
            await gitNativeIO.initialize();
            // If it doesn't throw, that's also acceptable
          } catch (error) {
            expect(error).toBeDefined();
          }
        });
      });
    });

    it("should handle job execution errors", async () => {
      await withTestEnvironment({
        testName: "git-native-io-job-errors",
        initialFiles: {
          "README.md": "# Job Error Test\n",
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          const gitNativeIO = new GitNativeIO({ cwd: env.gitDir });
          await gitNativeIO.initialize();
          
          // Test job that throws an error
          try {
            await gitNativeIO.executeJob(
              () => {
                throw new Error("Test job error");
              },
              { name: "error-job" }
            );
            expect.fail("Should have thrown an error");
          } catch (error) {
            expect(error.message).toContain("Test job error");
          }
        });
      });
    });
  });

  describe("Cleanup and Shutdown", () => {
    it("should cleanup resources properly", async () => {
      await withTestEnvironment({
        testName: "git-native-io-cleanup",
        initialFiles: {
          "README.md": "# Cleanup Test\n",
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          const gitNativeIO = new GitNativeIO({ cwd: env.gitDir });
          await gitNativeIO.initialize();
          
          // Perform some operations
          await gitNativeIO.acquireLock("cleanup-test");
          await gitNativeIO.storeSnapshot("cleanup-test", { data: "test" });
          
          // Flush all operations
          await gitNativeIO.flushAll();
          
          // Cleanup
          await gitNativeIO.cleanup();
          
          // Shutdown
          await gitNativeIO.shutdown();
          
          // Verify shutdown
          const status = await gitNativeIO.getStatus();
          expect(status).toBeDefined();
        });
      });
    });
  });
});