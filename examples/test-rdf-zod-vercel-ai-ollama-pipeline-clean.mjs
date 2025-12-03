import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";
import { withGitVan } from "./src/core/context.mjs";
import { useLog } from "./src/composables/log.mjs";

const logger = useLog("RDF-Zod-VercelAI-Ollama-Pipeline");

// Simple progress indicator
class ProgressIndicator {
  constructor(message) {
    this.message = message;
    this.dots = 0;
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => {
      const dots = ".".repeat(this.dots % 4);
      process.stdout.write(`\r⏳ ${this.message}${dots}   `);
      this.dots++;
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      process.stdout.write(`\r✅ ${this.message} - Complete\n`);
    }
  }

  update(message) {
    this.message = message;
  }
}

async function demonstrateRDFToZodToVercelAIToOllamaPipeline() {
  try {
    console.log("🤖 GitVan RDF → Zod → Vercel AI → Ollama Pipeline");
    console.log("=".repeat(50));
    console.log();

    // Create a test context
    const context = {
      cwd: process.cwd(),
      env: process.env,
      config: {
        ai: {
          provider: "ollama",
          model: "qwen3-coder",
          baseURL: "http://localhost:11434",
        },
      },
    };

    // Use the complete pipeline
    await withGitVan(context, async () => {
      const {
        generateOntology,
        generateZodSchemaFromOntology,
        generateRDFWithZodValidation,
        generateKnowledgeHookSystem,
        generateRDFDocumentation,
      } = await useOllamaRDF({
        model: "qwen3-coder",
        baseURL: "http://localhost:11434",
      });

      console.log("📝 Step 1: Generate RDF Ontology from Natural Language");

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

      const progress1 = new ProgressIndicator(
        "Generating RDF Ontology with Ollama"
      );
      progress1.start();

      const ontology = await generateOntology(workflowDescription);
      progress1.stop();

      console.log("✅ Generated RDF Ontology (first 500 chars):");
      console.log(ontology.substring(0, 500) + "...");
      console.log();

      console.log("🔧 Step 2: Generate Zod Schema from RDF Ontology");

      const progress2 = new ProgressIndicator("Converting RDF to Zod Schema");
      progress2.start();

      const zodSchema = await generateZodSchemaFromOntology(
        ontology,
        "WorkflowSystem",
        { temperature: 0.3 }
      );
      progress2.stop();

      console.log("✅ Generated Zod Schema (first 300 chars):");
      console.log(zodSchema.substring(0, 300) + "...");
      console.log();

      console.log("📊 Step 3: Generate RDF Data with Zod Validation");

      const progress3 = new ProgressIndicator(
        "Generating RDF Data with Validation"
      );
      progress3.start();

      const rdfWithValidation = await generateRDFWithZodValidation(
        "Generate a complete workflow definition with multiple steps, error handling, and parallel execution",
        ontology,
        { temperature: 0.4 }
      );
      progress3.stop();

      console.log("✅ Generated RDF Data with Validation:");
      console.log("   Validation Score:", rdfWithValidation.score);
      console.log("   Is Valid:", rdfWithValidation.isValid);
      console.log(
        "   RDF Data (first 200 chars):",
        rdfWithValidation.rdfData.substring(0, 200) + "..."
      );
      console.log();

      console.log("🎯 Step 4: Generate Complete Knowledge Hook System");

      const progress4 = new ProgressIndicator("Creating Knowledge Hook System");
      progress4.start();

      const hookSystem = await generateKnowledgeHookSystem(
        "Create a knowledge hook system for workflow automation with intelligent triggers",
        { temperature: 0.5 }
      );
      progress4.stop();

      console.log("✅ Generated Knowledge Hook System:");
      console.log("   Hooks:", hookSystem.hooks.length);
      console.log("   SPARQL Queries:", hookSystem.queries.length);
      console.log("   Zod Schemas:", hookSystem.schemas.length);
      console.log();

      console.log("📚 Step 5: Generate Comprehensive Documentation");

      const progress5 = new ProgressIndicator("Generating Documentation");
      progress5.start();

      const documentation = await generateRDFDocumentation(ontology);
      progress5.stop();

      console.log("✅ Generated Documentation (first 200 chars):");
      console.log(documentation.substring(0, 200) + "...");
      console.log();

      console.log(
        "🎉 Complete RDF → Zod → Vercel AI → Ollama Pipeline Success!"
      );

      return {
        ontology,
        zodSchema,
        rdfWithValidation,
        hookSystem,
        documentation,
        pipeline: "RDF → Zod → Vercel AI → Ollama",
        success: true,
      };
    });
  } catch (error) {
    console.error("❌ Pipeline failed:", error.message);
    throw error;
  }
}

// Run the complete pipeline demonstration
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
