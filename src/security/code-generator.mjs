/**
 * Secure Code Generation with Proper Escaping
 * Prevents code injection through sanitization and validation
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse } from '@babel/parser';

// Get the source directory dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = resolve(__dirname, '..');

/**
 * Get the dynamic import path for GitVan index
 * @returns {string} File URL for GitVan index
 */
export function getGitVanImportPath() {
  const indexPath = resolve(srcDir, 'index.mjs');
  return `file://${indexPath}`;
}

/**
 * Escape string for safe inclusion in JavaScript code
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeForJs(str) {
  if (typeof str !== 'string') {
    return String(str);
  }

  return str
    .replace(/\\/g, '\\\\')   // Backslash
    .replace(/"/g, '\\"')     // Double quote
    .replace(/'/g, "\\'")     // Single quote
    .replace(/`/g, '\\`')     // Backtick
    .replace(/\n/g, '\\n')    // Newline
    .replace(/\r/g, '\\r')    // Carriage return
    .replace(/\t/g, '\\t')    // Tab
    .replace(/\$/g, '\\$')    // Dollar sign (template literal)
    .replace(/\0/g, '');      // Null byte
}

/**
 * Safely serialize value to JSON string
 * @param {any} value - Value to serialize
 * @returns {string} JSON string
 */
function safeJsonStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return 'null';
  }
}

/**
 * Generate safe job code with proper escaping
 * @param {object} spec - Sanitized job specification
 * @returns {string} Generated job code
 */
export function generateSafeJobCode(spec) {
  // Validate spec is sanitized
  if (!spec || typeof spec !== 'object') {
    throw new Error('Invalid job specification');
  }

  // Escape all user-provided strings
  const name = escapeForJs(spec.name || 'unnamed-job');
  const desc = escapeForJs(spec.desc || 'Generated job');
  const author = escapeForJs(spec.author || 'GitVan AI');
  const version = escapeForJs(spec.version || '1.0.0');
  const tags = safeJsonStringify(spec.tags || ['generated']);
  const onConfig = spec.on ? safeJsonStringify(spec.on) : null;

  // Build the job code with escaped values
  const code = `import {
  defineJob,
  useGit,
  useTemplate,
  useNotes,
  useWorktree,
  usePack,
  useSchedule,
  useReceipt,
  useLock
} from '${getGitVanImportPath()}'
import { readFile, writeFile } from 'node:fs/promises'

export default defineJob({
  meta: {
    name: "${name}",
    desc: "${desc}",
    tags: ${tags},
    author: "${author}",
    version: "${version}"
  },${onConfig ? `\n  on: ${onConfig},` : ''}
  async run({ ctx, payload, meta }) {
    try {
      const git = useGit();
      const template = useTemplate();
      const notes = useNotes();

      console.log("Executing job: ${desc}");

      // Simple working implementation
      await writeFile('job-output.txt', \`Job executed at \${new Date().toISOString()}\`);
      await notes.write(\`Job completed: \${meta.desc}\`);

      return {
        ok: true,
        artifacts: ['job-output.txt'],
        summary: "Job completed successfully"
      };
    } catch (error) {
      console.error('Job failed:', error.message);
      return {
        ok: false,
        error: error.message,
        artifacts: []
      };
    }
  }
})`;

  return code;
}

/**
 * Validate generated code for safety
 * @param {string} code - Generated code to validate
 * @returns {object} Validation result
 */
export function validateGeneratedCode(code) {
  try {
    // Parse the code to ensure it's valid JavaScript
    const ast = parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true
    });

    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\(/,
      /Function\(/,
      /require\(/,
      /child_process/,
      /\.\.\//, // Relative imports
      /process\.exit/,
      /process\.kill/,
      /fs\.rm/,
      /fs\.unlink/,
      /exec\(/,
      /spawn\(/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return {
          valid: false,
          error: `Dangerous pattern detected: ${pattern}`,
          ast: null
        };
      }
    }

    return {
      valid: true,
      error: null,
      ast
    };
  } catch (error) {
    return {
      valid: false,
      error: `Code validation failed: ${error.message}`,
      ast: null
    };
  }
}
