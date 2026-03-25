/**
 * @fileoverview WorkflowVersioning
 * Manages workflow versions using git notes and tags
 * Provides version comparison and rollback capabilities
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import crypto from "crypto";
import { createLogger } from "../utils/logger.mjs";
import { AuditSerializer } from "../utils/audit-serializer.mjs";

const logger = createLogger("git-lifecycle:workflow-versioning");

/**
 * Manages workflow versions using git-native storage
 * Stores versions in git notes and tags for full auditability
 */
export class WorkflowVersioning {
  constructor(options = {}) {
    this.git = options.git;
    this.baseRef = options.baseRef || "refs/notes/workflows";
    this.tagPrefix = options.tagPrefix || "workflow:";
    this.logger = options.logger || logger;
    this.auditSerializer = new AuditSerializer(options);
    this.cache = new Map();
  }

  /**
   * Creates a new workflow version
   * @param {Object} workflowGraph - The workflow graph
   * @param {string} workflowId - Workflow identifier
   * @param {string} semver - Semantic version string (e.g., "1.0.0")
   * @param {Object} metadata - Version metadata
   * @returns {Promise<Object>} Version creation result
   */
  async createVersion(workflowGraph, workflowId, semver, metadata = {}) {
    try {
      const canonical = workflowGraph.canonicalize();
      const hash = crypto
        .createHash("sha256")
        .update(canonical)
        .digest("hex");

      const versionRecord = {
        id: `${workflowId}-${semver}`,
        workflowId,
        version: semver,
        hash,
        canonical,
        created: new Date().toISOString(),
        metadata,
        ntriples: workflowGraph.toNTriples?.() || canonical,
      };

      // Store in git notes
      await this.git.notes.add({
        ref: "HEAD",
        message: JSON.stringify(versionRecord, null, 2),
        append: true,
      });

      // Create git tag for version milestone
      const tagName = `${this.tagPrefix}${workflowId}/v${semver}`;
      try {
        await this.git.tag({
          ref: "HEAD",
          tag: tagName,
          message: `Workflow ${workflowId} version ${semver}\nHash: ${hash}`,
          annotated: true,
        });
      } catch (e) {
        this.logger.warn(`Tag creation failed (may already exist): ${e.message}`);
      }

      // Cache the version
      if (this.enableCache) {
        this.cache.set(`${workflowId}:${semver}`, versionRecord);
      }

      return {
        success: true,
        workflowId,
        version: semver,
        hash,
        tag: tagName,
      };
    } catch (error) {
      this.logger.error(`Version creation failed for ${workflowId}:`, error);
      return {
        success: false,
        error: error.message,
        workflowId,
      };
    }
  }

  /**
   * Retrieves a specific workflow version
   * @param {string} workflowId - Workflow identifier
   * @param {string} semver - Semantic version or 'latest'
   * @returns {Promise<Object>} Version data
   */
  async getVersion(workflowId, semver = "latest") {
    try {
      // Check cache first
      const cacheKey = `${workflowId}:${semver}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Try git tag first
      if (semver !== "latest") {
        const tagName = `${this.tagPrefix}${workflowId}/v${semver}`;
        try {
          const tagData = await this.git.show(`${tagName}^{}`);
          return {
            found: true,
            version: semver,
            data: tagData,
          };
        } catch (e) {
          // Tag not found, continue to notes
        }
      }

      // Retrieve from git notes
      const notes = await this.git.notes.read("HEAD");
      if (!notes) {
        return {
          found: false,
          error: "No versions found",
        };
      }

      // Parse notes to find matching version
      const versions = this.parseVersionNotes(notes);
      let targetVersion = null;

      if (semver === "latest") {
        // Get the latest version
        targetVersion = versions.sort((a, b) =>
          this.compareSemver(b.version, a.version)
        )[0];
      } else {
        targetVersion = versions.find((v) => v.version === semver);
      }

      if (!targetVersion) {
        return {
          found: false,
          error: `Version ${semver} not found`,
        };
      }

      // Cache it
      this.cache.set(cacheKey, targetVersion);

      return {
        found: true,
        ...targetVersion,
      };
    } catch (error) {
      this.logger.error(
        `Version retrieval failed for ${workflowId}@${semver}:`,
        error
      );
      return {
        found: false,
        error: error.message,
      };
    }
  }

  /**
   * Lists all versions of a workflow
   * @param {string} workflowId - Workflow identifier
   * @returns {Promise<Array<Object>>} Array of versions
   */
  async listVersions(workflowId) {
    try {
      const notes = await this.git.notes.read("HEAD");
      if (!notes) {
        return [];
      }

      const versions = this.parseVersionNotes(notes);
      const workflowVersions = versions.filter((v) => v.workflowId === workflowId);

      return workflowVersions.sort((a, b) =>
        this.compareSemver(b.version, a.version)
      );
    } catch (error) {
      this.logger.error(`Version listing failed for ${workflowId}:`, error);
      return [];
    }
  }

  /**
   * Compares two versions of the same workflow
   * @param {string} workflowId - Workflow identifier
   * @param {string} versionA - First version
   * @param {string} versionB - Second version
   * @returns {Promise<Object>} Comparison result
   */
  async compareVersions(workflowId, versionA, versionB) {
    try {
      const verA = await this.getVersion(workflowId, versionA);
      const verB = await this.getVersion(workflowId, versionB);

      if (!verA.found || !verB.found) {
        return {
          success: false,
          error: `One or both versions not found`,
        };
      }

      // Compare hashes
      const hashChanged = verA.hash !== verB.hash;

      // Compare canonicals if available
      let isIsomorphic = false;
      if (verA.canonical && verB.canonical) {
        isIsomorphic = verA.canonical === verB.canonical;
      }

      // Compute diff
      const diff = this.computeVersionDiff(verA, verB);

      return {
        success: true,
        workflowId,
        versionA,
        versionB,
        hashChanged,
        isIsomorphic,
        diff,
        comparison: {
          createdA: verA.created,
          createdB: verB.created,
          hashA: verA.hash,
          hashB: verB.hash,
        },
      };
    } catch (error) {
      this.logger.error(
        `Version comparison failed for ${workflowId}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Rolls back workflow to a specific version
   * @param {string} workflowId - Workflow identifier
   * @param {string} targetVersion - Version to restore
   * @param {string} workflowPath - Path to workflow file in repo
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackToVersion(workflowId, targetVersion, workflowPath) {
    try {
      const targetVer = await this.getVersion(workflowId, targetVersion);

      if (!targetVer.found) {
        return {
          success: false,
          error: `Target version not found`,
        };
      }

      // Get the workflow content from the version
      const workflowContent = targetVer.ntriples || targetVer.canonical;

      // Create a new commit with the restored version
      await this.git.write({
        file: workflowPath,
        content: workflowContent,
      });

      await this.git.add(workflowPath);

      const rollbackMessage = `chore: Rollback ${workflowId} to version ${targetVersion}`;
      const sha = await this.git.commit(rollbackMessage);

      // Tag the rollback commit
      const rollbackTag = `${this.tagPrefix}${workflowId}/rollback-${Date.now()}`;
      await this.git.tag({
        ref: sha,
        tag: rollbackTag,
        message: rollbackMessage,
        annotated: true,
      });

      return {
        success: true,
        workflowId,
        rolledBackTo: targetVersion,
        commit: sha,
        tag: rollbackTag,
      };
    } catch (error) {
      this.logger.error(
        `Rollback failed for ${workflowId} to ${targetVersion}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Detects changes between versions
   * @param {string} workflowId - Workflow identifier
   * @param {string} fromVersion - Starting version
   * @param {string} toVersion - Ending version
   * @returns {Promise<Object>} Change detection result
   */
  async detectVersionChanges(workflowId, fromVersion, toVersion) {
    try {
      const comparison = await this.compareVersions(
        workflowId,
        fromVersion,
        toVersion
      );

      if (!comparison.success) {
        return comparison;
      }

      return {
        success: true,
        workflowId,
        fromVersion,
        toVersion,
        hasChanges: comparison.hashChanged,
        changeType: comparison.isIsomorphic
          ? "syntax-only"
          : "semantic-change",
        ...comparison,
      };
    } catch (error) {
      this.logger.error(
        `Change detection failed for ${workflowId}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parses version records from git notes
   * @param {string} notes - Raw git notes content
   * @returns {Array<Object>} Parsed version records
   */
  parseVersionNotes(notes) {
    const versions = [];

    try {
      // Try to parse as JSON array
      try {
        const parsed = JSON.parse(notes);
        if (Array.isArray(parsed)) {
          return parsed.filter((v) => v.version);
        } else if (parsed.version) {
          return [parsed];
        }
      } catch {
        // Not JSON, try splitting by version records
      }

      // Split by version ID pattern
      const records = notes
        .split(/(?=\{[\s\n]*"id")/g)
        .filter((s) => s.trim());

      for (const record of records) {
        try {
          const parsed = JSON.parse(record);
          if (parsed.version) {
            versions.push(parsed);
          }
        } catch (e) {
          this.logger.warn(`Failed to parse version record: ${e.message}`);
        }
      }
    } catch (error) {
      this.logger.error("Version notes parsing failed:", error);
    }

    return versions;
  }

  /**
   * Computes diff between two versions
   * @param {Object} versionA - First version
   * @param {Object} versionB - Second version
   * @returns {Object} Diff result
   */
  computeVersionDiff(versionA, versionB) {
    try {
      const linesA = (versionA.canonical || "").split("\n").filter(Boolean);
      const linesB = (versionB.canonical || "").split("\n").filter(Boolean);

      const setA = new Set(linesA);
      const setB = new Set(linesB);

      const added = Array.from(setB).filter((l) => !setA.has(l));
      const removed = Array.from(setA).filter((l) => !setB.has(l));
      const unchanged = Array.from(setA).filter((l) => setB.has(l));

      return {
        added: added.length,
        removed: removed.length,
        unchanged: unchanged.length,
        total: linesB.length,
        changePercentage: (
          ((added.length + removed.length) / Math.max(linesA.length, 1)) *
          100
        ).toFixed(2),
      };
    } catch (error) {
      this.logger.warn("Diff computation failed:", error.message);
      return {
        error: error.message,
      };
    }
  }

  /**
   * Compares semantic versions
   * @param {string} ver1 - First version
   * @param {string} ver2 - Second version
   * @returns {number} Comparison result (-1, 0, 1)
   */
  compareSemver(ver1, ver2) {
    const parts1 = (ver1 || "0.0.0").split(".").map(Number);
    const parts2 = (ver2 || "0.0.0").split(".").map(Number);

    for (let i = 0; i < 3; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }

  /**
   * Gets version statistics
   * @param {string} workflowId - Workflow identifier
   * @returns {Promise<Object>} Version statistics
   */
  async getStats(workflowId) {
    try {
      const versions = await this.listVersions(workflowId);

      return {
        workflowId,
        totalVersions: versions.length,
        versions: versions.map((v) => ({
          version: v.version,
          created: v.created,
          hash: v.hash,
        })),
        latest:
          versions.length > 0
            ? {
                version: versions[0].version,
                hash: versions[0].hash,
              }
            : null,
      };
    } catch (error) {
      this.logger.error(`Stats retrieval failed for ${workflowId}:`, error);
      return {
        error: error.message,
      };
    }
  }

  /**
   * Clears version cache
   * @returns {void}
   */
  clearCache() {
    this.cache.clear();
  }
}

export default WorkflowVersioning;
