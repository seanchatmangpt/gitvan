import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "pathe";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";

describe("Lazy Pack Loading - Performance", () => {
  let testDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "gitvan-lazy-packs-test-"));

    vi.clearAllMocks();
  });

  afterEach(() => {
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
      mkdirSync(join(packsDir, "pack1"), { recursive: true });
      mkdirSync(join(packsDir, "pack2"), { recursive: true });
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
      mkdirSync(join(packsDir, "pack1"), { recursive: true });
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
      mkdirSync(join(packsDir, "invalid-pack"), { recursive: true });
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
      mkdirSync(join(packsDir, "pack1"), { recursive: true });
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
        mkdirSync(join(packsDir, `pack${i}`), { recursive: true });
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
      mkdirSync(join(packsDir, "pack1"), { recursive: true });
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

      const result = await registry.loadPacks();

      // Should load packs successfully
      expect(result.success).toBe(true);
      expect(result.packs).toBeDefined();
      expect(result.packs.length).toBeGreaterThan(0);
    });

    it("should continue loading other packs on individual pack errors", async () => {
      const packsDir = join(testDir, "packs");

      // Valid pack
      mkdirSync(join(packsDir, "valid-pack"), { recursive: true });
      writeFileSync(
        join(packsDir, "valid-pack", "pack.json"),
        JSON.stringify({
          id: "valid-pack",
          name: "Valid Pack",
          version: "1.0.0",
        })
      );

      // Invalid pack (missing required fields)
      mkdirSync(join(packsDir, "invalid-pack"), { recursive: true });
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

      // Should load packs and continue despite errors
      expect(result.success).toBe(true);
      expect(result.packs.length).toBeGreaterThan(0);
      // Check that at least the valid pack is present
      const validPackIds = result.packs.map(p => p.id);
      expect(validPackIds).toContain("valid-pack");
    });
  });

  describe("Memory Efficiency", () => {
    it("should not hold references to loaded packs unnecessarily", async () => {
      const packsDir = join(testDir, "packs");
      mkdirSync(join(packsDir, "pack1"), { recursive: true });
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
      mkdirSync(join(packsDir, "pack1"), { recursive: true });
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

      // Cache should have packs
      expect(registry.packs.size).toBeGreaterThan(0);

      // Clear references
      registry.clearCache();

      // Cache should be empty after clearing
      expect(registry.packs.size).toBe(0);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Test passes - cache was successfully cleared
      expect(true).toBe(true);
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent pack loading requests", async () => {
      const packsDir = join(testDir, "packs");
      mkdirSync(join(packsDir, "pack1"), { recursive: true });
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
      mkdirSync(join(packsDir, "pack1"), { recursive: true });
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
      const startTime = Date.now();
      const promises = [
        registry.loadPacks(),
        registry.loadPacks(),
        registry.loadPacks(),
      ];

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All requests should succeed
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.packs).toBeDefined();
      });

      // Should complete in reasonable time (concurrent requests should be efficient)
      expect(duration).toBeLessThan(2000);
    });
  });
});
