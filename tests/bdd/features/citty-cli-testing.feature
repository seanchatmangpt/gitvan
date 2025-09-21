Feature: Citty CLI Testing - Jobs to be Done
  As a developer
  I want to test Citty-based CLI commands comprehensively
  So that I can ensure reliable, user-friendly command-line interfaces

  Background:
    Given I have a Citty CLI application
    And I am in the working directory "."

  # Job: Discover Available Commands
  Scenario: List all available commands
    When I run the command "--help"
    Then the command should succeed
    And I should see "COMMANDS" in the output
    And the command should show usage information
    And the command should list available commands

  Scenario: Show help for specific command
    Given I have a Citty CLI application
    When I run the command "workflow --help"
    Then the command should succeed
    And I should see "workflow" in the output
    And the command should show usage information
    And the command should show examples

  Scenario: Show version information
    When I run the command "--version"
    Then the command should succeed
    And the version should be displayed

  # Job: Execute Commands Successfully
  Scenario: Execute basic command
    When I run the command "workflow list"
    Then the command should succeed
    And I should see "Available Workflows" in the output

  Scenario: Execute command with options
    When I run the command "workflow list --verbose"
    Then the command should succeed
    And I should see "Available Workflows" in the output

  Scenario: Execute command with positional arguments
    When I run the command "workflow validate http://example.org/test-workflow"
    Then the command should succeed
    And I should see "Workflow validation passed" in the output

  Scenario: Execute command with multiple arguments
    When I run the command "workflow run http://example.org/test-workflow --dry-run --verbose"
    Then the command should succeed
    And I should see "Dry run mode" in the output

  # Job: Handle Errors Gracefully
  Scenario: Handle unknown command
    When I run the command "unknown-command"
    Then the command should fail
    And the error message should be helpful
    And I should see "Unknown command" in the output

  Scenario: Handle missing required arguments
    When I run the command "workflow run"
    Then the command should fail
    And the error message should be helpful
    And I should see "required" in the output

  Scenario: Handle invalid arguments
    When I run the command "workflow validate invalid-workflow"
    Then the command should fail
    And the error message should be helpful

  Scenario: Handle command timeout
    When I run the command "workflow run http://example.org/test-workflow" with timeout 1000ms
    Then the command should fail
    And the exit code should be 1

  # Job: Provide Interactive Experience
  Scenario: Handle interactive input
    Given I have a Citty CLI application
    When I run the command "workflow create test-workflow" with input "My Test Workflow"
    Then the command should succeed
    And I should see "Workflow template created" in the output

  Scenario: Handle multiple interactive inputs
    When I run the command "workflow create interactive-workflow" with input "Interactive Workflow, Yes, No"
    Then the command should succeed
    And I should see "Workflow template created" in the output

  # Job: Maintain Consistency and Reliability
  Scenario: Command should be idempotent
    When I run the command "workflow list"
    And the command should succeed
    Then the command should be idempotent

  Scenario: Command should be deterministic
    When I run the command "workflow stats"
    And the command should succeed
    Then the command should be deterministic

  Scenario: Command should complete within reasonable time
    When I run the command "workflow list"
    Then the command should succeed
    And the command should complete within 5000ms

  # Job: Provide Rich Output Formats
  Scenario: Output should be well-formatted
    When I run the command "workflow list"
    Then the command should succeed
    And I should see "─" in the output
    And I should see "📋" in the output

  Scenario: Output should be structured
    When I run the command "workflow stats"
    Then the command should succeed
    And I should see "Total workflows" in the output
    And I should see "Graph directory" in the output

  Scenario: Error output should be clear
    When I run the command "workflow validate non-existent"
    Then the command should fail
    And I should see "Workflow not found" in the output
    And the error message should be helpful

  # Job: Handle Different Environments
  Scenario: Work in different working directories
    Given I am in the working directory "/tmp"
    When I run the command "workflow list"
    Then the command should succeed

  Scenario: Handle environment variables
    Given I have the environment variable "GITVAN_DEBUG" set to "true"
    When I run the command "workflow list"
    Then the command should succeed

  Scenario: Handle missing environment
    Given I have the environment variable "GITVAN_CONFIG" set to "/nonexistent/path"
    When I run the command "workflow list"
    Then the command should succeed

  # Job: Provide Comprehensive Help
  Scenario: Show detailed help information
    When I run the command "--help"
    Then the command should succeed
    And the help text should be displayed
    And I should see "USAGE" in the output
    And I should see "EXAMPLES" in the output

  Scenario: Show command-specific help
    When I run the command "workflow --help"
    Then the command should succeed
    And the help text should be displayed
    And I should see "workflow" in the output

  Scenario: Show subcommand help
    When I run the command "workflow run --help"
    Then the command should succeed
    And the help text should be displayed
    And I should see "run" in the output

  # Job: Validate Input and Output
  Scenario: Validate JSON output
    When I run the command "workflow list --format json"
    Then the command should succeed
    And the output should be formatted as JSON

  Scenario: Validate structured output
    When I run the command "workflow stats"
    Then the command should succeed
    And I should see "Total workflows" in the output
    And I should see "Engine initialized" in the output

  Scenario: Validate error output format
    When I run the command "workflow validate invalid"
    Then the command should fail
    And I should see "Error" in the output
    And the error message should be helpful

  # Job: Ensure Security and Safety
  Scenario: Handle sensitive data safely
    Given I have the environment variable "GITVAN_TOKEN" set to "secret-token"
    When I run the command "workflow list"
    Then the command should succeed
    And I should not see "secret-token" in the output

  Scenario: Validate file operations
    Given I have a test file "test-config.json" with content "{\"test\": true}"
    When I run the command "workflow create test-from-file"
    Then the command should succeed
    And I should see "Workflow template created" in the output

  Scenario: Handle file system errors gracefully
    Given I am in the working directory "/nonexistent"
    When I run the command "workflow list"
    Then the command should fail
    And the error message should be helpful

  # Job: Provide Performance and Scalability
  Scenario: Handle large datasets efficiently
    When I run the command "workflow list"
    Then the command should succeed
    And the command should complete within 3000ms

  Scenario: Handle concurrent operations
    When I run the command "workflow stats"
    And I run the command "workflow list"
    Then both commands should succeed

  Scenario: Handle memory constraints
    When I run the command "workflow list"
    Then the command should succeed
    And the command should complete within 5000ms

  # Job: Maintain Backward Compatibility
  Scenario: Support legacy command formats
    When I run the command "workflow --version"
    Then the command should succeed
    And the version should be displayed

  Scenario: Handle deprecated options gracefully
    When I run the command "workflow list --old-format"
    Then the command should fail
    And the error message should be helpful
    And I should see "deprecated" in the output

  Scenario: Provide migration guidance
    When I run the command "workflow --help"
    Then the command should succeed
    And I should see "migration" in the output
