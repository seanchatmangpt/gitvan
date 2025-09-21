Feature: GitVan JTBD Hook Execution
  As a developer
  I want JTBD hooks to execute automatically based on Git events
  So that development workflows are automated according to user needs

  Background:
    Given I have a GitVan project
    And I have JTBD hooks configured
    And I have a Git repository

  Scenario: Execute code quality gatekeeper on pre-commit
    Given I have a JTBD hook named "code-quality-gatekeeper"
    And the hook is configured for "pre-commit" events
    When I commit changes to the repository
    Then the code quality gatekeeper should execute
    And I should see "Code quality validation" in the output
    And the commit should be allowed if quality standards are met

  Scenario: Execute dependency scanner on pre-push
    Given I have a JTBD hook named "dependency-vulnerability-scanner"
    And the hook is configured for "pre-push" events
    When I push changes to the repository
    Then the dependency scanner should execute
    And I should see "Dependency vulnerability scan" in the output
    And vulnerabilities should be reported

  Scenario: Execute performance monitor on post-commit
    Given I have a JTBD hook named "performance-monitor"
    And the hook is configured for "post-commit" events
    When I commit changes to the repository
    Then the performance monitor should execute
    And I should see "Performance monitoring" in the output
    And performance metrics should be collected

  Scenario: Execute security audit on scheduled basis
    Given I have a JTBD hook named "security-audit"
    And the hook is configured for "scheduled" execution
    When the scheduled time arrives
    Then the security audit should execute
    And I should see "Security audit" in the output
    And security issues should be identified

  Scenario: Execute deployment pipeline on tag creation
    Given I have a JTBD hook named "deployment-pipeline"
    And the hook is configured for "tag-creation" events
    When I create a version tag
    Then the deployment pipeline should execute
    And I should see "Deployment pipeline" in the output
    And the application should be deployed

  Scenario: Execute test suite on pull request
    Given I have a JTBD hook named "test-suite"
    And the hook is configured for "pull-request" events
    When I create a pull request
    Then the test suite should execute
    And I should see "Test suite execution" in the output
    And all tests should pass

  Scenario: Execute documentation generator on merge
    Given I have a JTBD hook named "documentation-generator"
    And the hook is configured for "merge" events
    When I merge a pull request
    Then the documentation generator should execute
    And I should see "Documentation generation" in the output
    And documentation should be updated

  Scenario: Execute backup job on scheduled basis
    Given I have a JTBD hook named "backup-job"
    And the hook is configured for "daily" execution
    When the daily schedule triggers
    Then the backup job should execute
    And I should see "Backup execution" in the output
    And data should be backed up successfully
