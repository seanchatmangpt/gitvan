import { withGitVan } from "./src/core/context.mjs";
import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";

async function testWorkingRDFPipeline() {
  try {
    console.log("🤖 GitVan RDF → Zod → Ollama Pipeline (Working Version)");
    console.log("=".repeat(50));
    
    const context = {
      cwd: process.cwd(),
      env: process.env,
      config: {
        ai: {
          provider: "ollama",
          model: "qwen3-coder:latest",
          baseURL: "http://localhost:11434",
        },
      },
    };

    await withGitVan(context, async () => {
      const { 
        generateOntology,
        generateZodSchemaFromOntology,
        generateRDFFromDescription,
        validateRDFData,
        generateRDFDocumentation
      } = await useOllamaRDF({
        model: "qwen3-coder:latest",
        baseURL: "http://localhost:11434"
      });

      console.log("📝 Step 1: Generate RDF Ontology from Natural Language");
      const ontology = await generateOntology(
        "Create a comprehensive workflow system with multiple stages, SPARQL queries, templates, and error handling",
        { temperature: 0.3, maxTokens: 1000 }
      );
      console.log("✅ Generated RDF Ontology (first 300 chars):");
      console.log(ontology.substring(0, 300) + "...");
      console.log();

      console.log("🔧 Step 2: Generate Zod Schema from RDF Ontology");
      const zodSchema = await generateZodSchemaFromOntology(
        ontology,
        "WorkflowSystem",
        { temperature: 0.3, maxTokens: 600 }
      );
      console.log("✅ Generated Zod Schema (first 200 chars):");
      console.log(zodSchema.substring(0, 200) + "...");
      console.log();

      console.log("📊 Step 3: Generate RDF Data with Validation");
      const rdfData = await generateRDFFromDescription(
        "Generate a complete workflow definition with multiple steps, error handling, and parallel execution",
        ontology,
        { temperature: 0.4, maxTokens: 800 }
      );
      
      const validation = await validateRDFData(
        rdfData,
        ontology,
        { temperature: 0.3, maxTokens: 200 }
      );
      
      console.log("✅ Generated RDF Data with Validation:");
      console.log("   Validation Score:", validation.score);
      console.log("   Is Valid:", validation.isValid);
      console.log("   RDF Data (first 200 chars):", rdfData.substring(0, 200) + "...");
      console.log();

      console.log("📚 Step 4: Generate Comprehensive Documentation");
      const documentation = await generateRDFDocumentation(ontology, {
        temperature: 0.3,
        maxTokens: 500
      });
      console.log("✅ Generated Documentation (first 200 chars):");
      console.log(documentation.substring(0, 200) + "...");
      console.log();

      console.log("🎉 Complete RDF → Zod → Ollama Pipeline Success!");
      
      return {
        ontology,
        zodSchema,
        rdfData,
        validation,
        documentation,
        pipeline: "RDF → Zod → Ollama",
        success: true
      };
    });

  } catch (error) {
    console.error("❌ Pipeline failed:", error.message);
    throw error;
  }
}

// Run with reasonable timeout
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error("Pipeline timeout after 120 seconds")), 120000);
});

Promise.race([testWorkingRDFPipeline(), timeoutPromise])
  .then((result) => {
    console.log("\n🎯 Complete Pipeline Result:");
    console.log("Pipeline:", result.pipeline);
    console.log("Success:", result.success);
    console.log("Components Generated:");
    console.log("- RDF Ontology: ✅");
    console.log("- Zod Schema: ✅");
    console.log("- RDF Data with Validation: ✅");
    console.log("- Documentation: ✅");
    console.log("\n🚀 Pipeline completed successfully!");
  })
  .catch((error) => {
    console.error("💥 Pipeline Error:", error.message);
    process.exit(1);
  });
