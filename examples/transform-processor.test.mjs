import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TransformProcessor } from '../src/pack/operations/transform-processor.mjs';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('TransformProcessor', () => {
  let processor;
  let testFiles = [];

  beforeEach(() => {
    processor = new TransformProcessor();
  });

  afterEach(() => {
    // Cleanup test files
    testFiles.forEach(file => {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
    testFiles = [];
  });

  function createTestFile(content, extension = 'json') {
    const filename = join(tmpdir(), `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`);
    writeFileSync(filename, content);
    testFiles.push(filename);
    return filename;
  }

  describe('JSON Operations', () => {
    it('should merge JSON objects', async () => {
      const content = JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2);
      const target = createTestFile(content);

      const result = await processor.apply({
        target,
        kind: 'json-merge',
        spec: {
          data: { author: 'Test Author', version: '2.0.0' }
        }
      });

      const transformed = JSON.parse(readFileSync(target, 'utf8'));
      expect(transformed).toEqual({
        name: 'test',
        version: '2.0.0',
        author: 'Test Author'
      });
      expect(result.size.original).toBeLessThan(result.size.transformed);
    });

    it('should patch JSON using RFC 6902 operations', async () => {
      const content = JSON.stringify({
        name: 'test',
        config: { debug: false },
        tags: ['alpha']
      }, null, 2);
      const target = createTestFile(content);

      await processor.apply({
        target,
        kind: 'json-patch',
        spec: {
          operations: [
            { op: 'replace', path: '/config/debug', value: true },
            { op: 'add', path: '/config/environment', value: 'production' },
            { op: 'add', path: '/tags/1', value: 'beta' }
          ]
        }
      });

      const transformed = JSON.parse(readFileSync(target, 'utf8'));
      expect(transformed.config.debug).toBe(true);
      expect(transformed.config.environment).toBe('production');
      expect(transformed.tags).toEqual(['alpha', 'beta']);
    });
  });

  describe('YAML Operations', () => {
    it('should merge YAML content', async () => {
      const content = `name: test-app
version: 1.0.0
dependencies:
  - express
  - lodash`;
      const target = createTestFile(content, 'yaml');

      await processor.apply({
        target,
        kind: 'yaml-merge',
        spec: {
          data: {
            author: 'Test Author',
            dependencies: ['moment', 'axios']
          }
        }
      });

      const transformed = readFileSync(target, 'utf8');
      expect(transformed).toContain('author: Test Author');
      expect(transformed).toContain('moment');
      expect(transformed).toContain('axios');
    });

    it('should patch YAML using operations', async () => {
      const content = `name: test-app
config:
  debug: false
  port: 3000`;
      const target = createTestFile(content, 'yaml');

      await processor.apply({
        target,
        kind: 'yaml-patch',
        spec: {
          operations: [
            { op: 'replace', path: '/config/debug', value: true },
            { op: 'add', path: '/config/host', value: 'localhost' }
          ]
        }
      });

      const transformed = readFileSync(target, 'utf8');
      expect(transformed).toContain('debug: true');
      expect(transformed).toContain('host: localhost');
    });
  });

  describe('TOML Operations', () => {
    it('should merge TOML content', async () => {
      const content = `[package]
name = "test-app"
version = "1.0.0"

[dependencies]
serde = "1.0"`;
      const target = createTestFile(content, 'toml');

      await processor.apply({
        target,
        kind: 'toml-merge',
        spec: {
          data: {
            package: { author: 'Test Author' },
            dependencies: { tokio: '1.0' }
          }
        }
      });

      const transformed = readFileSync(target, 'utf8');
      expect(transformed).toContain('author = "Test Author"');
      expect(transformed).toContain('tokio = "1.0"');
    });
  });

  describe('INI Operations', () => {
    it('should merge INI content', async () => {
      const content = `[database]
host = localhost
port = 5432

[cache]
enabled = true`;
      const target = createTestFile(content, 'ini');

      await processor.apply({
        target,
        kind: 'ini-merge',
        spec: {
          data: {
            database: { username: 'admin' },
            logging: { level: 'info' }
          }
        }
      });

      const transformed = readFileSync(target, 'utf8');
      expect(transformed).toContain('username=admin');
      expect(transformed).toContain('[logging]');
      expect(transformed).toContain('level=info');
    });
  });

  describe('XML Operations', () => {
    it('should merge XML content', async () => {
      const content = `<?xml version="1.0"?>
<config>
  <database>
    <host>localhost</host>
    <port>5432</port>
  </database>
</config>`;
      const target = createTestFile(content, 'xml');

      await processor.apply({
        target,
        kind: 'xml-merge',
        spec: {
          data: {
            config: {
              database: { username: 'admin' },
              logging: { level: 'info' }
            }
          }
        }
      });

      const transformed = readFileSync(target, 'utf8');
      expect(transformed).toContain('<username>admin</username>');
      expect(transformed).toContain('<logging>');
    });
  });

  describe('JSONPath Operations', () => {
    it('should select data using JSONPath', async () => {
      const content = JSON.stringify({
        users: [
          { name: 'Alice', age: 25, active: true },
          { name: 'Bob', age: 30, active: false },
          { name: 'Charlie', age: 35, active: true }
        ]
      }, null, 2);
      const target = createTestFile(content);

      await processor.apply({
        target,
        kind: 'jsonpath-select',
        spec: {
          path: '$.users[?(@.active == true)].name',
          returnType: 'array'
        }
      });

      const result = JSON.parse(readFileSync(target, 'utf8'));
      expect(result).toEqual(['Alice', 'Charlie']);
    });

    it('should modify data using JSONPath', async () => {
      const content = JSON.stringify({
        users: [
          { name: 'alice', status: 'pending', count: 5 },
          { name: 'bob', status: 'active', count: 10 }
        ]
      }, null, 2);
      const target = createTestFile(content);

      await processor.apply({
        target,
        kind: 'jsonpath-modify',
        spec: {
          modifications: [
            {
              path: '$.users[*].name',
              operation: 'transform',
              transform: 'uppercase'
            },
            {
              path: '$.users[0].count',
              operation: 'transform',
              transform: 'increment',
              by: 3
            }
          ]
        }
      });

      const result = JSON.parse(readFileSync(target, 'utf8'));
      expect(result.users[0].name).toBe('ALICE');
      expect(result.users[1].name).toBe('BOB');
      expect(result.users[0].count).toBe(8);
    });
  });

  describe('Merge Strategies', () => {
    it('should use replace strategy', async () => {
      const content = JSON.stringify({ a: 1, b: 2, c: [1, 2] }, null, 2);
      const target = createTestFile(content);

      await processor.apply({
        target,
        kind: 'json-merge',
        spec: {
          strategy: 'replace',
          data: { b: 20, d: 4 }
        }
      });

      const result = JSON.parse(readFileSync(target, 'utf8'));
      expect(result).toEqual({ b: 20, d: 4 });
    });

    it('should use append strategy for arrays', async () => {
      const content = JSON.stringify({
        items: ['a', 'b'],
        config: { debug: true }
      }, null, 2);
      const target = createTestFile(content);

      await processor.apply({
        target,
        kind: 'json-merge',
        spec: {
          strategy: 'append',
          data: {
            items: ['c', 'd'],
            config: { port: 3000 }
          }
        }
      });

      const result = JSON.parse(readFileSync(target, 'utf8'));
      expect(result.items).toEqual(['a', 'b', 'c', 'd']);
      expect(result.config).toEqual({ debug: true, port: 3000 });
    });
  });

  describe('Path Operations', () => {
    it('should handle JSONPointer paths', async () => {
      const content = JSON.stringify({
        config: {
          database: { host: 'localhost' },
          'special-key': 'value'
        }
      }, null, 2);
      const target = createTestFile(content);

      await processor.apply({
        target,
        kind: 'json-patch',
        spec: {
          operations: [
            { op: 'replace', path: '/config/database/host', value: 'remote' },
            { op: 'add', path: '/config/special~1key', value: 'new-value' }
          ]
        }
      });

      const result = JSON.parse(readFileSync(target, 'utf8'));
      expect(result.config.database.host).toBe('remote');
    });

    it('should handle dot notation paths', async () => {
      const processor = new TransformProcessor();
      const obj = { a: { b: { c: 'value' } } };

      processor.setPath(obj, 'a.b.d', 'new-value');
      expect(processor.getPath(obj, 'a.b.d')).toBe('new-value');

      processor.deletePath(obj, 'a.b.c');
      expect(processor.getPath(obj, 'a.b.c')).toBeUndefined();
    });
  });

  describe('Validation and Safety', () => {
    it('should validate input with JSON schema', async () => {
      const content = JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2);
      const target = createTestFile(content);

      await expect(processor.apply({
        target,
        kind: 'json-merge',
        spec: {
          schema: {
            type: 'object',
            required: ['name', 'version'],
            properties: {
              name: { type: 'string' },
              version: { type: 'string' }
            }
          },
          data: { author: 'Test' }
        }
      })).resolves.toBeDefined();
    });

    it('should prevent empty output', async () => {
      const content = JSON.stringify({ test: 'data' }, null, 2);
      const target = createTestFile(content);

      const result = await processor.apply({
        target,
        kind: 'json-patch',
        spec: {
          operations: [
            { op: 'remove', path: '/test' }
          ]
        }
      });

      // Should result in empty object {} which is valid, not completely empty
      const transformed = JSON.parse(readFileSync(target, 'utf8'));
      expect(transformed).toEqual({});
      expect(result.size.transformed).toBe(2); // "{}" is 2 characters
    });

    it('should prevent truly empty output', async () => {
      // Test the safety check by modifying the processor to return empty content
      const content = JSON.stringify({ test: 'data' }, null, 2);
      const target = createTestFile(content);

      // Mock a transform that results in empty content
      const originalTextReplace = processor.textReplace;
      processor.textReplace = async () => ''; // Return empty string

      await expect(processor.apply({
        target,
        kind: 'text-replace',
        spec: { pattern: '.*', replacement: '' }
      })).rejects.toThrow('Transform resulted in empty content');

      // Restore original method
      processor.textReplace = originalTextReplace;
    });

    it('should support dry run mode', async () => {
      const content = JSON.stringify({ test: 'data' }, null, 2);
      const target = createTestFile(content);

      const processor = new TransformProcessor({ dryRun: true });
      const result = await processor.apply({
        target,
        kind: 'json-merge',
        spec: { data: { new: 'field' } }
      });

      expect(result.dryRun).toBe(true);
      expect(result.preview).toContain('new');

      // Original file should be unchanged
      const original = JSON.parse(readFileSync(target, 'utf8'));
      expect(original).toEqual({ test: 'data' });
    });
  });

  describe('Format Detection', () => {
    it('should detect format from extension', () => {
      expect(processor.detectFormat('test.json', '{}')).toBe('json');
      expect(processor.detectFormat('test.yaml', 'key: value')).toBe('yaml');
      expect(processor.detectFormat('test.toml', '[section]')).toBe('toml');
      expect(processor.detectFormat('test.ini', 'key=value')).toBe('ini');
      expect(processor.detectFormat('test.xml', '<root/>')).toBe('xml');
    });

    it('should detect format from content', () => {
      expect(processor.detectFormat('test', '{ "key": "value" }')).toBe('json');
      expect(processor.detectFormat('test', '<?xml version="1.0"?>')).toBe('xml');
      expect(processor.detectFormat('test', 'key=value\\nother=data')).toBe('ini');
      expect(processor.detectFormat('test', 'plain text')).toBe('text');
    });
  });

  describe('Backup and Rollback', () => {
    it('should create backups and rollback', () => {
      const content = 'original content';
      const target = createTestFile(content);

      const backupPath = processor.createBackup(target);
      testFiles.push(backupPath);

      writeFileSync(target, 'modified content');
      expect(readFileSync(target, 'utf8')).toBe('modified content');

      const success = processor.rollback(target, backupPath);
      expect(success).toBe(true);
      expect(readFileSync(target, 'utf8')).toBe('original content');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const target = createTestFile('{ invalid json }');

      await expect(processor.apply({
        target,
        kind: 'json-merge',
        spec: { data: { test: 'value' } }
      })).rejects.toThrow('Transform failed');
    });

    it('should handle missing files', async () => {
      await expect(processor.apply({
        target: '/nonexistent/file.json',
        kind: 'json-merge',
        spec: { data: {} }
      })).rejects.toThrow('Transform target not found');
    });

    it('should handle unsupported formats', async () => {
      const target = createTestFile('{}');

      await expect(processor.apply({
        target,
        kind: 'unsupported-operation',
        spec: {}
      })).rejects.toThrow('Unknown transform kind');
    });
  });
});