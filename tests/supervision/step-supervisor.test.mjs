// tests/supervision/step-supervisor.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { assert } from 'vitest';
import { StepSupervisor } from '../../src/supervision/step-supervisor.mjs';

describe('StepSupervisor', () => {
  let supervisor;

  beforeEach(() => {
    supervisor = new StepSupervisor({
      id: 'test-step-supervisor',
      strategy: 'one_for_one',
      maxRestarts: 3
    });
  });

  describe('step execution', () => {
    it('should execute step successfully', async () => {
      const step = {
        id: 'step-1',
        type: 'test',
        handler: async () => ({ success: true })
      };

      const result = await supervisor.executeStep(step, {});
      assert.equal(result.success, true);
    });

    it('should pass context to handler', async () => {
      const step = {
        id: 'step-1',
        type: 'test',
        handler: async (step, context) => ({
          received: context.testValue
        })
      };

      const result = await supervisor.executeStep(step, { testValue: 42 });
      assert.equal(result.received, 42);
    });
  });

  describe('restart with backoff', () => {
    it('should restart failed step with transient error', async () => {
      let attempts = 0;
      const step = {
        id: 'step-1',
        type: 'test',
        handler: async () => {
          attempts++;
          if (attempts < 2) {
            const error = new Error('ECONNREFUSED');
            error.code = 'ECONNREFUSED';
            throw error;
          }
          return { success: true };
        }
      };

      const result = await supervisor.executeStep(step, {});
      assert.equal(result.success, true);
      assert.equal(attempts, 2);
    });

    it('should not restart permanent error', async () => {
      let attempts = 0;
      const step = {
        id: 'step-1',
        type: 'test',
        handler: async () => {
          attempts++;
          const error = new Error('ENOENT');
          error.code = 'ENOENT';
          throw error;
        }
      };

      try {
        await supervisor.executeStep(step, {});
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.equal(error.code, 'ENOENT');
        assert.equal(attempts, 1);
      }
    });

    it('should respect max restarts limit', async () => {
      let attempts = 0;
      const step = {
        id: 'step-1',
        type: 'test',
        handler: async () => {
          attempts++;
          const error = new Error('ECONNREFUSED');
          error.code = 'ECONNREFUSED';
          throw error;
        }
      };

      try {
        await supervisor.executeStep(step, {});
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.equal(attempts, 4); // 1 initial + 3 restarts
      }
    });
  });

  describe('metrics tracking', () => {
    it('should track execution metrics', async () => {
      const step = {
        id: 'step-1',
        type: 'test',
        handler: async () => ({ success: true })
      };

      await supervisor.executeStep(step, {});
      const metrics = supervisor.getMetrics('step-1');

      assert.property(metrics, 'executions');
      assert.property(metrics, 'failures');
      assert.property(metrics, 'avgDuration');
      assert.property(metrics, 'successRate');
      assert.equal(metrics.executions, 1);
      assert.equal(metrics.failures, 0);
      assert.equal(metrics.successRate, 1.0);
    });

    it('should track failures', async () => {
      const step = {
        id: 'step-1',
        type: 'test',
        handler: async () => {
          throw new Error('Test failure');
        }
      };

      try {
        await supervisor.executeStep(step, {});
      } catch (error) {
        // Expected
      }

      const metrics = supervisor.getMetrics('step-1');
      assert.equal(metrics.executions, 1);
      assert.equal(metrics.failures, 1);
      assert.equal(metrics.successRate, 0.0);
    });
  });
});
