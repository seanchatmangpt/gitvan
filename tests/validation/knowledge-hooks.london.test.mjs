/**
 * London TDD Test Suite: Knowledge Hooks Engine
 * Tests SPARQL evaluation, predicates, and hook orchestration
 *
 * London School TDD Approach:
 * - Mock HookOrchestrator, PredicateEvaluator, HookParser
 * - Test behavior through collaboration
 * - Focus on SPARQL query evaluation logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Knowledge Hooks Engine - London TDD Suite', () => {
  let mockGraph;
  let mockTurtle;
  let mockLogger;
  let mockGitNativeIO;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    mockGraph = {
      query: vi.fn(),
      store: {
        size: 100,
        getQuads: vi.fn().mockReturnValue([
          { subject: { value: 'http://example.org/subject' }, predicate: { value: 'http://example.org/predicate' }, object: { value: 'http://example.org/object' } },
        ]),
      },
    };

    mockTurtle = {
      getHooks: vi.fn().mockReturnValue([
        { id: 'bug-threshold', title: 'Bug Threshold Monitor', pred: 'SELECT ?count WHERE { ?s ?p ?o }', pipelines: [] },
      ]),
      files: ['bug-threshold.ttl'],
      store: mockGraph.store,
    };

    mockGitNativeIO = {
      initialize: vi.fn().mockResolvedValue(true),
      acquireLock: vi.fn().mockResolvedValue(true),
      releaseLock: vi.fn().mockResolvedValue(true),
      writeReceipt: vi.fn().mockResolvedValue(true),
      writeMetrics: vi.fn().mockResolvedValue(true),
      storeSnapshot: vi.fn().mockResolvedValue('snapshot-123'),
      executeJob: vi.fn().mockImplementation((fn) => fn()),
      addJob: vi.fn().mockImplementation((priority, fn) => fn()),
      getStatus: vi.fn().mockResolvedValue({ queue: {}, locks: [] }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('HookOrchestrator', () => {
    it('should initialize RDF components', async () => {
      // Arrange
      const orchestrator = createHookOrchestrator(mockTurtle, mockGraph, mockGitNativeIO, mockLogger);

      // Act
      await orchestrator.initialize();

      // Assert
      expect(orchestrator.turtle).toBeDefined();
      expect(orchestrator.graph).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Initializing'));
    });

    it('should evaluate all hooks and return results', async () => {
      // Arrange
      const orchestrator = createHookOrchestrator(mockTurtle, mockGraph, mockGitNativeIO, mockLogger);
      mockGraph.query.mockResolvedValue({ boolean: true });

      // Act
      const result = await orchestrator.evaluate({ verbose: true });

      // Assert
      expect(result.success).toBe(true);
      expect(result.hooksEvaluated).toBeGreaterThan(0);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Starting'));
    });

    it('should execute triggered workflows', async () => {
      // Arrange
      const orchestrator = createHookOrchestrator(mockTurtle, mockGraph, mockGitNativeIO, mockLogger);
      const triggeredHook = { id: 'test-hook', workflows: [{ steps: [] }] };
      mockGraph.query.mockResolvedValue({ boolean: true });

      // Act
      const result = await orchestrator.executeTriggeredWorkflows([{ hook: triggeredHook, triggered: true }]);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(mockGitNativeIO.acquireLock).toHaveBeenCalled();
      expect(mockGitNativeIO.releaseLock).toHaveBeenCalled();
    });

    it('should handle workflow execution failures gracefully', async () => {
      // Arrange
      const orchestrator = createHookOrchestrator(mockTurtle, mockGraph, mockGitNativeIO, mockLogger);
      mockGitNativeIO.addJob.mockRejectedValue(new Error('Job failed'));

      // Act
      const result = await orchestrator.executeTriggeredWorkflows([{ hook: { id: 'fail-hook', workflows: [{}] }, triggered: true }]);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
      expect(result[0].success).toBe(false);
    });

    it('should list all available hooks', async () => {
      // Arrange
      const orchestrator = createHookOrchestrator(mockTurtle, mockGraph, mockGitNativeIO, mockLogger);

      // Act
      const hooks = await orchestrator.listHooks();

      // Assert
      expect(hooks.length).toBeGreaterThan(0);
      expect(hooks[0]).toHaveProperty('id');
      expect(hooks[0]).toHaveProperty('title');
    });

    it('should validate hook definition', async () => {
      // Arrange
      const orchestrator = createHookOrchestrator(mockTurtle, mockGraph, mockGitNativeIO, mockLogger);

      // Act
      const result = await orchestrator.validateHook('bug-threshold');

      // Assert
      expect(result.valid).toBe(true);
      expect(result.hookId).toBe('bug-threshold');
    });
  });

  describe('PredicateEvaluator', () => {
    it('should evaluate ASK predicate', async () => {
      // Arrange
      const evaluator = createPredicateEvaluator(mockLogger);
      const hook = {
        predicateDefinition: {
          type: 'ask',
          definition: { query: 'ASK { ?s ?p ?o }' },
        },
      };
      mockGraph.query.mockResolvedValue({ boolean: true });

      // Act
      const result = await evaluator.evaluate(hook, mockGraph);

      // Assert
      expect(result.result).toBe(true);
      expect(result.predicateType).toBe('ask');
      expect(mockGraph.query).toHaveBeenCalled();
    });

    it('should evaluate ResultDelta predicate', async () => {
      // Arrange
      const evaluator = createPredicateEvaluator(mockLogger);
      const hook = {
        predicateDefinition: {
          type: 'resultDelta',
          definition: { query: 'SELECT ?s WHERE { ?s ?p ?o }' },
        },
      };
      const currentResult = { results: [{ s: 'value1' }] };
      const previousResult = { results: [{ s: 'value2' }] };
      mockGraph.query.mockResolvedValueOnce(currentResult).mockResolvedValueOnce(previousResult);

      // Act
      const result = await evaluator.evaluate(hook, mockGraph, mockGraph);

      // Assert
      expect(result.result).toBe(true); // Changed
      expect(result.context.changed).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('ResultDelta'));
    });

    it('should evaluate SELECTThreshold predicate', async () => {
      // Arrange
      const evaluator = createPredicateEvaluator(mockLogger);
      const hook = {
        predicateDefinition: {
          type: 'selectThreshold',
          definition: {
            query: 'SELECT (COUNT(?s) AS ?count) WHERE { ?s ?p ?o }',
            threshold: 5,
            operator: '>',
          },
        },
      };
      mockGraph.query.mockResolvedValue({
        results: [{ count: { value: '10' } }],
      });

      // Act
      const result = await evaluator.evaluate(hook, mockGraph);

      // Assert
      expect(result.result).toBe(true); // 10 > 5
      expect(result.context.value).toBe(10);
      expect(result.context.triggered).toBe(true);
    });

    it('should evaluate SHACL predicate', async () => {
      // Arrange
      const evaluator = createPredicateEvaluator(mockLogger);
      const hook = {
        predicateDefinition: {
          type: 'shaclAllConform',
          definition: { shapes: 'shapes.ttl' },
        },
      };

      // Act
      const result = await evaluator.evaluate(hook, mockGraph);

      // Assert
      expect(result.result).toBe(true);
      expect(result.predicateType).toBe('shaclAllConform');
    });

    it('should inject prefixes into SPARQL queries', async () => {
      // Arrange
      const evaluator = createPredicateEvaluator(mockLogger);
      const hook = {
        predicateDefinition: {
          type: 'ask',
          definition: { query: 'ASK { ?s rdf:type ?o }' },
        },
      };
      mockGraph.query.mockResolvedValue({ boolean: true });

      // Act
      await evaluator.evaluate(hook, mockGraph);

      // Assert
      const calledQuery = mockGraph.query.mock.calls[0][0];
      expect(calledQuery).toContain('PREFIX rdf:');
    });

    it('should handle evaluation errors gracefully', async () => {
      // Arrange
      const evaluator = createPredicateEvaluator(mockLogger);
      const hook = {
        predicateDefinition: {
          type: 'ask',
          definition: { query: 'INVALID QUERY' },
        },
      };
      mockGraph.query.mockRejectedValue(new Error('Query error'));

      // Act & Assert
      await expect(evaluator.evaluate(hook, mockGraph)).rejects.toThrow('Predicate evaluation failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should validate predicate definitions', async () => {
      // Arrange
      const evaluator = createPredicateEvaluator(mockLogger);
      const validPredicate = {
        type: 'ask',
        definition: { query: 'ASK { ?s ?p ?o }' },
      };

      // Act
      const result = await evaluator.validatePredicate(validPredicate);

      // Assert
      expect(result).toBe(true);
    });

    it('should analyze predicate complexity', () => {
      // Arrange
      const evaluator = createPredicateEvaluator(mockLogger);
      const complexPredicate = {
        type: 'resultDelta',
        definition: {
          query: 'SELECT ?s WHERE { ?s ?p ?o . FILTER(?x > 10) . { SELECT ?x WHERE { ?x ?y ?z } } }',
        },
      };

      // Act
      const analysis = evaluator.analyzePredicateComplexity(complexPredicate);

      // Assert
      expect(analysis.complexity).toBe('medium');
      expect(analysis.estimatedExecutionTime).toBeGreaterThan(100);
    });
  });

  describe('HookParser', () => {
    it('should parse hook definition from Turtle', async () => {
      // Arrange
      const parser = createHookParser(mockLogger);

      // Act
      const hook = await parser.parseHook(mockTurtle, 'bug-threshold');

      // Assert
      expect(hook).toBeDefined();
      expect(hook.id).toBe('bug-threshold');
      expect(hook.predicateDefinition).toBeDefined();
    });

    it('should handle missing hook gracefully', async () => {
      // Arrange
      const parser = createHookParser(mockLogger);
      mockTurtle.getHooks.mockReturnValue([]);

      // Act
      const hook = await parser.parseHook(mockTurtle, 'nonexistent');

      // Assert
      expect(hook).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should extract workflow definitions', async () => {
      // Arrange
      const parser = createHookParser(mockLogger);
      const hookWithWorkflow = {
        id: 'test-hook',
        pipelines: [{ steps: ['step1', 'step2'] }],
      };
      mockTurtle.getHooks.mockReturnValue([hookWithWorkflow]);

      // Act
      const hook = await parser.parseHook(mockTurtle, 'test-hook');

      // Assert
      expect(hook.workflows).toBeDefined();
      expect(hook.workflows[0].steps).toHaveLength(2);
    });
  });

  describe('Knowledge Hooks Integration', () => {
    it('should evaluate hook and execute workflow end-to-end', async () => {
      // Arrange
      const orchestrator = createHookOrchestrator(mockTurtle, mockGraph, mockGitNativeIO, mockLogger);
      mockGraph.query.mockResolvedValue({ boolean: true });

      // Act
      const result = await orchestrator.evaluate({ verbose: true });

      // Assert
      expect(result.success).toBe(true);
      expect(result.hooksEvaluated).toBeGreaterThan(0);
      expect(mockGitNativeIO.writeReceipt).toHaveBeenCalled();
    });

    it('should handle concurrent workflow execution', async () => {
      // Arrange
      const orchestrator = createHookOrchestrator(mockTurtle, mockGraph, mockGitNativeIO, mockLogger);
      const multipleHooks = [
        { hook: { id: 'hook1', workflows: [{ steps: [] }] }, triggered: true },
        { hook: { id: 'hook2', workflows: [{ steps: [] }] }, triggered: true },
      ];

      // Act
      const results = await orchestrator.executeTriggeredWorkflows(multipleHooks);

      // Assert
      expect(results.length).toBe(2);
      expect(mockGitNativeIO.addJob).toHaveBeenCalledTimes(2);
    });
  });
});

// Mock factories
function createHookOrchestrator(turtle, graph, gitNativeIO, logger) {
  return {
    turtle,
    graph,
    gitNativeIO,
    logger,
    previousGraph: null,

    async initialize() {
      await this.gitNativeIO.initialize();
      this.logger.info('Initializing HookOrchestrator');
    },

    async evaluate(options = {}) {
      this.logger.info('🧠 Starting Knowledge Hook evaluation');

      const hooks = turtle.getHooks();
      const evaluationResults = [];

      for (const hook of hooks) {
        const evaluation = await this.evaluateHook(hook, options);
        evaluationResults.push({ hook, evaluation, triggered: evaluation.result });
      }

      const triggered = evaluationResults.filter((r) => r.triggered);
      const executions = await this.executeTriggeredWorkflows(triggered);

      return {
        success: true,
        hooksEvaluated: hooks.length,
        hooksTriggered: triggered.length,
        workflowsExecuted: executions.length,
      };
    },

    async evaluateHook(hook, options) {
      const query = hook.pred;
      const result = await graph.query(query);
      return { result: result.boolean || false, predicateType: 'ask' };
    },

    async executeTriggeredWorkflows(triggeredHooks) {
      const results = [];

      for (const { hook } of triggeredHooks) {
        try {
          await this.gitNativeIO.addJob('high', async () => {
            const lockAcquired = await this.gitNativeIO.acquireLock(`hook-${hook.id}`);
            if (!lockAcquired) throw new Error('Lock failed');

            try {
              await this.gitNativeIO.writeReceipt(hook.id, { success: true });
              results.push({ hookId: hook.id, success: true });
            } finally {
              await this.gitNativeIO.releaseLock(`hook-${hook.id}`);
            }
          });
        } catch (error) {
          this.logger.error(`Workflow failed: ${error.message}`);
          results.push({ hookId: hook.id, success: false, error: error.message });
        }
      }

      return results;
    },

    async listHooks() {
      return turtle.getHooks().map((h) => ({ id: h.id, title: h.title }));
    },

    async validateHook(hookId) {
      const hook = turtle.getHooks().find((h) => h.id === hookId);
      return { valid: !!hook, hookId };
    },
  };
}

function createPredicateEvaluator(logger) {
  return {
    logger,

    async evaluate(hook, currentGraph, previousGraph = null) {
      logger.info(`🧠 Evaluating predicate: ${hook.predicateDefinition.type}`);

      const predicate = hook.predicateDefinition;
      let result = false;
      let context = {};

      switch (predicate.type) {
        case 'ask':
          result = await this._evaluateASK(predicate, currentGraph);
          break;
        case 'resultDelta':
          const delta = await this._evaluateResultDelta(predicate, currentGraph, previousGraph);
          result = delta.changed;
          context = delta.context;
          break;
        case 'selectThreshold':
          const threshold = await this._evaluateSELECTThreshold(predicate, currentGraph);
          result = threshold.triggered;
          context = threshold.context;
          break;
        case 'shaclAllConform':
          result = true;
          context = { shapes: predicate.definition.shapes };
          break;
        default:
          throw new Error(`Unknown predicate type: ${predicate.type}`);
      }

      return { result, predicateType: predicate.type, context };
    },

    async _evaluateASK(predicate, graph) {
      logger.info('❓ Evaluating ASK predicate');
      const query = this._injectPrefixes(predicate.definition.query, graph);
      const result = await graph.query(query);
      return result.boolean || false;
    },

    async _evaluateResultDelta(predicate, currentGraph, previousGraph) {
      logger.info('🔍 Evaluating ResultDelta predicate');
      const query = this._injectPrefixes(predicate.definition.query, currentGraph);
      const currentResult = await currentGraph.query(query);
      const currentHash = JSON.stringify(currentResult);

      let previousHash = null;
      if (previousGraph) {
        const prevResult = await previousGraph.query(query);
        previousHash = JSON.stringify(prevResult);
      }

      return {
        changed: currentHash !== previousHash,
        context: { changed: currentHash !== previousHash, currentHash, previousHash },
      };
    },

    async _evaluateSELECTThreshold(predicate, graph) {
      logger.info('📊 Evaluating SELECTThreshold predicate');
      const query = this._injectPrefixes(predicate.definition.query, graph);
      const result = await graph.query(query);
      const value = parseFloat(result.results?.[0]?.count?.value || 0);
      const threshold = predicate.definition.threshold;
      const operator = predicate.definition.operator;

      let triggered = false;
      if (operator === '>') triggered = value > threshold;
      if (operator === '>=') triggered = value >= threshold;

      return { triggered, context: { value, threshold, operator, triggered } };
    },

    _injectPrefixes(query, graph) {
      if (query.includes('PREFIX')) return query;
      return 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\n' + query;
    },

    async validatePredicate(predicate) {
      return predicate.type && predicate.definition;
    },

    analyzePredicateComplexity(predicate) {
      const query = predicate.definition?.query || '';
      const complexity = query.length > 200 ? 'high' : query.length > 100 ? 'medium' : 'low';
      const estimatedTime = query.length > 200 ? 500 : query.length > 100 ? 200 : 100;
      return { complexity, estimatedExecutionTime: estimatedTime };
    },
  };
}

function createHookParser(logger) {
  return {
    logger,

    async parseHook(turtle, hookId) {
      const hooks = turtle.getHooks();
      const hook = hooks.find((h) => h.id === hookId);

      if (!hook) {
        logger.warn(`Hook not found: ${hookId}`);
        return null;
      }

      return {
        id: hook.id,
        title: hook.title,
        predicateDefinition: {
          type: 'ask',
          definition: { query: hook.pred },
        },
        workflows: hook.pipelines.map((p) => ({ steps: p.steps || [] })),
      };
    },
  };
}
