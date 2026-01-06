/**
 * GitVan Marketplace - Pack Detection and Categorization
 * Handles filesystem scanning and automatic pack discovery
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "pathe";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Auto-detect packs from filesystem
 * Scans common locations for pack manifests
 * @returns {Array} Array of detected packs
 */
export function detectPacks() {
  const packs = new Map();

  // Look for packs in common locations
  const packDirs = [
    join(process.cwd(), "packs"),
    join(process.cwd(), "packs", "builtin"),
    join(process.cwd(), "node_modules", "@gitvan", "packs"),
    // Also look in GitVan's builtin packs
    join(__dirname, "..", "..", "packs", "builtin"),
  ];

  for (const packDir of packDirs) {
    if (existsSync(packDir)) {
      try {
        const entries = readdirSync(packDir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const packPath = join(packDir, entry.name);
            const manifestPath = join(packPath, "pack.json");

            if (existsSync(manifestPath)) {
              try {
                const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
                const packId = manifest.id || `builtin/${entry.name}`;

                packs.set(packId, {
                  id: packId,
                  name: manifest.name || entry.name,
                  description:
                    manifest.description || "No description available",
                  tags: manifest.tags || [],
                  capabilities: manifest.capabilities || [],
                  version: manifest.version || "1.0.0",
                  author: manifest.author || "Unknown",
                  license: manifest.license || "MIT",
                  path: packPath,
                  manifest,
                  unplugin: manifest.unplugin || null,
                });
              } catch (error) {
                // Skip invalid manifests
                continue;
              }
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
        continue;
      }
    }
  }

  return Array.from(packs.values());
}

/**
 * Auto-categorize packs based on tags, categories, and capabilities
 * @param {Array} packs - Array of pack objects
 * @returns {Object} Category mapping with pack assignments
 */
export function categorizePacks(packs) {
  const categoryMap = new Map();

  for (const pack of packs) {
    const tags = pack.tags.map((tag) => tag.toLowerCase());
    const capabilities = pack.capabilities.map((cap) => cap.toLowerCase());
    const manifestCategories = pack.manifest.categories || [];

    // Priority: 1) explicit categories from manifest, 2) tags, 3) capabilities, 4) default
    let assignedCategories = [];

    // Use explicit categories from manifest first
    if (manifestCategories.length > 0) {
      assignedCategories = manifestCategories;
    } else {
      // Auto-categorize based on tags and capabilities
      const tagCategories = [];

      if (
        tags.includes("documentation") ||
        tags.includes("docs") ||
        tags.includes("mdbook")
      ) {
        tagCategories.push("docs");
      }
      if (tags.includes("nextjs") || tags.includes("next")) {
        tagCategories.push("next");
      }
      if (
        tags.includes("react") ||
        capabilities.includes("components") ||
        capabilities.includes("ssr")
      ) {
        tagCategories.push("react");
      }
      if (
        tags.includes("mobile") ||
        tags.includes("react-native") ||
        tags.includes("flutter")
      ) {
        tagCategories.push("mobile");
      }
      if (tags.includes("enterprise") || tags.includes("compliance")) {
        tagCategories.push("enterprise");
      }
      if (
        tags.includes("api") ||
        tags.includes("server") ||
        capabilities.includes("backend")
      ) {
        tagCategories.push("api");
      }
      if (
        tags.includes("database") ||
        tags.includes("db") ||
        tags.includes("sql")
      ) {
        tagCategories.push("database");
      }
      if (
        tags.includes("dev") ||
        tags.includes("development") ||
        tags.includes("tool")
      ) {
        tagCategories.push("dev");
      }

      // If no specific categories found, use tags as categories
      if (tagCategories.length === 0) {
        assignedCategories = tags.slice(0, 3); // Use first 3 tags as categories
      } else {
        assignedCategories = tagCategories;
      }
    }

    // Add pack to each assigned category
    for (const categoryId of assignedCategories) {
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
          description: `Packs related to ${categoryId}`,
          packs: [],
        });
      }
      categoryMap.get(categoryId).packs.push(pack.id);
    }
  }

  // Convert to object and enhance category names
  const categories = Object.fromEntries(categoryMap);

  // Enhance category names and descriptions
  const categoryEnhancements = {
    docs: {
      name: "Documentation",
      description: "Documentation and content generation packs",
    },
    next: {
      name: "Next.js",
      description: "Next.js application templates and configurations",
    },
    react: { name: "React", description: "React applications and components" },
    dev: {
      name: "Development",
      description: "Development tools and utilities",
    },
    enterprise: {
      name: "Enterprise",
      description: "Enterprise-grade templates and workflows",
    },
    mobile: { name: "Mobile", description: "Mobile application development" },
    api: {
      name: "API & Server",
      description: "API servers and backend services",
    },
    database: {
      name: "Database",
      description: "Database setup and management",
    },
    scaffold: {
      name: "Scaffolding",
      description: "Project scaffolding and templates",
    },
    automation: {
      name: "Automation",
      description: "Workflow automation and CI/CD",
    },
    testing: {
      name: "Testing",
      description: "Testing frameworks and utilities",
    },
    deployment: {
      name: "Deployment",
      description: "Deployment and DevOps tools",
    },
  };

  for (const [categoryId, category] of Object.entries(categories)) {
    if (categoryEnhancements[categoryId]) {
      category.name = categoryEnhancements[categoryId].name;
      category.description = categoryEnhancements[categoryId].description;
    }
  }

  return categories;
}

/**
 * Get dynamic quickstart categories
 * Combines detection and categorization
 * @returns {Object} Quickstart categories with pack assignments
 */
export function getQuickstartCategories() {
  const packs = detectPacks();
  return categorizePacks(packs);
}
