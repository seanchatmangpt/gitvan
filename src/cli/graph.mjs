/**
 * GitVan Graph-Based CLI Commands
 * CLI interface for the graph architecture
 */

import { GitVanGraphArchitecture } from "../core/graph-architecture.mjs";
import { graphJobs } from "../jobs/graph-based-jobs.mjs";
import { useTurtle } from "../composables/turtle.mjs";
import { withGitVan } from "../composables/ctx.mjs";
import { join } from "pathe";

/**
 * Graph CLI Commands
 */
export class GitVanGraphCLI {
  constructor() {
    this.graphArch = new GitVanGraphArchitecture();
    this.initialized = false;
  }

  /**
   * Initialize graph architecture
   */
  async initialize() {
    if (!this.initialized) {
      await this.graphArch.initialize();
      this.initialized = true;
    }
  }

  /**
   * Graph status command
   */
  async status() {
    await this.initialize();

    const graphs = this.graphArch.graphManager.registry.getActiveGraphs();

    console.log("📊 GitVan Graph Architecture Status");
    console.log("=".repeat(50));

    for (const { id, metadata } of graphs) {
      console.log(`📈 ${id}:`);
      console.log(`   Status: ${metadata.status}`);
      console.log(`   Created: ${metadata.createdAt}`);
      console.log(`   Last Accessed: ${metadata.lastAccessed}`);
      console.log(`   Base IRI: ${metadata.config.baseIRI}`);
      console.log("");
    }

    return { graphs: graphs.length, status: "active" };
  }

  /**
   * Graph query command
   */
  async query(graphId, sparqlQuery, options = {}) {
    await this.initialize();

    const graph = await this.graphArch.graphManager.registry.getGraph(graphId);
    await graph.setQuery(sparqlQuery);

    const results = await graph.select();

    if (options.format === "json") {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log("🔍 Graph Query Results:");
      console.log("=".repeat(50));
      console.table(results);
    }

    return { results, count: results.length };
  }

  /**
   * Graph add data command
   */
  async addData(graphId, data, options = {}) {
    await this.initialize();

    const graph = await this.graphArch.graphManager.registry.getGraph(graphId);

    if (options.type === "csv") {
      await graph.addCSV(data);
    } else if (options.type === "turtle") {
      await graph.addTurtle(data);
    } else {
      await graph.addFile(data);
    }

    console.log(`✅ Data added to graph: ${graphId}`);
    return { status: "success", graphId };
  }

  /**
   * Graph template command
   */
  async template(graphId, templatePath, options = {}) {
    await this.initialize();

    const graph = await this.graphArch.graphManager.registry.getGraph(graphId);
    await graph.setTemplate(templatePath);

    const rendered = await graph.render();

    if (options.output) {
      await graph.snapshotText("cli", "template_output", rendered, "md");
      console.log(`✅ Template rendered and saved to: ${options.output}`);
    } else {
      console.log("📝 Template Output:");
      console.log("=".repeat(50));
      console.log(rendered);
    }

    return { rendered, saved: !!options.output };
  }

  /**
   * Graph analytics command
   */
  async analytics(graphId, options = {}) {
    await this.initialize();

    const graph = await this.graphArch.graphManager.registry.getGraph(graphId);

    // Generate analytics query
    const analyticsQuery =
      options.query ||
      `
      PREFIX gv: <https://gitvan.dev/${graphId}/>
      SELECT ?type (COUNT(?item) as ?count) WHERE {
        ?item rdf:type ?type .
      }
      GROUP BY ?type
      ORDER BY DESC(?count)
    `;

    await graph.setQuery(analyticsQuery);
    const analytics = await graph.select();

    console.log(`📊 Analytics for graph: ${graphId}`);
    console.log("=".repeat(50));
    console.table(analytics);

    return { analytics, graphId };
  }

  /**
   * Graph snapshot command
   */
  async snapshot(graphId, options = {}) {
    await this.initialize();

    const graph = await this.graphArch.graphManager.registry.getGraph(graphId);

    const snapshot = await graph.snapshotJSON(
      options.family || "cli",
      options.name || "snapshot",
      { timestamp: new Date().toISOString(), graphId }
    );

    console.log(`📸 Snapshot created: ${snapshot.path}`);
    return { snapshot, path: snapshot.path };
  }

  /**
   * Graph job command
   */
  async runJob(jobName, inputs = {}) {
    await this.initialize();

    const job = graphJobs[jobName];
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    console.log(`🚀 Running graph job: ${jobName}`);

    const result = await job.run({ inputs });

    console.log(`✅ Job completed: ${jobName}`);
    console.log("Result:", result);

    return result;
  }

  /**
   * Graph AI command
   */
  async ai(templateId, templateData, context = {}) {
    await this.initialize();

    console.log(`🤖 Processing AI template: ${templateId}`);

    const result = await this.graphArch.processAITemplate(
      templateId,
      templateData,
      context
    );

    console.log(`✅ AI template processed: ${templateId}`);
    console.log("Result:", result);

    return result;
  }

  /**
   * Graph pack command
   */
  async pack(action, packId, packData = {}) {
    await this.initialize();

    switch (action) {
      case "register":
        console.log(`📦 Registering pack: ${packId}`);
        const registerResult = await this.graphArch.registerPack(
          packId,
          packData
        );
        console.log(`✅ Pack registered: ${packId}`);
        return registerResult;

      case "analyze":
        console.log(`🔍 Analyzing pack: ${packId}`);
        const analysisResult =
          await this.graphArch.packSystem.analyzePackCompatibility(packId);
        console.log(`✅ Pack analysis completed: ${packId}`);
        return analysisResult;

      default:
        throw new Error(`Unknown pack action: ${action}`);
    }
  }

  /**
   * Graph marketplace command
   */
  async marketplace(action, query = "", filters = {}) {
    await this.initialize();

    switch (action) {
      case "search":
        console.log(`🔍 Searching marketplace: ${query}`);
        const searchResult = await this.graphArch.searchMarketplace(
          query,
          filters
        );
        console.log(`✅ Marketplace search completed`);
        console.table(searchResult);
        return searchResult;

      case "index":
        console.log(`📊 Indexing marketplace data`);
        const indexResult =
          await this.graphArch.marketplace.indexMarketplaceData(query);
        console.log(`✅ Marketplace indexed: ${indexResult.indexed} items`);
        return indexResult;

      case "analytics":
        console.log(`📈 Generating marketplace analytics`);
        const analyticsResult =
          await this.graphArch.marketplace.generateMarketplaceAnalytics();
        console.log(`✅ Marketplace analytics generated`);
        return analyticsResult;

      default:
        throw new Error(`Unknown marketplace action: ${action}`);
    }
  }

  /**
   * Graph daemon command
   */
  async daemon(action, eventData = {}) {
    await this.initialize();

    switch (action) {
      case "start":
        console.log(`🚀 Starting graph daemon`);
        await this.graphArch.daemon.initialize();
        console.log(`✅ Graph daemon started`);
        return { status: "started" };

      case "process":
        console.log(`🔄 Processing Git event: ${eventData.type}`);
        const processResult = await this.graphArch.processGitEvent(
          eventData.type,
          eventData
        );
        console.log(
          `✅ Git event processed: ${processResult.jobsExecuted} jobs executed`
        );
        return processResult;

      default:
        throw new Error(`Unknown daemon action: ${action}`);
    }
  }

  /**
   * Graph help command
   */
  async help() {
    console.log("🔧 GitVan Graph CLI Commands");
    console.log("=".repeat(50));
    console.log("");
    console.log("📊 Status & Management:");
    console.log(
      "  gitvan graph status                    - Show graph architecture status"
    );
    console.log(
      "  gitvan graph query <graphId> <query>   - Execute SPARQL query"
    );
    console.log("  gitvan graph add <graphId> <data>      - Add data to graph");
    console.log("  gitvan graph snapshot <graphId>       - Create snapshot");
    console.log("");
    console.log("💾 Persistence Commands:");
    console.log("  gitvan graph save <fileName>          - Save current graph to file");
    console.log("  gitvan graph load <fileName>          - Load graph from file");
    console.log("  gitvan graph save-default             - Save to default.ttl");
    console.log("  gitvan graph load-default             - Load from default.ttl");
    console.log("  gitvan graph init-default             - Initialize default graph");
    console.log("  gitvan graph list-files               - List available Turtle files");
    console.log("  gitvan graph stats                    - Show store statistics");
    console.log("");
    console.log("🎨 Templates & Analytics:");
    console.log("  gitvan graph template <graphId> <path> - Render template");
    console.log(
      "  gitvan graph analytics <graphId>       - Generate analytics"
    );
    console.log("");
    console.log("🚀 Jobs & AI:");
    console.log(
      "  gitvan graph job <jobName>             - Run graph-based job"
    );
    console.log(
      "  gitvan graph ai <templateId> <data>    - Process AI template"
    );
    console.log("");
    console.log("📦 Packs & Marketplace:");
    console.log("  gitvan graph pack register <id> <data> - Register pack");
    console.log("  gitvan graph pack analyze <id>         - Analyze pack");
    console.log("  gitvan graph marketplace search <q>   - Search marketplace");
    console.log("  gitvan graph marketplace index <data> - Index marketplace");
    console.log("");
    console.log("🔄 Daemon:");
    console.log(
      "  gitvan graph daemon start              - Start graph daemon"
    );
    console.log("  gitvan graph daemon process <event>    - Process Git event");
    console.log("");
    console.log("Available Jobs:");
    Object.keys(graphJobs).forEach((jobName) => {
      console.log(`  - ${jobName}`);
    });
  }

  // ============== Persistence Commands ==============

  /**
   * Save graph to file
   */
  async save(fileName, options = {}) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: options.graphDir || "graph" });
      
      const result = await turtle.saveGraph(fileName, {
        validate: options.validate !== false,
        createBackup: options.backup || false,
        prefixes: options.prefixes,
      });

      console.log(`✅ Graph saved to: ${result.path}`);
      console.log(`📊 Size: ${result.bytes} bytes`);
      return result;
    });
  }

  /**
   * Load graph from file
   */
  async load(fileName, options = {}) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: options.graphDir || "graph" });
      
      const result = await turtle.loadGraph(fileName, {
        validate: options.validate !== false,
        merge: options.merge !== false,
        baseIRI: options.baseIRI,
      });

      console.log(`✅ Graph loaded from: ${result.path}`);
      console.log(`📊 Loaded quads: ${result.quads}`);
      return result;
    });
  }

  /**
   * Save to default graph location
   */
  async saveDefault(options = {}) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: options.graphDir || "graph" });
      
      const result = await turtle.saveDefaultGraph({
        validate: options.validate !== false,
        createBackup: options.backup !== false,
        prefixes: options.prefixes,
      });

      console.log(`✅ Default graph saved to: ${result.path}`);
      console.log(`📊 Size: ${result.bytes} bytes`);
      return result;
    });
  }

  /**
   * Load from default graph location
   */
  async loadDefault(options = {}) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: options.graphDir || "graph" });
      
      const result = await turtle.loadDefaultGraph({
        validate: options.validate !== false,
        merge: options.merge !== false,
        baseIRI: options.baseIRI,
      });

      if (result) {
        console.log(`✅ Default graph loaded from: ${result.path}`);
        console.log(`📊 Loaded quads: ${result.quads}`);
      } else {
        console.log(`ℹ️  No default graph found`);
      }
      return result;
    });
  }

  /**
   * Initialize default graph
   */
  async initDefault(options = {}) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: options.graphDir || "graph" });
      
      const result = await turtle.initializeDefaultGraph({
        templatePath: options.templatePath,
        validate: options.validate !== false,
      });

      if (result.created) {
        console.log(`✅ Default graph initialized: ${result.path}`);
        console.log(`📊 Size: ${result.bytes} bytes`);
      } else {
        console.log(`ℹ️  Default graph already exists: ${result.path}`);
        console.log(`📊 Size: ${result.bytes} bytes`);
      }
      return result;
    });
  }

  /**
   * List available Turtle files
   */
  async listFiles(options = {}) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: options.graphDir || "graph" });
      
      const files = await turtle.listGraphFiles();
      
      console.log(`📁 Found ${files.length} Turtle files:`);
      if (files.length === 0) {
        console.log("   (no files found)");
      } else {
        files.forEach(file => console.log(`   - ${file}`));
      }
      return files;
    });
  }

  /**
   * Show store statistics
   */
  async stats(options = {}) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: options.graphDir || "graph" });
      
      const stats = turtle.getStoreStats();
      
      console.log("📊 Graph Store Statistics:");
      console.log("=".repeat(30));
      console.log(`   Quads: ${stats.quads}`);
      console.log(`   Subjects: ${stats.subjects}`);
      console.log(`   Predicates: ${stats.predicates}`);
      console.log(`   Objects: ${stats.objects}`);
      console.log(`   Graphs: ${stats.graphs}`);
      return stats;
    });
  }
}

// Export CLI instance
export const graphCLI = new GitVanGraphCLI();
export default graphCLI;





