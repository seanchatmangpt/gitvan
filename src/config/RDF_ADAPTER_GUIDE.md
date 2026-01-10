# RDF Config Adapter Guide

## Overview

The RDF Config Adapter provides 100% backward compatibility between c12 (current config system) and RDF (new semantic config system). Existing code works unchanged, while new code can leverage SPARQL queries and semantic capabilities.

## Key Principles

1. **100% Backward Compatible**: All existing c12 code continues to work without any changes
2. **Opt-in RDF Features**: New RDF capabilities are available when explicitly requested
3. **Parallel Loading**: Both c12 and RDF configs load simultaneously for minimal performance impact
4. **Consistency Validation**: Detect and report discrepancies between c12 and RDF configs
5. **No Breaking Changes**: The original `loadOptions()` function unchanged; new `loadWithRDFSupport()` is additive

## Quick Start

### Using the Original c12 Loader (No Changes Required)

```javascript
import { loadOptions } from './config/loader.mjs';

// Works exactly as before
const config = await loadOptions({
  ai: { provider: 'anthropic' }
});

console.log(config.ai.provider); // 'anthropic'
```

### Enabling RDF Features

```javascript
import { loadWithRDFSupport } from './config/loader.mjs';

// New adapter with RDF support
const config = await loadWithRDFSupport({
  ai: { provider: 'anthropic' }
});

// c12 interface works 100% as before
console.log(config.ai.provider); // 'anthropic'

// NEW: RDF interface available
const sparql = `
  PREFIX gvc: <https://gitvan.dev/ontology/config#>
  SELECT ?provider WHERE {
    <urn:gitvan:config> gvc:aiProvider ?provider .
  }
`;
const results = await config.rdf.query(sparql);
```

## API Reference

### loadWithRDFSupport(overrides, opts)

Load GitVan configuration with both c12 and RDF support.

**Parameters:**

- `overrides` (Object): Configuration overrides (same as `loadOptions`)
- `opts` (Object): Loader options
  - `validateConsistency` (boolean, default: false): Check for conflicts between c12 and RDF
  - `preferRDF` (boolean, default: false): Use RDF values if they exist (advanced)
  - `dualWrite` (boolean, default: false): Write to both c12 and RDF (Phase 2, not yet implemented)
  - `rdfConfigUri` (string, default: "urn:gitvan:config"): Base URI for RDF config
  - `watch` (boolean, default: false): Enable config watching

**Returns:** Promise<Object> - Configuration object with dual interface

**Example:**

```javascript
const config = await loadWithRDFSupport(
  { ai: { provider: 'anthropic' } },
  {
    validateConsistency: true,
    rdfConfigUri: 'https://example.com/config'
  }
);
```

## Configuration Object Interface

### c12 Interface (100% Backward Compatible)

All properties from the loaded config are available directly:

```javascript
const config = await loadWithRDFSupport({ ... });

// Access properties as normal
config.ai.provider
config.jobs.dir
config.runtime.timezone
config.templates.engine
// ... all other c12 properties work unchanged
```

### RDF Interface

Available via `config.rdf` object:

#### `async rdf.get(path: string): any`

Get a specific configuration value from RDF:

```javascript
const provider = await config.rdf.get('ai.provider');
console.log(provider); // 'anthropic'
```

#### `async rdf.query(sparql: string): Object`

Execute SPARQL queries against the config RDF store:

```javascript
const results = await config.rdf.query(`
  PREFIX gvc: <https://gitvan.dev/ontology/config#>
  SELECT ?property ?value
  WHERE {
    <urn:gitvan:config> ?property ?value .
  }
  LIMIT 10
`);
console.log(results);
```

#### `async rdf.validate(): Object`

Validate config against SHACL shapes:

```javascript
const validation = await config.rdf.validate();
console.log(validation);
// {
//   valid: true/false,
//   results: [{ focusNode, resultPath, resultMessage }, ...]
// }
```

#### `async rdf.toTurtle(): string`

Export config as Turtle (RDF text format):

```javascript
const turtle = await config.rdf.toTurtle();
console.log(turtle);
// @prefix gvc: <https://gitvan.dev/ontology/config#> .
// <urn:gitvan:config> a gvc:Configuration ;
//   gvc:aiProvider "anthropic" ;
//   ...
```

#### `async rdf.toPOJO(): Object`

Export config as plain JavaScript object:

```javascript
const pojo = await config.rdf.toPOJO();
console.log(pojo);
// { ai: { provider: 'anthropic' }, ... }
```

#### `async rdf.paths(): string[]`

Get all configuration paths in RDF:

```javascript
const paths = await config.rdf.paths();
console.log(paths);
// ['ai.provider', 'ai.model', 'ai.temperature', ...]
```

#### `async rdf.all(): Object`

Get all configuration values from RDF (equivalent to `toPOJO()`):

```javascript
const all = await config.rdf.all();
```

#### `rdf.isAvailable(): boolean`

Check if RDF config is available:

```javascript
if (config.rdf.isAvailable()) {
  const results = await config.rdf.query('SELECT * WHERE { ?s ?p ?o }');
}
```

#### `rdf.getConsistencyReport(): Object|null`

Get consistency report (only if `validateConsistency: true`):

```javascript
if (opts.validateConsistency) {
  const report = config.rdf.getConsistencyReport();
  if (!report.isConsistent) {
    console.warn('Config discrepancies detected:');
    report.discrepancies.forEach(d => {
      console.warn(`  ${d.path}: c12="${d.c12Value}" vs RDF="${d.rdfValue}"`);
    });
  }
}
```

### Adapter Methods

#### `async getRDF(path: string): any`

Get value directly from RDF (shorthand):

```javascript
const provider = await config.getRDF('ai.provider');
```

#### `getConsistencyReport(): Object|null`

Get consistency validation report:

```javascript
const report = config.getConsistencyReport();
if (report && !report.isConsistent) {
  // Handle discrepancies
}
```

#### `getLoadTimeMs(): number`

Get total config load time in milliseconds:

```javascript
const loadTime = config.getLoadTimeMs();
console.log(`Config loaded in ${loadTime}ms`);
```

## Migration Paths

### No Migration Needed for Most Code

If you're using `loadOptions()`, no changes are required:

```javascript
// Old code - still works exactly the same
import { loadOptions } from './config/loader.mjs';
const config = await loadOptions({ ... });
```

### Gradual Adoption of RDF Features

To start using RDF queries without breaking existing code:

```javascript
// Import the new adapter
import { loadWithRDFSupport } from './config/loader.mjs';

// Replace loadOptions with loadWithRDFSupport
const config = await loadWithRDFSupport(overrides, opts);

// All c12 code continues to work
const provider = config.ai.provider;

// Add new RDF queries where beneficial
const complexQuery = `
  PREFIX gvc: <https://gitvan.dev/ontology/config#>
  SELECT ?key ?value
  WHERE {
    <urn:gitvan:config> ?key ?value .
  }
`;
const results = await config.rdf.query(complexQuery);
```

### Using RDF as Primary Source (Advanced)

If you want RDF values to take precedence:

```javascript
const config = await loadWithRDFSupport(
  { ... },
  { preferRDF: true } // RDF values override c12
);
```

## Consistency Validation

### Basic Usage

Enable consistency checking to detect discrepancies:

```javascript
const config = await loadWithRDFSupport(
  { ai: { provider: 'anthropic' } },
  { validateConsistency: true }
);

const report = config.getConsistencyReport();
if (!report.isConsistent) {
  console.warn('Configuration inconsistencies found:');
  for (const disc of report.discrepancies) {
    console.warn(`  ${disc.path}: ${disc.reason}`);
  }
}
```

### Understanding the Report

```javascript
const report = config.getConsistencyReport();

// Structure:
{
  isConsistent: boolean,
  discrepancies: [
    { path, c12Value, rdfValue, reason },
    ...
  ],
  onlyInC12: [
    { path, value },
    ...
  ],
  onlyInRDF: [
    { path, value },
    ...
  ],
  typeConflicts: [
    { path, c12Value, c12Type, rdfValue, rdfType },
    ...
  ],
  valueConflicts: [
    { path, c12Value, rdfValue },
    ...
  ],
  warnings: [
    { type, path, message, suggestion },
    ...
  ]
}
```

### Formatting Reports

Pretty-print consistency reports:

```javascript
import { formatConsistencyReport } from './config/config-consistency-validator.mjs';

const report = config.getConsistencyReport();
const formatted = formatConsistencyReport(report);
console.log(formatted);
```

## Performance Characteristics

### Load Times

- **c12 only** (original): ~30-50ms
- **c12 + RDF parallel**: ~40-80ms (parallel loading is fast)
- **c12 + RDF + validation**: ~80-150ms

The adapter loads both in parallel, so RDF adds minimal overhead.

### Memory Usage

- Minimal overhead (~1MB) from RDF store
- c12 config cloned for safety (~0.5MB typical)
- Consistency reports stored only when requested

### Optimization Tips

1. Only enable `validateConsistency` when needed (testing, CI)
2. Use `preferRDF: false` (default) unless specifically required
3. Consistency validation is cached per load
4. SPARQL queries are lazy-evaluated

## Common Patterns

### Accessing Configuration

```javascript
// c12 interface (unchanged)
const provider = config.ai.provider;

// RDF interface (optional)
const rdfProvider = await config.rdf.get('ai.provider');
```

### Conditional RDF Features

```javascript
if (config.rdf.isAvailable()) {
  // Use advanced RDF features
  const results = await config.rdf.query(sparqlQuery);
} else {
  // Fallback to c12
  const provider = config.ai.provider;
}
```

### Exporting Configuration

```javascript
// Export current config as Turtle (for documentation/auditing)
if (config.rdf.isAvailable()) {
  const turtle = await config.rdf.toTurtle();
  console.log(turtle);
}
```

### Configuration Debugging

```javascript
// See all loaded paths
const paths = await config.rdf.paths();
console.log('Config paths:', paths);

// Export as JSON for inspection
const all = await config.rdf.toPOJO();
console.log(JSON.stringify(all, null, 2));

// Check consistency
const report = config.getConsistencyReport();
console.log('Consistent:', report.isConsistent);
```

## Troubleshooting

### RDF Features Not Working

**Problem:** `config.rdf.query()` throws "RDF config not available"

**Solution:**
- Check that RDF system is initialized
- Verify RDF config files exist
- Check for errors in RDF ontology loading
- The adapter gracefully falls back to c12 only

### Consistency Discrepancies

**Problem:** Validation shows mismatches between c12 and RDF

**Solutions:**
1. Use `preferRDF: true` to prioritize RDF values
2. Update one source to match the other
3. Add ignore rules for known differences
4. Use `validateConsistency: false` in production if intentional

### Performance Issues

**Problem:** Config loading slower than expected

**Solutions:**
1. Disable consistency validation in hot paths
2. Cache config object if loading repeatedly
3. Check that RDF system isn't blocking on I/O
4. Profile with `getLoadTimeMs()`

## Technical Details

### Architecture

The adapter uses a Proxy pattern to:
1. Delegate to c12 config for normal property access
2. Intercept special properties (`rdf`, `getRDF`, etc.)
3. Provide RDF interface when available
4. Maintain 100% backward compatibility

### Config Property Mapping

The system maps c12 config paths to RDF predicates:

```
c12 path          RDF predicate
ai.provider       gvc:aiProvider
ai.temperature    gvc:aiTemperature
jobs.dir          gvc:jobsDir
runtime.timezone  gvc:runtimeTimezone
... etc
```

See `config-parser.mjs` for the complete mapping.

### Data Types

Type conversion between c12 and RDF:

```
JavaScript   XSD Type
boolean      xsd:boolean
number       xsd:integer or xsd:decimal
string       xsd:string
Array        rdf:List
```

## Future Enhancements

### Phase 2 (Planned)

- **dualWrite**: Automatically sync changes to both c12 and RDF
- **ConfigWatcher**: React to config changes in RDF store
- **Constraints**: SHACL-based validation with auto-fix suggestions
- **Evolution**: Track config schema changes over time

### Phase 3 (Planned)

- **Federation**: Query configs across multiple stores via SPARQL
- **Versioning**: Full config history with time travel queries
- **Distribution**: Share configs as RDF graphs with signing/verification

## References

- **c12 Documentation**: https://github.com/unjs/c12
- **RDF/Turtle**: https://www.w3.org/TR/turtle/
- **SPARQL**: https://www.w3.org/TR/sparql11-query/
- **SHACL**: https://www.w3.org/TR/shacl/

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review integration tests in `tests/config/rdf-adapter.test.mjs`
3. Check consistency reports: `formatConsistencyReport()`
4. Enable verbose logging for RDF operations
