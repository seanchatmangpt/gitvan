/**
 * Pack Metadata Module
 * Handles pack metadata operations, validation, and sanitization
 */

import { createLogger } from "../utils/logger.mjs";
import { z } from "zod";

// Input validation schemas
const PackInfoSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-_.\/]+$/),
  name: z.string().min(1).max(200),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(500),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  source: z
    .object({
      url: z.string().url(),
      hash: z.string().length(64).optional(),
      signature: z.string().optional(),
    })
    .optional(),
});

const PackMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  bugs: z.string().url().optional(),
  keywords: z.array(z.string()).optional(),
  engines: z
    .object({
      node: z.string().optional(),
      gitvan: z.string().optional(),
    })
    .optional(),
  dependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  scripts: z.record(z.string()).optional(),
  config: z.record(z.any()).optional(),
});

export class PackMetadataManager {
  constructor(options = {}) {
    this.logger = createLogger("pack:metadata");
  }

  /**
   * Sanitize pack information
   * @param {Object} pack Raw pack data
   * @returns {Object} Sanitized pack data
   */
  sanitizePackInfo(pack) {
    return {
      id: pack.id,
      name: pack.name,
      version: pack.version,
      description: pack.description || "",
      tags: pack.tags || [],
      capabilities: pack.capabilities || [],
      category: pack.category || "general",
      author: pack.author || "unknown",
      license: pack.license || "MIT",
      homepage: pack.homepage || "",
      repository: pack.repository || "",
      bugs: pack.bugs || "",
      keywords: pack.keywords || [],
      engines: pack.engines || {},
      dependencies: pack.dependencies || {},
      peerDependencies: pack.peerDependencies || {},
      devDependencies: pack.devDependencies || {},
      scripts: pack.scripts || {},
      config: pack.config || {},
      source: pack.source || null,
      path: pack.path || null,
      hash: pack.hash || "",
      fingerprint: pack.fingerprint || "",
      lastSeen: pack.lastSeen || Date.now(),
      source: pack.source || "unknown",
    };
  }

  /**
   * Validate pack information against schema
   * @param {Object} pack Pack data to validate
   * @returns {Object} Validation result
   */
  validatePackInfo(pack) {
    try {
      const result = PackInfoSchema.safeParse(pack);
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error,
      };
    }
  }

  /**
   * Validate pack metadata against extended schema
   * @param {Object} metadata Pack metadata to validate
   * @returns {Object} Validation result
   */
  validatePackMetadata(metadata) {
    try {
      const result = PackMetadataSchema.safeParse(metadata);
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error,
      };
    }
  }

  /**
   * Extract metadata from pack.json content
   * @param {Object} packJson Raw pack.json content
   * @returns {Object} Extracted metadata
   */
  extractMetadata(packJson) {
    const metadata = {
      id: packJson.id,
      name: packJson.name,
      version: packJson.version,
      description: packJson.description || "",
      tags: packJson.tags || [],
      capabilities: packJson.capabilities || [],
      category: packJson.category || "general",
      author: packJson.author || "unknown",
      license: packJson.license || "MIT",
      homepage: packJson.homepage || "",
      repository: packJson.repository || "",
      bugs: packJson.bugs || "",
      keywords: packJson.keywords || [],
      engines: packJson.engines || {},
      dependencies: packJson.dependencies || {},
      peerDependencies: packJson.peerDependencies || {},
      devDependencies: packJson.devDependencies || {},
      scripts: packJson.scripts || {},
      config: packJson.config || {},
    };

    return this.sanitizePackInfo(metadata);
  }

  /**
   * Merge pack metadata with defaults
   * @param {Object} pack Pack data
   * @param {Object} defaults Default values
   * @returns {Object} Merged pack data
   */
  mergeWithDefaults(pack, defaults = {}) {
    const defaultMetadata = {
      tags: [],
      capabilities: [],
      category: "general",
      author: "unknown",
      license: "MIT",
      homepage: "",
      repository: "",
      bugs: "",
      keywords: [],
      engines: {},
      dependencies: {},
      peerDependencies: {},
      devDependencies: {},
      scripts: {},
      config: {},
    };

    return {
      ...defaultMetadata,
      ...defaults,
      ...pack,
    };
  }

  /**
   * Normalize pack ID
   * @param {string} packId Raw pack ID
   * @returns {string} Normalized pack ID
   */
  normalizePackId(packId) {
    if (!packId || typeof packId !== "string") {
      return "";
    }

    return packId
      .toLowerCase()
      .replace(/[^a-z0-9-_.\/]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Generate pack fingerprint
   * @param {Object} pack Pack data
   * @returns {string} Pack fingerprint
   */
  generateFingerprint(pack) {
    const keyFields = [
      pack.id,
      pack.name,
      pack.version,
      pack.description,
      JSON.stringify(pack.tags || []),
      JSON.stringify(pack.capabilities || []),
      pack.author,
      pack.license,
    ];

    const fingerprint = keyFields.join("|");
    return Buffer.from(fingerprint).toString("base64");
  }

  /**
   * Compare pack versions
   * @param {string} version1 First version
   * @param {string} version2 Second version
   * @returns {number} Comparison result (-1, 0, 1)
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.split(".").map(Number);
    const v2Parts = version2.split(".").map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }

    return 0;
  }

  /**
   * Check if pack is compatible with current environment
   * @param {Object} pack Pack data
   * @param {Object} environment Environment information
   * @returns {boolean} True if compatible
   */
  isCompatible(pack, environment = {}) {
    if (!pack.engines) {
      return true; // No engine requirements
    }

    // Check GitVan version compatibility
    if (pack.engines.gitvan) {
      const requiredVersion = pack.engines.gitvan;
      const currentVersion = environment.gitvanVersion || "2.0.0";

      // Simple version check - could be enhanced
      if (requiredVersion.startsWith("^")) {
        const minVersion = requiredVersion.slice(1);
        if (this.compareVersions(currentVersion, minVersion) < 0) {
          return false;
        }
      }
    }

    // Check Node.js version compatibility
    if (pack.engines.node) {
      const requiredVersion = pack.engines.node;
      const currentVersion = environment.nodeVersion || process.version;

      // Simple version check - could be enhanced
      if (requiredVersion.startsWith(">=")) {
        const minVersion = requiredVersion.slice(2);
        if (this.compareVersions(currentVersion, minVersion) < 0) {
          return false;
        }
      }
    }

    return true;
  }
}
