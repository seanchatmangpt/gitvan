/**
 * Nunjucks Template Engine
 *
 * Dynamic TTL hook generation, code templates, and documentation rendering
 * using Nunjucks templating language.
 */

import nunjucks from 'nunjucks';
import path from 'path';

/**
 * Nunjucks Template Engine for GitVan
 *
 * Features:
 * - Dynamic TTL hook generation
 * - Code generation from templates
 * - Documentation rendering
 * - Configuration rendering
 * - Type-safe template variables
 */
export class NunjucksTemplateEngine {
  private env: nunjucks.Environment;
  private templateDir: string;

  constructor(templateDir: string = path.join(process.cwd(), 'templates')) {
    this.templateDir = templateDir;
    this.env = nunjucks.configure({
      autoescape: false,
      trimBlocks: true,
      lstripBlocks: true,
      watch: false,
      noCache: false,
    });

    // Add custom filters
    this.registerCustomFilters();

    // Add custom global functions
    this.registerGlobalFunctions();
  }

  /**
   * Register custom Nunjucks filters
   */
  private registerCustomFilters() {
    // JSON filter with indentation
    this.env.addFilter('json', (obj: any, indent = 2) => {
      return JSON.stringify(obj, null, indent);
    });

    // Uppercase filter
    this.env.addFilter('upper', (str: string) => str?.toUpperCase?.() ?? '');

    // Lowercase filter (handles both strings and booleans)
    this.env.addFilter('lower', (val: any) => {
      if (typeof val === 'boolean') return val.toString();
      if (typeof val === 'string') return val.toLowerCase();
      return val?.toString?.()?.toLowerCase?.() ?? '';
    });

    // Capitalize filter
    this.env.addFilter('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Slug filter
    this.env.addFilter('slug', (str: string) => {
      return str
        ?.toLowerCase?.()
        ?.replace?.(/\s+/g, '-')
        ?.replace?.(/[^\w-]/g, '') ?? '';
    });

    // Date filter
    this.env.addFilter('date', (dateInput: any, format = 'YYYY-MM-DD') => {
      let d: Date;
      if (dateInput instanceof Date) {
        d = dateInput;
      } else if (typeof dateInput === 'string') {
        d = new Date(dateInput);
      } else {
        d = new Date();
      }
      if (isNaN(d.getTime())) {
        d = new Date();
      }
      return format
        .replace('YYYY', d.getFullYear().toString())
        .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
        .replace('DD', String(d.getDate()).padStart(2, '0'))
        .replace('HH', String(d.getHours()).padStart(2, '0'))
        .replace('mm', String(d.getMinutes()).padStart(2, '0'));
    });

    // Indent filter
    this.env.addFilter('indent', (str: string, count = 2) => {
      const spaces = ' '.repeat(count);
      return str?.split('\n')?.map((line: string) => spaces + line)?.join('\n') ?? '';
    });

    // Truncate filter
    this.env.addFilter('truncate', (str: string, length = 50) => {
      return str?.length > length ? str?.substring(0, length - 3) + '...' : str;
    });

    // Default filter
    this.env.addFilter('default', (value: any, defaultValue: any) => {
      return value ?? defaultValue;
    });
  }

  /**
   * Register custom global functions
   */
  private registerGlobalFunctions() {
    // Current date/time
    this.env.addGlobal('now', () => new Date().toISOString());

    // Generate UUID
    this.env.addGlobal('uuid', () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    });

    // Generate random string
    this.env.addGlobal('randomString', (length = 10) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    });

    // Repeat function
    this.env.addGlobal('repeat', (str: string, count: number) => {
      return str.repeat(count);
    });

    // Range function
    this.env.addGlobal('range', (start: number, end: number, step = 1) => {
      const result = [];
      for (let i = start; i < end; i += step) {
        result.push(i);
      }
      return result;
    });
  }

  /**
   * Render TTL hook from template
   */
  async renderHookTemplate(
    templateName: string,
    variables: Record<string, any>
  ): Promise<string> {
    try {
      return await this.renderString(`{{ ${templateName} | json }}`, variables);
    } catch (error) {
      console.error(`Failed to render TTL template: ${templateName}`, error);
      throw error;
    }
  }

  /**
   * Render code from template
   */
  async renderCodeTemplate(
    templateName: string,
    variables: Record<string, any>
  ): Promise<string> {
    try {
      return await this.renderString(`{{ ${templateName} }}`, variables);
    } catch (error) {
      console.error(`Failed to render code template: ${templateName}`, error);
      throw error;
    }
  }

  /**
   * Render documentation from template
   */
  async renderDocTemplate(
    templateName: string,
    variables: Record<string, any>
  ): Promise<string> {
    try {
      return await this.renderString(`{{ ${templateName} }}`, variables);
    } catch (error) {
      console.error(`Failed to render documentation template: ${templateName}`, error);
      throw error;
    }
  }

  /**
   * Render from string (no file)
   */
  async renderString(template: string, variables: Record<string, any>): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        nunjucks.renderString(template, variables, (error: any, output: string) => {
          if (error) reject(error);
          else resolve(output);
        });
      });
    } catch (error) {
      console.error('Failed to render string template', error);
      throw error;
    }
  }

  /**
   * Add custom filter
   */
  addFilter(name: string, fn: (...args: any[]) => any) {
    this.env.addFilter(name, fn);
  }

  /**
   * Add custom global
   */
  addGlobal(name: string, value: any) {
    this.env.addGlobal(name, value);
  }

  /**
   * Add custom tag
   */
  addExtension(name: string, ext: any) {
    this.env.addExtension(name, ext);
  }
}

// ============================================================================
// Built-in TTL Templates
// ============================================================================

export const TTL_TEMPLATES = {
  // Basic hook template
  basicHook: `@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

gh:{{ name | slug }} a gh:Hook ;
  gh:name "{{ name }}" ;
  gh:description "{{ description }}" ;
  gh:priority {{ priority }} ;
  gh:autoExecute {{ autoExecute | lower }} ;

  gh:trigger [
    a {{ triggerType }}
  ] ;

  gh:condition [
    a gh:AlwaysTrue
  ] ;

  gh:action [
    a gh:ShellAction ;
    gh:script """
{{ action | indent(6) }}
    """
  ] .`,

  // Pattern enforcement template
  patternEnforcementHook: `@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:Enforce{{ pattern | capitalize }} a gh:Hook ;
  gh:name "Enforce {{ pattern }}" ;
  gh:description "{{ description }}" ;
  gh:priority {{ priority }} ;

  gh:trigger [ a {{ triggerType }} ] ;

  gh:condition [
    a gh:PatternMatch ;
    gh:pattern "{{ patternRegex }}" ;
    gh:flags "i"
  ] ;

  gh:action [
    a gh:CompositeAction ;
    gh:steps [
{% for step in actionSteps %}
      rdf:_{{ loop.index }} [ a {{ step.type }} ] ;
{% endfor %}
    ]
  ] .`,

  // Composite action hook
  compositeActionHook: `@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

gh:{{ name | slug }} a gh:Hook ;
  gh:name "{{ name }}" ;
  gh:description "{{ description }}" ;
  gh:priority {{ priority }} ;
  gh:autoExecute true ;

  gh:trigger [ a {{ triggerType }} ] ;
  gh:condition [ a gh:AlwaysTrue ] ;

  gh:action [
    a gh:CompositeAction ;
    gh:steps [
{% for step in steps %}
      rdf:_{{ loop.index }} [
        a {{ step.action }} ;
{% for key, value in step.params %}
        {{ key }} "{{ value }}" ;
{% endfor %}
      ] ;
{% endfor %}
    ]
  ] .`,
};

// ============================================================================
// Built-in Code Templates
// ============================================================================

export const CODE_TEMPLATES = {
  // TypeScript API route template
  apiRoute: `import { NextRequest, NextResponse } from 'next/server';
import { {{ schema }} } from '@/lib/schemas';

export async function {{ method | upper }}(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = {{ schema }}.parse(body);

    // Implementation here
    const result = {
      success: true,
      data: validated,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Request failed' },
      { status: 500 }
    );
  }
}`,

  // React component template
  reactComponent: `'use client';

import React, { useState, useEffect } from 'react';

/**
 * {{ componentName }}
 * {{ description }}
 */
export function {{ componentName }}() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch data
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {{ componentName }}
    </div>
  );
}`,

  // Test template
  testFile: `import { describe, it, expect } from 'vitest';
import { {{ functionName }} } from '@/lib/{{ module }}';

describe('{{ functionName }}', () => {
  it('should work correctly', async () => {
    const result = await {{ functionName }}();
    expect(result).toBeDefined();
  });

  it('should handle errors', async () => {
    expect(async () => {
      await {{ functionName }}(null);
    }).rejects.toThrow();
  });
});`,
};

// ============================================================================
// Built-in Documentation Templates
// ============================================================================

export const DOC_TEMPLATES = {
  // API documentation
  apiDoc: `# {{ name }}

{{ description }}

## Endpoint

\`\`\`
{{ method | upper }} {{ path }}
\`\`\`

## Parameters

{% for param in parameters %}
- **{{ param.name }}** (\`{{ param.type }}\`): {{ param.description }}
{% endfor %}

## Response

\`\`\`json
{{ responseExample | json }}
\`\`\`

## Example

\`\`\`bash
curl -X {{ method | upper }} {{ path }}
{% for param in parameters %}
  -H "{{ param.name }}: {{ param.example }}"
{% endfor %}
\`\`\``,

  // Component documentation
  componentDoc: `# {{ name }}

{{ description }}

## Props

{% for prop in props %}
- **{{ prop.name }}** (\`{{ prop.type }}\`{% if prop.required %} - required{% endif %}): {{ prop.description }}
{% endfor %}

## Usage

\`\`\`tsx
import { {{ name }} } from '@/components/{{ name }}';

export function Example() {
  return <{{ name }} />;
}
\`\`\`

## Examples

{{ examples }}`,
};

// Export singleton instance
export const nunjucksEngine = new NunjucksTemplateEngine();

export default NunjucksTemplateEngine;
