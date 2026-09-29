import { describe, expect, it } from "vitest";
import { readSwarmOcelReceipts } from "../../src/swarm/receipt-service.mjs";
import {
  OCEL_EMPTY,
  REPOSITORY,
  SHA_A,
  makeEnvelopeLine,
  makeGit,
} from "../../test/support/swarm-gateway-fixture.mjs";

describe("swarm gateway note-stream stress", () => {
  it("replays 512 subject-bound note envelopes without collapsing lines", async () => {
    const note = Array.from({ length: 512 }, () => makeEnvelopeLine()).join("\n");
    const result = await readSwarmOcelReceipts({
      git: makeGit({ note }),
      repository: REPOSITORY,
      commit: SHA_A,
    });
    expect(result.status).toBe("PRESENT");
    expect(result.envelopes).toHaveLength(512);
    expect(result.documents).toHaveLength(512);
    expect(result.documents.every((document) => document.events.length === OCEL_EMPTY.events.length)).toBe(true);
  });
});
