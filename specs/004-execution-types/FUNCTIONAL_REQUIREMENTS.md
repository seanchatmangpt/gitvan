# Execution Types - Functional Requirements

## Execution Type Specifications

### CLI Execution (`exec: 'cli'`)
```javascript
{
  exec: 'cli',
  cmd: string,                    // Command to execute
  args?: string[],               // Command arguments
  env?: Record<string, string>,  // Environment variables
  timeoutMs?: number             // Execution timeout
}
```

**Capabilities**:
- Execute shell commands with argument array
- Merge environment variables with system environment
- Capture stdout and stderr streams
- Handle exit codes and error conditions
- Support configurable execution timeout
- Provide working directory context (repository root)

### JavaScript Execution (`exec: 'js'`)
```javascript
{
  exec: 'js',
  module: string,     // Module path (relative or absolute)
  export?: string,    // Export name (default: 'default')
  input?: Json,       // Input parameters
  timeoutMs?: number  // Execution timeout
}
```

**Capabilities**:
- Dynamic ES module imports with file:// protocol
- Named and default export resolution
- Input parameter passing to module functions
- Async function execution support
- Module path resolution (relative to repo root)
- Return value serialization and capture

### LLM Execution (`exec: 'llm'`)
```javascript
{
  exec: 'llm',
  model: string,                      // Model identifier
  prompt?: string,                   // Prompt template
  input?: Json,                      // Input data
  options?: Record<string, Json>,    // Model-specific options
  timeoutMs?: number                 // Execution timeout
}
```

**Capabilities**:
- Multiple LLM provider support
- Prompt template processing with input data
- Model-specific option passing
- Response processing and normalization
- API key and authentication handling
- Configurable timeout and retry logic

### Job Execution (`exec: 'job'`)
```javascript
{
  exec: 'job',
  name: string  // Job name to execute
}
```

**Capabilities**:
- Recursive job execution within current context
- Job discovery and resolution by name
- Context inheritance and isolation
- Circular dependency detection
- Job composition and workflow building
- Result aggregation and passing

### Template Execution (`exec: 'tmpl'`)
```javascript
{
  exec: 'tmpl',
  template: string,      // Template file path
  data?: Json,          // Template data
  out?: string,         // Output file path
  autoescape?: boolean, // HTML escaping
  paths?: string[]      // Additional search paths
}
```

**Capabilities**:
- Nunjucks template rendering with Git context
- File output with directory creation
- String output for in-memory processing
- Custom search paths for includes/extends
- Deterministic helper functions and filters
- Template compilation caching

## Unified Result Format

All execution types return consistent result structure:

```javascript
{
  ok: boolean,           // Success indicator
  stdout?: string,       // Standard output content
  stderr?: string,       // Standard error content
  artifact?: string,     // Output file path (if applicable)
  meta?: object,        // Execution metadata
  code?: number,        // Exit code (CLI only)
  error?: Error         // Error object (if failed)
}
```

## Execution Context Requirements

### Environment Variables
- System environment variables automatically available
- Job-specific environment variables merged
- Repository-specific variables (GIT_DIR, etc.)
- Execution type specific variables

### Working Directory
- All executions run from repository root
- Worktree-aware directory context
- Relative path resolution from repository root
- Absolute path support for system operations

### Timeout Management
- Per-execution timeout configuration
- Default timeout values per execution type
- Graceful process termination on timeout
- Timeout error reporting with execution time

## Performance Requirements

### Execution Overhead
- Context setup: < 10ms per execution
- Type dispatch: < 1ms per execution
- Result processing: < 5ms per execution
- Total overhead: < 50ms per execution

### Memory Usage
- Base execution context: < 5MB
- CLI execution: < 10MB additional
- JavaScript execution: < 20MB additional
- Template execution: < 15MB additional
- LLM execution: < 30MB additional

### Concurrency Support
- Support 10+ concurrent executions
- Proper resource cleanup after execution
- Memory isolation between executions
- No shared state between concurrent executions

## Error Handling Requirements

### Error Categories
- **Validation Errors**: Invalid execution specifications
- **Runtime Errors**: Execution failures (exit codes, exceptions)
- **Timeout Errors**: Execution exceeding time limits
- **Resource Errors**: File system or network issues
- **Context Errors**: Missing or invalid execution context

### Error Reporting
- Clear error messages with context information
- Execution type and specification in error details
- Stack traces for JavaScript execution errors
- Command output for CLI execution errors
- Timeout information for timeout errors

### Error Recovery
- Graceful handling of non-zero exit codes
- Proper cleanup of resources on failures
- Error propagation to job execution system
- Logging of execution failures for debugging

## Integration Requirements

### Git Context Integration
- Repository root path available to all executions
- Git command access for internal operations
- Worktree context for path resolution
- Git environment variables properly set

### Composables Integration
- Execution types available through useExec()
- Context injection for execution environment
- Integration with Git and template composables
- Support for nested execution calls

### Daemon Integration
- Execution through daemon process
- Resource management and cleanup
- Execution queuing and rate limiting
- Process isolation and security