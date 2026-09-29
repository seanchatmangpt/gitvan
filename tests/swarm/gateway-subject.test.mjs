import { describe, expect, it } from "vitest";
import {
  assertExactCommitSyntax,
  normalizeRepositoryRemote,
  resolveExactSubject,
} from "../../src/swarm/gateway/subject.mjs";
import {
  REPOSITORY,
  SHA_A,
  makeGit,
} from "../../test/support/swarm-gateway-fixture.mjs";

describe("swarm gateway exact subject", () => {
  it("rejects symbolic and noncanonical commit subjects before Git access", async () => {
    const git = makeGit();
    await expect(resolveExactSubject(git, "HEAD")).rejects.toMatchObject({
      code: "exact_commit_required",
    });
    await expect(resolveExactSubject(git, SHA_A.toUpperCase())).rejects.toMatchObject({
      code: "exact_commit_required",
    });
    expect(git.calls).toEqual([]);
  });

  it("binds exact GitHub repository and commit", async () => {
    const git = makeGit();
    await expect(resolveExactSubject(git, SHA_A, REPOSITORY)).resolves.toEqual({
      repository: REPOSITORY,
      commit: SHA_A,
      subject: REPOSITORY + "@" + SHA_A,
    });
  });

  it("normalizes SSH and HTTPS GitHub remotes but not foreign hosts", () => {
    expect(normalizeRepositoryRemote("git@github.com:o/r.git")).toBe("o/r");
    expect(normalizeRepositoryRemote("https://github.com/o/r.git")).toBe("o/r");
    expect(normalizeRepositoryRemote("https://example.com/o/r.git")).toBeNull();
    expect(() => assertExactCommitSyntax("main")).toThrow();
  });
});
