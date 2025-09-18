/**
 * GitVan v2 Registry Utilities
 * Package registry interaction for version checking and updates
 */

import { getLatestVersion, isValidVersion } from './version.mjs';

/**
 * Mock registry data for testing - in production this would fetch from actual registries
 */
const MOCK_REGISTRY = {
  '@gitvan/templates-web': {
    versions: ['1.0.0', '1.1.0', '1.2.0', '2.0.0-beta.1', '2.0.0'],
    latest: '2.0.0',
    info: {
      description: 'Web development templates for GitVan',
      author: 'GitVan Team'
    }
  },
  '@gitvan/templates-api': {
    versions: ['0.9.0', '1.0.0', '1.0.1', '1.1.0', '1.2.0'],
    latest: '1.2.0',
    info: {
      description: 'API development templates for GitVan',
      author: 'GitVan Team'
    }
  },
  '@gitvan/utils-common': {
    versions: ['0.5.0', '0.6.0', '1.0.0', '1.0.1'],
    latest: '1.0.1',
    info: {
      description: 'Common utilities for GitVan packs',
      author: 'GitVan Team'
    }
  }
};

/**
 * Registry client for fetching pack information
 */
export class RegistryClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://registry.gitvan.dev';
    this.timeout = options.timeout || 5000;
    this.useCache = options.useCache !== false;
    this.cache = new Map();
    this.useMockData = options.useMockData !== false; // Enable by default for now
  }

  /**
   * Fetch package information from registry
   * @param {string} packageId - Package identifier
   * @returns {Promise<object|null>} Package information or null if not found
   */
  async fetchPackageInfo(packageId) {
    try {
      // Check cache first
      if (this.useCache && this.cache.has(packageId)) {
        const cached = this.cache.get(packageId);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minute cache
          return cached.data;
        }
      }

      let packageInfo;

      if (this.useMockData) {
        // Use mock data for testing
        packageInfo = this.getMockPackageInfo(packageId);
      } else {
        // Fetch from actual registry
        packageInfo = await this.fetchFromRegistry(packageId);
      }

      // Cache the result
      if (this.useCache && packageInfo) {
        this.cache.set(packageId, {
          data: packageInfo,
          timestamp: Date.now()
        });
      }

      return packageInfo;
    } catch (error) {
      console.warn(`Failed to fetch package info for ${packageId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get mock package information for testing
   * @param {string} packageId - Package identifier
   * @returns {object|null} Mock package info
   */
  getMockPackageInfo(packageId) {
    const mockData = MOCK_REGISTRY[packageId];
    if (!mockData) {
      return null;
    }

    return {
      id: packageId,
      versions: mockData.versions,
      latest: mockData.latest,
      description: mockData.info.description,
      author: mockData.info.author,
      publishedAt: new Date().toISOString(),
      tags: {
        latest: mockData.latest,
        beta: mockData.versions.find(v => v.includes('beta')) || null
      }
    };
  }

  /**
   * Fetch package information from actual registry
   * @param {string} packageId - Package identifier
   * @returns {Promise<object|null>} Package information
   */
  async fetchFromRegistry(packageId) {
    try {
      const url = `${this.baseUrl}/packages/${encodeURIComponent(packageId)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GitVan/2.1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Package not found
        }
        throw new Error(`Registry returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: packageId,
        versions: data.versions || [],
        latest: data.latest || getLatestVersion(data.versions || []),
        description: data.description || '',
        author: data.author || '',
        publishedAt: data.publishedAt || new Date().toISOString(),
        tags: data.tags || {}
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Registry request timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Get the latest version of a package
   * @param {string} packageId - Package identifier
   * @returns {Promise<string|null>} Latest version or null if not found
   */
  async getLatestVersion(packageId) {
    const info = await this.fetchPackageInfo(packageId);
    return info?.latest || null;
  }

  /**
   * Get all available versions of a package
   * @param {string} packageId - Package identifier
   * @returns {Promise<string[]>} Array of available versions
   */
  async getAvailableVersions(packageId) {
    const info = await this.fetchPackageInfo(packageId);
    return info?.versions || [];
  }

  /**
   * Check if a package exists in the registry
   * @param {string} packageId - Package identifier
   * @returns {Promise<boolean>} Whether the package exists
   */
  async packageExists(packageId) {
    const info = await this.fetchPackageInfo(packageId);
    return info !== null;
  }

  /**
   * Search for packages in the registry
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<object[]>} Array of matching packages
   */
  async searchPackages(query, options = {}) {
    try {
      if (this.useMockData) {
        // Mock search for testing
        const results = Object.entries(MOCK_REGISTRY)
          .filter(([id, data]) =>
            id.toLowerCase().includes(query.toLowerCase()) ||
            data.info.description.toLowerCase().includes(query.toLowerCase())
          )
          .map(([id, data]) => ({
            id,
            latest: data.latest,
            description: data.info.description,
            author: data.info.author
          }));

        return results.slice(0, options.limit || 10);
      }

      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.set('q', query);
      if (options.limit) url.searchParams.set('limit', options.limit);
      if (options.offset) url.searchParams.set('offset', options.offset);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GitVan/2.1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.warn(`Package search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Clear the registry cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Add mock package data for testing
   * @param {string} packageId - Package identifier
   * @param {object} packageData - Package data
   */
  addMockPackage(packageId, packageData) {
    MOCK_REGISTRY[packageId] = packageData;
  }
}