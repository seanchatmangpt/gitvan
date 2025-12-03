import { withGitVan } from "./src/core/context.mjs";
import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";

async function generateChangelogV22() {
  try {
    console.log("🤖 GitVan v2.2 Changelog Generation");
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
        generateZodSchemaFromOntology
      } = await useOllamaRDF({
        model: "qwen3-coder:latest",
        baseURL: "http://localhost:11434"
      });

      console.log("📝 Step 1: Generate Changelog Ontology");
      const changelogOntology = await generateOntology(
        `Create a comprehensive changelog ontology for GitVan v2.2 that includes:
        - New WorkflowEngine class that loads Turtle files using useGraph
        - CLI integration with workflow commands (list, run, dry-run, verbose)
        - Multi-step workflow execution with step handlers
        - Property mapping from Turtle to step handler configurations
        - Support for multiple step types (SPARQL, Template, File, HTTP, CLI)
        - Knowledge hook workflow triggering capability
        - End-to-end testing with JTBD workflows
        - RDF to Zod conversion pipeline
        - Ollama AI integration for workflow generation
        - Cleanroom testing and validation
        - Performance improvements and bug fixes`,
        { temperature: 0.3, maxTokens: 1000 }
      );
      console.log("✅ Generated Changelog Ontology");
      console.log("   Length:", changelogOntology.length);
      console.log();

      console.log("🔧 Step 2: Generate Changelog Schema");
      const changelogSchema = await generateZodSchemaFromOntology(
        changelogOntology,
        "GitVanChangelog",
        { temperature: 0.3, maxTokens: 600 }
      );
      console.log("✅ Generated Changelog Schema");
      console.log("   Length:", changelogSchema.length);
      console.log();

      console.log("📋 Step 3: Generate Structured Changelog");
      const structuredChangelog = await generateOntology(
        `Based on the GitVan v2.2 features, generate a professional changelog in markdown format with:
        - Version header: ## [2.2.0] - 2025-09-20
        - Major Features section with bullet points
        - Technical Improvements section
        - Bug Fixes section
        - Performance Enhancements section
        - Breaking Changes section (if any)
        - Migration Guide section
        - Use proper markdown formatting and emojis`,
        { temperature: 0.4, maxTokens: 1500 }
      );
      console.log("✅ Generated Structured Changelog");
      console.log("   Length:", structuredChangelog.length);
      console.log();

      console.log("🎉 GitVan v2.2 Changelog Generation Complete!");
      
      return {
        changelogOntology,
        changelogSchema,
        structuredChangelog,
        version: "2.2.0",
        success: true
      };
    });

  } catch (error) {
    console.error("❌ Changelog generation failed:", error.message);
    throw error;
  }
}

// Run with reasonable timeout
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error("Changelog generation timeout after 60 seconds")), 60000);
});

Promise.race([generateChangelogV22(), timeoutPromise])
  .then((result) => {
    if (result && result.success) {
      console.log("\n🎯 GitVan v2.2 Changelog Generated!");
      console.log("Version:", result.version);
      console.log("Components Generated:");
      console.log("- Changelog Ontology: ✅");
      console.log("- Changelog Schema: ✅");
      console.log("- Structured Changelog: ✅");
      console.log("\n📄 Generated Changelog:");
      console.log("=".repeat(50));
      console.log(result.structuredChangelog);
      console.log("=".repeat(50));
    } else {
      console.log("✅ Changelog generation completed!");
    }
  })
  .catch((error) => {
    console.error("💥 Changelog Generation Error:", error.message);
    process.exit(1);
  });
