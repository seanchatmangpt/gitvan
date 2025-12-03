import { withGitVan } from "./src/core/context.mjs";
import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";

async function testRDFValidationSteps() {
  try {
    console.log("🧪 Testing RDF validation steps individually...");
    
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
        generateRDFFromDescription,
        generateZodSchemaFromOntology,
        validateRDFData
      } = await useOllamaRDF({
        model: "qwen3-coder:latest",
        baseURL: "http://localhost:11434"
      });

      console.log("📝 Step 1: Generate ontology");
      const ontology = await generateOntology("Simple workflow", {
        temperature: 0.3,
        maxTokens: 500
      });
      console.log("✅ Ontology generated");

      console.log("📊 Step 2: Generate RDF data");
      const rdfData = await generateRDFFromDescription(
        "Generate a simple workflow",
        ontology,
        { temperature: 0.4, maxTokens: 300 }
      );
      console.log("✅ RDF data generated, length:", rdfData.length);

      console.log("🔧 Step 3: Generate Zod schema");
      const zodSchema = await generateZodSchemaFromOntology(
        ontology,
        "GeneratedData",
        { temperature: 0.3, maxTokens: 200 }
      );
      console.log("✅ Zod schema generated, length:", zodSchema.length);

      console.log("🔍 Step 4: Validate RDF data");
      const validation = await validateRDFData(
        rdfData,
        ontology,
        { temperature: 0.3, maxTokens: 100 }
      );
      console.log("✅ Validation completed");
      console.log("   Score:", validation.score);
      console.log("   Is valid:", validation.isValid);

    });

  } catch (error) {
    console.error("❌ RDF validation steps failed:", error.message);
    throw error;
  }
}

// Run with timeout
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error("Test timeout after 90 seconds")), 90000);
});

Promise.race([testRDFValidationSteps(), timeoutPromise])
  .then(() => {
    console.log("🎉 All RDF validation steps completed!");
  })
  .catch((error) => {
    console.error("💥 Error:", error.message);
    process.exit(1);
  });
