import { withGitVan } from "./src/core/context.mjs";
import { OllamaRDF } from "./src/rdf-to-zod/OllamaRDF.mjs";

async function testOllamaRDFIncremental() {
  try {
    console.log("🧪 Testing OllamaRDF class incrementally...");
    
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
      // Test 1: Create OllamaRDF instance
      console.log("📦 Step 1: Creating OllamaRDF instance...");
      const ollamaRDF = new OllamaRDF({
        model: "qwen3-coder:latest",
        baseURL: "http://localhost:11434"
      });
      console.log("✅ OllamaRDF instance created");

      // Test 2: Test generateOntology with simple prompt
      console.log("📝 Step 2: Testing generateOntology with simple prompt...");
      const simpleDescription = "Create a simple workflow with one step";
      
      console.log("⏳ Calling generateOntology...");
      const ontology = await ollamaRDF.generateOntology(simpleDescription, {
        temperature: 0.3,
        maxTokens: 500
      });
      
      console.log("✅ generateOntology successful!");
      console.log("Ontology length:", ontology.length);
      console.log("First 200 chars:", ontology.substring(0, 200) + "...");

      // Test 3: Test generateZodSchemaFromOntology
      console.log("🔧 Step 3: Testing generateZodSchemaFromOntology...");
      const zodSchema = await ollamaRDF.generateZodSchemaFromOntology(
        ontology,
        "SimpleWorkflow",
        { temperature: 0.3, maxTokens: 300 }
      );
      
      console.log("✅ generateZodSchemaFromOntology successful!");
      console.log("Schema length:", zodSchema.length);
      console.log("First 200 chars:", zodSchema.substring(0, 200) + "...");

    });

  } catch (error) {
    console.error("❌ OllamaRDF incremental test failed:", error.message);
    console.error("Stack:", error.stack);
    throw error;
  }
}

testOllamaRDFIncremental()
  .then(() => {
    console.log("🎉 OllamaRDF incremental test completed!");
  })
  .catch((error) => {
    console.error("💥 Error:", error.message);
    process.exit(1);
  });
