import { withGitVan } from "./src/core/context.mjs";
import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";

async function testRDFWithZodValidation() {
  try {
    console.log("🧪 Testing generateRDFWithZodValidation method...");
    
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
      const { generateOntology, generateRDFWithZodValidation } = await useOllamaRDF({
        model: "qwen3-coder:latest",
        baseURL: "http://localhost:11434"
      });

      // Step 1: Generate simple ontology first
      console.log("📝 Step 1: Generating simple ontology...");
      const ontology = await generateOntology("Simple workflow with one step", {
        temperature: 0.3,
        maxTokens: 500
      });
      console.log("✅ Ontology generated, length:", ontology.length);

      // Step 2: Test the problematic method
      console.log("🔧 Step 2: Testing generateRDFWithZodValidation...");
      console.log("⏳ Calling generateRDFWithZodValidation...");
      
      const result = await generateRDFWithZodValidation(
        "Generate a simple workflow with one step",
        ontology,
        { temperature: 0.4, maxTokens: 300 }
      );
      
      console.log("✅ generateRDFWithZodValidation successful!");
      console.log("Validation score:", result.score);
      console.log("Is valid:", result.isValid);
      console.log("RDF data length:", result.rdfData.length);
      console.log("Zod schema length:", result.zodSchema.length);

    });

  } catch (error) {
    console.error("❌ generateRDFWithZodValidation test failed:", error.message);
    console.error("Stack:", error.stack);
    throw error;
  }
}

testRDFWithZodValidation()
  .then(() => {
    console.log("🎉 generateRDFWithZodValidation test completed!");
  })
  .catch((error) => {
    console.error("💥 Error:", error.message);
    process.exit(1);
  });
