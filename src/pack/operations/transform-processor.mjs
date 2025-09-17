import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createLogger } from '../../utils/logger.mjs';
import { createHash } from 'node:crypto';

export class TransformProcessor {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:transform');
  }

  async apply(step) {
    const { target, kind, spec, anchor } = step;
    
    if (!existsSync(target)) {
      throw new Error(`Transform target not found: ${target}`);
    }
    
    const original = readFileSync(target, 'utf8');
    const originalHash = createHash('sha256').update(original).digest('hex');
    
    let transformed;
    switch (kind) {
      case 'json-merge':
        transformed = await this.jsonMerge(original, spec);
        break;
        
      case 'json-patch':
        transformed = await this.jsonPatch(original, spec);
        break;
        
      case 'yaml-merge':
        transformed = await this.yamlMerge(original, spec);
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
    
    if (this.options.dryRun) {
      this.logger.info(`Would transform: ${target}`);
      return { target, originalHash, dryRun: true };
    }
    
    writeFileSync(target, transformed);
    
    return {
      target,
      originalHash,
      transformedHash: createHash('sha256').update(transformed).digest('hex')
    };
  }

  async jsonMerge(content, spec) {
    try {
      const data = JSON.parse(content);
      const merged = this.deepMerge(data, spec);
      return JSON.stringify(merged, null, 2);
    } catch (error) {
      this.logger.error(`JSON merge failed: ${error.message}`);
      throw error;
    }
  }

  async jsonPatch(content, spec) {
    try {
      const data = JSON.parse(content);
      
      // Apply JSON patch operations
      for (const op of spec) {
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
          default:
            this.logger.warn(`Unknown JSON patch operation: ${op.op}`);
        }
      }
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      this.logger.error(`JSON patch failed: ${error.message}`);
      throw error;
    }
  }

  async yamlMerge(content, spec) {
    // Basic YAML-like merge for simple cases
    // In production, would use js-yaml
    this.logger.warn('YAML merge using basic implementation');
    
    try {
      // For simple key-value YAML, convert to JSON and back
      const jsonLike = content
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .reduce((acc, line) => {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const [, key, value] = match;
            acc[key] = value.replace(/["']/g, '');
          }
          return acc;
        }, {});
        
      const merged = this.deepMerge(jsonLike, spec);
      
      // Convert back to YAML-like format
      return Object.entries(merged)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    } catch (error) {
      this.logger.error(`YAML merge failed: ${error.message}`);
      return content;
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
      } else {
        output[key] = source[key];
      }
    }
    
    return output;
  }

  setPath(obj, path, value) {
    const parts = path.split('/').filter(Boolean);
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  deletePath(obj, path) {
    const parts = path.split('/').filter(Boolean);
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) return;
      current = current[parts[i]];
    }
    
    delete current[parts[parts.length - 1]];
  }
}