Feature: GitVan Workflow CLI - Jobs to be Done
  As a developer
  I want to manage GitVan workflows through CLI commands
  So that I can automate complex development processes and achieve consistent outcomes

  Background:
    Given I have a GitVan project initialized
    And I have workflow definitions in the "./workflows" directory

  # Job: Discover Available Workflows
  Scenario: List all available workflows
    When I run "gitvan workflow list"
    Then the command should succeed
    And I should see a list of available workflows
    And each workflow should show its title and pipeline count
    And the output should be formatted clearly

  Scenario: Get workflow statistics
    When I run "gitvan workflow stats"
    Then the command should succeed
    And I should see total workflow count
    And I should see the graph directory path
    And I should see engine initialization status
    And I should see a summary of all workflows

  # Job: Validate Workflow Integrity
  Scenario: Validate an existing workflow
    Given I have a workflow with ID "http://example.org/test-workflow"
    When I run "gitvan workflow validate http://example.org/test-workflow"
    Then the command should succeed
    And I should see validation success message
    And I should see the workflow title
    And I should see the pipeline count
    And I should see the workflow ID
    And I should see "Workflow structure is valid"

  Scenario: Validate a non-existent workflow
    When I run "gitvan workflow validate non-existent-workflow"
    Then the command should fail
    And I should see "Workflow not found" error message

  # Job: Execute Workflows Safely
  Scenario: Execute workflow in dry-run mode
    Given I have a workflow with ID "http://example.org/test-workflow"
    When I run "gitvan workflow run http://example.org/test-workflow --dry-run"
    Then the command should succeed
    And I should see "Dry run mode - no actual execution"
    And I should see "Workflow found"
    And I should see the workflow title
    And I should see the pipeline count

  Scenario: Execute workflow with verbose output
    Given I have a workflow with ID "http://example.org/test-workflow"
    When I run "gitvan workflow run http://example.org/test-workflow --verbose"
    Then the command should succeed
    And I should see detailed execution information
    And I should see step-by-step progress

  Scenario: Execute workflow with input parameters
    Given I have a workflow with ID "http://example.org/test-workflow"
    When I run "gitvan workflow run http://example.org/test-workflow --input key1=value1 --input key2=value2"
    Then the command should succeed
    And the workflow should receive the input parameters

  # Job: Create New Workflow Templates
  Scenario: Create a new workflow template
    When I run "gitvan workflow create my-new-workflow 'My New Workflow'"
    Then the command should succeed
    And I should see "Workflow template created" message
    And the file "workflows/my-new-workflow.ttl" should exist
    And the file should contain Turtle RDF syntax
    And the file should contain the workflow title
    And the file should contain example step definitions

  Scenario: Create workflow template without title
    When I run "gitvan workflow create auto-titled-workflow"
    Then the command should succeed
    And I should see "Workflow template created" message
    And the file "workflows/auto-titled-workflow.ttl" should exist
    And the workflow title should be auto-generated from the ID

  # Job: Integrate with Cursor AI
  Scenario: Connect workflow with Cursor CLI interactively
    Given I have a workflow with ID "http://example.org/test-workflow"
    And Cursor CLI is available
    When I run "gitvan workflow cursor http://example.org/test-workflow --interactive"
    Then the command should succeed
    And I should see "Connecting workflow" message
    And I should see "Cursor CLI detected"
    And I should see "Starting Cursor CLI session"

  Scenario: Connect workflow with Cursor CLI non-interactively
    Given I have a workflow with ID "http://example.org/test-workflow"
    And Cursor CLI is available
    When I run "gitvan workflow cursor http://example.org/test-workflow --non-interactive --model gpt-4"
    Then the command should succeed
    And I should see "Connecting workflow" message
    And I should see "Cursor CLI detected"
    And the Cursor session should use the specified model

  Scenario: Connect workflow with custom prompt
    Given I have a workflow with ID "http://example.org/test-workflow"
    And Cursor CLI is available
    When I run "gitvan workflow cursor http://example.org/test-workflow --prompt 'Custom workflow prompt'"
    Then the command should succeed
    And I should see "Connecting workflow" message
    And the Cursor session should use the custom prompt

  # Job: Generate Cursor Integration Scripts
  Scenario: Generate Cursor integration script
    Given I have a workflow with ID "http://example.org/test-workflow"
    When I run "gitvan workflow cursor-script http://example.org/test-workflow"
    Then the command should succeed
    And I should see "Generating Cursor integration script" message
    And I should see "Script generated successfully"

  # Job: Get Help and Documentation
  Scenario: Show workflow command help
    When I run "gitvan workflow help"
    Then the command should succeed
    And I should see "GitVan Workflow Commands" header
    And I should see all available subcommands
    And I should see usage examples for each command
    And I should see proper formatting with separators

  Scenario: Show main CLI help with workflow command
    When I run "gitvan --help"
    Then the command should succeed
    And I should see "workflow" in the list of commands
    And I should see "Manage GitVan Workflows" description

  # Job: Handle Errors Gracefully
  Scenario: Handle missing workflow ID for run command
    When I run "gitvan workflow run"
    Then the command should fail
    And I should see "Workflow ID required for run command" error

  Scenario: Handle missing workflow ID for validate command
    When I run "gitvan workflow validate"
    Then the command should fail
    And I should see "Workflow ID required for validate command" error

  Scenario: Handle missing workflow ID for cursor command
    When I run "gitvan workflow cursor"
    Then the command should fail
    And I should see "Workflow ID required for cursor command" error

  Scenario: Handle missing workflow ID for cursor-script command
    When I run "gitvan workflow cursor-script"
    Then the command should fail
    And I should see "Workflow ID required for cursor-script command" error

  # Job: Maintain Context and State
  Scenario: Maintain GitVan context across commands
    Given I have a GitVan project initialized
    When I run "gitvan workflow list"
    And I run "gitvan workflow stats"
    Then both commands should succeed
    And the GitVan context should be properly maintained
    And the workflow engine should be initialized consistently

  Scenario: Handle multiple workflow operations
    Given I have multiple workflows available
    When I run "gitvan workflow list"
    And I run "gitvan workflow validate" for each workflow
    Then all commands should succeed
    And the workflow engine should handle multiple operations efficiently
