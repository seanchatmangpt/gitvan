Feature: GitVan Graph Persistence
  As a developer
  I want to persist and manage RDF graphs
  So that I can store and query structured data

  Background:
    Given I have a GitVan project

  Scenario: Initialize default graph
    When I run the GitVan command "graph init-default"
    Then the command should succeed
    And the file "graph/default.ttl" should exist

  Scenario: Save graph data
    Given I have a GitVan graph with data
    When I run the GitVan command "graph save-default"
    Then the command should succeed
    And the file "graph/default.ttl" should exist
    And the graph should contain the data

  Scenario: Load graph data
    Given I have a GitVan graph with data
    When I run the GitVan command "graph load-default"
    Then the command should succeed
    And I should see "Graph loaded" in the output

  Scenario: List graph files
    Given I have a GitVan graph with data
    When I run the GitVan command "graph list-files"
    Then the command should succeed
    And I should see "default.ttl" in the output

  Scenario: Show graph statistics
    Given I have a GitVan graph with data
    When I run the GitVan command "graph stats"
    Then the command should succeed
    And I should see "Quads:" in the output
    And I should see "Subjects:" in the output

  Scenario: Save custom graph
    Given I have a GitVan graph with data
    When I run the GitVan command "graph save custom-data"
    Then the command should succeed
    And the file "graph/custom-data.ttl" should exist

  Scenario: Load custom graph
    Given I have a GitVan graph with data
    When I run the GitVan command "graph save custom-data"
    And I run the GitVan command "graph load custom-data"
    Then the command should succeed
    And I should see "Graph loaded" in the output
