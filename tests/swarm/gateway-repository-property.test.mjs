import { describe, expect, it } from "vitest";
import { normalizeRepositoryRemote } from "../../src/swarm/gateway/subject.mjs";

describe("swarm gateway repository normalization", () => {
  it("maps equivalent GitHub SSH/HTTPS remotes to one owner/name identity", () => {
    const pairs = [
      ["git@github.com:owner/repo.git", "owner/repo"],
      ["https://github.com/owner/repo.git", "owner/repo"],
      ["https://github.com/owner/repo", "owner/repo"],
      ["git@github.com:org.with-dots/repo_name.git", "org.with-dots/repo_name"],
    ];
    for (const [remote, expected] of pairs) {
      expect(normalizeRepositoryRemote(remote)).toBe(expected);
    }
  });

  it("does not manufacture GitHub identity for foreign or malformed remotes", () => {
    for (const remote of [
      "https://gitlab.com/owner/repo.git",
      "ssh://example.com/owner/repo.git",
      "file:///tmp/repo",
      "",
      "owner/repo",
    ]) {
      expect(normalizeRepositoryRemote(remote)).toBeNull();
    }
  });
});
