import { withGitVan } from "./src/core/context.mjs";

async function testSimpleOllamaCall() {
  try {
    console.log("🧪 Testing simple Ollama call...");

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
      // Test direct Ollama call
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen3-coder:latest",
          prompt: "Generate a simple RDF ontology for a workflow system",
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Direct Ollama call successful!");
      console.log("Response:", data.response);
      console.log("Duration:", data.total_duration / 1000000, "ms");
    });
  } catch (error) {
    console.error("❌ Simple Ollama test failed:", error.message);
    throw error;
  }
}

testSimpleOllamaCall()
  .then(() => {
    console.log("🎉 Simple test completed!");
  })
  .catch((error) => {
    console.error("💥 Error:", error.message);
    process.exit(1);
  });
