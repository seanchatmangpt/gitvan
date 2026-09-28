import { describe,it,expect } from 'vitest';
import { admit,falsify } from '../../src/swarm-closure/rdf-projection.mjs';
describe('rdf-projection',()=>{it('requires exact subject',()=>{expect(admit({subject:'repo@commit'}).ok).toBe(true);expect(falsify({})).toBe(true);});});
