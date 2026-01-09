import { test, describe, beforeEach, afterEach, expect } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Mock KnowledgeSubstrate for RDF operations
 * Simulates UnRDF KnowledgeSubstrateCore functionality
 */
class MockKnowledgeSubstrate {
  constructor() {
    this.triples = [];
    this.hooks = [];
  }

  async insert(subject, predicate, object) {
    const triple = { subject, predicate, object, timestamp: new Date().toISOString() };
    this.triples.push(triple);

    // Trigger hooks
    for (const hook of this.hooks) {
      if (hook.predicate === predicate) {
        await hook.handler({ subject, predicate, object });
      }
    }

    return triple;
  }

  async select(pattern) {
    return this.triples.filter(triple => {
      if (pattern.subject && triple.subject !== pattern.subject) return false;
      if (pattern.predicate && triple.predicate !== pattern.predicate) return false;
      if (pattern.object && triple.object !== pattern.object) return false;
      return true;
    });
  }

  async ask(query) {
    // SPARQL ASK query simulation
    const results = await this.select(query);
    return results.length > 0;
  }

  async describe(uri) {
    return this.triples.filter(triple =>
      triple.subject === uri || triple.object === uri
    );
  }

  async delete(subject, predicate, object) {
    this.triples = this.triples.filter(triple =>
      !(triple.subject === subject &&
        triple.predicate === predicate &&
        triple.object === object)
    );
  }

  async update(subject, predicate, oldObject, newObject) {
    await this.delete(subject, predicate, oldObject);
    await this.insert(subject, predicate, newObject);
  }

  async registerHook(hook) {
    this.hooks.push(hook);
  }

  async clear() {
    this.triples = [];
    this.hooks = [];
  }

  async size() {
    return this.triples.length;
  }
}

/**
 * Mock RDFQueueManager implementation
 * Based on Phase 1 Week 3 specification
 */
class RDFQueueManager {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.logger = options.logger || console;
    this.knowledgeSubstrate = options.knowledgeSubstrate || new MockKnowledgeSubstrate();
    this.jobs = new Map();
  }

  async initialize() {
    this.logger.info('RDFQueueManager initialized');
  }

  async shutdown() {
    this.jobs.clear();
  }

  async addJob(jobId, options = {}) {
    const {
      name = jobId,
      priority = 'https://gitvan.dev/queue#Normal',
      status = 'https://gitvan.dev/queue#Pending',
      dependencies = [],
      metadata = {}
    } = options;

    const jobUri = `https://gitvan.dev/queue/job/${jobId}`;
    const createdAt = new Date().toISOString();

    // Insert RDF triples
    await this.knowledgeSubstrate.insert(
      jobUri,
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      'https://gitvan.dev/queue#Job'
    );
    await this.knowledgeSubstrate.insert(
      jobUri,
      'https://gitvan.dev/queue#jobId',
      jobId
    );
    await this.knowledgeSubstrate.insert(
      jobUri,
      'https://gitvan.dev/queue#jobName',
      name
    );
    await this.knowledgeSubstrate.insert(
      jobUri,
      'https://gitvan.dev/queue#status',
      status
    );
    await this.knowledgeSubstrate.insert(
      jobUri,
      'https://gitvan.dev/queue#priority',
      priority
    );
    await this.knowledgeSubstrate.insert(
      jobUri,
      'https://gitvan.dev/queue#createdAt',
      createdAt
    );

    // Add dependencies
    for (const depId of dependencies) {
      const depUri = `https://gitvan.dev/queue/job/${depId}`;
      await this.knowledgeSubstrate.insert(
        jobUri,
        'https://gitvan.dev/queue#dependsOn',
        depUri
      );
    }

    // Store job in memory cache
    this.jobs.set(jobId, {
      jobId,
      name,
      priority,
      status,
      dependencies,
      metadata,
      createdAt
    });

    return jobUri;
  }

  async getJobInfo(jobId) {
    const jobUri = `https://gitvan.dev/queue/job/${jobId}`;
    const triples = await this.knowledgeSubstrate.describe(jobUri);

    if (triples.length === 0) {
      return null;
    }

    const job = { jobId, uri: jobUri };

    for (const triple of triples) {
      if (triple.predicate === 'https://gitvan.dev/queue#jobName') {
        job.name = triple.object;
      }
      if (triple.predicate === 'https://gitvan.dev/queue#status') {
        job.status = triple.object;
      }
      if (triple.predicate === 'https://gitvan.dev/queue#priority') {
        job.priority = triple.object;
      }
      if (triple.predicate === 'https://gitvan.dev/queue#createdAt') {
        job.createdAt = triple.object;
      }
      if (triple.predicate === 'https://gitvan.dev/queue#dependsOn') {
        job.dependencies = job.dependencies || [];
        job.dependencies.push(triple.object);
      }
    }

    return job;
  }

  async updateJobStatus(jobId, newStatus) {
    const jobUri = `https://gitvan.dev/queue/job/${jobId}`;

    // Get current status
    const statusTriples = await this.knowledgeSubstrate.select({
      subject: jobUri,
      predicate: 'https://gitvan.dev/queue#status'
    });

    if (statusTriples.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }

    const oldStatus = statusTriples[0].object;

    // Update status
    await this.knowledgeSubstrate.update(
      jobUri,
      'https://gitvan.dev/queue#status',
      oldStatus,
      newStatus
    );

    // Record timestamp
    const timestamp = new Date().toISOString();
    if (newStatus === 'https://gitvan.dev/queue#Running') {
      await this.knowledgeSubstrate.insert(
        jobUri,
        'https://gitvan.dev/queue#startedAt',
        timestamp
      );
    } else if (newStatus === 'https://gitvan.dev/queue#Completed') {
      await this.knowledgeSubstrate.insert(
        jobUri,
        'https://gitvan.dev/queue#completedAt',
        timestamp
      );
    } else if (newStatus === 'https://gitvan.dev/queue#Failed') {
      await this.knowledgeSubstrate.insert(
        jobUri,
        'https://gitvan.dev/queue#failedAt',
        timestamp
      );
    }

    return true;
  }

  async listJobsByStatus(status) {
    const statusUri = `https://gitvan.dev/queue#${status}`;
    const triples = await this.knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/queue#status',
      object: statusUri
    });

    return triples.map(triple => {
      const jobId = triple.subject.split('/').pop();
      return jobId;
    });
  }

  async removeCompletedJobs() {
    const completedJobs = await this.listJobsByStatus('Completed');
    let removedCount = 0;

    for (const jobId of completedJobs) {
      const jobUri = `https://gitvan.dev/queue/job/${jobId}`;
      const triples = await this.knowledgeSubstrate.describe(jobUri);

      // Remove all triples for this job
      for (const triple of triples) {
        await this.knowledgeSubstrate.delete(
          triple.subject,
          triple.predicate,
          triple.object
        );
      }

      this.jobs.delete(jobId);
      removedCount++;
    }

    return removedCount;
  }

  async topologicalSort() {
    // Get all pending jobs
    const pendingJobs = await this.listJobsByStatus('Pending');
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = async (jobId) => {
      if (visited.has(jobId)) return;
      if (visiting.has(jobId)) {
        throw new Error(`Circular dependency detected involving job ${jobId}`);
      }

      visiting.add(jobId);

      const jobInfo = await this.getJobInfo(jobId);
      if (jobInfo && jobInfo.dependencies) {
        for (const depUri of jobInfo.dependencies) {
          const depId = depUri.split('/').pop();
          await visit(depId);
        }
      }

      visiting.delete(jobId);
      visited.add(jobId);
      sorted.push(jobId);
    };

    for (const jobId of pendingJobs) {
      await visit(jobId);
    }

    return sorted;
  }

  async detectCircularDependency() {
    try {
      await this.topologicalSort();
      return false;
    } catch (error) {
      if (error.message.includes('Circular dependency')) {
        return true;
      }
      throw error;
    }
  }

  async getBlockingChain(jobId) {
    const jobInfo = await this.getJobInfo(jobId);
    if (!jobInfo || !jobInfo.dependencies) {
      return [];
    }

    const chain = [];
    const visited = new Set();

    const traverse = async (currentId) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const info = await this.getJobInfo(currentId);
      if (info && info.dependencies) {
        for (const depUri of info.dependencies) {
          const depId = depUri.split('/').pop();
          chain.push(depId);
          await traverse(depId);
        }
      }
    };

    await traverse(jobId);
    return chain;
  }

  async getJobDependents(jobId) {
    const jobUri = `https://gitvan.dev/queue/job/${jobId}`;
    const triples = await this.knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/queue#dependsOn',
      object: jobUri
    });

    return triples.map(triple => {
      const dependentId = triple.subject.split('/').pop();
      return dependentId;
    });
  }

  async calculateJobDepth(jobId) {
    const jobInfo = await this.getJobInfo(jobId);
    if (!jobInfo || !jobInfo.dependencies || jobInfo.dependencies.length === 0) {
      return 0;
    }

    let maxDepth = 0;
    for (const depUri of jobInfo.dependencies) {
      const depId = depUri.split('/').pop();
      const depDepth = await this.calculateJobDepth(depId);
      maxDepth = Math.max(maxDepth, depDepth + 1);
    }

    return maxDepth;
  }

  async findCriticalPath() {
    const allJobs = Array.from(this.jobs.keys());
    let criticalPath = [];
    let maxDepth = -1;

    for (const jobId of allJobs) {
      const depth = await this.calculateJobDepth(jobId);
      if (depth > maxDepth) {
        maxDepth = depth;
        criticalPath = [jobId];
      } else if (depth === maxDepth) {
        criticalPath.push(jobId);
      }
    }

    return { jobs: criticalPath, depth: maxDepth };
  }

  async identifyBlockingJobs() {
    const allJobs = Array.from(this.jobs.keys());
    const blockingJobs = [];

    for (const jobId of allJobs) {
      const dependents = await this.getJobDependents(jobId);
      if (dependents.length > 0) {
        const jobInfo = await this.getJobInfo(jobId);
        if (jobInfo && jobInfo.status !== 'https://gitvan.dev/queue#Completed') {
          blockingJobs.push({
            jobId,
            blockingCount: dependents.length,
            dependents
          });
        }
      }
    }

    return blockingJobs.sort((a, b) => b.blockingCount - a.blockingCount);
  }

  async getPerformanceImpactingJobs() {
    const criticalPath = await this.findCriticalPath();
    const blockingJobs = await this.identifyBlockingJobs();

    // Jobs that are both on critical path AND blocking others
    const impactingJobs = criticalPath.jobs.filter(jobId =>
      blockingJobs.some(bj => bj.jobId === jobId)
    );

    return impactingJobs;
  }

  getStatus() {
    return {
      totalJobs: this.jobs.size,
      pending: Array.from(this.jobs.values()).filter(
        j => j.status === 'https://gitvan.dev/queue#Pending'
      ).length,
      running: Array.from(this.jobs.values()).filter(
        j => j.status === 'https://gitvan.dev/queue#Running'
      ).length,
      completed: Array.from(this.jobs.values()).filter(
        j => j.status === 'https://gitvan.dev/queue#Completed'
      ).length,
      failed: Array.from(this.jobs.values()).filter(
        j => j.status === 'https://gitvan.dev/queue#Failed'
      ).length
    };
  }
}

describe('RDFQueueManager Tests', () => {
  let testDir;
  let queueManager;
  let knowledgeSubstrate;

  beforeEach(async () => {
    testDir = join(process.cwd(), 'test-rdf-queue-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });

    knowledgeSubstrate = new MockKnowledgeSubstrate();
    queueManager = new RDFQueueManager({
      cwd: testDir,
      logger: { info: () => {}, warn: () => {}, error: () => {} }, // Silent logger
      knowledgeSubstrate
    });

    await queueManager.initialize();
  });

  afterEach(async () => {
    if (queueManager) {
      await queueManager.shutdown();
    }

    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up test directory: ${error.message}`);
    }
  });

  // ============================================================================
  // Basic Operations (5 tests)
  // ============================================================================

  test('should add job to queue with RDF triples', async () => {
    const jobUri = await queueManager.addJob('job-1', {
      name: 'Test Job',
      priority: 'https://gitvan.dev/queue#High'
    });

    expect(jobUri).toBeDefined();
    expect(jobUri).toContain('job-1');

    // Verify RDF triples were created
    const triples = await knowledgeSubstrate.select({
      predicate: 'https://gitvan.dev/queue#jobId',
      object: 'job-1'
    });
    expect(triples.length).toBe(1);
  });

  test('should get job info from RDF', async () => {
    await queueManager.addJob('job-2', {
      name: 'Job Two',
      priority: 'https://gitvan.dev/queue#Normal'
    });

    const jobInfo = await queueManager.getJobInfo('job-2');

    expect(jobInfo).toBeDefined();
    expect(jobInfo.jobId).toBe('job-2');
    expect(jobInfo.name).toBe('Job Two');
    expect(jobInfo.status).toBe('https://gitvan.dev/queue#Pending');
  });

  test('should update job status in RDF', async () => {
    await queueManager.addJob('job-3');

    await queueManager.updateJobStatus('job-3', 'https://gitvan.dev/queue#Running');

    const jobInfo = await queueManager.getJobInfo('job-3');
    expect(jobInfo.status).toBe('https://gitvan.dev/queue#Running');

    await queueManager.updateJobStatus('job-3', 'https://gitvan.dev/queue#Completed');

    const updatedInfo = await queueManager.getJobInfo('job-3');
    expect(updatedInfo.status).toBe('https://gitvan.dev/queue#Completed');
  });

  test('should list jobs by status', async () => {
    await queueManager.addJob('job-pending-1', {
      status: 'https://gitvan.dev/queue#Pending'
    });
    await queueManager.addJob('job-pending-2', {
      status: 'https://gitvan.dev/queue#Pending'
    });
    await queueManager.addJob('job-running-1', {
      status: 'https://gitvan.dev/queue#Running'
    });

    const pendingJobs = await queueManager.listJobsByStatus('Pending');
    expect(pendingJobs.length).toBe(2);

    const runningJobs = await queueManager.listJobsByStatus('Running');
    expect(runningJobs.length).toBe(1);
  });

  test('should remove completed jobs', async () => {
    await queueManager.addJob('job-complete-1', {
      status: 'https://gitvan.dev/queue#Completed'
    });
    await queueManager.addJob('job-complete-2', {
      status: 'https://gitvan.dev/queue#Completed'
    });
    await queueManager.addJob('job-pending', {
      status: 'https://gitvan.dev/queue#Pending'
    });

    const removedCount = await queueManager.removeCompletedJobs();
    expect(removedCount).toBe(2);

    const completedJobs = await queueManager.listJobsByStatus('Completed');
    expect(completedJobs.length).toBe(0);

    const pendingJobs = await queueManager.listJobsByStatus('Pending');
    expect(pendingJobs.length).toBe(1);
  });

  // ============================================================================
  // Dependency Handling (6 tests)
  // ============================================================================

  test('should add job with dependencies', async () => {
    await queueManager.addJob('job-dep-a');
    await queueManager.addJob('job-dep-b', {
      dependencies: ['job-dep-a']
    });

    const jobInfo = await queueManager.getJobInfo('job-dep-b');
    expect(jobInfo.dependencies).toBeDefined();
    expect(jobInfo.dependencies.length).toBe(1);
    expect(jobInfo.dependencies[0]).toContain('job-dep-a');
  });

  test('should perform topological sort (no deps first)', async () => {
    // Create dependency chain: job-3 → job-2 → job-1
    await queueManager.addJob('job-1');
    await queueManager.addJob('job-2', { dependencies: ['job-1'] });
    await queueManager.addJob('job-3', { dependencies: ['job-2'] });

    const sorted = await queueManager.topologicalSort();

    expect(sorted.length).toBe(3);

    // job-1 should come before job-2
    const indexJob1 = sorted.indexOf('job-1');
    const indexJob2 = sorted.indexOf('job-2');
    const indexJob3 = sorted.indexOf('job-3');

    expect(indexJob1).toBeLessThan(indexJob2);
    expect(indexJob2).toBeLessThan(indexJob3);
  });

  test('should detect circular dependencies', async () => {
    await queueManager.addJob('job-circular-a');
    await queueManager.addJob('job-circular-b', {
      dependencies: ['job-circular-a']
    });

    // Manually create circular dependency: A → B → A
    const jobAUri = 'https://gitvan.dev/queue/job/job-circular-a';
    const jobBUri = 'https://gitvan.dev/queue/job/job-circular-b';
    await knowledgeSubstrate.insert(
      jobAUri,
      'https://gitvan.dev/queue#dependsOn',
      jobBUri
    );

    const hasCircular = await queueManager.detectCircularDependency();
    expect(hasCircular).toBe(true);
  });

  test('should identify blocking chain for job', async () => {
    await queueManager.addJob('chain-1');
    await queueManager.addJob('chain-2', { dependencies: ['chain-1'] });
    await queueManager.addJob('chain-3', { dependencies: ['chain-2'] });
    await queueManager.addJob('chain-4', { dependencies: ['chain-3'] });

    const blockingChain = await queueManager.getBlockingChain('chain-4');

    expect(blockingChain.length).toBeGreaterThan(0);
    expect(blockingChain).toContain('chain-3');
    expect(blockingChain).toContain('chain-2');
    expect(blockingChain).toContain('chain-1');
  });

  test('should query job dependents', async () => {
    await queueManager.addJob('dep-source');
    await queueManager.addJob('dep-target-1', { dependencies: ['dep-source'] });
    await queueManager.addJob('dep-target-2', { dependencies: ['dep-source'] });
    await queueManager.addJob('dep-target-3', { dependencies: ['dep-source'] });

    const dependents = await queueManager.getJobDependents('dep-source');

    expect(dependents.length).toBe(3);
    expect(dependents).toContain('dep-target-1');
    expect(dependents).toContain('dep-target-2');
    expect(dependents).toContain('dep-target-3');
  });

  test('should handle complex DAG with multiple branches', async () => {
    // Create complex DAG:
    //       job-1
    //      /  |  \
    //  job-2 job-3 job-4
    //      \  |  /
    //       job-5

    await queueManager.addJob('dag-1');
    await queueManager.addJob('dag-2', { dependencies: ['dag-1'] });
    await queueManager.addJob('dag-3', { dependencies: ['dag-1'] });
    await queueManager.addJob('dag-4', { dependencies: ['dag-1'] });
    await queueManager.addJob('dag-5', {
      dependencies: ['dag-2', 'dag-3', 'dag-4']
    });

    const sorted = await queueManager.topologicalSort();

    expect(sorted.length).toBe(5);

    // dag-1 should be first
    expect(sorted[0]).toBe('dag-1');

    // dag-5 should be last
    expect(sorted[sorted.length - 1]).toBe('dag-5');

    // dag-2, dag-3, dag-4 should come after dag-1 and before dag-5
    const indexDag1 = sorted.indexOf('dag-1');
    const indexDag2 = sorted.indexOf('dag-2');
    const indexDag3 = sorted.indexOf('dag-3');
    const indexDag4 = sorted.indexOf('dag-4');
    const indexDag5 = sorted.indexOf('dag-5');

    expect(indexDag2).toBeGreaterThan(indexDag1);
    expect(indexDag3).toBeGreaterThan(indexDag1);
    expect(indexDag4).toBeGreaterThan(indexDag1);
    expect(indexDag5).toBeGreaterThan(indexDag2);
    expect(indexDag5).toBeGreaterThan(indexDag3);
    expect(indexDag5).toBeGreaterThan(indexDag4);
  });

  // ============================================================================
  // Critical Path (4 tests)
  // ============================================================================

  test('should calculate job depth in dependency DAG', async () => {
    await queueManager.addJob('depth-0');
    await queueManager.addJob('depth-1', { dependencies: ['depth-0'] });
    await queueManager.addJob('depth-2', { dependencies: ['depth-1'] });
    await queueManager.addJob('depth-3', { dependencies: ['depth-2'] });

    const depth0 = await queueManager.calculateJobDepth('depth-0');
    const depth1 = await queueManager.calculateJobDepth('depth-1');
    const depth2 = await queueManager.calculateJobDepth('depth-2');
    const depth3 = await queueManager.calculateJobDepth('depth-3');

    expect(depth0).toBe(0);
    expect(depth1).toBe(1);
    expect(depth2).toBe(2);
    expect(depth3).toBe(3);
  });

  test('should find critical path in job DAG', async () => {
    // Critical path: long-1 → long-2 → long-3 → long-4 (depth 3)
    // Side path: short-1 → short-2 (depth 1)
    await queueManager.addJob('long-1');
    await queueManager.addJob('long-2', { dependencies: ['long-1'] });
    await queueManager.addJob('long-3', { dependencies: ['long-2'] });
    await queueManager.addJob('long-4', { dependencies: ['long-3'] });

    await queueManager.addJob('short-1');
    await queueManager.addJob('short-2', { dependencies: ['short-1'] });

    const criticalPath = await queueManager.findCriticalPath();

    expect(criticalPath.depth).toBe(3);
    expect(criticalPath.jobs).toContain('long-4');
  });

  test('should identify blocking jobs', async () => {
    await queueManager.addJob('blocker', {
      status: 'https://gitvan.dev/queue#Pending'
    });
    await queueManager.addJob('blocked-1', { dependencies: ['blocker'] });
    await queueManager.addJob('blocked-2', { dependencies: ['blocker'] });
    await queueManager.addJob('blocked-3', { dependencies: ['blocker'] });

    const blockingJobs = await queueManager.identifyBlockingJobs();

    expect(blockingJobs.length).toBeGreaterThan(0);
    const blocker = blockingJobs.find(bj => bj.jobId === 'blocker');
    expect(blocker).toBeDefined();
    expect(blocker.blockingCount).toBe(3);
  });

  test('should identify performance-impacting jobs', async () => {
    // Create jobs that are both on critical path AND blocking others
    await queueManager.addJob('impact-1');
    await queueManager.addJob('impact-2', { dependencies: ['impact-1'] });
    await queueManager.addJob('impact-3', { dependencies: ['impact-2'] });

    // Add parallel branches that depend on impact-2
    await queueManager.addJob('parallel-1', { dependencies: ['impact-2'] });
    await queueManager.addJob('parallel-2', { dependencies: ['impact-2'] });

    const impactingJobs = await queueManager.getPerformanceImpactingJobs();

    // impact-2 should be identified as impacting (on critical path + blocking)
    expect(impactingJobs.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // Error Handling (4 tests)
  // ============================================================================

  test('should handle missing job gracefully', async () => {
    const jobInfo = await queueManager.getJobInfo('non-existent-job');
    expect(jobInfo).toBeNull();
  });

  test('should handle invalid dependency gracefully', async () => {
    await queueManager.addJob('invalid-dep-job', {
      dependencies: ['non-existent-dependency']
    });

    // Should not throw when getting blocking chain
    const chain = await queueManager.getBlockingChain('invalid-dep-job');
    expect(chain).toBeDefined();
  });

  test('should prevent circular dependency in topological sort', async () => {
    await queueManager.addJob('circ-a');
    await queueManager.addJob('circ-b', { dependencies: ['circ-a'] });

    // Manually create circular dependency
    const circAUri = 'https://gitvan.dev/queue/job/circ-a';
    const circBUri = 'https://gitvan.dev/queue/job/circ-b';
    await knowledgeSubstrate.insert(
      circAUri,
      'https://gitvan.dev/queue#dependsOn',
      circBUri
    );

    await expect(queueManager.topologicalSort()).rejects.toThrow('Circular dependency');
  });

  test('should handle status update errors', async () => {
    await expect(
      queueManager.updateJobStatus('non-existent', 'https://gitvan.dev/queue#Running')
    ).rejects.toThrow('Job non-existent not found');
  });

  // ============================================================================
  // Integration (3 tests)
  // ============================================================================

  test('should maintain RDF and in-memory state consistency', async () => {
    await queueManager.addJob('consistency-test', {
      name: 'Consistency Job',
      priority: 'https://gitvan.dev/queue#High'
    });

    // Check in-memory cache
    const status = queueManager.getStatus();
    expect(status.totalJobs).toBe(1);

    // Check RDF
    const jobInfo = await queueManager.getJobInfo('consistency-test');
    expect(jobInfo).toBeDefined();
    expect(jobInfo.name).toBe('Consistency Job');
  });

  test('should handle concurrent job operations', async () => {
    const operations = [];

    for (let i = 0; i < 20; i++) {
      operations.push(
        queueManager.addJob(`concurrent-job-${i}`, {
          priority: i % 2 === 0 ?
            'https://gitvan.dev/queue#High' :
            'https://gitvan.dev/queue#Normal'
        })
      );
    }

    const results = await Promise.all(operations);
    expect(results.length).toBe(20);

    const status = queueManager.getStatus();
    expect(status.totalJobs).toBe(20);
  });

  test('should maintain state consistency across operations', async () => {
    // Add jobs
    await queueManager.addJob('state-1');
    await queueManager.addJob('state-2');
    await queueManager.addJob('state-3');

    // Update statuses
    await queueManager.updateJobStatus('state-1', 'https://gitvan.dev/queue#Running');
    await queueManager.updateJobStatus('state-2', 'https://gitvan.dev/queue#Completed');

    // Check status counts
    const status = queueManager.getStatus();
    expect(status.pending).toBe(1); // state-3
    expect(status.running).toBe(1); // state-1
    expect(status.completed).toBe(1); // state-2

    // Verify RDF consistency
    const pendingJobs = await queueManager.listJobsByStatus('Pending');
    const runningJobs = await queueManager.listJobsByStatus('Running');
    const completedJobs = await queueManager.listJobsByStatus('Completed');

    expect(pendingJobs.length).toBe(1);
    expect(runningJobs.length).toBe(1);
    expect(completedJobs.length).toBe(1);
  });

  // ============================================================================
  // Performance Tests (2 additional tests)
  // ============================================================================

  test('should handle large number of jobs efficiently', async () => {
    const startTime = Date.now();

    // Add 100 jobs
    for (let i = 0; i < 100; i++) {
      await queueManager.addJob(`perf-job-${i}`, {
        priority: 'https://gitvan.dev/queue#Normal'
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in reasonable time (< 5 seconds)
    expect(duration).toBeLessThan(5000);

    const status = queueManager.getStatus();
    expect(status.totalJobs).toBe(100);
  });

  test('should efficiently query large dependency graphs', async () => {
    // Create a deep dependency chain
    await queueManager.addJob('chain-start');

    for (let i = 1; i <= 50; i++) {
      await queueManager.addJob(`chain-${i}`, {
        dependencies: [i === 1 ? 'chain-start' : `chain-${i - 1}`]
      });
    }

    const startTime = Date.now();
    const depth = await queueManager.calculateJobDepth('chain-50');
    const endTime = Date.now();

    expect(depth).toBe(50);
    expect(endTime - startTime).toBeLessThan(1000); // < 1 second
  });
});
