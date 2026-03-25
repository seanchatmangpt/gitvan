// tests/process-mining/bottleneck-detector.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { assert } from 'vitest';
import { BottleneckDetector } from '../../src/process-mining/bottleneck-detector.mjs';

describe('BottleneckDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new BottleneckDetector();
  });

  describe('detect', () => {
    it('should identify slow steps', async () => {
      const executions = [
        {
          caseId: 'case-1',
          activities: [
            { name: 'step1', duration: 100 },
            { name: 'step2', duration: 5000 }, // slow
            { name: 'step3', duration: 200 }
          ]
        }
      ];

      const bottlenecks = await detector.detect(executions);

      assert.lengthOf(bottlenecks, 1);
      assert.equal(bottlenecks[0].step, 'step2');
      assert.equal(bottlenecks[0].status, 'warning');
    });

    it('should calculate p95 and p99 latencies', async () => {
      const executions = [
        {
          caseId: 'case-1',
          activities: [
            { name: 'slowStep', duration: 100 },
            { name: 'slowStep', duration: 2000 },
            { name: 'slowStep', duration: 3000 },
            { name: 'slowStep', duration: 5000 },
            { name: 'slowStep', duration: 7000 }
          ]
        }
      ];

      const bottlenecks = await detector.detect(executions);

      const bottleneck = bottlenecks.find(b => b.step === 'slowStep');
      assert.property(bottleneck, 'p95');
      assert.property(bottleneck, 'p99');
      assert.isAbove(bottleneck.p99, bottleneck.p95);
    });

    it('should classify critical bottlenecks', async () => {
      const executions = [
        {
          caseId: 'case-1',
          activities: [
            { name: 'criticalStep', duration: 10000 } // very slow
          ]
        }
      ];

      const bottlenecks = await detector.detect(executions);

      assert.equal(bottlenecks[0].status, 'critical');
    });

    it('should return empty array when no bottlenecks', async () => {
      const executions = [
        {
          caseId: 'case-1',
          activities: [
            { name: 'fastStep', duration: 100 },
            { name: 'fastStep', duration: 200 }
          ]
        }
      ];

      const bottlenecks = await detector.detect(executions);

      assert.lengthOf(bottlenecks, 0);
    });
  });
});
