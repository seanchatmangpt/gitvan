Feature: GitVan Job Management
  As a developer
  I want to create and manage GitVan jobs
  So that I can automate repetitive tasks

  Background:
    Given I have a GitVan project

  Scenario: Create a new job
    Given I have a GitVan job named "backup-job"
    Then the file "jobs/backup-job.mjs" should exist
    And the file "jobs/backup-job.mjs" should contain "backup-job"
    And the job should be executable

  Scenario: Create a job with AI assistance
    When I run the GitVan command "chat generate \"Create a cleanup job\""
    Then the command should succeed
    And the file "jobs/cleanup-job.mjs" should exist
    And the file "jobs/cleanup-job.mjs" should contain "defineJob"

  Scenario: Execute a job
    Given I have a GitVan job named "test-job"
    When I run the GitVan command "run jobs/test-job.mjs"
    Then the command should succeed
    And I should see "Executing test-job job" in the output

  Scenario: List available jobs
    Given I have a GitVan job named "job1"
    And I have a GitVan job named "job2"
    When I run the GitVan command "job list"
    Then the command should succeed
    And I should see "job1" in the output
    And I should see "job2" in the output
