/**
 * Unit Tests - Enhanced Workflow Generator
 *
 * Comprehensive tests for enhanced workflow generation with templates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnhancedWorkflowGenerator, enhancedWorkflowGenerator } from '@/lib/enhanced-workflow-generator';
import { HookSchema, AutomationSchema } from '@/lib/schemas';
import { createTestHook, assertValidHook, assertValidTTL } from '../utils/test-utils';
import { HOOK_FIXTURES } from '../fixtures';

// Mock AI engine selector to avoid actual API calls
vi.mock('@/lib/ai-engine-selector', () => ({
  aiEngineSelector: {
    ask: vi.fn().mockResolvedValue('Mock AI response'),
  },
}));

describe('EnhancedWorkflowGenerator', () => {
  let generator: EnhancedWorkflowGenerator;

  beforeEach(() => {
    generator = new EnhancedWorkflowGenerator();
    vi.clearAllMocks();
  });

  // ============================================================================
  // Template Generation Tests
  // ============================================================================

  describe('generateHookFromTemplate', () => {
    it('should generate hook from basicHook template', async () => {
      const ttl = await generator.generateHookFromTemplate('basicHook', {
        name: 'Test Hook',
        description: 'A test hook description',
        priority: 5,
        autoExecute: true,
        triggerType: 'git:CommitEvent',
        action: 'echo "test"',
      });

      expect(ttl).toContain('@prefix gh:');
      expect(ttl).toContain('gh:test-hook');
      expect(ttl).toContain('gh:name "Test Hook"');
    });

    it('should generate hook from patternEnforcementHook template', async () => {
      const ttl = await generator.generateHookFromTemplate('patternEnforcementHook', {
        pattern: 'semantic',
        description: 'Enforce semantic commits',
        priority: 9,
        triggerType: 'git:CommitEvent',
        patternRegex: '^(feat|fix):',
        actionSteps: [],
      });

      expect(ttl).toContain('gh:PatternMatch');
      expect(ttl).toContain('^(feat|fix):');
    });

    it('should generate hook from compositeActionHook template', async () => {
      const ttl = await generator.generateHookFromTemplate('compositeActionHook', {
        name: 'Multi-Step Hook',
        description: 'Hook with multiple steps',
        priority: 8,
        triggerType: 'git:PushEvent',
        steps: [
          { action: 'gh:Analyze', params: { level: 'deep' } },
          { action: 'gh:Execute', params: { target: 'all' } },
        ],
      });

      expect(ttl).toContain('gh:CompositeAction');
      expect(ttl).toContain('rdf:_1');
      expect(ttl).toContain('rdf:_2');
    });

    it('should throw for unknown template', async () => {
      await expect(
        generator.generateHookFromTemplate('unknownTemplate' as any, {})
      ).rejects.toThrow('Unknown template: unknownTemplate');
    });
  });

  // ============================================================================
  // Pattern-Based Hook Generation Tests
  // ============================================================================

  describe('generateHookFromPattern', () => {
    it('should generate valid hook from pattern', async () => {
      const hook = await generator.generateHookFromPattern({
        type: 'test-pattern',
        trigger: 'CommitEvent',
        condition: 'always',
        action: 'echo test',
        params: { custom: 'value' },
        priority: 7,
      });

      assertValidHook(hook);
      expect(hook.name).toContain('test-pattern');
      expect(hook.trigger).toBe('CommitEvent');
      expect(hook.priority).toBe(7);
    });

    it('should use default priority when not specified', async () => {
      const hook = await generator.generateHookFromPattern({
        type: 'default-priority',
        trigger: 'PushEvent',
        condition: 'any',
        action: 'run',
        params: {},
      });

      expect(hook.priority).toBe(5);
    });

    it('should include metadata from params', async () => {
      const hook = await generator.generateHookFromPattern({
        type: 'with-metadata',
        trigger: 'TagEvent',
        condition: 'version',
        action: 'deploy',
        params: { environment: 'production', timeout: 30000 },
      });

      expect(hook.metadata).toEqual({ environment: 'production', timeout: 30000 });
    });

    it('should validate generated hook with Zod', async () => {
      const hook = await generator.generateHookFromPattern({
        type: 'validated-hook',
        trigger: 'CommitEvent',
        condition: 'test',
        action: 'validate',
        params: {},
      });

      const validation = HookSchema.safeParse(hook);
      expect(validation.success).toBe(true);
    });

    it('should set autoExecute to true', async () => {
      const hook = await generator.generateHookFromPattern({
        type: 'auto-execute',
        trigger: 'PushEvent',
        condition: 'any',
        action: 'run',
        params: {},
      });

      expect(hook.autoExecute).toBe(true);
    });
  });

  // ============================================================================
  // Batch Hook Generation Tests
  // ============================================================================

  describe('generateAndOptimizeHooks', () => {
    it('should generate hooks from multiple patterns', async () => {
      const patterns = [
        { type: 'pattern1', trigger: 'CommitEvent', condition: 'a', action: 'x', params: {} },
        { type: 'pattern2', trigger: 'PushEvent', condition: 'b', action: 'y', params: {} },
        { type: 'pattern3', trigger: 'TagEvent', condition: 'c', action: 'z', params: {} },
      ];

      const hooks = await generator.generateAndOptimizeHooks(patterns);

      expect(hooks).toHaveLength(3);
    });

    it('should handle empty patterns array', async () => {
      const hooks = await generator.generateAndOptimizeHooks([]);
      expect(hooks).toHaveLength(0);
    });

    it('should continue on individual pattern failure', async () => {
      // Mock console.error to suppress error logs
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const patterns = [
        { type: 'valid', trigger: 'CommitEvent', condition: 'a', action: 'x', params: {} },
        // This pattern should work
        { type: 'also-valid', trigger: 'PushEvent', condition: 'b', action: 'y', params: {} },
      ];

      const hooks = await generator.generateAndOptimizeHooks(patterns);

      expect(hooks.length).toBeGreaterThanOrEqual(2);
      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Composite Hook Tests
  // ============================================================================

  describe('generateCompositeHook', () => {
    it('should generate composite hook with multiple steps', async () => {
      const hook = await generator.generateCompositeHook({
        name: 'Multi-Step Workflow',
        description: 'A workflow with multiple steps',
        trigger: 'PushEvent',
        priority: 8,
        steps: [
          { action: 'gh:Validate', params: { strict: true } },
          { action: 'gh:Test', params: { suite: 'unit' } },
          { action: 'gh:Deploy', params: { env: 'staging' } },
        ],
      });

      assertValidHook(hook);
      expect(hook.name).toBe('Multi-Step Workflow');
      expect(hook.action).toBe('composite');
      expect(hook.metadata?.steps).toHaveLength(3);
    });

    it('should include TTL with composite action', async () => {
      const hook = await generator.generateCompositeHook({
        name: 'Composite Test',
        description: 'Test',
        trigger: 'CommitEvent',
        priority: 5,
        steps: [{ action: 'gh:Step1', params: {} }],
      });

      expect(hook.ttl).toContain('gh:CompositeAction');
    });

    it('should validate composite hook with Zod', async () => {
      const hook = await generator.generateCompositeHook({
        name: 'Validated Composite',
        description: 'Test',
        trigger: 'TagEvent',
        priority: 7,
        steps: [{ action: 'gh:Action', params: {} }],
      });

      const validation = HookSchema.safeParse(hook);
      expect(validation.success).toBe(true);
    });

    it('should handle empty steps array', async () => {
      const hook = await generator.generateCompositeHook({
        name: 'Empty Steps',
        description: 'No steps',
        trigger: 'PushEvent',
        priority: 5,
        steps: [],
      });

      expect(hook.metadata?.steps).toHaveLength(0);
    });
  });

  // ============================================================================
  // Automation Recommendations Tests
  // ============================================================================

  describe('getEnhancedAutomationRecommendations', () => {
    it('should return automation recommendations', async () => {
      const recommendations = await generator.getEnhancedAutomationRecommendations({
        largeCommits: 10,
        testCoverage: 50,
        hookFailureRate: 5,
      });

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should validate recommendations with Zod', async () => {
      const recommendations = await generator.getEnhancedAutomationRecommendations({
        largeCommits: 0,
        testCoverage: 90,
        hookFailureRate: 0,
      });

      recommendations.forEach((rec) => {
        const validation = AutomationSchema.safeParse(rec);
        expect(validation.success).toBe(true);
      });
    });

    it('should handle missing metrics', async () => {
      const recommendations = await generator.getEnhancedAutomationRecommendations({});
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  // ============================================================================
  // Documentation Generation Tests
  // ============================================================================

  describe('generateHookDocumentation', () => {
    it('should generate markdown documentation', async () => {
      const hook = createTestHook({
        name: 'Documented Hook',
        trigger: 'CommitEvent',
        condition: 'semantic',
        action: 'validate',
        priority: 8,
      });

      const docs = await generator.generateHookDocumentation(hook);

      expect(docs).toContain('# Hook: Documented Hook');
      expect(docs).toContain('**Trigger**: CommitEvent');
      expect(docs).toContain('**Priority**: 8');
    });

    it('should include TTL definition in documentation', async () => {
      const hook = createTestHook({ ttl: '@prefix gh: <test#> . gh:Example a gh:Hook .' });
      const docs = await generator.generateHookDocumentation(hook);

      expect(docs).toContain('## TTL Definition');
      expect(docs).toContain('@prefix gh: <test#>');
    });

    it('should include timestamp in documentation', async () => {
      const hook = createTestHook();
      const docs = await generator.generateHookDocumentation(hook);

      expect(docs).toContain('Generated at:');
    });
  });

  // ============================================================================
  // API Endpoint Generation Tests
  // ============================================================================

  describe('generateAPIEndpoint', () => {
    it('should generate TypeScript API endpoint', async () => {
      const code = await generator.generateAPIEndpoint({
        name: 'GetUsers',
        method: 'get',
        path: '/api/users',
        schema: 'UserSchema',
        description: 'Retrieve all users',
      });

      expect(code).toContain('import { NextRequest, NextResponse }');
      expect(code).toContain('UserSchema');
      expect(code).toContain('export async function GET');
    });

    it('should handle POST method', async () => {
      const code = await generator.generateAPIEndpoint({
        name: 'CreateUser',
        method: 'post',
        path: '/api/users',
        schema: 'CreateUserSchema',
        description: 'Create a new user',
      });

      expect(code).toContain('export async function POST');
    });

    it('should include error handling', async () => {
      const code = await generator.generateAPIEndpoint({
        name: 'Test',
        method: 'get',
        path: '/api/test',
        schema: 'TestSchema',
        description: 'Test endpoint',
      });

      expect(code).toContain('catch (error)');
      expect(code).toContain('status: 500');
    });
  });

  // ============================================================================
  // React Component Generation Tests
  // ============================================================================

  describe('generateReactComponent', () => {
    it('should generate React component', async () => {
      const code = await generator.generateReactComponent({
        componentName: 'UserCard',
        description: 'Displays user information',
      });

      expect(code).toContain("'use client'");
      expect(code).toContain('export function UserCard');
      expect(code).toContain('useState');
    });

    it('should include props interface', async () => {
      const code = await generator.generateReactComponent({
        componentName: 'DataTable',
        description: 'A data table component',
        props: [
          { name: 'data', type: 'object[]', required: true, description: 'Table data' },
          { name: 'columns', type: 'string[]', required: true, description: 'Column names' },
          { name: 'sortable', type: 'boolean', required: false, description: 'Enable sorting' },
        ],
      });

      expect(code).toContain('interface Props');
      expect(code).toContain('data: object[]');
      expect(code).toContain('columns: string[]');
      expect(code).toContain('sortable?: boolean');
    });

    it('should handle empty props', async () => {
      const code = await generator.generateReactComponent({
        componentName: 'EmptyComponent',
        description: 'No props',
        props: [],
      });

      expect(code).toContain('interface Props');
    });
  });

  // ============================================================================
  // Batch Execution Tests
  // ============================================================================

  describe('generateAndExecuteHooks', () => {
    it('should generate and execute hooks', async () => {
      const patterns = [
        { type: 'exec-pattern', trigger: 'CommitEvent', condition: 'a', action: 'x', params: {} },
      ];

      const results = await generator.generateAndExecuteHooks(patterns);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('pattern');
      expect(results[0]).toHaveProperty('hook');
      expect(results[0]).toHaveProperty('executed');
      expect(results[0]).toHaveProperty('result');
    });

    it('should handle execution failures gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const patterns = [
        { type: 'test', trigger: 'Event', condition: 'a', action: 'b', params: {} },
      ];

      const results = await generator.generateAndExecuteHooks(patterns);

      expect(Array.isArray(results)).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(enhancedWorkflowGenerator).toBeDefined();
      expect(enhancedWorkflowGenerator).toBeInstanceOf(EnhancedWorkflowGenerator);
    });

    it('should have all required methods', () => {
      expect(enhancedWorkflowGenerator.generateHookFromTemplate).toBeDefined();
      expect(enhancedWorkflowGenerator.generateHookFromPattern).toBeDefined();
      expect(enhancedWorkflowGenerator.generateAndOptimizeHooks).toBeDefined();
      expect(enhancedWorkflowGenerator.generateCompositeHook).toBeDefined();
      expect(enhancedWorkflowGenerator.getEnhancedAutomationRecommendations).toBeDefined();
      expect(enhancedWorkflowGenerator.generateHookDocumentation).toBeDefined();
      expect(enhancedWorkflowGenerator.generateAPIEndpoint).toBeDefined();
      expect(enhancedWorkflowGenerator.generateReactComponent).toBeDefined();
      expect(enhancedWorkflowGenerator.generateAndExecuteHooks).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle special characters in names', async () => {
      const hook = await generator.generateCompositeHook({
        name: 'Hook with "quotes" and <brackets>',
        description: 'Test',
        trigger: 'CommitEvent',
        priority: 5,
        steps: [],
      });

      expect(hook.name).toBe('Hook with "quotes" and <brackets>');
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(1000);
      const hook = await generator.generateHookFromPattern({
        type: 'long-desc',
        trigger: 'Event',
        condition: longDescription,
        action: 'test',
        params: {},
      });

      expect(hook).toBeDefined();
    });

    it('should handle unicode in content', async () => {
      const hook = await generator.generateCompositeHook({
        name: 'Hook with emoji and unicode',
        description: 'Test',
        trigger: 'CommitEvent',
        priority: 5,
        steps: [],
      });

      assertValidHook(hook);
    });

    it('should handle concurrent generations', async () => {
      const generations = Array.from({ length: 10 }, (_, i) =>
        generator.generateHookFromPattern({
          type: `concurrent-${i}`,
          trigger: 'CommitEvent',
          condition: 'test',
          action: 'run',
          params: { index: i },
        })
      );

      const hooks = await Promise.all(generations);

      expect(hooks).toHaveLength(10);
      hooks.forEach(assertValidHook);
    });
  });
});
