import { createHash } from 'node:crypto';

const SCHEMA = 'frontier-evidence/v1';
const PRODUCER = 'gitvan';
const AUTHORITY_CEILING = 'OBSERVE';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

function fingerprint(value) {
  const canonical = JSON.stringify(canonicalize(value));
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

/**
 * Project an already-produced native KGC-4D receipt into FrontierEvidence v1.
 *
 * This adapter never mutates KGC state, runs a Git hook, reconstructs history,
 * or grants external actuation authority. It only makes temporal/state receipt
 * evidence portable to a downstream admission court.
 */
export function frontierEvidenceFromKgc(
  { receipt, eventId = null, validTime = null, refPath = null },
  options = {}
) {
  if (!receipt || typeof receipt !== 'object') {
    throw new TypeError('native KGC receipt is required');
  }
  if (!options.producerHead) {
    throw new TypeError('producerHead is required');
  }

  const evidence = {
    kgc_receipt_hash: fingerprint(receipt),
    event_id: eventId,
    valid_time: validTime,
    ref_path: refPath,
  };

  const body = {
    schema: SCHEMA,
    producer: PRODUCER,
    producer_head: options.producerHead,
    standing: options.standing || 'PARTIAL_ALIVE',
    authority_ceiling: AUTHORITY_CEILING,
    evidence,
    refused: [
      'external_do',
      'implicit_valid_time',
      'history_reconstruction_without_git_backbone',
      'actuation_authority',
    ],
  };

  return { ...body, artifact_hash: fingerprint(body) };
}

export { canonicalize, fingerprint };
