import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'pathe';
import { createLogger } from '../../utils/logger.mjs';

export class IdempotencyTracker {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:idempotency');
    this.stateDir = options.stateDir || '.gitvan/state';
    this.operations = new Map();
  }

  async track(operation) {
    const fingerprint = this.generateFingerprint(operation);
    const existing = await this.getOperation(fingerprint);

    if (existing) {
      this.logger.debug(`Operation already performed: ${fingerprint}`);
      return {
        skip: true,
        existing,
        fingerprint
      };
    }

    // Record operation
    await this.recordOperation(fingerprint, operation);

    return {
      skip: false,
      fingerprint
    };
  }

  generateFingerprint(operation) {
    const data = {
      type: operation.type,
      target: operation.target,
      source: operation.source,
      inputs: operation.inputs,
      version: operation.version
    };

    const canonical = JSON.stringify(this.sortObject(data));
    return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
  }

  async getOperation(fingerprint) {
    const statePath = join(this.stateDir, 'operations', `${fingerprint}.json`);

    if (existsSync(statePath)) {
      try {
        return JSON.parse(readFileSync(statePath, 'utf8'));
      } catch (e) {
        this.logger.warn(`Invalid state file: ${statePath}`);
      }
    }

    return null;
  }

  async recordOperation(fingerprint, operation) {
    const stateDir = join(this.stateDir, 'operations');
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }

    const record = {
      fingerprint,
      operation,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    const statePath = join(stateDir, `${fingerprint}.json`);
    writeFileSync(statePath, JSON.stringify(record, null, 2));

    this.operations.set(fingerprint, record);

    return record;
  }

  async updateStatus(fingerprint, status, result = null) {
    const statePath = join(this.stateDir, 'operations', `${fingerprint}.json`);

    if (existsSync(statePath)) {
      const record = JSON.parse(readFileSync(statePath, 'utf8'));
      record.status = status;
      record.updatedAt = new Date().toISOString();

      if (result) {
        record.result = result;
      }

      writeFileSync(statePath, JSON.stringify(record, null, 2));
      this.operations.set(fingerprint, record);
    }
  }

  async cleanup(olderThan = 30) {
    const stateDir = join(this.stateDir, 'operations');
    if (!existsSync(stateDir)) return;

    const { readdirSync, statSync, unlinkSync } = await import('node:fs');
    const files = readdirSync(stateDir);
    const cutoff = Date.now() - (olderThan * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const file of files) {
      const filePath = join(stateDir, file);
      const stats = statSync(filePath);

      if (stats.mtimeMs < cutoff) {
        unlinkSync(filePath);
        cleaned++;
      }
    }

    this.logger.info(`Cleaned ${cleaned} old operation records`);

    return cleaned;
  }

  sortObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sorted = {};
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        sorted[key] = this.sortObject(obj[key]);
      }
      return sorted;
    }

    return obj;
  }
}