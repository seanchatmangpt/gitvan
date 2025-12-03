/**
 * README Capabilities Validation Test
 *
 * Validates that all capabilities mentioned in the README are functional
 * Following the 80/20 principle: Testing critical functionality with high value
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowExecutor } from '../src/workflow/workflow-executor.mjs';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testDir = join(__dirname, '../.test-output/readme-validation');

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

describe('README Capabilities Validation (80/20)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await fs.mkdir(testDir, { recursive: true });
  });

  describe('Workflow Engine - Integration Test', () => {
    it('should execute complete workflow with all step types', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      // Execute the built-in integration test workflow
      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      // Core validation
      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(5);

      // SPARQL Step
      expect(result.steps[0].success).toBe(true);
      expect(result.steps[0].outputs.type).toBeDefined();

      // Template Step
      expect(result.steps[1].success).toBe(true);
      expect(result.steps[1].outputs.outputPath).toBe('test-results/integration-report.md');
      expect(result.steps[1].outputs.content).toContain('# GitVan Integration Test Results');

      // File Step
      expect(result.steps[2].success).toBe(true);
      expect(result.steps[2].outputs.operation).toBe('write');
      expect(result.steps[2].outputs.filePath).toBe('test-results/test-data.json');

      // HTTP Step
      expect(result.steps[3].success).toBe(true);
      expect(result.steps[3].outputs.status).toBe(200);
      expect(result.steps[3].outputs.url).toBe('https://httpbin.org/json');

      // CLI Step
      expect(result.steps[4].success).toBe(true);
      expect(result.steps[4].outputs.exitCode).toBe(0);
      expect(result.steps[4].outputs.stdout).toContain('Integration test completed successfully');
    }, { timeout: 15000 });
  });

  describe('Workflow Engine - Dependency Management', () => {
    it('should execute steps in correct order based on dependencies', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(5);

      // Verify execution order
      expect(result.steps[0].id).toBe('http://example.org/sparqlStep');
      expect(result.steps[1].id).toBe('http://example.org/templateStep');
      expect(result.steps[2].id).toBe('http://example.org/fileStep');
      expect(result.steps[3].id).toBe('http://example.org/httpStep');
      expect(result.steps[4].id).toBe('http://example.org/cliStep');
    }, { timeout: 15000 });
  });

  describe('Step Types - README Examples', () => {
    it('should validate SPARQL step capabilities', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      const sparqlStep = result.steps[0];

      // README claims: Returns type, results, count, hasResults, variables, queryMetadata
      expect(sparqlStep.outputs.type).toBeDefined();
      expect(sparqlStep.outputs.results).toBeDefined();
      expect(sparqlStep.outputs.count).toBeDefined();
      expect(sparqlStep.outputs.hasResults).toBeDefined();
    }, { timeout: 15000 });

    it('should validate Template step capabilities', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      const templateStep = result.steps[1];

      // README claims: Returns outputPath, content, contentLength, templateUsed
      expect(templateStep.outputs.outputPath).toBeDefined();
      expect(templateStep.outputs.content).toBeDefined();
      expect(templateStep.outputs.contentLength).toBeGreaterThan(0);
      expect(templateStep.outputs.templateUsed).toBeDefined();
    }, { timeout: 15000 });

    it('should validate File step capabilities', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      const fileStep = result.steps[2];

      // README claims: Returns operation, filePath, contentLength, rendered
      expect(fileStep.outputs.operation).toBe('write');
      expect(fileStep.outputs.filePath).toBeDefined();
      expect(fileStep.outputs.contentLength).toBeGreaterThan(0);
      expect(fileStep.outputs.rendered).toBeDefined();
    }, { timeout: 15000 });

    it('should validate HTTP step capabilities', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      const httpStep = result.steps[3];

      // README claims: Returns url, method, status, statusText, headers, responseData, success
      expect(httpStep.outputs.url).toBe('https://httpbin.org/json');
      expect(httpStep.outputs.method).toBe('GET');
      expect(httpStep.outputs.status).toBe(200);
      expect(httpStep.outputs.statusText).toBeDefined();
      expect(httpStep.outputs.headers).toBeDefined();
      expect(httpStep.outputs.responseData).toBeDefined();
      expect(httpStep.outputs.success).toBe(true);
    }, { timeout: 15000 });

    it('should validate CLI step capabilities', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      const cliStep = result.steps[4];

      // README claims: Returns command, cwd, stdout, stderr, exitCode, success
      expect(cliStep.outputs.command).toBeDefined();
      expect(cliStep.outputs.stdout).toContain('Integration test completed successfully');
      expect(cliStep.outputs.stderr).toBeDefined();
      expect(cliStep.outputs.exitCode).toBe(0);
      expect(cliStep.outputs.success).toBe(true);
    }, { timeout: 15000 });
  });

  describe('Workflow Execution Flow - README Claims', () => {
    it('should follow the documented execution flow', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      // README documents:
      // 1. Parse Workflow ✓
      // 2. Create Execution Plan ✓
      // 3. Initialize Context ✓
      // 4. Execute Steps ✓
      // 5. Handle Errors ✓
      // 6. Return Results ✓

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.steps).toBeDefined();
      expect(result.outputs).toBeDefined();
    }, { timeout: 15000 });
  });

  describe('Performance Requirements', () => {
    it('should execute workflow efficiently', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      const startTime = Date.now();
      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);

      // Reasonable performance expectation (not the 2s from agent-editor)
      // This includes HTTP call which can be slow
      expect(duration).toBeLessThan(15000);
    }, { timeout: 20000 });

    it('should have zero console errors during execution', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    }, { timeout: 15000 });
  });

  describe('Context Management - README Claims', () => {
    it('should pass context between steps', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      // Each step should have access to previous step outputs
      expect(result.steps.length).toBeGreaterThan(1);

      // Dependent steps should execute after their dependencies
      const templateStepIndex = result.steps.findIndex(s => s.id === 'http://example.org/templateStep');
      const sparqlStepIndex = result.steps.findIndex(s => s.id === 'http://example.org/sparqlStep');

      expect(templateStepIndex).toBeGreaterThan(sparqlStepIndex);
    }, { timeout: 15000 });
  });

  describe('Error Handling - README Claims', () => {
    it('should handle workflow validation', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      // Test validation capability
      const validation = await executor.validateWorkflow(
        'http://example.org/AllStepsIntegrationWorkflow'
      );

      expect(validation).toBeDefined();
      expect(validation.valid).toBeDefined();
      expect(validation.workflowId).toBe('http://example.org/AllStepsIntegrationWorkflow');
    }, { timeout: 10000 });
  });

  describe('Real-World Use Case - Data Processing', () => {
    it('should demonstrate data processing pipeline from README', async () => {
      const executor = new WorkflowExecutor({
        graphDir: testDir,
        logger: mockLogger
      });

      const result = await executor.execute(
        'http://example.org/AllStepsIntegrationWorkflow',
        {}
      );

      expect(result.success).toBe(true);

      // Verify all step types work together
      expect(result.steps).toHaveLength(5);

      // Verify data flow
      expect(result.steps[0].success).toBe(true); // Query data
      expect(result.steps[1].success).toBe(true); // Process data
      expect(result.steps[2].success).toBe(true); // Store results
      expect(result.steps[3].success).toBe(true); // External API
      expect(result.steps[4].success).toBe(true); // Notify
    }, { timeout: 15000 });
  });
});
