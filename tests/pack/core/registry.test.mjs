/**
 * GitVan v2 Pack Registry Tests - Backend API testing with validation
 * Tests the registry, marketplace, and scaffold systems
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PackRegistry } from "../../../src/pack/registry.mjs";
import { Marketplace } from "../../../src/pack/marketplace.mjs";
import { ScaffoldRunner } from "../../../src/pack/scaffold.mjs";
import { TemplateProcessor } from "../../../src/pack/operations/template-processor.mjs";
import { join, dirname } from "pathe";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";

describe("Pack Registry System", () => {
  let tempDir;
  let registry;
  let marketplace;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = join(tmpdir(), `gitvan-pack-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    // Initialize registry with test configuration
    registry = new PackRegistry({
      cacheDir: join(tempDir, "cache"),
      registryUrl: "https://test.registry.dev",
    });

    marketplace = new Marketplace({
      cacheDir: join(tempDir, "cache"),
    });
  });

  afterEach(() => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("PackRegistry", () => {
    it("should initialize with secure defaults", () => {
      expect(registry.registryUrl).toBe("https://test.registry.dev");
      expect(registry.timeout).toBe(30000);
      expect(registry.maxRetries).toBe(3);
    });

    it("should validate registry URLs for security", () => {
      const insecureRegistry = new PackRegistry({
        registryUrl: "ftp://malicious.com",
      });
      expect(insecureRegistry.registryUrl).toBe("https://registry.gitvan.dev");
    });

    it("should handle cache directory creation", () => {
      expect(existsSync(registry.cacheDir)).toBe(true);
    });

    it("should validate pack IDs correctly", async () => {
      // Valid pack IDs
      const validIds = ["gv/docs", "my-pack", "namespace/pack-name"];
      for (const id of validIds) {
        expect(() => registry.get(id)).not.toThrow();
      }

      // Invalid pack IDs
      const invalidIds = [
        "",
        "../malicious",
        "pack with spaces",
        "pack@version",
      ];
      for (const id of invalidIds) {
        await expect(registry.get(id)).rejects.toThrow(
          "Invalid pack ID format"
        );
      }
    });

    it("should implement rate limiting", () => {
      const canRefresh1 = registry.checkRateLimit("refresh", 60000);
      const canRefresh2 = registry.checkRateLimit("refresh", 60000);

      expect(canRefresh1).toBe(true);
      expect(canRefresh2).toBe(false);
    });

    it("should sanitize pack information", () => {
      const unsafePack = {
        id: "test/pack",
        name: "Test Pack",
        version: "1.0.0",
        description: "A test pack",
        __proto__: { malicious: true },
        constructor: "evil",
        unsafe: '<script>alert("xss")</script>',
      };

      const sanitized = registry.sanitizePackInfo(unsafePack);

      expect(sanitized.__proto__).toBeUndefined();
      expect(sanitized.constructor).toBeUndefined();
      expect(sanitized.id).toBe("test/pack");
      expect(sanitized.name).toBe("Test Pack");
    });
  });

  describe("Marketplace", () => {
    it("should validate browse options", async () => {
      // Valid options
      const validOptions = {
        query: "docs",
        filters: { tag: "documentation" },
        limit: 10,
        page: 1,
      };

      expect(() => marketplace.browse(validOptions)).not.toThrow();

      // Invalid options
      const invalidOptions = {
        limit: 150, // exceeds max
        page: 0, // below min
      };

      await expect(marketplace.browse(invalidOptions)).rejects.toThrow(
        "Invalid browse options"
      );
    });

    it("should calculate relevance scores correctly", () => {
      const pack1 = {
        id: "exact-match",
        name: "exact-match",
        downloads: 100,
        rating: 4.5,
      };

      const pack2 = {
        id: "partial-match",
        name: "Partial Match Pack",
        downloads: 1000,
        rating: 3.0,
      };

      const score1 = marketplace.calculateRelevanceScore(pack1, "exact-match");
      const score2 = marketplace.calculateRelevanceScore(pack2, "exact-match");

      expect(score1).toBeGreaterThan(score2);
    });

    it("should handle pagination correctly", async () => {
      // Mock search results
      const mockResults = Array.from({ length: 25 }, (_, i) => ({
        id: `pack-${i}`,
        name: `Pack ${i}`,
        version: "1.0.0",
      }));

      marketplace.registry.search = async () => mockResults;

      const page1 = await marketplace.browse({ limit: 10, page: 1 });
      const page2 = await marketplace.browse({ limit: 10, page: 2 });

      expect(page1.packs).toHaveLength(10);
      expect(page2.packs).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.pages).toBe(3);
      expect(page1.hasNext).toBe(true);
      expect(page2.hasPrev).toBe(true);
    });

    it("should provide quickstart categories", async () => {
      const categories = await marketplace.getCategories();

      expect(categories.categories).toHaveLength(6);
      expect(categories.categories[0]).toHaveProperty("id");
      expect(categories.categories[0]).toHaveProperty("name");
      expect(categories.categories[0]).toHaveProperty("description");
    });
  });

  describe("ScaffoldRunner", () => {
    let scaffoldRunner;
    let mockPackPath;

    beforeEach(() => {
      scaffoldRunner = new ScaffoldRunner({
        allowedCommands: ["echo", "git"],
        dryRun: true,
      });

      // Create mock pack structure
      mockPackPath = join(tempDir, "mock-pack");
      mkdirSync(join(mockPackPath, "templates"), { recursive: true });

      // Create pack manifest
      const manifest = {
        id: "test/mock-pack",
        version: "1.0.0",
        name: "Mock Pack",
        provides: {
          scaffolds: [
            {
              id: "simple",
              title: "Simple Scaffold",
              inputs: [
                {
                  key: "name",
                  type: "string",
                  required: true,
                  validation: { pattern: "^[a-zA-Z0-9-]+$" },
                },
                {
                  key: "type",
                  type: "select",
                  validation: { options: ["library", "application"] },
                  default: "library",
                },
              ],
              templates: [
                {
                  src: "readme.md.njk",
                  target: "README.md",
                },
              ],
              post: [
                {
                  action: "note",
                  args: ["Scaffold created successfully"],
                },
              ],
            },
          ],
        },
      };

      writeFileSync(
        join(mockPackPath, "pack.json"),
        JSON.stringify(manifest, null, 2)
      );

      // Create template file
      const template = `# {{ name | pascalCase }}

A {{ type }} project generated with GitVan.

Generated on: {{ __system.timestamp }}
`;

      writeFileSync(join(mockPackPath, "templates", "readme.md.njk"), template);
    });

    it("should validate input types correctly", async () => {
      const validInputs = {
        name: "my-project",
        type: "library",
      };

      const invalidInputs = {
        name: "invalid name!", // fails pattern validation
        type: "invalid-type", // not in options
      };

      // Valid inputs should not throw
      const pack = await scaffoldRunner.loadPack(mockPackPath);
      const scaffold = scaffoldRunner.findScaffold(pack, "simple");

      expect(() =>
        scaffoldRunner.resolveInputs(scaffold, validInputs)
      ).not.toThrow();

      // Invalid inputs should throw
      await expect(
        scaffoldRunner.resolveInputs(scaffold, invalidInputs)
      ).rejects.toThrow();
    });

    it("should prevent path traversal attacks", () => {
      const dangerousInputs = {
        name: "../../../etc/passwd",
        type: "library",
      };

      expect(() =>
        scaffoldRunner.validateInputSecurity(dangerousInputs)
      ).toThrow("Path traversal detected");
    });

    it("should prevent template injection", () => {
      const maliciousInputs = {
        name: "test${process.env.SECRET}",
        type: "library",
      };

      expect(() =>
        scaffoldRunner.validateInputSecurity(maliciousInputs)
      ).toThrow("Template injection detected");
    });

    it("should execute scaffolds in dry-run mode", async () => {
      // Mock pack resolution
      scaffoldRunner.resolvePackPath = async () => mockPackPath;

      const result = await scaffoldRunner.run("test/mock-pack", "simple", {
        name: "test-project",
        type: "library",
      });

      expect(result.status).toBe("OK");
      expect(result.created).toHaveLength(1);
      expect(result.created[0]).toContain("README.md");
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("TemplateProcessor", () => {
    let templateProcessor;

    beforeEach(() => {
      templateProcessor = new TemplateProcessor({
        maxTemplateSize: 1024 * 1024,
        maxOutputSize: 1024 * 1024,
      });
    });

    it("should detect template syntax correctly", () => {
      const templates = [
        "{{ variable }}",
        "{% if condition %}content{% endif %}",
        "{# comment #}",
      ];

      const nonTemplates = [
        "plain text",
        'function() { return "not a template"; }',
        "// just a comment",
      ];

      templates.forEach((template) => {
        expect(templateProcessor.isTemplate(template)).toBe(true);
      });

      nonTemplates.forEach((text) => {
        expect(templateProcessor.isTemplate(text)).toBe(false);
      });
    });

    it("should render templates with custom filters", async () => {
      const template = "{{ name | pascalCase }}";
      const context = { name: "gitvan-project" };

      const result = await templateProcessor.render(template, context);

      expect(result).toBe("MyAwesomeProject");
    });

    it("should sanitize context to prevent prototype pollution", () => {
      const dangerousContext = {
        name: "test",
        __proto__: { polluted: true },
        constructor: "evil",
      };

      const sanitized = templateProcessor.sanitizeContext(dangerousContext);

      expect(sanitized).not.toHaveProperty("__proto__");
      expect(sanitized).not.toHaveProperty("constructor");
      expect(sanitized.name).toBe("test");
    });

    it("should enforce size limits", async () => {
      const processor = new TemplateProcessor({
        maxTemplateSize: 100,
        maxOutputSize: 50,
      });

      const largeTemplate = "x".repeat(200);

      // Large template should fail
      await expect(processor.render(largeTemplate, {})).rejects.toThrow(
        "Template too large"
      );

      // Test with a template that would generate large output
      const largeOutputTemplate = "{{ data }}";
      const largeData = { data: "x".repeat(100) };

      // This should fail due to output size
      await expect(
        processor.render(largeOutputTemplate, largeData)
      ).rejects.toThrow("Template output too large");
    });

    it("should handle all custom filters correctly", async () => {
      const testCases = [
        {
          filter: "camelCase",
          input: "my-test-string",
          expected: "myTestString",
        },
        {
          filter: "pascalCase",
          input: "my-test-string",
          expected: "MyTestString",
        },
        {
          filter: "kebabCase",
          input: "MyTestString",
          expected: "my-test-string",
        },
        {
          filter: "snakeCase",
          input: "MyTestString",
          expected: "my_test_string",
        },
        { filter: "upperCase", input: "hello", expected: "HELLO" },
        { filter: "lowerCase", input: "HELLO", expected: "hello" },
        {
          filter: "jsEscape",
          input: 'say "hello"',
          expected: 'say \\"hello\\"',
        },
      ];

      for (const { filter, input, expected } of testCases) {
        const template = `{{ input | ${filter} }}`;
        const result = await templateProcessor.render(template, { input });
        expect(result).toBe(expected);
      }
    });
  });

  describe("Integration Tests", () => {
    it("should work end-to-end with real pack structure", async () => {
      // Create a complete pack structure
      const packPath = join(tempDir, "integration-pack");
      mkdirSync(join(packPath, "templates"), { recursive: true });

      const manifest = {
        id: "integration/test-pack",
        version: "1.0.0",
        name: "Integration Test Pack",
        description: "A pack for integration testing",
        provides: {
          scaffolds: [
            {
              id: "full-test",
              title: "Full Integration Test",
              inputs: [
                { key: "projectName", type: "string", required: true },
                { key: "author", type: "string", default: "Unknown" },
                { key: "includeTests", type: "boolean", default: true },
              ],
              templates: [
                { src: "package.json.njk", target: "package.json" },
                {
                  src: "test.js.njk",
                  target: "tests/{{ projectName | kebabCase }}.test.js",
                  condition: "includeTests",
                },
              ],
            },
          ],
        },
      };

      writeFileSync(
        join(packPath, "pack.json"),
        JSON.stringify(manifest, null, 2)
      );

      const packageTemplate = `{
  "name": "{{ projectName | kebabCase }}",
  "version": "1.0.0",
  "description": "Generated by GitVan",
  "author": "{{ author }}",
  "scripts": {
    {% if includeTests %}"test": "vitest"{% endif %}
  }
}`;

      const testTemplate = `import { describe, it, expect } from 'vitest';

describe('{{ projectName | pascalCase }}', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});`;

      writeFileSync(
        join(packPath, "templates", "package.json.njk"),
        packageTemplate
      );
      mkdirSync(join(packPath, "templates"), { recursive: true });
      writeFileSync(join(packPath, "templates", "test.js.njk"), testTemplate);

      // Test the full flow
      const scaffoldRunner = new ScaffoldRunner({
        dryRun: false,
        cwd: tempDir,
      });
      scaffoldRunner.resolvePackPath = async () => packPath;

      // Don't use process.chdir() - use absolute paths instead
      try {
        const result = await scaffoldRunner.run(
          "integration/test-pack",
          "full-test",
          {
            projectName: "MyAwesome Project",
            author: "Test Author",
            includeTests: true,
          }
        );

        expect(result.status).toBe("OK");
        expect(result.created).toHaveLength(2);

        // Verify generated files
        const packagePath = join(tempDir, "package.json");
        const testPath = join(tempDir, "tests", "my-awesome-project.test.js");

        expect(existsSync(packagePath)).toBe(true);
        expect(existsSync(testPath)).toBe(true);

        const packageContent = readFileSync(packagePath, "utf8");
        const packageJson = JSON.parse(packageContent);

        expect(packageJson.name).toBe("gitvan-project");
        expect(packageJson.author).toBe("Test Author");
        expect(packageJson.scripts.test).toBe("vitest");
      } finally {
        // Don't use process.chdir() - cleanup is handled by afterEach
      }
    });
  });
});
