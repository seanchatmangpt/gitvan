Feature: GitVan AI-Powered Job Generation
  As a developer
  I want to generate GitVan jobs using AI
  So that I can quickly create automation without writing code manually

  Background:
    Given I have a GitVan project
    And I have a Git repository

  Scenario: Generate a backup job using AI
    Given I want to create a backup job
    When I ask AI to generate a backup job
    Then the AI should create a working backup job
    And the job should be executable
    And the job should follow GitVan conventions

  Scenario: Generate a deployment job using AI
    Given I want to create a deployment job
    When I ask AI to generate a deployment job
    Then the AI should create a working deployment job
    And the job should include error handling
    And the job should be production-ready

  Scenario: Generate a test job using AI
    Given I want to create a test job
    When I ask AI to generate a test job
    Then the AI should create a working test job
    And the job should include test validation
    And the job should be integrated with the project

  Scenario: AI job generation with custom requirements
    Given I want to create a job with specific requirements
    When I provide detailed requirements to AI
    Then the AI should generate a job matching the requirements
    And the job should be properly documented
    And the job should include all requested features
