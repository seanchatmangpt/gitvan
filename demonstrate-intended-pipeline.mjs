import { withGitVan } from "./src/core/context.mjs";
import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";

async function demonstrateIntendedPipeline() {
  try {
    console.log("🎯 GitVan RDF → Zod → Ollama Pipeline (Intended Flow)");
    console.log("=".repeat(60));

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
      const { generateOntology, generateZodSchemaFromOntology } =
        await useOllamaRDF({
          model: "qwen3-coder:latest",
          baseURL: "http://localhost:11434",
        });

      console.log("📝 Step 1: Natural Language → RDF Ontology");
      console.log("Input: 'Create a simple data processing workflow'");

      const ontology = await generateOntology(
        "Create a simple data processing workflow with one SPARQL step and one template step",
        { temperature: 0.3, maxTokens: 600 }
      );

      console.log("✅ Generated RDF Ontology:");
      console.log("   Length:", ontology.length);
      console.log("   Preview:", ontology.substring(0, 200) + "...");
      console.log();

      console.log("🔧 Step 2: RDF Ontology → Zod Schema");
      console.log("Input: RDF ontology from step 1");

      const zodSchema = await generateZodSchemaFromOntology(
        ontology,
        "DataProcessingWorkflow",
        { temperature: 0.3, maxTokens: 400 }
      );

      console.log("✅ Generated Zod Schema:");
      console.log("   Length:", zodSchema.length);
      console.log("   Preview:", zodSchema.substring(0, 200) + "...");
      console.log();

      console.log("🎉 Intended Pipeline Demonstration Complete!");
      console.log();
      console.log("📋 What This Demonstrates:");
      console.log("✅ Natural language → Semantic RDF ontology");
      console.log("✅ RDF ontology → Type-safe Zod schema");
      console.log("✅ AI-powered generation using Ollama");
      console.log("✅ Integration with GitVan context");
      console.log("✅ Proper error handling and timeouts");

      return {
        ontology,
        zodSchema,
        pipeline: "RDF → Zod → Ollama (Intended)",
        success: true,
      };
    });
  } catch (error) {
    console.error("❌ Pipeline demonstration failed:", error.message);
    throw error;
  }
}

// Run with reasonable timeout
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(
    () => reject(new Error("Pipeline timeout after 45 seconds")),
    45000
  );
});

Promise.race([demonstrateIntendedPipeline(), timeoutPromise])
  .then((result) => {
    if (result && result.success) {
      console.log("\n🎯 Intended Pipeline Result:");
      console.log("Pipeline:", result.pipeline);
      console.log("Success:", result.success);
      console.log("\n🚀 This shows the intended architecture working!");
    }
  })
  .catch((error) => {
    console.error("💥 Pipeline Error:", error.message);
    process.exit(1);
  });

