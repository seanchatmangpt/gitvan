import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { gitvanCapabilities } from "../../src/capabilities/index.mjs";
import { compareCapabilityProjection, parseCapabilityOntology } from "../../scripts/verify-capability-projection.mjs";

describe("capability ontology projection", () => {
  it("matches the generated manifest", async () => {
    const ontology = await readFile(new URL("../../ontology/gitvan-capabilities.ttl", import.meta.url), "utf8");
    const expected = parseCapabilityOntology(ontology);
    const comparison = compareCapabilityProjection(expected, gitvanCapabilities);
    expect(expected).toHaveLength(9);
    expect(comparison).toEqual({ ok: true, missing: [], extra: [], mismatched: [] });
  });

  it("reports missing, extra, and mismatched capabilities", () => {
    const expected = [{ id: "a", title: "A", state: "ALIVE", dependsOn: [], verifier: "a", generatedBy: "ggen" }];
    const actual = [
      { id: "a", title: "changed", state: "ALIVE", dependsOn: [], verifier: "a", generatedBy: "ggen" },
      { id: "b", title: "B", state: "ALIVE", dependsOn: [], verifier: "b", generatedBy: "ggen" },
    ];
    const comparison = compareCapabilityProjection(expected, actual);
    expect(comparison.ok).toBe(false);
    expect(comparison.extra).toEqual(["b"]);
    expect(comparison.mismatched).toHaveLength(1);
  });
});
