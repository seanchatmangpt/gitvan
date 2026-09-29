import { describe, expect, it } from "vitest";
import {
  createEnvelope,
  parseOcelDocument,
  verifyEnvelope,
} from "../../src/swarm/gateway/envelope.mjs";
import {
  OCEL_EMPTY,
  SUBJECT_A,
} from "../../test/support/swarm-gateway-fixture.mjs";

describe("swarm gateway receipt envelope", () => {
  it("round-trips a subject-bound deterministic envelope", () => {
    const envelope = createEnvelope({ subject: SUBJECT_A, document: OCEL_EMPTY });
    expect(verifyEnvelope(envelope, SUBJECT_A)).toEqual(envelope);
  });

  it("refuses subject and digest drift", () => {
    const envelope = createEnvelope({ subject: SUBJECT_A, document: OCEL_EMPTY });
    expect(() => verifyEnvelope(envelope, "other/repo@" + "b".repeat(40))).toThrowError(
      expect.objectContaining({ code: "receipt_subject_drift" }),
    );

    expect(() =>
      verifyEnvelope({ ...envelope, documentDigest: "0".repeat(64) }, SUBJECT_A),
    ).toThrowError(expect.objectContaining({ code: "receipt_document_digest_mismatch" }));
  });

  it("keeps OCEL semantic ownership outside GitVan", () => {
    expect(parseOcelDocument(OCEL_EMPTY)).toEqual(OCEL_EMPTY);
    expect(() => parseOcelDocument({ events: [] })).toThrowError(
      expect.objectContaining({ code: "ocel_interchange_refused" }),
    );
  });
});
