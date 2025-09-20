// GitVan v3.0.0 - Pack Registry Search
// Search functionality for pack registry

import Fuse from "fuse.js";

export class PackRegistrySearch {
  constructor(registry) {
    this.registry = registry;
    this.fuse = null;
  }

  async initializeSearch() {
    if (!this.registry.index) {
      await this.registry.refreshIndex();
    }

    // Initialize Fuse.js for fuzzy search
    this.fuse = new Fuse(this.registry.index.packs, {
      keys: [
        { name: "name", weight: 0.7 },
        { name: "description", weight: 0.3 },
        { name: "tags", weight: 0.2 },
        { name: "capabilities", weight: 0.1 },
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
    });
  }

  async searchPacks(query, options = {}) {
    if (!this.fuse) {
      await this.initializeSearch();
    }

    const results = this.fuse.search(query);
    const filteredResults = this.applyFilters(results, options);

    return {
      query,
      results: filteredResults,
      total: filteredResults.length,
      filters: options,
    };
  }

  applyFilters(results, options) {
    let filtered = results;

    if (options.capability) {
      filtered = filtered.filter((result) =>
        result.item.capabilities?.includes(options.capability)
      );
    }

    if (options.tag) {
      filtered = filtered.filter((result) =>
        result.item.tags?.includes(options.tag)
      );
    }

    if (options.author) {
      filtered = filtered.filter((result) =>
        result.item.author?.includes(options.author)
      );
    }

    return filtered;
  }

  async getSearchSuggestions(partialQuery, limit = 10) {
    if (!this.fuse || !partialQuery || partialQuery.length < 2) {
      return [];
    }

    const results = this.fuse.search(partialQuery);
    const suggestions = new Set();

    for (const result of results.slice(0, limit * 2)) {
      const pack = result.item;

      // Add pack name
      if (pack.name.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.add(pack.name);
      }

      // Add relevant tags
      for (const tag of pack.tags || []) {
        if (tag.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.add(tag);
        }
      }

      // Add relevant capabilities
      for (const capability of pack.capabilities || []) {
        if (capability.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.add(capability);
        }
      }

      if (suggestions.size >= limit) break;
    }

    return Array.from(suggestions).slice(0, limit);
  }

  parseAdvancedQuery(queryString) {
    const filters = {};
    let cleanQuery = queryString;

    // Parse filters like "tag:react", "author:gitvan", "capability:scaffold"
    const filterRegex = /(\w+):(\S+)/g;
    let match;

    while ((match = filterRegex.exec(queryString)) !== null) {
      const [fullMatch, filterType, filterValue] = match;

      switch (filterType.toLowerCase()) {
        case "tag":
          filters.tag = filterValue;
          break;
        case "author":
          filters.author = filterValue;
          break;
        case "capability":
          filters.capability = filterValue;
          break;
        case "source":
          filters.source = filterValue;
          break;
        case "license":
          filters.license = filterValue;
          break;
      }

      cleanQuery = cleanQuery.replace(fullMatch, "").trim();
    }

    return {
      query: cleanQuery || null,
      filters,
    };
  }
}