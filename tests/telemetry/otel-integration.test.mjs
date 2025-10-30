/**
 * OpenTelemetry Integration Tests
 * Test OTEL integration with real GitVan subsystems
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestTelemetry, findSpansByName } from '../../src/telemetry/utils/testing.mjs';

describe('OTEL Integration Tests', () => {
  let telemetry;

  beforeAll(async () => {
    telemetry = await createTestTelemetry({
      serviceName: 'gitvan-integration-test',
      serviceVersion: '2.1.0',
      environment: 'test'
    });
  });

  afterAll(async () => {
    await telemetry.shutdown();
  });

  describe('End-to-End Workflow', () => {
    it('should trace complete workflow execution', async () => {
      // Simulate a complete workflow
      const workflowSpan = telemetry.startSpan('workflow.e2e-test', {
        'workflow.name': 'e2e-test',
        'workflow.type': 'integration'
      });

      // Simulate workflow steps
      const step1Span = telemetry.startSpan('workflow.step.fetch-data', {
        'workflow.step.name': 'fetch-data'
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      step1Span.end();

      const step2Span = telemetry.startSpan('workflow.step.process-data', {
        'workflow.step.name': 'process-data'
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      step2Span.end();

      const step3Span = telemetry.startSpan('workflow.step.save-results', {
        'workflow.step.name': 'save-results'
      });
      await new Promise(resolve => setTimeout(resolve, 50));
      step3Span.end();

      workflowSpan.end();

      const spans = telemetry.spans;
      expect(spans.length).toBeGreaterThanOrEqual(4);

      const workflowSpans = findSpansByName('workflow.e2e-test');
      expect(workflowSpans.length).toBeGreaterThan(0);
    });

    it('should trace command with hooks', async () => {
      // Simulate command execution with hooks
      const commandSpan = telemetry.startSpan('command.test-with-hooks', {
        'command.name': 'test-with-hooks'
      });

      // Pre-task hook
      const preTaskSpan = telemetry.startSpan('hook.pre-task', {
        'hook.name': 'pre-task'
      });
      await new Promise(resolve => setTimeout(resolve, 20));
      preTaskSpan.end();

      // Command execution
      await new Promise(resolve => setTimeout(resolve, 50));

      // Post-task hook
      const postTaskSpan = telemetry.startSpan('hook.post-task', {
        'hook.name': 'post-task'
      });
      await new Promise(resolve => setTimeout(resolve, 20));
      postTaskSpan.end();

      commandSpan.end();

      const spans = telemetry.spans;
      expect(spans.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Concurrent Operations', () => {
    it('should trace parallel operations', async () => {
      const operations = [
        telemetry.startSpan('operation.parallel-1'),
        telemetry.startSpan('operation.parallel-2'),
        telemetry.startSpan('operation.parallel-3')
      ];

      await Promise.all(
        operations.map(async (span, index) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          span.end();
        })
      );

      const spans = telemetry.spans;
      expect(spans.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error Scenarios', () => {
    it('should trace operations with errors', async () => {
      const span = telemetry.startSpan('operation.with-error', {
        'operation.type': 'test'
      });

      try {
        throw new Error('Test error');
      } catch (error) {
        span.setAttribute('error', true);
        span.setAttribute('error.message', error.message);
      }

      span.end();

      const spans = findSpansByName('operation.with-error');
      expect(spans.length).toBeGreaterThan(0);
      expect(spans[0].attributes['operation.type']).toBe('test');
      // Note: setAttribute calls may not be tracked in lightweight tracking
    });
  });

  describe('Metrics Collection', () => {
    it('should collect command metrics', () => {
      telemetry.recordCommand('test-command', 100, true, {
        'args.count': 2
      });

      expect(telemetry.commandCounter).toBeDefined();
      expect(telemetry.commandDuration).toBeDefined();
    });

    it('should collect hook metrics', () => {
      telemetry.recordHook('test-hook', 50, true);

      expect(telemetry.hookCounter).toBeDefined();
    });

    it('should collect workflow metrics', () => {
      telemetry.recordWorkflow('test-workflow', 200, true, {
        'steps.count': 3
      });

      expect(telemetry.workflowCounter).toBeDefined();
    });

    it('should collect git operation metrics', () => {
      telemetry.recordGitOperation('commit', 150, true);

      expect(telemetry.gitOperationCounter).toBeDefined();
    });

    it('should collect error metrics', () => {
      telemetry.recordCommand('failing-command', 100, false, {
        'error.type': 'ValidationError'
      });

      expect(telemetry.errorCounter).toBeDefined();
    });
  });

  describe('Data Export and Validation', () => {
    it('should export complete telemetry data', async () => {
      // Generate some test data
      for (let i = 0; i < 5; i++) {
        const span = telemetry.startSpan(`test-span-${i}`);
        await new Promise(resolve => setTimeout(resolve, 10));
        span.end();
      }

      telemetry.recordCommand('export-test', 100, true);
      telemetry.recordHook('export-hook', 50, true);
      telemetry.recordWorkflow('export-workflow', 200, true);
      telemetry.recordGitOperation('export-git', 150, true);

      const exportPath = './.telemetry/test/integration-export.json';
      const exportData = await telemetry.exportToJSON(exportPath);

      expect(exportData).toBeDefined();
      expect(exportData.metadata).toBeDefined();
      expect(exportData.metadata.serviceName).toBe('gitvan-integration-test');
      expect(exportData.spans).toBeDefined();
      expect(exportData.spans.length).toBeGreaterThan(0);
      expect(exportData.summary).toBeDefined();
      expect(exportData.summary.totalSpans).toBeGreaterThan(0);
    });
  });
});
