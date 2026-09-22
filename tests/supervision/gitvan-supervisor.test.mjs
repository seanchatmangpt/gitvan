// tests/supervision/gitvan-supervisor.test.mjs
import { describe, it, beforeEach, afterEach } from 'vitest';
import { assert } from 'vitest';
import { GitVanSupervisor } from '../../src/supervision/gitvan-supervisor.mjs';

// Mock WorkflowSupervisor for testing
class MockWorkflowSupervisor {
  constructor(options = {}) {
    this.id = options.id || 'mock-workflow-supervisor';
    this.started = false;
    this.stopped = false;
  }

  async start() {
    this.started = true;
  }

  async stop() {
    this.stopped = true;
  }

  async restart() {
    this.started = true;
  }

  getHealth() {
    return {
      id: this.id,
      isRunning: this.started && !this.stopped
    };
  }
}

describe('GitVanSupervisor', () => {
  let supervisor;

  beforeEach(() => {
    supervisor = new GitVanSupervisor({
      id: 'gitvan-root',
      dryRun: true
    });
  });

  afterEach(async () => {
    await supervisor.stop();
  });

  describe('child management', () => {
    it('should manage child supervisors', async () => {
      const workflowSupervisor = new MockWorkflowSupervisor({
        id: 'workflow-supervisor'
      });

      supervisor.addChild(workflowSupervisor);
      await supervisor.start();

      assert.equal(supervisor.getChild('workflow-supervisor'), workflowSupervisor);
      assert.isTrue(supervisor.getHealth().isRunning);
    });

    it('should start child supervisors', async () => {
      const child = new MockWorkflowSupervisor({ id: 'child-1' });
      supervisor.addChild(child);
      await supervisor.start();

      assert.isTrue(child.started);
    });
  });

  describe('crash handling', () => {
    it('should handle child supervisor crash with transient error', async () => {
      const child = new MockWorkflowSupervisor({ id: 'child-1' });
      supervisor.addChild(child);
      await supervisor.start();

      const error = new Error('ECONNREFUSED');
      error.code = 'ECONNREFUSED';

      const result = await supervisor.handleChildCrash('child-1', error);

      assert.equal(result.action, 'restarted');
      assert.equal(result.childId, 'child-1');
      assert.equal(supervisor.getRestartCount('child-1'), 1);
    });

    it('should stop child on permanent error', async () => {
      const child = new MockWorkflowSupervisor({ id: 'child-1' });
      supervisor.addChild(child);
      await supervisor.start();

      const error = new Error('ENOENT');
      error.code = 'ENOENT';

      const result = await supervisor.handleChildCrash('child-1', error);

      assert.equal(result.action, 'stopped');
      assert.equal(result.reason, 'permanent_error');
    });

    it('should stop child after max restarts', async () => {
      const supervisor = new GitVanSupervisor({
        id: 'gitvan-root',
        dryRun: true,
        maxRestarts: 3  // Set max restarts to 3 for this test
      });

      const child = new MockWorkflowSupervisor({ id: 'child-1' });
      supervisor.addChild(child);
      await supervisor.start();

      // Set restart count to max
      supervisor.incrementRestartCount('child-1');
      supervisor.incrementRestartCount('child-1');
      supervisor.incrementRestartCount('child-1');

      const error = new Error('ECONNREFUSED');
      error.code = 'ECONNREFUSED';

      const result = await supervisor.handleChildCrash('child-1', error);

      assert.equal(result.action, 'stopped');
      assert.equal(result.reason, 'max_restarts');

      await supervisor.stop();
    });

    it('should not double-DO a restart when a second crash for the same child arrives while the first restart is in flight', async () => {
      // Real collaborator: a supervisor whose restart() is genuinely slow,
      // so both handleChildCrash calls are actually concurrent (in flight
      // at the same time), not merely called twice sequentially.
      let restartCallCount = 0;
      class SlowRestartingSupervisor extends MockWorkflowSupervisor {
        async restart() {
          restartCallCount++;
          await new Promise(resolve => setTimeout(resolve, 50));
          this.started = true;
        }
      }

      const child = new SlowRestartingSupervisor({ id: 'child-1' });
      supervisor.addChild(child);
      await supervisor.start();

      const error = new Error('ECONNREFUSED');
      error.code = 'ECONNREFUSED';

      // Simulate a duplicate crash notification for the same child arriving
      // before the first restart has completed (e.g. a restart observed
      // twice on process restart).
      const [first, second] = await Promise.all([
        supervisor.handleChildCrash('child-1', error),
        supervisor.handleChildCrash('child-1', error)
      ]);

      const results = [first, second];
      const restarted = results.filter(r => r.action === 'restarted');
      const skipped = results.filter(r => r.action === 'unknown' && r.reason === 'restart_already_in_flight');

      // Exactly one actuation happened (real DO), the other is an honest
      // UNKNOWN (attempted-but-not-actuated), never a second false success.
      assert.equal(restartCallCount, 1);
      assert.equal(restarted.length, 1);
      assert.equal(skipped.length, 1);
      assert.equal(supervisor.getRestartCount('child-1'), 1);
    });
  });

  describe('system health', () => {
    it('should report system health', async () => {
      const child = new MockWorkflowSupervisor({ id: 'child-1' });
      supervisor.addChild(child);
      await supervisor.start();

      const health = supervisor.getSystemHealth();

      assert.property(health, 'id');
      assert.property(health, 'isRunning');
      assert.property(health, 'uptime');
      assert.property(health, 'totalRestarts');
      assert.property(health, 'totalCrashes');
      assert.property(health, 'childrenHealth');
    });
  });
});
