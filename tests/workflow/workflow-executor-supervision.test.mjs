// tests/workflow/workflow-executor-supervision.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { assert } from 'vitest';
import { WorkflowExecutor } from '../../src/workflow/workflow-executor.mjs';

describe('WorkflowExecutor with Supervision', () => {
  let executor;

  beforeEach(() => {
    executor = new WorkflowExecutor({
      graphDir: './test/fixtures/workflows',
      supervision: { enabled: true }
    });
  });

  it('should use StepSupervisor for step execution when enabled', async () => {
    // Mock the internal components to isolate supervision logic
    executor._initializeRDFComponents = async () => {
      executor.core = { store: await (await import('@unrdf/core')).createStore() };
    };

    executor._parseWorkflow = async () => ({
      id: 'test-workflow',
      steps: [
        { id: 'step1', type: 'test', config: {} },
        { id: 'step2', type: 'test', config: {} }
      ]
    });

    executor._createExecutionPlan = async (workflow) => workflow.steps;

    executor._initializeContext = async () => {};

    // Mock context manager to avoid initialization error
    executor.contextManager = {
      getOutputs: () => ({}),
      getContext: () => executor.contextManager,
      workflowId: 'test-workflow'
    };

    // Mock step runner to return successful results
    executor.runner = {
      executeStep: async (step) => ({ stepId: step.id, success: true })
    };

    const result = await executor.execute('test-workflow', {});

    assert.property(result, 'supervisionMetrics');
    assert.property(result.supervisionMetrics, 'restarts');
    assert.property(result.supervisionMetrics, 'failures');
  });

  it('should not use supervision when disabled', async () => {
    executor = new WorkflowExecutor({
      graphDir: './test/fixtures/workflows',
      supervision: { enabled: false }
    });

    executor._initializeRDFComponents = async () => {
      executor.core = { store: await (await import('@unrdf/core')).createStore() };
    };

    executor._parseWorkflow = async () => ({
      id: 'test-workflow',
      steps: [{ id: 'step1', type: 'test', config: {} }]
    });

    executor._createExecutionPlan = async (workflow) => workflow.steps;

    executor._initializeContext = async () => {};

    // Mock context manager to avoid initialization error
    executor.contextManager = {
      getOutputs: () => ({}),
      getContext: () => executor.contextManager,
      workflowId: 'test-workflow'
    };

    executor.runner = {
      executeStep: async (step) => ({ stepId: step.id, success: true })
    };

    const result = await executor.execute('test-workflow', {});

    // Should not have supervision metrics when disabled
    assert.notProperty(result, 'supervisionMetrics');
  });
});
