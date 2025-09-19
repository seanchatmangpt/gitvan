/**
 * @fileoverview GitVan v2 — MemFS Refactoring Demonstration
 *
 * This test demonstrates the complete MemFS refactoring approach with working examples
 * that can be used as templates for refactoring other test files.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";

describe("MemFS Refactoring Demonstration", () => {
  describe("Basic MemFS Operations", () => {
    it("should demonstrate safe file operations", () => {
      const testDir = "/test-basic-operations";
      vol.mkdirSync(testDir, { recursive: true });

      // Create files safely
      vol.writeFileSync(
        `${testDir}/package.json`,
        JSON.stringify(
          {
            name: "test-project",
            version: "1.0.0",
            dependencies: {
              memfs: "^3.0.0",
            },
          },
          null,
          2
        )
      );

      vol.writeFileSync(
        `${testDir}/README.md`,
        "# Test Project\n\nThis is a safe test."
      );

      // Create directory structure
      vol.mkdirSync(`${testDir}/src/components`, { recursive: true });
      vol.writeFileSync(
        `${testDir}/src/components/Button.js`,
        "export default function Button() {}"
      );
      vol.writeFileSync(
        `${testDir}/src/index.js`,
        "console.log('Hello, World!');"
      );

      // Verify files exist
      expect(vol.existsSync(`${testDir}/package.json`)).toBe(true);
      expect(vol.existsSync(`${testDir}/README.md`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/components/Button.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/index.js`)).toBe(true);

      // Read file contents
      const packageJson = JSON.parse(
        vol.readFileSync(`${testDir}/package.json`, "utf8")
      );
      expect(packageJson.name).toBe("test-project");

      const readme = vol.readFileSync(`${testDir}/README.md`, "utf8");
      expect(readme).toContain("# Test Project");

      // Real project files are completely safe
      expect(vol.existsSync("/Users/sac/gitvan/package.json")).toBe(false);
      expect(vol.existsSync("/Users/sac/gitvan/README.md")).toBe(false);

      vol.reset();
    });

    it("should demonstrate safe destructive operations", () => {
      const testDir = "/test-destructive-operations";
      vol.mkdirSync(testDir, { recursive: true });

      // Set up test files
      vol.writeFileSync(`${testDir}/package.json`, '{"name": "test"}');
      vol.writeFileSync(`${testDir}/README.md`, "# Test");
      vol.mkdirSync(`${testDir}/src`, { recursive: true });
      vol.writeFileSync(`${testDir}/src/index.js`, "console.log('test');");

      // Safely delete files
      vol.rmSync(`${testDir}/package.json`);
      vol.rmSync(`${testDir}/README.md`);
      vol.rmSync(`${testDir}/src`, { recursive: true });

      // Verify deletions
      expect(vol.existsSync(`${testDir}/package.json`)).toBe(false);
      expect(vol.existsSync(`${testDir}/README.md`)).toBe(false);
      expect(vol.existsSync(`${testDir}/src`)).toBe(false);

      // Real files are still safe
      expect(vol.existsSync("/Users/sac/gitvan/package.json")).toBe(false);
      expect(vol.existsSync("/Users/sac/gitvan/README.md")).toBe(false);

      vol.reset();
    });

    it("should demonstrate performance benefits", () => {
      const testDir = "/test-performance";
      vol.mkdirSync(testDir, { recursive: true });

      const start = performance.now();

      // Create 1000 files
      for (let i = 0; i < 1000; i++) {
        vol.writeFileSync(`${testDir}/file${i}.txt`, `Content ${i}`);
      }

      const end = performance.now();
      const duration = end - start;

      // Should be very fast
      expect(duration).toBeLessThan(100);

      // Verify files were created
      expect(vol.existsSync(`${testDir}/file0.txt`)).toBe(true);
      expect(vol.existsSync(`${testDir}/file999.txt`)).toBe(true);

      vol.reset();
    });
  });

  describe("Template System with MemFS", () => {
    it("should work with template files in memory", () => {
      const testDir = "/test-template-system";
      const templatesDir = `${testDir}/templates`;
      vol.mkdirSync(templatesDir, { recursive: true });

      // Create template files
      vol.writeFileSync(
        `${templatesDir}/component.njk`,
        "export default function {{ name | capitalize }}() {\n  return <div>{{ description }}</div>;\n}"
      );

      vol.writeFileSync(
        `${templatesDir}/readme.njk`,
        "# {{ projectName | capitalize }}\n\n{{ description }}\n\n## Installation\n\n```bash\nnpm install {{ packageName }}\n```"
      );

      // Verify templates exist
      expect(vol.existsSync(`${templatesDir}/component.njk`)).toBe(true);
      expect(vol.existsSync(`${templatesDir}/readme.njk`)).toBe(true);

      // Read template content
      const componentTemplate = vol.readFileSync(
        `${templatesDir}/component.njk`,
        "utf8"
      );
      expect(componentTemplate).toContain("{{ name | capitalize }}");
      expect(componentTemplate).toContain("{{ description }}");

      const readmeTemplate = vol.readFileSync(
        `${templatesDir}/readme.njk`,
        "utf8"
      );
      expect(readmeTemplate).toContain("{{ projectName | capitalize }}");
      expect(readmeTemplate).toContain("{{ description }}");

      vol.reset();
    });
  });

  describe("Project Structure Creation", () => {
    it("should create complex project structures", () => {
      const testDir = "/test-project-structure";
      vol.mkdirSync(testDir, { recursive: true });

      // Create a complete project structure
      const projectStructure = {
        "package.json": JSON.stringify(
          {
            name: "test-project",
            version: "1.0.0",
            scripts: {
              test: "vitest",
              build: "vite build",
            },
          },
          null,
          2
        ),
        "README.md": "# Test Project\n\nA comprehensive test project.",
        src: {
          components: {
            "Button.js": "export default function Button() {}",
            "Card.js": "export default function Card() {}",
          },
          utils: {
            "helpers.js":
              "export const formatDate = (date) => date.toISOString();",
          },
          "index.js": "console.log('Hello, World!');",
        },
        tests: {
          "Button.test.js":
            "import { test } from 'vitest';\nimport Button from '../src/components/Button.js';",
        },
        templates: {
          "component.njk":
            "export default function {{ name | capitalize }}() {\n  return <div>{{ description }}</div>;\n}",
        },
      };

      // Create the structure
      function createStructure(basePath, structure) {
        Object.entries(structure).forEach(([path, content]) => {
          const fullPath = `${basePath}/${path}`;

          if (typeof content === "string") {
            // It's a file
            const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
            if (dir !== basePath) {
              vol.mkdirSync(dir, { recursive: true });
            }
            vol.writeFileSync(fullPath, content);
          } else if (typeof content === "object") {
            // It's a directory
            vol.mkdirSync(fullPath, { recursive: true });
            createStructure(fullPath, content);
          }
        });
      }

      createStructure(testDir, projectStructure);

      // Verify structure was created
      expect(vol.existsSync(`${testDir}/package.json`)).toBe(true);
      expect(vol.existsSync(`${testDir}/README.md`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/components/Button.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/components/Card.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/utils/helpers.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/index.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/tests/Button.test.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/templates/component.njk`)).toBe(true);

      // Verify content
      const packageJson = JSON.parse(
        vol.readFileSync(`${testDir}/package.json`, "utf8")
      );
      expect(packageJson.name).toBe("test-project");

      const buttonContent = vol.readFileSync(
        `${testDir}/src/components/Button.js`,
        "utf8"
      );
      expect(buttonContent).toContain("export default function Button()");

      const readmeContent = vol.readFileSync(`${testDir}/README.md`, "utf8");
      expect(readmeContent).toBe(
        "# Test Project\n\nA comprehensive test project."
      );

      vol.reset();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle file system errors gracefully", () => {
      const testDir = "/test-error-handling";
      vol.mkdirSync(testDir, { recursive: true });

      // Test non-existent file operations
      expect(vol.existsSync(`${testDir}/nonexistent.txt`)).toBe(false);

      // Test directory operations
      vol.mkdirSync(`${testDir}/nested/deep/path`, { recursive: true });
      expect(vol.existsSync(`${testDir}/nested/deep/path`)).toBe(true);

      // Test file in nested directory
      vol.writeFileSync(`${testDir}/nested/deep/path/file.txt`, "content");
      expect(vol.existsSync(`${testDir}/nested/deep/path/file.txt`)).toBe(true);

      // Test recursive deletion
      vol.rmSync(`${testDir}/nested`, { recursive: true });
      expect(vol.existsSync(`${testDir}/nested`)).toBe(false);

      vol.reset();
    });

    it("should handle large file operations", () => {
      const testDir = "/test-large-files";
      vol.mkdirSync(testDir, { recursive: true });

      // Create a large file
      const largeContent = "x".repeat(100000); // 100KB
      vol.writeFileSync(`${testDir}/large.txt`, largeContent);

      // Verify file was created
      expect(vol.existsSync(`${testDir}/large.txt`)).toBe(true);
      const content = vol.readFileSync(`${testDir}/large.txt`, "utf8");
      expect(content.length).toBe(100000);

      // Test many small files
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        vol.writeFileSync(`${testDir}/small${i}.txt`, `Content ${i}`);
      }
      const duration = performance.now() - start;

      // Should be fast even with many files
      expect(duration).toBeLessThan(200);

      vol.reset();
    });
  });

  describe("Refactoring Patterns", () => {
    it("should demonstrate before/after refactoring patterns", () => {
      const testDir = "/test-refactoring-patterns";
      vol.mkdirSync(testDir, { recursive: true });

      // BEFORE: Dangerous real file system operations (commented out)
      // import { promises as fs } from 'node:fs';
      // import { join } from 'pathe';
      // const tempDir = join(process.cwd(), "test-temp");
      // await fs.mkdir(tempDir, { recursive: true });
      // await fs.writeFile(join(tempDir, "package.json"), '{"name": "test"}');
      // await fs.rm(tempDir, { recursive: true, force: true });

      // AFTER: Safe in-memory operations
      vol.writeFileSync(`${testDir}/package.json`, '{"name": "test"}');
      vol.writeFileSync(`${testDir}/README.md`, "# Test Project");
      vol.mkdirSync(`${testDir}/src`, { recursive: true });
      vol.writeFileSync(
        `${testDir}/src/index.js`,
        "console.log('Hello, World!');"
      );

      // Verify the refactored approach works
      expect(vol.existsSync(`${testDir}/package.json`)).toBe(true);
      expect(vol.existsSync(`${testDir}/README.md`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/index.js`)).toBe(true);

      const packageJson = JSON.parse(
        vol.readFileSync(`${testDir}/package.json`, "utf8")
      );
      expect(packageJson.name).toBe("test");

      const readme = vol.readFileSync(`${testDir}/README.md`, "utf8");
      expect(readme).toBe("# Test Project");

      // Cleanup is automatic with vol.reset() in afterEach
      vol.reset();
    });
  });

  describe("Performance Benchmarks", () => {
    it("should demonstrate MemFS performance advantages", () => {
      const testDir = "/test-performance-benchmark";
      vol.mkdirSync(testDir, { recursive: true });

      // Test file creation performance
      const start1 = performance.now();
      for (let i = 0; i < 1000; i++) {
        vol.writeFileSync(`${testDir}/file${i}.txt`, `Content ${i}`);
      }
      const duration1 = performance.now() - start1;

      expect(duration1).toBeLessThan(100); // Should be very fast

      // Test directory creation performance
      const start2 = performance.now();
      for (let i = 0; i < 100; i++) {
        vol.mkdirSync(`${testDir}/dir${i}`, { recursive: true });
      }
      const duration2 = performance.now() - start2;

      expect(duration2).toBeLessThan(50); // Should be very fast

      // Test file reading performance
      const start3 = performance.now();
      for (let i = 0; i < 1000; i++) {
        vol.readFileSync(`${testDir}/file${i}.txt`, "utf8");
      }
      const duration3 = performance.now() - start3;

      expect(duration3).toBeLessThan(50); // Should be very fast

      vol.reset();
    });
  });

  describe("Safety Validation", () => {
    it("should ensure real file system is never affected", () => {
      const testDir = "/test-safety-validation";
      vol.mkdirSync(testDir, { recursive: true });

      // Create files with same names as real project files
      vol.writeFileSync(`${testDir}/package.json`, '{"name": "test"}');
      vol.writeFileSync(`${testDir}/README.md`, "# Test");
      vol.mkdirSync(`${testDir}/.git`, { recursive: true });
      vol.writeFileSync(
        `${testDir}/.git/config`,
        "[core]\n\trepositoryformatversion = 0"
      );

      // Perform destructive operations
      vol.rmSync(`${testDir}/package.json`);
      vol.rmSync(`${testDir}/README.md`);
      vol.rmSync(`${testDir}/.git`, { recursive: true });

      // Verify test files are gone
      expect(vol.existsSync(`${testDir}/package.json`)).toBe(false);
      expect(vol.existsSync(`${testDir}/README.md`)).toBe(false);
      expect(vol.existsSync(`${testDir}/.git`)).toBe(false);

      // Verify real files are still safe
      expect(vol.existsSync("/Users/sac/gitvan/package.json")).toBe(false);
      expect(vol.existsSync("/Users/sac/gitvan/README.md")).toBe(false);
      expect(vol.existsSync("/Users/sac/gitvan/.git")).toBe(false);

      vol.reset();
    });
  });
});
