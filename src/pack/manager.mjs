/**
 * GitVan v2 Pack Manager - Complete pack lifecycle management
 * Handles pack updates, removal, and status tracking
 */

import { Pack } from './pack.mjs';
import { PackApplier } from './applier.mjs';
import { PackPlanner } from './planner.mjs';
import { createLogger } from '../utils/logger.mjs';
import { isUpdateAvailable, isGreaterThan, cleanVersion } from '../utils/version.mjs';
import { RegistryClient } from '../utils/registry.mjs';
import { join, resolve } from 'pathe';
import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';

export class PackManager {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:manager');
    this.applier = new PackApplier(options);
    this.planner = new PackPlanner(options);
    this.installedPacks = new Map();
    this.registry = new RegistryClient(options.registry || {});
  }

  async loadInstalled(targetDir) {
    targetDir = resolve(targetDir || process.cwd());
    const packsDir = join(targetDir, '.gitvan', 'packs');

    if (!existsSync(packsDir)) {
      return;
    }

    try {
      const packIds = readdirSync(packsDir);

      for (const packId of packIds) {
        const receiptPath = join(packsDir, packId, 'receipt.json');
        if (existsSync(receiptPath)) {
          const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
          this.installedPacks.set(packId, receipt);
        }
      }

      this.logger.debug(`Loaded ${this.installedPacks.size} installed packs`);
    } catch (error) {
      this.logger.warn(`Failed to load installed packs: ${error.message}`);
    }
  }

  async status(targetDir) {
    await this.loadInstalled(targetDir);

    const status = {
      installed: [],
      total: this.installedPacks.size
    };

    for (const [id, receipt] of this.installedPacks) {
      status.installed.push({
        id,
        version: receipt.version,
        applied: receipt.applied,
        fingerprint: receipt.fingerprint,
        mode: receipt.mode,
        status: receipt.status,
        artifacts: receipt.artifacts?.length || 0
      });
    }

    return status;
  }

  async update(packPath, targetDir, inputs = {}) {
    const pack = new Pack(packPath, { inputs, ...this.options });
    await pack.load();

    targetDir = resolve(targetDir || process.cwd());
    await this.loadInstalled(targetDir);

    const existing = this.installedPacks.get(pack.manifest.id);
    if (!existing) {
      this.logger.warn(`Pack ${pack.manifest.id} not installed, applying instead`);
      return this.applier.apply(packPath, targetDir, inputs);
    }

    // Check if update needed
    const currentFingerprint = await pack.computeFingerprint();
    if (existing.version === pack.manifest.version &&
        existing.fingerprint === currentFingerprint) {
      return {
        status: 'CURRENT',
        message: 'Pack is up to date',
        pack: pack.toJSON(),
        currentVersion: existing.version
      };
    }

    this.logger.info(`Updating ${pack.manifest.id} from ${existing.version} to ${pack.manifest.version}`);

    // Create update plan
    const plan = await this.planner.plan(packPath, targetDir, inputs);

    if (plan.status === 'ERROR') {
      return plan;
    }

    // Check for breaking changes
    const updateRisks = await this.assessUpdateRisks(existing, pack, plan);

    if (updateRisks.length > 0 && !this.options.force) {
      return {
        status: 'RISKS',
        message: 'Update has potential risks',
        risks: updateRisks,
        plan
      };
    }

    // Perform update
    const result = await this.applier.apply(packPath, targetDir, inputs);

    return {
      ...result,
      previousVersion: existing.version,
      updated: true,
      risks: updateRisks
    };
  }

  async remove(packId, targetDir, options = {}) {
    targetDir = resolve(targetDir || process.cwd());
    await this.loadInstalled(targetDir);

    const receipt = this.installedPacks.get(packId);
    if (!receipt) {
      return {
        status: 'NOT_FOUND',
        message: `Pack ${packId} not installed`
      };
    }

    this.logger.info(`Removing pack: ${packId}@${receipt.version}`);

    const results = {
      status: 'OK',
      removed: [],
      errors: [],
      pack: packId,
      version: receipt.version
    };

    // Remove artifacts in reverse order (if available)
    const artifacts = receipt.artifacts || [];
    if (artifacts.length > 0) {
      for (const artifact of artifacts.reverse()) {
        try {
          if (await this.canRemoveArtifact(artifact, options)) {
            await this.removeArtifact(artifact);
            results.removed.push(artifact.target || artifact.path);
          } else {
            this.logger.warn(`Skipping modified artifact: ${artifact.target || artifact.path}`);
          }
        } catch (error) {
          results.errors.push({
            artifact: artifact.target || artifact.path,
            error: error.message
          });
        }
      }
    } else {
      // Fallback: try to remove common pack artifacts
      await this.removeCommonArtifacts(receipt, targetDir, results);
    }

    // Remove receipt
    const receiptDir = join(targetDir, '.gitvan', 'packs', packId);
    if (existsSync(receiptDir)) {
      try {
        rmSync(receiptDir, { recursive: true });
        this.logger.debug(`Removed receipt directory: ${receiptDir}`);
      } catch (error) {
        results.errors.push({
          artifact: 'receipt',
          error: error.message
        });
      }
    }

    // Update status
    if (results.errors.length > 0) {
      results.status = results.removed.length > 0 ? 'PARTIAL' : 'ERROR';
    }

    this.installedPacks.delete(packId);

    return results;
  }

  async assessUpdateRisks(existingReceipt, newPack, plan) {
    const risks = [];

    // Version comparison
    const oldVersion = existingReceipt.version;
    const newVersion = newPack.manifest.version;

    const oldParts = oldVersion.split('.').map(Number);
    const newParts = newVersion.split('.').map(Number);

    // Major version change
    if (newParts[0] > oldParts[0]) {
      risks.push({
        type: 'major-version',
        severity: 'high',
        message: `Major version change: ${oldVersion} -> ${newVersion}`
      });
    }

    // Check for file overwrites
    const overwrites = plan.impacts.modifies.filter(m => m.risk === 'overwrite');
    if (overwrites.length > 0) {
      risks.push({
        type: 'file-overwrites',
        severity: 'medium',
        message: `Will overwrite ${overwrites.length} files`,
        files: overwrites.map(o => o.path)
      });
    }

    // Check for dependency changes
    const dependencyChanges = this.detectDependencyChanges(existingReceipt, newPack);
    if (dependencyChanges.length > 0) {
      risks.push({
        type: 'dependency-changes',
        severity: 'medium',
        message: `Dependency changes detected`,
        changes: dependencyChanges
      });
    }

    return risks;
  }

  detectDependencyChanges(existingReceipt, newPack) {
    const changes = [];

    // This is simplified - would need to compare existing package.json
    // with new pack dependencies to detect actual changes
    const newDeps = newPack.manifest.dependencies?.npm?.dependencies || {};

    for (const [name, version] of Object.entries(newDeps)) {
      changes.push({
        type: 'add',
        dependency: name,
        version
      });
    }

    return changes;
  }

  async canRemoveArtifact(artifact, options) {
    const { target, hash, type } = artifact;

    if (!existsSync(target)) {
      return false; // Already removed
    }

    if (options.force) {
      return true;
    }

    // Check if file was modified since installation
    if (hash && type === 'file') {
      try {
        const current = readFileSync(target, 'utf8');
        const { createHash } = await import('node:crypto');
        const currentHash = createHash('sha256').update(current).digest('hex');

        if (currentHash !== hash) {
          this.logger.warn(`File modified since installation: ${target}`);
          return false;
        }
      } catch (error) {
        this.logger.warn(`Cannot verify file hash: ${target}`);
        return false;
      }
    }

    return true;
  }

  async removeArtifact(artifact) {
    const { target, type } = artifact;

    if (!existsSync(target)) {
      return;
    }

    if (type === 'directory') {
      rmSync(target, { recursive: true });
    } else {
      rmSync(target);
    }

    this.logger.debug(`Removed ${type}: ${target}`);
  }

  async removeCommonArtifacts(receipt, targetDir, results) {
    // Fallback removal for packs without detailed receipts
    const commonPaths = [
      join(targetDir, 'jobs'),
      join(targetDir, 'events'),
      join(targetDir, 'templates')
    ];

    for (const path of commonPaths) {
      if (existsSync(path)) {
        try {
          // Only remove if it looks like it was created by this pack
          // This is a very basic heuristic
          const stats = require('node:fs').statSync(path);
          const receiptTime = new Date(receipt.applied);
          const pathTime = new Date(stats.birthtime);

          if (Math.abs(pathTime.getTime() - receiptTime.getTime()) < 60000) { // Within 1 minute
            results.removed.push(path);
            this.logger.debug(`Removed common path: ${path}`);
          }
        } catch (error) {
          results.errors.push({
            artifact: path,
            error: error.message
          });
        }
      }
    }
  }

  async listAvailableUpdates(targetDir) {
    await this.loadInstalled(targetDir);

    const updates = [];

    // Check each installed pack for updates
    for (const [id, receipt] of this.installedPacks) {
      try {
        const currentVersion = cleanVersion(receipt.version);
        const latestVersion = await this.registry.getLatestVersion(id);

        if (latestVersion) {
          const cleanLatestVersion = cleanVersion(latestVersion);
          const updateAvailable = isUpdateAvailable(currentVersion, cleanLatestVersion);

          updates.push({
            id,
            currentVersion,
            latestVersion: cleanLatestVersion,
            updateAvailable,
            updateType: this.getUpdateType(currentVersion, cleanLatestVersion)
          });

          this.logger.debug(`${id}: ${currentVersion} -> ${cleanLatestVersion} (${updateAvailable ? 'update available' : 'up to date'})`);
        } else {
          // Package not found in registry
          updates.push({
            id,
            currentVersion,
            latestVersion: 'not found',
            updateAvailable: false,
            updateType: 'none',
            error: 'Package not found in registry'
          });

          this.logger.warn(`Package ${id} not found in registry`);
        }
      } catch (error) {
        this.logger.error(`Failed to check updates for ${id}: ${error.message}`);

        updates.push({
          id,
          currentVersion: receipt.version,
          latestVersion: 'error',
          updateAvailable: false,
          updateType: 'none',
          error: error.message
        });
      }
    }

    return updates;
  }

  /**
   * Determine the type of update (major, minor, patch)
   * @param {string} currentVersion - Current version
   * @param {string} latestVersion - Latest version
   * @returns {string} Update type
   */
  getUpdateType(currentVersion, latestVersion) {
    try {
      if (!isGreaterThan(latestVersion, currentVersion)) {
        return 'none';
      }

      const current = currentVersion.split('.').map(n => parseInt(n, 10));
      const latest = latestVersion.split('.').map(n => parseInt(n, 10));

      if (latest[0] > current[0]) {
        return 'major';
      } else if (latest[1] > current[1]) {
        return 'minor';
      } else if (latest[2] > current[2]) {
        return 'patch';
      }

      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }
}