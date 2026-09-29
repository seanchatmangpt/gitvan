import { describe, expect, it } from "vitest";
import { assertExactCommitSyntax } from "../../src/swarm/gateway/subject.mjs";

describe("swarm gateway exact-SHA property", () => {
  it("admits exactly lowercase 40-hex subjects", () => {
    const valid = "0123456789abcdef".repeat(3).slice(0, 40);
    expect(assertExactCommitSyntax(valid)).toBe(valid);

    const invalid = [
      valid.slice(0, 39),
      valid + "0",
      valid.toUpperCase(),
      "g" + valid.slice(1),
      "HEAD",
      "main",
      "HEAD~1",
      "refs/heads/main",
    ];
    for (const value of invalid) {
      expect(() => assertExactCommitSyntax(value)).toThrow();
    }
  });

  it("rejects a deterministic corpus of non-hex mutations", () => {
    const base = "a".repeat(40);
    for (let i = 0; i < 40; i += 1) {
      const value = base.slice(0, i) + "z" + base.slice(i + 1);
      expect(() => assertExactCommitSyntax(value)).toThrow();
    }
  });
});
