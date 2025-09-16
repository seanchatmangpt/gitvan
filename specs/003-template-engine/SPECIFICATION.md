# Nunjucks Template Engine Integration

## Intent

Integrate Nunjucks as a first-class execution type and composable within GitVan, providing deterministic template rendering with automatic Git context injection. The template engine should enable code generation, documentation creation, and dynamic content rendering within the Git automation workflow.

## User Stories

**As a documentation maintainer**, I want to generate changelogs from Git history using templates so that release notes are always current and consistent.

**As a code generator**, I want to render source code templates with Git context so that generated files include proper metadata and version information.

**As a workflow developer**, I want deterministic template helpers that produce consistent output so that Git diffs are meaningful and predictable.

**As a template author**, I want access to Git context (commits, branches, tags) within templates so that I can create dynamic, repository-aware content.

## Acceptance Criteria

- [ ] Nunjucks integrated as `exec: 'tmpl'` execution type
- [ ] `useTemplate()` composable for direct template usage
- [ ] Deterministic helper functions and filters
- [ ] Automatic Git context injection (`git`, `nowISO`)
- [ ] File output with automatic directory creation
- [ ] Template include/extend support with custom search paths
- [ ] Configurable autoescape for HTML safety
- [ ] Template compilation caching for performance
- [ ] Error handling with template line number reporting

## Out of Scope

- Real-time template watching and hot reloading
- Complex template inheritance beyond Nunjucks standard features
- Template-based routing or web server functionality
- Binary asset processing or image manipulation
- Database integration beyond Git operations

## Dependencies

- Nunjucks template engine (^3.2.4)
- Git repository context for template data
- File system access for template files and output
- Path utilities for cross-platform compatibility

## Success Metrics

- Template rendering speed: > 1000 simple templates/second
- Memory usage: < 10MB for 100 compiled templates
- Git context injection: < 1ms overhead per render
- Template compilation: < 10ms for typical templates