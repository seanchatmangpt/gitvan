/**
 * GitVan Graph-Based Job System
 * Integrates jobs with the graph architecture for enhanced data processing
 */

import { defineJob } from "../runtime/define-job.mjs";
import { GitVanGraphArchitecture } from "../core/graph-architecture.mjs";

/**
 * Graph-Based Job Definition
 * Extends defineJob with graph capabilities
 */
export function defineGraphJob(config) {
  const { graphId, graphConfig, ...jobConfig } = config;

  return defineJob({
    ...jobConfig,
    async run({ inputs, context }) {
      // Initialize graph architecture if needed
      const graphArch = new GitVanGraphArchitecture();
      await graphArch.initialize();

      // Get the specified graph
      const graph = await graphArch.graphManager.registry.getGraph(
        graphId || "jobs",
        graphConfig || {}
      );

      // Execute the original job logic with graph context
      if (jobConfig.run) {
        return await jobConfig.run({
          inputs,
          context,
          graph,
          graphArch,
        });
      }

      return { status: "completed", graphId };
    },
  });
}

/**
 * Graph-Based Job Types
 */

// Project Analysis Job
export const projectAnalysisJob = defineGraphJob({
  name: "project:analysis",
  meta: {
    description: "Analyze project structure and metadata using graph queries",
  },
  graphId: "project",
  hooks: [{ event: "post-commit" }],
  async run({ graph, inputs }) {
    // Analyze project files
    const projectFiles = inputs.files || [];

    // Add project analysis to graph
    await graph.addTurtle(`
      @prefix gv: <https://gitvan.dev/ontology#> .
      @prefix dct: <http://purl.org/dc/terms/> .
      
      <https://gitvan.dev/analysis/project> a gv:ProjectAnalysis ;
          dct:title "Project Analysis" ;
          dct:created "${new Date().toISOString()}"^^xsd:dateTime ;
          gv:analyzedFiles ${projectFiles.length} .
    `);

    return {
      status: "completed",
      analyzedFiles: projectFiles.length,
      graphId: "project",
    };
  },
});

// AI Template Processing Job
export const aiTemplateJob = defineGraphJob({
  name: "ai:template-processing",
  meta: {
    description: "Process templates using AI graph loop enhancement",
  },
  graphId: "ai",
  hooks: [{ event: "post-commit" }],
  async run({ graph, graphArch, inputs }) {
    const templateId = inputs.templateId || `template_${Date.now()}`;
    const templateData = inputs.templateData || {};
    const context = inputs.context || {};

    // Process template with AI enhancement
    const result = await graphArch.processAITemplate(
      templateId,
      templateData,
      context
    );

    return {
      status: "completed",
      templateId,
      result,
      aiEnhanced: true,
    };
  },
});

// Pack Dependency Analysis Job
export const packDependencyJob = defineGraphJob({
  name: "pack:dependency-analysis",
  meta: {
    description: "Analyze pack dependencies using graph queries",
  },
  graphId: "packs",
  hooks: [{ event: "pre-commit" }],
  async run({ graph, inputs }) {
    const packId = inputs.packId || "unknown";
    const dependencies = inputs.dependencies || [];

    // Add dependency analysis to graph
    await graph.addTurtle(`
      @prefix gv: <https://gitvan.dev/ontology#> .
      @prefix dct: <http://purl.org/dc/terms/> .
      
      <https://gitvan.dev/pack/${packId}> a gv:Pack ;
          dct:title "${packId}" ;
          gv:dependencyCount ${dependencies.length} .
    `);

    return {
      status: "completed",
      packId,
      dependencies: dependencies.length,
    };
  },
});

// Marketplace Index Job
export const marketplaceIndexJob = defineGraphJob({
  name: "marketplace:index",
  meta: {
    description: "Index marketplace data for search and discovery",
  },
  graphId: "marketplace",
  hooks: [{ event: "post-commit" }],
  async run({ graph, inputs }) {
    const marketplaceData = inputs.data || [];

    // Index marketplace data
    for (const item of marketplaceData) {
      await graph.addTurtle(`
        @prefix gv: <https://gitvan.dev/ontology#> .
        @prefix dct: <http://purl.org/dc/terms/> .
        
        <https://gitvan.dev/marketplace/${item.id}> a gv:MarketplaceItem ;
            dct:title "${item.title}" ;
            dct:description "${item.description}" ;
            gv:category "${item.category}" .
      `);
    }

    return {
      status: "completed",
      indexedItems: marketplaceData.length,
    };
  },
});

// Graph Analytics Job
export const graphAnalyticsJob = defineGraphJob({
  name: "graph:analytics",
  meta: {
    description: "Generate analytics from graph data",
  },
  graphId: "analytics",
  hooks: [{ event: "post-commit" }],
  async run({ graph, inputs }) {
    const analyticsQuery = inputs.query || `
      PREFIX gv: <https://gitvan.dev/ontology#>
      SELECT ?type (COUNT(?item) as ?count) WHERE {
        ?item rdf:type ?type .
      }
      GROUP BY ?type
      ORDER BY DESC(?count)
    `;

    await graph.setQuery(analyticsQuery);
    const analytics = await graph.select();

    return {
      status: "completed",
      analytics,
      query: analyticsQuery,
    };
  },
});

// Graph Report Job
export const graphReportJob = defineGraphJob({
  name: "graph:report",
  meta: {
    description: "Generate comprehensive graph reports",
  },
  graphId: "reports",
  hooks: [{ event: "post-commit" }],
  async run({ graph, inputs }) {
    const reportType = inputs.type || "summary";
    const reportData = inputs.data || {};

    // Generate report data
    const report = {
      type: reportType,
      timestamp: new Date().toISOString(),
      data: reportData,
      graphStats: {
        quads: graph.store.size,
        subjects: new Set([...graph.store].map(q => q.subject.value)).size,
        predicates: new Set([...graph.store].map(q => q.predicate.value)).size,
        objects: new Set([...graph.store].map(q => q.object.value)).size,
      },
    };

    return {
      status: "completed",
      report,
    };
  },
});

// Graph Migration Job
export const graphMigrationJob = defineGraphJob({
  name: "graph:migration",
  meta: {
    description: "Migrate graph data between formats or versions",
  },
  graphId: "migration",
  hooks: [{ event: "pre-commit" }],
  async run({ graph, inputs }) {
    const sourceFormat = inputs.sourceFormat || "turtle";
    const targetFormat = inputs.targetFormat || "nquads";
    const migrationData = inputs.data || "";

    // Perform migration
    let migratedData;
    if (sourceFormat === "turtle" && targetFormat === "nquads") {
      const parser = new (await import("n3")).Parser();
      const quads = parser.parse(migrationData);
      const writer = new (await import("n3")).Writer({ format: "N-Quads" });
      migratedData = writer.quadsToString(quads);
    } else {
      migratedData = migrationData; // No conversion needed
    }

    return {
      status: "completed",
      sourceFormat,
      targetFormat,
      migratedData,
    };
  },
});

// Export all jobs as a collection
export const graphJobs = {
  "project:analysis": projectAnalysisJob,
  "ai:template-processing": aiTemplateJob,
  "pack:dependency-analysis": packDependencyJob,
  "marketplace:index": marketplaceIndexJob,
  "graph:analytics": graphAnalyticsJob,
  "graph:report": graphReportJob,
  "graph:migration": graphMigrationJob,
};

export default graphJobs;