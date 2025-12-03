/**
 * Test Event-Job Integration
 * Demonstrates how unrouting integrates with GitVan's event system
 */

import { discoverEvents, loadEventDefinition } from "./src/runtime/events.mjs";
import { scanJobs } from "./src/jobs/scan.mjs";
import { withGitVan } from "./src/core/context.mjs";

async function testEventJobIntegration() {
  console.log("🔗 Testing Event-Job Integration\n");

  await withGitVan({ cwd: process.cwd() }, async () => {
    // 1. Discover events
    console.log("1. Discovering events...");
    const events = discoverEvents("./events");
    console.log(`   Found ${events.length} events:`);
    events.forEach((event) => {
      console.log(`   - ${event.id}: ${event.type} (${event.pattern})`);
    });

    // 2. Load event definitions
    console.log("\n2. Loading event definitions...");
    const eventDefinitions = [];
    for (const event of events) {
      const definition = await loadEventDefinition(event.file);
      if (definition) {
        eventDefinitions.push({ ...event, definition });
        console.log(`   - ${event.id}: job="${definition.job}"`);
      }
    }

    // 3. Discover jobs
    console.log("\n3. Discovering jobs...");
    const jobs = await scanJobs("./jobs");
    console.log(`   Found ${jobs.length} jobs:`);
    jobs.forEach((job) => {
      console.log(`   - ${job.name}: ${job.meta?.desc || "No description"}`);
    });

    // 4. Check event-job connections
    console.log("\n4. Event-Job connections:");
    for (const event of eventDefinitions) {
      if (event.definition.job) {
        const job = jobs.find((j) => j.name === event.definition.job);
        if (job) {
          console.log(
            `   ✅ ${event.id} → ${event.definition.job} (${
              job.meta?.desc || "No description"
            })`
          );
        } else {
          console.log(
            `   ❌ ${event.id} → ${event.definition.job} (JOB NOT FOUND)`
          );
        }
      } else {
        console.log(`   ⚠️  ${event.id} → No job specified`);
      }
    }

    // 5. Test unrouting integration
    console.log("\n5. Unrouting integration test:");
    const unroutingEvents = eventDefinitions.filter(
      (e) => e.definition.job === "unrouting.route"
    );
    console.log(
      `   Found ${unroutingEvents.length} events that trigger unrouting.route:`
    );
    unroutingEvents.forEach((event) => {
      console.log(`   - ${event.id}: ${event.type} (${event.pattern})`);
      console.log(
        `     Payload: ${JSON.stringify(event.definition.payload || {})}`
      );
    });

    console.log("\n✅ Event-Job integration test completed!");
  });
}

// Run the test
testEventJobIntegration().catch(console.error);
