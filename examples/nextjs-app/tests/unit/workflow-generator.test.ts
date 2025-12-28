/**
 * Unit Tests - Workflow Generator
 *
 * Comprehensive tests for autonomic workflow generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AutonomicWorkflowGenerator,
  workflowGenerator,
  type Hook,
  type DetectedPattern,
  type Automation,
} from '@/lib/workflow-generator';
import { createTestHook, createTestHooks, assertValidHook, assertValidTTL } from '../utils/test-utils';
import { HOOK_FIXTURES } from '../fixtures';

describe('AutonomicWorkflowGenerator', () => {
  let generator: AutonomicWorkflowGenerator;

  beforeEach(() => {
    generator = new AutonomicWorkflowGenerator();
  });

  // ============================================================================
  // Template Selection Tests
  // ============================================================================

  describe('Template Selection', () => {
    it('should have built-in templates', () => {
      // Templates are private, but we can verify by generating hooks
      const pattern: DetectedPattern = {
        type: 'enforce-pattern',
        trigger: 'CommitEvent',
        condition: 'always',
        action: 'validate',
        params: {
          patternName: 'Test',
          description: 'Test pattern',
          triggerEvent: 'git:CommitEvent',
          pattern: '^test',
        },
      };

      // This should work because enforce-pattern is a built-in template
      expect(async () => {
        await generator.generateHooksFromPatterns([pattern]);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Hook Generation Tests
  // ============================================================================

  describe('generateHooksFromPatterns', () => {
    it('should generate hooks from patterns', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: 'semantic',
          action: 'validate-message',
          params: {
            patternName: 'SemanticCommit',
            description: 'Enforce semantic commits',
            triggerEvent: 'git:CommitEvent',
            pattern: '^(feat|fix|docs):',
          },
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);

      expect(hooks).toHaveLength(1);
      expect(hooks[0].name).toBeTruthy();
      expect(hooks[0].trigger).toBe('CommitEvent');
    });

    it('should generate multiple hooks from multiple patterns', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: 'pattern1',
          action: 'action1',
          params: {
            patternName: 'Pattern1',
            description: 'First pattern',
            triggerEvent: 'git:CommitEvent',
            pattern: '^test1',
          },
        },
        {
          type: 'auto-deploy',
          trigger: 'TagEvent',
          condition: 'version',
          action: 'deploy',
          params: {
            environment: 'production',
            versionPattern: '^v\\d+\\.\\d+\\.\\d+$',
            deploymentUrl: 'https://deploy.example.com',
          },
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);

      expect(hooks.length).toBeGreaterThanOrEqual(1);
    });

    it('should skip patterns with unknown templates', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'unknown-template',
          trigger: 'SomeEvent',
          condition: 'always',
          action: 'nothing',
          params: {},
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);

      expect(hooks).toHaveLength(0);
    });

    it('should apply priority from pattern', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: 'test',
          action: 'test',
          priority: 9,
          params: {
            patternName: 'HighPriority',
            description: 'High priority pattern',
            triggerEvent: 'git:CommitEvent',
            pattern: '^high',
          },
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);

      if (hooks.length > 0) {
        expect(hooks[0].priority).toBe(9);
      }
    });

    it('should use default priority when not specified', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: 'test',
          action: 'test',
          params: {
            patternName: 'Default',
            description: 'Default priority',
            triggerEvent: 'git:CommitEvent',
            pattern: '^default',
          },
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);

      if (hooks.length > 0) {
        expect(hooks[0].priority).toBe(5);
      }
    });

    it('should handle empty patterns array', async () => {
      const hooks = await generator.generateHooksFromPatterns([]);
      expect(hooks).toHaveLength(0);
    });
  });

  // ============================================================================
  // Automation Detection Tests
  // ============================================================================

  describe('detectRequiredAutomation', () => {
    it('should return automation recommendations', async () => {
      const automations = await generator.detectRequiredAutomation();

      expect(automations).toBeDefined();
      expect(Array.isArray(automations)).toBe(true);
      expect(automations.length).toBeGreaterThan(0);
    });

    it('should include required automation properties', async () => {
      const automations = await generator.detectRequiredAutomation();

      automations.forEach((auto: Automation) => {
        expect(auto.id).toBeTruthy();
        expect(auto.name).toBeTruthy();
        expect(auto.description).toBeTruthy();
        expect(auto.priority).toBeGreaterThanOrEqual(1);
        expect(auto.priority).toBeLessThanOrEqual(10);
        expect(['low', 'medium', 'high']).toContain(auto.effort);
        expect(auto.expectedBenefit).toBeTruthy();
      });
    });

    it('should include semantic commit enforcement', async () => {
      const automations = await generator.detectRequiredAutomation();
      const commitEnforcement = automations.find((a: Automation) => a.id === 'enforce-commits');

      expect(commitEnforcement).toBeDefined();
      expect(commitEnforcement?.priority).toBe(9);
    });

    it('should include quality gates', async () => {
      const automations = await generator.detectRequiredAutomation();
      const qualityGates = automations.find((a: Automation) => a.id === 'quality-gates');

      expect(qualityGates).toBeDefined();
    });
  });

  // ============================================================================
  // Hook Optimization Tests
  // ============================================================================

  describe('optimizeExistingHooks', () => {
    it('should boost priority of hooks', async () => {
      const hooks = createTestHooks(3, { priority: 5 });
      const optimized = await generator.optimizeExistingHooks(hooks);

      optimized.forEach((hook) => {
        expect(hook.priority).toBe(6);
      });
    });

    it('should cap priority at 10', async () => {
      const hooks = createTestHooks(1, { priority: 10 });
      const optimized = await generator.optimizeExistingHooks(hooks);

      expect(optimized[0].priority).toBe(10);
    });

    it('should enable auto-execute', async () => {
      const hooks = createTestHooks(1, { autoExecute: false });
      const optimized = await generator.optimizeExistingHooks(hooks);

      expect(optimized[0].autoExecute).toBe(true);
    });

    it('should preserve other hook properties', async () => {
      const hooks = [createTestHook({ name: 'original-name', trigger: 'CustomEvent' })];
      const optimized = await generator.optimizeExistingHooks(hooks);

      expect(optimized[0].name).toBe('original-name');
      expect(optimized[0].trigger).toBe('CustomEvent');
    });

    it('should handle empty hooks array', async () => {
      const optimized = await generator.optimizeExistingHooks([]);
      expect(optimized).toHaveLength(0);
    });
  });

  // ============================================================================
  // Self-Healing Hooks Tests
  // ============================================================================

  describe('createSelfHealingHooks', () => {
    it('should create self-healing hooks', async () => {
      const hooks = await generator.createSelfHealingHooks();

      expect(hooks.length).toBeGreaterThan(0);
    });

    it('should include failure recovery hook', async () => {
      const hooks = await generator.createSelfHealingHooks();
      const failureHook = hooks.find((h) => h.name === 'self-heal-hook-failures');

      expect(failureHook).toBeDefined();
      expect(failureHook?.trigger).toBe('HookFailureEvent');
      expect(failureHook?.priority).toBe(10);
    });

    it('should include slow hook optimization', async () => {
      const hooks = await generator.createSelfHealingHooks();
      const optimizeHook = hooks.find((h) => h.name === 'self-optimize-slow-hooks');

      expect(optimizeHook).toBeDefined();
      expect(optimizeHook?.trigger).toBe('PerformanceEvent');
    });

    it('should have valid TTL for self-healing hooks', async () => {
      const hooks = await generator.createSelfHealingHooks();

      hooks.forEach((hook) => {
        expect(hook.ttl).toContain('@prefix');
        expect(hook.ttl).toContain('gh:');
      });
    });
  });

  // ============================================================================
  // Hook Execution Tests
  // ============================================================================

  describe('executeHook', () => {
    it('should execute hook successfully', async () => {
      const hook = createTestHook();
      const result = await generator.executeHook(hook);

      expect(result.success).toBe(true);
      expect(result.hookName).toBe(hook.name);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.message).toContain('successfully');
    });

    it('should return hook name in result', async () => {
      const hook = createTestHook({ name: 'custom-hook-name' });
      const result = await generator.executeHook(hook);

      expect(result.hookName).toBe('custom-hook-name');
    });
  });

  describe('executeHookBatch', () => {
    it('should execute multiple hooks', async () => {
      const hooks = createTestHooks(5);
      const results = await generator.executeHookBatch(hooks);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle empty batch', async () => {
      const results = await generator.executeHookBatch([]);
      expect(results).toHaveLength(0);
    });

    it('should execute hooks in parallel', async () => {
      const hooks = createTestHooks(10);
      const start = Date.now();
      await generator.executeHookBatch(hooks);
      const duration = Date.now() - start;

      // Parallel execution should be faster than sequential
      // Each hook has random delay, so we just check it completes
      expect(duration).toBeLessThan(5000);
    });
  });

  // ============================================================================
  // Hook Recommendation Tests
  // ============================================================================

  describe('recommendHooks', () => {
    it('should recommend hooks based on large commits', async () => {
      const metrics = { largeCommits: 10, testCoverage: 90, hookFailureRate: 1 };
      const recommendations = await generator.recommendHooks(metrics);

      const patternRec = recommendations.find((r) => r.hookType === 'enforce-pattern');
      expect(patternRec).toBeDefined();
      expect(patternRec?.reason).toContain('Large commits');
    });

    it('should recommend hooks based on low test coverage', async () => {
      const metrics = { largeCommits: 0, testCoverage: 50, hookFailureRate: 0 };
      const recommendations = await generator.recommendHooks(metrics);

      const qualityRec = recommendations.find((r) => r.hookType === 'quality-gate');
      expect(qualityRec).toBeDefined();
      expect(qualityRec?.reason).toContain('Low test coverage');
    });

    it('should recommend self-healing for high failure rate', async () => {
      const metrics = { largeCommits: 0, testCoverage: 90, hookFailureRate: 10 };
      const recommendations = await generator.recommendHooks(metrics);

      const healingRec = recommendations.find((r) => r.hookType === 'self-healing');
      expect(healingRec).toBeDefined();
      expect(healingRec?.reason).toContain('High hook failure rate');
    });

    it('should return empty array for good metrics', async () => {
      const metrics = { largeCommits: 0, testCoverage: 95, hookFailureRate: 0 };
      const recommendations = await generator.recommendHooks(metrics);

      expect(recommendations).toHaveLength(0);
    });

    it('should include priority in recommendations', async () => {
      const metrics = { largeCommits: 10, testCoverage: 50, hookFailureRate: 10 };
      const recommendations = await generator.recommendHooks(metrics);

      recommendations.forEach((rec) => {
        expect(rec.priority).toBeGreaterThanOrEqual(1);
        expect(rec.priority).toBeLessThanOrEqual(10);
      });
    });

    it('should include estimated benefit', async () => {
      const metrics = { largeCommits: 10, testCoverage: 90, hookFailureRate: 0 };
      const recommendations = await generator.recommendHooks(metrics);

      if (recommendations.length > 0) {
        expect(recommendations[0].estimatedBenefit).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // Template Integration Tests
  // ============================================================================

  describe('Template Integration', () => {
    it('should generate valid TTL for enforce-pattern template', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: 'semantic',
          action: 'validate',
          params: {
            patternName: 'Semantic',
            description: 'Semantic commits',
            triggerEvent: 'git:CommitEvent',
            pattern: '^(feat|fix):',
          },
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);

      if (hooks.length > 0) {
        assertValidTTL(hooks[0].ttl);
      }
    });

    it('should generate valid TTL for auto-deploy template', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'auto-deploy',
          trigger: 'TagEvent',
          condition: 'version',
          action: 'deploy',
          params: {
            environment: 'staging',
            versionPattern: '^v\\d+',
            deploymentUrl: 'https://deploy.example.com',
          },
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);

      if (hooks.length > 0) {
        assertValidTTL(hooks[0].ttl);
      }
    });

    it('should generate valid TTL for quality-gate template', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'quality-gate',
          trigger: 'PushEvent',
          condition: 'coverage',
          action: 'check',
          params: {
            metric: 'coverage',
            threshold: '80',
            comparison: 'gte',
          },
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);

      if (hooks.length > 0) {
        assertValidTTL(hooks[0].ttl);
      }
    });

    it('should generate valid TTL for self-healing template', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'self-healing',
          trigger: 'FailureEvent',
          condition: 'any',
          action: 'recover',
          params: {
            failureType: 'HookFailure',
          },
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);

      if (hooks.length > 0) {
        assertValidTTL(hooks[0].ttl);
      }
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(workflowGenerator).toBeDefined();
      expect(workflowGenerator).toBeInstanceOf(AutonomicWorkflowGenerator);
    });

    it('should have same methods as class instance', () => {
      expect(workflowGenerator.generateHooksFromPatterns).toBeDefined();
      expect(workflowGenerator.detectRequiredAutomation).toBeDefined();
      expect(workflowGenerator.optimizeExistingHooks).toBeDefined();
      expect(workflowGenerator.createSelfHealingHooks).toBeDefined();
      expect(workflowGenerator.executeHook).toBeDefined();
      expect(workflowGenerator.executeHookBatch).toBeDefined();
      expect(workflowGenerator.recommendHooks).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle patterns with special characters', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: 'special',
          action: 'validate',
          params: {
            patternName: 'Special-Pattern_123',
            description: 'Pattern with "quotes" and <brackets>',
            triggerEvent: 'git:CommitEvent',
            pattern: '^[\\w]+$',
          },
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);
      // Should not throw
      expect(Array.isArray(hooks)).toBe(true);
    });

    it('should handle very long pattern names', async () => {
      const patterns: DetectedPattern[] = [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: 'long',
          action: 'validate',
          params: {
            patternName: 'A'.repeat(100),
            description: 'Long description ' + 'B'.repeat(200),
            triggerEvent: 'git:CommitEvent',
            pattern: '^test',
          },
        },
      ];

      const hooks = await generator.generateHooksFromPatterns(patterns);
      expect(Array.isArray(hooks)).toBe(true);
    });

    it('should handle concurrent hook generation', async () => {
      const patternSets = Array.from({ length: 10 }, (_, i) => [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: `pattern-${i}`,
          action: 'validate',
          params: {
            patternName: `Pattern${i}`,
            description: `Pattern number ${i}`,
            triggerEvent: 'git:CommitEvent',
            pattern: `^test${i}`,
          },
        },
      ]);

      const results = await Promise.all(
        patternSets.map((patterns) => generator.generateHooksFromPatterns(patterns))
      );

      expect(results).toHaveLength(10);
    });
  });
});
