// tests/process-mining/event-log-extractor.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { assert } from 'vitest';
import { EventLogExtractor } from '../../src/process-mining/event-log-extractor.mjs';

describe('EventLogExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new EventLogExtractor({
      cwd: '/tmp/test-repo'
    });
  });

  describe('extractTraces', () => {
    it('should extract event traces from Git log', async () => {
      // Mock git log output
      extractor.git.log = async () => ({
        stdout: `abc123|2026-03-25T01:00:00Z|[workflow-execution:wf-123] [step:validate] [resource:worker1]\ndef456|2026-03-25T01:00:05Z|[workflow-execution:wf-123] [step:process] [resource:worker2]`
      });

      const traces = await extractor.extractTraces({
        since: '2026-01-01',
        workflowId: 'wf-123'
      });

      assert.isArray(traces);
      assert.equal(traces.length, 1);
      assert.equal(traces[0].caseId, 'wf-123');
      assert.equal(traces[0].activities.length, 2);
      assert.equal(traces[0].activities[0].name, 'validate');
      assert.equal(traces[0].activities[0].timestamp, '2026-03-25T01:00:00.000Z');
      assert.equal(traces[0].activities[0].resource, 'worker1');
    });

    it('should filter by workflowId', async () => {
      extractor.git.log = async () => ({
        stdout: `abc123|2026-03-25T01:00:00Z|[workflow-execution:wf-123] [step:validate]\ndef456|2026-03-25T01:00:05Z|[workflow-execution:wf-456] [step:process]`
      });

      const traces = await extractor.extractTraces({
        workflowId: 'wf-123'
      });

      assert.equal(traces.length, 1);
      assert.equal(traces[0].caseId, 'wf-123');
    });

    it('should return empty array when no matches', async () => {
      extractor.git.log = async () => ({
        stdout: ''
      });

      const traces = await extractor.extractTraces();
      assert.equal(traces.length, 0);
    });
  });

  describe('extractWorkflowStats', () => {
    it('should calculate workflow statistics', async () => {
      extractor.git.log = async () => ({
        stdout: `abc123|2026-03-25T01:00:00Z|[workflow-execution:wf-123] [step:a]\ndef456|2026-03-25T01:00:05Z|[workflow-execution:wf-123] [step:b]\nghi789|2026-03-25T01:01:00Z|[workflow-execution:wf-456] [step:a]`
      });

      const stats = await extractor.extractWorkflowStats('wf-123');

      assert.equal(stats.workflowId, 'wf-123');
      assert.equal(stats.totalExecutions, 1);
      assert.equal(stats.avgStepsPerExecution, 2);
      assert.deepEqual(stats.uniqueActivities, ['a', 'b']);
    });
  });
});
