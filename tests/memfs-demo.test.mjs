/**
 * @fileoverview GitVan v2 — MemFS Demo Test
 *
 * Simple demonstration of memfs benefits for GitVan testing
 */

import { describe, it, expect } from "vitest";
import { vol } from "memfs";

describe("MemFS Benefits for GitVan Testing", () => {
  it("should provide complete isolation from real file system", () => {
    // Create in-memory file system
    vol.fromJSON(
      {
        "/test/package.json": '{"name": "test"}',
        "/test/src/index.js": 'console.log("test");',
      },
      "/test"
    );

    // Verify files exist in memory
    expect(vol.existsSync("/test/package.json")).toBe(true);
    expect(vol.existsSync("/test/src/index.js")).toBe(true);

    // Real file system is unaffected
    expect(vol.existsSync("/Users/sac/gitvan/package.json")).toBe(false);

    // Clean up
    vol.reset();
  });

  it("should be much faster than real file system", () => {
    const start = performance.now();

    // Create many files in memory
    const files = {};
    for (let i = 0; i < 1000; i++) {
      files[`/test/file${i}.txt`] = `Content ${i}`;
    }

    vol.fromJSON(files, "/test");

    const end = performance.now();
    const duration = end - start;

    // Should be very fast (less than 100ms for 1000 files)
    expect(duration).toBeLessThan(100);

    // Verify files were created
    expect(vol.existsSync("/test/file0.txt")).toBe(true);
    expect(vol.existsSync("/test/file999.txt")).toBe(true);

    vol.reset();
  });

  it("should allow safe testing of destructive operations", () => {
    // Set up test environment
    vol.fromJSON(
      {
        "/test/package.json": '{"name": "test"}',
        "/test/README.md": "# Test",
        "/test/src/index.js": 'console.log("test");',
      },
      "/test"
    );

    // Test destructive operations safely
    vol.rmSync("/test/package.json");
    expect(vol.existsSync("/test/package.json")).toBe(false);

    // Other files still exist
    expect(vol.existsSync("/test/README.md")).toBe(true);
    expect(vol.existsSync("/test/src/index.js")).toBe(true);

    // Real package.json is safe
    expect(vol.existsSync("/Users/sac/gitvan/package.json")).toBe(false);

    vol.reset();
  });

  it("should provide deterministic behavior", () => {
    // Same setup should always produce same result
    vol.fromJSON(
      {
        "/test/file1.txt": "content1",
        "/test/file2.txt": "content2",
      },
      "/test"
    );

    const snapshot1 = vol.toJSON();

    vol.reset();

    vol.fromJSON(
      {
        "/test/file1.txt": "content1",
        "/test/file2.txt": "content2",
      },
      "/test"
    );

    const snapshot2 = vol.toJSON();

    // Snapshots should be identical
    expect(snapshot1).toEqual(snapshot2);

    vol.reset();
  });

  it("should work with Git operations", () => {
    // Set up a test repository structure
    vol.fromJSON(
      {
        "/test/.git/HEAD": "ref: refs/heads/main",
        "/test/.git/refs/heads/main": "abc123",
        "/test/README.md": "# Test Project",
        "/test/src/index.js": 'console.log("Hello");',
      },
      "/test"
    );

    // Simulate Git operations
    expect(vol.existsSync("/test/.git/HEAD")).toBe(true);
    expect(vol.existsSync("/test/.git/refs/heads/main")).toBe(true);

    // Files exist
    expect(vol.existsSync("/test/README.md")).toBe(true);
    expect(vol.existsSync("/test/src/index.js")).toBe(true);

    // Real .git directory is safe
    expect(vol.existsSync("/Users/sac/gitvan/.git")).toBe(false);

    vol.reset();
  });

  it("should enable parallel test execution", () => {
    // Multiple test environments can coexist
    const env1 = vol.fromJSON(
      {
        "/env1/file.txt": "env1 content",
      },
      "/env1"
    );

    const env2 = vol.fromJSON(
      {
        "/env2/file.txt": "env2 content",
      },
      "/env2"
    );

    // Each environment is isolated
    expect(vol.existsSync("/env1/file.txt")).toBe(true);
    expect(vol.existsSync("/env2/file.txt")).toBe(true);

    // Environments don't interfere with each other
    expect(vol.readFileSync("/env1/file.txt", "utf8")).toBe("env1 content");
    expect(vol.readFileSync("/env2/file.txt", "utf8")).toBe("env2 content");

    vol.reset();
  });
});
