import { describe,it,expect } from 'vitest';
import { admit,falsify } from '../../src/swarm-closure/citty-adapter.mjs';
describe('citty-adapter',()=>{it('requires exact subject',()=>{expect(admit({subject:'repo@commit'}).ok).toBe(true);expect(falsify({})).toBe(true);});});
