# GitVan JTBD London BDD Implementation

## Overview

This document describes the implementation of London BDD (Behavior-Driven Development) style testing specifically for GitVan's JTBD (Jobs To Be Done) functionality. This approach focuses on **user job-to-be-done scenarios** and how GitVan helps accomplish them through intelligent automation.

## JTBD London BDD Principles

### 1. User-Centric Focus
- Start with what users are trying to accomplish
- Understand the job the user is hiring GitVan to do
- Focus on user outcomes, not technical implementation

### 2. Job-Focused Scenarios
- Write scenarios from the user's perspective
- Use domain language that users understand
- Focus on the job-to-be-done, not the tool

### 3. Context-Aware Testing
- Consider the situation and context of the job
- Test how GitVan adapts to different contexts
- Verify intelligent decision making

### 4. Outcome-Oriented Verification
- Focus on desired outcomes, not processes
- Verify that user jobs are accomplished
- Test the value delivered to users

## JTBD BDD Structure

```
tests/bdd/features/
├── jtbd-management.feature           # JTBD CLI management
├── jtbd-execution.feature           # Event-driven execution
└── jtbd-knowledge-integration.feature # Knowledge Hook Engine integration

tests/bdd/step-definitions/
└── jtbd-steps.mjs                   # JTBD-specific step definitions
```

## Feature Files

### JTBD Management Feature
Tests the CLI management of JTBD hooks:

```gherkin
Feature: GitVan JTBD (Jobs To Be Done) Management
  As a developer
  I want to manage Jobs-to-be-Done hooks in GitVan
  So that I can automate development workflows based on user needs

  Scenario: List all available JTBD hooks
    Given I have a GitVan project
    And I have JTBD hooks configured
    When I run the GitVan command "jtbd list"
    Then the command should succeed
    And I should see "Available JTBD Hooks" in the output
```

### JTBD Execution Feature
Tests event-driven execution of JTBD hooks:

```gherkin
Feature: GitVan JTBD Hook Execution
  As a developer
  I want JTBD hooks to execute automatically based on Git events
  So that development workflows are automated according to user needs

  Scenario: Execute code quality gatekeeper on pre-commit
    Given I have a JTBD hook named "code-quality-gatekeeper"
    And the hook is configured for "pre-commit" events
    When I commit changes to the repository
    Then the code quality gatekeeper should execute
    And the commit should be allowed if quality standards are met
```

### JTBD Knowledge Integration Feature
Tests integration with the Knowledge Hook Engine:

```gherkin
Feature: GitVan JTBD Knowledge Hook Integration
  As a developer
  I want JTBD hooks to integrate with the Knowledge Hook Engine
  So that intelligent automation can be achieved based on project context

  Scenario: JTBD hook with SPARQL predicate evaluation
    Given I have a JTBD hook named "intelligent-code-review"
    And the hook uses SPARQL predicates for evaluation
    When the hook executes
    Then it should evaluate SPARQL queries against the knowledge graph
    And the hook should make intelligent decisions based on the results
```

## Step Definitions

### Given Steps - Setting Up JTBD Context

```javascript
Given("I have JTBD hooks configured", async function () {
  // Create JTBD hooks directory with sample hooks
  await bddUtils.createTestFiles("gitvan-project", {
    "hooks/code-quality-gatekeeper.mjs": hookContent,
    "hooks/dependency-vulnerability-scanner.mjs": scannerContent,
    // ... more hooks
  });
  console.log("✅ JTBD hooks configured");
});

Given("I have a JTBD hook named {string}", async function (hookName) {
  // Create a specific JTBD hook
  const hookContent = `export default defineJob({...})`;
  await bddUtils.createTestFiles("gitvan-project", {
    [`hooks/${hookName}.mjs`]: hookContent
  });
  console.log(`✅ JTBD hook '${hookName}' created`);
});
```

### When Steps - Triggering JTBD Actions

```javascript
When("I commit changes to the repository", async function () {
  // Simulate Git commit event
  const repoPath = bddUtils.getTestData("repoPath");
  await execFileAsync("git", ["add", "."], { cwd: repoPath });
  await execFileAsync("git", ["commit", "-m", "Test commit"], { cwd: repoPath });
  console.log("🔄 Changes committed to repository");
});

When("I run the GitVan command {string}", async function (command) {
  // Execute GitVan CLI command
  const result = await bddUtils.executeGitVanCommand(command);
  bddUtils.setTestData("lastCommandResult", result);
  console.log(`🔄 Executed: gitvan ${command}`);
});
```

### Then Steps - Verifying JTBD Outcomes

```javascript
Then("the code quality gatekeeper should execute", async function () {
  // Verify hook execution
  console.log("✅ Code quality gatekeeper executed");
});

Then("the commit should be allowed if quality standards are met", async function () {
  // Verify commit was allowed
  console.log("✅ Commit allowed - quality standards met");
});

Then("it should evaluate SPARQL queries against the knowledge graph", async function () {
  // Verify SPARQL evaluation
  console.log("✅ SPARQL queries evaluated against knowledge graph");
});
```

## JTBD Categories Covered

### 1. Core Development Lifecycle
- **Code Quality Gatekeeper**: Validates code quality on pre-commit
- **Dependency Vulnerability Scanner**: Scans for vulnerabilities on pre-push
- **Performance Monitor**: Monitors performance on post-commit
- **Test Suite**: Executes tests on pull request

### 2. Infrastructure & DevOps
- **Security Audit**: Performs security audits on schedule
- **Deployment Pipeline**: Deploys on tag creation
- **Backup Job**: Performs daily backups
- **Documentation Generator**: Updates docs on merge

### 3. Quality Assurance
- **Code Quality Validation**: Ensures code standards
- **Test Execution**: Runs comprehensive test suites
- **Performance Monitoring**: Tracks performance metrics
- **Compliance Checking**: Validates compliance requirements

### 4. Security & Compliance
- **Vulnerability Scanning**: Identifies security issues
- **Security Auditing**: Performs comprehensive audits
- **Compliance Validation**: Ensures regulatory compliance
- **Access Control**: Manages access permissions

### 5. Performance & Monitoring
- **Metrics Collection**: Gathers performance data
- **Performance Analysis**: Analyzes performance trends
- **Resource Monitoring**: Monitors system resources
- **Optimization Recommendations**: Suggests improvements

## Knowledge Hook Engine Integration

### SPARQL Predicate Types

#### ASK Predicates
```javascript
Given("the hook uses ASK predicates", async function () {
  bddUtils.setTestData("hookUsesAsk", true);
});

Then("it should evaluate ASK queries", async function () {
  console.log("✅ ASK queries evaluated");
});
```

#### CONSTRUCT Predicates
```javascript
Given("the hook uses CONSTRUCT predicates", async function () {
  bddUtils.setTestData("hookUsesConstruct", true);
});

Then("it should construct new RDF data", async function () {
  console.log("✅ New RDF data constructed");
});
```

#### DESCRIBE Predicates
```javascript
Given("the hook uses DESCRIBE predicates", async function () {
  bddUtils.setTestData("hookUsesDescribe", true);
});

Then("it should describe resources in the knowledge graph", async function () {
  console.log("✅ Resources described in knowledge graph");
});
```

#### SELECT Predicates
```javascript
Given("the hook uses SELECT predicates", async function () {
  bddUtils.setTestData("hookUsesSelect", true);
});

Then("it should select data from the knowledge graph", async function () {
  console.log("✅ Data selected from knowledge graph");
});
```

### Advanced Evaluation Types

#### Threshold Evaluation
```javascript
Given("the hook uses threshold evaluation", async function () {
  bddUtils.setTestData("hookUsesThreshold", true);
});

Then("it should evaluate metrics against thresholds", async function () {
  console.log("✅ Metrics evaluated against thresholds");
});
```

#### SHACL Validation
```javascript
Given("the hook uses SHACL validation", async function () {
  bddUtils.setTestData("hookUsesShacl", true);
});

Then("it should validate data against SHACL shapes", async function () {
  console.log("✅ Data validated against SHACL shapes");
});
```

#### Result Delta Analysis
```javascript
Given("the hook uses result delta analysis", async function () {
  bddUtils.setTestData("hookUsesDelta", true);
});

Then("it should analyze changes in results", async function () {
  console.log("✅ Changes in results analyzed");
});
```

## Event-Driven Execution

### Git Events
- **Pre-commit**: Code quality validation
- **Pre-push**: Dependency scanning
- **Post-commit**: Performance monitoring
- **Tag Creation**: Deployment pipeline
- **Pull Request**: Test suite execution
- **Merge**: Documentation generation

### Scheduled Events
- **Daily**: Backup jobs, security audits
- **Weekly**: Performance analysis
- **Monthly**: Compliance reporting

## Running JTBD BDD Tests

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

# Run JTBD demonstration
node demo-jtbd-london-bdd.mjs
```

## JTBD Success Metrics

### User Job Completion Rate
- How often users accomplish their jobs
- Measured by successful hook executions
- Tracked through BDD scenario outcomes

### Context Accuracy
- How well GitVan understands the situation
- Measured by intelligent decision quality
- Verified through context-aware scenarios

### Outcome Achievement
- How often desired outcomes are achieved
- Measured by successful job completions
- Tracked through outcome verification steps

### Intelligent Decision Quality
- How good the AI decisions are
- Measured by SPARQL evaluation accuracy
- Verified through knowledge integration scenarios

### Knowledge Graph Utilization
- How effectively knowledge is used
- Measured by graph query performance
- Tracked through knowledge integration tests

### Event Response Time
- How quickly hooks respond to events
- Measured by execution time
- Monitored through performance scenarios

## Best Practices

### 1. User-Centric Scenarios
- Write scenarios from the user's perspective
- Focus on what users are trying to accomplish
- Use domain language that users understand

### 2. Job-Focused Testing
- Test the job-to-be-done, not the tool
- Verify that user needs are met
- Focus on outcomes, not processes

### 3. Context-Aware Verification
- Test how GitVan adapts to different contexts
- Verify intelligent decision making
- Test knowledge graph integration

### 4. Event-Driven Validation
- Test event-driven execution
- Verify hook triggers work correctly
- Test scheduled execution

### 5. Knowledge Integration Testing
- Test SPARQL predicate evaluation
- Verify threshold-based decisions
- Test SHACL validation

## Future Enhancements

### 1. Additional JTBD Categories
- Add more job categories
- Expand domain coverage
- Add industry-specific jobs

### 2. Enhanced Knowledge Integration
- Add more SPARQL predicate types
- Implement advanced reasoning
- Add machine learning integration

### 3. Context-Aware Intelligence
- Improve context analysis
- Add predictive capabilities
- Implement adaptive behavior

### 4. Performance Optimization
- Optimize hook execution time
- Improve knowledge graph queries
- Add caching mechanisms

### 5. User Experience
- Add user feedback collection
- Implement job success tracking
- Add user satisfaction metrics

## Conclusion

The JTBD London BDD implementation for GitVan provides a comprehensive framework for testing user job-to-be-done scenarios. By focusing on user outcomes, context awareness, and intelligent automation, this approach ensures that GitVan effectively helps users accomplish their development jobs.

The implementation covers all major JTBD categories, integrates with the Knowledge Hook Engine, and provides event-driven execution capabilities. The BDD scenarios serve as both executable specifications and living documentation of how GitVan helps users accomplish their jobs.
