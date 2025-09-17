#!/usr/bin/env node

import { CryptoManager } from '../src/utils/crypto.mjs';
import { existsSync, statSync } from 'node:fs';

console.log('🔑 Testing key directory creation and security...');

const crypto = new CryptoManager('.gitvan');
const keys = crypto.generateKeyPair();

console.log('✅ Keys generated successfully');
console.log('📁 Keys directory:', crypto.keysDir);
console.log('🔒 Public key path:', keys.publicKeyPath);
console.log('🔐 Private key path:', keys.privateKeyPath);
console.log('🔍 Key fingerprint:', crypto.getPublicKeyFingerprint());

// Test file permissions
if (existsSync(keys.privateKeyPath)) {
  const privateStats = statSync(keys.privateKeyPath);
  const privateMode = (privateStats.mode & parseInt('777', 8)).toString(8);
  console.log(`🔐 Private key permissions: ${privateMode} (should be 600)`);
}

if (existsSync(keys.publicKeyPath)) {
  const publicStats = statSync(keys.publicKeyPath);
  const publicMode = (publicStats.mode & parseInt('777', 8)).toString(8);
  console.log(`🔒 Public key permissions: ${publicMode} (should be 644)`);
}

console.log('✅ Key directory test completed');