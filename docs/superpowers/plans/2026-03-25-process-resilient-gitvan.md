# Process-Resilient GitVan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add supervision trees and process mining to GitVan for fault tolerance and process intelligence

**Architecture:** 3-tier supervision hierarchy (GitVan→Workflow→Step) with process mining layer extracting intelligence from Git event logs

**Tech Stack:** Node.js ES modules, Git refs/notes for storage, existing GitVan composables

---

## File Structure

```
NEW SUPERVISION LAYER:
src/supervision/
  base-supervisor.mjs          # Base supervisor class
  gitvan-supervisor.mjs         # Root supervisor
  workflow-supervisor.mjs       # Workflow domain supervisor
  step-supervisor.mjs           # Step-level supervisor
  restart-strategies.mjs        # Restart strategy implementations
  heartbeat.mjs                 # Heartbeat monitoring
  crash-logger.mjs              # Crash logging to Git notes

NEW PROCESS MINING LAYER:
src/process-mining/
  event-log-extractor.mjs       # Extract events from Git logs
  conformance-checker.mjs       # Check expected vs actual
  bottleneck-detector.mjs       # Find slow steps
  variant-analyzer.mjs          # Discover execution paths
  process-model-builder.mjs     # Build process models

MODIFIED EXISTING:
src/workflow/workflow-executor.mjs    # Add supervision integration
src/jobs/job-bridge-scheduler.mjs     # Add supervision integration
src/hooks/HookOrchestrator.mjs         # Add supervision integration
```

---

## Phase 1: Supervision Foundation (Week 1-2)

### Task 1: Base Supervisor Class

**Files:**
- Create: `src/supervision/base-supervisor.mjs`
- Create: `tests/supervision/base-supervisor.test.mjs`

**Purpose:** Abstract base class for all supervisors with common functionality

- [ ] **Step 1: Write failing test for base supervisor initialization**

```javascript
// tests/supervision/base-supervisor.test.mjs
import { describe, it } from 'vitest';
import { BaseSupervisor } from '../../src/supervision/base-supervisor.mjs';

describe('BaseSupervisor', () => {
  it('should initialize with options', () => {
    const supervisor = new BaseSupervisor({
      id: 'test-supervisor',
      maxRestarts: 3
    });
    assert.equal(supervisor.id, 'test-supervisor');
    assert.equal(supervisor.maxRestarts, 3);
  });

  it('should track child supervisors', () => {
    const supervisor = new BaseSupervisor({ id: 'test' });
    const child = { id: 'child-1' };
    supervisor.addChild(child);
    assert.equal(supervisor.children.size, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/supervision/base-supervisor.test.mjs`
Expected: FAIL with "BaseSupervisor not defined"

- [ ] **Step 3: Implement BaseSupervisor class**

```javascript
// src/supervision/base-supervisor.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('supervision:base');

export class BaseSupervisor {
  constructor(options = {}) {
    this.id = options.id || 'supervisor';
    this.children = new Map();
    this.maxRestarts = options.maxRestarts || 3;
    this.restartCount = new Map();
    this.logger = options.logger || logger;
    this.shutdownTimeout = options.shutdownTimeout || 5000;
    this.isRunning = false;
  }

  addChild(child) {
    if (!child.id) {
      throw new Error('Child must have an id');
    }
    this.children.set(child.id, child);
    this.logger.debug(`Added child: ${child.id} to ${this.id}`);
  }

  removeChild(childId) {
    this.children.delete(childId);
    this.restartCount.delete(childId);
    this.logger.debug(`Removed child: ${childId} from ${this.id}`);
  }

  getChild(childId) {
    return this.children.get(childId);
  }

  async start() {
    this.isRunning = true;
    this.logger.info(`Starting supervisor: ${this.id}`);
    // Subclasses implement specific startup logic
  }

  async stop() {
    this.logger.info(`Stopping supervisor: ${this.id}`);
    this.isRunning = false;
    // Stop all children with timeout
    const stopPromises = Array.from(this.children.values()).map(child =>
      this.stopChild(child).catch(err =>
        this.logger.warn(`Error stopping child ${child.id}: ${err.message}`)
      )
    );
    await Promise.allSettled(stopPromises);
  }

  async stopChild(child) {
    if (typeof child.stop === 'function') {
      await child.stop();
    }
  }

  shouldRestartChild(childId) {
    const count = this.restartCount.get(childId) || 0;
    return count < this.maxRestarts;
  }

  incrementRestartCount(childId) {
    const count = (this.restartCount.get(childId) || 0) + 1;
    this.restartCount.set(childId, count);
    return count;
  }

  getRestartCount(childId) {
    return this.restartCount.get(childId) || 0;
  }

  getHealth() {
    return {
      id: this.id,
      isRunning: this.isRunning,
      children: Array.from(this.children.keys()),
      restartCounts: Object.fromEntries(this.restartCount)
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/supervision/base-supervisor.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/supervision/base-supervisor.mjs tests/supervision/base-supervisor.test.mjs
git commit -m "feat(supervision): add BaseSupervisor class with child management"
```

---

### Task 2: Restart Strategies

**Files:**
- Create: `src/supervision/restart-strategies.mjs`
- Create: `tests/supervision/restart-strategies.test.mjs`

- [ ] **Step 1: Write failing test for restart strategies**

```javascript
// tests/supervision/restart-strategies.test.mjs
import { describe, it } from 'vitest';
import { getBackoffDelay, shouldRestart } from '../../src/supervision/restart-strategies.mjs';

describe('RestartStrategies', () => {
  it('should calculate exponential backoff', () => {
    assert.equal(getBackoffDelay(0, [1000, 5000, 10000]), 1000);
    assert.equal(getBackoffDelay(1, [1000, 5000, 10000]), 5000);
    assert.equal(getBackoffDelay(2, [1000, 5000, 10000]), 10000);
  });

  it('should determine if error is restartable', () => {
    const transientError = new Error('ECONNREFUSED');
    assert.equal(shouldRestart(transientError), true);

    const permanentError = new Error('EINVAL');
    assert.equal(shouldRestart(permanentError), false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/supervision/restart-strategies.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement restart strategies**

```javascript
// src/supervision/restart-strategies.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('supervision:strategies');

// Error classification
export const ErrorTypes = {
  TRANSIENT: ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE'],
  PERMANENT: ['EINVAL', 'ENOENT', 'EACCES', 'EPERM'],
  CRASH: ['uncaughtException', 'unhandledRejection']
};

export const RestartStrategies = {
  ONE_FOR_ONE: 'one_for_one',
  ONE_FOR_ALL: 'one_for_all',
  REST_FOR_ONE: 'rest_for_one'
};

/**
 * Calculate backoff delay based on restart attempt
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number[]} backoffSchedule - Array of delays in ms
 * @returns {number} Delay in milliseconds
 */
export function getBackoffDelay(attempt, backoffSchedule = [1000, 5000, 10000]) {
  const index = Math.min(attempt, backoffSchedule.length - 1);
  return backoffSchedule[index];
}

/**
 * Determine if an error is restartable
 * @param {Error} error - The error to evaluate
 * @returns {boolean} True if error is transient/restartable
 */
export function shouldRestart(error) {
  if (!error) return false;

  const code = error.code || error.message?.split(':')[0];

  // Check if error is transient
  if (ErrorTypes.TRANSIENT.includes(code)) {
    logger.debug(`Transient error detected: ${code}, will restart`);
    return true;
  }

  // Check if error is permanent
  if (ErrorTypes.PERMANENT.includes(code)) {
    logger.warn(`Permanent error detected: ${code}, will not restart`);
    return false;
  }

  // Default: don't restart for unknown errors
  logger.warn(`Unknown error type: ${code}, will not restart`);
  return false;
}

/**
 * Get dependent children for REST_FOR_ONE strategy
 * @param {Map} children - All children
 * @param {string} crashedChildId - The child that crashed
 * @param {object} dependencies - Dependency graph {childId: [depIds]}
 * @returns {string[]} Array of child IDs to restart
 */
export function getDependents(children, crashedChildId, dependencies = {}) {
  const dependents = [];

  for (const [childId, deps] of Object.entries(dependencies)) {
    if (deps.includes(crashedChildId)) {
      dependents.push(childId);
    }
  }

  return dependents;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/supervision/restart-strategies.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/supervision/restart-strategies.mjs tests/supervision/restart-strategies.test.mjs
git commit -m "feat(supervision): add restart strategies with error classification"
```

---

### Task 3: Heartbeat Monitoring

**Files:**
- Create: `src/supervision/heartbeat.mjs`
- Create: `tests/supervision/heartbeat.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
// tests/supervision/heartbeat.test.mjs
import { describe, it, beforeEach, afterEach } from 'vitest';
import { HeartbeatMonitor } from '../../src/supervision/heartbeat.mjs';

describe('HeartbeatMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new HeartbeatMonitor({
      interval: 1000,
      missedThreshold: 3
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  it('should detect missed heartbeats', async () => {
    monitor.register('worker-1');

    // Wait for threshold to be exceeded
    await new Promise(resolve => setTimeout(resolve, 4000));

    const deadWorkers = monitor.getDeadWorkers();
    assert.include(deadWorkers, 'worker-1');
  });

  it('should clear dead workers on heartbeat', async () => {
    monitor.register('worker-1');
    await new Promise(resolve => setTimeout(resolve, 4000));

    monitor.recordHeartbeat('worker-1');
    const deadWorkers = monitor.getDeadWorkers();
    assert.notInclude(deadWorkers, 'worker-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/supervision/heartbeat.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement heartbeat monitor**

```javascript
// src/supervision/heartbeat.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('supervision:heartbeat');

export class HeartbeatMonitor {
  constructor(options = {}) {
    this.interval = options.interval || 30000; // 30s default
    this.missedThreshold = options.missedThreshold || 3;
    this.workers = new Map(); // workerId -> { lastSeen, missedCount }
    this.checkInterval = null;
  }

  register(workerId) {
    this.workers.set(workerId, {
      lastSeen: Date.now(),
      missedCount: 0
    });
    logger.debug(`Registered worker for heartbeat: ${workerId}`);
  }

  unregister(workerId) {
    this.workers.delete(workerId);
    logger.debug(`Unregistered worker: ${workerId}`);
  }

  recordHeartbeat(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastSeen = Date.now();
      worker.missedCount = 0;
    }
  }

  getDeadWorkers() {
    const now = Date.now();
    const deadWorkers = [];

    for (const [workerId, worker] of this.workers) {
      const timeSinceLastSeen = now - worker.lastSeen;

      if (timeSinceLastSeen > this.interval) {
        worker.missedCount++;

        if (worker.missedCount >= this.missedThreshold) {
          deadWorkers.push(workerId);
          logger.warn(`Worker ${workerId} is dead (missed ${worker.missedCount} heartbeats)`);
        }
      }
    }

    return deadWorkers;
  }

  start() {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      const deadWorkers = this.getDeadWorkers();

      if (deadWorkers.length > 0 && this.onWorkerDeath) {
        this.onWorkerDeath(deadWorkers);
      }
    }, this.interval);

    logger.info('Heartbeat monitor started');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Heartbeat monitor stopped');
    }
  }

  onWorkerDeath(callback) {
    this.onWorkerDeath = callback;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/supervision/heartbeat.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/supervision/heartbeat.mjs tests/supervision/heartbeat.test.mjs
git commit -m "feat(supervision): add heartbeat monitoring for worker health"
```

---

### Task 4: Crash Logger to Git Notes

**Files:**
- Create: `src/supervision/crash-logger.mjs`
- Create: `tests/supervision/crash-logger.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
// tests/supervision/crash-logger.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { CrashLogger } from '../../src/supervision/crash-logger.mjs';

describe('CrashLogger', () => {
  let logger;

  beforeEach(() => {
    logger = new CrashLogger({
      cwd: '/tmp/test-gitvan',
      dryRun: true
    });
  });

  it('should log crash with context', async () => {
    const crash = {
      processId: 'workflow-123',
      error: new Error('Test crash'),
      timestamp: new Date(),
      context: { step: 'validation' }
    };

    await logger.logCrash(crash);
    const logs = logger.getCrashLogs();
    assert.equal(logs.length, 1);
    assert.equal(logs[0].processId, 'workflow-123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/supervision/crash-logger.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement crash logger**

```javascript
// src/supervision/crash-logger.mjs
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { createLogger } from '../utils/logger.mjs';
import { useGit } from '../composables/git/index.mjs';

const logger = createLogger('supervision:crash');

const CRASH_NOTES_REF = 'refs/notes/gitvan/crashes';

export class CrashLogger {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.dryRun = options.dryRun || false;
    this.git = useGit();
  }

  async logCrash(crash) {
    const crashRecord = {
      id: this._generateCrashId(crash),
      processId: crash.processId,
      processType: crash.processType || 'unknown',
      error: {
        message: crash.error.message,
        stack: crash.error.stack,
        code: crash.error.code,
        name: crash.error.name
      },
      timestamp: crash.timestamp || new Date(),
      context: crash.context || {},
      system: this._getSystemInfo()
    };

    if (this.dryRun) {
      logger.debug(`[DRY RUN] Would log crash: ${crashRecord.id}`);
      this._addToMemoryLog(crashRecord);
      return crashRecord.id;
    }

    try {
      const noteContent = JSON.stringify(crashRecord, null, 2);
      await this.git.notes.add(noteContent, { ref: CRASH_NOTES_REF });
      logger.info(`Crash logged: ${crashRecord.id}`);
      return crashRecord.id;
    } catch (error) {
      logger.error(`Failed to log crash: ${error.message}`);
      throw error;
    }
  }

  _generateCrashId(crash) {
    const hash = createHash('sha256');
    hash.update(crash.processId);
    hash.update(Date.now().toString());
    hash.update(Math.random().toString());
    return `crash-${hash.digest('hex').substring(0, 12)}`;
  }

  _getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  _addToMemoryLog(crashRecord) {
    if (!this._memoryLog) {
      this._memoryLog = [];
    }
    this._memoryLog.push(crashRecord);
  }

  getCrashLogs() {
    return this._memoryLog || [];
  }

  async getCrashLogsSince(since) {
    // Implementation would read from Git notes
    // For now, return memory logs in dry run mode
    if (this.dryRun) {
      return this.getCrashLogs().filter(log => log.timestamp >= since);
    }
    throw new Error('Not implemented in non-dry-run mode');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/supervision/crash-logger.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/supervision/crash-logger.mjs tests/supervision/crash-logger.test.mjs
git commit -m "feat(supervision): add crash logger with Git notes storage"
```

---

### Task 5: StepSupervisor

**Files:**
- Create: `src/supervision/step-supervisor.mjs`
- Create: `tests/supervision/step-supervisor.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
// tests/supervision/step-supervisor.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { StepSupervisor } from '../../src/supervision/step-supervisor.mjs';

describe('StepSupervisor', () => {
  let supervisor;

  beforeEach(() => {
    supervisor = new StepSupervisor({
      id: 'test-step-supervisor',
      strategy: 'one_for_one'
    });
  });

  it('should execute step with supervision', async () => {
    const step = {
      id: 'step-1',
      type: 'test',
      handler: async () => ({ success: true })
    };

    const result = await supervisor.executeStep(step, {});
    assert.equal(result.success, true);
  });

  it('should restart failed step', async () => {
    let attempts = 0;
    const step = {
      id: 'step-1',
      type: 'test',
      handler: async () => {
        attempts++;
        if (attempts < 2) throw new Error('ECONNREFUSED');
        return { success: true };
      }
    };

    const result = await supervisor.executeStep(step, {});
    assert.equal(result.success, true);
    assert.equal(attempts, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/supervision/step-supervisor.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement StepSupervisor**

```javascript
// src/supervision/step-supervisor.mjs
import { BaseSupervisor } from './base-supervisor.mjs';
import { getBackoffDelay, shouldRestart, RestartStrategies } from './restart-strategies.mjs';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('supervision:step');

export class StepSupervisor extends BaseSupervisor {
  constructor(options = {}) {
    super({
      ...options,
      maxRestarts: options.maxRestarts || 3
    });
    this.strategy = options.strategy || RestartStrategies.ONE_FOR_ONE;
    this.backoffSchedule = options.backoffSchedule || [1000, 5000, 10000];
    this.metrics = new Map(); // stepId -> { executions, failures, duration }
  }

  async executeStep(step, context) {
    const stepId = step.id;
    const startTime = performance.now();

    try {
      this.logger.info(`Executing step: ${stepId} (${step.type})`);

      const result = await this._executeWithRetry(step, context);

      // Record success metrics
      this._recordSuccess(stepId, performance.now() - startTime);

      return result;
    } catch (error) {
      // Record failure metrics
      this._recordFailure(stepId, performance.now() - startTime, error);

      this.logger.error(`Step ${stepId} failed after all retries: ${error.message}`);
      throw error;
    }
  }

  async _executeWithRetry(step, context) {
    const stepId = step.id;
    let lastError;

    for (let attempt = 0; attempt <= this.maxRestarts; attempt++) {
      try {
        if (attempt > 0) {
          const delay = getBackoffDelay(attempt - 1, this.backoffSchedule);
          this.logger.info(`Restarting step ${stepId} (attempt ${attempt + 1}) after ${delay}ms`);
          await this._sleep(delay);
        }

        return await step.handler(step, context);
      } catch (error) {
        lastError = error;

        if (!shouldRestart(error)) {
          this.logger.warn(`Step ${stepId} hit non-restartable error: ${error.message}`);
          throw error;
        }

        this.logger.warn(`Step ${stepId} failed (attempt ${attempt + 1}): ${error.message}`);
      }
    }

    throw lastError;
  }

  _recordSuccess(stepId, duration) {
    const metrics = this.metrics.get(stepId) || { executions: 0, failures: 0, duration: [] };
    metrics.executions++;
    metrics.duration.push(duration);
    this.metrics.set(stepId, metrics);
  }

  _recordFailure(stepId, duration, error) {
    const metrics = this.metrics.get(stepId) || { executions: 0, failures: 0, duration: [] };
    metrics.executions++;
    metrics.failures++;
    metrics.duration.push(duration);
    this.metrics.set(stepId, metrics);
  }

  getMetrics(stepId) {
    const metrics = this.metrics.get(stepId);
    if (!metrics) return null;

    const durations = metrics.duration;
    return {
      executions: metrics.executions,
      failures: metrics.failures,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      successRate: (metrics.executions - metrics.failures) / metrics.executions
    };
  }

  async _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/supervision/step-supervisor.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/supervision/step-supervisor.mjs tests/supervision/step-supervisor.test.mjs
git commit -m "feat(supervision): add StepSupervisor with one-for-one restarts"
```

---

## Phase 2: Process Mining Layer (Week 3-4)

### Task 6: Event Log Extractor

**Files:**
- Create: `src/process-mining/event-log-extractor.mjs`
- Create: `tests/process-mining/event-log-extractor.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
// tests/process-mining/event-log-extractor.test.mjs
import { describe, it, beforeEach, expect } from 'vitest';
import { EventLogExtractor } from '../../src/process-mining/event-log-extractor.mjs';

describe('EventLogExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new EventLogExtractor({
      cwd: '/tmp/test-repo'
    });
  });

  it('should extract event traces from Git log', async () => {
    const traces = await extractor.extractTraces({
      since: '2026-01-01',
      workflowId: 'test-workflow'
    });

    assert.isArray(traces);
    assert.isAbove(traces.length, 0);
    assert.property(traces[0], 'caseId');
    assert.property(traces[0], 'activities');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/process-mining/event-log-extractor.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement EventLogExtractor**

```javascript
// src/process-mining/event-log-extractor.mjs
import { useGit } from '../composables/git/index.mjs';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('process-mining:extractor');

export class EventLogExtractor {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.git = useGit();
    this.logger = options.logger || logger;
  }

  async extractTraces(options = {}) {
    const { since, workflowId, branch = 'main' } = options;

    try {
      // Get Git log with workflow execution events
      const logArgs = [
        '--since=' + (since || '1 month ago'),
        '--grep=\\[workflow-execution\\]',
        '--pretty=format:%H|%ai|%s',
        branch
      ];

      const { stdout } = await this.git.log({ args: logArgs });
      const traces = this._parseLogEntries(stdout, workflowId);

      this.logger.info(`Extracted ${traces.length} event traces`);
      return traces;
    } catch (error) {
      this.logger.error(`Failed to extract traces: ${error.message}`);
      throw error;
    }
  }

  _parseLogEntries(logOutput, workflowIdFilter) {
    const entries = logOutput.trim().split('\n');
    const traces = new Map(); // caseId -> activities
    const caseIdRegex = /workflow-execution:(\w+-\d+)/;
    const activityRegex = /\[step:(\w+)\]/;
    const resourceRegex = /\[resource:(\w+)\]/;

    for (const entry of entries) {
      const [hash, timestamp, subject] = entry.split('|');

      const caseIdMatch = subject.match(caseIdRegex);
      if (!caseIdMatch) continue;

      const caseId = caseIdMatch[1];
      if (workflowIdFilter && !caseId.includes(workflowIdFilter)) continue;

      const activityMatch = subject.match(activityRegex);
      const resourceMatch = subject.match(resourceRegex);

      const activity = {
        name: activityMatch ? activityMatch[1] : 'unknown',
        timestamp: new Date(timestamp).toISOString(),
        resource: resourceMatch ? resourceMatch[1] : 'unknown',
        commit: hash
      };

      if (!traces.has(caseId)) {
        traces.set(caseId, {
          caseId,
          activities: []
        });
      }

      traces.get(caseId).activities.push(activity);
    }

    return Array.from(traces.values()).sort((a, b) =>
      a.activities[0].timestamp.localeCompare(b.activities[0].timestamp)
    );
  }

  async extractWorkflowStats(workflowId) {
    const traces = await this.extractTraces({ workflowId });

    return {
      workflowId,
      totalExecutions: traces.length,
      avgStepsPerExecution: traces.reduce((sum, t) => sum + t.activities.length, 0) / traces.length,
      uniqueActivities: this._getUniqueActivities(traces),
      timeRange: this._getTimeRange(traces)
    };
  }

  _getUniqueActivities(traces) {
    const activities = new Set();
    for (const trace of traces) {
      for (const activity of trace.activities) {
        activities.add(activity.name);
      }
    }
    return Array.from(activities);
  }

  _getTimeRange(traces) {
    if (traces.length === 0) return null;

    const allTimestamps = traces.flatMap(t => t.activities.map(a => a.timestamp));
    return {
      start: Math.min(...allTimestamps),
      end: Math.max(...allTimestamps)
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/process-mining/event-log-extractor.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/process-mining/event-log-extractor.mjs tests/process-mining/event-log-extractor.test.mjs
git commit -m "feat(process-mining): add event log extraction from Git commits"
```

---

### Task 7: Conformance Checker

**Files:**
- Create: `src/process-mining/conformance-checker.mjs`
- Create: `tests/process-mining/conformance-checker.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
// tests/process-mining/conformance-checker.test.mjs
import { describe, it, expect } from 'vitest';
import { ConformanceChecker } from '../../src/process-mining/conformance-checker.mjs';

describe('ConformanceChecker', () => {
  it('should calculate fitness score', async () => {
    const checker = new ConformanceChecker();

    const expected = ['step1', 'step2', 'step3'];
    const actual = ['step1', 'step3']; // skipped step2

    const result = await checker.check(expected, actual);
    assert.isBelow(result.fitness, 1.0);
    assert.lengthOf(result.deviations, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/process-mining/conformance-checker.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement ConformanceChecker**

```javascript
// src/process-mining/conformance-checker.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('process-mining:conformance');

export class ConformanceChecker {
  constructor(options = {}) {
    this.logger = options.logger || logger;
  }

  /**
   * Check conformance between expected and actual execution
   * @param {string[]} expectedSteps - Expected step names in order
   * @param {string[]} actualSteps - Actual step names in order
   * @returns {Promise<object>} Conformance result with fitness score and deviations
   */
  async check(expectedSteps, actualSteps) {
    const deviations = [];
    let fitness = 1.0;

    // Check for skipped steps
    for (const expected of expectedSteps) {
      if (!actualSteps.includes(expected)) {
        deviations.push({
          type: 'skip',
          step: expected,
          message: `Step "${expected}" was skipped`
        });
        fitness -= 0.1;
      }
    }

    // Check for unauthorized steps
    for (const actual of actualSteps) {
      if (!expectedSteps.includes(actual)) {
        deviations.push({
          type: 'unauthorized',
          step: actual,
          message: `Unexpected step "${actual}" was executed`
        });
        fitness -= 0.15;
      }
    }

    // Check for order deviations
    const expectedOrder = expectedSteps.join(',');
    const actualOrder = actualSteps.join(',');
    if (expectedOrder !== actualOrder) {
      deviations.push({
        type: 'reorder',
        expected: expectedSteps,
        actual: actualSteps,
        message: 'Steps executed in different order than expected'
      });
      fitness -= 0.05;
    }

    // Ensure fitness is between 0 and 1
    fitness = Math.max(0, Math.min(1, fitness));

    this.logger.info(`Conformance check complete: fitness=${fitness.toFixed(2)}, deviations=${deviations.length}`);

    return {
      fitness,
      deviations,
      expectedSteps,
      actualSteps,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check conformance for multiple executions
   * @param {string[]} expectedSteps - Expected step names
   * @param {object[]} executions - Array of {caseId, activities: [{name}]}
   * @returns {Promise<object>} Aggregate conformance results
   */
  async checkMultiple(expectedSteps, executions) {
    const results = [];
    let totalFitness = 0;

    for (const execution of executions) {
      const actualSteps = execution.activities.map(a => a.name);
      const result = await this.check(expectedSteps, actualSteps);
      results.push({
        caseId: execution.caseId,
        ...result
      });
      totalFitness += result.fitness;
    }

    return {
      averageFitness: totalFitness / executions.length,
      executions: results.length,
      results,
      timestamp: new Date().toISOString()
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/process-mining/conformance-checker.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/process-mining/conformance-checker.mjs tests/process-mining/conformance-checker.test.mjs
git commit -m "feat(process-mining): add conformance checking with fitness scores"
```

---

### Task 8: Bottleneck Detector

**Files:**
- Create: `src/process-mining/bottleneck-detector.mjs`
- Create: `tests/process-mining/bottleneck-detector.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
// tests/process-mining/bottleneck-detector.test.mjs
import { describe, it, expect } from 'vitest';
import { BottleneckDetector } from '../../src/process-mining/bottleneck-detector.mjs';

describe('BottleneckDetector', () => {
  it('should identify slow steps', async () => {
    const detector = new BottleneckDetector();

    const executions = [
      {
        caseId: 'case-1',
        activities: [
          { name: 'step1', duration: 100 },
          { name: 'step2', duration: 5000 }, // slow
          { name: 'step3', duration: 200 }
        ]
      }
    ];

    const bottlenecks = await detector.detect(executions);
    assert.lengthOf(bottlenecks, 1);
    assert.equal(bottlenecks[0].step, 'step2');
    assert.equal(bottlenecks[0].status, 'warning');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/process-mining/bottleneck-detector.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement BottleneckDetector**

```javascript
// src/process-mining/bottleneck-detector.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('process-mining:bottleneck');

export class BottleneckDetector {
  constructor(options = {}) {
    this.logger = options.logger || logger;
    this.thresholds = options.thresholds || {
      warning: 2000,  // 2s
      critical: 5000  // 5s
    };
  }

  async detect(executions) {
    const stepMetrics = new Map(); // stepName -> { durations, count }

    // Collect metrics across all executions
    for (const execution of executions) {
      for (const activity of execution.activities) {
        if (!activity.duration) continue;

        const metrics = stepMetrics.get(activity.name) || { durations: [], count: 0 };
        metrics.durations.push(activity.duration);
        metrics.count++;
        stepMetrics.set(activity.name, metrics);
      }
    }

    // Calculate statistics and identify bottlenecks
    const bottlenecks = [];

    for (const [stepName, metrics] of stepMetrics) {
      const durations = metrics.durations.sort((a, b) => a - b);
      const p95 = this._percentile(durations, 95);
      const p99 = this._percentile(durations, 99);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

      let status = 'ok';
      if (p99 > this.thresholds.critical) {
        status = 'critical';
      } else if (p95 > this.thresholds.warning) {
        status = 'warning';
      }

      if (status !== 'ok') {
        bottlenecks.push({
          step: stepName,
          avg,
          p95,
          p99,
          status,
          executions: metrics.count
        });
      }
    }

    // Sort by severity (critical first, then by p99 duration)
    bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, ok: 2 };
      const severityDiff = severityOrder[a.status] - severityOrder[b.status];
      if (severityDiff !== 0) return severityDiff;
      return b.p99 - a.p99;
    });

    this.logger.info(`Detected ${bottlenecks.length} bottlenecks`);
    return bottlenecks;
  }

  _percentile(sortedArray, p) {
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[index];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/process-mining/bottleneck-detector.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/process-mining/bottleneck-detector.mjs tests/process-mining/bottleneck-detector.test.mjs
git commit -m "feat(process-mining): add bottleneck detection with p95/p99 analysis"
```

---

### Task 8.5: Variant Analyzer

**Files:**
- Create: `src/process-mining/variant-analyzer.mjs`
- Create: `tests/process-mining/variant-analyzer.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
// tests/process-mining/variant-analyzer.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { VariantAnalyzer } from '../../src/process-mining/variant-analyzer.mjs';

describe('VariantAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new VariantAnalyzer();
  });

  it('should discover process variants', async () => {
    const executions = [
      {
        caseId: 'case-1',
        activities: [
          { name: 'step1', timestamp: '2026-03-25T01:00:00Z' },
          { name: 'step2', timestamp: '2026-03-25T01:00:01Z' },
          { name: 'step3', timestamp: '2026-03-25T01:00:02Z' }
        ]
      },
      {
        caseId: 'case-2',
        activities: [
          { name: 'step1', timestamp: '2026-03-25T01:01:00Z' },
          { name: 'step3', timestamp: '2026-03-25T01:01:02Z' }
        ]
      }
    ];

    const variants = await analyzer.discover(executions);
    expect(variants.length).to.equal(2);
    expect(variants[0].frequency).to.equal(1);
    expect(variants[0].path).to.deep.equal(['step1', 'step2', 'step3']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/process-mining/variant-analyzer.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement VariantAnalyzer**

```javascript
// src/process-mining/variant-analyzer.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('process-mining:variant');

export class VariantAnalyzer {
  constructor(options = {}) {
    this.logger = options.logger || logger;
  }

  async discover(executions) {
    // Group executions by their step sequence
    const variantMap = new Map();

    for (const execution of executions) {
      const path = execution.activities.map(a => a.name);
      const pathKey = path.join('->');

      if (!variantMap.has(pathKey)) {
        variantMap.set(pathKey, {
          path,
          frequency: 0,
          caseIds: [],
          exampleCaseId: execution.caseId
        });
      }

      const variant = variantMap.get(pathKey);
      variant.frequency++;
      variant.caseIds.push(execution.caseId);
    }

    // Convert to array and sort by frequency
    const variants = Array.from(variantMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .map((variant, index) => ({
        ...variant,
        rank: index + 1,
        percentage: (variant.frequency / executions.length * 100).toFixed(1)
      }));

    this.logger.info(`Discovered ${variants.length} process variants`);
    return variants;
  }

  async getVariantStatistics(executions) {
    const variants = await this.discover(executions);

    return {
      totalVariants: variants.length,
      mostCommonVariant: variants[0],
      variantCoverage: variants.map(v => ({
        path: v.path.join('->'),
        frequency: v.frequency,
        percentage: v.percentage
      })),
      entropy: this._calculateEntropy(variants, executions.length)
    };
  }

  _calculateEntropy(variants, totalExecutions) {
    let entropy = 0;

    for (const variant of variants) {
      const p = variant.frequency / totalExecutions;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/process-mining/variant-analyzer.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/process-mining/variant-analyzer.mjs tests/process-mining/variant-analyzer.test.mjs
git commit -m "feat(process-mining): add process variant discovery with entropy calculation"
```

---

## Phase 3: Integration (Week 5-6)

### Task 9: Integrate Supervision into WorkflowExecutor

**Files:**
- Modify: `src/workflow/workflow-executor.mjs`
- Create: `tests/workflow/workflow-executor-supervision.test.mjs`

- [ ] **Step 1: Write failing test for supervised execution**

```javascript
// tests/workflow/workflow-executor-supervision.test.mjs
import { describe, it, beforeEach } from 'vitest';
import { WorkflowExecutor } from '../../src/workflow/workflow-executor.mjs';

describe('WorkflowExecutor with Supervision', () => {
  let executor;

  beforeEach(() => {
    executor = new WorkflowExecutor({
      graphDir: './test/fixtures/workflows',
      supervision: { enabled: true }
    });
  });

  it('should use StepSupervisor for step execution', async () => {
    const result = await executor.execute('test-workflow', {});
    // Verify steps were supervised
    assert.property(result, 'supervisionMetrics');
    assert.property(result.supervisionMetrics, 'restarts');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/workflow/workflow-executor-supervision.test.mjs`
Expected: FAIL

- [ ] **Step 3: Add supervision to WorkflowExecutor**

Add to `src/workflow/workflow-executor.mjs`:

```javascript
// Add import at top
import { StepSupervisor } from '../supervision/step-supervisor.mjs';

// In constructor, add:
constructor(options = {}) {
  // ... existing code ...

  // Initialize supervision
  this.supervisionEnabled = options.supervision?.enabled || false;
  this.stepSupervisor = null;

  if (this.supervisionEnabled) {
    this.stepSupervisor = new StepSupervisor({
      id: 'workflow-step-supervisor',
      maxRestarts: options.supervision?.maxRestarts || 3
    });
  }
}

// Modify execute method to use supervision
async execute(workflowId, inputs = {}) {
  const startTime = performance.now();
  this.logger.info(`🚀 Starting workflow execution: ${workflowId}`);

  try {
    // Initialize RDF components
    await this._initializeRDFComponents();

    // Parse the workflow definition
    const workflow = await this._parseWorkflow(workflowId);

    // Create execution plan
    const plan = await this._createExecutionPlan(workflow);

    // Initialize execution context
    await this._initializeContext(workflowId, inputs);

    // Execute plan with supervision
    const result = await this._executePlanWithSupervision(plan, inputs);

    // Finalize and write execution receipt
    await this._finalize(workflowId, result, startTime);

    return result;
  } catch (error) {
    this.logger.error(`Workflow execution failed: ${error.message}`);
    throw error;
  }
}

// Add new method
async _executePlanWithSupervision(plan, inputs) {
  const results = [];
  const supervisionMetrics = {
    restarts: 0,
    failures: 0,
    stepMetrics: {}
  };

  for (const step of plan.steps) {
    let stepResult;

    if (this.supervisionEnabled && this.stepSupervisor) {
      // Execute with supervision
      stepResult = await this.stepSupervisor.executeStep(step, {
        ...inputs,
        context: this.contextManager.getContext()
      });

      const metrics = this.stepSupervisor.getMetrics(step.id);
      if (metrics) {
        supervisionMetrics.stepMetrics[step.id] = metrics;
        supervisionMetrics.restarts += metrics.executions - 1; // Subtract initial execution
        supervisionMetrics.failures += metrics.failures;
      }
    } else {
      // Execute without supervision (existing behavior)
      stepResult = await this.runner.executeStep(
        step,
        this.contextManager,
        this.graph,
        this.turtle,
        { verbose: true }
      );
    }

    results.push(stepResult);
  }

  return {
    outputs: results,
    supervisionMetrics
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/workflow/workflow-executor-supervision.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/workflow/workflow-executor.mjs tests/workflow/workflow-executor-supervision.test.mjs
git commit -m "feat(workflow): integrate StepSupervisor into WorkflowExecutor"
```

---

### Task 10: Integration Tests

**Files:**
- Create: `tests/integration/supervision-end-to-end.test.mjs`

- [ ] **Step 1: Write end-to-end integration test**

```javascript
// tests/integration/supervision-end-to-end.test.mjs
import { describe, it } from 'vitest';
import { WorkflowExecutor } from '../../src/workflow/workflow-executor.mjs';
import { EventLogExtractor } from '../../src/process-mining/event-log-extractor.mjs';
import { ConformanceChecker } from '../../src/process-mining/conformance-checker.mjs';

describe('Supervision End-to-End', () => {
  it('should execute workflow with supervision and mine process data', async () => {
    const executor = new WorkflowExecutor({
      graphDir: './test/fixtures/workflows',
      supervision: { enabled: true }
    });

    // Execute workflow
    const result = await executor.execute('test-workflow', { input1: 'test' });

    // Verify supervision worked
    assert.property(result, 'supervisionMetrics');
    assert.isAtMost(result.supervisionMetrics.failures, 1);

    // Mine process data
    const extractor = new EventLogExtractor();
    const traces = await extractor.extractTraces({ workflowId: 'test-workflow' });
    assert.isAbove(traces.length, 0);

    // Check conformance
    const checker = new ConformanceChecker();
    const conformance = await checker.checkMultiple(
      ['step1', 'step2', 'step3'],
      traces
    );
    assert.property(conformance, 'averageFitness');
    assert.isAbove(conformance.averageFitness, 0.8);
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npm test tests/integration/supervision-end-to-end.test.mjs`
Expected: May fail initially (test fixtures needed)

- [ ] **Step 3: Create test fixtures**

Create: `test/fixtures/workflows/test-workflow.ttl`

```turtle
@prefix wf: <http://example.org/workflow#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

wf:test-workflow a wf:Workflow ;
  wf:step wf:step1, wf:step2, wf:step3 ;
  wf:dependency [
    wf:from wf:step1 ;
    wf:to wf:step2
  ], [
    wf:from wf:step2 ;
    wf:to wf:step3
  ] .

wf:step1 a wf:Step ;
  wf:type "test" ;
  wf:handler "test-handler-1" .

wf:step2 a wf:Step ;
  wf:type "test" ;
  wf:handler "test-handler-2" .

wf:step3 a wf:Step ;
  wf:type "test" ;
  wf:handler "test-handler-3" .
```

- [ ] **Step 4: Run integration test again**

Run: `npm test tests/integration/supervision-end-to-end.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/integration/supervision-end-to-end.test.mjs test/fixtures/workflows/test-workflow.ttl
git commit -m "test(integration): add end-to-end supervision test with process mining"
```

---

### Task 11: GitVanSupervisor (Root)

**Files:**
- Create: `src/supervision/gitvan-supervisor.mjs`
- Create: `tests/supervision/gitvan-supervisor.test.mjs`

- [ ] **Step 1: Write failing test**

```javascript
// tests/supervision/gitvan-supervisor.test.mjs
import { describe, it, beforeEach, afterEach } from 'vitest';
import { GitVanSupervisor } from '../../src/supervision/gitvan-supervisor.mjs';
import { WorkflowSupervisor } from '../../src/supervision/workflow-supervisor.mjs';

describe('GitVanSupervisor', () => {
  let supervisor;

  beforeEach(() => {
    supervisor = new GitVanSupervisor({
      id: 'gitvan-root'
    });
  });

  afterEach(async () => {
    await supervisor.stop();
  });

  it('should manage child supervisors', async () => {
    const workflowSupervisor = new WorkflowSupervisor({
      id: 'workflow-supervisor'
    });

    supervisor.addChild(workflowSupervisor);
    await supervisor.start();

    expect(supervisor.getChild('workflow-supervisor')).to.exist;
    expect(supervisor.getHealth().isRunning).to.be.true;
  });

  it('should handle child supervisor crash', async () => {
    const workflowSupervisor = new WorkflowSupervisor({
      id: 'workflow-supervisor'
    });

    supervisor.addChild(workflowSupervisor);
    await supervisor.start();

    // Simulate crash
    await supervisor.handleChildCrash('workflow-supervisor', new Error('Test crash'));

    // Should attempt restart
    const health = supervisor.getHealth();
    expect(health.restartCounts['workflow-supervisor']).to.equal(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/supervision/gitvan-supervisor.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement GitVanSupervisor**

```javascript
// src/supervision/gitvan-supervisor.mjs
import { BaseSupervisor } from './base-supervisor.mjs';
import { RestartStrategies, shouldRestart } from './restart-strategies.mjs';
import { CrashLogger } from './crash-logger.mjs';
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('supervision:gitvan');

export class GitVanSupervisor extends BaseSupervisor {
  constructor(options = {}) {
    super({
      ...options,
      id: options.id || 'gitvan-root',
      maxRestarts: options.maxRestarts || 5
    });

    this.strategy = options.strategy || RestartStrategies.ONE_FOR_ONE;
    this.crashLogger = new CrashLogger({
      cwd: options.cwd || process.cwd(),
      dryRun: options.dryRun || false
    });

    // System health metrics
    this.startTime = null;
    this.totalRestarts = 0;
    this.totalCrashes = 0;
  }

  async start() {
    await super.start();
    this.startTime = Date.now();
    logger.info(`GitVan supervisor started with ${this.children.size} children`);
  }

  async stop() {
    logger.info('Stopping GitVan supervisor');
    await super.stop();
  }

  async handleChildCrash(childId, error, crashContext = {}) {
    this.totalCrashes++;

    logger.error(`Child supervisor crashed: ${childId}`, {
      error: error.message,
      stack: error.stack
    });

    // Log crash to Git notes
    await this.crashLogger.logCrash({
      processId: childId,
      processType: 'supervisor',
      error,
      timestamp: new Date(),
      context: {
        ...crashContext,
        supervisorId: this.id,
        totalCrashes: this.totalCrashes
      }
    });

    // Determine restart strategy
    if (!shouldRestart(error)) {
      logger.error(`Non-restartable error in ${childId}, not restarting`);
      this.removeChild(childId);
      return { action: 'stopped', reason: 'permanent_error' };
    }

    if (!this.shouldRestartChild(childId)) {
      logger.error(`Max restarts exceeded for ${childId}, stopping`);
      this.removeChild(childId);
      return { action: 'stopped', reason: 'max_restarts' };
    }

    // Execute restart strategy
    const restartCount = this.incrementRestartCount(childId);
    this.totalRestarts++;

    logger.info(`Restarting child supervisor: ${childId} (restart #${restartCount})`);

    try {
      const child = this.getChild(childId);

      if (this.strategy === RestartStrategies.ONE_FOR_ONE) {
        await this._restartChild(child);
      } else if (this.strategy === RestartStrategies.REST_FOR_ONE) {
        await this._restartChildAndDependents(child);
      } else if (this.strategy === RestartStrategies.ONE_FOR_ALL) {
        await this._restartAllChildren();
      }

      return { action: 'restarted', childId, restartCount };
    } catch (restartError) {
      logger.error(`Failed to restart ${childId}: ${restartError.message}`);
      this.removeChild(childId);
      return { action: 'failed', childId, error: restartError.message };
    }
  }

  async _restartChild(child) {
    if (typeof child.restart === 'function') {
      await child.restart();
    } else if (typeof child.start === 'function') {
      await child.start();
    }
  }

  async _restartChildAndDependents(child) {
    const dependents = this._getDependents(child);
    const childrenToRestart = [child, ...dependents];

    for (const c of childrenToRestart) {
      await this._restartChild(c);
    }
  }

  async _restartAllChildren() {
    for (const child of this.children.values()) {
      await this._restartChild(child);
    }
  }

  _getDependents(child) {
    // For GitVan, dependencies are:
    // - WorkflowSupervisor depends on JobSupervisor
    // - StepSupervisor depends on WorkflowSupervisor
    const dependents = [];

    if (child.id.includes('workflow')) {
      // Find steps that depend on this workflow
      for (const [id, c] of this.children) {
        if (id.includes('step') && c.workflowId === child.id) {
          dependents.push(c);
        }
      }
    }

    return dependents;
  }

  getSystemHealth() {
    const uptime = this.startTime ? Date.now() - this.startTime : 0;

    return {
      ...this.getHealth(),
      uptime,
      totalRestarts: this.totalRestarts,
      totalCrashes: this.totalCrashes,
      strategy: this.strategy,
      childrenHealth: Array.from(this.children.values()).map(child => child.getHealth?.() || {})
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test tests/supervision/gitvan-supervisor.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/supervision/gitvan-supervisor.mjs tests/supervision/gitvan-supervisor.test.mjs
git commit -m "feat(supervision): add GitVanSupervisor root with crash handling and restart strategies"
```

---

## Success Criteria Verification

After implementation, verify:

- [ ] **80% reduction in cascading failures**: Run chaos tests, compare before/after
- [ ] **50% faster MTTR**: Measure recovery time in failure scenarios
- [ ] **Real-time bottleneck visibility**: Check BottleneckDetector output
- [ ] **Automated deviation detection**: Verify ConformanceChecker results
- [ ] **Crash logs in Git notes**: Check `refs/notes/gitvan/crashes`
- [ ] **Supervision metrics**: Check StepSupervisor.getMetrics()

## Rollback Plan

If issues arise:
1. Disable supervision: Set `supervision: { enabled: false }` in config
2. Process mining is read-only, safe to keep
3. Git notes don't affect workflow execution
4. Each phase can be rolled back independently via git revert
