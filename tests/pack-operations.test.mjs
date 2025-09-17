import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateProcessor } from '../src/pack/operations/template-processor.mjs';
import { TransformProcessor } from '../src/pack/operations/transform-processor.mjs';
import { FileOperations } from '../src/pack/operations/file-ops.mjs';
import { JobInstaller } from '../src/pack/operations/job-installer.mjs';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'pathe';

const testDir = '/tmp/gitvan-test-' + Date.now();
const fixturesDir = join(process.cwd(), 'tests/fixtures/pack');

describe('Pack Operations', () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('TemplateProcessor', () => {
    it('should process template with front-matter', async () => {
      const processor = new TemplateProcessor();
      const src = join(fixturesDir, 'sample-template.txt');
      const target = join(testDir, 'output.txt');

      const result = await processor.process({
        src,
        target,
        action: 'write'
      }, { name: 'GitVan' });

      expect(existsSync(target)).toBe(true);

      const output = readFileSync(target, 'utf8');
      expect(output).toContain('Hello, GitVan!');
      expect(output).toContain('Repository:');
      expect(output).toContain('Branch:');

      expect(result.frontMatter.title).toBe('Sample Template');
      expect(result.frontMatter.mergeStrategy).toBe('append');
    });

    it('should handle template without front-matter', async () => {
      const processor = new TemplateProcessor();
      const plainTemplate = join(testDir, 'plain.txt');
      writeFileSync(plainTemplate, 'Hello {{inputs.name}}!');

      const target = join(testDir, 'plain-output.txt');

      const result = await processor.process({
        src: plainTemplate,
        target,
        action: 'write'
      }, { name: 'World' });

      expect(existsSync(target)).toBe(true);

      const output = readFileSync(target, 'utf8');
      expect(output).toContain('Hello World!');
    });

    it('should support merge mode', async () => {
      const processor = new TemplateProcessor();
      const existing = join(testDir, 'existing.txt');
      writeFileSync(existing, 'Existing content');

      const template = join(testDir, 'append.txt');
      writeFileSync(template, 'New content');

      await processor.process({
        src: template,
        target: existing,
        action: 'merge'
      });

      const output = readFileSync(existing, 'utf8');
      expect(output).toContain('Existing content');
      expect(output).toContain('New content');
    });
  });

  describe('TransformProcessor', () => {
    it('should perform JSON merge', async () => {
      const processor = new TransformProcessor();
      const target = join(testDir, 'config.json');

      writeFileSync(target, JSON.stringify({
        name: 'test',
        settings: { debug: true }
      }, null, 2));

      const result = await processor.apply({
        target,
        kind: 'json-merge',
        spec: {
          version: '2.0.0',
          settings: { timeout: 10000 }
        }
      });

      const output = JSON.parse(readFileSync(target, 'utf8'));
      expect(output.name).toBe('test');
      expect(output.version).toBe('2.0.0');
      expect(output.settings.debug).toBe(true);
      expect(output.settings.timeout).toBe(10000);

      expect(result.transformedHash).toBeDefined();
      expect(result.transformedHash).not.toBe(result.originalHash);
    });

    it('should perform JSON patch operations', async () => {
      const processor = new TransformProcessor();
      const target = join(testDir, 'patch-test.json');

      writeFileSync(target, JSON.stringify({
        name: 'test',
        features: ['a', 'b']
      }, null, 2));

      await processor.apply({
        target,
        kind: 'json-patch',
        spec: [
          { op: 'add', path: 'version', value: '1.0.0' },
          { op: 'replace', path: 'name', value: 'updated-test' },
          { op: 'remove', path: 'features' }
        ]
      });

      const output = JSON.parse(readFileSync(target, 'utf8'));
      expect(output.name).toBe('updated-test');
      expect(output.version).toBe('1.0.0');
      expect(output.features).toBeUndefined();
    });

    it('should perform text insertion', async () => {
      const processor = new TransformProcessor();
      const target = join(testDir, 'text.txt');

      writeFileSync(target, 'Line 1\nLine 2\nLine 3');

      await processor.apply({
        target,
        kind: 'text-insert',
        spec: 'Inserted line',
        anchor: {
          pattern: 'Line 2',
          position: 'after'
        }
      });

      const output = readFileSync(target, 'utf8');
      expect(output).toContain('Line 2\nInserted line');
    });

    it('should handle dry run mode', async () => {
      const processor = new TransformProcessor({ dryRun: true });
      const target = join(testDir, 'dry-run.json');

      writeFileSync(target, '{"test": true}');
      const original = readFileSync(target, 'utf8');

      const result = await processor.apply({
        target,
        kind: 'json-merge',
        spec: { added: true }
      });

      expect(result.dryRun).toBe(true);
      expect(readFileSync(target, 'utf8')).toBe(original);
    });
  });

  describe('FileOperations', () => {
    it('should copy files', async () => {
      const fileOps = new FileOperations();
      const src = join(fixturesDir, 'sample-job.mjs');
      const target = join(testDir, 'copied-job.mjs');

      const result = await fileOps.apply({
        src,
        target,
        action: 'write'
      });

      expect(existsSync(target)).toBe(true);
      expect(result.sourceHash).toBeDefined();
      expect(result.targetHash).toBeDefined();
      expect(result.sourceHash).toBe(result.targetHash);
    });

    it('should skip existing files', async () => {
      const fileOps = new FileOperations();
      const src = join(fixturesDir, 'sample-job.mjs');
      const target = join(testDir, 'skip-test.mjs');

      writeFileSync(target, 'existing content');
      const originalContent = readFileSync(target, 'utf8');

      await fileOps.apply({
        src,
        target,
        action: 'skip'
      });

      expect(readFileSync(target, 'utf8')).toBe(originalContent);
    });

    it('should merge files', async () => {
      const fileOps = new FileOperations();
      const src = join(testDir, 'merge-source.txt');
      const target = join(testDir, 'merge-target.txt');

      writeFileSync(src, 'New content');
      writeFileSync(target, 'Existing content');

      await fileOps.apply({
        src,
        target,
        action: 'merge'
      });

      const result = readFileSync(target, 'utf8');
      expect(result).toContain('Existing content');
      expect(result).toContain('New content');
    });
  });

  describe('JobInstaller', () => {
    it('should install job files', async () => {
      const installer = new JobInstaller();
      const src = join(fixturesDir, 'sample-job.mjs');
      const targetDir = join(testDir, 'jobs');

      const result = await installer.install({
        src,
        targetDir,
        type: 'job',
        id: 'my-test-job'
      });

      expect(result.type).toBe('job');
      expect(result.id).toBe('my-test-job');
      expect(existsSync(result.target)).toBe(true);
      expect(result.target).toMatch(/my-test-job\.mjs$/);
    });

    it('should use source filename when no ID provided', async () => {
      const installer = new JobInstaller();
      const src = join(fixturesDir, 'sample-job.mjs');
      const targetDir = join(testDir, 'jobs');

      const result = await installer.install({
        src,
        targetDir,
        type: 'job'
      });

      expect(result.id).toBe('sample-job');
      expect(result.target).toMatch(/sample-job\.mjs$/);
    });

    it('should validate job files', async () => {
      const installer = new JobInstaller();
      const src = join(fixturesDir, 'sample-job.mjs');

      const isValid = await installer.validateJobFile(src);
      expect(isValid).toBe(true);

      await expect(installer.validateJobFile('/nonexistent/file.mjs'))
        .rejects.toThrow('Job file not found');
    });
  });
});