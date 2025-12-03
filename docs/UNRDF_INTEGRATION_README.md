# GitVan unrdf Integration

**Status**: ✅ **COMPLETE** (v2.1.1)

## What is unrdf?

[unrdf](https://github.com/rdfjs/unrdf) is a modern RDF framework that provides:
- Knowledge Hooks (policy-driven automation)
- Cryptographic Provenance (Lockchain with Merkle trees)
- Transaction Management (ACID guarantees)
- Performance Optimization (Dark Matter 80/20)
- OTEL Instrumentation

**Important**: unrdf is built ON TOP of N3.js, not as a replacement. It's a composable wrapper that adds enterprise features.

## How GitVan Uses unrdf

GitVan extends `unrdf`'s RdfEngine with GitVan-specific features:

```javascript
import { RdfEngine as UnrdfEngine } from "unrdf";

export class RdfEngine extends UnrdfEngine {
  // Inherits all unrdf features
  // Adds GitVan-specific extensions
}
```

### GitVan Extensions

- **Clownface Integration**: Graph traversal via @zazuko/env
- **Prefix Extraction**: Smart prefix management from stores
- **Metrics & Logging**: Performance tracking and observability
- **Deterministic Operations**: Reproducible behavior for testing

## Architecture

```
┌─────────────────────────────────────┐
│     GitVan Application Code         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  GitVan RdfEngine (extends)         │
│  ✨ Clownface, metrics, logging     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  unrdf RdfEngine                    │
│  ✨ Hooks, lockchain, transactions  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  N3.js (Parser, Store, Writer)      │
│  Battle-tested RDF foundation       │
└─────────────────────────────────────┘
```

## Key Files

### Core Implementation
- `/src/engines/RdfEngine.mjs` - Main RDF engine extending unrdf

### Documentation
- `UNRDF_REALITY_CHECK.md` - Why N3.js DataFactory is OK
- `UNRDF_REFACTORING_SUMMARY.md` - Complete refactoring details
- `UNRDF_MIGRATION.md` - Migration guide and API changes

### Tests
- `/tests/integration/unrdf-integration.test.mjs` - Integration test suite

## Why N3.js Imports Still Exist

**This is by design and CORRECT**. Here's why:

1. **unrdf itself imports N3.js internally** - it's built on N3.js
2. **DataFactory is needed** for creating RDF terms (namedNode, literal, etc.)
3. **unrdf re-exports N3 classes** as part of its public API

From unrdf's own code:
```javascript
// node_modules/unrdf/src/knowledge-engine/index.mjs
export { Store, Parser, Writer, DataFactory } from "n3";
```

### Current N3.js Usage in GitVan

```javascript
// src/engines/RdfEngine.mjs
import { DataFactory } from "n3";  // ✅ CORRECT - for term creation

const { namedNode, literal, quad, blankNode } = DataFactory;
```

**This is the ONLY remaining direct N3 import**, and it's necessary for:
- Creating RDF terms (namedNode, literal)
- Building quads and triples
- Term factory operations

All other RDF operations (parsing, querying, serialization) use unrdf's RdfEngine.

## What Changed

### Before (Direct N3 Usage)
```javascript
import { Parser, Store, Writer } from "n3";

const parser = new Parser();
const store = new Store();
const writer = new Writer();
```

### After (unrdf Integration)
```javascript
import { RdfEngine as UnrdfEngine } from "unrdf";
import { DataFactory } from "n3";  // Only for term creation

export class RdfEngine extends UnrdfEngine {
  // All parsing, querying, serialization via unrdf
  // DataFactory only for creating RDF terms
}
```

## Benefits

1. **Battle-Tested Foundation**: Inherits unrdf's production-ready RDF operations
2. **Advanced Features**: Access to hooks, lockchain, transactions
3. **Better Performance**: Dark Matter 80/20 optimization
4. **Observability**: OTEL instrumentation built-in
5. **Maintainability**: Less code to maintain (inherited from unrdf)
6. **Backward Compatible**: All existing APIs preserved

## Testing

```bash
# Run unrdf integration tests
pnpm test tests/integration/unrdf-integration.test.mjs

# Run all RDF tests
pnpm test src/engines/
```

**Test Coverage**: 17 tests covering parsing, querying, serialization, and validation.

## Common Misconceptions

### ❌ "We should remove ALL N3 imports"
**Wrong**. unrdf itself uses N3.js. Removing N3 would break unrdf.

### ❌ "unrdf replaces N3.js"
**Wrong**. unrdf is built ON TOP of N3.js, adding features.

### ✅ "We should extend unrdf's RdfEngine and use N3 DataFactory for terms"
**Correct**. This is the intended architecture.

## Resources

- **unrdf GitHub**: https://github.com/rdfjs/unrdf
- **N3.js GitHub**: https://github.com/rdfjs/N3.js
- **RDF.js Spec**: https://rdf.js.org/
- **GitVan unrdf Tests**: `/tests/integration/unrdf-integration.test.mjs`

## Support

For issues related to unrdf integration:
1. Check `UNRDF_REALITY_CHECK.md` for architecture clarification
2. Review `UNRDF_REFACTORING_SUMMARY.md` for implementation details
3. Check `UNRDF_MIGRATION.md` for API changes
4. Create GitHub issue with label `rdf:unrdf`

---

**Last Updated**: 2025-10-30
**Version**: 2.1.1
**Status**: Production Ready ✅
