import { describe,it,expect } from 'vitest';
import { admit,falsify } from '../../src/swarm-closure/object-identity.mjs';
describe('object-identity',()=>{it('requires exact subject',()=>{expect(admit({subject:'repo@commit'}).ok).toBe(true);expect(falsify({})).toBe(true);});});
