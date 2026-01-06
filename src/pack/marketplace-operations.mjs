/**
 * GitVan Marketplace - Core Operations
 * Handles browse, inspect, quickstart, categories, featured, and stats
 */

import { z } from "zod";
import { detectPacks, getQuickstartCategories } from "./marketplace-detection.mjs";
import { formatPackInfo } from "./marketplace-formatting.mjs";

// Input validation schemas
const BrowseOptionsSchema = z.object({
  query: z.string().optional(),
  filters: z
    .object({
      capability: z.string().optional(),
      tag: z.string().optional(),
      category: z.string().optional(),
      author: z.string().optional(),
      license: z.string().optional(),
      framework: z.string().optional(),
      unplugin: z.boolean().optional(),
    })
    .optional(),
  sort: z
    .enum(["relevance", "downloads", "rating", "name", "updated"])
    .optional(),
  limit: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

/**
 * Browse packs with filtering, sorting, and pagination
 * @param {Object} options - Browse options
 * @param {Object} cache - Cache instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Browse results
 */
export async function browse(options = {}, cache, logger) {
  // Validate input options
  try {
    BrowseOptionsSchema.parse(options);
  } catch (error) {
    throw new Error(`Invalid browse options: ${error.message}`);
  }

  const cacheKey = cache.generateKey("browse", options);
  const cached = cache.get(cacheKey);

  if (cached) {
    logger?.debug("Using cached browse results");
    return cached;
  }

  // Use fast auto-detection instead of heavy registry operations
  const packs = detectPacks();

  // Apply filters
  let filteredPacks = packs;
  if (options.filters) {
    filteredPacks = packs.filter((pack) => {
      if (
        options.filters.capability &&
        !pack.capabilities.includes(options.filters.capability)
      ) {
        return false;
      }
      if (options.filters.tag && !pack.tags.includes(options.filters.tag)) {
        return false;
      }
      if (
        options.filters.category &&
        !pack.manifest.categories?.includes(options.filters.category)
      ) {
        return false;
      }
      if (options.filters.author && pack.author !== options.filters.author) {
        return false;
      }
      if (
        options.filters.license &&
        pack.license !== options.filters.license
      ) {
        return false;
      }
      // Unplugin-specific filters
      if (options.filters.unplugin === true && !pack.unplugin) {
        return false;
      }
      if (options.filters.unplugin === false && pack.unplugin) {
        return false;
      }
      if (options.filters.framework && pack.unplugin) {
        const supportedFrameworks = pack.unplugin.frameworks || ['vite', 'webpack', 'rollup'];
        if (!supportedFrameworks.includes(options.filters.framework)) {
          return false;
        }
      }
      return true;
    });
  }

  // Apply search query
  if (options.query) {
    const query = options.query.toLowerCase();
    filteredPacks = filteredPacks.filter(
      (pack) =>
        pack.name.toLowerCase().includes(query) ||
        pack.description.toLowerCase().includes(query) ||
        pack.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  // Apply sorting
  if (options.sort) {
    filteredPacks.sort((a, b) => {
      switch (options.sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "updated":
          return (b.lastModified || 0) - (a.lastModified || 0);
        default:
          return 0;
      }
    });
  }

  // Apply pagination
  const limit = options.limit || 20;
  const page = options.page || 1;
  const offset = (page - 1) * limit;
  const paginatedPacks = filteredPacks.slice(offset, offset + limit);

  // Format results
  const formatted = {
    packs: paginatedPacks.map((pack) => ({
      id: pack.id,
      name: pack.name,
      description: pack.description,
      version: pack.version,
      tags: pack.tags,
      capabilities: pack.capabilities,
      author: pack.author,
      license: pack.license,
      categories: pack.manifest.categories || [],
      unplugin: pack.unplugin,
    })),
    pagination: {
      page: page,
      limit: limit,
      total: filteredPacks.length,
      pages: Math.ceil(filteredPacks.length / limit),
    },
    facets: {
      categories: [
        ...new Set(packs.flatMap((p) => p.manifest.categories || [])),
      ],
      tags: [...new Set(packs.flatMap((p) => p.tags))],
      capabilities: [...new Set(packs.flatMap((p) => p.capabilities))],
      authors: [...new Set(packs.map((p) => p.author).filter(Boolean))],
      licenses: [...new Set(packs.map((p) => p.license).filter(Boolean))],
      frameworks: [...new Set(packs.filter(p => p.unplugin).flatMap(p => p.unplugin.frameworks || []))],
    },
  };

  // Cache results
  cache.set(cacheKey, formatted);

  return formatted;
}

/**
 * Inspect a specific pack
 * @param {string} packId - Pack ID to inspect
 * @param {Function} getRegistry - Function to get registry instance
 * @param {Object} cache - Cache instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Pack information
 */
export async function inspect(packId, getRegistry, cache, logger) {
  if (!packId || typeof packId !== "string") {
    throw new Error("Invalid pack ID");
  }

  const cacheKey = cache.generateKey("inspect", { packId });
  const cached = cache.get(cacheKey);

  if (cached) {
    logger?.debug(`Using cached inspection for: ${packId}`);
    return cached;
  }

  const packInfo = await getRegistry().get(packId);
  if (!packInfo) {
    throw new Error(`Pack not found: ${packId}`);
  }

  const formatted = formatPackInfo(packInfo, true);

  // Cache result
  cache.set(cacheKey, formatted);

  return formatted;
}

/**
 * Get quickstart packs for a category
 * @param {string} category - Category name
 * @param {Object} cache - Cache instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Quickstart results
 */
export async function quickstart(category, cache, logger) {
  if (!category || typeof category !== "string") {
    throw new Error("Category is required");
  }

  const QuickstartCategories = getQuickstartCategories();
  const categoryInfo = QuickstartCategories[category];
  if (!categoryInfo) {
    const available = Object.keys(QuickstartCategories).join(", ");
    throw new Error(`Unknown category: ${category}. Available: ${available}`);
  }

  const cacheKey = cache.generateKey("quickstart", { category });
  const cached = cache.get(cacheKey);

  if (cached) {
    logger?.debug(`Using cached quickstart for: ${category}`);
    return cached;
  }

  // Fetch pack information for category
  const results = {
    category,
    name: categoryInfo.name,
    description: categoryInfo.description,
    packs: [],
    total: 0,
  };

  // Return simple pack information without loading full pack details
  for (const packId of categoryInfo.packs) {
    results.packs.push({
      id: packId,
      name: packId
        .replace("builtin/", "")
        .replace("-", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      description: `Built-in ${categoryInfo.name.toLowerCase()} pack`,
      version: "1.0.0",
      downloads: 0,
      rating: 5,
      tags: [category.toLowerCase(), "builtin"],
      author: "GitVan",
      license: "MIT",
    });
  }

  results.total = results.packs.length;

  // Sort by popularity
  results.packs.sort((a, b) => {
    const aScore = (a.downloads || 0) + (a.rating || 0) * 100;
    const bScore = (b.downloads || 0) + (b.rating || 0) * 100;
    return bScore - aScore;
  });

  // Cache result
  cache.set(cacheKey, results);

  return results;
}

/**
 * Get all categories
 * @returns {Promise<Object>} Categories list
 */
export async function getCategories() {
  const QuickstartCategories = getQuickstartCategories();
  const categories = Object.entries(QuickstartCategories).map(
    ([id, info]) => ({
      id,
      name: info.name,
      description: info.description,
      packCount: info.packs.length,
    })
  );

  return {
    categories,
    total: categories.length,
  };
}

/**
 * Get featured packs
 * @param {Function} getRegistry - Function to get registry instance
 * @param {Object} cache - Cache instance
 * @returns {Promise<Object>} Featured packs
 */
export async function getFeatured(getRegistry, cache) {
  const cacheKey = cache.generateKey("featured", {});
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  // Get top packs by downloads and rating
  const allPacks = await getRegistry().search("", {});

  const featured = allPacks
    .filter((pack) => {
      // Feature packs with good rating and decent download count
      return (pack.rating || 0) >= 4.0 && (pack.downloads || 0) >= 100;
    })
    .sort((a, b) => {
      // Sort by composite score
      const aScore = (a.downloads || 0) * 0.1 + (a.rating || 0) * 100;
      const bScore = (b.downloads || 0) * 0.1 + (b.rating || 0) * 100;
      return bScore - aScore;
    })
    .slice(0, 12)
    .map((pack) => formatPackInfo(pack, false));

  const result = {
    featured,
    total: featured.length,
  };

  // Cache for shorter time since featured should be more dynamic
  cache.set(cacheKey, result, cache.defaultTimeout / 2);

  return result;
}

/**
 * Get marketplace statistics
 * @param {Function} getRegistry - Function to get registry instance
 * @param {Object} cache - Cache instance
 * @returns {Promise<Object>} Marketplace stats
 */
export async function getStats(getRegistry, cache) {
  const cacheKey = cache.generateKey("stats", {});
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const registry = getRegistry();
  await registry.refreshIndex();
  const index = registry.index;

  if (!index?.packs) {
    return { totalPacks: 0, totalDownloads: 0, averageRating: 0 };
  }

  const packs = Object.values(index.packs);
  const totalPacks = packs.length;
  const totalDownloads = packs.reduce(
    (sum, pack) => sum + (pack.downloads || 0),
    0
  );
  const totalRatings = packs.filter((pack) => pack.rating > 0);
  const averageRating =
    totalRatings.length > 0
      ? totalRatings.reduce((sum, pack) => sum + pack.rating, 0) /
        totalRatings.length
      : 0;

  // Get category breakdown
  const categories = {};
  for (const pack of packs) {
    const category = pack.category || "uncategorized";
    categories[category] = (categories[category] || 0) + 1;
  }

  // Get top tags
  const tagCounts = {};
  for (const pack of packs) {
    for (const tag of pack.tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const stats = {
    totalPacks,
    totalDownloads,
    averageRating: Math.round(averageRating * 100) / 100,
    categories,
    topTags,
    lastUpdated: index.lastUpdated || Date.now(),
  };

  // Cache stats for longer since they change less frequently
  cache.set(cacheKey, stats, cache.defaultTimeout * 2);

  return stats;
}
