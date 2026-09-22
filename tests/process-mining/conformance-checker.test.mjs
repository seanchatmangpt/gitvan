// tests/process-mining/conformance-checker.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { assert } from 'vitest';
import { ConformanceChecker } from '../../src/process-mining/conformance-checker.mjs';

describe('ConformanceChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new ConformanceChecker();
  });

  describe('check', () => {
    it('should calculate fitness score for perfect execution', async () => {
      const expected = ['step1', 'step2', 'step3'];
      const actual = ['step1', 'step2', 'step3'];

      const result = await checker.check(expected, actual);

      assert.equal(result.fitness, 1.0);
      assert.lengthOf(result.deviations, 0);
    });

    it('should detect skipped step', async () => {
      const expected = ['step1', 'step2', 'step3'];
      const actual = ['step1', 'step3']; // skipped step2

      const result = await checker.check(expected, actual);

      assert.isBelow(result.fitness, 1.0);
      assert.lengthOf(result.deviations, 2); // skip + reorder
      const skipDev = result.deviations.find(d => d.type === 'skip');
      assert.propertyVal(skipDev, 'step', 'step2');
    });

    it('should detect unauthorized step', async () => {
      const expected = ['step1', 'step2'];
      const actual = ['step1', 'step2', 'step3']; // step3 not in expected

      const result = await checker.check(expected, actual);

      assert.isBelow(result.fitness, 1.0);
      const unauthorizedDev = result.deviations.find(d => d.type === 'unauthorized');
      assert.propertyVal(unauthorizedDev, 'step', 'step3');
    });

    it('should detect reordering', async () => {
      const expected = ['step1', 'step2', 'step3'];
      const actual = ['step1', 'step3', 'step2'];

      const result = await checker.check(expected, actual);

      assert.isBelow(result.fitness, 1.0);
      const reorderDev = result.deviations.find(d => d.type === 'reorder');
      assert.property(reorderDev, 'expected');
      assert.property(reorderDev, 'actual');
    });
  });

  describe('checkMultiple', () => {
    it('should calculate average fitness across executions', async () => {
      const expected = ['step1', 'step2', 'step3'];
      const executions = [
        { caseId: 'case-1', activities: [{ name: 'step1' }, { name: 'step2' }, { name: 'step3' }] },
        { caseId: 'case-2', activities: [{ name: 'step1' }, { name: 'step3' }] }, // skipped step2
        { caseId: 'case-3', activities: [{ name: 'step1' }, { name: 'step2' }, { name: 'step3' }] }
      ];

      const result = await checker.checkMultiple(expected, executions);

      assert.property(result, 'averageFitness');
      assert.propertyVal(result, 'executions', 3);
      assert.isBelow(result.averageFitness, 1.0);
      assert.isAbove(result.averageFitness, 0.8); // 2/3 perfect, 1 with deviation
    });
  });
});
