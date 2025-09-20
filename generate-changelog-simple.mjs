import { writeFileSync } from "node:fs";

async function generateChangelogV30() {
  try {
    console.log("🤖 GitVan v3.0 Changelog Generation (Direct Approach)");
    console.log("=".repeat(50));

    console.log("📝 Generating changelog with direct Ollama call...");

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3-coder:latest",
        prompt: `Generate a professional changelog for GitVan v3.0 with these features:

- New WorkflowEngine using useGraph for Turtle files
- RDF to Zod conversion pipeline  
- CLI workflow commands (list, run, dry-run)
- Multi-step execution (SPARQL, Template, File, HTTP, CLI)
- Knowledge hook integration
- End-to-end testing with JTBD workflows
- Performance improvements (sub-100ms execution)
- Comprehensive error handling

Format as markdown with proper sections and emojis.`,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const changelog = data.response;

    console.log("✅ Generated changelog");
    console.log("   Length:", changelog.length);
    console.log("   Duration:", data.total_duration / 1000000, "ms");

    // Save to file
    writeFileSync("CHANGELOG-V3.md", changelog);
    console.log("💾 Saved to CHANGELOG-V3.md");

    console.log("\n📄 Generated Changelog:");
    console.log("=".repeat(50));
    console.log(changelog);
    console.log("=".repeat(50));

    return changelog;
  } catch (error) {
    console.error("❌ Changelog generation failed:", error.message);
    throw error;
  }
}

generateChangelogV30()
  .then(() => {
    console.log("\n🎉 GitVan v3.0 Changelog Complete!");
  })
  .catch((error) => {
    console.error("💥 Error:", error.message);
    process.exit(1);
  });
