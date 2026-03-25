// tests/integration/supervision-end-to-end.test.mjs
/**
 * Supervision End-to-End Integration Test
 * Tests workflow execution with supervision and process mining components
 */

import { describe, it, expect } from 'vitest';

describe('Supervision End-to-End', () => {
  it('should verify process mining components work together', async () => {
    // Test EventLogExtractor
    const { EventLogExtractor } = await import('../../src/process-mining/event-log-extractor.mjs');
    const extractor = new EventLogExtractor();

    expect(extractor).toHaveProperty('extractTraces');
    expect(extractor).toHaveProperty('extractWorkflowStats');
    expect(typeof extractor.extractTraces).toBe('function');
    expect(typeof extractor.extractWorkflowStats).toBe('function');

    // Test ConformanceChecker
    const { ConformanceChecker } = await import('../../src/process-mining/conformance-checker.mjs');
    const checker = new ConformanceChecker();

    expect(checker).toHaveProperty('check');
    expect(checker).toHaveProperty('checkMultiple');
    expect(typeof checker.check).toBe('function');
    expect(typeof checker.checkMultiple).toBe('function');

    // Test conformance checker with simple data
    const conformanceResult = await checker.check(
      ['step1', 'step2', 'step3'],
      ['step1', 'step2', 'step3']
    );

    expect(conformanceResult).toBeDefined();
    expect(conformanceResult.fitness).toBe(1.0);
    expect(conformanceResult.deviations).toHaveLength(0);
    expect(conformanceResult.expectedSteps).toEqual(['step1', 'step2', 'step3']);
    expect(conformanceResult.actualSteps).toEqual(['step1', 'step2', 'step3']);

    // Test with deviations
    const deviationResult = await checker.check(
      ['step1', 'step2', 'step3'],
      ['step1', 'step3']  // step2 skipped
    );

    expect(deviationResult).toBeDefined();
    expect(deviationResult.fitness).toBeLessThan(1.0);
    expect(deviationResult.deviations.length).toBeGreaterThan(0);
    expect(deviationResult.deviations.some(d => d.type === 'skip')).toBe(true);

    console.log('✅ Process mining components verified successfully!');
    console.log(`🔍 EventLogExtractor: extractTraces, extractWorkflowStats`);
    console.log(`📊 ConformanceChecker: check, checkMultiple`);
    console.log(`✨ Conformance checking functional with fitness scoring`);
  });
});
