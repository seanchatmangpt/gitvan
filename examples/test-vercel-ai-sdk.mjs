import { withGitVan } from "./src/core/context.mjs";

async function testVercelAISDK() {
  try {
    console.log("🧪 Testing Vercel AI SDK with Ollama...");
    
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
      // Test 1: Import Vercel AI SDK
      console.log("📦 Step 1: Importing Vercel AI SDK...");
      const { generateText } = await import("ai");
      const { ollama } = await import("ollama-ai-provider-v2");
      console.log("✅ Vercel AI SDK imported successfully");

      // Test 2: Create Ollama provider
      console.log("🔧 Step 2: Creating Ollama provider...");
      const ollamaProvider = ollama("qwen3-coder:latest");
      console.log("✅ Ollama provider created:", typeof ollamaProvider);

      // Test 3: Simple generateText call
      console.log("📝 Step 3: Testing generateText with simple prompt...");
      const result = await generateText({
        model: ollamaProvider,
        prompt: "Say hello in one word",
        temperature: 0.1,
        maxTokens: 10,
      });
      
      console.log("✅ generateText successful!");
      console.log("Response:", result.text);
      console.log("Usage:", result.usage);

    });

  } catch (error) {
    console.error("❌ Vercel AI SDK test failed:", error.message);
    console.error("Stack:", error.stack);
    throw error;
  }
}

testVercelAISDK()
  .then(() => {
    console.log("🎉 Vercel AI SDK test completed!");
  })
  .catch((error) => {
    console.error("💥 Error:", error.message);
    process.exit(1);
  });
