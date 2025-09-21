Feature: GitVan Template System
  As a developer
  I want to use GitVan templates
  So that I can generate consistent content

  Background:
    Given I have a GitVan project

  Scenario: Create a new template
    Given I have a GitVan template named "component-template"
    Then the file "templates/component-template.njk" should exist
    And the file "templates/component-template.njk" should contain "component-template"
    And the template should be renderable

  Scenario: Render a template
    Given I have a GitVan template named "readme-template"
    When I run the GitVan command "template render templates/readme-template.njk --output README.md"
    Then the command should succeed
    And the file "README.md" should exist

  Scenario: List available templates
    Given I have a GitVan template named "template1"
    And I have a GitVan template named "template2"
    When I run the GitVan command "template list"
    Then the command should succeed
    And I should see "template1" in the output
    And I should see "template2" in the output

  Scenario: Validate template syntax
    Given I have a GitVan template named "valid-template"
    When I run the GitVan command "template validate templates/valid-template.njk"
    Then the command should succeed
    And I should see "Template is valid" in the output
