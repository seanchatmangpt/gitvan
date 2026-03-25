// tests/supervision/base-supervisor.test.mjs
import { describe, it, expect } from 'vitest';
import { BaseSupervisor } from '../../src/supervision/base-supervisor.mjs';

describe('BaseSupervisor', () => {
  it('should initialize with options', () => {
    const supervisor = new BaseSupervisor({
      id: 'test-supervisor',
      maxRestarts: 3
    });
    expect(supervisor.id).toBe('test-supervisor');
    expect(supervisor.maxRestarts).toBe(3);
  });

  it('should track child supervisors', () => {
    const supervisor = new BaseSupervisor({ id: 'test' });
    const child = { id: 'child-1' };
    supervisor.addChild(child);
    expect(supervisor.children.size).toBe(1);
  });
});
