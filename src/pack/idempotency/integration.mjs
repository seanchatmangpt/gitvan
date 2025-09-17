import { createIdempotencySystem } from './index.mjs';
import { createLogger } from '../../utils/logger.mjs';

/**
 * Integration layer that provides pack-aware idempotency features
 */
export class PackIdempotencyIntegration {
  constructor(options = {}) {
    this.logger = createLogger('pack:integration');
    this.system = createIdempotencySystem(options);
  }

  /**
   * Track a pack installation operation
   */
  async trackPackInstallation(packSpec, targetPath) {
    const operation = {
      type: 'pack-install',
      target: targetPath,
      source: packSpec.source || 'unknown',
      inputs: {
        id: packSpec.id,
        version: packSpec.version,
        transforms: packSpec.transforms || [],
        options: packSpec.options || {}
      },
      version: packSpec.version
    };

    const tracking = await this.system.trackOperation(operation);

    if (tracking.skip) {
      this.logger.info(`Pack ${packSpec.id} already installed with same configuration`);
      return {
        shouldSkip: true,
        fingerprint: tracking.fingerprint,
        existing: tracking.existing
      };
    }

    return {
      shouldSkip: false,
      fingerprint: tracking.fingerprint,
      operation
    };
  }

  /**
   * Create snapshots before applying pack transforms
   */
  async createPreInstallSnapshots(filePaths) {
    const snapshots = new Map();

    for (const filePath of filePaths) {
      try {
        const snapshot = await this.system.createSnapshot(filePath);
        if (snapshot) {
          snapshots.set(filePath, snapshot);
          this.logger.debug(`Created pre-install snapshot for ${filePath}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to create snapshot for ${filePath}: ${error.message}`);
      }
    }

    return snapshots;
  }

  /**
   * Record successful pack installation
   */
  async recordPackInstallation(packSpec, fingerprint, artifacts, snapshots) {
    // Enhance artifacts with snapshot information
    const enhancedArtifacts = artifacts.map(artifact => {
      if (artifact.type === 'file' && snapshots.has(artifact.path)) {
        return {
          ...artifact,
          snapshot: snapshots.get(artifact.path).snapshotId
        };
      }
      return artifact;
    });

    await this.system.recordInstallation(
      packSpec.id,
      packSpec.version,
      fingerprint,
      enhancedArtifacts
    );

    this.logger.info(`Recorded installation of pack ${packSpec.id}@${packSpec.version}`);

    return {
      packId: packSpec.id,
      version: packSpec.version,
      fingerprint,
      artifacts: enhancedArtifacts,
      installedAt: new Date().toISOString()
    };
  }

  /**
   * Check if a pack is already installed
   */
  async isPackInstalled(packId, fingerprint = null) {
    return this.system.isInstalled(packId, fingerprint);
  }

  /**
   * Create a rollback plan for a pack
   */
  async createPackRollbackPlan(packId) {
    const packState = this.system.state.getPackState(packId);

    if (!packState) {
      throw new Error(`Pack ${packId} is not installed`);
    }

    const receipt = {
      id: packId,
      version: packState.version,
      artifacts: packState.artifacts
    };

    return this.system.createRollbackPlan(receipt);
  }

  /**
   * Rollback a pack installation
   */
  async rollbackPack(packId) {
    const plan = await this.createPackRollbackPlan(packId);

    this.logger.info(`Rolling back pack ${packId} with ${plan.steps.length} steps`);

    const results = await this.system.executeRollback(plan);

    // Remove pack from state if rollback successful
    if (results.errors.length === 0) {
      this.system.state.removePackState(packId);
      this.logger.info(`Successfully rolled back pack ${packId}`);
    } else {
      this.logger.error(`Rollback of pack ${packId} completed with errors:`, results.errors);
    }

    return results;
  }

  /**
   * List all installed packs
   */
  listInstalledPacks() {
    const state = this.system.state.export();
    return Object.entries(state.packs).map(([packId, packState]) => ({
      id: packId,
      version: packState.version,
      installedAt: packState.installedAt,
      artifactCount: packState.artifacts.length
    }));
  }

  /**
   * Get detailed information about an installed pack
   */
  getPackDetails(packId) {
    return this.system.state.getPackState(packId);
  }

  /**
   * Cleanup old operations and backups
   */
  async cleanup(days = 30) {
    this.logger.info(`Cleaning up operations and backups older than ${days} days`);
    await this.system.cleanup(days);
  }

  /**
   * Export installation state for backup
   */
  exportState() {
    return this.system.state.export();
  }

  /**
   * Import installation state from backup
   */
  importState(state) {
    this.system.state.import(state);
    this.logger.info('Imported installation state');
  }

  /**
   * Validate pack integrity
   */
  async validatePackIntegrity(packId) {
    const packState = this.system.state.getPackState(packId);

    if (!packState) {
      return {
        valid: false,
        reason: 'Pack not found in state'
      };
    }

    const issues = [];

    for (const artifact of packState.artifacts) {
      if (artifact.type === 'file') {
        const { existsSync } = await import('node:fs');

        if (!existsSync(artifact.path)) {
          issues.push(`Missing file: ${artifact.path}`);
        } else if (artifact.hash) {
          const currentHash = await this.system.rollback.hashFile(artifact.path);
          if (currentHash !== artifact.hash) {
            issues.push(`Modified file: ${artifact.path}`);
          }
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      artifactCount: packState.artifacts.length
    };
  }
}

/**
 * Create a pack-aware idempotency system
 */
export function createPackIdempotency(options = {}) {
  return new PackIdempotencyIntegration(options);
}