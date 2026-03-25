// tests/supervision/heartbeat.test.mjs
import { describe, it, beforeEach, afterEach } from 'vitest';
import { assert } from 'vitest';
import { HeartbeatMonitor } from '../../src/supervision/heartbeat.mjs';

describe('HeartbeatMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new HeartbeatMonitor({
      interval: 100,  // Short for testing
      missedThreshold: 2  // Lower for faster testing
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('worker registration', () => {
    it('should register worker', () => {
      monitor.register('worker-1');
      assert.equal(monitor.workers.size, 1);
      assert.equal(monitor.workers.get('worker-1').missedCount, 0);
    });

    it('should unregister worker', () => {
      monitor.register('worker-1');
      monitor.unregister('worker-1');
      assert.equal(monitor.workers.size, 0);
    });
  });

  describe('heartbeat tracking', () => {
    it('should record heartbeat', async () => {
      monitor.register('worker-1');
      const before = monitor.workers.get('worker-1').lastSeen;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      monitor.recordHeartbeat('worker-1');
      const after = monitor.workers.get('worker-1').lastSeen;

      assert.isTrue(after > before);
      assert.equal(monitor.workers.get('worker-1').missedCount, 0);
    });

    it('should reset missed count on heartbeat', () => {
      monitor.register('worker-1');
      // Mark as missed
      monitor.workers.get('worker-1').missedCount = 2;

      monitor.recordHeartbeat('worker-1');
      assert.equal(monitor.workers.get('worker-1').missedCount, 0);
    });
  });

  describe('dead worker detection', () => {
    it('should detect dead workers', async () => {
      monitor.register('worker-1');

      // Wait for threshold to be exceeded
      await new Promise(resolve => setTimeout(resolve, 250));

      const deadWorkers = monitor.getDeadWorkers();
      assert.include(deadWorkers, 'worker-1');
    });

    it('should clear dead workers on heartbeat', async () => {
      monitor.register('worker-1');
      await new Promise(resolve => setTimeout(resolve, 250));

      monitor.recordHeartbeat('worker-1');
      const deadWorkers = monitor.getDeadWorkers();
      assert.notInclude(deadWorkers, 'worker-1');
    });

    it('should call callback on worker death', async () => {
      let deadWorkers = [];
      monitor.setWorkerDeathCallback((workers) => {
        deadWorkers = workers;
      });

      monitor.register('worker-1');
      monitor.start();

      await new Promise(resolve => setTimeout(resolve, 250));

      assert.include(deadWorkers, 'worker-1');
    });
  });

  describe('lifecycle', () => {
    it('should start monitoring', () => {
      monitor.start();
      assert.isTrue(monitor.checkInterval !== null);
    });

    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      assert.isTrue(monitor.checkInterval === null);
    });

    it('should not start if already started', () => {
      monitor.start();
      const firstInterval = monitor.checkInterval;
      monitor.start();
      assert.equal(monitor.checkInterval, firstInterval);
    });
  });
});
