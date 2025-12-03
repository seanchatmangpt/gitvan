import { withGitVan } from "./src/core/context.mjs";
import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";

async function testWorkingPipeline() {
  try {
    console.log("🧪 Testing working RDF → Zod → Ollama pipeline...");
    
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
        generateRDFWithZodValidation,
        generateRDFDocumentation
      } = await useOllamaRDF({
        model: "qwen3-coder:latest",
        baseURL: "http://localhost:11434"
      });

      console.log("📝 Step 1: Generate RDF Ontology");
      const ontology = await generateOntology("Simple workflow system", {
        temperature: 0.3,
        maxTokens: 800
      });
      console.log("✅ Ontology generated, length:", ontology.length);

      console.log("🔧 Step 2: Generate Zod Schema");
      const zodSchema = await generateZodSchemaFromOntology(
        ontology,
        "WorkflowSystem",
        { temperature: 0.3, maxTokens: 400 }
      );
      console.log("✅ Zod schema generated, length:", zodSchema.length);

      console.log("📊 Step 3: Generate RDF Data with Validation");
      const rdfWithValidation = await generateRDFWithZodValidation(
        "Generate a simple workflow with one step",
        ontology,
        { temperature: 0.4, maxTokens: 400 }
      );
      console.log("✅ RDF with validation generated");
      console.log("   Validation score:", rdfWithValidation.score);
      console.log("   Is valid:", rdfWithValidation.isValid);

      console.log("📚 Step 4: Generate Documentation");
      const documentation = await generateRDFDocumentation(ontology, {
        temperature: 0.3,
        maxTokens: 300
      });
      console.log("✅ Documentation generated, length:", documentation.length);

      console.log("🎉 Complete pipeline successful!");
      
      return {
        ontology,
        zodSchema,
        rdfWithValidation,
        documentation,
        success: true
      };
    });

  } catch (error) {
    console.error("❌ Pipeline failed:", error.message);
    throw error;
  }
}

// Run with shorter timeout
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error("Pipeline timeout after 60 seconds")), 60000);
});

Promise.race([testWorkingPipeline(), timeoutPromise])
  .then((result) => {
    console.log("🎯 Pipeline completed successfully!");
    console.log("Components generated:");
    console.log("- RDF Ontology: ✅");
    console.log("- Zod Schema: ✅");
    console.log("- RDF Data with Validation: ✅");
    console.log("- Documentation: ✅");
  })
  .catch((error) => {
    console.error("💥 Pipeline failed:", error.message);
    process.exit(1);
  });
