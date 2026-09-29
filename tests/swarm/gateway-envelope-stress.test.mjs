import { describe, expect, it } from "vitest";
import { createEnvelope, verifyEnvelope } from "../../src/swarm/gateway/envelope.mjs";
import {
  PROVENANCE_A,
  SUBJECT_A,
} from "../../test/support/swarm-gateway-fixture.mjs";

describe("swarm gateway envelope stress", () => {
  it("round-trips a large interchange payload without changing semantic content", () => {
    const document = {
      objectTypes: [],
      eventTypes: [],
      objects: Array.from({ length: 1_000 }, (_, i) => ({ id: "o" + i })),
      events: Array.from({ length: 1_000 }, (_, i) => ({ id: "e" + i })),
    };
    const envelope = createEnvelope({
      subject: SUBJECT_A,
      document,
      provenance: PROVENANCE_A,
    });
    const replay = verifyEnvelope(envelope, SUBJECT_A);
    expect(replay.document.objects).toHaveLength(1_000);
    expect(replay.document.events).toHaveLength(1_000);
    expect(replay.envelopeDigest).toBe(envelope.envelopeDigest);
  });
});
