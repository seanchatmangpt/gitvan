// tests/nunjucks-config.test.mjs
// GitVan v2 — Nunjucks Configuration Utility Tests

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import {
  createNunjucksEnvironment,
  getCachedEnvironment,
  clearEnvironmentCache,
  getCacheStats,
  validateEnvironmentConfig,
  createTestEnvironment,
  listAvailableFilters,
} from "../src/utils/nunjucks-config.mjs";

describe("nunjucks-config", () => {
  let tempDir;
  let templatesDir;

  beforeEach(async () => {
    // Create temporary directory structure
    tempDir = join(process.cwd(), "test-nunjucks-temp");
    templatesDir = join(tempDir, "templates");

    await fs.mkdir(templatesDir, { recursive: true });

    // Create test templates
    await fs.writeFile(
      join(templatesDir, "test.njk"),
      "Hello {{ name | capitalize }}!",
    );
  });

  afterEach(async () => {
    // Clean up temporary directory and cache
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    clearEnvironmentCache();
  });

  describe("environment creation", () => {
    it("should create environment with basic configuration", () => {
      const env = createNunjucksEnvironment({
        paths: [templatesDir],
        autoescape: false,
        noCache: true,
      });

      expect(env).toBeDefined();
      expect(env.loaders).toHaveLength(1);
    });

    it("should render template with built-in filters", () => {
      const env = createNunjucksEnvironment({
        paths: [templatesDir],
        autoescape: false,
        noCache: true,
      });

      const result = env.renderString("{{ 'hello' | upper }}", {});
      expect(result).toBe("HELLO");
    });

    it("should render template with inflection filters", () => {
      const env = createNunjucksEnvironment({
        paths: [templatesDir],
        autoescape: false,
        noCache: true,
      });

      const result = env.renderString('{{ "user" | pluralize }}', {});
      expect(result).toBe("users");
    });
  });

  describe("determinism guards", () => {
    it("should throw error for now() calls", () => {
      const env = createNunjucksEnvironment({
        paths: [templatesDir],
        autoescape: false,
        noCache: true,
      });

      expect(() => {
        env.renderString("{{ now() }}", {});
      }).toThrow("Templates must not call now()");
    });

    it("should throw error for random() calls", () => {
      const env = createNunjucksEnvironment({
        paths: [templatesDir],
        autoescape: false,
        noCache: true,
      });

      expect(() => {
        env.renderString("{{ random() }}", {});
      }).toThrow("Templates must not use random()");
    });
  });

  describe("caching", () => {
    it("should cache environments with same configuration", () => {
      const config = {
        paths: [templatesDir],
        autoescape: false,
        noCache: true,
      };

      const env1 = getCachedEnvironment(config);
      const env2 = getCachedEnvironment(config);

      expect(env1).toBe(env2);
    });

    it("should create different environments for different configurations", () => {
      const config1 = {
        paths: [templatesDir],
        autoescape: false,
        noCache: true,
      };

      const config2 = {
        paths: [templatesDir],
        autoescape: true,
        noCache: true,
      };

      const env1 = getCachedEnvironment(config1);
      const env2 = getCachedEnvironment(config2);

      expect(env1).not.toBe(env2);
    });

    it("should clear cache when requested", () => {
      const config = {
        paths: [templatesDir],
        autoescape: false,
        noCache: true,
      };

      getCachedEnvironment(config);
      expect(getCacheStats().size).toBe(1);

      clearEnvironmentCache();
      expect(getCacheStats().size).toBe(0);
    });

    it("should provide cache statistics", () => {
      const config = {
        paths: [templatesDir],
        autoescape: false,
        noCache: true,
      };

      getCachedEnvironment(config);
      const stats = getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.keys).toHaveLength(1);
      expect(stats.keys[0]).toContain('"paths"');
    });
  });

  describe("validation", () => {
    it("should validate correct configuration", () => {
      const config = {
        paths: [templatesDir],
        autoescape: false,
        noCache: true,
      };

      const result = validateEnvironmentConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid configuration", () => {
      const config = {
        paths: [],
        autoescape: "not-boolean",
        noCache: null,
      };

      const result = validateEnvironmentConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("test environment", () => {
    it("should create test environment with minimal config", () => {
      const env = createTestEnvironment([templatesDir]);
      expect(env).toBeDefined();
      expect(env.autoescape).toBe(false);
    });
  });

  describe("filter listing", () => {
    it("should list all available filters", () => {
      const filters = listAvailableFilters();

      expect(filters.builtIn).toContain("json");
      expect(filters.builtIn).toContain("slug");
      expect(filters.inflection).toContain("pluralize");
      expect(filters.inflection).toContain("camelize");
      expect(filters.guards).toContain("now");
      expect(filters.guards).toContain("random");
    });
  });

  describe("filter functionality", () => {
    let env;

    beforeEach(() => {
      env = createTestEnvironment([templatesDir]);
    });

    it("should handle built-in filters correctly", () => {
      expect(env.renderString("{{ 'Hello World!' | slug }}", {})).toBe(
        "hello-world",
      );
      expect(env.renderString("{{ 'hello' | upper }}", {})).toBe("HELLO");
      expect(env.renderString("{{ 'HELLO' | lower }}", {})).toBe("hello");
      expect(env.renderString("{{ '5' | pad(3) }}", {})).toBe("005");
    });

    it("should handle inflection filters correctly", () => {
      expect(env.renderString('{{ "user" | pluralize }}', {})).toBe("users");
      expect(env.renderString('{{ "users" | singularize }}', {})).toBe("user");
      expect(env.renderString('{{ "user_profile" | camelize }}', {})).toBe(
        "UserProfile",
      );
      expect(env.renderString('{{ "UserProfile" | underscore }}', {})).toBe(
        "user_profile",
      );
      expect(env.renderString('{{ "hello_world" | dasherize }}', {})).toBe(
        "hello-world",
      );
    });

    it("should handle json filter with spacing", () => {
      const data = { name: "test", value: 42 };
      const result = env.renderString("{{ data | json(2) }}", { data });
      expect(result).toBe(JSON.stringify(data, null, 2));
    });
  });
});
