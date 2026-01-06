/**
 * GitVan Marketplace - Result Formatting and Scoring
 * Handles formatting, sorting, and relevance scoring
 */

/**
 * Format marketplace results with pagination and metadata
 * @param {Array} results - Array of pack results
 * @param {Object} options - Formatting options (limit, page, sort, query)
 * @returns {Object} Formatted results with pagination
 */
export function formatResults(results, options) {
  const limit = Math.min(options.limit || 20, 100);
  const page = Math.max(options.page || 1, 1);
  const start = (page - 1) * limit;
  const end = start + limit;

  // Ensure results is an array
  const resultsArray = Array.isArray(results) ? results : [];

  // Apply sorting
  const sorted = sortResults(
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
    .map((pack) => formatPackInfo(pack, false));

  // Add metadata
  formatted.hasNext = page < formatted.pages;
  formatted.hasPrev = page > 1;
  formatted.nextPage = formatted.hasNext ? page + 1 : null;
  formatted.prevPage = formatted.hasPrev ? page - 1 : null;

  return formatted;
}

/**
 * Sort results based on sort criteria
 * @param {Array} results - Array of packs to sort
 * @param {string} sortBy - Sort criteria (relevance, downloads, rating, name, updated)
 * @param {string} query - Search query for relevance scoring
 * @returns {Array} Sorted results
 */
export function sortResults(results, sortBy, query) {
  return results.sort((a, b) => {
    switch (sortBy) {
      case "relevance":
        return (
          calculateRelevanceScore(b, query) -
          calculateRelevanceScore(a, query)
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

/**
 * Calculate relevance score for a pack based on query
 * @param {Object} pack - Pack object
 * @param {string} query - Search query
 * @returns {number} Relevance score
 */
export function calculateRelevanceScore(pack, query) {
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

/**
 * Format pack information for display
 * @param {Object} pack - Pack object
 * @param {boolean} detailed - Include detailed information
 * @returns {Object} Formatted pack info
 */
export function formatPackInfo(pack, detailed = false) {
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
