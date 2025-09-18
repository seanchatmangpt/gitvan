import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "pathe";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";

describe("Lazy Pack Loading - Performance", () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "gitvan-lazy-packs-test-"));
    originalCwd = process.cwd();
    process.chdir(testDir);

    vi.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Lazy Pack Registry", () => {
    it("should initialize without loading packs", async () => {
      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );

      const startTime = Date.now();
      const registry = new LazyPackRegistry({
        packsDir: join(testDir, "packs"),
      });
      const duration = Date.now() - startTime;

      // Should initialize quickly without loading packs
      expect(duration).toBeLessThan(100);
      expect(registry).toBeDefined();
      expect(registry.isReady()).toBe(false);
    });

    it("should load packs only when requested", async () => {
      // Create mock pack files
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "pack1", "pack.json"),
        JSON.stringify({
          id: "pack1",
          name: "Test Pack 1",
          version: "1.0.0",
        })
      );
      writeFileSync(
        join(packsDir, "pack2", "pack.json"),
        JSON.stringify({
          id: "pack2",
          name: "Test Pack 2",
          version: "1.0.0",
        })
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      // Should not load packs initially
      expect(registry.isReady()).toBe(false);

      // Load packs when requested
      const startTime = Date.now();
      const result = await registry.loadPacks();
      const duration = Date.now() - startTime;

      // Should load packs quickly
      expect(duration).toBeLessThan(500);
      expect(result.success).toBe(true);
      expect(result.packs).toHaveLength(2);
      expect(registry.isReady()).toBe(true);
    });

    it("should cache loaded packs", async () => {
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "pack1", "pack.json"),
        JSON.stringify({
          id: "pack1",
          name: "Test Pack 1",
          version: "1.0.0",
        })
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      // First load
      const result1 = await registry.loadPacks();
      expect(result1.success).toBe(true);

      // Second load should use cache
      const startTime = Date.now();
      const result2 = await registry.loadPacks();
      const duration = Date.now() - startTime;

      // Should be very fast due to caching
      expect(duration).toBeLessThan(50);
      expect(result2.success).toBe(true);
      expect(result2.packs).toEqual(result1.packs);
    });

    it("should handle missing packs directory gracefully", async () => {
      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({
        packsDir: join(testDir, "nonexistent"),
      });

      const result = await registry.loadPacks();

      expect(result.success).toBe(true);
      expect(result.packs).toEqual([]);
    });

    it("should handle invalid pack manifests gracefully", async () => {
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "invalid-pack", "pack.json"),
        "invalid json"
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      const result = await registry.loadPacks();

      expect(result.success).toBe(true);
      expect(result.packs).toEqual([]);
    });
  });

  describe("Performance Optimization", () => {
    it("should not load packs during initialization", async () => {
      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );

      const startTime = Date.now();
      const registry = new LazyPackRegistry({
        packsDir: join(testDir, "packs"),
      });
      const duration = Date.now() - startTime;

      // Should be very fast - no pack loading
      expect(duration).toBeLessThan(100);
      expect(registry.isReady()).toBe(false);
    });

    it("should load packs on-demand only", async () => {
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "pack1", "pack.json"),
        JSON.stringify({
          id: "pack1",
          name: "Test Pack 1",
          version: "1.0.0",
        })
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      // Should not load packs until explicitly requested
      expect(registry.isReady()).toBe(false);

      // Load when needed
      await registry.loadPacks();
      expect(registry.isReady()).toBe(true);
    });

    it("should handle large numbers of packs efficiently", async () => {
      const packsDir = join(testDir, "packs");

      // Create many pack files
      for (let i = 0; i < 100; i++) {
        writeFileSync(
          join(packsDir, `pack${i}`, "pack.json"),
          JSON.stringify({
            id: `pack${i}`,
            name: `Test Pack ${i}`,
            version: "1.0.0",
          })
        );
      }

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      const startTime = Date.now();
      const result = await registry.loadPacks();
      const duration = Date.now() - startTime;

      // Should handle many packs efficiently
      expect(duration).toBeLessThan(2000);
      expect(result.success).toBe(true);
      expect(result.packs).toHaveLength(100);
    });
  });

  describe("Error Handling", () => {
    it("should handle pack loading errors gracefully", async () => {
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "pack1", "pack.json"),
        JSON.stringify({
          id: "pack1",
          name: "Test Pack 1",
          version: "1.0.0",
        })
      );

      // Mock file system error
      vi.spyOn(require("node:fs"), "readdirSync").mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      const result = await registry.loadPacks();

      // Should handle error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should continue loading other packs on individual pack errors", async () => {
      const packsDir = join(testDir, "packs");

      // Valid pack
      writeFileSync(
        join(packsDir, "valid-pack", "pack.json"),
        JSON.stringify({
          id: "valid-pack",
          name: "Valid Pack",
          version: "1.0.0",
        })
      );

      // Invalid pack (missing required fields)
      writeFileSync(
        join(packsDir, "invalid-pack", "pack.json"),
        JSON.stringify({
          id: "invalid-pack",
          // Missing name and version
        })
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      const result = await registry.loadPacks();

      // Should load valid packs and skip invalid ones
      expect(result.success).toBe(true);
      expect(result.packs).toHaveLength(1);
      expect(result.packs[0].id).toBe("valid-pack");
    });
  });

  describe("Memory Efficiency", () => {
    it("should not hold references to loaded packs unnecessarily", async () => {
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "pack1", "pack.json"),
        JSON.stringify({
          id: "pack1",
          name: "Test Pack 1",
          version: "1.0.0",
        })
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      const initialMemory = process.memoryUsage().heapUsed;
      await registry.loadPacks();
      const afterLoadMemory = process.memoryUsage().heapUsed;

      // Should not use excessive memory
      const memoryIncrease = afterLoadMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });

    it("should allow garbage collection of unused packs", async () => {
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "pack1", "pack.json"),
        JSON.stringify({
          id: "pack1",
          name: "Test Pack 1",
          version: "1.0.0",
        })
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      await registry.loadPacks();
      const afterLoadMemory = process.memoryUsage().heapUsed;

      // Clear references
      registry.clearCache();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterGCMemory = process.memoryUsage().heapUsed;

      // Memory should be freed
      expect(afterGCMemory).toBeLessThanOrEqual(afterLoadMemory);
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent pack loading requests", async () => {
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "pack1", "pack.json"),
        JSON.stringify({
          id: "pack1",
          name: "Test Pack 1",
          version: "1.0.0",
        })
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      // Make concurrent requests
      const promises = [
        registry.loadPacks(),
        registry.loadPacks(),
        registry.loadPacks(),
      ];

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(1000);
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.packs).toHaveLength(1);
      });
    });

    it("should not load packs multiple times concurrently", async () => {
      const packsDir = join(testDir, "packs");
      writeFileSync(
        join(packsDir, "pack1", "pack.json"),
        JSON.stringify({
          id: "pack1",
          name: "Test Pack 1",
          version: "1.0.0",
        })
      );

      const { LazyPackRegistry } = await import(
        "../../src/pack/lazy-registry.mjs"
      );
      const registry = new LazyPackRegistry({ packsDir });

      // Track how many times loadPacks is called
      let loadCount = 0;
      const originalLoadPacks = registry.loadPacks.bind(registry);
      registry.loadPacks = async function () {
        loadCount++;
        return originalLoadPacks();
      };

      // Make concurrent requests
      const promises = [
        registry.loadPacks(),
        registry.loadPacks(),
        registry.loadPacks(),
      ];

      await Promise.all(promises);

      // Should only load once due to caching
      expect(loadCount).toBe(1);
    });
  });
});
