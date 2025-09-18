/**
 * Mock AI Provider for GitVan Testing
 * Based on AI SDK testing patterns from https://ai-sdk.dev/docs/ai-sdk-core/testing
 */

import { MockLanguageModelV2, mockValues, simulateReadableStream } from 'ai/test';
import { generateText, streamText, generateObject } from 'ai';
import { z } from 'zod';

/**
 * Mock AI Provider for GitVan Chat Commands
 * Provides deterministic responses for testing
 */
export class MockGitVanAIProvider {
  constructor(options = {}) {
    this.responses = options.responses || [];
    this.currentIndex = 0;
    this.delay = options.delay || 0;
  }

  /**
   * Add a mock response
   */
  addResponse(response) {
    this.responses.push(response);
    return this;
  }

  /**
   * Get next response in sequence
   */
  getNextResponse() {
    if (this.responses.length === 0) {
      return this.getDefaultResponse();
    }

    const response = this.responses[this.currentIndex % this.responses.length];
    this.currentIndex++;
    return response;
  }

  /**
   * Default response for unspecified requests
   */
  getDefaultResponse() {
    return {
      output: JSON.stringify({
        meta: {
          desc: 'Default test job',
          tags: ['test'],
          author: 'Mock AI',
          version: '1.0.0'
        },
        config: {
          cron: '0 2 * * *'
        },
        implementation: {
          operations: [
            { type: 'log', description: 'Default operation' }
          ],
          returnValue: {
            success: 'Default job completed',
            artifacts: ['default-output.txt']
          }
        }
      }),
      model: 'mock-model',
      options: {},
      duration: 100
    };
  }

  /**
   * Create mock language model
   */
  createMockModel() {
    return new MockLanguageModelV2({
      doGenerate: async () => {
        const response = this.getNextResponse();
        
        // Simulate delay if specified
        if (this.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.delay));
        }

        return {
          finishReason: 'stop',
          usage: { 
            inputTokens: 10, 
            outputTokens: response.output.length, 
            totalTokens: 10 + response.output.length 
          },
          content: [{ type: 'text', text: response.output }],
          warnings: [],
        };
      },
    });
  }

  /**
   * Create streaming mock model
   */
  createStreamingMockModel() {
    return new MockLanguageModelV2({
      doStream: async () => {
        const response = this.getNextResponse();
        
        return {
          stream: simulateReadableStream({
            chunks: [
              { type: 'text-start', id: 'text-1' },
              { type: 'text-delta', id: 'text-1', delta: response.output },
              { type: 'text-end', id: 'text-1' },
              {
                type: 'finish',
                finishReason: 'stop',
                logprobs: undefined,
                usage: { 
                  inputTokens: 10, 
                  outputTokens: response.output.length, 
                  totalTokens: 10 + response.output.length 
                },
              },
            ],
          }),
        };
      },
    });
  }
}

/**
 * Predefined mock responses for common job types
 */
export const MockResponses = {
  changelogJob: {
    output: JSON.stringify({
      meta: {
        desc: 'Generate changelog from commits',
        tags: ['documentation', 'changelog'],
        author: 'GitVan AI',
        version: '1.0.0'
      },
      config: {
        on: { tagCreate: 'v*' }
      },
      implementation: {
        operations: [
          { type: 'git-commit', description: 'Get commits since last tag' },
          { type: 'template-render', description: 'Render changelog template' },
          { type: 'file-write', description: 'Write CHANGELOG.md' }
        ],
        parameters: [
          { name: 'version', default: '1.0.0' },
          { name: 'format', default: 'markdown' }
        ],
        returnValue: {
          success: 'Changelog generated successfully',
          artifacts: ['CHANGELOG.md']
        }
      }
    }),
    model: 'qwen3-coder:30b',
    options: { temperature: 0.7 },
    duration: 1200
  },

  backupJob: {
    output: JSON.stringify({
      meta: {
        desc: 'Create backup of important files',
        tags: ['backup', 'automation'],
        author: 'GitVan AI',
        version: '1.0.0'
      },
      config: {
        cron: '0 2 * * *'
      },
      implementation: {
        operations: [
          { type: 'file-copy', description: 'Copy source files to backup directory' },
          { type: 'log', description: 'Log backup completion' }
        ],
        parameters: [
          { name: 'sourcePath', default: './src' },
          { name: 'backupDir', default: './backups' }
        ],
        returnValue: {
          success: 'Backup completed successfully',
          artifacts: ['backup_directory']
        }
      }
    }),
    model: 'qwen3-coder:30b',
    options: { temperature: 0.5 },
    duration: 800
  },

  deploymentJob: {
    output: JSON.stringify({
      meta: {
        desc: 'Deploy application to staging',
        tags: ['deployment', 'ci-cd'],
        author: 'GitVan AI',
        version: '1.0.0'
      },
      config: {
        cron: '0 9 * * 1-5'
      },
      implementation: {
        operations: [
          { type: 'log', description: 'Start deployment process' },
          { type: 'file-read', description: 'Read deployment configuration' },
          { type: 'git-commit', description: 'Checkout deployment branch' },
          { type: 'file-copy', description: 'Copy build artifacts' },
          { type: 'log', description: 'Deployment completed' }
        ],
        parameters: [
          { name: 'environment', default: 'staging' },
          { name: 'version', default: 'latest' }
        ],
        returnValue: {
          success: 'Deployment completed successfully',
          artifacts: ['deployment.log', 'build-artifacts/']
        }
      }
    }),
    model: 'qwen3-coder:30b',
    options: { temperature: 0.3 },
    duration: 2000
  },

  testJob: {
    output: JSON.stringify({
      meta: {
        desc: 'Run test suite',
        tags: ['testing', 'automation'],
        author: 'GitVan AI',
        version: '1.0.0'
      },
      config: {
        on: { pathChanged: ['src/**/*.js'] }
      },
      implementation: {
        operations: [
          { type: 'log', description: 'Starting test suite' },
          { type: 'file-read', description: 'Read test configuration' },
          { type: 'log', description: 'Tests completed' }
        ],
        parameters: [
          { name: 'testPattern', default: '**/*.test.js' },
          { name: 'coverage', default: true }
        ],
        returnValue: {
          success: 'Tests passed successfully',
          artifacts: ['test-results.json', 'coverage-report.html']
        }
      }
    }),
    model: 'qwen3-coder:30b',
    options: { temperature: 0.1 },
    duration: 1500
  }
};

/**
 * Test utilities for AI commands
 */
export class AITestUtils {
  constructor(testDir) {
    this.testDir = testDir;
  }

  /**
   * Create mock provider with predefined responses
   */
  createMockProvider(responses = []) {
    const provider = new MockGitVanAIProvider({ responses });
    return provider;
  }

  /**
   * Create provider with common job responses
   */
  createCommonJobProvider() {
    return new MockGitVanAIProvider({
      responses: [
        MockResponses.changelogJob,
        MockResponses.backupJob,
        MockResponses.deploymentJob,
        MockResponses.testJob
      ]
    });
  }

  /**
   * Test job code generation
   */
  async testJobGeneration(prompt, expectedJobType) {
    const provider = this.createCommonJobProvider();
    const model = provider.createMockModel();

    const result = await generateText({
      model,
      prompt,
    });

    const jobSpec = JSON.parse(result.text);
    
    // Validate job structure
    expect(jobSpec.meta).toBeDefined();
    expect(jobSpec.meta.desc).toBeDefined();
    expect(jobSpec.implementation).toBeDefined();
    expect(jobSpec.implementation.operations).toBeDefined();

    return jobSpec;
  }

  /**
   * Test streaming generation
   */
  async testStreamingGeneration(prompt) {
    const provider = this.createMockProvider([MockResponses.changelogJob]);
    const model = provider.createStreamingMockModel();

    const result = streamText({
      model,
      prompt,
    });

    let fullText = '';
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    const jobSpec = JSON.parse(fullText);
    expect(jobSpec.meta.desc).toBe('Generate changelog from commits');
    
    return jobSpec;
  }

  /**
   * Test structured data generation
   */
  async testStructuredGeneration(prompt, schema) {
    const provider = this.createMockProvider([MockResponses.changelogJob]);
    const model = provider.createMockModel();

    const result = await generateObject({
      model,
      schema,
      prompt,
    });

    return result.object;
  }

  /**
   * Validate generated job code
   */
  validateJobCode(code) {
    const errors = [];
    const warnings = [];

    // Check syntax
    try {
      new Function(code);
    } catch (error) {
      errors.push(`Syntax error: ${error.message}`);
    }

    // Check structure
    if (!code.includes('export default')) {
      errors.push('Missing export default');
    }

    if (!code.includes('async run(')) {
      errors.push('Missing required run function');
    }

    // Check for TODO comments
    if (code.includes('TODO:')) {
      warnings.push('Contains TODO comments - may not be fully implemented');
    }

    // Check for composable usage
    const composableMatches = code.match(/use\w+\(\)/g);
    if (composableMatches) {
      const validComposables = ['useGit', 'useTemplate', 'useNotes', 'useExec', 'useWorktree'];
      for (const match of composableMatches) {
        const composable = match.replace('()', '');
        if (!validComposables.includes(composable)) {
          errors.push(`Unknown composable: ${composable}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Test job execution
   */
  async testJobExecution(jobCode, testData = {}) {
    try {
      // Create temporary job file
      const jobPath = join(this.testDir, 'temp-job.mjs');
      writeFileSync(jobPath, jobCode);

      // Mock execution environment
      const mockContext = {
        ctx: { rootDir: this.testDir },
        payload: testData,
        meta: { name: 'test-job', desc: 'Test job' }
      };

      // Import and execute
      const jobModule = await import(jobPath);
      const job = jobModule.default;
      
      const result = await job.run(mockContext);

      return {
        passed: result.ok === true,
        results: result,
        errors: result.ok ? [] : [result.error || 'Unknown error']
      };
    } catch (error) {
      return {
        passed: false,
        results: null,
        errors: [error.message]
      };
    }
  }
}

// Export everything
export {
  MockGitVanAIProvider,
  MockResponses,
  AITestUtils
};
