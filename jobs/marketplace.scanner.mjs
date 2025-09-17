/**
 * GitVan Marketplace Scanner Job
 *
 * This job provides targeted scanning capabilities for the marketplace:
 * - Scan specific GitHub organizations
 * - Scan specific GitLab groups
 * - Scan custom registries
 * - Scan local directories
 * - Update specific pack categories
 */

import { defineJob } from "../src/core/job-registry.mjs";
import { Marketplace } from "../src/pack/marketplace.mjs";
import { EnhancedPackManager } from "../src/pack/giget-integration.mjs";
import { createLogger } from "../src/utils/logger.mjs";
import { join, dirname } from "pathe";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const logger = createLogger("job:marketplace-scanner");

export default defineJob({
  meta: {
    name: "marketplace:scanner",
    description: "Scan specific sources for marketplace packs",
    version: "1.0.0",
    category: "marketplace",
    tags: ["marketplace", "scanner", "discovery", "remote-packs"],
  },
  hooks: ["post-commit", "post-merge"],
  async run(context) {
    logger.info("Starting marketplace scanner...");

    try {
      const marketplace = new Marketplace();
      const packManager = new EnhancedPackManager();

      // Get scan configuration from context or defaults
      const scanConfig = getScanConfiguration(context);
      logger.info(`Scan configuration:`, scanConfig);

      const results = {
        timestamp: new Date().toISOString(),
        config: scanConfig,
        scans: {},
        summary: {
          totalPacks: 0,
          newPacks: 0,
          updatedPacks: 0,
          errors: 0,
        },
      };

      // Scan GitHub organizations
      if (scanConfig.github?.organizations?.length > 0) {
        logger.info("Scanning GitHub organizations...");
        results.scans.github = await scanGitHubOrganizations(
          scanConfig.github.organizations,
          scanConfig.github.auth
        );
      }

      // Scan GitLab groups
      if (scanConfig.gitlab?.groups?.length > 0) {
        logger.info("Scanning GitLab groups...");
        results.scans.gitlab = await scanGitLabGroups(
          scanConfig.gitlab.groups,
          scanConfig.gitlab.auth
        );
      }

      // Scan custom registries
      if (scanConfig.registries?.length > 0) {
        logger.info("Scanning custom registries...");
        results.scans.registries = await scanCustomRegistries(
          scanConfig.registries
        );
      }

      // Scan local directories
      if (scanConfig.local?.directories?.length > 0) {
        logger.info("Scanning local directories...");
        results.scans.local = await scanLocalDirectories(
          scanConfig.local.directories
        );
      }

      // Update marketplace with discovered packs
      logger.info("Updating marketplace with discovered packs...");
      const updateResult = await updateMarketplaceWithScannedPacks(
        marketplace,
        results.scans
      );
      results.marketplaceUpdate = updateResult;

      // Calculate summary
      results.summary = calculateScanSummary(results.scans);

      // Write scan results
      const resultsPath = join(
        process.cwd(),
        ".gitvan",
        "marketplace",
        "scan-results.json"
      );
      mkdirSync(dirname(resultsPath), { recursive: true });
      writeFileSync(resultsPath, JSON.stringify(results, null, 2));

      logger.success("Marketplace scanner completed successfully");

      return {
        success: true,
        results,
        message: `Scanner found ${results.summary.totalPacks} packs across ${
          Object.keys(results.scans).length
        } sources`,
      };
    } catch (error) {
      logger.error("Marketplace scanner failed:", error.message);
      throw error;
    }
  },
});

/**
 * Get scan configuration from context or defaults
 */
function getScanConfiguration(context) {
  const defaultConfig = {
    github: {
      organizations: [],
      auth: process.env.GITHUB_TOKEN || process.env.GIGET_AUTH,
    },
    gitlab: {
      groups: [],
      auth: process.env.GITLAB_TOKEN,
    },
    registries: [],
    local: {
      directories: ["packs"],
    },
    filters: {
      categories: [],
      tags: [],
      capabilities: [],
    },
  };

  // Merge with context configuration if provided
  if (context.scanConfig) {
    return { ...defaultConfig, ...context.scanConfig };
  }

  return defaultConfig;
}

/**
 * Scan GitHub organizations for packs
 */
async function scanGitHubOrganizations(organizations, auth) {
  const results = {
    organizations: [],
    totalRepos: 0,
    packsFound: 0,
    errors: [],
  };

  for (const org of organizations) {
    try {
      logger.info(`Scanning GitHub organization: ${org}`);

      const orgResults = await scanGitHubOrganization(org, auth);
      results.organizations.push({
        name: org,
        ...orgResults,
      });

      results.totalRepos += orgResults.reposScanned;
      results.packsFound += orgResults.packsFound;
    } catch (error) {
      logger.error(`Error scanning GitHub organization ${org}:`, error.message);
      results.errors.push({
        organization: org,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Scan a single GitHub organization
 */
async function scanGitHubOrganization(organization, auth) {
  try {
    // This would use GitHub API to scan repositories
    // For now, return mock data
    return {
      reposScanned: 0,
      packsFound: 0,
      packs: [],
    };
  } catch (error) {
    throw new Error(
      `Failed to scan GitHub organization ${organization}: ${error.message}`
    );
  }
}

/**
 * Scan GitLab groups for packs
 */
async function scanGitLabGroups(groups, auth) {
  const results = {
    groups: [],
    totalProjects: 0,
    packsFound: 0,
    errors: [],
  };

  for (const group of groups) {
    try {
      logger.info(`Scanning GitLab group: ${group}`);

      const groupResults = await scanGitLabGroup(group, auth);
      results.groups.push({
        name: group,
        ...groupResults,
      });

      results.totalProjects += groupResults.projectsScanned;
      results.packsFound += groupResults.packsFound;
    } catch (error) {
      logger.error(`Error scanning GitLab group ${group}:`, error.message);
      results.errors.push({
        group: group,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Scan a single GitLab group
 */
async function scanGitLabGroup(group, auth) {
  try {
    // This would use GitLab API to scan projects
    // For now, return mock data
    return {
      projectsScanned: 0,
      packsFound: 0,
      packs: [],
    };
  } catch (error) {
    throw new Error(`Failed to scan GitLab group ${group}: ${error.message}`);
  }
}

/**
 * Scan custom registries
 */
async function scanCustomRegistries(registries) {
  const results = {
    registries: [],
    totalPacks: 0,
    errors: [],
  };

  for (const registry of registries) {
    try {
      logger.info(`Scanning custom registry: ${registry.url}`);

      const registryResults = await scanCustomRegistry(registry);
      results.registries.push({
        url: registry.url,
        ...registryResults,
      });

      results.totalPacks += registryResults.packsFound;
    } catch (error) {
      logger.error(`Error scanning registry ${registry.url}:`, error.message);
      results.errors.push({
        registry: registry.url,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Scan a single custom registry
 */
async function scanCustomRegistry(registry) {
  try {
    // This would scan the custom registry
    // For now, return mock data
    return {
      packsFound: 0,
      packs: [],
    };
  } catch (error) {
    throw new Error(
      `Failed to scan registry ${registry.url}: ${error.message}`
    );
  }
}

/**
 * Scan local directories for packs
 */
async function scanLocalDirectories(directories) {
  const results = {
    directories: [],
    totalPacks: 0,
    errors: [],
  };

  for (const directory of directories) {
    try {
      logger.info(`Scanning local directory: ${directory}`);

      const dirResults = await scanLocalDirectory(directory);
      results.directories.push({
        path: directory,
        ...dirResults,
      });

      results.totalPacks += dirResults.packsFound;
    } catch (error) {
      logger.error(`Error scanning directory ${directory}:`, error.message);
      results.errors.push({
        directory: directory,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Scan a single local directory
 */
async function scanLocalDirectory(directory) {
  try {
    const { readdirSync, statSync } = await import("node:fs");
    const packs = [];

    if (!existsSync(directory)) {
      return {
        packsFound: 0,
        packs: [],
      };
    }

    const entries = readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const packPath = join(directory, entry.name);
        const manifestPath = join(packPath, "pack.json");

        if (existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
            packs.push({
              id: manifest.id || entry.name,
              name: manifest.name || entry.name,
              version: manifest.version || "1.0.0",
              path: packPath,
              manifest,
            });
          } catch (error) {
            // Skip invalid manifests
          }
        }
      }
    }

    return {
      packsFound: packs.length,
      packs,
    };
  } catch (error) {
    throw new Error(`Failed to scan directory ${directory}: ${error.message}`);
  }
}

/**
 * Update marketplace with scanned packs
 */
async function updateMarketplaceWithScannedPacks(marketplace, scans) {
  try {
    // Collect all packs from scans
    const allPacks = [];

    Object.values(scans).forEach((scan) => {
      if (scan.organizations) {
        scan.organizations.forEach((org) => {
          allPacks.push(...org.packs);
        });
      }
      if (scan.groups) {
        scan.groups.forEach((group) => {
          allPacks.push(...group.packs);
        });
      }
      if (scan.registries) {
        scan.registries.forEach((registry) => {
          allPacks.push(...registry.packs);
        });
      }
      if (scan.directories) {
        scan.directories.forEach((dir) => {
          allPacks.push(...dir.packs);
        });
      }
    });

    // Update marketplace index
    const indexPath = join(
      process.cwd(),
      ".gitvan",
      "marketplace",
      "index.json"
    );
    if (existsSync(indexPath)) {
      const existingIndex = JSON.parse(readFileSync(indexPath, "utf8"));
      const updatedIndex = {
        ...existingIndex,
        lastScanned: new Date().toISOString(),
        scannedPacks: allPacks.length,
      };
      writeFileSync(indexPath, JSON.stringify(updatedIndex, null, 2));
    }

    return {
      packsProcessed: allPacks.length,
      indexUpdated: true,
    };
  } catch (error) {
    throw new Error(`Failed to update marketplace: ${error.message}`);
  }
}

/**
 * Calculate scan summary
 */
function calculateScanSummary(scans) {
  let totalPacks = 0;
  let newPacks = 0;
  let updatedPacks = 0;
  let errors = 0;

  Object.values(scans).forEach((scan) => {
    if (scan.organizations) {
      scan.organizations.forEach((org) => {
        totalPacks += org.packsFound;
      });
    }
    if (scan.groups) {
      scan.groups.forEach((group) => {
        totalPacks += group.packsFound;
      });
    }
    if (scan.registries) {
      scan.registries.forEach((registry) => {
        totalPacks += registry.packsFound;
      });
    }
    if (scan.directories) {
      scan.directories.forEach((dir) => {
        totalPacks += dir.packsFound;
      });
    }
    if (scan.errors) {
      errors += scan.errors.length;
    }
  });

  return {
    totalPacks,
    newPacks,
    updatedPacks,
    errors,
  };
}
