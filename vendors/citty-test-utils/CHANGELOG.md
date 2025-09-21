# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.4] - 2024-01-XX

### Added
- **Scenarios Pack**: Pre-built testing patterns for common CLI scenarios
- 13 ready-to-use scenario templates with simple API
- Support for both local and cleanroom environments in scenarios
- Comprehensive scenarios including:
  - Basic commands (help, version, invalid command)
  - Project workflows (init, config get/set)
  - Robustness testing (idempotent, concurrent)
  - Output validation (JSON, file generation)
  - Error testing (error cases, interactive input)
- TypeScript definitions for all scenario methods
- Updated package.json to include scenarios.js in files array
- Generic scenarios designed to work with any CLI application

### Scenarios API
- `scenarios.help(env?)` - Test help command output
- `scenarios.version(env?)` - Test version command output  
- `scenarios.invalidCommand(cmd?, env?)` - Test invalid command handling
- `scenarios.initProject(name, env?)` - Test project initialization
- `scenarios.configGet(key, env?)` - Test configuration retrieval
- `scenarios.configSet(key, value, env?)` - Test configuration setting
- `scenarios.subcommand(cmd, args?, env?)` - Test subcommand execution
- `scenarios.jsonOutput(args, env?)` - Test JSON output parsing
- `scenarios.fileGenerated(args, expectPath, env?)` - Test file generation
- `scenarios.idempotent(args, env?)` - Test idempotent operations
- `scenarios.concurrent(runs[], env?)` - Test concurrent execution
- `scenarios.interactive(script, env?)` - Test interactive input
- `scenarios.errorCase(args, msgOrRe, env?)` - Test error conditions

### Documentation
- Updated README with comprehensive scenarios pack documentation
- Added usage examples for all scenario types
- Updated feature list to highlight scenarios pack

## [0.2.3] - 2024-01-XX

### Fixed
- Updated repository URLs to point to correct GitHub repository (seanchatmangpt/gitvan)
- Fixed all documentation links to use correct repository URLs
- Corrected package.json repository, bugs, and homepage URLs
- Updated README links to point to correct GitHub repository

### Repository Changes
- Repository URL: `https://github.com/seanchatmangpt/gitvan.git`
- Issues URL: `https://github.com/seanchatmangpt/gitvan/issues`
- Homepage URL: `https://github.com/seanchatmangpt/gitvan#readme`

## [0.2.2] - 2024-01-XX

### Added
- Comprehensive documentation directory with complete guides
- API Reference with detailed function documentation and examples
- Cookbooks with ready-to-use testing patterns and recipes
- Getting Started guide with step-by-step installation and first test
- Advanced Examples showcasing enterprise patterns and custom frameworks
- Troubleshooting guide with common issues and solutions
- Migration guide for transitioning from other testing approaches
- Best Practices guide with recommended patterns and anti-patterns
- Main documentation index with navigation and quick start examples
- Architecture overview with Mermaid diagrams
- Performance benchmarks and optimization tips
- CI/CD integration examples and Docker configurations
- Security testing patterns and input validation examples
- Data-driven testing with CSV integration
- Parallel execution patterns and load testing frameworks
- Custom assertion helpers and test utility extensions
- Complete TypeScript type definitions for all APIs
- Error handling patterns and retry logic examples
- Environment management and configuration patterns
- Code quality guidelines and documentation standards

### Enhanced
- Package includes comprehensive docs directory (154.7 kB total)
- Documentation covers all features with practical examples
- Multiple learning paths from beginner to advanced usage
- Cross-referenced documentation with internal links
- Real-world examples and enterprise-grade patterns
- Performance optimization and resource management guidance
- Security-focused testing approaches and validation patterns

### Documentation Structure
- `docs/README.md` - Main documentation index and navigation
- `docs/api/README.md` - Complete API reference with examples
- `docs/cookbooks/README.md` - Ready-to-use testing patterns
- `docs/examples/README.md` - Advanced examples and frameworks
- `docs/guides/getting-started.md` - Installation and first steps
- `docs/guides/troubleshooting.md` - Common issues and solutions
- `docs/guides/migration.md` - Migration from other approaches
- `docs/guides/best-practices.md` - Recommended patterns and guidelines

### Features Documented
- Local runner with automatic project detection
- Cleanroom runner with Docker container management
- Fluent assertions with 15+ assertion methods
- Scenario DSL with multi-step workflows
- Test utilities with retry logic and temporary files
- Pre-built scenarios for common use cases
- Cross-environment testing capabilities
- Performance benchmarking and load testing
- Security testing and input validation
- CI/CD integration and Docker configurations
- Custom test frameworks and enterprise patterns

## [Unreleased]

## [0.2.0] - 2024-01-XX

### Added
- Comprehensive project review and documentation update
- Enhanced README with complete API coverage
- Advanced scenario DSL with multi-step workflows
- Pre-built scenario templates for common use cases
- Cross-environment testing capabilities
- Custom action support in scenarios
- Environment-specific scenario builders (cleanroomScenario, localScenario)
- Advanced test utilities (waitFor, retry, temporary files)
- Comprehensive fluent assertions API with 15+ assertion methods
- Smart project root detection with validation
- Docker availability checking before cleanroom setup
- Detailed error messages with full context
- TypeScript definitions for all APIs and interfaces
- Comprehensive test suite with unit, integration, and BDD tests
- Vitest configuration with coverage thresholds

### Enhanced
- Local runner with timeout support and environment variables
- Cleanroom runner with better error handling and Docker validation
- Fluent assertions with more granular control and better error messages
- Scenario DSL with step-by-step execution and detailed logging
- Test utilities with retry logic and temporary file management

### Features
- `runLocalCitty()` - Execute GitVan CLI commands locally with auto-detection
- `setupCleanroom()` / `runCitty()` / `teardownCleanroom()` - Docker cleanroom testing
- `scenario()` / `cleanroomScenario()` / `localScenario()` - Scenario DSL builders
- `scenarios.*` - Pre-built scenario templates (help, version, invalidCommand, etc.)
- `testUtils.*` - Utility functions (waitFor, retry, createTempFile, cleanupTempFiles)
- `wrapExpectation()` - Comprehensive fluent assertion API
- Automatic GitVan project root detection with validation
- Safe JSON parsing with graceful fallback
- Cross-environment consistency testing
- Custom action support in scenarios

### Dependencies
- `testcontainers` ^10.0.0 for Docker container management
- Node.js >=18.0.0 required
- Vitest for comprehensive testing

### Documentation
- Complete README rewrite with comprehensive API coverage
- Advanced usage examples and patterns
- TypeScript definitions for IDE support
- MIT license included

## [0.1.1] - 2024-01-XX

### Added
- Updated README with npm installation instructions
- Improved package structure and documentation

## [0.1.0] - 2024-01-XX

### Added
- Initial release of citty-test-utils
- Local runner with automatic GitVan project root detection
- Cleanroom runner with Docker container support using testcontainers
- Fluent assertions API with chainable expectations
- TypeScript definitions for all APIs
- Comprehensive documentation and examples
- Support for JSON output parsing with fallback
- Error handling for invalid commands and parsing failures

### Features
- `runLocalCitty()` - Execute GitVan CLI commands locally
- `setupCleanroom()` - Initialize Docker cleanroom environment
- `runCitty()` - Execute commands in isolated Docker containers
- `wrapExpectation()` - Fluent assertion API with chaining
- Automatic project root detection for local execution
- Safe JSON parsing with graceful fallback
- Full TypeScript support with type definitions

### Dependencies
- `testcontainers` ^10.0.0 for Docker container management
- Node.js >=18.0.0 required

### Documentation
- Complete README with usage examples
- API reference with all available methods
- TypeScript definitions for IDE support
- MIT license included
