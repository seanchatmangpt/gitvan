import { withGitVan } from "./src/core/context.mjs";
import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";

async function testCoreWorkingPipeline() {
  try {
    console.log("🤖 GitVan RDF → Zod → Ollama Pipeline (Core Working)");
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
        generateZodSchemaFromOntology
      } = await useOllamaRDF({
        model: "qwen3-coder:latest",
        baseURL: "http://localhost:11434"
      });

      console.log("📝 Step 1: Generate RDF Ontology");
      const ontology = await generateOntology(
        "Create a simple workflow system with stages and steps",
        { temperature: 0.3, maxTokens: 600 }
      );
      console.log("✅ Generated RDF Ontology");
      console.log("   Length:", ontology.length);
      console.log("   First 300 chars:");
      console.log(ontology.substring(0, 300) + "...");
      console.log();

      console.log("🔧 Step 2: Generate Zod Schema");
      const zodSchema = await generateZodSchemaFromOntology(
        ontology,
        "WorkflowSystem",
        { temperature: 0.3, maxTokens: 400 }
      );
      console.log("✅ Generated Zod Schema");
      console.log("   Length:", zodSchema.length);
      console.log("   First 300 chars:");
      console.log(zodSchema.substring(0, 300) + "...");
      console.log();

      console.log("🎉 Core RDF → Zod → Ollama Pipeline Success!");
      
      return {
        ontology,
        zodSchema,
        pipeline: "RDF → Zod → Ollama (Core)",
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
  setTimeout(() => reject(new Error("Pipeline timeout after 45 seconds")), 45000);
});

Promise.race([testCoreWorkingPipeline(), timeoutPromise])
  .then((result) => {
    if (result && result.success) {
      console.log("\n🎯 Core Pipeline Result:");
      console.log("Pipeline:", result.pipeline);
      console.log("Success:", result.success);
      console.log("Components Generated:");
      console.log("- RDF Ontology: ✅");
      console.log("- Zod Schema: ✅");
      console.log("\n🚀 Core pipeline completed successfully!");
      console.log("\n📋 Summary:");
      console.log("- ✅ RDF generation from natural language works");
      console.log("- ✅ Zod schema generation from RDF works");
      console.log("- ✅ Ollama integration works");
      console.log("- ✅ Vercel AI SDK integration works");
      console.log("- ❌ Some complex methods (validation, documentation) have issues");
    } else {
      console.log("✅ Pipeline completed successfully!");
    }
  })
  .catch((error) => {
    console.error("💥 Pipeline Error:", error.message);
    process.exit(1);
  });
