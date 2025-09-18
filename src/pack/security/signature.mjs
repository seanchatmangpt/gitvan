import { createHash, createSign, createVerify } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'pathe';
import { createLogger } from '../../utils/logger.mjs';

export class PackSigner {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:signature');
    this.algorithm = options.algorithm || 'RSA-SHA256';
  }

  async sign(packPath, privateKeyPath) {
    if (!existsSync(privateKeyPath)) {
      throw new Error(`Private key not found: ${privateKeyPath}`);
    }

    const privateKey = readFileSync(privateKeyPath, 'utf8');
    const manifest = this.loadManifest(packPath);

    // Create canonical representation
    const canonical = this.canonicalize(manifest);

    // Sign the canonical data
    const sign = createSign(this.algorithm);
    sign.update(canonical);
    const signature = sign.sign(privateKey, 'base64');

    // Write signature file
    const signaturePath = join(packPath, 'SIGNATURE');
    const signatureData = {
      algorithm: this.algorithm,
      signature,
      timestamp: new Date().toISOString(),
      manifest_hash: createHash('sha256').update(canonical).digest('hex'),
      signer: this.options.signer || 'unknown',
      pack_id: manifest.id,
      pack_version: manifest.version
    };

    writeFileSync(signaturePath, JSON.stringify(signatureData, null, 2));

    this.logger.info(`Pack signed: ${manifest.id}@${manifest.version}`);

    return signatureData;
  }

  async verify(packPath, publicKeyPath) {
    const signaturePath = join(packPath, 'SIGNATURE');

    if (!existsSync(signaturePath)) {
      return { valid: false, error: 'No signature found' };
    }

    if (!existsSync(publicKeyPath)) {
      return { valid: false, error: 'Public key not found' };
    }

    try {
      const publicKey = readFileSync(publicKeyPath, 'utf8');
      const signatureData = JSON.parse(readFileSync(signaturePath, 'utf8'));
      const manifest = this.loadManifest(packPath);

      // Verify pack ID matches
      if (signatureData.pack_id !== manifest.id) {
        return { valid: false, error: 'Pack ID mismatch in signature' };
      }

      if (signatureData.pack_version !== manifest.version) {
        return { valid: false, error: 'Pack version mismatch in signature' };
      }

      // Create canonical representation
      const canonical = this.canonicalize(manifest);

      // Verify hash matches
      const hash = createHash('sha256').update(canonical).digest('hex');
      if (hash !== signatureData.manifest_hash) {
        return { valid: false, error: 'Manifest hash mismatch' };
      }

      // Verify signature
      const verify = createVerify(signatureData.algorithm || this.algorithm);
      verify.update(canonical);
      const valid = verify.verify(publicKey, signatureData.signature, 'base64');

      if (valid) {
        this.logger.info(`Signature valid: ${manifest.id}@${manifest.version}`);
        return {
          valid: true,
          signer: signatureData.signer,
          timestamp: signatureData.timestamp,
          algorithm: signatureData.algorithm
        };
      } else {
        return { valid: false, error: 'Invalid signature' };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async generateKeyPair(options = {}) {
    const { generateKeyPairSync } = await import('node:crypto');

    const keyOptions = {
      modulusLength: options.keySize || 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    };

    if (options.passphrase) {
      keyOptions.privateKeyEncoding.cipher = 'aes-256-cbc';
      keyOptions.privateKeyEncoding.passphrase = options.passphrase;
    }

    const { publicKey, privateKey } = generateKeyPairSync('rsa', keyOptions);

    return { publicKey, privateKey };
  }

  loadManifest(packPath) {
    const manifestPath = join(packPath, 'pack.json');
    if (!existsSync(manifestPath)) {
      throw new Error(`Pack manifest not found: ${manifestPath}`);
    }
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
  }

  canonicalize(obj) {
    // Create deterministic JSON representation
    return JSON.stringify(this.sortObject(obj));
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
    const canonical = this.canonicalize(manifest);
    return createHash('sha256').update(canonical).digest('hex');
  }

  validateSignatureFormat(signaturePath) {
    if (!existsSync(signaturePath)) {
      return { valid: false, error: 'Signature file not found' };
    }

    try {
      const signatureData = JSON.parse(readFileSync(signaturePath, 'utf8'));

      const requiredFields = ['algorithm', 'signature', 'timestamp', 'manifest_hash', 'pack_id', 'pack_version'];
      const missingFields = requiredFields.filter(field => !(field in signatureData));

      if (missingFields.length > 0) {
        return { valid: false, error: `Missing required fields: ${missingFields.join(', ')}` };
      }

      return { valid: true, signatureData };
    } catch (error) {
      return { valid: false, error: `Invalid signature format: ${error.message}` };
    }
  }
}