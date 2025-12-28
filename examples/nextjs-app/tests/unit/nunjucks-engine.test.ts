/**
 * Unit Tests - Nunjucks Template Engine
 *
 * Comprehensive tests for template rendering and TTL generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NunjucksTemplateEngine, TTL_TEMPLATES, CODE_TEMPLATES, DOC_TEMPLATES, nunjucksEngine } from '@/lib/nunjucks-engine';

describe('NunjucksTemplateEngine', () => {
  let engine: NunjucksTemplateEngine;

  beforeEach(() => {
    engine = new NunjucksTemplateEngine();
  });

  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe('renderString', () => {
    it('should render simple variable substitution', async () => {
      const result = await engine.renderString('Hello {{ name }}!', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should render multiple variables', async () => {
      const result = await engine.renderString('{{ greeting }} {{ name }}!', {
        greeting: 'Hi',
        name: 'Test',
      });
      expect(result).toBe('Hi Test!');
    });

    it('should handle missing variables gracefully', async () => {
      const result = await engine.renderString('Hello {{ name }}!', {});
      expect(result).toBe('Hello !');
    });

    it('should handle nested object access', async () => {
      const result = await engine.renderString('{{ user.name }}', {
        user: { name: 'Alice' },
      });
      expect(result).toBe('Alice');
    });

    it('should handle array iteration', async () => {
      const result = await engine.renderString(
        '{% for item in items %}{{ item }} {% endfor %}',
        { items: ['a', 'b', 'c'] }
      );
      expect(result).toBe('a b c ');
    });
  });

  // ============================================================================
  // Filter Tests
  // ============================================================================

  describe('Filters', () => {
    describe('upper filter', () => {
      it('should convert to uppercase', async () => {
        const result = await engine.renderString('{{ name | upper }}', { name: 'hello' });
        expect(result).toBe('HELLO');
      });

      it('should handle empty string', async () => {
        const result = await engine.renderString('{{ name | upper }}', { name: '' });
        expect(result).toBe('');
      });
    });

    describe('lower filter', () => {
      it('should convert to lowercase', async () => {
        const result = await engine.renderString('{{ name | lower }}', { name: 'HELLO' });
        expect(result).toBe('hello');
      });
    });

    describe('capitalize filter', () => {
      it('should capitalize first letter', async () => {
        const result = await engine.renderString('{{ name | capitalize }}', { name: 'hello world' });
        expect(result).toBe('Hello world');
      });

      it('should handle empty string', async () => {
        const result = await engine.renderString('{{ name | capitalize }}', { name: '' });
        expect(result).toBe('');
      });
    });

    describe('slug filter', () => {
      it('should create slug from text', async () => {
        const result = await engine.renderString('{{ text | slug }}', { text: 'Hello World' });
        expect(result).toBe('hello-world');
      });

      it('should remove special characters', async () => {
        const result = await engine.renderString('{{ text | slug }}', { text: 'Hello! World?' });
        expect(result).toBe('hello-world');
      });

      it('should handle multiple spaces', async () => {
        const result = await engine.renderString('{{ text | slug }}', { text: 'Hello   World' });
        expect(result).toBe('hello-world');
      });
    });

    describe('date filter', () => {
      it('should format date with YYYY-MM-DD', async () => {
        const result = await engine.renderString('{{ now | date("YYYY-MM-DD") }}', {});
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('should format date with custom format', async () => {
        const result = await engine.renderString('{{ now | date("YYYY/MM/DD HH:mm") }}', {});
        expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
      });

      it('should handle Date object', async () => {
        const date = new Date('2024-06-15T10:30:00Z');
        const result = await engine.renderString('{{ date | date("YYYY-MM-DD") }}', { date });
        expect(result).toBe('2024-06-15');
      });
    });

    describe('json filter', () => {
      it('should serialize object to JSON', async () => {
        const result = await engine.renderString('{{ data | json }}', { data: { key: 'value' } });
        expect(result).toBe('{\n  "key": "value"\n}');
      });

      it('should accept custom indentation', async () => {
        const result = await engine.renderString('{{ data | json(4) }}', { data: { a: 1 } });
        expect(result).toBe('{\n    "a": 1\n}');
      });
    });

    describe('indent filter', () => {
      it('should indent text', async () => {
        const result = await engine.renderString('{{ text | indent(4) }}', { text: 'line1\nline2' });
        expect(result).toBe('    line1\n    line2');
      });
    });

    describe('truncate filter', () => {
      it('should truncate long text', async () => {
        const result = await engine.renderString('{{ text | truncate(10) }}', {
          text: 'This is a very long text',
        });
        expect(result).toBe('This is...');
      });

      it('should not truncate short text', async () => {
        const result = await engine.renderString('{{ text | truncate(50) }}', { text: 'Short' });
        expect(result).toBe('Short');
      });
    });

    describe('default filter', () => {
      it('should provide default for undefined', async () => {
        const result = await engine.renderString('{{ value | default("fallback") }}', {});
        expect(result).toBe('fallback');
      });

      it('should use actual value when present', async () => {
        const result = await engine.renderString('{{ value | default("fallback") }}', { value: 'actual' });
        expect(result).toBe('actual');
      });
    });
  });

  // ============================================================================
  // Global Functions Tests
  // ============================================================================

  describe('Global Functions', () => {
    describe('now()', () => {
      it('should return current ISO timestamp', async () => {
        const result = await engine.renderString('{{ now() }}', {});
        expect(new Date(result).getTime()).toBeGreaterThan(0);
      });
    });

    describe('uuid()', () => {
      it('should generate valid UUID v4', async () => {
        const result = await engine.renderString('{{ uuid() }}', {});
        expect(result).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      });

      it('should generate unique UUIDs', async () => {
        const uuid1 = await engine.renderString('{{ uuid() }}', {});
        const uuid2 = await engine.renderString('{{ uuid() }}', {});
        expect(uuid1).not.toBe(uuid2);
      });
    });

    describe('randomString()', () => {
      it('should generate string of specified length', async () => {
        const result = await engine.renderString('{{ randomString(20) }}', {});
        expect(result).toHaveLength(20);
      });

      it('should use alphanumeric characters', async () => {
        const result = await engine.renderString('{{ randomString(100) }}', {});
        expect(result).toMatch(/^[A-Za-z0-9]+$/);
      });
    });

    describe('repeat()', () => {
      it('should repeat string', async () => {
        const result = await engine.renderString('{{ repeat("ab", 3) }}', {});
        expect(result).toBe('ababab');
      });
    });

    describe('range()', () => {
      it('should generate range of numbers', async () => {
        const result = await engine.renderString(
          '{% for i in range(0, 3) %}{{ i }}{% endfor %}',
          {}
        );
        expect(result).toBe('012');
      });

      it('should support step parameter', async () => {
        const result = await engine.renderString(
          '{% for i in range(0, 6, 2) %}{{ i }}{% endfor %}',
          {}
        );
        expect(result).toBe('024');
      });
    });
  });

  // ============================================================================
  // TTL Template Tests
  // ============================================================================

  describe('TTL Templates', () => {
    describe('basicHook template', () => {
      it('should render basic hook TTL', async () => {
        const result = await engine.renderString(TTL_TEMPLATES.basicHook, {
          name: 'Test Hook',
          description: 'A test hook',
          priority: 5,
          autoExecute: true,
          triggerType: 'git:CommitEvent',
          action: 'echo "test"',
        });

        expect(result).toContain('@prefix gh:');
        expect(result).toContain('gh:test-hook');
        expect(result).toContain('gh:name "Test Hook"');
        expect(result).toContain('gh:priority 5');
        expect(result).toContain('gh:autoExecute true');
      });

      it('should slugify hook name', async () => {
        const result = await engine.renderString(TTL_TEMPLATES.basicHook, {
          name: 'My Complex Hook Name',
          description: 'Description',
          priority: 5,
          autoExecute: true,
          triggerType: 'git:CommitEvent',
          action: 'echo "test"',
        });

        expect(result).toContain('gh:my-complex-hook-name');
      });
    });

    describe('patternEnforcementHook template', () => {
      it('should render pattern enforcement hook', async () => {
        const result = await engine.renderString(TTL_TEMPLATES.patternEnforcementHook, {
          pattern: 'semantic',
          description: 'Enforce semantic commits',
          priority: 9,
          triggerType: 'git:CommitEvent',
          patternRegex: '^(feat|fix):',
          actionSteps: [
            { type: 'gh:Validate' },
            { type: 'gh:Reject' },
          ],
        });

        expect(result).toContain('gh:EnforceSemantic');
        expect(result).toContain('gh:PatternMatch');
        expect(result).toContain('^(feat|fix):');
      });
    });

    describe('compositeActionHook template', () => {
      it('should render composite action hook', async () => {
        const result = await engine.renderString(TTL_TEMPLATES.compositeActionHook, {
          name: 'Multi-Step Hook',
          description: 'Hook with multiple steps',
          priority: 8,
          triggerType: 'git:PushEvent',
          steps: [
            { action: 'gh:Analyze', params: { level: 'deep' } },
            { action: 'gh:Execute', params: { target: 'all' } },
          ],
        });

        expect(result).toContain('gh:CompositeAction');
        expect(result).toContain('rdf:_1');
        expect(result).toContain('rdf:_2');
      });
    });
  });

  // ============================================================================
  // Code Template Tests
  // ============================================================================

  describe('Code Templates', () => {
    describe('apiRoute template', () => {
      it('should render API route template', async () => {
        const result = await engine.renderString(CODE_TEMPLATES.apiRoute, {
          schema: 'TestSchema',
          method: 'get',
        });

        expect(result).toContain('import { NextRequest, NextResponse }');
        expect(result).toContain('TestSchema');
        expect(result).toContain('GET');
      });
    });

    describe('reactComponent template', () => {
      it('should render React component template', async () => {
        const result = await engine.renderString(CODE_TEMPLATES.reactComponent, {
          componentName: 'MyComponent',
          description: 'A custom component',
        });

        expect(result).toContain("'use client'");
        expect(result).toContain('export function MyComponent');
        expect(result).toContain('useState');
        expect(result).toContain('useEffect');
      });
    });

    describe('testFile template', () => {
      it('should render test file template', async () => {
        const result = await engine.renderString(CODE_TEMPLATES.testFile, {
          functionName: 'myFunction',
          module: 'utils',
        });

        expect(result).toContain("import { describe, it, expect }");
        expect(result).toContain("describe('myFunction'");
        expect(result).toContain('myFunction');
      });
    });
  });

  // ============================================================================
  // Documentation Template Tests
  // ============================================================================

  describe('Documentation Templates', () => {
    describe('apiDoc template', () => {
      it('should render API documentation', async () => {
        const result = await engine.renderString(DOC_TEMPLATES.apiDoc, {
          name: 'Get Users',
          description: 'Retrieve all users',
          method: 'get',
          path: '/api/users',
          parameters: [
            { name: 'limit', type: 'number', description: 'Max results', example: '10' },
          ],
          responseExample: { users: [] },
        });

        expect(result).toContain('# Get Users');
        expect(result).toContain('GET /api/users');
        expect(result).toContain('**limit**');
      });
    });

    describe('componentDoc template', () => {
      it('should render component documentation', async () => {
        const result = await engine.renderString(DOC_TEMPLATES.componentDoc, {
          name: 'Button',
          description: 'A clickable button',
          props: [
            { name: 'onClick', type: 'function', required: true, description: 'Click handler' },
          ],
          examples: 'See usage examples below',
        });

        expect(result).toContain('# Button');
        expect(result).toContain('**onClick**');
        expect(result).toContain('import { Button }');
      });
    });
  });

  // ============================================================================
  // Custom Extension Tests
  // ============================================================================

  describe('Custom Extensions', () => {
    it('should add custom filter', async () => {
      engine.addFilter('double', (x: number) => x * 2);
      const result = await engine.renderString('{{ value | double }}', { value: 5 });
      expect(result).toBe('10');
    });

    it('should add custom global', async () => {
      engine.addGlobal('version', '1.0.0');
      const result = await engine.renderString('Version: {{ version }}', {});
      expect(result).toBe('Version: 1.0.0');
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle undefined filter gracefully', async () => {
      // Nunjucks should throw for undefined filter
      await expect(
        engine.renderString('{{ value | nonExistentFilter }}', { value: 'test' })
      ).rejects.toThrow();
    });

    it('should handle syntax errors', async () => {
      await expect(
        engine.renderString('{{ unclosed', {})
      ).rejects.toThrow();
    });

    it('should handle invalid for loop', async () => {
      await expect(
        engine.renderString('{% for item in %}{{ item }}{% endfor %}', {})
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe('Singleton Instance', () => {
    it('should export singleton instance', () => {
      expect(nunjucksEngine).toBeDefined();
      expect(nunjucksEngine).toBeInstanceOf(NunjucksTemplateEngine);
    });

    it('should render using singleton', async () => {
      const result = await nunjucksEngine.renderString('{{ x }}', { x: 42 });
      expect(result).toBe('42');
    });
  });

  // ============================================================================
  // Complex Template Tests
  // ============================================================================

  describe('Complex Templates', () => {
    it('should handle nested loops', async () => {
      const result = await engine.renderString(
        '{% for row in rows %}{% for col in row %}{{ col }}{% endfor %}-{% endfor %}',
        { rows: [[1, 2], [3, 4]] }
      );
      expect(result).toBe('12-34-');
    });

    it('should handle conditionals', async () => {
      const result = await engine.renderString(
        '{% if enabled %}ON{% else %}OFF{% endif %}',
        { enabled: true }
      );
      expect(result).toBe('ON');
    });

    it('should handle mixed content', async () => {
      const result = await engine.renderString(
        `@prefix gh: <test#> .
gh:{{ name | slug }} a gh:Hook ;
{% if priority > 5 %}
  gh:highPriority true ;
{% endif %}
  gh:priority {{ priority }} .`,
        { name: 'Test Hook', priority: 8 }
      );

      expect(result).toContain('gh:test-hook');
      expect(result).toContain('gh:highPriority true');
      expect(result).toContain('gh:priority 8');
    });

    it('should handle macros', async () => {
      const result = await engine.renderString(
        `{% macro input(name, value='') %}
<input name="{{ name }}" value="{{ value }}">
{% endmacro %}
{{ input('email', 'test@example.com') }}`,
        {}
      );

      expect(result).toContain('name="email"');
      expect(result).toContain('value="test@example.com"');
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should render quickly for simple templates', async () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        await engine.renderString('{{ x }}', { x: i });
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete in < 5s
    });

    it('should handle large data sets', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      const result = await engine.renderString(
        '{% for item in items %}{{ item.id }}: {{ item.name }}\n{% endfor %}',
        { items }
      );
      expect(result).toContain('999: Item 999');
    });
  });
});
