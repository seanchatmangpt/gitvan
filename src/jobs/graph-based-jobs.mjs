/**
 * GitVan Graph-Based Job System
 * Integrates jobs with the graph architecture for enhanced data processing
 */

import { defineJob } from "../runtime/define-job.mjs";
import { GitVanGraphArchitecture } from "./graph-architecture.mjs";

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
  meta: {
    name: "project:analysis",
    description: "Analyze project structure and metadata using graph queries",
  },
  graphId: "project",
  hooks: ["post-commit"],
  async run({ graph, inputs }) {
    // Analyze project files
    const projectFiles = inputs.files || [];

    // Add project analysis to graph
    await graph.addTurtle(`
      @prefix gv: <https://gitvan.dev/project/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      
      gv:analysis_${Date.now()} rdf:type gv:ProjectAnalysis ;
        gv:analyzedAt "${new Date().toISOString()}" ;
        gv:fileCount "${projectFiles.length}" ;
        gv:files "${JSON.stringify(projectFiles)}" .
    `);

    // Query project metrics
    await graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/project/>
      SELECT ?fileCount ?analyzedAt WHERE {
        ?analysis rdf:type gv:ProjectAnalysis ;
          gv:fileCount ?fileCount ;
          gv:analyzedAt ?analyzedAt .
      }
      ORDER BY DESC(?analyzedAt)
      LIMIT 1
    `);

    const metrics = await graph.select();

    return {
      status: "completed",
      metrics: metrics[0] || {},
      analysis: "Project structure analyzed using graph queries",
    };
  },
});

// AI Template Processing Job
export const aiTemplateJob = defineGraphJob({
  meta: {
    name: "ai:template-processing",
    description: "Process templates using AI graph loop enhancement",
  },
  graphId: "ai",
  hooks: ["post-commit"],
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
  meta: {
    name: "pack:dependency-analysis",
    description: "Analyze pack dependencies using graph queries",
  },
  graphId: "packs",
  hooks: ["post-commit"],
  async run({ graph, inputs }) {
    const packId = inputs.packId || "current";

    // Analyze pack dependencies
    await graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?packId ?dependencies ?compatibility WHERE {
        ?pack rdf:type gv:Pack ;
          gv:packId ?packId ;
          gv:dependencies ?dependencies .
        FILTER(?packId = "${packId}")
      }
    `);

    const dependencies = await graph.select();

    return {
      status: "completed",
      packId,
      dependencies,
      analysis: "Pack dependencies analyzed using graph queries",
    };
  },
});

// Marketplace Indexing Job
export const marketplaceIndexJob = defineGraphJob({
  meta: {
    name: "marketplace:index",
    description: "Index marketplace data using graph storage",
  },
  graphId: "marketplace",
  hooks: ["post-commit"],
  async run({ graph, inputs }) {
    const marketplaceData = inputs.marketplaceData || [];

    // Index marketplace data
    for (const item of marketplaceData) {
      await graph.addTurtle(`
        @prefix gv: <https://gitvan.dev/marketplace/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
        
        gv:${item.id} rdf:type gv:MarketplaceItem ;
          gv:itemId "${item.id}" ;
          gv:name "${item.name}" ;
          gv:type "${item.type}" ;
          gv:category "${item.category}" ;
          gv:indexedAt "${new Date().toISOString()}" .
      `);
    }

    return {
      status: "completed",
      indexed: marketplaceData.length,
      analysis: "Marketplace data indexed using graph storage",
    };
  },
});

// Graph Analytics Job
export const graphAnalyticsJob = defineGraphJob({
  meta: {
    name: "graph:analytics",
    description: "Generate analytics from graph data",
  },
  graphId: "jobs",
  hooks: ["post-commit"],
  async run({ graph, graphArch }) {
    // Generate analytics from all graphs
    const analytics = {};

    // Project analytics
    const projectGraph = graphArch.graphManager.getDefaultGraph("project");
    await projectGraph.setQuery(`
      PREFIX gv: <https://gitvan.dev/project/>
      SELECT (COUNT(?event) as ?eventCount) WHERE {
        ?event rdf:type gv:GitEvent .
      }
    `);
    analytics.project = await projectGraph.select();

    // Jobs analytics
    await graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/jobs/>
      SELECT (COUNT(?job) as ?jobCount) ?status WHERE {
        ?job rdf:type gv:Job ;
          gv:status ?status .
      }
      GROUP BY ?status
    `);
    analytics.jobs = await graph.select();

    // Packs analytics
    const packsGraph = graphArch.graphManager.getDefaultGraph("packs");
    await packsGraph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT (COUNT(?pack) as ?packCount) WHERE {
        ?pack rdf:type gv:Pack .
      }
    `);
    analytics.packs = await packsGraph.select();

    // AI analytics
    const aiGraph = graphArch.graphManager.getDefaultGraph("ai");
    await aiGraph.setQuery(`
      PREFIX gv: <https://gitvan.dev/ai/>
      SELECT (COUNT(?template) as ?templateCount) WHERE {
        ?template rdf:type gv:Template .
      }
    `);
    analytics.ai = await aiGraph.select();

    return {
      status: "completed",
      analytics,
      generatedAt: new Date().toISOString(),
    };
  },
});

// Graph-Based Report Generation Job
export const graphReportJob = defineGraphJob({
  meta: {
    name: "graph:report-generation",
    description: "Generate reports using graph data and templates",
  },
  graphId: "jobs",
  hooks: ["post-commit"],
  async run({ graph, inputs }) {
    const reportType = inputs.reportType || "summary";
    const template =
      inputs.template ||
      `
# GitVan Graph Report

## Summary
Generated at: {{ generatedAt }}

## Project Metrics
{% for metric in projectMetrics %}
- {{ metric.metric }}: {{ metric.value }}
{% endfor %}

## Job Statistics
{% for stat in jobStats %}
- {{ stat.status }}: {{ stat.count }}
{% endfor %}
`;

    // Query data for report
    await graph.setQuery(`
      PREFIX gv: <https://gitvan.dev/jobs/>
      SELECT ?status (COUNT(?job) as ?count) WHERE {
        ?job rdf:type gv:Job ;
          gv:status ?status .
      }
      GROUP BY ?status
    `);

    const jobStats = await graph.select();

    // Generate report using template
    await graph.setTemplate(template);
    const report = await graph.render({
      generatedAt: new Date().toISOString(),
      projectMetrics: [
        {
          metric: "Total Jobs",
          value: jobStats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
        },
      ],
      jobStats,
    });

    // Save report
    await graph.snapshotText("reports", `${reportType}_report`, report, "md");

    return {
      status: "completed",
      reportType,
      report,
      saved: true,
    };
  },
});

// Graph-Based Data Migration Job
export const graphMigrationJob = defineGraphJob({
  meta: {
    name: "graph:data-migration",
    description: "Migrate data between graph systems",
  },
  graphId: "jobs",
  hooks: ["post-commit"],
  async run({ graph, inputs }) {
    const sourceGraphId = inputs.sourceGraphId || "jobs";
    const targetGraphId = inputs.targetGraphId || "project";
    const migrationQuery =
      inputs.migrationQuery ||
      `
      PREFIX gv: <https://gitvan.dev/jobs/>
      SELECT ?jobId ?status ?createdAt WHERE {
        ?job rdf:type gv:Job ;
          gv:jobId ?jobId ;
          gv:status ?status ;
          gv:createdAt ?createdAt .
      }
    `;

    // Get source graph
    const graphArch = new GitVanGraphArchitecture();
    await graphArch.initialize();
    const sourceGraph = await graphArch.graphManager.registry.getGraph(
      sourceGraphId
    );
    const targetGraph = await graphArch.graphManager.registry.getGraph(
      targetGraphId
    );

    // Execute migration query
    await sourceGraph.setQuery(migrationQuery);
    const migrationData = await sourceGraph.select();

    // Migrate data to target graph
    for (const item of migrationData) {
      await targetGraph.addTurtle(`
        @prefix gv: <https://gitvan.dev/migration/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
        
        gv:migrated_${item.jobId} rdf:type gv:MigrationRecord ;
          gv:originalId "${item.jobId}" ;
          gv:status "${item.status}" ;
          gv:createdAt "${item.createdAt}" ;
          gv:migratedAt "${new Date().toISOString()}" .
      `);
    }

    return {
      status: "completed",
      migrated: migrationData.length,
      sourceGraphId,
      targetGraphId,
      migration: "Data migration completed using graph queries",
    };
  },
});

// Export all graph-based jobs
export const graphJobs = {
  projectAnalysis: projectAnalysisJob,
  aiTemplate: aiTemplateJob,
  packDependency: packDependencyJob,
  marketplaceIndex: marketplaceIndexJob,
  graphAnalytics: graphAnalyticsJob,
  graphReport: graphReportJob,
  graphMigration: graphMigrationJob,
};

export default graphJobs;
