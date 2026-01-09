/**
 * RDFQueueManager Example
 *
 * Demonstrates how to use RDFQueueManager for job dependency management
 * with SPARQL-based graph operations.
 */

import { RDFQueueManager } from '../src/git-native/RDFQueueManager.mjs';
import { initializeGitVanOntologies } from '../src/core/KnowledgeSubstrateExtensions.mjs';

// Mock KnowledgeSubstrate for demonstration
// In production, use actual KnowledgeSubstrateCore from unrdf
class MockKnowledgeSubstrate {
  constructor() {
    this.store = {
      getQuads: () => [],
      // ... other Store methods
    };
  }
}

/**
 * Example 1: Basic job queue with RDF support
 */
async function example1_basicQueue() {
  console.log('\n=== Example 1: Basic Queue ===\n');

  // Initialize queue manager
  const queueManager = new RDFQueueManager({ cwd: process.cwd() });

  // Create knowledge substrate
  const ks = new MockKnowledgeSubstrate();

  // Initialize with RDF support
  await queueManager.initialize(ks);

  // Add a simple job
  const { jobId, result } = await queueManager.addJob(
    'high',
    async () => {
      console.log('Building project...');
      return { success: true, output: 'Build complete' };
    },
    {
      name: 'build-project',
      description: 'Build the entire project',
      timeout: 60000
    }
  );

  console.log(`Job added: ${jobId}`);

  // Get job information
  const job = await queueManager.getJob(jobId);
  console.log('Job info:', JSON.stringify(job, null, 2));

  await queueManager.shutdown();
}

/**
 * Example 2: Jobs with dependencies
 */
async function example2_dependencies() {
  console.log('\n=== Example 2: Job Dependencies ===\n');

  const queueManager = new RDFQueueManager({ cwd: process.cwd() });
  const ks = new MockKnowledgeSubstrate();
  await queueManager.initialize(ks);

  // Add jobs with dependency chain: lint → test → build → deploy

  const { jobId: lintId } = await queueManager.addJob(
    'high',
    async () => {
      console.log('Running linter...');
      return { passed: true };
    },
    {
      name: 'lint',
      jobId: 'lint-job',
      description: 'Run code linting'
    }
  );

  const { jobId: testId } = await queueManager.addJob(
    'high',
    async () => {
      console.log('Running tests...');
      return { passed: true, tests: 42 };
    },
    {
      name: 'test',
      jobId: 'test-job',
      description: 'Run test suite',
      dependsOn: ['lint-job']
    }
  );

  const { jobId: buildId } = await queueManager.addJob(
    'high',
    async () => {
      console.log('Building...');
      return { artifacts: ['dist/bundle.js'] };
    },
    {
      name: 'build',
      jobId: 'build-job',
      description: 'Build production bundle',
      dependsOn: ['test-job']
    }
  );

  const { jobId: deployId } = await queueManager.addJob(
    'high',
    async () => {
      console.log('Deploying...');
      return { deployed: true, url: 'https://example.com' };
    },
    {
      name: 'deploy',
      jobId: 'deploy-job',
      description: 'Deploy to production',
      dependsOn: ['build-job']
    }
  );

  // Get topological sort (execution order)
  const sortedJobs = await queueManager.topologicalSort();
  console.log('Execution order:', sortedJobs);

  // Get critical path
  const criticalPath = await queueManager.getCriticalPath();
  console.log('Critical path:', criticalPath);

  await queueManager.shutdown();
}

/**
 * Example 3: Circular dependency detection
 */
async function example3_circularDependencies() {
  console.log('\n=== Example 3: Circular Dependency Detection ===\n');

  const queueManager = new RDFQueueManager({ cwd: process.cwd() });
  const ks = new MockKnowledgeSubstrate();
  await queueManager.initialize(ks);

  // Check for circular dependencies
  const hasCircular = await queueManager.detectCircularDependencies();
  console.log('Has circular dependencies:', hasCircular);

  if (hasCircular) {
    console.error('ERROR: Circular dependencies detected!');
    throw new Error('Cannot proceed with circular dependencies');
  } else {
    console.log('✓ No circular dependencies found');
  }

  await queueManager.shutdown();
}

/**
 * Example 4: Job status tracking
 */
async function example4_statusTracking() {
  console.log('\n=== Example 4: Job Status Tracking ===\n');

  const queueManager = new RDFQueueManager({ cwd: process.cwd() });
  const ks = new MockKnowledgeSubstrate();
  await queueManager.initialize(ks);

  // Add a job
  const { jobId } = await queueManager.addJob(
    'high',
    async () => {
      console.log('Processing...');
      return { success: true };
    },
    {
      name: 'processing-job',
      description: 'Process data'
    }
  );

  // Track status changes
  console.log('Initial status:', (await queueManager.getJob(jobId)).status);

  await queueManager.updateJobStatus(jobId, 'Running');
  console.log('After start:', (await queueManager.getJob(jobId)).status);

  await queueManager.updateJobStatus(jobId, 'Completed');
  console.log('After completion:', (await queueManager.getJob(jobId)).status);

  // List all jobs by status
  const allJobs = await queueManager.listJobs();
  console.log('All jobs:', allJobs.length);

  const completedJobs = await queueManager.listJobs('Completed');
  console.log('Completed jobs:', completedJobs.length);

  await queueManager.shutdown();
}

/**
 * Example 5: Parallel job execution
 */
async function example5_parallelExecution() {
  console.log('\n=== Example 5: Parallel Job Execution ===\n');

  const queueManager = new RDFQueueManager({ cwd: process.cwd() });
  const ks = new MockKnowledgeSubstrate();
  await queueManager.initialize(ks);

  // Add multiple independent jobs (can run in parallel)
  const jobs = [];

  for (let i = 1; i <= 5; i++) {
    const { jobId } = await queueManager.addJob(
      'high',
      async () => {
        console.log(`Job ${i} executing...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { jobNumber: i, result: 'success' };
      },
      {
        name: `parallel-job-${i}`,
        jobId: `job-${i}`,
        description: `Parallel job ${i}`
      }
    );
    jobs.push(jobId);
  }

  // Get ready jobs (all should be ready since no dependencies)
  const readyJobs = await queueManager.topologicalSort();
  console.log('Ready for parallel execution:', readyJobs.length, 'jobs');

  await queueManager.shutdown();
}

/**
 * Example 6: Job dependents tracking
 */
async function example6_dependentsTracking() {
  console.log('\n=== Example 6: Dependents Tracking ===\n');

  const queueManager = new RDFQueueManager({ cwd: process.cwd() });
  const ks = new MockKnowledgeSubstrate();
  await queueManager.initialize(ks);

  // Create a job that others depend on
  const { jobId: baseJobId } = await queueManager.addJob(
    'high',
    async () => ({ result: 'base' }),
    {
      name: 'base-job',
      jobId: 'base',
      description: 'Foundation job'
    }
  );

  // Add dependent jobs
  await queueManager.addJob(
    'high',
    async () => ({ result: 'dep1' }),
    {
      name: 'dependent-1',
      jobId: 'dep1',
      dependsOn: ['base']
    }
  );

  await queueManager.addJob(
    'high',
    async () => ({ result: 'dep2' }),
    {
      name: 'dependent-2',
      jobId: 'dep2',
      dependsOn: ['base']
    }
  );

  // Find all jobs that depend on base job
  const dependents = await queueManager.getJobDependents('base');
  console.log('Jobs depending on base-job:', dependents);

  await queueManager.shutdown();
}

/**
 * Example 7: Cleanup completed jobs
 */
async function example7_cleanup() {
  console.log('\n=== Example 7: Cleanup Completed Jobs ===\n');

  const queueManager = new RDFQueueManager({ cwd: process.cwd() });
  const ks = new MockKnowledgeSubstrate();
  await queueManager.initialize(ks);

  // Add and complete some jobs
  for (let i = 1; i <= 3; i++) {
    const { jobId } = await queueManager.addJob(
      'high',
      async () => ({ result: `job-${i}` }),
      {
        name: `cleanup-job-${i}`,
        description: `Job ${i} for cleanup demo`
      }
    );

    await queueManager.updateJobStatus(jobId, 'Completed');
  }

  console.log('Jobs before cleanup:', (await queueManager.listJobs()).length);

  // Cleanup completed jobs
  const cleanedCount = await queueManager.cleanupCompleted();
  console.log('Cleaned up', cleanedCount, 'completed jobs');

  console.log('Jobs after cleanup:', (await queueManager.listJobs()).length);

  await queueManager.shutdown();
}

// Run examples
async function main() {
  try {
    await example1_basicQueue();
    await example2_dependencies();
    await example3_circularDependencies();
    await example4_statusTracking();
    await example5_parallelExecution();
    await example6_dependentsTracking();
    await example7_cleanup();

    console.log('\n✓ All examples completed successfully\n');
  } catch (error) {
    console.error('\n✗ Example failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Uncomment to run examples
// main();

export {
  example1_basicQueue,
  example2_dependencies,
  example3_circularDependencies,
  example4_statusTracking,
  example5_parallelExecution,
  example6_dependentsTracking,
  example7_cleanup
};
