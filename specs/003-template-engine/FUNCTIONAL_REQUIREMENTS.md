# Template Engine - Functional Requirements

## Core Capabilities

### Template Execution Type
- Support `exec: 'tmpl'` as execution specification
- Accept template path (relative to repo root or absolute)
- Merge user data with automatic Git context injection
- Support optional output file path for file generation
- Provide string return for in-memory rendering

### Nunjucks Environment Configuration
- FileSystemLoader with repository root as base path
- Additional search paths for includes and extends
- Configurable autoescape (default: false for code generation)
- Deterministic execution with `throwOnUndefined: true`
- Template compilation caching with `noCache: true` for development

### Deterministic Helper Functions
- `json` filter for consistent JSON serialization
- `slug` filter for URL-safe string transformation
- `upper` global function for string case transformation
- ISO timestamp injection through `nowISO` variable
- Git context injection through `git` variable

### File Output Operations
- Automatic directory creation for output paths
- Atomic file writes to prevent partial content
- Relative path resolution from repository root
- Absolute path support for system-wide output
- Return metadata including file path and byte count

## Template Context Structure

### Automatic Context Injection
```javascript
{
  git: {                    // Full Git context
    root: string,           // Repository root
    worktreeRoot: string,   // Worktree root (if different)
    head: string,           // Current HEAD commit
    branch: string,         // Current branch
    run: function,          // Git command execution
    // ... other Git operations
  },
  nowISO: string,           // ISO timestamp
  ...userData               // User-provided template data
}
```

### User Data Processing
- Support static data objects
- Support function data providers with Git context parameter
- Automatic function evaluation with `{ git }` parameter
- Merge user data with automatic context (user data wins)

## Template Features Support

### Standard Nunjucks Features
- Variable interpolation with `{{ variable }}`
- Control structures (if/else, for loops)
- Template inheritance with extends and blocks
- Include statements for partial templates
- Macro definitions and calls
- Filter application and chaining

### GitVan-Specific Features
- Git context always available as `git` variable
- Deterministic timestamp as `nowISO` variable
- Custom filters for common transformations
- Search path configuration for modular templates

## Interface Requirements

### Execution Specification
```javascript
{
  exec: 'tmpl',
  template: string,         // Template file path
  data?: object | function, // Template data
  out?: string,            // Optional output file
  autoescape?: boolean,    // HTML escaping (default: false)
  paths?: string[]         // Additional search paths
}
```

### Composable Interface
```javascript
useTemplate(options?: {
  autoescape?: boolean,
  paths?: string[]
}) => {
  render: (template, data) => string,
  renderToFile: (template, out, data) => { path, bytes },
  env: NunjucksEnvironment
}
```

### Result Format
```javascript
// File output result
{
  ok: true,
  artifact: string,        // Output file path
  meta: { bytes: number }  // File size metadata
}

// String output result
{
  ok: true,
  stdout: string,          // Rendered content
  meta: { length: number } // Content length
}
```

## Error Handling Requirements

### Template Compilation Errors
- Report template syntax errors with line numbers
- Include template file path in error messages
- Validate template file existence before compilation
- Handle template dependency resolution failures

### Runtime Rendering Errors
- Report undefined variable access with context
- Handle filter and function execution errors
- Provide meaningful error messages for data issues
- Include template context in error reporting

### File System Errors
- Handle missing template files gracefully
- Report directory creation failures
- Handle file write permission errors
- Validate output path accessibility

## Performance Requirements

### Rendering Performance
- Simple template rendering: < 1ms per template
- Complex templates (100+ variables): < 10ms per template
- Large dataset rendering (1000+ items): < 100ms per template
- Template compilation: < 10ms per unique template

### Memory Management
- Template environment: < 5MB base memory usage
- Compiled template cache: < 1MB per 100 templates
- Rendering context: < 100KB per execution
- Output buffering: Memory efficient for large outputs

## Integration Requirements

### Git Context Integration
- Access current repository state
- Support worktree-aware operations
- Include commit history access
- Provide branch and tag information

### File System Integration
- Cross-platform path handling
- Recursive directory creation
- Atomic file write operations
- Proper file permission handling

### Composables Integration
- Work within unctx context system
- Access Git operations through useGit()
- Integrate with execution engine
- Support nested composable calls