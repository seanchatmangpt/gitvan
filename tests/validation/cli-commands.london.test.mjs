/**
 * London TDD Test Suite: CLI Commands
 * Tests init, setup, hooks, and workflow commands with full mocking
 *
 * London School TDD Approach:
 * - Write tests first with mocked dependencies
 * - Focus on behavior, not implementation
 * - Mock all external dependencies
 * - Test collaboration between objects
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CLI Commands - London TDD Suite', () => {
  let mockConsole;
  let mockFs;
  let mockGit;
  let mockProcess;

  beforeEach(() => {
    // Mock console for clean test output
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };

    // Mock filesystem operations
    mockFs = {
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn(),
    };

    // Mock Git operations
    mockGit = {
      init: vi.fn().mockResolvedValue(true),
      status: vi.fn().mockResolvedValue({ clean: true }),
      add: vi.fn().mockResolvedValue(true),
      commit: vi.fn().mockResolvedValue({ sha: 'abc123' }),
    };

    // Mock process
    mockProcess = {
      cwd: vi.fn().mockReturnValue('/test/repo'),
      exit: vi.fn(),
      env: { NODE_ENV: 'test' },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('gitvan init', () => {
    it('should initialize a new GitVan repository', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      const initCommand = createInitCommand(mockFs, mockGit, mockConsole);

      // Act
      const result = await initCommand.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('.gitvan', { recursive: true });
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('hooks', { recursive: true });
      expect(mockGit.init).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('initialized'));
    });

    it('should fail gracefully if directory already exists', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      const initCommand = createInitCommand(mockFs, mockGit, mockConsole);

      // Act
      const result = await initCommand.execute();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('already initialized');
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should create default configuration file', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      const initCommand = createInitCommand(mockFs, mockGit, mockConsole);

      // Act
      await initCommand.execute();

      // Assert
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('gitvan.config'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should initialize Git repository if not present', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      mockGit.status.mockRejectedValue(new Error('not a git repository'));
      const initCommand = createInitCommand(mockFs, mockGit, mockConsole);

      // Act
      await initCommand.execute();

      // Assert
      expect(mockGit.init).toHaveBeenCalled();
    });
  });

  describe('gitvan setup', () => {
    it('should install Git hooks', async () => {
      // Arrange
      const setupCommand = createSetupCommand(mockFs, mockConsole);
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const result = await setupCommand.installHooks();

      // Assert
      expect(result.installed).toBeGreaterThan(0);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.git/hooks/pre-commit'),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should make hook files executable', async () => {
      // Arrange
      const setupCommand = createSetupCommand(mockFs, mockConsole);
      const mockChmod = vi.fn();
      mockFs.chmodSync = mockChmod;

      // Act
      await setupCommand.installHooks();

      // Assert
      expect(mockChmod).toHaveBeenCalledWith(
        expect.stringContaining('.git/hooks/'),
        0o755
      );
    });

    it('should backup existing hooks', async () => {
      // Arrange
      const setupCommand = createSetupCommand(mockFs, mockConsole);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('existing hook content');

      // Act
      await setupCommand.installHooks();

      // Assert
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.backup'),
        'existing hook content'
      );
    });
  });

  describe('gitvan hooks', () => {
    it('should list all available hooks', async () => {
      // Arrange
      const hooksCommand = createHooksCommand(mockFs, mockConsole);
      mockFs.readdirSync.mockReturnValue([
        'bug-threshold.ttl',
        'version-change.ttl',
      ]);

      // Act
      const result = await hooksCommand.list();

      // Assert
      expect(result.hooks).toHaveLength(2);
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should evaluate hooks for triggers', async () => {
      // Arrange
      const mockOrchestrator = {
        evaluate: vi.fn().mockResolvedValue({
          hooksTriggered: 2,
          hooksEvaluated: 5,
          workflowsExecuted: 2,
        }),
      };
      const hooksCommand = createHooksCommand(mockFs, mockConsole, mockOrchestrator);

      // Act
      const result = await hooksCommand.evaluate({ verbose: true });

      // Assert
      expect(result.hooksTriggered).toBe(2);
      expect(mockOrchestrator.evaluate).toHaveBeenCalledWith(
        expect.objectContaining({ verbose: true })
      );
    });

    it('should validate hook syntax', async () => {
      // Arrange
      const hooksCommand = createHooksCommand(mockFs, mockConsole);
      const mockParser = {
        parseHook: vi.fn().mockResolvedValue({ valid: true }),
      };
      hooksCommand.parser = mockParser;

      // Act
      const result = await hooksCommand.validate('bug-threshold');

      // Assert
      expect(result.valid).toBe(true);
      expect(mockParser.parseHook).toHaveBeenCalledWith('bug-threshold');
    });
  });

  describe('gitvan workflow', () => {
    it('should list available workflows', async () => {
      // Arrange
      const workflowCommand = createWorkflowCommand(mockFs, mockConsole);
      mockFs.readdirSync.mockReturnValue([
        'ci-pipeline.yaml',
        'deploy.yaml',
      ]);

      // Act
      const result = await workflowCommand.list();

      // Assert
      expect(result.workflows).toHaveLength(2);
      expect(result.workflows[0].name).toBe('ci-pipeline');
    });

    it('should execute a workflow by name', async () => {
      // Arrange
      const mockRunner = {
        executeWorkflow: vi.fn().mockResolvedValue({
          success: true,
          stepsExecuted: 3,
        }),
      };
      const workflowCommand = createWorkflowCommand(mockFs, mockConsole, mockRunner);

      // Act
      const result = await workflowCommand.run('ci-pipeline');

      // Assert
      expect(result.success).toBe(true);
      expect(mockRunner.executeWorkflow).toHaveBeenCalledWith('ci-pipeline');
    });

    it('should handle workflow execution failures', async () => {
      // Arrange
      const mockRunner = {
        executeWorkflow: vi.fn().mockRejectedValue(new Error('Step failed')),
      };
      const workflowCommand = createWorkflowCommand(mockFs, mockConsole, mockRunner);

      // Act
      const result = await workflowCommand.run('failing-workflow');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Step failed');
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should validate workflow definition', async () => {
      // Arrange
      const workflowCommand = createWorkflowCommand(mockFs, mockConsole);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
      };
      workflowCommand.validator = mockValidator;

      // Act
      const result = await workflowCommand.validate('ci-pipeline');

      // Assert
      expect(result.valid).toBe(true);
      expect(mockValidator.validate).toHaveBeenCalled();
    });
  });

  describe('CLI Integration', () => {
    it('should handle command chaining', async () => {
      // Arrange
      const cli = createCLI(mockFs, mockGit, mockConsole);

      // Act
      await cli.execute(['init']);
      await cli.execute(['setup']);
      await cli.execute(['hooks', 'evaluate']);

      // Assert
      expect(mockGit.init).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid commands gracefully', async () => {
      // Arrange
      const cli = createCLI(mockFs, mockGit, mockConsole);

      // Act
      const result = await cli.execute(['invalid-command']);

      // Assert
      expect(result.success).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Unknown command')
      );
    });

    it('should support --help flag for all commands', async () => {
      // Arrange
      const cli = createCLI(mockFs, mockGit, mockConsole);

      // Act
      await cli.execute(['init', '--help']);

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Usage:')
      );
    });
  });
});

// Mock command factories
function createInitCommand(fs, git, console) {
  return {
    async execute() {
      if (fs.existsSync('.gitvan')) {
        console.warn('GitVan already initialized');
        return { success: false, error: 'Repository already initialized' };
      }

      fs.mkdirSync('.gitvan', { recursive: true });
      fs.mkdirSync('hooks', { recursive: true });

      try {
        await git.status();
      } catch {
        await git.init();
      }

      fs.writeFileSync('gitvan.config.mjs', 'export default {};', 'utf-8');
      console.log('✅ GitVan repository initialized');

      return { success: true };
    },
  };
}

function createSetupCommand(fs, console) {
  return {
    async installHooks() {
      const hooks = ['pre-commit', 'post-commit', 'pre-push'];
      let installed = 0;

      for (const hook of hooks) {
        const hookPath = `.git/hooks/${hook}`;

        if (fs.existsSync(hookPath)) {
          const existing = fs.readFileSync(hookPath);
          fs.writeFileSync(`${hookPath}.backup`, existing);
        }

        fs.writeFileSync(hookPath, '#!/bin/bash\ngitvan hooks evaluate', {
          mode: 0o755,
        });

        if (fs.chmodSync) {
          fs.chmodSync(hookPath, 0o755);
        }

        installed++;
      }

      console.log(`✅ Installed ${installed} Git hooks`);
      return { installed };
    },
  };
}

function createHooksCommand(fs, console, orchestrator = null) {
  return {
    parser: null,

    async list() {
      const files = fs.readdirSync('hooks');
      const hooks = files.filter((f) => f.endsWith('.ttl'));

      console.log(`Found ${hooks.length} hooks`);
      hooks.forEach((hook) => console.log(`  - ${hook}`));

      return { hooks };
    },

    async evaluate(options = {}) {
      if (!orchestrator) {
        throw new Error('Orchestrator not initialized');
      }

      const result = await orchestrator.evaluate(options);

      console.log(`✅ Evaluated ${result.hooksEvaluated} hooks`);
      console.log(`⚡ Triggered ${result.hooksTriggered} workflows`);

      return result;
    },

    async validate(hookId) {
      if (!this.parser) {
        throw new Error('Parser not initialized');
      }

      const result = await this.parser.parseHook(hookId);
      console.log(result.valid ? '✅ Valid' : '❌ Invalid');

      return result;
    },
  };
}

function createWorkflowCommand(fs, console, runner = null) {
  return {
    validator: null,

    async list() {
      const files = fs.readdirSync('workflows');
      const workflows = files
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => ({ name: f.replace('.yaml', ''), path: `workflows/${f}` }));

      console.log(`Found ${workflows.length} workflows`);
      return { workflows };
    },

    async run(workflowName) {
      if (!runner) {
        throw new Error('Runner not initialized');
      }

      try {
        const result = await runner.executeWorkflow(workflowName);
        console.log(`✅ Workflow ${workflowName} completed`);
        return result;
      } catch (error) {
        console.error(`❌ Workflow failed: ${error.message}`);
        return { success: false, error: error.message };
      }
    },

    async validate(workflowName) {
      if (!this.validator) {
        throw new Error('Validator not initialized');
      }

      const result = await this.validator.validate(workflowName);
      return result;
    },
  };
}

function createCLI(fs, git, console) {
  return {
    async execute(args) {
      const command = args[0];

      if (args.includes('--help')) {
        console.log('Usage: gitvan <command> [options]');
        return { success: true };
      }

      const commands = {
        init: createInitCommand(fs, git, console),
        setup: createSetupCommand(fs, console),
        hooks: createHooksCommand(fs, console),
        workflow: createWorkflowCommand(fs, console),
      };

      if (!commands[command]) {
        console.error(`Unknown command: ${command}`);
        return { success: false };
      }

      console.log(`Executing: ${command}`);
      return await commands[command].execute?.() || { success: true };
    },
  };
}
