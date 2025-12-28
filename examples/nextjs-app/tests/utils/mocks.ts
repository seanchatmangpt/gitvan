/**
 * GitVan v4 Mock Implementations
 *
 * Comprehensive mocks for testing @unrdf/hooks components.
 */

import { vi } from 'vitest';
import type { Hook } from '@/lib/workflow-generator';
import type { JTBDJob, JTBDScenario, ExecutionResult } from '@/lib/jtbd-engine';

// ============================================================================
// Mock AI Engines
// ============================================================================

/**
 * Mock Ollama LLM Engine
 */
export class MockOllamaEngine {
  private baseUrl: string;
  private model: string;
  private isHealthy: boolean = true;
  private responses: Map<string, string> = new Map();

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'ministral-3b') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  setHealthy(healthy: boolean): void {
    this.isHealthy = healthy;
  }

  setResponse(key: string, response: string): void {
    this.responses.set(key, response);
  }

  async health(): Promise<boolean> {
    return this.isHealthy;
  }

  async getModelInfo(): Promise<{
    model: string;
    baseUrl: string;
    parameters: Record<string, unknown>;
  }> {
    return {
      model: this.model,
      baseUrl: this.baseUrl,
      parameters: { temperature: 0.7, topP: 0.9 },
    };
  }

  async generateCommitMessage(diff: string): Promise<string> {
    return this.responses.get('commitMessage') || `feat: auto-generated commit for ${diff.length} chars`;
  }

  async analyzeCodeQuality(code: string): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    return {
      score: 85,
      issues: ['Minor complexity issue'],
      suggestions: ['Consider refactoring'],
    };
  }

  async suggestOptimizations(code: string): Promise<string[]> {
    return ['Use memoization', 'Consider lazy loading'];
  }

  async explainChanges(commit: unknown): Promise<string> {
    return 'This commit introduces new functionality';
  }

  async recommendPatterns(events: unknown[]): Promise<string[]> {
    return ['enforce-pattern', 'quality-gate'];
  }

  async ask(question: string, context?: string): Promise<string> {
    return `Mock answer for: ${question}`;
  }

  async analyzeSecurityRisks(code: string): Promise<{
    risks: Array<{ type: string; severity: string; suggestion: string }>;
  }> {
    return { risks: [] };
  }

  async generateTestCases(code: string): Promise<string[]> {
    return ['it("should work correctly", () => { expect(true).toBe(true); })'];
  }

  async generateDocumentation(code: string, language?: string): Promise<string> {
    return `/** Mock documentation for ${language || 'TypeScript'} code */`;
  }
}

/**
 * Mock AI Assistant Engine (Anthropic)
 */
export class MockAIAssistantEngine {
  private isAvailable: boolean = true;

  setAvailable(available: boolean): void {
    this.isAvailable = available;
  }

  isReady(): boolean {
    return this.isAvailable;
  }

  async generateCommitMessage(diff: string): Promise<string> {
    return `feat: changes involving ${diff.split('\n').length} lines`;
  }

  async analyzeCodeQuality(code: string): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    return {
      score: 90,
      issues: [],
      suggestions: ['Add more tests'],
    };
  }

  async suggestOptimizations(code: string): Promise<string[]> {
    return ['Implement caching strategy'];
  }

  async explainChanges(commit: unknown): Promise<string> {
    return 'Comprehensive explanation of changes';
  }

  async recommendPatterns(events: unknown[]): Promise<string[]> {
    return ['auto-deploy', 'self-healing'];
  }

  async askAssistant(question: string, context?: string): Promise<string> {
    return `Expert answer for: ${question}`;
  }

  async analyzeSecurityRisks(code: string): Promise<{
    risks: Array<{ type: string; severity: string; suggestion: string }>;
  }> {
    return { risks: [] };
  }

  async generateTestCases(code: string): Promise<string[]> {
    return [
      'it("handles edge cases", () => { expect(true).toBe(true); })',
      'it("handles errors", () => { expect(true).toBe(true); })',
    ];
  }

  async generateDocumentation(code: string, language?: string): Promise<string> {
    return `/**\n * Professional documentation\n * @language ${language || 'TypeScript'}\n */`;
  }
}

// ============================================================================
// Mock Nunjucks Engine
// ============================================================================

/**
 * Mock Nunjucks Template Engine
 */
export class MockNunjucksEngine {
  private templates: Map<string, string> = new Map();

  registerTemplate(name: string, template: string): void {
    this.templates.set(name, template);
  }

  async renderString(template: string, variables: Record<string, unknown>): Promise<string> {
    let result = template;

    // Simple variable substitution
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    // Handle filters (simplified)
    result = result.replace(/\{\{\s*(\w+)\s*\|\s*upper\s*\}\}/g, (_, v) =>
      String(variables[v] || '').toUpperCase()
    );
    result = result.replace(/\{\{\s*(\w+)\s*\|\s*lower\s*\}\}/g, (_, v) =>
      String(variables[v] || '').toLowerCase()
    );
    result = result.replace(/\{\{\s*(\w+)\s*\|\s*slug\s*\}\}/g, (_, v) =>
      String(variables[v] || '')
        .toLowerCase()
        .replace(/\s+/g, '-')
    );

    // Handle now() function
    result = result.replace(/\{\{\s*now\(\)\s*\}\}/g, new Date().toISOString());

    // Handle uuid() function
    result = result.replace(
      /\{\{\s*uuid\(\)\s*\}\}/g,
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      })
    );

    return result;
  }

  async renderHookTemplate(
    templateName: string,
    variables: Record<string, unknown>
  ): Promise<string> {
    const template = this.templates.get(templateName) || '';
    return this.renderString(template, variables);
  }

  addFilter(name: string, fn: (...args: unknown[]) => unknown): void {
    // Mock implementation
  }

  addGlobal(name: string, value: unknown): void {
    // Mock implementation
  }
}

// ============================================================================
// Mock JTBD Engine
// ============================================================================

/**
 * Mock JTBD Engine
 */
export class MockJTBDEngine {
  private jobs: Map<string, JTBDJob> = new Map();
  private scenarios: Map<string, JTBDScenario> = new Map();
  private results: ExecutionResult[] = [];
  private executorFn?: (step: unknown) => Promise<boolean>;

  setExecutor(fn: (step: unknown) => Promise<boolean>): void {
    this.executorFn = fn;
  }

  registerJob(job: JTBDJob): void {
    this.jobs.set(job.id, job);
  }

  registerScenario(scenario: JTBDScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  getJobs(): JTBDJob[] {
    return Array.from(this.jobs.values());
  }

  getScenarios(): JTBDScenario[] {
    return Array.from(this.scenarios.values());
  }

  getScenariosForJob(jobId: string): JTBDScenario[] {
    return Array.from(this.scenarios.values()).filter((s) => s.jobs.includes(jobId));
  }

  async executeScenario(
    scenarioId: string,
    executor?: (step: unknown) => Promise<boolean>
  ): Promise<ExecutionResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    const startTime = new Date();
    let stepsCompleted = 0;
    const assertions: ExecutionResult['assertions'] = [];
    const exec = executor || this.executorFn || (async () => true);

    for (const step of scenario.steps) {
      try {
        const passed = await exec(step);
        assertions.push({
          step: step.order,
          assertion: step.assertion,
          passed,
        });
        if (passed) stepsCompleted++;
      } catch (err) {
        assertions.push({
          step: step.order,
          assertion: step.assertion,
          passed: false,
          error: String(err),
        });
      }
    }

    const endTime = new Date();
    const result: ExecutionResult = {
      scenarioId,
      status: stepsCompleted === scenario.steps.length ? 'passed' : 'failed',
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      stepsCompleted,
      stepsTotal: scenario.steps.length,
      assertions,
      metrics: {},
    };

    this.results.push(result);
    return result;
  }

  getResults(): ExecutionResult[] {
    return this.results;
  }

  getScenarioResults(scenarioId: string): ExecutionResult[] {
    return this.results.filter((r) => r.scenarioId === scenarioId);
  }

  calculateJobSuccessRate(jobId: string): number {
    const scenarios = this.getScenariosForJob(jobId);
    if (scenarios.length === 0) return 0;

    const results = scenarios.flatMap((s) => this.getScenarioResults(s.id));
    if (results.length === 0) return 0;

    const passed = results.filter((r) => r.status === 'passed').length;
    return (passed / results.length) * 100;
  }

  getSummaryReport(): {
    totalScenarios: number;
    totalResults: number;
    passed: number;
    failed: number;
    successRate: number;
  } {
    const totalResults = this.results.length;
    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;

    return {
      totalScenarios: this.scenarios.size,
      totalResults,
      passed,
      failed,
      successRate: totalResults > 0 ? (passed / totalResults) * 100 : 0,
    };
  }

  clear(): void {
    this.jobs.clear();
    this.scenarios.clear();
    this.results = [];
  }
}

// ============================================================================
// Mock Workflow Generator
// ============================================================================

/**
 * Mock Autonomic Workflow Generator
 */
export class MockWorkflowGenerator {
  private hooks: Hook[] = [];
  private shouldFail: boolean = false;

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async generateHooksFromPatterns(patterns: unknown[]): Promise<Hook[]> {
    if (this.shouldFail) throw new Error('Generation failed');

    return patterns.map((p: any, i) => ({
      name: `generated-hook-${i + 1}`,
      trigger: p.trigger || 'CommitEvent',
      condition: p.condition || 'always',
      action: p.action || 'echo "generated"',
      ttl: '@prefix gh: <test#> .',
      priority: p.priority || 5,
      autoExecute: true,
    }));
  }

  async detectRequiredAutomation(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      priority: number;
      effort: 'low' | 'medium' | 'high';
      expectedBenefit: string;
    }>
  > {
    return [
      {
        id: 'test-automation',
        name: 'Test Automation',
        description: 'Automated testing',
        priority: 8,
        effort: 'medium',
        expectedBenefit: 'Improved quality',
      },
    ];
  }

  async optimizeExistingHooks(hooks: Hook[]): Promise<Hook[]> {
    return hooks.map((h) => ({
      ...h,
      priority: Math.min(h.priority + 1, 10),
    }));
  }

  async createSelfHealingHooks(): Promise<Hook[]> {
    return [
      {
        name: 'self-heal-failures',
        trigger: 'FailureEvent',
        condition: 'any failure',
        action: 'analyze and recover',
        ttl: '@prefix gh: <test#> . gh:SelfHeal a gh:Hook .',
        priority: 10,
        autoExecute: true,
      },
    ];
  }

  async executeHook(hook: Hook): Promise<{ success: boolean; hookName: string; duration: number; message: string }> {
    if (this.shouldFail) {
      return {
        success: false,
        hookName: hook.name,
        duration: 0,
        message: 'Execution failed',
      };
    }

    return {
      success: true,
      hookName: hook.name,
      duration: Math.random() * 100,
      message: 'Executed successfully',
    };
  }

  async executeHookBatch(hooks: Hook[]): Promise<
    Array<{ success: boolean; hookName: string; duration: number; message: string }>
  > {
    return Promise.all(hooks.map((h) => this.executeHook(h)));
  }

  async recommendHooks(metrics: unknown): Promise<
    Array<{ hookType: string; reason: string; priority: number; estimatedBenefit: string }>
  > {
    return [
      {
        hookType: 'quality-gate',
        reason: 'Improve code quality',
        priority: 8,
        estimatedBenefit: 'Higher quality code',
      },
    ];
  }
}

// ============================================================================
// Mock GitVan Integration
// ============================================================================

/**
 * Mock GitVan Integration
 */
export class MockGitVanIntegration {
  private hooks: Map<string, string> = new Map();
  private scenarioResults: Map<string, unknown> = new Map();

  async executeHook(hookName: string, context: unknown): Promise<unknown> {
    return { executed: true, hookName, context };
  }

  async registerScenarioHook(scenarioId: string, definition: string): Promise<void> {
    this.hooks.set(scenarioId, definition);
  }

  async listHooks(): Promise<string[]> {
    return Array.from(this.hooks.keys());
  }

  async runWorkflow(workflowName: string, params: unknown): Promise<unknown> {
    return { workflow: workflowName, params, status: 'completed' };
  }

  async executeGitHook(hookType: string, data: unknown): Promise<boolean> {
    return true;
  }

  async getKnowledgeRegistry(): Promise<Record<string, unknown>> {
    return { hooks: Array.from(this.hooks.keys()) };
  }

  async storeScenarioResult(scenarioId: string, result: unknown): Promise<void> {
    this.scenarioResults.set(scenarioId, result);
  }

  async getScenarioLearning(scenarioId: string): Promise<unknown> {
    return this.scenarioResults.get(scenarioId) || null;
  }

  async triggerAutomation(triggerType: string, metadata: unknown): Promise<unknown> {
    return { triggered: true, type: triggerType, metadata };
  }

  async getAutomationStatus(): Promise<{ status: string }> {
    return { status: 'healthy' };
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }
}

// ============================================================================
// Mock HTTP/Fetch
// ============================================================================

/**
 * Create mock fetch function
 */
export function createMockFetch(responses: Map<string, unknown>): typeof fetch {
  return vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    const response = responses.get(url) || { error: 'Not found' };
    return {
      ok: !('error' in response),
      status: 'error' in response ? 404 : 200,
      json: async () => response,
      text: async () => JSON.stringify(response),
    };
  }) as unknown as typeof fetch;
}

// ============================================================================
// Mock Console
// ============================================================================

/**
 * Create mock console that captures output
 */
export function createMockConsole(): {
  mock: Console;
  logs: string[];
  errors: string[];
  warns: string[];
  clear: () => void;
} {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];

  const mock = {
    log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
    error: (...args: unknown[]) => errors.push(args.map(String).join(' ')),
    warn: (...args: unknown[]) => warns.push(args.map(String).join(' ')),
    info: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
    debug: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
  } as Console;

  return {
    mock,
    logs,
    errors,
    warns,
    clear: () => {
      logs.length = 0;
      errors.length = 0;
      warns.length = 0;
    },
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create all mocks at once
 */
export function createMocks(): {
  ollama: MockOllamaEngine;
  anthropic: MockAIAssistantEngine;
  nunjucks: MockNunjucksEngine;
  jtbd: MockJTBDEngine;
  workflow: MockWorkflowGenerator;
  gitvan: MockGitVanIntegration;
  console: ReturnType<typeof createMockConsole>;
} {
  return {
    ollama: new MockOllamaEngine(),
    anthropic: new MockAIAssistantEngine(),
    nunjucks: new MockNunjucksEngine(),
    jtbd: new MockJTBDEngine(),
    workflow: new MockWorkflowGenerator(),
    gitvan: new MockGitVanIntegration(),
    console: createMockConsole(),
  };
}

export default {
  MockOllamaEngine,
  MockAIAssistantEngine,
  MockNunjucksEngine,
  MockJTBDEngine,
  MockWorkflowGenerator,
  MockGitVanIntegration,
  createMockFetch,
  createMockConsole,
  createMocks,
};
