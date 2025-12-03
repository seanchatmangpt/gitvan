import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";
import { withGitVan } from "./src/core/context.mjs";
import { useLog } from "./src/composables/log.mjs";

const logger = useLog("RDF-Zod-VercelAI-Ollama-Pipeline");

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

      const ontology = await generateOntology(workflowDescription);
      logger.info("✅ Generated RDF Ontology:");
      console.log(ontology);

      logger.info("🔧 Step 2: Generate Zod Schema from RDF Ontology");
      
      const zodSchema = await generateZodSchemaFromOntology(
        ontology, 
        "WorkflowSystem",
        { temperature: 0.3 }
      );
      logger.info("✅ Generated Zod Schema:");
      console.log(zodSchema);

      logger.info("📊 Step 3: Generate RDF Data with Zod Validation");
      
      const rdfWithValidation = await generateRDFWithZodValidation(
        "Generate a complete workflow definition with multiple steps, error handling, and parallel execution",
        ontology,
        { temperature: 0.4 }
      );
      
      logger.info("✅ Generated RDF Data with Validation:");
      console.log("RDF Data:", rdfWithValidation.rdfData);
      console.log("Zod Schema:", rdfWithValidation.zodSchema);
      console.log("Validation Score:", rdfWithValidation.score);
      console.log("Is Valid:", rdfWithValidation.isValid);

      logger.info("🎯 Step 4: Generate Complete Knowledge Hook System");
      
      const hookSystem = await generateKnowledgeHookSystem(
        "Create a knowledge hook system for workflow automation with intelligent triggers",
        { temperature: 0.5 }
      );
      
      logger.info("✅ Generated Knowledge Hook System:");
      console.log("Ontology:", hookSystem.ontology);
      console.log("Hooks:", hookSystem.hooks.length);
      console.log("SPARQL Queries:", hookSystem.queries.length);
      console.log("Zod Schemas:", hookSystem.schemas.length);

      logger.info("📚 Step 5: Generate Comprehensive Documentation");
      
      const documentation = await generateRDFDocumentation(ontology);
      logger.info("✅ Generated Documentation:");
      console.log(documentation);

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
  })
  .catch((error) => {
    console.error("💥 Pipeline Error:", error.message);
    process.exit(1);
  });
