/**
 * Test Utilities - Context Creation
 * Provides helpers for creating test contexts, jobs, and environments
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

/**
 * Create an isolated test context with a git repository
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Test context
 */
export async function createTestContext(options = {}) {
  const testId = options.testId || `test-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const cwd = options.cwd || join(tmpdir(), 'gitvan-test', testId);

  // Create directory
  await fs.mkdir(cwd, { recursive: true });

  // Initialize git repository
  try {
    await execAsync('git init', { cwd });
    await execAsync('git config user.email "test@example.com"', { cwd });
    await execAsync('git config user.name "Test User"', { cwd });

    // Create initial commit to ensure repository is usable
    await fs.writeFile(join(cwd, 'README.md'), '# Test Repository\n');
    await execAsync('git add README.md', { cwd });
    await execAsync('git commit -m "Initial commit"', { cwd });
  } catch (error) {
    throw new Error(`Failed to initialize test git repository: ${error.message}`);
  }

  return {
    cwd,
    testId,
    cleanup: async () => {
      try {
        await fs.rm(cwd, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup test context: ${error.message}`);
      }
    }
  };
}

/**
 * Create a test job definition
 * @param {string} cwd - Repository directory
 * @param {string} jobName - Name of the job
 * @param {Object} options - Job options
 * @returns {Promise<Object>} Job definition
 */
export async function createTestJob(cwd, jobName, options = {}) {
  const jobId = `job-${jobName}`;
  const runFunction = options.runFunction || `
export default async function run({ payload = {} } = {}) {
  return {
    success: true,
    job: '${jobName}',
    payload
  };
}
  `.trim();

  return {
    id: jobId,
    name: jobName,
    description: options.description || `Test job: ${jobName}`,
    runFunction,
    timeout: options.timeout || 30000,
    ttl: options.ttl || 300000,
    payload: options.payload || {}
  };
}

/**
 * Create multiple test jobs
 * @param {string} cwd - Repository directory
 * @param {string[]} jobNames - Job names
 * @returns {Promise<Object[]>} Array of job definitions
 */
export async function createTestJobs(cwd, jobNames = []) {
  return Promise.all(jobNames.map(name => createTestJob(cwd, name)));
}

/**
 * Write a test job to the filesystem
 * @param {string} cwd - Repository directory
 * @param {string} jobName - Job name
 * @param {Object} options - Job options
 * @returns {Promise<string>} Path to job file
 */
export async function writeTestJob(cwd, jobName, options = {}) {
  const jobsDir = join(cwd, 'jobs');
  await fs.mkdir(jobsDir, { recursive: true });

  const jobPath = join(jobsDir, `${jobName}.mjs`);
  const job = await createTestJob(cwd, jobName, options);

  await fs.writeFile(jobPath, job.runFunction);
  return jobPath;
}

/**
 * Create a deterministic test environment
 * @param {Function} fn - Test function to run
 * @param {Object} options - Configuration
 * @returns {Promise<*>} Function result
 */
export async function withTestEnvironment(fn, options = {}) {
  const context = await createTestContext(options);

  try {
    return await fn(context);
  } finally {
    await context.cleanup();
  }
}

/**
 * Create a test batch of contexts (for multi-context tests)
 * @param {number} count - Number of contexts to create
 * @param {Object} options - Configuration
 * @returns {Promise<Object[]>} Array of contexts
 */
export async function createTestContexts(count = 2, options = {}) {
  const contexts = [];

  for (let i = 0; i < count; i++) {
    const context = await createTestContext({
      ...options,
      testId: `batch-${Date.now()}-${i}`
    });
    contexts.push(context);
  }

  return contexts;
}

/**
 * Cleanup multiple test contexts
 * @param {Object[]} contexts - Array of contexts
 * @returns {Promise<void>}
 */
export async function cleanupTestContexts(contexts = []) {
  for (const context of contexts) {
    if (context && typeof context.cleanup === 'function') {
      await context.cleanup().catch(error => {
        console.warn(`Failed to cleanup context: ${error.message}`);
      });
    }
  }
}
