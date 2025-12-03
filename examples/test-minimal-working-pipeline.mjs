import { withGitVan } from "./src/core/context.mjs";
import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";

async function testMinimalWorkingPipeline() {
  try {
    console.log("🤖 GitVan RDF → Zod → Ollama Pipeline (Minimal Working)");
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
        generateRDFDocumentation
      } = await useOllamaRDF({
        model: "qwen3-coder:latest",
        baseURL: "http://localhost:11434"
      });

      console.log("📝 Step 1: Generate RDF Ontology");
      const ontology = await generateOntology(
        "Create a simple workflow system with stages and steps",
        { temperature: 0.3, maxTokens: 800 }
      );
      console.log("✅ Generated RDF Ontology");
      console.log("   Length:", ontology.length);
      console.log("   First 200 chars:", ontology.substring(0, 200) + "...");
      console.log();

      console.log("🔧 Step 2: Generate Zod Schema");
      const zodSchema = await generateZodSchemaFromOntology(
        ontology,
        "WorkflowSystem",
        { temperature: 0.3, maxTokens: 500 }
      );
      console.log("✅ Generated Zod Schema");
      console.log("   Length:", zodSchema.length);
      console.log("   First 200 chars:", zodSchema.substring(0, 200) + "...");
      console.log();

      console.log("📚 Step 3: Generate Documentation");
      const documentation = await generateRDFDocumentation(ontology, {
        temperature: 0.3,
        maxTokens: 400
      });
      console.log("✅ Generated Documentation");
      console.log("   Length:", documentation.length);
      console.log("   First 200 chars:", documentation.substring(0, 200) + "...");
      console.log();

      console.log("🎉 Minimal RDF → Zod → Ollama Pipeline Success!");
      
      return {
        ontology,
        zodSchema,
        documentation,
        pipeline: "RDF → Zod → Ollama (Minimal)",
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
  setTimeout(() => reject(new Error("Pipeline timeout after 60 seconds")), 60000);
});

Promise.race([testMinimalWorkingPipeline(), timeoutPromise])
  .then((result) => {
    console.log("\n🎯 Minimal Pipeline Result:");
    console.log("Pipeline:", result.pipeline);
    console.log("Success:", result.success);
    console.log("Components Generated:");
    console.log("- RDF Ontology: ✅");
    console.log("- Zod Schema: ✅");
    console.log("- Documentation: ✅");
    console.log("\n🚀 Minimal pipeline completed successfully!");
  })
  .catch((error) => {
    console.error("💥 Pipeline Error:", error.message);
    process.exit(1);
  });
