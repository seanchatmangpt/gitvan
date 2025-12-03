import { withGitVan } from "./src/core/context.mjs";
import { writeFileSync } from "node:fs";

async function generateChangelogV30() {
  try {
    console.log("🤖 GitVan v3.0 Changelog Generation");
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
      console.log("📝 Generating GitVan v3.0 Changelog...");
      
      // Direct Ollama call that we know works
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen3-coder:latest",
          prompt: `Generate a comprehensive changelog for GitVan v3.0 with these major features:

## 🚀 Major Features
- **New WorkflowEngine**: Complete rewrite using useGraph for Turtle file loading
- **RDF → Zod → Ollama Pipeline**: AI-powered workflow generation from natural language
- **CLI Integration**: Full workflow commands (list, run, dry-run, verbose)
- **Multi-Step Execution**: Support for SPARQL, Template, File, HTTP, CLI steps
- **Property Mapping**: Automatic Turtle property to step handler configuration mapping
- **Knowledge Hook Integration**: Intelligent workflow triggering via SPARQL predicates
- **End-to-End Testing**: Comprehensive JTBD workflow validation
- **Cleanroom Testing**: Systematic validation of all components

## 🔧 Technical Improvements
- **Modular Step Handlers**: Individual handlers for each step type
- **Context Management**: Proper async context binding with unctx
- **Error Handling**: Comprehensive error reporting and recovery
- **Performance**: Sub-100ms step execution times
- **Type Safety**: Zod schema validation throughout
- **Documentation**: Complete API documentation and examples

## 🎯 Architecture Changes
- **Pure useGraph**: Simplified workflow engine using only useGraph composable
- **Turtle-First**: All workflows defined in Turtle (.ttl) files
- **AI-Native**: Built-in Ollama integration for intelligent automation
- **Git-Native**: Uses Git refs and notes for state management
- **Composable**: Modular design with reusable components

Format as a professional changelog with proper markdown, emojis, and sections.`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const changelog = data.response;
      
      console.log("✅ Generated GitVan v3.0 Changelog");
      console.log("   Length:", changelog.length);
      console.log();
      
      // Save to file
      writeFileSync("CHANGELOG-V3.md", changelog);
      console.log("💾 Changelog saved to CHANGELOG-V3.md");
      
      console.log("\n📄 Generated Changelog:");
      console.log("=".repeat(50));
      console.log(changelog);
      console.log("=".repeat(50));
      
      return changelog;
    });

  } catch (error) {
    console.error("❌ Changelog generation failed:", error.message);
    throw error;
  }
}

generateChangelogV30()
  .then((changelog) => {
    console.log("\n🎉 GitVan v3.0 Changelog Generation Complete!");
    console.log("Version: 3.0.0");
    console.log("File: CHANGELOG-V3.md");
  })
  .catch((error) => {
    console.error("💥 Changelog Generation Error:", error.message);
    process.exit(1);
  });
