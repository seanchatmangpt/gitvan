import { existsSync, readFileSync, unlinkSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'pathe';
import { createLogger } from '../../utils/logger.mjs';
import { createHash } from 'node:crypto';

export class RollbackManager {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:rollback');
    this.backupDir = options.backupDir || '.gitvan/backups';
  }

  async createSnapshot(targetPath) {
    if (!existsSync(targetPath)) {
      return null;
    }

    const content = readFileSync(targetPath, 'utf8');
    const hash = createHash('sha256').update(content).digest('hex');

    const snapshot = {
      path: targetPath,
      content,
      hash,
      timestamp: new Date().toISOString(),
      mode: (await import('node:fs')).statSync(targetPath).mode
    };

    // Store backup
    const backupPath = join(this.backupDir, hash.slice(0, 8), `${Date.now()}.backup`);
    const backupDir = dirname(backupPath);

    if (!existsSync(backupDir)) {
      (await import('node:fs')).mkdirSync(backupDir, { recursive: true });
    }

    writeFileSync(backupPath, JSON.stringify(snapshot, null, 2));

    this.logger.debug(`Created snapshot: ${targetPath} -> ${hash.slice(0, 8)}`);

    return {
      snapshotId: hash.slice(0, 8),
      path: backupPath,
      original: targetPath
    };
  }

  async rollback(snapshotId) {
    const backupDir = join(this.backupDir, snapshotId);

    if (!existsSync(backupDir)) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const { readdirSync } = await import('node:fs');
    const files = readdirSync(backupDir).filter(f => f.endsWith('.backup'));

    if (files.length === 0) {
      throw new Error(`No backup files for snapshot: ${snapshotId}`);
    }

    // Use most recent backup
    files.sort().reverse();
    const backupPath = join(backupDir, files[0]);
    const snapshot = JSON.parse(readFileSync(backupPath, 'utf8'));

    // Restore file
    writeFileSync(snapshot.path, snapshot.content);

    if (snapshot.mode) {
      (await import('node:fs')).chmodSync(snapshot.path, snapshot.mode);
    }

    this.logger.info(`Rolled back: ${snapshot.path}`);

    return {
      restored: snapshot.path,
      hash: snapshot.hash
    };
  }

  async reverseTransform(transform, targetPath) {
    switch (transform.kind) {
      case 'json-merge':
        return this.reverseJsonMerge(transform, targetPath);

      case 'text-insert':
        return this.reverseTextInsert(transform, targetPath);

      case 'text-replace':
        return this.reverseTextReplace(transform, targetPath);

      default:
        this.logger.warn(`Cannot reverse transform: ${transform.kind}`);
        return false;
    }
  }

  async reverseJsonMerge(transform, targetPath) {
    if (!existsSync(targetPath)) {
      return false;
    }

    const current = JSON.parse(readFileSync(targetPath, 'utf8'));
    const spec = transform.spec;

    // Remove merged keys
    for (const key of Object.keys(spec)) {
      delete current[key];
    }

    writeFileSync(targetPath, JSON.stringify(current, null, 2));

    return true;
  }

  async reverseTextInsert(transform, targetPath) {
    if (!existsSync(targetPath)) {
      return false;
    }

    const content = readFileSync(targetPath, 'utf8');
    const lines = content.split('\n');

    // Find and remove inserted text
    const insertedText = transform.spec;
    const index = lines.indexOf(insertedText);

    if (index !== -1) {
      lines.splice(index, 1);
      writeFileSync(targetPath, lines.join('\n'));
      return true;
    }

    return false;
  }

  async reverseTextReplace(transform, targetPath) {
    if (!existsSync(targetPath)) {
      return false;
    }

    const content = readFileSync(targetPath, 'utf8');

    // Reverse the replacement
    if (transform.original) {
      const reversed = content.replace(transform.spec.replacement, transform.original);
      writeFileSync(targetPath, reversed);
      return true;
    }

    return false;
  }

  async createRollbackPlan(receipt) {
    const plan = {
      packId: receipt.id,
      version: receipt.version,
      steps: []
    };

    // Process artifacts in reverse order
    const artifacts = (receipt.artifacts || []).slice().reverse();

    for (const artifact of artifacts) {
      if (artifact.type === 'file' && existsSync(artifact.path)) {
        // If artifact has a snapshot, it means file existed before and was backed up
        if (artifact.snapshot) {
          plan.steps.push({
            action: 'restore',
            path: artifact.path,
            reason: 'modified',
            snapshot: artifact.snapshot
          });
        } else {
          // No snapshot means file was created by the pack
          plan.steps.push({
            action: 'delete',
            path: artifact.path,
            reason: 'created'
          });
        }
      } else if (artifact.type === 'transform') {
        plan.steps.push({
          action: 'reverse',
          transform: artifact.transform,
          path: artifact.path
        });
      }
    }

    return plan;
  }

  async executePlan(plan) {
    const results = {
      success: [],
      errors: []
    };

    for (const step of plan.steps) {
      try {
        switch (step.action) {
          case 'delete':
            unlinkSync(step.path);
            results.success.push(`Deleted: ${step.path}`);
            break;

          case 'restore':
            if (step.snapshot) {
              await this.rollback(step.snapshot);
              results.success.push(`Restored: ${step.path}`);
            }
            break;

          case 'reverse':
            const reversed = await this.reverseTransform(step.transform, step.path);
            if (reversed) {
              results.success.push(`Reversed: ${step.path}`);
            } else {
              results.errors.push(`Failed to reverse: ${step.path}`);
            }
            break;
        }
      } catch (error) {
        results.errors.push(`Error with ${step.path}: ${error.message}`);
      }
    }

    return results;
  }

  async hashFile(path) {
    const content = readFileSync(path);
    return createHash('sha256').update(content).digest('hex');
  }

  async cleanupBackups(olderThan = 30) {
    if (!existsSync(this.backupDir)) return 0;

    const { readdirSync, statSync } = await import('node:fs');
    const cutoff = Date.now() - (olderThan * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    const dirs = readdirSync(this.backupDir);
    for (const dir of dirs) {
      const dirPath = join(this.backupDir, dir);
      const stats = statSync(dirPath);

      if (stats.isDirectory() && stats.mtimeMs < cutoff) {
        rmSync(dirPath, { recursive: true });
        cleaned++;
      }
    }

    this.logger.info(`Cleaned ${cleaned} old backup directories`);

    return cleaned;
  }
}