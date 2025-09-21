Feature: GitVan JTBD (Jobs To Be Done) Management
  As a developer
  I want to manage Jobs-to-be-Done hooks in GitVan
  So that I can automate development workflows based on user needs

  Background:
    Given I have a GitVan project
    And I have JTBD hooks configured

  Scenario: List all available JTBD hooks
    When I run the GitVan command "jtbd list"
    Then the command should succeed
    And I should see "Available JTBD Hooks" in the output
    And I should see "code-quality-gatekeeper" in the output

  Scenario: List JTBD hooks by category
    When I run the GitVan command "jtbd list --category core-development-lifecycle"
    Then the command should succeed
    And I should see "Core Development Lifecycle" in the output
    And I should see "code-quality-gatekeeper" in the output

  Scenario: List JTBD hooks by domain
    When I run the GitVan command "jtbd list --domain security"
    Then the command should succeed
    And I should see "Security Domain" in the output
    And I should see security-related hooks in the output

  Scenario: Evaluate JTBD hook
    When I run the GitVan command "jtbd evaluate --category core-development-lifecycle"
    Then the command should succeed
    And I should see "JTBD Evaluation Results" in the output
    And I should see "evaluation completed" in the output

  Scenario: Validate JTBD hook
    When I run the GitVan command "jtbd validate code-quality-gatekeeper"
    Then the command should succeed
    And I should see "JTBD Hook Validation" in the output
    And I should see "validation passed" in the output

  Scenario: Show JTBD statistics
    When I run the GitVan command "jtbd stats"
    Then the command should succeed
    And I should see "JTBD Statistics" in the output
    And I should see "Total Hooks:" in the output
    And I should see "Categories:" in the output

  Scenario: Refresh JTBD hooks
    When I run the GitVan command "jtbd refresh"
    Then the command should succeed
    And I should see "JTBD hooks refreshed" in the output

  Scenario: Create new JTBD hook
    When I run the GitVan command "jtbd create --name test-hook --category testing"
    Then the command should succeed
    And I should see "JTBD hook created" in the output
    And the file "hooks/test-hook.mjs" should exist

  Scenario: Run JTBD workflow
    When I run the GitVan command "jtbd workflow run code-quality-pipeline"
    Then the command should succeed
    And I should see "Workflow execution started" in the output
    And I should see "workflow completed" in the output

  Scenario: Show JTBD analytics
    When I run the GitVan command "jtbd analytics"
    Then the command should succeed
    And I should see "JTBD Analytics" in the output
    And I should see "execution metrics" in the output
