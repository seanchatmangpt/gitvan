Feature: GitVan CLI Commands
  As a developer
  I want to use GitVan CLI commands
  So that I can automate my development workflow

  Background:
    Given I have a GitVan project

  Scenario: Initialize GitVan project
    When I initialize GitVan
    Then the command should succeed
    And GitVan should be properly configured

  Scenario: Save current state
    Given I have committed changes
    When I save the current state
    Then the command should succeed
    And I should see "Changes saved" in the output

  Scenario: Start GitVan daemon
    When I start the GitVan daemon
    Then the command should succeed
    And the GitVan daemon should be running

  Scenario: Generate job with AI
    When I generate a job with AI
    Then the command should succeed
    And the file "jobs/backup-job.mjs" should exist
    And the file "jobs/backup-job.mjs" should contain "defineJob"
