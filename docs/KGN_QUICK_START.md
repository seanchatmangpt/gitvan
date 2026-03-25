# KGN Template Engine - Quick Start Guide

## Installation & Setup

### Import the Engine

```javascript
import { GitVanTemplateEngine } from 'src/lib/template-engine.mjs';

// Create an engine instance
const engine = new GitVanTemplateEngine({
  deterministicMode: true,
  enableCache: true,
  paths: ['/path/to/templates']
});
```

## Basic Usage

### Render a String

```javascript
const result = await engine.renderString(
  'Hello {{ name }}!',
  { name: 'World' }
);
// => 'Hello World!'
```

## Common Filters

### Case Conversion
- `camelCase` - convert to camelCase
- `pascalCase` - convert to PascalCase  
- `kebabCase` - convert to kebab-case
- `snakeCase` - convert to snake_case

### String Operations
- `upper` - uppercase
- `lower` - lowercase
- `capitalize` - capitalize first letter
- `slug` - URL-safe slug
- `split(delimiter)` - split string
- `join(delimiter)` - join array
- `length` - get length

### Array Operations
- `sum` - sum array values
- `max` - get maximum value
- `min` - get minimum value

### Type Conversions
- `int` - convert to integer
- `float` - convert to float
- `string` - convert to string
- `bool` - convert to boolean
- `json(indent)` - JSON stringify

### Inflection
- `pluralize` - pluralize word
- `singularize` - singularize word
- `humanize` - humanize string
- `titleize` - titleize string

## Examples

```javascript
// Case conversion
{{ 'hello-world' | camelCase }}          // => helloWorld
{{ 'HelloWorld' | kebabCase }}           // => hello-world

// String operations
{{ 'hello' | upper }}                    // => HELLO
{{ 'Hello World!' | slug }}              // => hello-world

// Chaining
{{ text | lower | kebabCase | upper }}   // => HELLO-WORLD

// Default values
{{ user.email | default('N/A') }}

// Arrays
{{ prices | sum }}                       // => sum of array
{{ items | length }}                     // => 3

// Type conversion
{{ '42' | int | string }}                // => "42"
```

## Important: Deterministic Rendering

✓ DO: Inject values from context
```javascript
{{ timestamp | date('YYYY-MM-DD') }}
```

✗ DON'T: Use time-based functions
```javascript
{{ now() }}     // ❌ Error: not allowed
{{ random() }} // ❌ Error: not allowed
```

## Configuration

```javascript
new GitVanTemplateEngine({
  deterministicMode: true,   // Enforce determinism
  enableCache: true,         // Cache templates
  paths: ['/templates'],     // Search paths
  autoescape: false          // HTML escaping
})
```

## API

- `renderString(template, context)` - render template string
- `renderFile(name, context)` - render template file
- `addFilter(name, fn)` - add custom filter
- `listFilters(category)` - list filters
- `getCacheStats()` - get cache stats
- `clearCache()` - clear cache

## Filter Count: 40+

Total filters across all categories:
- Case Conversion: 4
- String Operations: 9  
- Array Operations: 3
- Type Conversions: 5
- Utility: 4
- Inflection: 14
- Safety: 2
- GitVan-specific: 4

## More Information

See `KGN_TEMPLATE_ENGINE_MIGRATION_COMPLETE.md` for full documentation.

Status: Production Ready ✓
