/**
 * @fileoverview Comprehensive tests for Git Lifecycle Phase 2 components
 * Tests async processing, event correlation, dashboard aggregation, and visualization
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventQueue } from '../src/git-lifecycle/EventQueue.mjs';
import { AsyncEventProcessor } from '../src/git-lifecycle/AsyncEventProcessor.mjs';
import { EventCorrelator } from '../src/git-lifecycle/EventCorrelator.mjs';
import { DashboardAggregator } from '../src/git-lifecycle/DashboardAggregator.mjs';
import { VisualizationData } from '../src/git-lifecycle/VisualizationData.mjs';

/**
 * Create mock RDF engine for testing
 * @returns {Object} Mock RDF engine
 */
function createMockRdfEngine() {
  return {
    query: async (sparql) => {
      // Return mock data based on query
      if (sparql.includes('COUNT(DISTINCT ?commit)')) {
        return [{
          totalCommits: { value: '150' },
          totalPushes: { value: '45' },
          totalMerges: { value: '20' },
          totalBranches: { value: '8' },
          activeAuthors: { value: '5' }
        }];
      }

      if (sparql.includes('GROUP BY ?eventType')) {
        return [
          { eventType: { value: 'commit' }, count: { value: '150' } },
          { eventType: { value: 'push' }, count: { value: '45' } },
          { eventType: { value: 'merge' }, count: { value: '20' } }
        ];
      }

      if (sparql.includes('GROUP BY ?branch')) {
        return [
          { branch: { value: 'main' }, activity: { value: '100' } },
          { branch: { value: 'develop' }, activity: { value: '50' } },
          { branch: { value: 'feature/new' }, activity: { value: '30' } }
        ];
      }

      if (sparql.includes('GROUP BY ?authorEmail')) {
        return [
          { authorEmail: { value: 'alice@example.com' }, commits: { value: '80' } },
          { authorEmail: { value: 'bob@example.com' }, commits: { value: '50' } },
          { authorEmail: { value: 'charlie@example.com' }, commits: { value: '20' } }
        ];
      }

      if (sparql.includes('MIN(?timestamp)')) {
        const now = Date.now();
        return [{
          firstCommit: { value: String(now - 30 * 86400000) },
          lastCommit: { value: String(now) },
          totalCommits: { value: '150' },
          avgSize: { value: '150.5' }
        }];
      }

      if (sparql.includes('totalMerges')) {
        return [{
          totalMerges: { value: '20' },
          successfulMerges: { value: '18' }
        }];
      }

      if (sparql.includes('?hour')) {
        const now = Date.now();
        return Array.from({ length: 24 }, (_, i) => ({
          hour: { value: String(now - (23 - i) * 3600000) },
          count: { value: String(Math.floor(Math.random() * 10)) }
        }));
      }

      if (sparql.includes('currentCount')) {
        return [{
          currentCount: { value: '25' },
          previousCount: { value: '20' }
        }];
      }

      return [];
    }
  };
}

/**
 * Create mock substrate core for testing
 * @returns {Object} Mock substrate core
 */
function createMockSubstrateCore() {
  return {
    executeInTransaction: async (callback) => {
      return await callback();
    }
  };
}

describe('EventQueue', () => {
  /** @type {EventQueue} */
  let queue;

  beforeEach(() => {
    queue = new EventQueue({
      maxConcurrency: 3,
      defaultPriority: 5,
      maxRetries: 3,
      retryDelayMs: 100,
      enableBatching: true
    });
  });

  afterEach(() => {
    queue.stop();
  });

  it('should enqueue events', () => {
    const eventId = queue.enqueue('commit', { sha: 'abc123' });

    assert.ok(eventId, 'Event ID should be returned');
    assert.match(eventId, /^commit-/, 'Event ID should have correct prefix');

    const status = queue.getStatus();
    assert.equal(status.total, 1, 'Queue should have 1 event');
  });

  it('should prioritize events', () => {
    queue.enqueue('commit', { sha: 'low' }, { priority: 3 });
    queue.enqueue('commit', { sha: 'high' }, { priority: 8 });
    queue.enqueue('commit', { sha: 'medium' }, { priority: 5 });

    const nextEvent = queue._getNextEvent();
    assert.equal(nextEvent?.data.sha, 'high', 'Should return highest priority event');
  });

  it('should batch events by type', (t, done) => {
    queue.on('batch:ready', (batch) => {
      assert.ok(batch.events.length > 0, 'Batch should have events');
      assert.ok(batch.size > 0, 'Batch size should be positive');
      done();
    });

    // Enqueue multiple events of same type
    for (let i = 0; i < 5; i++) {
      queue.enqueue('commit', { sha: `abc${i}` });
    }

    // Trigger batch processing
    queue._processBatch('commit');
  });

  it('should handle event completion', () => {
    const eventId = queue.enqueue('commit', { sha: 'abc123' });
    queue.complete(eventId, { success: true });

    const status = queue.getStatus();
    assert.equal(status.total, 0, 'Completed event should be removed');
    assert.equal(status.metrics.processed, 1, 'Processed count should increment');
  });

  it('should handle event failure with retry', () => {
    const eventId = queue.enqueue('commit', { sha: 'abc123' }, { maxRetries: 2 });
    const error = new Error('Processing failed');

    const willRetry = queue.fail(eventId, error);
    assert.equal(willRetry, true, 'Should schedule retry');

    const event = queue.events.get(eventId);
    assert.equal(event?.retryCount, 1, 'Retry count should increment');
  });

  it('should stop retrying after max retries', () => {
    const eventId = queue.enqueue('commit', { sha: 'abc123' }, { maxRetries: 1 });
    const error = new Error('Processing failed');

    queue.fail(eventId, error);
    const willRetry = queue.fail(eventId, error);

    assert.equal(willRetry, false, 'Should not retry after max retries');
    assert.equal(queue.events.has(eventId), false, 'Failed event should be removed');
  });

  it('should track metrics', () => {
    queue.enqueue('commit', { sha: '1' });
    queue.enqueue('push', { sha: '2' });
    queue.complete('commit-1', {});

    const status = queue.getStatus();
    assert.equal(status.metrics.enqueued, 2, 'Should track enqueued events');
    assert.equal(status.metrics.processed, 1, 'Should track processed events');
  });
});

describe('AsyncEventProcessor', () => {
  /** @type {AsyncEventProcessor} */
  let processor;

  beforeEach(() => {
    processor = new AsyncEventProcessor({
      queueConfig: { maxConcurrency: 3 },
      processingTimeoutMs: 5000,
      enableMetrics: true
    });
  });

  afterEach(() => {
    processor.stop();
  });

  it('should register processors', () => {
    const commitProcessor = async (event) => ({ processed: true });
    processor.registerProcessor('commit', commitProcessor);

    assert.ok(processor.processors.has('commit'), 'Processor should be registered');
  });

  it('should process events with registered processor', async () => {
    let processed = false;

    processor.registerProcessor('commit', async (event) => {
      processed = true;
      return { success: true };
    });

    const eventId = processor.enqueue('commit', { sha: 'abc123' });
    processor.start();

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 200));

    assert.equal(processed, true, 'Event should be processed');
  });

  it('should handle processing errors with retry', async () => {
    let attemptCount = 0;

    processor.registerProcessor('commit', async (event) => {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error('Processing failed');
      }
      return { success: true };
    });

    processor.enqueue('commit', { sha: 'abc123' });
    processor.start();

    // Wait for retry
    await new Promise(resolve => setTimeout(resolve, 500));

    assert.ok(attemptCount >= 2, 'Should retry after failure');
  });

  it('should enforce processing timeout', async () => {
    processor.config.processingTimeoutMs = 100;

    processor.registerProcessor('commit', async (event) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true };
    });

    let errorOccurred = false;
    processor.on('event:failed', () => {
      errorOccurred = true;
    });

    processor.enqueue('commit', { sha: 'abc123' });
    processor.start();

    await new Promise(resolve => setTimeout(resolve, 300));

    assert.equal(errorOccurred, true, 'Should timeout long-running processor');
  });

  it('should collect processing metrics', async () => {
    processor.registerProcessor('commit', async (event) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { success: true };
    });

    processor.enqueue('commit', { sha: '1' });
    processor.enqueue('commit', { sha: '2' });
    processor.start();

    await new Promise(resolve => setTimeout(resolve, 300));

    const metrics = processor.getMetrics();
    assert.ok(metrics.totalProcessed > 0, 'Should track processed events');
    assert.ok(metrics.averageProcessingTime > 0, 'Should track processing time');
  });

  it('should process batch of events', async () => {
    let batchProcessed = false;

    processor.registerProcessor('commit', async (event) => {
      return { processed: true };
    });

    processor.queue.on('batch:ready', () => {
      batchProcessed = true;
    });

    for (let i = 0; i < 5; i++) {
      processor.enqueue('commit', { sha: `abc${i}` });
    }

    processor.start();

    await new Promise(resolve => setTimeout(resolve, 200));

    assert.ok(batchProcessed, 'Should emit batch ready event');
  });
});

describe('EventCorrelator', () => {
  /** @type {EventCorrelator} */
  let correlator;
  /** @type {Object} */
  let mockRdfEngine;

  beforeEach(() => {
    mockRdfEngine = createMockRdfEngine();
    correlator = new EventCorrelator({
      rdfEngine: mockRdfEngine,
      defaultTimeWindow: 300000
    });
  });

  it('should register correlation patterns', () => {
    const pattern = {
      id: 'test-pattern',
      name: 'Test Pattern',
      eventTypes: ['commit', 'push'],
      maxTimeWindowMs: 300000,
      minConfidence: 0.8,
      matcher: (events) => ({ confidence: 1.0 })
    };

    correlator.registerPattern(pattern);
    assert.ok(correlator.patterns.has('test-pattern'), 'Pattern should be registered');
  });

  it('should correlate commit-push pattern', async () => {
    const now = Date.now();
    const events = [
      { type: 'commit', timestamp: now, data: { branch: 'main', sha: 'abc' } },
      { type: 'push', timestamp: now + 60000, data: { branch: 'main', commitSha: 'abc' } }
    ];

    const results = await correlator.correlate(events, { patternIds: ['commit-push'] });

    assert.ok(results.length > 0, 'Should find correlations');
    assert.equal(results[0].patternId, 'commit-push', 'Should match commit-push pattern');
  });

  it('should correlate feature development lifecycle', async () => {
    const now = Date.now();
    const events = [
      { type: 'branch-create', timestamp: now, data: { name: 'feature/new' } },
      { type: 'commit', timestamp: now + 60000, data: { branch: 'feature/new' } },
      { type: 'commit', timestamp: now + 120000, data: { branch: 'feature/new' } },
      { type: 'push', timestamp: now + 130000, data: { branch: 'feature/new' } },
      { type: 'pr-create', timestamp: now + 180000, data: { sourceBranch: 'feature/new', number: 1 } },
      { type: 'pr-merge', timestamp: now + 240000, data: { prNumber: 1 } }
    ];

    const results = await correlator.correlate(events, { patternIds: ['feature-development'] });

    assert.ok(results.length > 0, 'Should find feature development pattern');
  });

  it('should detect hotfix pattern', async () => {
    const now = Date.now();
    const events = [
      { type: 'branch-create', timestamp: now, data: { name: 'hotfix/critical-bug' } },
      { type: 'commit', timestamp: now + 300000, data: { branch: 'hotfix/critical-bug' } },
      { type: 'push', timestamp: now + 600000, data: { branch: 'hotfix/critical-bug' } },
      { type: 'merge', timestamp: now + 900000, data: { sourceBranch: 'hotfix/critical-bug' } }
    ];

    const results = await correlator.correlate(events, { patternIds: ['hotfix'] });

    assert.ok(results.length > 0, 'Should detect hotfix pattern');
    assert.equal(results[0].patternName, 'Hotfix Workflow', 'Should identify as hotfix');
  });

  it('should find related events', async () => {
    const results = await correlator.findRelatedEvents('event-123', {
      maxDepth: 2,
      relationshipTypes: ['triggers', 'precedes']
    });

    assert.ok(Array.isArray(results), 'Should return array of related events');
  });

  it('should analyze author patterns', async () => {
    const patterns = await correlator.findAuthorPatterns('alice@example.com');

    assert.ok(patterns.commitFrequency, 'Should analyze commit frequency');
    assert.ok(patterns.preferredBranches, 'Should identify preferred branches');
    assert.ok(patterns.workingHours, 'Should analyze working hours');
    assert.ok(patterns.eventSequences, 'Should find event sequences');
  });

  it('should filter events by time window', () => {
    const now = Date.now();
    const event = { timestamp: now, type: 'commit' };
    const allEvents = [
      { timestamp: now - 400000, type: 'commit' },
      { timestamp: now + 100000, type: 'push' }
    ];

    const withinWindow = correlator._isWithinTimeWindow(event, allEvents, 300000);
    assert.equal(withinWindow, true, 'Should find events within time window');
  });
});

describe('DashboardAggregator', () => {
  /** @type {DashboardAggregator} */
  let aggregator;
  /** @type {Object} */
  let mockRdfEngine;
  /** @type {Object} */
  let mockSubstrateCore;

  beforeEach(() => {
    mockRdfEngine = createMockRdfEngine();
    mockSubstrateCore = createMockSubstrateCore();

    aggregator = new DashboardAggregator({
      rdfEngine: mockRdfEngine,
      substrateCore: mockSubstrateCore,
      updateIntervalMs: 1000
    });
  });

  afterEach(() => {
    aggregator.stop();
  });

  it('should compute current metrics', async () => {
    const metrics = await aggregator._computeCurrentMetrics();

    assert.ok(metrics, 'Should return metrics');
    assert.ok(metrics.totalCommits >= 0, 'Should have commit count');
    assert.ok(metrics.totalPushes >= 0, 'Should have push count');
    assert.ok(metrics.totalMerges >= 0, 'Should have merge count');
    assert.ok(metrics.eventTypeCounts instanceof Map, 'Should have event type counts');
  });

  it('should compute event type counts', async () => {
    const counts = await aggregator._computeEventTypeCounts();

    assert.ok(counts instanceof Map, 'Should return Map');
    assert.ok(counts.size > 0, 'Should have event types');
  });

  it('should compute branch activity', async () => {
    const activity = await aggregator._computeBranchActivity();

    assert.ok(activity instanceof Map, 'Should return Map');
    assert.ok(activity.size > 0, 'Should have branch activity');
  });

  it('should compute author contributions', async () => {
    const contributions = await aggregator._computeAuthorContributions();

    assert.ok(contributions instanceof Map, 'Should return Map');
    assert.ok(contributions.size > 0, 'Should have author contributions');
  });

  it('should update time series', async () => {
    await aggregator._updateTimeSeries();

    const timeSeries = aggregator.getTimeSeries('commits');
    assert.ok(timeSeries, 'Should have time series data');
    assert.ok(Array.isArray(timeSeries.data), 'Should have data points');
  });

  it('should compute trends', async () => {
    await aggregator._computeTrends();

    const trend = aggregator.getTrend('commits');
    assert.ok(trend, 'Should have trend data');
    assert.ok(typeof trend.current === 'number', 'Should have current value');
    assert.ok(typeof trend.previous === 'number', 'Should have previous value');
    assert.ok(['up', 'down', 'stable'].includes(trend.direction), 'Should have valid direction');
  });

  it('should calculate health score', async () => {
    await aggregator.update();

    const health = aggregator.getHealthScore();

    assert.ok(typeof health.score === 'number', 'Should have health score');
    assert.ok(health.score >= 0 && health.score <= 100, 'Score should be between 0-100');
    assert.ok(Array.isArray(health.indicators), 'Should have indicators');
  });

  it('should start and stop updates', async () => {
    let updateCount = 0;
    aggregator.on('updated', () => {
      updateCount++;
    });

    aggregator.start();
    await new Promise(resolve => setTimeout(resolve, 1500));
    aggregator.stop();

    assert.ok(updateCount > 0, 'Should emit update events');
  });

  it('should use cache for metrics', async () => {
    const firstMetrics = await aggregator._computeCurrentMetrics();
    const cachedMetrics = await aggregator._computeCurrentMetrics();

    assert.deepEqual(firstMetrics, cachedMetrics, 'Should return cached metrics');
  });

  it('should clear cache', async () => {
    await aggregator._computeCurrentMetrics();
    aggregator.clearCache();

    const cached = aggregator._getFromCache('current-metrics');
    assert.equal(cached, null, 'Cache should be cleared');
  });
});

describe('VisualizationData', () => {
  /** @type {VisualizationData} */
  let visualization;
  /** @type {DashboardAggregator} */
  let aggregator;

  beforeEach(async () => {
    const mockRdfEngine = createMockRdfEngine();
    const mockSubstrateCore = createMockSubstrateCore();

    aggregator = new DashboardAggregator({
      rdfEngine: mockRdfEngine,
      substrateCore: mockSubstrateCore
    });

    await aggregator.update();

    visualization = new VisualizationData({ aggregator });
  });

  afterEach(() => {
    aggregator.stop();
  });

  it('should format commit timeline', () => {
    const chart = visualization.format('commit-timeline');

    assert.equal(chart.type, 'line', 'Should be line chart');
    assert.ok(chart.title, 'Should have title');
    assert.ok(chart.data, 'Should have data');
  });

  it('should format event distribution', () => {
    const chart = visualization.format('event-distribution');

    assert.equal(chart.type, 'pie', 'Should be pie chart');
    assert.ok(chart.data.labels, 'Should have labels');
    assert.ok(chart.data.datasets, 'Should have datasets');
  });

  it('should format branch activity', () => {
    const chart = visualization.format('branch-activity');

    assert.equal(chart.type, 'bar', 'Should be bar chart');
    assert.ok(chart.data.labels.length > 0, 'Should have branch labels');
  });

  it('should format author contributions', () => {
    const chart = visualization.format('author-contributions');

    assert.equal(chart.type, 'bar', 'Should be bar chart');
    assert.ok(chart.data.labels.length > 0, 'Should have author labels');
  });

  it('should format trends', () => {
    const chart = visualization.format('trends');

    assert.equal(chart.type, 'table', 'Should be table format');
    assert.ok(Array.isArray(chart.data), 'Should have trend data');
  });

  it('should format performance metrics', () => {
    const processorMetrics = {
      averageProcessingTime: 50,
      p95ProcessingTime: 100,
      p99ProcessingTime: 150,
      totalProcessed: 1000,
      totalFailed: 10
    };

    const performance = visualization.formatPerformanceMetrics(processorMetrics);

    assert.equal(performance.avgResponseTime, 50, 'Should have average response time');
    assert.equal(performance.p95ResponseTime, 100, 'Should have p95 response time');
    assert.ok(performance.errorRate > 0, 'Should have error rate');
  });

  it('should format SLO status', () => {
    const slos = {
      responseTime: { target: 100, threshold: 0.9 },
      errorRate: { target: 0.01, threshold: 0.9 }
    };

    const performance = {
      p95ResponseTime: 80,
      errorRate: 0.005,
      throughput: 100
    };

    const statuses = visualization.formatSLOStatus(slos, performance);

    assert.ok(statuses.length > 0, 'Should have SLO statuses');
    assert.ok(statuses[0].name, 'Should have SLO name');
    assert.ok(['meeting', 'at-risk', 'violated'].includes(statuses[0].status), 'Should have valid status');
  });

  it('should format health dashboard', () => {
    const dashboard = visualization.formatHealthDashboard();

    assert.ok(typeof dashboard.score === 'number', 'Should have health score');
    assert.ok(Array.isArray(dashboard.indicators), 'Should have indicators');
    assert.ok(dashboard.metrics, 'Should have metrics');
  });

  it('should export data as JSON', () => {
    const exported = visualization.exportData('json');

    assert.ok(typeof exported === 'string', 'Should return string');
    const parsed = JSON.parse(exported);
    assert.ok(parsed.metrics, 'Should have metrics');
    assert.ok(parsed.timeSeries, 'Should have time series');
  });

  it('should register custom formatters', () => {
    visualization.registerFormatter('custom', (data) => ({
      type: 'custom',
      title: 'Custom Chart',
      data: {}
    }));

    const formatters = visualization.getAvailableFormatters();
    assert.ok(formatters.includes('custom'), 'Should register custom formatter');

    const chart = visualization.format('custom');
    assert.equal(chart.type, 'custom', 'Should use custom formatter');
  });

  it('should handle missing data gracefully', () => {
    const emptyViz = new VisualizationData({
      aggregator: new DashboardAggregator({
        rdfEngine: createMockRdfEngine(),
        substrateCore: createMockSubstrateCore()
      })
    });

    const chart = emptyViz.format('commit-timeline');
    assert.ok(chart, 'Should return empty chart');
  });
});

describe('Integration Tests', () => {
  it('should integrate EventQueue with AsyncEventProcessor', async () => {
    const processor = new AsyncEventProcessor();

    let processed = false;
    processor.registerProcessor('commit', async (event) => {
      processed = true;
      return { success: true };
    });

    processor.enqueue('commit', { sha: 'abc123' });
    processor.start();

    await new Promise(resolve => setTimeout(resolve, 200));

    assert.equal(processed, true, 'Should process event through queue');

    processor.stop();
  });

  it('should integrate all Phase 2 components', async () => {
    const mockRdfEngine = createMockRdfEngine();
    const mockSubstrateCore = createMockSubstrateCore();

    // Create aggregator
    const aggregator = new DashboardAggregator({
      rdfEngine: mockRdfEngine,
      substrateCore: mockSubstrateCore
    });

    // Create processor
    const processor = new AsyncEventProcessor();

    // Create correlator
    const correlator = new EventCorrelator({
      rdfEngine: mockRdfEngine
    });

    // Create visualization
    const visualization = new VisualizationData({ aggregator });

    // Update metrics
    await aggregator.update();

    // Process some events
    processor.registerProcessor('commit', async (event) => ({ success: true }));
    processor.enqueue('commit', { sha: 'abc123' });
    processor.start();

    // Correlate events
    const now = Date.now();
    const events = [
      { type: 'commit', timestamp: now, data: { branch: 'main' } },
      { type: 'push', timestamp: now + 60000, data: { branch: 'main' } }
    ];
    const correlations = await correlator.correlate(events);

    // Format visualization
    const chart = visualization.format('commit-timeline');

    // Verify integration
    assert.ok(aggregator.getMetrics(), 'Should have metrics');
    assert.ok(processor.getStatus(), 'Should have processor status');
    assert.ok(Array.isArray(correlations), 'Should have correlations');
    assert.ok(chart, 'Should have visualization');

    processor.stop();
    aggregator.stop();
  });
});

console.log('\n✅ All Phase 2 tests defined');
console.log('📊 Test coverage: EventQueue, AsyncEventProcessor, EventCorrelator, DashboardAggregator, VisualizationData');
console.log('🔬 Integration tests included');
