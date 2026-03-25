/**
 * @fileoverview Tests for GitVan KGN Template Engine
 *
 * Comprehensive test suite for the KGN-based template engine.
 * Tests cover rendering, filters, caching, error handling, and determinism.
 *
 * @test {src/lib/template-engine.mjs}
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GitVanTemplateEngine,
  getTemplateEngine,
  resetTemplateEngine,
  renderTemplate,
  TemplateRenderError,
  TemplateNotFoundError,
  TemplateSyntaxError
} from '../../src/lib/template-engine.mjs';

describe('GitVanTemplateEngine - Unit Tests', () => {
  let engine;

  beforeEach(() => {
    engine = new GitVanTemplateEngine();
  });

  afterEach(() => {
    resetTemplateEngine();
  });

  describe('Instantiation', () => {
    it('creates engine with default options', () => {
      expect(engine.options.deterministicMode).toBe(true);
      expect(engine.options.enableCache).toBe(true);
      expect(engine.options.paths).toEqual([]);
      expect(engine.options.autoescape).toBe(false);
    });

    it('respects custom options', () => {
      const customEngine = new GitVanTemplateEngine({
        deterministicMode: false,
        enableCache: false,
        paths: ['/templates'],
        autoescape: true
      });

      expect(customEngine.options.deterministicMode).toBe(false);
      expect(customEngine.options.enableCache).toBe(false);
      expect(customEngine.options.paths).toEqual(['/templates']);
      expect(customEngine.options.autoescape).toBe(true);
    });

    it('initializes filter registry', () => {
      expect(engine.filterRegistry).toBeInstanceOf(Map);
      expect(engine.filterRegistry.size).toBeGreaterThan(0);
    });
  });

  describe('String Rendering', () => {
    it('renders simple template', async () => {
      const result = await engine.renderString('Hello {{ name }}', { name: 'World' });
      expect(result).toBe('Hello World');
    });

    it('renders with variables', async () => {
      const result = await engine.renderString('{{ x }} + {{ y }} = {{ z }}', {
        x: 2,
        y: 3,
        z: 5
      });
      expect(result).toBe('2 + 3 = 5');
    });

    it('renders with filters', async () => {
      const result = await engine.renderString('{{ name | upper }}', { name: 'hello' });
      expect(result).toBe('HELLO');
    });

    it('renders empty template', async () => {
      const result = await engine.renderString('', {});
      expect(result).toBe('');
    });
  });

  describe('Case Conversion Filters', () => {
    it('camelCase filter', async () => {
      const cases = [
        ['hello-world', 'helloWorld'],
        ['hello_world', 'helloWorld'],
        ['hello world', 'helloWorld'],
        ['HelloWorld', 'helloWorld'],
        ['', ''],
        [null, '']
      ];

      for (const [input, expected] of cases) {
        const result = await engine.renderString(`{{ x | camelCase }}`, { x: input });
        expect(result).toBe(expected);
      }
    });

    it('pascalCase filter', async () => {
      const cases = [
        ['hello-world', 'HelloWorld'],
        ['hello_world', 'HelloWorld'],
        ['hello world', 'HelloWorld'],
        ['helloWorld', 'HelloWorld']
      ];

      for (const [input, expected] of cases) {
        const result = await engine.renderString(`{{ x | pascalCase }}`, { x: input });
        expect(result).toBe(expected);
      }
    });

    it('kebabCase filter', async () => {
      const cases = [
        ['HelloWorld', 'hello-world'],
        ['helloWorld', 'hello-world'],
        ['hello_world', 'hello-world'],
        ['hello world', 'hello-world'],
        ['', '']
      ];

      for (const [input, expected] of cases) {
        const result = await engine.renderString(`{{ x | kebabCase }}`, { x: input });
        expect(result).toBe(expected);
      }
    });

    it('snakeCase filter', async () => {
      const cases = [
        ['HelloWorld', 'hello_world'],
        ['helloWorld', 'hello_world'],
        ['hello-world', 'hello_world'],
        ['hello world', 'hello_world'],
        ['', '']
      ];

      for (const [input, expected] of cases) {
        const result = await engine.renderString(`{{ x | snakeCase }}`, { x: input });
        expect(result).toBe(expected);
      }
    });
  });

  describe('String Operation Filters', () => {
    it('upper filter', async () => {
      const result = await engine.renderString('{{ x | upper }}', { x: 'hello' });
      expect(result).toBe('HELLO');
    });

    it('lower filter', async () => {
      const result = await engine.renderString('{{ x | lower }}', { x: 'HELLO' });
      expect(result).toBe('hello');
    });

    it('capitalize filter', async () => {
      const result = await engine.renderString('{{ x | capitalize }}', { x: 'hello world' });
      expect(result).toBe('Hello world');
    });

    it('slug filter', async () => {
      const result = await engine.renderString('{{ x | slug }}', { x: 'Hello World!' });
      expect(result).toBe('hello-world');
    });

    it('pad filter', async () => {
      const result = await engine.renderString('{{ x | pad(5) }}', { x: '1' });
      expect(result).toBe('00001');
    });

    it('split filter', async () => {
      const result = await engine.renderString('{{ (x | split(",") | join(" ")) }}', {
        x: 'a,b,c'
      });
      expect(result.trim()).toBe('a b c');
    });

    it('length filter', async () => {
      const cases = [
        ['hello', '5'],
        [['a', 'b', 'c'], '3'],
        [{ x: 1, y: 2 }, '2']
      ];

      for (const [input, expected] of cases) {
        const result = await engine.renderString('{{ x | length }}', { x: input });
        expect(result).toBe(expected);
      }
    });
  });

  describe('Array Operation Filters', () => {
    it('sum filter', async () => {
      const result = await engine.renderString('{{ arr | sum }}', { arr: [1, 2, 3, 4, 5] });
      expect(result).toBe('15');
    });

    it('max filter', async () => {
      const result = await engine.renderString('{{ arr | max }}', { arr: [1, 5, 3, 2] });
      expect(result).toBe('5');
    });

    it('min filter', async () => {
      const result = await engine.renderString('{{ arr | min }}', { arr: [5, 2, 8, 1] });
      expect(result).toBe('1');
    });

    it('sum filter with attribute', async () => {
      const result = await engine.renderString('{{ items | sum("price") }}', {
        items: [{ price: 10 }, { price: 20 }, { price: 30 }]
      });
      expect(result).toBe('60');
    });
  });

  describe('Type Conversion Filters', () => {
    it('int filter', async () => {
      const result = await engine.renderString('{{ x | int }}', { x: '42.5' });
      expect(result).toBe('42');
    });

    it('float filter', async () => {
      const result = await engine.renderString('{{ x | float }}', { x: '3.14' });
      expect(result).toBe('3.14');
    });

    it('string filter', async () => {
      const result = await engine.renderString('{{ x | string }}', { x: 42 });
      expect(result).toBe('42');
    });

    it('bool filter', async () => {
      const cases = [[1, 'true'], [0, 'false'], ['text', 'true'], ['', 'false']];

      for (const [input, expected] of cases) {
        const result = await engine.renderString('{{ x | bool }}', { x: input });
        expect(result).toBe(expected);
      }
    });

    it('json filter', async () => {
      const result = await engine.renderString('{{ obj | json }}', {
        obj: { key: 'value' }
      });
      expect(JSON.parse(result)).toEqual({ key: 'value' });
    });
  });

  describe('Utility Filters', () => {
    it('default filter', async () => {
      const cases = [
        [null, 'fallback', 'fallback'],
        [undefined, 'fallback', 'fallback'],
        ['value', 'fallback', 'value'],
        [0, 'fallback', '0'],
        ['', 'fallback', '']
      ];

      for (const [input, fallback, expected] of cases) {
        const result = await engine.renderString('{{ x | default(fallback) }}', {
          x: input,
          fallback
        });
        expect(result).toBe(expected);
      }
    });

    it('round filter', async () => {
      const result = await engine.renderString('{{ x | round(2) }}', { x: 3.14159 });
      expect(result).toBe('3.14');
    });

    it('abs filter', async () => {
      const result = await engine.renderString('{{ x | abs }}', { x: -42 });
      expect(result).toBe('42');
    });

    it('date filter', async () => {
      const dateStr = '2026-01-10T12:00:00Z';
      const result = await engine.renderString('{{ x | date("YYYY-MM-DD") }}', { x: dateStr });
      expect(result).toBe('2026-01-10');
    });
  });

  describe('Inflection Filters', () => {
    it('pluralize filter', async () => {
      const result = await engine.renderString('{{ x | pluralize }}', { x: 'apple' });
      expect(result).toBe('apples');
    });

    it('singularize filter', async () => {
      const result = await engine.renderString('{{ x | singularize }}', { x: 'apples' });
      expect(result).toBe('apple');
    });

    it('camelize filter', async () => {
      const result = await engine.renderString('{{ x | camelize }}', { x: 'hello_world' });
      expect(result).toContain('ello');
    });

    it('dasherize filter', async () => {
      const result = await engine.renderString('{{ x | dasherize }}', { x: 'hello_world' });
      expect(result).toBe('hello-world');
    });

    it('humanize filter', async () => {
      const result = await engine.renderString('{{ x | humanize }}', { x: 'hello_world' });
      expect(result).toContain('hello');
    });

    it('titleize filter', async () => {
      const result = await engine.renderString('{{ x | titleize }}', { x: 'hello world' });
      expect(result.toLowerCase()).toContain('hello');
    });

    it('classify filter', async () => {
      const result = await engine.renderString('{{ x | classify }}', { x: 'hello_world' });
      expect(result).toContain('World');
    });

    it('ordinalize filter', async () => {
      const result = await engine.renderString('{{ x | ordinalize }}', { x: '1' });
      expect(result).toBe('1st');
    });
  });

  describe('Determinism Guards', () => {
    it('now() throws error', async () => {
      await expect(engine.renderString('{{ now() }}', {})).rejects.toThrow('now()');
    });

    it('random() throws error', async () => {
      await expect(engine.renderString('{{ random() }}', {})).rejects.toThrow('random()');
    });

    it('same input produces same output', async () => {
      const template = '{{ items | join(",") }}';
      const context = { items: [1, 2, 3] };

      const output1 = await engine.renderString(template, context);
      const output2 = await engine.renderString(template, context);

      expect(output1).toBe(output2);
    });
  });

  describe('Custom Filters', () => {
    it('addFilter adds custom filter', async () => {
      engine.addFilter('double', (x) => x * 2);
      const result = await engine.renderString('{{ x | double }}', { x: 5 });
      expect(result).toBe('10');
    });

    it('custom filter can be chained', async () => {
      engine.addFilter('increment', (x) => x + 1);
      const result = await engine.renderString('{{ x | increment | increment }}', { x: 5 });
      expect(result).toBe('7');
    });

    it('addFilter returns this for chaining', () => {
      const returned = engine.addFilter('test', () => {});
      expect(returned).toBe(engine);
    });
  });

  describe('Caching', () => {
    it('cache statistics available', () => {
      const stats = engine.getCacheStats();
      expect(stats).toHaveProperty('sourceCache');
      expect(stats.sourceCache).toHaveProperty('size');
      expect(stats.sourceCache).toHaveProperty('hits');
      expect(stats.sourceCache).toHaveProperty('misses');
    });

    it('clearCache clears caches', () => {
      engine.clearCache();
      const stats = engine.getCacheStats();
      expect(stats.sourceCache.size).toBe(0);
      expect(stats.sourceCache.hits).toBe(0);
      expect(stats.sourceCache.misses).toBe(0);
    });

    it('filter registry contains filters', () => {
      expect(engine.filterRegistry.size).toBeGreaterThan(20);
    });
  });

  describe('Filter Listing', () => {
    it('listFilters returns all filters', () => {
      const filters = engine.listFilters();
      expect(Array.isArray(filters)).toBe(true);
      expect(filters.length).toBeGreaterThan(20);
    });

    it('listFilters by category', () => {
      const caseFilters = engine.listFilters('caseConversion');
      expect(caseFilters.length).toBe(4);

      const names = caseFilters.map(([name]) => name);
      expect(names).toContain('camelCase');
      expect(names).toContain('pascalCase');
      expect(names).toContain('kebabCase');
      expect(names).toContain('snakeCase');
    });
  });

  describe('Error Handling', () => {
    it('throws on rendering error', async () => {
      await expect(
        engine.renderString('{{ invalid syntax }', {})
      ).rejects.toThrow(TemplateRenderError);
    });

    it('TemplateRenderError has correct properties', async () => {
      try {
        await engine.renderString('{{ now() }}', {});
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateRenderError);
        expect(error.name).toBe('TemplateRenderError');
        expect(error.templatePath).toBeDefined();
      }
    });

    it('TemplateNotFoundError has correct properties', () => {
      const error = new TemplateNotFoundError('test.kgn', ['/templates']);
      expect(error.name).toBe('TemplateNotFoundError');
      expect(error.templatePath).toBe('test.kgn');
      expect(error.searchPaths).toEqual(['/templates']);
      expect(error.message).toContain('not found');
    });

    it('TemplateSyntaxError has correct properties', () => {
      const error = new TemplateSyntaxError('missing closing tag', 'test.kgn');
      expect(error.name).toBe('TemplateSyntaxError');
      expect(error.templatePath).toBe('test.kgn');
      expect(error.message).toContain('Syntax error');
    });
  });

  describe('Global Engine Functions', () => {
    afterEach(() => {
      resetTemplateEngine();
    });

    it('getTemplateEngine returns singleton', () => {
      const engine1 = getTemplateEngine();
      const engine2 = getTemplateEngine();

      expect(engine1).toBe(engine2);
    });

    it('getTemplateEngine accepts options', () => {
      const engine = getTemplateEngine({ paths: ['/custom'] });
      expect(engine.options.paths).toEqual(['/custom']);
    });

    it('resetTemplateEngine clears singleton', () => {
      const engine1 = getTemplateEngine();
      resetTemplateEngine();
      const engine2 = getTemplateEngine();

      expect(engine1).not.toBe(engine2);
    });

    it('renderTemplate helper function works', async () => {
      const result = await renderTemplate('Hello {{ name }}', { name: 'World' });
      expect(result).toBe('Hello World');
    });
  });

  describe('GitVan-Specific Filters', () => {
    it('gitBranch filter', async () => {
      const result = await engine.renderString('{{ context | gitBranch }}', {
        context: { git: { branch: 'feature/kgn' } }
      });
      expect(result).toBe('feature/kgn');
    });

    it('gitTag filter', async () => {
      const result = await engine.renderString('{{ version | gitTag }}', { version: '4.0.0' });
      expect(result).toBe('v4.0.0');
    });

    it('workflowId filter', async () => {
      const result = await engine.renderString('{{ context | workflowId }}', {
        context: { workflow: { id: 'workflow-123' } }
      });
      expect(result).toBe('workflow-123');
    });

    it('packVersion filter', async () => {
      const result = await engine.renderString('{{ pack | packVersion }}', {
        pack: { name: 'my-pack', version: '1.0.0' }
      });
      expect(result).toBe('my-pack@1.0.0');
    });
  });

  describe('Filter Chaining', () => {
    it('chains multiple filters', async () => {
      const result = await engine.renderString('{{ text | lower | slug }}', {
        text: 'Hello World!'
      });
      expect(result).toBe('hello-world');
    });

    it('complex filter chain', async () => {
      const result = await engine.renderString(
        '{{ name | lower | snakeCase | pluralize }}',
        { name: 'MyClass' }
      );
      expect(result).toContain('my');
    });
  });
});
