# Five-Type Execution System

## Intent

Implement a unified execution engine supporting five distinct execution types (cli, js, llm, job, tmpl) with consistent interfaces, error handling, and result formatting. The system should provide flexibility for different automation needs while maintaining predictable behavior and performance characteristics.

## User Stories

**As a shell scripter**, I want to execute CLI commands with proper environment and timeout control so that I can integrate existing tools into GitVan workflows.

**As a JavaScript developer**, I want to execute ES modules with dynamic imports and parameter passing so that I can write complex automation logic in modern JavaScript.

**As an AI workflow creator**, I want to execute LLM prompts with configurable models and options so that I can integrate AI-powered content generation into my automation.

**As a job composer**, I want to execute other jobs recursively so that I can build complex workflows from simpler building blocks.

**As a template author**, I want to execute Nunjucks templates with Git context so that I can generate dynamic content and documentation.

## Acceptance Criteria

- [ ] Five execution types supported: cli, js, llm, job, tmpl
- [ ] Consistent result format across all execution types
- [ ] Timeout handling for all execution types
- [ ] Environment variable injection and control
- [ ] Error handling with meaningful error messages
- [ ] Performance monitoring and execution metadata
- [ ] Type-safe execution specifications
- [ ] Execution result artifacts and metadata tracking

## Out of Scope

- Custom execution type plugins or extensions
- Interactive execution with user input
- Streaming execution results
- Distributed execution across multiple machines
- Execution scheduling beyond simple timeouts

## Dependencies

- Node.js runtime for JavaScript execution
- System shell for CLI command execution
- Nunjucks template engine for template execution
- LLM provider integrations (configurable)
- Git repository context for all execution types

## Success Metrics

- Execution latency: < 50ms overhead per execution
- Memory usage: < 20MB per concurrent execution
- Error rate: < 1% for well-formed specifications
- Timeout accuracy: ±100ms of specified timeout