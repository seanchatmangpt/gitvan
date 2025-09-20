import { useOllamaRDF } from "./src/rdf-to-zod/useOllamaRDF.mjs";
import { withGitVan } from "./src/core/context.mjs";
import { useLog } from "./src/composables/log.mjs";

const logger = useLog("OllamaRDF-Workflow-Generator");

async function generateWorkflowWithOllamaRDF() {
  try {
    logger.info("🚀 Starting OllamaRDF workflow generation...");
    
    // Create a test context
    const context = {
      cwd: process.cwd(),
      env: process.env,
      config: {
        ai: {
          provider: "ollama",
          model: "qwen3-coder",
          baseURL: "http://localhost:11434"
        }
      }
    };

    // Use OllamaRDF to generate a workflow
    await withGitVan(context, async () => {
      const { ollamaRDF } = await useOllamaRDF({
        model: "qwen3-coder",
        baseURL: "http://localhost:11434"
      });

      logger.info("📝 Generating workflow ontology...");
      
      // Generate a workflow ontology
      const workflowDescription = `
        Create a data processing workflow that:
        1. Reads data from a CSV file
        2. Processes the data with SPARQL queries
        3. Generates a report using templates
        4. Sends notifications via HTTP
        5. Saves results to files
        
        The workflow should be triggered by file changes and include error handling.
      `;

      const ontology = await ollamaRDF.generateOntology(workflowDescription);
      logger.info("✅ Generated ontology:");
      console.log(ontology);

      logger.info("📊 Generating workflow data...");
      
      // Generate sample workflow data
      const workflowData = await ollamaRDF.generateRDFFromDescription(
        "Generate a complete Turtle workflow definition with multiple steps including SPARQL, Template, File, and HTTP operations",
        ontology
      );
      
      logger.info("✅ Generated workflow data:");
      console.log(workflowData);

      logger.info("🔍 Validating workflow...");
      
      // Validate the generated workflow
      const validation = await ollamaRDF.validateRDFData(workflowData, ontology);
      logger.info(`✅ Validation result: ${validation.isValid ? 'VALID' : 'INVALID'}`);
      logger.info(`📊 Validation score: ${validation.score}/10`);
      
      if (!validation.isValid) {
        logger.warn("⚠️ Validation issues:");
        console.log(validation.issues);
      }

      logger.info("📚 Generating documentation...");
      
      // Generate documentation
      const documentation = await ollamaRDF.generateRDFDocumentation(ontology);
      logger.info("✅ Generated documentation:");
      console.log(documentation);

      logger.info("🎉 Workflow generation completed successfully!");
      
      return {
        ontology,
        workflowData,
        validation,
        documentation,
        success: true
      };
    });

  } catch (error) {
    logger.error("❌ Workflow generation failed:", error);
    throw error;
  }
}

// Run the workflow generation
generateWorkflowWithOllamaRDF()
  .then((result) => {
    console.log("\n🎯 Final Result:");
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error("💥 Error:", error.message);
    process.exit(1);
  });
