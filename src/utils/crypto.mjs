/**
 * GitVan v2 Crypto Utilities - Cryptographic operations and key management
 * Provides Ed25519 signing, verification, and secure key storage
 */

import {
  generateKeyPairSync,
  sign,
  verify,
  createHash,
  randomBytes
} from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Generate SHA256 hash as hex string
 * @param {string|Buffer} input - Input to hash
 * @returns {string} SHA256 hash as hex
 */
export function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Generate content fingerprint for deterministic identification
 * @param {object} obj - Object to fingerprint
 * @returns {string} Short fingerprint with fp_ prefix
 */
export function fingerprint(obj) {
  const stable = JSON.stringify(obj, Object.keys(obj).sort());
  return "fp_" + sha256Hex(stable).slice(0, 16);
}

/**
 * Generate receipt hash for verification
 * @param {object} receipt - Receipt object
 * @returns {string} Receipt hash
 */
export function receiptHash(receipt) {
  const { kind, id, status, ts, commit, action, env, outputHash, artifacts } =
    receipt;
  const content = JSON.stringify({
    kind,
    id,
    status,
    ts,
    commit,
    action,
    env,
    outputHash,
    artifacts,
  });
  return sha256Hex(content);
}

/**
 * Generate job fingerprint for caching and identification
 * @param {object} job - Job definition
 * @returns {string} Job fingerprint
 */
export function jobFingerprint(job) {
  const { id, kind, cron, meta, on, mode, filename, version } = job;
  return fingerprint({ id, kind, cron, meta, on, mode, filename, version });
}

/**
 * Generate deterministic seed for reproducible operations
 * @param {string} base - Base string for seed
 * @param {object} context - Additional context
 * @returns {number} Deterministic seed
 */
export function generateSeed(base, context = {}) {
  const content = JSON.stringify({ base, context });
  const hash = sha256Hex(content);
  return parseInt(hash.slice(0, 8), 16);
}

/**
 * Cryptographic utilities for GitVan
 * Provides Ed25519 key generation, signing, and verification
 */
export class CryptoManager {
  constructor(gitvanDir = '.gitvan') {
    this.gitvanDir = gitvanDir;
    this.keysDir = join(gitvanDir, 'keys');
    this.privateKeyPath = join(this.keysDir, 'private.pem');
    this.publicKeyPath = join(this.keysDir, 'public.pem');

    // Ensure keys directory exists
    this.ensureKeysDirectory();
  }

  /**
   * Generate Ed25519 key pair and store securely
   */
  generateKeyPair() {
    try {
      const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Store keys securely
      writeFileSync(this.privateKeyPath, privateKey, { mode: 0o600 });
      writeFileSync(this.publicKeyPath, publicKey, { mode: 0o644 });

      return {
        publicKey,
        privateKey,
        publicKeyPath: this.publicKeyPath,
        privateKeyPath: this.privateKeyPath
      };
    } catch (error) {
      throw new Error(`Failed to generate key pair: ${error.message}`);
    }
  }

  /**
   * Load existing key pair from disk
   */
  loadKeyPair() {
    try {
      if (!this.hasKeyPair()) {
        throw new Error('No key pair found. Generate one first with generateKeyPair()');
      }

      const privateKey = readFileSync(this.privateKeyPath, 'utf8');
      const publicKey = readFileSync(this.publicKeyPath, 'utf8');

      return {
        publicKey,
        privateKey,
        publicKeyPath: this.publicKeyPath,
        privateKeyPath: this.privateKeyPath
      };
    } catch (error) {
      throw new Error(`Failed to load key pair: ${error.message}`);
    }
  }

  /**
   * Check if key pair exists
   */
  hasKeyPair() {
    return existsSync(this.privateKeyPath) && existsSync(this.publicKeyPath);
  }

  /**
   * Sign data using Ed25519 private key
   * @param {Object|string} data - Data to sign
   * @param {string} [privateKey] - Optional private key, uses stored if not provided
   */
  sign(data, privateKey = null) {
    try {
      const keyToUse = privateKey || this.loadKeyPair().privateKey;

      // Convert object to canonical JSON string
      const dataString = typeof data === 'object' ?
        JSON.stringify(this.sortObject(data)) :
        String(data);

      // Create signature
      const signature = sign(null, Buffer.from(dataString, 'utf8'), keyToUse);

      return {
        algorithm: 'Ed25519',
        signature: signature.toString('base64'),
        timestamp: new Date().toISOString(),
        dataHash: createHash('sha256').update(dataString).digest('hex')
      };
    } catch (error) {
      throw new Error(`Failed to sign data: ${error.message}`);
    }
  }

  /**
   * Verify signature using Ed25519 public key
   * @param {Object|string} data - Original data that was signed
   * @param {Object} signatureInfo - Signature information from sign()
   * @param {string} [publicKey] - Optional public key, uses stored if not provided
   */
  verify(data, signatureInfo, publicKey = null) {
    try {
      if (!signatureInfo || signatureInfo.algorithm !== 'Ed25519') {
        return false;
      }

      const keyToUse = publicKey || this.loadKeyPair().publicKey;

      // Convert object to canonical JSON string (same as signing)
      const dataString = typeof data === 'object' ?
        JSON.stringify(this.sortObject(data)) :
        String(data);

      // Verify data hash matches
      const computedHash = createHash('sha256').update(dataString).digest('hex');
      if (computedHash !== signatureInfo.dataHash) {
        return false;
      }

      // Verify signature
      const signatureBuffer = Buffer.from(signatureInfo.signature, 'base64');
      return verify(null, Buffer.from(dataString, 'utf8'), keyToUse, signatureBuffer);
    } catch (error) {
      // Verification failures should return false, not throw
      return false;
    }
  }

  /**
   * Generate secure random nonce
   */
  generateNonce(length = 32) {
    return randomBytes(length).toString('hex');
  }

  /**
   * Hash data using SHA-256
   */
  hash(data) {
    const dataString = typeof data === 'object' ?
      JSON.stringify(this.sortObject(data)) :
      String(data);
    return createHash('sha256').update(dataString, 'utf8').digest('hex');
  }

  /**
   * Sort object keys recursively for canonical representation
   */
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

  /**
   * Ensure keys directory exists with proper permissions
   */
  ensureKeysDirectory() {
    try {
      if (!existsSync(this.gitvanDir)) {
        mkdirSync(this.gitvanDir, { recursive: true, mode: 0o755 });
      }

      if (!existsSync(this.keysDir)) {
        mkdirSync(this.keysDir, { recursive: true, mode: 0o700 });
      }
    } catch (error) {
      throw new Error(`Failed to create keys directory: ${error.message}`);
    }
  }

  /**
   * Get public key fingerprint for identification
   */
  getPublicKeyFingerprint(publicKey = null) {
    try {
      const keyToUse = publicKey || this.loadKeyPair().publicKey;
      return createHash('sha256').update(keyToUse).digest('hex').slice(0, 16);
    } catch (error) {
      throw new Error(`Failed to generate fingerprint: ${error.message}`);
    }
  }
}
