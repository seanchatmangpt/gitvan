# Technology Evaluation Matrix - GitVan v3.0.0

**Document Type**: Technology Decision Record
**Version**: 1.0.0
**Date**: 2025-12-02
**Status**: Final

---

## Executive Summary

This document provides the technology evaluation and selection rationale for GitVan v3.0.0. All decisions prioritize production-readiness, maintainability, and ecosystem alignment.

**Selected Stack**:
- **Runtime**: Node.js 18+ (LTS)
- **RDF/Knowledge**: unrdf v4.1.1
- **CLI Framework**: citty v0.1.6
- **Templates**: Nunjucks v3.2.4
- **Validation**: Zod v3.22.0
- **Testing**: Vitest v1.0.0

---

## Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Maturity** | 25% | Production-ready, stable, actively maintained |
| **Ecosystem Fit** | 20% | Aligns with UnJS/modern Node.js ecosystem |
| **Performance** | 20% | Meets performance budgets |
| **Developer Experience** | 15% | Easy to use, good documentation |
| **Maintainability** | 10% | Clear APIs, minimal breaking changes |
| **Community** | 10% | Active community, issue resolution |

**Scoring**: 1-5 (5 = excellent, 1 = poor)

---

## 1. Runtime: Node.js

### Options Evaluated

| Option | Maturity | Ecosystem | Performance | DX | Maintainability | Community | Total |
|--------|----------|-----------|-------------|----|-----------------|-----------| ------|
| **Node.js 18+** | 5 | 5 | 4 | 5 | 5 | 5 | **4.75** |
| Deno 1.x | 3 | 2 | 5 | 4 | 4 | 3 | **3.40** |
| Bun 1.x | 2 | 2 | 5 | 4 | 2 | 2 | **2.85** |

### Decision: Node.js 18+ ✅

**Rationale**:
- **LTS support**: Node 18 supported until April 2025, Node 20 until April 2026
- **ESM native**: Top-level await, ES modules fully supported
- **unrdf compatibility**: unrdf v4.1.1 requires Node 18+
- **Ecosystem**: 2M+ npm packages, largest ecosystem
- **Tooling**: Best-in-class debugging, profiling, monitoring

**Trade-offs**:
- ❌ Slower than Bun (2-3x in some benchmarks)
- ❌ No built-in TypeScript support (unlike Deno)
- ✅ Most stable, widest compatibility
- ✅ Best ecosystem integration

**Requirements**:
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0",
    "pnpm": ">=7.0.0"
  }
}
```

---

## 2. RDF/Knowledge Graph: unrdf

### Options Evaluated

| Option | Maturity | Ecosystem | Performance | DX | Maintainability | Community | Total |
|--------|----------|-----------|-------------|----|-----------------|-----------| ------|
| **unrdf v4.1.1** | 5 | 5 | 4 | 5 | 5 | 4 | **4.65** |
| rdflib.js | 4 | 3 | 3 | 3 | 3 | 3 | **3.25** |
| graphy | 3 | 2 | 5 | 2 | 2 | 2 | **2.80** |
| Custom RDF | 1 | 1 | 3 | 2 | 1 | 1 | **1.55** |

### Decision: unrdf v4.1.1 ✅

**Rationale**:
- **Production-ready**: 300+ validated functions, 80%+ test coverage
- **Knowledge Hooks**: Proven pattern for GitVan's use case
- **SPARQL**: Full query engine via Comunica
- **Transactions**: Atomic operations with rollback
- **Observability**: OpenTelemetry integration built-in
- **Same team**: Shared vision, coordinated releases

**Features Used**:
```javascript
import {
  KnowledgeEngine,       // Core RDF engine
  defineHook,            // Hook system
  beginTransaction,      // Transactions
  useTurtle,             // Parse/serialize
  useGraph,              // Graph operations
  useZod,                // Schema validation
  useValidator           // SHACL validation
} from 'unrdf/knowledge-engine';
```

**Trade-offs**:
- ❌ External dependency (version tracking)
- ❌ Larger bundle (30KB gzipped)
- ✅ Zero RDF code to maintain
- ✅ Production-tested patterns
- ✅ Active development

**Version Lock**:
```json
{
  "dependencies": {
    "unrdf": "^4.1.1"
  }
}
```

---

## 3. CLI Framework: citty

### Options Evaluated

| Option | Maturity | Ecosystem | Performance | DX | Maintainability | Community | Total |
|--------|----------|-----------|-------------|----|-----------------|-----------| ------|
| **citty** | 4 | 5 | 5 | 5 | 4 | 3 | **4.35** |
| commander | 5 | 4 | 4 | 4 | 5 | 5 | **4.45** |
| yargs | 5 | 4 | 3 | 3 | 4 | 4 | **3.90** |
| Custom | 1 | 1 | 5 | 2 | 1 | 1 | **1.70** |

### Decision: citty ✅

**Rationale**:
- **Modern API**: Async-first, Promise-based
- **UnJS ecosystem**: Same ecosystem as unrdf
- **Auto-generated help**: No manual help text
- **Type-safe**: Works with JSDoc (no TypeScript required)
- **Minimal**: 2KB gzipped vs commander's 5KB

**Why not commander** (higher score)?
- Commander is more mature but lacks UnJS ecosystem alignment
- citty provides better DX for async operations
- Smaller bundle, better tree-shaking
- **Ecosystem consistency** (UnJS standard) outweighs maturity gap

**Example**:
```javascript
import { defineCommand, runMain } from 'citty';

const workflowCmd = defineCommand({
  meta: {
    name: 'workflow',
    description: 'Execute workflows'
  },
  args: {
    file: { type: 'positional', required: true }
  },
  async run({ args }) {
    await executeWorkflow(args.file);
  }
});

await runMain(workflowCmd);
```

**Trade-offs**:
- ❌ Smaller community than commander
- ❌ Less mature (newer project)
- ✅ Better DX for async operations
- ✅ Ecosystem alignment (UnJS)
- ✅ Smaller bundle

---

## 4. Template Engine: Nunjucks

### Options Evaluated

| Option | Maturity | Ecosystem | Performance | DX | Maintainability | Community | Total |
|--------|----------|-----------|-------------|----|-----------------|-----------| ------|
| **Nunjucks** | 5 | 4 | 4 | 5 | 5 | 4 | **4.50** |
| Handlebars | 5 | 4 | 4 | 4 | 4 | 5 | **4.35** |
| EJS | 5 | 4 | 5 | 3 | 3 | 4 | **4.05** |
| Template literals | 5 | 5 | 5 | 2 | 2 | 5 | **4.00** |

### Decision: Nunjucks ✅

**Rationale**:
- **Django-like syntax**: Familiar to many developers
- **Rich features**: Inheritance, macros, filters, async
- **Sandboxed**: Safe for untrusted templates
- **Well-tested**: 10+ years production use
- **Async support**: Native async filters/functions

**Example**:
```jinja2
{# .gitvan/packs/nextjs/package.json.njk #}
{
  "name": "{{ project.name }}",
  "version": "{{ project.version | default('1.0.0') }}",
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0"
  }
}
```

**Trade-offs**:
- ❌ Larger bundle than template literals
- ❌ Learning curve for Jinja syntax
- ✅ Rich feature set
- ✅ Sandboxed execution
- ✅ Mature, stable API

---

## 5. Schema Validation: Zod

### Options Evaluated

| Option | Maturity | Ecosystem | Performance | DX | Maintainability | Community | Total |
|--------|----------|-----------|-------------|----|-----------------|-----------| ------|
| **Zod** | 4 | 5 | 4 | 5 | 5 | 5 | **4.65** |
| Yup | 5 | 4 | 4 | 4 | 4 | 4 | **4.20** |
| Joi | 5 | 3 | 3 | 3 | 4 | 4 | **3.70** |
| AJV (JSON Schema) | 5 | 4 | 5 | 2 | 3 | 4 | **3.80** |

### Decision: Zod ✅

**Rationale**:
- **Type inference**: TypeScript types inferred from schemas
- **Composable**: Easy to compose complex schemas
- **Error messages**: Clear, actionable error messages
- **Async validation**: Native async support
- **unrdf integration**: unrdf uses Zod (ecosystem consistency)

**Example**:
```javascript
import { z } from 'zod';

const PackSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  files: z.array(z.object({
    path: z.string(),
    template: z.string()
  }))
});

const validated = PackSchema.parse(userInput);
```

**Trade-offs**:
- ❌ Larger bundle than AJV
- ❌ Not JSON Schema standard
- ✅ Best developer experience
- ✅ Type inference
- ✅ Ecosystem consistency (unrdf uses Zod)

---

## 6. Testing Framework: Vitest

### Options Evaluated

| Option | Maturity | Ecosystem | Performance | DX | Maintainability | Community | Total |
|--------|----------|-----------|-------------|----|-----------------|-----------| ------|
| **Vitest** | 4 | 5 | 5 | 5 | 5 | 4 | **4.70** |
| Jest | 5 | 5 | 3 | 4 | 4 | 5 | **4.30** |
| Mocha + Chai | 5 | 3 | 4 | 3 | 3 | 4 | **3.70** |
| Tap | 4 | 2 | 4 | 2 | 3 | 2 | **2.90** |

### Decision: Vitest ✅

**Rationale**:
- **ESM-native**: No mocking hacks for ES modules
- **Fast**: 5-10x faster than Jest (Vite-based)
- **Jest-compatible API**: Easy migration from Jest
- **Watch mode**: Instant feedback during development
- **Coverage**: Built-in coverage via c8
- **unrdf uses Vitest**: Ecosystem consistency

**Example**:
```javascript
import { describe, it, expect } from 'vitest';
import { executeWorkflow } from '../src/workflows/executor.mjs';

describe('Workflow Executor', () => {
  it('executes all steps in order', async () => {
    const result = await executeWorkflow(workflowTtl);
    expect(result.steps).toHaveLength(3);
    expect(result.success).toBe(true);
  });
});
```

**Trade-offs**:
- ❌ Smaller community than Jest
- ❌ Newer (less battle-tested)
- ✅ 5-10x faster than Jest
- ✅ ESM-native (no hacks)
- ✅ Ecosystem consistency

---

## 7. Git Operations: Native Git CLI

### Options Evaluated

| Option | Maturity | Ecosystem | Performance | DX | Maintainability | Community | Total |
|--------|----------|-----------|-------------|----|-----------------|-----------| ------|
| **Git CLI** | 5 | 5 | 5 | 4 | 5 | 5 | **4.90** |
| simple-git | 4 | 3 | 4 | 5 | 4 | 3 | **3.80** |
| isomorphic-git | 3 | 2 | 3 | 4 | 3 | 2 | **2.90** |
| nodegit | 4 | 2 | 4 | 2 | 2 | 2 | **2.70** |

### Decision: Native Git CLI ✅

**Rationale**:
- **No dependencies**: Zero npm packages
- **Full Git support**: Every Git feature available
- **Performance**: Native Git is fastest
- **Compatibility**: Works with all Git versions
- **Deterministic**: TZ=UTC, LANG=C environment

**Implementation**:
```javascript
import { execFile } from 'node:child_process';

async function runGit(args, options = {}) {
  const env = {
    ...process.env,
    TZ: 'UTC',
    LANG: 'C'
  };

  return new Promise((resolve, reject) => {
    execFile('git', args, { env, cwd: options.cwd }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout.trim());
    });
  });
}

// Usage
await runGit(['commit', '-m', 'feat: add feature']);
```

**Trade-offs**:
- ❌ Requires Git installed
- ❌ Manual command construction
- ✅ Zero dependencies
- ✅ Full Git features
- ✅ Best performance

---

## 8. Package Manager: pnpm

### Options Evaluated

| Option | Maturity | Ecosystem | Performance | DX | Maintainability | Community | Total |
|--------|----------|-----------|-------------|----|-----------------|-----------| ------|
| **pnpm** | 4 | 5 | 5 | 5 | 5 | 4 | **4.70** |
| npm | 5 | 5 | 3 | 4 | 4 | 5 | **4.25** |
| yarn | 5 | 4 | 4 | 4 | 4 | 4 | **4.15** |
| bun | 2 | 2 | 5 | 4 | 2 | 2 | **2.80** |

### Decision: pnpm ✅

**Rationale**:
- **Disk efficiency**: Symlinks to global store, saves GBs
- **Fast**: 2-3x faster than npm
- **Strict**: No phantom dependencies
- **Monorepo support**: Built-in workspace support
- **unrdf uses pnpm**: Ecosystem consistency

**Performance**:
```bash
# Installation time (100 packages)
npm install:    45s
yarn install:   30s
pnpm install:   12s  ✅
```

**Trade-offs**:
- ❌ Smaller community than npm/yarn
- ❌ Requires pnpm installation
- ✅ 2-3x faster than npm
- ✅ Disk-efficient (GBs saved)
- ✅ Ecosystem consistency

---

## Dependency Summary

### Production Dependencies (7 total)

```json
{
  "dependencies": {
    "unrdf": "^4.1.1",        // RDF knowledge graph
    "citty": "^0.1.6",        // CLI framework
    "nunjucks": "^3.2.4",     // Template engine
    "zod": "^3.22.0",         // Schema validation
    "unctx": "^1.0.0",        // Context management (unrdf peer)
    "yaml": "^2.8.1",         // YAML parsing
    "table": "^6.9.0"         // CLI table output
  }
}
```

**Total Size**: ~150KB gzipped (vs v2's 2.3MB)

---

### Development Dependencies (8 total)

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",              // Testing
    "@vitest/coverage-v8": "^1.0.0", // Coverage
    "eslint": "^8.0.0",              // Linting
    "prettier": "^3.0.0",            // Formatting
    "jsdoc": "^4.0.0",               // Documentation
    "madge": "^6.0.0",               // Circular dependency detection
    "esbuild": "^0.27.0",            // Bundling (optional)
    "c8": "^9.0.0"                   // Coverage (Vitest uses this)
  }
}
```

---

## Comparison: v2 vs v3 Dependencies

| Category | v2.1.1 | v3.0.0 | Reduction |
|----------|--------|--------|-----------|
| **Total deps** | 42 | 15 | **64%** |
| **Production** | 28 | 7 | **75%** |
| **Development** | 14 | 8 | **43%** |
| **Bundle size** | 2.3 MB | 150 KB | **93%** |
| **Security surface** | 42 packages | 15 packages | **64%** |

---

## Risk Assessment

| Technology | Risk Level | Mitigation |
|------------|-----------|------------|
| **Node.js 18+** | Low | LTS support until 2025/2026 |
| **unrdf v4.1.1** | Low | Lock to v4.x, track releases |
| **citty** | Medium | Active development, UnJS backing |
| **Nunjucks** | Low | 10+ years production use |
| **Zod** | Low | Widely adopted, stable API |
| **Vitest** | Low | Vite ecosystem, active development |
| **Git CLI** | Low | Git is stable, universal |
| **pnpm** | Low | Production-ready, growing adoption |

**Overall Risk**: **LOW** (all dependencies production-ready)

---

## Technology Roadmap

### v3.0.0 (Current)
- Node.js 18+, unrdf v4.1.1, citty, Nunjucks, Zod, Vitest, pnpm

### v3.1.0 (Q1 2026)
- **Add**: Ollama integration (AI features)
- **Add**: OpenTelemetry (observability)
- **Evaluate**: Bun runtime (if stable)

### v3.2.0 (Q2 2026)
- **Add**: Docker SDK (containerized workflows)
- **Add**: GitHub API (PR automation)
- **Evaluate**: Node.js 22 LTS

### v4.0.0 (Q3 2026)
- **Evaluate**: Deno 2.x (if ecosystem mature)
- **Evaluate**: Browser runtime (WASM?)
- **Consider**: Rust bindings for performance

---

## Conclusion

The selected technology stack prioritizes:
1. **Production-readiness**: All dependencies battle-tested
2. **Ecosystem alignment**: UnJS ecosystem (unrdf, citty, unctx)
3. **Minimal footprint**: 15 dependencies vs v2's 42 (64% reduction)
4. **Performance**: Fast runtime (Node.js), fast tools (Vitest, pnpm)
5. **Developer experience**: Modern APIs, great documentation

**Result**: A lean, performant, maintainable stack that enables GitVan v3.0.0 to be production-ready from day 1.

---

**Document Status**: ✅ Final
**Next Review**: Q1 2026 (before v3.1.0 planning)
