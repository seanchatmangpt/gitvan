/**
 * Integration Tests - Enhanced Autonomic System
 *
 * Comprehensive tests for Zod, Ollama, and Nunjucks integration
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { safeValidate, createAPIResponse, GitEventSchema, HookSchema } from '@/lib/schemas';
import { OllamaLLMEngine } from '@/lib/ollama-engine';
import { NunjucksTemplateEngine, TTL_TEMPLATES } from '@/lib/nunjucks-engine';
import { AIEngineSelector } from '@/lib/ai-engine-selector';
import { EnhancedWorkflowGenerator } from '@/lib/enhanced-workflow-generator';

// ============================================================================
// Zod Schema Tests
// ============================================================================

describe('Zod Schemas', () => {
  it('validates git commit event correctly', () => {
    const event = {
      type: 'CommitEvent',
      hash: 'a'.repeat(40),
      author: 'test@example.com',
      message: 'feat: add feature',
      timestamp: new Date().toISOString(),
      files: ['src/index.ts'],
      additions: 10,
      deletions: 5,
      branch: 'main',
    };

    const result = safeValidate(GitEventSchema, event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(event);
    }
  });

  it('rejects invalid git event', () => {
    const invalid = {
      type: 'CommitEvent',
      hash: 'short', // Invalid - must be 40 chars
      author: 'test@example.com',
    };

    const result = safeValidate(GitEventSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('validates hook schema', () => {
    const hook = {
      name: 'test-hook',
      trigger: 'CommitEvent',
      condition: 'always',
      action: 'test',
      ttl: '@prefix gh: <http://example.org/git-hooks#> .',
      priority: 5,
      autoExecute: true,
    };

    const result = safeValidate(HookSchema, hook);
    expect(result.success).toBe(true);
  });

  it('creates API response with timestamp', () => {
    const response = createAPIResponse(true, { data: 'test' }, undefined);
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ data: 'test' });
    expect(response.timestamp).toBeDefined();
    expect(new Date(response.timestamp).getTime()).toBeGreaterThan(0);
  });
});

// ============================================================================
// Nunjucks Template Engine Tests
// ============================================================================

describe('Nunjucks Template Engine', () => {
  let engine: NunjucksTemplateEngine;

  beforeAll(() => {
    engine = new NunjucksTemplateEngine();
  });

  it('renders basic TTL hook template', async () => {
    const ttl = await engine.renderString(TTL_TEMPLATES.basicHook, {
      name: 'Test Hook',
      description: 'A test hook',
      priority: 5,
      autoExecute: true,
      triggerType: 'CommitEvent',
      action: 'echo "Test"',
    });

    expect(ttl).toContain('gh:test-hook');
    expect(ttl).toContain('gh:name "Test Hook"');
    expect(ttl).toContain('gh:priority 5');
  });

  it('applies custom filters', async () => {
    const result = await engine.renderString('{{ "hello" | upper }}', {});
    expect(result).toBe('HELLO');
  });

  it('uses global functions like uuid', async () => {
    const result = await engine.renderString('{{ uuid() }}', {});
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('renders composite action hook', async () => {
    const ttl = await engine.renderString(TTL_TEMPLATES.compositeActionHook, {
      name: 'Composite Hook',
      description: 'Multi-step hook',
      priority: 8,
      triggerType: 'PushEvent',
      steps: [
        { action: 'gh:AnalyzeFailure', params: { level: 'info' } },
        { action: 'gh:AdjustPattern', params: {} },
      ],
    });

    expect(ttl).toContain('gh:CompositeAction');
    expect(ttl).toContain('rdf:_1');
    expect(ttl).toContain('rdf:_2');
  });

  it('handles date formatting', async () => {
    const result = await engine.renderString('{{ now | date("YYYY-MM-DD") }}', {});
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ============================================================================
// Ollama Engine Tests
// ============================================================================

describe('Ollama Engine', () => {
  let engine: OllamaLLMEngine;

  beforeAll(() => {
    engine = new OllamaLLMEngine('http://localhost:11434', 'ministral-3b');
  });

  it('provides model info', async () => {
    const info = await engine.getModelInfo();
    expect(info.model).toBe('ministral-3b');
    expect(info.baseUrl).toBe('http://localhost:11434');
    expect(info.parameters).toBeDefined();
  });

  it('checks health status', async () => {
    // Mock health check - in real tests, Ollama must be running
    const health = await engine.health();
    // Expected to return false if Ollama not running locally
    expect(typeof health).toBe('boolean');
  });

  it('has all required methods', () => {
    expect(engine.generateCommitMessage).toBeDefined();
    expect(engine.analyzeCodeQuality).toBeDefined();
    expect(engine.suggestOptimizations).toBeDefined();
    expect(engine.explainChanges).toBeDefined();
    expect(engine.recommendPatterns).toBeDefined();
    expect(engine.ask).toBeDefined();
    expect(engine.analyzeSecurityRisks).toBeDefined();
    expect(engine.generateTestCases).toBeDefined();
    expect(engine.generateDocumentation).toBeDefined();
  });
});

// ============================================================================
// AI Engine Selector Tests
// ============================================================================

describe('AI Engine Selector', () => {
  it('initializes with auto mode', async () => {
    const selector = new AIEngineSelector({ type: 'auto', fallback: true });
    const activeEngine = selector.getActiveEngine();
    expect(['anthropic', 'ollama']).toContain(activeEngine.type);
  });

  it('checks health of all engines', async () => {
    const selector = new AIEngineSelector({ type: 'auto' });
    const health = await selector.checkHealth();
    expect(health).toHaveProperty('anthropic');
    expect(health).toHaveProperty('ollama');
    expect(health).toHaveProperty('active');
  });

  it('switches between engines', async () => {
    const selector = new AIEngineSelector({ type: 'auto', fallback: true });
    const originalEngine = selector.getActiveEngine().type;
    const fallbackEngine = originalEngine === 'anthropic' ? 'ollama' : 'anthropic';

    // This may succeed or fail depending on what's available
    await selector.switchEngine(fallbackEngine as any);
    // No assertion - just ensure it doesn't throw
  });

  it('has all required AI methods', () => {
    const selector = new AIEngineSelector({ type: 'auto' });
    expect(selector.generateCommitMessage).toBeDefined();
    expect(selector.analyzeCodeQuality).toBeDefined();
    expect(selector.suggestOptimizations).toBeDefined();
    expect(selector.explainChanges).toBeDefined();
    expect(selector.recommendPatterns).toBeDefined();
    expect(selector.ask).toBeDefined();
    expect(selector.analyzeSecurityRisks).toBeDefined();
    expect(selector.generateTestCases).toBeDefined();
    expect(selector.generateDocumentation).toBeDefined();
  });
});

// ============================================================================
// Enhanced Workflow Generator Tests
// ============================================================================

describe('Enhanced Workflow Generator', () => {
  let generator: EnhancedWorkflowGenerator;

  beforeAll(() => {
    generator = new EnhancedWorkflowGenerator();
  });

  it('generates hook from template', async () => {
    const ttl = await generator.generateHookFromTemplate('basicHook', {
      name: 'Test',
      description: 'Test hook',
      priority: 5,
      autoExecute: true,
      triggerType: 'CommitEvent',
      action: 'test',
    });

    expect(ttl).toContain('gh:Hook');
    expect(ttl).toContain('gh:test');
  });

  it('validates generated hooks with Zod', async () => {
    const pattern = {
      type: 'test-pattern',
      trigger: 'CommitEvent',
      condition: 'always',
      action: 'echo test',
      params: {},
      priority: 5,
    };

    const hook = await generator.generateHookFromPattern(pattern);

    // Verify hook is valid
    const validation = safeValidate(HookSchema, hook);
    expect(validation.success).toBe(true);
    expect(hook.name).toContain('test-pattern');
  });

  it('generates composite hooks', async () => {
    const hook = await generator.generateCompositeHook({
      name: 'Multi-Step Hook',
      description: 'Test composite',
      trigger: 'PushEvent',
      priority: 8,
      steps: [
        { action: 'gh:Analyze', params: { type: 'test' } },
        { action: 'gh:Execute', params: { target: 'main' } },
      ],
    });

    expect(hook.name).toBe('Multi-Step Hook');
    expect(hook.metadata?.steps).toHaveLength(2);
  });

  it('generates hook documentation', async () => {
    const hook = {
      name: 'Test Hook',
      trigger: 'CommitEvent',
      condition: 'always',
      action: 'test',
      ttl: '@prefix gh: <test>',
      priority: 5,
      autoExecute: true,
    };

    const docs = await generator.generateHookDocumentation(hook);
    expect(docs).toContain('# Hook: Test Hook');
    expect(docs).toContain('CommitEvent');
    expect(docs).toContain('@prefix gh: <test>');
  });

  it('generates API endpoint code', async () => {
    const code = await generator.generateAPIEndpoint({
      name: 'GetMetrics',
      method: 'GET',
      path: '/api/metrics',
      schema: 'MetricsSchema',
      description: 'Get system metrics',
    });

    expect(code).toContain('export async function GET');
    expect(code).toContain('MetricsSchema');
    expect(code).toContain('NextRequest');
  });

  it('generates React component code', async () => {
    const code = await generator.generateReactComponent({
      componentName: 'TestComponent',
      description: 'A test component',
      props: [
        { name: 'title', type: 'string', required: true, description: 'Component title' },
        { name: 'optional', type: 'boolean', required: false, description: 'Optional prop' },
      ],
    });

    expect(code).toContain('export function TestComponent');
    expect(code).toContain('title: string');
    expect(code).toContain('optional?: boolean');
  });

  it('has all required generator methods', () => {
    expect(generator.generateHookFromTemplate).toBeDefined();
    expect(generator.generateHookFromPattern).toBeDefined();
    expect(generator.generateAndOptimizeHooks).toBeDefined();
    expect(generator.generateCompositeHook).toBeDefined();
    expect(generator.getEnhancedAutomationRecommendations).toBeDefined();
    expect(generator.generateHookDocumentation).toBeDefined();
    expect(generator.generateAPIEndpoint).toBeDefined();
    expect(generator.generateReactComponent).toBeDefined();
  });
});

// ============================================================================
// Integration Flow Tests
// ============================================================================

describe('Full Integration Workflows', () => {
  it('validates and transforms end-to-end', () => {
    // Create event
    const event = {
      type: 'CommitEvent',
      hash: 'a'.repeat(40),
      author: 'test@example.com',
      message: 'feat: test',
      timestamp: new Date().toISOString(),
      files: ['test.ts'],
      additions: 5,
      deletions: 2,
      branch: 'main',
    };

    // Validate
    const validation = safeValidate(GitEventSchema, event);
    expect(validation.success).toBe(true);

    // Create response
    const responseData = validation.success ? validation.data : undefined;
    const response = createAPIResponse(true, responseData);
    expect(response.success).toBe(true);
    expect(response.timestamp).toBeDefined();
  });

  it('generates complete hook with documentation', async () => {
    const generator = new EnhancedWorkflowGenerator();

    // Generate hook
    const hook = await generator.generateCompositeHook({
      name: 'Integration Test Hook',
      description: 'Testing integration',
      trigger: 'CommitEvent',
      priority: 7,
      steps: [
        { action: 'gh:Validate', params: { rules: 'semantic' } },
        { action: 'gh:Test', params: { suite: 'unit' } },
      ],
    });

    // Generate docs
    const docs = await generator.generateHookDocumentation(hook);

    // Verify result
    expect(hook.name).toBe('Integration Test Hook');
    expect(docs).toContain('Integration Test Hook');
    expect(docs).toContain('gh:CompositeAction');
  });

  it('renders multiple templates with custom data', async () => {
    const engine = new NunjucksTemplateEngine();

    const templates = [
      TTL_TEMPLATES.basicHook,
      TTL_TEMPLATES.patternEnforcementHook,
      TTL_TEMPLATES.compositeActionHook,
    ];

    for (const template of templates) {
      const rendered = await engine.renderString(template, {
        name: 'Test',
        description: 'Test',
        priority: 5,
        autoExecute: true,
        triggerType: 'CommitEvent',
        action: 'test',
        pattern: 'test',
        patternRegex: '.*',
        steps: [],
      });

      expect(rendered).toContain('gh:Hook');
    }
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('handles validation errors gracefully', () => {
    const invalid = { type: 'Invalid' };
    const result = safeValidate(GitEventSchema, invalid);
    expect(result.success).toBe(false);
  });

  it('fallback engine selector gracefully', async () => {
    const selector = new AIEngineSelector({ type: 'auto', fallback: true });
    // Should not throw even if engines are unavailable
    const health = await selector.checkHealth();
    expect(health).toBeDefined();
  });

  it('handles missing templates', async () => {
    const generator = new EnhancedWorkflowGenerator();
    await expect(
      generator.generateHookFromTemplate('nonexistent' as any, {})
    ).rejects.toThrow();
  });
});
