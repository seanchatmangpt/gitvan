# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
