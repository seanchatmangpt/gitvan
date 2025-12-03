import { withGitVan } from "./src/core/context.mjs";
import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";

async function testKnowledgeHookSystem() {
  try {
    console.log("🧪 Testing generateKnowledgeHookSystem method...");
    
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
      const { generateKnowledgeHookSystem } = await useOllamaRDF({
        model: "qwen3-coder:latest",
        baseURL: "http://localhost:11434"
      });

      console.log("🔧 Testing generateKnowledgeHookSystem...");
      console.log("⏳ Calling generateKnowledgeHookSystem...");
      
      const result = await generateKnowledgeHookSystem(
        "Create a simple knowledge hook system",
        { temperature: 0.5, maxTokens: 200 }
      );
      
      console.log("✅ generateKnowledgeHookSystem successful!");
      console.log("Ontology length:", result.ontology.length);
      console.log("Hooks count:", result.hooks.length);
      console.log("Queries count:", result.queries.length);
      console.log("Schemas count:", result.schemas.length);

    });

  } catch (error) {
    console.error("❌ generateKnowledgeHookSystem test failed:", error.message);
    console.error("Stack:", error.stack);
    throw error;
  }
}

testKnowledgeHookSystem()
  .then(() => {
    console.log("🎉 generateKnowledgeHookSystem test completed!");
  })
  .catch((error) => {
    console.error("💥 Error:", error.message);
    process.exit(1);
  });
