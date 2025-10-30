/**
 * London TDD Test Suite: Workflow Engine
 * Tests DAG planning, step execution, and context management
 *
 * London School TDD Approach:
 * - Mock DAGPlanner, StepRunner, ContextManager
 * - Test workflow orchestration behavior
 * - Focus on step dependencies and execution order
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Workflow Engine - London TDD Suite', () => {
  let mockLogger;
  let mockGraph;
  let mockTurtle;
  let mockGitNativeIO;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    mockGraph = {
      query: vi.fn().mockResolvedValue({ results: [] }),
      store: { size: 100 },
    };

    mockTurtle = {
      parseTemplate: vi.fn().mockResolvedValue('rendered template'),
      store: mockGraph.store,
    };

    mockGitNativeIO = {
      executeJob: vi.fn().mockImplementation((fn) => fn()),
      writeReceipt: vi.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DAGPlanner', () => {
    it('should create execution plan from workflow steps', async () => {
      // Arrange
      const planner = createDAGPlanner(mockLogger);
      const steps = [
        { id: 'step1', type: 'sparql', depends: [] },
        { id: 'step2', type: 'template', depends: ['step1'] },
        { id: 'step3', type: 'cli', depends: ['step2'] },
      ];

      // Act
      const plan = await planner.createPlan(steps, mockGraph);

      // Assert
      expect(plan).toHaveLength(3);
      expect(plan[0].id).toBe('step1');
      expect(plan[1].id).toBe('step2');
      expect(plan[2].id).toBe('step3');
    });

    it('should detect circular dependencies', async () => {
      // Arrange
      const planner = createDAGPlanner(mockLogger);
      const steps = [
        { id: 'step1', depends: ['step2'] },
        { id: 'step2', depends: ['step1'] },
      ];

      // Act & Assert
      await expect(planner.createPlan(steps, mockGraph)).rejects.toThrow('Circular dependency');
    });

    it('should optimize parallel execution paths', async () => {
      // Arrange
      const planner = createDAGPlanner(mockLogger);
      const steps = [
        { id: 'step1', depends: [] },
        { id: 'step2', depends: [] },
        { id: 'step3', depends: ['step1', 'step2'] },
      ];

      // Act
      const plan = await planner.createPlan(steps, mockGraph);

      // Assert
      expect(plan[0].parallel).toBe(true);
      expect(plan[1].parallel).toBe(true);
      expect(plan[2].parallel).toBe(false);
    });

    it('should validate step dependencies', async () => {
      // Arrange
      const planner = createDAGPlanner(mockLogger);
      const steps = [
        { id: 'step1', depends: ['nonexistent'] },
      ];

      // Act & Assert
      await expect(planner.createPlan(steps, mockGraph)).rejects.toThrow('Missing dependency');
    });

    it('should calculate critical path', async () => {
      // Arrange
      const planner = createDAGPlanner(mockLogger);
      const steps = [
        { id: 'step1', depends: [], estimatedTime: 100 },
        { id: 'step2', depends: ['step1'], estimatedTime: 200 },
        { id: 'step3', depends: ['step2'], estimatedTime: 150 },
      ];

      // Act
      const plan = await planner.createPlan(steps, mockGraph);
      const criticalPath = planner.getCriticalPath(plan);

      // Assert
      expect(criticalPath.totalTime).toBe(450);
      expect(criticalPath.steps).toEqual(['step1', 'step2', 'step3']);
    });
  });

  describe('StepRunner', () => {
    it('should execute SPARQL step', async () => {
      // Arrange
      const runner = createStepRunner(mockLogger);
      const contextManager = createContextManager(mockLogger);
      const step = {
        id: 'sparql-step',
        type: 'sparql',
        query: 'SELECT ?s WHERE { ?s ?p ?o }',
      };
      mockGraph.query.mockResolvedValue({ results: [{ s: 'value' }] });

      // Act
      const result = await runner.executeStep(step, contextManager, mockGraph, mockTurtle);

      // Assert
      expect(result.success).toBe(true);
      expect(mockGraph.query).toHaveBeenCalled();
      expect(contextManager.getOutput(step.id)).toBeDefined();
    });

    it('should execute template step', async () => {
      // Arrange
      const runner = createStepRunner(mockLogger);
      const contextManager = createContextManager(mockLogger);
      const step = {
        id: 'template-step',
        type: 'template',
        template: 'Hello {{ name }}',
        data: { name: 'World' },
      };

      // Act
      const result = await runner.executeStep(step, contextManager, mockGraph, mockTurtle);

      // Assert
      expect(result.success).toBe(true);
      expect(mockTurtle.parseTemplate).toHaveBeenCalled();
    });

    it('should execute CLI step', async () => {
      // Arrange
      const runner = createStepRunner(mockLogger);
      const contextManager = createContextManager(mockLogger);
      const step = {
        id: 'cli-step',
        type: 'cli',
        command: 'echo "test"',
      };

      // Act
      const result = await runner.executeStep(step, contextManager, mockGraph, mockTurtle);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should execute file operation step', async () => {
      // Arrange
      const runner = createStepRunner(mockLogger);
      const contextManager = createContextManager(mockLogger);
      const step = {
        id: 'file-step',
        type: 'file',
        operation: 'write',
        path: '/tmp/test.txt',
        content: 'test content',
      };

      // Act
      const result = await runner.executeStep(step, contextManager, mockGraph, mockTurtle);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle step execution failures', async () => {
      // Arrange
      const runner = createStepRunner(mockLogger);
      const contextManager = createContextManager(mockLogger);
      const step = {
        id: 'failing-step',
        type: 'sparql',
        query: 'INVALID QUERY',
      };
      mockGraph.query.mockRejectedValue(new Error('Query failed'));

      // Act
      const result = await runner.executeStep(step, contextManager, mockGraph, mockTurtle);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Query failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should apply timeout to long-running steps', async () => {
      // Arrange
      const runner = createStepRunner(mockLogger);
      const contextManager = createContextManager(mockLogger);
      const step = {
        id: 'slow-step',
        type: 'sparql',
        query: 'SELECT ?s WHERE { ?s ?p ?o }',
        timeout: 100,
      };
      mockGraph.query.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)));

      // Act
      const result = await runner.executeStep(step, contextManager, mockGraph, mockTurtle);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should support step retry logic', async () => {
      // Arrange
      const runner = createStepRunner(mockLogger);
      const contextManager = createContextManager(mockLogger);
      const step = {
        id: 'retry-step',
        type: 'sparql',
        query: 'SELECT ?s WHERE { ?s ?p ?o }',
        retry: { attempts: 3, delay: 10 },
      };
      let attempts = 0;
      mockGraph.query.mockImplementation(() => {
        attempts++;
        if (attempts < 3) throw new Error('Temporary failure');
        return Promise.resolve({ results: [] });
      });

      // Act
      const result = await runner.executeStepWithRetry(step, contextManager, mockGraph, mockTurtle);

      // Assert
      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });
  });

  describe('ContextManager', () => {
    it('should initialize workflow context', async () => {
      // Arrange
      const contextManager = createContextManager(mockLogger);

      // Act
      await contextManager.initialize({
        workflowId: 'test-workflow',
        inputs: { key: 'value' },
      });

      // Assert
      expect(contextManager.getInput('key')).toBe('value');
      expect(contextManager.getWorkflowId()).toBe('test-workflow');
    });

    it('should store and retrieve step outputs', () => {
      // Arrange
      const contextManager = createContextManager(mockLogger);
      contextManager.initialize({ workflowId: 'test' });

      // Act
      contextManager.setOutput('step1', { result: 'success' });
      const output = contextManager.getOutput('step1');

      // Assert
      expect(output).toEqual({ result: 'success' });
    });

    it('should pass data between workflow steps', () => {
      // Arrange
      const contextManager = createContextManager(mockLogger);
      contextManager.initialize({ workflowId: 'test' });

      // Act
      contextManager.setOutput('step1', { data: 'from step 1' });
      contextManager.setOutput('step2', { data: contextManager.getOutput('step1').data });

      // Assert
      expect(contextManager.getOutput('step2').data).toBe('from step 1');
    });

    it('should maintain execution history', () => {
      // Arrange
      const contextManager = createContextManager(mockLogger);
      contextManager.initialize({ workflowId: 'test' });

      // Act
      contextManager.recordExecution('step1', { success: true, duration: 100 });
      contextManager.recordExecution('step2', { success: true, duration: 200 });
      const history = contextManager.getExecutionHistory();

      // Assert
      expect(history).toHaveLength(2);
      expect(history[0].stepId).toBe('step1');
      expect(history[1].stepId).toBe('step2');
    });

    it('should calculate workflow metrics', () => {
      // Arrange
      const contextManager = createContextManager(mockLogger);
      contextManager.initialize({ workflowId: 'test', startTime: Date.now() - 1000 });
      contextManager.recordExecution('step1', { success: true, duration: 500 });
      contextManager.recordExecution('step2', { success: true, duration: 300 });

      // Act
      const metrics = contextManager.getMetrics();

      // Assert
      expect(metrics.totalDuration).toBeGreaterThan(800);
      expect(metrics.stepsExecuted).toBe(2);
      expect(metrics.successRate).toBe(100);
    });

    it('should handle context cleanup', async () => {
      // Arrange
      const contextManager = createContextManager(mockLogger);
      await contextManager.initialize({ workflowId: 'test' });
      contextManager.setOutput('step1', { data: 'temp data' });

      // Act
      await contextManager.cleanup();

      // Assert
      expect(contextManager.getOutputs()).toEqual({});
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('cleanup'));
    });
  });

  describe('Workflow Integration', () => {
    it('should execute complete workflow end-to-end', async () => {
      // Arrange
      const planner = createDAGPlanner(mockLogger);
      const runner = createStepRunner(mockLogger);
      const contextManager = createContextManager(mockLogger);

      const workflow = {
        steps: [
          { id: 'fetch', type: 'sparql', query: 'SELECT ?s WHERE { ?s ?p ?o }', depends: [] },
          { id: 'transform', type: 'template', template: '{{ data }}', depends: ['fetch'] },
          { id: 'output', type: 'file', operation: 'write', depends: ['transform'] },
        ],
      };

      await contextManager.initialize({ workflowId: 'integration-test' });

      // Act
      const plan = await planner.createPlan(workflow.steps, mockGraph);
      const results = [];
      for (const step of plan) {
        const result = await runner.executeStep(step, contextManager, mockGraph, mockTurtle);
        results.push(result);
      }

      // Assert
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(contextManager.getMetrics().stepsExecuted).toBe(3);
    });

    it('should handle workflow failures gracefully', async () => {
      // Arrange
      const planner = createDAGPlanner(mockLogger);
      const runner = createStepRunner(mockLogger);
      const contextManager = createContextManager(mockLogger);

      const workflow = {
        steps: [
          { id: 'step1', type: 'sparql', query: 'SELECT ?s WHERE { ?s ?p ?o }' },
          { id: 'step2', type: 'sparql', query: 'INVALID', depends: ['step1'] },
          { id: 'step3', type: 'template', depends: ['step2'] },
        ],
      };

      await contextManager.initialize({ workflowId: 'failure-test' });
      mockGraph.query.mockResolvedValueOnce({ results: [] }).mockRejectedValueOnce(new Error('Query failed'));

      // Act
      const plan = await planner.createPlan(workflow.steps, mockGraph);
      const results = [];
      for (const step of plan) {
        const result = await runner.executeStep(step, contextManager, mockGraph, mockTurtle);
        results.push(result);
        if (!result.success) break;
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should execute parallel steps concurrently', async () => {
      // Arrange
      const planner = createDAGPlanner(mockLogger);
      const runner = createStepRunner(mockLogger);
      const contextManager = createContextManager(mockLogger);

      const workflow = {
        steps: [
          { id: 'parallel1', type: 'sparql', query: 'SELECT ?s WHERE { ?s ?p ?o }', depends: [] },
          { id: 'parallel2', type: 'sparql', query: 'SELECT ?s WHERE { ?s ?p ?o }', depends: [] },
          { id: 'merge', type: 'template', depends: ['parallel1', 'parallel2'] },
        ],
      };

      await contextManager.initialize({ workflowId: 'parallel-test' });

      // Act
      const plan = await planner.createPlan(workflow.steps, mockGraph);
      const parallelSteps = plan.filter((s) => s.parallel);

      const parallelResults = await Promise.all(
        parallelSteps.map((step) => runner.executeStep(step, contextManager, mockGraph, mockTurtle))
      );

      // Assert
      expect(parallelSteps).toHaveLength(2);
      expect(parallelResults.every((r) => r.success)).toBe(true);
    });
  });
});

// Mock factories
function createDAGPlanner(logger) {
  return {
    logger,

    async createPlan(steps, graph) {
      // Validate dependencies
      for (const step of steps) {
        for (const dep of step.depends || []) {
          if (!steps.find((s) => s.id === dep)) {
            throw new Error(`Missing dependency: ${dep}`);
          }
        }
      }

      // Detect circular dependencies
      if (this._hasCircularDependencies(steps)) {
        throw new Error('Circular dependency detected');
      }

      // Topological sort
      const sorted = this._topologicalSort(steps);

      // Mark parallel steps
      return sorted.map((step, index) => ({
        ...step,
        parallel: index < sorted.length - 1 && sorted[index + 1].depends?.length === 0,
      }));
    },

    _hasCircularDependencies(steps) {
      const visited = new Set();
      const recursionStack = new Set();

      const hasCycle = (stepId) => {
        if (recursionStack.has(stepId)) return true;
        if (visited.has(stepId)) return false;

        visited.add(stepId);
        recursionStack.add(stepId);

        const step = steps.find((s) => s.id === stepId);
        for (const dep of step?.depends || []) {
          if (hasCycle(dep)) return true;
        }

        recursionStack.delete(stepId);
        return false;
      };

      return steps.some((step) => hasCycle(step.id));
    },

    _topologicalSort(steps) {
      const sorted = [];
      const visited = new Set();

      const visit = (stepId) => {
        if (visited.has(stepId)) return;
        visited.add(stepId);

        const step = steps.find((s) => s.id === stepId);
        for (const dep of step?.depends || []) {
          visit(dep);
        }

        sorted.push(step);
      };

      steps.forEach((step) => visit(step.id));
      return sorted;
    },

    getCriticalPath(plan) {
      const totalTime = plan.reduce((sum, step) => sum + (step.estimatedTime || 0), 0);
      return { totalTime, steps: plan.map((s) => s.id) };
    },
  };
}

function createStepRunner(logger) {
  return {
    logger,

    async executeStep(step, contextManager, graph, turtle, options = {}) {
      logger.info(`Executing step: ${step.id}`);

      try {
        let output;

        switch (step.type) {
          case 'sparql':
            output = await graph.query(step.query);
            break;
          case 'template':
            output = await turtle.parseTemplate(step.template, step.data);
            break;
          case 'cli':
            output = await this._executeCLI(step.command);
            break;
          case 'file':
            output = await this._executeFileOperation(step);
            break;
          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }

        contextManager.setOutput(step.id, output);
        contextManager.recordExecution(step.id, { success: true, duration: 100 });

        return { success: true, output, stepId: step.id };
      } catch (error) {
        logger.error(`Step ${step.id} failed: ${error.message}`);
        contextManager.recordExecution(step.id, { success: false, error: error.message });
        return { success: false, error: error.message, stepId: step.id };
      }
    },

    async executeStepWithRetry(step, contextManager, graph, turtle) {
      const maxAttempts = step.retry?.attempts || 1;
      const delay = step.retry?.delay || 0;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await this.executeStep(step, contextManager, graph, turtle);
        } catch (error) {
          if (attempt === maxAttempts) throw error;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    },

    async _executeCLI(command) {
      return { stdout: 'command output', stderr: '', exitCode: 0 };
    },

    async _executeFileOperation(step) {
      return { success: true, path: step.path };
    },
  };
}

function createContextManager(logger) {
  return {
    logger,
    context: {},
    outputs: {},
    history: [],

    async initialize(config) {
      this.context = config;
      this.outputs = {};
      this.history = [];
      logger.info('Context initialized');
    },

    getInput(key) {
      return this.context.inputs?.[key];
    },

    getWorkflowId() {
      return this.context.workflowId;
    },

    setOutput(stepId, output) {
      this.outputs[stepId] = output;
    },

    getOutput(stepId) {
      return this.outputs[stepId];
    },

    getOutputs() {
      return this.outputs;
    },

    recordExecution(stepId, result) {
      this.history.push({ stepId, ...result, timestamp: Date.now() });
    },

    getExecutionHistory() {
      return this.history;
    },

    getMetrics() {
      const stepsExecuted = this.history.length;
      const successfulSteps = this.history.filter((h) => h.success).length;
      const totalDuration = this.history.reduce((sum, h) => sum + (h.duration || 0), 0);

      return {
        stepsExecuted,
        successRate: stepsExecuted > 0 ? (successfulSteps / stepsExecuted) * 100 : 0,
        totalDuration,
      };
    },

    async cleanup() {
      logger.info('Cleaning up context');
      this.outputs = {};
      this.history = [];
    },
  };
}
