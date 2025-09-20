/**
 * GitVan Graph Command Handler
 * Handles graph-related CLI commands with persistence functionality
 */

import { graphCLI } from "./graph.mjs";

/**
 * Handle graph command
 * @param {string[]} args - Command arguments
 * @param {object} options - Command options
 */
export async function handleGraphCommand(args, options = {}) {
  const [subcommand, ...subArgs] = args;

  if (!subcommand || subcommand === "help") {
    await graphCLI.help();
    return;
  }

  try {
    switch (subcommand) {
      case "status":
        await graphCLI.status();
        break;

      case "query":
        if (subArgs.length < 2) {
          console.error("❌ Usage: gitvan graph query <graphId> <sparqlQuery>");
          process.exit(1);
        }
        await graphCLI.query(subArgs[0], subArgs[1], options);
        break;

      case "add":
        if (subArgs.length < 2) {
          console.error("❌ Usage: gitvan graph add <graphId> <data>");
          process.exit(1);
        }
        await graphCLI.addData(subArgs[0], subArgs[1], options);
        break;

      case "snapshot":
        if (subArgs.length < 1) {
          console.error("❌ Usage: gitvan graph snapshot <graphId>");
          process.exit(1);
        }
        await graphCLI.snapshot(subArgs[0], options);
        break;

      case "template":
        if (subArgs.length < 2) {
          console.error("❌ Usage: gitvan graph template <graphId> <templatePath>");
          process.exit(1);
        }
        await graphCLI.template(subArgs[0], subArgs[1], options);
        break;

      case "analytics":
        if (subArgs.length < 1) {
          console.error("❌ Usage: gitvan graph analytics <graphId>");
          process.exit(1);
        }
        await graphCLI.analytics(subArgs[0], options);
        break;

      case "job":
        if (subArgs.length < 1) {
          console.error("❌ Usage: gitvan graph job <jobName>");
          process.exit(1);
        }
        await graphCLI.runJob(subArgs[0], options);
        break;

      case "ai":
        if (subArgs.length < 2) {
          console.error("❌ Usage: gitvan graph ai <templateId> <templateData>");
          process.exit(1);
        }
        await graphCLI.ai(subArgs[0], subArgs[1], options);
        break;

      case "pack":
        if (subArgs.length < 2) {
          console.error("❌ Usage: gitvan graph pack <action> <packId>");
          process.exit(1);
        }
        await graphCLI.pack(subArgs[0], subArgs[1], options);
        break;

      case "marketplace":
        if (subArgs.length < 2) {
          console.error("❌ Usage: gitvan graph marketplace <action> <query>");
          process.exit(1);
        }
        await graphCLI.marketplace(subArgs[0], subArgs[1], options);
        break;

      case "daemon":
        if (subArgs.length < 1) {
          console.error("❌ Usage: gitvan graph daemon <action>");
          process.exit(1);
        }
        await graphCLI.daemon(subArgs[0], options);
        break;

      // ============== Persistence Commands ==============

      case "save":
        if (subArgs.length < 1) {
          console.error("❌ Usage: gitvan graph save <fileName>");
          process.exit(1);
        }
        await graphCLI.save(subArgs[0], options);
        break;

      case "load":
        if (subArgs.length < 1) {
          console.error("❌ Usage: gitvan graph load <fileName>");
          process.exit(1);
        }
        await graphCLI.load(subArgs[0], options);
        break;

      case "save-default":
        await graphCLI.saveDefault(options);
        break;

      case "load-default":
        await graphCLI.loadDefault(options);
        break;

      case "init-default":
        await graphCLI.initDefault(options);
        break;

      case "list-files":
        await graphCLI.listFiles(options);
        break;

      case "stats":
        await graphCLI.stats(options);
        break;

      default:
        console.error(`❌ Unknown graph subcommand: ${subcommand}`);
        console.log("Run 'gitvan graph help' for available commands");
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Graph command failed:`, error.message);
    process.exit(1);
  }
}

/**
 * Graph command with options parsing
 * @param {string[]} args - Command arguments
 */
export async function graphCommand(args) {
  const options = {};
  
  // Parse options
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];
      
      switch (key) {
        case "graph-dir":
          options.graphDir = value;
          i++; // Skip next argument
          break;
        case "validate":
          options.validate = value !== "false";
          break;
        case "backup":
          options.backup = value !== "false";
          break;
        case "merge":
          options.merge = value !== "false";
          break;
        case "base-iri":
          options.baseIRI = value;
          i++; // Skip next argument
          break;
        case "template-path":
          options.templatePath = value;
          i++; // Skip next argument
          break;
        case "format":
          options.format = value;
          i++; // Skip next argument
          break;
        case "output":
          options.output = value;
          i++; // Skip next argument
          break;
        case "family":
          options.family = value;
          i++; // Skip next argument
          break;
        case "name":
          options.name = value;
          i++; // Skip next argument
          break;
        case "type":
          options.type = value;
          i++; // Skip next argument
          break;
        case "query":
          options.query = value;
          i++; // Skip next argument
          break;
        case "temp":
          options.temp = parseFloat(value);
          i++; // Skip next argument
          break;
        case "model":
          options.model = value;
          i++; // Skip next argument
          break;
        case "kind":
          options.kind = value;
          i++; // Skip next argument
          break;
        case "path":
          options.path = value;
          i++; // Skip next argument
          break;
        case "rating":
          options.rating = parseInt(value);
          i++; // Skip next argument
          break;
        case "comment":
          options.comment = value;
          i++; // Skip next argument
          break;
      }
    }
  }

  // Remove options from args
  const cleanArgs = args.filter(arg => !arg.startsWith("--"));
  
  await handleGraphCommand(cleanArgs, options);
}

export default graphCommand;
