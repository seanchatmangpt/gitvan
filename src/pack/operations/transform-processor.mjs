import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createLogger } from '../../utils/logger.mjs';
import { createHash } from 'node:crypto';
import * as yaml from 'js-yaml';
import * as xml2js from 'xml2js';
import * as toml from '@iarna/toml';
import * as ini from 'ini';
import * as json5 from 'json5';
import { JSONPath } from 'jsonpath-plus';
import Ajv from 'ajv';

export class TransformProcessor {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:transform');
    this.ajv = new Ajv({ allErrors: true });

    // Default merge strategies
    this.mergeStrategies = {
      merge: this.deepMerge.bind(this),
      replace: this.replaceStrategy.bind(this),
      append: this.appendStrategy.bind(this),
      prepend: this.prependStrategy.bind(this)
    };

    // File format parsers
    this.parsers = {
      json: { parse: JSON.parse, stringify: (data) => JSON.stringify(data, null, 2) },
      json5: { parse: json5.parse, stringify: (data) => json5.stringify(data, null, 2) },
      yaml: { parse: yaml.load, stringify: yaml.dump },
      toml: { parse: toml.parse, stringify: toml.stringify },
      ini: { parse: ini.parse, stringify: ini.stringify },
      xml: {
        parse: (content) => xml2js.parseStringPromise(content, { explicitArray: false }),
        stringify: (data) => {
          const builder = new xml2js.Builder();
          return builder.buildObject(data);
        }
      }
    };
  }

  async apply(step) {
    const { target, kind, spec, anchor } = step;

    if (!existsSync(target)) {
      throw new Error(`Transform target not found: ${target}`);
    }

    const original = readFileSync(target, 'utf8');
    const originalHash = createHash('sha256').update(original).digest('hex');

    // Validate input if schema provided
    if (spec.schema) {
      this.validateInput(original, spec.schema, kind);
    }

    let transformed;
    try {
      switch (kind) {
        case 'json-merge':
        case 'json5-merge':
          transformed = await this.formatMerge(original, spec, 'json');
          break;

        case 'json-patch':
        case 'json5-patch':
          transformed = await this.formatPatch(original, spec, 'json');
          break;

        case 'yaml-merge':
          transformed = await this.formatMerge(original, spec, 'yaml');
          break;

        case 'yaml-patch':
          transformed = await this.formatPatch(original, spec, 'yaml');
          break;

        case 'toml-merge':
          transformed = await this.formatMerge(original, spec, 'toml');
          break;

        case 'toml-patch':
          transformed = await this.formatPatch(original, spec, 'toml');
          break;

        case 'ini-merge':
          transformed = await this.formatMerge(original, spec, 'ini');
          break;

        case 'ini-patch':
          transformed = await this.formatPatch(original, spec, 'ini');
          break;

        case 'xml-merge':
          transformed = await this.formatMerge(original, spec, 'xml');
          break;

        case 'xml-patch':
          transformed = await this.formatPatch(original, spec, 'xml');
          break;

        case 'jsonpath-select':
          transformed = await this.jsonPathSelect(original, spec);
          break;

        case 'jsonpath-modify':
          transformed = await this.jsonPathModify(original, spec);
          break;

        case 'text-insert':
          transformed = await this.textInsert(original, spec, anchor);
          break;

        case 'text-replace':
          transformed = await this.textReplace(original, spec, anchor);
          break;

        default:
          throw new Error(`Unknown transform kind: ${kind}`);
      }

      // Validate output if schema provided
      if (spec.outputSchema) {
        this.validateOutput(transformed, spec.outputSchema, kind);
      }

    } catch (error) {
      this.logger.error(`Transform failed for ${target}: ${error.message}`);
      throw new Error(`Transform failed: ${error.message}`);
    }

    if (this.options.dryRun) {
      this.logger.info(`Would transform: ${target}`);
      return { target, originalHash, dryRun: true, preview: transformed.slice(0, 500) };
    }

    // Safety check - ensure we're not writing empty content accidentally
    if (!transformed || transformed.trim().length === 0) {
      throw new Error('Transform resulted in empty content - aborting for safety');
    }

    writeFileSync(target, transformed);

    return {
      target,
      originalHash,
      transformedHash: createHash('sha256').update(transformed).digest('hex'),
      size: { original: original.length, transformed: transformed.length }
    };
  }

  async formatMerge(content, spec, format = 'json') {
    try {
      const parser = this.getParser(format);
      const data = await parser.parse(content);

      const strategy = this.mergeStrategies[spec.strategy || 'merge'];
      const merged = strategy(data, spec.data || spec);

      return parser.stringify(merged);
    } catch (error) {
      this.logger.error(`${format.toUpperCase()} merge failed: ${error.message}`);
      throw error;
    }
  }

  async formatPatch(content, spec, format = 'json') {
    try {
      const parser = this.getParser(format);
      const data = await parser.parse(content);

      // Apply patch operations
      const operations = Array.isArray(spec) ? spec : spec.operations || [];

      for (const op of operations) {
        switch (op.op) {
          case 'add':
            this.setPath(data, op.path, op.value);
            break;
          case 'remove':
            this.deletePath(data, op.path);
            break;
          case 'replace':
            this.setPath(data, op.path, op.value);
            break;
          case 'move':
            const value = this.getPath(data, op.from);
            this.deletePath(data, op.from);
            this.setPath(data, op.path, value);
            break;
          case 'copy':
            const copyValue = this.getPath(data, op.from);
            this.setPath(data, op.path, copyValue);
            break;
          case 'test':
            const testValue = this.getPath(data, op.path);
            if (JSON.stringify(testValue) !== JSON.stringify(op.value)) {
              throw new Error(`Test operation failed for path: ${op.path}`);
            }
            break;
          default:
            this.logger.warn(`Unknown patch operation: ${op.op}`);
        }
      }

      return parser.stringify(data);
    } catch (error) {
      this.logger.error(`${format.toUpperCase()} patch failed: ${error.message}`);
      throw error;
    }
  }

  async jsonPathSelect(content, spec) {
    try {
      const data = JSON.parse(content);
      const results = JSONPath({ path: spec.path, json: data });

      if (spec.returnType === 'array') {
        return JSON.stringify(results, null, 2);
      }

      if (spec.returnType === 'first') {
        return JSON.stringify(results[0] || null, null, 2);
      }

      return JSON.stringify(results, null, 2);
    } catch (error) {
      this.logger.error(`JSONPath select failed: ${error.message}`);
      throw error;
    }
  }

  async jsonPathModify(content, spec) {
    try {
      const data = JSON.parse(content);

      for (const modification of spec.modifications || []) {
        JSONPath({
          path: modification.path,
          json: data,
          callback: (value, type, payload) => {
            switch (modification.operation) {
              case 'set':
                payload.parent[payload.parentProperty] = modification.value;
                break;
              case 'delete':
                delete payload.parent[payload.parentProperty];
                break;
              case 'transform':
                if (modification.transform === 'uppercase') {
                  payload.parent[payload.parentProperty] = String(value).toUpperCase();
                } else if (modification.transform === 'lowercase') {
                  payload.parent[payload.parentProperty] = String(value).toLowerCase();
                } else if (modification.transform === 'increment') {
                  payload.parent[payload.parentProperty] = Number(value) + (modification.by || 1);
                }
                break;
            }
          }
        });
      }

      return JSON.stringify(data, null, 2);
    } catch (error) {
      this.logger.error(`JSONPath modify failed: ${error.message}`);
      throw error;
    }
  }

  async textInsert(content, text, anchor) {
    if (!anchor) {
      return content + text;
    }

    const lines = content.split('\n');
    const pattern = new RegExp(anchor.pattern);

    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        switch (anchor.position) {
          case 'before':
            lines.splice(i, 0, text);
            break;
          case 'after':
            lines.splice(i + 1, 0, text);
            break;
          case 'replace':
            lines[i] = text;
            break;
        }
        break;
      }
    }

    return lines.join('\n');
  }

  async textReplace(content, spec, anchor) {
    if (anchor?.pattern) {
      const pattern = new RegExp(anchor.pattern, 'g');
      return content.replace(pattern, spec.replacement || '');
    }

    if (spec.pattern && spec.replacement) {
      const pattern = new RegExp(spec.pattern, spec.flags || 'g');
      return content.replace(pattern, spec.replacement);
    }

    return content;
  }

  deepMerge(target, source) {
    const output = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
          output[key] = this.deepMerge(target[key], source[key]);
        } else {
          output[key] = source[key];
        }
      } else if (Array.isArray(source[key])) {
        // Handle arrays - merge by default, can be overridden
        if (Array.isArray(target[key])) {
          output[key] = [...target[key], ...source[key]];
        } else {
          output[key] = source[key];
        }
      } else {
        output[key] = source[key];
      }
    }

    return output;
  }

  replaceStrategy(target, source) {
    return source;
  }

  appendStrategy(target, source) {
    if (Array.isArray(target) && Array.isArray(source)) {
      return [...target, ...source];
    }

    if (typeof target === 'string' && typeof source === 'string') {
      return target + source;
    }

    return this.deepMerge(target, source);
  }

  prependStrategy(target, source) {
    if (Array.isArray(target) && Array.isArray(source)) {
      return [...source, ...target];
    }

    if (typeof target === 'string' && typeof source === 'string') {
      return source + target;
    }

    return this.deepMerge(source, target);
  }

  setPath(obj, path, value) {
    const parts = this.parsePath(path);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];

      if (!current[part]) {
        // Create array if next part is numeric, object otherwise
        current[part] = /^\d+$/.test(nextPart) ? [] : {};
      }
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }

  getPath(obj, path) {
    const parts = this.parsePath(path);
    let current = obj;

    for (const part of parts) {
      if (current == null || !(part in current)) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  parsePath(path) {
    // Support both JSONPointer (/path/to/prop) and dot notation (path.to.prop)
    if (path.startsWith('/')) {
      return path.split('/').filter(Boolean).map(part =>
        part.replace(/~1/g, '/').replace(/~0/g, '~')
      );
    }

    return path.split('.');
  }

  deletePath(obj, path) {
    const parts = this.parsePath(path);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) return;
      current = current[parts[i]];
    }

    const lastPart = parts[parts.length - 1];
    if (Array.isArray(current)) {
      current.splice(parseInt(lastPart), 1);
    } else {
      delete current[lastPart];
    }
  }

  getParser(format) {
    const parser = this.parsers[format];
    if (!parser) {
      throw new Error(`Unsupported format: ${format}`);
    }
    return parser;
  }

  validateInput(content, schema, kind) {
    try {
      const validate = this.ajv.compile(schema);
      let data;

      // Parse based on transform kind
      if (kind.includes('json')) {
        data = JSON.parse(content);
      } else if (kind.includes('yaml')) {
        data = yaml.load(content);
      } else if (kind.includes('toml')) {
        data = toml.parse(content);
      } else {
        return; // Skip validation for unsupported formats
      }

      if (!validate(data)) {
        throw new Error(`Input validation failed: ${this.ajv.errorsText(validate.errors)}`);
      }
    } catch (error) {
      this.logger.warn(`Input validation failed: ${error.message}`);
      throw error;
    }
  }

  validateOutput(content, schema, kind) {
    try {
      const validate = this.ajv.compile(schema);
      let data;

      // Parse based on transform kind
      if (kind.includes('json')) {
        data = JSON.parse(content);
      } else if (kind.includes('yaml')) {
        data = yaml.load(content);
      } else if (kind.includes('toml')) {
        data = toml.parse(content);
      } else {
        return; // Skip validation for unsupported formats
      }

      if (!validate(data)) {
        throw new Error(`Output validation failed: ${this.ajv.errorsText(validate.errors)}`);
      }
    } catch (error) {
      this.logger.warn(`Output validation failed: ${error.message}`);
      throw error;
    }
  }

  // Utility method to detect file format from extension or content
  detectFormat(filename, content) {
    const ext = filename.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'json': return 'json';
      case 'json5': return 'json5';
      case 'yaml': case 'yml': return 'yaml';
      case 'toml': return 'toml';
      case 'ini': case 'cfg': return 'ini';
      case 'xml': return 'xml';
      default:
        // Try to detect from content
        const trimmed = content.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
        if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) return 'xml';
        if (trimmed.includes('=') && !trimmed.includes(':')) return 'ini';
        return 'text';
    }
  }

  // Safety check for destructive operations
  isSafeTransform(originalContent, transformedContent, options = {}) {
    const originalLines = originalContent.split('\n').length;
    const transformedLines = transformedContent.split('\n').length;

    // Warn if content shrinks significantly
    const shrinkageRatio = transformedLines / originalLines;
    if (shrinkageRatio < 0.5 && !options.allowShrinkage) {
      this.logger.warn(`Content shrunk significantly: ${originalLines} -> ${transformedLines} lines`);
    }

    // Prevent completely empty output
    if (transformedContent.trim().length === 0 && originalContent.trim().length > 0) {
      return false;
    }

    return true;
  }

  // Backup and rollback functionality
  createBackup(target) {
    const backupPath = `${target}.backup.${Date.now()}`;
    const content = readFileSync(target, 'utf8');
    writeFileSync(backupPath, content);
    return backupPath;
  }

  rollback(target, backupPath) {
    if (existsSync(backupPath)) {
      const content = readFileSync(backupPath, 'utf8');
      writeFileSync(target, content);
      return true;
    }
    return false;
  }
}