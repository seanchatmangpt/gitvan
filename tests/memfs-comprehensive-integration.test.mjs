/**
 * @fileoverview GitVan v2 — Comprehensive MemFS Integration Test Suite
 *
 * This test suite demonstrates the complete MemFS refactoring approach and validates
 * that all GitVan composables work correctly with in-memory file system operations.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vol } from "memfs";
import { withGitVan } from "../src/core/context.mjs";
import { useFileSystem } from "../src/composables/filesystem.mjs";
import { useGit } from "../src/composables/git.mjs";
import { useTemplate } from "../src/composables/template.mjs";
import {
  createMemFSTestEnvironment,
  createGitTestEnvironment,
  withMemFSTestEnvironment,
  withGitTestEnvironment,
  createDirectoryStructure,
  measureMemFSPerformance,
  assertRealFileSystemSafe,
  MemFSPatterns,
} from "./memfs-test-utils.mjs";

describe("MemFS Integration Test Suite", () => {
  describe("Basic MemFS Operations", () => {
    it("should demonstrate safe file operations", () => {
      const testDir = "/test-basic-operations";
      vol.mkdirSync(testDir, { recursive: true });

      // Create files safely
      vol.writeFileSync(`${testDir}/package.json`, JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "memfs": "^3.0.0"
        }
      }, null, 2));

      vol.writeFileSync(`${testDir}/README.md`, "# Test Project\n\nThis is a safe test.");

      // Create directory structure
      vol.mkdirSync(`${testDir}/src/components`, { recursive: true });
      vol.writeFileSync(`${testDir}/src/components/Button.js`, "export default function Button() {}");
      vol.writeFileSync(`${testDir}/src/index.js`, "console.log('Hello, World!');");

      // Verify files exist
      expect(vol.existsSync(`${testDir}/package.json`)).toBe(true);
      expect(vol.existsSync(`${testDir}/README.md`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/components/Button.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/index.js`)).toBe(true);

      // Read file contents
      const packageJson = JSON.parse(vol.readFileSync(`${testDir}/package.json`, "utf8"));
      expect(packageJson.name).toBe("test-project");

      const readme = vol.readFileSync(`${testDir}/README.md`, "utf8");
      expect(readme).toContain("# Test Project");

      // Real project files are completely safe
      assertRealFileSystemSafe("/Users/sac/gitvan/package.json", expect);
      assertRealFileSystemSafe("/Users/sac/gitvan/README.md", expect);

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
      assertRealFileSystemSafe("/Users/sac/gitvan/package.json", expect);
      assertRealFileSystemSafe("/Users/sac/gitvan/README.md", expect);

      vol.reset();
    });

    it("should demonstrate performance benefits", () => {
      const testDir = "/test-performance";
      vol.mkdirSync(testDir, { recursive: true });

      const metrics = measureMemFSPerformance((i) => {
        vol.writeFileSync(`${testDir}/file${i}.txt`, `Content ${i}`);
      }, 1000);

      // Should be very fast
      expect(metrics.duration).toBeLessThan(100);
      expect(metrics.operationsPerSecond).toBeGreaterThan(10000);

      // Verify files were created
      expect(vol.existsSync(`${testDir}/file0.txt`)).toBe(true);
      expect(vol.existsSync(`${testDir}/file999.txt`)).toBe(true);

      vol.reset();
    });
  });

  describe("FileSystem Composable Integration", () => {
    it("should work with filesystem composable", async () => {
      await withMemFSTestEnvironment({
        testDir: "/test-filesystem-integration",
        files: {
          "test.txt": "Hello, World!",
          "src/index.js": 'console.log("test");',
        },
      }, async (env) => {
        await withGitVan({ cwd: env.testDir }, async () => {
          const fs = useFileSystem();

          // Test file operations
          expect(await fs.exists("test.txt")).toBe(true);
          expect(await fs.readFile("test.txt")).toBe("Hello, World!");

          // Test directory operations
          expect(await fs.exists("src")).toBe(true);
          const files = await fs.readdir("src");
          expect(files).toContain("index.js");

          // Test file creation
          await fs.writeFile("new-file.txt", "New content");
          expect(await fs.exists("new-file.txt")).toBe(true);
          expect(await fs.readFile("new-file.txt")).toBe("New content");

          // Test file deletion
          await fs.unlink("test.txt");
          expect(await fs.exists("test.txt")).toBe(false);
        });
      });
    });
  });

  describe("Git Composable Integration", () => {
    it("should work with git composable", async () => {
      await withGitTestEnvironment({
        testDir: "/test-git-integration",
        files: {
          "README.md": "# Test Repository",
          "src/index.js": 'console.log("Hello, World!");',
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          // Test git operations
          const branch = await git.branch();
          expect(branch).toBe("main");

          const head = await git.head();
          expect(head).toMatch(/^[a-f0-9]{40}$/);

          // Test file operations
          env.createFile("new-feature.js", "export default function newFeature() {}");
          await git.add("new-feature.js");
          await git.commit("Add new feature");

          const isClean = await git.isClean();
          expect(isClean).toBe(true);

          const log = await git.log("%s");
          expect(log).toContain("Add new feature");
        });
      });
    });
  });

  describe("Template Composable Integration", () => {
    it("should work with template composable", async () => {
      await withMemFSTestEnvironment({
        testDir: "/test-template-integration",
        files: {
          "templates/component.njk": "export default function {{ name | capitalize }}() {\n  return <div>{{ description }}</div>;\n}",
          "templates/readme.njk": "# {{ projectName | capitalize }}\n\n{{ description }}\n\n## Installation\n\n```bash\nnpm install {{ packageName }}\n```",
        },
      }, async (env) => {
        await withGitVan({ cwd: env.testDir }, async () => {
          const template = await useTemplate({ paths: [`${env.testDir}/templates`] });

          // Test component template
          const componentResult = template.render("component.njk", {
            name: "button",
            description: "A reusable button component",
          });

          expect(componentResult).toContain("export default function Button()");
          expect(componentResult).toContain("A reusable button component");

          // Test readme template
          const readmeResult = template.render("readme.njk", {
            projectName: "awesome-lib",
            description: "An awesome library for developers",
            packageName: "awesome-lib",
          });

          expect(readmeResult).toContain("# Awesome-lib");
          expect(readmeResult).toContain("An awesome library for developers");
          expect(readmeResult).toContain("npm install awesome-lib");

          // Test render to file
          const outputPath = `${env.testDir}/generated-component.js`;
          const result = await template.renderToFile("component.njk", outputPath, {
            name: "card",
            description: "A card component",
          });

          expect(result.path).toBe(outputPath);
          expect(result.bytes).toBeGreaterThan(0);

          const generatedContent = vol.readFileSync(outputPath, "utf8");
          expect(generatedContent).toContain("export default function Card()");
        });
      });
    });
  });

  describe("Complex Workflow Integration", () => {
    it("should handle complete development workflow", async () => {
      await withGitTestEnvironment({
        testDir: "/test-complete-workflow",
        files: {
          "package.json": JSON.stringify({
            name: "test-project",
            version: "1.0.0",
            scripts: {
              test: "vitest",
              build: "vite build",
            },
          }, null, 2),
          "README.md": "# Test Project",
        },
      }, async (env) => {
        await env.withGit(async (git) => {
          // Create project structure
          createDirectoryStructure(env.testDir, {
            "src/components": {
              "Button.js": "export default function Button() {}",
              "Card.js": "export default function Card() {}",
            },
            "src/utils": {
              "helpers.js": "export const formatDate = (date) => date.toISOString();",
            },
            "tests": {
              "Button.test.js": "import { test } from 'vitest';\nimport Button from '../src/components/Button.js';",
            },
            "templates": {
              "component.njk": "export default function {{ name | capitalize }}() {\n  return <div>{{ description }}</div>;\n}",
            },
          });

          // Add all files to git
          await git.add(".");
          await git.commit("Initial project setup");

          // Generate new component using template
          await withGitVan({ cwd: env.testDir }, async () => {
            const template = await useTemplate({ paths: [`${env.testDir}/templates`] });
            const outputPath = `${env.testDir}/src/components/Modal.js`;
            
            await template.renderToFile("component.njk", outputPath, {
              name: "modal",
              description: "A modal dialog component",
            });

            // Verify generated file
            const generatedContent = vol.readFileSync(outputPath, "utf8");
            expect(generatedContent).toContain("export default function Modal()");
            expect(generatedContent).toContain("A modal dialog component");

            // Add generated file to git
            await git.add("src/components/Modal.js");
            await git.commit("Add Modal component");

            // Verify git status
            const isClean = await git.isClean();
            expect(isClean).toBe(true);

            const log = await git.log("%s");
            expect(log).toContain("Add Modal component");
          });

          // Verify project structure
          const srcFiles = vol.readdirSync(`${env.testDir}/src/components`);
          expect(srcFiles).toContain("Button.js");
          expect(srcFiles).toContain("Card.js");
          expect(srcFiles).toContain("Modal.js");

          const testFiles = vol.readdirSync(`${env.testDir}/tests`);
          expect(testFiles).toContain("Button.test.js");
        });
      });
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

  describe("MemFS Test Utilities Integration", () => {
    it("should work with MemFS patterns", () => {
      const env = createMemFSTestEnvironment({
        testDir: "/test-patterns",
        files: {
          "existing.txt": "existing content",
        },
      });

      // Test file creation pattern
      MemFSPatterns.testFileCreation(env, "new.txt", "new content", expect);

      // Test directory creation pattern
      MemFSPatterns.testDirectoryCreation(env, "new-dir", expect);

      // Test file deletion pattern
      MemFSPatterns.testFileDeletion(env, "existing.txt", expect);

      // Test bulk operations pattern
      const metrics = MemFSPatterns.testBulkOperations(env, 100, expect);
      expect(metrics.fileCount).toBe(100);
      expect(metrics.duration).toBeLessThan(50);

      env.cleanup();
    });

    it("should work with directory structure creation", () => {
      const testDir = "/test-directory-structure";
      vol.mkdirSync(testDir, { recursive: true });

      createDirectoryStructure(testDir, {
        "src": {
          "components": {
            "Button.js": "export default function Button() {}",
            "Card.js": "export default function Card() {}",
          },
          "utils": {
            "helpers.js": "export const helper = () => {};",
          },
        },
        "tests": {
          "Button.test.js": "import { test } from 'vitest';",
        },
        "README.md": "# Test Project",
      });

      // Verify structure was created
      expect(vol.existsSync(`${testDir}/src/components/Button.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/components/Card.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/src/utils/helpers.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/tests/Button.test.js`)).toBe(true);
      expect(vol.existsSync(`${testDir}/README.md`)).toBe(true);

      // Verify content
      const buttonContent = vol.readFileSync(`${testDir}/src/components/Button.js`, "utf8");
      expect(buttonContent).toContain("export default function Button()");

      const readmeContent = vol.readFileSync(`${testDir}/README.md`, "utf8");
      expect(readmeContent).toBe("# Test Project");

      vol.reset();
    });
  });

  describe("Performance Benchmarks", () => {
    it("should demonstrate MemFS performance advantages", () => {
      const testDir = "/test-performance-benchmark";
      vol.mkdirSync(testDir, { recursive: true });

      // Test file creation performance
      const fileCreationMetrics = measureMemFSPerformance((i) => {
        vol.writeFileSync(`${testDir}/file${i}.txt`, `Content ${i}`);
      }, 1000);

      expect(fileCreationMetrics.operationsPerSecond).toBeGreaterThan(5000);

      // Test directory creation performance
      const dirCreationMetrics = measureMemFSPerformance((i) => {
        vol.mkdirSync(`${testDir}/dir${i}`, { recursive: true });
      }, 100);

      expect(dirCreationMetrics.operationsPerSecond).toBeGreaterThan(1000);

      // Test file reading performance
      const fileReadMetrics = measureMemFSPerformance((i) => {
        vol.readFileSync(`${testDir}/file${i}.txt`, "utf8");
      }, 1000);

      expect(fileReadMetrics.operationsPerSecond).toBeGreaterThan(10000);

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
      vol.writeFileSync(`${testDir}/.git/config`, "[core]\n\trepositoryformatversion = 0");

      // Perform destructive operations
      vol.rmSync(`${testDir}/package.json`);
      vol.rmSync(`${testDir}/README.md`);
      vol.rmSync(`${testDir}/.git`, { recursive: true });

      // Verify test files are gone
      expect(vol.existsSync(`${testDir}/package.json`)).toBe(false);
      expect(vol.existsSync(`${testDir}/README.md`)).toBe(false);
      expect(vol.existsSync(`${testDir}/.git`)).toBe(false);

      // Verify real files are still safe
      assertRealFileSystemSafe("/Users/sac/gitvan/package.json", expect);
      assertRealFileSystemSafe("/Users/sac/gitvan/README.md", expect);
      assertRealFileSystemSafe("/Users/sac/gitvan/.git", expect);

      vol.reset();
    });
  });
});
