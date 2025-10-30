/**
 * Telemetry Testing Utilities
 * Helper functions for testing OpenTelemetry instrumentation
 */

import { getTelemetry } from '../index.mjs';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { trace, metrics } from '@opentelemetry/api';

/**
 * Create a test telemetry instance with in-memory exporters
 */
export async function createTestTelemetry(config = {}) {
  const telemetry = getTelemetry({
    exportToConsole: false,
    exportToOTLP: false,
    exportToFile: true,
    exportDir: './.telemetry/test',
    ...config
  });

  await telemetry.initialize();

  return telemetry;
}

/**
 * Reset telemetry state for testing
 */
export async function resetTelemetry() {
  const telemetry = getTelemetry();
  if (telemetry.initialized) {
    await telemetry.shutdown();
  }
  telemetry.spans = [];
  telemetry.metrics = [];
  telemetry.initialized = false;
}

/**
 * Get all recorded spans
 */
export function getRecordedSpans() {
  const telemetry = getTelemetry();
  return telemetry.spans || [];
}

/**
 * Get all recorded metrics
 */
export function getRecordedMetrics() {
  const telemetry = getTelemetry();
  return telemetry.metrics || [];
}

/**
 * Find spans by name
 */
export function findSpansByName(name) {
  const spans = getRecordedSpans();
  return spans.filter(span => span.name === name);
}

/**
 * Find spans by attribute
 */
export function findSpansByAttribute(key, value) {
  const spans = getRecordedSpans();
  return spans.filter(span => span.attributes && span.attributes[key] === value);
}

/**
 * Assert span exists with attributes
 */
export function assertSpanExists(name, attributes = {}) {
  const spans = findSpansByName(name);

  if (spans.length === 0) {
    throw new Error(`No span found with name: ${name}`);
  }

  const matchingSpans = spans.filter(span => {
    return Object.entries(attributes).every(([key, value]) => {
      return span.attributes && span.attributes[key] === value;
    });
  });

  if (matchingSpans.length === 0) {
    throw new Error(`No span found with name: ${name} and attributes: ${JSON.stringify(attributes)}`);
  }

  return matchingSpans[0];
}

/**
 * Wait for spans to be recorded
 */
export async function waitForSpans(count, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const spans = getRecordedSpans();
    if (spans.length >= count) {
      return spans;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Timeout waiting for ${count} spans. Got ${getRecordedSpans().length}`);
}

/**
 * Mock telemetry for testing
 */
export class MockTelemetry {
  constructor() {
    this.spans = [];
    this.metrics = [];
    this.initialized = true;
  }

  startSpan(name, attributes = {}) {
    const span = {
      name,
      attributes,
      startTime: Date.now(),
      endTime: null,
      status: null,
      end: () => {
        span.endTime = Date.now();
      },
      setAttribute: (key, value) => {
        span.attributes[key] = value;
      },
      setStatus: (status) => {
        span.status = status;
      }
    };

    this.spans.push(span);
    return span;
  }

  recordCommand(name, duration, success, attributes = {}) {
    this.metrics.push({
      type: 'command',
      name,
      duration,
      success,
      attributes,
      timestamp: Date.now()
    });
  }

  recordHook(name, duration, success, attributes = {}) {
    this.metrics.push({
      type: 'hook',
      name,
      duration,
      success,
      attributes,
      timestamp: Date.now()
    });
  }

  recordWorkflow(name, duration, success, attributes = {}) {
    this.metrics.push({
      type: 'workflow',
      name,
      duration,
      success,
      attributes,
      timestamp: Date.now()
    });
  }

  recordGitOperation(name, duration, success, attributes = {}) {
    this.metrics.push({
      type: 'git',
      name,
      duration,
      success,
      attributes,
      timestamp: Date.now()
    });
  }

  async shutdown() {
    // No-op for mock
  }
}

/**
 * Create telemetry test fixtures
 */
export function createTestFixtures() {
  return {
    commandSpan: {
      name: 'command.test',
      attributes: {
        'command.name': 'test',
        'command.success': true,
      }
    },
    hookSpan: {
      name: 'hook.test',
      attributes: {
        'hook.name': 'test',
        'hook.success': true,
      }
    },
    workflowSpan: {
      name: 'workflow.test',
      attributes: {
        'workflow.name': 'test',
        'workflow.success': true,
      }
    },
    gitSpan: {
      name: 'git.test',
      attributes: {
        'git.operation': 'test',
        'git.success': true,
      }
    }
  };
}

export default {
  createTestTelemetry,
  resetTelemetry,
  getRecordedSpans,
  getRecordedMetrics,
  findSpansByName,
  findSpansByAttribute,
  assertSpanExists,
  waitForSpans,
  MockTelemetry,
  createTestFixtures,
};
