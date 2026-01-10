// tests/config/rdf-loader.test.mjs
// Comprehensive test suite for RDF config loader

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadRDFConfig } from "../../src/config/rdf-loader.mjs";
import { configToQuads, envToQuads, CONFIG_NS } from "../../src/config/config-parser.mjs";
import { useRDFConfig, createReactiveConfig } from "../../src/composables/rdf-config.mjs";

describe("RDF Config Loader", () => {
  // ========================================================================
  // Config Parser Tests
  // ========================================================================

  describe("Config Parser - configToQuads", () => {
    it("should convert simple config to quads", () => {
      const config = {
        ai: {
          provider: "anthropic",
          temperature: 0.7,
        },
      };

      const quads = configToQuads(config);

      expect(quads).toBeDefined();
      expect(Array.isArray(quads)).toBe(true);
      expect(quads.length).toBeGreaterThan(0);

      // Find the type quad
      const typeQuad = quads.find(
        (q) => q.predicate.value.endsWith("#type")
      );
      expect(typeQuad).toBeDefined();
    });

    it("should handle boolean values with correct datatype", () => {
      const config = {
        runtime: {
          deterministic: true,
          sandbox: false,
        },
      };

      const quads = configToQuads(config);
      expect(quads.length).toBeGreaterThan(0);

      const boolQuads = quads.filter((q) =>
        q.object.datatype?.value.includes("boolean")
      );
      expect(boolQuads.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle numeric values with correct datatype", () => {
      const config = {
        daemon: {
          pollMs: 1500,
          maxPerTick: 50,
        },
      };

      const quads = configToQuads(config);

      const intQuads = quads.filter(
        (q) =>
          q.object.datatype?.value.includes("integer") &&
          (q.object.value === "1500" || q.object.value === "50")
      );
      expect(intQuads.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle decimal values", () => {
      const config = {
        ai: {
          temperature: 0.7,
          topP: 0.95,
        },
      };

      const quads = configToQuads(config);

      const decimalQuads = quads.filter((q) =>
        q.object.datatype?.value.includes("decimal")
      );
      expect(decimalQuads.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle nested objects", () => {
      const config = {
        jobs: {
          dir: "jobs",
          scan: {
            patterns: ["**/*.mjs"],
            ignore: ["node_modules"],
          },
        },
      };

      const quads = configToQuads(config);
      expect(quads.length).toBeGreaterThan(0);
    });

    it("should skip null and undefined values", () => {
      const config = {
        ai: {
          provider: "anthropic",
          apiKey: null,
          baseUrl: undefined,
        },
      };

      const quads = configToQuads(config);
      expect(quads.length).toBeGreaterThan(0);

      const apiKeyQuads = quads.filter((q) =>
        q.predicate.value.includes("apiKey")
      );
      expect(apiKeyQuads.length).toBe(0);
    });

    it("should use custom config URI", () => {
      const config = { ai: { provider: "anthropic" } };
      const customUri = "https://example.com/config/prod";

      const quads = configToQuads(config, customUri);

      const typeQuad = quads.find((q) => q.predicate.value.endsWith("type"));
      expect(typeQuad).toBeDefined();
      expect(typeQuad.subject.value).toBe(customUri);
    });
  });

  describe("Config Parser - envToQuads", () => {
    it("should convert environment variables to quads", () => {
      const env = {
        GITVAN_AI_PROVIDER: "anthropic",
        GITVAN_AI_MODEL: "claude-opus",
        OTHER_VAR: "ignored",
      };

      const quads = envToQuads(env);

      expect(quads.length).toBeGreaterThan(0);

      const aiProviderQuad = quads.find((q) =>
        q.predicate.value.includes("aiProvider")
      );
      expect(aiProviderQuad).toBeDefined();
      expect(aiProviderQuad.object.value).toBe("anthropic");
    });

    it("should handle boolean env vars", () => {
      const env = {
        GITVAN_RUNTIME_DETERMINISTIC: "true",
        GITVAN_RUNTIME_SANDBOX: "false",
      };

      const quads = envToQuads(env);

      const boolQuads = quads.filter((q) =>
        q.object.datatype?.value.includes("boolean")
      );
      expect(boolQuads.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle numeric env vars", () => {
      const env = {
        GITVAN_DAEMON_POLL_MS: "1500",
        GITVAN_DAEMON_LOOKBACK: "600",
      };

      const quads = envToQuads(env);

      const intQuads = quads.filter((q) =>
        q.object.datatype?.value.includes("integer")
      );
      expect(intQuads.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle decimal env vars", () => {
      const env = {
        GITVAN_AI_TEMPERATURE: "0.7",
        GITVAN_AI_TOP_P: "0.95",
      };

      const quads = envToQuads(env);

      const decimalQuads = quads.filter((q) =>
        q.object.datatype?.value.includes("decimal")
      );
      expect(decimalQuads.length).toBeGreaterThanOrEqual(1);
    });

    it("should use custom prefix", () => {
      const env = {
        APP_AI_PROVIDER: "anthropic",
        GITVAN_AI_MODEL: "claude-opus",
      };

      const quads = envToQuads(env, "APP_");

      const aiProviderQuad = quads.find((q) =>
        q.predicate.value.includes("aiProvider")
      );
      expect(aiProviderQuad).toBeDefined();
      expect(aiProviderQuad.object.value).toBe("anthropic");

      // GITVAN_ prefixed vars should not be included
      const modelQuad = quads.find((q) =>
        q.predicate.value.includes("aiModel")
      );
      expect(modelQuad).toBeUndefined();
    });

    it("should skip empty values", () => {
      const env = {
        GITVAN_AI_PROVIDER: "",
        GITVAN_AI_MODEL: "claude-opus",
      };

      const quads = envToQuads(env);

      const providerQuad = quads.find((q) =>
        q.predicate.value.includes("aiProvider")
      );
      expect(providerQuad).toBeUndefined();
    });

    it("should use custom config URI", () => {
      const env = { GITVAN_AI_PROVIDER: "anthropic" };
      const customUri = "https://example.com/config/dev";

      const quads = envToQuads(env, "GITVAN_", customUri);

      const typeQuad = quads.find((q) => q.predicate.value.endsWith("type"));
      expect(typeQuad).toBeDefined();
      expect(typeQuad.subject.value).toBe(customUri);
    });
  });

  // ========================================================================
  // RDF Loader Tests
  // ========================================================================

  describe("RDF Loader - loadRDFConfig", () => {
    it("should load config from environment", async () => {
      const env = {
        GITVAN_AI_PROVIDER: "anthropic",
        GITVAN_AI_MODEL: "claude-opus",
      };

      const config = await loadRDFConfig({ env });

      expect(config).toBeDefined();
      expect(typeof config.get).toBe("function");
      expect(typeof config.query).toBe("function");
      expect(typeof config.validate).toBe("function");
      expect(typeof config.toTurtle).toBe("function");
      expect(typeof config.toPOJO).toBe("function");
    });

    it("should get single config value", async () => {
      const env = {
        GITVAN_AI_PROVIDER: "anthropic",
        GITVAN_AI_TEMPERATURE: "0.7",
      };

      const config = await loadRDFConfig({ env });

      const provider = await config.get("ai.provider");
      expect(provider).toBe("anthropic");

      const temperature = await config.get("ai.temperature");
      expect(temperature).toBe(0.7);
    });

    it("should return undefined for unknown paths", async () => {
      const env = { GITVAN_AI_PROVIDER: "anthropic" };
      const config = await loadRDFConfig({ env });

      const value = await config.get("unknown.path");
      expect(value).toBeUndefined();
    });

    it("should merge env and config object", async () => {
      const env = {
        GITVAN_AI_PROVIDER: "anthropic",
      };

      const configObj = {
        ai: {
          model: "claude-opus",
        },
      };

      const config = await loadRDFConfig({ env, configObj });

      const provider = await config.get("ai.provider");
      const model = await config.get("ai.model");

      expect(provider).toBe("anthropic");
      expect(model).toBe("claude-opus");
    });

    it("should export config as POJO", async () => {
      const configObj = {
        ai: {
          provider: "anthropic",
          temperature: 0.7,
        },
        runtime: {
          timezone: "UTC",
        },
      };

      const config = await loadRDFConfig({ configObj });
      const pojo = await config.toPOJO();

      expect(pojo).toBeDefined();
      expect(pojo.ai).toBeDefined();
      expect(pojo.ai.provider).toBe("anthropic");
      expect(pojo.runtime).toBeDefined();
    });

    it("should export config as Turtle", async () => {
      const configObj = {
        ai: {
          provider: "anthropic",
        },
      };

      const config = await loadRDFConfig({ configObj });
      const turtle = await config.toTurtle();

      expect(typeof turtle).toBe("string");
      expect(turtle.length).toBeGreaterThan(0);
      expect(turtle).toContain("@prefix");
    });

    it("should get all config paths", async () => {
      const env = {
        GITVAN_AI_PROVIDER: "anthropic",
        GITVAN_RUNTIME_TIMEZONE: "UTC",
      };

      const config = await loadRDFConfig({ env });
      const paths = await config.paths();

      expect(Array.isArray(paths)).toBe(true);
      expect(paths).toContain("ai.provider");
      expect(paths).toContain("runtime.timezone");
    });

    it("should get all config values", async () => {
      const env = {
        GITVAN_AI_PROVIDER: "anthropic",
        GITVAN_DAEMON_POLL_MS: "1500",
      };

      const config = await loadRDFConfig({ env });
      const all = await config.all();

      expect(all).toBeDefined();
      expect(all.ai).toBeDefined();
      expect(all.daemon).toBeDefined();
    });

    it("should handle type conversion for integers", async () => {
      const env = {
        GITVAN_DAEMON_POLL_MS: "1500",
        GITVAN_DAEMON_RETRIES: "3",
      };

      const config = await loadRDFConfig({ env });

      const pollMs = await config.get("daemon.pollMs");
      expect(typeof pollMs).toBe("number");
      expect(pollMs).toBe(1500);
    });

    it("should handle type conversion for booleans", async () => {
      const env = {
        GITVAN_RUNTIME_DETERMINISTIC: "true",
        GITVAN_RUNTIME_SANDBOX: "false",
      };

      const config = await loadRDFConfig({ env });

      const deterministic = await config.get("runtime.deterministic");
      expect(typeof deterministic).toBe("boolean");
      expect(deterministic).toBe(true);

      const sandbox = await config.get("runtime.sandbox");
      expect(sandbox).toBe(false);
    });

    it("should validate config", async () => {
      const env = {
        GITVAN_RUNTIME_TIMEZONE: "UTC",
        GITVAN_RUNTIME_LOCALE: "en-US",
      };

      const config = await loadRDFConfig({ env });
      const validation = await config.validate();

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe("boolean");
      expect(Array.isArray(validation.results)).toBe(true);
    });

    it("should execute SPARQL queries", async () => {
      const env = {
        GITVAN_AI_PROVIDER: "anthropic",
        GITVAN_AI_TEMPERATURE: "0.7",
      };

      const config = await loadRDFConfig({ env });

      const sparql = `
        PREFIX gvc: <${CONFIG_NS}>
        SELECT ?property ?value
        WHERE {
          <urn:gitvan:config> ?property ?value .
        }
      `;

      const results = await config.query(sparql);
      expect(results).toBeDefined();
    });

    it("should get underlying RDF store", async () => {
      const env = { GITVAN_AI_PROVIDER: "anthropic" };
      const config = await loadRDFConfig({ env });

      const store = config.getStore();
      expect(store).toBeDefined();
      expect(typeof store.match).toBe("function");
    });

    it("should use custom config URI", async () => {
      const env = { GITVAN_AI_PROVIDER: "anthropic" };
      const customUri = "https://example.com/config/prod";

      const config = await loadRDFConfig({
        env,
        configUri: customUri,
      });

      const provider = await config.get("ai.provider");
      expect(provider).toBe("anthropic");
    });

    it("should handle type inference for decimals", async () => {
      const env = {
        GITVAN_AI_TEMPERATURE: "0.75",
      };

      const config = await loadRDFConfig({ env });
      const temperature = await config.get("ai.temperature");

      expect(typeof temperature).toBe("number");
      expect(temperature).toBe(0.75);
    });
  });

  // ========================================================================
  // Composable Tests
  // ========================================================================

  describe("useRDFConfig Composable", () => {
    it("should load config via composable", async () => {
      const env = { GITVAN_AI_PROVIDER: "anthropic" };

      const config = await useRDFConfig({ env, cacheKey: "test1" });

      expect(config).toBeDefined();
      expect(typeof config.get).toBe("function");
    });

    it("should cache configs", async () => {
      const env1 = { GITVAN_AI_PROVIDER: "anthropic" };
      const env2 = { GITVAN_AI_PROVIDER: "ollama" };

      const config1 = await useRDFConfig({ env: env1, cacheKey: "cache-test" });
      const config2 = await useRDFConfig({ env: env2, cacheKey: "cache-test" });

      // Should return same instance (cached)
      expect(config1).toBe(config2);
    });

    it("should handle cache disabled", async () => {
      const env = { GITVAN_AI_PROVIDER: "anthropic" };

      const config1 = await useRDFConfig({
        env,
        cache: false,
        cacheKey: "no-cache-test",
      });
      const config2 = await useRDFConfig({
        env,
        cache: false,
        cacheKey: "no-cache-test",
      });

      // Should return different instances (not cached)
      expect(config1).not.toBe(config2);
    });
  });

  describe("Reactive Config", () => {
    it("should create reactive config", async () => {
      const env = { GITVAN_AI_PROVIDER: "anthropic" };
      const baseConfig = await loadRDFConfig({ env });
      const reactive = createReactiveConfig(baseConfig);

      expect(reactive).toBeDefined();
      expect(typeof reactive.getValue).toBe("function");
      expect(typeof reactive.getAll).toBe("function");
      expect(typeof reactive.clearCache).toBe("function");
    });

    it("should cache values in reactive config", async () => {
      const env = { GITVAN_AI_PROVIDER: "anthropic" };
      const baseConfig = await loadRDFConfig({ env });
      const reactive = createReactiveConfig(baseConfig);

      const value1 = await reactive.getValue("ai.provider");
      const value2 = await reactive.getValue("ai.provider");

      expect(value1).toBe(value2);
      expect(value1).toBe("anthropic");
    });

    it("should clear cache in reactive config", async () => {
      const env = { GITVAN_AI_PROVIDER: "anthropic" };
      const baseConfig = await loadRDFConfig({ env });
      const reactive = createReactiveConfig(baseConfig);

      await reactive.getValue("ai.provider");
      reactive.clearCache();

      // Should still work after clearing cache
      const value = await reactive.getValue("ai.provider");
      expect(value).toBe("anthropic");
    });

    it("should execute SPARQL through reactive config", async () => {
      const env = { GITVAN_AI_PROVIDER: "anthropic" };
      const baseConfig = await loadRDFConfig({ env });
      const reactive = createReactiveConfig(baseConfig);

      const sparql = `
        PREFIX gvc: <${CONFIG_NS}>
        SELECT ?property ?value
        WHERE {
          <urn:gitvan:config> ?property ?value .
        }
        LIMIT 1
      `;

      const results = await reactive.query(sparql);
      expect(results).toBeDefined();
    });

    it("should validate through reactive config", async () => {
      const env = {
        GITVAN_RUNTIME_TIMEZONE: "UTC",
      };
      const baseConfig = await loadRDFConfig({ env });
      const reactive = createReactiveConfig(baseConfig);

      const validation = await reactive.validate();
      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe("boolean");
    });
  });

  // ========================================================================
  // Integration Tests
  // ========================================================================

  describe("Integration Tests", () => {
    it("should handle complex nested config", async () => {
      const configObj = {
        jobs: {
          dir: "jobs",
          scan: {
            patterns: ["**/*.mjs", "**/*.cron.mjs"],
            ignore: ["node_modules", ".git"],
          },
        },
        ai: {
          provider: "anthropic",
          model: "claude-opus",
          temperature: 0.7,
          maxTokens: 4096,
        },
        runtime: {
          timezone: "UTC",
          locale: "en-US",
          deterministic: true,
          sandbox: true,
        },
      };

      const config = await loadRDFConfig({ configObj });

      expect(await config.get("jobs.dir")).toBe("jobs");
      expect(await config.get("ai.provider")).toBe("anthropic");
      expect(await config.get("runtime.timezone")).toBe("UTC");
      expect(await config.get("runtime.deterministic")).toBe(true);
    });

    it("should handle env override of config object", async () => {
      const configObj = {
        ai: {
          provider: "ollama",
          temperature: 0.5,
        },
      };

      const env = {
        GITVAN_AI_TEMPERATURE: "0.8",
      };

      const config = await loadRDFConfig({ configObj, env });

      // Env should be merged with configObj
      expect(await config.get("ai.provider")).toBe("ollama");
      expect(await config.get("ai.temperature")).toBe(0.8);
    });

    it("should export and re-import config", async () => {
      const original = {
        ai: {
          provider: "anthropic",
          temperature: 0.7,
        },
      };

      const config1 = await loadRDFConfig({ configObj: original });
      const pojo = await config1.toPOJO();

      const config2 = await loadRDFConfig({ configObj: pojo });

      expect(await config2.get("ai.provider")).toBe("anthropic");
      expect(await config2.get("ai.temperature")).toBe(0.7);
    });

    it("should handle performance with many config values", async () => {
      const configObj = {};

      // Add many values
      for (let i = 0; i < 50; i++) {
        configObj[`key${i}`] = {
          value: `value${i}`,
          number: i,
          bool: i % 2 === 0,
        };
      }

      const start = Date.now();
      const config = await loadRDFConfig({ configObj });
      const paths = await config.paths();
      const elapsed = Date.now() - start;

      expect(paths.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100); // Should load < 100ms
    });
  });
});
