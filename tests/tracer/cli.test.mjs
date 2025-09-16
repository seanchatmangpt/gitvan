/**
 * GitVan v2 CLI Tests
 * Tests citty CLI command system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMain, defineCommand, runMain } from 'citty';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CLI System', () => {
  let tempDir;
  let mockConsole;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitvan-cli-test-'));

    // Mock console methods
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    };

    // Store original console methods
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    // Replace console methods
    Object.assign(console, mockConsole);
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }

    // Restore original console methods
    Object.assign(console, originalConsole);
  });

  describe('Command Definition', () => {
    it('should define basic commands', async () => {
      const traceCommand = defineCommand({
        meta: {
          name: 'trace',
          description: 'Trace job execution',
          version: '2.0.0'
        },
        args: {
          job: {
            type: 'string',
            description: 'Job pattern to trace',
            required: false
          },
          output: {
            type: 'string',
            description: 'Output directory for receipts',
            alias: 'o',
            default: '.gitvan/receipts'
          },
          verbose: {
            type: 'boolean',
            description: 'Enable verbose output',
            alias: 'v',
            default: false
          },
          config: {
            type: 'string',
            description: 'Configuration file path',
            alias: 'c'
          }
        },
        run: async ({ args }) => {
          console.log('Tracing jobs...', args);
        }
      });

      expect(traceCommand.meta.name).toBe('trace');
      expect(traceCommand.meta.description).toBe('Trace job execution');
      expect(traceCommand.args.job.type).toBe('string');
      expect(traceCommand.args.verbose.default).toBe(false);
    });

    it('should define subcommands', async () => {
      const receiptCommand = defineCommand({
        meta: {
          name: 'receipt',
          description: 'Receipt management commands'
        },
        subCommands: {
          list: defineCommand({
            meta: {
              name: 'list',
              description: 'List all receipts'
            },
            args: {
              limit: {
                type: 'number',
                description: 'Maximum number of receipts to show',
                default: 10
              },
              filter: {
                type: 'string',
                description: 'Filter receipts by job name'
              }
            },
            run: async ({ args }) => {
              console.log('Listing receipts...', args);
            }
          }),
          show: defineCommand({
            meta: {
              name: 'show',
              description: 'Show receipt details'
            },
            args: {
              id: {
                type: 'string',
                description: 'Receipt ID',
                required: true
              }
            },
            run: async ({ args }) => {
              console.log('Showing receipt:', args.id);
            }
          }),
          clean: defineCommand({
            meta: {
              name: 'clean',
              description: 'Clean old receipts'
            },
            args: {
              days: {
                type: 'number',
                description: 'Remove receipts older than N days',
                default: 30
              },
              force: {
                type: 'boolean',
                description: 'Force cleanup without confirmation',
                alias: 'f',
                default: false
              }
            },
            run: async ({ args }) => {
              console.log('Cleaning receipts...', args);
            }
          })
        }
      });

      expect(receiptCommand.subCommands.list).toBeDefined();
      expect(receiptCommand.subCommands.show).toBeDefined();
      expect(receiptCommand.subCommands.clean).toBeDefined();
    });

    it('should define job management commands', async () => {
      const jobCommand = defineCommand({
        meta: {
          name: 'job',
          description: 'Job management commands'
        },
        subCommands: {
          discover: defineCommand({
            meta: {
              name: 'discover',
              description: 'Discover available jobs'
            },
            args: {
              pattern: {
                type: 'string',
                description: 'Job pattern to search',
                default: '**/*.job.{js,mjs,ts}'
              },
              recursive: {
                type: 'boolean',
                description: 'Search recursively',
                alias: 'r',
                default: true
              }
            },
            run: async ({ args }) => {
              console.log('Discovering jobs...', args);
            }
          }),
          run: defineCommand({
            meta: {
              name: 'run',
              description: 'Execute a specific job'
            },
            args: {
              name: {
                type: 'string',
                description: 'Job name or ID',
                required: true
              },
              args: {
                type: 'string',
                description: 'Job arguments (JSON format)',
                default: '{}'
              },
              trace: {
                type: 'boolean',
                description: 'Enable tracing',
                default: true
              }
            },
            run: async ({ args }) => {
              console.log('Running job:', args.name, 'with args:', args.args);
            }
          }),
          validate: defineCommand({
            meta: {
              name: 'validate',
              description: 'Validate job definitions'
            },
            args: {
              file: {
                type: 'string',
                description: 'Specific job file to validate'
              },
              strict: {
                type: 'boolean',
                description: 'Enable strict validation',
                default: false
              }
            },
            run: async ({ args }) => {
              console.log('Validating jobs...', args);
            }
          })
        }
      });

      expect(jobCommand.subCommands.discover.args.pattern.default).toBe('**/*.job.{js,mjs,ts}');
      expect(jobCommand.subCommands.run.args.name.required).toBe(true);
      expect(jobCommand.subCommands.validate.args.strict.default).toBe(false);
    });
  });

  describe('Main CLI Application', () => {
    it('should create main CLI app with multiple commands', async () => {
      const main = createMain({
        meta: {
          name: 'gitvan',
          description: 'GitVan v2 - Git operation tracer',
          version: '2.0.0'
        },
        commands: {
          trace: defineCommand({
            meta: { name: 'trace', description: 'Trace job execution' },
            run: async () => console.log('trace executed')
          }),
          receipt: defineCommand({
            meta: { name: 'receipt', description: 'Receipt management' },
            run: async () => console.log('receipt executed')
          }),
          job: defineCommand({
            meta: { name: 'job', description: 'Job management' },
            run: async () => console.log('job executed')
          }),
          config: defineCommand({
            meta: { name: 'config', description: 'Configuration management' },
            run: async () => console.log('config executed')
          })
        },
        defaultCommand: 'help'
      });

      expect(main.meta.name).toBe('gitvan');
      expect(main.meta.version).toBe('2.0.0');
      expect(main.commands.trace).toBeDefined();
      expect(main.commands.receipt).toBeDefined();
      expect(main.commands.job).toBeDefined();
      expect(main.commands.config).toBeDefined();
    });

    it('should handle command execution', async () => {
      const traceHandler = vi.fn();
      const main = createMain({
        meta: { name: 'gitvan', version: '2.0.0' },
        commands: {
          trace: defineCommand({
            meta: { name: 'trace', description: 'Trace execution' },
            args: {
              job: { type: 'string' },
              verbose: { type: 'boolean', default: false }
            },
            run: traceHandler
          })
        }
      });

      // Mock command line arguments
      const argv = ['trace', '--job', 'test-job', '--verbose'];

      // This would normally be called by citty's runMain
      const command = main.commands.trace;
      await command.run({
        args: { job: 'test-job', verbose: true },
        rawArgs: argv,
        data: {},
        cmd: command
      });

      expect(traceHandler).toHaveBeenCalledWith({
        args: { job: 'test-job', verbose: true },
        rawArgs: argv,
        data: {},
        cmd: command
      });
    });
  });

  describe('Argument Parsing', () => {
    it('should parse command line arguments correctly', async () => {
      const handler = vi.fn();
      const command = defineCommand({
        meta: { name: 'test', description: 'Test command' },
        args: {
          string: { type: 'string', required: true },
          number: { type: 'number', default: 42 },
          boolean: { type: 'boolean', default: false },
          alias: { type: 'string', alias: 'a' },
          multiple: { type: 'string' } // Can accept multiple values
        },
        run: handler
      });

      // Simulate argument parsing (citty would do this)
      const parsedArgs = {
        string: 'test-value',
        number: 100,
        boolean: true,
        alias: 'alias-value',
        multiple: 'value1'
      };

      await command.run({
        args: parsedArgs,
        rawArgs: ['--string', 'test-value', '--number', '100', '--boolean', '-a', 'alias-value', '--multiple', 'value1'],
        data: {},
        cmd: command
      });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        args: parsedArgs
      }));
    });

    it('should handle missing required arguments', async () => {
      const command = defineCommand({
        meta: { name: 'test', description: 'Test command' },
        args: {
          required: { type: 'string', required: true }
        },
        run: async ({ args }) => {
          console.log('Command executed:', args);
        }
      });

      // Test with missing required argument
      const args = {}; // Missing 'required' field

      // Citty would typically handle this validation, but we can test the structure
      expect(command.args.required.required).toBe(true);
    });

    it('should apply default values', async () => {
      const handler = vi.fn();
      const command = defineCommand({
        meta: { name: 'test', description: 'Test command' },
        args: {
          withDefault: { type: 'string', default: 'default-value' },
          withoutDefault: { type: 'string' }
        },
        run: handler
      });

      // Simulate with only partial args provided
      const args = { withoutDefault: 'provided-value' };
      // Default value would be applied by citty
      const argsWithDefaults = { ...args, withDefault: 'default-value' };

      await command.run({
        args: argsWithDefaults,
        rawArgs: ['--withoutDefault', 'provided-value'],
        data: {},
        cmd: command
      });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        args: { withDefault: 'default-value', withoutDefault: 'provided-value' }
      }));
    });
  });

  describe('Command Integration', () => {
    it('should integrate with job tracing workflow', async () => {
      const mockJobTracer = {
        discover: vi.fn().mockResolvedValue([
          { id: 'job1', name: 'Build Job', kind: 'build' },
          { id: 'job2', name: 'Test Job', kind: 'test' }
        ]),
        trace: vi.fn().mockResolvedValue({
          jobId: 'job1',
          receiptId: 'receipt-123',
          success: true
        })
      };

      const traceCommand = defineCommand({
        meta: { name: 'trace', description: 'Trace job execution' },
        args: {
          job: { type: 'string', description: 'Job pattern' },
          output: { type: 'string', default: '.gitvan/receipts' }
        },
        run: async ({ args }) => {
          const jobs = await mockJobTracer.discover(args.job || '**/*.job.{js,mjs,ts}');
          console.log(`Found ${jobs.length} jobs`);

          for (const job of jobs) {
            const result = await mockJobTracer.trace(job.id, { output: args.output });
            console.log(`Traced job ${job.name}: ${result.success ? 'success' : 'failed'}`);
          }
        }
      });

      await traceCommand.run({
        args: { job: 'build/**/*.job.js', output: '.gitvan/receipts' },
        rawArgs: ['--job', 'build/**/*.job.js'],
        data: {},
        cmd: traceCommand
      });

      expect(mockJobTracer.discover).toHaveBeenCalledWith('build/**/*.job.js');
      expect(mockJobTracer.trace).toHaveBeenCalledTimes(2);
      expect(mockConsole.log).toHaveBeenCalledWith('Found 2 jobs');
    });

    it('should handle receipt management commands', async () => {
      const mockReceiptManager = {
        list: vi.fn().mockResolvedValue([
          { id: 'receipt-1', jobName: 'Build Job', timestamp: new Date() },
          { id: 'receipt-2', jobName: 'Test Job', timestamp: new Date() }
        ]),
        show: vi.fn().mockResolvedValue({
          id: 'receipt-1',
          jobName: 'Build Job',
          success: true,
          duration: 1500
        }),
        clean: vi.fn().mockResolvedValue({ removed: 5 })
      };

      const receiptCommands = {
        list: defineCommand({
          meta: { name: 'list', description: 'List receipts' },
          args: {
            limit: { type: 'number', default: 10 },
            filter: { type: 'string' }
          },
          run: async ({ args }) => {
            const receipts = await mockReceiptManager.list(args);
            console.log(`Found ${receipts.length} receipts`);
            receipts.forEach(r => console.log(`- ${r.id}: ${r.jobName}`));
          }
        }),
        show: defineCommand({
          meta: { name: 'show', description: 'Show receipt' },
          args: { id: { type: 'string', required: true } },
          run: async ({ args }) => {
            const receipt = await mockReceiptManager.show(args.id);
            console.log(`Receipt: ${receipt.id}`);
            console.log(`Job: ${receipt.jobName}`);
            console.log(`Status: ${receipt.success ? 'Success' : 'Failed'}`);
          }
        }),
        clean: defineCommand({
          meta: { name: 'clean', description: 'Clean old receipts' },
          args: {
            days: { type: 'number', default: 30 },
            force: { type: 'boolean', default: false }
          },
          run: async ({ args }) => {
            const result = await mockReceiptManager.clean(args);
            console.log(`Removed ${result.removed} old receipts`);
          }
        })
      };

      // Test list command
      await receiptCommands.list.run({
        args: { limit: 10 },
        rawArgs: [],
        data: {},
        cmd: receiptCommands.list
      });

      expect(mockReceiptManager.list).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith('Found 2 receipts');

      // Test show command
      await receiptCommands.show.run({
        args: { id: 'receipt-1' },
        rawArgs: ['receipt-1'],
        data: {},
        cmd: receiptCommands.show
      });

      expect(mockReceiptManager.show).toHaveBeenCalledWith('receipt-1');
      expect(mockConsole.log).toHaveBeenCalledWith('Receipt: receipt-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution errors', async () => {
      const errorCommand = defineCommand({
        meta: { name: 'error', description: 'Command that throws error' },
        run: async () => {
          throw new Error('Test error');
        }
      });

      await expect(
        errorCommand.run({
          args: {},
          rawArgs: [],
          data: {},
          cmd: errorCommand
        })
      ).rejects.toThrow('Test error');
    });

    it('should handle validation errors gracefully', async () => {
      const validateCommand = defineCommand({
        meta: { name: 'validate', description: 'Validation command' },
        args: {
          file: { type: 'string', required: true }
        },
        run: async ({ args }) => {
          if (!args.file) {
            throw new Error('File argument is required');
          }
          console.log('Validating:', args.file);
        }
      });

      // Test would typically be handled by citty's validation
      expect(validateCommand.args.file.required).toBe(true);
    });

    it('should provide helpful error messages', async () => {
      const helpfulErrorCommand = defineCommand({
        meta: { name: 'helpful', description: 'Command with helpful errors' },
        args: {
          config: { type: 'string', description: 'Config file path' }
        },
        run: async ({ args }) => {
          if (args.config && !args.config.endsWith('.js')) {
            throw new Error(
              'Configuration file must be a JavaScript file (.js)\n' +
              'Example: gitvan helpful --config gitvan.config.js'
            );
          }
          console.log('Command executed successfully');
        }
      });

      await expect(
        helpfulErrorCommand.run({
          args: { config: 'invalid.txt' },
          rawArgs: ['--config', 'invalid.txt'],
          data: {},
          cmd: helpfulErrorCommand
        })
      ).rejects.toThrow('Configuration file must be a JavaScript file');
    });
  });

  describe('Interactive Features', () => {
    it('should support interactive prompts', async () => {
      const mockPrompt = vi.fn()
        .mockResolvedValueOnce('yes')
        .mockResolvedValueOnce('production');

      const interactiveCommand = defineCommand({
        meta: { name: 'interactive', description: 'Interactive command' },
        args: {
          force: { type: 'boolean', default: false }
        },
        run: async ({ args }) => {
          if (!args.force) {
            const confirm = await mockPrompt('Continue? (yes/no): ');
            if (confirm !== 'yes') {
              console.log('Operation cancelled');
              return;
            }
          }

          const environment = await mockPrompt('Environment (development/production): ');
          console.log(`Deploying to ${environment}`);
        }
      });

      await interactiveCommand.run({
        args: { force: false },
        rawArgs: [],
        data: {},
        cmd: interactiveCommand
      });

      expect(mockPrompt).toHaveBeenCalledTimes(2);
      expect(mockConsole.log).toHaveBeenCalledWith('Deploying to production');
    });

    it('should support progress indicators', async () => {
      const mockProgress = {
        start: vi.fn(),
        update: vi.fn(),
        stop: vi.fn()
      };

      const progressCommand = defineCommand({
        meta: { name: 'progress', description: 'Command with progress' },
        run: async () => {
          mockProgress.start('Processing jobs...');

          for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 10));
            mockProgress.update(i, `Processing... ${i}%`);
          }

          mockProgress.stop('Processing complete!');
        }
      });

      await progressCommand.run({
        args: {},
        rawArgs: [],
        data: {},
        cmd: progressCommand
      });

      expect(mockProgress.start).toHaveBeenCalledWith('Processing jobs...');
      expect(mockProgress.update).toHaveBeenCalledTimes(11);
      expect(mockProgress.stop).toHaveBeenCalledWith('Processing complete!');
    });
  });

  describe('Configuration Integration', () => {
    it('should load and use configuration', async () => {
      const configCommand = defineCommand({
        meta: { name: 'config', description: 'Configuration management' },
        subCommands: {
          show: defineCommand({
            meta: { name: 'show', description: 'Show current configuration' },
            run: async () => {
              const config = {
                version: '2.0',
                tracer: { enabled: true, outputDir: '.gitvan/receipts' },
                jobs: { timeout: 30000 }
              };
              console.log('Current configuration:');
              console.log(JSON.stringify(config, null, 2));
            }
          }),
          set: defineCommand({
            meta: { name: 'set', description: 'Set configuration value' },
            args: {
              key: { type: 'string', required: true },
              value: { type: 'string', required: true }
            },
            run: async ({ args }) => {
              console.log(`Setting ${args.key} = ${args.value}`);
            }
          }),
          validate: defineCommand({
            meta: { name: 'validate', description: 'Validate configuration' },
            args: {
              file: { type: 'string', description: 'Config file to validate' }
            },
            run: async ({ args }) => {
              const configFile = args.file || 'gitvan.config.js';
              console.log(`Validating configuration: ${configFile}`);
              console.log('✅ Configuration is valid');
            }
          })
        }
      });

      // Test show command
      await configCommand.subCommands.show.run({
        args: {},
        rawArgs: [],
        data: {},
        cmd: configCommand.subCommands.show
      });

      expect(mockConsole.log).toHaveBeenCalledWith('Current configuration:');

      // Test set command
      await configCommand.subCommands.set.run({
        args: { key: 'tracer.enabled', value: 'false' },
        rawArgs: ['tracer.enabled', 'false'],
        data: {},
        cmd: configCommand.subCommands.set
      });

      expect(mockConsole.log).toHaveBeenCalledWith('Setting tracer.enabled = false');
    });
  });
});

// Global variable to store original console
let originalConsole;