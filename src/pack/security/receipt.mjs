import { createHash } from 'node:crypto';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'pathe';
import { tmpdir } from 'node:os';
import { useGit } from '../../composables/git.mjs';
import { createLogger } from '../../utils/logger.mjs';

export class ReceiptManager {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:receipt');
    this.git = useGit();
    this.receiptsRef = options.receiptsRef || 'refs/notes/gitvan/pack-receipts';
  }

  async create(pack, operation, status, details = {}) {
    const receipt = {
      kind: 'pack-receipt',
      id: pack.manifest.id,
      version: pack.manifest.version,
      operation,
      status,
      timestamp: new Date().toISOString(),
      commit: await this.getCurrentCommit(),
      worktree: await this.getWorktreePath(),
      fingerprint: pack.fingerprint || this.createFingerprint(pack.manifest),
      details,
      environment: this.captureEnvironment(),
      integrity: {}
    };

    // Add integrity hashes
    receipt.integrity = {
      manifest: this.hashObject(pack.manifest),
      receipt: null // Will be filled after signing
    };

    // Sign receipt if configured
    if (this.options.sign) {
      receipt.signature = await this.signReceipt(receipt);
    }

    // Self-hash
    receipt.integrity.receipt = this.hashObject(receipt);

    return receipt;
  }

  async write(receipt) {
    try {
      // Write to Git notes using temporary file
      const noteContent = JSON.stringify(receipt, null, 2);
      const commit = receipt.commit !== 'unknown' ? receipt.commit : 'HEAD';

      // Use temporary file to avoid command line escaping issues
      const tempFile = join(tmpdir(), `gitvan-receipt-${Date.now()}.json`);

      try {
        writeFileSync(tempFile, noteContent);

        // Ensure notes ref exists
        await this.ensureNotesRef();

        await this.git.run(['notes', '--ref', this.receiptsRef, 'add', '-f', '-F', tempFile, commit]);

        this.logger.debug(`Receipt written to ${this.receiptsRef} for ${receipt.id}@${receipt.version}`);

        return { ref: this.receiptsRef, commit };
      } finally {
        try {
          unlinkSync(tempFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      this.logger.error('Failed to write receipt:', error.message);
      throw error;
    }
  }

  async read(packId, options = {}) {
    try {
      const notes = await this.git.run(['notes', '--ref', this.receiptsRef, 'list']);
      const receipts = [];

      for (const line of notes.split('\n').filter(Boolean)) {
        const [noteId, commit] = line.split(' ');
        try {
          const content = await this.git.run(['notes', '--ref', this.receiptsRef, 'show', noteId]);
          const receipt = JSON.parse(content);

          if (receipt.id === packId || !packId) {
            receipts.push(receipt);
          }
        } catch (e) {
          this.logger.warn(`Invalid receipt at ${noteId}:`, e.message);
        }
      }

      // Sort by timestamp (newest first)
      receipts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (options.latest) {
        return receipts[0] || null;
      }

      return receipts;
    } catch (error) {
      if (error.message.includes('No note found') || error.message.includes('not found') || error.message.includes('No notes exist')) {
        return options.latest ? null : [];
      }
      throw error;
    }
  }

  async verify(receipt) {
    const errors = [];

    // Verify integrity hash
    const receiptCopy = { ...receipt };
    receiptCopy.integrity = { ...receipt.integrity, receipt: null };
    const computedHash = this.hashObject(receiptCopy);

    if (computedHash !== receipt.integrity?.receipt) {
      errors.push('Receipt integrity check failed');
    }

    // Verify signature if present
    if (receipt.signature && this.options.publicKey) {
      const signatureValid = await this.verifySignature(receipt);
      if (!signatureValid) {
        errors.push('Invalid signature');
      }
    }

    // Verify commit exists (skip if 'unknown')
    if (receipt.commit && receipt.commit !== 'unknown') {
      try {
        await this.git.run(['cat-file', '-e', receipt.commit]);
      } catch {
        errors.push(`Commit not found: ${receipt.commit}`);
      }
    }

    // Verify required fields
    const requiredFields = ['kind', 'id', 'version', 'operation', 'status', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(field in receipt));
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      receipt
    };
  }

  async listByStatus(status) {
    const allReceipts = await this.read();
    return allReceipts.filter(receipt => receipt.status === status);
  }

  async listByOperation(operation) {
    const allReceipts = await this.read();
    return allReceipts.filter(receipt => receipt.operation === operation);
  }

  async getReceiptHistory(packId) {
    const receipts = await this.read(packId);
    return receipts.map(receipt => ({
      timestamp: receipt.timestamp,
      operation: receipt.operation,
      status: receipt.status,
      version: receipt.version,
      commit: receipt.commit,
      details: receipt.details
    }));
  }

  captureEnvironment() {
    return {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      gitvan: this.options.gitvanVersion || 'unknown',
      user: process.env.USER || process.env.USERNAME || 'unknown',
      ci: process.env.CI === 'true',
      timestamp_utc: new Date().toISOString(),
      pwd: process.cwd()
    };
  }

  hashObject(obj) {
    const canonical = JSON.stringify(this.sortObject(obj));
    return createHash('sha256').update(canonical).digest('hex');
  }

  sortObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }

    if (obj && typeof obj === 'object' && obj !== null) {
      const sorted = {};
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        sorted[key] = this.sortObject(obj[key]);
      }
      return sorted;
    }

    return obj;
  }

  createFingerprint(manifest) {
    const canonical = JSON.stringify(this.sortObject(manifest));
    return createHash('sha256').update(canonical).digest('hex');
  }

  async signReceipt(receipt) {
    // Mock implementation - would integrate with actual signing service
    return {
      algorithm: 'mock-sha256',
      signature: this.hashObject(receipt).slice(0, 16),
      timestamp: new Date().toISOString()
    };
  }

  async verifySignature(receipt) {
    // Mock implementation - would integrate with actual verification service
    if (receipt.signature?.algorithm === 'mock-sha256') {
      const expectedSignature = this.hashObject({
        ...receipt,
        signature: null
      }).slice(0, 16);
      return receipt.signature.signature === expectedSignature;
    }
    return true;
  }

  async getCurrentCommit() {
    try {
      const result = await this.git.run(['rev-parse', 'HEAD']);
      return result.trim();
    } catch {
      return 'unknown';
    }
  }

  async getWorktreePath() {
    try {
      const result = await this.git.run(['rev-parse', '--show-toplevel']);
      return result.trim();
    } catch {
      return process.cwd();
    }
  }

  async ensureNotesRef() {
    try {
      // Check if notes ref exists
      await this.git.run(['show-ref', this.receiptsRef]);
    } catch {
      // Create empty notes ref by adding and removing a note
      try {
        await this.git.run(['notes', '--ref', this.receiptsRef, 'add', '-m', 'Initialize pack receipts', 'HEAD']);
        await this.git.run(['notes', '--ref', this.receiptsRef, 'remove', 'HEAD']);
      } catch (error) {
        this.logger.warn('Could not initialize notes ref:', error.message);
      }
    }
  }

  async exportReceipts(format = 'json') {
    const receipts = await this.read();

    if (format === 'json') {
      return JSON.stringify(receipts, null, 2);
    }

    if (format === 'csv') {
      if (receipts.length === 0) return '';

      const headers = ['id', 'version', 'operation', 'status', 'timestamp', 'commit'];
      const rows = receipts.map(receipt =>
        headers.map(header => receipt[header] || '').join(',')
      );

      return [headers.join(','), ...rows].join('\n');
    }

    throw new Error(`Unsupported export format: ${format}`);
  }
}