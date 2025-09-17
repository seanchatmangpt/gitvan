import { createHash } from 'node:crypto';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { useGit } from '../../composables/git.mjs';
import { createLogger } from '../../utils/logger.mjs';
import { CryptoManager } from '../../utils/crypto.mjs';

export class ReceiptManager {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:receipt');
    this.git = useGit();
    this.receiptsRef = options.receiptsRef || 'refs/notes/gitvan/pack-receipts';

    // Initialize crypto manager
    this.crypto = new CryptoManager(options.gitvanDir || '.gitvan');

    // Auto-generate keys if signing is enabled and no keys exist
    if (options.sign && !this.crypto.hasKeyPair()) {
      try {
        this.crypto.generateKeyPair();
        this.logger.info('Generated new Ed25519 key pair for receipt signing');
      } catch (error) {
        this.logger.warn('Failed to generate key pair:', error.message);
      }
    }
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
    try {
      // Ensure we have a key pair
      if (!this.crypto.hasKeyPair()) {
        throw new Error('No signing key available. Run with --generate-keys or ensure keys exist.');
      }

      // Create receipt copy without signature for signing
      const receiptToSign = { ...receipt };
      delete receiptToSign.signature;
      delete receiptToSign.integrity; // Remove integrity as it will be computed after signing

      // Sign using Ed25519
      const signatureInfo = this.crypto.sign(receiptToSign);

      // Add additional metadata
      return {
        ...signatureInfo,
        keyFingerprint: this.crypto.getPublicKeyFingerprint(),
        receiptId: receipt.id,
        receiptVersion: receipt.version
      };
    } catch (error) {
      this.logger.error('Failed to sign receipt:', error.message);
      throw new Error(`Receipt signing failed: ${error.message}`);
    }
  }

  async verifySignature(receipt) {
    try {
      if (!receipt.signature) {
        this.logger.debug('No signature found in receipt');
        return false;
      }

      // Check if we have the required algorithm
      if (receipt.signature.algorithm !== 'Ed25519') {
        this.logger.warn(`Unsupported signature algorithm: ${receipt.signature.algorithm}`);
        return false;
      }

      // Ensure we have a public key for verification
      if (!this.crypto.hasKeyPair()) {
        this.logger.warn('No public key available for signature verification');
        return false;
      }

      // Prepare receipt for verification (same as signing)
      const receiptToVerify = { ...receipt };
      delete receiptToVerify.signature;
      delete receiptToVerify.integrity;

      // Verify using Ed25519
      const isValid = this.crypto.verify(receiptToVerify, receipt.signature);

      if (!isValid) {
        this.logger.warn(`Invalid signature for receipt ${receipt.id}@${receipt.version}`);
      } else {
        this.logger.debug(`Valid signature for receipt ${receipt.id}@${receipt.version}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Signature verification failed:', error.message);
      return false;
    }
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

  /**
   * Generate new Ed25519 key pair for signing
   * @returns {Object} Key pair information
   */
  generateSigningKeys() {
    try {
      const keyInfo = this.crypto.generateKeyPair();
      this.logger.info(`Generated new Ed25519 key pair:`);
      this.logger.info(`  Public key: ${keyInfo.publicKeyPath}`);
      this.logger.info(`  Private key: ${keyInfo.privateKeyPath}`);
      this.logger.info(`  Key fingerprint: ${this.crypto.getPublicKeyFingerprint()}`);
      return keyInfo;
    } catch (error) {
      this.logger.error('Failed to generate signing keys:', error.message);
      throw error;
    }
  }

  /**
   * Get information about current signing keys
   * @returns {Object} Key information or null if no keys
   */
  getKeyInfo() {
    try {
      if (!this.crypto.hasKeyPair()) {
        return null;
      }

      return {
        hasKeys: true,
        publicKeyPath: this.crypto.publicKeyPath,
        privateKeyPath: this.crypto.privateKeyPath,
        fingerprint: this.crypto.getPublicKeyFingerprint(),
        keysDirectory: this.crypto.keysDir
      };
    } catch (error) {
      this.logger.error('Failed to get key info:', error.message);
      return null;
    }
  }
}