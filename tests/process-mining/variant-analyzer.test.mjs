// tests/process-mining/variant-analyzer.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { assert } from 'vitest';
import { VariantAnalyzer } from '../../src/process-mining/variant-analyzer.mjs';

describe('VariantAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new VariantAnalyzer();
  });

  describe('discover', () => {
    it('should discover process variants', async () => {
      const executions = [
        {
          caseId: 'case-1',
          activities: [
            { name: 'step1', timestamp: '2026-03-25T01:00:00Z' },
            { name: 'step2', timestamp: '2026-03-25T01:00:01Z' },
            { name: 'step3', timestamp: '2026-03-25T01:00:02Z' }
          ]
        },
        {
          caseId: 'case-2',
          activities: [
            { name: 'step1', timestamp: '2026-03-25T01:01:00Z' },
            { name: 'step3', timestamp: '2026-03-25T01:01:02Z' }
          ]
        }
      ];

      const variants = await analyzer.discover(executions);

      assert.lengthOf(variants, 2);
      assert.equal(variants[0].frequency, 1);
      assert.deepEqual(variants[0].path, ['step1', 'step2', 'step3']);
      assert.deepEqual(variants[1].path, ['step1', 'step3']);
    });

    it('should sort variants by frequency', async () => {
      const executions = [
        { caseId: 'case-1', activities: [{ name: 'step1' }, { name: 'step2' }] },
        { caseId: 'case-2', activities: [{ name: 'step1' }, { name: 'step2' }] },
        { caseId: 'case-3', activities: [{ name: 'step1' }] }
      ];

      const variants = await analyzer.discover(executions);

      assert.equal(variants[0].path.join('->'), 'step1->step2');
      assert.equal(variants[0].frequency, 2);
      assert.equal(variants[1].path.join('->'), 'step1');
      assert.equal(variants[1].frequency, 1);
    });

    it('should calculate percentage', async () => {
      const executions = [
        { caseId: 'case-1', activities: [{ name: 'step1' }, { name: 'step2' }] },
        { caseId: 'case-2', activities: [{ name: 'step1' }, { name: 'step2' }] },
        { caseId: 'case-3', activities: [{ name: 'step1' }] }
      ];

      const variants = await analyzer.discover(executions);

      assert.equal(variants[0].percentage, '66.7');
      assert.equal(variants[1].percentage, '33.3');
    });
  });

  describe('getVariantStatistics', () => {
    it('should calculate variant statistics', async () => {
      const executions = [
        { caseId: 'case-1', activities: [{ name: 'step1' }, { name: 'step2' }] },
        { caseId: 'case-2', activities: [{ name: 'step1' }, { name: 'step3' }] },
        { caseId: 'case-3', activities: [{ name: 'step1' }, { name: 'step2' }] }
      ];

      const stats = await analyzer.getVariantStatistics(executions);

      assert.equal(stats.totalVariants, 2);
      assert.property(stats, 'mostCommonVariant');
      assert.property(stats.mostCommonVariant, 'path');
      assert.equal(stats.mostCommonVariant.path.join('->'), 'step1->step2');
      assert.property(stats, 'entropy');
      assert.isAbove(stats.entropy, 0);
    });
  });
});
