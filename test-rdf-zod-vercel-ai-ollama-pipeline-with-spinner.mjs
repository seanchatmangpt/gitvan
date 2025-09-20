import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";
import { withGitVan } from "./src/core/context.mjs";
import { useLog } from "./src/composables/log.mjs";

const logger = useLog("RDF-Zod-VercelAI-Ollama-Pipeline");

// Simple spinner utility
class Spinner {
  constructor(message) {
    this.message = message;
    this.spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.currentIndex = 0;
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => {
      process.stdout.write(`\r${this.spinnerChars[this.currentIndex]} ${this.message}`);
      this.currentIndex = (this.currentIndex + 1) % this.spinnerChars.length;
    }, 100);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      process.stdout.write(`\r✅ ${this.message}\n`);
    }
  }

  update(message) {
    this.message = message;
  }
}

async function demonstrateRDFToZodToVercelAIToOllamaPipeline() {
  try {
    logger.info("🚀 Starting RDF → Zod → Vercel AI → Ollama Pipeline...");
    
    // Create a test context
    const context = {
      cwd: process.cwd(),
      env: process.env,
      config: {
        ai: {
          provider: "ollama",
          model: "qwen3-coder",
          baseURL: "http://localhost:11434"
        }
      }
    };

    // Use the complete pipeline
    await withGitVan(context, async () => {
      const { 
        generateOntology,
        generateZodSchemaFromOntology,
        generateRDFWithZodValidation,
        generateKnowledgeHookSystem,
        generateRDFDocumentation
      } = await useOllamaRDF({
        model: "qwen3-coder",
        baseURL: "http://localhost:11434"
      });

      logger.info("📝 Step 1: Generate RDF Ontology from Natural Language");
      
      const workflowDescription = `
        Create a comprehensive workflow system that:
        1. Processes data through multiple stages
        2. Includes SPARQL queries for data analysis
        3. Generates reports using templates
        4. Sends notifications via HTTP
        5. Handles errors gracefully
        6. Supports parallel execution
        7. Provides audit trails
      `;

      const spinner1 = new Spinner("Generating RDF Ontology with Ollama...");
      spinner1.start();
      
      const ontology = await generateOntology(workflowDescription);
      spinner1.stop();
      
      logger.info("✅ Generated RDF Ontology (first 500 chars):");
      console.log(ontology.substring(0, 500) + "...");

      logger.info("🔧 Step 2: Generate Zod Schema from RDF Ontology");
      
      const spinner2 = new Spinner("Converting RDF to Zod Schema...");
      spinner2.start();
      
      const zodSchema = await generateZodSchemaFromOntology(
        ontology, 
        "WorkflowSystem",
        { temperature: 0.3 }
      );
      spinner2.stop();
      
      logger.info("✅ Generated Zod Schema (first 300 chars):");
      console.log(zodSchema.substring(0, 300) + "...");

      logger.info("📊 Step 3: Generate RDF Data with Zod Validation");
      
      const spinner3 = new Spinner("Generating RDF Data with Validation...");
      spinner3.start();
      
      const rdfWithValidation = await generateRDFWithZodValidation(
        "Generate a complete workflow definition with multiple steps, error handling, and parallel execution",
        ontology,
        { temperature: 0.4 }
      );
      spinner3.stop();
      
      logger.info("✅ Generated RDF Data with Validation:");
      console.log("Validation Score:", rdfWithValidation.score);
      console.log("Is Valid:", rdfWithValidation.isValid);
      console.log("RDF Data (first 200 chars):", rdfWithValidation.rdfData.substring(0, 200) + "...");

      logger.info("🎯 Step 4: Generate Complete Knowledge Hook System");
      
      const spinner4 = new Spinner("Creating Knowledge Hook System...");
      spinner4.start();
      
      const hookSystem = await generateKnowledgeHookSystem(
        "Create a knowledge hook system for workflow automation with intelligent triggers",
        { temperature: 0.5 }
      );
      spinner4.stop();
      
      logger.info("✅ Generated Knowledge Hook System:");
      console.log("Hooks:", hookSystem.hooks.length);
      console.log("SPARQL Queries:", hookSystem.queries.length);
      console.log("Zod Schemas:", hookSystem.schemas.length);

      logger.info("📚 Step 5: Generate Comprehensive Documentation");
      
      const spinner5 = new Spinner("Generating Documentation...");
      spinner5.start();
      
      const documentation = await generateRDFDocumentation(ontology);
      spinner5.stop();
      
      logger.info("✅ Generated Documentation (first 200 chars):");
      console.log(documentation.substring(0, 200) + "...");

      logger.info("🎉 Complete RDF → Zod → Vercel AI → Ollama Pipeline Success!");
      
      return {
        ontology,
        zodSchema,
        rdfWithValidation,
        hookSystem,
        documentation,
        pipeline: "RDF → Zod → Vercel AI → Ollama",
        success: true
      };
    });

  } catch (error) {
    logger.error("❌ Pipeline failed:", error);
    throw error;
  }
}

// Run the complete pipeline demonstration
console.log("🤖 GitVan RDF → Zod → Vercel AI → Ollama Pipeline");
console.log("=" .repeat(50));

demonstrateRDFToZodToVercelAIToOllamaPipeline()
  .then((result) => {
    console.log("\n🎯 Complete Pipeline Result:");
    console.log("Pipeline:", result.pipeline);
    console.log("Success:", result.success);
    console.log("Components Generated:");
    console.log("- RDF Ontology: ✅");
    console.log("- Zod Schema: ✅");
    console.log("- RDF Data with Validation: ✅");
    console.log("- Knowledge Hook System: ✅");
    console.log("- Documentation: ✅");
    console.log("\n🚀 Pipeline completed successfully!");
  })
  .catch((error) => {
    console.error("💥 Pipeline Error:", error.message);
    process.exit(1);
  });
