import { describe, expect, it } from "vitest";
import { createEnvelope, verifyEnvelope } from "../../src/swarm/gateway/envelope.mjs";
import { digestReceipt } from "../../src/swarm/conformance/replay.mjs";
import {
  OCEL_EMPTY,
  PROVENANCE_A,
  SUBJECT_A,
} from "../../test/support/swarm-gateway-fixture.mjs";

describe("swarm gateway replay properties", () => {
  it("is invariant to object key insertion order", () => {
    for (let i = 0; i < 128; i += 1) {
      const left = { a: i, b: { x: i + 1, y: i + 2 } };
      const right = { b: { y: i + 2, x: i + 1 }, a: i };
      expect(digestReceipt(left)).toBe(digestReceipt(right));
    }
  });

  it("detects every deterministic envelope mutation", () => {
    const envelope = createEnvelope({
      subject: SUBJECT_A,
      document: OCEL_EMPTY,
      provenance: PROVENANCE_A,
    });
    for (let i = 0; i < 64; i += 1) {
      const mutated = {
        ...envelope,
        envelopeDigest: String(i).padStart(64, "0"),
      };
      expect(() => verifyEnvelope(mutated, SUBJECT_A)).toThrow();
    }
  });
});
