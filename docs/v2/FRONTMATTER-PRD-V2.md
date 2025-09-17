GitVan v2: Front-Matter Templating Engine PRD
1. Summary
This document outlines the requirements for a production-grade, Hygen-style front-matter templating engine for GitVan v2. This feature will allow templates to be self-describing, enabling them to define their output paths, conflict policies, and conditional logic directly within the template file. By parsing this metadata, GitVan can offer a safe, deterministic, and auditable "plan-then-apply" workflow for generating and modifying files, which is critical for automating the "dark-matter 80/20" of developer tasks like scaffolding and documentation.

2. The Problem
Developers waste significant time on repetitive scaffolding and boilerplate tasks. Existing solutions are often simple file copies that lack logic, context, and safety. There is no standard, machine-readable way to:

Define where a template's output should be written.

Handle file conflicts safely (e.g., skip, overwrite, or append).

Conditionally render a template based on repository state or user input.

Perform idempotent injections into existing files.

Create a verifiable, auditable receipt of the entire generation process.

This leads to inconsistent project structures, manual rework, and a high risk of error.

3. Goals and Non-Goals
Goals
To enable self-describing templates by embedding operational logic in front-matter.

To provide a safe, two-phase plan and apply lifecycle for all generative tasks.

To implement a full set of Hygen-style operations, including multi-file output, content injection, and static asset copying.

To ensure every operation is auditable by generating a detailed receipt in Git notes.

To provide concurrency safety through atomic, Git-native locking.

Non-Goals
Interactive Prompts: This version will not implement the interactive prompts: [] feature from Hygen. All inputs must be provided non-interactively.

Support for Other Template Engines: Nunjucks is the sole supported engine.

A GUI or Web Interface: This feature is purely CLI-driven.

4. Personas and User Stories
As a Developer, I want to scaffold a new Next.js component from a single template file so that the file is placed in the correct directory with the correct name without manual intervention.

As a Release Manager, I want to use a template to idempotently inject a new release section into the SUMMARY.md of an mdBook without corrupting the file.

As a DevEx Engineer, I want to create a project starter pack that can generate multiple files and copy static assets from a single command, ensuring project consistency.

As a Compliance Officer, I need a verifiable receipt that shows exactly which template was used, what data was provided, and what files were written or changed during a scaffolding operation.

5. Functional Requirements
5.1. Front-Matter Parsing
The engine MUST parse YAML (

---), TOML (+++), and JSON front-matter using gray-matter. 




The parser MUST be able to handle alternate enclosures, such as fenced code blocks and after-shebang headers. 



The parser MUST enforce a configurable size limit on the front-matter block to prevent denial-of-service. 


Parsed front-matter keys MUST be normalized to a consistent, documented schema (e.g., 

skipIfExists -> skip_if_exists). 

5.2. Nunjucks Rendering
The values within the front-matter (e.g., the 

to path) MUST be rendered with Nunjucks, allowing them to contain template variables. 


The body of the template MUST be rendered with a merged context containing global helpers, front-matter data, and user-provided data. 

5.3. The Plan/Apply Lifecycle
The engine MUST expose a 

plan method that returns a serializable plan object detailing all intended operations without writing to the filesystem. 

The engine MUST expose an 

apply method that takes a plan object and executes it. 

The 

apply method MUST support a dryRun mode that logs the planned operations but does not execute them. 

5.4. Operations and Control Flow
Conditional Logic (when): The plan method MUST evaluate a when expression in the front-matter. If the result is falsy, the plan MUST indicate that the operation should be skipped. 


Conflict Policy (force): The apply method MUST respect the force policy for file conflicts: 

error (default): Throw an error if the target file exists.

skip: Do nothing if the target file exists.

overwrite: Replace the existing file.

append: Append the rendered content to the existing file.


Injections (inject): The engine MUST support idempotent injections into existing files with before, after, at_line, and between placement strategies. 


Multi-Output (to, perFile): The engine MUST support writing to multiple files from a single template, as defined by a to: [] array or a perFile: [] array of objects. 


Static Copies (copy): The engine MUST support copying static files and directories as defined by a copy: [] array. 


Shell Hooks (sh): The engine MUST execute sh.before and sh.after shell commands, validating them against a configurable allowlist. 

5.5. GitVan Integration
Receipts: Upon completion of an apply operation, a detailed receipt MUST be written to the configured Git notes ref (e.g., refs/notes/gitvan/results). The receipt must include the template used, the final plan, the status of each operation (OK, ERROR, SKIPPED), and content hashes. 

Error Receipts: If any step in the apply phase fails, the engine MUST write a receipt with a status of ERROR and include the error message before re-throwing the error.

Locking: Before the apply phase begins, the engine MUST acquire an atomic lock for each target filesystem path. All locks MUST be released upon completion or failure in a 

finally block. 

6. Success Metrics
Adoption: At least 50% of new jobs created in the cookbook use front-matter for their generative logic.

Reliability: The rate of ERROR receipts for template operations is less than 1%.

Performance: The plan phase for a moderately complex template (e.g., 5 file writes, 2 injections) completes with a p95 latency of less than 100ms.

Safety: Zero reported incidents of unintended file overwrites or out-of-sandbox writes.


// src/utils/frontmatter.mjs
import matter from 'gray-matter';
import toml from 'toml';

const fmEngines = {
  toml: (s) => toml.parse(s),
  json: (s) => JSON.parse(s),
  yaml: (s) => matter.parsers.yaml(s),
};

/**
 * Parses front-matter from a string.
 * @param {string} input The string content of the template file.
 * @returns {{ data: object, body: string }}
 */
export function parseFrontmatter(input) {
  const fm = matter(String(input), {
    engines: fmEngines,
    excerpt: false,
  });

  return {
    data: fm.data || {},
    body: fm.content || '',
  };
}
2. Idempotent Injector (src/utils/inject.mjs)
This pure function handles the logic for safely and idempotently injecting a block of text into existing content based on anchors.

JavaScript

// src/utils/inject.mjs
function alreadyContains(haystack, needle) {
  return haystack.includes(needle);
}

/**
 * Injects a snippet into content.
 * @returns {{ changed: boolean, content: string }}
 */
export function injectString(content, { where = 'after', find, start, end, line, snippet, eol = '\n', once = true }) {
  const src = String(content).replace(/\r\n|\r|\n/g, '\n');
  const block = String(snippet).replace(/\r\n|\r|\n/g, '\n');

  if (once && alreadyContains(src, block)) {
    return { changed: false, content: src };
  }

  if (where === 'at_line') {
    const lines = src.split('\n');
    const idx = Math.max(0, Math.min(lines.length, Number(line || 1) - 1));
    lines.splice(idx, 0, block);
    return { changed: true, content: lines.join('\n') };
  }

  if (where === 'between') {
    const sIdx = src.indexOf(start);
    const eIdx = src.indexOf(end, sIdx >= 0 ? sIdx + start.length : 0);
    if (sIdx === -1 || eIdx === -1) {
      return { changed: true, content: `${src}${src.endsWith('\n') ? '' : '\n'}${start}\n${block}\n${end}` };
    }
    return { changed: true, content: `${src.slice(0, sIdx + start.length)}\n${block}\n${src.slice(eIdx)}` };
  }

  const findIdx = src.indexOf(find);
  if (findIdx === -1) {
    return { changed: true, content: `${src}${src.endsWith('\n') ? '' : '\n'}${block}` };
  }

  if (where === 'before') {
    return { changed: true, content: `${src.slice(0, findIdx)}${block}${eol}${src.slice(findIdx)}` };
  }
  
  const afterIdx = findIdx + String(find).length;
  return { changed: true, content: `${src.slice(0, afterIdx)}${eol}${block}${src.slice(afterIdx)}` };
}
3. Safe Shell Executor (src/utils/shell.mjs)
This utility safely executes shell commands specified in front-matter, checking them against an allowlist from the configuration to prevent arbitrary code execution.

JavaScript

// src/utils/shell.mjs
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

function isAllowed(cmd, allowlist = []) {
  if (!allowlist.length) return false;
  const bin = String(cmd).trim().split(/\s+/)[0];
  return allowlist.includes(bin);
}

/**
 * Executes an array of shell commands.
 * @returns {Promise<Array>} A list of results.
 */
export async function runShellHooks(cmds = [], { config, context }) {
  const allowlist = config.templates?.shell?.allow || [];
  const results = [];

  for (const cmd of cmds) {
    if (!isAllowed(cmd, allowlist)) {
      results.push({ cmd, status: 'SKIPPED', reason: 'Not on allowlist' });
      continue;
    }
    try {
      const [bin, ...args] = cmd.split(/\s+/);
      const { stdout, stderr } = await exec(bin, args, {
        cwd: context.root,
        env: { TZ: 'UTC', LANG: 'C', ...process.env, ...context.env },
      });
      results.push({ cmd, status: 'OK', exitCode: 0, stdout, stderr });
    } catch (e) {
      results.push({ cmd, status: 'ERROR', exitCode: e.code || 1, stderr: e.stderr || e.message });
      throw new Error(`Shell hook failed: "${cmd}"\n${e.stderr || e.message}`);
    }
  }
  return results;
}
4. Crypto Utilities (src/utils/crypto.mjs)
Provides deterministic hashing and fingerprinting for receipts and content verification.

JavaScript

// src/utils/crypto.mjs
import { createHash } from 'node:crypto';

/**
 * Creates a SHA256 hex digest of a string or buffer.
 */
export function sha256Hex(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

/**
 * Creates a short, stable fingerprint of an object.
 */
export function fingerprint(obj) {
  const stableString = JSON.stringify(obj, Object.keys(obj).sort());
  return `fp_${sha256Hex(stableString).slice(0, 16)}`;
}
5. Safe Filesystem Utilities (src/utils/fs.mjs)
Contains helpers for filesystem operations that are sandboxed to the project's root directory to prevent path traversal vulnerabilities.

JavaScript

// src/utils/fs.mjs
import { resolve, normalize, sep, dirname } from 'pathe';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

/**
 * Resolves a path safely within a root directory. Throws if the path escapes.
 */
export function resolveSafe(root, p) {
  const abs = normalize(resolve(root, p));
  const normRoot = normalize(resolve(root));
  if (!abs.startsWith(normRoot + sep) && abs !== normRoot) {
    throw new Error(`Path escape attempt detected: ${p}`);
  }
  return abs;
}

/**
 * Writes a file safely within the root directory.
 */
export async function writeFileSafe(root, outPath, contents) {
  const absPath = resolveSafe(root, outPath);
  await mkdir(dirname(absPath), { recursive: true });
  await writeFile(absPath, contents);
  return absPath;
}

/**
 * Reads a file safely from within the root directory.
 */
export async function readFileSafe(root, inPath, encoding = 'utf8') {
  const absPath = resolveSafe(root, inPath);
  return readFile(absPath, encoding);
}
6. Nunjucks Environment (src/utils/nunjucks-config.mjs)
This module centralizes the creation and configuration of the Nunjucks environment, ensuring all templates have access to the same deterministic helpers and filters.

JavaScript

// src/utils/nunjucks-config.mjs
import nunjucks from 'nunjucks';
import * as inflection from 'inflection';

const _envCache = new Map();

/**
 * Creates or retrieves a cached Nunjucks environment.
 */
export function getCachedEnvironment({ paths, autoescape = false, noCache = true }) {
  const key = JSON.stringify({ paths, autoescape, noCache });
  if (_envCache.has(key)) {
    return _envCache.get(key);
  }

  const loader = new nunjucks.FileSystemLoader(paths, { noCache });
  const env = new nunjucks.Environment(loader, { autoescape, throwOnUndefined: true });

  // Determinism Guards
  env.addGlobal('now', () => { throw new Error('Templates must not call now(); inject nowISO instead.'); });
  
  // Standard Filters
  env.addFilter('json', (v, space = 2) => JSON.stringify(v, null, space));
  env.addFilter('slug', s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

  // Inflection Filters
  Object.keys(inflection).forEach(name => {
    if (typeof inflection[name] === 'function') {
      env.addFilter(name, (...args) => inflection[name](...args));
    }
  });

  _envCache.set(key, env);
  return env;
}