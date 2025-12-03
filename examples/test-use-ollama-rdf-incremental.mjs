import { withGitVan } from "./src/core/context.mjs";
import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";

async function testUseOllamaRDFIncremental() {
  try {
    console.log("🧪 Testing useOllamaRDF composable incrementally...");
    
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
      // Test 1: Create useOllamaRDF composable
      console.log("📦 Step 1: Creating useOllamaRDF composable...");
      const { generateOntology, generateZodSchemaFromOntology } = await useOllamaRDF({
        model: "qwen3-coder:latest",
        baseURL: "http://localhost:11434"
      });
      console.log("✅ useOllamaRDF composable created");

      // Test 2: Test generateOntology through composable
      console.log("📝 Step 2: Testing generateOntology through composable...");
      const simpleDescription = "Create a simple workflow with one step";
      
      console.log("⏳ Calling generateOntology...");
      const ontology = await generateOntology(simpleDescription, {
        temperature: 0.3,
        maxTokens: 500
      });
      
      console.log("✅ generateOntology successful!");
      console.log("Ontology length:", ontology.length);
      console.log("First 200 chars:", ontology.substring(0, 200) + "...");

      // Test 3: Test generateZodSchemaFromOntology through composable
      console.log("🔧 Step 3: Testing generateZodSchemaFromOntology through composable...");
      const zodSchema = await generateZodSchemaFromOntology(
        ontology,
        "SimpleWorkflow",
        { temperature: 0.3, maxTokens: 300 }
      );
      
      console.log("✅ generateZodSchemaFromOntology successful!");
      console.log("Schema length:", zodSchema.length);
      console.log("First 200 chars:", zodSchema.substring(0, 200) + "...");

    });

  } catch (error) {
    console.error("❌ useOllamaRDF incremental test failed:", error.message);
    console.error("Stack:", error.stack);
    throw error;
  }
}

testUseOllamaRDFIncremental()
  .then(() => {
    console.log("🎉 useOllamaRDF incremental test completed!");
  })
  .catch((error) => {
    console.error("💥 Error:", error.message);
    process.exit(1);
  });
