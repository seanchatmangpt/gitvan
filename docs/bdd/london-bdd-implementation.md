# GitVan London BDD Implementation

## Overview

This document describes the implementation of London BDD (Behavior-Driven Development) style testing for GitVan. London BDD focuses on **outside-in development** and **behavior specification** using domain language.

## London BDD Principles

### 1. Outside-In Development
- Start with acceptance tests (outside)
- Work inward to implementation details
- Focus on user behavior and business value

### 2. Behavior Specification
- Use Given-When-Then scenarios
- Write tests in domain language
- Focus on what the system does, not how

### 3. Test-Driven Development
- Write tests before implementation
- Use tests to drive design decisions
- Ensure tests are executable specifications

## BDD Structure

```
tests/bdd/
├── features/                    # Gherkin feature files
│   ├── cli-commands.feature
│   ├── job-management.feature
│   ├── template-system.feature
│   ├── graph-persistence.feature
│   └── ai-job-generation.feature
├── step-definitions/            # Step definition implementations
│   ├── gitvan-steps.mjs
│   └── ai-job-generation-steps.mjs
├── support/                     # Test setup and utilities
│   └── setup.mjs
├── reports/                     # Test reports (generated)
└── runner.mjs                  # BDD test runner
```

## Feature Files

Feature files use Gherkin syntax to describe behavior:

```gherkin
Feature: GitVan CLI Commands
  As a developer
  I want to use GitVan CLI commands
  So that I can automate my development workflow

  Scenario: Initialize GitVan project
    Given I have a GitVan project
    When I initialize GitVan
    Then the command should succeed
    And GitVan should be properly configured
```

## Step Definitions

Step definitions implement the behavior described in feature files:

```javascript
Given('I have a GitVan project', async function () {
  const projectPath = await bddUtils.createTempRepo('gitvan-project');
  bddUtils.setTestData('projectPath', projectPath);
  console.log('✅ GitVan project created');
});

When('I initialize GitVan', async function () {
  const result = await bddUtils.executeGitVanCommand('init');
  bddUtils.setTestData('lastCommandResult', result);
  console.log('🔄 GitVan initialized');
});

Then('the command should succeed', async function () {
  const result = bddUtils.getTestData('lastCommandResult');
  expect(result.success).toBe(true);
  expect(result.code).toBe(0);
  console.log('✅ Command succeeded');
});
```

## Running BDD Tests

### Using Vitest
```bash
# Run all BDD tests
pnpm test:bdd

# Run BDD tests in watch mode
pnpm test:bdd:watch

# Run with coverage
pnpm test:bdd --coverage
```

### Using Custom Runner
```bash
# Run with custom BDD runner
pnpm test:bdd:runner

# Run specific features
pnpm test:bdd:runner --features tests/bdd/features/cli-commands.feature
```

## London BDD Examples

### 1. CLI Command Testing
```gherkin
Feature: GitVan CLI Commands
  As a developer
  I want to use GitVan CLI commands
  So that I can automate my development workflow

  Scenario: Initialize GitVan project
    Given I have a GitVan project
    When I initialize GitVan
    Then the command should succeed
    And GitVan should be properly configured
```

### 2. AI Job Generation
```gherkin
Feature: GitVan AI-Powered Job Generation
  As a developer
  I want to generate GitVan jobs using AI
  So that I can quickly create automation without writing code manually

  Scenario: Generate a backup job using AI
    Given I want to create a backup job
    When I ask AI to generate a backup job
    Then the AI should create a working backup job
    And the job should be executable
    And the job should follow GitVan conventions
```

### 3. Graph Persistence
```gherkin
Feature: GitVan Graph Persistence
  As a developer
  I want to persist and manage RDF graphs
  So that I can store and query structured data

  Scenario: Initialize default graph
    When I run the GitVan command "graph init-default"
    Then the command should succeed
    And the file "graph/default.ttl" should exist
```

## Test Utilities

The BDD framework provides utilities for common testing operations:

```javascript
// Create temporary repositories
const repoPath = await bddUtils.createTempRepo('test-repo');

// Execute GitVan commands
const result = await bddUtils.executeGitVanCommand('init');

// Assert file operations
const exists = await bddUtils.assertFileExists('file.txt');
const contains = await bddUtils.assertFileContains('file.txt', 'content');

// Manage test data
bddUtils.setTestData('key', 'value');
const value = bddUtils.getTestData('key');
```

## Configuration

BDD tests use a separate Vitest configuration:

```javascript
// vitest.bdd.config.mjs
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'tests/bdd/**/*.feature',
      'tests/bdd/**/*.test.mjs'
    ],
    setupFiles: [
      'tests/bdd/support/setup.mjs'
    ]
  }
});
```

## Best Practices

### 1. Use Domain Language
- Write scenarios in business language
- Avoid technical implementation details
- Focus on user behavior

### 2. Keep Scenarios Focused
- One scenario per behavior
- Clear Given-When-Then structure
- Avoid complex scenarios

### 3. Reusable Step Definitions
- Create reusable step definitions
- Use parameters for flexibility
- Share common setup steps

### 4. Test Data Management
- Use test data utilities
- Clean up after tests
- Isolate test environments

## Integration with Existing Tests

BDD tests complement existing unit and integration tests:

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **BDD Tests**: Test complete user workflows and behaviors

## Benefits of London BDD

1. **Clear Requirements**: Scenarios serve as executable specifications
2. **User Focus**: Tests focus on user behavior, not implementation
3. **Documentation**: Feature files document system behavior
4. **Collaboration**: Business stakeholders can understand and contribute
5. **Quality**: Outside-in approach ensures user needs are met

## Future Enhancements

1. **Cucumber Integration**: Full Cucumber.js integration
2. **Report Generation**: HTML and JSON test reports
3. **Parallel Execution**: Run scenarios in parallel
4. **Data Tables**: Support for Gherkin data tables
5. **Tags**: Organize scenarios with tags
6. **Hooks**: Before/after scenario hooks
7. **Parameter Types**: Custom parameter types
8. **World**: Shared state management

## Conclusion

The London BDD implementation for GitVan provides a powerful framework for testing user behavior and ensuring the system meets business requirements. By focusing on behavior specification and domain language, BDD tests serve as both executable specifications and living documentation.
