/**
 * GitVan v2 Template Tests
 * Tests Nunjucks template rendering system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nunjucks from 'nunjucks';
import { mkdtemp, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Template System', () => {
  let tempDir;
  let templatesDir;
  let env;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitvan-template-test-'));
    templatesDir = join(tempDir, 'templates');
    await mkdir(templatesDir, { recursive: true });

    // Configure Nunjucks environment
    env = new nunjucks.Environment(
      new nunjucks.FileSystemLoader(templatesDir),
      {
        autoescape: true,
        throwOnUndefined: false,
        trimBlocks: true,
        lstripBlocks: true
      }
    );
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Template Rendering', () => {
    it('should render simple templates', async () => {
      const template = 'Hello {{ name }}!';
      const data = { name: 'GitVan' };

      const result = env.renderString(template, data);
      expect(result).toBe('Hello GitVan!');
    });

    it('should render templates from files', async () => {
      const templateContent = 'Welcome to {{ project.name }} v{{ project.version }}';
      await writeFile(join(templatesDir, 'welcome.njk'), templateContent);

      const data = {
        project: {
          name: 'GitVan',
          version: '2.0.0'
        }
      };

      const result = env.render('welcome.njk', data);
      expect(result).toBe('Welcome to GitVan v2.1.0');
    });

    it('should handle missing variables gracefully', async () => {
      const template = 'Hello {{ name }}! Version: {{ version }}';
      const data = { name: 'GitVan' };

      const result = env.renderString(template, data);
      expect(result).toBe('Hello GitVan! Version: ');
    });

    it('should handle nested object properties', async () => {
      const template = '{{ job.meta.name }} ({{ job.meta.kind }}) - {{ job.ctx.git.branch }}';
      const data = {
        job: {
          meta: {
            name: 'Deploy Job',
            kind: 'deploy'
          },
          ctx: {
            git: {
              branch: 'main'
            }
          }
        }
      };

      const result = env.renderString(template, data);
      expect(result).toBe('Deploy Job (deploy) - main');
    });
  });

  describe('Receipt Template Rendering', () => {
    it('should render job receipt template', async () => {
      const receiptTemplate = `
# GitVan Job Receipt

**Job ID:** {{ execution.job.meta.id }}
**Job Name:** {{ execution.job.meta.name }}
**Status:** {% if execution.result.success %}✅ Success{% else %}❌ Failed{% endif %}
**Duration:** {{ execution.duration }}ms
**Timestamp:** {{ meta.timestamp }}

## Execution Context
- **Branch:** {{ context.git.branch }}
- **Commit:** {{ context.git.commit }}
- **Working Directory:** {{ context.cwd }}

## Results
{% if execution.result.stdout %}
### Output
\`\`\`
{{ execution.result.stdout }}
\`\`\`
{% endif %}

{% if execution.result.stderr %}
### Errors
\`\`\`
{{ execution.result.stderr }}
\`\`\`
{% endif %}
      `.trim();

      await writeFile(join(templatesDir, 'receipt.njk'), receiptTemplate);

      const receiptData = {
        meta: {
          id: 'receipt-123',
          timestamp: '2024-01-15T10:30:00Z'
        },
        context: {
          cwd: '/project',
          git: {
            branch: 'main',
            commit: 'abc123'
          }
        },
        execution: {
          job: {
            meta: {
              id: 'job-456',
              name: 'Build Project'
            }
          },
          result: {
            success: true,
            stdout: 'Build completed successfully',
            stderr: ''
          },
          duration: 1500
        }
      };

      const result = env.render('receipt.njk', receiptData);

      expect(result).toContain('# GitVan Job Receipt');
      expect(result).toContain('**Job ID:** job-456');
      expect(result).toContain('**Job Name:** Build Project');
      expect(result).toContain('✅ Success');
      expect(result).toContain('**Duration:** 1500ms');
      expect(result).toContain('- **Branch:** main');
      expect(result).toContain('Build completed successfully');
    });

    it('should render failed job receipt', async () => {
      const template = 'Status: {% if result.success %}Success{% else %}Failed ({{ result.exitCode }}){% endif %}';

      const data = {
        result: {
          success: false,
          exitCode: 1
        }
      };

      const result = env.renderString(template, data);
      expect(result).toBe('Status: Failed (1)');
    });
  });

  describe('Template Loops and Conditionals', () => {
    it('should handle for loops', async () => {
      const template = `
Files changed:
{% for file in changes.modified %}
- {{ file.path }} ({{ file.sizeAfter }} bytes)
{% endfor %}
      `.trim();

      const data = {
        changes: {
          modified: [
            { path: 'src/app.js', sizeAfter: 1024 },
            { path: 'tests/app.test.js', sizeAfter: 512 },
            { path: 'README.md', sizeAfter: 256 }
          ]
        }
      };

      const result = env.renderString(template, data);

      expect(result).toContain('Files changed:');
      expect(result).toContain('- src/app.js (1024 bytes)');
      expect(result).toContain('- tests/app.test.js (512 bytes)');
      expect(result).toContain('- README.md (256 bytes)');
    });

    it('should handle conditional blocks', async () => {
      const template = `
{% if performance.enabled %}
## Performance Metrics
- Memory: {{ performance.memory.peak }} bytes
- CPU: {{ performance.cpu.average }}%
{% endif %}

{% if changes.created.length > 0 %}
## Created Files
{% for file in changes.created %}
- {{ file.path }}
{% endfor %}
{% endif %}
      `.trim();

      const data = {
        performance: {
          enabled: true,
          memory: { peak: 104857600 },
          cpu: { average: 25.5 }
        },
        changes: {
          created: [
            { path: 'dist/bundle.js' },
            { path: 'dist/bundle.css' }
          ]
        }
      };

      const result = env.renderString(template, data);

      expect(result).toContain('## Performance Metrics');
      expect(result).toContain('- Memory: 104857600 bytes');
      expect(result).toContain('- CPU: 25.5%');
      expect(result).toContain('## Created Files');
      expect(result).toContain('- dist/bundle.js');
    });

    it('should handle empty arrays and null values', async () => {
      const template = `
{% if files %}
Files: {{ files.length }}
{% else %}
No files
{% endif %}

{% if tags and tags.length > 0 %}
Tags: {{ tags | join(', ') }}
{% else %}
No tags
{% endif %}
      `.trim();

      const emptyData = { files: [], tags: null };
      const result = env.renderString(template, emptyData);

      expect(result).toContain('Files: 0');
      expect(result).toContain('No tags');
    });
  });

  describe('Template Filters', () => {
    it('should use built-in filters', async () => {
      const template = `
- Name: {{ name | upper }}
- Description: {{ description | truncate(20) }}
- Tags: {{ tags | join(', ') }}
- Created: {{ created | default('Unknown') }}
      `.trim();

      const data = {
        name: 'test job',
        description: 'This is a very long description that should be truncated',
        tags: ['build', 'test', 'deploy'],
        created: null
      };

      const result = env.renderString(template, data);

      expect(result).toContain('- Name: TEST JOB');
      expect(result).toContain('- Description: This is a very long...');
      expect(result).toContain('- Tags: build, test, deploy');
      expect(result).toContain('- Created: Unknown');
    });

    it('should support custom filters', async () => {
      // Add custom filter for file size formatting
      env.addFilter('filesize', (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      });

      // Add custom filter for duration formatting
      env.addFilter('duration', (ms) => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
      });

      const template = `
File size: {{ size | filesize }}
Duration: {{ duration | duration }}
      `.trim();

      const data = {
        size: 1048576,
        duration: 125000
      };

      const result = env.renderString(template, data);

      expect(result).toContain('File size: 1 MB');
      expect(result).toContain('Duration: 2m 5s');
    });

    it('should handle date formatting', async () => {
      const template = 'Timestamp: {{ timestamp | date("YYYY-MM-DD HH:mm:ss") }}';

      // Mock date filter
      env.addFilter('date', (date, format) => {
        // Simple date formatting for test
        const d = new Date(date);
        return d.toISOString().replace('T', ' ').substring(0, 19);
      });

      const data = {
        timestamp: '2024-01-15T10:30:45Z'
      };

      const result = env.renderString(template, data);
      expect(result).toContain('Timestamp: 2024-01-15 10:30:45');
    });
  });

  describe('Template Inheritance and Includes', () => {
    it('should support template inheritance', async () => {
      // Base template
      const baseTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>{% block title %}GitVan{% endblock %}</title>
</head>
<body>
    <h1>{% block header %}Default Header{% endblock %}</h1>
    <main>
        {% block content %}{% endblock %}
    </main>
</body>
</html>
      `.trim();

      // Child template
      const childTemplate = `
{% extends "base.njk" %}

{% block title %}{{ super() }} - Job Receipt{% endblock %}

{% block header %}Job Execution Report{% endblock %}

{% block content %}
<p>Job: {{ job.name }}</p>
<p>Status: {{ job.status }}</p>
{% endblock %}
      `.trim();

      await writeFile(join(templatesDir, 'base.njk'), baseTemplate);
      await writeFile(join(templatesDir, 'receipt-page.njk'), childTemplate);

      const data = {
        job: {
          name: 'Build Job',
          status: 'Success'
        }
      };

      const result = env.render('receipt-page.njk', data);

      expect(result).toContain('<title>GitVan - Job Receipt</title>');
      expect(result).toContain('<h1>Job Execution Report</h1>');
      expect(result).toContain('<p>Job: Build Job</p>');
      expect(result).toContain('<p>Status: Success</p>');
    });

    it('should support template includes', async () => {
      // Partial template
      const headerPartial = `
<header>
    <h1>{{ title }}</h1>
    <p>{{ subtitle }}</p>
</header>
      `.trim();

      // Main template
      const mainTemplate = `
{% include "header.njk" %}
<main>
    <p>Content: {{ content }}</p>
</main>
      `.trim();

      await writeFile(join(templatesDir, 'header.njk'), headerPartial);
      await writeFile(join(templatesDir, 'page.njk'), mainTemplate);

      const data = {
        title: 'GitVan Receipt',
        subtitle: 'Job Execution Details',
        content: 'Job completed successfully'
      };

      const result = env.render('page.njk', data);

      expect(result).toContain('<h1>GitVan Receipt</h1>');
      expect(result).toContain('<p>Job Execution Details</p>');
      expect(result).toContain('<p>Content: Job completed successfully</p>');
    });
  });

  describe('Template Macros', () => {
    it('should support macros for reusable components', async () => {
      const macroTemplate = `
{% macro fileChange(file, type) %}
<div class="file-change {{ type }}">
    <span class="filename">{{ file.path }}</span>
    <span class="size">{{ file.size }} bytes</span>
    {% if type === 'modified' %}
    <span class="delta">{{ file.sizeAfter - file.sizeBefore }} bytes</span>
    {% endif %}
</div>
{% endmacro %}

{% macro jobStatus(success, exitCode) %}
{% if success %}
<span class="status success">✅ Success</span>
{% else %}
<span class="status failure">❌ Failed ({{ exitCode }})</span>
{% endif %}
{% endmacro %}

## File Changes
{% for file in changes.created %}
{{ fileChange(file, 'created') }}
{% endfor %}

{% for file in changes.modified %}
{{ fileChange(file, 'modified') }}
{% endfor %}

## Status
{{ jobStatus(result.success, result.exitCode) }}
      `.trim();

      await writeFile(join(templatesDir, 'macros.njk'), macroTemplate);

      const data = {
        changes: {
          created: [
            { path: 'dist/app.js', size: 1024 }
          ],
          modified: [
            { path: 'src/main.js', size: 2048, sizeBefore: 1536, sizeAfter: 2048 }
          ]
        },
        result: {
          success: true,
          exitCode: 0
        }
      };

      const result = env.render('macros.njk', data);

      expect(result).toContain('## File Changes');
      expect(result).toContain('<div class="file-change created">');
      expect(result).toContain('<span class="filename">dist/app.js</span>');
      expect(result).toContain('<div class="file-change modified">');
      expect(result).toContain('<span class="delta">512 bytes</span>');
      expect(result).toContain('✅ Success');
    });
  });

  describe('Error Handling', () => {
    it('should handle template syntax errors', async () => {
      const invalidTemplate = 'Hello {{ name }';

      expect(() => {
        env.renderString(invalidTemplate, { name: 'test' });
      }).toThrow();
    });

    it('should handle missing template files', async () => {
      expect(() => {
        env.render('non-existent.njk', {});
      }).toThrow();
    });

    it('should handle undefined variables with throwOnUndefined', async () => {
      const strictEnv = new nunjucks.Environment(
        new nunjucks.FileSystemLoader(templatesDir),
        { throwOnUndefined: true }
      );

      const template = 'Hello {{ undefinedVar }}!';

      expect(() => {
        strictEnv.renderString(template, {});
      }).toThrow();
    });

    it('should handle circular references safely', async () => {
      const template = 'Value: {{ obj.value }}';

      const circularObj = { value: 'test' };
      circularObj.self = circularObj;

      const data = { obj: circularObj };

      // Should not throw with simple property access
      const result = env.renderString(template, data);
      expect(result).toBe('Value: test');
    });
  });

  describe('Performance', () => {
    it('should render templates efficiently', async () => {
      const template = `
{% for i in range(0, 100) %}
Item {{ i }}: {{ data.value }}
{% endfor %}
      `.trim();

      const data = { data: { value: 'test' } };

      const startTime = Date.now();
      const result = env.renderString(template, data);
      const duration = Date.now() - startTime;

      expect(result).toContain('Item 0: test');
      expect(result).toContain('Item 99: test');
      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it('should cache compiled templates', async () => {
      const templateContent = 'Hello {{ name }}!';
      await writeFile(join(templatesDir, 'cached.njk'), templateContent);

      const data = { name: 'test' };

      // First render
      const start1 = Date.now();
      const result1 = env.render('cached.njk', data);
      const time1 = Date.now() - start1;

      // Second render (should use cached template)
      const start2 = Date.now();
      const result2 = env.render('cached.njk', data);
      const time2 = Date.now() - start2;

      expect(result1).toBe(result2);
      expect(result1).toBe('Hello test!');

      // Second render should be faster (cached)
      if (time1 > 1) {
        expect(time2).toBeLessThanOrEqual(time1);
      }
    });
  });

  describe('Template Context and Globals', () => {
    it('should support global variables', async () => {
      env.addGlobal('version', '2.0.0');
      env.addGlobal('appName', 'GitVan');

      const template = '{{ appName }} v{{ version }} - {{ title }}';
      const data = { title: 'Job Receipt' };

      const result = env.renderString(template, data);
      expect(result).toBe('GitVan v2.1.0 - Job Receipt');
    });

    it('should support global functions', async () => {
      env.addGlobal('formatBytes', (bytes) => {
        return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${bytes}B`;
      });

      const template = 'File size: {{ formatBytes(size) }}';
      const data = { size: 2048 };

      const result = env.renderString(template, data);
      expect(result).toBe('File size: 2.0KB');
    });
  });
});