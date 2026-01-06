/**
 * Mock Utilities for Testing
 * Provides mock implementations for common GitVan components
 */

import { vi } from "vitest";

/**
 * Create a mock Git composable
 */
export function createMockGit() {
  return {
    status: vi.fn(async () => ({
      branch: "main",
      staged: [],
      unstaged: [],
      untracked: [],
      clean: true,
    })),
    commit: vi.fn(async (message) => ({
      hash: "abc123",
      message,
      author: "Test User <test@example.com>",
    })),
    branch: vi.fn(async (name) => ({
      name,
      hash: "abc123",
    })),
    checkout: vi.fn(async (branch) => branch),
    merge: vi.fn(async (branch) => ({
      success: true,
      conflicts: false,
    })),
    push: vi.fn(async () => ({ success: true })),
    pull: vi.fn(async () => ({ success: true })),
    refs: vi.fn(async () => ({
      heads: ["main", "develop"],
      tags: ["v1.0.0"],
    })),
    notes: vi.fn(async () => ({})),
    worktree: vi.fn(async () => ({
      list: [],
      add: vi.fn(),
      remove: vi.fn(),
    })),
  };
}

/**
 * Create a mock Template composable
 */
export function createMockTemplate() {
  return {
    render: vi.fn(async (template, data) => {
      // Simple template rendering mock
      return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || "");
    }),
    compile: vi.fn((template) => template),
    addFilter: vi.fn(),
    getEnvironment: vi.fn(() => ({})),
  };
}

/**
 * Create a mock Job composable
 */
export function createMockJob() {
  return {
    scan: vi.fn(async () => ["job1", "job2"]),
    execute: vi.fn(async (jobId) => ({
      jobId,
      status: "completed",
      result: { success: true },
    })),
    schedule: vi.fn(async (jobId, schedule) => ({
      jobId,
      schedule,
      scheduled: true,
    })),
    list: vi.fn(async () => [
      { id: "job1", name: "Test Job 1" },
      { id: "job2", name: "Test Job 2" },
    ]),
  };
}

/**
 * Create a mock Event composable
 */
export function createMockEvent() {
  const handlers = new Map();

  return {
    emit: vi.fn(async (event, data) => {
      const eventHandlers = handlers.get(event) || [];
      for (const handler of eventHandlers) {
        await handler(data);
      }
    }),
    on: vi.fn((event, handler) => {
      if (!handlers.has(event)) {
        handlers.set(event, []);
      }
      handlers.get(event).push(handler);
    }),
    once: vi.fn((event, handler) => {
      const wrappedHandler = async (data) => {
        await handler(data);
        const eventHandlers = handlers.get(event) || [];
        const index = eventHandlers.indexOf(wrappedHandler);
        if (index > -1) {
          eventHandlers.splice(index, 1);
        }
      };
      if (!handlers.has(event)) {
        handlers.set(event, []);
      }
      handlers.get(event).push(wrappedHandler);
    }),
    off: vi.fn((event, handler) => {
      const eventHandlers = handlers.get(event) || [];
      const index = eventHandlers.indexOf(handler);
      if (index > -1) {
        eventHandlers.splice(index, 1);
      }
    }),
  };
}

/**
 * Create a mock FileSystem composable
 */
export function createMockFileSystem() {
  const files = new Map();

  return {
    read: vi.fn(async (path) => {
      if (!files.has(path)) {
        throw new Error(`File not found: ${path}`);
      }
      return files.get(path);
    }),
    write: vi.fn(async (path, content) => {
      files.set(path, content);
    }),
    delete: vi.fn(async (path) => {
      files.delete(path);
    }),
    exists: vi.fn(async (path) => files.has(path)),
    list: vi.fn(async (dir) => {
      return Array.from(files.keys()).filter((path) => path.startsWith(dir));
    }),
  };
}

/**
 * Create a mock Workflow Engine
 */
export function createMockWorkflowEngine() {
  return {
    execute: vi.fn(async (workflow) => ({
      workflowId: workflow.id,
      status: "completed",
      steps: [],
      result: { success: true },
    })),
    parse: vi.fn(async (content) => ({
      id: "workflow-1",
      steps: [],
    })),
    validate: vi.fn(async (workflow) => ({
      valid: true,
      errors: [],
    })),
  };
}

/**
 * Create a mock AI Provider
 */
export function createMockAIProvider(responses = []) {
  let callIndex = 0;

  return {
    generate: vi.fn(async (prompt) => {
      const response = responses[callIndex] || "Mock AI response";
      callIndex = (callIndex + 1) % (responses.length || 1);
      return {
        text: response,
        usage: { tokens: 100 },
      };
    }),
    generateStream: vi.fn(async function* (prompt) {
      const response = responses[callIndex] || "Mock AI response";
      callIndex = (callIndex + 1) % (responses.length || 1);

      // Yield chunks
      const chunks = response.split(" ");
      for (const chunk of chunks) {
        yield { text: chunk + " " };
      }
    }),
    embed: vi.fn(async (text) => ({
      embedding: new Array(1536).fill(0),
    })),
  };
}

/**
 * Create a spy on console methods
 * @param {Array<string>} methods - Methods to spy on
 */
export function spyConsole(methods = ["log", "error", "warn", "info"]) {
  const spies = {};

  for (const method of methods) {
    spies[method] = vi.spyOn(console, method).mockImplementation(() => {});
  }

  return {
    spies,
    restore: () => {
      for (const spy of Object.values(spies)) {
        spy.mockRestore();
      }
    },
    getCalls: (method) => spies[method]?.mock.calls || [],
    getCallCount: (method) => spies[method]?.mock.calls.length || 0,
  };
}

/**
 * Create a mock Clock for time-based testing
 */
export function createMockClock() {
  let currentTime = new Date("2024-01-01T00:00:00.000Z").getTime();

  return {
    now: () => currentTime,
    tick: (ms) => {
      currentTime += ms;
    },
    set: (date) => {
      currentTime = new Date(date).getTime();
    },
    reset: () => {
      currentTime = new Date("2024-01-01T00:00:00.000Z").getTime();
    },
  };
}

/**
 * Wait for condition to be true
 * @param {Function} condition - Condition function
 * @param {Object} options - Options
 */
export async function waitFor(condition, options = {}) {
  const timeout = options.timeout || 5000;
  const interval = options.interval || 100;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a deferred promise
 */
export function createDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}
