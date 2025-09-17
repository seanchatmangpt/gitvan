import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'pathe';
import { tmpdir } from 'node:os';
import { PackSigner } from '../../../src/pack/security/signature.mjs';

describe('PackSigner', () => {
  let testDir;
  let signer;
  let packPath;
  let manifest;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'gitvan-security-test-'));
    packPath = join(testDir, 'test-pack');

    // Create pack directory and manifest
    manifest = {
      id: 'test-pack',
      version: '1.0.0',
      description: 'Test pack for signature verification',
      capabilities: ['read', 'write'],
      modes: ['existing-repo']
    };

    // Create pack structure
    const fs = require('fs');
    fs.mkdirSync(packPath, { recursive: true });
    writeFileSync(join(packPath, 'pack.json'), JSON.stringify(manifest, null, 2));

    signer = new PackSigner({ signer: 'test-signer' });
  });

  afterEach(() => {
    if (testDir && existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('generateKeyPair', () => {
    it('should generate RSA key pair', async () => {
      const keyPair = await signer.generateKeyPair();

      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.publicKey).toContain('-----END PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(keyPair.privateKey).toContain('-----END PRIVATE KEY-----');
    });

    it('should generate key pair with custom options', async () => {
      const keyPair = await signer.generateKeyPair({ keySize: 1024 });

      expect(keyPair.publicKey).toBeTruthy();
      expect(keyPair.privateKey).toBeTruthy();
    });

    it('should generate encrypted private key with passphrase', async () => {
      const keyPair = await signer.generateKeyPair({ passphrase: 'test123' });

      expect(keyPair.privateKey).toContain('ENCRYPTED');
    });
  });

  describe('sign and verify', () => {
    let publicKey, privateKey;

    beforeEach(async () => {
      const keyPair = await signer.generateKeyPair();
      publicKey = keyPair.publicKey;
      privateKey = keyPair.privateKey;

      // Write keys to files
      writeFileSync(join(testDir, 'private.pem'), privateKey);
      writeFileSync(join(testDir, 'public.pem'), publicKey);
    });

    it('should sign a pack successfully', async () => {
      const privateKeyPath = join(testDir, 'private.pem');

      const signatureData = await signer.sign(packPath, privateKeyPath);

      expect(signatureData.algorithm).toBe('RSA-SHA256');
      expect(signatureData.signature).toBeTruthy();
      expect(signatureData.timestamp).toBeTruthy();
      expect(signatureData.manifest_hash).toBeTruthy();
      expect(signatureData.signer).toBe('test-signer');
      expect(signatureData.pack_id).toBe('test-pack');
      expect(signatureData.pack_version).toBe('1.0.0');

      // Check signature file was created
      const signaturePath = join(packPath, 'SIGNATURE');
      expect(existsSync(signaturePath)).toBe(true);
    });

    it('should verify a valid signature', async () => {
      const privateKeyPath = join(testDir, 'private.pem');
      const publicKeyPath = join(testDir, 'public.pem');

      // Sign the pack
      await signer.sign(packPath, privateKeyPath);

      // Verify the signature
      const result = await signer.verify(packPath, publicKeyPath);

      expect(result.valid).toBe(true);
      expect(result.signer).toBe('test-signer');
      expect(result.algorithm).toBe('RSA-SHA256');
    });

    it('should reject invalid signature', async () => {
      const privateKeyPath = join(testDir, 'private.pem');
      const publicKeyPath = join(testDir, 'public.pem');

      // Sign the pack
      await signer.sign(packPath, privateKeyPath);

      // Tamper with the manifest
      manifest.version = '2.0.0';
      writeFileSync(join(packPath, 'pack.json'), JSON.stringify(manifest, null, 2));

      // Verify should fail
      const result = await signer.verify(packPath, publicKeyPath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('mismatch');
    });

    it('should fail verification with wrong public key', async () => {
      const privateKeyPath = join(testDir, 'private.pem');

      // Generate different key pair
      const wrongKeyPair = await signer.generateKeyPair();
      writeFileSync(join(testDir, 'wrong-public.pem'), wrongKeyPair.publicKey);

      // Sign the pack
      await signer.sign(packPath, privateKeyPath);

      // Verify with wrong public key
      const result = await signer.verify(packPath, join(testDir, 'wrong-public.pem'));

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should fail when private key not found', async () => {
      const nonExistentKey = join(testDir, 'nonexistent.pem');

      await expect(signer.sign(packPath, nonExistentKey)).rejects.toThrow('Private key not found');
    });

    it('should fail when public key not found', async () => {
      const privateKeyPath = join(testDir, 'private.pem');
      const nonExistentKey = join(testDir, 'nonexistent.pem');

      await signer.sign(packPath, privateKeyPath);

      const result = await signer.verify(packPath, nonExistentKey);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Public key not found');
    });

    it('should fail when no signature file exists', async () => {
      const publicKeyPath = join(testDir, 'public.pem');

      const result = await signer.verify(packPath, publicKeyPath);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No signature found');
    });
  });

  describe('canonicalize', () => {
    it('should create deterministic JSON representation', () => {
      const obj1 = { b: 2, a: 1, c: [3, 1, 2] };
      const obj2 = { a: 1, c: [3, 1, 2], b: 2 };

      const canonical1 = signer.canonicalize(obj1);
      const canonical2 = signer.canonicalize(obj2);

      expect(canonical1).toBe(canonical2);
    });

    it('should handle nested objects', () => {
      const obj = {
        z: { y: 2, x: 1 },
        a: { c: 4, b: 3 }
      };

      const canonical = signer.canonicalize(obj);
      const expected = '{"a":{"b":3,"c":4},"z":{"x":1,"y":2}}';

      expect(canonical).toBe(expected);
    });

    it('should handle arrays', () => {
      const obj = {
        items: [{ b: 2, a: 1 }, { d: 4, c: 3 }]
      };

      const canonical = signer.canonicalize(obj);
      expect(canonical).toContain('"items":[{"a":1,"b":2},{"c":3,"d":4}]');
    });
  });

  describe('createFingerprint', () => {
    it('should create consistent fingerprint for same manifest', () => {
      const fingerprint1 = signer.createFingerprint(manifest);
      const fingerprint2 = signer.createFingerprint(manifest);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should create different fingerprints for different manifests', () => {
      const manifest2 = { ...manifest, version: '2.0.0' };

      const fingerprint1 = signer.createFingerprint(manifest);
      const fingerprint2 = signer.createFingerprint(manifest2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('validateSignatureFormat', () => {
    beforeEach(async () => {
      const keyPair = await signer.generateKeyPair();
      writeFileSync(join(testDir, 'private.pem'), keyPair.privateKey);

      // Create valid signature
      await signer.sign(packPath, join(testDir, 'private.pem'));
    });

    it('should validate correct signature format', () => {
      const signaturePath = join(packPath, 'SIGNATURE');
      const result = signer.validateSignatureFormat(signaturePath);

      expect(result.valid).toBe(true);
      expect(result.signatureData).toBeTruthy();
    });

    it('should reject missing signature file', () => {
      const nonExistentPath = join(testDir, 'nonexistent-signature');
      const result = signer.validateSignatureFormat(nonExistentPath);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signature file not found');
    });

    it('should reject invalid JSON', () => {
      const invalidSignaturePath = join(testDir, 'invalid-signature');
      writeFileSync(invalidSignaturePath, 'invalid json');

      const result = signer.validateSignatureFormat(invalidSignaturePath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature format');
    });

    it('should reject missing required fields', () => {
      const incompleteSignaturePath = join(testDir, 'incomplete-signature');
      writeFileSync(incompleteSignaturePath, JSON.stringify({ algorithm: 'RSA-SHA256' }));

      const result = signer.validateSignatureFormat(incompleteSignaturePath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });
  });
});