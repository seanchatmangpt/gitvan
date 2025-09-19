# GitVan v2 — JSDoc & Type System Documentation

This document provides comprehensive information about the JSDoc documentation and type system implementation in GitVan v2.

## Overview

GitVan v2 implements a comprehensive JSDoc documentation system with full TypeScript type support. This enables:

- **Full IntelliSense support** in modern IDEs
- **Type-safe development** with compile-time error checking
- **Comprehensive API documentation** generated from code comments
- **Modular type exports** for selective imports
- **Git-native architecture** with complete type coverage

## Architecture

### Type System Components

1. **Core Types** (`types/index.d.ts`)
   - Runtime context interfaces
   - Job definitions and execution specs
   - Git API interfaces
   - Template rendering interfaces

2. **Composable Types** (`src/composables/`)
   - `useGit()` - Git operations
   - `useTemplate()` - Template rendering
   - `useTurtle()` - RDF/Turtle operations
   - `useGraph()` - RDF graph operations
   - `useExec()` - Execution capabilities

3. **Knowledge Hooks Types** (`src/hooks/`)
   - `HookOrchestrator` - Main orchestrator
   - `HookParser` - Hook definition parsing
   - `PredicateEvaluator` - Predicate evaluation
   - Knowledge hook interfaces

4. **Git-Native I/O Types** (`src/git-native/`)
   - `GitNativeIO` - Main I/O orchestrator
   - `QueueManager` - Job queue management
   - `LockManager` - Distributed lock management
   - `ReceiptWriter` - Receipt and metrics writing
   - `SnapshotStore` - Content-addressed storage

5. **Workflow Types** (`src/workflow/`)
   - `DAGPlanner` - Workflow planning
   - `StepRunner` - Step execution
   - `WorkflowExecutor` - Workflow orchestration
   - `ContextManager` - Context management

6. **RDF to Zod Types** (`src/rdf-to-zod/`)
   - `RDFToZodConverter` - RDF to Zod conversion
   - `OllamaRDF` - AI-powered RDF processing
   - Validation and schema generation

## JSDoc Standards

### File Headers

Every module includes a comprehensive file header:

```javascript
/**
 * @fileoverview GitVan v2 — Module Name
 * 
 * Brief description of the module's purpose and key features.
 * 
 * Key Features:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 * 
 * @version 2.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */
```

### Class Documentation

Classes include comprehensive documentation:

```javascript
/**
 * Class Name
 * 
 * Detailed description of the class purpose and functionality.
 * 
 * @class ClassName
 * @description Brief description
 */
export class ClassName {
  /**
   * Create ClassName instance
   * 
   * @constructor
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.param] - Parameter description
   */
  constructor(options = {}) {
    // Implementation
  }
}
```

### Function Documentation

Functions include detailed parameter and return documentation:

```javascript
/**
 * Function description
 * 
 * Detailed explanation of what the function does and how it works.
 * 
 * @function functionName
 * @param {Object} [options={}] - Options object
 * @param {string} [options.param] - Parameter description
 * @returns {Promise<Object>} Return value description
 * @throws {Error} When operation fails
 * 
 * @example
 * ```javascript
 * const result = await functionName({ param: 'value' });
 * console.log(result);
 * ```
 */
export async function functionName(options = {}) {
  // Implementation
}
```

### Type Definitions

Complex types are defined with comprehensive JSDoc:

```javascript
/**
 * @typedef {Object} TypeName
 * @description Description of the type
 * @property {string} property1 - Property description
 * @property {number} [property2] - Optional property description
 * @property {Object} [property3] - Complex property description
 * @property {string} property3.nested - Nested property description
 */
```

## Type Generation

### Automatic Type Generation

The type system is automatically generated using:

```bash
# Generate all types and documentation
npm run build

# Generate only documentation
npm run docs

# Generate only type mappings
npm run types
```

### Type Mapping System

The type mapping system (`src/types/mappings.mjs`) provides:

- **Module-to-file mappings** for all types
- **Type resolution** utilities
- **IntelliSense configuration** for IDEs
- **Package.json exports** for modular imports

### IntelliSense Configuration

The `tsconfig.json` provides comprehensive IntelliSense support:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "allowJs": true,
    "checkJs": true,
    "declaration": true,
    "strict": true
  }
}
```

## Usage Examples

### Type-Safe Imports

```javascript
// Core composables with full type support
import { useGit, useTemplate, useTurtle } from 'gitvan/composables';

// Knowledge hooks with type safety
import { HookOrchestrator } from 'gitvan/hooks';

// Git-native I/O with type checking
import { GitNativeIO } from 'gitvan/git-native';

// RDF to Zod conversion
import { useRDFToZod } from 'gitvan/rdf-to-zod';
```

### Type-Safe Development

```javascript
/**
 * @param {RunContext} ctx - GitVan runtime context
 * @returns {Promise<JobResult>} Job execution result
 */
async function myJob(ctx) {
  const git = useGit();
  const template = useTemplate();
  
  // Full IntelliSense support
  const branch = git.branch();
  const rendered = template.render('template.njk', { branch });
  
  return { ok: true, stdout: rendered };
}
```

### Custom Type Definitions

```javascript
/**
 * @typedef {Object} CustomHook
 * @description Custom knowledge hook definition
 * @property {string} id - Hook identifier
 * @property {PredicateDefinition} predicate - Predicate definition
 * @property {WorkflowDefinition[]} workflows - Workflow definitions
 */

/**
 * @param {CustomHook} hook - Custom hook definition
 * @returns {Promise<boolean>} Whether hook triggered
 */
async function evaluateCustomHook(hook) {
  // Implementation with full type safety
}
```

## API Documentation

### Generated Documentation

The JSDoc system generates comprehensive API documentation:

- **Module documentation** with overview and examples
- **Class documentation** with methods and properties
- **Function documentation** with parameters and returns
- **Type documentation** with property descriptions
- **Cross-references** between related types and functions

### Documentation Structure

```
docs/api/
├── index.html          # Main documentation page
├── modules/            # Module documentation
├── classes/            # Class documentation
├── functions/          # Function documentation
├── typedefs/           # Type definition documentation
└── assets/             # Documentation assets
```

### Accessing Documentation

```bash
# Generate documentation
npm run docs

# View documentation
open docs/api/index.html
```

## Best Practices

### JSDoc Comments

1. **Always include file headers** with comprehensive descriptions
2. **Document all public APIs** with parameter and return types
3. **Use examples** to illustrate usage patterns
4. **Include error conditions** with `@throws` tags
5. **Cross-reference related types** with `@see` tags

### Type Definitions

1. **Use descriptive names** for types and properties
2. **Include comprehensive descriptions** for all properties
3. **Mark optional properties** with `[property]` syntax
4. **Use union types** for multiple possible values
5. **Provide examples** for complex types

### Code Organization

1. **Group related types** in the same module
2. **Export types** alongside implementations
3. **Use consistent naming** conventions
4. **Maintain type mappings** as code evolves
5. **Update documentation** with code changes

## Integration

### IDE Support

The type system provides full support for:

- **Visual Studio Code** - IntelliSense and error checking
- **WebStorm** - Advanced refactoring and navigation
- **Sublime Text** - TypeScript plugin support
- **Vim/Neovim** - LSP integration

### Build Integration

```bash
# Pre-commit hooks for type checking
npm run lint

# CI/CD type validation
npm run test && npm run lint

# Documentation generation
npm run docs
```

### Package Distribution

The type system is included in the published package:

```json
{
  "types": "./types/index.d.ts",
  "exports": {
    ".": {
      "types": "./types/index.d.ts",
      "import": "./src/index.mjs"
    }
  }
}
```

## Maintenance

### Updating Types

When adding new functionality:

1. **Add JSDoc comments** to new code
2. **Update type definitions** in `types/index.d.ts`
3. **Regenerate type mappings** with `npm run types`
4. **Update documentation** with `npm run docs`
5. **Test type safety** with `npm run lint`

### Version Management

- **Major changes** require type definition updates
- **Minor changes** may require documentation updates
- **Patch changes** typically don't affect types
- **Breaking changes** must update type exports

## Conclusion

The GitVan v2 JSDoc and type system provides:

- **Complete type safety** across the entire codebase
- **Comprehensive documentation** generated from code
- **Modern IDE support** with IntelliSense
- **Modular architecture** with selective imports
- **Git-native design** with full type coverage

This system enables confident, type-safe development while maintaining the Git-native philosophy of using Git as the runtime environment for development automation.
