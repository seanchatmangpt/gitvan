/**
 * GitVan useGraph Composable Integration
 * Integrates the RDF/Turtle + CSV→RDF + SHACL + SPARQL + Nunjucks composable
 * with the AI Template Loop Enhancement system
 */

import { useGraph } from "../composables/graph.mjs";
import { aiTemplateLoop } from "./template-loop-enhancement.mjs";
import { createLogger } from "../utils/logger.mjs";
import { useGitVan } from "../core/context.mjs";
import { join } from "pathe";
import { promises as fs } from "node:fs";

const logger = createLogger("graph-integration");

/**
 * Graph-Aware AI Template Generator
 * Generates templates that work with RDF/SPARQL data using the useGraph composable
 */
export class GraphAwareTemplateGenerator {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the graph-aware generator
   */
  async initialize() {
    if (this.isInitialized) return;
    
    await aiTemplateLoop.initialize();
    this.isInitialized = true;
    logger.info("Graph-aware template generator initialized");
  }

  /**
   * Generate template for RDF/SPARQL data processing
   */
  async generateGraphTemplate(prompt, context = {}) {
    await this.initialize();

    const generationId = `graph-${Date.now()}`;
    const startTime = Date.now();

    try {
      logger.info(`Starting graph-aware template generation: ${generationId}`);

      // Analyze project context for RDF/SPARQL usage
      const projectContext = await this.analyzeGraphContext(context.rootPath || process.cwd());
      
      // Get learning insights
      const learningInsights = await aiTemplateLoop.getTemplateInsights('graph-templates');
      
      // Generate graph-aware template
      const template = await this.generateWithGraphContext(
        prompt,
        projectContext,
        learningInsights,
        context
      );

      // Record generation for learning
      const executionResult = {
        ok: true,
        duration: Date.now() - startTime,
        artifacts: [template],
        errors: []
      };

      await aiTemplateLoop.templateLearning.recordExecution('graph-template-generation', executionResult, {
        projectType: projectContext.projectType,
        framework: 'rdf-sparql',
        userAgent: context.userAgent || 'graph-aware-generator',
        prompt: prompt.substring(0, 100),
        graphFeatures: projectContext.graphFeatures
      });

      logger.info(`Completed graph-aware template generation: ${generationId}`);
      return {
        generationId,
        template,
        projectContext,
        learningInsights,
        executionResult
      };

    } catch (error) {
      logger.error(`Failed graph-aware template generation: ${generationId}`, error);
      throw error;
    }
  }

  /**
   * Analyze project context for RDF/SPARQL usage
   */
  async analyzeGraphContext(rootPath) {
    const context = {
      projectType: 'unknown',
      framework: 'unknown',
      graphFeatures: [],
      rdfFiles: [],
      sparqlFiles: [],
      csvFiles: [],
      shapesFiles: [],
      templatesFiles: [],
      lastAnalyzed: new Date().toISOString()
    };

    try {
      // Check for RDF/SPARQL related files
      const rdfExtensions = ['.ttl', '.turtle', '.rdf', '.owl', '.n3'];
      const sparqlExtensions = ['.sparql', '.rq'];
      const csvExtensions = ['.csv'];
      const shapesExtensions = ['.shapes.ttl', '.shacl.ttl'];
      const templateExtensions = ['.md', '.njk'];

      const entries = await fs.readdir(rootPath, { withFileTypes: true, recursive: true });
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const fileName = entry.name;
          const filePath = entry.path;

          // Check for RDF files
          if (rdfExtensions.some(ext => fileName.endsWith(ext))) {
            context.rdfFiles.push(filePath);
            context.graphFeatures.push('rdf-data');
          }

          // Check for SPARQL files
          if (sparqlExtensions.some(ext => fileName.endsWith(ext))) {
            context.sparqlFiles.push(filePath);
            context.graphFeatures.push('sparql-queries');
          }

          // Check for CSV files
          if (csvExtensions.some(ext => fileName.endsWith(ext))) {
            context.csvFiles.push(filePath);
            context.graphFeatures.push('csv-data');
          }

          // Check for SHACL shapes
          if (shapesExtensions.some(ext => fileName.endsWith(ext))) {
            context.shapesFiles.push(filePath);
            context.graphFeatures.push('shacl-validation');
          }

          // Check for templates
          if (templateExtensions.some(ext => fileName.endsWith(ext))) {
            context.templatesFiles.push(filePath);
            context.graphFeatures.push('templating');
          }
        }
      }

      // Determine project type based on graph features
      if (context.graphFeatures.includes('rdf-data') && context.graphFeatures.includes('sparql-queries')) {
        context.projectType = 'rdf-sparql-project';
        context.framework = 'rdf-sparql';
      } else if (context.graphFeatures.includes('csv-data')) {
        context.projectType = 'csv-analysis-project';
        context.framework = 'csv-rdf';
      } else if (context.graphFeatures.includes('shacl-validation')) {
        context.projectType = 'data-validation-project';
        context.framework = 'shacl';
      } else {
        context.projectType = 'general-project';
        context.framework = 'unknown';
      }

      // Get unique features
      context.graphFeatures = [...new Set(context.graphFeatures)];

    } catch (error) {
      logger.warn("Could not analyze graph context:", error.message);
    }

    return context;
  }

  /**
   * Generate template with graph context
   */
  async generateWithGraphContext(prompt, projectContext, learningInsights, context) {
    const graphPrompt = `
# GitVan Graph-Aware Template Generation

## User Request
"${prompt}"

## Project Context Analysis
- **Project Type**: ${projectContext.projectType}
- **Framework**: ${projectContext.framework}
- **Graph Features**: ${projectContext.graphFeatures.join(', ')}
- **RDF Files**: ${projectContext.rdfFiles.length} files
- **SPARQL Files**: ${projectContext.sparqlFiles.length} files
- **CSV Files**: ${projectContext.csvFiles.length} files
- **Shapes Files**: ${projectContext.shapesFiles.length} files
- **Template Files**: ${projectContext.templatesFiles.length} files

## Learning Insights
- **Success Rate**: ${(learningInsights.learningInsights.successRate * 100).toFixed(1)}%
- **Total Executions**: ${learningInsights.learningInsights.totalExecutions}
- **Successful Patterns**: ${learningInsights.learningInsights.successfulPatterns.map(p => p.pattern).join(', ')}
- **Failed Patterns**: ${learningInsights.learningInsights.failedPatterns.map(p => p.pattern).join(', ')}

## Graph Template Requirements
Generate a GitVan template that:

1. **Uses useGraph Composable**: Integrates with the RDF/Turtle + CSV→RDF + SHACL + SPARQL + Nunjucks composable
2. **Handles RDF Data**: Processes Turtle/RDF files with proper baseIRI
3. **Supports CSV Conversion**: Converts CSV data to RDF using csvToRDF
4. **Includes SHACL Validation**: Validates data against SHACL shapes
5. **Executes SPARQL Queries**: Runs SPARQL queries against the data
6. **Uses Nunjucks Templating**: Renders results with Nunjucks templates
7. **Creates Commit-Scoped Snapshots**: Uses GitVan's snapshot system
8. **Follows GitVan Patterns**: Uses defineJob, hooks, and composables

## Template Structure
The template should include:

### Front-Matter (YAML)
- **baseIRI**: RDF base IRI for the project
- **queryName**: Name for the SPARQL query results
- **entityType**: Type for CSV→RDF conversion
- **query**: SPARQL query (optional, can be in separate file)
- **shapes**: SHACL shapes (optional, can be in separate file)

### Template Content
- **Data Loading**: Use addFile(), addCSV(), addTurtle()
- **Validation**: Use setShapes() and validate()
- **Querying**: Use setQuery() and select()
- **Rendering**: Use render() with Nunjucks filters
- **Snapshots**: Use snapshotJSON(), snapshotText(), receipt()

## Example Pattern
\`\`\`javascript
import { defineJob, useGit } from 'file:///Users/sac/gitvan/src/index.mjs'
import { useGraph } from '../composables/graph.mjs'

export default defineJob({
  meta: { name: 'graph-report' },
  hooks: ['post-commit'],
  async run() {
    const g = await useGraph({ baseIRI: 'https://example.org/' })
    await g.addFile('data/ontology.ttl')
    await g.addFile('data/facts.csv')
    await g.setShapes('shapes/validation.shacl.ttl')
    await g.setQuery('queries/analysis.sparql')
    await g.setTemplate('templates/report.md')
    const out = await g.run()
    await useGit().writeFile('REPORT.md', out)
    return { ok: true, artifacts: ['REPORT.md'] }
  }
})
\`\`\`

Generate a complete GitVan template with graph capabilities:
`;

    try {
      const template = await aiTemplateLoop.contextAwareGenerator.generateWithContext(
        graphPrompt,
        projectContext,
        context
      );

      return template.trim();
    } catch (error) {
      logger.error("Failed to generate graph-aware template:", error);
      throw error;
    }
  }

  /**
   * Get graph-specific recommendations
   */
  async getGraphRecommendations(rootPath) {
    const projectContext = await this.analyzeGraphContext(rootPath);
    const recommendations = [];

    // RDF data recommendations
    if (projectContext.rdfFiles.length > 0) {
      recommendations.push({
        type: 'rdf-data',
        priority: 'high',
        message: 'RDF data detected. Consider using Turtle format for better readability.',
        suggestions: [
          'Use consistent baseIRI across all RDF files',
          'Include proper prefixes and namespaces',
          'Validate RDF syntax before processing'
        ]
      });
    }

    // SPARQL query recommendations
    if (projectContext.sparqlFiles.length > 0) {
      recommendations.push({
        type: 'sparql-queries',
        priority: 'medium',
        message: 'SPARQL queries detected. Consider optimizing for performance.',
        suggestions: [
          'Use LIMIT clauses for large result sets',
          'Include proper WHERE clauses for filtering',
          'Test queries against sample data first'
        ]
      });
    }

    // CSV data recommendations
    if (projectContext.csvFiles.length > 0) {
      recommendations.push({
        type: 'csv-data',
        priority: 'medium',
        message: 'CSV data detected. Consider data quality and conversion options.',
        suggestions: [
          'Validate CSV format and encoding',
          'Define proper entity types for RDF conversion',
          'Handle missing values and data types'
        ]
      });
    }

    // SHACL validation recommendations
    if (projectContext.shapesFiles.length > 0) {
      recommendations.push({
        type: 'shacl-validation',
        priority: 'high',
        message: 'SHACL shapes detected. Ensure proper validation coverage.',
        suggestions: [
          'Test shapes against sample data',
          'Include comprehensive constraint definitions',
          'Handle validation errors gracefully'
        ]
      });
    }

    return recommendations;
  }
}

// Export singleton instance
export const graphAwareTemplateGenerator = new GraphAwareTemplateGenerator();
