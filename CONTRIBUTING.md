# Contributing to GitVan

Thank you for your interest in contributing to GitVan! This document provides guidelines for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Style](#code-style)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Reporting Bugs](#reporting-bugs)
8. [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

Be respectful, inclusive, and professional in all interactions. We are committed to providing a welcoming and harassment-free environment for everyone.

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or pnpm package manager
- Git

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/seanchatmangpt/gitvan.git
cd gitvan

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Project Structure

```
gitvan/
├── src/                # Source code (280+ .mjs files)
│   ├── cli/           # CLI commands
│   ├── composables/   # Reusable composables (use* functions)
│   ├── workflow/      # Workflow engine
│   ├── git-native/    # Git-native I/O layer
│   ├── ai/            # AI integration
│   └── ...
├── tests/             # Test files (310+ test files)
├── docs/              # Documentation
├── packs/             # Built-in packs
├── templates/         # Template files
└── dist/              # Built distribution (generated)
```

## Development Workflow

### Branching Strategy

- `main` - Stable release branch
- `develop` - Development branch (if applicable)
- `feature/xxx` - Feature branches
- `fix/xxx` - Bug fix branches

### Making Changes

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes following our [code style](#code-style)

3. Write tests for your changes (TDD approach preferred)

4. Run tests to ensure everything passes:
   ```bash
   npm test
   npm run test:coverage  # Check coverage
   ```

5. Build to verify no errors:
   ```bash
   npm run build
   ```

6. Commit your changes with a clear message:
   ```bash
   git commit -m "feat: add new workflow step handler"
   ```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build process or tooling changes

Examples:
```
feat: add SPARQL query caching
fix: resolve context loss in async operations
docs: update installation guide
test: add composable test coverage
```

## Code Style

### General Guidelines

- **ES Modules only** - All code uses ES modules (`.mjs` files)
- **No CommonJS** - Don't use `require()` or `module.exports`
- **File extensions** - Always use `.mjs` for module files
- **Composables** - Use `use` prefix for composables (e.g., `useGit`)
- **Classes** - Use PascalCase (e.g., `WorkflowEngine`)
- **Functions** - Use camelCase (e.g., `parseWorkflow`)
- **Constants** - Use UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

### File Organization

- Keep files under 500 lines
- One class/composable per file
- Group related functionality in directories
- Use descriptive file names

### Async Patterns

**Critical**: Always wrap async operations with `withGitVan()`:

```javascript
// CORRECT
import { withGitVan, useGit } from "gitvan";

await withGitVan(context, async () => {
  const git = useGit();
  await git.status();
});

// WRONG - Context will be lost!
const git = useGit();
await someAsyncOperation();
await git.status(); // Fails!
```

### Code Quality

- **No hardcoded secrets** - Use environment variables
- **Deterministic operations** - No random values or timestamps unless needed
- **Error handling** - Handle errors appropriately
- **Avoid over-engineering** - Keep it simple
- **No premature optimization** - Focus on readability first

## Testing

### Test Requirements

- **Coverage**: Minimum 80% (branches, functions, lines, statements)
- **TDD**: Write tests before implementation
- **All features**: Must have tests

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test tests/composables/git.test.mjs

# Watch mode
npm run test:watch

# BDD tests
npm run test:bdd
```

### Writing Tests

```javascript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { withGitVan } from "gitvan";

describe("useGit composable", () => {
  let context;

  beforeEach(async () => {
    context = createTestContext();
  });

  afterEach(async () => {
    // Cleanup
  });

  it("should perform git status", async () => {
    await withGitVan(context, async () => {
      const git = useGit();
      const status = await git.status();

      expect(status).toBeDefined();
      expect(status.branch).toBe("main");
    });
  });
});
```

## Pull Request Process

1. **Update documentation** if you changed APIs or added features
2. **Add tests** for new functionality (80% coverage minimum)
3. **Update CHANGELOG.md** with your changes
4. **Ensure all tests pass**: `npm test`
5. **Ensure build succeeds**: `npm run build`
6. **Create pull request** with clear description:
   - What changes you made
   - Why you made them
   - How to test them
7. **Address review feedback** promptly
8. **Wait for approval** from maintainers

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Coverage meets 80% threshold

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Build succeeds
```

## Reporting Bugs

### Before Submitting

1. Check existing issues to avoid duplicates
2. Verify it's a bug (not a feature request)
3. Test with latest version
4. Collect relevant information

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- GitVan version: 3.1.0
- Node.js version: 18.x
- OS: Linux/macOS/Windows
- Other relevant info

## Additional Context
Any other relevant information
```

## Suggesting Enhancements

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches you considered

## Additional Context
Any other relevant information
```

## Development Resources

- **Documentation**: [docs/](docs/)
- **Architecture**: [docs/80-20-ARCHITECTURE.md](docs/80-20-ARCHITECTURE.md)
- **Developer Guide**: [CLAUDE.md](CLAUDE.md)
- **Risk Analysis**: [docs/FMEA-RISK-ANALYSIS.md](docs/FMEA-RISK-ANALYSIS.md)

## Getting Help

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions, share ideas
- **Documentation**: Check docs/ directory
- **SUPPORT.md**: See support options

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for their contributions
- GitHub Contributors page
- Release notes

Thank you for contributing to GitVan!
