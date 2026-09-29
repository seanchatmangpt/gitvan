import { describe, expect, it } from "vitest";
import { swarmMcpInputSchemas } from "../../src/mcp/swarm-server.mjs";

const sha = "a".repeat(40);

describe("swarm MCP exact-subject contract", () => {
  it("admits exact repository+commit arguments", () => {
    expect(
      swarmMcpInputSchemas.show.safeParse({
        repository: "seanchatmangpt/gitvan",
        commit: sha,
      }).success,
    ).toBe(true);
  });

  it("admits complete append provenance at the MCP boundary", () => {\n    expect(\n      swarmMcpInputSchemas.append.safeParse({\n        document: JSON.stringify({ objectTypes: [], eventTypes: [], objects: [], events: [] }),\n        repository: "seanchatmangpt/gitvan",\n        commit: sha,\n        base: "b".repeat(40),\n        tool: "gitvan-mcp",\n        task: "task-1",\n      }).success,\n    ).toBe(true);\n  });\n\n  it("rejects symbolic ref and malformed repository at schema boundary", () => {
    expect(
      swarmMcpInputSchemas.show.safeParse({
        repository: "seanchatmangpt/gitvan",
        commit: "HEAD",
      }).success,
    ).toBe(false);

    expect(
      swarmMcpInputSchemas.append.safeParse({
        document: "{}",
        repository: "gitvan",
        commit: sha,
      }).success,
    ).toBe(false);
  });
});
