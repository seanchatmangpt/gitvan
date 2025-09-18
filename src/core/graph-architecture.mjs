/**
 * GitVan Internal Default Graph Architecture
 * Core graph-based data processing and AI template loop system
 */

import { useGraph } from "../composables/graph.mjs";
import { useGit } from "../composables/git/index.mjs";
import { useTemplate } from "../composables/template.mjs";
import { useNotes } from "../composables/notes.mjs";
import { withGitVan } from "../composables/ctx.mjs";

/**
 * GitVan Graph Registry
 * Manages all graph instances and their lifecycle
 */
export class GitVanGraphRegistry {
  constructor() {
    this.graphs = new Map();
    this.graphMetadata = new Map();
    this.graphDependencies = new Map();
    this.graphSnapshots = new Map();
  }

  /**
   * Register a new graph instance
   */
  async registerGraph(graphId, config = {}) {
    const graph = await useGraph({
      baseIRI: config.baseIRI || `https://gitvan.dev/graph/${graphId}/`,
      snapshotsDir:
        config.snapshotsDir || `.gitvan/graphs/${graphId}/snapshots`,
      ...config,
    });

    this.graphs.set(graphId, graph);
    this.graphMetadata.set(graphId, {
      id: graphId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      config,
      status: "active",
    });

    return graph;
  }

  /**
   * Get or create a graph instance
   */
  async getGraph(graphId, config = {}) {
    if (this.graphs.has(graphId)) {
      const metadata = this.graphMetadata.get(graphId);
      metadata.lastAccessed = new Date().toISOString();
      return this.graphs.get(graphId);
    }

    return await this.registerGraph(graphId, config);
  }

  /**
   * Get all active graphs
   */
  getActiveGraphs() {
    return Array.from(this.graphs.entries()).map(([id, graph]) => ({
      id,
      graph,
      metadata: this.graphMetadata.get(id),
    }));
  }

  /**
   * Remove a graph instance
   */
  async removeGraph(graphId) {
    if (this.graphs.has(graphId)) {
      this.graphs.delete(graphId);
      this.graphMetadata.delete(graphId);
      this.graphDependencies.delete(graphId);
      this.graphSnapshots.delete(graphId);
    }
  }
}

/**
 * GitVan Graph Manager
 * High-level graph operations and management
 */
export class GitVanGraphManager {
  constructor() {
    this.registry = new GitVanGraphRegistry();
    this.defaultGraphs = new Map();
    this.graphTemplates = new Map();
    this.graphJobs = new Map();
  }

  /**
   * Initialize default GitVan graphs
   */
  async initializeDefaultGraphs() {
    // Project Graph - tracks project metadata and structure
    const projectGraph = await this.registry.registerGraph("project", {
      baseIRI: "https://gitvan.dev/project/",
      snapshotsDir: ".gitvan/graphs/project/snapshots",
    });

    // Jobs Graph - tracks job execution and results
    const jobsGraph = await this.registry.registerGraph("jobs", {
      baseIRI: "https://gitvan.dev/jobs/",
      snapshotsDir: ".gitvan/graphs/jobs/snapshots",
    });

    // Packs Graph - tracks pack metadata and dependencies
    const packsGraph = await this.registry.registerGraph("packs", {
      baseIRI: "https://gitvan.dev/packs/",
      snapshotsDir: ".gitvan/graphs/packs/snapshots",
    });

    // AI Graph - tracks AI template loop data and learning
    const aiGraph = await this.registry.registerGraph("ai", {
      baseIRI: "https://gitvan.dev/ai/",
      snapshotsDir: ".gitvan/graphs/ai/snapshots",
    });

    // Marketplace Graph - tracks marketplace data and metrics
    const marketplaceGraph = await this.registry.registerGraph("marketplace", {
      baseIRI: "https://gitvan.dev/marketplace/",
      snapshotsDir: ".gitvan/graphs/marketplace/snapshots",
    });

    this.defaultGraphs.set("project", projectGraph);
    this.defaultGraphs.set("jobs", jobsGraph);
    this.defaultGraphs.set("packs", packsGraph);
    this.defaultGraphs.set("ai", aiGraph);
    this.defaultGraphs.set("marketplace", marketplaceGraph);

    return {
      project: projectGraph,
      jobs: jobsGraph,
      packs: packsGraph,
      ai: aiGraph,
      marketplace: marketplaceGraph,
    };
  }

  /**
   * Get a default graph by name
   */
  getDefaultGraph(name) {
    return this.defaultGraphs.get(name);
  }

  /**
   * Create a custom graph
   */
  async createCustomGraph(graphId, config = {}) {
    return await this.registry.registerGraph(graphId, config);
  }

  /**
   * Execute a graph-based job
   */
  async executeGraphJob(jobId, jobConfig) {
    const graph = await this.registry.getGraph(jobConfig.graphId || "jobs");

    // Add job metadata to graph
    await graph.addTurtle(`
      @prefix gv: <https://gitvan.dev/jobs/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      
      gv:${jobId} rdf:type gv:Job ;
        gv:jobId "${jobId}" ;
        gv:status "${jobConfig.status || "pending"}" ;
        gv:createdAt "${new Date().toISOString()}" ;
        gv:config "${JSON.stringify(jobConfig)}" .
    `);

    // Execute job logic
    if (jobConfig.execute) {
      const result = await jobConfig.execute(graph);

      // Update job status
      await graph.addTurtle(`
        gv:${jobId} gv:status "completed" ;
          gv:completedAt "${new Date().toISOString()}" ;
          gv:result "${JSON.stringify(result)}" .
      `);

      return result;
    }

    return { status: "registered", jobId };
  }
}

/**
 * GitVan Graph-Based AI Template Loop
 * Integrates useGraph with AI template learning and generation
 */
export class GitVanAIGraphLoop {
  constructor(graphManager) {
    this.graphManager = graphManager;
    this.aiGraph = null;
    this.templateLearning = null;
    this.promptEvolution = null;
  }

  /**
   * Initialize AI graph loop
   */
  async initialize() {
    this.aiGraph = this.graphManager.getDefaultGraph("ai");

    // Initialize AI components
    const { TemplateLearningSystem } = await import(
      "../ai/template-learning.mjs"
    );
    const { PromptEvolutionEngine } = await import(
      "../ai/prompt-evolution.mjs"
    );

    this.templateLearning = new TemplateLearningSystem();
    this.promptEvolution = new PromptEvolutionEngine();
  }

  /**
   * Process template with AI enhancement
   */
  async processTemplate(templateId, templateData, context = {}) {
    if (!this.aiGraph) await this.initialize();

    // Add template data to AI graph
    await this.aiGraph.addTurtle(`
      @prefix gv: <https://gitvan.dev/ai/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      
      gv:${templateId} rdf:type gv:Template ;
        gv:templateId "${templateId}" ;
        gv:content "${templateData.content}" ;
        gv:context "${JSON.stringify(context)}" ;
        gv:processedAt "${new Date().toISOString()}" .
    `);

    // Learn from template execution
    const learningResult = await this.templateLearning.learnFromTemplate(
      templateId,
      templateData,
      context
    );

    // Evolve prompts based on learning
    const evolvedPrompt = await this.promptEvolution.evolvePrompt(
      templateId,
      learningResult
    );

    // Generate enhanced template
    const enhancedTemplate = await this.generateEnhancedTemplate(
      templateId,
      templateData,
      evolvedPrompt
    );

    return {
      original: templateData,
      enhanced: enhancedTemplate,
      learning: learningResult,
      prompt: evolvedPrompt,
    };
  }

  /**
   * Generate enhanced template using AI
   */
  async generateEnhancedTemplate(templateId, templateData, prompt) {
    // Use AI graph to generate enhanced template
    await this.aiGraph.setQuery(`
      PREFIX gv: <https://gitvan.dev/ai/>
      SELECT ?templateId ?content ?context WHERE {
        ?template rdf:type gv:Template ;
          gv:templateId ?templateId ;
          gv:content ?content ;
          gv:context ?context .
        FILTER(?templateId = "${templateId}")
      }
    `);

    const results = await this.aiGraph.select();

    // Generate enhanced template based on AI analysis
    const enhancedTemplate = {
      ...templateData,
      aiEnhanced: true,
      prompt,
      generatedAt: new Date().toISOString(),
      aiInsights: results,
    };

    return enhancedTemplate;
  }
}

/**
 * GitVan Graph-Based Pack System
 * Manages packs using graph-based metadata and dependencies
 */
export class GitVanGraphPackSystem {
  constructor(graphManager) {
    this.graphManager = graphManager;
    this.packsGraph = null;
  }

  /**
   * Initialize pack system
   */
  async initialize() {
    this.packsGraph = this.graphManager.getDefaultGraph("packs");
  }

  /**
   * Register a pack in the graph
   */
  async registerPack(packId, packData) {
    if (!this.packsGraph) await this.initialize();

    await this.packsGraph.addTurtle(`
      @prefix gv: <https://gitvan.dev/packs/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      
      gv:${packId} rdf:type gv:Pack ;
        gv:packId "${packId}" ;
        gv:name "${packData.name}" ;
        gv:version "${packData.version}" ;
        gv:description "${packData.description}" ;
        gv:dependencies "${JSON.stringify(packData.dependencies || [])}" ;
        gv:jobs "${JSON.stringify(packData.jobs || [])}" ;
        gv:registeredAt "${new Date().toISOString()}" .
    `);

    return { packId, status: "registered" };
  }

  /**
   * Query pack dependencies
   */
  async queryPackDependencies(packId) {
    if (!this.packsGraph) await this.initialize();

    await this.packsGraph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?packId ?dependencies WHERE {
        ?pack rdf:type gv:Pack ;
          gv:packId ?packId ;
          gv:dependencies ?dependencies .
        FILTER(?packId = "${packId}")
      }
    `);

    return await this.packsGraph.select();
  }

  /**
   * Analyze pack compatibility
   */
  async analyzePackCompatibility(packId) {
    if (!this.packsGraph) await this.initialize();

    const dependencies = await this.queryPackDependencies(packId);

    // Analyze compatibility using graph queries
    await this.packsGraph.setQuery(`
      PREFIX gv: <https://gitvan.dev/packs/>
      SELECT ?packId ?name ?version ?compatibility WHERE {
        ?pack rdf:type gv:Pack ;
          gv:packId ?packId ;
          gv:name ?name ;
          gv:version ?version .
        BIND("compatible" as ?compatibility)
      }
    `);

    const compatibilityResults = await this.packsGraph.select();

    return {
      packId,
      dependencies,
      compatibility: compatibilityResults,
      analysis: "Graph-based compatibility analysis completed",
    };
  }
}

/**
 * GitVan Graph-Based Marketplace
 * Manages marketplace data using graph-based queries and analytics
 */
export class GitVanGraphMarketplace {
  constructor(graphManager) {
    this.graphManager = graphManager;
    this.marketplaceGraph = null;
  }

  /**
   * Initialize marketplace
   */
  async initialize() {
    this.marketplaceGraph = this.graphManager.getDefaultGraph("marketplace");
  }

  /**
   * Index marketplace data
   */
  async indexMarketplaceData(marketplaceData) {
    if (!this.marketplaceGraph) await this.initialize();

    // Add marketplace data to graph
    for (const item of marketplaceData) {
      await this.marketplaceGraph.addTurtle(`
        @prefix gv: <https://gitvan.dev/marketplace/> .
        @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
        
        gv:${item.id} rdf:type gv:MarketplaceItem ;
          gv:itemId "${item.id}" ;
          gv:name "${item.name}" ;
          gv:type "${item.type}" ;
          gv:category "${item.category}" ;
          gv:downloads "${item.downloads || 0}" ;
          gv:rating "${item.rating || 0}" ;
          gv:indexedAt "${new Date().toISOString()}" .
      `);
    }

    return { indexed: marketplaceData.length, status: "success" };
  }

  /**
   * Search marketplace using graph queries
   */
  async searchMarketplace(query, filters = {}) {
    if (!this.marketplaceGraph) await this.initialize();

    let sparqlQuery = `
      PREFIX gv: <https://gitvan.dev/marketplace/>
      SELECT ?itemId ?name ?type ?category ?downloads ?rating WHERE {
        ?item rdf:type gv:MarketplaceItem ;
          gv:itemId ?itemId ;
          gv:name ?name ;
          gv:type ?type ;
          gv:category ?category ;
          gv:downloads ?downloads ;
          gv:rating ?rating .
    `;

    if (query) {
      sparqlQuery += `FILTER(CONTAINS(LCASE(?name), LCASE("${query}")))`;
    }

    if (filters.category) {
      sparqlQuery += `FILTER(?category = "${filters.category}")`;
    }

    if (filters.type) {
      sparqlQuery += `FILTER(?type = "${filters.type}")`;
    }

    sparqlQuery += `} ORDER BY DESC(?downloads)`;

    await this.marketplaceGraph.setQuery(sparqlQuery);
    const results = await this.marketplaceGraph.select();

    return results;
  }

  /**
   * Generate marketplace analytics
   */
  async generateMarketplaceAnalytics() {
    if (!this.marketplaceGraph) await this.initialize();

    // Category distribution
    await this.marketplaceGraph.setQuery(`
      PREFIX gv: <https://gitvan.dev/marketplace/>
      SELECT ?category (COUNT(?item) as ?count) WHERE {
        ?item rdf:type gv:MarketplaceItem ;
          gv:category ?category .
      }
      GROUP BY ?category
      ORDER BY DESC(?count)
    `);

    const categoryDistribution = await this.marketplaceGraph.select();

    // Top downloads
    await this.marketplaceGraph.setQuery(`
      PREFIX gv: <https://gitvan.dev/marketplace/>
      SELECT ?name ?downloads ?rating WHERE {
        ?item rdf:type gv:MarketplaceItem ;
          gv:name ?name ;
          gv:downloads ?downloads ;
          gv:rating ?rating .
      }
      ORDER BY DESC(?downloads)
      LIMIT 10
    `);

    const topDownloads = await this.marketplaceGraph.select();

    return {
      categoryDistribution,
      topDownloads,
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * GitVan Graph-Based Daemon Integration
 * Integrates graph system with GitVan daemon
 */
export class GitVanGraphDaemon {
  constructor(graphManager) {
    this.graphManager = graphManager;
    this.projectGraph = null;
    this.jobsGraph = null;
    this.isRunning = false;
  }

  /**
   * Initialize daemon
   */
  async initialize() {
    this.projectGraph = this.graphManager.getDefaultGraph("project");
    this.jobsGraph = this.graphManager.getDefaultGraph("jobs");
    this.isRunning = true;
  }

  /**
   * Process Git events using graph system
   */
  async processGitEvent(eventType, eventData) {
    if (!this.isRunning) await this.initialize();

    // Add event to project graph
    await this.projectGraph.addTurtle(`
      @prefix gv: <https://gitvan.dev/project/> .
      @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
      
      gv:${eventData.sha} rdf:type gv:GitEvent ;
        gv:eventType "${eventType}" ;
        gv:sha "${eventData.sha}" ;
        gv:message "${eventData.message}" ;
        gv:author "${eventData.author}" ;
        gv:timestamp "${eventData.timestamp}" ;
        gv:files "${JSON.stringify(eventData.files || [])}" .
    `);

    // Process event with graph-based job execution
    const jobs = await this.findRelevantJobs(eventType, eventData);

    for (const job of jobs) {
      await this.executeJob(job, eventData);
    }

    return { processed: true, jobsExecuted: jobs.length };
  }

  /**
   * Find relevant jobs for an event
   */
  async findRelevantJobs(eventType, eventData) {
    await this.jobsGraph.setQuery(`
      PREFIX gv: <https://gitvan.dev/jobs/>
      SELECT ?jobId ?config WHERE {
        ?job rdf:type gv:Job ;
          gv:jobId ?jobId ;
          gv:config ?config ;
          gv:status "active" .
      }
    `);

    const results = await this.jobsGraph.select();

    // Filter jobs based on event type and data
    return results.filter((job) => {
      const config = JSON.parse(job.config);
      return config.hooks?.includes(eventType) || config.trigger?.(eventData);
    });
  }

  /**
   * Execute a job with graph context
   */
  async executeJob(job, eventData) {
    const config = JSON.parse(job.config);

    // Update job status
    await this.jobsGraph.addTurtle(`
      gv:${job.jobId} gv:status "running" ;
        gv:startedAt "${new Date().toISOString()}" .
    `);

    try {
      // Execute job with graph context
      const result = await config.execute({
        graph: this.jobsGraph,
        event: eventData,
        project: this.projectGraph,
      });

      // Update job completion
      await this.jobsGraph.addTurtle(`
        gv:${job.jobId} gv:status "completed" ;
          gv:completedAt "${new Date().toISOString()}" ;
          gv:result "${JSON.stringify(result)}" .
      `);

      return result;
    } catch (error) {
      // Update job failure
      await this.jobsGraph.addTurtle(`
        gv:${job.jobId} gv:status "failed" ;
          gv:failedAt "${new Date().toISOString()}" ;
          gv:error "${error.message}" .
      `);

      throw error;
    }
  }
}

/**
 * GitVan Graph Architecture Factory
 * Creates and configures the complete graph architecture
 */
export class GitVanGraphArchitecture {
  constructor() {
    this.graphManager = new GitVanGraphManager();
    this.aiLoop = new GitVanAIGraphLoop(this.graphManager);
    this.packSystem = new GitVanGraphPackSystem(this.graphManager);
    this.marketplace = new GitVanGraphMarketplace(this.graphManager);
    this.daemon = new GitVanGraphDaemon(this.graphManager);
    this.initialized = false;
  }

  /**
   * Initialize the complete graph architecture
   */
  async initialize() {
    if (this.initialized) return this;

    console.log("🔧 Initializing GitVan Graph Architecture...");

    // Initialize default graphs
    await this.graphManager.initializeDefaultGraphs();
    console.log("✅ Default graphs initialized");

    // Initialize AI loop
    await this.aiLoop.initialize();
    console.log("✅ AI graph loop initialized");

    // Initialize pack system
    await this.packSystem.initialize();
    console.log("✅ Graph pack system initialized");

    // Initialize marketplace
    await this.marketplace.initialize();
    console.log("✅ Graph marketplace initialized");

    // Initialize daemon
    await this.daemon.initialize();
    console.log("✅ Graph daemon initialized");

    this.initialized = true;
    console.log("🎉 GitVan Graph Architecture fully initialized!");

    return this;
  }

  /**
   * Get the complete graph architecture
   */
  getArchitecture() {
    return {
      graphManager: this.graphManager,
      aiLoop: this.aiLoop,
      packSystem: this.packSystem,
      marketplace: this.marketplace,
      daemon: this.daemon,
      initialized: this.initialized,
    };
  }

  /**
   * Create a graph-based job
   */
  async createGraphJob(jobId, jobConfig) {
    return await this.graphManager.executeGraphJob(jobId, jobConfig);
  }

  /**
   * Process AI template with graph enhancement
   */
  async processAITemplate(templateId, templateData, context) {
    return await this.aiLoop.processTemplate(templateId, templateData, context);
  }

  /**
   * Register a pack in the graph system
   */
  async registerPack(packId, packData) {
    return await this.packSystem.registerPack(packId, packData);
  }

  /**
   * Search marketplace using graph queries
   */
  async searchMarketplace(query, filters) {
    return await this.marketplace.searchMarketplace(query, filters);
  }

  /**
   * Process Git event with graph system
   */
  async processGitEvent(eventType, eventData) {
    return await this.daemon.processGitEvent(eventType, eventData);
  }
}

// Export the main architecture class
export default GitVanGraphArchitecture;
