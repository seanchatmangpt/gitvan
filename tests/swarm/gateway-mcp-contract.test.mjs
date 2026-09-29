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

  it("rejects symbolic ref and malformed repository at schema boundary", () => {
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
