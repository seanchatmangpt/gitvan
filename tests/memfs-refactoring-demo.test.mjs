// tests/memfs-refactoring-demo.test.mjs
// GitVan v2 — MemFS Refactoring Demo
// Demonstrates how to refactor tests to use memfs for file operations

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";

describe("MemFS Refactoring Demo", () => {
  let testDir;

  beforeEach(() => {
    // Create in-memory test directory
    testDir = "/test-memfs-demo";
    vol.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up in-memory file system
    vol.reset();
  });

  it("should demonstrate safe file operations", () => {
    // Create files safely in memory
    vol.writeFileSync(
      `${testDir}/package.json`,
      JSON.stringify(
        {
          name: "test-project",
          version: "1.0.0",
        },
        null,
        2
      )
    );

    vol.writeFileSync(`${testDir}/README.md`, "# Test Project");

    // Create src directory first
    vol.mkdirSync(`${testDir}/src`, { recursive: true });
    vol.writeFileSync(
      `${testDir}/src/index.js`,
      "console.log('Hello, World!');"
    );

    // Verify files exist
    expect(vol.existsSync(`${testDir}/package.json`)).toBe(true);
    expect(vol.existsSync(`${testDir}/README.md`)).toBe(true);
    expect(vol.existsSync(`${testDir}/src/index.js`)).toBe(true);

    // Read file contents
    const packageJson = JSON.parse(
      vol.readFileSync(`${testDir}/package.json`, "utf8")
    );
    expect(packageJson.name).toBe("test-project");

    const readme = vol.readFileSync(`${testDir}/README.md`, "utf8");
    expect(readme).toBe("# Test Project");

    // Real project files are completely safe
    expect(vol.existsSync("/Users/sac/gitvan/package.json")).toBe(false);
    expect(vol.existsSync("/Users/sac/gitvan/README.md")).toBe(false);
  });

  it("should demonstrate safe destructive operations", () => {
    // Set up test files
    vol.writeFileSync(`${testDir}/package.json`, '{"name": "test"}');
    vol.writeFileSync(`${testDir}/README.md`, "# Test");

    // Create src directory first
    vol.mkdirSync(`${testDir}/src`, { recursive: true });
    vol.writeFileSync(`${testDir}/src/index.js`, "console.log('test');");

    // Safely delete files that would be dangerous in real file system
    vol.rmSync(`${testDir}/package.json`);
    vol.rmSync(`${testDir}/README.md`);

    // Verify deletions
    expect(vol.existsSync(`${testDir}/package.json`)).toBe(false);
    expect(vol.existsSync(`${testDir}/README.md`)).toBe(false);
    expect(vol.existsSync(`${testDir}/src/index.js`)).toBe(true);

    // Real files are still safe
    expect(vol.existsSync("/Users/sac/gitvan/package.json")).toBe(false);
  });

  it("should demonstrate directory operations", () => {
    // Create directory structure
    vol.mkdirSync(`${testDir}/src/components`, { recursive: true });
    vol.mkdirSync(`${testDir}/tests`, { recursive: true });

    // Create files in directories
    vol.writeFileSync(
      `${testDir}/src/components/Button.js`,
      "export default function Button() {}"
    );
    vol.writeFileSync(
      `${testDir}/tests/Button.test.js`,
      "describe('Button', () => {});"
    );

    // List directory contents
    const srcContents = vol.readdirSync(`${testDir}/src`);
    expect(srcContents).toContain("components");

    const componentContents = vol.readdirSync(`${testDir}/src/components`);
    expect(componentContents).toContain("Button.js");

    // Verify file contents
    const buttonCode = vol.readFileSync(
      `${testDir}/src/components/Button.js`,
      "utf8"
    );
    expect(buttonCode).toBe("export default function Button() {}");
  });

  it("should demonstrate performance benefits", () => {
    const start = performance.now();

    // Create many files quickly
    for (let i = 0; i < 1000; i++) {
      vol.writeFileSync(`${testDir}/file${i}.txt`, `Content ${i}`);
    }

    const end = performance.now();
    const duration = end - start;

    // Should be very fast (less than 50ms for 1000 files)
    expect(duration).toBeLessThan(50);

    // Verify files were created
    expect(vol.existsSync(`${testDir}/file0.txt`)).toBe(true);
    expect(vol.existsSync(`${testDir}/file999.txt`)).toBe(true);

    // Read a few files to verify content
    expect(vol.readFileSync(`${testDir}/file0.txt`, "utf8")).toBe("Content 0");
    expect(vol.readFileSync(`${testDir}/file999.txt`, "utf8")).toBe(
      "Content 999"
    );
  });

  it("should demonstrate isolation between tests", () => {
    // This test runs in complete isolation
    vol.writeFileSync(`${testDir}/isolated-file.txt`, "This is isolated");

    expect(vol.existsSync(`${testDir}/isolated-file.txt`)).toBe(true);

    // No interference from other tests or real file system
    expect(vol.existsSync("/Users/sac/gitvan/package.json")).toBe(false);
  });

  it("should demonstrate file system snapshots", () => {
    // Create initial state
    vol.writeFileSync(`${testDir}/file1.txt`, "content1");
    vol.writeFileSync(`${testDir}/file2.txt`, "content2");

    // Get snapshot
    const snapshot1 = vol.toJSON();
    expect(snapshot1[`${testDir}/file1.txt`]).toBe("content1");
    expect(snapshot1[`${testDir}/file2.txt`]).toBe("content2");

    // Modify state
    vol.writeFileSync(`${testDir}/file3.txt`, "content3");
    vol.rmSync(`${testDir}/file1.txt`);

    // Get new snapshot
    const snapshot2 = vol.toJSON();
    expect(snapshot2[`${testDir}/file1.txt`]).toBeUndefined();
    expect(snapshot2[`${testDir}/file2.txt`]).toBe("content2");
    expect(snapshot2[`${testDir}/file3.txt`]).toBe("content3");
  });

  it("should demonstrate how to refactor existing tests", () => {
    // BEFORE: Dangerous real file system operations
    // import { promises as fs } from 'node:fs';
    // import { join } from 'pathe';
    // const tempDir = join(process.cwd(), "test-temp");
    // await fs.mkdir(tempDir, { recursive: true });
    // await fs.writeFile(join(tempDir, "package.json"), '{"name": "test"}');
    // await fs.rm(tempDir, { recursive: true, force: true });

    // AFTER: Safe in-memory operations
    const testDir = "/refactor-demo";
    vol.mkdirSync(testDir, { recursive: true });
    vol.writeFileSync(`${testDir}/package.json`, '{"name": "test"}');

    // Verify the refactored approach works
    expect(vol.existsSync(`${testDir}/package.json`)).toBe(true);
    const content = JSON.parse(
      vol.readFileSync(`${testDir}/package.json`, "utf8")
    );
    expect(content.name).toBe("test");

    // Cleanup is automatic with vol.reset() in afterEach
  });
});
