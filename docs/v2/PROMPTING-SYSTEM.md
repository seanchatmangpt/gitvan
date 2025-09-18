# GitVan User Input Prompting System

## Overview

GitVan v2 implements a comprehensive user input prompting system to handle missing required inputs for pack operations. The system supports multiple input types, validation, and works in both CLI and programmatic contexts.

## Features

- **Interactive Prompting**: Beautiful CLI prompts for missing inputs
- **Multiple Input Types**: text, boolean, select, multiselect, number, password, autocomplete
- **Validation**: Built-in validation with custom error messages
- **Non-Interactive Mode**: Support for CI/CD and automation contexts
- **Default Values**: Support for default values and context-provided defaults
- **Type Conversion**: Automatic type conversion (e.g., "true" → true for booleans)

## Input Types

### Text/String
```json
{
  "key": "projectName",
  "type": "text",
  "description": "What is your project name?",
  "required": true,
  "minLength": 3,
  "maxLength": 50,
  "pattern": "^[a-zA-Z0-9-_]+$",
  "patternMessage": "Project name can only contain letters, numbers, hyphens, and underscores"
}
```

### Boolean
```json
{
  "key": "enableSSR",
  "type": "boolean",
  "description": "Enable Server-Side Rendering?",
  "default": false
}
```

### Select (Single Choice)
```json
{
  "key": "framework",
  "type": "select",
  "description": "Choose your framework",
  "enum": ["react", "vue", "angular", "svelte"],
  "default": "react"
}
```

### Multiselect (Multiple Choices)
```json
{
  "key": "features",
  "type": "multiselect",
  "description": "Select features to include",
  "enum": ["typescript", "eslint", "prettier", "jest"],
  "required": false
}
```

### Number
```json
{
  "key": "port",
  "type": "number",
  "description": "Development server port",
  "min": 1000,
  "max": 9999,
  "default": 3000
}
```

### Password
```json
{
  "key": "apiKey",
  "type": "password",
  "description": "Enter your API key",
  "required": false
}
```

### Path
```json
{
  "key": "outputDir",
  "type": "path",
  "description": "Output directory",
  "default": "./dist"
}
```

## Usage Examples

### Basic Pack Input Resolution

```javascript
import { Pack } from './src/pack/pack.mjs';

const pack = new Pack('./my-pack');
await pack.load();

// Interactive prompting (CLI context)
const resolved = await pack.resolveInputs();

// Non-interactive with provided inputs
const resolved = await pack.resolveInputs({
  projectName: 'my-project',
  framework: 'react'
}, {
  noPrompt: true
});

// With defaults and prompting
const resolved = await pack.resolveInputs({}, {
  defaults: {
    projectName: 'default-project',
    framework: 'vue'
  }
});
```

### Programmatic Usage

```javascript
import { promptForInputs, PromptingContext } from './src/utils/prompts.mjs';

const inputDefs = [
  {
    key: 'name',
    type: 'text',
    description: 'Enter your name',
    required: true
  },
  {
    key: 'framework',
    type: 'select',
    enum: ['react', 'vue', 'angular']
  }
];

// Interactive prompting
const context = new PromptingContext();
const results = await promptForInputs(inputDefs, context);

// Non-interactive with answers
const context = new PromptingContext({
  noPrompt: true,
  answers: { name: 'John Doe', framework: 'react' }
});
const results = await promptForInputs(inputDefs, context);
```

## Prompting Context Options

```javascript
const context = new PromptingContext({
  // Skip prompting and fail if required inputs are missing
  noPrompt: false,

  // Non-interactive mode for programmatic usage
  nonInteractive: false,

  // Default values to use instead of prompting
  defaults: { framework: 'react' },

  // Pre-answered values (for testing or automation)
  answers: { projectName: 'test-project' }
});
```

## Pack Constructor Options

```javascript
// Pack-level configuration
const pack = new Pack('./my-pack', {
  noPrompt: true,        // Disable prompting globally for this pack
  nonInteractive: false  // Set non-interactive mode
});
```

## CLI Integration

The prompting system integrates seamlessly with GitVan CLI commands:

```bash
# Interactive mode (default)
gitvan pack apply my-pack

# Non-interactive mode with inputs
gitvan pack apply my-pack --input projectName=my-project --input framework=react

# Non-interactive mode with no-prompt flag
gitvan pack apply my-pack --no-prompt --defaults projectName=default-project

# Using environment variables for sensitive inputs
API_KEY=secret gitvan pack apply my-pack --input apiKey=$API_KEY
```

## Type Conversion

The system automatically handles type conversion:

- **Boolean**: `"true"`, `"yes"`, `"1"` → `true`; `"false"`, `"no"`, `"0"` → `false`
- **Number**: String numbers converted to actual numbers with validation
- **Multiselect**: Comma-separated strings split into arrays
- **Path**: Relative paths resolved to absolute paths

## Validation

### Built-in Validation
- **Required fields**: Automatically validated
- **Type checking**: Ensures correct data types
- **Range validation**: Min/max for numbers
- **Length validation**: Min/max length for strings
- **Enum validation**: Ensures values are in allowed list

### Custom Validation
```json
{
  "key": "email",
  "type": "text",
  "pattern": "^[^@]+@[^@]+\\.[^@]+$",
  "patternMessage": "Must be a valid email address"
}
```

## Error Handling

The system provides clear error messages:

```javascript
try {
  const resolved = await pack.resolveInputs({}, { noPrompt: true });
} catch (error) {
  // "Required input 'projectName' is missing and prompting is disabled."
  // "Invalid enum value: svelte. Must be one of: react, vue, angular"
  // "Input 'port' must be at least 1000"
  console.error(error.message);
}
```

## Testing

### Unit Tests
```bash
pnpm test tests/prompts.test.mjs
```

### Integration Tests
```bash
pnpm test tests/pack-prompts.test.mjs
```

### Manual Testing
```bash
# Interactive demo
node tests/manual-prompt-demo.mjs interactive

# Non-interactive demo
node tests/manual-prompt-demo.mjs non-interactive

# Mixed mode demo
node tests/manual-prompt-demo.mjs mixed
```

## Best Practices

1. **Always provide defaults** for non-critical inputs
2. **Use clear descriptions** that explain what the input is for
3. **Validate input patterns** with helpful error messages
4. **Group related inputs** using similar naming conventions
5. **Test both interactive and non-interactive modes**
6. **Handle optional inputs gracefully**
7. **Use appropriate input types** for better UX

## Security Considerations

- **Password inputs**: Automatically masked in terminal
- **Sensitive data**: Use environment variables or secure prompting
- **Input validation**: Always validate against patterns and ranges
- **No logging**: Sensitive inputs are not logged by default

## Performance

- **Batch prompting**: Multiple inputs shown together for better UX
- **Lazy loading**: Prompts package only loaded when needed
- **Fast validation**: Type conversion and validation optimized
- **Memory efficient**: Large input sets handled efficiently

## Future Enhancements

- **Conditional inputs**: Show/hide inputs based on other values
- **Input dependencies**: Validate inputs based on relationships
- **Custom validators**: Plugin system for custom validation functions
- **Rich prompts**: Support for more complex UI elements
- **Template integration**: Direct integration with template variables