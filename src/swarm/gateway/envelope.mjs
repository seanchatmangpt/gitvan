import { digestReceipt } from "../conformance/replay.mjs";
import { admitOcelShape } from "../conformance/ocel.mjs";
import { SwarmGatewayError } from "./errors.mjs";

export const SWARM_RECEIPT_ENVELOPE =
  "https://gitvan.dev/swarm-receipt-envelope/v1";

export function parseOcelDocument(value) {
  let document;
  try {
    document = typeof value === "string" ? JSON.parse(value) : value;
  } catch (cause) {
    throw new SwarmGatewayError(
      "malformed_ocel_json",
      "Swarm receipt document is not valid JSON",
      { cause },
    );
  }

  const admitted = admitOcelShape(document);
  if (!admitted.ok) {
    throw new SwarmGatewayError(
      "ocel_interchange_refused",
      "Swarm receipt is not an admitted OCEL interchange shape",
      { details: admitted },
    );
  }
  return document;
}

export function createEnvelope({ subject, document }) {
  const parsed = parseOcelDocument(document);
  const documentDigest = digestReceipt(parsed);
  const body = {
    schema: SWARM_RECEIPT_ENVELOPE,
    subject,
    documentDigest,
    document: parsed,
  };
  return Object.freeze({
    ...body,
    envelopeDigest: digestReceipt(body),
  });
}

export function verifyEnvelope(value, expectedSubject) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SwarmGatewayError("malformed_note", "Receipt note line is not an object");
  }
  if (value.schema !== SWARM_RECEIPT_ENVELOPE) {
    throw new SwarmGatewayError(
      "malformed_note",
      "Receipt note line has an unsupported envelope schema",
      { details: { schema: value.schema } },
    );
  }
  if (value.subject !== expectedSubject) {
    throw new SwarmGatewayError(
      "receipt_subject_drift",
      "Receipt envelope subject does not match the requested repository+commit",
      { details: { expectedSubject, actualSubject: value.subject } },
    );
  }

  const document = parseOcelDocument(value.document);
  if (digestReceipt(document) !== value.documentDigest) {
    throw new SwarmGatewayError(
      "receipt_document_digest_mismatch",
      "Receipt document digest does not replay",
    );
  }

  const body = {
    schema: value.schema,
    subject: value.subject,
    documentDigest: value.documentDigest,
    document,
  };
  if (digestReceipt(body) !== value.envelopeDigest) {
    throw new SwarmGatewayError(
      "receipt_envelope_digest_mismatch",
      "Receipt envelope digest does not replay",
    );
  }

  return Object.freeze({ ...value, document });
}
