/**
 * GitVan Chat Design Subcommand
 * Interactive design wizard for complex jobs
 */

import {
  GITVAN_SYSTEM_CONTEXT,
  JOB_GENERATION_CONTEXT,
  EVENT_GENERATION_CONTEXT,
} from "../../ai/prompts/gitvan-context.mjs";
import { generateText } from "../../ai/provider.mjs";
import { createLogger } from "../../utils/logger.mjs";

const logger = createLogger("chat-design");

/**
 * Interactive design wizard
 * @param {object} config - GitVan config
 * @param {object} args - Design arguments
 * @returns {Promise<void>}
 */
export async function designCommand(config, args) {
  try {
    const requirements = args.requirements || args.arg0;

    if (!requirements) {
      console.log("🎨 GitVan Interactive Design Wizard");
      console.log();
      console.log(
        "This wizard helps you design complex GitVan jobs step by step."
      );
      console.log("It will ask questions and guide you through the process.");
      console.log();
      console.log("Usage:");
      console.log('  gitvan chat design "Create a deployment pipeline"');
      console.log('  gitvan chat design "Build a testing framework"');
      console.log('  gitvan chat design "Set up monitoring system"');
      console.log();
      console.log("The wizard will:");
      console.log("  • Analyze your requirements");
      console.log("  • Suggest appropriate event triggers");
      console.log("  • Recommend composables to use");
      console.log("  • Generate implementation strategy");
      console.log("  • Create working job code");
      return;
    }

    console.log("🎨 GitVan Interactive Design Wizard");
    console.log(`Analyzing requirements: "${requirements}"`);
    console.log();

    // Build context-aware design prompt
    const designPrompt = `${GITVAN_SYSTEM_CONTEXT}

${JOB_GENERATION_CONTEXT}

${EVENT_GENERATION_CONTEXT}

User Requirements: "${requirements}"

Act as a GitVan job design expert. Analyze the requirements and provide a comprehensive design plan:

1. **Requirements Analysis**
   - What is the user trying to accomplish?
   - What are the key functional requirements?
   - What are the non-functional requirements (performance, reliability, etc.)?

2. **Architecture Design**
   - What type of job is this? (automation, CI/CD, monitoring, etc.)
   - What event triggers make sense?
   - Which composables will be needed?
   - What's the overall flow?

3. **Implementation Strategy**
   - Break down into logical steps
   - Identify potential challenges
   - Suggest error handling approaches
   - Recommend testing strategy

4. **Job Structure**
   - Suggest meta information (name, description, tags)
   - Recommend event triggers (on object)
   - Outline the run function structure
   - Define expected return values

5. **Next Steps**
   - Provide specific commands to implement
   - Suggest any additional jobs that might be needed
   - Recommend configuration options

Format the response clearly with sections and actionable recommendations.`;

    // Generate design analysis using AI
    const result = await generateText({
      prompt: designPrompt,
      config,
    });

    console.log("🎯 Design Analysis:");
    console.log(result.output);

    console.log("\n🚀 Implementation Commands:");
    console.log(`  • Draft spec: gitvan chat draft "${requirements}"`);
    console.log(`  • Generate job: gitvan chat generate "${requirements}"`);
    console.log(`  • Preview code: gitvan chat preview "${requirements}"`);
    console.log(
      `  • Apply with name: gitvan chat apply "${requirements}" --name <name>`
    );
  } catch (error) {
    logger.error("Failed to run design wizard:", error.message);
    throw error;
  }
}
