/**
 * GitVan Graph Command - Citty Implementation
 *
 * Proper Citty-based implementation of the graph persistence CLI
 * following the corrected architecture from the C4 model.
 */

import { defineCommand } from "citty";
import { useTurtle } from "../../composables/turtle.mjs";
import { withGitVan } from "../../composables/ctx.mjs";
import { join } from "pathe";

/**
 * Save graph to file subcommand
 */
const saveSubcommand = defineCommand({
  meta: {
    name: "save",
    description: "Save current graph to a Turtle file",
  },
  args: {
    fileName: {
      type: "string",
      description: "Name of the file to save (without .ttl extension)",
      required: true,
    },
    "graph-dir": {
      type: "string",
      description: "Graph directory path",
      default: "graph",
    },
    backup: {
      type: "boolean",
      description: "Create backup of existing file",
      default: false,
    },
    validate: {
      type: "boolean",
      description: "Validate Turtle content before saving",
      default: true,
    },
    prefixes: {
      type: "string",
      description: "Custom prefixes for serialization (JSON format)",
    },
  },
  async run({ args }) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: args["graph-dir"] });

      const options = {
        validate: args.validate,
        createBackup: args.backup,
        prefixes: args.prefixes ? JSON.parse(args.prefixes) : undefined,
      };

      const result = await turtle.saveGraph(args.fileName, options);

      console.log(`✅ Graph saved to: ${result.path}`);
      console.log(`📊 Size: ${result.bytes} bytes`);
    });
  },
});

/**
 * Load graph from file subcommand
 */
const loadSubcommand = defineCommand({
  meta: {
    name: "load",
    description: "Load graph from a Turtle file",
  },
  args: {
    fileName: {
      type: "string",
      description: "Name of the file to load (without .ttl extension)",
      required: true,
    },
    "graph-dir": {
      type: "string",
      description: "Graph directory path",
      default: "graph",
    },
    merge: {
      type: "boolean",
      description: "Merge with existing data instead of replacing",
      default: true,
    },
    validate: {
      type: "boolean",
      description: "Validate Turtle content before loading",
      default: true,
    },
    "base-iri": {
      type: "string",
      description: "Base IRI for parsing",
    },
  },
  async run({ args }) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: args["graph-dir"] });

      const options = {
        validate: args.validate,
        merge: args.merge,
        baseIRI: args["base-iri"],
      };

      const result = await turtle.loadGraph(args.fileName, options);

      console.log(`✅ Graph loaded from: ${result.path}`);
      console.log(`📊 Loaded quads: ${result.quads}`);
    });
  },
});

/**
 * Save to default graph location subcommand
 */
const saveDefaultSubcommand = defineCommand({
  meta: {
    name: "save-default",
    description: "Save current graph to default.ttl",
  },
  args: {
    "graph-dir": {
      type: "string",
      description: "Graph directory path",
      default: "graph",
    },
    backup: {
      type: "boolean",
      description: "Create backup of existing file",
      default: true,
    },
    validate: {
      type: "boolean",
      description: "Validate Turtle content before saving",
      default: true,
    },
    prefixes: {
      type: "string",
      description: "Custom prefixes for serialization (JSON format)",
    },
  },
  async run({ args }) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: args["graph-dir"] });

      const options = {
        validate: args.validate,
        createBackup: args.backup,
        prefixes: args.prefixes ? JSON.parse(args.prefixes) : undefined,
      };

      const result = await turtle.saveDefaultGraph(options);

      console.log(`✅ Default graph saved to: ${result.path}`);
      console.log(`📊 Size: ${result.bytes} bytes`);
    });
  },
});

/**
 * Load from default graph location subcommand
 */
const loadDefaultSubcommand = defineCommand({
  meta: {
    name: "load-default",
    description: "Load graph from default.ttl",
  },
  args: {
    "graph-dir": {
      type: "string",
      description: "Graph directory path",
      default: "graph",
    },
    merge: {
      type: "boolean",
      description: "Merge with existing data instead of replacing",
      default: true,
    },
    validate: {
      type: "boolean",
      description: "Validate Turtle content before loading",
      default: true,
    },
    "base-iri": {
      type: "string",
      description: "Base IRI for parsing",
    },
  },
  async run({ args }) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: args["graph-dir"] });

      const options = {
        validate: args.validate,
        merge: args.merge,
        baseIRI: args["base-iri"],
      };

      const result = await turtle.loadDefaultGraph(options);

      if (result) {
        console.log(`✅ Default graph loaded from: ${result.path}`);
        console.log(`📊 Loaded quads: ${result.quads}`);
      } else {
        console.log(`ℹ️  No default graph found`);
      }
    });
  },
});

/**
 * Initialize default graph subcommand
 */
const initDefaultSubcommand = defineCommand({
  meta: {
    name: "init-default",
    description: "Initialize default graph from template",
  },
  args: {
    "graph-dir": {
      type: "string",
      description: "Graph directory path",
      default: "graph",
    },
    "template-path": {
      type: "string",
      description: "Path to custom template file",
    },
    validate: {
      type: "boolean",
      description: "Validate Turtle content",
      default: true,
    },
  },
  async run({ args }) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: args["graph-dir"] });

      const options = {
        templatePath: args["template-path"],
        validate: args.validate,
      };

      const result = await turtle.initializeDefaultGraph(options);

      if (result.created) {
        console.log(`✅ Default graph initialized: ${result.path}`);
        console.log(`📊 Size: ${result.bytes} bytes`);
      } else {
        console.log(`ℹ️  Default graph already exists: ${result.path}`);
        console.log(`📊 Size: ${result.bytes} bytes`);
      }
    });
  },
});

/**
 * List available Turtle files subcommand
 */
const listFilesSubcommand = defineCommand({
  meta: {
    name: "list-files",
    description: "List available Turtle files in graph directory",
  },
  args: {
    "graph-dir": {
      type: "string",
      description: "Graph directory path",
      default: "graph",
    },
  },
  async run({ args }) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: args["graph-dir"] });

      const files = await turtle.listGraphFiles();

      console.log(`📁 Found ${files.length} Turtle files:`);
      if (files.length === 0) {
        console.log("   (no files found)");
      } else {
        files.forEach((file) => console.log(`   - ${file}`));
      }
    });
  },
});

/**
 * Show graph statistics subcommand
 */
const statsSubcommand = defineCommand({
  meta: {
    name: "stats",
    description: "Show current graph store statistics",
  },
  args: {
    "graph-dir": {
      type: "string",
      description: "Graph directory path",
      default: "graph",
    },
  },
  async run({ args }) {
    const context = {
      cwd: process.cwd(),
      root: process.cwd(),
    };

    await withGitVan(context, async () => {
      const turtle = await useTurtle({ graphDir: args["graph-dir"] });

      const stats = turtle.getStoreStats();

      console.log("📊 Graph Store Statistics:");
      console.log("=".repeat(30));
      console.log(`   Quads: ${stats.quads}`);
      console.log(`   Subjects: ${stats.subjects}`);
      console.log(`   Predicates: ${stats.predicates}`);
      console.log(`   Objects: ${stats.objects}`);
      console.log(`   Graphs: ${stats.graphs}`);
    });
  },
});

/**
 * Main graph command with all subcommands
 */
export const graphCommand = defineCommand({
  meta: {
    name: "graph",
    description: "Graph persistence and operations for GitVan",
  },
  subCommands: {
    save: saveSubcommand,
    load: loadSubcommand,
    "save-default": saveDefaultSubcommand,
    "load-default": loadDefaultSubcommand,
    "init-default": initDefaultSubcommand,
    "list-files": listFilesSubcommand,
    stats: statsSubcommand,
  },
});

export default graphCommand;
