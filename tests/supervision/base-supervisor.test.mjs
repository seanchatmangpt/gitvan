// tests/supervision/base-supervisor.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { assert } from 'vitest';
import { BaseSupervisor } from '../../src/supervision/base-supervisor.mjs';

describe('BaseSupervisor', () => {
  let supervisor;

  beforeEach(() => {
    supervisor = new BaseSupervisor({
      id: 'test-supervisor',
      maxRestarts: 3
    });
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const s = new BaseSupervisor();
      assert.equal(s.id, 'supervisor');
      assert.equal(s.maxRestarts, 3);
      assert.equal(s.shutdownTimeout, 5000);
      assert.equal(s.isRunning, false);
    });

    it('should initialize with custom options', () => {
      const s = new BaseSupervisor({
        id: 'custom-supervisor',
        maxRestarts: 5,
        shutdownTimeout: 10000
      });
      assert.equal(s.id, 'custom-supervisor');
      assert.equal(s.maxRestarts, 5);
      assert.equal(s.shutdownTimeout, 10000);
    });
  });

  describe('child management', () => {
    it('should add child with id', () => {
      const child = { id: 'child-1' };
      supervisor.addChild(child);
      assert.equal(supervisor.children.size, 1);
      assert.equal(supervisor.getChild('child-1'), child);
    });

    it('should throw error when adding child without id', () => {
      const child = { name: 'no-id' };
      assert.throws(() => supervisor.addChild(child), /Child must have an id/);
    });

    it('should remove child', () => {
      const child = { id: 'child-1' };
      supervisor.addChild(child);
      supervisor.removeChild('child-1');
      assert.equal(supervisor.children.size, 0);
    });

    it('should get child by id', () => {
      const child = { id: 'child-1' };
      supervisor.addChild(child);
      const retrieved = supervisor.getChild('child-1');
      assert.equal(retrieved, child);
    });

    it('should return undefined for non-existent child', () => {
      const result = supervisor.getChild('non-existent');
      assert.equal(result, undefined);
    });
  });

  describe('lifecycle', () => {
    it('should start supervisor', async () => {
      await supervisor.start();
      assert.equal(supervisor.isRunning, true);
    });

    it('should stop supervisor', async () => {
      await supervisor.start();
      await supervisor.stop();
      assert.equal(supervisor.isRunning, false);
    });

    it('should stop child when stopping supervisor', async () => {
      let childStopped = false;
      const child = {
        id: 'child-1',
        stop: async () => { childStopped = true; }
      };
      supervisor.addChild(child);
      await supervisor.stop();
      assert.equal(childStopped, true);
    });
  });

  describe('restart counting', () => {
    it('should track restart count for child', () => {
      supervisor.incrementRestartCount('child-1');
      assert.equal(supervisor.getRestartCount('child-1'), 1);

      supervisor.incrementRestartCount('child-1');
      assert.equal(supervisor.getRestartCount('child-1'), 2);
    });

    it('should return 0 for child with no restarts', () => {
      assert.equal(supervisor.getRestartCount('never-restarted'), 0);
    });

    it('should check if child should restart', () => {
      assert.equal(supervisor.shouldRestartChild('new-child'), true);

      supervisor.incrementRestartCount('child-1');
      supervisor.incrementRestartCount('child-1');
      supervisor.incrementRestartCount('child-1');
      assert.equal(supervisor.shouldRestartChild('child-1'), false);
    });
  });

  describe('health reporting', () => {
    it('should report health status', () => {
      const child = { id: 'child-1' };
      supervisor.addChild(child);
      supervisor.incrementRestartCount('child-1');

      const health = supervisor.getHealth();
      assert.equal(health.id, 'test-supervisor');
      assert.equal(health.isRunning, false);
      assert.deepEqual(health.children, ['child-1']);
      assert.equal(health.restartCounts['child-1'], 1);
    });
  });
});
