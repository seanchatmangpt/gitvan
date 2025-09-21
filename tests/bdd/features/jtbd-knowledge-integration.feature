Feature: GitVan JTBD Knowledge Hook Integration
  As a developer
  I want JTBD hooks to integrate with the Knowledge Hook Engine
  So that intelligent automation can be achieved based on project context

  Background:
    Given I have a GitVan project
    And I have JTBD hooks configured
    And I have a Knowledge Hook Engine running

  Scenario: JTBD hook with SPARQL predicate evaluation
    Given I have a JTBD hook named "intelligent-code-review"
    And the hook uses SPARQL predicates for evaluation
    When the hook executes
    Then it should evaluate SPARQL queries against the knowledge graph
    And I should see "SPARQL evaluation" in the output
    And the hook should make intelligent decisions based on the results

  Scenario: JTBD hook with ASK predicate
    Given I have a JTBD hook named "security-check"
    And the hook uses ASK predicates
    When the hook executes
    Then it should evaluate ASK queries
    And I should see "ASK predicate evaluation" in the output
    And the hook should return true or false based on the query

  Scenario: JTBD hook with CONSTRUCT predicate
    Given I have a JTBD hook named "data-transformer"
    And the hook uses CONSTRUCT predicates
    When the hook executes
    Then it should construct new RDF data
    And I should see "CONSTRUCT predicate evaluation" in the output
    And new triples should be added to the knowledge graph

  Scenario: JTBD hook with DESCRIBE predicate
    Given I have a JTBD hook named "resource-analyzer"
    And the hook uses DESCRIBE predicates
    When the hook executes
    Then it should describe resources in the knowledge graph
    And I should see "DESCRIBE predicate evaluation" in the output
    And resource descriptions should be generated

  Scenario: JTBD hook with SELECT predicate
    Given I have a JTBD hook named "metrics-collector"
    And the hook uses SELECT predicates
    When the hook executes
    Then it should select data from the knowledge graph
    And I should see "SELECT predicate evaluation" in the output
    And metrics data should be collected

  Scenario: JTBD hook with threshold evaluation
    Given I have a JTBD hook named "quality-gate"
    And the hook uses threshold evaluation
    When the hook executes
    Then it should evaluate metrics against thresholds
    And I should see "Threshold evaluation" in the output
    And the hook should pass or fail based on thresholds

  Scenario: JTBD hook with SHACL validation
    Given I have a JTBD hook named "data-validator"
    And the hook uses SHACL validation
    When the hook executes
    Then it should validate data against SHACL shapes
    And I should see "SHACL validation" in the output
    And data should be validated according to shapes

  Scenario: JTBD hook with result delta analysis
    Given I have a JTBD hook named "change-analyzer"
    And the hook uses result delta analysis
    When the hook executes
    Then it should analyze changes in results
    And I should see "Result delta analysis" in the output
    And changes should be detected and reported

  Scenario: JTBD hook with workflow orchestration
    Given I have a JTBD hook named "complex-workflow"
    And the hook orchestrates multiple steps
    When the hook executes
    Then it should execute steps in the correct order
    And I should see "Workflow orchestration" in the output
    And all steps should complete successfully

  Scenario: JTBD hook with context-aware execution
    Given I have a JTBD hook named "context-aware-hook"
    And the hook uses project context for decisions
    When the hook executes
    Then it should analyze the current project context
    And I should see "Context analysis" in the output
    And the hook should adapt its behavior based on context
