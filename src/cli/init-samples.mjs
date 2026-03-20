/**
 * Sample content creation for GitVan project initialization
 * Extracted from init.mjs - creates sample hooks, workflows, templates
 */

import { join } from "pathe";
import { writeFileSync, readFileSync, existsSync } from "node:fs";

/**
 * Initialize Knowledge Graph
 */
export async function initializeKnowledgeGraph(cwd, projectName, projectDescription, logger) {
  logger.info("\nInitializing Knowledge Graph...");

  const initTtl = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# Project Information
ex:project rdf:type gv:Project ;
    gv:name "${projectName}" ;
    gv:description "${projectDescription}" ;
    gv:version "1.0.0" ;
    gv:createdDate "${new Date().toISOString()}" ;
    gv:status "active" .

# Initial Project State
ex:project-state rdf:type gv:ProjectState ;
    gv:project ex:project ;
    gv:phase "initialization" ;
    gv:lastUpdated "${new Date().toISOString()}" ;
    gv:status "setup-complete" .

# Sample Entities for Testing
ex:test-item-1 rdf:type gv:TestItem ;
    gv:name "Sample Item 1" ;
    gv:status "active" ;
    gv:priority "medium" .

ex:test-item-2 rdf:type gv:TestItem ;
    gv:name "Sample Item 2" ;
    gv:status "pending" ;
    gv:priority "high" .

# Sample Metrics
ex:project-metrics rdf:type gv:ProjectMetrics ;
    gv:project ex:project ;
    gv:totalItems 2 ;
    gv:activeItems 1 ;
    gv:pendingItems 1 ;
    gv:lastCalculated "${new Date().toISOString()}" .
`;

  writeFileSync(join(cwd, "graph", "init.ttl"), initTtl);
  logger.info("   graph/init.ttl created");

  const graphReadme = `# Knowledge Graph

This directory contains the Knowledge Graph for your GitVan project.

## Files
- \`init.ttl\` - Initial project knowledge graph

## Usage
The Knowledge Graph is automatically loaded by GitVan's Knowledge Hook Engine and can be queried using SPARQL.
`;

  writeFileSync(join(cwd, "graph", "README.md"), graphReadme);
  logger.info("   graph/README.md created");
}

/**
 * Create sample hooks
 */
export async function createSampleHooks(cwd, logger) {
  logger.info("\nCreating sample Knowledge Hooks...");

  const hooks = [
    {
      name: "version-change.ttl",
      content: `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:version-change-hook rdf:type gh:Hook ;
    gv:title "Version Change Detection" ;
    gh:hasPredicate ex:version-change-predicate ;
    gh:orderedPipelines ex:version-change-pipeline .

ex:version-change-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        SELECT ?project ?version ?releaseDate WHERE {
            ?project rdf:type gv:Project .
            ?project gv:version ?version .
            ?project gv:releaseDate ?releaseDate .
        } ORDER BY ?project
    """ ;
    gh:description "Detects when project version information changes between commits" .

ex:version-change-pipeline rdf:type op:Pipeline ;
    op:steps (ex:notify-team, ex:update-changelog) .

ex:notify-team rdf:type gv:TemplateStep ;
    gv:text "Version {{ version }} detected at {{ releaseDate }}" ;
    gv:filePath "./logs/version-changes.log" .

ex:update-changelog rdf:type gv:TemplateStep ;
    gv:text "## Version {{ version }} - {{ releaseDate }}\\n\\nVersion change detected automatically.\\n" ;
    gv:filePath "./CHANGELOG.md" ;
    gv:dependsOn ex:notify-team .
`,
    },
    {
      name: "critical-issues.ttl",
      content: `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:critical-issues-hook rdf:type gh:Hook ;
    gv:title "Critical Issue Alert" ;
    gh:hasPredicate ex:critical-issues-predicate ;
    gh:orderedPipelines ex:critical-issues-pipeline .

ex:critical-issues-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        ASK WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:priority "critical" .
            ?item gv:status "open" .
        }
    """ ;
    gh:description "Detects if there are any open critical issues in the system" .

ex:critical-issues-pipeline rdf:type op:Pipeline ;
    op:steps (ex:create-alert) .

ex:create-alert rdf:type gv:TemplateStep ;
    gv:text "CRITICAL ISSUE DETECTED\\n\\nTime: {{ 'now' | date('YYYY-MM-DD HH:mm:ss') }}\\nStatus: Action Required\\n" ;
    gv:filePath "./logs/critical-alerts.log" .
`,
    },
  ];

  for (const hook of hooks) {
    writeFileSync(join(cwd, "hooks", hook.name), hook.content);
    logger.info(`   Created: hooks/${hook.name}`);
  }

  const hooksReadme = `# Knowledge Hooks

This directory contains Knowledge Hook definitions for intelligent automation.

## Available Hooks
- \`version-change.ttl\` - Detects project version changes
- \`critical-issues.ttl\` - Monitors for critical issues

## Hook Types
- **ResultDelta** - Detects changes in query results between commits
- **ASK** - Evaluates boolean conditions
- **SELECTThreshold** - Monitors numerical values against thresholds
- **SHACL** - Validates graph conformance against shapes
`;

  writeFileSync(join(cwd, "hooks", "README.md"), hooksReadme);
  logger.info("   hooks/README.md created");
}

/**
 * Create sample workflows
 */
export async function createSampleWorkflows(cwd, logger) {
  logger.info("\nCreating sample Workflows...");

  const workflow = `@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:data-processing-workflow rdf:type gh:Hook ;
    gv:title "Data Processing Workflow" ;
    gh:hasPredicate ex:data-processing-predicate ;
    gh:orderedPipelines ex:data-processing-pipeline .

ex:data-processing-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?item ?name ?status WHERE {
            ?item rdf:type gv:TestItem .
            ?item gv:name ?name .
            ?item gv:status ?status .
        }
    """ .

ex:data-processing-pipeline rdf:type op:Pipeline ;
    op:steps (ex:analyze-data, ex:generate-report) .

ex:analyze-data rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?item) AS ?total) (COUNT(?active) AS ?active) WHERE {
            ?item rdf:type gv:TestItem .
            OPTIONAL { ?active rdf:type gv:TestItem ; gv:status "active" }
        }
    """ ;
    gv:outputMapping '{"total": "total", "active": "active"}' .

ex:generate-report rdf:type gv:TemplateStep ;
    gv:text "Data Processing Report\\n\\nTotal Items: {{ total }}\\nActive Items: {{ active }}\\n" ;
    gv:filePath "./reports/data-processing.txt" ;
    gv:dependsOn ex:analyze-data .
`;

  writeFileSync(join(cwd, "workflows", "data-processing.ttl"), workflow);
  logger.info("   Created: workflows/data-processing.ttl");

  const workflowsReadme = `# Workflows

This directory contains Workflow definitions for automated data processing.

## Available Workflows
- \`data-processing.ttl\` - Processes data changes and generates reports

## Workflow Steps
- **SparqlStep** - Execute SPARQL queries
- **TemplateStep** - Process templates with data
- **FileStep** - File operations
- **HttpStep** - HTTP requests
- **GitStep** - Git operations
`;

  writeFileSync(join(cwd, "workflows", "README.md"), workflowsReadme);
  logger.info("   workflows/README.md created");
}

/**
 * Create sample templates
 */
export async function createSampleTemplates(cwd, logger) {
  logger.info("\nCreating sample Templates...");

  const templates = [
    {
      name: "project-status.njk",
      content: `# Project Status Report

**Project:** {{ project.name }}
**Description:** {{ project.description }}
**Generated:** {{ "now" | date("YYYY-MM-DD HH:mm:ss") }}

## Summary
This is a sample GitVan template demonstrating template processing.
`,
    },
    {
      name: "example.njk",
      content: `Hello {{ name }}!

This is a sample GitVan template.

Project: {{ project.name }}
Description: {{ project.description }}
`,
    },
  ];

  for (const template of templates) {
    writeFileSync(join(cwd, "templates", template.name), template.content);
    logger.info(`   Created: templates/${template.name}`);
  }

  const templatesReadme = `# Templates

This directory contains Nunjucks templates for generating content.

## Available Templates
- \`project-status.njk\` - Project status report
- \`example.njk\` - Basic example template
`;

  writeFileSync(join(cwd, "templates", "README.md"), templatesReadme);
  logger.info("   templates/README.md created");
}

/**
 * Create package.json scripts
 */
export async function createPackageScripts(cwd, logger) {
  logger.info("\nCreating package.json scripts...");

  try {
    const packagePath = join(cwd, "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

    packageJson.scripts = {
      ...packageJson.scripts,
      test: "vitest",
      "test:hooks": "vitest tests/hooks/",
      "test:workflows": "vitest tests/workflows/",
      dev: "gitvan daemon",
      build: "gitvan build",
      hooks: "gitvan hooks",
      "hooks:list": "gitvan hooks list",
      "hooks:evaluate": "gitvan hooks evaluate",
      workflows: "gitvan workflow",
      "workflows:list": "gitvan workflow list",
      "workflows:run": "gitvan workflow run",
      setup: "gitvan setup",
      save: "gitvan save",
    };

    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    logger.info("   package.json scripts updated");
  } catch (error) {
    logger.info("   Failed to update package.json scripts:", error.message);
  }
}
