import { describe, expect, it } from "vitest";
import { capabilityGraph, capabilityLayers, createGitVanCapabilityRegistry, toDot, toGraphJSON, toMermaid } from "../../src/capabilities/index.mjs";

describe("capability graph projections", () => {
  const registry = createGitVanCapabilityRegistry();

  it("projects nodes and dependency edges", () => {
    const graph = capabilityGraph(registry);
    expect(graph.nodes).toHaveLength(registry.list().length);
    expect(graph.edges).toContainEqual({ from: "gitvan.receipt", to: "gitvan.lock", relation: "dependsOn" });
  });

  it("creates topological layers", () => {
    const layers = capabilityLayers(registry);
    expect(layers[0]).toContain("gitvan.receipt");
    expect(layers.flat()).toHaveLength(registry.list().length);
    expect(new Set(layers.flat()).size).toBe(registry.list().length);
  });

  it("renders JSON, Mermaid, and DOT", () => {
    expect(JSON.parse(toGraphJSON(registry)).nodes).toHaveLength(registry.list().length);
    expect(toMermaid(registry)).toContain("flowchart LR");
    expect(toMermaid(registry)).toContain("-->");
    expect(toDot(registry)).toContain("digraph gitvan_capabilities");
    expect(toDot(registry)).toContain("dependsOn");
  });
});
