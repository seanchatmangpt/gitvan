import { describe, expect, it } from "vitest";
import {
  appendSwarmOcelReceipt,
  readSwarmOcelReceipts,
} from "../../src/swarm/receipt-service.mjs";
import {
  OCEL_EMPTY,
  REPOSITORY,
  SHA_A,
  makeGit,
} from "../../test/support/swarm-gateway-fixture.mjs";

describe("swarm gateway least authority", () => {
  it("refuses OBSERVE authority on append", async () => {
    await expect(
      appendSwarmOcelReceipt({
        git: makeGit(),
        document: OCEL_EMPTY,
        repository: REPOSITORY,
        commit: SHA_A,
        authority: "OBSERVE",\n        provenance: PROVENANCE_A,
      }),
    ).rejects.toMatchObject({ code: "authority_refused" });
  });

  it("refuses RECEIPT_APPEND authority on read", async () => {
    await expect(
      readSwarmOcelReceipts({
        git: makeGit(),
        repository: REPOSITORY,
        commit: SHA_A,
        authority: "RECEIPT_APPEND",
      }),
    ).rejects.toMatchObject({ code: "authority_refused" });
  });
});
