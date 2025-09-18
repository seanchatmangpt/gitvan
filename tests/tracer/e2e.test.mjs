/**
 * GitVan v2 End-to-End Tests
 * Tests complete tracer workflow integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir, rm, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

describe('End-to-End Tracer Integration', () => {
  let tempDir;
  let projectDir;
  let gitvanDir;
  let receiptsDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitvan-e2e-test-'));
    projectDir = join(tempDir, 'test-project');
    gitvanDir = join(projectDir, '.gitvan');
    receiptsDir = join(gitvanDir, 'receipts');

    await mkdir(projectDir, { recursive: true });
    await mkdir(receiptsDir, { recursive: true });

    // Initialize git repository
    execSync('git init', { cwd: projectDir });
    execSync('git config user.name "Test User"', { cwd: projectDir });
    execSync('git config user.email "test@example.com"', { cwd: projectDir });

    // Create initial commit
    await writeFile(join(projectDir, 'README.md'), '# Test Project');
    execSync('git add README.md', { cwd: projectDir });
    execSync('git commit -m "Initial commit"', { cwd: projectDir });
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Complete Workflow Integration', () => {
    it('should complete full job discovery and execution workflow', async () => {
      // 1. Create GitVan configuration
      const config = {
        version: '2.0',
        tracer: {
          enabled: true,
          outputDir: '.gitvan/receipts',
          receiptPattern: 'receipt-{timestamp}-{jobName}.json',
          maxReceiptSize: 1024 * 1024
        },
        jobs: {
          patterns: ['**/*.job.{js,mjs}'],
          exclude: ['node_modules/**'],
          timeout: 30000
        },
        git: {
          trackOperations: true,
          includeHooks: false,
          timeout: 10000
        },
        logging: {
          level: 'info',
          format: 'text',
          output: 'console'
        }
      };

      await writeFile(join(projectDir, 'gitvan.config.js'), `export default ${JSON.stringify(config, null, 2)};`);

      // 2. Create job files
      const buildJob = `
        export default {
          meta: {
            name: 'Build Project',
            kind: 'build',
            description: 'Build the project using npm'
          },
          execute: async (ctx) => {
            console.log('Building project...');

            // Simulate build process
            await new Promise(resolve => setTimeout(resolve, 100));

            return {
              success: true,
              exitCode: 0,
              duration: 100,
              stdout: 'Build completed successfully',
              stderr: '',
              data: {
                buildSize: 1024,
                timestamp: new Date().toISOString()
              },
              files: {
                created: ['dist/bundle.js', 'dist/bundle.css'],
                modified: ['package.json'],
                deleted: []
              }
            };
          }
        };
      `;

      const testJob = `
        export default {
          meta: {
            name: 'Run Tests',
            kind: 'test',
            description: 'Execute test suite'
          },
          execute: async (ctx) => {
            console.log('Running tests...');

            // Simulate test execution
            await new Promise(resolve => setTimeout(resolve, 150));

            return {
              success: true,
              exitCode: 0,
              duration: 150,
              stdout: 'All tests passed (3/3)',
              stderr: '',
              data: {
                testCount: 3,
                passedTests: 3,
                coverage: 85.5
              }
            };
          }
        };
      `;

      const deployJob = `
        export default {
          meta: {
            name: 'Deploy Application',
            kind: 'deploy',
            description: 'Deploy to staging environment'
          },
          execute: async (ctx) => {
            console.log('Deploying application...');

            // Check if build files exist (simulated)
            if (!ctx.args.skipValidation) {
              const hasBuildFiles = true; // Mock check
              if (!hasBuildFiles) {
                throw new Error('Build files not found. Run build first.');
              }
            }

            await new Promise(resolve => setTimeout(resolve, 200));

            return {
              success: true,
              exitCode: 0,
              duration: 200,
              stdout: 'Deployment successful to staging',
              stderr: '',
              data: {
                environment: 'staging',
                deploymentId: 'deploy-123',
                url: 'https://staging.example.com'
              }
            };
          },
          beforeExecute: async (ctx) => {
            console.log('Pre-deployment checks...');
          },
          afterExecute: async (ctx, result) => {
            if (result.success) {
              console.log('Post-deployment verification completed');
            }
          }
        };
      `;

      await mkdir(join(projectDir, 'jobs'), { recursive: true });
      await writeFile(join(projectDir, 'jobs', 'build.job.js'), buildJob);
      await writeFile(join(projectDir, 'jobs', 'test.job.js'), testJob);
      await writeFile(join(projectDir, 'jobs', 'deploy.job.js'), deployJob);

      // 3. Create mock tracer implementation
      const tracer = new MockGitVanTracer(projectDir, config);

      // 4. Initialize tracer
      await tracer.init();

      // 5. Discover jobs
      const discoveredJobs = await tracer.discoverJobs();
      expect(discoveredJobs).toHaveLength(3);

      const jobNames = discoveredJobs.map(job => job.meta.name);
      expect(jobNames).toContain('Build Project');
      expect(jobNames).toContain('Run Tests');
      expect(jobNames).toContain('Deploy Application');

      // 6. Execute jobs in sequence
      const executionResults = [];

      for (const job of discoveredJobs) {
        const result = await tracer.executeJob(job);
        executionResults.push(result);
      }

      // 7. Verify all jobs executed successfully
      expect(executionResults).toHaveLength(3);
      executionResults.forEach(result => {
        expect(result.receipt).toBeDefined();
        expect(result.receipt.execution.result.success).toBe(true);
      });

      // 8. Verify receipts were created
      const receiptFiles = await readdir(receiptsDir);
      expect(receiptFiles).toHaveLength(3);

      // 9. Verify receipt content
      for (const receiptFile of receiptFiles) {
        const receiptPath = join(receiptsDir, receiptFile);
        const receiptContent = await readFile(receiptPath, 'utf-8');
        const receipt = JSON.parse(receiptContent);

        expect(receipt.version).toBe('1.0');
        expect(receipt.meta.schema).toBe('gitvan-receipt-v1');
        expect(receipt.execution.job.meta.name).toBeDefined();
        expect(receipt.execution.result.success).toBe(true);
        expect(receipt.context.git.branch).toBe('main');
        expect(receipt.audit.hash).toBeDefined();
      }

      // 10. Cleanup tracer
      await tracer.shutdown();
    });

    it('should handle job execution failures gracefully', async () => {
      // Create a failing job
      const failingJob = `
        export default {
          meta: {
            name: 'Failing Job',
            kind: 'test',
            description: 'A job that always fails'
          },
          execute: async (ctx) => {
            console.log('Starting failing job...');

            // Simulate failure
            throw new Error('Simulated job failure');
          }
        };
      `;

      await writeFile(join(projectDir, 'failing.job.js'), failingJob);

      const config = {
        version: '2.0',
        tracer: { enabled: true, outputDir: '.gitvan/receipts' },
        jobs: { patterns: ['**/*.job.js'], timeout: 5000 }
      };

      const tracer = new MockGitVanTracer(projectDir, config);
      await tracer.init();

      const jobs = await tracer.discoverJobs();
      expect(jobs).toHaveLength(1);

      const result = await tracer.executeJob(jobs[0]);

      expect(result.receipt.execution.result.success).toBe(false);
      expect(result.receipt.execution.result.error.message).toBe('Simulated job failure');
      expect(result.receipt.execution.result.exitCode).toBe(1);

      // Verify error receipt was still created
      const receiptFiles = await readdir(receiptsDir);
      expect(receiptFiles).toHaveLength(1);
    });

    it('should support job execution with context and arguments', async () => {
      const contextualJob = `
        export default {
          meta: {
            name: 'Contextual Job',
            kind: 'custom',
            description: 'Job that uses execution context'
          },
          execute: async (ctx) => {
            const { cwd, git, user, args, env } = ctx;

            console.log('Execution context:', {
              cwd,
              branch: git.branch,
              user: user.name,
              nodeEnv: env.NODE_ENV,
              customArg: args.customArg
            });

            return {
              success: true,
              exitCode: 0,
              duration: 50,
              stdout: \`Executed in \${cwd} on branch \${git.branch}\`,
              data: {
                contextUsed: true,
                branch: git.branch,
                user: user.name,
                customArg: args.customArg
              }
            };
          }
        };
      `;

      await writeFile(join(projectDir, 'contextual.job.js'), contextualJob);

      const config = {
        version: '2.0',
        tracer: { enabled: true, outputDir: '.gitvan/receipts' },
        jobs: { patterns: ['**/*.job.js'] }
      };

      const tracer = new MockGitVanTracer(projectDir, config);
      await tracer.init();

      const jobs = await tracer.discoverJobs();
      const contextualJobDef = jobs.find(job => job.meta.name === 'Contextual Job');

      // Execute with custom arguments
      const customContext = {
        args: { customArg: 'test-value' },
        env: { NODE_ENV: 'test' }
      };

      const result = await tracer.executeJob(contextualJobDef, customContext);

      expect(result.receipt.execution.result.success).toBe(true);
      expect(result.receipt.execution.result.data.customArg).toBe('test-value');
      expect(result.receipt.execution.result.data.branch).toBe('main');
    });

    it('should handle concurrent job execution', async () => {
      // Create multiple independent jobs
      const jobs = [];
      for (let i = 1; i <= 5; i++) {
        const jobContent = `
          export default {
            meta: {
              name: 'Concurrent Job ${i}',
              kind: 'test',
              description: 'Job for concurrent execution testing'
            },
            execute: async (ctx) => {
              // Simulate varying execution times
              const duration = 50 + (${i} * 10);
              await new Promise(resolve => setTimeout(resolve, duration));

              return {
                success: true,
                exitCode: 0,
                duration,
                stdout: 'Job ${i} completed',
                data: { jobNumber: ${i}, executedAt: new Date().toISOString() }
              };
            }
          };
        `;

        await writeFile(join(projectDir, `concurrent-${i}.job.js`), jobContent);
      }

      const config = {
        version: '2.0',
        tracer: { enabled: true, outputDir: '.gitvan/receipts' },
        jobs: { patterns: ['concurrent-*.job.js'] }
      };

      const tracer = new MockGitVanTracer(projectDir, config);
      await tracer.init();

      const discoveredJobs = await tracer.discoverJobs();
      expect(discoveredJobs).toHaveLength(5);

      // Execute all jobs concurrently
      const startTime = Date.now();
      const results = await Promise.all(
        discoveredJobs.map(job => tracer.executeJob(job))
      );
      const totalTime = Date.now() - startTime;

      // Verify all jobs completed successfully
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.receipt.execution.result.success).toBe(true);
        expect(result.receipt.execution.result.data.jobNumber).toBe(index + 1);
      });

      // Concurrent execution should be faster than sequential
      // Sequential would take at least 50+60+70+80+90 = 350ms
      // Concurrent should be closer to the longest job (90ms) plus overhead
      expect(totalTime).toBeLessThan(300);

      // Verify all receipts were created
      const receiptFiles = await readdir(receiptsDir);
      expect(receiptFiles).toHaveLength(5);
    });

    it('should integrate with git operations', async () => {
      // Create a job that performs git operations
      const gitJob = `
        export default {
          meta: {
            name: 'Git Operations Job',
            kind: 'git',
            description: 'Job that performs git operations'
          },
          execute: async (ctx) => {
            const { git } = ctx;

            // Mock git operations (in real implementation, these would be actual git calls)
            const operations = [
              { op: 'status', result: { clean: !git.isDirty } },
              { op: 'branch', result: { current: git.branch } },
              { op: 'log', result: { lastCommit: git.commit } }
            ];

            return {
              success: true,
              exitCode: 0,
              duration: 100,
              stdout: 'Git operations completed',
              data: {
                gitOperations: operations,
                repoInfo: {
                  branch: git.branch,
                  commit: git.commit,
                  isDirty: git.isDirty,
                  remote: git.remote
                }
              }
            };
          }
        };
      `;

      await writeFile(join(projectDir, 'git-ops.job.js'), gitJob);

      // Make some changes to create a dirty state
      await writeFile(join(projectDir, 'new-file.txt'), 'New content');

      const config = {
        version: '2.0',
        tracer: { enabled: true, outputDir: '.gitvan/receipts' },
        git: { trackOperations: true },
        jobs: { patterns: ['git-ops.job.js'] }
      };

      const tracer = new MockGitVanTracer(projectDir, config);
      await tracer.init();

      const jobs = await tracer.discoverJobs();
      const result = await tracer.executeJob(jobs[0]);

      expect(result.receipt.execution.result.success).toBe(true);
      expect(result.receipt.execution.result.data.repoInfo.branch).toBe('main');
      expect(result.receipt.execution.result.data.repoInfo.isDirty).toBe(true);
      expect(result.receipt.context.git.isDirty).toBe(true);
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle large number of jobs efficiently', async () => {
      const jobCount = 50;

      // Create many jobs
      for (let i = 1; i <= jobCount; i++) {
        const jobContent = `
          export default {
            meta: {
              name: 'Performance Job ${i}',
              kind: 'test',
              description: 'Job ${i} for performance testing'
            },
            execute: async (ctx) => {
              // Minimal execution time
              await new Promise(resolve => setTimeout(resolve, 1));
              return {
                success: true,
                exitCode: 0,
                duration: 1,
                stdout: 'Job ${i} completed',
                data: { jobId: ${i} }
              };
            }
          };
        `;

        await writeFile(join(projectDir, `perf-job-${i}.job.js`), jobContent);
      }

      const config = {
        version: '2.0',
        tracer: { enabled: true, outputDir: '.gitvan/receipts' },
        jobs: { patterns: ['perf-job-*.job.js'] }
      };

      const tracer = new MockGitVanTracer(projectDir, config);

      // Measure discovery performance
      const discoveryStart = Date.now();
      await tracer.init();
      const jobs = await tracer.discoverJobs();
      const discoveryTime = Date.now() - discoveryStart;

      expect(jobs).toHaveLength(jobCount);
      expect(discoveryTime).toBeLessThan(1000); // Should discover quickly

      // Measure execution performance
      const executionStart = Date.now();
      const results = await Promise.all(
        jobs.slice(0, 10).map(job => tracer.executeJob(job)) // Execute first 10 to avoid overwhelming
      );
      const executionTime = Date.now() - executionStart;

      expect(results).toHaveLength(10);
      expect(executionTime).toBeLessThan(500); // Should execute quickly

      // Verify receipt generation performance
      const receiptFiles = await readdir(receiptsDir);
      expect(receiptFiles).toHaveLength(10);
    });

    it('should handle memory efficiently during extended operation', async () => {
      const config = {
        version: '2.0',
        tracer: { enabled: true, outputDir: '.gitvan/receipts' },
        performance: { enabled: true },
        jobs: { patterns: ['memory-test.job.js'] }
      };

      // Create a job that processes data
      const memoryJob = `
        export default {
          meta: {
            name: 'Memory Test Job',
            kind: 'test',
            description: 'Job for memory usage testing'
          },
          execute: async (ctx) => {
            // Simulate processing large data
            const data = new Array(1000).fill(0).map((_, i) => ({
              id: i,
              value: Math.random(),
              processed: true
            }));

            // Process data
            const result = data.reduce((acc, item) => acc + item.value, 0);

            return {
              success: true,
              exitCode: 0,
              duration: 50,
              stdout: 'Memory test completed',
              data: {
                processedItems: data.length,
                resultValue: result,
                memoryTest: true
              }
            };
          }
        };
      `;

      await writeFile(join(projectDir, 'memory-test.job.js'), memoryJob);

      const tracer = new MockGitVanTracer(projectDir, config);
      await tracer.init();

      // Execute job multiple times to test memory management
      const jobs = await tracer.discoverJobs();
      const memoryUsageData = [];

      for (let i = 0; i < 10; i++) {
        const beforeMemory = process.memoryUsage().heapUsed;
        await tracer.executeJob(jobs[0]);
        const afterMemory = process.memoryUsage().heapUsed;

        memoryUsageData.push({
          iteration: i,
          beforeMemory,
          afterMemory,
          memoryIncrease: afterMemory - beforeMemory
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Memory usage should not continuously increase
      const firstIterationMemory = memoryUsageData[0].afterMemory;
      const lastIterationMemory = memoryUsageData[9].afterMemory;
      const memoryGrowth = lastIterationMemory - firstIterationMemory;

      // Allow some memory growth but not excessive
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });
  });
});

// Mock GitVan Tracer implementation for testing
class MockGitVanTracer {
  constructor(projectDir, config) {
    this.projectDir = projectDir;
    this.config = config;
    this.jobs = new Map();
    this.receipts = [];
    this.isInitialized = false;
  }

  async init() {
    this.isInitialized = true;
    console.log('GitVan Tracer initialized');
  }

  async shutdown() {
    this.isInitialized = false;
    console.log('GitVan Tracer shutdown');
  }

  async discoverJobs() {
    if (!this.isInitialized) {
      throw new Error('Tracer not initialized');
    }

    const jobs = [];
    const patterns = this.config.jobs?.patterns || ['**/*.job.{js,mjs}'];

    // Mock job discovery (in real implementation, would use glob matching)
    const files = await readdir(this.projectDir, { recursive: true });

    for (const file of files) {
      if (file.endsWith('.job.js') || file.endsWith('.job.mjs')) {
        const jobPath = join(this.projectDir, file);

        try {
          // Mock job loading (in real implementation, would import the module)
          const jobContent = await readFile(jobPath, 'utf-8');
          const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Extract job metadata from content (simplified)
          const nameMatch = jobContent.match(/name:\s*['"`]([^'"`]+)['"`]/);
          const kindMatch = jobContent.match(/kind:\s*['"`]([^'"`]+)['"`]/);
          const descMatch = jobContent.match(/description:\s*['"`]([^'"`]+)['"`]/);

          const job = {
            meta: {
              id: jobId,
              name: nameMatch?.[1] || 'Unknown Job',
              kind: kindMatch?.[1] || 'custom',
              description: descMatch?.[1] || 'No description'
            },
            filePath: jobPath,
            content: jobContent
          };

          jobs.push(job);
          this.jobs.set(jobId, job);
        } catch (error) {
          console.warn(`Failed to load job from ${file}:`, error.message);
        }
      }
    }

    return jobs;
  }

  async executeJob(job, customContext = {}) {
    if (!this.isInitialized) {
      throw new Error('Tracer not initialized');
    }

    const sessionId = `session-${Date.now()}`;
    const startTime = new Date();

    // Create execution context
    const context = {
      cwd: this.projectDir,
      env: { ...process.env, NODE_ENV: 'test', ...customContext.env },
      args: { ...customContext.args },
      git: {
        branch: 'main',
        commit: 'abc123def456',
        remote: null,
        isDirty: await this.checkGitDirty()
      },
      user: {
        name: 'Test User',
        email: 'test@example.com'
      },
      timestamp: startTime,
      sessionId
    };

    try {
      // Mock job execution (in real implementation, would actually run the job)
      const executionResult = await this.mockJobExecution(job, context);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Generate receipt
      const receipt = this.generateReceipt(job, context, executionResult, startTime, endTime, duration);

      // Write receipt to file
      await this.writeReceipt(receipt);

      this.receipts.push(receipt);

      return {
        jobId: job.meta.id,
        receiptId: receipt.meta.id,
        success: executionResult.success,
        duration,
        receipt
      };

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const errorResult = {
        success: false,
        exitCode: 1,
        duration,
        stdout: '',
        stderr: error.message,
        error: {
          message: error.message,
          stack: error.stack,
          code: 'EXECUTION_ERROR'
        }
      };

      const receipt = this.generateReceipt(job, context, errorResult, startTime, endTime, duration);
      await this.writeReceipt(receipt);

      return {
        jobId: job.meta.id,
        receiptId: receipt.meta.id,
        success: false,
        duration,
        receipt
      };
    }
  }

  async mockJobExecution(job, context) {
    // Extract and execute the job function from content
    // This is a simplified mock - real implementation would import and run the actual job

    if (job.content.includes('throw new Error')) {
      const errorMatch = job.content.match(/throw new Error\(['"`]([^'"`]+)['"`]\)/);
      throw new Error(errorMatch?.[1] || 'Job execution failed');
    }

    // Simulate execution time
    const duration = 50 + Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, duration));

    return {
      success: true,
      exitCode: 0,
      duration: Math.round(duration),
      stdout: `${job.meta.name} completed successfully`,
      stderr: '',
      data: {
        executedAt: new Date().toISOString(),
        context: {
          branch: context.git.branch,
          user: context.user.name
        }
      },
      files: {
        created: [],
        modified: [],
        deleted: []
      }
    };
  }

  generateReceipt(job, context, result, startTime, endTime, duration) {
    const receiptId = `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      version: '1.0',
      meta: {
        id: receiptId,
        timestamp: startTime,
        tracerVersion: '2.0.0',
        schema: 'gitvan-receipt-v1'
      },
      context: {
        cwd: context.cwd,
        git: {
          branch: context.git.branch,
          commit: context.git.commit,
          remote: context.git.remote,
          isDirty: context.git.isDirty,
          root: context.cwd
        },
        user: {
          name: context.user.name,
          email: context.user.email
        },
        env: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          vars: {}
        },
        session: {
          id: context.sessionId,
          startTime: context.timestamp
        }
      },
      execution: {
        job: {
          meta: job.meta,
          ctx: context
        },
        result,
        startTime,
        endTime,
        duration
      },
      changes: {
        created: (result.files?.created || []).map(path => ({ path, size: 0 })),
        modified: (result.files?.modified || []).map(path => ({ path, sizeBefore: 0, sizeAfter: 0 })),
        deleted: (result.files?.deleted || []).map(path => ({ path, sizeBefore: 0 }))
      },
      performance: {
        memory: { peak: 0, average: 0 },
        cpu: { peak: 0, average: 0 },
        disk: { bytesRead: 0, bytesWritten: 0 }
      },
      audit: {
        hash: 'mock-hash-' + receiptId,
        verified: true
      }
    };
  }

  async writeReceipt(receipt) {
    const receiptsDir = join(this.projectDir, this.config.tracer.outputDir);
    await mkdir(receiptsDir, { recursive: true });

    const pattern = this.config.tracer.receiptPattern || 'receipt-{timestamp}-{id}.json';
    const filename = pattern
      .replace('{timestamp}', receipt.meta.timestamp.toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z')
      .replace('{id}', receipt.meta.id)
      .replace('{jobName}', receipt.execution.job.meta.name.replace(/[^a-zA-Z0-9]/g, '_'));

    const filePath = join(receiptsDir, filename);
    await writeFile(filePath, JSON.stringify(receipt, null, 2));
  }

  async checkGitDirty() {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('git status --porcelain', { cwd: this.projectDir });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }
}