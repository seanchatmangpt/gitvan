// src/config/rdf-config-examples.mjs
// Comprehensive examples for RDF configuration

import { loadRDFConfig } from "./rdf-loader.mjs";
import { useRDFConfig, createReactiveConfig } from "../composables/rdf-config.mjs";
import { withGitVan } from "../composables/ctx.mjs";

// ============================================================================
// Example 1: Basic Loading from Environment Variables
// ============================================================================

export async function example1BasicLoad() {
  console.log("\n=== Example 1: Basic Load from Environment ===\n");

  // Set up environment
  const env = {
    GITVAN_AI_PROVIDER: "anthropic",
    GITVAN_AI_MODEL: "claude-opus-4.5",
    GITVAN_AI_TEMPERATURE: "0.7",
    GITVAN_RUNTIME_TIMEZONE: "UTC",
    GITVAN_RUNTIME_LOCALE: "en-US",
    GITVAN_RUNTIME_DETERMINISTIC: "true",
  };

  // Load config
  const config = await loadRDFConfig({ env });

  // Get individual values
  console.log("AI Provider:", await config.get("ai.provider"));
  console.log("AI Model:", await config.get("ai.model"));
  console.log("Runtime Timezone:", await config.get("runtime.timezone"));

  // Get all values as POJO
  const allConfig = await config.all();
  console.log("\nAll config:", JSON.stringify(allConfig, null, 2));
}

// ============================================================================
// Example 2: SPARQL Queries on Config
// ============================================================================

export async function example2SPARQLQueries() {
  console.log("\n=== Example 2: SPARQL Queries ===\n");

  const env = {
    GITVAN_AI_PROVIDER: "anthropic",
    GITVAN_AI_MODEL: "claude-opus",
    GITVAN_RUNTIME_TIMEZONE: "UTC",
  };

  const config = await loadRDFConfig({ env });

  // Query 1: Get all AI configuration
  const aiQuery = `
    PREFIX gvc: <https://gitvan.dev/ontology/config#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    SELECT ?property ?value
    WHERE {
      <urn:gitvan:config> ?property ?value .
      FILTER(REGEX(STR(?property), "^https://gitvan.dev/ontology/config#ai"))
    }
  `;

  const aiResults = await config.query(aiQuery);
  console.log("AI Config Results:", aiResults);

  // Query 2: Get all string-valued properties
  const stringQuery = `
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    SELECT ?property ?value
    WHERE {
      <urn:gitvan:config> ?property ?value .
      FILTER(DATATYPE(?value) = xsd:string)
    }
    LIMIT 10
  `;

  const stringResults = await config.query(stringQuery);
  console.log("\nString Properties:", stringResults);
}

// ============================================================================
// Example 3: Plain Object Config with RDF
// ============================================================================

export async function example3PlainObjectConfig() {
  console.log("\n=== Example 3: Plain Object Config ===\n");

  const configObj = {
    rootDir: "/home/user/project",
    jobs: {
      dir: "jobs",
      scan: {
        patterns: ["jobs/**/*.mjs", "jobs/**/*.cron.mjs"],
        ignore: ["node_modules/**", ".git/**"],
      },
    },
    ai: {
      provider: "ollama",
      model: "neural-chat:latest",
      temperature: 0.8,
      maxTokens: 2048,
    },
  };

  const config = await loadRDFConfig({ configObj });

  console.log("Root Dir:", await config.get("rootDir"));
  console.log("Jobs Dir:", await config.get("jobs.dir"));
  console.log("AI Provider:", await config.get("ai.provider"));

  // Export as Turtle
  const turtle = await config.toTurtle();
  console.log("\nTurtle representation (first 500 chars):");
  console.log(turtle.substring(0, 500) + "...");
}

// ============================================================================
// Example 4: SHACL Validation
// ============================================================================

export async function example4SHACLValidation() {
  console.log("\n=== Example 4: SHACL Validation ===\n");

  // Valid config
  const validEnv = {
    GITVAN_AI_PROVIDER: "anthropic",
    GITVAN_AI_MODEL: "claude-opus",
    GITVAN_AI_TEMPERATURE: "0.7",
    GITVAN_AI_MAX_TOKENS: "4096",
    GITVAN_RUNTIME_TIMEZONE: "UTC",
    GITVAN_RUNTIME_LOCALE: "en-US",
    GITVAN_RUNTIME_DETERMINISTIC: "true",
    GITVAN_RUNTIME_SANDBOX: "true",
  };

  const validConfig = await loadRDFConfig({ env: validEnv });
  const validationResult = await validConfig.validate();
  console.log("Validation Result:", validationResult);
  console.log("Is Valid:", validationResult.valid);

  if (validationResult.results.length > 0) {
    console.log("Violations:", validationResult.results);
  }
}

// ============================================================================
// Example 5: Composable with Context
// ============================================================================

export async function example5ComposableWithContext() {
  console.log("\n=== Example 5: Composable with Context ===\n");

  // This example shows proper context handling (simplified)
  const env = {
    GITVAN_AI_PROVIDER: "anthropic",
    GITVAN_AI_MODEL: "claude-opus",
  };

  // In real code, you'd have a gitvan context set up
  // await withGitVan(ctx, async () => {
  //   const config = await useRDFConfig({ env });
  //   console.log("Provider:", await config.get("ai.provider"));
  // });

  // For this example, we'll just use loadRDFConfig directly
  const config = await loadRDFConfig({ env });

  const provider = await config.get("ai.provider");
  console.log("AI Provider:", provider);
}

// ============================================================================
// Example 6: Reactive Config Wrapper
// ============================================================================

export async function example6ReactiveConfig() {
  console.log("\n=== Example 6: Reactive Config ===\n");

  const env = {
    GITVAN_DAEMON_POLL_MS: "1500",
    GITVAN_DAEMON_LOOKBACK: "600",
    GITVAN_DAEMON_MAX_PER_TICK: "50",
  };

  const baseConfig = await loadRDFConfig({ env });
  const reactiveConfig = createReactiveConfig(baseConfig);

  // First call loads and caches
  const pollMs1 = await reactiveConfig.getValue("daemon.pollMs");
  console.log("Daemon Poll MS (first call):", pollMs1);

  // Second call uses cache
  const pollMs2 = await reactiveConfig.getValue("daemon.pollMs");
  console.log("Daemon Poll MS (cached):", pollMs2);

  // Get all values
  const all = await reactiveConfig.getAll();
  console.log("All config:", all);
}

// ============================================================================
// Example 7: Config Merging (Env + Object)
// ============================================================================

export async function example7ConfigMerging() {
  console.log("\n=== Example 7: Config Merging ===\n");

  const env = {
    GITVAN_AI_PROVIDER: "anthropic",
    GITVAN_AI_TEMPERATURE: "0.9",
  };

  const configObj = {
    ai: {
      model: "claude-opus",
      maxTokens: 2048,
    },
    runtime: {
      timezone: "UTC",
      locale: "en-US",
    },
  };

  const config = await loadRDFConfig({ env, configObj });

  console.log("AI Provider (from env):", await config.get("ai.provider"));
  console.log("AI Temperature (from env):", await config.get("ai.temperature"));
  console.log("AI Model (from object):", await config.get("ai.model"));
  console.log("AI Max Tokens (from object):", await config.get("ai.maxTokens"));
}

// ============================================================================
// Example 8: Getting All Config Paths
// ============================================================================

export async function example8GetPaths() {
  console.log("\n=== Example 8: Get All Config Paths ===\n");

  const env = {
    GITVAN_AI_PROVIDER: "anthropic",
    GITVAN_RUNTIME_TIMEZONE: "UTC",
    GITVAN_DAEMON_POLL_MS: "1500",
  };

  const config = await loadRDFConfig({ env });

  const paths = await config.paths();
  console.log("Available paths:");
  paths.forEach((path) => console.log(`  - ${path}`));
}

// ============================================================================
// Example 9: Export Config to Different Formats
// ============================================================================

export async function example9ExportFormats() {
  console.log("\n=== Example 9: Export Formats ===\n");

  const configObj = {
    ai: {
      provider: "anthropic",
      model: "claude-opus",
    },
    runtime: {
      timezone: "UTC",
    },
  };

  const config = await loadRDFConfig({ configObj });

  // Export as POJO
  const pojo = await config.toPOJO();
  console.log("POJO Format:");
  console.log(JSON.stringify(pojo, null, 2));

  // Export as Turtle
  const turtle = await config.toTurtle();
  console.log("\nTurtle Format (first 400 chars):");
  console.log(turtle.substring(0, 400) + "...");
}

// ============================================================================
// Example 10: Using Custom Config URI
// ============================================================================

export async function example10CustomURI() {
  console.log("\n=== Example 10: Custom Config URI ===\n");

  const env = {
    GITVAN_AI_PROVIDER: "anthropic",
  };

  const config = await loadRDFConfig({
    env,
    configUri: "https://example.com/config/production",
  });

  console.log("AI Provider:", await config.get("ai.provider"));

  // The config is stored with the custom URI
  const sparql = `
    PREFIX gvc: <https://gitvan.dev/ontology/config#>
    SELECT ?subject
    WHERE {
      ?subject rdf:type gvc:Configuration .
    }
  `;

  const results = await config.query(sparql);
  console.log("Config subjects:", results);
}

// ============================================================================
// Run all examples
// ============================================================================

export async function runAllExamples() {
  try {
    await example1BasicLoad();
    await example2SPARQLQueries();
    await example3PlainObjectConfig();
    await example4SHACLValidation();
    await example5ComposableWithContext();
    await example6ReactiveConfig();
    await example7ConfigMerging();
    await example8GetPaths();
    await example9ExportFormats();
    await example10CustomURI();

    console.log("\n=== All Examples Completed Successfully ===\n");
  } catch (error) {
    console.error("Error running examples:", error.message);
    console.error(error.stack);
  }
}
