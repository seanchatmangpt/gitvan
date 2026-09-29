import { describe, expect, it } from 'vitest';
import { parseOcel2Document, SWARM_OCEL_NOTES_REF } from '../../src/swarm/receipt-service.mjs';

describe('swarm receipt service', () => {
  it('admits a standards-shaped OCEL 2.0 interchange document', () => {
    const doc = {
      objectTypes: [],
      eventTypes: [],
      objects: [],
      events: [],
    };
    expect(parseOcel2Document(JSON.stringify(doc))).toEqual(doc);
    expect(SWARM_OCEL_NOTES_REF).toBe('refs/notes/gitvan/ocel');
  });

  it('rejects source-shaped or incomplete telemetry payloads', () => {
    expect(() => parseOcel2Document({ events: [] })).toThrow(/objectTypes/);
  });
});
