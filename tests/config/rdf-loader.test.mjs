// tests/config/rdf-loader.test.mjs
// Executable contract for the canonical config parser + read-only RDF projection.

import { describe, it, expect } from "vitest";
import {
  configToQuads,
  envToQuads,
  CONFIG_NS,
} from "../../src/config/config-parser.mjs";
import { loadWithRDFSupport } from "../../src/config/rdf-adapter.mjs";

describe("RDF Config Contract", () => {
  describe("canonical config parser", () => {
    it("manufactures typed scalar quads in the canonical ontology", () => {
      const quads = configToQuads({
        ai: { provider: "anthropic", temperature: 0.7 },
        runtime: { deterministic: true },
        daemon: { pollMs: 1500 },
      });

      expect(quads.length).toBeGreaterThan(3);
      expect(quads.some((q) => q.predicate.value === `${CONFIG_NS}aiProvider`)).toBe(true);
      expect(
        quads.some(
          (q) => q.object.datatype?.value === "http://www.w3.org/2001/XMLSchema#decimal"
        )
      ).toBe(true);
      expect(
        quads.some(
          (q) => q.object.datatype?.value === "http://www.w3.org/2001/XMLSchema#boolean"
        )
      ).toBe(true);
      expect(
        quads.some(
          (q) => q.object.datatype?.value === "http://www.w3.org/2001/XMLSchema#integer"
        )
      ).toBe(true);
    });

    it("preserves the admitted subject IRI", () => {
      const configUri = "https://example.com/config/prod";
      const quads = configToQuads({ ai: { provider: "anthropic" } }, configUri);
      expect(quads.every((q) => q.subject.value === configUri || q.subject.value.startsWith("urn:blank:"))).toBe(true);
    });

    it("does not manufacture null or undefined configuration values", () => {
      const quads = configToQuads({
        ai: { provider: "anthropic", apiKey: null, baseUrl: undefined },
      });
      expect(quads.some((q) => q.predicate.value.endsWith("aiApiKey"))).toBe(false);
      expect(quads.some((q) => q.predicate.value.endsWith("aiBaseUrl"))).toBe(false);
    });

    it("maps admitted environment variables and ignores unrelated variables", () => {
      const quads = envToQuads({
        GITVAN_AI_PROVIDER: "anthropic",
        GITVAN_RUNTIME_DETERMINISTIC: "true",
        GITVAN_DAEMON_POLL_MS: "1500",
        OTHER_SECRET: "must-not-enter-the-graph",
      });

      expect(quads.some((q) => q.predicate.value === `${CONFIG_NS}aiProvider`)).toBe(true);
      expect(quads.some((q) => q.object.value === "must-not-enter-the-graph")).toBe(false);
      expect(
        quads.some(
          (q) => q.object.datatype?.value === "http://www.w3.org/2001/XMLSchema#boolean"
        )
      ).toBe(true);
      expect(
        quads.some(
          (q) => q.object.datatype?.value === "http://www.w3.org/2001/XMLSchema#integer"
        )
      ).toBe(true);
    });

    it("supports a custom environment prefix and subject IRI", () => {
      const configUri = "https://example.com/config/dev";
      const quads = envToQuads(
        { APP_AI_PROVIDER: "anthropic", GITVAN_AI_MODEL: "ignored" },
        "APP_",
        configUri
      );

      expect(quads.some((q) => q.subject.value === configUri)).toBe(true);
      expect(quads.some((q) => q.object.value === "anthropic")).toBe(true);
      expect(quads.some((q) => q.object.value === "ignored")).toBe(false);
    });
  });

  describe("c12 + RDF compatibility projection", () => {
    it("preserves direct c12 properties and the historical .config shape", async () => {
      const result = await loadWithRDFSupport({
        ai: { provider: "anthropic", temperature: 0.7 },
        jobs: { dir: "custom-jobs" },
      });

      expect(result.ai.provider).toBe("anthropic");
      expect(result.jobs.dir).toBe("custom-jobs");
      expect(result.config.ai.provider).toBe("anthropic");
      expect(result.rdf.isAvailable()).toBe(true);
    });

    it("preserves scalar types through path access and POJO projection", async () => {
      const result = await loadWithRDFSupport({
        runtime: { deterministic: true },
        daemon: { pollMs: 1500 },
        ai: { temperature: 0.7 },
      });

      expect(await result.rdf.get("runtime.deterministic")).toBe(true);
      expect(await result.rdf.get("daemon.pollMs")).toBe(1500);
      expect(await result.rdf.get("ai.temperature")).toBe(0.7);
      expect(await result.getRDF("daemon.pollMs")).toBe(1500);

      const pojo = await result.rdf.toPOJO();
      expect(pojo.runtime.deterministic).toBe(true);
      expect(pojo.daemon.pollMs).toBe(1500);
      expect(pojo.ai.temperature).toBe(0.7);
    });

    it("returns independent POJO snapshots", async () => {
      const result = await loadWithRDFSupport({ ai: { provider: "anthropic" } });
      const snapshot = await result.rdf.toPOJO();
      snapshot.ai.provider = "mutated";
      expect(result.ai.provider).toBe("anthropic");
      expect(await result.rdf.get("ai.provider")).toBe("anthropic");
    });

    it("enumerates nested configuration paths", async () => {
      const result = await loadWithRDFSupport({
        ai: { provider: "anthropic" },
        runtime: { deterministic: true },
      });
      const paths = await result.rdf.paths();
      expect(paths).toContain("ai.provider");
      expect(paths).toContain("runtime.deterministic");
    });

    it("executes read-only SPARQL with expression evaluation asynchronously", async () => {
      const result = await loadWithRDFSupport({ ai: { provider: "anthropic" } });
      const bindings = await result.rdf.query(`
        PREFIX gvc: <${CONFIG_NS}>
        SELECT ?value WHERE {
          <urn:gitvan:config> gvc:aiProvider ?value .
          FILTER(isLiteral(?value))
        }
      `);
      expect(bindings).toBeDefined();
    });

    it("refuses SPARQL mutation before execution", async () => {
      const result = await loadWithRDFSupport({ ai: { provider: "anthropic" } });
      await expect(
        result.rdf.query(`
          PREFIX gvc: <${CONFIG_NS}>
          INSERT DATA { <urn:gitvan:config> gvc:aiProvider "ollama" . }
        `)
      ).rejects.toMatchObject({ code: "RDF_QUERY_MUTATION_REFUSED" });
      expect(result.ai.provider).toBe("anthropic");
    });

    it("exports the canonical ontology rather than a second adapter namespace", async () => {
      const result = await loadWithRDFSupport({ ai: { provider: "anthropic" } });
      const turtle = await result.rdf.toTurtle();
      expect(turtle).toContain(`@prefix gvc: <${CONFIG_NS}> .`);
      expect(turtle).toContain(CONFIG_NS);
      expect(turtle).not.toContain("http://gitvan.local/ontology/");
    });

    it("does not manufacture a SHACL-valid claim without shapes", async () => {
      const result = await loadWithRDFSupport({ ai: { provider: "anthropic" } });
      const validation = await result.rdf.validate();
      expect(validation).toMatchObject({
        supported: false,
        valid: false,
        conformant: null,
        code: "SHACL_SHAPES_REQUIRED",
      });
      expect(validation.results).toEqual([]);
    });

    it("manufactures consistency evidence only when requested", async () => {
      const plain = await loadWithRDFSupport({ ai: { provider: "anthropic" } });
      expect(plain.getConsistencyReport()).toBeNull();

      const checked = await loadWithRDFSupport(
        { ai: { provider: "anthropic" } },
        { validateConsistency: true }
      );
      expect(checked.getConsistencyReport()).toMatchObject({
        isConsistent: true,
        discrepancies: [],
      });
    });

    it("honors a custom RDF subject IRI", async () => {
      const configUri = "https://example.com/config/prod";
      const result = await loadWithRDFSupport(
        { ai: { provider: "anthropic" } },
        { rdfConfigUri: configUri }
      );
      const turtle = await result.rdf.toTurtle();
      expect(turtle).toContain(`<${configUri}>`);
    });

    it("exposes a bounded load-time receipt", async () => {
      const result = await loadWithRDFSupport({});
      expect(result.getLoadTimeMs()).toBeGreaterThanOrEqual(0);
    });
  });
});
