import { describe, expect, it } from 'vitest';
import { frontierEvidenceFromKgc } from '../src/adapters/frontier-evidence.mjs';

describe('FrontierEvidence v1 KGC projection', () => {
  it('projects a native KGC receipt without granting DO authority', () => {
    const fragment = frontierEvidenceFromKgc(
      {
        receipt: {
          eventId: 'kgc-event-1',
          vectorClock: { gitvan: 7 },
          transactionTime: '2026-09-12T01:00:00.000Z',
        },
        eventId: 'urn:gitvan:event:sha256:abc',
        validTime: '2026-09-12T00:59:59.000Z',
        refPath: 'refs/rdf/events/2026-09-12/post-commit/abc',
      },
      {
        producerHead: '39f69483331dcac70502bb805049901e96ed33fb',
        standing: 'ALIVE',
      }
    );

    expect(fragment.schema).toBe('frontier-evidence/v1');
    expect(fragment.producer).toBe('gitvan');
    expect(fragment.authority_ceiling).toBe('OBSERVE');
    expect(fragment.standing).toBe('ALIVE');
    expect(fragment.artifact_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(fragment.refused).toContain('actuation_authority');
  });

  it('is deterministic for the same native receipt', () => {
    const input = {
      receipt: { counter: 3n, vectorClock: { gitvan: 3 } },
      eventId: 'event-3',
      validTime: '2026-09-12T01:00:00.000Z',
    };
    const options = { producerHead: 'head' };

    expect(frontierEvidenceFromKgc(input, options).artifact_hash).toBe(
      frontierEvidenceFromKgc(input, options).artifact_hash
    );
  });

  it('refuses an unreceipted observation', () => {
    expect(() =>
      frontierEvidenceFromKgc({ eventId: 'candidate-only' }, { producerHead: 'head' })
    ).toThrow(/native KGC receipt is required/);
  });
});
