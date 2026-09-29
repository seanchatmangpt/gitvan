import { useGit } from "../composables/git/index.mjs";
import { admitAuthority } from "./conformance/authority.mjs";
import { admitProvenance } from "./conformance/provenance.mjs";
import {
  CANONICAL_NOTES_REF,
  admitNotesRef,
} from "./conformance/namespace.mjs";
import { createEnvelope, verifyEnvelope } from "./gateway/envelope.mjs";
import { SwarmGatewayError } from "./gateway/errors.mjs";
import { resolveExactSubject } from "./gateway/subject.mjs";
import {
  classifyReadFailure,
  classifyWriteFailure,
} from "./gateway/transport.mjs";

export const SWARM_OCEL_NOTES_REF = CANONICAL_NOTES_REF;

function requireAuthority(actual, required) {
  const result = admitAuthority(actual);
  if (!result.ok || result.authority !== required) {
    throw new SwarmGatewayError(
      "authority_refused",
      "Operation requires " + required + " authority",
      { details: { actual, required } },
    );
  }
}

function requireNotesRef(ref) {
  const result = admitNotesRef(ref);
  if (!result.ok) {
    throw new SwarmGatewayError(
      "notes_namespace_refused",
      "Receipt ref is outside the admitted GitVan OCEL notes namespace",
      { details: result },
    );
  }
  return result.ref;
}

function requireProvenance(provenance, exact) {
  const result = admitProvenance(provenance);
  if (!result.ok) {
    throw new SwarmGatewayError(
      "provenance_refused",
      "Append requires exact repo/base/head/tool/task provenance",
      { details: result },
    );
  }
  if (
    result.provenance.repo !== exact.repository ||
    result.provenance.head !== exact.commit
  ) {
    throw new SwarmGatewayError(
      "provenance_subject_mismatch",
      "Provenance repo/head must equal the admitted receipt subject",
      {
        details: {
          expectedRepo: exact.repository,
          expectedHead: exact.commit,
          actualRepo: result.provenance.repo,
          actualHead: result.provenance.head,
        },
      },
    );
  }
  return result.provenance;
}

function parseNoteLines(raw, subject) {
  return String(raw)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      let value;
      try {
        value = JSON.parse(line);
      } catch (cause) {
        throw new SwarmGatewayError(
          "malformed_note",
          "Receipt note line " + (index + 1) + " is not valid JSON",
          { cause, subject },
        );
      }
      return verifyEnvelope(value, subject);
    });
}

export async function appendSwarmOcelReceipt({
  document,
  commit,
  repository,
  provenance,
  ref = SWARM_OCEL_NOTES_REF,
  authority = "RECEIPT_APPEND",
  git = useGit(),
} = {}) {
  requireAuthority(authority, "RECEIPT_APPEND");
  const notesRef = requireNotesRef(ref);
  const exact = await resolveExactSubject(git, commit, repository);
  const admittedProvenance = requireProvenance(provenance, exact);
  const envelope = createEnvelope({
    subject: exact.subject,
    document,
    provenance: admittedProvenance,
  });

  try {
    await git.noteAppend(notesRef, JSON.stringify(envelope), exact.commit);
  } catch (error) {
    classifyWriteFailure(error, exact.subject);
  }

  return Object.freeze({
    ok: true,
    status: "APPENDED",
    repository: exact.repository,
    commit: exact.commit,
    subject: exact.subject,
    ref: notesRef,
    provenance: admittedProvenance,
    documentDigest: envelope.documentDigest,
    envelopeDigest: envelope.envelopeDigest,
    eventCount: envelope.document.events.length,
    objectCount: envelope.document.objects.length,
  });
}

export async function readSwarmOcelReceipts({
  commit,
  repository,
  ref = SWARM_OCEL_NOTES_REF,
  authority = "OBSERVE",
  git = useGit(),
} = {}) {
  requireAuthority(authority, "OBSERVE");
  const notesRef = requireNotesRef(ref);
  const exact = await resolveExactSubject(git, commit, repository);

  let raw;
  try {
    raw = await git.noteShow(notesRef, exact.commit);
  } catch (error) {
    if (classifyReadFailure(error, exact.commit) === "note_absent") {
      return Object.freeze({
        status: "ABSENT",
        repository: exact.repository,
        commit: exact.commit,
        subject: exact.subject,
        ref: notesRef,
        envelopes: [],
        documents: [],
      });
    }
    throw error;
  }

  const envelopes = parseNoteLines(raw, exact.subject);
  return Object.freeze({
    status: "PRESENT",
    repository: exact.repository,
    commit: exact.commit,
    subject: exact.subject,
    ref: notesRef,
    envelopes,
    documents: envelopes.map((envelope) => envelope.document),
  });
}
