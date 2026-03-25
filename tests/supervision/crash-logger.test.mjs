// tests/supervision/crash-logger.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { assert } from 'vitest';
import { CrashLogger } from '../../src/supervision/crash-logger.mjs';

describe('CrashLogger', () => {
  let logger;

  beforeEach(() => {
    logger = new CrashLogger({
      dryRun: true  // Don't actually write to Git during tests
    });
  });

  describe('crash logging', () => {
    it('should log crash with context', async () => {
      const crash = {
        processId: 'workflow-123',
        error: new Error('Test crash'),
        timestamp: new Date('2026-03-25T00:00:00Z'),
        context: { step: 'validation' }
      };

      const crashId = await logger.logCrash(crash);

      assert.isString(crashId);
      assert.match(crashId, /^crash-[a-f0-9]{12}$/);

      const logs = logger.getCrashLogs();
      assert.equal(logs.length, 1);
      assert.equal(logs[0].processId, 'workflow-123');
      assert.equal(logs[0].error.message, 'Test crash');
      assert.equal(logs[0].context.step, 'validation');
    });

    it('should include system info in crash log', async () => {
      const crash = {
        processId: 'test-process',
        error: new Error('System error')
      };

      await logger.logCrash(crash);
      const logs = logger.getCrashLogs();

      assert.property(logs[0], 'system');
      assert.property(logs[0].system, 'platform');
      assert.property(logs[0].system, 'arch');
      assert.property(logs[0].system, 'nodeVersion');
      assert.property(logs[0].system, 'memory');
      assert.property(logs[0].system, 'uptime');
    });

    it('should generate unique crash IDs', async () => {
      const crash1 = { processId: 'p1', error: new Error('e1') };
      const crash2 = { processId: 'p2', error: new Error('e2') };

      const id1 = await logger.logCrash(crash1);
      const id2 = await logger.logCrash(crash2);

      assert.notEqual(id1, id2);
    });
  });

  describe('memory log (dry run mode)', () => {
    it('should retrieve logs since timestamp', async () => {
      const date1 = new Date('2026-03-25T10:00:00Z');
      const date2 = new Date('2026-03-25T11:00:00Z');

      await logger.logCrash({
        processId: 'early',
        error: new Error('before'),
        timestamp: date1
      });

      await logger.logCrash({
        processId: 'late',
        error: new Error('after'),
        timestamp: date2
      });

      const logs = await logger.getCrashLogsSince(date2);
      assert.equal(logs.length, 1);
      assert.equal(logs[0].processId, 'late');
    });
  });

  describe('crash record structure', () => {
    it('should include all required fields', async () => {
      const error = new Error('Test error');
      error.code = 'ECONNREFUSED';

      const crash = {
        processId: 'workflow-456',
        processType: 'step',
        error,
        timestamp: new Date('2026-03-25T12:00:00Z'),
        context: { stepId: 'step-1', retryCount: 3 }
      };

      await logger.logCrash(crash);
      const logs = logger.getCrashLogs();
      const record = logs[0];

      assert.property(record, 'id');
      assert.property(record, 'processId');
      assert.property(record, 'processType');
      assert.property(record, 'error');
      assert.property(record.error, 'message');
      assert.property(record.error, 'stack');
      assert.property(record.error, 'code');
      assert.property(record.error, 'name');
      assert.property(record, 'timestamp');
      assert.property(record, 'context');
      assert.property(record, 'system');
    });
  });
});
