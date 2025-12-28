/**
 * GitVan v4 Test Utilities
 *
 * Comprehensive testing utilities for @unrdf/hooks system.
 * Provides mock factories, test helpers, and assertion utilities.
 */

import { vi, expect } from 'vitest';
import type { Hook, HookTemplate, Automation } from '@/lib/workflow-generator';
import type { JTBDJob, JTBDScenario, ExecutionResult } from '@/lib/jtbd-engine';
import type { GitEvent, AnalyticsResult, APIResponse } from '@/lib/schemas';

// ============================================================================
// Type Definitions
// ============================================================================

export interface MockHookContext {
  hookName: string;
  trigger: string;
  executionCount: number;
  lastExecution?: Date;
  state: Record<string, unknown>;
}

export interface TestState<T = unknown> {
  current: T;
  previous: T | null;
  history: T[];
  timestamp: Date;
}

export interface HookDependency {
  hookId: string;
  dependsOn: string[];
  dependedBy: string[];
  executionOrder: number;
}

// ============================================================================
// Hook Testing Utilities
// ============================================================================

/**
 * Create a test hook with default values
 */
export function createTestHook(overrides: Partial<Hook> = {}): Hook {
  return {
    name: 'test-hook',
    trigger: 'CommitEvent',
    condition: 'always',
    action: 'echo "test"',
    ttl: '@prefix gh: <http://example.org/git-hooks#> .\ngh:TestHook a gh:Hook .',
    priority: 5,
    autoExecute: true,
    ...overrides,
  };
}

/**
 * Create multiple test hooks
 */
export function createTestHooks(count: number, baseOverrides: Partial<Hook> = {}): Hook[] {
  return Array.from({ length: count }, (_, i) =>
    createTestHook({
      name: `test-hook-${i + 1}`,
      priority: Math.min(i + 1, 10),
      ...baseOverrides,
    })
  );
}

/**
 * Create a hook template for testing
 */
export function createTestHookTemplate(overrides: Partial<HookTemplate> = {}): HookTemplate {
  return {
    name: 'test-template',
    description: 'Test template description',
    template: (params: any) => `@prefix gh: <test#> . gh:${params.name || 'test'} a gh:Hook .`,
    conditions: ['name'],
    ...overrides,
  };
}

// ============================================================================
// JTBD Testing Utilities
// ============================================================================

/**
 * Create a test JTBD job
 */
export function createTestJTBDJob(overrides: Partial<JTBDJob> = {}): JTBDJob {
  return {
    id: 'test-job-1',
    title: 'Test JTBD Job',
    description: 'A test job for validation',
    jobType: 'functional',
    context: 'testing',
    outcomes: [
      {
        name: 'Test Outcome',
        description: 'Expected test outcome',
        priority: 'must-have',
      },
    ],
    metrics: [
      {
        metric: 'test-metric',
        baseline: 0,
        target: 100,
        unit: '%',
      },
    ],
    ...overrides,
  };
}

/**
 * Create a test JTBD scenario
 */
export function createTestJTBDScenario(overrides: Partial<JTBDScenario> = {}): JTBDScenario {
  return {
    id: 'test-scenario-1',
    name: 'Test Scenario',
    description: 'A test scenario for validation',
    jobs: ['test-job-1'],
    steps: [
      {
        order: 1,
        action: 'Test action',
        expectedOutcome: 'Expected result',
        assertion: 'expect(true).toBe(true)',
      },
    ],
    successCriteria: ['All steps pass'],
    estimatedDuration: 1000,
    ...overrides,
  };
}

/**
 * Create a test execution result
 */
export function createTestExecutionResult(
  overrides: Partial<ExecutionResult> = {}
): ExecutionResult {
  const now = new Date();
  return {
    scenarioId: 'test-scenario-1',
    status: 'passed',
    startTime: now,
    endTime: new Date(now.getTime() + 1000),
    duration: 1000,
    stepsCompleted: 1,
    stepsTotal: 1,
    assertions: [
      {
        step: 1,
        assertion: 'expect(true).toBe(true)',
        passed: true,
      },
    ],
    metrics: {},
    ...overrides,
  };
}

// ============================================================================
// Git Event Testing Utilities
// ============================================================================

/**
 * Create a test git commit event
 */
export function createTestCommitEvent(overrides: Partial<GitEvent> = {}): GitEvent {
  return {
    type: 'CommitEvent',
    hash: 'a'.repeat(40),
    author: 'test@example.com',
    message: 'feat: test commit',
    timestamp: new Date().toISOString(),
    files: ['src/test.ts'],
    additions: 10,
    deletions: 5,
    branch: 'main',
    ...overrides,
  } as GitEvent;
}

/**
 * Create a test git push event
 */
export function createTestPushEvent(overrides: Partial<GitEvent> = {}): GitEvent {
  return {
    type: 'PushEvent',
    timestamp: new Date().toISOString(),
    branch: 'main',
    commits: ['a'.repeat(40)],
    force: false,
    ...overrides,
  } as GitEvent;
}

// ============================================================================
// State Management Testing Utilities
// ============================================================================

/**
 * Create a test state container
 */
export function createTestState<T>(initialValue: T): TestState<T> {
  return {
    current: initialValue,
    previous: null,
    history: [initialValue],
    timestamp: new Date(),
  };
}

/**
 * Track state changes over time
 */
export class StateTracker<T> {
  private states: TestState<T>[] = [];
  private currentState: TestState<T>;

  constructor(initialValue: T) {
    this.currentState = createTestState(initialValue);
    this.states.push(this.currentState);
  }

  update(newValue: T): void {
    const newState: TestState<T> = {
      current: newValue,
      previous: this.currentState.current,
      history: [...this.currentState.history, newValue],
      timestamp: new Date(),
    };
    this.currentState = newState;
    this.states.push(newState);
  }

  getCurrent(): T {
    return this.currentState.current;
  }

  getPrevious(): T | null {
    return this.currentState.previous;
  }

  getHistory(): T[] {
    return this.currentState.history;
  }

  getStateCount(): number {
    return this.states.length;
  }

  reset(initialValue: T): void {
    this.currentState = createTestState(initialValue);
    this.states = [this.currentState];
  }
}

// ============================================================================
// Hook Execution Testing Utilities
// ============================================================================

/**
 * Mock hook executor for testing
 */
export class MockHookExecutor {
  private executionLog: Array<{ hook: Hook; timestamp: Date; result: boolean }> = [];
  private executionDelay: number = 0;
  private shouldFail: boolean = false;

  setDelay(ms: number): void {
    this.executionDelay = ms;
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async execute(hook: Hook): Promise<{ success: boolean; duration: number }> {
    const start = Date.now();

    if (this.executionDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.executionDelay));
    }

    const result = !this.shouldFail;
    this.executionLog.push({
      hook,
      timestamp: new Date(),
      result,
    });

    return {
      success: result,
      duration: Date.now() - start,
    };
  }

  getExecutionLog(): Array<{ hook: Hook; timestamp: Date; result: boolean }> {
    return this.executionLog;
  }

  getExecutionCount(): number {
    return this.executionLog.length;
  }

  clear(): void {
    this.executionLog = [];
  }
}

// ============================================================================
// Dependency Tracking Utilities
// ============================================================================

/**
 * Build hook dependency graph
 */
export function buildDependencyGraph(hooks: Hook[]): Map<string, HookDependency> {
  const graph = new Map<string, HookDependency>();

  hooks.forEach((hook, index) => {
    graph.set(hook.name, {
      hookId: hook.name,
      dependsOn: [],
      dependedBy: [],
      executionOrder: index,
    });
  });

  return graph;
}

/**
 * Validate dependency order
 */
export function validateDependencyOrder(
  graph: Map<string, HookDependency>,
  executionOrder: string[]
): boolean {
  const executedHooks = new Set<string>();

  for (const hookId of executionOrder) {
    const dependency = graph.get(hookId);
    if (!dependency) return false;

    // Check all dependencies are executed
    for (const dep of dependency.dependsOn) {
      if (!executedHooks.has(dep)) {
        return false;
      }
    }

    executedHooks.add(hookId);
  }

  return true;
}

// ============================================================================
// Performance Testing Utilities
// ============================================================================

/**
 * Measure execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T> | T
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Run performance benchmark
 */
export async function runBenchmark<T>(
  name: string,
  fn: () => Promise<T> | T,
  iterations: number = 100
): Promise<{
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
}> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureExecutionTime(fn);
    times.push(duration);
  }

  return {
    name,
    iterations,
    totalTime: times.reduce((a, b) => a + b, 0),
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
  };
}

// ============================================================================
// Memory Testing Utilities
// ============================================================================

/**
 * Get current memory usage
 */
export function getMemoryUsage(): {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
} {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss,
  };
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private snapshots: Array<{ timestamp: Date; usage: ReturnType<typeof getMemoryUsage> }> = [];
  private baseline: ReturnType<typeof getMemoryUsage> | null = null;

  start(): void {
    this.baseline = getMemoryUsage();
    this.snapshots = [];
  }

  snapshot(): void {
    this.snapshots.push({
      timestamp: new Date(),
      usage: getMemoryUsage(),
    });
  }

  getLeakIndicator(): number {
    if (!this.baseline || this.snapshots.length < 2) return 0;

    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    return lastSnapshot.usage.heapUsed - this.baseline.heapUsed;
  }

  hasLeak(thresholdBytes: number = 10 * 1024 * 1024): boolean {
    return this.getLeakIndicator() > thresholdBytes;
  }

  getReport(): {
    baseline: ReturnType<typeof getMemoryUsage> | null;
    snapshots: number;
    leakIndicator: number;
    hasLeak: boolean;
  } {
    return {
      baseline: this.baseline,
      snapshots: this.snapshots.length,
      leakIndicator: this.getLeakIndicator(),
      hasLeak: this.hasLeak(),
    };
  }
}

// ============================================================================
// API Testing Utilities
// ============================================================================

/**
 * Create a mock API response
 */
export function createMockAPIResponse<T>(
  success: boolean,
  data?: T,
  error?: string
): APIResponse {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create mock NextRequest
 */
export function createMockNextRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): {
  method: string;
  url: string;
  nextUrl: { searchParams: URLSearchParams };
  json: () => Promise<unknown>;
  headers: Map<string, string>;
} {
  const searchParams = new URLSearchParams(options.searchParams || {});

  return {
    method: options.method || 'GET',
    url,
    nextUrl: { searchParams },
    json: async () => options.body,
    headers: new Map(Object.entries(options.headers || {})),
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert hook is valid
 */
export function assertValidHook(hook: Hook): void {
  expect(hook).toBeDefined();
  expect(hook.name).toBeTruthy();
  expect(hook.trigger).toBeTruthy();
  expect(hook.ttl).toBeTruthy();
  expect(typeof hook.priority).toBe('number');
  expect(hook.priority).toBeGreaterThanOrEqual(1);
  expect(hook.priority).toBeLessThanOrEqual(10);
}

/**
 * Assert TTL is valid
 */
export function assertValidTTL(ttl: string): void {
  expect(ttl).toBeTruthy();
  expect(ttl).toContain('@prefix');
  expect(ttl).toContain('gh:');
}

/**
 * Assert execution result is valid
 */
export function assertValidExecutionResult(result: ExecutionResult): void {
  expect(result).toBeDefined();
  expect(result.scenarioId).toBeTruthy();
  expect(['passed', 'failed', 'skipped']).toContain(result.status);
  expect(result.duration).toBeGreaterThanOrEqual(0);
  expect(result.stepsCompleted).toBeLessThanOrEqual(result.stepsTotal);
}

// ============================================================================
// Wait Utilities
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('waitFor timeout exceeded');
}

/**
 * Wait for specified milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Create cleanup tracker
 */
export function createCleanupTracker(): {
  add: (cleanup: () => void | Promise<void>) => void;
  runAll: () => Promise<void>;
} {
  const cleanups: Array<() => void | Promise<void>> = [];

  return {
    add: (cleanup) => cleanups.push(cleanup),
    runAll: async () => {
      for (const cleanup of cleanups.reverse()) {
        await cleanup();
      }
      cleanups.length = 0;
    },
  };
}

export default {
  createTestHook,
  createTestHooks,
  createTestHookTemplate,
  createTestJTBDJob,
  createTestJTBDScenario,
  createTestExecutionResult,
  createTestCommitEvent,
  createTestPushEvent,
  createTestState,
  StateTracker,
  MockHookExecutor,
  buildDependencyGraph,
  validateDependencyOrder,
  measureExecutionTime,
  runBenchmark,
  getMemoryUsage,
  MemoryTracker,
  createMockAPIResponse,
  createMockNextRequest,
  assertValidHook,
  assertValidTTL,
  assertValidExecutionResult,
  waitFor,
  wait,
  createCleanupTracker,
};
