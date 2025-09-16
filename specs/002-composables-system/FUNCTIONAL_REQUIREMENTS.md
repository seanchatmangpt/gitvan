# Composables System - Functional Requirements

## Core Capabilities

### Context Management
- Provide `withGitVan(context, function)` for context injection
- Provide `useGitVan()` for context consumption within execution scope
- Ensure context isolation between concurrent executions
- Support nested context calls and composition patterns
- Maintain context stability throughout job execution lifecycle

### Git Operations Composable
- Provide `useGit()` returning comprehensive Git operation utilities
- Support all common Git commands through unified interface
- Enable Git note operations for metadata storage
- Support Git ref operations for locking and state management
- Provide worktree-aware operations and context

### Template Operations Composable
- Provide `useTemplate(options)` for Nunjucks template rendering
- Automatically inject Git context and timestamp data
- Support template compilation with custom search paths
- Enable both in-memory rendering and file output operations
- Provide deterministic helper functions and filters

### Execution Operations Composable
- Provide `useExec()` for programmatic job execution utilities
- Support all five execution types (cli, js, llm, job, tmpl)
- Enable execution composition within job implementations
- Provide consistent result handling and error propagation

## Interface Requirements

### useGitVan() Interface
```javascript
{
  root: string,           // Repository root path
  worktreeRoot: string,   // Worktree root (if different)
  head: string,           // Current HEAD commit SHA
  branch: string,         // Current branch name
  env: object,            // Environment variables
  now: function,          // Deterministic timestamp function
  worktree: {             // Worktree metadata
    id: string,
    branch: string
  }
}
```

### useGit() Interface
```javascript
{
  root: string,                    // Repository root
  head: () => string,              // Get HEAD commit SHA
  branch: () => string,            // Get current branch
  run: (args) => string,           // Execute git command
  note: (ref, msg, sha) => void,   // Add git note
  appendNote: (ref, msg, sha) => void, // Append to git note
  setRef: (ref, sha) => void,      // Set git reference
  delRef: (ref) => void,           // Delete git reference
  listRefs: (prefix) => string[]   // List matching references
}
```

### useTemplate() Interface
```javascript
{
  render: (template, data) => string,        // Render template to string
  renderToFile: (template, out, data) => object, // Render to file
  env: NunjucksEnvironment                   // Direct environment access
}
```

### useExec() Interface
```javascript
{
  cli: (cmd, args, env) => result,           // Execute shell command
  js: (module, export, input) => result,     // Execute JavaScript module
  tmpl: (spec) => result                     // Execute template rendering
}
```

## Data Management

### Context Lifecycle
- Context creation during daemon initialization
- Context injection at job execution start
- Context availability throughout job execution
- Context cleanup after job completion
- Context isolation between concurrent jobs

### Error Handling
- Clear error messages for missing context
- Validation of context completeness
- Graceful degradation for optional context fields
- Error propagation from underlying operations

## Performance Requirements

- Context lookup: < 0.1ms per composable call
- Git operations: < 50ms for common commands
- Template rendering: < 10ms for typical templates
- Context creation: < 5ms per execution context

## Constraints

### Technical Constraints
- Must work with unctx context management
- Requires valid Git repository context
- Node.js 18+ runtime environment
- Single-threaded execution model

### Design Constraints
- No global state modification
- Pure function composables where possible
- Consistent return value formats
- Predictable error handling patterns

## Dependencies

### Internal Dependencies
- Core execution engine for useExec()
- Git integration layer for useGit()
- Template engine for useTemplate()
- Context management utilities

### External Dependencies
- `unctx` for context management framework
- `nunjucks` for template rendering engine
- Node.js built-in modules for system operations