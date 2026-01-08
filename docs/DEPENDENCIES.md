# GitVan Dependencies Documentation

This document provides a comprehensive overview of all dependencies used in GitVan v4.0.0, their purpose, version requirements, and compatibility notes.

## Table of Contents

1. [Production Dependencies](#production-dependencies)
2. [Development Dependencies](#development-dependencies)
3. [Version Requirements](#version-requirements)
4. [Security Considerations](#security-considerations)
5. [Updating Dependencies](#updating-dependencies)
6. [Optional Dependencies](#optional-dependencies)

---

## Production Dependencies

These dependencies are required for GitVan to run in production environments.

### Core Scheduling & Job Management

#### bree (^9.0.0)
- **Purpose**: Modern job scheduler for Node.js with support for cron syntax, human-readable intervals, and worker threads
- **Why we use it**: GitVan's background job system relies on Bree for scheduling and executing jobs in isolated workers
- **Key features**:
  - Worker thread support for CPU-intensive tasks
  - Graceful shutdown handling
  - Job retry logic
  - Timeout management
- **Compatibility**: Requires Node.js 18+
- **Documentation**: https://github.com/breejs/bree

### Git Operations

#### isomorphic-git (^1.36.1)
- **Purpose**: Pure JavaScript implementation of Git
- **Why we use it**: Enables programmatic Git operations without requiring native Git binary
- **Key features**:
  - Read and write Git repositories
  - Commit, push, pull, merge operations
  - Branch and tag management
  - Git notes support (critical for GitVan's audit trail)
- **Compatibility**: Works in Node.js and browsers
- **Documentation**: https://isomorphic-git.org/

### CLI Framework

#### citty (^0.1.6)
- **Purpose**: Modern CLI framework with TypeScript support
- **Why we use it**: Powers GitVan's command-line interface
- **Key features**:
  - Subcommand support
  - Argument parsing
  - Auto-generated help text
  - TypeScript-first design
- **Compatibility**: ES Modules only
- **Documentation**: https://github.com/unjs/citty

### Configuration Management

#### c12 (^3.3.3)
- **Purpose**: Smart configuration loader with multiple source support
- **Why we use it**: Nitro-style configuration loading for `gitvan.config.js`
- **Key features**:
  - Multiple config file format support (.js, .mjs, .ts)
  - Environment-specific configs
  - Config extension/inheritance
  - Schema validation
- **Compatibility**: ES Modules, TypeScript support
- **Documentation**: https://github.com/unjs/c12

#### defu (^6.1.4)
- **Purpose**: Deep object merging utility
- **Why we use it**: Merging configuration objects with sensible defaults
- **Key features**:
  - Recursive merging
  - Array handling
  - Type preservation
- **Compatibility**: Universal (Node.js, browsers, edge)
- **Documentation**: https://github.com/unjs/defu

### Async Context Management

#### unctx (^2.5.0)
- **Purpose**: Async context preservation across async operations
- **Why we use it**: **CRITICAL** - Maintains context through `await` calls in composables
- **Key features**:
  - Async-safe context storage
  - Composable pattern support
  - Zero dependencies
- **Compatibility**: ES Modules
- **Documentation**: https://github.com/unjs/unctx
- **⚠️ IMPORTANT**: All GitVan composables MUST be used within `withGitVan()` wrapper to preserve context

### Utilities

#### pathe (^2.0.3)
- **Purpose**: Universal path utilities that work across platforms
- **Why we use it**: Cross-platform file path handling (Windows, macOS, Linux)
- **Key features**:
  - POSIX-style paths everywhere
  - Normalized path separators
  - Safe path joining
- **Compatibility**: Universal
- **Documentation**: https://github.com/unjs/pathe

#### consola (^3.4.2)
- **Purpose**: Elegant console logging with TypeScript support
- **Why we use it**: Structured logging throughout GitVan
- **Key features**:
  - Log levels (debug, info, warn, error, success)
  - Colored output
  - Tag support
  - Mock support for testing
- **Compatibility**: Universal
- **Documentation**: https://github.com/unjs/consola

### Extensibility

#### hookable (^6.0.1)
- **Purpose**: Hook system for extensibility
- **Why we use it**: GitVan's plugin and extension system
- **Key features**:
  - Before/after hooks
  - Serial/parallel execution
  - Hook context
  - Error handling
- **Compatibility**: ES Modules
- **Documentation**: https://github.com/unjs/hookable

---

## Development Dependencies

These dependencies are only needed during development and testing.

### Testing Framework

#### vitest (^4.0.16)
- **Purpose**: Blazing fast unit test framework powered by Vite
- **Why we use it**: Primary testing framework for GitVan
- **Key features**:
  - Native ESM support
  - TypeScript support
  - Watch mode
  - Snapshot testing
  - Coverage reporting
  - Compatible with Jest API
- **Compatibility**: Node.js 18+
- **Documentation**: https://vitest.dev/
- **Configuration**: See `vitest.config.mjs`, `vitest.bdd.config.mjs`

#### @vitest/ui (^4.0.16)
- **Purpose**: Web UI for Vitest test results
- **Why we use it**: Visual test runner and debugging interface
- **Usage**: `npm run test:ui`
- **Documentation**: https://vitest.dev/guide/ui.html

#### @vitest/coverage-v8 (^4.0.16)
- **Purpose**: Code coverage provider using V8 engine
- **Why we use it**: Generate test coverage reports (target: 80%+ coverage)
- **Key features**:
  - Branch coverage
  - Function coverage
  - Line coverage
  - Statement coverage
- **Usage**: `npm run test:coverage`
- **Documentation**: https://vitest.dev/guide/coverage.html

### Code Quality

#### eslint (^9.39.2)
- **Purpose**: JavaScript/TypeScript linter
- **Why we use it**: Enforce code quality standards and catch bugs
- **Key features**:
  - Pluggable rules
  - Auto-fix capability
  - Custom rule support
- **Configuration**: See `eslint.config.mjs`
- **Usage**: `npm run lint` or `npm run lint:fix`
- **Documentation**: https://eslint.org/

#### prettier (^3.7.4)
- **Purpose**: Opinionated code formatter
- **Why we use it**: Consistent code formatting across the project
- **Key features**:
  - Auto-formatting
  - Multiple language support
  - Editor integration
- **Configuration**: See `.prettierrc`
- **Usage**: `npm run format` or `npm run format:check`
- **Documentation**: https://prettier.io/

### Build System

#### unbuild (^3.6.1)
- **Purpose**: Unified JavaScript build system
- **Why we use it**: Bundle GitVan for distribution
- **Key features**:
  - TypeScript support
  - ESM and CommonJS output
  - Declaration file generation
  - Stub mode for development
- **Configuration**: See `build.config.ts`
- **Usage**: `npm run build`
- **Documentation**: https://github.com/unjs/unbuild

---

## Version Requirements

### Node.js

- **Minimum**: Node.js 18.0.0
- **Recommended**: Node.js 22.x (LTS)
- **Reason**: ES Modules support, modern JavaScript features, Worker Threads API

### npm

- **Minimum**: npm 9.0.0
- **Recommended**: npm 10.x
- **Reason**: Improved lockfile handling, security features

### Package Version Strategy

GitVan uses **caret ranges** (`^`) for dependencies:
- `^9.0.0` means `>=9.0.0 <10.0.0`
- Allows patch and minor updates
- Prevents breaking changes from major updates

### Compatibility Matrix

| Dependency | Node.js 18 | Node.js 20 | Node.js 22 |
|------------|------------|------------|------------|
| bree       | ✅         | ✅         | ✅         |
| isomorphic-git | ✅     | ✅         | ✅         |
| citty      | ✅         | ✅         | ✅         |
| vitest     | ✅         | ✅         | ✅         |
| All others | ✅         | ✅         | ✅         |

---

## Security Considerations

### Dependency Security

1. **Regular Audits**: Run `npm audit` regularly to check for vulnerabilities
2. **Audit Level**: GitVan is configured to fail on HIGH severity vulnerabilities (see `.npmrc`)
3. **Current Status**: ✅ 0 vulnerabilities (as of last check)

### Security Best Practices

1. **Package Lock**: Always commit `package-lock.json` for reproducible builds
2. **Exact Versions**: Consider using exact versions (`save-exact=true` in `.npmrc`) for critical dependencies
3. **Trusted Sources**: Only install packages from npm registry (configured in `.npmrc`)
4. **Review Updates**: Always review changelog before updating dependencies

### Running Security Audit

```bash
# Check for vulnerabilities
npm audit

# Automatically fix vulnerabilities (when safe)
npm audit fix

# Fix all vulnerabilities (may include breaking changes)
npm audit fix --force
```

---

## Updating Dependencies

### Check for Updates

```bash
# Check which packages are outdated
npm outdated

# Check all packages (including dev dependencies)
npm outdated --all
```

### Update Strategy

1. **Patch Updates** (1.0.x): Safe to update automatically
   ```bash
   npm update
   ```

2. **Minor Updates** (1.x.0): Review changelog, update cautiously
   ```bash
   npm update <package-name>
   ```

3. **Major Updates** (x.0.0): Requires testing and may need code changes
   ```bash
   npm install <package-name>@latest
   ```

### Update Workflow

1. Create a feature branch: `git checkout -b deps/update-<package>`
2. Update the dependency: `npm install <package>@<version>`
3. Run tests: `npm test`
4. Run build: `npm run build`
5. Check for breaking changes in package changelog
6. Update code if needed
7. Commit with message: `chore(deps): update <package> to v<version>`
8. Create PR for review

### Automated Dependency Updates

Consider using:
- **Dependabot** (GitHub): Automated PR creation for dependency updates
- **Renovate**: Advanced dependency update automation
- **npm-check-updates**: CLI tool for checking and updating dependencies

---

## Optional Dependencies

GitVan currently has **no optional dependencies**. All listed dependencies are required for proper functionality.

### Future Optional Dependencies

Potential optional dependencies being considered for future releases:

- **nunjucks**: Template engine (for template pack support)
- **unrdf**: RDF parsing and SPARQL queries (for semantic graph features)
- **ai**: Multi-provider AI support (for AI-powered features)

These will be added when the corresponding features are implemented in v4.0.0+.

---

## Troubleshooting

### Common Issues

#### Issue: `npm install` fails with peer dependency errors

**Solution**: Use `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

Or update `.npmrc`:
```
legacy-peer-deps=true
```

#### Issue: Package lock conflicts in Git

**Solution**: Delete lock file and regenerate:
```bash
rm package-lock.json
npm install
git add package-lock.json
```

#### Issue: Tests fail after dependency update

**Solution**:
1. Check package changelog for breaking changes
2. Review test output for specific errors
3. Update test mocks if needed
4. Consider rolling back the update if incompatible

#### Issue: `npm ci` fails in CI/CD

**Solution**:
1. Ensure `package-lock.json` is committed
2. Verify Node.js version matches requirements
3. Check for platform-specific issues (Windows vs Linux)
4. Clear npm cache: `npm cache clean --force`

---

## Development Environment Setup

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd gitvan

# Install all dependencies
npm install

# Verify installation
npm list --depth=0

# Run security audit
npm audit

# Run tests
npm test
```

### Clean Installation

```bash
# Remove existing dependencies
rm -rf node_modules package-lock.json

# Clean install from package.json
npm install

# Or use clean install from lock file
npm ci
```

---

## Dependency Update History

### v4.0.0 (2026-01-08)

**Added:**
- vitest@^4.0.16 (testing framework)
- @vitest/ui@^4.0.16 (test UI)
- @vitest/coverage-v8@^4.0.16 (coverage reporting)
- eslint@^9.39.2 (linting)
- prettier@^3.7.4 (formatting)
- unbuild@^3.6.1 (build system)
- pathe@^2.0.3 (path utilities)
- citty@^0.1.6 (CLI framework)
- unctx@^2.5.0 (async context)
- c12@^3.3.3 (config loading)
- hookable@^6.0.1 (extensibility)
- consola@^3.4.2 (logging)
- defu@^6.1.4 (config merging)

**Updated:**
- bree@^9.0.0 → ^9.2.7 (latest stable)

**Security:**
- 0 vulnerabilities found

---

## Contributing

When adding new dependencies:

1. **Justify the addition**: Explain why the dependency is needed
2. **Check bundle size**: Use `bundlephobia.com` to check impact
3. **Verify license**: Ensure compatible license (MIT, Apache 2.0, etc.)
4. **Update this document**: Add entry in appropriate section
5. **Run tests**: Ensure no breaking changes
6. **Document in PR**: Include dependency rationale in PR description

---

## Resources

- **npm documentation**: https://docs.npmjs.com/
- **package.json specification**: https://docs.npmjs.com/cli/v10/configuring-npm/package-json
- **Semantic Versioning**: https://semver.org/
- **Node.js LTS schedule**: https://nodejs.org/en/about/releases/

---

**Last Updated**: 2026-01-08
**GitVan Version**: v4.0.0
**Maintained By**: GitVan Development Team
