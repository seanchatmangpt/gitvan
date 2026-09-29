import { describe, expect, it } from "vitest";
import { admitGatewayToolInput } from "../../src/swarm/gateway/tool-contract.mjs";
import {
  REPOSITORY,
  SHA_A,
} from "../../test/support/swarm-gateway-fixture.mjs";

describe("swarm gateway consumer contract", () => {
  it("admits explicit repository+commit", () => {
    expect(
      admitGatewayToolInput({ repository: REPOSITORY, commit: SHA_A }),
    ).toMatchObject({ repository: REPOSITORY, commit: SHA_A });
  });

  it("refuses symbolic commit and missing repository", () => {
    expect(() =>
      admitGatewayToolInput({ repository: REPOSITORY, commit: "HEAD" }),
    ).toThrowError(expect.objectContaining({ code: "exact_commit_required" }));

    expect(() =>
      admitGatewayToolInput({ commit: SHA_A }),
    ).toThrowError(
      expect.objectContaining({ code: "repository_identity_required" }),
    );
  });
});
