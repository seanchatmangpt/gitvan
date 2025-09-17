/**
 * GitVan v2 Marketplace - Pack discovery and browsing with caching
 * Implements REST conventions, pagination, filtering, and user experience features
 */

import { PackRegistry } from "./registry.mjs";
import { createLogger } from "../utils/logger.mjs";
import { z } from "zod";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "pathe";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    })
    .optional(),
  sort: z
    .enum(["relevance", "downloads", "rating", "name", "updated"])
    .optional(),
  limit: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

// Auto-detect packs from filesystem
function detectPacks() {
  const packs = new Map();
  
  // Look for packs in common locations
  const packDirs = [
    join(process.cwd(), 'packs'),
    join(process.cwd(), 'packs', 'builtin'),
    join(process.cwd(), 'node_modules', '@gitvan', 'packs'),
    // Also look in GitVan's builtin packs
    join(__dirname, '..', '..', 'packs', 'builtin'),
  ];
  
  for (const packDir of packDirs) {
    if (existsSync(packDir)) {
      try {
        const entries = readdirSync(packDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const packPath = join(packDir, entry.name);
            const manifestPath = join(packPath, 'pack.json');
            
            if (existsSync(manifestPath)) {
              try {
                const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
                const packId = manifest.id || `builtin/${entry.name}`;
                
                packs.set(packId, {
                  id: packId,
                  name: manifest.name || entry.name,
                  description: manifest.description || 'No description available',
                  tags: manifest.tags || [],
                  capabilities: manifest.capabilities || [],
                  version: manifest.version || '1.0.0',
                  author: manifest.author || 'Unknown',
                  license: manifest.license || 'MIT',
                  path: packPath,
                  manifest
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

// Auto-categorize packs based on tags, categories, and capabilities
function categorizePacks(packs) {
  const categoryMap = new Map();
  
  for (const pack of packs) {
    const tags = pack.tags.map(tag => tag.toLowerCase());
    const capabilities = pack.capabilities.map(cap => cap.toLowerCase());
    const manifestCategories = pack.manifest.categories || [];
    
    // Priority: 1) explicit categories from manifest, 2) tags, 3) capabilities, 4) default
    let assignedCategories = [];
    
    // Use explicit categories from manifest first
    if (manifestCategories.length > 0) {
      assignedCategories = manifestCategories;
    } else {
      // Auto-categorize based on tags and capabilities
      const tagCategories = [];
      
      if (tags.includes('documentation') || tags.includes('docs') || tags.includes('mdbook')) {
        tagCategories.push('docs');
      }
      if (tags.includes('nextjs') || tags.includes('next')) {
        tagCategories.push('next');
      }
      if (tags.includes('react') || capabilities.includes('components') || capabilities.includes('ssr')) {
        tagCategories.push('react');
      }
      if (tags.includes('mobile') || tags.includes('react-native') || tags.includes('flutter')) {
        tagCategories.push('mobile');
      }
      if (tags.includes('enterprise') || tags.includes('compliance')) {
        tagCategories.push('enterprise');
      }
      if (tags.includes('api') || tags.includes('server') || capabilities.includes('backend')) {
        tagCategories.push('api');
      }
      if (tags.includes('database') || tags.includes('db') || tags.includes('sql')) {
        tagCategories.push('database');
      }
      if (tags.includes('dev') || tags.includes('development') || tags.includes('tool')) {
        tagCategories.push('dev');
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
    docs: { name: "Documentation", description: "Documentation and content generation packs" },
    next: { name: "Next.js", description: "Next.js application templates and configurations" },
    react: { name: "React", description: "React applications and components" },
    dev: { name: "Development", description: "Development tools and utilities" },
    enterprise: { name: "Enterprise", description: "Enterprise-grade templates and workflows" },
    mobile: { name: "Mobile", description: "Mobile application development" },
    api: { name: "API & Server", description: "API servers and backend services" },
    database: { name: "Database", description: "Database setup and management" },
    scaffold: { name: "Scaffolding", description: "Project scaffolding and templates" },
    automation: { name: "Automation", description: "Workflow automation and CI/CD" },
    testing: { name: "Testing", description: "Testing frameworks and utilities" },
    deployment: { name: "Deployment", description: "Deployment and DevOps tools" },
  };
  
  for (const [categoryId, category] of Object.entries(categories)) {
    if (categoryEnhancements[categoryId]) {
      category.name = categoryEnhancements[categoryId].name;
      category.description = categoryEnhancements[categoryId].description;
    }
  }
  
  return categories;
}

// Get dynamic quickstart categories
function getQuickstartCategories() {
  const packs = detectPacks();
  return categorizePacks(packs);
}

export class Marketplace {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger("pack:marketplace");
    this.registry = null; // Lazy initialization
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
  }

  getRegistry() {
    if (!this.registry) {
      this.registry = new PackRegistry(this.options);
    }
    return this.registry;
  }

  async browse(options = {}) {
    // Validate input options
    try {
      BrowseOptionsSchema.parse(options);
    } catch (error) {
      throw new Error(`Invalid browse options: ${error.message}`);
    }

    const cacheKey = this.generateCacheKey("browse", options);
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      this.logger.debug("Using cached browse results");
      return cached;
    }

    // Refresh registry index if needed
    const registry = this.getRegistry();
    await registry.refreshIndex();

    // Perform search
    const searchResults = await registry.search(
      options.query,
      options.filters || {}
    );

    // Format and paginate results
    const formatted = this.formatResults(searchResults, options);

    // Cache results
    this.setCache(cacheKey, formatted);

    return formatted;
  }

  async inspect(packId) {
    if (!packId || typeof packId !== "string") {
      throw new Error("Invalid pack ID");
    }

    const cacheKey = this.generateCacheKey("inspect", { packId });
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      this.logger.debug(`Using cached inspection for: ${packId}`);
      return cached;
    }

    const packInfo = await this.getRegistry().get(packId);
    if (!packInfo) {
      throw new Error(`Pack not found: ${packId}`);
    }

    const formatted = this.formatPackInfo(packInfo, true);

    // Cache result
    this.setCache(cacheKey, formatted);

    return formatted;
  }

  formatResults(results, options) {
    const limit = Math.min(options.limit || 20, 100);
    const page = Math.max(options.page || 1, 1);
    const start = (page - 1) * limit;
    const end = start + limit;

    // Ensure results is an array
    const resultsArray = Array.isArray(results) ? results : [];

    // Apply sorting
    const sorted = this.sortResults(
      resultsArray,
      options.sort || "relevance",
      options.query
    );

    const formatted = {
      total: sorted.length,
      page,
      pages: Math.ceil(sorted.length / limit),
      limit,
      query: options.query,
      filters: options.filters || {},
      sort: options.sort || "relevance",
      packs: [],
    };

    // Paginate and format pack info
    formatted.packs = sorted
      .slice(start, end)
      .map((pack) => this.formatPackInfo(pack, false));

    // Add metadata
    formatted.hasNext = page < formatted.pages;
    formatted.hasPrev = page > 1;
    formatted.nextPage = formatted.hasNext ? page + 1 : null;
    formatted.prevPage = formatted.hasPrev ? page - 1 : null;

    return formatted;
  }

  sortResults(results, sortBy, query) {
    return results.sort((a, b) => {
      switch (sortBy) {
        case "relevance":
          return (
            this.calculateRelevanceScore(b, query) -
            this.calculateRelevanceScore(a, query)
          );

        case "downloads":
          return (b.downloads || 0) - (a.downloads || 0);

        case "rating":
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (ratingDiff !== 0) return ratingDiff;
          return (b.reviews || 0) - (a.reviews || 0); // Secondary sort by review count

        case "name":
          return (a.name || a.id).localeCompare(b.name || b.id);

        case "updated":
          const aTime = new Date(a.lastModified || 0).getTime();
          const bTime = new Date(b.lastModified || 0).getTime();
          return bTime - aTime;

        default:
          return 0;
      }
    });
  }

  calculateRelevanceScore(pack, query) {
    if (!query) {
      // Default relevance without query: downloads + rating
      return (pack.downloads || 0) * 0.7 + (pack.rating || 0) * 30;
    }

    const q = query.toLowerCase();
    let score = 0;

    // Exact ID match gets highest score
    if (pack.id.toLowerCase() === q) score += 1000;

    // Exact name match
    if ((pack.name || "").toLowerCase() === q) score += 500;

    // Name starts with query
    if ((pack.name || "").toLowerCase().startsWith(q)) score += 200;

    // Name contains query
    if ((pack.name || "").toLowerCase().includes(q)) score += 100;

    // Description contains query
    if ((pack.description || "").toLowerCase().includes(q)) score += 50;

    // Tags contain query
    const tags = pack.tags || [];
    for (const tag of tags) {
      if (tag.toLowerCase().includes(q)) {
        score += tag.toLowerCase() === q ? 150 : 25;
      }
    }

    // Capabilities contain query
    const capabilities = pack.capabilities || [];
    for (const cap of capabilities) {
      if (cap.toLowerCase().includes(q)) {
        score += cap.toLowerCase() === q ? 100 : 20;
      }
    }

    // Boost by popularity
    score += Math.log10((pack.downloads || 0) + 1) * 10;
    score += (pack.rating || 0) * 5;

    return score;
  }

  formatPackInfo(pack, detailed = false) {
    const base = {
      id: pack.id,
      name: pack.name,
      version: pack.version,
      description: pack.description,
      tags: pack.tags || [],
      capabilities: pack.capabilities || [],
      author: pack.author,
      license: pack.license,
      downloads: pack.downloads || 0,
      rating: pack.rating || 0,
      reviews: pack.reviews || 0,
    };

    if (!detailed) {
      return base;
    }

    // Add detailed information
    return {
      ...base,
      repository: pack.repository,
      homepage: pack.homepage,
      documentation: pack.documentation,
      keywords: pack.keywords || [],
      engines: pack.engines,
      requires: pack.requires || {},
      modes: pack.modes || [],
      inputs: pack.inputs || [],
      provides: {
        templates: pack.provides?.templates?.length || 0,
        files: pack.provides?.files?.length || 0,
        jobs: pack.provides?.jobs?.length || 0,
        events: pack.provides?.events?.length || 0,
        scaffolds: pack.provides?.scaffolds?.length || 0,
        commands: pack.provides?.commands?.length || 0,
      },
      size: pack.size,
      lastModified: pack.lastModified,
      created: pack.created,
      dependencies: pack.dependencies || {},
      devDependencies: pack.devDependencies || {},
      peerDependencies: pack.peerDependencies || {},
      changelog: pack.changelog,
      security: {
        verified: pack.security?.verified || false,
        signed: pack.security?.signed || false,
        scanned: pack.security?.scanned || false,
      },
    };
  }

  async quickstart(category) {
    if (!category || typeof category !== "string") {
      throw new Error("Category is required");
    }

    const QuickstartCategories = getQuickstartCategories();
    const categoryInfo = QuickstartCategories[category];
    if (!categoryInfo) {
      const available = Object.keys(QuickstartCategories).join(", ");
      throw new Error(`Unknown category: ${category}. Available: ${available}`);
    }

    const cacheKey = this.generateCacheKey("quickstart", { category });
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      this.logger.debug(`Using cached quickstart for: ${category}`);
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
    this.setCache(cacheKey, results);

    return results;
  }

  async getCategories() {
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

  async getFeatured() {
    const cacheKey = this.generateCacheKey("featured", {});
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    // Get top packs by downloads and rating
    const allPacks = await this.getRegistry().search("", {});

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
      .map((pack) => this.formatPackInfo(pack, false));

    const result = {
      featured,
      total: featured.length,
    };

    // Cache for shorter time since featured should be more dynamic
    this.setCache(cacheKey, result, this.cacheTimeout / 2);

    return result;
  }

  async getStats() {
    const cacheKey = this.generateCacheKey("stats", {});
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    const registry = this.getRegistry();
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
    this.setCache(cacheKey, stats, this.cacheTimeout * 2);

    return stats;
  }

  generateCacheKey(operation, params) {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    return `${operation}:${normalized}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCache(key, data, timeout = this.cacheTimeout) {
    this.cache.set(key, {
      data,
      expires: Date.now() + timeout,
    });

    // Clean up expired entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}
