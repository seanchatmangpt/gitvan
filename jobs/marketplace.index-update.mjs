/**
 * GitVan Marketplace Index Update Job
 *
 * This job automatically scans and updates the marketplace index by:
 * - Scanning local packs directory
 * - Scanning remote pack registries (GitHub, GitLab, etc.)
 * - Scanning custom registries
 * - Updating the marketplace index with new packs
 * - Generating metadata for search and filtering
 * - Creating unplugin integrations
 */

import { defineJob } from "../src/core/job-registry.mjs";
import { Marketplace } from "../src/pack/marketplace.mjs";
import { EnhancedPackManager } from "../src/pack/giget-integration.mjs";
import { useGit } from "../src/composables/git.mjs";
import { useNotes } from "../src/composables/notes.mjs";
import { createLogger } from "../src/utils/logger.mjs";
import { join, resolve, dirname } from "pathe";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const logger = createLogger("job:marketplace-index");

export default defineJob({
  meta: {
    name: "marketplace:index-update",
    description: "Update marketplace index by scanning local and remote packs",
    version: "1.0.0",
    category: "marketplace",
    tags: ["marketplace", "index", "scan", "remote-packs"],
  },
  hooks: ["post-commit", "post-merge"],
  async run(context) {
    logger.info("Starting marketplace index update...");

    try {
      const marketplace = new Marketplace();
      const packManager = new EnhancedPackManager();
      const git = useGit();
      const notes = useNotes();

      // Get current repository information
      const repoInfo = await getRepositoryInfo(git);
      logger.info(`Scanning repository: ${repoInfo.name}`);

      // Scan local packs
      logger.info("Scanning local packs...");
      const localPacks = await scanLocalPacks();
      logger.info(`Found ${localPacks.length} local packs`);

      // Scan remote packs
      logger.info("Scanning remote packs...");
      const remotePacks = await scanRemotePacks(packManager);
      logger.info(`Found ${remotePacks.length} remote packs`);

      // Scan registry packs
      logger.info("Scanning registry packs...");
      const registryPacks = await scanRegistryPacks(marketplace);
      logger.info(`Found ${registryPacks.length} registry packs`);

      // Combine all packs
      const allPacks = [...localPacks, ...remotePacks, ...registryPacks];
      logger.info(`Total packs found: ${allPacks.length}`);

      // Update marketplace index
      logger.info("Updating marketplace index...");
      const indexResult = await updateMarketplaceIndex(
        marketplace,
        allPacks,
        repoInfo
      );

      // Generate unplugin integrations
      logger.info("Generating unplugin integrations...");
      const unpluginResult = await generateUnpluginIntegrations(allPacks);

      // Create index summary
      const summary = {
        timestamp: new Date().toISOString(),
        repository: repoInfo,
        packs: {
          local: localPacks.length,
          remote: remotePacks.length,
          registry: registryPacks.length,
          total: allPacks.length,
        },
        index: indexResult,
        unplugin: unpluginResult,
        success: true,
      };

      // Write index summary to notes (skip in test environment)
      if (!process.env.VITEST) {
        try {
          await notes.write("marketplace-index", JSON.stringify(summary));
        } catch (error) {
          logger.warn("Could not write to Git notes:", error.message);
        }
      }

      // Write index to file
      const indexPath = join(
        process.cwd(),
        ".gitvan",
        "marketplace-index.json"
      );
      mkdirSync(dirname(indexPath), { recursive: true });
      writeFileSync(indexPath, JSON.stringify(summary, null, 2));

      logger.info("Marketplace index update completed successfully");

      return {
        success: true,
        summary,
        message: `Updated marketplace index with ${allPacks.length} packs`,
      };
    } catch (error) {
      logger.error("Marketplace index update failed:", error.message);
      throw error;
    }
  },
});

/**
 * Get repository information
 */
async function getRepositoryInfo(git) {
  try {
    const remoteUrl = await git.run(["config", "--get", "remote.origin.url"]);
    const branch = await git.run(["rev-parse", "--abbrev-ref", "HEAD"]);
    const commit = await git.run(["rev-parse", "HEAD"]);

    return {
      name: extractRepoName(remoteUrl),
      url: remoteUrl.trim(),
      branch: branch.trim(),
      commit: commit.trim(),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logger.warn("Could not get repository info:", error.message);
    return {
      name: "unknown",
      url: "unknown",
      branch: "unknown",
      commit: "unknown",
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Extract repository name from URL
 */
function extractRepoName(url) {
  try {
    const match = url.match(/\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Scan local packs directory
 */
async function scanLocalPacks() {
  const packsDir = join(process.cwd(), "packs");
  const localPacks = [];

  if (!existsSync(packsDir)) {
    return localPacks;
  }

  try {
    const { readdirSync, statSync } = await import("node:fs");
    const entries = readdirSync(packsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const packPath = join(packsDir, entry.name);
        const manifestPath = join(packPath, "pack.json");

        if (existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
            const packInfo = {
              id: manifest.id || entry.name,
              name: manifest.name || entry.name,
              version: manifest.version || "1.0.0",
              description: manifest.description || "No description",
              author: manifest.author || "Unknown",
              license: manifest.license || "MIT",
              tags: manifest.tags || [],
              capabilities: manifest.capabilities || [],
              source: "local",
              path: packPath,
              manifest,
              discoveredAt: new Date().toISOString(),
            };

            // Add unplugin metadata if available
            if (manifest.unplugin) {
              packInfo.unplugin = manifest.unplugin;
            }

            localPacks.push(packInfo);
          } catch (error) {
            logger.debug(`Skipping invalid pack: ${entry.name}`);
          }
        }
      }
    }
  } catch (error) {
    logger.warn("Error scanning local packs:", error.message);
  }

  return localPacks;
}

/**
 * Scan remote packs
 */
async function scanRemotePacks(packManager) {
  try {
    const remotePacks = await packManager.listRemotePacks();
    return remotePacks.map((pack) => ({
      ...pack,
      source: "remote",
      discoveredAt: new Date().toISOString(),
    }));
  } catch (error) {
    logger.warn("Error scanning remote packs:", error.message);
    return [];
  }
}

/**
 * Scan registry packs
 */
async function scanRegistryPacks(marketplace) {
  try {
    // This would integrate with actual registry APIs
    // For now, return empty array as registry scanning is complex
    return [];
  } catch (error) {
    logger.warn("Error scanning registry packs:", error.message);
    return [];
  }
}

/**
 * Update marketplace index
 */
async function updateMarketplaceIndex(marketplace, packs, repoInfo) {
  try {
    // Create index structure
    const index = {
      version: "2.0.0",
      generatedAt: new Date().toISOString(),
      repository: repoInfo,
      packs: packs.map((pack) => ({
        id: pack.id,
        name: pack.name,
        version: pack.version,
        description: pack.description,
        author: pack.author,
        license: pack.license,
        tags: pack.tags,
        capabilities: pack.capabilities,
        source: pack.source,
        path: pack.path,
        unplugin: pack.unplugin || null,
        discoveredAt: pack.discoveredAt,
      })),
      categories: extractCategories(packs),
      tags: extractTags(packs),
      capabilities: extractCapabilities(packs),
      sources: extractSources(packs),
    };

    // Write index to marketplace
    const indexPath = join(
      process.cwd(),
      ".gitvan",
      "marketplace",
      "index.json"
    );
    mkdirSync(dirname(indexPath), { recursive: true });
    writeFileSync(indexPath, JSON.stringify(index, null, 2));

    return {
      packsIndexed: packs.length,
      categories: index.categories.length,
      tags: index.tags.length,
      capabilities: index.capabilities.length,
      sources: index.sources.length,
    };
  } catch (error) {
    logger.error("Error updating marketplace index:", error.message);
    throw error;
  }
}

/**
 * Generate unplugin integrations
 */
async function generateUnpluginIntegrations(packs) {
  const unpluginPacks = packs.filter((pack) => pack.unplugin);
  const integrations = [];

  for (const pack of unpluginPacks) {
    try {
      const integration = {
        packId: pack.id,
        packName: pack.name,
        unplugin: pack.unplugin,
        generatedAt: new Date().toISOString(),
        frameworks: pack.unplugin.frameworks || ["vite", "webpack", "rollup"],
      };

      integrations.push(integration);
    } catch (error) {
      logger.warn(
        `Error generating unplugin integration for ${pack.id}:`,
        error.message
      );
    }
  }

  // Write unplugin integrations
  const integrationsPath = join(
    process.cwd(),
    ".gitvan",
    "marketplace",
    "unplugin-integrations.json"
  );
  mkdirSync(dirname(integrationsPath), { recursive: true });
  writeFileSync(integrationsPath, JSON.stringify(integrations, null, 2));

  return {
    integrationsGenerated: integrations.length,
    frameworks: [...new Set(integrations.flatMap((i) => i.frameworks))],
  };
}

/**
 * Extract unique categories from packs
 */
function extractCategories(packs) {
  const categories = new Set();
  packs.forEach((pack) => {
    if (pack.manifest?.categories) {
      pack.manifest.categories.forEach((cat) => categories.add(cat));
    }
  });
  return Array.from(categories).sort();
}

/**
 * Extract unique tags from packs
 */
function extractTags(packs) {
  const tags = new Set();
  packs.forEach((pack) => {
    pack.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

/**
 * Extract unique capabilities from packs
 */
function extractCapabilities(packs) {
  const capabilities = new Set();
  packs.forEach((pack) => {
    pack.capabilities.forEach((cap) => capabilities.add(cap));
  });
  return Array.from(capabilities).sort();
}

/**
 * Extract unique sources from packs
 */
function extractSources(packs) {
  const sources = new Set();
  packs.forEach((pack) => {
    sources.add(pack.source);
  });
  return Array.from(sources).sort();
}
