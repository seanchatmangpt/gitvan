/**
 * GitVan Marketplace Scan Command
 *
 * CLI command to trigger marketplace scanning and indexing
 */

import { defineCommand } from "citty";
import { createLogger } from "../utils/logger.mjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "pathe";
import consola from "consola";

const logger = createLogger("cli:marketplace-scan");

export const marketplaceScanCommand = defineCommand({
  meta: {
    name: "marketplace-scan",
    description: "Scan and index marketplace packs from various sources",
  },
  subCommands: {
    index: defineCommand({
      meta: {
        name: "index",
        description: "Update marketplace index by scanning all sources",
      },
      args: {
        config: {
          type: "string",
          description: "Path to scan configuration file",
        },
        "skip-cache": {
          type: "boolean",
          description: "Skip cache and force fresh scan",
        },
        "dry-run": {
          type: "boolean",
          description: "Show what would be scanned without making changes",
        },
      },
      async run({ args }) {
        const configPath =
          args.config || join(process.cwd(), "config", "marketplace-scan.json");

        if (!existsSync(configPath)) {
          consola.error(`Scan configuration not found: ${configPath}`);
          consola.info(
            "Create a config file or use --config to specify a different path"
          );
          process.exit(1);
        }

        try {
          const config = JSON.parse(readFileSync(configPath, "utf8"));

          if (args["dry-run"]) {
            consola.info("Dry run mode - showing what would be scanned:");
            console.log(JSON.stringify(config.scanConfig, null, 2));
            return;
          }

          consola.start("Updating marketplace index...");

          // Import and run the index update job
          const { default: indexJob } = await import(
            "../jobs/marketplace.index-update.mjs"
          );

          const result = await indexJob.run({
            scanConfig: config.scanConfig,
            skipCache: args["skip-cache"] || false,
          });

          if (result.success) {
            consola.success("Marketplace index updated successfully");
            console.log(`   Packs indexed: ${result.summary.packs.total}`);
            console.log(`   Local packs: ${result.summary.packs.local}`);
            console.log(`   Remote packs: ${result.summary.packs.remote}`);
            console.log(`   Registry packs: ${result.summary.packs.registry}`);
            console.log(
              `   Unplugin integrations: ${result.summary.unplugin.integrationsGenerated}`
            );
          } else {
            consola.error("Failed to update marketplace index");
            process.exit(1);
          }
        } catch (error) {
          consola.error("Marketplace scan failed:", error.message);
          process.exit(1);
        }
      },
    }),

    scan: defineCommand({
      meta: {
        name: "scan",
        description: "Scan specific sources for marketplace packs",
      },
      args: {
        source: {
          type: "string",
          description: "Source to scan (github, gitlab, registry, local)",
        },
        target: {
          type: "string",
          description:
            "Target to scan (organization, group, registry URL, directory)",
        },
        config: {
          type: "string",
          description: "Path to scan configuration file",
        },
        auth: {
          type: "string",
          description: "Authentication token for private sources",
        },
        "dry-run": {
          type: "boolean",
          description: "Show what would be scanned without making changes",
        },
      },
      async run({ args }) {
        if (!args.source || !args.target) {
          consola.error("Both --source and --target are required");
          consola.info(
            "Example: gitvan marketplace-scan scan --source github --target unjs"
          );
          process.exit(1);
        }

        const configPath =
          args.config || join(process.cwd(), "config", "marketplace-scan.json");
        let config = { scanConfig: {} };

        if (existsSync(configPath)) {
          try {
            config = JSON.parse(readFileSync(configPath, "utf8"));
          } catch (error) {
            consola.warn(`Could not load config file: ${error.message}`);
          }
        }

        try {
          if (args["dry-run"]) {
            consola.info(
              `Dry run mode - would scan ${args.source}:${args.target}`
            );
            return;
          }

          consola.start(`Scanning ${args.source}:${args.target}...`);

          // Import and run the scanner job
          const { default: scannerJob } = await import(
            "../jobs/marketplace.scanner.mjs"
          );

          const scanConfig = {
            ...config.scanConfig,
            [args.source]: {
              ...config.scanConfig[args.source],
              auth: args.auth || config.scanConfig[args.source]?.auth,
            },
          };

          // Set the specific target based on source
          if (args.source === "github") {
            scanConfig.github.organizations = [args.target];
          } else if (args.source === "gitlab") {
            scanConfig.gitlab.groups = [args.target];
          } else if (args.source === "registry") {
            scanConfig.registries = [{ url: args.target }];
          } else if (args.source === "local") {
            scanConfig.local.directories = [args.target];
          }

          const result = await scannerJob.run({
            scanConfig,
          });

          if (result.success) {
            consola.success(`Scan completed successfully`);
            console.log(
              `   Total packs found: ${result.results.summary.totalPacks}`
            );
            console.log(`   Errors: ${result.results.summary.errors}`);
          } else {
            consola.error("Scan failed");
            process.exit(1);
          }
        } catch (error) {
          consola.error("Marketplace scan failed:", error.message);
          process.exit(1);
        }
      },
    }),

    status: defineCommand({
      meta: {
        name: "status",
        description: "Show marketplace scan status and statistics",
      },
      async run() {
        try {
          const indexPath = join(
            process.cwd(),
            ".gitvan",
            "marketplace",
            "index.json"
          );
          const resultsPath = join(
            process.cwd(),
            ".gitvan",
            "marketplace",
            "scan-results.json"
          );

          if (existsSync(indexPath)) {
            const index = JSON.parse(readFileSync(indexPath, "utf8"));

            consola.info("Marketplace Index Status:");
            console.log(`   Last updated: ${index.generatedAt}`);
            console.log(`   Total packs: ${index.packs.length}`);
            console.log(`   Categories: ${index.categories.length}`);
            console.log(`   Tags: ${index.tags.length}`);
            console.log(`   Capabilities: ${index.capabilities.length}`);
            console.log(`   Sources: ${index.sources.join(", ")}`);
          } else {
            consola.warn(
              'No marketplace index found. Run "gitvan marketplace-scan index" to create one.'
            );
          }

          if (existsSync(resultsPath)) {
            const results = JSON.parse(readFileSync(resultsPath, "utf8"));

            console.log();
            consola.info("Last Scan Results:");
            console.log(`   Scan time: ${results.timestamp}`);
            console.log(`   Total packs found: ${results.summary.totalPacks}`);
            console.log(`   Errors: ${results.summary.errors}`);

            if (results.scans) {
              Object.entries(results.scans).forEach(([source, scan]) => {
                console.log(
                  `   ${source}: ${
                    scan.totalPacks ||
                    scan.totalRepos ||
                    scan.totalProjects ||
                    0
                  } items`
                );
              });
            }
          }
        } catch (error) {
          consola.error("Failed to get marketplace status:", error.message);
          process.exit(1);
        }
      },
    }),

    config: defineCommand({
      meta: {
        name: "config",
        description: "Manage marketplace scan configuration",
      },
      subCommands: {
        init: defineCommand({
          meta: {
            name: "init",
            description: "Initialize marketplace scan configuration",
          },
          args: {
            output: {
              type: "string",
              description: "Output path for configuration file",
            },
          },
          async run({ args }) {
            const outputPath =
              args.output ||
              join(process.cwd(), "config", "marketplace-scan.json");

            try {
              const { writeFileSync, mkdirSync } = await import("node:fs");
              const { dirname } = await import("pathe");

              const defaultConfig = {
                name: "GitVan Marketplace Scan Configuration",
                version: "1.0.0",
                description:
                  "Configuration for marketplace pack scanning and indexing",
                scanConfig: {
                  github: {
                    organizations: ["unjs", "nuxt", "vuejs"],
                    auth: "${GITHUB_TOKEN}",
                    filters: {
                      topics: ["gitvan", "pack", "template"],
                      hasPackJson: true,
                      minStars: 10,
                    },
                  },
                  gitlab: {
                    groups: ["gitlab-org"],
                    auth: "${GITLAB_TOKEN}",
                    filters: {
                      topics: ["gitvan", "pack"],
                      hasPackJson: true,
                    },
                  },
                  registries: [
                    {
                      name: "GitVan Official",
                      url: "https://registry.gitvan.dev",
                      auth: "${GITVAN_REGISTRY_TOKEN}",
                    },
                  ],
                  local: {
                    directories: ["packs"],
                    recursive: true,
                  },
                },
              };

              mkdirSync(dirname(outputPath), { recursive: true });
              writeFileSync(outputPath, JSON.stringify(defaultConfig, null, 2));

              consola.success(`Configuration file created: ${outputPath}`);
              consola.info(
                "Edit the file to customize your scan targets and settings"
              );
            } catch (error) {
              consola.error(
                "Failed to create configuration file:",
                error.message
              );
              process.exit(1);
            }
          },
        }),

        validate: defineCommand({
          meta: {
            name: "validate",
            description: "Validate marketplace scan configuration",
          },
          args: {
            config: {
              type: "string",
              description: "Path to configuration file",
            },
          },
          async run({ args }) {
            const configPath =
              args.config ||
              join(process.cwd(), "config", "marketplace-scan.json");

            if (!existsSync(configPath)) {
              consola.error(`Configuration file not found: ${configPath}`);
              process.exit(1);
            }

            try {
              const config = JSON.parse(readFileSync(configPath, "utf8"));

              // Basic validation
              const errors = [];

              if (!config.scanConfig) {
                errors.push("Missing scanConfig section");
              }

              if (
                config.scanConfig?.github &&
                !config.scanConfig.github.organizations
              ) {
                errors.push("GitHub organizations not specified");
              }

              if (
                config.scanConfig?.gitlab &&
                !config.scanConfig.gitlab.groups
              ) {
                errors.push("GitLab groups not specified");
              }

              if (
                config.scanConfig?.local &&
                !config.scanConfig.local.directories
              ) {
                errors.push("Local directories not specified");
              }

              if (errors.length > 0) {
                consola.error("Configuration validation failed:");
                errors.forEach((error) => console.log(`   - ${error}`));
                process.exit(1);
              } else {
                consola.success("Configuration is valid");
              }
            } catch (error) {
              consola.error("Failed to validate configuration:", error.message);
              process.exit(1);
            }
          },
        }),
      },
    }),
  },
});
